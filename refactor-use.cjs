const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const hookPath = path.join(srcDir, 'hooks', 'useAnalytics.js');

const content = fs.readFileSync(hookPath, 'utf8');

// I will completely rewrite useAnalytics.js since the new version is just a few lines of code
const newHookContent = `import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from './../context/AuthContext';
import { saveWeeklySnapshot, computeAnalytics, DEFAULT_ANALYTICS } from './../lib/analyticsService';
import { getAnalyticsDataFromCache } from './../lib/prefetchAnalyticsData';
import { prefetchCacheService } from './../lib/prefetchCacheService';
import { dataStoreService } from './../lib/dataStoreService';

const inMemoryAnalyticsCache = new Map();

const hasAnyFastAnalyticsData = (value) => {
  if (!value) return false;
  return (
    (value.totalTasks || 0) > 0 ||
    (value.totalMinutes || 0) > 0 ||
    (value.completedBlocks || 0) > 0 ||
    (value.pendingBlocks || 0) > 0 ||
    (value.totalHabits || 0) > 0
  );
};

const mapSnapshotToAnalytics = (snapshot) => {
  if (!snapshot) return null;

  const minutesByDay = Array.isArray(snapshot.minutes_by_day)
    ? snapshot.minutes_by_day
    : [0, 0, 0, 0, 0, 0, 0];

  const totalTasks = Number(snapshot.total_assignments) || 0;
  const completedTasks = Number(snapshot.completed_assignments) || 0;
  const pendingTasks = Number(snapshot.pending_assignments) || Math.max(totalTasks - completedTasks, 0);

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    totalHabits: Number(snapshot.total_habits) || 0,
    completedHabits: Number(snapshot.completed_habits) || 0,
    totalMinutes: Number(snapshot.total_planned_minutes) || 0,
    completedBlocks: Number(snapshot.total_blocks_completed) || 0,
    pendingBlocks: Number(snapshot.total_blocks_pending) || 0,
    minutesByDay,
    minutesByTime: {
      morning: Number(snapshot.morning_minutes) || 0,
      afternoon: Number(snapshot.afternoon_minutes) || 0,
      night: Number(snapshot.night_minutes) || 0
    }
  };
};

export const useAnalytics = (externalData) => {
  const perfLog = useCallback((event, payload = {}) => {
    const ts = performance.now();
    const entry = { event, ts, hook: 'useAnalytics', ...payload };
    if (typeof window !== 'undefined') {
      window.__CF_PERF_LOGS = window.__CF_PERF_LOGS || [];
      window.__CF_PERF_LOGS.push(entry);
    }
    console.log('[PERF]', entry);
  }, []);

  const { user } = useAuth();
  const userId = user?.id;

  const [rawTasks, setRawTasks] = useState([]);
  const [rawHabits, setRawHabits] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [rawPlanners, setRawPlanners] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const initialCachedAnalytics = useMemo(() => {
    if (!userId) return DEFAULT_ANALYTICS;
    return inMemoryAnalyticsCache.get(userId) || getAnalyticsDataFromCache(userId) || DEFAULT_ANALYTICS;
  }, [userId]);

  const [analytics, setAnalytics] = useState(initialCachedAnalytics);
  const [loading, setLoading] = useState(!hasAnyFastAnalyticsData(initialCachedAnalytics));
  const lastSnapshotSignatureRef = useRef(null);
  const analyticsRef = useRef(initialCachedAnalytics);
  const fetchGuardRef = useRef('');

  useEffect(() => {
    analyticsRef.current = analytics;
  }, [analytics]);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnalytics(DEFAULT_ANALYTICS);
      setLoading(false);
      return;
    }

    const cachedAnalytics = inMemoryAnalyticsCache.get(userId) || getAnalyticsDataFromCache(userId);
    if (cachedAnalytics && hasAnyFastAnalyticsData(cachedAnalytics)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnalytics(cachedAnalytics);
      setLoading(false);
    }
  }, [userId]);

  // Load snapshot if cache is empty
  useEffect(() => {
    if (!userId || externalData || hasAnyFastAnalyticsData(initialCachedAnalytics)) return;

    let isMounted = true;
    const fetchSnapshot = async () => {
      const { supabase } = await import('./../lib/supabaseClient');
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .eq('user_id', userId)
        .eq('period_type', 'weekly')
        .gte('week_start_date', startOfWeekStr)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (isMounted && data) {
        const mapped = mapSnapshotToAnalytics(data);
        if (mapped) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAnalytics(mapped);
          setLoading(false);
          inMemoryAnalyticsCache.set(userId, mapped);
        }
      }
    };
    fetchSnapshot();
    return () => { isMounted = false; };
  }, [userId, externalData, initialCachedAnalytics]);

  // Fetch core data (tasks, habits, etc.)
  useEffect(() => {
    if (!userId) return;
    if (externalData) {
      setRawTasks(externalData.tasks || []);
      setRawHabits(externalData.habits || []);
      setRawLogs(externalData.logs || []);
      setRawPlanners(externalData.planners || []);
      setDataLoading(false);
      return;
    }

    let isMounted = true;
    const fetchId = Date.now().toString();
    fetchGuardRef.current = fetchId;

    const loadCoreData = async () => {
      const [tasksRes, habitsRes, logsRes, plannersRes] = await Promise.all([
        dataStoreService.getTasks(userId),
        dataStoreService.getHabits(userId),
        dataStoreService.getHabitLogs(userId),
        dataStoreService.getPlanners(userId)
      ]);
      
      if (!isMounted || fetchGuardRef.current !== fetchId) return;
      
      setRawTasks(tasksRes || []);
      setRawHabits(habitsRes || []);
      setRawLogs(logsRes || []);
      setRawPlanners(plannersRes || []);
      setDataLoading(false);
    };

    loadCoreData();
    return () => { isMounted = false; };
  }, [userId, externalData]);

  // Compute unified analytics asynchronously via requestIdleCallback to keep UI snappy
  useEffect(() => {
    if (!userId || dataLoading) return;
    
    let cancelled = false;
    let idleId;
    let timeoutId;
    
    const runDeferredCalculations = () => {
      if (cancelled) return;
      
      const calcStart = performance.now();
      const computedAnalytics = computeAnalytics(rawTasks, rawHabits, rawLogs, rawPlanners);
      
      if (cancelled) return;
      
      setAnalytics(prev => ({
        ...prev,
        ...computedAnalytics
      }));
      setLoading(false);
      inMemoryAnalyticsCache.set(userId, computedAnalytics);
      
      // Attempt to save snapshot
      const currentSignature = JSON.stringify(computedAnalytics);
      if (lastSnapshotSignatureRef.current !== currentSignature) {
        lastSnapshotSignatureRef.current = currentSignature;
        setTimeout(() => {
          if (!cancelled) {
            saveWeeklySnapshot(userId, computedAnalytics).catch(err => {
              console.error('Error saving background snapshot:', err);
            });
          }
        }, 3000);
      }
      
      perfLog('analytics_calc_end', {
        userId,
        durationMs: Number((performance.now() - calcStart).toFixed(2))
      });
    };

    if (window.requestIdleCallback) {
      idleId = window.requestIdleCallback(runDeferredCalculations, { timeout: 2000 });
    } else {
      timeoutId = setTimeout(runDeferredCalculations, 50);
    }
    
    return () => {
      cancelled = true;
      if (idleId) window.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [userId, dataLoading, rawTasks, rawHabits, rawLogs, rawPlanners, perfLog]);

  return {
    analytics,
    loading: loading || dataLoading,
    refresh: () => {
      dataStoreService.clearUserCache(userId);
      setDataLoading(true);
    }
  };
};
`;

fs.writeFileSync(hookPath, newHookContent, 'utf8');
console.log('Successfully refactored useAnalytics.js!');

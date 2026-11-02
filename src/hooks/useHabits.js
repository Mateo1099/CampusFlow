import { useState, useEffect, useCallback, useMemo } from 'react';
import { habitsService } from '../lib/habitsService';
import { dataStoreService } from '../lib/dataStoreService';

export const useHabits = (userId, addXP, incrementStat) => {
  // "La mesa en la entrada": Carga síncrona inmediata desde la memoria
  const [habits, setHabits] = useState(() => {
    return dataStoreService.getCachedData('habits', userId) || [];
  });
  const [logs, setLogs] = useState(() => {
    return dataStoreService.getCachedData('habitLogs', userId) || [];
  });
  const [loading, setLoading] = useState(() => {
    const hasCache = dataStoreService.hasCachedData('habits', userId);
    return !hasCache && Boolean(userId);
  });
  const [lastFetched, setLastFetched] = useState(() => {
    return dataStoreService.getCacheEntry('habits', userId)?.lastFetched || 0;
  });
  const [error, setError] = useState(null);

  // Suscripción reactiva para revalidaciones en segundo plano
  useEffect(() => {
    if (!userId) return;
    const unsubHabits = dataStoreService.subscribe('habits', userId, (freshHabits) => {
      if (Array.isArray(freshHabits)) {
        setHabits(freshHabits);
        setLastFetched(Date.now());
        setLoading(false);
      }
    });
    const unsubLogs = dataStoreService.subscribe('habitLogs', userId, (freshLogs) => {
      if (Array.isArray(freshLogs)) {
        setLogs(freshLogs);
        setLoading(false);
      }
    });
    return () => {
      unsubHabits();
      unsubLogs();
    };
  }, [userId]);

  const fetchHabitsAndLogs = useCallback(async (options = {}) => {
    if (!userId) {
      setHabits([]);
      setLogs([]);
      return;
    }
    const hasCache = dataStoreService.hasCachedData('habits', userId);
    if (!hasCache && !options.silent) {
      setLoading(true);
    }
    try {
      const [h, l] = await Promise.all([
        dataStoreService.getHabits(userId, options),
        dataStoreService.getHabitLogs(userId, options),
      ]);
      setHabits(h || []);
      setLogs(l || []);
      setLastFetched(Date.now());
    } catch (err) {
      console.error("useHabits_Hook_Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHabitsAndLogs();
  }, [fetchHabitsAndLogs]);

  const addHabit = useCallback(async (activity) => {
    try {
      const habitData = {
        name: activity.title,
        start_time: activity.startTime,
        duration_minutes: parseInt(activity.durationMinutes) || 30,
        frequency_type: 'daily'
      };
      const newHabit = await habitsService.createHabit(userId, habitData);
      setHabits(prev => [...prev.filter(h => String(h.id) !== String(newHabit.id)), newHabit]);
      dataStoreService.addCachedItem('habits', userId, newHabit, false);
      setLastFetched(Date.now());
      return newHabit;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  const toggleHabitLog = useCallback(async (habitId) => {
    try {
      const now = new Date().toISOString();
      const result = await habitsService.logHabit(userId, habitId, now);
      
      if (result.action === 'added') {
        setLogs(prev => {
          const updated = [...prev, result.data];
          dataStoreService.setCachedData('habitLogs', userId, updated, true);
          return updated;
        });
        if (addXP) addXP(50);
        if (incrementStat) incrementStat('habitsCompleted');
      } else {
        setLogs(prev => {
          const updated = prev.filter(l => l.habit_id !== habitId);
          dataStoreService.setCachedData('habitLogs', userId, updated, true);
          return updated;
        });
        if (addXP) addXP(-50);
      }
    } catch (err) {
      console.error("Error toggling habit:", err);
    }
  }, [userId, addXP, incrementStat]);

  const deleteHabit = useCallback(async (id) => {
    // Optimistic update
    setHabits(prev => prev.filter(h => String(h.id) !== String(id)));
    setLogs(prev => prev.filter(l => String(l.habit_id) !== String(id)));
    dataStoreService.removeCachedItem('habits', userId, id);
    setLastFetched(Date.now());

    try {
      await habitsService.deleteHabit(id);
    } catch (err) {
      console.error("Error deleting habit:", err);
      fetchHabitsAndLogs({ forceRefresh: true });
    }
  }, [userId, fetchHabitsAndLogs]);

  const dailyPlan = useMemo(() => habits.map(h => ({
    id: h.id,
    title: h.name,
    startTime: h.start_time || '00:00',
    durationMinutes: h.duration_minutes || 30,
    completed: logs.some(l => l.habit_id === h.id)
  })), [habits, logs]);

  return {
    habits,
    logs,
    dailyPlan,
    loading,
    habitsLoading: loading,
    lastFetched,
    isInitialized: Boolean(lastFetched > 0 || habits.length > 0),
    error,
    addHabit,
    toggleHabitLog,
    deleteHabit,
    refreshHabits: fetchHabitsAndLogs
  };
};

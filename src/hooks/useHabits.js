import { useState, useEffect, useCallback, useMemo } from 'react';
import { habitsService } from '../lib/habitsService';
import { dataStoreService } from '../lib/dataStoreService';

export const useHabits = (userId, addXP, incrementStat) => {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHabitsAndLogs = useCallback(async () => {
    if (!userId) {
      setHabits([]);
      setLogs([]);
      return;
    }
    setLoading(true);
    try {
      const [h, l] = await Promise.all([
        dataStoreService.getHabits(userId),
        dataStoreService.getHabitLogs(userId),
      ]);
      setHabits(h);
      setLogs(l);
    } catch (err) {
      // No seteamos setError para no bloquear UI principal
      console.error("useHabits_Hook_Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHabitsAndLogs();
  }, [fetchHabitsAndLogs]);

  // useCallback: identidad estable entre renders, necesaria para que TaskContext
  // pueda memoizar de verdad su `value` (ver comentario en TaskContext.jsx).
  const addHabit = useCallback(async (activity) => {
    try {
      const habitData = {
        name: activity.title,
        start_time: activity.startTime,
        duration_minutes: parseInt(activity.durationMinutes) || 30,
        frequency_type: 'daily'
      };
      const newHabit = await habitsService.createHabit(userId, habitData);
      setHabits(prev => [...prev, newHabit]);
      dataStoreService.invalidate('habits', userId);
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
        setLogs(prev => [...prev, result.data]);
        if (addXP) addXP(50);
        if (incrementStat) incrementStat('habitsCompleted');
      } else {
        setLogs(prev => prev.filter(l => l.habit_id !== habitId));
        if (addXP) addXP(-50);
      }
      dataStoreService.invalidate('habitLogs', userId);
    } catch (err) {
      console.error("Error toggling habit:", err);
    }
  }, [userId, addXP, incrementStat]);

  const deleteHabit = useCallback(async (id) => {
    try {
      await habitsService.deleteHabit(id);
      setHabits(prev => prev.filter(h => h.id !== id));
      setLogs(prev => prev.filter(l => l.habit_id !== id));
      dataStoreService.invalidate('habits', userId);
      dataStoreService.invalidate('habitLogs', userId);
    } catch (err) {
      console.error("Error deleting habit:", err);
    }
  }, [userId]);

  // useMemo: sin esto, .map() crea un array nuevo en cada render aunque habits/logs
  // no hayan cambiado, invalidando la memoización de TaskContext.value aguas arriba.
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
    error,
    addHabit,
    toggleHabitLog,
    deleteHabit,
    refreshHabits: fetchHabitsAndLogs
  };
};

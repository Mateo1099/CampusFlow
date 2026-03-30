import { useState, useEffect, useCallback } from 'react';
import { habitsService } from '../lib/habitsService';

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
      const h = await habitsService.getHabits(userId);
      setHabits(h);
      
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      
      const l = await habitsService.getLogs(userId, startOfDay, endOfDay).catch(e => []);
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

  const addHabit = async (activity) => {
    try {
      const habitData = {
        name: activity.title,
        start_time: activity.startTime,
        duration_minutes: parseInt(activity.durationMinutes) || 30,
        frequency_type: 'daily'
      };
      const newHabit = await habitsService.createHabit(userId, habitData);
      setHabits(prev => [...prev, newHabit]);
      return newHabit;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const toggleHabitLog = async (habitId) => {
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
    } catch (err) {
      console.error("Error toggling habit:", err);
    }
  };

  const deleteHabit = async (id) => {
    try {
      await habitsService.deleteHabit(id);
      setHabits(prev => prev.filter(h => h.id !== id));
      setLogs(prev => prev.filter(l => l.habit_id !== id));
    } catch (err) {
      console.error("Error deleting habit:", err);
    }
  };

  const dailyPlan = habits.map(h => ({
    id: h.id,
    title: h.name,
    startTime: h.start_time || '00:00',
    durationMinutes: h.duration_minutes || 30,
    completed: logs.some(l => l.habit_id === h.id)
  }));

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

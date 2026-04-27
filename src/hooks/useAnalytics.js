import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from './useTasks';
import { useCourses } from './useCourses';
import { useHabits } from './useHabits';
import { usePlanners } from './usePlanners';
import { analyticsService } from '../lib/analyticsService';

const DEFAULT_ANALYTICS = {
  totalTasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  totalHabits: 0,
  completedHabits: 0,
  totalMinutes: 0,
  completedBlocks: 0,
  pendingBlocks: 0,
  minutesByDay: [0, 0, 0, 0, 0, 0, 0],
  minutesByTime: {
    morning: 0,
    afternoon: 0,
    night: 0
  },
  historicalSummary: {
    semanaActual: { minutos: 0, bloques: 0 },
    semanaAnterior: { minutos: 0, bloques: 0 },
    diferenciaMinutos: 0,
    diferenciaBloques: 0,
    tendencia: 'stable'
  },
  insights: []
};

export const useAnalytics = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { tasks, loading: tasksLoading } = useTasks(userId);
  const { loading: coursesLoading } = useCourses(userId);
  const { habits, logs, loading: habitsLoading } = useHabits(userId);
  const { planners, loading: plannersLoading } = usePlanners(userId);

  const [analytics, setAnalytics] = useState(DEFAULT_ANALYTICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setAnalytics(DEFAULT_ANALYTICS);
      setLoading(false);
      return;
    }

    const isLoading = tasksLoading || coursesLoading || habitsLoading || plannersLoading;
    setLoading(isLoading);

    if (isLoading) {
      return;
    }

    const baseAnalytics = {
      totalTasks: analyticsService.getTotalTasks(tasks),
      completedTasks: analyticsService.getCompletedTasks(tasks),
      pendingTasks: analyticsService.getPendingTasks(tasks),
      totalHabits: analyticsService.getTotalHabits(habits),
      completedHabits: analyticsService.getCompletedHabits(habits, logs),
      totalMinutes: analyticsService.getTotalPlannedMinutes(planners),
      completedBlocks: analyticsService.getCompletedBlocks(planners),
      pendingBlocks: analyticsService.getPendingBlocks(planners),
      minutesByDay: analyticsService.getMinutesByDay(planners),
      minutesByTime: analyticsService.getMinutesByTime(planners),
      historicalSummary: analyticsService.getTrendSummary(planners)
    };

    setAnalytics({
      ...baseAnalytics,
      insights: analyticsService.generateInsights(baseAnalytics)
    });
  }, [userId, tasks, tasksLoading, coursesLoading, habits, logs, habitsLoading, planners, plannersLoading]);

  return {
    ...analytics,
    loading
  };
};

import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { useTasks } from '../hooks/useTasks';
import { useCourses } from '../hooks/useCourses';
import { useHabits } from '../hooks/useHabits';

const TaskContext = createContext();

export function TaskProvider({ children }) {
  const auth = useAuth();
  const settings = useSettings();

  const user = auth?.user;
  const addXP = settings?.addXP;
  const incrementStat = settings?.incrementStat;

  // Hooks de Datos
  const { 
    tasks, setTasks, addTask, updateTaskStatus, deleteTask, updateTask, updateTaskSchedule, tasksLoading 
  } = useTasks(user?.id, addXP, incrementStat);

  const { 
    courses, addCourse, updateCourse, deleteCourse, coursesLoading 
  } = useCourses(user?.id);

  const { 
    dailyPlan, addHabit: addDailyActivity, toggleHabitLog: toggleDailyActivity, deleteHabit: removeDailyActivity, habitsLoading 
  } = useHabits(user?.id, addXP, incrementStat);

  // Analytics Globales
  const analytics = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'submitted').length;
    const totalHabits = dailyPlan.length;
    const completedHabits = dailyPlan.filter(h => h.completed).length;
    
    // Productividad por día (L-D)
    const productivity = [0, 0, 0, 0, 0, 0, 0];
    const dayMap = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
    
    tasks.forEach(t => {
      if (t.status === 'submitted' && t.day && dayMap[t.day] !== undefined) {
        productivity[dayMap[t.day]] += 1;
      }
    });

    return { totalTasks, completedTasks, totalHabits, completedHabits, productivity };
  }, [tasks, dailyPlan]);

  const value = {
    tasks, setTasks, addTask, updateTaskStatus, deleteTask, updateTask, updateTaskSchedule, tasksLoading,
    courses, addCourse, updateCourse, deleteCourse, coursesLoading,
    dailyPlan, addDailyActivity, toggleDailyActivity, removeDailyActivity, habitsLoading,
    analytics
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasksContext() {
  return useContext(TaskContext);
}

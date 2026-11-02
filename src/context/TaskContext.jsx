/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { useTasks } from '../hooks/useTasks';
import { useCourses } from '../hooks/useCourses';
import { useHabits } from '../hooks/useHabits';
import { dataStoreService } from '../lib/dataStoreService';
import { 
  saveStudySession, 
  calculateStudyMinutes,
  normalizeStudySession,
  getLocalStudySessions 
} from '../services/studySessionService';

const TaskContext = createContext();

export function TaskProvider({ children }) {
  const auth = useAuth();
  const settings = useSettings();

  const user = auth?.user;
  const addXP = settings?.addXP;
  const incrementStat = settings?.incrementStat;

  // Hooks de Datos con soporte de Caché en Memoria SWR ("La mesa en la entrada")
  const { 
    tasks, setTasks, addTask, updateTaskStatus, deleteTask, updateTask, updateTaskSchedule, updateSubtasks, updateTaskNotes,
    loading: tasksLoading, lastFetched: tasksLastFetched, isInitialized: tasksInitialized 
  } = useTasks(user?.id);

  const { 
    courses, setCourses, addCourse, updateCourse, deleteCourse,
    loading: coursesLoading, lastFetched: coursesLastFetched, isInitialized: coursesInitialized 
  } = useCourses(user?.id);

  const { 
    dailyPlan, addHabit: addDailyActivity, toggleHabitLog: toggleDailyActivity, deleteHabit: removeDailyActivity,
    loading: habitsLoading, lastFetched: habitsLastFetched, isInitialized: habitsInitialized 
  } = useHabits(user?.id, addXP, incrementStat);

  // Estado de Sesiones de Estudio con hidratación inmediata ("Mesa en la entrada")
  const [studySessions, setStudySessions] = useState(() => {
    return dataStoreService.getCachedData('studySessions', user?.id) || getLocalStudySessions(user?.id) || [];
  });
  const [studySessionsLoading, setStudySessionsLoading] = useState(() => {
    const hasCache = dataStoreService.hasCachedData('studySessions', user?.id) || getLocalStudySessions(user?.id).length > 0;
    return !hasCache && Boolean(user?.id);
  });
  const [studySessionsLastFetched, setStudySessionsLastFetched] = useState(() => {
    return dataStoreService.getCacheEntry('studySessions', user?.id)?.lastFetched || 0;
  });

  // Cargar sesiones de estudio del usuario activo con SWR
  const fetchStudySessions = useCallback(async (options = {}) => {
    if (!user?.id) {
      setStudySessions([]);
      return;
    }
    const hasCache = dataStoreService.hasCachedData('studySessions', user.id);
    if (!hasCache && !options.silent) {
      setStudySessionsLoading(true);
    }
    try {
      const sessions = await dataStoreService.getStudySessions(user.id, options);
      setStudySessions(sessions || []);
      setStudySessionsLastFetched(Date.now());
    } catch {
      setStudySessions(getLocalStudySessions(user.id) || []);
    } finally {
      setStudySessionsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStudySessions();
  }, [fetchStudySessions]);

  // Suscripción reactiva para revalidaciones en segundo plano de sesiones de estudio
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = dataStoreService.subscribe('studySessions', user.id, (fresh) => {
      if (Array.isArray(fresh)) {
        setStudySessions(fresh);
        setStudySessionsLastFetched(Date.now());
        setStudySessionsLoading(false);
      }
    });
    return unsubscribe;
  }, [user?.id]);

  // Listener reactivo para actualizaciones en tiempo real (DOM custom event)
  useEffect(() => {
    const handleSessionSaved = (e) => {
      const saved = e?.detail;
      if (!saved) return;
      if (!user?.id || String(saved.user_id) === String(user.id)) {
        setStudySessions(prev => {
          const exists = prev.some(s => s.id === saved.id);
          const updated = exists ? prev.map(s => s.id === saved.id ? saved : s) : [saved, ...prev];
          if (user?.id) {
            dataStoreService.setCachedData('studySessions', user.id, updated, true);
          }
          return updated;
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('campusflow:study-session-saved', handleSessionSaved);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('campusflow:study-session-saved', handleSessionSaved);
      }
    };
  }, [user?.id]);

  // Función para registrar y persistir una nueva sesión de estudio
  const recordStudySession = useCallback(async (sessionData) => {
    const userId = user?.id || null;
    const normalized = normalizeStudySession({
      ...sessionData,
      user_id: sessionData?.user_id || userId
    }, userId);

    // Actualización optimista inmediata en estado local del contexto y caché en memoria
    setStudySessions(prev => [normalized, ...prev.filter(s => s.id !== normalized.id)]);
    if (userId) {
      dataStoreService.addCachedItem('studySessions', userId, normalized);
      setStudySessionsLastFetched(Date.now());
    }

    // Persistencia asíncrona local y Supabase
    try {
      const result = await saveStudySession(normalized, userId);
      if (result?.data) {
        setStudySessions(prev => [result.data, ...prev.filter(s => s.id !== result.data.id)]);
        if (userId) {
          dataStoreService.updateCachedItem('studySessions', userId, result.data.id, () => result.data);
          setStudySessionsLastFetched(Date.now());
        }
      }
      return result;
    } catch (err) {
      return { success: false, error: err, data: normalized };
    }
  }, [user?.id]);

  // Analytics Globales
  const analytics = useMemo(() => {
    const totalTasks = tasks.length;
    const deliveredTasks = tasks.filter(t => t.status === 'entregado' || t.status === 'submitted');
    const completedTasks = deliveredTasks.length;
    const totalXP = completedTasks * 100;
    const totalHabits = dailyPlan.length;
    const completedHabits = dailyPlan.filter(h => h.completed).length;
    
    // Productividad por día (L-D)
    const productivity = [0, 0, 0, 0, 0, 0, 0];
    const dayMap = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
    
    tasks.forEach(t => {
      if ((t.status === 'submitted' || t.status === 'entregado') && t.day && dayMap[t.day] !== undefined) {
        productivity[dayMap[t.day]] += 1;
      }
    });

    // Minutos de estudio acumulados
    const totalStudyMinutes = calculateStudyMinutes(studySessions, { userId: user?.id });

    return { 
      totalTasks, 
      completedTasks, 
      totalXP, 
      totalHabits, 
      completedHabits, 
      productivity,
      totalStudyMinutes 
    };
  }, [tasks, dailyPlan, studySessions, user?.id]);

  const isInitialized = Boolean(tasksInitialized || coursesInitialized || habitsInitialized);

  // Memoizado: sin esto, el Provider crea un objeto `value` nuevo en cada render,
  // forzando a re-renderizar TODOS los componentes que usan useTasksContext()
  // (Dashboard, TaskBoard, Agenda, Sidebar) aunque el cambio no les afecte.
  const value = useMemo(() => ({
    tasks, setTasks, addTask, updateTaskStatus, deleteTask, updateTask, updateTaskSchedule, updateSubtasks, updateTaskNotes,
    tasksLoading, tasksLastFetched,
    courses, setCourses, addCourse, updateCourse, deleteCourse,
    coursesLoading, coursesLastFetched,
    dailyPlan, addDailyActivity, toggleDailyActivity, removeDailyActivity,
    habitsLoading, habitsLastFetched,
    studySessions, setStudySessions, recordStudySession,
    studySessionsLoading, studySessionsLastFetched,
    isInitialized,
    analytics
  }), [
    tasks, setTasks, addTask, updateTaskStatus, deleteTask, updateTask, updateTaskSchedule, updateSubtasks, updateTaskNotes,
    tasksLoading, tasksLastFetched,
    courses, setCourses, addCourse, updateCourse, deleteCourse,
    coursesLoading, coursesLastFetched,
    dailyPlan, addDailyActivity, toggleDailyActivity, removeDailyActivity,
    habitsLoading, habitsLastFetched,
    studySessions, setStudySessions, recordStudySession,
    studySessionsLoading, studySessionsLastFetched,
    isInitialized,
    analytics
  ]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasksContext() {
  return useContext(TaskContext);
}

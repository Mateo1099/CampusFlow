/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { useTasks } from '../hooks/useTasks';
import { useCourses } from '../hooks/useCourses';
import { useHabits } from '../hooks/useHabits';
import { 
  getStudySessions, 
  saveStudySession, 
  calculateStudyMinutes,
  normalizeStudySession 
} from '../services/studySessionService';

const TaskContext = createContext();

export function TaskProvider({ children }) {
  const auth = useAuth();
  const settings = useSettings();

  const user = auth?.user;
  const addXP = settings?.addXP;
  const incrementStat = settings?.incrementStat;

  // Hooks de Datos
  const { 
    tasks, setTasks, addTask, updateTaskStatus, deleteTask, updateTask, updateTaskSchedule, updateSubtasks, updateTaskNotes, tasksLoading 
  } = useTasks(user?.id);

  const { 
    courses, addCourse, updateCourse, deleteCourse, coursesLoading 
  } = useCourses(user?.id);

  const { 
    dailyPlan, addHabit: addDailyActivity, toggleHabitLog: toggleDailyActivity, deleteHabit: removeDailyActivity, habitsLoading 
  } = useHabits(user?.id, addXP, incrementStat);

  // Estado de Sesiones de Estudio (Modo Estudio / Pomodoro)
  const [studySessions, setStudySessions] = useState([]);
  const [studySessionsLoading, setStudySessionsLoading] = useState(false);

  // Cargar sesiones de estudio del usuario activo
  const fetchStudySessions = useCallback(async () => {
    if (!user?.id) {
      setStudySessions([]);
      return;
    }
    setStudySessionsLoading(true);
    try {
      const sessions = await getStudySessions(user.id);
      setStudySessions(sessions || []);
    } catch {
      setStudySessions([]);
    } finally {
      setStudySessionsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStudySessions();
  }, [fetchStudySessions]);

  // Listener reactivo para actualizaciones en tiempo real (DOM custom event)
  useEffect(() => {
    const handleSessionSaved = (e) => {
      const saved = e?.detail;
      if (!saved) return;
      if (!user?.id || String(saved.user_id) === String(user.id)) {
        setStudySessions(prev => {
          const exists = prev.some(s => s.id === saved.id);
          if (exists) {
            return prev.map(s => s.id === saved.id ? saved : s);
          }
          return [saved, ...prev];
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

    // Actualización optimista inmediata en estado local del contexto
    setStudySessions(prev => [normalized, ...prev.filter(s => s.id !== normalized.id)]);

    // Persistencia asíncrona local y Supabase
    try {
      const result = await saveStudySession(normalized, userId);
      if (result?.data) {
        setStudySessions(prev => [result.data, ...prev.filter(s => s.id !== result.data.id)]);
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

  // Memoizado: sin esto, el Provider crea un objeto `value` nuevo en cada render,
  // forzando a re-renderizar TODOS los componentes que usan useTasksContext()
  // (Dashboard, TaskBoard, Agenda, Sidebar) aunque el cambio no les afecte.
  const value = useMemo(() => ({
    tasks, setTasks, addTask, updateTaskStatus, deleteTask, updateTask, updateTaskSchedule, updateSubtasks, updateTaskNotes, tasksLoading,
    courses, addCourse, updateCourse, deleteCourse, coursesLoading,
    dailyPlan, addDailyActivity, toggleDailyActivity, removeDailyActivity, habitsLoading,
    studySessions, setStudySessions, recordStudySession, studySessionsLoading,
    analytics
  }), [
    tasks, setTasks, addTask, updateTaskStatus, deleteTask, updateTask, updateTaskSchedule, updateSubtasks, updateTaskNotes, tasksLoading,
    courses, addCourse, updateCourse, deleteCourse, coursesLoading,
    dailyPlan, addDailyActivity, toggleDailyActivity, removeDailyActivity, habitsLoading,
    studySessions, setStudySessions, recordStudySession, studySessionsLoading,
    analytics
  ]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasksContext() {
  return useContext(TaskContext);
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { tasksService } from '../lib/tasksService';
import { assignmentService } from '../services/assignmentService';
import { dataStoreService } from '../lib/dataStoreService';
import { trackEvent } from '../services/analyticsService';
import { handleServiceError } from '../lib/errorHandler';

const mapTask = (t) => ({
  ...t,
  xpClaimed: ['entregado', 'submitted', 'completado', 'done'].includes(String(t?.status).toLowerCase())
});

export const useTasks = (userId) => {
  // "La mesa en la entrada": Carga síncrona inmediata desde la memoria / local storage
  const [tasks, setTasks] = useState(() => {
    const cached = dataStoreService.getCachedData('tasks', userId);
    return Array.isArray(cached) ? cached.map(mapTask) : [];
  });

  const [loading, setLoading] = useState(() => {
    const hasCache = dataStoreService.hasCachedData('tasks', userId);
    return !hasCache && Boolean(userId);
  });

  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(() => {
    return dataStoreService.getCacheEntry('tasks', userId)?.lastFetched || 0;
  });

  // Ref espejo de `tasks` para useCallback con identidades estables
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Suscripción reactiva para revalidaciones silenciosas en segundo plano (SWR)
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = dataStoreService.subscribe('tasks', userId, (freshTasks) => {
      if (Array.isArray(freshTasks)) {
        setTasks(freshTasks.map(mapTask));
        setLastFetched(Date.now());
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [userId]);

  const fetchTasks = useCallback(async (options = {}) => {
    if (!userId) {
      setTasks([]);
      return;
    }
    // Solo activamos spinner si la caché en memoria no existe en absoluto
    const hasCache = dataStoreService.hasCachedData('tasks', userId);
    if (!hasCache && !options.silent) {
      setLoading(true);
    }
    try {
      const data = await dataStoreService.getTasks(userId, options);
      const mapped = (data || []).map(mapTask);
      setTasks(mapped);
      setLastFetched(Date.now());
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { showToast: false, context: 'useTasks.fetchTasks' });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(async (task) => {
    try {
      const newTask = await tasksService.createTask(userId, task);
      const mapped = mapTask(newTask);
      setTasks(prev => [mapped, ...prev.filter(t => String(t.id) !== String(mapped.id))]);
      dataStoreService.addCachedItem('tasks', userId, mapped);
      setLastFetched(Date.now());
      trackEvent('task_created', { taskId: newTask?.id, title: newTask?.title });
      return newTask;
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { fallbackMessage: 'Inconveniente al crear la entrega en el servidor', context: 'useTasks.addTask' });
      throw err;
    }
  }, [userId]);

  const updateTask = useCallback(async (id, updates) => {
    // Optimistic update
    setTasks(prev => prev.map(t => String(t.id) === String(id) ? { ...t, ...updates } : t));
    dataStoreService.updateCachedItem('tasks', userId, id, t => ({ ...t, ...updates }));
    setLastFetched(Date.now());

    try {
      const updatedTask = await tasksService.updateTask(id, updates);
      const mapped = mapTask(updatedTask);
      setTasks(prev => prev.map(t => String(t.id) === String(id) ? mapped : t));
      dataStoreService.updateCachedItem('tasks', userId, id, () => mapped);
      setLastFetched(Date.now());
      return updatedTask;
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { fallbackMessage: 'Inconveniente al actualizar la entrega', context: 'useTasks.updateTask' });
      throw err;
    }
  }, [userId]);

  const updateSubtasks = useCallback(async (id, subtasks) => {
    // Optimistic update
    setTasks(prev => prev.map(t => String(t.id) === String(id) ? { ...t, subtasks } : t));
    dataStoreService.updateCachedItem('tasks', userId, id, t => ({ ...t, subtasks }));
    setLastFetched(Date.now());

    try {
      const updatedTask = await assignmentService.updateSubtasks(id, subtasks);
      const mapped = mapTask(updatedTask);
      setTasks(prev => prev.map(t => String(t.id) === String(id) ? { ...t, ...mapped } : t));
      dataStoreService.updateCachedItem('tasks', userId, id, t => ({ ...t, ...mapped }));
      setLastFetched(Date.now());
      return updatedTask;
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { fallbackMessage: 'Inconveniente al guardar los ejercicios', context: 'useTasks.updateSubtasks' });
      fetchTasks({ forceRefresh: true });
      throw err;
    }
  }, [userId, fetchTasks]);

  const updateTaskNotes = useCallback(async (id, notes) => {
    // Optimistic update
    setTasks(prev => prev.map(t => String(t.id) === String(id) ? { ...t, task_notes: notes } : t));
    dataStoreService.updateCachedItem('tasks', userId, id, t => ({ ...t, task_notes: notes }));
    setLastFetched(Date.now());

    try {
      const updatedTask = await assignmentService.updateTaskNotes(id, notes);
      const mapped = mapTask(updatedTask);
      setTasks(prev => prev.map(t => String(t.id) === String(id) ? { ...t, ...mapped } : t));
      dataStoreService.updateCachedItem('tasks', userId, id, t => ({ ...t, ...mapped }));
      setLastFetched(Date.now());
      return updatedTask;
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { fallbackMessage: 'Inconveniente al guardar los apuntes de la tarea', context: 'useTasks.updateTaskNotes' });
      fetchTasks({ forceRefresh: true });
      throw err;
    }
  }, [userId, fetchTasks]);

  const updateTaskStatus = useCallback(async (id, newStatus) => {
    try {
      const task = tasksRef.current.find(t => String(t.id) === String(id));
      if (!task) return;

      const isNowDelivered = ['entregado', 'submitted', 'completado', 'done'].includes(String(newStatus).toLowerCase());
      if (isNowDelivered) {
        trackEvent('task_completed', { taskId: id, status: newStatus });
      }

      // Optimistic update
      setTasks(prev => prev.map(t => String(t.id) === String(id) ? { ...t, status: newStatus, xpClaimed: isNowDelivered } : t));
      dataStoreService.updateCachedItem('tasks', userId, id, t => ({ ...t, status: newStatus, xpClaimed: isNowDelivered }));
      setLastFetched(Date.now());

      const updates = {
        status: newStatus,
        course_id: task.course_id
      };

      const updatedTask = await tasksService.updateTask(id, updates);
      const mapped = mapTask(updatedTask);
      setTasks(prev => prev.map(t => String(t.id) === String(id) ? mapped : t));
      dataStoreService.updateCachedItem('tasks', userId, id, () => mapped);
      setLastFetched(Date.now());
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { fallbackMessage: 'Inconveniente al cambiar el estado de la entrega', context: 'useTasks.updateTaskStatus' });
      throw err;
    }
  }, [userId]);

  const deleteTask = useCallback(async (id) => {
    // Optimistic update
    setTasks(prev => prev.filter(t => String(t.id) !== String(id)));
    dataStoreService.removeCachedItem('tasks', userId, id);
    setLastFetched(Date.now());

    try {
      await tasksService.deleteTask(id);
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { fallbackMessage: 'Inconveniente al eliminar la entrega', context: 'useTasks.deleteTask' });
      fetchTasks({ forceRefresh: true });
      throw err;
    }
  }, [userId, fetchTasks]);

  const updateTaskSchedule = useCallback(async (id, day, block) => {
    const task = tasksRef.current.find(t => String(t.id) === String(id));
    if (!task) return;

    // Optimistic update
    setTasks(prev => prev.map(t => String(t.id) === String(id) ? { ...t, day, block } : t));
    dataStoreService.updateCachedItem('tasks', userId, id, t => ({ ...t, day, block }));
    setLastFetched(Date.now());

    try {
      const updatedTask = await tasksService.updateTask(id, { ...task, day, block });
      const mapped = mapTask(updatedTask);
      setTasks(prev => prev.map(t => String(t.id) === String(id) ? mapped : t));
      dataStoreService.updateCachedItem('tasks', userId, id, () => mapped);
      setLastFetched(Date.now());
      return updatedTask;
    } catch (err) {
      setError(err.message);
      handleServiceError(err, { fallbackMessage: 'Inconveniente al reprogramar la entrega', context: 'useTasks.updateTaskSchedule' });
      fetchTasks({ forceRefresh: true });
      throw err;
    }
  }, [userId, fetchTasks]);

  return {
    tasks,
    setTasks,
    loading,
    tasksLoading: loading,
    lastFetched,
    isInitialized: Boolean(lastFetched > 0 || tasks.length > 0),
    error,
    addTask,
    updateTask,
    updateSubtasks,
    updateTaskNotes,
    updateTaskStatus,
    deleteTask,
    updateTaskSchedule,
    refreshTasks: fetchTasks
  };
};

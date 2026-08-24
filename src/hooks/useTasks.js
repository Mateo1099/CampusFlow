import { useState, useEffect, useCallback, useRef } from 'react';
import { tasksService } from '../lib/tasksService';
import { dataStoreService } from '../lib/dataStoreService';

export const useTasks = (userId) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ref espejo de `tasks`: permite que updateTaskStatus/updateTaskSchedule lean
  // el valor más reciente sin depender de `tasks` en su useCallback, así
  // mantienen identidad estable entre renders (necesario para que la
  // memoización de TaskContext.value tenga efecto real).
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const data = await dataStoreService.getTasks(userId);
      // Inyectar xpClaimed para evitar exploit de XP en tareas ya entregadas
      setTasks(data.map(t => ({ ...t, xpClaimed: String(t.status).toLowerCase() === 'entregado' })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Todas las funciones de mutación se envuelven en useCallback para que mantengan
  // identidad estable entre renders. Sin esto, TaskContext no puede memoizar de
  // verdad su `value` (cada render seguiría creando funciones nuevas, invalidando
  // el useMemo aguas arriba y re-renderizando toda la app igual que antes).
  const addTask = useCallback(async (task) => {
    try {
      const newTask = await tasksService.createTask(userId, task);
      setTasks(prev => [{ ...newTask, xpClaimed: false }, ...prev]);
      dataStoreService.invalidate('tasks', userId);
      return newTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  const updateTask = useCallback(async (id, updates) => {
    try {
      const updatedTask = await tasksService.updateTask(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? { ...updatedTask, xpClaimed: String(updatedTask.status).toLowerCase() === 'entregado' } : t));
      dataStoreService.invalidate('tasks', userId);
      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  const updateTaskStatus = useCallback(async (id, newStatus) => {
    try {
      const task = tasksRef.current.find(t => String(t.id) === String(id));
      if (!task) return;

      // SURGICAL UPDATE: Enviamos solo lo necesario pero asegurando que no se pierda el mapeo
      const updates = {
        status: newStatus,
        course_id: task.course_id // Preservamos el ID relacional
      };

      const updatedTask = await tasksService.updateTask(id, updates);
      // La lógica de XP ahora se maneja completamente en TaskBoard.jsx para evitar duplicados
      const isNowDelivered = String(newStatus).toLowerCase() === 'entregado';
      setTasks(prev => prev.map(t => String(t.id) === String(id) ? { ...updatedTask, xpClaimed: isNowDelivered } : t));
      dataStoreService.invalidate('tasks', userId);
    } catch (err) {
      console.error("ERROR EN updateTaskStatus:", err);
      setError(err.message);
      throw err;
    }
  }, [userId]);

  const deleteTask = useCallback(async (id) => {
    try {
      await tasksService.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      dataStoreService.invalidate('tasks', userId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  const updateTaskSchedule = useCallback(async (id, day, block) => {
    try {
      const task = tasksRef.current.find(t => t.id === id);
      if (!task) return;

      const updatedTask = await tasksService.updateTask(id, { ...task, day, block });
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      dataStoreService.invalidate('tasks', userId);
      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  return {
    tasks,
    setTasks, // Exponemos para actualizaciones optimistas
    loading,
    error,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    updateTaskSchedule,
    refreshTasks: fetchTasks
  };
};

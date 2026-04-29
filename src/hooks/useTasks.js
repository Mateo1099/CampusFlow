import { useState, useEffect, useCallback } from 'react';
import { tasksService } from '../lib/tasksService';
import { dataStoreService } from '../lib/dataStoreService';

export const useTasks = (userId, addXP, incrementStat) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const data = await dataStoreService.getTasks(userId);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (task) => {
    try {
      const newTask = await tasksService.createTask(userId, task);
      setTasks(prev => [newTask, ...prev]);
      dataStoreService.invalidate('tasks', userId);
      return newTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTask = async (id, updates) => {
    try {
      const updatedTask = await tasksService.updateTask(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      dataStoreService.invalidate('tasks', userId);
      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTaskStatus = async (id, newStatus) => {
    try {
      const task = tasks.find(t => String(t.id) === String(id));
      if (!task) return;

      const oldStatus = task.status;
      
      // Lógica de XP
      if (oldStatus !== 'ENTREGADO' && newStatus === 'ENTREGADO') {
        if (addXP) addXP(100);
        if (incrementStat) incrementStat('tasksCompleted');
      } else if (oldStatus === 'ENTREGADO' && newStatus !== 'ENTREGADO') {
        if (addXP) addXP(-100);
      }

      // SURGICAL UPDATE: Enviamos solo lo necesario pero asegurando que no se pierda el mapeo
      const updates = {
        status: newStatus,
        course_id: task.course_id // Preservamos el ID relacional
      };

      const updatedTask = await tasksService.updateTask(id, updates);
      setTasks(prev => prev.map(t => String(t.id) === String(id) ? updatedTask : t));
      dataStoreService.invalidate('tasks', userId);
    } catch (err) {
      console.error("ERROR EN updateTaskStatus:", err);
      setError(err.message);
      throw err;
    }
  };

  const deleteTask = async (id) => {
    try {
      await tasksService.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      dataStoreService.invalidate('tasks', userId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTaskSchedule = async (id, day, block) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const updatedTask = await tasksService.updateTask(id, { ...task, day, block });
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      dataStoreService.invalidate('tasks', userId);
      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

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

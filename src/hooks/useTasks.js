import { useState, useEffect, useCallback } from 'react';
import { tasksService } from '../lib/tasksService';

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
      const data = await tasksService.getTasks(userId);
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
      const newTask = await tasksService.createTask(userId, {
        ...task,
        status: 'todo',
        created_at: new Date().toISOString()
      });
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTaskStatus = async (id, newStatus) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const oldStatus = task.status;
      
      // Lógica de XP
      if (oldStatus !== 'submitted' && newStatus === 'submitted') {
        addXP(100);
        incrementStat('tasksCompleted');
      } else if (oldStatus === 'submitted' && newStatus !== 'submitted') {
        addXP(-100);
      }

      const updatedTask = await tasksService.updateTask(id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteTask = async (id) => {
    try {
      await tasksService.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTaskSchedule = async (id, day, block) => {
    try {
      const updatedTask = await tasksService.updateTask(id, { day, block });
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      return updatedTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTaskStatus,
    deleteTask,
    updateTask,
    updateTaskSchedule,
    refreshTasks: fetchTasks
  };
};

import { useState, useCallback, useEffect } from 'react';
import { plannersService } from '../lib/plannersService';

export const usePlanners = (userId) => {
  const [planners, setPlanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlanners = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await plannersService.getPlanners(userId);
      setPlanners(data || []);
    } catch (err) {
      console.error('Error fetching planners:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlanners();
  }, [fetchPlanners]);

  const addPlanner = async (plannerData) => {
    try {
      const data = await plannersService.createPlanner(userId, plannerData);
      setPlanners(prev => [{ ...data, planner_blocks: [] }, ...prev]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updatePlanner = async (id, updates) => {
    try {
      const data = await plannersService.updatePlanner(id, updates);
      setPlanners(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deletePlanner = async (id) => {
    try {
      await plannersService.deletePlanner(id);
      setPlanners(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Block management
  const addBlock = async (plannerId, blockData) => {
    try {
      const block = await plannersService.addBlock(userId, plannerId, blockData);
      setPlanners(prev => prev.map(p => {
        if (p.id === plannerId) {
          return { ...p, planner_blocks: [...(p.planner_blocks || []), block] };
        }
        return p;
      }));
      return block;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateBlock = async (plannerId, blockId, updates) => {
    try {
      const data = await plannersService.updateBlock(blockId, updates);
      setPlanners(prev => prev.map(p => {
        if (p.id === plannerId) {
          return {
            ...p,
            planner_blocks: (p.planner_blocks || []).map(b => (b.id === blockId ? { ...b, ...data } : b))
          };
        }
        return p;
      }));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteBlock = async (plannerId, blockId) => {
    try {
      await plannersService.deleteBlock(blockId);
      setPlanners(prev => prev.map(p => {
        if (p.id === plannerId) {
          return { ...p, planner_blocks: (p.planner_blocks || []).filter(b => b.id !== blockId) };
        }
        return p;
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    planners,
    loading,
    error,
    addPlanner,
    updatePlanner,
    deletePlanner,
    fetchPlanners,
    addBlock,
    updateBlock,
    deleteBlock
  };
};
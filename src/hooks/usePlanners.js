import { useState, useCallback, useEffect } from 'react';
import { plannerService } from '../lib/plannerService';

export const usePlanners = (userId) => {
  const [planners, setPlanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlanners = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await plannerService.getPlanners(userId);
      setPlanners(data || []);
    } catch (err) {
      console.error('usePlanners.fetchPlanners: error cargando planners', err);
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
      const data = await plannerService.createPlanner(plannerData, userId);
      setPlanners(prev => [{ ...data, planner_blocks: [] }, ...prev]);
      return data;
    } catch (err) {
      console.error('usePlanners.addPlanner: error creando planner', err);
      setError(err.message);
      throw err;
    }
  };

  const updatePlanner = async (id, updates) => {
    try {
      const data = await plannerService.updatePlanner(id, updates, userId);
      setPlanners(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)));
      return data;
    } catch (err) {
      console.error('usePlanners.updatePlanner: error actualizando planner', err);
      setError(err.message);
      throw err;
    }
  };

  const deletePlanner = async (id) => {
    try {
      await plannerService.deletePlanner(id, userId);
      setPlanners(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('usePlanners.deletePlanner: error eliminando planner', err);
      setError(err.message);
      throw err;
    }
  };

  // Block management
  const addBlock = async (plannerId, blockData) => {
    try {
      let targetPlannerId = plannerId;

      if (!targetPlannerId) {
        const fallbackPlanner = planners[0];
        if (fallbackPlanner?.id) {
          targetPlannerId = fallbackPlanner.id;
          console.warn('usePlanners.addBlock: plannerId ausente, usando planner existente', targetPlannerId);
        } else {
          const autoPlannerData = {
            title: `Planificacion automatica ${new Date().toLocaleDateString('es-CO')}`,
            category: 'Personalizado',
            weekly_goal: '',
            color: '#00f3ff',
            description: 'Creada automaticamente al insertar un bloque sin planner activo'
          };

          const createdPlanner = await plannerService.createPlanner(autoPlannerData, userId);
          targetPlannerId = createdPlanner.id;

          setPlanners(prev => [{ ...createdPlanner, planner_blocks: [] }, ...prev]);
          console.warn('usePlanners.addBlock: se creo planner automatico para insertar bloque', targetPlannerId);
        }
      }

      const block = await plannerService.createPlannerBlock(targetPlannerId, blockData, userId);
      setPlanners(prev => prev.map(p => {
        if (p.id === targetPlannerId) {
          return { ...p, planner_blocks: [...(p.planner_blocks || []), block] };
        }
        return p;
      }));
      return block;
    } catch (err) {
      console.error('usePlanners.addBlock: error creando bloque', err);
      setError(err.message);
      throw err;
    }
  };

  const updateBlock = async (plannerId, blockId, updates) => {
    try {
      const data = await plannerService.updatePlannerBlock(blockId, updates, userId);
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
      console.error('usePlanners.updateBlock: error actualizando bloque', err);
      setError(err.message);
      throw err;
    }
  };

  const deleteBlock = async (plannerId, blockId) => {
    try {
      await plannerService.deletePlannerBlock(blockId, userId);
      setPlanners(prev => prev.map(p => {
        if (p.id === plannerId) {
          return { ...p, planner_blocks: (p.planner_blocks || []).filter(b => b.id !== blockId) };
        }
        return p;
      }));
    } catch (err) {
      console.error('usePlanners.deleteBlock: error eliminando bloque', err);
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
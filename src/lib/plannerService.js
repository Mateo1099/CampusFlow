import { supabase } from './supabaseClient';

const VALID_BLOCK_TIMES = ['morning', 'afternoon', 'night'];
const VALID_BLOCK_TYPES = ['libre', 'materia', 'trabajo'];
const VALID_BLOCK_STATUSES = ['pendiente', 'en_proceso', 'completado'];

const normalizeNullableId = (value) => {
  if (!value) return null;
  return value;
};

const normalizeDuration = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const validateBlockTime = (value) => {
  if (!VALID_BLOCK_TIMES.includes(value)) {
    throw new Error(`block_time invalido: ${value}. Valores permitidos: ${VALID_BLOCK_TIMES.join(', ')}`);
  }
};

const validateBlockType = (value) => {
  if (!VALID_BLOCK_TYPES.includes(value)) {
    throw new Error(`block_type invalido: ${value}. Valores permitidos: ${VALID_BLOCK_TYPES.join(', ')}`);
  }
};

const validateStatus = (value) => {
  if (!VALID_BLOCK_STATUSES.includes(value)) {
    throw new Error(`status invalido: ${value}. Valores permitidos: ${VALID_BLOCK_STATUSES.join(', ')}`);
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const plannerService = {
  async getAuthenticatedUserId(fallbackUserId) {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('plannerService.getAuthenticatedUserId: error obteniendo usuario autenticado', error);
      throw error;
    }

    if (data?.user?.id) {
      return data.user.id;
    }

    if (fallbackUserId) {
      console.warn('plannerService.getAuthenticatedUserId: usando fallback userId por ausencia de sesion activa');
      return fallbackUserId;
    }

    throw new Error('Usuario no autenticado');
  },

  // 1. Obtener planificaciones del usuario
  async getPlanners(fallbackUserId) {
    try {
      const userId = await this.getAuthenticatedUserId(fallbackUserId);

      const { data, error } = await supabase
        .from('planners')
        .select('*, planner_blocks(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('created_at', { foreignTable: 'planner_blocks', ascending: true });

      if (error) {
        console.error('plannerService.getPlanners: error consultando planners', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('plannerService.getPlanners: error inesperado', error);
      throw error;
    }
  },

  // 2. Crear una planificacion
  async createPlanner(plannerData, fallbackUserId) {
    try {
      const userId = await this.getAuthenticatedUserId(fallbackUserId);

      const newPlanner = {
        title: plannerData.title,
        category: plannerData.category,
        weekly_goal: plannerData.weekly_goal,
        color: plannerData.color,
        icon: plannerData.icon,
        description: plannerData.description,
        user_id: userId
      };

      const { data, error } = await supabase
        .from('planners')
        .insert([newPlanner])
        .select()
        .single();

      if (error) {
        console.error('plannerService.createPlanner: error creando planner', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('plannerService.createPlanner: error inesperado', error);
      throw error;
    }
  },

  // 3. Actualizar planificacion
  async updatePlanner(plannerId, updates, fallbackUserId) {
    try {
      const userId = await this.getAuthenticatedUserId(fallbackUserId);

      const { data, error } = await supabase
        .from('planners')
        .update(updates)
        .eq('id', plannerId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('plannerService.updatePlanner: error actualizando planner', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('plannerService.updatePlanner: error inesperado', error);
      throw error;
    }
  },

  // 4. Eliminar planificacion
  async deletePlanner(plannerId, fallbackUserId) {
    try {
      const userId = await this.getAuthenticatedUserId(fallbackUserId);

      const { error } = await supabase
        .from('planners')
        .delete()
        .eq('id', plannerId)
        .eq('user_id', userId);

      if (error) {
        console.error('plannerService.deletePlanner: error eliminando planner', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('plannerService.deletePlanner: error inesperado', error);
      throw error;
    }
  },

  // 5. Obtener bloques de una planificacion
  async getPlannerBlocks(plannerId, fallbackUserId) {
    try {
      const userId = await this.getAuthenticatedUserId(fallbackUserId);

      const { data, error } = await supabase
        .from('planner_blocks')
        .select('*')
        .eq('planner_id', plannerId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('plannerService.getPlannerBlocks: error obteniendo bloques', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('plannerService.getPlannerBlocks: error inesperado', error);
      throw error;
    }
  },

  // 6. Crear bloque
  async createPlannerBlock(plannerId, blockData, fallbackUserId) {
    try {
      const userId = await this.getAuthenticatedUserId(fallbackUserId);

      if (!plannerId) {
        throw new Error('planner_id es obligatorio para crear un bloque');
      }
      if (!UUID_REGEX.test(String(userId))) {
        throw new Error(`user_id invalido: ${userId}`);
      }

      const blockTime = blockData.block_time;
      const blockType = blockData.block_type || 'libre';
      const status = 'pendiente';
      const day = typeof blockData.day === 'string' ? blockData.day.trim() : '';
      const title = typeof blockData.title === 'string' ? blockData.title.trim() : '';

      if (!day) {
        throw new Error('day es obligatorio y debe ser string valido');
      }
      if (!title) {
        throw new Error('title es obligatorio y debe ser string valido');
      }

      validateBlockTime(blockTime);
      validateBlockType(blockType);
      validateStatus(status);

      const durationMinutes = Number.parseInt(blockData.duration_minutes, 10);

      const payload = {
        planner_id: plannerId,
        user_id: userId,
        day,
        block_time: blockTime,
        title,
        block_type: blockType,
        course_id: normalizeNullableId(blockData.course_id),
        task_id: normalizeNullableId(blockData.task_id),
        status,
        duration_minutes: Number.isNaN(durationMinutes) ? 0 : durationMinutes,
        notes: blockData.notes || ''
      };

      console.log("PAYLOAD BLOQUE:", payload);

      const { data, error } = await supabase
        .from('planner_blocks')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('plannerService.createPlannerBlock: error creando bloque', error);
        console.error(error.message, error.details, error.hint, error.code);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(error.message, error.details, error.hint, error.code);
      console.error('plannerService.createPlannerBlock: error inesperado', error);
      throw error;
    }
  },

  // 7. Actualizar bloque
  async updatePlannerBlock(blockId, updates, fallbackUserId) {
    try {
      const userId = await this.getAuthenticatedUserId(fallbackUserId);
      const normalizedUpdates = { ...updates };

      if (normalizedUpdates.block_time !== undefined) {
        validateBlockTime(normalizedUpdates.block_time);
      }
      if (normalizedUpdates.block_type !== undefined) {
        validateBlockType(normalizedUpdates.block_type);
      }
      if (normalizedUpdates.status !== undefined) {
        validateStatus(normalizedUpdates.status);
      }
      if (normalizedUpdates.duration_minutes !== undefined) {
        normalizedUpdates.duration_minutes = normalizeDuration(normalizedUpdates.duration_minutes);
      }
      if (normalizedUpdates.course_id !== undefined) {
        normalizedUpdates.course_id = normalizeNullableId(normalizedUpdates.course_id);
      }
      if (normalizedUpdates.task_id !== undefined) {
        normalizedUpdates.task_id = normalizeNullableId(normalizedUpdates.task_id);
      }

      const { data, error } = await supabase
        .from('planner_blocks')
        .update(normalizedUpdates)
        .eq('id', blockId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('plannerService.updatePlannerBlock: error actualizando bloque', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('plannerService.updatePlannerBlock: error inesperado', error);
      throw error;
    }
  },

  // 8. Eliminar bloque
  async deletePlannerBlock(blockId, fallbackUserId) {
    try {
      const userId = await this.getAuthenticatedUserId(fallbackUserId);

      const { error } = await supabase
        .from('planner_blocks')
        .delete()
        .eq('id', blockId)
        .eq('user_id', userId);

      if (error) {
        console.error('plannerService.deletePlannerBlock: error eliminando bloque', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('plannerService.deletePlannerBlock: error inesperado', error);
      throw error;
    }
  },

  // 9. Calcular total de minutos planeados
  async getTotalPlannedMinutes({ plannerId, fallbackUserId } = {}) {
    try {
      const userId = await this.getAuthenticatedUserId(fallbackUserId);

      let query = supabase
        .from('planner_blocks')
        .select('duration_minutes')
        .eq('user_id', userId)
        .not('duration_minutes', 'is', null);

      if (plannerId) {
        query = query.eq('planner_id', plannerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('plannerService.getTotalPlannedMinutes: error calculando total', error);
        throw error;
      }

      return (data || []).reduce((sum, block) => sum + (block.duration_minutes || 0), 0);
    } catch (error) {
      console.error('plannerService.getTotalPlannedMinutes: error inesperado', error);
      throw error;
    }
  },

  // 10. Calcular minutos por dia
  async getPlannedMinutesByDay({ plannerId, fallbackUserId } = {}) {
    try {
      const userId = await this.getAuthenticatedUserId(fallbackUserId);

      let query = supabase
        .from('planner_blocks')
        .select('day, duration_minutes')
        .eq('user_id', userId)
        .not('duration_minutes', 'is', null);

      if (plannerId) {
        query = query.eq('planner_id', plannerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('plannerService.getPlannedMinutesByDay: error calculando por dia', error);
        throw error;
      }

      return (data || []).reduce((acc, block) => {
        if (!block.day) return acc;
        acc[block.day] = (acc[block.day] || 0) + (block.duration_minutes || 0);
        return acc;
      }, {});
    } catch (error) {
      console.error('plannerService.getPlannedMinutesByDay: error inesperado', error);
      throw error;
    }
  }
};

import { supabase } from './supabaseClient';

export const plannerService = {
  // 1. Obtener planificaciones del usuario
  async getPlanners() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('planners')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Error en getPlanners:', error);
      return { data: null, error };
    }
  },

  // 2. Crear una planificación
  async createPlanner(plannerData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Usuario no autenticado');

      const newPlanner = {
        title: plannerData.title,
        category: plannerData.category,
        weekly_goal: plannerData.weekly_goal,
        color: plannerData.color,
        icon: plannerData.icon,
        description: plannerData.description,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('planners')
        .insert([newPlanner])
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error en createPlanner:', error);
      return { data: null, error };
    }
  },

  // 3. Actualizar planificación
  async updatePlanner(plannerId, updates) {
    try {
      const { data, error } = await supabase
        .from('planners')
        .update(updates)
        .eq('id', plannerId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error en updatePlanner:', error);
      return { data: null, error };
    }
  },

  // 4. Eliminar planificación
  async deletePlanner(plannerId) {
    try {
      const { data, error } = await supabase
        .from('planners')
        .delete()
        .eq('id', plannerId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error en deletePlanner:', error);
      return { data: null, error };
    }
  },

  // 5. Obtener bloques de una planificación
  async getPlannerBlocks(plannerId) {
    try {
      const { data, error } = await supabase
        .from('planner_blocks')
        .select('*')
        .eq('planner_id', plannerId)
        .order('created_at', { ascending: true });

      return { data, error };
    } catch (error) {
      console.error('Error en getPlannerBlocks:', error);
      return { data: null, error };
    }
  },

  // 6. Crear bloque
  async createPlannerBlock(plannerId, blockData) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Usuario no autenticado');

      const newBlock = {
        planner_id: plannerId,
        day: blockData.day,
        block_time: blockData.block_time,
        title: blockData.title,
        block_type: blockData.block_type,
        course_id: blockData.course_id || null,
        task_id: blockData.task_id || null,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('planner_blocks')
        .insert([newBlock])
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error en createPlannerBlock:', error);
      return { data: null, error };
    }
  },

  // 7. Actualizar bloque
  async updatePlannerBlock(blockId, updates) {
    try {
      const { data, error } = await supabase
        .from('planner_blocks')
        .update(updates)
        .eq('id', blockId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error en updatePlannerBlock:', error);
      return { data: null, error };
    }
  },

  // 8. Eliminar bloque
  async deletePlannerBlock(blockId) {
    try {
      const { data, error } = await supabase
        .from('planner_blocks')
        .delete()
        .eq('id', blockId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error en deletePlannerBlock:', error);
      return { data: null, error };
    }
  }
};

import { supabase } from './supabaseClient';

export const plannersService = {
  getPlanners: async (userId) => {
    const { data, error } = await supabase
      .from('planners')
      .select(`
        *,
        planner_blocks (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  createPlanner: async (userId, plannerData) => {
    const { data, error } = await supabase
      .from('planners')
      .insert([{ ...plannerData, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updatePlanner: async (id, updates) => {
    const { data, error } = await supabase
      .from('planners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deletePlanner: async (id) => {
    const { error } = await supabase
      .from('planners')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Blocks
  addBlock: async (userId, plannerId, blockData) => {
    const { data, error } = await supabase
      .from('planner_blocks')
      .insert([{ ...blockData, planner_id: plannerId, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateBlock: async (blockId, updates) => {
    const { data, error } = await supabase
      .from('planner_blocks')
      .update(updates)
      .eq('id', blockId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteBlock: async (blockId) => {
    const { error } = await supabase
      .from('planner_blocks')
      .delete()
      .eq('id', blockId);

    if (error) throw error;
    return true;
  }
};
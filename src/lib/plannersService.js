import { supabase } from './supabaseClient';

const plannersServiceTracker = new Map();

const perfLog = (event, payload = {}) => {
  const ts = performance.now();
  const entry = { event, ts, source: 'plannersService', ...payload };
  if (typeof window !== 'undefined') {
    window.__CF_PERF_LOGS = window.__CF_PERF_LOGS || [];
    window.__CF_PERF_LOGS.push(entry);
    window.__CF_QUERY_COUNT = (window.__CF_QUERY_COUNT || 0) + (event.includes('query_start') ? 1 : 0);
  }
  console.log('[PERF]', entry);
};

export const plannersService = {
  getPlanners: async (userId) => {
    const queryKey = `plannersService.getPlanners:${userId}`;
    const start = performance.now();
    const prev = plannersServiceTracker.get(queryKey);
    perfLog('planners_service_query_start', { queryKey, userId });
    if (typeof prev === 'number' && start - prev < 1200) {
      perfLog('planners_service_query_duplicate_detected', {
        queryKey,
        userId,
        deltaMs: Number((start - prev).toFixed(2))
      });
    }
    plannersServiceTracker.set(queryKey, start);

    const { data, error } = await supabase
      .from('planners')
      .select(`
        *,
        planner_blocks (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    perfLog('planners_service_query_end', {
      queryKey,
      userId,
      durationMs: Number((performance.now() - start).toFixed(2)),
      rows: Array.isArray(data) ? data.length : 0,
      hasError: Boolean(error)
    });

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
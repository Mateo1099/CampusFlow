import { supabase } from './supabaseClient';

export const habitsService = {
  async getHabits(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async createHabit(userId, habit) {
    const { data, error } = await supabase
      .from('habits')
      .insert([{ 
        ...habit, 
        user_id: userId,
        frequency_type: habit.frequency_type || 'daily'
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async updateHabit(id, updates) {
    const { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async deleteHabit(id) {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async getLogs(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', startDate)
      .lte('completed_at', endDate);
    
    if (error) throw error;
    return data || [];
  },

  async logHabit(userId, habitId, completedAt) {
    if (!userId) return;
    
    // Check if log already exists for this habit and date (day only)
    const dateOnly = completedAt.split('T')[0];
    
    const { data: existing } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .gte('completed_at', `${dateOnly}T00:00:00`)
      .lte('completed_at', `${dateOnly}T23:59:59`);

    if (existing && existing.length > 0) {
      // If it exists, we remove it (toggle off)
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('id', existing[0].id);
      if (error) throw error;
      return { action: 'removed' };
    } else {
      // If it doesn't exist, we add it (toggle on)
      const { data, error } = await supabase
        .from('habit_logs')
        .insert([{ 
          habit_id: habitId, 
          user_id: userId, 
          completed_at: completedAt 
        }])
        .select();
      if (error) throw error;
      return { action: 'added', data: data[0] };
    }
  }
};

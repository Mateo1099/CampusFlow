import { supabase } from './supabaseClient';

export const coursesService = {
  async getCourses(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createCourse(userId, course) {
    const { data, error } = await supabase
      .from('courses')
      .insert([{ ...course, user_id: userId }])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async updateCourse(id, updates) {
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async deleteCourse(id) {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

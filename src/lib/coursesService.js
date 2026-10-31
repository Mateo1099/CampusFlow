import { supabase } from './supabaseClient';

export const coursesService = {
  async getCourses(userId) {
    if (!userId) return [];
    
    // REVERSIÓN TÁCTICA: De 'subjects' a 'courses'
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, color, teacher, code, institution')
      .eq('user_id', userId);
    
    if (error) {
      console.error("ERROR SUPABASE courses:", error.message);
      throw error;
    }

    return data || [];
  },

  async createCourse(userId, course) {
    const activeUserId = userId || course?.user_id || course?.userId;
    if (!activeUserId) {
      throw new Error('[coursesService] userId es requerido para registrar una materia');
    }

    const courseData = {
      name: course.name || 'Materia Sin Nombre',
      code: course.code || null,
      institution: course.institution || null,
      teacher: course.teacher || null,
      color: course.color || '#ff0000',
      user_id: activeUserId
    };

    const { data, error } = await supabase
      .from('courses')
      .insert([courseData])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async updateCourse(id, updates, userId) {
    let query = supabase
      .from('courses')
      .update(updates)
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.select();
    
    if (error) throw error;
    return data[0];
  },

  async deleteCourse(id, userId) {
    let query = supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;
    
    if (error) throw error;
    return true;
  }
};

import { supabase } from './supabaseClient';

export const coursesService = {
  async getCourses(userId) {
    if (!userId) return [];
    
    // REVERSIÓN TÁCTICA: De 'subjects' a 'courses'
    console.log("CONSULTANDO courses PARA UID:", userId);

    const { data, error } = await supabase
      .from('courses')
      .select('id, name, color, teacher, code, institution')
      .eq('user_id', userId);
    
    if (error) {
      console.error("ERROR SUPABASE courses:", error.message);
      throw error;
    }

    console.log("DATOS courses RECIBIDOS:", data);
    return data || [];
  },

  async createCourse(userId, course) {
    const courseData = {
      name: course.name || 'Materia Sin Nombre',
      code: course.code || null,
      institution: course.institution || null,
      teacher: course.teacher || null,
      color: course.color || '#ff0000',
      user_id: userId
    };

    const { data, error } = await supabase
      .from('courses')
      .insert([courseData])
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

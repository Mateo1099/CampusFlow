import { supabase } from './supabaseClient';

const COURSES_STORAGE_PREFIX = 'campusflow_courses_';

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

export function getLocalCourses(userId) {
  const storage = getStorage();
  if (!storage || !userId) return [];
  try {
    const raw = storage.getItem(`${COURSES_STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCourses(userId, courses) {
  const storage = getStorage();
  if (!storage || !userId || !Array.isArray(courses)) return;
  try {
    storage.setItem(`${COURSES_STORAGE_PREFIX}${userId}`, JSON.stringify(courses));
  } catch {
    // Graceful degradation
  }
}

export const coursesService = {
  async getCourses(userId) {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, color, teacher, code, institution')
        .eq('user_id', userId);
      
      if (error) {
        console.error("ERROR SUPABASE courses:", error.message);
        return getLocalCourses(userId);
      }

      if (Array.isArray(data)) {
        saveLocalCourses(userId, data);
      }
      return data || [];
    } catch (err) {
      console.warn("Excepción obteniendo materias de Supabase, usando cache local:", err?.message);
      return getLocalCourses(userId);
    }
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
    
    const created = data[0];
    const local = getLocalCourses(activeUserId);
    saveLocalCourses(activeUserId, [created, ...local.filter(c => c.id !== created.id)]);
    return created;
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
    
    const updated = data[0];
    if (userId) {
      const local = getLocalCourses(userId);
      saveLocalCourses(userId, local.map(c => c.id === id ? { ...c, ...updated } : c));
    }
    return updated;
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
    
    if (userId) {
      const local = getLocalCourses(userId);
      saveLocalCourses(userId, local.filter(c => c.id !== id));
    }
    return true;
  }
};

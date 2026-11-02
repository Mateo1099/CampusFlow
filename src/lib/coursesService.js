import { supabase } from './supabaseClient';

export const COURSE_COLUMNS = 'id, user_id, name, color, icon, term, created_at';
export const COURSE_FALLBACK_COLUMNS = 'id, user_id, name, color, created_at';

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
      let { data, error } = await supabase
        .from('courses')
        .select(COURSE_COLUMNS)
        .eq('user_id', userId);
      
      if (error && error.message && (error.message.includes('icon') || error.message.includes('term'))) {
        const retryResult = await supabase
          .from('courses')
          .select(COURSE_FALLBACK_COLUMNS)
          .eq('user_id', userId);
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error("ERROR SUPABASE courses:", error.message);
        return getLocalCourses(userId);
      }

      if (Array.isArray(data)) {
        // Preservar propiedades locales extendidas como institution, teacher o code si existen
        const local = getLocalCourses(userId);
        const localMap = new Map(local.map(c => [c.id, c]));
        const merged = data.map(remoteCourse => {
          const cached = localMap.get(remoteCourse.id);
          if (cached) {
            return { ...cached, ...remoteCourse };
          }
          return remoteCourse;
        });

        saveLocalCourses(userId, merged);
        return merged;
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

    let result = await supabase
      .from('courses')
      .insert([courseData])
      .select(COURSE_COLUMNS);
    
    if (result.error && result.error.message && (result.error.message.includes('icon') || result.error.message.includes('term'))) {
      result = await supabase
        .from('courses')
        .insert([courseData])
        .select(COURSE_FALLBACK_COLUMNS);
    }
    
    if (result.error) throw result.error;
    
    const created = { ...courseData, ...(result.data && result.data[0] ? result.data[0] : {}) };
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

    let result = await query.select(COURSE_COLUMNS);
    if (result.error && result.error.message && (result.error.message.includes('icon') || result.error.message.includes('term'))) {
      result = await query.select(COURSE_FALLBACK_COLUMNS);
    }
    
    if (result.error) throw result.error;
    
    const updated = result.data && result.data[0] ? result.data[0] : { id, ...updates };
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

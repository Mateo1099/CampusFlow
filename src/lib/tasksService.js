import { supabase } from './supabaseClient';

/**
 * REGLAS DE ORO DE BASE DE DATOS:
 * 1. Tabla Trabajos: 'assignments'
 * 2. Tabla Materias: 'courses'
 * 3. Relación: assignments.course_id -> courses.id
 * 4. Local-first: Cache y sincronización inmediata con localStorage para evitar desfases de UI
 */

const STORAGE_PREFIX = 'campusflow_tasks_';

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

export function getLocalTasks(userId) {
  const storage = getStorage();
  if (!storage || !userId) return [];
  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalTasks(userId, tasks) {
  const storage = getStorage();
  if (!storage || !userId || !Array.isArray(tasks)) return;
  try {
    storage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(tasks));
  } catch {
    // Graceful degradation
  }
}

export const tasksService = {
  async getTasks(userId) {
    if (!userId) return [];
    
    // TABLA ACTUALIZADA: assignments join courses (incluyendo institucion)
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, courses(name, color, institution)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn("ALFA_FETCH_WARNING (assignments):", error.message);
        return getLocalTasks(userId);
      }

      const tasks = data || [];
      saveLocalTasks(userId, tasks);
      return tasks;
    } catch (err) {
      console.warn("Excepción obteniendo trabajos, fallback a local:", err?.message);
      return getLocalTasks(userId);
    }
  },

  async createTask(userId, task) {
    const activeUserId = userId || task?.user_id || task?.userId;
    const taskId = task.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `asg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

    // MAPEAMOS A LOS NOMBRES DE COLUMNAS DE LA TABLA 'assignments'
    const taskData = { 
      id: taskId,
      title: task.title,
      course_id: task.course_id || task.courseId || null,
      start_date: task.start_date || task.startDate || null,
      deadline: task.deadline || task.dueDate || null,
      status: task.status || 'sin entregar',
      user_id: activeUserId,
      priority: task.priority || 'media',
      institution: task.institution || null,
      subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      task_notes: task.task_notes || task.taskNotes || task.notes || ''
    };

    // 1. Guardado inmediato local-first
    if (activeUserId) {
      const existing = getLocalTasks(activeUserId);
      saveLocalTasks(activeUserId, [taskData, ...existing.filter(t => t.id !== taskData.id)]);
    }

    // 2. Persistencia en Supabase
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert([taskData])
        .select('*, courses(name, color, institution)');
      
      if (error) {
        // Fallback si la tabla no tiene columnas extendidas priority o institution
        if (error.message && (error.message.includes('priority') || error.message.includes('institution'))) {
          const coreData = {
            id: taskId,
            title: taskData.title,
            course_id: taskData.course_id,
            start_date: taskData.start_date,
            deadline: taskData.deadline,
            status: taskData.status,
            user_id: activeUserId
          };
          const { data: retryData, error: retryError } = await supabase
            .from('assignments')
            .insert([coreData])
            .select('*, courses(name, color, institution)');
          
          if (!retryError && retryData && retryData[0]) {
            const merged = { ...taskData, ...retryData[0] };
            return merged;
          }
        }
        console.warn("ALFA_SAVE_WARNING (assignments):", error.message);
        return taskData;
      }
      return data && data[0] ? { ...taskData, ...data[0] } : taskData;
    } catch (err) {
      console.warn("Excepción guardando en Supabase, guardado local:", err?.message);
      return taskData;
    }
  },

  async updateTask(id, updates) {
    // BLINDAJE: Solo enviamos lo que viene, mapeando a nombres reales de columnas
    const cloudMapping = {};
    
    if (updates.title !== undefined) cloudMapping.title = updates.title;
    
    // Mapeo flexible de Materia
    if (updates.course_id !== undefined) cloudMapping.course_id = updates.course_id;
    else if (updates.courseId !== undefined) cloudMapping.course_id = updates.courseId;
    
    // Mapeo flexible de Fechas
    if (updates.start_date !== undefined) cloudMapping.start_date = updates.start_date;
    else if (updates.startDate !== undefined) cloudMapping.start_date = updates.startDate;
    
    if (updates.deadline !== undefined) cloudMapping.deadline = updates.deadline;
    else if (updates.dueDate !== undefined) cloudMapping.deadline = updates.dueDate;
    else if (updates.due_date !== undefined) cloudMapping.deadline = updates.due_date;

    if (updates.priority !== undefined) cloudMapping.priority = updates.priority;
    if (updates.institution !== undefined) cloudMapping.institution = updates.institution;

    if (updates.status !== undefined) {
      // Normalizamos a minúsculas
      const rawStatus = String(updates.status).toLowerCase();
      const statusMap = {
        'todo': 'sin entregar',
        'sin entregar': 'sin entregar',
        'pendiente': 'sin entregar',
        'en proceso': 'en proceso',
        'revisión': 'revisión',
        'entregado': 'entregado',
        'submitted': 'entregado',
        'completado': 'entregado',
        'done': 'entregado'
      };
      cloudMapping.status = statusMap[rawStatus] || rawStatus;
    }

    // Mapeo de Subtareas (JSONB) y Notas de Estudio (TEXT)
    if (updates.subtasks !== undefined) {
      cloudMapping.subtasks = Array.isArray(updates.subtasks) ? updates.subtasks : [];
    }
    if (updates.task_notes !== undefined) {
      cloudMapping.task_notes = typeof updates.task_notes === 'string' ? updates.task_notes : (updates.task_notes == null ? '' : String(updates.task_notes));
    } else if (updates.taskNotes !== undefined) {
      cloudMapping.task_notes = typeof updates.taskNotes === 'string' ? updates.taskNotes : (updates.taskNotes == null ? '' : String(updates.taskNotes));
    } else if (updates.notes !== undefined) {
      cloudMapping.task_notes = typeof updates.notes === 'string' ? updates.notes : (updates.notes == null ? '' : String(updates.notes));
    }

    try {
      const { data, error } = await supabase
        .from('assignments')
        .update(cloudMapping)
        .eq('id', id)
        .select('*, courses(name, color, institution)');
      
      if (error) {
        if (error.message && (error.message.includes('priority') || error.message.includes('institution'))) {
          delete cloudMapping.priority;
          delete cloudMapping.institution;
          const { data: retryData, error: retryError } = await supabase
            .from('assignments')
            .update(cloudMapping)
            .eq('id', id)
            .select('*, courses(name, color, institution)');
          if (!retryError && retryData && retryData[0]) {
            return retryData[0];
          }
        }
        console.warn("ALFA_SAVE_WARNING (Update):", error.message);
        return { id, ...updates };
      }
      return data && data[0] ? data[0] : { id, ...updates };
    } catch (err) {
      console.warn("ALFA_SAVE_EXCEPTION (Update):", err?.message);
      return { id, ...updates };
    }
  },

  async updateSubtasks(id, subtasks) {
    return this.updateTask(id, { subtasks });
  },

  async updateTaskNotes(id, notes) {
    return this.updateTask(id, { task_notes: notes });
  },

  async deleteTask(id, userId) {
    try {
      let query = supabase.from('assignments').delete().eq('id', id);
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { error } = await query;
      if (error) {
        console.warn("Error eliminando tarea en Supabase:", error.message);
      }
      return true;
    } catch (err) {
      console.warn("Excepción eliminando tarea:", err?.message);
      return true;
    }
  }
};

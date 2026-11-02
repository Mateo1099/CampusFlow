import { supabase } from './supabaseClient';

/**
 * REGLAS DE ORO DE BASE DE DATOS:
 * 1. Tabla Trabajos: 'assignments'
 * 2. Tabla Materias: 'courses'
 * 3. Relación: assignments.course_id -> courses.id
 * 4. Local-first: Cache y sincronización inmediata con localStorage para evitar desfases de UI
 * 5. Proyección estricta: Se prohíbe el uso de select('*') para optimizar ancho de banda y latencia.
 */

export const TASK_LIST_COLUMNS = 'id, user_id, title, deadline, status, priority, course_id, institution, created_at, updated_at';
export const TASK_JOINED_PROJECTION = `${TASK_LIST_COLUMNS}, courses(name, color, institution)`;
export const TASK_DETAIL_PROJECTION = 'id, user_id, title, deadline, start_date, status, priority, course_id, institution, subtasks, task_notes, created_at, updated_at, courses(name, color, institution)';

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
  async getTasks(userId, options = {}) {
    if (!userId) return [];
    
    // TABLA ACTUALIZADA: assignments join courses (con proyección estricta)
    try {
      let query = supabase
        .from('assignments')
        .select(TASK_JOINED_PROJECTION)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.limit && typeof query.limit === 'function') {
        query = query.limit(options.limit);
      }

      if (options.offset !== undefined && typeof query.range === 'function') {
        const pageSize = options.limit || 50;
        query = query.range(options.offset, options.offset + pageSize - 1);
      }
      
      const { data, error } = await query;
      
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

  /**
   * Consulta optimizada de tareas completadas con ordenamiento explícito,
   * límite de seguridad por defecto (50) y soporte para paginación bajo demanda.
   */
  async getCompletedTasks(userId, options = {}) {
    if (!userId) return [];
    const limit = options.limit !== undefined ? options.limit : 50;
    const page = options.page || 1;
    const offset = options.offset !== undefined ? options.offset : (page - 1) * limit;

    try {
      let query = supabase
        .from('assignments')
        .select(TASK_JOINED_PROJECTION)
        .eq('user_id', userId)
        .in('status', ['entregado', 'ENTREGADO'])
        .order('created_at', { ascending: false });

      if (limit > 0) {
        if (typeof query.range === 'function') {
          query = query.range(offset, offset + limit - 1);
        } else if (typeof query.limit === 'function') {
          query = query.limit(limit);
        }
      }

      const { data, error } = await query;
      if (error) {
        console.warn("ALFA_FETCH_WARNING (completed assignments):", error.message);
        const local = getLocalTasks(userId);
        return local.filter(t => t.status === 'entregado' || t.status === 'ENTREGADO');
      }

      return data || [];
    } catch (err) {
      console.warn("Excepción obteniendo tareas completadas:", err?.message);
      const local = getLocalTasks(userId);
      return local.filter(t => t.status === 'entregado' || t.status === 'ENTREGADO');
    }
  },

  /**
   * Obtiene el detalle completo de una tarea individual incluyendo subtasks y notas.
   */
  async getTaskById(id, userId) {
    if (!id) return null;
    try {
      let query = supabase
        .from('assignments')
        .select(TASK_DETAIL_PROJECTION)
        .eq('id', id);
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query.single();
      if (error) {
        const local = getLocalTasks(userId);
        return local.find(t => t.id === id) || null;
      }
      return data;
    } catch {
      const local = getLocalTasks(userId);
      return local.find(t => t.id === id) || null;
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

    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (isOffline) {
      taskData.pending_sync = true;
    }

    // 1. Guardado inmediato local-first
    if (activeUserId) {
      const existing = getLocalTasks(activeUserId);
      saveLocalTasks(activeUserId, [taskData, ...existing.filter(t => t.id !== taskData.id)]);
    }

    // Si está offline, omitir la petición a Supabase
    if (isOffline) {
      return taskData;
    }

    // 2. Persistencia en Supabase
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert([taskData])
        .select(TASK_JOINED_PROJECTION);
      
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
            .select(TASK_JOINED_PROJECTION);
          
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
      taskData.pending_sync = true;
      if (activeUserId) {
        const current = getLocalTasks(activeUserId);
        saveLocalTasks(activeUserId, current.map(t => t.id === taskId ? { ...t, pending_sync: true } : t));
      }
      return taskData;
    }
  },

  async updateTask(id, updates, userId) {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (isOffline) {
      if (userId) {
        const local = getLocalTasks(userId);
        const idx = local.findIndex(t => t.id === id);
        if (idx !== -1) {
          local[idx] = { ...local[idx], ...updates, pending_sync: true };
          saveLocalTasks(userId, local);
          return local[idx];
        }
      }
      const storage = getStorage();
      if (storage) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            try {
              const tasks = JSON.parse(storage.getItem(key) || '[]');
              const idx = tasks.findIndex(t => t.id === id);
              if (idx !== -1) {
                tasks[idx] = { ...tasks[idx], ...updates, pending_sync: true };
                storage.setItem(key, JSON.stringify(tasks));
                break;
              }
            } catch {
              // ignore
            }
          }
        }
      }
      return { id, ...updates, pending_sync: true };
    }

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
        .select(TASK_JOINED_PROJECTION);
      
      if (error) {
        if (error.message && (error.message.includes('priority') || error.message.includes('institution'))) {
          delete cloudMapping.priority;
          delete cloudMapping.institution;
          const { data: retryData, error: retryError } = await supabase
            .from('assignments')
            .update(cloudMapping)
            .eq('id', id)
            .select(TASK_JOINED_PROJECTION);
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
  },

  async syncPendingTasks(userId) {
    if (!userId || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      return { syncedCount: 0 };
    }
    const localTasks = getLocalTasks(userId);
    const pending = localTasks.filter(t => t.pending_sync === true);
    if (!pending.length) return { syncedCount: 0 };

    let syncedCount = 0;
    const updatedTasks = [...localTasks];

    for (const task of pending) {
      try {
        const payload = {
          id: task.id,
          title: task.title,
          course_id: task.course_id || null,
          start_date: task.start_date || null,
          deadline: task.deadline || null,
          status: task.status || 'sin entregar',
          user_id: task.user_id || userId,
          priority: task.priority || 'media',
          institution: task.institution || null,
          subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
          task_notes: task.task_notes || ''
        };

        const { error } = await supabase
          .from('assignments')
          .upsert([payload]);

        if (!error) {
          syncedCount++;
          const idx = updatedTasks.findIndex(t => t.id === task.id);
          if (idx !== -1) {
            updatedTasks[idx] = { ...updatedTasks[idx], pending_sync: false };
          }
        }
      } catch (err) {
        console.warn('[tasksService] Error sincronizando tarea:', task.id, err?.message);
      }
    }

    saveLocalTasks(userId, updatedTasks);
    return { syncedCount };
  }
};

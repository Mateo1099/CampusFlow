import { supabase } from './supabaseClient';

/**
 * REGLAS DE ORO DE BASE DE DATOS (REPARACIÓN FINAL):
 * 1. Tabla Trabajos: 'assignments'
 * 2. Tabla Materias: 'courses' (Revertido de subjects)
 * 3. Relación: assignments.course_id -> courses.id
 */

export const tasksService = {
  async getTasks(userId) {
    if (!userId) return [];
    
    // TABLA ACTUALIZADA: assignments join courses
    const { data, error } = await supabase
      .from('assignments')
      .select('*, courses(name, color)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error al obtener trabajos (Check courses relation):", error.message);
      throw error;
    }
    return data || [];
  },

  async createTask(userId, task) {
    // MAPEAMOS A LOS NOMBRES DE COLUMNAS DE LA TABLA 'assignments'
    const taskData = { 
      title: task.title,
      course_id: task.course_id || task.courseId || null,
      start_date: task.start_date || task.startDate || null,
      deadline: task.deadline || task.dueDate || null,
      status: 'sin entregar', // REGLA DE ORO: MINÚSCULAS
      user_id: userId 
    };

    const { data, error } = await supabase
      .from('assignments')
      .insert([taskData])
      .select();
    
    if (error) {
      console.error("ALFA_SAVE_ERROR (assignments):", error);
      throw error;
    }
    return data[0];
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
        'done': 'entregado'
      };
      cloudMapping.status = statusMap[rawStatus] || rawStatus;
    }

    const { data, error } = await supabase
      .from('assignments')
      .update(cloudMapping)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error("ALFA_SAVE_ERROR (Update):", error);
      throw error;
    }
    return data[0];
  },

  async deleteTask(id) {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

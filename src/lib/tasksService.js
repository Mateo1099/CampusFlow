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
    // BLINDAJE FINAL: Solo estados oficiales
    const taskData = { 
      title: task.title,
      course_id: task.courseId || null,
      start_date: task.startDate || null,
      deadline: task.deadline || null,
      status: 'SIN ENTREGAR', 
      user_id: userId 
    };

    console.log("ALFA_VERIFY: Enviando objeto a Supabase ->", taskData);

    const { data, error } = await supabase
      .from('assignments')
      .insert([taskData])
      .select();
    
    if (error) {
      console.error("ERROR DE INTEGRIDAD (Check Constraint):", error);
      throw error;
    }
    return data[0];
  },

  async updateTask(id, updates) {
    // BLINDAJE 23502: Solo mapeamos y enviamos los campos que REALMENTE vienen en el update
    const cloudMapping = {};
    
    if (updates.title !== undefined) cloudMapping.title = updates.title;
    if (updates.courseId !== undefined) cloudMapping.course_id = updates.courseId;
    else if (updates.course_id !== undefined) cloudMapping.course_id = updates.course_id;
    
    if (updates.startDate !== undefined) cloudMapping.start_date = updates.startDate;
    else if (updates.start_date !== undefined) cloudMapping.start_date = updates.start_date;
    
    if (updates.deadline !== undefined) cloudMapping.deadline = updates.deadline;
    else if (updates.due_date !== undefined) cloudMapping.deadline = updates.due_date;

    if (updates.status !== undefined) {
      const statusMap = {
        'todo': 'SIN ENTREGAR',
        'PENDIENTE': 'SIN ENTREGAR',
        'EN PROCESO': 'EN PROCESO',
        'REVISIÓN': 'REVISIÓN',
        'ENTREGADO': 'ENTREGADO',
        'submitted': 'ENTREGADO',
        'done': 'ENTREGADO'
      };
      cloudMapping.status = statusMap[updates.status] || updates.status;
    }

    console.log("ALFA_UPDATE: Enviando PATCH parcial a Supabase ->", cloudMapping);

    const { data, error } = await supabase
      .from('assignments')
      .update(cloudMapping)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error("ERROR EN PATCH (Supabase):", error);
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

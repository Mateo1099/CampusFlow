import { supabase } from '../lib/supabaseClient';

/**
 * Servicio desacoplado para gestión de subtareas / ejercicios y notas de estudio
 * sobre la tabla 'assignments' en Supabase.
 */

/**
 * Normaliza y valida una lista de subtareas asegurando la estructura JSONB esperada:
 * [{ id: string, text: string, completed: boolean }]
 * 
 * @param {Array} subtasks
 * @returns {Array}
 */
export function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      id: String(item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `st_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)),
      text: typeof item.text === 'string' ? item.text.trim() : '',
      completed: Boolean(item.completed)
    }))
    .filter(item => item.text.length > 0);
}

export const assignmentService = {
  /**
   * Actualiza el desglose de subtareas/ejercicios de una tarea en assignments.subtasks.
   * 
   * @param {string|number} assignmentId - ID de la tarea
   * @param {Array<{ id: string, text: string, completed: boolean }>} subtasks - Lista de subtareas
   * @returns {Promise<Object>} Tarea actualizada
   */
  async updateSubtasks(assignmentId, subtasks) {
    if (!assignmentId) {
      throw new Error('assignmentId es requerido para actualizar las subtareas');
    }

    const cleanSubtasks = normalizeSubtasks(subtasks);

    const { data, error } = await supabase
      .from('assignments')
      .update({ subtasks: cleanSubtasks })
      .eq('id', assignmentId)
      .select('*, courses(name, color)');

    if (error) {
      console.error('[assignmentService] Error al actualizar subtasks:', error.message || error);
      throw error;
    }

    return data?.[0] || null;
  },

  /**
   * Actualiza las notas rápidas/estudio de una tarea en assignments.task_notes.
   * 
   * @param {string|number} assignmentId - ID de la tarea
   * @param {string} notes - Contenido en texto plano o Markdown
   * @returns {Promise<Object>} Tarea actualizada
   */
  async updateTaskNotes(assignmentId, notes) {
    if (!assignmentId) {
      throw new Error('assignmentId es requerido para actualizar las notas');
    }

    const cleanNotes = typeof notes === 'string' ? notes : (notes == null ? '' : String(notes));

    const { data, error } = await supabase
      .from('assignments')
      .update({ task_notes: cleanNotes })
      .eq('id', assignmentId)
      .select('*, courses(name, color)');

    if (error) {
      console.error('[assignmentService] Error al actualizar task_notes:', error.message || error);
      throw error;
    }

    return data?.[0] || null;
  },

  /**
   * Obtiene los detalles completos de una tarea incluyendo subtasks y task_notes.
   * 
   * @param {string|number} assignmentId
   * @returns {Promise<Object>}
   */
  async getAssignmentDetails(assignmentId) {
    if (!assignmentId) {
      throw new Error('assignmentId es requerido');
    }

    const { data, error } = await supabase
      .from('assignments')
      .select('*, courses(name, color)')
      .eq('id', assignmentId)
      .single();

    if (error) {
      console.error('[assignmentService] Error al obtener detalles de la tarea:', error.message || error);
      throw error;
    }

    return data;
  }
};

export const updateSubtasks = assignmentService.updateSubtasks;
export const updateTaskNotes = assignmentService.updateTaskNotes;
export const getAssignmentDetails = assignmentService.getAssignmentDetails;

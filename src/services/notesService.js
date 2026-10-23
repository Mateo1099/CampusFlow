import { supabase } from '../lib/supabaseClient';
import { sanitizeNoteInput } from '../lib/sanitize';

/**
 * notesService — Servicio centralizado y resiliente para el Módulo de Apuntes
 * Soporta persistencia local-first con sincronización a Supabase y fallback a localStorage.
 */

const STORAGE_PREFIX = 'campusflow_notes_';
const MIGRATION_STORAGE_KEY_PREFIX = 'campusflow_tasks_notes_migrated_';

function getStorageKey(userId) {
  return `${STORAGE_PREFIX}${userId || 'guest'}`;
}

export function getMigrationStorageKey(userId) {
  return `${MIGRATION_STORAGE_KEY_PREFIX}${userId || 'guest'}`;
}

export function hasMigratedTasksNotes(userId) {
  try {
    const storage = getStorage();
    if (!storage) return false;
    return storage.getItem(getMigrationStorageKey(userId)) === 'true';
  } catch {
    return false;
  }
}

export function markTasksNotesMigrated(userId) {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(getMigrationStorageKey(userId), 'true');
  } catch (err) {
    console.warn('[notesService] Error guardando flag de migración:', err);
  }
}

export function resetTasksNotesMigration(userId) {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.removeItem(getMigrationStorageKey(userId));
  } catch (err) {
    console.warn('[notesService] Error reseteando flag de migración:', err);
  }
}

export function normalizeNote(raw, userId) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw.id || (typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

  return {
    id: String(id),
    user_id: raw.user_id || userId || null,
    course_id: raw.course_id || null,
    title: sanitizeNoteInput(raw.title || '').trim() || 'Apunte sin título',
    content: typeof raw.content === 'string' ? sanitizeNoteInput(raw.content) : '',
    tags: Array.isArray(raw.tags) ? raw.tags.map(t => sanitizeNoteInput(String(t)).trim()).filter(Boolean) : [],
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

function getInitialSeedNotes(userId) {
  const now = new Date().toISOString();
  return [
    {
      id: 'note-seed-1',
      user_id: userId,
      course_id: 'course-arch-101',
      title: 'Principios de Arquitectura Hexagonal y Microservicios',
      content: '## Resumen de Clase\n- Desacoplar el dominio central de los adaptadores de infraestructura.\n- Patrón Repository para abstraer bases de datos (Postgres, Dynamo, Mongo).\n- Validaciones OWASP y seguridad en endpoints REST y GraphQL.',
      tags: ['Arquitectura', 'Diseño', 'Backend'],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'note-seed-2',
      user_id: userId,
      course_id: null,
      title: 'Técnicas de Estudio Activo y Fórmulas Clave',
      content: '### Método Feynman & Pomodoro\n1. Explicar el concepto en lenguaje simple sin tecnicismos.\n2. Identificar lagunas conceptuales y consultar el libro guía.\n3. Bloques de 25 min de enfoque puro sin notificaciones.',
      tags: ['Técnicas', 'Productividad'],
      created_at: now,
      updated_at: now,
    }
  ];
}

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

function loadLocalNotes(userId) {
  try {
    const storage = getStorage();
    if (!storage) return getInitialSeedNotes(userId);
    const raw = storage.getItem(getStorageKey(userId));
    if (!raw) {
      const seeds = getInitialSeedNotes(userId);
      saveLocalNotes(userId, seeds);
      return seeds;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(n => normalizeNote(n, userId)).filter(Boolean);
  } catch (err) {
    console.warn('[notesService] Error leyendo localStorage:', err);
    return getInitialSeedNotes(userId);
  }
}

function saveLocalNotes(userId, notesList) {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(getStorageKey(userId), JSON.stringify(notesList));
  } catch (err) {
    console.warn('[notesService] Error escribiendo localStorage:', err);
  }
}

export const notesService = {
  /**
   * Migración inicial pasiva de datos:
   * Si detecta tareas existentes con notas almacenadas en tasks/assignments, genera automáticamente
   * un apunte correspondiente en la materia vinculada para que el usuario no pierda información previa.
   * Se ejecuta de forma segura y no bloqueante.
   */
  async migrateNotesFromTasks(userId, providedTasks = null) {
    const activeUserId = userId || 'guest';
    let tasksToInspect = Array.isArray(providedTasks) ? providedTasks : null;

    // 1. Si no se proveyeron tareas directamente, buscarlas en almacenamiento local o caché
    if (!tasksToInspect) {
      const storage = getStorage();
      if (storage) {
        const candidateKeys = [
          `ds:tasks:${activeUserId}`,
          'tasks',
          `campusflow_tasks_${activeUserId}`,
          'campusflow_tasks'
        ];

        for (const key of candidateKeys) {
          try {
            const raw = storage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              const candidate = parsed?.data && Array.isArray(parsed.data) ? parsed.data : parsed;
              if (Array.isArray(candidate) && candidate.length > 0) {
                tasksToInspect = candidate;
                break;
              }
            }
          } catch {
            // Continuar con la siguiente clave
          }
        }
      }
    }

    // 2. Si aún no hay tareas y existe supabase + usuario real, consultar tabla assignments y tasks
    if (!tasksToInspect && userId && userId !== 'guest') {
      try {
        const { data: assignmentsData, error: asgError } = await supabase
          .from('assignments')
          .select('id, title, course_id, task_notes, user_id, created_at')
          .eq('user_id', userId);

        if (!asgError && Array.isArray(assignmentsData) && assignmentsData.length > 0) {
          tasksToInspect = assignmentsData;
        } else {
          const { data: fallbackTasks, error: fbError } = await supabase
            .from('tasks')
            .select('id, title, course_id, task_notes, notes, user_id, created_at')
            .eq('user_id', userId);

          if (!fbError && Array.isArray(fallbackTasks)) {
            tasksToInspect = fallbackTasks;
          }
        }
      } catch {
        // Fallback silencioso
      }
    }

    if (!Array.isArray(tasksToInspect) || tasksToInspect.length === 0) {
      markTasksNotesMigrated(activeUserId);
      return [];
    }

    // 3. Filtrar tareas que tengan notas almacenadas no vacías
    const tasksWithNotes = tasksToInspect.filter(task => {
      if (!task || typeof task !== 'object') return false;
      const noteContent = typeof task.task_notes === 'string'
        ? task.task_notes
        : (typeof task.notes === 'string' ? task.notes : (typeof task.taskNotes === 'string' ? task.taskNotes : ''));
      return Boolean(noteContent && noteContent.trim().length > 0);
    });

    if (tasksWithNotes.length === 0) {
      markTasksNotesMigrated(activeUserId);
      return [];
    }

    // 4. Obtener notas actuales para evitar duplicaciones
    const currentNotes = loadLocalNotes(activeUserId);
    const existingTitles = new Set(currentNotes.map(n => (n.title || '').trim().toLowerCase()));
    const existingContents = new Set(currentNotes.map(n => (n.content || '').trim()));

    const newlyCreatedNotes = [];

    for (const task of tasksWithNotes) {
      const rawNoteContent = typeof task.task_notes === 'string'
        ? task.task_notes
        : (typeof task.notes === 'string' ? task.notes : task.taskNotes);
      const cleanContent = sanitizeNoteInput(rawNoteContent || '').trim();
      const taskTitle = (task.title || 'Tarea').trim();
      const targetTitle = `Apuntes: ${taskTitle}`;

      // Si ya existe un apunte con el mismo título o contenido idéntico, no duplicar
      if (existingTitles.has(targetTitle.toLowerCase()) || existingContents.has(cleanContent)) {
        continue;
      }

      const generatedNote = normalizeNote({
        id: `note_migrated_${task.id || Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        user_id: activeUserId,
        course_id: task.course_id || task.courseId || null,
        title: targetTitle,
        content: cleanContent,
        tags: ['Migrado de Tarea', 'Apuntes'],
        created_at: task.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, activeUserId);

      newlyCreatedNotes.push(generatedNote);
      existingTitles.add(targetTitle.toLowerCase());
      existingContents.add(cleanContent);
    }

    if (newlyCreatedNotes.length > 0) {
      const mergedNotes = [...newlyCreatedNotes, ...currentNotes];
      saveLocalNotes(activeUserId, mergedNotes);

      // Sincronizar en segundo plano con Supabase si está disponible
      if (userId && userId !== 'guest') {
        try {
          await supabase.from('study_notes').insert(newlyCreatedNotes);
        } catch {
          // Fallback silencioso
        }
      }
    }

    markTasksNotesMigrated(activeUserId);
    return newlyCreatedNotes;
  },

  /**
   * Obtiene la lista completa de apuntes del usuario, ordenados por fecha de actualización descendente.
   * Ejecuta la migración pasiva inicial si el usuario aún no la ha completado.
   */
  async getNotes(userId) {
    const activeUserId = userId || 'guest';

    // Migración pasiva automática sin bloquear
    if (!hasMigratedTasksNotes(activeUserId)) {
      try {
        await this.migrateNotesFromTasks(activeUserId);
      } catch (err) {
        console.warn('[notesService] Migración pasiva encontró un inconveniente no crítico:', err);
      }
    }

    if (!userId) {
      return loadLocalNotes('guest');
    }

    try {
      // Intentar fetch desde Supabase si la tabla study_notes existe
      const { data, error } = await supabase
        .from('study_notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const normalized = data.map(n => normalizeNote(n, userId)).filter(Boolean);
        saveLocalNotes(userId, normalized);
        return normalized;
      }
    } catch {
      // Fallback transparente a almacenamiento local
    }

    return loadLocalNotes(userId);
  },

  /**
   * Crea un nuevo apunte para el usuario.
   */
  async createNote(userId, noteData) {
    const newNote = normalizeNote({
      ...noteData,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, userId);

    // Guardar en almacenamiento local inmediato
    const existing = loadLocalNotes(userId);
    const updated = [newNote, ...existing];
    saveLocalNotes(userId, updated);

    // Sincronizar en segundo plano con Supabase si está disponible
    if (userId) {
      try {
        await supabase
          .from('study_notes')
          .insert([newNote]);
      } catch {
        // Fallback silencioso
      }
    }

    return newNote;
  },

  /**
   * Actualiza un apunte existente.
   */
  async updateNote(id, updates, userId) {
    if (!id) throw new Error('[notesService] id es requerido para actualizar');

    const existing = loadLocalNotes(userId);
    let updatedNote = null;

    const nextList = existing.map(item => {
      if (item.id === String(id)) {
        updatedNote = normalizeNote({
          ...item,
          ...updates,
          updated_at: new Date().toISOString(),
        }, userId);
        return updatedNote;
      }
      return item;
    });

    if (!updatedNote) {
      // Si no existía localmente, crear con los updates
      updatedNote = normalizeNote({ id, ...updates, updated_at: new Date().toISOString() }, userId);
      nextList.unshift(updatedNote);
    }

    saveLocalNotes(userId, nextList);

    if (userId) {
      try {
        await supabase
          .from('study_notes')
          .update({
            title: updatedNote.title,
            content: updatedNote.content,
            course_id: updatedNote.course_id,
            tags: updatedNote.tags,
            updated_at: updatedNote.updated_at,
          })
          .eq('id', id);
      } catch {
        // Fallback silencioso
      }
    }

    return updatedNote;
  },

  /**
   * Elimina un apunte por su ID.
   */
  async deleteNote(id, userId) {
    if (!id) throw new Error('[notesService] id es requerido para eliminar');

    const existing = loadLocalNotes(userId);
    const nextList = existing.filter(n => n.id !== String(id));
    saveLocalNotes(userId, nextList);

    if (userId) {
      try {
        await supabase
          .from('study_notes')
          .delete()
          .eq('id', id);
      } catch {
        // Fallback silencioso
      }
    }

    return true;
  }
};

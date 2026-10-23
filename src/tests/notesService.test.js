import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabaseClient.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}));

import { 
  notesService, 
  normalizeNote, 
  hasMigratedTasksNotes, 
  resetTasksNotesMigration 
} from '../services/notesService.js';

describe('notesService — Módulo de Apuntes de Estudio', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: vi.fn((key) => (Object.prototype.hasOwnProperty.call(mockStorage, key) ? mockStorage[key] : null)),
      setItem: vi.fn((key, value) => {
        mockStorage[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      })
    };
    globalThis.localStorage = storageMock;
    if (typeof window !== 'undefined') {
      window.localStorage = storageMock;
    }
    vi.clearAllMocks();
  });

  describe('normalizeNote', () => {
    it('retorna null si el input no es un objeto válido', () => {
      expect(normalizeNote(null, 'u-1')).toBeNull();
      expect(normalizeNote(undefined, 'u-1')).toBeNull();
      expect(normalizeNote('invalid', 'u-1')).toBeNull();
    });

    it('asigna valores por defecto coherentes para notas incompletas', () => {
      const normalized = normalizeNote({}, 'u-1');
      expect(normalized).toBeDefined();
      expect(typeof normalized.id).toBe('string');
      expect(normalized.user_id).toBe('u-1');
      expect(normalized.title).toBe('Apunte sin título');
      expect(normalized.content).toBe('');
      expect(normalized.tags).toEqual([]);
      expect(normalized.created_at).toBeDefined();
      expect(normalized.updated_at).toBeDefined();
    });

    it('respeta propiedades provistas cuando son válidas', () => {
      const raw = {
        id: 'n-123',
        user_id: 'u-2',
        course_id: 'course-math-101',
        title: 'Cálculo Diferencial',
        content: 'Derivadas de funciones trigonométricas',
        tags: ['Cálculo', 'Matemáticas']
      };
      const normalized = normalizeNote(raw, 'u-2');
      expect(normalized.id).toBe('n-123');
      expect(normalized.course_id).toBe('course-math-101');
      expect(normalized.title).toBe('Cálculo Diferencial');
      expect(normalized.content).toBe('Derivadas de funciones trigonométricas');
      expect(normalized.tags).toEqual(['Cálculo', 'Matemáticas']);
    });
  });

  describe('CRUD de Apuntes', () => {
    it('getNotes inicializa con notas de bienvenida si el almacenamiento está vacío', async () => {
      const notes = await notesService.getNotes('u-test');
      expect(Array.isArray(notes)).toBe(true);
      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0].title).toBeDefined();
    });

    it('createNote agrega un nuevo apunte al inicio de la lista y lo persiste', async () => {
      const created = await notesService.createNote('u-test', {
        title: 'Algoritmos y Estructuras de Datos',
        content: 'Árboles binarios de búsqueda y balanceo AVL',
        course_id: 'course-cs-201',
        tags: ['CS', 'Algoritmos']
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('Algoritmos y Estructuras de Datos');
      expect(created.course_id).toBe('course-cs-201');

      const allNotes = await notesService.getNotes('u-test');
      expect(allNotes[0].id).toBe(created.id);
      expect(allNotes[0].title).toBe('Algoritmos y Estructuras de Datos');
    });

    it('updateNote modifica campos específicos y actualiza el timestamp updated_at', async () => {
      const created = await notesService.createNote('u-test', {
        title: 'Física Clásica',
        content: 'Leyes de Newton'
      });

      const updated = await notesService.updateNote(created.id, {
        title: 'Física Clásica: Cinemática y Dinámica',
        content: 'Primera y segunda ley de Newton con fricción'
      }, 'u-test');

      expect(updated.title).toBe('Física Clásica: Cinemática y Dinámica');
      expect(updated.content).toBe('Primera y segunda ley de Newton con fricción');

      const allNotes = await notesService.getNotes('u-test');
      const found = allNotes.find(n => n.id === created.id);
      expect(found.title).toBe('Física Clásica: Cinemática y Dinámica');
    });

    it('updateNote lanza error si no se proporciona id', async () => {
      await expect(notesService.updateNote(null, {}, 'u-test'))
        .rejects.toThrow(/id es requerido/);
    });

    it('deleteNote elimina el apunte especificado', async () => {
      const created = await notesService.createNote('u-test', {
        title: 'Nota Temporal para Borrar',
        content: 'Contenido descartable'
      });

      const initialNotes = await notesService.getNotes('u-test');
      expect(initialNotes.some(n => n.id === created.id)).toBe(true);

      const success = await notesService.deleteNote(created.id, 'u-test');
      expect(success).toBe(true);

      const finalNotes = await notesService.getNotes('u-test');
      expect(finalNotes.some(n => n.id === created.id)).toBe(false);
    });

    it('deleteNote lanza error si no se proporciona id', async () => {
      await expect(notesService.deleteNote(null, 'u-test'))
        .rejects.toThrow(/id es requerido/);
    });
  });

  describe('Migración y Resiliencia de Datos (migrateNotesFromTasks)', () => {
    it('detecta tareas con notas y genera automáticamente un apunte vinculado a la materia', async () => {
      const mockTasks = [
        {
          id: 'tsk-001',
          title: 'Taller de Cálculo Integral',
          course_id: 'crs-math-301',
          task_notes: '# Fórmulas clave\n- Integración por partes: u*v - int(v*du)\n- Sustitución trigonométrica',
          user_id: 'u-migr-1'
        },
        {
          id: 'tsk-002',
          title: 'Laboratorio de Química',
          course_id: 'crs-chem-101',
          task_notes: '', // vacía, no debe migrar
          user_id: 'u-migr-1'
        }
      ];

      const migrated = await notesService.migrateNotesFromTasks('u-migr-1', mockTasks);
      expect(migrated).toHaveLength(1);
      expect(migrated[0].title).toBe('Apuntes: Taller de Cálculo Integral');
      expect(migrated[0].course_id).toBe('crs-math-301');
      expect(migrated[0].content).toContain('Integración por partes');
      expect(migrated[0].tags).toContain('Migrado de Tarea');
      expect(hasMigratedTasksNotes('u-migr-1')).toBe(true);

      // Verificar que aparezca en getNotes
      const allNotes = await notesService.getNotes('u-migr-1');
      const found = allNotes.find(n => n.id === migrated[0].id);
      expect(found).toBeDefined();
      expect(found.title).toBe('Apuntes: Taller de Cálculo Integral');
    });

    it('no duplica notas si ya fueron migradas previamente o si tienen el mismo contenido', async () => {
      const mockTasks = [
        {
          id: 'tsk-003',
          title: 'Ensayo de Filosofía',
          course_id: 'crs-phil-102',
          task_notes: 'Crítica de la razón pura',
          user_id: 'u-migr-2'
        }
      ];

      const firstPass = await notesService.migrateNotesFromTasks('u-migr-2', mockTasks);
      expect(firstPass).toHaveLength(1);

      // Resetear flag para forzar re-evaluación
      resetTasksNotesMigration('u-migr-2');
      const secondPass = await notesService.migrateNotesFromTasks('u-migr-2', mockTasks);
      expect(secondPass).toHaveLength(0); // Evitó duplicados
    });

    it('ejecuta la migración pasiva automáticamente en getNotes si no se había completado', async () => {
      // Configurar tareas en localStorage bajo una clave conocida
      const existingTasks = [
        {
          id: 'tsk-auto-009',
          title: 'Proyecto de Robótica',
          course_id: 'crs-robotics-501',
          task_notes: 'Cinemática directa e inversa con matrices DH',
          user_id: 'u-migr-3'
        }
      ];
      mockStorage['tasks'] = JSON.stringify(existingTasks);

      expect(hasMigratedTasksNotes('u-migr-3')).toBe(false);

      const notes = await notesService.getNotes('u-migr-3');
      expect(hasMigratedTasksNotes('u-migr-3')).toBe(true);
      const migratedNote = notes.find(n => n.title === 'Apuntes: Proyecto de Robótica');
      expect(migratedNote).toBeDefined();
      expect(migratedNote.course_id).toBe('crs-robotics-501');
    });
  });
});

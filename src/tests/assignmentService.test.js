import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabaseClient.js', () => ({
  supabase: { from: vi.fn() }
}));

import { supabase } from '../lib/supabaseClient.js';
import { 
  assignmentService, 
  normalizeSubtasks, 
  updateSubtasks, 
  updateTaskNotes, 
  getAssignmentDetails 
} from '../services/assignmentService.js';

function createQueryMock(result) {
  const query = {
    select: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected)
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('assignmentService — Desglose de Ejercicios y Bloc de Notas', () => {
  describe('normalizeSubtasks', () => {
    it('retorna array vacío si el input no es un arreglo', () => {
      expect(normalizeSubtasks(null)).toEqual([]);
      expect(normalizeSubtasks(undefined)).toEqual([]);
      expect(normalizeSubtasks('no-array')).toEqual([]);
      expect(normalizeSubtasks({})).toEqual([]);
    });

    it('filtra elementos nulos o vacíos y normaliza estructura', () => {
      const input = [
        null,
        undefined,
        { id: 'st-1', text: '  Ejercicio 1: Derivadas  ', completed: false },
        { id: 'st-2', text: '', completed: true }, // texto vacío -> filtrado
        { text: 'Ejercicio 2: Integrales', completed: true }, // sin id -> genera id
      ];

      const result = normalizeSubtasks(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'st-1',
        text: 'Ejercicio 1: Derivadas',
        completed: false
      });
      expect(result[1].text).toBe('Ejercicio 2: Integrales');
      expect(result[1].completed).toBe(true);
      expect(typeof result[1].id).toBe('string');
      expect(result[1].id.length).toBeGreaterThan(0);
    });
  });

  describe('updateSubtasks', () => {
    it('falla con error explicativo si assignmentId no se proporciona', async () => {
      await expect(assignmentService.updateSubtasks(null, []))
        .rejects.toThrow(/assignmentId es requerido/);
      await expect(updateSubtasks('', []))
        .rejects.toThrow(/assignmentId es requerido/);
    });

    it('actualiza correctamente la columna subtasks en la tabla assignments', async () => {
      const mockUpdated = {
        id: 'asg-101',
        title: 'Taller de Cálculo',
        subtasks: [
          { id: 'st-1', text: 'Ejercicio 1', completed: true },
          { id: 'st-2', text: 'Ejercicio 2', completed: false }
        ]
      };

      const query = createQueryMock({ data: [mockUpdated], error: null });
      supabase.from.mockReturnValue(query);

      const result = await assignmentService.updateSubtasks('asg-101', [
        { id: 'st-1', text: 'Ejercicio 1', completed: true },
        { id: 'st-2', text: 'Ejercicio 2', completed: false }
      ]);

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(query.update).toHaveBeenCalledWith({
        subtasks: [
          { id: 'st-1', text: 'Ejercicio 1', completed: true },
          { id: 'st-2', text: 'Ejercicio 2', completed: false }
        ]
      });
      expect(query.eq).toHaveBeenCalledWith('id', 'asg-101');
      expect(result).toEqual(mockUpdated);
    });

    it('propaga error si Supabase falla en el update', async () => {
      const dbError = new Error('Database connection failed');
      const query = createQueryMock({ data: null, error: dbError });
      supabase.from.mockReturnValue(query);

      await expect(assignmentService.updateSubtasks('asg-err', []))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('updateTaskNotes', () => {
    it('falla con error explicativo si assignmentId no se proporciona', async () => {
      await expect(assignmentService.updateTaskNotes(null, 'notas'))
        .rejects.toThrow(/assignmentId es requerido/);
      await expect(updateTaskNotes('', 'notas'))
        .rejects.toThrow(/assignmentId es requerido/);
    });

    it('actualiza correctamente la columna task_notes en la tabla assignments', async () => {
      const mockUpdated = {
        id: 'asg-202',
        title: 'Laboratorio de Química',
        task_notes: '# Apuntes de Estudio\n- Reactivo A: 10ml\n- Temperatura: 25C'
      };

      const query = createQueryMock({ data: [mockUpdated], error: null });
      supabase.from.mockReturnValue(query);

      const notesContent = '# Apuntes de Estudio\n- Reactivo A: 10ml\n- Temperatura: 25C';
      const result = await assignmentService.updateTaskNotes('asg-202', notesContent);

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(query.update).toHaveBeenCalledWith({ task_notes: notesContent });
      expect(query.eq).toHaveBeenCalledWith('id', 'asg-202');
      expect(result).toEqual(mockUpdated);
    });

    it('maneja valores nulos o vacíos convirtiéndolos a string de manera segura', async () => {
      const query = createQueryMock({ data: [{ id: 'asg-203', task_notes: '' }], error: null });
      supabase.from.mockReturnValue(query);

      await updateTaskNotes('asg-203', null);
      expect(query.update).toHaveBeenCalledWith({ task_notes: '' });
    });
  });

  describe('getAssignmentDetails', () => {
    it('falla si assignmentId no se proporciona', async () => {
      await expect(getAssignmentDetails(null))
        .rejects.toThrow(/assignmentId es requerido/);
    });

    it('obtiene los datos de la tarea con courses asociados', async () => {
      const mockData = { id: 'asg-301', title: 'Ensayo', subtasks: [], task_notes: '' };
      const query = createQueryMock({ data: mockData, error: null });
      supabase.from.mockReturnValue(query);

      const res = await getAssignmentDetails('asg-301');
      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(query.eq).toHaveBeenCalledWith('id', 'asg-301');
      expect(res).toEqual(mockData);
    });
  });
});

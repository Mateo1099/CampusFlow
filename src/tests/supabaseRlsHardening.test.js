import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { coursesService } from '../lib/coursesService';
import { tasksService } from '../lib/tasksService';
import { notesService } from '../services/notesService';
import { saveStudySession } from '../services/studySessionService';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
  };

  return {
    supabase: {
      from: vi.fn(() => queryBuilder),
      storage: {
        from: vi.fn(() => ({
          download: vi.fn().mockResolvedValue({ data: null, error: null }),
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://mock.url' } })
        }))
      }
    }
  };
});

describe('Auditoría y Blindaje RLS de Supabase en CampusFlow', () => {
  const sqlPath = path.resolve(process.cwd(), 'supabase/schema_rls_hardening.sql');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Verificación Estructural del Script SQL (supabase/schema_rls_hardening.sql)', () => {
    it('el archivo supabase/schema_rls_hardening.sql existe en el repositorio', () => {
      expect(fs.existsSync(sqlPath)).toBe(true);
    });

    it('habilita ROW LEVEL SECURITY en todas las tablas requeridas', () => {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      const requiredTables = [
        'profiles',
        'courses',
        'subjects',
        'assignments',
        'tasks',
        'study_notes',
        'notes',
        'study_sessions',
        'habits',
        'habit_logs',
        'planners',
        'planner_blocks',
        'user_settings',
        'user_security',
        'analytics_snapshots',
        'assignment_alert_log',
        'app_secrets'
      ];

      for (const table of requiredTables) {
        const regex = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY|target_table IN|tbls text\\[\\] := ARRAY\\[[\\s\\S]*?'${table}'`, 'i');
        expect(regex.test(sql), `Falta habilitación de RLS para ${table}`).toBe(true);
      }
    });

    it('aplica la condición estricta auth.uid() = id en profiles para SELECT, INSERT y UPDATE', () => {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      expect(sql).toContain('cf_profiles_select_own');
      expect(sql).toContain('USING (auth.uid() = id)');
      expect(sql).toContain('cf_profiles_insert_own');
      expect(sql).toContain('WITH CHECK (auth.uid() = id)');
      expect(sql).toContain('cf_profiles_update_own');
    });

    it('aplica la condición estricta auth.uid() = user_id en tablas de usuario', () => {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      expect(sql).toContain('auth.uid() = user_id');
      expect(sql).toContain('WITH CHECK (auth.uid() = user_id)');
    });

    it('garantiza la denegación total a tablas de sistema sensibles (app_secrets)', () => {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      expect(sql).toContain('app_secrets');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    });

    it('es idempotente conteniendo DROP POLICY IF EXISTS y CREATE TABLE IF NOT EXISTS', () => {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      expect(sql).toContain('DROP POLICY IF EXISTS');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION public.handle_new_user()');
    });
  });

  describe('2. Verificación de Inserciones Seguras en Servicios Cliente (user_id explícito)', () => {
    it('coursesService.createCourse exige y asocia explícitamente el activeUserId', async () => {
      const mockQuery = supabase.from('courses');
      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'crs-1', user_id: 'usr-123', name: 'Cálculo' }], error: null })
      });

      // Debe rechazar si falta userId
      await expect(coursesService.createCourse(null, { name: 'Física' }))
        .rejects.toThrow(/userId es requerido/);

      // Con userId válido debe asociarlo en la carga útil
      const result = await coursesService.createCourse('usr-123', { name: 'Cálculo' });
      expect(result.id).toBe('crs-1');
      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({ user_id: 'usr-123', name: 'Cálculo' })
      ]);
    });

    it('tasksService.createTask asocia explícitamente activeUserId en inserción y en fallback coreData', async () => {
      const mockQuery = supabase.from('assignments');
      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'asg-1', user_id: 'usr-456', title: 'Taller 1' }], error: null })
      });

      const result = await tasksService.createTask('usr-456', { title: 'Taller 1' });
      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({ user_id: 'usr-456', title: 'Taller 1' })
      ]);
      expect(result.user_id).toBe('usr-456');
    });

    it('notesService.createNote asocia user_id explícito y no intenta inserción remota con usuario guest', async () => {
      const mockQuery = supabase.from('study_notes');
      mockQuery.insert.mockResolvedValue({ data: null, error: null });

      // Usuario guest: no debe invocar inserción remota
      const guestNote = await notesService.createNote('guest', { title: 'Nota Invitado', content: 'Prueba' });
      expect(guestNote.user_id).toBe('guest');
      expect(mockQuery.insert).not.toHaveBeenCalled();

      // Usuario autenticado: asocia user_id e intenta inserción
      const userNote = await notesService.createNote('usr-789', { title: 'Nota Usuario', content: 'Contenido' });
      expect(userNote.user_id).toBe('usr-789');
      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({ user_id: 'usr-789', title: 'Nota Usuario' })
      ]);
    });

    it('studySessionService.saveStudySession asocia user_id explícito y omite llamada a Supabase para invitados', async () => {
      const mockQuery = supabase.from('study_sessions');
      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'sess-1', user_id: 'usr-abc', duration_minutes: 25 }], error: null })
      });

      // Invitado
      const guestResult = await saveStudySession({ duration_minutes: 25 }, 'guest');
      expect(guestResult.success).toBe(true);
      expect(guestResult.localOnly).toBe(true);
      expect(mockQuery.insert).not.toHaveBeenCalled();

      // Usuario autenticado
      const userResult = await saveStudySession({ duration_minutes: 50 }, 'usr-abc');
      expect(userResult.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({ user_id: 'usr-abc', duration_minutes: 50 })
      ]);
    });
  });
});

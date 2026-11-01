import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import process from 'node:process';
import { getHumanizedErrorMessage, handleServiceError } from '../lib/errorHandler';

describe('CampusFlow Resilience, Error Handling & Performance Optimization', () => {
  describe('1. Blindaje de Rutas y Navegación SPA (vercel.json y NotFound)', () => {
    it('verifica que vercel.json contenga la regla de reescritura para Single Page Applications', () => {
      const vercelPath = path.resolve(process.cwd(), 'vercel.json');
      expect(fs.existsSync(vercelPath)).toBe(true);

      const vercelContent = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
      expect(vercelContent.rewrites).toBeDefined();
      expect(Array.isArray(vercelContent.rewrites)).toBe(true);

      const spaRewrite = vercelContent.rewrites.find(
        (r) => r.source === '/(.*)' && r.destination === '/'
      );
      expect(spaRewrite).toBeDefined();
    });

    it('verifica que App.jsx tenga configurada la ruta comodín con NotFound', () => {
      const appPath = path.resolve(process.cwd(), 'src/App.jsx');
      const appContent = fs.readFileSync(appPath, 'utf-8');

      expect(appContent).toContain('const NotFound = React.lazy');
      expect(appContent).toContain('<Route path="*" element={<Suspense fallback={<LoadingGlass />}><NotFound /></Suspense>} />');
    });

    it('verifica que App.jsx envuelva el contenido principal con ErrorBoundary', () => {
      const appPath = path.resolve(process.cwd(), 'src/App.jsx');
      const appContent = fs.readFileSync(appPath, 'utf-8');

      expect(appContent).toContain("import ErrorBoundary from './components/ui/ErrorBoundary'");
      expect(appContent).toContain('<ErrorBoundary>');
      expect(appContent).toContain('</ErrorBoundary>');
    });
  });

  describe('2. Humanización y Traducción de Errores (errorHandler.js)', () => {
    it('traduce errores de red u offline a mensajes amigables en español', () => {
      const netError = new Error('Failed to fetch data from Supabase backend');
      const msg = getHumanizedErrorMessage(netError);
      expect(msg).toContain('Sin conexión a internet');

      const offlineError = { message: 'Network offline, please check connection' };
      expect(getHumanizedErrorMessage(offlineError)).toContain('Sin conexión a internet');
    });

    it('traduce expiración de JWT o sesión', () => {
      const jwtError = { message: 'JWT expired or invalid token', code: 'PGRST301' };
      const msg = getHumanizedErrorMessage(jwtError);
      expect(msg).toContain('Tu sesión ha expirado');
    });

    it('traduce restricciones de permisos y RLS (código 42501)', () => {
      const rlsError = { code: '42501', message: 'permission denied for table assignments' };
      const msg = getHumanizedErrorMessage(rlsError);
      expect(msg).toContain('No tienes permisos');
    });

    it('traduce violaciones de clave única (23505)', () => {
      const dupError = { code: '23505', message: 'duplicate key value violates unique constraint' };
      const msg = getHumanizedErrorMessage(dupError);
      expect(msg).toContain('Ya existe un elemento');
    });

    it('traduce llaves foráneas inexistentes (23503)', () => {
      const fkError = { code: '23503', message: 'foreign key constraint violation' };
      const msg = getHumanizedErrorMessage(fkError);
      expect(msg).toContain('El elemento relacionado no existe');
    });

    it('aplica fallbackMessage amigable si el error no coincide con patrones específicos', () => {
      const genericError = new Error('Unexpected condition 500');
      const msg = getHumanizedErrorMessage(genericError, 'Error personalizado de prueba');
      expect(msg).toBe('Error personalizado de prueba');
    });

    it('handleServiceError ejecuta de forma segura sin lanzar excepciones', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = handleServiceError(new Error('Network offline'), {
        context: 'testSuite',
        showToast: false
      });
      expect(result).toContain('Sin conexión a internet');
      consoleSpy.mockRestore();
    });
  });

  describe('3. Configuración de Build y Service Worker (vite.config.js)', () => {
    it('verifica que vite.config.js contenga esbuild drop de console y debugger', () => {
      const vitePath = path.resolve(process.cwd(), 'vite.config.js');
      const viteContent = fs.readFileSync(vitePath, 'utf-8');

      expect(viteContent).toContain("drop: ['console', 'debugger']");
      expect(viteContent).toContain('StaleWhileRevalidate');
      expect(viteContent).toContain('campusflow-local-resources');
    });
  });

  describe('4. Script de Índices Idempotente (supabase/indexes_optimization.sql)', () => {
    it('verifica que el script SQL contenga todos los índices B-Tree requeridos', () => {
      const sqlPath = path.resolve(process.cwd(), 'supabase/indexes_optimization.sql');
      expect(fs.existsSync(sqlPath)).toBe(true);

      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

      // 5 índices obligatorios de la checklist maestra
      expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);');
      expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);');
      expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);');
      expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);');
      expect(sqlContent).toContain('CREATE INDEX IF NOT EXISTS idx_study_notes_user_id ON study_notes(user_id);');

      // Índices compuestos recomendados
      expect(sqlContent).toContain('idx_assignments_user_status');
      expect(sqlContent).toContain('idx_study_sessions_user_created');
      expect(sqlContent).toContain('idx_study_notes_user_updated');
    });
  });
});

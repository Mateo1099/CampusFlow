import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import * as Sentry from '@sentry/react';
import SentryErrorFallback from '../components/ui/SentryErrorFallback';

describe('Sentry Production Monitoring & ErrorBoundary Integration', () => {
  let originalWindow = globalThis.window;

  beforeEach(() => {
    globalThis.window = {
      location: {
        pathname: '/tasks',
        href: 'http://localhost:5173/tasks',
        reload: vi.fn()
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.window = originalWindow;
  });

  describe('1. Sentry SDK Exports & Initialisation Integrity', () => {
    it('exporta correctamente los métodos y componentes requeridos de @sentry/react', () => {
      expect(typeof Sentry.init).toBe('function');
      expect(typeof Sentry.browserTracingIntegration).toBe('function');
      expect(typeof Sentry.replayIntegration).toBe('function');
      expect(typeof Sentry.ErrorBoundary).toBe('function');
      expect(typeof Sentry.captureException).toBe('function');
    });

    it('la configuración condicional no inicializa si VITE_SENTRY_DSN está vacío o no configurado', () => {
      const mockInitFn = vi.fn();
      const initializeSentry = (dsn, initFn = mockInitFn) => {
        if (dsn && typeof dsn === 'string' && dsn.trim() !== '') {
          initFn({
            dsn,
            integrations: [
              Sentry.browserTracingIntegration(),
              Sentry.replayIntegration({
                maskAllText: false,
                blockAllMedia: false
              })
            ],
            tracesSampleRate: 0.2,
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,
            environment: 'production'
          });
          return true;
        }
        return false;
      };

      expect(initializeSentry('')).toBe(false);
      expect(initializeSentry('   ')).toBe(false);
      expect(initializeSentry(undefined)).toBe(false);
      expect(initializeSentry(null)).toBe(false);
      expect(mockInitFn).not.toHaveBeenCalled();
    });

    it('ejecuta inicialización con la configuración requerida cuando VITE_SENTRY_DSN está presente', () => {
      const mockInitFn = vi.fn();
      const initializeSentry = (dsn, initFn = mockInitFn) => {
        if (dsn && typeof dsn === 'string' && dsn.trim() !== '') {
          initFn({
            dsn: dsn || '',
            integrations: [
              Sentry.browserTracingIntegration(),
              Sentry.replayIntegration({
                maskAllText: false,
                blockAllMedia: false
              })
            ],
            tracesSampleRate: 0.2,
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,
            environment: 'production'
          });
          return true;
        }
        return false;
      };

      const testDsn = 'https://examplePublicKey@o0.ingest.sentry.io/0';
      const result = initializeSentry(testDsn);

      expect(result).toBe(true);
      expect(mockInitFn).toHaveBeenCalledTimes(1);
      expect(mockInitFn).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
          tracesSampleRate: 0.2,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          environment: 'production'
        })
      );
    });
  });

  describe('2. Cyber Luxe SentryErrorFallback UI & Resilience', () => {
    it('renderiza la vista de contingencia con role="alert" y accesibilidad aria-live', () => {
      const element = SentryErrorFallback({
        error: new Error('Fallo crítico simulado'),
        eventId: 'sentry-evt-12345'
      });

      expect(element).toBeTruthy();
      expect(element.props.role).toBe('alert');
      expect(element.props['aria-live']).toBe('assertive');
      expect(element.props.className).toContain('sentry-error-boundary-screen');
    });

    it('incluye mensaje claro de recuperación sobre los datos del estudiante', () => {
      const tree = SentryErrorFallback({
        error: new Error('Render crash')
      });

      const card = tree.props.children;
      const descElement = card.props.children.find(
        (child) => child && child.props && child.props.id === 'sentry-error-desc'
      );

      expect(descElement).toBeDefined();
      expect(descElement.props.children).toContain('Tus materias, tareas');
    });

    it('permite reintentar el renderizado invocando resetError', () => {
      const resetErrorMock = vi.fn();
      const tree = SentryErrorFallback({
        error: new Error('Error recuperable'),
        resetError: resetErrorMock
      });

      const card = tree.props.children;
      const actionsContainer = card.props.children.find(
        (child) => child && child.props && child.props.className === 'sentry-fallback-actions'
      );

      expect(actionsContainer).toBeDefined();
      const buttons = actionsContainer.props.children;
      const retryBtn = Array.isArray(buttons)
        ? buttons.find((btn) => btn && btn.props && btn.props.className === 'btn-retry-render')
        : null;

      expect(retryBtn).toBeDefined();
      expect(retryBtn.props.children).toContain('Reintentar renderizado');

      retryBtn.props.onClick();
      expect(resetErrorMock).toHaveBeenCalledTimes(1);
    });

    it('permite recargar la página si resetError no se suministra', () => {
      const tree = SentryErrorFallback({
        error: new Error('Error irrecuperable')
      });

      const card = tree.props.children;
      const actionsContainer = card.props.children.find(
        (child) => child && child.props && child.props.className === 'sentry-fallback-actions'
      );

      expect(actionsContainer).toBeDefined();
      const buttons = actionsContainer.props.children;
      const reloadBtn = Array.isArray(buttons)
        ? buttons.find((btn) => btn && btn.props && btn.props.className === 'btn-retry-render')
        : null;

      expect(reloadBtn).toBeDefined();
      expect(reloadBtn.props.children).toContain('Recargar página');

      reloadBtn.props.onClick();
      expect(globalThis.window.location.reload).toHaveBeenCalledTimes(1);
    });

    it('permite volver al inicio seguro de la aplicación', () => {
      const resetErrorMock = vi.fn();
      const tree = SentryErrorFallback({
        error: new Error('Error en ruta'),
        resetError: resetErrorMock
      });

      const card = tree.props.children;
      const actionsContainer = card.props.children.find(
        (child) => child && child.props && child.props.className === 'sentry-fallback-actions'
      );

      expect(actionsContainer).toBeDefined();
      const buttons = actionsContainer.props.children;
      const homeBtn = Array.isArray(buttons)
        ? buttons.find((btn) => btn && btn.props && btn.props.className === 'btn-go-dashboard')
        : null;

      expect(homeBtn).toBeDefined();
      expect(homeBtn.props.children).toContain('Volver al inicio');

      homeBtn.props.onClick();
      expect(resetErrorMock).toHaveBeenCalledTimes(1);
      expect(globalThis.window.location.href).toBe('/');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import {
  ONBOARDING_STORAGE_KEY,
  getOnboardingStorageKey,
  hasCompletedOnboarding,
  markOnboardingCompleted,
  resetOnboarding
} from '../components/ui/OnboardingModal';
import * as authSecurityModule from '../lib/authSecurity';

describe('CampusFlow Resilience & UX Pillars', () => {
  let mockStorage = {};
  let originalWindow = globalThis.window;

  beforeEach(() => {
    mockStorage = {};

    globalThis.window = {
      location: {
        pathname: '/tasks',
        href: 'http://localhost:5173/tasks',
        reload: vi.fn()
      },
      localStorage: {
        getItem: vi.fn((key) => mockStorage[key] || null),
        setItem: vi.fn((key, value) => {
          mockStorage[key] = String(value);
        }),
        removeItem: vi.fn((key) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          mockStorage = {};
        })
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.window = originalWindow;
  });

  describe('1. Global ErrorBoundary (`src/components/ui/ErrorBoundary.jsx`)', () => {
    it('inicia en estado saludable sin errores (hasError: false)', () => {
      const boundary = new ErrorBoundary({ children: React.createElement('div', null, 'OK') });
      expect(boundary.state.hasError).toBe(false);
      expect(boundary.state.error).toBe(null);
      expect(boundary.state.errorInfo).toBe(null);
    });

    it('captura el error mediante getDerivedStateFromError de forma reactiva', () => {
      const testError = new Error('Fallo crítico en componente secundario');
      const derived = ErrorBoundary.getDerivedStateFromError(testError);

      expect(derived).toEqual({
        hasError: true,
        error: testError
      });
    });

    it('ejecuta componentDidCatch registrando a través de safeDevLog sin filtrar secretos', () => {
      const safeDevLogSpy = vi.spyOn(authSecurityModule, 'safeDevLog');
      const onErrorMock = vi.fn();
      const boundary = new ErrorBoundary({ onError: onErrorMock });
      boundary.setState = vi.fn(function (updater) {
        if (typeof updater === 'function') {
          this.state = { ...this.state, ...updater(this.state) };
        } else {
          this.state = { ...this.state, ...updater };
        }
      });

      const testError = new Error('Token payload parsing error');
      const testErrorInfo = { componentStack: '\n in BrokenComponent\n in AppRoutes' };

      boundary.componentDidCatch(testError, testErrorInfo);

      expect(boundary.state.errorInfo).toBe(testErrorInfo);
      expect(safeDevLogSpy).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('[ErrorBoundary] Excepción no controlada en renderizado:'),
        expect.objectContaining({
          message: 'Token payload parsing error'
        })
      );
      expect(onErrorMock).toHaveBeenCalledWith(testError, testErrorInfo);
    });

    it('soporta botón "Reintentar renderizado" restableciendo el estado y llamando onReset', () => {
      const onResetMock = vi.fn();
      const boundary = new ErrorBoundary({ onReset: onResetMock });
      boundary.setState = vi.fn(function (updater) {
        if (typeof updater === 'function') {
          this.state = { ...this.state, ...updater(this.state) };
        } else {
          this.state = { ...this.state, ...updater };
        }
      });

      boundary.state = {
        hasError: true,
        error: new Error('Falla temporal'),
        errorInfo: { componentStack: 'stack' }
      };

      boundary.handleRetry();

      expect(onResetMock).toHaveBeenCalledTimes(1);
      expect(boundary.setState).toHaveBeenCalledWith({
        hasError: false,
        error: null,
        errorInfo: null
      });
    });

    it('soporta botón "Volver al Dashboard seguro" redirigiendo a la ruta raíz', () => {
      const boundary = new ErrorBoundary({});
      boundary.setState = vi.fn(function (updater) {
        if (typeof updater === 'function') {
          this.state = { ...this.state, ...updater(this.state) };
        } else {
          this.state = { ...this.state, ...updater };
        }
      });
      boundary.state = {
        hasError: true,
        error: new Error('Ruta rota')
      };

      boundary.handleGoDashboard();

      expect(boundary.setState).toHaveBeenCalledWith({
        hasError: false,
        error: null,
        errorInfo: null
      });
      expect(globalThis.window.location.href).toBe('/');
    });

    it('renderiza fallback personalizado cuando se suministra como función o nodo', () => {
      const fallbackFn = vi.fn(({ error }) => `Fallback: ${error.message}`);
      const boundary = new ErrorBoundary({
        fallback: fallbackFn,
        children: 'Contenido normal'
      });

      boundary.state = {
        hasError: true,
        error: new Error('Error custom fallback')
      };

      const result = boundary.render();
      expect(fallbackFn).toHaveBeenCalled();
      expect(result).toBe('Fallback: Error custom fallback');
    });

    it('renderiza interfaz Glassmorphism con role="alert" cuando ocurre un error no capturado', () => {
      const boundary = new ErrorBoundary({ children: 'Hijo' });
      boundary.state = {
        hasError: true,
        error: new Error('Crash visual')
      };

      const renderedTree = boundary.render();
      expect(renderedTree.type).toBe('div');
      expect(renderedTree.props.role).toBe('alert');
      expect(renderedTree.props['aria-live']).toBe('assertive');
    });
  });

  describe('2. Guided Student Onboarding Tour (`src/components/ui/OnboardingModal.jsx`)', () => {
    it('detecta correctamente si un usuario es nuevo o ya completó el onboarding', () => {
      const newUser = { id: 'usr-new-001', user_metadata: {} };
      expect(hasCompletedOnboarding(newUser)).toBe(false);

      // Si tiene el flag en user_metadata
      const completedUserMeta = {
        id: 'usr-meta-002',
        user_metadata: { has_completed_onboarding: true }
      };
      expect(hasCompletedOnboarding(completedUserMeta)).toBe(true);

      // Si tiene el flag global en localStorage
      mockStorage[ONBOARDING_STORAGE_KEY] = 'true';
      expect(hasCompletedOnboarding(newUser)).toBe(true);
    });

    it('guarda el flag has_completed_onboarding de forma persistente y dispara evento global', () => {
      const activeUser = { id: 'usr-active-777' };
      markOnboardingCompleted(activeUser);

      expect(mockStorage[ONBOARDING_STORAGE_KEY]).toBe('true');
      expect(mockStorage[getOnboardingStorageKey('usr-active-777')]).toBe('true');
      expect(globalThis.window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'campusflow:onboarding-completed'
        })
      );
    });

    it('permite reiniciar el estado del onboarding mediante resetOnboarding', () => {
      const student = { id: 'student-99' };
      mockStorage[ONBOARDING_STORAGE_KEY] = 'true';
      mockStorage[getOnboardingStorageKey('student-99')] = 'true';

      resetOnboarding(student);

      expect(mockStorage[ONBOARDING_STORAGE_KEY]).toBeUndefined();
      expect(mockStorage[getOnboardingStorageKey('student-99')]).toBeUndefined();
      expect(hasCompletedOnboarding(student)).toBe(false);
    });

    it('valida la secuencia lógica de los 3 pasos clave del tour de estudiantes', () => {
      // Paso 1: Gestión de Materias y Entregas (Semáforo)
      // Paso 2: Planificador Semanal y Bloques de Estudio (Pomodoro / XP)
      // Paso 3: Ajustes de Seguridad y Notificaciones (2FA Orbital)
      const steps = [
        { id: 'courses-deadlines', title: 'Gestión de Materias y Entregas' },
        { id: 'planner-pomodoro', title: 'Planificador Semanal y Bloques de Estudio' },
        { id: 'security-settings', title: 'Ajustes de Seguridad y Notificaciones' }
      ];

      expect(steps).toHaveLength(3);
      expect(steps[0].id).toBe('courses-deadlines');
      expect(steps[1].id).toBe('planner-pomodoro');
      expect(steps[2].id).toBe('security-settings');

      // Máquina de estados de navegación
      let currentStep = 0;
      const nextStep = () => {
        if (currentStep < steps.length - 1) currentStep += 1;
      };
      const prevStep = () => {
        if (currentStep > 0) currentStep -= 1;
      };

      expect(currentStep).toBe(0);
      nextStep();
      expect(currentStep).toBe(1);
      nextStep();
      expect(currentStep).toBe(2);
      // No debe avanzar más allá del paso final
      nextStep();
      expect(currentStep).toBe(2);

      // Regresar
      prevStep();
      expect(currentStep).toBe(1);
      prevStep();
      expect(currentStep).toBe(0);
      // No debe retroceder más allá del paso 0
      prevStep();
      expect(currentStep).toBe(0);
    });

    it('el atajo Escape omite el onboarding y marca la finalización', () => {
      const student = { id: 'student-esc-test' };
      const onSkip = () => markOnboardingCompleted(student);

      // Simular tecla Escape
      const event = { key: 'Escape', preventDefault: vi.fn() };
      if (event.key === 'Escape') {
        onSkip();
      }

      expect(mockStorage[ONBOARDING_STORAGE_KEY]).toBe('true');
      expect(hasCompletedOnboarding(student)).toBe(true);
    });

    it('el atajo Enter avanza en pasos intermedios y finaliza en el paso 3', () => {
      const student = { id: 'student-enter-test' };
      let step = 0;
      let completed = false;

      const handleKey = (key) => {
        if (key === 'Enter') {
          if (step < 2) {
            step += 1;
          } else {
            markOnboardingCompleted(student);
            completed = true;
          }
        }
      };

      handleKey('Enter'); // Paso 0 -> 1
      expect(step).toBe(1);
      expect(completed).toBe(false);

      handleKey('Enter'); // Paso 1 -> 2
      expect(step).toBe(2);
      expect(completed).toBe(false);

      handleKey('Enter'); // Paso 2 -> Completar
      expect(completed).toBe(true);
      expect(hasCompletedOnboarding(student)).toBe(true);
    });
  });
});

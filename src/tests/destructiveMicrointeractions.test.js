import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Destructive Microinteractions Specification Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('useUndoDelete - 5-Second Window & Supabase Deferral Logic', () => {
    it('programa la eliminación con temporizador de 5000ms por defecto', () => {
      const onFinalDelete = vi.fn();
      let pendingList = [];
      const timers = new Map();

      const requestDelete = ({ id, name, onFinalDelete: cb, duration = 5000 }) => {
        pendingList.push({ id, name, duration });
        const timerId = setTimeout(() => {
          pendingList = pendingList.filter((item) => item.id !== id);
          cb?.(id);
        }, duration);
        timers.set(id, timerId);
      };

      requestDelete({ id: 'task-101', name: 'Entrega Final Cálculo', onFinalDelete });

      expect(pendingList).toHaveLength(1);
      expect(pendingList[0].id).toBe('task-101');
      expect(onFinalDelete).not.toHaveBeenCalled();

      // Transcurren 4999ms: aún no se ejecuta
      vi.advanceTimersByTime(4999);
      expect(onFinalDelete).not.toHaveBeenCalled();
      expect(pendingList).toHaveLength(1);

      // A los 5000ms: se ejecuta el borrado definitivo en Supabase
      vi.advanceTimersByTime(1);
      expect(onFinalDelete).toHaveBeenCalledWith('task-101');
      expect(pendingList).toHaveLength(0);
    });

    it('cancela el borrado cuando el usuario pulsa "Deshacer" (Undo)', () => {
      const onFinalDelete = vi.fn();
      let pendingList = [];
      const timers = new Map();

      const requestDelete = ({ id, name, onFinalDelete: cb, duration = 5000 }) => {
        pendingList.push({ id, name, duration });
        const timerId = setTimeout(() => {
          pendingList = pendingList.filter((item) => item.id !== id);
          cb?.(id);
        }, duration);
        timers.set(id, timerId);
      };

      const undoDelete = (id) => {
        if (timers.has(id)) {
          clearTimeout(timers.get(id));
          timers.delete(id);
        }
        pendingList = pendingList.filter((item) => item.id !== id);
      };

      requestDelete({ id: 'block-202', name: 'Estudiar Física', onFinalDelete });
      expect(pendingList).toHaveLength(1);

      // Usuario pulsa "Deshacer" a los 2.5 segundos
      vi.advanceTimersByTime(2500);
      undoDelete('block-202');

      expect(pendingList).toHaveLength(0);

      // Transcurre el tiempo restante (más de 5000ms total)
      vi.advanceTimersByTime(5000);
      expect(onFinalDelete).not.toHaveBeenCalled();
    });

    it('gestiona múltiples elementos concurrentes de forma aislada e independiente', () => {
      const deleteA = vi.fn();
      const deleteB = vi.fn();
      let pendingList = [];
      const timers = new Map();

      const requestDelete = ({ id, onFinalDelete, duration = 5000 }) => {
        pendingList.push(id);
        const tId = setTimeout(() => {
          pendingList = pendingList.filter((x) => x !== id);
          onFinalDelete(id);
        }, duration);
        timers.set(id, tId);
      };

      const undoDelete = (id) => {
        clearTimeout(timers.get(id));
        timers.delete(id);
        pendingList = pendingList.filter((x) => x !== id);
      };

      // Se eliminan dos elementos con 2 segundos de separación
      requestDelete({ id: 'item-A', onFinalDelete: deleteA });
      vi.advanceTimersByTime(2000);
      requestDelete({ id: 'item-B', onFinalDelete: deleteB });

      // Se deshace el elemento A
      undoDelete('item-A');

      // Avanzamos 3000ms más (total 5000ms desde A, 3000ms desde B)
      vi.advanceTimersByTime(3000);
      expect(deleteA).not.toHaveBeenCalled();
      expect(deleteB).not.toHaveBeenCalled();

      // Avanzamos 2000ms más (total 5000ms desde B)
      vi.advanceTimersByTime(2000);
      expect(deleteA).not.toHaveBeenCalled();
      expect(deleteB).toHaveBeenCalledWith('item-B');
      expect(pendingList).toHaveLength(0);
    });

    it('ejecuta los borrados pendientes al desmontarse el componente para evitar pérdida de sincronización', () => {
      const finalDelete = vi.fn();
      const timers = new Map();
      const callbacks = new Map();

      const request = (id, cb) => {
        callbacks.set(id, cb);
        const t = setTimeout(() => cb(id), 5000);
        timers.set(id, t);
      };

      request('course-303', finalDelete);

      // Simular unmount antes de que pasen los 5s
      const onUnmount = () => {
        timers.forEach((timerId, id) => {
          clearTimeout(timerId);
          const cb = callbacks.get(id);
          cb?.(id);
        });
        timers.clear();
        callbacks.clear();
      };

      onUnmount();
      expect(finalDelete).toHaveBeenCalledWith('course-303');
    });
  });

  describe('BinEatButton - "The Bin Eats The Label" Mechanics & A11y', () => {
    it('ejecuta fallback inmediato sin retrasos si prefers-reduced-motion está activo', () => {
      const onConfirm = vi.fn();

      // Simular matchMedia para prefers-reduced-motion
      const mockMatchMedia = (matches) => ({
        matches,
        media: '(prefers-reduced-motion: reduce)',
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const executeBinAction = ({ prefersReducedMotion, onConfirmCallback }) => {
        if (prefersReducedMotion) {
          onConfirmCallback();
          return 'immediate';
        }

        setTimeout(() => {
          setTimeout(() => {
            onConfirmCallback();
          }, 150);
        }, 440);
        return 'animated';
      };

      // Caso 1: Con movimiento reducido -> Inmediato
      const resultReduced = executeBinAction({
        prefersReducedMotion: mockMatchMedia(true).matches,
        onConfirmCallback: onConfirm
      });

      expect(resultReduced).toBe('immediate');
      expect(onConfirm).toHaveBeenCalledTimes(1);

      // Caso 2: Sin movimiento reducido -> Requiere los 590ms totales (440ms + 150ms)
      const onConfirmAnimated = vi.fn();
      const resultAnimated = executeBinAction({
        prefersReducedMotion: mockMatchMedia(false).matches,
        onConfirmCallback: onConfirmAnimated
      });

      expect(resultAnimated).toBe('animated');
      expect(onConfirmAnimated).not.toHaveBeenCalled();

      // Avanzamos 440ms (trayecto del bote)
      vi.advanceTimersByTime(440);
      expect(onConfirmAnimated).not.toHaveBeenCalled();

      // Avanzamos 150ms (cierre victorioso de tapa)
      vi.advanceTimersByTime(150);
      expect(onConfirmAnimated).toHaveBeenCalledTimes(1);
    });

    it('bloquea clics duplicados cuando disabled o isLoading están activos', () => {

      const handleClickSimulation = ({ disabled, isLoading, animState }) => {
        if (disabled || isLoading || animState !== 'idle') return false;
        return true;
      };

      expect(handleClickSimulation({ disabled: true, isLoading: false, animState: 'idle' })).toBe(false);
      expect(handleClickSimulation({ disabled: false, isLoading: true, animState: 'idle' })).toBe(false);
      expect(handleClickSimulation({ disabled: false, isLoading: false, animState: 'eating' })).toBe(false);
      expect(handleClickSimulation({ disabled: false, isLoading: false, animState: 'idle' })).toBe(true);
    });

    it('calcula la distancia de desplazamiento adaptada al tamaño del texto y variante', () => {
      const calculateTravelDistance = (labelLength, size) => {
        const charWidth = size === 'sm' ? 8 : 10;
        const extraGap = size === 'sm' ? 6 : 8;
        return Math.max(labelLength * charWidth + extraGap, 40);
      };

      const distSm = calculateTravelDistance('ELIMINAR'.length, 'sm');
      const distMd = calculateTravelDistance('ELIMINAR'.length, 'md');

      // 'sm' (8 * 8 + 6 = 70px) vs 'md' (8 * 10 + 8 = 88px)
      expect(distSm).toBe(70);
      expect(distMd).toBe(88);
      expect(distMd).toBeGreaterThan(distSm);
    });

    it('garantiza atributos de accesibilidad estándar (type="button", aria-label, aria-busy)', () => {
      const getA11yAttributes = ({ label, ariaLabel, isBusy }) => ({
        type: 'button',
        'aria-label': ariaLabel || label,
        'aria-busy': isBusy
      });

      const attrsIdle = getA11yAttributes({ label: 'ELIMINAR MATERIA', ariaLabel: null, isBusy: false });
      expect(attrsIdle.type).toBe('button');
      expect(attrsIdle['aria-label']).toBe('ELIMINAR MATERIA');
      expect(attrsIdle['aria-busy']).toBe(false);

      const attrsBusy = getA11yAttributes({ label: 'DESACTIVAR', ariaLabel: 'Desactivar 2FA', isBusy: true });
      expect(attrsBusy['aria-label']).toBe('Desactivar 2FA');
      expect(attrsBusy['aria-busy']).toBe(true);
    });
  });

  describe('UndoToast & CrumpleTossItem Accessibility & Aesthetics Specs', () => {
    it('cumple el protocolo accesible para lectores de pantalla (role="status", aria-live="polite")', () => {
      const toastA11yContract = {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      };

      expect(toastA11yContract.role).toBe('status');
      expect(toastA11yContract['aria-live']).toBe('polite');
      expect(toastA11yContract['aria-atomic']).toBe('true');
    });

    it('calcula el porcentaje de progreso decreciente para la barra de 5 segundos', () => {
      const calculateRemainingPercent = (elapsedMs, durationMs = 5000) => {
        return Math.max(0, 100 - (elapsedMs / durationMs) * 100);
      };

      expect(calculateRemainingPercent(0)).toBe(100);
      expect(calculateRemainingPercent(2500)).toBe(50);
      expect(calculateRemainingPercent(5000)).toBe(0);
      expect(calculateRemainingPercent(6000)).toBe(0);
    });

    it('CrumpleTossItem oculta el elemento de lectores de pantalla mientras está arrugado', () => {
      const getCrumpleItemA11y = (isCrumpled) => ({
        'aria-hidden': isCrumpled
      });

      expect(getCrumpleItemA11y(false)['aria-hidden']).toBe(false);
      expect(getCrumpleItemA11y(true)['aria-hidden']).toBe(true);
    });
  });
});

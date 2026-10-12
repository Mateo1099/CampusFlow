import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useUndoDelete - Hook para gestionar eliminación diferida con ventana de deshacer (Undo)
 *
 * @param {Object} options
 * @param {number} options.defaultDuration - Tiempo en ms antes de ejecutar el borrado definitivo (default: 5000)
 * @returns {Object} { pendingItems, requestDelete, undoDelete, isPending, cancelAllPending }
 */
export function useUndoDelete({ defaultDuration = 5000 } = {}) {
  const [pendingItems, setPendingItems] = useState([]);
  const timersRef = useRef(new Map());
  const finalCallbacksRef = useRef(new Map());

  // Limpiar temporizadores activos si el componente se desmonta
  useEffect(() => {
    const timers = timersRef.current;
    const callbacks = finalCallbacksRef.current;

    return () => {
      // Al desmontar, ejecutar cualquier borrado que haya quedado pendiente
      // para evitar pérdida de sincronización con Supabase
      timers.forEach((timerId, id) => {
        clearTimeout(timerId);
        const onFinalDelete = callbacks.get(id);
        if (typeof onFinalDelete === 'function') {
          try {
            onFinalDelete(id);
          } catch (err) {
            console.error('Error al ejecutar borrado pendiente al desmontar:', err);
          }
        }
      });
      timers.clear();
      callbacks.clear();
    };
  }, []);

  /**
   * Solicitar la eliminación de un elemento con temporizador de reversión
   */
  const requestDelete = useCallback(
    ({ id, name = 'Elemento', type = 'item', onFinalDelete, duration = defaultDuration }) => {
      if (!id) return;

      // Si ya existía un temporizador para este id, limpiarlo primero
      if (timersRef.current.has(id)) {
        clearTimeout(timersRef.current.get(id));
      }

      if (typeof onFinalDelete === 'function') {
        finalCallbacksRef.current.set(id, onFinalDelete);
      }

      const newItem = {
        id,
        name,
        type,
        duration,
        createdAt: Date.now()
      };

      setPendingItems((prev) => [...prev.filter((item) => item.id !== id), newItem]);

      // Programar la ejecución definitiva en Supabase tras transcurrir la ventana (ej. 5s)
      const timerId = setTimeout(() => {
        const callback = finalCallbacksRef.current.get(id);
        timersRef.current.delete(id);
        finalCallbacksRef.current.delete(id);

        setPendingItems((prev) => prev.filter((item) => item.id !== id));

        if (typeof callback === 'function') {
          callback(id);
        }
      }, duration);

      timersRef.current.set(id, timerId);
    },
    [defaultDuration]
  );

  /**
   * Deshacer la eliminación: cancela el timer y restaura el elemento
   */
  const undoDelete = useCallback((id) => {
    if (!id) return;

    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    finalCallbacksRef.current.delete(id);

    setPendingItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /**
   * Comprobar si un elemento está actualmente en estado pendiente de eliminación
   */
  const isPending = useCallback(
    (id) => {
      return pendingItems.some((item) => item.id === id);
    },
    [pendingItems]
  );

  /**
   * Cancelar todas las eliminaciones pendientes y restaurarlas
   */
  const cancelAllPending = useCallback(() => {
    timersRef.current.forEach((timerId) => clearTimeout(timerId));
    timersRef.current.clear();
    finalCallbacksRef.current.clear();
    setPendingItems([]);
  }, []);

  return {
    pendingItems,
    requestDelete,
    undoDelete,
    isPending,
    cancelAllPending
  };
}

export default useUndoDelete;

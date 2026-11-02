import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { syncAllPendingData } from '../../services/offlineSyncService';

/**
 * OfflineBanner - Indicador Flotante Global de Estado de Red (Cyber Luxe)
 * 
 * Flota de forma no intrusiva en el margen inferior de la pantalla:
 * - Modo Offline: Píldora ámbar glassmorphism informando que los datos se guardan en el dispositivo.
 * - Modo Reconexión: Píldora cian-verde indicando sincronización, dispara la subida de datos pendientes
 *   y desaparece suavemente tras 3 segundos.
 */
export default function OfflineBanner() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isVisible, setIsVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let hideTimer = null;

    const handleOffline = () => {
      setIsOnline(false);
      setIsVisible(true);
      setIsSyncing(false);
      if (hideTimer) clearTimeout(hideTimer);
    };

    const handleOnline = async () => {
      setIsOnline(true);
      setIsVisible(true);
      setIsSyncing(true);

      // Disparar sincronización de tareas, notas y sesiones pendientes
      try {
        if (user?.id) {
          await syncAllPendingData(user.id);
        }
      } catch (err) {
        console.warn('[OfflineBanner] Error en sincronización:', err);
      } finally {
        setIsSyncing(false);
      }

      // Desaparecer limpiamente tras 3 segundos
      hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    };

    // Si al montar ya está desconectado, mostrar de inmediato la píldora
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline();
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [user?.id]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={isOnline ? 'online-pill' : 'offline-pill'}
          initial={{ opacity: 0, y: 25, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.94 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          role="status"
          aria-live="polite"
        >
          <div
            className={`flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-xl transition-all duration-300 ${
              !isOnline
                ? 'bg-[#0f0e08]/90 border border-amber-500/40 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.22)]'
                : 'bg-[#041410]/90 border border-emerald-500/50 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.28)]'
            }`}
            style={{
              boxShadow: !isOnline
                ? '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(245,158,11,0.2), inset 0 0 12px rgba(245,158,11,0.1)'
                : '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(0,243,255,0.2), inset 0 0 12px rgba(16,185,129,0.1)'
            }}
          >
            {!isOnline ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
                <WifiOff size={15} className="text-amber-400 shrink-0" />
                <span className="truncate">Modo sin conexión — Tus datos se guardan en el dispositivo</span>
              </>
            ) : (
              <>
                {isSyncing ? (
                  <>
                    <Loader2 size={15} className="text-cyan-400 animate-spin shrink-0" />
                    <span className="truncate text-cyan-200">Conexión restablecida — Sincronizando datos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <Wifi size={15} className="text-emerald-400 shrink-0" />
                    <span className="truncate">Conexión restablecida — Datos sincronizados</span>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


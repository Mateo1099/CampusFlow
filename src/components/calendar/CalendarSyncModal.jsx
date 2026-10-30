import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Smartphone,
  Calendar as CalendarIcon,
  ExternalLink,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadICalFile, matchesInstitutionFilter } from './calendarUtils';
import { playClick } from '../../lib/audioService';

export default function CalendarSyncModal({
  isOpen,
  onClose,
  tasks = [],
  courses = [],
  institutionFilter = 'TODAS',
  onDownload
}) {
  if (!isOpen) return null;

  // Filtrado de tareas según la institución activa
  const filteredTasks = tasks.filter((t) => matchesInstitutionFilter(t, courses, institutionFilter));
  const count = filteredTasks.length;

  const handleDownloadClick = () => {
    try {
      playClick(950);
    } catch {
      // Audio fallback
    }

    if (onDownload) {
      onDownload();
      return;
    }

    if (count === 0) {
      toast.info('No hay entregas para exportar con el filtro actual');
      return;
    }

    const filterTag = institutionFilter.toLowerCase();
    const filename = `campusflow-entregas-${filterTag}.ics`;
    downloadICalFile(filteredTasks, filename);
    toast.success(`Se descargó ${filename}`, {
      description: 'Listo para importar en tu móvil o Google Calendar.'
    });
  };

  const handleClose = () => {
    try {
      playClick(800);
    } catch {
      // Audio fallback
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-modal-title"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 15, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999
        }}
        onClick={(e) => {
          if (e && e.target === e.currentTarget) handleClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '560px',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(11, 15, 29, 0.98))',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderTop: '1px solid rgba(0, 243, 255, 0.4)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 35px rgba(0, 243, 255, 0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}
        >
          {/* Cabecera */}
          <div
            style={{
              padding: '22px 28px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  background: 'rgba(0, 243, 255, 0.12)',
                  border: '1px solid rgba(0, 243, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(0, 243, 255, 0.2)'
                }}
              >
                <CalendarIcon size={22} color="#00f3ff" />
              </div>
              <div>
                <h2
                  id="sync-modal-title"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    margin: 0,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em'
                  }}
                >
                  Sincronizar con tu Calendario
                </h2>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Pasa tus entregas académicas a Google Calendar, Outlook o el calendario de tu celular.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar modal"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Cuerpo con Scroll */}
          <div
            style={{
              padding: '24px 28px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            {/* Botón Destacado de Descarga .ics */}
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 28px rgba(0, 243, 255, 0.35)' }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleDownloadClick}
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.22) 0%, rgba(0, 180, 255, 0.12) 100%)',
                border: '1.5px solid rgba(0, 243, 255, 0.5)',
                color: '#00f3ff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(0, 243, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Download size={20} color="#00f3ff" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.98rem', fontWeight: 900, letterSpacing: '0.01em' }}>
                    Descargar archivo .ics de entregas
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '2px' }}>
                    {count} {count === 1 ? 'entrega disponible' : 'entregas disponibles'} (Filtro: {institutionFilter})
                  </div>
                </div>
              </div>

              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(0, 243, 255, 0.18)',
                  border: '1px solid rgba(0, 243, 255, 0.4)',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}
              >
                .ICS
              </span>
            </motion.button>

            {/* Sección 1: En tu Teléfono */}
            <div
              style={{
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderLeft: '4px solid #00f3ff',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Smartphone size={18} color="#00f3ff" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    En tu Teléfono
                  </span>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Recomendado
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)'
                }}
              >
                Al terminar la descarga, toca la notificación del archivo en tu móvil y selecciona &apos;Guardar en calendario&apos; o &apos;Añadir todos&apos;. Las alarmas quedarán programadas automáticamente.
              </p>
            </div>

            {/* Sección 2: En Google Calendar (PC / Web) */}
            <div
              style={{
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderLeft: '4px solid #38bdf8',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarIcon size={18} color="#38bdf8" />
                <span style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  En Google Calendar (PC / Web)
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)'
                }}
              >
                Haz clic en &apos;Seleccionar archivo del ordenador&apos;, elige el archivo .ics que acabas de descargar y presiona &apos;Importar&apos;.
              </p>

              <div>
                <a
                  href="https://calendar.google.com/calendar/u/0/r/settings/export"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 16px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    boxShadow: '0 0 12px rgba(56, 189, 248, 0.15)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                    e.currentTarget.style.boxShadow = '0 0 18px rgba(56, 189, 248, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.15)';
                  }}
                >
                  <ExternalLink size={14} />
                  Ir a Importar en Google Calendar
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 28px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.015)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-primary)',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
            >
              <Check size={16} />
              Entendido / Cerrar
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

CalendarSyncModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  tasks: PropTypes.arrayOf(PropTypes.object),
  courses: PropTypes.arrayOf(PropTypes.object),
  institutionFilter: PropTypes.string,
  onDownload: PropTypes.func
};

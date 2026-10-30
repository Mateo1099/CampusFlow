/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useMemo, useCallback, useId } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Search,
  X,
  ChevronDown,
  CheckSquare,
  FileText,
  Headphones,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { playClick } from '../../lib/audioService';

export const FAQ_CATEGORIES = [
  { id: 'all', label: 'Todas', icon: HelpCircle },
  { id: 'tasks', label: 'Trabajos & Ejercicios', icon: CheckSquare },
  { id: 'notes', label: 'Cuaderno de Apuntes', icon: FileText },
  { id: 'study-room', label: 'Sala de Estudio & Playlist', icon: Headphones },
  { id: 'data-perf', label: 'Datos, Cuentas & Rendimiento', icon: ShieldCheck }
];

export const FAQ_ITEMS = [
  // 1. Trabajos & Ejercicios
  {
    id: 'tasks-subtasks-breakdown',
    category: 'tasks',
    categoryLabel: 'Trabajos & Ejercicios',
    question: '¿Cómo desglosar una entrega compleja en ejercicios numerados (#1, #2...)?',
    answer: 'En el tablero de Trabajos (Kanban), abre la tarjeta de la entrega para desplegar el panel lateral. En la sección "Checklist de Ejercicios", escribe el enunciado o número (#1, #2, etc.) y presiona Enter o el botón "Añadir". Cada ejercicio se enumera automáticamente y te permite medir el avance porcentual de tu entrega con precisión.',
    keywords: ['ejercicios', 'desglosar', 'subtareas', 'kanban', 'checklist', '#1', 'entregas']
  },
  {
    id: 'tasks-https-validation',
    category: 'tasks',
    categoryLabel: 'Trabajos & Ejercicios',
    question: '¿Cómo se valida un enlace de entrega seguro y por qué exige HTTPS?',
    answer: 'Para proteger tus credenciales universitarias y garantizar que tus archivos en Google Drive, OneDrive o Teams sean accesibles, CampusFlow valida en tiempo real que los links comiencen estrictamente con el protocolo seguro "https://". Si ingresas un enlace sin protocolo seguro, el sistema mostrará una advertencia para evitar enlaces rotos o no cifrados.',
    keywords: ['enlace', 'https', 'drive', 'seguro', 'url', 'onedrive', 'teams', 'validar']
  },
  {
    id: 'tasks-progress-xp',
    category: 'tasks',
    categoryLabel: 'Trabajos & Ejercicios',
    question: '¿Cómo marcar el avance de los ejercicios resueltos y ganar experiencia (XP)?',
    answer: 'Simplemente marca la casilla (checkbox) del ejercicio completado. El porcentaje general de la entrega se recalculará automáticamente y se sumarán puntos de XP a tu perfil universitario por cada ejercicio resuelto con éxito.',
    keywords: ['avance', 'completar', 'xp', 'puntos', 'checklist', 'progreso', 'marcar']
  },
  {
    id: 'tasks-calendar-institutions-sync',
    category: 'tasks',
    categoryLabel: 'Trabajos & Ejercicios',
    question: '¿Cómo funciona el Calendario Académico y los filtros institucionales?',
    answer: 'El Calendario Académico te permite visualizar todas tus entregas en vista mensual o semanal y alternar filtros rápidos por institución (UNAD, SENA o Personalizado). Además, el botón "Sincronizar (.ics)" permite descargar tus fechas límite para integrarlas directamente en Google Calendar, Outlook o la app de calendario de tu celular.',
    keywords: ['calendario', 'calendario academico', 'filtros', 'institucional', 'unad', 'sena', 'personalizado', 'sincronizar', 'ics', 'google calendar', 'outlook', 'movil', 'celular', 'entregas']
  },

  // 2. Cuaderno de Apuntes
  {
    id: 'notes-search-concepts',
    category: 'notes',
    categoryLabel: 'Cuaderno de Apuntes',
    question: '¿Cómo buscar conceptos específicos y palabras clave entre todos mis apuntes?',
    answer: 'Dirígete a la sección "Apuntes" desde el menú lateral. Utiliza la barra de búsqueda en tiempo real en la parte superior; puedes filtrar por palabras clave, títulos de temas, conceptos teóricos o seleccionar una materia específica desde las etiquetas de colores para acotar tus resúmenes al instante.',
    keywords: ['apuntes', 'buscar', 'conceptos', 'notas', 'materias', 'filtro', 'cuaderno']
  },
  {
    id: 'notes-quick-notes',
    category: 'notes',
    categoryLabel: 'Cuaderno de Apuntes',
    question: '¿Cómo crear notas rápidas independientes para una clase universitaria?',
    answer: 'Haz clic en el botón "+ Nuevo Apunte" en el encabezado del módulo de Apuntes. Asigna un título descriptivo, selecciona la asignatura correspondiente y escribe tus notas con formato enriquecido. Los apuntes quedan guardados e indexados de forma inmediata en tu libreta digital.',
    keywords: ['crear', 'nueva nota', 'apunte', 'clase', 'redactar', 'independiente']
  },
  {
    id: 'notes-link-to-tasks',
    category: 'notes',
    categoryLabel: 'Cuaderno de Apuntes',
    question: '¿Puedo vincular o consultar apuntes directamente mientras resuelvo un trabajo?',
    answer: '¡Sí! Desde el panel de detalle de cualquier entrega o trabajo, encontrarás el acceso directo para consultar los apuntes asociados a esa misma materia sin necesidad de cambiar de pestaña ni perder el foco de tu entrega actual.',
    keywords: ['vincular', 'consultar', 'trabajo', 'entrega', 'drawer', 'acceso directo']
  },

  // 3. Sala de Estudio & Playlist
  {
    id: 'study-room-load-folders',
    category: 'study-room',
    categoryLabel: 'Sala de Estudio & Playlist',
    question: '¿Cómo cargar una carpeta completa de música local para estudiar?',
    answer: 'Entra a la "Sala de Estudio (Pomodoro)" y en el reproductor de audio haz clic en "Cargar Carpeta de Música". Selecciona un directorio local con tus pistas de audio preferidas (MP3, WAV, AAC). CampusFlow leerá la carpeta de manera ultra-rápida y generará una lista de reproducción local sin saturar la memoria RAM.',
    keywords: ['musica', 'playlist', 'carpeta', 'local', 'estudio', 'pomodoro', 'audio', 'mp3']
  },
  {
    id: 'study-room-loop-shuffle',
    category: 'study-room',
    categoryLabel: 'Sala de Estudio & Playlist',
    question: '¿Cómo funciona la reproducción en bucle y aleatoria de la playlist?',
    answer: 'En la barra de controles de audio dispones de los botones de modo "Bucle" (Loop pista o carpeta completa) y "Aleatorio" (Shuffle). Una vez activado, la música continuará sonando de forma fluida e ininterrumpida durante todas tus sesiones de enfoque.',
    keywords: ['bucle', 'loop', 'aleatorio', 'shuffle', 'reproduccion', 'sonido']
  },
  {
    id: 'study-room-pomodoro-sync',
    category: 'study-room',
    categoryLabel: 'Sala de Estudio & Playlist',
    question: '¿La música se sincroniza automáticamente con el reloj Pomodoro?',
    answer: 'Por defecto, el audio se reproduce a tu ritmo. Sin embargo, puedes activar la opción de sincronización con el reloj Pomodoro para que la música comience en sintonía con el bloque de concentración (25 min) y se pause o cambie a un sonido ambiental relajante durante los 5 minutos de pausa activa.',
    keywords: ['sincronizacion', 'pomodoro', 'reloj', 'focus', 'pausa', 'timer']
  },

  // 4. Datos, Cuentas & Rendimiento
  {
    id: 'data-autosave-sync',
    category: 'data-perf',
    categoryLabel: 'Datos, Cuentas & Rendimiento',
    question: '¿Cómo funciona el auto-guardado y la sincronización de mis datos académicos?',
    answer: 'CampusFlow aplica una arquitectura híbrida de alta resiliencia. Todos tus cambios (materias, notas, tareas y bloques del planificador) se almacenan de inmediato en la base de datos local y, si estás conectado con tu cuenta universitaria, se sincronizan en la nube en tiempo real mediante cifrado y políticas de seguridad RLS.',
    keywords: ['guardado', 'auto-guardado', 'sincronizacion', 'nube', 'seguridad', 'rls']
  },
  {
    id: 'data-offline-support',
    category: 'data-perf',
    categoryLabel: 'Datos, Cuentas & Rendimiento',
    question: '¿Qué sucede si me quedo sin conexión a Internet en la universidad?',
    answer: 'Puedes continuar trabajando con normalidad. CampusFlow funciona como una aplicación progresiva de alta disponibilidad; cuando tu conexión a Internet regrese, todos tus avances pendientes se sincronizarán de forma transparente con el servidor sin pérdidas de información.',
    keywords: ['offline', 'sin conexion', 'internet', 'desconectado', 'persistencia']
  },
  {
    id: 'data-levels-xp-calc',
    category: 'data-perf',
    categoryLabel: 'Datos, Cuentas & Rendimiento',
    question: '¿Cómo se calculan el Nivel y los puntos de Experiencia (XP)?',
    answer: 'Obtienes XP al completar ejercicios (#1, #2...), entregar trabajos a tiempo, concluir bloques de estudio en el Pomodoro y mantener tu racha diaria activa. Cada nivel desbloquea nuevas insignias en tu perfil y mejores métricas en tu panel de Analítica Académica.',
    keywords: ['nivel', 'xp', 'experiencia', 'analitica', 'racha', 'puntos', 'gamificacion']
  }
];

export default function FaqModal({
  isOpen: controlledIsOpen,
  onClose
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});

  const titleId = useId();
  const searchInputId = useId();

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Escuchar evento global `campusflow:open-faq`
  useEffect(() => {
    const handleOpen = () => {
      setInternalIsOpen(true);
    };

    window.addEventListener('campusflow:open-faq', handleOpen);
    return () => {
      window.removeEventListener('campusflow:open-faq', handleOpen);
    };
  }, []);

  const handleClose = useCallback(() => {
    try {
      playClick(600);
    } catch {
      // Audio opcional
    }
    setInternalIsOpen(false);
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

  const handleOpenTour = () => {
    handleClose();
    // Despachar evento para abrir el tour guiado en el paso 1
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('campusflow:open-onboarding'));
    }, 150);
  };

  const toggleItem = (itemId) => {
    try {
      playClick(850);
    } catch {
      // Audio opcional
    }
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Atajos de teclado: Escape para cerrar
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, handleClose]);

  // Filtrado de preguntas y respuestas
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return FAQ_ITEMS.filter(item => {
      // Filtro por categoría
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Si no hay búsqueda, pasa
      if (!q) return true;

      const inQuestion = item.question.toLowerCase().includes(q);
      const inAnswer = item.answer.toLowerCase().includes(q);
      const inCategory = item.categoryLabel.toLowerCase().includes(q);
      const inKeywords = item.keywords.some(k => k.toLowerCase().includes(q));

      return inQuestion || inAnswer || inCategory || inKeywords;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <AnimatePresence>
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="faq-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.76)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="faq-modal-card"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '88vh',
              borderRadius: '24px',
              padding: '28px 28px 22px',
              background: 'var(--bg-panel, rgba(15, 17, 26, 0.94))',
              border: '1px solid rgba(0, 243, 255, 0.35)',
              boxShadow: '0 0 45px rgba(0, 243, 255, 0.15), 0 25px 60px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary, #f5f5f7)',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Barra superior de acento neón Cyber Luxe */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, var(--accent-primary, #00f3ff) 0%, var(--accent-neon, #bc13fe) 50%, var(--accent-primary, #00f3ff) 100%)',
                boxShadow: '0 0 14px var(--accent-primary, #00f3ff)'
              }}
            />

            {/* Header con título y botón cerrar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '13px',
                    background: 'rgba(0, 243, 255, 0.12)',
                    border: '1px solid rgba(0, 243, 255, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)'
                  }}
                >
                  <HelpCircle size={22} color="var(--accent-primary, #00f3ff)" />
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      color: 'var(--accent-primary, #00f3ff)',
                      textTransform: 'uppercase'
                    }}
                  >
                    CENTRO DE AYUDA ACADÉMICO
                  </span>
                  <h2
                    id={titleId}
                    style={{
                      margin: 0,
                      fontSize: '1.28rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-display, Inter, sans-serif)',
                      color: 'var(--text-primary, #f5f5f7)',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    Preguntas Frecuentes & Guías
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar centro de ayuda"
                className="btn-faq-close"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary, #a1a1aa)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast, 0.2s ease)'
                }}
              >
                <X size={17} />
              </button>
            </div>

            {/* Buscador en tiempo real */}
            <div
              style={{
                position: 'relative',
                marginBottom: '16px'
              }}
            >
              <Search
                size={18}
                color="var(--accent-primary, #00f3ff)"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  opacity: 0.85
                }}
              />
              <input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar dudas (ej. ejercicios, enlaces https, música, apuntes, XP...)"
                style={{
                  width: '100%',
                  padding: '12px 38px 12px 42px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(0, 243, 255, 0.25)',
                  color: 'var(--text-primary, #f5f5f7)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--accent-primary, #00f3ff)';
                  e.target.style.boxShadow = '0 0 16px rgba(0, 243, 255, 0.25), inset 0 2px 4px rgba(0,0,0,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 243, 255, 0.25)';
                  e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3)';
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #71717a)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Categorías (Pills con scroll horizontal fluido) */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '12px',
                scrollbarWidth: 'none'
              }}
            >
              {FAQ_CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.id;
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="faq-category-pill"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '7px 13px',
                      borderRadius: '999px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      border: isSelected
                        ? '1px solid var(--accent-primary, #00f3ff)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isSelected
                        ? 'rgba(0, 243, 255, 0.15)'
                        : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected
                        ? 'var(--accent-primary, #00f3ff)'
                        : 'var(--text-secondary, #a1a1aa)',
                      boxShadow: isSelected ? '0 0 12px rgba(0, 243, 255, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <CatIcon size={14} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Lista con Acordeón (Scrollable) */}
            <div
              className="faq-accordion-container custom-scrollbar"
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minHeight: '220px',
                maxHeight: '44vh'
              }}
            >
              {filteredFaqs.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '36px 16px',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #a1a1aa)'
                  }}
                >
                  <HelpCircle size={36} color="rgba(0, 243, 255, 0.4)" style={{ marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary, #fff)' }}>
                    No se encontraron resultados
                  </p>
                  <p style={{ margin: '6px 0 16px', fontSize: '0.80rem' }}>
                    Prueba con otra palabra clave o selecciona la categoría &quot;Todas&quot;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: 'rgba(0, 243, 255, 0.1)',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      color: 'var(--accent-primary, #00f3ff)',
                      fontSize: '0.80rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Restablecer filtros
                  </button>
                </div>
              ) : (
                filteredFaqs.map(item => {
                  const isExpanded = !!expandedItems[item.id];
                  return (
                    <div
                      key={item.id}
                      className="faq-accordion-card"
                      style={{
                        borderRadius: '14px',
                        background: isExpanded
                          ? 'rgba(0, 243, 255, 0.05)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: isExpanded
                          ? '1px solid rgba(0, 243, 255, 0.32)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden',
                        transition: 'all 0.25s ease'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        aria-expanded={isExpanded}
                        className="faq-question-btn"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '14px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-primary, #f5f5f7)',
                          fontSize: '0.90rem',
                          fontWeight: 700,
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ flex: 1, lineHeight: 1.4 }}>
                          {item.question}
                        </span>
                        <ChevronDown
                          size={18}
                          color={isExpanded ? 'var(--accent-primary, #00f3ff)' : 'var(--text-muted, #71717a)'}
                          style={{
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.25s ease',
                            flexShrink: 0
                          }}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div
                              style={{
                                padding: '0 16px 14px',
                                fontSize: '0.85rem',
                                lineHeight: 1.6,
                                color: 'var(--text-secondary, #a1a1aa)',
                                borderTop: '1px solid rgba(0, 243, 255, 0.12)',
                                paddingTop: '10px'
                              }}
                            >
                              {item.answer}
                              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(0, 243, 255, 0.12)',
                                    color: 'var(--accent-primary, #00f3ff)'
                                  }}
                                >
                                  {item.categoryLabel}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer con Botón Destacado: Volver a ver el Tour Guiado */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--accent-primary, #00f3ff)" />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #a1a1aa)' }}>
                  ¿Prefieres un recorrido interactivo de 6 pasos?
                </span>
              </div>

              <button
                type="button"
                onClick={handleOpenTour}
                className="btn-faq-reopen-tour"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '12px',
                  border: '1px solid transparent',
                  background: 'linear-gradient(135deg, var(--accent-primary, #00f3ff) 0%, rgba(0, 243, 255, 0.75) 100%)',
                  color: '#080b11',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0, 243, 255, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>🚀 Volver a ver el Tour Guiado</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

FaqModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func
};

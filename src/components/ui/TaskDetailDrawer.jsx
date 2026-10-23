import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Trash2, Check, CheckCircle2, 
  Sparkles, Calendar, Clock,
  ArrowUp, ArrowDown, RefreshCw,
  ListTodo, Link2, ExternalLink, BookOpen, AlertTriangle
} from 'lucide-react';
import { validateSecureUrl } from '../../lib/sanitize';

/**
 * TaskDetailDrawer — Drawer Cyber Luxe para Desglose de Ejercicios y Enlace de Entrega
 * Diseñado bajo el sistema visual Cyber Luxe de CampusFlow (Glassmorphism, gradientes neón, micro-animaciones).
 * Enfoque 100% académico en Desglose de Ejercicios (#1, #2, #3...) y Enlace de Entrega.
 */
export default function TaskDetailDrawer({
  isOpen,
  onClose,
  task,
  courses = [],
  onUpdateSubtasks,
  onUpdateNotes,
  onUpdateDeliveryUrl,
}) {
  const navigate = useNavigate();

  // Materia asociada
  const courseObj = useMemo(() => {
    if (!task) return null;
    return courses.find(c => c.id === task.course_id) || task.courses || null;
  }, [task, courses]);

  const accentColor = courseObj?.color || 'var(--accent-primary)';

  // Estado local para Subtareas y Enlace de Entrega
  const [subtasks, setSubtasks] = useState(() => (Array.isArray(task?.subtasks) ? task.subtasks : []));
  const [deliveryUrl, setDeliveryUrl] = useState(() => {
    if (typeof task?.delivery_url === 'string') return task.delivery_url;
    if (typeof task?.task_notes === 'string') return task.task_notes;
    return '';
  });
  const [prevTaskId, setPrevTaskId] = useState(task?.id);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'completed'
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'

  // Sincronizar datos al cambiar de tarea durante render
  if (task?.id !== prevTaskId) {
    setPrevTaskId(task?.id);
    setSubtasks(Array.isArray(task?.subtasks) ? task.subtasks : []);
    setDeliveryUrl(
      typeof task?.delivery_url === 'string'
        ? task.delivery_url
        : typeof task?.task_notes === 'string'
        ? task.task_notes
        : ''
    );
    setSaveStatus('idle');
  }

  const newSubtaskInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Manejo de scroll en body al abrir drawer
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Guardado persistente del enlace de entrega con debounce
  const persistDeliveryUrl = useCallback(async (contentToSave) => {
    if (!task?.id) return;
    const validation = validateSecureUrl(contentToSave);
    if (!validation.isValid) {
      setSaveStatus('idle');
      return;
    }

    const saveFn = onUpdateDeliveryUrl || onUpdateNotes;
    if (!saveFn) return;

    try {
      setSaveStatus('saving');
      await saveFn(task.id, contentToSave);
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('[TaskDetailDrawer] Error guardando enlace de entrega:', err);
      setSaveStatus('idle');
    }
  }, [task, onUpdateDeliveryUrl, onUpdateNotes]);

  const handleDeliveryUrlChange = (e) => {
    const newContent = e.target.value;
    setDeliveryUrl(newContent);
    setSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      persistDeliveryUrl(newContent);
    }, 600);
  };

  const handleManualSaveDelivery = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const validation = validateSecureUrl(deliveryUrl);
    if (!validation.isValid) {
      return;
    }
    persistDeliveryUrl(deliveryUrl);
  };

  // Mutaciones de Subtareas (Ejercicios)
  const persistSubtasks = useCallback(async (updatedList) => {
    if (!task?.id || !onUpdateSubtasks) return;
    try {
      await onUpdateSubtasks(task.id, updatedList);
    } catch (err) {
      console.error('[TaskDetailDrawer] Error guardando subtareas:', err);
    }
  }, [task, onUpdateSubtasks]);

  const handleAddSubtask = (e) => {
    if (e) e.preventDefault();
    const trimmed = newSubtaskText.trim();
    if (!trimmed) return;

    const newItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed,
      completed: false,
    };

    const nextList = [...subtasks, newItem];
    setSubtasks(nextList);
    setNewSubtaskText('');
    persistSubtasks(nextList);

    // Mantener foco en el input para agregar múltiples ejercicios fluidamente
    setTimeout(() => {
      newSubtaskInputRef.current?.focus();
    }, 50);
  };

  const handleToggleSubtask = (id) => {
    const nextList = subtasks.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setSubtasks(nextList);
    persistSubtasks(nextList);
  };

  const handleDeleteSubtask = (id) => {
    const nextList = subtasks.filter(item => item.id !== id);
    setSubtasks(nextList);
    persistSubtasks(nextList);
  };

  const handleMoveSubtask = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= subtasks.length) return;

    const nextList = [...subtasks];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIndex, 0, moved);

    setSubtasks(nextList);
    persistSubtasks(nextList);
  };

  const handleToggleAll = () => {
    const areAllCompleted = subtasks.length > 0 && subtasks.every(s => s.completed);
    const nextList = subtasks.map(s => ({ ...s, completed: !areAllCompleted }));
    setSubtasks(nextList);
    persistSubtasks(nextList);
  };

  const handleClearCompleted = () => {
    const nextList = subtasks.filter(s => !s.completed);
    setSubtasks(nextList);
    persistSubtasks(nextList);
  };

  const handleOpenNotes = () => {
    onClose?.();
    const query = courseObj?.id ? `?subjectId=${encodeURIComponent(courseObj.id)}` : '';
    navigate(`/apuntes${query}`);
  };

  // Estadísticas de progreso cuantitativo
  const totalSubtasks = subtasks.length;
  const completedCount = subtasks.filter(s => s.completed).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

  // Filtrado de subtareas
  const filteredSubtasks = useMemo(() => {
    if (filter === 'pending') return subtasks.filter(s => !s.completed);
    if (filter === 'completed') return subtasks.filter(s => s.completed);
    return subtasks;
  }, [subtasks, filter]);

  // Formato de fecha de vencimiento y cálculo de prioridad
  const deadlineInfo = useMemo(() => {
    if (!task?.deadline && !task?.due_date) return null;
    const dateStr = task.deadline || task.due_date;
    try {
      const datePart = typeof dateStr === 'string' ? dateStr.split(/[T ]/)[0] : '';
      if (!datePart) return null;
      const d = new Date(`${datePart}T00:00:00`);
      const formatted = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffTime = d - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let priorityBadge = { label: 'EN TIEMPO', color: '#00f3ff' };
      if (diffDays <= 3) priorityBadge = { label: 'URGENTE', color: '#ff4d4d' };
      else if (diffDays <= 7) priorityBadge = { label: 'PRÓXIMO', color: '#ffcc00' };

      return { formatted, priorityBadge, diffDays };
    } catch {
      return { formatted: dateStr, priorityBadge: null };
    }
  }, [task]);

  const urlValidation = useMemo(() => {
    return validateSecureUrl(deliveryUrl);
  }, [deliveryUrl]);

  const isValidUrl = urlValidation.isValid && !urlValidation.isEmpty;
  const urlError = urlValidation.error;

  if (!task) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="task-detail-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(5, 7, 14, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-detail-title"
        >
          {/* Panel Lateral Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '580px',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(16, 20, 32, 0.97) 0%, rgba(10, 12, 20, 0.99) 100%)',
              backdropFilter: 'blur(30px) saturate(190%)',
              WebkitBackdropFilter: 'blur(30px) saturate(190%)',
              borderLeft: '1px solid rgba(0, 243, 255, 0.22)',
              boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 243, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Top ambient highlight line */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: `linear-gradient(90deg, transparent, ${accentColor}, var(--accent-secondary), transparent)`,
                boxShadow: `0 0 16px ${accentColor}`,
                zIndex: 10,
              }}
            />

            {/* ─── CABECERA ACADÉMICA DEL DRAWER ─── */}
            <div 
              style={{
                padding: '22px 26px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                background: 'rgba(255, 255, 255, 0.015)',
              }}
            >
              {/* Fila superior: Materia + Badges + Botón Apuntes + Cerrar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {courseObj?.name && (
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '4px 11px',
                        background: `${accentColor}15`,
                        border: `1px solid ${accentColor}40`,
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: accentColor,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        boxShadow: `0 0 12px ${accentColor}25`,
                      }}
                    >
                      <span 
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: accentColor,
                          boxShadow: `0 0 8px ${accentColor}`,
                        }}
                      />
                      <span>{courseObj.name}</span>
                    </div>
                  )}

                  {/* Botón sutil de contexto académico: Ver apuntes de la materia */}
                  <motion.button
                    whileHover={{ scale: 1.04, backgroundColor: 'rgba(188, 19, 254, 0.16)' }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={handleOpenNotes}
                    title="Explora o vincula notas de clase para esta materia"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      background: 'rgba(188, 19, 254, 0.08)',
                      border: '1px solid rgba(188, 19, 254, 0.3)',
                      color: 'var(--accent-secondary)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <BookOpen size={13} />
                    <span>📖 Ver apuntes de {courseObj?.name || 'Materia'}</span>
                  </motion.button>

                  {deadlineInfo?.priorityBadge && task.status !== 'entregado' && (
                    <span 
                      style={{
                        padding: '3px 9px',
                        background: `${deadlineInfo.priorityBadge.color}15`,
                        border: `1px solid ${deadlineInfo.priorityBadge.color}60`,
                        borderRadius: '16px',
                        fontSize: '0.67rem',
                        fontWeight: 800,
                        color: deadlineInfo.priorityBadge.color,
                        letterSpacing: '0.06em',
                        boxShadow: `0 0 10px ${deadlineInfo.priorityBadge.color}30`,
                      }}
                    >
                      {deadlineInfo.priorityBadge.label}
                    </span>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 77, 77, 0.15)', borderColor: 'rgba(255, 77, 77, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  aria-label="Cerrar panel"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: 'var(--text-secondary)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none',
                  }}
                >
                  <X size={17} />
                </motion.button>
              </div>

              {/* Título de la Entrega */}
              <h2 
                id="task-detail-title"
                style={{
                  margin: 0,
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {task.title}
              </h2>

              {/* Metadatos: Vence y Estado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {deadlineInfo?.formatted && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} style={{ color: accentColor }} />
                    <span>Vence: <strong style={{ color: 'var(--text-primary)' }}>{deadlineInfo.formatted}</strong></span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} style={{ color: 'var(--accent-secondary)' }} />
                  <span>Estado: <strong style={{ color: accentColor, textTransform: 'capitalize' }}>{task.status || 'sin entregar'}</strong></span>
                </div>
              </div>

              {/* ─── BARRA DE PROGRESO CUANTITATIVA DINÁMICA ─── */}
              <div 
                style={{
                  marginTop: '2px',
                  padding: '12px 14px',
                  background: 'rgba(0, 243, 255, 0.03)',
                  border: '1px solid rgba(0, 243, 255, 0.12)',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                    Progreso de Ejercicios
                  </span>
                  <span style={{ fontWeight: 700, color: progressPercent === 100 && totalSubtasks > 0 ? '#10b981' : 'var(--accent-primary)' }}>
                    {totalSubtasks === 0 
                      ? 'Sin ejercicios' 
                      : `${completedCount} de ${totalSubtasks} resueltos · ${progressPercent}%`}
                  </span>
                </div>

                <div 
                  style={{
                    width: '100%',
                    height: '7px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: progressPercent === 100 && totalSubtasks > 0
                        ? 'linear-gradient(90deg, #10b981, #00f3ff)'
                        : 'linear-gradient(90deg, #00f3ff, #bc13fe)',
                      borderRadius: '999px',
                      boxShadow: progressPercent > 0 ? '0 0 12px rgba(0, 243, 255, 0.6)' : 'none',
                    }}
                  />
                </div>

                {progressPercent === 100 && totalSubtasks > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={13} />
                    ¡Todos los ejercicios completados! Trabajo listo para entrega 🚀
                  </motion.div>
                )}
              </div>
            </div>

            {/* ─── CUERPO PRINCIPAL DEL DRAWER (CHECKLIST + ENLACE DE ENTREGA) ─── */}
            <div 
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 26px',
                display: 'flex',
                flexDirection: 'column',
                gap: '22px',
              }}
            >
              {/* ─── SECCIÓN 1: CHECKLIST DE EJERCICIOS NUMERADOS ─── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Cabecera de la sección de ejercicios y filtros */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ListTodo size={17} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                      Desglose de Ejercicios
                    </span>
                    {totalSubtasks > 0 && (
                      <span 
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '1px 7px',
                          borderRadius: '10px',
                          background: 'rgba(0, 243, 255, 0.12)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(0, 243, 255, 0.25)',
                        }}
                      >
                        {completedCount}/{totalSubtasks}
                      </span>
                    )}
                  </div>

                  {totalSubtasks > 0 && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'pending', label: 'Pendientes' },
                        { id: 'completed', label: 'Completados' }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFilter(f.id)}
                          style={{
                            padding: '3px 9px',
                            borderRadius: '16px',
                            border: filter === f.id ? '1px solid rgba(0, 243, 255, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: filter === f.id ? 'rgba(0, 243, 255, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                            color: filter === f.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Acciones globales de checklist */}
                {totalSubtasks > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      {completedCount === totalSubtasks ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                    {completedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearCompleted}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-danger)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Limpiar resueltos
                      </button>
                    )}
                  </div>
                )}

                {/* Lista de Ejercicios Numerados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredSubtasks.length === 0 ? (
                    <div 
                      style={{
                        padding: '32px 20px',
                        textAlign: 'center',
                        borderRadius: '14px',
                        border: '1px dashed rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.01)',
                        color: 'var(--text-muted)',
                        fontSize: '0.84rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <ListTodo size={28} style={{ opacity: 0.35, color: 'var(--accent-primary)' }} />
                      <span>
                        {totalSubtasks === 0 
                          ? 'No hay ejercicios registrados aún. Agrega los puntos de tu taller en el campo inferior para desglosarlos.'
                          : 'No hay ejercicios para el filtro seleccionado.'}
                      </span>
                    </div>
                  ) : (
                    filteredSubtasks.map((item, index) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                          padding: '11px 13px',
                          borderRadius: '12px',
                          background: item.completed 
                            ? 'rgba(16, 185, 129, 0.04)' 
                            : 'rgba(255, 255, 255, 0.025)',
                          border: item.completed 
                            ? '1px solid rgba(16, 185, 129, 0.22)' 
                            : '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {/* Checkbox + Número #N + Texto del Ejercicio */}
                        <div 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '11px',
                            flex: 1,
                            minWidth: 0,
                            cursor: 'pointer',
                          }}
                          onClick={() => handleToggleSubtask(item.id)}
                        >
                          {/* Checkbox Cyber Luxe con micro-animación */}
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            style={{
                              width: '21px',
                              height: '21px',
                              minWidth: '21px',
                              borderRadius: '7px',
                              border: item.completed 
                                ? '2px solid #10b981' 
                                : '2px solid rgba(0, 243, 255, 0.45)',
                              background: item.completed 
                                ? '#10b981' 
                                : 'rgba(0, 243, 255, 0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#000',
                              boxShadow: item.completed 
                                ? '0 0 10px rgba(16, 185, 129, 0.5)' 
                                : 'none',
                              transition: 'all 0.2s',
                            }}
                          >
                            {item.completed && <Check size={14} strokeWidth={3.5} />}
                          </motion.div>

                          {/* Número de ejercicio académico #N */}
                          <span 
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono, monospace)',
                              color: item.completed ? 'var(--text-muted)' : accentColor,
                              background: item.completed ? 'rgba(255, 255, 255, 0.04)' : `${accentColor}18`,
                              border: `1px solid ${item.completed ? 'rgba(255, 255, 255, 0.08)' : `${accentColor}35`}`,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              flexShrink: 0,
                              letterSpacing: '0.04em'
                            }}
                          >
                            #{index + 1}
                          </span>

                          {/* Texto del Ejercicio */}
                          <span 
                            style={{
                              fontSize: '0.88rem',
                              color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                              textDecoration: item.completed ? 'line-through' : 'none',
                              wordBreak: 'break-word',
                              lineHeight: 1.4,
                              transition: 'all 0.2s',
                            }}
                          >
                            {item.text}
                          </span>
                        </div>

                        {/* Botones de Acción (Subir, Bajar, Eliminar) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleMoveSubtask(index, -1)}
                            disabled={index === 0}
                            title="Mover arriba"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: index === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-secondary)',
                              cursor: index === 0 ? 'default' : 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ArrowUp size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMoveSubtask(index, 1)}
                            disabled={index === subtasks.length - 1}
                            title="Mover abajo"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: index === subtasks.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--text-secondary)',
                              cursor: index === subtasks.length - 1 ? 'default' : 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ArrowDown size={13} />
                          </button>

                          <motion.button
                            whileHover={{ scale: 1.15, color: '#ff4d4d' }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={() => handleDeleteSubtask(item.id)}
                            title="Eliminar ejercicio"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255, 255, 255, 0.4)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.2s',
                            }}
                          >
                            <Trash2 size={13} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Input inferior con tecla Enter para añadir nuevos puntos al instante */}
                <form 
                  onSubmit={handleAddSubtask}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(0, 243, 255, 0.22)',
                    borderRadius: '13px',
                    padding: '3px 6px 3px 14px',
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.22)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <input
                    ref={newSubtaskInputRef}
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    placeholder="Escribe un ejercicio... (Enter para agregar)"
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontFamily: 'var(--font-body)',
                      padding: '9px 0',
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={!newSubtaskText.trim()}
                    style={{
                      background: newSubtaskText.trim()
                        ? 'linear-gradient(135deg, #00f3ff 0%, #00a8ff 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: newSubtaskText.trim() ? '#000' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '9px',
                      padding: '7px 13px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: newSubtaskText.trim() ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      boxShadow: newSubtaskText.trim() ? '0 0 14px rgba(0, 243, 255, 0.35)' : 'none',
                    }}
                  >
                    <Plus size={15} />
                    <span>Agregar</span>
                  </motion.button>
                </form>
              </div>

              {/* ─── SECCIÓN 2: ENLACE DEL TRABAJO / ENTREGA ─── */}
              <div 
                style={{
                  padding: '16px 18px',
                  borderRadius: '16px',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.015) 100%)',
                  border: '1px solid rgba(0, 243, 255, 0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.25)',
                }}
              >
                {/* Cabecera de Enlace de Entrega */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(0, 243, 255, 0.1)',
                        border: '1px solid rgba(0, 243, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Link2 size={15} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Enlace del trabajo / entrega
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        URL de Google Drive, GitHub, Figma, Notion o repositorio
                      </p>
                    </div>
                  </div>

                  {/* Estado de sincronización */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {urlError ? (
                      <span 
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#ff4d4f',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <AlertTriangle size={12} />
                        Enlace no seguro
                      </span>
                    ) : (
                      <span 
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: saveStatus === 'saving' 
                            ? 'var(--accent-primary)' 
                            : saveStatus === 'saved' 
                            ? '#10b981' 
                            : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        {saveStatus === 'saving' && (
                          <RefreshCw size={11} className="animate-spin" />
                        )}
                        {saveStatus === 'saving' && 'Guardando...'}
                        {saveStatus === 'saved' && 'Guardado ✓'}
                        {saveStatus === 'idle' && (deliveryUrl.trim() ? 'Sincronizado' : 'Sin enlace')}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleManualSaveDelivery}
                      disabled={Boolean(urlError)}
                      title={urlError ? 'Corrige el enlace para guardar' : 'Guardar enlace de entrega'}
                      style={{
                        background: urlError ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 243, 255, 0.08)',
                        border: urlError ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 243, 255, 0.25)',
                        color: urlError ? 'var(--text-muted)' : 'var(--accent-primary)',
                        borderRadius: '7px',
                        padding: '3px 9px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: urlError ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: urlError ? 0.6 : 1,
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                {/* Input compacto para la URL de entrega */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(10, 12, 20, 0.6)',
                        border: urlError 
                          ? '1px solid rgba(255, 77, 79, 0.6)' 
                          : (isValidUrl ? '1px solid rgba(0, 243, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)'),
                        borderRadius: '11px',
                        padding: '8px 12px',
                        transition: 'all 0.2s',
                        boxShadow: urlError ? '0 0 12px rgba(255, 77, 79, 0.2)' : 'none',
                      }}
                    >
                      <input
                        type="url"
                        value={deliveryUrl}
                        onChange={handleDeliveryUrlChange}
                        onBlur={handleManualSaveDelivery}
                        placeholder="URL de Google Drive o enlace del trabajo con protocolo seguro (https://...)"
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'var(--text-primary)',
                          fontSize: '0.84rem',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      />
                    </div>

                    {isValidUrl && (
                      <motion.a
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(0, 243, 255, 0.2)' }}
                        whileTap={{ scale: 0.95 }}
                        href={deliveryUrl.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir enlace de entrega en una pestaña nueva"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          padding: '9px 12px',
                          borderRadius: '11px',
                          background: 'rgba(0, 243, 255, 0.12)',
                          border: '1px solid rgba(0, 243, 255, 0.35)',
                          color: 'var(--accent-primary)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>Abrir</span>
                        <ExternalLink size={13} />
                      </motion.a>
                    )}
                  </div>

                  {/* Advertencia en vivo si la URL no es segura o es inválida */}
                  {urlError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        fontSize: '0.72rem',
                        color: '#ff4d4f',
                        fontWeight: 650,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'rgba(255, 77, 79, 0.1)',
                        border: '1px solid rgba(255, 77, 79, 0.25)',
                      }}
                    >
                      <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                      <span>{urlError}</span>
                    </motion.div>
                  )}
                </div>

                {/* Helper informativo */}
                <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💡 El enlace se guarda automáticamente y queda registrado para tu entrega académica.</span>
                </div>
              </div>
            </div>

            {/* ─── FOOTER CON BOTÓN DE CIERRE RÁPIDO ─── */}
            <div 
              style={{
                padding: '15px 26px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(10, 12, 20, 0.85)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                CampusFlow Focus Engine · Auto-Sync
              </span>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  padding: '7px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cerrar
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

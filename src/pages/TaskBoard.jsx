/* eslint-disable no-unused-vars, react/jsx-no-comment-textnodes */
import React, { useState, useRef, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTasksContext } from '../context/TaskContext';
import { useGamification } from '../context/GamificationContext';
import { Plus, X, GripVertical, Calendar as CalendarIcon, Trash2, Edit2, Filter, ArrowUpDown, ChevronDown, Clock, AlertCircle, Flame, Eye, CheckCircle2, ListTodo, FileText } from 'lucide-react';
import CustomCalendar from '../components/ui/CustomCalendar';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '../hooks/useMediaQuery';
import InstitutionFilterPills from '../components/ui/InstitutionFilterPills';
import CustomSelect from '../components/ui/CustomSelect';
import TaskHistoryView from '../components/ui/TaskHistoryView';
import CrumpleTossItem from '../components/ui/CrumpleTossItem';
import { UndoToastContainer } from '../components/ui/UndoToast';
import { useUndoDelete } from '../hooks/useUndoDelete';
import BinEatButton from '../components/ui/BinEatButton';
import TaskDetailDrawer from '../components/ui/TaskDetailDrawer';

// GSAP IMPORTS
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { RoughEase, SlowMo } from "gsap/EasePack";

gsap.registerPlugin(useGSAP, RoughEase, SlowMo, CustomEase);

// COLUMNAS OFICIALES
const COLUMNS = [
  { id: 'sin entregar', label: 'SIN ENTREGAR', accent: '#f59e0b', icon: AlertCircle },
  { id: 'en proceso',   label: 'EN PROCESO',   accent: '#06b6d4', icon: Flame },
  { id: 'revisión',     label: 'REVISIÓN',     accent: '#a855f7', icon: Eye },
  { id: 'entregado',    label: 'ENTREGADO',    accent: '#10b981', icon: CheckCircle2 },
];

const TaskCard = ({ task, onDelete, onEdit, courses, onDragEnd, onOpenDetail }) => {
  const courseObj = courses?.find(c => c.id === task.course_id);
  const accentColor = courseObj?.color || 'var(--accent-primary)';

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const datePart = typeof dateStr === 'string' ? dateStr.split(/[T ]/)[0] : '';
      if (!datePart) return null;
      const d = new Date(`${datePart}T00:00:00`);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  };

  const displayDate = formatDate(task.deadline || task.due_date);
  const displayTime = (task.deadline_time || task.deadline || task.due_date)?.includes('T') ? (task.deadline_time || task.deadline || task.due_date).split('T')[1].substring(0, 5) : null;

  let compactDateTime = null;
  if (displayDate) {
    if (displayTime && displayTime !== '00:00') {
      compactDateTime = `📅 ${displayDate}   🕒 ${displayTime}`;
    } else {
      compactDateTime = `📅 ${displayDate}`;
    }
  }

  const calculatePriority = (dateStr) => {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0,0,0,0);
    const datePart = typeof dateStr === 'string' ? dateStr.split(/[T ]/)[0] : '';
    if (!datePart) return null;
    const deadline = new Date(`${datePart}T00:00:00`);
    if (isNaN(deadline.getTime())) return null;
    
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 3) return { label: 'URGENTE', color: '#ff4d4d' };
    if (diffDays >= 4 && diffDays <= 7) return { label: 'PRÓXIMO', color: '#ffcc00' };
    return { label: 'EN TIEMPO', color: '#00f3ff' };
  };

  const priority = calculatePriority(task.deadline || task.due_date);

  // Desglose de ejercicios y notas
  const subtasksList = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasks = subtasksList.filter(s => s.completed).length;
  const totalSubtasks = subtasksList.length;
  const hasNotes = typeof task.task_notes === 'string' && task.task_notes.trim().length > 0;

  return (
    <motion.div
      layout
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={(event, info) => onDragEnd(task, info)}
      whileDrag={{ 
        scale: 1.05, 
        rotate: 2, 
        zIndex: 100,
        boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 20px ${accentColor}33`,
      }}
      className="glass-card task-card-alfa"
      style={{
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        cursor: 'grab',
        touchAction: 'none'
      }}
    >
      {priority && task.status !== 'entregado' && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          right: '16px',
          background: `rgba(15, 23, 42, 0.8)`,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${priority.color}80`,
          boxShadow: `0 0 12px ${priority.color}40`,
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.65rem',
          fontWeight: 800,
          color: priority.color,
          zIndex: 10,
          letterSpacing: '0.05em'
        }}>
          {priority.label}
        </div>
      )}
      <div className="flex items-start gap-2 w-full mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GripVertical size={16} color="var(--text-muted)" className="shrink-0" style={{ marginLeft: '-4px', cursor: 'grab' }} />
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor, flexShrink: 0, boxShadow: `0 0 8px ${accentColor}` }} />
          <span 
            className="text-xs font-semibold tracking-wider uppercase truncate" 
            style={{ color: accentColor }}
          >
            {courseObj?.name || 'General'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botón Bloc de Notas y Desglose de Ejercicios */}
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(188, 19, 254, 0.18)', borderColor: 'rgba(188, 19, 254, 0.45)', boxShadow: '0 0 12px rgba(188, 19, 254, 0.4), inset 0 0 6px rgba(188, 19, 254, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            className="btn-icon-alfa"
            title="Desglose de ejercicios y bloc de notas"
            style={{ 
              opacity: 1, cursor: 'pointer', color: 'rgba(188, 19, 254, 0.95)',
              background: (totalSubtasks > 0 || hasNotes) ? 'rgba(188, 19, 254, 0.12)' : 'rgba(188, 19, 254, 0.04)',
              border: (totalSubtasks > 0 || hasNotes) ? '1px solid rgba(188, 19, 254, 0.35)' : '1px solid rgba(188, 19, 254, 0.15)',
              backdropFilter: 'blur(10px)', padding: '4px 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', transition: 'all 0.3s ease'
            }}
            onClick={(e) => { e.stopPropagation(); onOpenDetail?.(task); }}
          >
            <ListTodo size={13} style={{ filter: 'drop-shadow(0 0 2px rgba(188,19,254,0.5))' }} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(0, 243, 255, 0.15)', borderColor: 'rgba(0, 243, 255, 0.4)', boxShadow: '0 0 12px rgba(0, 243, 255, 0.4), inset 0 0 6px rgba(0, 243, 255, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            className="btn-icon-alfa"
            style={{ 
              opacity: 1, cursor: 'pointer', color: 'rgba(0, 243, 255, 0.8)',
              background: 'rgba(0, 243, 255, 0.03)', border: '1px solid rgba(0, 243, 255, 0.12)', backdropFilter: 'blur(10px)', padding: '4px 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', transition: 'all 0.3s ease'
            }}
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          >
            <Edit2 size={13} style={{ filter: 'drop-shadow(0 0 2px rgba(0,243,255,0.4))' }} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 77, 77, 0.15)', borderColor: 'rgba(255, 77, 77, 0.4)', boxShadow: '0 0 12px rgba(255, 77, 77, 0.4), inset 0 0 6px rgba(255, 77, 77, 0.2)' }}
            whileTap={{ scale: 0.95 }}
            className="btn-icon-alfa"
            style={{ 
              opacity: 1, cursor: 'pointer', color: 'rgba(255, 77, 77, 0.8)',
              background: 'rgba(255, 77, 77, 0.03)', border: '1px solid rgba(255, 77, 77, 0.12)', backdropFilter: 'blur(10px)', padding: '4px 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', transition: 'all 0.3s ease'
            }}
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          >
            <Trash2 size={13} style={{ filter: 'drop-shadow(0 0 2px rgba(255,77,77,0.4))' }} />
          </motion.button>
        </div>
      </div>
      <h4 className="break-words" style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{task.title}</h4>
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: 'auto', width: '100%' }}>
        {compactDateTime ? (
          <span className="text-[11px]" style={{ color: 'var(--accent-primary)', fontWeight: 700, whiteSpace: 'pre' }}>
            {compactDateTime}
          </span>
        ) : (
          <div style={{ width: '1px' }} />
        )}

        {/* Micro-indicadores de Desglose de Ejercicios y Notas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {totalSubtasks > 0 && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onOpenDetail?.(task); }}
              title={`${completedSubtasks} de ${totalSubtasks} ejercicios completados`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: completedSubtasks === totalSubtasks ? 'rgba(16, 185, 129, 0.14)' : 'rgba(0, 243, 255, 0.08)',
                border: completedSubtasks === totalSubtasks ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(0, 243, 255, 0.22)',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: completedSubtasks === totalSubtasks ? '#10b981' : 'var(--accent-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: completedSubtasks === totalSubtasks ? '0 0 8px rgba(16, 185, 129, 0.2)' : 'none',
              }}
            >
              <CheckCircle2 size={11} />
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </motion.div>
          )}

          {hasNotes && (
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onOpenDetail?.(task); }}
              title="Tiene notas de estudio vinculadas"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: '12px',
                background: 'rgba(188, 19, 254, 0.12)',
                border: '1px solid rgba(188, 19, 254, 0.3)',
                fontSize: '0.68rem',
                color: 'var(--accent-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <FileText size={10} />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const TaskBoard = () => {
  const { tasks, setTasks, updateTaskStatus, deleteTask, updateTask, updateSubtasks, updateTaskNotes, addTask, courses, tasksLoading } = useTasksContext();
  const { t } = useSettings();
  const { addXP } = useGamification();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useBreakpoint();
  const [showModal, setShowModal] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState(null);
  const detailTask = useMemo(() => tasks.find(t => t.id === detailTaskId) || null, [tasks, detailTaskId]);

  // Bloquea el scroll de fondo mientras el modal Nuevo/Editar Trabajo está abierto.
  React.useEffect(() => {
    if (showModal) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = previousOverflow; };
    }
  }, [showModal]);

  React.useEffect(() => {
    if (location.state?.openModal) {
      setShowModal(true);
      // Limpiar el estado para que no se abra de nuevo al recargar
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const { pendingItems, requestDelete, undoDelete, isPending } = useUndoDelete({ defaultDuration: 5000 });

  const handleTaskDeleteWithUndo = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    requestDelete({
      id: taskId,
      name: task?.title || 'Trabajo',
      type: 'trabajo',
      duration: 5000,
      onFinalDelete: () => deleteTask(taskId)
    });
  };
  const [formData, setFormData] = useState({ title: '', courseId: '', startDate: '', dueDate: '', deadlineTime: '23:59' });
  const [activePicker, setActivePicker] = useState(null);
  const [currentFilter, setCurrentFilter] = useState('TODAS');
  const [currentSort, setCurrentSort] = useState('RECIENTES');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const columnRefs = useRef({});
  const btnNewRef = useRef(null);
  const liquidRef = useRef(null);
  const modalPanelRef = useRef(null);
  const closeIconRef = useRef(null);

  // LÓGICA DE FILTRADO Y ORDENAMIENTO (BLINDAJE DE DND)
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task => {
      if (currentFilter === 'TODAS') return true;
      const course = courses.find(c => c.id === task.course_id);
      const inst = (course?.institution || '').toUpperCase();
      if (currentFilter === 'UNAD') return inst === 'UNAD';
      if (currentFilter === 'SENA') return inst === 'SENA';
      if (currentFilter === 'PERSONALIZADO') return inst !== 'UNAD' && inst !== 'SENA';
      return true;
    });

    return result.sort((a, b) => {
      if (currentSort === 'ALFABETICO') return a.title.localeCompare(b.title);
      if (currentSort === 'ENTREGA') {
        const dateA = a.deadline || a.due_date || '9999-12-31';
        const dateB = b.deadline || b.due_date || '9999-12-31';
        return dateA.localeCompare(dateB);
      }
      // RECIENTES (POR FECHA DE CREACIÓN O ID)
      const dateA = a.created_at ? new Date(a.created_at) : 0;
      const dateB = b.created_at ? new Date(b.created_at) : 0;
      return dateB - dateA;
    });
  }, [tasks, courses, currentFilter, currentSort]);

  // GSAP: Botón Nuevo Trabajo - Microinteracción Liquid Fill (Radial)
  useGSAP(() => {
    if (!btnNewRef.current || !liquidRef.current) return;
    const btn = btnNewRef.current;
    const liquid = liquidRef.current;
    
    const hoverTl = gsap.timeline({ paused: true });
    
    hoverTl.to(liquid, {
      scale: 1.2,
      opacity: 1,
      duration: 0.6,
      ease: "slow(0.7, 0.7, false)"
    });

    const enter = () => hoverTl.play();
    const leave = () => hoverTl.reverse();
    
    btn.addEventListener("mouseenter", enter);
    btn.addEventListener("mouseleave", leave);
    
    return () => {
      btn.removeEventListener("mouseenter", enter);
      btn.removeEventListener("mouseleave", leave);
    };
  }, [showModal]);

  const handleClose = () => {
    if (!modalPanelRef.current || !closeIconRef.current) {
      setShowModal(false);
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => setShowModal(false)
    });

    tl.to(closeIconRef.current, {
      scale: 0.8,
      opacity: 0,
      duration: 0.3,
      ease: "power2.inOut"
    }, 0);

    tl.to(modalPanelRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      ease: "power2.inOut"
    }, 0);
  };

  const playDropSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch { /* ignore */ }
  };

  const handleDragEnd = async (task, info) => {
    const x = info.point.x;
    let targetColumn = task.status;
    Object.entries(columnRefs.current).forEach(([id, ref]) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right) targetColumn = id;
      }
    });
    if (targetColumn !== task.status) {
      const isNowDelivered = targetColumn === 'entregado';
      
      if (isNowDelivered && !task.xpClaimed) {
        addXP(50);
      } else if (!isNowDelivered && task.xpClaimed) {
        addXP(-50, true);
      }

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: targetColumn, xpClaimed: isNowDelivered } : t));
      
      try { 
        await updateTaskStatus(task.id, targetColumn);
        playDropSound();
      } catch (err) { console.error("ALFA_SAVE_ERROR:", err); }
    }
  };

  const handleEdit = (task) => {
    setFormData({ 
      title: task.title, 
      courseId: task.course_id || '', 
      startDate: task.start_date ? task.start_date.split('T')[0] : '', 
      dueDate: (task.deadline || task.due_date) ? (task.deadline || task.due_date).split('T')[0] : '',
      deadlineTime: (task.deadline_time || task.deadline || task.due_date)?.includes('T') ? (task.deadline_time || task.deadline || task.due_date).split('T')[1].substring(0, 5) : '23:59'
    });
    setEditingTaskId(task.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.courseId) return;

    // Validación y formateo de fechas a ISO (YYYY-MM-DDTHH:mm:ss)
    const formatDateToISO = (dateStr, timeStr = '00:00') => {
      if (!dateStr) return null;
      const datePart = typeof dateStr === 'string' ? dateStr.split(/[T ]/)[0] : '';
      if (!datePart) return null;
      const d = new Date(`${datePart}T${timeStr}:00`);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${timeStr}:00`;
    };

    const taskData = { 
      title: formData.title, 
      course_id: formData.courseId, // ASEGURAR UUID DE MATERIA
      start_date: formatDateToISO(formData.startDate), 
      deadline: formatDateToISO(formData.dueDate, formData.deadlineTime || '23:59'),
      deadline_time: formatDateToISO(formData.dueDate, formData.deadlineTime || '23:59')
    };

    // ALFA_DEBUG: Verificación de integridad de datos antes del envío


    try {
      if (isEditing) {
        await updateTask(editingTaskId, taskData);
      } else {
        await addTask({ ...taskData, status: 'sin entregar' });
      }
      handleClose();
      setFormData({ title: '', courseId: '', startDate: '', dueDate: '', deadlineTime: '23:59' });
    } catch (err) { 
      console.error("ALFA_SAVE_ERROR:", err); 
    }
  };

  if (tasksLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--accent-primary)' }}><div className="animate-pulse font-display" style={{ fontWeight: 900, fontSize: '1.2rem' }}>//_SINCRONIZANDO...</div></div>;

  return (
    <div className="animate-fade-in task-board-page w-full" style={{ display: 'flex', flexDirection: 'column', padding: '32px 0px 32px 4px', minHeight: '100%', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="page-header" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '24px 32px', 
          marginBottom: '32px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.1) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '12px', background: 'rgba(0, 243, 255, 0.1)', borderRadius: '16px', border: '1px solid rgba(0, 243, 255, 0.2)' }}>
            <CalendarIcon size={32} color="#00f3ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0,243,255,0.6))' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>TRABAJOS</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Gestiona tus entregas, prioridades y estado de tareas en tiempo real.</p>
          </div>
        </div>
        <motion.button 
          className="click-press" 
          onClick={() => { setIsEditing(false); setFormData({ title: '', courseId: '', startDate: '', dueDate: '', deadlineTime: '23:59' }); setShowModal(true); }} 
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(6, 182, 212, 0.2)', boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)', borderColor: 'rgba(6, 182, 212, 0.6)' }}
          whileTap={{ scale: 0.95 }}
          style={{ 
            padding: '10px 28px', 
            fontWeight: 700, 
            borderRadius: '50px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            color: '#00f3ff', 
            border: '1px solid rgba(0, 243, 255, 0.3)', 
            backdropFilter: 'blur(10px)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.9rem', 
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0,243,255,0.15), inset 0 0 10px rgba(0,243,255,0.05)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'background-color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease'
          }}
        >
          <Plus size={18} style={{ position: 'relative', zIndex: 1 }} /> 
          <span style={{ position: 'relative', zIndex: 1 }}>NUEVO TRABAJO</span>
        </motion.button>
      </motion.header>

      {/* FILTROS NEON-PILLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', gap: '20px' }}>
        <InstitutionFilterPills activeFilter={currentFilter} onSelect={setCurrentFilter} extraOptions={['HISTORIAL']} />

        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="glass-panel click-press"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '10px 18px', 
              borderRadius: '12px', 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
          >
            <ArrowUpDown size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{currentSort}</span>
            <ChevronDown size={14} color="var(--text-muted)" style={{ transform: showSortMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>

          <AnimatePresence>
            {showSortMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 5, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  width: '180px',
                  background: 'rgba(10, 10, 10, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '8px',
                  zIndex: 100,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
              >
                {['RECIENTES', 'ALFABETICO', 'ENTREGA'].map(s => (
                  <button
                    key={s}
                    onClick={() => { setCurrentSort(s); setShowSortMenu(false); }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: currentSort === s ? 'rgba(0, 243, 255, 0.1)' : 'transparent',
                      color: currentSort === s ? '#00f3ff' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    {s}
                    {currentSort === s && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00f3ff' }} />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full" style={{
        display: isMobile && currentFilter !== 'HISTORIAL' ? 'flex' : (currentFilter === 'HISTORIAL' ? 'block' : 'grid'),
        flexDirection: isMobile ? 'column' : undefined,
        gridTemplateColumns: currentFilter === 'HISTORIAL' ? undefined : (isMobile ? undefined : 'repeat(4, minmax(0, 1fr))'),
        gap: '12px',
        flex: isMobile ? 'none' : 1,
        paddingBottom: '24px',
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        paddingLeft: 0,
        paddingRight: 0,
        boxSizing: 'border-box'
      }}>
        {currentFilter === 'HISTORIAL' ? (
          <TaskHistoryView tasks={tasks.filter(t => t.status === 'entregado' || t.status === 'ENTREGADO')} courses={courses} />
        ) : (
          COLUMNS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              ref={el => columnRefs.current[col.id] = el}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: '250px',
                width: '100%',
                boxSizing: 'border-box',
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '24px',
                overflowX: 'hidden'
              }}
            >
              <motion.div 
                animate={colTasks.length > 0 ? { boxShadow: [`0 0 0px ${col.accent}00`, `0 4px 20px ${col.accent}30`, `0 0 0px ${col.accent}00`] } : {}}
                transition={colTasks.length > 0 ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  background: `radial-gradient(circle at 0% 50%, ${col.accent}25 0%, rgba(255,255,255,0.02) 70%)`, 
                  borderBottom: `2px solid ${col.accent}`, 
                  borderTop: `1px solid rgba(255,255,255,0.15)`,
                  marginBottom: isMobile ? '10px' : '24px',
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1)`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <col.icon size={16} color={col.accent} style={{ filter: `drop-shadow(0 0 6px ${col.accent}80)` }} />
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em', margin: 0 }}>{col.label}</h3>
                </div>
                <div 
                  style={{ 
                    fontWeight: 900, 
                    fontSize: '0.75rem',
                    color: col.accent,
                    background: `rgba(15, 23, 42, 0.6)`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${col.accent}50`,
                    boxShadow: `0 0 10px ${col.accent}30`,
                    padding: '4px 12px',
                    borderRadius: '20px'
                  }}
                >
                  {colTasks.length}
                </div>
              </motion.div>
              {(!isMobile || colTasks.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: isMobile ? 'none' : 1, minHeight: isMobile ? '0' : '200px' }}>
                  <AnimatePresence>
                    {colTasks.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          height: '100px', 
                          color: 'var(--text-muted)', 
                          fontSize: '0.85rem', 
                          fontWeight: 500,
                          border: '1px dashed rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          marginTop: '10px'
                        }}
                      >
                        No hay tareas en esta fase
                      </motion.div>
                    ) : (
                      (col.id === 'entregado' ? colTasks.slice(0, 5) : colTasks).map(task => (
                        <CrumpleTossItem key={task.id} isCrumpled={Boolean(isPending(task.id))}>
                          <TaskCard
                            task={task}
                            onDelete={handleTaskDeleteWithUndo}
                            onEdit={handleEdit}
                            courses={courses}
                            onDragEnd={handleDragEnd}
                            onOpenDetail={() => setDetailTaskId(task.id)}
                          />
                        </CrumpleTossItem>
                      ))
                    )}
                  </AnimatePresence>
                  
                </div>
              )}
            </div>
          );
        })
        )}
      </div>

      {showModal && (
        <AnimatePresence>
          <div className="animate-backdrop" style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(5, 8, 18, 0.85)', 
            zIndex: 9999, 
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <motion.div 
              key="task-modal"
              ref={modalPanelRef} 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="glass-panel gamer-glow" 
              style={{ 
                width: '92%', 
                maxWidth: '500px',
                minWidth: 'min(320px, 90vw)',
                padding: '24px', 
                background: 'rgba(15, 15, 20, 0.92)', 
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(0, 243, 255, 0.2)',
                borderRadius: '16px',
                position: 'relative',
                zIndex: 10000,
                boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 0 20px rgba(0, 243, 255, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                overflow: 'visible'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'clamp(20px, 4vw, 32px)', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.8rem)', color: '#00f3ff', fontWeight: 950, textShadow: '0 0 10px rgba(0, 243, 255, 0.5)', margin: 0 }}>{isEditing ? 'EDITAR TRABAJO' : 'NUEVO TRABAJO'}</h2>
              <button 
                onClick={handleClose} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div ref={closeIconRef} style={{ display: 'flex', filter: 'drop-shadow(0 0 8px #ff0033)' }}>
                  <X size={28} color="#ff0033" strokeWidth={3} />
                </div>
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <input className="input" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="TÍTULO DEL TRABAJO *" style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px' }} />
              <CustomSelect
                value={formData.courseId}
                onChange={(val) => setFormData({ ...formData, courseId: val })}
                options={[
                  { value: '', label: 'Selecciona materia...' },
                  ...courses.map(c => ({ value: c.id, label: c.name }))
                ]}
                placeholder="Selecciona materia..."
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px' }}>
                {/* FECHA INICIO */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.65rem', 
                    fontWeight: 800, 
                    color: 'rgba(255, 255, 255, 0.5)', 
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    FECHA INICIO
                  </label>
                  <div onClick={() => setActivePicker('start')} className="input" style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '14px 12px', 
                    borderRadius: '10px', 
                    minWidth: 0 
                  }}>
                    <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                      {(formData.startDate || '').split('T')[0] || 'Selecciona...'}
                    </span>
                    <CalendarIcon size={16} color="var(--text-primary)" style={{ flexShrink: 0, marginLeft: '8px', opacity: 0.6 }} />
                  </div>
                </div>

                {/* FECHA LÍMITE (destacada con cyan) */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.65rem', 
                    fontWeight: 800, 
                    color: '#00f3ff', 
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    FECHA LÍMITE *
                  </label>
                  <div onClick={() => setActivePicker('due')} className="input" style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '14px 12px', 
                    borderRadius: '10px', 
                    minWidth: 0,
                    border: '1px solid rgba(0, 243, 255, 0.2)'
                  }}>
                    <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                      {(formData.dueDate || '').split('T')[0] || 'Selecciona...'}
                    </span>
                    <CalendarIcon size={16} color="#00f3ff" style={{ flexShrink: 0, marginLeft: '8px' }} />
                  </div>
                </div>

                {/* HORA LÍMITE */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.65rem', 
                    fontWeight: 800, 
                    color: '#00f3ff', 
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    HORA LÍMITE
                  </label>
                  <CustomTimePicker 
                    value={formData.deadlineTime || '23:59'} 
                    onChange={(val) => setFormData({ ...formData, deadlineTime: val })} 
                  />
                </div>
              </div>
              {activePicker && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10002 }}><CustomCalendar selectedDate={activePicker === 'start' ? formData.startDate : formData.dueDate} onDateSelect={(d) => { setFormData({ ...formData, [activePicker === 'start' ? 'startDate' : 'dueDate']: d.split('T')[0] }); setActivePicker(null); }} onClose={() => setActivePicker(null)} /></div>}
              <div style={{ display: 'flex', gap: 'clamp(12px, 2vw, 16px)', justifyContent: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                <ModalButton label="CANCELAR" onClick={handleClose} variant="cancel" />
                <ModalButton 
                  label="GUARDAR" 
                  type="submit" 
                  variant="save" 
                  disabled={!formData.title || !formData.courseId} 
                />
              </div>
            </form>
          </motion.div>
          </div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {taskToDelete && (
          <ConfirmDeleteModal
            onClose={() => setTaskToDelete(null)}
            onConfirm={() => {
              deleteTask(taskToDelete);
              setTaskToDelete(null);
            }}
            title="Eliminar trabajo"
            message="¿Seguro que quieres eliminar este trabajo? Esta acción no se puede deshacer."
          />
        )}
      </AnimatePresence>
      <UndoToastContainer pendingItems={pendingItems} onUndo={undoDelete} />

      {/* Drawer Cyber Luxe de Desglose de Ejercicios y Bloc de Notas */}
      <TaskDetailDrawer
        isOpen={Boolean(detailTask)}
        onClose={() => setDetailTaskId(null)}
        task={detailTask}
        courses={courses}
        onUpdateSubtasks={updateSubtasks}
        onUpdateNotes={updateTaskNotes}
      />
    </div>
  );
};

const ModalButton = ({ label, onClick, type = "button", variant, disabled }) => {
  return (
    <motion.button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      whileHover={!disabled ? { 
        scale: 1.02, 
        boxShadow: variant === 'save' ? '0 0 15px rgba(0, 242, 255, 0.5)' : '0 0 15px rgba(239, 68, 68, 0.5)',
        borderColor: variant === 'save' ? 'rgba(0, 242, 255, 1)' : 'rgba(239, 68, 68, 1)'
      } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ hover: { duration: 0.3, ease: "easeOut" }, tap: { duration: 0.1 } }}
      style={{ 
        width: 'clamp(140px, 40vw, 180px)', 
        height: 'clamp(42px, 10vw, 48px)', 
        padding: '0 clamp(16px, 4vw, 24px)', 
        borderRadius: '12px', 
        background: variant === 'save' ? 'rgba(0, 243, 255, 0.08)' : 'rgba(255, 77, 77, 0.08)', 
        border: variant === 'save' ? '1px solid rgba(0, 243, 255, 0.3)' : '1px solid rgba(255, 77, 77, 0.3)', 
        color: variant === 'save' ? '#00f3ff' : '#ff4d4d', 
        fontWeight: 800, 
        fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', 
        cursor: disabled ? 'not-allowed' : 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        textTransform: 'uppercase',
        opacity: disabled ? 0.3 : 1,
        transition: 'all 0.3s ease'
      }}
    >
      {label}
    </motion.button>
  );
};

function ConfirmDeleteModal({ onClose, onConfirm, title, message }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()} 
        style={{ 
          width: '100%', maxWidth: '420px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px',
          background: 'linear-gradient(135deg, rgba(30,15,15,0.95) 0%, rgba(20,10,10,0.98) 100%)',
          border: '1px solid rgba(255,59,48,0.2)', borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 0 40px rgba(255,59,48,0.05)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '4px', background: 'linear-gradient(90deg, transparent, rgba(255,59,48,0.6), transparent)'
        }} />
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff3b30', margin: '0 auto', boxShadow: '0 0 30px rgba(255,59,48,0.2)'
        }}>
          <Trash2 size={26} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '1.4rem', color: '#fff', letterSpacing: '0.5px' }}>{title}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
          <button type="button" onClick={onClose} className="click-press" 
            onMouseEnter={(e) => {
              const liquid = e.currentTarget.querySelector('.liquid-fill-cancel');
              if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(1.2)'; liquid.style.opacity = '1'; }
            }}
            onMouseLeave={(e) => {
              const liquid = e.currentTarget.querySelector('.liquid-fill-cancel');
              if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(0)'; liquid.style.opacity = '0'; }
            }}
            style={{ 
              padding: '12px 24px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', 
              color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700, transition: 'all 0.3s ease',
              position: 'relative', overflow: 'hidden', letterSpacing: '1px', flex: 1
            }}>
            <div className="liquid-fill-cancel" style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(0)',
              width: '150%', aspectRatio: '1/1', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
              opacity: 0, transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)', pointerEvents: 'none', zIndex: 0
            }} />
            <span style={{ position: 'relative', zIndex: 1 }}>CANCELAR</span>
          </button>
          
          <BinEatButton
            onConfirm={onConfirm}
            label="ELIMINAR"
            size="md"
            ariaLabel="Confirmar eliminación de trabajo"
            style={{ flex: 1, height: '46px' }}
          />
        </div>
      </motion.div>
    </div>
  );
}

const CustomTimePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [hours, minutes] = (value || '23:59').split(':');

  const handleHourClick = (h) => {
    onChange(`${h.toString().padStart(2, '0')}:${minutes}`);
  };

  const handleMinuteClick = (m) => {
    onChange(`${hours}:${m.toString().padStart(2, '0')}`);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.03)', 
          padding: '13px 12px', 
          borderRadius: '10px', 
          minWidth: 0,
          border: '1px solid rgba(0, 243, 255, 0.2)',
          cursor: 'pointer',
          transition: 'border 0.3s'
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          {value || '23:59'}
        </span>
        <Clock size={16} color="#00f3ff" style={{ flexShrink: 0, marginLeft: '8px' }} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '100%',
              minWidth: '150px',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              border: '1px solid rgba(0, 243, 255, 0.3)',
              padding: '12px',
              zIndex: 1000,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(0, 243, 255, 0.1)',
              display: 'flex',
              gap: '8px',
              height: '180px'
            }}
          >
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }} className="custom-scrollbar-mini">
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '4px', fontWeight: 800 }}>HORA</div>
              {Array.from({ length: 24 }, (_, i) => i).map(h => {
                const isSelected = parseInt(hours) === h;
                return (
                  <div
                    key={h}
                    onClick={() => handleHourClick(h)}
                    style={{
                      padding: '6px',
                      textAlign: 'center',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      background: isSelected ? 'rgba(0, 243, 255, 0.15)' : 'transparent',
                      color: isSelected ? '#00f3ff' : 'var(--text-primary)',
                      border: isSelected ? '1px solid rgba(0, 243, 255, 0.4)' : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    {h.toString().padStart(2, '0')}
                  </div>
                )
              })}
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '4px' }} className="custom-scrollbar-mini">
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '4px', fontWeight: 800 }}>MINUTO</div>
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 59].map(m => {
                const isSelected = parseInt(minutes) === m;
                return (
                  <div
                    key={m}
                    onClick={() => { handleMinuteClick(m); setIsOpen(false); }}
                    style={{
                      padding: '6px',
                      textAlign: 'center',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      background: isSelected ? 'rgba(0, 243, 255, 0.15)' : 'transparent',
                      color: isSelected ? '#00f3ff' : 'var(--text-primary)',
                      border: isSelected ? '1px solid rgba(0, 243, 255, 0.4)' : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    {m.toString().padStart(2, '0')}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskBoard;

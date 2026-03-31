import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTasksContext } from '../context/TaskContext';
import { Plus, X, GripVertical, Calendar as CalendarIcon, Trash2, Edit2, Filter, ArrowUpDown, ChevronDown } from 'lucide-react';
import CustomCalendar from '../components/ui/CustomCalendar';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// GSAP IMPORTS
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { RoughEase, SlowMo } from "gsap/EasePack";

gsap.registerPlugin(useGSAP, RoughEase, SlowMo, CustomEase);

// COLUMNAS OFICIALES
const COLUMNS = [
  { id: 'sin entregar', label: 'SIN ENTREGAR', accent: 'var(--text-secondary)', badgeClass: 'badge-todo' },
  { id: 'en proceso',   label: 'EN PROCESO',   accent: 'var(--accent-primary)',  badgeClass: 'badge-doing' },
  { id: 'revisión',     label: 'REVISIÓN',     accent: '#ffcc00',                badgeClass: 'badge-revision' },
  { id: 'entregado',    label: 'ENTREGADO',    accent: 'var(--accent-lime)',     badgeClass: 'badge-submitted' },
];

const TaskCard = ({ task, onDelete, onEdit, courses, onDragEnd }) => {
  const courseObj = courses?.find(c => c.id === task.course_id);
  const accentColor = courseObj?.color || 'var(--accent-primary)';

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  };

  const displayDate = formatDate(task.deadline || task.due_date);

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
      className="glass-panel task-card-alfa"
      style={{
        padding: '20px',
        marginBottom: '16px',
        borderTop: '1px solid var(--border-glass-top)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '16px',
        cursor: 'grab',
        touchAction: 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <GripVertical size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: `${accentColor}15`, padding: '4px 10px', borderRadius: '6px',
            border: `1px solid ${accentColor}33`, maxWidth: '100%', overflow: 'hidden'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: accentColor, fontWeight: 800, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {courseObj?.name || 'General'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <motion.button 
            whileHover={{ scale: 1.15, color: '#ffffff' }}
            className="btn-icon-alfa edit-hover" 
            style={{ opacity: 1, cursor: 'pointer', color: '#00f3ff' }}
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          >
            <Edit2 size={16} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.15, color: '#00f3ff' }}
            className="btn-icon-alfa delete-hover" 
            style={{ opacity: 1, cursor: 'pointer', color: '#ff4d4d' }}
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          >
            <Trash2 size={16} />
          </motion.button>
        </div>
      </div>
      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff' }}>{task.title}</h4>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
        {displayDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarIcon size={12} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>{displayDate}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const TaskBoard = () => {
  const { tasks, setTasks, updateTaskStatus, deleteTask, updateTask, addTask, courses, tasksLoading } = useTasksContext();
  const { t } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);

  React.useEffect(() => {
    if (location.state?.openModal) {
      setShowModal(true);
      // Limpiar el estado para que no se abra de nuevo al recargar
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [formData, setFormData] = useState({ title: '', courseId: '', startDate: '', dueDate: '' });
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
    } catch {}
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
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: targetColumn } : t));
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
      dueDate: (task.deadline || task.due_date) ? (task.deadline || task.due_date).split('T')[0] : ''
    });
    setEditingTaskId(task.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.courseId) return;

    // Validación y formateo de fechas a ISO (YYYY-MM-DD)
    const formatDateToISO = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    // MAPEO EXPLÍCITO DE ID DE MATERIA (FRONT -> BACK)
    const taskData = { 
      title: formData.title, 
      course_id: formData.courseId, // ASEGURAR UUID DE MATERIA
      start_date: formatDateToISO(formData.startDate), 
      deadline: formatDateToISO(formData.dueDate)
    };

    // ALFA_DEBUG: Verificación de integridad de datos antes del envío


    try {
      if (isEditing) {
        await updateTask(editingTaskId, taskData);
      } else {
        await addTask({ ...taskData, status: 'sin entregar' });
      }
      handleClose();
      setFormData({ title: '', courseId: '', startDate: '', dueDate: '' });
    } catch (err) { 
      console.error("ALFA_SAVE_ERROR:", err); 
    }
  };

  if (tasksLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--accent-primary)' }}><div className="animate-pulse font-display" style={{ fontWeight: 900, fontSize: '1.2rem' }}>//_SINCRONIZANDO...</div></div>;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', padding: '32px 48px', minHeight: '100%' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass-top)', paddingBottom: '32px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '3.2rem', margin: 0, fontWeight: 950 }}>TRABAJOS</h1>
        </div>
        <button 
          ref={btnNewRef} 
          className="click-press" 
          onClick={() => { setIsEditing(false); setFormData({ title: '', courseId: '', startDate: '', dueDate: '' }); setShowModal(true); }} 
          style={{ 
            padding: '10px 28px', 
            fontWeight: 700, 
            borderRadius: '50px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            color: '#00f3ff', 
            border: '1px solid #00f3ff', 
            backdropFilter: 'blur(10px)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.9rem', 
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div 
            ref={liquidRef}
            style={{
              background: 'radial-gradient(circle, rgba(0, 243, 255, 0.4) 0%, rgba(0, 243, 255, 0) 70%)',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) scale(0)',
              borderRadius: '50%',
              width: '150%',
              aspectRatio: '1/1',
              pointerEvents: 'none',
              opacity: 0,
              zIndex: 0
            }}
          />
          <Plus size={18} style={{ position: 'relative', zIndex: 1 }} /> 
          <span style={{ position: 'relative', zIndex: 1 }}>NUEVO TRABAJO</span>
        </button>
      </header>

      {/* FILTROS NEON-PILLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {['TODAS', 'UNAD', 'SENA', 'PERSONALIZADO'].map(f => {
            const getNeonColor = (filter) => {
              switch(filter) {
                case 'TODAS': return '#00f3ff'; // Cyan
                case 'UNAD': return '#ffcc00';  // Yellow
                case 'SENA': return '#00ff88';  // Green
                case 'PERSONALIZADO': return '#bc13fe'; // Purple
                default: return '#00f3ff';
              }
            };
            const neonColor = getNeonColor(f);
            const isActive = currentFilter === f;

            return (
              <button
                key={f}
                onClick={() => {
                  setCurrentFilter(f);
                  const freqs = { TODAS: 800, UNAD: 1000, SENA: 1200, PERSONALIZADO: 1500 };
                  playClick(freqs[f] || 800);
                }}
                style={{
                  padding: '10px 24px',
                  borderRadius: '50px',
                  border: isActive ? `2px solid ${neonColor}` : '2px solid rgba(255,255,255,0.05)',
                  background: isActive ? `${neonColor}15` : 'rgba(255,255,255,0.02)',
                  color: isActive ? neonColor : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isActive ? `0 0 20px ${neonColor}33, inset 0 0 10px ${neonColor}11` : 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                <div style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: isActive ? neonColor : 'rgba(255,255,255,0.2)',
                  boxShadow: isActive ? `0 0 10px ${neonColor}` : 'none'
                }} />
                {f}
              </button>
            );
          })}
        </div>

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
              color: '#fff'
            }}
          >
            <ArrowUpDown size={16} color="#00f3ff" />
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

      <div style={{ display: 'flex', gap: '32px', flex: 1, paddingBottom: '24px', minWidth: 'fit-content' }}>
        {COLUMNS.map(col => (
          <div key={col.id} ref={el => columnRefs.current[col.id] = el} style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', borderBottom: `2px solid ${col.accent}`, marginBottom: '20px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{col.label}</h3>
              <span className={`badge ${col.badgeClass}`} style={{ fontWeight: 950 }}>{filteredTasks.filter(t => t.status === col.id).length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '200px' }}>
              <AnimatePresence>
                {filteredTasks.filter(t => t.status === col.id).map(task => (
                  <TaskCard key={task.id} task={task} onDelete={deleteTask} onEdit={handleEdit} courses={courses} onDragEnd={handleDragEnd} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <AnimatePresence>
          <div className="animate-backdrop" style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)', 
            zIndex: 9999, 
            backdropFilter: 'blur(20px)',
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
                width: '90%', 
                maxWidth: '520px', 
                padding: '40px', 
                background: 'rgba(15, 15, 20, 0.85)', 
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(0, 243, 255, 0.25)',
                borderRadius: '24px',
                position: 'relative',
                zIndex: 10000,
                boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 40px rgba(0, 243, 255, 0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.8rem', color: '#00f3ff', fontWeight: 950, textShadow: '0 0 10px rgba(0, 243, 255, 0.5)' }}>{isEditing ? 'EDITAR TRABAJO' : 'NUEVO TRABAJO'}</h2>
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
              <select 
                className="select" 
                required
                value={formData.courseId} 
                onChange={e => setFormData({ ...formData, courseId: e.target.value })} 
                style={{ 
                  background: '#121212', 
                  color: '#fff',
                  padding: '14px', 
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="" style={{ background: '#121212', color: '#fff' }}>Selecciona materia...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id} style={{ background: '#121212', color: '#fff' }}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div onClick={() => setActivePicker('start')} className="input" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px' }}>{(formData.startDate || '').split('T')[0] || 'FECHA...'} <CalendarIcon size={16} color="#00f3ff" /></div>
                <div onClick={() => setActivePicker('due')} className="input" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px' }}>{(formData.dueDate || '').split('T')[0] || 'LÍMITE...'} <CalendarIcon size={16} color="#00f3ff" /></div>
              </div>
              {activePicker && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10002 }}><CustomCalendar selectedDate={activePicker === 'start' ? formData.startDate : formData.dueDate} onDateSelect={(d) => { setFormData({ ...formData, [activePicker === 'start' ? 'startDate' : 'dueDate']: d.split('T')[0] }); setActivePicker(null); }} onClose={() => setActivePicker(null)} /></div>}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '10px' }}>
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
    </div>
  );
};

const ModalButton = ({ label, onClick, type = "button", variant, disabled }) => {
  return (
    <motion.button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ 
        width: '180px', 
        height: '48px', 
        padding: '0 24px', 
        borderRadius: '12px', 
        background: variant === 'save' ? 'rgba(0, 243, 255, 0.08)' : 'rgba(255, 77, 77, 0.08)', 
        border: variant === 'save' ? '1px solid rgba(0, 243, 255, 0.3)' : '1px solid rgba(255, 77, 77, 0.3)', 
        color: variant === 'save' ? '#00f3ff' : '#ff4d4d', 
        fontWeight: 800, 
        fontSize: '0.9rem', 
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

export default TaskBoard;

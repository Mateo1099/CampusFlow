import React, { useMemo, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTasksContext } from '../context/TaskContext';
import { parseISO, differenceInDays, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Timer, Zap, Target, Activity, Flame, AlertCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { tasks, courses, tasksLoading, coursesLoading } = useTasksContext();
  const { t, settings } = useSettings();
  const navigate = useNavigate();
  const [currentFilter, setCurrentFilter] = useState('TODAS');
  const [selectedDay, setSelectedDay] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  const playClick = (freq = 800) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {}
  };

  const filteredCourses = useMemo(() => {
    if (currentFilter === 'TODAS') return courses;
    return courses.filter(c => (c.institution || '').toUpperCase() === currentFilter.toUpperCase());
  }, [courses, currentFilter]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filtro por institución
      if (currentFilter !== 'TODAS') {
        const course = courses.find(c => c.id === task.course_id);
        if ((course?.institution || '').toUpperCase() !== currentFilter.toUpperCase()) return false;
      }
      return true;
    });
  }, [tasks, currentFilter, courses]);

  // RADAR DE ENTREGAS: Próximos 14 días
  const upcomingTasks = useMemo(() => {
    return filteredTasks.filter(task => {
      const status = (task.status || '').toLowerCase();
      if (status === 'entregado' || status === 'submitted') return false;
      if (!task.deadline && !task.due_date) return false;
      try {
        const deadlineDate = parseISO(task.deadline || task.due_date);
        const daysLeft = differenceInDays(deadlineDate, startOfDay(new Date()));
        // Si no hay día seleccionado, mostramos el rango de 14 días habitual
        if (selectedDay === null) return daysLeft >= -1 && daysLeft <= 14;
        return true; // Si hay día seleccionado, mostramos todas las de ese día
      } catch { return false; }
    }).sort((a, b) => new Date(a.deadline || a.due_date) - new Date(b.deadline || b.due_date));
  }, [filteredTasks, selectedDay]);

  const pendingCount = useMemo(() => {
    return filteredTasks.filter(t => {
      const status = (t.status || '').toLowerCase();
      return status === 'sin entregar' || status === 'en proceso';
    }).length;
  }, [filteredTasks]);

  // PRIORIDAD MÁXIMA: Tarea con deadline más próximo
  const { bigBossTask, bigBossColor } = useMemo(() => {
    const task = upcomingTasks[0] || null;
    let color = '#00ff66';
    if (task) {
      try {
        const deadlineDate = parseISO(task.deadline || task.due_date);
        const days = differenceInDays(deadlineDate, startOfDay(new Date()));
        const hoursLeft = (deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);

        if (hoursLeft < 6) color = '#ff0033';
        else if (days < 2) color = '#ff8800';
        else color = '#00ff66';
      } catch {}
    }
    return { bigBossTask: task, bigBossColor: color };
  }, [upcomingTasks, courses]);

  // MATRIZ DE ESFUERZO (Detalles de tareas por día para Células de Energía)
  const effortMatrixDetails = useMemo(() => {
    const matrix = [[], [], [], [], [], [], []]; // L-D
    filteredTasks.forEach(task => {
      // Solo contamos tareas no entregadas para la "carga"
      const status = (task.status || '').toLowerCase();
      if (status === 'entregado' || status === 'submitted') return;

      if (!task.deadline && !task.due_date) return;
      try {
        const date = parseISO(task.deadline || task.due_date);
        let day = date.getDay(); // 0 is Sunday
        day = day === 0 ? 6 : day - 1; // Convert to 0-6 (L-D)
        if (day >= 0 && day <= 6) {
          const course = courses.find(c => c.id === task.course_id);
          matrix[day].push({
            id: task.id,
            title: task.title,
            priority: task.priority || 'media',
            institution: course?.institution || 'PERSONALIZADO',
            color: course?.color || '#00f3ff'
          });
        }
      } catch {}
    });
    return matrix;
  }, [filteredTasks, courses]);

  if (tasksLoading || coursesLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--accent-primary)' }}>
        <div className="animate-pulse font-display" style={{ fontWeight: 800 }}>//_CARGANDO_SISTEMA...</div>
      </div>
    );
  }

  const daysLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const fullDaysLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const formatDateLegible = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long' });
    } catch { return dateStr; }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '32px 48px', position: 'relative', overflow: 'visible', minHeight: '100%' }}>
      {/* Watermark gigante */}
      <div style={{ position: 'absolute', top: '-60px', left: '-20px', fontSize: '14rem', fontWeight: 900, color: 'rgba(255,255,255,0.02)', zIndex: -1, fontFamily: 'var(--font-display)', userSelect: 'none', pointerEvents: 'none' }}>
        HUB
      </div>



      <header className="page-header" style={{ marginBottom: '40px' }}>
        <h1 className="page-title" style={{
          fontSize: '4rem',
          margin: 0,
          fontWeight: 900,
          fontFamily: 'var(--font-body)',
          background: 'linear-gradient(to right, #00f3ff, #bc13fe)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em'
        }}>
          Bienvenido a CampusFlow
        </h1>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', gap: '20px' }}>
        {/* FILTROS NEON-PILLS */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {['TODAS', 'UNAD', 'SENA', 'PERSONALIZADO'].map(f => {
            const isActive = currentFilter === f;
            const neonColor = f === 'TODAS' ? '#00f3ff' : 
                              f === 'UNAD' ? '#ffcc00' : 
                              f === 'SENA' ? '#00ff88' : '#bc13fe';

            return (
              <button
                key={f}
                onClick={() => {
                  setCurrentFilter(f);
                  setSelectedDay(null); // Reset day filter on institution change
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

        <div style={{ display: 'flex', gap: '12px' }}>
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: '0 0 15px #00f3ff' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { playClick(1200); navigate('/tasks', { state: { openModal: true } }); }}
            style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(0, 243, 255, 0.1)', color: '#00f3ff', border: '1px solid rgba(0, 243, 255, 0.3)', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            <Plus size={16} /> NUEVO TRABAJO
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: '0 0 15px #ffcc00' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { playClick(1500); navigate('/pomodoro'); }}
            style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(255, 204, 0, 0.1)', color: '#ffcc00', border: '1px solid rgba(255, 204, 0, 0.3)', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            <Timer size={16} /> POMODORO
          </motion.button>
        </div>
      </div>

      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>

        {/* Métricas grandes */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => navigate('/agenda')}
          className="glass-panel glass-card-hover" 
          style={{ gridColumn: 'span 4', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        >
          <Activity color="var(--accent-primary)" size={40} style={{ opacity: 0.15, position: 'absolute', top: '16px', right: '16px' }} />
          <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{t.activeSubjects}</p>
          <h3 key={filteredCourses.length} className="animate-number-pop" style={{ fontSize: '4.5rem', fontWeight: 900, margin: '8px 0 -8px', fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--accent-primary)', display: 'inline-block' }}>
            {String(filteredCourses.length).padStart(2, '0')}
          </h3>
          <div style={{ width: '100%', height: '2px', background: 'var(--border-glass-top)', marginTop: '24px', position: 'relative', borderRadius: '1px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(filteredCourses.length * 10, 100)}%`, background: 'var(--accent-primary)', boxShadow: `0 0 8px var(--accent-primary)`, borderRadius: '1px', transition: 'width 0.6s var(--ease-out-expo)' }} />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => navigate('/tasks')}
          className="glass-panel glass-card-hover" 
          style={{ gridColumn: 'span 4', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        >
          <Target color="var(--accent-secondary)" size={40} style={{ opacity: 0.15, position: 'absolute', top: '16px', right: '16px' }} />
          <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{t.pendingTasks}</p>
          <h3 key={pendingCount} className="animate-number-pop" style={{ fontSize: '4.5rem', fontWeight: 900, margin: '8px 0 -8px', fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--accent-secondary)', display: 'inline-block' }}>
            {String(pendingCount).padStart(2, '0')}
          </h3>
          <div style={{ width: '100%', height: '2px', background: 'var(--border-glass-top)', marginTop: '24px', position: 'relative', borderRadius: '1px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(pendingCount * 10, 100)}%`, background: 'var(--accent-secondary)', boxShadow: `0 0 8px var(--accent-secondary)`, borderRadius: '1px', transition: 'width 0.6s var(--ease-out-expo)' }} />
          </div>
        </motion.div>

        {/* PRIORIDAD MÁXIMA - Tarea más próxima */}
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px', background: `linear-gradient(135deg, ${bigBossColor}15 0%, rgba(255, 77, 77, 0.02) 100%)`, border: `1px solid ${bigBossColor}33`, position: 'relative', overflow: 'hidden' }}>
          <Flame color={bigBossColor} size={60} style={{ opacity: 0.1, position: 'absolute', bottom: '-10px', right: '-10px' }} />
          <h2 style={{ fontSize: '0.75rem', fontWeight: 900, color: bigBossColor, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} /> PRIORIDAD MÁXIMA
          </h2>
          {bigBossTask ? (
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 950, margin: '0 0 8px', color: '#fff' }}>{bigBossTask.title}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '12px' }}>
                {formatDateLegible(bigBossTask.deadline || bigBossTask.due_date)} - {courses.find(c => c.id === bigBossTask.course_id)?.name || 'Sin Materia'}
              </p>
              <div style={{ display: 'inline-flex', padding: '6px 14px', background: `${bigBossColor}22`, borderRadius: '6px', border: `1px solid ${bigBossColor}33` }}>
                <span style={{ color: bigBossColor, fontWeight: 900, fontSize: '0.75rem' }}>
                  //_OBJETIVO_CRÍTICO
                </span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>SIN AMENAZAS PRÓXIMAS</p>
          )}
        </div>

        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 4', gridRow: 'span 2', padding: '28px', background: 'rgba(0, 243, 255, 0.02)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', color: 'var(--accent-primary)', fontWeight: 900 }}>
              <Zap size={18} /> {selectedDay !== null ? `Entregas ${daysLabels[selectedDay]}:` : 'Proximas Entregas:'}
            </h2>
            {selectedDay !== null && (
              <button 
                onClick={() => setSelectedDay(null)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: '0.65rem', fontWeight: 900, padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase' }}
              >
                Reset
              </button>
            )}
          </div>

          {upcomingTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.4 }}>
              <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: '0.9rem', fontWeight: 800 }}>{t.noDeliveries}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {upcomingTasks.map(task => {
                let days;
                let hoursLeft;
                try { 
                  const deadlineDate = parseISO(task.deadline || task.due_date);
                  days = differenceInDays(deadlineDate, new Date());
                  hoursLeft = (deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
                } catch { days = 99; hoursLeft = 999; }
                
                // LÓGICA DE COLORES Y ANIMACIÓN (RADAR 2.0)
                let glowColor = '#00ff66'; // VERDE (Default / > 5 días)
                let glowSpeed = '4s';      // Brillo lento
                
                if (hoursLeft < 6) {
                  glowColor = '#ff0033';   // ROJO (< 6 horas)
                  glowSpeed = '0.8s';      // Parpadeo rápido
                } else if (days < 2) {
                  glowColor = '#ff8800';   // NARANJA (< 2 días)
                  glowSpeed = '2s';        // Brillo medio
                } else if (days <= 5) {
                  glowColor = '#00ff66';   // VERDE (Gap 2-5 días)
                  glowSpeed = '4s';
                }

                const taskCourse = courses.find(c => c.id === task.course_id);
                
                return (
                  <motion.div 
                    key={task.id} 
                    style={{ 
                      position: 'relative', 
                      padding: '14px',
                      paddingLeft: '18px', 
                      borderLeft: `3px solid ${glowColor}`,
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '0 12px 12px 0',
                      boxShadow: `0 0 15px ${glowColor}11`
                    }}
                    animate={{
                      boxShadow: [
                        `0 0 5px ${glowColor}22`,
                        `0 0 20px ${glowColor}44`,
                        `0 0 5px ${glowColor}22`
                      ]
                    }}
                    transition={{
                      duration: parseFloat(glowSpeed),
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontWeight: 900, color: '#fff' }}>{task.title}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {taskCourse && taskCourse.name}
                      </p>
                      <span style={{ color: glowColor, fontWeight: 950, fontSize: '0.75rem', textShadow: `0 0 8px ${glowColor}66` }}>
                        {days < 0 ? 'VENCIDO' : days === 0 ? 'HOY' : `${days}D`}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* MATRIZ DE ESFUERZO - Células de Energía */}
        <div className="glass-panel" style={{ gridColumn: 'span 8', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={16} color="var(--accent-secondary)" /> CARGA SEMANAL
            </h2>
            {selectedDay !== null && (
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Filtro: {fullDaysLabels[selectedDay]}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '16px' }}>
            {effortMatrixDetails.map((dayTasks, idx) => {
              const isActive = selectedDay === idx;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative' }}>
                  <motion.div 
                    onMouseEnter={() => setHoveredDay(idx)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => {
                      playClick(900);
                      setSelectedDay(isActive ? null : idx);
                    }}
                    whileHover={{ scale: 1.02 }}
                    style={{ 
                      width: '100%', 
                      minHeight: '140px', 
                      background: isActive ? 'rgba(0, 243, 255, 0.08)' : 'rgba(255,255,255,0.02)', 
                      borderRadius: '12px', 
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      gap: '6px',
                      border: isActive ? '1px solid rgba(0, 243, 255, 0.5)' : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: isActive ? '0 0 20px rgba(0, 243, 255, 0.2)' : 'none',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'visible'
                    }}
                  >
                    <AnimatePresence>
                      {hoveredDay === idx && dayTasks.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            bottom: '45px',
                            zIndex: 50,
                            pointerEvents: 'auto',
                            padding: '12px 16px',
                            background: 'rgba(10, 10, 10, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(0, 243, 255, 0.4)',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.8), 0 0 20px rgba(0, 243, 255, 0.2)',
                            width: 'fit-content',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <h4 style={{ margin: '0 0 10px', fontSize: '0.65rem', fontWeight: 900, color: '#00f3ff', textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '1px solid rgba(0, 243, 255, 0.2)', paddingBottom: '6px', whiteSpace: 'nowrap' }}>
                            {fullDaysLabels[idx]}
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', whiteSpace: 'normal' }}>
                            {dayTasks.sort((a, b) => {
                              const priorities = { alta: 3, media: 2, baja: 1 };
                              return (priorities[b.priority] || 0) - (priorities[a.priority] || 0);
                            }).map(t => (
                              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                                <div style={{ width: '6px', height: '6px', minWidth: '6px', borderRadius: '50%', background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{t.title}</p>
                                  <p style={{ margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, whiteSpace: 'nowrap' }}>{t.institution}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {dayTasks.map((taskInfo, tIdx) => (
                      <motion.div 
                        key={taskInfo.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: tIdx * 0.05 }}
                        style={{
                          width: '100%',
                          height: '14px',
                          borderRadius: '4px',
                          border: `1px solid ${taskInfo.color}`,
                          background: `${taskInfo.color}33`,
                          boxShadow: `0 0 8px ${taskInfo.color}44`,
                          flexShrink: 0
                        }}
                      />
                    ))}
                    {dayTasks.length === 0 && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '100%', height: '100%', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '6px' }} />
                      </div>
                    )}
                  </motion.div>
                  <span style={{ fontSize: '0.7rem', color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: 800 }}>{daysLabels[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Materias filtradas */}
        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 8', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontWeight: 900 }}>{t.subjects}</h2>
            <button onClick={() => navigate('/agenda')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              VER TODAS <ChevronRight size={14} />
            </button>
          </div>
          {filteredCourses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>{t.emptyDatabase}</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {filteredCourses.map(c => {
                const displayColor = c.color || 'var(--accent-primary)';
                return (
                  <div key={c.id} style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)', border: `1px solid ${displayColor}`, color: displayColor, fontSize: '0.8rem', fontFamily: 'var(--font-display)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: `0 0 10px ${displayColor}33`, background: `${displayColor}05` }}>
                    {c.name}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

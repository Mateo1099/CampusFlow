import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTasksContext } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Timer, Zap, Target, Activity, Flame, AlertCircle, ChevronRight, BrainCircuit, Clock3, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const parseLocalDeadline = (dateStr) => {
  if (!dateStr) return new Date();
  const datePart = typeof dateStr === 'string' ? dateStr.split(/[T ]/)[0] : '';
  if (!datePart) return new Date();
  // Al anexar T00:00:00, al usar new Date(...) asume zona horaria local desde el formato ISO corto modificado.
  return new Date(`${datePart}T00:00:00`);
};

// Cálculo exácto por días calendario, contando todos los días intermedios (+ Math.ceil por margen de error)
const calculateRemainingDays = (deadlineDate) => {
  const startTarget = startOfDay(deadlineDate);
  const startToday = startOfDay(new Date());
  const diffTime = startTarget.getTime() - startToday.getTime();
  return Math.ceil(diffTime / (1000 * 3600 * 24));
};

const Dashboard = () => {
  const { user } = useAuth();
  const { tasks, courses, tasksLoading, coursesLoading } = useTasksContext();
  const { t, settings } = useSettings();
  const navigate = useNavigate();
  const [currentFilter, setCurrentFilter] = useState('TODAS');
  const [selectedDay, setSelectedDay] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  // Analítica PRO -> Dashboard Integration
  const {
    totalTasks,
    completedTasks,
    totalHabits,
    completedHabits,
    totalMinutes,
    completedBlocks,
    pendingBlocks,
    minutesByTime,
    loading: analyticsLoading
  } = useAnalytics();

  const formatMinutes = (value) => {
    const min = Number(value);
    if (!Number.isFinite(min) || min <= 0) return '0 min';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Calculate pending tasks
  const pendingTasks = Math.max(totalTasks - completedTasks, 0);

  // Calculate completion rate
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Determine if analytics is empty for new dashboard section
  const isAnalyticsDashboardEmpty = analyticsLoading || (totalTasks === 0 && totalMinutes === 0 && totalHabits === 0);

  const getSmartInsight = () => {
    const hasBlocks = (completedBlocks + pendingBlocks) > 0;
    if (!hasBlocks && totalMinutes === 0) return 'Aún no hay planificación suficiente.';
    if (pendingBlocks > completedBlocks) return 'Tienes bloques pendientes esta semana.';
    if (minutesByTime?.morning > minutesByTime?.afternoon && minutesByTime?.morning > minutesByTime?.night) return 'Tu mayor carga está en la mañana.';
    if (minutesByTime?.night > minutesByTime?.morning && minutesByTime?.night > minutesByTime?.afternoon) return 'Tu mayor carga está en la noche.';
    if (minutesByTime?.afternoon > minutesByTime?.morning && minutesByTime?.afternoon > minutesByTime?.night) return 'Tu mayor carga está en la tarde.';
    if (completedBlocks > pendingBlocks && completedBlocks > 0) return 'Llevas un buen ritmo de ejecución esta semana.';
    return 'Tu semana tiene una planificación estable.';
  };

  const totalActionsForCompliance = totalTasks + completedBlocks + pendingBlocks + totalHabits;
  const completedActionsForCompliance = completedTasks + completedBlocks + completedHabits;
  const generalCompliance = totalActionsForCompliance > 0 ? Math.round((completedActionsForCompliance / totalActionsForCompliance) * 100) : null;
  const isAnalyticsEmpty = !analyticsLoading && totalActionsForCompliance === 0 && totalMinutes === 0;

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
        const deadlineDate = parseLocalDeadline(task.deadline || task.due_date);
        const daysLeft = calculateRemainingDays(deadlineDate);
        // Si no hay día seleccionado, mostramos el rango de 14 días habitual
        if (selectedDay === null) return daysLeft >= -1 && daysLeft <= 14;
        
        let day = deadlineDate.getDay(); // 0 is Sunday
        day = day === 0 ? 6 : day - 1; // Convert to 0-6 (L-D)
        return day === selectedDay;
      } catch { return false; }
    }).sort((a, b) => parseLocalDeadline(a.deadline || a.due_date) - parseLocalDeadline(b.deadline || b.due_date));
  }, [filteredTasks, selectedDay]);

  const pendingCount = useMemo(() => {
    return filteredTasks.filter(t => {
      const status = (t.status || '').toLowerCase();
      return status === 'sin entregar' || status === 'en proceso';
    }).length;
  }, [filteredTasks]);

  // PRIORIDAD MÁXIMA: Tarea con deadline más próximo
  const { bigBossTask, bigBossColor } = useMemo(() => {
    // 1. Filtrar tareas no completadas y con fecha
    const pendingWithDeadline = filteredTasks.filter(task => {
      const status = (task.status || '').toLowerCase();
      if (status === 'entregado' || status === 'completed' || status === 'submitted') return false;
      if (!task.deadline && !task.due_date) return false;
      return true;
    });

    // 2. Ordenar por deadline ascendente
    pendingWithDeadline.sort((a, b) => parseLocalDeadline(a.deadline || a.due_date) - parseLocalDeadline(b.deadline || b.due_date));

    // 3. Tomar la primera
    const task = pendingWithDeadline[0] || null;
    let color = '#00ff66';
    if (task) {
      try {
        const deadlineDate = parseLocalDeadline(task.deadline || task.due_date);
        const days = calculateRemainingDays(deadlineDate);
        const hoursLeft = (deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);

        if (hoursLeft < 6) color = '#ff0033';
        else if (days < 2) color = '#ff8800';
        else color = '#00ff66';
      } catch {}
    }
    return { bigBossTask: task, bigBossColor: color };
  }, [filteredTasks, courses]);

  // MATRIZ DE ESFUERZO (Detalles de tareas por día para Células de Energía)
  const effortMatrixDetails = useMemo(() => {
    const matrix = [[], [], [], [], [], [], []]; // L-D
    filteredTasks.forEach(task => {
      // Solo contamos tareas no entregadas para la "carga"
      const status = (task.status || '').toLowerCase();
      if (status === 'entregado' || status === 'submitted') return;

      if (!task.deadline && !task.due_date) return;
      try {
        const date = parseLocalDeadline(task.deadline || task.due_date);
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
      const d = parseLocalDeadline(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long' });
    } catch { return dateStr; }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '32px 48px', position: 'relative', overflow: 'visible', minHeight: '100%' }}>
      {/* Watermark gigante */}
      <div style={{ position: 'absolute', top: '-60px', left: '-20px', fontSize: '14rem', fontWeight: 900, color: 'rgba(255,255,255,0.02)', zIndex: -1, fontFamily: 'var(--font-display)', userSelect: 'none', pointerEvents: 'none' }}>
        HUB
      </div>



      <header className="page-header" style={{ marginBottom: '16px' }}>
        <h1 className="page-title" style={{
          fontSize: '3rem',
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
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
            <Timer size={16} /> + POMODORO
          </motion.button>
        </div>
      </div>


      {/* PREMIUM ANALYTICS DASHBOARD */}
      {!isAnalyticsDashboardEmpty && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ marginBottom: '20px' }}
        >
          {/* Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Card: Total Tasks */}
            <motion.div 
              whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0, 243, 255, 0.2)' }}
              onClick={() => { playClick(1000); navigate('/tasks'); }}
              style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.08) 0%, rgba(188, 19, 254, 0.04) 100%)',
                border: '1px solid rgba(0, 243, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(0, 243, 255, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0, 243, 255, 0.7)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Total de trabajos</p>
                  <motion.h3 
                    key={totalTasks}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0', color: '#00f3ff', fontFamily: 'var(--font-display)', lineHeight: 1, textShadow: '0 0 20px rgba(0, 243, 255, 0.5)' }}
                  >
                    {totalTasks}
                  </motion.h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 243, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={24} color="#00f3ff" />
                </div>
              </div>
            </motion.div>

            {/* Card: Completed Tasks */}
            <motion.div 
              whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0, 255, 136, 0.2)' }}
              style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.08) 0%, rgba(188, 19, 254, 0.04) 100%)',
                border: '1px solid rgba(0, 255, 136, 0.2)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(0, 255, 136, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0, 255, 136, 0.7)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Completados</p>
                  <motion.h3 
                    key={completedTasks}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0', color: '#00ff88', fontFamily: 'var(--font-display)', lineHeight: 1, textShadow: '0 0 20px rgba(0, 255, 136, 0.5)' }}
                  >
                    {completedTasks}
                  </motion.h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 255, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={24} color="#00ff88" />
                </div>
              </div>
            </motion.div>

            {/* Card: Pending Tasks */}
            <motion.div 
              whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(255, 200, 0, 0.2)' }}
              style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(255, 200, 0, 0.08) 0%, rgba(188, 19, 254, 0.04) 100%)',
                border: '1px solid rgba(255, 200, 0, 0.2)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(255, 200, 0, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255, 200, 0, 0.7)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Pendientes</p>
                  <motion.h3 
                    key={pendingTasks}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0', color: '#ffc800', fontFamily: 'var(--font-display)', lineHeight: 1, textShadow: '0 0 20px rgba(255, 200, 0, 0.5)' }}
                  >
                    {pendingTasks}
                  </motion.h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 200, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={24} color="#ffc800" />
                </div>
              </div>
            </motion.div>

            {/* Card: Total Minutes */}
            <motion.div 
              whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(188, 19, 254, 0.2)' }}
              style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(188, 19, 254, 0.08) 0%, rgba(0, 243, 255, 0.04) 100%)',
                border: '1px solid rgba(188, 19, 254, 0.2)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(188, 19, 254, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(188, 19, 254, 0.7)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Minutos totales</p>
                  <motion.h3 
                    key={totalMinutes}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ fontSize: '2.8rem', fontWeight: 900, margin: '0', color: '#bc13fe', fontFamily: 'var(--font-display)', lineHeight: 1, textShadow: '0 0 20px rgba(188, 19, 254, 0.5)' }}
                  >
                    {Math.floor(totalMinutes)}
                  </motion.h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(188, 19, 254, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock3 size={24} color="#bc13fe" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Metric Overlays: Compliance & Smart Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
            {/* Completion Rate Progress Bar */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.05) 0%, rgba(188, 19, 254, 0.05) 100%)',
                border: '1px solid rgba(0, 243, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
                  Cumplimiento
                </p>
                <motion.span 
                  key={completionRate}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ fontSize: '1.5rem', fontWeight: 900, color: '#00f3ff', textShadow: '0 0 15px rgba(0, 243, 255, 0.5)' }}
                >
                  {completionRate}%
                </motion.span>
              </div>
              {/* Progress Bar Background */}
              <div style={{ width: '100%', height: '8px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(0, 243, 255, 0.1)', overflow: 'hidden', position: 'relative' }}>
                {/* Progress Bar Fill */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: '10px',
                    background: `linear-gradient(90deg, #00f3ff 0%, #bc13fe 50%, #00ff88 100%)`,
                    boxShadow: '0 0 15px rgba(0, 243, 255, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.2)',
                    position: 'relative'
                  }}
                />
              </div>
              {/* Subtitle */}
              <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {completedTasks} de {totalTasks} trabajos completados
              </p>
            </motion.div>

            {/* SMART SUMMARY (ANALÍTICA PRO) */}
            <div className="glass-panel" style={{ 
              padding: '16px 20px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px', 
              background: 'linear-gradient(90deg, rgba(0, 243, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px solid rgba(0, 243, 255, 0.15)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BrainCircuit size={18} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', color: 'var(--accent-primary)', fontWeight: 900, margin: 0 }}>
                  Resumen Inteligente
                </h2>
              </div>
              
              {isAnalyticsEmpty ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Sin datos suficientes.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{getSmartInsight()}"
                  </p>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock3 size={14} color="var(--accent-primary)" />
                      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                        <span style={{ opacity: 0.7 }}>Tiempo planeado: </span>
                        <span style={{ color: 'var(--text-primary)' }}>{formatMinutes(totalMinutes)}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={14} color="var(--accent-secondary)" />
                      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                        <span style={{ opacity: 0.7 }}>Bloques pendientes: </span>
                        <span style={{ color: 'var(--accent-secondary)' }}>{pendingBlocks}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}



      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>


        {/* RADAR DE ENTREGAS & CONTENIDO DERECHO */}
        <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', alignItems: 'stretch' }}>

          {/* COLUMNA IZQUIERDA: Entregas */}
          <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 4', padding: '24px', background: 'rgba(0, 243, 255, 0.02)', position: 'relative', height: '100%', maxHeight: '600px', overflowY: 'auto' }}>
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
                  const deadlineDate = parseLocalDeadline(task.deadline || task.due_date);
                  days = calculateRemainingDays(deadlineDate);
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

        {/* COLUMNA DERECHA */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* MATRIZ DE ESFUERZO - Células de Energía */}
          <div className="glass-panel" style={{ padding: '20px 24px', height: 'max-content' }}>
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
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
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
                      minHeight: '64px', 
                      background: isActive ? 'rgba(0, 243, 255, 0.08)' : 'rgba(255,255,255,0.02)', 
                      borderRadius: '12px', 
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      justifyContent: 'center',
                      gap: '4px',
                      border: isActive ? '1px solid rgba(0, 243, 255, 0.5)' : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: isActive ? '0 0 20px rgba(0, 243, 255, 0.2)' : 'none',
                      maxHeight: '140px',
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

        {/* MÉTRICAS COMPACTAS (FILA DE 3 COLUMNAS DENTRO DE DERECHA) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>

          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => navigate('/agenda')}
            className="glass-panel glass-card-hover" 
            style={{ padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        >
          <Activity color="var(--accent-primary)" size={24} style={{ opacity: 0.15, position: 'absolute', top: '16px', right: '16px' }} />
          <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{t.activeSubjects}</p>
          <h3 key={filteredCourses.length} className="animate-number-pop" style={{ fontSize: '2.5rem', fontWeight: 900, margin: '4px 0', fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--accent-primary)', display: 'inline-block' }}>
            {String(filteredCourses.length).padStart(2, '0')}
          </h3>
          <div style={{ width: '100%', height: '2px', background: 'var(--border-glass-top)', marginTop: '8px', position: 'relative', borderRadius: '1px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(filteredCourses.length * 10, 100)}%`, background: 'var(--accent-primary)', boxShadow: `0 0 8px var(--accent-primary)`, borderRadius: '1px', transition: 'width 0.6s var(--ease-out-expo)' }} />
          </div>
        </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => navigate('/tasks')}
            className="glass-panel glass-card-hover" 
            style={{ padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        >
          <Target color="var(--accent-secondary)" size={24} style={{ opacity: 0.15, position: 'absolute', top: '16px', right: '16px' }} />
          <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{t.pendingTasks}</p>
          <h3 key={pendingCount} className="animate-number-pop" style={{ fontSize: '2.5rem', fontWeight: 900, margin: '4px 0', fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--accent-secondary)', display: 'inline-block' }}>
            {String(pendingCount).padStart(2, '0')}
          </h3>
          <div style={{ width: '100%', height: '2px', background: 'var(--border-glass-top)', marginTop: '8px', position: 'relative', borderRadius: '1px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(pendingCount * 10, 100)}%`, background: 'var(--accent-secondary)', boxShadow: `0 0 8px var(--accent-secondary)`, borderRadius: '1px', transition: 'width 0.6s var(--ease-out-expo)' }} />
          </div>
        </motion.div>

          {/* PRIORIDAD MÁXIMA - Tarea más próxima */}
          <div className="glass-panel" style={{ padding: '20px', background: `linear-gradient(135deg, ${bigBossColor}15 0%, rgba(255, 77, 77, 0.02) 100%)`, border: `1px solid ${bigBossColor}33`, position: 'relative', overflow: 'hidden' }}>
          <Flame color={bigBossColor} size={40} style={{ opacity: 0.1, position: 'absolute', bottom: '-8px', right: '-8px' }} />
          <h2 style={{ fontSize: '0.65rem', fontWeight: 900, color: bigBossColor, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)' }}>
            <AlertCircle size={14} /> PRIORIDAD MÁXIMA
          </h2>
          {bigBossTask ? (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 950, margin: '0 0 4px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bigBossTask.title}</h4>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
                {formatDateLegible(bigBossTask.deadline || bigBossTask.due_date)} - {courses.find(c => c.id === bigBossTask.course_id)?.name || 'Sin Materia'}
              </p>
              <div style={{ display: 'inline-flex', padding: '4px 10px', background: `${bigBossColor}22`, borderRadius: '4px', border: `1px solid ${bigBossColor}33` }}>
                <span style={{ color: bigBossColor, fontWeight: 900, fontSize: '0.6rem', letterSpacing: '1px' }}>
                  //_OBJETIVO_CRÍTICO
                </span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>SIN AMENAZAS PRÓXIMAS</p>
          )}
        </div>

        </div>
      </div>
    </div>

        {/* Materias filtradas (Nueva fila inferior decorativa) */}
        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 12', padding: '16px 20px', marginTop: '-8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontWeight: 900, margin: 0 }}>{t.subjects}</h2>
            <button onClick={() => navigate('/agenda')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
              VER TODAS <ChevronRight size={14} />
            </button>
          </div>
          {filteredCourses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{t.emptyDatabase}</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {filteredCourses.map(c => {
                const displayColor = c.color || 'var(--accent-primary)';
                return (
                  <div key={c.id} style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', border: `1px solid ${displayColor}`, color: displayColor, fontSize: '0.7rem', fontFamily: 'var(--font-display)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: `0 0 10px ${displayColor}33`, background: `${displayColor}05` }}>
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

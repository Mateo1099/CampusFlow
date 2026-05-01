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

// C├ílculo ex├ícto por d├¡as calendario, contando todos los d├¡as intermedios (+ Math.ceil por margen de error)
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
  const isLightMode = settings?.theme === 'light';
  const isDaltonicMode = settings?.theme === 'daltonic';
  const navigate = useNavigate();
  const [currentFilter, setCurrentFilter] = useState('TODAS');
  const [selectedDay, setSelectedDay] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  // Anal├¡tica PRO -> Dashboard Integration
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
    if (!hasBlocks && totalMinutes === 0) return 'A├║n no hay planificaci├│n suficiente.';
    if (pendingBlocks > completedBlocks) return 'Tienes bloques pendientes esta semana.';
    if (minutesByTime?.morning > minutesByTime?.afternoon && minutesByTime?.morning > minutesByTime?.night) return 'Tu mayor carga est├í en la ma├▒ana.';
    if (minutesByTime?.night > minutesByTime?.morning && minutesByTime?.night > minutesByTime?.afternoon) return 'Tu mayor carga est├í en la noche.';
    if (minutesByTime?.afternoon > minutesByTime?.morning && minutesByTime?.afternoon > minutesByTime?.night) return 'Tu mayor carga est├í en la tarde.';
    if (completedBlocks > pendingBlocks && completedBlocks > 0) return 'Llevas un buen ritmo de ejecuci├│n esta semana.';
    return 'Tu semana tiene una planificaci├│n estable.';
  };

  const totalActionsForCompliance = totalTasks + completedBlocks + pendingBlocks + totalHabits;
  const completedActionsForCompliance = completedTasks + completedBlocks + completedHabits;
  const generalCompliance = totalActionsForCompliance > 0 ? Math.round((completedActionsForCompliance / totalActionsForCompliance) * 100) : null;
  const isAnalyticsEmpty = !analyticsLoading && totalActionsForCompliance === 0 && totalMinutes === 0;
  const metricLabelColor = isLightMode ? '#475569' : 'rgba(226,232,240,0.92)';
  const metricValueColor = isLightMode ? '#0f172a' : '#f8fafc';
  // === LIGHT PREMIUM FROST ===
  // Base glass style para cards en modo claro: blanco translúcido con borde sutil y sombra elegante.
  const lightGlassCardStyle = isLightMode ? {
    background: 'linear-gradient(160deg, rgba(255,255,255,0.88) 0%, rgba(248,250,255,0.96) 100%)',
    border: '1px solid rgba(226, 232, 240, 0.85)',
    borderRadius: '24px',
    boxShadow: '0 8px 24px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,1)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)'
  } : {};

  // === LIGHT PREMIUM FROST CELLS ===
  const lightCellCardStyle = isLightMode ? {
    background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.48) 0%, rgba(255, 255, 255, 0.58) 100%)',
    border: '1px solid rgba(90, 120, 150, 0.18)',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(60, 80, 100, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)'
  } : {};

  // === SAFE RENDER HELPER ===
  const getSafeLabel = (val) => {
    if (!val) return 'Sin título';
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (typeof val === 'object') {
      return val.title || val.name || val.course_name || (val.course && val.course.name) || val.subject || 'Sin título';
    }
    return 'Sin título';
  };

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
    } catch { }
  };

  const filteredCourses = useMemo(() => {
    if (currentFilter === 'TODAS') return courses;
    return courses.filter(c => (c.institution || '').toUpperCase() === currentFilter.toUpperCase());
  }, [courses, currentFilter]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filtro por instituci├│n
      if (currentFilter !== 'TODAS') {
        const course = courses.find(c => c.id === task.course_id);
        if ((course?.institution || '').toUpperCase() !== currentFilter.toUpperCase()) return false;
      }
      return true;
    });
  }, [tasks, currentFilter, courses]);

  // RADAR DE ENTREGAS: Pr├│ximos 14 d├¡as
  const upcomingTasks = useMemo(() => {
    return filteredTasks.filter(task => {
      const status = (task.status || '').toLowerCase();
      if (status === 'entregado' || status === 'submitted') return false;
      if (!task.deadline && !task.due_date) return false;
      try {
        const deadlineDate = parseLocalDeadline(task.deadline || task.due_date);
        const daysLeft = calculateRemainingDays(deadlineDate);
        // Si no hay d├¡a seleccionado, mostramos el rango de 14 d├¡as habitual
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

  const getSubjectChipStyle = (color) => {
    const baseColor = color || 'var(--accent-primary)';
    const fillStrength = isLightMode ? '12%' : isDaltonicMode ? '16%' : '14%';
    const borderStrength = isLightMode ? '28%' : isDaltonicMode ? '66%' : '60%';
    const glowStrength = isLightMode ? '0%' : isDaltonicMode ? '34%' : '28%';

    return {
      padding: '6px 12px',
      borderRadius: 'var(--radius-full)',
      border: `1px solid color-mix(in srgb, ${baseColor} ${borderStrength}, transparent)`,
      // En light mode: color más oscuro para legibilidad sobre fondo blanco
      color: isLightMode ? `color-mix(in srgb, ${baseColor} 80%, #111)` : baseColor,
      fontSize: '0.7rem',
      fontFamily: 'var(--font-display)',
      fontWeight: 850,
      textTransform: 'uppercase',
      letterSpacing: '0.065em',
      background: `linear-gradient(135deg, color-mix(in srgb, ${baseColor} ${fillStrength}, transparent) 0%, color-mix(in srgb, ${baseColor} ${isLightMode ? '5%' : '8%'}, transparent) 100%)`,
      boxShadow: isLightMode
        ? `0 2px 8px color-mix(in srgb, ${baseColor} 10%, rgba(15,23,42,0.04)), inset 0 1px 0 rgba(255,255,255,0.9)`
        : `0 0 18px color-mix(in srgb, ${baseColor} ${glowStrength}, transparent), inset 0 1px 0 rgba(255,255,255,0.08)`,
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      textShadow: 'none'
    };
  };

  const getSubjectActionStyle = () => ({
    minWidth: '156px',
    minHeight: '40px',
    padding: '9px 18px',
    borderRadius: '999px',
    border: isLightMode
      ? '1px solid rgba(226, 232, 240, 0.9)'
      : isDaltonicMode
        ? '1px solid rgba(255,220,0,0.38)'
        : '1px solid rgba(0,243,255,0.24)',
    background: isLightMode
      ? 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(248,250,255,0.97) 100%)'
      : isDaltonicMode
        ? 'linear-gradient(135deg, rgba(16,20,44,0.92) 0%, rgba(25,31,66,0.82) 100%)'
        : 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
    // En light mode texto oscuro premium; en dark/daltonic el accent color
    color: isLightMode ? '#1e293b' : 'var(--accent-primary)',
    fontSize: '0.72rem',
    fontWeight: 900,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    boxShadow: isLightMode
      ? '0 4px 12px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,1)'
      : isDaltonicMode
        ? '0 0 18px rgba(255,220,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)'
        : '0 0 20px rgba(0,243,255,0.12), inset 0 1px 0 rgba(255,255,255,0.07)',
    transition: 'transform 0.25s var(--ease-out-expo), box-shadow 0.25s var(--ease-out-expo), background 0.25s var(--ease-out-expo), border-color 0.25s var(--ease-out-expo)',
    outline: 'none'
  });

  // PRIORIDAD M├üXIMA: Tarea con deadline m├ís pr├│ximo
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
      } catch { }
    }
    return { bigBossTask: task, bigBossColor: color };
  }, [filteredTasks, courses]);

  // MATRIZ DE ESFUERZO (Detalles de tareas por d├¡a para C├®lulas de Energ├¡a)
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
      } catch { }
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
  const fullDaysLabels = ['Lunes', 'Martes', 'Mi├®rcoles', 'Jueves', 'Viernes', 'S├íbado', 'Domingo'];

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
            whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(0, 243, 255, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => { playClick(1200); navigate('/tasks', { state: { openModal: true } }); }}
            style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(0, 243, 255, 0.1)', color: '#00f3ff', border: '1px solid rgba(0, 243, 255, 0.3)', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            <Plus size={16} /> NUEVO TRABAJO
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(255, 204, 0, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
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
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: isLightMode ? '0 8px 20px rgba(2,132,199,0.14)' : '0 10px 25px rgba(0, 243, 255, 0.25)', borderColor: isLightMode ? 'rgba(2,132,199,0.35)' : 'rgba(0, 243, 255, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { playClick(1000); navigate('/tasks'); }}
              style={isLightMode ? {
                ...lightGlassCardStyle,
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              } : {
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
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: isLightMode ? 'radial-gradient(circle, rgba(2,132,199,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(0, 243, 255, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: isLightMode ? '#475569' : 'rgba(0, 243, 255, 0.7)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Total de trabajos</p>
                  <motion.h3
                    key={totalTasks}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0', color: isLightMode ? '#0284c7' : '#00f3ff', fontFamily: 'var(--font-display)', lineHeight: 1, textShadow: isLightMode ? 'none' : '0 0 20px rgba(0, 243, 255, 0.5)' }}
                  >
                    {totalTasks}
                  </motion.h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: isLightMode ? 'rgba(2,132,199,0.1)' : 'rgba(0, 243, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={24} color={isLightMode ? '#0284c7' : '#00f3ff'} />
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: isLightMode ? '0 8px 20px rgba(22,163,74,0.14)' : '0 10px 25px rgba(0, 255, 136, 0.25)', borderColor: isLightMode ? 'rgba(22,163,74,0.35)' : 'rgba(0, 255, 136, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { playClick(1000); navigate('/tasks'); }}
              style={isLightMode ? {
                ...lightGlassCardStyle,
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              } : {
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
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: isLightMode ? 'radial-gradient(circle, rgba(22,163,74,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(0, 255, 136, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: isLightMode ? '#475569' : 'rgba(0, 255, 136, 0.7)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Completados</p>
                  <motion.h3
                    key={completedTasks}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0', color: isLightMode ? '#16a34a' : '#00ff88', fontFamily: 'var(--font-display)', lineHeight: 1, textShadow: isLightMode ? 'none' : '0 0 20px rgba(0, 255, 136, 0.5)' }}
                  >
                    {completedTasks}
                  </motion.h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: isLightMode ? 'rgba(22,163,74,0.1)' : 'rgba(0, 255, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={24} color={isLightMode ? '#16a34a' : '#00ff88'} />
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: isLightMode ? '0 8px 20px rgba(217,119,6,0.14)' : '0 10px 25px rgba(255, 200, 0, 0.25)', borderColor: isLightMode ? 'rgba(217,119,6,0.35)' : 'rgba(255, 200, 0, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { playClick(1000); navigate('/tasks'); }}
              style={isLightMode ? {
                ...lightGlassCardStyle,
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              } : {
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
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: isLightMode ? 'radial-gradient(circle, rgba(217,119,6,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(255, 200, 0, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: isLightMode ? '#475569' : 'rgba(255, 200, 0, 0.7)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Pendientes</p>
                  <motion.h3
                    key={pendingTasks}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0', color: isLightMode ? '#d97706' : '#ffc800', fontFamily: 'var(--font-display)', lineHeight: 1, textShadow: isLightMode ? 'none' : '0 0 20px rgba(255, 200, 0, 0.5)' }}
                  >
                    {pendingTasks}
                  </motion.h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: isLightMode ? 'rgba(217,119,6,0.1)' : 'rgba(255, 200, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={24} color={isLightMode ? '#d97706' : '#ffc800'} />
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: isLightMode ? '0 8px 20px rgba(147,51,234,0.14)' : '0 10px 25px rgba(188, 19, 254, 0.25)', borderColor: isLightMode ? 'rgba(147,51,234,0.35)' : 'rgba(188, 19, 254, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { playClick(1000); navigate('/stats'); }}
              style={isLightMode ? {
                ...lightGlassCardStyle,
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              } : {
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
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: isLightMode ? 'radial-gradient(circle, rgba(147,51,234,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(188, 19, 254, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: isLightMode ? '#475569' : metricLabelColor, fontWeight: 800, fontFamily: 'var(--font-display)', textShadow: 'none' }}>Minutos totales</p>
                  <motion.h3
                    key={totalMinutes}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ fontSize: '2.8rem', fontWeight: 900, margin: '0', color: isLightMode ? '#7c3aed' : '#bc13fe', fontFamily: 'var(--font-display)', lineHeight: 1, textShadow: isLightMode ? 'none' : '0 0 20px rgba(188, 19, 254, 0.5)' }}
                  >
                    {Math.floor(totalMinutes)}
                  </motion.h3>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: isLightMode ? 'rgba(147,51,234,0.1)' : 'rgba(188, 19, 254, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock3 size={24} color={isLightMode ? '#7c3aed' : '#bc13fe'} />
                </div>
              </div>
            </motion.button>
          </div>

          {/* Metric Overlays: Compliance & Smart Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
            {/* Completion Rate Progress Bar */}
            <motion.div
              className="glass-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{
                ...lightGlassCardStyle,
                padding: '16px 20px',
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

            {/* SMART SUMMARY (ANAL├ìTICA PRO) */}
            <div className="glass-panel" style={{
              ...lightGlassCardStyle,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
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
          <div className="glass-panel glass-card-hover" style={{ ...lightGlassCardStyle, gridColumn: 'span 4', padding: '24px', position: 'relative', height: '100%', maxHeight: '600px', overflowY: 'auto' }}>
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

                  // L├ôGICA DE COLORES Y ANIMACI├ôN (RADAR 2.0)
                  let glowColor = '#00ff66'; // VERDE (Default / > 5 d├¡as)
                  let glowSpeed = '4s';      // Brillo lento

                  if (hoursLeft < 6) {
                    glowColor = '#ff0033';   // ROJO (< 6 horas)
                    glowSpeed = '0.8s';      // Parpadeo r├ípido
                  } else if (days < 2) {
                    glowColor = '#ff8800';   // NARANJA (< 2 d├¡as)
                    glowSpeed = '2s';        // Brillo medio
                  } else if (days <= 5) {
                    glowColor = '#00ff66';   // VERDE (Gap 2-5 d├¡as)
                    glowSpeed = '4s';
                  }

                  const taskCourse = courses.find(c => c.id === task.course_id);

                  return (
                    <motion.button
                      key={task.id}
                      whileHover={{ scale: 1.01, boxShadow: `0 0 20px ${glowColor}55`, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { playClick(800); navigate('/tasks'); }}
                      style={{
                        position: 'relative',
                        padding: '14px',
                        paddingLeft: '18px',
                        border: 'none',
                        borderLeft: `3px solid ${glowColor}`,
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '0 12px 12px 0',
                        boxShadow: `0 0 15px ${glowColor}11`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'block',
                        width: '100%',
                        transition: 'background 0.2s easeOut'
                      }}
                      animate={{
                        boxShadow: [
                          `0 0 5px ${glowColor}22`,
                          `0 0 20px ${glowColor}44`,
                          `0 0 5px ${glowColor}22`
                        ]
                      }}
                      transition={{
                        hover: { duration: 0.2 },
                        tap: { duration: 0.1 },
                        boxShadow: {
                          duration: parseFloat(glowSpeed),
                          repeat: Infinity,
                          ease: "easeInOut"
                        }
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
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* MATRIZ DE ESFUERZO - C├®lulas de Energ├¡a */}
            <div className="glass-panel" style={{ ...lightGlassCardStyle, padding: '20px 24px', height: 'max-content' }}>
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
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative', zIndex: hoveredDay === idx ? 60 : 1 }}>
                      <motion.div
                        onMouseEnter={() => setHoveredDay(idx)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => {
                          playClick(900);
                          setSelectedDay(isActive ? null : idx);
                        }}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: isLightMode ? '0 0 18px rgba(0, 200, 255, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.65)' : '0 0 15px rgba(0, 243, 255, 0.3)',
                          backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 243, 255, 0.08)',
                          borderColor: isLightMode ? 'rgba(0, 200, 255, 0.35)' : undefined
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{
                          ...lightCellCardStyle,
                          width: '100%',
                          minHeight: '76px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          gap: '6px',
                          maxHeight: '140px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'visible'
                        }}
                      >
                        {dayTasks.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', position: 'relative' }}>
                            <AnimatePresence>
                              {hoveredDay === idx && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.96, y: 4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.96, y: 4 }}
                                  transition={{ duration: 0.15, ease: "easeOut" }}
                                  style={{
                                    position: 'absolute',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    bottom: 'calc(100% + 8px)',
                                    zIndex: 100,
                                    pointerEvents: 'none',
                                    padding: '12px 16px',
                                    background: isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 10, 10, 0.95)',
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                    borderRadius: '16px',
                                    border: isLightMode ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid rgba(0, 243, 255, 0.4)',
                                    boxShadow: isLightMode ? '0 15px 40px rgba(15,23,42,0.12)' : '0 15px 40px rgba(0,0,0,0.8), 0 0 20px rgba(0, 243, 255, 0.2)',
                                    width: 'fit-content',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <h4 style={{ margin: '0 0 10px', fontSize: '0.65rem', fontWeight: 900, color: isLightMode ? '#0284c7' : '#00f3ff', textTransform: 'uppercase', letterSpacing: '2px', borderBottom: isLightMode ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(0, 243, 255, 0.2)', paddingBottom: '6px', whiteSpace: 'nowrap' }}>
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
                                          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: isLightMode ? '#0f172a' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{getSafeLabel(t.title)}</p>
                                          <p style={{ margin: 0, fontSize: '0.6rem', color: isLightMode ? '#64748b' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, whiteSpace: 'nowrap' }}>{getSafeLabel(t.institution)}</p>
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
                                  background: isLightMode ? taskInfo.color : `${taskInfo.color}33`,
                                  opacity: isLightMode ? 0.95 : 1,
                                  boxShadow: isLightMode ? `0 2px 4px ${taskInfo.color}40` : `0 0 8px ${taskInfo.color}44`,
                                  flexShrink: 0
                                }}
                              />
                            ))}
                          </div>
                        )}
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

            {/* M├ëTRICAS COMPACTAS (FILA DE 3 COLUMNAS DENTRO DE DERECHA) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>

              <motion.div
                whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(0, 243, 255, 0.15)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => navigate('/agenda')}
                className="glass-panel"
                style={{ ...lightGlassCardStyle, padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
              >
                <Activity color="var(--accent-primary)" size={24} style={{ opacity: 0.15, position: 'absolute', top: '16px', right: '16px' }} />
                <p style={{ color: metricLabelColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', fontFamily: 'var(--font-display)', fontWeight: 800, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.4)' }}>{t.activeSubjects}</p>
                <h3 key={filteredCourses.length} className="animate-number-pop" style={{ fontSize: '2.5rem', fontWeight: 900, margin: '4px 0', fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--accent-primary)', display: 'inline-block' }}>
                  {String(filteredCourses.length).padStart(2, '0')}
                </h3>
                <div style={{ width: '100%', height: '2px', background: 'var(--border-glass-top)', marginTop: '8px', position: 'relative', borderRadius: '1px' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(filteredCourses.length * 10, 100)}%`, background: 'var(--accent-primary)', boxShadow: `0 0 8px var(--accent-primary)`, borderRadius: '1px', transition: 'width 0.6s var(--ease-out-expo)' }} />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(188, 19, 254, 0.15)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => navigate('/tasks')}
                className="glass-panel"
                style={{ ...lightGlassCardStyle, padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
              >
                <Target color="var(--accent-secondary)" size={24} style={{ opacity: 0.15, position: 'absolute', top: '16px', right: '16px' }} />
                <p style={{ color: metricLabelColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', fontFamily: 'var(--font-display)', fontWeight: 800, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.4)' }}>{t.pendingTasks}</p>
                <h3 key={pendingCount} className="animate-number-pop" style={{ fontSize: '2.5rem', fontWeight: 900, margin: '4px 0', fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--accent-secondary)', display: 'inline-block' }}>
                  {String(pendingCount).padStart(2, '0')}
                </h3>
                <div style={{ width: '100%', height: '2px', background: 'var(--border-glass-top)', marginTop: '8px', position: 'relative', borderRadius: '1px' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(pendingCount * 10, 100)}%`, background: 'var(--accent-secondary)', boxShadow: `0 0 8px var(--accent-secondary)`, borderRadius: '1px', transition: 'width 0.6s var(--ease-out-expo)' }} />
                </div>
              </motion.div>

              {/* PRIORIDAD M├üXIMA - Tarea m├ís pr├│xima */}
              <div className="glass-panel" style={{ ...lightGlassCardStyle, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                <Flame color={bigBossColor} size={40} style={{ opacity: 0.1, position: 'absolute', bottom: '-8px', right: '-8px' }} />
                <h2 style={{ fontSize: '0.65rem', fontWeight: 900, color: bigBossColor, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)' }}>
                  <AlertCircle size={14} /> PRIORIDAD M├üXIMA
                </h2>
                {bigBossTask ? (
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 950, margin: '0 0 4px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bigBossTask.title}</h4>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
                      {formatDateLegible(bigBossTask.deadline || bigBossTask.due_date)} - {courses.find(c => c.id === bigBossTask.course_id)?.name || 'Sin Materia'}
                    </p>
                    <div style={{ display: 'inline-flex', padding: '4px 10px', background: `${bigBossColor}22`, borderRadius: '4px', border: `1px solid ${bigBossColor}33` }}>
                      <span style={{ color: bigBossColor, fontWeight: 900, fontSize: '0.6rem', letterSpacing: '1px' }}>
                  //_OBJETIVO_CR├ìTICO
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>SIN AMENAZAS PR├ôXIMAS</p>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Materias filtradas (Nueva fila inferior decorativa) */}
        <div
          className="glass-panel glass-card-hover"
          style={{
            ...lightGlassCardStyle,
            gridColumn: 'span 12',
            padding: '20px 22px',
            marginTop: '-8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontWeight: 900, margin: 0 }}>{t.subjects}</h2>
            <motion.button
              onClick={() => navigate('/agenda')}
              whileHover={{
                scale: 1.02,
                y: -1,
                boxShadow: isLightMode
                  ? '0 20px 40px rgba(37,99,235,0.18), 0 0 0 1px rgba(37,99,235,0.18), inset 0 1px 0 rgba(255,255,255,0.98)'
                  : isDaltonicMode
                    ? '0 0 24px rgba(255,220,0,0.22), 0 0 0 1px rgba(255,220,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)'
                    : '0 0 24px rgba(0,243,255,0.18), 0 0 0 1px rgba(0,243,255,0.16), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={getSubjectActionStyle()}
            >
              VER TODAS <ChevronRight size={14} />
            </motion.button>
          </div>
          {filteredCourses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{t.emptyDatabase}</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {filteredCourses.map(c => {
                const displayColor = c.color || 'var(--accent-primary)';
                return (
                  <div key={c.id} style={getSubjectChipStyle(displayColor)}>
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

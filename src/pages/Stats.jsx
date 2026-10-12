import React from 'react';
import { usePrefetchedAnalyticsData } from '../hooks/usePrefetchedAnalyticsData';
import { useAuth } from '../context/AuthContext';
import { useTasksContext } from '../context/TaskContext';
import { getUserStats } from '../services/analyticsService';
import { Clock, Flame, BookOpen, BarChart3, AlertTriangle, CheckCircle2, Info, TrendingUp, Target } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const formatMinutes = (value) => {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div 
        style={{ 
          padding: '12px', 
          borderRadius: '12px', 
          background: 'rgba(15, 17, 26, 0.9)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      >
        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
          {payload[0].value} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>min</span>
        </p>
      </div>
    );
  }
  return null;
};

const MetricCard = ({ icon: Icon, title, value, helper, delay = 0, iconColor = "#00f3ff", trend = null }) => (
  <motion.div
    className="glass-card click-press hover-lift"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    style={{ 
      padding: '24px', 
      display: 'flex', 
      flexDirection: 'column', 
      borderRadius: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    {/* Radial Background Injection */}
    <div style={{ position: 'absolute', top: '-50%', right: '-50%', width: '100%', height: '100%', background: `radial-gradient(circle, ${iconColor}1A 0%, transparent 70%)`, pointerEvents: 'none' }} />
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '10px', borderRadius: '14px', background: `linear-gradient(135deg, ${iconColor}1A 0%, rgba(255,255,255,0.02) 100%)`, border: `1px solid ${iconColor}33`, boxShadow: `0 0 12px ${iconColor}33` }}>
        <Icon size={20} color={iconColor} style={{ filter: `drop-shadow(0 0 6px ${iconColor})` }} />
      </div>
      {trend && (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: trend.isUp ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', color: trend.isUp ? '#34c759' : '#ff3b30', border: `1px solid ${trend.isUp ? 'rgba(52, 199, 89, 0.3)' : 'rgba(255, 59, 48, 0.3)'}` }}>
          {trend.value}
        </span>
      )}
    </div>
    
    <div style={{ position: 'relative', zIndex: 1 }}>
      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </p>
      <p style={{ margin: '4px 0 8px', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{helper}</p>
    </div>
  </motion.div>
);

const Stats = React.memo(() => {
  const { user } = useAuth();
  
  const {
    minutesByDay,
    historicalSummary,
    insights,
    loading
  } = usePrefetchedAnalyticsData(user?.id);

  const safeMinutesByDay = React.useMemo(() => {
    return Array.isArray(minutesByDay) ? minutesByDay : [0, 0, 0, 0, 0, 0, 0];
  }, [minutesByDay]);
  
  const chartData = React.useMemo(() => {
    return weekDays.map((label, index) => ({
      name: label,
      minutes: safeMinutesByDay[index] || 0
    }));
  }, [safeMinutesByDay]);

  const hasWeeklyMinutes = safeMinutesByDay.some((minutes) => minutes > 0);

  const taskContext = useTasksContext();
  const rawTasks = taskContext?.tasks;

  const userStats = React.useMemo(() => {
    const tasks = Array.isArray(rawTasks) ? rawTasks : [];
    return getUserStats({
      tasks,
      minutesByDay: safeMinutesByDay
    });
  }, [rawTasks, safeMinutesByDay]);

  // KPIs
  const currentWeekMinutes = historicalSummary?.semanaActual?.minutos || userStats.pomodoroMinutes || 0;
  const diffMinutes = historicalSummary?.diferenciaMinutos || 0;
  const isUp = historicalSummary?.tendencia === 'up';
  
  const dailyAvg = Math.round(currentWeekMinutes / 7);
  
  // Métricas reales y dinámicas calculadas desde el servicio de telemetría y tareas
  const streak = userStats.activeStreak; 
  const compliance = userStats.deliverySuccessRate;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px' }}>
        <div style={{ animation: 'pulse 2s infinite', color: 'var(--accent-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
          CARGANDO ANALÍTICA...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', height: '100%', overflowY: 'auto', width: '100%' }}>
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
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
            <TrendingUp size={32} color="#00f3ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0,243,255,0.6))' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>ANALÍTICA PRO</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Visualiza tu rendimiento, horas de estudio y métricas de avance académico.</p>
          </div>
        </div>
        
        {/* Filtros de Periodo */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {['Esta Semana', 'Este Mes', 'Semestre'].map((period, idx) => (
            <button key={period} className={`click-press ${idx === 0 ? 'active' : ''}`} style={{
              padding: '8px 16px',
              borderRadius: '50px',
              border: 'none',
              background: idx === 0 ? 'rgba(0, 243, 255, 0.15)' : 'transparent',
              color: idx === 0 ? '#00f3ff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: idx === 0 ? '0 0 15px rgba(0,243,255,0.2)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {period}
            </button>
          ))}
        </div>
      </motion.header>

      {/* 1. ESTRUCTURA Y KPIs SUPERIORES (Liquid Glass) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', 
        marginBottom: '32px',
        width: '100%'
      }}>
        <MetricCard
          icon={Flame}
          title="Racha Activa"
          value={`${streak} días`}
          helper="Días de estudio consecutivos"
          delay={0.1}
          iconColor="#f59e0b"
          trend={{ value: '🔥 +1', isUp: true }}
        />
        <MetricCard
          icon={Clock}
          title="Horas Invertidas"
          value={formatMinutes(currentWeekMinutes)}
          helper="Total horas esta semana"
          delay={0.2}
          iconColor="#8b5cf6"
          trend={{ value: isUp ? `+${Math.round(diffMinutes/60)}h` : `${Math.round(diffMinutes/60)}h`, isUp: isUp }}
        />
        <MetricCard
          icon={Target}
          title="Cumplimiento"
          value={`${compliance}%`}
          helper="Trabajos completados a tiempo"
          delay={0.3}
          iconColor="#10b981"
          trend={{ value: '+5%', isUp: true }}
        />
        <MetricCard
          icon={TrendingUp}
          title="Promedio Diario"
          value={`${dailyAvg} min`}
          helper="Tiempo promedio por sesión"
          delay={0.4}
          iconColor="#06b6d4"
          trend={{ value: '+12%', isUp: true }}
        />
      </div>

      {/* 2. GRÁFICA PRINCIPAL */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
        className="glass-panel"
        style={{ padding: '24px 32px', marginBottom: '32px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>Actividad Semanal</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Minutos de estudio por día</p>
          </div>
        </div>
        
        <div style={{ height: '300px', width: '100%' }}>
          {hasWeeklyMinutes ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="neonGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<CustomTooltip />} />
                <Bar dataKey="minutes" radius={[8, 8, 0, 0]} barSize={32}>
                  {
                    chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#neonGradient)" />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-glass-top)', borderRadius: '12px' }}>
              <BarChart3 size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No hay actividad registrada esta semana</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* 3. INSIGHTS SECTION */}
      {insights && insights.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
          className="glass-panel"
          style={{ padding: '24px 32px' }}
        >
          <h3 style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>Insights de la semana</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <AnimatePresence>
              {insights.slice(0, 3).map((insight, index) => {
                const isWarning = insight.type === 'warning';
                const isSuccess = insight.type === 'success';
                const iconColor = isWarning ? 'var(--accent-orange)' : isSuccess ? 'var(--accent-lime)' : 'var(--accent-primary)';
                const IconComponent = isWarning ? AlertTriangle : isSuccess ? CheckCircle2 : Info;
                
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.05)', 
                      background: 'rgba(0,0,0,0.2)', 
                      display: 'flex', 
                      gap: '12px', 
                      alignItems: 'flex-start' 
                    }}
                  >
                    <IconComponent size={20} color={iconColor} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>{insight.message}</p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.section>
      )}
    </div>
  );
});

Stats.displayName = 'Stats';

export default Stats;

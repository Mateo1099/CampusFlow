import React from 'react';
import { usePrefetchedAnalyticsData } from '../hooks/usePrefetchedAnalyticsData';
import { useAuth } from '../context/AuthContext';
import { Clock, Flame, BookOpen, BarChart3, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
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

const MetricCard = ({ icon: Icon, title, value, helper, delay = 0, iconColor = "var(--accent-primary)", glowColor = "rgba(0, 243, 255, 0.22)" }) => (
  <motion.article
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    style={{ 
      padding: '20px 24px', 
      display: 'flex', 
      flexDirection: 'column', 
      borderRadius: '16px',
      background: `radial-gradient(circle at 80% 20%, ${glowColor} 0%, transparent 60%), linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)`,
      backdropFilter: 'blur(24px) saturate(200%)',
      WebkitBackdropFilter: 'blur(24px) saturate(200%)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderTop: '1px solid rgba(255, 255, 255, 0.5)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </p>
      <Icon size={18} color={iconColor} />
    </div>
    <div>
      <p style={{ margin: '0 0 4px', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{helper}</p>
    </div>
  </motion.article>
);

const Stats = React.memo(() => {
  const { user } = useAuth();
  
  const {
    completedBlocks,
    minutesByDay,
    historicalSummary,
    insights,
    loading
  } = usePrefetchedAnalyticsData(user?.id);

  const safeMinutesByDay = Array.isArray(minutesByDay) ? minutesByDay : [0, 0, 0, 0, 0, 0, 0];
  
  const chartData = weekDays.map((label, index) => ({
    name: label,
    minutes: safeMinutesByDay[index] || 0
  }));

  const hasWeeklyMinutes = safeMinutesByDay.some((minutes) => minutes > 0);

  // KPIs
  const currentWeekMinutes = historicalSummary?.semanaActual?.minutos || 0;
  const diffMinutes = historicalSummary?.diferenciaMinutos || 0;
  const isUp = historicalSummary?.tendencia === 'up';
  const diffText = diffMinutes === 0 ? 'Igual a la semana pasada' : `${isUp ? '+' : '-'}${Math.abs(diffMinutes)} min vs sem pasada`;

  const dailyAvg = Math.round(currentWeekMinutes / 7);
  
  // Mock data for streak and main subject
  const streak = hasWeeklyMinutes ? 3 : 0; 
  const mainSubject = hasWeeklyMinutes ? "Desarrollo Web" : "N/A";

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
    <div style={{ padding: '32px 40px', height: '100%', overflowY: 'auto' }}>
      <header className="page-header" style={{ marginBottom: '40px' }}>
        <h1 className="page-title">Analítica PRO</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Mide tu rendimiento, descubre patrones y mejora tu flujo de estudio.</p>
      </header>

      {/* 1. ESTRUCTURA Y KPIs SUPERIORES */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        <MetricCard
          icon={Clock}
          title="Horas Semana"
          value={formatMinutes(currentWeekMinutes)}
          helper={diffText}
          delay={0.1}
          iconColor="var(--accent-primary)"
          glowColor="rgba(0, 243, 255, 0.22)"
        />
        <MetricCard
          icon={Flame}
          title="Racha Actual"
          value={`${streak} días`}
          helper={streak > 0 ? '¡Sigue así!' : 'Inicia tu racha hoy'}
          delay={0.2}
          iconColor="var(--accent-orange)"
          glowColor="rgba(255, 149, 0, 0.22)"
        />
        <MetricCard
          icon={BookOpen}
          title="Materia Principal"
          value={mainSubject}
          helper={completedBlocks > 0 ? `${completedBlocks} bloques completados` : 'Sin bloques'}
          delay={0.3}
          iconColor="var(--accent-secondary)"
          glowColor="rgba(188, 19, 254, 0.22)"
        />
        <MetricCard
          icon={BarChart3}
          title="Promedio Diario"
          value={`${dailyAvg} min`}
          helper="Por día en promedio"
          delay={0.4}
          iconColor="var(--accent-lime)"
          glowColor="rgba(52, 199, 89, 0.22)"
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
                    <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity={0.8} />
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

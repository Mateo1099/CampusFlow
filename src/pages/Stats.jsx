import React from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { BarChart3, CheckCircle2, Clock3, Sparkles, Sun, Sunset, Moon, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const weekDays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const formatMinutes = (value) => {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

const MetricCard = ({ icon: Icon, title, value, helper, accent = 'var(--accent-primary)', empty = false }) => (
  <article
    className="glass-panel"
    style={{
      padding: '20px 22px',
      minHeight: '146px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: 'linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
      border: '1px solid var(--border-glass-top)',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 16px 30px ${accent}18`
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
      <p style={{ margin: 0, fontSize: '0.72rem', letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{title}</p>
      <Icon size={16} color={accent} />
    </div>

    <div>
      <p
        style={{
          margin: '12px 0 6px',
          fontSize: empty ? '1.2rem' : '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          color: empty ? 'var(--text-secondary)' : 'var(--text-primary)',
          letterSpacing: empty ? '0.02em' : '0.01em'
        }}
      >
        {value}
      </p>
      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{helper}</p>
    </div>
  </article>
);

const SectionSkeletonBlock = ({ height = 16, width = '100%', borderRadius = 10 }) => (
  <div
    style={{
      height,
      width,
      borderRadius,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
      border: '1px solid rgba(255,255,255,0.07)',
      animation: 'pulse 1.8s ease-in-out infinite'
    }}
  />
);

const MetricCardSkeleton = () => (
  <article
    className="glass-panel"
    style={{
      padding: '20px 22px',
      minHeight: '146px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: 'linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
      border: '1px solid var(--border-glass-top)'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
      <SectionSkeletonBlock width={100} height={12} borderRadius={6} />
      <SectionSkeletonBlock width={18} height={18} borderRadius={6} />
    </div>
    <div style={{ display: 'grid', gap: '8px' }}>
      <SectionSkeletonBlock width={84} height={30} borderRadius={8} />
      <SectionSkeletonBlock width={140} height={12} borderRadius={6} />
    </div>
  </article>
);

const Stats = React.memo(() => {
  const statsMountTsRef = React.useRef(performance.now());
  const statsRealContentLoggedRef = React.useRef(false);

  const perfLog = React.useCallback((event, payload = {}) => {
    const ts = performance.now();
    const entry = { event, ts, route: '/stats', ...payload };
    if (typeof window !== 'undefined') {
      window.__CF_PERF_LOGS = window.__CF_PERF_LOGS || [];
      window.__CF_PERF_LOGS.push(entry);
    }
    console.log('[PERF]', entry);
  }, []);

  const {
    totalTasks,
    completedTasks,
    pendingTasks,
    totalHabits,
    completedHabits,
    totalMinutes,
    completedBlocks,
    pendingBlocks,
    minutesByDay,
    minutesByTime,
    historicalSummary,
    insights,
    recommendations,
    loading
  } = useAnalytics();

  const showPageSkeleton = loading;

  React.useEffect(() => {
    perfLog('stats_mount', {
      sinceNavStartMs: window.__CF_NAV_START?.to === '/stats'
        ? Number((performance.now() - window.__CF_NAV_START.ts).toFixed(2))
        : null
    });
  }, [perfLog]);

  React.useEffect(() => {
    if (!showPageSkeleton && !statsRealContentLoggedRef.current) {
      statsRealContentLoggedRef.current = true;
      perfLog('stats_real_content_visible', {
        sinceMountMs: Number((performance.now() - statsMountTsRef.current).toFixed(2)),
        sinceNavStartMs: window.__CF_NAV_START?.to === '/stats'
          ? Number((performance.now() - window.__CF_NAV_START.ts).toFixed(2))
          : null
      });
    }
  }, [showPageSkeleton, perfLog]);

  const safeMinutesByDay = Array.isArray(minutesByDay) ? minutesByDay : [0, 0, 0, 0, 0, 0, 0];
  const morningMinutes = minutesByTime?.morning || 0;
  const afternoonMinutes = minutesByTime?.afternoon || 0;
  const nightMinutes = minutesByTime?.night || 0;

  const totalBlocks = completedBlocks + pendingBlocks;
  const hasTasks = totalTasks > 0;
  const hasHabits = totalHabits > 0;
  const hasBlocks = totalBlocks > 0;
  const hasWeeklyMinutes = safeMinutesByDay.some((minutes) => minutes > 0);
  const totalTimeDistribution = morningMinutes + afternoonMinutes + nightMinutes;
  const hasTimeDistribution = totalTimeDistribution > 0;

  const completionDenominator = totalTasks + totalBlocks + totalHabits;
  const completionNumerator = completedTasks + completedBlocks + completedHabits;
  const overallCompliance = completionDenominator > 0 ? Math.round((completionNumerator / completionDenominator) * 100) : null;

  const maxDayMinutes = Math.max(...safeMinutesByDay, 0);

  const dayDistribution = [
    { key: 'morning', label: 'Manana', value: morningMinutes, icon: Sun, color: 'var(--accent-secondary)' },
    { key: 'afternoon', label: 'Tarde', value: afternoonMinutes, icon: Sunset, color: 'var(--accent-lime)' },
    { key: 'night', label: 'Noche', value: nightMinutes, icon: Moon, color: 'var(--accent-primary)' }
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '32px 40px', height: '100%', overflowY: 'auto' }}>
      <header className="page-header" style={{ marginBottom: '40px' }}>
        <h1 className="page-title">Analitica PRO</h1>
      </header>

      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {showPageSkeleton ? (
          Array.from({ length: 5 }).map((_, index) => <MetricCardSkeleton key={`metric-skeleton-${index}`} />)
        ) : (
          <>
            <MetricCard
              icon={BarChart3}
              title="Total de trabajos"
              value={hasTasks ? totalTasks : 'Sin datos'}
              helper={hasTasks ? `${pendingTasks} pendientes` : 'Aun no hay trabajos cargados'}
              accent="var(--accent-secondary)"
              empty={!hasTasks}
            />
            <MetricCard
              icon={CheckCircle2}
              title="Trabajos completados"
              value={hasTasks ? completedTasks : 'Sin datos'}
              helper={hasTasks ? `${Math.round((completedTasks / totalTasks) * 100)}% de cumplimiento` : 'Sin historial de entregas'}
              accent="var(--accent-lime)"
              empty={!hasTasks}
            />
            <MetricCard
              icon={Sparkles}
              title="Bloques completados"
              value={hasBlocks ? completedBlocks : 'Sin datos'}
              helper={hasBlocks ? `${pendingBlocks} pendientes por ejecutar` : 'Aun no se registran bloques'}
              accent="var(--accent-primary)"
              empty={!hasBlocks}
            />
            <MetricCard
              icon={Clock3}
              title="Tiempo planeado total"
              value={hasBlocks && totalMinutes > 0 ? formatMinutes(totalMinutes) : 'Sin datos'}
              helper={hasBlocks && totalMinutes > 0 ? `${totalMinutes} minutos acumulados` : 'Planifica bloques para ver tendencia'}
              accent="var(--accent-secondary)"
              empty={!hasBlocks || totalMinutes <= 0}
            />
            <MetricCard
              icon={AlertCircle}
              title="Cumplimiento general"
              value={overallCompliance !== null ? `${overallCompliance}%` : 'Sin datos'}
              helper={overallCompliance !== null ? `${completionNumerator} de ${completionDenominator} objetivos ejecutados` : 'Sin registros suficientes aun'}
              accent="var(--accent-lime)"
              empty={overallCompliance === null}
            />
          </>
        )}
      </div>

      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '20px' }}>
        <section className="glass-panel" style={{ padding: '24px 26px', border: '1px solid var(--border-glass-top)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '14px' }}>
            <div>
              <h3 className="font-display" style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Minutos por dia</h3>
              <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Visual semanal de lunes a domingo</p>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Semanal</span>
          </div>

          {showPageSkeleton ? (
            <div style={{ minHeight: '240px', display: 'grid', gap: '12px', alignContent: 'end' }}>
              <SectionSkeletonBlock height={12} width={180} borderRadius={6} />
              <div style={{ height: '190px', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
                {Array.from({ length: 7 }).map((_, index) => (
                  <SectionSkeletonBlock key={`day-chart-skeleton-${index}`} height="100%" borderRadius={10} />
                ))}
              </div>
            </div>
          ) : !hasWeeklyMinutes ? (
            <div
              style={{
                minHeight: '240px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--border-glass-top)',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                textAlign: 'center',
                padding: '24px'
              }}
            >
              <BarChart3 size={24} color="var(--text-muted)" />
              <p style={{ margin: '14px 0 6px', color: 'var(--text-primary)', fontWeight: 700 }}>Sin actividad semanal registrada</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.86rem' }}>Agrega bloques al planner para visualizar esta grafica.</p>
            </div>
          ) : (
            <div style={{ height: '260px', display: 'flex', gap: '10px', alignItems: 'flex-end', padding: '8px 4px 0' }}>
              {weekDays.map((label, index) => {
                const dayMinutes = safeMinutesByDay[index] || 0;
                const ratio = maxDayMinutes > 0 ? dayMinutes / maxDayMinutes : 0;
                const height = Math.max(ratio * 100, dayMinutes > 0 ? 12 : 4);

                return (
                  <div key={label} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '0.68rem', color: dayMinutes > 0 ? 'var(--accent-secondary)' : 'var(--text-muted)', fontWeight: 700, minHeight: '16px' }}>
                      {dayMinutes > 0 ? `${dayMinutes}m` : ''}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '190px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: `${height}%`,
                          background: dayMinutes > 0
                            ? 'linear-gradient(180deg, var(--accent-secondary), var(--accent-primary))'
                            : 'rgba(255,255,255,0.08)',
                          boxShadow: dayMinutes > 0 ? '0 0 18px var(--accent-secondary)33' : 'none',
                          transition: 'height 0.7s var(--ease-out-expo)'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="glass-panel" style={{ padding: '24px 24px', border: '1px solid var(--border-glass-top)' }}>
          <h3 className="font-display" style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Distribucion por momento</h3>
          <p style={{ margin: '8px 0 16px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Manana, tarde y noche</p>

          {showPageSkeleton ? (
            <div style={{ minHeight: '180px', display: 'grid', gap: '12px', alignContent: 'start' }}>
              <SectionSkeletonBlock height={12} width={'60%'} borderRadius={6} />
              <SectionSkeletonBlock height={12} width={'80%'} borderRadius={6} />
              <SectionSkeletonBlock height={8} width={'100%'} borderRadius={999} />
              <SectionSkeletonBlock height={8} width={'100%'} borderRadius={999} />
              <SectionSkeletonBlock height={8} width={'100%'} borderRadius={999} />
            </div>
          ) : !hasTimeDistribution ? (
            <div
              style={{
                minHeight: '180px',
                border: '1px dashed var(--border-glass-top)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.86rem',
                textAlign: 'center',
                padding: '16px'
              }}
            >
              Sin registro de minutos por franja horaria.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              {dayDistribution.map((slot) => {
                const percent = totalTimeDistribution > 0 ? Math.round((slot.value / totalTimeDistribution) * 100) : 0;
                const SlotIcon = slot.icon;

                return (
                  <div key={slot.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                        <SlotIcon size={14} color={slot.color} /> {slot.label}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{slot.value} min · {percent}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '999px', overflow: 'hidden', background: 'rgba(0,0,0,0.28)' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: `linear-gradient(90deg, ${slot.color}, var(--accent-primary))` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass-top)' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Resumen planner</p>
            {showPageSkeleton ? (
              <div style={{ marginTop: '10px' }}>
                <SectionSkeletonBlock height={12} width={'80%'} borderRadius={6} />
              </div>
            ) : (
              <p style={{ margin: '8px 0 0', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {hasBlocks ? `${completedBlocks} completados · ${pendingBlocks} pendientes · ${formatMinutes(totalMinutes) || `${totalMinutes} min`}` : 'Aun no hay bloques planificados'}
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="glass-panel" style={{ marginTop: '22px', padding: '24px', border: '1px solid var(--border-glass-top)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Sparkles size={18} color="var(--accent-lime)" />
          <h3 className="font-display" style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Insights de la semana</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {showPageSkeleton ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`insight-skeleton-${index}`}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  background: 'linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                  display: 'grid',
                  gap: '10px'
                }}
              >
                <SectionSkeletonBlock width={20} height={20} borderRadius={6} />
                <SectionSkeletonBlock width={'95%'} height={11} borderRadius={6} />
                <SectionSkeletonBlock width={'80%'} height={11} borderRadius={6} />
              </div>
            ))
          ) : insights && insights.length > 0 ? (
            <AnimatePresence>
              {insights.slice(0, 3).map((insight, index) => {
                const isWarning = insight.type === 'warning';
                const isSuccess = insight.type === 'success';
                const isInfo = insight.type === 'info';
                
                const iconColor = isWarning ? '#ffcc00' : isSuccess ? '#00ff66' : 'var(--accent-primary)';
                const IconComponent = isWarning ? AlertTriangle : isSuccess ? CheckCircle2 : Info;
                
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      background: 'linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      boxShadow: `inset 2px 0 0 0 ${iconColor}`
                    }}
                  >
                    <IconComponent size={20} color={iconColor} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ lineHeight: 1.5 }}>
                      {insight.message}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div style={{ opacity: 0.6, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Aún no hay suficiente información para generar insights.
            </div>
          )}
        </div>
      </section>

      <section className="glass-panel" style={{ marginTop: '22px', padding: '24px', border: '1px solid var(--border-glass-top)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Sparkles size={18} color="var(--accent-primary)" />
          <h3 className="font-display" style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recomendaciones PRO</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {showPageSkeleton ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`recommendation-skeleton-${index}`}
                style={{
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'linear-gradient(140deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
                  display: 'grid',
                  gap: '10px'
                }}
              >
                <SectionSkeletonBlock width={'70%'} height={13} borderRadius={6} />
                <SectionSkeletonBlock width={'100%'} height={11} borderRadius={6} />
                <SectionSkeletonBlock width={'100%'} height={11} borderRadius={6} />
                <SectionSkeletonBlock width={'45%'} height={28} borderRadius={8} />
              </div>
            ))
          ) : recommendations && recommendations.length > 0 ? (
            <AnimatePresence>
              {recommendations.slice(0, 3).map((rec, index) => {
                const isHigh = rec.priority === 'high';
                const isMedium = rec.priority === 'medium';
                const isLow = rec.priority === 'low';

                const priorityColor = isHigh ? '#ff6b6b' : isMedium ? '#ffcc00' : '#00ff66';
                const priorityBg = isHigh ? 'rgba(255, 107, 107, 0.15)' : isMedium ? 'rgba(255, 204, 0, 0.15)' : 'rgba(0, 255, 102, 0.15)';
                const priorityLabel = isHigh ? 'URGENTE' : isMedium ? 'MODERADA' : 'BAJA';

                return (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                    style={{
                      padding: '18px',
                      borderRadius: '14px',
                      border: `1px solid ${priorityColor}33`,
                      background: `linear-gradient(140deg, ${priorityBg}, rgba(255,255,255,0.01))`,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {rec.title}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: priorityBg,
                          color: priorityColor,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        {priorityLabel}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {rec.description}
                    </p>
                    <div
                      style={{
                        marginTop: '4px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: `${priorityColor}15`,
                        border: `1px solid ${priorityColor}33`,
                        fontSize: '0.82rem',
                        color: priorityColor,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        textAlign: 'center'
                      }}
                    >
                      {rec.actionLabel}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div style={{ opacity: 0.6, fontSize: '0.9rem', color: 'var(--text-muted)', padding: '20px', textAlign: 'center', gridColumn: '1 / -1' }}>
              No hay recomendaciones por ahora. Sigue registrando actividad.
            </div>
          )}
        </div>
      </section>

      {/* Tendencia semanal (Fase 5 Analítica Histórica) */}
      <section className="glass-panel" style={{ marginTop: '22px', padding: '24px', border: '1px outset var(--border-glass-top)', background: 'rgba(255, 255, 255, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 className="font-display" style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)' }}>Tendencia Semanal</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>vs Semana Anterior</span>
        </div>

        {showPageSkeleton ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            <SectionSkeletonBlock width={160} height={14} borderRadius={7} />
            <SectionSkeletonBlock width={'90%'} height={14} borderRadius={7} />
            <SectionSkeletonBlock width={'50%'} height={28} borderRadius={14} />
          </div>
        ) : (!historicalSummary || historicalSummary.semanaAnterior.minutos === 0) ? (
          <div style={{ opacity: 0.6, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Aún no hay suficiente historial para comparar.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Esta semana</p>
              <p style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {formatMinutes(historicalSummary.semanaActual.minutos) || '0 min'}
              </p>
            </div>
            <div style={{ height: '30px', width: '1px', background: 'var(--border-glass-top)' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Semana pasada</p>
              <p style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                {formatMinutes(historicalSummary.semanaAnterior.minutos) || '0 min'}
              </p>
            </div>
            <div style={{ height: '30px', width: '1px', background: 'var(--border-glass-top)' }} />
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '50px',
                background: historicalSummary.tendencia === 'up' ? 'rgba(0, 255, 102, 0.15)' : historicalSummary.tendencia === 'down' ? 'rgba(255, 77, 77, 0.15)' : 'rgba(255,255,255,0.05)',
                color: historicalSummary.tendencia === 'up' ? '#00ff66' : historicalSummary.tendencia === 'down' ? '#ff4d4d' : 'var(--text-primary)',
                fontWeight: 900,
                fontSize: '0.8rem'
              }}>
                {historicalSummary.tendencia === 'up' ? '↗ ' : historicalSummary.tendencia === 'down' ? '↘ ' : '→ '}
                {Math.abs(historicalSummary.diferenciaMinutos)} min
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {historicalSummary.tendencia === 'up' ? 'Vas mejor que la semana pasada.' : 
                 historicalSummary.tendencia === 'down' ? 'Tu planificación bajó esta semana.' : 
                 'Mantienes el mismo ritmo.'}
              </p>
            </div>
          </div>
        )}
      </section>

    </div>
  );
});

Stats.displayName = 'Stats';

export default Stats;

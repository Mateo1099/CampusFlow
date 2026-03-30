import React, { useState, useMemo } from 'react';
import { useTasksContext } from '../context/TaskContext';
import { useSettings } from '../context/SettingsContext';
import { differenceInDays, parseISO } from 'date-fns';
import { Activity, Target, Zap } from 'lucide-react';

// HELPERS DE AUDIO ASMR-TECH (WEB AUDIO API)
const playClick = (freq) => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
};

const Dashboard = () => {
  const { tasks, courses, tasksLoading, coursesLoading } = useTasksContext();
  const { t } = useSettings();
  const [currentFilter, setCurrentFilter] = useState('TODAS');

  const INSTITUTIONS = ['UNAD', 'SENA'];

  // LÓGICA DE FILTRADO REACTIVA PARA CONTADORES
  const { filteredTasks, filteredCourses } = useMemo(() => {
    let fCourses = courses;
    if (currentFilter !== 'TODAS') {
      if (currentFilter === 'PERSONALIZADO') {
        fCourses = courses.filter(c => !INSTITUTIONS.includes((c.institution || '').toUpperCase()));
      } else {
        fCourses = courses.filter(c => (c.institution || '').toUpperCase() === currentFilter);
      }
    }

    const courseIds = new Set(fCourses.map(c => c.id));
    const fTasks = tasks.filter(task => courseIds.has(task.course_id));

    return { filteredTasks: fTasks, filteredCourses: fCourses };
  }, [tasks, courses, currentFilter]);

  const upcomingTasks = useMemo(() => {
    return filteredTasks.filter(task => {
      const status = (task.status || '').toLowerCase();
      if (status === 'done' || status === 'submitted' || status === 'entregado' || !(task.deadline || task.due_date)) return false;
      try {
        const daysLeft = differenceInDays(parseISO(task.deadline || task.due_date), new Date());
        return daysLeft >= 0 && daysLeft <= 7;
      } catch { return false; }
    }).sort((a, b) => new Date(a.deadline || a.due_date) - new Date(b.deadline || b.due_date));
  }, [filteredTasks]);

  const pendingCount = useMemo(() => {
    return filteredTasks.filter(t => {
      const status = (t.status || '').toLowerCase();
      return status === 'sin entregar' || status === 'en proceso' || status === 'todo' || status === 'doing';
    }).length;
  }, [filteredTasks]);

  if (tasksLoading || coursesLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--accent-primary)' }}>
        <div className="animate-pulse font-display" style={{ fontWeight: 800 }}>//_CARGANDO_SISTEMA...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '32px 48px', position: 'relative', overflow: 'hidden', minHeight: '100%' }}>
      {/* Watermark gigante */}
      <div style={{ position: 'absolute', top: '-60px', left: '-20px', fontSize: '14rem', fontWeight: 900, color: 'rgba(255,255,255,0.02)', zIndex: -1, fontFamily: 'var(--font-display)', userSelect: 'none', pointerEvents: 'none' }}>
        HUB
      </div>

      <header className="page-header" style={{ marginBottom: '40px' }}>
        <h1 className="page-title" style={{ fontSize: '3.5rem', margin: 0, fontWeight: 950 }}>
          {t.welcomeBack}<span style={{ color: 'var(--accent-primary)' }}>_</span>
        </h1>
        <p className="page-subtitle" style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          {t.systemOverview}
        </p>
      </header>

      {/* FILTROS NEON-PILLS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
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

      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>

        {/* Métricas grandes */}
        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 4', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <Activity color="var(--accent-primary)" size={40} style={{ opacity: 0.15, position: 'absolute', top: '16px', right: '16px' }} />
          <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{t.activeSubjects}</p>
          <h3 key={filteredCourses.length} className="animate-number-pop" style={{ fontSize: '4.5rem', fontWeight: 900, margin: '8px 0 -8px', fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--accent-primary)', display: 'inline-block' }}>
            {String(filteredCourses.length).padStart(2, '0')}
          </h3>
          <div style={{ width: '100%', height: '2px', background: 'var(--border-glass-top)', marginTop: '24px', position: 'relative', borderRadius: '1px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(filteredCourses.length * 10, 100)}%`, background: 'var(--accent-primary)', boxShadow: `0 0 8px var(--accent-primary)`, borderRadius: '1px', transition: 'width 0.6s var(--ease-out-expo)' }} />
          </div>
        </div>

        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 4', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <Target color="var(--accent-secondary)" size={40} style={{ opacity: 0.15, position: 'absolute', top: '16px', right: '16px' }} />
          <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{t.pendingTasks}</p>
          <h3 key={pendingCount} className="animate-number-pop" style={{ fontSize: '4.5rem', fontWeight: 900, margin: '8px 0 -8px', fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--accent-secondary)', display: 'inline-block' }}>
            {String(pendingCount).padStart(2, '0')}
          </h3>
          <div style={{ width: '100%', height: '2px', background: 'var(--border-glass-top)', marginTop: '24px', position: 'relative', borderRadius: '1px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(pendingCount * 10, 100)}%`, background: 'var(--accent-secondary)', boxShadow: `0 0 8px var(--accent-secondary)`, borderRadius: '1px', transition: 'width 0.6s var(--ease-out-expo)' }} />
          </div>
        </div>

        {/* Panel Entregas - ocupa 2 filas */}
        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 4', gridRow: 'span 2', padding: '28px', background: 'rgba(0, 243, 255, 0.02)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', marginBottom: '28px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', color: 'var(--accent-primary)', fontWeight: 900 }}>
            <Zap size={18} />{t.deliveryRadar}
          </h2>

          {upcomingTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.4 }}>
              <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: '0.9rem', fontWeight: 800 }}>{t.noDeliveries}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {upcomingTasks.map(task => {
                let days;
                try { days = differenceInDays(parseISO(task.deadline || task.due_date), new Date()); } catch { days = 99; }
                const isUrgent = days <= 2;
                const activeColor = isUrgent ? 'var(--accent-danger)' : 'var(--accent-primary)';
                const taskCourse = courses.find(c => c.id === task.course_id);
                return (
                  <div key={task.id} style={{ position: 'relative', paddingLeft: '18px', borderLeft: `2px solid ${activeColor}` }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontWeight: 800 }}>{task.title}</h4>
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      <strong style={{ color: activeColor, fontWeight: 900 }}>{days === 0 ? t.dueToday : `${days}d`}</strong>
                      {taskCourse && ` — ${taskCourse.name}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Materias filtradas */}
        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 8', padding: '28px' }}>
          <h2 style={{ fontSize: '0.85rem', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontWeight: 900 }}>{t.subjects}</h2>
          {filteredCourses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>{t.emptyDatabase}</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {filteredCourses.map(c => {
                const displayColor = c.color || c.prefixColor || 'var(--accent-primary)';
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

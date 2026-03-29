import React from 'react';
import { useApp } from '../context/AppContext';
import { differenceInDays, parseISO } from 'date-fns';
import { Activity, Target, Zap } from 'lucide-react';

const Dashboard = () => {
  const { tasks, courses, t, tasksLoading, coursesLoading } = useApp();

  if (tasksLoading || coursesLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <div className="animate-pulse">Cargando dashboard...</div>
      </div>
    );
  }

  const upcomingTasks = tasks.filter(task => {
    if (task.status === 'done' || task.status === 'submitted' || !task.dueDate) return false;
    try {
      const daysLeft = differenceInDays(parseISO(task.dueDate), new Date());
      return daysLeft >= 0 && daysLeft <= 7;
    } catch { return false; }
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const pendingCount = tasks.filter(t => t.status === 'todo' || t.status === 'doing').length;

  return (
    <div className="animate-fade-in" style={{ padding: '32px 40px', position: 'relative', overflow: 'hidden' }}>
      {/* Watermark gigante */}
      <div style={{ position: 'absolute', top: '-60px', left: '-20px', fontSize: '14rem', fontWeight: 900, color: 'rgba(255,255,255,0.02)', zIndex: -1, fontFamily: 'var(--font-display)', userSelect: 'none', pointerEvents: 'none' }}>
        HUB
      </div>

      <header className="page-header" style={{ marginBottom: '48px' }}>
        <h1 className="page-title" style={{ fontSize: '3.5rem' }}>
          {t.welcomeBack}<span style={{ color: 'var(--accent-primary)' }}>_</span>
        </h1>
        <p className="page-subtitle" style={{ color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          {t.systemOverview}
        </p>
      </header>

      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>

        {/* Métricas grandes */}
        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 4', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <Activity color="var(--accent-primary)" size={40} style={{ opacity: 0.15, position: 'absolute', top: '16px', right: '16px' }} />
          <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{t.activeSubjects}</p>
          <h3 key={courses.length} className="animate-number-pop" style={{ fontSize: '4.5rem', fontWeight: 700, margin: '8px 0 -8px', fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--accent-primary)', display: 'inline-block' }}>
            {String(courses.length).padStart(2, '0')}
          </h3>
          <div style={{ width: '100%', height: '2px', background: 'var(--border-glass-top)', marginTop: '24px', position: 'relative', borderRadius: '1px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(courses.length * 10, 100)}%`, background: 'var(--accent-primary)', boxShadow: `0 0 8px var(--accent-primary)`, borderRadius: '1px', transition: 'width 0.6s var(--ease-out-expo)' }} />
          </div>
        </div>

        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 4', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <Target color="var(--accent-secondary)" size={40} style={{ opacity: 0.15, position: 'absolute', top: '16px', right: '16px' }} />
          <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{t.pendingTasks}</p>
          <h3 key={pendingCount} className="animate-number-pop" style={{ fontSize: '4.5rem', fontWeight: 700, margin: '8px 0 -8px', fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--accent-secondary)', display: 'inline-block' }}>
            {String(pendingCount).padStart(2, '0')}
          </h3>
          <div style={{ width: '100%', height: '2px', background: 'var(--border-glass-top)', marginTop: '24px', position: 'relative', borderRadius: '1px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(pendingCount * 10, 100)}%`, background: 'var(--accent-secondary)', boxShadow: `0 0 8px var(--accent-secondary)`, borderRadius: '1px', transition: 'width 0.6s var(--ease-out-expo)' }} />
          </div>
        </div>

        {/* Panel Entregas - ocupa 2 filas */}
        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 4', gridRow: 'span 2', padding: '28px', background: 'rgba(0, 243, 255, 0.02)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', marginBottom: '28px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', color: 'var(--accent-primary)' }}>
            <Zap size={18} />{t.deliveryRadar}
          </h2>

          {upcomingTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.4 }}>
              <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: '0.9rem' }}>{t.noDeliveries}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {upcomingTasks.map(task => {
                let days;
                try { days = differenceInDays(parseISO(task.dueDate), new Date()); } catch { days = 99; }
                const isUrgent = days <= 2;
                const activeColor = isUrgent ? 'var(--accent-danger)' : 'var(--accent-primary)';
                return (
                  <div key={task.id} style={{ position: 'relative', paddingLeft: '18px', borderLeft: `2px solid ${activeColor}` }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>{task.title}</h4>
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: activeColor }}>{days === 0 ? t.dueToday : `${days}d`}</strong>
                      {task.course && ` — ${task.course}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Materias recientes */}
        <div className="glass-panel glass-card-hover" style={{ gridColumn: 'span 8', padding: '28px' }}>
          <h2 style={{ fontSize: '0.85rem', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>{t.subjects}</h2>
          {courses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.emptyDatabase}</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {courses.map(c => (
                <div key={c.id} style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)', border: `1px solid ${c.prefixColor}`, color: c.prefixColor, fontSize: '0.8rem', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: `0 0 10px ${c.prefixColor}33` }}>
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

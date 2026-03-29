import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, CheckCircle2, Circle, Clock, Trash2, Target } from 'lucide-react';

const DailyPlanner = () => {
  const { dailyPlan, addDailyActivity, toggleDailyActivity, removeDailyActivity, t } = useApp();
  const [formData, setFormData] = useState({ title: '', startTime: '06:00', durationMinutes: '30' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return;
    addDailyActivity(formData);
    setFormData({ title: '', startTime: '06:00', durationMinutes: '30' });
  };

  const sortedPlan = [...dailyPlan].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const completedCount = dailyPlan.filter(a => a.completed).length;

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '32px 40px' }}>
      <header className="page-header" style={{ marginBottom: '32px' }}>
        <h1 className="page-title">{t.planner}</h1>
        <p className="page-subtitle" style={{ color: 'var(--accent-lime)', fontFamily: 'monospace' }}>
          {dailyPlan.length > 0 && (
            <span style={{ color: 'var(--text-muted)' }}>{completedCount}/{dailyPlan.length} completadas</span>
          )}
        </p>
      </header>

      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '48px', flex: 1, minHeight: 0 }}>

        {/* Formulario */}
        <div className="glass-panel glass-card-hover" style={{ padding: '28px', height: 'fit-content' }}>
          <h3 className="font-display" style={{ marginBottom: '24px', fontSize: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <Target size={18} /> {t.addActivity}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.activityTitle}</label>
              <input className="input" placeholder="Ej. Estudiar Cálculo, Desayunar..." value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.startTime}</label>
                <input type="time" className="input" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.duration}</label>
                <select className="select" value={formData.durationMinutes} onChange={e => setFormData({ ...formData, durationMinutes: e.target.value })}>
                  {[15, 30, 45, 60, 90, 120, 180].map(d => (
                    <option key={d} value={String(d)} style={{ background: 'var(--bg-primary)' }}>{d} min</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              <Plus size={16} /> Añadir
            </button>
          </form>
        </div>

        {/* Timeline */}
        <div style={{ overflowY: 'auto', paddingRight: '8px' }}>
          {sortedPlan.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <Clock size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p className="font-display" style={{ fontSize: '1.1rem', letterSpacing: '0.1em' }}>{t.noEvents}</p>
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Línea vertical */}
              <div style={{ position: 'absolute', top: '24px', bottom: '24px', left: '23px', width: '2px', background: 'var(--border-glass-top)', opacity: 0.5 }} />

              {sortedPlan.map((activity, idx) => (
                <div key={activity.id} className="stagger-item" style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', animationDelay: `${idx * 0.1}s` }}>
                  <button
                    onClick={() => toggleDailyActivity(activity.id)}
                    className="click-press"
                    style={{ background: 'var(--bg-primary)', border: 'none', zIndex: 2, cursor: 'pointer', padding: 0, display: 'flex', borderRadius: '50%', outline: 'none', flexShrink: 0, transition: 'transform 0.2s' }}
                    title="Marcar como completada"
                  >
                    {activity.completed
                      ? <CheckCircle2 size={48} color="var(--accent-lime)" style={{ filter: 'drop-shadow(0 0 8px rgba(204,255,0,0.5))' }} />
                      : <Circle size={48} color="var(--text-muted)" />
                    }
                  </button>

                  <div className={`glass-panel ${!activity.completed ? 'glass-card-hover' : ''}`} style={{ flex: 1, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: activity.completed ? 0.45 : 1, transition: 'all 0.3s var(--ease-out-expo)', borderLeft: `3px solid ${activity.completed ? 'var(--accent-lime)' : 'var(--accent-primary)'}`, borderRadius: 'var(--radius-md)', transform: 'translateZ(0)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: activity.completed ? 'var(--accent-lime)' : 'var(--accent-primary)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                        {activity.startTime} · {activity.durationMinutes}min
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 500, textDecoration: activity.completed ? 'line-through' : 'none', color: activity.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {activity.title}
                      </span>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={() => removeDailyActivity(activity.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyPlanner;

import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTasksContext } from '../context/TaskContext';
import { PieChart, Zap, TrendingUp, Target, Clock, Trophy } from 'lucide-react';

const Stats = () => {
  const { settings, t } = useSettings();
  const { courses, tasks, tasksLoading, coursesLoading, analytics, habitsLoading } = useTasksContext();

  if (tasksLoading || coursesLoading || habitsLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <div className="animate-pulse">Analizando métricas en tiempo real...</div>
      </div>
    );
  }

  const { totalTasks, completedTasks, totalHabits, completedHabits, productivity } = analytics;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const habitProgress = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;

  const tasksByCourse = courses.map(c => ({
    name: c.name,
    color: c.color || c.prefixColor,
    count: tasks.filter(t => t.course === c.name).length
  }));

  return (
    <div className="animate-fade-in" style={{ padding: '32px 40px', height: '100%', overflowY: 'auto' }}>
      <header className="page-header" style={{ marginBottom: '40px' }}>
        <h1 className="page-title">Analítica del Sistema</h1>
        <p className="page-subtitle" style={{ color: 'var(--accent-secondary)' }}>Rendimiento derivado de Supabase Cloud</p>
      </header>

      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
        
        {/* Card: Gamificación */}
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Trophy size={20} color="var(--accent-primary)" />
            <h3 className="font-display" style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Estado de Rango</h3>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ 
              fontSize: '4rem', fontWeight: 900, fontFamily: 'var(--font-display)', 
              color: 'var(--accent-primary)', textShadow: '0 0 30px var(--accent-primary)44',
              lineHeight: 1
            }}>
              {settings.level}
            </div>
            <p style={{ color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '12px' }}>Nivel de Estudiante</p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '10px', color: 'var(--text-secondary)' }}>
              <span>Progreso de Nivel</span>
              <span>{settings.experience} / 1000 XP</span>
            </div>
            <div style={{ height: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-glass-top)' }}>
              <div style={{ width: `${(settings.experience / 1000) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', boxShadow: '0 0 10px var(--accent-primary)', transition: 'all 0.6s' }} />
            </div>
          </div>
        </div>

        {/* Card: Métricas de Tareas */}
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Zap size={20} color="var(--accent-lime)" />
            <h3 className="font-display" style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Eficiencia de Trabajos</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</p>
              <h4 style={{ margin: '8px 0 0', fontSize: '1.8rem', color: 'var(--text-primary)' }}>{totalTasks}</h4>
            </div>
            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Entregados</p>
              <h4 style={{ margin: '8px 0 0', fontSize: '1.8rem', color: 'var(--accent-secondary)' }}>{completedTasks}</h4>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
              <span>Tasa de Finalización</span>
              <span style={{ color: 'var(--accent-lime)', fontWeight: 700 }}>{taskProgress.toFixed(0)}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${taskProgress}%`, height: '100%', background: 'var(--accent-lime)' }} />
            </div>
          </div>
        </div>

        {/* Card: Hábitos Hoy */}
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Clock size={20} color="var(--accent-primary)" />
            <h3 className="font-display" style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Hábitos Hoy</h3>
          </div>
          
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
             <h2 style={{ fontSize: '3rem', margin: 0, color: 'var(--accent-primary)' }}>{completedHabits} / {totalHabits}</h2>
             <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Objetivos cumplidos</p>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
              <span>Cumplimiento Diario</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{habitProgress.toFixed(0)}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${habitProgress}%`, height: '100%', background: 'var(--accent-primary)' }} />
            </div>
          </div>
        </div>

      </div>

      {/* Gráfico: Productividad Semanal */}
      <div className="glass-panel" style={{ marginTop: '28px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <TrendingUp size={20} color="var(--accent-primary)" />
          <h3 className="font-display" style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Productividad Semanal (Tareas Entregadas)</h3>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', height: '200px', alignItems: 'flex-end', gap: '10px', padding: '0 20px' }}>
          {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((d, i) => {
            const val = productivity[i];
            const max = Math.max(...productivity, 1);
            const height = (val / max) * 100;
            return (
              <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '100%', 
                  height: `${height}%`, 
                  minHeight: val > 0 ? '10px' : '2px',
                  background: val > 0 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--border-glass-top)',
                  borderRadius: '8px 8px 4px 4px',
                  boxShadow: val > 0 ? '0 0 15px var(--accent-primary)22' : 'none',
                  transition: 'height 1s var(--ease-out-expo)',
                  position: 'relative'
                }}>
                  {val > 0 && <span style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', fontWeight: 800 }}>{val}</span>}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{d}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default Stats;

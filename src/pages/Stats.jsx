import React from 'react';
import { useApp } from '../context/AppContext';
import { PieChart, Zap, TrendingUp, Target, Clock, Trophy } from 'lucide-react';

const Stats = () => {
  const { settings, courses, tasks, t } = useApp();

  // Datos para los gráficos
  const stats = settings.stats || {};
  const tasksByCourse = courses.map(c => ({
    name: c.name,
    color: c.prefixColor,
    count: tasks.filter(t => t.course === c.name).length
  }));

  const totalTasks = tasks.length;
  const submittedTasks = tasks.filter(t => t.status === 'submitted').length;
  const progressPercent = totalTasks > 0 ? (submittedTasks / totalTasks) * 100 : 0;

  return (
    <div className="animate-fade-in" style={{ padding: '32px 40px', height: '100%', overflowY: 'auto' }}>
      <header className="page-header" style={{ marginBottom: '40px' }}>
        <h1 className="page-title">Analítica avanzada</h1>
        <p className="page-subtitle" style={{ color: 'var(--accent-secondary)' }}>Métricas de rendimiento y gamificación</p>
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

        {/* Card: Métricas Rápidas */}
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Zap size={20} color="var(--accent-lime)" />
            <h3 className="font-display" style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Métricas Operativas</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pomodoros</p>
              <h4 style={{ margin: '8px 0 0', fontSize: '1.8rem', color: 'var(--accent-lime)' }}>{stats.pomodorosCompleted || 0}</h4>
            </div>
            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Entregados</p>
              <h4 style={{ margin: '8px 0 0', fontSize: '1.8rem', color: 'var(--accent-secondary)' }}>{stats.tasksCompleted || 0}</h4>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
              <span>Tasa de Finalización de Trabajos</span>
              <span style={{ color: 'var(--accent-lime)', fontWeight: 700 }}>{progressPercent.toFixed(0)}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-lime)' }} />
            </div>
          </div>
        </div>

        {/* Card: Carga por Materia */}
        <div className="glass-panel" style={{ padding: '32px', gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Target size={20} color="var(--accent-secondary)" />
            <h3 className="font-display" style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Carga de Trabajo</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '200px', overflowY: 'auto' }}>
            {tasksByCourse.length > 0 ? tasksByCourse.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color }} />
                <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.name}</span>
                <div style={{ width: '60%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                   <div style={{ width: `${(c.count / (totalTasks || 1)) * 100}%`, height: '100%', background: c.color }} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>{c.count}</span>
              </div>
            )) : <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay materias registradas</p>}
          </div>
        </div>

      </div>

      {/* Gráfico de barras: Productividad Semanal (Fake por ahora) */}
      <div className="glass-panel" style={{ marginTop: '28px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <TrendingUp size={20} color="var(--accent-primary)" />
          <h3 className="font-display" style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase' }}>Productividad Semanal</h3>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', height: '200px', alignItems: 'flex-end', gap: '10px', padding: '0 20px' }}>
          {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((d, i) => {
            const h = [65, 45, 90, 30, 85, 20, 10][i]; // Fake data
            return (
              <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '100%', 
                  height: `${h}%`, 
                  background: i === 2 ? 'var(--accent-primary)' : 'var(--bg-glass-hover)', 
                  border: '1px solid var(--border-glass-top)',
                  borderRadius: '12px 12px 4px 4px',
                  boxShadow: i === 2 ? '0 0 20px var(--accent-primary)33' : 'none',
                  transition: 'height 1s var(--ease-out-expo)'
                }} />
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

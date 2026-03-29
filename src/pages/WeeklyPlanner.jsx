import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, Calendar, CheckCircle2, Circle } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const BLOCKS = ['morning', 'afternoon', 'night'];

const DAY_LABELS = { 
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', 
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' 
};

const WeeklyPlanner = () => {
  const { tasks, updateTaskStatus, tasksLoading, t } = useApp();

  const scheduleMap = useMemo(() => {
    const map = BLOCKS.reduce((acc, block) => {
      acc[block] = DAYS.reduce((dayAcc, day) => {
        dayAcc[day] = [];
        return dayAcc;
      }, {});
      return acc;
    }, {});

    tasks.forEach(task => {
      if (task.day && task.block && map[task.block] && map[task.block][task.day]) {
        map[task.block][task.day].push(task);
      }
    });

    return map;
  }, [tasks]);

  if (tasksLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <div className="animate-pulse">Sincronizando planificador...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '32px 40px', height: '100%', overflowY: 'auto' }}>
      <header className="page-header" style={{ marginBottom: '32px' }}>
        <h1 className="page-title">Planificador Semanal</h1>
        <p className="page-subtitle" style={{ color: 'var(--accent-primary)' }}>Organización por bloques de tiempo</p>
      </header>

      <div className="weekly-grid-container" style={{ 
        display: 'grid', 
        gridTemplateColumns: '100px repeat(7, 1fr)', 
        gap: '1px', 
        background: 'var(--border-glass-top)',
        border: '1px solid var(--border-glass-top)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }}>
        {/* Header Días */}
        <div style={{ background: 'var(--bg-glass)', padding: '16px' }} />
        {DAYS.map(day => (
          <div key={day} style={{ 
            background: 'var(--bg-glass)', 
            padding: '16px', 
            textAlign: 'center',
            fontWeight: 800,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--accent-primary)',
            borderLeft: '1px solid var(--border-glass-top)'
          }}>
            {DAY_LABELS[day]}
          </div>
        ))}

        {/* Filas por Bloque */}
        {BLOCKS.map(block => (
          <React.Fragment key={block}>
            <div style={{ 
              background: 'var(--bg-glass)', 
              padding: '24px 16px', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderTop: '1px solid var(--border-glass-top)'
            }}>
              <Clock size={18} color="var(--text-muted)" />
              <span style={{ 
                fontSize: '0.6rem', 
                fontWeight: 900, 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                writingMode: 'vertical-lr',
                transform: 'rotate(180deg)'
              }}>
                {block === 'morning' ? 'Mañana' : block === 'afternoon' ? 'Tarde' : 'Noche'}
              </span>
            </div>

            {DAYS.map(day => (
              <div key={`${block}-${day}`} style={{ 
                background: 'rgba(255,255,255,0.02)', 
                minHeight: '160px',
                padding: '12px',
                borderTop: '1px solid var(--border-glass-top)',
                borderLeft: '1px solid var(--border-glass-top)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {scheduleMap[block][day].map(task => (
                  <div 
                    key={task.id} 
                    className="glass-panel click-press"
                    style={{ 
                      padding: '10px', 
                      fontSize: '0.75rem', 
                      borderRadius: '8px',
                      borderLeft: `3px solid ${task.status === 'submitted' ? 'var(--accent-lime)' : 'var(--accent-primary)'}`,
                      opacity: task.status === 'submitted' ? 0.6 : 1,
                      cursor: 'pointer'
                    }}
                    onClick={() => updateTaskStatus(task.id, task.status === 'submitted' ? 'todo' : 'submitted')}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </div>
                    {task.course && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {task.course}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WeeklyPlanner;

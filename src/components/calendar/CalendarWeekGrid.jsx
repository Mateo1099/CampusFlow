import React, { useState } from 'react';
import { Plus, Clock, CheckCircle2, AlertCircle, Flame, Eye } from 'lucide-react';
import {
  getWeekDays,
  getTaskInstitution,
  getInstitutionTheme,
  getTaskTime,
  getTaskPriority
} from './calendarUtils';

const STATUS_ICONS = {
  'sin entregar': AlertCircle,
  'en proceso': Flame,
  'revisión': Eye,
  'entregado': CheckCircle2,
  'submitted': CheckCircle2
};

export default function CalendarWeekGrid({
  currentDate,
  selectedDay,
  onSelectDay,
  tasksByDate = {},
  courses = [],
  onSelectEvent,
  onAddEvent
}) {
  const weekDays = getWeekDays(currentDate);

  // En móvil, control del día activo
  const [mobileActiveDay, setMobileActiveDay] = useState(
    () => selectedDay || weekDays.find(d => d.isToday)?.dateStr || weekDays[0].dateStr
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0 }}>
      {/* Selector de Días Móvil (< 768px) */}
      <div
        className="flex md:hidden glass-panel"
        style={{
          borderRadius: '16px',
          padding: '8px',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.6)'
        }}
      >
        {weekDays.map((d) => {
          const isSelected = mobileActiveDay === d.dateStr;
          const dayTasks = tasksByDate[d.dateStr] || [];
          const hasTasks = dayTasks.length > 0;

          return (
            <button
              key={d.dateStr}
              type="button"
              onClick={() => {
                setMobileActiveDay(d.dateStr);
                onSelectDay(d.dateStr);
              }}
              style={{
                flex: '1 0 54px',
                padding: '8px 4px',
                borderRadius: '12px',
                border: isSelected
                  ? '1.5px solid #00f3ff'
                  : d.isToday
                  ? '1px solid rgba(0, 243, 255, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                background: isSelected
                  ? 'rgba(0, 243, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.02)',
                color: isSelected ? '#00f3ff' : 'var(--text-primary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 0 12px rgba(0, 243, 255, 0.25)' : 'none'
              }}
            >
              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>
                {d.dayShort}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 900 }}>
                {d.dayNumber}
              </span>
              {hasTasks && (
                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#00f3ff',
                    boxShadow: '0 0 6px #00f3ff'
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Cuadrícula Semanal en Escritorio (7 columnas) */}
      <div
        className="hidden md:grid"
        style={{
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '12px',
          width: '100%',
          minWidth: 0
        }}
      >
        {weekDays.map((d) => {
          const dayTasks = tasksByDate[d.dateStr] || [];
          const isSelected = selectedDay === d.dateStr;

          return (
            <div
              key={d.dateStr}
              onClick={() => onSelectDay(d.dateStr)}
              style={{
                borderRadius: '20px',
                background: isSelected
                  ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.6) 0%, rgba(10, 14, 26, 0.7) 100%)'
                  : 'linear-gradient(145deg, rgba(15, 23, 42, 0.45) 0%, rgba(10, 14, 26, 0.55) 100%)',
                border: isSelected
                  ? '1.5px solid #00f3ff'
                  : d.isToday
                  ? '1.5px solid rgba(0, 243, 255, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isSelected
                  ? '0 0 20px rgba(0, 243, 255, 0.15)'
                  : d.isToday
                  ? '0 0 12px rgba(0, 243, 255, 0.1)'
                  : 'none',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '440px',
                boxSizing: 'border-box',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              {/* Header del Día */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {d.dayName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: d.isToday ? '#00f3ff' : 'var(--text-primary)' }}>
                      {d.dayNumber}
                    </span>
                    {d.isToday && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: 'rgba(0, 243, 255, 0.18)',
                          color: '#00f3ff',
                          border: '1px solid rgba(0, 243, 255, 0.35)'
                        }}
                      >
                        HOY
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddEvent(d.dateStr);
                  }}
                  title={`Nueva entrega para ${d.dayName} ${d.dayNumber}`}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#00f3ff';
                    e.currentTarget.style.borderColor = 'rgba(0, 243, 255, 0.4)';
                    e.currentTarget.style.background = 'rgba(0, 243, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Lista de Tareas para este Día */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                {dayTasks.length === 0 ? (
                  <div
                    style={{
                      height: '100%',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.74rem',
                      textAlign: 'center',
                      padding: '12px 6px',
                      border: '1px dashed rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px'
                    }}
                  >
                    Sin entregas
                  </div>
                ) : (
                  dayTasks.map((task) => {
                    const inst = getTaskInstitution(task, courses);
                    const theme = getInstitutionTheme(inst);
                    const course = courses.find(c => c.id === task.course_id) || task.courses;
                    const priority = getTaskPriority(task);
                    const time = getTaskTime(task);
                    const statusKey = (task.status || 'sin entregar').toLowerCase();
                    const StatusIcon = STATUS_ICONS[statusKey] || AlertCircle;
                    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];

                    return (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(task);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '14px',
                          background: `linear-gradient(135deg, ${theme.bg}, rgba(255, 255, 255, 0.015))`,
                          border: `1px solid ${theme.border}`,
                          boxShadow: `0 4px 14px rgba(0, 0, 0, 0.25), 0 0 10px ${theme.glow}`,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = theme.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.borderColor = theme.border;
                        }}
                      >
                        {/* Institution & Urgency */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontSize: '0.64rem',
                              fontWeight: 900,
                              background: theme.badgeBg,
                              color: theme.color,
                              border: `1px solid ${theme.border}`
                            }}
                          >
                            {inst}
                          </span>

                          {priority && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: priority.color }}>
                              {priority.label}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
                          {task.title}
                        </div>

                        {/* Course */}
                        {course && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: course.color || theme.color }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {course.name}
                            </span>
                          </div>
                        )}

                        {/* Bottom Row: Time and Status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} /> {time || '23:59'}
                          </span>

                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: theme.color, fontWeight: 700 }}>
                            <StatusIcon size={11} />
                            {subtasks.length > 0 ? `${subtasks.filter(s => s.completed).length}/${subtasks.length}` : (task.status || 'Pendiente')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista Semanal en Móvil: Detalle del día seleccionado */}
      <div className="flex md:hidden flex-col gap-3">
        {(() => {
          const currentDayObj = weekDays.find(d => d.dateStr === mobileActiveDay) || weekDays[0];
          const tasks = tasksByDate[mobileActiveDay] || [];

          return (
            <div
              className="glass-panel"
              style={{
                borderRadius: '20px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(10, 14, 26, 0.8) 100%)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {currentDayObj.dayName}, {currentDayObj.dayNumber} {currentDayObj.isToday ? '(HOY)' : ''}
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {tasks.length === 0 ? 'Sin entregas para este día' : `${tasks.length} entregas agendadas`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAddEvent(mobileActiveDay)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: 'rgba(0, 243, 255, 0.1)',
                    border: '1px solid rgba(0, 243, 255, 0.3)',
                    color: '#00f3ff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} /> Nueva
                </button>
              </div>

              {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  No hay entregas pendientes para este día.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tasks.map(t => {
                    const inst = getTaskInstitution(t, courses);
                    const theme = getInstitutionTheme(inst);
                    const course = courses.find(c => c.id === t.course_id) || t.courses;
                    const time = getTaskTime(t);

                    return (
                      <div
                        key={t.id}
                        onClick={() => onSelectEvent(t)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          background: theme.bg,
                          border: `1px solid ${theme.border}`,
                          boxShadow: `0 4px 14px rgba(0,0,0,0.3), 0 0 10px ${theme.glow}`,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: theme.color, background: theme.badgeBg, padding: '2px 6px', borderRadius: '6px' }}>
                            {inst}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {time || '23:59'} hrs
                          </span>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{t.title}</div>
                        {course && <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{course.name}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

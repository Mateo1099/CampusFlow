import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Clock, Calendar as CalendarIcon, Flame } from 'lucide-react';
import {
  DAY_NAMES_ES,
  getMonthMatrix,
  getTaskInstitution,
  getInstitutionTheme,
  getTaskTime,
  getTaskPriority,
  formatLongDate
} from './calendarUtils';

export default function CalendarMonthGrid({
  currentDate,
  selectedDay,
  onSelectDay,
  tasksByDate = {},
  courses = [],
  onSelectEvent,
  onAddEvent
}) {
  const [popoverDay, setPopoverDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const matrixDays = getMonthMatrix(year, month);

  // Tareas del día seleccionado para el panel móvil/detalle
  const selectedDayTasks = selectedDay ? (tasksByDate[selectedDay] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0 }}>
      {/* Cuadrícula Principal */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.45) 0%, rgba(10, 14, 26, 0.55) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '16px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}
      >
        {/* Cabecera de Días de la Semana */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '8px',
            marginBottom: '10px',
            textAlign: 'center'
          }}
        >
          {DAY_NAMES_ES.map((d, idx) => (
            <div
              key={d.full}
              style={{
                padding: '8px 4px',
                fontSize: '0.78rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: idx >= 5 ? 'var(--text-muted)' : 'var(--text-secondary)',
                textTransform: 'uppercase'
              }}
            >
              <span className="hidden sm:inline">{d.short}</span>
              <span className="sm:hidden">{d.initial}</span>
            </div>
          ))}
        </div>

        {/* Celdas de Días */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '8px',
            minWidth: 0
          }}
        >
          {matrixDays.map((cell) => {
            const dayTasks = tasksByDate[cell.dateStr] || [];
            const isSelected = selectedDay === cell.dateStr;

            return (
              <div
                key={cell.dateStr}
                onClick={() => onSelectDay(cell.dateStr)}
                style={{
                  minHeight: '105px',
                  borderRadius: '16px',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.12), rgba(255, 255, 255, 0.03))'
                    : cell.isCurrentMonth
                    ? 'rgba(255, 255, 255, 0.025)'
                    : 'rgba(255, 255, 255, 0.008)',
                  border: isSelected
                    ? '1.5px solid #00f3ff'
                    : cell.isToday
                    ? '1.5px solid rgba(0, 243, 255, 0.45)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(0, 243, 255, 0.22), inset 0 0 10px rgba(0, 243, 255, 0.05)'
                    : cell.isToday
                    ? '0 0 12px rgba(0, 243, 255, 0.15)'
                    : 'none',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  cursor: 'pointer',
                  opacity: cell.isCurrentMonth ? 1 : 0.38,
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxSizing: 'border-box',
                  overflow: 'hidden'
                }}
                className="calendar-month-cell group"
              >
                {/* Cabecera de la celda: Número de día y botón "+" */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: cell.isToday ? '26px' : 'auto',
                        height: cell.isToday ? '26px' : 'auto',
                        borderRadius: cell.isToday ? '50%' : '0',
                        background: cell.isToday ? '#00f3ff' : 'transparent',
                        color: cell.isToday ? '#05070f' : isSelected ? '#00f3ff' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: cell.isToday || isSelected ? 900 : 700
                      }}
                    >
                      {cell.dayNumber}
                    </span>

                    {cell.isToday && (
                      <span
                        className="hidden md:inline"
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          color: '#00f3ff',
                          letterSpacing: '0.05em'
                        }}
                      >
                        HOY
                      </span>
                    )}

                    {/* Indicador sutil de Día Cargado (3 o más entregas) */}
                    {dayTasks.length >= 3 && (
                      <span
                        title={`Día cargado: ${dayTasks.length} entregas programadas`}
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          padding: '1px 5px',
                          borderRadius: '6px',
                          background: 'rgba(255, 179, 71, 0.16)',
                          color: '#ffb347',
                          border: '1px solid rgba(255, 179, 71, 0.45)',
                          boxShadow: '0 0 8px rgba(255, 179, 71, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Flame size={10} color="#ffb347" />
                        <span className="hidden lg:inline">Día cargado</span>
                        <span className="lg:hidden">{dayTasks.length}</span>
                      </span>
                    )}
                  </div>

                  {/* Botón rápido "+ Agregar" */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddEvent(cell.dateStr);
                    }}
                    title={`Agregar entrega para ${cell.dateStr}`}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: 0.6,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.color = '#00f3ff';
                      e.currentTarget.style.borderColor = 'rgba(0, 243, 255, 0.4)';
                      e.currentTarget.style.background = 'rgba(0, 243, 255, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.6';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Eventos en Desktop / Tablet: Chips coloreados por Institución */}
                <div className="hidden sm:flex" style={{ flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                  {dayTasks.slice(0, 2).map((task) => {
                    const inst = getTaskInstitution(task, courses);
                    const theme = getInstitutionTheme(inst);
                    const isDone = (task.status || '').toLowerCase() === 'entregado' || (task.status || '').toLowerCase() === 'submitted';
                    const time = getTaskTime(task);

                    return (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(task);
                        }}
                        style={{
                          padding: '3px 6px',
                          borderRadius: '8px',
                          background: theme.bg,
                          border: `1px solid ${theme.border}`,
                          boxShadow: `0 0 8px ${theme.glow}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#fff',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          transition: 'all 0.18s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.borderColor = theme.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.borderColor = theme.border;
                        }}
                      >
                        {/* Dot temático o check */}
                        {isDone ? (
                          <Check size={11} color="#10b981" strokeWidth={3} style={{ flexShrink: 0 }} />
                        ) : (
                          <div
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: theme.color,
                              flexShrink: 0,
                              boxShadow: `0 0 4px ${theme.color}`
                            }}
                          />
                        )}

                        {time && (
                          <span style={{ fontSize: '0.66rem', color: theme.color, fontWeight: 800 }}>
                            {time}
                          </span>
                        )}

                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textDecoration: isDone ? 'line-through' : 'none',
                            opacity: isDone ? 0.7 : 1
                          }}
                        >
                          {task.title}
                        </span>
                      </div>
                    );
                  })}

                  {/* Botón "+N más" si hay más de 2 entregas */}
                  {dayTasks.length > 2 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopoverDay(popoverDay === cell.dateStr ? null : cell.dateStr);
                      }}
                      style={{
                        border: 'none',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-secondary)',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'color 0.2s'
                      }}
                    >
                      +{dayTasks.length - 2} más...
                    </button>
                  )}
                </div>

                {/* Eventos en Móvil: Indicadores Dots de colores por institución */}
                <div className="flex sm:hidden" style={{ gap: '4px', flexWrap: 'wrap', marginTop: 'auto' }}>
                  {dayTasks.slice(0, 4).map((task) => {
                    const inst = getTaskInstitution(task, courses);
                    const theme = getInstitutionTheme(inst);
                    return (
                      <div
                        key={task.id}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: theme.color,
                          boxShadow: `0 0 6px ${theme.glow}`
                        }}
                      />
                    );
                  })}
                  {dayTasks.length > 4 && (
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+</span>
                  )}
                </div>

                {/* Popover flotante para ver todos los eventos del día */}
                <AnimatePresence>
                  {popoverDay === cell.dateStr && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 6 }}
                      style={{
                        position: 'absolute',
                        top: '40px',
                        left: '8px',
                        right: '8px',
                        zIndex: 40,
                        padding: '10px',
                        borderRadius: '14px',
                        background: '#0d1322',
                        border: '1px solid rgba(0, 243, 255, 0.35)',
                        boxShadow: '0 16px 36px rgba(0,0,0,0.65)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#00f3ff' }}>
                          {dayTasks.length} Entregas
                        </span>
                        <button
                          type="button"
                          onClick={() => setPopoverDay(null)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                        {dayTasks.map(t => {
                          const inst = getTaskInstitution(t, courses);
                          const theme = getInstitutionTheme(inst);
                          return (
                            <div
                              key={t.id}
                              onClick={() => {
                                setPopoverDay(null);
                                onSelectEvent(t);
                              }}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '8px',
                                background: theme.bg,
                                border: `1px solid ${theme.border}`,
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                              <span style={{ fontSize: '0.65rem', color: theme.color, fontWeight: 900 }}>{inst}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel de Entregas del Día Seleccionado (Visible especialmente en móvil y útil en escritorio) */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(10, 14, 26, 0.7) 100%)',
          backdropFilter: 'blur(20px)',
          padding: '20px 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={18} color="#00f3ff" />
              Entregas del día: <span style={{ color: '#00f3ff' }}>{formatLongDate(selectedDay)}</span>
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {selectedDayTasks.length === 0
                ? 'No hay entregas registradas para este día'
                : `${selectedDayTasks.length} ${selectedDayTasks.length === 1 ? 'actividad programada' : 'actividades programadas'}`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onAddEvent(selectedDay)}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              background: 'rgba(0, 243, 255, 0.1)',
              border: '1px solid rgba(0, 243, 255, 0.3)',
              color: '#00f3ff',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 14px rgba(0, 243, 255, 0.15)'
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Nueva Entrega
          </button>
        </div>

        {selectedDayTasks.length === 0 ? (
          <div
            style={{
              padding: '30px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.88rem',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '14px'
            }}
          >
            Día despejado. Haz clic en &quot;Nueva Entrega&quot; para agendar una tarea o recordatorio.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {selectedDayTasks.map((task) => {
              const inst = getTaskInstitution(task, courses);
              const theme = getInstitutionTheme(inst);
              const course = courses.find(c => c.id === task.course_id) || task.courses;
              const priority = getTaskPriority(task);
              const time = getTaskTime(task);

              return (
                <div
                  key={task.id}
                  onClick={() => onSelectEvent(task)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, ${theme.bg}, rgba(255, 255, 255, 0.02))`,
                    border: `1px solid ${theme.border}`,
                    boxShadow: `0 8px 24px rgba(0, 0, 0, 0.25), 0 0 15px ${theme.glow}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 12px 30px rgba(0, 0, 0, 0.35), 0 0 20px ${theme.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.25), 0 0 15px ${theme.glow}`;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '20px',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        background: theme.badgeBg,
                        color: theme.color,
                        border: `1px solid ${theme.border}`
                      }}
                    >
                      {inst}
                    </span>

                    {priority && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: priority.color
                        }}
                      >
                        {priority.label}
                      </span>
                    )}
                  </div>

                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {task.title}
                    </h5>
                    {course && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {course.name}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {time ? `${time} hrs` : 'Todo el día'}
                    </span>

                    <span style={{ textTransform: 'capitalize', color: theme.color, fontWeight: 700 }}>
                      {task.status || 'Sin entregar'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

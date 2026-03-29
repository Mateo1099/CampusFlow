import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, X, GripVertical, Calendar as CalendarIcon, Trash2, Edit2 } from 'lucide-react';
import CustomCalendar from '../components/ui/CustomCalendar';

// Columnas del Kanban con nombres en contexto
const getColumns = (t) => [
  { id: 'todo',      label: t.pendingTasks, accent: 'var(--text-secondary)', badgeClass: 'badge-todo' },
  { id: 'doing',     label: t.doing,        accent: 'var(--accent-primary)',  badgeClass: 'badge-doing' },
  { id: 'done',      label: t.done,         accent: 'var(--accent-lime)',     badgeClass: 'badge-done' },
  { id: 'submitted', label: t.submitted,    accent: 'var(--accent-secondary)',badgeClass: 'badge-submitted' },
];

// ---- Tarjeta Individual Arrastrable ----
const TaskCard = ({ task, onDelete, onEdit, onDragStart, courses }) => {
  const courseObj = courses.find(c => c.name === task.course);
  const accentColor = courseObj?.prefixColor || 'var(--accent-primary)';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="glass-panel glass-card-hover"
      style={{
        padding: '18px 20px',
        cursor: 'grab',
        userSelect: 'none',
        borderLeft: 'none',
        borderTop: '1px solid var(--border-glass-top)',
        transition: 'opacity 0.2s, transform 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <GripVertical size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          {/* Dot de color de la materia */}
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accentColor, flexShrink: 0, boxShadow: `0 0 6px ${accentColor}` }} />
          <span style={{ fontSize: '0.72rem', color: accentColor, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.course || 'General'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', flexShrink: 0, transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--accent-primary)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Editar tarea"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', flexShrink: 0, transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--accent-danger)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Eliminar tarea"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, lineHeight: 1.3, wordBreak: 'break-word' }}>{task.title}</h4>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
        {task.startDate && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            ▶ {task.startDate}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: '0.75rem', color: task.status !== 'submitted' ? 'var(--accent-orange)' : 'var(--text-muted)', fontWeight: 600 }}>
            ■ {task.dueDate}
          </span>
        )}
      </div>
    </div>
  );
};

// ---- Columna Kanban con Drop Zone ----
const KanbanColumn = ({ col, tasks, onDelete, onEdit, onDragStart, onDrop, onDragOver, onDragLeave, courses }) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      style={{ flex: '1', minWidth: '220px', display: 'flex', flexDirection: 'column' }}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); onDragOver(e); }}
      onDragLeave={(e) => { setIsOver(false); onDragLeave(e); }}
      onDrop={(e) => { setIsOver(false); onDrop(e, col.id); }}
    >
      {/* Encabezado de columna */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        background: isOver ? 'rgba(0, 243, 255, 0.06)' : 'transparent',
        borderBottom: `2px solid ${isOver ? col.accent : 'var(--border-glass-top)'}`,
        transition: 'all 0.2s',
      }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: isOver ? col.accent : 'var(--text-secondary)', margin: 0, textTransform: 'uppercase' }}>
          {col.label}
        </h3>
        <span className={`badge ${col.badgeClass}`}>{tasks.length}</span>
      </div>

      {/* Zona droppable */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '12px',
        flex: 1, overflowY: 'auto', paddingRight: '4px',
        minHeight: '80px',
        borderRadius: 'var(--radius-md)',
        padding: '4px',
        background: isOver ? 'rgba(0, 243, 255, 0.03)' : 'transparent',
        border: isOver ? '1px dashed rgba(0, 243, 255, 0.3)' : '1px solid transparent',
        transition: 'all 0.25s',
      }}>
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onDelete}
            onEdit={onEdit}
            onDragStart={onDragStart}
            courses={courses}
          />
        ))}
        {tasks.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace', opacity: 0.6 }}>
            — vacío —
          </div>
        )}
      </div>
    </div>
  );
};

// ---- TaskBoard Principal ----
const TaskBoard = () => {
  const { tasks, addTask, updateTaskStatus, deleteTask, updateTask, courses, t, tasksLoading } = useApp();

  if (tasksLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <div className="animate-pulse">Sincronizando trabajos...</div>
      </div>
    );
  }
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [formData, setFormData] = useState({ title: '', course: '', startDate: '', dueDate: '', day: '', block: '' });
  const [activePicker, setActivePicker] = useState(null); // 'start' | 'due' | null
  const dragId = useRef(null);

  const columns = getColumns(t);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return;
    
    try {
      if (isEditing) {
        await updateTask(editingTaskId, formData);
      } else {
        await addTask(formData);
      }

      setFormData({ title: '', course: '', startDate: '', dueDate: '', day: '', block: '' });
      setShowModal(false);
      setIsEditing(false);
      setEditingTaskId(null);
    } catch (err) {
      console.error("Error saving task:", err);
    }
  };

  const handleEdit = (task) => {
    setFormData({ 
      title: task.title, 
      course: task.course, 
      startDate: task.startDate || '', 
      dueDate: task.dueDate || '',
      day: task.day || '',
      block: task.block || ''
    });
    setEditingTaskId(task.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const openNewTaskModal = () => {
    setFormData({ title: '', course: '', startDate: '', dueDate: '', day: '', block: '' });
    setIsEditing(false);
    setEditingTaskId(null);
    setShowModal(true);
  };

  const handleDragStart = (e, taskId) => {
    dragId.current = taskId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (dragId.current) {
      updateTaskStatus(dragId.current, newStatus);
      dragId.current = null;
    }
  };

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '32px 40px' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-glass-top)', paddingBottom: '20px', marginBottom: '28px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2.4rem', margin: 0 }}>{t.tasks}</h1>
          <p style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginTop: '8px', fontWeight: 600 }}>{t.dragHint}</p>
        </div>
        <button className="btn btn-primary" onClick={openNewTaskModal}>
          <Plus size={16} /> {t.newTask}
        </button>
      </header>

      {/* Tablero Kanban */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflowX: 'auto', paddingBottom: '12px' }}>
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            col={col}
            tasks={tasks.filter(t => t.status === col.id)}
            onDelete={deleteTask}
            onEdit={handleEdit}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => {}}
            courses={courses}
          />
        ))}
      </div>

      {/* Modal Nueva Tarea */}
      {showModal && (
        <div className="animate-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass-panel animate-modal" style={{ width: '100%', maxWidth: '480px', padding: '36px', border: '1px solid var(--border-glass-top)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 className="font-display" style={{ fontSize: '1.6rem', margin: 0, color: 'var(--accent-primary)' }}>
                {isEditing ? t.editTask : t.newTask}
              </h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.taskTitle} *</label>
                <input className="input" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ej. Parcial 2 - Álgebra Lineal" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.subject}</label>
                <select className="select" value={formData.course} onChange={e => setFormData({ ...formData, course: e.target.value })}>
                  <option value="" style={{ background: 'var(--bg-primary)' }}>{t.selectSubject}</option>
                  {courses.map(c => <option key={c.id} value={c.name} style={{ background: 'var(--bg-primary)' }}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.startDate}</label>
                  <div style={{ position: 'relative' }}>
                    <div 
                      className="input" 
                      onClick={() => setActivePicker(activePicker === 'start' ? null : 'start')}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      {formData.startDate || 'Seleccionar...'}
                      <CalendarIcon size={14} opacity={0.5} />
                    </div>
                    {activePicker === 'start' && (
                      <CustomCalendar 
                        selectedDate={formData.startDate} 
                        onDateSelect={(d) => setFormData({ ...formData, startDate: d })}
                        onClose={() => setActivePicker(null)}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.dueDate}</label>
                  <div style={{ position: 'relative' }}>
                    <div 
                      className="input" 
                      onClick={() => setActivePicker(activePicker === 'due' ? null : 'due')}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      {formData.dueDate || 'Seleccionar...'}
                      <CalendarIcon size={14} opacity={0.5} />
                    </div>
                    {activePicker === 'due' && (
                      <CustomCalendar 
                        selectedDate={formData.dueDate} 
                        onDateSelect={(d) => setFormData({ ...formData, dueDate: d })}
                        onClose={() => setActivePicker(null)}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Día Planificador</label>
                  <select className="select" value={formData.day || ''} onChange={e => setFormData({ ...formData, day: e.target.value })}>
                    <option value="" style={{ background: 'var(--bg-primary)' }}>Sin asignar</option>
                    <option value="monday" style={{ background: 'var(--bg-primary)' }}>Lunes</option>
                    <option value="tuesday" style={{ background: 'var(--bg-primary)' }}>Martes</option>
                    <option value="wednesday" style={{ background: 'var(--bg-primary)' }}>Miércoles</option>
                    <option value="thursday" style={{ background: 'var(--bg-primary)' }}>Jueves</option>
                    <option value="friday" style={{ background: 'var(--bg-primary)' }}>Viernes</option>
                    <option value="saturday" style={{ background: 'var(--bg-primary)' }}>Sábado</option>
                    <option value="sunday" style={{ background: 'var(--bg-primary)' }}>Domingo</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bloque</label>
                  <select className="select" value={formData.block || ''} onChange={e => setFormData({ ...formData, block: e.target.value })}>
                    <option value="" style={{ background: 'var(--bg-primary)' }}>Sin asignar</option>
                    <option value="morning" style={{ background: 'var(--bg-primary)' }}>Mañana</option>
                    <option value="afternoon" style={{ background: 'var(--bg-primary)' }}>Tarde</option>
                    <option value="night" style={{ background: 'var(--bg-primary)' }}>Noche</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>{t.cancel}</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>{t.execute}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;

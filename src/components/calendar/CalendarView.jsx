import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  LayoutGrid,
  Columns,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { useTasksContext } from '../../context/TaskContext';
import {
  MONTH_NAMES_ES,
  normalizeDateStr,
  groupTasksByDate,
  formatWeekRange,
  getWeekDays,
  getTaskInstitution,
  downloadICalFile,
  matchesInstitutionFilter
} from './calendarUtils';
import CalendarMonthGrid from './CalendarMonthGrid';
import CalendarWeekGrid from './CalendarWeekGrid';
import CalendarNewEventModal from './CalendarNewEventModal';
import CalendarEventDetailModal from './CalendarEventDetailModal';
import CalendarSyncModal from './CalendarSyncModal';
import TaskDetailDrawer from '../ui/TaskDetailDrawer';
import { playClick } from '../../lib/audioService';

const INSTITUTION_FILTERS = [
  { id: 'TODAS', label: 'Todas', color: '#00f3ff' },
  { id: 'UNAD', label: 'UNAD', color: '#ffcc00' },
  { id: 'SENA', label: 'SENA', color: '#00ff88' },
  { id: 'PERSONALIZADO', label: 'Personalizado', color: '#bc13fe' }
];

export default function CalendarView() {
  const {
    tasks,
    courses,
    addTask,
    updateTaskStatus,
    updateSubtasks,
    updateTaskNotes,
    deleteTask
  } = useTasksContext();

  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => normalizeDateStr(new Date()));
  const [institutionFilter, setInstitutionFilter] = useState('TODAS');

  // Modales
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerTask, setDrawerTask] = useState(null);

  // Navegación de fechas
  const handlePrev = () => {
    playClick(800);
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() - 1);
      } else {
        next.setDate(next.getDate() - 7);
      }
      return next;
    });
  };

  const handleNext = () => {
    playClick(850);
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setDate(next.getDate() + 7);
      }
      return next;
    });
  };

  const handleToday = () => {
    playClick(900);
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(normalizeDateStr(now));
  };

  const handleExportICal = () => {
    playClick(950);
    const filteredTasks = tasks.filter((t) => matchesInstitutionFilter(t, courses, institutionFilter));
    if (filteredTasks.length === 0) {
      toast.info('No hay entregas para exportar con el filtro actual');
      return;
    }
    const filterTag = institutionFilter.toLowerCase();
    const filename = `campusflow-entregas-${filterTag}.ics`;
    downloadICalFile(filteredTasks, filename);
    toast.success(`Se exportaron ${filteredTasks.length} entregas a ${filename}`, {
      description: 'Listo para importar en Google Calendar, Outlook o Apple Calendar.'
    });
  };

  // Conteo de entregas por institución
  const filterCounts = useMemo(() => {
    const counts = { TODAS: 0, UNAD: 0, SENA: 0, PERSONALIZADO: 0 };
    tasks.forEach((t) => {
      counts.TODAS++;
      const inst = getTaskInstitution(t, courses);
      if (inst === 'UNAD') counts.UNAD++;
      else if (inst === 'SENA') counts.SENA++;
      else counts.PERSONALIZADO++;
    });
    return counts;
  }, [tasks, courses]);

  // Agrupación de tareas por fecha y filtro seleccionado
  const tasksByDate = useMemo(() => {
    return groupTasksByDate(tasks, courses, institutionFilter);
  }, [tasks, courses, institutionFilter]);

  // Título del período actual
  const periodLabel = useMemo(() => {
    if (viewMode === 'month') {
      const monthName = MONTH_NAMES_ES[currentDate.getMonth()];
      return `${monthName} ${currentDate.getFullYear()}`;
    }
    const week = getWeekDays(currentDate);
    return formatWeekRange(week);
  }, [viewMode, currentDate]);

  const handleOpenAddEvent = (targetDate) => {
    playClick(950);
    setSelectedDay(targetDate || normalizeDateStr(currentDate));
    setIsNewEventModalOpen(true);
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box'
      }}
    >
      {/* Header Cyber Luxe con Controles */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 28px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.15) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        {/* Título e Icono */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              padding: '12px',
              background: 'rgba(0, 243, 255, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(0, 243, 255, 0.25)',
              boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)'
            }}
          >
            <CalendarIcon size={30} color="#00f3ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0,243,255,0.6))' }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                margin: 0,
                fontWeight: 950,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}
            >
              CALENDARIO ACADÉMICO
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Gestiona y sincroniza las fechas límite de tus materias y entregas institucionales.
            </p>
          </div>
        </div>

        {/* Acciones principales del Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Switcher Mes / Semana */}
          <div
            style={{
              display: 'flex',
              padding: '4px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <button
              type="button"
              onClick={() => {
                playClick(850);
                setViewMode('month');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: viewMode === 'month' ? 'rgba(0, 243, 255, 0.18)' : 'transparent',
                color: viewMode === 'month' ? '#00f3ff' : 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: viewMode === 'month' ? '0 0 12px rgba(0, 243, 255, 0.25)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <LayoutGrid size={15} />
              Mes
            </button>

            <button
              type="button"
              onClick={() => {
                playClick(850);
                setViewMode('week');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: viewMode === 'week' ? 'rgba(0, 243, 255, 0.18)' : 'transparent',
                color: viewMode === 'week' ? '#00f3ff' : 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: viewMode === 'week' ? '0 0 12px rgba(0, 243, 255, 0.25)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Columns size={15} />
              Semana
            </button>
          </div>

          {/* Botón "+ Nueva Entrega" */}
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(0, 243, 255, 0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleOpenAddEvent()}
            style={{
              padding: '10px 22px',
              borderRadius: '50px',
              background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.2), rgba(0, 243, 255, 0.05))',
              border: '1.5px solid rgba(0, 243, 255, 0.45)',
              color: '#00f3ff',
              fontSize: '0.86rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 0 16px rgba(0, 243, 255, 0.2)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Nueva Entrega
          </motion.button>
        </div>
      </motion.header>

      {/* Barra de Navegación de Fechas y Filtros Institucionales */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Controles de Navegación: Ant, Hoy, Sig & Período */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '2px'
            }}
          >
            <button
              type="button"
              onClick={handlePrev}
              title="Período anterior"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#00f3ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={handleToday}
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(0, 243, 255, 0.25)',
                background: 'rgba(0, 243, 255, 0.08)',
                color: '#00f3ff',
                fontSize: '0.78rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <CalendarIcon size={13} />
              Hoy
            </button>

            <button
              type="button"
              onClick={handleNext}
              title="Período siguiente"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#00f3ff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              textTransform: 'capitalize',
              letterSpacing: '-0.01em'
            }}
          >
            {periodLabel}
          </h3>
        </div>

        {/* Filtros Rápidos por Institución (UNAD, SENA, Personalizado, Todas) */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {INSTITUTION_FILTERS.map((f) => {
            const isActive = institutionFilter === f.id;
            const count = filterCounts[f.id] || 0;

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  playClick(900);
                  setInstitutionFilter(f.id);
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '50px',
                  border: isActive ? `1.5px solid ${f.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isActive ? `${f.color}18` : 'rgba(255, 255, 255, 0.02)',
                  color: isActive ? f.color : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isActive ? `0 0 16px ${f.color}33, inset 0 0 8px ${f.color}11` : 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  transition: 'all 0.25s'
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isActive ? f.color : 'rgba(255, 255, 255, 0.2)',
                    boxShadow: isActive ? `0 0 8px ${f.color}` : 'none'
                  }}
                />
                {f.label}
                <span
                  style={{
                    fontSize: '0.7rem',
                    opacity: 0.85,
                    padding: '1px 6px',
                    borderRadius: '8px',
                    background: isActive ? `${f.color}25` : 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* Botón Cyber Luxe: Sincronizar a Calendario (.ics) */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => {
              playClick(900);
              setIsSyncModalOpen(true);
            }}
            title="Descargar entregas en formato .ics para Google Calendar, Outlook o móvil"
            style={{
              padding: '8px 16px',
              borderRadius: '50px',
              border: '1px solid rgba(0, 243, 255, 0.35)',
              background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.12), rgba(255, 255, 255, 0.02))',
              color: '#00f3ff',
              fontSize: '0.78rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 16px rgba(0, 243, 255, 0.15)',
              letterSpacing: '0.04em',
              transition: 'all 0.2s'
            }}
          >
            <Download size={13} />
            Sincronizar (.ics)
          </motion.button>
        </div>
      </div>

      {/* Grid del Calendario (Mes o Semana) */}
      {viewMode === 'month' ? (
        <CalendarMonthGrid
          currentDate={currentDate}
          selectedDay={selectedDay}
          onSelectDay={(dayStr) => setSelectedDay(dayStr)}
          tasksByDate={tasksByDate}
          courses={courses}
          onSelectEvent={(task) => setSelectedTask(task)}
          onAddEvent={(dateStr) => handleOpenAddEvent(dateStr)}
        />
      ) : (
        <CalendarWeekGrid
          currentDate={currentDate}
          selectedDay={selectedDay}
          onSelectDay={(dayStr) => setSelectedDay(dayStr)}
          tasksByDate={tasksByDate}
          courses={courses}
          onSelectEvent={(task) => setSelectedTask(task)}
          onAddEvent={(dateStr) => handleOpenAddEvent(dateStr)}
        />
      )}

      {/* Modal: Nueva Entrega / Recordatorio Rápido */}
      <CalendarNewEventModal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        initialDate={selectedDay}
        courses={courses}
        onSaveTask={addTask}
      />

      {/* Modal: Detalle Interactivo de la Entrega */}
      <CalendarEventDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        courses={courses}
        onUpdateStatus={updateTaskStatus}
        onUpdateSubtasks={updateSubtasks}
        onDeleteTask={deleteTask}
        onOpenFullDrawer={(task) => setDrawerTask(task)}
      />

      {/* Modal Guiado: Sincronización (.ics / Google Calendar / Móvil) */}
      <CalendarSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        tasks={tasks}
        courses={courses}
        institutionFilter={institutionFilter}
        onDownload={handleExportICal}
      />

      {/* Drawer Completo para desglose de subtareas y enlaces */}
      <TaskDetailDrawer
        isOpen={!!drawerTask}
        onClose={() => setDrawerTask(null)}
        task={drawerTask}
        courses={courses}
        onUpdateSubtasks={updateSubtasks}
        onUpdateNotes={updateTaskNotes}
        onUpdateDeliveryUrl={updateTaskNotes}
      />
    </div>
  );
}

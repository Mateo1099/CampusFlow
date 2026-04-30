import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { usePlanners } from '../hooks/usePlanners';
import { Clock, Calendar, CheckCircle2, Circle, Folder, Plus, Pencil, ArrowLeft, Sun, Moon, Sunset, BarChart2, Trash2, ChevronDown } from 'lucide-react';
import { useCourses } from '../hooks/useCourses';
import { useTasksContext } from '../context/TaskContext';
import ColorPicker from '../components/ui/ColorPicker';
import WeeklyPlannerSkeleton from '../components/ui/WeeklyPlannerSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { prefetchAnalyticsData } from '../lib/prefetchAnalyticsData';

const DAY_OPTIONS = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' }
];

const TIME_OPTIONS = [
  { value: 'morning', label: 'Mañana', icon: Sun, accent: '#f7b64a', description: 'Impulso de enfoque' },
  { value: 'afternoon', label: 'Tarde', icon: Sunset, accent: '#ff8a5b', description: 'Bloque de ejecución' },
  { value: 'night', label: 'Noche', icon: Moon, accent: '#8d7dff', description: 'Ritmo profundo' }
];

const BLOCK_TYPE_OPTIONS = [
  { value: 'libre', label: 'Libre', description: 'Sin vínculo directo' },
  { value: 'materia', label: 'Materia', description: 'Conecta una materia' },
  { value: 'trabajo', label: 'Trabajo', description: 'Conecta una tarea' }
];

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', description: 'Aún no inicia' },
  { value: 'en_proceso', label: 'En Proceso', description: 'Ya está activo' },
  { value: 'completado', label: 'Completado', description: 'Listo por ahora' }
];

const CATEGORY_COLORS = {
  UNAD: '#ffcc00',
  SENA: '#00ff88',
  Personalizado: '#bc13fe'
};

function getTimeTheme(blockTime) {
  return TIME_OPTIONS.find(option => option.value === blockTime) || TIME_OPTIONS[0];
}

function getBlockAccent(block) {
  if (block.course_id && block.task_id) return '#7af0ff';
  if (block.course_id) return 'var(--accent-secondary)';
  if (block.task_id) return '#ff9f5a';
  return 'var(--accent-primary)';
}

function getStatusTone(status) {
  switch (status) {
    case 'completado':
      return { label: 'Completado', icon: '✓', color: '#34c759', glow: 'rgba(52, 199, 89, 0.22)' };
    case 'en_proceso':
      return { label: 'En proceso', icon: '⚡', color: '#ffb347', glow: 'rgba(255, 179, 71, 0.22)' };
    default:
      return { label: 'Pendiente', icon: '⏳', color: '#00c2ff', glow: 'rgba(0, 194, 255, 0.22)' };
  }
}

function PlannerField({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </label>
        {hint && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function CustomSelect({ value, onChange, options, placeholder, accentColor = 'var(--accent-primary)' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const selectedOption = options.find(option => option.value === value);
  const SelectedIcon = selectedOption?.icon;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '16px',
          background: isOpen ? 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))' : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
          border: `1px solid ${isOpen ? accentColor : 'rgba(255,255,255,0.10)'}`,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          cursor: 'pointer',
          backdropFilter: 'blur(22px)',
          boxShadow: isOpen ? `0 18px 34px rgba(0,0,0,0.32), 0 0 0 1px ${accentColor}22 inset` : 'inset 0 0 0 1px rgba(255,255,255,0.02)',
          transition: 'all 0.25s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {SelectedIcon && (
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '12px',
              background: `${selectedOption.accent || accentColor}1c`,
              border: `1px solid ${selectedOption.accent || accentColor}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: selectedOption.accent || accentColor,
              flexShrink: 0
            }}>
              <SelectedIcon size={16} />
            </div>
          )}
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: selectedOption ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {selectedOption?.label || placeholder}
            </div>
            {selectedOption?.description && (
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedOption.description}
              </div>
            )}
          </div>
        </div>
        <span style={{ color: isOpen ? accentColor : 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease', display: 'inline-flex' }}>▾</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          left: 0,
          right: 0,
          padding: '10px',
          borderRadius: '18px',
          background: 'linear-gradient(160deg, rgba(12, 15, 24, 0.96), rgba(18, 22, 34, 0.92))',
          border: `1px solid ${accentColor}26`,
          boxShadow: '0 24px 50px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(22px)',
          zIndex: 30,
          maxHeight: '260px',
          overflowY: 'auto'
        }}>
          {options.map(option => {
            const OptionIcon = option.icon;
            const isActive = option.value === value;
            const currentAccent = option.accent || accentColor;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 12px',
                  borderRadius: '14px',
                  border: `1px solid ${isActive ? `${currentAccent}44` : 'transparent'}`,
                  background: isActive ? `linear-gradient(135deg, ${currentAccent}1f, rgba(255,255,255,0.04))` : 'transparent',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                {OptionIcon && (
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '12px',
                    background: `${currentAccent}1a`,
                    border: `1px solid ${currentAccent}2f`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: currentAccent,
                    flexShrink: 0
                  }}>
                    <OptionIcon size={16} />
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: isActive ? 800 : 650 }}>{option.label}</div>
                  {option.description && (
                    <div style={{ fontSize: '0.74rem', color: isActive ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{option.description}</div>
                  )}
                </div>
                {isActive && <span style={{ color: currentAccent, fontSize: '0.8rem', fontWeight: 900 }}>ACTIVA</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- MAIN ENTRANCE ---
function WeeklyPlanner() {
  const plannerMountTsRef = React.useRef(performance.now());
  const plannerFetchStartTsRef = React.useRef(null);
  const plannerRealContentLoggedRef = React.useRef(false);

  const perfLog = React.useCallback((event, payload = {}) => {
    const ts = performance.now();
    const entry = { event, ts, route: '/planner', ...payload };
    if (typeof window !== 'undefined') {
      window.__CF_PERF_LOGS = window.__CF_PERF_LOGS || [];
      window.__CF_PERF_LOGS.push(entry);
    }
    console.log('[PERF]', entry);
  }, []);

  const { user } = useAuth();
  const { settings } = useSettings();
  const { planners, loading, addPlanner, updatePlanner, deletePlanner, addBlock, updateBlock, deleteBlock } = usePlanners(user?.id);
  const { courses } = useCourses(user?.id);
  const { tasks } = useTasksContext();
  const isLightMode = settings?.theme === 'light';

  const [activePlannerId, setActivePlannerId] = useState(null);
  const [filter, setFilter] = useState('Todas');
  
  // Modals state
  const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockDayTarget, setBlockDayTarget] = useState(null);
  const [blockTimeTarget, setBlockTimeTarget] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [editingPlanner, setEditingPlanner] = useState(null);
  const [plannerToDelete, setPlannerToDelete] = useState(null);
  const prefetchGuardRef = useRef({ key: '', ts: 0 });

  useEffect(() => {
    perfLog('weeklyplanner_mount', {
      sinceNavStartMs: window.__CF_NAV_START?.to === '/planner'
        ? Number((performance.now() - window.__CF_NAV_START.ts).toFixed(2))
        : null
    });
  }, [perfLog]);

  useEffect(() => {
    if (loading && plannerFetchStartTsRef.current === null) {
      plannerFetchStartTsRef.current = performance.now();
      perfLog('weeklyplanner_data_fetch_start');
    }

    if (!loading && plannerFetchStartTsRef.current !== null) {
      perfLog('weeklyplanner_data_fetch_end', {
        durationMs: Number((performance.now() - plannerFetchStartTsRef.current).toFixed(2)),
        plannersCount: Array.isArray(planners) ? planners.length : 0
      });
      plannerFetchStartTsRef.current = null;
    }
  }, [loading, planners, perfLog]);

  useEffect(() => {
    const skeletonVisible = loading && !planners.length;
    if (!skeletonVisible && !plannerRealContentLoggedRef.current) {
      plannerRealContentLoggedRef.current = true;
      perfLog('weeklyplanner_real_content_visible', {
        sinceMountMs: Number((performance.now() - plannerMountTsRef.current).toFixed(2)),
        sinceNavStartMs: window.__CF_NAV_START?.to === '/planner'
          ? Number((performance.now() - window.__CF_NAV_START.ts).toFixed(2))
          : null
      });
    }
  }, [loading, planners.length, perfLog]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const now = Date.now();
    const key = `weekly-planner:${user.id}`;
    if (prefetchGuardRef.current.key === key && (now - prefetchGuardRef.current.ts) < 5000) {
      return undefined;
    }
    prefetchGuardRef.current = { key, ts: now };

    const prefetch = () => {
      prefetchAnalyticsData(user.id).catch(() => null);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(prefetch, 250);
    return () => window.clearTimeout(timeoutId);
  }, [user?.id]);

  const activePlanner = useMemo(() => planners.find(p => p.id === activePlannerId), [planners, activePlannerId]);

  if (loading && !planners.length) {
    return <WeeklyPlannerSkeleton />;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '32px 40px', height: '100%', overflowY: 'auto' }}>
      {!activePlannerId ? (
        <PlannersList 
          planners={planners} 
          filter={filter} 
          setFilter={setFilter}
          isLightMode={isLightMode}
          onOpenPlanner={setActivePlannerId}
          onNewPlanner={() => { setEditingPlanner(null); setIsPlannerModalOpen(true); }}
          onEditPlanner={(planner) => { setEditingPlanner(planner); setIsPlannerModalOpen(true); }}
          onDeletePlanner={(plannerId) => setPlannerToDelete(plannerId)}
        />
      ) : (
        <PlannerDetail 
          planner={activePlanner} 
          courses={courses}
          tasks={tasks}
          isLightMode={isLightMode}
          onBack={() => setActivePlannerId(null)}
          onAddBlock={(day, time) => {
            setBlockDayTarget(day);
            setBlockTimeTarget(time);
            setEditingBlock(null);
            setIsBlockModalOpen(true);
          }}
          onUpdateBlock={(blockId, updates) => updateBlock(activePlanner.id, blockId, updates)}
          onDeleteBlock={(blockId) => deleteBlock(activePlanner.id, blockId)}
          onEditBlock={(block) => {
            setEditingBlock(block);
            setBlockDayTarget(block.day);
            setBlockTimeTarget(block.block_time);
            setIsBlockModalOpen(true);
          }}
        />
      )}

      {isPlannerModalOpen && (
        <PlannerModal 
          initialPlanner={editingPlanner}
          onClose={() => { setIsPlannerModalOpen(false); setEditingPlanner(null); }} 
          onSave={(data) => {
            if (editingPlanner) {
              updatePlanner(editingPlanner.id, data);
            } else {
              addPlanner(data);
            }
          }} 
        />
      )}

      <AnimatePresence>
        {plannerToDelete && (
          <ConfirmDeleteModal
            onClose={() => setPlannerToDelete(null)}
            onConfirm={() => {
              deletePlanner(plannerToDelete);
              setPlannerToDelete(null);
            }}
          />
        )}
      </AnimatePresence>

      {isBlockModalOpen && activePlanner && (
        <BlockModal 
          initialDay={blockDayTarget}
          initialTime={blockTimeTarget}
          initialBlock={editingBlock}
          mode={editingBlock ? 'edit' : 'create'}
          courses={courses}
          tasks={tasks}
          onClose={() => {
            setIsBlockModalOpen(false);
            setBlockDayTarget(null);
            setBlockTimeTarget(null);
            setEditingBlock(null);
          }}
          onSave={(data) => {
            if (editingBlock) {
              return updateBlock(activePlanner.id, editingBlock.id, data);
            }
            return addBlock(activePlanner?.id || activePlannerId, data);
          }}
        />
      )}
    </div>
  );
}

export default WeeklyPlanner;

// --- VIEWS ---

function PlannersList({ planners, filter, setFilter, isLightMode, onOpenPlanner, onNewPlanner, onEditPlanner, onDeletePlanner }) {
  const filteredPlanners = useMemo(() => {
    if (filter === 'Todas') return planners;
    return planners.filter(p => p.category === filter);
  }, [planners, filter]);

  const filterColors = {
    'Todas': 'var(--accent-primary)',
    'UNAD': 'var(--accent-warning)',
    'SENA': 'var(--accent-lime)',
    'Personalizado': 'var(--accent-purple)'
  };

  return (
    <>
      <header className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '3.2rem', margin: 0, fontWeight: 950 }}>PLANIFICADOR SEMANAL</h1>
          <p className="page-subtitle" style={{ color: 'var(--accent-primary)', marginTop: '8px' }}>Organización por bloques de tiempo</p>
        </div>
        <button 
          className="click-press" 
          onClick={onNewPlanner} 
          onMouseEnter={(e) => {
            const liquid = e.currentTarget.querySelector('.liquid-fill');
            if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(1.2)'; liquid.style.opacity = '1'; }
          }}
          onMouseLeave={(e) => {
            const liquid = e.currentTarget.querySelector('.liquid-fill');
            if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(0)'; liquid.style.opacity = '0'; }
          }}
          style={{ 
            padding: '10px 28px', 
            fontWeight: 700, 
            borderRadius: '50px', 
            background: isLightMode ? 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(236,244,255,0.96))' : 'rgba(255, 255, 255, 0.05)', 
            color: isLightMode ? '#0f3f9c' : '#00f3ff', 
            border: isLightMode ? '1px solid rgba(37, 99, 235, 0.45)' : '1px solid rgba(0, 243, 255, 0.3)', 
            backdropFilter: 'blur(10px)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.9rem', 
            cursor: 'pointer',
            boxShadow: isLightMode ? '0 10px 24px rgba(37,99,235,0.18), inset 0 0 12px rgba(37,99,235,0.08)' : '0 0 20px rgba(0,243,255,0.15), inset 0 0 10px rgba(0,243,255,0.05)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}>
          <div className="liquid-fill" style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(0)',
            width: '150%', aspectRatio: '1/1', borderRadius: '50%',
            background: isLightMode ? 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0) 70%)' : 'radial-gradient(circle, rgba(0, 243, 255, 0.4) 0%, rgba(0, 243, 255, 0) 70%)',
            opacity: 0, transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)', pointerEvents: 'none', zIndex: 0
          }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> NUEVA PLANIFICACIÓN
          </div>
        </button>
      </header>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {Object.keys(filterColors).map((f, index) => {
          const getNeonColor = (filterName) => {
            switch(filterName) {
              case 'Todas': return '#00f3ff';
              case 'UNAD': return '#ffcc00';
              case 'SENA': return '#00ff88';
              case 'Personalizado': return '#bc13fe';
              default: return '#00f3ff';
            }
          };
          const neonColor = getNeonColor(f);
          const isActive = filter === f;

          return (
            <motion.button
              key={f}
              onClick={() => setFilter(f)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '10px 24px',
                borderRadius: '50px',
                border: isActive ? `2px solid ${neonColor}` : (isLightMode ? '2px solid rgba(15, 23, 42, 0.16)' : '2px solid rgba(255,255,255,0.05)'),
                background: isActive ? `${neonColor}${isLightMode ? '24' : '15'}` : (isLightMode ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.02)'),
                color: isActive ? (isLightMode ? '#0f172a' : neonColor) : (isLightMode ? '#334155' : 'var(--text-muted)'),
                fontSize: '0.8rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isActive
                  ? (isLightMode ? `0 8px 18px ${neonColor}3d, inset 0 0 8px ${neonColor}2b` : `0 0 20px ${neonColor}33, inset 0 0 10px ${neonColor}11`)
                  : (isLightMode ? '0 6px 14px rgba(15,23,42,0.08)' : 'none'),
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              <motion.div 
                animate={{ 
                  scale: isActive ? 1.3 : 1,
                  boxShadow: isActive ? `0 0 16px ${neonColor}` : `0 0 0px ${neonColor}00`
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: isActive ? neonColor : (isLightMode ? 'rgba(30,41,59,0.35)' : 'rgba(255,255,255,0.2)'),
                }}
              />
              {f}
            </motion.button>
          )
        })}
      </div>

      {filteredPlanners.length === 0 ? (
        <div className="glass-panel" style={{ 
          padding: '80px 40px', 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(0, 243, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 0 30px rgba(0, 243, 255, 0.2)'
          }}>
            <Calendar size={40} color="#00f3ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 243, 255, 0.8))' }} />
          </div>
          <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>No hay planificaciones aún</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '400px', lineHeight: '1.6', fontSize: '0.95rem' }}>Crea tu primera planificación semanal para empezar a organizar tus bloques de tiempo y optimizar tus días.</p>
          <button 
            className="click-press" 
            onClick={onNewPlanner} 
            onMouseEnter={(e) => {
              const liquid = e.currentTarget.querySelector('.liquid-fill-empty');
              if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(1.2)'; liquid.style.opacity = '1'; }
            }}
            onMouseLeave={(e) => {
              const liquid = e.currentTarget.querySelector('.liquid-fill-empty');
              if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(0)'; liquid.style.opacity = '0'; }
            }}
            style={{ 
              padding: '12px 32px', 
              fontWeight: 800, 
              borderRadius: '50px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              color: '#00f3ff', 
              border: '1px solid rgba(0, 243, 255, 0.3)', 
              backdropFilter: 'blur(10px)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              fontSize: '0.95rem', 
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0,243,255,0.15), inset 0 0 10px rgba(0,243,255,0.05)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}>
            <div className="liquid-fill-empty" style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(0)',
              width: '150%', aspectRatio: '1/1', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 243, 255, 0.4) 0%, rgba(0, 243, 255, 0) 70%)',
              opacity: 0, transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)', pointerEvents: 'none', zIndex: 0
            }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Plus size={20} /> CREAR PLANIFICACIÓN
            </div>
          </button>
        </div>
      ) : (
        <motion.div 
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
                delayChildren: 0.1
              }
            }
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredPlanners.map((planner, index) => {
              const blocks = planner.planner_blocks || [];
              const completed = blocks.filter(b => b.status === 'completado').length;
              const progress = blocks.length ? Math.round((completed / blocks.length) * 100) : 0;
              const catColor = filterColors[planner.category] || 'var(--accent-primary)';
              const accentColor = planner.color || CATEGORY_COLORS[planner.category] || catColor;

              return (
                <motion.div
                  key={planner.id}
                  className="hover-lift click-press"
                  onClick={() => onOpenPlanner(planner.id)}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.4, 
                    ease: 'easeOut',
                    layout: { duration: 0.3 }
                  }}
                  whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    cursor: 'pointer',
                    padding: '26px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '240px',
                    borderRadius: '30px',
                    background: isLightMode
                      ? `linear-gradient(155deg, rgba(255,255,255,0.95) 0%, rgba(243,248,255,0.98) 58%, ${accentColor}1f 100%)`
                      : `linear-gradient(155deg, rgba(10, 14, 24, 0.96) 0%, rgba(20, 24, 38, 0.88) 52%, ${accentColor}14 100%)`,
                    border: isLightMode ? `1px solid ${accentColor}55` : `1px solid ${accentColor}38`,
                    boxShadow: isLightMode
                      ? `0 14px 30px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.92), inset 0 0 0 1px ${accentColor}22`
                      : `0 28px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px ${accentColor}10`
                  }}
                >
                 <div style={{
                   position: 'absolute',
                   inset: 0,
                   background: isLightMode
                     ? `radial-gradient(circle at top right, ${accentColor}2c 0%, transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.65), transparent 34%)`
                     : `radial-gradient(circle at top right, ${accentColor}24 0%, transparent 38%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 28%)`,
                   pointerEvents: 'none'
                 }} />
                 <div style={{
                   position: 'absolute',
                   top: '16px',
                   right: '18px',
                   width: '110px',
                   height: '110px',
                   borderRadius: '28px',
                   background: `${accentColor}16`,
                   filter: 'blur(12px)',
                   pointerEvents: 'none'
                 }} />
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                     <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: `linear-gradient(135deg, ${accentColor}22, rgba(255,255,255,0.06))`, border: `1px solid ${accentColor}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor, boxShadow: `0 10px 24px ${accentColor}20` }}>
                       <Folder size={22} />
                     </div>
                     <div style={{ minWidth: 0 }}>
                       <span style={{ display: 'inline-flex', padding: '5px 11px', borderRadius: '999px', border: `1px solid ${catColor}55`, background: isLightMode ? `${catColor}22` : `${catColor}14`, fontSize: '0.68rem', color: isLightMode ? '#0f172a' : catColor, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>{planner.category}</span>
                       <h3 style={{ margin: 0, fontSize: '1.2rem', color: isLightMode ? '#0f172a' : 'var(--text-primary)', lineHeight: 1.15, letterSpacing: '-0.02em', textShadow: isLightMode ? 'none' : `0 0 24px ${accentColor}18` }}>{planner.title}</h3>
                     </div>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                     <div style={{ display: 'flex', gap: '6px' }}>
                       <button
                         onClick={(e) => { e.stopPropagation(); onEditPlanner(planner); }}
                         style={{ background: 'rgba(0,194,255,0.10)', border: '1px solid rgba(0,194,255,0.22)', color: 'var(--accent-primary)', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                         title="Editar planificación"
                         className="click-press hover-bg"
                         onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,194,255,0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(0,194,255,0.3)'; }}
                         onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,194,255,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                       >
                         <Pencil size={14} />
                       </button>
                       <button
                         onClick={(e) => { e.stopPropagation(); onDeletePlanner(planner.id); }}
                         style={{ background: 'rgba(255,59,48,0.10)', border: '1px solid rgba(255,59,48,0.22)', color: 'var(--accent-danger)', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                         title="Eliminar planificación"
                         className="click-press hover-bg"
                         onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,59,48,0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255,59,48,0.3)'; }}
                         onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,59,48,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                       >
                         <Trash2 size={14} />
                       </button>
                     </div>
                     <div style={{ fontSize: '0.72rem', color: isLightMode ? '#334155' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                       {blocks.length} bloques
                     </div>
                   </div>
                 </div>
                 
                 {planner.weekly_goal && (
                   <p style={{ fontSize: '0.9rem', color: isLightMode ? '#334155' : 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
                     <span style={{ color: accentColor, fontWeight: 700 }}>Objetivo semanal:</span> {planner.weekly_goal}
                   </p>
                 )}

                 <div style={{ marginTop: 'auto', paddingTop: '18px', borderTop: `1px solid ${accentColor}22`, position: 'relative', zIndex: 1 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                     <span style={{ fontSize: '0.76rem', color: isLightMode ? '#1e293b' : 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                       Progreso editorial
                     </span>
                     <span style={{ fontSize: '0.95rem', color: isLightMode ? '#0f172a' : accentColor, fontWeight: 900 }}>{progress}%</span>
                   </div>
                   <div style={{ height: '10px', background: isLightMode ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', border: isLightMode ? '1px solid rgba(15,23,42,0.18)' : '1px solid rgba(255,255,255,0.05)' }}>
                     <div style={{ height: '100%', width: `${progress}%`, background: isLightMode ? `linear-gradient(90deg, #1d4ed8, ${accentColor})` : `linear-gradient(90deg, ${accentColor}, rgba(255,255,255,0.88))`, boxShadow: `0 0 18px ${accentColor}55`, transition: 'width 0.3s ease' }} />
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.78rem', color: isLightMode ? '#334155' : 'var(--text-muted)', fontWeight: isLightMode ? 700 : 500 }}>
                     <span>{completed} completados</span>
                     <span>{Math.max(blocks.length - completed, 0)} pendientes</span>
                   </div>
                 </div>
                </motion.div>
              );
           })}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}

function PlannerDetail({ planner, courses, tasks, isLightMode, onBack, onAddBlock, onUpdateBlock, onDeleteBlock, onEditBlock }) {
  const DAYS = DAY_OPTIONS.map(option => option.value);
  const BLOCKS = TIME_OPTIONS.map(option => option.value);
  const DAY_LABELS = DAY_OPTIONS.reduce((acc, option) => ({ ...acc, [option.value]: option.label }), {});

  const [expandedBlockIds, setExpandedBlockIds] = useState(() => new Set());
  const [expandedSections, setExpandedSections] = useState(() => new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const blocks = planner.planner_blocks || [];

  useEffect(() => {
    setExpandedBlockIds(new Set());
    setExpandedSections(new Set());
  }, [planner.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  const toggleBlockExpanded = (blockId) => {
    setExpandedBlockIds((current) => {
      const next = new Set(current);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  const toggleSectionExpanded = (sectionKey) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  const resolveBlockLinkLabel = (block) => {
    const taskName = block.task_id ? (tasks?.find((task) => task.id === block.task_id)?.title || 'Trabajo') : null;
    const courseName = block.course_id ? (courses?.find((course) => course.id === block.course_id)?.name || 'Materia') : null;

    if (taskName && courseName) return `${taskName} · ${courseName}`;
    return taskName || courseName || 'Bloque libre';
  };
  
  // Resumen inteligente mejorado
  const completedCount = blocks.filter(b => b.status === 'completado').length;
  const inProcessCount = blocks.filter(b => b.status === 'en_proceso').length;
  const pendingCount = blocks.filter(b => b.status === 'pendiente').length;
  const progress = blocks.length ? Math.round((completedCount / blocks.length) * 100) : 0;
  
  // Día más cargado
  const dayCounts = blocks.reduce((acc, b) => { acc[b.day] = (acc[b.day] || 0) + 1; return acc; }, {});
  const busiestDay = Object.keys(dayCounts).length > 0 ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b) : null;
  const busiestDayCount = busiestDay ? dayCounts[busiestDay] : 0;
  
  // Duración total estimada - FIX: Only count valid, non-zero duration_minutes from current planner blocks
  const blocksUsedForDuration = blocks.filter(b => b && typeof b.duration_minutes === 'number' && b.duration_minutes > 0);
  const totalDuration = blocksUsedForDuration.reduce((sum, b) => sum + b.duration_minutes, 0);
  const metricLabelColor = isLightMode ? '#475569' : 'rgba(226,232,240,0.92)';
  const metricValueColor = isLightMode ? '#0f172a' : '#f8fafc';
  
  // Alertas inteligentes
  const alerts = [];
  if (!planner.weekly_goal) alerts.push({ type: 'warning', text: 'Sin objetivo semanal definido' });
  if (blocks.length === 0) alerts.push({ type: 'info', text: 'No hay bloques aún. Comienza a planificar tu semana.' });
  if (busiestDayCount > 5) alerts.push({ type: 'warning', text: `${DAY_LABELS[busiestDay]} está muy cargado (${busiestDayCount} bloques)` });
  if (pendingCount > 0 && pendingCount === blocks.length) alerts.push({ type: 'info', text: 'Todos los bloques están pendientes' });

  const scheduleMap = useMemo(() => {
    const map = BLOCKS.reduce((acc, block) => {
      acc[block] = DAYS.reduce((dayAcc, day) => {
        dayAcc[day] = [];
        return dayAcc;
      }, {});
      return acc;
    }, {});
    
    blocks.forEach(b => {
      if (b.day && b.block_time && map[b.block_time] && map[b.block_time][b.day]) {
        map[b.block_time][b.day].push(b);
      }
    });
    return map;
  }, [blocks]);

  return (
    <>
      <header className="page-header" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '9px', borderRadius: '50%', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }} className="hover-bg click-press">
            <ArrowLeft size={20} />
          </button>
          <div style={{ width: '40px', height: '40px', borderRadius: '13px', background: `linear-gradient(135deg, ${(planner.color || 'var(--accent-primary)')}25, rgba(255,255,255,0.06))`, border: `1px solid ${(planner.color || 'var(--accent-primary)')}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: planner.color, boxShadow: `0 16px 30px ${(planner.color || '#00f3ff')}20` }}>
            <Folder size={18} />
          </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: '1.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.05, minWidth: 0 }}>{planner.title}</h1>
              <span style={{ 
                padding: '6px 14px', 
                borderRadius: '50px', 
                background: `${planner.color || 'var(--accent-primary)'}14`, 
                border: `1px solid ${(planner.color || 'var(--accent-primary)')}36`,
                fontSize: '0.72rem', 
                fontWeight: 850, 
                color: planner.color || 'var(--accent-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                lineHeight: 1
              }}>{planner.category}</span>
            </div>
          </div>

          <button 
            className="click-press liquid-glass-hover liquid-glass-hover-cyan" 
            onClick={() => onAddBlock(null, null)} 
            style={{ 
              padding: '10px 24px', 
              fontWeight: 800, 
              borderRadius: '999px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              color: '#00f3ff', 
              border: '1px solid rgba(0, 243, 255, 0.4)', 
              backdropFilter: 'blur(10px)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.79rem', 
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(0,243,255,0.14), inset 0 0 9px rgba(0,243,255,0.07)',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              transition: 'all 0.3s ease',
              alignSelf: 'center',
              willChange: 'transform, box-shadow'
            }}>
            <Plus size={15} /> AGREGAR BLOQUE
          </button>
        </div>
        {planner.weekly_goal && (
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 52px', fontSize: '0.9rem', maxWidth: '780px', lineHeight: 1.55 }}><span style={{ color: planner.color || 'var(--accent-primary)', fontWeight: 700 }}>Objetivo semanal:</span> {planner.weekly_goal}</p>
        )}
      </header>

      {/* Alertas inteligentes */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {alerts.map((alert, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '8px 12px', borderLeft: `3px solid ${alert.type === 'warning' ? 'var(--accent-warning)' : alert.type === 'danger' ? 'var(--accent-danger)' : 'var(--accent-primary)'}`, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)', borderRadius: '14px' }}>
              <span>{alert.type === 'warning' ? '⚠️' : alert.type === 'danger' ? '⛔' : 'ℹ️'}</span>
              {alert.text}
            </div>
          ))}
        </div>
      )}

      {/* Resumen Inteligente Mejorado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(152px, 1fr))', rowGap: '10px', columnGap: '14px', marginBottom: '22px' }}>
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', background: isLightMode ? 'linear-gradient(155deg, rgba(255,255,255,0.94), rgba(242,247,255,0.96))' : undefined, border: isLightMode ? '1px solid rgba(15,23,42,0.14)' : undefined, boxShadow: isLightMode ? '0 10px 22px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' : undefined }}>
          <BarChart2 size={18} color="var(--accent-primary)" style={{ margin: '0 auto' }} />
          <div style={{ fontSize: '0.7rem', color: metricLabelColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, lineHeight: 1.2, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.4)' }}>Avance</div>
          <div style={{ fontSize: '1.34rem', fontWeight: 900, color: metricValueColor, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.35)' }}>{progress}%</div>
        </div>
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', background: isLightMode ? 'linear-gradient(155deg, rgba(255,255,255,0.94), rgba(242,247,255,0.96))' : undefined, border: isLightMode ? '1px solid rgba(15,23,42,0.14)' : undefined, boxShadow: isLightMode ? '0 10px 22px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' : undefined }}>
          <CheckCircle2 size={18} color="var(--accent-lime)" style={{ margin: '0 auto' }} />
          <div style={{ fontSize: '0.7rem', color: metricLabelColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, lineHeight: 1.2, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.4)' }}>Completados</div>
          <div style={{ fontSize: '1.34rem', fontWeight: 900, color: metricValueColor, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.35)' }}>{completedCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', background: isLightMode ? 'linear-gradient(155deg, rgba(255,255,255,0.94), rgba(242,247,255,0.96))' : undefined, border: isLightMode ? '1px solid rgba(15,23,42,0.14)' : undefined, boxShadow: isLightMode ? '0 10px 22px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' : undefined }}>
          <Circle size={18} color="var(--accent-warning)" style={{ margin: '0 auto' }} />
          <div style={{ fontSize: '0.7rem', color: metricLabelColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, lineHeight: 1.2, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.4)' }}>Pendientes</div>
          <div style={{ fontSize: '1.34rem', fontWeight: 900, color: metricValueColor, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.35)' }}>{pendingCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', background: isLightMode ? 'linear-gradient(155deg, rgba(255,255,255,0.94), rgba(242,247,255,0.96))' : undefined, border: isLightMode ? '1px solid rgba(15,23,42,0.14)' : undefined, boxShadow: isLightMode ? '0 10px 22px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' : undefined }}>
          <Clock size={18} color="var(--accent-purple)" style={{ margin: '0 auto' }} />
          <div style={{ fontSize: '0.7rem', color: metricLabelColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, lineHeight: 1.2, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.4)' }}>En Proceso</div>
          <div style={{ fontSize: '1.34rem', fontWeight: 900, color: metricValueColor, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.35)' }}>{inProcessCount}</div>
        </div>
        {busiestDay && (
          <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', background: isLightMode ? 'linear-gradient(155deg, rgba(255,255,255,0.94), rgba(242,247,255,0.96))' : undefined, border: isLightMode ? '1px solid rgba(15,23,42,0.14)' : undefined, boxShadow: isLightMode ? '0 10px 22px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' : undefined }}>
            <Calendar size={18} color="var(--accent-secondary)" style={{ margin: '0 auto' }} />
            <div style={{ fontSize: '0.7rem', color: metricLabelColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, lineHeight: 1.2, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.4)' }}>Día más ocupado</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, textTransform: 'capitalize', color: metricValueColor, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.35)' }}>{DAY_LABELS[busiestDay]} ({busiestDayCount})</div>
          </div>
        )}
        {totalDuration > 0 && (
          <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', background: isLightMode ? 'linear-gradient(155deg, rgba(255,255,255,0.94), rgba(242,247,255,0.96))' : undefined, border: isLightMode ? '1px solid rgba(15,23,42,0.14)' : undefined, boxShadow: isLightMode ? '0 10px 22px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' : undefined }}>
            <Clock size={18} color="var(--accent-success)" style={{ margin: '0 auto' }} />
            <div style={{ fontSize: '0.7rem', color: metricLabelColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, lineHeight: 1.2, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.4)' }}>Duración Total</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: metricValueColor, textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.35)' }}>
              {Math.floor(totalDuration / 60) > 0 
                ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
                : `${totalDuration}m`
              }
            </div>
          </div>
        )}
      </div>

      <div style={{
        borderRadius: '34px',
        overflow: 'hidden',
        border: isLightMode ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.08)',
        background: isLightMode ? 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(241,246,255,0.98))' : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
        boxShadow: isLightMode ? '0 18px 34px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.95)' : '0 34px 68px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: '12px'
      }}>
        <div className="weekly-grid-container" style={{ 
          display: 'grid',
          gridTemplateColumns: 'minmax(118px, 142px) repeat(7, minmax(170px, 1fr))',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          <div style={{ background: isLightMode ? 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(241,246,255,0.94))' : 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))', border: isLightMode ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '16px' }} />
          {DAYS.map(day => (
            <div key={day} style={{ 
              background: isLightMode ? 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(241,246,255,0.94))' : 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
              padding: '14px 14px 12px',
              fontWeight: 900,
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: isLightMode ? '#0f172a' : 'var(--text-primary)',
              borderRadius: '24px',
              border: isLightMode ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: isLightMode ? 'inset 0 1px 0 rgba(255,255,255,0.92)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: '4px'
            }}>
              <div style={{ color: planner.color || 'var(--accent-primary)', fontSize: '0.68rem', lineHeight: 1 }}>DÍA</div>
              {DAY_LABELS[day]}
            </div>
          ))}

          {BLOCKS.map(blockTime => {
            const theme = getTimeTheme(blockTime);
            const TimeIcon = theme.icon;

            return (
              <React.Fragment key={blockTime}>
                <div style={{ 
                  padding: '18px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  borderRadius: '28px',
                  border: isLightMode ? `1px solid ${theme.accent}4f` : `1px solid ${theme.accent}26`,
                  background: isLightMode ? `linear-gradient(180deg, ${theme.accent}2b 0%, rgba(248, 251, 255, 0.98) 100%)` : `linear-gradient(180deg, ${theme.accent}18 0%, rgba(10, 12, 22, 0.72) 100%)`,
                  boxShadow: isLightMode ? `inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 18px ${theme.accent}2e` : `inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 32px ${theme.accent}14`
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '18px',
                      background: `${theme.accent}18`,
                      border: `1px solid ${theme.accent}3a`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.accent,
                      boxShadow: `0 0 24px ${theme.accent}22`
                    }}>
                      <TimeIcon size={22} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isLightMode ? '#0f172a' : 'var(--text-primary)' }}>{theme.label}</div>
                      <div style={{ fontSize: '0.72rem', color: isLightMode ? '#334155' : 'var(--text-secondary)' }}>{theme.description}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => onAddBlock(null, blockTime)} 
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '14px',
                      border: `1px solid ${theme.accent}38`,
                      background: `${theme.accent}14`,
                      color: theme.accent,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 10px 20px ${theme.accent}18`
                    }}
                    title="Agregar a este bloque"
                    className="click-press"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {DAYS.map(day => {
                  const dayBlocks = scheduleMap[blockTime][day];
                  const sectionKey = `${blockTime}-${day}`;
                  const isSectionExpanded = expandedSections.has(sectionKey);
                  const visibleBlocks = isSectionExpanded ? dayBlocks : dayBlocks.slice(0, 3);
                  const hiddenBlocksCount = Math.max(dayBlocks.length - visibleBlocks.length, 0);

                  return (
                    <div key={`${blockTime}-${day}`} style={{ 
                      minHeight: '176px',
                      padding: '12px 12px 62px',
                      borderRadius: '26px',
                      border: isLightMode ? '1px solid rgba(15,23,42,0.14)' : '1px solid rgba(255,255,255,0.07)',
                      background: isLightMode ? `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,255,0.98) 100%), radial-gradient(circle at top right, ${theme.accent}1a 0%, transparent 46%)` : `linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(12, 15, 24, 0.78) 100%), radial-gradient(circle at top right, ${theme.accent}10 0%, transparent 42%)`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: isLightMode ? 'inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 16px rgba(15,23,42,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%', minWidth: 0, textAlign: 'center' }}>
                        <span style={{ fontSize: '0.76rem', color: theme.accent, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                          {DAY_LABELS[day]}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: isLightMode ? '#475569' : 'rgba(226,232,240,0.92)', fontWeight: 700, fontFamily: isLightMode ? '"JetBrains Mono", monospace' : 'inherit', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', lineHeight: 1.1, textAlign: 'center' }}>
                          {dayBlocks.length} bloques
                        </span>
                      </div>

                      <AnimatePresence initial={false} mode="popLayout">
                        {visibleBlocks.map((b, blockIndex) => {
                          const accent = getBlockAccent(b);
                          const statusTone = getStatusTone(b.status);
                          const isExpanded = expandedBlockIds.has(b.id);
                          const hasDuration = Boolean(b.duration_minutes);

                          return (
                            <motion.div
                              key={b.id}
                              layout
                              initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
                              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.985 }}
                              transition={{ duration: 0.28, ease: 'easeOut' }}
                              onClick={() => toggleBlockExpanded(b.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  toggleBlockExpanded(b.id);
                                }
                              }}
                              style={{
                                padding: '11px 12px',
                                borderRadius: '18px',
                                fontSize: '0.75rem',
                                border: `1px solid ${accent}2e`,
                                opacity: b.status === 'completado' ? 0.92 : 1,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                position: 'relative',
                                cursor: 'pointer',
                                background: isLightMode ? `linear-gradient(160deg, rgba(255,255,255,0.98), rgba(241,246,255,0.96)), radial-gradient(circle at top right, ${accent}1d 0%, transparent 44%)` : `linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)), radial-gradient(circle at top right, ${accent}16 0%, transparent 42%)`,
                                boxShadow: isLightMode ? `0 8px 16px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.98)` : `0 14px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.05)`,
                                backdropFilter: 'blur(14px)',
                                willChange: 'transform'
                              }}
                              whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.01 }}
                              whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                              title={b.notes || 'Bloque compacto'}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', minWidth: 0 }}>
                                  <div style={{ width: '26px', height: '26px', borderRadius: '9px', background: statusTone.glow, border: `1px solid ${statusTone.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: statusTone.color, flexShrink: 0, fontSize: '0.78rem', fontWeight: 800, boxShadow: `0 0 16px ${statusTone.glow}` }}>
                                    {statusTone.icon}
                                  </div>
                                  <div style={{ minWidth: 0, flex: 1, paddingTop: '1px' }}>
                                    <div style={{ fontWeight: 850, color: isLightMode ? '#0f172a' : 'var(--text-primary)', lineHeight: 1.2, fontSize: '0.88rem', marginRight: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'normal', overflowWrap: 'break-word' }}>
                                      {b.title}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleBlockExpanded(b.id);
                                    }}
                                    style={{ width: '27px', height: '27px', borderRadius: '10px', border: `1px solid ${accent}2f`, background: `${accent}16`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), background 220ms ease, border-color 220ms ease', boxShadow: `0 0 16px ${accent}18` }}
                                    className="click-press liquid-glass-hover"
                                    title={isExpanded ? 'Contraer bloque' : 'Expandir bloque'}
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '6px', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                                  {b.duration_minutes && (
                                    <span style={{ padding: '4px 10px', borderRadius: '999px', background: isLightMode ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)', border: isLightMode ? '1px solid rgba(15,23,42,0.16)' : '1px solid rgba(255,255,255,0.06)', color: isLightMode ? '#1e293b' : 'var(--text-secondary)', fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap', lineHeight: 1.05, flex: '0 0 auto', minWidth: '68px', textAlign: 'center' }}>
                                      ⏱ {b.duration_minutes} min
                                    </span>
                                  )}
                                  <span style={{ padding: '4px 9px', borderRadius: '999px', background: `${statusTone.color}10`, border: `1px solid ${statusTone.color}28`, color: statusTone.color, fontSize: hasDuration ? '0.62rem' : '0.66rem', fontWeight: 800, textTransform: 'none', letterSpacing: '0.01em', whiteSpace: 'nowrap', lineHeight: 1.05, flex: hasDuration ? '1 1 auto' : '0 0 auto', minWidth: hasDuration ? '0' : '78px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                                    {statusTone.label}
                                  </span>
                                </div>
                              </div>

                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    key={`${b.id}-details`}
                                    initial={prefersReducedMotion ? false : { opacity: 0, height: 0, y: -4 }}
                                    animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto', y: 0 }}
                                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -4 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    style={{ overflow: 'hidden' }}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: isLightMode ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(255,255,255,0.08)' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '8px' }}>
                                        <div style={{ padding: '8px 10px', borderRadius: '14px', background: isLightMode ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)', border: isLightMode ? '1px solid rgba(15,23,42,0.10)' : '1px solid rgba(255,255,255,0.06)' }}>
                                          <div style={{ fontSize: '0.62rem', color: isLightMode ? '#475569' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>Materia</div>
                                          <div style={{ marginTop: '4px', fontSize: '0.8rem', color: isLightMode ? '#0f172a' : 'var(--text-primary)', fontWeight: 700, lineHeight: 1.35 }}>
                                            {resolveBlockLinkLabel(b)}
                                          </div>
                                        </div>
                                        <div style={{ padding: '8px 10px', borderRadius: '14px', background: isLightMode ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)', border: isLightMode ? '1px solid rgba(15,23,42,0.10)' : '1px solid rgba(255,255,255,0.06)' }}>
                                          <div style={{ fontSize: '0.62rem', color: isLightMode ? '#475569' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>Duración</div>
                                          <div style={{ marginTop: '4px', fontSize: '0.8rem', color: isLightMode ? '#0f172a' : 'var(--text-primary)', fontWeight: 700 }}>
                                            {b.duration_minutes ? `${b.duration_minutes} min` : 'Sin definir'}
                                          </div>
                                        </div>
                                        <div style={{ padding: '8px 10px', borderRadius: '14px', background: isLightMode ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.04)', border: isLightMode ? '1px solid rgba(15,23,42,0.10)' : '1px solid rgba(255,255,255,0.06)' }}>
                                          <div style={{ fontSize: '0.62rem', color: isLightMode ? '#475569' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>Estado</div>
                                          <div style={{ marginTop: '4px', fontSize: '0.8rem', color: statusTone.color, fontWeight: 800 }}>
                                            {statusTone.label}
                                          </div>
                                        </div>
                                      </div>

                                      {b.notes && (
                                        <div style={{ padding: '10px 12px', borderRadius: '16px', background: isLightMode ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.035)', border: isLightMode ? '1px solid rgba(15,23,42,0.1)' : '1px solid rgba(255,255,255,0.06)' }}>
                                          <div style={{ fontSize: '0.62rem', color: isLightMode ? '#475569' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, marginBottom: '6px' }}>Notas</div>
                                          <div style={{ fontSize: '0.78rem', color: isLightMode ? '#334155' : 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                                            {b.notes}
                                          </div>
                                        </div>
                                      )}

                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                        <select 
                                          value={b.status} 
                                          onChange={(e) => onUpdateBlock(b.id, { status: e.target.value })}
                                          onClick={(e) => e.stopPropagation()}
                                          onPointerDown={(e) => e.stopPropagation()}
                                          style={{ 
                                            background: `${statusTone.color}10`, border: `1px solid ${statusTone.color}26`, color: statusTone.color, 
                                            fontSize: '0.7rem', padding: '6px 10px', outline: 'none', cursor: 'pointer', fontWeight: 800, borderRadius: '999px'
                                          }}
                                        >
                                          <option value="pendiente">Pendiente</option>
                                          <option value="en_proceso">En Proceso</option>
                                          <option value="completado">Completado</option>
                                        </select>

                                        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                                          <button 
                                            type="button"
                                            onClick={(event) => { event.stopPropagation(); onEditBlock(b); }}
                                            style={{ background: 'rgba(0,194,255,0.10)', border: '1px solid rgba(0,194,255,0.22)', color: 'var(--accent-primary)', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '9px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                            title="Editar bloque"
                                            className="click-press liquid-glass-hover liquid-glass-hover-edit"
                                          >
                                            <Pencil size={12} />
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={(event) => { event.stopPropagation(); onDeleteBlock(b.id); }}
                                            style={{ background: 'rgba(255,59,48,0.10)', border: '1px solid rgba(255,59,48,0.22)', color: 'var(--accent-danger)', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '9px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                            title="Eliminar bloque"
                                            className="click-press liquid-glass-hover liquid-glass-hover-danger"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {hiddenBlocksCount > 0 && (
                        <motion.button
                          type="button"
                          onClick={() => toggleSectionExpanded(sectionKey)}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          style={{
                            marginTop: '2px',
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '14px',
                            border: `1px solid ${theme.accent}26`,
                            background: `linear-gradient(135deg, ${theme.accent}14, rgba(255,255,255,0.05))`,
                            color: theme.accent,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            boxShadow: `0 10px 18px ${theme.accent}12`
                          }}
                          className="click-press liquid-glass-hover"
                        >
                          <span>{isSectionExpanded ? 'Ver menos' : '+ Ver más'}</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{hiddenBlocksCount}</span>
                        </motion.button>
                      )}

                      <button 
                        type="button"
                        onClick={() => onAddBlock(day, blockTime)} 
                        style={{ 
                          position: 'absolute',
                          bottom: '14px',
                          right: '14px',
                          background: `linear-gradient(135deg, ${theme.accent}22, rgba(255,255,255,0.06))`,
                          border: `1px solid ${theme.accent}36`,
                          borderRadius: '14px',
                          width: '38px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: theme.accent,
                          cursor: 'pointer',
                          boxShadow: `0 14px 24px ${theme.accent}18`
                        }}
                        className="click-press"
                        title="Añadir a este día"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}

// --- MODALS ---

function PlannerModal({ onClose, onSave, initialPlanner }) {
  const [formData, setFormData] = useState({
    title: initialPlanner?.title || '',
    category: initialPlanner?.category || 'UNAD',
    weekly_goal: initialPlanner?.weekly_goal || '',
    color: initialPlanner?.color || '#00f3ff',
    description: initialPlanner?.description || ''
  });
  
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const categories = [
    { id: 'UNAD', color: '#ffcc00' },
    { id: 'SENA', color: '#00ff88' },
    { id: 'Personalizado', color: '#bc13fe' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return;
    onSave(formData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
      <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ 
        width: '100%', maxWidth: '440px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px',
        background: 'linear-gradient(135deg, rgba(30,30,35,0.9) 0%, rgba(15,15,20,0.95) 100%)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)'
      }}>
        <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#fff', letterSpacing: '0.5px' }}>{initialPlanner ? 'EDITAR PLANIFICACIÓN' : 'NUEVA PLANIFICACIÓN'}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Nombre *</label>
            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ 
              width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', 
              border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'border 0.3s ease' 
            }} placeholder="Ej. Semana 1 - Componente Práctico..." 
            onFocus={(e) => e.target.style.border = '1px solid var(--accent-primary)'}
            onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Categoría *</label>
            <div 
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', 
                border: isCategoryOpen ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)', 
                color: '#fff', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.3s ease'
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: categories.find(c => c.id === formData.category)?.color || '#fff' }}></div>
                <span style={{ fontWeight: 600 }}>{formData.category}</span>
              </div>
              <span style={{ transform: isCategoryOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', fontSize: '0.8rem', color: 'var(--text-muted)' }}>▼</span>
            </div>

            {isCategoryOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                background: 'rgba(25,25,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                backdropFilter: 'blur(10px)', zIndex: 10, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}>
                {categories.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => { setFormData({...formData, category: c.id}); setIsCategoryOpen(false); }}
                    style={{
                      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color, boxShadow: `0 0 8px ${c.color}` }}></div>
                    <span style={{ fontSize: '0.95rem', color: formData.category === c.id ? '#fff' : 'var(--text-secondary)', fontWeight: formData.category === c.id ? 700 : 500 }}>{c.id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formData.category === 'Personalizado' && (
            <div className="animate-fade-in">
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Nombre personalizado</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ 
                width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(188, 19, 254, 0.05)', 
                border: '1px solid rgba(188, 19, 254, 0.2)', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'border 0.3s ease' 
              }} placeholder="Ej. Rutina de Inglés, Proyecto Personal..." 
              onFocus={(e) => e.target.style.border = '1px solid var(--accent-purple)'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(188, 19, 254, 0.2)'}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Objetivo Semanal (Opcional)</label>
            <input type="text" value={formData.weekly_goal} onChange={e => setFormData({...formData, weekly_goal: e.target.value})} style={{ 
              width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', 
              border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'border 0.3s ease' 
            }} placeholder="¿Qué deseas lograr esta semana?" 
            onFocus={(e) => e.target.style.border = '1px solid var(--accent-primary)'}
            onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Color de Portada</label>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['#00f3ff', '#ffcc00', '#00ff88', '#bc13fe'].map(colorOption => (
                  <div 
                    key={colorOption}
                    onClick={() => setFormData({...formData, color: colorOption})}
                    style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', background: colorOption, cursor: 'pointer',
                      border: formData.color === colorOption ? '3px solid #fff' : '3px solid transparent',
                      boxShadow: formData.color === colorOption ? `0 0 15px ${colorOption}` : 'none',
                      transition: 'all 0.2s ease', transform: formData.color === colorOption ? 'scale(1.1)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
              
              <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} className="hidden-mobile" />
              
              <div style={{ flex: 1, minWidth: '160px' }}>
                <ColorPicker
                  selectedColor={formData.color}
                  onSelect={(color) => setFormData({...formData, color})}
                  isOpen={isColorPickerOpen}
                  onToggle={() => setIsColorPickerOpen(!isColorPickerOpen)}
                  onClose={() => setIsColorPickerOpen(false)}
                  t={{ tetherColor: 'Personalizar color' }}
                />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="click-press" 
              onMouseEnter={(e) => {
                const liquid = e.currentTarget.querySelector('.liquid-fill-btn-red');
                if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(1.2)'; liquid.style.opacity = '1'; }
              }}
              onMouseLeave={(e) => {
                const liquid = e.currentTarget.querySelector('.liquid-fill-btn-red');
                if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(0)'; liquid.style.opacity = '0'; }
              }}
              style={{ 
                padding: '12px 28px', borderRadius: '50px', border: '1px solid rgba(255, 77, 77, 0.4)', background: 'rgba(255, 77, 77, 0.05)', 
                color: '#ff4d4d', cursor: 'pointer', fontWeight: 700, transition: 'all 0.3s ease',
                position: 'relative', overflow: 'hidden', boxShadow: '0 0 15px rgba(255, 77, 77, 0.05), inset 0 0 8px rgba(255, 77, 77, 0.05)', 
                letterSpacing: '1px'
              }}>
              <div className="liquid-fill-btn-red" style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(0)',
                width: '150%', aspectRatio: '1/1', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 77, 77, 0.3) 0%, rgba(255, 77, 77, 0) 70%)',
                opacity: 0, transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)', pointerEvents: 'none', zIndex: 0
              }} />
              <span style={{ position: 'relative', zIndex: 1 }}>CANCELAR</span>
            </button>
            <button type="submit" className="click-press" 
              onMouseEnter={(e) => {
                const liquid = e.currentTarget.querySelector('.liquid-fill-btn-cyan');
                if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(1.2)'; liquid.style.opacity = '1'; }
              }}
              onMouseLeave={(e) => {
                const liquid = e.currentTarget.querySelector('.liquid-fill-btn-cyan');
                if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(0)'; liquid.style.opacity = '0'; }
              }}
              style={{ 
                padding: '12px 36px', borderRadius: '50px', border: '1px solid rgba(0, 243, 255, 0.5)', background: 'rgba(0, 243, 255, 0.15)', 
                color: '#00f3ff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 0 20px rgba(0,243,255,0.2), inset 0 0 10px rgba(0,243,255,0.1)',
                transition: 'all 0.3s ease', letterSpacing: '1px', textTransform: 'uppercase',
                position: 'relative', overflow: 'hidden'
              }}>
              <div className="liquid-fill-btn-cyan" style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(0)',
                width: '150%', aspectRatio: '1/1', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 243, 255, 0.5) 0%, rgba(0, 243, 255, 0) 70%)',
                opacity: 0, transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)', pointerEvents: 'none', zIndex: 0
              }} />
              <span style={{ position: 'relative', zIndex: 1 }}>GUARDAR</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BlockModal({ initialDay, initialTime, initialBlock, mode = 'create', courses, tasks, onClose, onSave }) {
  const [formData, setFormData] = useState({
    day: initialDay || 'monday',
    block_time: initialTime || 'morning',
    title: '',
    block_type: 'libre',
    course_id: '',
    task_id: '',
    duration_minutes: '',
    notes: '',
    status: 'pendiente'
  });

  useEffect(() => {
    if (initialBlock) {
      setFormData({
        day: initialBlock.day || initialDay || 'monday',
        block_time: initialBlock.block_time || initialTime || 'morning',
        title: initialBlock.title || '',
        block_type: initialBlock.block_type || 'libre',
        course_id: initialBlock.course_id || '',
        task_id: initialBlock.task_id || '',
        duration_minutes: initialBlock.duration_minutes ?? '',
        notes: initialBlock.notes || '',
        status: initialBlock.status || 'pendiente'
      });
      return;
    }

    setFormData({
      day: initialDay || 'monday',
      block_time: initialTime || 'morning',
      title: '',
      block_type: 'libre',
      course_id: '',
      task_id: '',
      duration_minutes: '',
      notes: '',
      status: 'pendiente'
    });
  }, [initialBlock, initialDay, initialTime, mode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return;

    if (formData.block_type === 'materia' && !formData.course_id) {
      alert('Por favor selecciona una materia.');
      return;
    }
    if (formData.block_type === 'trabajo' && !formData.task_id) {
      alert('Por favor selecciona un trabajo.');
      return;
    }
    let finalCourseId = null;
    let finalTaskId = null;

    if (formData.block_type === 'materia') {
      finalCourseId = formData.course_id;
    } else if (formData.block_type === 'trabajo') {
      finalTaskId = formData.task_id;
      if (finalTaskId) {
        const selectedTask = tasks.find(t => t.id === finalTaskId);
        if (selectedTask && selectedTask.course_id) {
          finalCourseId = selectedTask.course_id;
        }
      }
    }
    
    onSave({
      ...formData,
      course_id: finalCourseId,
      task_id: finalTaskId,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null
    });
    onClose();
  };

  const courseOptions = [
    { value: '', label: 'Sin materia específica', description: 'Puedes dejarlo libre' },
    ...courses.map(course => ({
      value: course.id,
      label: course.name,
      description: 'Materia vinculable'
    }))
  ];

  const taskOptions = [
    { value: '', label: 'Sin trabajo específico', description: 'Puedes dejarlo libre' },
    ...tasks.map(task => ({
      value: task.id,
      label: task.title,
      description: 'Trabajo o tarea vinculable'
    }))
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at top, rgba(0, 243, 255, 0.08), rgba(0,0,0,0.88) 46%)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '16px' }}>
      <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '620px', padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '16px', margin: 'auto', borderRadius: '30px', background: 'linear-gradient(155deg, rgba(10,12,22,0.96) 0%, rgba(18,22,34,0.92) 55%, rgba(0,243,255,0.06) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 80px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.06)', maxHeight: '95vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.02em', color: '#fff' }}>{mode === 'edit' ? 'Editar Bloque' : 'Agregar Bloque'}</h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>Define el día, el momento y el vínculo del bloque sin salir del estilo CampusFlow.</p>
          </div>
          <div style={{ padding: '6px 10px', borderRadius: '999px', border: '1px solid rgba(0,243,255,0.26)', background: 'rgba(0,243,255,0.10)', color: '#7fefff', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Modal Premium
          </div>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <PlannerField label="Día *" hint="Ubicación exacta dentro de la semana">
              <CustomSelect
                value={formData.day}
                onChange={(nextValue) => setFormData({ ...formData, day: nextValue })}
                options={DAY_OPTIONS}
                placeholder="Seleccionar día"
                accentColor="#00c2ff"
              />
            </PlannerField>

            <PlannerField label="Momento *" hint="Energía visual por tramo del día">
              <CustomSelect
                value={formData.block_time}
                onChange={(nextValue) => setFormData({ ...formData, block_time: nextValue })}
                options={TIME_OPTIONS}
                placeholder="Seleccionar momento"
                accentColor={getTimeTheme(formData.block_time).accent}
              />
            </PlannerField>
          </div>

          <PlannerField label="Título del bloque *" hint="Nombre corto y fácil de reconocer">
            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.10)', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s, box-shadow 0.2s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }} 
            onFocus={(e) => { e.target.style.border = '1px solid rgba(0,243,255,0.45)'; e.target.style.boxShadow = '0 0 0 4px rgba(0,243,255,0.08)'; }}
            onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.10)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04)'; }}
            placeholder="Ej. Ejercicio 1, revisión final, enfoque profundo..." />
          </PlannerField>

          <PlannerField label="Tipo de bloque *" hint="Controla qué conexiones opcionales aparecen">
            <CustomSelect
              value={formData.block_type}
              onChange={(nextValue) => setFormData({ ...formData, block_type: nextValue })}
              options={BLOCK_TYPE_OPTIONS}
              placeholder="Seleccionar tipo"
              accentColor="#7af0ff"
            />
          </PlannerField>

          {formData.block_type === 'materia' && (
            <PlannerField label="Materia *" hint="Selecciona la materia vinculada al bloque">
              <CustomSelect
                value={formData.course_id}
                onChange={(nextValue) => setFormData({ ...formData, course_id: nextValue })}
                options={courseOptions}
                placeholder={courseOptions.length ? 'Seleccionar materia' : 'No hay materias disponibles'}
                accentColor="var(--accent-secondary)"
              />
            </PlannerField>
          )}

          {formData.block_type === 'trabajo' && (
            <PlannerField label="Trabajo / Tarea *" hint="El estado del bloque no altera el trabajo real">
              <CustomSelect
                value={formData.task_id}
                onChange={(nextValue) => setFormData({ ...formData, task_id: nextValue })}
                options={taskOptions}
                placeholder={taskOptions.length ? 'Seleccionar trabajo o tarea' : 'No hay trabajos disponibles'}
                accentColor="#ff9f5a"
              />
            </PlannerField>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <PlannerField label="Duración (min) - Opcional" hint="Entre 5 y 480 minutos">
              <input type="number" min="5" max="480" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.10)', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'border 0.2s, box-shadow 0.2s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
              onFocus={(e) => { e.target.style.border = '1px solid rgba(0,243,255,0.45)'; e.target.style.boxShadow = '0 0 0 4px rgba(0,243,255,0.08)'; }}
              onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.10)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04)'; }}
              placeholder="60" />
            </PlannerField>

            <PlannerField label="Estado inicial" hint="Solo afecta este bloque dentro del planner">
              <CustomSelect
                value={formData.status}
                onChange={(nextValue) => setFormData({ ...formData, status: nextValue })}
                options={STATUS_OPTIONS}
                placeholder="Seleccionar estado"
                accentColor="#34c759"
              />
            </PlannerField>
          </div>

          <PlannerField label="Nota (Opcional)" hint="Detalle breve para recordar el enfoque del bloque">
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={{ width: '100%', padding: '12px 14px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.10)', color: '#fff', fontSize: '0.93rem', outline: 'none', transition: 'border 0.2s, box-shadow 0.2s', minHeight: '64px', fontFamily: 'inherit', resize: 'vertical', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
            onFocus={(e) => { e.target.style.border = '1px solid rgba(0,243,255,0.45)'; e.target.style.boxShadow = '0 0 0 4px rgba(0,243,255,0.08)'; }}
            onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.10)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04)'; }}
            placeholder="Ej. Revisar ejercicios, preparar entrega, dejar contexto para mañana..." />
          </PlannerField>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
            <button type="button" onClick={onClose} className="click-press" style={{ padding: '12px 24px', borderRadius: '999px', border: '1px solid rgba(255, 77, 77, 0.3)', background: 'linear-gradient(135deg, rgba(255, 77, 77, 0.12), rgba(255, 77, 77, 0.04))', color: '#ff7d7d', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', boxShadow: '0 18px 28px rgba(255,77,77,0.08), inset 0 1px 0 rgba(255,255,255,0.03)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 77, 77, 0.28), rgba(255, 77, 77, 0.1))';
              e.currentTarget.style.borderColor = 'rgba(255, 77, 77, 0.5)';
              e.currentTarget.style.boxShadow = '0 24px 38px rgba(255,77,77,0.18), inset 0 1px 0 rgba(255,255,255,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 77, 77, 0.12), rgba(255, 77, 77, 0.04))';
              e.currentTarget.style.borderColor = 'rgba(255, 77, 77, 0.3)';
              e.currentTarget.style.boxShadow = '0 18px 28px rgba(255,77,77,0.08), inset 0 1px 0 rgba(255,255,255,0.03)';
            }}>Cancelar</button>
            <button type="submit" className="click-press" style={{ padding: '12px 28px', borderRadius: '999px', border: '1px solid rgba(0, 243, 255, 0.36)', background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.22), rgba(0, 243, 255, 0.08))', color: '#92f6ff', fontWeight: 900, cursor: 'pointer', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', boxShadow: '0 22px 34px rgba(0,243,255,0.14), inset 0 1px 0 rgba(255,255,255,0.04)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 243, 255, 0.45), rgba(0, 243, 255, 0.18))';
              e.currentTarget.style.borderColor = 'rgba(0, 243, 255, 0.6)';
              e.currentTarget.style.boxShadow = '0 28px 46px rgba(0,243,255,0.28), inset 0 1px 0 rgba(255,255,255,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 243, 255, 0.22), rgba(0, 243, 255, 0.08))';
              e.currentTarget.style.borderColor = 'rgba(0, 243, 255, 0.36)';
              e.currentTarget.style.boxShadow = '0 22px 34px rgba(0,243,255,0.14), inset 0 1px 0 rgba(255,255,255,0.04)';
            }}>{mode === 'edit' ? 'GUARDAR CAMBIOS' : 'GUARDAR BLOQUE'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()} 
        style={{ 
          width: '100%', maxWidth: '420px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px',
          background: 'linear-gradient(135deg, rgba(30,15,15,0.95) 0%, rgba(20,10,10,0.98) 100%)',
          border: '1px solid rgba(255,59,48,0.2)', borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 0 40px rgba(255,59,48,0.05)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '4px', background: 'linear-gradient(90deg, transparent, rgba(255,59,48,0.6), transparent)'
        }} />
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff3b30', margin: '0 auto', boxShadow: '0 0 30px rgba(255,59,48,0.2)'
        }}>
          <Trash2 size={26} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '1.4rem', color: '#fff', letterSpacing: '0.5px' }}>Eliminar planificación</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            ¿Seguro que quieres eliminar esta planificación? Esta acción no se puede deshacer.
          </p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
          <button type="button" onClick={onClose} className="click-press" 
            onMouseEnter={(e) => {
              const liquid = e.currentTarget.querySelector('.liquid-fill-cancel');
              if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(1.2)'; liquid.style.opacity = '1'; }
            }}
            onMouseLeave={(e) => {
              const liquid = e.currentTarget.querySelector('.liquid-fill-cancel');
              if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(0)'; liquid.style.opacity = '0'; }
            }}
            style={{ 
              padding: '12px 24px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', 
              color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700, transition: 'all 0.3s ease',
              position: 'relative', overflow: 'hidden', letterSpacing: '1px', flex: 1
            }}>
            <div className="liquid-fill-cancel" style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(0)',
              width: '150%', aspectRatio: '1/1', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
              opacity: 0, transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)', pointerEvents: 'none', zIndex: 0
            }} />
            <span style={{ position: 'relative', zIndex: 1 }}>CANCELAR</span>
          </button>
          
          <button type="button" onClick={onConfirm} className="click-press" 
            onMouseEnter={(e) => {
              const liquid = e.currentTarget.querySelector('.liquid-fill-delete');
              if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(1.2)'; liquid.style.opacity = '1'; }
            }}
            onMouseLeave={(e) => {
              const liquid = e.currentTarget.querySelector('.liquid-fill-delete');
              if (liquid) { liquid.style.transform = 'translate(-50%, -50%) scale(0)'; liquid.style.opacity = '0'; }
            }}
            style={{ 
              padding: '12px 24px', borderRadius: '50px', border: '1px solid rgba(255, 59, 48, 0.6)', background: 'linear-gradient(135deg, rgba(255,59,48,0.2), rgba(255,59,48,0.05))', 
              color: '#ff7d7d', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 24px rgba(255,59,48,0.2), inset 0 0 12px rgba(255,59,48,0.1)',
              transition: 'all 0.3s ease', letterSpacing: '1px', textTransform: 'uppercase',
              position: 'relative', overflow: 'hidden', flex: 1
            }}>
            <div className="liquid-fill-delete" style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(0)',
              width: '150%', aspectRatio: '1/1', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,59,48,0.4) 0%, transparent 70%)',
              opacity: 0, transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)', pointerEvents: 'none', zIndex: 0
            }} />
            <span style={{ position: 'relative', zIndex: 1, textShadow: '0 0 8px rgba(255,59,48,0.4)' }}>ELIMINAR</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

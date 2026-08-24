import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle2, Calendar, Trophy } from 'lucide-react';
import CustomSelect from './CustomSelect';

const TaskHistoryView = ({ tasks = [], courses = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('TODAS');
  const [selectedCourse, setSelectedCourse] = useState('');

  const categories = ['TODAS', 'UNAD', 'SENA', 'PERSONALIZADO'];

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Búsqueda por texto
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por materia
      const matchesCourse = selectedCourse ? task.course_id === selectedCourse : true;

      // Filtro por categoría (Institución)
      const courseObj = courses.find(c => c.id === task.course_id);
      const inst = (courseObj?.institution || '').toUpperCase();
      let matchesCategory = true;
      if (activeCategory === 'UNAD') matchesCategory = inst === 'UNAD';
      else if (activeCategory === 'SENA') matchesCategory = inst === 'SENA';
      else if (activeCategory === 'PERSONALIZADO') matchesCategory = inst !== 'UNAD' && inst !== 'SENA';

      return matchesSearch && matchesCourse && matchesCategory;
    }).sort((a, b) => {
      const dateA = a.updated_at || a.created_at || '0';
      const dateB = b.updated_at || b.created_at || '0';
      return new Date(dateB) - new Date(dateA);
    });
  }, [tasks, courses, searchTerm, activeCategory, selectedCourse]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.1) 100%)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        minHeight: '600px'
      }}
    >
      {/* Header & Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle2 size={24} color="#10b981" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Historial de Entregas</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tasks.length} trabajos completados</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '50px',
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeCategory === cat ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: activeCategory === cat ? '#00f3ff' : 'var(--text-secondary)',
                  border: activeCategory === cat ? '1px solid rgba(0, 243, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar entregas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '14px 16px 14px 44px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border 0.3s'
              }}
            />
          </div>

          {/* Course Select */}
          <div style={{ zIndex: 10 }}>
            <CustomSelect
              value={selectedCourse}
              onChange={setSelectedCourse}
              options={[
                { value: '', label: 'Todas las materias' },
                ...courses.map(c => ({ value: c.id, label: c.name }))
              ]}
              placeholder="Filtrar por materia..."
            />
          </div>
        </div>
      </div>

      {/* Task List Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        <AnimatePresence>
          {filteredTasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}
            >
              <CheckCircle2 size={48} opacity={0.2} style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: '1rem' }}>No se encontraron entregas con estos filtros</p>
            </motion.div>
          ) : (
            filteredTasks.map((task) => {
              const courseObj = courses.find(c => c.id === task.course_id);
              const accentColor = courseObj?.color || 'var(--accent-primary)';
              
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'transform 0.2s, background 0.2s',
                    cursor: 'default'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {courseObj?.name || 'General'}
                      </span>
                    </div>
                    
                    {/* XP Indicator */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      padding: '4px 8px', borderRadius: '20px',
                      color: '#10b981', fontSize: '0.7rem', fontWeight: 800
                    }}>
                      <Trophy size={12} />
                      <span>+50 XP</span>
                    </div>
                  </div>
                  
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {task.title}
                  </h4>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <Calendar size={13} />
                      <span>{formatDate(task.updated_at || task.created_at)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TaskHistoryView;

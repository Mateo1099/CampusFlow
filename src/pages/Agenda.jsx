import React, { useState, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTasksContext } from '../context/TaskContext';
import ColorPicker from '../components/ui/ColorPicker';
import { Plus, Trash2, Hash, Pencil, X, User, Building2, Save, Filter } from 'lucide-react';
import emptyStateImg from '../assets/empty_state_cube.png';

const INSTITUTIONS = ['UNAD', 'SENA'];

const CourseCard = ({ course, onDelete, onEdit, t }) => {
  const displayColor = course.color || '#ff0000';
  const displayName = course.name || 'Sin Nombre';

  return (
    <div className="glass-panel glass-card-hover animate-fade-in" style={{ 
      padding: '24px 28px', 
      display: 'flex', 
      flexDirection: 'column', 
      position: 'relative', 
      overflow: 'visible', 
      minHeight: '160px',
      transition: 'all 0.4s var(--ease-out-quint)'
    }}>
      {/* Barra de color lateral con brillo */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: displayColor, boxShadow: `0 0 15px ${displayColor}`, borderRadius: '32px 0 0 32px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '0.68rem', color: displayColor, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', fontWeight: 800 }}>
            <Hash size={10} /> {course.code || 'S/C'}
          </span>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', lineHeight: 1.2, wordBreak: 'break-word', fontWeight: 900 }}>{displayName}</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Building2 size={12} color="var(--text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{course.institution || 'No Asignada'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={12} color="var(--text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{course.teacher || 'Sin Profesor'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            className="btn-icon"
            title="Editar materia"
            onClick={() => onEdit(course)}
          >
            <Pencil size={15} />
          </button>
          <button className="btn-icon" title={t.delete} onClick={() => onDelete(course.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Agenda = () => {
  const { courses, addCourse, deleteCourse, updateCourse, coursesLoading } = useTasksContext();
  const { t } = useSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', color: '#ff0000', teacher: '', institution: 'UNAD', customInstitution: '' });
  const [showCustom, setShowCustom] = useState(false);
  
  // NIVEL S: Filtro Táctico Persistente
  const [filtroActivo, setFiltroActivo] = useState(() => {
    return localStorage.getItem('cf_filtro_agenda') || 'TODAS';
  });

  // Guardar filtro al cambiar
  React.useEffect(() => {
    localStorage.setItem('cf_filtro_agenda', filtroActivo);
  }, [filtroActivo]);

  const filteredCourses = useMemo(() => {
    console.log("AGENDA_LOG: Cursos actuales en estado ->", courses);
    if (filtroActivo === 'TODAS') return courses;
    
    if (filtroActivo === 'PERSONALIZADO') {
      return courses.filter(c => {
        const inst = (c.institution || '').toUpperCase();
        return !INSTITUTIONS.includes(inst);
      });
    }
    
    return courses.filter(c => {
      const inst = (c.institution || '').toUpperCase();
      return inst === filtroActivo.toUpperCase();
    });
  }, [courses, filtroActivo]);

  if (coursesLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--accent-primary)' }}>
        <div className="animate-pulse font-display" style={{ fontWeight: 800 }}>//_SINCRONIZANDO_SISTEMA...</div>
      </div>
    );
  }

  const handleEdit = (course) => {
    const isCustomInst = !INSTITUTIONS.includes(course.institution);
    setFormData({
      name: course.name,
      code: course.code || '',
      color: course.color || course.prefixColor || '#ff0000',
      teacher: course.teacher || '',
      institution: isCustomInst ? t.customInstitution : (course.institution || 'UNAD'),
      customInstitution: isCustomInst ? course.institution : ''
    });
    setEditingId(course.id);
    setIsEditing(true);
    setShowCustom(isCustomInst);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setFormData({ name: '', code: '', color: '#ff0000', teacher: '', institution: 'UNAD', customInstitution: '' });
    setIsEditing(false);
    setEditingId(null);
    setShowCustom(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const institutionValue = formData.institution === t.customInstitution
      ? formData.customInstitution
      : formData.institution;

    const submissionData = {
      name: formData.name,
      code: formData.code,
      institution: institutionValue,
      teacher: formData.teacher,
      color: formData.color
    };

    try {
      if (isEditing) {
        await updateCourse(editingId, submissionData);
      } else {
        await addCourse(submissionData);
      }
      cancelEdit();
    } catch (err) {
      console.error("Error saving course:", err);
    }
  };

  const handleInstitutionChange = (val) => {
    setFormData({ ...formData, institution: val });
    setShowCustom(val === t.customInstitution);
  };

  const filterOptions = [
    { id: 'TODAS', color: 'var(--accent-primary)' },
    { id: 'UNAD', color: '#ffcc00' },
    { id: 'SENA', color: '#00ff66' },
    { id: 'PERSONALIZADO', color: '#cc00ff' }
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '32px 40px' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.05em' }}>Gestión de Materias</h1>
        <p style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 800, marginTop: '4px' }}>SISTEMA_DE_REGISTRO</p>
      </header>

      {/* FILTRO TÁCTICO */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '40px', 
        padding: '8px', 
        background: 'rgba(0,0,0,0.3)', 
        borderRadius: '16px', 
        border: '1px solid var(--border-glass-top)',
        width: 'fit-content'
      }}>
        {filterOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setFiltroActivo(opt.id)}
            className="click-press"
            style={{
              padding: '10px 20px',
              background: filtroActivo === opt.id ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: `1px solid ${filtroActivo === opt.id ? opt.color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '12px',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 900,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: filtroActivo === opt.id ? `0 0 15px ${opt.color}44` : 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            {opt.id}
          </button>
        ))}
      </div>

      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '48px', alignItems: 'start' }}>

        {/* Formulario Estilo Warzone / Gamer */}
        <div className="glass-panel gamer-glow" style={{ padding: '32px', background: 'rgba(5,5,5,0.8)' }}>
          <h3 className="font-display" style={{ marginBottom: '28px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 800 }}>
            {isEditing ? <Pencil size={20} /> : <Plus size={20} />} 
            {isEditing ? 'EDITAR MATERIA' : 'REGISTRAR MATERIA'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--accent-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>NOMBRE DEL CURSO *</label>
              <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Cálculo Diferencial" required style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,0,0,0.2)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--accent-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>CÓDIGO</label>
                <input className="input" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="100410" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,0,0,0.2)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--accent-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>INSTITUCIÓN</label>
                <select className="select" value={formData.institution} onChange={e => handleInstitutionChange(e.target.value)} style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,0,0,0.2)' }}>
                  {INSTITUTIONS.map(inst => <option key={inst} value={inst} style={{ background: '#000' }}>{inst}</option>)}
                  <option value={t.customInstitution} style={{ background: '#000' }}>{t.customInstitution}</option>
                </select>
              </div>
            </div>

            {showCustom && (
              <div className="animate-fade-in">
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--accent-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>NOMBRE INSTITUCIÓN</label>
                <input className="input" value={formData.customInstitution} onChange={e => setFormData({ ...formData, customInstitution: e.target.value })} placeholder="Ej. Universidad Nacional" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,0,0,0.2)' }} />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--accent-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>PROFESOR *</label>
              <input className="input" value={formData.teacher} onChange={e => setFormData({ ...formData, teacher: e.target.value })} placeholder="Ej. Ing. Mauricio Silva" required style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,0,0,0.2)' }} />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--accent-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>COLOR DE IDENTIFICACIÓN</label>
              <ColorPicker 
                selectedColor={formData.color} 
                onSelect={(color) => setFormData({ ...formData, color: color })}
                t={t} 
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {isEditing && (
                <button type="button" className="btn btn-secondary" onClick={cancelEdit} style={{ flex: 1 }}>
                  CANCELAR
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{ flex: 2, background: 'var(--accent-primary)', color: '#fff', fontWeight: 900 }}>
                {isEditing ? <Save size={18} /> : <Plus size={18} />} 
                {isEditing ? 'GUARDAR_CAMBIOS' : 'REGISTRAR'}
              </button>
            </div>
          </form>
        </div>

        {/* Grid de materias filtrado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {filteredCourses.length === 0 ? (
            <div className="glass-panel animate-fade-in" style={{ padding: '60px 40px', textAlign: 'center', gridColumn: '1 / -1', opacity: 0.8, borderStyle: 'dashed', borderColor: 'var(--border-glass-top)' }}>
              <img src={emptyStateImg} alt="Vacío" style={{ maxWidth: '180px', opacity: 0.9, marginBottom: '16px', filter: 'drop-shadow(0 0 20px rgba(255, 0, 0, 0.2))' }} />
              <p className="font-display" style={{ fontSize: '1.2rem', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--text-muted)' }}>
                {filtroActivo === 'TODAS' ? 'SISTEMA SIN DATOS' : `SIN MATERIAS EN ${filtroActivo}`}
              </p>
            </div>
          ) : (
            filteredCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onDelete={deleteCourse}
                onEdit={handleEdit}
                t={t}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Agenda;

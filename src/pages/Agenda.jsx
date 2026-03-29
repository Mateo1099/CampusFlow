import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import ColorPicker from '../components/ui/ColorPicker';
import { Plus, Trash2, Hash, Pencil, X, User, Building2 } from 'lucide-react';
import emptyStateImg from '../assets/empty_state_cube.png';

const INSTITUTIONS = ['UNAD', 'SENA'];

const CourseCard = ({ course, onDelete, onUpdateColor, t }) => {
  const [editingColor, setEditingColor] = useState(false);

  return (
    <div className="glass-panel glass-card-hover" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'visible', minHeight: '160px' }}>
      {/* Barra de color lateral con brillo */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: course.prefixColor, boxShadow: `0 0 15px ${course.prefixColor}`, borderRadius: '32px 0 0 32px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {course.code && (
            <span style={{ fontSize: '0.68rem', color: course.prefixColor, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <Hash size={10} /> {course.code}
            </span>
          )}
          <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', lineHeight: 1.2, wordBreak: 'break-word' }}>{course.name}</h3>

          {course.institution && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Building2 size={12} color="var(--text-muted)" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{course.institution}</span>
            </div>
          )}
          {course.teacher && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={12} color="var(--text-muted)" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{course.teacher}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            className="btn-icon"
            title={t.editColor}
            onClick={() => setEditingColor(p => !p)}
            style={{ color: editingColor ? 'var(--accent-primary)' : undefined }}
          >
            <Pencil size={15} />
          </button>
          <button className="btn-icon" title={t.delete} onClick={() => onDelete(course.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Panel editar color con ColorPicker */}
      {editingColor && (
        <div className="animate-fade-in" style={{ marginTop: '16px', padding: '16px', borderRadius: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass-top)' }}>
          <ColorPicker 
            selectedColor={course.prefixColor} 
            onSelect={(newColor) => {
              onUpdateColor(course.id, newColor);
              setEditingColor(false);
            }} 
            t={t} 
          />
        </div>
      )}
    </div>
  );
};

const Agenda = () => {
  const { courses, addCourse, deleteCourse, updateCourse, t } = useApp();
  const [formData, setFormData] = useState({ name: '', code: '', prefixColor: '#00f3ff', teacher: '', institution: 'UNAD', customInstitution: '' });
  const [showCustom, setShowCustom] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const institutionValue = formData.institution === t.customInstitution
      ? formData.customInstitution
      : formData.institution;
    addCourse({ ...formData, institution: institutionValue });
    setFormData({ name: '', code: '', prefixColor: '#00f3ff', teacher: '', institution: 'UNAD', customInstitution: '' });
    setShowCustom(false);
  };

  const handleInstitutionChange = (val) => {
    setFormData({ ...formData, institution: val });
    setShowCustom(val === t.customInstitution);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '32px 40px' }}>
      <header className="page-header">
        <h1 className="page-title">{t.subjects}</h1>
      </header>

      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '48px', alignItems: 'start' }}>

        {/* Formulario */}
        <div className="glass-panel glass-card-hover" style={{ padding: '32px' }}>
          <h3 className="font-display" style={{ marginBottom: '28px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary)' }}>
            <Plus size={20} /> {t.addSubject}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.subjectName} *</label>
              <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Cálculo Diferencial" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.code}</label>
                <input className="input" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="100410" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.institution}</label>
                <select className="select" value={formData.institution} onChange={e => handleInstitutionChange(e.target.value)}>
                  {INSTITUTIONS.map(inst => <option key={inst} value={inst} style={{ background: 'var(--bg-primary)' }}>{inst}</option>)}
                  <option value={t.customInstitution} style={{ background: 'var(--bg-primary)' }}>{t.customInstitution}</option>
                </select>
              </div>
            </div>

            {showCustom && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nombre de la Institución</label>
                <input className="input" value={formData.customInstitution} onChange={e => setFormData({ ...formData, customInstitution: e.target.value })} placeholder="Mi Universidad / Bootcamp..." />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.teacher} *</label>
              <input className="input" value={formData.teacher} onChange={e => setFormData({ ...formData, teacher: e.target.value })} placeholder="Ej. Prof. García" required />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <ColorPicker 
                selectedColor={formData.prefixColor} 
                onSelect={(color) => setFormData({ ...formData, prefixColor: color })}
                t={t} 
              />
            </div>

            {/* Preview de cómo quedará */}
            {formData.name && (
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${formData.prefixColor}`, boxShadow: `0 0 12px ${formData.prefixColor}55` }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Vista previa:</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--text-primary)' }}>{formData.name}</p>
                {formData.teacher && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{formData.teacher}</p>}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              <Plus size={16} /> {t.save}
            </button>
          </form>
        </div>

        {/* Grid de materias */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '20px' }}>
          {courses.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1', opacity: 0.8, borderStyle: 'dashed' }}>
              <img src={emptyStateImg} alt="Empty State" style={{ maxWidth: '160px', opacity: 0.9, marginBottom: '8px', filter: 'drop-shadow(0 0 20px rgba(0, 243, 255, 0.2))' }} />
              <p className="font-display" style={{ fontSize: '1.1rem', letterSpacing: '0.1em' }}>{t.emptyDatabase}</p>
            </div>
          ) : (
            courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onDelete={deleteCourse}
                onUpdateColor={(id, color) => updateCourse(id, { prefixColor: color })}
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

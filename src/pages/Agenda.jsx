import React, { useState, useMemo, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTasksContext } from '../context/TaskContext';
import { Plus, Trash2, Hash, Pencil, X, User, Building2, Save, Filter } from 'lucide-react';
import emptyStateImg from '../assets/empty_state_cube.png';
import CourseModal from '../components/ui/CourseModal';
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

import { playClick } from '../lib/audioService';

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
            onClick={() => { playClick(1000); onEdit(course); }}
          >
            <Pencil size={15} />
          </button>
          <button className="btn-icon-danger" title={t.delete} onClick={() => { playClick(600); onDelete(course.id); }}>
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

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    color: '#ff0000',
    teacher: '',
    institution: 'UNAD',
    customInstitution: '',
    created_at: new Date().toISOString().split('T')[0]
  });

  const [filtroActivo, setFiltroActivo] = useState(() => {
    return localStorage.getItem('cf_filtro_agenda') || 'TODAS';
  });

  const btnNewRef = useRef(null);
  const liquidRef = useRef(null);

  useGSAP(() => {
    if (!btnNewRef.current || !liquidRef.current) return;
    const btn = btnNewRef.current;
    const liquid = liquidRef.current;

    const hoverTl = gsap.timeline({ paused: true });

    hoverTl.to(liquid, {
      scale: 1.2,
      opacity: 1,
      duration: 0.6,
      ease: "slow(0.7, 0.7, false)"
    });

    const enter = () => hoverTl.play();
    const leave = () => hoverTl.reverse();

    btn.addEventListener("mouseenter", enter);
    btn.addEventListener("mouseleave", leave);

    return () => {
      btn.removeEventListener("mouseenter", enter);
      btn.removeEventListener("mouseleave", leave);
    };
  }, [showModal]);

  React.useEffect(() => {
    localStorage.setItem('cf_filtro_agenda', filtroActivo);
  }, [filtroActivo]);

  const filteredCourses = useMemo(() => {
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
      color: course.color || '#ff0000',
      teacher: course.teacher || '',
      institution: isCustomInst ? 'PERSONALIZADO' : (course.institution || 'UNAD'),
      customInstitution: isCustomInst ? course.institution : '',
      created_at: course.created_at ? course.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setEditingId(course.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setFormData({
      name: '',
      code: '',
      color: '#ff0000',
      teacher: '',
      institution: 'UNAD',
      customInstitution: '',
      created_at: new Date().toISOString().split('T')[0]
    });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const institutionValue = formData.institution === 'PERSONALIZADO'
      ? formData.customInstitution
      : formData.institution;

    const submissionData = {
      name: formData.name,
      code: formData.code,
      institution: institutionValue,
      teacher: formData.teacher,
      color: formData.color,
      created_at: formData.created_at // Aunque no esté en el service explícito, lo pasamos
    };

    try {
      if (isEditing) {
        await updateCourse(editingId, submissionData);
      } else {
        await addCourse(submissionData);
      }
      setShowModal(false);
    } catch (err) {
      console.error("Error saving course:", err);
    }
  };

  const filterOptions = [
    { id: 'TODAS', color: 'var(--accent-primary)' },
    { id: 'UNAD', color: '#ffcc00' },
    { id: 'SENA', color: '#00ff66' },
    { id: 'PERSONALIZADO', color: '#cc00ff' }
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '32px 48px' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass-top)', paddingBottom: '32px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '3.2rem', margin: 0, fontWeight: 950 }}>MATERIAS</h1>
        </div>
        <button
          ref={btnNewRef}
          className="click-press"
          onClick={handleOpenNew}
          style={{
            padding: '10px 28px',
            fontWeight: 700,
            borderRadius: '50px',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#00f3ff',
            border: '1px solid #00f3ff',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            ref={liquidRef}
            style={{
              background: 'radial-gradient(circle, rgba(0, 243, 255, 0.4) 0%, rgba(0, 243, 255, 0) 70%)',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) scale(0)',
              borderRadius: '50%',
              width: '150%',
              aspectRatio: '1/1',
              pointerEvents: 'none',
              opacity: 0,
              zIndex: 0
            }}
          />
          <Plus size={18} style={{ position: 'relative', zIndex: 1 }} />
          <span style={{ position: 'relative', zIndex: 1 }}>NUEVA MATERIA</span>
        </button>
      </header>

      {/* FILTROS NEON-PILLS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
        {filterOptions.map(opt => {
          const isActive = filtroActivo === opt.id;
          const neonColor = opt.id === 'TODAS' ? '#00f3ff' :
            opt.id === 'UNAD' ? '#ffcc00' :
              opt.id === 'SENA' ? '#00ff88' : '#bc13fe';

          return (
            <button
              key={opt.id}
              onClick={() => {
                setFiltroActivo(opt.id);
                const freqs = { TODAS: 800, UNAD: 1000, SENA: 1200, PERSONALIZADO: 1500 };
                playClick(freqs[opt.id] || 800);
              }}
              style={{
                padding: '10px 24px',
                borderRadius: '50px',
                border: isActive ? `2px solid ${neonColor}` : '2px solid rgba(255,255,255,0.05)',
                background: isActive ? `${neonColor}15` : 'rgba(255,255,255,0.02)',
                color: isActive ? neonColor : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isActive ? `0 0 20px ${neonColor}33, inset 0 0 10px ${neonColor}11` : 'none',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isActive ? neonColor : 'rgba(255,255,255,0.2)',
                boxShadow: isActive ? `0 0 10px ${neonColor}` : 'none'
              }} />
              {opt.id}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {filteredCourses.length === 0 ? (
          <div className="glass-panel animate-fade-in" style={{ padding: '60px 40px', textAlign: 'center', gridColumn: '1 / -1', opacity: 0.8, borderStyle: 'dashed', borderColor: 'var(--border-glass-top)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '180px', height: '180px', marginBottom: '16px', position: 'relative' }}>
              <img
                src={emptyStateImg}
                alt="Vacío"
                style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.9, filter: 'drop-shadow(0 0 20px rgba(255, 0, 0, 0.2))' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{ display: 'none', width: '100%', height: '100%', border: '2px solid var(--accent-primary)', borderRadius: '16px', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 243, 255, 0.05)', boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)' }}>
                <Plus size={40} color="var(--accent-primary)" opacity={0.5} />
              </div>
            </div>
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

      <CourseModal
        show={showModal}
        onClose={() => setShowModal(false)}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        t={t}
      />
    </div>
  );
};

export default Agenda;

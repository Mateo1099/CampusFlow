/* eslint-disable no-unused-vars, react/jsx-no-comment-textnodes */
import React, { useState, useMemo, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTasksContext } from '../context/TaskContext';
import { CourseCard } from '../components/CourseCard';
import { Plus, Trash2, Hash, Pencil, X, User, Building2, Save, Filter, BookOpen } from 'lucide-react';
import emptyStateImg from '../assets/empty_state_cube.png';
import CourseModal from '../components/ui/CourseModal';
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { motion, AnimatePresence } from 'framer-motion';
import InstitutionFilterPills from '../components/ui/InstitutionFilterPills';
import { playClick } from '../lib/audioService';
import BinEatButton from '../components/ui/BinEatButton';

const INSTITUTIONS = ['UNAD', 'SENA'];

const Agenda = () => {
  const { courses, addCourse, deleteCourse, updateCourse, coursesLoading } = useTasksContext();
  const { t } = useSettings();

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [courseToDelete, setCourseToDelete] = useState(null);
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


  return (
    <div className="animate-fade-in agenda-page" style={{ padding: '32px 48px' }}>
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="page-header" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '24px 32px', 
          marginBottom: '32px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.1) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '12px', background: 'rgba(0, 243, 255, 0.1)', borderRadius: '16px', border: '1px solid rgba(0, 243, 255, 0.2)' }}>
            <BookOpen size={32} color="#00f3ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0,243,255,0.6))' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>MATERIAS</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Organiza y supervisa tus asignaturas y avance académico.</p>
          </div>
        </div>
        <motion.button 
          className="click-press" 
          onClick={handleOpenNew}
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(6, 182, 212, 0.2)', boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)', borderColor: 'rgba(6, 182, 212, 0.6)' }}
          whileTap={{ scale: 0.95 }}
          style={{ 
            padding: '10px 28px', 
            fontWeight: 700, 
            borderRadius: '50px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            color: '#00f3ff', 
            border: '1px solid rgba(0, 243, 255, 0.3)', 
            backdropFilter: 'blur(10px)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.9rem', 
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0,243,255,0.15), inset 0 0 10px rgba(0,243,255,0.05)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'background-color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease'
          }}
        >
          <Plus size={18} style={{ position: 'relative', zIndex: 1 }} /> 
          <span style={{ position: 'relative', zIndex: 1 }}>NUEVA MATERIA</span>
        </motion.button>
      </motion.header>

      {/* FILTROS NEON-PILLS */}
      <InstitutionFilterPills
        activeFilter={filtroActivo}
        onSelect={setFiltroActivo}
        style={{ marginBottom: '40px' }}
      />

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
              onDelete={(id) => setCourseToDelete(id)}
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
        onDelete={(id) => setCourseToDelete(id)}
        t={t}
      />
      <AnimatePresence>
        {courseToDelete && (
          <ConfirmDeleteModal
            onClose={() => setCourseToDelete(null)}
            onConfirm={() => {
              deleteCourse(courseToDelete);
              setCourseToDelete(null);
            }}
            title="Eliminar materia"
            message="¿Seguro que quieres eliminar esta materia? Esta acción no se puede deshacer."
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function ConfirmDeleteModal({ onClose, onConfirm, title, message }) {
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
          <h2 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '1.4rem', color: '#fff', letterSpacing: '0.5px' }}>{title}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {message}
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
          
          <BinEatButton
            onConfirm={onConfirm}
            label="ELIMINAR"
            size="md"
            ariaLabel="Confirmar eliminación de materia"
            style={{ flex: 1, height: '46px' }}
          />
        </div>
      </motion.div>
    </div>
  );
}

export default Agenda;

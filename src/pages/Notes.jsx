import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Plus, Search, Trash2, Edit3, 
  Sparkles, X, RefreshCw,
  Folder, Calendar, ArrowLeft, Check,
  SlidersHorizontal, FileEdit
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTasksContext } from '../context/TaskContext';
import { notesService } from '../services/notesService';
import { sanitizeNoteInput } from '../lib/sanitize';

/**
 * Notes (Apuntes) — Módulo Oficial e Independiente de Apuntes de Estudio
 * Diseñado bajo el sistema visual Cyber Luxe de CampusFlow.
 * Incluye filtro por materias, buscador en tiempo real, listado bento y editor con auto-guardado.
 */
export default function Notes() {
  const { user } = useAuth();
  const { courses = [] } = useTasksContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNote, setActiveNote] = useState(null); // null o nota en edición
  const [editorSaveStatus, setEditorSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Leer filtro de materia desde query params (ej: /apuntes?subjectId=course-arch-101)
  const selectedSubjectId = searchParams.get('subjectId') || 'all';

  const debounceTimerRef = useRef(null);
  const editorTextareaRef = useRef(null);

  // Cargar apuntes al montar
  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notesService.getNotes(user?.id);
      setNotes(data || []);
    } catch (err) {
      console.error('[Notes] Error cargando apuntes:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Manejo de cambio de filtro de materia
  const handleSelectSubject = (id) => {
    const newParams = new URLSearchParams(searchParams);
    if (id === 'all') {
      newParams.delete('subjectId');
    } else {
      newParams.set('subjectId', id);
    }
    setSearchParams(newParams, { replace: true });
  };

  // Filtrado y búsqueda en tiempo real
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // Filtro por materia
      if (selectedSubjectId !== 'all') {
        if (note.course_id !== selectedSubjectId) return false;
      }

      // Búsqueda en tiempo real
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const inTitle = note.title.toLowerCase().includes(query);
        const inContent = note.content.toLowerCase().includes(query);
        const inTags = Array.isArray(note.tags) && note.tags.some(t => t.toLowerCase().includes(query));
        return inTitle || inContent || inTags;
      }

      return true;
    });
  }, [notes, selectedSubjectId, searchQuery]);

  // Materia seleccionada actualmente (para cabecera informativa)
  const currentCourse = useMemo(() => {
    if (selectedSubjectId === 'all') return null;
    return courses.find(c => c.id === selectedSubjectId) || null;
  }, [courses, selectedSubjectId]);

  // Crear nuevo apunte
  const handleCreateNote = async () => {
    const initialCourseId = selectedSubjectId !== 'all' ? selectedSubjectId : (courses[0]?.id || null);
    const draft = {
      title: 'Nuevo Apunte de Clase',
      content: '',
      course_id: initialCourseId,
      tags: [],
    };

    try {
      const created = await notesService.createNote(user?.id, draft);
      setNotes(prev => [created, ...prev]);
      setActiveNote(created);
      setEditorSaveStatus('saved');
    } catch (err) {
      console.error('[Notes] Error creando apunte:', err);
    }
  };

  // Auto-guardado en editor con debounce
  const persistEditorChanges = useCallback(async (updatedNote) => {
    if (!updatedNote?.id) return;
    setEditorSaveStatus('saving');
    try {
      const saved = await notesService.updateNote(updatedNote.id, updatedNote, user?.id);
      setNotes(prev => prev.map(n => n.id === saved.id ? saved : n));
      setEditorSaveStatus('saved');
      setTimeout(() => {
        setEditorSaveStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('[Notes] Error guardando apunte:', err);
      setEditorSaveStatus('idle');
    }
  }, [user?.id]);

  const handleEditorFieldChange = (field, value) => {
    if (!activeNote) return;
    const sanitizedValue = (field === 'title' || field === 'content')
      ? sanitizeNoteInput(value)
      : value;
    const updated = { ...activeNote, [field]: sanitizedValue };
    setActiveNote(updated);
    setEditorSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      persistEditorChanges(updated);
    }, 600);
  };

  const handleManualSaveEditor = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (activeNote) {
      persistEditorChanges(activeNote);
    }
  };

  // Eliminar apunte
  const handleDeleteNote = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notesService.deleteNote(id, user?.id);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNote?.id === id) {
        setActiveNote(null);
      }
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('[Notes] Error eliminando apunte:', err);
    }
  };

  // Insertar snippet en cursor del editor
  const insertSnippetAtCursor = (prefix, suffix = '') => {
    const textarea = editorTextareaRef.current;
    if (!textarea || !activeNote) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = activeNote.content || '';
    const selected = current.substring(start, end);
    const replacement = `${prefix}${selected || 'texto'}${suffix}`;

    const newContent = current.substring(0, start) + replacement + current.substring(end);
    handleEditorFieldChange('content', newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 20);
  };

  // Formato de fecha legible
  const formatNoteDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div 
      className="notes-page-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px 28px',
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        minHeight: '100%',
      }}
    >
      {/* ─── CABECERA PRINCIPAL CYBER LUXE ─── */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.2) 0%, rgba(188, 19, 254, 0.2) 100%)',
                border: '1px solid rgba(0, 243, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
                boxShadow: '0 0 16px rgba(0, 243, 255, 0.25)',
              }}
            >
              <BookOpen size={20} />
            </div>
            <h1 
              style={{
                margin: 0,
                fontSize: '1.85rem',
                fontWeight: 900,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #fff 30%, var(--accent-primary) 70%, var(--accent-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Cuaderno de Apuntes
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Fórmulas, conceptos clave, síntesis de clase y notas organizadas por materia.
          </p>
        </div>

        {/* Botón Destacado + NUEVO APUNTE */}
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: '0 0 25px rgba(0, 243, 255, 0.5)' }}
          whileTap={{ scale: 0.96 }}
          onClick={handleCreateNote}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00f3ff 0%, #0099ff 50%, #bc13fe 100%)',
            border: 'none',
            color: '#000',
            fontWeight: 800,
            fontSize: '0.88rem',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0, 243, 255, 0.35)',
            transition: 'all 0.2s',
          }}
        >
          <Plus size={18} strokeWidth={3} />
          <span>+ Nuevo Apunte</span>
        </motion.button>
      </div>

      {/* ─── BARRA DE CONTROLES: FILTRO POR MATERIAS Y BUSCADOR ─── */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          padding: '16px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '18px',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Fila 1: Filtro de Materias con Pills interactivos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            <SlidersHorizontal size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>Materias:</span>
          </div>

          {/* Chip 'Todas' */}
          <button
            type="button"
            onClick={() => handleSelectSubject('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedSubjectId === 'all' 
                ? '1px solid var(--accent-primary)' 
                : '1px solid rgba(255, 255, 255, 0.08)',
              background: selectedSubjectId === 'all' 
                ? 'rgba(0, 243, 255, 0.15)' 
                : 'rgba(255, 255, 255, 0.03)',
              color: selectedSubjectId === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              boxShadow: selectedSubjectId === 'all' ? '0 0 14px rgba(0, 243, 255, 0.25)' : 'none',
            }}
          >
            <span>Todas</span>
            <span 
              style={{
                fontSize: '0.68rem',
                padding: '1px 6px',
                borderRadius: '10px',
                background: selectedSubjectId === 'all' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.08)',
                color: selectedSubjectId === 'all' ? '#000' : 'var(--text-primary)',
                fontWeight: 800,
              }}
            >
              {notes.length}
            </span>
          </button>

          {/* Chips por Materia con color temático */}
          {courses.map(course => {
            const isSelected = selectedSubjectId === course.id;
            const courseColor = course.color || 'var(--accent-primary)';
            const courseNotesCount = notes.filter(n => n.course_id === course.id).length;

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => handleSelectSubject(course.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: isSelected 
                    ? `1px solid ${courseColor}` 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected 
                    ? `${courseColor}22` 
                    : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? courseColor : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? `0 0 14px ${courseColor}33` : 'none',
                }}
              >
                <span 
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: courseColor,
                    boxShadow: `0 0 8px ${courseColor}`,
                  }}
                />
                <span>{course.name}</span>
                {courseNotesCount > 0 && (
                  <span 
                    style={{
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: isSelected ? courseColor : 'rgba(255, 255, 255, 0.08)',
                      color: isSelected ? '#000' : 'var(--text-primary)',
                      fontWeight: 800,
                    }}
                  >
                    {courseNotesCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Fila 2: Buscador en tiempo real */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              background: 'rgba(10, 12, 20, 0.6)',
              border: '1px solid rgba(0, 243, 255, 0.2)',
              borderRadius: '12px',
              transition: 'all 0.2s',
            }}
          >
            <Search size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por palabras clave, fórmulas, títulos o temas..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.86rem',
                fontFamily: 'var(--font-body)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {currentCourse && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: `${currentCourse.color}15`,
                border: `1px solid ${currentCourse.color}40`,
                fontSize: '0.74rem',
                fontWeight: 700,
                color: currentCourse.color,
                whiteSpace: 'nowrap',
              }}
            >
              <span>Filtrado por: {currentCourse.name}</span>
              <button
                type="button"
                onClick={() => handleSelectSubject('all')}
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                title="Quitar filtro"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── LISTADO DE APUNTES (BENTO GRID CYBER LUXE) ─── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
            <RefreshCw size={18} className="animate-spin" />
            <span>Cargando cuaderno de apuntes...</span>
          </div>
        </div>
      ) : filteredNotes.length === 0 ? (
        /* Estado vacío */
        <div 
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 0.015)',
            border: '1px dashed rgba(0, 243, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            maxWidth: '560px',
            margin: '20px auto',
          }}
        >
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(0, 243, 255, 0.08)',
              border: '1px solid rgba(0, 243, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              boxShadow: '0 0 24px rgba(0, 243, 255, 0.15)',
            }}
          >
            <BookOpen size={30} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {searchQuery.trim() 
                ? 'No se encontraron apuntes para tu búsqueda' 
                : currentCourse 
                ? `Aún no hay apuntes para ${currentCourse.name}` 
                : 'Tu cuaderno está listo para recibir tus notas'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {searchQuery.trim()
                ? 'Intenta con otras palabras clave o limpia el filtro de búsqueda.'
                : 'Crea tu primer apunte para organizar conceptos, teoremas y resúmenes de clase.'}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateNote}
            style={{
              marginTop: '8px',
              padding: '9px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00f3ff 0%, #0099ff 100%)',
              border: 'none',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 16px rgba(0, 243, 255, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>Crear primer apunte</span>
          </motion.button>
        </div>
      ) : (
        /* Grid de Tarjetas */
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '18px',
          }}
        >
          {filteredNotes.map(note => {
            const courseObj = courses.find(c => c.id === note.course_id);
            const courseColor = courseObj?.color || 'var(--accent-secondary)';

            return (
              <motion.div
                key={note.id}
                layout
                whileHover={{ y: -4, borderColor: 'rgba(0, 243, 255, 0.35)', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 243, 255, 0.1)' }}
                onClick={() => setActiveNote(note)}
                style={{
                  background: 'linear-gradient(180deg, rgba(20, 24, 38, 0.85) 0%, rgba(12, 15, 25, 0.9) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Indicador luminoso superior */}
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: `linear-gradient(90deg, transparent, ${courseColor}, transparent)`,
                  }}
                />

                {/* Fila superior: Materia + Fecha + Acciones */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span 
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: courseColor,
                        boxShadow: `0 0 8px ${courseColor}`,
                      }}
                    />
                    <span 
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: courseColor,
                      }}
                    >
                      {courseObj?.name || 'General'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} />
                      {formatNoteDate(note.updated_at)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(note.id);
                      }}
                      title="Eliminar apunte"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.3)',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4d4d'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Título */}
                <h3 
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    lineHeight: 1.35,
                    wordBreak: 'break-word',
                  }}
                >
                  {sanitizeNoteInput(note.title)}
                </h3>

                {/* Extracto de Contenido */}
                <p 
                  style={{
                    margin: 0,
                    fontSize: '0.84rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {sanitizeNoteInput(note.content).trim() ? sanitizeNoteInput(note.content) : 'Sin notas escritas aún. Haz clic para abrir el editor.'}
                </p>

                {/* Tags y footer de tarjeta */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {Array.isArray(note.tags) && note.tags.slice(0, 2).map(tag => (
                      <span 
                        key={tag}
                        style={{
                          fontSize: '0.67rem',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Edit3 size={12} />
                    <span>Abrir</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL CONFIRMAR ELIMINACIÓN ─── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1200,
              background: 'rgba(5, 7, 14, 0.75)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '420px',
                background: 'rgba(20, 24, 38, 0.96)',
                border: '1px solid rgba(255, 77, 77, 0.35)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 77, 77, 0.15)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                ¿Eliminar este apunte?
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Esta acción borrará el apunte y sus notas de estudio de forma permanente.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(deleteConfirmId)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    background: '#ff4d4d',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(255, 77, 77, 0.4)',
                  }}
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── EDITOR DE APUNTE (DRAWER / MODAL CYBER LUXE) ─── */}
      <AnimatePresence>
        {activeNote && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1150,
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'rgba(5, 7, 14, 0.75)',
              backdropFilter: 'blur(12px)',
            }}
            onClick={() => setActiveNote(null)}
          >
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '680px',
                height: '100%',
                background: 'linear-gradient(180deg, rgba(16, 20, 32, 0.98) 0%, rgba(10, 12, 20, 0.99) 100%)',
                borderLeft: '1px solid rgba(0, 243, 255, 0.22)',
                boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Highlight top line */}
              <div 
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, height: '3px',
                  background: 'linear-gradient(90deg, #00f3ff, #bc13fe)',
                  boxShadow: '0 0 16px rgba(0, 243, 255, 0.6)',
                }}
              />

              {/* Cabecera del Editor */}
              <div 
                style={{
                  padding: '20px 24px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  background: 'rgba(255, 255, 255, 0.015)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveNote(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    title="Volver"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Editor de Apunte
                  </span>
                </div>

                {/* Sincronización + Botón Guardar / Listo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span 
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: editorSaveStatus === 'saving' 
                        ? 'var(--accent-primary)' 
                        : editorSaveStatus === 'saved' 
                        ? '#10b981' 
                        : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    {editorSaveStatus === 'saving' && <RefreshCw size={11} className="animate-spin" />}
                    {editorSaveStatus === 'saving' && 'Guardando...'}
                    {editorSaveStatus === 'saved' && 'Guardado ✓'}
                    {editorSaveStatus === 'idle' && 'Sincronizado'}
                  </span>

                  <button
                    type="button"
                    onClick={handleManualSaveEditor}
                    style={{
                      background: 'rgba(0, 243, 255, 0.08)',
                      border: '1px solid rgba(0, 243, 255, 0.3)',
                      color: 'var(--accent-primary)',
                      borderRadius: '8px',
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Guardar
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveNote(null)}
                    aria-label="Cerrar editor"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Contenido del Editor */}
              <div 
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                {/* Selector de Materia */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Asignatura:
                  </span>
                  <select
                    value={activeNote.course_id || ''}
                    onChange={(e) => handleEditorFieldChange('course_id', e.target.value || null)}
                    style={{
                      background: 'rgba(10, 12, 20, 0.7)',
                      border: '1px solid rgba(0, 243, 255, 0.25)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">General (Sin Materia)</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Título Editable */}
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => handleEditorFieldChange('title', e.target.value)}
                  placeholder="Título del apunte o tema de clase..."
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    outline: 'none',
                    padding: '8px 0',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderBottomColor = 'var(--accent-primary)'; }}
                  onBlur={(e) => { e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.1)'; }}
                />

                {/* Barra de Herramientas de Snippets */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: '💡 Idea', prefix: '💡 ' },
                    { label: '• Viñeta', prefix: '• ' },
                    { label: '1. Lista', prefix: '1. ' },
                    { label: '[ ] Tarea', prefix: '- [ ] ' },
                    { label: '**Negrita**', prefix: '**', suffix: '**' },
                    { label: '`Fórmula`', prefix: '`', suffix: '`' },
                    { label: '🔗 Enlace', prefix: '🔗 [Texto](' , suffix: ')' },
                  ].map(snip => (
                    <button
                      key={snip.label}
                      type="button"
                      onClick={() => insertSnippetAtCursor(snip.prefix, snip.suffix || '')}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'rgba(0, 243, 255, 0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
                    >
                      {snip.label}
                    </button>
                  ))}
                </div>

                {/* Textarea Principal de Notas */}
                <div style={{ flex: 1, minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
                  <textarea
                    ref={editorTextareaRef}
                    value={activeNote.content}
                    onChange={(e) => handleEditorFieldChange('content', e.target.value)}
                    placeholder="Escribe aquí tus fórmulas, teoremas, explicaciones del profesor, enlaces y notas completas..."
                    style={{
                      flex: 1,
                      width: '100%',
                      minHeight: '340px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(188, 19, 254, 0.2)',
                      borderRadius: '16px',
                      padding: '16px 18px',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.92rem',
                      lineHeight: 1.6,
                      outline: 'none',
                      resize: 'none',
                      boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent-secondary)';
                      e.target.style.boxShadow = 'inset 0 2px 10px rgba(0, 0, 0, 0.3), 0 0 16px rgba(188, 19, 254, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(188, 19, 254, 0.2)';
                      e.target.style.boxShadow = 'inset 0 2px 10px rgba(0, 0, 0, 0.3)';
                    }}
                  />
                </div>

                {/* Footer del Editor: Estadísticas y Botón Eliminar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  <span>
                    {activeNote.content.length} caracteres · {activeNote.content.trim() ? activeNote.content.trim().split(/\s+/).length : 0} palabras
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(activeNote.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ff4d4d',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Eliminar apunte</span>
                  </button>
                </div>
              </div>

              {/* Pie con botón de cierre */}
              <div 
                style={{
                  padding: '14px 24px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(10, 12, 20, 0.85)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  CampusFlow Notes Engine · Auto-Sync
                </span>
                <button
                  type="button"
                  onClick={() => setActiveNote(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-primary)',
                    borderRadius: '10px',
                    padding: '7px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

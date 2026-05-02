import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause, RotateCcw, Music, Volume2, VolumeX, Square, ChevronDown, Check, Target, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';

const STUDY_METHODS = {
  pomodoro: {
    id: 'pomodoro',
    title: 'Pomodoro clásico',
    shortLabel: 'Clásico',
    description: '25 min enfoque · 5 min descanso · descanso largo',
    defaultMode: 'focus',
    modes: {
      focus: { labelKey: 'focusMode', color: 'var(--accent-primary)', defaultTime: 25 * 60 },
      shortBreak: { labelKey: 'shortBreak', color: 'var(--accent-lime)', defaultTime: 5 * 60 },
      longBreak: { labelKey: 'longBreak', color: 'var(--accent-secondary)', defaultTime: 15 * 60 },
    }
  },
  deepWork: {
    id: 'deepWork',
    title: 'Enfoque profundo',
    shortLabel: 'Profundo',
    description: '50 min enfoque · 10 min descanso',
    defaultMode: 'focus',
    modes: {
      focus: { labelKey: 'focusMode', color: 'var(--accent-primary)', defaultTime: 50 * 60 },
      break: { labelKey: 'shortBreak', labelOverride: 'Descanso', color: 'var(--accent-lime)', defaultTime: 10 * 60 },
    }
  }
};

const Pomodoro = () => {
  const location = useLocation();
  const incomingBlock = location.state?.sourceBlock;
  const [activePlannerBlock, setActivePlannerBlock] = useState(incomingBlock || null);

  const { user } = useAuth();
  const { tasks } = useTasks(user?.id);
  const { t, addXP, incrementStat } = useSettings();
  
  const [selectedStudyMethod, setSelectedStudyMethod] = useState('pomodoro');
  const [mode, setMode] = useState(STUDY_METHODS['pomodoro'].defaultMode);
  const [isActive, setIsActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [customTimes, setCustomTimes] = useState({
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  });
  
  const [timeLeft, setTimeLeft] = useState(customTimes.focus);
  const [editMinutes, setEditMinutes] = useState(25);

  // Estados para Ambiente Sonoro
  const audioRef = useRef(null);
  const [ambientSound, setAmbientSound] = useState('');
  const [volume, setVolume] = useState(0.5);
  const [customAudioUrl, setCustomAudioUrl] = useState(null);
  const [isSoundDropdownOpen, setIsSoundDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Estados para Objetivo de Estudio
  const pendingTasks = tasks.filter(t => t.status === 'sin entregar' || t.status === 'en proceso');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const taskDropdownRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsSoundDropdownOpen(false);
      }
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(e.target)) {
        setIsTaskDropdownOpen(false);
      }
    };
    if (isSoundDropdownOpen || isTaskDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSoundDropdownOpen, isTaskDropdownOpen]);

  const SOUNDSCAPES = [
    { id: 'lofi',    label: '🎧 Lofi Hip-Hop (Flujo y Calma)', src: '/sounds/lofi.mp3' },
    { id: 'rain',    label: '🌧️ Lluvia en Ventana (Antiestrés)', src: '/sounds/rain.mp3' },
    { id: 'white',   label: '⚪ Ruido Blanco (Bloqueo Total)', src: '/sounds/white.mp3' },
    { id: 'alpha',   label: '🧠 Ondas Alfa (Aprendizaje y Memoria)', src: '/sounds/alpha.mp3' },
    { id: 'gamma',   label: '⚡ Ondas Gamma (Lógica y Complejidad)', src: '/sounds/gamma.mp3' },
    { id: 'freq432', label: '🧘 Frecuencia 432 Hz (Armonía y Paz)', src: '/sounds/freq432.mp3' },
  ];

  const modeConfig = STUDY_METHODS[selectedStudyMethod].modes;

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      
      if (mode === 'focus') {
        addXP(50);
        incrementStat('pomodorosCompleted');
      }
      
      if (Notification.permission === 'granted') {
        new Notification('¡Fase completada!', { body: t[modeConfig[mode].labelKey] });
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, t, addXP, incrementStat, modeConfig]);

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  // Controlar el reproductor de audio al cambiar de ambiente
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load(); // Forzar carga del nuevo archivo
      if (isActive && ambientSound) {
        audioRef.current.play().catch(e => console.log('Autoplay blocked', e));
      }
    }
  }, [ambientSound, customAudioUrl]);

  // Controlar reproductor al pausar/despausar el pomodoro
  useEffect(() => {
    if (audioRef.current) {
      if (isActive && ambientSound) {
        audioRef.current.play().catch(e => console.log('Autoplay blocked', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isActive]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        alert("Por favor selecciona un archivo de audio (MP3, WAV, OGG, M4A).");
        e.target.value = null;
        return;
      }
      const url = URL.createObjectURL(file);
      setCustomAudioUrl(url);
      setAmbientSound('custom');
    }
    e.target.value = null; // Fix upload cache bug
  };

  const toggleTimer = () => {
    if (isEditing) saveEdit();
    setIsActive(p => !p);
  };
  
  const resetTimer = () => { 
    setIsActive(false); 
    setTimeLeft(customTimes[mode]); 
  };
  
  const changeMode = (m) => { 
    setIsActive(false); 
    setIsEditing(false);
    setMode(m); 
    setTimeLeft(customTimes[m]); 
  };

  const changeMethod = (methodId) => {
    const method = STUDY_METHODS[methodId];
    setSelectedStudyMethod(methodId);
    setMode(method.defaultMode);
    
    const newTimes = Object.keys(method.modes).reduce((acc, key) => {
      acc[key] = method.modes[key].defaultTime;
      return acc;
    }, {});
    
    setCustomTimes(newTimes);
    setTimeLeft(newTimes[method.defaultMode]);
    setIsActive(false);
    setIsEditing(false);
  };

  const startEdit = () => {
    if (isActive) setIsActive(false);
    setEditMinutes(Math.floor(customTimes[mode] / 60));
    setIsEditing(true);
  };

  const saveEdit = () => {
    const newSeconds = Math.max(1, editMinutes) * 60;
    setCustomTimes(prev => ({ ...prev, [mode]: newSeconds }));
    setTimeLeft(newSeconds);
    setIsEditing(false);
  };

  const currentTotalTime = customTimes[mode];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((currentTotalTime - timeLeft) / currentTotalTime) * 100;
  const color = modeConfig[mode].color;

  return (
    <div className="animate-fade-in" style={{ 
      height: '100%', 
      minHeight: '80vh',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px', 
      position: 'relative' 
    }}>
      
      {/* Encabezado Premium Integrado */}
      <div className="glass-panel" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '24px', 
        borderRadius: 'var(--radius-xl)', 
        background: 'var(--bg-glass)', 
        border: '1px solid var(--border-glass-top)', 
        boxShadow: '0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
        marginBottom: '24px', 
        width: '100%', 
        maxWidth: '460px',
        gap: '20px',
        position: 'relative'
      }}>
        {/* Glow sutil de fondo */}
        <div style={{ position: 'absolute', top: '-60%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle at 50% 0%, var(--accent-primary) 0%, transparent 60%)', opacity: 0.06, pointerEvents: 'none' }} />

        {/* Título y Descripción con Etiqueta Superior */}
        <div style={{ textAlign: 'center', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            fontSize: '0.65rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.15em', 
            fontWeight: 800, 
            color: 'var(--accent-primary)', 
            opacity: 0.9,
            background: 'var(--bg-secondary)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255,255,255,0.03)',
            marginBottom: '4px',
            display: 'inline-block'
          }}>
            Método de Estudio
          </div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 800, 
            fontFamily: 'var(--font-display)', 
            color: 'var(--text-primary)', 
            margin: 0, 
            letterSpacing: '0.01em',
            textShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            {STUDY_METHODS[selectedStudyMethod].title}
          </h1>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)', 
            fontFamily: 'var(--font-body)', 
            fontWeight: 500, 
            margin: 0,
            opacity: 0.85
          }}>
            {STUDY_METHODS[selectedStudyMethod].description}
          </p>
        </div>

        {/* Selector de Método - Simple y Estable */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px',
          width: '100%',
          zIndex: 1,
          marginTop: '4px'
        }}>
          {Object.values(STUDY_METHODS).map(method => {
            const isSelected = selectedStudyMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => changeMethod(method.id)}
                style={{
                  padding: '12px 8px',
                  borderRadius: '10px',
                  background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: isSelected ? '#000' : 'var(--text-primary)',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass-top)',
                  fontSize: '0.85rem',
                  letterSpacing: '0.02em',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  outline: 'none',
                  boxShadow: isSelected ? '0 4px 15px rgba(0,0,0,0.2)' : '0 2px 5px rgba(0,0,0,0.05)'
                }}
              >
                {method.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selector de modo */}
      <div className="glass-panel" style={{ display: 'flex', gap: '4px', padding: '6px', borderRadius: 'var(--radius-full)', marginBottom: '20px', border: '1px solid var(--border-glass-top)' }}>
        {Object.entries(modeConfig).map(([k, cfg]) => (
          <button key={k} onClick={() => changeMode(k)} className="btn" style={{
            background: mode === k ? cfg.color : 'transparent',
            color: mode === k ? '#000' : 'var(--text-secondary)',
            padding: '6px 16px',
            fontWeight: mode === k ? 700 : 500,
            boxShadow: mode === k ? `0 0 20px ${cfg.color}` : 'none',
            border: 'none',
            fontSize: '0.75rem',
            transition: 'all 0.3s var(--ease-out-quint)',
          }}>
            {cfg.labelOverride || t[cfg.labelKey]}
          </button>
        ))}
      </div>

      {/* Estado Actual - 'Respirando' justo encima del reloj */}
      <div className={isActive ? 'animate-pulse-subtle' : ''} style={{ 
        background: isActive ? color : 'rgba(255,255,255,0.05)', 
        color: isActive ? '#000' : 'var(--text-secondary)', 
        padding: '6px 20px', 
        borderRadius: 'var(--radius-full)', 
        fontSize: '0.7rem', 
        fontFamily: 'var(--font-display)', 
        fontWeight: 950, 
        letterSpacing: '0.25em', 
        marginBottom: '-4px', 
        textTransform: 'uppercase',
        border: isActive ? `1.5px solid ${color}` : '1px solid var(--border-glass-top)',
        boxShadow: isActive ? `0 0 20px ${color}` : 'none',
        transition: 'all 0.5s var(--ease-out-expo)',
        transform: isActive ? 'scale(1.02)' : 'scale(1)',
        zIndex: 10,
        backdropFilter: 'blur(8px)',
        animation: isActive ? 'pulseSubtle 2s ease-in-out infinite' : 'none'
      }}>
        {isActive ? t.activeStatus : (isEditing ? 'EDITANDO' : t.pausedStatus)}
      </div>

      {/* Área del Reloj Activo - Espaciado Garantizado */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', width: '100%' }}>
        
        {/* Reloj de Arena (Hourglass) */}
        <div 
          className={isActive ? 'animate-pulse-subtle' : ''} 
          style={{ 
            position: 'relative', 
            width: '260px', 
            height: '320px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'all 0.8s var(--ease-out-quint)'
          }}
        >
          <svg width="240" height="320" viewBox="0 0 240 320" style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 0 15px ${color})` }}>
            <defs>
              <clipPath id="topClip">
                <rect x="0" y={20 + (130 * (progress / 100))} width="240" height={130 * (1 - (progress / 100))} />
              </clipPath>
              <clipPath id="bottomClip">
                <rect x="0" y={290 - (130 * (progress / 100))} width="240" height={130 * (progress / 100)} />
              </clipPath>
            </defs>
            <path d="M 40,30 L 200,30 C 200,100 150,140 120,160 C 90,140 40,100 40,30 Z" stroke={color} strokeWidth="4" fill="none" opacity="0.25" strokeLinejoin="round" />
            <path d="M 120,160 C 90,180 40,220 40,290 L 200,290 C 200,220 150,180 120,160 Z" stroke={color} strokeWidth="4" fill="none" opacity="0.25" strokeLinejoin="round" />
            <path d="M 40,30 L 200,30 C 200,100 150,140 120,160 C 90,140 40,100 40,30 Z" stroke={color} strokeWidth="1" fill="rgba(255,255,255,0.02)" strokeLinejoin="round" />
            <path d="M 120,160 C 90,180 40,220 40,290 L 200,290 C 200,220 150,180 120,160 Z" stroke={color} strokeWidth="1" fill="rgba(255,255,255,0.02)" strokeLinejoin="round" />
            <path clipPath="url(#topClip)" d="M 40,30 L 200,30 C 200,100 150,140 120,160 C 90,140 40,100 40,30 Z" fill={color} opacity="0.9" style={{ transition: 'all 1s linear' }} />
            <path clipPath="url(#bottomClip)" d="M 120,160 C 90,180 40,220 40,290 L 200,290 C 200,220 150,180 120,160 Z" fill={color} opacity="0.9" style={{ transition: 'all 1s linear' }} />
            {isActive && progress < 100 && (
              <line x1="120" y1="160" x2="120" y2={290 - (130 * (progress / 100))} stroke={color} strokeWidth="2" strokeDasharray="4 4" className="falling-sand" style={{ transition: 'y2 1s linear' }} />
            )}
            <line x1="30" y1="30" x2="210" y2="30" stroke={color} strokeWidth="6" strokeLinecap="round" />
            <line x1="30" y1="290" x2="210" y2="290" stroke={color} strokeWidth="6" strokeLinecap="round" />
          </svg>

          <div style={{ zIndex: 2, background: 'var(--bg-glass)', padding: '12px 28px', borderRadius: '20px', border: `1px solid ${color}44`, backdropFilter: 'blur(8px)', boxShadow: `0 4px 20px rgba(0,0,0,0.1), inset 0 0 10px ${color}11` }}>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="number" value={editMinutes} onChange={(e) => setEditMinutes(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  style={{ width: '80px', background: 'transparent', border: 'none', borderBottom: `2px solid ${color}`, color: '#fff', fontSize: '3rem', fontFamily: 'var(--font-display)', fontWeight: 800, textAlign: 'center', outline: 'none' }}
                  autoFocus min="1" max="120" />
                <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>min</span>
              </div>
            ) : (
              <button onClick={startEdit} style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', padding: 0 }} title="Click para editar tiempo">
                <span style={{ fontSize: '4.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '4px', color: '#fff', textShadow: `0 0 20px ${color}` }}>
                  {String(minutes).padStart(2, '0')}
                  <span style={{ opacity: isActive ? 1 : 0.5, animation: isActive ? 'blink 2s infinite' : 'none' }}>:</span>
                  {String(seconds).padStart(2, '0')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Controles Principales */}
        <div style={{ position: 'relative', width: '280px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
          <button 
            className="btn-icon click-press" 
            onClick={resetTimer} 
            aria-label="Reiniciar" 
            title="Reiniciar" 
            style={{ 
              position: 'absolute', left: '20px', width: '50px', height: '50px', 
              background: 'var(--bg-glass)',
              border: `1px solid var(--border-glass-top)`,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.4s var(--ease-out-expo)',
              boxShadow: `0 4px 15px rgba(0,0,0,0.1), inset 0 0 8px rgba(255,255,255,0.05)`,
              zIndex: 15,
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
              backdropFilter: 'blur(8px)'
            }}
            onMouseOver={e => { e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.15), inset 0 0 12px rgba(255,255,255,0.08)`; e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.border = `1px solid ${color}55`; }}
            onMouseOut={e => { e.currentTarget.style.boxShadow = `0 4px 15px rgba(0,0,0,0.1), inset 0 0 8px rgba(255,255,255,0.05)`; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.border = `1px solid var(--border-glass-top)`; }}
          >
            <RotateCcw size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>

          <button 
            onClick={toggleTimer} 
            aria-label={isActive ? 'Pausar' : 'Iniciar'} 
            className="click-press"
            style={{
              width: '80px', height: '80px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? 'var(--bg-glass)' : color,
              color: isActive ? color : '#000',
              border: isActive ? `2px solid ${color}` : `1px solid ${color}`,
              boxShadow: isActive ? `0 0 30px ${color}33, inset 0 0 20px ${color}22` : `0 10px 30px ${color}55`,
              cursor: 'pointer',
              transition: 'all 0.5s var(--ease-out-expo)',
              outline: 'none',
              zIndex: 20,
              backdropFilter: isActive ? 'blur(10px)' : 'none'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = isActive ? `0 0 40px ${color}55, inset 0 0 25px ${color}33` : `0 15px 40px ${color}77`; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = isActive ? `0 0 30px ${color}33, inset 0 0 20px ${color}22` : `0 10px 30px ${color}55`; }}
          >
            {isActive ? <Pause size={34} /> : <Play size={34} style={{ marginLeft: '4px' }} />}
          </button>
        </div>
      </div>

      {/* Contenedor de Widgets Inferiores */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', width: '100%', maxWidth: '800px', justifyContent: 'center', marginTop: '20px' }}>
        
        {/* Widget Objetivo de Estudio */}
        <div className="glass-panel" style={{
          padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '16px', 
          width: '100%', maxWidth: '380px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass-top)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.08)', position: 'relative'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)', opacity: 0.4, borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Objetivo de Estudio</span>
            </div>
          </div>
          
          {activePlannerBlock ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'rgba(0, 243, 255, 0.08)', borderRadius: '12px', border: '1px solid rgba(0, 243, 255, 0.25)', boxShadow: 'inset 0 0 15px rgba(0, 243, 255, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 850, padding: '4px 8px', background: 'rgba(0, 243, 255, 0.15)', borderRadius: '999px', border: '1px solid rgba(0, 243, 255, 0.3)' }}>Bloque Planificado Activo</span>
                <button 
                  onClick={() => setActivePlannerBlock(null)}
                  className="click-press"
                  title="Desvincular bloque"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-danger)'; e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1.2 }}>{activePlannerBlock.title}</div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {activePlannerBlock.duration_minutes && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      ⏱ {activePlannerBlock.duration_minutes} min
                    </span>
                  )}
                  {activePlannerBlock.status && (
                    <span style={{ fontSize: '0.75rem', color: activePlannerBlock.status === 'en_proceso' ? 'var(--accent-primary)' : activePlannerBlock.status === 'completado' ? 'var(--accent-lime)' : 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600, textTransform: 'capitalize' }}>
                      Estado: {activePlannerBlock.status.replace('_', ' ')}
                    </span>
                  )}
                  {activePlannerBlock.day && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600, textTransform: 'capitalize' }}>
                      Día: {activePlannerBlock.day}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div ref={taskDropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsTaskDropdownOpen(prev => !prev)}
                  style={{
                    width: '100%', padding: '10px 14px', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
                    background: 'var(--bg-secondary)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid var(--border-glass-top)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                    transition: 'all 0.2s ease', outline: 'none',
                    boxShadow: isTaskDropdownOpen ? '0 0 12px rgba(0, 243, 255, 0.15)' : 'none'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedTaskId === '' ? '🎯 Sin objetivo' : (pendingTasks.find(t => t.id === selectedTaskId)?.title || '🎯 Sin objetivo')}
                  </span>
                  <ChevronDown size={16} style={{ flexShrink: 0, transition: 'transform 0.2s ease', transform: isTaskDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.6 }} />
                </button>

                {isTaskDropdownOpen && (
                  <div className="animate-fade-in" style={{
                    marginTop: '8px', position: 'absolute', width: '100%', zIndex: 50,
                    background: 'var(--bg-glass)', backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(0, 243, 255, 0.2)', 
                    borderRadius: 'var(--radius-md)', boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), inset 0 0 12px rgba(0, 243, 255, 0.06)',
                    padding: '6px', maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px'
                  }}>
                    {pendingTasks.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No tienes trabajos pendientes para enfocar ahora.
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setSelectedTaskId(''); setIsTaskDropdownOpen(false); }}
                          style={{
                            width: '100%', padding: '10px 12px', border: 'none', borderRadius: '8px',
                            background: selectedTaskId === '' ? 'rgba(0, 243, 255, 0.08)' : 'transparent',
                            color: selectedTaskId === '' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontSize: '0.85rem', fontFamily: 'var(--font-body)', fontWeight: selectedTaskId === '' ? 700 : 500,
                            cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s ease', outline: 'none',
                            border: selectedTaskId === '' ? '1px solid rgba(0, 243, 255, 0.2)' : '1px solid transparent'
                          }}
                          onMouseEnter={e => { if (selectedTaskId !== '') e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                          onMouseLeave={e => { if (selectedTaskId !== '') e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎯 Sin objetivo</span>
                          {selectedTaskId === '' && <Check size={16} style={{ opacity: 0.9, flexShrink: 0 }} />}
                        </button>

                        {pendingTasks.map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setSelectedTaskId(t.id); setIsTaskDropdownOpen(false); }}
                            style={{
                              width: '100%', padding: '10px 12px', border: 'none', borderRadius: '8px',
                              background: selectedTaskId === t.id ? 'rgba(0, 243, 255, 0.08)' : 'transparent',
                              color: selectedTaskId === t.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                              cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                              transition: 'all 0.2s ease', outline: 'none',
                              border: selectedTaskId === t.id ? '1px solid rgba(0, 243, 255, 0.2)' : '1px solid transparent'
                            }}
                            onMouseEnter={e => { if (selectedTaskId !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                            onMouseLeave={e => { if (selectedTaskId !== t.id) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden', flex: 1 }}>
                              <span style={{ 
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', 
                                fontSize: '0.85rem', fontWeight: selectedTaskId === t.id ? 700 : 500, fontFamily: 'var(--font-body)',
                                color: selectedTaskId === t.id ? 'var(--accent-primary)' : 'var(--text-primary)'
                              }}>
                                {t.title}
                              </span>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 500, opacity: 0.85, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {t.courses?.name && (
                                  <>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.courses.color || 'var(--text-muted)' }}>
                                      {t.courses.name}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>·</span>
                                  </>
                                )}
                                <span style={{ color: t.status === 'en proceso' ? 'var(--accent-primary)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {t.status}
                                </span>
                              </div>
                            </div>
                            {selectedTaskId === t.id && (
                              <Check size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              {!isTaskDropdownOpen && selectedTaskId !== '' && pendingTasks.find(t => t.id === selectedTaskId) && (() => {
                const t = pendingTasks.find(t => t.id === selectedTaskId);
                return (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '-4px', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    {t.courses?.name && <div style={{ fontSize: '0.75rem', color: t.courses?.color || 'var(--accent-primary)', fontWeight: 800, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.courses.name}</div>}
                    {(t.deadline || t.due_date) && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Límite: {new Date(t.deadline || t.due_date).toLocaleDateString('es-CO')}</div>}
                    <div style={{ fontSize: '0.7rem', color: t.status === 'en proceso' ? 'var(--accent-primary)' : 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Estado: {t.status}</div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Widget de Ambiente Sonoro */}
        <div className="glass-panel ambient-widget" style={{
          padding: '24px', 
          borderRadius: 'var(--radius-lg)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          width: '100%',
          maxWidth: '380px', 
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-glass-top)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
          position: 'relative'
        }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)', opacity: 0.4, borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Music size={16} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ambiente Sonoro</span>
          </div>
          
          {/* Guía Científica No Invasiva */}
          <div className="group" style={{ position: 'relative', cursor: 'pointer' }}>
            <div style={{ opacity: 0.8, transition: 'all 0.2s', color: 'var(--accent-primary)', padding: '4px' }} onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.transform = 'scale(1.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.8; e.currentTarget.style.transform = 'scale(1)'; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div className="tooltip" style={{
              position: 'absolute', bottom: '100%', right: '0', width: '240px', padding: '16px',
              background: 'var(--bg-secondary)', border: '2px solid var(--accent-primary)', borderRadius: '16px',
              fontSize: '0.8rem', color: 'var(--text-primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              visibility: 'hidden', opacity: 0, transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)', marginBottom: '12px', zIndex: 10,
              backdropFilter: 'blur(12px)'
            }}>
              <b style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '8px', fontSize: '0.9rem', borderBottom: '1px solid var(--border-glass-top)', paddingBottom: '4px' }}>🧬 Guía de Uso:</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>• <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>Alfa:</span> Memorización rápida.</div>
                <div>• <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>Gamma:</span> Lógica y problemas.</div>
                <div>• <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>432 Hz:</span> Bajar estrés y ansiedad.</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Custom Glass Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setIsSoundDropdownOpen(prev => !prev)}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-body)',
              background: 'var(--bg-secondary)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--border-glass-top)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxShadow: isSoundDropdownOpen ? '0 0 12px rgba(0, 243, 255, 0.15)' : 'none'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ambientSound === '' ? '🔇 Sin Sonido' : ambientSound === 'custom' ? '📁 Personalizado...' : (SOUNDSCAPES.find(s => s.id === ambientSound)?.label || '🔇 Sin Sonido')}
            </span>
            <ChevronDown size={16} style={{ flexShrink: 0, transition: 'transform 0.2s ease', transform: isSoundDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.6 }} />
          </button>

          {isSoundDropdownOpen && (
            <div className="animate-fade-in" style={{
              marginTop: '8px',
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(0, 243, 255, 0.2)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), inset 0 0 12px rgba(0, 243, 255, 0.06)',
              padding: '6px',
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {/* Sin Sonido */}
              <button
                onClick={() => { setAmbientSound(''); setIsSoundDropdownOpen(false); }}
                style={{
                  width: '100%', padding: '9px 12px', border: 'none', borderRadius: '8px',
                  background: ambientSound === '' ? 'rgba(0, 243, 255, 0.12)' : 'transparent',
                  color: ambientSound === '' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '0.82rem', fontFamily: 'var(--font-body)', fontWeight: ambientSound === '' ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.15s ease, color 0.15s ease', outline: 'none'
                }}
                onMouseEnter={e => { if (ambientSound !== '') e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (ambientSound !== '') e.currentTarget.style.background = 'transparent'; }}
              >
                <span>🔇 Sin Sonido</span>
                {ambientSound === '' && <Check size={14} style={{ opacity: 0.8 }} />}
              </button>

              {/* Soundscapes */}
              {SOUNDSCAPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setAmbientSound(s.id); setIsSoundDropdownOpen(false); }}
                  style={{
                    width: '100%', padding: '9px 12px', border: 'none', borderRadius: '8px',
                    background: ambientSound === s.id ? 'rgba(0, 243, 255, 0.12)' : 'transparent',
                    color: ambientSound === s.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '0.82rem', fontFamily: 'var(--font-body)', fontWeight: ambientSound === s.id ? 700 : 500,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'background 0.15s ease, color 0.15s ease', outline: 'none'
                  }}
                  onMouseEnter={e => { if (ambientSound !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { if (ambientSound !== s.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>{s.label}</span>
                  {ambientSound === s.id && <Check size={14} style={{ opacity: 0.8 }} />}
                </button>
              ))}

              {/* Personalizado */}
              <button
                onClick={() => { setAmbientSound('custom'); setIsSoundDropdownOpen(false); }}
                style={{
                  width: '100%', padding: '9px 12px', border: 'none', borderRadius: '8px',
                  background: ambientSound === 'custom' ? 'rgba(0, 243, 255, 0.12)' : 'transparent',
                  color: ambientSound === 'custom' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '0.82rem', fontFamily: 'var(--font-body)', fontWeight: ambientSound === 'custom' ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.15s ease, color 0.15s ease', outline: 'none',
                  borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '2px', paddingTop: '10px'
                }}
                onMouseEnter={e => { if (ambientSound !== 'custom') e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (ambientSound !== 'custom') e.currentTarget.style.background = 'transparent'; }}
              >
                <span>📁 Personalizado...</span>
                {ambientSound === 'custom' && <Check size={14} style={{ opacity: 0.8 }} />}
              </button>
            </div>
          )}
        </div>

        {ambientSound === 'custom' && (
          <input type="file" accept="audio/*" onChange={handleAudioUpload} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} />
        )}

        {ambientSound !== '' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            {volume === 0 ? <VolumeX size={16} color="var(--text-muted)" /> : <Volume2 size={16} color="var(--accent-primary)" />}
            <input 
              type="range" 
              min="0" max="1" step="0.05" 
              value={volume} 
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent-primary)', height: '4px' }}
            />
          </div>
        )}

        {/* Reproductor Oculto con KEY para forzar re-montaje al cambiar de sonido */}
        {(ambientSound === 'custom' ? customAudioUrl : (SOUNDSCAPES.find(s => s.id === ambientSound)?.src || '')) && (
          <audio 
            key={ambientSound}
            ref={audioRef}
            loop 
            crossOrigin="anonymous"
            src={ambientSound === 'custom' ? customAudioUrl : (SOUNDSCAPES.find(s => s.id === ambientSound)?.src || '')} 
          />
        )}
      </div>

      </div> {/* Fin del contenedor de widgets */}

    </div>
  );
};

export default Pomodoro;

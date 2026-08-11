import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause, RotateCcw, Music, Volume2, VolumeX, Square, ChevronDown, Check, Target, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { playPhaseCompleteChime, resumeAudio } from '../lib/audioService';
import { toast } from 'sonner';

const STUDY_METHODS = {
  pomodoro: {
    id: 'pomodoro',
    title: 'Pomodoro clásico',
    shortLabel: 'Clásico',
    description: '25 min enfoque · 5 min descanso · descanso largo',
    defaultMode: 'focus',
    modes: {
      focus: { labelKey: 'focusMode', color: '#00f2ff', defaultTime: 25 * 60 },
      shortBreak: { labelKey: 'shortBreak', color: '#10b981', defaultTime: 5 * 60 },
      longBreak: { labelKey: 'longBreak', color: '#a855f7', defaultTime: 15 * 60 },
    }
  },
  deepWork: {
    id: 'deepWork',
    title: 'Enfoque profundo',
    shortLabel: 'Profundo',
    description: '50 min enfoque · 10 min descanso',
    defaultMode: 'focus',
    modes: {
      focus: { labelKey: 'focusMode', color: '#00f2ff', defaultTime: 50 * 60 },
      break: { labelKey: 'shortBreak', labelOverride: 'Descanso', color: '#10b981', defaultTime: 10 * 60 },
    }
  },
  ultradian: {
    id: 'ultradian',
    title: 'Ultradiano',
    shortLabel: 'Ultradiano 90/20',
    description: '90 min enfoque · 20 min descanso',
    defaultMode: 'focus',
    modes: {
      focus: { labelKey: 'focusMode', color: '#00f2ff', defaultTime: 90 * 60 },
      break: { labelKey: 'longBreak', labelOverride: 'Descanso largo', color: '#a855f7', defaultTime: 20 * 60 },
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
  const [isHoverPlay, setIsHoverPlay] = useState(false);
  
  const [customTimes, setCustomTimes] = useState({
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  });
  
  const [timeLeft, setTimeLeft] = useState(customTimes.focus);
  const [editMinutes, setEditMinutes] = useState(25);

  // Timestamp objetivo (Date.now() + segundos restantes) en vez de solo
  // decrementar de a 1. Los navegadores ralentizan setInterval en pestañas
  // minimizadas/en segundo plano (Chrome llega a limitarlo a ~1 tick/minuto),
  // así que decrementar de a 1 por tick perdería tiempo real transcurrido.
  // Calculando siempre contra un timestamp fijo, el tiempo mostrado es
  // correcto aunque se hayan perdido ticks, y se autocorrige apenas el
  // navegador vuelve a ejecutar el interval con normalidad.
  const endTimeRef = useRef(null);

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
      // Fija (o conserva) el instante real en que debe llegar a 0. Se fija
      // una sola vez al iniciar/reanudar, no en cada tick.
      if (endTimeRef.current === null) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
      }

      const tick = () => {
        const secondsLeft = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(secondsLeft);
      };

      interval = setInterval(tick, 1000);

      // Al recuperar foco/visibilidad, recalcula de inmediato en vez de
      // esperar al siguiente tick del interval (que pudo haber sido
      // pausado por el navegador mientras la pestaña estaba oculta).
      document.addEventListener('visibilitychange', tick);
      window.addEventListener('focus', tick);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', tick);
        window.removeEventListener('focus', tick);
      };
    } else if (timeLeft === 0 && isActive) {
      setTimeout(() => {
        endTimeRef.current = null;
        setIsActive(false);
        
        if (mode === 'focus') {
          addXP(50);
          incrementStat('pomodorosCompleted');
          toast.success("¡Tiempo Cumplido!", { 
            id: "pomodoro-toast", 
            description: "+25 XP ganados en tu perfil.",
            style: { border: '1px solid rgba(168, 85, 247, 0.4)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.15)' }
          });
        } else {
          toast.success("¡Descanso Completado!", { 
            id: "pomodoro-toast", 
            description: "Volvamos a la acción.",
            style: { border: '1px solid rgba(168, 85, 247, 0.4)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.15)' }
          });
        }
        
        // Sonido de campana: se reproduce vía Web Audio API, que sigue activo
        // aunque la pestaña esté minimizada o en segundo plano (a diferencia de
        // un <audio> que algunos navegadores pueden pausar). resumeAudio()
        // se llama primero porque Chrome suspende el AudioContext hasta el
        // primer gesto del usuario; Layout.jsx ya captura ese primer gesto,
        // pero esto blinda el caso de que el contexto se haya suspendido
        // igual (p. ej. al volver de segundo plano en algunos navegadores).
        resumeAudio();
        try {
          playPhaseCompleteChime();
        } catch (err) {
          console.error('No se pudo reproducir la campana de fin de fase:', err);
        }

        // Notificación del sistema operativo: se sigue viendo/oyendo aunque el
        // usuario esté en otra app (Word, Excel, etc.) porque la gestiona el OS,
        // no la pestaña del navegador. Requiere permiso ya concedido (ver
        // efecto de abajo) y que el navegador no esté completamente cerrado.
        if (Notification.permission === 'granted') {
          new Notification('¡Fase completada!', {
            body: t[modeConfig[mode].labelKey],
            icon: '/favicon.svg',
            tag: 'campusflow-pomodoro-phase',
            silent: false
          });
        }
      }, 0);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, t, addXP, incrementStat, modeConfig]);

  // El permiso de Notification debe solicitarse cuanto antes (no solo al
  // completar la primera fase) para que, si el usuario minimiza el
  // navegador durante su primer Pomodoro, la notificación ya tenga permiso
  // concedido a tiempo.
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
  }, [ambientSound, customAudioUrl, isActive]);

  // Controlar reproductor al pausar/despausar el pomodoro
  useEffect(() => {
    if (audioRef.current) {
      if (isActive && ambientSound) {
        audioRef.current.play().catch(e => console.log('Autoplay blocked', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isActive, ambientSound]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        toast.warning("Archivo Inválido", { 
          id: "pomodoro-toast", 
          description: "Por favor selecciona un archivo de audio (MP3, WAV, OGG, M4A).",
          style: { border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)' }
        });
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
    // Al pausar, se libera el timestamp objetivo para que al reanudar el
    // efecto de arriba calcule uno nuevo a partir del timeLeft actual (en
    // vez de seguir contando desde el timestamp de la sesión anterior).
    endTimeRef.current = null;
    setIsActive(p => {
      const nextState = !p;
      if (nextState) {
        toast.success("Enfoque Iniciado", { 
          id: "pomodoro-toast", 
          description: "Cero distracciones activadas.",
          style: { border: '1px solid rgba(6, 182, 212, 0.4)', boxShadow: '0 0 20px rgba(6, 182, 212, 0.15)' }
        });
      } else {
        toast.warning("Temporizador Pausado", { 
          id: "pomodoro-toast", 
          description: "Progreso detenido.",
          style: { border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)' }
        });
      }
      return nextState;
    });
  };
  
  const resetTimer = () => { 
    endTimeRef.current = null;
    setIsActive(false); 
    setTimeLeft(customTimes[mode]); 
    toast.warning("Temporizador Reiniciado", { 
      id: "pomodoro-toast", 
      description: "El tiempo vuelve a empezar.",
      style: { border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)' }
    });
  };
  
  const changeMode = (m) => { 
    endTimeRef.current = null;
    setIsActive(false); 
    setIsEditing(false);
    setMode(m); 
    setTimeLeft(customTimes[m]); 
  };

  const changeMethod = (methodId) => {
    endTimeRef.current = null;
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
    endTimeRef.current = null;
    setEditMinutes(Math.floor(customTimes[mode] / 60));
    setIsEditing(true);
  };

  const saveEdit = () => {
    endTimeRef.current = null;
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

  const radius = 140;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="animate-fade-in pomodoro-page" style={{ 
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'clamp(16px, 3vw, 32px)',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* ─── BARRA DE CONTROL SUPERIOR ESTILO GLASSMORPHISM ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', flexShrink: 0, zIndex: 10, width: '100%' }}>
        {/* Método */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px', 
          borderRadius: '24px', background: 'rgba(10, 12, 20, 0.4)', 
          border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          {Object.values(STUDY_METHODS).map(method => {
            const isSelected = selectedStudyMethod === method.id;
            return (
              <button key={method.id} onClick={() => changeMethod(method.id)} style={{
                padding: '8px 16px', borderRadius: '20px',
                background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)',
                border: isSelected ? `1px solid ${color}40` : '1px solid transparent',
                fontSize: '0.75rem', fontWeight: isSelected ? 700 : 500, letterSpacing: '0.05em',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none',
                boxShadow: isSelected ? `0 0 20px ${color}15, inset 0 0 10px ${color}10` : 'none',
                textShadow: isSelected ? `0 0 8px ${color}60` : 'none'
              }}>
                {method.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Modos */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px', 
          borderRadius: '24px', background: 'rgba(10, 12, 20, 0.4)', 
          border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          {Object.entries(modeConfig).map(([k, cfg]) => {
            const isSelected = mode === k;
            return (
              <button key={k} onClick={() => changeMode(k)} style={{
                background: isSelected ? `${cfg.color}15` : 'transparent',
                color: isSelected ? cfg.color : 'rgba(255,255,255,0.5)',
                padding: '8px 16px', fontWeight: isSelected ? 700 : 500, letterSpacing: '0.05em',
                boxShadow: isSelected ? `0 0 20px ${cfg.color}20, inset 0 0 12px ${cfg.color}15` : 'none',
                border: isSelected ? `1px solid ${cfg.color}50` : '1px solid transparent',
                fontSize: '0.75rem', borderRadius: '20px',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none',
                textShadow: isSelected ? `0 0 12px ${cfg.color}60` : 'none'
              }}>
                {cfg.labelOverride || t[cfg.labelKey]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── CENTRO: Anillo de Progreso + Controles ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '40px', minHeight: 0, width: '100%' }}>
        
        {/* Anillo y Tiempo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* SVG Ring */}
          <svg
            height={radius * 2}
            width={radius * 2}
            style={{ 
              transform: 'rotate(-90deg)', 
              filter: isActive ? `drop-shadow(0 0 16px ${color}60)` : 'drop-shadow(0 0 4px rgba(0,0,0,0.3))',
              transition: 'all 0.5s ease'
            }}
          >
            {/* Background Circle */}
            <circle
              stroke="rgba(255,255,255,0.05)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {/* Progress Circle */}
            <circle
              stroke={color}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ 
                strokeDashoffset, 
                transition: isActive ? 'stroke-dashoffset 1s linear, stroke 0.5s ease' : 'stroke 0.5s ease',
                strokeLinecap: 'round'
              }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          
          {/* Digits Center */}
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase',
              color: isActive ? color : 'var(--text-secondary)',
              textShadow: isActive ? `0 0 12px ${color}80` : 'none',
              marginBottom: '8px', transition: 'all 0.3s ease'
            }}>
              {isActive ? t.activeStatus : (isEditing ? 'EDITANDO' : t.pausedStatus)}
            </div>
            
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="number" value={editMinutes} onChange={(e) => setEditMinutes(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  style={{ 
                    width: '120px', background: 'transparent', border: 'none', borderBottom: `2px solid ${color}`, 
                    color: '#fff', fontSize: '4.5rem', fontFamily: 'var(--font-display)', fontWeight: 300, 
                    textAlign: 'center', outline: 'none' 
                  }}
                  autoFocus min="1" max="120" />
              </div>
            ) : (
              <button onClick={startEdit} style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', padding: 0 }} title="Click para editar tiempo">
                <span style={{ 
                  fontSize: 'clamp(4rem, 8vh, 5.5rem)', fontWeight: 200, fontFamily: 'var(--font-display)', 
                  letterSpacing: '-2px', color: '#fff', 
                  textShadow: isActive ? `0 0 20px ${color}40, 0 0 40px ${color}20` : '0 4px 20px rgba(0,0,0,0.5)',
                  lineHeight: 1
                }}>
                  {String(minutes).padStart(2, '0')}
                  <span style={{ opacity: isActive ? 1 : 0.5, animation: isActive ? 'blink 2s infinite' : 'none', margin: '0 -4px' }}>:</span>
                  {String(seconds).padStart(2, '0')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Controles (Reset + Play) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <button className="click-press" onClick={resetTimer} aria-label="Reiniciar" title="Reiniciar" style={{ 
            width: '52px', height: '52px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', outline: 'none', backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'scale(1)'; }}>
            <RotateCcw size={22} style={{ color: 'var(--text-secondary)' }} />
          </button>
          
          <button onClick={toggleTimer} 
            onMouseEnter={() => setIsHoverPlay(true)}
            onMouseLeave={() => setIsHoverPlay(false)}
            aria-label={isActive ? 'Pausar' : 'Iniciar'} className="click-press" style={{
            width: '80px', height: '80px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isActive ? 'rgba(10, 12, 20, 0.4)' : color,
            color: isActive ? color : '#000',
            border: isActive ? `2px solid ${color}` : '1px solid transparent',
            boxShadow: isHoverPlay ? (isActive ? `0 0 30px ${color}60` : `0 0 40px ${color}`) : (isActive ? `0 0 20px ${color}40` : `0 10px 30px ${color}50`),
            cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', outline: 'none',
            backdropFilter: isActive ? 'blur(12px)' : 'none'
          }}>
            {isActive ? <Pause size={34} /> : <Play size={34} style={{ transform: 'translateX(3px)' }} />}
          </button>

          {/* Spacer to keep Play button perfectly centered. The reset button takes 52px width + 32px gap = 84px. */}
          <div style={{ width: '52px', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* ─── FILA INFERIOR: Tarjetas Objetivo y Ambiente ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', width: '100%', maxWidth: '900px', flexShrink: 0, zIndex: 10 }}>
        
        {/* Widget Objetivo de Estudio */}
        <div style={{
          padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', 
          background: 'rgba(10, 12, 20, 0.5)', border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.2)', backdropFilter: 'blur(24px)',
          height: '100%', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Objetivo de Estudio</span>
            </div>
          </div>
          
          {activePlannerBlock ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'rgba(255,255,255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.65rem', color: color, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 850, padding: '4px 10px', background: `${color}15`, borderRadius: '999px', border: `1px solid ${color}30` }}>Bloque Activo</span>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}>
                <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1.3 }}>{activePlannerBlock.title}</div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {activePlannerBlock.duration_minutes && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', fontWeight: 600 }}>
                      ⏱ {activePlannerBlock.duration_minutes} min
                    </span>
                  )}
                  {activePlannerBlock.status && (
                    <span style={{ fontSize: '0.75rem', color: activePlannerBlock.status === 'en_proceso' ? color : activePlannerBlock.status === 'completado' ? 'var(--accent-lime)' : 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', fontWeight: 600, textTransform: 'capitalize' }}>
                      {activePlannerBlock.status.replace('_', ' ')}
                    </span>
                  )}
                  {activePlannerBlock.day && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', fontWeight: 600, textTransform: 'capitalize' }}>
                      {activePlannerBlock.day}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
              <div ref={taskDropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsTaskDropdownOpen(prev => !prev)}
                  style={{
                    width: '100%', padding: '14px 16px', fontSize: '0.9rem', fontFamily: 'var(--font-body)', fontWeight: 600,
                    background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: 'var(--text-primary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                    transition: 'all 0.2s ease', outline: 'none',
                    boxShadow: isTaskDropdownOpen ? `0 0 16px ${color}20` : 'none'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedTaskId === '' ? '🎯 Sin objetivo' : (pendingTasks.find(t => t.id === selectedTaskId)?.title || '🎯 Sin objetivo')}
                  </span>
                  <ChevronDown size={18} style={{ flexShrink: 0, transition: 'transform 0.2s ease', transform: isTaskDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.6 }} />
                </button>

                {isTaskDropdownOpen && (
                  <div className="animate-fade-in" style={{
                    position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '8px', zIndex: 10000,
                    background: 'rgba(15, 17, 26, 0.95)', backdropFilter: 'blur(24px) saturate(200%)',
                    border: `1px solid ${color}40`, borderRadius: '16px', 
                    boxShadow: `0 -12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0,0,0,0.4), inset 0 0 20px ${color}10`,
                    padding: '8px', maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px'
                  }}>
                    {pendingTasks.length === 0 ? (
                      <div style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No tienes trabajos pendientes para enfocar ahora.
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setSelectedTaskId(''); setIsTaskDropdownOpen(false); }}
                          style={{
                            width: '100%', padding: '12px 14px', borderRadius: '10px',
                            background: selectedTaskId === '' ? `${color}15` : 'transparent',
                            color: selectedTaskId === '' ? color : 'rgba(255, 255, 255, 0.75)',
                            fontSize: '0.9rem', fontWeight: selectedTaskId === '' ? 700 : 500,
                            cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s ease', outline: 'none', border: 'none'
                          }}
                          onMouseEnter={e => { if (selectedTaskId !== '') e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                          onMouseLeave={e => { if (selectedTaskId !== '') e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span>🎯 Sin objetivo</span>
                          {selectedTaskId === '' && <Check size={16} style={{ color: color, flexShrink: 0 }} />}
                        </button>

                        {pendingTasks.map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setSelectedTaskId(t.id); setIsTaskDropdownOpen(false); }}
                            style={{
                              width: '100%', padding: '12px 14px', borderRadius: '10px',
                              background: selectedTaskId === t.id ? `${color}15` : 'transparent',
                              color: selectedTaskId === t.id ? '#ffffff' : 'var(--text-primary)',
                              cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                              transition: 'all 0.2s ease', outline: 'none', border: 'none'
                            }}
                            onMouseEnter={e => { if (selectedTaskId !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={e => { if (selectedTaskId !== t.id) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden', flex: 1 }}>
                              <span style={{ 
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', 
                                fontSize: '0.9rem', fontWeight: selectedTaskId === t.id ? 700 : 500,
                                color: selectedTaskId === t.id ? color : 'rgba(255, 255, 255, 0.92)'
                              }}>
                                {t.title}
                              </span>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {t.courses?.name && (
                                  <>
                                    <span style={{ width: '6px', height: '6px', minWidth: '6px', borderRadius: '50%', background: t.courses.color || 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255, 255, 255, 0.68)' }}>
                                      {t.courses.name}
                                    </span>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.35)', flexShrink: 0 }}>·</span>
                                  </>
                                )}
                                <span style={{ color: t.status === 'en proceso' ? color : 'rgba(255, 255, 255, 0.68)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {t.status}
                                </span>
                              </div>
                            </div>
                            {selectedTaskId === t.id && (
                              <Check size={18} style={{ color: color, flexShrink: 0 }} />
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
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.95)', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    {t.courses?.name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <span style={{ width: '6px', height: '6px', minWidth: '6px', borderRadius: '50%', background: t.courses.color || 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.72)', fontWeight: 700, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.courses.name}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      {(t.deadline || t.due_date) ? <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.55)' }}>Vence: {new Date(t.deadline || t.due_date).toLocaleDateString('es-CO')}</div> : <div />}
                      <div style={{ fontSize: '0.75rem', color: t.status === 'en proceso' ? color : 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', fontWeight: 800 }}>{t.status}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Widget de Ambiente Sonoro */}
        <div style={{
          padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', 
          background: 'rgba(10, 12, 20, 0.5)', border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.2)', backdropFilter: 'blur(24px)',
          height: '100%', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Music size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ambiente Sonoro</span>
            </div>
            
            <div className="group" style={{ position: 'relative', cursor: 'pointer' }}>
              <div style={{ opacity: 0.8, transition: 'all 0.2s', color: color, padding: '4px' }} onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.transform = 'scale(1.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.8; e.currentTarget.style.transform = 'scale(1)'; }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
              <div className="tooltip" style={{
                position: 'absolute', bottom: '100%', right: '0', width: '240px', padding: '16px',
                background: 'rgba(15, 17, 26, 0.95)', border: `1px solid ${color}40`, borderRadius: '16px',
                fontSize: '0.85rem', color: 'var(--text-primary)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                visibility: 'hidden', opacity: 0, transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)', marginBottom: '12px', zIndex: 10,
                backdropFilter: 'blur(20px)'
              }}>
                <b style={{ color: color, display: 'block', marginBottom: '8px', fontSize: '0.95rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>🧬 Guía de Uso:</b>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>• <span style={{ fontWeight: 800, color: color }}>Alfa:</span> Memorización rápida.</div>
                  <div>• <span style={{ fontWeight: 800, color: color }}>Gamma:</span> Lógica y problemas.</div>
                  <div>• <span style={{ fontWeight: 800, color: color }}>432 Hz:</span> Bajar estrés y ansiedad.</div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: '16px' }}>
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setIsSoundDropdownOpen(prev => !prev)}
                style={{
                  width: '100%', padding: '14px 16px', fontSize: '0.9rem', fontFamily: 'var(--font-body)', fontWeight: 600,
                  background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: 'var(--text-primary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                  transition: 'all 0.2s ease', outline: 'none',
                  boxShadow: isSoundDropdownOpen ? `0 0 16px ${color}20` : 'none'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ambientSound === '' ? '🔇 Sin Sonido' : ambientSound === 'custom' ? '📁 Personalizado...' : (SOUNDSCAPES.find(s => s.id === ambientSound)?.label || '🔇 Sin Sonido')}
                </span>
                <ChevronDown size={18} style={{ flexShrink: 0, transition: 'transform 0.2s ease', transform: isSoundDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.6 }} />
              </button>

              {isSoundDropdownOpen && (
                <div className="animate-fade-in" style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '8px', zIndex: 10000,
                  background: 'rgba(15, 17, 26, 0.95)', backdropFilter: 'blur(24px) saturate(200%)',
                  border: `1px solid ${color}40`, borderRadius: '16px',
                  boxShadow: `0 -12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0,0,0,0.4), inset 0 0 20px ${color}10`,
                  padding: '8px', maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  <button
                    onClick={() => { setAmbientSound(''); setIsSoundDropdownOpen(false); }}
                    style={{
                      width: '100%', padding: '12px 14px', border: 'none', borderRadius: '10px',
                      background: ambientSound === '' ? `${color}15` : 'transparent',
                      color: ambientSound === '' ? color : 'rgba(255, 255, 255, 0.75)',
                      fontSize: '0.9rem', fontWeight: ambientSound === '' ? 700 : 500,
                      cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.2s ease', outline: 'none'
                    }}
                    onMouseEnter={e => { if (ambientSound !== '') e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={e => { if (ambientSound !== '') e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>🔇 Sin Sonido</span>
                    {ambientSound === '' && <Check size={16} style={{ color: color }} />}
                  </button>

                  {SOUNDSCAPES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setAmbientSound(s.id); setIsSoundDropdownOpen(false); }}
                      style={{
                        width: '100%', padding: '12px 14px', border: 'none', borderRadius: '10px',
                        background: ambientSound === s.id ? `${color}15` : 'transparent',
                        color: ambientSound === s.id ? color : 'rgba(255, 255, 255, 0.75)',
                        fontSize: '0.9rem', fontWeight: ambientSound === s.id ? 700 : 500,
                        cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.2s ease', outline: 'none'
                      }}
                      onMouseEnter={e => { if (ambientSound !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={e => { if (ambientSound !== s.id) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span>{s.label}</span>
                      {ambientSound === s.id && <Check size={16} style={{ color: color }} />}
                    </button>
                  ))}

                  <button
                    onClick={() => { setAmbientSound('custom'); setIsSoundDropdownOpen(false); }}
                    style={{
                      width: '100%', padding: '12px 14px', border: 'none', borderRadius: '10px',
                      background: ambientSound === 'custom' ? `${color}15` : 'transparent',
                      color: ambientSound === 'custom' ? color : 'rgba(255, 255, 255, 0.75)',
                      fontSize: '0.9rem', fontWeight: ambientSound === 'custom' ? 700 : 500,
                      cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.2s ease', outline: 'none',
                      borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px', paddingTop: '12px'
                    }}
                    onMouseEnter={e => { if (ambientSound !== 'custom') e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={e => { if (ambientSound !== 'custom') e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>📁 Personalizado...</span>
                    {ambientSound === 'custom' && <Check size={16} style={{ color: color }} />}
                  </button>
                </div>
              )}
            </div>

            {ambientSound === 'custom' && (
              <input type="file" accept="audio/*" onChange={handleAudioUpload} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} />
            )}

            {ambientSound !== '' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
                {volume === 0 ? <VolumeX size={18} color="var(--text-muted)" /> : <Volume2 size={18} color={color} />}
                <input 
                  type="range" 
                  min="0" max="1" step="0.05" 
                  value={volume} 
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: color, height: '6px', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>
            )}
          </div>

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
      </div>

    </div>
  );
};

export default Pomodoro;

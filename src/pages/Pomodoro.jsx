import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause, RotateCcw, Music, Volume2, VolumeX, Square, ChevronDown, Check, Target, X, Timer, ListTodo, SkipBack, SkipForward, FolderOpen, ListMusic } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useBreakpoint } from '../hooks/useMediaQuery';
import { playPhaseCompleteChime, resumeAudio } from '../lib/audioService';
import { extractPlaylistMetadata, cleanTrackTitle } from '../lib/playlistService';
import { toast } from 'sonner';
import { useGamification } from '../context/GamificationContext';
import { trackEvent } from '../services/analyticsService';
import TaskDetailDrawer from '../components/ui/TaskDetailDrawer';

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

const SOUNDSCAPES = [
  { id: 'rain',    icon: '🌧️', name: 'Lluvia',        desc: 'Antiestrés',   label: '🌧️ Lluvia en Ventana (Antiestrés)', src: '/sounds/rain.mp3' },
  { id: 'lofi',    icon: '🎧', name: 'Lofi Hip-Hop', desc: 'Flujo y calma', label: '🎧 Lofi Hip-Hop (Flujo y Calma)', src: '/sounds/lofi.mp3' },
  { id: 'white',   icon: '⚪', name: 'Ruido Blanco', desc: 'Aislamiento',  label: '⚪ Ruido Blanco (Bloqueo Total)', src: '/sounds/white.mp3' },
  { id: 'alpha',   icon: '🧠', name: 'Ondas Alfa',   desc: 'Memoria 10Hz', label: '🧠 Ondas Alfa (Aprendizaje y Memoria)', src: '/sounds/alpha.mp3' },
  { id: 'gamma',   icon: '⚡', name: 'Ondas Gamma',  desc: 'Lógica 40Hz',  label: '⚡ Ondas Gamma (Lógica y Complejidad)', src: '/sounds/gamma.mp3' },
  { id: 'freq432', icon: '🧘', name: '432 Hz',       desc: 'Armonía y paz',label: '🧘 Frecuencia 432 Hz (Armonía y Paz)', src: '/sounds/freq432.mp3' },
];

const Pomodoro = () => {

  const location = useLocation();
  const incomingBlock = location.state?.sourceBlock;
  const [activePlannerBlock, setActivePlannerBlock] = useState(incomingBlock || null);

  const { user } = useAuth();
  const { tasks, updateSubtasks, updateTaskNotes } = useTasks(user?.id);
  const { t, incrementStat } = useSettings();
  const { addXP } = useGamification();
  const { isMobile } = useBreakpoint();
  
  // Drawer de Desglose de Ejercicios y Notas
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
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

  // Timestamp objetivo (Date.now() + segundos restantes) en vez de solo
  // decrementar de a 1. Los navegadores ralentizan setInterval en pestañas
  // minimizadas/en segundo plano (Chrome llega a limitarlo a ~1 tick/minuto),
  // así que decrementar de a 1 por tick perdería tiempo real transcurrido.
  // Calculando siempre contra un timestamp fijo, el tiempo mostrado es
  // correcto aunque se hayan perdido ticks, y se autocorrige apenas el
  // navegador vuelve a ejecutar el interval con normalidad.
  const endTimeRef = useRef(null);

  // Estados para Ambiente Sonoro y Playlist Local
  const audioRef = useRef(null);
  const playlistInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const playlistMenuRef = useRef(null);
  const [ambientSound, setAmbientSound] = useState('');
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('cf_pomodoro_volume')) || 0.5);
  const [customAudioUrl, setCustomAudioUrl] = useState(null);
  const [localPlaylist, setLocalPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playlistTitle, setPlaylistTitle] = useState('Mi Playlist Local');
  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);
  // Estados para Objetivo de Estudio
  const pendingTasks = tasks.filter(t => t.status === 'sin entregar' || t.status === 'en proceso');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const taskDropdownRef = useRef(null);

  // Tarea vinculada como objetivo (por dropdown directo o por bloque activo de planificador)
  const linkedTask = useMemo(() => {
    if (selectedTaskId) {
      return tasks.find(t => String(t.id) === String(selectedTaskId)) || null;
    }
    if (activePlannerBlock?.task_id) {
      return tasks.find(t => String(t.id) === String(activePlannerBlock.task_id)) || null;
    }
    return null;
  }, [tasks, selectedTaskId, activePlannerBlock]);

  // Cerrar selector de objetivos al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(e.target)) {
        setIsTaskDropdownOpen(false);
      }
    };
    if (isTaskDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTaskDropdownOpen]);

  // Cerrar micro-desplegable de la playlist al hacer clic fuera
  useEffect(() => {
    const handleClickOutsidePlaylist = (e) => {
      if (playlistMenuRef.current && !playlistMenuRef.current.contains(e.target)) {
        setIsPlaylistMenuOpen(false);
      }
    };
    if (isPlaylistMenuOpen) {
      document.addEventListener('mousedown', handleClickOutsidePlaylist);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsidePlaylist);
  }, [isPlaylistMenuOpen]);

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
          addXP(100);
          incrementStat('pomodorosCompleted');
          trackEvent('pomodoro_session_finished', { 
            durationMinutes: Math.round((customTimes?.focus || 1500) / 60) || 25, 
            mode: 'focus' 
          });
          toast.success("¡Tiempo Cumplido!", { 
            id: "pomodoro-toast", 
            description: "Sesión registrada con éxito.",
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
  }, [isActive, timeLeft, mode, t, addXP, incrementStat, modeConfig, customTimes?.focus]);

  // El permiso de Notification debe solicitarse cuanto antes (no solo al
  // completar la primera fase) para que, si el usuario minimiza el
  // navegador durante su primer Pomodoro, la notificación ya tenga permiso
  // concedido a tiempo.
  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  // Ref para sincronizar y garantizar la revocación de ObjectURLs al desmontar el componente sin memory leaks
  const localPlaylistRef = useRef(localPlaylist);
  useEffect(() => {
    localPlaylistRef.current = localPlaylist;
  }, [localPlaylist]);

  // Limpieza estricta de ObjectURLs de la playlist local al desmontar el componente
  useEffect(() => {
    return () => {
      const currentTracks = localPlaylistRef.current || [];
      currentTracks.forEach(track => {
        if (track?.url && typeof track.url === 'string') {
          try {
            URL.revokeObjectURL(track.url);
          } catch (_err) {
            void _err;
          }
        }
      });
    };
  }, []);

  // Sincronización Estricta: Reproducción y Pausa reactiva según (ambientSound && isActive)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!ambientSound) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const targetSrc = ambientSound === 'custom' 
      ? (localPlaylist[currentTrackIndex]?.url || customAudioUrl || '') 
      : (SOUNDSCAPES.find(s => s.id === ambientSound)?.src || '');

    if (!targetSrc) {
      audio.pause();
      return;
    }

    // Actualizar fuente si cambió la pista
    if (audio.src !== targetSrc && !audio.src.endsWith(targetSrc)) {
      audio.src = targetSrc;
      audio.volume = volume;
      audio.load();
    }

    // Si el temporizador está corriendo y hay sonido seleccionado, reproducir suavemente
    if (isActive) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError') {
            console.warn('[Pomodoro] Audio play gesture or interruption:', err);
          }
        });
      }
    } else {
      // Si el reloj está pausado, en espera o en reset, pausar de inmediato
      audio.pause();
    }
  }, [ambientSound, customAudioUrl, localPlaylist, currentTrackIndex, isActive, volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Manejo de fin de pista en la playlist local (bucle continuo o siguiente pista)
  const handleAudioEnded = () => {
    if (ambientSound === 'custom' && localPlaylist.length > 0) {
      if (localPlaylist.length === 1) {
        if (audioRef.current && isActive) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.warn);
        }
      } else {
        // Pasar a la siguiente canción en bucle
        setCurrentTrackIndex(prev => (prev + 1) % localPlaylist.length);
      }
    }
  };

  const handleVolumeChange = (newVol) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    try {
      localStorage.setItem('cf_pomodoro_volume', String(clamped));
    } catch {
      // ignore
    }
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  };

  const handleToggleSound = (soundId) => {
    resumeAudio();
    if (ambientSound === soundId) {
      setAmbientSound('');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      toast.info("Ambiente sonoro silenciado");
    } else {
      setAmbientSound(soundId);
      const soundObj = SOUNDSCAPES.find(s => s.id === soundId);
      const soundName = soundId === 'custom' 
        ? (localPlaylist[currentTrackIndex]?.name ? `${playlistTitle} (${cleanTrackTitle(localPlaylist[currentTrackIndex].name)})` : playlistTitle) 
        : (soundObj?.name || 'Ambiente Sonoro');
      if (isActive) {
        toast.success(`Sonido activado: ${soundName}`, {
          description: "Reproducción en segundo plano activa",
          style: { border: `1px solid ${color}50`, boxShadow: `0 0 20px ${color}20` }
        });
      } else {
        toast.info(`Sonido seleccionado: ${soundName}`, {
          description: "En pausa con la sesión. Se activará al iniciar el temporizador.",
          style: { border: `1px solid ${color}50`, boxShadow: `0 0 20px ${color}20` }
        });
      }
    }
  };

  const handlePlaylistUpload = (e) => {
    const rawFiles = e.target.files;
    if (!rawFiles || !rawFiles.length) return;

    const metadata = extractPlaylistMetadata(rawFiles, 'Mi Playlist Local');

    if (!metadata.tracks.length) {
      toast.warning("Archivos Inválidos", { 
        id: "pomodoro-toast", 
        description: "Por favor selecciona archivos o una carpeta con audios válidos (.mp3, .wav, .ogg, .m4a, .aac, .flac).",
        style: { border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)' }
      });
      e.target.value = null;
      return;
    }

    // Revocar URLs de pistas anteriores para liberar memoria y evitar memory leaks
    if (Array.isArray(localPlaylist) && localPlaylist.length > 0) {
      localPlaylist.forEach(track => {
        if (track?.url && typeof track.url === 'string') {
          try {
            URL.revokeObjectURL(track.url);
          } catch (_err) {
            void _err;
          }
        }
      });
    }

    const newPlaylist = metadata.tracks.map((file, idx) => ({
      id: `track_${Date.now()}_${idx}`,
      name: file.name,
      displayName: cleanTrackTitle(file.name),
      relativePath: file.webkitRelativePath || '',
      url: URL.createObjectURL(file),
      file
    }));

    setPlaylistTitle(metadata.title);
    setLocalPlaylist(newPlaylist);
    setCurrentTrackIndex(0);
    setCustomAudioUrl(newPlaylist[0].url);
    setAmbientSound('custom');

    resumeAudio();

    const folderInfo = metadata.folderName ? `Carpeta "${metadata.folderName}"` : 'Playlist Local';
    if (isActive) {
      toast.success(`${folderInfo} Cargada`, {
        description: `${newPlaylist.length} ${newPlaylist.length === 1 ? 'pista lista' : 'pistas listas'} · En reproducción`,
        style: { border: `1px solid ${color}50`, boxShadow: `0 0 20px ${color}20` }
      });
    } else {
      toast.info(`${folderInfo} Lista`, {
        description: `${newPlaylist.length} ${newPlaylist.length === 1 ? 'pista cargada' : 'pistas cargadas'} · Se activará al iniciar el temporizador.`,
        style: { border: `1px solid ${color}50`, boxShadow: `0 0 20px ${color}20` }
      });
    }

    e.target.value = null;
  };

  const handleSelectTrack = (index) => {
    if (!localPlaylist[index]) return;
    resumeAudio();
    setCurrentTrackIndex(index);
    setCustomAudioUrl(localPlaylist[index].url);
    if (ambientSound !== 'custom') {
      setAmbientSound('custom');
    }
    setIsPlaylistMenuOpen(false);
  };

  const handlePrevTrack = () => {
    if (!localPlaylist.length) return;
    resumeAudio();
    setCurrentTrackIndex(prev => (prev > 0 ? prev - 1 : localPlaylist.length - 1));
  };

  const handleNextTrack = () => {
    if (!localPlaylist.length) return;
    resumeAudio();
    setCurrentTrackIndex(prev => (prev < localPlaylist.length - 1 ? prev + 1 : 0));
  };

  const toggleTimer = () => {
    if (isEditing) saveEdit();
    // Al pausar, se libera el timestamp objetivo para que al reanudar el
    // efecto de arriba calcule uno nuevo a partir del timeLeft actual (en
    // vez de seguir contando desde el timestamp de la sesión anterior).
    endTimeRef.current = null;
    resumeAudio();
    setIsActive(p => {
      const nextState = !p;
      if (nextState) {
        toast.success("Enfoque Iniciado", { 
          id: "pomodoro-toast", 
          description: ambientSound ? "Cero distracciones y ambiente sonoro activo." : "Cero distracciones activadas.",
          style: { border: '1px solid rgba(6, 182, 212, 0.4)', boxShadow: '0 0 20px rgba(6, 182, 212, 0.15)' }
        });
      } else {
        toast.warning("Temporizador Pausado", { 
          id: "pomodoro-toast", 
          description: ambientSound ? "Progreso y ambiente sonoro en pausa." : "Progreso detenido.",
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
    if (audioRef.current) {
      audioRef.current.pause();
    }
    toast.warning("Temporizador Reiniciado", { 
      id: "pomodoro-toast", 
      description: ambientSound ? "El tiempo vuelve a empezar. Audio en pausa." : "El tiempo vuelve a empezar.",
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

  const radius = 125;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="animate-fade-in pomodoro-page" style={{ 
      height: '100%',
      maxHeight: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'clamp(6px, 1.4vh, 12px)',
      padding: 'clamp(4px, 1vh, 8px) clamp(10px, 1.8vw, 20px)',
      boxSizing: 'border-box',
      position: 'relative',
      overflowX: 'hidden'
    }}>

      {/* ─── BANNER PRINCIPAL LIQUID GLASS ─── */}
      <motion.header
        className="pomodoro-header-banner"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          width: '100%', maxWidth: '960px', display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(4px, 0.8vh, 6px)', padding: 'clamp(6px, 1vh, 8px) 16px', borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
          backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05)',
          zIndex: 10, flexShrink: 0, marginBottom: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'center', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '5px', background: 'rgba(0, 242, 255, 0.1)', borderRadius: '10px', border: '1px solid rgba(0, 242, 255, 0.2)' }}>
              <Timer size={16} color="#00f2ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0,242,255,0.8))' }} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              SALA DE ESTUDIO
            </h1>
          </div>
          <span className="pomodoro-subtitle" style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop: '-2px' }}>
            Maximiza tu enfoque y seguimiento por materia
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2px', justifyContent: 'center' }}>
          {/* Método Selector */}
          <div style={{ display: 'flex', gap: '3px', padding: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {Object.values(STUDY_METHODS).map(method => {
              const isSelected = selectedStudyMethod === method.id;
              return (
                <button key={method.id} onClick={() => changeMethod(method.id)} style={{
                  padding: '4px 14px', borderRadius: '16px', fontSize: '0.76rem', fontWeight: 600,
                  background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.3s'
                }}>
                  {method.shortLabel}
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Modos (Pomodoro, Descanso) */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {Object.entries(modeConfig).map(([k, cfg]) => {
              const isSelected = mode === k;
              return (
                <motion.button 
                  key={k} 
                  onClick={() => changeMode(k)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: isSelected ? `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}10)` : 'rgba(255,255,255,0.03)',
                    color: isSelected ? cfg.color : 'rgba(255,255,255,0.5)',
                    padding: '6px 18px', fontWeight: isSelected ? 700 : 500, letterSpacing: '0.04em',
                    boxShadow: isSelected ? `0 0 16px ${cfg.color}20, inset 0 0 10px ${cfg.color}15` : 'none',
                    border: isSelected ? `1px solid ${cfg.color}50` : '1px solid rgba(255,255,255,0.1)',
                    fontSize: '0.8rem', borderRadius: '20px', cursor: 'pointer', outline: 'none',
                    textShadow: isSelected ? `0 0 10px ${cfg.color}60` : 'none',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  {cfg.labelOverride || t[cfg.labelKey]}
                </motion.button>
              )
            })}
          </div>
        </div>
      </motion.header>

      {/* ─── CENTRO: Anillo de Progreso + Controles ─── */}
      <div className="pomodoro-timer-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(6px, 1.2vh, 12px)', width: '100%' }}>
        
        {/* Anillo y Tiempo Neón 3D */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* SVG Ring con Degradado */}
          <svg
            className="pomodoro-clock-ring"
            viewBox={`0 0 ${radius * 2} ${radius * 2}`}
            style={{ 
              width: 'clamp(145px, 19vh, 185px)',
              height: 'clamp(145px, 19vh, 185px)',
              transform: 'rotate(-90deg)', 
              filter: `drop-shadow(0 0 ${isActive ? '25px' : '10px'} ${color}80)`,
              transition: 'all 0.5s ease'
            }}
          >
            <defs>
              <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2ff" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            {/* Background Circle */}
            <circle
              stroke="rgba(255,255,255,0.03)"
              fill="rgba(0,0,0,0.2)"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {/* Progress Circle */}
            <circle
              stroke={isActive ? "url(#neonGradient)" : color}
              fill="transparent"
              strokeWidth={stroke + 2}
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
            <div className="pomodoro-clock-status" style={{ 
              fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              textShadow: isActive ? `0 0 15px ${color}` : 'none',
              marginBottom: '4px', transition: 'all 0.3s ease'
            }}>
              {isActive ? t.activeStatus : (isEditing ? 'EDITANDO' : t.pausedStatus)}
            </div>
            
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="number" value={editMinutes} onChange={(e) => setEditMinutes(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  style={{ 
                    width: '120px', background: 'transparent', border: 'none', borderBottom: `2px solid ${color}`, 
                    color: '#fff', fontSize: 'clamp(3rem, 6.5vh, 4.4rem)', fontFamily: 'var(--font-display)', fontWeight: 700, 
                    textAlign: 'center', outline: 'none', textShadow: `0 0 20px ${color}`
                  }}
                  autoFocus min="1" max="120" />
              </div>
            ) : (
              <button onClick={startEdit} style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', padding: 0 }} title="Click para editar tiempo">
                <span className="pomodoro-clock-digits" style={{ 
                  fontSize: 'clamp(2.7rem, 6vh, 3.8rem)', fontWeight: 800, fontFamily: 'var(--font-display)', 
                  letterSpacing: '-2px', color: '#fff', 
                  textShadow: isActive ? `0 0 30px ${color}80, 0 0 60px ${color}40` : '0 4px 20px rgba(0,0,0,0.5)',
                  lineHeight: 1
                }}>
                  {String(minutes).padStart(2, '0')}
                  <span style={{ opacity: isActive ? 1 : 0.4, animation: isActive ? 'blink 2s infinite' : 'none', margin: '0 -4px' }}>:</span>
                  {String(seconds).padStart(2, '0')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Controles (Reset + Play) */}
        <div className="pomodoro-controls-row" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <motion.button 
            className="pomodoro-reset-btn"
            whileHover={{ scale: 1.1, rotate: -30 }}
            whileTap={{ scale: 0.9 }}
            onClick={resetTimer} aria-label="Reiniciar" title="Reiniciar" 
            style={{ 
              width: 'clamp(38px, 4.8vh, 44px)', height: 'clamp(38px, 4.8vh, 44px)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', outline: 'none', backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.05)',
              color: 'var(--text-secondary)'
            }}
          >
            <RotateCcw size={18} />
          </motion.button>
          
          <motion.button 
            className="pomodoro-play-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTimer} 
            aria-label={isActive ? 'Pausar' : 'Iniciar'} 
            style={{
              width: 'clamp(58px, 7.5vh, 66px)', height: 'clamp(58px, 7.5vh, 66px)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? 'rgba(20, 24, 34, 0.6)' : `linear-gradient(135deg, ${color}, ${color}cc)`,
              color: isActive ? color : '#000',
              border: isActive ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.4)',
              boxShadow: isActive 
                ? `0 0 40px ${color}80, inset 0 0 20px ${color}40` 
                : `0 12px 36px ${color}60, inset 0 4px 10px rgba(255,255,255,0.5)`,
              cursor: 'pointer', outline: 'none',
              backdropFilter: 'blur(16px)'
            }}
          >
            {isActive ? <Pause size={26} /> : <Play size={26} style={{ transform: 'translateX(2px)' }} />}
          </motion.button>

          {/* Spacer to keep Play button perfectly centered. */}
          <div className="pomodoro-spacer" style={{ width: 'clamp(38px, 4.8vh, 44px)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* ─── FILA INFERIOR: Tarjetas Objetivo y Ambiente ─── */}
      <div className="pomodoro-bottom-grid" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 'clamp(8px, 1.5vw, 14px)',
        width: '100%',
        maxWidth: '960px',
        flexShrink: 0,
        zIndex: 10
      }}>
        
        {/* Widget Objetivo de Estudio */}
        <div className="glass-panel" style={{
          padding: 'clamp(8px, 1.2vh, 12px) 14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', 
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.02)', 
          backdropFilter: 'blur(30px)',
          position: 'relative', overflow: 'visible', zIndex: 20, boxSizing: 'border-box'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.8, borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }} />
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '5px', background: `${color}15`, borderRadius: '8px', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={15} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff' }}>Objetivo de Estudio</span>
            </div>
            {(selectedTaskId !== '' || activePlannerBlock) && (
              <button
                type="button"
                onClick={() => { setSelectedTaskId(''); setActivePlannerBlock(null); }}
                title="Desvincular objetivo y pasar a concentración libre"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ff4d4f'; e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={12} />
                <span>Limpiar</span>
              </button>
            )}
          </div>
          
          {/* Selector de Tareas Compacto en la parte superior */}
          <div ref={taskDropdownRef} style={{ position: 'relative', width: '100%' }}>
            <button
              onClick={() => setIsTaskDropdownOpen(prev => !prev)}
              style={{
                width: '100%', padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'var(--font-body)', fontWeight: 600,
                background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: isTaskDropdownOpen ? `1px solid ${color}55` : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', color: 'var(--text-primary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                transition: 'all 0.2s ease', outline: 'none',
                boxShadow: isTaskDropdownOpen ? `0 0 12px ${color}20` : 'none'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ opacity: 0.85 }}>🎯</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedTaskId === ''
                    ? (activePlannerBlock ? activePlannerBlock.title : '🎯 Sin objetivo (Concentración libre)')
                    : (pendingTasks.find(t => t.id === selectedTaskId)?.title || '🎯 Sin objetivo')}
                </span>
              </span>
              <ChevronDown size={15} style={{ flexShrink: 0, transition: 'transform 0.2s ease', transform: isTaskDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.6 }} />
            </button>

            {isTaskDropdownOpen && (
              <div className="animate-fade-in" style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '6px', zIndex: 100,
                background: 'rgba(15, 17, 26, 0.98)', backdropFilter: 'blur(24px) saturate(200%)',
                border: `1px solid ${color}45`, borderRadius: '14px', 
                boxShadow: `0 -16px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 20px ${color}12`,
                padding: '6px', maxHeight: '210px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px',
                pointerEvents: 'auto', scrollBehavior: 'smooth'
              }}>
                {/* Botón destacado para concentración libre sin objetivo */}
                <button
                  type="button"
                  onClick={() => { setSelectedTaskId(''); setActivePlannerBlock(null); setIsTaskDropdownOpen(false); }}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '8px',
                    background: selectedTaskId === '' && !activePlannerBlock ? `${color}18` : 'transparent',
                    color: selectedTaskId === '' && !activePlannerBlock ? color : 'rgba(255, 255, 255, 0.85)',
                    fontSize: '0.8rem', fontWeight: selectedTaskId === '' && !activePlannerBlock ? 700 : 500,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.2s ease', outline: 'none', border: selectedTaskId === '' && !activePlannerBlock ? `1px solid ${color}35` : '1px solid transparent'
                  }}
                  onMouseEnter={e => { if (selectedTaskId !== '' || activePlannerBlock) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { if (selectedTaskId !== '' || activePlannerBlock) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>🚫 Estudiar sin objetivo (Modo libre)</span>
                  {selectedTaskId === '' && !activePlannerBlock && <Check size={14} style={{ color: color, flexShrink: 0 }} />}
                </button>

                {pendingTasks.length === 0 ? (
                  <div style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No tienes otros trabajos pendientes en este momento.
                  </div>
                ) : (
                  pendingTasks.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setSelectedTaskId(t.id); setActivePlannerBlock(null); setIsTaskDropdownOpen(false); }}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: '8px',
                        background: selectedTaskId === t.id ? `${color}15` : 'transparent',
                        color: selectedTaskId === t.id ? '#ffffff' : 'var(--text-primary)',
                        cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                        transition: 'all 0.2s ease', outline: 'none', border: 'none'
                      }}
                      onMouseEnter={e => { if (selectedTaskId !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={e => { if (selectedTaskId !== t.id) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', flex: 1 }}>
                        <span style={{ 
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', 
                          fontSize: '0.82rem', fontWeight: selectedTaskId === t.id ? 700 : 500,
                          color: selectedTaskId === t.id ? color : 'rgba(255, 255, 255, 0.92)'
                        }}>
                          {t.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {t.courses?.name && (
                            <>
                              <span style={{ width: '5px', height: '5px', minWidth: '5px', borderRadius: '50%', background: t.courses.color || 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255, 255, 255, 0.68)' }}>
                                {t.courses.name}
                              </span>
                              <span style={{ color: 'rgba(255, 255, 255, 0.35)', flexShrink: 0 }}>·</span>
                            </>
                          )}
                          <span style={{ color: t.status === 'en proceso' ? color : 'rgba(255, 255, 255, 0.68)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {t.status}
                          </span>
                        </div>
                      </div>
                      {selectedTaskId === t.id && (
                        <Check size={16} style={{ color: color, flexShrink: 0 }} />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* CUERPO DEL OBJETIVO: 3 estados perfectamente equilibrados */}
          {activePlannerBlock ? (
            <div className="animate-fade-in" style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              gap: '6px', padding: '10px 12px', background: 'rgba(255,255,255,0.025)',
              borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', flex: 1, minHeight: '88px', boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', flex: 1 }}>
                  <span style={{ fontSize: '0.62rem', color: color, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>Bloque Activo</span>
                  <div style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: 800, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={activePlannerBlock.title}>
                    {activePlannerBlock.title}
                  </div>
                </div>
                <button 
                  onClick={() => setActivePlannerBlock(null)}
                  title="Desvincular bloque"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3px', borderRadius: '4px' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ff4d4f'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <X size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {activePlannerBlock.duration_minutes && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '3px 7px', borderRadius: '6px', fontWeight: 600 }}>
                    ⏱ {activePlannerBlock.duration_minutes} min
                  </span>
                )}
                {activePlannerBlock.day && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '3px 7px', borderRadius: '6px', fontWeight: 600, textTransform: 'capitalize' }}>
                    {activePlannerBlock.day}
                  </span>
                )}
                {linkedTask && Array.isArray(linkedTask.subtasks) && linkedTask.subtasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    style={{
                      background: `${color}15`, border: `1px solid ${color}30`, color: color,
                      padding: '2px 7px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto'
                    }}
                  >
                    📝 {linkedTask.subtasks.filter(s => s.completed).length}/{linkedTask.subtasks.length} resueltos
                  </button>
                )}
              </div>
            </div>
          ) : (selectedTaskId !== '' && pendingTasks.find(t => t.id === selectedTaskId)) ? (() => {
            const t = pendingTasks.find(t => t.id === selectedTaskId);
            const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
            const completedCount = subtasks.filter(s => s.completed).length;
            const totalCount = subtasks.length;
            const exercisesLabel = totalCount > 0 ? `${completedCount}/${totalCount} resueltos` : 'Sin ejercicios';

            return (
              <div className="animate-fade-in" style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                gap: '8px', padding: '10px 12px', background: 'rgba(255,255,255,0.025)',
                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', flex: 1, minHeight: '88px', boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.title}>
                      {t.title}
                    </div>
                    {t.courses?.name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                        <span style={{ width: '6px', height: '6px', minWidth: '6px', borderRadius: '50%', background: t.courses.color || color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.72)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.courses.name}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Entrega académica vinculada
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTaskId('')}
                    title="Desvincular objetivo"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '3px 6px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ff4d4f'; e.currentTarget.style.background = 'rgba(255, 59, 48, 0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <X size={13} />
                    <span>Quitar</span>
                  </button>
                </div>

                {/* Fila inferior: Indicador compacto de ejercicios + botón al Drawer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: totalCount > 0 ? color : 'var(--text-muted)',
                    background: totalCount > 0 ? `${color}15` : 'rgba(255,255,255,0.04)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: totalCount > 0 ? `1px solid ${color}30` : '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <ListTodo size={12} />
                    <span>{exercisesLabel}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = color; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                  >
                    <span>Desglose</span>
                    <span style={{ fontSize: '0.8rem' }}>→</span>
                  </button>
                </div>
              </div>
            );
          })() : (
            /* Estado Sin Objetivo: Minimalista, sutil y equilibrado */
            <div className="animate-fade-in" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', gap: '6px', padding: '12px 14px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(0, 242, 255, 0.015) 100%)',
              borderRadius: '12px', border: '1px dashed rgba(255, 255, 255, 0.08)',
              flex: 1, minHeight: '88px', boxSizing: 'border-box'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: `${color}12`,
                border: `1px solid ${color}25`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color
              }}>
                <Target size={15} style={{ filter: `drop-shadow(0 0 6px ${color}60)` }} />
              </div>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 650,
                color: 'rgba(255, 255, 255, 0.85)',
                letterSpacing: '0.01em',
                lineHeight: 1.35,
                maxWidth: '280px'
              }}>
                Modo libre activo · Sesión de estudio sin entrega vinculada
              </div>
            </div>
          )}
        </div>

        {/* Widget de Ambiente Sonoro */}
        <div className="glass-panel" style={{
          padding: 'clamp(8px, 1.2vh, 12px) 14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', 
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.02)', 
          backdropFilter: 'blur(30px)',
          position: 'relative', overflow: 'visible', zIndex: 10,
          boxSizing: 'border-box'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.8, borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }} />
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '5px', background: `${color}15`, borderRadius: '8px', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={15} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff' }}>Ambiente Sonoro</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '58%', justifyContent: 'flex-end' }}>
              {ambientSound && (
                <span style={{
                  fontSize: '0.60rem',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  color: isActive ? color : '#facc15',
                  background: isActive ? `${color}18` : 'rgba(250, 204, 21, 0.14)',
                  border: isActive ? `1px solid ${color}40` : '1px solid rgba(250, 204, 21, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  maxWidth: '100%',
                  lineHeight: 1.2
                }}>
                  <span style={{
                    width: '5px',
                    height: '5px',
                    minWidth: '5px',
                    borderRadius: '50%',
                    background: isActive ? color : '#facc15',
                    boxShadow: isActive ? `0 0 6px ${color}` : '0 0 6px rgba(250, 204, 21, 0.6)',
                    animation: isActive ? 'pulse 1.5s infinite' : 'none',
                    flexShrink: 0
                  }} />
                  <span 
                    title={ambientSound === 'custom' ? `${playlistTitle}${localPlaylist[currentTrackIndex]?.name ? ` · ${localPlaylist[currentTrackIndex].name}` : ''}` : (SOUNDSCAPES.find(s => s.id === ambientSound)?.name || 'Activo')}
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}
                  >
                    {ambientSound === 'custom' 
                      ? (localPlaylist.length > 0 ? (localPlaylist[currentTrackIndex]?.displayName || playlistTitle) : 'Personalizado') 
                      : (SOUNDSCAPES.find(s => s.id === ambientSound)?.name || 'Activo')}
                  </span>
                  <span style={{ opacity: 0.85, fontSize: '0.56rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {isActive ? '· En reproducción' : '· En pausa'}
                  </span>
                </span>
              )}
              
              <div className="group" style={{ position: 'relative', cursor: 'pointer' }}>
                <div style={{ opacity: 0.8, transition: 'all 0.2s', color: color, padding: '2px', display: 'flex', alignItems: 'center' }} onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.transform = 'scale(1.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.8; e.currentTarget.style.transform = 'scale(1)'; }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <div className="tooltip" style={{
                  position: 'absolute', bottom: '100%', right: '0', width: '230px', padding: '12px 14px',
                  background: 'rgba(15, 17, 26, 0.96)', border: `1px solid ${color}40`, borderRadius: '14px',
                  fontSize: '0.78rem', color: 'var(--text-primary)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                  visibility: 'hidden', opacity: 0, transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)', marginBottom: '8px', zIndex: 100,
                  backdropFilter: 'blur(20px)'
                }}>
                  <b style={{ color: color, display: 'block', marginBottom: '6px', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>🧬 Frecuencias de Enfoque:</b>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>• <span style={{ fontWeight: 800, color: color }}>Alfa:</span> Memorización y calma.</div>
                    <div>• <span style={{ fontWeight: 800, color: color }}>Gamma:</span> Lógica y alta demanda.</div>
                    <div>• <span style={{ fontWeight: 800, color: color }}>432 Hz:</span> Armonía y antiestrés.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Botonera / Tarjetas de Ambientes Sonoros Compactas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            width: '100%',
            pointerEvents: 'auto'
          }}>
            {SOUNDSCAPES.map(s => {
              const isSelected = ambientSound === s.id;
              const isPlaying = isSelected && isActive;
              const isPaused = isSelected && !isActive;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleToggleSound(s.id)}
                  aria-pressed={isSelected}
                  title={`${s.name} - ${s.desc}. ${isSelected ? (isPlaying ? 'Reproduciendo. Clic para silenciar.' : 'En pausa con el temporizador. Sonará al reanudar.') : 'Clic para seleccionar.'}`}
                  style={{
                    position: 'relative',
                    padding: '6px 4px',
                    borderRadius: '10px',
                    background: isSelected 
                      ? `linear-gradient(135deg, ${color}28 0%, rgba(255, 255, 255, 0.04) 100%)`
                      : 'rgba(255, 255, 255, 0.025)',
                    border: isSelected ? `1.5px solid ${color}` : '1px solid rgba(255, 255, 255, 0.06)',
                    boxShadow: isSelected 
                      ? `0 0 14px ${color}35, inset 0 0 8px ${color}15` 
                      : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    textAlign: 'center',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    outline: 'none',
                    pointerEvents: 'auto',
                    minHeight: '46px'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {isSelected && (
                    <span style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isPlaying ? color : '#facc15',
                      boxShadow: isPlaying ? `0 0 6px ${color}` : '0 0 6px rgba(250, 204, 21, 0.7)',
                      animation: isPlaying ? 'pulse 1.5s infinite' : 'none'
                    }} />
                  )}
                  <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{s.icon}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%'
                  }}>
                    {s.name}
                  </span>
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    color: isPlaying ? color : (isPaused ? '#facc15' : 'rgba(255, 255, 255, 0.45)'),
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%'
                  }}>
                    {isPaused ? '⏸️ En pausa' : s.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Barra de Controles: Volumen, Silenciar y Sistema de Playlist Local */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={() => handleVolumeChange(volume === 0 ? 0.5 : 0)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: ambientSound ? color : 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
              >
                {volume === 0 || !ambientSound ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <input 
                type="range" 
                min="0" max="1" step="0.05" 
                value={volume} 
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: color, height: '4px', borderRadius: '4px', cursor: 'pointer' }}
                title={`Volumen: ${Math.round(volume * 100)}%`}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '28px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                {Math.round(volume * 100)}%
              </span>
              {ambientSound && (
                <button
                  type="button"
                  onClick={() => handleToggleSound(ambientSound)}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.75)',
                    fontSize: '0.66rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 59, 48, 0.15)'; e.currentTarget.style.color = '#ff4d4f'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'; }}
                >
                  Silenciar
                </button>
              )}
            </div>

            {/* Selector e Interfaz de Playlist Local */}
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: '28px' }}>
              <input 
                ref={playlistInputRef}
                type="file" 
                accept="audio/*" 
                multiple 
                onChange={handlePlaylistUpload} 
                style={{ display: 'none' }} 
              />
              <input 
                ref={folderInputRef}
                type="file" 
                {...{ webkitdirectory: '', directory: '' }}
                multiple 
                accept="audio/*" 
                onChange={handlePlaylistUpload} 
                style={{ display: 'none' }} 
              />

              {localPlaylist.length === 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    title="Cargar una carpeta completa de música como playlist"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '5px 8px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.12) 0%, rgba(0, 242, 255, 0.04) 100%)',
                      border: '1px solid rgba(0, 242, 255, 0.28)',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      whiteSpace: 'nowrap',
                      outline: 'none'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.6)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 242, 255, 0.2) 0%, rgba(0, 242, 255, 0.08) 100%)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.28)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 242, 255, 0.12) 0%, rgba(0, 242, 255, 0.04) 100%)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <FolderOpen size={13} style={{ color: color }} />
                    <span>📁 Subir Carpeta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => playlistInputRef.current?.click()}
                    title="Seleccionar múltiples archivos de audio sueltos"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '5px 8px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0.04) 100%)',
                      border: '1px solid rgba(168, 85, 247, 0.28)',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      whiteSpace: 'nowrap',
                      outline: 'none'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.08) 100%)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.28)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0.04) 100%)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Music size={13} style={{ color: '#c084fc' }} />
                    <span>🎵 Subir Archivos</span>
                  </button>
                </div>
              ) : (
                <div ref={playlistMenuRef} style={{ position: 'relative', width: '100%' }}>
                  {/* Micro-desplegable / Popover Flotante Cyber Luxe de Canciones */}
                  {isPlaylistMenuOpen && (
                    <div className="animate-fade-in" style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      right: 0,
                      marginBottom: '8px',
                      zIndex: 120,
                      background: 'rgba(13, 16, 25, 0.98)',
                      backdropFilter: 'blur(28px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                      border: `1px solid ${color}45`,
                      borderRadius: '14px',
                      boxShadow: `0 -18px 45px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 24px ${color}14`,
                      padding: '8px',
                      maxHeight: '235px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      {/* Cabecera del Popover */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '2px 4px 6px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.85rem' }}>📂</span>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {playlistTitle}
                            </div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                              Pista {currentTrackIndex + 1} de {localPlaylist.length} · Clic para saltar
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsPlaylistMenuOpen(false)}
                          title="Cerrar lista"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '3px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ff4d4f'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Lista de Canciones Scrolleable */}
                      <div style={{
                        overflowY: 'auto',
                        maxHeight: '140px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        paddingRight: '2px'
                      }}>
                        {localPlaylist.map((track, idx) => {
                          const isCurrent = idx === currentTrackIndex;
                          const isPlayingThis = isCurrent && ambientSound === 'custom' && isActive;
                          const isPausedThis = isCurrent && ambientSound === 'custom' && !isActive;

                          return (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => handleSelectTrack(idx)}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '8px',
                                background: isCurrent ? `${color}18` : 'transparent',
                                border: isCurrent ? `1px solid ${color}40` : '1px solid transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                outline: 'none',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => {
                                if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                              }}
                              onMouseLeave={e => {
                                if (!isCurrent) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                                <span style={{
                                  fontSize: '0.64rem',
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  color: isCurrent ? color : 'var(--text-muted)',
                                  minWidth: '22px'
                                }}>
                                  #{idx + 1}
                                </span>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: isCurrent ? 750 : 500,
                                  color: isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.82)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {track.displayName || track.name}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                {isPlayingThis && (
                                  <span style={{
                                    fontSize: '0.58rem',
                                    color: color,
                                    fontWeight: 700,
                                    background: `${color}25`,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}>
                                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: color, animation: 'pulse 1s infinite' }} />
                                    Sonando
                                  </span>
                                )}
                                {isPausedThis && (
                                  <span style={{ fontSize: '0.58rem', color: '#facc15', fontWeight: 600 }}>
                                    Pausa
                                  </span>
                                )}
                                {isCurrent && !isPlayingThis && !isPausedThis && (
                                  <Check size={13} style={{ color: color }} />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Pie del Popover: Acciones Rápidas */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        paddingTop: '6px',
                        borderTop: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <button
                          type="button"
                          onClick={() => folderInputRef.current?.click()}
                          style={{
                            flex: 1,
                            padding: '4px 6px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: 'rgba(255, 255, 255, 0.85)',
                            fontSize: '0.64rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.borderColor = `${color}45`; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
                        >
                          <FolderOpen size={11} style={{ color: color }} />
                          <span>Cambiar Carpeta</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => playlistInputRef.current?.click()}
                          style={{
                            flex: 1,
                            padding: '4px 6px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: 'rgba(255, 255, 255, 0.85)',
                            fontSize: '0.64rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#c084fc'; e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.45)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
                        >
                          <Music size={11} style={{ color: '#c084fc' }} />
                          <span>Cambiar Archivos</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Barra compacta de la Playlist activa */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    width: '100%',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: ambientSound === 'custom' ? 'rgba(0, 242, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    border: ambientSound === 'custom' ? `1px solid ${color}45` : '1px solid rgba(255, 255, 255, 0.08)',
                    boxSizing: 'border-box'
                  }}>
                    {/* Nombre y activación rápida */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleSound('custom')}
                        title={ambientSound === 'custom' ? 'Silenciar playlist' : 'Activar playlist'}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: ambientSound === 'custom' ? color : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Music size={13} style={{ filter: ambientSound === 'custom' && isActive ? `drop-shadow(0 0 6px ${color})` : 'none' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPlaylistMenuOpen(prev => !prev)}
                        title={`Ver todas las canciones (${localPlaylist.length} pistas)`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          minWidth: 0,
                          flex: 1
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 650,
                            color: ambientSound === 'custom' ? '#ffffff' : 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '120px',
                            lineHeight: 1.2
                          }}
                        >
                          {localPlaylist[currentTrackIndex]?.displayName || localPlaylist[currentTrackIndex]?.name || 'Pista de audio'}
                        </span>
                      </button>
                    </div>

                    {/* Controles de navegación y selector de pistas */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                      {localPlaylist.length > 1 && (
                        <button
                          type="button"
                          onClick={handlePrevTrack}
                          title="Canción anterior"
                          aria-label="Canción anterior"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '5px',
                            color: '#fff',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = color; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                          <SkipBack size={11} />
                        </button>
                      )}

                      {/* Botón flotante de lista de canciones (popover toggle) */}
                      <button
                        type="button"
                        onClick={() => setIsPlaylistMenuOpen(prev => !prev)}
                        title="Ver lista completa de canciones"
                        style={{
                          background: isPlaylistMenuOpen ? `${color}25` : 'rgba(255,255,255,0.06)',
                          border: isPlaylistMenuOpen ? `1px solid ${color}55` : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '5px',
                          color: isPlaylistMenuOpen ? color : 'var(--text-secondary)',
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          padding: '1px 5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = isPlaylistMenuOpen ? `${color}55` : 'rgba(255,255,255,0.1)';
                          e.currentTarget.style.color = isPlaylistMenuOpen ? color : 'var(--text-secondary)';
                        }}
                      >
                        <ListMusic size={11} />
                        <span>{currentTrackIndex + 1}/{localPlaylist.length}</span>
                      </button>

                      {localPlaylist.length > 1 && (
                        <button
                          type="button"
                          onClick={handleNextTrack}
                          title="Siguiente canción"
                          aria-label="Siguiente canción"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '5px',
                            color: '#fff',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = color; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                          <SkipForward size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reproductor de Audio invisible y persistente */}
          <audio 
            ref={audioRef}
            loop={ambientSound !== 'custom' || localPlaylist.length === 1}
            onEnded={handleAudioEnded}
            crossOrigin="anonymous"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Botón flotante accesible para desglose de ejercicios durante la sesión de estudio */}
      {linkedTask && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ 
            scale: 1.05, 
            boxShadow: `0 10px 30px rgba(0, 0, 0, 0.6), 0 0 25px ${color}60`,
            borderColor: color
          }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDrawerOpen(true)}
          aria-label="📝 Desglose de Tarea"
          title="Ver desglose de ejercicios y bloc de notas"
          style={{
            position: 'fixed',
            bottom: isMobile ? '82px' : '24px',
            right: isMobile ? '16px' : '28px',
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '999px',
            background: 'rgba(15, 17, 26, 0.92)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: `1.5px solid ${color}`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px ${color}35`,
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.84rem',
            fontWeight: 800,
            outline: 'none',
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ fontSize: '1rem' }}>📝</span>
          <span>Desglose de Tarea</span>
          {Array.isArray(linkedTask.subtasks) && linkedTask.subtasks.length > 0 && (
            <span
              style={{
                background: `${color}25`,
                color: color,
                border: `1px solid ${color}40`,
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800,
              }}
            >
              {linkedTask.subtasks.filter(s => s.completed).length}/{linkedTask.subtasks.length}
            </span>
          )}
        </motion.button>
      )}

      {/* TaskDetailDrawer para Pomodoro */}
      <TaskDetailDrawer
        isOpen={isDrawerOpen && Boolean(linkedTask)}
        onClose={() => setIsDrawerOpen(false)}
        task={linkedTask}
        onUpdateSubtasks={updateSubtasks}
        onUpdateNotes={updateTaskNotes}
      />

    </div>
  );
};

export default Pomodoro;


import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Music, Volume2, VolumeX, Square } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const Pomodoro = () => {
  const { t, addXP, incrementStat } = useSettings();
  const [mode, setMode] = useState('focus');
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

  const SOUNDSCAPES = [
    { id: 'lofi',    label: '🎧 Lofi Hip-Hop (Flujo y Calma)', src: '/sounds/lofi.mp3' },
    { id: 'rain',    label: '🌧️ Lluvia en Ventana (Antiestrés)', src: '/sounds/rain.mp3' },
    { id: 'white',   label: '⚪ Ruido Blanco (Bloqueo Total)', src: '/sounds/white.mp3' },
    { id: 'alpha',   label: '🧠 Ondas Alfa (Aprendizaje y Memoria)', src: '/sounds/alpha.mp3' },
    { id: 'gamma',   label: '⚡ Ondas Gamma (Lógica y Complejidad)', src: '/sounds/gamma.mp3' },
    { id: 'freq432', label: '🧘 Frecuencia 432 Hz (Armonía y Paz)', src: '/sounds/freq432.mp3' },
  ];

  const modeConfig = {
    focus:      { labelKey: 'focusMode',   color: 'var(--accent-primary)'   },
    shortBreak: { labelKey: 'shortBreak',  color: 'var(--accent-lime)'      },
    longBreak:  { labelKey: 'longBreak',   color: 'var(--accent-secondary)' },
  };

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      addXP(50);
      incrementStat('pomodorosCompleted');
      if (Notification.permission === 'granted') {
        new Notification('¡Fase completada!', { body: t[modeConfig[mode].labelKey] });
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, t, addXP, incrementStat]);

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
      
      {/* Selector de modo */}
      <div className="glass-panel" style={{ display: 'flex', gap: '4px', padding: '6px', borderRadius: 'var(--radius-full)', marginBottom: '40px', border: '1px solid var(--border-glass-top)' }}>
        {Object.entries(modeConfig).map(([k, cfg]) => (
          <button key={k} onClick={() => changeMode(k)} className="btn" style={{
            background: mode === k ? color : 'transparent',
            color: mode === k ? '#000' : 'var(--text-secondary)',
            padding: '8px 20px',
            fontWeight: mode === k ? 700 : 500,
            boxShadow: mode === k ? `0 0 20px ${color}` : 'none',
            border: 'none',
            fontSize: '0.78rem',
            transition: 'all 0.3s var(--ease-out-quint)',
          }}>
            {t[cfg.labelKey]}
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '60px', width: '100%' }}>
        
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

          <div style={{ zIndex: 2, background: 'rgba(0,0,0,0.6)', padding: '10px 24px', borderRadius: '16px', border: `1px solid ${color}44`, backdropFilter: 'blur(4px)' }}>
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
        <div style={{ position: 'relative', width: '280px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button 
            className="btn-icon click-press hover-lift" 
            onClick={resetTimer} 
            aria-label="RESET" 
            title="RESET" 
            style={{ 
              position: 'absolute', left: '0', width: '56px', height: '56px', 
              background: `radial-gradient(circle at 50% 50%, ${color}33 0%, transparent 80%)`,
              border: `1.5px solid ${color}`,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.4s var(--ease-out-expo)',
              boxShadow: `0 0 12px ${color}44, inset 0 0 10px ${color}22`,
              zIndex: 15,
              cursor: 'pointer',
              padding: 0,
              outline: 'none'
            }}
            onMouseOver={e => { e.currentTarget.style.boxShadow = `0 0 25px ${color}, inset 0 0 15px ${color}`; e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseOut={e => { e.currentTarget.style.boxShadow = `0 0 12px ${color}44, inset 0 0 10px ${color}22`; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <span style={{ color: color, fontSize: '0.7rem', fontWeight: 900, fontFamily: 'var(--font-display)', textShadow: `0 0 8px ${color}`, letterSpacing: '0.05em' }}>RESET</span>
          </button>

          <button 
            onClick={toggleTimer} 
            aria-label={isActive ? 'Pausar' : 'Iniciar'} 
            className="click-press hover-lift"
            style={{
              width: '72px', height: '72px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? 'transparent' : color,
              color: isActive ? color : '#000',
              border: isActive ? `2px solid ${color}` : 'none',
              boxShadow: isActive ? `0 0 40px ${color}44` : `0 15px 45px ${color}33`,
              cursor: 'pointer',
              transition: 'all 0.6s var(--ease-out-expo)',
              outline: 'none',
              zIndex: 20
            }}
          >
            {isActive ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: '4px' }} />}
          </button>
        </div>
      </div>

      {/* Widget de Ambiente Sonoro (Responsive positioning) */}
      <div className="glass-panel ambient-widget" style={{
        padding: '16px 20px', 
        borderRadius: 'var(--radius-md)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px', 
        minWidth: '240px', 
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-glass-top)',
        marginTop: '20px'
      }}>
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
        
        <select 
          className="select" 
          value={ambientSound} 
          onChange={(e) => setAmbientSound(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-glass-top)' }}
        >
          <option value="">🔇 Sin Sonido</option>
          {SOUNDSCAPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          <option value="custom">📁 Personalizado...</option>
        </select>

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
        <audio 
          key={ambientSound}
          ref={audioRef}
          loop 
          crossOrigin="anonymous"
          src={ambientSound === 'custom' ? customAudioUrl : (SOUNDSCAPES.find(s => s.id === ambientSound)?.src || '')} 
        />
      </div>

    </div>
  );
};

export default Pomodoro;

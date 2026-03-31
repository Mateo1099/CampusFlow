# Pomodoro Timer Optimization & Audio Management

## 📋 Descripción General

Skill integral para diseñar, implementar y optimizar el sistema Pomodoro en CampusFlow — incluyendo timer visual, audio feedback, estado de sesión, y UX en tiempo real.

**Problemas que resuelve:**
- ❌ Timer impreciso o out of sync con servidor
- ❌ Audio no suena o suena cortado
- ❌ UI no se actualiza en tiempo real
- ❌ Botones de control confusos
- ❌ Falta visual feedback (animaciones, colores)
- ❌ Estado se pierde al cambiar de tab/página
- ❌ Performance: re-renders cada milisegundo

**Resultado esperado:**
- ✅ Timer preciso (±100ms)
- ✅ Audio claro y en el momento correcto
- ✅ UI suave y responsiva
- ✅ Transiciones visuales claras
- ✅ Estado persistente
- ✅ Funciona con tab switching (blur/focus)

---

## ⏱️ Anatomía del Pomodoro

### Estados Principales
```
IDLE → WORKING (25 min) → BREAK (5 min) → WORKING → ∞
```

### Componentes Visuales
```
┌────────────────────────────┐
│    [Pomodoro Timer]        │
├────────────────────────────┤
│                            │
│       ⏱️  24:59           │  ← Circular progress + time
│                            │
│   ▶ PAUSE  ⏹️  RESET      │
│                            │
│  🔊 Volume: ▬▬▬▬ 80%  🔇  │
│                            │
│  Sesión 3 - TRABAJO       │
│  Completadas: ████░░ 4/8  │
│                            │
└────────────────────────────┘
```

---

## 🎬 Estructura del Timer

### Componente Principal
```jsx
const Pomodoro = () => {
  const [state, setState] = useState('IDLE'); // IDLE|WORKING|BREAK|PAUSED
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Segundos
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  // ... resto del código
};
```

### Estados Posibles
| Estado | Duración | Color | Sonido |
|--------|----------|-------|--------|
| IDLE | — | Gris | Ninguno |
| WORKING | 25 min | Verde brillante | Beep al terminar |
| BREAK | 5 min | Azul | Beep más suave |
| PAUSED | — | Amarillo | Ninguno |

---

## ⏲️ Lógica del Timer

### Intervalo Principal
```jsx
useEffect(() => {
  if (!isRunning) return; // ← No corre si está pausado

  intervalRef.current = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        // Timer terminó
        playBeep(800, 200);
        handleSessionComplete();
        return state === 'WORKING' 
          ? 5 * 60           // Pausa: 5 min
          : 25 * 60;         // Trabajo: 25 min
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(intervalRef.current);
}, [isRunning, state]);
```

### Cambio de Sesión
```jsx
const handleSessionComplete = () => {
  if (state === 'WORKING') {
    setState('BREAK');
    setSessionsCompleted(prev => prev + 1);
    playBeep(600, 100); // Beep más suave para break
  } else if (state === 'BREAK') {
    setState('WORKING');
    playBeep(800, 200); // Beep para retomar trabajo
  }
};
```

---

## 🔊 Sistema de Audio

### Audio Service (audioService.js)
```jsx
/**
 * Genera un beep de frecuencia variable
 * @param {number} frequency - Hz (400-2000)
 * @param {number} duration - ms
 * @param {number} volume - 0-1
 */
export const playBeep = (frequency = 800, duration = 200, volume = 0.5) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine'; // Más suave que 'square'

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration / 1000);
};
```

### Variaciones de Beep
```js
// Inicio de sesión WORKING
playBeep(800, 200, 0.6);  // Más fuerte

// Transición a BREAK
playBeep(600, 100, 0.4);  // Más suave

// Notificación importante
playBeep(1000, 500, 0.7); // Más agudo y largo

// Brown noise (opcional, para concentración)
playBrownNoise(duration);
```

### Control de Volumen
```jsx
const [volume, setVolume] = useState(0.5);

// En SettingsContext
export const useSettings = () => {
  const [pomodoroVolume, setPomodoroVolume] = useState(0.5);
  
  return {
    pomodoroVolume,
    setPomodoroVolume,
    // ...
  };
};

// En Pomodoro component
const { pomodoroVolume } = useSettings();
playBeep(800, 200, pomodoroVolume);
```

---

## 🎨 Visualización Circular

### Progress Ring (SVG)
```jsx
const CircularProgress = ({ timeLeft, totalTime, state }) => {
  const percentage = (timeLeft / totalTime) * 100;
  const circumference = 2 * Math.PI * 45; // Radio 45
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      {/* Background circle */}
      <circle
        cx="100"
        cy="100"
        r="45"
        fill="none"
        stroke="rgba(0, 243, 255, 0.1)"
        strokeWidth="8"
      />
      
      {/* Progress circle */}
      <circle
        cx="100"
        cy="100"
        r="45"
        fill="none"
        stroke={getStateColor(state)} // Verde, azul, etc
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />

      {/* Time display */}
      <text
        x="100"
        y="115"
        textAnchor="middle"
        fontSize="48"
        fontWeight="bold"
        fill="#fff"
      >
        {formatTime(timeLeft)}
      </text>
    </svg>
  );
};
```

### Color por Estado
```jsx
const getStateColor = (state) => {
  const colors = {
    IDLE: '#888',
    WORKING: '#4ade80',      // Verde
    BREAK: '#60a5fa',        // Azul
    PAUSED: '#fbbf24'        // Amarillo
  };
  return colors[state] || '#888';
};
```

### Animación de Pulse
```jsx
const pulseAnimation = {
  scale: [1, 1.05, 1],
  boxShadow: [
    '0 0 0 0px rgba(74, 222, 128, 0.7)',
    '0 0 0 20px rgba(74, 222, 128, 0)',
  ],
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'easeOut'
  }
};
```

---

## 🎮 Controles Principales

### Botones de Control
```jsx
<div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
  {/* Play/Pause */}
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => setIsRunning(!isRunning)}
    style={{
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: isRunning 
        ? 'rgba(251, 146, 60, 0.2)' // Naranja si corre
        : 'rgba(74, 222, 128, 0.2)',  // Verde si parado
      border: '2px solid currentColor',
      cursor: 'pointer'
    }}
  >
    {isRunning ? '⏸' : '▶'}
  </motion.button>

  {/* Reset */}
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => {
      setIsRunning(false);
      setTimeLeft(25 * 60);
      setState('IDLE');
    }}
    style={{
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'rgba(239, 68, 68, 0.2)',
      border: '2px solid #ef4444',
      cursor: 'pointer'
    }}
  >
    ⏹
  </motion.button>
</div>
```

---

## 🔧 Estado Persistente

### LocalStorage
```jsx
useEffect(() => {
  // Guardar estado
  localStorage.setItem('pomodoroState', JSON.stringify({
    state,
    timeLeft,
    sessionsCompleted,
    lastUpdated: Date.now()
  }));
}, [state, timeLeft, sessionsCompleted]);

// Recuperar al iniciar (en useEffect inicial)
useEffect(() => {
  const saved = localStorage.getItem('pomodoroState');
  if (saved) {
    const data = JSON.parse(saved);
    const elapsed = Math.floor((Date.now() - data.lastUpdated) / 1000);
    let adjustedTime = data.timeLeft - elapsed;
    
    if (adjustedTime <= 0) {
      // Ya pasó el tiempo, ir al siguiente estado
      setState(data.state === 'WORKING' ? 'BREAK' : 'WORKING');
      adjustedTime = data.state === 'WORKING' ? 5 * 60 : 25 * 60;
    }
    
    setTimeLeft(adjustedTime);
    setState(data.state);
    setSessionsCompleted(data.sessionsCompleted);
  }
}, []);
```

### Detección de Tab Switch
```jsx
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden && isRunning) {
      // Tab se enfocó de nuevo, sincronizar tiempo
      const saved = localStorage.getItem('pomodoroState');
      if (saved) {
        const data = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - data.lastUpdated) / 1000);
        setTimeLeft(prev => Math.max(prev - elapsed, 0));
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [isRunning]);
```

---

## 📊 Estadísticas y Tracking

### Session Summary
```jsx
const sessionSummary = {
  today: 8,           // Sesiones completadas hoy
  thisWeek: 42,       // Esta semana
  streak: 5,          // Días consecutivos
  totalFocusTime: 480 // Minutos
};

<div style={{ marginTop: '40px', padding: '24px', background: 'rgba(0,243,255,0.05)', borderRadius: '16px' }}>
  <h3 style={{ color: '#00f3ff', marginBottom: '20px' }}>Tu Racha Pomodoro</h3>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
    <stat label="Hoy" value={sessionSummary.today} />
    <stat label="Esta semana" value={sessionSummary.thisWeek} />
    <stat label="Racha" value={`${sessionSummary.streak} días`} />
    <stat label="Tiempo total" value={`${Math.floor(sessionSummary.totalFocusTime / 60)}h`} />
  </div>
</div>
```

---

## 🎬 Transiciones y Animaciones

### Estado Cambio Transition
```jsx
const stateAnimations = {
  IDLE: { scale: 1, opacity: 0.8 },
  WORKING: { scale: 1, opacity: 1, boxShadow: '0 0 30px rgba(74, 222, 128, 0.3)' },
  BREAK: { scale: 1, opacity: 1, boxShadow: '0 0 30px rgba(96, 165, 250, 0.3)' },
  PAUSED: { scale: 0.98, opacity: 0.9 }
};

<motion.div
  animate={stateAnimations[state]}
  transition={{ duration: 0.3 }}
>
  {/* Timer display */}
</motion.div>
```

### Notificación de Cambio de Estado
```jsx
const NotificationToast = ({ message, type }) => (
  <motion.div
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: -20, opacity: 0 }}
    style={{
      padding: '16px 24px',
      borderRadius: '12px',
      background: type === 'break' 
        ? 'rgba(96, 165, 250, 0.2)'
        : 'rgba(74, 222, 128, 0.2)',
      border: `1px solid ${type === 'break' ? '#60a5fa' : '#4ade80'}`,
      color: type === 'break' ? '#60a5fa' : '#4ade80'
    }}
  >
    {message}
  </motion.div>
);
```

---

## ⚡ Optimización de Performance

### Evitar Re-renders Frecuentes
```jsx
// ❌ Malo: Re-render cada segundo
const TimerDisplay = ({ timeLeft }) => <div>{timeLeft}</div>;

// ✅ Bien: Memoizar componente
const TimerDisplay = React.memo(({ timeLeft }) => <div>{timeLeft}</div>);

// O, mejor aún:
const TimerDisplay = ({ timeLeft }) => {
  const formatted = useMemo(() => formatTime(timeLeft), [timeLeft]);
  return <div>{formatted}</div>;
};
```

### useCallback para Botones
```jsx
const handlePlayPause = useCallback(() => {
  setIsRunning(prev => !prev);
}, []);

const handleReset = useCallback(() => {
  setIsRunning(false);
  setTimeLeft(25 * 60);
  setState('IDLE');
}, []);
```

### Separar Interval de Render
```jsx
useEffect(() => {
  if (!isRunning) return;

  // Usar requestAnimationFrame en lugar de setInterval para smoothness
  let frameId;
  let lastUpdate = Date.now();

  const update = () => {
    const now = Date.now();
    if (now - lastUpdate >= 1000) {
      setTimeLeft(prev => Math.max(prev - 1, 0));
      lastUpdate = now;
    }
    frameId = requestAnimationFrame(update);
  };

  frameId = requestAnimationFrame(update);
  return () => cancelAnimationFrame(frameId);
}, [isRunning]);
```

---

## 📋 Checklist de Implementación

### Timer Funcional
- [ ] Timer cuenta hacia atrás correctamente
- [ ] Transición automática WORKING → BREAK
- [ ] Recuento de sesiones completadas incrementa
- [ ] Play/Pause funciona sin saltos
- [ ] Reset reinicia a 25:00 estado IDLE

### Audio
- [ ] Beep suena al terminar sesión de trabajo
- [ ] Beep diferente al terminar descanso
- [ ] Volumen ajustable
- [ ] No hay distorsión
- [ ] Funciona en navegadores modernos

### Visualización
- [ ] Circular progress ring se va completando
- [ ] Tiempo mostrado en MM:SS
- [ ] Color cambia según estado (verde/azul/amarillo)
- [ ] Animación pulse cuando está corriendo
- [ ] Responsive en mobile

### Persistencia
- [ ] Estado guardado en localStorage
- [ ] Recupera estado al recargar página
- [ ] Sincroniza tiempo si pasó tiempo en tab inactivo
- [ ] Sesiones completadas persisten

### Estadísticas
- [ ] Contador de sesiones hoy
- [ ] Racha de días
- [ ] Tiempo total enfocado
- [ ] Actualiza en tiempo real

### UX
- [ ] Transiciones suaves (no choppy)
- [ ] Botones responsivos
- [ ] Notificación visual al cambiar estado
- [ ] Sin lag ni stutter
- [ ] Atajo de teclado (opcional)

---

## 🚀 Implementación Paso a Paso

### Paso 1: Estructura Base (10 min)
1. Crear componente Pomodoro.jsx
2. Agregar estado (isRunning, timeLeft, state)
3. Render básico con tiempo

### Paso 2: Lógica Timer (15 min)
1. Implementar useEffect con interval
2. Manejar play/pause
3. Transición de estados
4. Reset

### Paso 3: Audio (10 min)
1. Usar audioService.js existente
2. Agregar playBeep en transiciones
3. Control de volumen

### Paso 4: Visualización (15 min)
1. Circular progress SVG
2. Colores por estado
3. Animación pulse
4. Tamaño responsive

### Paso 5: Persistencia (10 min)
1. localStorage integration
2. Recuperación de estado
3. Tab switch handler

### Paso 6: Pulir (10 min)
1. Transiciones smooth
2. Animaciones
3. Notificaciones
4. Testing en mobile

**Tiempo total: 70-80 minutos**

---

## ⚠️ Errores Comunes

| Error | Síntoma | Solución |
|--------|---------|----------|
| **Timer se atrasa** | Muestra 24:30 pero son 5s después | Usar requestAnimationFrame, no solo setInterval |
| **Audio no suena** | playBeep no produce sonido | Verificar audioContext.resume(), permisos browser |
| **Re-renders cada ms** | Sistema lento/lag | Memoizar TimerDisplay, usar useCallback |
| **Estado se pierde** | Tab switch y timer resetea | Implementar localStorage + visibilitychange |
| **Beep cortado** | Audio se corta antes de terminar | Aumentar duration parameter |
| **Circular progress desalineado** | Ring no se corresponde con tiempo | Verificar cálculo de circumference y offset |
| **Botones se presionan doble** | Timer se comporta erraticamente | Agregar debounce o disabled state temporal |

---

## 💡 Mejoras Futuras

- [ ] Temporizador personalizado (20 min trabajo, 10 min descanso)
- [ ] Modo "Super Pomodoro" (4 sesiones largas + descanso largo)
- [ ] Notificación del navegador (Notification API)
- [ ] Integración con tareas (marcar tarea al completar Pomodoro)
- [ ] Estadísticas avanzadas y gráficos
- [ ] Temas de sonido (ocean waves, rain, etc)
- [ ] Atajo de teclado (Space para play/pause)
- [ ] Fullscreen mode

---

## 🎓 Relación con Otros Skills

- **Modal Refinement** — Para modal de configuración del Pomodoro
- **Dashboard UI Architecture** — Para widget Pomodoro en dashboard
- **Frontend Design** — Para estilos premium del circular progress
- **Audio Service** — Documentación de audioService.js

---

## 📚 Referencias

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [requestAnimationFrame vs setInterval](https://stackoverflow.com/questions/38709923)
- [SVG Progress Ring](https://css-tricks.com/building-progress-ring-just-html-svg-css/)
- [Pomodoro Technique](https://www.pomodorotechnique.com/)

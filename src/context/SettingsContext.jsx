/* eslint-disable no-unused-vars, react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { trackEvent } from '../services/analyticsService';

import glassWallpaper from '../assets/glass_wallpaper.png';
import natureGlass from '../assets/nature_glass.png';
import synthwaveNeon from '../assets/synthwave_neon.png';
import spaceMinimal from '../assets/space_minimal.png';

export const WALLPAPERS = [
  { id: 'custom', label: 'Personalizado', src: null },
  { id: 'cyber', label: 'Cyber Glass', src: glassWallpaper },
  { id: 'nature', label: 'Forest Glass', src: natureGlass },
  { id: 'synth', label: 'Synthwave', src: 'https://images.unsplash.com/photo-1774848372214-3563247a592b?q=80&w=1935&auto=format&fit=crop' },
  { id: 'space', label: 'Dark Space', src: spaceMinimal },
];

// Frecuencias de insistencia disponibles para cada zona del semáforo de
// alertas por correo (rojo/amarillo/verde). 'cada_hora' se eliminó porque
// es incompatible con el tope de 1 correo consolidado al día por estudiante.
export const ALERT_FREQUENCY_OPTIONS = [
  { id: 'diario', label: 'Diario' },
  { id: 'interdiario', label: 'Interdiario' },
  { id: 'personalizado', label: 'Personalizado' },
];

export const FONT_OPTIONS = [
  { id: 'space-grotesk', label: 'Space Grotesk', css: "'Space Grotesk', sans-serif" },
  { id: 'inter', label: 'Inter', css: "'Inter', sans-serif" },
  { id: 'jetbrains', label: 'JetBrains Mono', css: "'JetBrains Mono', monospace" },
  { id: 'outfit', label: 'Outfit', css: "'Outfit', sans-serif" },
  { id: 'playfair', label: 'Playfair Display', css: "'Playfair Display', serif" },
  { id: 'roboto', label: 'Roboto', css: "'Roboto', sans-serif" },
  { id: 'montserrat', label: 'Montserrat', css: "'Montserrat', sans-serif" },
  { id: 'poppins', label: 'Poppins', css: "'Poppins', sans-serif" },
  { id: 'ubuntu', label: 'Ubuntu', css: "'Ubuntu', sans-serif" },
  { id: 'open-sans', label: 'Open Sans', css: "'Open Sans', sans-serif" },
  { id: 'syne', label: 'Syne', css: "'Syne', sans-serif" },
  { id: 'lexend', label: 'Lexend', css: "'Lexend', sans-serif" },
];

export const translations = {
  es: {
    dashboard: 'Dashboard', subjects: 'Materias', tasks: 'Trabajos',
    planner: 'PLANIFICADOR SEMANAL', pomodoro: 'Estudio', profile: 'Ajustes', analytics: 'Analítica',
    stats: 'Estadísticas', addSubject: 'Añadir Materia', subjectName: 'Nombre del Curso', code: 'Código',
    teacher: 'Profesor', institution: 'Institución', tetherColor: 'Color Identificador', save: 'Registrar',
    delete: 'Eliminar', editColor: 'Editar Color', emptyDatabase: 'Base de Datos Vacía',
    pendingTasks: 'Pendientes', doing: 'En Proceso', done: 'Finalizados', submitted: 'ENTREGADOS',
    newTask: 'Nuevo Trabajo', taskTitle: 'Título del Trabajo', startDate: 'Fecha Inicial',
    dueDate: 'Fecha Límite', subject: 'Materia', cancel: 'Cancelar', execute: 'GUARDAR',
    dragHint: 'Arrastra las tarjetas entre columnas', lightMode: 'Modo Claro', darkMode: 'Modo Oscuro',
    daltonicMode: 'Modo Daltónico', language: 'Idioma', typography: 'Tipografía', themeMode: 'Tema Visual',
    settingsTitle: 'Perfil y Ajustes', noEvents: 'Sin eventos programados',
    addActivity: 'Nueva Actividad', activityTitle: '¿Qué harás?',
    startTime: 'Hora Inicio', duration: 'Duración (min)', focusMode: 'Enfoque',
    shortBreak: 'Descanso Corto', longBreak: 'Descanso Largo', activeStatus: 'ACTIVO',
    pausedStatus: 'PAUSADO', welcomeBack: 'Bienvenido', systemOverview: 'Resumen del Sistema',
    activeSubjects: 'Materias Activas', inProgress: 'En Progreso', deliveryRadar: 'Radar de Entregas',
    noDeliveries: 'Sin entregas próximas', dueToday: 'ENTREGA HOY', customInstitution: 'Personalizado',
    selectInstitution: 'Selecciona institución...', selectSubject: 'Selecciona materia...',
    uploadPhoto: 'Subir Foto', userName: 'Tu Nombre', layoutPos: 'Posición del Menú',
    left: 'Izquierda', right: 'Derecha', top: 'Arriba', bottom: 'Abajo',
    close: 'Cerrar', editTask: 'Editar Trabajo', appearance: 'Apariencia',
    wallpapers: 'Fondos de Pantalla', fontSize: 'Tamaño de Fuente', login: 'Iniciar Sesión',
    logout: 'Cerrar Sesión', welcome: '¡Bienvenido!', username: 'Nombre de usuario',
    password: 'Contraseña', enterDetails: 'Ingresa tus datos para continuar',
    getStarted: 'Empezar ahora', demoUser: 'Usuario Demo'
  },
  en: {
    dashboard: 'Dashboard', subjects: 'Subjects', tasks: 'Tasks',
    planner: 'Daily Planner', pomodoro: 'Study', profile: 'Settings', analytics: 'Analytics',
    stats: 'Statistics', addSubject: 'Add Subject', subjectName: 'Course Name', code: 'Code (Optional)',
    teacher: 'Teacher (Optional)', institution: 'Institution', tetherColor: 'Tether Color',
    save: 'Register', delete: 'Delete', editColor: 'Edit Color', emptyDatabase: 'Empty Database',
    pendingTasks: 'Pending', doing: 'In Progress', done: 'Done', submitted: 'Submitted',
    newTask: 'New Task', taskTitle: 'Task Title', startDate: 'Start Date', dueDate: 'Due Date',
    subject: 'Subject', cancel: 'Cancel', execute: 'Save', dragHint: 'Drag cards between columns',
    lightMode: 'Light Mode', darkMode: 'Dark Mode', daltonicMode: 'Colorblind Mode',
    language: 'Language', typography: 'Typography', themeMode: 'Visual Theme',
    settingsTitle: 'Profile & Settings', noEvents: 'No scheduled events',
    addActivity: 'New Activity', activityTitle: 'What will you do?',
    startTime: 'Start Time', duration: 'Duration (min)', focusMode: 'Focus',
    shortBreak: 'Short Break', longBreak: 'Long Break', activeStatus: 'ACTIVE',
    pausedStatus: 'PAUSED', welcomeBack: 'Welcome back', systemOverview: 'System Overview',
    activeSubjects: 'Active Subjects', inProgress: 'In Progress', deliveryRadar: 'Delivery Radar',
    noDeliveries: 'No upcoming deliveries', dueToday: 'DUE TODAY', customInstitution: 'Custom',
    selectInstitution: 'Select institution...', selectSubject: 'Select subject...',
    uploadPhoto: 'Upload Photo', userName: 'Your Name', layoutPos: 'Menu Position',
    left: 'Left', right: 'Right', top: 'Top', bottom: 'Bottom',
    close: 'Close', editTask: 'Edit Task', appearance: 'Appearance',
    wallpapers: 'Wallpapers', fontSize: 'Font Size', login: 'Login',
    logout: 'Logout', welcome: 'Welcome!', username: 'Username',
    password: 'Password', enterDetails: 'Enter your details to continue',
    getStarted: 'Get Started', demoUser: 'Demo User'
  }
};

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    theme: localStorage.getItem('campusflow_theme') || 'dark',
    language: 'es',
    font: 'space-grotesk',
    name: 'Mateo',
    experience: 0,
    level: 1,
    stats: { pomodorosCompleted: 0, tasksCompleted: 0 },
    wallpaper: 'cyber',
    sidebarPosition: 'left',
    fontSize: Number(localStorage.getItem('campusflow_font_size')) || 16,
    avatarUrl: null,
    customWallpaper: null,
    two_factor_enabled: false,
    emailNotifications: localStorage.getItem('cf_email_notif') === 'true',
    redAlertFreq: localStorage.getItem('cf_red_freq') || 'diario',
    yellowAlertFreq: localStorage.getItem('cf_yellow_freq') || 'diario',
    greenAlertFreq: localStorage.getItem('cf_green_freq') || 'diario',
    redAlertCustomDays: Number(localStorage.getItem('cf_red_custom_days')) || 1,
    yellowAlertCustomDays: Number(localStorage.getItem('cf_yellow_custom_days')) || 1,
    greenAlertCustomDays: Number(localStorage.getItem('cf_green_custom_days')) || 1,
    redAlertTimes: JSON.parse(localStorage.getItem('cf_red_times') || '["08:00"]'),
    yellowAlertTimes: JSON.parse(localStorage.getItem('cf_yellow_times') || '["08:00"]'),
    greenAlertTimes: JSON.parse(localStorage.getItem('cf_green_times') || '["08:00"]')
  });
  const [recentXPGains, setRecentXPGains] = useState([]);
  // No mostramos preferencias remotas como si fueran valores definitivos antes
  // de que el perfil de Supabase termine de cargar.
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Ref espejo de `settings`, para que updateSettings pueda leer el valor más
  // reciente sin necesitar `settings` en su lista de dependencias de useCallback
  // (eso mantiene su identidad estable entre renders, en vez de recrearse cada
  // vez que cambia cualquier ajuste).
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const fetchProfile = useCallback(async (uid) => {
    try {
      // CARGA BLINDADA Y SINCRONIZADA CON full_name, wallpaper_id, theme, two_factor_enabled Y email_notifications
      let { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, language, typography, font_size, custom_wallpaper, wallpaper_id, avatar_url, xp, level, theme, two_factor_enabled, email_notifications, red_alert_freq, yellow_alert_freq, green_alert_freq, red_alert_custom_days, yellow_alert_custom_days, green_alert_custom_days, in_app_alerts_enabled, red_alert_times, yellow_alert_times, green_alert_times')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn("Error en carga de perfil, intentando fallback de columnas seguras...", error.message);
        // Fallback: consultamos todas las columnas antiguas si las nuevas (_times) rompen la query (400)
        const safeFetch = await supabase
          .from('profiles')
          .select('id, full_name, language, typography, font_size, custom_wallpaper, wallpaper_id, avatar_url, xp, level, theme, two_factor_enabled, email_notifications, red_alert_freq, yellow_alert_freq, green_alert_freq, red_alert_custom_days, yellow_alert_custom_days, green_alert_custom_days, in_app_alerts_enabled')
          .eq('id', uid)
          .maybeSingle();
        data = safeFetch.data || {};
      }

      if (data) {
        const fullAvatarUrl = data.avatar_url
          ? (data.avatar_url.startsWith('http') ? data.avatar_url : `https://tknrxiksvsmygtszlytf.supabase.co/storage/v1/object/public/avatars/${data.avatar_url}`)
          : '';

        setSettings(prev => ({
          ...prev,
          name: data.full_name || 'Mateo',
          theme: data.theme || 'dark',
          language: data.language || 'es',
          font: data.typography || 'space-grotesk',
          fontSize: Number(data.font_size) || prev.fontSize || 16,
          experience: data.xp || 0,
          level: data.level || 1,
          wallpaper: data.custom_wallpaper ? 'custom' : (data.wallpaper_id || 'cyber'),
          customWallpaper: data.custom_wallpaper || null,
          avatarUrl: fullAvatarUrl,
          two_factor_enabled: data.two_factor_enabled || false,
          emailNotifications: data.email_notifications ?? false,
          redAlertFreq: data.red_alert_freq || prev.redAlertFreq || 'diario',
          yellowAlertFreq: data.yellow_alert_freq || prev.yellowAlertFreq || 'diario',
          greenAlertFreq: data.green_alert_freq || prev.greenAlertFreq || 'diario',
          redAlertCustomDays: Number(data.red_alert_custom_days) || prev.redAlertCustomDays || 1,
          yellowAlertCustomDays: Number(data.yellow_alert_custom_days) || prev.yellowAlertCustomDays || 1,
          greenAlertCustomDays: Number(data.green_alert_custom_days) || prev.greenAlertCustomDays || 1,
          redAlertTimes: (data.red_alert_times && Array.isArray(data.red_alert_times)) ? data.red_alert_times : (prev.redAlertTimes || ['08:00']),
          yellowAlertTimes: (data.yellow_alert_times && Array.isArray(data.yellow_alert_times)) ? data.yellow_alert_times : (prev.yellowAlertTimes || ['08:00']),
          greenAlertTimes: (data.green_alert_times && Array.isArray(data.green_alert_times)) ? data.green_alert_times : (prev.greenAlertTimes || ['08:00'])
        }));
      }
    } catch (err) {
      console.error("Error crítico al cargar perfil:", err.message);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    if (!user) {
      setSettingsLoading(false);
      return () => { isCurrent = false; };
    }

    setSettingsLoading(true);
    fetchProfile(user.id).finally(() => {
      if (isCurrent) setSettingsLoading(false);
    });

    return () => { isCurrent = false; };
  }, [user, fetchProfile]);

  const updateSettings = useCallback(async (updates) => {
    let processedUpdates = { ...updates };
    if (updates.wallpaper && updates.wallpaper !== 'custom') {
      processedUpdates.customWallpaper = null;
    }

    // Snapshot del valor previo (antes del optimistic update), para poder revertir
    // la UI si Supabase rechaza el guardado y así nunca quede desincronizada de la nube.
    // Se lee de settingsRef (no de `settings` directo) para que esta función mantenga
    // una identidad estable entre renders y no obligue a recrear el value del Provider.
    const currentSettings = settingsRef.current;
    const settingsSnapshotBeforeUpdate = {};
    Object.keys(processedUpdates).forEach(key => { settingsSnapshotBeforeUpdate[key] = currentSettings[key]; });

    setSettings(prev => ({ ...prev, ...processedUpdates }));

    if (user) {
      if (processedUpdates.fontSize) {
        localStorage.setItem('campusflow_font_size', processedUpdates.fontSize);
        const safeFsUpdate = (Number(processedUpdates.fontSize) > 0 && Number(processedUpdates.fontSize) <= 2)
          ? Math.round(Number(processedUpdates.fontSize) * 16)
          : (Number(processedUpdates.fontSize) || 16);
        document.documentElement.style.fontSize = safeFsUpdate + 'px';
      }

      const cloudMapping = {};
      if (processedUpdates.name !== undefined) cloudMapping.full_name = processedUpdates.name;
      if (processedUpdates.theme) {
        cloudMapping.theme = processedUpdates.theme;
        localStorage.setItem('campusflow_theme', processedUpdates.theme);
        trackEvent('theme_switched', { theme: processedUpdates.theme });
      }
      if (processedUpdates.language) cloudMapping.language = processedUpdates.language;
      if (processedUpdates.font) cloudMapping.typography = processedUpdates.font;
      if (processedUpdates.fontSize) cloudMapping.font_size = Number(processedUpdates.fontSize);
      if (processedUpdates.two_factor_enabled !== undefined) cloudMapping.two_factor_enabled = processedUpdates.two_factor_enabled;
      // Preferencia real de notificaciones por correo y frecuencias
      if (processedUpdates.emailNotifications !== undefined) {
        cloudMapping.email_notifications = processedUpdates.emailNotifications;
        localStorage.setItem('cf_email_notif', processedUpdates.emailNotifications);
      }
      if (processedUpdates.redAlertFreq !== undefined) {
        cloudMapping.red_alert_freq = processedUpdates.redAlertFreq;
        localStorage.setItem('cf_red_freq', processedUpdates.redAlertFreq);
      }
      if (processedUpdates.yellowAlertFreq !== undefined) {
        cloudMapping.yellow_alert_freq = processedUpdates.yellowAlertFreq;
        localStorage.setItem('cf_yellow_freq', processedUpdates.yellowAlertFreq);
      }
      if (processedUpdates.greenAlertFreq !== undefined) {
        cloudMapping.green_alert_freq = processedUpdates.greenAlertFreq;
        localStorage.setItem('cf_green_freq', processedUpdates.greenAlertFreq);
      }
      if (processedUpdates.redAlertCustomDays !== undefined) {
        cloudMapping.red_alert_custom_days = Number(processedUpdates.redAlertCustomDays);
        localStorage.setItem('cf_red_custom_days', Number(processedUpdates.redAlertCustomDays));
      }
      if (processedUpdates.yellowAlertCustomDays !== undefined) {
        cloudMapping.yellow_alert_custom_days = Number(processedUpdates.yellowAlertCustomDays);
        localStorage.setItem('cf_yellow_custom_days', Number(processedUpdates.yellowAlertCustomDays));
      }
      if (processedUpdates.greenAlertCustomDays !== undefined) {
        cloudMapping.green_alert_custom_days = Number(processedUpdates.greenAlertCustomDays);
        localStorage.setItem('cf_green_custom_days', Number(processedUpdates.greenAlertCustomDays));
      }
      if (processedUpdates.redAlertTimes !== undefined) {
        cloudMapping.red_alert_times = processedUpdates.redAlertTimes;
        localStorage.setItem('cf_red_times', JSON.stringify(processedUpdates.redAlertTimes));
      }
      if (processedUpdates.yellowAlertTimes !== undefined) {
        cloudMapping.yellow_alert_times = processedUpdates.yellowAlertTimes;
        localStorage.setItem('cf_yellow_times', JSON.stringify(processedUpdates.yellowAlertTimes));
      }
      if (processedUpdates.greenAlertTimes !== undefined) {
        cloudMapping.green_alert_times = processedUpdates.greenAlertTimes;
        localStorage.setItem('cf_green_times', JSON.stringify(processedUpdates.greenAlertTimes));
      }

      if (updates.wallpaper !== undefined) {
        if (updates.wallpaper === 'custom') {
          // customWallpaper ahora es la URL pública de Supabase Storage (bucket 'avatars'),
          // no un Base64. Sigue validando longitud > 10 para descartar valores vacíos/inválidos.
          cloudMapping.custom_wallpaper = (processedUpdates.customWallpaper?.length > 10) ? processedUpdates.customWallpaper : null;
        } else {
          cloudMapping.wallpaper_id = updates.wallpaper;
          cloudMapping.custom_wallpaper = null;
        }
      }

      if (processedUpdates.avatarUrl !== undefined) {
        cloudMapping.avatar_url = processedUpdates.avatarUrl;
        if (!processedUpdates.avatarUrl.startsWith('http') && !processedUpdates.avatarUrl.startsWith('blob')) {
          const fullUrl = `https://tknrxiksvsmygtszlytf.supabase.co/storage/v1/object/public/avatars/${processedUpdates.avatarUrl}`;
          setSettings(prev => ({ ...prev, avatarUrl: fullUrl }));
        }
      }

      if (Object.keys(cloudMapping).length > 0) {
        try {
          const { error } = await supabase.from('profiles').update(cloudMapping).eq('id', user.id);
          if (error) throw error;
        } catch (dbErr) {
          console.error("Error en persistencia:", dbErr.message);

          // SILENCIAR ERROR BD SI ES POR COLUMNAS DE ALERTAS NUEVAS
          const errorMsg = dbErr.message?.toLowerCase() || '';
          const isAlertTimesError = errorMsg.includes('red_alert_times') || errorMsg.includes('yellow_alert_times') || errorMsg.includes('green_alert_times') || dbErr.code === 'PGRST204';
            
          if (isAlertTimesError) {
            console.warn("Ignorando error de base de datos por columnas faltantes, usando fallback en memoria.");
            return; // Terminamos sin revertir el estado local optimista
          }

          // CRÍTICO: si Supabase rechaza el guardado (RLS, red, permisos), la UI NO debe
          // quedarse mostrando el valor optimista como si se hubiera guardado. Antes este
          // catch solo hacía console.error, así que un toggle podía verse "activado" en
          // pantalla para siempre mientras la base de datos seguía en false/null. Ahora se
          // revierte el estado local a lo que en verdad hay en la nube y se avisa al usuario.
          setSettings(prev => ({ ...prev, ...settingsSnapshotBeforeUpdate }));
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('campusflow:settings-save-error', {
              detail: { message: dbErr.message || 'No se pudo guardar el cambio.' }
            }));
          }
        }
      }
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    const fontObj = FONT_OPTIONS.find(f => f.id === settings.font || f.css.includes(settings.font));
    if (fontObj) {
      document.documentElement.style.setProperty('--font-display', fontObj.css);
      document.documentElement.style.setProperty('--font-body', fontObj.css);
    }
    // Normalize fontSize: values <= 2 are legacy decimal multipliers, convert to px
    const safeFontSize = (Number(settings.fontSize) > 0 && Number(settings.fontSize) <= 2)
      ? Math.round(Number(settings.fontSize) * 16)
      : (Number(settings.fontSize) || 16);
    document.documentElement.style.fontSize = safeFontSize + 'px';
  }, [settings]);

  const addXP = useCallback((amount) => {
    if (amount === 0 || !user) return;
    setSettings(prev => {
      const xpPerLevel = 1000;
      let totalXP = (prev.level - 1) * xpPerLevel + prev.experience + amount;
      if (totalXP < 0) totalXP = 0;
      let newLevel = Math.floor(totalXP / xpPerLevel) + 1;
      let newXP = totalXP % xpPerLevel;
      return { ...prev, experience: newXP, level: newLevel };
    });
  }, [user]);

  const incrementStat = useCallback((statName, amount = 1) => {
    setSettings(prev => {
      const newStats = { ...prev.stats, [statName]: (prev.stats[statName] || 0) + amount };
      return { ...prev, stats: newStats };
    });
  }, []);

  const t = translations[settings.language] || translations.es;

  // Memoizado: sin esto, el Provider crea un objeto `value` nuevo en cada render,
  // lo que fuerza a re-renderizar TODOS los componentes que usan useSettings()
  // en toda la app, aunque el cambio no les afecte (ej. cambiar recentXPGains
  // re-renderizaría el Sidebar entero aunque él solo lea `settings.theme`).
  const value = useMemo(() => ({
    settings, settingsLoading, updateSettings, t, addXP, incrementStat, recentXPGains
  }), [settings, settingsLoading, updateSettings, t, addXP, incrementStat, recentXPGains]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

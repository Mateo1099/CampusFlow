import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

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
    planner: 'PLANIFICADOR SEMANAL', pomodoro: 'Pomodoro', profile: 'Ajustes', analytics: 'Analítica',
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
    planner: 'Daily Planner', pomodoro: 'Pomodoro', profile: 'Settings', analytics: 'Analytics',
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
    theme: 'dark', language: 'es', font: 'space-grotesk', name: 'Mateo',
    experience: 0, level: 1, stats: { pomodorosCompleted: 0, tasksCompleted: 0 },
    wallpaper: 'cyber', sidebarPosition: 'left', 
    fontSize: Number(localStorage.getItem('campusflow_font_size')) || 16,
    avatarUrl: null, customWallpaper: null
  });
  const [recentXPGains, setRecentXPGains] = useState([]);

  const fetchProfile = useCallback(async (uid) => {
    try {
      // CARGA BLINDADA Y SINCRONIZADA CON full_name Y wallpaper_id
      let { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, language, typography, font_size, custom_wallpaper, wallpaper_id, avatar_url, xp, level')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn("Error en carga de perfil, intentando fallback de columnas...");
        const safeFetch = await supabase
          .from('profiles')
          .select('id, language, typography, font_size, avatar_url, xp, level')
          .eq('id', uid)
          .maybeSingle();
        data = safeFetch.data;
      }

      if (data) {
        const fullAvatarUrl = data.avatar_url 
          ? (data.avatar_url.startsWith('http') ? data.avatar_url : `https://tknrxiksvsmygtszlytf.supabase.co/storage/v1/object/public/avatars/${data.avatar_url}`)
          : '';

        setSettings(prev => ({
          ...prev,
          name: data.full_name || 'Mateo',
          language: data.language || 'es',
          font: data.typography || 'space-grotesk',
          fontSize: Number(data.font_size) || prev.fontSize || 16,
          experience: data.xp || 0,
          level: data.level || 1,
          wallpaper: data.custom_wallpaper ? 'custom' : (data.wallpaper_id || 'cyber'),
          customWallpaper: data.custom_wallpaper || null,
          avatarUrl: fullAvatarUrl
        }));
      }
    } catch (err) {
      console.error("Error crítico al cargar perfil:", err.message);
    }
  }, []);

  useEffect(() => {
    if (user) fetchProfile(user.id);
  }, [user, fetchProfile]);

  const updateSettings = async (updates) => {
    let processedUpdates = { ...updates };
    if (updates.wallpaper && updates.wallpaper !== 'custom') {
      processedUpdates.customWallpaper = null;
    }

    setSettings(prev => ({ ...prev, ...processedUpdates }));
    
    if (user) {
      if (processedUpdates.fontSize) {
        localStorage.setItem('campusflow_font_size', processedUpdates.fontSize);
        document.documentElement.style.fontSize = processedUpdates.fontSize + 'px';
      }

      const cloudMapping = {};
      if (processedUpdates.name !== undefined) cloudMapping.full_name = processedUpdates.name;
      if (processedUpdates.language) cloudMapping.language = processedUpdates.language;
      if (processedUpdates.font) cloudMapping.typography = processedUpdates.font;
      if (processedUpdates.fontSize) cloudMapping.font_size = Number(processedUpdates.fontSize);
      
      if (updates.wallpaper !== undefined) {
        if (updates.wallpaper === 'custom') {
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
        }
      }
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    const fontObj = FONT_OPTIONS.find(f => f.id === settings.font || f.css.includes(settings.font));
    if (fontObj) {
      document.documentElement.style.setProperty('--font-display', fontObj.css);
      document.documentElement.style.setProperty('--font-body', fontObj.css);
    }
    document.documentElement.style.fontSize = settings.fontSize + 'px';
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

  const value = {
    settings, updateSettings, t, addXP, incrementStat, recentXPGains
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

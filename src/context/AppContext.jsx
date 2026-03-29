import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTasks } from '../hooks/useTasks';
import { useCourses } from '../hooks/useCourses';
import { useHabits } from '../hooks/useHabits';

import glassWallpaper from '../assets/glass_wallpaper.png';
import natureGlass from '../assets/nature_glass.png';
import synthwaveNeon from '../assets/synthwave_neon.png';
import spaceMinimal from '../assets/space_minimal.png';

export const WALLPAPERS = [
  { id: 'custom', label: 'Personalizado', src: null },
  { id: 'cyber', label: 'Cyber Glass', src: glassWallpaper },
  { id: 'nature', label: 'Forest Glass', src: natureGlass },
  { id: 'synth', label: 'Synthwave Neon', src: synthwaveNeon },
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

const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

// Traducciones
export const translations = {
  es: {
    dashboard: 'Dashboard', subjects: 'Materias', tasks: 'Trabajos',
    planner: 'Planificador Diario', pomodoro: 'Pomodoro', profile: 'Ajustes', analytics: 'Analítica',
    stats: 'Estadísticas', addSubject: 'Añadir Materia', subjectName: 'Nombre del Curso', code: 'Código',
    teacher: 'Profesor', institution: 'Institución', tetherColor: 'Color Identificador', save: 'Registrar',
    delete: 'Eliminar', editColor: 'Editar Color', emptyDatabase: 'Base de Datos Vacía',
    pendingTasks: 'Pendientes', doing: 'En Proceso', done: 'Finalizados', submitted: 'Entregados',
    newTask: 'Nuevo Trabajo', taskTitle: 'Título del Trabajo', startDate: 'Fecha Inicial',
    dueDate: 'Fecha Límite', subject: 'Materia', cancel: 'Cancelar', execute: 'Guardar',
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

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    theme: 'dark', language: 'es', font: 'space-grotesk', userName: '',
    experience: 0, level: 1, stats: { pomodorosCompleted: 0, tasksCompleted: 0 },
    wallpaper: 'cyber', sidebarPosition: 'left', fontSize: 16
  });
  const [loading, setLoading] = useState(true);
  const [recentXPGains, setRecentXPGains] = useState([]);

  // Auth & Sync
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setSettings({
          theme: 'dark', language: 'es', font: 'space-grotesk', userName: '',
          experience: 0, level: 1, stats: { pomodorosCompleted: 0, tasksCompleted: 0 },
          wallpaper: 'cyber', sidebarPosition: 'left', fontSize: 16
        });
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) {
      setSettings(prev => ({
        ...prev,
        ...data.settings,
        userName: data.full_name || data.username || prev.userName,
        experience: data.xp || 0,
        level: data.level || 1
      }));
    }
    setLoading(false);
  };

  const updateProfileOnCloud = useCallback(async (updates) => {
    if (!user) return;
    await supabase.from('profiles').update(updates).eq('id', user.id);
  }, [user]);

  // UI Effects
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    const fontObj = FONT_OPTIONS.find(f => f.id === settings.font);
    if (fontObj) {
      document.documentElement.style.setProperty('--font-display', fontObj.css);
      document.documentElement.style.setProperty('--font-body', fontObj.css);
    }
    document.documentElement.style.fontSize = settings.fontSize + 'px';
  }, [settings]);

  // Gamification
  const addXP = useCallback((amount) => {
    if (amount === 0 || !user) return;
    
    setSettings(prev => {
      const xpPerLevel = 1000;
      let totalXP = (prev.level - 1) * xpPerLevel + prev.experience + amount;
      if (totalXP < 0) totalXP = 0;
      let newLevel = Math.floor(totalXP / xpPerLevel) + 1;
      let newXP = totalXP % xpPerLevel;
      
      const newSettings = { ...prev, experience: newXP, level: newLevel };
      updateProfileOnCloud({ xp: newXP, level: newLevel, settings: newSettings });
      return newSettings;
    });

    if (amount > 0) {
      const id = Date.now();
      setRecentXPGains(prev => [...prev.slice(-2), { id, amount }]);
      setTimeout(() => setRecentXPGains(prev => prev.filter(g => g.id !== id)), 1500);
    }
  }, [user, updateProfileOnCloud]);

  const incrementStat = useCallback((statName, amount = 1) => {
    setSettings(prev => {
      const newStats = { ...prev.stats, [statName]: (prev.stats[statName] || 0) + amount };
      const newSettings = { ...prev, stats: newStats };
      updateProfileOnCloud({ settings: newSettings });
      return newSettings;
    });
  }, [updateProfileOnCloud]);

  // Hooks de Datos (Centralizados)
  const { tasks, addTask, updateTaskStatus, deleteTask, updateTask, updateTaskSchedule, tasksLoading } = useTasks(user?.id, addXP, incrementStat);
  const { courses, addCourse, updateCourse, deleteCourse, coursesLoading } = useCourses(user?.id);
  const { dailyPlan, addHabit: addDailyActivity, toggleHabitLog: toggleDailyActivity, deleteHabit: removeDailyActivity, habitsLoading, logs } = useHabits(user?.id, addXP, incrementStat);

  // Analytics Globales
  const analytics = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'submitted').length;
    const totalHabits = dailyPlan.length;
    const completedHabits = dailyPlan.filter(h => h.completed).length;
    
    // Productividad por día (L-D)
    const productivity = [0, 0, 0, 0, 0, 0, 0];
    const dayMap = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
    
    tasks.forEach(t => {
      if (t.status === 'submitted' && t.day && dayMap[t.day] !== undefined) {
        productivity[dayMap[t.day]] += 1;
      }
    });

    return { totalTasks, completedTasks, totalHabits, completedHabits, productivity };
  }, [tasks, dailyPlan]);

  const login = (userData) => {
    setUser(userData);
    fetchProfile(userData.id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateSettings = (updates) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      updateProfileOnCloud({ settings: newSettings });
      return newSettings;
    });
  };

  const t = translations[settings.language] || translations.es;

  const value = {
    courses, addCourse, deleteCourse, updateCourse, coursesLoading,
    tasks, addTask, updateTaskStatus, deleteTask, updateTask, updateTaskSchedule, tasksLoading,
    dailyPlan, addDailyActivity, toggleDailyActivity, removeDailyActivity, habitsLoading,
    settings, updateSettings, t, addXP, incrementStat, recentXPGains,
    user, login, logout, isAuthenticated: !!user, loading, analytics
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

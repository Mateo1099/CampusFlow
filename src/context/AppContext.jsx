import React, { createContext, useState, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';

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

const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

// Traducciones expandidas
export const translations = {
  es: {
    dashboard: 'Dashboard', subjects: 'Materias', tasks: 'Trabajos',
    planner: 'Planificador Diario', pomodoro: 'Pomodoro', profile: 'Ajustes', analytics: 'Analítica',
    stats: 'Estadísticas',
    addSubject: 'Añadir Materia', subjectName: 'Nombre del Curso', code: 'Código',
    teacher: 'Profesor', institution: 'Institución',
    tetherColor: 'Color Identificador', save: 'Registrar', delete: 'Eliminar',
    editColor: 'Editar Color', emptyDatabase: 'Base de Datos Vacía',
    pendingTasks: 'Pendientes', doing: 'En Proceso', done: 'Finalizados', submitted: 'Entregados',
    newTask: 'Nuevo Trabajo', taskTitle: 'Título del Trabajo', startDate: 'Fecha Inicial',
    dueDate: 'Fecha Límite', subject: 'Materia', cancel: 'Cancelar', execute: 'Guardar',
    dragHint: 'Arrastra las tarjetas entre columnas',
    lightMode: 'Modo Claro', darkMode: 'Modo Oscuro', daltonicMode: 'Modo Daltónico',
    language: 'Idioma', typography: 'Tipografía', themeMode: 'Tema Visual',
    settingsTitle: 'Perfil y Ajustes', noEvents: 'Sin eventos programados',
    addActivity: 'Nueva Actividad', activityTitle: '¿Qué harás?',
    startTime: 'Hora Inicio', duration: 'Duración (min)',
    focusMode: 'Enfoque', shortBreak: 'Descanso Corto', longBreak: 'Descanso Largo',
    activeStatus: 'ACTIVO', pausedStatus: 'PAUSADO',
    welcomeBack: 'Bienvenido', systemOverview: 'Resumen del Sistema',
    activeSubjects: 'Materias Activas', inProgress: 'En Progreso',
    deliveryRadar: 'Radar de Entregas', noDeliveries: 'Sin entregas próximas',
    dueToday: 'ENTREGA HOY',
    customInstitution: 'Personalizado',
    selectInstitution: 'Selecciona institución...',
    selectSubject: 'Selecciona materia...',
    uploadPhoto: 'Subir Foto',
    userName: 'Tu Nombre',
    layoutPos: 'Posición del Menú',
    left: 'Izquierda', right: 'Derecha', top: 'Arriba', bottom: 'Abajo',
    close: 'Cerrar',
    editTask: 'Editar Trabajo',
    appearance: 'Apariencia',
    wallpapers: 'Fondos de Pantalla',
    fontSize: 'Tamaño de Fuente',
    login: 'Iniciar Sesión',
    logout: 'Cerrar Sesión',
    welcome: '¡Bienvenido!',
    username: 'Nombre de usuario',
    password: 'Contraseña',
    enterDetails: 'Ingresa tus datos para continuar',
    getStarted: 'Empezar ahora',
    demoUser: 'Usuario Demo'
  },
  en: {
    dashboard: 'Dashboard', subjects: 'Subjects', tasks: 'Tasks',
    planner: 'Daily Planner', pomodoro: 'Pomodoro', profile: 'Settings', analytics: 'Analytics',
    stats: 'Statistics',
    addSubject: 'Add Subject', subjectName: 'Course Name', code: 'Code (Optional)',
    teacher: 'Teacher (Optional)', institution: 'Institution',
    tetherColor: 'Tether Color', save: 'Register', delete: 'Delete',
    editColor: 'Edit Color', emptyDatabase: 'Empty Database',
    pendingTasks: 'Pending', doing: 'In Progress', done: 'Done', submitted: 'Submitted',
    newTask: 'New Task', taskTitle: 'Task Title', startDate: 'Start Date',
    dueDate: 'Due Date', subject: 'Subject', cancel: 'Cancel', execute: 'Save',
    dragHint: 'Drag cards between columns',
    lightMode: 'Light Mode', darkMode: 'Dark Mode', daltonicMode: 'Colorblind Mode',
    language: 'Language', typography: 'Typography', themeMode: 'Visual Theme',
    settingsTitle: 'Profile & Settings', noEvents: 'No scheduled events',
    addActivity: 'New Activity', activityTitle: 'What will you do?',
    startTime: 'Start Time', duration: 'Duration (min)',
    focusMode: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break',
    activeStatus: 'ACTIVE', pausedStatus: 'PAUSED',
    welcomeBack: 'Welcome back', systemOverview: 'System Overview',
    activeSubjects: 'Active Subjects', inProgress: 'In Progress',
    deliveryRadar: 'Delivery Radar', noDeliveries: 'No upcoming deliveries',
    dueToday: 'DUE TODAY',
    customInstitution: 'Custom',
    selectInstitution: 'Select institution...',
    selectSubject: 'Select subject...',
    uploadPhoto: 'Upload Photo',
    userName: 'Your Name',
    layoutPos: 'Menu Position',
    left: 'Left', right: 'Right', top: 'Top', bottom: 'Bottom',
    close: 'Close',
    editTask: 'Edit Task',
    appearance: 'Appearance',
    wallpapers: 'Wallpapers',
    fontSize: 'Font Size',
    login: 'Login',
    logout: 'Logout',
    welcome: 'Welcome!',
    username: 'Username',
    password: 'Password',
    enterDetails: 'Enter your details to continue',
    getStarted: 'Get Started',
    demoUser: 'Demo User'
  },
  pt: {
    dashboard: 'Painel', subjects: 'Matérias', tasks: 'Trabalhos',
    planner: 'Planejador Diário', pomodoro: 'Pomodoro', profile: 'Perfil', analytics: 'Analítica',
    stats: 'Estatísticas',
    addSubject: 'Adicionar Matéria', subjectName: 'Nome do Curso', code: 'Código (Opcional)',
    teacher: 'Professor (Opcional)', institution: 'Instituição',
    tetherColor: 'Cor de Identificação', save: 'Registrar', delete: 'Excluir',
    editColor: 'Editar Cor', emptyDatabase: 'Banco de Dados Vazio',
    pendingTasks: 'Pendentes', doing: 'Em Progresso', done: 'Finalizados', submitted: 'Entregues',
    newTask: 'Novo Trabalho', taskTitle: 'Título do Trabalho', startDate: 'Data de Início',
    dueDate: 'Data de Entrega', subject: 'Matéria', cancel: 'Cancelar', execute: 'Salvar',
    dragHint: 'Arraste os cartões entre as colunas',
    lightMode: 'Modo Claro', darkMode: 'Modo Escuro', daltonicMode: 'Modo Daltônico',
    language: 'Idioma', typography: 'Tipografía', themeMode: 'Tema Visual',
    settingsTitle: 'Perfil e Configurações', noEvents: 'Sem eventos agendados',
    addActivity: 'Nova Atividade', activityTitle: 'O que você vai fazer?',
    startTime: 'Hora de Início', duration: 'Duração (min)',
    focusMode: 'Foco', shortBreak: 'Pausa Curta', longBreak: 'Pausa Longa',
    activeStatus: 'ATIVO', pausedStatus: 'PAUSADO',
    welcomeBack: 'Bem-vindo(a)', systemOverview: 'Resumo do Sistema',
    activeSubjects: 'Matérias Ativas', inProgress: 'Em Progresso',
    deliveryRadar: 'Radar de Entregas', noDeliveries: 'Sem entregas próximas',
    dueToday: 'ENTREGA HOJE',
    customInstitution: 'Personalizado',
    selectInstitution: 'Selecionar instituição...',
    selectSubject: 'Selecionar matéria...',
    uploadPhoto: 'Enviar Foto',
    userName: 'Seu Nome',
    layoutPos: 'Posição do Menu',
    left: 'Esquerda', right: 'Direita', top: 'Acima', bottom: 'Abaixo',
    close: 'Fechar',
    editTask: 'Editar Tarefa',
    appearance: 'Aparência',
    wallpapers: 'Papéis de Parede',
    fontSize: 'Tamanho da Fonte'
  },
  fr: {
    dashboard: 'Tableau de bord', subjects: 'Matières', tasks: 'Travaux',
    planner: 'Planificateur', pomodoro: 'Pomodoro', profile: 'Profil', analytics: 'Analytique',
    stats: 'Statistiques',
    addSubject: 'Ajouter une matière', subjectName: 'Nom du cours', code: 'Code (Optionnel)',
    teacher: 'Enseignant (Optionnel)', institution: 'Institution',
    tetherColor: 'Couleur d\'identification', save: 'Enregistrer', delete: 'Supprimer',
    editColor: 'Modifier la couleur', emptyDatabase: 'Base de données vide',
    pendingTasks: 'En attente', doing: 'En cours', done: 'Terminé', submitted: 'Soumis',
    newTask: 'Nouveau travail', taskTitle: 'Titre du travail', startDate: 'Date de début',
    dueDate: 'Date d\'échéance', subject: 'Matière', cancel: 'Annuler', execute: 'Enregistrer',
    dragHint: 'Faites glisser les cartes entre les colonnes',
    lightMode: 'Mode clair', darkMode: 'Mode sombre', daltonicMode: 'Mode daltonien',
    language: 'Langue', typography: 'Typographie', themeMode: 'Thème visuel',
    settingsTitle: 'Profil et paramètres', noEvents: 'Aucun événement prévu',
    addActivity: 'Nouvelle activité', activityTitle: 'Que ferez-vous ?',
    startTime: 'Heure de début', duration: 'Durée (min)',
    focusMode: 'Concentration', shortBreak: 'Pause courte', longBreak: 'Pause longue',
    activeStatus: 'ACTIF', pausedStatus: 'PAUSE',
    welcomeBack: 'Bienvenue', systemOverview: 'Aperçu du système',
    activeSubjects: 'Matières actives', inProgress: 'En cours',
    deliveryRadar: 'Radar de livraison', noDeliveries: 'Aucune livraison à venir',
    dueToday: 'À RENDRE AUJOURD\'HUI',
    customInstitution: 'Personnalisé',
    selectInstitution: 'Choisir l\'institution...',
    selectSubject: 'Choisir la matière...',
    uploadPhoto: 'Télécharger photo',
    userName: 'Votre Nom',
    layoutPos: 'Position du Menu',
    left: 'Gauche', right: 'Droite', top: 'Haut', bottom: 'Bas',
    close: 'Fermer',
    editTask: 'Modifier le Travail',
    appearance: 'Apparence',
    wallpapers: 'Fonds d\'écran',
    fontSize: 'Taille de la Police'
  },
  de: {
    dashboard: 'Übersicht', subjects: 'Fächer', tasks: 'Aufgaben',
    planner: 'Tagesplaner', pomodoro: 'Pomodoro', profile: 'Profil', analytics: 'Statistiken',
    stats: 'Estatistiken',
    addSubject: 'Kurs hinzufügen', subjectName: 'Kursname', code: 'Code (Optional)',
    teacher: 'Lehrer (Optional)', institution: 'Institution',
    tetherColor: 'Farbe', save: 'Registrieren', delete: 'Löschen',
    editColor: 'Farbe ändern', emptyDatabase: 'Datenbank leer',
    pendingTasks: 'Ausstehend', doing: 'In Bearbeitung', done: 'Erledigt', submitted: 'Abgegeben',
    newTask: 'Neue Aufgabe', taskTitle: 'Titel', startDate: 'Startdatum',
    dueDate: 'Fälligkeitsdatum', subject: 'Fach', cancel: 'Abbrechen', execute: 'Speichern',
    dragHint: 'Karten verschieben',
    lightMode: 'Heller Modus', darkMode: 'Dunkler Modus', daltonicMode: 'Farbenblind-Modus',
    language: 'Sprache', typography: 'Typografie', themeMode: 'Visuelles Thema',
    settingsTitle: 'Profil & Einstellungen', noEvents: 'Keine Ereignisse',
    addActivity: 'Neue Aktivität', activityTitle: 'Was wirst du tun?',
    startTime: 'Startzeit', duration: 'Dauer (Min)',
    focusMode: 'Fokus', shortBreak: 'Kurze Pause', longBreak: 'Lange Pause',
    activeStatus: 'AKTIV', pausedStatus: 'PAUSIERT',
    welcomeBack: 'Willkommen zurück', systemOverview: 'Systemübersicht',
    activeSubjects: 'Aktive Kurse', inProgress: 'In Bearbeitung',
    deliveryRadar: 'Lieferradar', noDeliveries: 'Keine anstehenden Aufgaben',
    dueToday: 'HEUTE FÄLLIG',
    customInstitution: 'Benutzerdefiniert',
    selectInstitution: 'Institution wählen...',
    selectSubject: 'Fach wählen...',
    uploadPhoto: 'Foto hochladen',
    userName: 'Ihr Name',
    layoutPos: 'Menüposition',
    left: 'Links', right: 'Rechts', top: 'Oben', bottom: 'Unten',
    close: 'Schließen',
    editTask: 'Aufgabe bearbeiten',
    appearance: 'Aussehen',
    wallpapers: 'Hintergründe',
    fontSize: 'Schriftgröße'
  },
  it: {
    dashboard: 'Dashboard', subjects: 'Materie', tasks: 'Compiti',
    planner: 'Agenda Giornaliera', pomodoro: 'Pomodoro', profile: 'Impostazioni', analytics: 'Analitica',
    stats: 'Statistiche',
    addSubject: 'Aggiungi Materia', subjectName: 'Nome Corso', code: 'Codice',
    teacher: 'Insegnante', institution: 'Istituzione',
    save: 'Salva', delete: 'Elimina',
    pendingTasks: 'In attesa', doing: 'In corso', done: 'Fatto', submitted: 'Consegnato',
    language: 'Lingua', typography: 'Tipografia', themeMode: 'Tema Visivo',
    welcomeBack: 'Bentornato', layoutPos: 'Posizione Menu',
    left: 'Sinistra', right: 'Destra', top: 'Sopra', bottom: 'Sotto',
    close: 'Chiudi', appearance: 'Aspetto', wallpapers: 'Sfondi'
  },
  jp: {
    dashboard: 'ダッシュボード', subjects: '教科', tasks: '課題',
    planner: 'デイリープランナー', pomodoro: 'ポモドーロ', profile: '設定', analytics: '分析',
    stats: '統計',
    addSubject: '教科を追加', subjectName: 'コース名',
    save: '保存', delete: '削除',
    pendingTasks: '保留中', doing: '進行中', done: '完了', submitted: '提出済み',
    language: '言語', typography: 'タイポグラフィ', themeMode: '視覚テーマ',
    welcomeBack: 'おかえりなさい', layoutPos: 'メニュー位置',
    left: '左', right: '右', top: '上', bottom: '下',
    close: '閉じる', appearance: '外観', wallpapers: '壁紙'
  },
  ru: {
    dashboard: 'Панель', subjects: 'Предметы', tasks: 'Задания',
    planner: 'Планировщик', pomodoro: 'Помодоро', profile: 'Настройки', analytics: 'Аналитика',
    stats: 'Статистика',
    addSubject: 'Добавить предмет', subjectName: 'Название курса',
    save: 'Сохранить', delete: 'Удалить',
    pendingTasks: 'В ожидании', doing: 'В процессе', done: 'Готово', submitted: 'Сдано',
    language: 'Язык', typography: 'Типографика', themeMode: 'Визуальная тема',
    welcomeBack: 'С возвращением', layoutPos: 'Позиция меню',
    left: 'Слева', right: 'Справа', top: 'Сверху', bottom: 'Снизу',
    close: 'Закрыть', appearance: 'Внешний вид', wallpapers: 'Обои'
  },
  kr: {
    dashboard: '대시보드', subjects: '과목', tasks: '과제',
    planner: '일일 플래너', pomodoro: '뽀모도로', profile: '설정', analytics: '분석',
    stats: '통계',
    addSubject: '과목 추가', subjectName: '과목명',
    save: '저장', delete: '삭제',
    pendingTasks: '대기 중', doing: '진행 중', done: '완료', submitted: '제출됨',
    language: '언어', typography: '타이포그래피', themeMode: '시각 테마',
    welcomeBack: '환영합니다', layoutPos: '메뉴 위치',
    left: '왼쪽', right: '오른쪽', top: '위', bottom: '아래',
    close: '닫기', appearance: '모양', wallpapers: '배경화면',
    fontSize: '글꼴 크기'
  }
};

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

export function AppProvider({ children }) {
  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem('cf_courses');
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('cf_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyPlan, setDailyPlan] = useState(() => {
    const saved = localStorage.getItem('cf_dailyPlan');
    return saved ? JSON.parse(saved) : [];
  });

  const [recentXPGains, setRecentXPGains] = useState([]); // Array de {id, amount}

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('cf_settings');
    return saved ? JSON.parse(saved) : {
      theme: 'dark',   // 'dark' | 'light' | 'daltonic'
      language: 'es',  // 'es' | 'en' | 'pt' | 'fr' | 'de'
      font: 'space-grotesk',
      profileImage: null,
      userName: 'Mateo',
      experience: 0,
      level: 1,
      stats: {
        pomodorosCompleted: 0,
        tasksCompleted: 0,
        totalFocusMinutes: 0
      },
      wallpaper: 'cyber',
      customWallpaper: null,
      sidebarPosition: 'left', // 'left' | 'right' | 'top' | 'bottom'
      fontSize: 16
    };
  });

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cf_user');
    return saved ? JSON.parse(saved) : null;
  });

  const safeSetStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
    }
  };

  useEffect(() => { safeSetStorage('cf_courses', courses); }, [courses]);
  useEffect(() => { safeSetStorage('cf_tasks', tasks); }, [tasks]);
  useEffect(() => { safeSetStorage('cf_dailyPlan', dailyPlan); }, [dailyPlan]);
  useEffect(() => { safeSetStorage('cf_settings', settings); }, [settings]);
  useEffect(() => { safeSetStorage('cf_user', user); }, [user]);

  // Aplicar tema, fuente y tamaño al documento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    const fontObj = FONT_OPTIONS.find(f => f.id === settings.font);
    if (fontObj) {
      document.documentElement.style.setProperty('--font-display', fontObj.css);
      document.documentElement.style.setProperty('--font-body', fontObj.css);
    }
    document.documentElement.style.fontSize = settings.fontSize + 'px';
  }, [settings]);

  const t = translations[settings.language] || translations.es;

  // AUTH LOGIC
  const login = (userData) => {
    setUser(userData);
    setSettings(prev => ({ ...prev, userName: userData.name }));
  };

  const logout = () => {
    setUser(null);
  };

  // GAMIFICATION LOGIC
  const xpPerLevel = 1000;
  
  const addXP = (amount) => {
    if (amount === 0) return;
    
    // DELIGHT: Mostrar notificación visual si es positivo
    if (amount > 0) {
      const id = Date.now();
      setRecentXPGains(prev => [...prev.slice(-2), { id, amount }]);
      setTimeout(() => {
        setRecentXPGains(prev => prev.filter(g => g.id !== id));
      }, 1500);
    }
    
    setSettings(prev => {
      let totalXP = (prev.level - 1) * xpPerLevel + prev.experience + amount;
      if (totalXP < 0) totalXP = 0;
      
      let newLevel = Math.floor(totalXP / xpPerLevel) + 1;
      let newXP = totalXP % xpPerLevel;
      
      return { ...prev, experience: newXP, level: newLevel };
    });
  };

  const incrementStat = (statName, amount = 1) => {
    setSettings(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [statName]: (prev.stats[statName] || 0) + amount
      }
    }));
  };

  // CURSOS
  const addCourse = (course) => {
    setCourses([...courses, { ...course, id: uuidv4(), createdAt: new Date().toISOString() }]);
  };
  const deleteCourse = (id) => setCourses(courses.filter(c => c.id !== id));
  const updateCourse = (id, updates) => {
    setCourses(courses.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // TAREAS
  const addTask = (task) => {
    setTasks([...tasks, { ...task, id: uuidv4(), status: 'todo', createdAt: new Date().toISOString() }]);
  };
  const updateTaskStatus = (id, newStatus) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      
      const oldStatus = task.status;
      
      // LOGICA DE XP: Solo sumar al pasar a entregado
      if (oldStatus !== 'submitted' && newStatus === 'submitted') {
        addXP(100);
        incrementStat('tasksCompleted');
      } 
      // Si se revierte de entregado a otra cosa, restar el XP ganado
      else if (oldStatus === 'submitted' && newStatus !== 'submitted') {
        addXP(-100);
      }
      
      return prev.map(t => t.id === id ? { ...t, status: newStatus } : t);
    });
  };
  const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));

  // PLAN DIARIO
  const addDailyActivity = (activity) => {
    setDailyPlan([...dailyPlan, { ...activity, id: uuidv4(), completed: false }]);
  };
  const toggleDailyActivity = (id) => {
    setDailyPlan(dailyPlan.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };
  const removeDailyActivity = (id) => setDailyPlan(dailyPlan.filter(a => a.id !== id));

  // SETTINGS
  const updateSettings = (updates) => setSettings(prev => ({ ...prev, ...updates }));

  const value = {
    courses, addCourse, deleteCourse, updateCourse,
    tasks, addTask, updateTaskStatus, deleteTask,
    dailyPlan, addDailyActivity, toggleDailyActivity, removeDailyActivity,
    settings, updateSettings, t, addXP, incrementStat, recentXPGains,
    user, login, logout, isAuthenticated: !!user
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}


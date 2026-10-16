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
  },
  pt: {
    dashboard: 'Painel', subjects: 'Disciplinas', tasks: 'Tarefas',
    planner: 'PLANEJADOR SEMANAL', pomodoro: 'Estudo', profile: 'Configurações', analytics: 'Analítica',
    stats: 'Estatísticas', addSubject: 'Adicionar Disciplina', subjectName: 'Nome do Curso', code: 'Código',
    teacher: 'Professor', institution: 'Instituição', tetherColor: 'Cor Identificadora', save: 'Salvar',
    delete: 'Excluir', editColor: 'Editar Cor', emptyDatabase: 'Banco de Dados Vazio',
    pendingTasks: 'Pendentes', doing: 'Em Progresso', done: 'Concluídos', submitted: 'ENTREGUES',
    newTask: 'Nova Tarefa', taskTitle: 'Título da Tarefa', startDate: 'Data Inicial',
    dueDate: 'Data Limite', subject: 'Disciplina', cancel: 'Cancelar', execute: 'SALVAR',
    dragHint: 'Arraste os cartões entre as colunas', lightMode: 'Modo Claro', darkMode: 'Modo Escuro',
    daltonicMode: 'Modo Daltônico', language: 'Idioma', typography: 'Tipografia', themeMode: 'Tema Visual',
    settingsTitle: 'Perfil e Configurações', noEvents: 'Sem eventos programados',
    addActivity: 'Nova Atividade', activityTitle: 'O que você fará?',
    startTime: 'Hora Inicial', duration: 'Duração (min)', focusMode: 'Foco',
    shortBreak: 'Pausa Curta', longBreak: 'Pausa Longa', activeStatus: 'ATIVO',
    pausedStatus: 'PAUSADO', welcomeBack: 'Bem-vindo de volta', systemOverview: 'Visão Geral do Sistema',
    activeSubjects: 'Disciplinas Ativas', inProgress: 'Em Progresso', deliveryRadar: 'Radar de Entregas',
    noDeliveries: 'Sem entregas próximas', dueToday: 'ENTREGA HOJE', customInstitution: 'Personalizado',
    selectInstitution: 'Selecione a instituição...', selectSubject: 'Selecione a disciplina...',
    uploadPhoto: 'Carregar Foto', userName: 'Seu Nome', layoutPos: 'Posição do Menu',
    left: 'Esquerda', right: 'Direita', top: 'Cima', bottom: 'Baixo',
    close: 'Fechar', editTask: 'Editar Tarefa', appearance: 'Aparência',
    wallpapers: 'Papéis de Parede', fontSize: 'Tamanho da Fonte', login: 'Entrar',
    logout: 'Sair', welcome: 'Bem-vindo!', username: 'Nome de usuário',
    password: 'Senha', enterDetails: 'Digite seus dados para continuar',
    getStarted: 'Começar agora', demoUser: 'Usuário Demo'
  },
  fr: {
    dashboard: 'Tableau de bord', subjects: 'Matières', tasks: 'Devoirs',
    planner: 'PLANIFICATEUR HEBDOMADAIRE', pomodoro: 'Étude', profile: 'Paramètres', analytics: 'Analytique',
    stats: 'Statistiques', addSubject: 'Ajouter une matière', subjectName: 'Nom du cours', code: 'Code',
    teacher: 'Enseignant', institution: 'Établissement', tetherColor: 'Couleur repère', save: 'Enregistrer',
    delete: 'Supprimer', editColor: 'Modifier la couleur', emptyDatabase: 'Base de données vide',
    pendingTasks: 'À faire', doing: 'En cours', done: 'Terminé', submitted: 'RENDUS',
    newTask: 'Nouveau devoir', taskTitle: 'Titre du devoir', startDate: 'Date de début',
    dueDate: 'Date limite', subject: 'Matière', cancel: 'Annuler', execute: 'ENREGISTRER',
    dragHint: 'Glissez les cartes entre les colonnes', lightMode: 'Mode clair', darkMode: 'Mode sombre',
    daltonicMode: 'Mode daltonien', language: 'Langue', typography: 'Typographie', themeMode: 'Thème visuel',
    settingsTitle: 'Profil & Paramètres', noEvents: 'Aucun événement prévu',
    addActivity: 'Nouvelle activité', activityTitle: 'Que ferez-vous ?',
    startTime: 'Heure de début', duration: 'Durée (min)', focusMode: 'Concentration',
    shortBreak: 'Pause courte', longBreak: 'Pause longue', activeStatus: 'ACTIF',
    pausedStatus: 'EN PAUSE', welcomeBack: 'Bon retour', systemOverview: 'Aperçu du système',
    activeSubjects: 'Matières actives', inProgress: 'En cours', deliveryRadar: 'Radar de livraisons',
    noDeliveries: 'Aucun rendu imminent', dueToday: "À RENDRE AUJOURD'HUI", customInstitution: 'Personnalisé',
    selectInstitution: "Sélectionnez l'établissement...", selectSubject: 'Sélectionnez la matière...',
    uploadPhoto: 'Téléverser photo', userName: 'Votre nom', layoutPos: 'Position du menu',
    left: 'Gauche', right: 'Droite', top: 'Haut', bottom: 'Bas',
    close: 'Fermer', editTask: 'Modifier le devoir', appearance: 'Apparence',
    wallpapers: "Fonds d'écran", fontSize: 'Taille de police', login: 'Connexion',
    logout: 'Déconnexion', welcome: 'Bienvenue !', username: "Nom d'utilisateur",
    password: 'Mot de passe', enterDetails: 'Entrez vos identifiants pour continuer',
    getStarted: 'Commencer maintenant', demoUser: 'Utilisateur démo'
  },
  de: {
    dashboard: 'Dashboard', subjects: 'Fächer', tasks: 'Aufgaben',
    planner: 'WOCHENPLANER', pomodoro: 'Lernen', profile: 'Einstellungen', analytics: 'Analytik',
    stats: 'Statistiken', addSubject: 'Fach hinzufügen', subjectName: 'Kursname', code: 'Code',
    teacher: 'Dozent', institution: 'Institution', tetherColor: 'Kennfarbe', save: 'Speichern',
    delete: 'Löschen', editColor: 'Farbe bearbeiten', emptyDatabase: 'Leere Datenbank',
    pendingTasks: 'Ausstehend', doing: 'In Bearbeitung', done: 'Erledigt', submitted: 'ABGEGEBEN',
    newTask: 'Neue Aufgabe', taskTitle: 'Aufgabentitel', startDate: 'Startdatum',
    dueDate: 'Fälligkeitsdatum', subject: 'Fach', cancel: 'Abbrechen', execute: 'SPEICHERN',
    dragHint: 'Karten zwischen Spalten ziehen', lightMode: 'Heller Modus', darkMode: 'Dunkler Modus',
    daltonicMode: 'Farbenblind-Modus', language: 'Sprache', typography: 'Typografie', themeMode: 'Visuelles Design',
    settingsTitle: 'Profil & Einstellungen', noEvents: 'Keine Termine geplant',
    addActivity: 'Neue Aktivität', activityTitle: 'Was wirst du tun?',
    startTime: 'Startzeit', duration: 'Dauer (Min.)', focusMode: 'Fokus',
    shortBreak: 'Kurze Pause', longBreak: 'Lange Pause', activeStatus: 'AKTIV',
    pausedStatus: 'PAUSIERT', welcomeBack: 'Willkommen zurück', systemOverview: 'Systemübersicht',
    activeSubjects: 'Aktive Fächer', inProgress: 'In Bearbeitung', deliveryRadar: 'Abgaberadar',
    noDeliveries: 'Keine anstehenden Abgaben', dueToday: 'HEUTE FÄLLIG', customInstitution: 'Benutzerdefiniert',
    selectInstitution: 'Institution wählen...', selectSubject: 'Fach wählen...',
    uploadPhoto: 'Foto hochladen', userName: 'Dein Name', layoutPos: 'Menüposition',
    left: 'Links', right: 'Rechts', top: 'Oben', bottom: 'Unten',
    close: 'Schließen', editTask: 'Aufgabe bearbeiten', appearance: 'Erscheinungsbild',
    wallpapers: 'Hintergrundbilder', fontSize: 'Schriftgröße', login: 'Anmelden',
    logout: 'Abmelden', welcome: 'Willkommen!', username: 'Benutzername',
    password: 'Passwort', enterDetails: 'Daten eingeben zum Fortfahren',
    getStarted: 'Jetzt starten', demoUser: 'Demo-Benutzer'
  },
  it: {
    dashboard: 'Dashboard', subjects: 'Materie', tasks: 'Compiti',
    planner: 'PIANIFICATORE SETTIMANALE', pomodoro: 'Studio', profile: 'Impostazioni', analytics: 'Analitica',
    stats: 'Statistiche', addSubject: 'Aggiungi materia', subjectName: 'Nome del corso', code: 'Codice',
    teacher: 'Docente', institution: 'Istituto', tetherColor: 'Colore indicatore', save: 'Salva',
    delete: 'Elimina', editColor: 'Modifica colore', emptyDatabase: 'Database vuoto',
    pendingTasks: 'In attesa', doing: 'In corso', done: 'Completati', submitted: 'CONSEGNATI',
    newTask: 'Nuovo compito', taskTitle: 'Titolo del compito', startDate: 'Data inizio',
    dueDate: 'Data di scadenza', subject: 'Materia', cancel: 'Annulla', execute: 'SALVA',
    dragHint: 'Trascina le schede tra le colonne', lightMode: 'Modalità chiara', darkMode: 'Modalità scura',
    daltonicMode: 'Modalità daltonici', language: 'Lingua', typography: 'Tipografia', themeMode: 'Tema visivo',
    settingsTitle: 'Profilo e Impostazioni', noEvents: 'Nessun evento in programma',
    addActivity: 'Nuova attività', activityTitle: 'Cosa farai?',
    startTime: 'Ora inizio', duration: 'Durata (min)', focusMode: 'Focus',
    shortBreak: 'Pausa breve', longBreak: 'Pausa lunga', activeStatus: 'ATTIVO',
    pausedStatus: 'IN PAUSA', welcomeBack: 'Bentornato', systemOverview: 'Panoramica del sistema',
    activeSubjects: 'Materie attive', inProgress: 'In corso', deliveryRadar: 'Radar consegne',
    noDeliveries: 'Nessuna consegna vicina', dueToday: 'IN SCADENZA OGGI', customInstitution: 'Personalizzato',
    selectInstitution: 'Seleziona istituto...', selectSubject: 'Seleziona materia...',
    uploadPhoto: 'Carica foto', userName: 'Il tuo nome', layoutPos: 'Posizione menu',
    left: 'Sinistra', right: 'Destra', top: 'Alto', bottom: 'Basso',
    close: 'Chiudi', editTask: 'Modifica compito', appearance: 'Aspetto',
    wallpapers: 'Sfondi', fontSize: 'Dimensione testo', login: 'Accedi',
    logout: 'Esci', welcome: 'Benvenuto!', username: 'Nome utente',
    password: 'Password', enterDetails: 'Inserisci i tuoi dati per continuare',
    getStarted: 'Inizia ora', demoUser: 'Utente demo'
  },
  jp: {
    dashboard: 'ダッシュボード', subjects: '教科', tasks: '課題',
    planner: '週間プランナー', pomodoro: '学習', profile: '設定', analytics: '分析',
    stats: '統計', addSubject: '教科を追加', subjectName: 'コース名', code: 'コード',
    teacher: '担当教員', institution: '所属機関', tetherColor: '識別カラー', save: '保存',
    delete: '削除', editColor: 'カラー編集', emptyDatabase: 'データがありません',
    pendingTasks: '未完了', doing: '進行中', done: '完了', submitted: '提出済み',
    newTask: '新しい課題', taskTitle: '課題タイトル', startDate: '開始日',
    dueDate: '提出期限', subject: '教科', cancel: 'キャンセル', execute: '保存',
    dragHint: 'カードを列間でドラッグ', lightMode: 'ライトモード', darkMode: 'ダークモード',
    daltonicMode: '色覚サポート', language: '言語', typography: 'フォント', themeMode: 'ビジュアルテーマ',
    settingsTitle: 'プロフィールと設定', noEvents: '予定されたイベントはありません',
    addActivity: '新しいアクティビティ', activityTitle: '何をしますか？',
    startTime: '開始時刻', duration: '所要時間 (分)', focusMode: '集中',
    shortBreak: '短い休憩', longBreak: '長い休憩', activeStatus: '実行中',
    pausedStatus: '一時停止', welcomeBack: 'お帰りなさい', systemOverview: 'システム概要',
    activeSubjects: '履修中の教科', inProgress: '進行中', deliveryRadar: '提出レーダー',
    noDeliveries: '直近の提出物はありません', dueToday: '本日締切', customInstitution: 'カスタム',
    selectInstitution: '機関を選択...', selectSubject: '教科を選択...',
    uploadPhoto: '写真をアップロード', userName: 'お名前', layoutPos: 'メニュー配置',
    left: '左', right: '右', top: '上', bottom: '下',
    close: '閉じる', editTask: '課題を編集', appearance: '外観',
    wallpapers: '壁紙', fontSize: 'フォントサイズ', login: 'ログイン',
    logout: 'ログアウト', welcome: 'ようこそ！', username: 'ユーザー名',
    password: 'パスワード', enterDetails: '情報を入力して続行してください',
    getStarted: '今すぐ始める', demoUser: 'デモユーザー'
  },
  ru: {
    dashboard: 'Панель', subjects: 'Предметы', tasks: 'Задания',
    planner: 'ЕЖЕНЕДЕЛЬНЫЙ ПЛАНЕР', pomodoro: 'Учеба', profile: 'Настройки', analytics: 'Аналитика',
    stats: 'Статистика', addSubject: 'Добавить предмет', subjectName: 'Название курса', code: 'Код',
    teacher: 'Преподаватель', institution: 'Учебное заведение', tetherColor: 'Цвет метки', save: 'Сохранить',
    delete: 'Удалить', editColor: 'Изменить цвет', emptyDatabase: 'База данных пуста',
    pendingTasks: 'В очереди', doing: 'В процессе', done: 'Готово', submitted: 'СДАНО',
    newTask: 'Новое задание', taskTitle: 'Название задания', startDate: 'Дата начала',
    dueDate: 'Срок сдачи', subject: 'Предмет', cancel: 'Отмена', execute: 'СОХРАНИТЬ',
    dragHint: 'Перетаскивайте карточки между колонками', lightMode: 'Светлая тема', darkMode: 'Темная тема',
    daltonicMode: 'Для дальтоников', language: 'Язык', typography: 'Шрифт', themeMode: 'Визуальная тема',
    settingsTitle: 'Профиль и настройки', noEvents: 'Нет запланированных событий',
    addActivity: 'Новая активность', activityTitle: 'Чем займетесь?',
    startTime: 'Время начала', duration: 'Длительность (мин)', focusMode: 'Фокус',
    shortBreak: 'Короткий перерыв', longBreak: 'Длинный перерыв', activeStatus: 'АКТИВЕН',
    pausedStatus: 'ПАУЗА', welcomeBack: 'С возвращением', systemOverview: 'Обзор системы',
    activeSubjects: 'Активные предметы', inProgress: 'В процессе', deliveryRadar: 'Радар дедлайнов',
    noDeliveries: 'Нет близких дедлайнов', dueToday: 'СДАЧА СЕГОДНЯ', customInstitution: 'Свой вариант',
    selectInstitution: 'Выберите заведение...', selectSubject: 'Выберите предмет...',
    uploadPhoto: 'Загрузить фото', userName: 'Ваше имя', layoutPos: 'Положение меню',
    left: 'Слева', right: 'Справа', top: 'Сверху', bottom: 'Снизу',
    close: 'Закрыть', editTask: 'Редактировать задание', appearance: 'Внешний вид',
    wallpapers: 'Обои', fontSize: 'Размер шрифта', login: 'Войти',
    logout: 'Выйти', welcome: 'Добро пожаловать!', username: 'Имя пользователя',
    password: 'Пароль', enterDetails: 'Введите данные для входа',
    getStarted: 'Начать сейчас', demoUser: 'Демо пользователь'
  },
  kr: {
    dashboard: '대시보드', subjects: '과목', tasks: '과제',
    planner: '주간 플래너', pomodoro: '학습', profile: '설정', analytics: '분석',
    stats: '통계', addSubject: '과목 추가', subjectName: '과목명', code: '코드',
    teacher: '담당 교수', institution: '교육 기관', tetherColor: '식별 색상', save: '저장',
    delete: '삭제', editColor: '색상 변경', emptyDatabase: '데이터베이스가 비어 있습니다',
    pendingTasks: '대기 중', doing: '진행 중', done: '완료', submitted: '제출 완료',
    newTask: '새 과제', taskTitle: '과제 제목', startDate: '시작일',
    dueDate: '마감일', subject: '과목', cancel: '취소', execute: '저장',
    dragHint: '열 사이로 카드를 드래그하세요', lightMode: '라이트 모드', darkMode: '다크 모드',
    daltonicMode: '색약 모드', language: '언어', typography: '글꼴', themeMode: '테마',
    settingsTitle: '프로필 및 설정', noEvents: '예정된 일정이 없습니다',
    addActivity: '새 활동', activityTitle: '무엇을 하시겠습니까?',
    startTime: '시작 시간', duration: '시간 (분)', focusMode: '집중',
    shortBreak: '짧은 휴식', longBreak: '긴 휴식', activeStatus: '활성',
    pausedStatus: '일시정지', welcomeBack: '환영합니다', systemOverview: '시스템 개요',
    activeSubjects: '수강 중인 과목', inProgress: '진행 중', deliveryRadar: '마감 레이더',
    noDeliveries: '예정된 마감이 없습니다', dueToday: '오늘 마감', customInstitution: '직접 입력',
    selectInstitution: '기관 선택...', selectSubject: '과목 선택...',
    uploadPhoto: '사진 업로드', userName: '사용자 이름', layoutPos: '메뉴 위치',
    left: '왼쪽', right: '오른쪽', top: '위쪽', bottom: '아래쪽',
    close: '닫기', editTask: '과제 편집', appearance: '화면 설정',
    wallpapers: '배경화면', fontSize: '글자 크기', login: '로그인',
    logout: '로그아웃', welcome: '환영합니다!', username: '아이디',
    password: '비밀번호', enterDetails: '계속하려면 정보를 입력하세요',
    getStarted: '지금 시작하기', demoUser: '데모 사용자'
  }
};

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    theme: localStorage.getItem('campusflow_theme') || 'dark',
    language: localStorage.getItem('campusflow_language') || 'es',
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
      if (processedUpdates.language) {
        cloudMapping.language = processedUpdates.language;
        localStorage.setItem('campusflow_language', processedUpdates.language);
      }
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

  const t = useMemo(() => {
    const lang = settings.language || 'es';
    return { ...translations.es, ...(translations[lang] || {}) };
  }, [settings.language]);

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

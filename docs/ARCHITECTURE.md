# CampusFlow - Arquitectura Técnica

## 1. Visión General
CampusFlow es una aplicación web progresiva (PWA) construida con **React (Vite)** orientada a la gestión académica, productiva y gamificada de estudiantes universitarios. Utiliza **Supabase** como Backend-as-a-Service (BaaS) para autenticación, base de datos en tiempo real y almacenamiento.

## 2. Stack Tecnológico
- **Frontend**: React 18, Vite, React Router DOM, Framer Motion (para animaciones), GSAP (para micro-interacciones), Lucide React (íconos).
- **Backend / Base de Datos**: Supabase (PostgreSQL), Supabase Auth.
- **PWA**: `vite-plugin-pwa`, Workbox.
- **Estilos**: CSS Modules, Custom Properties (CSS variables) con diseño *Cyber Luxe* (Glassmorphism + Neon).
- **Control de Calidad**: ESLint, Vitest.

## 3. Estructura de Estado (Contexts)
La aplicación maneja el estado global mediante React Context y Custom Hooks para evitar el prop drilling.
- **`AuthContext`**: Gestiona la sesión del usuario, la autenticación multifactor (MFA/TOTP) y expone la instancia del usuario. Reacciona a `onAuthStateChange`.
- **`SettingsContext`**: Almacena preferencias de usuario, temas, umbrales de alerta y variables de la interfaz. Implementa manejo de estado optimista.
- **`TaskContext`**: Gestiona el CRUD completo de trabajos y su sincronización con Supabase, usando optimismo para operaciones de DnD.
- **`GamificationContext`**: Controla el sistema de experiencia (XP), niveles, rachas diarias (streaks) y desbloqueos.

## 4. Características Clave
1. **Autenticación Robusta**: Incluye soporte para Autenticación Multifactor (MFA) obligatoria, protegiendo rutas mediante evaluación de `aal` (Authentication Assurance Level).
2. **PWA y Soporte Offline**: Implementa Workbox con estrategias `StaleWhileRevalidate` y `NetworkFirst` para garantizar que la app sea instalable y cargue recursos (audios ambientales, assets) de manera instantánea.
3. **Pomodoro y Sonidos Ambientales**: La vista de estudio profundo integra temporizadores configurables, música ambiental (Ondas Gamma, Alfa, Lofi, etc.) y sincronización con las tareas activas.
4. **Planificador Semanal**: Diseño avanzado con gestión de bloques de tiempo (mañana, tarde, noche), vínculos a materias y tareas, y progresión visual.

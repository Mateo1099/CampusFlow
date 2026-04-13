\# 📋 Estándares y Reglas de CampusFlow



\*\*Versión 1.0\*\* | Análisis de Software - Auditoría Técnica

\*\*Generado\*\*: 9 de abril de 2026  

\*\*Propósito\*\*: Guía de desarrollo para modelos locales (Gemma 4) y desarrolladores



\---



\## 1. STACK TECNOLÓGICO



\### Lenguajes y Runtimes

\- \*\*JavaScript (ES2020+)\*\*: Lenguaje principal, módulos ES6

\- \*\*JSX\*\*: React con sintaxis de componentes

\- \*\*CSS\*\*: Estilos organizados en CSS variables y temas dinámicos

\- \*\*SQL\*\*: Consultas a Supabase PostgreSQL



\### Frameworks Principales

\- \*\*React 19.2.4\*\*: Framework UI reactivo con Hooks

\- \*\*React Router 7.13.2\*\*: Enrutamiento con protección de rutas (ProtectedRoute, LoginRoute, MFARoute)

\- \*\*Vite 8.0.1\*\*: Bundler y servidor de desarrollo

\- \*\*Supabase 2.100.1\*\*: BaaS (autenticación, base de datos, almacenamiento)



\### Librerías Clave

\- \*\*Framer Motion 12.38.0\*\*: Animaciones avanzadas (interpolación, sprite sheets)

\- \*\*GSAP 3.14.2\*\* + \*\*@gsap/react 2.1.2\*\*: Animaciones de alto rendimiento

\- \*\*Lucide React 1.7.0\*\*: Iconos vectoriales (LayoutDashboard, CheckSquare, Timer, etc.)

\- \*\*date-fns 4.1.0\*\*: Manipulación de fechas (parseISO, differenceInDays, startOfDay)

\- \*\*uuid 13.0.0\*\*: Generación de IDs únicos

\- \*\*React DOM 19.2.4\*\*: Renderizado



\### Herramientas de Desarrollo

\- \*\*ESLint 9.39.4\*\*: Linting con reglas React Hooks y React Refresh

\- \*\*Vite Plugin React 6.0.1\*\*: Integración de React Fast Refresh

\- \*\*TypeScript Types\*\*: @types/react 19.2.14, @types/react-dom 19.2.3



\---



\## 2. ARQUITECTURA DEL PROYECTO



\### Estructura de Carpetas



```

src/

├── App.jsx                 # Router principal y contextos envolventes

├── main.jsx                # Punto de entrada React

├── index.css               # Estilos globales, temas, variables CSS

├── App.css                 # Estilos adicionales del app

│

├── pages/                  # Páginas/Vistas (una por ruta)

│   ├── Dashboard.jsx       # Página principal (radar entregas, analytics)

│   ├── Agenda.jsx          # Gestión de cursos/materias

│   ├── TaskBoard.jsx       # Tablero Kanban (sin entregar, en proceso, entregado)

│   ├── WeeklyPlanner.jsx   # Planificador semanal

│   ├── Pomodoro.jsx        # Técnica Pomodoro + focus modes

│   ├── Profile.jsx         # Perfil y ajustes de usuario

│   ├── Stats.jsx           # Estadísticas globales

│   ├── Login.jsx           # Autenticación

│   └── MFAChallenge.jsx    # Desafío MFA (2FA)

│

├── components/

│   ├── layout/

│   │   ├── Layout.jsx      # Componente contenedor (Sidebar + main)

│   │   └── Sidebar.jsx     # Navegación lateral (branding + navItems)

│   │

│   └── ui/

│       ├── ColorPicker.jsx # Selector de colores para cursos

│       ├── CourseModal.jsx # Modal para crear/editar curso

│       ├── CustomCalendar.jsx # Calendario personalizado

│       └── MFAVerificationModal.jsx # Modal verificación 2FA

│

├── context/                # Global State Management (Context API)

│   ├── AuthContext.jsx     # Usuario, autenticación, MFA, AAL (aal1/aal2)

│   ├── TaskContext.jsx     # Tareas, cursos, actividades, analytics

│   └── SettingsContext.jsx # Tema, idioma, tipografía, avatar, XP, level

│

├── hooks/                  # Custom React Hooks

│   ├── useTasks.js         # Fetch/CRUD tareas

│   ├── useCourses.js       # Fetch/CRUD cursos

│   └── useHabits.js        # Fetch/CRUD actividades diarias

│

├── lib/                    # Servicios y utilidades

│   ├── supabaseClient.js   # Inicializar cliente Supabase

│   ├── tasksService.js     # API calls: assignments table

│   ├── coursesService.js   # API calls: courses table

│   ├── habitsService.js    # API calls: daily\_activities table

│   └── audioService.js     # Gestión de audio (synth, sounds)

│

└── assets/                 # Imágenes y recursos estáticos

&#x20;   ├── glass\_wallpaper.png

&#x20;   ├── nature\_glass.png

&#x20;   ├── synthwave\_neon.png

&#x20;   └── space\_minimal.png

```



\### Flujo de Datos



\*\*Top-Level (App.jsx)\*\*

```

App.jsx

&#x20;├── AuthProvider

&#x20;│   ├── SettingsProvider

&#x20;│   │   └── TaskProvider

&#x20;│   │       └── BrowserRouter

&#x20;│   │           └── AppRoutes

&#x20;│   │               └── ProtectedRoute / LoginRoute / MFARoute

&#x20;│   │                   └── Layout

&#x20;│   │                       └── Pages + Outlet

```



\*\*Lectura de Datos\*\*

1\. AuthContext obtiene sesión → usuario actual + AAL

2\. SettingsContext descarga settings de BD (tema, idioma, XP)

3\. TaskProvider combina useTasks + useCourses + useHabits → data agregada

4\. Componentes consumen via `useAuth()`, `useSettings()`, `useTasksContext()`



\*\*Escritura de Datos\*\*

1\. Componentes disparan acciones (addTask, updateStatus, etc.)

2\. Hook (useTasks, useCourses, etc.) → Service layer

3\. Service layer → Supabase API

4\. Supabase actualiza estado local



\### Base de Datos (Supabase PostgreSQL)



\*\*Tablas principales\*\*

\- \*\*users\*\*: Perfil de usuario (email, metadata)

\- \*\*courses\*\*: Materias/cursos (id, name, color, teacher, code, institution, user\_id)

\- \*\*assignments\*\*: Trabajos/tareas (id, title, course\_id, start\_date, deadline, status, user\_id)

\- \*\*daily\_activities\*\*: Hábitos diarios (id, title, time, completed, user\_id, day)

\- \*\*user\_settings\*\*: Preferencias (theme, language, font, wallpaper, customWallpaper)

\- \*\*user\_security\*\*: MFA status (mfa\_enabled, mfa\_status, user\_id)



\*\*Relaciones\*\*

\- `assignments.course\_id` → `courses.id` (muchos a uno)

\- `assignments.user\_id` → `users.id` (muchos a uno)

\- `courses.user\_id` → `users.id` (muchos a uno)

\- `daily\_activities.user\_id` → `users.id` (muchos a uno)



\*\*Estados de Tareas\*\*

```

'sin entregar' | 'en proceso' | 'revisión' | 'entregado'

```

(minúsculas, normalizado en tasksService.js)



\---



\## 3. PATRONES DE DISEÑO



\### Arquitectura por Capas



| Capa | Archivos | Responsabilidad |

|------|----------|-----------------|

| \*\*Presentación\*\* | pages/\*.jsx, components/ui/\*.jsx | Renderizar UI, input de usuario |

| \*\*Controlador\*\* | components/layout/\*.jsx | Orquestar layout, sidebar, outlet |

| \*\*State Management\*\* | context/\*.jsx | Centralizar estado global (Auth, Settings, Tasks) |

| \*\*Hooks\*\* | hooks/\*.js | Lógica reutilizable, fetch inicial |

| \*\*Servicios\*\* | lib/\*Service.js | CRUD contra Supabase, normalización |

| \*\*Infraestructura\*\* | lib/supabaseClient.js, audioService.js | Conexión a externos, utilidades |



\### Patrones React Utilizados



\#### 1. \*\*Context + useContext para Global State\*\*

```javascript

// AuthContext.jsx

const AuthContext = createContext();

export function AuthProvider({ children }) { /\* ... \*/ }

export function useAuth() { return useContext(AuthContext); }



// En componentes:

const { user, isAuthenticated, aal, logout } = useAuth();

```



\#### 2. \*\*Custom Hooks para Lógica de Datos\*\*

```javascript

// useTasks.js

export const useTasks = (userId, addXP, incrementStat) => {

&#x20; const \[tasks, setTasks] = useState(\[]);

&#x20; const \[loading, setLoading] = useState(false);

&#x20; // ...

&#x20; return { tasks, setTasks, addTask, updateTaskStatus, deleteTask, ... };

};

```



\#### 3. \*\*Rutas Protegidas con HOC Components\*\*

```javascript

const ProtectedRoute = ({ children }) => {

&#x20; const { isAuthenticated, aal, mfaRequired } = useAuth();

&#x20; if (!isAuthenticated) return <Navigate to="/login" />;

&#x20; if (mfaRequired \&\& aal !== 'aal2') return <Navigate to="/mfa-challenge" />;

&#x20; return children;

};

```



\#### 4. \*\*Composición de Providers (Nesting)\*\*

```javascript

<AuthProvider>

&#x20; <SettingsProvider>

&#x20;   <TaskProvider>

&#x20;     <BrowserRouter>

&#x20;       <AppRoutes />

&#x20;     </BrowserRouter>

&#x20;   </TaskProvider>

&#x20; </SettingsProvider>

</AuthProvider>

```



\#### 5. \*\*useMemo para Computaciones Costosas\*\*

```javascript

const analytics = useMemo(() => {

&#x20; const totalTasks = tasks.length;

&#x20; const completedTasks = tasks.filter(t => t.status === 'entregado').length;

&#x20; // ...

&#x20; return { totalTasks, completedTasks, ... };

}, \[tasks, dailyPlan]);

```



\#### 6. \*\*useCallback para Memoizar Funciones\*\*

```javascript

const fetchTasks = useCallback(async () => {

&#x20; // Evita re-renders innecesarios de componentes dependientes

}, \[userId]);

```



\#### 7. \*\*Condicionales de Rendering con Short-Circuit\*\*

```javascript

{isLoading ? <LoadingSpinner /> : <Content />}

{error \&\& <ErrorAlert message={error} />}

```



\#### 8. \*\*Animaciones con Framer Motion\*\*

```javascript

<motion.div animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

&#x20; Content

</motion.div>

```



\### Convenciones de Código



\#### Naming

\- \*\*Componentes\*\*: PascalCase (`Dashboard.jsx`, `TaskBoard.jsx`)

\- \*\*Hooks\*\*: camelCase iniciando con `use` (`useTasks`, `useSettings`)

\- \*\*Servicios\*\*: camelCase con sufijo `Service` (`tasksService`, `coursesService`)

\- \*\*Contextos\*\*: PascalCase con sufijo `Context` (`AuthContext`, `TaskContext`)

\- \*\*Variables de estado\*\*: camelCase (`loading`, `tasks`, `mfaRequired`)

\- \*\*Constantes\*\*: UPPER\_SNAKE\_CASE (`WALLPAPERS`, `FONT\_OPTIONS`)



\#### Estilos

\- \*\*CSS Variables\*\*: Definidas en `:root` de `index.css`

&#x20; - Colores: `--accent-primary`, `--text-muted`, `--border-glass-top`

&#x20; - Animaciones: `--ease-out-quint`, `--transition-slow`

&#x20; - Espaciado: `--radius-md`, tamaños inline con React

\- \*\*Clases\*\*: kebab-case, descriptivas (`glass-panel`, `animate-xp-float`)

\- \*\*Inline Styles\*\*: Para valores dinámicos (posiciones, animaciones condicionales)



\#### Comentarios y Logging

\- \*\*Console Logs\*\*: Prefijo `\[CATEGORÍA]` → `\[AUTH]`, `\[ROUTE-PROTECTED]`, `\[APP-ROUTES]`

\- \*\*Comentarios JSDoc\*\*: Para funciones complejas (ej: comentarios en tasksService.js)

\- \*\*Comentarios inline\*\*: `// REGLA DE ORO:`, `// 💡`, `// ⚠️` para alertas



\#### Normas de Error Handling

\- \*\*Try-Catch obligatorio\*\* en servicios y efectos async

\- \*\*Propagación de errores\*\*: Services lanzan → Hooks capturan → State maneja

\- \*\*Fallbacks defensivos\*\*: `session?.user?.email || 'Unknown'`

\- \*\*Mensajes contextuales\*\*: console.error incluye el contexto



\### Convenciones de Base de Datos



\*\*Nombrado de Tablas\*\*: lowercase, snake\_case

\- `assignments` (NO `tasks`)

\- `courses` (NO `subjects`)

\- `daily\_activities`

\- `user\_security`



\*\*Nombrado de Columnas\*\*: lowercase, snake\_case

\- `user\_id`, `course\_id`, `start\_date`, `deadline`

\- `created\_at`, `updated\_at`



\*\*Convención de Estados\*\*: lowercase, español

\- `'sin entregar'` (pendiente)

\- `'en proceso'` (working)

\- `'revisión'` (review)

\- `'entregado'` (submitted/done)



\*\*Mapeo de Claves\*\*: tasksService normaliza entre camelCase (frontend) y snake\_case (BD)

```javascript

cloudMapping.start\_date = updates.startDate || updates.start\_date;

```



\---



\## 4. TEMAS GLOBALES Y PERSONALIZACION



\### Sistema de Temas (3 modos)



\*\*Dark (por defecto - "Cyber Luxe")\*\*

```css

\--bg-primary: #0a0a0f;

\--accent-primary: #007aff;

\--accent-lime: #34c759;

\--text-primary: #f5f5f7;

```



\*\*Light ("Minimalist Tech")\*\*

```css

\--bg-primary: #f5f7fb;

\--accent-primary: #2563eb;

\--accent-lime: #0ea5e9;

\--text-primary: #101828;

```



\*\*Daltonic (Alto contraste azul-amarillo)\*\*

```css

\--bg-primary: #050515;

\--accent-primary: #ffdc00;

\--accent-secondary: #0077ff;

\--text-primary: #ffffff;

```



\### Fondos Dinámicos (Wallpapers)

```javascript

const WALLPAPERS = \[

&#x20; { id: 'custom', label: 'Personalizado', src: null },

&#x20; { id: 'cyber', label: 'Cyber Glass', src: glassWallpaper },

&#x20; { id: 'nature', label: 'Forest Glass', src: natureGlass },

&#x20; { id: 'synth', label: 'Synthwave', src: 'https://images.unsplash.com/...' },

&#x20; { id: 'space', label: 'Dark Space', src: spaceMinimal },

];

```



\### Tipografía Selector

```javascript

const FONT\_OPTIONS = \[

&#x20; { id: 'space-grotesk', label: 'Space Grotesk', css: "'Space Grotesk', sans-serif" },

&#x20; { id: 'inter', label: 'Inter', css: "'Inter', sans-serif" },

&#x20; // ... 10 opciones más

];

```



\### Sistema de Idiomas (i18n)

```javascript

const translations = {

&#x20; es: { dashboard: 'Dashboard', tasks: 'Trabajos', ... },

&#x20; en: { dashboard: 'Dashboard', tasks: 'Tasks', ... },

};

```



\---



\## 5. AUTENTICACIÓN Y MFA



\### Flujo de Autenticación (Supabase)



1\. \*\*Login\*\*: Usuario ingresa email/contraseña

2\. \*\*Post-Login Estado\*\*:

&#x20;  - `isAuthenticated = true`

&#x20;  - `aal = 'aal1'` (solo email/password)

&#x20;  - `mfaRequired = ?` (check en user\_security)



3\. \*\*Si MFA requerido\*\*:

&#x20;  - Redirige a `/mfa-challenge`

&#x20;  - Usuario completa el desafío

&#x20;  - Supabase eleva `aal` a `aal2`



4\. \*\*Post-MFA\*\*:

&#x20;  - `aal = 'aal2'` (verificado con 2FA)

&#x20;  - Acceso a rutas protegidas



\### Estados de AAL (Authentication Assurance Level)



| AAL | Estado | Descripción |

|-----|--------|-------------|

| `aal1` | Básico | Email/contraseña validados |

| `aal2` | Verificado | Email + MFA completado |



\### Protección de Rutas (AppRoutes)



```javascript

<Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>

&#x20; {/\* Las subrutas solo accesibles si isAuthenticated \&\& (aal === 'aal2' || !mfaRequired) \*/}

</Route>



<Route path="/login" element={<LoginRoute><Login /></LoginRoute>} />

{/\* Solo accesible si NO autenticado ó AAL1 sin MFA completado \*/}



<Route path="/mfa-challenge" element={<MFARoute><MFAChallenge /></MFARoute>} />

{/\* Solo accesible si autenticado pero AAL != 'aal2' \*/}

```



\---



\## 6. GAMIFICACIÓN



\### Sistema XP y Levels



\*\*SettingsContext.jsx\*\*

```javascript

const \[settings, setSettings] = useState({

&#x20; experience: 0,  // XP acumulado

&#x20; level: 1,       // Nivel actual (calculado)

&#x20; recentXPGains: \[], // Array de últimas ganancias (con animación)

});

```



\*\*Ganancia de XP\*\*

\- Completar tarea: `+100 XP`

\- Revertir completada: `-100 XP`

\- Acciones adicionales se definen en hooks



\*\*Visualización\*\*

\- Layout.jsx renderiza `recentXPGains` como notificaciones flotantes

\- Clase CSS: `animate-xp-float` (sube y desvanece en 3-4s)



\### Stats y Analítica



\*\*TaskContext calcula\*\*

```javascript

const analytics = useMemo(() => ({

&#x20; totalTasks,

&#x20; completedTasks,

&#x20; totalXP,

&#x20; totalHabits,

&#x20; completedHabits,

&#x20; productivity: \[0,0,0,0,0,0,0], // Lun-Dom

&#x20; // ...

}), \[tasks, dailyPlan]);

```



\*\*Stats.jsx\*\* renderiza dashboards con:

\- Gráficos de productividad semanal

\- Proporción tarea entregadas/totales

\- Hábitos completados

\- XP progress bar



\---



\## 7. AUDIO Y MULTIMEDIA



\### Audio Service (audioService.js)



\*\*Funcionalidades\*\*

\- Síntesis de audio Web Audio API (click sounds, beeps)

\- Reproducción de archivos (brown-noise.json en public/sounds)

\- Control de contexto de audio (resume, pause)



\*\*Uso\*\*

```javascript

import { resumeAudio } from '../lib/audioService';



// En Layout.jsx: resume audio en primer click/touchstart

window.addEventListener('click', resumeAudio);

```



\---



\## 8. CÓMO PROGRAMAR SIGUIENDO ESTOS ESTÁNDARES



\### Al crear una PÁGINA nueva



1\. \*\*Crear archivo\*\* en `src/pages/MiPagina.jsx`

2\. \*\*Importar contextos\*\* necesarios

&#x20;  ```javascript

&#x20;  import { useAuth } from '../context/AuthContext';

&#x20;  import { useSettings } from '../context/SettingsContext';

&#x20;  import { useTasksContext } from '../context/TaskContext';

&#x20;  ```

3\. \*\*Extraer datos de contexto\*\*

&#x20;  ```javascript

&#x20;  const { t, settings } = useSettings();

&#x20;  const { tasks, courses } = useTasksContext();

&#x20;  ```

4\. \*\*Definir estado local\*\* con useState si necesario

5\. \*\*Hacer fetch inicial\*\* en useEffect (si no está en hook personalizado)

6\. \*\*Renderizar con Framer Motion\*\* para animaciones

7\. \*\*Importar en App.jsx\*\* y añadir ruta



\### Al crear un COMPONENTE UI



1\. \*\*Crear archivo\*\* en `src/components/ui/MiComponente.jsx`

2\. \*\*Recibir props\*\* específicos (no toda la data)

3\. \*\*Mantener responsabilidad única\*\* (solo presentación)

4\. \*\*Usar estilos CSS variables\*\* (`var(--accent-primary)`)

5\. \*\*Exportar por defecto\*\* al final



Ejemplo:

```javascript

const ColorPicker = ({ value, onChange }) => {

&#x20; return (

&#x20;   <div className="color-picker">

&#x20;     <input type="color" value={value} onChange={onChange} />

&#x20;   </div>

&#x20; );

};

export default ColorPicker;

```



\### Al crear un HOOK personalizado



1\. \*\*Crear archivo\*\* en `src/hooks/useAlgo.js`

2\. \*\*No debe ser componente\*\* (no devuelve JSX)

3\. \*\*Usar useState, useEffect, useCallback\*\*

4\. \*\*Retornar objeto\*\* con datos y funciones

5\. \*\*Documentar con comentarios\*\* parámetros y retorno



Ejemplo:

```javascript

export const useMiLogica = (userId) => {

&#x20; const \[data, setData] = useState(\[]);

&#x20; const \[loading, setLoading] = useState(false);

&#x20; 

&#x20; useEffect(() => {

&#x20;   // Fetch data

&#x20; }, \[userId]);

&#x20; 

&#x20; const actualizarData = useCallback(async (id, updates) => {

&#x20;   // ...

&#x20; }, \[]);

&#x20; 

&#x20; return { data, setData, loading, actualizarData };

};

```



\### Al crear un SERVICIO



1\. \*\*Crear archivo\*\* en `src/lib/miService.js`

2\. \*\*Exportar objeto\*\* con métodos async

3\. \*\*Cada método = una operación\*\* (CREATE, READ, UPDATE, DELETE)

4\. \*\*Mapear datos\*\* entre frontend (camelCase) y BD (snake\_case)

5\. \*\*Manejar errores\*\* con try-catch o propagarlos



Ejemplo:

```javascript

export const miService = {

&#x20; async obtenerDatos(userId) {

&#x20;   const { data, error } = await supabase

&#x20;     .from('mi\_tabla')

&#x20;     .select('\*')

&#x20;     .eq('user\_id', userId);

&#x20;   if (error) throw error;

&#x20;   return data || \[];

&#x20; },

&#x20; 

&#x20; async crearDato(userId, dato) {

&#x20;   const cloudData = {

&#x20;     user\_id: userId,

&#x20;     title: dato.title,

&#x20;     created\_at: new Date(),

&#x20;   };

&#x20;   const { data, error } = await supabase

&#x20;     .from('mi\_tabla')

&#x20;     .insert(\[cloudData])

&#x20;     .select();

&#x20;   if (error) throw error;

&#x20;   return data\[0];

&#x20; },

};

```



\### Al crear un CONTEXTO



1\. \*\*Crear archivo\*\* en `src/context/MiContext.jsx`

2\. \*\*Definir createContext\*\* al inicio

3\. \*\*Componente Provider\*\* que gestiona estado

4\. \*\*Hook useContext personalizado\*\* para consumo

5\. \*\*Retornar provider wrapping children\*\*



Estructura base:

```javascript

import React, { createContext, useState, useContext } from 'react';



const MiContext = createContext();



export function MiProvider({ children }) {

&#x20; const \[state, setState] = useState(initialValue);

&#x20; 

&#x20; const value = {

&#x20;   state,

&#x20;   setState,

&#x20;   // ... métodos

&#x20; };

&#x20; 

&#x20; return <MiContext.Provider value={value}>{children}</MiContext.Provider>;

}



export function useMi() {

&#x20; return useContext(MiContext);

}

```



\---



\## 9. RESTRICCIONES Y CUIDADOS



\### ⚠️ Cuidados Críticos



1\. \*\*No modificar tablas de BD directamente\*\*

&#x20;  - Siempre usar Services layer

&#x20;  - Services validan y normalizan datos



2\. \*\*Normalizar estados de tareas\*\*

&#x20;  - Convertir a minúsculas en tasksService

&#x20;  - Mantener consistencia: `'sin entregar'`, `'en proceso'`, `'entregado'`



3\. \*\*Manejar AAL y MFA correctamente\*\*

&#x20;  - `aal1` = sin 2FA completado

&#x20;  - `aal2` = 2FA completado

&#x20;  - Siempre chequear antes de mostrar contenido sensible



4\. \*\*No hardcodear URLs o keys\*\*

&#x20;  - Supabase keys en supabaseClient.js son públicas (OK)

&#x20;  - Otros secrets → variables de entorno (.env)



5\. \*\*Memory leaks en efectos\*\*

&#x20;  - Usar `isMounted` flag en efectos async

&#x20;  - Siempre limpiar subscriptions en return de useEffect



6\. \*\*Actualizaciones con relaciones\*\*

&#x20;  - Al actualizar tarea, preservar `course\_id`

&#x20;  - Las joined queries NO incluyen el ID relacional en el response



\### Anti-Patterns (Evitar)



❌ Almacenar booleanos de UI en BD

❌ Mutaciones directas de arrays (usar spread operator)

❌ Console.log productivos (usar contexto)

❌ Componentes sin key en listas

❌ Efectos sin dependencias (crear loops infinitos)

❌ useCallback/useMemo sin necesidad real

❌ Pasar todo el objeto desde contexto (desestructurar)

❌ Async directo en componente (usar useEffect)



\### Errores Comunes Detectados en el Código



1\. \*\*Timeout de loading\*\*: App.jsx + AppRoutes tiene safeguard

&#x20;  ```javascript

&#x20;  if (loading after 5s) setLoading(false); // Fuerza salir del loading

&#x20;  ```



2\. \*\*AAL undefined\*\*: AuthContext maneja default

&#x20;  ```javascript

&#x20;  setAal(session.user.aal || 'aal1'); // Si es undefined, usar aal1

&#x20;  ```



3\. \*\*MFA status en background\*\*: AuthContext chequea sin bloquear

&#x20;  ```javascript

&#x20;  checkMFAStatus(session.user.id); // No await, evita loading infinito

&#x20;  ```



4\. \*\*Mapeo table name\*\*: Cambio subjects→courses

&#x20;  - tasksService usa `assignments` (correcto)

&#x20;  - coursesService usa `courses` (correcto)



\---



\## 10. CHECKLIST PARA REVISIONES



Cuando completes una tarea, verifica:



\- \[ ] Estructura de archivos sigue convención (PascalCase componentes, camelCase funciones)

\- \[ ] Imports organizados (React, librerías externas, locales)

\- \[ ] Contextos consumidos correctamente (destructuring)

\- \[ ] Estados inicializados correctamente

\- \[ ] useEffect tiene dependencias documentadas

\- \[ ] Try-catch en async/await

\- \[ ] No hay console.log sin prefijo \[CONTEXTO]

\- \[ ] Estilos usan CSS variables o inline dinámico

\- \[ ] Componentes reutilizables reciben props, no acceden a contexto

\- \[ ] Servicios normalizan datos antes de BD

\- \[ ] AAL y MFA manejados en rutas protegidas

\- \[ ] Mobile-responsive considered

\- \[ ] Animaciones con Framer Motion ó GSAP (no CSS puro si es compleja)



\---



\## 11. RECURSOS Y REFERENCIAS



\### Documentación Interna

\- \[ANÁLISIS\_MFA\_COMPONENT.md](./ANÁLISIS\_MFA\_COMPONENT.md) - Análisis del componente MFA

\- \[REPORTE\_TECNICO\_KANBAN.md](./REPORTE\_TECNICO\_KANBAN.md) - Análisis de TaskBoard

\- \[VALIDACION\_SEGURIDAD.md](./VALIDACION\_SEGURIDAD.md) - Auditoría de seguridad



\### Librerías Documentación

\- \[React 19 Docs](https://react.dev)

\- \[React Router v7](https://reactrouter.com)

\- \[Framer Motion](https://www.framer.com/motion)

\- \[GSAP Docs](https://gsap.com/docs)

\- \[Supabase JS Client](https://supabase.com/docs/reference/javascript)

\- \[date-fns](https://date-fns.org)



\### Herramientas

\- Vite: `npm run dev` (dev), `npm run build` (prod)

\- ESLint: `npm run lint`

\- DevTools: React DevTools extension recomendado



\---



\## 12. CONCLUSIONES DEL ANÁLISIS



\### Fortalezas Detectadas

✅ Arquitectura clara con separación de capas (Pages → Components → Context → Services)  

✅ State management bien organizado (3 contextos: Auth, Settings, Task)  

✅ Protección robusta de rutas (MFA, AAL levels)  

✅ Animaciones de calidad (GSAP, Framer Motion)  

✅ Accesibilidad considerada (modo daltónico, temas visuales)  

✅ Sistema de temas dinámicos bien implementado  



\### Áreas de Mejora  

⚠️ Falta TypeScript (tipos mejorarían DX)  

⚠️ Tests unitarios no evidente (considerar Testing Library)  

⚠️ Documentación de componentes (considerar Storybook)  

⚠️ Validación de formularios centralizada (ningún validation schema detectado)  

⚠️ Error boundaries no implementados  



\### Recomendaciones Inmediatas

1\. Mantener este documento actualizado con cada feature nueva

2\. Crear componentes reutilizables en `/components/shared/`

3\. Considerar E2E tests (Playwright, Cypress)

4\. Documentar decisiones arquitecturales en adr/ folder



\---



\*\*Fin del análisis\*\* | Preparado para consumo de Gemma 4 y desarrolladores




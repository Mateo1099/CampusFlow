# 📋 FICHA TÉCNICA - PROYECTO CAMPUSFLOW
**Fecha de Generación:** 31 de Marzo 2026  
**Versión del Proyecto:** 0.0.0  
**Estado:** En Desarrollo Activo  

---

## 1️⃣ STACK BASE

### Framework Principal
- **Build Tool:** `Vite` v8.0.1 (configurado en `vite.config.js`)
- **Framework:** React 19.2.4
- **Lenguaje:** JavaScript (.jsx) - **NO es TypeScript**
- **Tipo de Proyecto:** Módulo ES (type: "module" en package.json)

### Razón de Vite
- Compilación ultra-rápida para desarrollo
- Hot Module Replacement (HMR) optimizado
- Salida optimizada para producción
- Perfecto para React + Framer Motion

---

## 2️⃣ DEPENDENCIAS CLAVE

### Dependencias Principales (10 librerías instaladas)

| Librería | Versión | Propósito |
|----------|---------|----------|
| `react` | 19.2.4 | Framework principal |
| `react-dom` | 19.2.4 | Renderizado del DOM |
| `react-router-dom` | 7.13.2 | Ruteo y navegación entre páginas |
| `framer-motion` | 12.38.0 | Animaciones y transiciones fluidas |
| `gsap` | 3.14.2 | Animaciones avanzadas (complemento) |
| `@gsap/react` | 2.1.2 | Integración de GSAP con React |
| `@supabase/supabase-js` | 2.100.1 | Backend BaaS (autenticación + base de datos) |
| `lucide-react` | 1.7.0 | Iconería moderna (50+ iconos) |
| `date-fns` | 4.1.0 | Utilidades para manejo de fechas |
| `uuid` | 13.0.0 | Generación de IDs únicos |

### Herramientas de Desarrollo (ESLint, Vite, React)
- `@vitejs/plugin-react` 6.0.1 - Plugin de Vite para React
- `@types/react` 19.2.14 - Type hints para développadores
- `eslint`, `@eslint/js` - Linting de código
- `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` - Reglas específicas de React

---

## 3️⃣ SISTEMA DE ESTILOS

### Estrategia de Estilos: HÍBRIDA (Único del proyecto)

#### A) Inline Styles (PREDOMINANTE - 80%)
```jsx
// Ejemplo: CourseModal.jsx línea 91
style={{ 
  background: 'rgba(15, 15, 20, 0.85)', 
  backdropFilter: 'blur(30px)',
  boxShadow: '0 0 30px rgba(0, 243, 255, 0.3)'
}}
```
- **Ventaja:** Estilos dinámicos contextuales
- **Ventaja:** Variables CSS en tiempo real (colores de materias)
- **Ventaja:** Estilos específicos por componente sin colisiones

#### B) CSS Global (20%)
Archivo: `src/index.css`
- Variables CSS: `--bg-primary`, `--accent-primary`, `--text-primary`, etc.
- Clases reutilizables: `.glass-panel`, `.input`, `.select`, `.btn`
- Sistema de temas: `[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="daltonic"]`
- Tipografías importadas de Google Fonts (Inter, Space Grotesk, Outfit, etc.)

#### C) Diseño Visual: Glassmorphism + Cyber Luxe
- **Backdrop Filter:** `blur(30px)` + `saturate(180%)`
- **Colores Base:** Tema oscuro (#0a0a0f), acentos cyan (#00f3ff)
- **Bordes:** `rgba(0, 243, 255, 0.3)` con brillo neon
- **Sombras:** Glow effects con múltiples capas de box-shadow
- **Rounded Corners:** `borderRadius: 24px` (estándar en modales), `14px` (inputs)

#### D) NO se usan:
- ❌ Tailwind CSS
- ❌ Styled Components
- ❌ CSS Modules
- ❌ Material-UI (solo lucide-react para iconos)

---

## 4️⃣ PERSISTENCIA DE DATOS

### Backend: Supabase (BaaS PostgreSQL)

#### Configuración
**Archivo:** `src/lib/supabaseClient.js`
```javascript
const supabaseUrl = 'https://tknrxiksvsmygtszlytf.supabase.co'
const supabaseAnonKey = 'sb_publishable_yY3njiGWMWufpD3P8UQUGw__rSc2B0i'
```

#### Base de Datos: 3 Tablas Principales

| Tabla | Propósito | Columnas |
|-------|----------|---------|
| `courses` | Materias/Asignaturas | id, name, code, teacher, institution, color, user_id, created_at |
| `assignments` | Trabajos/Tareas | id, title, course_id, start_date, deadline, status, user_id, created_at |
| `auth.users` | Usuarios (Supabase Auth) | id, email, password (hashed) |

#### Relaciones
- `assignments.course_id` → `courses.id` (Foreign Key)
- `courses.user_id` → `auth.users.id`
- `assignments.user_id` → `auth.users.id`

#### Servicios (Data Layer)

**Archivo:** `src/lib/coursesService.js`
```javascript
export const coursesService = {
  getCourses(userId)      // SELECT de todas las materias del usuario
  createCourse(userId, course)  // INSERT nueva materia
  updateCourse(id, updates)     // UPDATE de materia existente
  deleteCourse(id)              // DELETE (inferido del patrón)
}
```

**Archivo:** `src/lib/tasksService.js`
```javascript
export const tasksService = {
  getTasks(userId)           // SELECT join con courses
  createTask(userId, task)   // INSERT nuevo trabajo
  updateTask(id, updates)    // UPDATE (status, deadline, etc.)
  deleteTask(id)             // DELETE
}
```

#### Autenticación: Supabase Auth
**Archivo:** `src/lib/supabaseClient.js`
```javascript
supabase.auth.getSession()      // Recuperar sesión actual
supabase.auth.signOut()         // Cerrar sesión
supabase.auth.onAuthStateChange() // Listener de cambios auth
```

#### Flow de Datos
1. Usuario inicia sesión (Login.jsx) → Supabase Auth
2. AuthContext obtiene user.id de sesión
3. TaskProvider carga tasks desde Supabase
4. Cambios en datos se sincronizan automáticamente

#### Estado Local: MÍNIMO
- **NO hay localStorage** para datos persistentes
- Solo Context API para state management (AuthContext, TaskContext, SettingsContext)
- Las preferencias de usuario (tema, wallpaper, font) no están persistidas en BD (TODO)

---

## 5️⃣ ESTRUCTURA DE ARCHIVOS

```
src/
├── pages/                    📄 Páginas principales (ruteo)
│   ├── Dashboard.jsx         📊 Vista principal con matrices de tareas
│   ├── TaskBoard.jsx         🎯 Kanban: sin entregar → entregado
│   ├── Agenda.jsx            📅 Vista de agenda semanal
│   ├── DailyPlanner.jsx      ⏰ Planificador diario
│   ├── WeeklyPlanner.jsx     📆 Planificador semanal
│   ├── Pomodoro.jsx          🍅 Técnica Pomodoro + sonidos
│   ├── Profile.jsx           👤 Ajustes de usuario
│   ├── Stats.jsx             📈 Estadísticas y analytics
│   └── Login.jsx             🔐 Autenticación Supabase
│
├── components/               🎨 Componentes reutilizables
│   ├── layout/
│   │   ├── Layout.jsx        🏗️ Wrapper con sidebar + main content
│   │   └── Sidebar.jsx       🧭 Navegación lateral
│   │
│   └── ui/                   ✨ Componentes UI especializados
│       ├── CourseModal.jsx   ➕ Modal crear/editar materias (RECIÉN MEJORADO)
│       ├── CustomCalendar.jsx 📅 Selector de fecha personalizado
│       └── ColorPicker.jsx   🎨 Selector de color para materias
│
├── context/                  🔄 State Management (React Context)
│   ├── AuthContext.jsx       🔐 Estado de autenticación
│   ├── TaskContext.jsx       📋 Estado de tareas/trabajos
│   └── SettingsContext.jsx   ⚙️ Estado de preferencias (tema, idioma, etc.)
│
├── lib/                      🔌 Servicios y utilidades
│   ├── supabaseClient.js     🌐 Cliente Supabase configurado
│   ├── coursesService.js     📚 CRUD de materias → Supabase
│   ├── tasksService.js       ✅ CRUD de trabajos → Supabase
│   ├── habitsService.js      🔄 CRUD de hábitos (si aplica)
│   └── audioService.js       🔊 Web Audio API para sonidos
│
├── hooks/                    🪝 Custom React Hooks
│   ├── useCourses.js         📚 Hook para gestionar materias
│   ├── useTasks.js           ✅ Hook para gestionar trabajos
│   └── useHabits.js          🔄 Hook para gestionar hábitos
│
├── assets/                   📷 Imágenes estáticas
│   └── [fondos de pantalla]  🖼️ glass_wallpaper.png, synthwave_neon.png, etc.
│
├── App.jsx                   🚀 Componente raíz + ruteo
├── main.jsx                  🔧 Entry point (Vite)
├── index.css                 🎨 Estilos globales + variables CSS
└── App.css                   (CSS de App, mayormente vaciado)
```

### Flujo de Importes Típico
```
Página (Dashboard.jsx)
  ├── imports Layout
  │   ├── imports Sidebar
  │   └── imports main content
  ├── useAuth() → AuthContext
  ├── useTasksContext() → TaskContext
  ├── imports UI Components (CourseModal, CustomCalendar)
  └── imports lucide-react icons
```

---

## 6️⃣ PATRONES DE DESARROLLO

### A) Contextos de Estado
```javascript
// AuthContext: Sesión de usuario
const { user, isAuthenticated, loading } = useAuth();

// TaskContext: Tareas y materias
const { tasks, courses, createTask, updateTask } = useTasksContext();

// SettingsContext: Preferencias
const { theme, font, language, wallpaper } = useSettings();
```

### B) Hooks Personalizados
```javascript
// useCourses.js
const { courses, loading, error } = useCourses();

// useTasks.js
const { tasks, addTask, updateTask, deleteTask } = useTasks();
```

### C) Animaciones Estándar
- **Framer Motion:** Entrada/salida de modales, transiciones de página
- **GSAP:** Animaciones complejas en Dashboard (radar, matrices)
- **Spring Physics:** `stiffness: 300, damping: 20` (natural motion feel)

### D) Convenciones de Código
- **Estado global:** React Context + custom hooks
- **Naming:** camelCase para variables, PascalCase para componentes
- **Errores:** try-catch en servicios, console.error con prefijos (ej: "ALFA_SAVE_ERROR")

---

## 7️⃣ INFORMACIÓN CRÍTICA PARA DESARROLLADORES

### Reglas de Oro (Anotaciones en código)
1. **Tabla de Trabajos:** Siempre `assignments`, NO `tasks` o `submissions`
2. **Tabla de Materias:** Siempre `courses`, NO `subjects`
3. **Status de Tareas:** Minúsculas → `'sin entregar'`, `'en proceso'`, `'revisión'`, `'entregado'`
4. **Nombres de Usuario:** Se obtienen de `supabase.auth.user`

### Variables de Entorno
```env
VITE_SUPABASE_URL=https://tknrxiksvsmygtszlytf.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_yY3njiGWMWufpD3P8UQUGw__rSc2B0i
```
(Actualmente hardcodeadas en supabaseClient.js - TODO: mover a .env)

### Comandos npm
```bash
npm run dev      # Iniciar servidor Vite (http://localhost:5173)
npm run build    # Build producción
npm run preview  # Previsualizar build
npm run lint     # Verificar código con ESLint
```

### Puertos
- **Desarrollo:** localhost:5173 (Vite default)
- **Supabase:** https://tknrxiksvsmygtszlytf.supabase.co (conexión remota)

---

## 8️⃣ ESTADO DEL PROYECTO (Última Actualización: 31 Marzo 2026 - Final Session)

### ✅ COMPLETADO
- [x] Autenticación con Supabase Auth
- [x] CRUD de materias (courses)
- [x] CRUD de trabajos (assignments)
- [x] Kanban board (TaskBoard)
- [x] Dashboard con matrices
- [x] Pomodoro timer con audio Web API
- [x] CourseModal premium styling (responsive, glassmorphism, glow effects)
- [x] **Calendar Portal Implementation** - DatePicker renderizado fuera del flujo modal (evita colapso de layout)
- [x] **Modal Fixed Positioning** - Modal centrado con position fixed + transform translate
- [x] **Calendar Alignment** - Dropdown posicionado perfectamente bajo input (10px offset)
- [x] Sistema de temas (dark/light/daltonic)
- [x] Soporte multiidioma (ES/EN)
- [x] **index.html Portal Div** - `<div id="root-portal"></div>` añadido para calendar rendering

### ⚠️ EN PROGRESO / TODO
- [ ] Persistencia de preferencias en BD (tema, wallpaper, font)
- [ ] Sincronización offline (Service Workers)
- [ ] Categorías avanzadas de tareas
- [ ] Reportes PDF descargables
- [ ] Integraciones con Google Calendar
- [ ] Mobile app (React Native)
- [ ] Test suite (Jest/Vitest)

### 🔴 BUGS CONOCIDOS
- Ninguno reportado en última sesión

---

## 9️⃣ RECURSOS ÚTILES

### Documentación Official
- [Vite Docs](https://vite.dev)
- [React 19](https://react.dev)
- [React Router v7](https://reactrouter.com)
- [Framer Motion](https://www.framer.com/motion)
- [Supabase Docs](https://supabase.com/docs)
- [Lucide Icons](https://lucide.dev)

### Debugging
1. DevTools: F12 → Network → Ver llamadas a Supabase
2. Console: Buscar `console.error` con prefijos específicos
3. Auth: Verificar en supabase.co/admin → Authentication → Users

---

## 🔟 NOTAS PARA SIGUIENTE DESARROLLADOR

**Si vas a continuar este proyecto:**

1. **Primero:** Lee esta ficha completa
2. **Configura Supabase:** Asegúrate de tener acceso a las tablas `courses` y `assignments`
3. **Instala dependencias:** `npm install`
4. **Inicia desarrollo:** `npm run dev`
5. **Chrome DevTools:** Verifica que las llamadas a Supabase no tengan errores CORS
6. **CSS:** Modifica `src/index.css` para temas globales, inline styles para componentes específicos
7. **Nuevas features:** Usa Context API + custom hooks (NO Redux)
8. **Testing:** Aún no hay suite de tests (Jest, Vitest) - considera agregarlo

---

**Generada por:** GitHub Copilot (Auditor de Software)  
**Clasificación:** Documentación Técnica Oficial  
**Versión del Documento:** 1.0

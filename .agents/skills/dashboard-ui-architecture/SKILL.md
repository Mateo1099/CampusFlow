# Dashboard UI Architecture & Performance Optimization

## 📋 Descripción General

Skill para diseñar, optimizar y refinar la página Dashboard — la pantalla principal de CampusFlow con estadísticas, cards de resumen, gráficos y vista general del usuario.

**Problemas que resuelve:**
- ❌ Dashboard lento al renderizar múltiples cards
- ❌ Gráficos desalineados o mal posicionados
- ❌ Cards sin responsive design en mobile
- ❌ Estado desorganizado (demasiados re-renders)
- ❌ Transiciones abruptas al cargar datos
- ❌ Falta consistencia visual entre elementos

**Resultado esperado:**
- ✅ Dashboard rápido y fluido (60fps)
- ✅ Cards consistentes y responsive
- ✅ Gráficos claros y legibles
- ✅ Animaciones suaves al cargar
- ✅ Estado optimizado (memoization)

---

## 🎯 Anatomía del Dashboard

### Layout General
```
┌─────────────────────────────────────┐
│ Header (Welcome + Quick Actions)    │
├─────────────────────────────────────┤
│ Stats Row (4 cards: Tasks, Courses) │
├─────────────────────────────────────┤
│ Main Content (2 col)                │
│ ┌──────────────┬──────────────────┐ │
│ │ Weekly View  │ Recent Tasks     │ │
│ │              │                  │ │
│ └──────────────┴──────────────────┘ │
├─────────────────────────────────────┤
│ Footer (Links)                      │
└─────────────────────────────────────┘
```

### Componentes Principales
1. **Header Section** — Saludo + botón para crear curso/tarea
2. **Stats Cards** (4 unidades)
   - Total de cursos
   - Tareas pendientes
   - Semana en progreso
   - Racha de hábitos
3. **Charts/Graphs**
   - Gráfico semanal (tareas completadas)
   - Distribución por categoría
4. **Recent Activity**
   - Últimas tareas
   - Cursos activos
5. **Quick Actions**
   - Botones rápidos (Nueva tarea, Iniciar Pomodoro)

---

## 🎨 Diseño de Stats Cards

### Estructura de una Card
```jsx
<StatCard 
  title="Tareas Pendientes"
  value={23}
  icon={<CheckCircle />}
  trend="+5 esta semana"
  color="#00f3ff"  // Cyan
/>
```

### Styling Base
```jsx
statCardStyle={{
  padding: '24px',
  borderRadius: '16px',
  background: 'rgba(15, 15, 20, 0.8)',
  border: '1px solid rgba(0, 243, 255, 0.25)',
  backdropFilter: 'blur(20px)',
  transition: 'all 0.3s ease',
  cursor: 'pointer'
}}
```

### Hover Effect
```jsx
onMouseEnter={() => setHovered(true)}
onMouseLeave={() => setHovered(false)}

// Cuando hovered:
scale: 1.05,
boxShadow: '0 0 30px rgba(0, 243, 255, 0.3)',
borderColor: 'rgba(0, 243, 255, 0.5)'
```

### Animación de Entrada
```jsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.1 }}
```

---

## 📊 Integración de Gráficos

### Opciones Recomendadas
1. **Chart.js** (con react-chartjs-2)
2. **Recharts** (React-native, simple)
3. **Visx** (Airbnb, flexible)
4. **D3.js** (Complejo pero poderoso)

**Para CampusFlow recomiendo Recharts por:**
- ✅ Responsivo automático
- ✅ Animaciones suaves incluidas
- ✅ Poco setup requerido
- ✅ Sintaxis JSX

### Ejemplo Recharts
```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const data = [
  { day: 'Lun', tasks: 5, completed: 3 },
  { day: 'Mar', tasks: 4, completed: 4 },
  // ...
];

<BarChart width={400} height={300} data={data}>
  <XAxis dataKey="day" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="completed" fill="#00f3ff" />
  <Bar dataKey="tasks" fill="#ff4d4d" />
</BarChart>
```

---

## ⚡ Optimización de Performance

### 1. Memoization
```jsx
// Evita re-renders innecesarios
const StatCard = React.memo(({ title, value, icon }) => (
  // ... rendering
));

const ChartComponent = React.memo(({ data }) => (
  // ... rendering
));
```

### 2. useMemo para Datos
```jsx
const processedData = useMemo(() => {
  return data
    .filter(item => item.active)
    .map(item => ({
      ...item,
      percentage: (item.value / total) * 100
    }));
}, [data, total]); // Solo recalcula si cambia data o total
```

### 3. Lazy Loading
```jsx
import { Suspense, lazy } from 'react';

const ChartSection = lazy(() => import('./ChartSection'));

<Suspense fallback={<LoadingSpinner />}>
  <ChartSection />
</Suspense>
```

### 4. Separar Data Fetching
```jsx
// ✅ Bien: Fetch en useEffect, actualiza estado
useEffect(() => {
  fetchDashboardData().then(setData);
}, []);

// ❌ Evitar: Fetch en render
const data = fetchDashboardData(); // ← Infinito loop
```

---

## 📱 Responsive Design

### Breakpoints
```jsx
const breakpoints = {
  mobile: '375px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px'
};
```

### Grid Responsivo
```jsx
style={{
  display: 'grid',
  gridTemplateColumns: window.innerWidth < 768 
    ? '1fr'                    // Mobile: 1 columna
    : window.innerWidth < 1024
      ? 'repeat(2, 1fr)'       // Tablet: 2 columnas
      : 'repeat(4, 1fr)',      // Desktop: 4 columnas
  gap: '20px'
}}
```

O usar media query simuladas:
```jsx
const isMobile = useMediaQuery('(max-width: 768px)');
const isTablet = useMediaQuery('(max-width: 1024px)');

<div style={{
  gridTemplateColumns: isMobile 
    ? '1fr' 
    : isTablet 
      ? 'repeat(2, 1fr)' 
      : 'repeat(4, 1fr)'
}}>
```

---

## 🔄 State Management Pattern

### Context para Dashboard
```jsx
// DashboardContext.jsx
const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardContext.Provider value={{ dashboardData, loading, error }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
```

### Componente Consumer
```jsx
const Dashboard = () => {
  const { dashboardData, loading, error } = useDashboard();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      {dashboardData && (
        <>
          <StatsGrid data={dashboardData.stats} />
          <Charts data={dashboardData.charts} />
        </>
      )}
    </div>
  );
};
```

---

## 🎬 Animaciones de Carga

### Skeleton Loading
```jsx
const SkeletonCard = () => (
  <motion.div
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 1.5, repeat: Infinity }}
    style={{
      height: '120px',
      borderRadius: '16px',
      background: 'rgba(0, 243, 255, 0.1)'
    }}
  />
);
```

### Stagger Animation
```jsx
<motion.div>
  <AnimatePresence>
    {stats.map((stat, i) => (
      <motion.div
        key={stat.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ delay: i * 0.1 }}
      >
        <StatCard {...stat} />
      </motion.div>
    ))}
  </AnimatePresence>
</motion.div>
```

---

## 📋 Checklist de Implementación

### Estructura
- [ ] Dashboard tiene 5 secciones principales (header, stats, charts, activity, footer)
- [ ] Stats cards en grid responsivo (4 cols desktop, 2 cols tablet, 1 col mobile)
- [ ] Cada card tiene icono, número, trending, descripción

### Styling
- [ ] Tema glassmorphism cyan aplicado globalmente
- [ ] Colores consistentes (CYAN_THEME usado)
- [ ] Shadows y blur efectivos (no sobrecargado)
- [ ] Tipografía jerárquica (números grandes, descripciones pequeñas)

### Performance
- [ ] React.memo aplicado a StatsCard, ChartSection
- [ ] useMemo para transformar datos
- [ ] Lazy loading de gráficos pesados
- [ ] useCallback para event handlers

### Data
- [ ] Datos fetched en useEffect (no en render)
- [ ] Loading state visualizado (skeleton)
- [ ] Error handling implementado
- [ ] Re-fetch en intervals o cuando sea necesario

### Interactividad
- [ ] Hover effects en cards
- [ ] Click en cards navega a detalles
- [ ] Quick action buttons funcionan
- [ ] No hay lag en animaciones (60fps)

### Responsive
- [ ] Mobile: Cards en columna única, fuentes legibles
- [ ] Tablet: 2 columnas, grid ajustado
- [ ] Desktop: 4 columnas, layout completo
- [ ] Landscape: Mantiene usabilidad

---

## 🚀 Implementación Paso a Paso

### Paso 1: Crear Estructura Base (10 min)
```jsx
const Dashboard = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <HeaderSection />
      <StatsGrid />
      <MainContent />
      <FooterSection />
    </div>
  );
};
```

### Paso 2: Agregar Stats Cards (15 min)
1. Crear componente StatCard reutilizable
2. Estructura: icono + número + descripción + trending
3. Styling glassmorphism cyan
4. Animación de entrada con stagger

### Paso 3: Integrar Gráficos (20 min)
1. Instalar librería (Recharts recomendado)
2. Crear Chart component
3. Pasar datos procesados
4. Hacer responsivo

### Paso 4: Optimizar (10 min)
1. Envolver componentes en React.memo
2. Agregar useMemo para cálculos pesados
3. Implementar skeleton loading
4. Medir performance con DevTools

### Paso 5: Pulir UX (10 min)
1. Agregar hover effects
2. Transiciones suaves
3. Responsive final check
4. Verificación accesibilidad

**Tiempo total: 60-75 minutos**

---

## ⚠️ Errores Comunes

| Error | Síntoma | Solución |
|-------|---------|----------|
| **Lentitud general** | Dashboard tarda >2s en cargar | Usar React.memo, useMemo en datos |
| **Cards desalineadas** | Grid se rompe en mobile | Usar media queries correctamente |
| **Re-renders infinitos** | Dashboard flashea constantemente | Verificar useEffect dependency |
| **Gráficos no responsive** | Gráficos desbordados en mobile | Usar `layout="responsive"` en Recharts |
| **Colores inconsistentes** | Cards con colores diferentes | Usar CYAN_THEME constant |
| **Animaciones choppy** | Stagger animation se ve roto | Usar `transition={{ delay: i * 0.1 }}` |

---

## 💡 Mejoras Futuras

- [ ] Agregar filtros (por semana, mes, categoría)
- [ ] Exportar dashboard a PDF
- [ ] Gráficos interactivos (click en barra = ver detalles)
- [ ] Widget drag-and-drop para personalizar layout
- [ ] Dark/light mode toggle
- [ ] Notificaciones desktop

---

## 🎓 Relación con Otros Skills

- **Modal Refinement** — Para modales de detalle en stats
- **Pomodoro Optimization** — Para widget Pomodoro en dashboard
- **Frontend Design** — Para estilos premium de cards
- **UI/UX Pro Max** — Para paletas de colores adicionales


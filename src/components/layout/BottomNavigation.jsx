import { useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  BarChart3,
  Clock,
  Calendar,
  CalendarDays,
  PieChart,
  Settings
} from 'lucide-react';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Items de navegación con ruta y ícono. Antes solo cubría 5 de las 7
  // secciones reales de la app (faltaban Planificador y Analítica), dejando
  // esas dos funciones completas del producto sin acceso directo en móvil.
  // Orden alineado con Sidebar.jsx para que la navegación se sienta igual
  // sin importar el tamaño de pantalla.
  const navItems = [
    { path: '/', label: 'Inicio', icon: BarChart3 },
    { path: '/agenda', label: 'Materias', icon: Calendar },
    { path: '/tasks', label: 'Tareas', icon: ClipboardList },
    { path: '/planner', label: 'Plan', icon: CalendarDays },
    { path: '/stats', label: 'Analítica', icon: PieChart },
    { path: '/pomodoro', label: 'Pomodoro', icon: Clock },
    { path: '/profile', label: 'Perfil', icon: Settings },
  ];

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname === path;

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(10, 10, 20, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 243, 255, 0.1)',
        display: 'flex',
        // 7 items ya no caben cómodamente con `space-around` en 320-360px sin
        // apretar cada botón hasta ilegibilidad. En vez de reducir el
        // conjunto de secciones disponibles, se permite scroll horizontal:
        // todas las secciones siguen siendo alcanzables, solo que en las
        // pantallas más angostas puede hacer falta un swipe lateral.
        justifyContent: 'flex-start',
        overflowX: 'auto',
        overflowY: 'hidden',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 -2px 20px rgba(0, 243, 255, 0.05)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '1 0 64px',
              minWidth: '64px',
              height: '100%',
              gap: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? '#00f3ff' : 'rgba(255, 255, 255, 0.5)',
              transition: 'all 0.3s ease',
              borderTop: active ? '3px solid #00f3ff' : '3px solid transparent',
              fontWeight: active ? 600 : 400,
              fontSize: '0.62rem',
              padding: '4px 6px',
              whiteSpace: 'nowrap'
            }}
            title={item.label}
          >
            <Icon size={19} strokeWidth={2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;

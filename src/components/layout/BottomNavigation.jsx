import { useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  BarChart3,
  Clock,
  Calendar,
  Settings
} from 'lucide-react';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Items de navegación con ruta y ícono
  const navItems = [
    { path: '/', label: 'Inicio', icon: BarChart3 },
    { path: '/tasks', label: 'Tareas', icon: ClipboardList },
    { path: '/pomodoro', label: 'Pomodoro', icon: Clock },
    { path: '/agenda', label: 'Materias', icon: Calendar },
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
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 -2px 20px rgba(0, 243, 255, 0.05)',
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
              width: '100%',
              height: '100%',
              gap: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? '#00f3ff' : 'rgba(255, 255, 255, 0.5)',
              transition: 'all 0.3s ease',
              borderTop: active ? '3px solid #00f3ff' : '3px solid transparent',
              fontWeight: active ? 600 : 400,
              fontSize: '0.65rem',
              padding: '4px 0',
            }}
            title={item.label}
          >
            <Icon size={20} strokeWidth={2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;

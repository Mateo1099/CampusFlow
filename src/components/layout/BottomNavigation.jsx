import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  BarChart3,
  Clock,
  Calendar,
  CalendarDays,
  PieChart,
  Settings,
  MoreHorizontal,
  X,
  ChevronRight,
  Sparkles,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // 4 accesos directos principales en móvil
  const mainNavItems = [
    { path: '/', label: 'Inicio', icon: BarChart3 },
    { path: '/agenda', label: 'Materias', icon: Calendar },
    { path: '/tasks', label: 'Tareas', icon: ClipboardList },
    { path: '/planner', label: 'Calendario', icon: CalendarDays },
  ];

  // 3 accesos secundarios en el menú emergente "Más"
  const secondaryNavItems = [
    {
      path: '/pomodoro',
      label: 'Pomodoro',
      description: 'Enfoque y temporizador de estudio',
      icon: Clock,
      color: '#00f3ff'
    },
    {
      path: '/stats',
      label: 'Analítica',
      description: 'Métricas de progreso y rendimiento',
      icon: PieChart,
      color: '#bc13fe'
    },
    {
      path: '/profile',
      label: 'Perfil',
      description: 'Ajustes, institución y cuenta',
      icon: Settings,
      color: '#ffc800'
    }
  ];

  const isMainActive = (path) => path === '/' ? location.pathname === '/' : location.pathname === path;
  const isMoreActive = secondaryNavItems.some((item) => location.pathname === item.path);

  // Reseteo limpio de menú emergente al navegar (patrón recomendado por React)
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setShowMoreMenu(false);
  }

  // Cerrar al pulsar Escape
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowMoreMenu(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMoreMenu]);

  const handleNavigate = (path) => {
    navigate(path);
    setShowMoreMenu(false);
  };

  const handleLogout = async () => {
    try {
      if (supabase?.auth?.signOut) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error al cerrar sesión:', err);
    } finally {
      setShowMoreMenu(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      {/* Menú emergente / Modal para accesos secundarios (Pomodoro, Analítica, Perfil) */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            {/* Backdrop táctil */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowMoreMenu(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1001,
                background: 'rgba(5, 7, 14, 0.72)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
              aria-hidden="true"
            />

            {/* Hoja / Panel emergente Cyber Luxe */}
            <motion.div
              initial={{ opacity: 0, y: 35, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 35, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Accesos secundarios y herramientas"
              style={{
                position: 'fixed',
                bottom: '76px',
                left: '12px',
                right: '12px',
                maxWidth: '420px',
                margin: '0 auto',
                background: 'linear-gradient(150deg, rgba(16, 20, 32, 0.98) 0%, rgba(10, 12, 22, 0.98) 100%)',
                border: '1px solid rgba(0, 243, 255, 0.3)',
                borderRadius: '22px',
                padding: '16px 14px',
                boxShadow: '0 20px 48px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 243, 255, 0.15)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                zIndex: 1002,
                overflow: 'hidden'
              }}
            >
              {/* Barra neón superior sutil */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '20%',
                  right: '20%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #00f3ff, #bc13fe, transparent)',
                  borderRadius: '999px'
                }}
              />

              {/* Cabecera del modal con botón de cierre */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 4px 12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(0, 243, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Sparkles size={15} color="#00f3ff" />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        color: 'var(--text-primary, #ffffff)',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.02em'
                      }}
                    >
                      Más Herramientas
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)' }}>
                      Módulos académicos avanzados
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMoreMenu(false)}
                  aria-label="Cerrar menú"
                  style={{
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: 0
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lista de accesos secundarios táctiles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;

                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleNavigate(item.path)}
                      style={{
                        minHeight: '52px',
                        width: '100%',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        background: active
                          ? 'rgba(0, 243, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: active
                          ? `1px solid ${item.color}`
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        boxShadow: active
                          ? `0 0 16px ${item.color}33, inset 0 1px 0 rgba(255,255,255,0.15)`
                          : 'none',
                        outline: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: active ? `${item.color}26` : 'rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Icon size={20} color={active ? item.color : 'rgba(255, 255, 255, 0.8)'} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              color: active ? '#ffffff' : 'var(--text-primary, #ffffff)',
                              lineHeight: 1.2
                            }}
                          >
                            {item.label}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.72rem',
                              color: 'var(--text-secondary, #94a3b8)',
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {item.description}
                          </span>
                        </div>
                      </div>

                      <ChevronRight
                        size={18}
                        color={active ? item.color : 'rgba(255, 255, 255, 0.35)'}
                        style={{ flexShrink: 0 }}
                      />
                    </button>
                  );
                })}

                {/* Cerrar Sesión en menú Más */}
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Cerrar sesión"
                  style={{
                    minHeight: '48px',
                    width: '100%',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: 'rgba(255, 77, 77, 0.08)',
                    border: '1px solid rgba(255, 77, 77, 0.25)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: '4px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(255, 77, 77, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <LogOut size={20} color="#ff4d4d" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: '#ff4d4d',
                          lineHeight: 1.2
                        }}
                      >
                        Cerrar Sesión
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          color: 'rgba(255, 255, 255, 0.6)',
                          lineHeight: 1.3,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        Finalizar sesión activa
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    color="rgba(255, 77, 77, 0.6)"
                    style={{ flexShrink: 0 }}
                  />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* BARRA DE NAVEGACIÓN INFERIOR (BOTTOM NAV) - MÁXIMO 5 ACCESOS ERGONÓMICOS */}
      <nav
        role="navigation"
        aria-label="Barra de navegación móvil"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: 'rgba(8, 11, 20, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(0, 243, 255, 0.16)',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'center',
          zIndex: 1000,
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.5), 0 -1px 0 rgba(255, 255, 255, 0.05)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
      >
        {/* 4 Accesos directos principales: Inicio, Materias, Tareas, Plan */}
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isMainActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigate(item.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '48px',
                gap: '3px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? '#00f3ff' : 'rgba(255, 255, 255, 0.52)',
                transition: 'color 0.2s ease, transform 0.15s ease',
                position: 'relative',
                padding: '6px 2px',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* Indicador activo neón en el borde superior */}
              {active && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '22%',
                    right: '22%',
                    height: '3px',
                    background: '#00f3ff',
                    boxShadow: '0 0 10px #00f3ff',
                    borderRadius: '0 0 4px 4px'
                  }}
                />
              )}

              <Icon
                size={21}
                strokeWidth={active ? 2.3 : 1.9}
                style={{
                  filter: active ? 'drop-shadow(0 0 8px rgba(0, 243, 255, 0.5))' : 'none',
                  transition: 'filter 0.2s ease, transform 0.2s ease',
                  transform: active ? 'translateY(-1px)' : 'none'
                }}
              />
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: active ? 800 : 500,
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                  fontFamily: 'var(--font-display)'
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 5º Acceso: "Más" (abre modal con Pomodoro, Analítica, Perfil) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu((prev) => !prev)}
          aria-expanded={showMoreMenu}
          aria-haspopup="dialog"
          aria-label="Más herramientas y accesos"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '48px',
            gap: '3px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: (showMoreMenu || isMoreActive) ? '#00f3ff' : 'rgba(255, 255, 255, 0.52)',
            transition: 'color 0.2s ease, transform 0.15s ease',
            position: 'relative',
            padding: '6px 2px',
            outline: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {/* Indicador activo si está abierto el menú o en una ruta secundaria */}
          {(showMoreMenu || isMoreActive) && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '22%',
                right: '22%',
                height: '3px',
                background: '#00f3ff',
                boxShadow: '0 0 10px #00f3ff',
                borderRadius: '0 0 4px 4px'
              }}
            />
          )}

          <div style={{ position: 'relative' }}>
            <MoreHorizontal
              size={22}
              strokeWidth={(showMoreMenu || isMoreActive) ? 2.4 : 1.9}
              style={{
                filter: (showMoreMenu || isMoreActive)
                  ? 'drop-shadow(0 0 8px rgba(0, 243, 255, 0.5))'
                  : 'none',
                transform: showMoreMenu ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.25s ease, filter 0.2s ease'
              }}
            />
            {/* Punto de notificación sutil si está activo en subpágina */}
            {isMoreActive && !showMoreMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-3px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#bc13fe',
                  boxShadow: '0 0 6px #bc13fe'
                }}
              />
            )}
          </div>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: (showMoreMenu || isMoreActive) ? 800 : 500,
              letterSpacing: '0.01em',
              lineHeight: 1,
              fontFamily: 'var(--font-display)'
            }}
          >
            Más
          </span>
        </button>
      </nav>
    </>
  );
};

export default BottomNavigation;

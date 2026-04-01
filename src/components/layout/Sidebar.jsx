import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Cpu, CheckSquare, CalendarDays, Timer, UserCircle, PieChart, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useTasksContext } from '../../context/TaskContext';

const Sidebar = () => {
  const { t, settings } = useSettings();
  const { analytics } = useTasksContext();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarLoaded, setAvatarLoaded] = React.useState(false);
  const [triggerAnimation, setTriggerAnimation] = React.useState({});
  const isHorizontal = settings.sidebarPosition === 'top' || settings.sidebarPosition === 'bottom';

  const avatarDisplayUrl = settings.avatarUrl || null;
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${settings.name || 'Mateo'}&background=00f3ff&color=fff&font-size=0.4&bold=true`;

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  // Trigger animations on route change
  React.useEffect(() => {
    const activePath = navItems.find(item => item.path === location.pathname);
    if (activePath) {
      setTriggerAnimation({ key: activePath.path, timestamp: Date.now() });
    }
  }, [location.pathname]);

  const navItems = [
    { name: t.dashboard, path: '/', icon: <LayoutDashboard size={isHorizontal ? 20 : 18} /> },
    { name: t.subjects, path: '/agenda', icon: <Cpu size={isHorizontal ? 20 : 18} /> },
    { name: t.tasks, path: '/tasks', icon: <CheckSquare size={isHorizontal ? 20 : 18} /> },
    { name: t.planner, path: '/planner', icon: <CalendarDays size={isHorizontal ? 20 : 18} /> },
    { name: t.analytics, path: '/stats', icon: <PieChart size={isHorizontal ? 20 : 18} /> },
    { name: t.pomodoro, path: '/pomodoro', icon: <Timer size={isHorizontal ? 20 : 18} /> },
  ];

  const sidebarStyles = {
    width: isHorizontal ? '100%' : '260px',
    height: isHorizontal ? 'auto' : '100%',
    padding: isHorizontal ? '12px 24px' : '28px 20px',
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    alignItems: isHorizontal ? 'center' : 'stretch',
    gap: isHorizontal ? '32px' : '24px',
    borderRadius: 'var(--radius-lg)',
    flexShrink: 0,
    border: '1px solid var(--border-glass-top)',
    transition: 'all 0.4s var(--ease-out-quint)',
    zIndex: 100,
  };

  return (
    <aside className="sidebar glass-panel" style={sidebarStyles}>
      {/* Branding */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '14px', 
        paddingBottom: isHorizontal ? '0' : '24px', 
        marginBottom: isHorizontal ? '0' : '8px', 
        borderBottom: isHorizontal ? 'none' : '1px solid var(--border-glass-top)',
        borderRight: isHorizontal ? '1px solid var(--border-glass-top)' : 'none',
        paddingRight: isHorizontal ? '24px' : '0'
      }}>
        <div style={{
          position: 'relative',
          width: isHorizontal ? '50px' : '70px', height: isHorizontal ? '50px' : '70px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {/* Lápiz de Vidrio 1 */}
          <div className="glass-pencil-container" style={{ position: 'absolute', top: '-12px', right: '-8px', transform: 'rotate(25deg)', animation: 'float 4s ease-in-out infinite' }}>
            <div style={{ width: '6px', height: '24px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: '2px' }} />
            <div style={{ width: 0, height: 0, borderLeft: '3px solid transparent', borderRight: '3px solid transparent', borderTop: '6px solid rgba(255,255,255,0.6)' }} />
          </div>

          {/* Lápiz de Vidrio 2 */}
          <div className="glass-pencil-container" style={{ position: 'absolute', bottom: '-4px', right: '-12px', transform: 'rotate(-45deg)', animation: 'float 5s ease-in-out infinite reverse' }}>
            <div style={{ width: '5px', height: '20px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(3px)', border: '1.2px solid rgba(255,255,255,0.4)', borderRadius: '2px' }} />
            <div style={{ width: 0, height: 0, borderLeft: '2.5px solid transparent', borderRight: '2.5px solid transparent', borderTop: '5px solid rgba(255,255,255,0.5)' }} />
          </div>

          {/* Logo Diamante C (CSS Puro) - Sincronizado con Temas */}
          <div style={{
            width: '100%', height: '100%',
            background: `radial-gradient(circle at 30% 30%, #fff 0%, transparent 15%), radial-gradient(circle at 70% 30%, var(--accent-primary) 0%, transparent 15%), conic-gradient(from 180deg at 50% 50%, #e2e8f0, var(--accent-primary), #cbd5e1, var(--accent-primary), #e2e8f0)`,
            mask: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M85 50C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15C60.5 15 69.8 19.6 76.1 26.9L86.4 16.6C77.4 6.2 64.5 0 50 0C22.4 0 0 22.4 0 50C0 77.6 22.4 100 50 100C77.6 100 100 77.6 100 50H85Z\' fill=\'black\' /%3E%3C/svg%3E") no-repeat center',
            WebkitMask: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M85 50C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15C60.5 15 69.8 19.6 76.1 26.9L86.4 16.6C77.4 6.2 64.5 0 50 0C22.4 0 0 22.4 0 50C0 77.6 22.4 100 50 100C77.6 100 100 77.6 100 50H85Z\' fill=\'black\' /%3E%3C/svg%3E") no-repeat center',
            boxShadow: '0 0 30px rgba(255,255,255,0.4)',
            transition: 'background 0.5s ease, transform 0.4s ease',
            transform: 'rotate(12deg)'
          }} />
        </div>
        {!isHorizontal && (
          <div style={{ marginLeft: '6px' }}>
            <h2 style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '1.8rem', 
              fontWeight: 950, 
              margin: 0, 
              letterSpacing: '-0.06em', 
              color: '#fff',
              display: 'flex', 
              alignItems: 'center',
              textShadow: '0 2px 4px rgba(0,0,0,0.3), 0 0 10px rgba(255,255,255,0.2)',
              filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.3))'
            }}>
              <span style={{ 
                background: 'linear-gradient(to bottom, #ffffff, #a1a1a1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>ampusFlow</span>
            </h2>
          </div>
        )}
      </div>

      {/* Gamification HUD - Cyber Luxe Level Display */}
      {!isHorizontal && (
        <div style={{ 
          padding: '16px', 
          position: 'relative',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(10px)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-glass-top)',
          margin: '0 -4px 10px',
          boxShadow: 'inset 0 0 20px rgba(0, 122, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ 
              fontSize: '0.65rem', 
              color: 'var(--text-secondary)', 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.15em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                width: '6px', height: '6px',
                background: 'var(--accent-primary)',
                borderRadius: '50%',
                boxShadow: '0 0 10px var(--accent-primary)',
                animation: 'pulse 2s infinite'
              }}/>
              Nivel de Usuario
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                position: 'relative',
                width: '32px', height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
                transform: 'rotate(-5deg) translateZ(0)'
              }}>
                <span style={{
                  fontSize: '1rem', 
                  fontWeight: 900, 
                  color: '#fff',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>★</span>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ 
                  fontSize: '1.8rem', 
                  color: 'var(--text-primary)', 
                  fontFamily: 'var(--font-display)', 
                  fontWeight: 950, 
                  letterSpacing: '-0.02em',
                  display: 'block',
                  lineHeight: 1
                }}>
                  {settings.level}
                </span>
                <span style={{
                  position: 'absolute',
                  top: '-6px', right: '-10px',
                  fontSize: '0.5rem',
                  fontWeight: 800,
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase'
                }}>lvl</span>
              </div>
            </div>
          </div>

          {/* Barra de Progreso Minimalista */}
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: 'var(--radius-full)', 
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid var(--border-glass-side)'
          }}>
            <div style={{ 
              width: `${Math.min((analytics.totalXP / 1000) * 100, 100)}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
              borderRadius: 'var(--radius-full)',
              transition: 'width 1s var(--ease-out-expo)',
              boxShadow: '0 0 15px var(--accent-primary)66',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                animation: 'shimmer 2s infinite'
              }} />
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '10px',
            fontSize: '0.6rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            letterSpacing: '0.05em'
          }}>
            <span style={{ color: 'var(--accent-primary)' }}>{analytics.totalXP} XP</span>
            <span style={{ color: 'var(--text-muted)' }}>1000 XP</span>
          </div>
        </div>
      ) /* End Gamification HUD */}

      {/* Navegación - GLASSMORPHISM DESIGN */}
      <nav className="nav-stagger" style={{ 
        display: 'flex', 
        flexDirection: isHorizontal ? 'row' : 'column', 
        gap: isHorizontal ? '8px' : '10px', 
        flex: 1,
        justifyContent: isHorizontal ? 'center' : 'flex-start'
      }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '');
          const isTriggering = triggerAnimation.key === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={isActive ? 'active' : ''}
              style={{
                position: 'relative',
                padding: isHorizontal ? '10px 16px' : '14px 18px',
                fontSize: isHorizontal ? '0.75rem' : '0.85rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: isActive ? '#000' : 'var(--text-secondary)',
                overflow: 'hidden',
                transition: 'color 0.3s var(--ease-out-quint)',
                transform: 'translateZ(0)',
              }}
            >
              {/* GLASS BACKGROUND - Glassmorphism Base */}
              <div 
                className="glass-bg"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'var(--radius-md)',
                  background: isActive 
                    ? 'linear-gradient(135deg, var(--accent-primary)ee 0%, var(--accent-secondary)dd 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.0) 100%)',
                  opacity: isActive ? 1 : 0,
                  transition: 'opacity 0.3s var(--ease-out-quint), background 0.3s var(--ease-out-quint)',
                  pointerEvents: 'none',
                  zIndex: 0,
                  ...(isActive && { animation: 'barIn 0.4s var(--ease-out-expo) backwards' })
                }}
              />

              {/* GLASS BORDER - Luminous Top Border */}
              <div 
                className="glass-border"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: isActive 
                    ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
                    : 'transparent',
                  transition: 'background 0.3s var(--ease-out-quint)',
                  zIndex: 2,
                  pointerEvents: 'none'
                }}
              />

              {/* SHIMMER WRAP - Destello de luz */}
              <div 
                className="shimmer-wrap"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              >
                <div 
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.1) 60%, transparent 100%)',
                    animation: isActive && isTriggering ? 'shimmer 0.8s var(--ease-out-expo) ease-out' : 'none',
                    pointerEvents: 'none'
                  }}
                />
              </div>

              {/* ACTIVE BAR - Barra lateral vertical */}
              {isActive && (
                <div 
                  className="active-bar"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: 'linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 0 15px var(--accent-primary), 0 0 8px var(--accent-secondary)',
                    animation: 'barIn 0.4s var(--ease-out-expo) backwards, barPulse 2s ease-in-out 0.4s infinite',
                    zIndex: 3,
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* ICON - Con animación de rebote */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(isActive && isTriggering && { animation: 'iconPop 0.6s var(--ease-out-expo) ease-out' })
                }}
              >
                {item.icon}
              </div>

              {/* TEXT CONTENT */}
              <span style={{ position: 'relative', zIndex: 4, whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Perfil/Ajustes Link  */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isHorizontal ? 'row' : 'column',
        gap: '8px',
        marginTop: isHorizontal ? '0' : 'auto'
      }}>
        <NavLink
          to="/profile"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: isHorizontal ? '8px 16px' : '14px 16px',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
            border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass-top)',
            transition: 'all 0.3s var(--ease-out-quint)',
            flex: 1,
            transform: 'translateZ(0)',
            minWidth: isHorizontal ? 'auto' : '0',
          })}
          className="glass-card-hover"
        >
          <div style={{ 
            width: isHorizontal ? '32px' : '40px', 
            height: isHorizontal ? '32px' : '40px', 
            borderRadius: '50%', 
            overflow: 'hidden', 
            border: '2px solid var(--accent-primary)',
            background: 'var(--bg-glass)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 10px var(--accent-primary)33',
            position: 'relative'
          }}>
            {/* SKELETON NEÓN */}
            {!avatarLoaded && (
              <div 
                className="animate-pulse-neon"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--accent-primary)15',
                  boxShadow: 'inset 0 0 15px var(--accent-primary)33',
                  zIndex: 2,
                  transition: 'opacity 0.5s ease-in-out',
                  opacity: !avatarLoaded ? 1 : 0,
                  pointerEvents: 'none'
                }}
              />
            )}

            <img 
              key={avatarDisplayUrl || fallbackAvatar}
              src={avatarDisplayUrl || fallbackAvatar}
              alt="User Avatar" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                opacity: avatarLoaded ? 1 : 0,
                transition: 'opacity 0.4s ease-in-out'
              }}
              onLoad={() => setAvatarLoaded(true)}
              onError={(e) => { 
                e.target.onerror = null;
                e.target.src = fallbackAvatar;
                setAvatarLoaded(true);
              }}
            />
          </div>
          {!isHorizontal && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {settings.name || 'Mateo'}
              </p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 600 }}>{t.profile}</p>
            </div>
          )}
        </NavLink>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            padding: isHorizontal ? '8px 16px' : '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 0, 0, 0.05)',
            border: '1px solid rgba(255, 0, 0, 0.2)',
            color: '#ff4d4d',
            cursor: 'pointer',
            transition: 'all 0.3s var(--ease-out-quint)',
            width: isHorizontal ? 'auto' : '100%'
          }}
          className="click-press"
          title={t.logout}
        >
          <LogOut size={isHorizontal ? 20 : 18} />
          {!isHorizontal && <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.logout}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSettings, WALLPAPERS } from '../../context/SettingsContext';

const Layout = () => {
  const { settings, recentXPGains } = useSettings();
  
  const wp = WALLPAPERS.find(w => w.id === settings.wallpaper);
  const bgSrc = settings.wallpaper === 'custom' ? settings.customWallpaper : (wp ? wp.src : null);

  return (
    <>
      <div 
        className="bg-wallpaper-layer"
        style={{
          position: 'fixed', inset: 0, zIndex: -3,
          backgroundImage: bgSrc ? `url("${bgSrc}")` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
          transition: 'background-image 0.5s ease'
        }} 
      />
      <div 
        className="bg-theme-tint"
        style={{
          position: 'fixed', inset: 0, zIndex: -2,
          backgroundColor: 'var(--bg-primary)',
          opacity: bgSrc ? 0.70 : 1,
          transition: 'background-color var(--transition-slow), opacity 0.5s ease',
          pointerEvents: 'none'
        }} 
      />
      <div id="grain-overlay" />
      <div className="app-container" style={{
        flexDirection: settings.sidebarPosition === 'right' ? 'row-reverse' : 
                       settings.sidebarPosition === 'top' ? 'column' : 
                       settings.sidebarPosition === 'bottom' ? 'column-reverse' : 'row',
        transition: 'flex-direction 0.5s var(--ease-out-quint)'
      }}>
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* XP Notifications Overlay (Delight Moment) */}
      <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 1000, pointerEvents: 'none' }}>
        {recentXPGains.map(gain => (
          <div 
            key={gain.id} 
            className="animate-xp-float"
            style={{ 
              color: 'var(--accent-lime)', 
              fontWeight: 900, 
              fontSize: '1.5rem', 
              fontFamily: 'var(--font-display)',
              textShadow: '0 0 10px rgba(52, 199, 89, 0.5)',
              marginBottom: '-20px'
            }}
          >
            +{gain.amount} XP
          </div>
        ))}
      </div>
    </>
  );
};

export default Layout;

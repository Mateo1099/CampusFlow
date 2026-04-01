import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSettings, FONT_OPTIONS } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
  User, Palette, Check, ImageIcon, Camera, Languages, Type, Shield,
  Layout as LayoutIcon, ChevronDown, RefreshCcw, Loader2, Pencil, Bell, X
} from 'lucide-react';

const THEMES = [
  { id: 'dark', labelKey: 'darkMode', icon: '🌙', gradient: 'linear-gradient(135deg, #0f172a, #1e293b)' },
  { id: 'light', labelKey: 'lightMode', icon: '☀️', gradient: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' },
  { id: 'daltonic', labelKey: 'daltonicMode', icon: '👁️', gradient: 'linear-gradient(135deg, #0c4a6e, #075985)' },
];

const WALLPAPERS = [
  { id: 'cyber', label: 'Frosted Glass', src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000' },
  { id: 'nature', label: 'Forest Glass', src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000' },
  { id: 'synth', label: 'Synthwave', src: 'https://images.unsplash.com/photo-1774848372214-3563247a592b?q=80&w=1935&auto=format&fit=crop' },
  { id: 'space', label: 'Deep Cyber', src: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop' },
];

// NOTIFICATION ROW COMPONENT - Glass Design with Micro-interactions
const NotificationRow = ({ checked, onChange, label, icon: IconComponent }) => {
  const [hasAnimated, setHasAnimated] = React.useState(false);

  const handleToggle = (newValue) => {
    onChange(newValue);
    if (newValue && !hasAnimated) {
      setHasAnimated(false); // Reset para próxima animación
      setTimeout(() => setHasAnimated(true), 10);
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: '12px',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: checked ? 'scale(1)' : 'scale(1)',
      opacity: 1
    }}>
      {/* Capas de Fondo Glassmorphism */}
      <div className="glass-bg" style={{
        position: 'absolute',
        inset: 0,
        background: checked 
          ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.08) 0%, rgba(0, 243, 255, 0.03) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 1
      }} />

      <div className="glass-border" style={{
        position: 'absolute',
        inset: 0,
        border: `2px solid ${checked ? 'rgba(0, 243, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '12px',
        boxShadow: checked 
          ? '0 0 30px rgba(0, 243, 255, 0.3), inset 0 0 20px rgba(0, 243, 255, 0.1)'
          : '0 0 0px transparent',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 2,
        pointerEvents: 'none'
      }} />

      {/* Shimmer Animation - Solo cuando está ON */}
      {checked && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            animation: 'shimmer 1.5s ease-in-out',
            zIndex: 3,
            pointerEvents: 'none',
            borderRadius: '12px'
          }}
        />
      )}

      {/* Contenido Interactivo */}
      <button
        onClick={() => handleToggle(!checked)}
        style={{
          position: 'relative',
          zIndex: 4,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px 20px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          if (!checked) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Status Dot - Brilla en azul */}
        <div style={{
          position: 'relative',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: checked ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)',
          boxShadow: checked 
            ? '0 0 12px var(--accent-primary), inset 0 0 8px var(--accent-primary)'
            : 'none',
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          flexShrink: 0
        }} />

        {/* Label */}
        <span style={{
          fontSize: '0.9rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          flex: 1,
          textAlign: 'left',
          transition: 'all 0.3s ease'
        }}>
          {label}
        </span>

        {/* Icon Swap - X Roja / Check Azul con PopIn */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          position: 'relative',
          flexShrink: 0
        }}>
          {checked ? (
            <Check
              size={20}
              color="var(--accent-primary)"
              style={{
                animation: 'iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                filter: 'drop-shadow(0 0 8px rgba(0, 243, 255, 0.5))'
              }}
            />
          ) : (
            <X
              size={20}
              color="rgba(255,255,255,0.3)"
              style={{
                animation: 'iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transition: 'all 0.3s ease'
              }}
            />
          )}
        </div>
      </button>
    </div>
  );
};

const LANGUAGES = [
  { id: 'es', label: 'Español', flag: '🇪🇸' },
  { id: 'en', label: 'English', flag: '🇺🇸' },
  { id: 'pt', label: 'Português', flag: '🇧🇷' },
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { id: 'it', label: 'Italiano', flag: '🇮🇹' },
  { id: 'jp', label: '日本語', flag: '🇯🇵' },
  { id: 'ru', label: 'Русский', flag: '🇷🇺' },
  { id: 'kr', label: '한국어', flag: '🇰🇷' }
];

const SectionTitle = ({ icon, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
    <div style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>
      {React.cloneElement(icon, { size: 18 })}
    </div>
    <h3 style={{ margin: 0, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--text-primary)' }}>{label}</h3>
  </div>
);

const AccordionSection = ({ title, icon, children, isOpen, onToggle, subtitle }) => (
  <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-glass-top)' }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px',
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        color: 'var(--text-primary)', transition: 'background 0.3s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,243,255,0.02)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>{icon}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{title}</span>
        {subtitle && (
          <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 900, textTransform: 'uppercase' }}>
            {subtitle}
          </span>
        )}
      </div>
      <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
    </button>
    {isOpen && (
      <div className="animate-fade-in" style={{ padding: '0 24px 20px' }}>
        <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {children}
        </div>
      </div>
    )}
  </div>
);

const Profile = () => {
  const { settings, updateSettings, t } = useSettings();
  const { user } = useAuth();
  const wallpaperInputRef = useRef(null);
  const profileInputRef = useRef(null);

  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [openSetting, setOpenSetting] = useState(null); // 'lang', 'font', 'fontSize'
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [showToast, setShowToast] = useState(false);

  // States para Edición de Nombre
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(settings.name);

  // States para MFA
  const [mfaData, setMfaData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isMfaActive, setIsMfaActive] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');

  // States para Desactivar MFA
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [disableVerifyCode, setDisableVerifyCode] = useState('');
  const [disableMfaLoading, setDisableMfaLoading] = useState(false);
  const [disableMfaError, setDisableMfaError] = useState('');

  // Estados para Notificaciones
  const [emailNotif, setEmailNotif] = useState(settings.emailNotifications || false);
  const [webNotif, setWebNotif] = useState(settings.webNotifications || false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  const downloadAvatar = useCallback(async (path) => {
    try {
      setIsLoadingAvatar(true);
      const { data, error } = await supabase.storage.from('avatars').download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
    } catch (error) {
      console.error('Error downloading avatar:', error.message);
    } finally {
      setIsLoadingAvatar(false);
    }
  }, []);

  useEffect(() => {
    if (user?.user_metadata?.avatar_path) {
      downloadAvatar(user.user_metadata.avatar_path);
    }
    checkMfaStatus();

    // Cleanup effect - avoid message channel closed errors
    return () => {
      // Add cleanup handlers for any listeners if needed
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    setTempName(settings.name);
  }, [settings.name]);

  // Apply theme to document element for CSS variable updates
  // Sync theme to DOM and persist to localStorage
  useEffect(() => {
    if (settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
      localStorage.setItem('campusflow_theme', settings.theme);
    }
  }, [settings.theme]);

  const checkMfaStatus = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    if (data?.all?.some(f => f.status === 'verified')) {
      setIsMfaActive(true);
    }
  }, []);

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      await supabase.auth.updateUser({ data: { avatar_path: fileName } });
      await updateSettings({ avatarUrl: fileName });
      downloadAvatar(fileName);
    } catch (error) {
      alert('Error subiendo imagen: ' + error.message);
    }
  };

  const handleNameSave = () => {
    if (tempName.trim() && tempName !== settings.name) {
      updateSettings({ name: tempName.trim() });
    }
    setIsEditingName(false);
  };

  const handleEnrollMfa = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setMfaData(data);
    } catch (err) {
      setMfaError(err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    setMfaLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaData.id });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaData.id,
        challengeId: challengeData.id,
        code: verifyCode
      });
      if (verifyError) throw verifyError;
      setIsMfaActive(true);
      setMfaData(null);
    } catch (err) {
      setMfaError(err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setDisableMfaLoading(true);
    setDisableMfaError('');
    try {
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factorsData.all.find(f => f.status === 'verified' && f.factorType === 'totp');
      if (!totpFactor) throw new Error("No se encontró 2FA activo.");

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: disableVerifyCode
      });
      if (verifyError) throw verifyError;

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
      if (unenrollError) throw unenrollError;

      setIsMfaActive(false);
      setIsDisablingMfa(false);
      setDisableVerifyCode('');
    } catch (err) {
      setDisableMfaError(err.message);
    } finally {
      setDisableMfaLoading(false);
    }
  };

  const handleWallpaperUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        // Delegamos la persistencia al contexto global que ya maneja Supabase
        await updateSettings({ wallpaper: 'custom', customWallpaper: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const avatarSource = settings.avatarUrl || null;

  // Calcular fallback avatar con nombre del usuario
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${settings.name || 'User'}&background=00f3ff&color=fff&font-size=0.4&bold=true`;

  // Función auxiliar para mostrar toast
  const showNotification = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Actualizar handlers de notificaciones
  const handleEmailNotifChange = (newValue) => {
    setEmailNotif(newValue);
    updateSettings({ emailNotifications: newValue });
    showNotification(newValue ? '📧 Notificaciones por email activadas' : '📧 Notificaciones por email desactivadas');
  };

  const handleWebNotifChange = (newValue) => {
    setWebNotif(newValue);
    updateSettings({ webNotifications: newValue });
    showNotification(newValue ? '🔔 Notificaciones web activadas' : '🔔 Notificaciones web desactivadas');
  };

  return (
    <>
      <style>{`
        .glassmorphism-enhanced {
          background: var(--bg-glass);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid var(--border-glass-top);
          border-top: 1px solid rgba(255,255,255,0.15);
          border-right: 1px solid var(--border-glass-side);
          border-left: 1px solid var(--border-glass-side);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-glass), inset 0 0 20px rgba(255,255,255,0.05);
          transition: all var(--transition-med);
        }

        @keyframes arrowLevitate {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes arrowPulse {
          0%, 100% {
            opacity: 1;
            filter: drop-shadow(0 0 0px rgba(0, 243, 255, 0.4));
          }
          50% {
            opacity: 0.85;
            filter: drop-shadow(0 0 10px rgba(0, 243, 255, 0.8));
          }
        }

        .arrow-button-hover svg {
          animation: arrowLevitate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) infinite,
                    arrowPulse 2s ease-in-out infinite;
        }

        @keyframes cyberSpring {
          0% {
            opacity: 0;
            transform: translate(-50%, calc(-50% + 40px));
          }
          50% {
            opacity: 1;
            transform: translate(-50%, calc(-50% - 15px));
          }
          70% {
            transform: translate(-50%, calc(-50% + 5px));
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        @keyframes neonGlow {
          0% {
            box-shadow: inset 0 0 20px rgba(0, 243, 255, 0.5), 0 0 30px rgba(0, 243, 255, 0.8), 0 0 60px rgba(0, 243, 255, 0.6);
            border-color: rgba(0, 243, 255, 1);
          }
          50% {
            box-shadow: inset 0 0 40px rgba(0, 243, 255, 0.8), 0 0 50px rgba(0, 243, 255, 1), 0 0 80px rgba(0, 243, 255, 0.8);
            border-color: rgba(0, 243, 255, 0.8);
          }
          100% {
            box-shadow: inset 0 0 20px rgba(0, 243, 255, 0.5), 0 0 30px rgba(0, 243, 255, 0.8), 0 0 60px rgba(0, 243, 255, 0.6);
            border-color: rgba(0, 243, 255, 1);
          }
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes softPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(0.98);
          }
        }

        @keyframes pageThemeFade {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        .cyber-toast {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          animation: cyberSpring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          padding: 24px 32px;
          backdrop-filter: blur(20px);
          background: linear-gradient(135deg, rgba(0, 243, 255, 0.15) 0%, rgba(188, 19, 254, 0.05) 100%);
          border: 2px solid rgba(0, 243, 255, 1);
          border-radius: 16px;
          color: #00f3ff;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-size: 0.95rem;
          box-shadow: inset 0 0 20px rgba(0, 243, 255, 0.5), 0 0 30px rgba(0, 243, 255, 0.8), 0 0 60px rgba(0, 243, 255, 0.6);
          animation: cyberSpring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .cyber-toast-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(2px);
          z-index: 9998;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .title-gradient {
          background: linear-gradient(90deg, #00f3ff 0%, #bc13fe 50%, #00f3ff 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s ease-in-out infinite;
        }

        .menu-position-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 100%;
          height: 100%;
        }

        .menu-position-visual::before,
        .menu-position-visual::after {
          content: '';
          transition: all 0.3s ease;
        }

        .position-left-visual::before {
          width: 6px;
          height: 20px;
          background: currentColor;
          border-radius: 2px;
          margin-right: auto;
          margin-left: 8px;
        }

        .position-right-visual::before {
          width: 6px;
          height: 20px;
          background: currentColor;
          border-radius: 2px;
          margin-left: auto;
          margin-right: 8px;
        }

        .position-top-visual::before {
          width: 20px;
          height: 6px;
          background: currentColor;
          border-radius: 2px;
          margin-bottom: auto;
        }

        .position-bottom-visual::before {
          width: 20px;
          height: 6px;
          background: currentColor;
          border-radius: 2px;
          margin-top: auto;
        }

        button[style*="position"] {
          transition: all 0.3s ease;
        }

        .active-menu-visual {
          color: #00f3ff;
          text-shadow: 0 0 15px rgba(0, 243, 255, 0.8);
        }

        /* ANIMACIONES MEJORADAS */
        .dropdown-smooth {
          transition: max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }

        .theme-fade {
          animation: pageThemeFade 0.6s ease-in-out;
        }

        .mfa-disable-pulse {
          animation: softPulse 2s ease-in-out infinite;
        }

        .header-compact {
          display: flex;
          align-items: center;
          gap: 24px;
          justify-content: space-between;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 24px;
          flex: 0 1 auto;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 0 1 auto;
        }

        @media (max-width: 768px) {
          .header-compact {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .header-right {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>

      {showToast && <div className="cyber-toast-backdrop" onClick={() => setShowToast(false)} />}
      {showToast && <div className="cyber-toast">{toastMessage}</div>}

      <div className="animate-fade-in" style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <header className="page-header" style={{ marginBottom: '40px' }}>
          <h1 className="page-title title-gradient" style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase' }}>AJUSTES</h1>
        </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

        {/* HEADER REDISEÑADO: Dos Paneles Independientes */}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Panel 1 (Izquierda): Avatar + Nombre + Rango */}
          <div className="glass-panel" style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '24px', border: '1px solid var(--border-glass-top)' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: '100px', height: '100px', borderRadius: '50%',
                overflow: 'hidden', border: '4px solid var(--accent-primary)',
                background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                      boxShadow: 'inset 0 0 30px var(--accent-primary)33',
                      zIndex: 2,
                      transition: 'opacity 0.5s ease-in-out',
                      opacity: !avatarLoaded ? 1 : 0
                    }}
                  />
                )}

                <img
                  key={avatarSource || fallbackAvatarUrl}
                  src={avatarSource || fallbackAvatarUrl}
                  alt="User Avatar"
                  fetchPriority="high"
                  loading="eager"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: avatarLoaded ? 1 : 0,
                    transition: 'opacity 0.4s ease-in-out'
                  }}
                  onLoad={() => setAvatarLoaded(true)}
                  onError={(e) => {
                    e.target.src = fallbackAvatarUrl;
                    setAvatarLoaded(true);
                  }}
                />
              </div>
              <button onClick={() => profileInputRef.current.click()} style={{ position: 'absolute', bottom: '0px', right: '0px', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, transition: 'transform 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <Camera size={16} />
              </button>
              <input type="file" ref={profileInputRef} hidden accept="image/*" onChange={handleProfileImageUpload} />
            </div>
            
            {/* Nombre e Info */}
            <div style={{ minWidth: '0', flex: 1 }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '8px 16px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: 'fit-content',
                marginBottom: '6px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.5), inset 0 0 15px rgba(0, 243, 255, 0.3)',
                transformStyle: 'preserve-3d'
              }}>
                {isEditingName ? (
                  <input
                    autoFocus
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '1.6rem',
                      fontWeight: 950,
                      textTransform: 'uppercase',
                      outline: 'none',
                      maxWidth: '250px'
                    }}
                  />
                ) : (
                  <h2 className="font-display" style={{ fontSize: '1.6rem', margin: 0, fontWeight: 950, textTransform: 'uppercase', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {settings.name || 'Mateo'}
                  </h2>
                )}
                <button
                  onClick={() => setIsEditingName(true)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', opacity: 0.6, transition: 'all 0.3s ease', padding: '4px' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Pencil size={16} />
                </button>
              </div>
              <p style={{
                color: 'var(--text-secondary)',
                opacity: 0.7,
                letterSpacing: '2px',
                fontSize: '10px',
                fontWeight: 600,
                margin: 0,
                textTransform: 'uppercase'
              }}>Estudiante de CampusFlow</p>
            </div>
          </div>

          {/* Panel 2 (Derecha): Sistema de Notificaciones PRO - Glassmorphism */}
          <div className="glass-panel" style={{ 
            padding: '32px', 
            border: '1px solid var(--border-glass-top)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.03) 0%, rgba(255, 255, 255, 0.02) 100%)'
          }}>
            {/* Header con Animación Bell Ring */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ 
                color: 'var(--accent-primary)', 
                display: 'flex', 
                alignItems: 'center',
                animation: emailNotif || webNotif ? 'bellRing 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
              }}>
                <Bell size={20} />
              </div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '0.9rem', 
                textTransform: 'uppercase', 
                letterSpacing: '0.12em', 
                fontWeight: 900, 
                color: 'var(--text-primary)',
                textShadow: '0 0 15px rgba(0, 243, 255, 0.2)'
              }}>
                NOTIFICACIONES
              </h3>
            </div>

            {/* Rows de Notificación */}
            <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px', margin: '0 auto' }}>
              <NotificationRow 
                checked={emailNotif}
                onChange={handleEmailNotifChange}
                label="Correo Electrónico"
                icon={Bell}
              />
              <NotificationRow 
                checked={webNotif}
                onChange={handleWebNotifChange}
                label="Notificaciones Web"
                icon={Bell}
              />
            </div>
          </div>

        </div>

        {/* RESTAURACIÓN: Tema Visual */}
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-glass-top)' }}>
          <SectionTitle icon={<Palette />} label={t.themeMode} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {THEMES.map(theme => (
              <button key={theme.id} onClick={() => {
                document.body.classList.add('theme-fade');
                document.documentElement.setAttribute('data-theme', theme.id);
                localStorage.setItem('campusflow_theme', theme.id);
                setTimeout(() => {
                  updateSettings({ theme: theme.id });
                  document.body.classList.remove('theme-fade');
                }, 300);
              }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', border: `2px solid ${settings.theme === theme.id ? 'var(--accent-primary)' : 'var(--border-glass-side)'}`, background: settings.theme === theme.id ? 'var(--bg-glass-hover)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: settings.theme === theme.id ? '0 0 20px var(--accent-primary)66, inset 0 0 10px var(--accent-primary)33' : 'none' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-glass)'} onMouseLeave={(e) => e.currentTarget.style.background = settings.theme === theme.id ? 'var(--bg-glass-hover)' : 'transparent'}>
                <span style={{ fontSize: '1.2rem' }}>{theme.icon}</span>
                <span style={{ fontWeight: 700 }}>{t[theme.labelKey]}</span>
                {settings.theme === theme.id && <Check size={16} color="var(--accent-primary)" style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
        </div>

        {/* RESTAURACIÓN: Fondos de Pantalla */}
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-glass-top)' }}>
          <SectionTitle icon={<ImageIcon />} label={t.wallpapers} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {WALLPAPERS.map(wp => (
              <button key={wp.id} onClick={() => updateSettings({ wallpaper: wp.id })} style={{ height: '70px', borderRadius: '12px', border: `2px solid ${settings.wallpaper === wp.id ? 'var(--accent-primary)' : 'transparent'}`, backgroundImage: `url(${wp.src})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer', position: 'relative', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                {settings.wallpaper === wp.id && <div style={{ position: 'absolute', top: 4, right: 4, background: 'var(--accent-primary)', borderRadius: '50%', padding: '2px' }}><Check size={10} color="#000" /></div>}
              </button>
            ))}
            <button
              onClick={() => wallpaperInputRef.current.click()}
              style={{
                height: '70px',
                borderRadius: '12px',
                border: settings.customWallpaper ? 'none' : '2px dashed var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                background: settings.customWallpaper ? `url(${settings.customWallpaper})` : 'var(--bg-panel, rgba(0,0,0,0.05))',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => !settings.customWallpaper && (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {settings.customWallpaper && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1 }} />}
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Camera size={20} />
                <span style={{ fontSize: '0.7rem', marginTop: '4px', fontWeight: 'bold' }}>SUBIR FOTO</span>
              </div>
            </button>
            <input type="file" ref={wallpaperInputRef} hidden accept="image/*" onChange={handleWallpaperUpload} />
          </div>
        </div>

        {/* PREMIUM MINI-SCREENS SELECTOR: Posición del Menú */}
        <div className="glass-panel" style={{ padding: '32px', border: '1px solid var(--border-glass-top)', width: '100%', height: 'fit-content' }}>
          {/* Title Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <div style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>
              <LayoutIcon size={20} />
            </div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '0.95rem', 
              textTransform: 'uppercase', 
              letterSpacing: '0.12em', 
              fontWeight: 900, 
              color: 'var(--text-primary)',
              textShadow: '0 0 20px rgba(0, 243, 255, 0.2)'
            }}>
              {t.layoutPos}
            </h3>
          </div>

          {/* Mini-Screens Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '20px',
            width: '100%'
          }}>
            {[
              { 
                id: 'left', 
                label: t.left,
                preview: (isActive) => (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    width: '100%',
                    height: '100%'
                  }}>
                    {/* Sidebar indicator (left) */}
                    <div style={{
                      width: '18%',
                      height: '85%',
                      background: isActive ? 'var(--accent-primary)' : 'var(--border-glass-top)',
                      borderRadius: '4px',
                      opacity: isActive ? 0.95 : 0.6,
                      transition: 'all 0.3s ease'
                    }} />
                    {/* Content lines */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      paddingRight: '4px',
                      height: '85%',
                      justifyContent: 'space-around'
                    }}>
                      <div style={{ height: '4px', background: 'var(--border-glass-top)', borderRadius: '2px', opacity: 0.5 }} />
                      <div style={{ height: '4px', background: 'var(--border-glass-top)', borderRadius: '2px', opacity: 0.4 }} />
                      <div style={{ height: '4px', background: 'var(--border-glass-top)', borderRadius: '2px', opacity: 0.5 }} />
                    </div>
                  </div>
                )
              },
              { 
                id: 'right', 
                label: t.right,
                preview: (isActive) => (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    width: '100%',
                    height: '100%'
                  }}>
                    {/* Content lines */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      paddingLeft: '4px',
                      height: '85%',
                      justifyContent: 'space-around'
                    }}>
                      <div style={{ height: '4px', background: 'var(--border-glass-top)', borderRadius: '2px', opacity: 0.5 }} />
                      <div style={{ height: '4px', background: 'var(--border-glass-top)', borderRadius: '2px', opacity: 0.4 }} />
                      <div style={{ height: '4px', background: 'var(--border-glass-top)', borderRadius: '2px', opacity: 0.5 }} />
                    </div>
                    {/* Sidebar indicator (right) */}
                    <div style={{
                      width: '18%',
                      height: '85%',
                      background: isActive ? 'var(--accent-primary)' : 'var(--border-glass-top)',
                      borderRadius: '4px',
                      opacity: isActive ? 0.95 : 0.6,
                      transition: 'all 0.3s ease'
                    }} />
                  </div>
                )
              },
              { 
                id: 'top', 
                label: t.top,
                preview: (isActive) => (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    width: '100%',
                    height: '100%'
                  }}>
                    {/* Header indicator (top) */}
                    <div style={{
                      width: '85%',
                      height: '16%',
                      background: isActive ? 'var(--accent-primary)' : 'var(--border-glass-top)',
                      borderRadius: '4px',
                      opacity: isActive ? 0.95 : 0.6,
                      transition: 'all 0.3s ease'
                    }} />
                    {/* Content lines */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      paddingTop: '3px',
                      width: '85%',
                      justifyContent: 'center'
                    }}>
                      <div style={{ height: '3px', background: 'var(--border-glass-top)', borderRadius: '2px', opacity: 0.5 }} />
                      <div style={{ height: '3px', background: 'var(--border-glass-top)', borderRadius: '2px', opacity: 0.4 }} />
                    </div>
                  </div>
                )
              },
              { 
                id: 'bottom', 
                label: t.bottom,
                preview: (isActive) => (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    width: '100%',
                    height: '100%'
                  }}>
                    {/* Content lines */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      paddingBottom: '3px',
                      width: '85%',
                      justifyContent: 'center'
                    }}>
                      <div style={{ height: '3px', background: 'var(--border-glass-top)', borderRadius: '2px', opacity: 0.5 }} />
                      <div style={{ height: '3px', background: 'var(--border-glass-top)', borderRadius: '2px', opacity: 0.4 }} />
                    </div>
                    {/* Footer indicator (bottom) */}
                    <div style={{
                      width: '85%',
                      height: '16%',
                      background: isActive ? 'var(--accent-primary)' : 'var(--border-glass-top)',
                      borderRadius: '4px',
                      opacity: isActive ? 0.95 : 0.6,
                      transition: 'all 0.3s ease'
                    }} />
                  </div>
                )
              }
            ].map(position => {
              const isActive = settings.sidebarPosition === position.id;
              return (
                <button
                  key={position.id}
                  onClick={() => updateSettings({ sidebarPosition: position.id })}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0',
                    border: `2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-glass-top)'}`,
                    background: isActive ? 'rgba(0, 243, 255, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: isActive 
                      ? '0 0 30px var(--accent-primary), inset 0 0 20px rgba(0, 243, 255, 0.15), 0 8px 32px rgba(0, 0, 0, 0.3)' 
                      : '0 4px 16px rgba(0, 0, 0, 0.2)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    transform: isActive ? 'scale(1)' : 'scale(0.98)',
                    opacity: 1,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(0, 243, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 0 20px var(--accent-primary), 0 8px 32px rgba(0, 0, 0, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--border-glass-top)';
                      e.currentTarget.style.transform = 'scale(0.98)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                    }
                  }}
                >
                  {/* Mini-Screen Container */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '3/4',
                    background: 'var(--bg-glass)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid var(--border-glass-top)',
                    borderRadius: '12px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {position.preview(isActive)}
                  </div>

                  {/* Label */}
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    textShadow: isActive ? '0 0 10px rgba(0, 243, 255, 0.3)' : 'none',
                    transition: 'all 0.3s ease',
                    paddingBottom: '8px'
                  }}>
                    {position.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ajustes Compactos: Idioma, Tipografía y Tamaño */}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

          {/* Selector de Idioma */}
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-glass-top)', transition: 'all 0.3s ease' }}>
            <button
              onClick={() => setOpenSetting(openSetting === 'lang' ? null : 'lang')}
              style={{
                width: '100%', height: '60px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,243,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Languages size={18} color="var(--accent-primary)" />
                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem' }}>{t.language}: <span style={{ color: 'var(--accent-primary)' }}>{LANGUAGES.find(l => l.id === settings.language)?.label}</span></span>
              </div>
              <ChevronDown size={18} style={{ transform: openSetting === 'lang' ? 'rotate(180deg)' : 'none', transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
            </button>
            <div className="dropdown-smooth" style={{ maxHeight: openSetting === 'lang' ? '400px' : '0', overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div style={{ padding: '10px 12px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => { updateSettings({ language: lang.id }); setOpenSetting(null); }}
                    style={{
                      padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: settings.language === lang.id ? 'rgba(0,243,255,0.15)' : 'rgba(255,255,255,0.03)',
                      color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,243,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = settings.language === lang.id ? 'rgba(0,243,255,0.15)' : 'rgba(255,255,255,0.03)'}
                  >
                    <span style={{ fontWeight: settings.language === lang.id ? 800 : 500 }}>{lang.flag} {lang.label}</span>
                    {settings.language === lang.id && <Check size={14} color="var(--accent-primary)" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selector de Tipografía */}
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-glass-top)', transition: 'all 0.3s ease' }}>
            <button
              onClick={() => setOpenSetting(openSetting === 'font' ? null : 'font')}
              style={{
                width: '100%', height: '60px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,243,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Type size={18} color="var(--accent-primary)" />
                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem' }}>{t.typography}: <span style={{ color: 'var(--accent-primary)' }}>{FONT_OPTIONS.find(f => f.id === settings.font)?.label}</span></span>
              </div>
              <ChevronDown size={18} style={{ transform: openSetting === 'font' ? 'rotate(180deg)' : 'none', transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
            </button>
            <div className="dropdown-smooth" style={{ maxHeight: openSetting === 'font' ? '400px' : '0', overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div style={{ padding: '10px 12px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {FONT_OPTIONS.map(font => (
                  <button
                    key={font.id}
                    onClick={() => { updateSettings({ font: font.id }); setOpenSetting(null); }}
                    style={{
                      padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: settings.font === font.id ? 'rgba(0,243,255,0.15)' : 'rgba(255,255,255,0.03)',
                      color: 'var(--text-primary)', fontFamily: font.css, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,243,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = settings.font === font.id ? 'rgba(0,243,255,0.15)' : 'rgba(255,255,255,0.03)'}
                  >
                    <span style={{ fontWeight: settings.font === font.id ? 800 : 500 }}>{font.label}</span>
                    {settings.font === font.id && <Check size={14} color="var(--accent-primary)" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selector de Tamaño de Fuente */}
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-glass-top)', transition: 'all 0.3s ease' }}>
            <button
              onClick={() => setOpenSetting(openSetting === 'fontSize' ? null : 'fontSize')}
              style={{
                width: '100%', height: '60px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,243,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Type size={18} color="var(--accent-primary)" />
                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem' }}>{t.fontSize}: <span style={{ color: 'var(--accent-primary)' }}>{settings.fontSize}px</span></span>
              </div>
              <ChevronDown size={18} style={{ transform: openSetting === 'fontSize' ? 'rotate(180deg)' : 'none', transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
            </button>
            <div className="dropdown-smooth" style={{ maxHeight: openSetting === 'fontSize' ? '400px' : '0', overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div style={{ padding: '10px 12px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[12, 14, 16, 18, 20, 24, 28, 32].map(size => (
                  <button
                    key={size}
                    onClick={() => { updateSettings({ fontSize: size }); setOpenSetting(null); }}
                    style={{
                      padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: settings.fontSize === size ? 'rgba(0,243,255,0.15)' : 'rgba(255,255,255,0.03)',
                      color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,243,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = settings.fontSize === size ? 'rgba(0,243,255,0.15)' : 'rgba(255,255,255,0.03)'}
                  >
                    <span style={{ fontWeight: settings.fontSize === size ? 800 : 500 }}>{size}px</span>
                    {settings.fontSize === size && <Check size={14} color="var(--accent-primary)" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Seguridad */}
        <div style={{ gridColumn: '1 / -1' }}>
          <AccordionSection title="Seguridad" icon={<Shield size={20} />} isOpen={openSection === 'security'} onToggle={() => setOpenSection(openSection === 'security' ? null : 'security')} subtitle={isMfaActive ? "ACTIVA" : "DESACTIVADA"}>
            <div style={{ padding: '10px 0' }}>
              {/* Autenticación MFA */}
              {isMfaActive ? (
                isDisablingMfa ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Ingresa tu código actual para confirmar:</p>
                    <input type="text" value={disableVerifyCode} onChange={e => setDisableVerifyCode(e.target.value)} placeholder="000000" style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-glass-top)', color: 'var(--text-primary)', borderRadius: '8px', transition: 'all 0.3s ease' }} onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={(e) => e.target.style.borderColor = 'var(--border-glass-top)'} />
                    {disableMfaError && <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>{disableMfaError}</p>}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => { setIsDisablingMfa(false); setDisableVerifyCode(''); setDisableMfaError(''); }} style={{ padding: '10px 16px', background: 'var(--bg-panel)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 800, transition: 'all 0.3s ease' }}>Cancelar</button>
                      <button onClick={handleDisableMfa} disabled={disableMfaLoading} style={{ padding: '10px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 800, transition: 'all 0.3s ease' }}>
                        {disableMfaLoading ? 'Verificando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-glass-top)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-lime)', boxShadow: '0 0 10px var(--accent-lime)' }}></div>
                      <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>CÓDIGO DE APP (GOOGLE AUTHENTICATOR)</p>
                    </div>
                    <button onClick={() => setIsDisablingMfa(true)} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}>
                      <X size={14} />
                      <span>DESACTIVAR</span>
                    </button>
                  </div>
                )
              ) : (
                <>
                  {!mfaData ? (
                    <button onClick={handleEnrollMfa} disabled={mfaLoading} style={{ padding: '12px 24px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#00d4ff'; e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                      {mfaLoading ? 'PROCESANDO...' : 'ACTIVAR 2FA'}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '300px' }}>
                      <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', width: 'fit-content' }}>
                        <img src={mfaData.totp.qr_code} alt="QR Code" style={{ width: '150px', height: '150px' }} />
                      </div>
                      <input type="text" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="Código 6 dígitos" style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-glass-top)', color: 'var(--text-primary)', borderRadius: '8px', transition: 'all 0.3s ease' }} onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={(e) => e.target.style.borderColor = 'var(--border-glass-top)'} />
                      {mfaError && <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold' }}>{mfaError}</p>}
                      <button onClick={handleVerifyMfa} disabled={mfaLoading} style={{ padding: '12px', background: 'var(--accent-lime)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                        {mfaLoading ? 'VERIFICANDO...' : 'VERIFICAR Y ACTIVAR'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </AccordionSection>
        </div>

      </div>
      </div>
    </>
  );
};

export default Profile;

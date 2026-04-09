import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings, FONT_OPTIONS } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
  User, Palette, Check, ImageIcon, Camera, Languages, Type, Shield,
  Layout as LayoutIcon, ChevronDown, RefreshCcw, Loader2, Pencil, Bell, X, Copy, AlertCircle, Smartphone, Lock, ScanLine
} from 'lucide-react';

const THEMES = [
  { id: 'dark', labelKey: 'darkMode', icon: '🌙', gradient: 'linear-gradient(135deg, #0f172a, #1e293b)' },
  { id: 'light', labelKey: 'lightMode', icon: '☀️', gradient: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' },
  { id: 'daltonic', labelKey: 'daltonicMode', icon: '👁️', gradient: 'linear-gradient(135deg, #0c4a6e, #075985)' },
];

const FONT_SIZES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24];

const WALLPAPERS = [
  { id: 'cyber', label: 'Frosted Glass', src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000' },
  { id: 'nature', label: 'Forest Glass', src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000' },
  { id: 'synth', label: 'Synthwave', src: 'https://images.unsplash.com/photo-1774848372214-3563247a592b?q=80&w=1935&auto=format&fit=crop' },
  { id: 'space', label: 'Deep Cyber', src: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop' },
];

const NotificationRow = ({ checked, onChange, label, icon: IconComponent }) => {
  const [hasAnimated, setHasAnimated] = React.useState(false);

  const handleToggle = (newValue) => {
    onChange(newValue);
    if (newValue && !hasAnimated) {
      setHasAnimated(false);
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

const BottomRowMenu = ({ icon, label, value, isOpen, onToggle, children }) => (
  <div className="glass-panel" style={{
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass-top)',
    boxShadow: isOpen ? '0 0 20px rgba(0,243,255,0.1)' : 'none',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    overflow: 'hidden',
    position: 'relative'
  }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        background: isOpen ? 'rgba(0,243,255,0.03)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
      }}
      onMouseLeave={(e) => {
        if (!isOpen) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
        {icon}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </span>
      </div>
      <ChevronDown size={18} style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', paddingTop: '16px' }}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const Profile = () => {
  const { settings, updateSettings, t } = useSettings();
  const { user } = useAuth();
  const wallpaperInputRef = useRef(null);
  const profileInputRef = useRef(null);

  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [openSetting, setOpenSetting] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [showToast, setShowToast] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(settings.name);

  // MFA States
  const [mfaData, setMfaData] = useState(null);
  const [qrCodeSvg, setQrCodeSvg] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccessMessage, setMfaSuccessMessage] = useState('');

  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [disableVerifyCode, setDisableVerifyCode] = useState('');
  const [disableMfaLoading, setDisableMfaLoading] = useState(false);
  const [disableMfaError, setDisableMfaError] = useState('');

  const [emailNotif, setEmailNotif] = useState(settings.emailNotifications || false);
  const [webNotif, setWebNotif] = useState(settings.webNotifications || false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const [manualSecret, setManualSecret] = useState('');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    setTempName(settings.name);
  }, [settings.name]);

  useEffect(() => {
    if (settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
      localStorage.setItem('campusflow_theme', settings.theme);
    }
  }, [settings.theme]);

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

  // ==================== MFA LOGIC ====================

  const handleEnrollMfa = async () => {
    setMfaLoading(true);
    setMfaError('');
    try {
      // REFRESH: Renovar sesión para actualizar permisos
      await supabase.auth.refreshSession();

      // Verify email is confirmed before enrolling
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email_confirmed_at) {
        setMfaError('❌ Debes verificar tu email antes de activar 2FA. Revisa tu bandeja de entrada.');
        setMfaLoading(false);
        return;
      }

      // Direct enroll - no cleanup of existing factors
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'CampusFlow MFA'
      });

      if (error) {
        console.error('Error detallado al enrolar MFA:', {
          message: error.message,
          status: error.status,
          code: error.code,
          fullError: JSON.stringify(error)
        });
        setMfaError(`❌ ${error.message || 'Error al generar QR'}`);
        setMfaLoading(false);
        return;
      }

      // Store QR code and data
      if (data?.totp) {
        setMfaData(data);
        // Store SVG QR code
        if (data.totp.qr_code) {
          setQrCodeSvg(data.totp.qr_code);
        }
        // Store secret for manual entry
        if (data.totp.secret) {
          setManualSecret(data.totp.secret);
        }
        console.log('QR generado exitosamente');
      } else {
        setMfaError('❌ No se pudo obtener los datos de autenticación. Intenta de nuevo.');
        setMfaLoading(false);
        return;
      }
    } catch (err) {
      console.error('Error en handleEnrollMfa:', {
        message: err.message,
        stack: err.stack,
        error: err
      });
      setMfaError(`❌ Error inesperado: ${err.message || 'Error al generar QR'}`);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setMfaError('Por favor ingresa un código de 6 dígitos');
      return;
    }

    setMfaLoading(true);
    setMfaError('');
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaData.id });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaData.id,
        challengeId: challengeData.id,
        code: verifyCode
      });
      if (verifyError) throw verifyError;

      // Sync to database
      await updateSettings({ two_factor_enabled: true });
      if (user) {
        await supabase.from('profiles').update({ two_factor_enabled: true }).eq('id', user.id);
      }

      setMfaSuccessMessage('✅ 2FA activado exitosamente');
      setTimeout(() => {
        setMfaData(null);
        setQrCodeSvg(null);
        setVerifyCode('');
        setManualSecret('');
        setMfaSuccessMessage('');
      }, 2000);
    } catch (err) {
      setMfaError(err.message || 'Código incorrecto');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!disableVerifyCode || disableVerifyCode.length !== 6) {
      setDisableMfaError('Por favor ingresa un código de 6 dígitos');
      return;
    }

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

      // Sync to database
      await updateSettings({ two_factor_enabled: false });
      if (user) {
        await supabase.from('profiles').update({ two_factor_enabled: false }).eq('id', user.id);
      }

      setIsDisablingMfa(false);
      setDisableVerifyCode('');
    } catch (err) {
      setDisableMfaError(err.message || 'Error desactivando 2FA');
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
        await updateSettings({ wallpaper: 'custom', customWallpaper: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const avatarSource = settings.avatarUrl || null;
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${settings.name || 'User'}&background=00f3ff&color=fff&font-size=0.4&bold=true`;

  const showNotification = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification('✅ Copiado al portapapeles');
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

        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        @keyframes shieldPulse {
          0%, 100% {
            box-shadow: 0 0 20px var(--accent-primary), inset 0 0 10px rgba(0, 243, 255, 0.3);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 40px var(--accent-primary), inset 0 0 20px rgba(0, 243, 255, 0.5);
            transform: scale(1.02);
          }
        }

        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes iconPop {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          60% {
            transform: scale(1.15);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .cyber-toast {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
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

        .mfa-qr-container {
          background: #fff;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .mfa-input {
          letter-spacing: 8px;
          font-size: 1.8rem;
          font-weight: 900;
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
        }

        .shield-icon-pulse {
          animation: shieldPulse 2s ease-in-out infinite;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: 900;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          backdrop-filter: blur(10px);
        }

        .status-pill-active {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.2);
        }

        .status-pill-inactive {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
        }

        .dropdown-smooth {
          transition: max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }

        .theme-fade {
          animation: pageThemeFade 0.6s ease-in-out;
        }

        @keyframes pageThemeFade {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes shieldBreath {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>

      {showToast && <div className="cyber-toast-backdrop" onClick={() => setShowToast(false)} />}
      {showToast && <div className="cyber-toast">{toastMessage}</div>}

      <div className="animate-fade-in" style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <header className="page-header" style={{ marginBottom: '40px' }}>
          <h1 className="page-title title-gradient" style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase' }}>AJUSTES</h1>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

          {/* HEADER PROFILE + NOTIFICATIONS */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* PANEL 1: Avatar + Name */}
            <div className="glass-panel" style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '24px', border: '1px solid var(--border-glass-top)' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '100px', height: '100px', borderRadius: '50%',
                  overflow: 'hidden', border: '4px solid var(--accent-primary)',
                  background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative'
                }}>
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

            {/* PANEL 2: Notifications */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center'
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

          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            {/* THEME SELECTOR */}
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

            {/* WALLPAPERS */}
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

            <motion.div
              layout
              onClick={() => !mfaData && setOpenSection(openSection === 'security' ? null : 'security')}
              className="glass-panel"
              style={{
                padding: '24px',
                border: '1px solid var(--border-glass-top)',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                minHeight: '235px',
                justifyContent: openSection === 'security' ? 'flex-start' : 'space-between',
                overflow: 'hidden',
                position: 'relative'
              }}
              transition={{ layout: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] } }}
            >
              <AnimatePresence mode="wait">
                {openSection === 'security' ? (
                  <motion.div
                    key="security-open"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header Abierto (Cápsula + Título/Sub + Status + Chevron) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          background: settings.two_factor_enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          border: `1px solid ${settings.two_factor_enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Shield size={20} color={settings.two_factor_enabled ? '#22c55e' : '#ef4444'} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900, color: 'var(--text-primary)' }}>
                            SEGURIDAD
                          </h3>
                          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Protección de acceso en dos pasos</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={`status-pill ${settings.two_factor_enabled ? 'status-pill-active' : 'status-pill-inactive'}`}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                          {settings.two_factor_enabled ? 'ACTIVA' : 'INACTIVA'}
                        </div>
                        <ChevronDown size={18} style={{ color: 'var(--text-secondary)', transform: 'rotate(180deg)', transition: 'transform 0.3s' }} />
                      </div>
                    </div>

                    {/* Cuerpo Abierto */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {settings.two_factor_enabled && isDisablingMfa ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Ingresa tu código para confirmar la desactivación.</p>
                          <input
                            type="text"
                            maxLength="6"
                            value={disableVerifyCode}
                            onChange={e => setDisableVerifyCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            className="mfa-input"
                            style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--text-primary)', borderRadius: '12px', width: '100%' }}
                          />
                          {disableMfaError && <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0', textAlign: 'center' }}>{disableMfaError}</p>}
                          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            <button onClick={() => setIsDisablingMfa(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700 }}>CANCELAR</button>
                            <button onClick={handleDisableMfa} disabled={disableMfaLoading} style={{ flex: 1, padding: '12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '12px', color: '#ef4444', cursor: 'pointer', opacity: disableMfaLoading ? 0.6 : 1, fontWeight: 900 }}>
                              {disableMfaLoading ? <Loader2 size={16} className="animate-spin" /> : 'DESACTIVAR'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Bloque 1: Autenticación de dos pasos */}
                          <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
                                <Smartphone size={22} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>Autenticación de dos pasos</p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Capa extra de seguridad para iniciar sesión.</p>
                              </div>
                            </div>
                            <div className={`status-pill ${settings.two_factor_enabled ? 'status-pill-active' : 'status-pill-inactive'}`}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                              {settings.two_factor_enabled ? 'ACTIVADA' : 'DESACTIVADA'}
                            </div>
                          </div>

                          {/* Bloque 2: Aplicación autenticadora */}
                          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Lock size={16} color={settings.two_factor_enabled ? '#22c55e' : '#ef4444'} />
                              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aplicación autenticadora</p>
                            </div>

                            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <ScanLine size={24} color="var(--text-secondary)" style={{ opacity: 0.4 }} />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                  {settings.two_factor_enabled ? 'Aplicación vinculada' : 'Sin aplicación vinculada'}
                                </p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', fontWeight: 500 }}>
                                  {settings.two_factor_enabled
                                    ? 'Operativa para el siguiente inicio de sesión.'
                                    : 'No hay una app vinculada en este momento.'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                            {settings.two_factor_enabled ? (
                              <button onClick={() => setIsDisablingMfa(true)} style={{ width: '100%', padding: '14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '14px', color: '#ef4444', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}>
                                DESACTIVAR
                              </button>
                            ) : (
                              <button onClick={handleEnrollMfa} disabled={mfaLoading} style={{ width: '100%', padding: '14px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '14px', color: '#22c55e', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.3s ease', opacity: mfaLoading ? 0.6 : 1 }} onMouseEnter={(e) => !mfaLoading && (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.25)')} onMouseLeave={(e) => !mfaLoading && (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)')}>
                                {mfaLoading ? <Loader2 size={16} className="animate-spin" /> : 'ACTIVAR'}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="security-closed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}
                  >
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shield size={16} color="var(--text-secondary)" />
                        <h3 style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900, color: 'var(--text-secondary)' }}>
                          SEGURIDAD
                        </h3>
                      </div>
                      <ChevronDown size={18} style={{ color: 'var(--text-secondary)', transition: 'transform 0.3s', transform: 'rotate(-90deg)' }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', position: 'relative' }}>
                      <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: settings.two_factor_enabled ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: settings.two_factor_enabled ? '0 0 25px rgba(34, 197, 94, 0.15)' : 'none'
                      }}>
                        <Shield
                          size={42}
                          strokeWidth={1.5}
                          style={{ color: settings.two_factor_enabled ? '#22c55e' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s ease' }}
                        />
                      </div>
                      <div className={`status-pill ${settings.two_factor_enabled ? 'status-pill-active' : 'status-pill-inactive'}`}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                        {settings.two_factor_enabled ? 'PROTEGIDA' : 'DESPROTEGIDA'}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Modal para QR */}
              <AnimatePresence>
                {mfaData && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(10px)',
                      zIndex: 100,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => { setMfaData(null); setQrCodeSvg(null); }}
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="glass-panel"
                      style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', maxWidth: '320px', width: '90%' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h4 style={{ margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Activar 2FA</h4>
                      <p style={{ margin: 0, textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        1. Escanea el QR con tu app de autenticación.
                      </p>
                      <div className="mfa-qr-container">
                        {qrCodeSvg && <div style={{ width: '150px', height: '150px' }} dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />}
                      </div>
                      {manualSecret && (
                        <div style={{ width: '100%' }}>
                          <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>O usa esta clave:</p>
                          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{manualSecret}</span>
                            <button onClick={() => copyToClipboard(manualSecret)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}><Copy size={16} /></button>
                          </div>
                        </div>
                      )}
                      <p style={{ margin: 0, textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        2. Ingresa el código de 6 dígitos.
                      </p>
                      <input
                        type="text"
                        maxLength="6"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="mfa-input"
                        style={{ padding: '12px', background: 'var(--bg-primary)', border: '2px solid var(--border-glass-top)', color: 'var(--text-primary)', borderRadius: '8px', width: '100%' }}
                      />
                      {mfaError && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{mfaError}</p>}
                      {mfaSuccessMessage && <p style={{ color: '#22c55e', fontSize: '0.8rem', margin: 0 }}>{mfaSuccessMessage}</p>}
                      <button onClick={handleVerifyMfa} disabled={mfaLoading} style={{ width: '100%', padding: '12px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 900, cursor: 'pointer', opacity: mfaLoading ? 0.6 : 1 }}>
                        {mfaLoading ? <Loader2 size={16} className="animate-spin" /> : 'Verificar y Activar'}
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* BOTTOM ROW: Language, Font, Font Size */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginTop: '6px' }}>
            <BottomRowMenu
              label={t.language}
              icon={<Languages size={20} />}
              value={LANGUAGES.find(l => l.id === settings.language)?.label || 'Escoge un idioma'}
              isOpen={openSetting === 'language'}
              onToggle={() => setOpenSetting(openSetting === 'language' ? null : 'language')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {LANGUAGES.map(lang => (
                  <button key={lang.id} onClick={() => updateSettings({ language: lang.id })} style={{ background: settings.language === lang.id ? 'var(--bg-glass-hover)' : 'transparent', border: `1px solid ${settings.language === lang.id ? 'rgba(0,243,255,0.1)' : 'transparent'}`, color: 'var(--text-primary)', padding: '12px 16px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}>
                    <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{lang.label}</span>
                    {settings.language === lang.id && <Check size={16} color="var(--accent-primary)" style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            </BottomRowMenu>

            <BottomRowMenu
              label={t.typography}
              icon={<Type size={20} />}
              value={FONT_OPTIONS.find(f => f.id === settings.font)?.label || 'Default'}
              isOpen={openSetting === 'font'}
              onToggle={() => setOpenSetting(openSetting === 'font' ? null : 'font')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {FONT_OPTIONS.map(font => (
                  <button key={font.id} onClick={() => updateSettings({ font: font.id })} style={{ background: settings.font === font.id ? 'var(--bg-glass-hover)' : 'transparent', border: `1px solid ${settings.font === font.id ? 'rgba(0,243,255,0.1)' : 'transparent'}`, color: 'var(--text-primary)', padding: '12px 16px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontFamily: font.value, transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: 1, fontSize: '0.9rem' }}>{font.label}</span>
                    {settings.font === font.id && <Check size={16} color="var(--accent-primary)" />}
                  </button>
                ))}
              </div>
            </BottomRowMenu>

            {/* ── FONT SIZE — fully self-contained, high-contrast block ── */}
            <BottomRowMenu
              label="TAMAÑO DE FUENTE"
              icon={<LayoutIcon size={20} />}
              value={(() => { const r = Number(settings.fontSize) || 16; return `${r > 0 && r <= 2 ? Math.round(r * 16) : Math.round(r)}PX`; })()}
              isOpen={openSetting === 'fontSize'}
              onToggle={() => setOpenSetting(openSetting === 'fontSize' ? null : 'fontSize')}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px'
              }}>
                {FONT_SIZES.map(size => {
                  const rawFs = Number(settings.fontSize) || 16;
                  const currentPx = rawFs > 0 && rawFs <= 2 ? Math.round(rawFs * 16) : Math.round(rawFs);
                  const isSelected = currentPx === size;
                  return (
                    <button
                      key={size}
                      onClick={() => updateSettings({ fontSize: size })}
                      style={{
                        background: isSelected
                          ? 'rgba(0, 243, 255, 0.22)'
                          : 'rgba(255, 255, 255, 0.08)',
                        border: isSelected
                          ? '2px solid #00f3ff'
                          : '1px solid rgba(255, 255, 255, 0.18)',
                        color: isSelected ? '#00f3ff' : '#ffffff',
                        padding: '10px 4px',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 900 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected
                          ? '0 0 14px rgba(0, 243, 255, 0.35), inset 0 0 8px rgba(0, 243, 255, 0.12)'
                          : 'none',
                        letterSpacing: '0.04em',
                        textShadow: isSelected ? '0 0 8px rgba(0, 243, 255, 0.5)' : 'none',
                        minHeight: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                        }
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </BottomRowMenu>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;

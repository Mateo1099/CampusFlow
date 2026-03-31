import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSettings, FONT_OPTIONS } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { User, Palette, Check, ImageIcon, Camera, Languages, Type, Shield, Layout as LayoutIcon, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronDown, Pencil } from 'lucide-react';

const THEMES = [
  { id: 'dark', labelKey: 'darkMode', icon: '🌙' },
  { id: 'light', labelKey: 'lightMode', icon: '☀️' },
  { id: 'daltonic', labelKey: 'daltonicMode', icon: '👁️' },
];

const WALLPAPERS = [
  { id: 'cyber', label: 'Frosted Glass', src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000' },
  { id: 'nature', label: 'Forest Glass', src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000' },
  { id: 'synth', label: 'Synthwave', src: 'https://images.unsplash.com/photo-1774848372214-3563247a592b?q=80&w=1935&auto=format&fit=crop' },
  { id: 'space', label: 'Dark Space', src: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?auto=format&fit=crop&q=80&w=1000' },
];

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
    <div style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>{React.cloneElement(icon, { size: 18 })}</div>
    <h3 style={{ margin: 0, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--text-primary)' }}>{label}</h3>
  </div>
);

const Switch = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', background: checked ? '#00f3ff' : 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', transition: 'all 0.3s ease', boxShadow: checked ? '0 0 15px rgba(0, 243, 255, 0.6), inset 0 0 8px rgba(0, 243, 255, 0.4)' : 'none' }}>
    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: checked ? '#000' : '#666', transition: 'transform 0.3s ease', transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
  </button>
);

const Profile = () => {
  const { settings, updateSettings, t } = useSettings();
  const { user } = useAuth();
  const wallpaperInputRef = useRef(null);
  const profileInputRef = useRef(null);

  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [openSetting, setOpenSetting] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(settings.name);

  const [mfaData, setMfaData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isMfaActive, setIsMfaActive] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');

  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [disableVerifyCode, setDisableVerifyCode] = useState('');
  const [disableMfaLoading, setDisableMfaLoading] = useState(false);
  const [disableMfaError, setDisableMfaError] = useState('');
  const [showToast, setShowToast] = useState(false);

  const downloadAvatar = useCallback(async (path) => {
    try {
      setIsLoadingAvatar(true);
      const { data, error } = await supabase.storage.from('avatars').download(path);
      if (error) throw error;
      setAvatarUrl(URL.createObjectURL(data));
    } catch (error) { console.error('Error:', error.message); } finally { setIsLoadingAvatar(false); }
  }, []);

  useEffect(() => {
    if (user?.user_metadata?.avatar_path) downloadAvatar(user.user_metadata.avatar_path);
    checkMfaStatus();
  }, [user, downloadAvatar]);

  useEffect(() => { setTempName(settings.name); }, [settings.name]);

  const checkMfaStatus = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    if (data?.all?.some(f => f.status === 'verified')) setIsMfaActive(true);
  }, []);

  const showToastMessage = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { avatar_path: fileName } });
      await updateSettings({ avatarUrl: fileName });
      downloadAvatar(fileName);
      showToastMessage();
    } catch (error) { alert('Error: ' + error.message); } finally { setIsUploading(false); }
  };

  const handleNameSave = () => {
    if (tempName.trim() && tempName !== settings.name) {
      updateSettings({ name: tempName.trim() });
      showToastMessage();
    }
    setIsEditingName(false);
  };

  const handleEnrollMfa = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setMfaData(data);
    } catch (err) { setMfaError(err.message); } finally { setMfaLoading(false); }
  };

  const handleVerifyMfa = async () => {
    setMfaLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaData.id });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaData.id, challengeId: challengeData.id, code: verifyCode });
      if (verifyError) throw verifyError;
      setIsMfaActive(true);
      setMfaData(null);
      showToastMessage();
    } catch (err) { setMfaError(err.message); } finally { setMfaLoading(false); }
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
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: totpFactor.id, challengeId: challengeData.id, code: disableVerifyCode });
      if (verifyError) throw verifyError;
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
      if (unenrollError) throw unenrollError;
      setIsMfaActive(false);
      setIsDisablingMfa(false);
      setDisableVerifyCode('');
      showToastMessage();
    } catch (err) { setDisableMfaError(err.message); } finally { setDisableMfaLoading(false); }
  };

  const handleWallpaperUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        await updateSettings({ wallpaper: 'custom', customWallpaper: event.target.result });
        showToastMessage();
      };
      reader.readAsDataURL(file);
    }
  };

  const avatarSource = (settings.avatarUrl && settings.avatarUrl !== "") ? settings.avatarUrl : (avatarUrl || settings.profileImage);

  return (
    <div className="animate-fade-in" style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <style>{`
        @keyframes shine { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
        .gradient-title-ajustes { background: linear-gradient(90deg, #00f3ff, #bc13fe, #00f3ff); background-size: 200% auto; animation: shine 3s linear infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 3rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 40px; }
        @media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr !important; } }
      `}</style>
      
      <h1 className="gradient-title-ajustes">AJUSTES</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }} className="settings-grid">

        {/* === CARD DE USUARIO === */}
        <div className="glass-panel" style={{ padding: '36px', display: 'flex', alignItems: 'center', gap: '40px', gridColumn: '1 / -1', border: '1px solid var(--border-glass-top)' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '130px', height: '130px', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--accent-primary)', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {(!avatarLoaded || !avatarSource) && <div className="animate-pulse-neon" style={{ position: 'absolute', inset: 0, background: 'rgba(0, 243, 255, 0.15)', boxShadow: 'inset 0 0 30px rgba(0, 243, 255, 0.4)', zIndex: 2, transition: 'opacity 0.5s ease-in-out', opacity: !avatarLoaded ? 1 : 0 }} />}
              {avatarSource && avatarSource !== "" ? (
                <img key={avatarSource} src={avatarSource} alt="User" fetchPriority="high" loading="eager" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: avatarLoaded ? 1 : 0, transition: 'opacity 0.4s ease-in-out' }} onLoad={() => setAvatarLoaded(true)} onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${settings.name || 'Mateo'}&background=00f3ff&color=fff`; setAvatarLoaded(true); }} />
              ) : <div style={{ opacity: avatarLoaded ? 1 : 0, transition: 'opacity 0.4s' }}><User size={60} color="var(--accent-primary)" style={{ opacity: 0.5 }} /></div>}
            </div>
            <button onClick={() => profileInputRef.current.click()} style={{ position: 'absolute', bottom: '5px', right: '5px', width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}><Camera size={18} /></button>
            <input type="file" ref={profileInputRef} hidden accept="image/*" onChange={handleProfileImageUpload} />
          </div>
          <div style={{ perspective: '1000px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', width: 'fit-content', marginBottom: '10px', transform: 'rotateX(5deg) rotateY(-2deg)', boxShadow: '0 10px 20px rgba(0,0,0,0.5), inset 0 0 15px rgba(0, 243, 255, 0.3)', transformStyle: 'preserve-3d' }}>
              {isEditingName ? (
                <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={handleNameSave} onKeyDown={e => e.key === 'Enter' && handleNameSave()} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 950, textTransform: 'uppercase', outline: 'none', width: '300px' }} />
              ) : <h2 className="font-display" style={{ fontSize: '2.8rem', margin: 0, fontWeight: 950, textTransform: 'uppercase', color: 'var(--text-primary)' }}>{settings.name || 'Mateo'}</h2>}
              <button onClick={() => setIsEditingName(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', opacity: 0.7 }}><Pencil size={20} /></button>
            </div>
            <span style={{ color: '#00f3ff', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', marginLeft: '24px', letterSpacing: '1px', textTransform: 'uppercase' }}>[CF_AGENT_STU]</span>
          </div>
        </div>

        {/* === BLOQUE 1: DISEÑO Y NAVEGACIÓN === */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '28px', border: '1px solid var(--border-glass-top)' }}>
          <div>
            <SectionTitle icon={<Palette />} label={t.themeMode} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
              {THEMES.map(theme => (
                <button key={theme.id} onClick={() => { updateSettings({ theme: theme.id }); showToastMessage(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: `1px solid ${settings.theme === theme.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'}`, background: settings.theme === theme.id ? 'rgba(255,255,255,0.05)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.3s' }}>
                  <span style={{ fontSize: '1.2rem' }}>{theme.icon}</span><span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{t[theme.labelKey]}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
          <div>
            <SectionTitle icon={<LayoutIcon />} label={t.layoutPos} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {[ { id: 'left', label: t.left, icon: <ArrowLeft size={16} /> }, { id: 'right', label: t.right, icon: <ArrowRight size={16} /> }, { id: 'top', label: t.top, icon: <ArrowUp size={16} /> }, { id: 'bottom', label: t.bottom, icon: <ArrowDown size={16} /> } ].map(pos => (
                <button key={pos.id} onClick={() => { updateSettings({ sidebarPosition: pos.id }); showToastMessage(); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', border: `1px solid ${settings.sidebarPosition === pos.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'}`, background: settings.sidebarPosition === pos.id ? 'rgba(255,255,255,0.05)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.3s' }}>
                  {pos.icon} <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{pos.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* === BLOQUE 2: FONDOS DE PANTALLA === */}
        <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-glass-top)' }}>
          <SectionTitle icon={<ImageIcon />} label={t.wallpapers} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {WALLPAPERS.map(wp => (
              <button key={wp.id} onClick={() => { updateSettings({ wallpaper: wp.id }); showToastMessage(); }} style={{ height: '90px', borderRadius: '12px', border: `2px solid ${settings.wallpaper === wp.id ? 'var(--accent-primary)' : 'transparent'}`, backgroundImage: `url(${wp.src})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer', position: 'relative', transition: 'all 0.3s' }}>
                {settings.wallpaper === wp.id && <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--accent-primary)', borderRadius: '50%', padding: '4px', boxShadow: '0 0 10px rgba(0,243,255,0.5)' }}><Check size={12} color="#000" strokeWidth={4} /></div>}
              </button>
            ))}
            <button onClick={() => wallpaperInputRef.current.click()} style={{ height: '90px', borderRadius: '12px', border: settings.customWallpaper ? 'none' : '2px dashed var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', background: settings.customWallpaper ? `url(${settings.customWallpaper})` : 'rgba(0,0,0,0.15)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s' }}>
              {settings.customWallpaper && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1 }} />}
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Camera size={20} /><span style={{ fontSize: '0.7rem', marginTop: '6px', fontWeight: 900, letterSpacing: '1px' }}>SUBIR FOTO</span></div>
            </button>
            <input type="file" ref={wallpaperInputRef} hidden accept="image/*" onChange={handleWallpaperUpload} />
          </div>
        </div>

        {/* === BLOQUE 3: INTERFAZ DEL SISTEMA === */}
        <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-glass-top)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SectionTitle icon={<Type />} label="Configuración de Interfaz" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Languages size={18} color="var(--accent-primary)" /><span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{t.language}</span></div>
            <select className="select" value={settings.language} onChange={(e) => { updateSettings({ language: e.target.value }); showToastMessage(); }} style={{ width: '150px', padding: '8px 12px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', outline: 'none' }}>
              {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.flag} {l.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Type size={18} color="var(--accent-primary)" /><span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{t.typography}</span></div>
            <select className="select" value={settings.font} onChange={(e) => { updateSettings({ font: e.target.value }); showToastMessage(); }} style={{ width: '150px', padding: '8px 12px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', outline: 'none' }}>
              {FONT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Type size={18} color="var(--accent-primary)" /><span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{t.fontSize}</span></div>
            <select className="select" value={settings.fontSize} onChange={(e) => { updateSettings({ fontSize: Number(e.target.value) }); showToastMessage(); }} style={{ width: '150px', padding: '8px 12px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', outline: 'none' }}>
              {[12, 14, 16, 18, 20, 24].map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
          </div>
        </div>

        {/* === BLOQUE 4: SEGURIDAD Y ALERTAS === */}
        <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-glass-top)', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <SectionTitle icon={<Shield />} label="Seguridad y Accesos" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isMfaActive ? 'var(--accent-lime)' : '#ef4444', boxShadow: `0 0 12px ${isMfaActive ? 'var(--accent-lime)' : '#ef4444'}` }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>AUTENTICADOR TOTP</span>
              </div>
              {!isMfaActive ? (
                <button onClick={handleEnrollMfa} style={{ padding: '8px 16px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 0 15px rgba(0, 243, 255, 0.3)' }}>ACTIVAR</button>
              ) : (
                <button onClick={() => setIsDisablingMfa(true)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}>DESACTIVAR</button>
              )}
            </div>
            
            {mfaData && !isMfaActive && (
              <div className="animate-fade-in" style={{ marginTop: '16px', padding: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid var(--border-glass-top)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src={mfaData.totp.qr_code} alt="QR" style={{ width: '140px', height: '140px', marginBottom: '16px', borderRadius: '12px', background: '#fff', padding: '8px' }} />
                <input type="text" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="Código de 6 dígitos" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,243,255,0.3)', color: '#fff', borderRadius: '8px', marginBottom: '12px', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px', outline: 'none' }} />
                {mfaError && <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '12px' }}>{mfaError}</p>}
                <button onClick={handleVerifyMfa} disabled={mfaLoading} style={{ width: '100%', padding: '12px', background: 'var(--accent-lime)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase' }}>{mfaLoading ? 'Procesando...' : 'Verificar y Activar'}</button>
              </div>
            )}
            
            {isDisablingMfa && isMfaActive && (
              <div className="animate-fade-in" style={{ marginTop: '16px', padding: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <input type="text" value={disableVerifyCode} onChange={e => setDisableVerifyCode(e.target.value)} placeholder="Ingresa el código actual" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', marginBottom: '12px', textAlign: 'center', fontSize: '1rem', outline: 'none' }} />
                {disableMfaError && <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '12px' }}>{disableMfaError}</p>}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => { setIsDisablingMfa(false); setDisableVerifyCode(''); setDisableMfaError(''); }} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>CANCELAR</button>
                  <button onClick={handleDisableMfa} disabled={disableMfaLoading} style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer' }}>{disableMfaLoading ? '...' : 'CONFIRMAR'}</button>
                </div>
              </div>
            )}
          </div>
          
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
          
          <div>
            <SectionTitle icon={<Shield />} label="Alertas del Sistema" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: settings.notifications_email ? '#00f3ff' : '#666', boxShadow: settings.notifications_email ? '0 0 12px #00f3ff' : 'none', transition: 'all 0.3s' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>NOTIFICACIONES EMAIL</span>
              </div>
              <Switch checked={settings.notifications_email || false} onChange={async (value) => { await updateSettings({ notifications_email: value }); showToastMessage(); }} />
            </div>
          </div>
        </div>

      </div>

      {showToast && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0, 243, 255, 0.15)', border: '1px solid rgba(0, 243, 255, 0.5)', color: '#00f3ff', padding: '16px 24px', borderRadius: '12px', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', boxShadow: '0 0 20px rgba(0, 243, 255, 0.3)', zIndex: 9999, animation: 'slideUp 0.3s ease-out' }}>
          AJUSTES SINCRONIZADOS
        </div>
      )}
    </div>
  );
};

export default Profile;

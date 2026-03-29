import React, { useRef, useState } from 'react';
import { useApp, FONT_OPTIONS } from '../context/AppContext';
import { 
  User, Palette, Check, ImageIcon, Camera, Languages, Type, 
  Layout as LayoutIcon, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronDown
} from 'lucide-react';

const THEMES = [
  { id: 'dark', labelKey: 'darkMode', icon: '🌙', gradient: 'linear-gradient(135deg, #0f172a, #1e293b)' },
  { id: 'light', labelKey: 'lightMode', icon: '☀️', gradient: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' },
  { id: 'daltonic', labelKey: 'daltonicMode', icon: '👁️', gradient: 'linear-gradient(135deg, #0c4a6e, #075985)' },
];

const WALLPAPERS = [
  { id: 'glass', label: 'Frosted Glass', src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000' },
  { id: 'nature', label: 'Forest Glass', src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000' },
  { id: 'synth', label: 'Synthwave', src: 'https://images.unsplash.com/photo-1614850523296-62c0af475430?auto=format&fit=crop&q=80&w=1000' },
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
    <div style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>
      {React.cloneElement(icon, { size: 18 })}
    </div>
    <h3 style={{ margin: 0, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>{label}</h3>
  </div>
);

const AccordionSection = ({ title, icon, children, isOpen, onToggle }) => (
  <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
    <button 
      onClick={onToggle}
      style={{
        width: '100%', padding: '24px 32px', display: 'flex', alignItems: 'center', gap: '16px',
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        color: 'var(--text-primary)', transition: 'background 0.3s'
      }}
      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ color: 'var(--accent-primary)' }}>{icon}</div>
      <span style={{ flex: 1, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.9rem' }}>{title}</span>
      <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
    </button>
    <div style={{ 
      maxHeight: isOpen ? '800px' : '0', overflow: 'hidden', 
      transition: 'max-height 0.4s var(--ease-out-quint), opacity 0.4s var(--ease-out-quint)',
      opacity: isOpen ? 1 : 0,
      padding: isOpen ? '0 32px 32px' : '0 32px'
    }}>
      <div className={isOpen ? 'animate-fade-scale' : ''}>
        {children}
      </div>
    </div>
  </div>
);

const Profile = () => {
  const { settings, updateSettings, t } = useApp();
  const wallpaperInputRef = useRef(null);
  const profileInputRef = useRef(null);
  
  const [openSection, setOpenSection] = useState(null); // 'lang' | 'font' | null

  const handleWallpaperUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateSettings({ wallpaper: 'custom', customWallpaper: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateSettings({ profileImage: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <header className="page-header" style={{ marginBottom: '40px' }}>
        <h1 className="page-title">{t.profile}</h1>
      </header>

      <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Card de Usuario - CABECERA - Ahora más compacta y elegante */}
        <div className="glass-panel" style={{ padding: '36px', display: 'flex', alignItems: 'center', gap: '40px', gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ padding: '6px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', boxShadow: '0 15px 40px rgba(0, 122, 255, 0.3)' }}>
              <div style={{ width: '130px', height: '130px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #fff', position: 'relative', background: '#222' }}>
                {settings.profileImage ? (
                  <img src={settings.profileImage} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                    <User size={60} />
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={() => profileInputRef.current.click()} 
              style={{ 
                position: 'absolute', bottom: '5px', right: '5px', width: '38px', height: '38px', 
                borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', color: '#000', 
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'transform 0.2s'
              }}
              className="glass-card-hover"
            >
              <Camera size={18} />
            </button>
            <input type="file" ref={profileInputRef} hidden accept="image/*" onChange={handleProfileImageUpload} />
          </div>
          <div>
            <h2 className="font-display" style={{ fontSize: '2.4rem', margin: '0 0 4px', fontWeight: 900, color: 'var(--text-primary)' }}>{settings.userName || 'Mateo'}</h2>
            <p style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.85rem', fontWeight: 800 }}>ESTUDIANTE DE CAMPUSFLOW</p>
            <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
               <div>
                 <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>TEMA VISUAL</p>
                 <span style={{ fontWeight: 800, color: 'var(--accent-secondary)', fontSize: '0.95rem' }}>{settings.theme.toUpperCase()}</span>
               </div>
               <div style={{ paddingLeft: '24px', borderLeft: '1px solid var(--border-glass-top)' }}>
                 <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>IDIOMA</p>
                 <span style={{ fontWeight: 800, color: 'var(--accent-lime)', fontSize: '0.95rem' }}>{settings.language.toUpperCase()}</span>
               </div>
            </div>
          </div>
        </div>

        {/* TEMA VISUAL */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <SectionTitle icon={<Palette />} label={t.themeMode} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {THEMES.map(theme => (
              <button key={theme.id} onClick={() => updateSettings({ theme: theme.id })} className="btn-select-modern click-press hover-lift" style={{
                  padding: '12px 18px',
                  background: settings.theme === theme.id ? 'var(--bg-glass-hover)' : 'transparent',
                  borderColor: settings.theme === theme.id ? 'var(--accent-primary)' : 'var(--border-glass-top)',
                  borderWidth: '2px'
                }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: theme.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '1px solid rgba(255,255,255,0.1)' }}>{theme.icon}</div>
                <span style={{ flex: 1, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{t[theme.labelKey]}</span>
                {settings.theme === theme.id && <Check size={20} color="var(--accent-primary)" style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
        </div>

        {/* FONDOS DE PANTALLA */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <SectionTitle icon={<ImageIcon />} label={t.wallpapers} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            {WALLPAPERS.map(wp => (
              <button key={wp.id} onClick={() => updateSettings({ wallpaper: wp.id })} style={{
                  height: '90px', borderRadius: '16px', border: `2px solid ${settings.wallpaper === wp.id ? 'var(--accent-primary)' : 'transparent'}`,
                  backgroundImage: `url(${wp.src})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative',
                  transition: 'transform 0.3s'
                }} className="glass-card-hover">
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 800 }}>{wp.label}</span>
                </div>
                {settings.wallpaper === wp.id && <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--accent-primary)', borderRadius: '50%', padding: '2px' }}><Check size={12} color="#000" /></div>}
              </button>
            ))}
            {/* Botón Cargar Foto */}
            <button key="custom" onClick={() => wallpaperInputRef.current.click()} style={{
                  height: '90px', borderRadius: '16px', border: `2px dashed ${settings.wallpaper === 'custom' ? 'var(--accent-primary)' : 'var(--text-secondary)'}`,
                  background: (settings.wallpaper === 'custom' && settings.customWallpaper) ? `url(${settings.customWallpaper})` : 'transparent', backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative'
                }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Camera size={20} color={settings.wallpaper === 'custom' ? 'var(--accent-primary)' : '#fff'} />
                  <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>{t.uploadPhoto.toUpperCase()}</span>
                </div>
                {settings.wallpaper === 'custom' && <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--accent-primary)', borderRadius: '50%', padding: '2px' }}><Check size={12} color="#000" /></div>}
            </button>
            <input type="file" ref={wallpaperInputRef} hidden accept="image/*" onChange={handleWallpaperUpload} />
          </div>
        </div>

        {/* POSICIÓN DEL MENÚ */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <SectionTitle icon={<LayoutIcon />} label={t.layoutPos} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[
              { id: 'left', label: t.left, icon: <ArrowLeft size={18} /> },
              { id: 'right', label: t.right, icon: <ArrowRight size={18} /> },
              { id: 'top', label: t.top, icon: <ArrowUp size={18} /> },
              { id: 'bottom', label: t.bottom, icon: <ArrowDown size={18} /> }
            ].map(pos => (
              <button key={pos.id} onClick={() => updateSettings({ sidebarPosition: pos.id })} className="btn-select-modern" style={{
                  background: settings.sidebarPosition === pos.id ? 'var(--bg-glass-hover)' : 'transparent',
                  borderColor: settings.sidebarPosition === pos.id ? 'var(--accent-primary)' : 'var(--border-glass-top)',
                  borderWidth: '2px',
                  justifyContent: 'center',
                  padding: '14px',
                  gap: '10px'
                }}>
                {pos.icon}
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{pos.label}</span>
                {settings.sidebarPosition === pos.id && <Check size={18} color="var(--accent-primary)" />}
              </button>
            ))}
          </div>
        </div>

        {/* GRUPO DE AJUSTES - DISEÑO BENTO 3 COLUMNAS SEGÚN FOTO */}
        <div style={{ 
          gridColumn: '1 / -1', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '24px', 
          marginTop: '32px' 
        }}>
          <AccordionSection 
            title={t.language} 
            icon={<Languages size={22} />} 
            isOpen={openSection === 'lang'} 
            onToggle={() => setOpenSection(openSection === 'lang' ? null : 'lang')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {LANGUAGES.map(lang => (
                <button key={lang.id} onClick={() => updateSettings({ language: lang.id })} className="btn-select-modern stagger-item click-press" style={{
                    background: settings.language === lang.id ? 'var(--bg-glass-hover)' : 'transparent',
                    borderColor: settings.language === lang.id ? 'var(--accent-primary)' : 'var(--border-glass-top)',
                    borderWidth: '1px',
                    padding: '12px 18px',
                    width: '100%'
                }}>
                  <span style={{ fontSize: '1.4rem' }}>{lang.flag}</span>
                  <span style={{ flex: 1, fontWeight: settings.language === lang.id ? 800 : 400 }}>{lang.label}</span>
                  {settings.language === lang.id && <Check size={18} color="var(--accent-primary)" />}
                </button>
              ))}
            </div>
          </AccordionSection>

          <AccordionSection 
            title={t.typography} 
            icon={<Type size={22} />} 
            isOpen={openSection === 'font'} 
            onToggle={() => setOpenSection(openSection === 'font' ? null : 'font')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {FONT_OPTIONS.map(font => (
                <button key={font.id} onClick={() => updateSettings({ font: font.id })} className="btn-select-modern stagger-item click-press" style={{
                    fontFamily: font.css,
                    background: settings.font === font.id ? 'var(--accent-primary)11' : 'transparent',
                    borderColor: settings.font === font.id ? 'var(--accent-primary)' : 'var(--border-glass-top)',
                    borderWidth: '2px',
                    padding: '12px 18px',
                    width: '100%'
                }}>
                  <span style={{ flex: 1, fontWeight: settings.font === font.id ? 800 : 400 }}>{font.label}</span>
                  {settings.font === font.id && <Check size={18} color="var(--accent-primary)" />}
                </button>
              ))}
            </div>
          </AccordionSection>

          {/* Selector de Tamaño de Fuente Numérico (Bento Card) */}
          <div className="glass-panel" style={{ 
            padding: '32px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-glass-top)',
            background: 'var(--bg-glass)'
          }}>
            <SectionTitle icon={<Type size={18} />} label={t.fontSize} />
            <div style={{ position: 'relative', width: '100%' }}>
              <select 
                value={settings.fontSize} 
                onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                className="select hover-lift"
                style={{
                  appearance: 'none',
                  width: '100%',
                  padding: '14px 40px 14px 20px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  border: '2px solid var(--border-glass-top)',
                  background: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  color: 'var(--text-primary)',
                  transition: 'all 0.4s var(--ease-out-quint)',
                  outline: 'none'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 15px var(--accent-primary)33'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-glass-top)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 90].map(val => (
                  <option key={val} value={val} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {val} px
                  </option>
                 ))}
              </select>
              <ChevronDown 
                size={20} 
                style={{ 
                  position: 'absolute', right: '15px', top: '50%', 
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                  color: 'var(--accent-primary)' 
                }} 
              />
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              * Cambia el tamaño de toda la interfaz dinámicamente.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;

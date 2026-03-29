
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { User, Lock, ArrowRight, Zap, GraduationCap, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login, t } = useApp();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: email.split('@')[0] }
          }
        });
        if (error) throw error;
        if (data.user) {
          alert('¡Cuenta creada! Revisa tu email para confirmación (si está activada) o inicia sesión.');
          setMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user) {
          login({ 
            name: data.user.user_metadata?.display_name || email.split('@')[0], 
            id: data.user.id 
          });
          navigate('/');
        }
      }
    } catch (err) {
      setErrorMsg(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background Orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: 'var(--accent-primary)', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'var(--accent-secondary)', filter: 'blur(150px)', opacity: 0.1, borderRadius: '50%', zIndex: 0 }} />

      <div style={{
        width: '100%', maxWidth: '420px', padding: '40px',
        background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-glass-top)', borderRadius: '24px',
        boxShadow: 'var(--shadow-glass)', zIndex: 1, textAlign: 'center'
      }}>
        <div style={{
          width: '64px', height: '64px',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', boxShadow: '0 8px 16px rgba(0, 122, 255, 0.3)'
        }}>
          <GraduationCap size={32} color="white" />
        </div>

        <h1 className="font-display" style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          CampusFlow
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          {mode === 'signup' ? 'Crea tu nueva cuenta académica' : t.enterDetails}
        </p>

        {errorMsg && (
          <div style={{ 
            background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', 
            color: '#ff4500', padding: '12px', borderRadius: '12px', marginBottom: '20px', 
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' 
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <User size={18} />
            </div>
            <input
              type="email"
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '14px 16px 14px 48px', background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-glass-top)', borderRadius: '12px',
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none'
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Lock size={18} />
            </div>
            <input
              type="password"
              placeholder={t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '14px 16px 14px 48px', background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-glass-top)', borderRadius: '12px',
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '8px', padding: '14px',
              background: 'var(--accent-primary)', border: 'none', borderRadius: '12px',
              color: 'white', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: isLoading ? 0.7 : 1, transition: 'all 0.3s'
            }}
          >
            {isLoading ? 'Procesando...' : <>{mode === 'signup' ? 'Registrarme' : t.login} <ArrowRight size={18} /></>}
          </button>
        </form>

        <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass-top)' }} />
          <span>O</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass-top)' }} />
        </div>

        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          style={{
            width: '100%', padding: '12px', background: 'transparent',
            border: '1px solid var(--border-glass-top)', borderRadius: '12px',
            color: 'var(--text-primary)', fontSize: '0.95rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <Zap size={16} color="var(--accent-primary)" />
          {mode === 'login' ? 'Crear una cuenta nueva' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
};

export default Login;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Lock, AlertCircle, ArrowRight } from 'lucide-react';

const MFAChallenge = () => {
  const { user, logout, aal } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Si no hay usuario, ir a login
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Si ya pasó MFA (AAL2), ir a dashboard
    if (aal === 'aal2') {
      navigate('/');
    }
  }, [user, aal, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Obtener factores MFA (TOTP)
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) throw factorsError;
      if (!factors?.totp?.length) {
        throw new Error('No TOTP factor found. Please enable TOTP first.');
      }
      
      const totpFactor = factors.totp[0];

      // Crear challenge MFA
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      if (challengeError) throw challengeError;

      // Verificar el código contra el challenge
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code
      });

      if (verifyError) throw verifyError;

      setSuccess('¡Verificación exitosa! Redirigiendo...');
      
      // Esperar 1 segundo y luego redirigir
      setTimeout(() => {
        navigate('/');
      }, 1000);

    } catch (err) {
      console.error('MFA Verification Error:', err);
      setError(err.message || 'Error verificando el código. Intenta de nuevo.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('Un nuevo código ha sido enviado a tu aplicación authenticator');
      
      // Reset después de 3 segundos
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Error al reenviar código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, rgba(0,122,255,0.03) 100%)',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background Orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: 'var(--accent-primary)', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: '400px', height: '400px', background: 'var(--accent-secondary)', filter: 'blur(150px)', opacity: 0.08, borderRadius: '50%', zIndex: 0 }} />
      
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
          <Lock size={32} color="white" />
        </div>

        <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Verificación de Seguridad
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
          Tu cuenta está protegida con autenticación de dos factores. Ingresa el código de 6 dígitos de tu aplicación authenticator.
        </p>

        {error && (
          <div style={{
            background: 'rgba(255, 59, 48, 0.1)',
            border: '1px solid rgba(255, 59, 48, 0.2)',
            color: '#ff4500',
            padding: '12px', borderRadius: '12px', marginBottom: '20px',
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(52, 168, 83, 0.1)',
            border: '1px solid rgba(52, 168, 83, 0.2)',
            color: '#34a853',
            padding: '12px', borderRadius: '12px', marginBottom: '20px',
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <AlertCircle size={16} /> {success}
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength="6"
              disabled={loading}
              autoFocus
              style={{
                width: '100%', padding: '16px', background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-glass-top)', borderRadius: '12px',
                color: 'var(--text-primary)', fontSize: '1.5rem', outline: 'none',
                textAlign: 'center', letterSpacing: '8px', fontFamily: 'monospace',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.3s'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            style={{
              marginTop: '8px', padding: '14px',
              background: 'var(--accent-primary)', border: 'none', borderRadius: '12px',
              color: 'white', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: (loading || code.length !== 6) ? 0.5 : 1,
              transition: 'all 0.3s'
            }}
          >
            {loading ? 'Verificando...' : <>Verificar <ArrowRight size={18} /></>}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-glass-top)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
            ¿No tienes el código?
          </p>
          <button
            onClick={handleResendCode}
            disabled={loading}
            style={{
              width: '100%', padding: '10px',
              background: 'transparent', border: '1px solid var(--accent-primary)',
              borderRadius: '8px', color: 'var(--accent-primary)', fontSize: '0.9rem',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s',
              opacity: loading ? 0.6 : 1
            }}
          >
            Reenviar código
          </button>
        </div>

        <button
          onClick={logout}
          style={{
            width: '100%', margin: '16px 0 0', padding: '10px',
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', fontSize: '0.9rem',
            cursor: 'pointer', transition: 'color 0.3s'
          }}
        >
          ← Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default MFAChallenge;

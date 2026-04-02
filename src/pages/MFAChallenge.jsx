import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Lock, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';

const MFAChallenge = () => {
  const { user, logout, aal, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successShow, setSuccessShow] = useState(false);

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

      // 🔥 CRÍTICO: Refrescar la sesión del navegador para que reconozca AAL2
      console.log('[MFA] Verificación exitosa, refrescando sesión de Supabase...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('[MFA] Error refrescando sesión de Supabase:', refreshError);
        throw refreshError;
      }
      
      console.log('[MFA] Sesión de Supabase refrescada, AAL ahora es:', refreshData?.session?.user?.aal);
      
      // Refrescar el estado de la aplicación después de la sesión de Supabase
      const sessionRefreshed = await refreshSession();
      
      if (!sessionRefreshed) {
        console.warn('[MFA] No se pudo refrescar la sesión de la aplicación');
      }
      
      setSuccess('¡Verificación exitosa!');
      setSuccessShow(true);
      
      // Navegar al dashboard después de que TODO se actualice
      console.log('[MFA] Navegando a / después de verificar AAL2');
      navigate('/');

    } catch (err) {
      console.error('MFA Verification Error:', err);
      setError(err.message || 'Error verificando el código. Intenta de nuevo.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 20% 50%, rgba(30, 41, 59, 0.8), #0f172a 50%), radial-gradient(circle at 80% 80%, rgba(15, 23, 42, 0.9), #0f172a)',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Animated Background Orbs */}
      <div style={{ 
        position: 'absolute', top: '10%', left: '5%', width: '400px', height: '400px', 
        background: 'radial-gradient(circle, rgba(0, 122, 255, 0.2), transparent)', 
        filter: 'blur(80px)', borderRadius: '50%', zIndex: 0,
        animation: 'float 8s ease-in-out infinite',
        animationDelay: '0s'
      }} />
      <div style={{ 
        position: 'absolute', bottom: '5%', right: '10%', width: '350px', height: '350px', 
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent)', 
        filter: 'blur(70px)', borderRadius: '50%', zIndex: 0,
        animation: 'float 10s ease-in-out infinite',
        animationDelay: '2s'
      }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 122, 255, 0.3), inset 0 0 10px rgba(0, 122, 255, 0.1); }
          50% { box-shadow: 0 0 20px rgba(0, 122, 255, 0.5), inset 0 0 15px rgba(0, 122, 255, 0.2); }
        }
      `}</style>
      
      <div style={{
        width: '100%', maxWidth: '420px', padding: '40px',
        background: 'rgba(30, 41, 59, 0.4)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        zIndex: 1, textAlign: 'center',
        animation: 'slideInUp 0.6s ease-out'
      }}>
        <div style={{
          width: '64px', height: '64px',
          background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.8), rgba(139, 92, 246, 0.8))',
          borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', boxShadow: '0 8px 16px rgba(0, 122, 255, 0.3), 0 0 20px rgba(0, 122, 255, 0.2)'
        }}>
          <Lock size={32} color="white" />
        </div>

        <h1 className="font-display" style={{ 
          fontSize: '2rem', fontWeight: 950, color: '#f1f5f9', margin: '0 0 12px',
          animation: 'slideInDown 0.6s ease-out 0.1s both'
        }}>
          Verificación de Seguridad
        </h1>
        <p style={{ 
          color: '#cbd5e1', marginBottom: '32px', fontSize: '0.95rem', lineHeight: '1.5',
          animation: 'slideInDown 0.6s ease-out 0.2s both'
        }}>
          Ingresa el código de 6 dígitos de tu aplicación authenticator para completar la verificación.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '14px', borderRadius: '12px', marginBottom: '24px',
            fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
            animation: 'slideInDown 0.4s ease-out'
          }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#86efac',
            padding: '14px', borderRadius: '12px', marginBottom: '24px',
            fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            animation: 'slideInDown 0.4s ease-out',
            backdropFilter: 'blur(5px)'
          }}>
            <CheckCircle size={18} /> {success}
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength="6"
              disabled={loading}
              autoFocus
              style={{
                width: '100%', padding: '20px', background: 'rgba(15, 23, 42, 0.6)',
                border: code ? '2px solid rgba(0, 122, 255, 0.5)' : '2px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '16px',
                color: '#f1f5f9', fontSize: '2.5rem', outline: 'none',
                textAlign: 'center', letterSpacing: '16px', fontFamily: 'monospace',
                fontWeight: 600,
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.3s ease',
                boxShadow: code ? '0 0 20px rgba(0, 122, 255, 0.2), inset 0 0 10px rgba(0, 122, 255, 0.05)' : 'none',
                cursor: loading ? 'not-allowed' : 'text'
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 0 30px rgba(0, 122, 255, 0.3), inset 0 0 15px rgba(0, 122, 255, 0.1)';
                e.target.style.borderColor = 'rgba(0, 122, 255, 0.8)';
              }}
              onBlur={(e) => {
                if (!code) {
                  e.target.style.boxShadow = 'none';
                  e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                }
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            style={{
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.9), rgba(139, 92, 246, 0.8))',
              border: 'none', borderRadius: '12px',
              color: 'white', fontSize: '1rem', fontWeight: 700, cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: (loading || code.length !== 6) ? 0.5 : 1,
              transition: 'all 0.3s',
              boxShadow: '0 4px 15px rgba(0, 122, 255, 0.2)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              if (!loading && code.length === 6) {
                e.target.style.boxShadow = '0 8px 25px rgba(0, 122, 255, 0.4)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && code.length === 6) {
                e.target.style.boxShadow = '0 4px 15px rgba(0, 122, 255, 0.2)';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? 'Verificando...' : <>Verificar <ArrowRight size={18} /></>}
          </button>
        </form>

        <button
          onClick={logout}
          style={{
            width: '100%', margin: '16px 0 0', padding: '12px',
            background: 'transparent', border: 'none',
            color: '#94a3b8', fontSize: '0.9rem',
            cursor: 'pointer', transition: 'color 0.3s',
            fontWeight: 500
          }}
          onMouseEnter={(e) => e.target.style.color = '#cbd5e1'}
          onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
        >
          ← Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default MFAChallenge;

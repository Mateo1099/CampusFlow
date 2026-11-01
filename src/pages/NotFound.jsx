import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  const handleGoDashboard = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div
      role="main"
      className="not-found-page"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(circle at 50% 20%, rgba(188, 19, 254, 0.08), transparent 70%), var(--bg-primary, #050811)',
        color: 'var(--text-primary, #f5f5f7)',
        fontFamily: 'var(--font-body, Inter, sans-serif)',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Elementos decorativos Cyber Luxe */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '20%',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(0, 243, 255, 0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '20%',
          width: '360px',
          height: '360px',
          background: 'radial-gradient(circle, rgba(188, 19, 254, 0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      <div
        className="not-found-card glass-panel"
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '44px 36px',
          borderRadius: '28px',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* Glow badge & Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.15) 0%, rgba(188, 19, 254, 0.15) 100%)',
            border: '1px solid rgba(0, 243, 255, 0.35)',
            boxShadow: '0 0 32px rgba(0, 243, 255, 0.25), inset 0 0 15px rgba(188, 19, 254, 0.2)'
          }}
        >
          <Compass
            size={40}
            color="#00f3ff"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(0, 243, 255, 0.6))'
            }}
          />
        </div>

        {/* Indicador visual '404 - Página no encontrada' */}
        <div
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'rgba(0, 243, 255, 0.1)',
            border: '1px solid rgba(0, 243, 255, 0.25)',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#00f3ff',
            marginBottom: '16px'
          }}
        >
          404 - Página no encontrada
        </div>

        <h1
          style={{
            margin: '0 0 14px',
            fontSize: '2.4rem',
            fontWeight: 900,
            fontFamily: 'var(--font-display, Inter, sans-serif)',
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #ffffff 30%, rgba(255, 255, 255, 0.6) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Ruta no encontrada
        </h1>

        {/* Mensaje amigable */}
        <p
          style={{
            margin: '0 auto 32px',
            maxWidth: '420px',
            fontSize: '1rem',
            lineHeight: 1.6,
            color: 'rgba(255, 255, 255, 0.7)'
          }}
        >
          El enlace que buscas no existe o fue movido.
        </p>

        {/* Botones de acción */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={handleGoBack}
            className="btn-back-previous"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeft size={16} />
            Volver atrás
          </button>

          {/* Botón interactivo: "Volver al Dashboard" con navegación segura a '/' */}
          <button
            type="button"
            onClick={handleGoDashboard}
            className="btn-go-dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '14px',
              border: '1px solid rgba(0, 243, 255, 0.4)',
              background: 'linear-gradient(135deg, #00f3ff 0%, #bc13fe 100%)',
              color: '#050811',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0, 243, 255, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Home size={16} color="#050811" />
            Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

/**
 * Red de seguridad global: sin esto, cualquier excepción no controlada
 * durante el render de cualquier página deja al usuario con una pantalla
 * en blanco total, sin mensaje ni forma de recuperarse. Debe ser un
 * componente de clase porque los hooks de React (useState/useEffect) no
 * pueden implementar getDerivedStateFromError / componentDidCatch.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Se deja en consola para depuración; en un entorno con un servicio de
    // reporte de errores (Sentry, etc.) este es el punto donde se enviaría.
    console.error('[ErrorBoundary] Error no controlado:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'radial-gradient(circle at 50% 20%, rgba(0, 243, 255, 0.08), transparent 60%), #0a0a0f',
          fontFamily: "'Space Grotesk', sans-serif",
          zIndex: 999999
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            width: '100%',
            padding: '36px 32px',
            borderRadius: '20px',
            textAlign: 'center',
            background: 'linear-gradient(155deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 59, 48, 0.12)',
              border: '1px solid rgba(255, 59, 48, 0.35)',
              boxShadow: '0 0 30px rgba(255, 59, 48, 0.2)'
            }}
          >
            <AlertTriangle size={30} color="#ff3b30" strokeWidth={1.8} />
          </div>

          <p
            style={{
              margin: '0 0 6px',
              fontSize: '0.68rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 800,
              color: '#00f3ff'
            }}
          >
            CampusFlow
          </p>
          <h1
            style={{
              margin: '0 0 12px',
              fontSize: '1.3rem',
              fontWeight: 900,
              color: '#f5f5f7',
              letterSpacing: '-0.01em'
            }}
          >
            Algo salió mal
          </h1>
          <p
            style={{
              margin: '0 0 28px',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              color: 'rgba(245, 245, 247, 0.65)'
            }}
          >
            Ocurrió un error inesperado en esta pantalla. Tu información no se
            perdió; recargar la página suele resolverlo.
          </p>

          <button
            type="button"
            onClick={this.handleReload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 28px',
              borderRadius: '999px',
              border: '1px solid rgba(0, 243, 255, 0.4)',
              background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.18), rgba(0, 243, 255, 0.06))',
              color: '#00f3ff',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0, 243, 255, 0.15)'
            }}
          >
            <RefreshCcw size={16} />
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

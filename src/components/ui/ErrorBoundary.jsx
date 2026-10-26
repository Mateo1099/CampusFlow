import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { safeDevLog } from '../../lib/authSecurity';


/**
 * Global and resilient ErrorBoundary for CampusFlow.
 * Catches unhandled runtime exceptions in React component trees, prevents white screens,
 * logs sanitized diagnostics via safeDevLog, and offers glassmorphic recovery actions.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.setState === 'function') {
      try {
        this.setState({ errorInfo });
      } catch {
        // Ignorar si el componente se ejecuta en runner no montado
      }
    }

    // Registro seguro sin exponer tokens ni credenciales
    safeDevLog('error', '[ErrorBoundary] Excepción no controlada en renderizado:', {
      message: error?.message || 'Error desconocido',
      stackSummary: errorInfo?.componentStack ? errorInfo.componentStack.slice(0, 300) : undefined
    });

    try {
      if (typeof Sentry !== 'undefined' && typeof Sentry.captureException === 'function') {
        Sentry.captureException(error, {
          extra: {
            componentStack: errorInfo?.componentStack ? errorInfo.componentStack.slice(0, 300) : undefined
          }
        });
      }
    } catch {
      // Ignorar si Sentry no está inicializado o en entorno mock de test
    }


    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerErr) {
        safeDevLog('warn', '[ErrorBoundary] Excepción en prop onError:', {
          message: handlerErr?.message
        });
      }
    }
  }

  handleRetry = () => {
    if (typeof this.props.onReset === 'function') {
      try {
        this.props.onReset();
      } catch (resetErr) {
        safeDevLog('warn', '[ErrorBoundary] Excepción en prop onReset:', {
          message: resetErr?.message
        });
      }
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoDashboard = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/' || window.location.pathname === '') {
        window.location.reload();
      } else {
        window.location.href = '/';
      }
    }
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // Permite renderizado de fallback personalizado si fue inyectado por props
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback({
          error,
          resetErrorBoundary: this.handleRetry
        });
      }
      return fallback;
    }

    const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="error-boundary-screen"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'radial-gradient(circle at 50% 25%, var(--orb1, rgba(0, 243, 255, 0.08)), transparent 60%), var(--bg-primary, #0a0a0f)',
          color: 'var(--text-primary, #f5f5f7)',
          fontFamily: 'var(--font-body, Inter, sans-serif)',
          overflowY: 'auto'
        }}
      >
        <div
          className="error-boundary-glass-card"
          style={{
            maxWidth: '520px',
            width: '100%',
            padding: '36px 32px',
            borderRadius: '24px',
            textAlign: 'center',
            background: 'var(--bg-panel, rgba(15, 17, 26, 0.85))',
            border: '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.12))',
            boxShadow: 'var(--shadow-glass, 0 32px 64px rgba(0, 0, 0, 0.5)), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            position: 'relative',
            margin: 'auto'
          }}
        >
          {/* Indicador de escudo y alerta */}
          <div
            style={{
              width: '68px',
              height: '68px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 59, 48, 0.12)',
              border: '1px solid rgba(255, 59, 48, 0.35)',
              boxShadow: '0 0 28px rgba(255, 59, 48, 0.25)'
            }}
          >
            <AlertTriangle
              size={32}
              color="var(--accent-danger, #ff3b30)"
              strokeWidth={2}
            />
          </div>

          <p
            style={{
              margin: '0 0 8px',
              fontSize: '0.72rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 800,
              color: 'var(--accent-primary, #00f3ff)'
            }}
          >
            CampusFlow • Resiliencia de Sistema
          </p>

          <h1
            id="error-boundary-title"
            style={{
              margin: '0 0 12px',
              fontSize: '1.45rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display, Inter, sans-serif)',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary, #f5f5f7)'
            }}
          >
            Algo no salió como esperábamos
          </h1>

          <p
            id="error-boundary-desc"
            style={{
              margin: '0 0 24px',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              color: 'var(--text-secondary, #a1a1aa)'
            }}
          >
            Ocurrió una interrupción al renderizar esta vista. Tus materias, tareas
            y notas están a salvo. Puedes reintentar la operación o volver de forma segura al inicio.
          </p>

          {/* Diagnóstico técnico seguro visible sólo en desarrollo */}
          {isDev && error?.message && (
            <details
              style={{
                textAlign: 'left',
                margin: '0 0 24px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'var(--bg-glass, rgba(255, 255, 255, 0.04))',
                border: '1px solid var(--border-glass-side, rgba(255, 255, 255, 0.06))',
                fontSize: '0.78rem'
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--text-secondary, #a1a1aa)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ShieldAlert size={14} color="var(--accent-primary, #00f3ff)" />
                Diagnóstico de desarrollo (Seguro)
              </summary>
              <div
                style={{
                  marginTop: '10px',
                  color: 'var(--accent-danger, #ff3b30)',
                  fontFamily: 'monospace',
                  wordBreak: 'break-word',
                  whiteHeight: 'normal'
                }}
              >
                {String(error.message)}
              </div>
            </details>
          )}

          {/* Botones de acción y recuperación */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center'
            }}
          >
            <button
              type="button"
              onClick={this.handleRetry}
              className="btn-retry-render"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px',
                borderRadius: '14px',
                border: '1px solid var(--border-glass-top, rgba(255, 255, 255, 0.15))',
                background: 'var(--bg-glass, rgba(255, 255, 255, 0.06))',
                color: 'var(--text-primary, #f5f5f7)',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast, 0.2s ease)'
              }}
            >
              <RefreshCw size={16} />
              Reintentar renderizado
            </button>

            <button
              type="button"
              onClick={this.handleGoDashboard}
              className="btn-go-dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '14px',
                border: '1px solid transparent',
                background: 'linear-gradient(135deg, var(--accent-primary, #00f3ff) 0%, var(--accent-secondary, #bc13fe) 100%)',
                color: '#0a0a0f',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0, 243, 255, 0.25)',
                transition: 'all var(--transition-fast, 0.2s ease)'
              }}
            >
              <Home size={16} />
              Volver al Dashboard seguro
            </button>
          </div>
        </div>
      </div>
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  onReset: PropTypes.func,
  onError: PropTypes.func
};

export default ErrorBoundary;

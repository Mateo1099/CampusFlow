import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LoadingGlass from './components/ui/LoadingGlass';
import AppTransitionWrapper from './components/ui/AppTransitionWrapper';
import ReloadPrompt from './components/ui/ReloadPrompt';
import * as Sentry from '@sentry/react';
import SentryErrorFallback from './components/ui/SentryErrorFallback';
import { usePrefetchRoutes } from './hooks/usePrefetchRoutes';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import { Toaster } from 'sonner';

// Lazy-loaded pages for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Agenda = React.lazy(() => import('./pages/Agenda'));
const TaskBoard = React.lazy(() => import('./pages/TaskBoard'));
const WeeklyPlanner = React.lazy(() => import('./pages/WeeklyPlanner'));
const Pomodoro = React.lazy(() => import('./pages/Pomodoro'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Stats = React.lazy(() => import('./pages/Stats'));
const Notes = React.lazy(() => import('./pages/Notes'));

const Login = React.lazy(() => import('./pages/Login'));
const MFAChallenge = React.lazy(() => import('./pages/MFAChallenge'));

import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { TaskProvider } from './context/TaskContext';
import { GamificationProvider } from './context/GamificationContext';
import { supabase } from './lib/supabaseClient';

import { safeDevLog } from './lib/authSecurity';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, aal, mfaRequired, loading } = useAuth();
  const [directCheck, setDirectCheck] = React.useState({ status: 'pending', hasTotp: null });

  React.useEffect(() => {
    if (mfaRequired && aal !== 'aal2' && !loading) {
      supabase.auth.mfa.listFactors().then(({ data: factorsData, error: factorsError }) => {
        if (!factorsError && factorsData) {
          const totpFactors = factorsData.totp || [];
          const hasVerifiedTotp = totpFactors.some(f => f.status === 'verified');
          safeDevLog('info', `[ROUTE-PROTECTED] TOTP factors: ${totpFactors.length}, hasVerified: ${hasVerifiedTotp}`);
          setDirectCheck({ status: 'done', hasTotp: hasVerifiedTotp });
        } else {
          safeDevLog('warn', '[ROUTE-PROTECTED] Error listing factors', { message: factorsError?.message });
          setDirectCheck({ status: 'error', hasTotp: null });
        }
      }).catch((err) => {
        safeDevLog('warn', '[ROUTE-PROTECTED] Exception listing factors', { message: err?.message });
        setDirectCheck({ status: 'error', hasTotp: null });
      });
    }
  }, [mfaRequired, aal, loading]);

  if (loading) {
    return <LoadingGlass message="Verificando sesión..." />;
  }

  if (!isAuthenticated) {
    safeDevLog('info', '[ROUTE-PROTECTED] Redirigiendo a /login - no autenticado');
    return <Navigate to="/login" replace />;
  }

  // Principio Fail-Secure: si MFA es requerido y aún no está en AAL2, proteger el contenido
  if (mfaRequired && aal !== 'aal2') {
    if (directCheck.status === 'done') {
      if (!directCheck.hasTotp) {
        safeDevLog('info', '[ROUTE-PROTECTED] Sin factores TOTP activos, permitiendo acceso');
        return children;
      }
      safeDevLog('info', '[ROUTE-PROTECTED] Factores TOTP detectados, redirigiendo a /mfa-challenge');
      return <Navigate to="/mfa-challenge" replace />;
    }
    // Mientras se valida criptográficamente, se muestra estado de carga seguro (no fail-open)
    return <LoadingGlass message="Comprobando seguridad de acceso..." />;
  }

  return children;
};

// Componente para proteger /login: redirige a / si ya está autenticado con AAL2 o sin MFA
const LoginRoute = ({ children }) => {
  const { isAuthenticated, aal, mfaRequired, loading } = useAuth();

  // Si hay parámetros OAuth en la URL, mostrar pantalla de carga mientras Supabase procesa el token
  const hasOAuthParams = typeof window !== 'undefined' && (
    window.location.hash.includes('access_token=') ||
    window.location.hash.includes('refresh_token=') ||
    window.location.search.includes('code=')
  );

  if (loading && hasOAuthParams) {
    return <LoadingGlass />;
  }

  if (isAuthenticated && (aal === 'aal2' || !mfaRequired)) {
    safeDevLog('info', '[ROUTE-LOGIN] Usuario ya autenticado, redirigiendo a /');
    return <Navigate to="/" replace />;
  }

  return children;
};

// Componente para proteger /mfa-challenge: redirige a / si ya completó MFA o si no hay MFA activo
const MFARoute = ({ children }) => {
  const { isAuthenticated, aal } = useAuth();
  const [directCheck, setDirectCheck] = React.useState({ status: 'pending', hasTotp: null });

  React.useEffect(() => {
    if (isAuthenticated && aal !== 'aal2') {
      supabase.auth.mfa.listFactors().then(({ data: factorsData, error: factorsError }) => {
        if (!factorsError && factorsData) {
          const totpFactors = factorsData.totp || [];
          const hasVerifiedTotp = totpFactors.some(f => f.status === 'verified');
          setDirectCheck({ status: 'done', hasTotp: hasVerifiedTotp });
        } else {
          setDirectCheck({ status: 'error', hasTotp: false });
        }
      }).catch(() => {
        setDirectCheck({ status: 'error', hasTotp: false });
      });
    }
  }, [isAuthenticated, aal]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && aal === 'aal2') {
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated && directCheck.status === 'done' && !directCheck.hasTotp) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  const perfLog = React.useCallback((event, payload = {}) => {
    const ts = performance.now();
    const entry = {
      event,
      ts,
      ...payload
    };

    if (typeof window !== 'undefined') {
      window.__CF_PERF_LOGS = window.__CF_PERF_LOGS || [];
      window.__CF_PERF_LOGS.push(entry);
    }

    console.log('[PERF]', entry);
  }, []);

  console.log('[APP-ROUTES]', { authLoading });

  // Enable intelligent prefetching of heavy routes after authentication
  usePrefetchRoutes(isAuthenticated, user?.id);

  React.useEffect(() => {
    const onClickCapture = (event) => {
      const element = event.target instanceof Element ? event.target.closest('a[href], [data-nav-target]') : null;
      if (!element) return;

      const rawHref = element.getAttribute('href') || element.getAttribute('data-nav-target');
      if (!rawHref) return;

      let targetPath = rawHref;
      if (rawHref.startsWith('http')) {
        try {
          targetPath = new URL(rawHref).pathname;
        } catch {
          return;
        }
      }

      if (!targetPath.startsWith('/')) return;

      if (!['/tasks', '/planner', '/stats'].includes(targetPath)) return;

      const navStart = {
        from: location.pathname,
        to: targetPath,
        ts: performance.now()
      };

      window.__CF_NAV_START = navStart;
      perfLog('route_click_start', navStart);
    };

    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [location.pathname, perfLog]);

  React.useEffect(() => {
    const navStart = typeof window !== 'undefined' ? window.__CF_NAV_START : null;
    const now = performance.now();

    if (navStart && navStart.to === location.pathname) {
      perfLog('route_mount_commit', {
        from: navStart.from,
        to: location.pathname,
        durationMs: Number((now - navStart.ts).toFixed(2))
      });
      return;
    }

    perfLog('route_mount_commit', {
      to: location.pathname,
      durationMs: null
    });
  }, [location.pathname, perfLog]);

  // Si está autenticando/sincronizando y no estamos en /login, mostrar pantalla de carga
  if (authLoading && location.pathname !== '/login') {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--accent-primary)' }}>
        <div className="animate-pulse font-display" style={{ fontSize: '1.5rem', letterSpacing: '0.2em' }}>CAMPUSFLOW_SYNCING...</div>
      </div>
    );
  }

  console.log('[APP-ROUTES] ✅ Loading completado, renderizando rutas');
  return (
    <AppTransitionWrapper>
      <Suspense fallback={<LoadingGlass />}>
        <Routes>
          <Route path="/login" element={<LoginRoute><Login /></LoginRoute>} />
          <Route path="/mfa-challenge" element={<MFARoute><MFAChallenge /></MFARoute>} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Suspense fallback={<LoadingGlass />}><Dashboard /></Suspense>} />
            <Route path="agenda" element={<Suspense fallback={<LoadingGlass />}><Agenda /></Suspense>} />
            <Route path="apuntes" element={<Suspense fallback={<LoadingGlass />}><Notes /></Suspense>} />
            <Route path="notes" element={<Navigate to="/apuntes" replace />} />
            <Route path="tasks" element={<Suspense fallback={<LoadingGlass />}><TaskBoard /></Suspense>} />
            <Route path="trabajos" element={<Navigate to="/tasks" replace />} />
            <Route path="planner" element={<Suspense fallback={<LoadingGlass />}><WeeklyPlanner /></Suspense>} />
            <Route path="calendar" element={<Navigate to="/planner" replace />} />
            <Route path="calendario" element={<Navigate to="/planner" replace />} />
            <Route path="pomodoro" element={<Suspense fallback={<LoadingGlass />}><Pomodoro /></Suspense>} />
            <Route path="study" element={<Suspense fallback={<LoadingGlass />}><Pomodoro /></Suspense>} />
            <Route path="estudio" element={<Navigate to="/pomodoro" replace />} />
            <Route path="profile" element={<Suspense fallback={<LoadingGlass />}><Profile /></Suspense>} />
            <Route path="stats" element={<Suspense fallback={<LoadingGlass />}><Stats /></Suspense>} />

          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppTransitionWrapper>
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary fallback={({ error, resetError, eventId }) => (
      <SentryErrorFallback error={error} resetError={resetError} eventId={eventId} />
    )}>
      <AuthProvider>
        <SettingsProvider>
          <TaskProvider>
            <GamificationProvider>
              <BrowserRouter>
                <Toaster 
                  visibleToasts={1}
                  position="bottom-right" 
                  theme="dark" 
                  duration={2500}
                  toastOptions={{
                    className: 'rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 font-body text-white font-semibold',
                    descriptionClassName: 'text-slate-300 font-normal',
                    style: {
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      color: '#ffffff',
                      padding: '16px 20px',
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                    }
                  }}
                />
                <AppRoutes />
                <ReloadPrompt />
                <Analytics />
                <SpeedInsights />
              </BrowserRouter>
            </GamificationProvider>
          </TaskProvider>
        </SettingsProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}


export default App;


import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import TaskBoard from './pages/TaskBoard';
import WeeklyPlanner from './pages/WeeklyPlanner';
import Pomodoro from './pages/Pomodoro';
import Profile from './pages/Profile';
import Stats from './pages/Stats';
import Login from './pages/Login';
import MFAChallenge from './pages/MFAChallenge';

import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { TaskProvider, useTasksContext } from './context/TaskContext';
import { supabase } from './lib/supabaseClient';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, aal, mfaRequired, loading } = useAuth();

  console.log('[ROUTE-PROTECTED] Check Protegido:', { isAuthenticated, aal, mfaRequired, loading, 'needsMFA': mfaRequired && aal !== 'aal2' });

  // Si no está autenticado, ir a login
  if (!isAuthenticated) {
    console.log('[ROUTE-PROTECTED] Redirigiendo a /login - no autenticado');
    return <Navigate to="/login" replace />;
  }

  // 💡 VERIFICACIÓN DIRECTA: Si MFA parece requerido pero no está en AAL2,
  // verificar factores reales de Supabase antes de redirigir
  // Esto evita redirects incorrectos cuando mfaRequired está stale
  const [directCheck, setDirectCheck] = React.useState({ status: 'pending', hasTotp: null });

  React.useEffect(() => {
    if (mfaRequired && aal !== 'aal2' && !loading) {
      // Verificación directa de factores MFA en Supabase Auth
      supabase.auth.mfa.listFactors().then(({ data: factorsData, error: factorsError }) => {
        if (!factorsError && factorsData) {
          const totpFactors = factorsData.totp || [];
          const hasVerifiedTotp = totpFactors.some(f => f.status === 'verified');
          console.log(`[ROUTE-PROTECTED] Direct check: ${totpFactors.length} TOTP factors, hasVerified=${hasVerifiedTotp}`);
          setDirectCheck({ status: 'done', hasTotp: hasVerifiedTotp });
        } else {
          console.warn('[ROUTE-PROTECTED] Error listing factors:', factorsError?.message);
          setDirectCheck({ status: 'error', hasTotp: null });
        }
      }).catch((err) => {
        console.error('[ROUTE-PROTECTED] Exception listing factors:', err);
        setDirectCheck({ status: 'error', hasTotp: null });
      });
    }
  }, [mfaRequired, aal, loading]);

  // Si la verificación directa muestra que NO hay TOTP, permitir acceso
  if (mfaRequired && aal !== 'aal2' && !loading) {
    if (directCheck.status === 'done') {
      if (!directCheck.hasTotp) {
        console.log('[ROUTE-PROTECTED] ✅ Direct check: no TOTP factors, allowing access');
        return children;
      } else {
        console.log('[ROUTE-PROTECTED] Direct check: TOTP factors found, redirecting to /mfa-challenge');
        return <Navigate to="/mfa-challenge" replace />;
      }
    }
    // Mientras se verifica, permitir acceso temporalmente
    console.log('[ROUTE-PROTECTED] Verifying factors, allowing temporary access');
    return children;
  }

  // Si está autenticado (con o sin MFA), permitir acceso
  console.log('[ROUTE-PROTECTED] ✅ Permitiendo acceso al usuario (aal:', aal, ', loading:', loading, ')');
  return children;
};

// Componente para proteger /login: redirige a / si ya está autenticado con AAL2
const LoginRoute = ({ children }) => {
  const { isAuthenticated, aal, mfaRequired } = useAuth();
  
  console.log('[ROUTE-LOGIN]', { isAuthenticated, aal, mfaRequired });
  
  // Si está autenticado con AAL2 (o sin MFA requerido), redirige al Dashboard
  if (isAuthenticated && (aal === 'aal2' || !mfaRequired)) {
    console.log('[ROUTE-LOGIN] Usuario ya autenticado, redirigiendo a /');
    return <Navigate to="/" replace />;
  }
  
  console.log('[ROUTE-LOGIN] Permitiendo acceso al login');
  return children;
};

// Componente para proteger /mfa-challenge: redirige a / si ya completó MFA o si no hay MFA activo
const MFARoute = ({ children }) => {
  const { isAuthenticated, aal, mfaRequired } = useAuth();
  const [directCheck, setDirectCheck] = React.useState({ status: 'pending', hasTotp: null });

  console.log('[ROUTE-MFA]', { isAuthenticated, aal, mfaRequired });

  // Verificación directa de factores MFA reales
  React.useEffect(() => {
    if (isAuthenticated && aal !== 'aal2') {
      supabase.auth.mfa.listFactors().then(({ data: factorsData, error: factorsError }) => {
        if (!factorsError && factorsData) {
          const totpFactors = factorsData.totp || [];
          const hasVerifiedTotp = totpFactors.some(f => f.status === 'verified');
          console.log(`[ROUTE-MFA] Direct check: ${totpFactors.length} TOTP factors, hasVerified=${hasVerifiedTotp}`);
          setDirectCheck({ status: 'done', hasTotp: hasVerifiedTotp });
        } else {
          console.warn('[ROUTE-MFA] Error listing factors:', factorsError?.message);
          setDirectCheck({ status: 'error', hasTotp: false });
        }
      }).catch((err) => {
        console.error('[ROUTE-MFA] Exception listing factors:', err);
        setDirectCheck({ status: 'error', hasTotp: false });
      });
    }
  }, [isAuthenticated, aal]);

  // Si está autenticado con AAL2, ya completó MFA
  if (isAuthenticated && aal === 'aal2') {
    console.log('[ROUTE-MFA] MFA ya completado (AAL2), redirigiendo a /');
    return <Navigate to="/" replace />;
  }

  // Si la verificación directa muestra que NO hay TOTP activo, NO tiene sentido estar aquí
  if (isAuthenticated && directCheck.status === 'done' && !directCheck.hasTotp) {
    console.log('[ROUTE-MFA] No hay factores TOTP activos, redirigiendo a /');
    return <Navigate to="/" replace />;
  }

  // Si no está autenticado, ir a login
  if (!isAuthenticated) {
    console.log('[ROUTE-MFA] No autenticado, redirigiendo a /login');
    return <Navigate to="/login" replace />;
  }

  console.log('[ROUTE-MFA] Permitiendo acceso al MFA challenge');
  return children;
};

function AppRoutes() {
  const { loading: authLoading } = useAuth();
  const [loading, setLoading] = React.useState(authLoading);

  console.log('[APP-ROUTES]', { authLoading, componentLoading: loading });

  // Timeout de seguridad: después de 5 segundos, forzar loading = false
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('[APP-ROUTES] ⚠️ TIMEOUT: Loading sigue true después de 5s, forzando false');
        setLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Actualizar cuando authLoading cambia
  React.useEffect(() => {
    setLoading(authLoading);
  }, [authLoading]);

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--accent-primary)' }}>
        <div className="animate-pulse font-display" style={{ fontSize: '1.5rem', letterSpacing: '0.2em' }}>CAMPUSFLOW_SYNCING...</div>
      </div>
    );
  }

  console.log('[APP-ROUTES] ✅ Loading completado, renderizando rutas');
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute><Login /></LoginRoute>} />
      <Route path="/mfa-challenge" element={<MFARoute><MFAChallenge /></MFARoute>} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="tasks" element={<TaskBoard />} />
        <Route path="planner" element={<WeeklyPlanner />} />
        <Route path="pomodoro" element={<Pomodoro />} />
        <Route path="profile" element={<Profile />} />
        <Route path="stats" element={<Stats />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <TaskProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TaskProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;

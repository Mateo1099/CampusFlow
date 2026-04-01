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

import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { TaskProvider, useTasksContext } from './context/TaskContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--accent-primary)' }}>
        <div className="animate-pulse font-display" style={{ fontSize: '1.5rem', letterSpacing: '0.2em' }}>CAMPUSFLOW_SYNCING...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

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

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/global.css';

import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import VolunteersPage from './pages/VolunteersPage';
import VolunteerProfilePage from './pages/VolunteerProfilePage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import SessionPlannerPage from './pages/SessionPlannerPage';
import { MySchedulePage, NotificationsPage } from './pages/MySchedulePage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--ink-soft)' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="teams" element={<ProtectedRoute roles={['super_admin','ministry_admin','team_leader']}><TeamsPage /></ProtectedRoute>} />
        <Route path="teams/:id" element={<ProtectedRoute roles={['super_admin','ministry_admin','team_leader']}><TeamDetailPage /></ProtectedRoute>} />
        <Route path="volunteers" element={<ProtectedRoute roles={['super_admin','ministry_admin','team_leader']}><VolunteersPage /></ProtectedRoute>} />
        <Route path="volunteers/:id" element={<ProtectedRoute roles={['super_admin','ministry_admin','team_leader']}><VolunteerProfilePage /></ProtectedRoute>} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="sessions/:id" element={<SessionPlannerPage />} />
        <Route path="my-schedule" element={<MySchedulePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const getInitials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const formatRole = (role) => ({ super_admin: 'Super Admin', ministry_admin: 'Ministry Admin', team_leader: 'Team Leader', volunteer: 'Volunteer' }[role] || role);

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = ['super_admin', 'ministry_admin', 'team_leader'].includes(user?.role);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="wordmark">Serve</span>
          <span className="sub">Volunteer Platform</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({isActive}) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="icon">⬛</span> Dashboard
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-section-label">Ministry</div>
              <NavLink to="/teams" className={({isActive}) => `nav-link${isActive ? ' active' : ''}`}>
                <span className="icon">👥</span> Teams
              </NavLink>
              <NavLink to="/volunteers" className={({isActive}) => `nav-link${isActive ? ' active' : ''}`}>
                <span className="icon">🙋</span> Volunteers
              </NavLink>
            </>
          )}

          <div className="nav-section-label">Services</div>
          <NavLink to="/events" className={({isActive}) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="icon">📅</span> Events
          </NavLink>

          {!isAdmin && (
            <NavLink to="/my-schedule" className={({isActive}) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="icon">📋</span> My Schedule
            </NavLink>
          )}

          <div className="nav-section-label">Account</div>
          <NavLink to="/notifications" className={({isActive}) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="icon">🔔</span> Notifications
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{getInitials(user?.name)}</div>
            <div className="info">
              <div className="name">{user?.preferred_name || user?.name?.split(' ')[0]}</div>
              <div className="role">{formatRole(user?.role)}</div>
            </div>
            <span className="logout" onClick={handleLogout} title="Sign out">→</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

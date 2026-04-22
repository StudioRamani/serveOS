import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--surface-2)' }}>
      {/* Left panel */}
      <div style={{ width: '420px', background: 'var(--brand)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '42px', color: '#fff', lineHeight: 1, marginBottom: '12px' }}>Serve</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '40px' }}>Volunteer Platform</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', lineHeight: 1.7 }}>
          Plan services, schedule volunteers, and keep your ministry running smoothly.
        </div>
        <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            ['👥', 'Multi-team management'],
            ['📅', 'Session planning & flow'],
            ['✅', 'Accept / decline workflow'],
            ['📊', 'Dashboards & reports'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.55)', fontSize: '13.5px' }}>
              <span style={{ fontSize: '16px' }}>{icon}</span> {text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Sign in</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '32px', fontSize: '14px' }}>Use your credentials to access the platform.</p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '13.5px' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@church.org" required />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '8px', padding: '11px 16px', fontSize: '14px', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: '40px', padding: '16px', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', color: 'var(--ink-soft)' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--ink-mid)' }}>Demo credentials</div>
            <div>Admin: <strong>admin@church.org</strong></div>
            <div>Leader: <strong>sarah@church.org</strong></div>
            <div>Volunteer: <strong>john@church.org</strong></div>
            <div style={{ marginTop: '4px' }}>Password: <strong>password123</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

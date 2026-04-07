// View: Login page — UI only, logic via useAuthViewModel
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthViewModel();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const data = await login(username, password);
    if (data.success) {
      onLogin(true);
      navigate('/admin');
    } else {
      setError(data.message || 'Invalid username or password');
    }
  };

  return (
    <div className="web-login-container">
      <div className="login-brand-side">
        <div className="brand-overlay"></div>
        <div className="brand-content">
          <div className="icon-box-md" style={{ width: '100px', height: '100px', borderRadius: '24px', marginBottom: '2rem' }}>
            <img src="/logo.ico" alt="DOrSU Logo" style={{ width: '70px' }} />
          </div>
          <h2>DOrSU FixHub</h2>
          <p>The official Maintenance Reporting &amp; Campus Innovation Tracker for Davao Oriental State University.</p>
          <div className="login-feature-list">
            <div className="login-feature-item">
              <ShieldCheck size={20} />
              <span>Secure Administrative Access</span>
            </div>
            <div className="login-feature-item">
              <User size={20} />
              <span>Real-time Maintenance Monitoring</span>
            </div>
          </div>
        </div>
        <div className="brand-footer">
            © 2026 Davao Oriental State University
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-form-box">
          <div className="login-form-header">
            <h2>Admin Login</h2>
            <p>Enter your authorized credentials to access the management dashboard.</p>
          </div>

          {error && <div className="error-text" style={{ marginBottom: '1.5rem' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. admin_user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary full-width" style={{ marginTop: '1.5rem', padding: '1.2rem' }}>
              Sign In to Dashboard
            </button>
          </form>

          <div className="login-help">
            <p>Forgot password? Contact IT Support Office.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

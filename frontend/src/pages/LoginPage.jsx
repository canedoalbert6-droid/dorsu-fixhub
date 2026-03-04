import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const API_URL = `http://${window.location.hostname}:5000/api`;
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      if (res.data.success) {
        localStorage.setItem('adminToken', res.data.token);
        onLogin(true);
        navigate('/admin');
      }
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="web-login-container">
      {/* Left Side: Branding/Welcome */}
      <div className="login-brand-side">
        <div className="brand-overlay"></div>
        <div className="brand-content">
          <div className="icon-box-md" style={{ width: '100px', height: '100px', borderRadius: '24px', marginBottom: '2rem' }}>
            <img src="/logo.ico" alt="DOrSU Logo" style={{ width: '70px' }} />
          </div>
          <h2>DOrSU FixHub</h2>
          <p>The official Maintenance Reporting & Campus Innovation Tracker for Davao Oriental State University.</p>
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

      {/* Right Side: Login Form */}
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
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input 
                  type="password" 
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';

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
    <div className="card max-w-400" style={{ marginTop: '10vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(15, 118, 110, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--primary)' }}>
          <Lock size={30} style={{ margin: 'auto' }} />
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>Admin Access</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Please enter your credentials to continue.</p>
      </div>

      {error && <div className="error-text" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} /> Username
          </label>
          <input 
            type="text" 
            className="form-control"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} /> Password
          </label>
          <input 
            type="password" 
            className="form-control"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary full-width" style={{ marginTop: '1rem' }}>
          Sign In
        </button>
      </form>
    </div>
  );
};

export default LoginPage;

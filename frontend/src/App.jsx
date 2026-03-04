import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import ReportingPage from './pages/ReportingPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import QRGenerator from './pages/QRGenerator';
import { LogOut, LayoutDashboard, QrCode } from 'lucide-react';
import './App.css';

const AdminLayout = ({ children, onLogout }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`admin-page-container ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar for Desktop */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
           <button onClick={() => setIsCollapsed(!isCollapsed)} className="btn-toggle">
              {isCollapsed ? <LayoutDashboard size={20} /> : 'Collapse <<'}
           </button>
        </div>
        <nav className="sidebar-links">
          <Link to="/admin" className={`admin-sidebar-link ${location.pathname === '/admin' ? 'active' : ''}`} title="Dashboard">
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </Link>
          <Link to="/qr-gen" className={`admin-sidebar-link ${location.pathname === '/qr-gen' ? 'active' : ''}`} title="QR Generator">
            <QrCode size={20} /> <span>QR Generator</span>
          </Link>
          <button onClick={onLogout} className="admin-sidebar-link" title="Logout" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <LogOut size={20} /> <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main-content">
        {children}
      </main>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) setIsAuthenticated(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="app-container">
        <header className="header">
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/logo.ico" alt="DOrSU Logo" style={{ width: '50px', height: '50px', background: '#fff', borderRadius: '50%', padding: '2px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }} />
            <div>
              <h1>DOrSU FixHub</h1>
              <p>Maintenance Reporting & Innovation</p>
            </div>
          </div>
          
          {/* Top header navigation only for Mobile/Small Screens */}
          {isAuthenticated && (
            <nav className="admin-nav mobile-only">
              <Link to="/admin"><LayoutDashboard size={20} /></Link>
              <Link to="/qr-gen"><QrCode size={20} /></Link>
              <button onClick={handleLogout} className="btn-logout"><LogOut size={20} /></button>
            </nav>
          )}
        </header>

        <Routes>
          {/* Public Reporting Route - Wrapped in main-content for centering */}
          <Route path="/" element={<main className="main-content"><ReportingPage /></main>} />
          
          {/* Login Page */}
          <Route path="/login" element={<main className="main-content"><LoginPage onLogin={setIsAuthenticated} /></main>} />

          {/* Protected Admin Routes - Wrapped in AdminLayout for Sidebar */}
          <Route 
            path="/admin" 
            element={
              isAuthenticated ? (
                <AdminLayout onLogout={handleLogout}>
                  <AdminDashboard />
                </AdminLayout>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/qr-gen" 
            element={
              isAuthenticated ? (
                <AdminLayout onLogout={handleLogout}>
                  <QRGenerator />
                </AdminLayout>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

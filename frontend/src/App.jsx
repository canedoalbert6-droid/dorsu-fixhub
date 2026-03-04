import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
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
      <aside className="admin-sidebar">
        <div className="sidebar-header">
           <button onClick={() => setIsCollapsed(!isCollapsed)} className="btn-toggle">
              {isCollapsed ? <LayoutDashboard size={20} /> : 'Collapse <<'}
           </button>
        </div>
        <nav className="sidebar-links">
          <Link to="/admin" className={`admin-sidebar-link ${location.pathname === '/admin' ? 'active' : ''}`} title="Dashboard">
            <div className="icon-box-sm"><LayoutDashboard size={18} /></div> <span>Dashboard</span>
          </Link>
          <Link to="/qr-gen" className={`admin-sidebar-link ${location.pathname === '/qr-gen' ? 'active' : ''}`} title="QR Generator">
            <div className="icon-box-sm icon-gold"><QrCode size={18} /></div> <span>QR Generator</span>
          </Link>
          <button onClick={onLogout} className="admin-sidebar-link" title="Logout" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <div className="icon-box-sm icon-red"><LogOut size={18} /></div> <span>Logout</span>
          </button>
        </nav>
      </aside>
      <main className="admin-main-content">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// AnimatedRoutes component to handle location-based transitions
const AnimatedRoutes = ({ isAuthenticated, onLogin, onLogout }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<main className="main-content"><PageWrapper><ReportingPage /></PageWrapper></main>} />
        <Route path="/login" element={<PageWrapper><LoginPage onLogin={onLogin} /></PageWrapper>} />
        <Route 
          path="/admin" 
          element={
            isAuthenticated ? (
              <AdminLayout onLogout={onLogout}>
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
              <AdminLayout onLogout={onLogout}>
                <QRGenerator />
              </AdminLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </AnimatePresence>
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
        <Toaster position="top-right" reverseOrder={false} />
        <header className="header">
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/logo.ico" alt="DOrSU Logo" style={{ width: '50px', height: '50px', background: '#fff', borderRadius: '50%', padding: '2px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }} />
            <div>
              <h1>DOrSU FixHub</h1>
              <p>Maintenance Reporting & Innovation</p>
            </div>
          </div>
          
          {isAuthenticated && (
            <nav className="admin-nav">
              <Link to="/admin" title="Dashboard"><LayoutDashboard size={20} /></Link>
              <Link to="/qr-gen" title="Generate QR Codes"><QrCode size={20} /></Link>
              <button onClick={handleLogout} className="btn-logout" title="Logout"><LogOut size={20} /></button>
            </nav>
          )}
        </header>

        <AnimatedRoutes 
          isAuthenticated={isAuthenticated} 
          onLogin={setIsAuthenticated} 
          onLogout={handleLogout} 
        />
      </div>
    </Router>
  );
}

export default App;

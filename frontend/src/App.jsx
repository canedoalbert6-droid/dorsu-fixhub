import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import ReportingPage from './pages/ReportingPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import QRGenerator from './pages/QRGenerator';
import TrackingPage from './pages/TrackingPage';
import PublicStatusPage from './pages/PublicStatusPage';
import { LogOut, LayoutDashboard, QrCode, Search, Globe, Moon, Sun, Bell, Menu, User, Settings, X } from 'lucide-react';
import { useAuthViewModel } from './viewmodels/useAuthViewModel';
import { formatActivityTime } from './utils/time';
import { io } from 'socket.io-client';
import { SOCKET_URL } from './utils/config';
import { getUserId, getRole } from './models/authModel';
import './App.css';

const AdminLayout = ({ children, onLogout }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className={`mobile-overlay ${mobileOpen ? 'active' : ''}`} onClick={() => setMobileOpen(false)} />
      <div className={`admin-page-container ${isCollapsed ? 'collapsed' : ''}`}>
        <aside className={`admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
             <button onClick={() => { setIsCollapsed(!isCollapsed); setMobileOpen(false); }} className="btn-toggle">
                {isCollapsed ? <LayoutDashboard size={20} /> : 'Collapse <<'}
             </button>
          </div>
          <nav className="sidebar-links">
            <Link to="/admin" className={`admin-sidebar-link ${location.pathname === '/admin' ? 'active' : ''}`} onClick={() => setMobileOpen(false)} title="Dashboard">
              <div className="icon-box-sm"><LayoutDashboard size={18} /></div> <span>Dashboard</span>
            </Link>
            <Link to="/qr-gen" className={`admin-sidebar-link ${location.pathname === '/qr-gen' ? 'active' : ''}`} onClick={() => setMobileOpen(false)} title="QR Generator">
              <div className="icon-box-sm icon-gold"><QrCode size={18} /></div> <span>QR Generator</span>
            </Link>
            <button onClick={() => { onLogout(); setMobileOpen(false); }} className="admin-sidebar-link" title="Logout" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <div className="icon-box-sm icon-red"><LogOut size={18} /></div> <span>Logout</span>
            </button>
          </nav>
        </aside>
        <main className="admin-main-content">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </>
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

const AnimatedRoutes = ({ isAuthenticated, onLogin, onLogout, addNotification }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<main className="main-content"><PageWrapper><ReportingPage /></PageWrapper></main>} />
        <Route path="/track" element={<main className="main-content"><PageWrapper><TrackingPage /></PageWrapper></main>} />
        <Route path="/status" element={<main className="main-content"><PageWrapper><PublicStatusPage /></PageWrapper></main>} />
        <Route path="/login" element={<PageWrapper><LoginPage onLogin={onLogin} /></PageWrapper>} />
        <Route
          path="/admin"
          element={isAuthenticated ? (<AdminLayout onLogout={onLogout}><AdminDashboard addNotification={addNotification} /></AdminLayout>) : (<Navigate to="/login" />)}
        />
        <Route
          path="/qr-gen"
          element={isAuthenticated ? (<AdminLayout onLogout={onLogout}><QRGenerator /></AdminLayout>) : (<Navigate to="/login" />)}
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const { isAuthenticated, setIsAuthenticated, logout, userRole } = useAuthViewModel();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const avatarRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setShowAvatarMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addNotification = useCallback((title, desc, type = 'info') => {
    const newNotif = { id: Date.now(), title, desc, type, time: new Date(), read: false };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  }, []);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const unreadCount = notifications.filter(n => !n.read).length;
  const userName = localStorage.getItem('userName') || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    setShowAvatarMenu(false);
  };

  const getNotifIcon = (type) => {
    switch(type) {
      case 'report': return '📋';
      case 'sla': return '⚠️';
      case 'resolved': return '✅';
      default: return '🔔';
    }
  };

  const getNotifBg = (type) => {
    switch(type) {
      case 'report': return 'rgba(21, 128, 61, 0.1)';
      case 'sla': return 'rgba(220, 38, 38, 0.1)';
      case 'resolved': return 'rgba(22, 163, 74, 0.1)';
      default: return 'var(--bg)';
    }
  };

  const [nowTime, setNowTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Global socket listener for notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const socket = io(SOCKET_URL);
    const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    socket.on('connect', () => console.log('✅ Global Socket: Connected'));
    
    socket.on('newReport', (data) => {
      addNotification(`New ${data.reportType}`, `${data.issue} at ${data.locationId}`, 'report');
    });

    socket.on('slaBreached', (data) => {
      addNotification('SLA Breached', `${data.issue} at ${data.locationId}`, 'sla');
    });

    socket.on('reportAssigned', (data) => {
      if (data.technicianId === getUserId()) {
        notificationSound.play().catch(() => {});
        addNotification('New Assignment', `You've been assigned to ${data.report.issue} at ${data.report.location_id}`, 'report');
      }
    });

    return () => socket.disconnect();
  }, [isAuthenticated, addNotification]);

  return (
    <Router>
      <div className="app-container">
        <Toaster position="top-right" reverseOrder={false} />
        <header className="header">
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <img src="/logo.ico" alt="DOrSU Logo" style={{ width: '50px', height: '50px', background: '#fff', borderRadius: '50%', padding: '2px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }} />
            <div>
              <h1>DOrSU FixHub</h1>
              <p>Maintenance Reporting &amp; Innovation</p>
            </div>
          </div>

          <nav className="header-nav" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/track" title="Track Report" style={{ color: 'white', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', transition: 'var(--transition)' }}><Search size={20} /></Link>
            <Link to="/status" title="Public Status" style={{ color: 'white', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', transition: 'var(--transition)' }}><Globe size={20} /></Link>
            
            <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated && (
              <>
                <div className="notification-center" ref={notifRef}>
                  <button className="notification-bell" onClick={() => { setShowNotifications(!showNotifications); setShowAvatarMenu(false); }}>
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="notification-badge badge-pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </button>
                  {showNotifications && (
                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="notification-dropdown">
                      <div className="notification-dropdown-header">
                        <h4>Notifications</h4>
                        {unreadCount > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>Mark all read</button>}
                      </div>
                      <div className="notification-dropdown-body">
                        {notifications.length === 0 ? (
                          <div className="notification-empty">No notifications yet</div>
                        ) : (
                          notifications.slice(0, 10).map(n => (
                            <div key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`} onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}>
                              <div className="notification-item-icon" style={{ background: getNotifBg(n.type) }}>
                                <span>{getNotifIcon(n.type)}</span>
                              </div>
                              <div className="notification-item-content">
                                <p className="notification-item-title">{n.title}</p>
                                <p className="notification-item-desc">{n.desc}</p>
                                <p className="notification-item-time">{formatActivityTime(n.time, nowTime)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="avatar-dropdown" ref={avatarRef}>
                  <button className="avatar-btn" onClick={() => { setShowAvatarMenu(!showAvatarMenu); setShowNotifications(false); }}>
                    <div className="avatar-circle">{userInitial}</div>
                    <span className="avatar-name">{userName}</span>
                  </button>
                  {showAvatarMenu && (
                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="avatar-menu">
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{userName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{userRole}</div>
                      </div>
                      <button className="avatar-menu-item"><User size={16} /> Profile</button>
                      <button className="avatar-menu-item"><Settings size={16} /> Settings</button>
                      <div className="avatar-menu-divider" />
                      <button className="avatar-menu-item danger" onClick={handleLogout}><LogOut size={16} /> Logout</button>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </nav>
        </header>

        <AnimatedRoutes 
          isAuthenticated={isAuthenticated} 
          onLogin={setIsAuthenticated} 
          onLogout={handleLogout}
          addNotification={addNotification}
        />
      </div>
    </Router>
  );
}

export default App;

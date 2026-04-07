// View: Admin dashboard — UI only, all logic via useAdminViewModel
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, List, BarChart3, FileText, Map as MapIcon, AlertCircle, Lightbulb, Trash2, MessageSquare, TrendingUp, AlertTriangle, Shield, Eye, Wrench, Search, X, Activity, UserPlus, MapPin, Camera, Clock, Users, Settings, Calendar, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Analytics from './Analytics';
import { useAdminViewModel } from '../viewmodels/useAdminViewModel';
import { getPriorityColor, isSlaBreached, getAuthHeader } from '../models/reportModel';
import { API_URL, BASE_URL } from '../utils/config';
import { formatTime, formatActivityTime, getGreeting } from '../utils/time';

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-text" />
    <div className="skeleton skeleton-text-short" />
    <div className="skeleton skeleton-text" style={{ height: '80px', marginTop: '12px' }} />
  </div>
);

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon"><Icon size={48} /></div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);

const getRoleIcon = (role) => {
  if (role === 'Admin') return <Shield size={12} />;
  if (role === 'Technician') return <Wrench size={12} />;
  return <Eye size={12} />;
};

const AdminDashboard = ({ addNotification }) => {
  const {
    reports,
    buildingHealth,
    filteredReports,
    filterStatus, setFilterStatus,
    loading,
    activeTab, setActiveTab,
    editingNotes, setEditingNotes,
    comments,
    showComments, setShowComments,
    commentInput, setCommentInput,
    recurringIssues,
    userRole,
    pendingCount,
    slaBreachedCount,
    canEdit,
    canDelete,
    loadData,
    loadComments,
    handleUpdate,
    handleDelete,
    handleAddComment,
    generatePDF,
  } = useAdminViewModel(addNotification);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activityLog, setActivityLog] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [showAssignMenu, setShowAssignMenu] = useState(null);
  const [showTimeInput, setShowTimeInput] = useState(null);
  const [timeMinutes, setTimeMinutes] = useState('');
  const [technicianStats, setTechnicianStats] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showManageTab, setShowManageTab] = useState('users');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', fullName: '', role: 'Technician' });
  const [newLocation, setNewLocation] = useState({ locationId: '', name: '' });

  const isAdmin = userRole === 'Admin';
  const isTechnician = userRole === 'Technician';

  const fetchTechnicians = async () => {
    try {
      const res = await axios.get(`${API_URL}/technicians`, { headers: getAuthHeader() });
      setTechnicians(res.data);
    } catch { /* silent */ }
  };

  const fetchTechnicianStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/technicians/stats`, { headers: getAuthHeader() });
      setTechnicianStats(res.data);
    } catch { /* silent */ }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/admins`, { headers: getAuthHeader() });
      setAdminUsers(res.data);
    } catch { /* silent */ }
  };

  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${API_URL}/locations`, { headers: getAuthHeader() });
      setLocations(res.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const initialLog = reports.slice(0, 5).map(r => ({
      id: r.id,
      type: r.status === 'Resolved' ? 'resolved' : r.status === 'In Progress' ? 'progress' : 'pending',
      title: r.issue,
      desc: `${r.location_id} • ${r.report_type}`,
      time: new Date(r.created_at),
    }));
    setActivityLog(initialLog);
  }, [reports]);

  useEffect(() => {
    if (isAdmin) {
      fetchTechnicians();
      fetchTechnicianStats();
      fetchAdminUsers();
      fetchLocations();
    }
  }, [isAdmin]);

  const addActivity = (type, title, desc) => {
    setActivityLog(prev => [{ id: Date.now(), type, title, desc, time: new Date() }, ...prev].slice(0, 20));
  };

  const handleUpdateWithLog = async (id, status, notes) => {
    await handleUpdate(id, status, notes);
    if (status) addActivity(status === 'Resolved' ? 'resolved' : 'progress', `Status → ${status}`, `Report: ${reports.find(r => r.id === id)?.issue}`);
  };

  const handleDeleteWithLog = async (id) => {
    const issue = reports.find(r => r.id === id)?.issue;
    await handleDelete(id);
    addActivity('deleted', 'Report deleted', issue);
  };

  const handleAddCommentWithLog = async (reportId) => {
    await handleAddComment(reportId);
    addActivity('comment', 'Comment added', `On: ${reports.find(r => r.id === reportId)?.issue}`);
  };

  const handleAssign = async (reportId, technicianId) => {
    try {
      await axios.post(`${API_URL}/reports/${reportId}/assign`, { technicianId }, { headers: getAuthHeader() });
      toast.success('Report assigned!');
      setShowAssignMenu(null);
      loadData();
    } catch { toast.error('Failed to assign report.'); }
  };

  const handleUnassign = async (reportId) => {
    try {
      await axios.delete(`${API_URL}/reports/${reportId}/assign`, { headers: getAuthHeader() });
      toast.success('Report unassigned.');
      loadData();
    } catch { toast.error('Failed to unassign.'); }
  };

  const handleUploadAfterFix = async (reportId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      await axios.post(`${API_URL}/reports/${reportId}/after-fix`, formData, { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } });
      toast.success('After-fix photo uploaded!');
      loadData();
    } catch { toast.error('Upload failed.'); }
  };

  const handleUpdateTime = async (reportId, minutes) => {
    try {
      await handleUpdate(reportId, null, null, parseInt(minutes));
      toast.success('Time tracked!');
      setShowTimeInput(null);
      setTimeMinutes('');
    } catch { toast.error('Failed to update time.'); }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.fullName) return toast.error('All fields required.');
    try {
      await axios.post(`${API_URL}/admins`, newUser, { headers: getAuthHeader() });
      toast.success('User created!');
      setShowCreateUser(false);
      setNewUser({ username: '', password: '', fullName: '', role: 'Technician' });
      fetchAdminUsers();
      fetchTechnicians();
    } catch { toast.error('Failed to create user.'); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await axios.delete(`${API_URL}/admins/${userId}`, { headers: getAuthHeader() });
      toast.success('User deleted.');
      fetchAdminUsers();
      fetchTechnicians();
    } catch { toast.error('Failed to delete user.'); }
  };

  const handleCreateLocation = async () => {
    if (!newLocation.locationId || !newLocation.name) return toast.error('All fields required.');
    try {
      await axios.post(`${API_URL}/locations`, newLocation, { headers: getAuthHeader() });
      toast.success('Location created!');
      setShowCreateLocation(false);
      setNewLocation({ locationId: '', name: '' });
      fetchLocations();
    } catch { toast.error('Failed to create location.'); }
  };

  const handleDeleteLocation = async (locId) => {
    if (!window.confirm('Delete this location?')) return;
    try {
      await axios.delete(`${API_URL}/locations/${locId}`, { headers: getAuthHeader() });
      toast.success('Location deleted.');
      fetchLocations();
    } catch { toast.error('Failed to delete location.'); }
  };

  const getFilteredBySearch = (items) => {
    if (!debouncedSearch) return items;
    const q = debouncedSearch.toLowerCase();
    return items.filter(r =>
      r.issue.toLowerCase().includes(q) ||
      r.location_id.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.report_type.toLowerCase().includes(q) ||
      r.tracking_code?.toLowerCase().includes(q) ||
      r.assigned_name?.toLowerCase().includes(q)
    );
  };

  const searchedReports = getFilteredBySearch(filteredReports);

  const getActivityDotColor = (type) => {
    switch(type) {
      case 'resolved': return 'green';
      case 'progress': return 'blue';
      case 'pending': return 'yellow';
      case 'deleted': return 'red';
      case 'comment': return 'green';
      default: return 'yellow';
    }
  };

  const [nowTime, setNowTime] = useState(() => Date.now());
  const [today] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="admin-container">
      {/* Welcome Header */}
      <div className="welcome-header animate-slide-up">
        <div className="welcome-greeting">
          <div>
            <h2>{getGreeting(today)}, <span className="gradient-text">{localStorage.getItem('userName') || 'Admin'}</span></h2>
            <p>{isAdmin ? 'Here&apos;s what&apos;s happening with campus maintenance today.' : isTechnician ? 'Here are your assigned maintenance tasks.' : 'You have view-only access.'}</p>
          </div>
          <button onClick={loadData} className="btn-primary btn-ripple btn-press" style={{ padding: '10px 20px', width: 'auto' }}>
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
        <div className="quick-stats">
          <div className="quick-stat animate-slide-up stagger-1">
            <div className="quick-stat-value">{reports.length}</div>
            <div className="quick-stat-label">{isTechnician ? 'My Reports' : 'Total Reports'}</div>
          </div>
          <div className="quick-stat animate-slide-up stagger-2">
            <div className="quick-stat-value" style={{ color: '#f59e0b' }}>{pendingCount}</div>
            <div className="quick-stat-label">Pending</div>
          </div>
          <div className="quick-stat animate-slide-up stagger-3">
            <div className="quick-stat-value" style={{ color: '#2563eb' }}>{reports.filter(r => r.status === 'In Progress').length}</div>
            <div className="quick-stat-label">In Progress</div>
          </div>
          <div className="quick-stat animate-slide-up stagger-4">
            <div className="quick-stat-value" style={{ color: '#16a34a' }}>{reports.filter(r => r.status === 'Resolved').length}</div>
            <div className="quick-stat-label">Resolved</div>
          </div>
          {isAdmin && (
            <div className="quick-stat animate-slide-up stagger-5">
              <div className="quick-stat-value" style={{ color: '#dc2626' }}>{slaBreachedCount}</div>
              <div className="quick-stat-label">SLA Breached</div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="admin-header">
        <div className="tab-switcher">
          <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
            <List size={18} /> Inbox {pendingCount > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{pendingCount}</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}><MapIcon size={18} /> Campus Map</button>
          {isAdmin && (
            <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}><BarChart3 size={18} /> Insights</button>
          )}
          {isAdmin && (
            <button className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}><Settings size={18} /> Manage</button>
          )}
          <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}><Activity size={18} /> Activity</button>
        </div>

        <div className="controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
            <span style={{ background: 'var(--bg)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {getRoleIcon(userRole)} {userRole}
            </span>
            {isAdmin && slaBreachedCount > 0 && (
              <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} /> {slaBreachedCount} SLA Breached
              </span>
            )}
          </div>
          {activeTab === 'list' && (
            <>
              <div className="search-container">
                <Search size={16} className="search-icon" />
                <input className="search-input" placeholder="Search reports..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && <button className="search-clear" onClick={() => setSearchQuery('')}><X size={14} /></button>}
              </div>
              <select className="filter-dropdown" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="All">Filter: All</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </>
          )}
          <button onClick={loadData} className="btn-icon" title="Refresh (Ctrl+R)"><RefreshCcw size={20} /></button>
          {isAdmin && <button onClick={generatePDF} className="btn-icon" title="Export PDF"><FileText size={20} /></button>}
        </div>
      </div>

      {/* Campus Map Tab */}
      {activeTab === 'map' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Visual Campus Health Monitor</h3>
          <div className="building-map-grid">
            {['BLDG-A-101', 'BLDG-B-LAB', 'CANTEEN', 'GYM'].map(loc => {
              const health = buildingHealth.find(h => h.location_id === loc) || { pending_count: 0, breached_count: 0 };
              const color = health.pending_count > 3 ? '#ef4444' : health.pending_count > 0 ? '#f59e0b' : '#10b981';
              return (
                <motion.div whileHover={{ scale: 1.05 }} key={loc} className="building-tile" style={{ borderTop: `6px solid ${color}` }}>
                  <h4>{loc}</h4>
                  <div className="health-stat">{health.pending_count} Issues</div>
                  {health.breached_count > 0 && <div style={{ fontSize: '0.7rem', color: '#dc2626' }}>⚠️ {health.breached_count} SLA breached</div>}
                  <div className="health-bar"><div style={{ width: `${Math.min(health.pending_count * 20, 100)}%`, background: color }}></div></div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Stats Tab (Admin Only) */}
      {activeTab === 'stats' && isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Analytics reports={filteredReports} />
          {recurringIssues.length > 0 && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={20} color="#f59e0b" /> Recurring Issues (Last 30 Days)</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {recurringIssues.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>{item.issue}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.location_id}</div>
                    </div>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>{item.occurrence_count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {technicianStats.length > 0 && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={20} color="var(--primary)" /> Technician Performance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                {technicianStats.map(tech => (
                  <div key={tech.id} style={{ background: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{tech.full_name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{tech.username}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                      <div>📋 Assigned: <strong>{tech.total_assigned}</strong></div>
                      <div>✅ Resolved: <strong style={{ color: '#16a34a' }}>{tech.resolved}</strong></div>
                      <div>🔧 In Progress: <strong style={{ color: '#2563eb' }}>{tech.in_progress}</strong></div>
                      <div>⏱️ Time: <strong>{formatTime(tech.total_time_minutes)}</strong></div>
                      <div>⚠️ SLA Breached: <strong style={{ color: tech.sla_breached > 0 ? '#dc2626' : 'inherit' }}>{tech.sla_breached}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Manage Tab (Admin Only) */}
      {activeTab === 'manage' && isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
            <button className={`btn-small ${showManageTab === 'users' ? 'btn-primary' : ''}`} onClick={() => setShowManageTab('users')} style={{ padding: '10px 20px' }}><Users size={14} /> Users</button>
            <button className={`btn-small ${showManageTab === 'locations' ? 'btn-primary' : ''}`} onClick={() => setShowManageTab('locations')} style={{ padding: '10px 20px' }}><MapPin size={14} /> Locations</button>
          </div>

          {showManageTab === 'users' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>User Management</h3>
                <button className="btn-primary btn-press" style={{ padding: '8px 16px', width: 'auto' }} onClick={() => setShowCreateUser(!showCreateUser)}><UserPlus size={16} /> Add User</button>
              </div>

              {showCreateUser && (
                <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 1rem' }}>Create New User</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input className="form-control" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))} />
                    <input className="form-control" placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))} />
                    <input className="form-control" placeholder="Full Name" value={newUser.fullName} onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))} />
                    <select className="form-control" value={newUser.role} onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}>
                      <option value="Technician">Technician</option>
                      <option value="Admin">Admin</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button className="btn-primary btn-press" style={{ padding: '8px 16px', width: 'auto' }} onClick={handleCreateUser}>Create</button>
                    <button className="btn-small" onClick={() => setShowCreateUser(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gap: '10px' }}>
                {adminUsers.map(user => (
                  <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar-circle" style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}>{user.full_name?.charAt(0) || user.username.charAt(0)}</div>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{user.full_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{user.username}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: user.role === 'Admin' ? 'rgba(21, 128, 61, 0.1)' : user.role === 'Technician' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(100, 116, 139, 0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getRoleIcon(user.role)} {user.role}
                      </span>
                      <button onClick={() => handleDeleteUser(user.id)} className="btn-small icon-red" style={{ padding: '6px', border: 'none', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showManageTab === 'locations' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Location Management</h3>
                <button className="btn-primary btn-press" style={{ padding: '8px 16px', width: 'auto' }} onClick={() => setShowCreateLocation(!showCreateLocation)}><MapPin size={16} /> Add Location</button>
              </div>

              {showCreateLocation && (
                <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 1rem' }}>Add New Location</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input className="form-control" placeholder="Location ID (e.g. BLDG-C-201)" value={newLocation.locationId} onChange={(e) => setNewLocation(prev => ({ ...prev, locationId: e.target.value }))} />
                    <input className="form-control" placeholder="Location Name" value={newLocation.name} onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button className="btn-primary btn-press" style={{ padding: '8px 16px', width: 'auto' }} onClick={handleCreateLocation}>Create</button>
                    <button className="btn-small" onClick={() => setShowCreateLocation(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gap: '10px' }}>
                {locations.map(loc => (
                  <div key={loc.location_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{loc.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{loc.location_id}</div>
                    </div>
                    <button onClick={() => handleDeleteLocation(loc.location_id)} className="btn-small icon-red" style={{ padding: '6px', border: 'none', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={20} color="var(--primary)" /> Recent Activity</h3>
          {activityLog.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" description="Activity will appear here as reports are updated." />
          ) : (
            <div className="activity-timeline">
              {activityLog.map((item, i) => (
                <div key={item.id} className="activity-item animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className={`activity-dot ${getActivityDotColor(item.type)}`} />
                  <div className="activity-content">
                    <p className="activity-title">{item.title}</p>
                    <p className="activity-desc">{item.desc}</p>
                    <p className="activity-time">{formatActivityTime(item.time, nowTime)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Report List Tab */}
      {activeTab === 'list' && (
        <div className="report-grid">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : searchedReports.length === 0 ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <EmptyState
                icon={debouncedSearch ? Search : AlertCircle}
                title={debouncedSearch ? 'No matching reports' : 'No reports yet'}
                description={debouncedSearch ? `No reports match "${debouncedSearch}". Try a different search term.` : 'Reports will appear here once submitted. Share QR codes around campus to get started!'}
                action={!debouncedSearch && <button className="btn-primary" style={{ margin: '1.5rem auto 0', width: 'auto' }} onClick={() => window.location.href = '/'}>Submit First Report</button>}
              />
            </div>
          ) : (
            <AnimatePresence>
              {searchedReports.map((report) => (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={report.id}
                  className={`report-card card-hover-lift ${report.priority === 'Emergency' ? 'pulse-red' : ''} ${isSlaBreached(report) ? 'sla-breach-border' : ''}`}
                >
                  <div className="report-top-meta">
                    <div className="type-tag">
                      <div className={`icon-box-sm ${report.report_type === 'Innovation' ? 'icon-gold' : ''}`} style={{ width: '24px', height: '24px' }}>
                        {report.report_type === 'Innovation' ? <Lightbulb size={12}/> : <AlertCircle size={12}/>}
                      </div>
                      {report.report_type}
                    </div>
                    <span className="priority-tag" style={{ background: getPriorityColor(report.priority) }}>{report.priority}</span>
                  </div>

                  <h3>{report.issue}</h3>
                  <p className="loc-label">📍 {report.location_id}</p>
                  <p className="desc">{report.description}</p>

                  {report.tracking_code && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Tracking: {report.tracking_code}</div>
                  )}

                  {/* Assigned Technician Badge */}
                  {report.assigned_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.8rem', color: 'var(--progress)', fontWeight: '600' }}>
                      <Wrench size={14} /> Assigned to: {report.assigned_name}
                    </div>
                  )}

                  {/* Time Tracking Display */}
                  {report.time_spent_minutes > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Clock size={12} /> Time spent: {formatTime(report.time_spent_minutes)}
                    </div>
                  )}

                  {report.image_url && (
                    <div className="image-preview" style={{ marginTop: '1rem' }}>
                      <img src={`${BASE_URL}${report.image_url}`} alt="issue" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px' }} />
                    </div>
                  )}

                  {/* After-Fix Photo */}
                  {report.after_fix_image_url && (
                    <div className="image-preview" style={{ marginTop: '8px', border: '2px solid #16a34a' }}>
                      <div style={{ background: '#16a34a', color: '#fff', padding: '4px 8px', fontSize: '0.7rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> After Fix</div>
                      <img src={`${BASE_URL}${report.after_fix_image_url}`} alt="after fix" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '0 0 8px 8px' }} />
                    </div>
                  )}

                  {report.admin_notes && (
                    <div className="admin-notes-box">
                      <strong>Logs:</strong> {report.admin_notes}
                    </div>
                  )}

                  {comments[report.id] && comments[report.id].length > 0 && (
                    <div style={{ marginTop: '10px', background: 'var(--bg)', padding: '10px', borderRadius: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                      {comments[report.id].map((c, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                          <strong>{c.full_name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>({c.role})</span>
                          <div>{c.comment_text}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="card-footer">
                    <div className="actions">
                      {/* Admin: Delete */}
                      {canDelete && (
                        <button onClick={() => handleDeleteWithLog(report.id)} className="btn-small icon-red" style={{ padding: '8px', border: 'none', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }} title="Delete Permanent">
                          <Trash2 size={16} />
                        </button>
                      )}

                      {/* Admin: Assign to Technician */}
                      {isAdmin && (
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => { setShowAssignMenu(showAssignMenu === report.id ? null : report.id); if (technicians.length === 0) fetchTechnicians(); }} className="btn-small" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }} title="Assign Technician">
                            <UserPlus size={14} /> {report.assigned_name ? 'Reassign' : 'Assign'}
                          </button>
                          {showAssignMenu === report.id && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px', background: 'var(--surface)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', minWidth: '200px', zIndex: 50, overflow: 'hidden' }}>
                              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>Assign Technician</div>
                              {technicians.map(t => (
                                <button key={t.id} onClick={() => handleAssign(report.id, t.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 12px', border: 'none', background: report.assigned_to === t.id ? 'var(--bg)' : 'transparent', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', textAlign: 'left' }}>
                                  <div className="avatar-circle" style={{ width: '24px', height: '24px', fontSize: '0.65rem' }}>{t.full_name?.charAt(0)}</div>
                                  {t.full_name} {report.assigned_to === t.id && '✓'}
                                </button>
                              ))}
                              {report.assigned_to && (
                                <button onClick={() => handleUnassign(report.id)} style={{ width: '100%', padding: '8px 12px', border: 'none', borderTop: '1px solid var(--border)', background: 'rgba(220, 38, 38, 0.05)', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Unassign</button>
                              )}
                            </motion.div>
                          )}
                        </div>
                      )}

                      {canEdit && (
                        <>
                          <button onClick={() => { setShowComments(showComments === report.id ? null : report.id); if (!comments[report.id]) loadComments(report.id); }} className="btn-small" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MessageSquare size={14} /> {comments[report.id]?.length || 0}
                          </button>

                          {/* Technician: Upload After-Fix Photo */}
                          {isTechnician && report.status !== 'Resolved' && (
                            <label className="btn-small" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
                              <Camera size={14} /> After Fix
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && handleUploadAfterFix(report.id, e.target.files[0])} />
                            </label>
                          )}

                          {/* Technician: Track Time */}
                          {isTechnician && (
                            <button onClick={() => setShowTimeInput(showTimeInput === report.id ? null : report.id)} className="btn-small" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(202, 138, 4, 0.1)', color: '#ca8a04' }}>
                              <Clock size={14} /> Time
                            </button>
                          )}

                          {report.status !== 'Resolved' && (
                            <button onClick={() => setEditingNotes(report.id)} className="btn-small">Add Log</button>
                          )}
                          <select value={report.status} onChange={(e) => handleUpdateWithLog(report.id, e.target.value, report.admin_notes)} className="status-select">
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Technician: Time Input */}
                  {showTimeInput === report.id && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="number" className="form-control" placeholder="Minutes" value={timeMinutes} onChange={(e) => setTimeMinutes(e.target.value)} style={{ width: '100px', fontSize: '0.8rem', padding: '8px' }} min="0" />
                      <button onClick={() => handleUpdateTime(report.id, timeMinutes)} className="btn-primary btn-press" style={{ padding: '8px 12px' }}><CheckCircle size={14} /></button>
                      <button onClick={() => { setShowTimeInput(null); setTimeMinutes(''); }} className="btn-small">Cancel</button>
                    </div>
                  )}

                  {showComments === report.id && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                      <input type="text" className="form-control" placeholder="Add a comment..." value={commentInput[report.id] || ''} onChange={(e) => setCommentInput(prev => ({ ...prev, [report.id]: e.target.value }))} style={{ fontSize: '0.8rem', padding: '8px' }} onKeyDown={(e) => e.key === 'Enter' && handleAddCommentWithLog(report.id)} />
                      <button onClick={() => handleAddCommentWithLog(report.id)} className="btn-primary btn-press" style={{ padding: '8px 12px' }}><MessageSquare size={14} /></button>
                    </div>
                  )}

                  {editingNotes === report.id && (
                    <div className="notes-modal">
                      <textarea id={`notes-${report.id}`} placeholder="Type log..." defaultValue={report.admin_notes} autoFocus></textarea>
                      <button onClick={() => { const val = document.getElementById(`notes-${report.id}`).value; handleUpdate(report.id, report.status, val); }} className="btn-primary btn-press" style={{ padding: '8px' }}>Save Log</button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

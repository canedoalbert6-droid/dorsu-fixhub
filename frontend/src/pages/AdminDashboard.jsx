// View: Admin dashboard — UI only, all logic via useAdminViewModel
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, List, BarChart3, FileText, Map as MapIcon, AlertCircle, Lightbulb, Trash2, MessageSquare, TrendingUp, AlertTriangle, Shield, Eye, Wrench, Search, X, Activity, UserPlus, MapPin, Camera, Clock, Users, Settings, Calendar, CheckCircle, QrCode, ScanLine, XCircle, LayoutGrid, Send, User, Star, StickyNote, Download } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Analytics from './Analytics';
import { useAdminViewModel } from '../viewmodels/useAdminViewModel';
import { getPriorityColor, isSlaBreached, getAuthHeader } from '../models/reportModel';
import { getQrToken, getUserId } from '../models/authModel';
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

const getStatusColor = (status) => {
  switch (status) {
    case 'Pending': return '#f59e0b'; // Amber
    case 'In Progress': return '#2563eb'; // Blue
    case 'Resolved': return '#16a34a'; // Green
    default: return '#64748b'; // Slate
  }
};

const AdminDashboard = ({ addNotification }) => {
  const {
    reports,
    buildingHealth,
    filteredReports,
    filterStatus, setFilterStatus,
    loading,
    activeTab, setActiveTab,
    viewType, setViewType,
    editingNotes, setEditingNotes,
    comments,
    showComments, setShowComments,
    commentInput, setCommentInput,
    materials,
    recurringIssues,
    userRole,
    pendingCount,
    slaBreachedCount,
    canEdit,
    canDelete,
    canEditReport,
    loadData,
    loadComments,
    loadMaterials,
    addMaterialRow,
    removeMaterialRow,
    updateMaterial,
    handleSaveWorkOrder,
    handleApproveWorkOrder,
    handleUpdate,
    handleDelete,
    handleAutoAssign,
    handleAddComment,
    handleScan,
    handleScanEquipment,
    equipment,
    reportEquipment,
    loadReportEquipment,
    generatePDF,
  } = useAdminViewModel(addNotification);

  const [activeScanReport, setActiveScanReport] = useState(null);
  const [scanType, setScanType] = useState('technician'); // 'technician' or 'equipment'
  const [showMyQR, setShowMyQR] = useState(false);
  const [showWorkOrder, setShowWorkOrder] = useState(null); // stores report object
  const [showEquipmentQR, setShowEquipmentQR] = useState(null); // stores equipment object
  const [workOrderData, setWorkOrderData] = useState({});
  const [zoomedImage, setZoomedImage] = useState(null);
  const scannerRef = useRef(null);
  const [isSecure] = useState(() => window.isSecureContext);
  const [manualToken, setManualToken] = useState('');

  const isAdmin = userRole === 'Admin';
  const isTechnician = userRole === 'Technician';

  const openWorkOrder = (report) => {
    setShowWorkOrder(report);
    loadMaterials(report.id);
    setWorkOrderData({
      department: report.department || '',
      classroomOffice: report.classroom_office || '',
      dateNeeded: report.date_needed ? new Date(report.date_needed).toISOString().split('T')[0] : '',
      dateStarted: report.date_started ? new Date(report.date_started).toISOString().split('T')[0] : '',
      timeStarted: report.time_started || '',
      timeFinished: report.time_finished || '',
      dateCompleted: report.date_completed ? new Date(report.date_completed).toISOString().split('T')[0] : '',
      workDescription: report.work_description || report.description || '', // Initialize with reporter description
      workDetails: report.work_details || '',
      requestedBy: report.requested_by || report.reporter_name || 'Anonymous', // Auto-fill Reporter
      inspectedBy: report.inspected_by || localStorage.getItem('userName') || '', // Auto-fill Current User (Admin/Tech)
      conformedBy: report.conformed_by || '',
      workmanshipRating: report.workmanship_rating || '',
    });
  };

  const downloadMyQR = () => {
    const svg = document.getElementById(`qr-my-tech`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1200;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 100, 100, 800, 800);
      ctx.fillStyle = "black";
      ctx.font = "bold 60px Inter, Arial";
      ctx.textAlign = "center";
      ctx.fillText(localStorage.getItem('userName')?.toUpperCase() || 'TECHNICIAN', 500, 950);
      ctx.font = "bold 40px Inter, Arial";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("AUTHORIZED MAINTENANCE TECHNICIAN", 500, 1030);
      ctx.font = "30px Inter, Arial";
      ctx.fillStyle = "#666";
      ctx.fillText("DOrSU FIXHUB - CAMPUS SERVICES", 500, 1100);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `Tech-QR-${localStorage.getItem('userName')?.replace(/\s+/g, '-')}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const downloadEquipmentQR = (item) => {
    const svg = document.getElementById(`qr-equipment-${item.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 1000; // High res for printing
      canvas.height = 1200;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw QR
      ctx.drawImage(img, 100, 100, 800, 800);

      // Add Text Labels
      ctx.fillStyle = "black";
      ctx.font = "bold 60px Inter, Arial";
      ctx.textAlign = "center";
      ctx.fillText(item.name.toUpperCase(), 500, 950);

      ctx.font = "40px monospace";
      ctx.fillStyle = "#666";
      ctx.fillText(`TOKEN: ${item.qr_token}`, 500, 1030);

      ctx.font = "bold 30px Inter, Arial";
      ctx.fillStyle = "#15766e";
      ctx.fillText("DOrSU FIXHUB - EQUIPMENT PROPERTY", 500, 1120);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${item.name.replace(/\s+/g, '-')}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const saveWorkOrder = async () => {
    await handleSaveWorkOrder(showWorkOrder.id, workOrderData);
    setShowWorkOrder(null);
  };

  const approveWorkOrder = async (status) => {
    await handleApproveWorkOrder(showWorkOrder.id, status);
    setShowWorkOrder(null);
  };

  const isProcessingRef = useRef(false);

  useEffect(() => {
    let scanner = null;

    if (activeScanReport && isAdmin) {
      // Small timeout to ensure the "reader" div is rendered in the DOM by AnimatePresence
      const timer = setTimeout(() => {
        const readerElement = document.getElementById("reader");
        if (!readerElement) return;

        scanner = new Html5QrcodeScanner("reader", {
          fps: 5, // Reduced from 10 — fewer decode attempts per second
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          supportedScanTypes: [0] // 0 = QR
        }, false);

        scanner.render(async (decodedText) => {
          // ── Guard: prevent concurrent or rapid duplicate scans ──────────
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          console.log(`[DEBUG] Scanned QR Code (${scanType}):`, decodedText);
          if (!activeScanReport?.id) {
            toast.error('No active report selected for scanning.');
            isProcessingRef.current = false;
            return;
          }

          if (scanType === 'technician') {
            const success = await handleScan(activeScanReport.id, decodedText);
            if (success) {
              if (activeScanReport.status === 'Pending') {
                setScanType('equipment');
              } else {
                scanner.clear().catch(e => console.warn(e));
                setActiveScanReport(null);
              }
            }
          } else {
            await handleScanEquipment(activeScanReport.id, decodedText);
          }

          // ── Cooldown: hold the lock for 2 s so the same QR in frame ──
          // ── doesn't immediately re-trigger another API call ──────────
          setTimeout(() => { isProcessingRef.current = false; }, 2000);
        }, (error) => {
          // silence scan errors
        });

        scannerRef.current = scanner;
      }, 300);

      return () => {
        clearTimeout(timer);
        isProcessingRef.current = false;
        if (scannerRef.current) {
          scannerRef.current.clear().catch(e => console.warn('Scanner clear error', e));
          scannerRef.current = null;
        }
      };
    }
  }, [activeScanReport, isAdmin, handleScan]);

  const handleManualScan = async () => {
    if (!manualToken.trim()) {
      toast.error('Please enter a valid token.');
      return;
    }
    
    if (scanType === 'technician') {
      const success = await handleScan(activeScanReport.id, manualToken.trim());
      if (success) {
        if (activeScanReport.status === 'Pending') {
          setScanType('equipment');
        } else {
          setActiveScanReport(null);
        }
      }
    } else {
      await handleScanEquipment(activeScanReport.id, manualToken.trim());
    }
    setManualToken('');
  };

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
  const [showCreateEquipment, setShowCreateEquipment] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', fullName: '', role: 'Technician' });
  const [newLocation, setNewLocation] = useState({ locationId: '', name: '' });
  const [newEquipment, setNewEquipment] = useState({ name: '', description: '', qrToken: '' });


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
    if (isAdmin || isTechnician) {
      fetchLocations();
    }
    if (isAdmin) {
      fetchTechnicians();
      fetchTechnicianStats();
      fetchAdminUsers();
    }
  }, [isAdmin, isTechnician]);

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
      fetchTechnicians();
      fetchTechnicianStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign report.');
    }
  };

  const handleUnassign = async (reportId) => {
    try {
      await axios.delete(`${API_URL}/reports/${reportId}/assign`, { headers: getAuthHeader() });
      toast.success('Report unassigned.');
      loadData();
      fetchTechnicians();
      fetchTechnicianStats();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to unassign.'); }
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

  const handleCreateEquipment = async () => {
    if (!newEquipment.name || !newEquipment.qrToken) return toast.error('Name and QR Token required.');
    try {
      await axios.post(`${API_URL}/equipment`, newEquipment, { headers: getAuthHeader() });
      toast.success('Equipment registered!');
      setShowCreateEquipment(false);
      setNewEquipment({ name: '', description: '', qrToken: '' });
      loadData(); // Refresh equipment list via loadData
    } catch { toast.error('Failed to register equipment.'); }
  };

  const handleDeleteEquipment = async (id) => {
    if (!window.confirm('Delete this equipment?')) return;
    try {
      await axios.delete(`${API_URL}/equipment/${id}`, { headers: getAuthHeader() });
      toast.success('Equipment deleted.');
      loadData();
    } catch { toast.error('Failed to delete equipment.'); }
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
    switch (type) {
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
            <p>{isAdmin ? "Here's what's happening with campus maintenance today." : isTechnician ? 'Here are your assigned maintenance tasks.' : 'You have view-only access.'}</p>
          </div>
          <button onClick={loadData} className="btn-primary btn-ripple btn-press" style={{ padding: '10px 20px', width: 'auto' }}>
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
        <div className="quick-stats">
          <div className="quick-stat animate-slide-up stagger-1">
            <div className="quick-stat-value">{isTechnician ? filteredReports.length : reports.length}</div>
            <div className="quick-stat-label">{isTechnician ? 'My Reports' : 'Total Reports'}</div>
          </div>
          <div className="quick-stat animate-slide-up stagger-2">
            <div className="quick-stat-value" style={{ color: '#f59e0b' }}>{isTechnician ? filteredReports.filter(r => r.status === 'Pending').length : pendingCount}</div>
            <div className="quick-stat-label">Pending</div>
          </div>
          <div className="quick-stat animate-slide-up stagger-3">
            <div className="quick-stat-value" style={{ color: '#2563eb' }}>{filteredReports.filter(r => r.status === 'In Progress').length}</div>
            <div className="quick-stat-label">In Progress</div>
          </div>
          <div className="quick-stat animate-slide-up stagger-4">
            <div className="quick-stat-value" style={{ color: '#16a34a' }}>{filteredReports.filter(r => r.status === 'Resolved').length}</div>
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
            {isTechnician && (
              <button
                onClick={() => setShowMyQR(true)}
                className="btn-small"
                style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', border: '1px solid rgba(79, 70, 229, 0.2)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <QrCode size={14} /> My QR
              </button>
            )}
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
          {isAdmin && (
            <button
              onClick={handleAutoAssign}
              className="btn-icon"
              style={{ color: '#16a34a' }}
              title="Smart Auto-Assign Pending Reports"
            >
              <Users size={20} />
            </button>
          )}
          {isAdmin && <button onClick={generatePDF} className="btn-icon" title="Export PDF"><FileText size={20} /></button>}
        </div>
      </div>

      {/* Campus Map Tab */}
      {activeTab === 'map' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Visual Campus Health Monitor</h3>

          {locations.length === 0 ? (
            <EmptyState
              icon={MapIcon}
              title="No locations configured"
              description="Go to the 'Manage' tab to add campus buildings and offices to see them on the map."
              action={isAdmin && <button className="btn-small" onClick={() => setActiveTab('manage')}>Configure Locations</button>}
            />
          ) : (
            <div className="building-map-grid">
              {locations.map(loc => {
                const locId = loc.location_id;
                const health = buildingHealth.find(h => h.location_id === locId) || { pending_count: 0, breached_count: 0 };
                const color = health.pending_count > 3 ? '#ef4444' : health.pending_count > 0 ? '#f59e0b' : '#10b981';
                return (
                  <motion.div whileHover={{ scale: 1.05 }} key={locId} className="building-tile" style={{ borderTop: `6px solid ${color}` }}>
                    <div>
                      <h4>{loc.name || locId}</h4>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{locId}</p>
                    </div>
                    <div>
                      <div className="health-stat">{health.pending_count} Active Issues</div>
                      {health.breached_count > 0 && <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 'bold' }}>⚠️ {health.breached_count} SLA breached</div>}
                      <div className="health-bar"><div style={{ width: `${Math.min(health.pending_count * 20, 100)}%`, background: color }}></div></div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
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
                {technicianStats.map(tech => {
                  const isAvailable = tech.in_progress === 0;
                  return (
                    <div key={tech.id} style={{ background: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 12px', background: isAvailable ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: isAvailable ? '#16a34a' : '#ca8a04', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '0 0 0 12px' }}>
                        {isAvailable ? 'AVAILABLE' : 'BUSY'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingRight: '70px' }}>
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
                  );
                })}
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
            <button className={`btn-small ${showManageTab === 'equipment' ? 'btn-primary' : ''}`} onClick={() => setShowManageTab('equipment')} style={{ padding: '10px 20px' }}><Wrench size={14} /> Equipment</button>
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
                      <button onClick={() => handleDeleteUser(user.id)} className="btn-small" style={{ padding: '6px', border: 'none', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}><Trash2 size={14} /></button>
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
                    <button onClick={() => handleDeleteLocation(loc.location_id)} className="btn-small" style={{ padding: '6px', border: 'none', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showManageTab === 'equipment' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Equipment Management</h3>
                <button className="btn-primary btn-press" style={{ padding: '8px 16px', width: 'auto' }} onClick={() => setShowCreateEquipment(!showCreateEquipment)}><Wrench size={16} /> Register Equipment</button>
              </div>

              {showCreateEquipment && (
                <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 1rem' }}>Register New Equipment</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input className="form-control" placeholder="Equipment Name (e.g. Drill)" value={newEquipment.name} onChange={(e) => setNewEquipment(prev => ({ ...prev, name: e.target.value }))} />
                    <input className="form-control" placeholder="QR Token (Unique ID)" value={newEquipment.qrToken} onChange={(e) => setNewEquipment(prev => ({ ...prev, qrToken: e.target.value }))} />
                    <textarea className="form-control" placeholder="Description" style={{ gridColumn: '1 / -1', minHeight: '60px' }} value={newEquipment.description} onChange={(e) => setNewEquipment(prev => ({ ...prev, description: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button className="btn-primary btn-press" style={{ padding: '8px 16px', width: 'auto' }} onClick={handleCreateEquipment}>Register</button>
                    <button className="btn-small" onClick={() => setShowCreateEquipment(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                {equipment.map(item => (
                  <div key={item.id} style={{ background: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '1rem' }}>{item.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>QR: {item.qr_token}</div>
                      </div>
                      <span style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', background: item.status === 'Available' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: item.status === 'Available' ? '#16a34a' : '#f59e0b' }}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0' }}>{item.description || 'No description'}</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '8px' }}>
                      <button
                        onClick={() => setShowEquipmentQR(item)}
                        className="btn-small"
                        style={{ padding: '6px 12px', background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <QrCode size={14} /> View QR
                      </button>
                      <button onClick={() => handleDeleteEquipment(item.id)} className="btn-small" style={{ padding: '6px', border: 'none', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
                {equipment.length === 0 && <div style={{ gridColumn: '1 / -1' }}><EmptyState icon={Wrench} title="No equipment registered" description="Register tools and equipment to track their usage during repairs." /></div>}
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
                  style={{ borderLeft: `6px solid ${getStatusColor(report.status)}` }}
                >
                  {isSlaBreached(report) && (
                    <div className="sla-indicator">SLA BREACHED</div>
                  )}

                  <div className="card-header-main">
                    <div className="card-title-area">
                      <div className="type-tag" style={{ marginBottom: '4px' }}>
                        <div className={`icon-box-sm ${report.report_type === 'Innovation' ? 'icon-gold' : ''}`} style={{ width: '20px', height: '20px' }}>
                          {report.report_type === 'Innovation' ? <Lightbulb size={10} /> : <AlertCircle size={10} />}
                        </div>
                        {report.report_type}
                      </div>
                      <h3>{report.issue}</h3>
                      {report.tracking_code && (
                        <div className="tracking-pill">ID: {report.tracking_code}</div>
                      )}
                    </div>
                    <span className="badge-pill" style={{ background: getPriorityColor(report.priority), color: 'white' }}>{report.priority}</span>
                  </div>

                  <div className="meta-grid">
                    <div className="meta-item">
                      <MapPin size={14} /> {report.location_id}
                    </div>
                    <div className="meta-item">
                      <Calendar size={14} /> {new Date(report.created_at).toLocaleDateString()}
                    </div>
                    {report.time_spent_minutes > 0 && (
                      <div className="meta-item">
                        <Clock size={14} /> {formatTime(report.time_spent_minutes)}
                      </div>
                    )}
                  </div>

                  <p className="desc">{report.description}</p>

                  {/* Assigned Technician Pill */}
                  {report.assigned_name && (
                    report.status === 'Resolved' ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'linear-gradient(135deg, rgba(22,163,74,0.12), rgba(16,185,129,0.08))',
                        border: '1px solid rgba(22,163,74,0.35)',
                        borderRadius: '12px', padding: '8px 14px', marginBottom: '10px',
                        boxShadow: '0 0 0 3px rgba(22,163,74,0.08)'
                      }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #16a34a, #10b981)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: '800', fontSize: '0.9rem',
                          boxShadow: '0 0 0 3px rgba(22,163,74,0.25), 0 2px 8px rgba(22,163,74,0.4)',
                          flexShrink: 0
                        }}>
                          {report.assigned_name.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              ✅ Resolved by
                            </span>
                          </div>
                          <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {report.assigned_name}
                          </span>
                        </div>
                        <CheckCircle size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                      </div>
                    ) : (
                      <div className="assigned-tech-pill">
                        <div className="tech-avatar">{report.assigned_name.charAt(0)}</div>
                        <div className="tech-info">
                          <span className="tech-name">{report.assigned_name}</span>
                          <span className="tech-status" style={{ color: (report.assigned_active_tasks || 0) > 0 ? '#ca8a04' : '#16a34a' }}>
                            {(report.assigned_active_tasks || 0) > 0 ? `Busy (${report.assigned_active_tasks})` : 'Available'}
                          </span>
                        </div>
                      </div>
                    )
                  )}

                  {/* Rating Display */}
                  {report.workmanship_rating && (
                    <div className="rating-display">
                      <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                      <span>{report.workmanship_rating}</span>
                    </div>
                  )}

                  {/* Images Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: report.image_url && report.after_fix_image_url ? '1fr 1fr' : '1fr', gap: '8px', marginBottom: '1rem' }}>
                    {report.image_url && (
                      <div className="image-preview" style={{ margin: 0, height: '120px' }} onClick={() => setZoomedImage(`${BASE_URL}${report.image_url}`)}>
                        <img src={`${BASE_URL}${report.image_url}`} alt="issue" style={{ height: '100%' }} />
                      </div>
                    )}

                    {report.after_fix_image_url && (
                      <div className="after-fix-box" style={{ margin: 0, height: '120px' }} onClick={() => setZoomedImage(`${BASE_URL}${report.after_fix_image_url}`)}>
                        <span>AFTER FIX</span>
                        <img src={`${BASE_URL}${report.after_fix_image_url}`} alt="after fix" style={{ height: '100%' }} />
                      </div>
                    )}
                  </div>

                  {report.admin_notes && (
                    <div className="admin-notes-box" style={{ marginTop: '0', marginBottom: '1rem' }}>
                      <strong>Logs:</strong> {report.admin_notes}
                    </div>
                  )}

                  {/* Modern Chat-like Comments Panel */}
                  <AnimatePresence>
                    {showComments === report.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', background: 'var(--bg)', borderRadius: '12px', padding: '15px', marginBottom: '1rem', border: '1px solid var(--border)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                          <MessageSquare size={16} color="var(--primary)" />
                          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Discussion Thread</span>
                        </div>

                        <div className="comments-container">
                          {comments[report.id]?.map((c, i) => {
                            const isOwn = Number(c.admin_id) === Number(getUserId());
                            return (
                              <div key={i} className={`comment-bubble ${isOwn ? 'own' : ''}`}>
                                {!isOwn && <div className="comment-avatar">{c.full_name?.charAt(0)}</div>}
                                <div className="comment-content">
                                  <div className="comment-header">
                                    <span className="comment-author">{isOwn ? 'You' : c.full_name}</span>
                                    <span className="comment-time">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="comment-text">{c.comment_text}</div>
                                </div>
                              </div>
                            );
                          })}
                          {(!comments[report.id] || comments[report.id].length === 0) && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                              No messages yet. Start the conversation!
                            </div>
                          )}
                        </div>

                        <div className="comment-input-row">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Type a message..."
                            value={commentInput[report.id] || ''}
                            onChange={(e) => setCommentInput(prev => ({ ...prev, [report.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCommentWithLog(report.id)}
                          />
                          <button onClick={() => handleAddCommentWithLog(report.id)} className="icon-btn" style={{ background: 'var(--primary)', color: 'white', border: 'none', width: '38px', height: '38px' }}><Send size={16} /></button>
                        </div>
                      </motion.div>
                    )}

                    {showTimeInput === report.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', background: 'var(--bg)', borderRadius: '12px', padding: '12px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px' }}>Update Time Spent</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input type="number" className="form-control" placeholder="Minutes" value={timeMinutes} onChange={(e) => setTimeMinutes(e.target.value)} style={{ height: '34px', flex: 1, fontSize: '0.8rem' }} min="0" />
                          <button onClick={() => handleUpdateTime(report.id, timeMinutes)} className="main-action-btn" style={{ background: 'var(--primary)', color: 'white' }}>Save</button>
                          <button onClick={() => setShowTimeInput(null)} className="icon-btn" title="Cancel"><X size={14} /></button>
                        </div>
                      </motion.div>
                    )}

                    {editingNotes === report.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', background: 'var(--bg)', borderRadius: '12px', padding: '12px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px' }}>Update Admin Log</div>
                        <textarea id={`notes-${report.id}`} className="form-control" style={{ minHeight: '80px', fontSize: '0.8rem', marginBottom: '8px' }} defaultValue={report.admin_notes} autoFocus></textarea>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingNotes(null)} className="main-action-btn" style={{ background: 'transparent', color: 'var(--text-muted)' }}>Cancel</button>
                          <button onClick={() => { const val = document.getElementById(`notes-${report.id}`).value; handleUpdate(report.id, report.status, val); setEditingNotes(null); }} className="main-action-btn" style={{ background: 'var(--primary)', color: 'white' }}>Save Log</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="card-actions-row">
                    <div className="action-btns-group">
                      {/* Admin: Delete */}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteWithLog(report.id)}
                          className="main-action-btn"
                          style={{ background: '#dc2626', color: 'white', border: 'none' }}
                          title="Delete Permanent"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}

                      <button
                        onClick={() => { setShowComments(showComments === report.id ? null : report.id); if (!comments[report.id]) loadComments(report.id); }}
                        className="icon-btn"
                        title="Comments"
                        style={{
                          background: showComments === report.id ? 'rgba(15,118,110,0.12)' : undefined,
                          color: showComments === report.id ? '#0f766e' : '#64748b',
                          borderColor: showComments === report.id ? '#0f766e' : undefined,
                        }}
                      >
                        <MessageSquare size={16} />
                        {comments[report.id]?.length > 0 && <span style={{ fontSize: '0.65rem', marginLeft: '4px', fontWeight: '700' }}>{comments[report.id].length}</span>}
                      </button>
                    </div>

                    <div className="action-btns-group" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {/* Admin: Assign to Technician */}
                      {isAdmin && (
                        <>
                          <div style={{ position: 'relative' }}>
                            <button onClick={() => { setShowAssignMenu(showAssignMenu === report.id ? null : report.id); if (technicians.length === 0) fetchTechnicians(); }} className="main-action-btn" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }} title="Assign Technician">
                              <UserPlus size={14} /> {report.assigned_name ? 'Reassign' : 'Assign'}
                            </button>
                            <AnimatePresence>
                              {showAssignMenu === report.id && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px', background: 'var(--surface)', borderRadius: '12px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)', minWidth: '220px', zIndex: 100, overflow: 'hidden' }}>
                                  <div style={{ padding: '10px 15px', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assign Technician</div>
                                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                    {[...technicians]
                                      .sort((a, b) => {
                                        // Assigned technician always floats to the top
                                        if (a.id === report.assigned_to) return -1;
                                        if (b.id === report.assigned_to) return 1;
                                        return 0;
                                      })
                                      .map(t => {
                                        const tasksCount = Number(t.active_tasks || 0);
                                        const isCurrentlyAssigned = t.id === report.assigned_to;
                                        // If this tech IS assigned to THIS report, one of their "active" tasks
                                        // IS this report — so they're not truly as busy as the number suggests
                                        const effectiveTasks = isCurrentlyAssigned ? Math.max(0, tasksCount) : tasksCount;
                                        const isAvailable = effectiveTasks === 0;

                                        return (
                                          <button
                                            key={t.id}
                                            onClick={() => handleAssign(report.id, t.id)}
                                            style={{
                                              display: 'flex', alignItems: 'center', gap: '10px',
                                              width: '100%', padding: '11px 15px', border: 'none',
                                              background: isCurrentlyAssigned
                                                ? 'rgba(37,99,235,0.08)'
                                                : 'transparent',
                                              borderLeft: isCurrentlyAssigned ? '3px solid #2563eb' : '3px solid transparent',
                                              cursor: 'pointer', fontSize: '0.85rem',
                                              color: 'var(--text-main)', textAlign: 'left',
                                              transition: 'background 0.2s',
                                            }}
                                          >
                                            {/* Avatar with status ring */}
                                            <div style={{
                                              width: '32px', height: '32px', borderRadius: '50%',
                                              background: isCurrentlyAssigned
                                                ? 'linear-gradient(135deg,#2563eb,#60a5fa)'
                                                : isAvailable ? '#16a34a' : '#ca8a04',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                                              color: '#fff', fontWeight: '800', fontSize: '0.8rem',
                                              flexShrink: 0,
                                              boxShadow: isCurrentlyAssigned
                                                ? '0 0 0 2px #fff, 0 0 0 4px #2563eb'
                                                : 'none',
                                            }}>
                                              {t.full_name?.charAt(0)}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                  {t.full_name}
                                                </span>
                                                {isCurrentlyAssigned && (
                                                  <span style={{
                                                    fontSize: '0.6rem', fontWeight: '800', padding: '1px 6px',
                                                    borderRadius: '4px', background: '#2563eb', color: '#fff',
                                                    textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0
                                                  }}>
                                                    Assigned
                                                  </span>
                                                )}
                                              </div>
                                              <div style={{
                                                fontSize: '0.7rem', fontWeight: '600',
                                                color: isCurrentlyAssigned ? '#2563eb' : isAvailable ? '#16a34a' : '#ca8a04',
                                              }}>
                                                {isCurrentlyAssigned
                                                  ? `● Busy — handling this report`
                                                  : isAvailable
                                                  ? '● Available'
                                                  : `● Busy (${effectiveTasks} active tasks)`}
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                  </div>
                                  {report.assigned_to && (
                                    <button onClick={() => handleUnassign(report.id)} style={{ width: '100%', padding: '10px 15px', border: 'none', borderTop: '1px solid var(--border)', background: 'rgba(220, 38, 38, 0.05)', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>Remove Assignment</button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {report.status !== 'Resolved' && (
                            <button
                              onClick={() => setActiveScanReport(report)}
                              className="main-action-btn"
                              style={{
                                background: report.status === 'Pending' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                                color: report.status === 'Pending' ? '#4f46e5' : '#16a34a'
                              }}
                            >
                              <ScanLine size={14} /> {report.status === 'Pending' ? 'Start Repair' : 'Resolve'}
                            </button>
                          )}
                        </>
                      )}

                      {canEditReport(report) && (
                        <>
                          {isTechnician && report.status !== 'Resolved' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <label className="main-action-btn" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', cursor: 'pointer' }}>
                                <Camera size={14} /> Photo
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && handleUploadAfterFix(report.id, e.target.files[0])} />
                              </label>
                              <button onClick={() => setShowTimeInput(showTimeInput === report.id ? null : report.id)} className="main-action-btn" style={{ background: 'rgba(202, 138, 4, 0.1)', color: '#ca8a04' }}>
                                <Clock size={14} /> Time
                              </button>
                            </div>
                          )}

                          {report.status !== 'Resolved' && (
                            <button onClick={() => setEditingNotes(report.id === editingNotes ? null : report.id)} className="main-action-btn" style={{ background: editingNotes === report.id ? 'var(--bg)' : 'rgba(0,0,0,0.05)' }}>
                              <StickyNote size={14} /> Log
                            </button>
                          )}

                          <button
                            onClick={() => openWorkOrder(report)}
                            className="main-action-btn"
                            style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                            title="Open Work Order Form"
                          >
                            <FileText size={14} /> Form
                          </button>

                          {isAdmin && (
                            <select
                              value={report.status}
                              onChange={(e) => handleUpdateWithLog(report.id, e.target.value, report.admin_notes)}
                              className="status-select"
                              style={{
                                height: '34px',
                                background: `${getStatusColor(report.status)}15`,
                                color: getStatusColor(report.status),
                                borderColor: `${getStatusColor(report.status)}40`,
                                fontWeight: '700'
                              }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
      {/* QR Scanner Modal */}
      <AnimatePresence>
        {activeScanReport && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
              <button onClick={() => { setActiveScanReport(null); setScanType('technician'); }} style={{ position: 'absolute', right: '15px', top: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><XCircle size={24} /></button>

              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1rem' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', background: scanType === 'technician' ? 'var(--primary)' : 'var(--bg)', color: scanType === 'technician' ? '#fff' : 'var(--text-muted)' }}>1. TECHNICIAN</span>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', background: scanType === 'equipment' ? 'var(--secondary)' : 'var(--bg)', color: scanType === 'equipment' ? '#fff' : 'var(--text-muted)' }}>2. EQUIPMENT</span>
                </div>

                <h3 style={{ margin: '0 0 10px' }}>
                  {scanType === 'technician'
                    ? (activeScanReport.status === 'Pending' ? 'Start Repair (Scan Tech)' : 'Resolve Repair (Scan Tech)')
                    : 'Link Equipment (Scan QR)'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {scanType === 'technician'
                    ? (activeScanReport.status === 'Pending' ? 'Scan technician to assign task' : 'Scan technician to resolve task')
                    : 'Scan equipment QR codes to borrow for this task.'}
                  <br /><strong>{activeScanReport.issue}</strong>
                </p>
              </div>

              <div id="reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--border)', background: '#000' }}></div>

              {!isSecure && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '15px', borderRadius: '12px', marginTop: '1rem', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <AlertTriangle color="#d97706" size={24} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#92400e', display: 'block', fontSize: '0.85rem' }}>Insecure Network Context</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#b45309' }}>
                      Camera access is blocked. Please enter the QR token manually.
                    </p>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
                <input 
                  type="text"
                  className="form-control" 
                  placeholder={scanType === 'technician' ? "Enter Tech Token..." : "Enter Equipment Token..."}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                  style={{ flex: 1 }}
                />
                <button onClick={handleManualScan} className="btn-primary" style={{ padding: '0 20px', width: 'auto' }}>Submit</button>
              </div>

              {scanType === 'equipment' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '10px' }}>Scanned Equipment:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px' }}>
                    {(reportEquipment[activeScanReport.id] || []).map(e => (
                      <span key={e.id} style={{ background: 'var(--bg)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', border: '1px solid var(--border)' }}>🛠️ {e.name}</span>
                    ))}
                    {(reportEquipment[activeScanReport.id] || []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None scanned yet</span>}
                  </div>
                  <button onClick={() => { setActiveScanReport(null); setScanType('technician'); }} className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>Finish & Close</button>
                </div>
              )}

              <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Position the QR code within the frame to scan.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Technician My QR Modal */}
      <AnimatePresence>
        {showMyQR && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card" style={{ maxWidth: '400px', width: '100%', position: 'relative', textAlign: 'center' }}>
              <button onClick={() => setShowMyQR(false)} style={{ position: 'absolute', right: '15px', top: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><XCircle size={24} /></button>
              <div className="icon-box-md" style={{ margin: '0 auto 1.5rem', background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}><QrCode size={30} /></div>
              <h3 style={{ margin: '0 0 10px' }}>Your Technician QR</h3>
              {!getQrToken() ? (
                <div style={{ background: '#fef2f2', color: '#dc2626', padding: '15px', borderRadius: '12px', marginTop: '1rem', fontSize: '0.85rem', fontWeight: '600' }}>
                  ⚠️ QR Token Missing!<br />
                  <p style={{ fontWeight: '400', marginTop: '5px' }}>Please log out and log back in to activate your technician QR code.</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Present this QR code to the Admin to start or resolve a repair task.</p>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '20px', display: 'inline-block', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                    <QRCodeSVG
                      id="qr-my-tech"
                      value={getQrToken()}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <button
                    onClick={downloadMyQR}
                    className="btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Download size={18} /> Download for Print
                  </button>
                </>
              )}
              <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)', marginTop: '1rem' }}>
                {localStorage.getItem('userName')}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Work Order Modal */}
      <AnimatePresence>
        {showWorkOrder && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="card work-order-modal" style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <button onClick={() => setShowWorkOrder(null)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>

              <div className="work-order-header">
                <h2 className="work-order-title"><FileText size={28} /> PRE-REPAIR / POST-REPAIR WORK ORDER</h2>
                <p className="work-order-subtitle">Tracking Code: <strong>{showWorkOrder.tracking_code || 'N/A'}</strong> | Status: <strong>{showWorkOrder.status}</strong></p>
              </div>

              <div className="work-order-grid-2">
                <div className="form-group">
                  <label>Department / Office</label>
                  <input className="form-control" value={workOrderData.department} onChange={(e) => setWorkOrderData({ ...workOrderData, department: e.target.value })} placeholder="e.g. IT Department" />
                </div>
                <div className="form-group">
                  <label>Classroom / Office No.</label>
                  <input className="form-control" value={workOrderData.classroomOffice} onChange={(e) => setWorkOrderData({ ...workOrderData, classroomOffice: e.target.value })} placeholder="e.g. LAB 1" />
                </div>
                <div className="form-group">
                  <label>Date Needed</label>
                  <input type="date" className="form-control" value={workOrderData.dateNeeded} onChange={(e) => setWorkOrderData({ ...workOrderData, dateNeeded: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date Started</label>
                  <input type="date" className="form-control" value={workOrderData.dateStarted} onChange={(e) => setWorkOrderData({ ...workOrderData, dateStarted: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Time Started</label>
                  <input type="time" className="form-control" value={workOrderData.timeStarted} onChange={(e) => setWorkOrderData({ ...workOrderData, timeStarted: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Time Finished</label>
                  <input type="time" className="form-control" value={workOrderData.timeFinished} onChange={(e) => setWorkOrderData({ ...workOrderData, timeFinished: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date Completed</label>
                  <input type="date" className="form-control" value={workOrderData.dateCompleted} onChange={(e) => setWorkOrderData({ ...workOrderData, dateCompleted: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Approval Status</label>
                  <div className="approval-status-box" style={{ padding: '10px', background: 'var(--bg)', borderRadius: '8px', fontWeight: '700', color: showWorkOrder.approval_status === 'Approved' ? '#16a34a' : showWorkOrder.approval_status === 'Rejected' ? '#dc2626' : '#ca8a04' }}>
                    {showWorkOrder.approval_status || 'Pending'}
                  </div>
                </div>
              </div>

              <div className="form-group mb-2">
                <label>Nature of Work / Description</label>
                <textarea className="form-control" style={{ minHeight: '80px' }} value={workOrderData.workDescription} onChange={(e) => setWorkOrderData({ ...workOrderData, workDescription: e.target.value })} placeholder="General description of the work..." />
              </div>

              <div className="form-group mb-2">
                <label>Work Details / Actions Taken</label>
                <textarea className="form-control" style={{ minHeight: '120px' }} value={workOrderData.workDetails} onChange={(e) => setWorkOrderData({ ...workOrderData, workDetails: e.target.value })} placeholder="List specific actions taken, parts replaced, etc..." />
              </div>

              <div className="mb-2">
                <div className="section-header-row">
                  <h3 className="section-title">Materials & Inventory Tracking</h3>
                  <button onClick={() => addMaterialRow(showWorkOrder.id)} className="btn-small btn-add-material">+ Add Material</button>
                </div>
                <div className="responsive-table-wrapper">
                  <table className="work-order-table">
                    <thead>
                      <tr>
                        <th>Material Name</th>
                        <th>Source</th>
                        <th>Qty In</th>
                        <th>Qty Used</th>
                        <th>Qty Out</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(materials[showWorkOrder.id] || []).map((m) => (
                        <tr key={m.id || m.material_id}>
                          <td><input className="table-input" value={m.material_name} onChange={(e) => updateMaterial(showWorkOrder.id, m.id || m.material_id, 'material_name', e.target.value)} /></td>
                          <td>
                            <select className="table-input" value={m.material_source} onChange={(e) => updateMaterial(showWorkOrder.id, m.id || m.material_id, 'material_source', e.target.value)}>
                              <option value="stock">Stock</option>
                              <option value="purchased">Purchased</option>
                              <option value="donated">Donated</option>
                            </select>
                          </td>
                          <td><input type="number" className="table-input" value={m.qty_in} onChange={(e) => updateMaterial(showWorkOrder.id, m.id || m.material_id, 'qty_in', e.target.value)} /></td>
                          <td><input type="number" className="table-input" value={m.qty_used} onChange={(e) => updateMaterial(showWorkOrder.id, m.id || m.material_id, 'qty_used', e.target.value)} /></td>
                          <td><input type="number" className="table-input" value={m.qty_out} onChange={(e) => updateMaterial(showWorkOrder.id, m.id || m.material_id, 'qty_out', e.target.value)} /></td>
                          <td style={{ textAlign: 'center' }}>
                            <button onClick={() => removeMaterialRow(showWorkOrder.id, m.id || m.material_id)} className="btn-delete-row"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                      {(materials[showWorkOrder.id] || []).length === 0 && (
                        <tr><td colSpan="6" className="empty-table-msg">No materials added yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="work-order-grid-3">
                <div className="form-group">
                  <label>Requested By</label>
                  <input className="form-control" value={workOrderData.requestedBy} onChange={(e) => setWorkOrderData({ ...workOrderData, requestedBy: e.target.value })} placeholder="Name of Requestor" />
                </div>
                <div className="form-group">
                  <label>Inspected By</label>
                  <input className="form-control" value={workOrderData.inspectedBy} onChange={(e) => setWorkOrderData({ ...workOrderData, inspectedBy: e.target.value })} placeholder="Name of Inspector" />
                </div>
                <div className="form-group">
                  <label>Conformed By</label>
                  <input className="form-control" value={workOrderData.conformedBy} onChange={(e) => setWorkOrderData({ ...workOrderData, conformedBy: e.target.value })} placeholder="End User Signature/Name" />
                </div>
              </div>

              <div className="modal-footer-actions">
                <button onClick={() => setShowWorkOrder(null)} className="btn-small modal-btn">Cancel</button>
                {isAdmin && showWorkOrder.approval_status !== 'Approved' && (
                  <button onClick={() => approveWorkOrder('Approved')} className="btn-small modal-btn btn-approve">Approve Order</button>
                )}
                {isAdmin && showWorkOrder.approval_status !== 'Rejected' && (
                  <button onClick={() => approveWorkOrder('Rejected')} className="btn-small modal-btn btn-reject">Reject Order</button>
                )}
                <button onClick={saveWorkOrder} className="btn-primary modal-btn-save">Save Work Order</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Equipment QR Modal */}
      <AnimatePresence>
        {showEquipmentQR && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="card" style={{ maxWidth: '400px', width: '100%', position: 'relative', textAlign: 'center' }}>
              <button onClick={() => setShowEquipmentQR(null)} style={{ position: 'absolute', right: '15px', top: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><XCircle size={24} /></button>
              <div className="icon-box-md" style={{ margin: '0 auto 1.5rem', background: 'rgba(15, 118, 110, 0.1)', color: 'var(--primary)' }}><Wrench size={30} /></div>
              <h3 style={{ margin: '0 0 10px' }}>Equipment QR Code</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Technicians can scan this QR to link <strong>{showEquipmentQR.name}</strong> to their task.</p>

              <div style={{ background: '#fff', padding: '20px', borderRadius: '20px', display: 'inline-block', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                {showEquipmentQR.qr_token ? (
                  <QRCodeSVG
                    id={`qr-equipment-${showEquipmentQR.id}`}
                    value={showEquipmentQR.qr_token}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                ) : (
                  <div style={{ padding: '80px 20px', color: '#dc2626', fontWeight: 'bold' }}>
                    Missing QR Token
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)', marginTop: '1rem', marginBottom: '1.5rem' }}>
                Token: {showEquipmentQR.qr_token}
              </div>

              <button
                onClick={() => downloadEquipmentQR(showEquipmentQR)}
                className="btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Download size={18} /> Download for Print
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.9)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              cursor: 'zoom-out'
            }}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={zoomedImage}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
              }}
            />
            <button
              onClick={() => setZoomedImage(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                padding: '10px',
                borderRadius: '50%',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

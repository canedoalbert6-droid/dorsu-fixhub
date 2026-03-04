import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { RefreshCcw, CheckCircle, Clock, Construction, List, BarChart3, Grid, FileText, Map as MapIcon, AlertCircle, Lightbulb, Bell, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Analytics from './Analytics';

const API_URL = `http://${window.location.hostname}:5000/api`;
const SOCKET_URL = `http://${window.location.hostname}:5000`;

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [buildingHealth, setBuildingHealth] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'stats', 'map'
  const [viewType, setViewType] = useState('grid');
  const [editingNotes, setEditingNotes] = useState(null); // ID of report being edited

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repRes, healthRes] = await Promise.all([
        axios.get(`${API_URL}/reports`),
        axios.get(`${API_URL}/buildings/health`)
      ]);
      setReports(repRes.data);
      setBuildingHealth(healthRes.data);
    } catch (error) {
      toast.error('Sync failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 

    const socket = io(SOCKET_URL);
    const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    
    socket.on('connect', () => console.log('✅ Connected to Real-time Server'));

    socket.on('newReport', (data) => {
      notificationSound.play().catch(() => {});
      fetchData();
      toast.success(`New ${data.reportType}: ${data.issue} at ${data.locationId}`, { icon: '🔔' });
    });

    return () => socket.disconnect();
  }, []);

  const handleUpdate = async (id, status, notes) => {
    const loadingToast = toast.loading('Saving changes...');
    try {
      await axios.patch(`${API_URL}/reports/${id}`, { status, adminNotes: notes });
      setReports(reports.map(r => r.id === id ? { ...r, status: status || r.status, admin_notes: notes } : r));
      toast.success('Updated!', { id: loadingToast });
      setEditingNotes(null);
    } catch (error) {
      toast.error('Update failed.', { id: loadingToast });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report permanently?')) return;
    const loadingToast = toast.loading('Deleting...');
    try {
      await axios.delete(`${API_URL}/reports/${id}`);
      setReports(reports.filter(r => r.id !== id));
      toast.success('Deleted successfully', { id: loadingToast });
    } catch (error) {
      toast.error('Delete failed', { id: loadingToast });
    }
  };

  const generatePDF = () => {
    toast.success('Preparing PDF...');
    const doc = new jsPDF();
    const tableColumn = ["Type", "Location", "Issue", "Priority", "Status"];
    const tableRows = filteredReports.map(r => [
      r.report_type, r.location_id, r.issue, r.priority, r.status
    ]);
    doc.setFontSize(18);
    doc.setTextColor(21, 128, 61);
    doc.text("DOrSU FixHub Management Summary", 14, 20);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, theme: 'striped', headStyles: { fillColor: [21, 128, 61] } });
    doc.save(`DOrSU-Summary-${Date.now()}.pdf`);
  };

  const filteredReports = reports.filter(r => filterStatus === 'All' ? true : r.status === filterStatus);

  const getPriorityColor = (p) => {
    if (p === 'Emergency') return '#dc2626';
    if (p === 'High') return '#ea580c';
    if (p === 'Medium') return '#ca8a04';
    return '#64748b';
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="tab-switcher">
          <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}><List size={18} /> Inbox</button>
          <button className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}><MapIcon size={18} /> Campus Map</button>
          <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}><BarChart3 size={18} /> Insights</button>
        </div>
        
        <div className="controls">
          {activeTab === 'list' && (
            <select className="filter-dropdown" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="All">Filter: All</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          )}
          <button onClick={fetchData} className="btn-icon"><RefreshCcw size={20} /></button>
          <button onClick={generatePDF} className="btn-icon"><FileText size={20} /></button>
        </div>
      </div>

      {activeTab === 'map' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Visual Campus Health Monitor</h3>
          <div className="building-map-grid">
            {['BLDG-A-101', 'BLDG-B-LAB', 'CANTEEN', 'GYM'].map(loc => {
              const health = buildingHealth.find(h => h.location_id === loc) || { pending_count: 0 };
              const color = health.pending_count > 3 ? '#ef4444' : health.pending_count > 0 ? '#f59e0b' : '#10b981';
              return (
                <motion.div whileHover={{ scale: 1.05 }} key={loc} className="building-tile" style={{ borderTop: `6px solid ${color}` }}>
                  <h4>{loc}</h4>
                  <div className="health-stat">{health.pending_count} Issues</div>
                  <div className="health-bar"><div style={{ width: `${Math.min(health.pending_count * 20, 100)}%`, background: color }}></div></div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'stats' && <Analytics reports={reports} />}

      {activeTab === 'list' && (
        <div className={`report-grid ${viewType === 'list' ? 'list-view' : ''}`}>
          <AnimatePresence>
            {filteredReports.map((report) => (
              <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={report.id} className={`report-card ${report.priority === 'Emergency' ? 'pulse-red' : ''}`}>
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

                {report.image_url && (
                  <div className="image-preview" style={{ marginTop: '1rem' }}>
                    <img src={`http://${window.location.hostname}:5000${report.image_url}`} alt="issue" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px' }} />
                  </div>
                )}

                {report.admin_notes && (
                  <div className="admin-notes-box">
                    <strong>Logs:</strong> {report.admin_notes}
                  </div>
                )}

                <div className="card-footer">
                  <div className="actions">
                    {/* NEW DELETE BUTTON */}
                    <button onClick={() => handleDelete(report.id)} className="btn-small icon-red" style={{ padding: '8px', border: 'none', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }} title="Delete Permanent">
                      <Trash2 size={16} />
                    </button>
                    
                    {report.status !== 'Resolved' && (
                      <button onClick={() => setEditingNotes(report.id)} className="btn-small">Add Log</button>
                    )}
                    <select 
                      value={report.status} 
                      onChange={(e) => handleUpdate(report.id, e.target.value, report.admin_notes)}
                      className="status-select"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                {editingNotes === report.id && (
                  <div className="notes-modal">
                    <textarea placeholder="Type log..." defaultValue={report.admin_notes} onBlur={(e) => handleUpdate(report.id, report.status, e.target.value)} autoFocus></textarea>
                    <button onClick={() => setEditingNotes(null)} className="btn-primary" style={{ padding: '8px' }}>Save Log</button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

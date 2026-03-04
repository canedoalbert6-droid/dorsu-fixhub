import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCcw, CheckCircle, Clock, Construction, List, BarChart3, Grid, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Analytics from './Analytics';

const API_URL = `http://${window.location.hostname}:5000/api`;

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [viewType, setViewType] = useState('grid');
// ... rest of state code

  const generatePDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["ID", "Location", "Issue", "Status", "Date Submitted"];
    const tableRows = [];

    filteredReports.forEach(report => {
      const reportData = [
        report.id.substring(0, 8),
        report.locationId,
        report.issue,
        report.status,
        new Date(report.createdAt).toLocaleDateString()
      ];
      tableRows.push(reportData);
    });

    // Add DOrSU Branding
    doc.setFontSize(18);
    doc.setTextColor(21, 128, 61); // DOrSU Green
    doc.text("DOrSU FixHub: Maintenance Report", 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Status Filter: ${filterStatus}`, 14, 37);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [21, 128, 61] } // DOrSU Green header
    });

    doc.save(`DOrSU-Maintenance-Report-${new Date().toLocaleDateString()}.pdf`);
  };

  const fetchReports = async () => {
// ... rest of code
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/reports`);
      setReports(res.data);
    } catch (error) {
      console.error('Error fetching reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.patch(`${API_URL}/reports/${id}`, { status });
      setReports(reports.map(r => r.id === id ? { ...r, status } : r));
    } catch (error) {
      alert('Error updating status');
    }
  };

  const filteredReports = reports.filter(r => 
    filterStatus === 'All' ? true : r.status === filterStatus
  );

  const getBadgeClass = (status) => {
    if (status === 'In Progress') return 'badge-In';
    return `badge-${status}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return <Clock size={16} />;
      case 'In Progress': return <Construction size={16} />;
      case 'Resolved': return <CheckCircle size={16} />;
      default: return null;
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="tab-switcher">
          <button 
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <List size={18} /> Reports List
          </button>
          <button 
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 size={18} /> Stats & Analytics
          </button>
        </div>
        
        <div className="controls">
          {activeTab === 'list' && (
            <>
              <div className="view-toggle">
                <button className={viewType === 'grid' ? 'active' : ''} onClick={() => setViewType('grid')}><Grid size={18} /></button>
                <button className={viewType === 'list' ? 'active' : ''} onClick={() => setViewType('list')}><List size={18} /></button>
              </div>
              <select 
                className="filter-dropdown"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </>
          )}
          <button onClick={fetchReports} className="btn-icon" title="Refresh Data"><RefreshCcw size={20} /></button>
          <button onClick={generatePDF} className="btn-icon" title="Export PDF Report" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
            <FileText size={20} />
          </button>
        </div>
      </div>

      {activeTab === 'stats' ? (
        <Analytics reports={reports} />
      ) : (
        <div className={`report-grid ${viewType === 'list' ? 'list-view' : ''}`}>
          {loading ? <p>Loading reports...</p> : 
            filteredReports.length === 0 ? <p>No reports found.</p> :
            filteredReports.map(report => (
              <div key={report.id} className="report-card">
                <div className={`report-badge ${getBadgeClass(report.status)}`}>
                  {getStatusIcon(report.status)} {report.status}
                </div>
                <h3>{report.issue}</h3>
                <p className="loc-label">Location: {report.locationId}</p>
                <p className="desc">{report.description}</p>
                
                {report.imageUrl && (
                  <div className="image-preview">
                    <a href={`http://${window.location.hostname}:5000${report.imageUrl}`} target="_blank" rel="noreferrer">
                      <img src={`http://${window.location.hostname}:5000${report.imageUrl}`} alt="issue" style={{ maxHeight: '120px', width: '100%', objectFit: 'cover' }} />
                    </a>
                  </div>
                )}

                <div className="card-footer">
                  <p className="date">{new Date(report.createdAt).toLocaleString()}</p>
                  <div className="actions">
                    {report.status !== 'In Progress' && report.status !== 'Resolved' && (
                      <button onClick={() => handleStatusUpdate(report.id, 'In Progress')} className="btn-small progress">Start Work</button>
                    )}
                    {report.status !== 'Resolved' && (
                      <button onClick={() => handleStatusUpdate(report.id, 'Resolved')} className="btn-small resolve">Resolve</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

// ViewModel: Admin Dashboard — reports, filters, comments, PDF, real-time socket

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { SOCKET_URL } from '../utils/config';
import { getRole, getUserId } from '../models/authModel';
import {
  fetchReports,
  fetchBuildingHealth,
  fetchRecurringIssues,
  fetchComments as fetchCommentsService,
  addComment as addCommentService,
  updateReport,
  deleteReport,
  scanTechnicianQR,
} from '../services/reportService';

/**
 * Manages all admin dashboard state, actions, and real-time subscriptions.
 * Used by AdminDashboard.jsx.
 */
export const useAdminViewModel = (addNotification) => {
  const [reports, setReports] = useState([]);
  const [buildingHealth, setBuildingHealth] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [viewType, setViewType] = useState('grid');
  const [editingNotes, setEditingNotes] = useState(null);
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState(null);
  const [commentInput, setCommentInput] = useState({});
  const [recurringIssues, setRecurringIssues] = useState([]);
  const [userRole] = useState(() => getRole());
  const [pendingCount, setPendingCount] = useState(0);
  const [slaBreachedCount, setSlaBreachedCount] = useState(0);

  // ── Data Fetching ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [repData, healthData] = await Promise.all([
        fetchReports({ page: 1, limit: 100 }),
        fetchBuildingHealth(),
      ]);
      setReports(repData.data);
      setBuildingHealth(healthData);
      setPendingCount(repData.data.filter(r => r.status === 'Pending').length);
      setSlaBreachedCount(repData.data.filter(r => r.sla_breached === 1 && r.status !== 'Resolved').length);
    } catch {
      toast.error('Sync failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecurring = useCallback(async () => {
    try {
      setRecurringIssues(await fetchRecurringIssues());
    } catch { /* silent */ }
  }, []);

  const loadComments = useCallback(async (reportId) => {
    try {
      const data = await fetchCommentsService(reportId);
      setComments(prev => ({ ...prev, [reportId]: data }));
    } catch {
      setComments(prev => ({ ...prev, [reportId]: [] }));
    }
  }, []);

  // ── Socket + Keyboard ─────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
    if (userRole === 'Admin') {
      loadRecurring();
    }

    const socket = io(SOCKET_URL);
    const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    socket.on('connect', () => console.log('✅ Dashboard Socket: Connected'));
    socket.on('newReport', (data) => {
      loadData();
      toast.success(`New ${data.reportType}: ${data.issue} at ${data.locationId}`, { icon: '🔔' });
    });
    socket.on('reportUpdated', () => loadData());
    socket.on('reportAssigned', (data) => {
      loadData();
      if (data.technicianId === getUserId()) {
        toast.success(`You have been assigned to: ${data.report.issue}`, { icon: '🔧' });
      } else if (getRole() === 'Admin') {
        toast.success(`Report assigned to technician.`);
      }
    });
    socket.on('slaBreached', (data) => {
      toast.error(`SLA Breached: ${data.issue} at ${data.locationId}`, { icon: '⚠️' });
      setSlaBreachedCount(prev => prev + 1);
    });
    socket.on('commentsUpdated', (data) => {
      setComments(prev => ({ ...prev, [data.reportId]: data.comments }));
    });

    return () => socket.disconnect();
  }, [loadData, loadRecurring, addNotification]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'r') { e.preventDefault(); loadData(); }
      if (e.key === 'Escape') { setEditingNotes(null); setShowComments(null); }
      if (e.ctrlKey && e.key === '1') { e.preventDefault(); setActiveTab('list'); }
      if (e.ctrlKey && e.key === '2') { e.preventDefault(); setActiveTab('map'); }
      if (e.ctrlKey && e.key === '3') { e.preventDefault(); setActiveTab('stats'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadData]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleUpdate = async (id, status, notes, timeSpentMinutes) => {
    const loadingToast = toast.loading('Saving changes...');
    try {
      await updateReport(id, { status, adminNotes: notes, timeSpentMinutes });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: status || r.status, admin_notes: notes, time_spent_minutes: timeSpentMinutes || r.time_spent_minutes } : r));
      toast.success('Updated!', { id: loadingToast });
      setEditingNotes(null);
    } catch {
      toast.error('Update failed.', { id: loadingToast });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report permanently?')) return;
    const loadingToast = toast.loading('Deleting...');
    try {
      await deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('Deleted successfully', { id: loadingToast });
    } catch {
      toast.error('Delete failed', { id: loadingToast });
    }
  };

  const handleAddComment = async (reportId) => {
    const text = (commentInput[reportId] || '').trim();
    if (!text) return;
    try {
      const res = await addCommentService(reportId, text);
      setComments(prev => ({ ...prev, [reportId]: res.comments }));
      setCommentInput(prev => ({ ...prev, [reportId]: '' }));
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleScan = useCallback(async (reportId, qrToken) => {
    try {
      const res = await scanTechnicianQR(reportId, qrToken);
      toast.success(res.message);
      loadData();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scan failed.');
      return false;
    }
  }, [loadData]);

  const generatePDF = () => {
    toast.success('Preparing PDF...');
    const doc = new jsPDF();
    const tableColumn = ['Type', 'Location', 'Issue', 'Priority', 'Status'];
    const tableRows = filteredReports.map(r => [r.report_type, r.location_id, r.issue, r.priority, r.status]);
    doc.setFontSize(18);
    doc.setTextColor(21, 128, 61);
    doc.text('DOrSU FixHub Management Summary', 14, 20);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, theme: 'striped', headStyles: { fillColor: [21, 128, 61] } });
    doc.save(`DOrSU-Summary-${Date.now()}.pdf`);
  };

  // ── Derived State ──────────────────────────────────────────────────────────

  const filteredReports = reports.filter(r => filterStatus === 'All' ? true : r.status === filterStatus);
  const canEdit = userRole === 'Admin' || userRole === 'Technician';
  const canDelete = userRole === 'Admin';

  const canEditReport = (report) => {
    if (userRole === 'Admin') return true;
    if (userRole === 'Technician') {
      return report.assigned_to === getUserId() || !report.assigned_to;
    }
    return false;
  };

  return {
    reports,
    buildingHealth,
    filteredReports,
    filterStatus,
    setFilterStatus,
    loading,
    activeTab,
    setActiveTab,
    viewType,
    setViewType,
    editingNotes,
    setEditingNotes,
    comments,
    showComments,
    setShowComments,
    commentInput,
    setCommentInput,
    recurringIssues,
    userRole,
    pendingCount,
    slaBreachedCount,
    canEdit,
    canDelete,
    canEditReport,
    loadData,
    loadComments,
    handleUpdate,
    handleDelete,
    handleAddComment,
    handleScan,
    generatePDF,
  };
};

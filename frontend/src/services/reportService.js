// Service: Report API calls and offline queue helpers

import axios from 'axios';
import { API_URL } from '../utils/config';
import { getAuthHeader } from '../models/authModel';

// ─── Reports ──────────────────────────────────────────────────────────────────

export const fetchReports = async ({ page = 1, limit = 100, status, type } = {}) => {
  const params = { page, limit };
  if (status && status !== 'All') params.status = status;
  if (type) params.type = type;
  const res = await axios.get(`${API_URL}/reports`, { params, headers: getAuthHeader() });
  return res.data;
};

export const submitReport = async (formData) => {
  const res = await axios.post(`${API_URL}/reports`, formData);
  return res.data;
};

export const trackReport = async (trackingCode) => {
  const res = await axios.get(`${API_URL}/reports/track/${trackingCode}`);
  return res.data;
};

export const updateReport = async (id, { status, adminNotes, timeSpentMinutes }) => {
  const res = await axios.patch(
    `${API_URL}/reports/${id}`,
    { 
      status: status ?? undefined, 
      adminNotes: adminNotes ?? undefined,
      timeSpentMinutes: timeSpentMinutes ?? undefined
    },
    { headers: getAuthHeader() }
  );
  return res.data;
};

export const deleteReport = async (id) => {
  const res = await axios.delete(`${API_URL}/reports/${id}`, {
    headers: getAuthHeader(),
  });
  return res.data;
};

// ─── Technician & Assignment ──────────────────────────────────────────────────

export const uploadAfterFixPhoto = async (reportId, file) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await axios.post(`${API_URL}/reports/${reportId}/after-fix`, formData, {
    headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const assignReport = async (reportId, technicianId) => {
  const res = await axios.post(`${API_URL}/reports/${reportId}/assign`, { technicianId }, {
    headers: getAuthHeader()
  });
  return res.data;
};

export const unassignReport = async (reportId) => {
  const res = await axios.delete(`${API_URL}/reports/${reportId}/assign`, {
    headers: getAuthHeader()
  });
  return res.data;
};

export const scanTechnicianQR = async (reportId, qrToken) => {
  const res = await axios.post(`${API_URL}/reports/${reportId}/scan`, { qrToken }, {
    headers: getAuthHeader()
  });
  return res.data;
};

export const fetchTechnicians = async () => {
  const res = await axios.get(`${API_URL}/technicians`, { headers: getAuthHeader() });
  return res.data;
};

export const fetchTechnicianStats = async () => {
  const res = await axios.get(`${API_URL}/technicians/stats`, { headers: getAuthHeader() });
  return res.data;
};

// ─── Comments ─────────────────────────────────────────────────────────────────

export const fetchComments = async (reportId) => {
  const res = await axios.get(`${API_URL}/reports/${reportId}/comments`, {
    headers: getAuthHeader(),
  });
  return res.data;
};

export const addComment = async (reportId, commentText) => {
  const res = await axios.post(
    `${API_URL}/reports/${reportId}/comments`,
    { commentText },
    { headers: getAuthHeader() }
  );
  return res.data;
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const fetchBuildingHealth = async () => {
  const res = await axios.get(`${API_URL}/buildings/health`);
  return res.data;
};

export const fetchRecurringIssues = async () => {
  const res = await axios.get(`${API_URL}/analytics/recurring`, {
    headers: getAuthHeader(),
  });
  return res.data;
};

export const fetchPublicStatus = async () => {
  const res = await axios.get(`${API_URL}/public/status`);
  return res.data;
};

// ─── Admin Management ─────────────────────────────────────────────────────────

export const fetchAdminUsers = async () => {
  const res = await axios.get(`${API_URL}/admins`, { headers: getAuthHeader() });
  return res.data;
};

export const createAdminUser = async (userData) => {
  const res = await axios.post(`${API_URL}/admins`, userData, { headers: getAuthHeader() });
  return res.data;
};

export const deleteAdminUser = async (userId) => {
  const res = await axios.delete(`${API_URL}/admins/${userId}`, { headers: getAuthHeader() });
  return res.data;
};

// ─── Location Management ──────────────────────────────────────────────────────

export const fetchLocations = async () => {
  const res = await axios.get(`${API_URL}/locations`, { headers: getAuthHeader() });
  return res.data;
};

export const createLocation = async (locData) => {
  const res = await axios.post(`${API_URL}/locations`, locData, { headers: getAuthHeader() });
  return res.data;
};

export const deleteLocation = async (locId) => {
  const res = await axios.delete(`${API_URL}/locations/${locId}`, { headers: getAuthHeader() });
  return res.data;
};

// ─── Offline Queue ─────────────────────────────────────────────────────────────

export const saveOfflineReport = (reportData) => {
  const queue = JSON.parse(localStorage.getItem('offlineReports') || '[]');
  queue.push({ ...reportData, image: null, queuedAt: new Date().toISOString() });
  localStorage.setItem('offlineReports', JSON.stringify(queue));
};

export const getOfflineReports = () =>
  JSON.parse(localStorage.getItem('offlineReports') || '[]');

export const clearOfflineReports = () =>
  localStorage.removeItem('offlineReports');

export const syncOfflineReports = async () => {
  const offline = getOfflineReports();
  if (offline.length === 0) return 0;
  let synced = 0;
  for (const report of offline) {
    try {
      const formData = new FormData();
      formData.append('locationId', report.locationId);
      formData.append('reportType', report.reportType);
      formData.append('issue', report.issue);
      formData.append('description', report.description);
      const res = await axios.post(`${API_URL}/reports`, formData);
      if (res.status === 201 || res.status === 200) {
        synced++;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  if (synced > 0) {
    const remaining = offline.slice(synced);
    if (remaining.length === 0) {
      clearOfflineReports();
    } else {
      localStorage.setItem('offlineReports', JSON.stringify(remaining));
    }
  }
  return synced;
};

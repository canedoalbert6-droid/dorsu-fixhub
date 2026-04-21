// ViewModel: Report submission form

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { compressImage } from '../utils/config';
import { fetchLocation, fetchRecentReportsForLocation } from '../services/locationService';
import { submitReport, saveOfflineReport, syncOfflineReports, getOfflineReports } from '../services/reportService';
import { REPORT_TYPE } from '../models/reportModel';

/**
 * Manages the full report submission form lifecycle.
 * Used by ReportingPage.jsx.
 */
export const useReportingViewModel = () => {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('loc') || 'UNKNOWN';

  const [locationName, setLocationName] = useState('Loading location...');
  const [reportType, setReportType] = useState(REPORT_TYPE.MAINTENANCE);
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [trackingCode, setTrackingCode] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const syncPending = useCallback(async () => {
    const count = await syncOfflineReports();
    if (count > 0) {
      toast.success(`${count} offline report(s) synced!`);
      setPendingCount(0);
    }
  }, []);

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncPending(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPending]);

  // Fetch location name and recent reports
  useEffect(() => {
    if (!isOnline) return;
    fetchLocation(locationId)
      .then(res => setLocationName(res.name))
      .catch(() => setLocationName('Main Campus'));
    fetchRecentReportsForLocation(locationId)
      .then(setRecentReports)
      .catch(() => { });
    setPendingCount(getOfflineReports().length);
  }, [locationId, isOnline]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setImage(await compressImage(file));
    } catch {
      setImage(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = toast.loading('Submitting to DOrSU FixHub...');

    const formData = new FormData();
    formData.append('locationId', locationId);
    formData.append('reportType', reportType);
    formData.append('issue', issue);
    formData.append('description', description);
    if (image) formData.append('image', image);

    if (isOnline) {
      try {
        const res = await submitReport(formData);
        setTrackingCode(res.trackingCode);
        setSubmitted(true);
        toast.success('Submitted successfully!', { id: loadingToast });
      } catch {
        toast.error('Submission failed. Saving offline.', { id: loadingToast });
        saveOfflineReport({ locationId, reportType, issue, description });
        setPendingCount(prev => prev + 1);
      }
    } else {
      saveOfflineReport({ locationId, reportType, issue, description });
      setPendingCount(prev => prev + 1);
      toast.success('Saved offline. Will sync when connected.', { id: loadingToast });
      setSubmitted(true);
    }
    setLoading(false);
  };

  return {
    locationId,
    locationName,
    reportType,
    setReportType,
    issue,
    setIssue,
    description,
    setDescription,
    image,
    submitted,
    loading,
    recentReports,
    trackingCode,
    isOnline,
    pendingCount,
    handleImageChange,
    handleSubmit,
  };
};

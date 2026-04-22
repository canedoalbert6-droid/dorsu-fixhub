// ViewModel: Report tracking (public)

import { useState } from 'react';
import toast from 'react-hot-toast';
import { trackReport, rateWorkmanship } from '../services/reportService';

/**
 * Manages the report tracking form and result display.
 * Used by TrackingPage.jsx.
 */
export const useTrackingViewModel = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const data = await trackReport(trackingCode.trim());
      setReport(data);
    } catch {
      setError('Report not found. Check your tracking code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (rating) => {
    try {
      await rateWorkmanship(trackingCode.trim(), rating);
      toast.success('Thank you for your feedback!');
      // Refresh report data to show the new rating
      const data = await trackReport(trackingCode.trim());
      setReport(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit rating.');
    }
  };

  return {
    trackingCode,
    setTrackingCode,
    report,
    loading,
    error,
    handleTrack,
    handleRate,
  };
};

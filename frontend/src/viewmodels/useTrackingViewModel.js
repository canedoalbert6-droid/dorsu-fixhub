// ViewModel: Report tracking (public)

import { useState } from 'react';
import { trackReport } from '../services/reportService';

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
    e.preventDefault();
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

  return {
    trackingCode,
    setTrackingCode,
    report,
    loading,
    error,
    handleTrack,
  };
};

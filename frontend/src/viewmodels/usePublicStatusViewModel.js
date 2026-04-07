// ViewModel: Public status page data

import { useState, useEffect } from 'react';
import { fetchPublicStatus } from '../services/reportService';

/**
 * Fetches and exposes public status data.
 * Used by PublicStatusPage.jsx.
 */
export const usePublicStatusViewModel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicStatus()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = data?.summary?.total || 0;
  const pct = (val) => (total ? Math.round((val / total) * 100) : 0);

  return { data, loading, total, pct };
};

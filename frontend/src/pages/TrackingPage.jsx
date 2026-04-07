// View: Report tracking — UI only, logic via useTrackingViewModel
import React from 'react';
import { motion } from 'framer-motion';
import { Search, Clock, CheckCircle, AlertCircle, MapPin, Lightbulb, Wrench } from 'lucide-react';
import { useTrackingViewModel } from '../viewmodels/useTrackingViewModel';
import { PRIORITY_COLORS } from '../models/reportModel';

const getStatusIcon = (status) => {
  if (status === 'Resolved') return <CheckCircle size={20} color="#10b981" />;
  if (status === 'In Progress') return <Clock size={20} color="#f59e0b" />;
  return <AlertCircle size={20} color="#64748b" />;
};

const getPriorityBadge = (priority) => (
  <span style={{ background: PRIORITY_COLORS[priority] || '#64748b', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
    {priority}
  </span>
);

const TrackingPage = () => {
  const { trackingCode, setTrackingCode, report, loading, error, handleTrack } = useTrackingViewModel();

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Track Your Report</h2>
        <p style={{ color: 'var(--text-muted)' }}>Enter your tracking code to check status</p>
      </div>

      <form onSubmit={handleTrack} style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. FIX-ABC12345"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
          style={{ flex: 1 }}
          required
        />
        <button type="submit" disabled={loading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} /> {loading ? 'Searching...' : 'Track'}
        </button>
      </form>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '12px', color: '#dc2626', textAlign: 'center' }}>{error}</div>}

      {report && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getStatusIcon(report.status)}
              <strong>{report.status}</strong>
            </div>
            {getPriorityBadge(report.priority)}
          </div>

          <div style={{ display: 'grid', gap: '12px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} color="var(--text-muted)" />
              <span>{report.location_id}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {report.report_type === 'Innovation' ? <Lightbulb size={16} color="var(--secondary)" /> : <Wrench size={16} color="var(--primary)" />}
              <span>{report.report_type}: {report.issue}</span>
            </div>
            <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {report.description}
            </div>
            {report.admin_notes && (
              <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', borderLeft: '3px solid #3b82f6' }}>
                <strong>Admin Note:</strong> {report.admin_notes}
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Submitted: {new Date(report.created_at).toLocaleString()}
              {report.resolved_at && <> • Resolved: {new Date(report.resolved_at).toLocaleString()}</>}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TrackingPage;

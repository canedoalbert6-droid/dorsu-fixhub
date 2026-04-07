// View: Public status — UI only, logic via usePublicStatusViewModel
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, AlertTriangle, MapPin } from 'lucide-react';
import { usePublicStatusViewModel } from '../viewmodels/usePublicStatusViewModel';

const PublicStatusPage = () => {
  const { data, loading, total, pct } = usePublicStatusViewModel();

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading campus status...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '4rem' }}>Failed to load data.</div>;

  const { summary, locations } = data;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Campus Maintenance Status</h2>
        <p style={{ color: 'var(--text-muted)' }}>Real-time overview of DOrSU FixHub reports</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: total, icon: <AlertCircle size={20} />, color: '#64748b' },
          { label: 'Pending', value: summary.pending, icon: <Clock size={20} />, color: '#f59e0b' },
          { label: 'In Progress', value: summary.in_progress, icon: <MapPin size={20} />, color: '#3b82f6' },
          { label: 'Resolved', value: summary.resolved, icon: <CheckCircle size={20} />, color: '#10b981' },
          { label: 'SLA Breached', value: summary.breached, icon: <AlertTriangle size={20} />, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ color: s.color, marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${pct(summary.pending)}%`, background: '#f59e0b' }} title={`Pending: ${pct(summary.pending)}%`} />
            <div style={{ width: `${pct(summary.in_progress)}%`, background: '#3b82f6' }} title={`In Progress: ${pct(summary.in_progress)}%`} />
            <div style={{ width: `${pct(summary.resolved)}%`, background: '#10b981' }} title={`Resolved: ${pct(summary.resolved)}%`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>🟡 Pending {pct(summary.pending)}%</span>
            <span>🔵 In Progress {pct(summary.in_progress)}%</span>
            <span>🟢 Resolved {pct(summary.resolved)}%</span>
          </div>
        </div>
      )}

      {/* Per-Location Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {locations.filter(l => l.total_reports > 0).map(loc => {
          const resolvedPct = loc.total_reports ? Math.round((loc.resolved_reports / loc.total_reports) * 100) : 0;
          const color = resolvedPct >= 80 ? '#10b981' : resolvedPct >= 50 ? '#f59e0b' : '#ef4444';
          return (
            <div key={loc.location_id} style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', borderTop: `4px solid ${color}` }}>
              <strong style={{ fontSize: '0.85rem' }}>{loc.name}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {loc.resolved_reports}/{loc.total_reports} resolved ({resolvedPct}%)
              </div>
              <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${resolvedPct}%`, background: color, height: '100%', transition: 'width 0.5s' }} />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default PublicStatusPage;

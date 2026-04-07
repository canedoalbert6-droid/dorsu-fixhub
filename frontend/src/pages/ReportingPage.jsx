// View: Report submission — UI only, logic via useReportingViewModel
import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Send, CheckCircle, Lightbulb, Wrench, WifiOff } from 'lucide-react';
import { useReportingViewModel } from '../viewmodels/useReportingViewModel';
import { REPORT_TYPE, MAINTENANCE_ISSUES, INNOVATION_ISSUES } from '../models/reportModel';

const ReportingPage = () => {
  const {
    locationName,
    reportType, setReportType,
    issue, setIssue,
    description, setDescription,
    image,
    submitted,
    loading,
    trackingCode,
    isOnline,
    pendingCount,
    handleImageChange,
    handleSubmit,
  } = useReportingViewModel();

  if (submitted) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card text-center success-message">
        <CheckCircle size={60} color="var(--primary)" />
        <h2 style={{ color: 'var(--primary)', marginTop: '1rem' }}>Success!</h2>
        <p>Your {reportType.toLowerCase()} entry has been logged for {locationName}.</p>
        {trackingCode && (
          <div style={{ background: 'rgba(21, 128, 61, 0.1)', padding: '12px 20px', borderRadius: '12px', margin: '1rem 0', display: 'inline-block' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tracking Code:</span>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '2px' }}>{trackingCode}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Save this to check your report status</span>
          </div>
        )}
        {pendingCount > 0 && (
          <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.5rem' }}>
            {pendingCount} report(s) queued for sync
          </div>
        )}
        <button onClick={() => window.location.reload()} className="btn-primary" style={{ margin: '1rem auto' }}>Finish</button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>DOrSU FixHub</h2>
        <p className="location-info">📍 {locationName}</p>
        {!isOnline && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px', color: '#f59e0b', fontSize: '0.8rem', fontWeight: '600' }}>
            <WifiOff size={14} /> Offline Mode — Reports will sync later
          </div>
        )}
        {pendingCount > 0 && (
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px' }}>
            {pendingCount} pending offline
          </div>
        )}
      </div>

      {/* Report Type Toggle */}
      <div style={{ display: 'flex', background: 'var(--bg)', padding: '8px', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
        <button
          onClick={() => setReportType(REPORT_TYPE.MAINTENANCE)}
          style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: reportType === REPORT_TYPE.MAINTENANCE ? 'var(--primary)' : 'transparent', color: reportType === REPORT_TYPE.MAINTENANCE ? '#fff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: '0.3s' }}
        >
          <div className={`icon-box-sm ${reportType === REPORT_TYPE.MAINTENANCE ? '' : 'icon-gold'}`} style={{ background: reportType === REPORT_TYPE.MAINTENANCE ? 'rgba(255,255,255,0.2)' : '', color: reportType === REPORT_TYPE.MAINTENANCE ? '#fff' : '' }}>
            <Wrench size={16} />
          </div>
          <span style={{ fontSize: '0.75rem' }}>Maintenance</span>
        </button>
        <button
          onClick={() => setReportType(REPORT_TYPE.INNOVATION)}
          style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: reportType === REPORT_TYPE.INNOVATION ? 'var(--secondary)' : 'transparent', color: reportType === REPORT_TYPE.INNOVATION ? '#fff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: '0.3s' }}
        >
          <div className={`icon-box-sm ${reportType === REPORT_TYPE.INNOVATION ? '' : 'icon-gold'}`} style={{ background: reportType === REPORT_TYPE.INNOVATION ? 'rgba(255,255,255,0.2)' : '', color: reportType === REPORT_TYPE.INNOVATION ? '#fff' : '' }}>
            <Lightbulb size={16} />
          </div>
          <span style={{ fontSize: '0.75rem' }}>Innovation</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{reportType === REPORT_TYPE.MAINTENANCE ? 'Issue Category' : 'Innovation Area'}</label>
          <select value={issue} onChange={(e) => setIssue(e.target.value)} required className="form-control">
            <option value="">Select...</option>
            {(reportType === REPORT_TYPE.MAINTENANCE ? MAINTENANCE_ISSUES : INNOVATION_ISSUES).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{reportType === REPORT_TYPE.MAINTENANCE ? 'Describe the Problem' : 'Describe your Suggestion'}</label>
          <textarea placeholder="Provide specific details..." value={description} onChange={(e) => setDescription(e.target.value)} className="form-control" rows="4" required></textarea>
        </div>

        <div className="form-group">
          <label className="upload-label">
            <Camera size={20} /> {image ? 'Change Image' : 'Attach Photo'}
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </label>
          {image && <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700' }}>✅ {image.name}</div>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary full-width" style={{ background: reportType === REPORT_TYPE.INNOVATION ? 'var(--secondary)' : 'var(--primary)' }}>
          {loading ? 'Processing...' : <><Send size={18} /> {reportType === REPORT_TYPE.MAINTENANCE ? 'Send Report' : 'Submit Idea'}</>}
        </button>
      </form>
    </motion.div>
  );
};

export default ReportingPage;

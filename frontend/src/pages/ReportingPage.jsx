// View: Simple Report submission for the public
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Send, CheckCircle, Lightbulb, Wrench, WifiOff, Copy, ExternalLink, AlertTriangle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReportingViewModel } from '../viewmodels/useReportingViewModel';
import { REPORT_TYPE, MAINTENANCE_ISSUES, INNOVATION_ISSUES } from '../models/reportModel';
import toast from 'react-hot-toast';

const ReportingPage = () => {
  const {
    locationName,
    reportType, setReportType,
    reporterName, setReporterName,
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

  const copyToClipboard = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      toast.success('Tracking code copied!');
    }
  };

  if (submitted) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card text-center success-card">
        <div className="icon-box-lg success-icon-wrapper">
          <CheckCircle size={48} />
        </div>
        <h2 className="success-title">Submission Received!</h2>
        <p className="success-desc">Your {reportType.toLowerCase()} entry has been logged for <strong>{locationName}</strong>.</p>
        
        {trackingCode && (
          <div className="tracking-id-container">
            <div className="tracking-reminder-header">
              <AlertTriangle size={16} /> IMPORTANT REMINDER
            </div>
            <p className="tracking-instruction">Please <strong>Save or Screenshot</strong> this Tracking ID. This is your only way to check the progress of your report.</p>
            
            <div className="tracking-id-box">
              <span className="tracking-id-value">{trackingCode}</span>
              <button onClick={copyToClipboard} className="btn-copy" title="Copy to clipboard">
                <Copy size={18} />
              </button>
            </div>

            <div className="tracking-link-wrapper">
              <Link to="/track" className="tracking-link hover-underline">
                <ExternalLink size={16} /> Go to Tracking Page
              </Link>
            </div>
          </div>
        )}

        {pendingCount > 0 && (
          <div className="offline-sync-badge">
            <WifiOff size={14} /> {pendingCount} report(s) will be synced when you go online.
          </div>
        )}
        
        <div className="success-actions">
          <button onClick={() => window.location.reload()} className="btn-primary success-btn">Submit Another</button>
          <Link to="/" className="btn-small success-btn-alt">Back to Home</Link>
        </div>
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
      </div>

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
          <label>Your Name <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.8rem' }}>(optional)</span></label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Juan Dela Cruz"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            maxLength={100}
          />
        </div>

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

        <button type="submit" disabled={loading} className="btn-primary full-width" style={{ background: reportType === REPORT_TYPE.INNOVATION ? 'var(--secondary)' : 'var(--primary)', marginBottom: '1.5rem' }}>
          {loading ? 'Processing...' : <><Send size={18} /> {reportType === REPORT_TYPE.MAINTENANCE ? 'Send Report' : 'Submit Idea'}</>}
        </button>

        <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <AlertCircle size={20} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
            <strong>Note:</strong> After submission, you will receive a unique <strong>Tracking ID</strong>. Please save it to monitor the progress of your repair or innovation suggestion.
          </p>
        </div>
      </form>
    </motion.div>
  );
};

export default ReportingPage;

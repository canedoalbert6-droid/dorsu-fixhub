import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Camera, Send, CheckCircle, Lightbulb, Wrench } from 'lucide-react';

const API_URL = `http://${window.location.hostname}:5000/api`;

const ReportingPage = () => {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('loc') || 'UNKNOWN';
  const [locationName, setLocationName] = useState('Loading location...');
  const [reportType, setReportType] = useState('Maintenance'); // Maintenance or Innovation
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/locations/${locationId}`)
      .then(res => setLocationName(res.data.name))
      .catch(() => setLocationName('General Campus Area'));

    axios.get(`${API_URL}/reports/location/${locationId}`)
      .then(res => setRecentReports(res.data))
      .catch(() => console.log('No recent reports'));
  }, [locationId]);

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

    try {
      await axios.post(`${API_URL}/reports`, formData);
      setSubmitted(true);
      toast.success('Submitted successfully!', { id: loadingToast });
    } catch (error) {
      toast.error('Submission failed.', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card text-center success-message">
        <CheckCircle size={60} color="var(--primary)" />
        <h2 style={{ color: 'var(--primary)', marginTop: '1rem' }}>Success!</h2>
        <p>Your {reportType.toLowerCase()} entry has been logged for {locationName}.</p>
        <button onClick={() => window.location.reload()} className="btn-primary" style={{ margin: '1rem auto' }}>Finish</button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>DOrSU FixHub</h2>
        <p className="location-info">📍 {locationName}</p>
      </div>

      {/* NEW: Report Type Toggle */}
      <div style={{ display: 'flex', background: 'var(--bg)', padding: '8px', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
        <button 
          onClick={() => setReportType('Maintenance')}
          style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: reportType === 'Maintenance' ? 'var(--primary)' : 'transparent', color: reportType === 'Maintenance' ? '#fff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: '0.3s' }}
        >
          <div className={`icon-box-sm ${reportType === 'Maintenance' ? '' : 'icon-gold'}`} style={{ background: reportType === 'Maintenance' ? 'rgba(255,255,255,0.2)' : '', color: reportType === 'Maintenance' ? '#fff' : '' }}>
            <Wrench size={16} />
          </div>
          <span style={{ fontSize: '0.75rem' }}>Maintenance</span>
        </button>
        <button 
          onClick={() => setReportType('Innovation')}
          style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: reportType === 'Innovation' ? 'var(--secondary)' : 'transparent', color: reportType === 'Innovation' ? '#fff' : 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: '0.3s' }}
        >
          <div className={`icon-box-sm ${reportType === 'Innovation' ? '' : 'icon-gold'}`} style={{ background: reportType === 'Innovation' ? 'rgba(255,255,255,0.2)' : '', color: reportType === 'Innovation' ? '#fff' : '' }}>
            <Lightbulb size={16} />
          </div>
          <span style={{ fontSize: '0.75rem' }}>Innovation</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{reportType === 'Maintenance' ? 'Issue Category' : 'Innovation Area'}</label>
          <select value={issue} onChange={(e) => setIssue(e.target.value)} required className="form-control">
            <option value="">Select...</option>
            {reportType === 'Maintenance' ? (
              <>
                <option value="Broken Furniture">Broken Furniture</option>
                <option value="Electrical Problem">Electrical Problem</option>
                <option value="Plumbing Leak">Plumbing Leak</option>
                <option value="Structural Damage">Structural Damage</option>
                <option value="Other">Other Maintenance</option>
              </>
            ) : (
              <>
                <option value="Facility Upgrade">Facility Upgrade</option>
                <option value="Energy Efficiency">Energy Efficiency</option>
                <option value="Student Comfort">Student Comfort</option>
                <option value="Tech Integration">Tech Integration</option>
                <option value="Other Idea">Other Idea</option>
              </>
            )}
          </select>
        </div>

        <div className="form-group">
          <label>{reportType === 'Maintenance' ? 'Describe the Problem' : 'Describe your Suggestion'}</label>
          <textarea placeholder="Provide specific details..." value={description} onChange={(e) => setDescription(e.target.value)} className="form-control" rows="4" required></textarea>
        </div>

        <div className="form-group">
          <label className="upload-label">
            <Camera size={20} /> {image ? 'Change Image' : 'Attach Photo'}
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} style={{ display: 'none' }} />
          </label>
          {image && <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700' }}>✅ {image.name}</div>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary full-width" style={{ background: reportType === 'Innovation' ? 'var(--secondary)' : 'var(--primary)' }}>
          {loading ? 'Processing...' : <><Send size={18} /> {reportType === 'Maintenance' ? 'Send Report' : 'Submit Idea'}</>}
        </button>
      </form>
    </motion.div>
  );
};

export default ReportingPage;

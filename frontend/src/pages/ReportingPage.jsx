import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Camera, Send, CheckCircle } from 'lucide-react';

const API_URL = `http://${window.location.hostname}:5000/api`;

const ReportingPage = () => {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('loc') || 'UNKNOWN';
  const [locationName, setLocationName] = useState('Loading location...');
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    // Fetch location details based on ID
    axios.get(`${API_URL}/locations/${locationId}`)
      .then(res => setLocationName(res.data.name))
      .catch(() => setLocationName('General Campus Area'));

    // NEW: Fetch recent reports for this specific room
    axios.get(`${API_URL}/reports/location/${locationId}`)
      .then(res => setRecentReports(res.data))
      .catch(() => console.log('No recent reports for this room'));
  }, [locationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('locationId', locationId);
    formData.append('issue', issue);
    formData.append('description', description);
    if (image) formData.append('image', image);

    try {
      await axios.post(`${API_URL}/reports`, formData);
      setSubmitted(true);
    } catch (error) {
      alert('Error submitting report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="card text-center success-message" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
        <div style={{ background: 'rgba(21, 128, 61, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--primary)' }}>
          <CheckCircle size={40} style={{ margin: 'auto' }} />
        </div>
        <h2 style={{ margin: 0, color: 'var(--primary)' }}>Report Submitted!</h2>
        <p>Your report for <strong>{locationName}</strong> has been sent to the Maintenance Office.</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Report Another Issue</button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Report Maintenance Issue</h2>
      <p className="location-info">Location: <strong>{locationName}</strong></p>

      {/* NEW: Recent Activity UI */}
      {recentReports.length > 0 && (
        <div style={{ marginBottom: '2rem', background: 'rgba(21, 128, 61, 0.05)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔔 Recent activity in this room:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentReports.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: '#fff', padding: '8px 12px', borderRadius: '6px', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ fontWeight: '600' }}>{r.issue}</span>
                <span style={{ 
                  color: r.status === 'Resolved' ? 'var(--resolved)' : r.status === 'In Progress' ? 'var(--progress)' : 'var(--pending)',
                  fontWeight: '700'
                }}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Type of Issue</label>
          <select 
            value={issue} 
            onChange={(e) => setIssue(e.target.value)} 
            required
            className="form-control"
          >
            <option value="">Select Issue Type</option>
            <option value="Broken Furniture">Broken Furniture (Chair/Table)</option>
            <option value="Electrical Problem">Electrical (Lights/Fan/AC)</option>
            <option value="Plumbing Leak">Plumbing (Water Leak/Toilet)</option>
            <option value="Structural Damage">Structural (Wall/Ceiling/Door)</option>
            <option value="Other">Other Maintenance</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            placeholder="Tell us more about the problem..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-control"
            rows="4"
            required
          ></textarea>
        </div>

        <div className="form-group">
          <label className="upload-label">
            <Camera size={20} /> {image ? 'Change Photo' : 'Upload Photo'}
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setImage(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>
          {image && (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--progress-bg)', color: 'var(--progress)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', display: 'inline-block' }}>
              📸 Selected: {image.name}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary full-width">
          {loading ? 'Submitting...' : <><Send size={18} /> Submit Report</>}
        </button>
      </form>
    </div>
  );
};

export default ReportingPage;

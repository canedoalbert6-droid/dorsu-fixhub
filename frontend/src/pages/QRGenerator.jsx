import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode, MapPin } from 'lucide-react';

const QRGenerator = () => {
  const [locId, setLocId] = useState('BLDG-A-101');

  // This URL should be your actual production domain eventually
  const reportUrl = `${window.location.origin}/?loc=${locId}`;

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${locId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(15, 118, 110, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--primary)' }}>
          <QrCode size={30} style={{ margin: 'auto' }} />
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>QR Code Generator</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Generate location-specific codes for your campus.</p>
      </div>
      
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={16} /> Location ID (e.g., RM-202)
        </label>
        <input 
          type="text" 
          className="form-control"
          placeholder="Enter Room or Building Code"
          value={locId}
          onChange={(e) => setLocId(e.target.value)}
        />
      </div>

      <div style={{ textAlign: 'center', background: 'var(--bg)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border)', marginBottom: '2rem' }}>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', display: 'inline-block', boxShadow: 'var(--shadow-md)' }}>
          <QRCodeSVG 
            id="qr-code-svg"
            value={reportUrl} 
            size={180}
            level={"H"}
            includeMargin={true}
          />
        </div>
        <p style={{ marginTop: '1rem', fontWeight: '700', color: 'var(--text-main)', fontSize: '1.1rem' }}>{locId}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Scan to report issues at this location</p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button onClick={downloadQR} className="btn-primary" style={{ width: 'auto', minWidth: '200px', margin: '0 auto' }}>
          <Download size={18} /> Download PNG Image
        </button>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          URL: <code>{reportUrl}</code>
        </p>
      </div>
    </div>
  );
};

export default QRGenerator;

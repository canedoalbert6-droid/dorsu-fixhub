import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode, MapPin, Globe, AlertTriangle, ExternalLink } from 'lucide-react';

const QRGenerator = () => {
  const [locId, setLocId] = useState('BLDG-A-101');
  const [baseUrl, setBaseUrl] = useState(`http://${window.location.hostname}:5173`);
  const [isLocalhost] = useState(() => 
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  );

  const reportUrl = `${baseUrl}/?loc=${locId}`;

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Create blob from SVG data to handle special characters
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `DOrSU-QR-${locId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="icon-box-md" style={{ margin: '0 auto 1rem', background: 'var(--bg)', color: 'var(--primary)' }}>
          <QrCode size={30} />
        </div>
        <h2 style={{ fontWeight: '800' }}>Smart QR Generator</h2>
        <p style={{ color: 'var(--text-muted)' }}>Create scannable anchors for campus locations.</p>
      </div>

      {isLocalhost && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '15px', borderRadius: '12px', marginBottom: '2rem', display: 'flex', gap: '12px' }}>
          <AlertTriangle color="#d97706" size={24} style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#92400e', display: 'block' }}>Localhost Detected!</strong>
            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#b45309' }}>
              QR codes with "localhost" won't work on mobile phones. 
              Please replace <strong>localhost</strong> in the box below with your <strong>Network IP</strong> (e.g., 192.168.xx.xx).
            </p>
          </div>
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '2rem' }}>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} /> Room/Location ID
          </label>
          <input 
            type="text" 
            className="form-control"
            value={locId}
            onChange={(e) => setLocId(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} /> Server Address (IP)
          </label>
          <input 
            type="text" 
            className="form-control"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px', alignItems: 'center', background: 'var(--bg)', padding: '30px', borderRadius: '20px', border: '1px solid var(--border)' }}>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
          <QRCodeSVG 
            id="qr-code-svg"
            value={reportUrl} 
            size={180}
            level={"H"}
            includeMargin={true}
          />
        </div>
        
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 10px', color: 'var(--primary)' }}>Live Preview</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
            Location: <strong>{locId}</strong><br/>
            Target: <code style={{ color: 'var(--primary)', fontWeight: '700' }}>{reportUrl}</code>
          </p>
          <a href={reportUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none', marginBottom: '20px' }}>
            Test link on this computer <ExternalLink size={14} />
          </a>
          <button onClick={downloadQR} className="btn-primary" style={{ width: '100%' }}>
            <Download size={18} /> Download for Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;

import React, { useState } from 'react';
import axios from 'axios';
import { CheckCircle, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReportPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`, {
            headers: { 'User-Agent': 'CrisisMapBangalore/1.0' }
          });
          if (res.data && res.data.display_name) {
            setLocation(res.data.display_name);
          } else {
            setLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`);
          }
        } catch (e) {
          console.error(e);
          setLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`);
        }
      });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      setErrorMsg("Please describe the emergency.");
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/submit`, { text, location });
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setText('');
        setLocation('');
      }, 5000);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.response?.data?.error || "Failed to submit report. Please check server.");
      setStatus('error');
    }
  };

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
        <Link to="/map" style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', textDecoration: 'none' }}>← Back to Map</Link>
      </div>

      <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#e94560', marginBottom: '1rem' }}>REPORT EMERGENCY</h1>
        <p style={{ color: '#a0a5ba', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Please provide details about the incident. Your report will be reviewed by an administrator before appearing on the public map.
        </p>

        {status === 'idle' || status === 'error' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: '100%', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>Location</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location name manually..."
                  style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #444', background: '#111', color: '#fff', fontSize: '1rem' }}
                />
                <button 
                  onClick={handleUseCurrentLocation}
                  style={{ background: '#3498db', color: '#fff', padding: '0.8rem 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Use My Location
                </button>
              </div>
            </div>

            <div style={{ width: '100%', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>Description of Emergency</label>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="E.g. Major fire near MG Road, 5 people trapped. Need fire trucks and ambulance."
                style={{ width: '100%', height: '120px', padding: '1rem', borderRadius: '8px', border: '1px solid #444', background: '#111', color: '#fff', fontSize: '1rem', resize: 'vertical' }}
              />
            </div>

            {errorMsg && <p style={{ color: '#e74c3c', margin: 0 }}>{errorMsg}</p>}

            <button 
              onClick={handleSubmit}
              style={{ width: '100%', background: '#e94560', color: '#fff', padding: '1rem', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Submit Report
            </button>
          </div>
        ) : null}

        {status === 'loading' && (
          <div style={{ color: '#f39c12', fontSize: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader size={48} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Submitting report...</span>
          </div>
        )}

        {status === 'success' && (
          <div style={{ color: '#00ffcc', padding: '2rem', background: 'rgba(0, 255, 204, 0.1)', borderRadius: '12px', border: '1px solid rgba(0, 255, 204, 0.3)' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ color: '#00ffcc', margin: '0 0 0.5rem 0' }}>Report Submitted Successfully</h2>
            <p>Your report has been submitted and will appear on the map after admin review.</p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

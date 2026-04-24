import React, { useState } from 'react';
import axios from 'axios';
import { AlertOctagon, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReportPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    setStatus('loading');
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/submit`, { text: 'SOS Emergency initiated at user coordinates.' });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
        <Link to="/map" style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}>← Back to Map</Link>
      </div>

      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '3rem', color: '#e94560', marginBottom: '1rem', textShadow: '0 0 20px rgba(233, 69, 96, 0.5)' }}>EMERGENCY PROTOCOL</h1>
        <p style={{ color: '#a0a5ba', fontSize: '1.2rem', marginBottom: '3rem' }}>
          By pressing the initiate button, an SOS distress signal will be actively broadcasted to the network. Your location and severity will be automatically parsed from network telemetry. No manual input required.
        </p>

        {status === 'idle' && (
          <button 
            onClick={handleSubmit}
            style={{
              width: '200px', height: '200px', borderRadius: '50%', background: 'linear-gradient(145deg, #ff2a2a, #cc0000)',
              border: '10px solid #800000', outline: 'none', cursor: 'pointer',
              boxShadow: '0 0 50px rgba(255, 0, 0, 0.6), inset 0 20px 20px rgba(255,255,255,0.4)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <AlertOctagon size={64} color="white" />
            <strong style={{ color: 'white', marginTop: '1rem', fontSize: '1.2rem', letterSpacing: '2px' }}>INITIATE</strong>
          </button>
        )}

        {status === 'loading' && (
          <div style={{ color: '#f39c12', fontSize: '1.5rem', animation: 'pulse 1.5s infinite' }}>
            Transmitting signal...
          </div>
        )}

        {status === 'success' && (
          <div style={{ color: '#00ffcc', padding: '2rem', background: 'rgba(0, 255, 204, 0.1)', borderRadius: '12px', border: '1px solid rgba(0, 255, 204, 0.3)' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ color: '#00ffcc', margin: '0 0 0.5rem 0' }}>Signal Confirmed</h2>
            <p>Your coordinates have been locked. Aid dispatch is active.</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ color: '#e94560', padding: '2rem', background: 'rgba(233, 69, 96, 0.1)', borderRadius: '12px', border: '1px solid rgba(233, 69, 96, 0.3)' }}>
            <h2>Transmission Failed</h2>
            <p>System error. Could not connect to orbital servers.</p>
          </div>
        )}
      </div>
    </div>
  );
}

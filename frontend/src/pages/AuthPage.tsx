import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, ShieldCheck, Fingerprint, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AuthPage.css';
export default function AuthPage({ onLogin }: { onLogin?: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [actualCode, setActualCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset step when toggling tabs
  useEffect(() => {
    setSignupStep(1);
    setLoading(false);
    setErrorMsg('');
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!isLogin && signupStep === 1) {
      if (!email) {
        setLoading(false);
        return;
      }
      try {
        await axios.post(`${import.meta.env.VITE_BACKEND_URL}/send-code`, { email });
        setSignupStep(2);
      } catch (err) {
        setErrorMsg('Failed to send code. Server offline.');
      }
      setLoading(false);
      try {
        const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/verify-code`, { email, code: inputCode });
        if (res.data.success) {
          setTimeout(() => {
            if (onLogin) onLogin();
            navigate('/map');
          }, 1000);
        } else {
          setErrorMsg('Invalid Code. Access Denied.');
          setLoading(false);
        }
      } catch (err) {
        setErrorMsg('Invalid Code. Access Denied.');
        setLoading(false);
      }
    } else {
      // Login mode - mock immediate success
      setTimeout(() => {
        if (onLogin) onLogin();
        navigate('/map');
      }, 1000);
    }
  };

  return (
    <div className="auth-container">
      {/* Background Radar Animation */}
      <div className="radar-bg">
        <div className="radar-sweep"></div>
        <div className="radar-grid"></div>
      </div>

      <div className="auth-box">
        <div className="auth-scan-line"></div>
        <div className="auth-header">
          <Activity color="#e94560" size={32} style={{ animation: 'pulse 1.5s infinite', margin: '0 auto 1rem' }} />
          <h2>{isLogin ? 'LOGIN' : 'SIGN UP'}</h2>
          <p>{isLogin ? 'Access your account' : 'Create an account'}</p>
        </div>

        <div className="auth-tabs">
          <button className={`tab-btn ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Login</button>
          <button className={`tab-btn ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Sign Up</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Sign Up Step 2: Verification */}
          {!isLogin && signupStep === 2 ? (
            <div className="auth-verification-stage slide-in">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <ShieldCheck color="#00ffcc" size={48} style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ color: '#00ffcc', margin: 0 }}>CODE SENT</h3>
                <p style={{ color: '#a0a5ba', fontSize: '0.9rem', marginTop: '0.5rem' }}>A verification code has been sent to your email.</p>
              </div>

              <div className="input-group">
                <label style={{ color: '#00ffcc' }}>Verification Code</label>
                <div className="input-wrapper" style={{ borderColor: '#00ffcc', boxShadow: '0 0 10px rgba(0,255,204,0.2)' }}>
                  <Fingerprint className="input-icon" color="#00ffcc" size={18} />
                  <input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value)} placeholder="XXXX" required style={{ color: '#00ffcc', letterSpacing: '4px', textAlign: 'center' }} />
                </div>
              </div>
            </div>
          ) : (
            /* Login & Sign Up Step 1 */
            <div className="fade-in">
              {!isLogin && (
                <div className="input-group">
                  <label>Name</label>
                  <div className="input-wrapper">
                    <User className="input-icon" size={18} />
                    <input type="text" placeholder="John Doe" required />
                  </div>
                </div>
              )}

              <div className="input-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required />
                </div>
              </div>

              <div className="input-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input type="password" placeholder="••••••••" required />
                </div>
              </div>
            </div>
          )}

          {errorMsg && <div style={{ color: '#ff2a2a', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>{errorMsg}</div>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="loading-text">PROCESSING...</span>
            ) : isLogin ? (
              'LOGIN'
            ) : signupStep === 1 ? (
              'SIGN UP'
            ) : (
              'VERIFY CODE'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, ArrowRight, Zap, Globe as GlobeIcon, Lock } from 'lucide-react';
import Globe from 'react-globe.gl';
import './LandingPage.css';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const globeEl = useRef<any>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 1.2;
      globeEl.current.pointOfView({ altitude: 2 });
    }
  }, []);

  // Generate some random pulse points for the globe to make it look like active incidents
  const [gData] = useState([...Array(20).keys()].map(() => ({
    lat: (Math.random() - 0.5) * 180,
    lng: (Math.random() - 0.5) * 360,
    maxR: Math.random() * 20 + 3,
    propagationSpeed: (Math.random() - 0.5) * 2 + 1,
    repeatPeriod: Math.random() * 2000 + 200
  })));

  return (
    <div className="landing-container">
      {/* 3D Globe Background */}
      <div className="globe-container">
        <Globe
          ref={globeEl}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          ringsData={gData}
          ringColor={() => '#e94560'}
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          width={window.innerWidth > 800 ? window.innerWidth / 2 : window.innerWidth}
          height={window.innerHeight}
        />
      </div>

      {/* Dynamic 3D Elements */}
      <div className="cube-container" style={{ top: '20%', left: '10%' }}>
        <div className="cube">
          <div className="face front"></div>
          <div className="face back"></div>
          <div className="face right"></div>
          <div className="face left"></div>
          <div className="face top"></div>
          <div className="face bottom"></div>
        </div>
      </div>
      
      <div className="cube-container" style={{ top: '60%', right: '40%', transform: 'scale(1.5)' }}>
        <div className="cube cube-slow">
          <div className="face front"></div>
          <div className="face back"></div>
          <div className="face right"></div>
          <div className="face left"></div>
          <div className="face top"></div>
          <div className="face bottom"></div>
        </div>
      </div>

      <div className="globe-overlay-gradient"></div>

      <main className="hero-section">
        <div className="hero-content">
          <div className="badge-glow" style={{ animation: 'pulse 2s infinite' }}>Next-Gen Crisis Response</div>
          <h1 className="hero-title">
            Intelligence For <br />
            <span className="text-gradient">Critical Environments</span>
          </h1>
          <p className="hero-subtitle">
            Harness real-time satellite imaging, AI-assisted telemetry, and crowd-sourced intelligence to neutralize threats and manage crisis responses instantly.
          </p>
          <div className="hero-cta">
            <Link to="/map" className="btn-glow">
              Launch Intel Engine <ArrowRight size={20} />
            </Link>
            <Link to="/auth" className="btn-outline">
              Operator Access
            </Link>
          </div>
        </div>
      </main>

      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Tactical Capabilities</h2>
          <p className="section-desc">Operating at the intersection of geospatial mapping and real-time AI.</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feat-icon-wrapper"><GlobeIcon color="#e94560" size={32} /></div>
            <h3>3D Satellite Topography</h3>
            <p>Access high-definition geospatial intel with real-time mapping parameters and coordinate locking.</p>
          </div>
          <div className="feature-card">
            <div className="feat-icon-wrapper"><Zap color="#e94560" size={32} /></div>
            <h3>AI Vector Analysis</h3>
            <p>Automated breakdown of incoming reports using intelligence algorithms to extract locations instantly.</p>
          </div>
          <div className="feature-card">
            <div className="feat-icon-wrapper"><Activity color="#e94560" size={32} /></div>
            <h3>Live Telemetry Feed</h3>
            <p>Monitor critical sectors and track operational status changes in an encrypted, real-time environment.</p>
          </div>
          <div className="feature-card">
            <div className="feat-icon-wrapper"><Lock color="#e94560" size={32} /></div>
            <h3>Secure Admin Node</h3>
            <p>Authenticated operational clearance required for authorizing responses and toggling critical parameters.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

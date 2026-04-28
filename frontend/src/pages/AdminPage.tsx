import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../firebase';
import type { Incident } from '../types';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [activeTab, setActiveTab] = useState<'queue' | 'active' | 'briefing' | 'broadcast' | 'resolved'>('queue');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [retrospective, setRetrospective] = useState<Record<string, string>>({});
  const [loadingRetro, setLoadingRetro] = useState<Record<string, boolean>>({});
  const [scrapingNews, setScrapingNews] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const incidentsRef = ref(db, 'incidents');
    const unsubscribe = onValue(incidentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIncidents(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      } else {
        setIncidents([]);
      }
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'crisismap2024') {
      setIsAuthenticated(true);
    } else {
      alert("Invalid password");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/approve/${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: string) => {
    try {
      // simple reject logic using remove node or setting status rejected
      const incidentRef = ref(db, `incidents/${id}`);
      await remove(incidentRef);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/update-status/${id}`, { status });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePriority = async (id: string, priority: string) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/update-priority/${id}`, { priority });
    } catch (e) {
      console.error(e);
    }
  };

  const generateBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/briefing`);
      setBriefing(res.data.briefing);
    } catch (e) {
      console.error(e);
      setBriefing("Failed to generate briefing.");
    }
    setLoadingBriefing(false);
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg) return;
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/broadcast`, { message: broadcastMsg });
      alert("Broadcast transmitted successfully!");
      setBroadcastMsg('');
    } catch (e) {
      console.error(e);
    }
  };

  const clearBroadcasts = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/clear-broadcasts`);
      alert("Active broadcasts cleared successfully!");
    } catch (e) {
      console.error(e);
    }
  };

  const generateRetrospective = async (id: string) => {
    setLoadingRetro(prev => ({ ...prev, [id]: true }));
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/retrospective/${id}`);
      setRetrospective(prev => ({ ...prev, [id]: res.data.retrospective }));
    } catch (e) {
      console.error(e);
    }
    setLoadingRetro(prev => ({ ...prev, [id]: false }));
  };

  const scrapeLocalNews = async () => {
    setScrapingNews(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/scrape-news`);
      alert(res.data.message);
    } catch (e) {
      console.error(e);
      alert("Failed to scrape news.");
    }
    setScrapingNews(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', marginTop: '10vh' }}>
        <div className="card" style={{ width: '400px' }}>
          <h2>Admin Access</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Login</button>
          </form>
        </div>
      </div>
    );
  }

  const queue = incidents.filter(i => !i.approved);
  const active = incidents.filter(i => i.approved && i.status !== 'resolved');
  const resolved = incidents.filter(i => i.status === 'resolved');

  return (
    <div className="container">
      <h2>Control Center</h2>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('queue')}
          style={{ background: activeTab === 'queue' ? '#e94560' : '#eee', color: activeTab === 'queue' ? 'white' : '#333' }}
        >
          Queue ({queue.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          style={{ background: activeTab === 'active' ? '#e94560' : '#eee', color: activeTab === 'active' ? 'white' : '#333' }}
        >
          Active Incidents ({active.length})
        </button>
        <button
          onClick={() => setActiveTab('briefing')}
          style={{ background: activeTab === 'briefing' ? '#e94560' : '#eee', color: activeTab === 'briefing' ? 'white' : '#333' }}
        >
          Intelligence Briefing
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          style={{ background: activeTab === 'broadcast' ? '#e94560' : '#eee', color: activeTab === 'broadcast' ? 'white' : '#333' }}
        >
          Broadcast
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          style={{ background: activeTab === 'resolved' ? '#e94560' : '#eee', color: activeTab === 'resolved' ? 'white' : '#333' }}
        >
          Resolved ({resolved.length})
        </button>
      </div>

      {activeTab === 'queue' && (
        <div>
          {queue.length === 0 ? <p>No incidents in queue.</p> : queue.map(i => (
            <div key={i.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h4>{i.location_name} - <span className="text-primary">{i.crisis_type}</span> ({i.priority})</h4>
                  <p><strong>Raw Text:</strong> "{i.raw_text}"</p>
                  <p><strong>Extracted Summary:</strong> {i.summary}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <button onClick={() => handleApprove(i.id)} style={{ background: '#2ecc71', color: 'white' }}>Approve</button>
                  <button onClick={() => handleReject(i.id)} style={{ background: '#e74c3c', color: 'white' }}>Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'active' && (
        <div>
          {active.length === 0 ? <p>No active incidents.</p> : active.map(i => (
            <div key={i.id} className="card">
              <h4>{i.location_name} - {i.crisis_type}</h4>
              <p>{i.summary}</p>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Priority:</label>
                  <select value={i.priority} onChange={(e) => handleUpdatePriority(i.id, e.target.value)} style={{ marginBottom: 0 }}>
                    <option value="P1">P1 - Critical</option>
                    <option value="P2">P2 - High</option>
                    <option value="P3">P3 - Medium/Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Status:</label>
                  <select value={i.status} onChange={(e) => handleUpdateStatus(i.id, e.target.value)} style={{ marginBottom: 0 }}>
                    <option value="active">Active</option>
                    <option value="responding">Responding</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'briefing' && (
        <div className="card">
          <p>Generate a real-time situation report powered by Gemini based on all active incidents.</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={generateBriefing} className="btn-primary" disabled={loadingBriefing}>
              {loadingBriefing ? 'Analyzing data...' : 'Generate Briefing'}
            </button>
            <button onClick={scrapeLocalNews} className="btn-primary" style={{ background: '#3498db' }} disabled={scrapingNews}>
              {scrapingNews ? 'Scraping feeds...' : 'Run Automated News Scraper'}
            </button>
          </div>

          {briefing && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderLeft: '4px solid #1a1a2e', fontSize: '1.1rem', lineHeight: '1.6' }}>
              {briefing}
            </div>
          )}
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="card">
          <h3>City-Wide Emergency Broadcast</h3>
          <p>This message will be pushed instantly to all users active on the public map.</p>
          <textarea
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            placeholder="Type emergency broadcast message..."
            style={{ width: '100%', height: '100px', marginBottom: '1rem', padding: '0.5rem' }}
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={sendBroadcast} className="btn-primary" style={{ background: '#e94560' }}>
              Transmit Broadcast
            </button>
            <button onClick={clearBroadcasts} className="btn-primary" style={{ background: '#333' }}>
              Clear Active Broadcasts
            </button>
          </div>
        </div>
      )}

      {activeTab === 'resolved' && (
        <div>
          {resolved.length === 0 ? <p>No resolved incidents.</p> : resolved.map(i => (
            <div key={i.id} className="card">
              <h4>{i.location_name} - {i.crisis_type}</h4>
              <p>{i.summary}</p>

              <button
                onClick={() => generateRetrospective(i.id)}
                className="btn-primary"
                style={{ marginTop: '1rem' }}
                disabled={loadingRetro[i.id]}
              >
                {loadingRetro[i.id] ? 'Generating Retrospective...' : 'Generate Post-Incident Retrospective'}
              </button>

              {retrospective[i.id] && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#ecf0f1', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {retrospective[i.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

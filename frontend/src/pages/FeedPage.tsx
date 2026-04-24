import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import type { Incident } from '../types';
import { MapPin, AlertCircle, Users, Activity } from 'lucide-react';

export default function FeedPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    const incidentsRef = ref(db, 'incidents');
    const unsubscribe = onValue(incidentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(i => i.approved && i.status !== 'resolved');

        // Sort by priority P1 > P2 > P3, then by timestamp (newest first)
        parsed.sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority.localeCompare(b.priority);
          }
          return b.timestamp - a.timestamp;
        });

        setIncidents(parsed);
      } else {
        setIncidents([]);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="container">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <Activity color="#e94560" />
        Live Crisis Feed
      </h2>

      {incidents.length === 0 ? (
        <p>No active incidents found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {incidents.map(incident => (
            <div key={incident.id} className="card" style={{ borderLeft: `4px solid ${incident.priority === 'P1' ? '#e94560' : incident.priority === 'P2' ? '#f39c12' : '#f1c40f'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={18} />
                    {incident.location_name}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className={`badge badge-${incident.priority.toLowerCase()}`}>{incident.priority}</span>
                    <span className="badge" style={{ background: '#34495e' }}>{incident.crisis_type}</span>
                    <span className="badge" style={{ background: incident.status === 'active' ? '#e74c3c' : '#3498db' }}>{incident.status}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', color: '#7f8c8d', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                    <Users size={14} /> Reports: {incident.report_count}
                  </div>
                  <div>{new Date(incident.timestamp).toLocaleString()}</div>
                </div>
              </div>

              <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{incident.summary}</p>

              {incident.needs && incident.needs.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#7f8c8d', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <AlertCircle size={14} /> Immediate Needs
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {incident.needs.map((need, idx) => (
                      <span key={idx} style={{ background: '#f1f2f6', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', color: '#2f3640' }}>
                        {need.replace('_', ' ').toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

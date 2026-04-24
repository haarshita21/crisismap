import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import type { Incident } from '../types';
import { Crosshair, X } from 'lucide-react';
import './MapPage.css';

import { useNavigate } from 'react-router-dom';

const helplines: Record<string, string[]> = {
  medical: ['Ambulance 108', 'NIMHANS 080-46110007'],
  fire: ['Fire 101', 'BBMP 1533'],
  flood: ['NDRF 011-24363260', 'BBMP Control 1533'],
  structural: ['NDRF 011-24363260', 'Police 100'],
  traffic: ['Traffic Police 103', 'BBMP 1533'],
  other: ['Emergency 112', 'Police 100']
};

function MapClickHandler({ setWalkthrough }: { setWalkthrough: (loc: {lat: number, lng: number} | null) => void }) {
  useMapEvents({
    click(e) {
      setWalkthrough({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyToUser({ center }: { center: [number, number] | null }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center) {
      map.flyTo(center, 13);
    }
  }, [center, map]);
  return null;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [warned, setWarned] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState<{lat: number, lng: number} | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const incidentsRef = ref(db, 'incidents');
    const unsubscribe = onValue(incidentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(i => i.approved && i.status !== 'resolved');
        setIncidents(parsed);
      } else {
        setIncidents([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, [userLocation]);

  useEffect(() => {
    if (userLocation && incidents.length > 0 && !warned) {
      const isNearDanger = incidents.some(i => {
        if (i.priority === 'P1' || i.priority === 'P2') {
          const dist = getDistance(userLocation.lat, userLocation.lng, i.lat, i.lng);
          return dist <= 1000;
        }
        return false;
      });
      if (isNearDanger) {
        alert("WARNING: You are within 1km of an active high-priority (P1/P2) crisis incident.");
        setWarned(true);
      }
    }
  }, [userLocation, incidents, warned]);

  const getColor = (priority: string) => {
    if (priority === 'P1') return '#e94560';
    if (priority === 'P2') return '#f39c12';
    return '#00ffcc';
  };

  const p1Count = incidents.filter(i => i.priority === 'P1').length;
  const signalStatus = p1Count > 0 ? 'CRITICAL CONDITIONS' : 'SAFE';

  return (
    <div className="hud-wrapper">
      {showWalkthrough && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, background: '#000', color: '#00ffcc', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid rgba(0, 255, 204, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="hud-blinker"></span> <span style={{ letterSpacing: '2px', fontWeight: 'bold' }}>SATELLITE GROUND-LINK ESTABLISHED: LIVE 360° STREET VIEW</span>
            </div>
            <button onClick={() => setShowWalkthrough(null)} style={{ background: 'transparent', color: '#e94560', border: '1px solid #e94560', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <iframe 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              allowFullScreen
              src={`https://maps.google.com/maps?t=h&q=loc:${showWalkthrough.lat},${showWalkthrough.lng}&ie=UTF8&z=19&output=embed`}
              style={{ filter: 'contrast(1.2)' }}
            />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,255,204,0.05) 40px, rgba(0,255,204,0.05) 41px)', pointerEvents: 'none', zIndex: 10 }}></div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 11 }}>
                 <Crosshair size={64} style={{ opacity: 0.8, color: '#e94560' }} />
            </div>
          </div>
          <div style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0, 255, 204, 0.3)', fontSize: '0.8rem' }}>
            <span>LAT: {showWalkthrough.lat.toFixed(4)}, LNG: {showWalkthrough.lng.toFixed(4)}</span>
            <span>REALTIME TELEMETRY CONNECTED</span>
          </div>
        </div>
      )}
      <div className={`map-3d-container ${is3D ? 'map-3d-active' : ''}`}>
        <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: '100%', width: '100%', background: '#05050A' }} zoomControl={false}>
          <MapClickHandler setWalkthrough={setShowWalkthrough} />
          <FlyToUser center={userLocation ? [userLocation.lat, userLocation.lng] : null} />
          <TileLayer
            attribution='&copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          
          {userLocation && (
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={5000} // 5km radius
              pathOptions={{ color: '#00ffcc', fillColor: '#00ffcc', fillOpacity: 0.1, weight: 1, dashArray: '4, 8' }}
            />
          )}

          {incidents.map(incident => (
            <React.Fragment key={incident.id}>
              {incident.priority === 'P1' && (
                <Circle
                  center={[incident.lat, incident.lng]}
                  radius={500}
                  pathOptions={{ color: '#e94560', fillColor: '#e94560', fillOpacity: 0.3, weight: 1, dashArray: '5, 5' }}
                />
              )}
              <CircleMarker
                center={[incident.lat, incident.lng]}
                radius={8}
                pathOptions={{
                  color: getColor(incident.priority),
                  weight: 2,
                  fillColor: getColor(incident.priority),
                  fillOpacity: 0.8
                }}
              >
                <Popup backgroundColor="#05050A">
                  <div style={{ minWidth: '220px', padding: '5px' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                      <span className="hud-blinker"></span>{incident.location_name}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span className={`badge badge-${incident.priority.toLowerCase()}`}>{incident.priority}</span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>{incident.crisis_type}</span>
                    </div>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#a0a5ba' }}>{incident.summary}</p>

                    {incident.needs && incident.needs.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ color: '#00ffcc', fontSize: '0.8rem', textTransform: 'uppercase' }}>Assets Req:</strong>
                        <span style={{ color: '#fff', fontSize: '0.85rem' }}> {incident.needs.join(', ')}</span>
                      </div>
                    )}

                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <strong style={{ color: '#f39c12', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>Comms Channel:</strong>
                      <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '0', listStyle: 'none' }}>
                        {helplines[incident.crisis_type.toLowerCase()]?.map((number, idx) => (
                          <li key={idx} style={{ marginBottom: '0.2rem' }}><strong style={{ color: '#fff' }}>{number.split(' ')[0]}</strong>: <span style={{ color: '#00ffcc' }}>{number.split(' ').slice(1).join(' ')}</span></li>
                        )) || helplines['other'].map((number, idx) => (
                          <li key={idx} style={{ marginBottom: '0.2rem' }}><strong style={{ color: '#fff' }}>{number.split(' ')[0]}</strong>: <span style={{ color: '#00ffcc' }}>{number.split(' ').slice(1).join(' ')}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      <div className="hud-overlay"></div>
      <div className="crosshair"></div>

      <div className="hud-panel hud-top-left">
        <div>
          <div className="hud-title">System Status</div>
          <div className={`hud-value ${signalStatus === 'CRITICAL CONDITIONS' ? 'hud-text-danger' : 'hud-text-safe'}`}>
            {signalStatus === 'CRITICAL CONDITIONS' && <span className="hud-blinker"></span>}
            {signalStatus}
          </div>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <div className="hud-title">Active Signals</div>
          <div className="hud-value" style={{ color: '#fff' }}>{incidents.length}</div>
        </div>
      </div>

      <div className="hud-panel hud-top-right">
        <div className="hud-title">Terminal Clock</div>
        <div className="hud-value" style={{ color: '#fff', fontFamily: 'monospace' }}>{currentTime}</div>
        <div className="hud-title" style={{ marginTop: '0.5rem' }}>Coordinates</div>
        <div className="hud-value" style={{ color: '#a0a5ba', fontSize: '0.9rem' }}>12.9716° N, 77.5946° E</div>
      </div>

      <div className="hud-panel hud-bottom-left">
        <div className="hud-title" style={{ marginBottom: '0.5rem' }}>Threat Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#e94560', boxShadow: '0 0 10px #e94560' }}></div>
          <span style={{ fontSize: '12px', color: '#fff' }}>P1 RED ZONE - Critical</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f39c12' }}></div>
          <span style={{ fontSize: '12px', color: '#fff' }}>P2 YELLOW ZONE - High Threat</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00ffcc' }}></div>
          <span style={{ fontSize: '12px', color: '#fff' }}>P3 GREEN ZONE - Low Threat</span>
        </div>
      </div>

      <div className="hud-panel hud-bottom-right">
        <button
          className={`hud-btn ${is3D ? 'active' : ''}`}
          onClick={() => setIs3D(!is3D)}
        >
          {is3D ? '2D Topo' : '3D Terrain'}
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';
import FeedPage from './pages/FeedPage';
import ReportPage from './pages/ReportPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Private route wrapper
  const PrivateRoute = ({ children }: { children: JSX.Element }) => {
    return isAuthenticated ? children : <Navigate to="/auth" />;
  };

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#05050A', color: 'white' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage onLogin={() => setIsAuthenticated(true)} />} />
            <Route path="/admin" element={<AdminPage />} />
            
            <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
            <Route path="/feed" element={<PrivateRoute><FeedPage /></PrivateRoute>} />
            <Route path="/report" element={<PrivateRoute><ReportPage /></PrivateRoute>} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/user/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import StaffDashboard from './components/staff/StaffDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [authView, setAuthView] = useState('landing');
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch('http://localhost:5000/api/components/AppAuth', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSession({ user: data.user, access_token: token });
          setRole(data.role);
        } else {
          // Token invalid or expired
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Session verification failed:', error);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>Đang tải...</div>;

  if (!session) {
    if (authView === 'landing') {
      return <Landing onSwitchToLogin={() => setAuthView('login')} onSwitchToRegister={() => setAuthView('register')} />;
    } else if (authView === 'login') {
      return <Login onSwitchToRegister={() => setAuthView('register')} onSwitchToLanding={() => setAuthView('landing')} />;
    } else {
      return <Register onSwitchToLogin={() => setAuthView('login')} onSwitchToLanding={() => setAuthView('landing')} />;
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          role === 'admin' ? <AdminDashboard session={session} /> :
          role === 'staff' ? <StaffDashboard session={session} /> :
          <Dashboard session={session} />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

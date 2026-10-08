import { apiFetch } from './lib/api';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
const Dashboard = lazy(() => import('./components/user/Dashboard'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const StaffDashboard = lazy(() => import('./components/staff/StaffDashboard'));

export default function App() {
  const [session, setSession] = useState(null);
  const [authView, setAuthView] = useState('landing');
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onExpired = () => { setSession(null); setRole(null); setAuthView('login'); };
    window.addEventListener('auth-expired', onExpired);
    const verifySession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiFetch('/api/components/AppAuth', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setSession({ user: data.user });
          setRole(data.role);
        } else if (response.status === 401 || response.status === 403) {
          // Token invalid or expired
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('refresh_token');
        }
      } catch (error) {
        console.error('Session verification failed:', error);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  if (loading) return <div className="app-loading">Đang tải...</div>;

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
      <Suspense fallback={<p>Đang tải...</p>}>
      <Routes>
        <Route path="/" element={
          role === 'admin' ? <AdminDashboard session={session} /> :
          role === 'staff' ? <StaffDashboard session={session} /> :
          <Dashboard session={session} />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

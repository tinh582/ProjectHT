import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/user/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import StaffDashboard from './components/staff/StaffDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data) setRole(data.role || 'user');
    setLoading(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>Đang tải...</div>;

  if (!session) {
    if (showLogin) {
      return <Login onSwitchToRegister={() => setShowLogin(false)} />;
    } else {
      return <Register onSwitchToLogin={() => setShowLogin(true)} />;
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

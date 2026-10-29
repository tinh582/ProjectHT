import { apiFetch } from './lib/api';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import ActivationPricing from './components/user/ActivationPricing';

const Dashboard = lazy(() => import('./components/user/Dashboard'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const StaffDashboard = lazy(() => import('./components/staff/StaffDashboard'));

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('landing'); // Always start on 'landing'
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  useEffect(() => {
    const onExpired = () => {
      setSession(null);
      setRole(null);
      // Never force redirect away from Landing page if user is browsing Landing
      setCurrentView((prev) => (prev === 'landing' ? 'landing' : 'login'));
    };
    window.addEventListener('auth-expired', onExpired);

    const verifySession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Use plain fetch during silent startup check so an expired token never forces a redirect to Login
        const response = await fetch('/api/components/AppAuth', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setSession({ user: data.user });
          setRole(data.role);
        } else if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('refresh_token');
          setSession(null);
          setRole(null);
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    setSession(null);
    setRole(null);
    setCurrentView('landing');
  };

  const handleLoginSuccess = async (data) => {
    setSession({ user: data.user });
    let resolvedRole = 'user';
    // fetch user role
    try {
      const authRes = await apiFetch('/api/components/AppAuth', {
        headers: { 'Authorization': `Bearer ${data.session.access_token}` }
      });
      if (authRes.ok) {
        const authData = await authRes.json();
        resolvedRole = authData.role;
        setRole(authData.role);
      } else {
        setRole('user');
      }
    } catch {
      setRole('user');
    }

    // Staff and Admin access dashboard immediately after login
    if (resolvedRole === 'admin' || resolvedRole === 'staff') {
      setCurrentView('dashboard');
    } else {
      // Regular customer stays on landing page or proceeds to dashboard/onboarding
      setCurrentView('landing');
    }
  };

  const handleGoToDashboard = async () => {
    if (!session) {
      setCurrentView('login');
      return;
    }

    // Admin & Staff can directly access their dashboard
    if (role === 'admin' || role === 'staff') {
      setCurrentView('dashboard');
      return;
    }

    // Regular users: Gate dashboard access! Check active subscription
    setIsCheckingAccess(true);
    try {
      const response = await apiFetch(`/api/components/user/UserPayment/subscription/${session.user.id}`);
      if (response.ok) {
        const subData = await response.json();
        if (subData.isActive) {
          setCurrentView('dashboard');
        } else {
          // Block dashboard and show extra price/activation page
          setCurrentView('activation-pricing');
        }
      } else {
        setCurrentView('activation-pricing');
      }
    } catch (err) {
      console.error('Failed checking subscription access:', err);
      setCurrentView('activation-pricing');
    } finally {
      setIsCheckingAccess(false);
    }
  };

  if (loading) {
    return <div className="app-loading">Đang tải HT Parking...</div>;
  }

  if (isCheckingAccess) {
    return <div className="app-loading">Đang kiểm tra quyền truy cập Bảng điều khiển...</div>;
  }

  if (currentView === 'login') {
    return (
      <Login
        onSwitchToRegister={() => setCurrentView('register')}
        onSwitchToLanding={() => setCurrentView('landing')}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (currentView === 'register') {
    return (
      <Register
        onSwitchToLogin={() => setCurrentView('login')}
        onSwitchToLanding={() => setCurrentView('landing')}
        onRegisterSuccess={handleLoginSuccess}
      />
    );
  }

  if (currentView === 'activation-pricing') {
    return (
      <ActivationPricing
        session={session}
        onBackToLanding={() => setCurrentView('landing')}
        onUnlocked={() => setCurrentView('dashboard')}
        onLogout={handleLogout}
      />
    );
  }

  if (currentView === 'dashboard' && session) {
    return (
      <Suspense fallback={<div className="app-loading">Đang tải Bảng điều khiển...</div>}>
        {role === 'admin' ? (
          <AdminDashboard session={session} onBackToLanding={() => setCurrentView('landing')} />
        ) : role === 'staff' ? (
          <StaffDashboard session={session} onBackToLanding={() => setCurrentView('landing')} />
        ) : (
          <Dashboard session={session} onBackToLanding={() => setCurrentView('landing')} />
        )}
      </Suspense>
    );
  }

  // Default view is always Landing page!
  return (
    <Landing
      session={session}
      role={role}
      onSwitchToLogin={() => setCurrentView('login')}
      onSwitchToRegister={() => setCurrentView('register')}
      onGoToDashboard={handleGoToDashboard}
      onLogout={handleLogout}
    />
  );
}

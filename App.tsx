
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Classroom from './pages/Classroom';
import StudentZoneView from './pages/StudentZoneView';
import Notifications from './pages/Notifications';
import Search from './pages/Search';
import Explore from './pages/Explore';
import Inbox from './pages/Inbox';
import Workplace from './pages/Workplace';
import ZoneManagement from './pages/ZoneManagement';
import LaunchZone from './pages/LaunchZone';
import Settings from './pages/Settings';
import AvailabilitySetup from './pages/AvailabilitySetup';
import ProfileView from './pages/ProfileView';
// PublicProfile removed
import ProductManagement from './pages/ProductManagement';
import CertificateEngine from './pages/CertificateEngine';
import ListProductFlow from './pages/ListProductFlow';
import VerificationPortal from './pages/VerificationPortal';
import Auth from './pages/Auth';
import BookingPage from './pages/BookingPage';
import PricingPage from './pages/PricingPage';
import OnboardingSystem from './pages/OnboardingSystem';
import SandboxLive from './pages/SandboxLive';
import LandingPage from './pages/LandingPage';

import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types';

import Payment from './pages/Payment';
import LiveNotification from './components/LiveNotification';

const AppContent: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, isAuthenticated, toggleRole } = useAuth();

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const isPublicRoute = location.pathname.startsWith('/verify/') || location.pathname.startsWith('/u/') || location.pathname === '/';
  const isAuthRoute = location.pathname === '/auth';
  const isSandboxRoute = location.pathname.startsWith('/sandbox/');
  const isLiveRoute = location.pathname.startsWith('/live/');
  const isOnboardingRoute = location.pathname === '/onboarding';
  const hideHeader = isSandboxRoute || isOnboardingRoute;
  const hideSidebar = isSandboxRoute || isOnboardingRoute;

  if (!isAuthenticated && !isPublicRoute && !isAuthRoute) {
    return <Navigate to="/auth" replace />;
  }

  const role = user?.role || UserRole.STUDENT;
  const needsOnboarding =
    (role === UserRole.STUDENT && !user?.studentProfile?.isComplete) ||
    (role === UserRole.TUTOR && !user?.tutorProfile?.isComplete);

  if (isAuthenticated && needsOnboarding && !isOnboardingRoute && !isPublicRoute) {
    const targetRole = role === UserRole.TUTOR ? 'tutor' : 'student';
    return <Navigate to={`/onboarding?role=${targetRole}`} replace />;
  }

  if (isPublicRoute || isAuthRoute) {
    return (
      <main className="min-h-screen bg-[#fbfbfb]">
        <Routes>
          <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/dashboard" />} />
          <Route path="/verify/:id" element={<VerificationPortal />} />
          <Route path="/u/:id" element={<ProfileView />} />
          <Route path="/profile/:id" element={<ProfileView />} />
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </main>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#fbfbfb]">
      {!hideSidebar && <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {!hideHeader && <Header onToggleRole={toggleRole} />}

        <main className={`flex-1 overflow-y-auto ${isLiveRoute ? 'p-0' : 'p-4 md:p-8'} custom-scrollbar relative`}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingSystem />} />
            <Route path="/dashboard" element={<Dashboard role={role} />} />
            <Route path="/classroom" element={role === UserRole.STUDENT ? <Classroom /> : <Navigate to="/workplace" />} />
            <Route path="/classroom/zone/:zoneId" element={role === UserRole.STUDENT ? <StudentZoneView /> : <Navigate to="/dashboard" />} />
            <Route path="/workplace" element={role === UserRole.TUTOR ? <Workplace /> : <Navigate to="/classroom" />} />
            <Route path="/workplace/manage/:zoneId" element={role === UserRole.TUTOR ? <ZoneManagement /> : <Navigate to="/dashboard" />} />
            <Route path="/workplace/launch" element={role === UserRole.TUTOR ? <LaunchZone /> : <Navigate to="/dashboard" />} />
            <Route path="/certificate-engine" element={role === UserRole.TUTOR ? <CertificateEngine /> : <Navigate to="/dashboard" />} />
            <Route path="/list-product/flow" element={role === UserRole.TUTOR ? <ListProductFlow /> : <Navigate to="/dashboard" />} />
            <Route path="/live/:zoneId/:sessionId" element={<SandboxLive />} />
            <Route path="/sandbox/live" element={<SandboxLive />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/search" element={<Search />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="/settings/availability" element={<AvailabilitySetup />} />
            <Route path="/profile/:id" element={<ProfileView />} />
            <Route path="/products" element={<ProductManagement />} />
            <Route path="/u/:id" element={<ProfileView />} />
            <Route path="/payment/:zoneId" element={<Payment />} />
            <Route path="/booking/:productId" element={<BookingPage />} />
            <Route path="/billing" element={<PricingPage />} />
          </Routes>
        </main>
      </div>
      <LiveNotification />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;

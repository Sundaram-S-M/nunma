import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Classroom = React.lazy(() => import('./pages/Classroom'));
const StudentZoneView = React.lazy(() => import('./pages/StudentZoneView'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Search = React.lazy(() => import('./pages/Search'));
const Explore = React.lazy(() => import('./pages/Explore'));
const Inbox = React.lazy(() => import('./pages/Inbox'));
const Workplace = React.lazy(() => import('./pages/Workplace'));
const ZoneManagement = React.lazy(() => import('./pages/ZoneManagement'));
const ErrorBoundary = React.lazy(() => import('./components/ErrorBoundary'));
const LaunchZone = React.lazy(() => import('./pages/LaunchZone'));
const Settings = React.lazy(() => import('./pages/Settings'));
const AvailabilitySetup = React.lazy(() => import('./pages/AvailabilitySetup'));
const ProfileView = React.lazy(() => import('./pages/ProfileView'));
const ProductManagement = React.lazy(() => import('./pages/ProductManagement'));
const CertificateEngine = React.lazy(() => import('./pages/CertificateEngine'));
const ListProductFlow = React.lazy(() => import('./pages/ListProductFlow'));
const VerificationPortal = React.lazy(() => import('./pages/VerificationPortal'));
const Auth = React.lazy(() => import('./pages/Auth'));
const BookingPage = React.lazy(() => import('./pages/BookingPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const OnboardingSystem = React.lazy(() => import('./pages/OnboardingSystem'));
const ClassroomPage = React.lazy(() => import('./pages/ClassroomPage'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const PublicLayout = React.lazy(() => import('./layouts/PublicLayout'));
const LegalPolicy = React.lazy(() => import('./pages/LegalPolicy'));
const WhiteboardPage = React.lazy(() => import('./pages/WhiteboardPage'));
const AnalyticsDashboard = React.lazy(() => import('./pages/AnalyticsDashboard'));
const AnalyticsChat = React.lazy(() => import('./pages/AnalyticsChat.tsx'));
const Payment = React.lazy(() => import('./pages/Payment'));
const ZoneDetailView = React.lazy(() => import('./pages/ZoneDetailView'));
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types';
import LiveNotification from './components/LiveNotification';
import { SidebarProvider, useSidebar } from './context/SidebarContext';

const AppContent: React.FC = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { user, isAuthenticated, isLoading, toggleRole } = useAuth();

  // Task 2.1: Capture invite token and zoneId from URL
  React.useEffect(() => {
    const query = new URLSearchParams(location.search);
    const inviteToken = query.get('invite');
    if (inviteToken) {
      sessionStorage.setItem('pendingInvite', inviteToken);
      
      // Extract zoneId from path like /classroom/zone/XXXX
      const pathParts = location.pathname.split('/');
      const zoneIdIndex = pathParts.indexOf('zone');
      if (zoneIdIndex !== -1 && pathParts[zoneIdIndex + 1]) {
        sessionStorage.setItem('pendingZoneId', pathParts[zoneIdIndex + 1]);
      }

      // Cleanup URL
      const newParams = new URLSearchParams(location.search);
      newParams.delete('invite');
      const search = newParams.toString() ? `?${newParams.toString()}` : '';
      window.history.replaceState({}, '', location.pathname + search);
    }
  }, [location]);

  const isPublicRoute = location.pathname.startsWith('/verify/') || location.pathname.startsWith('/u/') || location.pathname.startsWith('/zone/') || location.pathname === '/';
  const isAuthRoute = location.pathname === '/auth';
  const isSandboxRoute = location.pathname.startsWith('/sandbox/');
  const isLiveRoute = location.pathname.startsWith('/live/') || (location.pathname.startsWith('/classroom/') && !location.pathname.startsWith('/classroom/zone/'));
  const isOnboardingRoute = location.pathname === '/onboarding';
  const isWhiteboardRoute = location.pathname.startsWith('/whiteboard/');
  const hideHeader = isSandboxRoute || isOnboardingRoute || isWhiteboardRoute;
  const hideSidebar = isSandboxRoute || isOnboardingRoute || isWhiteboardRoute;

  const isLiveMode = isLiveRoute || isWhiteboardRoute;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="w-12 h-12 border-4 border-[#c2f575] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p style={{ color: 'var(--text-primary, #ffffff)', fontSize: '1.2rem', fontWeight: 500 }}>Loading Nunma...</p>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute && !isAuthRoute) {
    return <Navigate to="/auth" replace />;
  }

  const role = user?.role || UserRole.STUDENT;
  const showOnboarding = isAuthenticated && role && (
    (role === UserRole.THALA && user?.tutorProfile?.isComplete !== true) ||
    (role === UserRole.STUDENT && user?.studentProfile?.isComplete !== true)
  );

  const targetRole = role === UserRole.THALA ? 'tutor' : 'student';

  if (showOnboarding && !isOnboardingRoute && !isPublicRoute) {
    return <Navigate to={`/onboarding?role=${targetRole}`} replace />;
  }

  if (isPublicRoute || isAuthRoute) {
    return (
      <main className="min-h-screen">
        <Suspense fallback={<NunmaPageLoader />}>
          <Routes>
            <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/dashboard" />} />
            <Route path="/verify/:id" element={<VerificationPortal />} />
            <Route path="/u/:id" element={<ProfileView />} />
            <Route path="/profile/:id" element={<ProfileView />} />
            <Route path="/zone/:zoneId" element={<PublicLayout><ErrorBoundary><ZoneDetailView /></ErrorBoundary></PublicLayout>} />
            <Route path="/legal" element={<PublicLayout><LegalPolicy /></PublicLayout>} />
            <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
          </Routes>
        </Suspense>
      </main>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {!hideSidebar && <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', overflow: 'hidden' }}>
        {!hideHeader && <Header onToggleRole={toggleRole} />}

        <main className={`flex-1 ${isLiveMode ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-8'} custom-scrollbar relative`} style={{ background: 'var(--bg)' }}>
          <Suspense fallback={<NunmaPageLoader />}>
            <Routes>
              <Route path="/onboarding" element={<OnboardingSystem />} />
              <Route path="/dashboard" element={<Dashboard role={role} />} />
              <Route path="/classroom" element={role === UserRole.STUDENT ? <Classroom /> : <Navigate to="/workplace" />} />
              <Route path="/classroom/zone/:zoneId" element={role === UserRole.STUDENT ? <StudentZoneView /> : <Navigate to="/dashboard" />} />
              <Route path="/workplace" element={role === UserRole.THALA ? <Workplace /> : <Navigate to="/classroom" />} />
              <Route path="/workplace/manage/:zoneId" element={
                role === UserRole.THALA ? (
                  <ErrorBoundary>
                    <ZoneManagement />
                  </ErrorBoundary>
                ) : <Navigate to="/dashboard" />
              } />
              <Route path="/workplace/launch" element={role === UserRole.THALA ? <LaunchZone /> : <Navigate to="/dashboard" />} />
              <Route path="/certificate-engine" element={role === UserRole.THALA ? <CertificateEngine /> : <Navigate to="/dashboard" />} />
              <Route path="/list-product/flow" element={role === UserRole.THALA ? <ListProductFlow /> : <Navigate to="/dashboard" />} />
              <Route path="/classroom/:zoneId" element={
                <ErrorBoundary>
                  <ClassroomPage />
                </ErrorBoundary>
              } />
              <Route path="/whiteboard/:zoneId" element={
                <ErrorBoundary>
                  <WhiteboardPage />
                </ErrorBoundary>
              } />
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
              <Route path="/workplace/analytics/:zoneId" element={
                role === UserRole.THALA ? (
                  <ErrorBoundary>
                    <AnalyticsDashboard />
                  </ErrorBoundary>
                ) : <Navigate to="/dashboard" />
              } />
              <Route path="/workplace/analytics/:zoneId/chat" element={
                role === UserRole.THALA ? (
                  <ErrorBoundary>
                    <AnalyticsChat />
                  </ErrorBoundary>
                ) : <Navigate to="/dashboard" />
              } />
            </Routes>
          </Suspense>
        </main>
      </div>
      <LiveNotification />
    </div>
  );
};

const NunmaPageLoader = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040457' }}>
      <div style={{ width: 48, height: 48, border: '4px solid #c2f575', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SidebarProvider>
          <Toaster position="top-center" reverseOrder={false} />
          <AppContent />
        </SidebarProvider>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

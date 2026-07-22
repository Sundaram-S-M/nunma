import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
const About = React.lazy(() => import('./pages/About'));
const WhiteboardPage = React.lazy(() => import('./pages/WhiteboardPage'));
const BlogList = React.lazy(() => import('./pages/BlogList'));
const BlogDetail = React.lazy(() => import('./pages/BlogDetail'));
const AnalyticsDashboard = React.lazy(() => import('./pages/AnalyticsDashboard'));
const AnalyticsChat = React.lazy(() => import('./pages/AnalyticsChat.tsx'));
const Payment = React.lazy(() => import('./pages/Payment'));
const ZoneDetailView = React.lazy(() => import('./pages/ZoneDetailView'));
const ProFeatures = React.lazy(() => import('./pages/ProFeatures'));
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X } from 'lucide-react';
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

  const isPublicRoute = location.pathname.startsWith('/verify/') || location.pathname.startsWith('/u/') || location.pathname.startsWith('/zone/') || location.pathname.startsWith('/blog') || location.pathname.startsWith('/legal') || location.pathname === '/about' || location.pathname === '/pro-features' || location.pathname === '/';
  const isAuthRoute = location.pathname === '/auth';
  const isSandboxRoute = location.pathname.startsWith('/sandbox/');
  const isLiveRoute = location.pathname.startsWith('/live/') || (location.pathname.startsWith('/classroom/') && !location.pathname.startsWith('/classroom/zone/'));
  const isOnboardingRoute = location.pathname === '/onboarding';
  const isWhiteboardRoute = location.pathname.startsWith('/whiteboard/');
  const hideHeader = isSandboxRoute || isOnboardingRoute || isWhiteboardRoute || isLiveRoute;
  const hideSidebar = isSandboxRoute || isOnboardingRoute || isWhiteboardRoute;

  const isLiveMode = isLiveRoute || isWhiteboardRoute;

  if (isLoading) {
    return <NunmaPageLoader />;
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
            <Route path="/legal" element={<LegalPolicy />} />
            <Route path="/legal/:section" element={<LegalPolicy />} />
            <Route path="/about" element={<About />} />
            <Route path="/pro-features" element={<ProFeatures />} />
            <Route path="/blog" element={<PublicLayout><BlogList /></PublicLayout>} />
            <Route path="/blog/:id" element={<PublicLayout><BlogDetail /></PublicLayout>} />
            {/* LandingPage owns its own navbar and footer — no PublicLayout wrapper */}
            <Route path="/" element={<LandingPage />} />
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

        <main id="main-scroll-container" className={`flex-1 ${isLiveMode ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-8'} custom-scrollbar relative`} style={{ background: 'var(--bg)' }}>
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

const NUNMA_FACTS = [
  "Nunma is built to seamlessly connect students and mentors.",
  "Our name 'Nunma' signifies excellence and quality.",
  "The AI Zone Insights Engine analyzes hundreds of records in seconds.",
  "Nunma's Live Classroom uses ultra-low latency WebRTC for real-time interaction.",
  "Every zone is fully customizable to fit different learning styles.",
  "The Nunma Agent can instantly parse and export data to Excel!",
  "Nunma automatically verifies students using AI face tracking."
];

export const NunmaPageLoader = () => {
  const [show, setShow] = useState(false);
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300); // Prevent flicker for fast loads
    
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % NUNMA_FACTS.length);
    }, 4000); // Rotate fact every 4s
    
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  if (!show) return null;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#052E16', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <div style={{ width: 80, height: 80, border: '4px solid rgba(194, 245, 117, 0.2)', borderRadius: '50%' }}></div>
        <div style={{ width: 80, height: 80, border: '4px solid #c2f575', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', position: 'absolute', top: 0, left: 0 }} />
      </div>
      
      <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>Please wait, loading...</h2>
      
      <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '400px', padding: '0 24px', textAlign: 'center' }}>
        <p key={factIndex} style={{ color: '#cbd5e1', fontWeight: 500, lineHeight: 1.5, animation: 'fadeIn 0.5s ease-out' }}>
          <span style={{ color: '#c2f575', fontWeight: 'bold', marginRight: '8px' }}>Did you know?</span> 
          {NUNMA_FACTS[factIndex]}
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <SidebarProvider>
          <Toaster position="top-center" reverseOrder={false}>
            {(t) => (
              <ToastBar toast={t}>
                {({ icon, message }) => (
                  <>
                    {icon}
                    {message}
                    {t.type !== 'loading' && (
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="ml-2 p-1 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center shrink-0"
                        aria-label="Close toast"
                      >
                        <X size={16} className="text-gray-400 hover:text-gray-600 transition-colors" />
                      </button>
                    )}
                  </>
                )}
              </ToastBar>
            )}
          </Toaster>
          <AppContent />
        </SidebarProvider>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;

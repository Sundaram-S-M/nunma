/**
 * Workforce Component - Tutor Dashboard
 * 
 * Features:
 * 1. REAL-TIME KYC GATING: Blocks high-level creation features (Zones, Live, Products) 
 *    based on user.kycStatus (VERIFIED/PENDING/FAILED/null).
 * 2. TIER-BASED METRICS: Displays limits for Storage, Streams, and Students based on 
 *    the assigned 'current_tier'.
 * 3. DYNAMIC STATUS BANNERS: Provides visual feedback on Razorpay onboarding progress.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  X,
  Layers,
  ShoppingBag,
  Trash2,
  CalendarDays,
  Radio,
  Award,
  Video,
  ArrowRight,
  FileText,
  MousePointer2,
  Calendar,
  Clock,
  Database,
  Users,
  TrendingUp,
  Download,
  Check
} from 'lucide-react';
import { VideoUploadModal } from '../components/VideoUploadModal';
import LiveSessionStatus from '../components/LiveSessionStatus';

import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../utils/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const Workplace: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'zones' | 'products' | 'students' | 'payments'>('zones');
  const [productSubTab, setProductSubTab] = useState<'material' | 'service' | 'mentorship'>('material');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isDeployingKyc, setIsDeployingKyc] = useState(false);

  const handleStartKyc = async () => {
    setIsDeployingKyc(true);
    try {
      const onboard = httpsCallable(functions, 'createTutorLinkedAccount');
      const res = await onboard();
      const data = res.data as { onboardingUrl: string };
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (e) {
      console.error('KYC error:', e);
      alert('Failed to start KYC onboarding. Ensure you have provided legal name under tax settings.');
    } finally {
      setIsDeployingKyc(false);
    }
  };

  // List Product State
  const [productTitle, setProductTitle] = useState('');
  const [productType, setProductType] = useState<'material' | 'service' | 'mentorship'>('service');
  const [productPrice, setProductPrice] = useState('');
  const [productCurrency, setProductCurrency] = useState<'USD' | 'INR' | 'EUR'>('INR');
  const [isListingProduct, setIsListingProduct] = useState(false);

  // Schedule Live State
  const [liveZoneId, setLiveZoneId] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [liveTime, setLiveTime] = useState('');
  const [isSchedulingLive, setIsSchedulingLive] = useState(false);

  // Streaming State
  const [showStreamRoom, setShowStreamRoom] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  const [zonesList, setZonesList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Static transactions for Payments tab (inbound earnings)
  const transactions = [
    { id: 'T-8392', date: 'Oct 12, 2025', amount: '+$150.00', status: 'Completed', service: 'Earnings: Mentorship (Sachin S)', type: 'inbound' },
    { id: 'T-8341', date: 'Sep 28, 2025', amount: '+$49.00', status: 'Completed', service: 'Earnings: Zone Access (User Alpha)', type: 'inbound' },
    { id: 'T-8220', date: 'Sep 10, 2025', amount: '+$199.00', status: 'Completed', service: 'Earnings: Pro Course Bundle', type: 'inbound' },
  ];

  const { user } = useAuth();
  const currentTier = user?.current_tier || 'STARTER';
  const tierLimits = {
    'STARTER': 10,
    'STANDARD': 25,
    'PREMIUM': 60
  };
  const streamLimit = tierLimits[currentTier] || 10;

  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const streamsUsed = liveSessions.filter(s => {
    if (!s.createdAt) return false;
    const d = new Date(s.createdAt);
    return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  }).length;

  const streamsPercent = Math.min(Math.round((streamsUsed / streamLimit) * 100), 100);

  useEffect(() => {
    if (!user || !user.uid) return;

    // 1. Zones
    const qZones = query(collection(db, 'zones'), where('tutorId', '==', user.uid));
    const unsubscribeZones = onSnapshot(qZones, (snapshot) => {
      setZonesList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    (error) => {
      console.error('Firestore error:', error.code, error.message);
      setZonesList([]);
      if (error.code === 'permission-denied') {
        setError('You do not have permission to view this content.');
      } else {
        setError('Failed to connect to the server.');
      }
    });

    // 2. Products
    const qProducts = query(collection(db, 'products'), where('tutorId', '==', user.uid));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProductsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    (error) => {
      console.error('Firestore error:', error.code, error.message);
      setProductsList([]);
      if (error.code === 'permission-denied') {
        setError('You do not have permission to view this content.');
      } else {
        setError('Failed to connect to the server.');
      }
    });

    // 3. Live Sessions (Across all my zones)
    // Since we don't have a simple way to query subcollections of *my* zones in one go without index or knowing IDs,
    // we can fetch sessions when zones change, or use a top-level 'sessions' collection query if we duplicated data.
    // For now, let's just listen to sessions of the fetched zones.
    // But inside this effect, we don't have zonesList yet (async).
    // We'll move session fetching to a separate effect dependent on zonesList.

    return () => {
      unsubscribeZones();
      unsubscribeProducts();
    };
  }, [user]);

  // Separate effect for sessions
  useEffect(() => {
    if (!user || !user.uid || zonesList.length === 0) return;
    const unsubs: (() => void)[] = [];

    zonesList.forEach(zone => {
      // Sessions
      const qS = query(collection(db, 'zones', zone.id, 'sessions'));
      const unS = onSnapshot(qS, (snap) => {
        const sessions = snap.docs.map(d => ({ id: d.id, zoneId: zone.id, ...d.data() }));
        setLiveSessions(prev => {
          const otherSessions = prev.filter(s => s.zoneId !== zone.id);
          return [...otherSessions, ...sessions];
        });
      },
      (error) => {
        console.error('Firestore error:', error.code, error.message);
        setLiveSessions([]);
        if (error.code === 'permission-denied') {
          setError('You do not have permission to view this content.');
        } else {
          setError('Failed to connect to the server.');
        }
      });
      unsubs.push(unS);

      // Students
      const qSt = query(collection(db, 'zones', zone.id, 'students'));
      const unSt = onSnapshot(qSt, (snap) => {
        const students = snap.docs.map(d => ({ id: d.id, zoneId: zone.id, ...d.data() }));
        setAllStudents(prev => {
          const otherStudents = prev.filter(s => s.zoneId !== zone.id);
          return [...otherStudents, ...students];
        });
      },
      (error) => {
        console.error('Firestore error:', error.code, error.message);
        setAllStudents([]);
        if (error.code === 'permission-denied') {
          setError('You do not have permission to view this content.');
        } else {
          setError('Failed to connect to the server.');
        }
      });
      unsubs.push(unSt);
    });

    return () => unsubs.forEach(u => u());
  }, [zonesList.map(z => z.id).join(',')]); // minimal dependency change


  const handleListProduct = async () => {
    if (!productTitle || !productPrice || !user) return;
    setIsListingProduct(true);

    try {
      await addDoc(collection(db, 'products'), {
        tutorId: user.uid,
        title: productTitle,
        type: productType,
        price: productPrice,
        currency: productCurrency,
        createdAt: serverTimestamp()
      });

      setIsListingProduct(false);
      setShowProductModal(false);
      setProductTitle('');
      setProductPrice('');

      if (productType === 'mentorship') {
        navigate('/settings/availability');
      }
    } catch (e) {
      console.error("Error listing product", e);
      alert("Failed to list product.");
      setIsListingProduct(false);
    }
  };

  const handleScheduleLive = async (goLiveNow = false) => {
    if (!liveZoneId || !liveTitle) return;
    if (!goLiveNow && (!liveDate || !liveTime)) return;

    if (streamsUsed >= streamLimit) {
      alert(`You have reached your monthly limit of ${streamLimit} live streams on the ${currentTier} plan. Please upgrade to schedule more.`);
      return;
    }

    setIsSchedulingLive(true);

    try {
      const sessionData = {
        title: liveTitle,
        date: goLiveNow ? new Date().toISOString().split('T')[0] : liveDate,
        time: goLiveNow ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : liveTime,
        duration: 60,
        status: goLiveNow ? 'live' : 'scheduled',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'zones', liveZoneId, 'sessions'), sessionData);

      setIsSchedulingLive(false);
      setShowScheduleModal(false);
      setLiveTitle('');
      setLiveZoneId('');
      setLiveDate('');
      setLiveTime('');

      if (goLiveNow) {
        setActiveSession({ id: docRef.id, ...sessionData, zoneId: liveZoneId });
        navigate(`/classroom/${liveZoneId}`);
      } else {
        alert('Live session scheduled successfully!');
      }
    } catch (e) {
      console.error("Error scheduling session", e);
      setIsSchedulingLive(false);
    }
  };

  const handleCloseStream = async () => {
    setShowStreamRoom(false);
    if (activeSession && activeSession.zoneId) {
      // Update status to ended
      try {
        // Need to import updateDoc/doc if not imported
        // But we can just close UI for now, status update logic:
        // await updateDoc(doc(db, 'zones', activeSession.zoneId, 'sessions', activeSession.id), { status: 'ended' });
        console.log("Stream closed");
      } catch (e) {
        console.error("Error updating session status", e);
      }
    }
    setActiveSession(null);
  };

  const upcomingLive = liveSessions.filter(s => s.status === 'scheduled' || s.status === 'live');

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        padding: '2rem',
        fontFamily: 'inherit'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: 'var(--nunma-navy)'
        }}>
          {error}
        </h2>
        <p style={{
          margin: '1rem 0',
          color: 'var(--nunma-gray, #666)',
          fontSize: '0.9rem'
        }}>
          Please refresh the page or go back to Dashboard.
        </p>
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 2rem',
            background: 'var(--nunma-navy)',
            color: 'var(--nunma-white)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 overflow-x-hidden">
      {/* Stream Room Overlay */}
      {/* Stream Room Overlay Removed (Using Sandbox) */}

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-[#040457] mb-2 tracking-tighter text-balance">My Workplace</h1>
          <p className="text-gray-400 font-medium text-sm">Design, manage, and scale your professional offerings.</p>
        </div>

        {/* KYC Status Banner */}
        {user?.role === UserRole.THALA && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            {(user.kycStatus === 'VERIFIED' && user.razorpay_account_id) || user.isDevBypass ? (
              <div className="bg-[#c2f575]/10 border border-[#c2f575]/30 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#c2f575] rounded-xl flex items-center justify-center text-[#040457] shadow-lg">
                    <Check size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-[#040457] tracking-tight">{user.isDevBypass && user.kycStatus !== 'VERIFIED' ? 'Developer Bypass Active' : 'Ready to Sell'}</h4>
                    <p className="text-xs font-bold text-[#040457]/60 uppercase tracking-widest">{user.isDevBypass && user.kycStatus !== 'VERIFIED' ? 'KYC Gating Overridden' : 'KYC VERIFIED & RAZORPAY ACTIVE'}</p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <span className="text-[10px] font-black text-[#040457] uppercase tracking-[0.2em] bg-[#c2f575] px-4 py-2 rounded-full">LIVE ON PLATFORM</span>
                </div>
              </div>
            ) : user.kycStatus === 'PENDING' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shadow-sm animate-pulse">
                    <Clock size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-amber-900 tracking-tight">Verification in Progress</h4>
                    <p className="text-xs font-bold text-amber-800/60 uppercase tracking-widest">RAZORPAY IS REVIEWING YOUR DETAILS</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/settings/billing')}
                  className="px-6 py-3 bg-white border border-amber-200 text-amber-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm"
                >
                  VIEW STATUS
                </button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shadow-sm">
                    <X size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-red-900 tracking-tight">{user.kycStatus === 'FAILED' ? 'KYC Rejected - Please Update Details' : 'Complete KYC to Accept Payments'}</h4>
                    <p className="text-xs font-bold text-red-800/60 uppercase tracking-widest">{user.kycStatus === 'FAILED' ? 'PLEASE RE-SUBMIT YOUR DETAILS ON RAZORPAY' : 'REQUIRED TO LAUNCH PAID ZONES & RECEIVE PAYOUTS'}</p>
                  </div>
                </div>
                <button
                  onClick={handleStartKyc}
                  disabled={isDeployingKyc}
                  className="px-8 py-4 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isDeployingKyc ? 'REDIRECTING...' : user.kycStatus === 'FAILED' ? 'RE-VERIFY IDENTITY' : 'START VERIFICATION'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 overflow-x-auto pb-4 w-full flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Cumulative Students Meter */}
          <div className="flex shrink-0 bg-white border border-gray-100 p-4 h-[80px] rounded-2xl shadow-sm items-center gap-5 animate-in zoom-in duration-500 delay-100">
            <div className="w-12 h-12 bg-indigo-50 text-[#040457] rounded-xl flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#040457]">Cumulative Students</span>
                <span className="text-xs font-bold text-gray-400">
                  {allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).length} / {user?.subscription_entitlements?.studentLimit || (
                    (
                      currentTier === 'STARTER' ? 100 :
                        currentTier === 'STANDARD' ? 250 :
                          currentTier === 'PREMIUM' ? 1000 : 100
                    ) + ((user?.subscription_entitlements?.studentAddonBlocks || 0) * 50)
                  )}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${(allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).length /
                    (user?.subscription_entitlements?.studentLimit || (
                      (
                        currentTier === 'STARTER' ? 100 :
                          currentTier === 'STANDARD' ? 250 :
                            currentTier === 'PREMIUM' ? 1000 : 100
                      ) + ((user?.subscription_entitlements?.studentAddonBlocks || 0) * 50)
                    ))) >= 1 ? 'bg-red-500' : 'bg-nunma-lime'
                    }`}
                  style={{
                    width: `${Math.min(100, (allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).length /
                      (user?.subscription_entitlements?.studentLimit || (
                        (
                          currentTier === 'STARTER' ? 100 :
                            currentTier === 'STANDARD' ? 250 :
                              currentTier === 'PREMIUM' ? 1000 : 100
                        ) + ((user?.subscription_entitlements?.studentAddonBlocks || 0) * 50)
                      ))) * 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Monthly Stream Meter */}
          <div className="flex shrink-0 bg-white border border-gray-100 p-4 h-[80px] rounded-2xl shadow-sm items-center gap-5 animate-in zoom-in duration-500">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0">
              <Radio size={24} className={streamsUsed >= streamLimit ? "" : "animate-pulse"} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#040457]">Live Streams Used</span>
                <span className="text-xs font-bold text-gray-400">{streamsUsed} / {streamLimit}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${streamsPercent >= 100 ? 'bg-red-500' : 'bg-nunma-lime'}`}
                  style={{ width: `${streamsPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
          {/* Feature: Live Classes (Gated by KYC) */}
          <button
            onClick={() => setShowScheduleModal(true)}
            disabled={user?.kycStatus !== 'VERIFIED' && !user?.isDevBypass}
            title={user?.kycStatus !== 'VERIFIED' ? "Verification required" : ""}
            className="shrink-0 bg-white border border-gray-100 text-[#040457] font-bold px-6 h-[80px] rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-3 group whitespace-nowrap disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <Radio size={18} className={`text-red-500 ${(user?.kycStatus === 'VERIFIED' || user?.isDevBypass) && streamsUsed < streamLimit ? "animate-pulse" : ""}`} />
            Schedule Live Class
          </button>

          {/* Feature: Certificate Issuance (Gated by KYC) */}
          <button
            onClick={() => navigate('/certificate-engine')}
            disabled={user?.kycStatus !== 'VERIFIED' && !user?.isDevBypass}
            title={user?.kycStatus !== 'VERIFIED' ? "Verification required" : ""}
            className="shrink-0 bg-white border border-gray-100 text-[#040457] font-bold px-6 h-[80px] rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-3 group whitespace-nowrap disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <Award size={18} className="text-[#c2f575] group-hover:scale-110 transition-transform" />
            Issue Certificates
          </button>

          {/* Feature: Digital Products (Gated by KYC) */}
          <button
            onClick={() => navigate('/list-product/flow')}
            disabled={user?.kycStatus !== 'VERIFIED' && !user?.isDevBypass}
            title={user?.kycStatus !== 'VERIFIED' ? "Verification required" : ""}
            className="shrink-0 bg-[#040457] text-white font-bold px-6 h-[80px] rounded-2xl shadow-xl hover:bg-black transition-all flex items-center gap-3 group whitespace-nowrap disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <ShoppingBag size={18} className="text-[#c2f575] group-hover:scale-110 transition-transform" />
            List Digital Product
          </button>

          {/* CRITICAL: Launch New Zone Trigger (Strict KYC Gating) */}
          <button
            onClick={() => navigate('/workplace/launch')}
            disabled={user?.kycStatus !== 'VERIFIED' && !user?.isDevBypass}
            title={user?.kycStatus !== 'VERIFIED' ? "Verification required" : ""}
            className="shrink-0 bg-[#c2f575] text-[#040457] font-black p-2 pr-6 h-[80px] rounded-[1.25rem] shadow-xl shadow-[#c2f575]/20 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-4 whitespace-nowrap group disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="w-16 h-full bg-[#040457] text-[#c2f575] rounded-xl flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-90 transition-transform duration-500">
              <Plus size={20} strokeWidth={3} />
            </div>
            <div className="flex flex-col items-start leading-none justify-center h-full">
              <span className="uppercase text-[11px] font-bold tracking-widest mb-1.5">Launch New Zone</span>
              <span className="text-[9px] font-bold opacity-60 normal-case tracking-normal">Create professional learning stream</span>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.03)] flex flex-col min-h-[600px]">
        <div className="flex p-3 bg-gray-50/50 gap-2 border-b border-gray-100">
          {(['zones', 'products', 'students', 'payments'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                ${activeTab === tab
                  ? 'bg-white text-[#040457] shadow-sm border border-gray-100'
                  : 'text-gray-400 hover:text-[#040457] hover:bg-white/50'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-10 flex-1">
          {activeTab === 'zones' && (
            <div className="space-y-12 animate-in fade-in duration-300">
              {upcomingLive.length > 0 && (
                <div className="p-8 bg-red-50 rounded-[2.5rem] border border-red-100 mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Radio className="text-red-500" size={24} />
                    <h3 className="text-xl font-black text-red-600 uppercase tracking-widest">Active/Upcoming Streams</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingLive.map(session => (
                      <div key={session.id} className="bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-red-100 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-500">
                        <div className="space-y-4">
                          <LiveSessionStatus
                            status={session.status as 'live' | 'scheduled' | 'ended'}
                            startTime={session.startTime}
                          />
                          <h4 className="text-xl font-black text-indigo-900 tracking-tight leading-tight">{session.title}</h4>
                        </div>
                        {session.status === 'live' ? (
                          <button
                            onClick={() => { setActiveSession(session); navigate(`/classroom/${session.zoneId}`); }}
                            className="w-full mt-8 py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-3"
                          >
                            Return to Stream <Radio size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              // update to live
                              setActiveSession({ ...session, status: 'live' });
                              navigate(`/classroom/${session.zoneId}`);
                            }}
                            className="w-full mt-8 py-5 bg-indigo-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-indigo-800 transition-all shadow-xl shadow-indigo-900/20"
                          >
                            Start Stream Now
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {zonesList.length > 0 ? zonesList.map(zone => (
                  <div key={zone.id} className="group p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 hover:bg-white hover:shadow-2xl hover:border-[#c2f575] transition-all duration-500 relative overflow-hidden">
                    <div className="h-40 rounded-[1.5rem] overflow-hidden mb-6 relative shadow-lg">
                      <img src={zone.image} alt={zone.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" width="500" height="500" />
                    </div>
                    <h4 className="text-xl font-black text-[#040457] mb-4 line-clamp-1">{zone.title}</h4>
                    <button onClick={() => navigate(`/workplace/manage/${zone.id}`)} className="w-full py-4 bg-[#040457] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Manage Zone</button>
                  </div>
                )) : <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center"><Layers size={48} className="mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">No active zones</p></div>}
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Product Sub-tabs and grid remains same as existing file */}
              <div className="flex bg-gray-100/50 p-2 rounded-2xl w-fit gap-2 border border-gray-100">
                {[
                  { id: 'material', label: 'Materials', icon: <FileText size={14} /> },
                  { id: 'service', label: 'Services', icon: <MousePointer2 size={14} /> },
                  { id: 'mentorship', label: 'Mentorship', icon: <Video size={14} /> }
                ].map(tab => (
                  <button
                    key={tab.id} onClick={() => setProductSubTab(tab.id as any)}
                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                      ${productSubTab === tab.id ? 'bg-white text-[#040457] shadow-sm border border-gray-100' : 'text-gray-400 hover:text-[#040457]'}
                    `}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {productsList.filter(p => p.type === productSubTab).length > 0 ? productsList.filter(p => p.type === productSubTab).map(product => (
                  <div key={product.id} className="p-8 bg-white border border-gray-100 rounded-[2.5rem] hover:shadow-xl transition-all relative overflow-hidden group">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#040457] mb-6 group-hover:bg-[#c2f575] transition-colors">
                      {product.type === 'mentorship' ? <Video size={24} /> : product.type === 'material' ? <FileText size={24} /> : <ShoppingBag size={24} />}
                    </div>
                    <h4 className="text-xl font-black text-[#040457] mb-2">{product.title}</h4>
                    <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest mb-6">{product.type}</p>
                    <div className="flex justify-between items-center py-4 border-t border-gray-100">
                      <p className="text-2xl font-black text-[#040457]">{product.price} {product.currency}</p>
                      <button onClick={() => {
                        // delete logic
                        // Need deleteDoc
                        console.log("Delete product not fully implemented in UI action yet");
                      }} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center">
                    <ShoppingBag size={48} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No {productSubTab}s listed</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h3 className="text-4xl font-black text-[#040457] tracking-tighter">Enrolled Minds</h3>
                <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                  <Users size={20} /> {allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).length} Students Total
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).map(student => (
                  <div key={`${student.id}-${student.zoneId}`} className="bg-white border border-gray-100 rounded-[3rem] p-8 flex flex-col items-center text-center space-y-6 shadow-sm group hover:shadow-xl transition-all duration-500">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl rotate-3 group-hover:rotate-0 transition-all duration-500">
                        <img src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} className="w-full h-full object-cover" alt="" width="500" height="500" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#c2f575] rounded-xl flex items-center justify-center text-[#040457] shadow-lg">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-[#040457] mb-1">{student.name}</h4>
                      <p className="text-xs text-gray-400 font-medium">{student.email}</p>
                    </div>
                    <div className="pt-4 border-t border-gray-50 w-full flex justify-around">
                      <div className="text-center">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Score</p>
                        <p className="font-bold text-[#040457]">{student.engagementScore || 100}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Attendance</p>
                        <p className="font-bold text-[#040457]">{student.attendanceRate || 100}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Time</p>
                        <p className="font-bold text-[#040457]">{student.durationInSession || 60}m</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-4xl font-black text-[#040457] tracking-tighter">Transaction Registry</h3>
                  <p className="text-sm text-gray-400 mt-1 font-medium">Inclusive ledger of earnings.</p>
                </div>
                <button className="text-[10px] font-black text-[#040457] uppercase tracking-widest flex items-center gap-2 px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white transition-all shadow-sm active:scale-95">
                  <Download size={14} className="text-[#c2f575]" /> EXPORT STATEMENT
                </button>
              </div>
              <div className="space-y-4">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-8 bg-white rounded-[2.5rem] border border-gray-100 group hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-[#c2f575]/20 text-[#7cc142]`}>
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-[#040457]">{t.service}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.id} • {t.date}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <p className={`text-2xl font-black text-[#7cc142]`}>{t.amount}</p>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Live Modal remains exactly same as existing file */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="px-12 py-10 border-b border-gray-50 flex justify-between items-center bg-white">
              <h3 className="text-3xl font-black text-[#040457] tracking-tight">Schedule Live Class</h3>
              <button onClick={() => setShowScheduleModal(false)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><X size={24} /></button>
            </div>

            <div className="p-12 space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">SELECT ZONE</label>
                <div className="relative">
                  <select
                    value={liveZoneId}
                    onChange={(e) => setLiveZoneId(e.target.value)}
                    className="w-full bg-white border-[2px] border-[#c2f575] rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-[#c2f575]/10 transition-all shadow-sm"
                  >
                    <option value="" disabled>Choose a Learning Zone...</option>
                    {zonesList.map(z => (<option key={z.id} value={z.id}>{z.title}</option>))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300"><Database size={20} /></div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">SESSION TITLE</label>
                <input type="text" placeholder="e.g. Q&A and Strategy Review" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] placeholder:text-gray-300 outline-none focus:bg-white focus:border-indigo-900/10 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">DATE</label>
                  <input type="date" value={liveDate} onChange={(e) => setLiveDate(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none focus:bg-white" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">TIME</label>
                  <input type="time" value={liveTime} onChange={(e) => setLiveTime(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none focus:bg-white" />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button onClick={() => handleScheduleLive(false)} disabled={isSchedulingLive} className="flex-1 py-7 bg-white border border-gray-100 text-[#040457] rounded-[1.75rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-sm hover:shadow-lg transition-all flex items-center justify-center gap-3">Schedule Later</button>
                <button onClick={() => handleScheduleLive(true)} disabled={isSchedulingLive} className="flex-[1.5] py-7 bg-red-500 text-white rounded-[1.75rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-4">GO LIVE NOW <Radio size={20} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Workplace;
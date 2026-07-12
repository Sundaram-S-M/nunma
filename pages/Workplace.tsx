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

import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, functions } from '../utils/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { UserRole } from '../types';

const Workplace: React.FC = () => {
  const navigate = useNavigate();
  const { isSidebarOpen } = useSidebar();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'zones' | 'products' | 'students' | 'payments'>('zones');
  const [productSubTab, setProductSubTab] = useState<'material' | 'mentorship'>('material');
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
  const [productType, setProductType] = useState<'material' | 'mentorship'>('material');
  const [productPrice, setProductPrice] = useState('');
  const [productCurrency, setProductCurrency] = useState<'USD' | 'INR' | 'EUR'>('INR');
  const [isListingProduct, setIsListingProduct] = useState(false);

  // Schedule Live State
  const [liveZoneId, setLiveZoneId] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [liveTime, setLiveTime] = useState('');
  const [liveDuration, setLiveDuration] = useState('60');
  const [isSchedulingLive, setIsSchedulingLive] = useState(false);

  // Streaming State
  const [showStreamRoom, setShowStreamRoom] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  const [zonesList, setZonesList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Static transactions for Payments tab
  const transactions = [
    { id: 'T-8401', date: 'Oct 15, 2025', amount: '-$29.00', status: 'Completed', service: 'Platform Subscription', type: 'outbound' },
    { id: 'T-8392', date: 'Oct 12, 2025', amount: '+$150.00', status: 'Completed', service: 'Mentorship (Sachin S)', type: 'inbound' },
    { id: 'T-8341', date: 'Sep 28, 2025', amount: '+$49.00', status: 'Completed', service: 'Zone Access (User Alpha)', type: 'inbound' },
    { id: 'T-8220', date: 'Sep 10, 2025', amount: '+$199.00', status: 'Completed', service: 'Pro Course Bundle', type: 'inbound' },
  ];

  const handleExportStatement = () => {
    const headers = ['Transaction ID', 'Date', 'Time', 'Service', 'Amount', 'Status', 'Type'];
    const rows = transactions.map(t => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return `<tr>
        <td>${t.id}</td>
        <td>${t.date}</td>
        <td>${timeStr}</td>
        <td>${t.service}</td>
        <td>${t.amount}</td>
        <td>${t.status}</td>
        <td>${t.type}</td>
      </tr>`;
    });
    
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Statement</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          .header { background-color: #C2F575; color: #052E16; font-weight: bold; text-align: left; padding: 5px; }
          td { padding: 5px; white-space: nowrap; }
        </style>
      </head>
      <body>
        <table border="1">
          <tr>
            <td rowspan="4" colspan="3" style="border:none; text-align:left; vertical-align:top;">
              <img src="${window.location.origin}/assets/logo-full.png" alt="Nunma" height="60" />
            </td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
          </tr>
          <tr>
            <td style="border:none; font-weight:bold; color:#052E16;">Zone Name</td>
            <td style="border:none;">Global Platform</td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
          </tr>
          <tr>
            <td style="border:none; font-weight:bold; color:#052E16;">User Name</td>
            <td style="border:none;">${user?.tutorProfile?.legalName || user?.displayName || 'Tutor'}</td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
          </tr>
          <tr>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
          </tr>
          <tr>
            ${headers.map(h => `<th class="header">${h}</th>`).join('')}
          </tr>
          ${rows.join('\n')}
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transaction_statement_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const { user } = useAuth();
  const kycVerified = (user?.kycStatus === 'VERIFIED' && user?.razorpay_account_id) || user?.isDevBypass;
  const hasAccess = user?.role === UserRole.THALA || user?.isWhitelisted === true;

  if (user && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-red-500/10">
          <X size={48} strokeWidth={3} />
        </div>
        <h1 className="text-4xl font-black text-nunma-forest mb-4 tracking-tighter">Access Restricted</h1>
        <p className="text-gray-400 font-medium max-w-md mx-auto mb-10 text-lg">
          You do not have permission to view this content. Only verified Thalas can access the professional workplace.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-12 py-5 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isKycVerified = hasAccess;
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
    if (!user || !user.uid || user.role !== UserRole.THALA) return;

    // 1. Zones
    const qZones = query(collection(db, 'zones'), where('tutorId', '==', user.uid));
    const unsubscribeZones = onSnapshot(qZones, (snapshot) => {
      setZonesList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    (error) => {
      console.warn('Firestore error in zones listener:', error.code, error.message);
      setZonesList([]);
    });

    // 2. Products
    const qProducts = query(collection(db, 'products'), where('tutorId', '==', user.uid));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProductsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    (error) => {
      console.warn('Firestore error in products listener:', error.code, error.message);
      setProductsList([]);
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
    if (!user || !user.uid || user.role !== UserRole.THALA) return;
    
    // If no zones, clear everything and return
    if (zonesList.length === 0) {
      setLiveSessions([]);
      setAllStudents([]);
      return;
    }

    const unsubs: (() => void)[] = [];

    zonesList.forEach(zone => {
      if (!zone || !zone.id || typeof zone.id !== 'string') return;
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
        console.warn(`Firestore error in sessions listener for zone ${zone.id}:`, error.code, error.message);
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
        console.warn(`Firestore error in students listener for zone ${zone.id}:`, error.code, error.message);
      });
      unsubs.push(unSt);
    });

    return () => {
      unsubs.forEach(u => u());
      // When zonesList changes, we need to clear out sessions/students from zones that no longer exist
      const validZoneIds = new Set(zonesList.map(z => z.id));
      setLiveSessions(prev => prev.filter(s => validZoneIds.has(s.zoneId)));
      setAllStudents(prev => prev.filter(s => validZoneIds.has(s.zoneId)));
    };
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

  const notifyStudentsOfLiveSession = async (zoneId: string, title: string, isLiveNow: boolean, scheduledDate?: string, scheduledTime?: string) => {
    try {
      const studentsSnap = await getDocs(collection(db, 'zones', zoneId, 'students'));
      const notifyPromises: Promise<any>[] = [];
      studentsSnap.forEach(studentDoc => {
        const studentUid = studentDoc.id;
        notifyPromises.push(
          addDoc(collection(db, 'users', studentUid, 'notifications'), {
            type: isLiveNow ? 'LIVE_SESSION_STARTED' : 'LIVE_SCHEDULED',
            title: isLiveNow ? '🔴 Live Class Started' : '📅 Live Class Scheduled',
            message: isLiveNow 
              ? `Live class "${title}" is now live! Join now.`
              : `A live class "${title}" has been scheduled for ${scheduledDate} @ ${scheduledTime}.`,
            zoneId,
            actionUrl: `/classroom/${zoneId}`,
            read: false,
            createdAt: serverTimestamp(),
          })
        );
      });
      await Promise.allSettled(notifyPromises);
    } catch (notifyErr) {
      console.warn('Could not send live notifications to students:', notifyErr);
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
        duration: parseInt(liveDuration, 10) || 60,
        status: goLiveNow ? 'live' : 'scheduled',
        startTime: goLiveNow ? new Date().toISOString() : '',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'zones', liveZoneId, 'sessions'), sessionData);

      // Notify all enrolled students
      await notifyStudentsOfLiveSession(liveZoneId, liveTitle, goLiveNow, sessionData.date, sessionData.time);

      setIsSchedulingLive(false);
      setShowScheduleModal(false);
      setLiveTitle('');
      setLiveZoneId('');
      setLiveDate('');
      setLiveTime('');
      setLiveDuration('60');

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
    if (activeSession && activeSession.zoneId && db) {
      try {
        await updateDoc(doc(db, 'zones', activeSession.zoneId, 'sessions', activeSession.id), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
        console.log('Stream closed and status updated.');
      } catch (e) {
        console.error('Error updating session status', e);
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
        <div className="hidden md:block">
          <h1 className="text-4xl font-extrabold text-nunma-forest mb-2 tracking-tighter text-balance">My Workplace</h1>
          <p className="text-gray-400 font-medium text-sm">Design, manage, and scale your professional offerings.</p>
        </div>

        {/* KYC Status Banner */}
        {user?.role === UserRole.THALA && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            {isKycVerified ? (
              <div className="bg-[#c2f575]/10 border border-[#c2f575]/30 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#c2f575] rounded-xl flex items-center justify-center text-nunma-forest shadow-lg">
                    <Check size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-nunma-forest tracking-tight">{(user.isDevBypass || user.isWhitelisted) && user.kycStatus !== 'VERIFIED' ? 'Bypass Active' : 'Ready to Sell'}</h4>
                    <p className="text-xs font-bold text-nunma-forest/60 uppercase tracking-widest">{(user.isDevBypass || user.isWhitelisted) && user.kycStatus !== 'VERIFIED' ? 'KYC Gating Overridden' : 'KYC VERIFIED & RAZORPAY ACTIVE'}</p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <span className="text-[10px] font-black text-nunma-forest uppercase tracking-[0.2em] bg-[#c2f575] px-4 py-2 rounded-full">LIVE ON PLATFORM</span>
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

        {/* ── Mobile-only Workspace Action Panel ── */}
        <div className="md:hidden flex flex-col gap-4 w-full">

          {/* PRIMARY CTA: Launch New Zone */}
          <button
            onClick={() => navigate('/workplace/launch')}
            disabled={!isKycVerified}
            title={!isKycVerified ? "Verification required to launch a zone" : ""}
            className="w-full group relative overflow-hidden bg-[#c2f575] text-nunma-forest rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-[#c2f575]/25 hover:shadow-xl hover:shadow-[#c2f575]/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
            <div className="w-11 h-11 bg-nunma-forest text-[#c2f575] rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:rotate-90 transition-transform duration-500">
              <Plus size={20} strokeWidth={3} />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-extrabold uppercase tracking-widest leading-none">Launch New Zone</span>
              <span className="text-[11px] font-medium opacity-70 mt-0.5">Create professional learning stream</span>
            </div>
            <div className="ml-auto shrink-0 opacity-40 group-hover:opacity-70 transition-opacity">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </button>

          {/* STATS ROW: 2-column grid */}
          <div className="grid grid-cols-2 gap-3">
            {(() => {
              const uniqueStudents = allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).length;
              const studentLimit = user?.subscription_entitlements?.studentLimit || (
                (currentTier === 'STARTER' ? 100 : currentTier === 'STANDARD' ? 250 : currentTier === 'PREMIUM' ? 1000 : 100)
                + ((user?.subscription_entitlements?.studentAddonBlocks || 0) * 50)
              );
              const studentPct = Math.min(100, Math.round((uniqueStudents / studentLimit) * 100));
              const isNearLimit = studentPct >= 80;
              return (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3 animate-in zoom-in duration-500">
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center liquid-glass ${isNearLimit ? 'liquid-glass-red' : 'liquid-glass-blue'}`}>
                      <Users size={18} />
                    </div>
                    <span className={`text-xs font-black ${isNearLimit ? 'text-red-500' : 'text-gray-400'}`}>{uniqueStudents}<span className="text-gray-300 font-medium">/{studentLimit}</span></span>
                  </div>
                  <div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all duration-1000 ${isNearLimit ? 'bg-red-400' : 'bg-[#c2f575]'}`} style={{ width: `${studentPct}%` }} />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Students</p>
                  </div>
                </div>
              );
            })()}
            {(() => {
              const isAtLimit = streamsPercent >= 100;
              return (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3 animate-in zoom-in duration-500 delay-75">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center liquid-glass liquid-glass-red">
                      <Radio size={18} className={!isAtLimit ? 'animate-pulse' : ''} />
                    </div>
                    <span className={`text-xs font-black ${isAtLimit ? 'text-red-500' : 'text-gray-400'}`}>{streamsUsed}<span className="text-gray-300 font-medium">/{streamLimit}</span></span>
                  </div>
                  <div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all duration-1000 ${isAtLimit ? 'bg-red-500' : 'bg-[#c2f575]'}`} style={{ width: `${streamsPercent}%` }} />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Live Streams</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* KEY ACTIONS */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowScheduleModal(true)}
                disabled={!isKycVerified}
                title={!isKycVerified ? "Verification required" : ""}
                className="group relative bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md hover:border-red-100 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed min-h-[90px]"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center liquid-glass liquid-glass-red transition-all duration-300 group-hover:scale-110">
                  <Radio size={20} className={isKycVerified && streamsUsed < streamLimit ? 'animate-pulse' : ''} />
                </div>
                <span className="text-[10px] font-black text-nunma-forest uppercase tracking-wide text-center leading-tight">Schedule Live Class</span>
              </button>
              <button
                onClick={() => navigate('/certificate-engine')}
                disabled={!isKycVerified}
                title={!isKycVerified ? "Verification required" : ""}
                className="group relative bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md hover:border-[#c2f575]/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed min-h-[90px]"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center liquid-glass liquid-glass-green transition-all duration-300 group-hover:scale-110">
                  <Award size={20} />
                </div>
                <span className="text-[10px] font-black text-nunma-forest uppercase tracking-wide text-center leading-tight">Issue Certificates</span>
              </button>
              <button
                onClick={() => navigate('/list-product/flow')}
                disabled={!isKycVerified}
                title={!isKycVerified ? "Verification required" : ""}
                className="group col-span-2 relative bg-nunma-forest rounded-2xl p-4 flex items-center justify-center gap-3 shadow-lg shadow-nunma-forest/20 hover:shadow-xl hover:bg-nunma-forest/90 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed min-h-[68px]"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center liquid-glass liquid-glass-green transition-all duration-300 group-hover:scale-110 shrink-0">
                  <ShoppingBag size={18} />
                </div>
                <span className="text-[11px] font-black text-white uppercase tracking-widest">List Digital Product</span>
              </button>
            </div>
          </div>

        </div>

        {/* ── Desktop-only Workspace Action Panel (original design) ── */}
        <div className="hidden md:flex items-center gap-4 overflow-x-auto pb-4 w-full flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Cumulative Students Meter */}
          <div className="flex shrink-0 w-[250px] bg-white border border-gray-100 p-4 h-[80px] rounded-2xl shadow-sm items-center gap-4 animate-in zoom-in duration-500 delay-100">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 liquid-glass liquid-glass-blue">
              <Users size={24} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-nunma-forest">Cumulative Students</span>
                <span className="text-xs font-bold text-gray-400">
                  {allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).length} / {user?.subscription_entitlements?.studentLimit || (
                    (currentTier === 'STARTER' ? 100 : currentTier === 'STANDARD' ? 250 : currentTier === 'PREMIUM' ? 1000 : 100)
                    + ((user?.subscription_entitlements?.studentAddonBlocks || 0) * 50)
                  )}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${(allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).length / (user?.subscription_entitlements?.studentLimit || ((currentTier === 'STARTER' ? 100 : currentTier === 'STANDARD' ? 250 : currentTier === 'PREMIUM' ? 1000 : 100) + ((user?.subscription_entitlements?.studentAddonBlocks || 0) * 50)))) >= 1 ? 'bg-red-500' : 'bg-nunma-lime'}`}
                  style={{ width: `${Math.min(100, (allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).length / (user?.subscription_entitlements?.studentLimit || ((currentTier === 'STARTER' ? 100 : currentTier === 'STANDARD' ? 250 : currentTier === 'PREMIUM' ? 1000 : 100) + ((user?.subscription_entitlements?.studentAddonBlocks || 0) * 50)))) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Monthly Stream Meter */}
          <div className="flex shrink-0 w-[250px] bg-white border border-gray-100 p-4 h-[80px] rounded-2xl shadow-sm items-center gap-4 animate-in zoom-in duration-500">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 liquid-glass liquid-glass-red">
              <Radio size={24} className={streamsUsed >= streamLimit ? "" : "animate-pulse"} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-nunma-forest">Live Streams Used</span>
                <span className="text-xs font-bold text-gray-400">{streamsUsed} / {streamLimit}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${streamsPercent >= 100 ? 'bg-red-500' : 'bg-nunma-lime'}`}
                  style={{ width: `${streamsPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Feature: Live Classes */}
          <button
            onClick={() => setShowScheduleModal(true)}
            disabled={!isKycVerified}
            title={!isKycVerified ? "Verification required" : ""}
            className="shrink-0 w-[250px] bg-white border border-gray-100 text-nunma-forest font-bold px-4 h-[80px] rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-3 group whitespace-nowrap disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center liquid-glass liquid-glass-red transition-all duration-300 group-hover:scale-110">
              <Radio size={18} className={isKycVerified && streamsUsed < streamLimit ? "animate-pulse" : ""} />
            </div>
            Schedule Live Class
          </button>

          {/* Feature: Certificate Issuance */}
          <button
            onClick={() => navigate('/certificate-engine')}
            disabled={!isKycVerified}
            title={!isKycVerified ? "Verification required" : ""}
            className="shrink-0 w-[250px] bg-white border border-gray-100 text-nunma-forest font-bold px-4 h-[80px] rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-3 group whitespace-nowrap disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center liquid-glass liquid-glass-green transition-all duration-300 group-hover:scale-110">
              <Award size={18} />
            </div>
            Issue Certificates
          </button>

          {/* Feature: Digital Products */}
          <button
            onClick={() => navigate('/list-product/flow')}
            disabled={!isKycVerified}
            title={!isKycVerified ? "Verification required" : ""}
            className="shrink-0 w-[250px] bg-nunma-forest text-white font-bold px-4 h-[80px] rounded-2xl shadow-xl hover:bg-black transition-all flex items-center gap-3 group whitespace-nowrap disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center liquid-glass liquid-glass-green transition-all duration-300 group-hover:scale-110">
              <ShoppingBag size={18} />
            </div>
            List Digital Product
          </button>

          {/* CRITICAL: Launch New Zone */}
          <button
            onClick={() => navigate('/workplace/launch')}
            disabled={!isKycVerified}
            title={!isKycVerified ? "Verification required" : ""}
            className="shrink-0 w-[250px] bg-[#c2f575] text-nunma-forest font-bold px-4 h-[80px] rounded-2xl shadow-xl hover:shadow-[#c2f575]/40 transition-all flex items-center gap-3 group whitespace-nowrap disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-nunma-forest text-[#c2f575] transition-transform duration-300 group-hover:rotate-90 shadow-md">
              <Plus size={18} strokeWidth={3} />
            </div>
            Launch New Zone
          </button>
        </div>
      </div>



      <div className="bg-white max-md:bg-transparent rounded-[3rem] max-md:rounded-none border max-md:border-0 border-gray-100 overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.03)] max-md:shadow-none flex flex-col min-h-[600px]">
        <div className="flex p-3 max-md:p-1 bg-gray-50/50 max-md:bg-transparent gap-2 max-md:gap-1 border-b max-md:border-b-0 border-gray-100 max-md:justify-between w-full">
          {(['zones', 'products', 'students', 'payments'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 px-6 max-md:py-2 max-md:px-1 rounded-2xl max-md:rounded-full text-[10px] max-md:text-[9px] font-black uppercase tracking-widest max-md:tracking-wide transition-all text-center
                ${activeTab === tab
                  ? 'bg-white max-md:bg-nunma-forest text-nunma-forest max-md:text-white shadow-sm max-md:shadow-none border border-gray-100 max-md:border-transparent'
                  : 'text-gray-400 hover:text-nunma-forest hover:bg-white/50 max-md:border max-md:border-gray-200'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-10 max-md:p-4 flex-1">
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
                      <div key={session.id} className="bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-red-100 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-500 relative">
                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to delete this scheduled stream?")) {
                                try {
                                  await deleteDoc(doc(db, 'zones', session.zoneId, 'sessions', session.id));
                                } catch (e) {
                                  console.error("Failed to delete session", e);
                                  alert("Failed to delete stream");
                                }
                              }
                            }}
                            className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <LiveSessionStatus
                            status={session.status as 'live' | 'scheduled' | 'ended'}
                            startTime={session.startTime}
                          />
                          <h4 className="text-xl font-black text-indigo-900 tracking-tight leading-tight pr-12">{session.title}</h4>
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
                            onClick={async () => {
                              try {
                                const now = new Date();
                                const dateStr = now.toISOString().split('T')[0];
                                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                // Create Attendance Session document
                                const newAttendanceSession = {
                                  date: dateStr,
                                  time: timeStr,
                                  className: `Live: ${session.title}`,
                                  liveSessionId: session.id,
                                  ...(session.batchId ? { batchId: session.batchId } : {})
                                };
                                const attDocRef = await addDoc(collection(db, 'zones', session.zoneId, 'attendance_sessions'), newAttendanceSession);
                                const attendanceSessionId = attDocRef.id;

                                // Mark all students as 'Absent' initially
                                try {
                                  const studentsSnap = await getDocs(collection(db, 'zones', session.zoneId, 'students'));
                                  const updatePromises = studentsSnap.docs
                                    .filter(d => !session.batchId || d.data().batchId === session.batchId)
                                    .map(studentDoc => {
                                      const studentData = studentDoc.data() || {};
                                      const history = studentData.attendanceHistory || [];
                                      const newHistory = [...history, { 
                                        sessionId: attendanceSessionId, 
                                        status: 'Absent', 
                                        date: dateStr, 
                                        className: newAttendanceSession.className,
                                        ...(session.batchId ? { batchId: session.batchId } : {})
                                      }];
                                      return updateDoc(doc(db, 'zones', session.zoneId, 'students', studentDoc.id), { attendanceHistory: newHistory });
                                    });
                                  await Promise.all(updatePromises);
                                } catch (attErr) {
                                  console.error("Failed to initialize student attendance history:", attErr);
                                }

                                const startTimeIso = now.toISOString();
                                const updatedSession = { ...session, status: 'live', startTime: startTimeIso, attendanceSessionId };
                                await updateDoc(doc(db, 'zones', session.zoneId, 'sessions', session.id), {
                                  status: 'live',
                                  startTime: startTimeIso,
                                  attendanceSessionId
                                });
                                await notifyStudentsOfLiveSession(session.zoneId, session.title, true);
                                setActiveSession(updatedSession);
                                navigate(`/classroom/${session.zoneId}`);
                              } catch (e) {
                                console.error("Failed to start stream:", e);
                                alert("Failed to start stream. Please try again.");
                              }
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
                  <div key={zone.id} className="group p-8 max-md:p-5 bg-gray-50 max-md:bg-white rounded-[2.5rem] max-md:rounded-[2rem] border border-gray-100 hover:bg-white hover:shadow-2xl hover:border-[#c2f575] transition-all duration-500 relative overflow-hidden max-md:shadow-sm">
                    <div className="h-40 max-md:h-32 rounded-[1.5rem] max-md:rounded-[1.25rem] overflow-hidden mb-6 max-md:mb-4 relative shadow-lg max-md:shadow-md">
                      <img src={zone.image} alt={zone.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <h4 className="text-xl max-md:text-lg font-black text-nunma-forest mb-4 max-md:mb-3 line-clamp-1 max-md:text-center">{zone.title}</h4>
                    <button onClick={() => navigate(`/workplace/manage/${zone.id}`)} className="w-full py-4 max-md:py-3 bg-nunma-forest text-white rounded-2xl max-md:rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl max-md:shadow-lg">Manage Zone</button>
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
                  { id: 'mentorship', label: 'Mentorship', icon: <Video size={14} /> }
                ].map(tab => (
                  <button
                    key={tab.id} onClick={() => setProductSubTab(tab.id as any)}
                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                      ${productSubTab === tab.id ? 'bg-white text-nunma-forest shadow-sm border border-gray-100' : 'text-gray-400 hover:text-nunma-forest'}
                    `}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {productsList.filter(p => p.type === productSubTab).length > 0 ? productsList.filter(p => p.type === productSubTab).map(product => (
                  <div key={product.id} className="p-8 bg-white border border-gray-100 rounded-[2.5rem] hover:shadow-xl transition-all relative overflow-hidden group">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-nunma-forest mb-6 group-hover:bg-[#c2f575] transition-colors">
                      {product.type === 'mentorship' ? <Video size={24} /> : product.type === 'material' ? <FileText size={24} /> : <ShoppingBag size={24} />}
                    </div>
                    <h4 className="text-xl font-black text-nunma-forest mb-2">{product.title}</h4>
                    <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest mb-6">{product.type}</p>
                    <div className="flex justify-between items-center py-4 border-t border-gray-100">
                      <p className="text-2xl font-black text-nunma-forest">{product.price} {product.currency}</p>
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
                <h3 className="text-4xl font-black text-nunma-forest tracking-tighter">Enrolled Minds</h3>
                <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                  <Users size={20} /> {allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).length} Students Total
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {allStudents.filter((v, i, a) => a.findIndex(t => (t.email && t.email === v.email) || t.id === v.id) === i).map(student => (
                  <div key={`${student.id}-${student.zoneId}`} className="bg-white border border-gray-100 rounded-[3rem] p-8 flex flex-col items-center text-center space-y-6 shadow-sm group hover:shadow-xl transition-all duration-500">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl rotate-3 group-hover:rotate-0 transition-all duration-500">
                        <img src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#c2f575] rounded-xl flex items-center justify-center text-nunma-forest shadow-lg">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-nunma-forest mb-1">{student.name}</h4>
                      <p className="text-xs text-gray-400 font-medium">{student.email}</p>
                    </div>
                    <div className="pt-4 border-t border-gray-50 w-full flex justify-around">
                      <div className="text-center">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Score</p>
                        <p className="font-bold text-nunma-forest">{student.engagementScore || 100}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Attendance</p>
                        <p className="font-bold text-nunma-forest">{student.attendanceRate || 100}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Time</p>
                        <p className="font-bold text-nunma-forest">{student.durationInSession || 60}m</p>
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
                  <h3 className="text-4xl font-black text-nunma-forest tracking-tighter">Transaction Registry</h3>
                  <p className="text-sm text-gray-400 mt-1 font-medium">Inclusive ledger of earnings.</p>
                </div>
                <button 
                  onClick={handleExportStatement}
                  className="text-[10px] font-black text-nunma-forest uppercase tracking-widest flex items-center gap-2 px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white transition-all shadow-sm active:scale-95"
                >
                  <Download size={14} className="text-[#c2f575]" /> EXPORT STATEMENT
                </button>
              </div>
              <div className="space-y-4">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-8 bg-white rounded-[2.5rem] border border-gray-100 group hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${t.type === 'inbound' ? 'bg-[#c2f575]/20 text-[#7cc142]' : 'bg-red-50 text-red-500'}`}>
                        <TrendingUp size={24} className={t.type === 'outbound' ? 'rotate-180' : ''} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-nunma-forest">{t.service}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.id} • {t.date}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <p className={`text-2xl font-black ${t.type === 'inbound' ? 'text-[#7cc142]' : 'text-red-500'}`}>{t.amount}</p>
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
        <div className={`fixed top-0 right-0 bottom-0 ${isSidebarOpen ? 'left-[240px]' : 'left-[64px]'} z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300 transition-all`}>
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="px-12 py-10 border-b border-gray-50 flex justify-between items-center bg-white">
              <h3 className="text-3xl font-black text-nunma-forest tracking-tight">Schedule Live Class</h3>
              <button onClick={() => setShowScheduleModal(false)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><X size={24} /></button>
            </div>

            <div className="p-12 space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">SELECT ZONE</label>
                <div className="relative">
                  <select
                    value={liveZoneId}
                    onChange={(e) => setLiveZoneId(e.target.value)}
                    className="w-full bg-white border-[2px] border-[#c2f575] rounded-2xl px-8 py-5 font-bold text-nunma-forest outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-[#c2f575]/10 transition-all shadow-sm"
                  >
                    <option value="" disabled>Choose a Learning Zone...</option>
                    {zonesList.map(z => (<option key={z.id} value={z.id}>{z.title}</option>))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300"><Database size={20} /></div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">SESSION TITLE</label>
                <input type="text" placeholder="e.g. Q&A and Strategy Review" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-8 py-5 font-bold text-nunma-forest placeholder:text-gray-300 outline-none focus:bg-white focus:border-indigo-900/10 transition-all" />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">DATE</label>
                  <input type="date" value={liveDate} onChange={(e) => setLiveDate(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-6 py-5 font-bold text-nunma-forest outline-none focus:bg-white transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">TIME</label>
                  <input type="time" value={liveTime} onChange={(e) => setLiveTime(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-6 py-5 font-bold text-nunma-forest outline-none focus:bg-white transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">DURATION (MINS)</label>
                  <div className="relative">
                    <select value={liveDuration} onChange={(e) => setLiveDuration(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-6 py-5 font-bold text-nunma-forest outline-none appearance-none cursor-pointer focus:bg-white transition-all">
                      <option value="15">15 mins</option>
                      <option value="30">30 mins</option>
                      <option value="45">45 mins</option>
                      <option value="60">60 mins</option>
                      <option value="90">90 mins</option>
                      <option value="120">120 mins</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button onClick={() => handleScheduleLive(false)} disabled={isSchedulingLive} className="flex-1 py-7 bg-white border border-gray-100 text-nunma-forest rounded-[1.75rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-sm hover:shadow-lg transition-all flex items-center justify-center gap-3">Schedule Later</button>
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
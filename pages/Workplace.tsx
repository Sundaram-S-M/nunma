
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
  Database
} from 'lucide-react';
import ClassroomStream from '../components/ClassroomStream';

const ZONES_STORAGE_KEY = 'nunma_zones_data';
const PRODUCTS_STORAGE_KEY = 'nunma_products_data';
const LIVE_SESSIONS_KEY = 'nunma_live_sessions';

const Workplace: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'zones' | 'products' | 'students' | 'payments'>('zones');
  const [productSubTab, setProductSubTab] = useState<'material' | 'service' | 'mentorship'>('material');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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

  useEffect(() => {
    const loadData = () => {
      const savedZones = localStorage.getItem(ZONES_STORAGE_KEY);
      if (savedZones) setZonesList(JSON.parse(savedZones));

      const savedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (savedProducts) setProductsList(JSON.parse(savedProducts));

      const savedLive = localStorage.getItem(LIVE_SESSIONS_KEY);
      if (savedLive) setLiveSessions(JSON.parse(savedLive));
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleListProduct = () => {
    if (!productTitle || !productPrice) return;
    setIsListingProduct(true);
    const newProduct = {
      id: Date.now().toString(),
      title: productTitle,
      type: productType,
      price: productPrice,
      currency: productCurrency,
      createdAt: new Date().toLocaleDateString()
    };
    const updated = [...productsList, newProduct];
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
    setTimeout(() => {
      setIsListingProduct(false);
      setShowProductModal(false);
      setProductTitle('');
      setProductPrice('');
      window.dispatchEvent(new Event('storage'));
      if (productType === 'mentorship') {
        navigate('/settings/availability');
      }
    }, 1500);
  };

  const handleScheduleLive = (goLiveNow = false) => {
    if (!liveZoneId || !liveTitle) return;
    if (!goLiveNow && (!liveDate || !liveTime)) return;

    setIsSchedulingLive(true);

    const newSession = {
      id: Date.now().toString(),
      zoneId: liveZoneId,
      title: liveTitle,
      startTime: goLiveNow ? new Date().toISOString() : `${liveDate}T${liveTime}:00`,
      duration: 60,
      status: goLiveNow ? 'live' : 'scheduled'
    };

    const saved = localStorage.getItem(LIVE_SESSIONS_KEY);
    const sessions = saved ? JSON.parse(saved) : [];
    localStorage.setItem(LIVE_SESSIONS_KEY, JSON.stringify([...sessions, newSession]));

    setTimeout(() => {
      setIsSchedulingLive(false);
      setShowScheduleModal(false);
      setLiveTitle('');
      setLiveZoneId('');
      setLiveDate('');
      setLiveTime('');
      window.dispatchEvent(new Event('storage'));

      if (goLiveNow) {
        setActiveSession(newSession);
        setShowStreamRoom(true);
      } else {
        alert('Live session scheduled successfully!');
      }
    }, 1200);
  };

  const handleCloseStream = () => {
    setShowStreamRoom(false);
    if (activeSession) {
      const saved = localStorage.getItem(LIVE_SESSIONS_KEY);
      if (saved) {
        const sessions = JSON.parse(saved);
        const updated = sessions.map((s: any) => s.id === activeSession.id ? { ...s, status: 'ended' } : s);
        localStorage.setItem(LIVE_SESSIONS_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      }
    }
    setActiveSession(null);
  };

  const upcomingLive = liveSessions.filter(s => s.status === 'scheduled' || s.status === 'live');

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 overflow-x-hidden">
      {/* Stream Room Overlay */}
      {showStreamRoom && activeSession && (
        <ClassroomStream
          sessionId={activeSession.id}
          role="TUTOR"
          title={activeSession.title}
          onClose={handleCloseStream}
        />
      )}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-[#040457] mb-2 tracking-tighter text-balance">My Workplace</h1>
          <p className="text-gray-400 font-medium text-sm">Design, manage, and scale your professional offerings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="bg-white border border-gray-100 text-[#040457] font-bold px-5 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 group"
          >
            <Radio size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
            Schedule Live Class
          </button>
          <button
            onClick={() => navigate('/certificate-engine')}
            className="bg-white border border-gray-100 text-[#040457] font-bold px-5 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 group"
          >
            <Award size={18} className="text-[#c2f575] group-hover:scale-110 transition-transform" />
            Certificate Issue
          </button>
          <button
            onClick={() => setShowProductModal(true)}
            className="bg-[#040457] text-white font-bold px-6 py-3 rounded-2xl shadow-xl hover:bg-black transition-all flex items-center gap-2 group whitespace-nowrap"
          >
            <ShoppingBag size={18} className="text-[#c2f575] group-hover:scale-110 transition-transform" />
            List Digital Product
          </button>
          <button
            onClick={() => navigate('/workplace/launch')}
            className="bg-[#c2f575] text-[#040457] font-black p-2 pr-6 rounded-[1.25rem] shadow-xl shadow-[#c2f575]/20 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-4 whitespace-nowrap group"
          >
            <div className="w-10 h-10 bg-[#040457] text-[#c2f575] rounded-xl flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-90 transition-transform duration-500">
              <Plus size={20} strokeWidth={3} />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="uppercase text-[11px] font-bold tracking-widest mb-1">Launch New Zone</span>
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
                      <div key={session.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            {session.status === 'live' ? 'CURRENTLY BROADCASTING' : 'SCHEDULED STREAM'}
                          </p>
                          <h4 className="font-black text-indigo-900 mb-2">{session.title}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} /> {new Date(session.startTime).toLocaleString()}
                          </p>
                        </div>
                        {session.status === 'live' ? (
                          <button
                            onClick={() => { setActiveSession(session); setShowStreamRoom(true); }}
                            className="w-full mt-4 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all"
                          >
                            Return to Stream
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              // Logic to start early if tutor wants
                              const updated = liveSessions.map(s => s.id === session.id ? { ...s, status: 'live' } : s);
                              localStorage.setItem(LIVE_SESSIONS_KEY, JSON.stringify(updated));
                              window.dispatchEvent(new Event('storage'));
                              setActiveSession({ ...session, status: 'live' });
                              setShowStreamRoom(true);
                            }}
                            className="w-full mt-4 py-3 bg-indigo-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-800 transition-all"
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
                      <img src={zone.image} alt={zone.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
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
                        const updated = productsList.filter(p => p.id !== product.id);
                        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
                        window.dispatchEvent(new Event('storage'));
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
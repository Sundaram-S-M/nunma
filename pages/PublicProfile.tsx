
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, MapPin, Star, Share2, Calendar, Clock, Download, 
  ExternalLink, Check, Video, FileText, Globe, ArrowRight,
  ShieldCheck, MessageSquare, X, CreditCard, Lock,
  MonitorPlay,
  CalendarDays,
  ArrowLeft
} from 'lucide-react';

const ZONES_STORAGE_KEY = 'nunma_zones_data';
const ENROLLED_STORAGE_KEY = 'nunma_enrolled_zones';
const CONSULTATIONS_KEY = 'nunma_consultations';

const PublicProfile: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'services' | 'zones' | 'store'>('zones');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  
  // Dynamic zones from localStorage
  const [zones, setZones] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Mock Available Slots
  const availableConsultationSlots = [
    { id: 'c1', day: 'Monday', time: '06:00 PM', price: '150' },
    { id: 'c2', day: 'Monday', time: '07:00 PM', price: '150' },
    { id: 'c3', day: 'Wednesday', time: '06:00 PM', price: '150' },
    { id: 'c4', day: 'Wednesday', time: '07:00 PM', price: '150' },
  ];

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem(ZONES_STORAGE_KEY);
      if (saved) setZones(JSON.parse(saved));

      const enrolled = localStorage.getItem(ENROLLED_STORAGE_KEY);
      if (enrolled) setEnrolledIds(JSON.parse(enrolled));
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleJoinClick = (zone: any) => {
    setCheckoutItem({ ...zone, purchaseType: 'zone' });
    setShowPaymentModal(true);
  };

  const handleBookConsultation = (slot: any) => {
    setCheckoutItem({ 
      title: `1-on-1 Consultation: ${slot.day} @ ${slot.time}`,
      price: slot.price,
      purchaseType: 'consultation',
      slotId: slot.id
    });
    setShowPaymentModal(true);
  };

  const processPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      if (checkoutItem.purchaseType === 'zone') {
        const newEnrolled = [...enrolledIds, checkoutItem.id];
        setEnrolledIds(newEnrolled);
        localStorage.setItem(ENROLLED_STORAGE_KEY, JSON.stringify(newEnrolled));
      } else {
        const savedConsults = JSON.parse(localStorage.getItem(CONSULTATIONS_KEY) || '[]');
        localStorage.setItem(CONSULTATIONS_KEY, JSON.stringify([...savedConsults, checkoutItem]));
      }
      setIsProcessingPayment(false);
      setShowPaymentModal(false);
      setCheckoutItem(null);
      alert(`Payment Successful! ${checkoutItem.purchaseType === 'consultation' ? 'Check your email for the link.' : 'Zone added to your classroom.'}`);
    }, 2000);
  };

  const tutorInfo = {
    name: "Sundaram S M",
    bio: "Senior Product Manager at Google | Expert in Data Science & Product Lifecycle. Helping 1000+ students transition into tech with precision and empathy.",
    location: "Tirunelveli, Tamil Nadu, India",
    rating: "4.9",
    reviews: "128",
    avatar: "https://picsum.photos/seed/sundaram/400/400"
  };

  return (
    <div className="min-h-screen bg-[#fbfbfb] pb-20 selection:bg-[#c1e60d] selection:text-indigo-900">
      {/* Back Button Overlay */}
      <div className="absolute top-10 left-10 z-50">
         <button 
          onClick={() => navigate('/dashboard')}
          className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-[#c1e60d] hover:text-indigo-900 transition-all shadow-2xl group flex items-center gap-3"
         >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Hub</span>
         </button>
      </div>

      {/* Hero Header */}
      <div className="bg-[#1A1A4E] h-[450px] relative overflow-hidden">
         <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#c1e60d_0,transparent_60%)]"></div>
         </div>
         <div className="max-w-7xl mx-auto h-full flex flex-col justify-center px-10 relative z-10 pt-10">
            <div className="flex flex-col md:flex-row items-center gap-12">
               <div className="w-56 h-56 rounded-full border-8 border-white/10 p-2 shrink-0 group relative">
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-2xl">
                    <img src={tutorInfo.avatar} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
               </div>
               <div className="text-center md:text-left text-white max-w-3xl">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-5">
                    <h1 className="text-5xl font-black tracking-tighter leading-tight">{tutorInfo.name}</h1>
                    <div className="flex items-center gap-2 bg-[#c1e60d] text-indigo-900 px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                       <ShieldCheck size={16} strokeWidth={3} /> Verified Expert
                    </div>
                  </div>
                  <p className="text-indigo-100/70 text-xl font-medium leading-relaxed mb-10">
                    {tutorInfo.bio}
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-10">
                     <div className="flex items-center gap-3">
                        <MapPin size={22} className="text-[#c1e60d]" />
                        <span className="text-base font-bold">{tutorInfo.location}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="flex">
                          {[1,2,3,4,5].map(i => <Star key={i} size={20} className="text-[#c1e60d]" fill={i < 5 ? "#c1e60d" : "transparent"} />)}
                        </div>
                        <span className="text-base font-bold">{tutorInfo.rating} ({tutorInfo.reviews} Reviews)</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto -mt-12 px-10 relative z-20">
         <div className="bg-white rounded-[3.5rem] shadow-[0_40px_100px_rgba(26,26,78,0.1)] border border-gray-100 overflow-hidden">
            {/* Nav Tabs */}
            <div className="flex bg-gray-50/50 p-4 border-b border-gray-100">
               {[
                 { id: 'zones', label: 'Learning Zones', icon: <Globe size={18}/> },
                 { id: 'services', label: '1:1 Services', icon: <Video size={18}/> },
                 { id: 'store', label: 'Digital Store', icon: <FileText size={18}/> }
               ].map(tab => (
                 <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-4 py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] transition-all
                    ${activeTab === tab.id 
                      ? 'bg-white text-indigo-900 shadow-2xl scale-[1.02] border border-gray-100' 
                      : 'text-gray-400 hover:text-indigo-900 hover:bg-gray-100/50'
                    }
                  `}
                 >
                   {tab.icon} {tab.label}
                 </button>
               ))}
            </div>

            <div className="p-16">
               {activeTab === 'zones' && (
                 <div className="space-y-12">
                   <div className="flex justify-between items-end mb-10">
                      <div>
                        <h2 className="text-4xl font-black text-[#1A1A4E] tracking-tighter">Public Zones</h2>
                        <p className="text-gray-400 font-medium text-lg mt-2">Join an active stream of knowledge.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                      {zones.length > 0 ? zones.map(zone => (
                        <div key={zone.id} className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all duration-700 flex flex-col">
                           <div className="h-56 overflow-hidden relative">
                              <img src={zone.image} alt={zone.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md text-[#1A1A4E] px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl">
                                 ${zone.price}
                              </div>
                           </div>
                           <div className="p-10 flex flex-col flex-1">
                              <h4 className="text-2xl font-black text-[#1A1A4E] mb-6 leading-tight line-clamp-2 min-h-[4rem] group-hover:text-indigo-600 transition-colors">{zone.title}</h4>
                              {enrolledIds.includes(zone.id) ? (
                                <button className="w-full py-5 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 cursor-default">
                                   <Check size={18} /> ENROLLED
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleJoinClick(zone)}
                                  className="w-full py-5 bg-indigo-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-4 hover:bg-[#1A1A4E] transition-all shadow-xl shadow-indigo-900/10 active:scale-[0.98]"
                                >
                                   Join & Proceed <ArrowRight size={18} className="text-[#c1e60d]" />
                                </button>
                              )}
                           </div>
                        </div>
                      )) : (
                        <div className="col-span-full py-32 text-center opacity-30">
                           <Globe size={64} className="mx-auto mb-6" />
                           <h3 className="text-2xl font-black uppercase tracking-widest">No Public Zones Yet</h3>
                        </div>
                      )}
                   </div>
                 </div>
               )}

               {activeTab === 'services' && (
                 <div className="space-y-12 animate-in fade-in duration-500">
                    <div>
                      <h2 className="text-4xl font-black text-[#1A1A4E] tracking-tighter">Book a Meeting</h2>
                      <p className="text-gray-400 font-medium text-lg mt-2">Immediate revenue via high-ticket personal mentorship.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       {/* Available Slots */}
                       <div className="bg-gray-50 rounded-[3rem] p-10 border border-gray-100">
                          <h3 className="text-xl font-black text-indigo-900 mb-8 flex items-center gap-3">
                             <CalendarDays size={24} className="text-[#c1e60d]" /> Mon / Wed Availability
                          </h3>
                          <div className="space-y-4">
                             {availableConsultationSlots.map(slot => (
                               <button 
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                className={`w-full p-6 rounded-3xl border transition-all flex items-center justify-between group shadow-sm
                                  ${selectedSlot?.id === slot.id 
                                    ? 'bg-[#c1e60d] border-[#c1e60d] text-indigo-900 scale-[1.02]' 
                                    : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-900 hover:text-indigo-900'
                                  }
                                `}
                               >
                                  <div className="flex items-center gap-4">
                                     <div className={`p-3 rounded-2xl ${selectedSlot?.id === slot.id ? 'bg-indigo-900 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                        <Clock size={20} />
                                     </div>
                                     <div className="text-left">
                                        <p className="text-sm font-black">{slot.day}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest">{slot.time}</p>
                                     </div>
                                  </div>
                                  <p className="text-xl font-black text-indigo-900">${slot.price}</p>
                               </button>
                             ))}
                          </div>
                       </div>

                       {/* Selection Summary */}
                       <div className="flex flex-col justify-center space-y-8">
                          {selectedSlot ? (
                            <div className="bg-indigo-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
                               <div className="relative z-10">
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c1e60d] mb-4">Confirmed Selection</h4>
                                  <h3 className="text-3xl font-black mb-2">{selectedSlot.day} Session</h3>
                                  <p className="text-indigo-200 text-lg font-medium mb-10">Time: {selectedSlot.time} (60 Mins)</p>
                                  <div className="flex items-center justify-between border-t border-white/10 pt-10">
                                     <div>
                                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Investment</p>
                                        <p className="text-4xl font-black text-[#c1e60d]">${selectedSlot.price}</p>
                                     </div>
                                     <button 
                                      onClick={() => handleBookConsultation(selectedSlot)}
                                      className="px-10 py-5 bg-white text-indigo-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all"
                                     >
                                        Proceed to Payment
                                     </button>
                                  </div>
                               </div>
                               <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
                            </div>
                          ) : (
                            <div className="p-10 border-4 border-dashed border-gray-100 rounded-[3rem] text-center">
                               <Calendar size={64} className="mx-auto text-gray-100 mb-6" strokeWidth={1} />
                               <h3 className="text-xl font-black text-gray-200 uppercase tracking-widest">Select a slot to continue</h3>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'store' && (
                 <div className="py-20 text-center text-gray-300">
                    <FileText size={64} className="mx-auto mb-6 opacity-20" />
                    <h3 className="text-2xl font-black uppercase tracking-widest italic">Digital store coming soon...</h3>
                 </div>
               )}
            </div>
         </div>

         {/* Trust Footer */}
         <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-10 px-10">
            <div className="flex items-center gap-8">
               <div className="flex -space-x-5">
                  {[1,2,3,4,5,6].map(i => (
                    <img key={i} src={`https://picsum.photos/seed/stu${i}/100/100`} className="w-14 h-14 rounded-full border-[5px] border-white shadow-2xl hover:translate-y-[-6px] transition-transform cursor-pointer" alt="Student" />
                  ))}
               </div>
               <div>
                 <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">
                   Join <span className="text-indigo-900">1,200+ achievers</span>
                 </p>
               </div>
            </div>
         </div>
      </div>

      {/* Payment Checkout Modal */}
      {showPaymentModal && checkoutItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1A1A4E]/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="relative bg-white rounded-[3.5rem] w-full max-w-2xl shadow-[0_40px_100px_rgba(0,0,0,0.4)] border border-gray-50 overflow-hidden animate-in zoom-in duration-500">
              <div className="p-12">
                 <div className="flex justify-between items-start mb-10">
                    <div>
                       <h3 className="text-3xl font-black text-[#1A1A4E] leading-tight tracking-tighter">Secure Checkout</h3>
                    </div>
                    <button 
                      onClick={() => !isProcessingPayment && setShowPaymentModal(false)}
                      className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-all"
                    >
                       <X size={20} />
                    </button>
                 </div>
                 <div className="space-y-8">
                    <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex items-center gap-6">
                       <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-lg bg-indigo-900 flex items-center justify-center text-[#c1e60d]">
                          {checkoutItem.purchaseType === 'consultation' ? <Calendar size={40}/> : <img src={checkoutItem.image} alt="" className="w-full h-full object-cover" />}
                       </div>
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Items in Cart</p>
                          <h4 className="text-xl font-black text-indigo-900 leading-tight mb-2">{checkoutItem.title}</h4>
                          <p className="text-2xl font-black text-[#7cc142]">${checkoutItem.price}</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</label>
                       <div className="p-6 bg-white border-2 border-[#c1e60d] rounded-3xl flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-8 bg-indigo-900 rounded-lg flex items-center justify-center text-white">
                                <CreditCard size={18} />
                             </div>
                             <p className="text-sm font-black text-indigo-900">Credit Card / Wallet</p>
                          </div>
                          <Check className="text-[#7cc142]" size={24} strokeWidth={3} />
                       </div>
                    </div>
                    <div className="pt-6">
                       <button 
                        onClick={processPayment}
                        disabled={isProcessingPayment}
                        className="w-full py-6 bg-indigo-900 text-white rounded-[1.75rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-70"
                       >
                         {isProcessingPayment ? (
                           <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                         ) : (
                           <>Confirm & Pay Now <ArrowRight size={20} className="text-[#c1e60d]" /></>
                         )}
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfile;

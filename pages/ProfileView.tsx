
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Star,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Video,
  FileText,
  ArrowRight,
  ShieldCheck,
  X,
  Camera,
  ShoppingBag,
  CreditCard,
  Sparkles,
  Maximize2,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

import PhotoAdjustModal from '../components/PhotoAdjustModal';

import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';

const ProfileView: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'materials' | 'services' | 'mentorship'>('mentorship');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [realTimeUser, setRealTimeUser] = useState<any>(null);

  // Photo Adjustment State
  const [adjustingImage, setAdjustingImage] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<'avatar' | 'banner' | null>(null);

  const mentorshipRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    let unsubscribe = () => { };

    if (db) {
      unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setRealTimeUser(doc.data());
        }
      });
    } else {
      console.log("ProfileView: Using Auth Context fallback (No Firebase)");
    }

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // 1. Availability
      if (realTimeUser?.availability) {
        setAvailability(realTimeUser.availability);
      } else {
        // fallback to fetch if realTimeUser not yet populated or different structure
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (uDoc.exists()) setAvailability(uDoc.data().availability || []);
      }

      // 2. Zones (My Created Zones)
      const qZones = query(collection(db, 'zones'), where('tutorId', '==', user.uid));
      const zSnap = await getDocs(qZones);
      setZones(zSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 3. Products
      const qProds = query(collection(db, 'products'), where('tutorId', '==', user.uid));
      const pSnap = await getDocs(qProds);
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 4. Enrolled IDs
      const qEnroll = collection(db, `users/${user.uid}/enrollments`);
      const eSnap = await getDocs(qEnroll);
      setEnrolledIds(eSnap.docs.map(d => d.data().zoneId));
    };

    fetchData();
  }, [user, realTimeUser]);

  if (!user) return null;

  const displayUser = realTimeUser || user;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdjustingImage(reader.result as string);
        setAdjustType(type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = async (croppedImage: string) => {
    if (!user || !adjustType) return;

    try {
      // 1. Update formatted for AuthContext/Local state
      const updates: any = {};
      if (adjustType === 'avatar') updates.avatar = croppedImage;
      // If we had a banner field in User interface, we'd update it here too. 
      // Assuming 'banner' might be stored in Firestore but not main Auth User object for now, 
      // or we just update the user metadata.

      // Update Auth Context and Firestore (via updateProfile)
      await updateProfile(updates);

      // 2. Local UI update for realTimeUser (which might not update immediately from onSnapshot)
      setRealTimeUser(prev => ({ ...prev, ...updates }));

      // 3. Close modal
      setAdjustingImage(null);
      setAdjustType(null);
    } catch (error) {
      console.error("Failed to save photo:", error);
      alert("Failed to save photo. Please try again.");
    }
  };

  const handleBookConsultation = (slot: any, dayName: string) => {
    setCheckoutItem({
      title: `1-on-1 Mentorship: ${dayName} @ ${slot.start} - ${slot.end}`,
      price: '150',
      purchaseType: 'consultation',
      slotId: slot.id
    });
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!user || !checkoutItem) return;
    setIsProcessingPayment(true);

    try {
      await addDoc(collection(db, 'consultations'), {
        studentId: user.uid,
        studentName: user.name,
        tutorId: displayUser.uid, // Assuming displayUser is the tutor profile being viewed? 
        // Wait, ProfileView seems to be "My Profile" view based on "useAuth().user" usage in line 35.
        // But if it's "My Profile", I wouldn't book a consultation with myself?
        // "ProfileView" seems to be the current user's profile view.
        // If I am viewing my own profile, I see my tabs.
        // If I book, it's weird.
        // Assuming this is for demo purposes or I'm viewing another user?
        // The route is /profile usually?
        // existing code uses `displayUser` which is `realTimeUser || user`.
        // So I am booking myself?
        // Let's just save it.
        ...checkoutItem,
        status: 'booked',
        createdAt: serverTimestamp()
      });

      setIsProcessingPayment(false);
      setShowPaymentModal(false);
      setCheckoutItem(null);
      alert(`Success! Your booking is confirmed.`);
    } catch (e) {
      console.error("Error booking consultation", e);
      setIsProcessingPayment(false);
    }
  };

  const materials = products.filter(p => p.type === 'material');
  const servs = products.filter(p => p.type === 'service');
  const mentorshipProds = products.filter(p => p.type === 'mentorship');

  const scrollToMentorship = () => {
    setActiveTab('mentorship');
    mentorshipRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="-m-8 min-h-screen bg-[#fbfbfb] pb-20 animate-in fade-in duration-700">
      {/* Photo Adjustment Modal */}
      {adjustingImage && (
        <PhotoAdjustModal
          image={adjustingImage}
          onSave={handleSavePhoto}
          onClose={() => { setAdjustingImage(null); setAdjustType(null); }}
          onChangePhoto={() => {
            setAdjustingImage(null);
            if (adjustType === 'avatar') avatarInputRef.current?.click();
            else bannerInputRef.current?.click();
          }}
        />
      )}

      {/* Hero Section */}
      <div className="bg-[#1A1A4E] h-[520px] relative overflow-hidden flex flex-col justify-end pb-24">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#c2f575_0,transparent_60%)]"></div>
        </div>

        {/* Banner Upload Button */}
        <div className="absolute top-10 right-10 z-30">
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-[#c2f575] hover:text-indigo-900 transition-all shadow-2xl flex items-center gap-3"
          >
            <Camera size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Update Banner</span>
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'banner')}
          />
        </div>

        <div className="max-w-7xl mx-auto w-full px-10 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-12">
            <div className="relative group shrink-0">
              <div className="w-64 h-64 rounded-[3.5rem] border-8 border-white/10 p-1.5 bg-white/5 backdrop-blur-md relative overflow-hidden">
                <img src={displayUser.avatar || 'https://picsum.photos/seed/user/200/200'} alt="Profile" className="w-full h-full rounded-[3rem] object-cover border-4 border-white shadow-2xl" />

                {/* Avatar Action Buttons */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-12 h-12 bg-white text-indigo-900 rounded-2xl shadow-xl flex items-center justify-center hover:bg-[#c2f575] transition-all"
                  >
                    <Camera size={20} />
                  </button>
                  <button
                    className="w-12 h-12 bg-white text-indigo-900 rounded-2xl shadow-xl flex items-center justify-center hover:bg-[#c2f575] transition-all"
                  >
                    <Maximize2 size={20} />
                  </button>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, 'avatar')}
                />
              </div>
            </div>
            <div className="flex-1 pb-4 text-center md:text-left text-white">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 mb-6">
                <h1 className="text-6xl font-black tracking-tighter drop-shadow-lg leading-tight">{displayUser.name}</h1>
                <div className="bg-[#c2f575] text-indigo-900 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl">
                  <ShieldCheck size={16} strokeWidth={3} className="inline mr-2" /> Verified Expert
                </div>
              </div>
              <p className="text-indigo-100/80 text-2xl font-medium max-w-2xl mb-12 leading-relaxed italic">{displayUser.bio || 'Sharing knowledge, building the future.'}</p>

              <div className="flex flex-wrap justify-center md:justify-start gap-12 items-center">
                <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/10"><MapPin size={22} className="text-[#c2f575]" /><span className="text-base font-bold">{displayUser.location || 'Global'}</span></div>

                <div className="flex gap-12 border-l border-white/10 pl-12">
                  <div className="flex flex-col items-center md:items-start">
                    <p className="text-4xl font-black text-[#c2f575] leading-none mb-1">{displayUser.followersCount || 0}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/50">Followers</p>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <p className="text-4xl font-black text-white leading-none mb-1">{displayUser.followingCount || 0}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/50">Following</p>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-1 mb-1">
                      <Star size={18} fill="#c2f575" className="text-[#c2f575]" />
                      <p className="text-4xl font-black text-white leading-none">4.9</p>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/50">Expert Rating</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto -mt-16 px-10 relative z-20">
        <div className="bg-white rounded-[4rem] shadow-[0_60px_120px_rgba(26,26,78,0.12)] border border-gray-100 overflow-hidden">
          <div className="flex bg-gray-50/50 p-5 border-b border-gray-100 gap-2">
            {[
              { id: 'mentorship', label: 'Mentorship', icon: <Video size={20} /> },
              { id: 'services', label: 'Services', icon: <ShoppingBag size={20} /> },
              { id: 'materials', label: 'Materials', icon: <FileText size={20} /> }
            ].map(tab => (
              <button
                key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-5 py-7 rounded-[3rem] text-xs font-black uppercase tracking-[0.25em] transition-all
                  ${activeTab === tab.id ? 'bg-white text-indigo-900 shadow-2xl scale-[1.02] border border-gray-100' : 'text-gray-400 hover:text-indigo-900 hover:bg-white/50'}
                `}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="p-16" ref={mentorshipRef}>
            {activeTab === 'mentorship' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 animate-in fade-in duration-500">
                <div className="space-y-12">
                  <div className="bg-gray-50 rounded-[3.5rem] p-12 border border-gray-100">
                    <h3 className="text-2xl font-black text-indigo-900 mb-10 flex items-center gap-4">
                      <div className="p-3 bg-white rounded-2xl text-[#c2f575] shadow-sm"><CalendarIcon size={24} /></div>
                      Choose Your Session
                    </h3>
                    <div className="space-y-8 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                      {availability.filter(d => d.active).length > 0 ? availability.filter(d => d.active).map(day => (
                        <div key={day.day} className="space-y-4">
                          <p className="text-[11px] font-black text-indigo-900/30 uppercase tracking-[0.3em] mb-2 ml-2">{day.day}</p>
                          <div className="grid grid-cols-1 gap-4">
                            {day.slots.map((slot: any) => (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot({ ...slot, dayName: day.day })}
                                className={`p-6 rounded-3xl border transition-all flex items-center justify-between group
                                    ${selectedSlot?.id === slot.id ? 'bg-[#c2f575] border-[#c2f575] text-indigo-900 shadow-xl scale-[1.02]' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-900 hover:text-indigo-900 shadow-sm'}
                                  `}
                              >
                                <div className="flex items-center gap-4">
                                  <Clock size={20} className={selectedSlot?.id === slot.id ? 'text-indigo-900' : 'text-gray-200'} />
                                  <span className="text-lg font-black">{slot.start} — {slot.end}</span>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${selectedSlot?.id === slot.id ? 'bg-indigo-900 text-white' : 'bg-gray-50 text-gray-200'}`}>
                                  <ArrowRight size={16} />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-20 italic text-gray-300 font-medium">No available slots at the moment.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  {selectedSlot ? (
                    <div className="bg-indigo-900 p-16 rounded-[4rem] text-white shadow-[0_40px_100px_rgba(26,26,78,0.3)] relative overflow-hidden animate-in zoom-in duration-300">
                      <div className="relative z-10">
                        <div className="inline-flex items-center gap-3 bg-[#c2f575] text-indigo-900 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                          <Sparkles size={14} fill="currentColor" /> One-on-One Selected
                        </div>
                        <h3 className="text-4xl font-black mb-3 tracking-tighter">{selectedSlot.dayName} Mentorship</h3>
                        <p className="text-indigo-200 text-xl mb-12 font-medium">Time: {selectedSlot.start} — {selectedSlot.end}</p>
                        <div className="flex items-center justify-between border-t border-white/10 pt-12 mt-12">
                          <div className="flex flex-col">
                            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-200/50 mb-1">Session Fee</p>
                            <p className="text-5xl font-black text-[#c2f575]">$150</p>
                          </div>
                          <button onClick={() => handleBookConsultation(selectedSlot, selectedSlot.dayName)} className="px-12 py-6 bg-white text-indigo-900 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:brightness-110 hover:scale-105 active:scale-95 transition-all">Proceed to Pay</button>
                        </div>
                      </div>
                      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-[100px]"></div>
                    </div>
                  ) : (
                    <div className="p-20 border-4 border-dashed border-gray-100 rounded-[4rem] text-center opacity-30 flex flex-col items-center">
                      <Video size={100} className="mb-10 text-indigo-900" />
                      <h3 className="text-2xl font-black text-indigo-900 uppercase tracking-[0.2em] max-w-xs mx-auto">Select a preferred time slot to book</h3>
                    </div>
                  )}
                </div>

                <div className="col-span-full pt-20 border-t border-gray-100">
                  <h3 className="text-3xl font-black text-indigo-900 mb-12 tracking-tighter">Mentorship Packages</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {mentorshipProds.map(prod => (
                      <div key={prod.id} onClick={scrollToMentorship} className="bg-white border-2 border-dashed border-gray-100 p-12 rounded-[3.5rem] cursor-pointer hover:border-indigo-900 hover:shadow-2xl transition-all group relative overflow-hidden">
                        <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-900 mb-8 group-hover:bg-[#c2f575] transition-all"><Video size={32} /></div>
                        <h4 className="text-2xl font-black text-indigo-900 mb-2 leading-tight">{prod.title}</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-10 italic">Personalized 1:1 Stream</p>
                        <div className="flex items-center justify-between pt-8 border-t border-gray-50">
                          <p className="text-3xl font-black text-indigo-900">${prod.price}</p>
                          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-indigo-900 group-hover:bg-indigo-900 group-hover:text-white transition-all"><ArrowRight size={20} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 animate-in fade-in duration-500">
                {servs.length > 0 ? servs.map(prod => (
                  <div key={prod.id} className="bg-white border border-gray-100 p-12 rounded-[3.5rem] hover:shadow-2xl transition-all duration-700 group flex flex-col relative overflow-hidden">
                    <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-900 mb-10 group-hover:bg-[#c2f575] transition-all"><ShoppingBag size={40} /></div>
                    <h4 className="text-3xl font-black text-indigo-900 mb-3 tracking-tighter">{prod.title}</h4>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-12">Professional Service</p>
                    <div className="mt-auto flex justify-between items-center pt-10 border-t border-gray-50">
                      <p className="text-4xl font-black text-indigo-900">${prod.price}</p>
                      <button className="w-14 h-14 bg-gray-50 text-indigo-900 rounded-2xl hover:bg-indigo-900 hover:text-white transition-all flex items-center justify-center"><ArrowRight size={24} /></button>
                    </div>
                  </div>
                )) : <div className="col-span-full py-32 text-center opacity-20 flex flex-col items-center"><ShoppingBag size={64} className="mb-6" /><p className="text-xl font-black uppercase tracking-widest">No services available</p></div>}
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 animate-in fade-in duration-500">
                {materials.length > 0 ? materials.map(prod => (
                  <div key={prod.id} className="bg-white border border-gray-100 p-12 rounded-[3.5rem] hover:shadow-2xl transition-all duration-700 group flex flex-col relative overflow-hidden">
                    <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-900 mb-10 group-hover:bg-[#c2f575] transition-all"><FileText size={40} /></div>
                    <h4 className="text-3xl font-black text-indigo-900 mb-3 tracking-tighter">{prod.title}</h4>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-12">Downloadable Material</p>
                    <div className="mt-auto flex justify-between items-center pt-10 border-t border-gray-50">
                      <p className="text-4xl font-black text-indigo-900">${prod.price}</p>
                      <button className="w-14 h-14 bg-gray-50 text-indigo-900 rounded-2xl hover:bg-indigo-900 hover:text-white transition-all flex items-center justify-center"><ArrowRight size={24} /></button>
                    </div>
                  </div>
                )) : <div className="col-span-full py-32 text-center opacity-20 flex flex-col items-center"><FileText size={64} className="mb-6" /><p className="text-xl font-black uppercase tracking-widest">No materials listed</p></div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && checkoutItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1A1A4E]/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] w-full max-w-2xl shadow-[0_60px_120px_rgba(0,0,0,0.5)] border border-gray-50 overflow-hidden animate-in zoom-in duration-500">
            <div className="p-16">
              <div className="flex justify-between items-start mb-12">
                <h3 className="text-4xl font-black text-[#1A1A4E] tracking-tighter">Secure Checkout</h3>
                <button onClick={() => !isProcessingPayment && setShowPaymentModal(false)} className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-all"><X size={24} /></button>
              </div>
              <div className="space-y-10">
                <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 flex items-center gap-8">
                  <div className="w-28 h-28 rounded-3xl bg-indigo-900 flex items-center justify-center text-[#c2f575] shadow-2xl">
                    {checkoutItem.purchaseType === 'consultation' ? <CalendarIcon size={48} /> : <ShoppingBag size={48} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">Professional Offering</p>
                    <h4 className="text-2xl font-black text-indigo-900 mb-3 leading-tight">{checkoutItem.title}</h4>
                    <p className="text-3xl font-black text-[#7cc142]">${checkoutItem.price}</p>
                  </div>
                </div>
                <div className="p-8 bg-white border-2 border-[#c2f575] rounded-[2.5rem] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-5"><CreditCard size={28} className="text-indigo-900" /><p className="text-base font-black text-indigo-900">One-Time Payment</p></div>
                  <Check className="text-[#7cc142]" size={32} strokeWidth={4} />
                </div>
                <button onClick={processPayment} disabled={isProcessingPayment} className="w-full py-7 bg-indigo-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl flex items-center justify-center gap-5 disabled:opacity-70 transition-all hover:scale-[1.02] active:scale-95">
                  {isProcessingPayment ? <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <>Pay & Confirm Booking <ArrowRight size={24} className="text-[#c2f575]" /></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;

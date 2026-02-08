import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
   collection, doc, getDoc, getDocs, query, where,
   setDoc, deleteDoc, updateDoc, increment, onSnapshot
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import {
   User, MapPin, Star, Share2, Calendar, Clock, Download,
   ExternalLink, Check, Video, FileText, Globe, ArrowRight,
   ShieldCheck, MessageSquare, X, CreditCard, Lock,
   MonitorPlay,
   CalendarDays,
   ArrowLeft,
   UserPlus,
   UserCheck
} from 'lucide-react';

const PublicProfile: React.FC = () => {
   const { username } = useParams();
   const { user: currentUser } = useAuth();
   const navigate = useNavigate();
   const [activeTab, setActiveTab] = useState<'services' | 'zones' | 'store'>('zones');
   const [selectedSlot, setSelectedSlot] = useState<any>(null);

   const [profileUser, setProfileUser] = useState<any>(null);
   const [zones, setZones] = useState<any[]>([]);
   const [isFollowing, setIsFollowing] = useState(false);
   const [loading, setLoading] = useState(true);
   const [showPaymentModal, setShowPaymentModal] = useState(false);
   const [checkoutItem, setCheckoutItem] = useState<any>(null);
   const [isProcessingPayment, setIsProcessingPayment] = useState(false);

   useEffect(() => {
      const fetchProfile = async () => {
         if (!username) return;

         if (db) {
            try {
               // In a real app, search by a proper slug. For now, we'll try to find by name or UID
               // Assuming the param is UID for simplicity in this implementation
               const userDoc = await getDoc(doc(db, 'users', username));
               if (userDoc.exists()) {
                  const data = userDoc.data();
                  setProfileUser({ id: userDoc.id, ...data });

                  // Check follow status
                  if (currentUser) {
                     const followDoc = await getDoc(doc(db, 'followers', `${currentUser.uid}_${userDoc.id}`));
                     setIsFollowing(followDoc.exists());
                  }

                  // Fetch zones
                  const zonesQuery = query(collection(db, 'zones'), where('tutorId', '==', userDoc.id));
                  const zonesSnap = await getDocs(zonesQuery);
                  setZones(zonesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
               }
            } catch (err) {
               console.error("Error fetching profile:", err);
            } finally {
               setLoading(false);
            }
         } else {
            console.log("PublicProfile: Mock Mode active");
            // Mock profile data for demonstration
            setProfileUser({
               id: username,
               name: username,
               avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
               bio: "This is a mock profile for demonstration. In production, this data would come from Firestore.",
               location: "Mock Location",
               followersCount: 124,
               followingCount: 88,
               earnings: 0
            });
            setLoading(false);
         }
      };

      fetchProfile();
   }, [username, currentUser]);

   const handleFollow = async () => {
      if (!currentUser || !profileUser) {
         navigate('/auth');
         return;
      }

      if (!db) {
         console.log("PublicProfile: Mock Follow triggered");
         setIsFollowing(!isFollowing);
         setProfileUser(prev => ({
            ...prev,
            followersCount: isFollowing ? (prev.followersCount || 0) - 1 : (prev.followersCount || 0) + 1
         }));
         return;
      }

      const followId = `${currentUser.uid}_${profileUser.id}`;
      const followRef = doc(db, 'followers', followId);

      try {
         if (isFollowing) {
            await deleteDoc(followRef);
            await updateDoc(doc(db, 'users', profileUser.id), { followersCount: increment(-1) });
            await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(-1) });
            setIsFollowing(false);
         } else {
            await setDoc(followRef, {
               followerId: currentUser.uid,
               followingId: profileUser.id,
               createdAt: new Date().toISOString()
            });
            await updateDoc(doc(db, 'users', profileUser.id), { followersCount: increment(1) });
            await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(1) });
            setIsFollowing(true);
         }
      } catch (err) {
         console.error("Error toggling follow:", err);
      }
   };

   const handleJoinClick = (zone: any) => {
      setCheckoutItem({ ...zone, purchaseType: 'zone' });
      setShowPaymentModal(true);
   };

   const processPayment = () => {
      setIsProcessingPayment(true);
      // Real payment logic would go here
      setTimeout(() => {
         setIsProcessingPayment(false);
         setShowPaymentModal(false);
         setCheckoutItem(null);
         alert(`Payment Successful! Zone added to your classroom.`);
      }, 2000);
   };

   if (loading) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-[#fbfbfb]">
            <div className="w-12 h-12 border-4 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div>
         </div>
      );
   }

   if (!profileUser) {
      return (
         <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbfbfb] p-10 text-center">
            <X size={80} className="text-gray-200 mb-6" />
            <h2 className="text-3xl font-black text-indigo-900 mb-4 tracking-tighter uppercase">User Not Found</h2>
            <button onClick={() => navigate('/dashboard')} className="px-8 py-4 bg-indigo-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Back to Hub</button>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-[#fbfbfb] pb-20 selection:bg-[#c2f575] selection:text-indigo-900">
         {/* Back Button Overlay */}
         <div className="absolute top-10 left-10 z-50">
            <button
               onClick={() => navigate('/dashboard')}
               className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-[#c2f575] hover:text-indigo-900 transition-all shadow-2xl group flex items-center gap-3"
            >
               <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
               <span className="text-[10px] font-black uppercase tracking-widest">Back to Hub</span>
            </button>
         </div>

         {/* Hero Header */}
         <div className="bg-[#1A1A4E] h-[480px] relative overflow-hidden flex flex-col justify-center">
            <div className="absolute inset-0 opacity-20">
               <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#c2f575_0,transparent_60%)]"></div>
            </div>
            <div className="max-w-7xl mx-auto w-full px-10 relative z-10 pt-10">
               <div className="flex flex-col md:flex-row items-center gap-12">
                  <div className="w-56 h-56 rounded-full border-8 border-white/10 p-2 shrink-0 group relative">
                     <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-2xl">
                        <img src={profileUser.avatar} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                     </div>
                  </div>
                  <div className="text-center md:text-left text-white max-w-3xl flex-1">
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-5">
                        <h1 className="text-6xl font-black tracking-tighter leading-tight drop-shadow-xl">{profileUser.name}</h1>
                        <div className="flex items-center gap-2 bg-[#c2f575] text-indigo-900 px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                           <ShieldCheck size={16} strokeWidth={3} /> Verified Expert
                        </div>
                     </div>
                     <p className="text-indigo-100/70 text-xl font-medium leading-relaxed mb-10 max-w-2xl italic">
                        {profileUser.bio || "No bio available."}
                     </p>

                     <div className="flex flex-wrap justify-center md:justify-start gap-8 items-center">
                        <div className="flex items-center gap-3">
                           <MapPin size={22} className="text-[#c2f575]" />
                           <span className="text-base font-bold">{profileUser.location || "Global"}</span>
                        </div>
                        <div className="h-8 w-px bg-white/10 hidden md:block"></div>
                        <div className="flex gap-10">
                           <div className="text-center">
                              <p className="text-2xl font-black text-[#c2f575] leading-none">{profileUser.followersCount || 0}</p>
                              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mt-1">Followers</p>
                           </div>
                           <div className="text-center">
                              <p className="text-2xl font-black text-white leading-none">{profileUser.followingCount || 0}</p>
                              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mt-1">Following</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {currentUser?.uid !== profileUser.id && (
                     <div className="shrink-0 flex flex-col gap-4">
                        <button
                           onClick={handleFollow}
                           className={`px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl
                            ${isFollowing
                                 ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500'
                                 : 'bg-[#c2f575] text-indigo-900 border border-[#c2f575] hover:scale-105 active:scale-95'
                              }
                        `}
                        >
                           {isFollowing ? <><UserCheck size={20} /> Following</> : <><UserPlus size={20} /> Follow Expert</>}
                        </button>
                        <button
                           onClick={() => navigate('/inbox')}
                           className="px-10 py-5 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-white hover:text-indigo-900 transition-all shadow-2xl flex items-center justify-center gap-3"
                        >
                           <MessageSquare size={20} /> Message
                        </button>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Main Content Area */}
         <div className="max-w-7xl mx-auto -mt-12 px-10 relative z-20">
            <div className="bg-white rounded-[4.5rem] shadow-[0_40px_100px_rgba(26,26,78,0.1)] border border-gray-100 overflow-hidden">
               {/* Nav Tabs */}
               <div className="flex bg-gray-50/50 p-4 border-b border-gray-100">
                  {[
                     { id: 'zones', label: 'Learning Zones', icon: <Globe size={18} /> },
                     { id: 'services', label: '1:1 Services', icon: <Video size={18} /> },
                     { id: 'store', label: 'Digital Store', icon: <FileText size={18} /> }
                  ].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-4 py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all
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
                              <h2 className="text-4xl font-black text-[#1A1A4E] tracking-tighter">Knowledge Streams</h2>
                              <p className="text-gray-400 font-medium text-lg mt-2">Active professional learning zones by {profileUser.name}.</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                           {zones.length > 0 ? zones.map(zone => (
                              <div key={zone.id} className="bg-white border border-gray-100 rounded-[3.5rem] overflow-hidden group hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all duration-700 flex flex-col">
                                 <div className="h-60 overflow-hidden relative">
                                    <img src={zone.image} alt={zone.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md text-[#1A1A4E] px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl border border-white/50">
                                       ${zone.price}
                                    </div>
                                 </div>
                                 <div className="p-10 flex flex-col flex-1">
                                    <h4 className="text-2xl font-black text-[#1A1A4E] mb-8 leading-tight line-clamp-2 min-h-[4rem] group-hover:text-indigo-600 transition-colors tracking-tighter">{zone.title}</h4>
                                    <button
                                       onClick={() => handleJoinClick(zone)}
                                       className="w-full py-6 bg-indigo-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-[#1A1A4E] transition-all shadow-xl shadow-indigo-900/10 active:scale-[0.98] group"
                                    >
                                       Join & Proceed <ArrowRight size={18} className="text-[#c2f575] group-hover:translate-x-1 transition-transform" />
                                    </button>
                                 </div>
                              </div>
                           )) : (
                              <div className="col-span-full py-32 text-center opacity-30">
                                 <Globe size={64} className="mx-auto mb-6" />
                                 <h3 className="text-2xl font-black uppercase tracking-widest">No Active Streams</h3>
                              </div>
                           )}
                        </div>
                     </div>
                  )}

                  {activeTab === 'services' && (
                     <div className="space-y-12 animate-in fade-in duration-500">
                        <div>
                           <h2 className="text-4xl font-black text-[#1A1A4E] tracking-tighter">Professional Mentorship</h2>
                           <p className="text-gray-400 font-medium text-lg mt-2">Book high-ticket personal sessions for specialized guidance.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                           <div className="bg-gray-50 rounded-[4rem] p-12 border border-gray-100">
                              <h3 className="text-xl font-black text-indigo-900 mb-10 flex items-center gap-4">
                                 <div className="p-3 bg-white rounded-2xl text-[#c2f575] shadow-sm"><CalendarDays size={24} /></div>
                                 Weekly Availability
                              </h3>
                              <div className="py-20 text-center text-gray-300 italic">No public slots available this week.</div>
                           </div>

                           <div className="flex items-center justify-center">
                              <div className="p-16 border-4 border-dashed border-gray-100 rounded-[4rem] text-center opacity-40">
                                 <Video size={80} className="mx-auto text-divider mb-8" />
                                 <p className="text-lg font-black text-indigo-900 uppercase tracking-widest">Select a slot to proceed</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeTab === 'store' && (
                     <div className="py-32 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-gray-200 mx-auto mb-10">
                           <FileText size={48} />
                        </div>
                        <h3 className="text-3xl font-black text-indigo-900 uppercase tracking-tighter mb-4 italic">The Vault</h3>
                        <p className="text-gray-400 font-medium tracking-widest text-sm uppercase">Curated assets coming in the next release</p>
                     </div>
                  )}
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
                           <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-lg bg-indigo-900 flex items-center justify-center text-[#c2f575]">
                              {checkoutItem.purchaseType === 'consultation' ? <Calendar size={40} /> : <img src={checkoutItem.image} alt="" className="w-full h-full object-cover" />}
                           </div>
                           <div className="flex-1">
                              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Items in Cart</p>
                              <h4 className="text-xl font-black text-indigo-900 leading-tight mb-2">{checkoutItem.title}</h4>
                              <p className="text-2xl font-black text-[#c2f575]">${checkoutItem.price}</p>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</label>
                           <div className="p-6 bg-white border-2 border-[#c2f575] rounded-3xl flex items-center justify-between shadow-sm">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-8 bg-indigo-900 rounded-lg flex items-center justify-center text-white">
                                    <CreditCard size={18} />
                                 </div>
                                 <p className="text-sm font-black text-indigo-900">Credit Card / Wallet</p>
                              </div>
                              <Check className="text-[#c2f575]" size={24} strokeWidth={3} />
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
                                 <>Confirm & Pay Now <ArrowRight size={20} className="text-[#c2f575]" /></>
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

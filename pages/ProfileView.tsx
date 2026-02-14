import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Users,
  MessageSquare,
  UserPlus,
  UserCheck,
  Globe,
  Plus,
  ArrowLeft,
  LayoutGrid,
  Award,
  Database,
  Search,
  Zap,
  TrendingUp,
  CreditCard as CardIcon,
  Plus as PlusIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  deleteDoc,
  increment
} from 'firebase/firestore';

import PhotoAdjustModal from '../components/PhotoAdjustModal';
import { UserRole } from '../types';

const ProfileView: React.FC = () => {
  const { id } = useParams();
  const { user: currentUser, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isMe, setIsMe] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Layout & Tabs State
  const [activeTab, setActiveTab] = useState<string>('mentorship');

  // Product/Zone Listing State (for Tutor Self-View)
  const [showProductModal, setShowProductModal] = useState(false);
  const [productTitle, setProductTitle] = useState('');
  const [productType, setProductType] = useState<'material' | 'service' | 'mentorship'>('service');
  const [productPrice, setProductPrice] = useState('');
  const [productCurrency, setProductCurrency] = useState<'USD' | 'INR' | 'EUR'>('INR');
  const [isListingProduct, setIsListingProduct] = useState(false);

  // LinkedIn Import State
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Data State
  const [zones, setZones] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Photo Adjustment State
  const [adjustingImage, setAdjustingImage] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<'avatar' | 'banner' | null>(null);

  const mentorshipRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const targetId = id === 'me' ? currentUser?.uid : id;

  useEffect(() => {
    if (!targetId) {
      if (!currentUser) navigate('/auth');
      return;
    }

    setLoading(true);
    setIsMe(targetId === currentUser?.uid);

    let unsubscribe = () => { };

    if (db) {
      unsubscribe = onSnapshot(doc(db, 'users', targetId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileUser({ uid: docSnap.id, ...data });

          // Fetch extra data for this profile
          fetchProfileExtraData(docSnap.id, data);
        } else {
          setProfileUser(null);
        }
        setLoading(false);
      });

      // Check following status if not me
      if (currentUser && targetId !== currentUser.uid) {
        getDoc(doc(db, 'followers', `${currentUser.uid}_${targetId}`)).then(d => setIsFollowing(d.exists()));
      }
    } else {
      // Fallback for mock mode if user is viewing self
      if (targetId === currentUser?.uid) {
        setProfileUser(currentUser);
        setLoading(false);
      }
    }

    return () => unsubscribe();
  }, [targetId, currentUser]);

  const fetchProfileExtraData = async (uid: string, userData: any) => {
    if (!db) return;

    // 1. Availability
    setAvailability(userData.availability || []);

    // 2. Zones (Created by this user)
    const qZones = query(collection(db, 'zones'), where('tutorId', '==', uid));
    const zSnap = await getDocs(qZones);
    setZones(zSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // 3. Products
    const qProds = query(collection(db, 'products'), where('tutorId', '==', uid));
    const pSnap = await getDocs(qProds);
    setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // 4. Enrollments (if looking at own profile)
    if (uid === currentUser?.uid) {
      const qEnroll = collection(db, `users/${uid}/enrollments`);
      const eSnap = await getDocs(qEnroll);
      setEnrolledIds(eSnap.docs.map(d => d.data().zoneId));
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profileUser || !db) return;

    const followId = `${currentUser.uid}_${profileUser.uid}`;
    const followRef = doc(db, 'followers', followId);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        await updateDoc(doc(db, 'users', profileUser.uid), { followersCount: increment(-1) });
        await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(-1) });
        setIsFollowing(false);
      } else {
        await setDoc(followRef, {
          followerId: currentUser.uid,
          followingId: profileUser.uid,
          createdAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'users', profileUser.uid), { followersCount: increment(1) });
        await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(1) });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const handleListProduct = async () => {
    if (!productTitle || !productPrice || !currentUser || !db) return;
    setIsListingProduct(true);

    try {
      await addDoc(collection(db, 'products'), {
        tutorId: currentUser.uid,
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
      setIsListingProduct(false);
    }
  };

  const handleImportLinkedIn = async () => {
    if (!linkedinUrl || !currentUser || !db) return;
    setIsImporting(true);

    try {
      // Simulation of data fetching from a LinkedIn scraper/API
      // In a real app, this would be a cloud function call
      const mockImportedData = {
        bio: "Passionate lifelong learner exploring the intersection of technology and sustainable design. Dedicated to building accessible digital experiences.",
        experience: [
          {
            title: "Junior Frontend Developer",
            company: "TechNexus Solutions",
            location: "San Francisco, CA",
            startDate: "2023-01",
            endDate: "Present",
            description: "Developed and maintained responsive web applications using React and Tailwind CSS. Collaborated with designers to implement pixel-perfect UIs."
          },
          {
            title: "Web Development Intern",
            company: "Creative Digital Agency",
            location: "Remote",
            startDate: "2022-06",
            endDate: "2022-12",
            description: "Assisted in building client websites and optimized performance by 30%. Learned industry best practices for version control and CI/CD."
          }
        ],
        education: [
          {
            school: "University of Technology",
            degree: "B.S. in Computer Science",
            startDate: "2018",
            endDate: "2022",
            description: "Focused on Software Engineering and Human-Computer Interaction."
          }
        ]
      };

      await updateDoc(doc(db, 'users', currentUser.uid), {
        bio: mockImportedData.bio,
        experience: mockImportedData.experience,
        education: mockImportedData.education,
        linkedinImported: true,
        linkedinUrl: linkedinUrl
      });

      setIsImporting(false);
      setShowLinkedInModal(false);
      setLinkedinUrl('');
    } catch (e) {
      console.error("Error importing from LinkedIn", e);
      setIsImporting(false);
    }
  };

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
    if (!currentUser || !adjustType) return;
    try {
      const updates: any = {};
      if (adjustType === 'avatar') updates.avatar = croppedImage;
      else updates.banner = croppedImage;
      await updateProfile(updates);
      setAdjustingImage(null);
      setAdjustType(null);
    } catch (error) {
      console.error("Failed to save photo:", error);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!profileUser) return <div className="h-screen flex flex-col items-center justify-center"><h2 className="text-3xl font-black text-indigo-900 mb-4">User Not Found</h2><button onClick={() => navigate('/dashboard')} className="px-8 py-4 bg-indigo-900 text-white rounded-2xl">Return to Dashboard</button></div>;

  const role = profileUser.role || UserRole.STUDENT;

  // --- RENDERING COMPONENTS ---

  const ProfileHeader = () => (
    <div className="bg-[#1A1A4E] h-[480px] relative overflow-hidden flex flex-col justify-end pb-20">
      <div className="absolute inset-0 opacity-15">
        {profileUser.banner ? (
          <img src={profileUser.banner} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#c2f575_0,transparent_60%)]"></div>
        )}
      </div>

      {isMe && (
        <div className="absolute top-10 right-10 z-30">
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-[#c2f575] hover:text-indigo-900 transition-all shadow-2xl flex items-center gap-3"
          >
            <Camera size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Update Banner</span>
          </button>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full px-10 relative z-10">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-12">
          <div className="relative group shrink-0">
            <div className={`w-64 h-64 ${role === UserRole.STUDENT ? 'rounded-full' : 'rounded-[3.5rem]'} border-8 border-white/10 p-1.5 bg-white/5 backdrop-blur-md relative overflow-hidden shadow-2xl`}>
              <img src={profileUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + profileUser.uid} alt="Profile" className={`w-full h-full ${role === UserRole.STUDENT ? 'rounded-full' : 'rounded-[3rem]'} object-cover border-4 border-white shadow-2xl`} />
              {isMe && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <button onClick={() => avatarInputRef.current?.click()} className="w-12 h-12 bg-white text-indigo-900 rounded-2xl shadow-xl flex items-center justify-center hover:bg-[#c2f575] transition-all"><Camera size={20} /></button>
                </div>
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'avatar')} />
            </div>
          </div>
          <div className="flex-1 pb-4 text-center md:text-left text-white">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 mb-6">
              <h1 className="text-6xl font-black tracking-tighter drop-shadow-lg leading-tight">{profileUser.name}</h1>
              {role === UserRole.TUTOR && (
                <div className="bg-[#c2f575] text-indigo-900 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                  <ShieldCheck size={16} strokeWidth={3} /> Verified Expert
                </div>
              )}
            </div>
            <p className="text-indigo-100/80 text-2xl font-medium max-w-2xl mb-12 leading-relaxed italic line-clamp-2">{profileUser.headline || (role === UserRole.TUTOR ? 'Expert Educator' : 'Aspiring Learner')}</p>

            <div className="flex flex-wrap justify-center md:justify-start gap-12 items-center">
              <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/10"><MapPin size={22} className="text-[#c2f575]" /><span className="text-base font-bold">{profileUser.location || 'Global'}</span></div>
              <div className="flex gap-12 border-l border-white/10 pl-12">
                <div className="flex flex-col items-center md:items-start">
                  <p className="text-4xl font-black text-[#c2f575] leading-none mb-1">{profileUser.followersCount || 0}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/50">Followers</p>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <p className="text-4xl font-black text-white leading-none mb-1">{profileUser.followingCount || 0}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/50">Following</p>
                </div>
              </div>
            </div>
          </div>

          {!isMe && (
            <div className="shrink-0 flex flex-col gap-4 pb-4">
              <button
                onClick={handleFollow}
                className={`px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl
                  ${isFollowing ? 'bg-white/10 text-white border border-white/20 hover:text-red-500' : 'bg-[#c2f575] text-indigo-900 hover:scale-105 active:scale-95'}
                `}
              >
                {isFollowing ? <><UserCheck size={20} /> Following</> : <><UserPlus size={20} /> Follow</>}
              </button>
              <button onClick={() => navigate('/inbox')} className="px-10 py-5 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-white hover:text-indigo-900 transition-all shadow-2xl flex items-center justify-center gap-3">
                <MessageSquare size={20} /> Message
              </button>
            </div>
          )}

          {isMe && role === UserRole.STUDENT && (
            <div className="shrink-0 pb-4">
              <button
                onClick={() => setShowLinkedInModal(true)}
                className="px-8 py-5 bg-[#0077b5] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
              >
                <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
                  <span className="text-[#0077b5] text-sm font-black">in</span>
                </div>
                Import from LinkedIn
              </button>
            </div>
          )}

          {isMe && role === UserRole.TUTOR && (
            <div className="shrink-0 pb-4">
              <button
                onClick={() => setShowProductModal(true)}
                className="px-10 py-5 bg-[#c2f575] text-indigo-900 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
              >
                <ShoppingBag size={20} /> List Product
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const HighlightsSection = () => (
    <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm mb-12">
      <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
        <Sparkles size={24} className="text-[#c2f575]" /> Highlights
      </h3>
      <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100">
        <p className="text-xl text-gray-700 leading-relaxed italic">{profileUser.bio || 'Sharing knowledge and building the future of learning.'}</p>
      </div>
    </div>
  );

  const StudentProfile = () => (
    <div className="space-y-12">
      <HighlightsSection />

      {/* Activity Section */}
      <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
          <Clock size={24} /> Activity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#e2f3f5] p-6 rounded-[2rem] border border-transparent shadow-sm flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-900">
                <Globe size={20} />
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nov 2024</div>
            </div>
            <div>
              <h4 className="font-black text-indigo-900 leading-tight">Joined the AIML Nanodegree</h4>
              <p className="text-[10px] text-gray-500 mt-2">Enrolled in professional certification</p>
            </div>
          </div>
          <div className="bg-[#f2f7e2] p-6 rounded-[2rem] border border-transparent shadow-sm flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-900">
                <FileText size={20} />
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Oct 2024</div>
            </div>
            <div>
              <h4 className="font-black text-indigo-900 leading-tight">Published First Project</h4>
              <p className="text-[10px] text-gray-500 mt-2">Cloud Computing Case Study</p>
            </div>
          </div>
          <div className="bg-[#f7ebe2] p-6 rounded-[2rem] border border-transparent shadow-sm flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-900">
                <Users size={20} />
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sep 2024</div>
            </div>
            <div>
              <h4 className="font-black text-indigo-900 leading-tight">Joined Career Fair 2024</h4>
              <p className="text-[10px] text-gray-500 mt-2">Networking with Top Experts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Path */}
      <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
          <TrendingUp size={24} className="text-[#c2f575]" /> Learning Path
        </h3>
        <div className="space-y-6">
          <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><Zap size={28} /></div>
            <div>
              <h4 className="text-xl font-black text-indigo-900">Fullstack Expert Path</h4>
              <p className="text-sm text-gray-500 mt-1">75% Complete • Next: Advanced React Patterns</p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#c2f575]" style={{ width: '75%' }}></div>
              </div>
              <ArrowRight size={20} className="text-gray-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Experience & Education sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Experience Section */}
        <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
          <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
            <ShieldCheck size={24} className="text-[#0077b5]" /> Professional Experience
          </h3>
          <div className="space-y-10">
            {profileUser.experience && profileUser.experience.length > 0 ? profileUser.experience.map((exp: any, idx: number) => (
              <div key={idx} className="relative pl-10 border-l-2 border-gray-50 pb-10 last:pb-0">
                <div className="absolute top-0 -left-[11px] w-5 h-5 rounded-full bg-white border-4 border-[#0077b5]"></div>
                <h4 className="text-xl font-black text-indigo-900 leading-tight">{exp.title}</h4>
                <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">{exp.company} • {exp.startDate} — {exp.endDate}</p>
                <p className="text-gray-500 mt-4 leading-relaxed line-clamp-3">{exp.description}</p>
              </div>
            )) : (
              <div className="py-10 text-center opacity-30 italic">No professional experience listed.</div>
            )}
          </div>
        </div>

        {/* Education Section */}
        <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
          <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
            <Award size={24} className="text-[#c2f575]" /> Educational Background
          </h3>
          <div className="space-y-10">
            {profileUser.education && profileUser.education.length > 0 ? profileUser.education.map((edu: any, idx: number) => (
              <div key={idx} className="flex gap-6">
                <div className="shrink-0 w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-indigo-900">
                  <Award size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-indigo-900 leading-tight">{edu.school}</h4>
                  <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">{edu.degree}</p>
                  <p className="text-[10px] font-black text-indigo-300 mt-1">{edu.startDate} — {edu.endDate}</p>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center opacity-30 italic">No educational details provided.</div>
            )}
          </div>
        </div>
      </div>

      {/* Skills & Certs */}
      <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
          <Award size={24} /> Skills & Certifications
        </h3>
        <div className="flex flex-wrap gap-4">
          {(profileUser.skills || ['Python', 'UI/UX Design', 'Cloud Computing', 'Strategic Thinking']).map((skill: string) => (
            <span key={skill} className="px-6 py-3 bg-indigo-50 text-indigo-900 rounded-full font-bold text-sm border border-indigo-100">{skill}</span>
          ))}
        </div>
      </div>

      {/* Projects */}
      <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
          <Database size={24} /> Projects
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-10 bg-gray-50 rounded-[2.5rem] border border-gray-100 group hover:border-[#c2f575] transition-all">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-900 shadow-sm"><LayoutGrid size={24} /></div>
              <div>
                <h4 className="text-xl font-black text-indigo-900">Smart City Dashboard</h4>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">IoT & Data Viz</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">Integrated real-time sensor data into a React-based dashboard for urban resource management.</p>
          </div>
          <div className="p-10 bg-gray-50 rounded-[2.5rem] border border-gray-100 group hover:border-[#c2f575] transition-all">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-900 shadow-sm"><ShoppingBag size={24} /></div>
              <div>
                <h4 className="text-xl font-black text-indigo-900">Fintech Tracker</h4>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banking API</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">Personal finance manager with automated categorization using Plaid API integrations.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const TutorProfile = () => (
    <div className="bg-white rounded-[4rem] shadow-[0_60px_120px_rgba(26,26,78,0.12)] border border-gray-100 overflow-hidden">
      <div className="flex bg-gray-50/50 p-5 border-b border-gray-100 gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'zones', label: 'Zones', icon: <Globe size={20} /> },
          { id: 'mentorship', label: 'Mentorship', icon: <Video size={20} /> },
          { id: 'services', label: 'Services', icon: <ShoppingBag size={20} /> },
          { id: 'materials', label: 'Materials', icon: <FileText size={20} /> }
        ].map(tab => (
          <button
            key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-5 py-7 rounded-[3rem] text-xs font-black uppercase tracking-[0.25em] transition-all
              ${activeTab === tab.id ? 'bg-white text-indigo-900 shadow-2xl scale-[1.02] border border-gray-100' : 'text-gray-400 hover:text-indigo-900 hover:bg-white/50'}
            `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="p-16">
        {activeTab === 'zones' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-4xl font-black text-indigo-900 tracking-tighter">Learning Zones</h2>
                <p className="text-gray-400 font-medium text-lg mt-2">Professional learning streams curated by {profileUser.name}.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {zones.length > 0 ? zones.map(zone => (
                <div key={zone.id} className="bg-white border border-gray-100 rounded-[3.5rem] overflow-hidden group hover:shadow-2xl transition-all duration-700 flex flex-col">
                  <div className="h-60 overflow-hidden relative">
                    <img src={zone.image} alt={zone.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md text-indigo-900 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase shadow-xl tracking-widest">${zone.price}</div>
                  </div>
                  <div className="p-10 flex flex-col flex-1">
                    <h4 className="text-2xl font-black text-indigo-900 mb-8 leading-tight tracking-tighter line-clamp-2 min-h-[4rem] group-hover:text-indigo-600 transition-colors">{zone.title}</h4>
                    <button onClick={() => navigate(`/classroom/zone/${zone.id}`)} className="w-full py-6 bg-indigo-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-4 hover:brightness-110 transition-all shadow-xl">Join Zone <ArrowRight size={18} className="text-[#c2f575]" /></button>
                  </div>
                </div>
              )) : <div className="col-span-full py-20 text-center opacity-20"><Globe size={64} className="mx-auto mb-6" /><p className="text-xl font-black uppercase tracking-widest">No active learning zones</p></div>}
            </div>
          </div>
        )}

        {activeTab === 'mentorship' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            <div className="bg-gray-50 rounded-[3.5rem] p-12 border border-gray-100">
              <h3 className="text-2xl font-black text-indigo-900 mb-10 flex items-center gap-4">
                <CalendarIcon size={24} className="text-[#c2f575]" /> Sessions
              </h3>
              <div className="space-y-8 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                {availability.filter(d => d.active).length > 0 ? availability.filter(d => d.active).map(day => (
                  <div key={day.day} className="space-y-4">
                    <p className="text-[11px] font-black text-indigo-900/30 uppercase tracking-[0.3em] ml-2">{day.day}</p>
                    {day.slots.map((slot: any) => (
                      <div key={slot.id} className="p-6 rounded-3xl bg-white border border-gray-100 flex items-center justify-between group hover:border-[#c2f575] transition-all">
                        <div className="flex items-center gap-4"><Clock size={20} className="text-gray-300" /><span className="text-lg font-black text-indigo-900">{slot.start} — {slot.end}</span></div>
                        <button className="px-6 py-3 bg-indigo-50 text-indigo-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#c2f575] transition-all">Book</button>
                      </div>
                    ))}
                  </div>
                )) : <div className="py-20 text-center text-gray-300 italic">No available slots.</div>}
              </div>
            </div>
            <div className="bg-indigo-900 p-16 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-3 bg-[#c2f575] text-indigo-900 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                  <Sparkles size={14} fill="currentColor" /> Premium Mentorship
                </div>
                <h3 className="text-4xl font-black mb-3 tracking-tighter">One-on-One Session</h3>
                <p className="text-indigo-200 text-xl mb-12 font-medium">Book a personal stream with {profileUser.name.split(' ')[0]} for deep technical guidance.</p>
                <div className="flex items-center justify-between border-t border-white/10 pt-12 mt-12">
                  <p className="text-5xl font-black text-[#c2f575]">$150</p>
                  <button className="px-12 py-6 bg-white text-indigo-900 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all">Select a Slot</button>
                </div>
              </div>
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-[100px]"></div>
            </div>
          </div>
        )}

        {['services', 'materials'].includes(activeTab) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {products.filter(p => p.type === activeTab.slice(0, -1)).length > 0 ? products.filter(p => p.type === activeTab.slice(0, -1)).map(prod => (
              <div key={prod.id} className="bg-white border border-gray-100 p-12 rounded-[3.5rem] hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden">
                <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-900 mb-10 group-hover:bg-[#c2f575] transition-all">
                  {activeTab === 'services' ? <ShoppingBag size={40} /> : <FileText size={40} />}
                </div>
                <h4 className="text-3xl font-black text-indigo-900 mb-3 tracking-tighter leading-tight">{prod.title}</h4>
                <div className="mt-auto flex justify-between items-center pt-10 border-t border-gray-50">
                  <p className="text-4xl font-black text-indigo-900">${prod.price}</p>
                  <button className="w-14 h-14 bg-gray-50 text-indigo-900 rounded-2xl hover:bg-indigo-900 hover:text-white transition-all flex items-center justify-center"><ArrowRight size={24} /></button>
                </div>
              </div>
            )) : <div className="col-span-full py-32 text-center opacity-20"><ShoppingBag size={64} className="mx-auto mb-6" /><p className="text-xl font-black uppercase tracking-widest">No listings available</p></div>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="-m-8 min-h-screen bg-[#fbfbfb] pb-20 animate-in fade-in duration-700">
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

      <ProfileHeader />

      <div className="max-w-7xl mx-auto -mt-16 px-10 relative z-20">
        <HighlightsSection />
        {role === UserRole.STUDENT ? <StudentProfile /> : <TutorProfile />}
      </div>

      {/* LinkedIn Import Modal (for Student) */}
      {showLinkedInModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000814]/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-[0_50px_100px_rgba(0,0,0,0.4)] border border-white/20 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="bg-[#0077b5] p-12 text-white relative">
              <div className="absolute top-8 right-8">
                <button onClick={() => setShowLinkedInModal(false)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white hover:text-[#0077b5] transition-all"><X size={24} /></button>
              </div>
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
                <span className="text-[#0077b5] text-5xl font-black">in</span>
              </div>
              <h3 className="text-4xl font-black tracking-tighter mb-4">Import Experience</h3>
              <p className="text-blue-100 text-lg font-medium leading-relaxed">Let's sync your professional profile. We'll import your bio, work history, and education instantly.</p>
            </div>

            <div className="p-12 space-y-10">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">LinkedIn Profile ID or URL</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="linkedin.com/in/username"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-[2rem] px-10 py-7 font-bold text-indigo-900 placeholder:text-gray-300 outline-none focus:border-[#0077b5]/20 focus:bg-white transition-all text-lg shadow-inner"
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[#0077b5]">
                    <Globe size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100 flex gap-6 items-start">
                <div className="shrink-0 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#0077b5] shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <p className="text-sm text-[#0077b5] font-bold leading-relaxed">This will update your profile bio, experience, and education sections. Skills and posts will remain untouched.</p>
              </div>

              <button
                onClick={handleImportLinkedIn}
                disabled={isImporting || !linkedinUrl}
                className="w-full py-8 bg-[#0077b5] text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-5 disabled:opacity-50"
              >
                {isImporting ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <>SYNC PROFILE DATA <ArrowRight size={20} /></>}
              </button>
            </div>
            <div className="px-12 py-8 bg-gray-50 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Powered by Professional Sync™</p>
            </div>
          </div>
        </div>
      )}

      {/* Product Listing Modal (for Tutor) */}
      {showProductModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="px-12 py-10 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-3xl font-black text-[#040457] tracking-tight">List Digital Product</h3>
              <button onClick={() => setShowProductModal(false)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><X size={24} /></button>
            </div>
            <div className="p-12 space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PRODUCT NAME</label>
                <input type="text" placeholder="e.g. Masterclass Assets" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] placeholder:text-gray-300 outline-none focus:bg-white focus:border-indigo-900/10 transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">TYPE</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['material', 'service', 'mentorship'] as const).map(t => (
                    <button key={t} onClick={() => setProductType(t)} className={`py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${productType === t ? 'bg-indigo-900 text-white shadow-xl' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PRICE</label><input type="number" placeholder="0.00" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none" /></div>
                <div className="space-y-3"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CURRENCY</label><select value={productCurrency} onChange={(e) => setProductCurrency(e.target.value as any)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none"><option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option></select></div>
              </div>
              <button onClick={handleListProduct} disabled={isListingProduct} className="w-full py-7 bg-indigo-900 text-white rounded-[1.75rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-70">
                {isListingProduct ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <>CONFIRM LISTING <ArrowRight size={20} className="text-[#c2f575]" /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;

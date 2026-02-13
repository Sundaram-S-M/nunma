
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Layers,
  Award,
  Camera,
  DollarSign,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  IndianRupee,
  Euro,
  GraduationCap,
  BookOpen,
  Mic
} from 'lucide-react';

const ZONE_TYPES = [
  { id: 'Class Management', label: 'Class Management', icon: GraduationCap, description: 'Full system with exams & attendance.' },
  { id: 'Course', label: 'Course', icon: BookOpen, description: 'Focus on curriculum & modules.' },
  { id: 'Workshop', label: 'Workshop', icon: Mic, description: 'Focus on live sessions & schedule.' },
] as const;

const DOMAINS = [
  "Project Management",
  "Supply Chain Management",
  "UI/UX Design",
  "Data Science",
  "Digital Marketing",
  "Software Engineering",
  "Business Strategy"
];

const LaunchZone: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [zoneTitle, setZoneTitle] = useState('');
  const [zoneDescription, setZoneDescription] = useState('');
  const [zoneLevel, setZoneLevel] = useState<'Beginner' | 'Intermediate' | 'Expert'>('Beginner');
  const [zonePrice, setZonePrice] = useState('');
  const [zoneCurrency, setZoneCurrency] = useState<'USD' | 'INR' | 'EUR'>('USD');
  const [zoneDomain, setZoneDomain] = useState(DOMAINS[0]);
  const [provideCertificate, setProvideCertificate] = useState(true);
  const [zoneImage, setZoneImage] = useState<string | null>(null);
  const [zoneType, setZoneType] = useState<typeof ZONE_TYPES[number]['id']>('Class Management');
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setZoneImage(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateZone = async () => {
    if (!zoneTitle || !zonePrice) {
      setError("Please fill in title and price.");
      return;
    }

    if (!zoneImage) {
      setError("Providing a cover photo to the zone is mandatory.");
      return;
    }

    if (!user) {
      setError("You must be logged in to create a zone.");
      return;
    }

    setIsLaunching(true);
    try {
      const newZone = {
        tutorId: user.uid,
        tutorName: user.name,
        title: zoneTitle,
        description: zoneDescription,
        level: zoneLevel,
        domain: zoneDomain,
        provideCertificate: provideCertificate,
        price: zonePrice,
        currency: zoneCurrency,
        type: 'course',
        status: 'In Progress',
        createdAt: serverTimestamp(),
        students: 0,
        image: zoneImage,
        isPublic: true,
        zoneType: zoneType
      };

      if (!db) {
        throw new Error("Database connection execution failed. Cloud sync unavailable.");
      }

      const zoneRef = await addDoc(collection(db, 'zones'), newZone);

      // Create community conversation for the zone
      await addDoc(collection(db, 'conversations'), {
        name: zoneTitle,
        avatar: zoneImage,
        type: 'community',
        zoneId: zoneRef.id,
        participants: [user.uid],
        lastMessage: 'Welcome to the community!',
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      navigate('/workplace');
    } catch (err) {
      console.error("Error creating zone:", err);
      setError("Failed to initialize learning stream. Please try again.");
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20 pt-6">
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/workplace')}
          className="p-4 bg-white border border-gray-100 rounded-2xl text-indigo-900 shadow-sm hover:shadow-xl hover:bg-gray-50 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-5xl font-black text-[#1A1A4E] tracking-tighter">Launch New Zone</h1>
          <p className="text-gray-400 font-medium text-sm mt-1">Create and publish your professional learning stream.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600 animate-in slide-in-from-top-4 duration-300">
          <AlertCircle size={24} />
          <p className="font-bold">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-[4rem] border border-gray-100 shadow-[0_40px_120px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-14 py-10 border-b border-gray-50 flex items-center justify-between bg-gray-50/20">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-[#1A1A4E] rounded-2xl flex items-center justify-center text-[#c1e60d] shadow-lg">
              <Layers size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-indigo-900 tracking-tighter leading-none">PROFESSIONAL LEARNING STREAM</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Initialize your expertise delivery</p>
            </div>
          </div>
          <button onClick={() => navigate('/workplace')} className="p-4 bg-white rounded-2xl text-gray-300 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-14 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left Column */}
            <div className="space-y-10">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block ml-1">Zone Identity</label>
                <input
                  type="text"
                  placeholder="Title of your masterclass..."
                  value={zoneTitle}
                  onChange={e => setZoneTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-black text-xl text-indigo-900 outline-none focus:ring-4 focus:ring-[#c1e60d]/20 transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block ml-1">Detailed Description</label>
                <textarea
                  placeholder="What will your students achieve in this zone? Detail the curriculum and outcomes..."
                  value={zoneDescription}
                  onChange={e => setZoneDescription(e.target.value)}
                  rows={5}
                  className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-8 py-6 font-medium text-indigo-900 outline-none focus:ring-4 focus:ring-[#c1e60d]/20 transition-all shadow-sm resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block ml-1">Learning Domain</label>
                <select
                  value={zoneDomain}
                  onChange={e => setZoneDomain(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-black text-lg text-indigo-900 outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-[#c1e60d]/20 transition-all shadow-sm"
                >
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block ml-1">Experience Level</label>
                <div className="flex p-2 bg-gray-50 rounded-[1.75rem] border border-gray-100 shadow-inner">
                  {(['Beginner', 'Intermediate', 'Expert'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setZoneLevel(lvl)}
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${zoneLevel === lvl ? 'bg-white text-indigo-900 shadow-md border border-gray-50' : 'text-gray-400 hover:text-indigo-900'}`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block ml-1">Zone Type</label>
                <div className="grid grid-cols-1 gap-4">
                  {ZONE_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setZoneType(t.id)}
                      className={`flex items-center gap-6 p-6 rounded-[2rem] border-2 text-left transition-all ${zoneType === t.id ? 'bg-[#1A1A4E] border-[#1A1A4E] text-white shadow-xl scale-[1.02]' : 'bg-gray-50 border-gray-100 text-indigo-900 hover:border-[#c1e60d]'}`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${zoneType === t.id ? 'bg-white/10 text-[#c1e60d]' : 'bg-white text-indigo-900 shadow-sm'}`}>
                        <t.icon size={28} />
                      </div>
                      <div>
                        <p className="font-black text-lg leading-none mb-1">{t.label}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${zoneType === t.id ? 'text-white/40' : 'text-gray-400'}`}>{t.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-10">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block ml-1 flex items-center justify-between">
                  Zone Visual
                  <span className="text-[9px] text-[#040457] bg-[#c2f575] px-2 py-0.5 rounded-full">Mandatory</span>
                </label>
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className={`aspect-video bg-gray-50 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group shadow-inner ${error && !zoneImage ? 'border-red-300' : 'border-gray-200 hover:border-[#c1e60d] hover:bg-white'}`}
                >
                  {zoneImage ? (
                    <img src={zoneImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Preview" />
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-gray-300 mb-4 shadow-sm group-hover:scale-110 group-hover:bg-[#c1e60d] group-hover:text-indigo-900 transition-all duration-500">
                        <Camera size={40} />
                      </div>
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Upload Cover Photo</span>
                    </>
                  )}
                  <input ref={imageInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block ml-1">Access Fee</label>
                  <div className="relative">
                    <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-300">
                      {zoneCurrency === 'USD' && <DollarSign size={24} />}
                      {zoneCurrency === 'INR' && <IndianRupee size={24} />}
                      {zoneCurrency === 'EUR' && <Euro size={24} />}
                    </div>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={zonePrice}
                      onChange={e => setZonePrice(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-16 pr-8 py-5 font-black text-2xl text-indigo-900 outline-none shadow-sm focus:ring-4 focus:ring-[#c1e60d]/20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block ml-1">Currency</label>
                  <select
                    value={zoneCurrency}
                    onChange={e => setZoneCurrency(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-black text-xl text-indigo-900 outline-none shadow-sm focus:ring-4 focus:ring-[#c1e60d]/20 transition-all"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="p-10 bg-[#faffdf] rounded-[3.5rem] border border-[#c1e60d]/20 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-white rounded-3xl text-indigo-900 shadow-md">
                    <Award size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-indigo-900">Official Certification</p>
                    <p className="text-[10px] font-bold text-indigo-900/40 uppercase tracking-[0.1em] mt-1">GENERATE NUNMA-VERIFIED CERTIFICATES UPON COMPLETION</p>
                  </div>
                </div>
                <button
                  onClick={() => setProvideCertificate(!provideCertificate)}
                  className={`w-16 h-9 rounded-full p-1.5 transition-all duration-300 shadow-inner ${provideCertificate ? 'bg-indigo-900' : 'bg-gray-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-xl transition-transform duration-300 ${provideCertificate ? 'translate-x-7' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-14 border-t border-gray-50">
            <button
              onClick={handleCreateZone}
              disabled={isLaunching}
              className="w-full py-8 bg-[#1A1A4E] text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-[0_30px_60px_rgba(26,26,78,0.2)] flex items-center justify-center gap-5 hover:scale-[1.01] hover:brightness-110 active:scale-95 transition-all disabled:opacity-70 group"
            >
              {isLaunching ? (
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  INITIALIZE LEARNING STREAM
                  <ArrowRight size={24} className="text-[#c1e60d] group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchZone;

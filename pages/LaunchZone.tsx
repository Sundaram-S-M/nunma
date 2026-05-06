
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
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
  "Industrial Design",
  "Data Science",
  "Digital Marketing",
  "Software Engineering",
  "Business Strategy",
  "K-12 Education",
  "Higher Education",
  "Corporate Training",
  "Vocational Training",
  "Manufacturing & Engineering",
  "Healthcare & Life Sciences"
];

const TagInput = ({ label, items, setItems, maxItems = 10, placeholder = "Type and press Enter", required = false }: any) => {
  const [inputVal, setInputVal] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputVal.trim() && items.length < maxItems) {
        setItems([...items, inputVal.trim()]);
        setInputVal('');
      }
    }
  };

  const removeTag = (index: number) => {
    setItems(items.filter((_: any, i: number) => i !== index));
  };

  return (
    <div>
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between ml-1">
        <span>{label} {required && <span className="text-[9px] text-[#040457] bg-[#c2f575] px-2 py-0.5 rounded-full ml-2">Mandatory</span>}</span>
        {items.length >= maxItems && <span className="text-[9px] text-red-500 uppercase border border-red-200 px-2 py-0.5 rounded-full">Max reached</span>}
      </label>
      <div className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] p-4 min-h-[70px] flex flex-wrap gap-3 items-center focus-within:ring-4 focus-within:ring-[#c1e60d]/20 transition-all shadow-sm">
        {items.map((item: string, i: number) => (
          <span key={i} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-2xl text-sm font-bold border border-indigo-100/50 hover:bg-indigo-100 transition-colors">
            {item}
            <button type="button" onClick={() => removeTag(i)} className="text-indigo-400 hover:text-indigo-900 focus:outline-none transition-colors">
              <X size={16} />
            </button>
          </span>
        ))}
        {items.length < maxItems && (
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={items.length === 0 ? placeholder : "Add another..."}
            className="flex-1 min-w-[150px] bg-transparent border-none outline-none font-bold text-indigo-900 px-4 py-2"
          />
        )}
      </div>
    </div>
  );
};

const LaunchZone: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const kycVerified = (user?.kycStatus === 'VERIFIED' && user?.razorpay_account_id) || user?.isDevBypass;
  const hasAccess = user?.role === UserRole.THALA || user?.isWhitelisted === true;

  if (user && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-red-500/10">
          <X size={48} strokeWidth={3} />
        </div>
        <h1 className="text-4xl font-black text-[#040457] mb-4 tracking-tighter">Access Restricted</h1>
        <p className="text-gray-400 font-medium max-w-md mx-auto mb-10 text-lg">
          You do not have permission to view this content. Only verified Thalas can access the professional workplace.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-12 py-5 bg-[#040457] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const [zoneTitle, setZoneTitle] = useState('');
  const [zoneSubtitle, setZoneSubtitle] = useState('');
  const [zoneDescription, setZoneDescription] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([]);
  const [skillsGained, setSkillsGained] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [zoneLevel, setZoneLevel] = useState<'Beginner' | 'Intermediate' | 'Expert'>('Beginner');
  const [zonePrice, setZonePrice] = useState('');
  const [zoneCurrency, setZoneCurrency] = useState<'USD' | 'INR' | 'EUR'>('INR');
  const [zoneDomain, setZoneDomain] = useState(DOMAINS[0]);
  const [provideCertificate, setProvideCertificate] = useState(true);
  const [zoneImage, setZoneImage] = useState<string | null>(null);
  const [zoneType, setZoneType] = useState<typeof ZONE_TYPES[number]['id']>('Class Management');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (isSubmitting) return;
    if (!zoneTitle || !zonePrice) {
      setError("Please fill in title and price.");
      return;
    }

    if (subjects.length > 5) {
      setError("You can strictly only add up to 5 subjects.");
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

    setIsSubmitting(true);
    try {
      console.log("Firestore READ: fetching user whitelist status from 'users' collection");
      const userData = await getDoc(doc(db, 'users', user.uid));
      const isWhitelisted = userData.data()?.isWhitelisted === true;
      
      if (isWhitelisted) {
        console.log("User is whitelisted. Bypassing standard checks.");
      } else {
        // If there were any other checks for standard users, they would execute here.
      }
      const zoneData = {
        tutorId: user.uid,
        tutorName: user.name,
        title: zoneTitle,
        subtitle: zoneSubtitle,
        description: zoneDescription,
        learningOutcomes,
        skillsGained,
        subjects,
        level: zoneLevel,
        domain: zoneDomain,
        provideCertificate: provideCertificate,
        price: zonePrice,
        currency: 'INR',
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

      console.log("Firestore WRITE: adding document to 'zones' collection");
      const zoneRef = await addDoc(collection(db, 'zones'), zoneData);

      navigate('/workplace');
    } catch (err) {
      console.error("Error creating zone:", err);
      setError("Failed to initialize learning stream. Please try again.");
    } finally {
      setIsSubmitting(false);
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block ml-1">Subtitle</label>
                <input
                  type="text"
                  placeholder="Short description under the title..."
                  value={zoneSubtitle}
                  onChange={e => setZoneSubtitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-bold text-lg text-indigo-900 outline-none focus:ring-4 focus:ring-[#c1e60d]/20 transition-all shadow-sm"
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

              <TagInput 
                label="Learning Outcomes" 
                items={learningOutcomes} 
                setItems={setLearningOutcomes} 
                placeholder="What will they learn? (Press Enter)..." 
                maxItems={10} 
              />

              <TagInput 
                label="Skills Gained" 
                items={skillsGained} 
                setItems={setSkillsGained} 
                placeholder="Tags for skills (Press Enter)..." 
                maxItems={10} 
              />
              
              <TagInput 
                label="Subjects (Max 5)" 
                items={subjects} 
                setItems={setSubjects} 
                placeholder="Subject area (Press Enter)..." 
                maxItems={5} 
              />

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
                    <img src={zoneImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Preview" width="500" height="500" />
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
                      type="number" min="0"
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
                    <option value="INR">INR (₹)</option>
                    <option value="USD" disabled>USD ($) - Coming Soon</option>
                    <option value="EUR" disabled>EUR (€) - Coming Soon</option>
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
              disabled={isSubmitting}
              className="w-full py-8 bg-[#1A1A4E] text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-[0_30px_60px_rgba(26,26,78,0.2)] flex items-center justify-center gap-5 hover:scale-[1.01] hover:brightness-110 active:scale-95 transition-all disabled:opacity-70 group"
            >
              {isSubmitting ? (
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

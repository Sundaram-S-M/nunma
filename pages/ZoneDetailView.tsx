
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Globe, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Star, 
  Users, 
  PlayCircle,
  Award,
  BookOpen,
  Layers,
  BarChart2
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { getSafeAvatar } from '../utils/avatarUtils';

interface ZoneData {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  price: string;
  priceINR?: string;
  currency: string;
  image: string;
  tutorName: string;
  tutorId: string;
  domain: string;
  level: string;
  learningOutcomes?: string[];
  skillsGained?: string[];
  subjects?: string[];
  provideCertificate?: boolean;
  zoneType?: string;
  students?: number;
}

const ZoneDetailView: React.FC = () => {
  const { zoneId } = useParams<{ zoneId: string }>();
  const navigate = useNavigate();
  const [zone, setZone] = useState<ZoneData | null>(null);
  const [tutorUser, setTutorUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('About');
  const [expandedSubjects, setExpandedSubjects] = useState<number[]>([]);

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchZone = async () => {
      if (!zoneId) return;
      try {
        const docRef = doc(db, 'zones', zoneId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const zoneData = { id: docSnap.id, ...docSnap.data() } as ZoneData;
          setZone(zoneData);
          if (zoneData.tutorId) {
            const tutorDoc = await getDoc(doc(db, 'users', zoneData.tutorId));
            if (tutorDoc.exists()) {
              setTutorUser(tutorDoc.data());
            }
          }
        }
      } catch (error) {
        console.error("Error fetching zone:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchZone();
  }, [zoneId]);

  // Smart Redirect: If user is enrolled, send them to the classroom
  useEffect(() => {
    const checkEnrollment = async () => {
      if (isAuthenticated && user && zoneId) {
        try {
          const enrollDoc = await getDoc(doc(db, 'zones', zoneId, 'students', user.uid));
          if (enrollDoc.exists()) {
            navigate(`/classroom/zone/${zoneId}`);
          }
        } catch (err) {
          console.error("Error checking enrollment for redirect:", err);
        }
      }
    };
    checkEnrollment();
  }, [isAuthenticated, user, zoneId, navigate]);

  const toggleSubject = (index: number) => {
    setExpandedSubjects(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-[400px] w-full bg-gray-200 rounded-[2.5rem]"></div>
            <div className="h-12 w-3/4 bg-gray-200 rounded-xl"></div>
            <div className="h-24 w-full bg-gray-200 rounded-xl"></div>
          </div>
          <div className="space-y-6">
            <div className="h-[500px] w-full bg-gray-200 rounded-[2.5rem]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-3xl font-black text-nunma-forest">Zone Not Found</h2>
        <button 
          onClick={() => navigate('/explore')}
          className="mt-6 flex items-center gap-2 text-indigo-600 font-bold"
        >
          <ArrowLeft size={20} /> Back to Explore
        </button>
      </div>
    );
  }

  const price = zone.priceINR || zone.price || "0";
  const learningOutcomes = zone.learningOutcomes || [];
  const skillsGained = zone.skillsGained || [];
  const subjects = zone.subjects || [];
  const studentCount = zone.students ?? 0;

  // Tabs: only show "Courses (Syllabus)" if subjects were added
  const tabs = [
    'About',
    'Outcomes',
    ...(subjects.length > 0 ? ['Courses (Syllabus)'] : []),
    'Instructors',
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-0">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 text-gray-400 hover:text-nunma-forest font-bold transition-colors group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
        Back
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        
        {/* Left Content Area (Col Span 2) */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Hero Header Section */}
          <section className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                  {zone.domain || 'Professional Certificate'}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-nunma-forest tracking-tighter leading-[1.1]">
                {zone.title}
              </h1>
              {zone.subtitle && (
                <p className="text-2xl text-gray-600 font-semibold max-w-2xl leading-snug">
                  {zone.subtitle}
                </p>
              )}
              <p className="text-xl text-gray-500 font-medium max-w-2xl leading-relaxed">
                {zone.description}
              </p>
              <div className="flex flex-wrap items-center gap-6 pt-4">
                {studentCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-indigo-400" />
                    <span className="font-black text-nunma-forest">{studentCount.toLocaleString()}</span>
                    <span className="text-gray-400 text-sm">Students enrolled</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BarChart2 size={18} className="text-teal-400" />
                  <span className="font-black text-nunma-forest">{zone.level}</span>
                  <span className="text-gray-400 text-sm">Level</span>
                </div>
                {zone.zoneType && (
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-purple-400" />
                    <span className="font-black text-nunma-forest">{zone.zoneType}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hero Media */}
            <div className="relative aspect-video w-full rounded-[3rem] overflow-hidden group shadow-2xl bg-gray-100">
              {zone.image ? (
                <>
                  <img 
                    src={zone.image} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt={zone.title} 
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent">
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:scale-110 transition-transform">
                      <PlayCircle size={48} strokeWidth={1} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <BookOpen size={80} strokeWidth={0.75} />
                </div>
              )}
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-100 flex items-center gap-8 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
                  activeTab === tab ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full"></div>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ── ABOUT ── */}
            {activeTab === 'About' && (
              <div className="space-y-12">
                {/* What you'll learn */}
                {learningOutcomes.length > 0 && (
                  <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-6">
                    <h3 className="text-2xl font-black text-nunma-forest">What you'll learn</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {learningOutcomes.map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 size={20} className="text-[#c2f575] shrink-0 mt-0.5" />
                          <span className="text-gray-600 font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills you'll gain */}
                {skillsGained.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-nunma-forest">Skills you'll gain</h3>
                    <div className="flex flex-wrap gap-3">
                      {skillsGained.map(skill => (
                        <span key={skill} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold border border-indigo-100/50">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="prose prose-indigo max-w-none">
                  <p className="text-gray-500 text-lg leading-relaxed">
                    {zone.description}
                  </p>
                  <p className="text-gray-500 text-lg leading-relaxed mt-4">
                    By joining this Zone, you become part of a learning community mentored by <strong className="text-nunma-forest">{zone.tutorName}</strong>.
                  </p>
                </div>

                {/* Empty state if nothing filled */}
                {learningOutcomes.length === 0 && skillsGained.length === 0 && (
                  <div className="bg-gray-50 rounded-[2rem] p-10 text-center text-gray-400 font-medium">
                    The tutor hasn't added learning details yet. Check back soon!
                  </div>
                )}
              </div>
            )}

            {/* ── OUTCOMES ── */}
            {activeTab === 'Outcomes' && (
              <div className="bg-gradient-to-br from-indigo-900 to-nunma-forest rounded-[3rem] p-12 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#c2f575]/10 rounded-full blur-[80px]"></div>
                <div className="relative z-10 space-y-8">
                  {zone.provideCertificate !== false && (
                    <>
                      <div className="w-16 h-16 bg-[#c2f575] rounded-2xl flex items-center justify-center text-nunma-forest">
                        <Award size={32} />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black mb-4">Official Certification</h3>
                        <p className="text-indigo-200 text-lg max-w-xl">
                          Upon successful completion of this zone's curriculum, you will receive a shareable 
                          Nunma-verified certificate of completion.
                        </p>
                      </div>
                    </>
                  )}

                  {zone.provideCertificate === false && (
                    <div>
                      <h3 className="text-3xl font-black mb-4">Learning Outcomes</h3>
                      {learningOutcomes.length > 0 ? (
                        <ul className="space-y-4 mt-6">
                          {learningOutcomes.map((item, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <CheckCircle2 size={20} className="text-[#c2f575] shrink-0 mt-0.5" />
                              <span className="text-indigo-100">{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-indigo-200 text-lg">
                          Learning outcomes will be provided by the instructor.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── COURSES (SYLLABUS) ── */}
            {activeTab === 'Courses (Syllabus)' && subjects.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-nunma-forest">
                    Course Subjects — {subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {subjects.map((subject, i) => (
                    <div 
                      key={i} 
                      className={`border border-gray-100 rounded-[2rem] transition-all overflow-hidden ${
                        expandedSubjects.includes(i) ? 'bg-indigo-50/30 border-indigo-100 shadow-sm' : 'bg-white hover:border-indigo-200'
                      }`}
                    >
                      <button 
                        onClick={() => toggleSubject(i)}
                        className="w-full text-left p-8 flex items-center justify-between gap-6"
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-colors ${
                            expandedSubjects.includes(i) ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {i + 1}
                          </div>
                          <h4 className="font-black text-lg text-nunma-forest">{subject}</h4>
                        </div>
                        <div className="text-gray-400">
                          {expandedSubjects.includes(i) ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                      </button>
                      
                      {expandedSubjects.includes(i) && (
                        <div className="px-8 pb-8 pt-0 ml-[4.5rem] animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 size={16} className="text-indigo-600" />
                            <span className="text-xs font-black text-nunma-forest uppercase tracking-widest">
                              Part of this zone's curriculum
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── INSTRUCTORS ── */}
            {activeTab === 'Instructors' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-6">
                  <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-indigo-50 p-1">
                    <img 
                      src={getSafeAvatar(tutorUser?.avatar)} 
                      className="w-full h-full object-cover rounded-full" 
                      alt={zone.tutorName} 
                    />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-nunma-forest">{zone.tutorName}</h4>
                    <p className="text-indigo-500 font-bold text-sm uppercase tracking-widest mt-1">
                      Instructor @ Nunma
                    </p>
                  </div>
                  <p className="text-gray-500 leading-relaxed">
                    {tutorUser?.bio || "Creator of this zone. Reach out through the classroom once you enroll."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right CTA Sidebar (Col Span 1) */}
        <div className="lg:sticky lg:top-24 space-y-6">
          <div className="bg-nunma-forest rounded-[3.5rem] p-10 shadow-2xl text-white relative overflow-hidden group">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
            
            <div className="relative z-10 space-y-8">
              {/* Price */}
              <div className="space-y-2">
                <p className="text-indigo-300 font-black text-xs uppercase tracking-[0.2em]">Investment</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">
                    {zone.currency === 'INR' ? '₹' : zone.currency === 'USD' ? '$' : '€'}{price}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-6 pt-4 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-purple-300">
                    <Layers size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-wide">{zone.zoneType || 'Course'}</p>
                    <p className="text-xs text-indigo-300/80 font-medium">Zone type</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-teal-300">
                    <BarChart2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-wide">{zone.level}</p>
                    <p className="text-xs text-indigo-300/80 font-medium">Experience level</p>
                  </div>
                </div>

                {zone.provideCertificate !== false && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#c2f575]">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-wide">Shareable Certificate</p>
                      <p className="text-xs text-indigo-300/80 font-medium">Add to your LinkedIn profile</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-300">
                    <Globe size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-wide">{zone.domain}</p>
                    <p className="text-xs text-indigo-300/80 font-medium">Learning domain</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => navigate(`/payment/${zoneId}`)}
                className="w-full py-6 bg-[#c2f575] hover:bg-white text-nunma-forest rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-[0_15px_30px_rgba(194,245,117,0.2)] hover:shadow-[0_20px_40px_rgba(194,245,117,0.4)] active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                Proceed to Secure Checkout
              </button>

              <p className="text-center text-[10px] text-indigo-400/60 font-medium uppercase tracking-widest">
                Protected by 256-bit secure encryption
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-4">
            <h5 className="font-black text-nunma-forest text-sm uppercase tracking-widest">For Universities / Business</h5>
            <p className="text-gray-400 text-xs font-medium leading-relaxed">
              Upskill your entire team with bulk access. Includes custom analytics dashboard and dedicated support.
            </p>
            <button 
              onClick={() => navigate(`/inbox?userId=${zone.tutorId}`)}
              className="w-full py-4 border-2 border-indigo-50 text-indigo-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-colors"
            >
              Request Business Quote
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ZoneDetailView;

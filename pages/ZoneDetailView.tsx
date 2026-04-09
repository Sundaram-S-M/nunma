
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
  Award
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface ZoneData {
  id: string;
  title: string;
  description: string;
  price: string;
  priceINR?: string;
  currency: string;
  image: string;
  tutorName: string;
  tutorId: string;
  domain: string;
  level: string;
}

const SYLLABUS_MOCK = [
  {
    title: "Introduction to the Professional Certificate",
    duration: "45 mins",
    description: "An overview of the program goals, the learning platform, and what you'll achieve by the end of this journey."
  },
  {
    title: "Core Concepts & Fundamentals",
    duration: "2 hours",
    description: "Deep dive into the foundational principles that govern this domain. We'll cover history, terminology, and key frameworks."
  },
  {
    title: "Advanced Methodology & Process",
    duration: "3 hours",
    description: "Learn the specific processes used by industry leaders. This module focuses on practical application and workflow optimization."
  },
  {
    title: "Case Studies: Success and Failure",
    duration: "1.5 hours",
    description: "Analysis of real-world examples. Learn from the triumphs and mistakes of others to avoid common pitfalls."
  },
  {
    title: "Practical Workshop: Phase 1",
    duration: "4 hours",
    description: "Hands-on implementation. You'll start your first project under guided supervision, applying the concepts learned so far."
  },
  {
    title: "Scaling & Performance Optimization",
    duration: "2.5 hours",
    description: "How to take your skills to the next level. Focusing on efficiency, speed, and high-impact results."
  },
  {
    title: "Integration & Troubleshooting",
    duration: "3 hours",
    description: "Solving complex problems and integrating various components. Learn how to debug and refine your output."
  },
  {
    title: "Final Assessment & Certification Prep",
    duration: "2 hours",
    description: "Review of all material, final quiz, and preparation for the professional certification exam."
  }
];

const ZoneDetailView: React.FC = () => {
  const { zoneId } = useParams<{ zoneId: string }>();
  const navigate = useNavigate();
  const [zone, setZone] = useState<ZoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('About');
  const [expandedModules, setExpandedModules] = useState<number[]>([]);

  useEffect(() => {
    const fetchZone = async () => {
      if (!zoneId) return;
      try {
        const docRef = doc(db, 'zones', zoneId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setZone({ id: docSnap.id, ...docSnap.data() } as ZoneData);
        }
      } catch (error) {
        console.error("Error fetching zone:", error);
      } finally {
        // artificial delay to show off the skeleton if desired, but here we just set to false
        setLoading(false);
      }
    };

    fetchZone();
  }, [zoneId]);

  const toggleModule = (index: number) => {
    setExpandedModules(prev => 
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
        <h2 className="text-3xl font-black text-[#1A1A4E]">Zone Not Found</h2>
        <button 
          onClick={() => navigate('/explore')}
          className="mt-6 flex items-center gap-2 text-indigo-600 font-bold"
        >
          <ArrowLeft size={20} /> Back to Explore
        </button>
      </div>
    );
  }

  const price = zone.priceINR || zone.price || "100";

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-0">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 text-gray-400 hover:text-[#1A1A4E] font-bold transition-colors group"
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
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{zone.domain || 'Professional Certificate'}</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1A1A4E] tracking-tighter leading-[1.1]">
                {zone.title}
              </h1>
              <p className="text-xl text-gray-500 font-medium max-w-2xl leading-relaxed">
                {zone.description}
              </p>
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-black text-[#1A1A4E]">4.9</span>
                  <span className="text-gray-400 text-sm">(1,240 reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-indigo-400" />
                  <span className="font-black text-[#1A1A4E]">12k+</span>
                  <span className="text-gray-400 text-sm">Students enrolled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={18} className="text-teal-400" />
                  <span className="font-black text-[#1A1A4E]">English</span>
                  <span className="text-gray-400 text-sm">Taught in</span>
                </div>
              </div>
            </div>

            {/* Hero Media */}
            <div className="relative aspect-video w-full rounded-[3rem] overflow-hidden group shadow-2xl">
              <img 
                src={zone.image} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                alt={zone.title} 
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent">
                <button className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:scale-110 transition-transform">
                  <PlayCircle size={48} strokeWidth={1} />
                </button>
              </div>
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-100 flex items-center gap-8 overflow-x-auto no-scrollbar">
            {['About', 'Outcomes', 'Courses (Syllabus)', 'Instructors'].map(tab => (
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
            {activeTab === 'About' && (
              <div className="space-y-12">
                <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-6">
                  <h3 className="text-2xl font-black text-[#1A1A4E]">What you'll learn</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      "Master industry-standard project delivery frameworks",
                      "Build end-to-end technical architectures for modern apps",
                      "Lead high-stakes teams with effective communication",
                      "Optimize performance and scale infrastructure globally",
                      "Handle crisis management and technical debt",
                      "Implement security best practices from day one"
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 size={20} className="text-[#c2f575] shrink-0 mt-0.5" />
                        <span className="text-gray-600 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-[#1A1A4E]">Skills you'll gain</h3>
                  <div className="flex flex-wrap gap-3">
                    {["Project Planning", "Risk Management", "System Architecture", "Security Audit", "AWS/Cloud", "Agile Flow"].map(skill => (
                      <span key={skill} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold border border-indigo-100/50">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="prose prose-indigo max-w-none">
                  <p className="text-gray-500 text-lg leading-relaxed">
                    This Professional Certificate is designed to take you from a foundational understanding of the subject to mastery. 
                    Unlike traditional courses, Nunma focuses on the "Zone" concept—immersive learning environments where you don't just watch videos, 
                    but engage with the material through live workshops, peer collaboration, and direct tutor access.
                  </p>
                  <p className="text-gray-500 text-lg leading-relaxed mt-4">
                    By joining this Zone, you become part of an elite cohort of learners mentored by {zone.tutorName}. 
                    Our curriculum is updated weekly to reflect the latest industry shifts, ensuring you learn only what is relevant today.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'Outcomes' && (
              <div className="bg-gradient-to-br from-indigo-900 to-[#1A1A4E] rounded-[3rem] p-12 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#c2f575]/10 rounded-full blur-[80px]"></div>
                <div className="relative z-10 space-y-8">
                  <div className="w-16 h-16 bg-[#c2f575] rounded-2xl flex items-center justify-center text-[#1A1A4E]">
                    <Award size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black mb-4">Professional Certification</h3>
                    <p className="text-indigo-200 text-lg max-w-xl">
                      Upon successful completion of the course series and final assessment, you will receive a shareable certificate of completion verified by Nunma.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/10">
                    <div>
                      <p className="text-3xl font-black text-[#c2f575]">86%</p>
                      <p className="text-sm text-indigo-300 font-bold uppercase tracking-widest mt-2">Career Advancement</p>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-[#c2f575]">$25k+</p>
                      <p className="text-sm text-indigo-300 font-bold uppercase tracking-widest mt-2">Avg. Salary Increase</p>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-[#c2f575]">100%</p>
                      <p className="text-sm text-indigo-300 font-bold uppercase tracking-widest mt-2">Refund Guarantee</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Courses (Syllabus)' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-[#1A1A4E]">Professional Certificate - 8 Course Series</h3>
                  <button className="text-indigo-600 font-black text-sm uppercase tracking-widest hover:underline">View all course details</button>
                </div>
                
                <div className="space-y-4">
                  {SYLLABUS_MOCK.map((module, i) => (
                    <div 
                      key={i} 
                      className={`border border-gray-100 rounded-[2rem] transition-all overflow-hidden ${
                        expandedModules.includes(i) ? 'bg-indigo-50/30 border-indigo-100 shadow-sm' : 'bg-white hover:border-indigo-200'
                      }`}
                    >
                      <button 
                        onClick={() => toggleModule(i)}
                        className="w-full text-left p-8 flex items-center justify-between gap-6"
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-colors ${
                            expandedModules.includes(i) ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {i + 1}
                          </div>
                          <div>
                            <h4 className="font-black text-lg text-[#1A1A4E]">{module.title}</h4>
                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                              <span className="flex items-center gap-1"><Clock size={12} /> {module.duration}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span>Intermediate</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-gray-400">
                          {expandedModules.includes(i) ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                      </button>
                      
                      {expandedModules.includes(i) && (
                        <div className="px-8 pb-8 pt-0 ml-[4.5rem] animate-in slide-in-from-top-2 duration-300">
                          <p className="text-gray-500 leading-relaxed max-w-2xl">
                            {module.description}
                          </p>
                          <div className="mt-6 flex items-center gap-3">
                            <CheckCircle2 size={16} className="text-indigo-600" />
                            <span className="text-xs font-black text-[#1A1A4E] uppercase tracking-widest">Completed when quiz is passed</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Instructors' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-6">
                  <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-indigo-50 p-1">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${zone.tutorName}&backgroundColor=e2e8f0`} 
                      className="w-full h-full object-cover rounded-full" 
                      alt={zone.tutorName} 
                    />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-[#1A1A4E]">{zone.tutorName}</h4>
                    <p className="text-indigo-500 font-bold text-sm uppercase tracking-widest mt-1">Lead Instructor @ Nunma</p>
                  </div>
                  <p className="text-gray-500 leading-relaxed">
                    Lead tutor with over 15 years of experience in technical architecture and professional training. Passionate about democratizing high-level skills.
                  </p>
                  <div className="flex gap-4 pt-2">
                    <span className="p-3 bg-gray-50 rounded-xl text-[#1A1A4E] hover:bg-gray-100 transition-colors cursor-pointer"><Users size={20} /></span>
                    <span className="p-3 bg-gray-50 rounded-xl text-[#1A1A4E] hover:bg-gray-100 transition-colors cursor-pointer"><ShieldCheck size={20} /></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right CTA Sidebar (Col Span 1) */}
        <div className="lg:sticky lg:top-24 space-y-6">
          <div className="bg-[#1A1A4E] rounded-[3.5rem] p-10 shadow-2xl text-white relative overflow-hidden group">
            {/* Background Grain/Light */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
            
            <div className="relative z-10 space-y-8">
              <div className="space-y-2">
                <p className="text-indigo-300 font-black text-xs uppercase tracking-[0.2em]">Investment</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">₹{price}</span>
                  <span className="text-indigo-400 font-bold line-through ml-2 opacity-50">₹2,999</span>
                </div>
                <p className="text-sm font-bold text-[#c2f575] flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#c2f575] animate-ping"></span>
                  93% OFF (Limited Time)
                </p>
              </div>

              <div className="space-y-6 pt-4 border-t border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#c2f575]">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-wide">Shareable Certificate</p>
                    <p className="text-xs text-indigo-300/80 font-medium">Add to your LinkedIn profile</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-300">
                    <Globe size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-wide">100% Online</p>
                    <p className="text-xs text-indigo-300/80 font-medium">Start instantly and learn at your own pace</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-teal-300">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-wide">Approx. 4 Weeks</p>
                    <p className="text-xs text-indigo-300/80 font-medium">Commit 5-7 hours per week</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => navigate(`/payment/${zoneId}`)}
                className="w-full py-6 bg-[#c2f575] hover:bg-white text-[#1A1A4E] rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-[0_15px_30px_rgba(194,245,117,0.2)] hover:shadow-[0_20px_40px_rgba(194,245,117,0.4)] active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                Proceed to Secure Checkout
              </button>

              <p className="text-center text-[10px] text-indigo-400/60 font-medium uppercase tracking-widest">
                Protected by 256-bit secure encryption
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-4">
            <h5 className="font-black text-[#1A1A4E] text-sm uppercase tracking-widest">For Universities / Business</h5>
            <p className="text-gray-400 text-xs font-medium leading-relaxed">
              Upskill your entire team with bulk access. Includes custom analytics dashboard and dedicated support.
            </p>
            <button className="w-full py-4 border-2 border-indigo-50 text-indigo-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-colors">
              Request Business Quote
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ZoneDetailView;

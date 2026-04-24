
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useNavigate } from 'react-router-dom';
import { Layers, Search, Filter, Globe, ArrowRight, MonitorPlay, Video } from 'lucide-react';

interface FirestoreZone {
  id: string;
  tutorId: string;
  tutorName: string;
  title: string;
  description: string;
  level: string;
  domain: string;
  price: string;
  currency: string;
  image: string;
  students: number;
}

const Explore: React.FC = () => {
  const [zones, setZones] = useState<FirestoreZone[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [tutorData, setTutorData] = useState<Record<string, { name: string, photoURL?: string }>>({});

  useEffect(() => {
    let unsubscribe = () => { };

    if (db) {
      const q = query(collection(db, 'zones'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const zonesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FirestoreZone[];
        setZones(zonesData);
        setLoading(false);
      }, (error) => {
        console.error("Firestore error:", error);
        setZones([]);
        setLoading(false);
      });
    } else {
      console.log("Explore: Using Mock Content (No Firebase)");
      setZones([
        {
          id: 'mock-1',
          tutorId: 't1',
          tutorName: 'Sundaram S M',
          title: 'Advanced Project Management',
          description: 'Master the art of high-stake project delivery with industry-proven frameworks.',
          level: 'Expert',
          domain: 'Project Management',
          price: '199',
          currency: 'USD',
          image: 'https://images.unsplash.com/photo-1507537243993-c0a373bba793?q=80&w=1000&auto=format&fit=crop',
          students: 1240
        },
        {
          id: 'mock-2',
          tutorId: 't2',
          tutorName: 'Alpha Mentor',
          title: 'UI/UX Design Masterclass',
          description: 'Deep dive into user-centric design principles and modern interface aesthetics.',
          level: 'Intermediate',
          domain: 'UI/UX Design',
          price: '149',
          currency: 'USD',
          image: 'https://images.unsplash.com/photo-1586717791821-3f44a563dc4c?q=80&w=1000&auto=format&fit=crop',
          students: 856
        }
      ]);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || zones.length === 0) return;

    const fetchTutors = async () => {
      try {
        const uniqueTutors = [...new Set(zones.map(z => z.tutorId))];
        const newTutorData: Record<string, { name: string, photoURL?: string }> = {};

        await Promise.all(uniqueTutors.map(async (tutorId) => {
          if (!tutorId || tutorData[tutorId]) return;

          try {
            const userDoc = await getDoc(doc(db, 'users', tutorId));
            if (userDoc.exists()) {
              const data = userDoc.data();
              newTutorData[tutorId] = {
                name: data.name,
                photoURL: data.photoURL || data.avatar || data.image || ''
              };
            } else {
              newTutorData[tutorId] = { name: 'Unknown Tutor' };
            }
          } catch (error) {
            console.error("Error fetching tutor:", tutorId, error);
            newTutorData[tutorId] = { name: 'Unknown Tutor' };
          }
        }));

        if (Object.keys(newTutorData).length > 0) {
          setTutorData(prev => ({ ...prev, ...newTutorData }));
        }
      } catch (error) {
        console.error("Error in fetchTutors:", error);
      }
    };

    fetchTutors();
  }, [zones]);

  const filteredZones = zones.filter(zone =>
    zone.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.tutorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Modern Banner Hero Section */}
      <div className="relative overflow-hidden w-full bg-[#040457] rounded-[3.5rem] p-8 md:p-14 lg:p-20 shadow-2xl flex flex-col md:flex-row items-center md:items-start justify-between gap-12 group transition-all duration-700 hover:shadow-indigo-900/40">

        {/* Decorative Gradients */}
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3 mix-blend-screen transition-transform duration-[2s] group-hover:scale-110"></div>
        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-[#c2f575]/10 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 translate-y-1/2 transition-transform duration-[2s] group-hover:scale-110"></div>
        <div className="absolute top-1/2 left-1/4 w-[20rem] h-[20rem] bg-pink-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        {/* Left Side Header Text */}
        <div className="relative z-10 space-y-8 flex-1 w-full text-center md:text-left pt-6">
          <div className="inline-flex items-center gap-3 bg-[#c2f575]/10 border border-[#c2f575]/30 shadow-[0_0_20px_rgba(194,245,117,0.15)] backdrop-blur-md px-5 py-2.5 rounded-full mx-auto md:mx-0 transition-transform duration-500 hover:scale-105 cursor-default">
            <Globe size={16} className="text-[#c2f575] animate-[spin_4s_linear_infinite]" />
            <span className="text-[11px] font-black text-[#c2f575] uppercase tracking-[0.25em]">Global Discovery</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-black text-white tracking-tighter leading-[0.9] flex flex-col gap-2">
            <span>Explore</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c2f575] via-teal-300 to-indigo-300 drop-shadow-[0_2px_20px_rgba(194,245,117,0.3)] filter pb-4">
              Knowledge Hub.
            </span>
          </h1>

          <p className="text-indigo-200/90 text-lg md:text-xl font-medium max-w-xl mx-auto md:mx-0 leading-relaxed drop-shadow-sm">
            Discover premium masterclasses, immersive zones, and connect with top-tier tutors to elevate your expertise.
          </p>
        </div>

        {/* Right Side Search Bar */}
        <div className="relative z-10 w-full md:w-[420px] flex-shrink-0 mt-6 md:mt-12 group/search">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-2.5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] focus-within:bg-white/15 focus-within:border-white/40 focus-within:shadow-[0_20px_60px_rgba(194,245,117,0.15)] transition-all duration-500 hover:border-white/30 flex items-center gap-3">
            <div className="pl-6 text-white/50 group-focus-within/search:text-[#c2f575] group-hover/search:text-white/80 transition-colors duration-300">
              <Search size={22} className="drop-shadow-sm" />
            </div>
            <input
              type="text"
              placeholder="Search zones, tutors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 w-full px-2 py-4 text-lg font-bold text-white placeholder:text-white/40 placeholder:font-medium outline-none bg-transparent"
            />
            <button className="bg-[#c2f575] p-4 rounded-[2rem] text-[#040457] hover:bg-white transition-all transform hover:scale-[1.05] hover:rotate-3 shadow-[0_10px_20px_rgba(194,245,117,0.3)] flex-shrink-0">
              <Filter size={20} className="fill-current" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[450px] bg-gray-50 rounded-[3rem] animate-pulse border border-gray-100"></div>
          ))}
        </div>
      ) : filteredZones.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredZones.map((zone) => (
              <div
                key={zone.id}
                className="group bg-white rounded-[3.5rem] border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_100px_rgba(0,0,0,0.08)] transition-all duration-700 overflow-hidden cursor-pointer flex flex-col"
                onClick={() => navigate(`/zone/${zone.id}`)}
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img
                    src={zone.image}
                    alt={zone.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute top-8 right-8">
                    <div className="bg-white/90 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-xl border border-white/50">
                      <span className="text-xl font-black text-indigo-900">
                        {zone.currency === 'USD' ? '$' : zone.currency === 'INR' ? '₹' : '€'}
                        {zone.price}
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-start opacity-0 group-hover:opacity-100 translate-y-6 group-hover:translate-y-0 transition-all duration-500 z-20 pointer-events-none">
                    <div className="flex items-center gap-4 bg-white/95 backdrop-blur-xl p-2.5 pr-8 rounded-[2rem] border border-white shadow-[0_20px_40px_rgba(0,0,0,0.2)] transform origin-left hover:scale-[1.02] transition-transform duration-300 pointer-events-auto">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-indigo-50 shadow-inner ring-4 ring-white shrink-0">
                        <img
                          src={tutorData[zone.tutorId]?.photoURL || tutorData[zone.tutorName]?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tutorData[zone.tutorId]?.name || zone.tutorName}&backgroundColor=e2e8f0`}
                          alt="Tutor avatar"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${zone.tutorName}&backgroundColor=e2e8f0`;
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] leading-none mb-1.5 block">
                          Master
                        </span>
                        <span className="text-sm font-black text-[#1A1A4E] uppercase tracking-wide leading-none block line-clamp-1">
                          {tutorData[zone.tutorId]?.name || zone.tutorName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{zone.domain}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <MonitorPlay size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#c2f575]">{zone.level}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-indigo-900 tracking-tighter group-hover:text-indigo-600 transition-colors leading-tight">
                      {zone.title}
                    </h3>
                    <p className="text-gray-400 text-sm font-medium line-clamp-2 leading-relaxed">
                      {zone.description}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-gray-50 flex items-center justify-between mt-auto">
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-10 h-10 rounded-xl border-4 border-white overflow-hidden bg-gray-100 shadow-sm relative z-[1]">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${zone.id}${i}`} alt="Student" width="500" height="500" />
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-xl border-4 border-white bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 relative z-0">
                        +{zone.students || 0}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group/btn">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover/btn:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 duration-500">View Details</span>
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-indigo-900 group-hover:bg-[#c2f575] transition-all duration-500">
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] p-32 border border-gray-50 shadow-sm text-center">
          <Layers size={80} className="mx-auto text-gray-100 mb-8" strokeWidth={1} />
          <h3 className="text-3xl font-black text-[#1A1A4E] uppercase tracking-widest mb-4">No Active Streams</h3>
          <p className="text-gray-400 font-medium max-w-sm mx-auto text-lg leading-relaxed italic">
            Our tutors are currently preparing new masterclasses. Check back soon for the next wave of expertise.
          </p>
        </div>
      )}
    </div>
  );
};

export default Explore;


import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc, getDocs, limit } from 'firebase/firestore';
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
  isPublic?: boolean;
}

const Explore: React.FC = () => {
  const [zones, setZones] = useState<FirestoreZone[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [tutorData, setTutorData] = useState<Record<string, { name: string, photoURL?: string }>>({});
  const [studentAvatars, setStudentAvatars] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let unsubscribe = () => { };

    if (db) {
      const q = query(collection(db, 'zones'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const zonesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FirestoreZone[];
        setZones(zonesData.filter(zone => zone.isPublic !== false));
        setLoading(false);
      }, (error) => {
        console.error("Firestore error:", error);
        setZones([]);
        setLoading(false);
      });
    } else {
      console.log("Explore: No Firebase database connection available.");
      setZones([]);
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

  useEffect(() => {
    if (!db || zones.length === 0) return;

    const fetchStudentAvatars = async () => {
      try {
        const newAvatars: Record<string, string[]> = {};
        
        await Promise.all(zones.map(async (zone) => {
          if (studentAvatars[zone.id]) return; // already fetched
          
          try {
            const q = query(collection(db, 'zones', zone.id, 'students'), limit(3));
            const snap = await getDocs(q);
            newAvatars[zone.id] = snap.docs.map(d => d.data().avatar || "/default-avatar.png");
          } catch (err) {
            console.error("Failed to fetch students for zone", zone.id, err);
            newAvatars[zone.id] = [];
          }
        }));

        if (Object.keys(newAvatars).length > 0) {
          setStudentAvatars(prev => ({ ...prev, ...newAvatars }));
        }
      } catch (error) {
        console.error("Error in fetchStudentAvatars:", error);
      }
    };

    fetchStudentAvatars();
  }, [zones]);

  const filteredZones = zones.filter(zone =>
    zone.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.tutorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Modern Banner Hero Section */}
      <div className="relative overflow-hidden w-full bg-nunma-forest rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-14 lg:p-20 shadow-2xl flex flex-col md:flex-row items-center md:items-start justify-between gap-6 md:gap-12 group transition-all duration-700 hover:shadow-indigo-900/40">

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

          <h1 className="text-4xl md:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-black text-white tracking-tighter leading-[0.9] flex flex-col gap-2">
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
              className="flex-1 w-full px-2 pr-6 py-4 text-lg font-bold text-white placeholder:text-white/40 placeholder:font-medium outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[450px] bg-gray-50 rounded-[1.5rem] md:rounded-[3rem] animate-pulse border border-gray-100"></div>
          ))}
        </div>
      ) : filteredZones.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredZones.map((zone) => (
              <div
                key={zone.id}
                className="group bg-white rounded-[1.5rem] md:rounded-[3rem] border border-gray-100 p-6 md:p-8 hover:shadow-2xl hover:border-indigo-100 transition-all duration-700 cursor-pointer flex flex-col"
                onClick={() => navigate(`/zone/${zone.id}`)}
              >
                <div className="h-48 md:h-56 rounded-[2rem] overflow-hidden mb-6 md:mb-8 relative shadow-lg">
                  <img
                    src={zone.image}
                    alt={zone.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-white/95 backdrop-blur-xl px-4 py-2 rounded-xl shadow-xl border border-white/50">
                      <span className="text-sm font-black text-indigo-900 tracking-wider">
                        {zone.currency === 'USD' ? '$' : zone.currency === 'INR' ? '₹' : '€'}{zone.price}
                      </span>
                    </div>
                  </div>
                  {/* Small tutor badge overlaid on image */}
                  <div className="absolute bottom-4 left-4 z-10 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                    <div className="flex items-center gap-2 bg-white/95 backdrop-blur-xl p-1.5 pr-4 rounded-full border border-white/50 shadow-lg">
                      <img
                        src={tutorData[zone.tutorId]?.photoURL || tutorData[zone.tutorName]?.photoURL || "/default-avatar.png"}
                        alt="Tutor avatar"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/default-avatar.png";
                        }}
                        className="w-8 h-8 rounded-full object-cover shadow-inner"
                      />
                      <span className="text-[10px] font-black text-nunma-forest uppercase tracking-widest line-clamp-1 max-w-[100px]">
                        {tutorData[zone.tutorId]?.name || zone.tutorName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <h4 className="text-xl md:text-2xl font-black text-nunma-forest group-hover:text-indigo-600 transition-colors mb-2 line-clamp-2">{zone.title}</h4>
                  <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-6">By {tutorData[zone.tutorId]?.name || zone.tutorName || 'Expert Tutor'}</p>

                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-100">
                    <span className="text-[9px] md:text-[10px] font-black text-indigo-900/40 uppercase tracking-[0.2em]">{zone.level} • {zone.domain}</span>
                    <div className="p-3 md:p-4 bg-indigo-900 rounded-2xl shadow-xl shadow-indigo-900/10 text-white group-hover:bg-[#c2f575] group-hover:text-indigo-900 transition-all active:scale-90 flex items-center justify-center">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </div>
              </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[1.5rem] md:rounded-[3rem] p-32 border border-gray-50 shadow-sm text-center">
          <Layers size={80} className="mx-auto text-gray-100 mb-8" strokeWidth={1} />
          <h3 className="text-3xl font-black text-nunma-forest uppercase tracking-widest mb-4">No Active Streams</h3>
          <p className="text-gray-400 font-medium max-w-sm mx-auto text-lg leading-relaxed italic">
            Our tutors are currently preparing new masterclasses. Check back soon for the next wave of expertise.
          </p>
        </div>
      )}
    </div>
  );
};

export default Explore;

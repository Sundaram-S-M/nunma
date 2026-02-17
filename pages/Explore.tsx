
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
  const [tutorData, setTutorData] = useState<Record<string, { name: string }>>({});

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
      const uniqueTutors = [...new Set(zones.map(z => z.tutorId))];
      const newTutorData: Record<string, { name: string }> = {};

      await Promise.all(uniqueTutors.map(async (tutorId) => {
        if (!tutorId || tutorData[tutorId]) return;

        try {
          const userDoc = await getDoc(doc(db, 'users', tutorId));
          if (userDoc.exists()) {
            newTutorData[tutorId] = { name: userDoc.data().name };
          }
        } catch (error) {
          console.error("Error fetching tutor:", tutorId, error);
        }
      }));

      if (Object.keys(newTutorData).length > 0) {
        setTutorData(prev => ({ ...prev, ...newTutorData }));
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[#c2f575] bg-[#040457] w-fit px-4 py-1.5 rounded-full">
            <Globe size={14} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Discovery</span>
          </div>
          <h1 className="text-6xl font-black text-[#1A1A4E] tracking-tighter leading-none">
            Explore <br />
            <span className="text-gray-300">Knowledge Hub.</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-gray-100 shadow-xl w-full max-w-md group focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
          <div className="pl-6 text-gray-300 group-focus-within:text-indigo-900 transition-colors">
            <Search size={22} />
          </div>
          <input
            type="text"
            placeholder="Search zones, tutors, domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-4 font-bold text-indigo-900 placeholder:text-gray-300 outline-none bg-transparent"
          />
          <button className="bg-gray-50 p-4 rounded-2xl text-indigo-900 hover:bg-[#c2f575] transition-all">
            <Filter size={20} />
          </button>
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
                <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                  <div className="flex items-center gap-3 bg-[#040457]/80 backdrop-blur-md p-2 pr-6 rounded-2xl border border-white/10">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/20">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tutorData[zone.tutorId]?.name || zone.tutorName}`} alt="Tutor" />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{tutorData[zone.tutorId]?.name || zone.tutorName}</span>
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
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${zone.id}${i}`} alt="Student" />
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-xl border-4 border-white bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 relative z-0">
                      +{zone.students || 0}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-indigo-900 group-hover:bg-[#c2f575] transition-all duration-500">
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
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

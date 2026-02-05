
import React, { useState, useEffect } from 'react';
import { Layers, Search, Filter, Globe, ArrowRight, MonitorPlay, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

const ZONES_STORAGE_KEY = 'nunma_zones_data';

const Explore: React.FC = () => {
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    const loadZones = () => {
      const saved = localStorage.getItem(ZONES_STORAGE_KEY);
      if (saved) {
        setZones(JSON.parse(saved));
      }
    };
    
    loadZones();
    window.addEventListener('storage', loadZones);
    return () => window.removeEventListener('storage', loadZones);
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1A1A4E] mb-2 tracking-tighter">Explore Zones</h1>
          <p className="text-gray-400 font-medium text-lg">Discover professional streams and join global learning communities.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-full md:w-80 relative group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-900 transition-colors" size={18} />
           <input 
            type="text" 
            placeholder="Search learning streams..." 
            className="w-full bg-transparent pl-12 pr-4 py-3 text-sm font-bold text-indigo-900 placeholder:text-gray-300 outline-none"
           />
        </div>
      </div>

      {zones.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {zones.map(zone => (
            <Link 
              key={zone.id} 
              to="/u/sundaram" 
              className="bg-white p-1 rounded-[3rem] border border-gray-50 shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden flex flex-col"
            >
              <div className="p-1">
                <div className="h-56 rounded-[2.5rem] overflow-hidden relative">
                   <img src={zone.image} alt={zone.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                   <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md text-indigo-900 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                      ${zone.price}
                   </div>
                   <div className="absolute bottom-6 left-6 text-white">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">Learning Zone</p>
                      <h3 className="text-2xl font-black tracking-tight">{zone.title}</h3>
                   </div>
                </div>
              </div>
              
              <div className="p-10 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden">
                        <img src="https://picsum.photos/seed/sundaram/80/80" alt="tutor" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Expert</p>
                        <p className="text-xs font-black text-indigo-900">Sundaram S M</p>
                      </div>
                   </div>
                   <div className={`p-3 rounded-2xl ${zone.type === 'live-course' ? 'bg-indigo-50 text-indigo-900' : 'bg-[#7cc142]/10 text-[#7cc142]'}`}>
                      {zone.type === 'live-course' ? <Video size={18}/> : <MonitorPlay size={18}/>}
                   </div>
                </div>

                <div className="mt-auto">
                   <div className="flex items-center justify-between py-5 border-t border-gray-50">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enrolled</span>
                      <span className="text-xs font-black text-indigo-900">{zone.students} Students</span>
                   </div>
                   <button className="w-full py-5 bg-[#1A1A4E] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 group-hover:bg-[#c1e60d] group-hover:text-indigo-900 transition-all duration-300">
                      View Stream <ArrowRight size={16} />
                   </button>
                </div>
              </div>
            </Link>
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

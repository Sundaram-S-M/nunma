import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { PlayCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DiscoveryZone {
  id: string;
  name: string;
  description: string;
  ownerName: string;
  thumbnailUrl?: string;
  landingPageConfig?: {
    isVisible: boolean;
  };
}

const DiscoveryGrid: React.FC = () => {
  const [zones, setZones] = useState<DiscoveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVisibleZones = async () => {
      try {
        const zonesRef = collection(db, 'zones');
        const q = query(
          zonesRef, 
          where('landingPageConfig.isVisible', '==', true),
          limit(6)
        );
        
        const snapshot = await getDocs(q);
        const fetchedZones = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DiscoveryZone[];
        
        setZones(fetchedZones);
      } catch (error) {
        console.error('Error fetching discovery zones:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVisibleZones();
  }, []);

  if (loading) {
    return (
      <section id="discovery" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="animate-pulse flex flex-col items-center">
             <div className="h-10 bg-slate-200 rounded w-64 mb-6"></div>
             <div className="h-6 bg-slate-200 rounded w-96 mb-16"></div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
               {[1, 2, 3].map(i => (
                 <div key={i} className="h-64 bg-slate-200 rounded-3xl"></div>
               ))}
             </div>
           </div>
        </div>
      </section>
    );
  }

  // Only render section if we actually have visible zones to prove platform is active
  if (zones.length === 0) return null;

  return (
    <section id="discovery" className="py-24 bg-slate-50 border-t border-slate-200 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 font-medium text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Platform is Live
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">
            Discover Active <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Zones</span>
          </h2>
          <p className="text-xl text-slate-600 mb-2">
            Explore premium learning environments currently hosted on Nunma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {zones.map((zone) => (
            <div 
              key={zone.id} 
              className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-200 flex flex-col h-full hover:-translate-y-1 cursor-pointer"
              onClick={() => navigate(`/checkout/${zone.id}`)} // Redirects to a join/explore page
            >
              <div className="h-48 bg-slate-100 relative overflow-hidden flex-shrink-0">
                {zone.thumbnailUrl ? (
                  <img 
                    src={zone.thumbnailUrl} 
                    alt={zone.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center opacity-90 group-hover:scale-105 transition-transform duration-500">
                    <span className="text-white/50 font-black text-4xl">{zone.name.substring(0, 2).toUpperCase()}</span>
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700">Verified</span>
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1">{zone.name}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{zone.description || 'Premium learning zone hosted on Nunma.'}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                      {zone.ownerName?.charAt(0) || 'T'}
                    </div>
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{zone.ownerName || 'Tutor'}</span>
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1 transition-colors">
                    <PlayCircle className="w-4 h-4" />
                    Enter
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DiscoveryGrid;

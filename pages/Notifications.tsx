
import React, { useState, useEffect } from 'react';
import { Bell, Radio, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Notifications: React.FC = () => {
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLocal = () => {
      const active = JSON.parse(localStorage.getItem('nunma_live_sessions') || '[]');
      setLiveSessions(active.filter((s: any) => s.status === 'live'));
    };
    fetchLocal();
    window.addEventListener('storage', fetchLocal);
    return () => window.removeEventListener('storage', fetchLocal);
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-4xl font-extrabold text-[#040457] mb-2 tracking-tighter">Notifications</h1>
        <p className="text-gray-400 font-medium">Your personal hub to learn, grow, and achieve.</p>
      </div>

      <div className="space-y-4">
        {liveSessions.map((session) => (
          <div key={session.id} className="bg-[#1A1A4E] rounded-[2.5rem] p-8 text-white flex items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-[#c2f575] rounded-2xl flex items-center justify-center text-[#1A1A4E] animate-pulse shadow-2xl">
                <Radio size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-[0.2em] mb-1">Live Broadcast</p>
                <h3 className="text-2xl font-black tracking-tight">{session.title}</h3>
                <p className="text-white/40 text-sm font-medium mt-1 italic">Started at {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/live/${session.zoneId}/${session.id}`)}
              className="bg-[#c2f575] text-[#040457] px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all relative z-10"
            >
              Enter Room <ArrowRight size={14} />
            </button>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#c2f575]/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          </div>
        ))}

        {liveSessions.length === 0 && (
          <div className="bg-white rounded-[3rem] p-24 border border-gray-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-10">
              <Bell size={48} className="text-gray-100" />
            </div>
            <p className="text-gray-300 font-black uppercase text-xs tracking-widest italic tracking-[0.3em]">No Current Alerts</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

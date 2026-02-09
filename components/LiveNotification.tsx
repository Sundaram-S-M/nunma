
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, X, ArrowRight } from 'lucide-react';

const LiveNotification: React.FC = () => {
    const [activeSession, setActiveSession] = useState<any>(null);
    const [show, setShow] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkSessions = () => {
            const sessions = JSON.parse(localStorage.getItem('nunma_live_sessions') || '[]');
            const live = sessions.find((s: any) => s.status === 'live');

            if (live && (!activeSession || activeSession.id !== live.id)) {
                setActiveSession(live);
                setShow(true);
            } else if (!live) {
                setShow(false);
                setActiveSession(null);
            }
        };

        checkSessions();
        window.addEventListener('storage', checkSessions);
        const interval = setInterval(checkSessions, 5000);

        return () => {
            window.removeEventListener('storage', checkSessions);
            clearInterval(interval);
        };
    }, [activeSession]);

    if (!show || !activeSession) return null;

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-full max-w-xl px-6 animate-in slide-in-from-bottom-10 duration-700">
            <div className="bg-[#1A1A4E] rounded-3xl border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] p-6 flex items-center justify-between gap-6 backdrop-blur-xl">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-[#c2f575] rounded-2xl flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(194,245,117,0.2)]">
                        <Radio size={28} className="text-[#1A1A4E]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest">Live Now</span>
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                        </div>
                        <h4 className="text-white font-black text-lg tracking-tight leading-tight">{activeSession.title}</h4>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Join the ongoing session</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/classroom/zone/${activeSession.zoneId}?session=${activeSession.id}`)}
                        className="px-6 py-4 bg-[#c2f575] text-[#1A1A4E] rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        Join <ArrowRight size={14} />
                    </button>
                    <button
                        onClick={() => setShow(false)}
                        className="p-4 text-white/20 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveNotification;

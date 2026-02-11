
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, X, ArrowRight } from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

const LiveNotification: React.FC = () => {
    const { user } = useAuth();
    const [activeSession, setActiveSession] = useState<any>(null);
    const [show, setShow] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        let unsubs: (() => void)[] = [];

        const setupListeners = async () => {
            // Get enrollments to know which zones to watch
            const enrollRef = collection(db, `users/${user.uid}/enrollments`);
            const enrollSnap = await getDocs(enrollRef);
            const zoneIds = enrollSnap.docs.map(d => d.data().zoneId);

            if (zoneIds.length === 0) return;

            zoneIds.forEach(zId => {
                const q = query(
                    collection(db, `zones/${zId}/sessions`),
                    where('status', '==', 'live')
                );
                const unsub = onSnapshot(q, (snap) => {
                    // If we find a live session we haven't seen/dismissed, show it
                    // For simplicity, just show the first one found
                    if (!snap.empty) {
                        const live = { id: snap.docs[0].id, zoneId: zId, ...snap.docs[0].data() };
                        // Only show if it's different from current or we haven't shown it?
                        // The logic in original was: if live && (!active || diff), show.
                        setActiveSession((prev: any) => {
                            if (!prev || prev.id !== live.id) {
                                setShow(true);
                                return live;
                            }
                            return prev;
                        });
                    } else {
                        // If the current active session ended, hide
                        setActiveSession((prev: any) => {
                            if (prev && prev.zoneId === zId) {
                                setShow(false);
                                return null;
                            }
                            return prev;
                        });
                    }
                });
                unsubs.push(unsub);
            });
        };

        setupListeners();
        return () => unsubs.forEach(u => u());
    }, [user]);

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

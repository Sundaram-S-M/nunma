
import React, { useState, useEffect } from 'react';
import { Bell, Radio, ArrowRight, Calendar, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

const Notifications: React.FC = () => {
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const navigate = useNavigate();

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Fetch enrollments to know which zones to listen to
    const fetchSessions = async () => {
      const enrollSnap = await getDocs(collection(db, `users/${user.uid}/enrollments`));
      const zoneIds = enrollSnap.docs.map(d => d.data().zoneId);

      if (zoneIds.length === 0) {
        setLiveSessions([]);
        return;
      }

      const unsubs: (() => void)[] = [];
      zoneIds.forEach(zId => {
        const q = query(
          collection(db, 'zones', zId, 'sessions'),
          where('status', '==', 'live')
        );

        const un = onSnapshot(q, (snap) => {
          const sessions = snap.docs.map(d => ({ id: d.id, zoneId: zId, ...d.data() }));
          setLiveSessions(prev => {
            const others = prev.filter(s => s.zoneId !== zId);
            return [...others, ...sessions];
          });
        });
        unsubs.push(un);
      });

      return () => unsubs.forEach(u => u());
    };

    // We can't really return the array of unsubs easily from async function to useEffect cleanup
    // So we'll wrap it slightly differently or just use a mounting flag / simpler logic
    // For simplicity in this tool call, I'll use a self-contained effect logic

    let unsubs: (() => void)[] = [];

    getDocs(collection(db, `users/${user.uid}/enrollments`)).then(enrollSnap => {
      const zoneIds = enrollSnap.docs.map(d => d.data().zoneId);
      if (zoneIds.length === 0) return;

      zoneIds.forEach(zId => {
        const q = query(
          collection(db, 'zones', zId, 'sessions'),
          where('status', '==', 'live')
        );
        const un = onSnapshot(q, (snap) => {
          const sessions = snap.docs.map(d => ({ id: d.id, zoneId: zId, ...d.data() }));
          setLiveSessions(prev => {
            const others = prev.filter(s => s.zoneId !== zId);
            return [...others, ...sessions];
          });
        });
        unsubs.push(un);
      });
    });

    // 1. Calendar Reminders for Tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;

    const qCalendar = query(
      collection(db, 'users', user.uid, 'calendar_events'),
      where('dateKey', '==', tomorrowKey)
    );

    const unCalendar = onSnapshot(qCalendar, (snap) => {
      setReminders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Recent Messages
    const qConversations = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unMessages = onSnapshot(qConversations, (snap) => {
      const now = new Date();
      const recent = snap.docs.filter(d => {
        const data = d.data();
        if (!data.lastMessageTime) return false;
        try {
          const msgTime = data.lastMessageTime.toDate();
          return (now.getTime() - msgTime.getTime()) < 24 * 60 * 60 * 1000;
        } catch (e) { return false; }
      }).map(d => ({ id: d.id, ...d.data() }));
      setRecentMessages(recent);
    });

    return () => {
      unCalendar();
      unMessages();
      unsubs.forEach(u => u());
    };
  }, [user]);

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

        {reminders.map(event => (
          <div key={event.id} className="bg-indigo-50 rounded-[2.5rem] p-8 text-[#1A1A4E] flex items-center justify-between gap-6 border border-indigo-100 group transition-all hover:bg-white hover:shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-400 shadow-sm group-hover:text-indigo-600 transition-colors">
                <Calendar size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Upcoming Reminder</p>
                <h3 className="text-2xl font-black tracking-tight">{event.title}</h3>
                <p className="text-gray-400 text-sm font-medium mt-1 italic">Scheduled for {event.time}</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          </div>
        ))}

        {recentMessages.map(msg => (
          <div key={msg.id} className="bg-white rounded-[2.5rem] p-8 text-[#1A1A4E] flex items-center justify-between gap-6 border border-gray-100 shadow-sm group transition-all hover:shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 shadow-inner group-hover:text-[#c2f575] group-hover:bg-[#1A1A4E] transition-all">
                <MessageSquare size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Recent Message in {msg.name || 'Chat'}</p>
                <h3 className="text-xl font-black tracking-tight line-clamp-1">{msg.lastMessage}</h3>
                <p className="text-gray-400 text-sm font-medium mt-1 italic">{msg.lastMessageTime?.toDate?.()?.toLocaleTimeString()}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/inbox?chatId=${msg.id}`)}
              className="px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all bg-gray-50 text-gray-400 hover:bg-[#c2f575] hover:text-[#1A1A4E] relative z-10"
            >
              Reply <ArrowRight size={14} />
            </button>
            <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50/50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          </div>
        ))}

        {liveSessions.length === 0 && reminders.length === 0 && recentMessages.length === 0 && (
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


import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, onSnapshot, orderBy,
  getDocs, limit, doc, getDoc
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Calendar as CalendarIcon,
  Clock,
  X,
  Plus,
  Star,
  Zap,
  Save,
  Video,
  User,
  ArrowRight,
  CheckCircle,
  Radio,
  BookOpen,
  Users
} from 'lucide-react';
import ClassroomStream from '../components/ClassroomStream';

const Dashboard: React.FC<{ role: UserRole }> = ({ role }) => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalDate, setModalDate] = useState<number | null>(null);
  const [meetingsData, setMeetingsData] = useState<Record<number, any[]>>({});

  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);

  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEvenTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventIsImportant, setNewEventIsImportant] = useState(false);

  useEffect(() => {
    if (!user) return;

    let unsubscribeLive = () => { };

    if (db) {
      // Fetch Live Sessions
      const qLive = query(collection(db, 'live_sessions'), orderBy('startTime', 'asc'));
      unsubscribeLive = onSnapshot(qLive, (snapshot) => {
        setLiveSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    } else {
      console.log("Dashboard: Skipping Firebase fetch (Mock Mode active)");
      // Optionally set some mock live sessions here if desired
    }

    // Fetch User Stats
    const fetchStats = async () => {
      if (role === UserRole.STUDENT) {
        // In a real app, query enrolled_zones collection
        setStats([
          { label: 'TOTAL ZONES', value: '0' },
          { label: 'UPCOMING LIVE', value: '0' },
          { label: 'COMPLETED', value: '0' },
          { label: 'IN PROGRESS', value: '0' },
        ]);
      } else {
        setStats([
          { label: 'TOTAL EARNINGS', value: `$${user.earnings || 0}` },
          { label: 'ACTIVE STUDENTS', value: user.studentsCount || 0 },
          { label: 'FOLLOWERS', value: user.followersCount || 0 },
          { label: 'ZONES CREATED', value: '0' }, // Would fetch count from zones collection
        ]);
      }
    };
    fetchStats();

    return () => unsubscribeLive();
  }, [user, role]);

  const monthName = currentMonth.toLocaleString('default', { month: 'long' }).toUpperCase();
  const year = currentMonth.getFullYear();
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const daysCount = getDaysInMonth(year, currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(year, currentMonth.getMonth());
  const today = new Date();
  const isThisMonth = today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();

  const handleDayClick = (day: number) => {
    setModalDate(day);
    setShowEventModal(true);
    setIsCreatingEvent(false);
  };

  const handleSaveEvent = () => {
    if (!newEvenTitle || !modalDate) return;
    const newEvent = {
      id: Date.now(),
      title: newEvenTitle,
      time: newEventTime || '12:00 PM',
      type: newEventIsImportant ? 'meeting' : 'task',
      color: newEventIsImportant ? 'indigo' : 'gray',
      important: newEventIsImportant
    };
    setMeetingsData(prev => ({ ...prev, [modalDate]: [...(prev[modalDate] || []), newEvent] }));
    setNewEventTitle('');
    setNewEventTime('');
    setNewEventIsImportant(false);
    setIsCreatingEvent(false);
  };

  const eventsForModal = modalDate ? (meetingsData[modalDate] || []) : [];
  const activeSessions = liveSessions.filter(s => s.status === 'live');
  const upcomingLiveSessions = liveSessions.filter(s => s.status === 'scheduled');

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 relative">
      {/* Live Room Overlay */}
      {activeLiveRoom && (
        <ClassroomStream
          sessionId={activeLiveRoom.id}
          role={role === UserRole.TUTOR ? 'TUTOR' : 'STUDENT'}
          title={activeLiveRoom.title}
          onClose={() => setActiveLiveRoom(null)}
        />
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/30">
              <div>
                <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-[0.2em] mb-1">Agenda for</p>
                <h3 className="text-2xl font-black text-[#1A1A4E]">{monthName} {modalDate}, {year}</h3>
              </div>
              <button onClick={() => { setShowEventModal(false); setIsCreatingEvent(false); }} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-red-500 transition-all shadow-sm">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {isCreatingEvent ? (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <input
                    type="text" autoFocus placeholder="Event Title"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-[#1A1A4E]"
                    value={newEvenTitle} onChange={(e) => setNewEventTitle(e.target.value)}
                  />
                  <input
                    type="text" placeholder="Time (e.g. 10:00 AM)"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-[#1A1A4E]"
                    value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)}
                  />
                </div>
              ) : (
                eventsForModal.length > 0 ? eventsForModal.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100">
                    <div className={`w-2 h-10 rounded-full ${event.color === 'lime' ? 'bg-[#c2f575]' : event.color === 'indigo' ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-black text-[#1A1A4E]">{event.title}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{event.time}</p>
                    </div>
                  </div>
                )) : <div className="text-center py-10 italic text-gray-400">No events scheduled. Plan your success.</div>
              )}
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              {isCreatingEvent ? (
                <button onClick={handleSaveEvent} className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"><Save size={16} className="inline mr-2" /> Save Event</button>
              ) : (
                <button onClick={() => setIsCreatingEvent(true)} className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"><Plus size={16} className="inline mr-2" /> Add Event</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="text-5xl font-black text-[#1A1A4E] tracking-tighter">
          Greetings, {user?.name || 'Achiever'}
        </h1>
        <p className="text-gray-400 font-semibold text-lg max-w-2xl leading-relaxed">
          The future belongs to those who prepare. Manage your {role === UserRole.STUDENT ? 'learning path' : 'tutor workspace'} with surgical precision.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#e9ecef]/60 p-6 rounded-[3rem] flex flex-col justify-center min-h-[180px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 group">
            <div className="bg-white p-8 rounded-[2.5rem] flex flex-col items-center justify-center shadow-inner text-center border border-gray-50 group-hover:border-[#c2f575]/30 transition-colors">
              <p className="text-5xl font-black text-[#1A1A4E] mb-2 tracking-tighter leading-none">{stat.value}</p>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {activeSessions.length > 0 && (
        <div className="bg-[#1A1A4E] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 bg-[#c2f575] rounded-[2rem] flex items-center justify-center animate-pulse shadow-[0_0_40px_rgba(194,245,117,0.3)]">
                <Radio size={36} className="text-[#1A1A4E]" />
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter mb-1">Live Broadcast Active</h3>
                <p className="text-white/60 font-medium text-lg italic">
                  {activeSessions[0].title} is streaming now. Join the elite.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveLiveRoom(activeSessions[0])}
              className="px-12 py-6 bg-[#c2f575] text-[#1A1A4E] rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              Enter Room
            </button>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#c2f575]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
        <div className="xl:col-span-8 space-y-8">
          {upcomingLiveSessions.length > 0 ? (
            <div className="bg-white rounded-[4rem] p-12 border border-gray-100 shadow-xl overflow-hidden relative">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-3xl font-black text-[#1A1A4E] tracking-tighter flex items-center gap-5">
                  <Radio className="text-red-500 animate-pulse" /> Scheduled Curriculum
                </h3>
                <div className="flex items-center gap-2 px-5 py-2 bg-red-50 text-red-600 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{upcomingLiveSessions.length} Upcoming</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {upcomingLiveSessions.map((session, i) => (
                  <div key={i} className="p-10 bg-gray-50/50 rounded-[3rem] border border-gray-100 group hover:bg-white hover:shadow-2xl transition-all duration-700">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-gray-50">
                        <CalendarIcon size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Commencing At</p>
                        <p className="font-black text-[#1A1A4E] text-lg tracking-tight">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <h4 className="text-xl font-black text-[#1A1A4E] mb-8 leading-tight tracking-tighter group-hover:text-red-500 transition-colors">{session.title}</h4>
                    <button
                      disabled
                      className="w-full py-5 bg-white border border-gray-100 text-gray-300 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"
                    >
                      Access Code Locked
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[4rem] p-24 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-10 text-gray-200">
                <CalendarIcon size={48} />
              </div>
              <h3 className="text-3xl font-black text-[#1A1A4E] tracking-tighter mb-4">A Quiet Horizon</h3>
              <p className="text-gray-400 font-medium max-w-sm mx-auto leading-relaxed text-lg italic">
                No scheduled sessions found. Use this time to sharpen your skills or explore new zones.
              </p>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 space-y-8">
          <div className="bg-white rounded-[4rem] p-10 border border-gray-100 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-10 px-4">
              <span className="text-2xl font-black text-[#1A1A4E] tracking-tighter">{monthName} {year}</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2.5 bg-gray-50 hover:bg-[#c2f575] rounded-2xl text-[#1A1A4E] transition-all"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2.5 bg-gray-50 hover:bg-[#c2f575] rounded-2xl text-[#1A1A4E] transition-all"><ChevronRight size={20} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center mb-4">
              {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
                <div key={day} className="text-[10px] font-black text-gray-300 uppercase tracking-widest py-3">{day}</div>
              ))}
              {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="p-2" />)}
              {Array.from({ length: daysCount }, (_, i) => {
                const dayNum = i + 1;
                const isToday = isThisMonth && today.getDate() === dayNum;
                const hasEvent = meetingsData[dayNum] && meetingsData[dayNum].length > 0;

                return (
                  <div
                    key={dayNum}
                    onClick={() => handleDayClick(dayNum)}
                    className={`relative aspect-square flex flex-col items-center justify-center transition-all rounded-[1.25rem] m-1 cursor-pointer
                        ${isToday ? 'bg-[#c2f575] text-[#1A1A4E] shadow-[0_10px_30px_rgba(194,245,117,0.4)]' : 'text-gray-500 hover:bg-gray-50'}
                      `}
                  >
                    <span className="text-sm font-black">{dayNum}</span>
                    {hasEvent && !isToday && <div className="absolute bottom-2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                  </div>
                );
              })}
            </div>
            <div className="mt-10 p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-white rounded-xl text-[#c2f575] shadow-sm"><Zap size={18} fill="currentColor" /></div>
                <p className="text-[11px] font-black text-[#1A1A4E] uppercase tracking-widest">Growth Tip</p>
              </div>
              <p className="text-gray-400 text-sm font-medium leading-relaxed italic">
                Consistency is the language of mastery. Tag your daily goals on the calendar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

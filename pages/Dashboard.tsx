
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
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
  Radio
} from 'lucide-react';
import ClassroomStream from '../components/ClassroomStream';

const CONSULTATIONS_KEY = 'nunma_consultations';
const LIVE_SESSIONS_KEY = 'nunma_live_sessions';

const INITIAL_MEETINGS_DATA: Record<number | string, any[]> = {
  1: [{ id: 1, title: 'Jan 1st Kickoff', time: '09:00 AM', type: 'meeting', color: 'indigo', important: true }],
  15: [
    { id: 2, title: 'Mid-month Review', time: '11:00 AM', type: 'task', color: 'lime', important: false },
    { id: 3, title: 'Team Sync', time: '03:30 PM', type: 'meeting', color: 'indigo', important: true },
  ],
  24: [{ id: 4, title: 'Final Project Submission', time: '11:59 PM', type: 'task', color: 'red', important: true }],
  default: [
    { id: 101, title: 'Check Emails', time: '08:30 AM', type: 'task', color: 'gray', important: false },
    { id: 102, title: 'Daily Standup', time: '10:00 AM', type: 'meeting', color: 'indigo', important: true },
  ]
};

const Dashboard: React.FC<{ role: UserRole }> = ({ role }) => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalDate, setModalDate] = useState<number | null>(null);
  const [meetingsData, setMeetingsData] = useState(INITIAL_MEETINGS_DATA);
  const [bookedConsultations, setBookedConsultations] = useState<any[]>([]);
  
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);

  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEvenTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventIsImportant, setNewEventIsImportant] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const savedConsultations = localStorage.getItem(CONSULTATIONS_KEY);
      if (savedConsultations) setBookedConsultations(JSON.parse(savedConsultations));

      const savedLive = localStorage.getItem(LIVE_SESSIONS_KEY);
      if (savedLive) setLiveSessions(JSON.parse(savedLive));
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const stats = role === UserRole.STUDENT ? [
    { label: 'TOTAL ZONES', value: '0' },
    { label: 'UPCOMING LIVE', value: liveSessions.filter(s => s.status === 'scheduled').length },
    { label: 'COMPLETED', value: '0' },
    { label: 'IN PROGRESS', value: '0' },
  ] : [
    { label: 'TOTAL EARNINGS', value: `$${bookedConsultations.length * 150}` },
    { label: 'ACTIVE STUDENTS', value: bookedConsultations.length },
    { label: '1:1 BOOKINGS', value: bookedConsultations.length },
    { label: 'UPCOMING LIVE', value: liveSessions.filter(s => s.status === 'scheduled').length },
  ];

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

  const eventsForModal = modalDate ? (meetingsData[modalDate] || meetingsData['default']) : [];
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
                <p className="text-[10px] font-black text-[#c1e60d] uppercase tracking-[0.2em] mb-1">Agenda for</p>
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
                    <div className={`w-2 h-10 rounded-full ${event.color === 'lime' ? 'bg-[#c1e60d]' : event.color === 'indigo' ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-black text-[#1A1A4E]">{event.title}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{event.time}</p>
                    </div>
                  </div>
                )) : <div className="text-center py-10 italic text-gray-400">No events scheduled</div>
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
        <h1 className="text-4xl font-extrabold text-[#1A1A4E]">
          Hi, {user?.name || 'Achiever'}
        </h1>
        <p className="text-gray-400 font-medium text-sm">
          Track your journey, manage your {role === UserRole.STUDENT ? 'classes' : 'streams'}, and stay productive.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#e9ecef]/60 p-6 rounded-[2.5rem] flex flex-col justify-center min-h-[160px] hover:shadow-lg transition-all duration-300">
            <div className="bg-white p-8 rounded-[1.5rem] flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-center">
              <p className="text-4xl font-black text-[#1A1A4E] mb-2 leading-tight">{stat.value}</p>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {activeSessions.length > 0 && (
        <div className="bg-red-500 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                    <Radio size={32} className="text-white" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Live Session in Progress</h3>
                    <p className="text-white/80 font-medium text-sm mt-1">
                       {activeSessions[0].title} is currently live.
                    </p>
                 </div>
              </div>
              <button 
                onClick={() => setActiveLiveRoom(activeSessions[0])}
                className="px-8 py-4 bg-white text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-gray-100 transition-all active:scale-95"
              >
                 Join Broadcast
              </button>
           </div>
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Main Area (Consultations or Lives) */}
        <div className="xl:col-span-8 space-y-6">
          {(role === UserRole.TUTOR && bookedConsultations.length > 0) || (upcomingLiveSessions.length > 0) ? (
            <div className="space-y-6">
              {upcomingLiveSessions.length > 0 && (
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
                   <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-black text-[#1A1A4E] tracking-tighter flex items-center gap-4">
                         <Radio className="text-red-500" /> Scheduled Live Streams
                      </h3>
                      <span className="px-4 py-2 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                         {upcomingLiveSessions.length} Streams
                      </span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {upcomingLiveSessions.map((session, i) => (
                        <div key={i} className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 group">
                           <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm">
                                 <CalendarIcon size={24} />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Session Start</p>
                                 <p className="font-black text-[#1A1A4E]">{new Date(session.startTime).toLocaleString()}</p>
                              </div>
                           </div>
                           <h4 className="text-sm font-black text-indigo-900 mb-6">{session.title}</h4>
                           <button 
                            disabled
                            className="w-full py-4 bg-gray-200 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed"
                           >
                             Join Link Active Soon
                           </button>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {role === UserRole.TUTOR && bookedConsultations.length > 0 && (
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm">
                   <div className="flex items-center justify-between mb-10">
                      <h3 className="text-2xl font-black text-[#1A1A4E] tracking-tighter flex items-center gap-4">
                         <Video className="text-[#c1e60d]" /> Booked 1:1 Consultations
                      </h3>
                      <span className="px-4 py-2 bg-indigo-50 text-indigo-900 rounded-full text-[10px] font-black uppercase tracking-widest">
                         {bookedConsultations.length} Active Sessions
                      </span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {bookedConsultations.map((booking, i) => (
                        <div key={i} className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 hover:bg-white hover:shadow-xl transition-all duration-500 group">
                           <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-900 shadow-sm group-hover:bg-indigo-900 group-hover:text-white transition-all">
                                 <User size={24} />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Booking For</p>
                                 <p className="font-black text-indigo-900">Student Alpha {i + 1}</p>
                              </div>
                           </div>
                           <h4 className="text-sm font-black text-indigo-900 mb-4">{booking.title}</h4>
                           <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                              <div className="flex items-center gap-2 text-[#7cc142]">
                                 <CheckCircle size={14} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Paid & Confirmed</span>
                              </div>
                              <button className="text-indigo-900 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                                 Join Room <ArrowRight size={14} className="text-[#c1e60d]" />
                              </button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#e9ecef]/30 rounded-[2.5rem] p-1 border border-gray-100/50">
              <div className="bg-white rounded-[2rem] p-10 min-h-[400px] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                <div className="mb-6 flex flex-col items-center relative z-10">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <CalendarIcon size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-2xl font-black text-[#1A1A4E] mb-2">Upcoming Activities</h3>
                  <p className="text-gray-400 font-medium italic">No events or live sessions scheduled yet.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Calendar Area */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-[#e9ecef]/30 rounded-[2.5rem] p-1 border border-gray-100/50">
            <div className="bg-white rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8 px-2">
                <span className="text-xl font-black text-[#1A1A4E] tracking-tighter">{monthName} {year}</span>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1.5 hover:bg-gray-50 rounded-lg text-indigo-900 transition-colors"><ChevronLeft size={18}/></button>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1.5 hover:bg-gray-50 rounded-lg text-indigo-900 transition-colors"><ChevronRight size={18}/></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center mb-2">
                {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
                  <div key={day} className="text-[10px] font-black text-gray-300 uppercase tracking-widest py-2">{day}</div>
                ))}
                {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="p-2" />)}
                {Array.from({ length: daysCount }, (_, i) => {
                  const dayNum = i + 1;
                  const isToday = isThisMonth && today.getDate() === dayNum;
                  return (
                    <div 
                      key={dayNum} 
                      onClick={() => handleDayClick(dayNum)}
                      className={`relative text-xs py-3 font-black cursor-pointer flex flex-col items-center justify-center transition-all rounded-[0.85rem] m-0.5 ${isToday ? 'bg-[#c1e60d] text-[#1A1A4E]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span>{dayNum}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
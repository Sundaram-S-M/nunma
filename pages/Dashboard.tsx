
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  collection, query, where, onSnapshot, orderBy,
  getDocs, limit, doc, getDoc, addDoc, deleteDoc
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
import LiveSessionStatus from '../components/LiveSessionStatus';

import { Link } from 'react-router-dom';

const Dashboard: React.FC<{ role: UserRole }> = ({ role }) => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalDate, setModalDate] = useState<number | null>(null);
  const [meetingsData, setMeetingsData] = useState<Record<string, any[]>>({});

  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [myZones, setMyZones] = useState<any[]>([]);
  const [sessionsMap, setSessionsMap] = useState<Record<string, any[]>>({});

  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEvenTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventIsImportant, setNewEventIsImportant] = useState(false);

  // Clock Picker State
  const [showClockPicker, setShowClockPicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');
  const [clockMode, setClockMode] = useState<'hour' | 'minute'>('hour');

  // Profile Completion Logic
  const calculateProfileCompletion = () => {
    if (!user) return 0;
    const fields = ['name', 'email', 'location', 'bio', 'dob'];
    let filledCount = fields.filter(field => (user as any)[field] && (user as any)[field].length > 0).length;

    // Check if avatar is custom (not the default DiceBear URL)
    if (user.avatar && !user.avatar.includes('dicebear.com')) {
      filledCount++;
    }

    const totalFields = fields.length + 1; // +1 for avatar
    return Math.round((filledCount / totalFields) * 100);
  };

  const completionPercentage = calculateProfileCompletion();

  // 1. Fetch My Zones
  useEffect(() => {
    if (!user) return;
    const fetchZones = async () => {
      try {
        const zonesList: any[] = [];

        // A. Created Zones (Tutor)
        // Note: Use simple query without compound index requirements if possible
        // A. Created Zones (Tutor)
        if (role === UserRole.TUTOR) {
          const q = query(collection(db, 'zones'), where('createdBy', '==', user.uid));
          const snap = await getDocs(q);
          snap.forEach(d => zonesList.push({ id: d.id, ...d.data(), role: 'tutor' }));
        }

        // B. Enrolled Zones (Student)
        const enrollSnap = await getDocs(collection(db, `users/${user.uid}/enrollments`));
        const enrolledIds = enrollSnap.docs.map(d => d.data().zoneId);

        for (const zId of enrolledIds) {
          // Avoid duplicates if I created it and enrolled in it (unlikely but safe)
          if (!zonesList.find(z => z.id === zId)) {
            const zDoc = await getDoc(doc(db, 'zones', zId));
            if (zDoc.exists()) {
              zonesList.push({ id: zDoc.id, ...zDoc.data(), role: 'student' });
            }
          }
        }
        setMyZones(zonesList);

        // C. Calculate Basic Stats based on Zones
        let totalStudents = 0;
        let totalEarnings = 0; // Mock calculation or real if fields exist
        zonesList.forEach(z => {
          if (z.role === 'tutor') {
            // If we have a 'studentCount' field or similar. 
            // For now, allow 0 or mock.
            totalStudents += (z.studentCount || 0);
            totalEarnings += (parseFloat(z.price || '0') * (z.studentCount || 0));
          }
        });

        setStats([
          { label: 'Active Zones', value: zonesList.length },
          { label: 'Total Students', value: totalStudents },
          { label: 'Hours Streamed', value: '124' }, // Placeholder
          { label: 'Earnings', value: `$${totalEarnings}` }
        ]);

      } catch (e) {
        console.error("Error fetching my zones:", e);
      }
    };
    fetchZones();
  }, [user, role]);

  // 2. Listen to Sessions in My Zones
  useEffect(() => {
    if (myZones.length === 0) return;

    const unsubs: (() => void)[] = [];

    myZones.forEach(zone => {
      const q = query(collection(db, 'zones', zone.id, 'sessions'));
      const unsub = onSnapshot(q, (snap) => {
        const zoneSessions = snap.docs.map(d => ({
          id: d.id,
          zoneId: zone.id,
          zoneTitle: zone.title,
          ...d.data()
        }));

        setSessionsMap(prev => {
          const newMap = { ...prev, [zone.id]: zoneSessions };
          return newMap;
        });
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [myZones]);

  // 3. Flatten Sessions Map to Live/Scheduled
  useEffect(() => {
    const all = Object.values(sessionsMap).flat();
    setLiveSessions(all);
  }, [sessionsMap]);

  // 4. Listen to Personal Calendar Events (Firestore)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'calendar_events'));
    const unsub = onSnapshot(q, (snap) => {
      const data: Record<string, any[]> = {};
      snap.forEach(d => {
        const event = { docId: d.id, ...d.data() };
        const dKey = (event as any).dateKey;
        if (dKey) {
          if (!data[dKey]) data[dKey] = [];
          data[dKey].push(event);
        }
      });
      setMeetingsData(data);
    });
    return () => unsub();
  }, [user]);

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

  const handleSaveEvent = async () => {
    if (!newEvenTitle || !modalDate || !user) return;
    const timeString = newEventTime || `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
    const dateKey = `${year}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${modalDate.toString().padStart(2, '0')}`;

    const newEvent = {
      title: newEvenTitle,
      time: timeString,
      type: newEventIsImportant ? 'meeting' : 'task',
      color: newEventIsImportant ? 'indigo' : 'gray',
      important: newEventIsImportant,
      dateKey: dateKey,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'users', user.uid, 'calendar_events'), newEvent);
      setNewEventTitle('');
      setNewEventTime('');
      setNewEventIsImportant(false);
      setIsCreatingEvent(false);
      setShowClockPicker(false);
      setSelectedHour(12);
      setSelectedMinute(0);
      setSelectedPeriod('PM');
    } catch (e) {
      console.error("Error saving event:", e);
      alert("Failed to save event. Please try again.");
    }
  };

  const getSessionsForDay = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${year}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return liveSessions.filter(s => s.date === dateStr);
  };

  const dateKeyForModal = modalDate ? `${year}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${modalDate.toString().padStart(2, '0')}` : '';
  const daySessions = getSessionsForDay(modalDate);
  const eventsForModal = modalDate ? [
    ...(meetingsData[dateKeyForModal] || []),
    ...daySessions.map(s => ({
      id: s.id,
      title: s.title,
      time: s.time,
      type: 'live',
      color: s.status === 'live' ? 'lime' : 'indigo',
      isLive: true,
      session: s
    }))
  ] : [];
  const activeSessions = liveSessions.filter(s => s.status === 'live');
  const upcomingLiveSessions = liveSessions.filter(s => s.status === 'scheduled');

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 relative">
      {/* ... Live Room Overlay ... */}
      {activeLiveRoom && (
        <ClassroomStream
          sessionId={activeLiveRoom.id}
          zoneId={activeLiveRoom.zoneId}
          role={role === UserRole.TUTOR ? 'TUTOR' : 'STUDENT'}
          title={activeLiveRoom.title}
          onClose={() => setActiveLiveRoom(null)}
        />
      )}

      {/* ... Event Modal ... */}
      {showEventModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/30">
              <div>
                <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-[0.2em] mb-1">Agenda for</p>
                <h3 className="text-2xl font-black text-[#1A1A4E]">{monthName} {modalDate}, {year}</h3>
              </div>
              <button onClick={() => { setShowEventModal(false); setIsCreatingEvent(false); }} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-red-500 transition-all shadow-sm">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-4 min-h-[600px] max-h-[80vh] overflow-y-auto custom-scrollbar">
              {isCreatingEvent ? (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <input
                    type="text" autoFocus placeholder="Event Title"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-[#1A1A4E]"
                    value={newEvenTitle} onChange={(e) => setNewEventTitle(e.target.value)}
                  />

                  {/* Interactive Clock Picker */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowClockPicker(!showClockPicker)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-[#1A1A4E] text-left flex items-center justify-between hover:bg-gray-100 transition-all"
                    >
                      <span className={newEventTime || (selectedHour !== 12 || selectedMinute !== 0) ? 'text-[#1A1A4E]' : 'text-gray-400'}>
                        {newEventTime || `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`}
                      </span>
                      <Clock size={20} className="text-[#c2f575]" />
                    </button>

                    {showClockPicker && (
                      <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[3rem] shadow-2xl border border-gray-100 p-12 z-50 animate-in slide-in-from-top-4 duration-300">
                        {/* Clock Display */}
                        <div className="flex flex-col items-center mb-20 mt-6 relative">
                          <div className="relative w-80 h-80 bg-gradient-to-br from-[#1A1A4E] to-indigo-900 rounded-full shadow-2xl p-5">
                            {/* Clock Face */}
                            <div className="absolute inset-5 bg-white rounded-full flex items-center justify-center">
                              {/* Hour Markers */}
                              {Array.from({ length: 12 }, (_, i) => {
                                const angle = (i * 30 - 90) * (Math.PI / 180);
                                const radius = 85;
                                const x = 50 + radius * Math.cos(angle);
                                const y = 50 + radius * Math.sin(angle);
                                const number = clockMode === 'hour' ? (i === 0 ? 12 : i) : i * 5;
                                const isSelected = clockMode === 'hour' ? selectedHour === (i === 0 ? 12 : i) : selectedMinute === i * 5;

                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (clockMode === 'hour') {
                                        const newHour = i === 0 ? 12 : i;
                                        setSelectedHour(newHour);
                                        setClockMode('minute');
                                        // Optional: Update time string immediately if you want real-time feedback in input
                                        // setNewEventTime(`${newHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`);
                                      } else {
                                        const newMinute = i * 5;
                                        setSelectedMinute(newMinute);
                                        // Update time string immediately
                                        setNewEventTime(`${selectedHour}:${newMinute.toString().padStart(2, '0')} ${selectedPeriod}`);
                                      }
                                    }}
                                    className={`absolute w-12 h-12 rounded-full font-black text-base transition-all transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 ${isSelected
                                      ? 'bg-[#c2f575] text-[#1A1A4E] scale-110 shadow-lg'
                                      : 'bg-gray-50 text-gray-600 hover:bg-[#c2f575]/20 hover:scale-105'
                                      }`}
                                    style={{ left: `${x}%`, top: `${y}%` }}
                                  >
                                    {number}
                                  </button>
                                );
                              })}

                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                  <div className="text-4xl font-black text-[#1A1A4E] tracking-tight">
                                    {selectedHour}:{selectedMinute.toString().padStart(2, '0')}
                                  </div>
                                  <div className="text-sm font-black text-gray-400 uppercase tracking-widest mt-2">
                                    {clockMode === 'hour' ? 'Select Hour' : 'Select Minute'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* AM/PM Toggle & Actions */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex gap-2 bg-gray-50 rounded-2xl p-2">
                            <button
                              onClick={() => {
                                setSelectedPeriod('AM');
                                setNewEventTime(`${selectedHour}:${selectedMinute.toString().padStart(2, '0')} AM`);
                              }}
                              className={`flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${selectedPeriod === 'AM'
                                ? 'bg-[#1A1A4E] text-white shadow-lg'
                                : 'text-gray-400 hover:text-[#1A1A4E]'
                                }`}
                            >
                              AM
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPeriod('PM');
                                setNewEventTime(`${selectedHour}:${selectedMinute.toString().padStart(2, '0')} PM`);
                              }}
                              className={`flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${selectedPeriod === 'PM'
                                ? 'bg-[#1A1A4E] text-white shadow-lg'
                                : 'text-gray-400 hover:text-[#1A1A4E]'
                                }`}
                            >
                              PM
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setNewEventTime(`${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`);
                              setShowClockPicker(false);
                            }}
                            className="px-8 py-4 bg-[#c2f575] text-[#1A1A4E] rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventsForModal.length > 0 ? eventsForModal.map((event) => (
                    <div key={event.id} className="flex items-center gap-4 p-5 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 hover:bg-white transition-all group">
                      <div className={`w-2 h-12 rounded-full ${event.color === 'lime' ? 'bg-[#c2f575]' : event.color === 'indigo' ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-black text-[#1A1A4E]">{event.title}</p>
                          {event.isLive && (
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${event.session?.status === 'live' ? 'bg-red-500 text-white' : 'bg-indigo-900 text-[#c2f575]'}`}>
                              {event.session?.status}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{event.time} {event.session?.zoneTitle && `• ${event.session.zoneTitle}`}</p>
                      </div>
                      {event.isLive && (
                        <button
                          onClick={() => {
                            if (event.session?.status === 'live') {
                              setActiveLiveRoom(event.session);
                              setShowEventModal(false);
                            } else {
                              // Link to zone or show alert
                              alert(`Class starts at ${event.time}`);
                            }
                          }}
                          className={`p-3 rounded-xl transition-all ${event.session?.status === 'live' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-gray-100 text-gray-400'}`}
                        >
                          <Video size={18} />
                        </button>
                      )}
                    </div>
                  )) : <div className="text-center py-20 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200">
                      <Zap size={32} />
                    </div>
                    <p className="italic text-gray-400 font-medium">No events scheduled. Plan your success.</p>
                  </div>}
                </div>
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

      {completionPercentage < 100 && (
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-[#1A1A4E]">Profile Completion</h3>
              <span className="text-2xl font-black text-[#c2f575]">{completionPercentage}%</span>
            </div>
            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1A1A4E] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-gray-400 text-sm font-medium">
              Complete your profile to unlock full network access and verify your identity.
            </p>
          </div>
          <Link to="/settings/profile" className="px-8 py-4 bg-[#c2f575] text-[#1A1A4E] rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg whitespace-nowrap">
            Complete Profile
          </Link>
        </div>
      )}

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

      {/* MY ACTIVE ZONES (Student View) */}
      {role === UserRole.STUDENT && myZones.length > 0 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-[#1A1A4E] tracking-tighter flex items-center gap-4">
              <BookOpen className="text-[#c2f575]" /> My Active Zones
            </h2>
            <Link to="/classroom" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-900 transition-colors flex items-center gap-2">
              Explore All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myZones.map((zone) => (
              <div key={zone.id} className="bg-white rounded-[3.5rem] p-10 border border-gray-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-16 h-16 bg-gray-50 rounded-[1.75rem] flex items-center justify-center text-indigo-900 shadow-inner group-hover:bg-indigo-900 group-hover:text-[#c2f575] transition-all duration-500 overflow-hidden">
                    {zone.avatar ? <img src={zone.avatar} alt="" className="w-full h-full object-cover" /> : <Zap size={32} />}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black bg-[#c2f575] text-indigo-900 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                      {zone.level}
                    </span>
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-2">{zone.domain}</p>
                  </div>
                </div>

                <h3 className="text-2xl font-black text-[#1A1A4E] mb-6 tracking-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {zone.title}
                </h3>

                <Link
                  to={`/zone/${zone.id}`}
                  className="w-full py-5 bg-indigo-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-indigo-900/10"
                >
                  Resume Stream <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="absolute top-0 right-0 w-24 h-24 bg-[#c2f575]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              </div>
            ))}
          </div>
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
                    <div className="space-y-6">
                      <LiveSessionStatus
                        status="scheduled"
                        startTime={session.startTime}
                        className="bg-white"
                      />
                      <h4 className="text-xl font-black text-[#1A1A4E] leading-tight tracking-tighter group-hover:text-indigo-600 transition-colors">{session.title}</h4>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{session.zoneTitle}</p>
                    </div>
                    <button
                      disabled
                      className="w-full mt-8 py-5 bg-white border border-gray-100 text-gray-300 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3"
                    >
                      Access Code Locked
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[4rem] p-24 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
              {activeSessions.length > 0 ? (
                <div className="w-full">
                  <div className="bg-[#1A1A4E] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col items-center justify-center gap-8 text-center">
                      <LiveSessionStatus
                        status="live"
                        className="bg-red-500/10 border-red-500/20 text-[#c2f575]"
                      />
                      <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Live Broadcast Active</h3>
                        <p className="text-white/60 font-medium text-lg italic">
                          {activeSessions[0].title} is streaming now in {activeSessions[0].zoneTitle}.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveLiveRoom(activeSessions[0])}
                        className="px-12 py-6 bg-[#c2f575] text-[#1A1A4E] rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
                      >
                        Enter Room
                      </button>
                    </div>
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#c2f575]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-[#c2f575]/10 transition-all duration-1000"></div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-10 text-gray-200">
                    <CalendarIcon size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-[#1A1A4E] tracking-tighter mb-4">A Quiet Horizon</h3>
                  <p className="text-gray-400 font-medium max-w-sm mx-auto leading-relaxed text-lg italic">
                    No scheduled sessions found. Use this time to sharpen your skills or explore new zones.
                  </p>
                </>
              )}
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
                const dateKey = `${year}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                const isToday = isThisMonth && today.getDate() === dayNum;
                const sessions = getSessionsForDay(dayNum);
                const hasEvent = (meetingsData[dateKey] && meetingsData[dateKey].length > 0) || sessions.length > 0;
                const hasLive = sessions.some(s => s.status === 'live');

                return (
                  <div
                    key={dayNum}
                    onClick={() => handleDayClick(dayNum)}
                    className={`relative aspect-square flex flex-col items-center justify-center transition-all rounded-[1.25rem] m-1 cursor-pointer
                        ${isToday ? 'bg-[#c2f575] text-[#1A1A4E] shadow-[0_10px_30px_rgba(194,245,117,0.4)]' : 'text-gray-500 hover:bg-gray-50'}
                      `}
                  >
                    <span className="text-sm font-black">{dayNum}</span>
                    {hasEvent && !isToday && (
                      <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${hasLive ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`} />
                    )}
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
    </div >
  );
};

export default Dashboard;

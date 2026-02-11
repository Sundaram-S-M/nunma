
import React, { useState, useEffect } from 'react';
import {
   Award,
   Download,
   Share2,
   MonitorPlay,
   Zap,
   Radio,
   X,
   Trophy,
   Star,
   ArrowRight,
   Calendar,
   Video
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClassroomStream from '../components/ClassroomStream';

import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

const Classroom: React.FC = () => {
   const navigate = useNavigate();
   const [enrolledZones, setEnrolledZones] = useState<any[]>([]);
   const [liveSessions, setLiveSessions] = useState<any[]>([]);
   const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);
   const [showLeaderboard, setShowLeaderboard] = useState(false);

   const { user } = useAuth();
   const [enrollmentIds, setEnrollmentIds] = useState<string[]>([]);

   useEffect(() => {
      if (!user) return;

      // 1. Fetch Enrollments
      const fetchEnrollments = async () => {
         const snap = await getDocs(collection(db, `users/${user.uid}/enrollments`));
         const ids = snap.docs.map(d => d.data().zoneId);
         setEnrollmentIds(ids);

         // Fetch Zone Details
         const zones: any[] = [];
         for (const id of ids) {
            const zDoc = await getDoc(doc(db, 'zones', id));
            if (zDoc.exists()) {
               zones.push({ id: zDoc.id, ...zDoc.data() });
            }
         }
         setEnrolledZones(zones);
      };
      fetchEnrollments();
   }, [user]);

   // 2. Listen for Live Sessions in Enrolled Zones
   useEffect(() => {
      if (enrollmentIds.length === 0) return;

      const unsubs: (() => void)[] = [];

      enrollmentIds.forEach(zId => {
         const q = query(collection(db, 'zones', zId, 'sessions'));
         const un = onSnapshot(q, (snap) => {
            const sessions = snap.docs.map(d => ({ id: d.id, zoneId: zId, ...d.data() }));
            setLiveSessions(prev => {
               // Remove old for this zone
               const others = prev.filter(s => s.zoneId !== zId);
               return [...others, ...sessions];
            });
         });
         unsubs.push(un);
      });

      return () => unsubs.forEach(u => u());
   }, [enrollmentIds]);

   const topStudents = [
      { name: 'Sachin Sundar', xp: '15,400', rank: 1, avatar: 'https://picsum.photos/seed/s1/40/40' },
      { name: 'Rahul K', xp: '14,200', rank: 2, avatar: 'https://picsum.photos/seed/s2/40/40' },
      { name: 'Priya M', xp: '13,900', rank: 3, avatar: 'https://picsum.photos/seed/s3/40/40' },
      { name: 'Ananya R', xp: '12,400', rank: 4, avatar: 'https://picsum.photos/seed/s4/40/40', isMe: true },
      { name: 'Arjun P', xp: '11,800', rank: 5, avatar: 'https://picsum.photos/seed/s5/40/40' },
   ];

   return (
      <div className="space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-20 pr-10">

         {/* Live Room Overlay */}
         {activeLiveRoom && (
            <ClassroomStream
               sessionId={activeLiveRoom.id}
               role="STUDENT"
               title={activeLiveRoom.title}
               onClose={() => setActiveLiveRoom(null)}
            />
         )}

         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
               <h1 className="text-6xl font-black text-[#1A1A4E] mb-3 tracking-tighter">My Classroom</h1>
               <p className="text-gray-400 font-medium text-xl">Your professional growth hub.</p>
            </div>
            <div className="bg-[#c2f575] px-8 py-4 rounded-[2rem] shadow-xl shadow-[#c2f575]/20 flex items-center gap-4 border-4 border-white">
               <div className="w-12 h-12 rounded-2xl bg-indigo-900 flex items-center justify-center text-white">
                  <Zap size={24} fill="#c2f575" className="text-[#c2f575]" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-indigo-900/40 uppercase tracking-[0.2em]">Active Streams</p>
                  <p className="text-lg font-black text-indigo-900">{enrolledZones.length} Zones</p>
               </div>
            </div>
         </div>

         {liveSessions.length > 0 && (
            <div className="bg-red-50/30 border border-red-100 rounded-[3rem] p-8 mb-8">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white">
                        <Radio size={24} className="animate-pulse" />
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-red-600">Live Sessions Now</h3>
                        <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Connect to your real-time classes</p>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveSessions.filter(s => s.status === 'live' || s.status === 'scheduled').map(session => (
                     <div key={session.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100 flex flex-col justify-between group">
                        <div>
                           <h4 className="font-black text-indigo-900 mb-1 group-hover:text-red-500 transition-colors">{session.title}</h4>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Starts: {new Date(session.startTime).toLocaleTimeString()}</p>
                        </div>
                        {session.status === 'live' ? (
                           <button
                              onClick={() => setActiveLiveRoom(session)}
                              className="w-full py-4 bg-red-500 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/10 mt-4 animate-pulse"
                           >
                              Join Live Classroom
                           </button>
                        ) : (
                           <button
                              disabled
                              className="w-full py-4 bg-gray-100 text-gray-400 rounded-xl font-black uppercase text-[9px] tracking-widest mt-4 cursor-not-allowed"
                           >
                              Scheduled
                           </button>
                        )}
                     </div>
                  ))}
               </div>
            </div>
         )}

         {showLeaderboard && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
               <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                     <div>
                        <h3 className="text-2xl font-black text-indigo-900">XP Leaderboard</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Community Standings</p>
                     </div>
                     <button onClick={() => setShowLeaderboard(false)} className="p-3 text-gray-400 hover:text-red-500"><X size={24} /></button>
                  </div>
                  <div className="p-10 space-y-4">
                     {topStudents.map(student => (
                        <div key={student.rank} className={`p-5 rounded-2xl flex items-center justify-between ${student.isMe ? 'bg-[#c2f575]/20 border-2 border-[#c2f575]' : 'bg-gray-50 border border-gray-100'}`}>
                           <div className="flex items-center gap-4">
                              <span className="text-xs font-black text-gray-400 w-4">#{student.rank}</span>
                              <img src={student.avatar} className="w-10 h-10 rounded-xl" alt="" />
                              <div>
                                 <p className="text-sm font-black text-indigo-900">{student.name} {student.isMe && '(You)'}</p>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase">{student.xp} XP</p>
                              </div>
                           </div>
                           {student.rank <= 3 && <Trophy size={18} className={student.rank === 1 ? 'text-yellow-500' : student.rank === 2 ? 'text-gray-400' : 'text-orange-500'} />}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}

         <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
            <div className="xl:col-span-8 space-y-10">
               <div className="bg-white rounded-[4rem] p-14 border border-gray-100 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-center mb-14">
                     <h3 className="text-3xl font-black text-[#1A1A4E] tracking-tighter flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-900">
                           <MonitorPlay size={24} />
                        </div>
                        Enrolled Learning Zones
                     </h3>
                     <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#1A1A4E]">
                        View All Streams
                     </button>
                  </div>

                  {enrolledZones.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {enrolledZones.map(zone => (
                           <div
                              key={zone.id}
                              onClick={() => navigate(`/classroom/zone/${zone.id}`)}
                              className="group bg-gray-50/50 rounded-[3rem] border border-gray-100 p-8 hover:bg-white hover:shadow-2xl hover:border-[#c2f575] transition-all duration-700 cursor-pointer"
                           >
                              <div className="h-48 rounded-[2rem] overflow-hidden mb-8 relative shadow-lg">
                                 <img src={zone.image} alt={zone.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                 <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black text-indigo-900 flex items-center gap-1">
                                    <Star size={12} fill="#c2f575" className="text-[#c2f575]" /> {zone.rating}
                                 </div>
                              </div>
                              <div>
                                 <h4 className="text-2xl font-black text-[#1A1A4E] group-hover:text-indigo-600 transition-colors mb-2">{zone.title}</h4>
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">By {zone.tutorName}</p>
                              </div>
                              <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-100">
                                 <span className="text-[9px] font-black text-indigo-900/40 uppercase tracking-[0.2em]">{zone.level} • {zone.domain}</span>
                                 <div className="p-4 bg-indigo-900 rounded-2xl shadow-xl shadow-indigo-900/10 text-white group-hover:bg-[#c2f575] group-hover:text-indigo-900 transition-all active:scale-90">
                                    <ArrowRight size={20} />
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="flex flex-col items-center justify-center py-24 text-center">
                        <MonitorPlay size={64} className="mb-6 opacity-10" />
                        <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No active zones in progress</p>
                     </div>
                  )}
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#c2f575]/5 rounded-full blur-3xl"></div>
               </div>

               <div className="bg-[#1A1A4E] rounded-[4rem] p-14 text-white border border-white/5 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-14 relative z-10">
                     <div className="flex items-center gap-5">
                        <Award size={32} className="text-[#c2f575]" />
                        <h3 className="text-3xl font-black tracking-tighter">Proof of Work Gallery</h3>
                     </div>
                     <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-[#c2f575] uppercase tracking-[0.2em] transition-all">View Full Portfolio</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                     <div className="aspect-[4/3] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center gap-5 text-white/20 hover:border-white/20 transition-all cursor-pointer">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                           <Award size={36} />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest">New Credential Awaiting</p>
                     </div>
                     <div className="aspect-[4/3] bg-white/5 border border-white/10 rounded-[3rem] p-10 flex flex-col justify-between group-hover:bg-white/10 transition-all relative overflow-hidden">
                        <div className="flex justify-between items-start">
                           <div className="w-16 h-16 bg-[#c2f575] text-indigo-900 rounded-3xl flex items-center justify-center shadow-2xl shadow-[#c2f575]/20">
                              <Award size={32} />
                           </div>
                           <span className="text-[10px] font-black bg-white/10 px-4 py-2 rounded-xl uppercase tracking-widest">Mastery</span>
                        </div>
                        <div>
                           <h4 className="text-2xl font-black mb-1">Advanced Product Lifecycle</h4>
                           <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest">Issued: Dec 20, 2025</p>
                        </div>
                        <div className="flex gap-4">
                           <button className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                              <Download size={16} /> Save
                           </button>
                           <button className="flex-1 py-4 bg-[#c2f575] text-indigo-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg">
                              <Share2 size={16} /> Profile
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="xl:col-span-4 space-y-10">
               <div className="bg-[#1A1A4E] rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-10 relative z-10">
                     <h3 className="text-2xl font-black tracking-tighter">My Mentors</h3>
                     <button className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest px-4 py-2 bg-white/5 rounded-xl">Search</button>
                  </div>
                  <div className="space-y-4 relative z-10">
                     <div className="flex items-center gap-5 p-6 bg-white/5 border border-white/5 rounded-[2.5rem] hover:bg-white/10 transition-all cursor-pointer">
                        <div className="relative">
                           <img src="https://picsum.photos/seed/sundaram/120/120" className="w-16 h-16 rounded-2xl object-cover shadow-2xl" alt="" />
                           <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-[#7cc142] border-[4px] border-indigo-900 rounded-full shadow-lg"></div>
                        </div>
                        <div>
                           <p className="text-base font-black">Sundaram S M</p>
                           <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest mt-1">Lead Product Architect</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-white rounded-[3.5rem] p-10 border border-gray-100 shadow-xl relative overflow-hidden group">
                  <div className="flex items-center gap-5 mb-10">
                     <div className="w-14 h-14 bg-indigo-50 text-indigo-900 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                        <Calendar size={28} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-[#1A1A4E] tracking-tighter">Milestones</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Next 48 Hours</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col gap-4 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                           <span className="px-3 py-1 bg-red-50 text-red-500 rounded-full text-[9px] font-black uppercase">Live Session</span>
                           <span className="text-[10px] font-black text-gray-400">TODAY, 6 PM</span>
                        </div>
                        <h4 className="font-black text-indigo-900 text-sm">Agile Sprint Strategy with Team</h4>
                        <button className="w-full py-3 bg-indigo-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Remind Me</button>
                     </div>

                     <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col gap-4 hover:shadow-md transition-all opacity-60">
                        <div className="flex items-center justify-between">
                           <span className="px-3 py-1 bg-indigo-50 text-indigo-900 rounded-full text-[9px] font-black uppercase">Exam</span>
                           <span className="text-[10px] font-black text-gray-400">TOMORROW</span>
                        </div>
                        <h4 className="font-black text-indigo-900 text-sm">Product Discovery Quiz</h4>
                     </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-gray-100 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Star size={20} fill="#c2f575" className="text-[#c2f575]" />
                        <span className="text-sm font-black text-indigo-900">1,240 XP</span>
                     </div>
                     <button
                        onClick={() => setShowLeaderboard(true)}
                        className="text-[10px] font-black text-indigo-900 bg-[#c2f575] px-6 py-3 rounded-2xl uppercase tracking-widest shadow-lg shadow-[#c2f575]/20 active:scale-95 transition-all"
                     >
                        Leaderboard
                     </button>
                  </div>
               </div>

               <div className="bg-indigo-900 rounded-[3.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                  <div className="relative z-10">
                     <Trophy size={56} className="text-[#c2f575] mb-8" />
                     <h3 className="text-3xl font-black mb-4 tracking-tighter leading-tight">Hard-Earned <br />Achievements</h3>
                     <p className="text-indigo-200/70 text-sm leading-relaxed mb-10">Verify your hard-earned credentials and share them with your professional network.</p>
                     <button className="w-full py-5 bg-[#c2f575] text-indigo-900 rounded-3xl font-black uppercase text-[11px] tracking-[0.25em] shadow-xl hover:brightness-110 active:scale-95 transition-all border-4 border-white/10">
                        View My Certificates
                     </button>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-white/5 rounded-full blur-3xl"></div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Classroom;

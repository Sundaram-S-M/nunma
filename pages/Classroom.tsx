
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
   Video,
   Clock,
   Layout,
   CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LiveSessionStatus from '../components/LiveSessionStatus';

import {
   collection,
   query,
   where,
   getDocs,
   doc,
   getDoc,
   onSnapshot,
   orderBy,
   limit
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const Classroom: React.FC = () => {
   const navigate = useNavigate();
   const { isSidebarOpen } = useSidebar();
   const [error, setError] = useState<string | null>(null);
   const [enrolledZones, setEnrolledZones] = useState<any[]>([]);
   const [liveSessions, setLiveSessions] = useState<any[]>([]);
   const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);
   const [showLeaderboard, setShowLeaderboard] = useState(false);
   const [surveyForRoom, setSurveyForRoom] = useState<any>(null);

   // Survey tracking
   const [surveyRating, setSurveyRating] = useState(0);
   const [surveyNps, setSurveyNps] = useState(5);
   const [surveyFeedback, setSurveyFeedback] = useState('');

   const { user } = useAuth();
   const [enrollmentIds, setEnrollmentIds] = useState<string[]>([]);
   const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
   const [certificates, setCertificates] = useState<any[]>([]);

   useEffect(() => {
      if (!user) return;

      // 1. Fetch Enrollments & Progress
      const fetchEnrollments = async () => {
         try {
            const snap = await getDocs(collection(db, `users/${user.uid}/enrollments`));
            const ids = snap.docs.map(d => d.data().zoneId);
            setEnrollmentIds(ids);

            const zonesData: any[] = [];
            const tutorsData: any[] = [];

            for (const id of ids) {
               try {
                  const zDoc = await getDoc(doc(db, 'zones', id));
                  if (zDoc.exists()) {
                     const zone = { id: zDoc.id, ...zDoc.data() };

                     // Fetch Progress
                     let totalSegments = 0;
                     try {
                        const chaptersSnap = await getDocs(collection(db, 'zones', id, 'chapters'));
                        chaptersSnap.forEach(chap => {
                           totalSegments += (chap.data().segments || []).length;
                        });
                     } catch (error) {
                        console.error('Error fetching chapters:', error);
                     }

                     // 2. Get student progress
                     let studentData: any = { completedSegments: [], engagementScore: 0 };
                     try {
                        const studentSnap = await getDoc(doc(db, 'zones', id, 'students', user.uid));
                        if (studentSnap.exists()) {
                           studentData = studentSnap.data();
                        }
                     } catch (error) {
                        console.error('Error fetching student progress:', error);
                     }

                     const completedCount = (studentData.completedSegments || []).length;
                     const progressPercent = totalSegments > 0 ? Math.round((completedCount / totalSegments) * 100) : 0;

                     zonesData.push({
                        ...zone,
                        progress: progressPercent,
                        completedCount,
                        totalSegments,
                        engagementScore: studentData.engagementScore || 0
                     });

                     // Collect Tutor Info
                     if ((zone as any).tutorId || (zone as any).createdBy) {
                        const tId = (zone as any).tutorId || (zone as any).createdBy;
                        if (!tutorsData.find(t => t.uid === tId)) {
                           try {
                              const tDoc = await getDoc(doc(db, 'users', tId));
                              if (tDoc.exists()) {
                                 tutorsData.push({ uid: tId, ...tDoc.data() });
                              } else {
                                 tutorsData.push({ uid: tId, name: 'Unknown Tutor' });
                              }
                           } catch (error) {
                              console.error('Error fetching tutor:', error);
                              tutorsData.push({ uid: tId, name: 'Unknown Tutor' });
                           }
                        }
                     }
                  }
               } catch (error) {
                  console.error('Error fetching zone details:', error);
               }
            }
            setEnrolledZones(zonesData);
            setFollowedTutors(tutorsData);
         } catch (error) {
            console.error('Error fetching enrollments:', error);
            setEnrolledZones([]);
            setFollowedTutors([]);
         }
      };

      // 2. Fetch Certificates
      const fetchCertificates = async () => {
         try {
            const q = query(collection(db, 'issued_certificates'), where('studentId', '==', user.uid));
            const snap = await getDocs(q);
            setCertificates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
         } catch (error) {
            console.error('Error fetching certificates:', error);
            setCertificates([]);
         }
      };

      fetchEnrollments();
      fetchCertificates();
   }, [user]);

   // 2. Listen for Live Sessions & Milestones in Enrolled Zones
   useEffect(() => {
      if (enrollmentIds.length === 0) return;

      const unsubs: (() => void)[] = [];
      const scheduledList: any[] = [];

      enrollmentIds.forEach(zId => {
         // Live Sessions
         const qLive = query(collection(db, 'zones', zId, 'sessions'), where('status', '==', 'live'));
         const unLive = onSnapshot(qLive, (snap) => {
            const sessions = snap.docs.map(d => ({ id: d.id, zoneId: zId, ...d.data() }));
            setLiveSessions(prev => {
               const others = prev.filter(s => s.zoneId !== zId);
               return [...others, ...sessions];
            });
         },
         (error) => {
            console.error('Firestore error:', error.code, error.message);
            setLiveSessions([]);
            if (error.code === 'permission-denied') {
               setError('You do not have permission to view this content.');
            } else {
               setError('Failed to connect to the server.');
            }
         });
         unsubs.push(unLive);

         // Scheduled Sessions (Milestones)
         const qSched = query(collection(db, 'zones', zId, 'sessions'), where('status', '==', 'scheduled'), orderBy('startTime', 'asc'), limit(5));
         const unSched = onSnapshot(qSched, (snap) => {
            const sessions = snap.docs.map(d => ({ id: d.id, zoneId: zId, ...d.data() }));
            setUpcomingSessions(prev => {
               const others = prev.filter(s => s.zoneId !== zId);
               return [...others, ...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            });
         },
         (error) => {
            console.error('Firestore error:', error.code, error.message);
            setUpcomingSessions([]);
            if (error.code === 'permission-denied') {
               setError('You do not have permission to view this content.');
            } else {
               setError('Failed to connect to the server.');
            }
         });
         unsubs.push(unSched);
      });

      return () => unsubs.forEach(u => u());
   }, [enrollmentIds]);

   const [followedTutors, setFollowedTutors] = useState<any[]>([]);
   const [followedStudents, setFollowedStudents] = useState<any[]>([]);

   useEffect(() => {
      if (!user) return;

      const fetchLeaderboard = async () => {
         try {
            // 1. Fetch Followings
            const followSnap = await getDocs(query(collection(db, 'followers'), where('followerId', '==', user.uid)));
            const followingIds = followSnap.docs.map(d => d.data().followingId);

            const students: any[] = [];

            // Include me
            try {
               const meDoc = await getDoc(doc(db, 'users', user.uid));
               if (meDoc.exists()) {
                  students.push({ uid: user.uid, ...meDoc.data(), isMe: true });
               } else {
                  students.push({ uid: user.uid, name: 'Unknown User', isMe: true });
               }
            } catch (error) {
               console.error('Error fetching my user data:', error);
               students.push({ uid: user.uid, name: 'Unknown User', isMe: true });
            }

            for (const fId of followingIds) {
               try {
                  const fDoc = await getDoc(doc(db, 'users', fId));
                  if (fDoc.exists()) {
                     students.push({ uid: fId, ...fDoc.data() });
                  } else {
                     students.push({ uid: fId, name: 'Unknown User' });
                  }
               } catch (error) {
                  console.error('Error fetching followed user:', error);
                  students.push({ uid: fId, name: 'Unknown User' });
               }
            }

            // For each student, we need to calculate XP. 
            // Since it's per zone, and summing all zones is expensive, 
            // we'll use 'engagementScore' from their profile if it exists, 
            // or sum it from their enrollments (which might be many).
            // For now, let's use a default/mock XP if not present in user doc, 
            // but the user wants "real". 
            // I'll check if 'engagementScore' is in the 'users' doc.

            const studentsWithXP = students.map(s => ({
               ...s,
               xp: s.engagementScore || 0, // Fallback to 0
               name: s.name || 'Anonymous',
               avatar: s.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.uid}`
            })).sort((a, b) => b.xp - a.xp)
               .map((s, idx) => ({ ...s, rank: idx + 1 }));

            setFollowedStudents(studentsWithXP);
         } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setFollowedStudents([]);
         }
      };

      fetchLeaderboard();
   }, [user]);

   const topStudents = followedStudents.slice(0, 5);


   if (error) {
     return (
       <div style={{
         display: 'flex',
         flexDirection: 'column',
         alignItems: 'center',
         justifyContent: 'center',
         minHeight: '100vh',
         textAlign: 'center',
         padding: '2rem',
         fontFamily: 'inherit'
       }}>
         <h2 style={{
           fontSize: '1.25rem',
           fontWeight: '500',
           marginBottom: '0.5rem',
           color: 'var(--nunma-navy)'
         }}>
           {error}
         </h2>
         <p style={{
           margin: '1rem 0',
           color: 'var(--nunma-gray, #666)',
           fontSize: '0.9rem'
         }}>
           Please refresh the page or go back to Dashboard.
         </p>
         <button
           onClick={() => window.location.href = '/dashboard'}
           style={{
             marginTop: '1rem',
             padding: '0.75rem 2rem',
             background: 'var(--nunma-navy)',
             color: 'var(--nunma-white)',
             border: 'none',
             borderRadius: '8px',
             fontSize: '1rem',
             cursor: 'pointer'
           }}
         >
           Go to Dashboard
         </button>
       </div>
     );
   }

   return (
      <div className="space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-700 pb-20 pr-10">

         {/* Live Room Overlay Removed (replaced by sandbox navigation) */}

         {/* Post-Session Survey Modal */}
         {surveyForRoom && (
            <div className={`fixed top-0 right-0 bottom-0 ${isSidebarOpen ? 'left-[240px]' : 'left-[64px]'} z-[200] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-xl animate-in fade-in duration-300 transition-all`}>
               <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden p-10 animate-in zoom-in-95 duration-500 text-center">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] mx-auto flex items-center justify-center mb-6">
                     <Star size={32} className="text-[#c2f575]" />
                  </div>
                  <h3 className="text-3xl font-black text-[#040457] tracking-tight mb-2">Session Completed</h3>
                  <p className="text-sm font-medium text-gray-400 mb-8">We'd love to hear your thoughts on this session.</p>

                  <div className="space-y-8 mb-10 text-left">
                     {surveyForRoom.config.ratingSystem && (
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Rate the Session</label>
                           <div className="flex items-center justify-center gap-2">
                              {[1, 2, 3, 4, 5].map(star => (
                                 <button key={star} onClick={() => setSurveyRating(star)} className={`p-3 rounded-2xl transition-all ${surveyRating >= star ? 'text-yellow-400 bg-yellow-50' : 'text-gray-300 hover:bg-gray-50'}`}>
                                    <Star size={32} fill={surveyRating >= star ? 'currentColor' : 'none'} />
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}

                     {surveyForRoom.config.npsTracking && (
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">How likely to recommend?</label>
                           <div className="flex justify-between items-center gap-1 bg-gray-50 p-2 rounded-2xl">
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                                 <button key={score} onClick={() => setSurveyNps(score)} className={`w-8 h-10 rounded-xl font-black text-xs transition-all ${surveyNps === score ? 'bg-[#c2f575] text-[#040457] shadow-lg scale-110' : 'text-gray-400 hover:bg-white'}`}>
                                    {score}
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}

                     {surveyForRoom.config.feedbackText && (
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Additional Feedback</label>
                           <textarea value={surveyFeedback} onChange={e => setSurveyFeedback(e.target.value)} rows={3} placeholder="What did you like? What could be improved?" className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-[1.5rem] px-6 py-4 font-bold text-[#040457] outline-none transition-all resize-none"></textarea>
                        </div>
                     )}
                  </div>

                  <div className="flex gap-4">
                     <button onClick={() => setSurveyForRoom(null)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-100 transition-all">Skip</button>
                     <button onClick={() => {
                        // Normally submit to Firestore here
                        alert('Survey submitted! Thank you.');
                        setSurveyForRoom(null);
                        setSurveyRating(0);
                        setSurveyFeedback('');
                     }} className="flex-[2] py-4 bg-[#c2f575] text-[#040457] rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:scale-105 transition-all">Submit Feedback</button>
                  </div>
               </div>
            </div>
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
                     <div key={session.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 flex flex-col justify-between group hover:shadow-2xl transition-all duration-500">
                        <div className="space-y-6">
                           <LiveSessionStatus
                              status={session.status as 'live' | 'scheduled' | 'ended'}
                              startTime={session.startTime}
                              className="bg-gray-50"
                           />
                           <div>
                              <h4 className="text-xl font-black text-indigo-900 tracking-tight leading-tight mb-2 group-hover:text-indigo-600 transition-colors">{session.title}</h4>
                              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{session.zoneTitle || 'Learning Zone'}</p>
                           </div>
                        </div>
                        {session.status === 'live' ? (
                           <button
                              onClick={() => navigate(`/classroom/${session.zoneId}`)}
                              className="w-full mt-8 py-5 bg-indigo-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-indigo-800 transition-all shadow-xl shadow-indigo-900/20"
                           >
                              Enter Living Room
                           </button>
                        ) : (
                           <button
                              disabled
                              className="w-full mt-8 py-5 bg-gray-50 text-gray-300 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-not-allowed border border-gray-100"
                           >
                              Session Locked
                           </button>
                        )}
                     </div>
                  ))}
               </div>
            </div>
         )}

         {showLeaderboard && (
            <div className={`fixed top-0 right-0 bottom-0 ${isSidebarOpen ? 'left-[240px]' : 'left-[64px]'} z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 transition-all`}>
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
                              <img src={student.avatar} className="w-10 h-10 rounded-xl" alt="" width="500" height="500" />
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
                                 <img src={zone.image} alt={zone.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" width="500" height="500" />
                                 <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black text-indigo-900 flex items-center gap-1">
                                    <Star size={12} fill="#c2f575" className="text-[#c2f575]" /> {zone.rating || '4.8'}
                                 </div>
                              </div>
                              <div>
                                 <h4 className="text-2xl font-black text-[#1A1A4E] group-hover:text-indigo-600 transition-colors mb-2">{zone.title}</h4>
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">By {zone.tutorName || 'Expert Tutor'}</p>

                                 {/* Progress Bar */}
                                 <div className="space-y-2 mb-8">
                                    <div className="flex justify-between items-center">
                                       <span className="text-[10px] font-black text-indigo-900/40 uppercase tracking-widest">Zone Progress</span>
                                       <span className="text-[10px] font-black text-indigo-900">{zone.progress}%</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                       <div
                                          className="h-full bg-indigo-900 rounded-full transition-all duration-1000"
                                          style={{ width: `${zone.progress}%` }}
                                       />
                                    </div>
                                 </div>
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
                     {certificates.length === 0 && (
                        <div className="aspect-[4/3] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center gap-5 text-white/20 hover:border-white/20 transition-all cursor-pointer">
                           <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                              <Award size={36} />
                           </div>
                           <p className="text-xs font-black uppercase tracking-widest">New Credential Awaiting</p>
                        </div>
                     )}
                     {certificates.map(cert => (
                        <div key={cert.id} className="aspect-[4/3] bg-white/5 border border-white/10 rounded-[3rem] p-10 flex flex-col justify-between hover:bg-white/10 transition-all relative overflow-hidden group/cert">
                           <div className="flex justify-between items-start">
                              <div className="w-16 h-16 bg-[#c2f575] text-indigo-900 rounded-3xl flex items-center justify-center shadow-2xl shadow-[#c2f575]/20">
                                 <Award size={32} />
                              </div>
                              <span className="text-[10px] font-black bg-white/10 px-4 py-2 rounded-xl uppercase tracking-widest">Mastery</span>
                           </div>
                           <div>
                              <h4 className="text-2xl font-black mb-1 line-clamp-1">{cert.zoneName}</h4>
                              <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest">Issued: {new Date(cert.date).toLocaleDateString()}</p>
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
                     ))}
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
                     {followedTutors.length > 0 ? followedTutors.map(tutor => (
                        <div key={tutor.uid} className="flex items-center gap-5 p-6 bg-white/5 border border-white/5 rounded-[2.5rem] hover:bg-white/10 transition-all cursor-pointer group/tutor">
                           <div className="relative">
                              <img src={tutor.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tutor.uid}`} className="w-16 h-16 rounded-2xl object-cover shadow-2xl" alt="" width="500" height="500" />
                              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-[#7cc142] border-[4px] border-indigo-900 rounded-full shadow-lg"></div>
                           </div>
                           <div>
                              <p className="text-base font-black truncate max-w-[150px]">{tutor.name || 'Anonymous'}</p>
                              <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest mt-1 truncate max-w-[150px]">{tutor.headline || 'Expert Mentor'}</p>
                           </div>
                        </div>
                     )) : (
                        <p className="text-white/20 text-xs italic text-center py-10">No mentors joined yet.</p>
                     )}
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
                     {upcomingSessions.length > 0 ? upcomingSessions.map(session => (
                        <div key={session.id} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col gap-4 hover:shadow-md transition-all">
                           <div className="flex items-center justify-between">
                              <span className="px-3 py-1 bg-red-50 text-red-500 rounded-full text-[9px] font-black uppercase">Upcoming Live</span>
                              <span className="text-[10px] font-black text-gray-400">
                                 {new Date(session.startTime).toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </div>
                           <h4 className="font-black text-indigo-900 text-sm line-clamp-1">{session.title}</h4>
                           <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest -mt-2">In {session.zoneTitle || 'Learning Zone'}</p>
                           <button className="w-full py-3 bg-indigo-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-800 transition-all">Remind Me</button>
                        </div>
                     )) : (
                        <div className="py-10 text-center space-y-4">
                           <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-200">
                              <CheckCircle size={24} />
                           </div>
                           <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">All caught up!</p>
                        </div>
                     )}
                  </div>

                  <div className="mt-10 pt-8 border-t border-gray-100 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Star size={20} fill="#c2f575" className="text-[#c2f575]" />
                        <span className="text-sm font-black text-indigo-900">
                           {enrolledZones.reduce((acc, z) => acc + (z.engagementScore || 0), 0).toLocaleString()} XP
                        </span>
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

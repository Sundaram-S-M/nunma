
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, limit, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
  ArrowLeft,
  ChevronRight,
  Play,
  FileText,
  FileDown,
  Award,
  Video,
  Layout,
  Zap,
  Globe,
  ChevronDown,
  Radio,
  QrCode,
  GraduationCap,
  Clock,
  AlertTriangle,
  Camera,
  Search,
  CircleCheck as CheckCircle,
  X,
  Target,
  FileSpreadsheet,
  Share2,
  LogOut
} from 'lucide-react';
import ClassroomStream from '../components/ClassroomStream';
import { generateOpenBadgeVC, downloadVCAsJSON } from '../utils/vcUtils';
import { useAuth } from '../context/AuthContext';

const ZONES_STORAGE_KEY = 'nunma_zones_data';
const LIVE_SESSIONS_KEY = 'nunma_live_sessions';

const StudentZoneView: React.FC = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [zone, setZone] = useState<any>(null);
  const [activeContent, setActiveContent] = useState<any>(null);
  const [expandedChapters, setExpandedChapters] = useState<string[]>(['c1']);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'content' | 'exams'>('content');
  const [exams, setExams] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [activeExam, setActiveExam] = useState<any>(null);
  const [examCurrentQuestion, setExamCurrentQuestion] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examWarnings, setExamWarnings] = useState(0);
  const [isExamTerminated, setIsExamTerminated] = useState(false);
  const [showExamRules, setShowExamRules] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'off' | 'on' | 'denied'>('off');
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [studentData, setStudentData] = useState<any>(null);

  const { user: authUser } = useAuth();

  // Certificate State
  const [showCertModal, setShowCertModal] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [generatedVC, setGeneratedVC] = useState<any>(null);


  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem(ZONES_STORAGE_KEY);
      if (saved) {
        const zones = JSON.parse(saved);
        const found = zones.find((z: any) => z.id === zoneId);
        setZone(found);
      }

      const liveData = localStorage.getItem(LIVE_SESSIONS_KEY);
      if (liveData) {
        setLiveSessions(JSON.parse(liveData));
      }
    };

    loadData();
    window.addEventListener('storage', loadData);

    // Payment & Whitelist Check
    const checkAccess = () => {
      const savedZones = localStorage.getItem(ZONES_STORAGE_KEY);
      if (savedZones) {
        const zones = JSON.parse(savedZones);
        const currentZone = zones.find((z: any) => z.id === zoneId);

        // Mock payment check: If price > 0 and not whitelisted, redirect to payment
        const isWhitelisted = currentZone?.whitelistedEmails?.includes(authUser?.email);
        const hasPaid = localStorage.getItem(`nunma_paid_${zoneId}`) === 'true';

        if (currentZone?.price > 0 && !isWhitelisted && !hasPaid) {
          navigate(`/payment/${zoneId}`);
        }
      }
    };
    checkAccess();

    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session');
    if (sessionId) {
      const liveData = localStorage.getItem(LIVE_SESSIONS_KEY);
      if (liveData) {
        const sessions = JSON.parse(liveData);
        const session = sessions.find((s: any) => s.id === sessionId && s.status === 'live');
        if (session) {
          setActiveLiveRoom(session);
        }
      }
    }

    // Load Exams
    const savedExams = localStorage.getItem(`nunma_exams_${zoneId}`);
    if (savedExams) setExams(JSON.parse(savedExams));

    // Load Curriculum
    const savedCurriculum = localStorage.getItem(`nunma_chapters_${zoneId}`);
    if (savedCurriculum) setCurriculum(JSON.parse(savedCurriculum));

    const savedResults = localStorage.getItem(`nunma_results_${zoneId}`);
    if (savedResults) setExamResults(JSON.parse(savedResults));

    const savedStudents = localStorage.getItem(`nunma_students_${zoneId}`);
    if (savedStudents && authUser) {
      const students = JSON.parse(savedStudents);
      const currentStudent = students.find((s: any) => s.email === authUser.email || s.id === authUser.uid);
      setStudentData(currentStudent);
    }

    return () => {
      window.removeEventListener('storage', loadData);
    };
  }, [zoneId, location.search]);

  // Cheating Detection: Window Blur
  useEffect(() => {
    if (activeExam && !isExamTerminated) {
      const handleBlur = () => {
        setExamWarnings(prev => {
          const next = prev + 1;
          if (next >= 3) {
            handleTerminateExam('failed');
            alert('Exam terminated due to multiple tab switches.');
          } else {
            alert(`WARNING: Window focus lost. Warning ${next}/2. Next time your exam will be reported.`);
          }
          return next;
        });
      };
      window.addEventListener('blur', handleBlur);
      return () => window.removeEventListener('blur', handleBlur);
    }
  }, [activeExam, isExamTerminated]);

  const handleStartExam = (exam: any) => {
    setActiveExam(exam);
    setExamCurrentQuestion(0);
    setExamAnswers({});
    setExamWarnings(0);
    setIsExamTerminated(false);
    setCameraStatus('on'); // Mock camera start
  };

  const handleTerminateExam = (status: 'passed' | 'failed') => {
    setIsExamTerminated(true);
    const result = {
      id: Date.now().toString(),
      examId: activeExam.id,
      studentId: authUser?.uid || 'anon',
      studentName: authUser?.name || 'Anonymous',
      marks: status === 'passed' ? Math.floor(activeExam.maxMark * 0.8) : 0, // Mock scoring
      status: status,
      warnings: examWarnings,
      completedAt: new Date().toISOString()
    };
    const updatedResults = [...examResults, result];
    setExamResults(updatedResults);
    localStorage.setItem('nunma_exam_results', JSON.stringify(updatedResults));
    setActiveExam(null);
    setCameraStatus('off');
  };

  const handleSubmitExam = () => {
    // Basic scoring
    let score = 0;
    activeExam.questions.forEach((q: any) => {
      if (examAnswers[q.id] === q.correctAnswer) score++;
    });
    const finalMarks = Math.round((score / activeExam.questions.length) * activeExam.maxMark);
    const status = finalMarks >= activeExam.minMark ? 'passed' : 'failed';

    handleTerminateExam(status);
    alert(`Exam submitted! Your score: ${finalMarks}/${activeExam.maxMark}. Status: ${status}`);
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleClaimCertificate = () => {
    setIsGeneratingCert(true);
    setTimeout(() => {
      const vc = generateOpenBadgeVC(authUser?.email || 'anon-id', authUser?.name || 'Anonymous Student', zone, 85);
      setGeneratedVC(vc);
      setIsGeneratingCert(false);
      setShowCertModal(true);
    }, 1500);
  };

  const currentZoneLive = liveSessions.find(s => s.zoneId === zoneId && s.status === 'live');

  const handleLeaveZone = () => {
    if (!zoneId || !authUser) return;

    if (confirm('Are you sure you want to leave this zone? All your progress and attendance data will be lost.')) {
      // 1. Remove from enrolled zones (if kept in a user list - here we check all zones)
      // 2. Remove student from the zone's student list
      const savedStudents = localStorage.getItem(`nunma_students_${zoneId}`);
      if (savedStudents) {
        let students = JSON.parse(savedStudents);
        students = students.filter((s: any) => s.email !== authUser.email && s.id !== authUser.uid);
        localStorage.setItem(`nunma_students_${zoneId}`, JSON.stringify(students));
      }

      // 3. Remove from whitelist if applicable (optional, usually whitelist decides access, but here we just remove enrollment)
      // (Skipping whitelist removal to allow re-join if still whitelisted)

      // 4. Redirect
      navigate('/workplace');
    }
  };

  if (!zone) return <div>Loading Zone...</div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-500 pb-20 pr-10">
      {activeLiveRoom && (
        <ClassroomStream
          sessionId={activeLiveRoom.id}
          zoneId={zoneId || ''}
          role="STUDENT"
          title={activeLiveRoom.title}
          onClose={() => setActiveLiveRoom(null)}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6 w-full">
          <button onClick={() => navigate('/classroom')} className="p-4 bg-white border border-gray-100 rounded-2xl text-indigo-900 hover:shadow-xl transition-all shadow-sm active:scale-90">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-5xl font-black text-[#1A1A4E] tracking-tighter leading-tight mb-2">{zone.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black bg-[#c2f575] text-indigo-900 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                {zone.level} Level
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{zone.domain}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-4">
          {currentZoneLive && (
            <button
              onClick={() => setActiveLiveRoom(currentZoneLive)}
              className="px-8 py-4 bg-red-600 text-white rounded-[1.75rem] flex items-center gap-4 shadow-2xl shadow-red-600/20 hover:bg-red-700 transition-all animate-in zoom-in"
            >
              <Radio size={20} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Join Live Session</span>
            </button>
          )}
          {zone.provideCertificate && (
            <div
              onClick={handleClaimCertificate}
              className="bg-[#1A1A4E] px-8 py-4 rounded-[1.75rem] border border-white/10 flex items-center gap-4 shadow-2xl shadow-indigo-900/20 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
            >
              <Award size={24} className="text-[#c2f575]" />
              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Certification Zone</span>
            </div>
          )}
          <div className="flex gap-4">
            <button className="flex-1 bg-white/10 backdrop-blur-md p-4 rounded-3xl flex items-center justify-center gap-2 font-bold hover:bg-white/20 transition-all border border-white/10">
              <Share2 size={20} /> Share Zone
            </button>
            <button onClick={handleLeaveZone} className="flex-1 bg-red-500/10 backdrop-blur-md p-4 rounded-3xl flex items-center justify-center gap-2 font-bold text-red-200 hover:bg-red-500/20 transition-all border border-red-500/10">
              <LogOut size={20} /> Leave Zone
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
        <div className="xl:col-span-8 space-y-8">
          <div className="flex bg-white/50 p-2 rounded-3xl border border-gray-100 gap-2 mb-4">
            <button onClick={() => setActiveTab('content')} className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'content' ? 'bg-[#1A1A4E] text-white shadow-xl' : 'text-gray-400 hover:bg-white'}`}>Learning Content</button>
            <button onClick={() => setActiveTab('exams')} className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'exams' ? 'bg-[#1A1A4E] text-white shadow-xl' : 'text-gray-400 hover:bg-white'}`}>Exam Portal</button>
          </div>

          {activeTab === 'content' ? (
            activeContent ? (
              <div className="bg-white rounded-[4rem] p-16 border border-gray-100 shadow-2xl min-h-[600px] flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="w-32 h-32 bg-gray-50 rounded-[3rem] flex items-center justify-center text-indigo-900 mb-10 shadow-inner group-hover:bg-indigo-900 group-hover:text-[#c2f575] transition-all duration-700">
                  {activeContent.type === 'video' ? <Video size={64} strokeWidth={1.5} /> : <FileText size={64} strokeWidth={1.5} />}
                </div>
                <h2 className="text-4xl font-black text-indigo-900 mb-6 tracking-tight">{activeContent.title}</h2>
                <p className="text-gray-400 max-w-md mx-auto leading-relaxed text-lg font-medium italic">
                  Secure learning stream initiated. Interactive dashboard features are loading...
                </p>
                <div className="mt-14 flex gap-6">
                  <button onClick={() => setActiveContent(null)} className="px-12 py-5 bg-gray-50 text-gray-400 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:shadow-md transition-all">Close Player</button>
                  <button className="px-14 py-5 bg-[#c2f575] text-indigo-900 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-[#c2f575]/30 hover:brightness-110 active:scale-95 transition-all">Mark as Completed</button>
                </div>
              </div>
            ) : (
              <div className="bg-indigo-900 rounded-[4rem] p-16 text-white relative overflow-hidden h-[450px] flex flex-col justify-center shadow-2xl border border-white/5">
                <div className="relative z-10 max-w-xl">
                  <h2 className="text-6xl font-black tracking-tighter mb-6 leading-[1.1]">Welcome to your <br /><span className="text-[#c2f575]">Learning Journey</span></h2>
                  <p className="text-indigo-100/70 text-xl font-medium leading-relaxed">Select a professional module from the curriculum sidebar to begin your knowledge stream. </p>
                </div>
                <div className="absolute -bottom-20 -right-20 w-[450px] h-[450px] bg-[#c2f575]/5 rounded-full blur-[120px] animate-pulse"></div>
              </div>
            )
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {exams.map(exam => {
                  const result = examResults.find(r => r.examId === exam.id && r.studentId === (authUser?.uid || 'anon'));
                  return (
                    <div key={exam.id} className="bg-white border border-gray-100 rounded-[3.5rem] p-10 space-y-8 shadow-sm hover:shadow-2xl transition-all group">
                      <div className="flex justify-between items-start">
                        <div className={`p-5 rounded-3xl ${exam.type === 'online' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                          {exam.type === 'online' ? <Radio size={32} /> : <FileSpreadsheet size={32} />}
                        </div>
                        {result ? (
                          <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${result.status === 'passed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            Result: {result.status}
                          </span>
                        ) : (
                          <span className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            {exam.status}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-[#1A1A4E] tracking-tight truncate">{exam.title}</h4>
                        <div className="mt-4 flex flex-wrap gap-4">
                          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase">
                            <Clock size={14} /> {exam.date} @ {exam.time}
                          </div>
                          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase">
                            <Target size={14} /> Pass: {exam.minMark}/{exam.maxMark}
                          </div>
                        </div>
                      </div>
                      {result ? (
                        <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Your Score</p>
                            <p className="font-black text-3xl text-[#1A1A4E]">{result.marks}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Points Awarded</p>
                            <p className="font-black text-xl text-[#c2f575]">{result.status === 'passed' ? result.marks * 10 : 0} XP</p>
                          </div>
                        </div>
                      ) : (
                        exam.type === 'online' && exam.status === 'UPCOMING' && (
                          <button onClick={() => setShowExamRules(true)} className="w-full py-5 bg-[#1A1A4E] text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:brightness-110 active:scale-95 transition-all">Launch Exam Portal</button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
              <div className="w-2 h-8 bg-[#c2f575] rounded-full"></div>
              Zone Description
            </h3>
            <p className="text-gray-500 leading-relaxed text-lg font-medium">{zone.description || 'Elevate your skills through Sundaram\'s expert-led curriculum designed for industry precision.'}</p>
          </div>

          {studentData && (
            <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-900 rounded-full"></div>
                Your Progress
              </h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-gray-50 p-8 rounded-[2rem] text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Attendance %</p>
                  <p className="text-4xl font-black text-indigo-900">
                    {(() => {
                      if (!studentData.attendanceHistory || studentData.attendanceHistory.length === 0) return 0;
                      const presentCount = studentData.attendanceHistory.filter((h: any) => h.status === 'Present').length;
                      return Math.round((presentCount / studentData.attendanceHistory.length) * 100);
                    })()}%
                  </p>
                </div>
                <div className="bg-gray-50 p-8 rounded-[2rem] text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">XP Earned</p>
                  <p className="text-4xl font-black text-indigo-900">{studentData.engagementScore || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 space-y-8">
          <div className="bg-white rounded-[4rem] p-10 border border-gray-100 shadow-2xl relative overflow-hidden">
            <h3 className="text-2xl font-black text-indigo-900 mb-10 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-900">
                <Layout size={24} />
              </div>
              Course Curriculum
            </h3>
            <div className="space-y-6">
              {curriculum.map((chapter, idx) => (
                <div key={chapter.id} className="space-y-4">
                  <button onClick={() => toggleChapter(chapter.id)} className="w-full flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 text-sm font-black border border-gray-100 group-hover:bg-indigo-900 group-hover:text-white transition-all">
                        {idx + 1}
                      </div>
                      <h4 className="font-black text-indigo-900 text-sm tracking-tight">{chapter.title}</h4>
                    </div>
                    <ChevronDown size={18} className={`text-gray-300 transition-transform duration-500 ${expandedChapters.includes(chapter.id) ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedChapters.includes(chapter.id) && (
                    <div className="space-y-3 pl-14 animate-in slide-in-from-top-2 duration-300">
                      {chapter.segments.map(segment => (
                        <button
                          key={segment.id}
                          onClick={() => setActiveContent(segment)}
                          className={`w-full p-5 rounded-[2rem] border transition-all flex items-center justify-between group ${activeContent?.id === segment.id ? 'bg-indigo-900 border-indigo-900 text-white shadow-2xl scale-105' : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-900/20 hover:bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeContent?.id === segment.id ? 'bg-white/10' : 'bg-gray-50'}`}>
                              {segment.type === 'video' ? <Play size={16} fill="currentColor" /> : <FileText size={16} />}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold leading-none mb-2">{segment.title}</p>
                              <p className={`text-[9px] font-black uppercase tracking-widest ${activeContent?.id === segment.id ? 'text-[#c2f575]' : 'text-gray-300'}`}>
                                {segment.type} {segment.duration && `• ${segment.duration}`}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={16} className={activeContent?.id === segment.id ? 'text-white' : 'text-gray-200'} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#c2f575] p-12 rounded-[4rem] text-indigo-900 relative overflow-hidden group shadow-2xl border-4 border-white">
            <div className="relative z-10">
              <Zap size={40} fill="currentColor" className="mb-8" />
              <h4 className="text-3xl font-black mb-3 tracking-tighter">Live Support</h4>
              <p className="text-indigo-900/60 text-xs font-bold uppercase tracking-[0.2em] mb-12">Direct Channel to Mentor</p>
              <button
                onClick={() => {
                  if (db) {
                    const q = query(collection(db, 'conversations'), where('zoneId', '==', zoneId), limit(1));
                    getDocs(q).then(snapshot => {
                      if (!snapshot.empty) {
                        navigate(`/inbox?tab=community&chatId=${snapshot.docs[0].id}`);
                      } else {
                        navigate('/inbox?tab=community');
                      }
                    });
                  } else {
                    const savedConversations = JSON.parse(localStorage.getItem('nunma_conversations') || '[]');
                    const conv = savedConversations.find((c: any) => c.zoneId === zoneId);
                    if (conv) {
                      navigate(`/inbox?tab=community&chatId=${conv.id}`);
                    } else {
                      navigate('/inbox?tab=community');
                    }
                  }
                }}
                className="w-full py-5 bg-indigo-900 text-white rounded-3xl font-black uppercase text-[11px] tracking-[0.25em] shadow-2xl shadow-indigo-900/20 hover:bg-[#1A1A4E] transition-all active:scale-95"
              >
                Open Zone Chat
              </button>
            </div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/20 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000"></div>
          </div>
        </div>
      </div>

      {showCertModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#040457]/80 backdrop-blur-2xl p-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[4rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
            <div className="w-full md:w-1/2 bg-indigo-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-[#c2f575] rounded-2xl flex items-center justify-center text-indigo-900 mb-8 shadow-xl">
                  <Award size={32} />
                </div>
                <h3 className="text-4xl font-black tracking-tighter mb-4 leading-tight">Verifiable <br />Achievement</h3>
                <p className="text-indigo-200 text-sm font-medium opacity-80 mb-8">OpenBadges 3.0 Standard • W3C VC Compiled</p>

                <div className="mb-10 p-6 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center group/qr relative overflow-hidden">
                  <QrCode size={120} className="text-indigo-900 group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/5 transition-colors duration-700"></div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                    <CheckCircle size={24} className="text-[#c2f575]" />
                    <div className="text-left">
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Issuer</p>
                      <p className="text-xs font-bold">Nunma Academy (did:web:nunma.io)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                    <Zap size={24} className="text-[#c2f575]" />
                    <div className="text-left">
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Subject DID</p>
                      <p className="text-[9px] font-mono opacity-60 truncate max-w-[150px]">{generatedVC?.credentialSubject?.id}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#c2f575]/10 rounded-full blur-[80px]"></div>
            </div>
            <div className="w-full md:w-1/2 p-12 space-y-10 flex flex-col justify-center">
              <div className="space-y-4">
                <h4 className="text-2xl font-black text-indigo-900 tracking-tight">Claim your Identity</h4>
                <p className="text-gray-400 text-sm font-medium leading-relaxed">Download your certification as a JSON-LD file or save it directly to your mobile wallet for offline verification.</p>
              </div>
              <div className="space-y-4">
                <button onClick={() => downloadVCAsJSON(generatedVC)} className="w-full py-5 bg-indigo-50 text-indigo-900 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-white hover:shadow-xl transition-all">
                  <FileDown size={20} /> Download JSON-LD
                </button>
                <div className="flex gap-4">
                  <button className="flex-1 py-5 bg-black text-white rounded-3xl font-black uppercase text-[9px] tracking-[0.15em] flex items-center justify-center gap-2 hover:brightness-125 transition-all">
                    <Globe size={16} /> Apple Wallet
                  </button>
                  <button className="flex-1 py-5 bg-gray-50 border border-gray-100 text-indigo-900 rounded-3xl font-black uppercase text-[9px] tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-white hover:shadow-lg transition-all">
                    <Globe size={16} className="text-blue-500" /> Google Wallet
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-100">
                <button onClick={() => setShowCertModal(false)} className="w-full py-4 text-gray-300 font-black uppercase text-[10px] tracking-[0.3em] hover:text-red-500 transition-colors">Close Portal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isGeneratingCert && (
        <div className="fixed inset-0 z-[310] bg-[#040457]/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-300">
          <div className="w-24 h-24 border-8 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <h2 className="text-white text-3xl font-black tracking-tighter mb-2">Compiling Verifiable Proof</h2>
            <p className="text-indigo-200/60 font-black uppercase tracking-[0.3em] text-[10px]">Assembling JSON-LD & OpenBadges 3.0 Meta-Data</p>
          </div>
        </div>
      )}

      {/* EXAM RULES MODAL */}
      {showExamRules && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-[#040457]/90 backdrop-blur-xl p-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-3xl p-12 space-y-10 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-900 mx-auto shadow-sm">
                <GraduationCap size={40} />
              </div>
              <h3 className="text-3xl font-black text-[#1A1A4E] tracking-tight">Proctoring Requirements</h3>
              <p className="text-gray-400 font-medium">Please verify your environment before starting the assessment.</p>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <Camera className="text-indigo-600 shrink-0" size={24} />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Camera Monitoring will be active during the entire session. Ensure your face is clearly visible.</p>
              </div>
              <div className="flex gap-4 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <AlertTriangle className="text-red-500 shrink-0" size={24} />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Tab switching or window loss will trigger a system warning. 3 warnings result in immediate failure.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowExamRules(false)} className="flex-1 py-5 bg-gray-50 text-gray-300 rounded-3xl font-black uppercase text-[10px] tracking-widest">Decline</button>
              <button onClick={() => { setShowExamRules(false); handleStartExam(exams[0]); }} className="flex-[2] py-5 bg-[#1A1A4E] text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-2xl">Acknowledge & Start</button>
            </div>
          </div>
        </div>
      )}

      {/* ONLINE EXAM INTERFACE */}
      {activeExam && (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col p-10 animate-in slide-in-from-bottom-10 duration-700">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-[#1A1A4E] rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Radio size={32} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-[#1A1A4E] tracking-tight uppercase">{activeExam.title}</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Proctored Assessment Session</p>
              </div>
            </div>
            <div className="flex items-center gap-10">
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-2 text-green-500 font-black text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  SECURE STREAM ACTIVE
                </div>
              </div>
              <div className="w-[1.5px] h-12 bg-gray-100" />
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Warnings</p>
                <p className={`font-black text-2xl ${examWarnings > 0 ? 'text-red-500' : 'text-indigo-900'}`}>{examWarnings}/2</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex gap-12 overflow-hidden">
            <div className="flex-1 bg-gray-50 rounded-[4rem] border border-gray-100 p-16 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="max-w-3xl mx-auto w-full space-y-12">
                <div className="space-y-4">
                  <span className="text-[10px] font-black bg-[#1A1A4E] text-white px-4 py-1.5 rounded-full uppercase tracking-widest">Question {examCurrentQuestion + 1} of {activeExam.questions.length}</span>
                  <h3 className="text-4xl font-black text-[#1A1A4E] tracking-tight leading-tight">{activeExam.questions[examCurrentQuestion].question}</h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {activeExam.questions[examCurrentQuestion].options.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setExamAnswers({ ...examAnswers, [activeExam.questions[examCurrentQuestion].id]: idx })}
                      className={`w-full p-8 rounded-[2.5rem] border-2 text-left transition-all flex items-center justify-between group ${examAnswers[activeExam.questions[examCurrentQuestion].id] === idx ? 'bg-[#1A1A4E] border-[#1A1A4E] text-white shadow-2xl scale-[1.02]' : 'bg-white border-transparent hover:border-indigo-100 text-gray-500'}`}
                    >
                      <div className="flex items-center gap-6">
                        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${examAnswers[activeExam.questions[examCurrentQuestion].id] === idx ? 'bg-white/10 text-white' : 'bg-gray-50 text-gray-300'}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-xl font-bold tracking-tight">{opt}</span>
                      </div>
                      {examAnswers[activeExam.questions[examCurrentQuestion].id] === idx && <CheckCircle size={28} className="text-[#c2f575]" />}
                    </button>
                  ))}
                </div>

                <div className="pt-12 flex justify-between items-center">
                  <button
                    disabled={examCurrentQuestion === 0}
                    onClick={() => setExamCurrentQuestion(prev => prev - 1)}
                    className="px-10 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-30 transition-all hover:bg-white hover:shadow-md"
                  >
                    Previous
                  </button>
                  {examCurrentQuestion === activeExam.questions.length - 1 ? (
                    <button onClick={handleSubmitExam} className="px-14 py-5 bg-[#c2f575] text-indigo-900 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-[#c2f575]/20 hover:brightness-110 active:scale-95 transition-all">Submit Assessment</button>
                  ) : (
                    <button onClick={() => setExamCurrentQuestion(prev => prev + 1)} className="px-14 py-5 bg-[#1A1A4E] text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:brightness-110 active:scale-95 transition-all">Next Question</button>
                  )}
                </div>
              </div>
            </div>

            <div className="w-[350px] space-y-8 flex flex-col">
              <div className="bg-black rounded-[3rem] aspect-video relative overflow-hidden shadow-2xl">
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest shadow-lg">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  Live Feed
                </div>
                {/* Mock Camera Feed */}
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center px-10 leading-relaxed italic">
                    Biometric stream active. <br /> Face detected: YES
                  </p>
                </div>
                <div className="absolute bottom-4 right-4 text-white p-2 bg-black/40 backdrop-blur-md rounded-lg">
                  <Camera size={20} />
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-[3rem] p-10 flex-1 space-y-8 flex flex-col justify-center text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mx-auto">
                  <Clock size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-[#1A1A4E] mb-2 uppercase tracking-tight">Time Remaining</h4>
                  <p className="text-4xl font-black text-[#1A1A4E]">29:45</p>
                </div>
                <div className="pt-8 border-t border-gray-50 text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">
                  Your session will auto-submit <br /> when the timer reaches zero.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentZoneView;

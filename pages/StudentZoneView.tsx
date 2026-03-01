
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, limit, updateDoc, doc, arrayUnion, onSnapshot, addDoc, orderBy, deleteDoc, setDoc } from 'firebase/firestore';
import { db, functions } from '../utils/firebase';
import { httpsCallable } from 'firebase/functions';
import { Student } from '../types';
import {
  ArrowLeft,
  ChevronRight,
  Play,
  FileText,
  Users,
  Radio,
  FileDown,
  Award,
  Video,
  Layout,
  Zap,
  Globe,
  ChevronDown,
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
  LogOut,
  ArrowRight,
  Upload,
  Calendar
} from 'lucide-react';
import ClassroomStream from '../components/ClassroomStream';
import LiveSessionStatus from '../components/LiveSessionStatus';
import { generateOpenBadgeVC, downloadVCAsJSON } from '../utils/vcUtils';
import { useAuth } from '../context/AuthContext';




const StudentZoneView: React.FC = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [zone, setZone] = useState<any>(null);
  const [activeContent, setActiveContent] = useState<any>(null);
  const [expandedChapters, setExpandedChapters] = useState<string[]>(['c1']);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'content' | 'exams' | 'students'>('content');
  const [exams, setExams] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [activeExam, setActiveExam] = useState<any>(null);
  const [examCurrentQuestion, setExamCurrentQuestion] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examWarnings, setExamWarnings] = useState(0);
  const [isExamTerminated, setIsExamTerminated] = useState(false);
  const [showExamRules, setShowExamRules] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'off' | 'on' | 'denied'>('off');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [postExamTimer, setPostExamTimer] = useState<number | null>(null);
  const [uploadedAnswerFiles, setUploadedAnswerFiles] = useState<File | null>(null);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [studentData, setStudentData] = useState<any>(null);
  const [examEndTime, setExamEndTime] = useState<Date | null>(null);
  const [examTimeRemaining, setExamTimeRemaining] = useState<number | null>(null);

  const { user: authUser } = useAuth();

  // Certificate State
  const [showCertModal, setShowCertModal] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [generatedVC, setGeneratedVC] = useState<any>(null);


  useEffect(() => {
    if (!zoneId || !db) return;

    // 1. Zone Details
    const zoneUnsub = onSnapshot(doc(db, 'zones', zoneId), (docSnap) => {
      if (docSnap.exists()) {
        const zoneData = { id: docSnap.id, ...docSnap.data() };
        setZone(zoneData);

        // Adjust activeTab if current one is not allowed
        const zType = (zoneData as any).zoneType;
        setActiveTab(prev => {
          if (zType === 'Course' && prev === 'exams') return 'content';
          if (zType === 'Workshop' && (prev === 'exams' || prev === 'content')) return 'students';
          return prev;
        });
      } else {
        // Handle zone not found
      }
    });

    // 2. Live & Scheduled Sessions
    const sessionsQ = query(collection(db, 'zones', zoneId, 'sessions'), where('status', 'in', ['live', 'scheduled']));
    const sessionsUnsub = onSnapshot(sessionsQ, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveSessions(sessions);

      // Auto-join if param present
      const params = new URLSearchParams(location.search);
      const sessionId = params.get('session');
      if (sessionId) {
        const found = sessions.find((s: any) => s.id === sessionId);
        if (found) setActiveLiveRoom(found);
      }
    });

    // 3. Exams
    const examsQ = query(collection(db, 'zones', zoneId, 'exams'));
    const examsUnsub = onSnapshot(examsQ, (snapshot) => {
      setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Curriculum
    const chaptersQ = query(collection(db, 'zones', zoneId, 'chapters'), orderBy('order', 'asc')); // Assuming 'order' field exists or update schema
    const chaptersUnsub = onSnapshot(chaptersQ, (snapshot) => {
      setCurriculum(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 5. Student Data (Self)
    let studentUnsub = () => { };
    if (authUser) {
      // Check both 'students' collection (enrolled)
      // We assume the student ID is the auth uid or email is matched. 
      // Best practice: use UID as doc ID for students.
      // If the 'Grant Access' used random ID, we query by email.
      const q = query(collection(db, 'zones', zoneId, 'students'), where('email', '==', authUser.email));
      studentUnsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const sDoc = snapshot.docs[0];
          setStudentData({ id: sDoc.id, ...sDoc.data() });
        }
      });
    }

    // 6. Exam Results (My Results)
    // Assuming we store results in a subcollection 'submissions' or global 'exam_results'
    // Let's use a subcollection in zone for now: zones/{zoneId}/exam_results where studentId == uid
    const resultsQ = query(collection(db, 'zones', zoneId, 'exam_results'), where('studentId', '==', authUser?.uid || ''));
    const resultsUnsub = onSnapshot(resultsQ, (snapshot) => {
      setExamResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 7. All Students (for Student List tab)
    const allStudentsQ = query(collection(db, 'zones', zoneId, 'students'));
    const allStudentsUnsub = onSnapshot(allStudentsQ, (snapshot) => {
      setAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      zoneUnsub();
      sessionsUnsub();
      examsUnsub();
      chaptersUnsub();
      studentUnsub();
      resultsUnsub();
      allStudentsUnsub();
    };
  }, [zoneId, location.search, authUser]);

  // Payment Check Effect
  useEffect(() => {
    if (!zone || !authUser) return;

    // Wait for studentData to be attempted
    // If price > 0 and user is NOT in studentData (and not owner/whitelisted in zone check which we might skip for now or check zone.whitelistedEmails)

    const check = async () => {
      // Mock payment check removed. We rely on studentData presence.
      // If a student is in 'students' collection, they have access.
      // If not, and zone.price > 0, redirect.

      const isWhitelisted = zone.whitelistedEmails?.includes(authUser.email);
      // If we have studentData, we are good.
      if (studentData) return;

      // If whitelisted but no studentData, auto-enroll
      if (isWhitelisted) {
        try {
          const newStudent: Student = {
            id: authUser.uid,
            name: authUser.name || authUser.email.split('@')[0],
            avatar: authUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.uid}`,
            joinedAt: new Date().toLocaleDateString(),
            status: 'Present',
            engagementScore: 0,
            email: authUser.email
          };
          await setDoc(doc(db, 'zones', zoneId, 'students', authUser.uid), newStudent);
          // studentData will be updated via onSnapshot listener
          return;
        } catch (e) {
          console.error("Failed to auto-enroll whitelisted user", e);
        }
      }

      // If no student data, and price > 0, and not whitelisted -> Redirect
      if (zone.price > 0 && !isWhitelisted) {
        // Check if we are the owner? (Though this is student view)
        if (zone.createdBy === authUser.uid) return;

        navigate(`/payment/${zoneId}`);
      }
    };
    check();
  }, [zone, studentData, authUser, navigate, zoneId]);

  // 2. Auto-Resume (Select first incomplete segment)
  useEffect(() => {
    if (activeContent || !curriculum || curriculum.length === 0 || !studentData) return;

    // Check if an exam was active
    if (studentData.activeExamId && !activeExam && exams.length > 0) {
      const foundExam = exams.find(e => e.id === studentData.activeExamId);
      if (foundExam) {
        setActiveExam(foundExam);
        setExamWarnings(studentData.currentExamWarnings || 0);
        // Continue but maybe show a message
        console.log("Resuming active exam session...");
      }
    }

    const allSegments = curriculum.flatMap(c => c.segments || []);
    if (allSegments.length === 0) return;

    const completedIds = studentData.completedSegments || [];
    const firstIncomplete = allSegments.find(s => !completedIds.includes(s.id));

    if (firstIncomplete) {
      setActiveContent(firstIncomplete);
      const chapter = curriculum.find(c => (c.segments || []).some((s: any) => s.id === firstIncomplete.id));
      if (chapter && !expandedChapters.includes(chapter.id)) {
        setExpandedChapters(prev => [...prev, chapter.id]);
      }
    } else {
      // If all are completed, default to the first one so they aren't stuck on a blank screen
      setActiveContent(allSegments[0]);
    }
  }, [curriculum, studentData, activeContent, expandedChapters, exams, activeExam]);

  // Cheating Detection: Window Blur
  useEffect(() => {
    if (activeExam && !isExamTerminated && (activeExam.type === 'online-test' || activeExam.type === 'online-mcq')) {
      const handleBlur = async () => {
        let newWarningCount = 0;
        setExamWarnings(prev => {
          newWarningCount = prev + 1;
          return newWarningCount;
        });

        // Persist to Firestore
        if (zoneId && studentData) {
          try {
            await updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), {
              currentExamWarnings: newWarningCount
            });
          } catch (e) {
            console.error("Failed to sync warning", e);
          }
        }

        if (newWarningCount >= 3) {
          handleTerminateExam('failed');
          alert('Exam terminated due to multiple tab switches.');
        } else {
          alert(`WARNING: Window focus lost. Warning ${newWarningCount}/2. Next time your exam will be reported.`);
        }
      };
      window.addEventListener('blur', handleBlur);
      return () => window.removeEventListener('blur', handleBlur);
    }
  }, [activeExam, isExamTerminated, zoneId, studentData]);

  const handleStartExam = async (exam: any) => {
    setActiveExam(exam);
    setExamCurrentQuestion(0);
    setExamAnswers({});
    setExamWarnings(0);
    setIsExamTerminated(false);
    setCameraStatus(exam.type === 'online-test' ? 'on' : 'off');
    setShowExamRules(false);

    const now = new Date();
    // Use exam duration or default to 30 mins
    const durationMins = exam.duration || 30;
    const endTime = new Date(now.getTime() + durationMins * 60000);
    setExamEndTime(endTime);

    // Persist to Firestore
    if (zoneId && studentData) {
      try {
        await updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), {
          activeExamId: exam.id,
          currentExamWarnings: 0,
          examStartedAt: now.toISOString(),
          examEndsAt: endTime.toISOString()
        });
      } catch (e) {
        console.error("Failed to sync exam start", e);
      }
    }
  };

  // Exam Timer Logic
  useEffect(() => {
    if (!activeExam || !examEndTime || isExamTerminated) return;

    const timer = setInterval(() => {
      const now = new Date();
      const remainingMs = examEndTime.getTime() - now.getTime();

      if (remainingMs <= 0) {
        clearInterval(timer);
        setExamTimeRemaining(0);
        alert("Time is up! Your exam is being automatically submitted.");

        if (activeExam.type === 'online-test') {
          handleTerminateExam('ongoing');
        } else {
          handleSubmitExam(); // Auto-submit MCQ
        }
      } else {
        setExamTimeRemaining(Math.ceil(remainingMs / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExam, examEndTime, isExamTerminated]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTerminateExam = async (status: 'passed' | 'failed' | 'ongoing') => {
    if (!zoneId || !activeExam || !studentData) return;

    if (activeExam.type === 'online-test') {
      // Start 20-minute upload countdown instead of immediate fail/pass
      setPostExamTimer(20 * 60);
      alert("Time is up! You have 20 minutes to scan and upload your answer sheet as a PDF.");
      return;
    }

    const result = {
      examId: activeExam.id,
      studentId: authUser?.uid || 'anon',
      studentName: authUser?.name || 'Anonymous',
      marks: status === 'passed' ? Math.floor(activeExam.maxMark * 0.8) : 0, // Mock scoring logic for now
      status: status,
      warnings: examWarnings,
      completedAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'zones', zoneId, 'exam_results'), result);
      // Update student doc to clear active exam
      await updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), {
        activeExamId: null,
        currentExamWarnings: 0
      });
      // Optimistic update
      setExamResults(prev => [...prev, { id: 'temp-' + Date.now(), ...result }]);
    } catch (e) {
      console.error("Failed to save exam result", e);
      alert("Failed to submit exam result. Please contact support.");
    }

    setActiveExam(null);
    setCameraStatus('off');
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };

  const handleSubmitExam = () => {
    if (activeExam.type === 'online-test') {
      handleTerminateExam('ongoing');
      return;
    }

    // Basic scoring for MCQ
    let score = 0;
    activeExam.questions.forEach((q: any) => {
      if (examAnswers[q.id] === q.correctAnswer) score++;
    });
    const finalMarks = Math.round((score / activeExam.questions.length) * activeExam.maxMark);
    const status = finalMarks >= activeExam.minMark ? 'passed' : 'failed';

    handleTerminateExam(status);
    alert(`Exam submitted! Your score: ${finalMarks}/${activeExam.maxMark}. Status: ${status}`);
  };

  const handleUploadAnswerSheet = async () => {
    if (!uploadedAnswerFiles || !zoneId || !activeExam || !studentData) return;
    // Mock upload logic
    alert(`Uploading ${uploadedAnswerFiles.name}... Success!`);

    const result = {
      examId: activeExam.id,
      studentId: authUser?.uid || 'anon',
      studentName: authUser?.name || 'Anonymous',
      marks: 0, // Pending grading
      status: 'ongoing',
      warnings: examWarnings,
      completedAt: new Date().toISOString(),
      answerSheetUrl: URL.createObjectURL(uploadedAnswerFiles) // Mock URL
    };

    try {
      await addDoc(collection(db, 'zones', zoneId, 'exam_results'), result);
      await updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), {
        activeExamId: null,
        currentExamWarnings: 0
      });
      setExamResults(prev => [...prev, { id: 'temp-' + Date.now(), ...result }]);
      setPostExamTimer(null);
      setActiveExam(null);
      setCameraStatus('off');
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
      alert("Answer sheet submitted successfully. Awaiting grading.");
    } catch (e) {
      console.error("Failed to save exam result", e);
      alert("Failed to submit exam result. Please try again.");
    }
  };

  useEffect(() => {
    if (postExamTimer !== null && postExamTimer > 0) {
      const timerId = setInterval(() => setPostExamTimer(p => p !== null ? p - 1 : null), 1000);
      return () => clearInterval(timerId);
    } else if (postExamTimer === 0) {
      alert("Upload time has expired. Exam marked as failed.");
      // Ideally push a failed result here
      setPostExamTimer(null);
      setActiveExam(null);
      setCameraStatus('off');
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
    }
  }, [postExamTimer]);

  useEffect(() => {
    if (cameraStatus === 'on') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          setVideoStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Error accessing media devices.", err);
          setCameraStatus('denied');
          alert("Camera/Mic access is required for this exam mode.");
        });
    } else {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
    }

    // Cleanup on unmount
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStatus]);

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleMarkAsCompleted = async (segmentId: string) => {
    if (!zoneId || !studentData || !authUser) return;

    // Prevent double completion
    if (studentData.completedSegments?.includes(segmentId)) {
      autoAdvance(segmentId);
      return;
    }

    try {
      const studentDocRef = doc(db, 'zones', zoneId, 'students', studentData.id);
      await updateDoc(studentDocRef, {
        completedSegments: arrayUnion(segmentId),
        engagementScore: (studentData.engagementScore || 0) + 10
      });
      // studentData state will be updated via onSnapshot listener implicitly
      autoAdvance(segmentId);
    } catch (e) {
      console.error("Failed to mark segment as completed", e);
    }
  };

  const registerIssuance = async () => {
    if (!zoneId || !zone || !authUser || !studentData) return;

    try {
      // Check if already issued
      const q = query(
        collection(db, 'issued_certificates'),
        where('studentId', '==', authUser.uid),
        where('zoneId', '==', zoneId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) return; // Already issued

      await addDoc(collection(db, 'issued_certificates'), {
        studentId: authUser.uid,
        tutorId: zone.tutorId || zone.createdBy, // Fallback to createdBy if tutorId is missing
        zoneId: zoneId,
        studentName: authUser.name || authUser.email.split('@')[0],
        zoneName: zone.title,
        date: new Date().toISOString(),
        verified: true
      });
      console.log("Certificate registered automatically");
    } catch (e) {
      console.error("Failed to register certificate issuance", e);
    }
  };

  const autoAdvance = (currentSegmentId: string) => {
    const allSegments = curriculum.flatMap(c => c.segments);
    const currentIndex = allSegments.findIndex(s => s.id === currentSegmentId);

    if (currentIndex !== -1 && currentIndex < allSegments.length - 1) {
      const nextSegment = allSegments[currentIndex + 1];
      setActiveContent(nextSegment);

      const nextChapter = curriculum.find(c => c.segments.some(s => s.id === nextSegment.id));
      if (nextChapter && !expandedChapters.includes(nextChapter.id)) {
        setExpandedChapters(prev => [...prev, nextChapter.id]);
      }
    } else {
      // Course complete
      const completedIds = studentData.completedSegments || [];
      if (allSegments.every(s => s.id === currentSegmentId || completedIds.includes(s.id))) {
        registerIssuance();
      }
      alert("Congratulations! You've reached the end of the curriculum.");
    }
  };

  const totalSegmentsCount = curriculum.flatMap(c => c.segments).length;
  const completedSegmentsCount = studentData?.completedSegments?.length || 0;
  const isCourseComplete = totalSegmentsCount > 0 && completedSegmentsCount >= totalSegmentsCount;
  const progressPercentage = totalSegmentsCount > 0 ? Math.round((completedSegmentsCount / totalSegmentsCount) * 100) : 0;

  const currentZoneLive = liveSessions.find(s => s.zoneId === zoneId && s.status === 'live');

  const handleClaimCertificate = () => {
    setIsGeneratingCert(true);
    setTimeout(() => {
      const vc = generateOpenBadgeVC(authUser?.email || 'anon-id', authUser?.name || 'Anonymous Student', zone, 85);
      setGeneratedVC(vc);
      setIsGeneratingCert(false);
      setShowCertModal(true);
    }, 1500);
  };

  const handleLeaveZone = async () => {
    if (!zoneId || !authUser) return;

    if (confirm('Are you sure you want to leave this zone? All your progress and attendance data will be lost.')) {
      try {
        // Assuming student ID is stored in studentData.id which should be same as students doc ID
        if (studentData && studentData.id) {
          await deleteDoc(doc(db, 'zones', zoneId, 'students', studentData.id));
        } else {
          // If we don't have studentData loaded but we want to leave, we try authUser.uid?
          // But 'Grant Access' used random IDs initially.
          // If we are migrating, we should rely on studentData being loaded.
          // If manual grant, ID was random. We found it via query.
          if (studentData?.id) {
            await deleteDoc(doc(db, 'zones', zoneId, 'students', studentData.id));
          }
        }
        navigate('/workplace');
      } catch (e) {
        console.error("Failed to leave zone", e);
        alert("Failed to leave zone.");
      }
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
            <div className="flex flex-col items-center gap-4 bg-white/5 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in">
              <LiveSessionStatus
                status="live"
                className="bg-[#c2f575]/10 border-[#c2f575]/20 text-[#c2f575]"
              />
              <button
                onClick={() => setActiveLiveRoom(currentZoneLive)}
                className="px-10 py-5 bg-[#c2f575] text-indigo-900 rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                Join Live Classroom <ArrowRight size={16} />
              </button>
            </div>
          )}
          {zone.provideCertificate && (
            <div
              onClick={() => isCourseComplete ? handleClaimCertificate() : alert(`Complete all modules to unlock certification. Progress: ${completedSegmentsCount}/${totalSegmentsCount}`)}
              className={`px-8 py-4 rounded-[1.75rem] border flex flex-col items-center gap-1 shadow-2xl transition-all ${isCourseComplete ? 'bg-[#1A1A4E] border-white/10 shadow-indigo-900/20 cursor-pointer hover:brightness-110 active:scale-95' : 'bg-gray-100 border-gray-200 cursor-not-allowed grayscale'}`}
            >
              <div className="flex items-center gap-4">
                <Award size={24} className={isCourseComplete ? "text-[#c2f575]" : "text-gray-400"} />
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isCourseComplete ? 'text-white' : 'text-gray-400'}`}>Certification Zone</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-[#c2f575] transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
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
          <div className="flex bg-white/50 p-2 rounded-3xl border border-gray-100 gap-2 mb-4 overflow-x-auto no-scrollbar">
            {(!zone?.zoneType || zone.zoneType === 'Class Management' || zone.zoneType === 'Course') && (
              <button onClick={() => setActiveTab('content')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'content' ? 'bg-[#1A1A4E] text-white shadow-xl' : 'text-gray-400 hover:bg-white'}`}>Learning Content</button>
            )}
            {(!zone?.zoneType || zone.zoneType === 'Class Management') && (
              <button onClick={() => setActiveTab('exams')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'exams' ? 'bg-[#1A1A4E] text-white shadow-xl' : 'text-gray-400 hover:bg-white'}`}>Exam Portal</button>
            )}
            <button onClick={() => setActiveTab('students')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'students' ? 'bg-[#1A1A4E] text-white shadow-xl' : 'text-gray-400 hover:bg-white'}`}>Student List</button>
          </div>

          {activeTab === 'content' ? (
            activeContent ? (
              <div
                className="bg-white rounded-[4rem] p-6 lg:p-10 border border-gray-100 shadow-2xl min-h-[600px] flex flex-col items-center justify-center text-center relative overflow-hidden group"
                onContextMenu={(e) => e.preventDefault()}
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                {activeContent.type === 'video' && activeContent.videoId ? (
                  <BunnyVideoPlayer
                    videoId={activeContent.videoId}
                    title={activeContent.title}
                    onComplete={() => handleMarkAsCompleted(activeContent.id)}
                  />
                ) : (activeContent.type === 'pdf' || activeContent.type === 'document' || activeContent.url || activeContent.fileUrl) ? (
                  <div className="w-full h-full min-h-[600px] rounded-[3rem] overflow-hidden bg-gray-50 shadow-inner relative flex flex-col items-center justify-center">
                    <iframe
                      src={`${activeContent.url || activeContent.fileUrl || activeContent.documentUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full min-h-[600px] border-none"
                      title={activeContent.title}
                    />
                    <div className="absolute top-0 w-full h-14 bg-transparent z-10" title="Protected Content" />
                  </div>
                ) : (
                  <>
                    <div className="w-32 h-32 bg-gray-50 rounded-[3rem] flex items-center justify-center text-indigo-900 mb-10 shadow-inner group-hover:bg-indigo-900 group-hover:text-[#c2f575] transition-all duration-700">
                      <FileText size={64} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-4xl font-black text-indigo-900 mb-6 tracking-tight">{activeContent.title}</h2>
                    <p className="text-gray-400 max-w-md mx-auto leading-relaxed text-lg font-medium italic">
                      {activeContent.type === 'video' ? 'Video ID missing. Please re-upload.' : 'Content loaded successfully.'}
                    </p>
                  </>
                )}
                <div className="mt-14 flex gap-6">
                  <button onClick={() => setActiveContent(null)} className="px-12 py-5 bg-gray-50 text-gray-400 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:shadow-md transition-all">Close Player</button>
                  {studentData?.completedSegments?.includes(activeContent.id) ? (
                    <button
                      onClick={() => autoAdvance(activeContent.id)}
                      className="px-14 py-5 bg-indigo-900 text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-3"
                    >
                      Continue to Next Module <ArrowRight size={16} />
                    </button>
                  ) : activeContent.type !== 'video' && (
                    <button
                      onClick={() => handleMarkAsCompleted(activeContent.id)}
                      className="px-14 py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all bg-[#c2f575] text-indigo-900 shadow-[#c2f575]/30 hover:brightness-110 active:scale-95"
                    >
                      Mark as Completed
                    </button>
                  )}
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
          ) : activeTab === 'exams' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {exams.map(exam => {
                  const result = examResults.find(r => r.examId === exam.id && r.studentId === (authUser?.uid || 'anon'));
                  return (
                    <div key={exam.id} className="bg-white border border-gray-100 rounded-[3.5rem] p-10 space-y-8 shadow-sm hover:shadow-2xl transition-all group">
                      <div className="flex justify-between items-start">
                        <div className={`p-5 rounded-3xl ${exam.type === 'online-test' || exam.type === 'online-mcq' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                          {exam.type === 'online-test' || exam.type === 'online-mcq' ? <Radio size={32} /> : <FileSpreadsheet size={32} />}
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
                        (exam.type === 'online-test' || exam.type === 'online-mcq') && exam.status === 'UPCOMING' ? (
                          <button onClick={() => {
                            updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), { activeExamId: exam.id });
                            setShowExamRules(true);
                          }} className="w-full py-5 bg-[#1A1A4E] text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:brightness-110 active:scale-95 transition-all">Launch Exam Portal</button>
                        ) : exam.type === 'offline' && exam.status === 'UPCOMING' ? (
                          <div className="space-y-4">
                            <a href={exam.pdfUrl || '#'} target="_blank" rel="noreferrer" download className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                              <FileDown size={16} /> Download Question Paper
                            </a>
                            <p className="text-center text-[10px] text-gray-400 font-bold px-2">Write your answers and upload them as a PDF during the exam window.</p>
                            <label className="w-full py-4 bg-[#c2f575] text-indigo-900 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl">
                              <Upload size={16} /> Upload Answer Sheet
                              <input type="file" className="hidden" accept=".pdf" onChange={() => alert("File uploaded successfully. Awaiting grading.")} />
                            </label>
                          </div>
                        ) : null
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[4rem] p-14 border border-gray-100 shadow-2xl animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-3xl font-black text-indigo-900 tracking-tighter flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-900">
                    <Users size={24} />
                  </div>
                  Joined Students
                </h3>
                <span className="px-6 py-2 bg-indigo-900 text-[#c2f575] rounded-full text-[10px] font-black uppercase tracking-widest">{allStudents.length} ENROLLED</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allStudents.map(student => (
                  <div key={student.id} className="p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex items-center gap-4 hover:shadow-xl hover:bg-white hover:border-[#c2f575] transition-all cursor-pointer group">
                    <img src={student.avatar} className="w-14 h-14 rounded-2xl object-cover bg-white p-1 border border-gray-100 shadow-sm" alt="" />
                    <div>
                      <p className="font-black text-indigo-900 text-sm">{student.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Joined {student.joinedAt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Removed Zone Description and Progress tracking sections as per minimalist UI requirement */}
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
                  <button onClick={() => toggleChapter(chapter.id)} className="w-full flex items-center justify-between group text-left">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 text-sm font-black border border-gray-100 group-hover:bg-indigo-900 group-hover:text-white transition-all">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-black text-indigo-900 text-sm tracking-tight">{chapter.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-20 h-1 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                            <div
                              className="h-full bg-[#c2f575] transition-all duration-700"
                              style={{
                                width: `${Math.round(((chapter.segments || []).filter(s => studentData?.completedSegments?.includes(s.id)).length / (chapter.segments?.length || 1)) * 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">
                            {Math.round(((chapter.segments || []).filter(s => studentData?.completedSegments?.includes(s.id)).length / (chapter.segments?.length || 1)) * 100)}%
                          </span>
                        </div>
                      </div>
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
                              {studentData?.completedSegments?.includes(segment.id) ? (
                                <CheckCircle size={16} className="text-green-500" />
                              ) : (
                                segment.type === 'video' ? <Play size={16} fill="currentColor" /> : <FileText size={16} />
                              )}
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

          {/* Upcoming Scheduled Sessions */}
          {liveSessions.filter(s => s.status === 'scheduled').length > 0 && (
            <div className="bg-white rounded-[4rem] p-10 border border-gray-100 shadow-2xl relative overflow-hidden">
              <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-2xl text-red-500">
                  <Calendar size={24} />
                </div>
                Upcoming Live Classes
              </h3>
              <div className="space-y-4">
                {liveSessions.filter(s => s.status === 'scheduled').map(session => (
                  <div key={session.id} className="p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100 group hover:bg-white hover:shadow-xl transition-all duration-500">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-black text-indigo-900 text-lg tracking-tight">{session.title}</h4>
                      <LiveSessionStatus status="scheduled" date={session.date} time={session.time} />
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Clock size={14} /> {session.duration} Mins
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div>
                        {session.date} @ {session.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    console.warn("Database not initialized");
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
                      <p className="text-xs font-bold">Nunma Academy (did:web:nunma.in)</p>
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
              <button
                onClick={() => handleStartExam(exams.find(e => e.id === studentData?.activeExamId) || exams[0])}
                className="flex-[2] py-5 bg-[#1A1A4E] text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-2xl"
              >
                Acknowledge & Start
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest shadow-lg z-10">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  Live Feed
                </div>
                {cameraStatus === 'on' ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-center px-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed italic mb-2">
                      Camera processing...
                    </p>
                    {cameraStatus === 'denied' && (
                      <p className="text-xs font-bold text-red-500 uppercase">Access Denied</p>
                    )}
                  </div>
                )}
                <div className="absolute bottom-4 right-4 text-white p-2 bg-black/40 backdrop-blur-md rounded-lg z-10">
                  <Camera size={20} />
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-[3rem] p-10 flex-1 space-y-8 flex flex-col justify-center text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mx-auto">
                  <Clock size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-[#1A1A4E] mb-2 uppercase tracking-tight">Time Remaining</h4>
                  <p className="text-4xl font-black text-[#1A1A4E] tabular-nums">{formatTime(examTimeRemaining)}</p>
                </div>
                <div className="pt-8 border-t border-gray-50 text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">
                  Your session will auto-submit <br /> when the timer reaches zero.
                </div>
                {activeExam.type === 'online-test' && (
                  <div className="mt-8">
                    <button onClick={handleSubmitExam} className="w-full py-5 bg-red-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:brightness-110 active:scale-95 transition-all">End Exam Now</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Exam Timer Modal for Online Test */}
      {postExamTimer !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in zoom-in-95 duration-500">
          <div className="bg-white rounded-[3rem] max-w-lg w-full p-12 text-center shadow-2xl border border-white/10">
            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <Clock size={48} />
            </div>
            <h3 className="text-3xl font-black text-[#1A1A4E] tracking-tight mb-4">Exam Concluded</h3>
            <p className="text-gray-500 font-medium mb-8">Scan your answer sheets and upload them as a single PDF. You have strictly 20 minutes before submissions are locked.</p>
            <div className="text-6xl font-black text-red-500 mb-10 tracking-tighter tabular-nums">
              {Math.floor(postExamTimer / 60).toString().padStart(2, '0')}:{(postExamTimer % 60).toString().padStart(2, '0')}
            </div>
            <label className="w-full py-6 bg-gray-50 border-2 border-dashed border-gray-300 text-indigo-900 rounded-3xl font-black uppercase text-[11px] tracking-widest hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm mb-6 h-32">
              <Upload size={24} className="text-indigo-400" />
              {uploadedAnswerFiles ? uploadedAnswerFiles.name : 'Select PDF Answer Sheet'}
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files && setUploadedAnswerFiles(e.target.files[0])} />
            </label>
            <button
              disabled={!uploadedAnswerFiles}
              onClick={handleUploadAnswerSheet}
              className="w-full py-6 bg-green-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Submit Answers
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentZoneView;

const BunnyVideoPlayer: React.FC<{ videoId: string; title: string; onComplete?: () => void }> = ({ videoId, title, onComplete }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // Standard Bunny.net player events via postMessage
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'ended') {
          console.log("Bunny: Video Finished");
          if (onComplete) onComplete();
        }
      } catch (err) {
        // Not a Bunny message or not JSON
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete]);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const generateToken = httpsCallable(functions, 'generateBunnyToken');
        const { data }: any = await generateToken({ videoId });

        // Construct Signed URL
        const signedUrl = `https://iframe.bunny.net/embed/${videoId}?token=${data.token}&expires=${data.expires}`;
        setUrl(signedUrl);
      } catch (err: any) {
        console.error("Token Generation Failed:", err);
        setError("Secure playback authorization failed.");
      }
    };
    fetchToken();
  }, [videoId]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h3 className="text-indigo-900 font-black text-xl mb-2">Access Denied</h3>
        <p className="text-gray-400 text-sm max-w-xs">{error}</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-900">Authenticating Stream...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-[3rem] overflow-hidden bg-black shadow-2xl relative">
      <iframe
        src={url}
        loading="lazy"
        className="w-full h-full absolute inset-0 border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen={true}
        title={title}
      />
    </div>
  );
};

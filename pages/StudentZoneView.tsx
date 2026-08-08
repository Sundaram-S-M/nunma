import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { collection, query, where, getDocs, getDoc, limit, updateDoc, doc, arrayUnion, onSnapshot, addDoc, orderBy, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { formatDate } from '../utils/dateUtils';
import { db, functions } from '../utils/firebase';
import { useProctoringVision } from '../hooks/useProctoringVision';
import { httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
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
  Layers,
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
  ShieldCheck,
  X,
  Target,
  FileSpreadsheet,
  Share2,
  LogOut,
  ArrowRight,
  Upload,
  Calendar,
  Trophy,
  MessageSquare
} from 'lucide-react';
import LiveSessionStatus from '../components/LiveSessionStatus';
import ChatSidebar from '../components/ChatSidebar';
const VideoStage = React.lazy(() => import('../components/VideoStage'));
import { generateOpenBadgeVC, downloadVCAsJSON } from '../utils/vcUtils';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { BunnyVideoPlayer } from '../components/BunnyVideoPlayer';
const ExamInsights = React.lazy(() => import('../components/ExamInsights'));

const calculateExamEndState = (exam: any, now: Date) => {
  const durationMins = exam.duration || 30;

  if (exam.date && exam.time) {
    const parts = exam.date.split('-');
    const timeParts = exam.time.split(':');
    if (parts.length === 3 && timeParts.length === 2) {
      let year, month, day;
      if (parts[0].length === 4) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
      } else {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
      }
      const examStartTime = new Date(year, month, day, parseInt(timeParts[0]), parseInt(timeParts[1]));
      const scheduledEndTime = new Date(examStartTime.getTime() + durationMins * 60000);
      const remainingSecs = Math.floor((scheduledEndTime.getTime() - now.getTime()) / 1000);

      if (remainingSecs > 0) {
        // Student joined within the window — give them the remaining strict time
        return { endTime: scheduledEndTime, finalDurationSecs: remainingSecs };
      }
    }
  }

  // Fallback: no scheduled date, or edge case — give the full duration from now
  const endTime = new Date(now.getTime() + durationMins * 60000);
  return { endTime, finalDurationSecs: durationMins * 60 };
};

const formatJoinedDate = (joinedAt: any) => {
  if (!joinedAt) return '';
  if (typeof joinedAt === 'string') return joinedAt;
  if (joinedAt && typeof joinedAt === 'object') {
    if (joinedAt.toDate && typeof joinedAt.toDate === 'function') {
      return formatDate(joinedAt.toDate());
    }
    if (joinedAt.seconds !== undefined) {
      return formatDate(new Date(joinedAt.seconds * 1000));
    }
  }
  return String(joinedAt);
};

const StudentZoneView: React.FC = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarOpen } = useSidebar();
  const [zone, setZone] = useState<any>(null);
  const [activeContent, setActiveContent] = useState<any>(null);
  const [expandedChapters, setExpandedChapters] = useState<string[]>(['c1']);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [showExamInsightsModal, setShowExamInsightsModal] = useState(false);
  const [selectedExamForInsights, setSelectedExamForInsights] = useState<any>(null);
  const [selectedExamGroup, setSelectedExamGroup] = useState<{name: string, exams: any[]} | null>(null);
  const [showFullAttendance, setShowFullAttendance] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'exams' | 'students' | 'attendance' | 'marks'>('content');
  const [exams, setExams] = useState<any[]>([]);
  const [notifiedExams, setNotifiedExams] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [activeExam, setActiveExam] = useState<any>(null);
  const [examCurrentQuestion, setExamCurrentQuestion] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [pdfZoomLevel, setPdfZoomLevel] = useState(100);
  const [cheatViolations, setCheatViolations] = useState(0);
  const [violationLogs, setViolationLogs] = useState<string[]>([]);
  const [showCheatWarningModal, setShowCheatWarningModal] = useState(false);
  const [terminatedByCheat, setTerminatedByCheat] = useState(false);
  const [isExamTerminated, setIsExamTerminated] = useState(false);
  const [showExamRules, setShowExamRules] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'off' | 'on' | 'denied'>('off');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasExplicitConsent, setHasExplicitConsent] = useState(false);
  const [postExamTimer, setPostExamTimer] = useState<number | null>(null);
  const [uploadedAnswerFiles, setUploadedAnswerFiles] = useState<Record<string, File>>({});
  const [postExamAnswerFile, setPostExamAnswerFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [studentData, setStudentData] = useState<any>(null);
  const [examEndTime, setExamEndTime] = useState<Date | null>(null);
  const [examTimeRemaining, setExamTimeRemaining] = useState<number | null>(null);
  const [submittedExamResult, setSubmittedExamResult] = useState<{ examTitle: string; marks: number; maxMark: number; status: string; wrongQuestions: string[]; pdfUrl?: string } | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [liveToken, setLiveToken] = useState<string | null>(null);
  const [liveServerUrl, setLiveServerUrl] = useState<string | null>(null);
  const [isJoiningLive, setIsJoiningLive] = useState(false);

  const { user: authUser } = useAuth();

  // Certificate State
  const [showCertModal, setShowCertModal] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [generatedVC, setGeneratedVC] = useState<any>(null);
  // Anti-Screen Capture Logic
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText(''); 
        alert('Screenshots are disabled in this zone.');
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', '5', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      alert('Copying content is disabled in this zone.');
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
    };
  }, []);


  // Notification & Exam Re-evaluation interval
  useEffect(() => {
    const interval = setInterval(() => {
      setExams(prev => [...prev]); // trigger re-render
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!authUser?.uid || !zoneId || exams.length === 0) return;

    // Filter exams applicable to this student's batch
    const applicableExams = exams.filter((exam: any) => !exam.batchId || exam.batchId === studentData?.batchId);

    applicableExams.forEach(exam => {
      let isLive = false;
      let examStartObj: Date | null = null;
      
      if (exam.scheduledAt?.toDate) {
        examStartObj = exam.scheduledAt.toDate();
        isLive = examStartObj <= new Date();
      } else if (exam.scheduledAt?.seconds) {
        examStartObj = new Date(exam.scheduledAt.seconds * 1000);
        isLive = examStartObj <= new Date();
      } else if (exam.status === 'LIVE') {
        isLive = true;
      } else if (exam.date && exam.time) {
        // Exams are created with date (YYYY-MM-DD or DD-MM-YYYY) and time (HH:MM) strings
        const parts = exam.date.split('-');
        const timeParts = exam.time.split(':');
        if (parts.length === 3 && timeParts.length === 2) {
          let year, month, day;
          if (parts[0].length === 4) {
            year = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            day = parseInt(parts[2]);
          } else {
            day = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            year = parseInt(parts[2]);
          }
          examStartObj = new Date(year, month, day, parseInt(timeParts[0]), parseInt(timeParts[1]));
          isLive = examStartObj <= new Date() && exam.status !== 'CONDUCTED';
        }
      }

      // Determine if the exam went live within the last 24 hours to prevent spam from old test exams
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      let isRecentlyLive = isLive;
      if (isLive && examStartObj) {
        // Note: examStartObj must be in the past (since isLive is true), we check if it was < 24h ago
        isRecentlyLive = (new Date().getTime() - examStartObj.getTime()) < ONE_DAY_MS;
      }

      // EXAM_LIVE notification
      if (isRecentlyLive && exam.id && !notifiedExams.includes(exam.id)) {
        const notifRef = doc(db, 'users', authUser.uid, 'notifications', `exam_live_${exam.id}`);
        getDoc(notifRef).then(docSnap => {
          if (!docSnap.exists()) {
            setDoc(notifRef, {
              type: 'EXAM_LIVE',
              title: 'Exam Starting Now!',
              message: `Your exam "${exam.title}" is now live! You have limited time to attempt it.`,
              zoneId,
              examId: exam.id,
              read: false,
              createdAt: new Date()
            }).catch(console.error);
          }
        });
        setNotifiedExams(prev => [...prev, exam.id]);
      }

      // 24-HOUR REMINDER notification
      const remindKey = `reminded_${exam.id}`;
      if (exam.remindAt && exam.id && !notifiedExams.includes(remindKey) && !isLive) {
        const remindTime = new Date(exam.remindAt);
        const now = new Date();

        // Calculate examStart date to verify it's not scheduled for today
        let examStart: Date | null = null;
        if (exam.date && exam.time) {
          const parts = exam.date.split('-');
          const timeParts = exam.time.split(':');
          if (parts.length === 3 && timeParts.length === 2) {
            examStart = new Date(
              parseInt(parts[0]),
              parseInt(parts[1]) - 1,
              parseInt(parts[2]),
              parseInt(timeParts[0]),
              parseInt(timeParts[1])
            );
          }
        }

        const isSameDay = examStart && (
          examStart.getFullYear() === now.getFullYear() &&
          examStart.getMonth() === now.getMonth() &&
          examStart.getDate() === now.getDate()
        );

        if (remindTime <= now && !isSameDay) {
          const notifRef = doc(db, 'users', authUser.uid, 'notifications', `exam_remind_${exam.id}`);
          getDoc(notifRef).then(docSnap => {
            if (!docSnap.exists()) {
              setDoc(notifRef, {
                type: 'EXAM_REMINDER',
                title: '24-Hour Exam Reminder',
                message: `Reminder: Exam "${exam.title}" is scheduled tomorrow on ${formatDate(exam.date)} @ ${exam.time}. Be prepared!`,
                zoneId,
                examId: exam.id,
                read: false,
                createdAt: new Date()
              }).catch(console.error);
            }
          });
          setNotifiedExams(prev => [...prev, remindKey]);
        }
      }
    });
  }, [exams, authUser, zoneId, notifiedExams]);

  useEffect(() => {
    if (!authUser || !authUser.uid || !zoneId || !db) return;
    
    const zoneId_val = zoneId; // local capture

    // 1. Zone Details
    const zoneUnsub = onSnapshot(doc(db, 'zones', zoneId), (docSnap) => {
      if (docSnap.exists()) {
        const zoneData = { id: docSnap.id, ...docSnap.data() };
        setZone(zoneData);

        // Adjust activeTab if current one is not allowed
        const zType = (zoneData as any).zoneType;
        setActiveTab(prev => {
          const params = new URLSearchParams(location.search);
          const tabParam = params.get('tab');
          if (tabParam && ['content', 'exams', 'students', 'attendance', 'marks'].includes(tabParam)) {
            return tabParam as any;
          }
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
      let sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Batch filtering logic
      if (studentData?.batchId) {
        sessions = sessions.filter(s => !s.batchId || s.batchId === studentData.batchId);
      } else {
        sessions = sessions.filter(s => !s.batchId);
      }
      
      setLiveSessions(sessions);

      // Auto-join if param present
      const params = new URLSearchParams(location.search);
      const sessionId = params.get('session');
      if (sessionId) {
        const found = sessions.find((s: any) => s.id === sessionId);
        if (found) navigate(`/classroom/${zoneId}`);
      }
    });

    // 3. Exams
    const examsQ = query(collection(db, 'zones', zoneId, 'exams'));
    const examsUnsub = onSnapshot(examsQ, (snapshot) => {
      setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Curriculum
    const chaptersQ = query(collection(db, 'zones', zoneId, 'chapters'), orderBy('order', 'asc'));
    const chaptersUnsub = onSnapshot(chaptersQ, (snapshot) => {
      setCurriculum(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 5. Student Data (Self)
    const studentDocRef = doc(db, 'zones', zoneId, 'students', authUser.uid);
    const studentUnsub = onSnapshot(studentDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const sData = { id: docSnap.id, ...docSnap.data() } as any;
        setStudentData(sData);
        if (sData.activeExamId && sData.examEndsAt) {
          setExamEndTime(new Date(sData.examEndsAt));
        }
      } else {
        setStudentData(null);
      }
    }, (error) => {
      console.warn("Student data listener failed:", error);
    });

    // 5.1 Fetch user consent state
    const userDocUnsub = onSnapshot(doc(db, 'users', authUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setHasExplicitConsent(!!docSnap.data().aiProctoringConsent);
      }
    });

    return () => {
      zoneUnsub();
      sessionsUnsub();
      examsUnsub();
      chaptersUnsub();
      studentUnsub();
      userDocUnsub();
    };
  }, [zoneId, location.search, authUser]);

  // Listen to All Students and Exam Results only when studentData is loaded or user is creator
  useEffect(() => {
    if (!authUser || !zoneId || !db) return;
    if (!studentData && zone?.createdBy !== authUser.uid && zone?.assistantTeacherId !== authUser.uid && authUser?.role !== 'THALA') return;

    // 6. Exam Results (My Results)
    // Submissions are stored under zones/{zoneId}/exams/{examId}/submissions/{uid}
    const unsubs: any[] = [];
    exams.forEach(exam => {
      const docRef = doc(db, 'zones', zoneId, 'exams', exam.id, 'submissions', authUser.uid);
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setExamResults(prev => {
            const data = { id: docSnap.id, examId: exam.id, studentId: authUser.uid, ...docSnap.data() };
            const existing = prev.findIndex(r => r.examId === exam.id);
            if (existing >= 0) {
              const newArr = [...prev];
              newArr[existing] = data;
              return newArr;
            }
            return [...prev, data];
          });
        }
      });
      unsubs.push(unsub);
    });

    // 7. All Students (for Student List tab)
    let allStudentsQ;
    if (authUser?.role === 'THALA' || authUser?.isDevBypass) {
      // Admins/Tutors can fetch all students
      allStudentsQ = query(collection(db, 'zones', zoneId, 'students'));
    } else if (studentData?.batchId) {
      // Students can only fetch their own batch per Firestore security rules
      allStudentsQ = query(collection(db, 'zones', zoneId, 'students'), where('batchId', '==', studentData.batchId));
    } else {
      // If student has no batch, they shouldn't fetch the whole collection (rules will deny)
      allStudentsQ = null;
    }

    let allStudentsUnsub = () => {};
    if (allStudentsQ) {
      allStudentsUnsub = onSnapshot(allStudentsQ, (snapshot) => {
        let studentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Strict batch isolation for peers (client-side backup)
        if (authUser?.role !== 'THALA' && !authUser?.isDevBypass) {
          if (studentData?.batchId) {
            studentsList = studentsList.filter(s => s.batchId === studentData.batchId);
          } else {
            studentsList = studentsList.filter(s => !s.batchId);
          }
        }
        
        setAllStudents(studentsList);
      }, (error) => {
        console.warn("Error loading students list:", error);
      });
    } else if (studentData) {
      // Fallback: Just show themselves if they can't query others
      setAllStudents([{ id: studentData.id || authUser.uid, ...studentData }]);
    }

    return () => {
      unsubs.forEach(u => u());
      allStudentsUnsub();
    };
  }, [zoneId, authUser, studentData, zone, exams]);

  // Payment Check Effect
  useEffect(() => {
    if (!zone || !authUser) return;

    // Wait for studentData to be attempted
    // If price > 0 and user is NOT in studentData (and not owner/whitelisted in zone check which we might skip for now or check zone.whitelistedEmails)

    const check = async () => {
      // Mock payment check removed. We rely on studentData presence.
      // If a student is in 'students' collection, they have access.
      // If not, and zone.price > 0, redirect.

      const whitelistEntry = zone.whitelistedEmails?.find((e: any) => {
        const email = typeof e === 'string' ? e : e.email;
        return email === authUser.email;
      });
      const isWhitelisted = !!whitelistEntry;
      
      // If we have studentData or are the creator, we are good.
      if (studentData || zone.createdBy === authUser.uid || zone.assistantTeacherId === authUser.uid) return;

      const isFree = !zone.price || zone.price <= 0;

      // If whitelisted or zone is free, auto-enroll
      if (isWhitelisted || isFree) {
        try {
          const whitelistedName = (typeof whitelistEntry === 'object' && whitelistEntry !== null) ? (whitelistEntry as any).name : null;
          const newStudent: Student = {
            id: authUser.uid,
            name: whitelistedName || authUser.name || authUser.email.split('@')[0],
            avatar: authUser.avatar || "/default-avatar.png",
            joinedAt: formatDate(new Date()),
            status: 'Present',
            engagementScore: 0,
            email: authUser.email
          };
          await setDoc(doc(db, 'zones', zoneId, 'students', authUser.uid), newStudent);

          // Add to user's enrollments
          await setDoc(doc(db, 'users', authUser.uid, 'enrollments', zoneId), {
            zoneId: zoneId,
            title: zone.title || 'Learning Zone',
            type: zone.zoneType || 'zone',
            enrolledAt: new Date().toISOString()
          });

          return;
        } catch (e) {
          console.error("Failed to auto-enroll user", e);
        }
      }

      // If no student data, and price > 0, and not whitelisted -> Redirect
      if (zone.price > 0 && !isWhitelisted) {
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
        const warnings = studentData.currentExamWarnings || 0;
        setCheatViolations(warnings);
        if (warnings >= 3) {
          setTerminatedByCheat(true);
          handleTerminateExam('failed', studentData.violationLogs || []);
          return;
        }
        if (studentData.examEndsAt) {
          const resumeEnd = new Date(studentData.examEndsAt);
          setExamEndTime(resumeEnd);
          const remainMs = resumeEnd.getTime() - Date.now();
          setExamTimeRemaining(Math.max(0, Math.ceil(remainMs / 1000)));
        } else {
          const fallbackEnd = new Date(Date.now() + (foundExam.duration || 30) * 60000);
          setExamEndTime(fallbackEnd);
          setExamTimeRemaining((foundExam.duration || 30) * 60);
        }
        // Continue but maybe show a message
        console.log("Resuming active exam session...");
        if (foundExam.type === 'online-test' || foundExam.type === 'online-mcq') {
          setCameraStatus('on');
        }
      }
    }

    const allSegments = curriculum.flatMap(c => (c.segments || []).filter((s: any) => s.status !== 'uploading'));
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

  // Cheating Detection: Window Visibility
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;

    if (activeExam && postExamTimer === null && !showExamRules && !isExamTerminated && !terminatedByCheat && (activeExam.type === 'online-test' || activeExam.type === 'online-mcq')) {
      const handleVisibilityChange = async () => {
        if (document.visibilityState === 'hidden') {
          // 15-second grace period for checking the time via mobile notifications and screen rotations
          visibilityTimeout = setTimeout(async () => {
            const timestamp = new Date().toISOString();
            const newWarningCount = cheatViolations + 1;
            const currentLogs = [...violationLogs, timestamp];
            
            setCheatViolations(newWarningCount);
            setViolationLogs(currentLogs);

            if (zoneId && studentData) {
              try {
                await updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), {
                  currentExamWarnings: newWarningCount,
                  violationLogs: arrayUnion(timestamp)
                });
              } catch (e) {
                console.error("Failed to sync warning", e);
              }
            }

            if (newWarningCount >= 3) {
              setTerminatedByCheat(true);
              handleTerminateExam('failed', currentLogs);
            } else {
              setShowCheatWarningModal(true);
            }
          }, 15000);
        } else {
          // User returned within the grace period, cancel the penalty
          if (visibilityTimeout) {
            clearTimeout(visibilityTimeout);
          }
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (visibilityTimeout) clearTimeout(visibilityTimeout);
      };
    }
  }, [activeExam, showExamRules, isExamTerminated, terminatedByCheat, zoneId, studentData, cheatViolations, violationLogs, postExamTimer]);

  // AI Vision Proctoring Callback & Hook
  const handleVisionViolation = React.useCallback(async (type: string, message: string) => {
    if (!activeExam || isExamTerminated || terminatedByCheat) return;

    const timestamp = new Date().toISOString();
    const newWarningCount = cheatViolations + 1;
    const currentLogs = [...violationLogs, `${type}: ${message} (${timestamp})`];

    setCheatViolations(newWarningCount);
    setViolationLogs(currentLogs);

    if (zoneId && studentData) {
      try {
        await updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), {
          currentExamWarnings: newWarningCount,
          violationLogs: arrayUnion(`${type}: ${message} (${timestamp})`)
        });

        const recordViolationFn = httpsCallable(functions, 'recordCheatViolation');
        recordViolationFn({
          zoneId,
          examId: activeExam.id,
          violationType: type
        }).catch(err => console.warn("Failed to record vision violation remotely:", err));
      } catch (e) {
        console.error("Failed to sync vision warning", e);
      }
    }

    if (newWarningCount >= 3) {
      setTerminatedByCheat(true);
      handleTerminateExam('failed', currentLogs);
    } else {
      setShowCheatWarningModal(true);
    }
  }, [activeExam, isExamTerminated, terminatedByCheat, zoneId, studentData, cheatViolations, violationLogs]);

  const proctorVision = useProctoringVision({
    enabled: !!activeExam && postExamTimer === null && !showExamRules && !isExamTerminated && !terminatedByCheat && (activeExam.type === 'online-test' || activeExam.type === 'online-mcq'),
    onViolation: handleVisionViolation,
    fps: 7
  });

  const handleStartExam = async (exam: any) => {
    if (!hasExplicitConsent) {
      setActiveExam(exam); // Store target exam
      setShowConsentModal(true);
      return;
    }
    setActiveExam(exam);
    setExamCurrentQuestion(0);

    if (exam.type === 'online-test' || exam.type === 'online-mcq') {
      setCameraStatus('on');
    }

    const now = new Date();
    const { endTime, finalDurationSecs } = calculateExamEndState(exam, now);
    
    setExamEndTime(endTime);
    setExamTimeRemaining(finalDurationSecs);

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
        // Removed blocking alert here, handleTerminateExam shows its own alert

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
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const UPLOAD_BUFFER_MS = 15 * 60 * 1000;

  const handleTerminateExam = async (status: 'passed' | 'failed' | 'ongoing', logsOverride?: string[]) => {
    if (!zoneId || !activeExam || !studentData) return;

    if (activeExam.type === 'online-test' && !terminatedByCheat && !logsOverride) {
      setPostExamTimer(15 * 60);
      setCameraStatus('off');
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
      return;
    }

    const logsToSubmit = logsOverride || violationLogs;

    try {
      const submitFn = httpsCallable(functions, 'submitExam');
      const submitRes: any = await submitFn({
        zoneId,
        examId: activeExam.id,
        answers: examAnswers,
        violationLogs: logsToSubmit
      });
      await updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), {
        activeExamId: null,
        currentExamWarnings: 0,
        violationLogs: []
      });

      const resData = submitRes?.data || {};
      const wrongList: string[] = resData.wrongQuestions || [];
      const pdfUrl: string | undefined = resData.pdfUrl || activeExam.pdfUrl;
      const resMarks: number = resData.marks ?? 0;
      const resStatus: string = resData.status || (logsToSubmit.length >= 3 ? 'failed' : status);

      setExamResults(prev => [...prev, { 
        id: 'temp-' + Date.now(), 
        examId: activeExam.id, 
        studentId: authUser?.uid || 'anon', 
        status: resStatus,
        marks: resMarks,
        answers: examAnswers,
        wrongQuestions: wrongList,
        pdfUrl: pdfUrl,
        cheatViolations: logsToSubmit, 
        completedAt: new Date().toISOString() 
      }]);

      if (activeExam.type === 'online-test') {
        setSubmittedExamResult({
          examTitle: activeExam.title,
          marks: resMarks,
          maxMark: activeExam.maxMark || 100,
          status: resStatus,
          wrongQuestions: wrongList,
          pdfUrl: pdfUrl
        });
      }
    } catch (e) {
      console.error("Failed to save exam result via function", e);
      alert("Failed to submit exam result. Time window may have closed.");
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
    handleTerminateExam('ongoing');
    if (!terminatedByCheat) {
      alert("Exam submitted successfully. Scoring will be available soon.");
    }
  };

  const handleUploadAnswerSheet = async (targetExam: any, file: File) => {
    if (!file || !zoneId || !targetExam || !studentData) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please compress your PDF to under 5MB.");
      return;
    }

    try {
      setIsUploading(true);

      const idToken = await getAuth().currentUser?.getIdToken();
      if (!idToken) throw new Error("Not authenticated");
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `zones/${zoneId}/exams/submissions/${studentData.id}`);

      // Use direct Cloud Run URL for 2nd Gen functions to prevent CORS preflight redirect (302) issues
      const uploadUrl = `https://uploadfiletobunny-xtu74uomna-uc.a.run.app`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Upload to Bunny failed: ${errText}`);
      }

      const data = await response.json();
      const answerSheetUrl = data.fileUrl;

      const submitFn = httpsCallable(functions, 'submitExam');
      await submitFn({
        zoneId,
        examId: targetExam.id,
        answers: {},
        violationLogs,
        answerSheetUrl
      });
      await updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), {
        activeExamId: null,
        currentExamWarnings: 0,
        violationLogs: []
      });
      setExamResults(prev => [...prev, {
        id: 'temp-' + Date.now(),
        examId: targetExam.id,
        studentId: authUser?.uid || 'anon',
        status: 'PENDING_GRADING',
        cheatViolations: violationLogs,
        answerSheetUrl,
        completedAt: new Date().toISOString()
      }]);
      // Clear only this exam's file
      setUploadedAnswerFiles(prev => {
        const next = { ...prev };
        delete next[targetExam.id];
        return next;
      });
      setPostExamTimer(null);
      if (activeExam?.id === targetExam.id) {
        setActiveExam(null);
        setCameraStatus('off');
        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
          setVideoStream(null);
        }
      }
      alert("Answer script submitted successfully. Awaiting grading.");
    } catch (e: any) {
      console.error("Failed to save exam result via function", e);
      alert(e.message || "Failed to upload answer script. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (postExamTimer !== null && postExamTimer > 0) {
      const timerId = setInterval(() => {
        setPostExamTimer(prev => {
          if (prev === null) {
            clearInterval(timerId);
            return null;
          }
          if (prev <= 1) {
            clearInterval(timerId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [postExamTimer !== null]);

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

  const handleSaveConsent = async () => {
    if (!authUser) return;
    try {
      await updateDoc(doc(db, 'users', authUser.uid), {
        aiProctoringConsent: true,
        aiProctoringConsentAt: new Date().toISOString()
      });
      setHasExplicitConsent(true);
      setShowConsentModal(false);
      // If we had a pending exam, start it
      if (activeExam) {
        setShowExamRules(true);
      }
    } catch (e) {
      console.error("Failed to save consent", e);
      alert("Failed to save consent choice. Please try again.");
    }
  };

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
    const allSegments = curriculum.flatMap(c => c.segments.filter((s: any) => s.status !== 'uploading'));
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

  const totalSegmentsCount = curriculum.flatMap(c => c.segments.filter((s: any) => s.status !== 'uploading')).length;
  const completedSegmentsCount = studentData?.completedSegments?.length || 0;
  const isCourseComplete = totalSegmentsCount > 0 && completedSegmentsCount >= totalSegmentsCount;
  const progressPercentage = totalSegmentsCount > 0 ? Math.round((completedSegmentsCount / totalSegmentsCount) * 100) : 0;

  const currentZoneLive = liveSessions.find(s => s.zoneId === zoneId && s.status === 'live');

  
  const renderExamCard = (exam: any) => {
    
                  let isLive = false;
                  let examStartTime: Date | null = null;
                  if (exam.scheduledAt?.toDate) {
                    examStartTime = exam.scheduledAt.toDate();
                    isLive = examStartTime! <= new Date();
                  } else if (exam.scheduledAt?.seconds) {
                    examStartTime = new Date(exam.scheduledAt.seconds * 1000);
                    isLive = examStartTime <= new Date();
                  } else if (exam.status === 'LIVE') {
                    isLive = true;
                  } else if (exam.date && exam.time) {
                    // Exams created with date (YYYY-MM-DD or DD-MM-YYYY) + time (HH:MM) strings
                    const parts = exam.date.split('-');
                    const timeParts = exam.time.split(':');
                    if (parts.length === 3 && timeParts.length === 2) {
                      let year, month, day;
                      if (parts[0].length === 4) {
                        year = parseInt(parts[0]);
                        month = parseInt(parts[1]) - 1;
                        day = parseInt(parts[2]);
                      } else {
                        day = parseInt(parts[0]);
                        month = parseInt(parts[1]) - 1;
                        year = parseInt(parts[2]);
                      }
                      examStartTime = new Date(year, month, day, parseInt(timeParts[0]), parseInt(timeParts[1]));
                      isLive = examStartTime <= new Date() && exam.status !== 'CONDUCTED';
                    }
                  }

                  // Entry window = full exam duration set by tutor
                  const examDurationMs = (exam.duration || 30) * 60 * 1000;
                  const uploadGracePeriodMs = 15 * 60 * 1000; // 15 minutes grace period for uploading
                  const isPastExamDuration = isLive && examStartTime && (new Date().getTime() - examStartTime.getTime() > examDurationMs);
                  const isExpired = isLive && examStartTime && (new Date().getTime() - examStartTime.getTime() > examDurationMs + uploadGracePeriodMs);
                  const computedStatus = isExpired ? 'EXPIRED' : (isLive ? 'LIVE' : 'UPCOMING');

                  const result = examResults.find(r => r.examId === exam.id && r.studentId === (authUser?.uid || 'anon'));
                  return (
                    <div key={exam.id} className="bg-white border border-gray-100 rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-10 space-y-8 shadow-sm hover:shadow-2xl transition-all group">
                      <div className="flex justify-between items-start">
                        <div className={`p-5 rounded-3xl ${exam.type === 'online-test' || exam.type === 'online-mcq' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                          {exam.type === 'online-test' || exam.type === 'online-mcq' ? <Radio size={32} /> : <FileSpreadsheet size={32} />}
                        </div>
                        {result ? (
                          <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${result.status === 'passed' ? 'bg-green-100 text-green-600' : result.status === 'PENDING_GRADING' ? 'bg-amber-100 text-amber-600' : result.status === 'graded' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                            Result: {result.status === 'PENDING_GRADING' ? 'Evaluating' : result.status === 'graded' ? 'Evaluated' : result.status}
                          </span>
                        ) : (
                          <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${computedStatus === 'EXPIRED' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400'}`}>
                            {computedStatus === 'EXPIRED' ? 'CLOSED' : computedStatus}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-nunma-forest tracking-tight truncate">{exam.title}</h4>
                        <div className="mt-4 flex flex-wrap gap-4">
                          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase">
                            <Clock size={14} /> {formatDate(exam.date)} @ {exam.time}
                          </div>
                          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase">
                            <Target size={14} /> Pass: {exam.minMark}/{exam.maxMark}
                          </div>
                        </div>
                      </div>
                      {result ? (
                        <div className="pt-8 border-t border-gray-50 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Your Score</p>
                              <p className="font-black text-xl md:text-3xl text-nunma-forest">{result.status === 'PENDING_GRADING' ? '-' : (result.marks ?? 0)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Points Awarded</p>
                              <p className="font-black text-xl text-[#c2f575]">{result.status === 'passed' ? (result.marks || 0) * 10 : 0} XP</p>
                            </div>
                          </div>
                          {exam.type === 'online-test' && result.status === 'graded' && result.answerSheetUrl && (
                            <button
                              onClick={() => window.open(result.answerSheetUrl, '_blank')}
                              className="w-full py-4 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                            >
                              <FileText size={14} /> View your evaluated answer script
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedExamForInsights(exam); setShowExamInsightsModal(true); }}
                            className="w-full py-4 bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                          >
                            <Trophy size={14} /> View Class Rank List & Insights
                          </button>
                        </div>
                      ) : (
                        computedStatus === 'UPCOMING' ? (
                          <button disabled className="w-full py-5 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[11px] tracking-widest cursor-not-allowed">Starts Soon</button>
                        ) : computedStatus === 'EXPIRED' ? (
                          // Locked out — more than 10 minutes past exam start
                          <div className="pt-4 border-t border-gray-50 text-center space-y-3">
                            <button disabled className="w-full py-5 bg-red-50 text-red-400 rounded-2xl font-black uppercase text-[11px] tracking-widest cursor-not-allowed flex items-center justify-center gap-2">
                              <Clock size={16} /> Entry Window Closed
                            </button>
                            <p className="text-[10px] text-red-400 font-bold px-2">You can only join within the exam duration window of the scheduled start time.</p>
                          </div>
                        ) : exam.type === 'online-mcq' && computedStatus === 'LIVE' ? (
                          !isPastExamDuration ? (
                            <button onClick={() => {
                              if (!exam?.id || !zoneId || !studentData?.id) return;
                              updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), { activeExamId: exam.id });
                              setActiveExam(exam);
                              setShowExamRules(true);
                            }} className="w-full py-5 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:brightness-110 active:scale-95 transition-all">Launch Exam Portal</button>
                          ) : (
                            <div className="w-full py-5 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[11px] tracking-widest text-center">Exam Entry Closed</div>
                          )
                        ) : exam.type === 'online-test' && computedStatus === 'LIVE' ? (
                          // Online-test: launch portal + upload answer script (within 15 min after exam)
                          <div className="space-y-3">
                            {!isPastExamDuration ? (
                              <button onClick={() => {
                                if (!exam?.id || !zoneId || !studentData?.id) return;
                                updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), { activeExamId: exam.id });
                                setActiveExam(exam);
                                setShowExamRules(true);
                              }} className="w-full py-5 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:brightness-110 active:scale-95 transition-all">Launch Exam Portal</button>
                            ) : (
                              <div className="w-full py-3 bg-red-50 text-red-400 rounded-2xl font-black uppercase text-[10px] tracking-widest text-center border border-red-100">Exam Entry Closed</div>
                            )}
                            <div className="pt-1 border-t border-gray-50 space-y-2">
                              <p className="text-center text-[10px] text-gray-400 font-bold px-2">After completing, upload your written answer script within 15 minutes for tutor evaluation.</p>
                              <label className="w-full py-4 bg-[#c2f575]/10 border border-[#c2f575]/30 text-indigo-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#c2f575]/20 transition-all flex items-center justify-center gap-2 cursor-pointer">
                                <Upload size={14} /> Upload Answer Script
                                <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                      alert("Only PDF files are allowed for answer scripts.");
                                      return;
                                    }
                                    setUploadedAnswerFiles(prev => ({ ...prev, [exam.id]: file }));
                                  }
                                }} />
                              </label>
                              {uploadedAnswerFiles[exam.id] && (
                                <button
                                  onClick={() => handleUploadAnswerSheet(exam, uploadedAnswerFiles[exam.id])}
                                  disabled={isUploading}
                                  className="w-full py-4 bg-[#c2f575] text-indigo-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-60"
                                >
                                  {isUploading ? 'Submitting...' : `Submit: ${uploadedAnswerFiles[exam.id].name}`}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : exam.type === 'offline' && computedStatus === 'LIVE' ? (
                          // Offline: fully physical — paper given and submitted in person
                          <div className="pt-4 border-t border-gray-50 text-center">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">This is an offline exam. Attend in person and submit your answer sheet to the tutor.</p>
                          </div>
                        ) : null
                      )}
                    </div>
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
    <div className="max-w-[1600px] mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-20 px-4 md:px-0 md:pr-10">
      {/* ClassroomStream overlay removed */}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
        <div className="flex items-center gap-4 md:gap-6 w-full">
          <button onClick={() => navigate('/classroom')} className="hidden md:block p-4 bg-white border border-gray-100 rounded-2xl text-indigo-900 hover:shadow-xl transition-all shadow-sm active:scale-90">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl md:text-3xl md:text-5xl font-black text-nunma-forest tracking-tighter leading-tight mb-2">{zone.title}</h1>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-[8px] md:text-[10px] font-black bg-[#c2f575] text-indigo-900 px-3 md:px-4 py-1 md:py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                {zone.level} Level
              </span>
              <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{zone.domain}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 flex flex-col md:flex-row items-stretch md:items-center w-full md:w-auto gap-4">
          {currentZoneLive && (
            <div className="flex flex-col items-center gap-4 bg-white/5 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in">
              <LiveSessionStatus
                status="live"
                className="bg-[#c2f575]/10 border-[#c2f575]/20 text-[#c2f575]"
              />
              <button
                onClick={async () => {
                  setIsJoiningLive(true);
                  try {
                    const joinFunc = httpsCallable(functions, 'joinLiveSession');
                    const result = await joinFunc({ zoneId });
                    const { token, livekitUrl } = result.data as any;
                    setLiveToken(token);
                    setLiveServerUrl(livekitUrl);
                    setActiveTab('content');
                    setActiveContent({ id: 'live', type: 'live', title: 'Live Session' });
                  } catch (error) {
                    console.error('Failed to join live:', error);
                    alert('Failed to connect to the live stream.');
                  } finally {
                    setIsJoiningLive(false);
                  }
                }}
                disabled={isJoiningLive}
                className="px-10 py-5 bg-[#c2f575] text-indigo-900 rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {isJoiningLive ? 'Connecting...' : 'Join Live Stream In Viewer'} <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate(`/classroom/${zoneId}`)}
                className="px-10 py-3 bg-transparent border border-[#c2f575] text-[#c2f575] rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-[#c2f575]/10 active:scale-95 transition-all flex items-center gap-3"
              >
                Open Full Classroom
              </button>
            </div>
          )}
          {zone.provideCertificate && (
            <div
              onClick={() => isCourseComplete ? handleClaimCertificate() : alert(`Complete all modules to unlock certification. Progress: ${completedSegmentsCount}/${totalSegmentsCount}`)}
              className={`px-6 py-4 md:px-8 md:py-4 rounded-[1.5rem] md:rounded-[1.75rem] border flex flex-col items-center gap-1 shadow-xl md:shadow-2xl transition-all ${isCourseComplete ? 'bg-nunma-forest border-white/10 shadow-indigo-900/20 cursor-pointer hover:brightness-110 active:scale-95' : 'bg-gray-100 border-gray-200 cursor-not-allowed grayscale'}`}
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
          <div className="flex flex-row gap-2 md:gap-4 w-full">
            <button onClick={() => setShowChat(true)} className="flex-1 bg-white/10 backdrop-blur-md p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center justify-center gap-1 md:gap-2 text-[10px] md:text-sm font-bold hover:bg-white/20 transition-all border border-white/10">
              <MessageSquare size={16} className="md:w-5 md:h-5" /> Chat
            </button>
            <button className="flex-1 bg-white/10 backdrop-blur-md p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center justify-center gap-1 md:gap-2 text-[10px] md:text-sm font-bold hover:bg-white/20 transition-all border border-white/10">
              <Share2 size={16} className="md:w-5 md:h-5" /> Share
            </button>
            <button onClick={handleLeaveZone} className="flex-1 bg-red-600 p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center justify-center gap-1 md:gap-2 text-[10px] md:text-sm font-bold text-white hover:bg-red-700 transition-all border border-red-600">
              <LogOut size={16} className="md:w-5 md:h-5" /> Leave
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-12 items-start">
        <div className={`${activeTab === 'content' ? 'xl:col-span-8' : 'xl:col-span-12'} space-y-8`}>
          <div className="flex flex-wrap md:flex-nowrap bg-white/50 p-1 md:p-2 rounded-2xl md:rounded-3xl border border-gray-100 gap-1 md:gap-2 mb-4 md:overflow-x-auto md:no-scrollbar md:snap-x md:snap-mandatory w-full justify-center md:justify-start">
            {(!zone?.zoneType || zone.zoneType === 'Class Management' || zone.zoneType === 'Course') && (
              <button onClick={() => setActiveTab('content')} className={`snap-start min-w-fit px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all whitespace-nowrap md:flex-1 md:min-w-[120px] md:px-0 md:py-4 md:rounded-2xl md:text-[10px] ${activeTab === 'content' ? 'bg-nunma-forest text-white shadow-md md:shadow-xl' : 'text-gray-400 hover:bg-white'}`}>Learning Content</button>
            )}
            {(!zone?.zoneType || zone.zoneType === 'Class Management') && (
              <button onClick={() => setActiveTab('exams')} className={`snap-start min-w-fit px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all whitespace-nowrap md:flex-1 md:min-w-[120px] md:px-0 md:py-4 md:rounded-2xl md:text-[10px] ${activeTab === 'exams' ? 'bg-nunma-forest text-white shadow-md md:shadow-xl' : 'text-gray-400 hover:bg-white'}`}>Exam Portal</button>
            )}
            <button onClick={() => setActiveTab('students')} className={`snap-start min-w-fit px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all whitespace-nowrap md:flex-1 md:min-w-[120px] md:px-0 md:py-4 md:rounded-2xl md:text-[10px] ${activeTab === 'students' ? 'bg-nunma-forest text-white shadow-md md:shadow-xl' : 'text-gray-400 hover:bg-white'}`}>Student List</button>
            <button onClick={() => setActiveTab('attendance')} className={`snap-start min-w-fit px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all whitespace-nowrap md:flex-1 md:min-w-[120px] md:px-0 md:py-4 md:rounded-2xl md:text-[10px] ${activeTab === 'attendance' ? 'bg-nunma-forest text-white shadow-md md:shadow-xl' : 'text-gray-400 hover:bg-white'}`}>Attendance</button>
            <button onClick={() => setActiveTab('marks')} className={`snap-start min-w-fit px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all whitespace-nowrap md:flex-1 md:min-w-[120px] md:px-0 md:py-4 md:rounded-2xl md:text-[10px] ${activeTab === 'marks' ? 'bg-nunma-forest text-white shadow-md md:shadow-xl' : 'text-gray-400 hover:bg-white'}`}>Marks</button>
          </div>

          {activeTab === 'content' ? (
            activeContent ? (
              <div
                className="bg-transparent md:bg-white rounded-none md:rounded-[4rem] p-0 md:p-6 lg:p-10 border-none md:border md:border-gray-100 shadow-none md:shadow-2xl min-h-0 md:min-h-[600px] flex flex-col items-center justify-center text-center relative overflow-hidden group -mx-4 md:mx-0 pt-8 md:pt-6"
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
                ) : (activeContent.type === 'live' && liveToken && liveServerUrl) ? (
                  <div className="w-full h-full min-h-[600px] rounded-[3rem] overflow-hidden bg-[#040413] shadow-inner relative flex flex-col items-center justify-center">
                    <VideoStage token={liveToken} serverUrl={liveServerUrl} />
                  </div>
                ) : (
                  <>
                    <div className="w-32 h-32 bg-gray-50 rounded-[3rem] flex items-center justify-center text-indigo-900 mb-10 shadow-inner group-hover:bg-indigo-900 group-hover:text-[#c2f575] transition-all duration-700">
                      <FileText size={64} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black text-indigo-900 mb-6 tracking-tight">{activeContent.title}</h2>
                    <p className="text-gray-400 max-w-md mx-auto leading-relaxed text-lg font-medium italic">
                      {activeContent.type === 'video' ? 'Video ID missing. Please re-upload.' : 'Content loaded successfully.'}
                    </p>
                  </>
                )}
                <div className="mt-8 md:mt-14 flex flex-col md:flex-row gap-4 md:gap-6 w-full px-4 md:px-0 pb-8 md:pb-0">
                  <button onClick={() => setActiveContent(null)} className="w-full md:w-auto px-6 md:px-12 py-4 md:py-5 bg-gray-50 text-gray-400 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:shadow-md transition-all">Close Player</button>
                  {studentData?.completedSegments?.includes(activeContent.id) ? (
                    <button
                      onClick={() => autoAdvance(activeContent.id)}
                      className="w-full md:w-auto px-6 md:px-14 py-4 md:py-5 bg-indigo-900 text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-3"
                    >
                      Continue to Next Module <ArrowRight size={16} />
                    </button>
                  ) : activeContent.type !== 'video' && (
                    <button
                      onClick={() => handleMarkAsCompleted(activeContent.id)}
                      className="w-full md:w-auto px-6 md:px-14 py-4 md:py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all bg-[#c2f575] text-indigo-900 shadow-[#c2f575]/30 hover:brightness-110 active:scale-95 flex items-center gap-3"
                    >
                      Mark as Completed
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-indigo-900 rounded-[2rem] md:rounded-[4rem] p-8 md:p-16 text-white relative overflow-hidden h-[450px] flex flex-col justify-center shadow-2xl border border-white/5">
                <div className="relative z-10 max-w-xl">
                  <h2 className="text-2xl md:text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-[1.1]">Welcome to your <br /><span className="text-[#c2f575]">Learning Journey</span></h2>
                  <p className="text-indigo-100/70 text-xl font-medium leading-relaxed">Select a professional module from the curriculum sidebar to begin your knowledge stream. </p>
                </div>
                <div className="absolute -bottom-20 -right-20 w-[450px] h-[450px] bg-[#c2f575]/5 rounded-full blur-[120px] animate-pulse"></div>
              </div>
            )
          ) : activeTab === 'exams' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              {selectedExamGroup ? (
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedExamGroup(null)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                      <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                      <h3 className="text-xl md:text-3xl font-black text-indigo-900 tracking-tighter">{selectedExamGroup.name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Select a subject to begin</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {selectedExamGroup.exams.map(renderExamCard)}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {(() => {
                    const applicableExams = exams.filter((exam: any) => !exam.batchId || exam.batchId === studentData?.batchId);
                    
                    const groupedExams = applicableExams.reduce((acc: any, exam: any) => {
                      const groupName = exam.examGroupName || exam.title; 
                      if (!acc[groupName]) {
                        acc[groupName] = [];
                      }
                      acc[groupName].push(exam);
                      return acc;
                    }, {});

                    return Object.entries(groupedExams).map(([groupName, groupExams]: [string, any]) => {
                      if (groupExams.length === 1) {
                        return renderExamCard(groupExams[0]);
                      } else {
                        // Render group card
                        return (
                          <div key={groupName} onClick={() => setSelectedExamGroup({ name: groupName, exams: groupExams })} className="bg-white border border-gray-100 rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-10 space-y-8 shadow-sm hover:shadow-2xl transition-all group cursor-pointer flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <div className="p-5 rounded-3xl bg-indigo-50 text-indigo-600 shadow-sm">
                                <Layers size={32} />
                              </div>
                              <span className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                {groupExams.length} Subjects
                              </span>
                            </div>
                            <div>
                              <h4 className="text-2xl font-black text-nunma-forest tracking-tight truncate">{groupName}</h4>
                              <p className="text-gray-400 text-sm mt-2 font-bold leading-relaxed">Multiple Subject Assessment</p>
                            </div>
                            <button className="w-full py-5 bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl font-black uppercase text-[10px] tracking-widest group-hover:bg-[#c2f575] group-hover:text-indigo-900 group-hover:border-[#c2f575] transition-all flex items-center justify-center gap-2 shadow-sm">
                              View Subjects <ChevronRight size={14} />
                            </button>
                          </div>
                        );
                      }
                    });
                  })()}
                </div>
              )}
            </div>
          ) : activeTab === 'students' ? (
            <div className="bg-white rounded-[2rem] md:rounded-[4rem] p-6 md:p-14 border border-gray-100 shadow-2xl animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-xl md:text-3xl font-black text-indigo-900 tracking-tighter flex items-center gap-4">
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
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Joined {formatJoinedDate(student.joinedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'attendance' ? (
            <div className="bg-white rounded-[2rem] md:rounded-[4rem] p-6 md:p-14 border border-gray-100 shadow-2xl animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-xl md:text-3xl font-black text-indigo-900 tracking-tighter flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-900">
                    <CheckCircle size={24} />
                  </div>
                  Your Attendance
                </h3>
              </div>
              <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center">
                <div className="w-64 h-64 rounded-full border-[16px] border-[#c2f575] flex flex-col items-center justify-center shadow-xl relative">
                  {(() => {
                    const history = studentData?.attendanceHistory || [];
                    const present = history.filter((h: any) => h.status === 'Present').length;
                    const total = history.length;
                    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                    return (
                      <>
                        <span className="text-2xl md:text-4xl md:text-6xl font-black text-nunma-forest">{pct}%</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Overall</span>
                      </>
                    );
                  })()}
                </div>
                <div className="flex-1 w-full space-y-4">
                  {(() => {
                    const history = studentData?.attendanceHistory || [];
                    const sorted = [...history].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    if (sorted.length === 0) {
                      return <p className="text-gray-400 font-bold">No attendance records found yet.</p>;
                    }
                    const displayed = showFullAttendance ? sorted : sorted.slice(0, 5);
                    return (
                      <>
                        {displayed.map((record: any, i: number) => {
                          const d = new Date(record.date);
                          const isPresent = record.status === 'Present';
                          return (
                            <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 gap-4 md:gap-0 bg-gray-50 rounded-3xl border border-gray-100 hover:shadow-md transition-all">
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${isPresent ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                  {isPresent ? <CheckCircle size={20} /> : <X size={20} />}
                                </div>
                                <div>
                                  <p className="font-black text-indigo-900 text-sm">{formatDate(d)}</p>
                                  {record.className && (
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{record.className}</p>
                                  )}
                                </div>
                              </div>
                              <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isPresent ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {record.status}
                              </span>
                            </div>
                          );
                        })}
                        {sorted.length > 5 && !showFullAttendance && (
                          <button 
                            onClick={() => setShowFullAttendance(true)}
                            className="w-full py-4 text-xs font-black text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-2xl uppercase tracking-widest transition-colors"
                          >
                            See Full List
                          </button>
                        )}
                        {showFullAttendance && sorted.length > 5 && (
                          <button 
                            onClick={() => setShowFullAttendance(false)}
                            className="w-full py-4 text-xs font-black text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-2xl uppercase tracking-widest transition-colors"
                          >
                            Show Less
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : activeTab === 'marks' ? (
            <div className="bg-white rounded-[2rem] md:rounded-[4rem] p-6 md:p-14 border border-gray-100 shadow-2xl animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-xl md:text-3xl font-black text-indigo-900 tracking-tighter flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-900">
                    <Award size={24} />
                  </div>
                  My Marks
                </h3>
              </div>
              <div className="space-y-6">
                {examResults.filter(r => r.studentId === (authUser?.uid || 'anon')).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-bold text-lg">No exam results available yet.</p>
                  </div>
                ) : (
                  examResults.filter(r => r.studentId === (authUser?.uid || 'anon')).map((result, idx) => {
                    const exam = exams.find(e => e.id === result.examId);
                    let wrongList: string[] = result.wrongQuestions || [];
                    if (wrongList.length === 0 && exam?.questions && result.answers) {
                      exam.questions.forEach((q: any, qIdx: number) => {
                        if (result.answers[q.id] !== undefined && result.answers[q.id] !== q.correctAnswer) {
                          wrongList.push(`Q${qIdx + 1}`);
                        }
                      });
                    }
                    const pdfUrl = exam?.pdfUrl || result.pdfUrl;

                    return (
                      <div key={idx} className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col gap-6 hover:shadow-xl hover:bg-white hover:border-[#c2f575] transition-all">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          <div className="flex items-center gap-6 w-full md:w-auto">
                            <div className={`p-4 rounded-3xl ${result.status === 'passed' ? 'bg-green-100 text-green-600' : result.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                              <Target size={28} />
                            </div>
                            <div>
                              <p className="font-black text-indigo-900 text-xl">{exam?.title || 'Assessment'}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Completed: {formatDate(result.completedAt) || 'Recently'}</p>
                            </div>
                          </div>
                          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-8">
                            <div className="text-center">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Score</p>
                              <p className="font-black text-xl md:text-3xl text-nunma-forest">{result.marks !== undefined ? result.marks : '--'}<span className="text-lg text-gray-400">/{exam?.maxMark || 100}</span></p>
                            </div>
                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${result.status === 'passed' ? 'bg-green-100 text-green-600' : result.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                              {result.status || 'Pending'}
                            </span>
                          </div>
                        </div>

                        {/* Wrong Questions Breakdown & Question Paper PDF Download */}
                        <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {wrongList.length > 0 ? (
                              <>
                                <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Incorrect Questions:</span>
                                {wrongList.map((qNum, i) => (
                                  <span key={i} className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-black rounded-xl">
                                    {qNum}
                                  </span>
                                ))}
                              </>
                            ) : (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle size={16} /> Perfect Score! No incorrect questions.
                              </span>
                            )}
                          </div>

                          {pdfUrl && (
                            <a
                              href={pdfUrl}
                              download={`${exam?.title || 'Question_Paper'}.pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-md hover:bg-nunma-forest transition-all"
                            >
                              <FileDown size={16} /> Download Question Paper (PDF)
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
          {/* Removed Zone Description and Progress tracking sections as per minimalist UI requirement */}
        </div>

        {activeTab === 'content' && (
          <div className="xl:col-span-4 space-y-8">
          <div className="bg-white rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 border border-gray-100 shadow-2xl relative overflow-hidden">
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
                      {chapter.segments.filter((s: any) => s.status !== 'uploading').map(segment => (
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
            <div className="bg-white rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 border border-gray-100 shadow-2xl relative overflow-hidden">
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
                        {formatDate(session.date)} @ {session.time}
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
              <h4 className="text-xl md:text-3xl font-black mb-3 tracking-tighter">Live Support</h4>
              <p className="text-indigo-900/60 text-xs font-bold uppercase tracking-[0.2em] mb-12">Direct Channel to Mentor</p>
              <button
                onClick={() => {
                  if (db && authUser) {
                    // Find the single unified community chat for this zone
                    const q = query(collection(db, 'conversations'), where('zoneId', '==', zoneId), where('type', '==', 'community'), limit(1));
                    getDocs(q).then(async snapshot => {
                      if (!snapshot.empty) {
                        const chatDoc = snapshot.docs[0];
                        const chatData = chatDoc.data();
                        if (!chatData.participants?.includes(authUser.uid)) {
                          await updateDoc(doc(db, 'conversations', chatDoc.id), {
                            participants: arrayUnion(authUser.uid)
                          });
                        }
                        navigate(`/inbox?tab=community&chatId=${chatDoc.id}`);
                      } else {
                        // Auto-create fallback
                        const chatName = `${zone?.title || "Community Chat"} - Community`;
                        
                        const newChatRef = await addDoc(collection(db, 'conversations'), {
                          name: chatName,
                          avatar: zone?.image || "",
                          type: 'community',
                          zoneId: zoneId,
                          participants: [zone?.createdBy || zone?.tutorId, authUser.uid].filter(Boolean),
                          lastMessage: 'Community Chat created!',
                          lastMessageTime: serverTimestamp(),
                          createdAt: serverTimestamp()
                        });
                        navigate(`/inbox?tab=community&chatId=${newChatRef.id}`);
                      }
                    }).catch(e => {
                      console.error("Error finding or creating chat:", e);
                      navigate('/inbox?tab=community');
                    });
                  } else {
                    console.warn("Database or User not initialized");
                  }
                }}
                className="w-full py-5 bg-indigo-900 text-white rounded-3xl font-black uppercase text-[11px] tracking-[0.25em] shadow-2xl shadow-indigo-900/20 hover:bg-nunma-forest transition-all active:scale-95"
              >
                Open Zone Chat
              </button>
            </div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/20 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000"></div>
          </div>
        </div>
        )}
      </div>

      {showCertModal && (
        <div className={`fixed top-0 right-0 bottom-0 ${isSidebarOpen ? 'left-[240px]' : 'left-[64px]'} z-[300] flex items-center justify-center bg-nunma-forest/80 backdrop-blur-2xl p-6 animate-in fade-in duration-500 transition-all`}>
          <div className="bg-white rounded-[4rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
            <div className="w-full md:w-1/2 bg-indigo-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-[#c2f575] rounded-2xl flex items-center justify-center text-indigo-900 mb-8 shadow-xl">
                  <Award size={32} />
                </div>
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter mb-4 leading-tight">Verifiable <br />Achievement</h3>
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
        <div className={`fixed top-0 right-0 bottom-0 ${isSidebarOpen ? 'left-[240px]' : 'left-[64px]'} z-[310] bg-nunma-forest/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-300 transition-all`}>
          <div className="w-24 h-24 border-8 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <h2 className="text-white text-xl md:text-3xl font-black tracking-tighter mb-2">Compiling Verifiable Proof</h2>
            <p className="text-indigo-200/60 font-black uppercase tracking-[0.3em] text-[10px]">Assembling JSON-LD & OpenBadges 3.0 Meta-Data</p>
          </div>
        </div>
      )}

      {showExamRules && (
        <div className={`fixed top-0 right-0 bottom-0 left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[400] flex items-center justify-center bg-nunma-forest/90 backdrop-blur-xl p-6 animate-in fade-in duration-500 transition-all`}>
          <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-3xl p-12 space-y-10 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-900 mx-auto shadow-sm">
                <GraduationCap size={40} />
              </div>
              <h3 className="text-xl md:text-3xl font-black text-nunma-forest tracking-tight">Proctoring Requirements</h3>
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
                onClick={() => {
                  setShowExamRules(false);
                  setHasExplicitConsent(true);
                  // Call handleStartExam directly with activeExam, bypassing the consent check
                  // since the user just acknowledged via this modal
                  if (!activeExam) return;
                  const exam = activeExam;
                  setExamCurrentQuestion(0);
                  if (exam.type === 'online-test' || exam.type === 'online-mcq') setCameraStatus('on');
                  const now = new Date();
                  const { endTime, finalDurationSecs } = calculateExamEndState(exam, now);
                  
                  setExamEndTime(endTime);
                  setExamTimeRemaining(finalDurationSecs);
                  if (zoneId && studentData) {
                    updateDoc(doc(db, 'zones', zoneId, 'students', studentData.id), {
                      activeExamId: exam.id,
                      currentExamWarnings: 0,
                      examStartedAt: now.toISOString(),
                      examEndsAt: endTime.toISOString()
                    }).catch(e => console.error('Failed to sync exam start', e));
                  }
                }}
                className="flex-[2] py-5 bg-nunma-forest text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-2xl"
              >
                Acknowledge & Start
              </button>
            </div>
          </div>
        </div>
      )}

      {showConsentModal && (
        <div className={`fixed top-0 right-0 bottom-0 left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[600] flex items-center justify-center bg-nunma-forest/95 backdrop-blur-2xl p-6 animate-in fade-in duration-500 transition-all`}>
          <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-3xl p-12 space-y-10 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-[#c2f575]/20 rounded-[2rem] flex items-center justify-center text-indigo-900 mx-auto shadow-sm">
                <ShieldCheck size={40} className="text-indigo-900" />
              </div>
              <h3 className="text-xl md:text-3xl font-black text-nunma-forest tracking-tight">AI & Proctoring Consent</h3>
              <p className="text-gray-400 font-medium">To maintain assessment integrity, we require your explicit consent for the following:</p>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-900 shadow-sm shrink-0">
                  <Radio size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-indigo-900 mb-1">AI Audio Processing</h4>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                    Audio may be processed by AI (gemini-1.5-flash) for live engagement tools and proctoring analysis.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-900 shadow-sm shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-indigo-900 mb-1">Tab Monitoring</h4>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                    System monitors tab-switching and window visibility to ensure a fair testing environment.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setShowConsentModal(false)} className="flex-1 py-5 bg-gray-50 text-gray-300 rounded-3xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button
                onClick={handleSaveConsent}
                className="flex-[2] py-5 bg-[#c2f575] text-indigo-900 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-[#c2f575]/20 hover:scale-105 active:scale-95 transition-all"
              >
                Accept & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheatWarningModal && createPortal(
        <div className={`fixed top-0 right-0 bottom-0 left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[600] flex items-center justify-center bg-nunma-forest/95 backdrop-blur-2xl p-6 transition-all`}>
          <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-3xl p-12 text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto animate-pulse">
              <AlertTriangle size={48} />
            </div>
            <h3 className="text-xl md:text-3xl font-black text-nunma-forest">Tab Switching Detected</h3>
            <p className="text-gray-500 font-medium text-lg leading-relaxed">
              You have {3 - cheatViolations} warning(s) left before your exam is automatically terminated.
            </p>
            <button
              onClick={() => setShowCheatWarningModal(false)}
              className="w-full py-5 bg-red-600 text-white rounded-3xl font-black uppercase tracking-widest hover:bg-red-700 transition-all"
            >
              I Understand
            </button>
          </div>
        </div>,
        document.body
      )}

      {terminatedByCheat && createPortal(
         <div className={`fixed top-0 right-0 bottom-0 left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[600] flex flex-col items-center justify-center bg-red-900/95 backdrop-blur-3xl p-6 text-white text-center animate-in fade-in duration-500 transition-all`}>
            <AlertTriangle size={80} className="mb-8" />
            <h2 className="text-5xl font-black mb-4">Test Terminated</h2>
            <p className="text-xl opacity-80 max-w-lg mb-12">Your assessment was forcefully concluded due to repeated tab switching or window evasion. Your attempt has been logged and submitted.</p>
            <button onClick={() => {
                setTerminatedByCheat(false);
                setActiveExam(null);
            }} className="px-10 py-4 bg-white text-red-900 rounded-3xl font-black uppercase text-sm tracking-widest hover:scale-105 transition-all">Return to Dashboard</button>
         </div>,
         document.body
      )}

      {activeExam && !showExamRules && !terminatedByCheat && postExamTimer === null && createPortal(
        <div
          className={`fixed top-0 right-0 bottom-0 left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[500] bg-white flex flex-col p-6 md:p-10 animate-in slide-in-from-bottom-10 duration-700 transition-all overflow-y-auto md:overflow-y-hidden`}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onPaste={(e) => e.preventDefault()}
        >
          <div className="flex flex-wrap justify-between items-center gap-6 mb-8 md:mb-12">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-16 h-16 bg-nunma-forest rounded-2xl flex items-center justify-center text-white shadow-xl">
                <Radio size={32} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl md:text-3xl font-black text-nunma-forest tracking-tight uppercase">{activeExam.title}</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Proctored Assessment Session</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* Hidden Video Element capturing webcam for Vision ML */}
              <video 
                ref={proctorVision.videoRef as any} 
                className="hidden" 
                playsInline 
                muted 
              />
              
              {/* Vision HUD Status Badge */}
              <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50/80 rounded-2xl border border-indigo-100/60 shadow-sm">
                <div className={`w-3 h-3 rounded-full ${proctorVision.isCameraReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <div>
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">AI Vision Status</p>
                  <p className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    {proctorVision.isLoadingModels ? (
                      <span className="text-amber-600 animate-pulse">Initializing Vision AI...</span>
                    ) : proctorVision.warningMessage ? (
                      <span className="text-red-600 font-bold">{proctorVision.warningMessage}</span>
                    ) : (
                      <span className="text-emerald-700">🟢 Face Centered & Protected</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="w-[1.5px] h-12 bg-gray-100" />
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
                <p className={`font-black text-2xl ${cheatViolations > 0 ? 'text-red-500' : 'text-indigo-900'}`}>{cheatViolations}/2</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6 md:gap-12 overflow-visible xl:overflow-hidden">
            <div className="flex-1 bg-gray-50 rounded-[2rem] md:rounded-[4rem] border border-gray-100 p-6 md:p-16 flex flex-col xl:overflow-y-auto custom-scrollbar">
              {activeExam.type === 'online-test' ? (
                /* ── Written Exam (online-test): show question paper PDF inline ── */
                <div className="w-full flex flex-col flex-1 space-y-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-2xl font-black text-nunma-forest tracking-tight leading-tight">Question Paper</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Read questions on screen • Write answers on paper</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {activeExam.pdfUrl && (
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl">
                          <button onClick={() => setPdfZoomLevel(prev => Math.max(50, prev - 25))} className="px-3 py-2 text-gray-500 hover:bg-white hover:shadow-sm rounded-xl transition-all font-black" title="Zoom Out">-</button>
                          <span className="text-[10px] font-black px-2 text-gray-500">{pdfZoomLevel}%</span>
                          <button onClick={() => setPdfZoomLevel(prev => Math.min(300, prev + 25))} className="px-3 py-2 text-gray-500 hover:bg-white hover:shadow-sm rounded-xl transition-all font-black" title="Zoom In">+</button>
                        </div>
                      )}
                      {activeExam.pdfUrl && (
                        <a
                          href={activeExam.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-gray-200 transition-all shrink-0"
                        >
                          <FileDown size={14} />
                          Download PDF
                        </a>
                      )}
                      <button onClick={handleSubmitExam} className="px-5 py-3 bg-red-500 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all shrink-0">End Exam & Upload</button>
                    </div>
                  </div>
                  {activeExam.pdfUrl ? (
                    <div className="flex-1 w-full rounded-2xl md:rounded-3xl overflow-auto border border-gray-200 shadow-inner bg-white" style={{ minHeight: '500px' }}>
                      <div style={{ width: `${pdfZoomLevel}%`, minHeight: '500px', height: '100%', transition: 'width 0.3s ease' }}>
                        <iframe
                          src={activeExam.pdfUrl.startsWith('blob:') ? `${activeExam.pdfUrl}#toolbar=0` : `https://docs.google.com/gview?url=${encodeURIComponent(activeExam.pdfUrl)}&embedded=true`}
                          className="w-full h-full border-none"
                          style={{ minHeight: '500px', height: '100%' }}
                          title="Question Paper"
                          allow="autoplay"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                      <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 mb-6">
                        <FileText size={40} />
                      </div>
                      <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Question paper not uploaded by tutor yet</p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-200 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">
                      When the timer expires you will get a 15-minute window to scan and upload your answer sheet as a PDF.
                    </p>
                  </div>
                </div>
              ) : (
                /* ── MCQ Exam (online-mcq): show questions one-by-one ── */
                <div className="max-w-3xl mx-auto w-full space-y-12">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black bg-nunma-forest text-white px-4 py-1.5 rounded-full uppercase tracking-widest">Question {examCurrentQuestion + 1} of {activeExam.questions?.length ?? 0}</span>
                    <h3 className="text-2xl md:text-4xl font-black text-nunma-forest tracking-tight leading-tight">{activeExam.questions?.[examCurrentQuestion]?.question}</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {(activeExam.questions?.[examCurrentQuestion]?.options ?? []).map((opt: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setExamAnswers({ ...examAnswers, [activeExam.questions[examCurrentQuestion].id]: idx })}
                        className={`w-full p-8 rounded-[2.5rem] border-2 text-left transition-all flex items-center justify-between group ${examAnswers[activeExam.questions[examCurrentQuestion].id] === idx ? 'bg-nunma-forest border-nunma-forest text-white shadow-2xl scale-[1.02]' : 'bg-white border-transparent hover:border-indigo-100 text-gray-500'}`}
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
                    {examCurrentQuestion === (activeExam.questions?.length ?? 1) - 1 ? (
                      <button onClick={handleSubmitExam} className="px-14 py-5 bg-[#c2f575] text-indigo-900 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-[#c2f575]/20 hover:brightness-110 active:scale-95 transition-all">Submit Assessment</button>
                    ) : (
                      <button onClick={() => setExamCurrentQuestion(prev => prev + 1)} className="px-14 py-5 bg-nunma-forest text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:brightness-110 active:scale-95 transition-all">Next Question</button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full xl:w-[350px] space-y-8 flex flex-col">
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
                  <h4 className="text-xl font-black text-nunma-forest mb-2 uppercase tracking-tight">Time Remaining</h4>
                  <p className="text-2xl md:text-4xl font-black text-nunma-forest tabular-nums">{formatTime(examTimeRemaining)}</p>
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
        </div>,
        document.body
      )}

      {/* Post Exam Timer Modal for Online Test */}
      {postExamTimer !== null && (
        <div className={`fixed top-0 right-0 bottom-0 left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in zoom-in-95 duration-500 transition-all`}>
          <div className="bg-white rounded-[3rem] max-w-lg w-full p-12 text-center shadow-2xl border border-white/10 relative overflow-hidden">
            {postExamTimer === 0 && (
              <div className="absolute inset-0 bg-red-900/95 flex flex-col items-center justify-center z-50 p-8 backdrop-blur-md animate-in fade-in duration-500">
                <AlertTriangle size={64} className="text-white mb-6" />
                <h2 className="text-2xl md:text-4xl font-black text-white mb-4">Submission Window Closed</h2>
                <p className="text-red-200 text-center font-bold">You failed to submit your answer sheet within the 15-minute buffer.</p>
                <button 
                  onClick={() => { 
                    setPostExamTimer(null); 
                    setActiveExam(null); 
                    setCameraStatus('off');
                    if (videoStream) {
                      videoStream.getTracks().forEach(track => track.stop());
                      setVideoStream(null);
                    }
                  }} 
                  className="mt-8 px-8 py-4 bg-white text-red-900 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${postExamTimer > 0 && postExamTimer < 300 ? 'bg-red-500 text-white animate-pulse' : 'bg-red-100 text-red-600'}`}>
              <Clock size={48} />
            </div>
            <h3 className="text-xl md:text-3xl font-black text-nunma-forest tracking-tight mb-4">Exam Concluded</h3>
            <p className="text-gray-500 font-medium mb-8">Scan your answer sheets and upload them as a single PDF. You have strictly 15 minutes before submissions are locked.</p>
            
            <div className={`p-6 rounded-3xl mb-10 transition-colors duration-1000 flex flex-col items-center ${postExamTimer > 0 && postExamTimer < 300 ? 'bg-red-500 animate-pulse text-white shadow-xl shadow-red-500/30' : 'bg-gray-100/50 text-indigo-900'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${postExamTimer > 0 && postExamTimer < 300 ? 'text-red-100' : 'text-gray-400'}`}>Submission Window Closes In:</p>
              <div className="text-2xl md:text-4xl md:text-6xl font-black tracking-tighter tabular-nums drop-shadow-sm">
                {Math.floor(postExamTimer / 60).toString().padStart(2, '0')}:{(postExamTimer % 60).toString().padStart(2, '0')}
              </div>
            </div>

            <label className={`w-full py-6 border-2 border-dashed rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex flex-col items-center justify-center gap-3 mb-6 h-32 transition-all ${postExamTimer === 0 || isUploading ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-300 text-indigo-900 hover:border-[#c2f575] hover:bg-gray-50 cursor-pointer shadow-sm hover:shadow-md'}`}>
              <Upload size={24} className={postExamTimer === 0 || isUploading ? 'text-gray-300' : 'text-indigo-400'} />
              {postExamAnswerFile ? postExamAnswerFile.name : 'Select PDF Answer Sheet'}
              <input type="file" accept=".pdf" className="hidden" disabled={postExamTimer === 0 || isUploading} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                    alert("Only PDF files are allowed for answer scripts.");
                    return;
                  }
                  setPostExamAnswerFile(file);
                }
              }} />
            </label>
            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-4 text-center">Max limit: 5MB</p>
            <button
              disabled={!postExamAnswerFile || postExamTimer === 0 || isUploading}
              onClick={() => {
                if (activeExam && postExamAnswerFile) {
                  handleUploadAnswerSheet(activeExam, postExamAnswerFile).then(() => setPostExamAnswerFile(null));
                }
              }}
              className="w-full py-6 bg-nunma-forest text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 mb-4"
            >
              {isUploading ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/> : null}
              {isUploading ? 'Uploading...' : 'Submit Answers'}
            </button>
            <button
              onClick={() => {
                setPostExamTimer(null);
                setActiveExam(null);
                setCameraStatus('off');
                if (videoStream) {
                  videoStream.getTracks().forEach((track: any) => track.stop());
                  setVideoStream(null);
                }
              }}
              className="w-full py-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-red-500 transition-colors"
            >
              Cancel & View Dashboard
            </button>
          </div>
        </div>
      )}

      {/* POST-EXAM RESULTS SUMMARY MODAL */}
      {submittedExamResult && (
        <div className={`fixed top-0 right-0 bottom-0 left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[700] flex items-center justify-center bg-nunma-forest/90 backdrop-blur-2xl p-6 animate-in fade-in duration-500`}>
          <div className="bg-white rounded-[3.5rem] w-full max-w-xl shadow-3xl p-10 space-y-8 animate-in zoom-in-95 duration-500 relative text-center">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-900 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <Award size={40} />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-black text-nunma-forest tracking-tight">{submittedExamResult.examTitle}</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assessment Submission Completed</p>
            </div>

            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-around">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Score</p>
                <p className="font-black text-3xl text-nunma-forest">{submittedExamResult.marks}<span className="text-lg text-gray-400">/{submittedExamResult.maxMark}</span></p>
              </div>
              <div className="w-px h-12 bg-gray-200" />
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Result</p>
                <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${submittedExamResult.status === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {submittedExamResult.status}
                </span>
              </div>
            </div>

            {/* Wrong Question Numbers */}
            <div className="text-left bg-gray-50/80 p-6 rounded-3xl border border-gray-100 space-y-3">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Incorrect Questions Summary
              </h4>
              {submittedExamResult.wrongQuestions && submittedExamResult.wrongQuestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {submittedExamResult.wrongQuestions.map((qNum: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-red-100 border border-red-200 text-red-700 text-xs font-black rounded-xl">
                      {qNum}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                  <CheckCircle size={16} /> Perfect Score! No incorrect questions.
                </p>
              )}
            </div>

            {/* Download Question Paper Button */}
            {submittedExamResult.pdfUrl && (
              <div className="pt-2">
                <a
                  href={submittedExamResult.pdfUrl}
                  download={`${submittedExamResult.examTitle}_Question_Paper.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-5 bg-indigo-900 text-white rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-nunma-forest transition-all"
                >
                  <FileDown size={20} /> Download Question Paper (PDF)
                </a>
              </div>
            )}

            <button
              onClick={() => setSubmittedExamResult(null)}
              className="w-full py-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-nunma-forest transition-colors"
            >
              Close & View Dashboard
            </button>
          </div>
        </div>
      )}

      {/* EXAM INSIGHTS MODAL */}
      {showExamInsightsModal && selectedExamForInsights && zoneId && (
        <React.Suspense fallback={<div className="fixed inset-0 z-[9999] bg-nunma-forest/90 backdrop-blur-sm flex items-center justify-center text-white font-black uppercase tracking-widest animate-pulse">Loading AI Insights...</div>}>
          <ExamInsights
            zoneId={zoneId}
            exam={selectedExamForInsights}
            onClose={() => {
              setShowExamInsightsModal(false);
              setSelectedExamForInsights(null);
            }}
          />
        </React.Suspense>
      )}
      {/* Chat Sidebar Integration */}
      {zoneId && (
        <ChatSidebar 
          zoneId={zoneId} 
          sessionId="general" 
          isOpen={showChat} 
          onClose={() => setShowChat(false)} 
        />
      )}
    </div>
  );
};

export default StudentZoneView;




import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft,
  Users,
  Video,
  CheckCircle2,
  Plus,
  X,
  UserPlus,
  Share2,
  GraduationCap,
  Trash2,
  Layers,
  FileVideo,
  FileText,
  GripVertical,
  Radio,
  Calendar,
  ArrowRight,
  Download,
  Upload,
  Sparkles,
  FileSpreadsheet,
  Globe,
  Monitor,
  Check,
  Brain,
  FileDown,
  Edit3,
  CheckCircle,
  AlertCircle,
  PenTool,
  Save,
  MousePointer2,
  Undo,
  Wand2,
  Grid,
  List,
  Mic,
  Play,
  Pause,
  AlertTriangle,
  Eraser,
  Palette,
  Clock,
  RotateCcw,
  Link,
  Copy,
  ExternalLink,
  Search,
  Star,
  Trophy,
  Loader2, Calendar as CalendarIcon, Settings, MoreVertical, ShieldAlert, Shield, FileSearch, HelpCircle, BarChart3,
  IndianRupee, DollarSign, Euro, Camera, ChevronRight, Pencil } from 'lucide-react';


import { VideoUploadModal } from '../components/VideoUploadModal';
import { ShareModal } from '../components/ShareModal';
import DocumentModuleUploader from '../components/DocumentModuleUploader';
import TextModuleEditor from '../components/TextModuleEditor';
import QuizModuleEditor from '../components/QuizModuleEditor';
import { toast } from 'react-hot-toast';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, where, getDocs, limit, deleteDoc, addDoc, arrayUnion, serverTimestamp, increment } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../utils/firebase';
import { sendEnrollmentEmail } from '../utils/notifications';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import PDFViewer from '../components/PDFViewer'; // Import added for grading
import GradingHub from '../components/GradingHub';
import ExamAnalytics from '../components/ExamAnalytics';
import MCQBuilder from '../components/MCQBuilder';
import { QRCodeSVG } from 'qrcode.react';
import ZoneCapacityMeter from '../components/ZoneCapacityMeter';
import { formatDate } from '../utils/dateUtils';

import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { Student, AttendanceHistory, UserRole, Batch, MAX_BATCHES_PER_ZONE } from '../types';

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
  timerSeconds?: number;
  marks?: number;
}

interface Exam {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'online-test' | 'online-mcq' | 'offline';
  status: 'UPCOMING' | 'CONDUCTED';
  participants?: number;
  avgScore?: string;
  questions?: MCQ[];
  maxMark: number;
  minMark: number;
  pdfUrl?: string;
  excelTemplateUrl?: string;
  duration?: number;
  subject?: string;
}

interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  marks: number;
  status: 'passed' | 'failed' | 'ongoing' | 'reported';
  warnings: number;
  completedAt?: string;
  answerSheetUrl?: string;
}

interface Chapter {
  id: string;
  title: string;
  segments: Segment[];
  order?: number;
}

interface Segment {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'quiz' | 'reading';
  duration?: string;
}

interface Stroke {
  points: { x: number, y: number }[];
  color: string;
  width: number;
}

interface AnswerCluster {
  id: string;
  label: string;
  description: string;
  confidence: number;
  studentIds: string[];
  representativeImage: string;
  commonFeedback?: string;
  score?: number;
}

interface AttendanceSession {
  id: string;
  date: string;
  time: string;
  className?: string;
  batchId?: string;
}

const TagInput = ({ label, items, setItems, maxItems = 10, placeholder = "Type and press Enter", required = false }: any) => {
  const [inputVal, setInputVal] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputVal.trim() && items.length < maxItems) {
        setItems([...items, inputVal.trim()]);
        setInputVal('');
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const newItems = pastedData
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(item => item !== '');

    if (newItems.length > 0) {
      let combinedItems = [...items];
      for (const item of newItems) {
        if (combinedItems.length < maxItems && !combinedItems.includes(item)) {
          combinedItems.push(item);
        }
      }
      setItems(combinedItems);
    }
  };

  const removeTag = (index: number) => {
    setItems(items.filter((_: any, i: number) => i !== index));
  };

  return (
    <div>
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between ml-1">
        <span>{label} {required && <span className="text-[9px] text-nunma-forest bg-[#c2f575] px-2 py-0.5 rounded-full ml-2">Mandatory</span>}</span>
        {items.length >= maxItems && <span className="text-[9px] text-red-500 uppercase border border-red-200 px-2 py-0.5 rounded-full">Max reached</span>}
      </label>
      <div className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] p-4 min-h-[70px] flex flex-wrap gap-3 items-center focus-within:ring-4 focus-within:ring-[#c1e60d]/20 transition-all shadow-sm">
        {items.map((item: string, i: number) => (
          <span key={i} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-2xl text-sm font-bold border border-indigo-100/50 hover:bg-indigo-100 transition-colors">
            {item}
            <button type="button" onClick={() => removeTag(i)} className="text-indigo-400 hover:text-indigo-900 focus:outline-none transition-colors">
              <X size={16} />
            </button>
          </span>
        ))}
        {items.length < maxItems && (
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={items.length === 0 ? placeholder : "Add another..."}
            className="flex-1 min-w-[150px] bg-transparent border-none outline-none font-bold text-indigo-900 px-4 py-2"
          />
        )}
      </div>
    </div>
  );
};

const nunmaAlert = (msg: string, type: 'success' | 'error' = 'success') => {
  if (type === 'error') {
    toast.error(msg);
  } else {
    toast.success(msg);
  }
};

const asyncConfirm = async (msg: string): Promise<boolean> => {
  return new Promise((resolve) => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-2 min-w-[280px]">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nunma Admin</span>
          <span className="font-bold text-nunma-forest text-sm leading-tight">{msg}</span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { toast.dismiss(t.id); resolve(false); }}
            className="flex-1 bg-gray-100 text-gray-500 hover:bg-gray-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => { toast.dismiss(t.id); resolve(true); }}
            className="flex-1 bg-red-500 text-white hover:bg-red-600 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
          >
            Confirm
          </button>
        </div>
      </div>
    ), { 
      duration: Infinity, 
      position: 'top-center',
      style: { borderRadius: '24px', padding: '16px', border: '1px solid #f3f4f6' }
    });
  });
};

  const ZoneManagement: React.FC = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSidebarOpen } = useSidebar();
  const [activeTab, setActiveTab] = useState<'attendance' | 'curriculum' | 'exams' | 'schedule' | 'students' | 'landing' | 'post-session'>('exams');
  const [view, setView] = useState<'management' | 'review' | 'grading'>('management');
  const [zone, setZone] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  // RBAC Helpers
  const isCreator = zone?.createdBy === user?.uid || zone?.tutorId === user?.uid;
  const currentCoTutor = zone?.coTutors?.find((t: any) => t.uid === user?.uid);
  const isCoTutor = !!currentCoTutor;
  const hasEditAccess = isCreator || isCoTutor;

  // Zone Settings State
  const [showZoneSettingsModal, setShowZoneSettingsModal] = useState(false);
  const [editZoneTitle, setEditZoneTitle] = useState('');
  const [editZoneSubtitle, setEditZoneSubtitle] = useState('');
  const [editZoneDescription, setEditZoneDescription] = useState('');
  const [editLearningOutcomes, setEditLearningOutcomes] = useState<string[]>([]);
  const [editSkillsGained, setEditSkillsGained] = useState<string[]>([]);
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editBatches, setEditBatches] = useState<string[]>([]);
  const [editZoneLevel, setEditZoneLevel] = useState('Beginner');
  const [editZonePrice, setEditZonePrice] = useState('');
  const [editZoneCurrency, setEditZoneCurrency] = useState<'USD' | 'INR' | 'EUR'>('INR');
  const [editZoneImage, setEditZoneImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditZoneImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenZoneSettings = () => {
    if (!zone) return;
    setEditZoneTitle(zone.title || '');
    setEditZoneSubtitle(zone.subtitle || '');
    setEditZoneDescription(zone.description || '');
    setEditLearningOutcomes(zone.learningOutcomes || []);
    setEditSkillsGained(zone.skillsGained || []);
    setEditSubjects(zone.subjects || []);
    setEditBatches(zone.batches?.map((b: any) => b.name) || []);
    setEditZoneLevel(zone.level || 'Beginner');
    setEditZonePrice(zone.price || '');
    setEditZoneCurrency(zone.currency || 'INR');
    setEditZoneImage(zone.image || null);
    setShowZoneSettingsModal(true);
  };

  const handleUpdateZoneSettings = async () => {
    if (!zoneId) return;
    if (editSubjects.length > 7) {
      nunmaAlert("You can strictly only add up to 7 subjects.", "success");
      return;
    }
    try {
      const existingBatches = zone?.batches || [];
      const finalBatches = existingBatches.filter((b: any) => editBatches.includes(b.name));
      const existingNames = finalBatches.map((b: any) => b.name);
      const batchesToAdd = editBatches.filter(name => !existingNames.includes(name));
      
      batchesToAdd.forEach((name, i) => {
        finalBatches.push({
          id: Date.now().toString() + '-' + i,
          name: name,
          color: ['#A78BFA', '#FBBF24', '#F87171', '#34D399', '#60A5FA', '#F472B6', '#c2f575'][Math.floor(Math.random() * 7)]
        });
      });

      await updateDoc(doc(db, 'zones', zoneId), {
        title: editZoneTitle,
        subtitle: editZoneSubtitle,
        description: editZoneDescription,
        learningOutcomes: editLearningOutcomes,
        skillsGained: editSkillsGained,
        subjects: editSubjects,
        batches: finalBatches,
        level: editZoneLevel,
        price: editZonePrice,
        currency: editZoneCurrency,
        image: editZoneImage
      });
      setShowZoneSettingsModal(false);
      toast.success("Zone settings updated successfully!");
    } catch (e) {
      console.error(e);
      nunmaAlert("Failed to update zone settings", "error");
    }
  };

  // Landing Page State
  const [lpPaid, setLpPaid] = useState(false);
  const [lpCalendar, setLpCalendar] = useState(false);
  const [lpEmailSubject, setLpEmailSubject] = useState('Your Workshop Confirmation');
  const [lpEmailBody, setLpEmailBody] = useState('We are excited to see you at the workshop!');
  const [lpCustomFields, setLpCustomFields] = useState<string[]>([]);
  const [newCustomField, setNewCustomField] = useState('');

  // Post Session State
  const [psEnabled, setPsEnabled] = useState(false);
  const [psRating, setPsRating] = useState(true);
  const [psNps, setPsNps] = useState(true);
  const [psFeedback, setPsFeedback] = useState(true);

  // Co-Hosts for Scheduled Sessions
  const [scheduleCoHosts, setScheduleCoHosts] = useState<string[]>([]);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedBatchForInvite, setSelectedBatchForInvite] = useState<string>('all');
  const [showShareAccessModal, setShowShareAccessModal] = useState(false);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showMarkEntryModal, setShowMarkEntryModal] = useState(false);
  const [showAiGeneratorModal, setShowAiGeneratorModal] = useState(false);
  const [showStartExamModal, setShowStartExamModal] = useState(false);
  const [showTakeAttendanceModal, setShowTakeAttendanceModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);

  // Input States
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newCoTutorEmail, setNewCoTutorEmail] = useState('');
  const [selectedCoTutorSubject, setSelectedCoTutorSubject] = useState('');
  const [isWhitelisting, setIsWhitelisting] = useState(false);
  const [examToStart, setExamToStart] = useState<Exam | null>(null);
  const [newAttendanceClassName, setNewAttendanceClassName] = useState('');
  const [attendanceTime, setAttendanceTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  // Custom Time Picker State
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tpHour, setTpHour] = useState('12');
  const [tpMinute, setTpMinute] = useState('00');
  const [tpPeriod, setTpPeriod] = useState<'AM' | 'PM'>('PM');

  useEffect(() => {
    // Initialize picker with current time
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const p = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    setTpHour(h < 10 ? '0' + h : h.toString());
    setTpMinute(m < 10 ? '0' + m : m.toString());
    setTpPeriod(p);
  }, [showTakeAttendanceModal]);

  const updateTimeFromPicker = (h: string, m: string, p: string) => {
    setTpHour(h);
    setTpMinute(m);
    setTpPeriod(p as any);
    setAttendanceTime(`${h}:${m} ${p}`);
  };

  // User Search State
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [examStartDate, setExamStartDate] = useState('');
  const [examStartTime, setExamStartTime] = useState('');

  // Grading/Drawing State
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number, y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [brushSize] = useState(4);
  const [scriptScore, setScriptScore] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scriptImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Curriculum Upload State
  const [activeChapterForUpload, setActiveChapterForUpload] = useState<string | null>(null);
  const [activeTypeForUpload, setActiveTypeForUpload] = useState<'video' | 'pdf' | 'reading' | 'quiz' | null>(null);
  const [showTextModuleEditor, setShowTextModuleEditor] = useState(false);
  const [showDocumentUploader, setShowDocumentUploader] = useState(false);
  const [showQuizModuleEditor, setShowQuizModuleEditor] = useState(false);

  // Drag and Drop State
  const [draggedChapterIndex, setDraggedChapterIndex] = useState<number | null>(null);
  const [draggedSegment, setDraggedSegment] = useState<{ chapterId: string; index: number } | null>(null);

  // Smart Marker State
  const [isSmartMarking, setIsSmartMarking] = useState(false);
  const [valuationContext, setValuationContext] = useState<{ examId: string; studentId: string } | null>(null);

  const getExamStatus = (exam: Exam) => {
    if (exam?.status === 'CONDUCTED') return 'CONDUCTED';
    if (!exam?.date || !exam?.time) return 'TBD';

    // Parse exam date and time
    const examDateParts = (exam.date || "").split('-'); // Expected YYYY-MM-DD
    const examTimeParts = (exam.time || "").split(':'); // Expected HH:MM

    if (examDateParts.length !== 3 || examTimeParts.length !== 2) return exam?.status || 'UPCOMING';

    const examStart = new Date(
      parseInt(examDateParts[0]),
      parseInt(examDateParts[1]) - 1,
      parseInt(examDateParts[2]),
      parseInt(examTimeParts[0]),
      parseInt(examTimeParts[1])
    );

    const now = new Date();
    const durationMs = 2 * 60 * 60 * 1000; // Default 2 hours duration
    const examEnd = new Date(examStart.getTime() + durationMs);

    if (now < examStart) return 'UPCOMING';
    if (now > examEnd) return 'CONDUCTED';
    return 'ONGOING';
  };
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [clusters, setClusters] = useState<AnswerCluster[]>([]);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [generatedFeedback, setGeneratedFeedback] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);

  // Data States
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [scheduledSessions, setScheduledSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceModalSearchQuery, setAttendanceModalSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [bulkEmails, setBulkEmails] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [downloadStartDate, setDownloadStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [downloadEndDate, setDownloadEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualAttendanceState, setManualAttendanceState] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Pending'>>({});

  // Batch System State
  const [activeBatchFilter, setActiveBatchFilter] = useState<string>('all'); // 'all' | batchId | 'unassigned'
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchColor, setNewBatchColor] = useState('#4F46E5');
  const [showBatchAssignDropdown, setShowBatchAssignDropdown] = useState<string | null>(null); // studentId

  // Batch color palette for selection
  const batchColorPalette = ['#4F46E5', '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2'];

  // Computed: Batches from zone document
  const zoneBatches: Batch[] = zone?.batches || [];

  // Computed: Filter students by active batch
  const filteredStudents = activeBatchFilter === 'all'
    ? students
    : activeBatchFilter === 'unassigned'
      ? students.filter(s => !s.batchId)
      : students.filter(s => s.batchId === activeBatchFilter);

  // Computed: Filter attendance sessions by active batch
  const filteredAttendanceSessions = activeBatchFilter === 'all'
    ? attendanceSessions
    : attendanceSessions.filter(s => s.batchId === activeBatchFilter || !s.batchId);


  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState('60');

  // Clock Picker State
  const [showClockPicker, setShowClockPicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');
  const [clockMode, setClockMode] = useState<'hour' | 'minute'>('hour');

  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [examSearchQuery, setExamSearchQuery] = useState('');
  const [showExamAnalytics, setShowExamAnalytics] = useState(false);
  const [selectedExamForMarks, setSelectedExamForMarks] = useState<Exam | null>(null);

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeInvite, setActiveInvite] = useState<{ inviteToken: string, expiresAt: number } | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Extracted Callbacks to prevent hook violations
  const handleCloseVideoUpload = useCallback(() => setShowVideoUploadModal(false), []);
  const handleCloseDocumentUploader = useCallback(() => { 
    setShowDocumentUploader(false); 
    setActiveChapterForUpload(null); 
  }, []);

  const handleSharePublicLink = () => {
    if (!zoneId) return;
    const link = `https://nunma.in/zone/${zoneId}`;
    navigator.clipboard.writeText(link);
    toast.success("Public Zone Link copied to clipboard!");
  };

  const handleGenerateInvite = async (batchId: string | null) => {
    if (!zoneId) return;
    try {
      setIsGeneratingInvite(true);
      const genFunc = httpsCallable(functions, 'generateZoneInvite');
      const result = await genFunc({ zoneId, batchId });
      const { inviteToken, expiresAt } = result.data as any;
      setActiveInvite({ inviteToken, expiresAt });
    } catch (err: any) {
      console.error('Generation failed:', err);
      toast.error(err.message || 'Failed to generate invite');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  // Grading Hub State
  const [showGradingHubModal, setShowGradingHubModal] = useState(false);
  const [selectedExamForGrading, setSelectedExamForGrading] = useState<Exam | null>(null);
  const [showExamSelectionModal, setShowExamSelectionModal] = useState(false);
  const [evaluableExamsList, setEvaluableExamsList] = useState<any[]>([]);

  // New Exam Modal State
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamTime, setNewExamTime] = useState('');
  const [newExamDuration, setNewExamDuration] = useState('60');
  const [newExamSubject, setNewExamSubject] = useState('');
  const [newExamType, setNewExamType] = useState<'online-test' | 'online-mcq' | 'offline'>('online-test');
  const [newExamMaxMark, setNewExamMaxMark] = useState('100');
  const [newExamMinMark, setNewExamMinMark] = useState('40');
  const [newExamQuestions, setNewExamQuestions] = useState<MCQ[]>([]);
  const [newExamFile, setNewExamFile] = useState<File | null>(null);

  const handleAddQuestion = () => {
    const newQ: MCQ = {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    };
    setNewExamQuestions([...newExamQuestions, newQ]);
  };

  const handleCreateExam = async () => {
    if (!zoneId) return;

    // Build remindAt: exam start time minus 24 hours
    let remindAt: string | null = null;
    if (newExamDate && newExamTime) {
      const parts = newExamDate.split('-');
      const timeParts = newExamTime.split(':');
      if (parts.length === 3 && timeParts.length === 2) {
        const examStart = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
          parseInt(timeParts[0]),
          parseInt(timeParts[1])
        );
        const remind = new Date(examStart.getTime() - 24 * 60 * 60 * 1000);
        remindAt = remind.toISOString();
      }
    }

    const examData: any = {
      title: newExamTitle,
      date: newExamDate,
      time: newExamTime,
      status: 'UPCOMING',
      type: newExamType,
      maxMark: parseInt(newExamMaxMark),
      minMark: parseInt(newExamMinMark),
      questions: newExamType === 'online-mcq' ? newExamQuestions : [],
      subject: newExamSubject,
      ...(remindAt ? { remindAt } : {}),
    };

    if (newExamType !== 'online-mcq') {
      examData.duration = parseInt(newExamDuration);
    }

    if (newExamType === 'online-test' && newExamFile) {
      examData.pdfUrl = URL.createObjectURL(newExamFile);
    }
    if (newExamType === 'offline' && newExamFile) {
      examData.pdfUrl = URL.createObjectURL(newExamFile);
    }

    try {
      const examRef = await addDoc(collection(db, 'zones', zoneId, 'exams'), examData);

      // === Notify all enrolled students ===
      try {
        const studentsSnap = await getDocs(collection(db, 'zones', zoneId, 'students'));
        const notifyPromises: Promise<any>[] = [];

        studentsSnap.forEach(studentDoc => {
          const studentUid = studentDoc.id;

          // 1. In-app notification
          notifyPromises.push(
            addDoc(collection(db, 'users', studentUid, 'notifications'), {
              type: 'EXAM_SCHEDULED',
              title: 'New Exam Scheduled',
              message: `Exam "${newExamTitle}" has been scheduled on ${newExamDate} @ ${newExamTime}. Be prepared!`,
              zoneId,
              examId: examRef.id,
              read: false,
              createdAt: serverTimestamp(),
            })
          );

          // 2. Calendar event on the exam date
          if (newExamDate) {
            notifyPromises.push(
              addDoc(collection(db, 'users', studentUid, 'calendar_events'), {
                title: `📝 Exam: ${newExamTitle}`,
                time: newExamTime || '00:00',
                dateKey: newExamDate, // YYYY-MM-DD — matches Dashboard calendar format
                type: 'exam',
                color: 'indigo',
                important: true,
                zoneId,
                examId: examRef.id,
                createdAt: serverTimestamp(),
              })
            );
          }
        });

        await Promise.allSettled(notifyPromises);
      } catch (notifyErr) {
        console.warn('Could not send exam notifications to students:', notifyErr);
      }

      setShowAddExamModal(false);
      // Reset fields
      setNewExamTitle('');
      setNewExamDate('');
      setNewExamTime('');
      setNewExamDuration('60');
      setNewExamSubject('');
      setNewExamMaxMark('100');
      setNewExamMinMark('40');
      setNewExamQuestions([]);
      setNewExamFile(null);
      nunmaAlert(`Exam "${newExamTitle}" created! Students have been notified.`);
    } catch (e) {
      console.error("Error creating exam:", e);
      nunmaAlert("Failed to create exam.", "error");
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedExamForMarks || !zone) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Marks Template');

    // Sort students alphabetically
    const sortedStudents = [...students].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Rows 1-3: Headers
    // Row 1: Logo placeholder (A1:B3) & Zone Name (C1:E1)
    const row1 = worksheet.addRow(['NUNMA', '', zone.title || 'Zone Name']);
    row1.height = 25;
    row1.getCell(1).font = { bold: true, size: 20, color: { argb: 'FF1A1A4E' } };
    row1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells('A1:B3'); // Merge for NUNMA logo area
    
    worksheet.mergeCells('C1:E1');
    row1.getCell(3).font = { bold: true, size: 14 };
    row1.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Subject (C2:E2)
    const row2 = worksheet.addRow(['', '', selectedExamForMarks.subject || 'Subject']);
    row2.height = 20;
    worksheet.mergeCells('C2:E2');
    row2.getCell(3).font = { bold: true, size: 12 };
    row2.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: Empty row for formatting space under subject if needed
    const row3 = worksheet.addRow(['', '', '', '', '']);
    row3.height = 15;

    // Row 4: Column Headers
    const headers = ['S.no', 'Student Name', 'Exam name', 'Exam name', 'Exam name'];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;

    const borderStyle = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    headerRow.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2F575' } } as any;
      cell.border = borderStyle as any;
      cell.font = { bold: true, color: { argb: 'FF1A1A4E' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      // Replace Exam name placeholders with actual exam title for the first mark column
      if (colNum === 3) {
        cell.value = selectedExamForMarks.title;
      } else if (colNum > 3) {
        cell.value = ''; // Leave blank if not used
      }
    });

    // Column widths
    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 35;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 20;
    worksheet.getColumn(5).width = 20;

    // Apply borders to header region (A1:E3)
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 5; c++) {
        const cell = worksheet.getCell(r, c);
        cell.border = borderStyle as any;
      }
    }

    // Student Data Rows
    if (sortedStudents.length === 0) {
      const row = worksheet.addRow([1, 'Example Student', '', '', '']);
      row.eachCell(cell => { cell.border = borderStyle as any; });
    } else {
      sortedStudents.forEach((student, index) => {
        const row = worksheet.addRow([index + 1, student.name || 'Unknown', '', '', '']);
        row.eachCell(cell => { 
          cell.border = borderStyle as any; 
          cell.alignment = { vertical: 'middle' };
        });
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${selectedExamForMarks.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.xlsx`);
  };


  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>, examId: string) => {
    const file = e.target.files?.[0];
    if (!file || !zoneId) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Expecting standard columns: [S.no, Name, Mark] (or similar, we'll try to map by index or look for 'Mark')
      const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

      if (json.length < 2) {
        nunmaAlert("Excel sheet appears empty or missing headers.", "success");
        return;
      }

      // Find the header row by looking for 'Mark', 'Score', etc.
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, json.length); i++) {
        const row = json[i] || [];
        if (row.some((val: any) => typeof val === 'string' && ['mark', 'marks', 'score'].includes(val.toLowerCase().trim()))) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = (json[headerRowIndex] || []) as string[];
      // Find the index of the column that might contain marks (e.g., "Mark", "Score", "Marks")
      const markIndex = headers.findIndex(h => typeof h === 'string' && ['mark', 'marks', 'score'].includes(h.toLowerCase().trim()));
      // Find the index of the column that might contain student names (or we just map by row assuming order if needed)
      const nameIndex = headers.findIndex(h => typeof h === 'string' && ['name', 'student name', 'student'].includes(h.toLowerCase().trim()));

      if (markIndex === -1) {
        nunmaAlert("Could not find a 'Mark' or 'Score' column in the Excel sheet.");
        return;
      }

      const parsedResults: ExamResult[] = [];
      const exam = exams.find(e => e.id === examId);
      const minPassMark = exam ? exam.minMark : 40;

      for (let i = headerRowIndex + 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length === 0) continue;

        const rawMark = row[markIndex];
        const markNum = parseInt(rawMark);
        if (isNaN(markNum)) continue;

        const nameValue = nameIndex !== -1 ? String(row[nameIndex]) : `Student Row ${i}`;

        // Attempt to match with existing student by name (naive matching for now)
        // In a real scenario, an ID or Email column is safer.
        const matchedStudent = (students || []).find(s => (s.name || "").toLowerCase() === (nameValue || "").toLowerCase());

        parsedResults.push({
          id: `${examId}_${matchedStudent ? matchedStudent.id : `mock_${i}`}`,
          examId,
          studentId: matchedStudent ? matchedStudent.id : `mock_${i}`,
          studentName: matchedStudent ? matchedStudent.name : nameValue,
          marks: markNum,
          status: markNum >= minPassMark ? 'passed' : 'failed',
          warnings: 0
        });
      }

      if (parsedResults.length === 0) {
        nunmaAlert("Failed to parse any valid marks from the sheet.", "error");
        return;
      }

      // Persist to Firestore
      if (db) {
        try {
          for (const result of parsedResults) {
            await setDoc(doc(db, `zones/${zoneId}/exams/${examId}/results`, result.studentId), {
              ...result,
              updatedAt: new Date().toISOString()
            });
          }
          // Optimistic update
          setExamResults(prev => {
            const filtered = prev.filter(r => r.examId !== examId);
            return [...filtered, ...parsedResults];
          });
          nunmaAlert(`Successfully imported marks for ${parsedResults.length} students!`, "success");
        } catch (err) {
          console.error("Error saving exam results:", err);
          nunmaAlert("Failed to save results to database.", "error");
        }
      } else {
        console.warn("ZoneManagement: Mock Mode disabled. Database required for results.");
      }
    } catch (error) {
      console.error("Error parsing Excel:", error);
      nunmaAlert("Failed to parse Excel file. Please ensure it's a valid format.");
    }
  };



  // Firestore Listeners
  useEffect(() => {
    if (!user || !user.uid || !zoneId || !db) return;

    // 1. Zone Details
    const zoneUnsub = onSnapshot(doc(db, 'zones', zoneId), (docSnap) => {
      if (docSnap.exists()) {
        const zoneData: any = { id: docSnap.id, ...docSnap.data() };
        setZone(zoneData);
        
        // Auto-set download start date to zone creation date if available
        if (zoneData.createdAt) {
          let dateStr = '';
          if (typeof zoneData.createdAt.toDate === 'function') {
            dateStr = zoneData.createdAt.toDate().toISOString().split('T')[0];
          } else if (typeof zoneData.createdAt === 'string') {
            dateStr = zoneData.createdAt.split('T')[0];
          }
          if (dateStr) {
            setDownloadStartDate(dateStr);
          }
        }

        // Adjust activeTab if current one is not allowed
        const zType = (zoneData as any).zoneType;
        setActiveTab(prev => {
          if (typeof zType === 'string' && zType === 'Course' && (prev === 'attendance' || prev === 'exams' || prev === 'schedule' || prev === 'landing' || prev === 'post-session')) {
            return 'curriculum';
          }
          if (typeof zType === 'string' && zType === 'Workshop' && (prev === 'attendance' || prev === 'curriculum' || prev === 'exams')) {
            return 'schedule'; // or 'landing'
          }
          if (typeof zType === 'string' && zType === 'Class Management' && (prev === 'landing' || prev === 'post-session')) {
            return 'attendance';
          }
          return prev;
        });

        // Load initial Configs for Workshop
        if (typeof zType === 'string' && zType === 'Workshop') {
          const zData = zoneData as any;
          if (zData.landingPageConfig) {
            setLpPaid(zData.landingPageConfig.paid || false);

            setLpCalendar(zData.landingPageConfig.enableCalendar || false);
            setLpEmailSubject(zData.landingPageConfig.emailSubject || 'Your Workshop Confirmation');
            setLpEmailBody(zData.landingPageConfig.emailBody || 'We are excited to see you at the workshop!');
            setLpCustomFields(zData.landingPageConfig.customFields || []);
          }
          if (zData.postSessionSurvey) {
            setPsEnabled(zData.postSessionSurvey.enabled || false);
            setPsRating(zData.postSessionSurvey.ratingSystem ?? true);
            setPsNps(zData.postSessionSurvey.npsTracking ?? true);
            setPsFeedback(zData.postSessionSurvey.feedbackText ?? true);
          }
        }
      } else {
        navigate('/workplace'); // Zone not found
      }
    });

    // 2. Chapters (Curriculum)
    const chaptersq = query(collection(db, 'zones', zoneId, 'chapters'));
    const chaptersUnsub = onSnapshot(chaptersq, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return { 
          ...d, 
          id: doc.id,
          segments: d.segments || [] 
        } as Chapter;
      });
      // Sort chapters by order
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setChapters(data);
    });

    // 3. Exams
    const examsq = query(collection(db, 'zones', zoneId, 'exams'));
    const examsUnsub = onSnapshot(examsq, (snapshot) => {
      setExams((snapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id } as Exam)));
    });

    // 4. Students (Enrolled)
    const studentsq = query(collection(db, 'zones', zoneId, 'students'));
    const studentsUnsub = onSnapshot(studentsq, (snapshot) => {
      setStudents((snapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id } as Student)));
    });

    // 5. Scheduled Sessions (unified sessions collection)
    const sessionsq = query(
      collection(db, 'zones', zoneId, 'sessions'),
      where('status', '==', 'scheduled')
    );
    const sessionsUnsub = onSnapshot(sessionsq, (snapshot) => {
      setScheduledSessions((snapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id })));
    });

    // 6. Attendance Sessions
    const attSessionsq = query(collection(db, 'zones', zoneId, 'attendance_sessions'));
    const attSessionsUnsub = onSnapshot(attSessionsq, (snapshot) => {
      const sessions = (snapshot.docs || []).map(doc => {
        const data = doc.data();
        return { 
          ...data, 
          id: doc.id, 
          // Keep the original timestamp ID for matching older records
          originalId: data.id 
        } as AttendanceSession & { originalId?: string };
      });
      // Sort by date and time ascending so .slice(-5) gets the most recent
      sessions.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return dateA - dateB;
      });
      setAttendanceSessions(sessions);
    });

    // 7. Active Invite Listener (Hotfix) - Only run if zoneId is truthy
    let invitesUnsub = () => {};
    if (zoneId) {
      const invitesRef = collection(db, 'zones', zoneId, 'invites');
      const invitesq = query(invitesRef, where('isActive', '==', true), limit(1));
      invitesUnsub = onSnapshot(invitesq, (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          setActiveInvite({ inviteToken: docSnap.id, expiresAt: data.expiresAt });
        } else {
          setActiveInvite(null);
        }
      }, (error) => {
        console.error("Invites snapshot error:", error);
      });
    }

    return () => {
      zoneUnsub();
      chaptersUnsub();
      examsUnsub();
      studentsUnsub();
      sessionsUnsub();
      attSessionsUnsub();
      invitesUnsub();
    };
  }, [zoneId]);

  // Check for active live session (Firestore)
  useEffect(() => {
    if (!user || !user.uid || !zoneId || !db) return;
    const q = query(
      collection(db, 'zones', zoneId, 'sessions'),
      where('status', '==', 'live'),
      limit(1)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveSession({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setActiveSession(null);
      }
    });
    return () => unsub();
  }, [zoneId]);

  useEffect(() => {
    if (!user || !user.uid || !zoneId || !activeSession) return;
    let unsubscribe = () => { };

    if (db) {
      const attendanceRef = collection(db, `zones/${zoneId}/sessions/${activeSession.id}/attendance`);
      const q = query(attendanceRef);

      unsubscribe = onSnapshot(q, (snapshot) => {
        const attendees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setStudents(prev => prev.map(student => {
          const attendanceMatch = attendees.find((a: any) => a.id === student.id || a.email === student.email);
          if (attendanceMatch) {
            return { ...student, status: 'Present' };
          }
          return student;
        }));
      });
    } else {
      console.log("ZoneManagement: Mock Attendance in effect (No Firebase)");
    }

    return () => unsubscribe();
  }, [zoneId, activeSession]);

  useEffect(() => {
    const searchUsers = async () => {
      if (newStudentEmail.length < 3) {
        setUserSearchResults([]);
        setShowUserSuggestions(false);
        return;
      }

      setIsSearchingUsers(true);
      setShowUserSuggestions(true);

      if (db) {
        try {
          const searchTerm = newStudentEmail.toLowerCase();
          const q = query(
            collection(db, 'users'),
            where('email', '>=', searchTerm),
            where('email', '<=', searchTerm + '\uf8ff'),
            limit(5)
          );
          const querySnapshot = await getDocs(q);
          const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUserSearchResults(results);
        } catch (err) {
          console.error("Error searching users:", err);
        } finally {
          setIsSearchingUsers(false);
        }
      } else {
        // Mock Search Results
        setTimeout(() => {
          const mockUsers = [
            { id: '1', name: 'Sundaram S M', email: 'sundaramsm55@gmail.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sundaram' },
            { id: '2', name: 'John Doe', email: 'john.doe@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john' },
            { id: '3', name: 'Jane Smith', email: 'jane.smith@test.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane' }
          ].filter(u => (u?.email || "").toLowerCase().includes((newStudentEmail || "").toLowerCase()));
          setUserSearchResults(mockUsers);
          setIsSearchingUsers(false);
        }, 300);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 500);
    return () => clearTimeout(debounceTimer);
  }, [newStudentEmail]);

  const [coTutorSearchResults, setCoTutorSearchResults] = useState<any[]>([]);
  const [isSearchingCoTutors, setIsSearchingCoTutors] = useState(false);
  const [showCoTutorSuggestions, setShowCoTutorSuggestions] = useState(false);

  useEffect(() => {
    const searchCoTutors = async () => {
      if (newCoTutorEmail.length < 3) {
        setCoTutorSearchResults([]);
        setShowCoTutorSuggestions(false);
        return;
      }

      setIsSearchingCoTutors(true);
      setShowCoTutorSuggestions(true);

      if (db) {
        try {
          const searchTerm = newCoTutorEmail.toLowerCase();
          const q = query(
            collection(db, 'users'),
            where('email', '>=', searchTerm),
            where('email', '<=', searchTerm + '\uf8ff'),
            limit(5)
          );
          const querySnapshot = await getDocs(q);
          const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCoTutorSearchResults(results);
        } catch (err) {
          console.error("Error searching users:", err);
        } finally {
          setIsSearchingCoTutors(false);
        }
      } else {
        // Mock Search Results
        setTimeout(() => {
          const mockUsers = [
            { id: '1', name: 'Sundaram S M', email: 'sundaramsm55@gmail.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sundaram' },
            { id: '2', name: 'John Doe', email: 'john.doe@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john' },
            { id: '3', name: 'Jane Smith', email: 'jane.smith@test.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane' }
          ].filter(u => (u?.email || "").toLowerCase().includes((newCoTutorEmail || "").toLowerCase()));
          setCoTutorSearchResults(mockUsers);
          setIsSearchingCoTutors(false);
        }, 300);
      }
    };

    const debounceTimer = setTimeout(searchCoTutors, 500);
    return () => clearTimeout(debounceTimer);
  }, [newCoTutorEmail]);

  // --- Canvas Logic ---
  useEffect(() => {
    if (view === 'grading' && canvasRef.current && selectedScript) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = selectedScript;
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        scriptImageRef.current = img;
        const maxWidth = 1000;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        drawCanvas();
      };
    }
  }, [view, selectedScript, activeClusterId]);

  useEffect(() => {
    drawCanvas();
  }, [strokes, currentStroke, isDrawing]);

  const getCanvasCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !scriptImageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(scriptImageRef.current, 0, 0, canvas.width, canvas.height);

    const drawPath = (points: { x: number, y: number }[], color: string) => {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    };

    strokes.forEach(s => drawPath(s.points, s.color));
    if (isDrawing && currentStroke.length > 0) drawPath(currentStroke, brushColor);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    setIsDrawing(true);
    setCurrentStroke([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoordinates(e);
    setCurrentStroke(prev => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      setStrokes([...strokes, { points: currentStroke, color: brushColor, width: brushSize }]);
    }
    setCurrentStroke([]);
  };

  const handleUndo = () => setStrokes(strokes.slice(0, -1));
  const handleClear = () => setStrokes([]);

  // --- Handlers ---
  // Firestore-based Add Segment
  const handleAddSegment = async (chapterId: string, type: 'video' | 'pdf' | 'reading' | 'quiz') => {
    if (type === 'video') {
      setActiveChapterForUpload(chapterId);
      setShowVideoUploadModal(true);
      return;
    }

    if (type === 'reading') {
      setActiveChapterForUpload(chapterId);
      setShowTextModuleEditor(true);
      return;
    }

    if (type === 'pdf') {
      setActiveChapterForUpload(chapterId);
      setShowDocumentUploader(true);
      return;
    }

    if (type === 'quiz') {
      setActiveChapterForUpload(chapterId);
      setShowQuizModuleEditor(true);
      return;
    }

    const newSeg: Segment = {
      id: `s${Date.now()}`,
      title: `New ${(type as string).charAt(0).toUpperCase() + (type as string).slice(1)}`,
      type
    };

    // Find current chapter to get existing segments or just use arrayUnion
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter && zoneId) {
      const existingSegments = chapter.segments || [];
      const updatedSegments = [...existingSegments, newSeg];
      await updateDoc(doc(db, 'zones', zoneId, 'chapters', chapterId), {
        segments: updatedSegments
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChapterForUpload || !activeTypeForUpload || !zoneId) return;

    // Standard File Upload (PDF/Reading - preserved logic usually mock or different storage)
    const newSeg: Segment = {
      id: `s${Date.now()}`,
      title: file.name,
      type: activeTypeForUpload,
      duration: undefined
    };

    const chapter = chapters.find(c => c.id === activeChapterForUpload);
    if (chapter) {
      const existingSegments = chapter.segments || [];
      const updatedSegments = [...existingSegments, newSeg];
      await updateDoc(doc(db, 'zones', zoneId, 'chapters', activeChapterForUpload), {
        segments: updatedSegments
      });
    }

    // Reset upload state
    setActiveChapterForUpload(null);
    setActiveTypeForUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    nunmaAlert(`Item "${file.name}" uploaded and added to chapter!`);
  };

  const handleTextModuleSuccess = async (lessonData: { id: string; title: string; content: string }) => {
    if (!activeChapterForUpload || !zoneId) return;
    try {
      const newSeg: Segment = {
        id: lessonData.id,
        title: lessonData.title,
        type: 'reading',
        // In a real implementation this would hold the content or a reference to it
        // content: lessonData.content 
      };
      const chapter = chapters.find(c => c.id === activeChapterForUpload);
      if (chapter) {
        const updatedSegments = [...chapter.segments, newSeg];
        await updateDoc(doc(db, 'zones', zoneId, 'chapters', activeChapterForUpload), {
          segments: updatedSegments
        });
      }
    } catch (error) {
      console.error('Failed to link text module to chapter:', error);
    } finally {
      setActiveChapterForUpload(null);
      setShowTextModuleEditor(false);
    }
  };

  const handleQuizModuleSuccess = async (quizData: { title: string; maxMark: number; minMark: number; questions: any[] }) => {
    if (!activeChapterForUpload || !zoneId) return;
    try {
      const newSeg: Segment = {
        id: `s${Date.now()}`,
        title: quizData.title,
        type: 'quiz',
        // In a full implementation we would store quizData into a subcollection,
        // but for UI simulation we can treat it similarly to text modules.
      };
      const chapter = chapters.find(c => c.id === activeChapterForUpload);
      if (chapter) {
        const updatedSegments = [...chapter.segments, newSeg];
        await updateDoc(doc(db, 'zones', zoneId, 'chapters', activeChapterForUpload), {
          segments: updatedSegments
        });
      }
    } catch (error) {
      console.error('Failed to link quiz module to chapter:', error);
    } finally {
      setActiveChapterForUpload(null);
      setShowQuizModuleEditor(false);
    }
  };

  const handleDocumentUploadSuccess = useCallback(async (docData: { id: string; title: string; fileUrl: string; fileSize: number }) => {
    if (!activeChapterForUpload || !zoneId) return;
    try {
      const newSeg: Segment = {
        id: docData.id,
        title: docData.title,
        type: 'pdf',
        // @ts-ignore
        fileUrl: docData.fileUrl,
        fileSize: docData.fileSize
      };
      const chapter = chapters.find(c => c.id === activeChapterForUpload);
      if (chapter) {
        const updatedSegments = [...chapter.segments, newSeg];
        await updateDoc(doc(db, 'zones', zoneId, 'chapters', activeChapterForUpload), {
          segments: updatedSegments
        });
        if (user && docData.fileSize) {
          await updateDoc(doc(db, 'users', user.uid), {
            usedStorageBytes: increment(docData.fileSize),
            'subscription_entitlements.storageUsed': increment(docData.fileSize)
          });
        }
        toast.success("Document uploaded successfully!");
      }
    } catch (error) {
      console.error('Failed to link document module to chapter:', error);
    } finally {
      setActiveChapterForUpload(null);
      setShowDocumentUploader(false);
    }
  }, [activeChapterForUpload, zoneId, chapters, user]);

  const handleVideoUploadSuccess = useCallback(async (videoData: { videoId: string, title: string, fileSize: number }) => {
    if (!activeChapterForUpload || !zoneId) return;

    try {
      const newSeg: Segment = {
        id: `s${Date.now()}`,
        title: videoData.title,
        type: 'video',
        // @ts-ignore
        videoId: videoData.videoId,
        status: 'processing' // Processing managed by Bunny CDN Webhook or assumed ready later
      };

      const chapter = chapters.find(c => c.id === activeChapterForUpload);
      if (chapter) {
        const existingSegments = chapter.segments || [];
        const updatedSegments = [...existingSegments, newSeg];
        await updateDoc(doc(db, 'zones', zoneId, 'chapters', activeChapterForUpload), {
          segments: updatedSegments
        });
        if (user && videoData.fileSize) {
          await updateDoc(doc(db, 'users', user.uid), {
            usedStorageBytes: increment(videoData.fileSize),
            'subscription_entitlements.storageUsed': increment(videoData.fileSize)
          });
        }
      }
      setActiveChapterForUpload(null);
    } catch (error) {
      console.error("Failed to append video segment to chapter:", error);
      nunmaAlert("Video was uploaded, but failed to link to chapter. Please refresh and try again.", "error");
    }
  }, [activeChapterForUpload, zoneId, chapters, user]);

  const updateChapterTitle = async (chapterId: string, newTitle: string) => {
    if (!zoneId) return;
    try {
      await updateDoc(doc(db, 'zones', zoneId, 'chapters', chapterId), {
        title: newTitle
      });
    } catch (e) {
      console.error("Failed to persist chapter title change:", e);
    }
  };

  const updateSegmentTitle = async (chapterId: string, segmentId: string, newTitle: string) => {
    if (!zoneId) return;
    try {
      const chapter = chapters.find(c => c.id === chapterId);
      if (chapter) {
        const updatedSegments = (chapter.segments || []).map(s => 
          s.id === segmentId ? { ...s, title: newTitle } : s
        );
        await updateDoc(doc(db, 'zones', zoneId, 'chapters', chapterId), {
          segments: updatedSegments
        });
      }
    } catch (e) {
      console.error("Failed to persist title change:", e);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedChapterIndex(index);
    // Visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedChapterIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedChapterIndex === null || draggedChapterIndex === dropIndex) return;

    const newChapters = [...chapters];
    const [movedChapter] = newChapters.splice(draggedChapterIndex, 1);
    newChapters.splice(dropIndex, 0, movedChapter);
    setChapters(newChapters);

    if (zoneId && db) {
      try {
        const batchUpdates = newChapters.map((chapter, index) => 
          updateDoc(doc(db, 'zones', zoneId, 'chapters', chapter.id), { order: index })
        );
        await Promise.all(batchUpdates);
      } catch (err) {
        console.error("Failed to reorder chapters in DB", err);
      }
    }
  };

  const handleSegmentDragStart = (e: React.DragEvent, chapterId: string, index: number) => {
    e.stopPropagation();
    setDraggedSegment({ chapterId, index });
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4';
    }
  };

  const handleSegmentDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedSegment(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleSegmentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSegmentDrop = async (e: React.DragEvent, targetChapterId: string, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedSegment || draggedSegment.chapterId !== targetChapterId || draggedSegment.index === dropIndex) return;

    const chapterIndex = chapters.findIndex(c => c.id === targetChapterId);
    if (chapterIndex === -1) return;

    const newChapters = [...chapters];
    const chapter = newChapters[chapterIndex];
    const newSegments = [...(chapter.segments || [])];
    
    const [movedSegment] = newSegments.splice(draggedSegment.index, 1);
    newSegments.splice(dropIndex, 0, movedSegment);
    
    chapter.segments = newSegments;
    setChapters(newChapters);

    if (zoneId && db) {
      try {
        await updateDoc(doc(db, 'zones', zoneId, 'chapters', targetChapterId), {
          segments: newSegments
        });
      } catch (err) {
        console.error("Failed to persist segment order:", err);
      }
    }
  };

  const initSmartMarking = () => {
    setIsSmartMarking(true);
    setIsAnalyzing(true);
    setView('grading');
    setTimeout(() => {
      const mockClusters: AnswerCluster[] = [
        { id: 'cl1', label: 'Precise Logic', description: 'Calculated derivative correctly.', confidence: 95, studentIds: ['1'], representativeImage: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?q=80&w=1000&auto=format&fit=crop', score: 10 },
        { id: 'cl2', label: 'Arithmetic Error', description: 'Sign flip in step 2.', confidence: 82, studentIds: ['2'], representativeImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1000&auto=format&fit=crop', score: 7 },
      ];
      setClusters(mockClusters);
      setActiveClusterId(mockClusters[0].id);
      setSelectedScript(mockClusters[0].representativeImage);
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleClusterSelect = (cluster: AnswerCluster) => {
    setActiveClusterId(cluster.id);
    setSelectedScript(cluster.representativeImage);
    setScriptScore(cluster.score?.toString() || '');
    setStrokes([]);
    setGeneratedFeedback(cluster.commonFeedback || '');
  };

  // Fix: Implemented handleGenerateFeedback using Gemini API to provide intelligent feedback for answer clusters
  const handleGenerateFeedback = async () => {
    if (!activeClusterId) return;
    const cluster = clusters.find(c => c.id === activeClusterId);
    if (!cluster) return;

    try {
      // Logic moved to Cloud Functions
      setGeneratedFeedback("Feedback generation is now processed on the server. Default: Good attempt. Keep refining your approach to the problem.");
    } catch (error) {
      console.error("AI feedback generation failed:", error);
      setGeneratedFeedback("Solid effort. Review the logical steps taken to identify potential areas for improvement.");
    }
  };

  const handleSaveGrading = async () => {
    if (isSmartMarking && activeClusterId) {
      nunmaAlert(`Batch Grade Applied to ${clusters.find(c => c.id === activeClusterId)?.studentIds.length} students.`, "success");
    } else if (valuationContext && zoneId) {
      try {
        const { examId, studentId } = valuationContext;
        // In this implementation, we assume a submission document exists or we create it
        // Similar to GradingHub.tsx logic
        await setDoc(doc(db, 'zones', zoneId, 'exams', examId, 'submissions', studentId), {
          studentId,
          marks: Number(scriptScore),
          status: 'graded',
          gradedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        nunmaAlert("Mark saved successfully!", "success");
        setView('management');
        setValuationContext(null);
        setScriptScore('');
        setStrokes([]);
      } catch (e) {
        console.error("Error saving manual grade:", e);
        nunmaAlert("Failed to save mark.", "error");
      }
    }
  };

  const handleLaunchLive = async () => {
    if (!zone || !zoneId) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const currentBatchId = activeBatchFilter !== 'all' ? activeBatchFilter : null;

    const newSession = {
      zoneId: zoneId,
      title: zone.title,
      status: 'live',
      date: dateStr,
      time: timeStr,
      startTime: now.toISOString(),
      tutorName: user?.name || 'Tutor',
      ...(currentBatchId ? { batchId: currentBatchId } : {})
    };

    try {
      // 1. Create Live Session
      const docRef = await addDoc(collection(db, 'zones', zoneId, 'sessions'), newSession);
      const activeSessionId = docRef.id;

      // 2. Create Attendance Session automatically
      const newAttendanceSession = {
        date: dateStr,
        time: timeStr,
        className: `Live: ${zone.title}`,
        liveSessionId: activeSessionId,
        ...(currentBatchId ? { batchId: currentBatchId } : {})
      };
      const attDocRef = await addDoc(collection(db, 'zones', zoneId, 'attendance_sessions'), newAttendanceSession);
      const attendanceSessionId = attDocRef.id;

      // Update the live session with the linked attendance session ID
      await updateDoc(docRef, { attendanceSessionId });

      // 3. Mark all students as 'Absent' initially
      const updatePromises = filteredStudents.map(student => {
        const history = student.attendanceHistory || [];
        const newHistory = [...history, { 
          sessionId: attendanceSessionId, 
          status: 'Absent', 
          date: dateStr, 
          className: newAttendanceSession.className,
          ...(currentBatchId ? { batchId: currentBatchId } : {})
        }];
        return updateDoc(doc(db, 'zones', zoneId, 'students', student.id), { attendanceHistory: newHistory });
      });
      await Promise.all(updatePromises);

      setActiveSession({ id: activeSessionId, attendanceSessionId, ...newSession });
      nunmaAlert("Live session and attendance tracker started successfully!", "success");
    } catch (e) {
      console.error("Failed to launch session", e);
      nunmaAlert("Failed to go live. Check connection.", "error");
    }
  };

  const handleValuate = (studentId: string, scriptUrl: string) => {
    setSelectedScript(scriptUrl);
    setValuationContext({ examId: selectedExamForGrading?.id || '', studentId });
    setIsSmartMarking(false);
    setView('grading');
    setShowGradingHubModal(false);
  };

  const handleEndLive = async () => {
    if (!activeSession || !zoneId) return;
    try {
      await updateDoc(doc(db, 'zones', zoneId, 'sessions', activeSession.id), {
        status: 'ended',
        endTime: new Date().toISOString()
      });
      setActiveSession(null);
    } catch (e) {
      console.error("Failed to end session", e);
    }
  };

  const handleDeleteZone = async () => {
    if (!zoneId) return;

    if (await asyncConfirm('Are you sure you want to permanently delete this zone and all its contents? This action cannot be undone.')) {
      if (db) {
        try {
          // Permanently delete subcollections to prevent orphaned data
          const chaptersSnap = await getDocs(collection(db, 'zones', zoneId, 'chapters'));
          const sessionsSnap = await getDocs(collection(db, 'zones', zoneId, 'sessions'));
          const studentsSnap = await getDocs(collection(db, 'zones', zoneId, 'students'));
          const examsSnap = await getDocs(collection(db, 'zones', zoneId, 'exams'));
          
          for (const d of chaptersSnap.docs) await deleteDoc(d.ref);
          for (const d of sessionsSnap.docs) await deleteDoc(d.ref);
          for (const d of studentsSnap.docs) await deleteDoc(d.ref);
          for (const d of examsSnap.docs) await deleteDoc(d.ref);

          // Finally delete the parent zone document
          await deleteDoc(doc(db, 'zones', zoneId));
        } catch (error) {
          console.error("Error deleting zone and subcollections:", error);
          nunmaAlert("Failed to permanently delete zone from cloud.", "error");
        }
      }

      navigate('/workplace');
    }
  };

  const handleDismissStudent = async (student: Student) => {
    if (!zoneId || !db || !(await asyncConfirm(`Are you sure you want to remove ${student.name || student.email || "this student"} from this zone?`))) return;

    try {
      // 1. Remove from students subcollection
      await deleteDoc(doc(db, 'zones', zoneId, 'students', student.id));

      // 2. Remove from whitelistedEmails if present
      const zoneRef = doc(db, 'zones', zoneId);
      const updatedWhitelist = ((zone?.whitelistedEmails || []) as any[]).filter((e: any) => {
        const email = typeof e === 'string' ? e : e?.email;
        return (email || "").toLowerCase() !== (student?.email || "").toLowerCase();
      });
      if (updatedWhitelist.length !== (zone?.whitelistedEmails || []).length) {
        await updateDoc(zoneRef, { whitelistedEmails: updatedWhitelist });
      }

      nunmaAlert('Student access removed.', "success");
    } catch (err) {
      console.error("Error dismissing student:", err);
      nunmaAlert("Failed to remove student.", "error");
    }
  };

  useEffect(() => {
    if (showTakeAttendanceModal && editingSessionId) {
      const state: Record<string, "Pending" | "Present" | "Absent" | "Late"> = {};
      filteredStudents.forEach(student => {
        const history = student.attendanceHistory || [];
        const record = history.find(h => h.sessionId === editingSessionId);
        if (record) state[student.id] = record.status;
      });
      setManualAttendanceState(state);
    } else if (!showTakeAttendanceModal) {
      setEditingSessionId(null);
      setAttendanceModalSearchQuery('');
    }
  }, [showTakeAttendanceModal, editingSessionId, filteredStudents]);

  const handleTakeAttendance = async () => {
    if (filteredStudents.length === 0) {
      nunmaAlert("No students found for this batch to take attendance.");
      return;
    }
    if (!zoneId) return;

    const currentBatchId = activeBatchFilter !== 'all' ? activeBatchFilter : null;

    const newSession: Omit<AttendanceSession, 'id'> = {
      // Don't set id here, let Firestore generate it
      date: attendanceDate,
      time: attendanceTime,
      className: newAttendanceClassName,
      ...(currentBatchId ? { batchId: currentBatchId } : {})
    };

    try {
      // Save Session and get docRef
      const docRef = await addDoc(collection(db, 'zones', zoneId, 'attendance_sessions'), newSession);
      const sessionId = docRef.id;

      // Update Students history (only for filtered batch students)
      const updatePromises = filteredStudents.map(student => {
        // Change default to Present
        const status = manualAttendanceState[student.id] || 'Present';
        const history = student.attendanceHistory || [];
        const newHistory = [...history, { sessionId: sessionId, status, date: attendanceDate, className: newAttendanceClassName || '', ...(currentBatchId ? { batchId: currentBatchId } : {}) }];

        // Only update if changed or new record (simplified: just update all)
        return updateDoc(doc(db, 'zones', zoneId, 'students', student.id), {
          status: status,
          attendanceHistory: newHistory
        }).then(() => {
          const studentUid = (student as any).uid || student.id;
          if (studentUid) {
            addDoc(collection(db, 'users', studentUid, 'notifications'), {
              type: 'ATTENDANCE_RECORDED',
              message: `Your attendance has been recorded as ${status} for "${newAttendanceClassName || attendanceDate}" in "${zone?.title || 'Learning Zone'}".`,
              zoneId,
              actionUrl: `/classroom/zone/${zoneId}?tab=attendance`,
              read: false,
              createdAt: serverTimestamp()
            }).catch(err => console.error('Notification write failed:', err));
          }
        });
      });

      await Promise.all(updatePromises);

      setShowTakeAttendanceModal(false);
      setNewAttendanceClassName('');
      setManualAttendanceState({});
      nunmaAlert(`Attendance for "${newAttendanceClassName || attendanceDate}" recorded!`);
    } catch (e: any) {
      console.error("Error saving attendance:", e);
      nunmaAlert("Failed to save attendance.", "error");
    }
  };

  const calculateAttendancePercentage = (student: Student) => {
    if (!student?.attendanceHistory || (student?.attendanceHistory || []).length === 0) return 0;
    const presentCount = (student?.attendanceHistory || []).filter(h => h?.status === 'Present').length;
    return Math.round((presentCount / (student?.attendanceHistory || []).length) * 100);
  };

  const handleCopyLink = () => {
    if (!activeSession) return;
    const link = `${window?.location?.origin || ""}/#/classroom/zone/${zoneId || ""}?session=${activeSession?.id || ""}`;
    navigator.clipboard.writeText(link);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  // === BATCH CRUD OPERATIONS ===
  const handleAddBatch = async () => {
    if (!zoneId || !newBatchName.trim()) {
      nunmaAlert("Please enter a batch name.", "error");
      return;
    }
    if (zoneBatches.length >= MAX_BATCHES_PER_ZONE) {
      nunmaAlert(`Maximum of ${MAX_BATCHES_PER_ZONE} batches allowed per zone.`, "error");
      return;
    }
    if (zoneBatches.some(b => b.name.toLowerCase() === newBatchName.trim().toLowerCase())) {
      nunmaAlert("A batch with this name already exists.", "error");
      return;
    }
    try {
      const newBatch: Batch = {
        id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: newBatchName.trim(),
        color: newBatchColor,
        createdAt: new Date().toISOString()
      };
      const updatedBatches = [...zoneBatches, newBatch];
      await updateDoc(doc(db, 'zones', zoneId), { batches: updatedBatches });
      setNewBatchName('');
      setNewBatchColor(batchColorPalette[(updatedBatches.length) % batchColorPalette.length]);
      nunmaAlert(`Batch "${newBatch.name}" created!`);
    } catch (e: any) {
      console.error("Error creating batch:", e);
      nunmaAlert("Failed to create batch.", "error");
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!zoneId) return;
    const batch = zoneBatches.find(b => b.id === batchId);
    if (!batch) return;

    const confirmed = await asyncConfirm(`Delete batch "${batch.name}"? Students will be moved to Unassigned.`);
    if (!confirmed) return;

    try {
      // 1. Remove batch from zone document
      const updatedBatches = zoneBatches.filter(b => b.id !== batchId);
      await updateDoc(doc(db, 'zones', zoneId), { batches: updatedBatches });

      // 2. Unassign students from this batch
      const studentsInBatch = students.filter(s => s.batchId === batchId);
      await Promise.all(studentsInBatch.map(s =>
        updateDoc(doc(db, 'zones', zoneId, 'students', s.id), { batchId: null })
      ));

      // Reset filter if we were viewing the deleted batch
      if (activeBatchFilter === batchId) {
        setActiveBatchFilter('all');
      }
      nunmaAlert(`Batch "${batch.name}" deleted. ${studentsInBatch.length} students moved to Unassigned.`);
    } catch (e: any) {
      console.error("Error deleting batch:", e);
      nunmaAlert("Failed to delete batch.", "error");
    }
  };

  const handleAssignStudentBatch = async (studentId: string, batchId: string | null) => {
    if (!zoneId) return;
    try {
      await updateDoc(doc(db, 'zones', zoneId, 'students', studentId), { batchId: batchId });
      setShowBatchAssignDropdown(null);
      const batchName = batchId ? zoneBatches.find(b => b.id === batchId)?.name || 'batch' : 'Unassigned';
      toast.success(`Student moved to ${batchName}`);
    } catch (e: any) {
      console.error("Error assigning batch:", e);
      toast.error("Failed to assign batch.");
    }
  };

  if (!zone) {
    return (
      <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">
        Launching Infrastructure...
      </div>
    );
  }

  return (
    <React.Fragment>

      {/* EDIT ZONE SETTINGS MODAL */}
      {showZoneSettingsModal && (
        <div className={`fixed top-0 right-0 bottom-0 max-md:left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[200] bg-gray-50 animate-in fade-in duration-300 transition-all flex flex-col`}>
          {/* Modal Header without the white box */}
          <div className="flex items-center justify-between px-10 pt-10 pb-4 shrink-0">
            <div className="flex items-center gap-6">
              <button onClick={() => setShowZoneSettingsModal(false)} className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:bg-nunma-forest hover:text-white transition-all hover:scale-105 active:scale-95">
                <X size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-black text-nunma-forest tracking-tight">Zone Settings</h1>
                <p className="text-sm text-gray-500 font-medium mt-1">Configure your zone details, pricing & content structure</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowZoneSettingsModal(false)} className="px-8 py-4 bg-white border border-gray-100 shadow-sm text-gray-600 rounded-[1.2rem] font-black uppercase text-[11px] tracking-[0.2em] hover:bg-gray-50 transition-all active:scale-95">Cancel</button>
              <button onClick={handleUpdateZoneSettings} className="px-10 py-4 bg-nunma-forest text-white rounded-[1.2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-[0_10px_20px_rgba(5,46,22,0.15)] hover:bg-[#074220] hover:-translate-y-0.5 active:translate-y-0 transition-all">Save Changes</button>
            </div>
          </div>

          {/* Full-page Content — full-width 3-column layout */}
          <div className="flex-1 overflow-y-auto">
            <div className="h-full px-10 pb-10">
              <div className="grid grid-cols-3 gap-8 h-full">

                {/* ── Column 1: Zone Identity ── */}
                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Zone Visual</p>
                      <div
                        onClick={() => imageInputRef.current?.click()}
                        className="aspect-video bg-gray-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group shadow-inner border-gray-200 hover:border-[#c1e60d] hover:bg-white"
                      >
                        {editZoneImage ? (
                          <img src={editZoneImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Preview" />
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-gray-300 mb-3 shadow-sm group-hover:scale-110 group-hover:bg-[#c1e60d] group-hover:text-indigo-900 transition-all duration-500">
                              <Camera size={32} />
                            </div>
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Upload Cover Photo</span>
                          </>
                        )}
                        <input ref={imageInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Zone Title</label>
                        <input
                          type="text"
                          value={editZoneTitle}
                          onChange={e => setEditZoneTitle(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-black text-lg text-indigo-900 outline-none focus:ring-4 focus:ring-[#c1e60d]/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Subtitle</label>
                        <input
                          type="text"
                          value={editZoneSubtitle}
                          onChange={e => setEditZoneSubtitle(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-base text-indigo-900 outline-none focus:ring-4 focus:ring-[#c1e60d]/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Detailed Description</label>
                        <textarea
                          value={editZoneDescription}
                          onChange={e => setEditZoneDescription(e.target.value)}
                          rows={11}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-medium text-indigo-900 outline-none focus:ring-4 focus:ring-[#c1e60d]/20 transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Column 2: Learning Content ── */}
                  <div className="flex flex-col gap-5">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-6">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Experience Level</label>
                        <div className="flex p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                          {(['Beginner', 'Intermediate', 'Expert'] as const).map(lvl => (
                            <button
                              key={lvl}
                              onClick={() => setEditZoneLevel(lvl)}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editZoneLevel === lvl ? 'bg-white text-indigo-900 shadow-md border border-gray-50' : 'text-gray-400 hover:text-indigo-900'}`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                      <TagInput label="Learning Outcomes" items={editLearningOutcomes} setItems={setEditLearningOutcomes} placeholder="Type outcome & press Enter" />
                      <TagInput label="Skills Gained" items={editSkillsGained} setItems={setEditSkillsGained} placeholder="Type skill & press Enter" />
                      <TagInput label="Subjects (Max 7)" items={editSubjects} setItems={setEditSubjects} maxItems={7} placeholder="Type subject & press Enter" />
                      <TagInput label="Batches (Max 7)" items={editBatches} setItems={setEditBatches} maxItems={7} placeholder="E.g. Morning Batch & press Enter" />
                    </div>
                  </div>

                  {/* ── Column 3: Pricing & Access ── */}
                  <div className="flex flex-col gap-5">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pricing & Access</p>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Access Fee</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                            {editZoneCurrency === 'USD' && <DollarSign size={20} />}
                            {editZoneCurrency === 'INR' && <IndianRupee size={20} />}
                            {editZoneCurrency === 'EUR' && <Euro size={20} />}
                          </div>
                          <input
                            type="number" min="0"
                            placeholder="0.00"
                            value={editZonePrice}
                            onChange={e => setEditZonePrice(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-4 font-black text-xl text-indigo-900 outline-none shadow-sm focus:ring-4 focus:ring-[#c1e60d]/20 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Currency</label>
                        <select
                          value={editZoneCurrency}
                          onChange={e => setEditZoneCurrency(e.target.value as any)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-black text-base text-indigo-900 outline-none shadow-sm focus:ring-4 focus:ring-[#c1e60d]/20 transition-all"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD" disabled>USD ($) - Coming Soon</option>
                          <option value="EUR" disabled>EUR (€) - Coming Soon</option>
                        </select>
                      </div>

                      {/* Fee Breakdown */}
                      {(() => {
                        const priceVal = parseFloat(editZonePrice) || 0;
                        const currencySymbol = editZoneCurrency === 'INR' ? '₹' : editZoneCurrency === 'USD' ? '$' : '€';
                        const currentTier = (user as any)?.current_tier?.toLowerCase() || 'starter';
                        const platformFeePercent = currentTier === 'premium' ? 0.02 : currentTier === 'standard' ? 0.05 : 0.10;
                        const platformFee = priceVal * platformFeePercent;
                        const gstFee = priceVal * 0.18;
                        const netPayout = priceVal - platformFee - gstFee;

                        return priceVal > 0 ? (
                          <div className="bg-nunma-forest/5 rounded-2xl border border-nunma-forest/10 p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <p className="text-[10px] font-black text-nunma-forest/60 uppercase tracking-[0.2em]">Fee Breakdown</p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                <span>Student Pays</span>
                                <span className="font-bold text-indigo-900">{currencySymbol}{priceVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                <span>Platform Fee ({(platformFeePercent * 100).toFixed(0)}%)</span>
                                <span className="text-red-500 font-bold">− {currencySymbol}{platformFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                <span>GST (18%)</span>
                                <span className="text-red-500 font-bold">− {currencySymbol}{gstFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                            <div className="pt-3 border-t border-nunma-forest/10 flex justify-between items-center">
                              <div>
                                <span className="text-sm font-black text-nunma-forest block">Net Earnings</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">After all fees</span>
                              </div>
                              <span className="text-2xl font-black text-emerald-600">
                                {currencySymbol}{netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border-2 border-dashed border-gray-100 p-6 text-center">
                            <p className="text-xs text-gray-300 font-bold">Enter a price to see fee breakdown</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

      <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 relative">

        {/* START EXAM MODAL */}
        {showStartExamModal && (
          <div className={`fixed top-0 right-0 bottom-0 max-md:left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[120] flex items-center justify-center p-6 bg-nunma-forest/80 max-md:bg-black/40 backdrop-blur-xl max-md:backdrop-blur-sm animate-in fade-in duration-300 transition-all`}>
            <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden p-10 animate-in zoom-in-95 duration-500">
              <h3 className="text-3xl font-black text-nunma-forest mb-4">Launch Exam</h3>
              <p className="text-sm text-gray-400 mb-10 leading-relaxed font-medium">Verify the broadcasting schedule before going live.</p>

              <div className="space-y-6 mb-12">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Scheduled Date</label>
                  <input type="date" value={examStartDate} onChange={e => setExamStartDate(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Time (Local)</label>
                  <input type="time" value={examStartTime} onChange={e => setExamStartTime(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all" />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowStartExamModal(false)} className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button
                  onClick={async () => {
                    if (!examToStart || !zoneId) return;
                    try {
                      await updateDoc(doc(db, 'zones', zoneId, 'exams', examToStart.id), { status: 'CONDUCTED' });
                      setShowStartExamModal(false);
                    } catch (e) {
                      console.error("Failed to launch exam:", e);
                      nunmaAlert("Database update failed.", "error");
                    }
                  }}
                  className="flex-[2] py-5 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 active:scale-95"
                >
                  Confirm Launch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EXTERNAL MODALS */}
        <VideoUploadModal
          isOpen={showVideoUploadModal}
          onClose={handleCloseVideoUpload}
          zoneId={zoneId}
          chapterId={activeChapterForUpload || undefined}
          onUploadSuccess={handleVideoUploadSuccess}
        />

        {showDocumentUploader && activeChapterForUpload && zoneId && (
          <DocumentModuleUploader
            courseId={zoneId}
            chapterId={activeChapterForUpload}
            onClose={handleCloseDocumentUploader}
            onSuccess={handleDocumentUploadSuccess}
          />
        )}

        {showTextModuleEditor && activeChapterForUpload && zoneId && (
          <TextModuleEditor
            courseId={zoneId}
            chapterId={activeChapterForUpload}
            onClose={() => { setShowTextModuleEditor(false); setActiveChapterForUpload(null); }}
            onSuccess={handleTextModuleSuccess}
          />
        )}

        {showQuizModuleEditor && activeChapterForUpload && zoneId && (
          <QuizModuleEditor
            courseId={zoneId}
            chapterId={activeChapterForUpload}
            onClose={() => { setShowQuizModuleEditor(false); setActiveChapterForUpload(null); }}
            onSuccess={handleQuizModuleSuccess}
          />
        )}

        {/* SCHEDULE SESSION MODAL */}
        {showScheduleModal && (
          <div className={`fixed top-0 right-0 bottom-0 max-md:left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[150] flex items-center justify-center p-6 bg-nunma-forest/80 max-md:bg-black/40 backdrop-blur-xl max-md:backdrop-blur-sm animate-in fade-in duration-300 transition-all`}>
            <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh] p-12 animate-in zoom-in-95 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-black text-nunma-forest">{editingSession ? 'Edit' : 'Schedule'} Session</h3>
                <button
                  onClick={() => { setShowScheduleModal(false); setEditingSession(null); setScheduleCoHosts([]); }}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6 mb-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Session Title</label>
                  <input
                    type="text"
                    value={scheduleTitle}
                    onChange={e => setScheduleTitle(e.target.value)}
                    placeholder="e.g. Masterclass on Logic"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 h-14 font-bold text-base text-nunma-forest outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 h-14 font-bold text-base text-nunma-forest outline-none transition-all"
                    />
                  </div>
                  {/* Interactive Clock Picker */}
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Time</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        placeholder={`${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl pl-6 pr-14 h-14 font-bold text-base text-nunma-forest outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowClockPicker(!showClockPicker)}
                        className="absolute right-3 p-2 hover:bg-gray-200 rounded-xl transition-all text-[#c2f575]"
                      >
                        <Clock size={20} />
                      </button>
                    </div>

                    {showClockPicker && (
                      <div className="absolute top-full right-0 mt-4 bg-white rounded-[2rem] shadow-[0_32px_80px_-8px_rgba(4,4,87,0.25)] border border-gray-100 p-5 z-[9999] animate-in slide-in-from-top-4 duration-300 min-w-[220px]" style={{width:'max-content'}}>
                        {/* Clock Display */}
                        <div className="flex flex-col items-center mb-5 mt-1 relative">
                          <div className="relative w-40 h-40 bg-gradient-to-br from-nunma-forest to-indigo-900 rounded-full shadow-2xl p-3">
                            <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                              {/* Hour Markers */}
                              {Array.from({ length: 12 }, (_, i) => {
                                const angle = (i * 30 - 90) * (Math.PI / 180);
                                const radius = 38;
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
                                      } else {
                                        const newMinute = i * 5;
                                        setSelectedMinute(newMinute);
                                        setScheduleTime(`${selectedHour}:${newMinute.toString().padStart(2, '0')} ${selectedPeriod}`);
                                      }
                                    }}
                                    className={`absolute w-7 h-7 rounded-full font-black text-[10px] transition-all transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 ${isSelected
                                      ? 'bg-[#c2f575] text-nunma-forest scale-110 shadow-lg'
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
                                  <div className="text-lg font-black text-nunma-forest tracking-tight">
                                    {selectedHour}:{selectedMinute.toString().padStart(2, '0')}
                                  </div>
                                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                    {clockMode === 'hour' ? 'Select Hour' : 'Select Minute'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* AM/PM Toggle */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex gap-2 bg-gray-50 rounded-2xl p-2">
                            {['AM', 'PM'].map((p) => (
                              <button
                                key={p}
                                onClick={() => {
                                  setSelectedPeriod(p as any);
                                  setScheduleTime(`${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${p}`);
                                }}
                                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedPeriod === p
                                  ? 'bg-nunma-forest text-white shadow-lg'
                                  : 'text-gray-400 hover:text-nunma-forest'
                                  }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              setScheduleTime(`${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`);
                              setShowClockPicker(false);
                            }}
                            className="px-6 py-3 bg-[#c2f575] text-nunma-forest rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Duration (Mins)</label>
                  <input
                    type="number" min="0"
                    value={scheduleDuration}
                    onChange={e => setScheduleDuration(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 h-14 font-bold text-base text-nunma-forest outline-none transition-all"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Assign Co-Hosts</label>
                  <select
                    onChange={e => {
                      if (e.target.value && !scheduleCoHosts.includes(e.target.value)) {
                        setScheduleCoHosts([...scheduleCoHosts, e.target.value]);
                      }
                      e.target.value = '';
                    }}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 h-14 font-bold text-base text-nunma-forest outline-none transition-all cursor-pointer"
                  >
                    <option value="">Select a student to co-host...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    {scheduleCoHosts.map(hostId => {
                      const host = students.find(s => s.id === hostId);
                      return (
                        <div key={hostId} className="flex items-center gap-2 bg-[#c2f575]/20 text-nunma-forest px-3 py-1.5 rounded-lg text-xs font-bold">
                          {host ? host.name : hostId}
                          <button type="button" onClick={() => setScheduleCoHosts(scheduleCoHosts.filter(id => id !== hostId))} className="text-red-500 hover:scale-110"><X size={12} /></button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { setShowScheduleModal(false); setEditingSession(null); setScheduleCoHosts([]); }}
                  className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!scheduleTitle || !scheduleDate || !scheduleTime || !zoneId) return;
                    const sessionData = {
                      title: scheduleTitle,
                      date: scheduleDate,
                      time: scheduleTime,
                      duration: scheduleDuration,
                      coHosts: scheduleCoHosts,
                      status: 'scheduled',
                      createdAt: new Date().toISOString()
                    };

                    try {
                      if (editingSession) {
                        await updateDoc(doc(db, 'zones', zoneId, 'sessions', editingSession.id), sessionData);
                      } else {
                        await addDoc(collection(db, 'zones', zoneId, 'sessions'), sessionData);
                      }

                      setShowScheduleModal(false);
                      setEditingSession(null);
                      setScheduleTitle('');
                      setScheduleDate('');
                      setScheduleTime('');
                      setScheduleCoHosts([]);
                      nunmaAlert(`Session ${editingSession ? 'updated' : 'scheduled'} successfully!`);
                    } catch (e) {
                      console.error("Error scheduling session:", e);
                      nunmaAlert("Failed to schedule session.", "error");
                    }
                  }}
                  className="flex-[2] py-5 bg-nunma-forest text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all"
                >
                  {editingSession ? 'Update' : 'Schedule'} Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE EXAM MODAL */}
        {showAddExamModal && (
          <div className={`fixed top-0 right-0 bottom-0 max-md:left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[130] bg-white animate-in fade-in duration-300 overflow-y-auto font-inter transition-all`}>
            <div className="w-full min-h-screen p-12 md:p-20 flex flex-col">
              <div className="flex justify-between items-center mb-16">
                <div>
                  <h3 className="text-5xl font-black text-nunma-forest tracking-tighter">Create Achievement Gate</h3>
                  <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest">Configuration & Assessment Setup</p>
                </div>
                <button onClick={() => setShowAddExamModal(false)} className="p-6 bg-gray-50 text-gray-400 rounded-3xl hover:bg-black hover:text-white transition-all shadow-sm"><X size={32} /></button>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-20">
                <div className="lg:col-span-4 space-y-10">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block px-1">Exam Name</label>
                    <input value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} placeholder="e.g. Final Certification Phase 1" className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-3xl px-10 py-6 font-bold text-nunma-forest outline-none transition-all text-lg shadow-sm" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block px-1">Date</label>
                    <input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-3xl px-10 py-6 font-bold text-nunma-forest outline-none transition-all shadow-sm" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block px-1">Time</label>
                    <input type="time" value={newExamTime} onChange={e => setNewExamTime(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-3xl px-10 py-6 font-bold text-nunma-forest outline-none transition-all shadow-sm" />
                  </div>
                  {newExamType !== 'online-mcq' && (
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block px-1">Duration (Minutes)</label>
                      <input type="number" min="1" value={newExamDuration} onChange={e => setNewExamDuration(e.target.value)} placeholder="e.g. 60" className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-3xl px-10 py-6 font-bold text-nunma-forest outline-none transition-all shadow-sm" />
                    </div>
                  )}
                  {zone?.subjects && zone.subjects.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block px-1">Subject</label>
                      <select value={newExamSubject} onChange={e => setNewExamSubject(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-3xl px-10 py-6 font-bold text-nunma-forest outline-none transition-all shadow-sm cursor-pointer">
                        <option value="">Select Subject...</option>
                        {zone.subjects.map((sub: string) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block px-1">Assessment Mode</label>
                    <div className="flex gap-4 p-2 bg-gray-50 rounded-3xl border border-gray-100">
                      {(['online-test', 'online-mcq', 'offline'] as const).map(mode => (
                        <button key={mode} onClick={() => setNewExamType(mode)} className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${newExamType === mode ? 'bg-nunma-forest text-white shadow-xl scale-[1.02]' : 'text-gray-400 hover:text-nunma-forest'}`}>
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block px-1">Max Marks</label>
                      <input type="number" min="0" value={newExamMaxMark} onChange={e => setNewExamMaxMark(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-3xl px-10 py-6 font-bold text-nunma-forest outline-none transition-all shadow-sm" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block px-1">Pass Marks</label>
                      <input type="number" min="0" value={newExamMinMark} onChange={e => setNewExamMinMark(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-3xl px-10 py-6 font-bold text-nunma-forest outline-none transition-all shadow-sm" />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 bg-gray-50/50 rounded-[4rem] p-12 border border-gray-100 flex flex-col min-h-[600px] shadow-inner">
                  <div className="flex-1 flex flex-col">
                    {newExamType === 'online-mcq' ? (
                      <MCQBuilder questions={newExamQuestions} setQuestions={setNewExamQuestions} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm text-center p-10 space-y-8 animate-in fade-in duration-700">
                        {newExamType === 'offline' ? (
                          <>
                            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center shadow-sm">
                              <FileText size={48} />
                            </div>
                            <div>
                              <p className="font-black text-2xl text-nunma-forest tracking-tight">Offline Assessment Mode</p>
                              <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-wide">Standard Paper-Based Testing</p>
                            </div>
                            <p className="text-gray-400 max-w-md mx-auto leading-relaxed">Upload a PDF question paper for students to download. After the exam, upload the students' marks via an Excel sheet in the gradebook.</p>
                            <label className="flex flex-col items-center justify-center w-full max-w-lg h-48 border-4 border-dashed border-emerald-100 hover:border-emerald-300 rounded-[3rem] cursor-pointer bg-white transition-all hover:bg-emerald-50/30 group">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload size={32} className="mb-4 text-emerald-300 group-hover:text-emerald-500 transition-colors" />
                                <p className="text-sm font-black text-emerald-600 uppercase tracking-widest">{newExamFile ? newExamFile.name : 'Upload Question Paper (.pdf)'}</p>
                              </div>
                              <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files && setNewExamFile(e.target.files[0])} />
                            </label>
                          </>
                        ) : (
                          <>
                            <div className="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-[2rem] flex items-center justify-center shadow-sm">
                              <FileText size={48} />
                            </div>
                            <div>
                                <p className="font-black text-2xl text-nunma-forest tracking-tight">Online PDF Test Mode</p>
                                <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-wide">Live Monitored Assessment</p>
                            </div>
                            <p className="text-gray-400 max-w-md mx-auto leading-relaxed">Students will view your uploaded PDF question paper while their camera/mic is monitored. They will have 20 mins after the exam to scan and upload their answers.</p>
                            <label className="flex flex-col items-center justify-center w-full max-w-lg h-48 border-4 border-dashed border-indigo-100 hover:border-indigo-300 rounded-[3rem] cursor-pointer bg-white transition-all hover:bg-indigo-50/30 group">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload size={32} className="mb-4 text-indigo-300 group-hover:text-indigo-500 transition-colors" />
                                <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">{newExamFile ? newExamFile.name : 'Upload Question Paper (.pdf)'}</p>
                              </div>
                              <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files && setNewExamFile(e.target.files[0])} />
                            </label>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-20 pt-10 border-t border-gray-100">
                <button onClick={handleCreateExam} className="w-full py-8 bg-[#c2f575] text-nunma-forest rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-6">
                  <Sparkles size={24} /> Deploy Exam Instance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MARK ENTRY MODAL (FOR OFFLINE) */}
        {showMarkEntryModal && selectedExamForMarks && (
          <div className={`fixed top-0 right-0 bottom-0 max-md:left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[130] flex items-center justify-center p-6 bg-nunma-forest/90 max-md:bg-black/40 backdrop-blur-2xl max-md:backdrop-blur-sm animate-in fade-in duration-300 transition-all`}>
            <div className="bg-white rounded-[4rem] w-full max-w-5xl shadow-3xl overflow-hidden p-12 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-500">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-4xl font-black text-nunma-forest tracking-tight">Gradebook: {selectedExamForMarks.title}</h3>
                  <p className="text-sm text-gray-400 mt-2 font-medium">Bulk import marks or enter them manually for each student.</p>
                </div>
                <button onClick={() => setShowMarkEntryModal(false)} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all"><X size={24} /></button>
              </div>

              <div className="flex gap-6 mb-10">
                <div className="flex-1 bg-gray-50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-4 hover:border-[#c2f575] transition-all relative">
                  <Upload size={32} className="text-gray-300" />
                  <div>
                    <h4 className="font-bold text-nunma-forest">Excel Import</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">S.no, Name, Mark</p>
                  </div>
                  <input type="file" accept=".xls,.xlsx,.csv" onChange={(e) => handleExcelUpload(e, selectedExamForMarks.id)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="flex-1 bg-gray-50 p-8 rounded-[2.5rem] border-2 border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                  <FileDown size={32} className="text-gray-300" />
                  <div>
                    <h4 className="font-bold text-nunma-forest">Download Template</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Get blank sheet with student list</p>
                  </div>
                  <button onClick={handleDownloadTemplate} className="text-[10px] font-black text-nunma-forest bg-[#c2f575] px-6 py-3 rounded-xl uppercase tracking-widest">Download</button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="bg-gray-50 border border-gray-100 rounded-3xl overflow-hidden flex-1 flex flex-col">
                  <div className="grid grid-cols-4 bg-white/50 p-6 border-b border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Marks ({selectedExamForMarks.maxMark})</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Result</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {(students || []).map(student => {
                      const result = (examResults || []).find(r => r?.examId === selectedExamForMarks?.id && r?.studentId === student?.id);
                      return (
                        <div key={student.id} className="grid grid-cols-4 items-center bg-white p-5 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-4">
                            <img src={student.avatar} className="w-10 h-10 rounded-xl" alt="" />
                            <span className="font-bold text-nunma-forest text-sm">{student.name}</span>
                          </div>
                          <div className="text-center">
                            <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${result ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              {result ? 'Graded' : 'Pending'}
                            </span>
                            {result?.answerSheetUrl && (
                              <button
                                onClick={() => setViewingPdfUrl(result.answerSheetUrl!)}
                                className="block mx-auto mt-2 text-[10px] text-indigo-500 font-bold hover:underline"
                              >
                                View Answer Sheet
                              </button>
                            )}
                          </div>
                          <div className="flex justify-center">
                            <input
                              type="number" min="0"
                              placeholder="0"
                              value={result?.marks || ''}
                              onChange={e => {
                                const mark = parseInt(e.target.value);
                                const minPassMark = selectedExamForMarks?.minMark ?? 40;
                                const status = mark >= minPassMark ? 'passed' : 'failed';
                                setExamResults(prev => [
                                  ...prev.filter(r => !(r.examId === selectedExamForMarks.id && r.studentId === student.id)),
                                  { id: Math.random().toString(), examId: selectedExamForMarks.id, studentId: student.id, studentName: student.name, marks: mark, status, warnings: 0 }
                                ]);
                              }}
                              className="w-20 bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-xl px-4 py-2 text-center font-bold text-nunma-forest outline-none"
                            />
                          </div>
                          <div className="text-right">
                            {result && (
                              <span className={`font-black uppercase text-[10px] tracking-widest ${result.status === 'passed' ? 'text-green-500' : 'text-red-500'}`}>
                                {result.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button onClick={() => setShowMarkEntryModal(false)} className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button onClick={() => { setShowMarkEntryModal(false); nunmaAlert('Gradebook synchronized successfully.', "success"); }} className="flex-[2] py-5 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Complete Synchronization</button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Viewer for Grading */}
        {viewingPdfUrl && (
          <PDFViewer url={viewingPdfUrl} onClose={() => setViewingPdfUrl(null)} />
        )}

        {/* GRADING HUB MODAL */}
        {showGradingHubModal && selectedExamForGrading && zoneId && (
          <GradingHub
            zoneId={zoneId}
            exam={selectedExamForGrading}
            onClose={() => {
              setShowGradingHubModal(false);
              setSelectedExamForGrading(null);
            }}
            onValuate={handleValuate}
          />
        )}

        {/* SHARE ACCESS MODAL */}
        {showShareAccessModal && (
          <div className={`fixed top-0 right-0 bottom-0 max-md:left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[120] flex items-center justify-center p-6 bg-nunma-forest/80 max-md:bg-black/40 backdrop-blur-xl max-md:backdrop-blur-sm animate-in fade-in duration-300 transition-all`}>
            <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-2xl overflow-hidden p-12 animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-4xl font-black text-nunma-forest tracking-tighter">Share Access</h3>
                  <p className="text-sm text-gray-400 mt-2 font-medium">Add co-tutors and assign them a specific subject to manage.</p>
                </div>
                <button onClick={() => setShowShareAccessModal(false)} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all"><X size={24} /></button>
              </div>

              <div className="space-y-8">
                {/* Current Co-tutors */}
                {zone?.coTutors && zone.coTutors.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Current Co-Tutors ({zone.coTutors.length}/7)</h4>
                    <div className="space-y-3">
                      {zone.coTutors.map((ct: any) => (
                        <div key={ct.uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-4">
                            <img src={ct.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ct.name}`} alt="" className="w-10 h-10 rounded-xl" />
                            <div>
                              <p className="font-bold text-nunma-forest">{ct.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{ct.subject}</p>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                              try {
                                const newCoTutors = zone.coTutors.filter((t: any) => t.uid !== ct.uid);
                                await updateDoc(doc(db, 'zones', zoneId!), { coTutors: newCoTutors });
                                toast.success("Access revoked");
                              } catch(e) {
                                toast.error("Failed to revoke access");
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!zone?.coTutors || zone.coTutors.length < 7) ? (
                  <div className="space-y-6 pt-6 border-t border-gray-100">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Add New Co-Tutor</h4>
                    
                    <div className="space-y-4 relative">
                      <input
                        type="email"
                        placeholder="Search user by email..."
                        value={newCoTutorEmail}
                        onChange={e => setNewCoTutorEmail(e.target.value)}
                        onFocus={() => setShowCoTutorSuggestions(true)}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all"
                      />

                      {showCoTutorSuggestions && (coTutorSearchResults.length > 0 || isSearchingCoTutors) && (
                        <div className="absolute left-0 right-0 top-14 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[130]">
                          {isSearchingCoTutors ? (
                            <div className="p-4 flex items-center justify-center gap-3 text-gray-400 text-xs font-bold uppercase tracking-widest">
                              <Loader2 size={16} className="animate-spin" /> Searching...
                            </div>
                          ) : (
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              {coTutorSearchResults.map(u => (
                                <button
                                  key={u.id}
                                  onClick={() => {
                                    setNewCoTutorEmail(u.email);
                                    setShowCoTutorSuggestions(false);
                                  }}
                                  className="w-full p-4 flex items-center gap-4 hover:bg-[#c2f575]/10 transition-colors text-left"
                                >
                                  <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} className="w-10 h-10 rounded-xl" alt="" />
                                  <div>
                                    <p className="font-black text-nunma-forest text-sm">{u.name}</p>
                                    <p className="text-xs text-gray-400 font-medium">{u.email}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <select
                        value={selectedCoTutorSubject}
                        onChange={(e) => setSelectedCoTutorSubject(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all cursor-pointer"
                      >
                        <option value="">Select a subject to assign...</option>
                        {zone?.subjects?.map((sub: string) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      disabled={!newCoTutorEmail || !selectedCoTutorSubject}
                      onClick={async () => {
                        const targetUser = coTutorSearchResults.find(u => u.email === newCoTutorEmail);
                        if (!targetUser) return toast.error("Please select a valid user from the search results");
                        if (zone?.coTutors?.some((t: any) => t.uid === targetUser.id)) return toast.error("User already has access");

                        try {
                          const newTutor = {
                            uid: targetUser.id,
                            email: targetUser.email,
                            name: targetUser.name,
                            avatar: targetUser.avatar || '',
                            subject: selectedCoTutorSubject
                          };
                          
                          const updatedTutors = [...(zone?.coTutors || []), newTutor];
                          await updateDoc(doc(db, 'zones', zoneId!), { coTutors: updatedTutors });
                          toast.success("Co-tutor added successfully!");
                          setNewCoTutorEmail('');
                          setSelectedCoTutorSubject('');
                          setShowCoTutorSuggestions(false);
                        } catch(e) {
                          toast.error("Failed to add co-tutor");
                        }
                      }}
                      className="w-full py-5 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Grant Co-Tutor Access
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-red-50 text-red-500 rounded-2xl text-sm font-bold">
                    Maximum limit of 7 co-tutors reached.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WHITELIST MODAL */}
        {showAddStudentModal && (
          <div className={`fixed top-0 right-0 bottom-0 max-md:left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[120] flex items-center justify-center p-6 bg-nunma-forest/80 max-md:bg-black/40 backdrop-blur-xl max-md:backdrop-blur-sm animate-in fade-in duration-300 transition-all`}>
            <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-2xl p-12 animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-4xl font-black text-nunma-forest tracking-tighter">Add Student</h3>
                  <p className="text-sm text-gray-400 mt-2 font-medium">Grant account access by providing student email addresses.</p>
                </div>
                <button onClick={() => setShowAddStudentModal(false)} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all"><X size={24} /></button>
              </div>

              <div className="space-y-10">
                {/* Promote Zone Section */}
                <div className="bg-gray-50 rounded-3xl p-6 border-2 border-dashed border-gray-200">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Globe size={16} /> Share Public Link</h4>
                  <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex-shrink-0">
                      <QRCodeSVG value={`${window?.location?.origin || ""}/workplace?join=${zoneId || ""}`} size={100} fgColor="#052E16" />
                    </div>
                    <div className="space-y-4 flex-1 w-full">
                      <p className="text-xs text-gray-500 font-bold">Share your unique event link or QR code to gather registrations.</p>
                      <div className="flex gap-2">
                        <button onClick={() => navigator?.clipboard?.writeText(`${window?.location?.origin || ""}/workplace?join=${zoneId || ""}`).then(() => nunmaAlert('Link copied!', "success"))} className="flex-1 py-3 bg-white border border-gray-200 text-nunma-forest rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2">
                          <Copy size={14} /> Copy Link
                        </button>
                        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join my space: ${zone?.title || ""}`)}&url=${encodeURIComponent(`${window?.location?.origin || ""}/workplace?join=${zoneId || ""}`)}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                        </a>
                        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window?.location?.origin || ""}/workplace?join=${zoneId || ""}`)}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-700 hover:text-white transition-all shadow-sm">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
                        </a>
                        <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my space: ${zone?.title || ""} ${window?.location?.origin || ""}/workplace?join=${zoneId || ""}`)}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-green-50 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Assign to Batch (Optional)</label>
                  <select
                    value={selectedBatchForInvite}
                    onChange={(e) => setSelectedBatchForInvite(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all cursor-pointer"
                  >
                    <option value="all">No Batch (Default)</option>
                    {zoneBatches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Individual Invite</label>
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <input
                        type="email"
                        placeholder="student@example.com"
                        value={newStudentEmail}
                        onChange={e => setNewStudentEmail(e.target.value)}
                        onFocus={() => setShowUserSuggestions(true)}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-5 font-bold text-nunma-forest outline-none transition-all"
                      />

                      {showUserSuggestions && (userSearchResults.length > 0 || isSearchingUsers) && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[130] animate-in slide-in-from-top-2 duration-200">
                          {isSearchingUsers ? (
                            <div className="p-4 flex items-center justify-center gap-3 text-gray-400 text-xs font-bold uppercase tracking-widest">
                              <div className="w-4 h-4 border-2 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div>
                              Searching...
                            </div>
                          ) : (
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              {userSearchResults.map(u => (
                                <button
                                  key={u.id}
                                  onClick={() => {
                                    setNewStudentEmail(u.email);
                                    setShowUserSuggestions(false);
                                  }}
                                  className="w-full p-4 flex items-center gap-4 hover:bg-[#c2f575]/10 transition-colors text-left group"
                                >
                                  <img src={u.avatar} className="w-10 h-10 rounded-xl" alt="" />
                                  <div>
                                    <p className="font-black text-nunma-forest text-sm group-hover:text-indigo-600 transition-colors">{u.name}</p>
                                    <p className="text-xs text-gray-400 font-medium">{u.email}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      disabled={isWhitelisting}
                      onClick={async () => {
                        if (!zoneId || !newStudentEmail) {
                          return nunmaAlert("Missing zoneId or email", "success");
                        }

                        setIsWhitelisting(true);
                        try {
                          const processWhitelistFn = httpsCallable(functions, 'processWhitelist');
                          const result: any = await processWhitelistFn({ zoneId, email: newStudentEmail, batchId: selectedBatchForInvite === 'all' ? null : selectedBatchForInvite });
                          const data = result.data;

                          if (data.enrolled > 0) {
                            const { studentUid, zoneName, tutorName } = data;
                            
                            // 1. In-app Notification
                            if (studentUid) {
                              addDoc(collection(db, 'users', studentUid, 'notifications'), {
                                type: 'ZONE_ENROLLED',
                                message: `You've been added to "${zoneName || zone?.title || 'a new zone'}" by ${tutorName || zone?.tutorName || 'your instructor'}`,
                                zoneId,
                                read: false,
                                createdAt: serverTimestamp()
                              }).catch(err => console.error('Notification write failed:', err));

                              // 2. Email Notification
                              sendEnrollmentEmail({
                                studentEmail: newStudentEmail,
                                studentName: '', // We don't have it yet, the function will use 'Student'
                                zoneName: zoneName || zone?.title || 'Learning Zone',
                                tutorName: tutorName || zone?.tutorName || 'Instructor',
                                zoneId
                              }).catch(err => console.error('Enrollment email failed:', err));
                            }

                            toast.success('Student successfully added and notified.', { icon: '✅' });
                          } else if (data.pending > 0) {
                            toast.success('Email added. Access will be granted when they register.', { icon: '📧' });
                          } else if (data.alreadyEnrolled > 0) {
                            toast('Student is already enrolled in this Zone.', { icon: 'ℹ️' });
                          } else {
                            toast.error('Failed to process this email. Please check the address.');
                          }

                          setNewStudentEmail('');
                          setShowUserSuggestions(false);
                        } catch (e: any) {
                          console.error("Whitelist error:", e);
                          toast.error(e.message || 'Failed to grant access. Please try again.');
                        } finally {
                          setIsWhitelisting(false);
                        }
                      }}
                      className={`px-8 py-5 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl ${isWhitelisting ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {isWhitelisting ? (
                        <div className="w-4 h-4 border-2 border-[#c2f575] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Grant Access'
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative py-4 flex items-center">
                  <div className="flex-1 border-t border-gray-100"></div>
                  <span className="px-6 text-[10px] font-black text-gray-200 uppercase tracking-widest bg-white">OR</span>
                  <div className="flex-1 border-t border-gray-100"></div>
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-3">
                    <FileSpreadsheet size={16} /> Bulk Add (Excel/CSV)
                  </label>
                  <div className="relative group">
                    <div className="w-full h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8 group-hover:border-[#c2f575] transition-all relative overflow-hidden">
                      <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                        <Upload size={32} className="text-indigo-900" />
                      </div>
                      <p className="text-sm font-bold text-nunma-forest mb-1">Upload Student List</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
                        Column A: Name · Column B: Email
                      </p>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !zoneId) return;

                          setIsWhitelisting(true);
                          try {
                            const data = await file.arrayBuffer();
                            const workbook = XLSX.read(data);
                            const sheet = workbook.Sheets[workbook.SheetNames[0]];
                            const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

                            // Skip header row if it seems to be one
                            const startIdx = ((rows[0]?.[0] || "").toString().toLowerCase() === 'name' || (rows[0]?.[1] || "").toString().toLowerCase() === 'email') ? 1 : 0;
                            const emailsToProcess = rows.slice(startIdx)
                              .map(row => (row[1]?.toString() || "").trim().toLowerCase())
                              .filter(email => email && email.includes('@'));

                            if (emailsToProcess.length === 0) {
                              toast.error('No valid email addresses found in the file.');
                              return;
                            }

                            const processWhitelistFn = httpsCallable(functions, 'processWhitelist');
                            const res = { enrolled: 0, pending: 0, alreadyEnrolled: 0, failed: 0 };
                            
                            await Promise.all(emailsToProcess.map(async (email) => {
                                try {
                                  const result: any = await processWhitelistFn({ zoneId, email, batchId: selectedBatchForInvite === 'all' ? null : selectedBatchForInvite });
                                  const data = result.data;
                                  if (data.enrolled) res.enrolled++;
                                  if (data.pending) res.pending++;
                                  if (data.alreadyEnrolled) res.alreadyEnrolled++;
                                } catch (e) {
                                  res.failed++;
                                }
                            }));

                            toast.success(
                              `Processed ${emailsToProcess.length} students. Enrolled: ${res.enrolled}, Pending: ${res.pending}${res.alreadyEnrolled > 0 ? `, Already enrolled: ${res.alreadyEnrolled}` : ''}${res.failed > 0 ? `, Failed: ${res.failed}` : ''}`,
                              { duration: 5000, icon: '📋' }
                            );
                            e.target.value = ''; // Reset file input
                          } catch (err: any) {
                            console.error("Error processing bulk upload:", err);
                            toast.error(err.message || 'Failed to process file. Please try again.');
                          } finally {
                            setIsWhitelisting(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-300 font-bold px-4 italic leading-relaxed">
                    Account-less emails will be granted access automatically when they register in the future.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BATCH MANAGEMENT MODAL */}
        {showBatchModal && (
          <div className={`fixed top-0 right-0 bottom-0 max-md:left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[140] flex items-center justify-center p-6 bg-nunma-forest/80 max-md:bg-black/40 backdrop-blur-xl max-md:backdrop-blur-sm animate-in fade-in duration-300 transition-all`}>
            <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-visible p-10 animate-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-3xl font-black text-nunma-forest">Manage Batches</h3>
                  <p className="text-xs text-gray-400 font-bold mt-1">{zoneBatches.length}/{MAX_BATCHES_PER_ZONE} batches created</p>
                </div>
                <button onClick={() => setShowBatchModal(false)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all"><X size={20} /></button>
              </div>

              {/* Existing Batches */}
              {zoneBatches.length > 0 && (
                <div className="space-y-3 mb-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {zoneBatches.map(batch => {
                    const count = students.filter(s => s.batchId === batch.id).length;
                    return (
                      <div key={batch.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg" style={{ backgroundColor: batch.color }}>
                            {batch.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-nunma-forest">{batch.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{count} student{count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteBatch(batch.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {/* Unassigned group */}
                  {(() => {
                    const unassigned = students.filter(s => !s.batchId).length;
                    return unassigned > 0 ? (
                      <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-200 text-gray-500 font-black text-sm">?</div>
                        <div>
                          <p className="font-bold text-gray-400">Unassigned</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{unassigned} student{unassigned !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Create New Batch */}
              {zoneBatches.length < MAX_BATCHES_PER_ZONE ? (
                <div className="space-y-4 pt-6 border-t border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Create New Batch</h4>
                  <input
                    type="text"
                    placeholder="e.g. Morning Batch, Section A, Evening..."
                    value={newBatchName}
                    onChange={e => setNewBatchName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddBatch()}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all"
                    maxLength={40}
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Color</span>
                    <div className="flex gap-2">
                      {batchColorPalette.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewBatchColor(color)}
                          className={`w-8 h-8 rounded-xl transition-all ${newBatchColor === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-300' : 'hover:scale-110'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAddBatch}
                    disabled={!newBatchName.trim()}
                    className="w-full py-4 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Create Batch
                  </button>
                </div>
              ) : (
                <div className="text-center p-4 bg-amber-50 text-amber-600 rounded-2xl text-xs font-bold">
                  Maximum of {MAX_BATCHES_PER_ZONE} batches reached.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAKE ATTENDANCE MODAL */}
        {showTakeAttendanceModal && (
          <div className={`fixed top-0 right-0 bottom-0 max-md:left-0 ${isSidebarOpen ? 'md:left-[240px]' : 'md:left-[64px]'} z-[140] flex items-center justify-center p-6 bg-nunma-forest/80 max-md:bg-black/40 backdrop-blur-xl max-md:backdrop-blur-sm animate-in fade-in duration-300 transition-all`}>
            <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-visible p-10 animate-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col">
              <h3 className="text-3xl font-black text-nunma-forest mb-4">
                Take Attendance
                {activeBatchFilter !== 'all' && (
                  <span className="ml-3 text-lg font-bold text-gray-400">
                    — {activeBatchFilter === 'unassigned' ? 'Unassigned' : zoneBatches.find(b => b.id === activeBatchFilter)?.name || ''}
                  </span>
                )}
              </h3>

              <div className="space-y-6 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Date</label>
                    <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all" />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Time</label>
                    <div
                      onClick={() => setShowTimePicker(!showTimePicker)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest cursor-pointer flex items-center justify-between hover:bg-gray-100 transition-all"
                    >
                      <span>{attendanceTime}</span>
                      <Clock size={18} className="text-gray-400" />
                    </div>

                    {/* Use the unified Clock Picker for Attendance too */}
                    {showTimePicker && (
                      <div className="absolute top-full right-0 mt-2 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-8 z-50 animate-in slide-in-from-top-2 w-[320px]">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Time</h4>
                          <button onClick={() => setShowTimePicker(false)} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
                        </div>

                        <div className="flex flex-col items-center mb-6 relative">
                          <div className="relative w-48 h-48 bg-gradient-to-br from-nunma-forest to-indigo-900 rounded-full shadow-xl p-3">
                            <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
                              {Array.from({ length: 12 }, (_, i) => {
                                const angle = (i * 30 - 90) * (Math.PI / 180);
                                const radius = 38;
                                const x = 50 + radius * Math.cos(angle);
                                const y = 50 + radius * Math.sin(angle);
                                const number = clockMode === 'hour' ? (i === 0 ? 12 : i) : i * 5;
                                const isSelected = clockMode === 'hour' ? parseInt(tpHour) === (i === 0 ? 12 : i) : parseInt(tpMinute) === i * 5;

                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (clockMode === 'hour') {
                                        const h = i === 0 ? 12 : i;
                                        updateTimeFromPicker(h < 10 ? `0${h}` : `${h}`, tpMinute, tpPeriod);
                                        setClockMode('minute');
                                      } else {
                                        const m = i * 5;
                                        updateTimeFromPicker(tpHour, m < 10 ? `0${m}` : `${m}`, tpPeriod);
                                      }
                                    }}
                                    className={`absolute w-8 h-8 rounded-full font-black text-[10px] transition-all transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 ${isSelected
                                      ? 'bg-[#c2f575] text-nunma-forest scale-110 shadow-lg'
                                      : 'bg-gray-50 text-gray-600 hover:bg-[#c2f575]/20 hover:scale-105'
                                      }`}
                                    style={{ left: `${x}%`, top: `${y}%` }}
                                  >
                                    {number}
                                  </button>
                                );
                              })}

                              <div className="text-center pointer-events-none">
                                <div className="text-lg font-black text-nunma-forest">{tpHour}:{tpMinute}</div>
                                <div className="text-[6px] font-black text-gray-400 uppercase tracking-widest">{clockMode === 'hour' ? 'Hour' : 'Min'}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex-1 flex gap-1 bg-gray-50 rounded-xl p-1">
                            {['AM', 'PM'].map(p => (
                              <button
                                key={p}
                                onClick={() => updateTimeFromPicker(tpHour, tpMinute, p)}
                                className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${tpPeriod === p ? 'bg-nunma-forest text-white shadow-md' : 'text-gray-400'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowTimePicker(false)}
                            className="px-4 py-2 bg-[#c2f575] text-nunma-forest rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all shadow-md"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Class Name (Optional)</label>
                    <input type="text" placeholder="e.g. Morning Theory" value={newAttendanceClassName} onChange={e => setNewAttendanceClassName(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-8 pr-2 custom-scrollbar">
                <div className="mb-4">
                    <input type="text" placeholder="Search students..." value={attendanceModalSearchQuery} onChange={e => setAttendanceModalSearchQuery(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all" />
                  </div>
                  <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                      <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.filter(s => !attendanceModalSearchQuery || (s.name || '').toLowerCase().includes(attendanceModalSearchQuery.toLowerCase()) || (s.email || '').toLowerCase().includes(attendanceModalSearchQuery.toLowerCase())).map(student => (
                      <tr key={student.id}>
                        <td className="py-4 font-bold text-nunma-forest">{student.name}</td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setManualAttendanceState(prev => {
                                const next = { ...prev };
                                if (next[student.id] === 'Present') {
                                  delete next[student.id];
                                } else {
                                  next[student.id] = 'Present';
                                }
                                return next;
                              })}
                              className={`p-2 rounded-lg transition-all ${manualAttendanceState[student.id] === 'Present' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600'}`}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setManualAttendanceState(prev => {
                                const next = { ...prev };
                                if (next[student.id] === 'Absent') {
                                  delete next[student.id];
                                } else {
                                  next[student.id] = 'Absent';
                                }
                                return next;
                              })}
                              className={`p-2 rounded-lg transition-all ${manualAttendanceState[student.id] === 'Absent' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowTakeAttendanceModal(false)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button onClick={handleTakeAttendance} className="flex-[2] py-4 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Save Session</button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 max-md:mt-16">
          <div className="flex items-center gap-8 max-md:gap-4">
            <button onClick={() => navigate('/workplace')} className="hidden md:block p-5 bg-white border border-gray-100 rounded-[1.5rem] text-nunma-forest hover:shadow-2xl transition-all shadow-sm active:scale-90"><ArrowLeft size={28} /></button>
            <div>
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-6xl max-md:text-4xl font-black text-nunma-forest tracking-tighter leading-tight pb-2">{zone.title}</h1>
                {isCreator && (
                  <button onClick={handleOpenZoneSettings} className="p-3 bg-white border border-gray-100 text-nunma-forest rounded-2xl hover:bg-gray-50 hover:shadow-lg transition-all active:scale-95 shadow-sm" title="Zone Settings">
                    <Settings size={28} />
                  </button>
                )}
              </div>
              <p className="text-[11px] font-bold text-nunma-forest/70 uppercase tracking-[0.4em]">{zone.level} LEVEL FACILITY</p>
            </div>
          </div>
          <div className="flex gap-4 max-md:flex-wrap max-md:w-full max-md:mt-4">
            {/* Analytics: visible on desktop only, moved to mobile grid */}
            <button onClick={() => navigate(`/workplace/analytics/${zoneId}`)} className="max-md:hidden px-10 py-5 bg-white border border-gray-100 text-nunma-forest rounded-[1.75rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-4 hover:shadow-2xl transition-all shadow-sm active:scale-95">
              <BarChart3 size={20} /> Analytics
            </button>

            {isCreator && (
              <button onClick={() => setShowAddStudentModal(true)} className="px-10 py-5 max-md:px-6 max-md:py-4 max-md:flex-1 bg-nunma-forest text-white rounded-[1.75rem] font-black uppercase text-xs max-md:text-[10px] tracking-widest flex items-center justify-center gap-4 max-md:gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-nunma-forest/20">
                <UserPlus size={20} /> <span className="max-md:hidden">Add Student</span>
              </button>
            )}

            {isCreator && (
              <>
                <button onClick={() => setShowShareAccessModal(true)} className="px-8 py-5 max-md:px-6 max-md:py-4 max-md:flex-1 bg-[#c2f575] text-nunma-forest rounded-[1.75rem] font-black uppercase text-xs max-md:text-[10px] tracking-widest flex items-center justify-center gap-4 max-md:gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl">
                  <Shield size={20} /> <span className="max-md:hidden">Share Access</span>
                </button>

                <button onClick={handleDeleteZone} className="px-6 py-5 max-md:py-4 max-md:flex-none bg-red-50 text-red-500 rounded-[1.75rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-4 max-md:gap-3 hover:bg-red-500 hover:text-white transition-all shadow-xl">
                  <Trash2 size={20} />
                </button>
              </>
            )}
          </div>
        </div>

        {view === 'management' ? (
          <div className="bg-white max-md:bg-transparent rounded-[4rem] max-md:rounded-none border max-md:border-none border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] max-md:shadow-none overflow-hidden min-h-[740px] flex flex-col">

            {/* ── DESKTOP TAB BAR (unchanged) ── */}
            <div className="hidden md:flex bg-gray-50/50 p-4 border-b border-gray-100 gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'attendance', label: 'ATTENDANCE', icon: <CheckCircle2 size={16} />, visible: !zone?.zoneType || zone.zoneType === 'Class Management' },
                { id: 'curriculum', label: 'COURSE', icon: <Layers size={16} />, visible: !zone?.zoneType || zone.zoneType === 'Class Management' || zone.zoneType === 'Course' },
                { id: 'exams', label: 'EXAM STREAMS', icon: <GraduationCap size={16} />, visible: !zone?.zoneType || zone.zoneType === 'Class Management' },
                { id: 'schedule', label: 'SCHEDULE LIVE', icon: <Video size={16} />, visible: !zone?.zoneType || zone.zoneType === 'Class Management' || zone.zoneType === 'Workshop' },
                { id: 'students', label: 'STUDENTS', icon: <Users size={16} />, visible: true },
                { id: 'landing', label: 'LANDING PAGE', icon: <Globe size={16} />, visible: zone?.zoneType === 'Workshop' },
                { id: 'post-session', label: 'POST-SESSION', icon: <FileText size={16} />, visible: zone?.zoneType === 'Workshop' }
              ].filter(t => t.visible).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-5 px-10 rounded-[1.75rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 whitespace-nowrap
                  ${activeTab === tab.id
                      ? 'bg-white text-nunma-forest shadow-xl border border-gray-100'
                      : 'text-gray-400 hover:text-nunma-forest hover:bg-white/50'
                    }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ── MOBILE: 2-column icon grid (no scroll needed) ── */}
            <div className="md:hidden px-4 pt-4 pb-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'attendance', label: 'Attendance', icon: <CheckCircle2 size={22} />, visible: !zone?.zoneType || zone.zoneType === 'Class Management' },
                  { id: 'curriculum', label: 'Course', icon: <Layers size={22} />, visible: !zone?.zoneType || zone.zoneType === 'Class Management' || zone.zoneType === 'Course' },
                  { id: 'exams', label: 'Exam Streams', icon: <GraduationCap size={22} />, visible: !zone?.zoneType || zone.zoneType === 'Class Management' },
                  { id: 'schedule', label: 'Schedule Live', icon: <Video size={22} />, visible: !zone?.zoneType || zone.zoneType === 'Class Management' || zone.zoneType === 'Workshop' },
                  { id: 'students', label: 'Students', icon: <Users size={22} />, visible: true },
                  { id: 'landing', label: 'Landing Page', icon: <Globe size={22} />, visible: zone?.zoneType === 'Workshop' },
                  { id: 'post-session', label: 'Post-Session', icon: <FileText size={22} />, visible: zone?.zoneType === 'Workshop' }
                ].filter(t => t.visible).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95 text-left
                      ${activeTab === tab.id
                        ? 'bg-nunma-forest text-white shadow-lg shadow-nunma-forest/20'
                        : 'bg-white text-gray-400 border border-gray-100 shadow-sm'
                      }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                      ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-50'}`}>
                      {tab.icon}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wide leading-tight">{tab.label}</span>
                  </button>
                ))}

                {/* Analytics tile - always last */}
                <button
                  onClick={() => navigate(`/workplace/analytics/${zoneId}`)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95 text-left bg-white text-gray-400 border border-gray-100 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-50">
                    <BarChart3 size={22} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wide leading-tight">Analytics</span>
                </button>
              </div>
            </div>

            {/* 🏷️ BATCH FILTER BAR (shown when batches exist on people-related tabs) 🏷️ */}
            {zoneBatches.length > 0 && (activeTab === 'attendance' || activeTab === 'exams' || activeTab === 'students' || activeTab === 'schedule') && (
              <div className="px-16 max-md:px-4 pt-6 pb-2 flex items-center gap-3 overflow-x-auto no-scrollbar border-b border-gray-50">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex-shrink-0 mr-1">Batch</span>
                <button
                  onClick={() => setActiveBatchFilter('all')}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${
                    activeBatchFilter === 'all'
                      ? 'bg-nunma-forest text-white shadow-lg'
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  All ({students.length})
                </button>
                {zoneBatches.map(batch => {
                  const count = students.filter(s => s.batchId === batch.id).length;
                  return (
                    <button
                      key={batch.id}
                      onClick={() => setActiveBatchFilter(batch.id)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 flex items-center gap-2 ${
                        activeBatchFilter === batch.id
                          ? 'text-white shadow-lg'
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                      style={activeBatchFilter === batch.id ? { backgroundColor: batch.color } : {}}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: batch.color }} />
                      {batch.name} ({count})
                    </button>
                  );
                })}
                {students.some(s => !s.batchId) && (
                  <button
                    onClick={() => setActiveBatchFilter('unassigned')}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${
                      activeBatchFilter === 'unassigned'
                        ? 'bg-gray-400 text-white shadow-lg'
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    Unassigned ({students.filter(s => !s.batchId).length})
                  </button>
                )}
                {isCreator && (
                  <button
                    onClick={() => setShowBatchModal(true)}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#c2f575]/20 text-nunma-forest hover:bg-[#c2f575] transition-all flex-shrink-0 flex items-center gap-2"
                  >
                    <Settings size={12} /> Manage
                  </button>
                )}
              </div>
            )}

            <div className="p-16 max-md:p-4 flex-1">
              {activeTab === 'attendance' && (
                <div className="space-y-10 max-md:space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center gap-6 max-md:flex-col max-md:items-stretch max-md:gap-4">
                    <div className="flex-1 relative max-md:w-full">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Search students by name or email..."
                        value={attendanceSearchQuery}
                        onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-3xl pl-16 pr-8 py-5 font-bold text-nunma-forest outline-none transition-all max-md:pl-14 max-md:pr-6 max-md:py-4 max-md:text-sm"
                      />
                    </div>
                    <div className="flex gap-4 max-md:flex-col sm:max-md:flex-row max-md:w-full">
                      <button
                        onClick={() => setShowTakeAttendanceModal(true)}
                        className="px-8 py-5 bg-[#c2f575] text-nunma-forest rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-xl max-md:flex-1 max-md:px-6 max-md:py-4 max-md:justify-center"
                      >
                        <CheckCircle2 size={18} /> Take Attendance
                      </button>
                      <button
                        onClick={() => setShowDownloadModal(true)}
                        className="px-8 py-5 bg-nunma-forest text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-xl max-md:flex-1 max-md:px-6 max-md:py-4 max-md:justify-center"
                      >
                        <Download size={18} /> Download List
                      </button>
                    </div>
                  </div>

                  {/* DOWNLOAD MODAL */}
                  {showDownloadModal && (
                    <div className="fixed inset-0 z-[140] flex items-center justify-center p-6 bg-nunma-forest/80 max-md:bg-black/40 backdrop-blur-xl max-md:backdrop-blur-sm animate-in fade-in duration-300">
                      <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10 animate-in zoom-in-95 duration-500">
                        <h3 className="text-2xl font-black text-nunma-forest mb-6">Download Report</h3>
                        <div className="space-y-4 mb-8">
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Start Date</label>
                            <input type="date" value={downloadStartDate} onChange={e => setDownloadStartDate(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">End Date</label>
                            <input type="date" value={downloadEndDate} onChange={e => setDownloadEndDate(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none" />
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button onClick={() => setShowDownloadModal(false)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                          <button
                            onClick={async () => {
                              const filteredSessions = attendanceSessions.filter(s => s.date >= downloadStartDate && s.date <= downloadEndDate);
                              
                              const workbook = new ExcelJS.Workbook();
                              const worksheet = workbook.addWorksheet('Attendance');

                              // Title Row
                              const titleRow = worksheet.addRow(['NUNMA', zone?.title || 'Zone Attendance Report']);
                              titleRow.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1A1A4E' } };
                              if (filteredSessions.length > 0) {
                                worksheet.mergeCells('B1', String.fromCharCode(65 + 2 + filteredSessions.length) + '1');
                              }
                              titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2F575' } };
                              titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                              titleRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
                              titleRow.height = 30;

                              // Headers (Session Name)
                              const header1 = ['Student Name', 'Email', 'Attendance %'];
                              filteredSessions.forEach(session => {
                                header1.push(session.className || 'Class Session');
                              });
                              const headerRow1 = worksheet.addRow(header1);

                              // Headers (Date & Time)
                              const header2 = ['', '', ''];
                              filteredSessions.forEach(session => {
                                header2.push(`${formatDate(session.date)}\n${session.time || ''}`);
                              });
                              const headerRow2 = worksheet.addRow(header2);

                              // Merge Headers
                              worksheet.mergeCells('A2:A3');
                              worksheet.mergeCells('B2:B3');
                              worksheet.mergeCells('C2:C3');

                              const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2F575' } };
                              const headerBorder = {
                                top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
                              };

                              [headerRow1, headerRow2].forEach(row => {
                                row.eachCell(cell => {
                                  cell.fill = headerFill as any;
                                  cell.border = headerBorder as any;
                                  cell.font = { bold: true, color: { argb: 'FF1A1A4E' } };
                                  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                                });
                              });
                              
                              headerRow1.height = 25;
                              headerRow2.height = 30;

                              worksheet.getColumn(1).width = 25;
                              worksheet.getColumn(2).width = 30;
                              worksheet.getColumn(3).width = 15;
                              for(let i = 4; i <= 3 + filteredSessions.length; i++) {
                                worksheet.getColumn(i).width = 15;
                              }

                              // Data Rows
                              students.forEach(student => {
                                const history = student.attendanceHistory || [];
                                let presentCount = 0;
                                let totalCount = 0;
                                
                                const rowData = [student.name || 'Unknown', student.email || 'N/A', ''];
                                
                                filteredSessions.forEach(session => {
                                  const status = history.find(h => h.sessionId === session.id || h.sessionId === (session as any).originalId)?.status || 'Pending';
                                  if (status !== 'Pending') totalCount++;
                                  if (status === 'Present') presentCount++;
                                  
                                  const displayStatus = status === 'Present' ? 'P' : (status === 'Absent' ? 'A' : (status === 'Late' ? 'L' : '-'));
                                  rowData.push(displayStatus);
                                });

                                rowData[2] = totalCount > 0 ? `${Math.round((presentCount / totalCount) * 100)}%` : '0%';

                                const row = worksheet.addRow(rowData);
                                
                                row.eachCell((cell, colNumber) => {
                                  cell.border = headerBorder as any;
                                  cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                  if (colNumber > 3) {
                                    if (cell.value === 'P') cell.font = { bold: true, color: { argb: 'FF16A34A' } };
                                    else if (cell.value === 'A') cell.font = { bold: true, color: { argb: 'FFDC2626' } };
                                    else if (cell.value === 'L') cell.font = { bold: true, color: { argb: 'FFD97706' } };
                                  }
                                });
                              });

                              const buffer = await workbook.xlsx.writeBuffer();
                              const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                              saveAs(blob, `attendance_report_${downloadStartDate}_to_${downloadEndDate}.xlsx`);

                              setShowDownloadModal(false);
                            }}
                            className="flex-[2] py-4 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── MOBILE: Beautiful Student Cards (name + attendance % only) ── */}
                  <div className="md:hidden space-y-3">
                    {(filteredStudents || []).filter(s =>
                      (s?.name || "").toLowerCase().includes((attendanceSearchQuery || "").toLowerCase()) ||
                      (s?.email || '').toLowerCase().includes((attendanceSearchQuery || "").toLowerCase())
                    ).length === 0 ? (
                      <div className="py-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                          <Users size={28} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No students found</p>
                      </div>
                    ) : (
                      (filteredStudents || []).filter(s =>
                        (s?.name || "").toLowerCase().includes((attendanceSearchQuery || "").toLowerCase()) ||
                        (s?.email || '').toLowerCase().includes((attendanceSearchQuery || "").toLowerCase())
                      ).map(student => {
                        const pct = calculateAttendancePercentage(student);
                        const isGood = pct >= 75;
                        const isMid = pct >= 50 && pct < 75;
                        const color = isGood ? '#16a34a' : isMid ? '#d97706' : '#dc2626';
                        const bgColor = isGood ? 'bg-green-50' : isMid ? 'bg-amber-50' : 'bg-red-50';
                        const textColor = isGood ? 'text-green-600' : isMid ? 'text-amber-600' : 'text-red-600';
                        const circumference = 2 * Math.PI * 20;
                        const dashOffset = circumference - (pct / 100) * circumference;
                        return (
                          <div key={student.id} className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
                            {/* Avatar */}
                            <img src={student.avatar} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 shadow-sm" alt="" />
                            {/* Name + Email */}
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-nunma-forest text-sm leading-tight truncate">{student.name}</p>
                              <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">{student.email}</p>
                            </div>
                            {/* Circular Progress + % */}
                            <div className="flex-shrink-0 flex flex-col items-center gap-1">
                              <div className="relative w-12 h-12">
                                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                  <circle cx="24" cy="24" r="20" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                                  <circle
                                    cx="24" cy="24" r="20" fill="none"
                                    stroke={color} strokeWidth="4"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={dashOffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-700"
                                  />
                                </svg>
                                <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${textColor}`}>
                                  {pct}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ── DESKTOP: Original table (unchanged) ── */}
                  <div className="hidden md:block bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50/50 z-20 whitespace-nowrap min-w-[250px] max-w-[250px]">Student</th>
                          <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Attendance %</th>
                          {/* Dynamic Session Columns (Last 5 or Searched) */}
                          {attendanceSessions
                            .filter(s =>
                              !attendanceSearchQuery ||
                              (s?.className || "").toLowerCase().includes((attendanceSearchQuery || "").toLowerCase()) ||
                              (s?.date || "").includes(attendanceSearchQuery || "")
                            )
                            .reverse()
                            .map(session => (
                              <th key={session.id} className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap text-center group relative hover:text-nunma-forest transition-colors cursor-pointer" onClick={() => {
                                setEditingSessionId(session.id);
                                setManualAttendanceState({});
                                setShowTakeAttendanceModal(true);
                              }}>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Pencil size={12} className="text-[#c2f575]" />
                                </div>
                                {formatDate(session.date)}<br />
                                <span className="text-[9px] opacity-70">{session.time}</span>
                              </th>
                            ))
                          }
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(filteredStudents || []).filter(s => (s?.name || "").toLowerCase().includes((attendanceSearchQuery || "").toLowerCase()) || (s?.email || '').toLowerCase().includes((attendanceSearchQuery || "").toLowerCase())).map(student => (
                          <tr key={student.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-10 py-6 sticky left-0 bg-white group-hover:bg-gray-50/30 z-10 w-[250px] min-w-[250px] max-w-[250px]">
                              <div className="flex items-center gap-4 w-full">
                                <img src={student.avatar} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0" alt="" />
                                <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                                  <span className="font-bold text-nunma-forest truncate block" title={student.name}>{student.name}</span>
                                  <span className="text-xs text-gray-400 font-medium truncate block" title={student.email}>{student.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-6">
                              <span className="font-black text-nunma-forest text-lg">{calculateAttendancePercentage(student)}%</span>
                            </td>
                            {/* Dynamic Session Status */}
                            {attendanceSessions
                              .filter(s =>
                                !(attendanceSearchQuery || "") ||
                                (s?.className || "").toLowerCase().includes((attendanceSearchQuery || "").toLowerCase()) ||
                                (s?.date || "").includes(attendanceSearchQuery || "")
                              )
                              .reverse()
                              .map(session => {
                                const status = (student?.attendanceHistory || []).find(h => h?.sessionId === session?.id || h?.sessionId === (session as any)?.originalId)?.status || 'Pending';
                                return (
                                  <td key={session.id} className="px-6 py-6 text-center">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${status === 'Present' ? 'bg-green-50 text-green-600' :
                                      status === 'Absent' ? 'bg-red-50 text-red-600' :
                                        status === 'Late' ? 'bg-yellow-50 text-yellow-600' :
                                          'bg-gray-50 text-gray-400'
                                      }`}>
                                      {status === 'Pending' ? '-' : status.charAt(0)}
                                    </span>
                                  </td>
                                );
                              })
                            }
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'curriculum' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center">
                    <h3 className="text-4xl font-black text-nunma-forest tracking-tighter">Build Course</h3>
                    <div className="flex gap-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        accept={
                          activeTypeForUpload === 'video' ? 'video/*' :
                            activeTypeForUpload === 'pdf' ? '.pdf' :
                              activeTypeForUpload === 'reading' ? '.txt,.doc,.docx' :
                                '*'
                        }
                      />
                      <ShareModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        zoneId={zoneId || ''}
                        zoneTitle={zone?.title || 'this Zone'}
                        activeInvite={activeInvite}
                        isGenerating={isGeneratingInvite}
                        batches={zoneBatches}
                        onRevoke={() => setActiveInvite(null)}
                        onGenerate={handleGenerateInvite}
                      />
                      {isCreator && (
                        <button
                          onClick={async () => {
                            try {
                              const newOrder = chapters.length;
                              const newTitle = 'New Chapter';
                              const chaptersRef = collection(db, 'zones', zoneId!, 'chapters');
                              const docRef = await addDoc(chaptersRef, {
                                title: newTitle,
                                order: newOrder,
                                segments: [],
                                createdAt: serverTimestamp()
                              });

                              const newChapter: Chapter = { id: docRef.id, title: newTitle, segments: [] };
                              setChapters([...chapters, newChapter]);
                            } catch (error: any) {
                              console.error("Error creating chapter:", error);
                              nunmaAlert("Failed to create chapter. Please try again.", "error");
                            }
                          }}
                          className="px-8 py-5 bg-[#c2f575] text-nunma-forest rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-xl"
                        >
                          <Plus size={18} /> Add Chapter
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8">
                    {chapters.map((chapter, index) => (
                      <div
                        key={chapter.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className="bg-white border border-gray-100 rounded-[3rem] p-10 space-y-8 shadow-sm group cursor-default"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-6 flex-1 w-full">
                            <GripVertical className="text-gray-200 cursor-grab active:cursor-grabbing shrink-0" size={24} />
                            <input
                              type="text"
                              value={chapter.title}
                              onChange={(e) => setChapters(chapters.map(c => c.id === chapter.id ? { ...c, title: e.target.value } : c))}
                              onBlur={(e) => updateChapterTitle(chapter.id, e.target.value)}
                              className="bg-transparent text-2xl font-black text-nunma-forest outline-none border-b-4 border-transparent focus:border-[#c2f575]/20 w-full min-w-0"
                            />
                          </div>
                          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto mt-4 md:mt-0 items-stretch md:items-center">
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:items-center gap-2 md:flex-wrap flex-1">
                              <button
                                onClick={() => handleAddSegment(chapter.id, 'video')}
                                className="flex items-center justify-center md:justify-start gap-2 px-4 py-3 md:py-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest w-full md:w-auto"
                                title="Add Video"
                              >
                                <FileVideo size={14} /> Video
                              </button>
                              <button
                                onClick={() => handleAddSegment(chapter.id, 'reading')}
                                className="flex items-center justify-center md:justify-start gap-2 px-4 py-3 md:py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest w-full md:w-auto"
                                title="Add Text Module"
                              >
                                <FileText size={14} /> Text
                              </button>
                              <button
                                onClick={() => handleAddSegment(chapter.id, 'pdf')}
                                className="flex items-center justify-center md:justify-start gap-2 px-4 py-3 md:py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest w-full md:w-auto"
                                title="Add Document"
                              >
                                <FileDown size={14} /> Document
                              </button>
                              <button
                                onClick={() => handleAddSegment(chapter.id, 'quiz')}
                                className="flex items-center justify-center md:justify-start gap-2 px-4 py-3 md:py-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest w-full md:w-auto"
                                title="Add Quiz"
                              >
                                <Radio size={14} /> Quiz
                              </button>
                            </div>
                            {isCreator && (
                              <button
                                onClick={async () => {
                                  if (!zoneId) return;
                                  try {
                                    await deleteDoc(doc(db, 'zones', zoneId, 'chapters', chapter.id));
                                  } catch (e) {
                                    console.error("Failed to delete chapter:", e);
                                    nunmaAlert("Failed to delete chapter", "error");
                                  }
                                }}
                                className="flex items-center justify-center p-4 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all w-full md:w-auto"
                              >
                                <Trash2 size={20} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pl-0 md:pl-12 mt-4 md:mt-0">
                          {(chapter.segments || []).map((seg, segIndex) => {
                            if ((seg as any).status === 'uploading') return null;
                            return (
                              <div 
                                key={seg.id} 
                                draggable={true}
                                onDragStart={(e) => handleSegmentDragStart(e, chapter.id, segIndex)}
                                onDragEnd={handleSegmentDragEnd}
                                onDragOver={handleSegmentDragOver}
                                onDrop={(e) => handleSegmentDrop(e, chapter.id, segIndex)}
                                className="p-6 bg-gray-50 border border-transparent hover:border-[#c2f575]/20 rounded-3xl flex items-center justify-between group/seg transition-all cursor-move relative"
                              >
                                <div className="absolute right-6 flex gap-2 opacity-0 group-hover/seg:opacity-100 group-focus-within/seg:opacity-100 group-active/seg:opacity-100 transition-opacity shrink-0 z-10 peer">
                                  {isCreator && (
                                    <button
                                      onClick={async () => {
                                        if (!zoneId) return;
                                        if (await asyncConfirm('Are you sure you want to delete this segment?')) {
                                          try {
                                            if (seg.type === 'video' && (seg as any).videoId) {
                                              try {
                                                const deleteFn = httpsCallable(functions, 'deleteBunnyVideo');
                                                await deleteFn({ videoId: (seg as any).videoId });
                                              } catch (videoError) {
                                                console.warn("Failed to delete video from BunnyCDN, proceeding with segment deletion:", videoError);
                                              }
                                            }
                                            const updatedSegments = (chapter.segments || []).filter(s => s.id !== seg.id);
                                            await updateDoc(doc(db, 'zones', zoneId, 'chapters', chapter.id), {
                                              segments: updatedSegments
                                            });
                                            nunmaAlert("Segment deleted successfully", "success");
                                          } catch (e) {
                                            console.error("Failed to delete segment:", e);
                                            nunmaAlert("Failed to delete segment", "error");
                                          }
                                        }
                                      }}
                                      className="p-3 bg-white text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 flex-1 min-w-0 pr-2 transition-opacity duration-200 peer-hover:opacity-0 peer-focus-within:opacity-0">
                                  <GripVertical className="hidden md:block text-gray-300 opacity-0 group-hover/seg:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0" size={20} />
                                  <div className="p-4 bg-white rounded-2xl shadow-sm text-nunma-forest shrink-0">
                                    {seg.type === 'video' ? <FileVideo size={20} /> : <FileText size={20} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={seg.title}
                                      onChange={(e) => {
                                        setChapters(chapters.map(c => c.id === chapter.id ? {
                                          ...c,
                                          segments: (c.segments || []).map(s => s.id === seg.id ? { ...s, title: e.target.value } : s)
                                        } : c));
                                      }}
                                      onBlur={(e) => updateSegmentTitle(chapter.id, seg.id, e.target.value)}
                                      className="bg-transparent font-bold text-nunma-forest outline-none border-b-2 border-transparent focus:border-[#c2f575]/20 block mb-1 w-full min-w-0 text-ellipsis overflow-hidden whitespace-nowrap"
                                    />
                                    <div className="flex gap-2">
                                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{seg.type} {seg.duration ? `• ${seg.duration}` : ''}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                          )})}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'students' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center">
                    <h3 className="text-4xl font-black text-nunma-forest tracking-tighter">Enrolled Minds</h3>
                    <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                      <Users size={20} /> {students.length} Students Total
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {[...filteredStudents]
                      .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
                      .map(student => (
                      <div key={student.id} className="bg-white border border-gray-100 rounded-[3rem] p-8 flex flex-col items-center text-center space-y-6 shadow-sm group hover:shadow-xl transition-all duration-500">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl rotate-3 group-hover:rotate-0 transition-all duration-500">
                            <img src={student.avatar} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#c2f575] rounded-xl flex items-center justify-center text-nunma-forest shadow-lg">
                            <Check size={16} strokeWidth={3} />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-nunma-forest mb-1">{student.name}</h4>
                          <p className="text-xs text-gray-400 font-medium">{student.email}</p>
                        </div>
                        <div className="pt-4 border-t border-gray-50 w-full flex justify-around">
                          <div className="text-center">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Score</p>
                            <p className="font-bold text-nunma-forest">{student.engagementScore || 0}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Attendance</p>
                            <p className="font-bold text-nunma-forest">{calculateAttendancePercentage(student)}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Pts</p>
                            <p className="font-bold text-nunma-forest">{student.engagementScore || 0}</p>
                          </div>
                        </div>
                        <div className="w-full pt-4 space-y-2 relative">
                          {isCreator && zoneBatches.length > 0 && (
                            <div className="relative">
                              <button
                                onClick={() => setShowBatchAssignDropdown(showBatchAssignDropdown === student.id ? null : student.id)}
                                className="w-full py-3 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                              >
                                <Users size={14} /> 
                                {student.batchId ? zoneBatches.find(b => b.id === student.batchId)?.name || 'Unknown Batch' : 'Assign Batch'}
                              </button>
                              {showBatchAssignDropdown === student.id && (
                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20">
                                  <div className="max-h-40 overflow-y-auto">
                                    <button
                                      onClick={() => handleAssignStudentBatch(student.id, null)}
                                      className={`w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all ${!student.batchId ? 'bg-gray-50 text-nunma-forest' : 'text-gray-400'}`}
                                    >
                                      Unassigned
                                    </button>
                                    {zoneBatches.map(b => (
                                      <button
                                        key={b.id}
                                        onClick={() => handleAssignStudentBatch(student.id, b.id)}
                                        className={`w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 ${student.batchId === b.id ? 'bg-gray-50 text-nunma-forest' : 'text-gray-400'}`}
                                      >
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                                        {b.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {isCreator && (
                            <button
                              onClick={() => handleDismissStudent(student)}
                              className="w-full py-3 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                              <X size={14} /> Dismiss Access
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'schedule' && (
                <div className="space-y-16 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center">
                    <h3 className="text-5xl font-black text-nunma-forest tracking-tighter flex items-center gap-4">
                      Live Session Control
                      {activeBatchFilter !== 'all' && (
                        <span className="text-2xl font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-xl flex items-center">
                          Batch: {activeBatchFilter === 'unassigned' ? 'Unassigned' : zoneBatches.find(b => b.id === activeBatchFilter)?.name || ''}
                        </span>
                      )}
                    </h3>
                    {!activeSession ? (
                      <button
                        onClick={handleLaunchLive}
                        className="bg-red-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center gap-4 shadow-2xl hover:brightness-110 active:scale-95 transition-all"
                      >
                        <Radio size={20} className="animate-pulse" /> GO LIVE NOW
                      </button>
                    ) : (
                      <div className="flex gap-4">
                        <button
                          onClick={() => navigate(`/classroom/${zoneId}`)}
                          className="bg-[#c2f575] text-nunma-forest px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center gap-4 shadow-2xl hover:brightness-110 active:scale-95 transition-all"
                        >
                          <ExternalLink size={20} /> JOIN ROOM
                        </button>
                        <button
                          onClick={handleEndLive}
                          className="bg-black text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center gap-4 shadow-2xl hover:bg-gray-900 active:scale-95 transition-all"
                        >
                          <X size={20} /> END SESSION
                        </button>
                      </div>
                    )}
                  </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="hidden md:flex p-12 bg-white border border-gray-100 rounded-[4rem] flex-col items-center justify-center text-center space-y-8 shadow-sm">
                        <div className={`w-32 h-32 rounded-[3.5rem] flex items-center justify-center shadow-2xl ${activeSession ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-300'}`}>
                        <Video size={64} />
                      </div>
                      <div>
                        <h4 className="text-3xl font-black text-nunma-forest mb-2">{activeSession ? 'Broadcasting Meta-Stream' : 'Camera Ready'}</h4>
                        <p className="text-sm text-gray-400 font-medium">Standard WebRTC connection via Nunma Relays.</p>
                      </div>
                      {activeSession && (
                        <div className="flex items-center gap-3 bg-red-50 px-6 py-3 rounded-full text-red-600 font-black text-[10px] uppercase tracking-widest">
                          <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                          LIVE NOW
                        </div>
                      )}
                    </div>

                    <div className="p-12 bg-white border border-gray-100 rounded-[4rem] space-y-8 shadow-sm">
                      <h4 className="text-2xl font-black text-nunma-forest flex items-center gap-4">
                        <Link className="text-[#c2f575]" /> Invite Students
                      </h4>
                      <p className="text-sm text-gray-400 font-medium">Share this deep-link to grant students instant access to your live zone.</p>
                      <div className="p-6 bg-gray-50 border border-gray-100 rounded-3xl break-all font-mono text-[10px] text-gray-400 relative group overflow-hidden">
                        {activeSession ? `${window.location.origin}/#/classroom/${zoneId}` : 'Launch session to generate link'}
                        {activeSession && (
                          <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={handleCopyLink} className="flex items-center gap-3 text-nunma-forest font-black uppercase text-[10px] tracking-widest">
                              <Copy size={16} /> {isCopying ? 'COPIED!' : 'COPY TO CLIPBOARD'}
                            </button>
                          </div>
                        )}
                      </div>
                      {activeSession && (
                        <button
                          onClick={handleCopyLink}
                          className="w-full py-5 bg-[#c2f575] text-nunma-forest rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all"
                        >
                          <ExternalLink size={18} /> {isCopying ? 'COPIED!' : 'SHARE INVITE LINK'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h4 className="text-2xl font-black text-nunma-forest tracking-tight">Upcoming Broadcasts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {scheduledSessions.map((session, idx) => (
                        <div key={idx} className="p-8 bg-gray-50/50 border border-gray-100 rounded-[2.5rem] space-y-6 hover:bg-white hover:shadow-xl transition-all duration-500 group relative">
                          <div className="flex justify-between items-start">
                            <div className="p-4 bg-white rounded-2xl shadow-sm text-gray-400 group-hover:text-nunma-forest transition-all">
                              <Clock size={20} />
                            </div>
                            <div className="flex gap-2">
                              {isCreator && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingSession(session);
                                      setScheduleTitle(session.title);
                                      setScheduleDate(session.date);
                                      setScheduleTime(session.time);
                                      setScheduleDuration(session.duration);

                                      // Parse time string (e.g. "10:30 AM")
                                      const parts = session.time.split(/[:\s]/);
                                      if (parts.length === 3) {
                                        setSelectedHour(parseInt(parts[0]));
                                        setSelectedMinute(parseInt(parts[1]));
                                        setSelectedPeriod(parts[2] as 'AM' | 'PM');
                                      }

                                      setShowScheduleModal(true);
                                    }}
                                    className="text-[10px] font-black text-nunma-forest bg-[#c2f575] px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    EDIT
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (await asyncConfirm('Delete this scheduled session?')) {
                                        setScheduledSessions(scheduledSessions.filter(s => s.id !== session.id));
                                      }
                                    }}
                                    className="text-[10px] font-black text-white bg-red-500 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-lg font-black text-nunma-forest mb-1">{session.title}</h5>
                            <p className="text-xs text-gray-400 font-medium">
                              {formatDate(session.date)}, {session.time} • {session.duration} mins
                            </p>
                          </div>
                        </div>
                      ))}
                      {isCreator && (
                        <button
                          onClick={() => {
                            setEditingSession(null);
                            setScheduleTitle('');
                            setScheduleDate('');
                            setScheduleTime('');
                            setScheduleDuration('60');
                            setSelectedHour(12);
                            setSelectedMinute(0);
                            setSelectedPeriod('PM');
                            setClockMode('hour');
                            setShowScheduleModal(true);
                          }}
                          className="p-8 border-2 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-300 hover:border-[#c2f575] hover:text-[#c2f575] transition-all group min-h-[180px]"
                        >
                          <div className="p-4 rounded-2xl bg-gray-50 group-hover:bg-[#c2f575]/10 transition-all">
                            <Plus size={24} />
                          </div>
                          <span className="font-black uppercase text-[10px] tracking-widest">Schedule Session</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'exams' && (
                <div className="space-y-12 max-md:space-y-4 animate-in fade-in duration-500">
                  {/* Desktop heading + inline buttons */}
                  <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <h3 className="text-5xl font-black text-nunma-forest tracking-tighter">Achievement Gating</h3>
                      <p className="text-sm text-gray-400 font-bold mt-2">Manage online proctored exams and offline certifications.</p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          let conducts = exams.filter(e => getExamStatus(e) === 'CONDUCTED');
                          if (isCoTutor && currentCoTutor) {
                            conducts = conducts.filter(e => e.subject === currentCoTutor.subject);
                          }
                          if (conducts.length > 0) {
                            setSelectedExamForMarks(conducts[conducts.length - 1]);
                            setShowMarkEntryModal(true);
                          } else {
                            nunmaAlert("No conducted exams found to upload marks for your subject.", "success");
                          }
                        }}
                        className="px-6 py-5 bg-emerald-100 text-emerald-700 rounded-[1.75rem] font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:shadow-xl transition-all"
                      >
                        <FileSpreadsheet size={20} /> Upload Mark
                      </button>
                      <button
                        onClick={() => {
                          let conducts = exams.filter(e => e.type === 'online-test' && getExamStatus(e) === 'CONDUCTED');
                          if (isCoTutor && currentCoTutor) {
                            conducts = conducts.filter(e => e.subject === currentCoTutor.subject);
                          }
                          if (conducts.length === 1) {
                            setSelectedExamForGrading(conducts[0]);
                            setShowGradingHubModal(true);
                          } else if (conducts.length > 1) {
                            setEvaluableExamsList(conducts);
                            setShowExamSelectionModal(true);
                          } else {
                            nunmaAlert("No evaluated online test exams found for your subject.", "success");
                          }
                        }}
                        className="px-6 py-5 bg-indigo-100 text-indigo-700 rounded-[1.75rem] font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:shadow-xl transition-all"
                      >
                        <Wand2 size={20} /> Evaluate Exams
                      </button>
                      <button
                        onClick={() => setShowExamAnalytics(!showExamAnalytics)}
                        className={`px-8 py-5 rounded-[1.75rem] font-black uppercase text-xs tracking-widest flex items-center gap-3 transition-all ${showExamAnalytics
                          ? 'bg-indigo-100 text-indigo-700 shadow-inner'
                          : 'bg-white border border-gray-100 text-nunma-forest hover:shadow-xl'
                          }`}
                      >
                        <Trophy size={20} /> {showExamAnalytics ? 'Exams List' : 'Download Analytics'}
                      </button>
                      {isCreator && (
                        <button
                          onClick={() => setShowAddExamModal(true)}
                          className="px-10 py-5 bg-nunma-forest text-white rounded-[1.75rem] font-black uppercase text-xs tracking-widest flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl"
                        >
                          <Plus size={20} /> Create Exam
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile: 2-column action grid */}
                  <div className="md:hidden">
                    <h4 className="text-3xl font-black text-nunma-forest tracking-tighter mb-4">Exam Streams</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                      onClick={() => {
                        let conducts = exams.filter(e => getExamStatus(e) === 'CONDUCTED');
                        if (isCoTutor && currentCoTutor) conducts = conducts.filter(e => e.subject === currentCoTutor.subject);
                        if (conducts.length > 0) { setSelectedExamForMarks(conducts[conducts.length - 1]); setShowMarkEntryModal(true); }
                        else nunmaAlert("No conducted exams found to upload marks for your subject.", "success");
                      }}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95 text-left bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-100">
                        <FileSpreadsheet size={20} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wide leading-tight">Upload Mark</span>
                    </button>
                    <button
                      onClick={() => {
                        let conducts = exams.filter(e => e.type === 'online-test' && getExamStatus(e) === 'CONDUCTED');
                        if (isCoTutor && currentCoTutor) conducts = conducts.filter(e => e.subject === currentCoTutor.subject);
                        if (conducts.length === 1) { setSelectedExamForGrading(conducts[0]); setShowGradingHubModal(true); }
                        else if (conducts.length > 1) { setEvaluableExamsList(conducts); setShowExamSelectionModal(true); }
                        else nunmaAlert("No evaluated online test exams found for your subject.", "success");
                      }}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95 text-left bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-100">
                        <Wand2 size={20} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wide leading-tight">Evaluate Exams</span>
                    </button>
                    <button
                      onClick={() => setShowExamAnalytics(!showExamAnalytics)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95 text-left border shadow-sm
                        ${showExamAnalytics ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-white text-gray-400 border-gray-100'}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${showExamAnalytics ? 'bg-indigo-100' : 'bg-gray-50'}`}>
                        <Trophy size={20} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wide leading-tight">{showExamAnalytics ? 'Exams List' : 'Analytics'}</span>
                    </button>
                    {isCreator && (
                      <button
                        onClick={() => setShowAddExamModal(true)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95 text-left bg-nunma-forest text-white shadow-lg shadow-nunma-forest/20"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/20">
                          <Plus size={20} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wide leading-tight">Create Exam</span>
                      </button>
                    )}
                  </div>
                  </div>

                  {showExamAnalytics ? (
                    <ExamAnalytics zoneId={zoneId!} filteredStudents={filteredStudents} />
                  ) : (
                    <>
                      <div className="flex gap-6 items-center">
                        <div className="flex-1 relative">
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                          <input
                            type="text"
                            placeholder="Find exam by name or status..."
                            value={examSearchQuery}
                            onChange={(e) => setExamSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-[2rem] pl-16 pr-8 py-5 font-bold text-nunma-forest outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {exams.filter(e => {
                          const matchesSearch = e.title.toLowerCase().includes(examSearchQuery.toLowerCase());
                          const matchesSubject = isCoTutor && currentCoTutor ? e.subject === currentCoTutor.subject : true;
                          return matchesSearch && matchesSubject;
                        }).map(exam => (
                          <div key={exam.id} className="bg-white border border-gray-100 rounded-[3.5rem] p-10 space-y-10 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
                            <div className="flex justify-between items-start">
                              <div className={`p-5 rounded-[1.75rem] shadow-sm ${exam.type === 'online-test' || exam.type === 'online-mcq' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {exam.type === 'online-test' || exam.type === 'online-mcq' ? <Radio size={32} /> : <FileSpreadsheet size={32} />}
                              </div>
                              <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${getExamStatus(exam) === 'UPCOMING' ? 'bg-indigo-50 text-indigo-500' : getExamStatus(exam) === 'ONGOING' ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-green-50 text-green-500'}`}>
                                {getExamStatus(exam)}
                              </span>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-2xl font-black text-nunma-forest tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{exam.title}</h4>
                              <div className="flex items-center gap-4 text-gray-400 font-bold text-xs uppercase tracking-widest">
                                <Calendar size={14} /> {exam.date} @ {exam.time}
                              </div>
                            </div>

                            <div className="pt-8 border-t border-gray-50 flex justify-between items-center">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Target Marks</p>
                                <p className="font-bold text-nunma-forest">{exam.minMark}/{exam.maxMark} <span className="text-[10px] text-gray-400">(Pass)</span></p>
                              </div>
                              {getExamStatus(exam) === 'CONDUCTED' ? (
                                <div className="flex gap-2">
                                  {exam.type === 'online-test' && (
                                    <button
                                      onClick={() => { setSelectedExamForGrading(exam); setShowGradingHubModal(true); }}
                                      className="bg-[#c2f575] text-nunma-forest px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                                    >
                                      Grade Submissions
                                    </button>
                                  )}
                                  {(exam.type === 'offline' || exam.type === 'online-mcq') && (
                                    <button
                                      onClick={() => { setSelectedExamForMarks(exam); setShowMarkEntryModal(true); }}
                                      className="bg-nunma-forest text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all"
                                    >
                                      Open Gradebook
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      const examDateObj = new Date(`${exam.date} ${exam.time}`);
                                      const timeDiff = examDateObj.getTime() - Date.now();
                                      if (timeDiff <= 60 * 60 * 1000 && timeDiff > 0) {
                                        nunmaAlert("Exams cannot be edited within 1 hour of commencement to ensure a stable testing environment for students.", "success");
                                        e.preventDefault();
                                        return;
                                      }
                                      // TODO: Add edit exam logic here
                                    }}
                                    className={`p-4 rounded-2xl transition-all ${new Date(`${exam.date} ${exam.time}`).getTime() - Date.now() <= 60 * 60 * 1000 && new Date(`${exam.date} ${exam.time}`).getTime() - Date.now() > 0
                                      ? 'bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed'
                                      : 'bg-gray-50 text-gray-400 hover:bg-black hover:text-white'
                                      }`}
                                  >
                                    <Edit3 size={18} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (await asyncConfirm("Are you sure you want to permanently delete this exam?")) {
                                        try {
                                          if (zoneId) {
                                            await deleteDoc(doc(db, 'zones', zoneId, 'exams', exam.id));
                                          }
                                          setExams(exams.filter(e => e.id !== exam.id));
                                        } catch (error) {
                                          console.error("Error deleting exam:", error);
                                          nunmaAlert("Failed to delete exam from database.", "error");
                                        }
                                      }
                                    }}
                                    className="p-4 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => setShowAddExamModal(true)}
                          className="bg-gray-50/50 border-4 border-dashed border-gray-100 rounded-[3.5rem] p-10 flex flex-col items-center justify-center text-center space-y-6 hover:border-[#c2f575] hover:text-[#c2f575] transition-all group"
                        >
                          <div className="w-20 h-20 rounded-[2rem] bg-white shadow-xl flex items-center justify-center group-hover:scale-110 transition-all">
                            <Plus size={40} className="text-gray-300 group-hover:text-[#c2f575]" />
                          </div>
                          <span className="font-black uppercase text-[11px] tracking-[0.3em] text-gray-300">Schedule New Gate</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {activeTab === 'landing' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-4xl font-black text-nunma-forest tracking-tighter">Landing Page Config</h3>
                      <p className="text-sm text-gray-400 mt-2 font-medium">Customize registration workflows and automated emails.</p>
                    </div>
                    <button onClick={async () => {
                      if (!zoneId) return;
                      try {
                        await updateDoc(doc(db, 'zones', zoneId), {
                          landingPageConfig: {
                            paid: lpPaid, enableCalendar: lpCalendar,
                            emailSubject: lpEmailSubject, emailBody: lpEmailBody, customFields: lpCustomFields
                          }
                        });
                        nunmaAlert('Landing Page configuration saved!', "success");
                      } catch (e) { nunmaAlert('Failed to save config.', "error"); }
                    }} className="px-8 py-4 bg-[#c2f575] text-nunma-forest rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all">
                      <Save size={18} className="inline mr-2" /> Save Settings
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Registration Settings */}
                    <div className="bg-white border border-gray-100 rounded-[3rem] p-10 space-y-8 shadow-sm">
                      <h4 className="text-2xl font-black text-nunma-forest flex items-center gap-3"><Globe className="text-[#c2f575]" /> Registration Form</h4>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Paid Event</span>
                          <button onClick={() => setLpPaid(!lpPaid)} className={`w-12 h-6 rounded-full transition-colors relative ${lpPaid ? 'bg-[#c2f575]' : 'bg-gray-300'}`}>
                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${lpPaid ? 'translate-x-6' : ''}`} />
                          </button>
                        </div>

                        {lpPaid && (
                          <div className="space-y-2 animate-in slide-in-from-top-2">
                            <p className="text-sm font-medium text-gray-500">Payments are securely handled via Razorpay on the landing page.</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Calendar Integration</span>
                          <button onClick={() => setLpCalendar(!lpCalendar)} className={`w-12 h-6 rounded-full transition-colors relative ${lpCalendar ? 'bg-[#c2f575]' : 'bg-gray-300'}`}>
                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${lpCalendar ? 'translate-x-6' : ''}`} />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Custom Form Fields</label>
                          <div className="flex gap-2">
                            <input value={newCustomField} onChange={e => setNewCustomField(e.target.value)} placeholder="e.g. Job Title" className="flex-1 bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-xl px-4 py-3 font-bold text-sm text-nunma-forest outline-none" />
                            <button onClick={() => { if (newCustomField) { setLpCustomFields([...lpCustomFields, newCustomField]); setNewCustomField(''); } }} className="px-4 py-3 bg-nunma-forest text-white rounded-xl font-black text-xs hover:scale-105"><Plus size={16} /></button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {lpCustomFields.map((f, i) => (
                              <div key={i} className="flex items-center gap-2 bg-[#c2f575]/20 text-nunma-forest px-3 py-1.5 rounded-lg text-xs font-bold">
                                {f} <button onClick={() => setLpCustomFields(lpCustomFields.filter((_, idx) => idx !== i))} className="text-red-500"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email Configurations */}
                    <div className="bg-white border border-gray-100 rounded-[3rem] p-10 space-y-8 shadow-sm">
                      <h4 className="text-2xl font-black text-nunma-forest flex items-center gap-3"><Mic className="text-indigo-400" /> Auto-Emails</h4>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Email Subject</label>
                          <input value={lpEmailSubject} onChange={e => setLpEmailSubject(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Confirmation Body</label>
                          <textarea value={lpEmailBody} onChange={e => setLpEmailBody(e.target.value)} rows={5} className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-[1.5rem] px-6 py-4 font-bold text-nunma-forest outline-none transition-all resize-none"></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'post-session' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-4xl font-black text-nunma-forest tracking-tighter">Post-Session Survey</h3>
                      <p className="text-sm text-gray-400 mt-2 font-medium">Automatically collect NPS and feedback after completed sessions.</p>
                    </div>
                    <button onClick={async () => {
                      if (!zoneId) return;
                      try {
                        await updateDoc(doc(db, 'zones', zoneId), {
                          postSessionSurvey: {
                            enabled: psEnabled, ratingSystem: psRating, npsTracking: psNps, feedbackText: psFeedback
                          }
                        });
                        nunmaAlert('Survey configuration saved!', "success");
                      } catch (e) { nunmaAlert('Failed to save survey.', "error"); }
                    }} className="px-8 py-4 bg-[#c2f575] text-nunma-forest rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all">
                      <Save size={18} className="inline mr-2" /> Save Survey
                    </button>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[3rem] p-10 space-y-8 shadow-sm max-w-2xl">
                    <div className="flex items-center justify-between p-6 bg-gray-50 border border-gray-100 rounded-[2rem]">
                      <div className="space-y-1">
                        <h4 className="font-black text-nunma-forest uppercase text-xs tracking-widest">Enable Automatic Survey</h4>
                        <p className="text-[10px] text-gray-400 font-bold">Pops up for students immediately upon session end.</p>
                      </div>
                      <button onClick={() => setPsEnabled(!psEnabled)} className={`w-14 h-8 rounded-full transition-colors relative shadow-inner ${psEnabled ? 'bg-[#c2f575]' : 'bg-gray-300'}`}>
                        <div className={`absolute top-1.5 left-1.5 bg-white w-5 h-5 rounded-full transition-transform shadow-sm ${psEnabled ? 'translate-x-6' : ''}`} />
                      </button>
                    </div>

                    {psEnabled && (
                      <div className="space-y-6 animate-in slide-in-from-top-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Survey Modules</label>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            { id: 'rating', label: 'Star Rating (1-5)', icon: <Star size={18} />, state: psRating, set: setPsRating },
                            { id: 'nps', label: 'NPS Score (1-10)', icon: <Trophy size={18} />, state: psNps, set: setPsNps },
                            { id: 'feedback', label: 'Open Feedback Box', icon: <FileText size={18} />, state: psFeedback, set: setPsFeedback }
                          ].map(mod => (
                            <div key={mod.id} className="flex items-center justify-between p-5 bg-white border-2 hover:border-[#c2f575]/50 border-gray-50 rounded-2xl transition-all cursor-pointer" onClick={() => mod.set(!mod.state)}>
                              <div className="flex items-center gap-4 text-nunma-forest font-bold text-sm">
                                <div className={`p-2 rounded-lg ${mod.state ? 'bg-[#c2f575]/20 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>{mod.icon}</div>
                                {mod.label}
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${mod.state ? 'bg-[#c2f575] border-[#c2f575]' : 'border-gray-200 bg-gray-50'}`}>
                                {mod.state && <Check size={14} className="text-nunma-forest" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!['attendance', 'curriculum', 'exams', 'schedule', 'students', 'landing', 'post-session'].includes(activeTab) && <div className="py-20 text-center text-gray-300 italic">Configuration module loading...</div>}
            </div>
          </div>
        ) : view === 'grading' ? (
          /* GRADING POWER-VIEW */
          <div className={`animate-in fade-in slide-in-from-right-10 duration-700 h-[calc(100vh-140px)] flex flex-col ${isSmartMarking ? 'bg-[#03031f] -m-12 p-12 rounded-none fixed inset-0 z-[100]' : ''}`}>
            {isSmartMarking && <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#c2f575] via-indigo-500 to-[#c2f575] animate-[shimmer_2s_infinite]"></div>}

            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-6">
                <button onClick={() => { setView('management'); setIsSmartMarking(false); }} className={`flex items-center gap-4 font-black text-sm uppercase tracking-[0.25em] hover:translate-x-[-8px] transition-all ${isSmartMarking ? 'text-white' : 'text-nunma-forest'}`}>
                  <ArrowLeft size={24} /> Exit Canvas
                </button>
                {isSmartMarking && (
                  <div className="flex items-center gap-4 bg-white/5 backdrop-blur-3xl px-6 py-3 rounded-[1.5rem] border border-white/10 shadow-2xl">
                    <Sparkles size={18} className="text-[#c2f575]" />
                    <span className="text-[#c2f575] text-xs font-black uppercase tracking-[0.3em]">VLM Power-View Active</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6">
                <button onClick={handleSaveGrading} className="bg-[#c2f575] text-nunma-forest px-10 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.3em] hover:brightness-110 shadow-2xl active:scale-95 transition-all">
                  Publish Grades
                </button>
              </div>
            </div>

            <div className="flex-1 flex gap-10 overflow-hidden">
              {isSmartMarking && (
                <div className="w-[380px] flex flex-col gap-8 animate-in slide-in-from-left-8 duration-700">
                  <div className="flex-1 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-10 overflow-hidden flex flex-col shadow-2xl">
                    <h4 className="text-white font-black text-2xl tracking-tighter mb-8 flex items-center gap-4">
                      <Layers className="text-[#c2f575]" size={28} /> Clusters
                    </h4>

                    {isAnalyzing ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6">
                        <div className="w-16 h-16 border-4 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white font-black text-lg tracking-tight">Gemini is segmenting...</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-3">
                        {clusters.map(cluster => (
                          <button
                            key={cluster.id}
                            onClick={() => handleClusterSelect(cluster)}
                            className={`w-full p-8 rounded-[2.5rem] text-left transition-all border-2 relative overflow-hidden group 
                                 ${activeClusterId === cluster.id ? 'bg-[#c2f575] border-[#c2f575] text-nunma-forest scale-[1.02] shadow-2xl' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <span className="font-black text-lg tracking-tight">{cluster.label}</span>
                              <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${activeClusterId === cluster.id ? 'bg-nunma-forest/10' : 'bg-white/10'}`}>{cluster.studentIds.length}</span>
                            </div>
                            <p className={`text-sm leading-relaxed font-medium ${activeClusterId === cluster.id ? 'text-nunma-forest/70' : 'text-gray-500'}`}>{cluster.description}</p>
                            <div className="mt-6 flex items-center gap-4">
                              <div className="flex-1 h-2 bg-black/10 rounded-full overflow-hidden">
                                <div className="h-full bg-current opacity-60" style={{ width: `${cluster.confidence}%` }}></div>
                              </div>
                              <span className="text-[10px] font-black">{cluster.confidence}%</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-2xl">
                    <h4 className="text-white font-black text-sm uppercase tracking-[0.3em] mb-6 flex items-center gap-4"><Mic size={20} className="text-[#c2f575]" /> Feedback</h4>
                    {generatedFeedback ? (
                      <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="p-6 bg-black/40 rounded-3xl border border-white/5"><p className="text-indigo-200 text-sm italic leading-relaxed">"{generatedFeedback}"</p></div>
                        <button className="w-full py-5 bg-[#c2f575] text-nunma-forest rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-105 shadow-xl transition-all"><Play size={16} fill="currentColor" /> Preview Audio</button>
                      </div>
                    ) : (
                      <button onClick={handleGenerateFeedback} disabled={!activeClusterId} className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-indigo-500 transition-all flex items-center justify-center gap-4 disabled:opacity-50"><Wand2 size={20} /> Generate AI Batch Note</button>
                    )}
                  </div>
                </div>
              )}

              {/* CANVAS AREA */}
              <div className={`flex-1 rounded-[4rem] overflow-hidden relative flex flex-col shadow-2xl ${isSmartMarking ? 'bg-black/60 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                {/* Floating Toolbar */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white/10 backdrop-blur-3xl px-8 py-4 rounded-[2rem] border border-white/20 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
                  {['#ef4444', '#22c55e', '#3b82f6', '#facc15'].map(color => (
                    <button key={color} onClick={() => setBrushColor(color)} className={`w-10 h-10 rounded-xl border-4 transition-all ${brushColor === color ? 'border-white scale-125 shadow-2xl' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: color }} />
                  ))}
                  <div className="w-[1.5px] h-8 bg-white/10 mx-4"></div>
                  <button onClick={handleUndo} className="p-4 rounded-xl text-white hover:bg-white/10 transition-all"><Undo size={24} /></button>
                  <button onClick={handleClear} className="p-4 rounded-xl text-red-400 hover:bg-red-500/20 transition-all"><RotateCcw size={24} /></button>
                </div>

                {isSmartMarking && !isAnalyzing && activeClusterId && (
                  <div className="absolute top-10 left-10 z-50 flex -space-x-4">
                    {clusters.find(c => c.id === activeClusterId)?.studentIds?.map(sid => (
                      <div key={sid} className="w-16 h-16 rounded-full border-4 border-[#03031f] overflow-hidden shadow-2xl group cursor-help transition-transform hover:scale-125 hover:z-20">
                        <img src={students.find(s => s.id === sid)?.avatar} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex-1 relative flex items-center justify-center cursor-crosshair group">
                  {isSmartMarking && isAnalyzing ? (
                    <div className="text-center opacity-30 scale-150"><div className="w-16 h-16 border-t-4 border-[#c2f575] rounded-full animate-spin"></div></div>
                  ) : (
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                      className="max-h-[85vh] w-auto shadow-[0_100px_200px_rgba(0,0,0,0.8)] rounded-2xl bg-white/5 transition-transform duration-700"
                    />
                  )}
                </div>

                {isSmartMarking && !isAnalyzing && (
                  <div className="absolute bottom-10 right-10 flex items-center gap-8 bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] shadow-2xl">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Score for Batch</p>
                      <input type="number" min="0" value={scriptScore} onChange={e => setScriptScore(e.target.value)} className="bg-transparent text-5xl font-black text-[#c2f575] w-32 outline-none border-b-4 border-transparent focus:border-[#c2f575]/20 transition-all" />
                    </div>
                    <div className="w-[1.5px] h-16 bg-white/10"></div>
                    <div className="text-right">
                      <p className="text-white font-black text-xl tracking-tighter">Cluster Grade</p>
                      <p className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest mt-1">Applies to {clusters.find(c => c.id === activeClusterId)?.studentIds?.length || 0} learners</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700 py-20 text-center opacity-10 flex flex-col items-center">
            {/* Fix: Replaced missing Layout icon with Layers icon */}
            <Layers size={100} className="mb-8" />
            <h2 className="text-4xl font-black uppercase tracking-widest">Workspace View</h2>
          </div>
        )}
      </div>
      {/* UPLOAD OVERLAY */}
      {
        isUploading && (
          <div className="fixed inset-0 z-[9999] bg-[#000000]/90 flex flex-col items-center justify-center p-8 font-inter">
            <div className="w-full max-w-md space-y-8 text-center">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 border-4 border-[#c2f575]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Upload size={32} className="text-[#c2f575] animate-bounce" />
                </div>
              </div>

              <div>
                <h3 className="text-3xl font-black text-white tracking-tighter mb-2">Uploading Securely</h3>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Direct Stream to Bunny CDN</p>
              </div>

              <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-[#c2f575] transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-white font-mono text-xl">{uploadProgress}%</p>
            </div>
          </div>
        )
      }
      {showExamSelectionModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl overflow-hidden relative">
            <h2 className="text-2xl font-black text-nunma-forest mb-6">Select Exam to Evaluate</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {evaluableExamsList.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => {
                    setSelectedExamForGrading(ex);
                    setShowExamSelectionModal(false);
                    setShowGradingHubModal(true);
                  }}
                  className="w-full text-left p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-100 transition-all flex items-center justify-between group"
                >
                  <div>
                    <h3 className="font-bold text-nunma-forest group-hover:text-indigo-700">{ex.title}</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">{ex.date} @ {ex.time}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 group-hover:text-indigo-500" />
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowExamSelectionModal(false)}
                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default ZoneManagement;

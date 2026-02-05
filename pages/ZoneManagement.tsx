
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Video,
  CheckCircle2,
  Plus,
  X,
  UserPlus,
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
  Search
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { collection, query, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

const ZONES_STORAGE_KEY = 'nunma_zones_data';

interface Student {
  id: string;
  name: string;
  avatar: string;
  joinedAt: string;
  status: 'Present' | 'Absent' | 'Late' | 'Pending';
  joinTimestamp?: number;
  durationInSession?: number;
  engagementScore: number;
  email?: string;
  phone?: string;
}

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
}

interface Exam {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'online' | 'offline';
  status: 'UPCOMING' | 'CONDUCTED';
  participants?: number;
  avgScore?: string;
  questions?: MCQ[];
  maxMark: number;
  minMark: number;
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
}

interface Chapter {
  id: string;
  title: string;
  segments: Segment[];
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

const ZoneManagement: React.FC = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'attendance' | 'curriculum' | 'exams' | 'schedule' | 'students'>('exams');
  const [view, setView] = useState<'management' | 'review' | 'grading'>('management');
  const [zone, setZone] = useState<any>(null);

  // Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showAiGeneratorModal, setShowAiGeneratorModal] = useState(false);
  const [showStartExamModal, setShowStartExamModal] = useState(false);

  // Input States
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [examToStart, setExamToStart] = useState<Exam | null>(null);
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

  // Smart Marker State
  const [isSmartMarking, setIsSmartMarking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [clusters, setClusters] = useState<AnswerCluster[]>([]);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [generatedFeedback, setGeneratedFeedback] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  // Data States
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: 'c1', title: 'Foundation & Principles', segments: [{ id: 's1', title: 'The Core Concepts', type: 'video', duration: '15:20' }] }
  ]);

  const [exams, setExams] = useState<Exam[]>([
    { id: 'e1', title: 'Product Lifecycle Fundamentals', date: '2026-02-25', time: '10:00', status: 'UPCOMING', type: 'online', maxMark: 100, minMark: 40 },
    { id: 'e2', title: 'Calculus: Derivative Rules', date: '2026-01-15', time: '14:00', status: 'CONDUCTED', participants: 5, avgScore: '82%', type: 'offline', maxMark: 100, minMark: 45 },
  ]);

  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [examSearchQuery, setExamSearchQuery] = useState('');
  const [showMarkEntryModal, setShowMarkEntryModal] = useState(false);
  const [selectedExamForMarks, setSelectedExamForMarks] = useState<Exam | null>(null);

  // New Exam Modal State
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamTime, setNewExamTime] = useState('');
  const [newExamType, setNewExamType] = useState<'online' | 'offline'>('online');
  const [newExamMaxMark, setNewExamMaxMark] = useState('100');
  const [newExamMinMark, setNewExamMinMark] = useState('40');
  const [newExamQuestions, setNewExamQuestions] = useState<MCQ[]>([]);

  const handleAddQuestion = () => {
    const newQ: MCQ = {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    };
    setNewExamQuestions([...newExamQuestions, newQ]);
  };

  const handleCreateExam = () => {
    const newExam: Exam = {
      id: Date.now().toString(),
      title: newExamTitle,
      date: newExamDate,
      time: newExamTime,
      status: 'UPCOMING',
      type: newExamType,
      maxMark: parseInt(newExamMaxMark),
      minMark: parseInt(newExamMinMark),
      questions: newExamType === 'online' ? newExamQuestions : undefined
    };
    setExams([...exams, newExam]);
    setShowAddExamModal(false);
    // Reset fields
    setNewExamTitle('');
    setNewExamDate('');
    setNewExamTime('');
    setNewExamMaxMark('100');
    setNewExamMinMark('40');
    setNewExamQuestions([]);
    alert(`Exam "${newExamTitle}" created! Notifications sent.`);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>, examId: string) => {
    // Mock excel processing
    alert('Processing Excel sheet: Students detected, marks imported.');
    const mockResults: ExamResult[] = students.map(s => ({
      id: Math.random().toString(),
      examId,
      studentId: s.id,
      studentName: s.name,
      marks: Math.floor(Math.random() * 100),
      status: 'passed',
      warnings: 0
    }));
    setExamResults(prev => [...prev.filter(r => r.examId !== examId), ...mockResults]);
  };

  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: 'Sachin Sundar', avatar: 'https://picsum.photos/seed/sachin/40/40', joinedAt: '02/01/2026', status: 'Present', durationInSession: 45, engagementScore: 85, email: 'sachin@example.com' },
    { id: '2', name: 'Arjun Reddy', avatar: 'https://picsum.photos/seed/arjun/40/40', joinedAt: '02/01/2026', status: 'Present', durationInSession: 58, engagementScore: 98, email: 'arjun@example.com' },
  ]);

  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualAttendanceState, setManualAttendanceState] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Pending'>>({});

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem(ZONES_STORAGE_KEY);
      if (saved) {
        const zones = JSON.parse(saved);
        const found = zones.find((z: any) => z.id === zoneId);
        setZone(found);
      }
    };
    loadData();

    // Check for existing active session
    const sessions = JSON.parse(localStorage.getItem('nunma_live_sessions') || '[]');
    const active = sessions.find((s: any) => s.zoneId === zoneId && s.status === 'live');
    if (active) setActiveSession(active);
  }, [zoneId]);

  // Real-time Attendance Listener
  useEffect(() => {
    if (!zoneId || !activeSession) return;

    const attendanceRef = collection(db, `zones/${zoneId}/sessions/${activeSession.id}/attendance`);
    const q = query(attendanceRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attendees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setStudents(prev => prev.map(student => {
        const attendanceMatch = attendees.find((a: any) => a.id === student.id || a.email === student.email);
        if (attendanceMatch) {
          return { ...student, status: 'Present' };
        }
        return student;
      }));
    });

    return () => unsubscribe();
  }, [zoneId, activeSession]);

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
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const result = await genAI.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{
          role: 'user',
          parts: [{
            text: `Generate a constructive, short, and encouraging feedback note for students in this performance group: "${cluster.label}". Answer description: ${cluster.description}. Average score: ${cluster.score}/10.`
          }]
        }]
      });
      setGeneratedFeedback(result.text || "Good attempt. Keep refining your approach to the problem.");
    } catch (error) {
      console.error("AI feedback generation failed:", error);
      setGeneratedFeedback("Solid effort. Review the logical steps taken to identify potential areas for improvement.");
    }
  };

  const handleSaveGrading = () => {
    alert(`Batch Grade Applied to ${clusters.find(c => c.id === activeClusterId)?.studentIds.length} students.`);
  };

  const handleLaunchLive = () => {
    if (!zone) return;
    const sessionId = Date.now().toString();
    const newSession = {
      id: sessionId,
      zoneId: zoneId,
      title: zone.title,
      status: 'live',
      startTime: new Date().toISOString(),
      tutorName: 'Tutor' // Mock
    };

    const sessions = JSON.parse(localStorage.getItem('nunma_live_sessions') || '[]');
    const updated = [...sessions.filter((s: any) => s.zoneId !== zoneId), newSession];
    localStorage.setItem('nunma_live_sessions', JSON.stringify(updated));
    setActiveSession(newSession);
    window.dispatchEvent(new Event('storage'));
  };

  const handleEndLive = () => {
    const sessions = JSON.parse(localStorage.getItem('nunma_live_sessions') || '[]');
    const updated = sessions.map((s: any) => s.zoneId === zoneId ? { ...s, status: 'ended' } : s);
    localStorage.setItem('nunma_live_sessions', JSON.stringify(updated));
    setActiveSession(null);
    window.dispatchEvent(new Event('storage'));
  };

  const handleCopyLink = () => {
    if (!activeSession) return;
    const link = `${window.location.origin}/#/classroom/zone/${zoneId}?session=${activeSession.id}`;
    navigator.clipboard.writeText(link);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  if (!zone) return <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">Loading Infrastructure...</div>;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20 relative">

      {/* START EXAM MODAL */}
      {showStartExamModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden p-10 animate-in zoom-in-95 duration-500">
            <h3 className="text-3xl font-black text-[#040457] mb-4">Launch Exam</h3>
            <p className="text-sm text-gray-400 mb-10 leading-relaxed font-medium">Verify the broadcasting schedule before going live.</p>

            <div className="space-y-6 mb-12">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Scheduled Date</label>
                <input type="date" value={examStartDate} onChange={e => setExamStartDate(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Time (Local)</label>
                <input type="time" value={examStartTime} onChange={e => setExamStartTime(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all" />
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowStartExamModal(false)} className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={() => { setExams(exams.map(e => e.id === examToStart?.id ? { ...e, status: 'CONDUCTED' } : e)); setShowStartExamModal(false); }} className="flex-[2] py-5 bg-[#040457] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 active:scale-95">Confirm Launch</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {showAddExamModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-[#040457]/90 backdrop-blur-2xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[4rem] w-full max-w-4xl shadow-3xl overflow-hidden p-12 my-8 animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-4xl font-black text-[#040457] tracking-tight">Create Achievement Gate</h3>
              <button onClick={() => setShowAddExamModal(false)} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block px-1">Exam Name</label>
                  <input value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} placeholder="Final Certification..." className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-[1.5rem] px-8 py-5 font-bold text-[#040457] outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block px-1">Date</label>
                    <input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-[1.5rem] px-8 py-5 font-bold text-[#040457] outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block px-1">Time</label>
                    <input type="time" value={newExamTime} onChange={e => setNewExamTime(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-[1.5rem] px-8 py-5 font-bold text-[#040457] outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block px-1">Exam Mode</label>
                  <div className="flex gap-4">
                    {(['online', 'offline'] as const).map(mode => (
                      <button key={mode} onClick={() => setNewExamType(mode)} className={`flex-1 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${newExamType === mode ? 'bg-[#040457] text-white shadow-xl' : 'bg-gray-50 text-gray-400'}`}>
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block px-1">Max Marks</label>
                    <input type="number" value={newExamMaxMark} onChange={e => setNewExamMaxMark(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-[1.5rem] px-8 py-5 font-bold text-[#040457] outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block px-1">Min (Pass) Marks</label>
                    <input type="number" value={newExamMinMark} onChange={e => setNewExamMinMark(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-[1.5rem] px-8 py-5 font-bold text-[#040457] outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-[2.5rem] p-8 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-black text-[#040457] uppercase text-[11px] tracking-widest">Questions {newExamType === 'offline' && '(Disabled)'}</h4>
                  {newExamType === 'online' && <button onClick={handleAddQuestion} className="p-2 bg-[#c2f575] text-[#040457] rounded-lg hover:scale-110 transition-all"><Plus size={16} /></button>}
                </div>
                <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                  {newExamType === 'online' ? (
                    newExamQuestions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-300 italic text-sm text-center p-10">
                        <Radio size={40} className="mb-4 opacity-20" />
                        No questions added yet.<br />Online exams require at least one MCQ.
                      </div>
                    ) : (
                      newExamQuestions.map((q, idx) => (
                        <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                          <div className="flex justify-between">
                            <span className="text-[10px] font-black text-gray-300 uppercase">Q {idx + 1}</span>
                            <button onClick={() => setNewExamQuestions(newExamQuestions.filter(x => x.id !== q.id))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                          </div>
                          <input placeholder="Question text..." value={q.question} onChange={e => {
                            const updated = [...newExamQuestions];
                            updated[idx].question = e.target.value;
                            setNewExamQuestions(updated);
                          }} className="w-full font-bold text-[#040457] p-0 border-none outline-none focus:ring-0 text-sm" />
                          <div className="grid grid-cols-2 gap-3">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <input type="radio" checked={q.correctAnswer === oIdx} onChange={() => {
                                  const updated = [...newExamQuestions];
                                  updated[idx].correctAnswer = oIdx;
                                  setNewExamQuestions(updated);
                                }} />
                                <input placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => {
                                  const updated = [...newExamQuestions];
                                  updated[idx].options[oIdx] = e.target.value;
                                  setNewExamQuestions(updated);
                                }} className="bg-gray-50 border-none rounded-lg px-3 py-2 text-[10px] font-bold w-full" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 italic text-sm text-center p-10">
                      <FileSpreadsheet size={40} className="mb-4 opacity-20" />
                      Offline mode selected. You will be able to upload marks via Excel once the exam is conducted.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button onClick={handleCreateExam} className="w-full py-6 bg-[#c2f575] text-[#040457] rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:brightness-110 transition-all flex items-center justify-center gap-4">
              <Sparkles size={20} /> Deploy Exam Instance
            </button>
          </div>
        </div>
      )}

      {/* MARK ENTRY MODAL (FOR OFFLINE) */}
      {showMarkEntryModal && selectedExamForMarks && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-[#040457]/90 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] w-full max-w-5xl shadow-3xl overflow-hidden p-12 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-4xl font-black text-[#040457] tracking-tight">Gradebook: {selectedExamForMarks.title}</h3>
                <p className="text-sm text-gray-400 mt-2 font-medium">Bulk import marks or enter them manually for each student.</p>
              </div>
              <button onClick={() => setShowMarkEntryModal(false)} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all"><X size={24} /></button>
            </div>

            <div className="flex gap-6 mb-10">
              <div className="flex-1 bg-gray-50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-4 hover:border-[#c2f575] transition-all relative">
                <Upload size={32} className="text-gray-300" />
                <div>
                  <h4 className="font-bold text-[#040457]">Excel Import</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">S.no, Name, Mark</p>
                </div>
                <input type="file" accept=".xls,.xlsx,.csv" onChange={(e) => handleExcelUpload(e, selectedExamForMarks.id)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <div className="flex-1 bg-gray-50 p-8 rounded-[2.5rem] border-2 border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                <FileDown size={32} className="text-gray-300" />
                <div>
                  <h4 className="font-bold text-[#040457]">Download Template</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Get blank sheet with student list</p>
                </div>
                <button className="text-[10px] font-black text-[#040457] bg-[#c2f575] px-6 py-3 rounded-xl uppercase tracking-widest">Download</button>
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
                  {students.map(student => {
                    const result = examResults.find(r => r.examId === selectedExamForMarks.id && r.studentId === student.id);
                    return (
                      <div key={student.id} className="grid grid-cols-4 items-center bg-white p-5 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-4">
                          <img src={student.avatar} className="w-10 h-10 rounded-xl" alt="" />
                          <span className="font-bold text-[#040457] text-sm">{student.name}</span>
                        </div>
                        <div className="text-center">
                          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${result ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                            {result ? 'Graded' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex justify-center">
                          <input
                            type="number"
                            placeholder="0"
                            value={result?.marks || ''}
                            onChange={e => {
                              const mark = parseInt(e.target.value);
                              const status = mark >= selectedExamForMarks.minMark ? 'passed' : 'failed';
                              setExamResults(prev => [
                                ...prev.filter(r => !(r.examId === selectedExamForMarks.id && r.studentId === student.id)),
                                { id: Math.random().toString(), examId: selectedExamForMarks.id, studentId: student.id, studentName: student.name, marks: mark, status, warnings: 0 }
                              ]);
                            }}
                            className="w-20 bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-xl px-4 py-2 text-center font-bold text-[#040457] outline-none"
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
              <button onClick={() => { setShowMarkEntryModal(false); alert('Gradebook synchronized successfully.'); }} className="flex-[2] py-5 bg-[#040457] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Complete Synchronization</button>
            </div>
          </div>
        </div>
      )}

      {/* WHITELIST MODAL */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-2xl overflow-hidden p-12 animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-4xl font-black text-[#040457] tracking-tighter">Whitelist Access</h3>
                <p className="text-sm text-gray-400 mt-2 font-medium">Grant account access by providing student email addresses.</p>
              </div>
              <button onClick={() => setShowAddStudentModal(false)} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all"><X size={24} /></button>
            </div>

            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Individual Invite</label>
                <div className="flex gap-4">
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={newStudentEmail}
                    onChange={e => setNewStudentEmail(e.target.value)}
                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-5 font-bold text-[#040457] outline-none transition-all"
                  />
                  <button
                    onClick={() => {
                      if (!newStudentEmail) return;
                      const newStudent: Student = {
                        id: Date.now().toString(),
                        name: newStudentEmail.split('@')[0],
                        avatar: `https://picsum.photos/seed/${newStudentEmail}/40/40`,
                        joinedAt: new Date().toLocaleDateString(),
                        status: 'Pending',
                        engagementScore: 0,
                        email: newStudentEmail
                      };
                      setStudents([...students, newStudent]);
                      setNewStudentEmail('');
                      alert('Email whitelisted!');
                    }}
                    className="px-8 py-5 bg-[#040457] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    Grant Access
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
                  <FileSpreadsheet size={16} /> Bulk Upload (CSV / Emails)
                </label>
                <textarea
                  placeholder="Paste emails separated by commas or new lines..."
                  value={bulkEmails}
                  onChange={e => setBulkEmails(e.target.value)}
                  className="w-full h-40 bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-[2.5rem] p-8 font-bold text-[#040457] outline-none transition-all resize-none custom-scrollbar"
                ></textarea>
                <p className="text-[10px] text-gray-300 font-bold px-2 italic">Tip: You can copy-paste a list from Excel or Google Sheets directly.</p>
                <button
                  onClick={() => {
                    const emails = bulkEmails.split(/[,\n\s]+/).filter(e => e.includes('@'));
                    const newStudents = emails.map(email => ({
                      id: Math.random().toString(36).substr(2, 9),
                      name: email.split('@')[0],
                      avatar: `https://picsum.photos/seed/${email}/40/40`,
                      joinedAt: new Date().toLocaleDateString(),
                      status: 'Pending' as const,
                      engagementScore: 0,
                      email: email
                    }));
                    setStudents([...students, ...newStudents]);
                    setBulkEmails('');
                    alert(`${newStudents.length} emails whitelisted!`);
                  }}
                  className="w-full py-6 bg-[#c2f575] text-[#040457] rounded-3xl font-black uppercase text-xs tracking-[0.25em] hover:brightness-110 active:scale-[0.98] transition-all shadow-xl"
                >
                  Confirm Bulk Whitelist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-8">
          <button onClick={() => navigate('/workplace')} className="p-5 bg-white border border-gray-100 rounded-[1.5rem] text-[#040457] hover:shadow-2xl transition-all shadow-sm active:scale-90"><ArrowLeft size={28} /></button>
          <div>
            <h1 className="text-6xl font-black text-[#040457] tracking-tighter leading-none mb-3">{zone.title}</h1>
            <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.4em]">{zone.level} LEVEL FACILITY</p>
          </div>
        </div>
        <button onClick={() => setShowAddStudentModal(true)} className="px-10 py-5 bg-[#040457] text-white rounded-[1.75rem] font-black uppercase text-xs tracking-widest flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#040457]/20">
          <UserPlus size={20} /> Whitelist
        </button>
      </div>

      {view === 'management' ? (
        <div className="bg-white rounded-[4rem] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden min-h-[740px] flex flex-col">
          <div className="flex bg-gray-50/50 p-4 border-b border-gray-100 gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'attendance', label: 'ATTENDANCE', icon: <CheckCircle2 size={16} /> },
              { id: 'curriculum', label: 'CURRICULUM', icon: <Layers size={16} /> },
              { id: 'exams', label: 'EXAM STREAMS', icon: <GraduationCap size={16} /> },
              { id: 'schedule', label: 'SCHEDULE LIVE', icon: <Video size={16} /> },
              { id: 'students', label: 'STUDENTS', icon: <Users size={16} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-5 px-10 rounded-[1.75rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 whitespace-nowrap 
                  ${activeTab === tab.id
                    ? 'bg-white text-[#040457] shadow-xl border border-gray-100'
                    : 'text-gray-400 hover:text-[#040457] hover:bg-white/50'
                  }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="p-16 flex-1">
            {activeTab === 'attendance' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="flex justify-between items-center gap-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search students by name or email..."
                      value={attendanceSearchQuery}
                      onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-3xl pl-16 pr-8 py-5 font-bold text-[#040457] outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const csvContent = "Name,Email,Status,Joined At\n" + students.map(s => `${s.name},${s.email},${s.status},${s.joinedAt}`).join("\n");
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.download = `attendance_${attendanceDate}.csv`;
                      link.click();
                    }}
                    className="px-8 py-5 bg-[#040457] text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-xl"
                  >
                    <Download size={18} /> Download List
                  </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registry Status</th>
                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.filter(s => s.name.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) || (s.email || '').toLowerCase().includes(attendanceSearchQuery.toLowerCase())).map(student => (
                        <tr key={student.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <img src={student.avatar} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" alt="" />
                              <span className="font-bold text-[#040457]">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <span className="text-sm text-gray-400 font-medium">{student.email}</span>
                          </td>
                          <td className="px-10 py-6">
                            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${student.status === 'Present' ? 'bg-green-50 text-green-600' :
                              student.status === 'Absent' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                              }`}>
                              {student.status}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setStudents(students.map(s => s.id === student.id ? { ...s, status: 'Present' } : s))}
                                className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setStudents(students.map(s => s.id === student.id ? { ...s, status: 'Absent' } : s))}
                                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
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
                  <h3 className="text-4xl font-black text-[#040457] tracking-tighter">Course Blueprint</h3>
                  <button
                    onClick={() => {
                      const newChapter: Chapter = { id: `c${Date.now()}`, title: 'New Chapter', segments: [] };
                      setChapters([...chapters, newChapter]);
                    }}
                    className="px-8 py-5 bg-[#c2f575] text-[#040457] rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-xl"
                  >
                    <Plus size={18} /> Add Chapter
                  </button>
                </div>

                <div className="space-y-8">
                  {chapters.map((chapter) => (
                    <div key={chapter.id} className="bg-white border border-gray-100 rounded-[3rem] p-10 space-y-8 shadow-sm group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 flex-1">
                          <GripVertical className="text-gray-200 cursor-move" size={24} />
                          <input
                            type="text"
                            value={chapter.title}
                            onChange={(e) => setChapters(chapters.map(c => c.id === chapter.id ? { ...c, title: e.target.value } : c))}
                            className="bg-transparent text-2xl font-black text-[#040457] outline-none border-b-4 border-transparent focus:border-[#c2f575]/20 w-full"
                          />
                        </div>
                        <div className="flex gap-4">
                          <button
                            onClick={() => {
                              const newSeg: Segment = { id: `s${Date.now()}`, title: 'New Segment', type: 'video' };
                              setChapters(chapters.map(c => c.id === chapter.id ? { ...c, segments: [...c.segments, newSeg] } : c));
                            }}
                            className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-[#040457] hover:text-white transition-all"
                          >
                            <Plus size={20} />
                          </button>
                          <button
                            onClick={() => setChapters(chapters.filter(c => c.id !== chapter.id))}
                            className="p-4 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
                        {chapter.segments.map((seg) => (
                          <div key={seg.id} className="p-6 bg-gray-50 border border-transparent hover:border-[#c2f575]/20 rounded-3xl flex items-center justify-between group/seg transition-all">
                            <div className="flex items-center gap-4">
                              <div className="p-4 bg-white rounded-2xl shadow-sm text-[#040457]">
                                {seg.type === 'video' ? <FileVideo size={20} /> : <FileText size={20} />}
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={seg.title}
                                  onChange={(e) => {
                                    setChapters(chapters.map(c => c.id === chapter.id ? {
                                      ...c,
                                      segments: c.segments.map(s => s.id === seg.id ? { ...s, title: e.target.value } : s)
                                    } : c));
                                  }}
                                  className="bg-transparent font-bold text-[#040457] outline-none border-b-2 border-transparent focus:border-[#c2f575]/20 block mb-1"
                                />
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{seg.type} {seg.duration ? `• ${seg.duration}` : ''}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover/seg:opacity-100 transition-opacity">
                              <button className="p-3 bg-white text-gray-400 rounded-xl hover:text-[#040457] transition-all shadow-sm">
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setChapters(chapters.map(c => c.id === chapter.id ? {
                                    ...c,
                                    segments: c.segments.filter(s => s.id !== seg.id)
                                  } : c));
                                }}
                                className="p-3 bg-white text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                  <h3 className="text-4xl font-black text-[#040457] tracking-tighter">Enrolled Minds</h3>
                  <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                    <Users size={20} /> {students.length} Students Total
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {students.map(student => (
                    <div key={student.id} className="bg-white border border-gray-100 rounded-[3rem] p-8 flex flex-col items-center text-center space-y-6 shadow-sm group hover:shadow-xl transition-all duration-500">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl rotate-3 group-hover:rotate-0 transition-all duration-500">
                          <img src={student.avatar} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#c2f575] rounded-xl flex items-center justify-center text-[#040457] shadow-lg">
                          <Check size={16} strokeWidth={3} />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-[#040457] mb-1">{student.name}</h4>
                        <p className="text-xs text-gray-400 font-medium">{student.email}</p>
                      </div>
                      <div className="pt-4 border-t border-gray-50 w-full flex justify-around">
                        <div className="text-center">
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Score</p>
                          <p className="font-bold text-[#040457]">{student.engagementScore}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Time</p>
                          <p className="font-bold text-[#040457]">{student.durationInSession}m</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'schedule' && (
              <div className="space-y-16 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                  <h3 className="text-5xl font-black text-[#040457] tracking-tighter">Live Session Control</h3>
                  {!activeSession ? (
                    <button
                      onClick={handleLaunchLive}
                      className="bg-red-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center gap-4 shadow-2xl hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Radio size={20} className="animate-pulse" /> GO LIVE NOW
                    </button>
                  ) : (
                    <button
                      onClick={handleEndLive}
                      className="bg-black text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center gap-4 shadow-2xl hover:bg-gray-900 active:scale-95 transition-all"
                    >
                      <X size={20} /> END SESSION
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="p-12 bg-white border border-gray-100 rounded-[4rem] flex flex-col items-center justify-center text-center space-y-8 shadow-sm">
                    <div className={`w-32 h-32 rounded-[3.5rem] flex items-center justify-center shadow-2xl ${activeSession ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-300'}`}>
                      <Video size={64} />
                    </div>
                    <div>
                      <h4 className="text-3xl font-black text-[#040457] mb-2">{activeSession ? 'Broadcasting Meta-Stream' : 'Camera Ready'}</h4>
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
                    <h4 className="text-2xl font-black text-[#040457] flex items-center gap-4">
                      <Link className="text-[#c2f575]" /> Invite Students
                    </h4>
                    <p className="text-sm text-gray-400 font-medium">Share this deep-link to grant students instant access to your live zone.</p>
                    <div className="p-6 bg-gray-50 border border-gray-100 rounded-3xl break-all font-mono text-[10px] text-gray-400 relative group overflow-hidden">
                      {activeSession ? `${window.location.origin}/#/live/${zoneId}/${activeSession.id}` : 'Launch session to generate link'}
                      {activeSession && (
                        <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={handleCopyLink} className="flex items-center gap-3 text-[#040457] font-black uppercase text-[10px] tracking-widest">
                            <Copy size={16} /> {isCopying ? 'COPIED!' : 'COPY TO CLIPBOARD'}
                          </button>
                        </div>
                      )}
                    </div>
                    {activeSession && (
                      <button
                        onClick={handleCopyLink}
                        className="w-full py-5 bg-[#c2f575] text-[#040457] rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all"
                      >
                        <ExternalLink size={18} /> {isCopying ? 'COPIED!' : 'SHARE INVITE LINK'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Upcoming Broadcasts Section */}
                <div className="space-y-8">
                  <h4 className="text-2xl font-black text-[#040457] tracking-tight">Upcoming Broadcasts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[
                      { title: 'Advanced Product Logic', time: 'Tomorrow, 10:00 AM', duration: '60 mins' },
                      { title: 'User Psychology Session', time: 'Feb 12, 11:30 AM', duration: '45 mins' }
                    ].map((session, idx) => (
                      <div key={idx} className="p-8 bg-gray-50/50 border border-gray-100 rounded-[2.5rem] space-y-6 hover:bg-white hover:shadow-xl transition-all duration-500 group">
                        <div className="flex justify-between items-start">
                          <div className="p-4 bg-white rounded-2xl shadow-sm text-gray-400 group-hover:text-[#040457] transition-all">
                            <Clock size={20} />
                          </div>
                          <button className="text-[10px] font-black text-[#040457] bg-[#c2f575] px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all">EDIT</button>
                        </div>
                        <div>
                          <h5 className="text-lg font-black text-[#040457] mb-1">{session.title}</h5>
                          <p className="text-xs text-gray-400 font-medium">{session.time} • {session.duration}</p>
                        </div>
                      </div>
                    ))}
                    <button className="p-8 border-2 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-300 hover:border-[#c2f575] hover:text-[#c2f575] transition-all group">
                      <div className="p-4 rounded-2xl bg-gray-50 group-hover:bg-[#c2f575]/10 transition-all">
                        <Plus size={24} />
                      </div>
                      <span className="font-black uppercase text-[10px] tracking-widest">Schedule Session</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'exams' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h3 className="text-5xl font-black text-[#040457] tracking-tighter">Achievement Gating</h3>
                    <p className="text-sm text-gray-400 font-bold mt-2">Manage online proctored exams and offline certifications.</p>
                  </div>
                  <button
                    onClick={() => setShowAddExamModal(true)}
                    className="px-10 py-5 bg-[#040457] text-white rounded-[1.75rem] font-black uppercase text-xs tracking-widest flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl"
                  >
                    <Plus size={20} /> Create Exam
                  </button>
                </div>

                <div className="flex gap-6 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Find exam by name or status..."
                      value={examSearchQuery}
                      onChange={(e) => setExamSearchQuery(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-[2rem] pl-16 pr-8 py-5 font-bold text-[#040457] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {exams.filter(e => e.title.toLowerCase().includes(examSearchQuery.toLowerCase())).map(exam => (
                    <div key={exam.id} className="bg-white border border-gray-100 rounded-[3.5rem] p-10 space-y-10 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
                      <div className="flex justify-between items-start">
                        <div className={`p-5 rounded-[1.75rem] shadow-sm ${exam.type === 'online' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {exam.type === 'online' ? <Radio size={32} /> : <FileSpreadsheet size={32} />}
                        </div>
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${exam.status === 'UPCOMING' ? 'bg-indigo-50 text-indigo-500' : 'bg-green-50 text-green-500'}`}>
                          {exam.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-2xl font-black text-[#040457] tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{exam.title}</h4>
                        <div className="flex items-center gap-4 text-gray-400 font-bold text-xs uppercase tracking-widest">
                          <Calendar size={14} /> {exam.date} @ {exam.time}
                        </div>
                      </div>

                      <div className="pt-8 border-t border-gray-50 flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Target Marks</p>
                          <p className="font-bold text-[#040457]">{exam.minMark}/{exam.maxMark} <span className="text-[10px] text-gray-400">(Pass)</span></p>
                        </div>
                        {exam.status === 'CONDUCTED' ? (
                          <button
                            onClick={() => { setSelectedExamForMarks(exam); setShowMarkEntryModal(true); }}
                            className="bg-[#040457] text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all"
                          >
                            Open Gradebook
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all"><Edit3 size={18} /></button>
                            <button onClick={() => setExams(exams.filter(e => e.id !== exam.id))} className="p-4 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
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
              </div>
            )}
            {activeTab !== 'exams' && activeTab !== 'schedule' && <div className="py-20 text-center text-gray-300 italic">Configuration module loading...</div>}
          </div>
        </div>
      ) : view === 'grading' ? (
        /* GRADING POWER-VIEW */
        <div className={`animate-in fade-in slide-in-from-right-10 duration-700 h-[calc(100vh-140px)] flex flex-col ${isSmartMarking ? 'bg-[#03031f] -m-12 p-12 rounded-none fixed inset-0 z-[100]' : ''}`}>
          {isSmartMarking && <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#c2f575] via-indigo-500 to-[#c2f575] animate-[shimmer_2s_infinite]"></div>}

          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-6">
              <button onClick={() => { setView('management'); setIsSmartMarking(false); }} className={`flex items-center gap-4 font-black text-sm uppercase tracking-[0.25em] hover:translate-x-[-8px] transition-all ${isSmartMarking ? 'text-white' : 'text-[#040457]'}`}>
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
              <button onClick={handleSaveGrading} className="bg-[#c2f575] text-[#040457] px-10 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.3em] hover:brightness-110 shadow-2xl active:scale-95 transition-all">
                Apply & Save Progress
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
                                 ${activeClusterId === cluster.id ? 'bg-[#c2f575] border-[#c2f575] text-[#040457] scale-[1.02] shadow-2xl' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="font-black text-lg tracking-tight">{cluster.label}</span>
                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${activeClusterId === cluster.id ? 'bg-[#040457]/10' : 'bg-white/10'}`}>{cluster.studentIds.length}</span>
                          </div>
                          <p className={`text-sm leading-relaxed font-medium ${activeClusterId === cluster.id ? 'text-[#040457]/70' : 'text-gray-500'}`}>{cluster.description}</p>
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
                      <button className="w-full py-5 bg-[#c2f575] text-[#040457] rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-105 shadow-xl transition-all"><Play size={16} fill="currentColor" /> Preview Audio</button>
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
                  {clusters.find(c => c.id === activeClusterId)?.studentIds.map(sid => (
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
                    <input type="number" value={scriptScore} onChange={e => setScriptScore(e.target.value)} className="bg-transparent text-5xl font-black text-[#c2f575] w-32 outline-none border-b-4 border-transparent focus:border-[#c2f575]/20 transition-all" />
                  </div>
                  <div className="w-[1.5px] h-16 bg-white/10"></div>
                  <div className="text-right">
                    <p className="text-white font-black text-xl tracking-tighter">Cluster Grade</p>
                    <p className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest mt-1">Applies to {clusters.find(c => c.id === activeClusterId)?.studentIds.length} learners</p>
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
  );
};

export default ZoneManagement;

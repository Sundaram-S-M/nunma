import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { X, Check, Eye, AlertTriangle, Search, Upload, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import PDFViewer from './PDFViewer';
import TutorGradingHub from './TutorGradingHub';
import * as XLSX from 'xlsx';

interface GradingHubProps {
    zoneId: string;
    exam: any; // Using the Exam type loosely
    onClose: () => void;
    onValuate: (studentId: string, scriptUrl: string) => void;
}

const GradingHub: React.FC<GradingHubProps> = ({ zoneId, exam, onClose, onValuate }) => {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(true);
    const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);
    const [gradingState, setGradingState] = useState<Record<string, { marks: number | '', feedback: string }>>({});

    // New States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [valuatingStudentId, setValuatingStudentId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const headerEl = document.getElementById('global-header');
        const mobileNavEl = document.getElementById('global-mobile-nav');

        if (headerEl) headerEl.style.setProperty('display', 'none', 'important');
        if (mobileNavEl) mobileNavEl.style.setProperty('display', 'none', 'important');

        return () => {
            if (headerEl) headerEl.style.removeProperty('display');
            if (mobileNavEl) mobileNavEl.style.removeProperty('display');
        };
    }, []);

    useEffect(() => {
        if (!zoneId) return;
        // Fetch students
        const stuQ = query(collection(db, 'zones', zoneId, 'students'));
        const unsubStu = onSnapshot(stuQ, (snapshot) => {
            const stus = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(stus);
            if (stus.length > 0 && !selectedStudentId) {
                // Select first student by default
                setSelectedStudentId(stus[0].id);
            }
        });

        // Fetch submissions
        const subQ = query(collection(db, 'zones', zoneId, 'exams', exam.id, 'submissions'));
        const unsubSub = onSnapshot(subQ, (snapshot) => {
            const subs: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubmissions(subs);
            setLoadingSubmissions(false);

            // Initialize grading state
            setGradingState((prev: Record<string, { marks: number | '', feedback: string }>) => {
                const newState = { ...prev };
                subs.forEach(sub => {
                    newState[sub.studentId] = {
                        marks: sub.marks ?? prev[sub.studentId]?.marks ?? '',
                        feedback: sub.feedback ?? prev[sub.studentId]?.feedback ?? ''
                    };
                });
                return newState;
            });
        });

        return () => {
            unsubStu();
            unsubSub();
        };
    }, [zoneId, exam]);

    const handleGradeSubmit = async (studentId: string) => {
        const state = gradingState[studentId];
        if (!state || state.marks === '') {
            alert('Please enter valid marks.');
            return;
        }

        try {
            const submission = submissions.find(s => s.studentId === studentId);
            const subId = submission ? submission.id : studentId; // Fallback to studentId if no explicit submission exists

            // We write to submissions to keep it uniform
            await setDoc(doc(db, 'zones', zoneId, 'exams', exam.id, 'submissions', subId), {
                studentId,
                studentName: students.find(s => s.id === studentId)?.name || 'Unknown Student',
                marks: Number(state.marks),
                feedback: state.feedback,
                status: 'graded',
                gradedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // Keep answer sheet if exists
                ...(submission ? {} : { answerSheetUrl: null }),
                gradedBy: auth.currentUser?.uid || null
            }, { merge: true });

            // Send Notification
            await setDoc(doc(collection(db, 'users', studentId, 'notifications')), {
                title: 'Exam Graded',
                message: `Your marks for ${exam.title} have been published! You scored ${state.marks}/${exam.maxMark}.`,
                createdAt: serverTimestamp(),
                read: false,
                type: 'exam_graded'
            });

            alert(`Grade updated successfully for ${students.find(s => s.id === studentId)?.name || 'student'}!`);
        } catch (e: any) {
            console.error('Failed to submit grade', e);
            if (e.code === 'permission-denied') {
                alert('Access Denied: Your co-tutor permissions may have been revoked or you are trying to grade outside your assigned subject. Please contact the zone creator.');
            } else {
                alert('Failed to submit grade.');
            }
        }
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Parse sheet as JSON array of arrays
            const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (json.length < 2) {
                alert("Excel file is empty or missing data rows.");
                return;
            }

            // Find headers
            const headers = json[0].map((h: any) => String(h).toLowerCase().trim());
            const markIndex = headers.findIndex(h => h.includes('mark') || h.includes('score') || h.includes('grade'));
            const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('student') || h.includes('email'));

            if (markIndex === -1) {
                alert("Could not locate a column for 'marks' or 'score' in the uploaded sheet.");
                return;
            }

            let importCount = 0;

            for (let i = 1; i < json.length; i++) {
                const row = json[i];
                if (!row || row.length === 0) continue;

                const rawMark = row[markIndex];
                const markNum = parseInt(rawMark);
                if (isNaN(markNum)) continue;

                const nameValue = nameIndex !== -1 ? String(row[nameIndex]) : '';

                // Find matching student
                const matchedStudent = students.find(s =>
                    s.name?.toLowerCase() === nameValue.toLowerCase() ||
                    s.email?.toLowerCase() === nameValue.toLowerCase()
                );

                if (matchedStudent) {
                    const studentId = matchedStudent.id;
                    const submission = submissions.find(s => s.studentId === studentId);
                    const subId = submission ? submission.id : studentId;
                    // Ensure we don't wipe out answer sheets when importing
                    await setDoc(doc(db, 'zones', zoneId, 'exams', exam.id, 'submissions', matchedStudent.id), {
                        studentId: matchedStudent.id,
                        studentName: matchedStudent.name || 'Unknown Student',
                        marks: markNum,
                        feedback: 'Imported from Excel',
                        status: 'graded',
                        gradedAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        gradedBy: auth.currentUser?.uid || null
                    }, { merge: true });

                    // Update local state optimistic
                    setGradingState(prev => ({
                        ...prev,
                        [studentId]: { marks: markNum, feedback: 'Imported from Excel' }
                    }));

                    // Notification
                    await setDoc(doc(collection(db, 'users', studentId, 'notifications')), {
                        title: 'Exam Graded',
                        message: `Your marks for ${exam.title} have been published! You scored ${markNum}/${exam.maxMark}.`,
                        createdAt: serverTimestamp(),
                        read: false,
                        type: 'exam_graded'
                    });

                    importCount++;
                }
            }

            alert(`Successfully imported marks for ${importCount} students!`);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            console.error("Error parsing Excel:", error);
            if (error?.code === 'permission-denied') {
                alert('Access Denied: You do not have permission to import marks for this subject.');
            } else {
                alert("Failed to parse Excel file. Please ensure it's a valid format.");
            }
        }
    };

    const filteredStudents = students.filter(s =>
        (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedStudent = students.find(s => s.id === selectedStudentId);
    const selectedSubmission = submissions.find(s => s.studentId === selectedStudentId);

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-0 md:p-6 bg-nunma-forest md:bg-nunma-forest/90 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="bg-white rounded-none md:rounded-[4rem] w-full max-w-7xl shadow-3xl overflow-hidden p-4 md:p-8 h-full md:max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-500 relative">

                {/* Header */}
                <div className="flex justify-between items-center mb-4 md:mb-8 px-2 md:px-4 shrink-0">
                    <div>
                        <h3 className="text-xl md:text-4xl font-black text-nunma-forest tracking-tight">{exam.title} <span className="text-gray-300">/ Grading</span></h3>
                        <p className="text-xs md:text-sm text-gray-400 mt-1 md:mt-2 font-medium">
                            {exam.type === 'offline'
                                ? 'Review submissions, enter marks manually, or bulk upload scores.'
                                : 'View automatically graded results and student submissions.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        {exam.type === 'offline' && (
                            <>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleExcelUpload}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 md:px-6 py-2 md:py-4 bg-[#c2f575]/20 text-[#6ea812] border-2 border-[#c2f575] hover:bg-[#c2f575] hover:text-nunma-forest rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-[12px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                    <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Bulk Upload CSV</span>
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="p-2.5 md:p-4 bg-gray-50 text-gray-400 rounded-xl md:rounded-2xl hover:bg-black hover:text-white transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content: Left Student List + Right Grading Panel */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 md:gap-6 relative">

                    {/* Left Sidebar: Student List */}
                    <div className={`w-full md:w-1/3 flex-col bg-gray-50 rounded-2xl md:rounded-[3rem] overflow-hidden border border-gray-100 relative ${
                        mobileView === 'list' ? 'flex flex-1' : 'hidden md:flex'
                    }`}>
                        <div className="p-4 md:p-6 border-b border-gray-200/50 bg-white/50 sticky top-0 backdrop-blur-md z-10 flex flex-col gap-3 md:gap-4">
                            <h4 className="font-black text-nunma-forest text-base md:text-lg">Enrolled Students</h4>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border-2 border-transparent focus:border-[#c2f575] rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold text-nunma-forest outline-none transition-colors shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 custom-scrollbar">
                            {filteredStudents.length === 0 ? (
                                <p className="text-center text-gray-400 font-medium text-sm mt-8">No students found.</p>
                            ) : (
                                filteredStudents.map(student => {
                                    const sub = submissions.find(s => s.studentId === student.id);
                                    const isSelected = selectedStudentId === student.id;
                                    const isGraded = sub?.status === 'graded' || gradingState[student.id]?.marks !== '';
                                    return (
                                        <button
                                            key={student.id}
                                            onClick={() => {
                                                setSelectedStudentId(student.id);
                                                setMobileView('detail');
                                            }}
                                            className={`w-full flex items-center justify-between p-3.5 md:p-4 rounded-2xl transition-all border-2 text-left ${isSelected ? 'bg-white border-[#c2f575] shadow-sm' : 'bg-transparent border-transparent hover:bg-white hover:shadow-sm'}`}
                                        >
                                            <div className="flex flex-col overflow-hidden pr-2">
                                                <span className={`font-bold truncate text-sm md:text-base ${isSelected ? 'text-nunma-forest' : 'text-gray-600'}`}>{student.name || student.email}</span>
                                                <span className="text-[9px] md:text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-0.5">
                                                    {sub?.answerSheetUrl ? 'Script Uploaded' : 'No Script'}
                                                </span>
                                            </div>
                                            {isGraded ? (
                                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                                    <Check size={14} className="text-green-600" />
                                                </div>
                                            ) : (
                                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Grading & Script */}
                    <div className={`w-full md:w-2/3 flex-col bg-white rounded-2xl md:rounded-[3rem] overflow-hidden border border-gray-100 p-4 md:p-8 shadow-sm relative ${
                        mobileView === 'detail' ? 'flex flex-1' : 'hidden md:flex'
                    }`}>
                        {/* Mobile Back Button */}
                        <button
                            onClick={() => setMobileView('list')}
                            className="md:hidden flex items-center gap-2 text-nunma-forest font-bold text-xs uppercase tracking-widest mb-3 p-2 bg-gray-50 rounded-xl w-fit shrink-0"
                        >
                            <ArrowLeft size={16} /> Back to Student List
                        </button>

                        {loadingSubmissions ? (
                            <div className="flex items-center justify-center h-full text-gray-400 font-bold">Loading...</div>
                        ) : !selectedStudent ? (
                            <div className="flex items-center justify-center h-full text-gray-400 font-bold text-base md:text-lg">Select a student from the list to grade.</div>
                        ) : (
                            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 shrink-0">
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-black text-nunma-forest">{selectedStudent.name || selectedStudent.email}</h2>
                                        <div className="flex items-center gap-2 md:gap-3 mt-2 flex-wrap">
                                            <span className={`px-3 py-1 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest ${selectedSubmission?.status === 'graded' || gradingState[selectedStudent.id]?.marks !== '' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                {selectedSubmission?.status === 'graded' || gradingState[selectedStudent.id]?.marks !== '' ? 'Graded' : 'Pending Review'}
                                            </span>
                                            {selectedSubmission?.completedAt && (
                                                <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Submitted: {new Date(selectedSubmission.completedAt).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {selectedSubmission?.answerSheetUrl && (
                                        <button
                                            onClick={() => setValuatingStudentId(selectedStudent.id)}
                                            className="px-5 py-3.5 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-[11px] md:text-[12px] tracking-widest hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 border border-indigo-100 shrink-0"
                                        >
                                            <Eye size={16} /> View & Valuate Script
                                        </button>
                                    )}
                                </div>

                                {selectedSubmission?.cheatViolations?.length > 0 && (
                                    <div className="mb-6 flex flex-col gap-3 p-4 md:p-5 bg-red-50 rounded-2xl border border-red-200 shrink-0">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="text-red-500 mt-0.5" size={18} />
                                            <div>
                                                <h4 className="text-red-700 font-black text-xs md:text-sm uppercase tracking-widest leading-tight">Cheating Detected</h4>
                                                <p className="text-red-600/80 text-xs mt-0.5 font-bold">This student left the exam tab {selectedSubmission.cheatViolations.length} times.</p>
                                            </div>
                                        </div>
                                        <div className="mt-1 pl-7 flex gap-2 flex-wrap text-red-600/70 text-[10px] font-bold">
                                            {selectedSubmission.cheatViolations.map((stamp: string, i: number) => (
                                                <div key={i} className="px-2.5 py-0.5 bg-red-100/50 rounded-full border border-red-200/50">
                                                    {new Date(stamp).toLocaleTimeString()}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {exam.type === 'offline' ? (
                                    <>
                                        <div className="flex-1 space-y-6 md:space-y-8">
                                            <div className="space-y-3 md:space-y-4">
                                                <label className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-widest">Marks Awarded</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={exam.maxMark}
                                                        placeholder="0"
                                                        value={gradingState[selectedStudent.id]?.marks ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value === '' ? '' : Number(e.target.value);
                                                            setGradingState(prev => ({
                                                                ...prev,
                                                                [selectedStudent.id]: {
                                                                    marks: val,
                                                                    feedback: prev[selectedStudent.id]?.feedback ?? ''
                                                                }
                                                            }));
                                                        }}
                                                        className="w-28 md:w-32 bg-gray-50 border-2 border-gray-200 focus:border-[#c2f575] focus:bg-white rounded-2xl px-5 py-3 md:py-4 text-2xl md:text-3xl font-black text-nunma-forest outline-none transition-all"
                                                    />
                                                    <span className="text-xl md:text-2xl font-black text-gray-300">/ {exam.maxMark}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3 md:space-y-4">
                                                <label className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-widest">Tutor Feedback</label>
                                                <textarea
                                                    placeholder="Great job! You demonstrated clear understanding..."
                                                    value={gradingState[selectedStudent.id]?.feedback ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setGradingState(prev => ({
                                                            ...prev,
                                                            [selectedStudent.id]: {
                                                                marks: prev[selectedStudent.id]?.marks ?? '',
                                                                feedback: val
                                                            }
                                                        }));
                                                    }}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#c2f575] focus:bg-white rounded-2xl px-5 md:px-6 py-4 md:py-5 text-sm font-bold text-nunma-forest outline-none resize-none h-36 md:h-40 custom-scrollbar transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 md:pt-6 mt-auto shrink-0">
                                            <button
                                                onClick={() => handleGradeSubmit(selectedStudent.id)}
                                                className="w-full py-4 md:py-5 bg-nunma-forest text-[#c2f575] rounded-2xl font-black uppercase text-[12px] md:text-[13px] tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                                            >
                                                <Check size={18} /> Save Score & Notify Student
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 space-y-6 md:space-y-8">
                                        <div className="space-y-3 md:space-y-4">
                                            <label className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-widest">Marks Obtained</label>
                                            <div className="flex items-baseline gap-3 md:gap-4">
                                                <span className="text-4xl md:text-6xl font-black text-nunma-forest">
                                                    {selectedSubmission?.status === 'graded' || selectedSubmission?.marks !== undefined
                                                        ? selectedSubmission.marks 
                                                        : 'Pending'}
                                                </span>
                                                <span className="text-xl md:text-2xl font-black text-gray-300">/ {exam.maxMark}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 md:space-y-4">
                                            <label className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-widest">Feedback / Remarks</label>
                                            <div className="w-full bg-gray-50 rounded-2xl md:rounded-3xl px-5 md:px-6 py-4 md:py-5 text-sm font-bold text-nunma-forest min-h-[8rem] md:min-h-[10rem]">
                                                {selectedSubmission?.feedback || (
                                                    <span className="text-gray-400 italic">No feedback provided for this automated grading session.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>

                </div>
            </div>

            {viewingPdfUrl && (
                <PDFViewer url={viewingPdfUrl} onClose={() => setViewingPdfUrl(null)} />
            )}

            {valuatingStudentId && (
                <TutorGradingHub
                    zoneId={zoneId}
                    exam={exam}
                    studentId={valuatingStudentId}
                    studentName={students.find(s => s.id === valuatingStudentId)?.name || 'Unknown'}
                    submission={submissions.find(s => s.studentId === valuatingStudentId)}
                    onClose={() => setValuatingStudentId(null)}
                    onGraded={() => {
                        setValuatingStudentId(null);
                        alert("Valuation finalized constraints successfully synchronized.");
                    }}
                />
            )}
        </div>
    );
};

export default GradingHub;

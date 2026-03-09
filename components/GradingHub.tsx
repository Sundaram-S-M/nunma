import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { X, Check, Eye, AlertTriangle, Search, Upload, FileSpreadsheet } from 'lucide-react';
import PDFViewer from './PDFViewer';
import * as XLSX from 'xlsx';

interface GradingHubProps {
    zoneId: string;
    exam: any; // Using the Exam type loosely
    onClose: () => void;
}

const GradingHub: React.FC<GradingHubProps> = ({ zoneId, exam, onClose }) => {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(true);
    const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);
    const [gradingState, setGradingState] = useState<Record<string, { marks: number | '', feedback: string }>>({});

    // New States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            setGradingState(prev => {
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
                ...(submission ? {} : { answerSheetUrl: null })
            }, { merge: true });

            // Send Notification
            await setDoc(doc(collection(db, 'users', studentId, 'notifications')), {
                title: 'Exam Graded',
                message: `Your marks for ${exam.title} have been published! You scored ${state.marks}/${exam.maxMark}.`,
                createdAt: serverTimestamp(),
                read: false,
                type: 'exam_graded'
            });

            alert('Graded successfully!');
        } catch (e) {
            console.error('Failed to submit grade', e);
            alert('Failed to submit grade.');
        }
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !zoneId) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

            if (json.length < 2) {
                alert("Excel sheet appears empty or missing headers.");
                return;
            }

            const headers = json[0] as string[];
            const markIndex = headers.findIndex(h => typeof h === 'string' && ['mark', 'marks', 'score'].includes(h.toLowerCase()));
            const nameIndex = headers.findIndex(h => typeof h === 'string' && ['name', 'student', 'email'].includes(h.toLowerCase()));

            if (markIndex === -1) {
                alert("Could not find a 'Mark' or 'Score' column in the Excel sheet.");
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

                    await setDoc(doc(db, 'zones', zoneId, 'exams', exam.id, 'submissions', subId), {
                        studentId,
                        studentName: matchedStudent.name,
                        marks: markNum,
                        feedback: 'Bulk uploaded',
                        status: 'graded',
                        gradedAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    }, { merge: true });

                    // Update local state optimistic
                    setGradingState(prev => ({
                        ...prev,
                        [studentId]: { marks: markNum, feedback: 'Bulk uploaded' }
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
        } catch (error) {
            console.error("Error parsing Excel:", error);
            alert("Failed to parse Excel file. Please ensure it's a valid format.");
        }
    };

    const filteredStudents = students.filter(s =>
        (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedStudent = students.find(s => s.id === selectedStudentId);
    const selectedSubmission = submissions.find(s => s.studentId === selectedStudentId);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#040457]/90 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[4rem] w-full max-w-7xl shadow-3xl overflow-hidden p-8 max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-500 relative">

                {/* Header */}
                <div className="flex justify-between items-center mb-8 px-4">
                    <div>
                        <h3 className="text-4xl font-black text-[#040457] tracking-tight">{exam.title} <span className="text-gray-300">/ Grading</span></h3>
                        <p className="text-sm text-gray-400 mt-2 font-medium">Review submissions, enter marks manually, or bulk upload scores.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleExcelUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-4 bg-[#c2f575]/20 text-[#6ea812] border-2 border-[#c2f575] hover:bg-[#c2f575] hover:text-[#040457] rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"
                        >
                            <FileSpreadsheet size={18} /> Bulk Upload CSV
                        </button>
                        <button onClick={onClose} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Content: Left Student List + Right Grading Panel */}
                <div className="flex-1 overflow-hidden flex gap-6">

                    {/* Left Sidebar: Student List */}
                    <div className="w-1/3 flex flex-col bg-gray-50 rounded-[3rem] overflow-hidden border border-gray-100 relative">
                        <div className="p-6 border-b border-gray-200/50 bg-white/50 sticky top-0 backdrop-blur-md z-10 flex flex-col gap-4">
                            <h4 className="font-black text-[#040457] text-lg">Enrolled Students</h4>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border-2 border-transparent focus:border-[#c2f575] rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-[#040457] outline-none transition-colors shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
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
                                            onClick={() => setSelectedStudentId(student.id)}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2 text-left ${isSelected ? 'bg-white border-[#c2f575] shadow-sm scale-[1.02]' : 'bg-transparent border-transparent hover:bg-white hover:shadow-sm'}`}
                                        >
                                            <div className="flex flex-col overflow-hidden">
                                                <span className={`font-bold truncate ${isSelected ? 'text-[#040457]' : 'text-gray-600'}`}>{student.name || student.email}</span>
                                                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1">
                                                    {sub?.answerSheetUrl ? 'Script Uploaded' : 'No Script'}
                                                </span>
                                            </div>
                                            {isGraded ? (
                                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                                    <Check size={14} className="text-green-600" />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
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
                    <div className="w-2/3 flex flex-col bg-white rounded-[3rem] overflow-hidden border border-gray-100 p-8 shadow-sm relative">
                        {loadingSubmissions ? (
                            <div className="flex items-center justify-center h-full text-gray-400 font-bold">Loading...</div>
                        ) : !selectedStudent ? (
                            <div className="flex items-center justify-center h-full text-gray-400 font-bold text-lg">Select a student from the list to grade.</div>
                        ) : (
                            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">

                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                                    <div>
                                        <h2 className="text-3xl font-black text-[#040457]">{selectedStudent.name || selectedStudent.email}</h2>
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${selectedSubmission?.status === 'graded' || gradingState[selectedStudent.id]?.marks !== '' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                {selectedSubmission?.status === 'graded' || gradingState[selectedStudent.id]?.marks !== '' ? 'Graded' : 'Pending Review'}
                                            </span>
                                            {selectedSubmission?.completedAt && (
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Submitted: {new Date(selectedSubmission.completedAt).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {selectedSubmission?.answerSheetUrl && (
                                        <button
                                            onClick={() => setViewingPdfUrl(selectedSubmission.answerSheetUrl)}
                                            className="px-6 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-[12px] tracking-widest hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-100"
                                        >
                                            <Eye size={18} /> View Script
                                        </button>
                                    )}
                                </div>

                                {selectedSubmission?.cheatViolations > 0 && (
                                    <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                                        <AlertTriangle className="text-red-500 mt-1" size={20} />
                                        <div>
                                            <h4 className="text-red-700 font-black text-sm uppercase tracking-widest">Potential Cheating Detected</h4>
                                            <p className="text-red-600/80 text-xs mt-1 font-bold">This student left the exam tab {selectedSubmission.cheatViolations} times during the test.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex-1 space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Marks Awarded</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                min="0"
                                                max={exam.maxMark}
                                                placeholder="0"
                                                value={gradingState[selectedStudent.id]?.marks ?? ''}
                                                onChange={e => setGradingState(prev => ({
                                                    ...prev,
                                                    [selectedStudent.id]: { ...prev[selectedStudent.id], marks: e.target.value }
                                                }))}
                                                className="w-32 bg-gray-50 border-2 border-gray-200 focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-4 text-3xl font-black text-[#040457] outline-none transition-all"
                                            />
                                            <span className="text-2xl font-black text-gray-300">/ {exam.maxMark}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Tutor Feedback</label>
                                        <textarea
                                            placeholder="Great job! You demonstrated clear understanding..."
                                            value={gradingState[selectedStudent.id]?.feedback ?? ''}
                                            onChange={e => setGradingState(prev => ({
                                                ...prev,
                                                [selectedStudent.id]: { ...prev[selectedStudent.id], feedback: e.target.value }
                                            }))}
                                            className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-5 text-sm font-bold text-[#040457] outline-none resize-none h-40 custom-scrollbar transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 mt-auto">
                                    <button
                                        onClick={() => handleGradeSubmit(selectedStudent.id)}
                                        className="w-full py-5 bg-[#040457] text-[#c2f575] rounded-2xl font-black uppercase text-[13px] tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Check size={20} /> Save Score & Notify Student
                                    </button>
                                </div>

                            </div>
                        )}
                    </div>

                </div>
            </div>

            {viewingPdfUrl && (
                <PDFViewer url={viewingPdfUrl} onClose={() => setViewingPdfUrl(null)} />
            )}
        </div>
    );
};

export default GradingHub;

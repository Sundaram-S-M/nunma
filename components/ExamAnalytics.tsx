import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, where, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../utils/firebase';
import * as XLSX from 'xlsx';
import { Calendar, Download, Users, FileSpreadsheet, Search, Bot, Send, X, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ExamAnalyticsProps {
    zoneId: string;
}

const ExamAnalytics: React.FC<ExamAnalyticsProps> = ({ zoneId }) => {
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [examResults, setExamResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Bulk Export States
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isExporting, setIsExporting] = useState(false);

    // AI Chat States
    const [showAIChat, setShowAIChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatAnalyzing, setIsChatAnalyzing] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages, isChatAnalyzing]);

    useEffect(() => {
        if (!zoneId) return;
        const examQ = query(collection(db, 'zones', zoneId, 'exams'));
        const unsub = onSnapshot(examQ, snapshot => {
            setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, [zoneId]);

    useEffect(() => {
        if (!selectedExamId || !zoneId) return;
        setLoading(true);
        const subQ = query(collection(db, 'zones', zoneId, 'exams', selectedExamId, 'submissions'));
        const unsub = onSnapshot(subQ, snapshot => {
            setExamResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [selectedExamId, zoneId]);

    const handleDownloadSingleReport = () => {
        if (!selectedExamId || examResults.length === 0) return;
        const exam = exams.find(e => e.id === selectedExamId);

        const data = examResults.map(r => ({
            'Student Name': r.studentName || 'Unknown',
            'Marks Awarded': r.marks ?? 'Not Graded',
            'Total Marks': exam?.maxMark || '',
            'Status': r.status || 'Pending',
            'Feedback': r.feedback || '',
            'Submitted At': r.completedAt ? new Date(r.completedAt).toLocaleString() : ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Exam Report");
        XLSX.writeFile(wb, `${exam?.title || 'Exam'}_Report.xlsx`);
    };

    const handleBulkExport = async () => {
        if (!zoneId) return;
        setIsExporting(true);
        try {
            // Find exams within range
            const filteredExams = exams.filter(e => {
                const examDate = new Date(e.date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                return examDate >= start && examDate <= end;
            });

            if (filteredExams.length === 0) {
                alert('No exams found within this date range.');
                setIsExporting(false);
                return;
            }

            // Fetch students to ensure we have a master list
            const studentsSnap = await getDocs(collection(db, 'zones', zoneId, 'students'));
            const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

            // Fetch submissions for all filtered exams
            const allSubmissions: Record<string, any[]> = {};
            for (const exam of filteredExams) {
                const subSnap = await getDocs(collection(db, 'zones', zoneId, 'exams', exam.id, 'submissions'));
                allSubmissions[exam.id] = subSnap.docs.map(d => d.data());
            }

            // Build data matrix
            // Columns: Student Name, Email, [Exam 1 (Date)], [Exam 2 (Date)]...
            const data = students.map(student => {
                const row: any = {
                    'Student Name': student.name || 'Unknown',
                    'Email': student.email || ''
                };

                filteredExams.forEach(exam => {
                    const colName = `${exam.title} (${exam.date})`;
                    const sub = allSubmissions[exam.id]?.find(s => s.studentId === student.id);
                    row[colName] = sub?.marks ?? 'Absent/Not Graded';
                });

                return row;
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Bulk Export");
            XLSX.writeFile(wb, `Bulk_Exam_Export_${startDate}_to_${endDate}.xlsx`);

        } catch (error) {
            console.error("Failed to bulk export", error);
            alert("Failed to export.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleChatSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim() || isChatAnalyzing) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsChatAnalyzing(true);

        try {
            const askAI = httpsCallable(functions, 'askZoneAnalytics');
            const result = await askAI({ zoneId, userMessage: userMsg });
            const data = result.data as any;
            
            setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (err: any) {
            console.error("AI Analysis failed:", err);
            setChatMessages(prev => [...prev, { role: 'assistant', content: "Failed to process analytics. Please refer to console logs or ensure the back-end is online." }]);
        } finally {
            setIsChatAnalyzing(false);
        }
    };

    const selectedExam = exams.find(e => e.id === selectedExamId);

    return (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto py-8 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {/* Single Exam Report Card */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                        <Users size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-[#040457] mb-2">Single Exam View</h3>
                    <p className="text-sm text-gray-400 mb-8 font-medium">Select an exam to view detailed results and download a specific report.</p>

                    <div className="w-full relative mb-6">
                        <select
                            value={selectedExamId || ''}
                            onChange={(e) => setSelectedExamId(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-400 rounded-2xl px-6 py-4 text-sm font-bold text-[#040457] appearance-none outline-none"
                        >
                            <option value="" disabled>Select an exam</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                        </select>
                    </div>

                    {selectedExamId && (
                        <div className="w-full bg-gray-50 rounded-2xl p-6 mb-6">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 text-left">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Max Marks</p>
                                    <p className="text-2xl font-black text-[#040457] truncate w-24">{selectedExam?.maxMark}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Attendance</p>
                                    <p className="text-2xl font-black text-[#c2f575] bg-[#040457] px-4 py-1 rounded-xl inline-block mt-1">
                                        {loading ? '...' : examResults.length}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDownloadSingleReport}
                                disabled={examResults.length === 0}
                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[12px] tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                            >
                                <Download size={18} /> Download Single Report
                            </button>
                        </div>
                    )}
                </div>

                {/* Bulk Export Card */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-3xl bg-[#c2f575]/20 text-[#6ea812] flex items-center justify-center mb-6">
                        <FileSpreadsheet size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-[#040457] mb-2">Bulk Date Range Export</h3>
                    <p className="text-sm text-gray-400 mb-8 font-medium">Download aggregated performance metrics across multiple exams in a given timeframe.</p>

                    <div className="w-full grid grid-cols-2 gap-4 mb-6">
                        <div className="relative text-left">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full mt-1 bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-xl px-4 py-3 text-sm font-bold text-[#040457] outline-none"
                            />
                        </div>
                        <div className="relative text-left">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full mt-1 bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-xl px-4 py-3 text-sm font-bold text-[#040457] outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleBulkExport}
                        disabled={isExporting}
                        className="w-full mt-auto py-5 bg-[#040457] text-[#c2f575] rounded-xl font-black uppercase text-[12px] tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:active:scale-100"
                    >
                        {isExporting ? 'Generating...' : <><Calendar size={18} /> Extract Bulk Report</>}
                    </button>
                </div>
            </div>

            {/* Preview Table for Single Exam */}
            {selectedExamId && !loading && examResults.length > 0 && (
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h4 className="text-xl font-black text-[#040457] mb-6">Score Preview</h4>
                    <div className="overflow-hidden rounded-2xl border border-gray-100">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Marks</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {examResults.slice(0, 10).map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-[#040457] text-sm">{r.studentName || 'Unknown Student'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-black text-lg text-indigo-600">{r.marks ?? '-'}</span>
                                            <span className="text-xs text-gray-400 font-bold ml-1">/ {selectedExam?.maxMark}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${r.status === 'graded' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                {r.status || 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {examResults.length > 10 && (
                            <div className="bg-gray-50 p-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                And {examResults.length - 10} more... (Download report to view all)
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Action Button for AI Chat */}
            <button
                onClick={() => setShowAIChat(true)}
                className="fixed bottom-10 right-10 w-20 h-20 bg-[#040457] text-[#c2f575] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
            >
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-bounce">AI</div>
                <Bot className="group-hover:rotate-12 transition-transform" size={40} />
            </button>

            {/* Full-Screen AI Chat Modal */}
            {showAIChat && (
                <div className="fixed inset-0 z-[100] bg-[#040457] flex flex-col animate-in fade-in zoom-in duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between p-8 border-b border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-[#c2f575] rounded-3xl flex items-center justify-center text-[#040457]">
                                <Sparkles size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white">AI Analyst</h2>
                                <p className="text-white/40 font-bold text-sm uppercase tracking-widest">Zone Contextual Intelligence</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowAIChat(false)}
                            className="w-16 h-16 bg-white/10 text-white rounded-3xl flex items-center justify-center hover:bg-white/20 transition-all"
                        >
                            <X size={32} />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
                        {chatMessages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
                                <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-white/20">
                                    <MessageSquare size={48} />
                                </div>
                                <h3 className="text-3xl font-black text-white">Ask me anything about your Zone</h3>
                                <p className="text-white/40 font-medium">I have context on up to 500 students and the latest 5 exams. I can find performance trends, point out anomalies, or identify struggling students.</p>
                                <div className="grid grid-cols-2 gap-4 w-full pt-6">
                                    {["Who are the top performers?", "Any cheat violations?", "Avg marks per exam?", "Identify struggling students"].map(hint => (
                                        <button 
                                            key={hint}
                                            onClick={() => {
                                                setChatInput(hint);
                                            }}
                                            className="bg-white/5 border border-white/10 p-4 rounded-2xl text-white/60 text-sm font-bold hover:bg-white/10 hover:text-white transition-all text-left"
                                        >
                                            {hint}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`max-w-4xl p-8 rounded-[2rem] ${msg.role === 'user' ? 'bg-[#c2f575] text-[#040457] rounded-tr-none' : 'bg-white/5 text-white border border-white/10 rounded-tl-none'}`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="prose prose-invert max-w-none prose-p:font-medium prose-li:font-medium prose-li:my-1">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="font-black text-xl leading-snug">{msg.content}</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isChatAnalyzing && (
                            <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] rounded-tl-none flex items-center gap-6">
                                    <Loader2 className="text-[#c2f575] animate-spin" size={32} />
                                    <div>
                                        <p className="text-white font-black text-xl">AI is analyzing 500 records...</p>
                                        <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-1">Cross-referencing exam results & student behavior</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-8 bg-black/20">
                        <form onSubmit={handleChatSubmit} className="max-w-4xl mx-auto relative">
                            <input 
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type your query (e.g. List all students who failed the last exam)..."
                                className="w-full bg-white/5 border-2 border-white/10 focus:border-[#c2f575] rounded-full px-10 py-8 text-white font-bold text-xl outline-none transition-all placeholder:text-white/20 pr-24"
                                disabled={isChatAnalyzing}
                            />
                            <button 
                                type="submit"
                                disabled={!chatInput.trim() || isChatAnalyzing}
                                className="absolute right-4 top-4 bottom-4 px-8 bg-[#c2f575] text-[#040457] rounded-full font-black uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
                            >
                                {isChatAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamAnalytics;

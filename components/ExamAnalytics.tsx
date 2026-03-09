import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import * as XLSX from 'xlsx';
import { Calendar, Download, Users, FileSpreadsheet, Search } from 'lucide-react';

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

    const selectedExam = exams.find(e => e.id === selectedExamId);

    return (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto py-8">
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
        </div>
    );
};

export default ExamAnalytics;

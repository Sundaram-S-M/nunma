import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { X, Trophy, TrendingDown, TrendingUp, Award, Download, Users, BarChart3, Medal, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';

interface ExamInsightsProps {
  zoneId: string;
  exam: any;
  onClose: () => void;
  /** If true, only show rank list — used for student view */
  studentView?: boolean;
  currentStudentId?: string;
}

const ExamInsights: React.FC<ExamInsightsProps> = ({ zoneId, exam, onClose, studentView = false, currentStudentId }) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, 'zones', zoneId, 'exams', exam.id, 'submissions'));
        const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSubmissions(subs);
      } catch (err) {
        console.error('Failed to fetch submissions for insights', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [zoneId, exam.id]);

  // Only include graded submissions (with numeric marks)
  const gradedSubmissions = useMemo(() =>
    submissions.filter(s => typeof s.marks === 'number' && s.marks >= 0),
    [submissions]
  );

  const stats = useMemo(() => {
    if (gradedSubmissions.length === 0) return null;
    const marks = gradedSubmissions.map(s => s.marks as number);
    const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
    const highest = Math.max(...marks);
    const lowest = Math.min(...marks);
    const passCount = marks.filter(m => m >= (exam.minMark || 0)).length;
    const passRate = (passCount / marks.length) * 100;
    return { avg: Math.round(avg * 10) / 10, highest, lowest, passRate: Math.round(passRate), passCount, failCount: marks.length - passCount };
  }, [gradedSubmissions, exam.minMark]);

  const rankedStudents = useMemo(() => {
    return [...gradedSubmissions]
      .sort((a, b) => (b.marks as number) - (a.marks as number))
      .map((s, i) => ({ ...s, rank: i + 1 }));
  }, [gradedSubmissions]);

  const failedStudents = useMemo(() =>
    rankedStudents.filter(s => (s.marks as number) < (exam.minMark || 0)),
    [rankedStudents, exam.minMark]
  );

  const distributionData = useMemo(() => {
    if (gradedSubmissions.length === 0) return [];
    const max = exam.maxMark || 100;
    const brackets = [
      { range: `0-${Math.round(max * 0.25)}`, min: 0, max: max * 0.25, count: 0, color: '#ef4444' },
      { range: `${Math.round(max * 0.25) + 1}-${Math.round(max * 0.5)}`, min: max * 0.25 + 1, max: max * 0.5, count: 0, color: '#f59e0b' },
      { range: `${Math.round(max * 0.5) + 1}-${Math.round(max * 0.75)}`, min: max * 0.5 + 1, max: max * 0.75, count: 0, color: '#3b82f6' },
      { range: `${Math.round(max * 0.75) + 1}-${max}`, min: max * 0.75 + 1, max: max, count: 0, color: '#10b981' },
    ];
    gradedSubmissions.forEach(s => {
      const m = s.marks as number;
      for (const b of brackets) {
        if (m >= b.min && m <= b.max) { b.count++; break; }
      }
    });
    return brackets;
  }, [gradedSubmissions, exam.maxMark]);

  const handleExportExcel = () => {
    const data = rankedStudents.map(s => ({
      'Rank': s.rank,
      'Student Name': s.studentName || 'Unknown',
      'Marks': s.marks,
      'Max Marks': exam.maxMark,
      'Status': (s.marks as number) >= (exam.minMark || 0) ? 'Passed' : 'Failed',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rank List');
    XLSX.writeFile(wb, `${exam.title || 'Exam'}_Rank_List.xlsx`);
  };

  const currentStudentRank = currentStudentId
    ? rankedStudents.find(s => s.id === currentStudentId || s.studentId === currentStudentId)
    : null;

  const getRankMedal = (rank: number) => {
    if (rank === 1) return <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200"><Trophy size={20} /></div>;
    if (rank === 2) return <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white shadow-lg shadow-gray-200"><Medal size={20} /></div>;
    if (rank === 3) return <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-200"><Medal size={20} /></div>;
    return <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-black text-sm">{rank}</div>;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-20 h-20 rounded-3xl bg-nunma-forest/10 flex items-center justify-center"><BarChart3 size={40} className="text-nunma-forest" /></div>
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading Insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-gray-50 flex flex-col animate-in fade-in duration-300 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-8 md:px-12 pt-8 pb-4">
        <div className="flex items-center gap-5">
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:bg-nunma-forest hover:text-white transition-all hover:scale-105 active:scale-95">
            <X size={24} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-nunma-forest tracking-tight">{exam.title}</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              {exam.subject ? `${exam.subject} · ` : ''}{exam.date} · {gradedSubmissions.length} graded
            </p>
          </div>
        </div>
        {!studentView && (
          <button onClick={handleExportExcel} className="hidden md:flex items-center gap-3 px-6 py-3 bg-nunma-forest text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
            <Download size={16} /> Export Rank List
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 md:px-12 pb-12">
        {gradedSubmissions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <div className="w-24 h-24 rounded-[2rem] bg-gray-100 flex items-center justify-center text-gray-300"><Users size={48} /></div>
            <h3 className="text-2xl font-black text-gray-300">No Graded Submissions Yet</h3>
            <p className="text-sm text-gray-400 font-medium max-w-md">Once submissions are graded, the rank list, statistics, and score distribution will appear here.</p>
          </div>
        ) : (
          <>
            {/* Student's own rank banner */}
            {studentView && currentStudentRank && (
              <div className="mb-6 bg-gradient-to-r from-nunma-forest to-[#0a5c2a] rounded-[2rem] p-6 md:p-8 flex items-center gap-6 text-white shadow-2xl animate-in slide-in-from-top-4 duration-500">
                <div className="w-16 h-16 rounded-2xl bg-[#c2f575] text-nunma-forest flex items-center justify-center font-black text-2xl shadow-lg">
                  #{currentStudentRank.rank}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Your Rank</p>
                  <p className="text-2xl font-black">
                    {currentStudentRank.marks} <span className="text-sm font-bold text-white/60">/ {exam.maxMark}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Out Of</p>
                  <p className="text-2xl font-black">{rankedStudents.length} students</p>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            {stats && !studentView && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><BarChart3 size={20} /></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Average</p>
                  </div>
                  <p className="text-3xl font-black text-nunma-forest">{stats.avg}<span className="text-sm text-gray-400 font-bold ml-1">/ {exam.maxMark}</span></p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center"><TrendingUp size={20} /></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Highest</p>
                  </div>
                  <p className="text-3xl font-black text-green-600">{stats.highest}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"><TrendingDown size={20} /></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lowest</p>
                  </div>
                  <p className="text-3xl font-black text-red-500">{stats.lowest}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#c2f575]/20 text-[#6ea812] flex items-center justify-center"><Award size={20} /></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pass Rate</p>
                  </div>
                  <p className="text-3xl font-black text-nunma-forest">{stats.passRate}%</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">{stats.passCount} passed · {stats.failCount} failed</p>
                </div>
              </div>
            )}

            {/* Stats row for student view */}
            {stats && studentView && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Average</p>
                  <p className="text-xl font-black text-nunma-forest">{stats.avg}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Highest</p>
                  <p className="text-xl font-black text-green-600">{stats.highest}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pass Rate</p>
                  <p className="text-xl font-black text-nunma-forest">{stats.passRate}%</p>
                </div>
              </div>
            )}

            {/* Main Content: Rank List + Chart/Failed */}
            <div className={`grid ${studentView ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-5'} gap-8`}>
              {/* Rank List */}
              <div className={`${studentView ? '' : 'lg:col-span-3'} bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden`}>
                <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-black text-nunma-forest flex items-center gap-3">
                    <Trophy size={20} className="text-amber-500" /> Rank List
                  </h3>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{rankedStudents.length} students</span>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  {rankedStudents.map(student => {
                    const isPassed = (student.marks as number) >= (exam.minMark || 0);
                    const isCurrentStudent = currentStudentId && (student.id === currentStudentId || student.studentId === currentStudentId);
                    return (
                      <div
                        key={student.id}
                        className={`flex items-center gap-4 px-8 py-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isCurrentStudent ? 'bg-[#c2f575]/10 border-l-4 border-l-[#c2f575]' : ''}`}
                      >
                        {getRankMedal(student.rank)}
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${isCurrentStudent ? 'text-nunma-forest' : 'text-gray-700'}`}>
                            {student.studentName || 'Unknown'}
                            {isCurrentStudent && <span className="ml-2 text-[10px] font-black text-[#6ea812] uppercase tracking-widest">(You)</span>}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className="font-black text-lg text-nunma-forest">{student.marks}</span>
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isPassed ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                            {isPassed ? 'Pass' : 'Fail'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart + Failed Panel — tutor only */}
              {!studentView && (
                <div className="lg:col-span-2 flex flex-col gap-8">
                  {/* Score Distribution Chart */}
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-black text-nunma-forest mb-6 flex items-center gap-2">
                      <BarChart3 size={16} className="text-blue-500" /> Score Distribution
                    </h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distributionData} barSize={36}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="range" tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                          <Tooltip
                            contentStyle={{ borderRadius: 16, border: '1px solid #e5e7eb', fontWeight: 700, fontSize: 12 }}
                            formatter={(value: any) => [`${value} students`, 'Count']}
                          />
                          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                            {distributionData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Failed Students */}
                  {failedStudents.length > 0 && (
                    <div className="bg-white rounded-[2rem] border border-red-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 bg-red-50/50 border-b border-red-100 flex items-center gap-3">
                        <AlertTriangle size={16} className="text-red-500" />
                        <h3 className="text-sm font-black text-red-600">Failed Students ({failedStudents.length})</h3>
                      </div>
                      <div className="max-h-[250px] overflow-y-auto">
                        {failedStudents.map(student => (
                          <div key={student.id} className="flex items-center justify-between px-6 py-3 border-b border-red-50 last:border-0">
                            <p className="font-bold text-sm text-gray-700 truncate">{student.studentName || 'Unknown'}</p>
                            <div className="text-right">
                              <span className="font-black text-red-500">{student.marks}</span>
                              <span className="text-[10px] text-gray-400 ml-1">/ {exam.maxMark}</span>
                              <span className="text-[10px] text-red-400 ml-2">(deficit: {(exam.minMark || 0) - (student.marks as number)})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExamInsights;

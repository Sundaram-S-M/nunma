import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, TrendingUp, IndianRupee, Percent, Target, 
  Flag, ArrowLeft, Loader2, BarChart3, PieChart as PieChartIcon, 
  Search, ShieldAlert, GraduationCap, TrendingDown, Clock, Sparkles
} from 'lucide-react';
import { db } from '../utils/firebase';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const COLORS = ['#052E16', '#c2f575', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

const AnalyticsDashboard: React.FC = () => {
  const { zoneId } = useParams<{ zoneId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [zone, setZone] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (!db || !zoneId) {
          setError('Database not initialized');
          setLoading(false);
          return;
        }
        // 1. Fetch Zone Details
        const zoneDoc = await getDoc(doc(db, 'zones', zoneId));
        if (!zoneDoc.exists()) {
          setError('Zone not found');
          setLoading(false);
          return;
        }
        
        const zoneData: any = { id: zoneDoc.id, ...zoneDoc.data() };
        
        // Auth check - user must be creator or tutor
        if (zoneData.createdBy !== user?.uid && zoneData.tutorId !== user?.uid) {
           navigate('/dashboard');
           return;
        }
        
        setZone(zoneData);

        // 2. Parallel Fetch: Students, Orders, Exams
        const [studentsSnap, ordersSnap, examsSnap] = await Promise.all([
          getDocs(collection(db, 'zones', zoneId, 'students')),
          getDocs(query(collection(db, 'zones', zoneId, 'orders'), where('status', '==', 'CAPTURED'))),
          getDocs(collection(db, 'zones', zoneId, 'exams'))
        ]);

        const studentData = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const orderData = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const examData = examsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setStudents(studentData);
        setOrders(orderData);
        setExams(examData);

        // 3. Fetch Submissions for each Exam in parallel
        const submissionPromises = examData.map(exam => 
          getDocs(collection(db, 'zones', zoneId, 'exams', exam.id, 'submissions'))
        );
        const submissionSnaps = await Promise.all(submissionPromises);
        
        const subData: any[] = [];
        submissionSnaps.forEach((snap, idx) => {
          const examId = examData[idx].id;
          snap.forEach(d => {
            subData.push({ id: d.id, examId, ...d.data() });
          });
        });
        
        setAllSubmissions(subData);
        setLoading(false);
      } catch (err) {
        console.error('Analytics Fetch Error:', err);
        setError('Failed to fetch analytics data');
        setLoading(false);
      }
    };

    fetchData();
  }, [zoneId, user, isAuthenticated]);

  if (loading) {
     return (
       <div className="analytics-loading">
         <Loader2 className="spinner" size={48} />
         <p>Crunching numbers...</p>
         <style>{`
           .analytics-loading {
              height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 1.5rem;
              background: #fbfbfb;
              color: #052E16;
              font-weight: 800;
              font-family: Inter, sans-serif;
           }
           .spinner {
              animation: spin 1s linear infinite;
              color: #c2f575;
           }
           @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
           }
         `}</style>
       </div>
     );
  }

  if (error) {
     return (
       <div className="analytics-error">
         <h2>{error}</h2>
         <Link to="/workplace" className="back-link">Back to Workplace</Link>
         <style>{`
           .analytics-error {
              height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 1rem;
              background: #fbfbfb;
              font-family: Inter, sans-serif;
           }
           .back-link {
              padding: 0.75rem 1.5rem;
              background: #052E16;
              color: #fff;
              border-radius: 1rem;
              text-decoration: none;
              font-weight: bold;
           }
         `}</style>
       </div>
     );
  }

  // --- Calculations ---

  // Total Students
  const totalStudents = students.length;

  // Total Revenue (CAPTURED) - Divide by 100 if stored in paisa, but usually order.amount is in main currency or cents
  // Assuming captured amount is total in sub-units or main units.
  const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  // Platform Fees
  const platformFees = orders.reduce((sum, o) => {
    const fee = (o.amount || 0) * ( (o.commissionPct || 0) / 100 );
    return sum + fee;
  }, 0);

  // Average Exam Score
  const gradedSubs = allSubmissions.filter(s => s.status === 'GRADED');
  const avgExamScore = gradedSubs.length > 0 
    ? gradedSubs.reduce((sum, s) => sum + (s.percentageScore || 0), 0) / gradedSubs.length 
    : 0;

  // Flagged Submissions
  const flaggedCount = allSubmissions.filter(s => s.status === 'FLAGGED').length;

  // --- Chart Processing ---

  // 1. Enrollment Trends (Group by Week)
  const enrollmentTrends = () => {
     const weeks: Record<string, { count: number, timestamp: number }> = {};
     students.forEach(s => {
        let date;
        if (s.joinedAt?.seconds) date = new Date(s.joinedAt.seconds * 1000);
        else if (s.joinedAt) date = new Date(s.joinedAt);
        else date = new Date();
        
        const weekStart = new Date(date);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(date.getDate() - date.getDay());
        const key = formatDate(weekStart);
        
        if (!weeks[key]) {
           weeks[key] = { count: 0, timestamp: weekStart.getTime() };
        }
        weeks[key].count += 1;
     });
     
     return Object.keys(weeks)
       .map(key => ({ week: key, students: weeks[key].count, timestamp: weeks[key].timestamp }))
       .sort((a, b) => a.timestamp - b.timestamp);
  };

  // 2. Exam Scores Distribution
  const examScoreData = exams.map(exam => {
     const subs = allSubmissions.filter(s => s.examId === exam.id && s.status === 'GRADED');
     const avg = subs.length > 0 ? subs.reduce((sum, s) => sum + (s.percentageScore || 0), 0) / subs.length : 0;
     return { title: exam.title, avg: parseFloat(avg.toFixed(1)) };
  });

  // 3. Source Breakdown
  const sourceData = () => {
     const sources: Record<string, number> = { 'Payment': 0, 'Whitelist': 0 };
     students.forEach(s => {
        const source = (s.source === 'payment' || s.source === 'ORDER') ? 'Payment' : 'Whitelist';
        sources[source]++;
     });
     return Object.keys(sources).map(key => ({ name: key, value: sources[key] }));
  };

  // 4. Subject-Wise Performance Breakdown
  const subjectStats = () => {
    const subs: Record<string, { totalExams: number, totalScore: number, totalGraded: number, passCount: number }> = {};
    
    exams.forEach(exam => {
      const subject = exam.subject || 'Uncategorized';
      if (!subs[subject]) subs[subject] = { totalExams: 0, totalScore: 0, totalGraded: 0, passCount: 0 };
      
      const examSubs = allSubmissions.filter(s => s.examId === exam.id && s.status === 'GRADED');
      subs[subject].totalExams++;
      
      examSubs.forEach(s => {
        subs[subject].totalGraded++;
        subs[subject].totalScore += (s.percentageScore || 0);
        // Assuming pass is >= 35% if no specific data is available
        const isPass = s.status === 'passed' || (s.percentageScore !== undefined && s.percentageScore >= 35);
        if (isPass) subs[subject].passCount++;
      });
    });

    return Object.keys(subs).map(subject => {
      const data = subs[subject];
      const avg = data.totalGraded > 0 ? data.totalScore / data.totalGraded : 0;
      const passRate = data.totalGraded > 0 ? (data.passCount / data.totalGraded) * 100 : 0;
      return { subject, avg: parseFloat(avg.toFixed(1)), passRate: parseFloat(passRate.toFixed(1)), totalGraded: data.totalGraded };
    }).sort((a, b) => b.avg - a.avg);
  };

  // 5. At-Risk Student Roster (Failure Matrix)
  const getAtRiskStudents = () => {
    const studentFailures: Record<string, Set<string>> = {};
    
    exams.forEach(exam => {
      const subject = exam.subject || 'Uncategorized';
      const examSubs = allSubmissions.filter(s => s.examId === exam.id && s.status === 'GRADED');
      
      examSubs.forEach(s => {
        const isFail = s.status === 'failed' || (s.percentageScore !== undefined && s.percentageScore < 35);
        if (isFail) {
           if (!studentFailures[s.studentId]) studentFailures[s.studentId] = new Set();
           studentFailures[s.studentId].add(subject);
        }
      });
    });

    return Object.keys(studentFailures)
      .map(sid => {
        const student = students.find(s => s.id === sid);
        const failedSubjects = Array.from(studentFailures[sid]);
        return {
          id: sid,
          name: student?.name || 'Unknown Student',
          avatar: student?.avatar,
          email: student?.email,
          failureCount: failedSubjects.length,
          failedSubjects
        };
      })
      .filter(s => s.failureCount > 0)
      .sort((a, b) => b.failureCount - a.failureCount);
  };

  const subjectData = subjectStats();
  const atRiskStudents = getAtRiskStudents();

  // Failure Matrix Metrics
  const failureMatrix = {
    safe: totalStudents - atRiskStudents.length, // 0 failures
    mild: atRiskStudents.filter(s => s.failureCount === 1).length,
    moderate: atRiskStudents.filter(s => s.failureCount === 2).length,
    critical: atRiskStudents.filter(s => s.failureCount >= 3).length
  };

  const formatCurrency = (val: number) => val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <div className="analytics-container">
      <header className="analytics-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} />
        </button>
        <div className="header-text">
          <div className="flex items-center gap-4">
            <h1 className="flex items-center gap-4">{zone?.title} <span className="badge">Analytics</span></h1>
            <button 
              onClick={() => navigate(`/workplace/analytics/${zoneId}/chat`)}
              className="flex items-center gap-2 px-6 py-3 bg-nunma-forest text-[#c2f575] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-900/20"
            >
              <Sparkles size={14} /> Ask AI Analyst
            </button>
          </div>
          <p>Real-time performance metrics and student insights</p>
        </div>
      </header>

      {/* Metrics Row */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon students"><Users size={24} /></div>
          <div className="metric-content">
            <span className="metric-label">Total Students</span>
            <h3 className="metric-value">{totalStudents.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon revenue"><IndianRupee size={24} /></div>
          <div className="metric-content">
            <span className="metric-label">Total Revenue</span>
            <h3 className="metric-value">{formatCurrency(totalRevenue)}</h3>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon fees"><Percent size={24} /></div>
          <div className="metric-content">
            <span className="metric-label">Platform Fees</span>
            <h3 className="metric-value">{formatCurrency(platformFees)}</h3>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon score"><Target size={24} /></div>
          <div className="metric-content">
            <span className="metric-label">Avg. Exam Score</span>
            <h3 className="metric-value">{avgExamScore.toFixed(1)}%</h3>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon flagged"><Flag size={24} /></div>
          <div className="metric-content">
            <span className="metric-label">Flagged Submissions</span>
            <h3 className="metric-value">{flaggedCount.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="charts-grid">
        <div className="chart-wrapper line-chart">
          <div className="chart-header">
            <h3><TrendingUp size={18} /> Enrollment Trends</h3>
            <span className="chart-sub">Students joined by week</span>
          </div>
          <div className="chart-height">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentTrends()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}
                  cursor={{stroke: '#c2f575', strokeWidth: 2}}
                />
                <Line 
                  type="monotone" 
                  dataKey="students" 
                  stroke="#c2f575" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#c2f575', strokeWidth: 0 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-wrapper bar-chart">
          <div className="chart-header">
            <h3><BarChart3 size={18} /> Exam Performance</h3>
            <span className="chart-sub">Mean score distribution</span>
          </div>
          <div className="chart-height">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examScoreData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="title" axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 12}} />
                <Tooltip 
                   contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}
                   cursor={{fill: '#f0f0f0'}}
                />
                <Bar dataKey="avg" fill="#c2f575" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-wrapper pie-chart">
          <div className="chart-header">
            <h3><PieChartIcon size={18} /> Acquisition Channels</h3>
            <span className="chart-sub">Payment vs Whitelist</span>
          </div>
          <div className="chart-height">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {sourceData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '1rem', border: 'none'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Advanced Academic Reports */}
      <section className="reports-section">
        <h2 className="section-title"><GraduationCap size={24} /> Subject-Wise Performance & Failure Matrix</h2>
        <p className="section-subtitle">Identify struggling students and optimize subject-level instruction</p>
        
        <div className="reports-grid">
          {/* Subject Performance */}
          <div className="report-card subject-performance">
            <h3>Subject Breakdown</h3>
            <div className="subject-list">
              {subjectData.length > 0 ? subjectData.map((sub, idx) => (
                <div key={idx} className="subject-item">
                  <div className="subject-info">
                    <span className="subject-name">{sub.subject}</span>
                    <span className="subject-meta">{sub.totalGraded} submissions graded</span>
                  </div>
                  <div className="subject-stats">
                    <div className="stat-pill">
                      <span className="stat-val">{sub.avg}%</span>
                      <span className="stat-lbl">Avg Score</span>
                    </div>
                    <div className={`stat-pill ${sub.passRate >= 80 ? 'good' : sub.passRate >= 50 ? 'warning' : 'danger'}`}>
                      <span className="stat-val">{sub.passRate}%</span>
                      <span className="stat-lbl">Pass Rate</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="empty-state">No subject grading data yet.</div>
              )}
            </div>
          </div>

          {/* Failure Matrix summary */}
          <div className="report-card failure-matrix">
            <h3>Failure Matrix (Student Count)</h3>
            <div className="matrix-grid">
              <div className="matrix-cell safe">
                <div className="matrix-val">{failureMatrix.safe}</div>
                <div className="matrix-lbl">0 Subjects Failed<br/>(Safe)</div>
              </div>
              <div className="matrix-cell mild">
                <div className="matrix-val">{failureMatrix.mild}</div>
                <div className="matrix-lbl">1 Subject Failed<br/>(Mild Risk)</div>
              </div>
              <div className="matrix-cell moderate">
                <div className="matrix-val">{failureMatrix.moderate}</div>
                <div className="matrix-lbl">2 Subjects Failed<br/>(Moderate Risk)</div>
              </div>
              <div className="matrix-cell critical">
                <div className="matrix-val">{failureMatrix.critical}</div>
                <div className="matrix-lbl">3+ Subjects Failed<br/>(Critical Risk)</div>
              </div>
            </div>
          </div>

          {/* At-Risk Roster */}
          <div className="report-card at-risk-roster">
            <h3>At-Risk Student Roster</h3>
            <div className="roster-list">
              {atRiskStudents.length > 0 ? atRiskStudents.map((student) => (
                <div key={student.id} className="roster-item">
                  <div className="roster-user">
                    <img src={student.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`} alt="" />
                    <div>
                      <p className="roster-name">{student.name}</p>
                      <p className="roster-failed-count">Failed in {student.failureCount} {student.failureCount === 1 ? 'subject' : 'subjects'}</p>
                    </div>
                  </div>
                  <div className="roster-subjects">
                    {student.failedSubjects.map(sub => (
                      <span key={sub} className="failed-sub-tag">{sub}</span>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="empty-state">No at-risk students found!</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Empty State */}
      {totalStudents === 0 && !loading && (
        <div className="analytics-empty">
          <div className="empty-icon"><ShieldAlert size={48} /></div>
          <h3>Gathering Data...</h3>
          <p>Once students start enrolling and taking exams, your analytics will appear here.</p>
        </div>
      )}

      <style>{`
        .analytics-container {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
          color: #052E16;
          font-family: Inter, system-ui, sans-serif;
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .analytics-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 3.5rem;
          padding-top: 1rem;
        }

        .back-btn {
          width: 48px;
          height: 48px;
          border-radius: 1.25rem;
          background: #fff;
          border: 1.5px solid #eee;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #052E16;
        }

        .back-btn:hover {
          background: #f8f8f8;
          transform: translateX(-5px);
          border-color: #052E16;
        }

        .header-text h1 {
          font-size: 2.5rem;
          font-weight: 950;
          letter-spacing: -0.05em;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 1rem;
          color: #052E16;
        }

        .badge {
          font-size: 0.7rem;
          background: #c2f575;
          color: #052E16;
          padding: 0.5rem 1.25rem;
          border-radius: 2rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-weight: 900;
        }

        .header-text p {
          color: #666;
          font-weight: 600;
          margin: 0.4rem 0 0;
          font-size: 1.1rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3.5rem;
        }

        .metric-card {
          background: #fff;
          padding: 2rem;
          border-radius: 2.5rem;
          border: 1px solid #eee;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .metric-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 25px 50px rgba(0,0,0,0.08);
          border-color: #c2f575;
        }

        .metric-icon {
          width: 56px;
          height: 56px;
          border-radius: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .metric-icon.students { background: #eff6ff; color: #2563eb; }
        .metric-icon.revenue { background: #ecfdf5; color: #059669; }
        .metric-icon.fees { background: #fef2f2; color: #dc2626; }
        .metric-icon.score { background: #fdf4ff; color: #a21caf; }
        .metric-icon.flagged { background: #fffaeb; color: #d97706; }

        .metric-content .metric-label {
          display: block;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 800;
          color: #888;
          margin-bottom: 0.4rem;
        }

        .metric-content .metric-value {
          margin: 0;
          font-size: 1.8rem;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .chart-wrapper {
          background: #fff;
          border-radius: 3rem;
          padding: 3rem;
          border: 1px solid #eee;
          min-height: 480px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          transition: all 0.4s ease;
        }

        .chart-wrapper:hover {
           box-shadow: 0 20px 60px rgba(0,0,0,0.05);
        }

        .chart-wrapper.pie-chart {
           grid-column: span 2;
        }

        .chart-header {
           margin-bottom: 2.5rem;
        }

        .chart-header h3 {
           margin: 0;
           font-size: 1.4rem;
           font-weight: 900;
           display: flex;
           align-items: center;
           gap: 1rem;
           color: #052E16;
           letter-spacing: -0.02em;
        }

        .chart-sub {
           font-size: 0.95rem;
           color: #888;
           font-weight: 600;
           margin-top: 0.25rem;
           display: block;
        }

        .chart-height {
           height: 320px;
        }

        .analytics-empty {
          text-align: center;
          padding: 6rem 3rem;
          background: #fdfdfd;
          border-radius: 3.5rem;
          border: 2px dashed #eee;
          margin-top: 2rem;
        }

        .empty-icon {
           color: #eee;
           margin-bottom: 2rem;
        }

        .analytics-empty h3 {
          font-size: 1.75rem;
          font-weight: 900;
          margin-bottom: 0.75rem;
        }

        .analytics-empty p {
          color: #888;
          max-width: 450px;
          margin: 0 auto;
          font-size: 1.1rem;
          line-height: 1.6;
        }

        .reports-section {
          margin-top: 4rem;
        }

        .section-title {
          font-size: 2rem;
          font-weight: 950;
          color: #052E16;
          margin: 0 0 0.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          letter-spacing: -0.03em;
        }

        .section-subtitle {
          color: #666;
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 2rem;
        }

        .reports-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .report-card {
          background: #fff;
          border-radius: 2.5rem;
          padding: 2.5rem;
          border: 1px solid #eee;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
        }
        
        .report-card.at-risk-roster {
          grid-column: span 2;
        }

        .report-card h3 {
          font-size: 1.25rem;
          font-weight: 900;
          margin: 0 0 1.5rem;
          color: #052E16;
          border-bottom: 2px solid #f9f9f9;
          padding-bottom: 1rem;
        }

        .subject-list, .roster-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        
        .subject-list::-webkit-scrollbar, .roster-list::-webkit-scrollbar {
          width: 6px;
        }
        .subject-list::-webkit-scrollbar-thumb, .roster-list::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 4px;
        }

        .subject-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          background: #fbfbfb;
          border-radius: 1.5rem;
          border: 1px solid #f0f0f0;
          transition: all 0.3s ease;
        }
        .subject-item:hover {
          border-color: #c2f575;
          background: #fff;
          box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }

        .subject-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .subject-name {
          font-weight: 800;
          color: #052E16;
          font-size: 1.1rem;
        }
        .subject-meta {
          font-size: 0.8rem;
          color: #888;
          font-weight: 600;
        }

        .subject-stats {
          display: flex;
          gap: 0.75rem;
        }

        .stat-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #fff;
          padding: 0.5rem 1rem;
          border-radius: 1rem;
          border: 1px solid #eee;
          min-width: 80px;
        }
        .stat-val { font-weight: 900; color: #052E16; font-size: 1.1rem; }
        .stat-lbl { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: #888; font-weight: 800; margin-top: 0.2rem; }

        .stat-pill.good { background: #ecfdf5; border-color: #a7f3d0; }
        .stat-pill.good .stat-val { color: #059669; }
        
        .stat-pill.warning { background: #fffbeb; border-color: #fde68a; }
        .stat-pill.warning .stat-val { color: #d97706; }

        .stat-pill.danger { background: #fef2f2; border-color: #fecaca; }
        .stat-pill.danger .stat-val { color: #dc2626; }

        .matrix-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          flex: 1;
        }
        
        .matrix-cell {
          border-radius: 1.5rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1px solid transparent;
        }
        
        .matrix-val { font-size: 2.5rem; font-weight: 950; margin-bottom: 0.5rem; }
        .matrix-lbl { font-size: 0.8rem; font-weight: 700; color: #666; line-height: 1.4; }

        .matrix-cell.safe { background: #f0fdf4; border-color: #dcfce7; color: #166534; }
        .matrix-cell.mild { background: #fffbeb; border-color: #fef3c7; color: #92400e; }
        .matrix-cell.moderate { background: #fff7ed; border-color: #ffedd5; color: #c2410c; }
        .matrix-cell.critical { background: #fef2f2; border-color: #fee2e2; color: #991b1b; }

        .roster-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border: 1px solid #eee;
          border-radius: 1.5rem;
          background: #fff;
        }
        .roster-user {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .roster-user img {
          width: 48px; height: 48px;
          border-radius: 1rem;
          object-fit: cover;
        }
        .roster-name { font-weight: 800; color: #052E16; font-size: 1.1rem; margin: 0 0 0.2rem; }
        .roster-failed-count { font-size: 0.85rem; color: #ef4444; font-weight: 700; margin: 0; }
        
        .roster-subjects { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .failed-sub-tag {
          font-size: 0.75rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.05em; padding: 0.4rem 0.8rem;
          background: #fef2f2; color: #dc2626; border-radius: 1rem; border: 1px solid #fecaca;
        }
        
        .empty-state { text-align: center; color: #888; font-weight: 600; padding: 2rem; font-style: italic; }

        @media (max-width: 1200px) {
           .charts-grid, .reports-grid { grid-template-columns: 1fr; }
           .chart-wrapper.pie-chart, .report-card.at-risk-roster { grid-column: auto; }
        }

        @media (max-width: 768px) {
           .back-btn { display: none; }
           .header-text h1 { font-size: 2rem; flex-wrap: wrap; }
           .chart-wrapper { padding: 2rem; }
           
           .metrics-grid { 
             display: grid;
             grid-template-columns: repeat(2, 1fr);
             gap: 1rem; 
           }
           .metric-card { 
             padding: 1.25rem; 
             gap: 1rem; 
             flex-direction: column;
             align-items: flex-start;
             border-radius: 1.5rem;
           }
           .metric-card:last-child:nth-child(odd) {
             grid-column: span 2;
             flex-direction: row;
             align-items: center;
           }
           .metric-icon {
             width: 44px;
             height: 44px;
             border-radius: 1.25rem;
           }
           .metric-icon svg {
             width: 20px;
             height: 20px;
           }
           .metric-content .metric-label { font-size: 0.65rem; }
           .metric-value { font-size: 1.3rem; }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsDashboard;

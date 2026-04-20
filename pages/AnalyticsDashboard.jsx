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
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const COLORS = ['#1A1A4E', '#c2f575', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

const AnalyticsDashboard = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [zone, setZone] = useState(null);
  const [students, setStudents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [exams, setExams] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch Zone Details
        const zoneDoc = await getDoc(doc(db, 'zones', zoneId));
        if (!zoneDoc.exists()) {
          setError('Zone not found');
          setLoading(false);
          return;
        }
        
        const zoneData = { id: zoneDoc.id, ...zoneDoc.data() };
        
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
        
        const subData = [];
        submissionSnaps.forEach((snap, idx) => {
          const examId = examData[idx].id;
          snap.forEach(doc => {
            subData.push({ id: doc.id, examId, ...doc.data() });
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
              color: #1A1A4E;
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
              background: #1A1A4E;
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
     const weeks = {};
     students.forEach(s => {
        let date;
        if (s.joinedAt?.seconds) date = new Date(s.joinedAt.seconds * 1000);
        else if (s.joinedAt) date = new Date(s.joinedAt);
        else date = new Date();
        
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const key = weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        weeks[key] = (weeks[key] || 0) + 1;
     });
     // Sort by date would be better, but keys like "06 Apr" are tricky. 
     // For now, return entries.
     return Object.keys(weeks).map(key => ({ week: key, students: weeks[key] }));
  };

  // 2. Exam Scores Distribution
  const examScoreData = exams.map(exam => {
     const subs = allSubmissions.filter(s => s.examId === exam.id && s.status === 'GRADED');
     const avg = subs.length > 0 ? subs.reduce((sum, s) => sum + (s.percentageScore || 0), 0) / subs.length : 0;
     return { title: exam.title, avg: parseFloat(avg.toFixed(1)) };
  });

  // 3. Source Breakdown
  const sourceData = () => {
     const sources = { 'Payment': 0, 'Whitelist': 0 };
     students.forEach(s => {
        const source = (s.source === 'payment' || s.source === 'ORDER') ? 'Payment' : 'Whitelist';
        sources[source]++;
     });
     return Object.keys(sources).map(key => ({ name: key, value: sources[key] }));
  };

  const formatCurrency = (val) => val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

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
              className="flex items-center gap-2 px-6 py-3 bg-[#1A1A4E] text-[#c2f575] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-900/20"
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
          color: #1A1A4E;
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
          color: #1A1A4E;
        }

        .back-btn:hover {
          background: #f8f8f8;
          transform: translateX(-5px);
          border-color: #1A1A4E;
        }

        .header-text h1 {
          font-size: 2.5rem;
          font-weight: 950;
          letter-spacing: -0.05em;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 1rem;
          color: #1A1A4E;
        }

        .badge {
          font-size: 0.7rem;
          background: #c2f575;
          color: #1A1A4E;
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
           color: #1A1A4E;
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

        @media (max-width: 1200px) {
           .charts-grid { grid-template-columns: 1fr; }
           .chart-wrapper.pie-chart { grid-column: auto; }
        }

        @media (max-width: 768px) {
           .header-text h1 { font-size: 2rem; flex-wrap: wrap; }
           .chart-wrapper { padding: 2rem; }
           .metric-card { padding: 1.5rem; gap: 1rem; }
           .metric-value { font-size: 1.4rem; }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsDashboard;

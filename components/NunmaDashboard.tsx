import React from 'react';
import { BookOpen, Users, Trophy, PlayCircle, Search, Bell, Settings, Plus, Menu } from 'lucide-react';


const NunmaDashboard: React.FC = () => {
  const courses = [
    { title: 'Interactive Physics', students: 1240, progress: 65, icon: <BookOpen className="w-6 h-6" /> },
    { title: 'Advanced Calculus', students: 850, progress: 20, icon: <Trophy className="w-6 h-6" /> },
    { title: 'Quantum Mechanics', students: 500, progress: 45, icon: <Users className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Navigation */}
      <nav className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#c2f575] rounded-xl flex items-center justify-center">
            <span className="text-[#1a1a4e] font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Nunma</h1>
        </div>

        <div className="hidden md:flex items-center gap-8 bg-[#052e16] px-6 py-3 rounded-2xl border border-white/5 shadow-lg">
          <a href="#" className="hover:text-[#c2f575] transition-colors">Courses</a>
          <a href="#" className="hover:text-[#c2f575] transition-colors">Learning Path</a>
          <a href="#" className="hover:text-[#c2f575] transition-colors">Resources</a>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#c2f575] to-[#052e16] border-2 border-white/10" />
        </div>
      </nav>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Hero Section */}
        <section className="lg:col-span-8 flex flex-col gap-8">
          <div className="anti-gravity-card bg-gradient-to-br from-[#052e16] to-[#1a1a4e] relative overflow-hidden">
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-[#c2f575] text-[#1a1a4e] text-xs font-bold rounded-full mb-4 uppercase tracking-wider">
                Featured Course
              </span>
              <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">Mastering Digital Logic</h2>
              <p className="text-white/70 mb-8 max-w-lg leading-relaxed">
                Dive deep into the fundamentals of digital circuits and computer architecture with our immersive interactive modules.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="anti-gravity-button flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Resume Learning
                </button>
                <button className="px-6 py-3 rounded-16 border border-[#c2f575] text-[#c2f575] font-semibold hover:bg-[#c2f575]/10 transition-colors rounded-2xl">
                  Course Details
                </button>
              </div>
            </div>
            {/* Abstract Decorative Elements */}
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-[#c2f575]/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-[#c2f575]/5 blur-[60px] rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.slice(0, 2).map((course, i) => (
              <div key={i} className="anti-gravity-card flex flex-col justify-between" style={{ animationDelay: `${i * 0.5}s` }}>
                <div>
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-[#c2f575]">
                    {course.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                  <p className="text-white/50 text-sm mb-6 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {course.students} students enrolled
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#c2f575] rounded-full" style={{ width: `${course.progress}%` }} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Progress</span>
                    <span className="text-[#c2f575] font-bold">{course.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sidebar / Profile Section */}
        <aside className="lg:col-span-4 flex flex-col gap-8">
          <div className="anti-gravity-card min-h-[400px]">
            <h3 className="text-xl font-bold mb-8">Learning Stats</h3>
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-[#c2f575]/10 rounded-2xl flex items-center justify-center text-[#c2f575]">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-black">12</p>
                  <p className="text-white/40 text-sm uppercase tracking-widest font-bold">Badges Earned</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-[#c2f575]/10 rounded-2xl flex items-center justify-center text-[#c2f575]">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-black">4</p>
                  <p className="text-white/40 text-sm uppercase tracking-widest font-bold">In Progress</p>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/5">
              <h4 className="font-bold mb-2 text-[#c2f575]">Next Challenge</h4>
              <p className="text-sm text-white/60 mb-4">Complete the weekly quiz to earn 200XP</p>
              <button className="w-full py-3 bg-[#c2f575]/10 hover:bg-[#c2f575]/20 text-[#c2f575] font-bold rounded-2xl transition-all">
                Take Quiz
              </button>
            </div>
          </div>

          <div className="anti-gravity-card p-0 overflow-hidden" style={{ animationDelay: '1s' }}>
            <div className="p-8 pb-0">
              <h3 className="text-xl font-bold mb-2">Daily Goal</h3>
              <p className="text-white/50 text-sm mb-6">45 / 60 mins completed</p>
            </div>
            <div className="h-4 bg-white/5 w-full relative">
              <div className="absolute left-0 top-0 h-full bg-[#c2f575]" style={{ width: '75%' }} />
            </div>
            <div className="p-8">
              <button className="w-full py-4 bg-white text-[#1a1a4e] font-black rounded-2xl hover:scale-[1.02] transition-transform">
                GO TO CLASSROOM
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* Floating Action Button */}
      <button className="fixed bottom-8 right-8 floating-action-button">
        <Plus className="w-8 h-8" />
      </button>

      <style>{`
        .rounded-16 { border-radius: 16px; }
      `}</style>
    </div>
  );
};

export default NunmaDashboard;

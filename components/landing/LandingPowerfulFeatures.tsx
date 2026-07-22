import React from 'react';
import { ArrowRight, Asterisk, Sparkles, FileSpreadsheet, Download, Clock, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const LandingPowerfulFeatures: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-[#fcfcfc] py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-24"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#000000] mb-6 tracking-tight">
            Powerful Features, Built for <br /> Modern Learning
          </h2>
          <p className="text-gray-500 font-medium mb-8 leading-relaxed text-lg">
            Everything you need to create, manage, and scale digital{' '}
            <br className="hidden md:block" />
            education — all in one seamless platform.
          </p>
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="inline-flex items-center gap-2 bg-[#052e16] text-[#c2f575] px-8 py-3.5 rounded-full font-bold hover:bg-[#052e16]/90 transition-all shadow-xl shadow-[#052e16]/10 text-sm"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Feature 1: Results History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center mb-32 md:mb-48">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="w-full aspect-[4/3] bg-[#f8f9fa] rounded-[2rem] border border-gray-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-6 flex flex-col relative z-20 overflow-hidden">
              <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
                 <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-white z-10 relative">
                   <h4 className="font-black text-[#052e16] text-lg">Score Preview</h4>
                   <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-1.5 flex items-center gap-3">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-0.5">Attendance</span>
                     <span className="text-sm font-black text-[#c2f575] bg-[#052e16] px-2 py-0.5 rounded-lg leading-none">42</span>
                   </div>
                 </div>
                 <div className="flex-1 overflow-hidden bg-white relative">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50/50 border-b border-gray-50">
                       <tr>
                         <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                         <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Marks</th>
                         <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center hidden sm:table-cell">Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                       {[
                         { name: 'Arjun M.', marks: 95, status: 'Graded', color: 'bg-green-100 text-green-600' },
                         { name: 'Priya S.', marks: 88, status: 'Graded', color: 'bg-green-100 text-green-600' },
                         { name: 'Karthik R.', marks: '-', status: 'Pending', color: 'bg-yellow-100 text-yellow-600' },
                         { name: 'Sneha V.', marks: 92, status: 'Graded', color: 'bg-green-100 text-green-600' },
                       ].map((r, i) => (
                         <tr key={i} className="hover:bg-gray-50 transition-colors">
                           <td className="px-5 py-4 font-bold text-[#052e16] flex items-center gap-3">
                             <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px]">{r.name[0]}</div>
                             {r.name}
                           </td>
                           <td className="px-5 py-4 text-center">
                             <span className="font-black text-indigo-600">{r.marks}</span>
                             <span className="text-[10px] text-gray-400 font-bold ml-1">/ 100</span>
                           </td>
                           <td className="px-5 py-4 text-center hidden sm:table-cell">
                             <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md ${r.color}`}>
                               {r.status}
                             </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                   {/* Gradient fade to hide bottom */}
                   <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                 </div>
              </div>

              {/* Overlay popup to look like bulk export */}
              <div className="absolute -bottom-6 -right-6 w-[65%] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#c2f575]/20 text-[#6ea812] flex items-center justify-center">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-[#052e16]">Bulk Export</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Date Range Report</p>
                  </div>
                </div>
                <button className="w-full py-3 bg-[#052e16] text-[#c2f575] rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2">
                  <Download size={14} /> Extract Report
                </button>
              </div>
            </div>
            {/* Decorative blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-[#c2f575]/15 rounded-full blur-3xl z-10 pointer-events-none" />
          </motion.div>

          {/* Content side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:pr-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 text-sm font-extrabold text-[#000000] mb-6 shadow-sm">
              <Asterisk className="w-4 h-4 text-[#052e16]" /> Results History
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#000000] mb-6 leading-tight tracking-tight">
              Give Every Student a Personalized Space to Track Their Growth, Celebrate Milestones,
              and Understand Their Learning Journey Like Never Before.
            </h3>
            <p className="text-gray-500 font-medium leading-relaxed text-lg">
              With an intuitive profile system, students can see their full result history,
              performance analytics, and progress charts — turning data into motivation and insight.
            </p>
          </motion.div>
        </div>

        {/* Feature 2: Generate Assignment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Content side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-2 lg:order-1 lg:pl-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 text-sm font-extrabold text-[#000000] mb-6 shadow-sm">
              <Asterisk className="w-4 h-4 text-[#052e16]" /> AI Assignment Builder
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#000000] mb-6 leading-tight tracking-tight">
              Empower Teachers to Create, Assign, and Grade Effortlessly — All from One Smart,
              Unified Dashboard.
            </h3>
            <p className="text-gray-500 font-medium leading-relaxed text-lg">
              From building assignments to managing submissions and grading with real-time insights,
              teachers can save time and focus on what matters most: helping students succeed and
              reach their full potential.
            </p>
          </motion.div>

          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative order-1 lg:order-2"
          >
            <div className="w-full aspect-[4/3] bg-[#f8f9fa] rounded-[2rem] border border-gray-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-6 flex flex-col relative z-20 overflow-hidden">
              <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden flex flex-col relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-50 pb-5">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#c2f575]/20 flex items-center justify-center text-[#052e16] font-black text-lg">1</div>
                      <div className="text-xl font-black text-[#052e16]">Question Title</div>
                   </div>
                   <div className="flex gap-2">
                     <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-sm">MCQ Format</div>
                   </div>
                </div>
                
                <div className="w-full bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100 shadow-inner">
                  <div className="text-sm font-bold text-gray-600 leading-relaxed">What is the core philosophy behind Nunma's decentralized education approach?</div>
                </div>

                <div className="space-y-3 flex-1 overflow-hidden relative">
                  {[
                    { opt: 'Centralized server content', correct: false },
                    { opt: 'Peer-to-peer knowledge sharing', correct: true },
                    { opt: 'Proprietary closed curriculum', correct: false },
                  ].map((o, i) => (
                    <div key={i} className="flex items-center gap-4">
                       <div className={`w-6 h-6 rounded-lg border-2 flex flex-shrink-0 transition-all ${o.correct ? 'bg-[#c2f575] border-[#c2f575] rotate-45' : 'border-gray-200 bg-white'}`}>
                          {o.correct && <div className="w-2 h-2 m-auto bg-[#052e16] -rotate-45 rounded-sm" />}
                       </div>
                       <div className={`flex-1 py-3 px-5 rounded-xl border-2 font-bold text-sm shadow-sm ${o.correct ? 'bg-[#c2f575]/10 border-[#c2f575]/40 text-[#052e16]' : 'bg-white border-gray-100 text-gray-500'}`}>
                         {o.opt}
                       </div>
                    </div>
                  ))}
                  {/* Gradient fade to hide bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                </div>
                
                {/* Floating AI badge & toolbar */}
                <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center">
                   <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2">
                         <Clock size={14} className="text-gray-400" />
                         <span className="font-black text-[#052e16] text-sm">60</span>
                      </div>
                      <div className="w-px h-4 bg-gray-200" />
                      <div className="flex items-center gap-2">
                         <Award size={14} className="text-[#c2f575]" />
                         <span className="font-black text-[#052e16] text-sm">5</span>
                      </div>
                   </div>
                   <div className="bg-[#052e16] text-[#c2f575] px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-xl flex items-center gap-2 border border-[#c2f575]/20">
                     <Sparkles size={14} /> AI Generated
                   </div>
                </div>
              </div>
            </div>
            {/* Decorative blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-[#c2f575]/15 rounded-full blur-3xl z-10 pointer-events-none" />
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default LandingPowerfulFeatures;

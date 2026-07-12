import React from 'react';
import { ArrowRight, Asterisk } from 'lucide-react';
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
            <div className="w-full aspect-[4/3] bg-white rounded-[2rem] border border-gray-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-4 flex flex-col relative z-20">
              <div className="flex-1 bg-white rounded-xl border border-gray-100 flex overflow-hidden">
                {/* Sidebar fake */}
                <div className="w-1/4 bg-[#eef9f2]/50 border-r border-gray-50 p-4 space-y-4">
                  <div className="h-6 w-20 bg-[#052e16] rounded-md mb-8" />
                  <div className="h-4 w-full bg-[#052e16] rounded opacity-90" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                </div>
                {/* Profile fake */}
                <div className="w-1/3 border-r border-gray-50 p-6 flex flex-col items-center pt-10">
                  <div className="w-16 h-16 rounded-full bg-gray-200 mb-4 border-4 border-white shadow-sm" />
                  <div className="h-4 w-24 bg-gray-800 rounded mb-2" />
                  <div className="h-3 w-16 bg-gray-300 rounded mb-8" />
                  <div className="w-full h-8 bg-[#052e16] rounded-lg mb-3" />
                  <div className="w-full h-8 bg-gray-50 rounded-lg" />
                </div>
                {/* Stats fake */}
                <div className="flex-1 p-6 pt-10 space-y-5">
                  <div className="h-6 w-32 bg-gray-800 rounded mb-6" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                  <div className="h-4 w-full bg-gray-100 rounded" />
                </div>
              </div>

              {/* Overlay popup */}
              <div className="hidden md:block absolute -bottom-10 -right-10 w-[80%] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-30">
                <div className="flex justify-between items-center mb-6">
                  <div className="h-5 w-32 bg-gray-800 rounded" />
                  <div className="h-6 w-24 bg-gray-100 rounded-full" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-20 bg-gray-300 rounded" />
                    <div className="h-5 w-16 bg-[#c2f575]/40 rounded text-center" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-24 bg-gray-300 rounded" />
                    <div className="h-5 w-16 bg-red-100 rounded text-center" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-16 bg-gray-300 rounded" />
                    <div className="h-5 w-16 bg-[#c2f575]/40 rounded text-center" />
                  </div>
                </div>
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
            <div className="w-full aspect-[4/3] bg-white rounded-[2rem] border border-gray-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-4 flex flex-col relative z-20">
              <div className="flex-1 bg-white rounded-xl border border-gray-100 flex overflow-hidden">
                {/* Editor area */}
                <div className="flex-1 p-8">
                  <div className="h-4 w-32 bg-gray-300 rounded mb-3" />
                  <div className="h-10 w-full bg-gray-50 border border-gray-100 rounded-lg mb-6" />
                  {/* Toolbar */}
                  <div className="flex gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="w-6 h-6 bg-gray-100 rounded" />
                    <div className="w-6 h-6 bg-gray-100 rounded" />
                    <div className="w-6 h-6 bg-gray-100 rounded" />
                    <div className="w-6 h-6 bg-gray-100 rounded" />
                    <div className="w-6 h-6 bg-gray-50 rounded ml-4" />
                    <div className="w-6 h-6 bg-gray-50 rounded" />
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 w-1/3 bg-[#c2f575]/40 rounded mb-6" />
                    <div className="h-3 w-full bg-gray-100 rounded" />
                    <div className="h-3 w-[90%] bg-gray-100 rounded" />
                    <div className="h-3 w-[95%] bg-gray-100 rounded" />
                    <div className="h-3 w-3/4 bg-gray-100 rounded mb-4" />
                    <div className="h-3 w-full bg-gray-100 rounded" />
                    <div className="h-3 w-[85%] bg-gray-100 rounded" />
                  </div>
                </div>
                {/* Right sidebar */}
                <div className="w-[30%] bg-[#fcfcfc] border-l border-gray-100 p-6 space-y-6">
                  <div>
                    <div className="h-3 w-16 bg-gray-300 rounded mb-3" />
                    <div className="h-10 w-full bg-white border border-gray-200 rounded-lg" />
                  </div>
                  <div>
                    <div className="h-3 w-20 bg-gray-300 rounded mb-3" />
                    <div className="h-10 w-full bg-white border border-gray-200 rounded-lg" />
                  </div>
                  <div>
                    <div className="h-3 w-12 bg-gray-300 rounded mb-3" />
                    <div className="h-10 w-full bg-white border border-gray-200 rounded-lg" />
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

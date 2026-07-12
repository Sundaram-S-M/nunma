import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const LandingHero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="bg-gradient-to-b from-[#eef9f2] to-[#fcfcfc] pt-20 pb-24 px-6 text-center relative overflow-hidden"
    >
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-[#c2f575]/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-80 h-80 bg-[#c2f575]/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#c2f575]/50 text-sm font-bold text-[#052e16] mb-8 shadow-sm"
        >
          <span className="text-[#aee85e]">✨</span> Your All In One E-Learning Platform
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold mb-8 text-[#000000] tracking-tight leading-[1.1]"
        >
          Own Your Audience.{' '}
          <br className="hidden md:block" />
          Scale Your Teaching Empire.
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-gray-600 leading-relaxed font-medium"
        >
          The all-in-one virtual classroom and marketplace built for independent educators.
          Host high-performance live streams and scale your empire effortlessly.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="bg-[#c2f575] text-[#052e16] px-8 py-3.5 rounded-full font-bold hover:bg-[#aee85e] transition-all shadow-lg w-full sm:w-auto text-base"
          >
            Start For Free
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('features');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="bg-gray-200/50 border border-gray-200 text-[#000000] px-8 py-3.5 rounded-full font-bold hover:bg-[#c2f575] hover:border-[#c2f575] transition-all shadow-sm w-full sm:w-auto flex items-center justify-center gap-2 text-base"
          >
            Explore Features <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Browser mockup frame */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="w-full max-w-5xl mx-auto h-[400px] md:h-[500px] bg-white rounded-[2rem] border border-gray-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-4 relative flex flex-col mb-24"
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-2 mb-4 px-2 border-b border-gray-100 pb-4">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          {/* Mockup content */}
          <div className="flex-1 rounded-xl bg-gray-50 border border-gray-100 flex overflow-hidden">
            {/* Sidebar fake */}
            <div className="w-1/5 bg-[#052e16] p-4 space-y-4 hidden sm:block">
              <div className="h-5 w-16 bg-[#c2f575]/80 rounded-md mb-6" />
              <div className="h-3 w-full bg-white/20 rounded" />
              <div className="h-3 w-full bg-white/10 rounded" />
              <div className="h-3 w-full bg-white/10 rounded" />
              <div className="h-3 w-3/4 bg-white/10 rounded" />
            </div>
            {/* Main area */}
            <div className="flex-1 p-6 space-y-4">
              <div className="flex gap-3 mb-6">
                <div className="h-16 w-1/3 bg-[#eef9f2] rounded-xl border border-gray-100 flex items-center justify-center">
                  <div className="h-4 w-16 bg-[#c2f575]/60 rounded" />
                </div>
                <div className="h-16 w-1/3 bg-white rounded-xl border border-gray-100" />
                <div className="h-16 w-1/3 bg-white rounded-xl border border-gray-100" />
              </div>
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-4/5 bg-gray-100 rounded" />
              <div className="h-32 w-full bg-[#eef9f2]/50 rounded-xl border border-gray-100 mt-4" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingHero;

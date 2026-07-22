import React from 'react';
import { ArrowRight, Building2, GraduationCap, Rocket, BookOpen, Award, School } from 'lucide-react';
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
          className="text-lg md:text-xl max-w-3xl mx-auto mb-10 text-gray-700 leading-relaxed font-medium"
        >
          Nunma is the all-in-one platform to run live classes, collect fees, and issue verified certificates — replacing WhatsApp groups and paper registers.
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
          className="w-full max-w-5xl mx-auto h-[400px] md:h-[500px] bg-white rounded-[2rem] border border-gray-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-4 relative flex flex-col mb-16"
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-2 mb-4 px-2 border-b border-gray-100 pb-4">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          {/* Mockup content */}
          <div className="flex-1 rounded-xl bg-gray-900 border border-gray-100 flex overflow-hidden relative group">
            <img 
              src="/dashboard-mockup.png" 
              alt="Dashboard Mockup" 
              className="w-full h-full object-cover object-left-top transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
        </motion.div>

        {/* "Who is this for?" segment section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="pt-6 border-t border-gray-200/60 max-w-5xl mx-auto"
        >
          <div className="text-center mb-8">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#052e16] bg-[#c2f575]/50 px-3.5 py-1 rounded-full border border-[#c2f575]/80 inline-block mb-3 shadow-sm">
              Built For You
            </span>
            <h3 className="text-2xl md:text-3xl font-extrabold text-[#000000] tracking-tight">
              Who is Nunma for?
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { name: 'Tuition Centre Owner', icon: Building2 },
              { name: 'Coaching Institute', icon: GraduationCap },
              { name: 'Bootcamp Organizer', icon: Rocket },
              { name: 'Independent Tutor', icon: BookOpen },
              { name: 'Freelance Coach', icon: Award },
              { name: 'School/College Teacher', icon: School },
            ].map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white/90 backdrop-blur-md border border-gray-200/90 hover:border-[#c2f575] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#052e16]/5 text-[#052e16] group-hover:bg-[#c2f575] group-hover:text-[#052e16] flex items-center justify-center mb-2.5 transition-colors">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-800 group-hover:text-[#052e16] leading-snug">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingHero;

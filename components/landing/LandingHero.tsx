import React from 'react';
import { ArrowRight, PlayCircle, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingHero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center py-20">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-slate-50 rounded-full blur-3xl opacity-60 -z-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-brand-blue font-medium text-sm mb-8">
          <Zap className="w-4 h-4 text-brand-blue fill-brand-blue" />
          <span>The Next Generation OS for Educators</span>
        </div>
        
        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-brand-slate tracking-tight leading-[1.1] mb-8 max-w-5xl">
          Build your teaching empire with a <span className="text-brand-blue">premium platform.</span>
        </h1>
        
        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl leading-relaxed">
          We've moved beyond the traditional LMS. Deliver high-performance learning, leverage AI co-hosts, and issue cryptographically secure credentials.
        </p>
        
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button 
            onClick={() => navigate('/auth?mode=signup')}
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#c2f575] text-[#1a1a4e] rounded-full font-semibold text-lg hover:shadow-[0_0_15px_#c2f575] transition-all shadow-sm overflow-hidden w-full sm:w-auto animate-float"
          >
            <span className="relative z-10">Start for Free</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
          </button>
          
          <a 
            href="#demo"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-700 rounded-full font-semibold text-lg border-2 border-slate-100 hover:bg-slate-50 transition-colors w-full sm:w-auto"
          >
            <PlayCircle className="w-5 h-5 text-brand-blue" />
            <span>Watch Demo</span>
          </a>
        </div>

        {/* Social Proof metrics */}
        <div className="mt-20 pt-10 border-t border-slate-200 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-slate-900">2x</span>
            <span className="text-sm text-slate-500 font-medium">Faster Video Load</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-slate-900">W3C</span>
            <span className="text-sm text-slate-500 font-medium">Verified Credentials</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex text-3xl font-black text-slate-900">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mr-1" />
              100%
            </div>
            <span className="text-sm text-slate-500 font-medium">DRM Protected</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-slate-900">Global</span>
            <span className="text-sm text-slate-500 font-medium">PPP Pricing Setup</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;

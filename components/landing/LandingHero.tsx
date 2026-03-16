import React from 'react';
import { ArrowRight, PlayCircle, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingHero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-br from-indigo-100 to-violet-50 rounded-full blur-3xl opacity-60 -z-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium text-sm mb-8 animate-fade-in-up">
          <Zap className="w-4 h-4 text-indigo-500 fill-indigo-500" />
          <span>The Next Generation OS for Educators</span>
        </div>
        
        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8 max-w-5xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          Build your teaching empire with a{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-300% animate-gradient">
            premium platform.
          </span>
        </h1>
        
        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          We've moved beyond the traditional LMS. Deliver high-performance learning, leverage AI co-hosts, and issue cryptographically secure credentials.
        </p>
        
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <button 
            onClick={() => navigate('/auth')}
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full font-semibold text-lg hover:bg-indigo-600 transition-all shadow-xl hover:shadow-indigo-500/25 overflow-hidden w-full sm:w-auto hover:-translate-y-0.5"
          >
            <span className="relative z-10">Start for Free</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
          
          <a 
            href="#demo"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-700 rounded-full font-semibold text-lg border-2 border-slate-100 hover:border-indigo-100 hover:bg-slate-50 transition-all w-full sm:w-auto"
          >
            <PlayCircle className="w-5 h-5 text-indigo-600" />
            <span>Watch Demo</span>
          </a>
        </div>

        {/* Social Proof metrics */}
        <div className="mt-20 pt-10 border-t border-slate-200 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
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

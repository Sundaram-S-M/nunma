import React from 'react';
import { Play, Sparkles, Shield, Globe, Award } from 'lucide-react';
import LandingHero from '../components/landing/LandingHero';
import FeaturesShowcase from '../components/landing/FeaturesShowcase';
import DiscoveryGrid from '../components/landing/DiscoveryGrid';
import DemoBookingWidget from '../components/landing/DemoBookingWidget';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-indigo-100/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                Nunma
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="hidden md:block text-slate-600 hover:text-indigo-600 font-medium transition-colors">Features</a>
              <a href="#discovery" className="hidden md:block text-slate-600 hover:text-indigo-600 font-medium transition-colors">Discover</a>
              <a href="/#/auth" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">Sign In</a>
              <a 
                href="#demo"
                className="bg-slate-900 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
              >
                Book Demo
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20">
        <LandingHero />
        <FeaturesShowcase />
        <DiscoveryGrid />
        
        {/* Call to Action & Demo Section */}
        <section id="demo" className="py-24 bg-white relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-50 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                Ready to build your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">empire?</span>
              </h2>
              <p className="text-xl text-slate-600">
                See how Nunma transforms the way you teach, assess, and monetize globally. Book a personalized walkthrough.
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <DemoBookingWidget />
            </div>
          </div>
        </section>
      </main>

      {/* Simplified Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-6 opacity-50">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-xl font-bold text-white tracking-tight">Nunma</span>
            </div>
            <p className="text-sm pb-8 border-b border-slate-800 w-full text-center">
              The premium operating system for modern educators.
            </p>
            <div className="w-full flex justify-between items-center mt-8 text-xs">
                <p>&copy; {new Date().getFullYear()} Nunma Platforms. All rights reserved.</p>
                <div className="flex gap-4">
                    <a href="#" className="hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms</a>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

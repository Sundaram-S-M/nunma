import React from 'react';
import { Sparkles } from 'lucide-react';

import LandingLogo from '../components/landing/LandingLogo';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="bg-[#F8F9FA] text-[#0F172A] antialiased min-h-screen">
      {/* Floating Glass Top Navigation */}
      <header className="sticky top-0 left-0 right-0 z-50 pt-3 pb-1 px-4 sm:px-6 lg:px-8">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center rounded-full bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
          <a href="/#/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <LandingLogo className="h-8 text-[#052e16]" />
          </a>
          <div className="flex items-center gap-6">
            <a href="/#/" className="hidden md:block text-slate-600 hover:text-nunma-forest font-semibold text-sm transition-colors">Home</a>
            <a href="/#/about" className="hidden md:block text-slate-600 hover:text-nunma-forest font-semibold text-sm transition-colors">About Us</a>
            <a href="/#/blog" className="hidden md:block text-slate-600 hover:text-nunma-forest font-semibold text-sm transition-colors">Blog</a>
            <a href="/#/features" className="hidden md:block text-slate-600 hover:text-nunma-forest font-semibold text-sm transition-colors">Features</a>
            <a href="/#/discovery" className="hidden md:block text-slate-600 hover:text-nunma-forest font-semibold text-sm transition-colors">Discover</a>
            <a href="/#/auth" className="text-slate-600 hover:text-nunma-forest font-semibold text-sm transition-colors">Sign In</a>
            <a 
              href="#demo"
              className="bg-[#c2f575] text-nunma-forest px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm hover:shadow-md hover:bg-[#aee85e] active:scale-95"
            >
              Book Demo
            </a>
          </div>
        </nav>
      </header>

      <main>
        {children}
      </main>

      {/* Footer pulled from LandingPage or simplified here if needed, but LandingPage has its own footer for now */}
    </div>
  );
};

export default PublicLayout;

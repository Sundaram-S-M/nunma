import React from 'react';
import { Sparkles } from 'lucide-react';

import LandingLogo from '../components/landing/LandingLogo';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="bg-[#F8F9FA] text-[#0F172A] antialiased min-h-screen">
      {/* Static, High-Contrast Top Navigation */}
      <nav className="sticky top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <a href="/#/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <LandingLogo className="h-8 text-[#052e16]" />
            </a>
            <div className="flex items-center gap-6">
              <a href="/#/" className="hidden md:block text-slate-600 hover:text-brand-blue font-medium transition-colors">Home</a>
              <a href="/#/blog" className="hidden md:block text-slate-600 hover:text-brand-blue font-medium transition-colors">Blog</a>
              <a href="/#/features" className="hidden md:block text-slate-600 hover:text-brand-blue font-medium transition-colors">Features</a>
              <a href="/#/discovery" className="hidden md:block text-slate-600 hover:text-brand-blue font-medium transition-colors">Discover</a>
              <a href="/#/auth" className="text-slate-600 hover:text-brand-blue font-medium transition-colors">Sign In</a>
              <a 
                href="#demo"
                className="bg-[#c2f575] text-nunma-forest px-6 py-2.5 rounded-full font-bold transition-all shadow-sm hover:shadow-[0_0_15px_#c2f575]"
              >
                Book Demo
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {children}
      </main>

      {/* Footer pulled from LandingPage or simplified here if needed, but LandingPage has its own footer for now */}
    </div>
  );
};

export default PublicLayout;

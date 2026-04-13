import React from 'react';
import { Play, Sparkles, Shield, Globe, Award } from 'lucide-react';
import LandingHero from '../components/landing/LandingHero';
import FeaturesShowcase from '../components/landing/FeaturesShowcase';
import DiscoveryGrid from '../components/landing/DiscoveryGrid';
import DemoBookingWidget from '../components/landing/DemoBookingWidget';
import BlogSection from '../components/landing/BlogSection';

const LandingPage: React.FC = () => {
  return (
    <>
      {/* Main Content */}
      <LandingHero />
      <FeaturesShowcase />
      <DiscoveryGrid />
      <BlogSection />
      
      {/* Call to Action & Demo Section */}
      <section id="demo" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-slate-50 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-brand-slate mb-6 tracking-tight">
              Ready to build your <span className="text-brand-blue">empire?</span>
            </h2>
            <p className="text-xl text-slate-600">
              See how Nunma transforms the way you teach, assess, and monetize globally. Book a personalized walkthrough.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <DemoBookingWidget />
          </div>
        </div>
      </section>

      {/* 3-Column Footer */}
      <footer className="bg-[#0f172a] text-slate-400 pt-20 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            
            {/* Left Column */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <img src="/assets/logo-icon.png" alt="Nunma" className="w-6 h-6 object-contain" width="500" height="500" />
                <span className="text-2xl font-black tracking-tight text-white">Nunma</span>
              </div>
              <p className="text-slate-300 font-medium mb-4">
                Building the Trust Layer for Education.
              </p>
              <p className="text-slate-400">
                Empowering Thalas to teach, earn, and build a verifiable legacy. 🚀
              </p>
            </div>

            {/* Middle Column - Product */}
            <div>
              <h3 className="text-white font-bold mb-6 text-lg">Product</h3>
              <ul className="space-y-4">
                <li><a href="#" className="hover:text-nunma-lime transition-colors">Create a Zone</a></li>
                <li><a href="#" className="hover:text-nunma-lime transition-colors">Thala Pro Features</a></li>
                <li><a href="#" className="hover:text-nunma-lime transition-colors">Proof-of-Work Portfolios</a></li>
                <li><a href="#" className="hover:text-nunma-lime transition-colors">Institutional Licensing</a></li>
              </ul>
            </div>

            {/* Right Column - Company */}
            <div>
              <h3 className="text-white font-bold mb-6 text-lg">Company</h3>
              <ul className="space-y-4">
                <li><a href="/#/about" className="hover:text-nunma-lime transition-colors">About Us (Founder Stories)</a></li>
                <li><a href="/#/success" className="hover:text-nunma-lime transition-colors">Success Stories</a></li>
                <li><a href="/#/legal" className="hover:text-nunma-lime transition-colors">Terms & Privacy</a></li>
                <li><a href="/#/support" className="hover:text-nunma-lime transition-colors">Contact Support</a></li>
              </ul>
            </div>
            
          </div>
          
          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between text-sm">
            <p>&copy; {new Date().getFullYear()} Nunma. Built with vission</p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <span className="text-slate-500">Follow us on:</span>
              <div className="flex gap-4">
                <a href="#" className="hover:text-nunma-lime transition-colors">LinkedIn</a>
                <span className="text-slate-700">|</span>
                <a href="#" className="hover:text-nunma-lime transition-colors">Instagram</a>
                <span className="text-slate-700">|</span>
                <a href="#" className="hover:text-nunma-lime transition-colors">YouTube</a>
                <span className="text-slate-700">|</span>
                <a href="#" className="hover:text-nunma-lime transition-colors">X</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;

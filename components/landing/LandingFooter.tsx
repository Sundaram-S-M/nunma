import React from 'react';
import { Linkedin, Instagram, Youtube, Twitter } from 'lucide-react';
import LandingLogo from './LandingLogo';

const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-[#052e16] text-gray-300 pt-20 pb-12 px-6 rounded-t-[3rem] mt-10">
      <div className="max-w-7xl mx-auto border-b border-gray-700/50 pb-12 grid grid-cols-1 md:grid-cols-4 gap-12">

        {/* Brand */}
        <div className="md:col-span-2">
          <button
            onClick={() => scrollToSection('home')}
            className="mb-6 text-white text-3xl focus:outline-none text-left"
            aria-label="Go to top"
          >
            <LandingLogo className="h-10" />
          </button>
          <p className="text-sm font-medium leading-relaxed max-w-sm text-gray-400">
            Building the Trust Layer for Education. Empowering Thalas to teach, earn, and build a
            verifiable legacy. 🚀
          </p>
        </div>

        {/* Product */}
        <div>
          <h4 className="font-extrabold text-white mb-6">Product</h4>
          <ul className="space-y-3 text-sm font-medium text-gray-400">
            <li>
              <a href="/#/launch-zone" className="hover:text-white transition-colors">
                Create a Zone
              </a>
            </li>
            <li>
              <a href="/#/settings/pricing" className="hover:text-white transition-colors">
                Thala Pro Features
              </a>
            </li>
            <li>
              <a href="/#/explore" className="hover:text-white transition-colors">
                Proof-of-Work Portfolios
              </a>
            </li>
            <li>
              <a href="/#/auth?mode=signup" className="hover:text-white transition-colors">
                Institutional Licensing
              </a>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-extrabold text-white mb-6">Company</h4>
          <ul className="space-y-3 text-sm font-medium text-gray-400">
            <li>
              <a href="/#/about" className="hover:text-white transition-colors">
                About Us
              </a>
            </li>
            <li>
              <a href="/#/success" className="hover:text-white transition-colors">
                Success Stories
              </a>
            </li>
            <li>
              <a href="/#/legal" className="hover:text-white transition-colors">
                Terms &amp; Privacy
              </a>
            </li>
            <li>
              <a
                href="mailto:support@nunma.in"
                className="hover:text-white transition-colors"
              >
                Contact Support
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-gray-500">
        <div>&copy; {new Date().getFullYear()} Nunma. Built with vision.</div>
        <div className="flex space-x-4">
          <a
            href="#"
            aria-label="LinkedIn"
            className="hover:text-white transition-colors bg-white/5 p-2 rounded-full"
          >
            <Linkedin className="w-4 h-4" />
          </a>
          <a
            href="#"
            aria-label="Instagram"
            className="hover:text-white transition-colors bg-white/5 p-2 rounded-full"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <a
            href="#"
            aria-label="YouTube"
            className="hover:text-white transition-colors bg-white/5 p-2 rounded-full"
          >
            <Youtube className="w-4 h-4" />
          </a>
          <a
            href="#"
            aria-label="X / Twitter"
            className="hover:text-white transition-colors bg-white/5 p-2 rounded-full"
          >
            <Twitter className="w-4 h-4" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;

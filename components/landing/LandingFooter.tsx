import React from 'react';
import { Linkedin, Instagram, Youtube } from 'lucide-react';
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
            className="mb-6 text-white text-3xl focus:outline-none text-left nunma-heading-glow inline-block"
            aria-label="Go to top"
          >
            <LandingLogo className="h-10" />
          </button>
          <p className="text-sm font-medium leading-relaxed max-w-sm text-gray-400 nunma-text-glow">
            Building the Trust Layer for Education. Empowering Thalas to teach, earn, and build a
            verifiable legacy. 🚀
          </p>
        </div>

        {/* Product */}
        <div>
          <h4 className="font-extrabold text-white mb-6 nunma-heading-glow inline-block">Product</h4>
          <ul className="space-y-3 text-sm font-medium text-gray-400">
            <li>
              <a href="/#/auth?mode=signup&role=THALA&redirect=/workplace/launch" className="nunma-text-glow inline-block">
                Create a Zone
              </a>
            </li>
            <li>
              <a href="/#/pro-features" className="nunma-text-glow inline-block">
                Thala Pro Features
              </a>
            </li>
            <li>
              <a href="/#/explore" className="nunma-text-glow inline-block">
                Proof-of-Work Portfolios
              </a>
            </li>
            <li>
              <a href="/#/auth?mode=signup" className="nunma-text-glow inline-block">
                Institutional Licensing
              </a>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-extrabold text-white mb-6 nunma-heading-glow inline-block">Company</h4>
          <ul className="space-y-3 text-sm font-medium text-gray-400">
            <li>
              <a href="/#/about" className="nunma-text-glow inline-block">
                About Us
              </a>
            </li>
            <li>
              <a href="/#/success" className="nunma-text-glow inline-block">
                Success Stories
              </a>
            </li>
            <li>
              <a href="/#/legal" className="nunma-text-glow inline-block">
                Legal
              </a>
            </li>
            <li>
              <a
                href="mailto:support@nunma.in"
                className="nunma-text-glow inline-block"
              >
                Contact Support
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-gray-500">
        <div className="nunma-text-glow">&copy; {new Date().getFullYear()} Nunma. Built with vision.</div>
        <div className="flex space-x-4">
          <a
            href="https://www.linkedin.com/company/nunma/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="bg-white/5 p-2.5 rounded-full border border-transparent nunma-icon-glow flex items-center justify-center"
          >
            <Linkedin className="w-4 h-4" />
          </a>
          <a
            href="https://www.instagram.com/nunmaofficial/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="bg-white/5 p-2.5 rounded-full border border-transparent nunma-icon-glow flex items-center justify-center"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <a
            href="https://www.youtube.com/@nunmaofficial"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="bg-white/5 p-2.5 rounded-full border border-transparent nunma-icon-glow flex items-center justify-center"
          >
            <Youtube className="w-4 h-4" />
          </a>
          <a
            href="https://wa.me/919487724185"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp Us"
            className="bg-white/5 p-2.5 rounded-full border border-transparent nunma-icon-glow flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 2.019.537 3.91 1.474 5.54L2 22l4.636-1.43C8.19 21.492 10.046 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.748 0-3.376-.464-4.786-1.272l-.343-.198-2.756.85.867-2.684-.225-.357A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;

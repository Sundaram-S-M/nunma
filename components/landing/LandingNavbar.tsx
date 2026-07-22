import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingLogo from './LandingLogo';

/**
 * Smooth-scroll to a section by ID without touching the URL hash.
 * This is critical because HashRouter uses the URL hash for routing —
 * a plain `href="#features"` would corrupt the router state (e.g. redirect to /auth).
 */
const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const LandingNavbar: React.FC = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    scrollToSection(id);
  };

  // Scroll-spy: update active section as user scrolls
  useEffect(() => {
    const sections = ['home', 'features', 'pricing', 'blogs', 'faq'];
    
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -40% 0px', // Trigger when section occupies the middle portion of viewport
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  // Scroll header squish
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on scroll
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = () => setMobileOpen(false);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [mobileOpen]);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'features', label: 'Feature' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'blogs', label: 'Blogs' },
    { id: 'faq', label: 'FAQs' },
  ];

  const pillClass = (id: string) =>
    `px-5 py-2 text-sm font-semibold rounded-full transition-colors cursor-pointer ${
      activeSection === id
        ? 'bg-[#052e16] text-white'
        : 'text-gray-600 hover:text-[#052e16]'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full pt-3 pb-1 px-4 md:px-8 transition-all duration-300">
      <div className={`mx-auto px-6 h-16 md:h-18 flex items-center justify-between font-sans bg-white/70 backdrop-blur-xl border border-white/60 rounded-full transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isScrolled ? 'max-w-[850px] shadow-[0_12px_40px_rgba(0,0,0,0.12)]' : 'max-w-7xl shadow-[0_8px_30px_rgb(0,0,0,0.06)]'}`}>
        {/* Logo — scroll to top */}
        <button
          onClick={() => handleNavClick('home')}
          className="text-[#052e16] focus:outline-none flex items-center"
          aria-label="Go to top"
        >
          <LandingLogo className="h-8 text-[#052e16]" />
        </button>

        {/* Desktop pill nav — uses JS scroll, NOT href="#section" */}
        <div className="hidden md:flex items-center space-x-1 p-1.5 bg-gray-100/80 rounded-full border border-gray-200/50">
          {navLinks.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              className={pillClass(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="/#/auth"
            className="text-sm font-bold text-[#052e16] hover:text-black transition-colors"
          >
            Sign In
          </a>
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="bg-[#c2f575] text-[#052e16] hover:bg-[#aee85e] px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            Get Started
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-[#052e16]"
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile dropdown floating card */}
      {mobileOpen && (
        <div className="md:hidden max-w-7xl mx-auto mt-2 bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 flex flex-col gap-3 shadow-[0_12px_40px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-2 duration-200">
          {navLinks.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setMobileOpen(false); handleNavClick(id); }}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-colors text-left ${
                activeSection === id
                  ? 'bg-[#052e16] text-white'
                  : 'text-gray-600 hover:bg-gray-100/80'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-3">
            <a href="/#/auth" className="text-sm font-bold text-[#052e16] px-4 py-1">
              Sign In
            </a>
            <button
              onClick={() => { setMobileOpen(false); navigate('/auth?mode=signup'); }}
              className="bg-[#c2f575] text-[#052e16] hover:bg-[#aee85e] px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-md text-center"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default LandingNavbar;

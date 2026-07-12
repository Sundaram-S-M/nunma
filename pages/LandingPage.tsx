import React from 'react';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingHero from '../components/landing/LandingHero';
import LandingFeatures from '../components/landing/LandingFeatures';
import LandingPowerfulFeatures from '../components/landing/LandingPowerfulFeatures';
import LandingPricing from '../components/landing/LandingPricing';
import LandingTestimonials from '../components/landing/LandingTestimonials';
import BlogSection from '../components/landing/BlogSection';
import LandingFAQ from '../components/landing/LandingFAQ';
import LandingFooter from '../components/landing/LandingFooter';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfc] font-sans text-slate-900 scroll-smooth">
      {/* Landing-specific navbar replaces PublicLayout nav for the home route */}
      <LandingNavbar />

      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingPowerfulFeatures />
        <LandingPricing />
        <LandingTestimonials />
        <BlogSection />
        <LandingFAQ />
      </main>

      <LandingFooter />
    </div>
  );
};

export default LandingPage;

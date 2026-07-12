import React from 'react';

interface LandingLogoProps {
  className?: string;
}

const LandingLogo: React.FC<LandingLogoProps> = ({ className = 'h-8' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 100 100" className="h-full w-auto" xmlns="http://www.w3.org/2000/svg">
        <path d="M 70 30 C 15 30, 10 75, 45 75" stroke="currentColor" strokeWidth="14" strokeLinecap="round" fill="none" />
        <circle cx="70" cy="30" r="18" fill="currentColor" />
        <circle cx="45" cy="75" r="18" fill="currentColor" />
      </svg>
      <span className="font-extrabold tracking-tight lowercase text-2xl">nunma</span>
    </div>
  );
};

export default LandingLogo;

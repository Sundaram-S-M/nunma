import React from 'react';

interface LandingLogoProps {
  className?: string;
}

const LandingLogo: React.FC<LandingLogoProps> = ({ className = 'h-8' }) => {
  return (
    <img 
      src="/assets/logo-full.png" 
      alt="Nunma" 
      className={className} 
      style={{ objectFit: 'contain', display: 'block' }} 
    />
  );
};

export default LandingLogo;


import React from 'react';
import { Hero } from '../components/Hero';
import { About } from '../components/About';
import { Solutions } from '../components/Solutions';
import { Contact } from '../components/Contact';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <div className="h-[2px] w-full bg-gradient-to-r from-[#0B0F28]/0 via-[#8B5CF6]/60 to-[#3184b1]/0 backdrop-blur-sm" />
      <div id="features">
        <About />
      </div>
      <div className="h-[2px] w-full bg-gradient-to-r from-[#0B0F28]/0 via-[#8B5CF6]/60 to-[#3184b1]/0 backdrop-blur-sm" />
      <Solutions />
      <div className="h-[2px] w-full bg-gradient-to-r from-[#0B0F28]/0 via-[#8B5CF6]/60 to-[#3184b1]/0 backdrop-blur-sm" />
      <Contact />
    </div>
  );
};



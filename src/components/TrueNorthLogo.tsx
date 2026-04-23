import React from 'react';

export default function TrueNorthLogo({ className = "", showLogoOnly = false }: { className?: string, showLogoOnly?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-10 h-10 flex-shrink-0">
        {/* The Orange Square with Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF9D42] to-[#E65100] rounded-sm shadow-sm flex items-center justify-center overflow-hidden border border-white/20">
          {/* Compass Detail (Subtle background) */}
          <svg viewBox="0 0 100 100" className="absolute w-full h-full opacity-30 select-none pointer-events-none">
            <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="0.5" />
            <line x1="50" y1="5" x2="50" y2="95" stroke="white" strokeWidth="0.5" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="white" strokeWidth="0.5" />
          </svg>
          
          {/* The Large 'N' */}
          <span className="relative font-serif font-bold text-3xl text-white select-none drop-shadow-md">N</span>
          
          {/* The Compass Needle Overlay (Uniform Grey/White) */}
          <div className="absolute inset-0 flex items-center justify-center -rotate-45">
             <div className="w-[1.2px] h-[38%] bg-stone-300 transform -translate-y-1/2"></div>
             <div className="w-[1.2px] h-[38%] bg-white/90 transform translate-y-1/2"></div>
          </div>
        </div>
      </div>
      
      {/* The Text Part */}
      {!showLogoOnly && (
        <div className="flex flex-col leading-none">
          <span className="font-serif font-bold text-xl tracking-wider text-inherit select-none">TRUE NORTH</span>
          <span className="text-[7px] uppercase font-bold tracking-[0.3em] opacity-60 ml-0.5">Holdings</span>
        </div>
      )}
    </div>
  );
}

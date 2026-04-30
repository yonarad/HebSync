import React from 'react';

export default function Logo({ className = "w-10 h-10" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0038A8" />
          <stop offset="100%" stopColor="#0077D4" />
        </linearGradient>
      </defs>
      
      {/* Background Rounded Square */}
      <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#blueGradient)" />
      
      {/* RTL Grid Lines (Symbolizing Calendar) */}
      <path d="M 5 35 L 95 35 M 5 65 L 95 65 M 35 35 L 35 95 M 65 35 L 65 95" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      
      {/* Header section of the calendar */}
      <rect x="5" y="5" width="90" height="30" fill="rgba(255,255,255,0.15)" rx="20" />
      
      {/* Magen David (Star of David) */}
      <g transform="translate(50, 65) scale(0.4)" stroke="white" strokeWidth="4" fill="none" strokeLinejoin="round">
        <polygon points="0,-30 26,15 -26,15" />
        <polygon points="0,30 26,-15 -26,-15" />
      </g>
    </svg>
  );
}

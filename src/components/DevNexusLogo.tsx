import React from 'react';

export const DevNexusLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00f2fe" />
        <stop offset="50%" stopColor="#4facfe" />
        <stop offset="100%" stopColor="#f093fb" />
      </linearGradient>
      <linearGradient id="dnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
      <linearGradient id="nGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00c6ff" />
        <stop offset="100%" stopColor="#0072ff" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* Background Circle */}
    <circle cx="200" cy="200" r="180" fill="#020617" stroke="url(#neonGradient)" strokeWidth="6" filter="url(#glow)" />
    
    {/* Hexagon tech accents */}
    <g stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.4">
      <path d="M 60 200 L 80 165 L 120 165 L 140 200 L 120 235 L 80 235 Z" />
      <path d="M 280 140 L 300 105 L 340 105 L 360 140 L 340 175 L 300 175 Z" />
      <path d="M 280 260 L 300 225 L 340 225 L 360 260 L 340 295 L 300 295 Z" />
    </g>

    {/* Letter D */}
    <path d="M 120 130 L 180 130 C 220 130 240 150 240 180 C 240 210 220 230 180 230 L 120 230 Z M 150 155 L 150 205 L 175 205 C 195 205 205 195 205 180 C 205 165 195 155 175 155 Z" fill="url(#dnGradient)" />
    
    {/* Letter N (stylized overlap) */}
    <path d="M 190 230 L 230 150 L 230 230 L 260 230 L 260 130 L 220 130 L 180 210 Z" fill="url(#nGradient)" />
    
    {/* Slash / line across */}
    <line x1="260" y1="130" x2="160" y2="240" stroke="#00f2fe" strokeWidth="4" filter="url(#glow)" />

    {/* Text DEVNEXUS */}
    <text x="200" y="280" fontFamily="sans-serif" fontSize="32" fontWeight="bold" fill="#ffffff" textAnchor="middle" letterSpacing="4">DEVNEXUS</text>
    
    {/* Text Tagline */}
    <text x="200" y="310" fontFamily="sans-serif" fontSize="12" fontWeight="600" fill="#38bdf8" textAnchor="middle" letterSpacing="3">CODE • SECURE • INNOVATE</text>
  </svg>
);

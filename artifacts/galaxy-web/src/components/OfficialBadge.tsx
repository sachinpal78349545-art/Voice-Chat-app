import React from 'react';

interface OfficialBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function OfficialBadge({ size = 'sm', className = '' }: OfficialBadgeProps) {
  // Mobile profile UI ke liye perfect sharp scaling heights
  const sizeStyles = {
    sm: { height: '34px', margin: '0 0 0 6px' },
    md: { height: '42px', margin: '0 0 0 8px' },
    lg: { height: '52px', margin: '0 0 0 10px' }
  };

  const currentStyle = sizeStyles[size];

  return (
    <div 
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ 
        height: currentStyle.height, 
        margin: currentStyle.margin,
        verticalAlign: 'middle',
        display: 'inline-block'
      }}
    >
      <svg 
        viewBox="0 0 320 92" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{
          height: '100%',
          width: 'auto',
          filter: 'drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.75))'
        }}
      >
        <defs>
          {/* Real Metallic 3D Gold Frame Gradient */}
          <linearGradient id="goldFrame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF8D6" />
            <stop offset="20%" stopColor="#E2B27A" />
            <stop offset="45%" stopColor="#8A4F27" />
            <stop offset="55%" stopColor="#8A4F27" />
            <stop offset="80%" stopColor="#F5D2A8" />
            <stop offset="100%" stopColor="#542F14" />
          </linearGradient>

          {/* Premium Charcoal Black Carbon Plate */}
          <linearGradient id="darkPlate" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2D3037" />
            <stop offset="45%" stopColor="#141619" />
            <stop offset="100%" stopColor="#050506" />
          </linearGradient>

          {/* High Contrast Clean Silver Metallic Text */}
          <linearGradient id="textMetallic" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#E9F0F8" />
            <stop offset="100%" stopColor="#A8B9D1" />
          </linearGradient>

          {/* Glowing Purple Diamond Crystals */}
          <linearGradient id="purpleGem" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E6C2FF" />
            <stop offset="50%" stopColor="#8E32E3" />
            <stop offset="100%" stopColor="#41056E" />
          </linearGradient>
        </defs>

        {/* ======================================================== */}
        {/* 🦅 LEFT WING (Original Upward Curved Layered Feathers) */}
        {/* ======================================================== */}
        <g id="left-wing-premium" fill="url(#goldFrame)">
          {/* Top Dominant Long Feather Wing Tip */}
          <path d="M 68 32 C 42 6, 20 12, 4 39 C 18 37, 38 36, 66 35 Z" />
          {/* Second Layer Swept Feather */}
          <path d="M 66 37 C 32 24, 15 36, 12 55 C 26 51, 44 46, 64 42 Z" />
          {/* Third Layer Sharp Lower Feather */}
          <path d="M 64 44 C 36 43, 22 58, 26 72 C 36 64, 48 56, 64 51 Z" />
          {/* Bottom Side Bottom Swirl Tail */}
          <path d="M 65 53 C 50 63, 52 78, 68 83 C 65 74, 63 64, 65 53 Z" />
        </g>

        {/* ======================================================== */}
        {/* 🦅 RIGHT WING (Perfect Inverted Mirror Image Mapping) */}
        {/* ======================================================== */}
        <g id="right-wing-premium" fill="url(#goldFrame)" transform="translate(320, 0) scale(-1, 1)">
          {/* Top Dominant Long Feather Wing Tip */}
          <path d="M 68 32 C 42 6, 20 12, 4 39 C 18 37, 38 36, 66 35 Z" />
          {/* Second Layer Swept Feather */}
          <path d="M 66 37 C 32 24, 15 36, 12 55 C 26 51, 44 46, 64 42 Z" />
          {/* Third Layer Sharp Lower Feather */}
          <path d="M 64 44 C 36 43, 22 58, 26 72 C 36 64, 48 56, 64 51 Z" />
          {/* Bottom Side Bottom Swirl Tail */}
          <path d="M 65 53 C 50 63, 52 78, 68 83 C 65 74, 63 64, 65 53 Z" />
        </g>

        {/* ======================================================== */}
        {/* 🛡️ MAIN HEXAGON CONTAINER (Original Heavy Cuts) */}
        {/* ======================================================== */}
        {/* Heavy Beveled Metallic Base Frame */}
        <polygon 
          points="82,28 238,28 264,52 238,76 82,76 56,52" 
          fill="url(#goldFrame)" 
          stroke="#3A1D07" 
          strokeWidth="1.2"
        />

        {/* Top Centered Peak Decoration */}
        <path d="M 130 28 C 145 14, 175 14, 190 28 Z" fill="url(#goldFrame)" stroke="#3A1D07" strokeWidth="0.6" />
        {/* Bottom Centered Base Anchor */}
        <path d="M 130 76 C 145 90, 175 90, 190 76 Z" fill="url(#goldFrame)" stroke="#3A1D07" strokeWidth="0.6" />

        {/* ======================================================== */}
        {/* 🖤 DEEPER INNER BLACK PLATE */}
        {/* ======================================================== */}
        <polygon 
          points="85,32 235,32 257,52 235,72 85,72 63,52" 
          fill="url(#darkPlate)" 
          stroke="#4D2D14" 
          strokeWidth="1.5"
        />

        {/* Luxury Reflection Slash Overlay */}
        <path d="M 86 33 L 234 33 L 248 44 Z" fill="rgba(255,255,255,0.08)" />

        {/* ======================================================== */}
        {/* 🔮 TOP & BOTTOM CRYSTAL DIAMOND GEMS */}
        {/* ======================================================== */}
        {/* Top Purple Diamond Crystal */}
        <polygon points="160,8 168,16 160,24 152,16" fill="url(#purpleGem)" stroke="#FFE6BD" strokeWidth="0.8" />
        {/* Bottom Purple Diamond Crystal */}
        <polygon points="160,78 168,86 160,94 152,86" fill="url(#purpleGem)" stroke="#FFE6BD" strokeWidth="0.8" />

        {/* ======================================================== */}
        {/* 🔠 3D HIGH CONTRAST TEXT - OFFICIAL */}
        {/* ======================================================== */}
        <text 
          x="160" 
          y="61" 
          fill="url(#textMetallic)"
          fontWeight="900"
          fontSize="24"
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
          style={{
            letterSpacing: '3.5px',
            filter: 'drop-shadow(0px 2.5px 3px rgba(0,0,0,1))'
          }}
        >
          OFFICIAL
        </text>
      </svg>
    </div>
  );
}

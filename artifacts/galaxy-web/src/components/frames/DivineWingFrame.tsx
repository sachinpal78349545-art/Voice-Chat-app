import React from "react";

interface Props {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function DivineWingFrame({ size = 80, className = "", style }: Props) {
  const s = size;
  return (
    <svg
      className={className}
      style={style}
      width={s}
      height={s}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="dw-gold-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dw-crown-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFA500" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <linearGradient id="dw-wing-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E90FF" />
          <stop offset="40%" stopColor="#4169E1" />
          <stop offset="100%" stopColor="#0D47A1" />
        </linearGradient>
        <linearGradient id="dw-wing-right" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E90FF" />
          <stop offset="40%" stopColor="#4169E1" />
          <stop offset="100%" stopColor="#0D47A1" />
        </linearGradient>
        <linearGradient id="dw-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="30%" stopColor="#FFC107" />
          <stop offset="70%" stopColor="#FFB300" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <filter id="dw-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dw-wing-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="100" cy="100" r="90" fill="url(#dw-gold-glow)">
        <animate attributeName="r" values="88;92;88" dur="3s" repeatCount="indefinite" />
      </circle>

      <g filter="url(#dw-wing-glow)">
        <path d="M 30 100 Q 5 70 15 35 Q 25 50 40 55 Q 20 65 25 80 Q 30 70 45 65 Q 35 80 40 90 Z"
          fill="url(#dw-wing-left)" opacity="0.9">
          <animateTransform attributeName="transform" type="rotate" values="-2 40 100;2 40 100;-2 40 100" dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M 25 100 Q 0 80 8 45 Q 18 58 35 60 Q 15 72 22 85 Z"
          fill="#1E90FF" opacity="0.5">
          <animateTransform attributeName="transform" type="rotate" values="-3 35 100;3 35 100;-3 35 100" dur="2.5s" repeatCount="indefinite" />
        </path>
        <path d="M 35 105 Q 10 90 20 55 Q 30 65 42 68 Q 28 78 32 92 Z"
          fill="#63B3ED" opacity="0.4">
          <animateTransform attributeName="transform" type="rotate" values="1 38 100;-3 38 100;1 38 100" dur="3.5s" repeatCount="indefinite" />
        </path>
      </g>

      <g filter="url(#dw-wing-glow)">
        <path d="M 170 100 Q 195 70 185 35 Q 175 50 160 55 Q 180 65 175 80 Q 170 70 155 65 Q 165 80 160 90 Z"
          fill="url(#dw-wing-right)" opacity="0.9">
          <animateTransform attributeName="transform" type="rotate" values="2 160 100;-2 160 100;2 160 100" dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M 175 100 Q 200 80 192 45 Q 182 58 165 60 Q 185 72 178 85 Z"
          fill="#1E90FF" opacity="0.5">
          <animateTransform attributeName="transform" type="rotate" values="3 165 100;-3 165 100;3 165 100" dur="2.5s" repeatCount="indefinite" />
        </path>
        <path d="M 165 105 Q 190 90 180 55 Q 170 65 158 68 Q 172 78 168 92 Z"
          fill="#63B3ED" opacity="0.4">
          <animateTransform attributeName="transform" type="rotate" values="-1 162 100;3 162 100;-1 162 100" dur="3.5s" repeatCount="indefinite" />
        </path>
      </g>

      <circle cx="100" cy="100" r="48" fill="none" stroke="url(#dw-ring-grad)" strokeWidth="3.5" filter="url(#dw-glow)">
        <animate attributeName="stroke-opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="100" r="51" fill="none" stroke="#FFD700" strokeWidth="1" opacity="0.4">
        <animate attributeName="stroke-opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>

      <g filter="url(#dw-glow)">
        <path d="M 80 52 L 85 42 L 90 48 L 95 38 L 100 46 L 105 38 L 110 48 L 115 42 L 120 52 Z"
          fill="url(#dw-crown-grad)" stroke="#B8860B" strokeWidth="0.5">
          <animate attributeName="opacity" values="0.9;1;0.9" dur="2s" repeatCount="indefinite" />
        </path>
        <circle cx="88" cy="43" r="2" fill="#FF4500" opacity="0.8" />
        <circle cx="100" cy="39" r="2.5" fill="#1E90FF" opacity="0.9" />
        <circle cx="112" cy="43" r="2" fill="#FF4500" opacity="0.8" />
      </g>

      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const r = 55;
        const cx = 100 + Math.cos(rad) * r;
        const cy = 100 + Math.sin(rad) * r;
        return (
          <circle key={i} cx={cx} cy={cy} r="1.5" fill="#FFD700" opacity="0.7">
            <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
            <animate attributeName="r" values="1;2;1" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
    </svg>
  );
}

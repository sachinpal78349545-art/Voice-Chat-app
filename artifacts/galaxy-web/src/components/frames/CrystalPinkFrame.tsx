import React from "react";

interface Props {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function CrystalPinkFrame({ size = 80, className = "", style }: Props) {
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
        <radialGradient id="cp-pink-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF69B4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FF69B4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cp-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C0C0C0" />
          <stop offset="25%" stopColor="#E8E8E8" />
          <stop offset="50%" stopColor="#A0A0A0" />
          <stop offset="75%" stopColor="#D0D0D0" />
          <stop offset="100%" stopColor="#C0C0C0" />
        </linearGradient>
        <linearGradient id="cp-wing-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF69B4" />
          <stop offset="40%" stopColor="#FF1493" />
          <stop offset="100%" stopColor="#C71585" />
        </linearGradient>
        <linearGradient id="cp-wing-right" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF69B4" />
          <stop offset="40%" stopColor="#FF1493" />
          <stop offset="100%" stopColor="#C71585" />
        </linearGradient>
        <linearGradient id="cp-crystal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0E0E0" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#B0B0B0" />
        </linearGradient>
        <filter id="cp-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cp-wing-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="100" cy="100" r="88" fill="url(#cp-pink-glow)">
        <animate attributeName="r" values="86;90;86" dur="3.5s" repeatCount="indefinite" />
      </circle>

      <g filter="url(#cp-wing-glow)">
        <path d="M 32 100 Q 8 72 18 38 Q 28 52 42 56 Q 22 68 28 82 Q 32 72 46 67 Q 36 82 40 92 Z"
          fill="url(#cp-wing-left)" opacity="0.85">
          <animateTransform attributeName="transform" type="rotate" values="-2 42 100;2 42 100;-2 42 100" dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M 28 105 Q 5 82 12 48 Q 22 60 38 62 Q 18 74 24 88 Z"
          fill="#FF69B4" opacity="0.45">
          <animateTransform attributeName="transform" type="rotate" values="-3 38 100;3 38 100;-3 38 100" dur="2.8s" repeatCount="indefinite" />
        </path>
        <path d="M 36 108 Q 12 92 22 58 Q 32 67 44 70 Q 30 80 34 94 Z"
          fill="#FFB6C1" opacity="0.35">
          <animateTransform attributeName="transform" type="rotate" values="1 40 100;-3 40 100;1 40 100" dur="3.2s" repeatCount="indefinite" />
        </path>
      </g>

      <g filter="url(#cp-wing-glow)">
        <path d="M 168 100 Q 192 72 182 38 Q 172 52 158 56 Q 178 68 172 82 Q 168 72 154 67 Q 164 82 160 92 Z"
          fill="url(#cp-wing-right)" opacity="0.85">
          <animateTransform attributeName="transform" type="rotate" values="2 158 100;-2 158 100;2 158 100" dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M 172 105 Q 195 82 188 48 Q 178 60 162 62 Q 182 74 176 88 Z"
          fill="#FF69B4" opacity="0.45">
          <animateTransform attributeName="transform" type="rotate" values="3 162 100;-3 162 100;3 162 100" dur="2.8s" repeatCount="indefinite" />
        </path>
        <path d="M 164 108 Q 188 92 178 58 Q 168 67 156 70 Q 170 80 166 94 Z"
          fill="#FFB6C1" opacity="0.35">
          <animateTransform attributeName="transform" type="rotate" values="-1 160 100;3 160 100;-1 160 100" dur="3.2s" repeatCount="indefinite" />
        </path>
      </g>

      <circle cx="100" cy="100" r="48" fill="none" stroke="url(#cp-ring-grad)" strokeWidth="3" filter="url(#cp-glow)">
        <animate attributeName="stroke-opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="100" r="51" fill="none" stroke="#FF69B4" strokeWidth="1" opacity="0.35">
        <animate attributeName="stroke-opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
      </circle>

      <g filter="url(#cp-glow)">
        <path d="M 92 50 L 95 42 L 100 46 L 105 42 L 108 50 L 100 47 Z"
          fill="url(#cp-crystal-grad)" stroke="#A0A0A0" strokeWidth="0.5" opacity="0.9">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
        </path>
        <circle cx="100" cy="43" r="2" fill="#FF69B4" opacity="0.9">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </g>

      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const r = 54;
        const cx = 100 + Math.cos(rad) * r;
        const cy = 100 + Math.sin(rad) * r;
        return (
          <circle key={i} cx={cx} cy={cy} r="1.2" fill={i % 2 === 0 ? "#FF69B4" : "#C0C0C0"} opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${2.2 + i * 0.2}s`} repeatCount="indefinite" />
            <animate attributeName="r" values="0.8;1.6;0.8" dur={`${2.2 + i * 0.2}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
    </svg>
  );
}

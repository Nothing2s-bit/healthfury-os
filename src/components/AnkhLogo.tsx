import type { SVGProps } from "react";

// Winged ankh — the HealthFury emblem. Pure SVG so it scales crisp and
// picks up the gold gradient tokens.
export function AnkhLogo({ size = 96, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 180"
      width={size}
      height={(size * 180) / 200}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="hf-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7e28a" />
          <stop offset="45%" stopColor="#d9a94a" />
          <stop offset="100%" stopColor="#8a5a1e" />
        </linearGradient>
        <linearGradient id="hf-gold-soft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d67c" />
          <stop offset="100%" stopColor="#b07f2e" />
        </linearGradient>
      </defs>
      {/* Left wing */}
      <path
        d="M100 90 C 70 75, 40 78, 15 95 C 30 92, 55 95, 75 105 C 55 105, 35 112, 20 125 C 40 118, 65 118, 85 125 C 70 128, 55 138, 45 150 C 65 140, 85 138, 100 145 Z"
        fill="url(#hf-gold-soft)"
        stroke="#7a5320"
        strokeWidth="1"
      />
      {/* Right wing (mirrored) */}
      <path
        d="M100 90 C 130 75, 160 78, 185 95 C 170 92, 145 95, 125 105 C 145 105, 165 112, 180 125 C 160 118, 135 118, 115 125 C 130 128, 145 138, 155 150 C 135 140, 115 138, 100 145 Z"
        fill="url(#hf-gold-soft)"
        stroke="#7a5320"
        strokeWidth="1"
      />
      {/* Ankh loop */}
      <ellipse
        cx="100"
        cy="45"
        rx="22"
        ry="26"
        fill="none"
        stroke="url(#hf-gold)"
        strokeWidth="10"
      />
      {/* Ankh crossbar */}
      <rect x="70" y="82" width="60" height="12" rx="2" fill="url(#hf-gold)" />
      {/* Ankh stem */}
      <rect x="94" y="82" width="12" height="70" rx="2" fill="url(#hf-gold)" />
      {/* Base */}
      <rect x="86" y="150" width="28" height="6" rx="1" fill="url(#hf-gold)" />
    </svg>
  );
}
import React from 'react';

interface SoboceLogoProps {
  className?: string;
  size?: number | string;
  color?: string;
  useBrandGradient?: boolean;
}

export default function SoboceLogo({ className = '', size = '100%', color, useBrandGradient = true }: SoboceLogoProps) {
  // Use the brand gradient unless a custom solid color is passed
  const fillValue = color || (useBrandGradient ? "url(#soboceGrad)" : "currentColor");

  // This is a premium vector path representing the precise SOBOCE S logo.
  // We draw one half of the S (lower-left lobe) with the inner rounded end and the elegant diagonal gap cut,
  // and then render its 180-degree rotated counterpart for absolute mathematical symmetry.
  const halfSPath = "M 50,50 C 44.5,43.5 39,41 33.5,41 C 21.5,41 12,50.5 12,62.5 C 12,74.5 21.5,84 33.5,84 C 45.5,84 55,74.5 55,62.5 C 55,59 52,56 48.5,56 C 45,56 43,58.5 43,62.5 C 43,67.5 38.5,72 33.5,72 C 28.5,72 24,67.5 24,62.5 C 24,57.5 28.5,53 33.5,53 C 38.5,53 43.5,53.5 50,50 Z";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft, rich, metallic green gradient representing the SOBOCE corporate identity */}
        <linearGradient id="soboceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4c8b7c" />
          <stop offset="50%" stopColor="#1e5447" />
          <stop offset="100%" stopColor="#678a7f" />
        </linearGradient>
      </defs>

      <g fill={fillValue}>
        {/* Bottom-left lobe */}
        <path d={halfSPath} />
        {/* Top-right lobe (rotated 180 degrees around center 50,50) */}
        <path d={halfSPath} transform="rotate(180 50 50)" />
      </g>
    </svg>
  );
}

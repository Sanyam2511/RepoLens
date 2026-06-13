"use client";

import { useId } from "react";

type BrandMarkProps = {
  className?: string;
};

/**
 * Abstract, ideological RepoLens mark.
 * Features an outer "Lens" shape revealing an internal "Architecture" (isometric planes & nodes).
 */
export default function BrandMark({ className }: BrandMarkProps) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`brand-mark h-8 w-8 shrink-0 ${className ?? ""}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`lensGrad-${uid}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id={`planeGrad-${uid}`} x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>

      {/* The Outer Lens / Eye */}
      <path
        d="M 4 24 C 14 6 34 6 44 24 C 34 42 14 42 4 24 Z"
        fill="var(--color-accent)"
        fillOpacity="0.05"
        stroke={`url(#lensGrad-${uid})`}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      
      {/* Inner guiding orbital (adds depth to the lens) */}
      <ellipse cx="24" cy="24" rx="12" ry="6" stroke="#60A5FA" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />

      {/* Isometric Architecture Stack */}
      {/* Back hidden pillar */}
      <path d="M 24 14 L 24 26" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />

      {/* Top Architecture Plane */}
      <path
        d="M 24 12 L 34 17 L 24 22 L 14 17 Z"
        fill={`url(#lensGrad-${uid})`}
        fillOpacity="0.15"
        stroke={`url(#lensGrad-${uid})`}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      
      {/* Bottom Architecture Plane */}
      <path
        d="M 24 26 L 34 31 L 24 36 L 14 31 Z"
        fill={`url(#planeGrad-${uid})`}
        fillOpacity="0.15"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      
      {/* Vertical Pillars connecting the layers */}
      <path 
        d="M 14 17 L 14 31 M 24 22 L 24 36 M 34 17 L 34 31" 
        stroke="#3B82F6" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
      />

      {/* Insight Nodes (Vertices) */}
      <circle cx="14" cy="17" r="2.5" fill="var(--color-accent)" />
      <circle cx="34" cy="17" r="2.5" fill="#3B82F6" />
      <circle cx="24" cy="36" r="2.5" fill="#1E3A8A" />

      {/* The Focal Core (Center Insight) */}
      <circle cx="24" cy="22" r="3" fill="#FFFFFF" />
      <circle cx="24" cy="22" r="1.5" fill="var(--color-accent)" />
    </svg>
  );
}

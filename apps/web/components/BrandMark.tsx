"use client";

import { useId } from "react";

function HexNode({
  cx,
  cy,
  r,
  fill,
  stroke,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
}) {
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");

  return <polygon points={points} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />;
}

type BrandMarkProps = {
  className?: string;
};

/**
 * Theme-aware RepoLens mark. Colors come from CSS variables in globals.css:
 * - :root → light (default)
 * - .dark / [data-theme="dark"] → app dark mode (future)
 * - .footer-inverse .brand-mark → dark mark on inverse footer
 */
export default function BrandMark({ className }: BrandMarkProps) {
  const uid = useId().replace(/:/g, "");
  const focusGlowId = `brandFocusGlow-${uid}`;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`brand-mark h-8 w-8 shrink-0 ${className ?? ""}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient
          id={focusGlowId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(24 17) scale(6)"
        >
          <stop stopColor="var(--brand-mark-glow-start)" />
          <stop offset="1" stopColor="var(--brand-mark-glow-end)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="10"
        fill="var(--brand-mark-bg)"
        stroke="var(--brand-mark-border)"
        strokeWidth="1"
      />

      <circle cx="24" cy="17" r="7" fill={`url(#${focusGlowId})`} opacity="0.55" />

      <path
        d="M 11 19 A 13 13 0 0 1 37 19"
        stroke="var(--brand-mark-lens-primary)"
        strokeWidth="2.25"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 13.5 19 A 10.5 10.5 0 0 1 34.5 19"
        stroke="var(--brand-mark-lens-secondary)"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />

      <circle cx="24" cy="17" r="2.25" fill="var(--brand-mark-focus-ring)" />
      <circle cx="24" cy="17" r="1.1" fill="var(--brand-mark-focus-center)" />

      <path d="M 24 19.5 L 14 29" stroke="var(--brand-mark-ray)" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M 24 19.5 L 34 29" stroke="var(--brand-mark-ray)" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M 24 19.5 L 24 31" stroke="var(--brand-mark-ray)" strokeWidth="1.35" strokeLinecap="round" />

      <HexNode
        cx={14}
        cy={31}
        r={4.2}
        fill="var(--brand-mark-node-entry-fill)"
        stroke="var(--brand-mark-node-entry-stroke)"
      />
      <HexNode
        cx={34}
        cy={31}
        r={4.2}
        fill="var(--brand-mark-node-cyan-fill)"
        stroke="var(--brand-mark-node-cyan-stroke)"
      />
      <HexNode
        cx={24}
        cy={36}
        r={4.2}
        fill="var(--brand-mark-node-green-fill)"
        stroke="var(--brand-mark-node-green-stroke)"
      />

      <path
        d="M 14 31 L 24 36 L 34 31"
        stroke="var(--brand-mark-edge)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 14 31 L 34 31"
        stroke="var(--brand-mark-edge)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.45"
      />

      <line x1="9" y1="42.5" x2="39" y2="42.5" stroke="var(--brand-mark-scan-rail)" strokeWidth="1" />
      <line
        x1="24"
        y1="40.5"
        x2="24"
        y2="44.5"
        stroke="var(--brand-mark-scan-accent)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="42.5"
        x2="16"
        y2="44"
        stroke="var(--brand-mark-scan-tick)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="32"
        y1="42.5"
        x2="32"
        y2="44"
        stroke="var(--brand-mark-scan-tick)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

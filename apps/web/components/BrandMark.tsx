import React from "react";

export default function BrandMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8 shrink-0"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brandMarkFill" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id="brandMarkAccent" x1="14" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="4.5" y="4.5" width="39" height="39" rx="12" fill="url(#brandMarkFill)" stroke="#dbe4ee" />
      <circle cx="24" cy="24" r="10.5" stroke="url(#brandMarkAccent)" strokeWidth="2.4" />
      <path d="M17 24h14" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 17v14" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="15.5" cy="15.5" r="2" fill="#bae6fd" />
      <circle cx="32.5" cy="15.5" r="2" fill="#c4b5fd" />
      <circle cx="24" cy="33" r="2" fill="#0f172a" />
      <path d="M15.5 15.5 24 20.5 32.5 15.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 15.5 20.5 24 24 33" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32.5 15.5 27.5 24 24 33" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
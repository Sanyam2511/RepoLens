"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Search, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="mx-auto w-[min(1200px,94vw)] grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center py-16">
      <div className="lg:pr-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
          <Sparkles className="h-4 w-4" /> Repo intelligence platform
        </div>

        <h1 className="mt-6 text-5xl md:text-6xl leading-tight text-slate-900 display-font">
          Your repository architecture, simplified.
        </h1>

        <p className="mt-6 text-lg text-slate-700 max-w-[64ch]">
          RepoLens maps imports, API calls, and storage dependencies into a live architecture graph. Use it to onboard
          faster, spot coupling early, and keep history of every scan.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-4 text-sm">
          <Link href="#analyze" className="inline-flex items-center gap-2 font-semibold text-slate-900 underline underline-offset-4">
            Start analysis <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/history" className="font-medium text-slate-600 underline underline-offset-4">
            View history
          </Link>
        </div>

        <div className="mt-6 rounded-[26px] bg-white/90 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <div className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <div className="flex-1 text-sm text-slate-500">Paste a public GitHub URL to preview the map</div>
            <Link href="#analyze" className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-900">
              Analyze
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex -space-x-3">
            {["AL", "VP", "RM", "KS"].map((initials) => (
              <div key={initials} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-xs font-semibold text-white">
                {initials}
              </div>
            ))}
          </div>
          <div className="text-sm text-slate-600">
            Used by teams to onboard faster and reduce review time.
          </div>
        </div>
      </div>

        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-md">
            <div className="rounded-[38px] bg-white p-6 shadow-[0_26px_60px_rgba(15,23,42,0.16)]">
              <div className="h-[360px] rounded-[30px] bg-gradient-to-br from-sky-50 via-white to-amber-50 flex items-center justify-center">
              <svg width="320" height="260" viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="320" height="260" rx="24" fill="#F8FAFC" />
                <rect x="24" y="32" width="120" height="90" rx="16" fill="#E0F2FE" />
                <rect x="160" y="32" width="136" height="60" rx="16" fill="#FFE4B5" />
                <rect x="160" y="106" width="120" height="90" rx="18" fill="#DCFCE7" />
                <rect x="24" y="136" width="120" height="60" rx="16" fill="#E0E7FF" />
                <path d="M78 122 L178 106" stroke="#94A3B8" strokeWidth="3" />
                <path d="M110 166 L200 136" stroke="#94A3B8" strokeWidth="3" />
                <path d="M86 88 L220 80" stroke="#94A3B8" strokeWidth="3" />
                <circle cx="82" cy="124" r="6" fill="#0EA5E9" />
                <circle cx="182" cy="106" r="6" fill="#F59E0B" />
                <circle cx="114" cy="168" r="6" fill="#22C55E" />
              </svg>
            </div>
          </div>

          <div className="absolute -bottom-8 left-6 right-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/95 px-4 py-3 text-xs text-slate-600 shadow">
              1,420 nodes mapped
            </div>
            <div className="rounded-2xl bg-white/95 px-4 py-3 text-xs text-slate-600 shadow">
              38% faster reviews
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

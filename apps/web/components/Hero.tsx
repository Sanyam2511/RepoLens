"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Search, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="mx-auto w-[min(1200px,94vw)] grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center py-16">
      <div className="lg:pr-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm">
          <Sparkles className="h-4 w-4" /> Repo intelligence layer
        </div>

        <div className="mt-4 text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
          Scan faster, review less, understand more.
        </div>

        <h1 className="mt-6 text-5xl md:text-6xl leading-tight text-slate-900 display-font max-w-[12ch]">
          Your <span className="text-sky-700">repository architecture</span>, simplified.
        </h1>

        <p className="mt-6 text-lg text-slate-700 max-w-[64ch]">
          RepoLens maps imports, API calls, and storage dependencies into a live architecture graph. Use it to onboard
          faster, spot coupling early, and keep history of every scan.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-4 text-sm">
          <Link href="#analyze" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800">
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
              <svg width="320" height="260" viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="heroTitle heroDesc">
                <title id="heroTitle">Repository map (static)</title>
                <desc id="heroDesc">Static illustration of module groups with clear import connections</desc>
                <rect width="320" height="260" rx="24" fill="#F8FAFC" />
                <rect x="12" y="18" width="296" height="224" rx="20" fill="#FFFFFF" opacity="0.8" />

                {/* Module cards (static) */}
                <rect x="36" y="36" width="116" height="68" rx="12" fill="#E0F2FE" />
                <text x="94" y="58" textAnchor="middle" className="fill-slate-800" fontSize="11" fontWeight="600">Core</text>

                <rect x="168" y="36" width="116" height="48" rx="12" fill="#FFE8B5" />
                <text x="226" y="52" textAnchor="middle" className="fill-slate-800" fontSize="11" fontWeight="600">API</text>

                <rect x="36" y="132" width="116" height="56" rx="12" fill="#E0E7FF" />
                <text x="94" y="156" textAnchor="middle" className="fill-slate-800" fontSize="11" fontWeight="600">Utils</text>

                <rect x="168" y="118" width="116" height="84" rx="12" fill="#DCFCE7" />
                <text x="226" y="156" textAnchor="middle" className="fill-slate-800" fontSize="11" fontWeight="600">Services</text>

                {/* Static connections between module centers */}
                <path d="M94 70 C140 70 180 62 226 60" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.95" />
                <path d="M94 160 C140 160 180 160 226 160" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.95" />
                <path d="M94 136 C130 136 180 148 226 160" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />

                {/* Endpoint markers (static) */}
                <circle cx="94" cy="70" r="6" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="1" />
                <circle cx="226" cy="60" r="6" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1" />
                <circle cx="94" cy="160" r="6" fill="#22C55E" stroke="#FFFFFF" strokeWidth="1" />
                <circle cx="226" cy="160" r="6" fill="#A78BFA" stroke="#FFFFFF" strokeWidth="1" />

                {/* subtle inner highlight for depth */}
                <rect x="28" y="28" width="264" height="204" rx="16" fill="none" stroke="#EEF2FF" strokeWidth="1" opacity="0.6" />
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

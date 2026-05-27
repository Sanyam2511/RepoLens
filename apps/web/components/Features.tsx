"use client";

import React from "react";
import { Circle, Clock, Layers, Sparkles } from "lucide-react";

export default function Features() {
  return (
    <section className="mx-auto w-[min(1200px,94vw)] mt-16 space-y-10">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
          <Sparkles className="h-4 w-4" /> Professional service
        </div>
        <h2 className="mt-5 text-4xl md:text-5xl text-slate-900 display-font">Architecture clarity. Proven results.</h2>
        <p className="mt-4 text-sm md:text-base text-slate-600 max-w-3xl mx-auto">
          Turn any public repository into a readable map. RepoLens helps teams discover how systems connect, reduce
          onboarding time, and share insights across the org.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="soft-card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Circle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Feature</div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Interactive graphs</h3>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">Explore files, APIs and storage relationships with an intuitive visual interface.</p>
        </div>

        <div className="soft-card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Scale</div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Large repo heuristics</h3>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">Smart pruning and component packing keep large graphs readable and fast.</p>
        </div>

        <div className="soft-card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2 text-green-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">History</div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Saved analyses</h3>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">Sign up to save runs, revisit results, and share findings with teammates.</p>
        </div>
      </div>

      <div className="mt-10 px-8 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">RepoLens insights</div>
            <h3 className="mt-3 text-3xl md:text-4xl text-slate-900 display-font">See the graph before you read the code.</h3>
            <p className="mt-3 text-sm md:text-base text-slate-600">
              RepoLens renders a dependency map so you can identify critical nodes, bottlenecks, and disconnected modules
              before you dive into the repository.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Trace imports, API calls, and storage",
                "Spot heavily coupled packages early",
                "Share a visual map with the team",
                "Keep every scan tied to history",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_44px_rgba(15,23,42,0.12)]">
            <div className="h-[280px] rounded-[26px] bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex items-center justify-center">
              <svg width="320" height="200" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="320" height="200" rx="24" fill="#F8FAFC" />
                <rect x="26" y="32" width="120" height="60" rx="14" fill="#E0F2FE" />
                <rect x="174" y="24" width="120" height="72" rx="16" fill="#FFE4B5" />
                <rect x="92" y="110" width="140" height="70" rx="18" fill="#DCFCE7" />
                <path d="M88 92 L182 70" stroke="#94A3B8" strokeWidth="3" />
                <path d="M118 124 L212 100" stroke="#94A3B8" strokeWidth="3" />
                <circle cx="90" cy="92" r="6" fill="#0EA5E9" />
                <circle cx="186" cy="70" r="6" fill="#F59E0B" />
                <circle cx="120" cy="124" r="6" fill="#22C55E" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="soft-card rounded-3xl p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">01</div>
          <div className="mt-3 text-lg font-semibold text-slate-900">Paste URL</div>
          <div className="mt-2 text-sm text-slate-600">Enter a public GitHub repo URL and click analyze.</div>
        </div>
        <div className="soft-card rounded-3xl p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">02</div>
          <div className="mt-3 text-lg font-semibold text-slate-900">Inspect</div>
          <div className="mt-2 text-sm text-slate-600">Drill into nodes to view code, dependencies, and metrics.</div>
        </div>
        <div className="soft-card rounded-3xl p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">03</div>
          <div className="mt-3 text-lg font-semibold text-slate-900">Save and share</div>
          <div className="mt-2 text-sm text-slate-600">Store results in your history for future reference or team reviews.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
          <div className="h-28 rounded-2xl bg-slate-50 flex items-center justify-center">
            <svg width="140" height="88" viewBox="0 0 140 88" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="10" width="124" height="68" rx="12" fill="#F8FAFC" />
              <circle cx="40" cy="30" r="8" fill="#60A5FA" />
              <circle cx="72" cy="22" r="7" fill="#F59E0B" />
              <circle cx="98" cy="44" r="9" fill="#34D399" />
              <path d="M47 30 L65 24" stroke="#CBD5F5" strokeWidth="2" />
              <path d="M79 26 L90 38" stroke="#CBD5F5" strokeWidth="2" />
              <path d="M48 34 L88 42" stroke="#CBD5F5" strokeWidth="2" />
              <rect x="18" y="52" width="64" height="6" rx="3" fill="#E2E8F0" />
              <rect x="18" y="62" width="40" height="6" rx="3" fill="#E2E8F0" />
            </svg>
          </div>
          <div className="mt-4 text-sm font-semibold text-slate-900">Interactive graph preview</div>
          <div className="mt-1 text-sm text-slate-600">See nodes, edges, and quick highlights at a glance.</div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
          <div className="h-28 rounded-2xl bg-slate-50 flex items-center justify-center">
            <svg width="140" height="88" viewBox="0 0 140 88" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="16" width="98" height="56" rx="10" fill="#E0F2FE" />
              <rect x="30" y="26" width="56" height="10" rx="5" fill="#BAE6FD" />
              <rect x="30" y="42" width="74" height="10" rx="5" fill="#BAE6FD" />
              <rect x="30" y="58" width="48" height="8" rx="4" fill="#BAE6FD" />
              <rect x="64" y="10" width="50" height="12" rx="6" fill="#FDE68A" />
            </svg>
          </div>
          <div className="mt-4 text-sm font-semibold text-slate-900">Component packing</div>
          <div className="mt-1 text-sm text-slate-600">Cluster services and folders to keep large graphs readable.</div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
          <div className="h-28 rounded-2xl bg-slate-50 flex items-center justify-center">
            <svg width="140" height="88" viewBox="0 0 140 88" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="18" y="22" width="104" height="44" rx="10" fill="#ECFDF3" />
              <path d="M28 44 H112" stroke="#86EFAC" strokeWidth="2" />
              <circle cx="42" cy="44" r="6" fill="#34D399" />
              <circle cx="70" cy="44" r="6" fill="#F59E0B" />
              <circle cx="98" cy="44" r="6" fill="#60A5FA" />
              <rect x="32" y="28" width="20" height="6" rx="3" fill="#BBF7D0" />
              <rect x="60" y="28" width="20" height="6" rx="3" fill="#BBF7D0" />
              <rect x="88" y="28" width="20" height="6" rx="3" fill="#BBF7D0" />
            </svg>
          </div>
          <div className="mt-4 text-sm font-semibold text-slate-900">History timeline</div>
          <div className="mt-1 text-sm text-slate-600">Revisit saved analyses and jump back into context.</div>
        </div>
      </div>
    </section>
  );
}

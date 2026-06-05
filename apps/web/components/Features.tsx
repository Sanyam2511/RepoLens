"use client";

import React from "react";
import { Circle, Clock, Layers } from "lucide-react";

export default function Features() {
  return (
    <section className="content-grid pt-4 pb-16 md:pb-20 space-y-10">
      <div className="text-center">
        <div className="badge-chip badge-accent inline-flex items-center gap-2">
          Capabilities
        </div>
        <h2 className="mt-5 section-heading">Architecture clarity. Measurable results.</h2>
        <p className="mt-4 text-[var(--color-text-secondary)] max-w-3xl mx-auto">
          Turn any public repository into a readable map. RepoLens helps teams discover how systems connect, reduce
          onboarding time, and share insights across the org.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Circle, label: "Feature", title: "Interactive graphs", desc: "Explore files, APIs and storage relationships with an intuitive visual interface." },
          { icon: Layers, label: "Scale", title: "Large repo heuristics", desc: "Smart pruning and component packing keep large graphs readable and fast." },
          { icon: Clock, label: "History", title: "Saved analyses", desc: "Sign up to save runs, revisit results, and share findings with teammates." },
        ].map(({ icon: Icon, label, title, desc }) => (
          <div key={title} className="surface-card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--color-accent-subtle)] p-2 text-[var(--color-accent)]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="micro-label">{label}</div>
                <h3 className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{desc}</p>
          </div>
        ))}
      </div>

      <div className="px-0 py-0">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <div className="micro-label">RepoLens insights</div>
            <h3 className="mt-3 section-heading">See the graph before you read the code.</h3>
            <p className="mt-3 text-[var(--color-text-secondary)]">
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
                <div key={item} className="compact-card px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="h-[280px] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] flex items-center justify-center dot-grid-bg">
              <svg className="h-full w-full" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="featGraphTitle featGraphDesc">
                <title id="featGraphTitle">Dependency graph illustration</title>
                <desc id="featGraphDesc">Nodes connected by import edges showing module relationships</desc>
                <rect x="26" y="32" width="120" height="60" rx="8" fill="rgba(99,102,241,0.08)" stroke="#6366F1" strokeWidth="1.5" />
                <rect x="26" y="32" width="120" height="3" rx="1" fill="#6366F1" />
                <rect x="174" y="24" width="120" height="72" rx="8" fill="rgba(124,58,237,0.08)" stroke="#7C3AED" strokeWidth="1.5" />
                <rect x="174" y="24" width="120" height="3" rx="1" fill="#7C3AED" />
                <rect x="92" y="110" width="140" height="70" rx="8" fill="rgba(8,145,178,0.08)" stroke="#0891B2" strokeWidth="1.5" />
                <rect x="92" y="110" width="140" height="3" rx="1" fill="#0891B2" />
                <path d="M88 92 L182 70" stroke="#CBD5E1" strokeWidth="2" />
                <path d="M118 124 L212 100" stroke="#CBD5E1" strokeWidth="2" />
                <circle cx="90" cy="92" r="5" fill="#6366F1" />
                <circle cx="186" cy="70" r="5" fill="#7C3AED" />
                <circle cx="120" cy="124" r="5" fill="#0891B2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          ["01", "Paste URL", "Enter a public GitHub repo URL and click analyze."],
          ["02", "Inspect", "Drill into nodes to view code, dependencies, and metrics."],
          ["03", "Save and share", "Store results in your history for future reference or team reviews."],
        ].map(([num, title, desc]) => (
          <div key={num} className="compact-card p-5">
            <div className="micro-label">{num}</div>
            <div className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">{title}</div>
            <div className="mt-2 text-sm text-[var(--color-text-secondary)]">{desc}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            title: "Interactive graph preview",
            desc: "See nodes, edges, and quick highlights at a glance.",
            svg: (
              <svg className="h-full w-full" viewBox="0 0 140 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="10" width="124" height="68" rx="8" fill="#F1F5F9" stroke="#E2E8F0" />
                <circle cx="40" cy="30" r="6" fill="#6366F1" />
                <circle cx="72" cy="22" r="5" fill="#7C3AED" />
                <circle cx="98" cy="44" r="6" fill="#0891B2" />
                <path d="M47 30 L65 24" stroke="#CBD5E1" strokeWidth="2" />
                <path d="M79 26 L90 38" stroke="#CBD5E1" strokeWidth="2" />
                <path d="M48 34 L88 42" stroke="#CBD5E1" strokeWidth="2" />
                <rect x="18" y="52" width="64" height="6" rx="3" fill="#E2E8F0" />
                <rect x="18" y="62" width="40" height="6" rx="3" fill="#E2E8F0" />
              </svg>
            ),
          },
          {
            title: "Component packing",
            desc: "Cluster services and folders to keep large graphs readable.",
            svg: (
              <svg className="h-full w-full" viewBox="0 0 140 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="16" width="98" height="56" rx="8" fill="rgba(99,102,241,0.08)" stroke="#6366F1" strokeWidth="1.5" />
                <rect x="30" y="26" width="56" height="10" rx="4" fill="#EEF2FF" />
                <rect x="30" y="42" width="74" height="10" rx="4" fill="#EEF2FF" />
                <rect x="30" y="58" width="48" height="8" rx="4" fill="#EEF2FF" />
                <rect x="64" y="10" width="50" height="12" rx="6" fill="rgba(100,116,139,0.15)" stroke="#64748B" strokeWidth="1" />
              </svg>
            ),
          },
          {
            title: "History timeline",
            desc: "Revisit saved analyses and jump back into context.",
            svg: (
              <svg className="h-full w-full" viewBox="0 0 140 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="18" y="22" width="104" height="44" rx="8" fill="#ECFDF5" stroke="#10B981" strokeWidth="1" />
                <path d="M28 44 H112" stroke="#CBD5E1" strokeWidth="2" />
                <circle cx="42" cy="44" r="5" fill="#10B981" />
                <circle cx="70" cy="44" r="5" fill="#6366F1" />
                <circle cx="98" cy="44" r="5" fill="#7C3AED" />
                <rect x="32" y="28" width="20" height="6" rx="3" fill="#D1FAE5" />
                <rect x="60" y="28" width="20" height="6" rx="3" fill="#D1FAE5" />
                <rect x="88" y="28" width="20" height="6" rx="3" fill="#D1FAE5" />
              </svg>
            ),
          },
        ].map((card) => (
          <div key={card.title} className="compact-card p-5">
            <div className="h-28 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center p-3">
              {card.svg}
            </div>
            <div className="mt-4 text-sm font-semibold text-[var(--color-text-primary)]">{card.title}</div>
            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{card.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

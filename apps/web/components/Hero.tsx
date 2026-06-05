"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

function edgeDown(sx: number, sy: number, tx: number, ty: number, color: string) {
  const midY = sy + (ty - sy) / 2;
  return (
    <path
      d={`M ${sx} ${sy} V ${midY} H ${tx} V ${ty}`}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      markerEnd="url(#heroArrow)"
    />
  );
}

function GraphNode({
  x, y, w, h, label, sub, color,
}: { x: number; y: number; w: number; h: number; label: string; sub: string; color: string }) {
  const cx = x + w / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={`${color}14`} stroke={color} strokeWidth="1.5" />
      <rect x={x} y={y} width={w} height="3" rx="1" fill={color} />
      <text x={cx} y={y + 20} textAnchor="middle" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="var(--font-sans, sans-serif)">{label}</text>
      <text x={cx} y={y + 33} textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="var(--font-mono, monospace)">{sub}</text>
      <circle cx={cx} cy={y} r="2.5" fill={color} stroke="#fff" strokeWidth="1" />
      <circle cx={cx} cy={y + h} r="2.5" fill={color} stroke="#fff" strokeWidth="1" />
    </g>
  );
}

function HeroSchematic() {
  const W = 280;
  const H = 220;
  const api = { x: 20, y: 16, w: 90, h: 46, color: "#7C3AED", label: "API", sub: "routes/" };
  const core = { x: 170, y: 16, w: 90, h: 46, color: "#6366F1", label: "Core", sub: "lib/utils" };
  const router = { x: 95, y: 88, w: 90, h: 46, color: "#059669", label: "Router", sub: "middleware" };
  const storage = { x: 95, y: 160, w: 90, h: 46, color: "#0891B2", label: "Storage", sub: "db/client" };

  const port = (n: typeof api, side: "top" | "bottom") => ({
    x: n.x + n.w / 2,
    y: side === "top" ? n.y : n.y + n.h,
  });

  const apiBot = port(api, "bottom");
  const coreBot = port(core, "bottom");
  const routerTop = port(router, "top");
  const routerBot = port(router, "bottom");
  const storageTop = port(storage, "top");

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="heroTitle heroDesc">
      <title id="heroTitle">Repository dependency graph</title>
      <desc id="heroDesc">Directed import edges from API and Core through Router to Storage</desc>
      <defs>
        <marker id="heroArrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#94A3B8" />
        </marker>
      </defs>
      <rect x="8" y="6" width={W - 16} height={H - 12} rx="10" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5 4" />
      {edgeDown(apiBot.x, apiBot.y, routerTop.x - 14, routerTop.y, "#7C3AED")}
      {edgeDown(coreBot.x, coreBot.y, routerTop.x + 14, routerTop.y, "#6366F1")}
      {edgeDown(routerBot.x, routerBot.y, storageTop.x, storageTop.y, "#0891B2")}
      <path d={`M ${api.x + api.w} ${api.y + 23} H ${core.x - 6}`} fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" markerEnd="url(#heroArrow)" />
      <GraphNode {...api} />
      <GraphNode {...core} />
      <GraphNode {...router} />
      <GraphNode {...storage} />
    </svg>
  );
}

function FloatPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`compact-card z-20 p-3 ${className ?? ""}`}>
      {children}
    </div>
  );
}

export default function Hero() {
  return (
    <section className="dot-grid-bg relative overflow-hidden">
      <div className="content-grid relative pt-6 pb-10 md:pt-8 md:pb-14">
        {/* Centered headline — Monity-style hub */}
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <div className="badge-chip badge-accent inline-flex items-center gap-2">
            Repo intelligence layer
          </div>

          <h1 className="mt-3 hero-heading text-[clamp(2rem,5vw,3rem)]">
            Your repository architecture,
            <br />
            <span className="text-[var(--color-text-tertiary)]">mapped as a graph.</span>
          </h1>

          <p className="mt-4 mx-auto max-w-xl text-[var(--color-text-secondary)]">
            RepoLens maps imports, API calls, and storage dependencies into a live architecture graph.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="#analyze" className="btn-primary">
              Start analysis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/history" className="btn-ghost">
              View history
            </Link>
          </div>

          <div className="mt-5 mx-auto max-w-lg compact-card p-1.5">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
              <span className="flex-1 truncate text-left data-mono text-[var(--color-text-tertiary)]">
                https://github.com/org/repo
              </span>
              <Link href="#analyze" className="badge-chip badge-accent shrink-0">
                Analyze
              </Link>
            </div>
          </div>
        </div>

        {/* Schematic arena — floating panels orbit the center graph */}
        <div className="relative mx-auto mt-6 h-[300px] w-full max-w-3xl md:mt-8 md:h-[340px]">
          {/* Connector traces */}
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" viewBox="0 0 768 340" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden>
            <defs>
              <marker id="traceArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#CBD5E1" />
              </marker>
            </defs>
            <path d="M 130 52 H 280 V 170 H 384" stroke="#CBD5E1" strokeWidth="1.25" strokeDasharray="5 4" markerEnd="url(#traceArrow)" />
            <path d="M 638 52 H 488 V 170 H 384" stroke="#CBD5E1" strokeWidth="1.25" strokeDasharray="5 4" markerEnd="url(#traceArrow)" />
            <path d="M 130 288 H 280 V 200 H 384" stroke="#CBD5E1" strokeWidth="1.25" strokeDasharray="5 4" markerEnd="url(#traceArrow)" />
            <path d="M 638 288 H 488 V 200 H 384" stroke="#CBD5E1" strokeWidth="1.25" strokeDasharray="5 4" markerEnd="url(#traceArrow)" />
            <rect x="200" y="100" width="368" height="140" rx="16" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="6 4" opacity="0.7" />
          </svg>

          {/* Top-left */}
          <FloatPanel className="absolute left-0 top-0 hidden w-[140px] md:block lg:w-[155px]">
            <div className="micro-label mb-1.5">File tree</div>
            <div className="space-y-0.5 data-mono-dense text-[var(--color-text-secondary)]">
              <div className="text-[var(--color-text-tertiary)]">src/</div>
              <div className="pl-2">api/routes.ts</div>
              <div className="pl-2 text-[var(--color-accent)]">lib/utils.ts</div>
              <div className="pl-2">db/client.ts</div>
            </div>
          </FloatPanel>

          {/* Top-right */}
          <FloatPanel className="absolute right-0 top-0 hidden w-[140px] md:block lg:w-[155px]">
            <div className="micro-label mb-1.5">Scan meta</div>
            <div className="space-y-1">
              <div className="flex justify-between gap-1">
                <span className="micro-label !text-[0.6rem]">ID</span>
                <span className="data-mono-dense text-[var(--color-text-primary)]">a3f9c2</span>
              </div>
              <div className="flex justify-between gap-1">
                <span className="micro-label !text-[0.6rem]">Status</span>
                <span className="badge-chip badge-healthy !py-0.5 !text-[0.6rem]">OK</span>
              </div>
              <div className="flex justify-between gap-1">
                <span className="micro-label !text-[0.6rem]">Depth</span>
                <span className="data-mono-dense text-[var(--color-text-primary)]">4</span>
              </div>
            </div>
          </FloatPanel>

          {/* Center graph */}
          <div className="absolute left-1/2 top-1/2 z-10 w-[min(100%,300px)] -translate-x-1/2 -translate-y-1/2 surface-card p-3 md:w-[300px]">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="micro-label">Dependency graph</span>
              <span className="data-mono-dense text-[var(--color-text-tertiary)]">import →</span>
            </div>
            <div className="h-[200px] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] dot-grid-bg md:h-[220px]">
              <HeroSchematic />
            </div>
          </div>

          {/* Bottom-left */}
          <FloatPanel className="absolute bottom-0 left-0 hidden w-[148px] md:block lg:w-[162px]">
            <div className="micro-label mb-1.5">Import chain</div>
            <div className="space-y-0.5 data-mono-dense text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1">
                <span className="text-[var(--color-node-api)]">routes</span>
                <span className="text-[var(--color-text-tertiary)]">→</span>
                <span>middleware</span>
              </div>
              <div className="flex items-center gap-1">
                <span>middleware</span>
                <span className="text-[var(--color-text-tertiary)]">→</span>
                <span className="text-[var(--color-node-storage)]">db/client</span>
              </div>
            </div>
          </FloatPanel>

          {/* Bottom-right */}
          <FloatPanel className="absolute bottom-0 right-0 hidden w-[148px] md:block lg:w-[162px]">
            <div className="micro-label mb-1.5">Coupling signal</div>
            <div className="badge-chip badge-hotspot mb-1 w-fit !text-[0.6rem]">Hotspot</div>
            <div className="data-mono-dense font-semibold text-[var(--color-text-primary)]">utils.ts</div>
            <div className="mt-0.5 flex gap-2 data-mono-dense text-[var(--color-text-tertiary)]">
              <span>in <strong className="text-[var(--color-text-primary)]">12</strong></span>
              <span>out <strong className="text-[var(--color-text-primary)]">4</strong></span>
            </div>
          </FloatPanel>
        </div>
      </div>
    </section>
  );
}

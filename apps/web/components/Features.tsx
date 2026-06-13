"use client";

import { useEffect, useState } from "react";

function InteractiveGraphIllustration() {
  const [active, setActive] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nodes = [
    { id: 0, label: "index.js", sub: "entry", color: "#8B5CF6", x: 48, y: 18 },
    { id: 1, label: "app.js", sub: "core", color: "#232F72", x: 10, y: 52 },
    { id: 2, label: "router.js", sub: "core", color: "#232F72", x: 86, y: 52 },
    { id: 3, label: "request.js", sub: "req/res", color: "#10B981", x: 10, y: 82 },
    { id: 4, label: "response.js", sub: "req/res", color: "#10B981", x: 86, y: 82 },
  ];

  const edges = [
    { from: 0, to: 1 }, { from: 0, to: 2 },
    { from: 1, to: 3 }, { from: 2, to: 4 },
  ];

  const neighbors = edges
    .filter((e) => e.from === active || e.to === active)
    .flatMap((e) => [e.from, e.to])
    .filter((n) => n !== active);

  useEffect(() => {
    if (!isHovered) return;
    setActive((a) => (a + 1) % nodes.length);
    const t = setInterval(() => setActive((a) => (a + 1) % nodes.length), 1200);
    return () => clearInterval(t);
  }, [isHovered, nodes.length]);

  const W = 240, H = 140;
  const px = (pct: number, total: number) => (pct / 100) * total;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {edges.map((e, i) => {
        const from = nodes[e.from];
        const to = nodes[e.to];
        const isHighlighted = e.from === active || e.to === active;
        const fromColor = from?.color ?? "#CBD5E1";
        return (
          <line
            key={i}
            x1={px(from?.x ?? 0, W)}
            y1={px(from?.y ?? 0, H) + 12}
            x2={px(to?.x ?? 0, W)}
            y2={px(to?.y ?? 0, H)}
            stroke={isHighlighted ? fromColor : "#E2E8F0"}
            strokeWidth={isHighlighted ? 1.5 : 1}
            strokeDasharray={isHighlighted ? "none" : "4 3"}
            style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
          />
        );
      })}
      {nodes.map((n) => {
        const isActive = n.id === active;
        const isNeighbor = neighbors.includes(n.id);
        return (
          <g key={n.id} style={{ transition: "all 0.3s" }}>
            <rect
              x={px(n.x, W) - 28}
              y={px(n.y, H) - 10}
              width={56}
              height={22}
              rx={5}
              fill={isActive ? n.color + "20" : isNeighbor ? n.color + "10" : "#F1F5F9"}
              stroke={isActive || isNeighbor ? n.color : "#E2E8F0"}
              strokeWidth={isActive ? 1.5 : 0.75}
              style={{ transition: "all 0.3s" }}
            />
            <text
              x={px(n.x, W)}
              y={px(n.y, H) + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fontWeight={isActive ? 700 : 500}
              fill={isActive ? n.color : "#475569"}
              style={{ transition: "fill 0.3s" }}
            >
              {n.label}
            </text>
            <text
              x={px(n.x, W)}
              y={px(n.y, H) + 10}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={6.5}
              fill={isActive ? n.color : "#94A3B8"}
            >
              {n.sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LargeRepoIllustration() {
  const [collapsed, setCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    setCollapsed((c) => !c);
    const t = setInterval(() => setCollapsed((c) => !c), 1400);
    return () => clearInterval(t);
  }, [isHovered]);

  const folders = [
    { label: "examples/", count: "45 files", color: "#94A3B8" },
    { label: "test/", count: "38 files", color: "#94A3B8" },
    { label: "lib/", count: "14 files", color: "#232F72" },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-center gap-2 px-2 py-1" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {/* Lib always expanded */}
      <div className="rounded-lg border border-[#232F72] bg-[#232F7210] px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#232F72]">lib/</span>
          <span className="font-mono text-[10px] text-slate-400">14 files · expanded</span>
        </div>
        <div className="mt-1.5 flex gap-1.5 flex-wrap">
          {["express.js", "application.js", "router.js", "request.js"].map((f) => (
            <span
              key={f}
              className="rounded px-1.5 py-0.5 font-mono text-[9px] text-[#232F72] bg-[#232F7215]"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* examples/ and test/ toggle */}
      {folders.slice(0, 2).map((f) => (
        <div
          key={f.label}
          className="rounded-lg border px-3 py-2 transition-all duration-500"
          style={{
            borderColor: collapsed ? "#E2E8F0" : "#CBD5E1",
            background: collapsed ? "#F1F5F9" : "#F8FAFC",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-medium transition-colors duration-300"
              style={{ color: collapsed ? "#94A3B8" : "#475569" }}
            >
              {f.label}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {collapsed ? f.count + " · hidden" : f.count + " · visible"}
            </span>
          </div>
          {!collapsed && (
            <div className="mt-1 flex gap-1">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-1.5 rounded-full bg-slate-300"
                  style={{ width: `${16 + i * 8}px` }}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      <div
        className="rounded-full border px-3 py-1 text-center font-mono text-[10px] transition-all duration-500"
        style={{
          borderColor: collapsed ? "#232F72" : "#E2E8F0",
          color: collapsed ? "#232F72" : "#94A3B8",
          background: collapsed ? "#F1F5F9" : "transparent",
        }}
      >
        {collapsed ? "83 files collapsed · graph focused on lib/" : "Showing all 97 files"}
      </div>
    </div>
  );
}

function HistoryIllustration() {
  const [tick, setTick] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    setTick((t) => (t + 1) % 4);
    const t = setInterval(() => setTick((t) => (t + 1) % 4), 1000);
    return () => clearInterval(t);
  }, [isHovered]);

  const scans = [
    { label: "Apr 14", nodes: 42, edges: 88, status: "healthy" },
    { label: "Apr 28", nodes: 51, edges: 112, status: "watch" },
    { label: "May 7", nodes: 58, edges: 134, status: "hotspot" },
    { label: "May 27", nodes: 47, edges: 93, status: "healthy" },
  ];

  const statusColor = { healthy: "#10B981", watch: "#F59E0B", hotspot: "#991B1B" };

  return (
    <div className="w-full h-full flex flex-col justify-center px-2 py-1 gap-2" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {/* Timeline */}
      <div className="relative flex items-center justify-between px-2">
        <div className="absolute left-4 right-4 h-px bg-[#E2E8F0]" />
        {scans.map((s, i) => {
          const color = statusColor[s.status as keyof typeof statusColor];
          const isActive = i === tick;
          return (
            <div key={i} className="relative flex flex-col items-center gap-1">
              <div
                className="relative z-10 h-3 w-3 rounded-full border-2 border-white transition-all duration-300"
                style={{
                  background: color,
                  boxShadow: isActive ? `0 0 0 3px ${color}40` : "none",
                  transform: isActive ? "scale(1.3)" : "scale(1)",
                }}
              />
              <span className="font-mono text-[9px] text-slate-400 whitespace-nowrap">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Active scan detail */}
      {scans[tick] && (
        <div
          className="rounded-lg border px-3 py-2.5 transition-all duration-300"
          style={{
            borderColor: statusColor[scans[tick].status as keyof typeof statusColor] + "55",
            background: statusColor[scans[tick].status as keyof typeof statusColor] + "08",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700">
              Scan · {scans[tick].label}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{
                color: statusColor[scans[tick].status as keyof typeof statusColor],
                background: statusColor[scans[tick].status as keyof typeof statusColor] + "15",
              }}
            >
              {scans[tick].status}
            </span>
          </div>
          <div className="mt-1.5 flex gap-4 font-mono text-[10px] text-slate-500">
            <span>{scans[tick].nodes} nodes</span>
            <span>{scans[tick].edges} edges</span>
          </div>
        </div>
      )}
    </div>
  );
}


export default function Features() {
  return (
    <section className="content-grid pt-4 space-y-14">
      {/* Header */}
      <div className="text-center">
        <h2 className="mt-5 section-heading">Architecture clarity. Measurable results.</h2>
        <p className="mt-4 text-[var(--color-text-secondary)] max-w-3xl mx-auto">
          Turn any public repository into a readable map. RepoLens helps teams discover how systems connect,
          reduce onboarding time, and share insights across the org.
        </p>
      </div>

      {/* ── Top 3 feature cards (like reference layout) ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

        {/* Card 1: Interactive graph */}
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
          <div className="h-48 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)] p-4 flex items-center justify-center">
            <InteractiveGraphIllustration />
          </div>
          <div className="p-5">
            <div className="micro-label text-[var(--color-accent)]">Interactive</div>
            <h3 className="mt-2 text-base font-semibold text-[var(--color-text-primary)]">
              Click any node to explore its dependencies
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              The active node and its direct neighbors highlight instantly. Trace imports, API calls, and storage relationships with a click — no reading required.
            </p>
          </div>
        </div>

        {/* Card 2: Large repo heuristics */}
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
          <div className="h-48 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)] p-4 flex items-center justify-center">
            <LargeRepoIllustration />
          </div>
          <div className="p-5">
            <div className="micro-label text-[var(--color-accent)]">Scale</div>
            <h3 className="mt-2 text-base font-semibold text-[var(--color-text-primary)]">
              Large repos stay readable with smart pruning
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Examples, tests, and fixtures collapse automatically so the graph focuses on architectural code. Expand any directory when you need the detail.
            </p>
          </div>
        </div>

        {/* Card 3: Saved analyses */}
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
          <div className="h-48 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)] p-4 flex items-center justify-center">
            <HistoryIllustration />
          </div>
          <div className="p-5">
            <div className="micro-label text-[var(--color-accent)]">History</div>
            <h3 className="mt-2 text-base font-semibold text-[var(--color-text-primary)]">
              Every scan saved and diffable over time
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Sign up to save runs, track coupling scores across deploys, and jump back into any snapshot. Share findings with teammates without re-running the analysis.
            </p>
          </div>
        </div>
      </div>

      {/* ── See the graph before you read the code ── */}
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div>
          <h3 className="mt-3 section-heading">See the graph before you read the code.</h3>
          <p className="mt-3 text-[var(--color-text-secondary)]">
            RepoLens renders a dependency map so you can identify critical nodes, bottlenecks, and disconnected
            modules before you dive into the repository.
          </p>
          <div className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {[
              "Trace imports, API calls, and storage",
              "Spot heavily coupled packages early",
              "Share a visual map with the team",
              "Keep every scan tied to history",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[280px]">
          <div className="h-[280px] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] dot-grid-bg flex items-center justify-center p-6">
            <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" role="img" aria-label="Layered architecture graph">
              {/* Layer labels */}
              <text x="6" y="30" fontSize="8" fill="#CBD5E1" fontWeight="600">entry</text>
              <text x="6" y="90" fontSize="8" fill="#CBD5E1" fontWeight="600">core</text>
              <text x="6" y="148" fontSize="8" fill="#CBD5E1" fontWeight="600">leaf</text>
              {/* Entry */}
              
              <rect x="118" y="16" width="84" height="28" rx="6" fill="#F1F5F9" stroke="#8B5CF6" strokeWidth="1.5" />
              <text x="160" y="34" textAnchor="middle" fontSize="9" fontWeight="600" fill="#8B5CF6">index.ts</text>

              <path d="M 160 44 v 16 M 160 60 h -78 v 10 M 160 60 h 78 v 10" fill="none" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 2" />

              <rect x="38" y="70" width="88" height="28" rx="6" fill="#F1F5F9" stroke="#232F72" strokeWidth="1" />
              <text x="82" y="84" textAnchor="middle" fontSize="8" fontWeight="600" fill="#232F72">server.ts</text>
              <text x="82" y="92" textAnchor="middle" fontSize="7" fill="#232F72">app factory</text>
              <rect x="194" y="70" width="88" height="28" rx="6" fill="#F1F5F9" stroke="#232F72" strokeWidth="1" />
              <text x="238" y="84" textAnchor="middle" fontSize="8" fontWeight="600" fill="#232F72">routes.ts</text>
              <text x="238" y="92" textAnchor="middle" fontSize="7" fill="#232F72">router core</text>

              <path d="M 82 98 v 20 M 82 118 h -32 v 12 M 82 118 h 48 v 12 M 238 98 v 20 M 238 118 h -32 v 12" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 2" />

              <rect x="14" y="130" width="72" height="24" rx="5" fill="#F1F5F9" stroke="#10B981" strokeWidth="0.75" />
              <text x="50" y="145" textAnchor="middle" fontSize="7" fill="#10B981">auth.middleware</text>
              <rect x="94" y="130" width="72" height="24" rx="5" fill="#F1F5F9" stroke="#10B981" strokeWidth="0.75" />
              <text x="130" y="145" textAnchor="middle" fontSize="7" fill="#10B981">rate.limiter</text>
              <rect x="174" y="130" width="66" height="24" rx="5" fill="#F1F5F9" stroke="#10B981" strokeWidth="0.75" />
              <text x="207" y="145" textAnchor="middle" fontSize="7" fill="#10B981">logger.ts</text>
              <rect x="248" y="130" width="58" height="24" rx="5" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="0.5" />
              {/* Edges core → leaf */}
              <line x1="70" y1="98" x2="50" y2="130" stroke="#6EE7B7" strokeWidth="1" />
              <line x1="95" y1="98" x2="130" y2="130" stroke="#6EE7B7" strokeWidth="1" />
              <line x1="230" y1="98" x2="207" y2="130" stroke="#6EE7B7" strokeWidth="1" />
              <line x1="250" y1="98" x2="277" y2="130" stroke="#CBD5E1" strokeWidth="0.75" strokeDasharray="3 2" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Search, ShieldCheck, Waypoints, Terminal, Layers3, GitBranch, Github } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

function PasteRepoAnimation() {
  const [typedText, setTypedText] = useState("");
  const targetText = "https://github.com/facebook/react";
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (phase === 0) {
      if (typedText.length < targetText.length) {
        timeout = setTimeout(() => {
          setTypedText(targetText.slice(0, typedText.length + 1));
        }, 40);
      } else {
        timeout = setTimeout(() => setPhase(1), 600);
      }
    } else if (phase === 1) {
      timeout = setTimeout(() => setPhase(2), 1500);
    } else if (phase === 2) {
      timeout = setTimeout(() => {
        setTypedText("");
        setPhase(0);
      }, 2000);
    }
    return () => clearTimeout(timeout);
  }, [typedText, phase]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[var(--color-bg-base)] dot-grid-bg p-6 sm:p-10 min-h-[340px]">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border-strong)] bg-white shadow-xl overflow-hidden relative z-10">
        <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-slate-300" />
            <div className="h-3 w-3 rounded-full bg-slate-300" />
            <div className="h-3 w-3 rounded-full bg-slate-300" />
          </div>
        </div>
        <div className="p-6">
          <div className="text-[10px] font-bold text-[var(--color-text-tertiary)] mb-3 uppercase tracking-widest">Target Repository</div>
          <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-300 ${phase >= 1 ? 'border-[#232F72] ring-2 ring-[#232F72]/10 bg-[#F8FAFC]' : 'border-[var(--color-border-strong)] bg-white'}`}>
            <Search className={`h-4 w-4 transition-colors ${phase >= 1 ? 'text-[#232F72]' : 'text-[var(--color-text-tertiary)]'}`} />
            <span className="font-mono text-sm text-[var(--color-text-primary)] min-h-[20px] flex items-center">
              {typedText}
              <span className={`w-1.5 h-4 ml-0.5 bg-[#232F72] animate-pulse ${phase >= 1 ? 'hidden' : 'block'}`} />
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <div className={`h-2 w-full rounded-full bg-[var(--color-bg-subtle)] overflow-hidden transition-all duration-700 ${phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <div className="h-full bg-gradient-to-r from-[#232F72] to-[#3B82F6] transition-all duration-[1500ms] ease-out" style={{ width: phase >= 1 ? '100%' : '0%' }} />
            </div>
            <div className={`text-xs text-center font-semibold transition-opacity duration-300 ${phase >= 1 ? 'opacity-100' : 'opacity-0'} ${phase === 2 ? 'text-emerald-600' : 'text-[var(--color-text-secondary)]'}`}>
              {phase === 2 ? 'Analysis complete ✓' : 'Scanning repository structure...'}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent pointer-events-none" />
    </div>
  );
}

function GraphAnimation() {
  const [activeNodes, setActiveNodes] = useState<number[]>([0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNodes(prev => {
        // Sequentially light up nodes
        const last = prev[prev.length - 1];
        const next = (last + 1) % 5;
        const newArr = [...prev, next];
        if (newArr.length > 3) newArr.shift();
        return newArr;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const nodes = [
    { id: 0, x: 25, y: 25, color: '#232F72', label: 'Gateway' },
    { id: 1, x: 75, y: 15, color: '#10B981', label: 'AuthSvc' },
    { id: 2, x: 20, y: 75, color: '#3B82F6', label: 'UserDB' },
    { id: 3, x: 80, y: 80, color: '#F59E0B', label: 'Payment' },
    { id: 4, x: 50, y: 50, color: '#8B5CF6', label: 'Core' },
  ];

  return (
    <div className="relative w-full h-full bg-[var(--color-bg-base)] dot-grid-bg p-6 flex items-center justify-center min-h-[340px]">
      <div className="relative w-full max-w-[300px] aspect-square">
        {/* Edges */}
        <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
          <path d="M 75 75 L 150 150" stroke={activeNodes.includes(0) && activeNodes.includes(4) ? "#8B5CF6" : "#E2E8F0"} strokeWidth={activeNodes.includes(0) && activeNodes.includes(4) ? "2.5" : "1.5"} strokeDasharray={activeNodes.includes(0) && activeNodes.includes(4) ? "none" : "4"} className="transition-all duration-500" />
          <path d="M 225 45 L 150 150" stroke={activeNodes.includes(1) && activeNodes.includes(4) ? "#10B981" : "#E2E8F0"} strokeWidth={activeNodes.includes(1) && activeNodes.includes(4) ? "2.5" : "1.5"} strokeDasharray={activeNodes.includes(1) && activeNodes.includes(4) ? "none" : "4"} className="transition-all duration-500" />
          <path d="M 60 225 L 150 150" stroke={activeNodes.includes(2) && activeNodes.includes(4) ? "#3B82F6" : "#E2E8F0"} strokeWidth={activeNodes.includes(2) && activeNodes.includes(4) ? "2.5" : "1.5"} strokeDasharray={activeNodes.includes(2) && activeNodes.includes(4) ? "none" : "4"} className="transition-all duration-500" />
          <path d="M 240 240 L 150 150" stroke={activeNodes.includes(3) && activeNodes.includes(4) ? "#F59E0B" : "#E2E8F0"} strokeWidth={activeNodes.includes(3) && activeNodes.includes(4) ? "2.5" : "1.5"} strokeDasharray={activeNodes.includes(3) && activeNodes.includes(4) ? "none" : "4"} className="transition-all duration-500" />
          <path d="M 75 75 L 225 45" stroke={activeNodes.includes(0) && activeNodes.includes(1) ? "#232F72" : "#E2E8F0"} strokeWidth={activeNodes.includes(0) && activeNodes.includes(1) ? "2.5" : "1.5"} strokeDasharray={activeNodes.includes(0) && activeNodes.includes(1) ? "none" : "4"} className="transition-all duration-500" />
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const isActive = activeNodes.includes(node.id);
          return (
            <div
              key={node.id}
              className={`absolute flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-10 ${isActive ? 'scale-110' : 'scale-100'}`}
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div
                className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-500`}
                style={{
                  background: node.color,
                  boxShadow: isActive ? `0 0 0 6px ${node.color}20, 0 10px 25px -5px ${node.color}60` : `0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
                }}
              >
                <Waypoints className="h-5 w-5 sm:h-6 sm:w-6 opacity-90" />
              </div>
              <div className={`mt-2 font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-[var(--color-border-subtle)] transition-all duration-300 ${isActive ? 'text-[var(--color-text-primary)] border-[var(--color-border-strong)]' : 'text-[var(--color-text-tertiary)] opacity-70'}`}>
                {node.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryAnimation() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const scans = [
    { repo: "facebook/react", status: "Success", time: "2m ago" },
    { repo: "vercel/next.js", status: "Success", time: "1h ago" },
    { repo: "tailwindlabs/tailwindcss", status: "Warning", time: "3h ago" },
    { repo: "twbs/bootstrap", status: "Success", time: "1d ago" },
    { repo: "facebook/react", status: "Success", time: "2m ago" }, // Duplicated for smooth infinite scroll effect visually if needed, though we just loop
  ];

  return (
    <div className="relative w-full h-full bg-[var(--color-bg-base)] dot-grid-bg p-6 flex items-center justify-center overflow-hidden min-h-[340px]">
      <div className="w-full max-w-sm flex flex-col gap-3 transition-transform duration-700 ease-in-out relative z-10" style={{ transform: `translateY(${-offset * 72}px)` }}>
        {scans.map((scan, i) => {
          const isFocus = i === offset;
          const isWarning = scan.status === "Warning";
          return (
            <div key={i} className={`flex items-center justify-between p-4 rounded-xl border bg-white shadow-sm transition-all duration-700 h-[60px] shrink-0 ${isFocus ? 'border-[#232F72] ring-2 ring-[#232F72]/20 shadow-md scale-[1.02] z-10 opacity-100' : 'border-[var(--color-border-subtle)] scale-100 opacity-70 blur-[0.5px]'}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isFocus ? 'bg-[#232F72] text-white' : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)]'}`}>
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className={`font-mono text-xs sm:text-sm font-semibold transition-colors ${isFocus ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>{scan.repo}</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">{scan.time}</div>
                </div>
              </div>
              <div className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${isWarning ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {scan.status}
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[var(--color-bg-base)] to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--color-bg-base)] to-transparent pointer-events-none z-20" />
    </div>
  );
}

function TerminalSection() {
  const [lines, setLines] = useState<number>(0);
  const maxLines = 4;

  useEffect(() => {
    const interval = setInterval(() => {
      setLines(l => (l + 1) % (maxLines + 2));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="surface-card overflow-hidden shadow-xl border-[#232F72]/20">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-mono font-medium text-slate-400">repolens-worker</span>
        </div>
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
        </div>
      </div>
      <div className="bg-[#0A0F1C] p-6 font-mono text-[13px] leading-relaxed text-slate-300 min-h-[260px]">
        <div className="text-indigo-400 flex gap-2">
          <span>$</span>
          <span>analyze --target=https://github.com/facebook/react</span>
        </div>

        {lines > 0 && (
          <div className="mt-3 flex gap-2">
            <span className="text-emerald-400 shrink-0">[OK]</span>
            <span className="text-slate-300">Cloning repository...</span>
          </div>
        )}

        {lines > 1 && (
          <div className="mt-1 flex gap-2">
            <span className="text-emerald-400 shrink-0">[OK]</span>
            <span className="text-slate-300">Parsing AST and resolving imports...</span>
          </div>
        )}

        {lines > 2 && (
          <div className="mt-1 flex gap-2">
            <span className="text-amber-400 shrink-0">[WARN]</span>
            <span className="text-amber-200/80">Circular dependency detected in reconciliation/</span>
          </div>
        )}

        {lines > 3 && (
          <div className="mt-1 flex gap-2">
            <span className="text-emerald-400 shrink-0">[OK]</span>
            <span className="text-slate-300">Building layout graph with 1,240 nodes...</span>
          </div>
        )}

        {lines > 4 && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-1 text-slate-400">
            <div><span className="text-indigo-400">Result:</span> Scan complete. Data persisted to storage.</div>
            <div><span className="text-indigo-400">Time:</span> 4.2s</div>
            <div className="mt-2 text-emerald-400 font-bold">READY.</div>
          </div>
        )}

        {lines <= 4 && (
          <div className="mt-1 text-slate-500 animate-pulse">_</div>
        )}
      </div>
    </div>
  );
}

const steps = [
  {
    id: "01",
    title: "Paste a repository",
    description: "Drop in any public GitHub URL. RepoLens clones the project, parses the codebase AST, and maps the internal structure automatically. No configuration needed.",
    illustration: <PasteRepoAnimation />
  },
  {
    id: "02",
    title: "Inspect the architecture",
    description: "The analyzer groups files, APIs, and storage into an interactive dependency graph. Use smart filters and node previews to understand system complexity instantly.",
    illustration: <GraphAnimation />
  },
  {
    id: "03",
    title: "Save and share results",
    description: "Every scan is permanently saved to your history. Revisit previous scans, compare architecture changes over time, and share findings seamlessly with your team.",
    illustration: <HistoryAnimation />
  },
];

export default function HowItWorksPage() {
  return (
    <main className="page-shell">
      <Header />

      <section className="relative content-grid pt-20 pb-8 sm:pt-28 sm:pb-10 overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1F2937] tracking-tight leading-[1.2] max-w-3xl">
            From repository to graph <br />
            <span className="text-[#232F72]">instantly.</span><br />
            No configuration. No setup.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[var(--color-text-secondary)] leading-relaxed max-w-2xl">
            RepoLens automatically clones repositories, parses abstract syntax trees, and renders clear, interactive dependency graphs for your team. Audit-ready and fully structured.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/#analyze" className="inline-flex items-center justify-center px-7 py-3 rounded-lg bg-[#111827] !text-white text-sm font-semibold hover:bg-[#1F2937] transition-colors shadow-sm">
              Start Analysis
            </Link>
            <Link href="/history" className="inline-flex items-center justify-center px-7 py-3 rounded-lg bg-white border border-[var(--color-border-strong)] text-[var(--color-text-primary)] text-sm font-semibold hover:bg-[var(--color-bg-subtle)] transition-colors shadow-sm">
              View History
            </Link>
          </div>
        </div>
      </section>

      {/* Core Steps - Zig Zag Layout */}
      <section className="content-grid pb-16 overflow-hidden">
        <div className="flex flex-col gap-12 sm:gap-16">
          {steps.map((step, index) => {
            const isEven = index % 2 === 1;
            return (
              <div key={step.id} className={`grid gap-10 lg:gap-16 lg:grid-cols-2 items-center`}>
                <div className={`flex flex-col relative ${isEven ? 'lg:order-last lg:pl-10' : 'lg:pr-10'}`}>
                  {/* Decorative background number */}
                  <div className="absolute -top-16 -left-8 text-[120px] font-bold text-slate-100 pointer-events-none -z-10 select-none">
                    {step.id}
                  </div>

                  <div className="badge-chip w-fit border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] mb-4">
                    Step {step.id}
                  </div>
                  <h2 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">{step.title}</h2>
                  <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--color-text-secondary)]">
                    {step.description}
                  </p>
                </div>

                <div className={`h-[340px] rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-sm overflow-hidden ${isEven ? 'lg:order-first' : ''}`}>
                  {step.illustration}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Terminal Section */}
      <section className="content-grid py-12 sm:py-16 bg-[var(--color-bg-subtle)] border-t border-[var(--color-border-subtle)]">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] items-center">
          <div>
            <div className="micro-label">Behind the scenes</div>
            <h2 className="mt-4 text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Heavy lifting, handled.</h2>
            <p className="mt-4 text-[var(--color-text-secondary)] text-lg leading-relaxed mb-8">
              The entire process from cloning to rendering is orchestrated to be as fast as possible. We analyze the AST, resolve deep imports, and layout the graph automatically.
            </p>

            <div className="space-y-6">
              {[
                { title: "Parallel Parsing", text: "AST traversal runs rapidly, capturing cross-file dependencies and API boundaries.", icon: Layers3 },
                { title: "Smart Layouts", text: "Complex cycles and clusters are mapped dynamically so the explorer stays readable.", icon: GitBranch },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-white text-[#232F72] shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-[var(--color-text-primary)]">{item.title}</div>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:pl-8">
            <TerminalSection />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

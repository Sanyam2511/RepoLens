"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  FileSearch,
  GitBranch,
  PlugZap,
  ShieldCheck,
  AlertTriangle,
  Circle,
  ArrowRight,
} from "lucide-react";

// ─── Architecture Q&A ───────────────────────────────────────────────────────
// Questions rotate vertically (slide up) every 2.5 seconds.
// Each question has a paired answer that fades in below it.
const QA_PAIRS = [
  { q: "Why is AuthService so coupled?", a: "14 inbound imports — consider splitting session logic." },
  { q: "Which files are safe to delete?", a: "3 orphaned modules with 0 inbound edges detected." },
  { q: "What breaks if I change utils.ts?", a: "9 downstream consumers across 3 packages at risk." },
  { q: "Where are my circular deps?", a: "2 cycles found: Auth ↔ User, Orders ↔ Payment." },
  { q: "Which module has the most depth?", a: "router/index.js — 4 hops from entry point." },
];

function AnalyticsBlock() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % QA_PAIRS.length);
        setVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const pair = QA_PAIRS[index];

  return (
    <div className="surface-card repo-capability-card p-4 lg:col-start-1 lg:row-start-1 overflow-hidden">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Architecture Q&amp;A</h3>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Ask about hotspots, modules, or dependencies and get a graph-aware answer.
      </p>

      <div className="mt-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-4 min-h-[110px] flex flex-col justify-between">
        {/* Question bubble */}
        <div
          className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] shadow-sm w-fit max-w-full"
          style={{
            transition: "opacity 0.35s ease, transform 0.35s ease",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-8px)",
          }}
        >
          &ldquo;{pair?.q}&rdquo;
        </div>

        {/* Answer */}
        <div
          className="mt-3 flex items-start gap-2"
          style={{
            transition: "opacity 0.35s ease 0.1s",
            opacity: visible ? 1 : 0,
          }}
        >
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          </span>
          <span className="font-mono text-xs text-[var(--color-text-secondary)]">{pair?.a}</span>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="mt-3 flex gap-1.5 justify-center">
        {QA_PAIRS.map((_, i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === index ? "16px" : "6px",
              backgroundColor: i === index ? "var(--color-accent)" : "var(--color-border-strong)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const MEMORY_STATES = ["Indexing imports…", "Mapping edges…", "Detecting cycles…", "Snapshot saved ✓"];

function MemoryBlock() {
  const [activeDoc, setActiveDoc] = useState(0);
  const [stateIdx, setStateIdx] = useState(0);
  const [brainPulse, setBrainPulse] = useState(false);

  useEffect(() => {
    const docInterval = setInterval(() => {
      setActiveDoc((d) => {
        const next = (d + 1) % 12;
        if (next === 0) {
          setBrainPulse(true);
          setTimeout(() => setBrainPulse(false), 600);
          setStateIdx((s) => (s + 1) % MEMORY_STATES.length);
        }
        return next;
      });
    }, 220);
    return () => clearInterval(docInterval);
  }, []);

  return (
    <div className="repo-memory-card repo-capability-card relative overflow-hidden rounded-xl p-6 text-white lg:col-start-2 lg:row-span-2 lg:row-start-1">
      <div className="relative z-10 text-center">
        <h3 className="text-xl font-semibold text-white">RepoLens Memory</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/75">
          Every scan teaches the workspace what changed, what matters, and where risk keeps returning.
        </p>
      </div>

      <div className="relative z-10 mt-6 grid grid-cols-4 gap-2.5">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg p-3 transition-all duration-200"
            style={{
              background: i === activeDoc ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.10)",
              boxShadow: i === activeDoc ? "0 0 0 1.5px rgba(255,255,255,0.5)" : "none",
              transform: i === activeDoc ? "scale(1.06)" : "scale(1)",
            }}
          >
            <div className="h-1.5 w-5 rounded-full" style={{ background: i === activeDoc ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }} />
            <div className="mt-2 h-1.5 rounded-full bg-white/25" />
            <div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-white/20" />
          </div>
        ))}
      </div>

      {/* Flow line */}
      <div className="relative z-10 mx-auto mt-4 flex w-fit flex-col items-center">
        <div className="relative h-10 w-px overflow-hidden bg-white/20">
          <div
            className="absolute left-0 w-px bg-white/80 rounded-full"
            style={{
              height: "40%",
              top: activeDoc === 0 ? "0%" : "-40%",
              transition: "top 0.22s linear",
              animation: "flowDown 0.88s linear infinite",
            }}
          />
        </div>

        {/* Brain core */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 transition-all duration-300"
          style={{
            background: brainPulse ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)",
            boxShadow: brainPulse ? "0 0 0 12px rgba(255,255,255,0.08)" : "0 0 0 0px rgba(255,255,255,0)",
          }}
        >
          <Brain className="h-8 w-8 text-white" />
        </div>

        {/* Status text */}
        <div className="mt-4 rounded-full bg-white/20 px-5 py-2 text-xs font-semibold text-white">
          {MEMORY_STATES[stateIdx]}
        </div>
      </div>

      <style>{`
        @keyframes flowDown {
          from { top: -40%; }
          to { top: 100%; }
        }
      `}</style>
    </div>
  );
}

const ROUTES = [
  { from: "Gateway", to: "AuthSvc", risk: "high", label: "14 imports" },
  { from: "AuthSvc", to: "UserSvc", risk: "medium", label: "6 imports" },
  { from: "UserSvc", to: "OrdersSvc", risk: "low", label: "2 imports" },
  { from: "OrdersSvc", to: "PaymentSvc", risk: "high", label: "11 imports" },
];

const RISK_COLORS = {
  high: { edge: "#EF4444", badge: "bg-red-100 text-red-700 border-red-200", label: "High" },
  medium: { edge: "#F59E0B", badge: "bg-amber-100 text-amber-700 border-amber-200", label: "Watch" },
  low: { edge: "#10B981", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Safe" },
};

function ReviewBlock() {
  const [activeRoute, setActiveRoute] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRoute((r) => (r + 1) % ROUTES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const route = ROUTES[activeRoute];
  const colors = RISK_COLORS[route?.risk as keyof typeof RISK_COLORS];

  return (
    <div className="surface-card repo-capability-card p-3 lg:col-start-3 lg:row-start-1 overflow-hidden">
      <div className="flex items-center gap-1">
        <h3 className="text-lg font-semibold">Review Routing</h3>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Risky dependency paths are flagged before a change lands.
      </p>

      <div className="mt-5 space-y-2">
        {ROUTES.map((r, i) => {
          const c = RISK_COLORS[r.risk as keyof typeof RISK_COLORS];
          const isActive = i === activeRoute;
          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-300"
              style={{
                background: isActive ? `${c.edge}12` : "transparent",
                border: `1px solid ${isActive ? c.edge + "55" : "var(--color-border-subtle)"}`,
              }}
            >
              <span
                className="font-mono text-xs font-semibold text-[var(--color-text-primary)] w-24 truncate"
              >
                {r.from}
              </span>
              <ArrowRight
                className="h-3 w-3 shrink-0 transition-colors duration-300"
                style={{ color: isActive ? c.edge : "var(--color-text-tertiary)" }}
              />
              <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)] w-24 truncate">
                {r.to}
              </span>
              <span
                className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-all duration-300 ${c.badge}`}
                style={{ opacity: isActive ? 1 : 0.45 }}
              >
                {isActive ? c.label : r.risk}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active route summary */}
      <div
        className="mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all duration-400"
        style={{
          borderColor: colors?.edge + "55",
          background: colors?.edge + "0d",
        }}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: colors?.edge }} />
        <span className="font-mono text-[var(--color-text-secondary)]">
          {route?.from} → {route?.to} · {route?.label}
        </span>
      </div>
    </div>
  );
}

const TRAIL_STEPS = [
  { label: "Cloning repo", detail: "expressjs/express" },
  { label: "Walking files", detail: "52 files found" },
  { label: "Parsing imports", detail: "ts-morph AST pass" },
  { label: "Building graph", detail: "78 nodes · 93 edges" },
  { label: "Snapshot saved", detail: "scan-main-008.json" },
];

function AuditBlock() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      const reset = setTimeout(() => { setStep(0); setDone(false); }, 1800);
      return () => clearTimeout(reset);
    }
    const t = setTimeout(() => {
      if (step < TRAIL_STEPS.length - 1) {
        setStep((s) => s + 1);
      } else {
        setDone(true);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [step, done]);

  return (
    <div className="surface-card repo-capability-card p-3 lg:col-start-1 lg:row-span-2 lg:row-start-2 overflow-hidden">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Change Trail</h3>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Every scan, saved run, and architecture shift remains traceable.
      </p>

      {/* Current file pill */}
      <div className="mt-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">
        {done ? "scan-main-008.json ✓" : TRAIL_STEPS[step]?.detail}
      </div>

      {/* Steps */}
      <div className="relative ml-2 mt-2 space-y-2 py-1">
        {/* Vertical progress line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--color-border-subtle)]">
          <div
            className="absolute left-0 w-px bg-[var(--color-accent)] transition-all duration-700 ease-in-out"
            style={{ top: 0, height: `${(step / (TRAIL_STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {TRAIL_STEPS.map((s, i) => {
          const isComplete = i < step || done;
          const isActive = i === step && !done;
          return (
            <div key={i} className="relative flex items-start gap-3 pl-1">
              {/* Node */}
              <span
                className="relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-300"
                style={{
                  borderColor: isComplete || isActive ? "var(--color-accent)" : "var(--color-border-strong)",
                  background: isComplete ? "var(--color-accent)" : isActive ? "var(--color-accent-subtle)" : "var(--color-bg-surface)",
                }}
              >
                {isComplete && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />}
              </span>

              <div>
                <span
                  className="text-sm font-medium transition-colors duration-300"
                  style={{ color: isComplete || isActive ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}
                >
                  {s.label}
                </span>
                {(isComplete || isActive) && (
                  <div className="font-mono text-xs text-[var(--color-text-tertiary)] mt-0.5">
                    {s.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const INTEGRATIONS = [
  { label: "GitHub PR", icon: "GH", color: "#6366F1", detail: "Blast radius attached" },
  { label: "Slack", icon: "SL", color: "#059669", detail: "7 hotspots notified" },
  { label: "CI/CD", icon: "CI", color: "#0891B2", detail: "Quality gate passed" },
  { label: "Jira", icon: "JR", color: "#F59E0B", detail: "3 issues created" },
];

function IntegrationsBlock() {
  const [active, setActive] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSending(true);
      setTimeout(() => {
        setSending(false);
        setActive((a) => (a + 1) % INTEGRATIONS.length);
      }, 600);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="surface-card repo-capability-card p-3 lg:col-start-2 lg:row-start-3 overflow-hidden">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Integrations</h3>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Architecture context flows into your existing team tools automatically.
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {INTEGRATIONS.map((intg, i) => {
          const isActive = i === active;
          return (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all duration-400"
              style={{
                borderColor: isActive ? intg.color + "66" : "var(--color-border-subtle)",
                background: isActive ? intg.color + "0f" : "var(--color-bg-subtle)",
              }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold text-white transition-all duration-300"
                style={{
                  background: isActive ? intg.color : "var(--color-border-strong)",
                  transform: isActive && sending ? "scale(1.12)" : "scale(1)",
                }}
              >
                {intg.icon}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{intg.label}</div>
                <div
                  className="font-mono text-[10px] truncate transition-all duration-300"
                  style={{
                    color: isActive ? intg.color : "var(--color-text-tertiary)",
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  {isActive ? intg.detail : "Standby"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MATCH_CATEGORIES = [
  { label: "Imports", icon: GitBranch, color: "var(--color-node-core)", count: "152 edges" },
  { label: "API Calls", icon: PlugZap, color: "var(--color-node-api)", count: "8 endpoints" },
  { label: "Storage", icon: Circle, color: "var(--color-node-storage)", count: "3 models" },
];

function MatchBlock() {
  const [phase, setPhase] = useState(0);
  const [matched, setMatched] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => {
        if (p >= 3) {
          setMatched(false);
          return 0;
        }
        if (p === 2) setMatched(true);
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="surface-card repo-capability-card p-3 lg:col-start-3 lg:row-span-2 lg:row-start-2 overflow-hidden">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Dependency Match</h3>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Imports, API surfaces, and storage calls are cross-checked as one unified graph.
      </p>

      <div className="mt-6 space-y-3">
        {MATCH_CATEGORIES.map((cat, i) => {
          const isScanning = phase === i;
          const isDone = phase > i || matched;
          const Icon = cat.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg  border-[var(--color-border-subtle)] px-4 py-3 transition-all duration-400"
              style={{
                borderColor: isDone ? cat.color + "55" : isScanning ? cat.color + "44" : "var(--color-border-subtle)",
                background: isDone ? cat.color.replace("var(--color-node-core)", "#6366f1").replace("var(--color-node-api)", "#7c3aed").replace("var(--color-node-storage)", "#0891b2") + "0d" : "transparent",
              }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-300"
                style={{
                  background: isDone || isScanning ? cat.color + "20" : "var(--color-bg-subtle)",
                }}
              >
                <Icon className="h-4 w-4" style={{ color: isDone || isScanning ? cat.color : "var(--color-text-tertiary)" }} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{cat.label}</div>
                <div
                  className="font-mono text-xs transition-colors duration-300"
                  style={{ color: isDone ? cat.color : "var(--color-text-tertiary)" }}
                >
                  {isScanning ? "Scanning…" : isDone ? cat.count : "Waiting"}
                </div>
              </div>
              <span
                className="text-xs font-bold transition-all duration-300"
                style={{ color: isDone ? cat.color : "transparent" }}
              >
                ✓
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-2 rounded-lg border border-[var(--color-border-subtle)] px-4 py-3 transition-all duration-500"
        style={{
          borderColor:"var(--color-border-subtle)",
          background: matched ? "var(--color-accent-subtle)" : "var(--color-bg-subtle)",
          opacity: matched ? 1 : 0.4,
          transform: matched ? "translateY(0)" : "translateY(4px)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-300"
            style={{ background: matched ? "var(--color-accent)" : "var(--color-border-strong)" }}
          >
            <CheckCircle2 className="h-3 w-3 text-white" />
          </span>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {matched ? "Full graph matched" : "Awaiting all sources"}
          </span>
        </div>
        {matched && (
          <div className="mt-1 font-mono text-xs text-[var(--color-text-secondary)]">
            163 dependencies unified · 0 conflicts
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
export default function IntelligenceLayer() {
  return (
    <section className="content-grid py-16 md:py-20">
      <div className="text-center">
        <h2 className="mx-auto mt-5 max-w-4xl section-heading text-3xl md:text-4xl">
          One intelligence layer for your repository.
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-[var(--color-text-secondary)]">
          Every capability your team needs to move from source code to architecture decisions, built into one workspace.
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:grid-rows-[300px_190px_210px]">
        <AnalyticsBlock />
        <MemoryBlock />
        <ReviewBlock />
        <AuditBlock />
        <IntegrationsBlock />
        <MatchBlock />
      </div>
    </section>
  );
}
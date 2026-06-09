"use client";

import React, { useMemo } from "react";
import { ArrowRightLeft, BarChart3, Blend, Gauge, Network, ShieldAlert } from "lucide-react";
import { RepoGraph } from "shared";
import { GraphSummary, SummaryMetricId, summarizeRepoGraph } from "../lib/graph-summary";

type AnalyzerSummaryProps = {
  graphData: RepoGraph | null;
  metric: SummaryMetricId;
  onMetricChange: (metric: SummaryMetricId) => void;
};

const METRIC_TABS: Array<{
  id: SummaryMetricId;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "coupling", label: "Coupling", icon: <Network className="h-3.5 w-3.5" /> },
  { id: "cohesion", label: "Cohesion", icon: <Blend className="h-3.5 w-3.5" /> },
  { id: "surface", label: "Surface", icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
  { id: "complexity", label: "Complexity", icon: <Gauge className="h-3.5 w-3.5" /> },
  { id: "risk", label: "Risk", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
];

const METRIC_LABELS: Record<SummaryMetricId, string> = {
  coupling: "Coupling",
  cohesion: "Cohesion",
  surface: "Surface",
  complexity: "Complexity",
  risk: "Risk",
};

const METRIC_COLORS: Record<SummaryMetricId, string> = {
  coupling: "#991B1B",
  cohesion: "#10B981",
  surface: "#232F72",
  complexity: "#8B5CF6",
  risk: "#F59E0B",
};

const gradeClass = (_direction: "higher-is-better" | "higher-is-worse", band: string) => {
  if (band === "healthy") return "badge-healthy";
  if (band === "watch") return "badge-hotspot";
  return "badge-cycle";
};

const SummarySkeleton = () => (
  <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] p-6 text-center">
    <div>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]">
        <BarChart3 className="h-5 w-5" />
      </div>
      <div className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Run an analysis to see a compact summary</div>
      <div className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">
        Choose a parameter like coupling or cohesion and the analyzer will show a condensed assessment of the repository.
      </div>
    </div>
  </div>
);

export default function AnalyzerSummary({ graphData, metric, onMetricChange }: AnalyzerSummaryProps) {
  const summary = useMemo<GraphSummary | null>(() => {
    if (!graphData || graphData.nodes.length === 0) return null;
    return summarizeRepoGraph(graphData);
  }, [graphData]);

  if (!summary) {
    return <SummarySkeleton />;
  }

  const selectedMetric = summary.metrics[metric];
  const gradeClassName = gradeClass(selectedMetric.direction, selectedMetric.band);
  const topNodes = summary.topNodes.filter((node) => node.type !== "npm-package").slice(0, 4);
  const npmDependencies = summary.npmCount;

  const scoreRows: Array<{ id: SummaryMetricId; label: string; desc: string }> = [
    { id: "coupling", label: "Coupling", desc: "How tightly modules depend on each other" },
    { id: "cohesion", label: "Circularity", desc: "Circular import cycles in the graph" },
    { id: "surface", label: "Depth", desc: "Max import chain depth / surface area" },
    { id: "complexity", label: "Staleness", desc: "Density & churn indicators" },
    { id: "risk", label: "Coverage", desc: "Blended structural risk score" },
  ];

  const overallScore = Math.round(
    (summary.metrics.coupling.score + summary.metrics.cohesion.score + summary.metrics.surface.score + summary.metrics.complexity.score + summary.metrics.risk.score) /
      5,
  );

  const ScoreRow = ({ id, label, desc }: { id: SummaryMetricId; label: string; desc: string }) => {
    const m = summary.metrics[id];
    const color = METRIC_COLORS[id];
    const pct = Math.max(0, Math.min(100, m.score));
    return (
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">{desc}</div>
            </div>
            <div className="data-mono font-semibold text-[var(--color-text-primary)]">{pct}/100</div>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] p-6">
      <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-4">
        <div className="min-w-0">
          <div className="micro-label">Summary view</div>
          <h3 className="mt-2 section-heading text-xl">Assess the repo by parameter</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
            Compact scorecards for quick actionable insights.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="metric-card">
            <div className="micro-label">Selected</div>
            <div className="mt-1 ui-label font-semibold text-[var(--color-text-primary)]">{METRIC_LABELS[metric]}</div>
          </div>

          <div className="flex flex-col items-end">
            <div className="inline-flex items-center gap-3 rounded-lg bg-[var(--color-bg-inverse)] px-4 py-2 text-[var(--color-text-inverse)]">
              <div className="text-sm font-semibold">Overall</div>
              <div className="data-mono font-semibold">{overallScore}</div>
            </div>
            <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">Weighted average of metrics</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {METRIC_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onMetricChange(tab.id)}
            className={`inline-flex items-center gap-1.5 badge-chip transition ${
              metric === tab.id ? "badge-accent" : "border border-[var(--color-border-strong)] text-[var(--color-text-secondary)]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 compact-card p-4 text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)]">
        <div className="micro-label">What this means</div>
        <div className="mt-2 font-semibold text-[var(--color-text-primary)]">{selectedMetric.label}</div>
        <div className="mt-1">{selectedMetric.description}</div>
        <div className="mt-2">{selectedMetric.insight}</div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="compact-card p-5">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">Repository scorecard</div>
            <div className="mt-4 grid gap-4">
              {scoreRows.map((r) => (
                <ScoreRow key={r.id} id={r.id} label={r.label} desc={r.desc} />
              ))}
            </div>
          </div>

          <div className="compact-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="micro-label">Focus area</div>
                <div className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">Current assessment</div>
              </div>
              <div className={`badge-chip ${gradeClassName}`}>
                {selectedMetric.insight}
              </div>
            </div>

            <div className="mt-4 divide-y divide-[var(--color-border-subtle)] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-sm">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-[var(--color-text-secondary)]">Primary signal</span>
                <span className="data-mono font-semibold text-[var(--color-text-primary)]">{selectedMetric.primaryValue}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-[var(--color-text-secondary)]">Graph scale</span>
                <span className="data-mono font-semibold text-[var(--color-text-primary)]">{summary.totalNodes} nodes</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-[var(--color-text-secondary)]">Boundary mix</span>
                <span className="data-mono font-semibold text-[var(--color-text-primary)]">{summary.crossClusterImports} cross imports</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="compact-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">Top hotspots</div>
              {npmDependencies > 0 ? (
                <div className="data-mono-dense text-[var(--color-text-tertiary)]">{npmDependencies} external deps grouped</div>
              ) : null}
            </div>
            <div className="mt-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {topNodes.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">No internal hotspots detected yet.</div>
                ) : (
                  topNodes.map((node) => (
                    <div key={`${node.label}-${node.degree}`} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{node.label}</div>
                        <div className="data-mono-dense text-[var(--color-text-tertiary)]">{node.clusterLabel}</div>
                      </div>
                      <div className="badge-chip shrink-0 border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
                        <span className="data-mono-dense">{node.degree}</span> links
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">Hotspots show internal files and modules only.</div>
          </div>

          <div className="compact-card p-5">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">Repository signals</div>
            <div className="mt-3 divide-y divide-[var(--color-border-subtle)] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
              {[
                ["Coupling", summary.metrics.coupling.score, METRIC_COLORS.coupling],
                ["Cohesion", summary.metrics.cohesion.score, METRIC_COLORS.cohesion],
                ["Surface area", summary.metrics.surface.score, METRIC_COLORS.surface],
                ["Complexity", summary.metrics.complexity.score, METRIC_COLORS.complexity],
                ["Risk", summary.metrics.risk.score, METRIC_COLORS.risk],
              ].map(([label, value, color]) => (
                <div key={label as string} className="grid gap-1.5 px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                    <span>{label as string}</span>
                    <span className="data-mono font-semibold text-[var(--color-text-primary)]">{value as number}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-bg-subtle)]">
                    <div className="h-full rounded-full" style={{ width: `${value as number}%`, background: color as string }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

const NODE_COLORS = {
  file: "#2563eb",
  api: "#0f766e",
  storage: "#d97706",
  folder: "#7c3aed",
} as const;

const METRIC_COLORS: Record<SummaryMetricId, string> = {
  coupling: "#dc2626",
  cohesion: "#059669",
  surface: "#0284c7",
  complexity: "#7c3aed",
  risk: "#be123c",
};

const SIGNAL_COLORS = {
  internal: "#059669",
  cross: "#dc2626",
  external: "#f59e0b",
} as const;

const gradeClass = (direction: "higher-is-better" | "higher-is-worse", band: string) => {
  if (direction === "higher-is-better") {
    return band === "healthy"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : band === "watch"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";
  }

  return band === "healthy"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : band === "watch"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700";
};

const arcPath = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const toPoint = (angle: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
  };

  const start = toPoint(startAngle);
  const end = toPoint(endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

const SummarySkeleton = () => (
  <div className="flex h-full min-h-0 items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-6 text-center text-slate-600">
    <div>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <BarChart3 className="h-5 w-5" />
      </div>
      <div className="mt-4 text-lg font-semibold text-slate-900">Run an analysis to see a compact summary</div>
      <div className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        Choose a parameter like coupling or cohesion and the analyzer will show a condensed assessment of the repository.
      </div>
    </div>
  </div>
);

const StatBar = ({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) => (
  <div className="grid gap-1.5">
    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-500">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="h-2 rounded-full bg-slate-100">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(6, Math.min(100, (value / Math.max(1, maxValue)) * 100))}%`, background: color }}
      />
    </div>
  </div>
);

const MiniBar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => (
  <div className="grid gap-1.5">
    <div className="flex items-center justify-between text-xs text-slate-600">
      <span>{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
    <div className="h-2 rounded-full bg-slate-100">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(6, Math.min(100, (value / Math.max(1, total)) * 100))}%`, background: color }}
      />
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
  const topClusters = summary.clusters.slice(0, 5);
  const topNodes = summary.topNodes.slice(0, 4);
  const totalSignals = summary.fileCount + summary.apiCount + summary.storageCount + summary.folderCount;
  const chartSegments = [
    { label: "Files", value: summary.fileCount, color: NODE_COLORS.file },
    { label: "APIs", value: summary.apiCount, color: NODE_COLORS.api },
    { label: "Storage", value: summary.storageCount, color: NODE_COLORS.storage },
    { label: "Folders", value: summary.folderCount, color: NODE_COLORS.folder },
  ];
  const boundarySegments = [
    { label: "Internal imports", value: summary.internalImports, color: SIGNAL_COLORS.internal },
    { label: "Cross-cluster imports", value: summary.crossClusterImports, color: SIGNAL_COLORS.cross },
    { label: "Other edges", value: summary.externalEdges, color: SIGNAL_COLORS.external },
  ];
  const gaugeAngle = 180 + (selectedMetric.score / 100) * 180;
  const gaugeColor = METRIC_COLORS[metric];
  const gaugePath = arcPath(70, 70, 46, 180, gaugeAngle);

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
              <div className="text-sm font-semibold text-slate-900">{label}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </div>
            <div className="text-sm font-semibold text-slate-900">{pct}/100</div>
          </div>

          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_54px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between border-b border-slate-200/80 pb-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Summary view</div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">Assess the repo by parameter</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Compact scorecards for quick actionable insights.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-3 text-sm text-slate-700">
            <div className="text-xs text-slate-500">Selected</div>
            <div className="mt-1 font-semibold text-slate-900">{METRIC_LABELS[metric]}</div>
          </div>

          <div className="flex flex-col items-end">
            <div className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-2 text-white">
              <div className="text-sm font-semibold">Overall</div>
              <div className="rounded-full bg-white/10 px-3 py-1 font-mono text-sm font-semibold">{overallScore}</div>
            </div>
            <div className="mt-2 text-xs text-slate-500">Weighted average of metrics</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Repository scorecard</div>
            <div className="mt-3 grid gap-3">
              {scoreRows.map((r) => (
                <ScoreRow key={r.id} id={r.id} label={r.label} desc={r.desc} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Focus area</div>
                <div className="mt-1 text-base font-semibold text-slate-900">Current assessment</div>
              </div>
              <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${gradeClassName}`}>
                {selectedMetric.insight}
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2">
                <span>Primary signal</span>
                <span className="font-semibold text-slate-900">{selectedMetric.primaryValue}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2">
                <span>Graph scale</span>
                <span className="font-semibold text-slate-900">{summary.totalNodes} nodes</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2">
                <span>Boundary mix</span>
                <span className="font-semibold text-slate-900">{summary.crossClusterImports} cross imports</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Top hotspots</div>
            <div className="mt-3 grid gap-2">
              {topNodes.map((node) => (
                <div key={`${node.label}-${node.degree}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{node.label}</div>
                    <div className="text-xs text-slate-500">{node.clusterLabel}</div>
                  </div>
                  <div className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{node.degree} links</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Repository signals</div>
            <div className="mt-3 grid gap-2">
              {[
                ["Coupling", summary.metrics.coupling.score, METRIC_COLORS.coupling],
                ["Cohesion", summary.metrics.cohesion.score, METRIC_COLORS.cohesion],
                ["Surface area", summary.metrics.surface.score, METRIC_COLORS.surface],
                ["Complexity", summary.metrics.complexity.score, METRIC_COLORS.complexity],
                ["Risk", summary.metrics.risk.score, METRIC_COLORS.risk],
              ].map(([label, value, color]) => (
                <div key={label as string} className="grid gap-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{label as string}</span>
                    <span className="font-semibold text-slate-900">{value as number}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
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

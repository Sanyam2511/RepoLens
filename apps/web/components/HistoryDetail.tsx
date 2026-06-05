"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { workerFetch } from "../lib/auth";
import { summarizeRepoGraph } from "../lib/graph-summary";
import type { RepoGraph } from "shared";

export default function HistoryDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await workerFetch(`/history/${encodeURIComponent(id)}`);
        if (!res.ok) {
          setItem(null);
          return;
        }
        const payload = await res.json();
        if (!mounted) return;
        const analysis = payload?.analysis ?? payload;
        setItem(analysis);
      } catch (e) {
        setItem(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const panel = (content: React.ReactNode) => (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/20">
      <div className="w-full max-w-4xl rounded-t-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] p-6">
        {content}
      </div>
    </div>
  );

  if (loading) {
    return panel(<div className="data-mono text-[var(--color-text-secondary)]">Loading…</div>);
  }

  if (!item) {
    return panel(
      <>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">Scan detail</div>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"><X /></button>
        </div>
        <div className="mt-3 text-sm text-[var(--color-text-secondary)]">Unable to load scan details.</div>
      </>
    );
  }

  const graph: RepoGraph | undefined = (item && (item.graphJson ?? item.graph)) as RepoGraph | undefined;
  let summary = null;
  try {
    if (graph) summary = summarizeRepoGraph(graph);
  } catch (e) {
    console.error("Failed to summarize graph:", e);
  }

  return panel(
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="data-mono font-semibold text-[var(--color-text-primary)]">
            {item.repoUrl ? new URL(item.repoUrl).pathname.replace(/\//g, " / ") : "Scan detail"}
          </div>
          <div className="data-mono-dense text-[var(--color-text-tertiary)]">{new Date(item.createdAt).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="data-mono text-[var(--color-text-primary)]">
            {summary ? `${summary.metrics.risk.score}/100 risk` : "—"}
          </div>
          <button onClick={onClose} className="btn-secondary p-2"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="metric-card">
          <div className="micro-label">Nodes</div>
          <div className="mt-1 data-mono font-semibold text-[var(--color-text-primary)]">{summary ? summary.totalNodes : "—"}</div>
          <div className="data-mono-dense text-[var(--color-text-secondary)]">{summary ? `${summary.totalEdges} edges` : ""}</div>
        </div>

        <div className="metric-card">
          <div className="micro-label">Top hotspots</div>
          <div className="mt-2 grid gap-2">
            {summary ? summary.topNodes.map((n) => (
              <div key={n.label} className="data-mono-dense text-[var(--color-text-secondary)]">{n.label} — {n.degree} links</div>
            )) : <div className="text-sm text-[var(--color-text-tertiary)]">No graph summary available</div>}
          </div>
        </div>

        <div className="metric-card">
          <div className="micro-label">Clusters</div>
          <div className="mt-2 data-mono text-[var(--color-text-primary)]">{summary ? `${summary.clusterCount} clusters` : "—"}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">Metric breakdown</div>
        <div className="grid gap-2">
          {summary ? (
            Object.values(summary.metrics).map((m) => (
              <div key={m.id} className="grid gap-1.5">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{m.label}</span>
                  <span className="data-mono font-semibold text-[var(--color-text-primary)]">{m.score}/100</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-bg-subtle)]">
                  <div className="h-full rounded-full" style={{ width: `${m.score}%`, background: m.accent }} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-[var(--color-text-tertiary)]">No metric data available</div>
          )}
        </div>
      </div>
    </>
  );
}

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
        // worker returns { analysis } for /history/:id, but some endpoints may return the analysis directly
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

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center">
        <div className="w-full max-w-4xl rounded-t-2xl bg-white p-6 shadow-lg">Loading…</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center">
        <div className="w-full max-w-4xl rounded-t-2xl bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Scan detail</div>
            <button onClick={onClose} className="text-slate-600"><X /></button>
          </div>
          <div className="mt-3 text-sm text-slate-600">Unable to load scan details.</div>
        </div>
      </div>
    );
  }

  const graph: RepoGraph | undefined = (item && (item.graphJson ?? item.graph)) as RepoGraph | undefined;
  let summary = null;
  try {
    if (graph) summary = summarizeRepoGraph(graph);
  } catch (e) {
    console.error("Failed to summarize graph:", e);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="w-full max-w-4xl rounded-t-2xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{item.repoUrl ? new URL(item.repoUrl).pathname.replace(/\//g, " ") : "Scan detail"}</div>
            <div className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-mono text-slate-900">{summary ? `${summary.metrics.risk.score}/100 risk` : "—"}</div>
            <button onClick={onClose} className="rounded-full border p-2 text-slate-600"><X /></button>
          </div>
        </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Nodes</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{summary ? summary.totalNodes : "—"}</div>
            <div className="text-sm text-slate-600">{summary ? `${summary.totalEdges} edges` : ""}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Top hotspots</div>
            <div className="mt-2 grid gap-2">
              {summary ? summary.topNodes.map((n) => (
                <div key={n.label} className="text-sm text-slate-800">{n.label} — {n.degree} links</div>
              )) : <div className="text-sm text-slate-600">No graph summary available</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Clusters</div>
            <div className="mt-2 text-sm text-slate-800">{summary.clusterCount} clusters</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="text-sm font-semibold text-slate-900">Metric breakdown</div>
          <div className="grid gap-2">
            {Object.values(summary.metrics).map((m) => (
              <div key={m.id} className="grid gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{m.label}</span>
                  <span className="font-semibold text-slate-900">{m.score}/100</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${m.score}%`, background: m.accent }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

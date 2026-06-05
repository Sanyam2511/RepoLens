"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { workerFetch, getStoredAuthUser } from "../lib/auth";
import HistoryDetail from "./HistoryDetail";

type Scan = {
  id: string;
  date: string;
  label: string;
  repoUrl?: string;
  nodes: number;
  score: number;
  changeType: "improved" | "regressed" | "same";
};

export default function HistoryTimeline({ repo }: { repo?: string }) {
  const [scans, setScans] = useState<Scan[] | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const user = getStoredAuthUser();
        if (!user) {
          setScans([]);
          return;
        }
        const url = `/history` + (repo ? `?repo=${encodeURIComponent(repo)}` : "");
        const res = await workerFetch(url);
        if (!res.ok) {
          setScans([]);
          return;
        }
        const payload = await res.json();
        const data: any[] = Array.isArray(payload.history) ? payload.history : [];
        if (!mounted) return;
        const mapped = data.map((item) => ({
          id: item.id,
          date: item.createdAt || item.date,
          label: item.commitSha || item.label || getRepoLabel(item.repoUrl),
          repoUrl: item.repoUrl,
          nodes: item.nodeCount || (item.graphJson?.nodes?.length ?? 0),
          score: 0,
          changeType: "same",
        } as Scan));
        setScans(mapped);
      } catch (e) {
        setScans([]);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [repo]);

  const repos = Array.from(new Set((scans || []).map((s) => s.repoUrl).filter(Boolean))) as string[];
  const [selectedRepo, setSelectedRepo] = useState<string | null>(() => (repo ? repo : repos[0] ?? null));

  useEffect(() => {
    if (!selectedRepo && repos.length > 0) setSelectedRepo(repos[0]);
  }, [repos, selectedRepo]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getRepoLabel = (repoUrl?: string) => {
    try {
      if (!repoUrl) return "repo";
      const parsed = new URL(repoUrl);
      const parts = parsed.pathname.split("/").filter(Boolean);
      return parts.slice(-2).join("/") || repoUrl;
    } catch {
      return repoUrl || "repo";
    }
  };

  if (!scans) {
    return (
      <div className="compact-card p-6 text-center text-[var(--color-text-secondary)]">Loading scan history…</div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="compact-card p-6 text-center text-[var(--color-text-secondary)]">No scans available</div>
    );
  }

  const scansForRepo = selectedRepo ? scans.filter((s) => s.repoUrl === selectedRepo) : scans;

  if (scansForRepo.length === 0) {
    return (
      <div className="compact-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">Scan history</div>
            <div className="text-xs text-[var(--color-text-tertiary)]">No scans for selected repository</div>
          </div>
          {repos.length > 1 ? (
            <select value={selectedRepo ?? undefined} onChange={(e) => setSelectedRepo(e.target.value)} className="input-field text-sm py-2">
              {repos.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="compact-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">Scan history</div>
          <div className="data-mono-dense text-[var(--color-text-tertiary)]">
            Showing recent scans for {selectedRepo ?? "your repos"}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {repos.length > 0 ? (
            <select value={selectedRepo ?? undefined} onChange={(e) => setSelectedRepo(e.target.value)} className="input-field text-sm py-2">
              <option value="">All repos</option>
              {repos.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          ) : null}
          <Link href="/history" className="btn-ghost text-sm py-2 px-3">View full timeline</Link>
        </div>
      </div>

      <div className="mt-6 relative">
        <div className="h-px w-full bg-[var(--color-border-subtle)]" />
        <div className="absolute left-0 right-0 top-0 mt-[-12px] flex items-center justify-between gap-2">
          {scansForRepo.slice(0, 8).map((scan) => (
            <button key={scan.id} onClick={() => setSelectedId(scan.id)} className="flex-1 flex flex-col items-center focus:outline-none">
              <div className={`h-6 w-6 rounded-full border-2 ${
                scan.changeType === "improved"
                  ? "border-[var(--color-healthy)] bg-[var(--color-healthy-subtle)]"
                  : scan.changeType === "regressed"
                    ? "border-[var(--color-cycle)] bg-[var(--color-cycle-subtle)]"
                    : "border-[var(--color-border-strong)] bg-[var(--color-bg-surface)]"
              }`} />
              <div className="mt-2 w-28 compact-card p-2 text-center">
                <div className="data-mono-dense font-semibold text-[var(--color-text-primary)] truncate">{scan.label}</div>
                <div className="data-mono-dense text-[var(--color-text-tertiary)]">{scan.nodes} nodes</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedId ? (
        <HistoryDetail id={selectedId} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
}

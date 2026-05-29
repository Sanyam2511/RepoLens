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
        // map to Scan shape
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

  // derive repo list and selected repo
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
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-slate-600">Loading scan history…</div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-slate-600">No scans available</div>
    );
  }

  const scansForRepo = selectedRepo ? scans.filter((s) => s.repoUrl === selectedRepo) : scans;

  if (scansForRepo.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Scan history</div>
            <div className="text-xs text-slate-500">No scans for selected repository</div>
          </div>
          {repos.length > 1 ? (
            <select value={selectedRepo ?? undefined} onChange={(e) => setSelectedRepo(e.target.value)} className="text-sm border rounded px-2 py-1">
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
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Scan history</div>
          <div className="text-xs text-slate-500">Showing recent scans for {selectedRepo ?? 'your repos'}</div>
        </div>
        <div className="flex items-center gap-3">
          {repos.length > 0 ? (
            <select value={selectedRepo ?? undefined} onChange={(e) => setSelectedRepo(e.target.value)} className="text-sm border rounded px-2 py-1">
              <option value="">All repos</option>
              {repos.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          ) : null}
          <Link href="/history" className="text-sm font-semibold text-slate-700 underline">View full timeline</Link>
        </div>
      </div>

      <div className="mt-6 relative">
        <div className="h-1 w-full rounded bg-slate-100" />
        <div className="absolute left-0 right-0 top-0 mt-[-12px] flex items-center justify-between gap-2">
          {scansForRepo.slice(0, 8).map((scan) => (
            <button key={scan.id} onClick={() => setSelectedId(scan.id)} className="flex-1 flex flex-col items-center focus:outline-none">
              <div className={`h-6 w-6 rounded-full border-2 ${
                scan.changeType === "improved" ? "border-emerald-500 bg-emerald-50" : scan.changeType === "regressed" ? "border-rose-500 bg-rose-50" : "border-slate-300 bg-white"
              }`} />
              <div className="mt-2 w-28 rounded-xl border bg-white/90 p-2 text-center text-xs text-slate-700">
                <div className="font-semibold">{scan.label}</div>
                <div className="text-[12px] text-slate-500">{scan.nodes} nodes</div>
                <div className="text-[12px] font-mono text-slate-900">{scan.score}</div>
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

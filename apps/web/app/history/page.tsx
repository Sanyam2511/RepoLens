"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileStack,
  FolderOpen,
  History,
  Loader2,
  Search,
  Sparkles,
  GitBranch,
} from "lucide-react";
import { AnalysisHistoryRecord, RepoNode } from "shared";
import { AUTH_CHANGED_EVENT, clearAuthSession, getStoredAuthUser, workerFetch } from "../../lib/auth";

type HistoryFilter = "all" | "connected" | "needs-review";

type NodeSummary = {
  label: string;
  type: RepoNode["type"];
};

const getRepoName = (repoUrl: string) => {
  try {
    const parsed = new URL(repoUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[1]?.replace(/\.git$/i, "") || parts[0] || repoUrl;
  } catch {
    return repoUrl;
  }
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const summarizeGraph = (graph: AnalysisHistoryRecord["graphJson"]) => {
  const counts: Record<RepoNode["type"], number> = {
    file: 0,
    "api-endpoint": 0,
    storage: 0,
    folder: 0,
  };

  const degreeMap = new Map<string, number>();
  graph.nodes.forEach((node) => {
    counts[node.type] = (counts[node.type] ?? 0) + 1;
    degreeMap.set(node.id, degreeMap.get(node.id) ?? 0);
  });

  graph.edges.forEach((edge) => {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
  });

  const topConnected = graph.nodes
    .map((node) => ({
      label: node.label,
      type: node.type,
      degree: degreeMap.get(node.id) ?? 0,
    }))
    .sort((left, right) => right.degree - left.degree)
    .filter((node) => node.degree > 0)
    .slice(0, 6);

  const previewNodes = graph.nodes
    .filter((node) => node.type === "folder" || node.type === "file")
    .slice(0, 8)
    .map((node) => ({ label: node.label, type: node.type } satisfies NodeSummary));

  return { counts, topConnected, previewNodes };
};

export default function HistoryPage() {
  const [history, setHistory] = useState<AnalysisHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState(getStoredAuthUser());

  useEffect(() => {
    const syncAuth = () => setAuthUser(getStoredAuthUser());
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError("");

      if (!authUser) {
        setHistory([]);
        setSelectedId(null);
        setLoading(false);
        setError("Sign in to view your saved history.");
        return;
      }

      try {
        const response = await workerFetch("/history");
        if (!response.ok) {
          if (response.status === 401) {
            clearAuthSession();
            setAuthUser(null);
            setHistory([]);
            setSelectedId(null);
            setError("Your session expired. Sign in again to continue.");
            return;
          }

          throw new Error(`History request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const items = Array.isArray(payload.history) ? (payload.history as AnalysisHistoryRecord[]) : [];
        setHistory(items);
        setSelectedId((current) => current ?? items[0]?.id ?? null);
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to load analysis history right now.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [authUser]);

  const visibleHistory = useMemo(() => {
    const text = query.trim().toLowerCase();

    return history.filter((item) => {
      const repoName = getRepoName(item.repoUrl).toLowerCase();
      const matchesQuery =
        text.length === 0 ||
        repoName.includes(text) ||
        item.repoUrl.toLowerCase().includes(text) ||
        item.commitSha?.toLowerCase().includes(text) === true;

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "connected"
            ? item.edgeCount > 0
            : item.edgeCount === 0;

      return matchesQuery && matchesFilter;
    });
  }, [filter, history, query]);

  useEffect(() => {
    if (visibleHistory.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !visibleHistory.some((item) => item.id === selectedId)) {
      setSelectedId(visibleHistory[0].id);
    }
  }, [selectedId, visibleHistory]);

  const selectedAnalysis = useMemo(
    () => visibleHistory.find((item) => item.id === selectedId) ?? null,
    [selectedId, visibleHistory]
  );

  const selectedSummary = useMemo(() => {
    if (!selectedAnalysis) {
      return null;
    }

    return summarizeGraph(selectedAnalysis.graphJson);
  }, [selectedAnalysis]);

  const totalAnalyses = history.length;
  const connectedAnalyses = history.filter((item) => item.edgeCount > 0).length;
  const emptyState = !loading && visibleHistory.length === 0;

  return (
    <div className="min-h-screen page-sky text-slate-900">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 12%, rgba(219, 234, 254, 0.85), transparent 52%), radial-gradient(circle at 82% 12%, rgba(191, 219, 254, 0.6), transparent 48%), radial-gradient(circle at 20% 88%, rgba(224, 231, 255, 0.55), transparent 54%)",
          }}
        />
        <div className="absolute -top-32 -right-20 h-[280px] w-[280px] rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute -bottom-36 -left-20 h-[380px] w-[380px] rounded-full bg-emerald-100/70 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 section-wave border border-slate-200/70 bg-white/90 p-4 backdrop-blur">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5" /> RepoLens History
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Past searches and saved graph structures</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review previous repository scans, inspect their structural output, and reopen any analysis directly in the main analyzer.
            </p>
            {authUser ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Signed in as {authUser.name}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Back home
            </Link>
            {authUser ? (
              <button
                type="button"
                onClick={() => {
                  clearAuthSession();
                  setAuthUser(null);
                  setHistory([]);
                  setSelectedId(null);
                  setError("Sign in to view your saved history.");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Sign out
              </button>
            ) : (
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                Sign in
              </Link>
            )}
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
              Analyze new repo <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="soft-card rounded-3xl bg-white/90 p-4 backdrop-blur">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <History className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Saved runs</div>
                <div className="text-lg font-semibold text-slate-900">{totalAnalyses}</div>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Search history</span>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-slate-900/10">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Repo name, URL, commit sha"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filters</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "connected", label: "Connected" },
                  { key: "needs-review", label: "Needs review" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key as HistoryFilter)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      filter === item.key
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Connected analyses</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{connectedAnalyses}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Needs review</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{history.filter((item) => item.edgeCount === 0).length}</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">How to use</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>Open any saved search to inspect its structure panel.</li>
                <li>Use the analyzer link to rerun the repository with the latest backend.</li>
                <li>Filter to find sparse graphs that may need review.</li>
              </ul>
            </div>
          </aside>

          <main className="soft-card rounded-3xl bg-white/90 p-4 backdrop-blur">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Analysis gallery</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{visibleHistory.length} result{visibleHistory.length === 1 ? "" : "s"}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <GitBranch className="h-4 w-4" />
                Graphs are pulled from the worker database
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80">
                <div className="flex items-center gap-3 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading history...
                </div>
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-rose-700">
                <div className="text-lg font-semibold">Access required</div>
                <p className="mt-2 text-sm leading-6">{error}</p>
                {!authUser ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/login" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                      Sign in
                    </Link>
                    <Link href="/signup" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                      Create account
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : emptyState ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
                <FileStack className="h-12 w-12 text-slate-300" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">No matching history entries</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Clear the search or switch filters to see past repository scans.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleHistory.map((item) => {
                  const summary = summarizeGraph(item.graphJson);
                  const isSelected = item.id === selectedId;
                  const repoName = getRepoName(item.repoUrl);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`group rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                        isSelected
                          ? "border-slate-900 bg-slate-950 text-white shadow-lg"
                          : "border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isSelected ? "bg-white/10 text-amber-200" : "bg-amber-50 text-amber-700"}`}>
                          <FolderOpen className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-base font-semibold">{repoName}</div>
                          <div className={`mt-1 truncate text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                            {item.repoUrl}
                          </div>
                        </div>
                      </div>

                      <div className={`mt-4 grid grid-cols-3 gap-2 text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                        <div className={`rounded-2xl border p-2 ${isSelected ? "border-white/15 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                          <div className="uppercase tracking-[0.16em]">Nodes</div>
                          <div className="mt-1 text-sm font-semibold">{item.nodeCount}</div>
                        </div>
                        <div className={`rounded-2xl border p-2 ${isSelected ? "border-white/15 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                          <div className="uppercase tracking-[0.16em]">Edges</div>
                          <div className="mt-1 text-sm font-semibold">{item.edgeCount}</div>
                        </div>
                        <div className={`rounded-2xl border p-2 ${isSelected ? "border-white/15 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                          <div className="uppercase tracking-[0.16em]">Updated</div>
                          <div className="mt-1 text-sm font-semibold">{formatDate(item.updatedAt).split(",")[0]}</div>
                        </div>
                      </div>

                      <div className={`mt-4 rounded-2xl border p-3 ${isSelected ? "border-white/15 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                        <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                          Structure preview
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {summary.previewNodes.slice(0, 4).map((node) => (
                            <span
                              key={`${item.id}-${node.label}`}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                isSelected ? "bg-white/10 text-white" : "bg-white text-slate-700"
                              }`}
                            >
                              {node.type === "folder" ? "🗂️" : "📄"} {node.label}
                            </span>
                          ))}
                          {summary.previewNodes.length === 0 && (
                            <span className={`text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}>No preview nodes available</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </main>

          <aside className="soft-card rounded-3xl bg-white/90 p-4 backdrop-blur">
            {selectedAnalysis && selectedSummary ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Selected analysis</div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">{getRepoName(selectedAnalysis.repoUrl)}</h2>
                  <p className="mt-2 break-all text-sm leading-6 text-slate-600">{selectedAnalysis.repoUrl}</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Node types</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(selectedSummary.counts).map(([type, count]) => (
                        <div key={type} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{type}</div>
                          <div className="mt-1 text-lg font-semibold text-slate-900">{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Graph stats</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p>Nodes: <span className="font-semibold text-slate-900">{selectedAnalysis.nodeCount}</span></p>
                      <p>Edges: <span className="font-semibold text-slate-900">{selectedAnalysis.edgeCount}</span></p>
                      <p>Last analyzed: <span className="font-semibold text-slate-900">{formatDate(selectedAnalysis.updatedAt)}</span></p>
                      <p>Commit: <span className="font-semibold text-slate-900">{selectedAnalysis.commitSha ?? "Unknown"}</span></p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Most connected nodes</div>
                  <div className="mt-3 space-y-2">
                    {selectedSummary.topConnected.length > 0 ? (
                      selectedSummary.topConnected.map((node) => (
                        <div key={`${selectedAnalysis.id}-${node.label}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 text-sm font-medium text-slate-900 truncate">{node.label}</div>
                            <div className="text-xs text-slate-500">{node.degree} links</div>
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{node.type}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No connected nodes were detected for this run.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={`/?repoUrl=${encodeURIComponent(selectedAnalysis.repoUrl)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Open in analyzer <ExternalLink className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Analyze another repo
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
                <Clock3 className="h-12 w-12 text-slate-300" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">Pick a past search</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Select a saved analysis to see its graph summary and reopen it in the analyzer.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

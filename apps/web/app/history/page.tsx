"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Search,
  Sparkles,
} from "lucide-react";
import { AnalysisHistoryRecord, RepoNode } from "shared";
import { AUTH_CHANGED_EVENT, clearAuthSession, getStoredAuthUser, workerFetch } from "../../lib/auth";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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

const getSectionLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Earlier";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

  const groupedHistory = useMemo(() => {
    const grouped = new Map<string, AnalysisHistoryRecord[]>();

    [...visibleHistory]
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .forEach((item) => {
        const label = getSectionLabel(item.updatedAt);
        const items = grouped.get(label) ?? [];
        items.push(item);
        grouped.set(label, items);
      });

    return Array.from(grouped.entries()).map(([label, items]) => ({ label, items }));
  }, [visibleHistory]);

  const emptyState = !loading && visibleHistory.length === 0;
  const tableMessage = error || (authUser ? "No searches yet. Run an analysis to populate this table." : "Sign in to view your saved searches.");

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

      <Header />

      <main className="relative z-10">
        <section className="mx-auto w-[min(1500px,94vw)] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="border-b border-slate-200/70 pb-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  <Sparkles className="h-3.5 w-3.5" /> RepoLens History
                </div>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Past searches and saved graph structures</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review previous repository scans, inspect their structural output, and reopen any analysis directly in the main analyzer.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-[min(1500px,94vw)] px-4 py-6 sm:px-6 lg:px-8">
          <div className="border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Analysis gallery</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {loading ? "Loading saved searches" : `${visibleHistory.length} result${visibleHistory.length === 1 ? "" : "s"}`}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 rounded-none border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-within:ring-2 focus-within:ring-slate-900/10">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Repo name, URL, commit sha"
                      className="w-[260px] bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    {[
                      { key: "all", label: "All" },
                      { key: "connected", label: "Connected" },
                      { key: "needs-review", label: "Needs review" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFilter(item.key as HistoryFilter)}
                        className={`rounded-none border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
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
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[1100px]">
                  <div className="grid grid-cols-[minmax(220px,1.5fr)_120px_100px_100px_130px_120px_128px] items-center gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <div>Repository</div>
                    <div>Commit</div>
                    <div>Nodes</div>
                    <div>Edges</div>
                    <div>Status</div>
                    <div>Updated</div>
                    <div>Action</div>
                  </div>

                  {loading ? (
                    <div className="flex min-h-[340px] items-center justify-center border-b border-slate-200 bg-white px-4 text-slate-500">
                      Loading history...
                    </div>
                  ) : emptyState ? (
                    <div className="flex min-h-[340px] items-center justify-center border-b border-slate-200 bg-white px-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{authUser ? "No searches yet" : "Sign in to view saved searches"}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{tableMessage}</p>
                        {!authUser ? (
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <Link href="/login" className="brand-button rounded-none px-4 py-2 text-sm font-semibold transition">
                              Login
                            </Link>
                          </div>
                        ) : (
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <Link href="/#analyze" className="brand-button rounded-none px-4 py-2 text-sm font-semibold transition">
                              Start analysis
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {groupedHistory.map((group) => (
                        <div key={group.label}>
                          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            {group.label}
                          </div>

                          {group.items.map((item) => {
                            const summary = summarizeGraph(item.graphJson);
                            const isSelected = item.id === selectedId;
                            const repoName = getRepoName(item.repoUrl);
                            const statusLabel = item.edgeCount > 0 ? "Connected" : "Needs review";
                            const statusTone = item.edgeCount > 0 ? "text-emerald-700" : "text-amber-700";

                            return (
                              <div
                                key={item.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedId(item.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setSelectedId(item.id);
                                  }
                                }}
                                className={`grid cursor-pointer grid-cols-[minmax(220px,1.5fr)_120px_100px_100px_130px_120px_128px] items-center gap-3 border-b border-slate-200 px-4 py-3 transition hover:bg-slate-50 ${
                                  isSelected ? "bg-sky-50 text-slate-900 hover:bg-sky-50" : "bg-white text-slate-900"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold">{repoName}</div>
                                  <div className={`truncate text-xs ${isSelected ? "text-slate-500" : "text-slate-500"}`}>{item.repoUrl}</div>
                                </div>

                                <div className={`truncate text-sm font-medium ${isSelected ? "text-slate-700" : "text-slate-700"}`}>
                                  {item.commitSha ? item.commitSha.slice(0, 7) : "—"}
                                </div>

                                <div className={`text-sm font-semibold ${isSelected ? "text-slate-900" : "text-slate-900"}`}>{item.nodeCount}</div>

                                <div className={`text-sm font-semibold ${isSelected ? "text-slate-900" : "text-slate-900"}`}>{item.edgeCount}</div>

                                <div className={`text-sm font-semibold ${statusTone}`}>{statusLabel}</div>

                                <div className={`text-sm ${isSelected ? "text-slate-700" : "text-slate-700"}`}>{formatDate(item.updatedAt).split(",")[0]}</div>

                                <Link
                                  href={`/?repoUrl=${encodeURIComponent(item.repoUrl)}`}
                                  className={`inline-flex w-fit items-center gap-2 rounded-none border px-3 py-1.5 text-xs font-semibold transition ${
                                    isSelected
                                      ? "border-sky-200 bg-white text-slate-700 hover:bg-sky-50"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  Open analyzer <ExternalLink className="h-3.5 w-3.5" />
                                </Link>

                                {summary.previewNodes.length > 0 ? (
                                  <div className={`col-span-full flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2 text-[11px] uppercase tracking-[0.16em] ${isSelected ? "text-slate-500" : "text-slate-500"}`}>
                                    <span>Preview:</span>
                                    {summary.previewNodes.slice(0, 4).map((node) => (
                                      <span
                                        key={`${item.id}-${node.label}`}
                                        className={`inline-flex items-center rounded-none px-2.5 py-1 text-[11px] font-medium normal-case tracking-normal ${
                                          isSelected ? "bg-white text-slate-700" : "bg-slate-100 text-slate-700"
                                        }`}
                                      >
                                        {node.label}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

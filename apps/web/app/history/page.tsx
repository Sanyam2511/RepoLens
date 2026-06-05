"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
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
  const previewNodes = graph.nodes
    .filter((node) => node.type === "folder" || node.type === "file")
    .slice(0, 8)
    .map((node) => ({ label: node.label, type: node.type } satisfies NodeSummary));

  return { previewNodes };
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

  let rowIndex = 0;

  return (
    <div className="min-h-screen page-shell">
      <Header />

      <main>
        <section className="content-grid pt-8 pb-4">
          <div className="border-b border-[var(--color-border-subtle)] pb-6">
            <div className="micro-label">RepoLens History</div>
            <h1 className="mt-2 section-heading text-2xl sm:text-3xl">Past searches and saved graph structures</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
              Review previous repository scans, inspect their structural output, and reopen any analysis directly in the main analyzer.
            </p>
          </div>
        </section>

        <section className="content-grid pb-16">
          <div className="surface-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-4 py-4">
              <div>
                <div className="micro-label">Analysis table</div>
                <div className="mt-1 data-mono-dense text-[var(--color-text-tertiary)]">
                  {loading ? "Loading saved searches" : `${visibleHistory.length} result${visibleHistory.length === 1 ? "" : "s"}`}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 compact-card px-3 py-2 bg-[var(--color-bg-surface)]">
                  <Search className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Repo name, URL, commit sha"
                    className="w-[260px] bg-transparent outline-none input-field border-0 p-0 shadow-none focus:shadow-none data-mono-dense"
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
                      className={`badge-chip border transition ${
                        filter === item.key
                          ? "badge-accent"
                          : "border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
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
                <div className="grid grid-cols-[minmax(220px,1.5fr)_120px_100px_100px_130px_160px_128px] items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-4 py-3 micro-label">
                  <div>Repository</div>
                  <div>Commit</div>
                  <div>Nodes</div>
                  <div>Edges</div>
                  <div>Status</div>
                  <div>Updated</div>
                  <div>Action</div>
                </div>

                {loading ? (
                  <div className="flex min-h-[340px] items-center justify-center border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 data-mono text-[var(--color-text-tertiary)]">
                    Loading history...
                  </div>
                ) : emptyState ? (
                  <div className="flex min-h-[340px] items-center justify-center border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {authUser ? "No searches yet" : "Sign in to view saved searches"}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{tableMessage}</p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {!authUser ? (
                          <Link href="/login" className="btn-primary text-sm">Login</Link>
                        ) : (
                          <Link href="/#analyze" className="btn-primary text-sm">Start analysis</Link>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {groupedHistory.map((group) => (
                      <div key={group.label}>
                        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-4 py-2 micro-label">
                          {group.label}
                        </div>

                        {group.items.map((item) => {
                          const summary = summarizeGraph(item.graphJson);
                          const isSelected = item.id === selectedId;
                          const repoName = getRepoName(item.repoUrl);
                          const statusLabel = item.edgeCount > 0 ? "Connected" : "Needs review";
                          const rowBg = rowIndex % 2 === 0 ? "var(--color-bg-surface)" : "var(--color-bg-subtle)";
                          rowIndex += 1;

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
                              className={`grid cursor-pointer grid-cols-[minmax(220px,1.5fr)_120px_100px_100px_130px_160px_128px] items-center gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 transition hover:opacity-90 ${
                                isSelected ? "ring-2 ring-inset ring-[var(--color-accent-subtle)]" : ""
                              }`}
                              style={{ backgroundColor: rowBg }}
                            >
                              <div className="min-w-0">
                                <div className="truncate data-mono font-semibold text-[var(--color-text-primary)]">{repoName}</div>
                                <div className="truncate data-mono-dense text-[var(--color-text-tertiary)]">{item.repoUrl}</div>
                              </div>

                              <div className="truncate data-mono-dense text-[var(--color-text-secondary)]">
                                {item.commitSha ? item.commitSha.slice(0, 7) : "—"}
                              </div>

                              <div className="data-mono font-semibold text-[var(--color-text-primary)]">{item.nodeCount}</div>

                              <div className="data-mono font-semibold text-[var(--color-text-primary)]">{item.edgeCount}</div>

                              <div className={`data-mono-dense font-semibold ${item.edgeCount > 0 ? "text-[var(--color-healthy)]" : "text-[var(--color-hotspot)]"}`}>
                                {statusLabel}
                              </div>

                              <div className="data-mono-dense text-[var(--color-text-secondary)]">{formatDate(item.updatedAt)}</div>

                              <Link
                                href={`/?repoUrl=${encodeURIComponent(item.repoUrl)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="btn-secondary inline-flex w-fit items-center gap-2 py-1.5 px-3 text-xs"
                              >
                                Open <ExternalLink className="h-3.5 w-3.5" />
                              </Link>

                              {summary.previewNodes.length > 0 ? (
                                <div className="col-span-full flex flex-wrap items-center gap-2 border-t border-[var(--color-border-subtle)] pt-2 micro-label">
                                  <span>Preview:</span>
                                  {summary.previewNodes.slice(0, 4).map((node) => (
                                    <span
                                      key={`${item.id}-${node.label}`}
                                      className="badge-chip border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] normal-case tracking-normal data-mono-dense text-[var(--color-text-secondary)]"
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
        </section>
      </main>

      <Footer />
    </div>
  );
}

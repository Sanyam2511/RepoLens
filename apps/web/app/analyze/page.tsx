"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import { RepoGraph } from "shared";
import { workerFetch } from "../../lib/auth";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import AnalyzerSummary from "../../components/AnalyzerSummary";
import ArchitectureOverview from "../../components/ArchitectureOverview";
import ArchitectureDetail from "../../components/ArchitectureDetail";
import type { SummaryMetricId } from "../../lib/graph-summary";

type StatusTone = "idle" | "info" | "success" | "error";
type ViewMode = "overview" | "detail" | "summary";

const SAMPLE_REPOS = [
  { label: "Express", url: "https://github.com/expressjs/express" },
  { label: "Next.js", url: "https://github.com/vercel/next.js" },
  { label: "Axios", url: "https://github.com/axios/axios" },
];

export default function AnalyzePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [summaryMetric, setSummaryMetric] = useState<SummaryMetricId>("coupling");
  const [graphData, setGraphData] = useState<RepoGraph | null>(null);

  useEffect(() => {
    const presetRepo = new URLSearchParams(window.location.search).get("repoUrl");
    if (presetRepo) {
      setRepoUrl(presetRepo);
      handleAnalyze(undefined, presetRepo);
    }
  }, []);

  const handleAnalyze = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    const targetUrl = overrideUrl || repoUrl;
    if (!targetUrl) return;

    setLoading(true);
    setStatusText("Initializing analysis...");
    setStatusTone("info");
    setGraphData(null);

    try {
      const res = await workerFetch("/analyze", {
        method: "POST",
        body: JSON.stringify({ repoUrl: targetUrl }),
      });
      const data = await res.json();

      if (data.result) {
        setStatusText("Analysis complete.");
        setStatusTone("success");
        setGraphData(data.result);
        setLoading(false);
      } else if (data.jobId) {
        pollJobStatus(data.jobId);
      } else if (data.error) {
        setStatusText(data.error);
        setStatusTone("error");
        setLoading(false);
      }
    } catch (error) {
      setStatusText("Error connecting to worker.");
      setStatusTone("error");
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await workerFetch(`/status/${jobId}`);
        const data = await res.json();

        if (data.state === "completed") {
          clearInterval(interval);
          setStatusText("Analysis complete! Rendering map...");
          setStatusTone("success");
          setGraphData(data.result);
          setLoading(false);
        } else if (data.state === "failed") {
          clearInterval(interval);
          setStatusText(`Analysis failed: ${data.failedReason}`);
          setStatusTone("error");
          setLoading(false);
        } else {
          setStatusText(`Processing: ${data.state}...`);
        }
      } catch (error) {
        clearInterval(interval);
        setStatusText("Lost connection to worker.");
        setStatusTone("error");
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen page-shell">
      <Header />

      <main className="content-grid section-pad pt-6 md:pt-10">
        <div className="relative z-10 mx-auto max-w-2xl text-center mb-10">
          <h1 className="hero-heading text-[clamp(2rem,4vw,2.75rem)] leading-tight">
            Decode your architecture,
            <br />
            <span className="text-[var(--color-text-tertiary)]">see the big picture.</span>
          </h1>
          <p className="mt-4 mx-auto max-w-xl text-[var(--color-text-secondary)] text-lg">
            Turn complex directories and scattered dependencies into an interactive visual map. 
            Paste any public repository link below to instantly uncover how your codebase connects.
          </p>
        </div>

        <div className="surface-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="micro-label">RepoLens Analyzer</div>
              <div className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">Visualize repo architecture</div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] p-1 micro-label overflow-x-auto">
                {(["overview", "detail", "summary"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`rounded-md px-4 py-1.5 capitalize transition whitespace-nowrap ${
                      viewMode === mode
                        ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="mt-4 flex items-center gap-2">
            <div className="ml-1"><Search className="h-5 w-5 text-[var(--color-text-tertiary)]" /></div>
            <input
              type="text"
              placeholder="https://github.com/expressjs/express"
              className="input-field flex-1"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading} className="btn-primary shrink-0">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLE_REPOS.map((sample) => (
              <button
                key={sample.url}
                onClick={() => setRepoUrl(sample.url)}
                className="badge-chip border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>

          {statusText && (
            <div
              className={`mt-4 data-mono font-semibold text-sm ${
                statusTone === "error" ? "text-[var(--color-cycle)]" : "text-[var(--color-healthy)]"
              }`}
            >
              {statusText}
            </div>
          )}
        </div>

        <div className={`mt-8 relative overflow-hidden h-[85vh] ${viewMode === "summary" ? "surface-card p-4" : "surface-card flex flex-col"}`}>
          {viewMode === "summary" ? (
            <AnalyzerSummary graphData={graphData} metric={summaryMetric} onMetricChange={setSummaryMetric} />
          ) : viewMode === "overview" ? (
            <ArchitectureOverview graphData={graphData} />
          ) : (
            <ArchitectureDetail graphData={graphData} />
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

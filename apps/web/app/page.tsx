"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { RepoGraph } from "shared";
import { workerFetch } from "../lib/auth";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import IntelligenceLayer from "../components/IntelligenceLayer";
import Footer from "../components/Footer";
import AnalyzerSummary from "../components/AnalyzerSummary";
import ArchitectureOverview from "../components/ArchitectureOverview";
import ArchitectureDetail from "../components/ArchitectureDetail";
import type { SummaryMetricId } from "../lib/graph-summary";

type StatusTone = "idle" | "info" | "success" | "error";
type ViewMode = "overview" | "detail" | "summary";

const SAMPLE_REPOS = [
  { label: "Express", url: "https://github.com/expressjs/express" },
  { label: "Next.js", url: "https://github.com/vercel/next.js" },
  { label: "Axios", url: "https://github.com/axios/axios" },
];

export default function RepoLensDashboard() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [summaryMetric, setSummaryMetric] = useState<SummaryMetricId>("coupling");
  const [graphData, setGraphData] = useState<RepoGraph | null>(null);

  useEffect(() => {
    const presetRepo = new URLSearchParams(window.location.search).get("repoUrl");
    if (presetRepo) setRepoUrl(presetRepo);
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setStatusText("Initializing analysis...");
    setStatusTone("info");
    setGraphData(null);

    try {
      const res = await workerFetch("/analyze", {
        method: "POST",
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();

      if (data.result) {
        setStatusText("Analysis complete.");
        setStatusTone("success");
        setGraphData(data.result);
        setLoading(false);
      } else if (data.jobId) {
        pollJobStatus(data.jobId);
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

      <main>
        <Hero />
        <Features />
        <IntelligenceLayer />

        <section className="content-grid section-pad">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
            <div>
              <div className="badge-chip badge-accent inline-flex items-center gap-2">
                Live workspace
              </div>
              <h2 className="mt-4 section-heading">Visualize repo architecture in seconds.</h2>
            </div>
          </div>

          <div id="analyze" className="mt-10 surface-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="micro-label">RepoLens</div>
                <div className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">Visualize repo architecture</div>
              </div>

              <div className="hidden sm:flex flex-col gap-2">
                <div className="flex rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] p-1 micro-label">
                  {(["overview", "detail", "summary"] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`rounded-md px-4 py-1.5 capitalize transition ${
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

            <div className="mt-3 flex gap-2">
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

          <div className="mt-8 relative overflow-hidden surface-card p-4 h-[720px]">
            {viewMode === "summary" ? (
              <AnalyzerSummary graphData={graphData} metric={summaryMetric} onMetricChange={setSummaryMetric} />
            ) : viewMode === "overview" ? (
              <ArchitectureOverview graphData={graphData} />
            ) : (
              <ArchitectureDetail graphData={graphData} />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

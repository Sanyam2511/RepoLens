"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Search, Sparkles } from "lucide-react";
import { RepoGraph } from "shared";
import { workerFetch } from "../lib/auth";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Footer from "../components/Footer";
import AnalyzerSummary from "../components/AnalyzerSummary";
import HomeHistoryPreview from "../components/HomeHistoryPreview";
import ArchitectureOverview from "../components/ArchitectureOverview";
import ArchitectureDetail from "../components/ArchitectureDetail"; // Extracted Component!
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
    <div className="min-h-screen relative page-sky text-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 20% 10%, rgba(219, 234, 254, 0.85), transparent 55%), radial-gradient(circle at 85% 15%, rgba(191, 219, 254, 0.6), transparent 50%)" }} />
      </div>

      <Header />

      <main className="relative z-10">
        <Hero />
        <HomeHistoryPreview />
        <Features />

        <section className="mx-auto w-[min(1200px,94vw)] mt-16 px-6 py-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                <Sparkles className="h-4 w-4" /> Live workspace
              </div>
              <h2 className="mt-4 text-3xl md:text-4xl text-slate-900">Visualize repo architecture in seconds.</h2>
            </div>
          </div>

          <div id="analyze" className="mt-10 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">RepoLens</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">Visualize repo architecture</div>
              </div>
              
              {/* Clean View Mode Switcher */}
              <div className="hidden sm:flex flex-col gap-2">
                <div className="rounded-full border border-slate-200 bg-slate-100 p-1 text-[10px] uppercase font-bold tracking-[0.18em] text-slate-500">
                  <button onClick={() => setViewMode("overview")} className={`rounded-full px-4 py-1.5 transition ${viewMode === "overview" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-700"}`}>Overview</button>
                  <button onClick={() => setViewMode("detail")} className={`rounded-full px-4 py-1.5 transition ${viewMode === "detail" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-700"}`}>Detail</button>
                  <button onClick={() => setViewMode("summary")} className={`rounded-full px-4 py-1.5 transition ${viewMode === "summary" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-700"}`}>Summary</button>
                </div>
              </div>
            </div>

            <form onSubmit={handleAnalyze} className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white shadow-sm p-2">
              <div className="ml-2"><Search className="h-5 w-5 text-slate-400" /></div>
              <input
                type="text"
                placeholder="https://github.com/expressjs/express"
                className="flex-1 bg-transparent border-none outline-none px-2 py-2 text-slate-900"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={loading}
              />
              <button type="submit" disabled={loading} className="brand-button rounded-full px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-70">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
              </button>
            </form>

            <div className="mt-3 flex gap-2 text-xs">
              {SAMPLE_REPOS.map((sample) => (
                <button key={sample.url} onClick={() => setRepoUrl(sample.url)} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold uppercase tracking-[0.1em] text-slate-500 hover:bg-slate-50">
                  {sample.label}
                </button>
              ))}
            </div>
            
            {statusText && (
              <div className={`mt-4 text-xs font-mono font-semibold ${statusTone === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
                {statusText}
              </div>
            )}
          </div>

          <div className="mt-8 relative overflow-hidden rounded-[36px] border border-slate-200/80 bg-white/85 p-4 shadow-2xl h-[720px]">
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
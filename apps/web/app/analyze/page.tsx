"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Search, Github, Lock, Globe, ChevronDown } from "lucide-react";
import { RepoGraph } from "shared";
import { workerFetch } from "../../lib/auth";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import AnalyzerSummary from "../../components/AnalyzerSummary";
import ArchitectureOverview from "../../components/ArchitectureOverview";
import ArchitectureDetail from "../../components/ArchitectureDetail";
import ArchitectureChat from "../../components/ArchitectureChat";
import { computeGraphDiff } from "../../lib/diff-logic";

type StatusTone = "idle" | "info" | "success" | "error";
type ViewMode = "overview" | "detail" | "summary";

const SAMPLE_REPOS = [
  { label: "Express", url: "https://github.com/expressjs/express" },
  { label: "Next.js", url: "https://github.com/vercel/next.js" },
  { label: "Axios", url: "https://github.com/axios/axios" },
];

const SkeletonGraph = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-base)] dot-grid-bg overflow-hidden pointer-events-none">
      <div className="relative w-full h-full max-w-5xl max-h-[800px] animate-pulse opacity-80">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
          {/* Edges */}
          <g stroke="var(--color-border-strong)" strokeWidth="2" fill="none" opacity="0.8">
            <path d="M 500 120 L 500 170 L 250 170 L 250 220" />
            <path d="M 500 120 L 500 220" />
            <path d="M 500 120 L 500 170 L 800 170 L 800 220" />
            
            <path d="M 250 280 L 250 330 L 120 330 L 120 380" />
            <path d="M 250 280 L 250 330 L 320 330 L 320 380" />
            
            <path d="M 500 280 L 500 330 L 450 330 L 450 380" />
            <path d="M 500 280 L 500 330 L 600 330 L 600 380" />
            
            <path d="M 800 280 L 800 330 L 750 330 L 750 380" />
            <path d="M 800 280 L 800 330 L 920 330 L 920 380" />

            {/* Cross edges for randomness */}
            <path d="M 250 280 L 250 330 L 450 330 L 450 380" opacity="0.5" strokeDasharray="4 4" />
            <path d="M 800 280 L 800 330 L 600 330 L 600 380" opacity="0.5" strokeDasharray="4 4" />
            <path d="M 500 280 L 500 330 L 320 330 L 320 380" opacity="0.5" strokeDasharray="4 4" />
          </g>

          {/* Nodes */}
          <g fill="var(--color-bg-subtle)" stroke="var(--color-border-strong)" strokeWidth="1.5">
            {/* Top Node */}
            <rect x="400" y="60" width="200" height="60" rx="8" />
            
            {/* Second Row */}
            <rect x="150" y="220" width="200" height="60" rx="8" />
            <rect x="420" y="220" width="160" height="60" rx="8" />
            <rect x="700" y="220" width="200" height="60" rx="8" />
            
            {/* Third Row */}
            <rect x="40" y="380" width="160" height="60" rx="8" />
            <rect x="220" y="380" width="180" height="60" rx="8" />
            <rect x="430" y="380" width="140" height="60" rx="8" />
            <rect x="590" y="380" width="150" height="60" rx="8" />
            <rect x="760" y="380" width="120" height="60" rx="8" />
            <rect x="900" y="380" width="80" height="60" rx="8" />
          </g>
          
          {/* Inner blocks inside nodes to make them look like file cards */}
          <g fill="var(--color-border-strong)" opacity="0.5">
            <rect x="420" y="85" width="120" height="10" rx="4" />
            
            <rect x="170" y="245" width="100" height="10" rx="4" />
            <rect x="440" y="245" width="80" height="10" rx="4" />
            <rect x="720" y="245" width="140" height="10" rx="4" />
            
            <rect x="60" y="405" width="90" height="10" rx="4" />
            <rect x="240" y="405" width="120" height="10" rx="4" />
            <rect x="450" y="405" width="80" height="10" rx="4" />
            <rect x="610" y="405" width="90" height="10" rx="4" />
            <rect x="780" y="405" width="70" height="10" rx="4" />
            <rect x="920" y="405" width="40" height="10" rx="4" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default function AnalyzePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [graphData, setGraphData] = useState<RepoGraph | null>(null);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareLabels, setCompareLabels] = useState<{base: string, target: string} | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const presetRepo = params.get("repoUrl");
    const compareA = params.get("compareA");
    const compareB = params.get("compareB");

    if (compareA && compareB) {
      handleCompare(compareA, compareB);
    } else if (presetRepo) {
      setRepoUrl(presetRepo);
      handleAnalyze(undefined, presetRepo);
    }

    const fetchGithubRepos = async () => {
      try {
        const res = await workerFetch("/github/repos");
        if (res.ok) {
          const data = await res.json();
          if (data.repos) {
            setGithubRepos(data.repos);
          }
        }
      } catch (err) {
        console.error("Failed to fetch github repos", err);
      }
    };
    fetchGithubRepos();
  }, []);

  const handleCompare = async (idA: string, idB: string) => {
    setLoading(true);
    setStatusText("Fetching scans for comparison...");
    setStatusTone("info");
    setIsCompareMode(true);
    setGraphData(null);

    try {
      const [resA, resB] = await Promise.all([
        workerFetch(`/history/${idA}`),
        workerFetch(`/history/${idB}`)
      ]);

      const dataA = await resA.json();
      const dataB = await resB.json();

      if (dataA.analysis && dataB.analysis) {
        // Sort by date: older is base, newer is target
        const dateA = new Date(dataA.analysis.analyzedAt).getTime();
        const dateB = new Date(dataB.analysis.analyzedAt).getTime();
        
        let baseRecord, targetRecord;
        if (dateA < dateB) {
          baseRecord = dataA.analysis;
          targetRecord = dataB.analysis;
        } else {
          baseRecord = dataB.analysis;
          targetRecord = dataA.analysis;
        }

        const diffGraph = computeGraphDiff(baseRecord.graphJson, targetRecord.graphJson);
        setGraphData(diffGraph);
        setRepoUrl(baseRecord.repoUrl);
        setCompareLabels({
          base: baseRecord.commitSha.substring(0, 7),
          target: targetRecord.commitSha.substring(0, 7)
        });
        setStatusText("Comparison complete.");
        setStatusTone("success");
      } else {
        setStatusText("Failed to fetch one or both scans.");
        setStatusTone("error");
      }
    } catch (err) {
      setStatusText("Error computing diff.");
      setStatusTone("error");
    } finally {
      setLoading(false);
    }
  };

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

        <div className="surface-card flex flex-col overflow-hidden">
          <div className="p-6 border-b border-[var(--color-border-subtle)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-[var(--color-text-primary)]">Visualize repo architecture</div>
            </div>

            <div className="flex border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] overflow-x-auto rounded-none">
              {(["overview", "detail", "summary"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-6 py-2 capitalize font-medium text-sm transition-all whitespace-nowrap ${
                    viewMode === mode
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-4 flex items-center gap-2">
            {isCompareMode ? (
              <div className="flex-1 flex items-center gap-3 bg-[var(--color-bg-subtle)] px-4 py-2.5 rounded-xl border border-[var(--color-border-subtle)]">
                <div className="font-semibold text-sm text-[var(--color-text-primary)]">
                  Compare Mode
                </div>
                {compareLabels && (
                  <div className="text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
                    <span className="font-mono bg-white border px-1.5 py-0.5 rounded text-rose-600 border-rose-200">{compareLabels.base}</span>
                    <span>→</span>
                    <span className="font-mono bg-white border px-1.5 py-0.5 rounded text-emerald-600 border-emerald-200">{compareLabels.target}</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    window.location.href = "/analyze";
                  }}
                  className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  Exit Compare Mode
                </button>
              </div>
            ) : (
            <form onSubmit={handleAnalyze} className="flex-1 flex items-center gap-2">
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
            )}

            {!isCompareMode && githubRepos.length > 0 && (
              <>
                <div className="text-[var(--color-text-tertiary)] text-xs font-bold uppercase tracking-wider px-1">OR</div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border-strong)] bg-white rounded-xl hover:bg-[var(--color-bg-subtle)] transition shadow-sm text-sm font-semibold text-[var(--color-text-primary)] whitespace-nowrap h-[42px]"
                  >
                    <Github className="w-4 h-4" />
                    Select Repo
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[var(--color-border-subtle)] shadow-xl rounded-xl z-50 overflow-hidden flex flex-col">
                      <div className="bg-[var(--color-bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)]">
                        Your Repositories
                      </div>
                      <div className="max-h-48 overflow-y-auto dropdown-scrollbar py-1">
                        {githubRepos.map((repo) => (
                          <button
                            key={repo.id}
                            type="button"
                            onClick={() => {
                              setRepoUrl(repo.html_url);
                              setIsDropdownOpen(false);
                              handleAnalyze(undefined, repo.html_url);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-[var(--color-bg-subtle)] transition flex flex-col group border-b border-transparent hover:border-[var(--color-border-subtle)] last:border-0"
                          >
                            <span className="font-semibold text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                              {repo.name}
                            </span>
                            <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1.5 mt-0.5">
                              {repo.private ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                              {repo.private ? "Private" : "Public"} • {repo.stargazers_count} ★
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
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

          <div className={`relative overflow-hidden h-[85vh] ${viewMode === "summary" ? "p-4" : "flex flex-col"}`}>
          {loading ? (
            <SkeletonGraph />
          ) : viewMode === "summary" ? (
            <AnalyzerSummary graphData={graphData} repoUrl={repoUrl} />
          ) : viewMode === "overview" ? (
            <ArchitectureOverview graphData={graphData} />
          ) : (
            <ArchitectureDetail graphData={graphData} />
          )}
        </div>
        </div>
      </main>
      
      {graphData && repoUrl && <ArchitectureChat repoUrl={repoUrl} />}
      <Footer />
    </div>
  );
}

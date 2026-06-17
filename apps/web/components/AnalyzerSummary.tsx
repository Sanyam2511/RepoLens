import React, { useMemo, useState } from "react";
import { RepoGraph } from "shared";
import { GraphSummary, summarizeRepoGraph } from "../lib/graph-summary";
import { BarChart3, FileCode2, PackageOpen, FolderKanban, Waypoints, Info, ShieldAlert, GitMerge, Slack, Github, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { workerFetch } from "../lib/auth";

type AnalyzerSummaryProps = {
  graphData: RepoGraph | null;
  repoUrl: string;
};

const SummarySkeleton = () => (
  <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] p-6 text-center">
    <div>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]">
        <BarChart3 className="h-5 w-5" />
      </div>
      <div className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">Run an analysis to see insights</div>
      <div className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">
        The analyzer will learn your repository structure and provide actionable architectural insights.
      </div>
    </div>
  </div>
);

export default function AnalyzerSummary({ graphData, repoUrl }: AnalyzerSummaryProps) {
  const [integrationState, setIntegrationState] = useState<'idle' | 'slack' | 'github'>('idle');
  const [integrationInput, setIntegrationInput] = useState('');
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<'success' | 'error' | null>(null);
  const [integrationMsg, setIntegrationMsg] = useState('');

  const summary = useMemo<GraphSummary | null>(() => {
    if (!graphData || graphData.nodes.length === 0) return null;
    return summarizeRepoGraph(graphData);
  }, [graphData]);

  if (!summary) {
    return <SummarySkeleton />;
  }

  const topNodes = summary.topNodes.filter((node) => node.type !== "npm-package").slice(0, 5);
  const topNpm = summary.topNodes.filter((node) => node.type === "npm-package").slice(0, 5);
  const topClusters = [...summary.clusters].sort((a, b) => b.nodeCount - a.nodeCount).slice(0, 4);

  const handleIntegrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl || !integrationInput) return;
    
    setIntegrationLoading(true);
    setIntegrationStatus(null);
    setIntegrationMsg('');

    try {
      const endpoint = integrationState === 'slack' ? '/integrations/slack' : '/integrations/github-pr';
      const body = integrationState === 'slack' 
        ? { repoUrl, webhookUrl: integrationInput }
        : { repoUrl, prNumber: integrationInput };

      const res = await workerFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setIntegrationStatus('success');
        setIntegrationMsg('Integration sent successfully!');
        setTimeout(() => {
          setIntegrationState('idle');
          setIntegrationStatus(null);
          setIntegrationInput('');
        }, 3000);
      } else {
        setIntegrationStatus('error');
        setIntegrationMsg(data.error || 'Failed to send integration');
      }
    } catch (err) {
      setIntegrationStatus('error');
      setIntegrationMsg('Network error while connecting to integration api.');
    } finally {
      setIntegrationLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] p-6 custom-scrollbar">
      
      {/* HEADER */}
      <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-4 shrink-0 flex-wrap gap-4">
        <div className="min-w-0 flex-1">
          <div className="micro-label">Architecture Assessment</div>
          <h3 className="mt-2 section-heading text-xl">Repository Insights</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
            Detailed structural analysis to help you learn about the repository's health, boundaries, and critical bottlenecks.
          </p>
        </div>
        
        {/* Integrations Block */}
        <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
          {integrationState === 'idle' ? (
            <div className="flex gap-2">
              <button 
                onClick={() => setIntegrationState('slack')}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#E01E5A]/10 text-[#E01E5A] hover:bg-[#E01E5A]/20 transition-colors border border-[#E01E5A]/20"
              >
                <Slack className="w-4 h-4" /> Share to Slack
              </button>
              <button 
                onClick={() => setIntegrationState('github')}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
              >
                <Github className="w-4 h-4" /> Share to PR
              </button>
            </div>
          ) : (
            <form onSubmit={handleIntegrationSubmit} className="flex flex-col gap-2 bg-[var(--color-bg-subtle)] p-3 rounded-lg border border-[var(--color-border-subtle)] w-full sm:w-[280px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  {integrationState === 'slack' ? <><Slack className="w-3.5 h-3.5 text-[#E01E5A]" /> Slack Webhook</> : <><Github className="w-3.5 h-3.5 text-slate-700" /> GitHub PR #</>}
                </span>
                <button type="button" onClick={() => setIntegrationState('idle')} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              
              <input
                type={integrationState === 'slack' ? "url" : "text"}
                required
                placeholder={integrationState === 'slack' ? "https://hooks.slack.com/..." : "1234"}
                value={integrationInput}
                onChange={e => setIntegrationInput(e.target.value)}
                className="text-xs px-2 py-1.5 rounded border border-[var(--color-border-strong)] bg-white w-full"
                disabled={integrationLoading}
              />
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate flex-1 pr-2">
                  {integrationStatus === 'success' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Sent</span>}
                  {integrationStatus === 'error' && <span className="text-rose-500 truncate block" title={integrationMsg}>{integrationMsg}</span>}
                </span>
                <button 
                  type="submit" 
                  disabled={integrationLoading || !integrationInput}
                  className="bg-[var(--color-accent)] text-white text-xs px-3 py-1 rounded font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 shrink-0"
                >
                  {integrationLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Send
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* REPOSITORY COMPOSITION (SCALE) */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="compact-card p-4">
          <div className="flex items-center gap-2 mb-2 text-[var(--color-text-tertiary)]">
            <FileCode2 className="w-4 h-4" />
            <span className="micro-label">Files Analyzed</span>
          </div>
          <div className="data-mono text-2xl font-semibold text-[var(--color-text-primary)]">{summary.fileCount}</div>
          <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {summary.apiCount} APIs, {summary.storageCount} Data Nodes
          </div>
        </div>

        <div className="compact-card p-4">
          <div className="flex items-center gap-2 mb-2 text-[var(--color-text-tertiary)]">
            <FolderKanban className="w-4 h-4" />
            <span className="micro-label">Module Boundaries</span>
          </div>
          <div className="data-mono text-2xl font-semibold text-[var(--color-text-primary)]">{summary.clusterCount || summary.clusters.length}</div>
          <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Top level directories
          </div>
        </div>

        <div className="compact-card p-4">
          <div className="flex items-center gap-2 mb-2 text-[var(--color-text-tertiary)]">
            <PackageOpen className="w-4 h-4" />
            <span className="micro-label">NPM Packages</span>
          </div>
          <div className="data-mono text-2xl font-semibold text-[var(--color-text-primary)]">{summary.npmCount}</div>
          <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
            External surface area
          </div>
        </div>

        <div className="compact-card p-4">
          <div className="flex items-center gap-2 mb-2 text-[var(--color-text-tertiary)]">
            <Waypoints className="w-4 h-4" />
            <span className="micro-label">Dependencies</span>
          </div>
          <div className="data-mono text-2xl font-semibold text-[var(--color-text-primary)]">{summary.totalEdges}</div>
          <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {summary.density.toFixed(2)} average links per file
          </div>
        </div>
      </div>

      {/* EDUCATIONAL ARCHITECTURAL ASSESSMENT */}
      <div className="mt-6 shrink-0">
        <div className="micro-label mb-3">Architectural Health Assessment</div>
        <div className="compact-card p-0 overflow-hidden divide-y divide-[var(--color-border-subtle)]">
          {Object.values(summary.metrics).map((metric) => (
            <div key={metric.id} className="p-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 pr-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[var(--color-text-primary)]">{metric.label}</span>
                  <div className={`data-mono font-bold lg:hidden ${
                    metric.band === "healthy" ? "text-emerald-500" :
                    metric.band === "watch" ? "text-amber-500" : "text-rose-500"
                  }`}>
                    {metric.score}/100
                  </div>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {metric.description}
                </p>
                <div className="mt-3 flex gap-2 items-start">
                  <Info className="w-4 h-4 shrink-0 text-[var(--color-accent)] mt-0.5" />
                  <div className="text-sm text-[var(--color-text-primary)] font-medium leading-relaxed">
                    {metric.insight}
                  </div>
                </div>
              </div>
              <div className={`hidden lg:block data-mono font-bold text-lg shrink-0 ${
                metric.band === "healthy" ? "text-emerald-500" :
                metric.band === "watch" ? "text-amber-500" : "text-rose-500"
              }`}>
                {metric.score}/100
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTLENECKS & RISKS */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2 shrink-0">
        
        {/* Structural Bottlenecks */}
        <div className="compact-card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <GitMerge className="w-4 h-4 text-[var(--color-accent)]" />
            <span className="font-semibold text-[var(--color-text-primary)]">Structural Bottlenecks</span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
            These are the "God Classes". They are the most heavily imported internal files in the repository. 
            Modifying these files carries a high risk of regression because changes ripple outward to many dependents.
          </p>
          
          <div className="flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] divide-y divide-[var(--color-border-subtle)]">
            {topNodes.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">No internal bottlenecks detected.</div>
            ) : (
              topNodes.map((node) => (
                <div key={`${node.label}-${node.degree}`} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--color-text-primary)]" title={node.label}>
                      {node.label}
                    </div>
                    <div className="data-mono-dense text-xs text-[var(--color-text-tertiary)] truncate mt-0.5">
                      Module: {node.clusterLabel}
                    </div>
                  </div>
                  <div className="badge-chip shrink-0 border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
                    <span className="data-mono-dense font-semibold">{node.degree}</span> incoming links
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* External Attack Surface */}
        <div className="compact-card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-[var(--color-text-primary)]">External Attack Surface</span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
            This is the repository's third-party footprint. These NPM packages are the most heavily utilized 
            across the codebase, representing your core external dependencies and potential vulnerability vectors.
          </p>
          
          <div className="flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] divide-y divide-[var(--color-border-subtle)]">
            {topNpm.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">No NPM packages detected.</div>
            ) : (
              topNpm.map((node) => (
                <div key={`${node.label}-${node.degree}`} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--color-text-primary)]" title={node.label}>
                      {node.label}
                    </div>
                    <div className="data-mono-dense text-xs text-[var(--color-text-tertiary)] mt-0.5">
                      Package
                    </div>
                  </div>
                  <div className="badge-chip shrink-0 border border-[var(--color-border-strong)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
                    Used in <span className="data-mono-dense font-semibold">{node.degree}</span> files
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MODULE BOUNDARIES */}
      <div className="mt-6 compact-card p-5 shrink-0">
        <div className="font-semibold text-[var(--color-text-primary)] mb-2">Primary Module Boundaries</div>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
          The largest architectural boundaries in the codebase. Proper isolation means these modules should ideally 
          have minimal cross-imports between them.
        </p>
        
        <div className="grid gap-4 lg:grid-cols-2">
          {topClusters.map((cluster) => {
            const percentage = Math.round((cluster.nodeCount / Math.max(1, summary.totalNodes)) * 100);
            return (
              <div key={cluster.key} className="flex items-center gap-4 bg-[var(--color-bg-subtle)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate" title={cluster.label}>
                      {cluster.label}
                    </div>
                    <div className="data-mono text-xs text-[var(--color-text-secondary)]">
                      {cluster.nodeCount} nodes ({percentage}%)
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: cluster.accent }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

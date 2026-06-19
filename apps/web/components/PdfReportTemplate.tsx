import React, { useMemo } from 'react';
import { RepoGraph } from 'shared';

interface PdfReportTemplateProps {
  repoUrl: string;
  commitSha?: string;
  date: string;
  graphData: RepoGraph;
}

const getRepoName = (url: string) => {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.slice(-2).join("/");
  } catch {
    return url;
  }
};

export default function PdfReportTemplate({ repoUrl, commitSha, date, graphData }: PdfReportTemplateProps) {
  const repoName = getRepoName(repoUrl);

  const metrics = useMemo(() => {
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const domains = new Map<string, number>();

    const nodes = graphData.nodes.filter(n => n.type === 'file');
    
    // Initialize
    nodes.forEach(n => {
      inDegree.set(n.id, 0);
      outDegree.set(n.id, 0);
      
      const parts = n.id.split('/');
      if (parts.length > 1) {
        const domain = parts[0];
        domains.set(domain, (domains.get(domain) || 0) + 1);
      } else {
        domains.set('Root', (domains.get('Root') || 0) + 1);
      }
    });

    // Calculate Degrees
    graphData.edges.forEach(e => {
      if (inDegree.has(e.target)) inDegree.set(e.target, inDegree.get(e.target)! + 1);
      if (outDegree.has(e.source)) outDegree.set(e.source, outDegree.get(e.source)! + 1);
    });

    const bottlenecks = [...inDegree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const complexModules = [...outDegree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topDomains = [...domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    const averageCoupling = nodes.length > 0 ? (graphData.edges.length / nodes.length).toFixed(2) : "0";

    return {
      nodesCount: nodes.length,
      edgesCount: graphData.edges.length,
      averageCoupling,
      bottlenecks,
      complexModules,
      topDomains
    };
  }, [graphData]);

  return (
    <div className="flex flex-col bg-white w-full h-full text-gray-900 p-8 pt-0">
      {/* Executive Summary */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-indigo-900 border-b-2 border-indigo-100 pb-2 mb-4">Executive Summary</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Repository</p>
            <p className="text-lg font-medium text-slate-800">{repoName}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Analysis Date</p>
            <p className="text-lg font-medium text-slate-800">{new Date(date).toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Commit SHA</p>
            <p className="text-lg font-medium text-slate-800 font-mono">{commitSha ? commitSha.substring(0, 7) : 'Unknown'}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 flex justify-around">
            <div className="text-center">
              <p className="text-sm text-indigo-500 font-semibold uppercase tracking-wider">Files</p>
              <p className="text-2xl font-bold text-indigo-900">{metrics.nodesCount}</p>
            </div>
            <div className="text-center border-l border-indigo-200 pl-4">
              <p className="text-sm text-indigo-500 font-semibold uppercase tracking-wider">Dependencies</p>
              <p className="text-2xl font-bold text-indigo-900">{metrics.edgesCount}</p>
            </div>
            <div className="text-center border-l border-indigo-200 pl-4">
              <p className="text-sm text-indigo-500 font-semibold uppercase tracking-wider">Avg Coupling</p>
              <p className="text-2xl font-bold text-indigo-900">{metrics.averageCoupling}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Architectural Bottlenecks */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-rose-900 border-b-2 border-rose-100 pb-2 mb-4">Top Architectural Bottlenecks</h2>
        <p className="text-slate-600 mb-4">These files are imported by the highest number of other files. Changes here carry the highest risk of breaking downstream systems.</p>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-3/4">File Path</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-1/4">Incoming Links</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {metrics.bottlenecks.map(([id, count]) => (
                <tr key={id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 font-mono truncate max-w-[600px]" title={id}>{id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-rose-600 font-bold text-right">{count}</td>
                </tr>
              ))}
              {metrics.bottlenecks.length === 0 && (
                <tr><td colSpan={2} className="px-6 py-4 text-center text-slate-500">No bottlenecks detected.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Most Complex Modules */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-amber-900 border-b-2 border-amber-100 pb-2 mb-4">Highly Coupled Files (God Objects)</h2>
        <p className="text-slate-600 mb-4">These files import an excessive amount of other modules, indicating they might be taking on too many responsibilities.</p>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-3/4">File Path</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-1/4">Outgoing Links</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {metrics.complexModules.map(([id, count]) => (
                <tr key={id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 font-mono truncate max-w-[600px]" title={id}>{id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 font-bold text-right">{count}</td>
                </tr>
              ))}
              {metrics.complexModules.length === 0 && (
                <tr><td colSpan={2} className="px-6 py-4 text-center text-slate-500">No complex modules detected.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Domain Breakdown */}
      <div>
        <h2 className="text-2xl font-bold text-emerald-900 border-b-2 border-emerald-100 pb-2 mb-4">Core Module Breakdown</h2>
        <p className="text-slate-600 mb-4">Distribution of files across the top-level directories in the repository.</p>
        <div className="grid grid-cols-4 gap-4">
          {metrics.topDomains.map(([domain, count]) => (
            <div key={domain} className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 flex flex-col justify-center items-center">
              <span className="text-3xl font-bold text-emerald-700">{count}</span>
              <span className="text-sm font-semibold text-emerald-900 mt-1 uppercase tracking-wider truncate w-full text-center" title={domain}>{domain}</span>
            </div>
          ))}
          {metrics.topDomains.length === 0 && (
            <div className="col-span-4 p-4 text-center text-slate-500">No domain data available.</div>
          )}
        </div>
      </div>

    </div>
  );
}

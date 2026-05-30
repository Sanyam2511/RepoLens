"use client";

import React from "react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { Database, FolderKanban, FileCode2, Globe2, PackageOpen, AlertTriangle } from "lucide-react";

export type GraphNodeKind = "file" | "api-endpoint" | "storage" | "folder" | "npm-package";
export type NodeCategory = "entry" | "hotspot" | "leaf" | "storage" | "api" | "internal" | "npm";

export type GraphNodeData = {
  label: string;
  rawLabel: string;
  kind: GraphNodeKind | "cluster" | "collapsedDir";
  width?: number;
  category?: NodeCategory;
  sublabel?: string;
  codeSnippet?: string;
  clusterLabel?: string;
  pathLabel?: string;
  clusterSize?: number;
  clusterSummary?: string;
  accent?: string;
  isCluster?: boolean;
  inbound?: number;
  outbound?: number;
  isCyclic?: boolean;
  isCritical?: boolean;
  extension?: string;
};

export const COLOR_MAP: Record<NodeCategory, { bg: string; border: string; text: string }> = {
  entry: { bg: "#FAECE7", border: "#993C1D", text: "#712B13" },
  hotspot: { bg: "#FAEEDA", border: "#854F0B", text: "#633806" },
  leaf: { bg: "#F1EFE8", border: "#5F5E5A", text: "#444441" },
  storage: { bg: "#E1F5EE", border: "#0F6E56", text: "#085041" },
  api: { bg: "#EEEDFE", border: "#534AB7", text: "#3C3489" },
  internal: { bg: "#E6F1FB", border: "#185FA5", text: "#0C447C" },
  npm: { bg: "#EBF4FF", border: "#2563EB", text: "#1E3A8A" }, 
};

// Sharper, high-fidelity palette for instantly recognizable architectural roles
export const ROLE_COLORS: Record<NodeCategory, { bg: string; border: string; text: string; light: string }> = {
  entry: { bg: "#FFF1F2", border: "#EF4444", text: "#991B1B", light: "#FEE2E2" },     // Bold Coral
  hotspot: { bg: "#FFFBEB", border: "#F59E0B", text: "#92400E", light: "#FEF3C7" },  // Vibrant Amber
  leaf: { bg: "#F8FAFC", border: "#94A3B8", text: "#334155", light: "#E2E8F0" },     // Clean Gray
  storage: { bg: "#F0FDFA", border: "#0D9488", text: "#115E59", light: "#CCFBF1" },  // Deep Teal
  api: { bg: "#FAF5FF", border: "#9333EA", text: "#581C87", light: "#F3E8FF" },      // Neon Purple
  npm: { bg: "#EFF6FF", border: "#2563EB", text: "#1E3A8A", light: "#DBEAFE" },      // Rich Blue
  internal: { bg: "#F1F5F9", border: "#64748B", text: "#334155", light: "#CBD5E1" }  // Slate
};

export const categorizeNode = (
  node: Pick<GraphNodeData, "kind" | "category" | "inbound" | "outbound">
): NodeCategory => {
  if (node.category) return node.category;
  if (node.kind === "npm-package") return "npm";

  const inCount = node.inbound ?? 0;
  const outCount = node.outbound ?? 0;

  if (inCount === 0 && outCount > 0) return "entry";
  if (inCount > 6) return "hotspot";
  if (outCount === 0 && inCount > 0) return "leaf";
  if (node.kind === "storage") return "storage";
  if (node.kind === "api-endpoint") return "api";
  return "internal";
};

const KIND_META: Record<GraphNodeKind, { label: string; icon: React.ReactNode }> = {
  file: { label: "File", icon: <FileCode2 className="h-4 w-4" /> },
  "api-endpoint": { label: "API", icon: <Globe2 className="h-4 w-4" /> },
  storage: { label: "Storage", icon: <Database className="h-4 w-4" /> },
  folder: { label: "Folder", icon: <FolderKanban className="h-4 w-4" /> },
  "npm-package": { label: "NPM", icon: <PackageOpen className="h-4 w-4" /> },
};

export function AnalysisGraphNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const category = data.category ?? "internal";
  const colors = COLOR_MAP[category];
  const accent = data.accent ?? colors.border;
  const meta = data.kind === "cluster" ? null : KIND_META[data.kind as GraphNodeKind];

  if (data.isCluster) {
    return (
      <div className={`relative h-full w-full overflow-hidden rounded-[30px] border bg-white/95 ${selected ? "border-sky-300 ring-2 ring-sky-200/70" : "border-slate-200/70"}`} style={{ boxShadow: `0 14px 30px rgba(15, 23, 42, 0.05), 0 0 0 1px ${accent}12 inset`, backgroundImage: `linear-gradient(135deg, ${accent}06 0%, rgba(255,255,255,0.96) 45%, rgba(255,255,255,0.94) 100%)` }}>
        <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white" style={{ background: accent }} />
        <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white" style={{ background: accent }} />
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: accent }} />
        <div className="relative flex h-full flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><div className="mt-1 truncate text-lg font-semibold text-slate-900">{data.clusterLabel}</div></div>
            <div className="shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ borderColor: `${accent}30`, color: accent }}>{data.clusterSize ?? 0} nodes</div>
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-600">{data.clusterSummary}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative h-full w-full overflow-hidden rounded-[8px] border transition-transform duration-200 ${selected ? "border-sky-300 ring-2 ring-sky-200/70" : "border-white/80"}`} style={{ boxShadow: selected ? `0 14px 28px rgba(37,99,235,0.10), 0 0 0 1px ${accent}18 inset` : `0 10px 22px rgba(15,23,42,0.05), 0 0 0 1px ${accent}10 inset`, minWidth: data.width ?? 140, backgroundColor: colors.bg, borderColor: colors.border }}>
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: colors.border }} />
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white" style={{ background: colors.border }} />
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white" style={{ background: colors.border }} />
      <div className="relative flex h-full flex-col justify-between gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {meta && <div className="inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-1" style={{ borderColor: `${colors.border}22`, color: colors.border }}>{meta.icon}</div>}
            <div className="min-w-0 truncate text-[13px] font-medium" style={{ color: colors.text }}>{data.label}</div>
          </div>
        </div>
        {(data.sublabel || data.pathLabel) && <div className="truncate text-[11px]" style={{ color: colors.border, opacity: 0.8 }}>{data.sublabel || data.pathLabel}</div>}
      </div>
    </div>
  );
}

export function DetailGraphNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const category = data.category ?? "internal";
  const colors = ROLE_COLORS[category] || ROLE_COLORS.internal;
  const isNPM = data.kind === "npm-package";
  
  return (
    <div 
      className={`group relative h-full w-full transition-all duration-200 border-2 ${isNPM ? "rounded-[24px]" : "rounded-xl"} ${selected ? "ring-4 ring-offset-2 ring-sky-400" : "shadow-md hover:shadow-xl hover:-translate-y-1"}`}
      style={{ backgroundColor: "#ffffff", borderColor: colors.border, minWidth: data.width }}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-white" style={{ background: colors.border }} />
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-white" style={{ background: colors.border }} />

      <div className={`flex items-center justify-between px-3 py-2 border-b ${isNPM ? "rounded-t-[22px]" : "rounded-t-[10px]"}`} style={{ backgroundColor: colors.light, borderColor: `${colors.border}40` }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.text }}>
            {isNPM ? "NPM" : data.extension ? `.${data.extension}` : data.kind}
          </span>
          {data.isCyclic && (
            <div className="flex items-center gap-1 bg-red-100 text-red-700 border border-red-300 rounded-full px-1.5 py-0.5" title="Circular Dependency Detected">
              <AlertTriangle className="h-3 w-3" />
            </div>
          )}
        </div>
        {(data.inbound ?? 0) > 6 && (
          <div className="text-[9px] font-bold uppercase bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-sm">Hotspot</div>
        )}
      </div>

      <div className="p-3 flex flex-col h-[calc(100%-36px)] justify-between">
        <div>
          <div className="truncate text-[14px] font-bold text-slate-800" title={data.label}>{data.label}</div>
          <div className="truncate text-[10px] text-slate-400 mt-0.5" title={data.pathLabel}>{data.pathLabel || "root"}</div>
        </div>
        
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
          <div className="flex flex-col items-center px-2" title="Files that import this">
            <span className="text-[10px] uppercase font-bold text-slate-400">In</span>
            <span className="text-sm font-black" style={{ color: colors.text }}>{data.inbound ?? 0}</span>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex flex-col items-center px-2" title="Files this imports">
            <span className="text-[10px] uppercase font-bold text-slate-400">Out</span>
            <span className="text-sm font-black text-slate-600">{data.outbound ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const NODE_TYPES = {
  analysisNode: AnalysisGraphNode,
  detailNode: DetailGraphNode,
  clusterNode: AnalysisGraphNode,
  collapsedDir: AnalysisGraphNode,
} as const as any;
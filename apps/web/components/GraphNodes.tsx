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
  isCollapsed?: boolean;
  height?: number;
  diffStatus?: 'added' | 'removed' | 'unchanged' | 'modified';
  onToggle?: (id: string) => void;
};

const NODE_ROLE_COLORS: Record<NodeCategory, string> = {
  entry: "var(--color-node-entry)",
  hotspot: "var(--color-hotspot)",
  leaf: "var(--color-node-npm)",
  storage: "var(--color-node-storage)",
  api: "var(--color-node-api)",
  internal: "var(--color-node-core)",
  npm: "var(--color-node-npm)",
};

export const COLOR_MAP: Record<NodeCategory, { bg: string; border: string; text: string }> = {
  entry:    { bg: "rgba(139, 92, 246, 0.08)",  border: "#8B5CF6", text: "#0F172A" },
  hotspot:  { bg: "rgba(245, 158, 11, 0.08)",  border: "#F59E0B", text: "#0F172A" },
  leaf:     { bg: "rgba(148, 163, 184, 0.08)", border: "#94A3B8", text: "#0F172A" },
  storage:  { bg: "rgba(59, 130, 246, 0.08)",  border: "#3B82F6", text: "#0F172A" },
  api:      { bg: "rgba(139, 92, 246, 0.08)",  border: "#8B5CF6", text: "#0F172A" },
  internal: { bg: "rgba(35, 47, 114, 0.08)",   border: "#232F72", text: "#0F172A" },
  npm:      { bg: "rgba(148, 163, 184, 0.08)", border: "#94A3B8", text: "#0F172A" },
};

export const ROLE_COLORS: Record<NodeCategory, { bg: string; border: string; text: string; light: string }> = {
  entry:    { bg: "rgba(139, 92, 246, 0.08)",  border: "#8B5CF6", text: "#0F172A", light: "rgba(139, 92, 246, 0.08)" },
  hotspot:  { bg: "rgba(245, 158, 11, 0.08)",  border: "#F59E0B", text: "#0F172A", light: "rgba(245, 158, 11, 0.08)" },
  leaf:     { bg: "rgba(148, 163, 184, 0.08)", border: "#94A3B8", text: "#0F172A", light: "rgba(148, 163, 184, 0.08)" },
  storage:  { bg: "rgba(59, 130, 246, 0.08)",  border: "#3B82F6", text: "#0F172A", light: "rgba(59, 130, 246, 0.08)" },
  api:      { bg: "rgba(139, 92, 246, 0.08)",  border: "#8B5CF6", text: "#0F172A", light: "rgba(139, 92, 246, 0.08)" },
  npm:      { bg: "rgba(148, 163, 184, 0.08)", border: "#94A3B8", text: "#0F172A", light: "rgba(148, 163, 184, 0.08)" },
  internal: { bg: "rgba(35, 47, 114, 0.08)",   border: "#232F72", text: "#0F172A", light: "rgba(35, 47, 114, 0.08)" },
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
  file:           { label: "File",    icon: <FileCode2   className="h-4 w-4" /> },
  "api-endpoint": { label: "API",     icon: <Globe2      className="h-4 w-4" /> },
  storage:        { label: "Storage", icon: <Database    className="h-4 w-4" /> },
  folder:         { label: "Folder",  icon: <FolderKanban className="h-4 w-4" /> },
  "npm-package":  { label: "NPM",     icon: <PackageOpen className="h-4 w-4" /> },
};

// Every node in the graph is clamped to this width regardless of content.
// This prevents api-endpoint nodes with long route paths from stretching
// their entire depth-level row and making the graph unreadable.
const NODE_FIXED_WIDTH = 260;
const NODE_MAX_WIDTH   = 300; // hotspot nodes get a little extra room

export function AnalysisGraphNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const category = data.category ?? "internal";
  const colors   = COLOR_MAP[category];
  const roleColor = NODE_ROLE_COLORS[category];
  const accent   = data.accent ?? colors.border;
  const meta     = data.kind === "cluster" ? null : KIND_META[data.kind as GraphNodeKind];

  // Fixed width — never grow beyond NODE_FIXED_WIDTH regardless of label length
  const nodeWidth = Math.min(data.width ?? NODE_FIXED_WIDTH, NODE_MAX_WIDTH);

  if (data.isCluster) {
    return (
      <div
        className={`relative h-full overflow-hidden rounded-lg border bg-[var(--color-bg-surface)] ${selected ? "ring-2 ring-[var(--color-accent-subtle)]" : ""}`}
        style={{
          width: nodeWidth,
          minWidth: nodeWidth,
          maxWidth: nodeWidth,
          backgroundColor: "var(--color-bg-surface)",
          borderColor: accent,
          borderWidth: 1.5,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <Handle type="target" position={Position.Top}    className="!h-2.5 !w-2.5 !border-2 !border-white" style={{ background: accent }} />
        <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white" style={{ background: accent }} />
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
        <div className="relative flex h-full flex-col justify-between p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mt-1 truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                {data.clusterLabel}
              </div>
            </div>
            <div className="badge-chip shrink-0" style={{ borderColor: `${accent}40`, color: accent, border: "1px solid" }}>
              <span className="data-mono-dense">{data.clusterSize ?? 0}</span> nodes
            </div>
          </div>
          <div className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)] line-clamp-2">
            {data.clusterSummary}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative h-full overflow-hidden rounded-lg transition-transform duration-200 ${selected ? "ring-2 ring-[var(--color-accent-subtle)]" : ""}`}
      style={{
        width: nodeWidth,
        minWidth: nodeWidth,
        maxWidth: nodeWidth,
        backgroundColor: "var(--color-bg-surface)",
        border: `1.5px solid ${colors.border}`,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: colors.bg }} />
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: colors.border }} />
      <Handle type="target" position={Position.Top}    className="!h-2.5 !w-2.5 !border-2 !border-white" style={{ background: colors.border }} />
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white" style={{ background: colors.border }} />
      <div className="relative flex h-full flex-col justify-between gap-2 px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {meta && (
              <div
                className="inline-flex shrink-0 items-center justify-center rounded-md border px-1.5 py-1"
                style={{ borderColor: `${colors.border}33`, color: roleColor }}
              >
                {meta.icon}
              </div>
            )}
            {/* truncate prevents the label from ever widening the node */}
            <div
              className="min-w-0 truncate text-[13px] font-semibold text-[var(--color-text-primary)]"
              title={data.label}
            >
              {data.label}
            </div>
          </div>
        </div>
        {(data.sublabel || data.pathLabel) && (
          <div className="truncate data-mono-dense text-[var(--color-text-tertiary)]" title={data.sublabel || data.pathLabel}>
            {data.sublabel || data.pathLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailGraphNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const category = data.category ?? "internal";
  const colors   = ROLE_COLORS[category] || ROLE_COLORS.internal;

  // Clamp to a fixed width — the key fix.
  // Previously `minWidth: data.width` let the browser grow the node to fit
  // its content (long api-endpoint route strings, code snippets, etc.)
  // which made that node's entire depth row stretch horizontally.
  // Setting explicit width + maxWidth + overflow:hidden on the wrapper
  // means the node stays the same size as every other node in the graph.
  let nodeWidth = Math.min(data.width ?? NODE_FIXED_WIDTH, NODE_MAX_WIDTH);
  
  let dynamicColors = { ...colors };
  let borderStyle = "solid";
  if (data.diffStatus === 'added') {
    dynamicColors.border = "#10B981"; // green
    dynamicColors.bg = "rgba(16, 185, 129, 0.1)";
  } else if (data.diffStatus === 'removed') {
    dynamicColors.border = "#EF4444"; // red
    dynamicColors.bg = "rgba(239, 68, 68, 0.1)";
    borderStyle = "dashed";
  } else if (data.diffStatus === 'modified') {
    dynamicColors.border = "#F59E0B"; // amber
    dynamicColors.bg = "rgba(245, 158, 11, 0.1)";
  } else if (data.diffStatus === 'unchanged') {
    dynamicColors.bg = "rgba(248, 250, 252, 0.5)"; // dimmed
    dynamicColors.border = "rgba(148, 163, 184, 0.5)";
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-lg transition-all duration-200 ${selected ? "ring-2 ring-[var(--color-accent)]" : ""}`}
      style={{
        width: nodeWidth,
        minWidth: nodeWidth,
        maxWidth: nodeWidth,
        // Fixed height keeps the canvas grid uniform; content is truncated
        height: NODE_FIXED_HEIGHT,
        backgroundColor: "var(--color-bg-surface)",
        border: `1.5px ${borderStyle} ${dynamicColors.border}`,
        boxShadow: "var(--shadow-card)",
        opacity: data.diffStatus === 'removed' ? 0.7 : 1,
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: dynamicColors.bg }} />
      <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-lg" style={{ background: dynamicColors.border }} />
      <Handle type="target" position={Position.Top}    className="!h-3 !w-3 !border-2 !border-white" style={{ background: dynamicColors.border }} />
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-white" style={{ background: dynamicColors.border }} />

      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] uppercase font-bold tracking-wider shrink-0" style={{ color: dynamicColors.border }}>
            {data.kind === "npm-package"
              ? "NPM"
              : data.extension
              ? `.${data.extension}`
              : data.kind}
          </span>
          {data.isCyclic && (
            <div className="text-rose-500 flex items-center gap-1 shrink-0" title="Circular Dependency Detected">
              <AlertTriangle className="h-3 w-3" />
            </div>
          )}
        </div>
        {(data.inbound ?? 0) > 6 && (
          <div className="badge-chip badge-hotspot !text-[9px] shrink-0">Hotspot</div>
        )}
      </div>

      <div className="px-3 pb-2 flex flex-col justify-between" style={{ height: "calc(100% - 24px)" }}>
        <div className="min-w-0">
          <div
            className="truncate text-xs font-bold text-[var(--color-text-primary)] tracking-tight"
            title={data.label}
          >
            {data.label}
          </div>
        </div>

        <div className="mt-1 flex items-center gap-3">
          <div className="flex items-center gap-1" title="Files that import this">
            <span className="text-[9px] font-mono text-[var(--color-text-tertiary)] uppercase tracking-widest">IN</span>
            <span className="text-[11px] font-mono font-semibold text-[var(--color-text-primary)]">{data.inbound ?? 0}</span>
          </div>
          <div className="flex items-center gap-1" title="Files this imports">
            <span className="text-[9px] font-mono text-[var(--color-text-tertiary)] uppercase tracking-widest">OUT</span>
            <span className="text-[11px] font-mono font-semibold text-[var(--color-text-primary)]">{data.outbound ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DirectoryGroupNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const isCollapsed = data.isCollapsed;
  return (
    <>
      {isCollapsed && (
        <>
          <Handle type="target" position={Position.Top} className="!opacity-0 pointer-events-none" />
          <Handle type="source" position={Position.Bottom} className="!opacity-0 pointer-events-none" />
        </>
      )}
      <div
      className={`group relative rounded-[16px] transition-all duration-300 ${selected ? "ring-2 ring-[var(--color-accent)] ring-offset-2" : ""}`}
      style={{
        width: data.width,
        maxWidth: data.width,
        height: data.height,
        maxHeight: data.height,
        overflow: 'hidden',
        backgroundColor: "rgba(248, 250, 252, 0.6)", // slate-50 with opacity
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${isCollapsed ? 'rgba(15, 23, 42, 0.15)' : 'rgba(15, 23, 42, 0.06)'}`,
        boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 10px 30px -10px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[40px] flex items-center px-4 border-b border-[rgba(15,23,42,0.06)] bg-[rgba(255,255,255,0.7)] backdrop-blur-md overflow-hidden">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <FolderKanban className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-[13px] font-mono font-semibold text-slate-800 truncate block tracking-tight">
              {data.pathLabel}
            </span>
            {isCollapsed && (
              <span className="ml-2 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                +{data.clusterSize} items
              </span>
            )}
          </div>
          {data.onToggle && (
            <button 
              className="text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded px-2 py-0.5 text-[10px] font-semibold transition ml-2 shrink-0 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                data.onToggle!(data.rawLabel);
              }}
            >
              {isCollapsed ? "Expand" : "Collapse"}
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

const NODE_FIXED_HEIGHT = 80;

export const NODE_TYPES = {
  analysisNode:  React.memo(AnalysisGraphNode),
  detailNode:    React.memo(DetailGraphNode),
  clusterNode:   React.memo(AnalysisGraphNode),
  collapsedDir:  React.memo(AnalysisGraphNode),
  directoryNode: React.memo(DirectoryGroupNode),
} as const as any;
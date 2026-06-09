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
  const nodeWidth = Math.min(data.width ?? NODE_FIXED_WIDTH, NODE_MAX_WIDTH);

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
        border: `1.5px solid ${colors.border}`,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: colors.bg }} />
      <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-lg" style={{ background: colors.border }} />
      <Handle type="target" position={Position.Top}    className="!h-3 !w-3 !border-2 !border-white" style={{ background: colors.border }} />
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-white" style={{ background: colors.border }} />

      <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="micro-label shrink-0" style={{ color: colors.border }}>
            {data.kind === "npm-package"
              ? "NPM"
              : data.extension
              ? `.${data.extension}`
              : data.kind}
          </span>
          {data.isCyclic && (
            <div className="badge-chip badge-cycle flex items-center gap-1 shrink-0" title="Circular Dependency Detected">
              <AlertTriangle className="h-3 w-3" />
            </div>
          )}
        </div>
        {(data.inbound ?? 0) > 6 && (
          <div className="badge-chip badge-hotspot shrink-0">Hotspot</div>
        )}
      </div>

      <div className="px-3.5 pb-2.5 flex flex-col justify-between" style={{ height: "calc(100% - 32px)" }}>
        <div className="min-w-0">
          {/* Both label and path use truncate — no text can widen the node */}
          <div
            className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]"
            title={data.label}
          >
            {data.label}
          </div>
          <div
            className="truncate data-mono-dense text-[var(--color-text-tertiary)] mt-0.5"
            title={data.pathLabel}
          >
            {data.pathLabel || "root"}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-2">
          <div className="flex flex-col items-center px-2" title="Files that import this">
            <span className="micro-label">In</span>
            <span className="data-mono-dense font-semibold text-[var(--color-text-primary)]">{data.inbound ?? 0}</span>
          </div>
          <div className="h-6 w-px bg-[var(--color-border-subtle)]" />
          <div className="flex flex-col items-center px-2" title="Files this imports">
            <span className="micro-label">Out</span>
            <span className="data-mono-dense font-semibold text-[var(--color-text-primary)]">{data.outbound ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared fixed height — keeps the canvas grid uniform and prevents
// nodes with extra content from pushing neighbours out of alignment.
const NODE_FIXED_HEIGHT = 130;

export const NODE_TYPES = {
  analysisNode:  AnalysisGraphNode,
  detailNode:    DetailGraphNode,
  clusterNode:   AnalysisGraphNode,
  collapsedDir:  AnalysisGraphNode,
} as const as any;
"use client";

import React from "react";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { Database, FolderKanban, FileCode2, Globe2 } from "lucide-react";

export type GraphNodeKind = "file" | "api-endpoint" | "storage" | "folder";

export type GraphNodeData = {
  label: string;
  rawLabel: string;
  kind: GraphNodeKind | "cluster";
  codeSnippet?: string;
  clusterLabel?: string;
  pathLabel?: string;
  clusterSize?: number;
  clusterSummary?: string;
  accent?: string;
  isCluster?: boolean;
};

const KIND_META: Record<GraphNodeKind, { label: string; icon: React.ReactNode }> = {
  file: { label: "File", icon: <FileCode2 className="h-4 w-4" /> },
  "api-endpoint": { label: "API", icon: <Globe2 className="h-4 w-4" /> },
  storage: { label: "Storage", icon: <Database className="h-4 w-4" /> },
  folder: { label: "Folder", icon: <FolderKanban className="h-4 w-4" /> },
};

const sanitizeSnippet = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "  "))
    .slice(0, 4)
    .join("\n");

export function AnalysisGraphNode({ data, selected }: NodeProps<GraphNodeData>) {
  const accent = data.accent ?? "#2563eb";
  const meta = data.kind === "cluster" ? null : KIND_META[data.kind as GraphNodeKind];

  if (data.isCluster) {
    return (
      <div
        className={`relative h-full w-full overflow-hidden rounded-[30px] border bg-white/95 ${
          selected ? "border-sky-300 ring-2 ring-sky-200/70" : "border-slate-200/70"
        }`}
        style={{
          boxShadow: `0 14px 30px rgba(15, 23, 42, 0.05), 0 0 0 1px ${accent}12 inset`,
          backgroundImage: `linear-gradient(135deg, ${accent}06 0%, rgba(255,255,255,0.96) 45%, rgba(255,255,255,0.94) 100%)`,
          willChange: "transform",
          contain: "paint",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: accent }} />
        <div className="relative flex h-full flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mt-1 truncate text-lg font-semibold text-slate-900">{data.clusterLabel}</div>
            </div>
            <div
              className="shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ borderColor: `${accent}30`, color: accent }}
            >
              {data.clusterSize ?? 0} nodes
            </div>
          </div>

          <div className="mt-3 text-sm leading-6 text-slate-600">{data.clusterSummary}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative h-full w-full overflow-hidden rounded-[28px] border bg-white/98 transition-transform duration-200 ${
        selected ? "border-sky-300 ring-2 ring-sky-200/70" : "border-white/80"
      }`}
      style={{
        boxShadow: selected
          ? `0 14px 28px rgba(37,99,235,0.10), 0 0 0 1px ${accent}18 inset`
          : `0 10px 22px rgba(15,23,42,0.05), 0 0 0 1px ${accent}10 inset`,
        willChange: "transform",
        contain: "paint",
      }}
    >
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: accent }} />
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-white"
        style={{ background: accent }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-white"
        style={{ background: accent }}
      />

        <div className="relative flex h-full flex-col justify-between gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {meta ? (
              <div
                className="inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-1"
                style={{ borderColor: `${accent}22`, color: accent }}
              >
                {meta.icon}
              </div>
            ) : null}
            <div className="min-w-0 truncate text-sm font-semibold text-slate-900">{data.label}</div>
          </div>

          {meta ? (
            <div
              className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
              style={{ borderColor: `${accent}26`, color: accent }}
            >
              {meta.label}
            </div>
          ) : null}
        </div>

        {data.pathLabel && data.kind !== "file" ? (
          <div className="truncate text-[11px] text-slate-500">{data.pathLabel}</div>
        ) : null}

        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] leading-4 text-slate-500">
          {data.kind === "api-endpoint"
            ? "External service call"
            : data.kind === "storage"
              ? "Shared data or persistence layer"
              : data.kind === "folder"
                ? "Structural folder node"
                : "Source file"}
        </div>
      </div>
    </div>
  );
}

export function AnalysisClusterNode(props: NodeProps<GraphNodeData>) {
  return <AnalysisGraphNode {...props} />;
}

export const NODE_TYPES = {
  analysisNode: AnalysisGraphNode,
  clusterNode: AnalysisClusterNode,
} as const as any;

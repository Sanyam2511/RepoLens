"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Node,
  Edge,
  Position,
  MarkerType,
  ReactFlowInstance,
} from "@xyflow/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { RepoGraph } from "shared";
import { NODE_TYPES, ROLE_COLORS, NodeCategory, type GraphNodeData } from "./GraphNodes";
import { Copy, AlertTriangle, Search, X } from "lucide-react";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 130;
const GRID_COLS = 4;

// Horizontal and vertical spacing between nodes in the layered graph
const X_GAP = 60;   // gap between nodes on the same row
const Y_GAP = 110;  // gap between depth levels (on top of NODE_HEIGHT)
const Y_STEP = NODE_HEIGHT + Y_GAP;
const X_STEP = NODE_WIDTH + X_GAP;

const getDisplayName = (nodeId: string) => {
  const parts = nodeId.split("/");
  const filename = parts.pop() || nodeId;
  const relativePath = parts.join("/");
  return { filename, relativePath };
};

const IGNORED_EXTS = new Set([
  "svg", "ico", "png", "jpg", "jpeg", "css", "scss",
  "md", "mdx", "sql", "toml", "prisma", "lock",
  "yml", "yaml", "txt", "woff", "woff2", "ttf", "eot",
]);

const IGNORED_FILENAMES = new Set([
  ".gitignore", ".env", ".env.example", ".env.local",
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "eslint.config.mjs", "eslint.config.js",
  "postcss.config.mjs", "postcss.config.js",
  "tailwind.config.ts", "tailwind.config.js",
  "next.config.ts", "next.config.js",
  "vitest.config.ts", "jest.config.ts",
  "tsconfig.json", "tsconfig.node.json",
]);

const shouldShowNode = (nodeId: string, nodeType: string): boolean => {
  if (nodeType !== "file") return true;
  const filename = nodeId.split("/").pop()?.toLowerCase() ?? "";
  if (filename === "package.json") return true;
  if (IGNORED_FILENAMES.has(filename)) return false;
  const ext = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : "";
  if (ext && IGNORED_EXTS.has(ext)) return false;
  return true;
};

const categorizeNodeByDegree = (
  kind: string, inbound: number, outbound: number, path: string
): NodeCategory => {
  if (kind === "npm-package") return "npm";
  if (kind === "api-endpoint") return "api";
  if (kind === "storage") return "storage";
  if (inbound === 0 && outbound > 0) return "entry";
  if (inbound > 4) return "hotspot";
  if (outbound === 0 && inbound > 0) return "leaf";
  const p = path.toLowerCase();
  if (p.includes("db") || p.includes("prisma") || p.includes("storage")) return "storage";
  if (p.includes("route") || p.includes("api") || p.includes("controller")) return "api";
  return "internal";
};

// ---------------------------------------------------------------------------
// Sugiyama-style layered layout (BFS depth + median-heuristic X ordering)
// ---------------------------------------------------------------------------
//
// The problem with the old approach: nodes at the same BFS depth were simply
// spread evenly across X with no regard for which nodes they connect to. This
// caused long, crossing-heavy edges because a node at depth 2 might be placed
// far from the depth-1 node it imports from.
//
// This implementation does three passes:
//
//  Pass 1 – BFS depth assignment (same as before, "deepen but never reduce")
//  Pass 2 – Within each depth level, sort nodes by the *median X index* of
//            their parents (top-down) then their children (bottom-up). Two
//            iterations of this is the classic Sugiyama crossing-minimisation
//            heuristic and dramatically reduces tangled edges.
//  Pass 3 – Assign final pixel X by the sorted order within each layer,
//            centred around x=0 so fitView stays symmetric.
//
// The result: nodes that share parents/children cluster together horizontally,
// making the graph readable even for dense repos.

function computeLayeredLayout(
  connectedNodes: Array<{ id: string }>,
  connectedIds: Set<string>,
  edgesToRender: Array<{ source: string; target: string }>,
  adjacency: Map<string, string[]>,
): Map<string, { x: number; y: number }> {

  // ── Pass 1: BFS longest-path depth ──────────────────────────────────────

  const localInDegree = new Map<string, number>();
  connectedNodes.forEach(n => localInDegree.set(n.id, 0));
  edgesToRender.forEach(e => {
    if (connectedIds.has(e.source) && connectedIds.has(e.target))
      localInDegree.set(e.target, (localInDegree.get(e.target) ?? 0) + 1);
  });

  const depthMap = new Map<string, number>();
  const bfsQueue: string[] = [];

  connectedNodes.forEach(n => {
    if ((localInDegree.get(n.id) ?? 0) === 0) {
      depthMap.set(n.id, 0);
      bfsQueue.push(n.id);
    }
  });

  const depthCap = connectedNodes.length;
  for (let qi = 0; qi < bfsQueue.length; qi++) {
    const nodeId = bfsQueue[qi]!;
    const d = depthMap.get(nodeId) ?? 0;
    if (d >= depthCap) continue;
    for (const nb of adjacency.get(nodeId) ?? []) {
      if (connectedIds.has(nb) && (depthMap.get(nb) ?? -1) < d + 1) {
        depthMap.set(nb, d + 1);
        bfsQueue.push(nb);
      }
    }
  }
  // Anything unreachable from roots (cycle islands) gets depth 0
  connectedNodes.forEach(n => { if (!depthMap.has(n.id)) depthMap.set(n.id, 0); });

  // ── Pass 2: Median-heuristic crossing minimisation ───────────────────────
  //
  // For each depth level, we sort nodes by the median *order index* of their
  // parents in the layer above (top-down sweep), then by their children in
  // the layer below (bottom-up sweep). Two sweeps is the standard Sugiyama
  // heuristic; more sweeps give diminishing returns.

  // Build layer → node list
  const layers = new Map<number, string[]>();
  connectedNodes.forEach(n => {
    const d = depthMap.get(n.id) ?? 0;
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(n.id);
  });

  // orderIndex: the current position of a node within its layer
  const orderIndex = new Map<string, number>();
  layers.forEach((ids) => ids.forEach((id, i) => orderIndex.set(id, i)));

  // Build reverse adjacency scoped to connected nodes
  const reverseAdj = new Map<string, string[]>();
  connectedNodes.forEach(n => reverseAdj.set(n.id, []));
  edgesToRender.forEach(e => {
    if (connectedIds.has(e.source) && connectedIds.has(e.target))
      reverseAdj.get(e.target)?.push(e.source);
  });

  const medianOf = (indices: number[]): number => {
    if (indices.length === 0) return 0;
    const s = [...indices].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
  };

  const sortedDepths = Array.from(layers.keys()).sort((a, b) => a - b);

  // Two full passes (top-down then bottom-up)
  for (let pass = 0; pass < 2; pass++) {
    // Top-down: sort by median parent index
    for (const depth of sortedDepths) {
      if (depth === 0) continue;
      const layer = layers.get(depth)!;
      layer.sort((a, b) => {
        const parentsA = reverseAdj.get(a) ?? [];
        const parentsB = reverseAdj.get(b) ?? [];
        const medA = medianOf(parentsA.map(p => orderIndex.get(p) ?? 0));
        const medB = medianOf(parentsB.map(p => orderIndex.get(p) ?? 0));
        return medA - medB;
      });
      layer.forEach((id, i) => orderIndex.set(id, i));
    }

    // Bottom-up: sort by median child index
    for (const depth of [...sortedDepths].reverse()) {
      const layer = layers.get(depth)!;
      layer.sort((a, b) => {
        const childrenA = adjacency.get(a)?.filter(c => connectedIds.has(c)) ?? [];
        const childrenB = adjacency.get(b)?.filter(c => connectedIds.has(c)) ?? [];
        const medA = medianOf(childrenA.map(c => orderIndex.get(c) ?? 0));
        const medB = medianOf(childrenB.map(c => orderIndex.get(c) ?? 0));
        return medA - medB;
      });
      layer.forEach((id, i) => orderIndex.set(id, i));
    }
  }

  // ── Pass 3: Assign pixel positions ──────────────────────────────────────
  //
  // Centre each layer around x = 0. Nodes within a layer are spaced X_STEP
  // apart, ordered by the index we just computed.

  const nodePos = new Map<string, { x: number; y: number }>();

  sortedDepths.forEach(depth => {
    const layer = layers.get(depth)!;
    const totalWidth = layer.length * X_STEP;
    layer.forEach((id, i) => {
      nodePos.set(id, {
        x: i * X_STEP - totalWidth / 2 + X_STEP / 2,
        y: depth * Y_STEP + 60,
      });
    });
  });

  return nodePos;
}

// ---------------------------------------------------------------------------

export default function ArchitectureDetail({ graphData }: { graphData: RepoGraph | null }) {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<GraphNodeData>, Edge> | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [criticalPathOnly, setCriticalPathOnly] = useState(false);
  const [showNpm, setShowNpm] = useState(false);

  const processedData = useMemo(() => {
    if (!graphData) return null;

    const visibleNodes = graphData.nodes.filter(n => {
      if (!showNpm && n.type === "npm-package") return false;
      return shouldShowNode(n.id, n.type);
    });
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    const validEdges = graphData.edges.filter(
      e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target) && e.source !== e.target
    );

    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    const reverseAdjacency = new Map<string, string[]>();

    visibleNodes.forEach(n => {
      inDegree.set(n.id, 0);
      outDegree.set(n.id, 0);
      adjacency.set(n.id, []);
      reverseAdjacency.set(n.id, []);
    });

    validEdges.forEach(e => {
      outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
      adjacency.get(e.source)?.push(e.target);
      reverseAdjacency.get(e.target)?.push(e.source);
    });

    const cyclicNodes = new Set<string>();
    const cyclicEdges = new Set<string>();
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const detectCycle = (nodeId: string, currentPath: string[]) => {
      if (recStack.has(nodeId)) {
        const start = currentPath.indexOf(nodeId);
        const cycle = currentPath.slice(start);
        cycle.forEach(n => cyclicNodes.add(n));
        for (let i = 0; i < cycle.length - 1; i++) cyclicEdges.add(`${cycle[i]}->${cycle[i + 1]}`);
        cyclicEdges.add(`${cycle[cycle.length - 1]}->${nodeId}`);
        return;
      }
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      recStack.add(nodeId);
      currentPath.push(nodeId);
      for (const neighbor of adjacency.get(nodeId) ?? []) detectCycle(neighbor, [...currentPath]);
      recStack.delete(nodeId);
    };

    visibleNodes.forEach(n => { if (!visited.has(n.id)) detectCycle(n.id, []); });

    const categorizedNodes = visibleNodes.map(n => ({
      ...n,
      inbound: inDegree.get(n.id) ?? 0,
      outbound: outDegree.get(n.id) ?? 0,
      category: categorizeNodeByDegree(n.type, inDegree.get(n.id) ?? 0, outDegree.get(n.id) ?? 0, n.id),
    }));

    return { nodes: categorizedNodes, edges: validEdges, inDegree, outDegree, cyclicNodes, cyclicEdges, adjacency, reverseAdjacency };
  }, [graphData, showNpm]);

  const mapDataToCanvas = useCallback(() => {
    if (!processedData) return;
    const { nodes: pNodes, edges: pEdges, inDegree, outDegree, cyclicNodes, cyclicEdges } = processedData;

    let visibleNodes = pNodes;
    if (criticalPathOnly) {
      visibleNodes = visibleNodes.filter(n =>
        n.type !== "file" || (inDegree.get(n.id) ?? 0) > 0 || (outDegree.get(n.id) ?? 0) > 0
      );
    }

    const visibleIds = new Set(visibleNodes.map(n => n.id));
    const edgesToRender = pEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));

    const connectedIds = new Set<string>();
    edgesToRender.forEach(e => { connectedIds.add(e.source); connectedIds.add(e.target); });

    const connectedNodes = visibleNodes.filter(n => connectedIds.has(n.id));
    const isolatedNodes = visibleNodes.filter(n => !connectedIds.has(n.id));

    const positionedNodes: Node<GraphNodeData>[] = [];
    let maxLayoutY = 0;

    if (connectedNodes.length > 0) {
      const nodePos = computeLayeredLayout(
        connectedNodes,
        connectedIds,
        edgesToRender,
        processedData.adjacency,
      );

      // Track the lowest Y so isolated nodes are placed below
      nodePos.forEach(pos => { maxLayoutY = Math.max(maxLayoutY, pos.y); });

      connectedNodes.forEach(n => {
        const pos = nodePos.get(n.id) ?? { x: 0, y: 0 };
        const w = (inDegree.get(n.id) ?? 0) > 4 ? 300 : NODE_WIDTH;
        const { filename, relativePath } = getDisplayName(n.id);
        const ext = filename.includes(".") ? filename.split(".").pop() : "";
        positionedNodes.push({
          id: n.id,
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          position: pos,
          type: "detailNode",
          data: {
            label: filename,
            rawLabel: n.id,
            pathLabel: relativePath,
            kind: n.type,
            category: n.category as NodeCategory,
            inbound: n.inbound,
            outbound: n.outbound,
            isCyclic: cyclicNodes.has(n.id),
            extension: ext,
            codeSnippet: n.codeSnippet,
            width: w,
          },
        });
      });
    }

    if (isolatedNodes.length > 0) {
      const startY = maxLayoutY > 0 ? maxLayoutY + NODE_HEIGHT + 120 : 40;
      isolatedNodes.forEach((n, idx) => {
        const col = idx % GRID_COLS;
        const row = Math.floor(idx / GRID_COLS);
        const { filename, relativePath } = getDisplayName(n.id);
        const ext = filename.includes(".") ? filename.split(".").pop() : "";
        positionedNodes.push({
          id: n.id,
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          position: { x: col * (NODE_WIDTH + 60), y: startY + row * (NODE_HEIGHT + 60) },
          type: "detailNode",
          data: {
            label: filename,
            rawLabel: n.id,
            pathLabel: relativePath,
            kind: n.type,
            category: "internal" as NodeCategory,
            inbound: 0,
            outbound: 0,
            isCyclic: false,
            extension: ext,
            codeSnippet: n.codeSnippet,
            width: NODE_WIDTH,
          },
        });
      });
    }

    const layoutedEdges: Edge[] = edgesToRender.map(edge => {
      const srcNode = visibleNodes.find(n => n.id === edge.source);
      const color = ROLE_COLORS[(srcNode?.category as NodeCategory) ?? "internal"]?.border ?? "#64748b";
      const isCyclic = cyclicEdges.has(`${edge.source}->${edge.target}`);
      return {
        id: `e-${edge.source}->${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: isCyclic,
        zIndex: -1,
        markerEnd: { type: MarkerType.ArrowClosed, color: isCyclic ? "#991B1B" : color, width: 10, height: 10 },
        style: { stroke: isCyclic ? "#991B1B" : color, strokeWidth: 1.5, opacity: 0.6 },
      };
    });

    setNodes(positionedNodes);
    setEdges(layoutedEdges);

    if (rfInstance) {
      setTimeout(() => rfInstance.fitView({ padding: 0.12, duration: 800, minZoom: 0.05, maxZoom: 1 }), 100);
    }
  }, [processedData, criticalPathOnly, rfInstance, setNodes, setEdges]);

  useEffect(() => { mapDataToCanvas(); }, [mapDataToCanvas]);

  useEffect(() => {
    if (!processedData) return;
    setNodes(nds => nds.map(n => {
      if (!focusedNodeId) return { ...n, style: { ...n.style, opacity: 1 } };
      const focused = n.id === focusedNodeId;
      const neighbor = processedData.adjacency.get(focusedNodeId)?.includes(n.id)
        || processedData.reverseAdjacency.get(focusedNodeId)?.includes(n.id);
      return { ...n, style: { ...n.style, opacity: focused || neighbor ? 1 : 0.15 } };
    }));
    setEdges(eds => eds.map(e => {
      if (!focusedNodeId) return { ...e, style: { ...e.style, opacity: 0.6, strokeWidth: 1.5 }, zIndex: -1 };
      if (e.source === focusedNodeId) return { ...e, style: { ...e.style, opacity: 1, strokeWidth: 3, stroke: "#232F72" }, zIndex: 10 };
      if (e.target === focusedNodeId) return { ...e, style: { ...e.style, opacity: 1, strokeWidth: 3, stroke: "#10B981" }, zIndex: 10 };
      return { ...e, style: { ...e.style, opacity: 0.05, strokeWidth: 1 }, zIndex: -1 };
    }));
  }, [focusedNodeId, processedData, setNodes, setEdges]);

  const focusedNodeData = useMemo(
    () => nodes.find(n => n.id === focusedNodeId)?.data as GraphNodeData | undefined,
    [nodes, focusedNodeId]
  );

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setFocusedNodeId(node.id);
    const w = (node.data as GraphNodeData).width as number ?? NODE_WIDTH;
    if (rfInstance) rfInstance.setCenter(node.position.x + w / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 0.9, duration: 600 });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const target = nodes.find(n => (n.data as GraphNodeData).label.toLowerCase().includes(searchQuery.toLowerCase()));
    if (target) handleNodeClick(e as any, target);
  };


  return (
    <div className="relative w-full h-full bg-[var(--color-bg-base)] overflow-hidden rounded-xl dot-grid-bg">
      {/* Right panel */}
      <div className="absolute top-6 right-6 z-10 w-72 flex flex-col gap-4">
        <form onSubmit={handleSearch} className="bg-[var(--color-bg-surface)]/80 backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-2xl shadow-xl p-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-[var(--color-text-tertiary)] ml-2" />
          <input
            type="text"
            placeholder="Search a file..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 outline-none data-mono bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
          />
        </form>

        <div className="bg-[var(--color-bg-surface)]/80 backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-2xl shadow-xl p-4">
          <div className="micro-label mb-2">Role Legend</div>
          <div className="flex flex-wrap gap-x-3 gap-y-2">
            {Object.entries(ROLE_COLORS).map(([role, colors]) => (
              <div key={role} className="flex items-center gap-1.5 ui-label text-[var(--color-text-secondary)] capitalize text-xs">
                <span className="w-2.5 h-2.5 rounded-sm border" style={{ backgroundColor: colors.bg, borderColor: colors.border }} />
                {role}
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setCriticalPathOnly(p => !p)}
              className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all ${
                criticalPathOnly
                  ? "bg-[var(--color-accent)]/90 text-white shadow-md border border-transparent"
                  : "bg-[var(--color-bg-subtle)]/50 text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {criticalPathOnly ? "Show All" : "Connected"}
            </button>
            <button
              onClick={() => setShowNpm(p => !p)}
              className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all ${
                showNpm
                  ? "bg-[var(--color-node-npm)]/90 text-white shadow-md border border-transparent"
                  : "bg-[var(--color-bg-subtle)]/50 text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {showNpm ? "Hide NPM" : "Show NPM"}
            </button>
          </div>
        </div>
      </div>

      {/* Right inspect panel (Overlay) */}
      <div
        className={`absolute top-0 right-0 bottom-0 z-30 w-96 bg-[var(--color-bg-surface)]/95 backdrop-blur-2xl border-l border-[var(--color-border-subtle)] shadow-2xl flex flex-col transition-all duration-300 transform ${
          focusedNodeId ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="p-5 border-b border-[var(--color-border-subtle)]/50 flex items-start justify-between">
          <div className="min-w-0 pr-4">
            <div className="micro-label mb-1">Inspecting</div>
            <div className="font-semibold text-[var(--color-text-primary)] truncate">{focusedNodeData?.label}</div>
            <div className="data-mono-dense text-[var(--color-text-tertiary)] truncate" title={focusedNodeData?.pathLabel}>
              {focusedNodeData?.pathLabel}
            </div>
          </div>
          <button onClick={() => setFocusedNodeId(null)} className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] bg-[var(--color-bg-subtle)] rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <button
            onClick={() => navigator.clipboard.writeText(focusedNodeData?.rawLabel ?? "")}
            className="w-full flex items-center justify-center gap-2 btn-secondary py-2 text-xs"
          >
            <Copy className="w-3 h-3" /> Copy Path
          </button>

          {focusedNodeData?.isCyclic && (
            <div className="badge-cycle p-3 rounded-lg text-xs flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> Part of a circular dependency loop.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between micro-label mb-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-healthy)]" /> Dependents
              </span>
              <span className="data-mono-dense">{processedData?.reverseAdjacency.get(focusedNodeId!)?.length ?? 0}</span>
            </div>
            <div className="space-y-1">
              {processedData?.reverseAdjacency.get(focusedNodeId!)?.map(id => {
                const targetNode = nodes.find(n => n.id === id);
                return (
                  <div
                    key={id}
                    className="data-mono-dense text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] px-2 py-1.5 rounded truncate cursor-pointer hover:bg-[var(--color-accent-subtle)]"
                    onClick={e => targetNode && handleNodeClick(e as any, targetNode)}
                  >
                    {getDisplayName(id).filename}
                  </div>
                );
              })}
              {!processedData?.reverseAdjacency.get(focusedNodeId!)?.length && (
                <div className="ui-label text-[var(--color-text-tertiary)] italic">No inbound imports.</div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between micro-label mb-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" /> Dependencies
              </span>
              <span className="data-mono-dense">{processedData?.adjacency.get(focusedNodeId!)?.length ?? 0}</span>
            </div>
            <div className="space-y-1">
              {processedData?.adjacency.get(focusedNodeId!)?.map(id => {
                const targetNode = nodes.find(n => n.id === id);
                return (
                  <div
                    key={id}
                    className="data-mono-dense text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] px-2 py-1.5 rounded truncate cursor-pointer hover:bg-[var(--color-accent-subtle)]"
                    onClick={e => targetNode && handleNodeClick(e as any, targetNode)}
                  >
                    {getDisplayName(id).filename}
                  </div>
                );
              })}
              {!processedData?.adjacency.get(focusedNodeId!)?.length && (
                <div className="ui-label text-[var(--color-text-tertiary)] italic">No outbound imports.</div>
              )}
            </div>
          </div>

          {focusedNodeData?.kind === "file" && focusedNodeData.codeSnippet && (
            <div>
              <div className="micro-label mb-2">Code Snippet</div>
              <div className="border border-[var(--color-border-strong)] rounded-lg overflow-hidden bg-[var(--color-bg-subtle)]">
                <SyntaxHighlighter
                  language="typescript"
                  style={oneLight}
                  customStyle={{ background: "transparent", margin: 0, fontSize: "11px", padding: "10px", fontFamily: "var(--font-mono)" }}
                >
                  {focusedNodeData.codeSnippet}
                </SyntaxHighlighter>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReactFlow<Node<GraphNodeData>, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick as any}
        onPaneClick={() => setFocusedNodeId(null)}
        onInit={setRfInstance}
        minZoom={0.05}
        maxZoom={2}
        className="bg-transparent"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#E2E8F0" />
        <Controls className="!bg-[var(--color-bg-surface)] !border-[var(--color-border-strong)] text-[var(--color-text-secondary)]" />
        <MiniMap
          maskColor="rgba(248, 250, 252, 0.85)"
          nodeColor={n => ROLE_COLORS[(n.data as GraphNodeData).category ?? "internal"]?.border ?? "#64748b"}
        />
      </ReactFlow>
    </div>
  );
}
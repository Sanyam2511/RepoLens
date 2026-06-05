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
import dagre from "dagre";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { RepoGraph } from "shared";
import { NODE_TYPES, ROLE_COLORS, NodeCategory, type GraphNodeData } from "./GraphNodes";
import { Copy, AlertTriangle, Search, X } from "lucide-react";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 130;
const GRID_COLS = 4;

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

const categorizeNodeByDegree = (kind: string, inbound: number, outbound: number, path: string): NodeCategory => {
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

export default function ArchitectureDetail({ graphData }: { graphData: RepoGraph | null }) {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<GraphNodeData>, Edge> | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [criticalPathOnly, setCriticalPathOnly] = useState(false);

  const processedData = useMemo(() => {
    if (!graphData) return null;

    const visibleNodes = graphData.nodes.filter(n => shouldShowNode(n.id, n.type));
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

    console.log("[detail] visible nodes:", categorizedNodes.length, "valid edges:", validEdges.length);

    return { nodes: categorizedNodes, edges: validEdges, inDegree, outDegree, cyclicNodes, cyclicEdges, adjacency, reverseAdjacency };
  }, [graphData]);

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
    let maxDagreY = 0;

    if (connectedNodes.length > 0) {
      const g = new dagre.graphlib.Graph();
      g.setDefaultEdgeLabel(() => ({}));
      g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 120, marginx: 60, marginy: 60 });

      connectedNodes.forEach(n => {
        const w = (inDegree.get(n.id) ?? 0) > 4 ? 300 : NODE_WIDTH;
        g.setNode(n.id, { width: w, height: NODE_HEIGHT });
      });

      edgesToRender.forEach(e => {
        g.setEdge(e.source, e.target, { weight: cyclicEdges.has(`${e.source}->${e.target}`) ? 1 : 10 });
      });

      const hasInbound = new Set(edgesToRender.map(e => e.target));
      const entryNodes = connectedNodes.filter(n => !hasInbound.has(n.id));
      g.setNode("__ROOT__", { width: 1, height: 1 });
      entryNodes.forEach(n => g.setEdge("__ROOT__", n.id, { weight: 1, minlen: 1 }));

      dagre.layout(g);

      connectedNodes.forEach(n => {
        const pos = g.node(n.id);
        if (!pos) return;
        const w = (inDegree.get(n.id) ?? 0) > 4 ? 300 : NODE_WIDTH;
        const { filename, relativePath } = getDisplayName(n.id);
        const ext = filename.includes(".") ? filename.split(".").pop() : "";

        maxDagreY = Math.max(maxDagreY, pos.y + NODE_HEIGHT);

        positionedNodes.push({
          id: n.id,
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          position: { x: pos.x - w / 2, y: pos.y - NODE_HEIGHT / 2 },
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
      const startY = maxDagreY > 0 ? maxDagreY + 120 : 40;
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
        markerEnd: { type: MarkerType.ArrowClosed, color: isCyclic ? "#EF4444" : color, width: 10, height: 10 },
        style: { stroke: isCyclic ? "#EF4444" : color, strokeWidth: 1.5, opacity: 0.6 },
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
      if (!focusedNodeId) return { ...e, style: { ...e.style, opacity: 0.6, strokeWidth: 1.5 } };
      if (e.source === focusedNodeId) return { ...e, style: { ...e.style, opacity: 1, strokeWidth: 3, stroke: "#6366F1" }, zIndex: 10 };
      if (e.target === focusedNodeId) return { ...e, style: { ...e.style, opacity: 1, strokeWidth: 3, stroke: "#10B981" }, zIndex: 10 };
      return { ...e, style: { ...e.style, opacity: 0.05, strokeWidth: 1 }, zIndex: 0 };
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

  const hotspotCount = useMemo(
    () => Array.from(processedData?.inDegree.values() ?? []).filter(v => v > 4).length,
    [processedData]
  );

  return (
    <div className="relative w-full h-full bg-[var(--color-bg-base)] overflow-hidden rounded-xl dot-grid-bg">
      {/* Right panel */}
      <div className="absolute top-4 right-4 z-10 w-72 flex flex-col gap-4">
        <form onSubmit={handleSearch} className="compact-card p-2 flex items-center gap-2 bg-[var(--color-bg-surface)]">
          <Search className="w-4 h-4 text-[var(--color-text-tertiary)] ml-2" />
          <input
            type="text"
            placeholder="Search a file..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 outline-none data-mono bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
          />
        </form>

        <div className="compact-card p-4 bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)]">
          <div className="micro-label mb-3">Graph Metrics</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="metric-card">
              <div className="micro-label">Nodes</div>
              <div className="data-mono font-semibold text-[var(--color-text-primary)]">{nodes.length}</div>
            </div>
            <div className="metric-card">
              <div className="micro-label">Edges</div>
              <div className="data-mono font-semibold text-[var(--color-text-primary)]">{edges.length}</div>
            </div>
            <div className="metric-card" style={{ background: "var(--color-cycle-subtle)", borderColor: "color-mix(in srgb, var(--color-cycle) 20%, transparent)" }}>
              <div className="micro-label" style={{ color: "var(--color-cycle)" }}>Cycles</div>
              <div className="data-mono font-semibold" style={{ color: "var(--color-cycle)" }}>{processedData?.cyclicNodes.size ?? 0}</div>
            </div>
            <div className="metric-card" style={{ background: "var(--color-hotspot-subtle)", borderColor: "color-mix(in srgb, var(--color-hotspot) 20%, transparent)" }}>
              <div className="micro-label" style={{ color: "var(--color-hotspot)" }}>Hotspots</div>
              <div className="data-mono font-semibold" style={{ color: "var(--color-hotspot)" }}>{hotspotCount}</div>
            </div>
          </div>

          <div className="micro-label mb-3 border-t border-[var(--color-border-subtle)] pt-3">Role Legend</div>
          <div className="space-y-2">
            {Object.entries(ROLE_COLORS).map(([role, colors]) => (
              <div key={role} className="flex items-center gap-2 ui-label text-[var(--color-text-secondary)] capitalize">
                <span className="w-3 h-3 rounded-sm border" style={{ backgroundColor: colors.bg, borderColor: colors.border }} />
                {role}
              </div>
            ))}
          </div>

          <button
            onClick={() => setCriticalPathOnly(p => !p)}
            className={`mt-4 w-full py-2 micro-label rounded-lg border transition ${
              criticalPathOnly
                ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                : "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {criticalPathOnly ? "Show All Files" : "Connected Only"}
          </button>
        </div>
      </div>

      {/* Left inspect panel */}
      <div
        className={`absolute top-4 left-4 z-20 w-80 compact-card bg-[var(--color-bg-surface)] flex flex-col transition-all duration-300 transform ${
          focusedNodeId ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-start justify-between">
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

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-5">
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

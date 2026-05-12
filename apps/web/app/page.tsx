"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Node,
  Edge,
  Position,
  ReactFlowInstance,
} from "@xyflow/react";
import dagre from "dagre";
import { Search, Loader2 } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// We import the shared types so the frontend knows exactly what to expect
import { RepoNode, RepoEdge, RepoGraph } from "shared";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 86;
const GRID_GAP_X = 80;
const GRID_GAP_Y = 70;
const COMPONENT_GAP_X = 160;
const COMPONENT_GAP_Y = 160;
const MAX_ROW_WIDTH = 1800;

const SAMPLE_REPOS = [
  {
    label: "Express",
    url: "https://github.com/expressjs/express",
  },
  {
    label: "Next.js",
    url: "https://github.com/vercel/next.js",
  },
  {
    label: "Axios",
    url: "https://github.com/axios/axios",
  },
];

type FlowNodeData = {
  label: string;
  rawLabel: string;
  kind: RepoNode["type"];
  codeSnippet?: string;
};

type StatusTone = "idle" | "info" | "success" | "error";

const ZOOM_PRESETS = {
  overview: {
    fitPadding: 0.35,
    fitMinZoom: 0.25,
    fitMaxZoom: 1.0,
    focusZoom: 0.9,
  },
  detail: {
    fitPadding: 0.2,
    fitMinZoom: 0.55,
    fitMaxZoom: 1.6,
    focusZoom: 1.25,
  },
} as const;

type ZoomMode = keyof typeof ZOOM_PRESETS;

const FILTER_ITEMS: Array<{
  type: RepoNode["type"];
  label: string;
  color: string;
  icon: string;
}> = [
  { type: "file", label: "Files", color: "#1e293b", icon: "📄" },
  { type: "api-endpoint", label: "API Calls", color: "#059669", icon: "🌐" },
  { type: "storage", label: "Storage", color: "#ca8a04", icon: "🗄️" },
  { type: "folder", label: "Folders", color: "#475569", icon: "🗂️" },
];

const measureBounds = (nodes: Node<FlowNodeData>[]) => {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  nodes.forEach((node) => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
    maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const layoutWithDagre = (
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  direction: "TB" | "LR"
) => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
    ranker: "tight-tree",
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const position = graph.node(node.id) as { x: number; y: number };
    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
      sourcePosition: direction === "TB" ? Position.Bottom : Position.Right,
      targetPosition: direction === "TB" ? Position.Top : Position.Left,
    };
  });

  const bounds = measureBounds(layoutedNodes);
  const normalizedNodes = layoutedNodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - bounds.minX,
      y: node.position.y - bounds.minY,
    },
  }));

  return { nodes: normalizedNodes, edges, width: bounds.width, height: bounds.height };
};

const layoutGrid = (nodes: Node<FlowNodeData>[]) => {
  if (nodes.length === 0) {
    return { nodes, width: 0, height: 0 };
  }

  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const gridNodes = nodes.map((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      ...node,
      position: {
        x: col * (NODE_WIDTH + GRID_GAP_X),
        y: row * (NODE_HEIGHT + GRID_GAP_Y),
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const bounds = measureBounds(gridNodes);
  return { nodes: gridNodes, width: bounds.width, height: bounds.height };
};

const buildComponents = (nodes: Node<FlowNodeData>[], edges: Edge[]) => {
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((node) => adjacency.set(node.id, new Set()));

  edges.forEach((edge) => {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) return;
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const visited = new Set<string>();
  const components: Array<{ ids: string[]; edges: Edge[] }> = [];

  nodes.forEach((node) => {
    if (visited.has(node.id)) return;

    const queue = [node.id];
    const componentIds: string[] = [];
    visited.add(node.id);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      componentIds.push(current);

      adjacency.get(current)?.forEach((neighbor) => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        queue.push(neighbor);
      });
    }

    const idSet = new Set(componentIds);
    const componentEdges = edges.filter((edge) => idSet.has(edge.source) && idSet.has(edge.target));
    components.push({ ids: componentIds, edges: componentEdges });
  });

  return components;
};

const packComponents = (
  components: Array<{ nodes: Node<FlowNodeData>[]; width: number; height: number }>
) => {
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  const packedNodes: Node<FlowNodeData>[] = [];

  components.forEach((component) => {
    if (cursorX + component.width > MAX_ROW_WIDTH && cursorX > 0) {
      cursorX = 0;
      cursorY += rowHeight + COMPONENT_GAP_Y;
      rowHeight = 0;
    }

    component.nodes.forEach((node) => {
      packedNodes.push({
        ...node,
        position: {
          x: node.position.x + cursorX,
          y: node.position.y + cursorY,
        },
      });
    });

    cursorX += component.width + COMPONENT_GAP_X;
    rowHeight = Math.max(rowHeight, component.height);
  });

  return packedNodes;
};

export default function RepoLensDashboard() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("idle");
  const [zoomMode, setZoomMode] = useState<ZoomMode>("detail");
  const [graphData, setGraphData] = useState<RepoGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<FlowNodeData>, Edge> | null>(null);
  const [typeFilters, setTypeFilters] = useState<Record<RepoNode["type"], boolean>>({
    file: true,
    "api-endpoint": true,
    storage: true,
    folder: true,
  });

  // React Flow state hooks
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const toggleFilter = useCallback((type: RepoNode["type"]) => {
    setTypeFilters((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  }, []);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node<FlowNodeData>) => {
    setSelectedNode(node.data);
    setSelectedNodeId(node.id);
    setDrawerOpen(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    setDrawerOpen(false);
    setSelectedNodeId(null);
  }, []);

  const handleFitView = useCallback(() => {
    if (!rfInstance) return;
    const preset = ZOOM_PRESETS[zoomMode];
    rfInstance.fitView({
      padding: preset.fitPadding,
      duration: 500,
      minZoom: preset.fitMinZoom,
      maxZoom: preset.fitMaxZoom,
    });
  }, [rfInstance, zoomMode]);

  const handleFocusSelected = useCallback(() => {
    if (!rfInstance || !selectedNodeId) return;
    const node = nodes.find((item) => item.id === selectedNodeId);
    if (!node) return;

    const preset = ZOOM_PRESETS[zoomMode];
    rfInstance.setCenter(
      node.position.x + NODE_WIDTH / 2,
      node.position.y + NODE_HEIGHT / 2,
      { zoom: preset.focusZoom, duration: 400 }
    );
  }, [nodes, rfInstance, selectedNodeId, zoomMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 1. Submit the Job to the Worker
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setStatusText("Initializing analysis...");
    setStatusTone("info");
    setGraphData(null);
    setSelectedNode(null);
    setSelectedNodeId(null);
    setDrawerOpen(false);
    setNodes([]);
    setEdges([]);

    try {
      const res = await fetch("http://localhost:4000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();

      if (data.cached && data.result) {
        setStatusText("Loaded from cache. Rendering map...");
        setStatusTone("success");
        setGraphData(data.result);
        setLoading(false);
        return;
      }

      if (data.jobId) {
        setStatusText("Repository queued. Analyzing AST...");
        setStatusTone("info");
        pollJobStatus(data.jobId);
      } else {
        setStatusText("Failed to queue job.");
        setStatusTone("error");
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setStatusText("Error connecting to the worker engine.");
      setStatusTone("error");
      setLoading(false);
    }
  };

  // 2. Poll the Worker until the job is done
  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:4000/status/${jobId}`);
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
          setStatusTone("info");
        }
      } catch (error) {
        clearInterval(interval);
        setStatusText("Lost connection to worker.");
        setStatusTone("error");
        setLoading(false);
      }
    }, 2000); // Check every 2 seconds
  };

  // 3. Transform our Shared Types into React Flow Types
  const mapDataToCanvas = useCallback(
    (repoNodes: RepoNode[], repoEdges: RepoEdge[], filters: Record<RepoNode["type"], boolean>) => {
      const visibleNodes = repoNodes.filter((node) => filters[node.type]);
      const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

      const canvasNodes = visibleNodes.map((node) => {
        const isApi = node.type === "api-endpoint";
        const isStorage = node.type === "storage";
        const isFolder = node.type === "folder";
        const icon = isApi ? "🌐 " : isStorage ? "🗄️ " : isFolder ? "🗂️ " : "📄 ";
        const background = isApi ? "#059669" : isStorage ? "#ca8a04" : isFolder ? "#475569" : "#1e293b";

        return {
          id: node.id,
          position: { x: 0, y: 0 },
          data: {
            label: `${icon}${node.label}`,
            rawLabel: node.label,
            kind: node.type,
            codeSnippet: node.codeSnippet,
          },
          type: "default",
          style: {
            background,
            color: "#f8fafc",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "12px",
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            fontSize: "13px",
            fontWeight: 600,
            lineHeight: "1.35",
            whiteSpace: "normal" as const,
            textAlign: "left" as const,
            boxShadow: isApi || isStorage ? "0 0 15px rgba(255,255,255,0.1)" : "none",
          },
        };
      });

      const canvasEdges = repoEdges
        .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
        .map((edge, index) => ({
          id: `e-${index}`,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#38bdf8", strokeWidth: 2 },
        }));

      const nodeById = new Map(canvasNodes.map((node) => [node.id, node]));
      const components = buildComponents(canvasNodes, canvasEdges);
      const layoutedComponents = components.map((component, index) => {
        const componentNodes = component.ids
          .map((id) => nodeById.get(id))
          .filter(Boolean) as Node<FlowNodeData>[];

        if (component.edges.length === 0) {
          return layoutGrid(componentNodes);
        }

        const direction = index % 2 === 0 ? "TB" : "LR";
        return layoutWithDagre(componentNodes, component.edges, direction);
      });

      const packedNodes = packComponents(layoutedComponents.map((component) => ({
        nodes: component.nodes,
        width: component.width,
        height: component.height,
      })));

      setNodes(packedNodes);
      setEdges(canvasEdges);

      if (rfInstance) {
        requestAnimationFrame(() => {
          const preset = ZOOM_PRESETS[zoomMode];
          rfInstance.fitView({
            padding: preset.fitPadding,
            duration: 500,
            minZoom: preset.fitMinZoom,
            maxZoom: preset.fitMaxZoom,
          });
        });
      }
    },
    [setNodes, setEdges, rfInstance, zoomMode]
  );

  useEffect(() => {
    if (!graphData) return;
    mapDataToCanvas(graphData.nodes, graphData.edges, typeFilters);
  }, [graphData, typeFilters, mapDataToCanvas]);

  const statusClass =
    statusTone === "error"
      ? "text-rose-300"
      : statusTone === "success"
        ? "text-emerald-300"
        : "text-slate-300";
  const totalNodes = graphData?.nodes.length ?? 0;
  const totalEdges = graphData?.edges.length ?? 0;
  const hasVisibleNodes = nodes.length > 0;

  return (
    <div className="w-screen h-screen relative bg-slate-900 text-white overflow-hidden">
      {/* Command Panel */}
      <div className="absolute top-6 left-6 z-20 w-[min(560px,92vw)]">
        <div className="glass-panel glass-panel-strong rounded-3xl p-4 md:p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                RepoLens
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                Visualize repo architecture
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Paste a GitHub URL to map files, APIs, and storage dependencies.
              </div>
            </div>
            <div className="hidden sm:flex flex-col gap-2">
              <button
                type="button"
                onClick={handleFitView}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 hover:bg-white/20"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={handleFocusSelected}
                disabled={!selectedNodeId}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] transition ${
                  selectedNodeId
                    ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                    : "border-slate-700/60 bg-slate-800/50 text-slate-500"
                }`}
              >
                Focus
              </button>
              <div className="rounded-full border border-white/10 bg-white/5 p-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                <button
                  type="button"
                  onClick={() => setZoomMode("overview")}
                  className={`rounded-full px-2 py-1 transition ${
                    zoomMode === "overview"
                      ? "bg-white/20 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setZoomMode("detail")}
                  className={`rounded-full px-2 py-1 transition ${
                    zoomMode === "detail"
                      ? "bg-white/20 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Detail
                </button>
              </div>
            </div>
          </div>
          <form
            onSubmit={handleAnalyze}
            className={`mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-2 flex items-center shadow-2xl transition-shadow ${
              isSearchFocused ? "ring-2 ring-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.35)]" : ""
            }`}
          >
            <Search className="text-slate-400 ml-3 w-5 h-5" />
            <input
              type="text"
              placeholder="https://github.com/expressjs/express"
              className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-slate-100 placeholder-slate-500 text-sm md:text-base"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-400 transition-colors px-6 py-3 rounded-xl font-semibold text-slate-900 flex items-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
            {SAMPLE_REPOS.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => setRepoUrl(sample.url)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.15em] text-slate-200 hover:bg-white/15"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={handleFitView}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={handleFocusSelected}
              disabled={!selectedNodeId}
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                selectedNodeId
                  ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                  : "border-slate-700/60 bg-slate-800/50 text-slate-500"
              }`}
            >
              Focus
            </button>
            <button
              type="button"
              onClick={() => setZoomMode(zoomMode === "detail" ? "overview" : "detail")}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200"
            >
              {zoomMode === "detail" ? "Overview" : "Detail"}
            </button>
          </div>
          
          {/* Status Indicator */}
          {statusText && (
            <div className={`text-center mt-4 text-sm font-mono tracking-wide ${statusClass}`}>
              {statusText}
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 w-72 px-2 hidden lg:block">
        <div className="glass-panel rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-slate-400">
            <span>Filters</span>
            <span>
              {nodes.length}/{totalNodes}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {FILTER_ITEMS.map((item) => {
              const active = typeFilters[item.type];
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => toggleFilter(item.type)}
                  className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                    active
                      ? "border-white/15 text-white"
                      : "border-slate-700/70 text-slate-400"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: item.color, opacity: active ? 1 : 0.35 }}
                    />
                    <span>
                      {item.icon} {item.label}
                    </span>
                  </span>
                  <span className={`text-[11px] uppercase ${active ? "text-emerald-300" : "text-slate-500"}`}>
                    {active ? "on" : "off"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Visible: {nodes.length}</span>
            <span>
              Edges: {edges.length}/{totalEdges}
            </span>
          </div>
        </div>
      </div>

      {/* The React Flow Canvas */}
      <ReactFlow<Node<FlowNodeData>>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onInit={setRfInstance}
        fitView
        fitViewOptions={{
          padding: ZOOM_PRESETS[zoomMode].fitPadding,
          minZoom: ZOOM_PRESETS[zoomMode].fitMinZoom,
          maxZoom: ZOOM_PRESETS[zoomMode].fitMaxZoom,
        }}
        minZoom={0.2}
        maxZoom={2}
        className="w-full h-full"
      >
        <Background color="#334155" variant={BackgroundVariant.Dots} gap={24} size={2} />
        <Controls className="bg-slate-800 border-slate-700 fill-white" />
        <MiniMap 
          nodeColor={(n) => n.style?.background as string} 
          maskColor="rgba(15, 23, 42, 0.8)" 
          className="bg-slate-800" 
        />
      </ReactFlow>

      {!loading && !hasVisibleNodes && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="glass-panel rounded-2xl px-6 py-4 text-sm text-slate-200">
            {graphData
              ? "No nodes match the current filters."
              : "Paste a public GitHub URL to visualize its architecture."}
          </div>
        </div>
      )}

      <div
        className={`absolute top-0 right-0 h-full w-full max-w-lg z-20 transform transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full glass-panel border-l border-slate-700/60 px-6 py-6 flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Node Preview</div>
              <div className="mt-2 text-lg font-semibold text-white">
                {selectedNode?.rawLabel ?? "Select a node"}
              </div>
              {selectedNode && (
                <div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                  <span className="rounded-full border border-slate-700/60 bg-slate-800/70 px-2 py-1">
                    {selectedNode.kind.replace("-", " ")}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-slate-100 transition"
            >
              Close
            </button>
          </div>

          <div className="mt-6 flex-1 overflow-auto rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
            {!selectedNode && (
              <div className="text-sm text-slate-400">
                Select a node to inspect details and code.
              </div>
            )}

            {selectedNode && selectedNode.kind !== "file" && (
              <div className="text-sm text-slate-300">
                Code preview is available for file nodes. This node represents a {selectedNode.kind.replace("-", " ")}.
              </div>
            )}

            {selectedNode && selectedNode.kind === "file" && (
              <SyntaxHighlighter
                language="typescript"
                style={oneDark}
                showLineNumbers
                customStyle={{ background: "transparent", margin: 0 }}
                lineNumberStyle={{ color: "rgba(148, 163, 184, 0.6)" }}
              >
                {selectedNode.codeSnippet ?? "// No preview available for this file."}
              </SyntaxHighlighter>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
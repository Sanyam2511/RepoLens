"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ReactFlow,
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
import { Loader2, Search, Sparkles } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

// We import the shared types so the frontend knows exactly what to expect
import { RepoNode, RepoEdge, RepoGraph } from "shared";
import { workerFetch } from "../lib/auth";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Footer from "../components/Footer";
import { NODE_TYPES, type GraphNodeData } from "../components/GraphNodes";
import AnalyzerSummary from "../components/AnalyzerSummary";
import type { SummaryMetricId } from "../lib/graph-summary";
import HomeHistoryPreview from "../components/HomeHistoryPreview";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;
const GRID_GAP_X = 80;
const GRID_GAP_Y = 70;
const COMPONENT_GAP_X = 160;
const COMPONENT_GAP_Y = 160;
const MAX_ROW_WIDTH = 1800;
const ISLAND_MIN_WIDTH = 360;
const ISLAND_HEADER_HEIGHT = 72;
const ISLAND_PADDING_X = 24;
const ISLAND_PADDING_Y = 22;
const ISLAND_GAP_X = 120;
const ISLAND_GAP_Y = 110;

const CLUSTER_COLORS = ["#2563eb", "#0f766e", "#b45309", "#7c3aed", "#0f172a", "#be123c"];

const RELATION_COLORS: Record<string, string> = {
  imports: "#4f46e5",
  calls: "#0f766e",
  persists: "#b45309",
  uses: "#7c3aed",
  includes: "#2563eb",
  requires: "#0891b2",
  sources: "#be123c",
};

const TOP_LEVEL_MODULES = new Set([
  "apps",
  "packages",
  "src",
  "app",
  "lib",
  "pages",
  "components",
  "features",
  "modules",
  "services",
  "server",
  "client",
  "routes",
  "api",
  "tests",
  "test",
  "spec",
  "cmd",
  "internal",
  "examples",
  "example",
  "docs",
  "scripts",
]);

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

type FlowNodeData = GraphNodeData;

type StatusTone = "idle" | "info" | "success" | "error";

type JobProgress = {
  phase?: string;
  percent?: number;
  current?: number;
  total?: number;
  detail?: string;
};

const ZOOM_PRESETS = {
  overview: {
    fitPadding: 0.35,
    fitMinZoom: 0.08,
    fitMaxZoom: 1.0,
    focusZoom: 0.9,
  },
  detail: {
    fitPadding: 0.2,
    fitMinZoom: 0.12,
    fitMaxZoom: 1.6,
    focusZoom: 1.25,
  },
} as const;

type ZoomMode = keyof typeof ZOOM_PRESETS;
type ViewMode = "overview" | "detail" | "summary";

const FILTER_ITEMS: Array<{
  type: RepoNode["type"];
  label: string;
  color: string;
}> = [
  { type: "file", label: "Files", color: "#1e293b" },
  { type: "api-endpoint", label: "API Calls", color: "#059669" },
  { type: "storage", label: "Storage", color: "#ca8a04" },
  { type: "folder", label: "Folders", color: "#475569" },
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

const normalizePath = (value: string) => value.replace(/\\/g, "/");

const splitPath = (value: string) => normalizePath(value).split("/").filter(Boolean);

const getCommonPathPrefix = (values: string[]) => {
  if (values.length === 0) return "";

  const segments = values.map((value) => splitPath(value));
  let prefix = segments[0] ?? [];

  for (const current of segments.slice(1)) {
    let index = 0;
    while (index < prefix.length && index < current.length && prefix[index] === current[index]) {
      index += 1;
    }
    prefix = prefix.slice(0, index);
    if (prefix.length === 0) break;
  }

  return prefix.join("/");
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const formatClusterLabel = (key: string) => {
  if (key === "root files") return "Root files";
  if (key === "shared nodes") return "Shared nodes";
  if (key === "external services") return "External services";
  if (key === "data layer") return "Data layer";

  return key
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[-_]+/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
};

const pickClusterColor = (key: string) => CLUSTER_COLORS[hashString(key) % CLUSTER_COLORS.length] ?? CLUSTER_COLORS[0];

const getRelationColor = (label: string) => RELATION_COLORS[label] ?? "#94a3b8";

const VIEW_TYPE_FILTERS: Record<ViewMode, Record<RepoNode["type"], boolean>> = {
  overview: {
    file: true,
    "api-endpoint": false,
    storage: false,
    folder: true,
  },
  detail: {
    file: true,
    "api-endpoint": true,
    storage: true,
    folder: true,
  },
  summary: {
    file: true,
    "api-endpoint": true,
    storage: true,
    folder: true,
  },
};

const getFileClusterKey = (filePath: string, repoRoot: string) => {
  const relativeSegments = splitPath(filePath).slice(splitPath(repoRoot).length);
  const dirSegments = relativeSegments.slice(0, -1);

  if (dirSegments.length === 0) {
    return "root files";
  }

  const first = dirSegments[0] ?? "root files";
  const second = dirSegments[1];

  if (first === "packages" || first === "apps") {
    return second ? `${first}/${second}` : first;
  }

  if (TOP_LEVEL_MODULES.has(first)) {
    return second ? `${first}/${second}` : first;
  }

  return dirSegments.length >= 2 && second ? `${first}/${second}` : first;
};

const getFallbackClusterKey = (node: Node<FlowNodeData>) => {
  if (node.data.kind === "api-endpoint") return "external services";
  if (node.data.kind === "storage") return "data layer";
  if (node.data.kind === "folder") return "shared nodes";
  return "shared nodes";
};

const layoutClusteredIslands = (nodes: Node<FlowNodeData>[], edges: Edge[]) => {
  if (nodes.length === 0) {
    return { nodes, width: 0, height: 0 };
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const repoRoot = getCommonPathPrefix(nodes.filter((node) => node.data.kind === "file").map((node) => node.id));
  const clusterByNodeId = new Map<string, string>();
  const adjacency = new Map<string, Set<string>>();

  nodes.forEach((node) => adjacency.set(node.id, new Set()));
  edges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  nodes.forEach((node) => {
    if (node.data.kind === "file") {
      clusterByNodeId.set(node.id, getFileClusterKey(node.id, repoRoot));
    }
  });

  const fallbackClusterByNeighbors = (nodeId: string) => {
    const counts = new Map<string, number>();
    adjacency.get(nodeId)?.forEach((neighborId) => {
      const neighborNode = nodeMap.get(neighborId);
      if (!neighborNode || neighborNode.data.kind !== "file") return;
      const clusterKey = clusterByNodeId.get(neighborId);
      if (!clusterKey) return;
      counts.set(clusterKey, (counts.get(clusterKey) ?? 0) + 1);
    });

    let winner = "";
    let maxCount = 0;
    counts.forEach((count, key) => {
      if (count > maxCount) {
        winner = key;
        maxCount = count;
      }
    });

    return winner || getFallbackClusterKey(nodeMap.get(nodeId) as Node<FlowNodeData>);
  };

  nodes.forEach((node) => {
    if (!clusterByNodeId.has(node.id)) {
      clusterByNodeId.set(node.id, fallbackClusterByNeighbors(node.id));
    }
  });

  const clusters = new Map<string, Node<FlowNodeData>[]>();
  nodes.forEach((node) => {
    const clusterKey = clusterByNodeId.get(node.id) ?? "shared nodes";
    const items = clusters.get(clusterKey) ?? [];
    items.push(node);
    clusters.set(clusterKey, items);
  });

  const clusterLayouts = Array.from(clusters.entries()).map(([clusterKey, clusterNodes]) => {
    const clusterEdges = edges.filter(
      (edge) => clusterByNodeId.get(edge.source) === clusterKey && clusterByNodeId.get(edge.target) === clusterKey
    );

    const label = formatClusterLabel(clusterKey);
    const accent = pickClusterColor(clusterKey);
    const fileCount = clusterNodes.filter((node) => node.data.kind === "file").length;
    const apiCount = clusterNodes.filter((node) => node.data.kind === "api-endpoint").length;
    const storageCount = clusterNodes.filter((node) => node.data.kind === "storage").length;
    const folderCount = clusterNodes.filter((node) => node.data.kind === "folder").length;

    const summary = [
      fileCount ? `${fileCount} files` : null,
      apiCount ? `${apiCount} APIs` : null,
      storageCount ? `${storageCount} storage` : null,
      folderCount ? `${folderCount} folders` : null,
    ]
      .filter(Boolean)
      .join(" • ") || "Connected module island";

    const layout = clusterEdges.length > 0 && clusterNodes.length > 2
      ? layoutWithDagre(clusterNodes, clusterEdges, "TB")
      : layoutGrid(clusterNodes);

    const width = Math.max(layout.width + ISLAND_PADDING_X * 2, ISLAND_MIN_WIDTH);
    const height = Math.max(layout.height + ISLAND_PADDING_Y * 2 + ISLAND_HEADER_HEIGHT, 220);

    return {
      clusterKey,
      label,
      accent,
      summary,
      nodes: layout.nodes,
      width,
      height,
    };
  });

  clusterLayouts.sort((left, right) => right.nodes.length - left.nodes.length || left.label.localeCompare(right.label));

  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  const packedNodes: Node<FlowNodeData>[] = [];

  clusterLayouts.forEach((cluster) => {
    if (cursorX > 0 && cursorX + cluster.width > MAX_ROW_WIDTH) {
      cursorX = 0;
      cursorY += rowHeight + ISLAND_GAP_Y;
      rowHeight = 0;
    }

    packedNodes.push({
      id: `cluster-${cluster.clusterKey}`,
      type: "clusterNode",
      position: { x: cursorX, y: cursorY },
      selectable: false,
      draggable: false,
      connectable: false,
      focusable: false,
      zIndex: 0,
      data: {
        label: cluster.label,
        rawLabel: cluster.clusterKey,
        kind: "cluster",
        isCluster: true,
        clusterLabel: cluster.label,
        clusterSize: cluster.nodes.length,
        clusterSummary: cluster.summary,
        accent: cluster.accent,
      },
      style: {
        width: cluster.width,
        height: cluster.height,
        pointerEvents: "none",
      },
    });

    cluster.nodes.forEach((node) => {
      packedNodes.push({
        ...node,
        type: "analysisNode",
        position: {
          x: node.position.x + cursorX + ISLAND_PADDING_X,
          y: node.position.y + cursorY + ISLAND_HEADER_HEIGHT,
        },
        zIndex: 2,
        data: {
          ...node.data,
          clusterLabel: cluster.label,
          clusterSummary: cluster.summary,
          accent: cluster.accent,
          pathLabel: node.data.kind === "file"
            ? splitPath(node.id).slice(-4).join("/")
            : node.data.kind === "api-endpoint"
              ? "External endpoint"
              : node.data.kind === "storage"
                ? "Shared state"
                : "Structure",
        },
      });
    });

    cursorX += cluster.width + ISLAND_GAP_X;
    rowHeight = Math.max(rowHeight, cluster.height);
  });

  const bounds = measureBounds(packedNodes.filter((node) => node.type !== "clusterNode"));
  const normalizedNodes = packedNodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - bounds.minX,
      y: node.position.y - bounds.minY,
    },
  }));

  return { nodes: normalizedNodes, width: bounds.width, height: bounds.height };
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
  const searchParams = useSearchParams();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("idle");
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("detail");
  const [viewMode, setViewMode] = useState<ViewMode>("detail");
  const [summaryMetric, setSummaryMetric] = useState<SummaryMetricId>("coupling");
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
    setViewMode("detail");
    setTypeFilters((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode !== "summary") {
      setTypeFilters(VIEW_TYPE_FILTERS[mode]);
    }
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
    handleViewModeChange("overview");
    setDrawerOpen(false);
    setSelectedNode(null);
    setSelectedNodeId(null);
    const preset = ZOOM_PRESETS.overview;
    rfInstance.fitView({
      padding: preset.fitPadding,
      duration: 500,
      minZoom: preset.fitMinZoom,
      maxZoom: preset.fitMaxZoom,
    });
  }, [handleViewModeChange, rfInstance]);

  const handleFocusSelected = useCallback(() => {
    if (!rfInstance || nodes.length === 0) return;
    const focusId = selectedNodeId ?? nodes.find((item) => item.type !== "clusterNode")?.id ?? nodes[0]?.id;
    if (!focusId) return;

    const node = nodes.find((item) => item.id === focusId);
    if (!node) return;

    if (!selectedNodeId) {
      setSelectedNode(node.data);
      setSelectedNodeId(node.id);
    }

    setDrawerOpen(true);

    const preset = ZOOM_PRESETS.detail;
    rfInstance.setCenter(
      node.position.x + NODE_WIDTH / 2,
      node.position.y + NODE_HEIGHT / 2,
      { zoom: preset.focusZoom, duration: 400 }
    );
  }, [nodes, rfInstance, selectedNodeId]);

  const handleZoomIn = useCallback(() => {
    if (!rfInstance) return;
    // ReactFlow instance exposes zoom controls on the controls, but call safely via any.
    try {
      (rfInstance as any).zoomIn?.();
    } catch {
      // fallback: no-op
    }
  }, [rfInstance]);

  const handleZoomOut = useCallback(() => {
    if (!rfInstance) return;
    try {
      (rfInstance as any).zoomOut?.();
    } catch {
      // fallback: no-op
    }
  }, [rfInstance]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const presetRepo = searchParams.get("repoUrl");
    if (presetRepo) {
      setRepoUrl(presetRepo);
    }
  }, [searchParams]);

  // 1. Submit the Job to the Worker
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setStatusText("Initializing analysis...");
    setStatusTone("info");
    setProgress({ phase: "Queued", percent: 1 });
    setGraphData(null);
    setSelectedNode(null);
    setSelectedNodeId(null);
    setDrawerOpen(false);
    setNodes([]);
    setEdges([]);

    try {
      const res = await workerFetch("/analyze", {
        method: "POST",
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();

      if (data.result) {
        setStatusText(data.cached ? "Loaded from cache. Rendering map..." : "Analysis complete. Rendering map...");
        setStatusTone("success");
        setProgress(null);
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
        setProgress(null);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setStatusText("Error connecting to the worker engine.");
      setStatusTone("error");
      setProgress(null);
      setLoading(false);
    }
  };

  // 2. Poll the Worker until the job is done
  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await workerFetch(`/status/${jobId}`);
        const data = await res.json();

        if (data.state === "completed") {
          clearInterval(interval);
          setStatusText("Analysis complete! Rendering map...");
          setStatusTone("success");
          setProgress({ phase: "Complete", percent: 100 });
          setGraphData(data.result);
          setLoading(false);
        } else if (data.state === "failed") {
          clearInterval(interval);
          setStatusText(`Analysis failed: ${data.failedReason}`);
          setStatusTone("error");
          setProgress(null);
          setLoading(false);
        } else {
          setStatusTone("info");
          const normalized = normalizeProgress(data.progress);
          setProgress(normalized);
          setStatusText(formatProgress(normalized) ?? `Processing: ${data.state}...`);
        }
      } catch (error) {
        clearInterval(interval);
        setStatusText("Lost connection to worker.");
        setStatusTone("error");
        setProgress(null);
        setLoading(false);
      }
    }, 2000); // Check every 2 seconds
  };

  // 3. Transform our Shared Types into React Flow Types
  const mapDataToCanvas = useCallback(
    (repoNodes: RepoNode[], repoEdges: RepoEdge[], filters: Record<RepoNode["type"], boolean>) => {
      const visibleNodes = repoNodes.filter((node) => filters[node.type]);
      const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
      const visibleFilePaths = visibleNodes.filter((node) => node.type === "file").map((node) => node.id);
      const repoRoot = getCommonPathPrefix(visibleFilePaths);
      const visibleFileClusterById = new Map(
        visibleNodes
          .filter((node) => node.type === "file")
          .map((node) => [node.id, getFileClusterKey(node.id, repoRoot)] as const)
      );

      const canvasNodes = visibleNodes.map((node) => {
        const accent = node.type === "api-endpoint"
          ? "#0f766e"
          : node.type === "storage"
            ? "#b45309"
            : node.type === "folder"
              ? "#64748b"
              : "#2563eb";

        return {
          id: node.id,
          position: { x: 0, y: 0 },
          data: {
            label: node.label,
            rawLabel: node.label,
            kind: node.type,
            codeSnippet: node.codeSnippet,
            accent,
          },
          type: "analysisNode",
          zIndex: 2,
          style: {
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            border: "none",
            background: "transparent",
            color: "#0f172a",
            padding: 0,
            pointerEvents: "auto",
          },
        };
      });

      const canvasEdges = repoEdges
        .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
        .filter((edge) => {
          if (edge.label !== "imports") return true;

          const sourceCluster = visibleFileClusterById.get(edge.source);
          const targetCluster = visibleFileClusterById.get(edge.target);

          if (!sourceCluster || !targetCluster) return true;

          return sourceCluster === targetCluster;
        })
        .map((edge, index) => ({
          id: `e-${index}`,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          animated: false,
          style: {
            stroke: getRelationColor(edge.label),
            strokeWidth: edge.label === "imports" ? 1.9 : 1.6,
            opacity: 0.42,
          },
        }));

      const layoutResult = layoutClusteredIslands(canvasNodes as Node<FlowNodeData>[], canvasEdges);

      setNodes(layoutResult.nodes);
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

  const normalizeProgress = (raw: unknown): JobProgress | null => {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return { percent: Math.max(0, Math.min(100, Math.round(raw))) };
    }
    if (typeof raw === "object") {
      const value = raw as Record<string, unknown>;
      const percent =
        typeof value.percent === "number" && Number.isFinite(value.percent)
          ? Math.max(0, Math.min(100, Math.round(value.percent)))
          : undefined;
      return {
        percent,
        phase: typeof value.phase === "string" ? value.phase : undefined,
        detail: typeof value.detail === "string" ? value.detail : undefined,
        current: typeof value.current === "number" ? value.current : undefined,
        total: typeof value.total === "number" ? value.total : undefined,
      };
    }
    return null;
  };

  const formatProgress = (value: JobProgress | null) => {
    if (!value) return null;
    const phase = value.phase ?? "Processing";
    const percentText =
      typeof value.percent === "number" ? ` ${value.percent}%` : "";
    const detailText = value.detail
      ? ` - ${value.detail}`
      : value.current !== undefined && value.total !== undefined
        ? ` - ${value.current}/${value.total}`
        : "";
    return `${phase}${percentText}${detailText}`;
  };

  const statusClass =
    statusTone === "error"
      ? "text-rose-600"
      : statusTone === "success"
        ? "text-emerald-600"
        : "text-slate-500";
  const statusBadgeClass =
    statusTone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : statusTone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-white/70 text-slate-600";
  const totalNodes = graphData?.nodes.length ?? 0;
  const totalEdges = graphData?.edges.length ?? 0;
  const visibleDataNodes = nodes.filter((node) => node.type !== "clusterNode");
  const visibleDataNodeCount = visibleDataNodes.length;
  const hasVisibleNodes = visibleDataNodeCount > 0;
  const legendCounts = graphData?.nodes.reduce(
    (acc, node) => {
      acc[node.type] = (acc[node.type] ?? 0) + 1;
      return acc;
    },
    {
      file: 0,
      "api-endpoint": 0,
      storage: 0,
      folder: 0,
    } as Record<RepoNode["type"], number>
  );

  return (
    <div className="min-h-screen relative page-sky text-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 10%, rgba(219, 234, 254, 0.85), transparent 55%), radial-gradient(circle at 85% 15%, rgba(191, 219, 254, 0.6), transparent 50%), radial-gradient(circle at 20% 90%, rgba(224, 231, 255, 0.55), transparent 55%)",
          }}
        />
        <div className="absolute -top-32 -right-20 h-[320px] w-[320px] rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-emerald-100/70 blur-3xl" />
      </div>

      <Header />

      <main className="relative z-10">
        <Hero />
        <HomeHistoryPreview />
        <Features />

        <section className="mx-auto w-[min(1200px,94vw)] mt-16 section-wave section-wave-lifted overflow-x-clip px-6 py-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                <Sparkles className="h-4 w-4" /> Live workspace
              </div>
              <h2 className="mt-4 text-3xl md:text-4xl text-slate-900">Visualize repo architecture in seconds.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Paste a GitHub URL, run the analyzer, and explore the interactive graph. Save every run to your history and
                share findings with teammates.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Create account
                </Link>
                <Link
                  href="/how-it-works"
                  className="brand-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                >
                  <Sparkles className="h-4 w-4" /> How it works
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { label: "1. Paste a repo URL", value: "GitHub repositories only" },
                { label: "2. Review the graph", value: "Files, APIs, storage" },
                { label: "3. Revisit history", value: "Open any previous run" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-sm text-slate-700">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div id="analyze" className="mt-10 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_22px_54px_rgba(15,23,42,0.12)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                  RepoLens
                </div>
                <div className="mt-2 text-2xl text-slate-900">
                  Visualize repo architecture
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Paste a GitHub URL to map files, APIs, and storage dependencies.
                </div>
              </div>
              <div className="hidden sm:flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleFitView}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Fit
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    −
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleFocusSelected}
                  disabled={!selectedNodeId}
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] transition ${
                    selectedNodeId
                      ? "border-emerald-300 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25"
                      : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}
                >
                  Focus
                </button>
                <div className="rounded-full border border-slate-200 bg-slate-100 p-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("overview")}
                    className={`rounded-full px-2 py-1 transition ${
                      viewMode === "overview"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("detail")}
                    className={`rounded-full px-2 py-1 transition ${
                      viewMode === "detail"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Detail
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("summary")}
                    className={`rounded-full px-2 py-1 transition ${
                      viewMode === "summary"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Summary
                  </button>
                </div>
              </div>
            </div>
            <form
              onSubmit={handleAnalyze}
              className={`mt-4 flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-2 shadow-[0_12px_24px_rgba(15,23,42,0.08)] backdrop-blur transition ${
                isSearchFocused ? "ring-2 ring-slate-900/10" : ""
              }`}
            >
              <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 bg-slate-100/80">
                <Search className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="https://github.com/expressjs/express"
                className="flex-1 bg-transparent border-none outline-none px-2 py-2 text-slate-900 placeholder-slate-400 text-sm md:text-base"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="brand-button rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              {SAMPLE_REPOS.map((sample) => (
                <button
                  key={sample.url}
                  type="button"
                  onClick={() => setRepoUrl(sample.url)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.15em] text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={handleFitView}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-700"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={handleFocusSelected}
                disabled={!selectedNodeId}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                  selectedNodeId
                    ? "border-emerald-300 bg-emerald-500/15 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                Focus
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange(viewMode === "detail" ? "overview" : "detail")}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600"
              >
                {viewMode === "detail" ? "Overview" : "Detail"}
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("summary")}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                  viewMode === "summary"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Summary
              </button>
            </div>

            {statusText && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-mono ${statusBadgeClass}`}>
                  {statusText}
                </span>
                <span className={`text-xs ${statusClass}`}>Session status</span>
              </div>
            )}
            {statusText && progress && typeof progress.percent === "number" && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900 transition-[width] duration-300"
                  style={{ width: `${Math.max(2, Math.min(100, progress.percent))}%` }}
                />
              </div>
            )}
          </div>

          <div className="mt-8 relative overflow-hidden rounded-[36px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
            <div className={viewMode === "summary" ? "relative min-h-[860px] h-[calc(100vh-160px)]" : "relative h-[560px] sm:h-[620px] lg:h-[720px]"}>
              {viewMode === "summary" ? (
                <div className="absolute inset-0 p-1 sm:p-2">
                  <AnalyzerSummary graphData={graphData} metric={summaryMetric} onMetricChange={setSummaryMetric} />
                </div>
              ) : null}
              <ReactFlow<Node<FlowNodeData>>
                nodes={nodes}
                edges={edges}
                nodeTypes={NODE_TYPES}
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
                minZoom={0.05}
                maxZoom={2}
                zoomOnScroll={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={false}
                panOnScroll={false}
                panOnDrag={true}
                selectionOnDrag={false}
                nodesDraggable={false}
                nodesConnectable={false}
                onlyRenderVisibleElements={true}
                className={viewMode === "summary" ? "hidden w-full h-full bg-transparent" : "w-full h-full bg-transparent"}
              >
                <Background color="#f1f5f9" variant={BackgroundVariant.Lines} gap={54} size={0.4} />
                <Controls className="bg-white/90 border border-slate-200 text-slate-600 shadow-sm" />
              </ReactFlow>

              {viewMode !== "summary" ? (
              <div className="absolute top-4 right-4 hidden lg:block">
                <div className="glass-panel rounded-2xl p-4 shadow-lg w-72">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-slate-500">
                    <span>Filters</span>
                    <span>
                      {visibleDataNodeCount}/{totalNodes}
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
                              ? "border-slate-200 bg-white text-slate-900"
                              : "border-slate-200/70 bg-slate-50 text-slate-500"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: item.color, opacity: active ? 1 : 0.35 }}
                            />
                            <span>
                              {item.label}
                            </span>
                          </span>
                          <span className={`text-[11px] uppercase ${active ? "text-emerald-600" : "text-slate-400"}`}>
                            {active ? "on" : "off"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Visible: {visibleDataNodeCount}</span>
                    <span>
                      Edges: {edges.length}/{totalEdges}
                    </span>
                  </div>
                </div>
              </div>
              ) : null}

              {viewMode !== "summary" ? (
              <div className="absolute bottom-4 right-4 hidden lg:block">
                <div className="glass-panel rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 shadow-lg">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-500">
                    <span>Legend</span>
                    <span>{hasVisibleNodes ? `${visibleDataNodeCount} visible` : `${totalNodes} total`}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {FILTER_ITEMS.map((item) => (
                      <div key={item.type} className="flex items-center justify-between gap-6 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                          <span>
                            {item.label}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {legendCounts ? legendCounts[item.type] : 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              ) : null}

              {viewMode !== "summary" && !loading && !hasVisibleNodes && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="glass-panel rounded-2xl px-6 py-4 text-sm text-slate-600">
                    {graphData
                      ? "No nodes match the current filters."
                      : "Paste a public GitHub URL to visualize its architecture."}
                  </div>
                </div>
              )}

              {viewMode !== "summary" ? (
              <div
                className={`absolute inset-y-0 right-0 z-20 w-full max-w-lg transform transition-transform duration-300 ${
                  drawerOpen ? "translate-x-0" : "translate-x-full"
                }`}
              >
                <div className="h-full glass-panel-strong border-l border-slate-200/80 px-6 py-6 flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Node Preview</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {selectedNode?.rawLabel ?? "Select a node"}
                      </div>
                      {selectedNode && (
                        <div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                            {selectedNode.kind.replace("-", " ")}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-800 transition"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-6 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white/80 p-4">
                    {!selectedNode && (
                      <div className="text-sm text-slate-500">
                        Select a node to inspect details and code.
                      </div>
                    )}

                    {selectedNode && selectedNode.kind !== "file" && (
                      <div className="text-sm text-slate-600">
                        Code preview is available for file nodes. This node represents a {selectedNode.kind.replace("-", " ")}.
                      </div>
                    )}

                    {selectedNode && selectedNode.kind === "file" && (
                      <SyntaxHighlighter
                        language="typescript"
                        style={oneLight}
                        showLineNumbers
                        customStyle={{ background: "transparent", margin: 0 }}
                        lineNumberStyle={{ color: "rgba(100, 116, 139, 0.7)" }}
                      >
                        {selectedNode.codeSnippet ?? "// No preview available for this file."}
                      </SyntaxHighlighter>
                    )}
                  </div>
                </div>
              </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
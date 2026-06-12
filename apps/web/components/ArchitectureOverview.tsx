"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MarkerType,
  Node,
  Position,
  ReactFlow,
  ReactFlowInstance,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import dagre from "dagre";
import { RepoGraph } from "shared";
import { NODE_TYPES, type GraphNodeData } from "./GraphNodes";
import { Copy, X } from "lucide-react";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 76;

const normalizePath = (value: string) => value.replace(/\\/g, "/");
const splitPath = (value: string) => normalizePath(value).split("/").filter(Boolean);

const getCommonPathPrefix = (values: string[]) => {
  if (values.length === 0) return "";
  const segments = values.map((value) => splitPath(value));
  let prefix = segments[0] ?? [];
  for (const current of segments.slice(1)) {
    let index = 0;
    while (index < prefix.length && index < current.length && prefix[index] === current[index]) index += 1;
    prefix = prefix.slice(0, index);
    if (prefix.length === 0) break;
  }
  return prefix.join("/");
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
};

const getDynamicColor = (key: string) => {
  const lower = key.toLowerCase();
  if (lower.includes("web") || lower.includes("frontend") || lower.includes("pages")) return "#8B5CF6";
  if (lower.includes("worker") || lower.includes("backend") || lower.includes("api") || lower.includes("analyzer")) return "#10B981";
  if (lower.includes("shared") || lower.includes("core") || lower.includes("types")) return "#232F72";
  const DYNAMIC_COLORS = ["#8B5CF6", "#232F72", "#3B82F6", "#10B981", "#94A3B8"];
  return DYNAMIC_COLORS[hashString(key) % DYNAMIC_COLORS.length];
};

const getNodeCategoryAndAccent = (kind: string, key: string) => {
  if (kind === "npm-package") return { category: "npm", accent: "#94A3B8" };
  if (kind === "api-endpoint") return { category: "api", accent: "#8B5CF6" };
  if (kind === "storage") return { category: "storage", accent: "#3B82F6" };
  if (kind === "folder") return { category: "internal", accent: getDynamicColor(key) };
  return { category: "internal", accent: getDynamicColor(key) };
};

const isRelevantNode = (pathSegments: string[], fileName: string) => {
  const ignoredDirs = new Set(["node_modules", "dist", "build", ".next", "public", "assets", "test", "docs"]);
  if (pathSegments.some(seg => ignoredDirs.has(seg.toLowerCase()))) return false;

  const ignoredExts = [".css", ".scss", ".md", ".mdx", ".png", ".svg", ".json", ".lock"];
  if (ignoredExts.some(ext => fileName.endsWith(ext))) {
    if (fileName !== "package.json") return false;
  }
  return true;
};

const buildArchitectureTree = (graphData: RepoGraph | null, showNpm: boolean) => {
  if (!graphData) return { nodes: [], edges: [], adjacency: new Map(), reverseAdjacency: new Map(), moduleInternalFiles: new Map<string, string[]>() };

  const filePaths = graphData.nodes.filter(n => n.type === "file").map(n => n.id);
  const repoRoot = getCommonPathPrefix(filePaths);
  const repoRootLen = splitPath(repoRoot).length;

  const visualNodes = new Map<string, Node<GraphNodeData>>();
  const visualEdges = new Map<string, Edge>();
  const fileToVisualMap = new Map<string, string>();
  const moduleFileCounts = new Map<string, number>();
  const moduleInternalFiles = new Map<string, string[]>();
  const edgeImportCounts = new Map<string, number>();

  const createVisualNode = (id: string, label: string, kind: any, sublabel: string, rootKeyForColor: string) => {
    if (visualNodes.has(id)) return;
    const { category, accent } = getNodeCategoryAndAccent(kind, rootKeyForColor);

    visualNodes.set(id, {
      id,
      type: "analysisNode",
      position: { x: 0, y: 0 },
      data: { label, rawLabel: id, kind, category: category as any, accent, sublabel, width: NODE_WIDTH },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
    });
  };

  const createStructEdge = (source: string, target: string, color: string) => {
    const edgeId = `struct-${source}->${target}`;
    if (visualEdges.has(edgeId) || source === target) return;

    visualEdges.set(edgeId, {
      id: edgeId,
      source,
      target,
      type: "smoothstep",
      animated: false,
      zIndex: -1,
      style: {
        stroke: color,
        strokeWidth: 1,
        opacity: 0.3,
        strokeDasharray: "none",
      },
    });
  };

  const packageModuleCounts = new Map<string, Set<string>>();

  // First pass: count modules per package to prevent massive star graphs
  graphData.nodes.forEach((node) => {
    if (node.type !== "file") return;
    const relSegments = splitPath(node.id).slice(repoRootLen);
    const fileName = relSegments[relSegments.length - 1] ?? node.label;
    if (!isRelevantNode(relSegments, fileName)) return;
    if (relSegments.length <= 1 || fileName.includes("docker")) return;

    let packageId = "";
    let moduleId = "";
    if (relSegments[0] === "apps" || relSegments[0] === "packages") {
      packageId = `${relSegments[0]}/${relSegments[1]}`;
      moduleId = relSegments.length > 3 ? `${packageId}/${relSegments[2]}` : packageId;
    } else {
      packageId = relSegments[0];
      moduleId = relSegments.length > 2 ? `${packageId}/${relSegments[1]}` : packageId;
    }
    if (!packageModuleCounts.has(packageId)) packageModuleCounts.set(packageId, new Set());
    packageModuleCounts.get(packageId)!.add(moduleId);
  });

  graphData.nodes.forEach((node) => {
    if (!showNpm && node.type === "npm-package") return;

    if (node.type === "npm-package" || node.type === "api-endpoint" || node.type === "storage") {
      createVisualNode(node.id, node.label, node.type, node.type.replace("-", " "), "npm");
      fileToVisualMap.set(node.id, node.id);
      return;
    }

    const relSegments = splitPath(node.id).slice(repoRootLen);
    const fileName = relSegments[relSegments.length - 1] ?? node.label;
    if (!isRelevantNode(relSegments, fileName)) return;

    if (relSegments.length <= 1 || fileName.includes("docker")) {
      createVisualNode("workspace-root", "workspace root", "folder", "workspace root", "root");
      fileToVisualMap.set(node.id, "workspace-root");
      moduleFileCounts.set("workspace-root", (moduleFileCounts.get("workspace-root") ?? 0) + 1);
      return;
    }

    let packageId = "";
    let moduleId = "";
    if (relSegments[0] === "apps" || relSegments[0] === "packages") {
      packageId = `${relSegments[0]}/${relSegments[1]}`;
      moduleId = relSegments.length > 3 ? `${packageId}/${relSegments[2]}` : packageId;
    } else {
      packageId = relSegments[0];
      moduleId = relSegments.length > 2 ? `${packageId}/${relSegments[1]}` : packageId;
    }

    // Collapse flat packages that have too many modules
    const modCount = packageModuleCounts.get(packageId)?.size || 0;
    if (modCount > 8) {
      moduleId = packageId;
    }

    const pkgColorKey = packageId;

    createVisualNode(packageId, packageId, "folder", modCount > 8 ? "flat package" : "workspace package", pkgColorKey);

    if (moduleId !== packageId) {
      const modLabel = splitPath(moduleId).pop() + "/";
      createVisualNode(moduleId, modLabel, "folder", "core module", pkgColorKey);
      createStructEdge(packageId, moduleId, getDynamicColor(pkgColorKey));
    }

    fileToVisualMap.set(node.id, moduleId);
    moduleFileCounts.set(moduleId, (moduleFileCounts.get(moduleId) ?? 0) + 1);
    
    const fileNameDisplay = splitPath(node.id).pop() || node.id;
    if (!moduleInternalFiles.has(moduleId)) {
      moduleInternalFiles.set(moduleId, []);
    }
    moduleInternalFiles.get(moduleId)?.push(fileNameDisplay);
  });

  moduleFileCounts.forEach((count, moduleId) => {
    const vNode = visualNodes.get(moduleId);
    if (vNode) {
      vNode.data.sublabel = count === 1 ? `1 internal file` : `${count} internal files`;
    }
  });

  graphData.edges.forEach((edge) => {
    const visSource = fileToVisualMap.get(edge.source);
    const visTarget = fileToVisualMap.get(edge.target);
    if (!visSource || !visTarget || visSource === visTarget) return;

    const edgeId = `import-${visSource}->${visTarget}`;
    edgeImportCounts.set(edgeId, (edgeImportCounts.get(edgeId) ?? 0) + 1);
  });

  edgeImportCounts.forEach((count, edgeId) => {
    const parts = edgeId.replace("import-", "").split("->");
    const source = parts[0]!;
    const target = parts[1]!;
    const sourceColor = visualNodes.get(source)?.data.accent ?? "#64748b";
    const targetColor = visualNodes.get(target)?.data.accent ?? "#64748b";
    const isCross = sourceColor !== targetColor;

    visualEdges.set(edgeId, {
      id: edgeId,
      source,
      target,
      type: "smoothstep",
      animated: false,
      zIndex: -1,
      markerEnd: { type: MarkerType.ArrowClosed, color: isCross ? "#F59E0B" : sourceColor, width: 10, height: 10 },
      style: {
        stroke: isCross ? "#F59E0B" : sourceColor,
        strokeWidth: Math.min(1.5 + Math.log1p(count) * 1.5, 6),
        opacity: 0.8,
        strokeDasharray: isCross ? "5 5" : "none",
      },
      data: {
        importCount: count,
      }
    });
  });

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 100, align: 'UL' });

  const finalNodes = Array.from(visualNodes.values());
  const finalEdges = Array.from(visualEdges.values());

  finalNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  finalEdges.forEach((edge) => {
    const weight = edge.id.startsWith("struct-") ? 10 : 1;
    dagreGraph.setEdge(edge.source, edge.target, { weight });
  });

  const nodesWithInbound = new Set(finalEdges.map(e => e.target));
  const entryNodes = finalNodes.filter(n => !nodesWithInbound.has(n.id));

  dagreGraph.setNode("__INVISIBLE_ROOT__", { width: 1, height: 1 });
  entryNodes.forEach(n => {
    dagreGraph.setEdge("__INVISIBLE_ROOT__", n.id, { weight: 1, minlen: 1 });
  });

  dagre.layout(dagreGraph);

  const positionedNodes = finalNodes.map((node) => {
    const nodeWithPos = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: { x: nodeWithPos.x - NODE_WIDTH / 2, y: nodeWithPos.y - NODE_HEIGHT / 2 },
    };
  });

  // Calculate adjacency for interactions (only including imports, not struct edges)
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  positionedNodes.forEach(n => {
    adjacency.set(n.id, []);
    reverseAdjacency.set(n.id, []);
  });

  finalEdges.forEach(e => {
    if (e.id.startsWith("import-")) {
      adjacency.get(e.source)?.push(e.target);
      reverseAdjacency.get(e.target)?.push(e.source);
    }
  });

  return { nodes: positionedNodes, edges: finalEdges, adjacency, reverseAdjacency, moduleInternalFiles };
};

export default function ArchitectureOverview({ graphData }: { graphData: RepoGraph | null }) {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<GraphNodeData>, Edge> | null>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [showNpm, setShowNpm] = useState(false);

  const tree = useMemo(() => buildArchitectureTree(graphData, showNpm), [graphData, showNpm]);

  useEffect(() => {
    if (!tree) return;
    
    setNodes(nds => nds.map(n => {
      if (!focusedNodeId) return { ...n, style: { ...n.style, opacity: 1 } };
      const focused = n.id === focusedNodeId;
      const neighbor = tree.adjacency.get(focusedNodeId)?.includes(n.id)
        || tree.reverseAdjacency.get(focusedNodeId)?.includes(n.id);
      return { ...n, style: { ...n.style, opacity: focused || neighbor ? 1 : 0.15 } };
    }));

    setEdges(eds => eds.map(e => {
      const isStruct = e.id.startsWith("struct-");
      const defaultOpacity = isStruct ? 0.3 : 0.8;
      const defaultStrokeWidth = isStruct ? 1 : (e.style?.strokeWidth ?? 1);
      
      if (!focusedNodeId) return { ...e, style: { ...e.style, opacity: defaultOpacity, strokeWidth: defaultStrokeWidth }, zIndex: -1 };
      
      if (e.source === focusedNodeId && !isStruct) return { ...e, style: { ...e.style, opacity: 1, strokeWidth: Math.max(3, defaultStrokeWidth as number), stroke: "#232F72" }, zIndex: 10 };
      if (e.target === focusedNodeId && !isStruct) return { ...e, style: { ...e.style, opacity: 1, strokeWidth: Math.max(3, defaultStrokeWidth as number), stroke: "#10B981" }, zIndex: 10 };
      
      return { ...e, style: { ...e.style, opacity: 0.05, strokeWidth: 1 }, zIndex: -1 };
    }));
  }, [focusedNodeId, tree, setNodes, setEdges]);

  useEffect(() => {
    if (rfInstance && tree.nodes.length > 0) {
      setTimeout(() => rfInstance.fitView({ padding: 0.15, duration: 800, minZoom: 0.01 }), 50);
    }
  }, [rfInstance, tree.nodes]);

  const focusedNodeData = useMemo(
    () => nodes.find(n => n.id === focusedNodeId)?.data,
    [nodes, focusedNodeId]
  );

  const aggregatedDeps = useMemo(() => {
    if (!focusedNodeId || !tree) return { inbound: [], outbound: [] };
    const inbound = tree.reverseAdjacency.get(focusedNodeId) || [];
    const outbound = tree.adjacency.get(focusedNodeId) || [];
    return { inbound, outbound };
  }, [focusedNodeId, tree]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setFocusedNodeId(prev => (prev === node.id ? null : node.id));
    },
    []
  );

  useEffect(() => {
    setNodes(tree.nodes);
    setEdges(tree.edges);
    setFocusedNodeId(null);
  }, [tree, setNodes, setEdges]);

  const getDisplayName = (id: string) => {
    const node = tree.nodes.find(n => n.id === id);
    return node?.data.label ?? id;
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] dot-grid-bg">
      
      {/* Right control panel */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => setShowNpm(p => !p)}
          className={`px-4 py-2 text-xs font-medium rounded-full backdrop-blur-md shadow-sm transition-all ${
            showNpm
              ? "bg-[var(--color-node-npm)]/90 text-white border border-transparent"
              : "bg-[var(--color-bg-surface)]/80 text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          {showNpm ? "Hide NPM Packages" : "Show NPM Packages"}
        </button>
      </div>

      {/* Left inspect panel */}
      <div
        className={`absolute top-0 right-0 bottom-0 z-30 w-96 bg-[var(--color-bg-surface)]/95 backdrop-blur-2xl border-l border-[var(--color-border-subtle)] shadow-2xl flex flex-col transition-all duration-300 transform ${
          focusedNodeId ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="p-5 border-b border-[var(--color-border-subtle)]/50 flex items-start justify-between">
          <div className="min-w-0 pr-4">
            <div className="micro-label mb-1">Inspecting</div>
            <div className="font-semibold text-[var(--color-text-primary)] truncate">{focusedNodeData?.label}</div>
            <div className="data-mono-dense text-[var(--color-text-tertiary)] truncate" title={focusedNodeData?.sublabel}>
              {focusedNodeData?.sublabel}
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

          <div>
            <div className="flex items-center justify-between micro-label mb-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-healthy)]" /> Imported By
              </span>
              <span className="data-mono-dense">{tree.reverseAdjacency.get(focusedNodeId!)?.length ?? 0}</span>
            </div>
            <div className="space-y-1 mt-2">
              {Array.from<string>(tree.reverseAdjacency.get(focusedNodeId!) || []).map((id: string) => {
                const targetNode = nodes.find(n => n.id === id);
                return (
                  <div
                    key={id}
                    className="data-mono-dense text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] px-2 py-1.5 rounded truncate cursor-pointer hover:bg-[var(--color-accent-subtle)]"
                    onClick={e => targetNode && handleNodeClick(e as any, targetNode)}
                  >
                    {targetNode?.data.label ?? id}
                  </div>
                );
              })}
              {!tree.reverseAdjacency.get(focusedNodeId!)?.length && (
                <div className="ui-label text-[var(--color-text-tertiary)] italic">No inbound imports.</div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between micro-label mb-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" /> Imports
              </span>
              <span className="data-mono-dense">{tree.adjacency.get(focusedNodeId!)?.length ?? 0}</span>
            </div>
            <div className="space-y-1 mt-2">
              {Array.from<string>(tree.adjacency.get(focusedNodeId!) || []).map((id: string) => {
                const targetNode = nodes.find(n => n.id === id);
                return (
                  <div
                    key={id}
                    className="data-mono-dense text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)] px-2 py-1.5 rounded truncate cursor-pointer hover:bg-[var(--color-accent-subtle)]"
                    onClick={e => targetNode && handleNodeClick(e as any, targetNode)}
                  >
                    {targetNode?.data.label ?? id}
                  </div>
                );
              })}
              {!tree.adjacency.get(focusedNodeId!)?.length && (
                <div className="ui-label text-[var(--color-text-tertiary)] italic">No outbound imports.</div>
              )}
            </div>
          </div>

          {tree.moduleInternalFiles.get(focusedNodeId!) && tree.moduleInternalFiles.get(focusedNodeId!)!.length > 0 && (
            <div>
              <div className="flex items-center justify-between micro-label mb-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-text-tertiary)]" /> Internal Files
                </span>
                <span className="data-mono-dense">{tree.moduleInternalFiles.get(focusedNodeId!)?.length}</span>
              </div>
              <div className="space-y-1">
                {tree.moduleInternalFiles.get(focusedNodeId!)?.map(fileName => (
                  <div key={fileName} className="data-mono-dense text-[var(--color-text-secondary)] bg-[var(--color-bg-subtle)]/40 px-2 py-1.5 rounded truncate" title={fileName}>
                    {fileName}
                  </div>
                ))}
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
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        panOnScroll={true}
        zoomOnPinch={true}
        zoomOnScroll={true}
        onInit={setRfInstance}
        minZoom={0.01}
        maxZoom={2}
        className="h-full w-full bg-transparent"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#E2E8F0" />
        <Controls className="!bg-[var(--color-bg-surface)] !border-[var(--color-border-strong)] text-[var(--color-text-secondary)]" />
      </ReactFlow>
    </div>
  );
}


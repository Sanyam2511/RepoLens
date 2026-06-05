"use client";

import React, { useMemo, useState, useEffect } from "react";
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
} from "@xyflow/react";
import dagre from "dagre";
import { RepoGraph } from "shared";
import { NODE_TYPES, type GraphNodeData } from "./GraphNodes";

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
  if (lower.includes("web") || lower.includes("frontend") || lower.includes("pages")) return "#7C3AED";
  if (lower.includes("worker") || lower.includes("backend") || lower.includes("api") || lower.includes("analyzer")) return "#059669";
  if (lower.includes("shared") || lower.includes("core") || lower.includes("types")) return "#6366F1";
  const DYNAMIC_COLORS = ["#7C3AED", "#6366F1", "#0891B2", "#059669", "#64748B"];
  return DYNAMIC_COLORS[hashString(key) % DYNAMIC_COLORS.length];
};

const getNodeCategoryAndAccent = (layer: number, key: string) => {
  if (layer === 0) return { category: "leaf", accent: "#64748B" };
  if (layer === 4) return { category: "hotspot", accent: "#F59E0B" };
  if (layer === 5) return { category: "npm", accent: "#64748B" };
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

const buildArchitectureTree = (graphData: RepoGraph | null) => {
  if (!graphData) return { nodes: [], edges: [] };

  const filePaths = graphData.nodes.filter(n => n.type === "file").map(n => n.id);
  const repoRoot = getCommonPathPrefix(filePaths);
  const repoRootLen = splitPath(repoRoot).length;

  const visualNodes = new Map<string, Node<GraphNodeData>>();
  const visualEdges = new Map<string, Edge>();
  const fileToVisualMap = new Map<string, string>();
  const moduleFileCounts = new Map<string, number>();

  const createVisualNode = (id: string, label: string, layer: number, kind: any, sublabel: string, rootKeyForColor: string) => {
    if (visualNodes.has(id)) return;
    const { category, accent } = getNodeCategoryAndAccent(layer, rootKeyForColor);

    visualNodes.set(id, {
      id,
      type: "analysisNode",
      position: { x: 0, y: 0 },
      data: { label, rawLabel: id, kind, category: category as any, accent, sublabel, width: NODE_WIDTH },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
    });
  };

  const createEdge = (source: string, target: string, type: "struct" | "import", isCross: boolean, color: string) => {
    const edgeId = `${type}-${source}->${target}`;
    if (visualEdges.has(edgeId) || source === target) return;

    visualEdges.set(edgeId, {
      id: edgeId,
      source,
      target,
      type: "smoothstep",
      animated: false,
      markerEnd: type === "import" ? { type: MarkerType.ArrowClosed, color: isCross ? "#F59E0B" : color, width: 10, height: 10 } : undefined,
      style: {
        stroke: type === "import" && isCross ? "#F59E0B" : color,
        strokeWidth: type === "struct" ? 1 : 1.4,
        opacity: type === "struct" ? 0.3 : 0.7,
        strokeDasharray: type === "import" && isCross ? "5 5" : "none",
      },
    });
  };

  const inboundCount = new Map<string, number>();
  const connectsToExternal = new Set<string>();

  graphData.edges.forEach(edge => {
    inboundCount.set(edge.target, (inboundCount.get(edge.target) ?? 0) + 1);
    const targetNode = graphData.nodes.find(n => n.id === edge.target);
    if (targetNode?.type === "npm-package" || targetNode?.type === "api-endpoint" || targetNode?.type === "storage") {
      connectsToExternal.add(edge.source);
    }
  });

  graphData.nodes.forEach((node) => {
    if (node.type === "npm-package" || node.type === "api-endpoint" || node.type === "storage") {
      const layer = node.type === "npm-package" ? 5 : 3;
      createVisualNode(node.id, node.label, layer, node.type, node.type.replace("-", " "), "npm");
      fileToVisualMap.set(node.id, node.id);
      return;
    }

    const relSegments = splitPath(node.id).slice(repoRootLen);
    const fileName = relSegments[relSegments.length - 1] ?? node.label;
    if (!isRelevantNode(relSegments, fileName)) return;

    if (relSegments.length <= 1 || fileName.includes("docker")) {
      createVisualNode(node.id, fileName, 0, "file", "workspace root", "root");
      fileToVisualMap.set(node.id, node.id);
      return;
    }

    if (fileName.includes("types") || fileName.includes("interfaces") || relSegments.includes("types") || relSegments.includes("shared")) {
      createVisualNode(node.id, fileName, 4, "file", "cross-package boundary", "shared");
      fileToVisualMap.set(node.id, node.id);
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

    const pkgColorKey = packageId;

    createVisualNode(packageId, packageId, 1, "folder", "workspace package", pkgColorKey);

    if (moduleId !== packageId) {
      const modLabel = splitPath(moduleId).pop() + "/";
      createVisualNode(moduleId, modLabel, 2, "folder", "core module", pkgColorKey);
      createEdge(packageId, moduleId, "struct", false, getDynamicColor(pkgColorKey));
    }

    const isEntryPoint = /^(index|main|server|app|page|layout|route)\./i.test(fileName);
    const isHotspot = (inboundCount.get(node.id) ?? 0) > 3;
    const talksExternal = connectsToExternal.has(node.id);

    if (isEntryPoint || isHotspot || talksExternal) {
      const sublabel = isEntryPoint ? "entry point" : talksExternal ? "boundary logic" : "architecture node";
      createVisualNode(node.id, fileName, 3, "file", sublabel, pkgColorKey);
      createEdge(moduleId, node.id, "struct", false, getDynamicColor(pkgColorKey));
      fileToVisualMap.set(node.id, node.id);
    } else {
      fileToVisualMap.set(node.id, moduleId);
      moduleFileCounts.set(moduleId, (moduleFileCounts.get(moduleId) ?? 0) + 1);
    }
  });

  moduleFileCounts.forEach((count, moduleId) => {
    const vNode = visualNodes.get(moduleId);
    if (vNode) vNode.data.sublabel = `module · ${count} internal files`;
  });

  graphData.edges.forEach((edge) => {
    const visSource = fileToVisualMap.get(edge.source);
    const visTarget = fileToVisualMap.get(edge.target);
    if (!visSource || !visTarget || visSource === visTarget) return;

    const sourceColor = visualNodes.get(visSource)?.data.accent ?? "#64748b";
    const targetColor = visualNodes.get(visTarget)?.data.accent ?? "#64748b";
    createEdge(visSource, visTarget, "import", sourceColor !== targetColor, sourceColor);
  });

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 90, align: 'UL' });

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

  return { nodes: positionedNodes, edges: finalEdges };
};

export default function ArchitectureOverview({ graphData }: { graphData: RepoGraph | null }) {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<GraphNodeData>, Edge> | null>(null);
  const { nodes, edges } = useMemo(() => buildArchitectureTree(graphData), [graphData]);

  useEffect(() => {
    if (rfInstance && nodes.length > 0) {
      setTimeout(() => rfInstance.fitView({ padding: 0.15, duration: 800, minZoom: 0.01 }), 50);
    }
  }, [rfInstance, nodes]);

  const layerLabels = [
    "Layer 0 · Monorepo Root",
    "Layer 1 · Packages",
    "Layer 2 · Core Modules",
    "Layer 3 · Leaf Modules",
    "Layer 4 · Shared Boundaries",
    "Layer 5 · External Dependencies",
  ];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] dot-grid-bg">
      <div className="pointer-events-none absolute left-6 top-6 z-10 space-y-3 micro-label text-[var(--color-text-tertiary)]">
        {layerLabels.map(l => <div key={l}>{l}</div>)}
      </div>

      <ReactFlow<Node<GraphNodeData>, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
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

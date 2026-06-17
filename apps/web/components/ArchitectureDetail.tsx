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
import { Copy, AlertTriangle, Search, X, Filter, List } from "lucide-react";
import dagre from "dagre";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

const getDisplayName = (nodeId: string) => {
  const parts = nodeId.split("/");
  const filename = parts.pop() || nodeId;
  const relativePath = parts.join("/");
  return { filename, relativePath };
};

const getDirname = (nodeId: string) => {
  if (nodeId.length > 80 && !nodeId.startsWith("http")) return "extracted-snippets";
  const parts = nodeId.split("/");
  parts.pop();
  return parts.length > 0 ? parts.join("/") : "root";
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
// Dagre Grouped Layout
// ---------------------------------------------------------------------------
function computeGroupedDagreLayout(
  connectedNodes: Array<{ id: string }>,
  edgesToRender: Array<{ source: string; target: string }>,
  collapsedDirs: Set<string>
) {
  const dirMap = new Map<string, any[]>();
  
  connectedNodes.forEach(n => {
    const dir = getDirname(n.id);
    if (!dirMap.has(dir)) dirMap.set(dir, []);
    dirMap.get(dir)!.push(n);
  });

  const dirSizes = new Map<string, { w: number; h: number; cols: number }>();
  const dirNodePos = new Map<string, { x: number; y: number }>();
  const PADDING = 30;
  const HEADER_HEIGHT = 50;
  const GAP = 20;

  dirMap.forEach((files, dir) => {
    files.sort((a, b) => a.id.localeCompare(b.id));
    if (collapsedDirs.has(dir)) {
      dirSizes.set(dir, { w: NODE_WIDTH + 20, h: 60, cols: 0 });
    } else {
      const count = files.length;
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      
      const dirW = (cols * NODE_WIDTH) + ((cols - 1) * GAP) + (PADDING * 2);
      const dirH = (rows * NODE_HEIGHT) + ((rows - 1) * GAP) + PADDING + HEADER_HEIGHT + PADDING;
      
      dirSizes.set(dir, { w: dirW, h: dirH, cols });
      
      files.forEach((f, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        dirNodePos.set(f.id, {
          x: PADDING + (c * (NODE_WIDTH + GAP)),
          y: HEADER_HEIGHT + PADDING + (r * (NODE_HEIGHT + GAP)),
        });
      });
    }
  });

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 150, ranksep: 200, align: 'UL', marginx: 50, marginy: 50 });
  g.setDefaultEdgeLabel(() => ({}));

  dirMap.forEach((_, dir) => {
    const size = dirSizes.get(dir)!;
    g.setNode(dir, { width: size.w, height: size.h });
  });

  const dirEdges = new Set<string>();
  edgesToRender.forEach(e => {
    const dirS = getDirname(e.source);
    const dirT = getDirname(e.target);
    if (dirS !== dirT) {
      const edgeKey = `${dirS}->${dirT}`;
      if (!dirEdges.has(edgeKey)) {
        dirEdges.add(edgeKey);
        g.setEdge(dirS, dirT);
      }
    }
  });

  dagre.layout(g);

  const parentPositions = new Map<string, { x: number; y: number; w: number; h: number }>();
  g.nodes().forEach(dir => {
    const node = g.node(dir);
    // dagre returns center coordinates
    parentPositions.set(dir, { 
      x: node.x - node.width / 2, 
      y: node.y - node.height / 2, 
      w: node.width, 
      h: node.height 
    });
  });

  return { dirNodePos, parentPositions, dirMap };
}

// ---------------------------------------------------------------------------

export default function ArchitectureDetail({ graphData }: { graphData: RepoGraph | null }) {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<GraphNodeData>, Edge> | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [criticalPathOnly, setCriticalPathOnly] = useState(true);
  const [showNpm, setShowNpm] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!graphData) return;
    const dirsToCollapse = new Set<string>();
    graphData.nodes.forEach(n => {
      const dir = getDirname(n.id);
      if (/(test|example|fixture|mock|demo|docs|e2e)/i.test(dir)) {
        dirsToCollapse.add(dir);
      }
    });
    setCollapsedDirs(dirsToCollapse);
  }, [graphData]);

  const handleToggleDir = useCallback((dirId: string) => {
    setCollapsedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dirId)) next.delete(dirId);
      else next.add(dirId);
      return next;
    });
  }, []);

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
      const layoutResult = computeGroupedDagreLayout(
        connectedNodes,
        edgesToRender,
        collapsedDirs
      );

      layoutResult.parentPositions.forEach((pos, dirId) => {
        const filesCount = layoutResult.dirMap.get(dirId)?.length || 0;
        positionedNodes.push({
          id: `dir-${dirId}`,
          position: { x: pos.x, y: pos.y },
          type: "directoryNode",
          zIndex: -1,
          style: { width: pos.w, height: pos.h },
          data: {
            kind: "folder",
            label: dirId,
            rawLabel: dirId,
            pathLabel: dirId,
            clusterSize: filesCount,
            width: pos.w,
            height: pos.h,
            isCollapsed: collapsedDirs.has(dirId),
            onToggle: handleToggleDir,
            diffStatus: layoutResult.dirMap.get(dirId)?.some(f => (f as any).diffStatus === 'added' || (f as any).diffStatus === 'removed' || (f as any).diffStatus === 'modified') ? 'modified' : 'unchanged',
          } as any,
        });
        maxLayoutY = Math.max(maxLayoutY, pos.y + pos.h);
      });

      connectedNodes.forEach(n => {
        const dirId = getDirname(n.id);
        if (collapsedDirs.has(dirId)) return; // Skip rendering children of collapsed dirs
        
        const localPos = layoutResult.dirNodePos.get(n.id) ?? { x: 0, y: 0 };
        const w = NODE_WIDTH;
        const { filename, relativePath } = getDisplayName(n.id);
        const ext = filename.includes(".") ? filename.split(".").pop() : "";
        positionedNodes.push({
          id: n.id,
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          position: localPos,
          parentId: `dir-${dirId}`,
          extent: 'parent',
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
            diffStatus: (n as any).diffStatus,
          },
        });
      });
    }

    if (isolatedNodes.length > 0) {
      const startY = maxLayoutY > 0 ? maxLayoutY + NODE_HEIGHT + 120 : 40;
      const isolatedDirId = "isolated";
      
      const cols = Math.ceil(Math.sqrt(isolatedNodes.length));
      const rows = Math.ceil(isolatedNodes.length / cols);
      const PADDING = 30;
      const HEADER_HEIGHT = 50;
      const GAP = 20;
      const dirW = (cols * NODE_WIDTH) + ((cols - 1) * GAP) + (PADDING * 2);
      const dirH = (rows * NODE_HEIGHT) + ((rows - 1) * GAP) + PADDING + HEADER_HEIGHT + PADDING;

      positionedNodes.push({
        id: `dir-${isolatedDirId}`,
        position: { x: 0, y: startY },
        type: "directoryNode",
        zIndex: -1,
        style: { width: dirW, height: dirH },
        data: {
          kind: "folder",
          label: "isolated",
          rawLabel: "isolated",
          pathLabel: "Isolated Files",
          clusterSize: isolatedNodes.length,
          width: dirW,
          height: dirH,
          isCollapsed: collapsedDirs.has(isolatedDirId),
          onToggle: handleToggleDir,
        } as any,
      });

      if (!collapsedDirs.has(isolatedDirId)) {
        isolatedNodes.forEach((n, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const { filename, relativePath } = getDisplayName(n.id);
        const ext = filename.includes(".") ? filename.split(".").pop() : "";
        positionedNodes.push({
          id: n.id,
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          position: { x: PADDING + (c * (NODE_WIDTH + GAP)), y: HEADER_HEIGHT + PADDING + (r * (NODE_HEIGHT + GAP)) },
          parentId: `dir-${isolatedDirId}`,
          extent: 'parent',
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
            diffStatus: (n as any).diffStatus,
          },
        });
      });
      }
    }

    const renderedEdgesMap = new Map<string, Edge>();
    const edgeCounts = new Map<string, number>();

    edgesToRender.forEach(edge => {
      let sourceId = edge.source;
      let targetId = edge.target;
      
      const dirSource = getDirname(edge.source);
      const dirTarget = getDirname(edge.target);
      
      // If either end is in a collapsed folder, rewrite edge to the folder node
      if (collapsedDirs.has(dirSource)) {
        sourceId = `dir-${dirSource}`;
      }
      if (collapsedDirs.has(dirTarget)) {
        // If it's isolated folder, we named it 'isolated'
        if (isolatedNodes.some(n => n.id === edge.target)) {
           if (collapsedDirs.has('isolated')) targetId = `dir-isolated`;
        } else {
           targetId = `dir-${dirTarget}`;
        }
      }
      if (isolatedNodes.some(n => n.id === edge.source)) {
         if (collapsedDirs.has('isolated')) sourceId = `dir-isolated`;
      }
      
      // Prevent self-loops on folders
      if (sourceId === targetId) return;

      const edgeKey = `${sourceId}->${targetId}`;
      edgeCounts.set(edgeKey, (edgeCounts.get(edgeKey) || 0) + 1);
      
      if (!renderedEdgesMap.has(edgeKey)) {
        const srcNode = visibleNodes.find(n => n.id === edge.source);
        const color = ROLE_COLORS[(srcNode?.category as NodeCategory) ?? "internal"]?.border ?? "#64748b";
        const isCyclic = cyclicEdges.has(`${edge.source}->${edge.target}`);
        const isIntraFolder = dirSource === dirTarget;

        let edgeColor = isCyclic ? "#991B1B" : (isIntraFolder ? "rgba(148, 163, 184, 0.4)" : "#CBD5E1");
        
        let diffStatus = (edge as any).diffStatus;
        if (diffStatus === 'added') edgeColor = "#10B981";
        if (diffStatus === 'removed') edgeColor = "#EF4444";

        renderedEdgesMap.set(edgeKey, {
          id: `e-${edgeKey}`,
          source: sourceId,
          target: targetId,
          type: "smoothstep",
          animated: isCyclic,
          zIndex: isIntraFolder ? 0 : 1,
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 10, height: 10 },
          style: { stroke: edgeColor, strokeWidth: 1.5, opacity: diffStatus === 'removed' ? 0.3 : 0.8 }, // We will update strokeWidth after counting
        });
      }
    });

    // Update stroke widths based on edge counts
    renderedEdgesMap.forEach((edge, key) => {
       const count = edgeCounts.get(key) || 1;
       const isCyclic = edge.animated;
       const baseStrokeWidth = isCyclic ? 2.5 : 1.5;
       const finalStrokeWidth = count > 1 ? baseStrokeWidth + Math.min(count * 0.4, 5) : baseStrokeWidth;
       edge.style = { ...edge.style, strokeWidth: finalStrokeWidth };
    });

    const layoutedEdges = Array.from(renderedEdgesMap.values());

    setNodes(positionedNodes);
    setEdges(layoutedEdges);

    if (rfInstance) {
      setTimeout(() => rfInstance.fitView({ padding: 0.12, duration: 800, minZoom: 0.3, maxZoom: 1 }), 100);
    }
  }, [processedData, criticalPathOnly, rfInstance, setNodes, setEdges, collapsedDirs, handleToggleDir]);

  useEffect(() => { mapDataToCanvas(); }, [mapDataToCanvas]);

  useEffect(() => {
    if (!processedData) return;
    setNodes(nds => nds.map(n => {
      if (!focusedNodeId) return { ...n, style: { ...n.style, opacity: 1 } };
      
      let isFocusedOrNeighbor = false;
      if (focusedNodeId.startsWith("dir-")) {
        const folderName = focusedNodeId.substring(4);
        const isChild = n.parentId === focusedNodeId || getDirname(n.id) === folderName;
        if (n.id === focusedNodeId || isChild) {
          isFocusedOrNeighbor = true;
        } else {
          // Check if this node is connected to any child of the folder
          const connected = processedData.nodes
            .filter(cn => getDirname(cn.id) === folderName)
            .some(cn => processedData.adjacency.get(cn.id)?.includes(n.id) || processedData.reverseAdjacency.get(cn.id)?.includes(n.id));
          if (connected) isFocusedOrNeighbor = true;
        }
      } else {
        const focused = n.id === focusedNodeId;
        const neighbor = processedData.adjacency.get(focusedNodeId)?.includes(n.id)
          || processedData.reverseAdjacency.get(focusedNodeId)?.includes(n.id);
        isFocusedOrNeighbor = focused || !!neighbor;
      }
      return { ...n, style: { ...n.style, opacity: isFocusedOrNeighbor ? 1 : 0.15 } };
    }));

    setEdges(eds => eds.map(e => {
      // isCyclic original styles used red (#991B1B)
      const isCyclic = e.style?.stroke === "#991B1B";
      
      if (!focusedNodeId) {
        return { ...e, style: { ...e.style, opacity: 0.8, strokeWidth: 1.5 }, animated: isCyclic, zIndex: -1 };
      }
      
      let isOutgoing = false;
      let isIncoming = false;

      if (focusedNodeId.startsWith("dir-")) {
        const folderName = focusedNodeId.substring(4);
        const sourceFolder = getDirname(e.source);
        const targetFolder = getDirname(e.target);
        if (sourceFolder === folderName && targetFolder !== folderName) isOutgoing = true;
        if (targetFolder === folderName && sourceFolder !== folderName) isIncoming = true;
      } else {
        isOutgoing = e.source === focusedNodeId;
        isIncoming = e.target === focusedNodeId;
      }
      
      if (isOutgoing) return { ...e, style: { ...e.style, opacity: 1, strokeWidth: 3, stroke: "#232F72" }, animated: true, zIndex: 10 };
      if (isIncoming) return { ...e, style: { ...e.style, opacity: 1, strokeWidth: 3, stroke: "#10B981" }, animated: true, zIndex: 10 };
      
      return { ...e, style: { ...e.style, opacity: 0.1, strokeWidth: 1 }, animated: false, zIndex: -1 };
    }));
  }, [focusedNodeId, processedData, setNodes, setEdges]);

  const focusedNodeData = useMemo(
    () => nodes.find(n => n.id === focusedNodeId)?.data as GraphNodeData | undefined,
    [nodes, focusedNodeId]
  );

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setFocusedNodeId(node.id);
  };

  const isFolderFocus = focusedNodeId?.startsWith("dir-");
  const folderName = isFolderFocus ? focusedNodeId!.substring(4) : null;

  const aggregatedDeps = useMemo(() => {
    if (!processedData || !focusedNodeId) return { inbound: [], outbound: [] };
    if (!isFolderFocus) {
      return {
        inbound: processedData.reverseAdjacency.get(focusedNodeId) || [],
        outbound: processedData.adjacency.get(focusedNodeId) || [],
      };
    }
    const inSet = new Set<string>();
    const outSet = new Set<string>();
    processedData.nodes.forEach(n => {
      if (getDirname(n.id) === folderName) {
        processedData.reverseAdjacency.get(n.id)?.forEach(src => {
          if (getDirname(src) !== folderName) inSet.add(src);
        });
        processedData.adjacency.get(n.id)?.forEach(tgt => {
          if (getDirname(tgt) !== folderName) outSet.add(tgt);
        });
      }
    });
    return { inbound: Array.from(inSet), outbound: Array.from(outSet) };
  }, [processedData, focusedNodeId, isFolderFocus, folderName]);

  const handleNodeClickFull = (_: React.MouseEvent, node: Node) => {
    handleNodeClick(_ as any, node);
    const w = (node.data as GraphNodeData).width as number ?? NODE_WIDTH;
    if (rfInstance) rfInstance.setCenter(node.position.x + w / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 0.9, duration: 600 });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const target = nodes.find(n => (n.data as GraphNodeData).label.toLowerCase().includes(searchQuery.toLowerCase()));
    if (target) handleNodeClick(e as any, target);
  };


  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-subtle)] bg-white z-10 shrink-0">
        {/* Left: Search */}
        <label className="flex items-center gap-2 border border-[var(--color-border-subtle)] rounded-md px-3 py-1.5 w-[260px] focus-within:border-[var(--color-accent)] transition-colors">
          <Search className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search repo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none border-0 p-0 shadow-none focus:shadow-none text-sm text-[var(--color-text-primary)]"
          />
        </label>

        {/* Right: Legend and Filter Dropdowns */}
        <div className="flex items-center gap-1">
          {/* Legend Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setShowLegend(p => !p); setShowFilterMenu(false); }}
              className="flex items-center justify-center p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] rounded-md transition-colors"
              title="Legend"
            >
              <List className="w-4 h-4" />
            </button>
            {showLegend && (
              <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-white border border-[var(--color-border-subtle)] rounded-xl shadow-xl z-50">
                <div className="micro-label mb-3">Role Legend</div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  {Object.entries(ROLE_COLORS).map(([role, colors]) => (
                    <div key={role} className="flex items-center gap-2 text-slate-600 capitalize text-xs font-medium">
                      <span className="w-3 h-3 rounded-sm border" style={{ backgroundColor: colors.bg, borderColor: colors.border }} />
                      {role}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setShowFilterMenu(p => !p); setShowLegend(false); }}
              className="flex items-center justify-center p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] rounded-md transition-colors"
              title="Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white border border-[var(--color-border-subtle)] rounded-xl shadow-xl z-50 flex flex-col gap-2">
                <button
                  onClick={() => setCriticalPathOnly(p => !p)}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    criticalPathOnly ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]" : "hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  {criticalPathOnly ? "✓ Connected Only" : "Show All Nodes"}
                </button>
                <button
                  onClick={() => setShowNpm(p => !p)}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    showNpm ? "bg-amber-50 text-amber-700" : "hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  {showNpm ? "✓ Show NPM Dependencies" : "Hide NPM Dependencies"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="relative flex-1 w-full overflow-hidden bg-[var(--color-bg-base)] dot-grid-bg">
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 h-[400px] bg-[var(--color-bg-surface)]/95 backdrop-blur-2xl border-t border-[var(--color-border-subtle)] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex transition-all duration-300 transform ${
          focusedNodeId ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        {/* Inspect & Relations Column */}
        <div className="w-[360px] p-6 border-r border-[var(--color-border-subtle)]/50 flex flex-col gap-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between shrink-0">
            <div className="min-w-0 pr-4">
              <div className="micro-label mb-1">Inspecting</div>
              <div className="font-semibold text-lg text-[var(--color-text-primary)] truncate" title={focusedNodeData?.label}>
                {focusedNodeData?.label}
              </div>
              <div className="data-mono-dense mt-1 text-[var(--color-text-tertiary)] break-all whitespace-normal line-clamp-2" title={focusedNodeData?.pathLabel}>
                {focusedNodeData?.pathLabel || (focusedNodeId?.startsWith("dir-") && "Directory")}
              </div>
            </div>
            <button onClick={() => setFocusedNodeId(null)} className="p-1.5 shrink-0 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] bg-[var(--color-bg-subtle)] rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>

          {focusedNodeData?.isCyclic && (
            <div className="badge-cycle p-3 rounded-lg text-xs flex gap-2 shrink-0">
              <AlertTriangle className="w-4 h-4 shrink-0" /> Part of a circular dependency loop.
            </div>
          )}

          {/* Relations Split */}
          <div className="flex gap-6 flex-1 min-h-0">
            {/* Dependents */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between micro-label mb-3 shrink-0">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-healthy)]" /> Dependents
                </span>
                <span className="data-mono-dense">{aggregatedDeps.inbound.length}</span>
              </div>
              <div className="space-y-1 overflow-y-auto pr-2 pb-4">
                {aggregatedDeps.inbound.map(id => {
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
                {aggregatedDeps.inbound.length === 0 && (
                  <div className="ui-label text-[var(--color-text-tertiary)] italic">No inbound imports.</div>
                )}
              </div>
            </div>

            {/* Dependencies */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between micro-label mb-3 shrink-0">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" /> Dependencies
                </span>
                <span className="data-mono-dense">{aggregatedDeps.outbound.length}</span>
              </div>
              <div className="space-y-1 overflow-y-auto pr-2 pb-4">
                {aggregatedDeps.outbound.map(id => {
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
                {aggregatedDeps.outbound.length === 0 && (
                  <div className="ui-label text-[var(--color-text-tertiary)] italic">No outbound imports.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Code Snippet Column */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col bg-white">
          {focusedNodeData?.kind === "file" && focusedNodeData.codeSnippet ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="border border-[var(--color-border-strong)] rounded-lg overflow-y-auto bg-[var(--color-bg-subtle)] flex-1">
                <SyntaxHighlighter
                  language="typescript"
                  style={oneLight}
                  wrapLongLines={true}
                  customStyle={{ background: "transparent", margin: 0, fontSize: "12px", padding: "16px", fontFamily: "var(--font-mono)" }}
                >
                  {focusedNodeData.codeSnippet}
                </SyntaxHighlighter>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[var(--color-text-tertiary)] italic text-sm">
              {focusedNodeId?.startsWith("dir-") ? "Directory nodes do not have code snippets." : "No code snippet available."}
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
        onNodeClick={handleNodeClickFull as any}
        onPaneClick={() => setFocusedNodeId(null)}
        onInit={setRfInstance}
        minZoom={0.05}
        maxZoom={2}
        className="bg-transparent"
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#E2E8F0" />
        <Controls className="!bg-[var(--color-bg-surface)] !border-[var(--color-border-strong)] text-[var(--color-text-secondary)]" />
      </ReactFlow>
      </div>
    </div>
  );
}
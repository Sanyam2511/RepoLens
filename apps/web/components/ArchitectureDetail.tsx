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
import { RepoNode, RepoGraph } from "shared";
import { NODE_TYPES, ROLE_COLORS, NodeCategory, categorizeNode, type GraphNodeData } from "./GraphNodes";
import { Copy, AlertTriangle, Search, X } from "lucide-react";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 130;
const GRID_COLS = 4;

const cleanPath = (p: string) => {
  if (!p) return "";
  let cleaned = p.replace(/\\/g, '/');
  const parts = cleaned.split('/');
  const repoIndex = parts.findIndex(part => part.startsWith('repo-'));
  if (repoIndex !== -1 && repoIndex + 1 < parts.length) {
    return parts.slice(repoIndex + 1).join('/');
  }
  return cleaned.replace(/^[a-zA-Z]:\//, '');
};

const getDisplayName = (normalizedPath: string) => {
  const parts = normalizedPath.split('/');
  const filename = parts.pop() || "";
  const relativePath = parts.join('/');
  return { filename, relativePath };
};

const IGNORED_EXTS = new Set(["svg", "ico", "png", "jpg", "jpeg", "css", "scss", "md", "mdx", "sql", "toml", "prisma", "lock", "yml", "yaml", "txt", "woff", "woff2", "ttf", "eot"]);

// FIX: Removed tsconfig.json and tsconfig.node.json
const IGNORED_FILES = new Set([
  ".gitignore", ".env", ".env.example", ".env.local", 
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", 
  "eslint.config.mjs", "eslint.config.js", "postcss.config.mjs", "postcss.config.js", 
  "tailwind.config.ts", "tailwind.config.js", "next.config.ts", "next.config.js", 
  "vitest.config.ts", "jest.config.ts"
]);

export default function ArchitectureDetail({ graphData }: { graphData: RepoGraph | null }) {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node<GraphNodeData>, Edge> | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [criticalPathOnly, setCriticalPathOnly] = useState(false);

  const processedData = useMemo(() => {
    if (!graphData) return null;

    let cleanedNodes = graphData.nodes.map(n => ({ ...n, id: cleanPath(n.id), label: cleanPath(n.label) }));
    const cleanedEdgesRaw = graphData.edges.map(e => ({ ...e, source: cleanPath(e.source), target: cleanPath(e.target) }));

    cleanedNodes = cleanedNodes.filter(n => {
      if (n.type !== 'file') return true; 
      const filename = n.id.split('/').pop()?.toLowerCase() || "";
      if (filename === "package.json") return true;
      if (IGNORED_FILES.has(filename)) return false;
      const ext = filename.includes(".") ? filename.split('.').pop()?.toLowerCase() : "";
      if (ext && IGNORED_EXTS.has(ext)) return false;
      return true;
    });

    const nodeIds = new Set(cleanedNodes.map(n => n.id));
    const validEdges = cleanedEdgesRaw.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target);

    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    const reverseAdjacency = new Map<string, string[]>();
    
    cleanedNodes.forEach(n => {
      inDegree.set(n.id, 0);
      outDegree.set(n.id, 0);
      adjacency.set(n.id, []);
      reverseAdjacency.set(n.id, []);
    });

    validEdges.forEach(edge => {
      outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
      adjacency.get(edge.source)?.push(edge.target);
      reverseAdjacency.get(edge.target)?.push(edge.source);
    });

    const cyclicNodes = new Set<string>();
    const cyclicEdges = new Set<string>();
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const detectCycle = (nodeId: string, path: string[]) => {
      if (recStack.has(nodeId)) {
        const cycleStartIndex = path.indexOf(nodeId);
        const cycleNodes = path.slice(cycleStartIndex);
        cycleNodes.forEach(n => cyclicNodes.add(n));
        for (let i = 0; i < cycleNodes.length - 1; i++) cyclicEdges.add(`${cycleNodes[i]}->${cycleNodes[i+1]}`);
        cyclicEdges.add(`${cycleNodes[cycleNodes.length - 1]}->${nodeId}`);
        return;
      }
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);
      const neighbors = adjacency.get(nodeId) ?? [];
      for (const next of neighbors) detectCycle(next, [...path]);
      recStack.delete(nodeId);
    };

    cleanedNodes.forEach(n => { if (!visited.has(n.id)) detectCycle(n.id, []); });

    const categorizedNodes = cleanedNodes.map(n => ({
      ...n,
      inbound: inDegree.get(n.id) ?? 0,
      outbound: outDegree.get(n.id) ?? 0,
      category: categorizeNode({ kind: n.type, inbound: inDegree.get(n.id), outbound: outDegree.get(n.id), category: undefined })
    }));

    return { nodes: categorizedNodes, edges: validEdges, inDegree, outDegree, cyclicNodes, cyclicEdges, adjacency, reverseAdjacency };
  }, [graphData]);

  const mapDataToCanvas = useCallback(() => {
    if (!processedData) return;

    const { nodes: pNodes, edges: pEdges, inDegree, outDegree, cyclicNodes, cyclicEdges } = processedData;

    let visibleNodesData = pNodes;
    if (criticalPathOnly) {
      visibleNodesData = visibleNodesData.filter(n => 
        n.type === "npm-package" || (inDegree.get(n.id) ?? 0) > 0 || (outDegree.get(n.id) ?? 0) > 0
      );
    }
    
    const visibleIds = new Set(visibleNodesData.map(n => n.id));
    const edgesToRender = pEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));

    const connectedIds = new Set<string>();
    edgesToRender.forEach(e => { connectedIds.add(e.source); connectedIds.add(e.target); });

    const connectedNodes = visibleNodesData.filter(n => connectedIds.has(n.id) || n.type === "npm-package");
    const isolatedNodes = visibleNodesData.filter(n => !connectedIds.has(n.id) && n.type !== "npm-package");

    const positionedNodes: Node<GraphNodeData>[] = [];
    let maxDagreY = 0;

    if (connectedNodes.length > 0) {
      const g = new dagre.graphlib.Graph();
      g.setDefaultEdgeLabel(() => ({}));
      g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120, marginx: 40, marginy: 40 });

      connectedNodes.forEach(n => {
        const dynamicWidth = (inDegree.get(n.id) ?? 0) > 4 ? 300 : NODE_WIDTH;
        g.setNode(n.id, { width: dynamicWidth, height: NODE_HEIGHT });
      });
      edgesToRender.forEach(e => g.setEdge(e.source, e.target, { weight: cyclicEdges.has(`${e.source}->${e.target}`) ? 1 : 10 }));

      const nodesWithInbound = new Set(edgesToRender.map(e => e.target));
      const entryNodes = connectedNodes.filter(n => !nodesWithInbound.has(n.id));
      g.setNode("__INVISIBLE_ROOT__", { width: 1, height: 1 });
      entryNodes.forEach(n => g.setEdge("__INVISIBLE_ROOT__", n.id, { weight: 1, minlen: 1 }));

      dagre.layout(g);

      connectedNodes.forEach(n => {
        const pos = g.node(n.id);
        const { filename, relativePath } = getDisplayName(n.id);
        const extension = filename.includes(".") ? filename.split(".").pop() : "";
        const dynamicWidth = (inDegree.get(n.id) ?? 0) > 4 ? 300 : NODE_WIDTH;

        maxDagreY = Math.max(maxDagreY, pos.y + NODE_HEIGHT);

        positionedNodes.push({
          id: n.id,
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          position: { x: pos.x - dynamicWidth / 2, y: pos.y - NODE_HEIGHT / 2 },
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
            extension,
            codeSnippet: n.codeSnippet,
            width: dynamicWidth,
          },
        });
      });
    }

    if (isolatedNodes.length > 0) {
      const startY = maxDagreY > 0 ? maxDagreY + 120 : 40;
      isolatedNodes.forEach((n, index) => {
        const row = Math.floor(index / GRID_COLS);
        const col = index % GRID_COLS;
        const x = col * (NODE_WIDTH + 60);
        const y = startY + row * (NODE_HEIGHT + 60);

        const { filename, relativePath } = getDisplayName(n.id);
        const extension = filename.includes(".") ? filename.split(".").pop() : "";

        positionedNodes.push({
          id: n.id,
          targetPosition: Position.Top,
          sourcePosition: Position.Bottom,
          position: { x, y },
          type: "detailNode",
          data: {
            label: filename,
            rawLabel: n.id,
            pathLabel: relativePath,
            kind: n.type,
            category: "internal", 
            inbound: 0,
            outbound: 0,
            isCyclic: false,
            extension,
            codeSnippet: n.codeSnippet,
            width: NODE_WIDTH,
          },
        });
      });
    }

    const layoutedEdges: Edge[] = edgesToRender.map((edge) => {
      const sourceNode = visibleNodesData.find(n => n.id === edge.source);
      const color = ROLE_COLORS[(sourceNode?.category as NodeCategory) ?? "internal"]?.border ?? "#64748b";
      const isCyclicEdge = cyclicEdges.has(`${edge.source}->${edge.target}`);

      return {
        id: `deps-${edge.source}->${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: isCyclicEdge,
        markerEnd: { type: MarkerType.ArrowClosed, color: isCyclicEdge ? "#EF4444" : color, width: 10, height: 10 },
        style: { stroke: isCyclicEdge ? "#EF4444" : color, strokeWidth: 1.5, opacity: 0.6 },
      };
    });

    setNodes(positionedNodes);
    setEdges(layoutedEdges);

    if (rfInstance) setTimeout(() => rfInstance.fitView({ padding: 0.15, duration: 800, minZoom: 0.01 }), 100);
  }, [processedData, criticalPathOnly, rfInstance, setNodes, setEdges]);

  useEffect(() => { mapDataToCanvas(); }, [mapDataToCanvas]);

  useEffect(() => {
    if (!processedData) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (!focusedNodeId) return { ...n, style: { ...n.style, opacity: 1 } };
        const isFocused = n.id === focusedNodeId;
        const isNeighbor = processedData.adjacency.get(focusedNodeId)?.includes(n.id) || processedData.reverseAdjacency.get(focusedNodeId)?.includes(n.id);
        return { ...n, style: { ...n.style, opacity: isFocused || isNeighbor ? 1 : 0.2 } };
      })
    );

    setEdges((eds) =>
      eds.map((e) => {
        if (!focusedNodeId) return { ...e, style: { ...e.style, opacity: 0.6, strokeWidth: 1.5 } };
        if (e.source === focusedNodeId) return { ...e, style: { ...e.style, opacity: 1, strokeWidth: 3, stroke: "#3B82F6" }, zIndex: 10 }; 
        if (e.target === focusedNodeId) return { ...e, style: { ...e.style, opacity: 1, strokeWidth: 3, stroke: "#10B981" }, zIndex: 10 }; 
        return { ...e, style: { ...e.style, opacity: 0.1, strokeWidth: 1 }, zIndex: 0 };
      })
    );
  }, [focusedNodeId, processedData, setNodes, setEdges]);

  const focusedNodeData = useMemo(() => nodes.find(n => n.id === focusedNodeId)?.data as GraphNodeData | undefined, [nodes, focusedNodeId]);
  
  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setFocusedNodeId(node.id);
    if (rfInstance) rfInstance.setCenter(node.position.x + (node.data.width as number) / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 1, duration: 600 });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const target = nodes.find(n => (n.data as GraphNodeData).label.toLowerCase().includes(searchQuery.toLowerCase()));
    if (target) handleNodeClick(e as any, target);
  };

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden rounded-[28px]">
      <div className="absolute top-4 right-4 z-10 w-72 flex flex-col gap-4">
        <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-lg border border-slate-200 p-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input type="text" placeholder="Focus on file..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 outline-none text-sm bg-transparent" />
        </form>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Graph Metrics</div>
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100"><div className="font-black text-slate-800">{nodes.length}</div><div className="text-[10px] uppercase text-slate-500">Nodes</div></div>
            <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100"><div className="font-black text-slate-800">{edges.length}</div><div className="text-[10px] uppercase text-slate-500">Edges</div></div>
            <div className="bg-red-50 rounded-lg p-2 text-center border border-red-100"><div className="font-black text-red-600">{processedData?.cyclicNodes.size ?? 0}</div><div className="text-[10px] uppercase text-red-500">Cycles</div></div>
            <div className="bg-amber-50 rounded-lg p-2 text-center border border-amber-100"><div className="font-black text-amber-600">{Array.from(processedData?.inDegree.values() || []).filter(v => v > 4).length}</div><div className="text-[10px] uppercase text-amber-500">Hotspots</div></div>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-t pt-3">Role Legend</div>
          <div className="space-y-2">
            {Object.entries(ROLE_COLORS).map(([role, colors]) => (
              <div key={role} className="flex items-center gap-2 text-xs text-slate-600 capitalize">
                <span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: colors.bg, borderColor: colors.border }}></span>{role}
              </div>
            ))}
          </div>

          <button onClick={() => setCriticalPathOnly(!criticalPathOnly)} className={`mt-4 w-full py-2 text-xs font-bold uppercase rounded-lg border transition ${criticalPathOnly ? 'bg-slate-800 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
            {criticalPathOnly ? "Show Connected Only" : "Show All Files"}
          </button>
        </div>
      </div>

      <div className={`absolute top-4 left-4 z-20 w-80 bg-white/95 backdrop-blur shadow-2xl border border-slate-200 rounded-2xl flex flex-col transition-all duration-300 transform ${focusedNodeId ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}>
        <div className="p-4 border-b border-slate-100 flex items-start justify-between">
          <div className="min-w-0 pr-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Inspecting Node</div>
            <div className="font-bold text-slate-800 truncate" title={focusedNodeData?.rawLabel}>{focusedNodeData?.label}</div>
            <div className="text-xs text-slate-500 truncate" title={focusedNodeData?.pathLabel}>{focusedNodeData?.pathLabel}</div>
          </div>
          <button onClick={() => setFocusedNodeId(null)} className="p-1 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-md"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-5">
          <button onClick={() => navigator.clipboard.writeText(focusedNodeData?.rawLabel ?? "")} className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 py-2 rounded-lg text-xs font-semibold transition">
            <Copy className="w-3 h-3" /> Copy Path
          </button>

          {focusedNodeData?.isCyclic && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> This file is part of a circular dependency loop.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 mb-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Dependents</span>
              <span>{processedData?.reverseAdjacency.get(focusedNodeId!)?.length || 0}</span>
            </div>
            <div className="space-y-1">
              {processedData?.reverseAdjacency.get(focusedNodeId!)?.map(id => (
                <div key={id} className="text-xs text-slate-600 bg-slate-50 px-2 py-1.5 rounded truncate cursor-pointer hover:bg-slate-100" onClick={(e) => handleNodeClick(e as any, nodes.find(n => n.id === id)!)}>{getDisplayName(id).filename}</div>
              ))}
              {(processedData?.reverseAdjacency.get(focusedNodeId!)?.length || 0) === 0 && <div className="text-xs text-slate-400 italic">No inbound imports.</div>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 mb-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Dependencies</span>
              <span>{processedData?.adjacency.get(focusedNodeId!)?.length || 0}</span>
            </div>
            <div className="space-y-1">
              {processedData?.adjacency.get(focusedNodeId!)?.map(id => (
                <div key={id} className="text-xs text-slate-600 bg-slate-50 px-2 py-1.5 rounded truncate cursor-pointer hover:bg-slate-100" onClick={(e) => handleNodeClick(e as any, nodes.find(n => n.id === id)!)}>{getDisplayName(id).filename}</div>
              ))}
              {(processedData?.adjacency.get(focusedNodeId!)?.length || 0) === 0 && <div className="text-xs text-slate-400 italic">No outbound imports.</div>}
            </div>
          </div>
          
          {focusedNodeData?.kind === "file" && focusedNodeData.codeSnippet && (
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Code Snippet</div>
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <SyntaxHighlighter language="typescript" style={oneLight} customStyle={{ background: "transparent", margin: 0, fontSize: "11px", padding: "10px" }}>{focusedNodeData.codeSnippet}</SyntaxHighlighter>
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
        minZoom={0.01}
        maxZoom={2}
        className="bg-transparent"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#cbd5e1" />
        <Controls className="bg-white border-slate-200 text-slate-600 shadow-md" />
        <MiniMap maskColor="rgba(248, 250, 252, 0.8)" nodeColor={(n) => ROLE_COLORS[(n.data as GraphNodeData).category ?? "internal"]?.border ?? "#64748b"} />
      </ReactFlow>
    </div>
  );
}
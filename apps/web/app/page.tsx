"use client";

import React, { useState, useCallback } from "react";
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
} from "@xyflow/react";
import { Search, Loader2 } from "lucide-react";

// We import the shared types so the frontend knows exactly what to expect
import { RepoNode, RepoEdge } from "shared";

export default function RepoLensDashboard() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  // React Flow state hooks
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 1. Submit the Job to the Worker
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setStatusText("Initializing analysis...");
    setNodes([]);
    setEdges([]);

    try {
      const res = await fetch("http://localhost:4000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();

      if (data.jobId) {
        setStatusText("Repository queued. Analyzing AST...");
        pollJobStatus(data.jobId);
      } else {
        setStatusText("Failed to queue job.");
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setStatusText("Error connecting to the worker engine.");
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
          mapDataToCanvas(data.result.nodes, data.result.edges);
          setLoading(false);
        } else if (data.state === "failed") {
          clearInterval(interval);
          setStatusText(`Analysis failed: ${data.failedReason}`);
          setLoading(false);
        } else {
          setStatusText(`Processing: ${data.state}...`);
        }
      } catch (error) {
        clearInterval(interval);
        setStatusText("Lost connection to worker.");
        setLoading(false);
      }
    }, 2000); // Check every 2 seconds
  };

  // 3. Transform our Shared Types into React Flow Types
  const mapDataToCanvas = (repoNodes: RepoNode[], repoEdges: RepoEdge[]) => {
    // For now, we use a simple grid layout to prevent them from stacking on top of each other
    const canvasNodes = repoNodes.map((node, index) => {
      const isApi = node.type === "api-endpoint";
      const isStorage = node.type === "storage";

      return {
        id: node.id,
        // Quick math for a basic grid layout
        position: { x: (index % 4) * 250 + 100, y: Math.floor(index / 4) * 150 + 100 },
        data: { 
          label: `${isApi ? "🌐 " : isStorage ? "🗄️ " : "📄 "}${node.label}` 
        },
        type: "default",
        style: {
          background: isApi ? "#059669" : isStorage ? "#ca8a04" : "#1e293b",
          color: "#f8fafc",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "12px",
          boxShadow: isApi || isStorage ? "0 0 15px rgba(255,255,255,0.1)" : "none",
        },
      };
    });

    const canvasEdges = repoEdges.map((edge, index) => ({
      id: `e-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: true, // This gives us the "glowing data flow" effect
      style: { stroke: "#38bdf8", strokeWidth: 2 },
    }));

    setNodes(canvasNodes);
    setEdges(canvasEdges);
  };

  return (
    <div className="w-screen h-screen relative bg-slate-900 text-white overflow-hidden">
      {/* The Search Bar (Glassmorphic) */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl px-4">
        <form onSubmit={handleAnalyze} className="glass-panel rounded-2xl p-2 flex items-center shadow-2xl">
          <Search className="text-slate-400 ml-3 w-5 h-5" />
          <input
            type="text"
            placeholder="Paste a public GitHub URL (e.g., https://github.com/expressjs/cors)"
            className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-slate-100 placeholder-slate-400"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-3 rounded-xl font-medium flex items-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
          </button>
        </form>
        
        {/* Status Indicator */}
        {statusText && (
          <div className="text-center mt-4 text-sm text-slate-300 font-mono tracking-wide">
            {statusText}
          </div>
        )}
      </div>

      {/* The React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
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
    </div>
  );
}
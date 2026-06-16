import { RepoGraph, RepoNode, RepoEdge } from "shared";

export function computeGraphDiff(baseGraph: RepoGraph, targetGraph: RepoGraph): RepoGraph {
  const baseNodes = new Map(baseGraph.nodes.map(n => [n.id, n]));
  const targetNodes = new Map(targetGraph.nodes.map(n => [n.id, n]));

  const baseEdges = new Map(baseGraph.edges.map(e => [`${e.source}->${e.target}`, e]));
  const targetEdges = new Map(targetGraph.edges.map(e => [`${e.source}->${e.target}`, e]));

  const diffNodes: RepoNode[] = [];
  const diffEdges: RepoEdge[] = [];

  // 1. Process Nodes
  // Nodes in target but not in base -> added
  // Nodes in both -> unchanged
  for (const [id, targetNode] of targetNodes.entries()) {
    if (!baseNodes.has(id)) {
      diffNodes.push({ ...targetNode, diffStatus: 'added' });
    } else {
      diffNodes.push({ ...targetNode, diffStatus: 'unchanged' });
    }
  }

  // Nodes in base but not in target -> removed
  for (const [id, baseNode] of baseNodes.entries()) {
    if (!targetNodes.has(id)) {
      diffNodes.push({ ...baseNode, diffStatus: 'removed' });
    }
  }

  // 2. Process Edges
  for (const [id, targetEdge] of targetEdges.entries()) {
    if (!baseEdges.has(id)) {
      diffEdges.push({ ...targetEdge, diffStatus: 'added' });
    } else {
      diffEdges.push({ ...targetEdge, diffStatus: 'unchanged' });
    }
  }

  for (const [id, baseEdge] of baseEdges.entries()) {
    if (!targetEdges.has(id)) {
      diffEdges.push({ ...baseEdge, diffStatus: 'removed' });
    }
  }

  return {
    nodes: diffNodes,
    edges: diffEdges
  };
}

import { RepoGraph, RepoNode } from "shared";

export type SummaryMetricId = "coupling" | "cohesion" | "surface" | "complexity" | "risk";

export type SummaryMetricBand = "healthy" | "watch" | "hotspot";

export type SummaryMetric = {
  id: SummaryMetricId;
  label: string;
  score: number;
  band: SummaryMetricBand;
  direction: "higher-is-better" | "higher-is-worse";
  description: string;
  insight: string;
  primaryValue: string;
  secondaryValue: string;
  accent: string;
};

export type ClusterSummary = {
  key: string;
  label: string;
  accent: string;
  nodeCount: number;
  fileCount: number;
  apiCount: number;
  storageCount: number;
  folderCount: number;
  internalEdges: number;
  externalEdges: number;
  importEdges: number;
  couplingScore: number;
  cohesionScore: number;
  riskScore: number;
  sampleNodes: string[];
};

export type GraphSummary = {
  totalNodes: number;
  totalEdges: number;
  fileCount: number;
  apiCount: number;
  storageCount: number;
  folderCount: number;
  importEdges: number;
  crossClusterImports: number;
  internalImports: number;
  externalEdges: number;
  density: number;
  clusterCount: number;
  clusters: ClusterSummary[];
  topNodes: Array<{ label: string; type: RepoNode["type"]; degree: number; clusterLabel: string }>;
  metrics: Record<SummaryMetricId, SummaryMetric>;
};

const CLUSTER_COLORS = ["#2563eb", "#0f766e", "#b45309", "#7c3aed", "#0f172a", "#be123c"];

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

const getFallbackClusterKey = (node: RepoNode) => {
  if (node.type === "api-endpoint") return "external services";
  if (node.type === "storage") return "data layer";
  if (node.type === "folder") return "shared nodes";
  return "shared nodes";
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const pickClusterColor = (key: string) => CLUSTER_COLORS[hashString(key) % CLUSTER_COLORS.length] ?? CLUSTER_COLORS[0];

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

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const scoreBand = (score: number, direction: "higher-is-better" | "higher-is-worse"): SummaryMetricBand => {
  if (direction === "higher-is-better") {
    if (score >= 70) return "healthy";
    if (score >= 40) return "watch";
    return "hotspot";
  }

  if (score <= 30) return "healthy";
  if (score <= 65) return "watch";
  return "hotspot";
};

const metricBadge = (score: number, direction: "higher-is-better" | "higher-is-worse") => {
  if (direction === "higher-is-better") {
    if (score >= 70) return "Strong";
    if (score >= 40) return "Mixed";
    return "Fragile";
  }

  if (score <= 30) return "Low";
  if (score <= 65) return "Moderate";
  return "High";
};

const computeMetricScore = (value: number, scale: number) => clamp((value / Math.max(1, scale)) * 100);

export const summarizeRepoGraph = (graph: RepoGraph): GraphSummary => {
  const counts: Record<RepoNode["type"], number> = {
    file: 0,
    "api-endpoint": 0,
    storage: 0,
    folder: 0,
  };

  const degreeMap = new Map<string, number>();
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const fileIds = graph.nodes.filter((node) => node.type === "file").map((node) => node.id);
  const repoRoot = getCommonPathPrefix(fileIds);
  const clusterByNodeId = new Map<string, string>();
  const adjacency = new Map<string, Set<string>>();

  graph.nodes.forEach((node) => {
    counts[node.type] = (counts[node.type] ?? 0) + 1;
    degreeMap.set(node.id, degreeMap.get(node.id) ?? 0);
    adjacency.set(node.id, new Set());

    if (node.type === "file") {
      clusterByNodeId.set(node.id, getFileClusterKey(node.id, repoRoot));
    }
  });

  graph.edges.forEach((edge) => {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const fallbackClusterByNeighbors = (nodeId: string) => {
    const countsByCluster = new Map<string, number>();

    adjacency.get(nodeId)?.forEach((neighborId) => {
      const neighborNode = nodeMap.get(neighborId);
      if (!neighborNode || neighborNode.type !== "file") return;
      const clusterKey = clusterByNodeId.get(neighborId);
      if (!clusterKey) return;
      countsByCluster.set(clusterKey, (countsByCluster.get(clusterKey) ?? 0) + 1);
    });

    let winner = "";
    let maxCount = 0;
    countsByCluster.forEach((count, key) => {
      if (count > maxCount) {
        winner = key;
        maxCount = count;
      }
    });

    const node = nodeMap.get(nodeId);
    return winner || (node ? getFallbackClusterKey(node) : "shared nodes");
  };

  graph.nodes.forEach((node) => {
    if (!clusterByNodeId.has(node.id)) {
      clusterByNodeId.set(node.id, fallbackClusterByNeighbors(node.id));
    }
  });

  const importEdges = graph.edges.filter((edge) => edge.label === "imports");
  const totalImportEdges = importEdges.length;

  let internalImports = 0;
  let crossClusterImports = 0;
  let externalEdges = 0;

  graph.edges.forEach((edge) => {
    const sourceCluster = clusterByNodeId.get(edge.source) ?? "shared nodes";
    const targetCluster = clusterByNodeId.get(edge.target) ?? "shared nodes";

    if (edge.label === "imports") {
      if (sourceCluster === targetCluster) {
        internalImports += 1;
      } else {
        crossClusterImports += 1;
      }
    } else {
      externalEdges += 1;
    }
  });

  const clusters = new Map<string, {
    key: string;
    nodes: RepoNode[];
    internalEdges: number;
    externalEdges: number;
    importEdges: number;
  }>();

  graph.nodes.forEach((node) => {
    const clusterKey = clusterByNodeId.get(node.id) ?? "shared nodes";
    const entry = clusters.get(clusterKey) ?? { key: clusterKey, nodes: [], internalEdges: 0, externalEdges: 0, importEdges: 0 };
    entry.nodes.push(node);
    clusters.set(clusterKey, entry);
  });

  graph.edges.forEach((edge) => {
    const sourceCluster = clusterByNodeId.get(edge.source) ?? "shared nodes";
    const targetCluster = clusterByNodeId.get(edge.target) ?? "shared nodes";

    if (sourceCluster === targetCluster) {
      const entry = clusters.get(sourceCluster);
      if (entry) {
        entry.internalEdges += 1;
        if (edge.label === "imports") {
          entry.importEdges += 1;
        }
      }
      return;
    }

    const sourceEntry = clusters.get(sourceCluster);
    const targetEntry = clusters.get(targetCluster);
    if (sourceEntry) sourceEntry.externalEdges += 1;
    if (targetEntry) targetEntry.externalEdges += 1;
  });

  const clusterSummaries = Array.from(clusters.values())
    .map((cluster) => {
      const label = formatClusterLabel(cluster.key);
      const accent = pickClusterColor(cluster.key);
      const fileCount = cluster.nodes.filter((node) => node.type === "file").length;
      const apiCount = cluster.nodes.filter((node) => node.type === "api-endpoint").length;
      const storageCount = cluster.nodes.filter((node) => node.type === "storage").length;
      const folderCount = cluster.nodes.filter((node) => node.type === "folder").length;
      const couplingScore = totalImportEdges === 0 ? 0 : clamp((cluster.externalEdges / Math.max(1, cluster.importEdges + cluster.externalEdges)) * 100);
      const cohesionScore = totalImportEdges === 0 ? 100 : clamp((cluster.internalEdges / Math.max(1, cluster.internalEdges + cluster.externalEdges)) * 100);
      const riskScore = clamp(couplingScore * 0.45 + (100 - cohesionScore) * 0.25 + computeMetricScore(apiCount + storageCount, Math.max(1, fileCount)) * 0.3);

      return {
        key: cluster.key,
        label,
        accent,
        nodeCount: cluster.nodes.length,
        fileCount,
        apiCount,
        storageCount,
        folderCount,
        internalEdges: cluster.internalEdges,
        externalEdges: cluster.externalEdges,
        importEdges: cluster.importEdges,
        couplingScore,
        cohesionScore,
        riskScore,
        sampleNodes: cluster.nodes.slice(0, 4).map((node) => node.label),
      } satisfies ClusterSummary;
    })
    .sort((left, right) => right.riskScore - left.riskScore || right.nodeCount - left.nodeCount || left.label.localeCompare(right.label));

  const topNodes = graph.nodes
    .map((node) => ({
      label: node.label,
      type: node.type,
      degree: degreeMap.get(node.id) ?? 0,
      clusterLabel: formatClusterLabel(clusterByNodeId.get(node.id) ?? "shared nodes"),
    }))
    .sort((left, right) => right.degree - left.degree || left.label.localeCompare(right.label))
    .filter((node) => node.degree > 0)
    .slice(0, 8);

  const totalNodes = graph.nodes.length;
  const totalEdges = graph.edges.length;
  const density = totalNodes === 0 ? 0 : totalEdges / totalNodes;
  const couplingScore = totalImportEdges === 0 ? 0 : clamp((crossClusterImports / totalImportEdges) * 100);
  const cohesionScore = totalImportEdges === 0 ? 100 : clamp((internalImports / totalImportEdges) * 100);
  const surfaceScore = clamp(computeMetricScore(counts["api-endpoint"] + counts.storage, Math.max(1, counts.file)) * 1.4);
  const complexityScore = clamp(density * 18);
  const riskScore = clamp(couplingScore * 0.4 + surfaceScore * 0.35 + complexityScore * 0.25);

  const metrics: Record<SummaryMetricId, SummaryMetric> = {
    coupling: {
      id: "coupling",
      label: "Coupling",
      score: couplingScore,
      band: scoreBand(couplingScore, "higher-is-worse"),
      direction: "higher-is-worse",
      description: "How much the repository links across module boundaries.",
      insight: metricBadge(couplingScore, "higher-is-worse") === "High"
        ? "Imports frequently cross modules, so changes are more likely to ripple outward."
        : metricBadge(couplingScore, "higher-is-worse") === "Moderate"
          ? "Most imports stay inside modules, but a few bridges still carry change risk."
          : "Most imports stay inside the same module, which keeps change impact local.",
      primaryValue: `${crossClusterImports} cross-cluster imports`,
      secondaryValue: `${totalImportEdges} total import edges`,
      accent: "#b45309",
    },
    cohesion: {
      id: "cohesion",
      label: "Cohesion",
      score: cohesionScore,
      band: scoreBand(cohesionScore, "higher-is-better"),
      direction: "higher-is-better",
      description: "How strongly related files stay grouped together.",
      insight: cohesionScore >= 70
        ? "Most file-to-file imports stay inside the same module, which is a strong sign of clear boundaries."
        : cohesionScore >= 40
          ? "The structure is partially grouped, but several modules are still sharing responsibilities."
          : "The graph is scattered, suggesting the codebase may benefit from tighter module ownership.",
      primaryValue: `${internalImports} internal imports`,
      secondaryValue: `${cohesionScore}% of import edges stay local`,
      accent: "#0f766e",
    },
    surface: {
      id: "surface",
      label: "Surface area",
      score: surfaceScore,
      band: scoreBand(surfaceScore, "higher-is-worse"),
      direction: "higher-is-worse",
      description: "How broad the repository's external touch points are.",
      insight: surfaceScore >= 70
        ? "There are many calls into APIs or storage layers, so the repo's public surface is broad."
        : surfaceScore >= 40
          ? "The repository reaches outside itself in a few important places, but the surface is still manageable."
          : "External touch points are limited, which usually makes the codebase easier to reason about.",
      primaryValue: `${counts["api-endpoint"] + counts.storage} external nodes`,
      secondaryValue: `${counts.file} files in scope`,
      accent: "#2563eb",
    },
    complexity: {
      id: "complexity",
      label: "Complexity",
      score: complexityScore,
      band: scoreBand(complexityScore, "higher-is-worse"),
      direction: "higher-is-worse",
      description: "A compact density view of nodes and edges.",
      insight: complexityScore >= 70
        ? "The graph is dense, so navigation and refactoring will likely need careful sequencing."
        : complexityScore >= 40
          ? "The graph has enough links to matter, but still feels navigable."
          : "The graph is relatively sparse, which usually means a smaller review surface.",
      primaryValue: `${density.toFixed(2)} edges per node`,
      secondaryValue: `${totalNodes} nodes / ${totalEdges} edges`,
      accent: "#7c3aed",
    },
    risk: {
      id: "risk",
      label: "Risk",
      score: riskScore,
      band: scoreBand(riskScore, "higher-is-worse"),
      direction: "higher-is-worse",
      description: "A blended assessment of coupling, surface area, and density.",
      insight: riskScore >= 70
        ? "This repository deserves careful review because multiple structural signals point to change risk."
        : riskScore >= 40
          ? "The repository is balanced overall, but a few hotspots are worth a closer look."
          : "The repository looks structurally healthy and should be easier to evolve.",
      primaryValue: `${riskScore}/100 risk score`,
      secondaryValue: `${clusterSummaries.length} clusters analyzed`,
      accent: "#be123c",
    },
  };

  return {
    totalNodes,
    totalEdges,
    fileCount: counts.file,
    apiCount: counts["api-endpoint"],
    storageCount: counts.storage,
    folderCount: counts.folder,
    importEdges: totalImportEdges,
    crossClusterImports,
    internalImports,
    externalEdges,
    density,
    clusterCount: clusterSummaries.length,
    clusters: clusterSummaries,
    topNodes,
    metrics,
  };
};

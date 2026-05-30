import { Prisma, PrismaClient } from "@prisma/client";
import { AnalysisHistoryRecord, RepoGraph } from "shared";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const ANALYSIS_CACHE_VERSION = 2;
const LOCAL_HISTORY_PATH = path.join(
  process.env.REPOLENS_TEMP_DIR || path.join(process.cwd(), "temp"),
  "analysis-history.json"
);

const getCachedGraphVersion = (graph: RepoGraph | null): number | null => {
  if (!graph) return null;
  const meta = (graph as unknown as RepoGraph & { meta?: { cacheVersion?: number } }).meta;
  return typeof meta?.cacheVersion === "number" ? meta.cacheVersion : null;
};

const readLocalHistory = (): AnalysisHistoryRecord[] => {
  try {
    if (!fs.existsSync(LOCAL_HISTORY_PATH)) {
      return [];
    }

    const raw = fs.readFileSync(LOCAL_HISTORY_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AnalysisHistoryRecord[]) : [];
  } catch {
    return [];
  }
};

const writeLocalHistory = (records: AnalysisHistoryRecord[]) => {
  fs.mkdirSync(path.dirname(LOCAL_HISTORY_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_HISTORY_PATH, JSON.stringify(records, null, 2), "utf8");
};

const upsertLocalHistory = (record: AnalysisHistoryRecord) => {
  const records = readLocalHistory();
  const index = records.findIndex((item) => item.repoUrl === record.repoUrl && item.userId === record.userId);

  if (index >= 0) {
    records[index] = record;
  } else {
    records.unshift(record);
  }

  writeLocalHistory(records);
};

export const getCachedGraph = async (repoUrl: string): Promise<RepoGraph | null> => {
  try {
    const record = await prisma.repoAnalysis.findUnique({
      where: { repoUrl },
    });

    if (!record) {
      return null;
    }

    if (record.edgeCount === 0 && record.nodeCount > 1) {
      return null;
    }

    const graph = record.graphJson as unknown as RepoGraph;
    if (getCachedGraphVersion(graph) !== ANALYSIS_CACHE_VERSION) {
      return null;
    }

    return graph;
  } catch {
    const localRecord = readLocalHistory().find((item) => item.repoUrl === repoUrl);
    if (!localRecord) {
      return null;
    }

    if (localRecord.edgeCount === 0 && localRecord.nodeCount > 1) {
      return null;
    }

    if (getCachedGraphVersion(localRecord.graphJson) !== ANALYSIS_CACHE_VERSION) {
      return null;
    }

    return localRecord.graphJson;
  }
};

export const saveAnalysis = async (
  repoUrl: string,
  graph: RepoGraph,
  commitSha?: string | null,
  userId: string | null = null
) => {
  const graphWithMeta = {
    ...graph,
    meta: { cacheVersion: ANALYSIS_CACHE_VERSION },
  };

  const payload = {
    repoUrl,
    commitSha: commitSha ?? null,
    graphJson: graphWithMeta as unknown as Prisma.InputJsonValue,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
  };

  try {
    const result = await prisma.repoAnalysis.upsert({
      where: { repoUrl },
      create: payload,
      update: payload,
    });

    upsertLocalHistory({
      id: result.id,
      userId,
      repoUrl: result.repoUrl,
      commitSha: result.commitSha,
      nodeCount: result.nodeCount,
      edgeCount: result.edgeCount,
      graphJson: graphWithMeta as unknown as RepoGraph,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    });

    return result;
  } catch {
    const existing = readLocalHistory().find((item) => item.repoUrl === repoUrl && item.userId === userId);
    const now = new Date().toISOString();
    const localRecord: AnalysisHistoryRecord = {
      id: existing?.id ?? `local-${Buffer.from(repoUrl).toString("base64url")}`,
      userId,
      repoUrl,
      commitSha: commitSha ?? null,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      graphJson: graphWithMeta as unknown as RepoGraph,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    upsertLocalHistory(localRecord);
    return localRecord;
  }
};

export const listAnalysisHistory = async (limit?: number, userId?: string | null): Promise<AnalysisHistoryRecord[]> => {
  if (userId) {
    const records = readLocalHistory()
      .filter((record) => record.userId === userId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return typeof limit === "number" && limit > 0 ? records.slice(0, limit) : records;
  }

  try {
    const records = typeof limit === "number" && limit > 0
      ? await prisma.repoAnalysis.findMany({
          orderBy: { updatedAt: "desc" },
          take: limit,
        })
      : await prisma.repoAnalysis.findMany({
          orderBy: { updatedAt: "desc" },
        });

    return records.map((record) => ({
      id: record.id,
      userId: null,
      repoUrl: record.repoUrl,
      commitSha: record.commitSha,
      nodeCount: record.nodeCount,
      edgeCount: record.edgeCount,
      graphJson: record.graphJson as unknown as RepoGraph,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }));
  } catch {
    const records = readLocalHistory()
      .filter((record) => (userId ? record.userId === userId : true))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return typeof limit === "number" && limit > 0 ? records.slice(0, limit) : records;
  }
};

export const getAnalysisHistoryById = async (id: string, userId?: string | null): Promise<AnalysisHistoryRecord | null> => {
  if (userId) {
    return readLocalHistory().find((item) => item.id === id && item.userId === userId) ?? null;
  }

  try {
    const record = await prisma.repoAnalysis.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      userId: null,
      repoUrl: record.repoUrl,
      commitSha: record.commitSha,
      nodeCount: record.nodeCount,
      edgeCount: record.edgeCount,
      graphJson: record.graphJson as unknown as RepoGraph,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  } catch {
    return readLocalHistory().find((item) => item.id === id && (!userId || item.userId === userId)) ?? null;
  }
};

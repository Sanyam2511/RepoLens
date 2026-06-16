import { Prisma, PrismaClient } from "@prisma/client";
import { AnalysisHistoryRecord, RepoGraph } from "shared";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const LOCAL_HISTORY_PATH = path.join(
  process.env.REPOLENS_TEMP_DIR || path.join(process.cwd(), "temp"),
  "analysis-history.json"
);

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

const appendLocalHistory = (record: AnalysisHistoryRecord) => {
  const records = readLocalHistory();
  // Instead of updating the existing one for the same repo, we simply prepend it so it acts as an append-only log.
  records.unshift(record);
  writeLocalHistory(records);
};

export const saveAnalysis = async (
  repoUrl: string,
  graph: RepoGraph,
  commitSha?: string | null,
  userId: string | null = null
) => {
  const payload = {
    repoUrl,
    commitSha: commitSha ?? null,
    graphJson: graph as unknown as Prisma.InputJsonValue,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
  };

  try {
    const result = await prisma.repoAnalysis.create({
      data: payload,
    });

    appendLocalHistory({
      id: result.id,
      userId,
      repoUrl: result.repoUrl,
      commitSha: result.commitSha,
      nodeCount: result.nodeCount,
      edgeCount: result.edgeCount,
      graphJson: graph as unknown as RepoGraph,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    });

    return result;
  } catch {
    const now = new Date().toISOString();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const localRecord: AnalysisHistoryRecord = {
      id: `local-${Buffer.from(repoUrl).toString("base64url").substring(0, 20)}-${randomSuffix}`,
      userId,
      repoUrl,
      commitSha: commitSha ?? null,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      graphJson: graph as unknown as RepoGraph,
      createdAt: now,
      updatedAt: now,
    };

    appendLocalHistory(localRecord);
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

export const deleteAnalysisHistoryById = async (id: string, userId?: string | null): Promise<boolean> => {
  // Try deleting from local storage first if it exists there
  let deletedLocally = false;
  const records = readLocalHistory();
  const index = records.findIndex((item) => item.id === id);
  if (index >= 0) {
    records.splice(index, 1);
    writeLocalHistory(records);
    deletedLocally = true;
  }

  // Also try to delete from global prisma db
  try {
    await prisma.repoAnalysis.delete({
      where: { id },
    });
    return true;
  } catch (err) {
    return deletedLocally;
  }
};

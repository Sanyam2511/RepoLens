import { Prisma, PrismaClient } from "@prisma/client";
import { AnalysisHistoryRecord, RepoGraph } from "shared";

export const prisma = new PrismaClient();

export const saveAnalysis = async (
  repoUrl: string,
  graph: RepoGraph,
  commitSha?: string | null,
  userId: string | null = null
) => {
  const result = await prisma.repoAnalysis.create({
    data: {
      repoUrl,
      commitSha: commitSha ?? null,
      graphJson: graph as unknown as Prisma.InputJsonValue,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      userId: userId ?? null,
    },
  });

  return result;
};

export const listAnalysisHistory = async (limit?: number, userId?: string | null): Promise<AnalysisHistoryRecord[]> => {
  const where = userId ? { userId } : {};

  const query: any = {
    where,
    orderBy: { updatedAt: "desc" },
  };
  if (typeof limit === "number" && limit > 0) {
    query.take = limit;
  }

  const records = await prisma.repoAnalysis.findMany(query);

  return records.map((record) => ({
    id: record.id,
    userId: record.userId,
    repoUrl: record.repoUrl,
    commitSha: record.commitSha,
    nodeCount: record.nodeCount,
    edgeCount: record.edgeCount,
    graphJson: record.graphJson as unknown as RepoGraph,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }));
};

export const getAnalysisHistoryById = async (id: string, userId?: string | null): Promise<AnalysisHistoryRecord | null> => {
  const where: any = { id };
  if (userId) {
    where.userId = userId;
  }

  const record = await prisma.repoAnalysis.findFirst({
    where,
  });

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    userId: record.userId,
    repoUrl: record.repoUrl,
    commitSha: record.commitSha,
    nodeCount: record.nodeCount,
    edgeCount: record.edgeCount,
    graphJson: record.graphJson as unknown as RepoGraph,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};

export const deleteAnalysisHistoryById = async (id: string, userId?: string | null): Promise<boolean> => {
  const where: any = { id };
  if (userId) {
    where.userId = userId;
  }

  const record = await prisma.repoAnalysis.findFirst({
    where,
  });

  if (!record) {
    return false;
  }

  await prisma.repoAnalysis.delete({
    where: { id },
  });

  return true;
};

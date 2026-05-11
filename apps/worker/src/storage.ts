import { Prisma, PrismaClient } from "@prisma/client";
import { RepoGraph } from "shared";

const prisma = new PrismaClient();

export const getCachedGraph = async (repoUrl: string): Promise<RepoGraph | null> => {
  const record = await prisma.repoAnalysis.findUnique({
    where: { repoUrl },
  });

  if (!record) {
    return null;
  }

  return record.graphJson as RepoGraph;
};

export const saveAnalysis = async (
  repoUrl: string,
  graph: RepoGraph,
  commitSha?: string | null
) => {
  const payload = {
    repoUrl,
    commitSha: commitSha ?? null,
    graphJson: graph as Prisma.InputJsonValue,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
  };

  return prisma.repoAnalysis.upsert({
    where: { repoUrl },
    create: payload,
    update: payload,
  });
};

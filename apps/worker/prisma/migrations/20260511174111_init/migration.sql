-- CreateTable
CREATE TABLE "RepoAnalysis" (
    "id" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "commitSha" TEXT,
    "graphJson" JSONB NOT NULL,
    "nodeCount" INTEGER NOT NULL,
    "edgeCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepoAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepoAnalysis_repoUrl_key" ON "RepoAnalysis"("repoUrl");

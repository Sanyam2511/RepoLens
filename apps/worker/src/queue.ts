import { Queue, Worker } from 'bullmq';
import { downloadRepo, getRepoCommitSha } from './downloader.js';
import { analyzeRepo, type AnalysisProgress } from './analyzer.js';
import { saveAnalysis } from './storage.js';
import fs from 'node:fs';

const queueEnabled = process.env.REPOLENS_USE_QUEUE === 'true';

type AnalysisJobData = {
    repoUrl: string;
    userId?: string | null;
};

const disabledQueue = {
    add: async () => {
        throw new Error('Queue disabled');
    },
    getJob: async () => null,
};

export const analysisQueue = queueEnabled
    ? new Queue<AnalysisJobData>('analysis-queue', {
        connection: { host: 'localhost', port: 6379 }
    })
    : (disabledQueue as unknown as Queue<AnalysisJobData>);

const ANALYSIS_LOCK_DURATION_MS = 20 * 60 * 1000;
const ANALYSIS_STALLED_INTERVAL_MS = 60 * 1000;

if (queueEnabled) {
    const worker = new Worker<AnalysisJobData>('analysis-queue', async (job) => {
        const { repoUrl, userId } = job.data;
        console.log(`\n[Job ${job.id}] ⏳ Starting analysis for: ${repoUrl}`);

        let localPath = '';
        const reportProgress = (update: AnalysisProgress) => {
            void job.updateProgress(update);
        };

        try {
            reportProgress({ phase: "queued", percent: 1, detail: "Queued for analysis" });
            reportProgress({ phase: "cloning", percent: 2, detail: "Cloning repository" });
            localPath = downloadRepo(repoUrl);
            reportProgress({ phase: "indexing", percent: 5, detail: "Starting analysis" });
            const result = await analyzeRepo(localPath, reportProgress);
            const commitSha = getRepoCommitSha(localPath);

            try {
                await saveAnalysis(repoUrl, result, commitSha, userId ?? null);
            } catch (error) {
                console.error(`[Job ${job.id}] ⚠️ Failed to persist analysis:`, error);
            }

            console.log(`[Job ${job.id}] ✅ Finished! Found ${result.nodes.length} nodes and ${result.edges.length} edges.`);
            return result;
        } catch (error) {
            console.error(`[Job ${job.id}] ❌ Failed during analysis:`, error);
            throw error;
        } finally {
            if (localPath) {
                fs.rmSync(localPath, { recursive: true, force: true });
            }
        }
    }, {
        connection: { host: 'localhost', port: 6379 },
        // Long-running analyses can block the event loop; extend the lock to avoid false stalls.
        lockDuration: ANALYSIS_LOCK_DURATION_MS,
        stalledInterval: ANALYSIS_STALLED_INTERVAL_MS,
        maxStalledCount: 2
    });

    worker.on('failed', (job, err) => {
        console.error(`[Job ${job?.id}] ❌ Failed:`, err.message);
    });
}
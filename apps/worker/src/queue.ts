import { Queue, Worker } from 'bullmq';
import { downloadRepo, getRepoCommitSha } from './downloader.js';
import { analyzeRepo } from './analyzer.js';
import { saveAnalysis } from './storage.js';
import fs from 'node:fs';

export const analysisQueue = new Queue('analysis-queue', {
    connection: { host: 'localhost', port: 6379 }
});

const worker = new Worker('analysis-queue', async (job) => {
    const { repoUrl } = job.data;
    console.log(`\n[Job ${job.id}] ⏳ Starting analysis for: ${repoUrl}`);

    let localPath = '';

    try {
        localPath = downloadRepo(repoUrl);
        const result = analyzeRepo(localPath);
        const commitSha = getRepoCommitSha(localPath);

        try {
            await saveAnalysis(repoUrl, result, commitSha);
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
    connection: { host: 'localhost', port: 6379 }
});

worker.on('failed', (job, err) => {
    console.error(`[Job ${job?.id}] ❌ Failed:`, err.message);
});
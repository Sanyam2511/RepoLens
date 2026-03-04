import { Queue, Worker } from 'bullmq';
import { downloadRepo } from './downloader.js';
import { analyzeRepo } from './analyzer.js';
import fs from 'node:fs';

export const analysisQueue = new Queue('analysis-queue', {
    connection: { host: 'localhost', port: 6379 }
});

const worker = new Worker('analysis-queue', async (job) => {
    const { repoUrl } = job.data;
    console.log(`\n[Job ${job.id}] ⏳ Starting analysis for: ${repoUrl}`);
    const localPath = downloadRepo(repoUrl);
    const result = analyzeRepo(localPath);
    fs.rmSync(localPath, { recursive: true, force: true });
    
    console.log(`[Job ${job.id}] ✅ Finished! Found ${result.nodes.length} nodes and ${result.edges.length} edges.`);
    return result; 
}, {
    connection: { host: 'localhost', port: 6379 }
});

worker.on('failed', (job, err) => {
    console.error(`[Job ${job?.id}] ❌ Failed:`, err.message);
});
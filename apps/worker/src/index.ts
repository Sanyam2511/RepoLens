import express from 'express';
import { analysisQueue } from './queue.js';

const app = express();
app.use(express.json());

app.post('/analyze', async (req, res) => {
    const { repoUrl } = req.body;
    
    if (!repoUrl) {
        res.status(400).json({ error: "repoUrl is required" });
        return;
    }

    const job = await analysisQueue.add('analyze-repo', { repoUrl });
    
    res.json({ 
        message: "Analysis queued successfully", 
        jobId: job.id 
    });
});

app.get('/status/:jobId', async (req, res) => {
    const job = await analysisQueue.getJob(req.params.jobId);
    
    if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
    }

    const state = await job.getState();
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    res.json({ state, result, failedReason });
});

app.listen(4000, () => {
    console.log("🚀 RepoLens Highway active on http://localhost:4000");
});
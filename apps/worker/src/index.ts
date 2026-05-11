import "dotenv/config";
import express from 'express';
import { analysisQueue } from './queue.js';
import { getCachedGraph } from './storage.js';

const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]);

const normalizeGithubRepoUrl = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const scpMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/i);
    if (scpMatch) {
        return `https://github.com/${scpMatch[1]}/${scpMatch[2]}`;
    }

    try {
        const url = new URL(trimmed);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
        const host = url.hostname.toLowerCase();
        if (host !== 'github.com' && host !== 'www.github.com') return null;

        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length < 2) return null;

        const owner = parts[0];
        const repoPart = parts[1];
        if (!owner || !repoPart) return null;

        const repo = repoPart.replace(/\.git$/i, '');
        if (!repo) return null;

        return `https://github.com/${owner}/${repo}`;
    } catch {
        return null;
    }
};

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.has(origin)) {
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Vary', 'Origin');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }

    next();
});

app.use(express.json({ limit: '1mb' }));

app.post('/analyze', async (req, res) => {
    const { repoUrl } = req.body;

    if (typeof repoUrl !== 'string') {
        res.status(400).json({ error: 'repoUrl is required' });
        return;
    }

    const normalizedRepoUrl = normalizeGithubRepoUrl(repoUrl);
    if (!normalizedRepoUrl) {
        res.status(400).json({ error: 'repoUrl must be a valid GitHub repository URL' });
        return;
    }

    try {
        const cachedGraph = await getCachedGraph(normalizedRepoUrl);
        if (cachedGraph) {
            res.json({
                cached: true,
                result: cachedGraph
            });
            return;
        }

        const job = await analysisQueue.add('analyze-repo', { repoUrl: normalizedRepoUrl });

        res.json({
            message: 'Analysis queued successfully',
            jobId: job.id
        });
    } catch (error) {
        console.error('Failed to queue analysis job:', error);
        res.status(500).json({ error: 'Failed to queue analysis job' });
    }
});

app.get('/status/:jobId', async (req, res) => {
    try {
        const job = await analysisQueue.getJob(req.params.jobId);

        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        const state = await job.getState();
        const result = job.returnvalue;
        const failedReason = job.failedReason;

        res.json({ state, result, failedReason });
    } catch (error) {
        console.error('Failed to fetch job status:', error);
        res.status(500).json({ error: 'Failed to fetch job status' });
    }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(4000, () => {
    console.log("🚀 RepoLens Highway active on http://localhost:4000");
});
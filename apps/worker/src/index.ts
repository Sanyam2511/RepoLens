import "dotenv/config";
import express from 'express';
import fs from 'node:fs';
import { analyzeRepo } from './analyzer.js';
import { downloadRepo, getRepoCommitSha } from './downloader.js';
import { analysisQueue } from './queue.js';
import { createUser, getUserFromToken, loginUser, revokeToken } from './authStore.js';
import { getAnalysisHistoryById, getCachedGraph, listAnalysisHistory, saveAnalysis } from './storage.js';

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
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }

    next();
});

app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
        res.type('html').send(`
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>RepoLens</title>
                    <style>
                        :root {
                            color-scheme: light;
                            --bg: #f7f5f0;
                            --panel: rgba(255, 255, 255, 0.86);
                            --border: rgba(148, 163, 184, 0.28);
                            --text: #0f172a;
                            --muted: #64748b;
                            --accent: #0f172a;
                            --shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
                        }
                        * { box-sizing: border-box; }
                        body {
                            margin: 0;
                            min-height: 100vh;
                            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                            background:
                                radial-gradient(circle at 18% 12%, rgba(254, 243, 199, 0.9), transparent 50%),
                                radial-gradient(circle at 82% 12%, rgba(219, 234, 254, 0.75), transparent 46%),
                                radial-gradient(circle at 20% 88%, rgba(224, 231, 255, 0.66), transparent 52%),
                                var(--bg);
                            color: var(--text);
                            display: grid;
                            place-items: center;
                            padding: 24px;
                        }
                        .shell {
                            width: min(980px, 100%);
                            background: var(--panel);
                            border: 1px solid var(--border);
                            border-radius: 28px;
                            box-shadow: var(--shadow);
                            backdrop-filter: blur(18px);
                            padding: 28px;
                        }
                        .eyebrow {
                            display: inline-flex;
                            align-items: center;
                            gap: 10px;
                            border-radius: 999px;
                            padding: 8px 14px;
                            border: 1px solid rgba(251, 191, 36, 0.35);
                            background: rgba(255, 251, 235, 0.92);
                            color: #92400e;
                            font-size: 12px;
                            font-weight: 700;
                            letter-spacing: 0.16em;
                            text-transform: uppercase;
                        }
                        h1 { margin: 18px 0 10px; font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1.05; }
                        p { color: var(--muted); line-height: 1.7; margin: 0; }
                        .grid { display: grid; gap: 14px; margin-top: 24px; }
                        @media (min-width: 860px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
                        .card {
                            border: 1px solid rgba(148, 163, 184, 0.22);
                            background: rgba(248, 250, 252, 0.92);
                            border-radius: 22px;
                            padding: 18px;
                        }
                        .card strong { display: block; margin-bottom: 6px; }
                        .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 26px; }
                        a {
                            text-decoration: none;
                            border-radius: 999px;
                            padding: 12px 18px;
                            font-weight: 700;
                            font-size: 14px;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 10px;
                        }
                        .primary { background: var(--accent); color: white; }
                        .secondary { background: white; color: #334155; border: 1px solid rgba(148, 163, 184, 0.32); }
                        .footer { margin-top: 22px; font-size: 13px; color: var(--muted); }
                    </style>
                </head>
                <body>
                    <main class="shell">
                        <div class="eyebrow">RepoLens API</div>
                        <h1>Repository analysis is running here.</h1>
                        <p>
                            This server handles authentication, history, and repository analysis jobs.
                            The interactive web UI lives on the Next.js app, usually at <strong>http://localhost:3000</strong>.
                        </p>

                        <div class="grid">
                            <section class="card">
                                <strong>Analyze repositories</strong>
                                <p>Submit a GitHub repo URL and get an interactive dependency graph.</p>
                            </section>
                            <section class="card">
                                <strong>Login and history</strong>
                                <p>Sign in to store and revisit your past searches under your account.</p>
                            </section>
                            <section class="card">
                                <strong>API status</strong>
                                <p>Use the JSON endpoints under /auth, /analyze, /status, and /history.</p>
                            </section>
                        </div>

                        <div class="actions">
                            <a class="primary" href="http://localhost:3000">Open web UI</a>
                            <a class="secondary" href="/history">View history API</a>
                            <a class="secondary" href="/auth/login">Login API</a>
                        </div>

                        <div class="footer">
                            If the web UI is not running, start it with <strong>npm run dev -w web</strong>.
                        </div>
                    </main>
                </body>
            </html>
        `);
});

const getBearerToken = (req: express.Request) => {
    const header = req.headers.authorization;
    if (!header) return null;

    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1] ?? null;
};

const getCurrentUser = (req: express.Request) => getUserFromToken(getBearerToken(req));

app.post('/auth/signup', (req, res) => {
    const { name, email, password } = req.body ?? {};

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'name, email, and password are required' });
        return;
    }

    if (name.trim().length < 2) {
        res.status(400).json({ error: 'name must be at least 2 characters' });
        return;
    }

    if (password.length < 8) {
        res.status(400).json({ error: 'password must be at least 8 characters' });
        return;
    }

    try {
        const session = createUser(name, email, password);
        res.status(201).json(session);
    } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create account' });
    }
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'email and password are required' });
        return;
    }

    try {
        const session = loginUser(email, password);
        res.json(session);
    } catch (error) {
        res.status(401).json({ error: error instanceof Error ? error.message : 'Invalid credentials' });
    }
});

app.get('/auth/me', (req, res) => {
    const user = getCurrentUser(req);

    if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    res.json({ user });
});

app.post('/auth/logout', (req, res) => {
    revokeToken(getBearerToken(req));
    res.json({ success: true });
});

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

    const currentUser = getCurrentUser(req);

    try {
        const cachedGraph = await getCachedGraph(normalizedRepoUrl);
        if (cachedGraph) {
            if (currentUser) {
                try {
                    await saveAnalysis(normalizedRepoUrl, cachedGraph, null, currentUser.id);
                } catch (cacheSaveError) {
                    console.warn('Failed to record cached analysis for user history:', cacheSaveError);
                }
            }

            res.json({
                cached: true,
                result: cachedGraph
            });
            return;
        }

        try {
            const job = await analysisQueue.add('analyze-repo', { repoUrl: normalizedRepoUrl, userId: currentUser?.id ?? null });

            res.json({
                message: 'Analysis queued successfully',
                jobId: job.id
            });
            return;
        } catch (queueError) {
            console.warn('Queue unavailable, falling back to inline analysis:', queueError);

            const localPath = downloadRepo(normalizedRepoUrl);
            try {
                const result = await analyzeRepo(localPath);
                const commitSha = getRepoCommitSha(localPath);
                await saveAnalysis(normalizedRepoUrl, result, commitSha, currentUser?.id ?? null);

                res.json({
                    cached: false,
                    result,
                    fallback: true
                });
                return;
            } finally {
                if (localPath && fs.existsSync(localPath)) {
                    fs.rmSync(localPath, { recursive: true, force: true });
                }
            }
        }
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
        const progress = job.progress;

        res.json({ state, result, failedReason, progress });
    } catch (error) {
        console.error('Failed to fetch job status:', error);
        res.status(500).json({ error: 'Failed to fetch job status' });
    }
});

app.get('/history', async (_req, res) => {
    try {
        const user = getCurrentUser(_req);

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const history = await listAnalysisHistory(undefined, user.id);
        res.json({ history });
    } catch (error) {
        console.error('Failed to fetch history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.get('/history/:id', async (req, res) => {
    try {
        const user = getCurrentUser(req);

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const analysis = await getAnalysisHistoryById(req.params.id, user.id);

        if (!analysis) {
            res.status(404).json({ error: 'Analysis not found' });
            return;
        }

        res.json({ analysis });
    } catch (error) {
        console.error('Failed to fetch analysis history item:', error);
        res.status(500).json({ error: 'Failed to fetch analysis history item' });
    }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(4000, () => {
    console.log("🚀 RepoLens Highway active on http://localhost:4000");
});
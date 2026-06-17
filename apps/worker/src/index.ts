import "dotenv/config";
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import { analyzeRepo } from './analyzer.js';
import { downloadRepo, getRepoCommitSha } from './downloader.js';
import { analysisQueue } from './queue.js';
import { createUser, getUserFromToken, loginUser, revokeToken, loginWithGithub, getStoredUserByAuthToken } from './authStore.js';
import {
    deleteAnalysisHistoryById,
    getAnalysisHistoryById,
    listAnalysisHistory,
    saveAnalysis
} from './storage.js';

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

        return `https://github.com/${owner.toLowerCase()}/${repo.toLowerCase()}`;
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
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
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

app.get('/auth/github', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
        res.status(500).json({ error: 'GitHub OAuth is not configured' });
        return;
    }
    const redirectUri = 'http://localhost:4000/auth/github/callback';
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user,user:email`;
    res.redirect(githubUrl);
});

app.get('/auth/github/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
        res.status(400).send('No code provided');
        return;
    }

    try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            }),
        });
        const tokenData = await tokenRes.json();
        
        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }

        const accessToken = tokenData.access_token;
        const userRes = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const profile = await userRes.json();

        const emailRes = await fetch('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const emails = await emailRes.json();
        const primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email;
        if (primaryEmail) profile.email = primaryEmail;

        const session = loginWithGithub(profile, accessToken);
        
        // Redirect back to frontend with the token
        const frontendUrl = 'http://localhost:3000/auth/callback';
        const redirectUrl = new URL(frontendUrl);
        redirectUrl.searchParams.set('token', session.token);
        redirectUrl.searchParams.set('user', JSON.stringify(session.user));
        
        res.redirect(redirectUrl.toString());
    } catch (error) {
        console.error('GitHub OAuth error:', error);
        res.redirect('http://localhost:3000/login?error=github_oauth_failed');
    }
});

app.get('/github/repos', async (req, res) => {
    const rawUser = getStoredUserByAuthToken(getBearerToken(req));
    if (!rawUser) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    if (!rawUser.githubAccessToken) {
        res.status(400).json({ error: 'Not authenticated with GitHub' });
        return;
    }

    try {
        const repoRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
            headers: {
                Authorization: `Bearer ${rawUser.githubAccessToken}`,
            },
        });

        if (!repoRes.ok) {
            throw new Error(`GitHub API error: ${repoRes.statusText}`);
        }

        const repos = await repoRes.json();
        res.json({ repos });
    } catch (error) {
        console.error('Failed to fetch GitHub repos:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub repositories' });
    }
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
    } catch (error: any) {
        if (error.message === 'Could not clone repository.') {
            console.error('Failed to clone repository:', normalizedRepoUrl);
            res.status(400).json({ error: 'Repository not found or is private' });
        } else {
            console.error('Failed to queue or process analysis job:', error);
            res.status(500).json({ error: 'Failed to queue analysis job' });
        }
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

app.delete('/history/:id', async (req, res) => {
    try {
        const user = getCurrentUser(req);

        if (!user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const success = await deleteAnalysisHistoryById(req.params.id, user.id);

        if (!success) {
            res.status(404).json({ error: 'Analysis not found or could not be deleted' });
            return;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete analysis history item:', error);
        res.status(500).json({ error: 'Failed to delete analysis history item' });
    }
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

app.post('/api/chat', async (req, res) => {
    try {
        const user = getCurrentUser(req);
        
        const { repoUrl, messages } = req.body;
        if (!repoUrl || !Array.isArray(messages)) {
            res.status(400).json({ error: 'Missing repoUrl or invalid messages' });
            return;
        }

        const historyList = await listAnalysisHistory(100, user?.id);
        const analysis = historyList.find(a => a.repoUrl.toLowerCase() === repoUrl.toLowerCase());
        
        if (!analysis) {
            res.status(404).json({ error: 'Analysis not found or access denied' });
            return;
        }

        const { graphJson } = analysis;
        
        const deps = new Map<string, string[]>();
        graphJson.edges.forEach(e => {
            if (!deps.has(e.source)) deps.set(e.source, []);
            deps.get(e.source)!.push(e.target);
        });

        const conciseMap = graphJson.nodes.map(n => {
            const prefix = n.type === 'folder' ? 'D:' : 'F:';
            const targetDeps = deps.get(n.id);
            const depStr = targetDeps?.length ? ` -> ${targetDeps.join(', ')}` : '';
            return `${prefix} ${n.id}${depStr}`;
        }).join('\n');

        const context = `You are RepoLens AI. Repo: ${analysis.repoUrl}
Architecture Map (D: Directory, F: File, -> indicates dependencies):
${conciseMap}
Be concise.`;

        const recentMessages = messages.slice(-6);

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: recentMessages,
            config: {
                systemInstruction: context,
            }
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of responseStream) {
            if (chunk.text) {
                res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
        }
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('Chat error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process chat' });
        } else {
            res.end();
        }
    }
});

app.post('/api/integrations/slack', async (req, res) => {
    try {
        const user = getCurrentUser(req);
        const { repoUrl, webhookUrl } = req.body;
        if (!repoUrl || !webhookUrl) return res.status(400).json({ error: 'Missing repoUrl or webhookUrl' });
        
        const historyList = await listAnalysisHistory(100, user?.id);
        const analysis = historyList.find(a => a.repoUrl.toLowerCase() === repoUrl.toLowerCase());
        if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
        
        const inDegree = new Map<string, number>();
        analysis.graphJson.edges.forEach(e => {
            inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
        });
        const hotspots = [...inDegree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        const hotspotsText = hotspots.map(([id, count]) => `- \`${id}\` (${count} inbound links)`).join('\n');
        
        const message = {
            text: `*RepoLens Scan Complete* for ${analysis.repoUrl}\n\n*Metrics:*\n📦 Nodes: ${analysis.nodeCount}\n🔗 Edges: ${analysis.edgeCount}\n\n*Top Structural Bottlenecks:*\n${hotspotsText}`
        };
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
        
        if (!response.ok) throw new Error('Slack API returned ' + response.status);
        res.json({ success: true });
    } catch (e) {
        console.error('Slack integration error:', e);
        res.status(500).json({ error: 'Failed to notify Slack' });
    }
});

app.post('/api/integrations/github-pr', async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });
        
        const storedUser = getStoredUserByAuthToken(getBearerToken(req));
        const token = storedUser?.githubAccessToken;
        if (!token) return res.status(400).json({ error: 'No GitHub token. Please login with GitHub.' });
        
        const { repoUrl, prNumber } = req.body;
        if (!repoUrl || !prNumber) return res.status(400).json({ error: 'Missing repoUrl or prNumber' });
        
        const urlParts = new URL(repoUrl).pathname.split('/').filter(Boolean);
        const owner = urlParts[0];
        const repo = urlParts[1];
        if (!owner || !repo) return res.status(400).json({ error: 'Invalid GitHub URL' });
        
        const historyList = await listAnalysisHistory(100, user.id);
        const analysis = historyList.find(a => a.repoUrl.toLowerCase() === repoUrl.toLowerCase());
        if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
        
        const inDegree = new Map<string, number>();
        analysis.graphJson.edges.forEach(e => {
            inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
        });
        const hotspots = [...inDegree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        const hotspotsText = hotspots.map(([id, count]) => `- \`${id}\` (${count} inbound links)`).join('\n');
        
        const body = `### 🔍 RepoLens Architecture Scan\n\n**Repo:** ${analysis.repoUrl}\n**Nodes:** ${analysis.nodeCount} | **Edges:** ${analysis.edgeCount}\n\n#### 🔴 Top Structural Bottlenecks\n${hotspotsText}\n\n> Sent via RepoLens Integrations`;
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'RepoLens'
            },
            body: JSON.stringify({ body })
        });
        
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`GitHub API Error ${response.status}: ${errBody}`);
        }
        res.json({ success: true });
    } catch (e) {
        console.error('GitHub PR integration error:', e);
        res.status(500).json({ error: 'Failed to notify GitHub PR: ' + (e instanceof Error ? e.message : 'Unknown error') });
    }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(4000, () => {
    console.log("🚀 RepoLens Highway active on http://localhost:4000");
});
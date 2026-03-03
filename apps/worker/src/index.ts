import express from 'express';
import { analyzeRepo } from './analyzer.js';
import { downloadRepo } from './downloader.js';
import fs from 'node:fs';

const app = express();
app.use(express.json());

app.post('/analyze', async (req, res) => {
    const { repoUrl } = req.body; 

    if (!repoUrl) {
        return res.status(400).json({ error: "Please provide a repoUrl" });
    }

    try {
        const localPath = downloadRepo(repoUrl);
        const data = analyzeRepo(localPath);

        res.json({ 
            success: true, 
            repository: repoUrl,
            stats: {
                nodes: data.nodes.length,
                edges: data.edges.length
            },
            data 
        });
    } catch (error) {
        res.status(500).json({ error: "Analysis failed", details: String(error) });
    }
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`🚀 RepoLens Worker ready at http://localhost:${PORT}`);
});
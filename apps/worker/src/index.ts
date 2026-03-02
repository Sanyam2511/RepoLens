import express from 'express';
import { analyzeRepo } from './analyzer.js';
import path from 'path';

const app = express();
app.use(express.json());

app.post('/analyze', async (req, res) => {
    const { localPath } = req.body; 
    try {
        const data = analyzeRepo(localPath);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: "Analysis failed" });
    }
});

app.listen(4000, () => console.log("Worker running on port 4000"));
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const downloadRepo = (repoUrl: string): string => {
    const repoName = `repo-${Date.now()}`;
    const tempDir = path.resolve('temp');
    const targetPath = path.join(tempDir, repoName);

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log(`> Cloning: ${repoUrl}`);
    
    try {
        execSync(`git clone --depth 1 ${repoUrl} "${targetPath}"`, { stdio: 'inherit' });
        
        return targetPath;
    } catch (error) {
        console.error("Git clone failed:", error);
        throw new Error("Could not clone repository.");
    }
};

export const getRepoCommitSha = (repoPath: string): string | null => {
    try {
        const output = execFileSync('git', ['-C', repoPath, 'rev-parse', 'HEAD'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
        const sha = output.trim();
        return sha.length > 0 ? sha : null;
    } catch {
        return null;
    }
};
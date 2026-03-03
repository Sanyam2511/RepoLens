import { Project, SyntaxKind } from "ts-morph";
import path from "node:path";
import { RepoGraph, RepoNode, RepoEdge } from "shared";

export const analyzeRepo = (repoPath: string): RepoGraph => {
    const project = new Project();
    project.addSourceFilesAtPaths(path.join(repoPath, "**/*.{ts,js,tsx,jsx}"));

    const nodes: RepoNode[] = [];
    const edges: RepoEdge[] = [];

    project.getSourceFiles().forEach(sourceFile => {
        const filePath = sourceFile.getFilePath();
        const fileName = sourceFile.getBaseName();
        nodes.push({
            id: filePath,
            label: fileName,
            type: 'file'
        });

        sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
            const expression = call.getExpression().getText();
            
            if (expression.includes("fetch") || expression.includes("axios")) {
                const args = call.getArguments();
                const url = args[0]?.getText().replace(/['"`]/g, "") || "unknown-endpoint";
                
                const apiNodeId = `api-${url}`;
                
                if (!nodes.find(n => n.id === apiNodeId)) {
                    nodes.push({ id: apiNodeId, label: url, type: 'api-endpoint' });
                }
                
                edges.push({
                    source: filePath,
                    target: apiNodeId,
                    label: 'calls'
                });
            }
        });

        sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
            const name = id.getText();
            const dbTypes = ["Schema", "model", "PrismaClient"];
            
            if (dbTypes.includes(name)) {
                const dbNodeId = "database-layer";
                if (!nodes.find(n => n.id === dbNodeId)) {
                    nodes.push({ id: dbNodeId, label: "Database/Storage", type: 'storage' });
                }
                edges.push({
                    source: filePath,
                    target: dbNodeId,
                    label: 'persists'
                });
            }
        });
    });

    return { nodes, edges };
};
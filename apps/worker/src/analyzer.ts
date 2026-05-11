import { Project, SourceFile, SyntaxKind } from "ts-morph";
import path from "node:path";
import { RepoGraph, RepoNode, RepoEdge } from "shared";

const MAX_SNIPPET_LINES = 60;
const MAX_SNIPPET_CHARS = 4000;

const buildCodeSnippet = (sourceFile: SourceFile): string | undefined => {
    const text = sourceFile.getFullText().trim();
    if (!text) return undefined;

    const lines = text.split(/\r?\n/).slice(0, MAX_SNIPPET_LINES);
    let snippet = lines.join("\n");

    if (snippet.length > MAX_SNIPPET_CHARS) {
        snippet = `${snippet.slice(0, MAX_SNIPPET_CHARS)}\n...`;
    }

    return snippet;
};

const resolveRelativeSourceFile = (
    project: Project,
    fromFile: SourceFile,
    moduleSpecifier: string
): SourceFile | null => {
    if (!moduleSpecifier.startsWith(".")) return null;

    const fromDir = fromFile.getDirectoryPath();
    const resolvedBase = path.resolve(fromDir, moduleSpecifier);
    const extension = path.extname(resolvedBase);
    const candidates: string[] = [];

    if (extension) {
        candidates.push(resolvedBase);
    } else {
        const extensions = [".ts", ".tsx", ".js", ".jsx"];
        for (const ext of extensions) {
            candidates.push(`${resolvedBase}${ext}`);
        }
        for (const ext of extensions) {
            candidates.push(path.join(resolvedBase, `index${ext}`));
        }
    }

    for (const candidate of candidates) {
        const candidateFile = project.getSourceFile(candidate);
        if (candidateFile) return candidateFile;
    }

    return null;
};

export const analyzeRepo = (repoPath: string): RepoGraph => {
    const project = new Project();
    project.addSourceFilesAtPaths(path.join(repoPath, "**/*.{ts,js,tsx,jsx}"));

    const nodes: RepoNode[] = [];
    const edges: RepoEdge[] = [];
    const nodeIds = new Set<string>();
    const edgeKeys = new Set<string>();

    const addNode = (node: RepoNode) => {
        if (nodeIds.has(node.id)) return;
        nodeIds.add(node.id);
        nodes.push(node);
    };

    const addEdge = (edge: RepoEdge) => {
        const key = `${edge.source}|${edge.target}|${edge.label}`;
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push(edge);
    };

    const addFileNode = (sourceFile: SourceFile) => {
        const filePath = sourceFile.getFilePath();
        const snippet = buildCodeSnippet(sourceFile);
        const node: RepoNode = {
            id: filePath,
            label: sourceFile.getBaseName(),
            type: "file"
        };

        if (snippet !== undefined) {
            node.codeSnippet = snippet;
        }

        addNode(node);
    };

    const sourceFiles = project.getSourceFiles();
    sourceFiles.forEach(addFileNode);

    sourceFiles.forEach(sourceFile => {
        const filePath = sourceFile.getFilePath();

        sourceFile.getImportDeclarations().forEach(importDecl => {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();
            if (!moduleSpecifier.startsWith(".")) return;

            const targetSourceFile =
                importDecl.getModuleSpecifierSourceFile() ??
                resolveRelativeSourceFile(project, sourceFile, moduleSpecifier);

            if (!targetSourceFile) return;

            const targetPath = targetSourceFile.getFilePath();
            if (targetPath === filePath) return;

            addEdge({
                source: filePath,
                target: targetPath,
                label: "imports"
            });
        });

        sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
            const expression = call.getExpression();

            if (expression.getKind() === SyntaxKind.Identifier && expression.getText() === "require") {
                const args = call.getArguments();
                const firstArg = args[0];
                if (!firstArg || firstArg.getKind() !== SyntaxKind.StringLiteral) return;

                const moduleSpecifier = firstArg.getText().replace(/['"`]/g, "");
                if (!moduleSpecifier.startsWith(".")) return;

                const targetSourceFile = resolveRelativeSourceFile(project, sourceFile, moduleSpecifier);
                if (!targetSourceFile) return;

                const targetPath = targetSourceFile.getFilePath();
                if (targetPath === filePath) return;

                addEdge({
                    source: filePath,
                    target: targetPath,
                    label: "imports"
                });

                return;
            }

            const expressionText = expression.getText();

            if (expressionText.includes("fetch") || expressionText.includes("axios")) {
                const args = call.getArguments();
                const url = args[0]?.getText().replace(/['"`]/g, "") || "unknown-endpoint";

                const apiNodeId = `api-${url}`;

                addNode({ id: apiNodeId, label: url, type: "api-endpoint" });

                addEdge({
                    source: filePath,
                    target: apiNodeId,
                    label: "calls"
                });
            }
        });

        sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
            const name = id.getText();
            const dbTypes = ["Schema", "model", "PrismaClient"];

            if (dbTypes.includes(name)) {
                const dbNodeId = "database-layer";
                addNode({ id: dbNodeId, label: "Database/Storage", type: "storage" });
                addEdge({
                    source: filePath,
                    target: dbNodeId,
                    label: "persists"
                });
            }
        });
    });

    return { nodes, edges };
};
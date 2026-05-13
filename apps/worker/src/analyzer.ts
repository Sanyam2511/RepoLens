import { Project, SourceFile, SyntaxKind } from "ts-morph";
import fs from "node:fs";
import path from "node:path";
import { RepoGraph, RepoNode, RepoEdge } from "shared";

const MAX_SNIPPET_LINES = 60;
const MAX_SNIPPET_CHARS = 4000;
const MAX_SNIPPET_BYTES = 12000;
const MAX_PARSE_BYTES = 200000;

export type AnalysisProgress = {
    phase: string;
    percent?: number;
    current?: number;
    total?: number;
    detail?: string;
};

type ProgressReporter = (update: AnalysisProgress) => void;

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const computePercent = (start: number, end: number, current: number, total: number) => {
    if (total <= 0) return end;
    const ratio = Math.min(1, Math.max(0, current / total));
    return start + (end - start) * ratio;
};

const getProgressStep = (total: number, targetUpdates = 50) =>
    Math.max(1, Math.floor(total / targetUpdates));

const makeProgressReporter = (reporter?: ProgressReporter) => {
    let lastYield = 0;

    return async (update: AnalysisProgress) => {
        if (!reporter) return;
        const percent = typeof update.percent === "number" ? clampPercent(update.percent) : undefined;
        reporter({ ...update, percent });

        const now = Date.now();
        if (now - lastYield > 200) {
            lastYield = now;
            await yieldToEventLoop();
        }
    };
};

const IGNORED_DIRS = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "out",
    ".turbo",
    ".cache",
    "coverage",
    "tmp",
    "temp"
]);

const buildSnippetFromText = (text: string): string | undefined => {
    const trimmed = text.trim();
    if (!trimmed) return undefined;

    const lines = trimmed.split(/\r?\n/).slice(0, MAX_SNIPPET_LINES);
    let snippet = lines.join("\n");

    if (snippet.length > MAX_SNIPPET_CHARS) {
        snippet = `${snippet.slice(0, MAX_SNIPPET_CHARS)}\n...`;
    }

    return snippet;
};

const buildCodeSnippet = (sourceFile: SourceFile): string | undefined => {
    const text = sourceFile.getFullText();
    return buildSnippetFromText(text);
};

const readFileSnippet = (filePath: string): string | undefined => {
    try {
        const fd = fs.openSync(filePath, "r");
        const buffer = Buffer.alloc(MAX_SNIPPET_BYTES);
        const bytesRead = fs.readSync(fd, buffer, 0, MAX_SNIPPET_BYTES, 0);
        fs.closeSync(fd);

        if (bytesRead <= 0) return undefined;

        const slice = buffer.subarray(0, bytesRead);
        if (slice.includes(0)) return undefined;

        return buildSnippetFromText(slice.toString("utf8"));
    } catch {
        return undefined;
    }
};

const readFileText = (filePath: string): string | null => {
    try {
        const fd = fs.openSync(filePath, "r");
        const buffer = Buffer.alloc(MAX_PARSE_BYTES);
        const bytesRead = fs.readSync(fd, buffer, 0, MAX_PARSE_BYTES, 0);
        fs.closeSync(fd);

        if (bytesRead <= 0) return null;

        const slice = buffer.subarray(0, bytesRead);
        if (slice.includes(0)) return null;

        return slice.toString("utf8");
    } catch {
        return null;
    }
};

const isIgnoredPath = (filePath: string) =>
    filePath.split(path.sep).some((segment) => IGNORED_DIRS.has(segment));

const walkFiles = (rootDir: string, collected: string[] = []): string[] => {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
            continue;
        }

        const fullPath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
            walkFiles(fullPath, collected);
            continue;
        }

        if (entry.isFile()) {
            collected.push(fullPath);
        }
    }

    return collected;
};

type DependencyRef = {
    value: string;
    label: "imports" | "includes" | "requires" | "sources" | "uses";
    kind:
        | "relative"
        | "python"
        | "go"
        | "rust-mod"
        | "rust-use"
        | "java"
        | "kotlin"
        | "csharp"
        | "dart"
        | "lua"
        | "ruby"
        | "php"
        | "swift"
        | "c-include"
        | "shell";
};

type ExtensionKind =
    | "python"
    | "go"
    | "rust"
    | "java"
    | "kotlin"
    | "csharp"
    | "c"
    | "ruby"
    | "php"
    | "dart"
    | "lua"
    | "swift"
    | "shell";

const EXTENSIONS_BY_KIND: Record<ExtensionKind, string[]> = {
    python: [".py"],
    go: [".go"],
    rust: [".rs"],
    java: [".java"],
    kotlin: [".kt", ".kts"],
    csharp: [".cs"],
    c: [".c", ".h", ".cpp", ".hpp", ".cc", ".hh", ".m", ".mm"],
    ruby: [".rb"],
    php: [".php"],
    dart: [".dart"],
    lua: [".lua"],
    swift: [".swift"],
    shell: [".sh", ".bash", ".zsh"],
};

const ALL_EXTENSIONS = Array.from(
    new Set(Object.values(EXTENSIONS_BY_KIND).flat())
);

const toPosixPath = (value: string) => value.split(path.sep).join("/");

const getRelativePath = (rootDir: string, filePath: string) =>
    toPosixPath(path.relative(rootDir, filePath));

const buildFileIndex = (rootDir: string, files: string[]) => {
    const fileSet = new Set<string>();
    const relativeMap = new Map<string, string>();
    const baseNameMap = new Map<string, string[]>();
    const goPackageMap = new Map<string, string>();

    files.forEach((filePath) => {
        const normalized = path.resolve(filePath);
        fileSet.add(normalized);

        const relative = getRelativePath(rootDir, normalized);
        relativeMap.set(relative, normalized);

        const baseName = path.parse(normalized).name;
        const list = baseNameMap.get(baseName) ?? [];
        list.push(normalized);
        baseNameMap.set(baseName, list);

        if (path.extname(normalized).toLowerCase() === ".go") {
            const relDir = toPosixPath(path.dirname(relative));
            if (!goPackageMap.has(relDir)) {
                goPackageMap.set(relDir, normalized);
            }
        }
    });

    return { fileSet, relativeMap, baseNameMap, goPackageMap };
};

const resolvePathCandidates = (
    basePath: string,
    extensions: string[],
    fileSet: Set<string>,
    indexNames: string[] = ["index"]
): string | null => {
    const normalized = path.resolve(basePath);
    if (path.extname(normalized)) {
        return fileSet.has(normalized) ? normalized : null;
    }

    for (const ext of extensions) {
        const candidate = `${normalized}${ext}`;
        if (fileSet.has(candidate)) return candidate;
    }

    for (const ext of extensions) {
        for (const indexName of indexNames) {
            const candidate = path.join(normalized, `${indexName}${ext}`);
            if (fileSet.has(candidate)) return candidate;
        }
    }

    return null;
};

const resolvePythonModule = (
    value: string,
    fromFilePath: string,
    repoPath: string,
    fileSet: Set<string>
): string | null => {
    let moduleValue = value.trim();
    if (!moduleValue) return null;

    const leadingDots = moduleValue.match(/^\.+/)?.[0].length ?? 0;
    moduleValue = moduleValue.slice(leadingDots);

    let baseDir = path.dirname(fromFilePath);
    for (let i = 1; i < leadingDots; i += 1) {
        baseDir = path.dirname(baseDir);
    }

    const modulePath = moduleValue ? moduleValue.replace(/\./g, path.sep) : "";
    const candidateBase = modulePath ? path.join(baseDir, modulePath) : baseDir;

    const resolvedRelative = resolvePathCandidates(
        candidateBase,
        EXTENSIONS_BY_KIND.python,
        fileSet,
        ["__init__", "index"]
    );
    if (resolvedRelative) return resolvedRelative;

    if (leadingDots === 0) {
        const repoBase = path.join(repoPath, modulePath);
        return resolvePathCandidates(repoBase, EXTENSIONS_BY_KIND.python, fileSet, ["__init__", "index"]);
    }

    return null;
};

const findRustCrateRoot = (filePath: string, repoPath: string) => {
    const parts = path.normalize(filePath).split(path.sep);
    const srcIndex = parts.lastIndexOf("src");
    if (srcIndex >= 0) {
        return parts.slice(0, srcIndex + 1).join(path.sep);
    }

    return repoPath;
};

const resolveRustMod = (value: string, fromFilePath: string, fileSet: Set<string>) => {
    const baseDir = path.dirname(fromFilePath);
    const basePath = path.join(baseDir, value);
    return resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.rust, fileSet, ["mod"]);
};

const resolveRustUse = (
    value: string,
    fromFilePath: string,
    repoPath: string,
    fileSet: Set<string>
): string | null => {
    let segments = value.split("::").filter(Boolean);
    if (segments.length === 0) return null;

    let baseDir = findRustCrateRoot(fromFilePath, repoPath);

    while (segments[0] === "super") {
        baseDir = path.dirname(baseDir);
        segments = segments.slice(1);
    }

    if (segments[0] === "self") {
        baseDir = path.dirname(fromFilePath);
        segments = segments.slice(1);
    }

    if (segments[0] === "crate") {
        segments = segments.slice(1);
    }

    for (let i = segments.length; i >= 1; i -= 1) {
        const basePath = path.join(baseDir, ...segments.slice(0, i));
        const resolved = resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.rust, fileSet, ["mod"]);
        if (resolved) return resolved;
    }

    return null;
};

const readGoModulePath = (repoPath: string): string | null => {
    try {
        const goModPath = path.join(repoPath, "go.mod");
        if (!fs.existsSync(goModPath)) return null;
        const content = fs.readFileSync(goModPath, "utf8");
        const match = content.match(/^module\s+(.+)$/m);
        const moduleValue = match?.[1];
        return moduleValue ? moduleValue.trim() : null;
    } catch {
        return null;
    }
};

const readDartPackageName = (repoPath: string): string | null => {
    try {
        const pubspecPath = path.join(repoPath, "pubspec.yaml");
        if (!fs.existsSync(pubspecPath)) return null;
        const content = fs.readFileSync(pubspecPath, "utf8");
        const match = content.match(/^name:\s*(.+)$/m);
        const nameValue = match?.[1];
        return nameValue ? nameValue.trim() : null;
    } catch {
        return null;
    }
};

const resolveDependency = (
    ref: DependencyRef,
    fromFilePath: string,
    repoPath: string,
    index: ReturnType<typeof buildFileIndex>,
    goModulePath: string | null,
    dartPackageName: string | null
): string | null => {
    const fromDir = path.dirname(fromFilePath);

    switch (ref.kind) {
        case "relative":
            {
                const basePath = ref.value.startsWith("/")
                    ? path.join(repoPath, ref.value)
                    : path.resolve(fromDir, ref.value);
                return (
                    resolvePathCandidates(basePath, ALL_EXTENSIONS, index.fileSet, ["index"]) ??
                    resolvePathCandidates(path.join(repoPath, ref.value), ALL_EXTENSIONS, index.fileSet, ["index"])
                );
            }
        case "c-include": {
            const basePath = ref.value.startsWith("/")
                ? path.join(repoPath, ref.value)
                : path.resolve(fromDir, ref.value);
            return (
                resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.c, index.fileSet, ["index"]) ??
                resolvePathCandidates(path.join(repoPath, ref.value), EXTENSIONS_BY_KIND.c, index.fileSet, ["index"])
            );
        }
        case "shell": {
            const basePath = ref.value.startsWith("/")
                ? path.join(repoPath, ref.value)
                : path.resolve(fromDir, ref.value);
            return (
                resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.shell, index.fileSet, ["index"]) ??
                resolvePathCandidates(path.join(repoPath, ref.value), EXTENSIONS_BY_KIND.shell, index.fileSet, ["index"])
            );
        }
        case "php": {
            const basePath = ref.value.startsWith("/")
                ? path.join(repoPath, ref.value)
                : path.resolve(fromDir, ref.value);
            return (
                resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.php, index.fileSet, ["index"]) ??
                resolvePathCandidates(path.join(repoPath, ref.value), EXTENSIONS_BY_KIND.php, index.fileSet, ["index"])
            );
        }
        case "ruby": {
            const basePath = ref.value.startsWith("/")
                ? path.join(repoPath, ref.value)
                : path.resolve(fromDir, ref.value);
            return (
                resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.ruby, index.fileSet, ["index"]) ??
                resolvePathCandidates(path.join(repoPath, ref.value), EXTENSIONS_BY_KIND.ruby, index.fileSet, ["index"])
            );
        }
        case "python":
            return resolvePythonModule(ref.value, fromFilePath, repoPath, index.fileSet);
        case "rust-mod":
            return resolveRustMod(ref.value, fromFilePath, index.fileSet);
        case "rust-use":
            return resolveRustUse(ref.value, fromFilePath, repoPath, index.fileSet);
        case "go": {
            if (!goModulePath) return null;
            if (!ref.value.startsWith(goModulePath)) return null;
            const relativeDir = ref.value.slice(goModulePath.length).replace(/^\//, "");
            const relKey = toPosixPath(relativeDir);
            return index.goPackageMap.get(relKey) ?? null;
        }
        case "dart": {
            if (ref.value.startsWith("package:")) {
                if (!dartPackageName) return null;
                const prefix = `package:${dartPackageName}/`;
                if (!ref.value.startsWith(prefix)) return null;
                const relPath = ref.value.slice(prefix.length);
                const basePath = path.join(repoPath, relPath);
                return resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.dart, index.fileSet);
            }
            const basePath = path.resolve(fromDir, ref.value);
            return resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.dart, index.fileSet);
        }
        case "lua": {
            const modulePath = ref.value.replace(/\./g, path.sep);
            const basePath = path.join(repoPath, modulePath);
            return resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.lua, index.fileSet, ["init"]);
        }
        case "java": {
            const modulePath = ref.value.replace(/\./g, path.sep);
            const basePath = path.join(repoPath, modulePath);
            return resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.java, index.fileSet);
        }
        case "kotlin": {
            const modulePath = ref.value.replace(/\./g, path.sep);
            const basePath = path.join(repoPath, modulePath);
            return resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.kotlin, index.fileSet);
        }
        case "csharp": {
            const modulePath = ref.value.replace(/\./g, path.sep);
            const basePath = path.join(repoPath, modulePath);
            return resolvePathCandidates(basePath, EXTENSIONS_BY_KIND.csharp, index.fileSet);
        }
        case "swift": {
            const matches = index.baseNameMap.get(ref.value);
            if (!matches || matches.length !== 1) return null;
            const candidate = matches[0];
            if (!candidate) return null;
            return path.extname(candidate).toLowerCase() === ".swift" ? candidate : null;
        }
        default:
            return null;
    }
};

const parsePythonDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        const trimmed = (line.split("#")[0] ?? "").trim();
        if (!trimmed) return;

        const fromMatch = trimmed.match(/^\s*from\s+([.\w]+)\s+import\s+/);
        const fromValue = fromMatch?.[1];
        if (fromValue) {
            refs.push({ value: fromValue, kind: "python", label: "imports" });
            return;
        }

        const importMatch = trimmed.match(/^\s*import\s+([\w\s,\.]+)$/);
        const importValue = importMatch?.[1];
        if (importValue) {
            importValue
                .split(",")
                .map((part) => part.trim().split(/\s+as\s+/)[0] ?? "")
                .map((module) => module.trim())
                .filter((module) => module.length > 0)
                .forEach((module) => refs.push({ value: module, kind: "python", label: "imports" }));
        }
    });

    return refs;
};

const parseGoDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);
    let inBlock = false;

    lines.forEach((line) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("import (") || trimmed === "import(") {
            inBlock = true;
            return;
        }

        if (inBlock && trimmed.startsWith(")")) {
            inBlock = false;
            return;
        }

        if (trimmed.startsWith("import ") && !trimmed.includes("(")) {
            const match = trimmed.match(/"([^"]+)"/);
            const value = match?.[1];
            if (value) refs.push({ value, kind: "go", label: "imports" });
            return;
        }

        if (inBlock) {
            const match = trimmed.match(/"([^"]+)"/);
            const value = match?.[1];
            if (value) refs.push({ value, kind: "go", label: "imports" });
        }
    });

    return refs;
};

const parseRustDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        const trimmed = (line.split("//")[0] ?? "").trim();
        if (!trimmed) return;

        const modMatch = trimmed.match(/^\s*mod\s+([A-Za-z0-9_]+)\s*;/);
        const modValue = modMatch?.[1];
        if (modValue) {
            refs.push({ value: modValue, kind: "rust-mod", label: "imports" });
        }

        const useMatch = trimmed.match(/^\s*use\s+([A-Za-z0-9_:]+)\s*;/);
        const useValue = useMatch?.[1];
        if (useValue) {
            refs.push({ value: useValue, kind: "rust-use", label: "uses" });
        }
    });

    return refs;
};

const parseJavaLikeDeps = (text: string, kind: "java" | "kotlin"): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        const trimmed = (line.split("//")[0] ?? "").trim();
        if (!trimmed) return;

        const match = trimmed.match(/^\s*import\s+([A-Za-z0-9_.]+)\s*;?/);
        const value = match?.[1];
        if (value) {
            refs.push({ value, kind, label: "imports" });
        }
    });

    return refs;
};

const parseCSharpDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        const trimmed = (line.split("//")[0] ?? "").trim();
        if (!trimmed) return;

        const match = trimmed.match(/^\s*using\s+([A-Za-z0-9_.]+)\s*;/);
        const value = match?.[1];
        if (value) refs.push({ value, kind: "csharp", label: "uses" });
    });

    return refs;
};

const parseCIncludes = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        const match = line.match(/^\s*#include\s+"([^"]+)"/);
        const value = match?.[1];
        if (value) refs.push({ value, kind: "c-include", label: "includes" });
    });

    return refs;
};

const parseRubyDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        const match = line.match(/^\s*require(_relative)?\s+["']([^"']+)["']/);
        const value = match?.[2];
        if (value) {
            refs.push({ value, kind: "ruby", label: "requires" });
        }
    });

    return refs;
};

const parsePhpDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        const match = line.match(/^\s*(require|require_once|include|include_once)\s*\(?\s*["']([^"']+)["']/i);
        const value = match?.[2];
        if (value) refs.push({ value, kind: "php", label: "includes" });
    });

    return refs;
};

const parseDartDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        const match = line.match(/^\s*(import|part)\s+["']([^"']+)["']/);
        const value = match?.[2];
        if (value) refs.push({ value, kind: "dart", label: "imports" });
    });

    return refs;
};

const parseLuaDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        const match = line.match(/require\s*\(?\s*["']([^"']+)["']/);
        const value = match?.[1];
        if (value) refs.push({ value, kind: "lua", label: "requires" });
    });

    return refs;
};

const parseSwiftDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
        const match = line.match(/^\s*import\s+([A-Za-z0-9_]+)/);
        const value = match?.[1];
        if (value) refs.push({ value, kind: "swift", label: "imports" });
    });

    return refs;
};

const parseShellDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    const lines = text.split(/\r?\n/);
    lines.forEach((line) => {
        const trimmed = (line.split("#")[0] ?? "").trim();
        if (!trimmed) return;

        const match = trimmed.match(/^\s*(source|\.)\s+([^\s]+)/);
        const value = match?.[2];
        if (value) {
            refs.push({ value: value.replace(/["']/g, ""), kind: "shell", label: "sources" });
        }
    });

    return refs;
};

const DEPENDENCY_PARSERS: Record<string, (text: string) => DependencyRef[]> = {
    ".py": parsePythonDeps,
    ".go": parseGoDeps,
    ".rs": parseRustDeps,
    ".java": (text) => parseJavaLikeDeps(text, "java"),
    ".kt": (text) => parseJavaLikeDeps(text, "kotlin"),
    ".kts": (text) => parseJavaLikeDeps(text, "kotlin"),
    ".cs": parseCSharpDeps,
    ".c": parseCIncludes,
    ".h": parseCIncludes,
    ".cpp": parseCIncludes,
    ".hpp": parseCIncludes,
    ".cc": parseCIncludes,
    ".hh": parseCIncludes,
    ".m": parseCIncludes,
    ".mm": parseCIncludes,
    ".rb": parseRubyDeps,
    ".php": parsePhpDeps,
    ".dart": parseDartDeps,
    ".lua": parseLuaDeps,
    ".swift": parseSwiftDeps,
    ".sh": parseShellDeps,
    ".bash": parseShellDeps,
    ".zsh": parseShellDeps,
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

export const analyzeRepo = async (
    repoPath: string,
    onProgress?: ProgressReporter
): Promise<RepoGraph> => {
    const reportProgress = makeProgressReporter(onProgress);

    await reportProgress({ phase: "indexing", percent: 4, detail: "Loading source files" });
    const project = new Project();
    project.addSourceFilesAtPaths(path.join(repoPath, "**/*.{ts,js,tsx,jsx}"));

    await reportProgress({ phase: "indexing", percent: 8, detail: "Scanning repository" });

    const nodeMap = new Map<string, RepoNode>();
    const edges: RepoEdge[] = [];
    const edgeKeys = new Set<string>();

    const allFiles = walkFiles(repoPath).filter((filePath) => !isIgnoredPath(filePath));
    const fileIndex = buildFileIndex(repoPath, allFiles);
    const goModulePath = readGoModulePath(repoPath);
    const dartPackageName = readDartPackageName(repoPath);

    await reportProgress({
        phase: "indexing",
        percent: 10,
        detail: `${allFiles.length} files discovered`
    });

    const addNode = (node: RepoNode, preferSnippet = false) => {
        const existing = nodeMap.get(node.id);
        if (!existing) {
            nodeMap.set(node.id, node);
            return;
        }

        const merged: RepoNode = { ...existing };
        if (node.label && node.label !== existing.label) {
            merged.label = node.label;
        }
        if (node.type && node.type !== existing.type) {
            merged.type = node.type;
        }
        if (node.codeSnippet && (preferSnippet || !existing.codeSnippet)) {
            merged.codeSnippet = node.codeSnippet;
        }

        nodeMap.set(node.id, merged);
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

        addNode(node, true);
    };

    const fileStep = getProgressStep(allFiles.length);
    for (let i = 0; i < allFiles.length; i += 1) {
        const filePath = allFiles[i];
        const snippet = readFileSnippet(filePath);
        const node: RepoNode = {
            id: filePath,
            label: path.basename(filePath),
            type: "file"
        };

        if (snippet !== undefined) {
            node.codeSnippet = snippet;
        }

        addNode(node);

        if (i % fileStep === 0 || i === allFiles.length - 1) {
            await reportProgress({
                phase: "cataloging",
                current: i + 1,
                total: allFiles.length,
                percent: computePercent(10, 40, i + 1, allFiles.length),
                detail: `${i + 1}/${allFiles.length} files`
            });
        }
    }

    const sourceFiles = project
        .getSourceFiles()
        .filter((sourceFile) => !isIgnoredPath(sourceFile.getFilePath()));

    if (sourceFiles.length === 0) {
        await reportProgress({ phase: "parsing-ts", percent: 70, detail: "No TS/JS sources" });
    }

    const sourceStep = getProgressStep(sourceFiles.length);
    for (let i = 0; i < sourceFiles.length; i += 1) {
        const sourceFile = sourceFiles[i];
        const filePath = sourceFile.getFilePath();

        addFileNode(sourceFile);

        sourceFile.getImportDeclarations().forEach((importDecl) => {
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

        sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
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

        sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).forEach((id) => {
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

        if (i % sourceStep === 0 || i === sourceFiles.length - 1) {
            await reportProgress({
                phase: "parsing-ts",
                current: i + 1,
                total: sourceFiles.length,
                percent: computePercent(40, 70, i + 1, sourceFiles.length),
                detail: `${i + 1}/${sourceFiles.length} TS/JS files`
            });
        }
    }

    const jsTsExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
    const dependencyFiles = allFiles.filter((filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (jsTsExtensions.has(ext)) return false;
        return Boolean(DEPENDENCY_PARSERS[ext]);
    });

    if (dependencyFiles.length === 0) {
        await reportProgress({ phase: "parsing-deps", percent: 92, detail: "No extra languages" });
    }

    const dependencyStep = getProgressStep(dependencyFiles.length);
    for (let i = 0; i < dependencyFiles.length; i += 1) {
        const filePath = dependencyFiles[i];
        const ext = path.extname(filePath).toLowerCase();
        const parser = DEPENDENCY_PARSERS[ext];
        if (!parser) continue;

        const text = readFileText(filePath);
        if (!text) continue;

        const refs = parser(text);
        refs.forEach((ref) => {
            const target = resolveDependency(ref, filePath, repoPath, fileIndex, goModulePath, dartPackageName);
            if (!target || target === filePath) return;

            addEdge({
                source: filePath,
                target,
                label: ref.label
            });
        });

        if (i % dependencyStep === 0 || i === dependencyFiles.length - 1) {
            await reportProgress({
                phase: "parsing-deps",
                current: i + 1,
                total: dependencyFiles.length,
                percent: computePercent(70, 92, i + 1, dependencyFiles.length),
                detail: `${i + 1}/${dependencyFiles.length} files`
            });
        }
    }

    await reportProgress({ phase: "finalizing", percent: 100, detail: "Graph ready" });

    return { nodes: Array.from(nodeMap.values()), edges };
};
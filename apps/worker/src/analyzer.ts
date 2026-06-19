import { Project, SourceFile, SyntaxKind } from "ts-morph";
import fs from "node:fs";
import path from "node:path";
import { RepoGraph, RepoNode, RepoEdge } from "shared";

const MAX_SNIPPET_LINES = 2000;
const MAX_SNIPPET_CHARS = 100000;
const MAX_SNIPPET_BYTES = 200000;
const MAX_PARSE_BYTES = 200000;

export type AnalysisProgress = {
    phase?: string | undefined;
    percent?: number | undefined;
    current?: number | undefined;
    total?: number | undefined;
    detail?: string | undefined;
};

type ProgressReporter = (update: AnalysisProgress) => void;

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));
const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const computePercent = (start: number, end: number, current: number, total: number) => {
    if (total <= 0) return end;
    return start + (end - start) * Math.min(1, Math.max(0, current / total));
};
const getProgressStep = (total: number, targetUpdates = 50) =>
    Math.max(1, Math.floor(total / targetUpdates));

const LARGE_REPO_FILE_THRESHOLD = 5000;
const LARGE_REPO_CAP = 5000;
const LARGE_REPO_PRIORITY_DIRS = ["src", "lib", "app", "packages", "pkg"];

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
    ".git", "node_modules", "dist", "build", ".next",
    "out", ".turbo", ".cache", "coverage", "tmp", "temp"
]);

const IGNORED_EXTS = new Set([
    ".svg", ".ico", ".png", ".jpg", ".jpeg", ".css", ".scss",
    ".md", ".mdx", ".sql", ".toml", ".prisma", ".lock",
    ".yml", ".yaml", ".txt", ".woff", ".woff2", ".ttf", ".eot", ".json"
]);

const IGNORED_FILES = new Set([
    ".gitignore", ".env", ".env.example", ".env.local",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "eslint.config.mjs", "eslint.config.js",
    "postcss.config.mjs", "postcss.config.js",
    "tailwind.config.ts", "tailwind.config.js",
    "next.config.ts", "next.config.js",
    "vitest.config.ts", "jest.config.ts"
]);

// Normalizes any path to posix forward slashes AND lowercase drive letter.
// This is the single source of truth for all path normalization in this file.
// Critical on Windows: different APIs return C:/ vs c:/ for the same drive,
// causing Set lookups to fail. We normalize everything to lowercase drive letters.
const toPosix = (p: string): string => {
    let result = p.split("\\").join("/");
    // Normalize Windows drive letter to lowercase: C:/ -> c:/, D:/ -> d:/
    result = result.replace(/^([A-Za-z]):\//, (_, d) => d.toLowerCase() + ":/");
    return result;
};

// JS/TS extensions used by the regex pass to resolve require('./module') without extension
const JS_TS_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];



const buildSnippetFromText = (text: string): string | undefined => {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    const lines = trimmed.split(/\r?\n/).slice(0, MAX_SNIPPET_LINES);
    let snippet = lines.join("\n");
    if (snippet.length > MAX_SNIPPET_CHARS) snippet = `${snippet.slice(0, MAX_SNIPPET_CHARS)}\n...`;
    return snippet;
};

const buildCodeSnippet = (sourceFile: SourceFile): string | undefined =>
    buildSnippetFromText(sourceFile.getFullText());

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
    } catch { return undefined; }
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
    } catch { return null; }
};

const isIgnoredPath = (filePath: string, repoRoot: string): boolean => {
    const relPath = path.relative(repoRoot, filePath);
    const posix = toPosix(relPath);
    return posix.split("/").some((seg) => IGNORED_DIRS.has(seg));
};

const isIgnoredFile = (filePath: string): boolean => {
    const fileName = path.basename(filePath).toLowerCase();
    if (fileName === "package.json" || fileName === "tsconfig.json" || fileName === "tsconfig.node.json") return false;
    if (IGNORED_FILES.has(fileName)) return true;
    const ext = path.extname(filePath).toLowerCase();
    return IGNORED_EXTS.has(ext);
};

const walkFiles = (rootDir: string, collected: string[] = []): string[] => {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) { walkFiles(fullPath, collected); continue; }
        if (entry.isFile() && !isIgnoredFile(fullPath)) collected.push(fullPath);
    }
    return collected;
};

type DependencyRef = {
    value: string;
    label: "imports" | "includes" | "requires" | "sources" | "uses";
    kind: "relative" | "python" | "go" | "rust-mod" | "rust-use" | "java" | "kotlin" | "csharp" | "dart" | "lua" | "ruby" | "php" | "swift" | "c-include" | "shell";
};

type ExtensionKind = "python" | "go" | "rust" | "java" | "kotlin" | "csharp" | "c" | "ruby" | "php" | "dart" | "lua" | "swift" | "shell";

const EXTENSIONS_BY_KIND: Record<ExtensionKind, string[]> = {
    python: [".py"], go: [".go"], rust: [".rs"], java: [".java"],
    kotlin: [".kt", ".kts"], csharp: [".cs"],
    c: [".c", ".h", ".cpp", ".hpp", ".cc", ".hh", ".m", ".mm"],
    ruby: [".rb"], php: [".php"], dart: [".dart"], lua: [".lua"],
    swift: [".swift"], shell: [".sh", ".bash", ".zsh"],
};

// Non-JS language extensions only — used for non-JS dependency parsers
const ALL_EXTENSIONS = Array.from(new Set(Object.values(EXTENSIONS_BY_KIND).flat()));

// All extensions including JS/TS — used in regex pass for CommonJS require() resolution
const ALL_EXTENSIONS_INCLUDING_JS = [...JS_TS_EXTENSIONS, ...ALL_EXTENSIONS];

const getRelativePath = (rootDir: string, filePath: string) =>
    toPosix(path.relative(rootDir, filePath));

const buildFileIndex = (rootDir: string, files: string[]) => {
    const fileSet = new Set<string>();
    const relativeMap = new Map<string, string>();
    const baseNameMap = new Map<string, string[]>();
    const goPackageMap = new Map<string, string>();

    files.forEach((filePath) => {
        // toPosix normalizes drive letter casing — critical for Windows Set lookups
        const normalized = toPosix(path.resolve(filePath));
        fileSet.add(normalized);
        const relative = getRelativePath(rootDir, path.resolve(filePath));
        relativeMap.set(relative, normalized);
        const baseName = path.parse(filePath).name;
        const list = baseNameMap.get(baseName) ?? [];
        list.push(normalized);
        baseNameMap.set(baseName, list);
        if (path.extname(filePath).toLowerCase() === ".go") {
            const relDir = toPosix(path.dirname(relative));
            if (!goPackageMap.has(relDir)) goPackageMap.set(relDir, normalized);
        }
    });

    return { fileSet, relativeMap, baseNameMap, goPackageMap };
};

const resolvePathCandidates = (
    basePath: string, extensions: string[], fileSet: Set<string>, indexNames: string[] = ["index"]
): string | null => {
    // toPosix normalizes drive letter so Set.has() matches correctly on Windows
    const normalized = toPosix(path.resolve(basePath));

    // If path already has an extension, check it directly
    if (path.extname(normalized)) {
        return fileSet.has(normalized) ? normalized : null;
    }

    // Try appending each extension: ./routes/auth -> ./routes/auth.js, ./routes/auth.ts, etc.
    for (const ext of extensions) {
        const c = `${normalized}${ext}`;
        if (fileSet.has(c)) return c;
    }

    // Try index files: ./routes -> ./routes/index.js, etc.
    for (const ext of extensions) {
        for (const idx of indexNames) {
            const c = `${normalized}/${idx}${ext}`;
            if (fileSet.has(c)) return c;
        }
    }

    return null;
};

const resolvePythonModule = (value: string, fromFilePath: string, repoPath: string, fileSet: Set<string>): string | null => {
    let mv = value.trim();
    if (!mv) return null;
    const dots = mv.match(/^\.+/)?.[0].length ?? 0;
    mv = mv.slice(dots);
    let baseDir = path.dirname(fromFilePath);
    for (let i = 1; i < dots; i++) baseDir = path.dirname(baseDir);
    const mp = mv ? mv.replace(/\./g, path.sep) : "";
    const cb = mp ? path.join(baseDir, mp) : baseDir;
    const r = resolvePathCandidates(cb, EXTENSIONS_BY_KIND.python, fileSet, ["__init__", "index"]);
    if (r) return r;
    if (dots === 0) return resolvePathCandidates(path.join(repoPath, mp), EXTENSIONS_BY_KIND.python, fileSet, ["__init__", "index"]);
    return null;
};

const findRustCrateRoot = (filePath: string, repoPath: string) => {
    const parts = path.normalize(filePath).split(path.sep);
    const idx = parts.lastIndexOf("src");
    return idx >= 0 ? parts.slice(0, idx + 1).join(path.sep) : repoPath;
};

const resolveRustMod = (value: string, fromFilePath: string, fileSet: Set<string>) =>
    resolvePathCandidates(path.join(path.dirname(fromFilePath), value), EXTENSIONS_BY_KIND.rust, fileSet, ["mod"]);

const resolveRustUse = (value: string, fromFilePath: string, repoPath: string, fileSet: Set<string>): string | null => {
    let segs = value.split("::").filter(Boolean);
    if (!segs.length) return null;
    let base = findRustCrateRoot(fromFilePath, repoPath);
    while (segs[0] === "super") { base = path.dirname(base); segs = segs.slice(1); }
    if (segs[0] === "self") { base = path.dirname(fromFilePath); segs = segs.slice(1); }
    if (segs[0] === "crate") segs = segs.slice(1);
    for (let i = segs.length; i >= 1; i--) {
        const r = resolvePathCandidates(path.join(base, ...segs.slice(0, i)), EXTENSIONS_BY_KIND.rust, fileSet, ["mod"]);
        if (r) return r;
    }
    return null;
};

const readGoModulePath = (repoPath: string): string | null => {
    try {
        const p = path.join(repoPath, "go.mod");
        if (!fs.existsSync(p)) return null;
        const m = fs.readFileSync(p, "utf8").match(/^module\s+(.+)$/m);
        return m?.[1]?.trim() ?? null;
    } catch { return null; }
};

const readDartPackageName = (repoPath: string): string | null => {
    try {
        const p = path.join(repoPath, "pubspec.yaml");
        if (!fs.existsSync(p)) return null;
        const m = fs.readFileSync(p, "utf8").match(/^name:\s*(.+)$/m);
        return m?.[1]?.trim() ?? null;
    } catch { return null; }
};

const resolveNonRelativeModule = (
    moduleSpecifier: string, repoPath: string,
    index: ReturnType<typeof buildFileIndex>
): string | null => {
    const ns = moduleSpecifier.replace(/^@\//, "").replace(/^~\//, "");
    // Try workspace roots first (monorepo support)
    const roots = [repoPath, path.join(repoPath, "packages"), path.join(repoPath, "apps"), path.join(repoPath, "src")];
    for (const root of roots) {
        // Use ALL_EXTENSIONS_INCLUDING_JS so workspace packages with .js/.ts files resolve
        const r = resolvePathCandidates(path.join(root, ns), ALL_EXTENSIONS_INCLUDING_JS, index.fileSet, ["index", "types", "main"]);
        if (r) return r;
    }
    // Try matching by relative path suffix
    for (const rel of index.relativeMap.keys()) {
        if (rel === ns || rel.endsWith(`/${ns}`) || rel.endsWith(`/${ns}.js`) || rel.endsWith(`/${ns}.ts`))
            return index.relativeMap.get(rel) ?? null;
    }
    // Try matching by basename
    const last = ns.split("/").pop() ?? ns;
    return index.baseNameMap.get(last)?.[0] ?? null;
};

const resolveDependency = (
    ref: DependencyRef, fromFilePath: string, repoPath: string,
    index: ReturnType<typeof buildFileIndex>, goModulePath: string | null, dartPackageName: string | null
): string | null => {
    const fromDir = path.dirname(fromFilePath);
    const relBase = (v: string) => v.startsWith("/") ? path.join(repoPath, v) : path.resolve(fromDir, v);
    switch (ref.kind) {
        case "relative": return resolvePathCandidates(relBase(ref.value), ALL_EXTENSIONS, index.fileSet, ["index"]) ?? resolvePathCandidates(path.join(repoPath, ref.value), ALL_EXTENSIONS, index.fileSet, ["index"]);
        case "c-include": return resolvePathCandidates(relBase(ref.value), EXTENSIONS_BY_KIND.c, index.fileSet, ["index"]) ?? resolvePathCandidates(path.join(repoPath, ref.value), EXTENSIONS_BY_KIND.c, index.fileSet, ["index"]);
        case "shell": return resolvePathCandidates(relBase(ref.value), EXTENSIONS_BY_KIND.shell, index.fileSet, ["index"]) ?? resolvePathCandidates(path.join(repoPath, ref.value), EXTENSIONS_BY_KIND.shell, index.fileSet, ["index"]);
        case "php": return resolvePathCandidates(relBase(ref.value), EXTENSIONS_BY_KIND.php, index.fileSet, ["index"]) ?? resolvePathCandidates(path.join(repoPath, ref.value), EXTENSIONS_BY_KIND.php, index.fileSet, ["index"]);
        case "ruby": return resolvePathCandidates(relBase(ref.value), EXTENSIONS_BY_KIND.ruby, index.fileSet, ["index"]) ?? resolvePathCandidates(path.join(repoPath, ref.value), EXTENSIONS_BY_KIND.ruby, index.fileSet, ["index"]);
        case "python": return resolvePythonModule(ref.value, fromFilePath, repoPath, index.fileSet);
        case "rust-mod": return resolveRustMod(ref.value, fromFilePath, index.fileSet);
        case "rust-use": return resolveRustUse(ref.value, fromFilePath, repoPath, index.fileSet);
        case "go": {
            if (!goModulePath || !ref.value.startsWith(goModulePath)) return null;
            return index.goPackageMap.get(toPosix(ref.value.slice(goModulePath.length).replace(/^\//, ""))) ?? null;
        }
        case "dart": {
            if (ref.value.startsWith("package:")) {
                if (!dartPackageName) return null;
                const prefix = `package:${dartPackageName}/`;
                if (!ref.value.startsWith(prefix)) return null;
                return resolvePathCandidates(path.join(repoPath, ref.value.slice(prefix.length)), EXTENSIONS_BY_KIND.dart, index.fileSet);
            }
            return resolvePathCandidates(path.resolve(fromDir, ref.value), EXTENSIONS_BY_KIND.dart, index.fileSet);
        }
        case "lua": return resolvePathCandidates(path.join(repoPath, ref.value.replace(/\./g, path.sep)), EXTENSIONS_BY_KIND.lua, index.fileSet, ["init"]);
        case "java": return resolvePathCandidates(path.join(repoPath, ref.value.replace(/\./g, path.sep)), EXTENSIONS_BY_KIND.java, index.fileSet);
        case "kotlin": return resolvePathCandidates(path.join(repoPath, ref.value.replace(/\./g, path.sep)), EXTENSIONS_BY_KIND.kotlin, index.fileSet);
        case "csharp": return resolvePathCandidates(path.join(repoPath, ref.value.replace(/\./g, path.sep)), EXTENSIONS_BY_KIND.csharp, index.fileSet);
        case "swift": {
            const m = index.baseNameMap.get(ref.value);
            if (!m || m.length !== 1 || !m[0]) return null;
            return path.extname(m[0]).toLowerCase() === ".swift" ? m[0] : null;
        }
        default: return null;
    }
};

// Uses path.posix to match ts-morph's internal forward-slash paths
const resolveRelativeSourceFile = (project: Project, fromFile: SourceFile, moduleSpecifier: string): SourceFile | null => {
    if (!moduleSpecifier.startsWith(".")) return null;
    const fromDir = fromFile.getDirectoryPath(); // ts-morph always returns posix
    const resolvedBase = path.posix.resolve(fromDir, moduleSpecifier);
    const ext = path.posix.extname(resolvedBase);
    const candidates: string[] = ext
        ? [resolvedBase]
        : [".ts", ".tsx", ".js", ".jsx"].flatMap(e => [`${resolvedBase}${e}`, `${resolvedBase}/index${e}`]);

    for (const c of candidates) {
        const f = project.getSourceFile(c);
        if (f) return f;
    }
    return null;
};

const parsePythonDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const t = (line.split("#")[0] ?? "").trim();
        if (!t) continue;
        const fm = t.match(/^\s*from\s+([.\w]+)\s+import\s+/);
        if (fm?.[1]) { refs.push({ value: fm[1], kind: "python", label: "imports" }); continue; }
        const im = t.match(/^\s*import\s+([\w\s,\.]+)$/);
        if (im?.[1]) im[1].split(",").map(p => p.trim().split(/\s+as\s+/)[0]?.trim() ?? "").filter(Boolean).forEach(m => refs.push({ value: m, kind: "python", label: "imports" }));
    }
    return refs;
};

const parseGoDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    let inBlock = false;
    for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (t.startsWith("import (") || t === "import(") { inBlock = true; continue; }
        if (inBlock && t.startsWith(")")) { inBlock = false; continue; }
        if (t.startsWith("import ") && !t.includes("(")) { const m = t.match(/"([^"]+)"/); if (m?.[1]) refs.push({ value: m[1], kind: "go", label: "imports" }); continue; }
        if (inBlock) { const m = t.match(/"([^"]+)"/); if (m?.[1]) refs.push({ value: m[1], kind: "go", label: "imports" }); }
    }
    return refs;
};

const parseRustDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const t = (line.split("//")[0] ?? "").trim();
        if (!t) continue;
        const mm = t.match(/^\s*mod\s+([A-Za-z0-9_]+)\s*;/);
        if (mm?.[1]) refs.push({ value: mm[1], kind: "rust-mod", label: "imports" });
        const um = t.match(/^\s*use\s+([A-Za-z0-9_:]+)\s*;/);
        if (um?.[1]) refs.push({ value: um[1], kind: "rust-use", label: "uses" });
    }
    return refs;
};

const parseJavaLikeDeps = (text: string, kind: "java" | "kotlin"): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const t = (line.split("//")[0] ?? "").trim();
        const m = t.match(/^\s*import\s+([A-Za-z0-9_.]+)\s*;?/);
        if (m?.[1]) refs.push({ value: m[1], kind, label: "imports" });
    }
    return refs;
};

const parseCSharpDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const t = (line.split("//")[0] ?? "").trim();
        const m = t.match(/^\s*using\s+([A-Za-z0-9_.]+)\s*;/);
        if (m?.[1]) refs.push({ value: m[1], kind: "csharp", label: "uses" });
    }
    return refs;
};

const parseCIncludes = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*#include\s+"([^"]+)"/);
        if (m?.[1]) refs.push({ value: m[1], kind: "c-include", label: "includes" });
    }
    return refs;
};

const parseRubyDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*require(_relative)?\s+["']([^"']+)["']/);
        if (m?.[2]) refs.push({ value: m[2], kind: "ruby", label: "requires" });
    }
    return refs;
};

const parsePhpDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*(require|require_once|include|include_once)\s*\(?\s*["']([^"']+)["']/i);
        if (m?.[2]) refs.push({ value: m[2], kind: "php", label: "includes" });
    }
    return refs;
};

const parseDartDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*(import|part)\s+["']([^"']+)["']/);
        if (m?.[2]) refs.push({ value: m[2], kind: "dart", label: "imports" });
    }
    return refs;
};

const parseLuaDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/require\s*\(?\s*["']([^"']+)["']/);
        if (m?.[1]) refs.push({ value: m[1], kind: "lua", label: "requires" });
    }
    return refs;
};

const parseSwiftDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*import\s+([A-Za-z0-9_]+)/);
        if (m?.[1]) refs.push({ value: m[1], kind: "swift", label: "imports" });
    }
    return refs;
};

const parseShellDeps = (text: string): DependencyRef[] => {
    const refs: DependencyRef[] = [];
    for (const line of text.split(/\r?\n/)) {
        const t = (line.split("#")[0] ?? "").trim();
        const m = t.match(/^\s*(source|\.)\s+([^\s]+)/);
        if (m?.[2]) refs.push({ value: m[2].replace(/["']/g, ""), kind: "shell", label: "sources" });
    }
    return refs;
};

const DEPENDENCY_PARSERS: Record<string, (text: string) => DependencyRef[]> = {
    ".py": parsePythonDeps, ".go": parseGoDeps, ".rs": parseRustDeps,
    ".java": (t) => parseJavaLikeDeps(t, "java"),
    ".kt": (t) => parseJavaLikeDeps(t, "kotlin"),
    ".kts": (t) => parseJavaLikeDeps(t, "kotlin"),
    ".cs": parseCSharpDeps, ".c": parseCIncludes, ".h": parseCIncludes,
    ".cpp": parseCIncludes, ".hpp": parseCIncludes, ".cc": parseCIncludes,
    ".hh": parseCIncludes, ".m": parseCIncludes, ".mm": parseCIncludes,
    ".rb": parseRubyDeps, ".php": parsePhpDeps, ".dart": parseDartDeps,
    ".lua": parseLuaDeps, ".swift": parseSwiftDeps,
    ".sh": parseShellDeps, ".bash": parseShellDeps, ".zsh": parseShellDeps,
};

const findNpmDependencies = (allFiles: string[]): Set<string> => {
    const deps = new Set<string>();
    for (const pkgPath of allFiles.filter(f => f.endsWith("package.json"))) {
        try {
            const c = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
            if (c.dependencies) Object.keys(c.dependencies).forEach(d => deps.add(d));
            if (c.devDependencies) Object.keys(c.devDependencies).forEach(d => deps.add(d));
        } catch {}
    }
    return deps;
};

const determinePackageRoot = (filePath: string, posixRepoPath: string): string | null => {
    const posixFile = toPosix(filePath);
    const prefix = posixRepoPath.endsWith("/") ? posixRepoPath : posixRepoPath + "/";
    const rel = posixFile.startsWith(prefix) ? posixFile.slice(prefix.length) : posixFile;
    const segs = rel.split("/");
    if (segs[0] === "apps" || segs[0] === "packages" || segs[0] === "workspaces")
        return segs.length > 1 ? `${segs[0]}/${segs[1]}` : null;
    return null;
};

export const analyzeRepo = async (repoPath: string, onProgress?: ProgressReporter): Promise<RepoGraph> => {
    const reportProgress = makeProgressReporter(onProgress);

    // path.resolve gives the canonical OS absolute path, toPosix normalizes slashes + drive letter
    const posixRepoPath = toPosix(path.resolve(repoPath));

    // Converts any absolute path to a clean relative node ID.
    // Uses lowercase comparison to handle Windows drive letter casing differences.
    const toNodeId = (abs: string): string => {
        const posixAbs = toPosix(abs);
        const posixAbsLower = posixAbs.toLowerCase();
        const prefixLower = (posixRepoPath.endsWith("/") ? posixRepoPath : posixRepoPath + "/").toLowerCase();

        if (posixAbsLower.startsWith(prefixLower)) {
            // Slice by prefix LENGTH to preserve original filename casing in the result
            return posixAbs.slice(prefixLower.length);
        }

        // Fallback for temp-dir paths like /tmp/repolens-temp/repo-abc123/...
        const repoFolder = posixRepoPath.split("/").pop()?.toLowerCase() ?? "";
        if (repoFolder) {
            const needle = "/" + repoFolder + "/";
            const idx = posixAbsLower.indexOf(needle);
            if (idx !== -1) return posixAbs.slice(idx + needle.length);
        }

        console.warn("[analyzer] toNodeId fallback (unexpected):", abs, "| posixRepoPath:", posixRepoPath);
        return posixAbs;
    };

    console.log("[analyzer] repoPath:", repoPath);
    console.log("[analyzer] posixRepoPath:", posixRepoPath);
    console.log("[analyzer] toNodeId test:", toNodeId(path.join(repoPath, "src", "index.js")));
    // Expected: src/index.js

    await reportProgress({ phase: "indexing", percent: 4, detail: "Loading source files" });

    const project = new Project({ skipAddingFilesFromTsConfig: true });

    // Load tsconfigs for TypeScript/Next.js repos (enables @/ alias resolution)
    const tsconfigCandidates = [
        path.join(repoPath, "tsconfig.json"),
        path.join(repoPath, "apps", "web", "tsconfig.json"),
        path.join(repoPath, "apps", "worker", "tsconfig.json"),
        path.join(repoPath, "packages", "shared", "tsconfig.json"),
    ];
    const tsconfigPaths = tsconfigCandidates.filter(p => fs.existsSync(p));
    console.log("[analyzer] tsconfig paths found:", tsconfigPaths);

    for (const tc of tsconfigPaths) {
        try {
            const before = project.getSourceFiles().length;
            project.addSourceFilesFromTsConfig(tc);
            console.log(`[analyzer] loaded ${project.getSourceFiles().length - before} files from ${path.basename(path.dirname(tc))}/tsconfig.json`);
        } catch (e) {
            console.warn("[analyzer] failed to load tsconfig:", tc, e);
        }
    }

    // Fallback glob for repos without tsconfig (plain JS, CommonJS Express, etc.)
    const usefulFiles = project.getSourceFiles().filter(sf => !isIgnoredPath(sf.getFilePath(), repoPath));
    if (usefulFiles.length === 0) {
        console.log("[analyzer] no tsconfig found or empty — using glob fallback");
        project.addSourceFilesAtPaths([
            `${posixRepoPath}/**/*.ts`,
            `${posixRepoPath}/**/*.tsx`,
            `${posixRepoPath}/**/*.js`,
            `${posixRepoPath}/**/*.jsx`,
            `${posixRepoPath}/**/*.mjs`,
            `${posixRepoPath}/**/*.cjs`,
        ]);
    }

    const totalSourceFiles = project.getSourceFiles().filter(sf => !isIgnoredPath(sf.getFilePath(), repoPath)).length;
    console.log("[analyzer] ts-morph source files (excl. ignored dirs):", totalSourceFiles);

    await reportProgress({ phase: "indexing", percent: 8, detail: "Scanning repository" });

    const nodeMap = new Map<string, RepoNode>();
    const edges: RepoEdge[] = [];
    const edgeKeys = new Set<string>();

    const allFilesFull = walkFiles(repoPath).filter(f => !isIgnoredPath(f, repoPath));
    let allFiles = allFilesFull;

    if (allFilesFull.length > LARGE_REPO_FILE_THRESHOLD) {
        await reportProgress({ phase: "cataloging", percent: 5, detail: `Large repo (${allFilesFull.length} files), applying heuristics...` });
        const priority: string[] = [];
        const other: string[] = [];
        for (const fp of allFilesFull) {
            const lower = toPosix(fp).toLowerCase();
            if (LARGE_REPO_PRIORITY_DIRS.some(d => lower.includes(`/${d}/`))) priority.push(fp);
            else other.push(fp);
        }
        const chosen: string[] = [];
        const seen = new Set<string>();
        for (const list of [priority, other]) {
            for (const p of list) {
                if (!seen.has(p)) { chosen.push(p); seen.add(p); }
                if (chosen.length >= LARGE_REPO_CAP) break;
            }
            if (chosen.length >= LARGE_REPO_CAP) break;
        }
        allFiles = chosen.length > 0 ? chosen : allFilesFull.slice(0, LARGE_REPO_CAP);
    }

    const fileIndex = buildFileIndex(repoPath, allFiles);
    const goModulePath = readGoModulePath(repoPath);
    const dartPackageName = readDartPackageName(repoPath);
    const knownNpmDeps = findNpmDependencies(allFilesFull);

    await reportProgress({ phase: "indexing", percent: 10, detail: `${allFiles.length} files discovered` });

    const addNode = (node: RepoNode, preferSnippet = false) => {
        const existing = nodeMap.get(node.id);
        if (!existing) { nodeMap.set(node.id, node); return; }
        const merged = { ...existing };
        if (node.label && node.label !== existing.label) merged.label = node.label;
        if (node.type && node.type !== existing.type) merged.type = node.type;
        if (node.codeSnippet && (preferSnippet || !existing.codeSnippet)) merged.codeSnippet = node.codeSnippet;
        nodeMap.set(node.id, merged);
    };

    const addEdge = (edge: RepoEdge) => {
        const key = `${edge.source}|${edge.target}|${edge.label}`;
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push(edge);
    };

    // Step 1: Catalog all files from walkFiles (registers nodes with snippets)
    const fileStep = getProgressStep(allFiles.length);
    for (let i = 0; i < allFiles.length; i++) {
        const filePath = allFiles[i];
        if (!filePath) continue;
        const nodeId = toNodeId(filePath);
        const snippet = readFileSnippet(filePath);
        addNode({
            id: nodeId,
            label: path.basename(filePath),
            type: "file",
            ...(snippet !== undefined ? { codeSnippet: snippet } : {}),
            ...(determinePackageRoot(filePath, posixRepoPath) ? { packageRoot: determinePackageRoot(filePath, posixRepoPath)! } : {}),
        });
        if (i % fileStep === 0 || i === allFiles.length - 1) {
            await reportProgress({ phase: "cataloging", current: i + 1, total: allFiles.length, percent: computePercent(10, 40, i + 1, allFiles.length), detail: `${i + 1}/${allFiles.length} files cataloged` });
        }
    }

    // Step 2: Process TS/JS files via ts-morph (accurate import resolution for TypeScript)
    const sourceFiles = project.getSourceFiles().filter(sf => !isIgnoredPath(sf.getFilePath(), repoPath));
    console.log("[analyzer] processing", sourceFiles.length, "source files via ts-morph");

    const tsHandledIds = new Set<string>(); // track which files ts-morph handles

    const sourceStep = getProgressStep(sourceFiles.length);
    for (let i = 0; i < sourceFiles.length; i++) {
        const sf = sourceFiles[i];
        if (!sf) continue;
        const filePath = sf.getFilePath();
        if (!filePath) continue;

        const nodeId = toNodeId(filePath);
        tsHandledIds.add(nodeId);

        // Upsert node — ts-morph gives better snippet quality
        const snippet = buildCodeSnippet(sf);
        addNode({
            id: nodeId,
            label: sf.getBaseName(),
            type: "file",
            ...(snippet !== undefined ? { codeSnippet: snippet } : {}),
            ...(determinePackageRoot(filePath, posixRepoPath) ? { packageRoot: determinePackageRoot(filePath, posixRepoPath)! } : {}),
        }, true);

        // Process ES module import declarations
        sf.getImportDeclarations().forEach(importDecl => {
            const spec = importDecl.getModuleSpecifierValue();
            let target = importDecl.getModuleSpecifierSourceFile() ?? null;

            if (!target) {
                if (spec.startsWith(".")) {
                    target = resolveRelativeSourceFile(project, sf, spec);
                } else {
                    const resolved = resolveNonRelativeModule(spec, repoPath, fileIndex);
                    if (resolved) target = project.getSourceFile(resolved) ?? null;
                }
            }

            if (!target) {
                const base = spec.split("/")[0];
                if (base && knownNpmDeps.has(base)) {
                    const npmId = `npm:${base}`;
                    addNode({ id: npmId, label: base, type: "npm-package", packageRoot: "npm-dependencies" });
                    addEdge({ source: nodeId, target: npmId, label: "imports" });
                }
                return;
            }

            const targetPath = target.getFilePath();
            if (!targetPath || targetPath === filePath) return;
            addEdge({ source: nodeId, target: toNodeId(targetPath), label: "imports" });
        });

        // Process CommonJS require() calls
        sf.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
            const expr = call.getExpression();
            if (expr.getKind() === SyntaxKind.Identifier && expr.getText() === "require") {
                const arg = call.getArguments()[0];
                if (!arg || arg.getKind() !== SyntaxKind.StringLiteral) return;
                const spec = arg.getText().replace(/['"`]/g, "");

                let target = null;
                if (spec.startsWith(".")) {
                    target = resolveRelativeSourceFile(project, sf, spec);
                } else {
                    const resolved = resolveNonRelativeModule(spec, repoPath, fileIndex);
                    if (resolved) target = project.getSourceFile(resolved) ?? null;
                }

                if (!target) {
                    const base = spec.split("/")[0];
                    if (base && knownNpmDeps.has(base)) {
                        const npmId = `npm:${base}`;
                        addNode({ id: npmId, label: base, type: "npm-package", packageRoot: "npm-dependencies" });
                        addEdge({ source: nodeId, target: npmId, label: "imports" });
                    }
                    return;
                }
                const tp = target.getFilePath();
                if (!tp || tp === filePath) return;
                addEdge({ source: nodeId, target: toNodeId(tp), label: "imports" });
                return;
            }

            // Detect fetch/axios API calls
            const exprText = expr.getText();
            if (exprText.includes("fetch") || exprText.includes("axios")) {
                const url = call.getArguments()[0]?.getText().replace(/['"`]/g, "") || "unknown-endpoint";
                const apiId = `api-${url}`;
                addNode({ id: apiId, label: url, type: "api-endpoint" });
                addEdge({ source: nodeId, target: apiId, label: "calls" });
            }
        });

        // Detect Prisma / mongoose storage usage
        sf.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
            if (["Schema", "model", "PrismaClient"].includes(id.getText())) {
                addNode({ id: "database-layer", label: "Database/Storage", type: "storage" });
                addEdge({ source: nodeId, target: "database-layer", label: "persists" });
            }
        });

        if (i % sourceStep === 0 || i === sourceFiles.length - 1) {
            await reportProgress({ phase: "parsing-ts", current: i + 1, total: sourceFiles.length, percent: computePercent(40, 70, i + 1, sourceFiles.length), detail: `${i + 1}/${sourceFiles.length} TS/JS files via ts-morph` });
        }
    }

    // Step 3: Regex pass for JS/TS files NOT handled by ts-morph.
    // KEY FIX: uses ALL_EXTENSIONS_INCLUDING_JS so require('./routes/auth') finds auth.js
    // This is the main fix for CommonJS/Express repos with plain .js files.
    const jsTsExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
    const regexFiles = allFiles.filter(fp => {
        if (!fp) return false;
        const ext = path.extname(fp).toLowerCase();
        if (!jsTsExts.has(ext)) return false;
        return !tsHandledIds.has(toNodeId(fp)); // skip files already processed by ts-morph
    });

    console.log("[analyzer] regex pass will process:", regexFiles.length, "files (not handled by ts-morph)");

    const importRegex = /(?:import\s+(?:[^'";]+?)\s+from\s+|import\s+['"])([^'"\)]+)['"]/g;
    const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
    const regexStep = getProgressStep(regexFiles.length);

    for (let i = 0; i < regexFiles.length; i++) {
        const filePath = regexFiles[i];
        if (!filePath) continue;
        const text = readFileText(filePath);
        if (!text) continue;
        const nodeId = toNodeId(filePath);

        const processSpec = (spec: string) => {
            let target: string | null = null;
            if (spec.startsWith(".")) {
                const base = path.resolve(path.dirname(filePath), spec);
                // THE KEY FIX: use ALL_EXTENSIONS_INCLUDING_JS here
                // Previously used ALL_EXTENSIONS which excluded .js/.ts entirely,
                // so require('./routes/auth') never resolved to auth.js
                target = resolvePathCandidates(base, ALL_EXTENSIONS_INCLUDING_JS, fileIndex.fileSet, ["index"]);
            } else {
                // For non-relative requires like require('express'), check if it's internal first
                target = resolveNonRelativeModule(spec, repoPath, fileIndex);
            }

            if (!target || target === toPosix(path.resolve(filePath))) {
                // Not an internal file — check if it's a known npm package
                const base = spec.split("/")[0];
                if (base && knownNpmDeps.has(base)) {
                    addNode({ id: `npm:${base}`, label: base, type: "npm-package", packageRoot: "npm-dependencies" });
                    addEdge({ source: nodeId, target: `npm:${base}`, label: "imports" });
                }
                return;
            }
            addEdge({ source: nodeId, target: toNodeId(target), label: "imports" });
        };

        importRegex.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = importRegex.exec(text))) if (m[1]) processSpec(m[1]);

        requireRegex.lastIndex = 0;
        while ((m = requireRegex.exec(text))) if (m[1]) processSpec(m[1]);

        if (i % regexStep === 0 || i === regexFiles.length - 1) {
            await reportProgress({ phase: "parsing-ts", current: i + 1, total: regexFiles.length, percent: computePercent(70, 80, i + 1, regexFiles.length), detail: `regex pass ${i + 1}/${regexFiles.length}` });
        }
    }

    // Step 4: Non-JS language dependency parsers (Python, Go, Rust, etc.)
    const depFiles = allFiles.filter(fp => {
        if (!fp) return false;
        const ext = path.extname(fp).toLowerCase();
        return !jsTsExts.has(ext) && Boolean(DEPENDENCY_PARSERS[ext]);
    });

    const depStep = getProgressStep(depFiles.length);
    for (let i = 0; i < depFiles.length; i++) {
        const filePath = depFiles[i];
        if (!filePath) continue;
        const ext = path.extname(filePath).toLowerCase();
        const parser = DEPENDENCY_PARSERS[ext];
        if (!parser) continue;
        const text = readFileText(filePath);
        if (!text) continue;
        const nodeId = toNodeId(filePath);
        for (const ref of parser(text)) {
            const target = resolveDependency(ref, filePath, repoPath, fileIndex, goModulePath, dartPackageName);
            if (!target || target === filePath) continue;
            addEdge({ source: nodeId, target: toNodeId(target), label: ref.label });
        }
        if (i % depStep === 0 || i === depFiles.length - 1) {
            await reportProgress({ phase: "parsing-deps", current: i + 1, total: depFiles.length, percent: computePercent(80, 95, i + 1, depFiles.length), detail: `${i + 1}/${depFiles.length} non-JS files` });
        }
    }

    // Final summary logs
    console.log("[analyzer] ✓ Final node count:", nodeMap.size);
    console.log("[analyzer] ✓ Final edge count:", edges.length);
    if (edges.length > 0) {
        console.log("[analyzer] Sample edges:", edges.slice(0, 5).map(e => `${e.source} → ${e.target}`));
    } else {
        console.warn("[analyzer] ⚠ WARNING: 0 edges produced. Common causes:");
        console.warn("  1. Repo uses require() without extensions and resolvePathCandidates couldn't find the files");
        console.warn("  2. Drive letter casing mismatch (check toPosix output above)");
        console.warn("  3. ts-morph loaded 0 files (check tsconfig logs above)");
    }

    await reportProgress({ phase: "finalizing", percent: 100, detail: "Graph ready" });
    return { nodes: Array.from(nodeMap.values()), edges };
};
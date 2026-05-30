export interface RepoNode {
    id: string;
    label: string;
    type: 'file' | 'api-endpoint' | 'storage' | 'folder' | 'npm-package';
    codeSnippet?: string;
    packageRoot?: string; 
}

export interface RepoEdge {
    source: string;
    target: string;
    label: string;
    data?: {
        direct?: boolean;
    };
}

export interface RepoGraph {
    nodes: RepoNode[];
    edges: RepoEdge[];
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthSessionPayload {
    token: string;
    user: AuthUser;
}

export interface AnalysisHistoryRecord {
    id: string;
    userId: string | null;
    repoUrl: string;
    commitSha: string | null;
    nodeCount: number;
    edgeCount: number;
    graphJson: RepoGraph;
    createdAt: string;
    updatedAt: string;
}
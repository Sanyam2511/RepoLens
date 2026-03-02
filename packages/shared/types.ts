export interface RepoNode {
    id: string;
    label: string;
    type: 'file' | 'api-endpoint' | 'storage' | 'folder';
    codeSnippet?: string;
}

export interface RepoEdge {
    source: string;
    target: string;
    label: string;
}

export interface RepoGraph {
    nodes: RepoNode[];
    edges: RepoEdge[];
}
import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepo } from "../analyzer.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(testDir, "../../test-fixtures/sample");

const graph = analyzeRepo(fixtureRoot);

const endsWithPath = (value: string, suffix: string) =>
  path.normalize(value).endsWith(path.normalize(suffix));

const findNode = (suffix: string) =>
  graph.nodes.find((node) => endsWithPath(node.id, suffix));

const findEdge = (sourceSuffix: string, targetSuffix: string, label: string) =>
  graph.edges.find(
    (edge) =>
      endsWithPath(edge.source, sourceSuffix) &&
      endsWithPath(edge.target, targetSuffix) &&
      edge.label === label
  );

describe("analyzeRepo", () => {
  it("creates file nodes for fixtures", () => {
    expect(findNode("test-fixtures/sample/index.ts")).toBeTruthy();
    expect(findNode("test-fixtures/sample/api.ts")).toBeTruthy();
    expect(findNode("test-fixtures/sample/storage.ts")).toBeTruthy();
  });

  it("creates import edges for local modules", () => {
    expect(
      findEdge("test-fixtures/sample/index.ts", "test-fixtures/sample/api.ts", "imports")
    ).toBeTruthy();
    expect(
      findEdge("test-fixtures/sample/index.ts", "test-fixtures/sample/storage.ts", "imports")
    ).toBeTruthy();
  });

  it("creates API endpoint nodes and edges", () => {
    const apiNode = graph.nodes.find((node) => node.id === "api-https://api.example.com/data");
    expect(apiNode).toBeTruthy();

    const apiEdge = graph.edges.find(
      (edge) =>
        endsWithPath(edge.source, "test-fixtures/sample/index.ts") &&
        edge.target === "api-https://api.example.com/data" &&
        edge.label === "calls"
    );
    expect(apiEdge).toBeTruthy();
  });

  it("creates storage nodes and edges", () => {
    const storageNode = graph.nodes.find((node) => node.id === "database-layer");
    expect(storageNode).toBeTruthy();

    const storageEdge = graph.edges.find(
      (edge) =>
        endsWithPath(edge.source, "test-fixtures/sample/storage.ts") &&
        edge.target === "database-layer" &&
        edge.label === "persists"
    );
    expect(storageEdge).toBeTruthy();
  });

  it("includes code snippets for file nodes", () => {
    const indexNode = findNode("test-fixtures/sample/index.ts");
    expect(indexNode?.codeSnippet).toBeTruthy();
  });
});

/**
 * Graph Utils Unit Tests
 *
 * Tests the graph utility functions for workflow execution including:
 * - Cycle detection
 * - Topological sorting
 * - Entry/end point finding
 * - Graph validation
 * - Predecessor/successor analysis
 * - Path finding
 */

import { describe, expect, it } from "vitest";
import type {
  WorkflowEdge,
  WorkflowGraph,
} from "../../../src/lib/types/workflowTypes.js";
import {
  buildGraph,
  dependsOn,
  detectCycles,
  findCommonAncestors,
  findEndPoints,
  findEntryPoints,
  findForkPoints,
  findLongestPath,
  findMergePoints,
  getAllPredecessors,
  getAllSuccessors,
  getExecutionOrder,
  hasCycles,
  topologicalSort,
  validateGraph,
} from "../../../src/lib/workflow/utils/graphUtils.js";

describe("graphUtils", () => {
  describe("buildGraph", () => {
    it("should build graph from edges", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ];

      const graph = buildGraph(edges);

      expect(graph.size).toBe(3);
      expect(graph.has("a")).toBe(true);
      expect(graph.has("b")).toBe(true);
      expect(graph.has("c")).toBe(true);
    });

    it("should calculate correct in/out degrees", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
        { from: "b", to: "d" },
        { from: "c", to: "d" },
      ];

      const graph = buildGraph(edges);

      const nodeA = graph.get("a")!;
      const nodeD = graph.get("d")!;

      expect(nodeA.inDegree).toBe(0);
      expect(nodeA.outDegree).toBe(2);
      expect(nodeD.inDegree).toBe(2);
      expect(nodeD.outDegree).toBe(0);
    });

    it("should track predecessors and successors", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
        { from: "b", to: "d" },
      ];

      const graph = buildGraph(edges);

      expect(graph.get("a")!.successors.has("b")).toBe(true);
      expect(graph.get("a")!.successors.has("c")).toBe(true);
      expect(graph.get("b")!.predecessors.has("a")).toBe(true);
      expect(graph.get("d")!.predecessors.has("b")).toBe(true);
    });
  });

  describe("detectCycles", () => {
    it("should detect no cycles in DAG", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "a", to: "c" },
      ];

      const cycles = detectCycles(edges);
      expect(cycles).toEqual([]);
    });

    it("should detect simple cycle", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ];

      const cycles = detectCycles(edges);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it("should detect longer cycle", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "a" },
      ];

      const cycles = detectCycles(edges);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it("should detect self-loop", () => {
      const edges: WorkflowEdge[] = [{ from: "a", to: "a" }];

      const cycles = detectCycles(edges);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it("should handle empty graph", () => {
      const cycles = detectCycles([]);
      expect(cycles).toEqual([]);
    });

    it("should handle disconnected graph with no cycles", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "c", to: "d" },
      ];

      const cycles = detectCycles(edges);
      expect(cycles).toEqual([]);
    });
  });

  describe("hasCycles", () => {
    it("should return false for DAG", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ];

      expect(hasCycles(edges)).toBe(false);
    });

    it("should return true for cyclic graph", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ];

      expect(hasCycles(edges)).toBe(true);
    });
  });

  describe("topologicalSort", () => {
    it("should sort nodes in dependency order", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ];

      const sorted = topologicalSort(edges);

      expect(sorted).not.toBeNull();
      expect(sorted!.indexOf("a")).toBeLessThan(sorted!.indexOf("b"));
      expect(sorted!.indexOf("b")).toBeLessThan(sorted!.indexOf("c"));
    });

    it("should handle diamond dependency", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
        { from: "b", to: "d" },
        { from: "c", to: "d" },
      ];

      const sorted = topologicalSort(edges);

      expect(sorted).not.toBeNull();
      expect(sorted!.indexOf("a")).toBeLessThan(sorted!.indexOf("b"));
      expect(sorted!.indexOf("a")).toBeLessThan(sorted!.indexOf("c"));
      expect(sorted!.indexOf("b")).toBeLessThan(sorted!.indexOf("d"));
      expect(sorted!.indexOf("c")).toBeLessThan(sorted!.indexOf("d"));
    });

    it("should return null for cyclic graph", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ];

      const sorted = topologicalSort(edges);
      expect(sorted).toBeNull();
    });

    it("should handle empty graph", () => {
      const sorted = topologicalSort([]);
      expect(sorted).toEqual([]);
    });

    it("should include all nodes", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "c", to: "d" },
      ];

      const sorted = topologicalSort(edges);

      expect(sorted).not.toBeNull();
      expect(sorted!.length).toBe(4);
      expect(sorted).toContain("a");
      expect(sorted).toContain("b");
      expect(sorted).toContain("c");
      expect(sorted).toContain("d");
    });
  });

  describe("findEntryPoints", () => {
    it("should find nodes with no incoming edges", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ];

      const entryPoints = findEntryPoints(edges);
      expect(entryPoints).toEqual(["a"]);
    });

    it("should find multiple entry points", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "c" },
        { from: "b", to: "c" },
      ];

      const entryPoints = findEntryPoints(edges);
      expect(entryPoints.sort()).toEqual(["a", "b"]);
    });

    it("should return empty for graph with all nodes having predecessors (cycle)", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ];

      const entryPoints = findEntryPoints(edges);
      expect(entryPoints).toEqual([]);
    });

    it("should handle empty graph", () => {
      const entryPoints = findEntryPoints([]);
      expect(entryPoints).toEqual([]);
    });
  });

  describe("findEndPoints", () => {
    it("should find nodes with no outgoing edges", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ];

      const endPoints = findEndPoints(edges);
      expect(endPoints).toEqual(["c"]);
    });

    it("should find multiple end points", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
      ];

      const endPoints = findEndPoints(edges);
      expect(endPoints.sort()).toEqual(["b", "c"]);
    });

    it("should handle empty graph", () => {
      const endPoints = findEndPoints([]);
      expect(endPoints).toEqual([]);
    });
  });

  describe("getAllPredecessors", () => {
    it("should find all transitive predecessors", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "d" },
      ];

      const predecessors = getAllPredecessors(edges, "d");
      expect(predecessors.size).toBe(3);
      expect(predecessors.has("a")).toBe(true);
      expect(predecessors.has("b")).toBe(true);
      expect(predecessors.has("c")).toBe(true);
    });

    it("should handle node with no predecessors", () => {
      const edges: WorkflowEdge[] = [{ from: "a", to: "b" }];

      const predecessors = getAllPredecessors(edges, "a");
      expect(predecessors.size).toBe(0);
    });

    it("should handle diamond graph", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
        { from: "b", to: "d" },
        { from: "c", to: "d" },
      ];

      const predecessors = getAllPredecessors(edges, "d");
      expect(predecessors.size).toBe(3);
      expect(predecessors.has("a")).toBe(true);
      expect(predecessors.has("b")).toBe(true);
      expect(predecessors.has("c")).toBe(true);
    });
  });

  describe("getAllSuccessors", () => {
    it("should find all transitive successors", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "d" },
      ];

      const successors = getAllSuccessors(edges, "a");
      expect(successors.size).toBe(3);
      expect(successors.has("b")).toBe(true);
      expect(successors.has("c")).toBe(true);
      expect(successors.has("d")).toBe(true);
    });

    it("should handle node with no successors", () => {
      const edges: WorkflowEdge[] = [{ from: "a", to: "b" }];

      const successors = getAllSuccessors(edges, "b");
      expect(successors.size).toBe(0);
    });
  });

  describe("findLongestPath", () => {
    it("should find longest path in DAG", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "a", to: "c" }, // Shortcut
      ];

      const path = findLongestPath(edges);
      expect(path).toEqual(["a", "b", "c"]);
    });

    it("should handle single node path", () => {
      const edges: WorkflowEdge[] = [{ from: "a", to: "b" }];

      const path = findLongestPath(edges);
      expect(path).toEqual(["a", "b"]);
    });

    it("should return empty for cyclic graph", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ];

      const path = findLongestPath(edges);
      expect(path).toEqual([]);
    });

    it("should handle empty graph", () => {
      const path = findLongestPath([]);
      expect(path).toEqual([]);
    });
  });

  describe("validateGraph", () => {
    it("should validate correct graph", () => {
      const graph: WorkflowGraph = {
        entryPoint: "a",
        edges: [
          { from: "a", to: "b" },
          { from: "b", to: "c" },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should detect missing entry point", () => {
      const graph: WorkflowGraph = {
        entryPoint: "",
        edges: [{ from: "a", to: "b" }],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("entry point"))).toBe(true);
    });

    it("should detect cycles", () => {
      const graph: WorkflowGraph = {
        entryPoint: "a",
        edges: [
          { from: "a", to: "b" },
          { from: "b", to: "a" },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Cycle"))).toBe(true);
    });

    it("should validate parallel groups have at least 2 steps", () => {
      const graph: WorkflowGraph = {
        entryPoint: "a",
        edges: [{ from: "a", to: "b" }],
        parallelGroups: [
          {
            id: "pg1",
            steps: ["a"], // Only one step - invalid
            waitFor: "all",
          },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("at least 2 steps"))).toBe(
        true,
      );
    });

    it("should validate branch source step exists", () => {
      const graph: WorkflowGraph = {
        entryPoint: "a",
        edges: [{ from: "a", to: "b" }],
        branches: [
          {
            id: "br1",
            fromStep: "nonexistent",
            branches: [
              {
                condition: { type: "always" },
                targetStep: "b",
              },
            ],
          },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("not found in graph"))).toBe(
        true,
      );
    });

    it("should validate loop has at least 1 step", () => {
      const graph: WorkflowGraph = {
        entryPoint: "a",
        edges: [{ from: "a", to: "b" }],
        loops: [
          {
            id: "loop1",
            type: "forEach",
            steps: [], // No steps - invalid
            itemVariable: "item",
          },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("at least 1 step"))).toBe(
        true,
      );
    });

    it("should validate doWhile/doUntil loops have condition", () => {
      const graph: WorkflowGraph = {
        entryPoint: "a",
        edges: [{ from: "a", to: "b" }],
        loops: [
          {
            id: "loop1",
            type: "doWhile",
            steps: ["a"],
            // Missing condition
          },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("must have a condition")),
      ).toBe(true);
    });

    it("should validate repeat loops have positive iterations", () => {
      const graph: WorkflowGraph = {
        entryPoint: "a",
        edges: [{ from: "a", to: "b" }],
        loops: [
          {
            id: "loop1",
            type: "repeat",
            steps: ["a"],
            iterations: 0, // Invalid
          },
        ],
      };

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("positive iterations"))).toBe(
        true,
      );
    });
  });

  describe("getExecutionOrder", () => {
    it("should return execution order from entry point", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "d", to: "e" }, // Disconnected
      ];

      const order = getExecutionOrder(edges, "a");

      expect(order).not.toBeNull();
      expect(order).toContain("a");
      expect(order).toContain("b");
      expect(order).toContain("c");
      expect(order).not.toContain("d");
      expect(order).not.toContain("e");
    });

    it("should return null for cyclic graph", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ];

      const order = getExecutionOrder(edges, "a");
      expect(order).toBeNull();
    });
  });

  describe("dependsOn", () => {
    it("should return true when nodeB depends on nodeA", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ];

      expect(dependsOn(edges, "a", "c")).toBe(true);
      expect(dependsOn(edges, "a", "b")).toBe(true);
    });

    it("should return false when no dependency", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "c", to: "d" },
      ];

      expect(dependsOn(edges, "a", "d")).toBe(false);
    });

    it("should return false for reverse dependency", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ];

      expect(dependsOn(edges, "c", "a")).toBe(false);
    });
  });

  describe("findCommonAncestors", () => {
    it("should find common ancestors of multiple nodes", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
        { from: "b", to: "d" },
        { from: "c", to: "d" },
      ];

      const ancestors = findCommonAncestors(edges, ["b", "c"]);
      expect(ancestors.has("a")).toBe(true);
    });

    it("should return empty set for empty node list", () => {
      const edges: WorkflowEdge[] = [{ from: "a", to: "b" }];

      const ancestors = findCommonAncestors(edges, []);
      expect(ancestors.size).toBe(0);
    });

    it("should handle nodes with no common ancestors", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "c", to: "d" },
      ];

      const ancestors = findCommonAncestors(edges, ["b", "d"]);
      expect(ancestors.size).toBe(0);
    });
  });

  describe("findMergePoints", () => {
    it("should find nodes where multiple paths converge", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "c" },
        { from: "b", to: "c" },
      ];

      const mergePoints = findMergePoints(edges);
      expect(mergePoints).toContain("c");
    });

    it("should return empty for linear graph", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ];

      const mergePoints = findMergePoints(edges);
      expect(mergePoints).toEqual([]);
    });

    it("should find multiple merge points", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "c" },
        { from: "b", to: "c" },
        { from: "c", to: "e" },
        { from: "d", to: "e" },
      ];

      const mergePoints = findMergePoints(edges);
      expect(mergePoints.sort()).toEqual(["c", "e"]);
    });
  });

  describe("findForkPoints", () => {
    it("should find nodes where path splits", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
      ];

      const forkPoints = findForkPoints(edges);
      expect(forkPoints).toContain("a");
    });

    it("should return empty for linear graph", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ];

      const forkPoints = findForkPoints(edges);
      expect(forkPoints).toEqual([]);
    });

    it("should find multiple fork points", () => {
      const edges: WorkflowEdge[] = [
        { from: "a", to: "b" },
        { from: "a", to: "c" },
        { from: "b", to: "d" },
        { from: "b", to: "e" },
      ];

      const forkPoints = findForkPoints(edges);
      expect(forkPoints.sort()).toEqual(["a", "b"]);
    });
  });
});

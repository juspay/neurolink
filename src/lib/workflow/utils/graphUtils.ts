/**
 * Graph Utilities for Workflow Execution
 *
 * Provides utilities for:
 * - Cycle detection
 * - Topological sorting
 * - Entry/end point finding
 * - Graph validation
 *
 * @module workflow/utils/graphUtils
 */

import type { WorkflowEdge, WorkflowGraph } from "../../types/workflowTypes.js";

/**
 * Graph node representation
 */
export type GraphNode = {
  id: string;
  inDegree: number;
  outDegree: number;
  predecessors: Set<string>;
  successors: Set<string>;
};

/**
 * Build a graph representation from edges
 */
export function buildGraph(edges: WorkflowEdge[]): Map<string, GraphNode> {
  const nodes = new Map<string, GraphNode>();

  // Initialize nodes from edges
  for (const edge of edges) {
    if (!nodes.has(edge.from)) {
      nodes.set(edge.from, {
        id: edge.from,
        inDegree: 0,
        outDegree: 0,
        predecessors: new Set(),
        successors: new Set(),
      });
    }
    if (!nodes.has(edge.to)) {
      nodes.set(edge.to, {
        id: edge.to,
        inDegree: 0,
        outDegree: 0,
        predecessors: new Set(),
        successors: new Set(),
      });
    }

    const fromNode = nodes.get(edge.from)!;
    const toNode = nodes.get(edge.to)!;

    fromNode.successors.add(edge.to);
    fromNode.outDegree++;

    toNode.predecessors.add(edge.from);
    toNode.inDegree++;
  }

  return nodes;
}

/**
 * Detect cycles in the workflow graph using DFS
 *
 * @returns Array of cycle paths if cycles exist, empty array otherwise
 */
export function detectCycles(edges: WorkflowEdge[]): string[][] {
  const graph = buildGraph(edges);
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const node = graph.get(nodeId);
    if (node) {
      const successors = Array.from(node.successors);
      for (const successor of successors) {
        if (!visited.has(successor)) {
          if (dfs(successor)) {
            return true;
          }
        } else if (recursionStack.has(successor)) {
          // Found a cycle - extract the cycle path
          const cycleStart = path.indexOf(successor);
          const cyclePath = path.slice(cycleStart);
          cyclePath.push(successor); // Complete the cycle
          cycles.push(cyclePath);
          return true;
        }
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return false;
  }

  // Run DFS from all nodes
  const nodeIds = Array.from(graph.keys());
  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return cycles;
}

/**
 * Check if the graph has any cycles
 */
export function hasCycles(edges: WorkflowEdge[]): boolean {
  return detectCycles(edges).length > 0;
}

/**
 * Topological sort using Kahn's algorithm
 *
 * @returns Sorted node IDs, or null if graph has cycles
 */
export function topologicalSort(edges: WorkflowEdge[]): string[] | null {
  const graph = buildGraph(edges);
  const result: string[] = [];
  const queue: string[] = [];

  // Create a mutable copy of in-degrees
  const inDegrees = new Map<string, number>();
  const nodeIds = Array.from(graph.keys());
  for (const nodeId of nodeIds) {
    inDegrees.set(nodeId, graph.get(nodeId)!.inDegree);
    if (graph.get(nodeId)!.inDegree === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    const node = graph.get(nodeId)!;
    const successors = Array.from(node.successors);
    for (const successor of successors) {
      const newInDegree = inDegrees.get(successor)! - 1;
      inDegrees.set(successor, newInDegree);

      if (newInDegree === 0) {
        queue.push(successor);
      }
    }
  }

  // If not all nodes are in result, there's a cycle
  if (result.length !== graph.size) {
    return null;
  }

  return result;
}

/**
 * Find entry points (nodes with no predecessors)
 */
export function findEntryPoints(edges: WorkflowEdge[]): string[] {
  const graph = buildGraph(edges);
  const entryPoints: string[] = [];

  const nodes = Array.from(graph.values());
  for (const node of nodes) {
    if (node.inDegree === 0) {
      entryPoints.push(node.id);
    }
  }

  return entryPoints;
}

/**
 * Find end points (nodes with no successors)
 */
export function findEndPoints(edges: WorkflowEdge[]): string[] {
  const graph = buildGraph(edges);
  const endPoints: string[] = [];

  const nodes = Array.from(graph.values());
  for (const node of nodes) {
    if (node.outDegree === 0) {
      endPoints.push(node.id);
    }
  }

  return endPoints;
}

/**
 * Get all predecessors of a node (transitive closure)
 */
export function getAllPredecessors(
  edges: WorkflowEdge[],
  nodeId: string,
): Set<string> {
  const graph = buildGraph(edges);
  const predecessors = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = graph.get(currentId);

    if (node) {
      const nodePredecessors = Array.from(node.predecessors);
      for (const pred of nodePredecessors) {
        if (!predecessors.has(pred)) {
          predecessors.add(pred);
          queue.push(pred);
        }
      }
    }
  }

  return predecessors;
}

/**
 * Get all successors of a node (transitive closure)
 */
export function getAllSuccessors(
  edges: WorkflowEdge[],
  nodeId: string,
): Set<string> {
  const graph = buildGraph(edges);
  const successors = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = graph.get(currentId);

    if (node) {
      const nodeSuccessors = Array.from(node.successors);
      for (const succ of nodeSuccessors) {
        if (!successors.has(succ)) {
          successors.add(succ);
          queue.push(succ);
        }
      }
    }
  }

  return successors;
}

/**
 * Find the longest path in the graph (critical path)
 */
export function findLongestPath(edges: WorkflowEdge[]): string[] {
  const sorted = topologicalSort(edges);
  if (!sorted) {
    return []; // Graph has cycles
  }

  const graph = buildGraph(edges);
  const distances = new Map<string, number>();
  const predecessors = new Map<string, string | null>();

  // Initialize
  for (const nodeId of sorted) {
    distances.set(nodeId, 0);
    predecessors.set(nodeId, null);
  }

  // Process nodes in topological order
  for (const nodeId of sorted) {
    const node = graph.get(nodeId)!;
    const currentDist = distances.get(nodeId)!;

    const successors = Array.from(node.successors);
    for (const successor of successors) {
      const newDist = currentDist + 1;
      if (newDist > distances.get(successor)!) {
        distances.set(successor, newDist);
        predecessors.set(successor, nodeId);
      }
    }
  }

  // Find the node with maximum distance
  let maxDist = -1;
  let endNode: string | null = null;

  const distanceEntries = Array.from(distances.entries());
  for (const [nodeId, dist] of distanceEntries) {
    if (dist > maxDist) {
      maxDist = dist;
      endNode = nodeId;
    }
  }

  if (endNode === null) {
    return [];
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = endNode;
  while (current !== null) {
    path.unshift(current);
    current = predecessors.get(current) ?? null;
  }

  return path;
}

/**
 * Validate a workflow graph
 */
export function validateGraph(graph: WorkflowGraph): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for entry point
  if (!graph.entryPoint) {
    errors.push("Workflow must have an entry point");
  }

  // Check if entry point exists in edges
  const allNodes = new Set<string>();
  for (const edge of graph.edges) {
    allNodes.add(edge.from);
    allNodes.add(edge.to);
  }

  if (
    graph.entryPoint &&
    !allNodes.has(graph.entryPoint) &&
    graph.edges.length > 0
  ) {
    // Entry point might be the only node (single-step workflow)
    if (
      graph.edges.some(
        (e) => e.from !== graph.entryPoint && e.to !== graph.entryPoint,
      )
    ) {
      errors.push(
        `Entry point "${graph.entryPoint}" is not connected to the graph`,
      );
    }
  }

  // Check for cycles
  const cycles = detectCycles(graph.edges);
  if (cycles.length > 0) {
    for (const cycle of cycles) {
      errors.push(`Cycle detected: ${cycle.join(" -> ")}`);
    }
  }

  // Check parallel groups
  if (graph.parallelGroups) {
    for (const group of graph.parallelGroups) {
      if (group.steps.length < 2) {
        errors.push(`Parallel group "${group.id}" must have at least 2 steps`);
      }

      // Check that parallel steps exist in graph
      for (const stepId of group.steps) {
        if (!allNodes.has(stepId)) {
          errors.push(
            `Parallel step "${stepId}" in group "${group.id}" not found in graph`,
          );
        }
      }
    }
  }

  // Check branches
  if (graph.branches) {
    for (const branch of graph.branches) {
      if (!allNodes.has(branch.fromStep)) {
        errors.push(
          `Branch "${branch.id}" source step "${branch.fromStep}" not found in graph`,
        );
      }

      for (const branchOption of branch.branches) {
        if (!allNodes.has(branchOption.targetStep)) {
          errors.push(
            `Branch "${branch.id}" target step "${branchOption.targetStep}" not found in graph`,
          );
        }
      }
    }
  }

  // Check loops
  if (graph.loops) {
    for (const loop of graph.loops) {
      if (loop.steps.length === 0) {
        errors.push(`Loop "${loop.id}" must have at least 1 step`);
      }

      if (
        loop.type === "forEach" &&
        !loop.itemsExpression &&
        !loop.itemVariable
      ) {
        errors.push(
          `ForEach loop "${loop.id}" must have itemsExpression or itemVariable`,
        );
      }

      if (loop.type === "repeat" && (!loop.iterations || loop.iterations < 1)) {
        errors.push(
          `Repeat loop "${loop.id}" must have positive iterations count`,
        );
      }

      if (
        (loop.type === "doWhile" || loop.type === "doUntil") &&
        !loop.condition
      ) {
        errors.push(
          `Loop "${loop.id}" of type "${loop.type}" must have a condition`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get execution order respecting dependencies
 */
export function getExecutionOrder(
  edges: WorkflowEdge[],
  entryPoint: string,
): string[] | null {
  const sorted = topologicalSort(edges);
  if (!sorted) {
    return null;
  }

  // Filter to only reachable nodes from entry point
  const reachable = getAllSuccessors(edges, entryPoint);
  reachable.add(entryPoint);

  return sorted.filter((nodeId) => reachable.has(nodeId));
}

/**
 * Check if nodeB depends on nodeA
 */
export function dependsOn(
  edges: WorkflowEdge[],
  nodeA: string,
  nodeB: string,
): boolean {
  const predecessors = getAllPredecessors(edges, nodeB);
  return predecessors.has(nodeA);
}

/**
 * Find common ancestors of multiple nodes
 */
export function findCommonAncestors(
  edges: WorkflowEdge[],
  nodeIds: string[],
): Set<string> {
  if (nodeIds.length === 0) {
    return new Set();
  }

  // Get predecessors for first node
  let common = getAllPredecessors(edges, nodeIds[0]);

  // Intersect with predecessors of other nodes
  for (let i = 1; i < nodeIds.length; i++) {
    const predecessors = getAllPredecessors(edges, nodeIds[i]);
    const newCommon = new Set<string>();
    const commonArray = Array.from(common);
    for (const nodeId of commonArray) {
      if (predecessors.has(nodeId)) {
        newCommon.add(nodeId);
      }
    }
    common = newCommon;
  }

  return common;
}

/**
 * Find merge points (nodes where multiple paths converge)
 */
export function findMergePoints(edges: WorkflowEdge[]): string[] {
  const graph = buildGraph(edges);
  const mergePoints: string[] = [];

  const nodes = Array.from(graph.values());
  for (const node of nodes) {
    if (node.inDegree > 1) {
      mergePoints.push(node.id);
    }
  }

  return mergePoints;
}

/**
 * Find fork points (nodes where path splits)
 */
export function findForkPoints(edges: WorkflowEdge[]): string[] {
  const graph = buildGraph(edges);
  const forkPoints: string[] = [];

  const nodes = Array.from(graph.values());
  for (const node of nodes) {
    if (node.outDegree > 1) {
      forkPoints.push(node.id);
    }
  }

  return forkPoints;
}

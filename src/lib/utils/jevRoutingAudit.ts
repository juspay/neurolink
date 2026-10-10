import { createHash } from "node:crypto";
import { diag } from "@opentelemetry/api";
import { decodeArray, decodeString } from "type-decoder/dist/index.js";
import {
  JEV_ROUTING_AUDIT_COMPONENT,
  JEV_ROUTING_AUDIT_LIMITS,
} from "../core/constants.js";
import type {
  JevRoutingAuditAvailableServer,
  JevRoutingAuditCandidate,
  JevRoutingAuditInput,
  JevRoutingAuditSelection,
  ToolRoutingCatalogEntry,
} from "../types/index.js";
import { logger } from "./logger.js";
import { isPlainObject } from "./typeUtils.js";

/** Never log the query, catalogue or provider error body. */
export const logJevRoutingAuditFailure = (error: unknown): void => {
  let errorType = "UnknownError";
  if (error instanceof Error) {
    errorType = error.name;
  }
  try {
    logger.warn(`${JEV_ROUTING_AUDIT_COMPONENT} Evidence recording failed`, {
      errorType: errorType,
    });
  } catch {
    try {
      diag.warn(JEV_ROUTING_AUDIT_COMPONENT, "Audit failure logging failed");
    } catch {
      return;
    }
  }
};

const decodeAvailableServer = (
  value: unknown,
): JevRoutingAuditAvailableServer | null => {
  if (!isPlainObject(value)) {
    return null;
  }
  const name = decodeString(value.name);
  const does = decodeString(value.does);
  if (name === null || does === null) {
    return null;
  }
  return { name: name, does: does };
};

export const buildJevRoutingAuditInput = (
  state: unknown,
): JevRoutingAuditInput | null => {
  try {
    if (!isPlainObject(state)) {
      return null;
    }
    const request = decodeString(state.request);
    if (request === null) {
      return null;
    }
    if (
      !Array.isArray(state.available_servers) ||
      state.available_servers.length === 0
    ) {
      return null;
    }
    const availableServers = decodeArray(
      state.available_servers.slice(
        0,
        JEV_ROUTING_AUDIT_LIMITS.candidateServers,
      ),
      decodeAvailableServer,
    );
    if (availableServers === null) {
      return null;
    }
    let evidenceComplete = true;
    if (
      request.trim().length === 0 ||
      request.length > JEV_ROUTING_AUDIT_LIMITS.queryCharacters
    ) {
      evidenceComplete = false;
    }
    if (
      state.available_servers.length > JEV_ROUTING_AUDIT_LIMITS.candidateServers
    ) {
      evidenceComplete = false;
    }
    const candidateServers = availableServers.map(
      (server): JevRoutingAuditCandidate => {
        const serverIdIsComplete =
          server.name.trim().length > 0 &&
          server.name.length <= JEV_ROUTING_AUDIT_LIMITS.serverIdCharacters;
        const capabilityIsComplete =
          server.does.trim().length > 0 &&
          server.does.length <= JEV_ROUTING_AUDIT_LIMITS.capabilityCharacters;
        if (!serverIdIsComplete || !capabilityIsComplete) {
          evidenceComplete = false;
        }
        return {
          id: server.name.slice(0, JEV_ROUTING_AUDIT_LIMITS.serverIdCharacters),
          capability: server.does.slice(
            0,
            JEV_ROUTING_AUDIT_LIMITS.capabilityCharacters,
          ),
        };
      },
    );
    const catalogueJson = JSON.stringify(state.available_servers);
    const catalogueVersion = createHash("sha256")
      .update(catalogueJson)
      .digest("hex");
    const input: JevRoutingAuditInput = {
      queryWithRoutingContext: request.slice(
        0,
        JEV_ROUTING_AUDIT_LIMITS.queryCharacters,
      ),
      candidateServers: candidateServers,
      catalogueVersion: catalogueVersion,
      evidenceComplete: evidenceComplete,
    };
    if (
      JSON.stringify(input).length >
      JEV_ROUTING_AUDIT_LIMITS.serializedInputCharacters
    ) {
      return null;
    }
    return input;
  } catch (error: unknown) {
    logJevRoutingAuditFailure(error);
    return null;
  }
};

export const buildJevRoutingAuditSelection = (
  candidates: JevRoutingAuditCandidate[],
  catalog: ToolRoutingCatalogEntry[],
  finalExcludedTools: string[],
  preExistingExcludedTools: string[],
): JevRoutingAuditSelection => {
  const excludedTools = new Set(finalExcludedTools);
  const candidateIds = new Set(candidates.map((server) => server.id));
  const candidateToolNames = catalog
    .filter((server) => candidateIds.has(server.id))
    .flatMap((server) => server.toolNames);
  const candidateTools = new Set(candidateToolNames);
  const retainedServers: string[] = [];
  const excludedServers: string[] = [];
  let selectionComplete = true;
  // Policy exclusions must not be scored as JEV mistakes.
  if (preExistingExcludedTools.some((name) => candidateTools.has(name))) {
    selectionComplete = false;
  }
  if (candidateIds.size !== candidates.length) {
    selectionComplete = false;
  }
  for (const candidate of candidates) {
    const matchingServers = catalog.filter(
      (server) => server.id === candidate.id,
    );
    if (matchingServers.length !== 1) {
      selectionComplete = false;
      continue;
    }
    const server = matchingServers[0];
    if (server.toolNames.length === 0) {
      selectionComplete = false;
      continue;
    }
    const allToolsExcluded = server.toolNames.every((name) =>
      excludedTools.has(name),
    );
    if (allToolsExcluded) {
      excludedServers.push(candidate.id);
      continue;
    }
    retainedServers.push(candidate.id);
    const someToolsExcluded = server.toolNames.some((name) =>
      excludedTools.has(name),
    );
    if (someToolsExcluded) {
      selectionComplete = false;
    }
  }
  const excludedToolCount = candidateToolNames.filter((name) =>
    excludedTools.has(name),
  ).length;
  return {
    retainedServers: retainedServers,
    excludedServers: excludedServers,
    selectionComplete: selectionComplete,
    excludedToolCount: excludedToolCount,
  };
};

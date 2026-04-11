/**
 * MCP Output Normalizer
 *
 * Single responsibility: intercept a raw MCP `CallToolResult`, measure it,
 * and apply the configured strategy so that oversized payloads never reach
 * caches, Redis, or LLM context windows raw.
 *
 * Two strategies:
 *  - "inline"      Pass through unchanged. The full payload enters the LLM
 *                  context as-is. Emit a warning above warnBytes.
 *  - "externalize" Write the full payload to the ArtifactStore, return a
 *                  compact surrogate with a head/tail preview and an artifact
 *                  ID. The model uses `retrieve_context` with that ID to read
 *                  the full output on demand, with offset/limit pagination.
 *
 * The surrogate result is shaped as an MCP `CallToolResult` so it passes
 * transparently through any downstream code that expects that format.
 * A `_meta` extension carries the artifact ID for structured extraction in
 * `redisConversationMemoryManager`.
 *
 * @module mcp/mcpOutputNormalizer
 */

import type { ArtifactStore, ArtifactRef } from "../artifacts/artifactStore.js";
import { generateToolOutputPreview } from "../context/toolOutputLimits.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/errorHandling.js";
import type {
  McpOutputNormalizerConfig,
  McpOutputContext,
  NormalizedMcpOutput,
} from "../types/mcpOutputTypes.js";

// Re-export so callers can import everything from one place
export type {
  McpOutputStrategy,
  McpOutputNormalizerConfig,
  McpOutputContext,
  NormalizedMcpOutput,
} from "../types/mcpOutputTypes.js";

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/** Default byte ceiling above which externalize fires (100 KB). */
export const DEFAULT_MAX_MCP_OUTPUT_BYTES = 100 * 1024;

/** Default byte threshold for emitting a warning while still inline (50 KB). */
export const DEFAULT_WARN_MCP_OUTPUT_BYTES = 50 * 1024;

/** Metadata key embedded in surrogate `_meta` and used by memory manager. */
export const NEUROLINK_ARTIFACT_ID_KEY = "neurolinkArtifactId";

// ---------------------------------------------------------------------------
// McpOutputNormalizer
// ---------------------------------------------------------------------------

/**
 * Stateless normalizer (state lives in the injected ArtifactStore).
 *
 * Construct once per NeuroLink instance and set via
 * `ToolDiscoveryService.setOutputNormalizer()`.
 */
export class McpOutputNormalizer {
  constructor(
    private readonly config: McpOutputNormalizerConfig,
    private readonly artifactStore?: ArtifactStore,
  ) {}

  /**
   * Measure `callResult`, apply strategy if oversized, return normalized output.
   *
   * Never throws: on any internal failure the raw result is returned unchanged
   * with a warning log so tool execution is never broken by the normalizer.
   */
  async normalize(
    callResult: unknown,
    context: McpOutputContext,
  ): Promise<NormalizedMcpOutput> {
    const serialized = serialize(callResult);
    const originalBytes = Buffer.byteLength(serialized, "utf-8");

    // Fast path: below warn threshold — always inline, no logging
    if (originalBytes <= this.config.warnBytes) {
      return { result: callResult, isExternalized: false, originalBytes };
    }

    // Between warn and max: emit a warning but keep inline regardless of strategy
    if (originalBytes <= this.config.maxBytes) {
      logger.warn(
        `[McpOutputNormalizer] Large MCP output from "${context.toolName}" on ` +
          `"${context.serverId}" (${formatBytes(originalBytes)}). ` +
          `Approaching limit of ${formatBytes(this.config.maxBytes)}.`,
        {
          toolName: context.toolName,
          serverId: context.serverId,
          originalBytes,
        },
      );
      return { result: callResult, isExternalized: false, originalBytes };
    }

    // Above max — apply strategy
    logger.warn(
      `[McpOutputNormalizer] MCP output from "${context.toolName}" on ` +
        `"${context.serverId}" exceeds limit ` +
        `(${formatBytes(originalBytes)} > ${formatBytes(this.config.maxBytes)}). ` +
        `Applying strategy "${this.config.strategy}".`,
      { toolName: context.toolName, serverId: context.serverId, originalBytes },
    );

    if (this.config.strategy === "inline") {
      // Caller explicitly opted in to inline regardless of size
      return { result: callResult, isExternalized: false, originalBytes };
    }

    // strategy === "externalize"
    if (!this.artifactStore) {
      // Misconfiguration: externalize was chosen but no store was provided.
      // Pass through inline so execution is never broken, but log loudly.
      logger.error(
        `[McpOutputNormalizer] strategy="externalize" but no ArtifactStore ` +
          `configured — passing through raw result for "${context.toolName}". ` +
          `Set mcp.outputLimits.strategy="externalize" and ensure the NeuroLink ` +
          `constructor creates a LocalTempArtifactStore.`,
      );
      return { result: callResult, isExternalized: false, originalBytes };
    }

    let ref: ArtifactRef;
    try {
      ref = await withTimeout(
        this.artifactStore.store(serialized, {
          toolName: context.toolName,
          serverId: context.serverId,
          sessionId: context.sessionId,
          sizeBytes: originalBytes,
          contentType: isJsonLike(callResult) ? "json" : "text",
        }),
        10_000,
        new Error(`ArtifactStore.store() timed out for "${context.toolName}"`),
      );
    } catch (err) {
      // Storage failure or timeout — pass through inline so the call doesn't break.
      logger.error(
        `[McpOutputNormalizer] ArtifactStore.store() failed for ` +
          `"${context.toolName}": ${err instanceof Error ? err.message : String(err)} ` +
          `— passing through raw result.`,
      );
      return { result: callResult, isExternalized: false, originalBytes };
    }

    // Generate a compact head/tail preview for the surrogate.
    // Cap at warnBytes so the surrogate itself is always well within limits.
    const { preview } = generateToolOutputPreview(serialized, {
      maxBytes: Math.min(this.config.warnBytes, DEFAULT_WARN_MCP_OUTPUT_BYTES),
    });

    return {
      result: buildSurrogate(preview, ref.id, context, originalBytes),
      isExternalized: true,
      artifactId: ref.id,
      originalBytes,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a compact MCP-shaped surrogate the LLM receives instead of the
 * raw oversized payload.
 *
 * Shape mirrors `CallToolResult` so downstream code that inspects
 * `result.content` keeps working unchanged.
 * `_meta` carries the artifact ID for structured extraction in
 * `redisConversationMemoryManager`.
 */
function buildSurrogate(
  preview: string,
  artifactId: string,
  context: McpOutputContext,
  originalBytes: number,
): unknown {
  const text =
    `[MCP Tool Output — ${context.toolName} | ${context.serverId}]\n` +
    `Original size: ${formatBytes(originalBytes)} | ` +
    `Externalized — use retrieve_context with artifactId="${artifactId}" ` +
    `to read the full output (supports offset + limit pagination)\n` +
    `\n--- Preview (head + tail) ---\n` +
    preview +
    `\n--- End Preview ---\n` +
    `[${NEUROLINK_ARTIFACT_ID_KEY}=${artifactId}]`;

  return {
    content: [{ type: "text" as const, text }],
    _meta: {
      [NEUROLINK_ARTIFACT_ID_KEY]: artifactId,
      originalBytes,
      toolName: context.toolName,
      serverId: context.serverId,
    },
  };
}

function serialize(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    // Compact JSON keeps byte measurement accurate and size enforcement honest.
    // Pretty-printing with null, 2 inflates every object by ~30–50 % and would
    // shift the externalization threshold relative to what the LLM actually
    // receives if the payload is ever inlined.
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isJsonLike(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

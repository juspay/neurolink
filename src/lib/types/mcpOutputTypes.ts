/**
 * MCP Output Normalizer Types (canonical location)
 *
 * Types for the large MCP response handling system.
 *
 * @module types/mcpOutputTypes
 */

/**
 * Two honest strategies for oversized MCP tool outputs:
 *  - "inline"      Full payload always sent to the model (warning logged above warnBytes).
 *  - "externalize" Full payload stored as an artifact; model receives a compact
 *                  surrogate with head/tail preview and an artifact ID it can
 *                  resolve via retrieve_context with offset/limit pagination.
 */
export type McpOutputStrategy = "inline" | "externalize";

/** Configuration for McpOutputNormalizer. */
export type McpOutputNormalizerConfig = {
  strategy: McpOutputStrategy;
  /** Byte ceiling above which the strategy fires. */
  maxBytes: number;
  /** Bytes at which a warning is emitted while still inline. */
  warnBytes: number;
};

/** Contextual info passed alongside the raw MCP callResult. */
export type McpOutputContext = {
  toolName: string;
  serverId: string;
  sessionId?: string;
};

/** Value returned by McpOutputNormalizer.normalize(). */
export type NormalizedMcpOutput = {
  /** The result to substitute for the raw callResult. May be a surrogate. */
  result: unknown;
  /** Whether the full payload was written to the artifact store. */
  isExternalized: boolean;
  /** Artifact ID when isExternalized === true. */
  artifactId?: string;
  /** Serialized byte size of the original payload. */
  originalBytes: number;
};

/**
 * Utility for building observability configs from environment variables
 */

import type { ObservabilityConfig } from "../types/observability.js";

/**
 * Build observability config from environment variables
 *
 * Reads Langfuse configuration from environment:
 * - LANGFUSE_ENABLED: Enable/disable Langfuse (must be "true")
 * - LANGFUSE_PUBLIC_KEY: Your Langfuse public key (required)
 * - LANGFUSE_SECRET_KEY: Your Langfuse secret key (required)
 * - LANGFUSE_BASE_URL: Langfuse server URL (default: https://cloud.langfuse.com)
 * - LANGFUSE_ENVIRONMENT: Environment name (default: dev)
 * - PUBLIC_APP_VERSION: Release/version identifier (default: v1.0.0)
 *
 * @returns ObservabilityConfig if all required env vars are set, undefined otherwise
 *
 * @example
 * ```typescript
 * import { NeuroLink, buildObservabilityConfigFromEnv } from '@juspay/neurolink';
 *
 * const neurolink = new NeuroLink({
 *   observability: buildObservabilityConfigFromEnv()
 * });
 * ```
 */
export function buildObservabilityConfigFromEnv():
  | ObservabilityConfig
  | undefined {
  const langfuseEnabled =
    process.env.LANGFUSE_ENABLED?.trim().toLowerCase() === "true";
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();

  if (!langfuseEnabled || !publicKey || !secretKey) {
    return undefined;
  }

  return {
    langfuse: {
      enabled: langfuseEnabled,
      publicKey,
      secretKey,
      baseUrl:
        process.env.LANGFUSE_BASE_URL?.trim() || "https://cloud.langfuse.com",
      environment:
        process.env.LANGFUSE_ENVIRONMENT?.trim() ||
        process.env.PUBLIC_APP_ENVIRONMENT?.trim() ||
        "dev",
      release:
        process.env.PUBLIC_APP_VERSION?.trim() ||
        process.env.npm_package_version?.trim() ||
        "v1.0.0",
    },
  };
}

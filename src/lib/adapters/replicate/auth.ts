/**
 * Replicate Auth Helper
 *
 * Resolves the Replicate API token + base URL from per-call overrides,
 * instance credentials, or env vars. Used by every Replicate-backed
 * handler (LLM, video, avatar, music) so the auth chain is centralised.
 *
 * @module adapters/replicate/auth
 */

import type { ReplicateAuth } from "../../types/index.js";

const DEFAULT_BASE_URL = "https://api.replicate.com";

/**
 * Resolve Replicate auth from override → env vars.
 *
 * Returns `null` when `REPLICATE_API_TOKEN` is missing AND no override is
 * provided. Handlers' `isConfigured()` check `auth !== null`.
 *
 * @param override - per-call or instance-level credentials slice
 */
export function getReplicateAuth(
  override?: Partial<ReplicateAuth>,
): ReplicateAuth | null {
  const apiToken = (
    override?.apiToken ??
    process.env.REPLICATE_API_TOKEN ??
    ""
  ).trim();
  if (!apiToken) {
    return null;
  }
  return {
    apiToken,
    baseUrl: (
      override?.baseUrl ??
      process.env.REPLICATE_BASE_URL ??
      DEFAULT_BASE_URL
    ).replace(/\/$/, ""),
  };
}

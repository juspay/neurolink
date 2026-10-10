/**
 * Capability-based and env-based skip helpers.
 *
 * All helpers throw `Skip(reason)` when the gate fails. The harness's
 * `test()` runner catches Skip and reports SKIP rather than FAIL.
 *
 * Re-exports `skipIfEnvMissing` from envGuard.ts as `skipUnlessEnv` (more
 * grammatical name) for use inside test bodies.
 */
import { Skip } from "./harness.js";
import {
  PROVIDERS,
  hasProviderEnv,
  type Capabilities,
  type ProviderEntry,
} from "./providerMatrix.js";

/** Throw Skip if any of the listed env vars are unset/empty. */
export function skipUnlessEnv(...vars: string[]): void {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Skip(`missing env: ${missing.join(", ")}`);
  }
}

/** Throw Skip unless the provider's env vars are all populated. */
export function skipUnlessProviderAvailable(providerName: string): void {
  const entry = PROVIDERS[providerName];
  if (!entry) {
    throw new Skip(`unknown provider: ${providerName}`);
  }
  if (!hasProviderEnv(providerName)) {
    const missing = entry.envVars.filter((v) => !process.env[v]);
    throw new Skip(
      missing.length > 0
        ? `provider ${providerName} unavailable: missing env ${missing.join(", ")}`
        : `provider ${providerName} is never treated as available (see hasProviderEnv in test/helpers/providerMatrix.ts)`,
    );
  }
}

/** Throw Skip unless the provider supports the given capability. */
export function skipUnlessCapability(
  providerName: string,
  capability: keyof Capabilities,
): void {
  const entry = PROVIDERS[providerName];
  if (!entry) {
    throw new Skip(`unknown provider: ${providerName}`);
  }
  if (!entry[capability]) {
    throw new Skip(`${providerName} does not support ${capability}`);
  }
}

/** Combined: env-available AND supports the capability. */
export function skipUnlessProviderHas(
  providerName: string,
  capability: keyof Capabilities,
): void {
  skipUnlessProviderAvailable(providerName);
  skipUnlessCapability(providerName, capability);
}

// ---------------------------------------------------------------------------
// Capability shortcuts
// ---------------------------------------------------------------------------

export const skipUnlessTools = (p: string): void =>
  skipUnlessCapability(p, "tools");
export const skipUnlessStreaming = (p: string): void =>
  skipUnlessCapability(p, "streaming");
export const skipUnlessVision = (p: string): void =>
  skipUnlessCapability(p, "vision");
export const skipUnlessEmbeddings = (p: string): void =>
  skipUnlessCapability(p, "embeddings");
export const skipUnlessThinking = (p: string): void =>
  skipUnlessCapability(p, "thinking");
export const skipUnlessStructuredOutput = (p: string): void =>
  skipUnlessCapability(p, "structuredOutput");
export const skipUnlessImageGen = (p: string): void =>
  skipUnlessCapability(p, "imageGeneration");
export const skipUnlessVideoGen = (p: string): void =>
  skipUnlessCapability(p, "videoGeneration");
export const skipUnlessTTS = (p: string): void =>
  skipUnlessCapability(p, "tts");

// ---------------------------------------------------------------------------
// Infrastructure gates
// ---------------------------------------------------------------------------

/** Throw Skip when Redis is not reachable on localhost (or REDIS_URL host). */
export async function skipUnlessRedis(): Promise<void> {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const u = new URL(url);
  const host = u.hostname;
  const port = Number(u.port || 6379);
  // Light-touch TCP probe; avoids pulling in `redis` as a hard dep.
  const net = await import("node:net");
  await new Promise<void>((resolve, reject) => {
    const s = net.createConnection({ host, port, timeout: 1500 });
    s.once("connect", () => {
      s.end();
      resolve();
    });
    s.once("timeout", () => {
      s.destroy();
      reject(new Skip(`Redis not reachable at ${host}:${port}`));
    });
    s.once("error", () => {
      reject(new Skip(`Redis not reachable at ${host}:${port}`));
    });
  });
}

/** Skip when LiteLLM gateway is not configured. */
export function skipUnlessLiteLLM(): void {
  skipUnlessEnv("LITELLM_BASE_URL");
}

// ---------------------------------------------------------------------------
// Helpers for matrix bodies
// ---------------------------------------------------------------------------

/**
 * Iterate every provider for a given capability. Each call invokes `body`
 * with the provider entry; body should call `skipUnlessProviderAvailable`
 * inside if it needs to actually run code.
 */
export function forEachProviderWith(
  capability: keyof Capabilities,
  body: (entry: ProviderEntry) => Promise<void> | void,
): Array<Promise<void> | void> {
  const entries = Object.values(PROVIDERS).filter((p) => p[capability]);
  return entries.map((e) => body(e));
}

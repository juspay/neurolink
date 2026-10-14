/** Internal native-diagnostic policy; inference and provider selection are separate. */
import { logger } from "./logger.js";
import { DEFAULT_OLLAMA_MODEL } from "../providers/ollama/constants.js";
import { redactUrlsInText } from "./logSanitize.js";
import type {
  OllamaDiagnosticContext,
  OllamaDiagnosticGate,
  OllamaDiagnosticOutcome,
  OllamaDiagnosticPermit,
  OllamaDiagnosticSnapshot,
  OllamaDiagnosticState,
} from "../types/index.js";

export const OLLAMA_DIAGNOSTIC_RESET_MS = 300000;

let validatedFailureThreshold: number | undefined;

/**
 * Validate the shared failure threshold once and reuse that first-use value.
 * Missing or invalid PROVIDER_FAILURE_THRESHOLD values use the existing default
 * of three; ProviderHealthChecker retains its original initialization point.
 */
export function getValidatedProviderFailureThreshold(): number {
  if (validatedFailureThreshold !== undefined) {
    return validatedFailureThreshold;
  }
  const envValue = process.env.PROVIDER_FAILURE_THRESHOLD;
  if (!envValue) {
    validatedFailureThreshold = 3;
    return validatedFailureThreshold;
  }
  const parsed = Number(envValue);
  if (isNaN(parsed) || parsed <= 0 || parsed > 10) {
    logger.warn(
      `Invalid PROVIDER_FAILURE_THRESHOLD: ${envValue} (must be between 1 and 10), using default: 3`,
    );
    validatedFailureThreshold = 3;
    return validatedFailureThreshold;
  }
  validatedFailureThreshold = parsed;
  return validatedFailureThreshold;
}

/** Return diagnostic error text with URL secrets redacted for logs and status. */
export function getOllamaDiagnosticErrorMessage(error: unknown): string {
  return redactUrlsInText(
    error instanceof Error ? error.message : String(error),
  );
}

const states = new Map<string, OllamaDiagnosticState>();
const completed = new WeakSet<OllamaDiagnosticPermit>();
let clearGeneration = 0;

/**
 * Normalize an endpoint identity without its fragment, retaining path and query.
 * The key can contain credentials and must remain private like the source URL.
 */
export function getOllamaDiagnosticEndpointKey(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
}

/**
 * Resolve native /api/tags at the configured Ollama origin, independently of a
 * compatible /v1 base path. OLLAMA_BASE_URL precedes the legacy OLLAMA_API_BASE
 * alias, then localhost; malformed URLs and non-HTTP(S) schemes are rejected.
 */
export function resolveOllamaNativeTagsUrl(): string {
  const base =
    process.env.OLLAMA_BASE_URL ||
    process.env.OLLAMA_API_BASE ||
    "http://localhost:11434";
  const resolved = new URL("/api/tags", base);
  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
    throw new Error(
      "Invalid OLLAMA_BASE_URL format (OLLAMA_API_BASE is still accepted as a legacy alias)",
    );
  }
  resolved.hash = "";
  return resolved.toString();
}

/**
 * Capture endpoint identity and model before asynchronous diagnostic work.
 * Later environment changes cannot retarget this context or its health-cache
 * identity; failure accounting remains shared by endpoint rather than model.
 */
export function captureOllamaDiagnosticContext(
  model: string = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
): OllamaDiagnosticContext {
  const url = resolveOllamaNativeTagsUrl();
  return { url, key: getOllamaDiagnosticEndpointKey(url), model };
}

/**
 * Initialize endpoint state or expire failures five minutes after the latest one.
 * Expiry clears the count/timestamp and advances revision, retaining generation
 * so existing in-flight permits remain valid. Only an explicit clear changes
 * generation and invalidates those permits.
 */
function getState(context: OllamaDiagnosticContext): OllamaDiagnosticState {
  let state = states.get(context.key);
  if (!state) {
    state = {
      count: 0,
      lastFailureAt: undefined,
      revision: 0,
      generation: clearGeneration,
    };
    states.set(context.key, state);
  }
  if (
    state.lastFailureAt !== undefined &&
    Date.now() - state.lastFailureAt >= OLLAMA_DIAGNOSTIC_RESET_MS
  ) {
    // This is a fixed-window expiry, not an outcome from a cache hit/probe.
    state.count = 0;
    state.lastFailureAt = undefined;
    state.revision++;
  }
  return state;
}

/**
 * Copy the current policy state after applying initialization or timed expiry.
 * This observation issues no request and records neither failure nor recovery.
 */
export function getOllamaDiagnosticSnapshot(
  context: OllamaDiagnosticContext,
): OllamaDiagnosticSnapshot {
  return { ...getState(context) };
}

/**
 * Admit a native probe or report backoff at the current failure threshold.
 * Timed expiry is applied before this decision. Admission captures the clear
 * generation without reserving a request or recording an outcome; callers must
 * record the actual outcome on completion.
 */
export function beginOllamaDiagnostic(
  context: OllamaDiagnosticContext,
): OllamaDiagnosticGate {
  const state = getState(context);
  if (state.count >= getValidatedProviderFailureThreshold()) {
    return {
      kind: "suppressed",
      count: state.count,
      reason: `Ollama native diagnostic backed off after ${state.count} consecutive transport failures`,
      generation: state.generation,
    };
  }
  return { kind: "allowed", context, generation: state.generation };
}

/**
 * Apply timed expiry, then an admitted outcome once to the latest endpoint state.
 * Transport/protocol failures increment its current count; success clears a
 * nonzero count; not-run records no outcome. Timed expiry preserves permits,
 * including those admitted before the boundary and completed after it.
 * Duplicate permits and permits invalidated by explicit clearing are ignored.
 *
 * @returns A copy of the resulting state, or undefined for an ignored permit.
 */
export function completeOllamaDiagnostic(
  attempt: OllamaDiagnosticPermit,
  outcome: OllamaDiagnosticOutcome,
): OllamaDiagnosticSnapshot | undefined {
  if (completed.has(attempt)) {
    return undefined;
  }
  completed.add(attempt);
  const storedState = states.get(attempt.context.key);
  if (!storedState || storedState.generation !== attempt.generation) {
    return undefined; // Explicit clearing invalidated this in-flight token.
  }
  const state = getState(attempt.context);
  if (outcome === "transport-failure" || outcome === "protocol-failure") {
    // Read and increment the latest completed state, never the starting count.
    state.count++;
    state.lastFailureAt = Date.now();
    state.revision++;
  } else if (outcome === "success" && state.count !== 0) {
    state.count = 0;
    state.lastFailureAt = undefined;
    state.revision++;
  }
  // Only admitted probes may reach this function. not-run cannot claim failure
  // or recovery; genuine success while already clear retains the cache revision.
  return { ...state };
}

/**
 * Clear every endpoint and advance generation, invalidating in-flight permits.
 * Unlike timed expiry, this prevents an older completion from repopulating state.
 */
export function clearOllamaDiagnostics(): void {
  clearGeneration++;
  states.clear();
}

/**
 * Separate cached health by captured endpoint and model without splitting the
 * endpoint-wide diagnostic counter. This private key can contain URL secrets.
 */
export function getOllamaHealthCacheKey(
  context: OllamaDiagnosticContext,
): string {
  return JSON.stringify(["ollama", context.key, context.model]);
}

export class OllamaProtocolError extends Error {
  /** Identify an answered tags response whose models envelope is malformed. */
  constructor() {
    super("Invalid models format from Ollama API");
    this.name = "OllamaProtocolError";
  }
}

/**
 * Require an object containing a models array, including an empty array.
 * Individual model entries are left to existing normalization; a malformed
 * envelope throws OllamaProtocolError rather than appearing as no models.
 */
export function readOllamaTagsModels(payload: unknown): unknown[] {
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !("models" in payload) ||
    !Array.isArray(payload.models)
  ) {
    throw new OllamaProtocolError();
  }
  return payload.models;
}

/**
 * Bedrock cross-region inference profile resolution.
 *
 * Most current Bedrock models cannot be invoked by their bare model id. Each
 * model card carries a Regional Availability table with three columns, and for
 * a great many model/region pairs the In-Region column is "No" — Claude Opus
 * 4.5 is No in every region AWS lists, Sonnet 4.6 is Yes only in eu-west-2.
 * Those models are reachable only through a cross-region inference profile: the
 * same id with a geography prefix (`us.`, `eu.`, `au.`, `jp.`, `apac.`) or the
 * worldwide `global.` prefix.
 *
 * Sending the bare id where In-Region is No fails with a ValidationException
 * telling you to use an inference profile. This module detects that specific
 * failure and works out which prefixed id to retry with.
 *
 * ## Why prefixes are derived rather than tabulated
 *
 * The obvious implementation — a table of model to supported prefixes — is the
 * one to avoid. The prefix set is per-model, not per-region: from the same
 * caller region `ap-northeast-1`, Claude Opus 4.5 accepts only `global.`,
 * Sonnet 4.5 also accepts `jp.`, and Haiku 4.5 works bare. A static table
 * would need a row per model per region and would be wrong the day a model
 * ships. AWS itself moved this data out of a central page and onto each
 * model's detail page for the same reason.
 *
 * So resolution is empirical: on the specific error, try the geography that
 * covers the caller's region, then `global.`, and remember what worked.
 *
 * `bedrock:ListInferenceProfiles` would give an authoritative answer, but it
 * is a control-plane call needing a separate SDK client and an IAM permission
 * a caller with plain inference access will not necessarily hold. Deriving
 * candidates needs neither, and costs at most two extra attempts once per
 * model/region pair.
 */

import { logger } from "../../utils/logger.js";

/**
 * Geography prefixes, in the order AWS documents them. `global.` is not a
 * geography — it routes anywhere and is tried last, as the broadest option.
 */
const GLOBAL_PREFIX = "global";

/**
 * Maps an AWS region to the geography whose inference profile covers it.
 *
 * Derived from the Geo inference tables on the model cards: the US geography
 * covers `us-*` plus the Canadian regions, EU covers `eu-*` plus Israel, the
 * Middle East and Africa, Japan covers the two Japanese regions, and Australia
 * covers Sydney, Melbourne and New Zealand. Everything else in Asia Pacific
 * falls under `apac`.
 */
function geoPrefixForRegion(region: string): string | undefined {
  if (/^(us|ca)-/.test(region)) {
    return "us";
  }
  if (/^(eu|il|me|af)-/.test(region)) {
    return "eu";
  }
  if (/^ap-northeast-[13]$/.test(region)) {
    return "jp";
  }
  if (/^ap-southeast-[246]$/.test(region)) {
    return "au";
  }
  if (/^ap-/.test(region)) {
    return "apac";
  }
  return undefined;
}

/** True when `modelId` already carries a geography or global prefix. */
function hasProfilePrefix(modelId: string): boolean {
  return /^(us|eu|au|jp|apac|global)\./.test(modelId);
}

/**
 * Does this error mean "this model needs an inference profile in this region"?
 *
 * Deliberately narrow. A ValidationException covers many unrelated causes —
 * a malformed body, an unknown parameter, a model the account has no access to
 * — and retrying those with a different model id would turn one clear failure
 * into two confusing ones. Both the exception name and the distinctive phrase
 * must match.
 *
 * The phrase is matched loosely enough to survive AWS rewording the sentence
 * around it, and the retry is a no-op when nothing resolves, so a miss here
 * costs nothing beyond the original error surfacing unchanged — which is the
 * behaviour without this module at all.
 */
export function isInferenceProfileRequiredError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as { name?: unknown; message?: unknown };
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message =
    typeof candidate.message === "string" ? candidate.message : "";
  if (
    !/ValidationException/i.test(name) &&
    !/ValidationException/i.test(message)
  ) {
    return false;
  }
  return (
    /inference profile/i.test(message) && /on-demand throughput/i.test(message)
  );
}

/**
 * Candidate ids to retry, most specific first: the caller's own geography,
 * then worldwide.
 *
 * Returns an empty array when the id already carries a prefix — a prefixed id
 * that still fails is a real error, not something to re-prefix.
 */
export function inferenceProfileCandidates(
  modelId: string,
  region: string,
): string[] {
  // An ARN already names a concrete model or inference-profile resource, and
  // this provider accepts one as a model id (see `extractRegionFromArn`).
  // Prefixing it yields a malformed identifier whose ValidationException would
  // then replace the original, accurate error.
  if (modelId.startsWith("arn:") || hasProfilePrefix(modelId)) {
    return [];
  }
  const candidates: string[] = [];
  const geo = geoPrefixForRegion(region);
  if (geo) {
    candidates.push(`${geo}.${modelId}`);
  }
  candidates.push(`${GLOBAL_PREFIX}.${modelId}`);
  return candidates;
}

/**
 * Remembers which id actually worked, keyed by region and bare model id, so
 * the probing happens once rather than on every call.
 */
const resolved = new Map<string, string>();

function cacheKey(region: string, modelId: string): string {
  return `${region}::${modelId}`;
}

/** The id that previously worked for this model in this region, if any. */
export function getResolvedModelId(
  modelId: string,
  region: string,
): string | undefined {
  return resolved.get(cacheKey(region, modelId));
}

export function rememberResolvedModelId(
  modelId: string,
  region: string,
  resolvedId: string,
): void {
  resolved.set(cacheKey(region, modelId), resolvedId);
  logger.debug(
    "[Bedrock] Cached inference-profile resolution for subsequent calls",
    { region },
  );
}

/** Exposed so tests can start from a known state. */
export function clearResolvedModelIds(): void {
  resolved.clear();
}

/**
 * Run `send` against the given model id, falling back to inference-profile
 * ids if — and only if — Bedrock says the bare id needs one.
 *
 * A previously resolved id is used straight away. Any error other than the
 * inference-profile one propagates untouched on the first attempt, so this
 * cannot mask an unrelated failure or silently change behaviour for a caller
 * whose bare ids already work.
 */
export async function withInferenceProfileFallback<T>(
  modelId: string,
  region: string,
  send: (effectiveModelId: string) => Promise<T>,
): Promise<T> {
  const cached = getResolvedModelId(modelId, region);
  if (cached && cached !== modelId) {
    return send(cached);
  }

  try {
    return await send(modelId);
  } catch (error) {
    if (!isInferenceProfileRequiredError(error)) {
      throw error;
    }
    const candidates = inferenceProfileCandidates(modelId, region);
    if (candidates.length === 0) {
      throw error;
    }
    logger.warn(
      "[Bedrock] Model requires a cross-region inference profile in this region; retrying with a prefixed id",
      { region, candidates: candidates.length },
    );
    for (const candidate of candidates) {
      try {
        const result = await send(candidate);
        rememberResolvedModelId(modelId, region, candidate);
        return result;
      } catch (retryError) {
        if (!isInferenceProfileRequiredError(retryError)) {
          // A different failure against the prefixed id — for example the
          // account lacking access to that geography — is the more
          // informative error, so surface it rather than the original.
          throw retryError;
        }
      }
    }
    throw error;
  }
}

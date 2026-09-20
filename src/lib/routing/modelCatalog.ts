/**
 * The model catalogue — turning the registry into a routable pool.
 *
 * `ClassifierRouter` has always taken a host-declared `pool`, because the set
 * of models a host is *willing to be billed for* is not something NeuroLink
 * can invent. But the registry already knows 64 models across 7 providers
 * (132 aliases), each carrying a context window, in/out pricing, speed and
 * quality buckets, capability flags and seven 1–10 use-case scores — and
 * routing read none of it beyond cost and quality. `maxContextTokens` in
 * particular was never read anywhere.
 *
 * The registry covers 7 of the 40 registered providers, so the catalogue is
 * an addition to a declared pool, never a replacement: a host routing over
 * LiteLLM, OpenRouter or a self-hosted model still declares those by hand,
 * and `enrichCandidate` ranks declared and catalogue members on one scale.
 *
 * This module closes that gap for hosts that opt in (`catalog.enabled`): it
 * builds pool members from the registry, intersected with the credentials
 * actually present, and renders each as one line for a decision model to rank.
 *
 * Two constraints shape everything here:
 *
 * 1. **The rendered catalogue is a question, not state.** A decision model's
 *    binding limit is `state + the single longest question`, and the model
 *    choice question's `criteria` map is that question. Rendering has to stay
 *    terse and the count has to stay capped.
 * 2. **A deterministic ranker must exist first.** Every other decision
 *    consumer falls back to what the code did before, but there was no
 *    "pick from the whole registry" behaviour to fall back to.
 *    {@link rankCatalogue}
 *    is that fallback, and it runs whenever no decision provider is
 *    configured, the call fails, or the verdict is not confident enough.
 *
 * @module routing/modelCatalog
 */

import { getAllModels } from "../models/modelRegistry.js";
import { PROVIDER_DESCRIPTORS } from "../factories/providerDescriptors.js";
import { DEFAULT_INFERENCE_KINDS } from "../types/index.js";
import type {
  ClassifierCandidate,
  ClassifierCatalogConfig,
  ClassifierDifficulty,
  ClassifierRouterInput,
  ClassifierRouterPoolMember,
  ModelInfo,
  ProviderDescriptor,
} from "../types/index.js";

/**
 * Default cap on catalogue members. ~40 tokens per rendered line puts 120
 * models near 5K tokens, comfortably inside the ~33K state-plus-longest-
 * question ceiling even alongside a long request.
 */
const DEFAULT_MAX_MODELS = 120;

/** Registry buckets mapped to comparable numbers. */
const QUALITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };
const SPEED_RANK: Record<string, number> = { fast: 3, medium: 2, slow: 1 };

/**
 * Which use-case dimension each difficulty tier cares about, and how much
 * weight to give quality against cost.
 *
 * `costWeight` is what makes the fallback ranker a real ranker rather than a
 * sort by price: at `trivial` the cheapest adequate model wins outright, at
 * `expert` price is nearly irrelevant.
 */
const TIER_PROFILE: Record<
  ClassifierDifficulty,
  { dimension: keyof ModelInfo["useCases"]; costWeight: number }
> = {
  trivial: { dimension: "conversation", costWeight: 1 },
  simple: { dimension: "conversation", costWeight: 0.7 },
  moderate: { dimension: "coding", costWeight: 0.4 },
  hard: { dimension: "reasoning", costWeight: 0.15 },
  expert: { dimension: "reasoning", costWeight: 0.05 },
};

/**
 * Whether this host can actually call the provider.
 *
 * Deliberately permissive in two directions. A provider whose credentials
 * resolve through an external chain (Bedrock's AWS default chain, Vertex's
 * several auth paths) cannot be decided from env-var presence, so it is kept
 * — the worst case is a candidate that later fails and falls back. A local
 * runtime with no credential at all (Ollama, LM Studio) is likewise kept.
 * What this filter removes is the large majority: cloud providers with a
 * single named key that is simply not set.
 */
function providerIsReachable(descriptor: ProviderDescriptor): boolean {
  if (descriptor.envVars.optional || descriptor.localRuntime) {
    return true;
  }
  if (descriptor.credentialsResolvedExternally) {
    return true;
  }
  const names = [
    descriptor.envVars.apiKey,
    ...(descriptor.envVars.fallbacks ?? []),
  ].filter((n): n is string => typeof n === "string");
  if (names.length === 0) {
    return true;
  }
  return names.some((name) => (process.env[name] ?? "").trim() !== "");
}

/** Provider names this host has credentials for AND that generate text. */
export function reachableTextProviders(): Set<string> {
  const reachable = new Set<string>();
  for (const descriptor of PROVIDER_DESCRIPTORS) {
    const kinds = descriptor.inferenceKinds ?? DEFAULT_INFERENCE_KINDS;
    if (!kinds.includes("generate")) {
      continue;
    }
    if (providerIsReachable(descriptor)) {
      reachable.add(descriptor.name);
    }
  }
  return reachable;
}

/** Capability tags, in the vocabulary the classifier and router already use. */
function capabilityTags(model: ModelInfo): string[] {
  const tags: string[] = [];
  if (model.capabilities.vision) {
    tags.push("vision");
  }
  if (model.capabilities.functionCalling) {
    tags.push("tools");
  }
  if (model.capabilities.reasoning) {
    tags.push("reasoning");
  }
  if (model.capabilities.codeGeneration) {
    tags.push("code");
  }
  if (model.capabilities.multimodal) {
    tags.push("multimodal");
  }
  return tags;
}

/**
 * Score a model for a difficulty tier, 0–1 where higher is better.
 *
 * Combines the registry's own use-case suitability for the tier's dimension
 * with its quality bucket, then discounts by price. Purely deterministic —
 * this is the ordering used when no decision model is available, and the
 * ordering the decision model's own pick is compared against.
 */
function tierScore(model: ModelInfo, difficulty: ClassifierDifficulty): number {
  const profile = TIER_PROFILE[difficulty];
  const suitability = (model.useCases[profile.dimension] ?? 5) / 10;
  const quality = (QUALITY_RANK[model.performance.quality] ?? 2) / 3;
  const speed = (SPEED_RANK[model.performance.speed] ?? 2) / 3;

  // Price per 1K input, squashed into 0–1 where 0 is free and 1 is expensive.
  // $0.02/1K is roughly the top of the current frontier band, so the curve is
  // scaled to saturate a little past it rather than at an arbitrary maximum.
  const price = model.pricing.inputCostPer1K + model.pricing.outputCostPer1K;
  const priceFactor = Math.min(1, price / 0.06);

  const merit = suitability * 0.5 + quality * 0.35 + speed * 0.15;
  return merit - priceFactor * profile.costWeight;
}

/**
 * Rank a member the registry has never heard of, on the SAME scale
 * `tierScore` produces, so declared and catalogue members interleave rather
 * than one bucket always sorting after the other.
 *
 * The `/ 3` mirrors `tierScore`'s `QUALITY_RANK[...] / 3`: the registry's
 * quality is a 1–3 rank, and the divisor is what puts it on 0–1. A host's
 * `quality`, though, is an unbounded relative scale — the type says only
 * "higher is more capable", and a pool declaring `cost: 20` for "the expensive
 * one" makes `quality: 10` just as plausible. Divided by 3 that is 3.33, which
 * is off the top of the scale every registry candidate is confined to, so a
 * single generous declaration would outrank the entire catalogue at every
 * difficulty — including tiers the host never meant that model for.
 *
 * Clamping into the 1–3 band the divisor assumes keeps the comparison honest.
 * It does saturate: a pool declaring quality 1–10 loses the ordering above 3.
 * That is the right trade against a member that silently wins everything, and
 * a host wanting finer control has `tiers`, which is exact rather than scored.
 */
function declaredScore(
  member: ClassifierRouterPoolMember,
  difficulty: ClassifierDifficulty,
): number {
  const quality = Math.min(3, Math.max(0, member.quality ?? 2)) / 3;
  const priceFactor = Math.min(1, Math.max(0, member.cost ?? 0) / 0.06);
  return quality - priceFactor * TIER_PROFILE[difficulty].costWeight;
}

/**
 * Rank candidates deterministically for a difficulty. The fallback that makes
 * the catalogue safe to enable: with no decision provider configured this is
 * the whole selection, and it never consults the network.
 *
 * `requiredCapabilities` filters leniently — a candidate with no recorded
 * capabilities is kept rather than starving the pool on missing metadata,
 * matching `ClassifierRouter.filterByCapabilities`.
 */
export function rankCatalogue(
  candidates: readonly ClassifierCandidate[],
  difficulty: ClassifierDifficulty,
  input?: Pick<ClassifierRouterInput, "estimatedInputTokens">,
  requiredCapabilities?: readonly string[],
): ClassifierCandidate[] {
  const needed = requiredCapabilities ?? [];
  const capable = candidates.filter((c) => {
    if (needed.length === 0 || !c.capabilities || c.capabilities.length === 0) {
      return true;
    }
    return needed.every((cap) => c.capabilities?.includes(cap));
  });
  const pool = capable.length > 0 ? capable : [...candidates];

  // A model that cannot hold the request is not a cheaper option, it is a
  // failed one — and a context_window error puts the model in ModelPool's
  // permanent (10-year) cooldown, so this filter is load-bearing rather than
  // an optimisation. Applied only when it leaves something behind.
  const needTokens = input?.estimatedInputTokens ?? 0;
  const fits =
    needTokens > 0
      ? pool.filter(
          (c) => c.contextWindow === undefined || c.contextWindow >= needTokens,
        )
      : pool;
  const finalPool = fits.length > 0 ? fits : pool;

  const originalIndex = new Map(finalPool.map((c, i) => [c, i] as const));
  return [...finalPool].sort((a, b) => {
    const delta = (b.score ?? 0) - (a.score ?? 0);
    if (delta !== 0) {
      return delta;
    }
    return (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0);
  });
}

/**
 * Build catalogue pool members from the registry.
 *
 * Returns `[]` when the catalogue is disabled or nothing is reachable, which
 * leaves the declared pool as the only source — the pre-catalogue behaviour.
 */
export function buildModelCatalog(
  config?: ClassifierCatalogConfig,
): ClassifierRouterPoolMember[] {
  if (!config?.enabled) {
    return [];
  }
  const allowed = config.providers ? new Set(config.providers) : undefined;
  const reachable = reachableTextProviders();
  const minWindow = config.minContextWindow ?? 0;

  const eligible = getAllModels().filter((model) => {
    if (!config.includeDeprecated && model.deprecated) {
      return false;
    }
    if (!reachable.has(model.provider)) {
      return false;
    }
    if (allowed && !allowed.has(model.provider)) {
      return false;
    }
    return model.limits.maxContextTokens >= minWindow;
  });

  // Cap by a tier-neutral merit score so the truncation keeps the models most
  // likely to be useful rather than whichever the registry happened to list
  // first. "moderate" is the neutral tier the classifier itself measures
  // upgrades and downgrades against.
  const capped = [...eligible]
    .sort((a, b) => tierScore(b, "moderate") - tierScore(a, "moderate"))
    .slice(0, config.maxModels ?? DEFAULT_MAX_MODELS);

  // Deliberately NO `cost` / `quality` here, though both are trivially
  // available. Those two fields are how a HOST states its own opinion about a
  // model, and `renderCandidate` gives a host's opinion precedence over the
  // registry's. Copying registry values into them would make every catalogue
  // member look hand-declared: the rich registry line (real price in cents,
  // speed, quality bucket, "strong at …") would be suppressed in favour of
  // `relative cost 0.002`, which is raw per-1K pricing wearing a relative
  // label — meaningless to compare against a host's `cost: 20`, and it would
  // discard the use-case scores the catalogue exists to surface.
  //
  // Leaving them undefined loses nothing: `ClassifierRouter.metaFor` and
  // `enrichCandidate` both resolve straight back to the registry by model id.
  return capped.map((model) => ({
    provider: model.provider,
    model: model.id,
    id: `${model.provider}/${model.id}`,
    description: model.description,
    capabilities: capabilityTags(model),
  }));
}

/**
 * Enrich a pool member into a classifier candidate, pulling registry metadata
 * the member did not declare.
 *
 * Works for any pool, catalogue-derived or hand-declared: a host that listed
 * `{ provider: "openai", model: "gpt-4o" }` gets the same context window and
 * pricing as a catalogue entry, because both resolve through the registry.
 * Members the registry does not know (LiteLLM, self-hosted) keep exactly what
 * the host declared and are still rankable — `tierScore` falls back to
 * neutral values rather than dropping them.
 */
export function enrichCandidate(
  id: string,
  member: ClassifierRouterPoolMember,
  difficulty: ClassifierDifficulty,
  registry?: Map<string, ModelInfo>,
): ClassifierCandidate {
  const info = member.model ? registry?.get(member.model) : undefined;
  const candidate: ClassifierCandidate = {
    id,
    provider: member.provider,
    model: member.model,
    description: member.description ?? info?.description,
    tiers: member.tiers,
    capabilities:
      member.capabilities ?? (info ? capabilityTags(info) : undefined),
    contextWindow: info?.limits.maxContextTokens,
    // Registry pricing ONLY. `member.cost` is documented as a *relative*
    // scale ("lower = cheaper"), so a host writing `cost: 20` to mean "the
    // expensive one" would otherwise be rendered to the model as $20 per 1K
    // input tokens — a number three orders of magnitude off, and one it would
    // rightly refuse to pick. The relative value still drives the
    // deterministic score below, where it is compared only against other
    // relative values.
    inputCostPer1K: info?.pricing.inputCostPer1K,
    outputCostPer1K: info?.pricing.outputCostPer1K,
    speed: info?.performance.speed,
    quality: info?.performance.quality,
    useCases: info?.useCases,
    relativeCost: member.cost,
    relativeQuality: member.quality,
  };
  candidate.score = info
    ? tierScore(info, difficulty)
    : declaredScore(member, difficulty);
  return candidate;
}

/** Index the registry by model id once per build, for `enrichCandidate`. */
export function buildRegistryIndex(): Map<string, ModelInfo> {
  const index = new Map<string, ModelInfo>();
  for (const model of getAllModels()) {
    index.set(model.id, model);
    for (const alias of model.aliases) {
      if (!index.has(alias)) {
        index.set(alias, model);
      }
    }
  }
  return index;
}

/**
 * Render one candidate as a single criteria line for the decision model.
 *
 * Terse on purpose: this text is multiplied by the candidate count inside a
 * single question, and that question competes with the request for the
 * ~33K ceiling. Numbers are rendered in units a reader can compare at a
 * glance (K tokens, ¢ per 1K) because a decision model reads digits as text
 * and does better with "128K" than with "131072".
 */
export function renderCandidate(candidate: ClassifierCandidate): string {
  const parts: string[] = [];
  if (candidate.description) {
    parts.push(candidate.description);
  }
  // The host's declared tier eligibility is the most direct statement it can
  // make about where a model belongs, so it goes in early and is never
  // suppressed.
  if (candidate.tiers?.length) {
    parts.push(`intended for ${candidate.tiers.join("/")} tasks`);
  }
  // Objective facts, safe to state regardless of who declared what.
  if (candidate.contextWindow) {
    parts.push(`${Math.round(candidate.contextWindow / 1000)}K context`);
  }

  // Precedence, and the reason for it. When a host declares `cost`/`quality`
  // it is ranking the models *in its own pool* — and the registry frequently
  // disagrees, because it rates a model on general benchmarks rather than on
  // the job this host uses it for. Rendering both put five registry clauses
  // ("high quality", "strong at reasoning", a low price) against one line of
  // host prose, and the host lost every time: a pool that explicitly marked
  // a cheap model `quality: 2` still had hard tasks routed to it.
  //
  // So: declared metadata replaces the registry's opinion rather than
  // sitting beside it. This matches `ClassifierRouter.metaFor`, which has
  // always resolved declared values first and filled only the gaps.
  const hasDeclaredRanking =
    candidate.relativeQuality !== undefined ||
    candidate.relativeCost !== undefined;

  if (hasDeclaredRanking) {
    if (candidate.relativeQuality !== undefined) {
      parts.push(
        `capability ${candidate.relativeQuality} (higher is more capable)`,
      );
    }
    if (candidate.relativeCost !== undefined) {
      parts.push(`relative cost ${candidate.relativeCost} (lower is cheaper)`);
    }
  } else {
    if (candidate.inputCostPer1K !== undefined) {
      parts.push(`${(candidate.inputCostPer1K * 100).toFixed(2)}c per 1K in`);
    }
    if (candidate.speed) {
      parts.push(`${candidate.speed} speed`);
    }
    if (candidate.quality) {
      parts.push(`${candidate.quality} quality`);
    }
  }

  // Capability FLAGS are facts (a model either accepts images or does not),
  // so they always render. Use-case SCORES are the registry's quality
  // opinion, so they are suppressed when the host has given its own.
  if (candidate.capabilities?.length) {
    parts.push(`supports ${candidate.capabilities.join(", ")}`);
  }
  if (candidate.useCases && !hasDeclaredRanking) {
    const best = Object.entries(candidate.useCases)
      .filter(([, score]) => score >= 8)
      .map(([name]) => name);
    if (best.length > 0) {
      parts.push(`strong at ${best.join(", ")}`);
    }
  }
  return parts.join("; ");
}

/**
 * ClassifierRouter — the single "classify → pick model + tools → run" engine.
 *
 * Given a request snapshot it (1) classifies difficulty (heuristic or a cheap
 * LLM), (2) selects the best provider/model from the host-declared base pool —
 * cheaper/faster for easy tiers, more capable for hard tiers — enriching pool
 * members with real cost/quality metadata from the model registry, and
 * (3) narrows the tool set via per-difficulty directives or classifier hints.
 *
 * Pure of provider imports (mirrors ModelPool): the LLM caller is injected.
 * The only data dependency is the read-only `ModelResolver` registry lookup,
 * used purely for metadata enrichment and never for provider construction.
 */

import { classifyHeuristic, classifyLlm } from "./classifierStrategies.js";
import { ModelResolver } from "../models/modelResolver.js";
import type {
  ClassifierCandidate,
  ClassifierDecision,
  ClassifierDifficulty,
  ClassifierModelMeta,
  ClassifierRouterConfig,
  ClassifierRouterDecision,
  ClassifierRouterDeps,
  ClassifierRouterInput,
  ClassifierRouterPoolMember,
} from "../types/index.js";

/** Maps a registry quality enum to a comparable numeric score. */
const QUALITY_SCORE: Record<string, number> = { high: 3, medium: 2, low: 1 };

/** How each difficulty ranks candidate members. */
const DIFFICULTY_RANK_MODE: Record<
  ClassifierDifficulty,
  "cost-asc" | "quality-desc" | "balanced"
> = {
  trivial: "cost-asc",
  simple: "cost-asc",
  moderate: "balanced",
  hard: "quality-desc",
  expert: "quality-desc",
};

/** Neutral default for an unknown numeric metric (keeps ordering stable). */
const NEUTRAL = 0.5;

/**
 * Cap on the per-(provider,model) metadata cache so it can't grow unbounded in
 * long-lived processes with large or dynamic pools. FIFO eviction.
 */
const MAX_META_CACHE_ENTRIES = 1000;

export class ClassifierRouter {
  private readonly metaCache = new Map<string, ClassifierModelMeta>();

  constructor(
    private readonly config: ClassifierRouterConfig,
    private readonly deps: ClassifierRouterDeps = {},
  ) {}

  /**
   * Classify the request and produce a combined model + tool decision, or
   * `null` when nothing should change. Never throws (fails open).
   */
  async route(
    input: ClassifierRouterInput,
  ): Promise<ClassifierRouterDecision | null> {
    try {
      // For the LLM strategy, hand the pool to the classifier so it can select
      // a model directly — the generic path for custom/registry-less models.
      const useLlm = this.config.classifier === "llm" && !!this.deps.generate;
      const built = useLlm ? this.buildCandidates() : undefined;

      const decision = await this.classify(input, built?.descriptors);

      const ranked = this.selectModels(decision, built?.byId);
      const primary = ranked[0];
      const { toolFilter, excludeTools } = this.selectTools(decision);

      if (!primary && !toolFilter && !excludeTools) {
        return null;
      }

      return {
        provider: primary?.provider,
        model: primary?.model,
        region: primary?.region,
        difficulty: decision.difficulty,
        modelFallbacks: ranked.slice(1),
        toolFilter,
        excludeTools,
        reason: decision.reason,
      };
    } catch (err) {
      this.deps.logger?.warn?.("[ClassifierRouter] route failed — no-op", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /** Run the configured strategy; LLM falls back to heuristic on failure. */
  private async classify(
    input: ClassifierRouterInput,
    candidates?: ClassifierCandidate[],
  ): Promise<ClassifierDecision> {
    if (this.config.classifier === "llm" && this.deps.generate) {
      try {
        return await classifyLlm(
          input,
          this.deps.generate,
          this.config.classifierModel,
          this.config.timeoutMs,
          candidates,
        );
      } catch (err) {
        this.deps.logger?.warn?.(
          "[ClassifierRouter] LLM classify failed — using heuristic",
          { error: err instanceof Error ? err.message : String(err) },
        );
      }
    }
    return classifyHeuristic(input);
  }

  /**
   * Build LLM-facing model descriptors + an id→member map so the classifier can
   * pick a model directly. Works for ANY pool, registry-backed or not.
   */
  private buildCandidates(): {
    descriptors: ClassifierCandidate[];
    byId: Map<string, ClassifierRouterPoolMember>;
  } {
    const pool = this.config.pool ?? [];
    const byId = new Map<string, ClassifierRouterPoolMember>();
    const used = new Set<string>();
    const descriptors: ClassifierCandidate[] = [];
    pool.forEach((m, i) => {
      let id = m.id ?? (m.model ? `${m.provider}/${m.model}` : m.provider);
      if (used.has(id)) {
        id = `${id}#${i}`;
      }
      used.add(id);
      byId.set(id, m);
      descriptors.push({
        id,
        provider: m.provider,
        model: m.model,
        description: m.description,
        tiers: m.tiers,
        capabilities: this.metaFor(m).capabilities,
      });
    });
    return { descriptors, byId };
  }

  /**
   * Resolve the ranked model list for a decision. Prefers the LLM's direct pick
   * (`selectedModelId`); otherwise falls back to difficulty-based tierMap /
   * metadata scoring.
   */
  private selectModels(
    decision: ClassifierDecision,
    byId?: Map<string, ClassifierRouterPoolMember>,
  ): ClassifierRouterPoolMember[] {
    if (decision.selectedModelId && byId) {
      const picked = byId.get(decision.selectedModelId);
      if (picked) {
        const rest = (this.config.pool ?? []).filter((m) => m !== picked);
        const rankedRest = this.rank(
          this.filterByCapabilities(rest, decision.requiredCapabilities),
          decision.difficulty,
        );
        return [picked, ...rankedRest];
      }
    }
    const eligible = this.candidatesFor(decision);
    const capable = this.filterByCapabilities(
      eligible,
      decision.requiredCapabilities,
    );
    return this.rank(capable, decision.difficulty);
  }

  /** Candidate members for a difficulty: explicit tierMap or eligible pool. */
  private candidatesFor(
    decision: ClassifierDecision,
  ): ClassifierRouterPoolMember[] {
    const tierMembers = this.config.tierMap?.[decision.difficulty];
    if (tierMembers && tierMembers.length > 0) {
      return tierMembers;
    }
    const pool = this.config.pool ?? [];
    const eligible = pool.filter(
      (m) => !m.tiers || m.tiers.includes(decision.difficulty),
    );
    return eligible.length > 0 ? eligible : pool;
  }

  /** Drop members that cannot satisfy the required capabilities (lenient). */
  private filterByCapabilities(
    members: ClassifierRouterPoolMember[],
    required?: string[],
  ): ClassifierRouterPoolMember[] {
    if (!required || required.length === 0) {
      return members;
    }
    const kept = members.filter((m) => {
      const caps = this.metaFor(m).capabilities;
      // Unknown capabilities → keep (don't starve the pool on missing metadata).
      if (!caps || caps.length === 0) {
        return true;
      }
      return required.every((c) => caps.includes(c));
    });
    return kept.length > 0 ? kept : members;
  }

  /** Rank candidates best-first for the difficulty's strategy. */
  private rank(
    members: ClassifierRouterPoolMember[],
    difficulty: ClassifierDifficulty,
  ): ClassifierRouterPoolMember[] {
    const mode = DIFFICULTY_RANK_MODE[difficulty];
    const originalIndex = new Map(members.map((m, i) => [m, i] as const));
    const num = (v?: number): number => (typeof v === "number" ? v : NEUTRAL);

    return [...members].sort((a, b) => {
      const ma = this.metaFor(a);
      const mb = this.metaFor(b);
      let delta: number;
      if (mode === "cost-asc") {
        delta = num(ma.cost) - num(mb.cost);
      } else if (mode === "quality-desc") {
        delta = num(mb.quality) - num(ma.quality);
      } else {
        // balanced: maximize quality-minus-cost
        delta =
          num(mb.quality) - num(mb.cost) - (num(ma.quality) - num(ma.cost));
      }
      if (delta !== 0) {
        return delta;
      }
      const weightDelta = (b.weight ?? 1) - (a.weight ?? 1);
      if (weightDelta !== 0) {
        return weightDelta;
      }
      // Stable: preserve declared pool order on a tie.
      return (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0);
    });
  }

  /** Tool narrowing: per-difficulty directive, then classifier hints. */
  private selectTools(decision: ClassifierDecision): {
    toolFilter?: string[];
    excludeTools?: string[];
  } {
    const directive = this.config.toolDirectives?.[decision.difficulty];
    let toolFilter = directive?.toolFilter
      ? [...directive.toolFilter]
      : undefined;
    const excludeTools = directive?.excludeTools
      ? [...directive.excludeTools]
      : undefined;
    // When no explicit allowlist is configured, honor the classifier's hint.
    if (
      (!toolFilter || toolFilter.length === 0) &&
      decision.suggestedTools &&
      decision.suggestedTools.length > 0
    ) {
      toolFilter = [...decision.suggestedTools];
    }
    return { toolFilter, excludeTools };
  }

  /**
   * Resolve cost/quality/capabilities for a member. Declared values win;
   * gaps are filled from the model registry (by model name/alias) when known.
   * Results are cached per (provider/model) for the router's lifetime.
   */
  private metaFor(member: ClassifierRouterPoolMember): ClassifierModelMeta {
    const key = `${member.provider}::${member.model ?? ""}`;
    const cached = this.metaCache.get(key);
    if (cached) {
      return cached;
    }

    let cost = member.cost;
    let quality = member.quality;
    let capabilities = member.capabilities
      ? [...member.capabilities]
      : undefined;

    const needsEnrichment =
      cost === undefined || quality === undefined || capabilities === undefined;
    if (needsEnrichment && member.model) {
      try {
        const info = ModelResolver.resolveModel(member.model);
        if (info) {
          if (cost === undefined) {
            cost = info.pricing.inputCostPer1K + info.pricing.outputCostPer1K;
          }
          if (quality === undefined) {
            quality = QUALITY_SCORE[info.performance.quality] ?? NEUTRAL;
          }
          if (capabilities === undefined) {
            const caps: string[] = [];
            if (info.capabilities.vision) {
              caps.push("vision");
            }
            if (info.capabilities.functionCalling) {
              caps.push("tools");
            }
            if (info.capabilities.reasoning) {
              caps.push("reasoning");
            }
            if (info.capabilities.codeGeneration) {
              caps.push("code");
            }
            if (info.capabilities.multimodal) {
              caps.push("multimodal");
            }
            capabilities = caps;
          }
        }
      } catch {
        // Enrichment is best-effort; ignore registry lookup failures.
      }
    }

    const meta: ClassifierModelMeta = { cost, quality, capabilities };
    if (this.metaCache.size >= MAX_META_CACHE_ENTRIES) {
      const oldest = this.metaCache.keys().next().value;
      if (oldest !== undefined) {
        this.metaCache.delete(oldest);
      }
    }
    this.metaCache.set(key, meta);
    return meta;
  }
}

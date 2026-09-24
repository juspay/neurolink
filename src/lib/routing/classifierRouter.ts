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

import {
  classifyHeuristic,
  classifyJev,
  classifyLlm,
  contextScopeToThreshold,
  CLASSIFIER_CONTEXT_SCOPES,
} from "./classifierStrategies.js";
import {
  buildModelCatalog,
  buildRegistryIndex,
  enrichCandidate,
  rankCatalogue,
} from "./modelCatalog.js";
import { ModelResolver } from "../models/modelResolver.js";
import { resolveDefaultDecisionProvider } from "../factories/providerDescriptors.js";
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
  ClassifierStrategyKind,
  ModelInfo,
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

  /**
   * The effective pool: what the host declared, plus catalogue-derived members
   * when `catalog.enabled`. Mutable so a long-lived host can widen or narrow
   * it without rebuilding the router — the constructor-frozen pool was the one
   * thing preventing a runtime model catalogue.
   */
  private pool: ClassifierRouterPoolMember[];

  /** Registry index for candidate enrichment; built once, on first use. */
  private registryIndex?: Map<string, ModelInfo>;

  constructor(
    private readonly config: ClassifierRouterConfig,
    private readonly deps: ClassifierRouterDeps = {},
  ) {
    this.pool = ClassifierRouter.composePool(config);
  }

  /**
   * Merge the declared pool with the catalogue. Declared members win on a
   * duplicate `provider/model`, because a host that spelled a member out has
   * said something about it (a region, a description, an explicit tier) that
   * the registry does not know.
   */
  private static composePool(
    config: ClassifierRouterConfig,
  ): ClassifierRouterPoolMember[] {
    const declared = config.pool ?? [];
    const catalogue = buildModelCatalog(config.catalog);
    if (catalogue.length === 0) {
      return [...declared];
    }
    const seen = new Set(
      declared.map((m) => m.id ?? `${m.provider}/${m.model ?? ""}`),
    );
    return [
      ...declared,
      ...catalogue.filter(
        (m) => !seen.has(m.id ?? `${m.provider}/${m.model ?? ""}`),
      ),
    ];
  }

  /**
   * Replace the routable pool at runtime. Returns the new size.
   *
   * Clears the metadata cache, since a member's declared cost/quality is
   * cached per `provider::model` and a replacement pool may declare different
   * values for the same pair.
   */
  setPool(members: ClassifierRouterPoolMember[]): number {
    this.pool = [...members];
    this.metaCache.clear();
    return this.pool.length;
  }

  /** The pool currently routed over, declared plus catalogue. */
  getPool(): ClassifierRouterPoolMember[] {
    return [...this.pool];
  }

  /** Rebuild the catalogue half of the pool (e.g. after credentials change). */
  refreshCatalog(): number {
    this.pool = ClassifierRouter.composePool(this.config);
    this.metaCache.clear();
    return this.pool.length;
  }

  /**
   * Classify the request and produce a combined model + tool decision, or
   * `null` when nothing should change. Never throws (fails open).
   */
  async route(
    input: ClassifierRouterInput,
  ): Promise<ClassifierRouterDecision | null> {
    try {
      // Both the LLM and Jev strategies can pick a model straight out of the
      // pool — the generic path for custom/registry-less models.
      const strategy = this.resolveStrategy();
      const usesCandidates =
        (strategy === "jev" && !!this.deps.decide) ||
        (strategy === "llm" && !!this.deps.generate);
      const built = usesCandidates ? this.buildCandidates() : undefined;

      const decision = await this.classify(strategy, input, built?.descriptors);

      const ranked = this.selectModels(decision, input, built?.byId);
      const primary = ranked[0];
      const { toolFilter, excludeTools } = this.selectTools(decision);
      const compactionThreshold = this.selectContextBudget(decision);

      if (
        !primary &&
        !toolFilter &&
        !excludeTools &&
        compactionThreshold === undefined
      ) {
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
        compactionThreshold,
        contextScope: decision.contextScope,
        reason: decision.reason,
      };
    } catch (err) {
      this.deps.logger?.warn?.("[ClassifierRouter] route failed — no-op", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Resolve "auto" (the default) to a concrete strategy. Jev is preferred the
   * moment a decision provider is configured; without one the behaviour is
   * exactly what it was before Jev existed.
   */
  private resolveStrategy(): ClassifierStrategyKind {
    const configured = this.config.classifier ?? "auto";
    if (configured !== "auto") {
      return configured;
    }
    // A decision provider that is both registered AND configured is the whole
    // activation condition — this is where "if somebody sets it we start
    // using it" lives for routing. The caller's check also counts the
    // credentials it was constructed with.
    const hasProvider = this.deps.hasDecisionProvider
      ? this.deps.hasDecisionProvider()
      : resolveDefaultDecisionProvider() !== undefined;
    return this.deps.decide && hasProvider ? "jev" : "heuristic";
  }

  /** Run the chosen strategy; every one falls back to heuristic on failure. */
  private async classify(
    strategy: ClassifierStrategyKind,
    input: ClassifierRouterInput,
    candidates?: ClassifierCandidate[],
  ): Promise<ClassifierDecision> {
    if (strategy === "jev" && this.deps.decide) {
      try {
        // classifyJev is already fail-open internally; this guards the rest.
        return await classifyJev(
          input,
          this.deps.decide,
          this.config.timeoutMs,
          candidates,
          {
            upgrade: this.config.minUpgradeConfidence,
            downgrade: this.config.minDowngradeConfidence,
          },
        );
      } catch (err) {
        this.deps.logger?.warn?.(
          "[ClassifierRouter] Jev classify failed — using heuristic",
          { error: err instanceof Error ? err.message : String(err) },
        );
      }
    }
    if (strategy === "llm" && this.deps.generate) {
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
    // Candidates are built BEFORE classification, so they are scored against
    // the neutral tier. The rendered description a model sees does not depend
    // on difficulty anyway — it is a statement of the model's properties — and
    // the deterministic fallback re-scores against the real tier once known.
    this.registryIndex ??= buildRegistryIndex();
    const byId = new Map<string, ClassifierRouterPoolMember>();
    const used = new Set<string>();
    const descriptors: ClassifierCandidate[] = [];
    this.pool.forEach((m, i) => {
      let id = m.id ?? (m.model ? `${m.provider}/${m.model}` : m.provider);
      if (used.has(id)) {
        id = `${id}#${i}`;
      }
      used.add(id);
      byId.set(id, m);
      const candidate = enrichCandidate(id, m, "moderate", this.registryIndex);
      // A host-declared capability list wins over the registry's, matching
      // metaFor's precedence.
      candidate.capabilities =
        m.capabilities ??
        candidate.capabilities ??
        this.metaFor(m).capabilities;
      descriptors.push(candidate);
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
    input: ClassifierRouterInput,
    byId?: Map<string, ClassifierRouterPoolMember>,
  ): ClassifierRouterPoolMember[] {
    const tierRanked = this.rankForDifficulty(decision, input);
    const picked =
      decision.selectedModelId && byId
        ? byId.get(decision.selectedModelId)
        : undefined;
    if (picked) {
      // A pick that cannot hold the request is vetoed outright, whatever the
      // confidence. That failure is not a degraded answer but a hard provider
      // error, which ModelPool records as a permanent cooldown.
      if (!this.fitsRequest(picked, input)) {
        this.deps.logger?.debug?.(
          "[ClassifierRouter] classifier pick dropped — window too small",
          {
            id: decision.selectedModelId,
            estimatedInputTokens: input.estimatedInputTokens,
          },
        );
      } else if (this.pickClearsBar(decision, picked, tierRanked[0])) {
        return [picked, ...tierRanked.filter((m) => m !== picked)];
      } else {
        this.deps.logger?.debug?.(
          "[ClassifierRouter] classifier pick dropped — below its bar",
          {
            id: decision.selectedModelId,
            confidence: decision.selectedModelConfidence,
          },
        );
      }
    }
    return tierRanked;
  }

  /**
   * Whether a directly-picked model clears the bar that applies to it.
   *
   * The bars are asymmetric because the two mistakes do not cost the same, and
   * which one a pick risks depends on what the difficulty tier would otherwise
   * have chosen. Picking something COSTLIER than the tier's own choice risks
   * spending more than necessary, so it clears the low upgrade bar. Picking
   * something CHEAPER risks handing the task to a model that cannot do it, so
   * it must clear the high downgrade bar. Agreeing with the tier needs no bar
   * at all.
   *
   * A strategy that reports no confidence for its pick — the LLM classifier —
   * is honoured exactly as before. Its self-reported numbers are not
   * calibrated, so a bar over them would be arithmetic on noise, and imposing
   * one would silently change the behaviour of a shipped, unrelated strategy.
   */
  private pickClearsBar(
    decision: ClassifierDecision,
    picked: ClassifierRouterPoolMember,
    tierTop: ClassifierRouterPoolMember | undefined,
  ): boolean {
    const confidence = decision.selectedModelConfidence;
    if (confidence === undefined || !tierTop || picked === tierTop) {
      return true;
    }
    const pickedCost = this.metaFor(picked).cost ?? NEUTRAL;
    const topCost = this.metaFor(tierTop).cost ?? NEUTRAL;
    const bar =
      pickedCost < topCost
        ? (this.config.minDowngradeConfidence ?? 0.6)
        : (this.config.minUpgradeConfidence ?? 0.3);
    return confidence >= bar;
  }

  /** The difficulty-based ranking, independent of any direct pick. */
  private rankForDifficulty(
    decision: ClassifierDecision,
    input: ClassifierRouterInput,
  ): ClassifierRouterPoolMember[] {
    const eligible = this.candidatesFor(decision);
    const capable = this.withRoomFor(
      this.filterByCapabilities(eligible, decision.requiredCapabilities),
      input,
    );
    // With the catalogue on there is no hand-declared ordering to respect and
    // far more members than a host would ever write out, so ranking uses the
    // registry's use-case scores. Without it, the long-standing cost/quality
    // comparator stands — a declared pool's behaviour is unchanged.
    if (this.config.catalog?.enabled) {
      this.registryIndex ??= buildRegistryIndex();
      const index = this.registryIndex;
      const enriched = capable.map((m, i) =>
        enrichCandidate(
          m.id ?? (m.model ? `${m.provider}/${m.model}` : `${m.provider}#${i}`),
          m,
          decision.difficulty,
          index,
        ),
      );
      const order = rankCatalogue(
        enriched,
        decision.difficulty,
        input,
        decision.requiredCapabilities,
      );
      const byCandidateId = new Map(
        capable.map((m, i) => [
          m.id ?? (m.model ? `${m.provider}/${m.model}` : `${m.provider}#${i}`),
          m,
        ]),
      );
      const ranked = order
        .map((c) => byCandidateId.get(c.id))
        .filter((m): m is ClassifierRouterPoolMember => m !== undefined);
      if (ranked.length > 0) {
        return ranked;
      }
    }
    return this.rank(capable, decision.difficulty);
  }

  /**
   * Whether a member's context window can hold the estimated request. Unknown
   * windows pass — the registry does not know every model, and starving the
   * pool on missing metadata is worse than an occasional retry.
   */
  private fitsRequest(
    member: ClassifierRouterPoolMember,
    input: ClassifierRouterInput,
  ): boolean {
    const needed = input.estimatedInputTokens ?? 0;
    if (needed <= 0 || !member.model) {
      return true;
    }
    this.registryIndex ??= buildRegistryIndex();
    const info = this.registryIndex.get(member.model);
    return !info || info.limits.maxContextTokens >= needed;
  }

  /** Drop members too small for the request, unless that empties the pool. */
  private withRoomFor(
    members: ClassifierRouterPoolMember[],
    input: ClassifierRouterInput,
  ): ClassifierRouterPoolMember[] {
    const kept = members.filter((m) => this.fitsRequest(m, input));
    return kept.length > 0 ? kept : members;
  }

  /** Candidate members for a difficulty: explicit tierMap or eligible pool. */
  private candidatesFor(
    decision: ClassifierDecision,
  ): ClassifierRouterPoolMember[] {
    const tierMembers = this.config.tierMap?.[decision.difficulty];
    if (tierMembers && tierMembers.length > 0) {
      return tierMembers;
    }
    const eligible = this.pool.filter(
      (m) => !m.tiers || m.tiers.includes(decision.difficulty),
    );
    return eligible.length > 0 ? eligible : this.pool;
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

    const isFullyUnmeasured = (m: ClassifierRouterPoolMember): boolean => {
      const meta = this.metaFor(m);
      return meta.cost === undefined && meta.quality === undefined;
    };
    const measured = members.filter((m) => !isFullyUnmeasured(m));
    const unmeasured = members.filter(isFullyUnmeasured);

    const sortMeasured = (
      pool: ClassifierRouterPoolMember[],
    ): ClassifierRouterPoolMember[] =>
      [...pool].sort((a, b) => {
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

    // The unmeasured bucket ranks after every measured member, but WITHIN the
    // bucket the same comparator still applies: with cost/quality both
    // NEUTRAL it falls through to the weight tie-break, preserving the
    // documented weight contract that a plain append would silently drop.
    return [...sortMeasured(measured), ...sortMeasured(unmeasured)];
  }

  /**
   * Turn the classifier's context reading into a compaction threshold.
   *
   * Returns undefined — meaning "leave the 0.8 default alone" — whenever the
   * feature is off, no scope was read, or the scope is the widest one. The
   * mapping can only ever LOWER the threshold, which is enforced in
   * `contextScopeToThreshold` rather than here, because the consequence of
   * getting it wrong in the other direction is not recoverable: a
   * `context_window` error puts the model into ModelPool's 10-year cooldown.
   */
  private selectContextBudget(
    decision: ClassifierDecision,
  ): number | undefined {
    if (this.config.contextBudget === false || !decision.contextScope) {
      return undefined;
    }
    const index = CLASSIFIER_CONTEXT_SCOPES.indexOf(decision.contextScope);
    if (index < 0) {
      return undefined;
    }
    const threshold = contextScopeToThreshold(index);
    return threshold < 0.8 ? threshold : undefined;
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
        if (!info) {
          this.deps.logger?.debug?.(
            `[ClassifierRouter] metaFor: no registry match for ${member.provider}/${member.model}`,
          );
        } else {
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
      } catch (err) {
        this.deps.logger?.warn?.(
          `[ClassifierRouter] metaFor: registry lookup threw for ${member.provider}/${member.model}`,
          { error: err instanceof Error ? err.message : String(err) },
        );
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

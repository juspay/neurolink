/**
 * SkillsManager — orchestrates the skill store, cached index, index-first
 * search (hydrating instructions only for matches), prompt-index rendering,
 * and the mutation gate.
 *
 * Read paths fail open (errors surface as empty results + a warn log);
 * write paths fail closed (errors reject the mutation).
 */

import { randomUUID } from "node:crypto";
import type {
  SkillCreateInput,
  SkillDefinition,
  SkillIndexItem,
  SkillMutationAction,
  SkillMutationResult,
  SkillSearchQuery,
  SkillStore,
  SkillUpdateInput,
  SkillsConfig,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  filterSkillIndex,
  formatSkillsPromptIndex,
  renderSkillListing,
  sortSkillIndex,
} from "./skillMatcher.js";
import { SkillSessionTracker } from "./skillSessionTracker.js";
import { createSkillStore } from "./skillStores.js";

const DEFAULT_MAX_MATCHES = 5;
const DEFAULT_PROMPT_INDEX_MAX_ITEMS = 50;
const DEFAULT_INDEX_CACHE_TTL_MS = 30_000;
const DEFAULT_LISTING_BUDGET_CHARS = 15_000;

export class SkillsManager {
  private readonly store: SkillStore;
  private cachedIndex: SkillIndexItem[] | null = null;
  private cachedIndexAt = 0;
  /** Serializes writes within this process — see requestMutation(). */
  private mutationQueue: Promise<unknown> = Promise.resolve();
  /** Per-session activation state (pinned skills). */
  readonly sessions = new SkillSessionTracker();

  constructor(private readonly config: SkillsConfig) {
    this.store = createSkillStore(config.storage);
  }

  /**
   * Cached index read, sorted by name. TTL 0 disables caching. Sorting
   * here (not per render) keeps every downstream listing byte-stable
   * regardless of store enumeration order.
   */
  async getIndex(forceRefresh = false): Promise<SkillIndexItem[]> {
    const ttl = this.config.indexCacheTtlMs ?? DEFAULT_INDEX_CACHE_TTL_MS;
    const fresh =
      this.cachedIndex !== null &&
      ttl > 0 &&
      Date.now() - this.cachedIndexAt < ttl;
    if (fresh && !forceRefresh && this.cachedIndex) {
      return this.cachedIndex;
    }
    const index = sortSkillIndex(await this.store.index());
    this.cachedIndex = index;
    this.cachedIndexAt = Date.now();
    return index;
  }

  private invalidateIndex(): void {
    this.cachedIndex = null;
    this.store.invalidate?.();
  }

  /**
   * Index-first search: filter the cached index, hydrate only the matched
   * entries (max `limit`) with instructions. Cost: one cached index read +
   * N_matched store gets.
   */
  async search(query: SkillSearchQuery): Promise<SkillDefinition[]> {
    const limit = query.limit ?? this.config.maxMatches ?? DEFAULT_MAX_MATCHES;
    const scopeId = query.scopeId ?? this.config.defaultScopeId;
    const index = await this.getIndex();
    const matched = filterSkillIndex(index, {
      ...query,
      ...(scopeId !== undefined ? { scopeId } : {}),
      limit,
    });

    const hydrated = await Promise.all(
      matched.map((item) => this.store.get(item.id)),
    );
    return hydrated.filter((s): s is SkillDefinition => s !== null);
  }

  /** Index entries only — no instructions. For discovery/listing. */
  async list(scopeId?: string): Promise<SkillIndexItem[]> {
    const effectiveScopeId = scopeId ?? this.config.defaultScopeId;
    const index = await this.getIndex();
    return filterSkillIndex(index, {
      ...(effectiveScopeId !== undefined ? { scopeId: effectiveScopeId } : {}),
    });
  }

  /** Fetch one skill by id, falling back to name lookup. */
  async get(idOrName: string): Promise<SkillDefinition | null> {
    const byId = await this.store.get(idOrName);
    if (byId) {
      return byId;
    }
    const index = await this.getIndex();
    // Prefer an active skill when resolving by name: a soft-deleted skill and a
    // later same-named active skill can coexist in the index, so a bare
    // name-find would resolve non-deterministically to the stale deprecated one
    // across store backends. Fall back to any match only when no active skill
    // carries the name.
    const entry =
      index.find(
        (item) =>
          item.name === idOrName && (item.status ?? "active") === "active",
      ) ?? index.find((item) => item.name === idOrName);
    return entry ? this.store.get(entry.id) : null;
  }

  /**
   * Render the system-prompt skills index for one call, or null when
   * nothing is visible. Never includes instructions.
   */
  async buildPromptIndex(options?: {
    scopeId?: string;
    tags?: string[];
  }): Promise<string | null> {
    const items = await this.visibleItems(options);
    return formatSkillsPromptIndex(
      items,
      this.config.promptIndexMaxItems ?? DEFAULT_PROMPT_INDEX_MAX_ITEMS,
    );
  }

  /**
   * Render the `<available_skills>` block for the use_skill tool
   * description ("tool" discovery mode), or null when nothing is visible.
   * Bounded by listingBudgetChars; entries are never dropped.
   */
  async buildToolListing(options?: {
    scopeId?: string;
    tags?: string[];
  }): Promise<string | null> {
    const items = await this.visibleItems(options);
    return renderSkillListing(
      items,
      this.config.listingBudgetChars ?? DEFAULT_LISTING_BUDGET_CHARS,
    );
  }

  /** Visible (active, scope- and tag-filtered) index entries for one call. */
  private async visibleItems(options?: {
    scopeId?: string;
    tags?: string[];
  }): Promise<SkillIndexItem[]> {
    let items = await this.list(options?.scopeId);
    if (options?.tags && options.tags.length > 0) {
      const wanted = options.tags.map((t) => t.toLowerCase());
      items = items.filter((item) =>
        (item.tags ?? []).some((t) => wanted.includes(t.toLowerCase())),
      );
    }
    return items;
  }

  /**
   * Read an auxiliary resource file bundled with a skill. Paths are
   * relative to the skill; traversal segments are rejected. Null when the
   * skill, the resource, or store resource support is absent.
   */
  async getResource(
    idOrName: string,
    resourcePath: string,
  ): Promise<string | null> {
    const normalized = resourcePath.replace(/\\/g, "/");
    if (
      normalized.startsWith("/") ||
      normalized.split("/").some((segment) => segment === "..")
    ) {
      throw new Error(
        `Invalid resource path "${resourcePath}" — must be relative to the skill directory`,
      );
    }
    if (!this.store.getResource) {
      return null;
    }
    const skill = await this.get(idOrName);
    if (!skill) {
      return null;
    }
    return this.store.getResource(skill.id, normalized);
  }

  /**
   * Whether skill create/update/delete is enabled on this instance. Gates the
   * LLM-facing `skill_*` tools (registration) and the server REST mutation
   * routes. Direct programmatic `requestMutation` calls are intentionally not
   * gated, so a host can still seed skills at startup.
   */
  get mutationsAllowed(): boolean {
    return this.config.allowMutations ?? false;
  }

  /**
   * Gate a proposed mutation through the host's onMutationRequest hook,
   * then apply it when approved. No hook configured means direct apply
   * (the tools themselves are already gated by allowMutations).
   */
  async requestMutation(
    action: SkillMutationAction,
  ): Promise<SkillMutationResult> {
    let decision: SkillMutationResult["decision"] = { outcome: "approved" };
    if (this.config.onMutationRequest) {
      decision = await this.config.onMutationRequest(action);
    }
    if (decision.outcome !== "approved") {
      return { decision };
    }
    // Serialize writes within this process so the name-uniqueness check and
    // the store write can never interleave across concurrent mutations.
    // Cross-process races remain possible with plain-object stores (S3,
    // Redis) — hosts needing strict global uniqueness should serialize via
    // their onMutationRequest gate; the S3 index additionally self-heals.
    const run = this.mutationQueue.then(() => this.applyMutation(action));
    this.mutationQueue = run.catch(() => undefined);
    const skill = await run;
    return { decision, ...(skill ? { skill } : {}) };
  }

  private async applyMutation(
    action: SkillMutationAction,
  ): Promise<SkillDefinition | undefined> {
    const now = new Date().toISOString();

    if (action.type === "create") {
      await this.assertNameAvailable(action.skill.name);
      const skill: SkillDefinition = {
        id: randomUUID(),
        version: 1,
        status: "active",
        createdAt: now,
        updatedAt: now,
        ...action.skill,
      };
      assertScopeConsistent(skill);
      await this.store.put(skill);
      this.invalidateIndex();
      logger.info("[SkillsManager] Skill created", {
        skillId: skill.id,
        name: skill.name,
      });
      return skill;
    }

    if (action.type === "update") {
      const existing = await this.get(action.skillId);
      if (!existing) {
        throw new Error(`Skill "${action.skillId}" not found`);
      }
      if (action.patch.name && action.patch.name !== existing.name) {
        await this.assertNameAvailable(action.patch.name, existing.id);
      }
      const updated: SkillDefinition = {
        ...existing,
        ...definedFields(action.patch),
        id: existing.id,
        version: (existing.version ?? 1) + 1,
        updatedAt: now,
      };
      assertScopeConsistent(updated);
      await this.store.put(updated);
      this.invalidateIndex();
      logger.info("[SkillsManager] Skill updated", {
        skillId: updated.id,
        version: updated.version,
      });
      return updated;
    }

    // delete — soft: mark deprecated so the skill drops out of active
    // listings but stays in storage for audit/undo.
    const existing = await this.get(action.skillId);
    if (!existing) {
      throw new Error(`Skill "${action.skillId}" not found`);
    }
    if (existing.status === "deprecated") {
      throw new Error(`Skill "${existing.name}" is already deleted`);
    }
    const deprecated: SkillDefinition = {
      ...existing,
      status: "deprecated",
      updatedAt: now,
    };
    await this.store.put(deprecated);
    this.invalidateIndex();
    logger.info("[SkillsManager] Skill deprecated", {
      skillId: existing.id,
      name: existing.name,
    });
    return deprecated;
  }

  private async assertNameAvailable(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const index = await this.getIndex(true);
    const clash = index.find(
      (item) =>
        item.id !== excludeId &&
        item.name.toLowerCase() === name.toLowerCase() &&
        (item.status ?? "active") === "active",
    );
    if (clash) {
      throw new Error(`A skill named "${name}" already exists`);
    }
  }
}

/**
 * A scoped skill without scopeIds can never match anything — reject the
 * write instead of persisting an unmatchable skill. Validated post-merge so
 * both create and patch-style update paths are covered.
 */
function assertScopeConsistent(skill: SkillDefinition): void {
  if (skill.scope === "scoped" && (skill.scopeIds ?? []).length === 0) {
    throw new Error(
      'A skill with scope "scoped" must have at least one entry in scopeIds',
    );
  }
}

/** Shallow-copy only the defined fields of a patch (undefined must not overwrite). */
function definedFields(patch: SkillUpdateInput): Partial<SkillCreateInput> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<SkillCreateInput>;
}

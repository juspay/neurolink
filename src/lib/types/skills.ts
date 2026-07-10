/**
 * Native skills support — versioned, discoverable instruction packs
 * (SOPs, playbooks, workflows) exposed to the model via progressive
 * disclosure: a cheap name+description index up front, full instructions
 * loaded on demand through built-in skill tools.
 *
 * Architecture mirrors the Hippocampus memory subsystem: a `skills` config
 * on the NeuroLink constructor lazily initializes a SkillsManager, which
 * auto-registers built-in tools (list_skills, plus gated mutation tools)
 * and augments each generate()/stream() call with the discovery listing
 * plus per-call use_skill / read_skill_resource tools.
 *
 * Naming: every exported type carries a `Skill` prefix to satisfy the
 * `unique-type-names` ESLint rule.
 */

import type { ChatMessage } from "./conversation.js";

/** Visibility of a skill: available everywhere, or only in specific scopes. */
export type SkillScopeKind = "global" | "scoped";

/**
 * Reference to an auxiliary file bundled with a skill (progressive
 * disclosure level 3). Resources are read into context on demand via the
 * read_skill_resource tool — a skill's SKILL.md should stay lean and point
 * to resources for rarely-needed detail.
 */
export type SkillResourceRef = {
  /** Path relative to the skill's directory, e.g. "references/edge-cases.md". */
  path: string;
  /** Size in bytes when known (listing hint only). */
  size?: number;
};

/** Lifecycle status. Deletes are soft — deprecated skills stay in storage. */
export type SkillLifecycleStatus = "active" | "deprecated";

/**
 * A complete skill: index metadata plus the full `instructions` body.
 * `instructions` is the expensive part — it is only hydrated for matched
 * skills, never included in index listings or the prompt index.
 */
export type SkillDefinition = {
  /** Stable unique identifier (UUID for created skills, or derived from filename). */
  id: string;
  /** Machine-friendly unique name (snake_case recommended), used for matching. */
  name: string;
  /** Human-readable display name shown in listings. */
  displayName?: string;
  /** One or two sentences describing when the skill applies — the matching signal. */
  description: string;
  /** Full step-by-step instructions the model follows when the skill matches. */
  instructions: string;
  /** Domain tags for filtering (e.g. ["payments", "escalation"]). */
  tags?: string[];
  /** Visibility. Default: "global". */
  scope?: SkillScopeKind;
  /** Scope identifiers this skill is limited to when scope === "scoped" (e.g. channel/team/tenant ids). */
  scopeIds?: string[];
  /** Monotonic version, bumped on every approved update. Default: 1. */
  version?: number;
  /** Lifecycle status. Default: "active". */
  status?: SkillLifecycleStatus;
  /** ISO timestamp of creation. */
  createdAt?: string;
  /** ISO timestamp of last update. */
  updatedAt?: string;
  /**
   * Auxiliary files bundled with the skill, readable on demand through
   * read_skill_resource. Populated by stores that support resources
   * (directory-layout filesystem skills, S3, Redis).
   */
  resources?: SkillResourceRef[];
  /** Free-form host metadata (audit fields, approval references, …). */
  metadata?: Record<string, unknown>;
};

/** Lightweight index entry — everything except the instructions body. */
export type SkillIndexItem = Omit<SkillDefinition, "instructions">;

/**
 * Pluggable persistence backend. NeuroLink ships memory and filesystem
 * stores; hosts plug their own (S3, database, …) via the "custom" storage
 * type. `index()` must be cheap relative to `get()` — it backs every
 * search and prompt-index build.
 */
export type SkillStore = {
  /** Fetch one skill (with instructions) by id. Null when absent. */
  get(id: string): Promise<SkillDefinition | null>;
  /** Create or replace a skill. */
  put(skill: SkillDefinition): Promise<void>;
  /** Hard-remove a skill from storage. (Soft deletes go through put().) */
  delete(id: string): Promise<void>;
  /** List index entries (no instructions) for all stored skills. */
  index(): Promise<SkillIndexItem[]>;
  /** Optional: drop any internal caches (called after mutations). */
  invalidate?(): void;
  /**
   * Optional: fetch an auxiliary resource file bundled with a skill.
   * `resourcePath` is relative to the skill (e.g. "references/forms.md").
   * Null when the skill or resource is absent. Stores without resource
   * support simply omit this method.
   */
  getResource?(id: string, resourcePath: string): Promise<string | null>;
};

/** In-process store, optionally seeded. Good for tests and embedded use. */
export type SkillMemoryStorageConfig = {
  type: "memory";
  /** Initial skills to seed the store with. */
  skills?: SkillDefinition[];
  /**
   * Resource file contents keyed by skill id → relative path.
   * E.g. `{ "my-skill": { "references/forms.md": "..." } }`.
   */
  resources?: Record<string, Record<string, string>>;
};

/**
 * Directory-backed store. Reads three layouts:
 *  - `<dir>/<id>.json` — one JSON-serialized SkillDefinition per file
 *  - `<dir>/<name>.md` — markdown with YAML frontmatter; body = instructions
 *  - `<dir>/<name>/SKILL.md` — Claude-skills-style directory layout
 * Mutations always write `<id>.json`; markdown sources are read-only.
 */
export type SkillFilesystemStorageConfig = {
  type: "filesystem";
  /** Directory containing skill files. Created on first write if absent. */
  path: string;
};

/** Host-provided store implementation (e.g. curator's S3 repository). */
export type SkillCustomStorageConfig = {
  type: "custom";
  store: SkillStore;
};

/**
 * S3-backed store. Layout: `<prefix>skills/<id>.json` per skill plus a
 * `<prefix>index.json` document that is upserted on writes and rebuilt
 * from a bucket listing when missing or corrupt (self-healing).
 *
 * Requires the optional peer `@aws-sdk/client-s3` to be installed in the
 * host application (same pattern as memory's optional @juspay/hippocampus).
 * Credentials default to the standard AWS provider chain when omitted.
 */
export type SkillS3StorageConfig = {
  type: "s3";
  bucket: string;
  /** Key prefix inside the bucket. Default: "neurolink-skills/". */
  prefix?: string;
  region?: string;
  /** Custom endpoint (MinIO, LocalStack, …). */
  endpoint?: string;
  /** Use path-style addressing (required by most S3-compatible stores). */
  forcePathStyle?: boolean;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
};

/**
 * Redis-backed store using NeuroLink's pooled Redis client (`redis` v5,
 * already a core dependency). One JSON value per skill under
 * `<keyPrefix><id>`; the index is derived via SCAN + MGET. Skills are
 * persistent — no TTL is applied.
 */
export type SkillRedisStorageConfig = {
  type: "redis";
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
  /** Key prefix. Default: "neurolink:skills:". */
  keyPrefix?: string;
};

/**
 * Structural surface of the lazily-required @aws-sdk/client-s3 module —
 * only the pieces the S3 skill store touches (same pattern as
 * HippocampusModule for the optional memory peer).
 */
export type SkillS3ModuleSurface = {
  S3Client: new (config: Record<string, unknown>) => {
    send: (command: unknown) => Promise<unknown>;
  };
  GetObjectCommand: new (input: Record<string, unknown>) => unknown;
  PutObjectCommand: new (input: Record<string, unknown>) => unknown;
  DeleteObjectCommand: new (input: Record<string, unknown>) => unknown;
  ListObjectsV2Command: new (input: Record<string, unknown>) => unknown;
};

/** Shape of the `<prefix>index.json` document maintained by the S3 store. */
export type SkillS3IndexDocument = {
  lastUpdated: string;
  skills: SkillIndexItem[];
};

/** Result of a conditional (ETag) object read. */
export type SkillS3ConditionalGetResult = {
  /** Object body; null when the key is absent. */
  body: string | null;
  /** ETag of the returned body, for the next conditional read. */
  etag?: string;
  /** True when the object is unchanged since the supplied ETag (no body). */
  notModified?: boolean;
};

/**
 * Minimal object-storage operations the S3 skill store runs on. The
 * default implementation is created lazily from @aws-sdk/client-s3;
 * tests and hosts with pre-built clients can inject their own.
 */
export type SkillS3ObjectOps = {
  /** Fetch an object's body as a UTF-8 string. Null when the key is absent. */
  getObject(key: string): Promise<string | null>;
  putObject(key: string, body: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  /** List all object keys under a prefix (paginated internally). */
  listKeys(prefix: string): Promise<string[]>;
  /**
   * Optional: ETag-conditional read (If-None-Match). Used for index.json
   * refreshes so an unchanged index costs a 304 instead of a full download.
   * Ops without it fall back to plain getObject.
   */
  getObjectConditional?(
    key: string,
    etag?: string,
  ): Promise<SkillS3ConditionalGetResult>;
};

export type SkillsStorageConfig =
  | SkillMemoryStorageConfig
  | SkillFilesystemStorageConfig
  | SkillS3StorageConfig
  | SkillRedisStorageConfig
  | SkillCustomStorageConfig;

/** Query accepted by SkillsManager.search() (programmatic + CLI search). */
export type SkillSearchQuery = {
  /** Keyword matched (case-insensitive substring) against name, displayName, and description. */
  query?: string;
  /** Tag filter, applied on top of the keyword match. */
  tag?: string;
  /** Scope filter: include global skills plus skills scoped to this id. */
  scopeId?: string;
  /** Maximum matches to hydrate. Defaults to SkillsConfig.maxMatches. */
  limit?: number;
};

/** Input for creating a skill (id/version/status/timestamps are assigned by the manager). */
export type SkillCreateInput = {
  name: string;
  displayName?: string;
  description: string;
  instructions: string;
  tags?: string[];
  scope?: SkillScopeKind;
  scopeIds?: string[];
  metadata?: Record<string, unknown>;
};

/** Patch for updating a skill. Only provided fields change; version is bumped. */
export type SkillUpdateInput = Partial<SkillCreateInput>;

/** A proposed mutation, passed to the host's onMutationRequest gate. */
export type SkillMutationAction =
  | { type: "create"; skill: SkillCreateInput; requestedBy?: string }
  | {
      type: "update";
      skillId: string;
      patch: SkillUpdateInput;
      requestedBy?: string;
    }
  | { type: "delete"; skillId: string; requestedBy?: string };

/**
 * Host decision for a proposed mutation.
 *  - "approved": NeuroLink applies the mutation immediately.
 *  - "rejected": nothing is written; `reason` is surfaced to the model.
 *  - "pending": the host queued the action for out-of-band approval
 *    (e.g. a Slack maker-checker flow) and will apply it itself later;
 *    `reference` is surfaced to the model (e.g. an approval ticket id).
 */
export type SkillMutationDecision =
  | { outcome: "approved" }
  | { outcome: "rejected"; reason?: string }
  | { outcome: "pending"; reference?: string };

/** Result envelope returned by SkillsManager.requestMutation(). */
export type SkillMutationResult = {
  decision: SkillMutationDecision;
  /** The resulting skill after an applied create/update (absent for delete/pending/rejected). */
  skill?: SkillDefinition;
};

/**
 * Instance-level skills configuration (NeuroLink constructor `skills` option).
 * Opt-in: nothing is registered or injected unless `enabled: true`.
 */
export type SkillsConfig = {
  enabled: boolean;
  /** Persistence backend. Default: `{ type: "memory" }`. */
  storage?: SkillsStorageConfig;
  /**
   * Where the skills listing (names + descriptions, never instructions)
   * surfaces for model-driven discovery:
   *  - "tool" (default): an `<available_skills>` block embedded in the
   *    use_skill tool description — the Claude Code pattern. Keeps the
   *    host's system prompt untouched and the listing cache-stable.
   *  - "system-prompt": a "## Available Skills" index appended to the
   *    system prompt instead.
   *  - "none": no listing anywhere; discovery only via list_skills.
   */
  discovery?: SkillDiscoveryMode;
  /**
   * Character budget for the "tool" discovery listing. When the full
   * listing exceeds it, every description is shortened uniformly (first
   * sentence, then a hard cap) so the render stays a pure function of the
   * index — byte-stable across calls; names are never dropped.
   * Default: 15000.
   */
  listingBudgetChars?: number;
  /**
   * Pin activated skill instructions into session history so later turns
   * replay them verbatim (byte-stable, provider-cacheable) instead of
   * re-fetching the skill. Requires conversation memory + a sessionId on
   * the call. Default: true.
   */
  sessionPersistence?: boolean;
  /** Maximum skills hydrated (with instructions) per search. Default: 5. */
  maxMatches?: number;
  /**
   * Maximum entries rendered by the "system-prompt" discovery mode before
   * truncation. Default: 50. The "tool" mode is bounded by
   * listingBudgetChars instead and never drops entries.
   */
  promptIndexMaxItems?: number;
  /** Index cache TTL in milliseconds. Default: 30000. 0 disables caching. */
  indexCacheTtlMs?: number;
  /** Default scope filter applied when a call/tool provides none. */
  defaultScopeId?: string;
  /**
   * Register skill_create / skill_update / skill_delete tools so the model
   * can propose skill changes. Default: false. Combine with
   * `onMutationRequest` to gate writes behind host approval.
   */
  allowMutations?: boolean;
  /**
   * Host approval gate invoked before any mutation is applied. When absent
   * and allowMutations is true, mutations apply directly. Errors thrown
   * here reject the mutation (fail closed for writes).
   */
  onMutationRequest?: (
    action: SkillMutationAction,
  ) => Promise<SkillMutationDecision>;
};

/** Where the skills discovery listing surfaces. See SkillsConfig.discovery. */
export type SkillDiscoveryMode = "tool" | "system-prompt" | "none";

/**
 * One activated skill in a session: which skill, at which version, when.
 * Sessions pin the version active at activation time — a mid-session skill
 * update never mutates instructions the model has already loaded.
 */
export type SkillActivationRecord = {
  skillId: string;
  name: string;
  version: number;
  /** ISO timestamp of activation. */
  activatedAt: string;
};

/**
 * Structural view of the per-session activation tracker consumed by the
 * skill tools factory.
 */
export type SkillSessionStateLike = {
  isActive: (sessionId: string, skillId: string, name: string) => boolean;
  getActivation: (
    sessionId: string,
    skillId: string,
    name?: string,
  ) => SkillActivationRecord | undefined;
  recordActivation: (sessionId: string, skill: SkillDefinition) => ChatMessage;
  hydrate: (sessionId: string, storedMessages: ChatMessage[]) => void;
};

/**
 * Structural view of SkillsManager consumed by the skill tools factory —
 * keeps skillTools.ts decoupled from the concrete manager class.
 */
export type SkillsManagerLike = {
  search: (query: SkillSearchQuery) => Promise<SkillDefinition[]>;
  list: (scopeId?: string) => Promise<SkillIndexItem[]>;
  get: (idOrName: string) => Promise<SkillDefinition | null>;
  getResource: (
    idOrName: string,
    resourcePath: string,
  ) => Promise<string | null>;
  sessions: SkillSessionStateLike;
  requestMutation: (
    action: SkillMutationAction,
  ) => Promise<SkillMutationResult>;
};

/**
 * Per-call context bound into the use_skill / read_skill_resource tools at
 * injection time (prepareGenerate/prepareStream). The sessionId is captured
 * by closure so activation state is tracked without relying on runtime tool
 * context plumbing.
 */
export type SkillCallToolsContext = {
  /** Session the call belongs to; absent → activation state is per-turn only. */
  sessionId?: string;
  /** Scope filter applied when resolving skills for this call. */
  scopeId?: string;
  /**
   * Pin activated instructions into session history after the turn.
   * Mirrors SkillsConfig.sessionPersistence resolved for this call.
   */
  sessionPersistence: boolean;
  /** Discovery mode resolved for this call — shapes the use_skill description. */
  discovery: SkillDiscoveryMode;
  /** Rendered `<available_skills>` block for "tool" discovery; null when empty. */
  listing?: string | null;
  /**
   * Stored session history loader used to hydrate activation state before
   * every dedup check (restart/multi-instance/failed-persistence safety).
   * Invoked once per use_skill / read_skill_resource attempt.
   */
  getStoredMessages?: (sessionId: string) => Promise<ChatMessage[]>;
};

/** Options for the createSkillTools factory. */
export type SkillToolsOptions = {
  /** Include skill_create / skill_update / skill_delete. Default: false. */
  allowMutations?: boolean;
};

/**
 * Per-call skills control on generate()/stream(). Only effective when the
 * instance was constructed with skills enabled; per-call wins over instance
 * config (same precedence convention as per-call credentials).
 */
export type SkillsCallOptions = {
  /** Master toggle for this call (listing + per-call tools). Default: true. */
  enabled?: boolean;
  /** Per-call override of SkillsConfig.discovery. */
  discovery?: SkillDiscoveryMode;
  /** Scope filter for the listing and skill resolution on this call. Overrides defaultScopeId. */
  scopeId?: string;
  /** Restrict the listing to skills carrying at least one of these tags. */
  tags?: string[];
  /**
   * Skill names to activate at the start of this call: their full
   * instructions are injected up front (and pinned to the session when
   * sessionPersistence is on), without waiting for the model to invoke
   * use_skill. Already-active skills are skipped.
   */
  preload?: string[];
};

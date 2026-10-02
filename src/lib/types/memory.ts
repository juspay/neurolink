/**
 * Local structural types for the optional @juspay/hippocampus integration.
 *
 * These mirror the public shapes that ship with @juspay/hippocampus's
 * `dist/types.d.ts` so NeuroLink's public type surface stays compatible
 * for consumers that already configure memory, while the runtime package
 * itself becomes an optional peer dependency. The previous setup (a hard
 * value import of @juspay/hippocampus) made pnpm pull a registry copy of
 * @juspay/neurolink to satisfy Hippocampus's peer, which transitively
 * dragged @ai-sdk/google + @ai-sdk/google-vertex into the production
 * dependency graph.
 *
 * Naming:
 *  - Hippocampus's own `StorageType` and `RedisStorageConfig` collide with
 *    NeuroLink's in-house Redis manager types in `common.ts` /
 *    `conversation.ts`. To satisfy the `unique-type-names` ESLint rule,
 *    the storage variants get a `Memory*` prefix here.
 *  - `HippocampusMemory` (consumer-facing) and `StorageConfig` (legacy
 *    re-export) keep their original public names — only their definitions
 *    move from `import("@juspay/hippocampus").Foo` to local structural form.
 */

import type { TokenUsage } from "./analytics.js";
import type { AdditionalMemoryUser } from "./generate.js";
import type { NeurolinkCredentials } from "./providers.js";

export type MemorySqliteStorageConfig = {
  type: "sqlite";
  /** Path to SQLite file. Default: ./data/hippocampus.sqlite */
  path?: string;
};

export type MemoryRedisStorageConfig = {
  type: "redis";
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  ttl?: number;
};

export type MemoryS3StorageConfig = {
  type: "s3";
  bucket: string;
  prefix?: string;
};

export type MemoryCustomStorageConfig = {
  type: "custom";
  onGet: (ownerId: string) => Promise<string | null>;
  onSet: (ownerId: string, memory: string) => Promise<void>;
  onDelete: (ownerId: string) => Promise<void>;
  onClose?: () => Promise<void>;
};

/**
 * Storage configuration accepted by the optional Hippocampus client.
 * Re-exported with the legacy `StorageConfig` name from `conversation.ts`
 * to preserve the existing public type surface.
 */
export type HippocampusStorageConfig =
  | MemorySqliteStorageConfig
  | MemoryRedisStorageConfig
  | MemoryS3StorageConfig
  | MemoryCustomStorageConfig;

/** Per-call options accepted by `Hippocampus.add`. */
export type HippocampusAddOptions = {
  prompt?: string;
  maxWords?: number;
};

/**
 * The exact request shape Hippocampus's condenser sends to `generate()`
 * (`@juspay/hippocampus` `src/client.ts`, the `neurolink.generate({...})`
 * call inside `add()`). A full `NeuroLink` instance satisfies this
 * structurally; so does any host object that can answer a plain text prompt.
 */
export type HippocampusCondenserGenerateOptions = {
  input: { text: string };
  provider?: string;
  model?: string;
  temperature?: number;
  disableTools?: boolean;
};

/** The only field Hippocampus reads back from the condensation call. */
export type HippocampusCondenserResult = {
  content?: string;
};

/**
 * Minimal `generate()`-bearing object Hippocampus can use for condensation
 * instead of constructing its own bare `new NeuroLink()`.
 */
export type HippocampusNeurolinkLike = {
  generate: (
    options: HippocampusCondenserGenerateOptions,
  ) => Promise<HippocampusCondenserResult>;
};

/**
 * Condenser settings forwarded to Hippocampus.
 *
 * `provider` / `model` / `temperature` select the condensation model.
 * `credentials` and `instance` are read by `@juspay/hippocampus` ≥0.2.0;
 * the peer floor is 0.2.1, which also substitutes the condensation
 * placeholders literally (user content containing `$&` no longer corrupts
 * the prompt)
 * (the peer floor): NeuroLink always fills `instance` itself — a dedicated
 * child instance that carries this instance's `credentials` — unless the
 * host supplies one, so condensation stops depending on provider keys being
 * present in `process.env`.
 */
export type HippocampusNeurolinkConfig = {
  provider?: string;
  model?: string;
  temperature?: number;
  /**
   * Credentials for the condenser's own NeuroLink instance. Defaults to the
   * parent `new NeuroLink({ credentials })` value.
   */
  credentials?: NeurolinkCredentials;
  /**
   * Host-managed condenser. When set, NeuroLink does not build a child
   * instance and passes this object through untouched.
   */
  instance?: HippocampusNeurolinkLike;
};

/** Constructor config accepted by the Hippocampus class. */
export type HippocampusConfig = {
  storage?: HippocampusStorageConfig;
  prompt?: string;
  neurolink?: HippocampusNeurolinkConfig;
  maxWords?: number;
};

/**
 * One completed turn as seen by the memory write hooks. `usage`,
 * `finishReason` and `toolsUsed` are best-effort: the generate path has the
 * full result, the stream path only knows the provider, the accumulated
 * text and which tools started.
 */
export type MemoryTurn = {
  /** The caller's original prompt, before memory context was prepended. */
  prompt: string;
  /** The assistant's final text, trimmed. */
  response: string;
  /** Primary memory owner — `context.userId`. */
  userId: string;
  /** `context.sessionId`, when the call carried one. */
  sessionId?: string;
  provider?: string;
  model?: string;
  /** Names of tools that ran during the turn. */
  toolsUsed?: string[];
  /** Token usage — generate path only. */
  usage?: TokenUsage;
  /** Provider finish reason — generate path only. */
  finishReason?: string;
};

/**
 * Gate that decides whether a turn is written to memory at all. Runs inside
 * the deferred background write, never on the response path. Returning
 * `false` skips every `add()` for the turn (primary owner and
 * `additionalUsers`). A thrown error is logged and treated as `false`.
 */
export type MemoryShouldWriteHook = (
  turn: MemoryTurn,
) => boolean | Promise<boolean>;

/**
 * Transform (or veto) the exact text handed to `Hippocampus.add()`. Receives
 * the default `"User: …\nAssistant: …"` rendering; return a replacement
 * string, or `null` to skip the write. A thrown error is logged and the
 * write is skipped — a missed memory is recoverable, a polluted condensed
 * summary is not.
 */
export type MemoryBeforeStoreHook = (
  content: string,
  turn: MemoryTurn,
) => string | null | Promise<string | null>;

/**
 * Write-side hooks accepted both per call (`generate({ memory })` /
 * `stream({ memory })`) and on the instance
 * (`conversationMemory.memory`). When both are set for the same hook, the
 * per-call one wins for that call.
 */
export type MemoryWriteHooks = {
  shouldWrite?: MemoryShouldWriteHook;
  onBeforeStore?: MemoryBeforeStoreHook;
};

/**
 * Per-call `memory` block shared by `GenerateOptions` and `StreamOptions`.
 *
 * Overrides the instance-level memory behaviour for one call. All flags
 * default to `true` when the instance memory SDK is enabled; when it is
 * disabled this block has no effect.
 */
export type MemoryCallOptions = MemoryWriteHooks & {
  /** Master toggle for this call. When false, both read and write are skipped. Defaults to true. */
  enabled?: boolean;
  /** Whether to read condensed memory and prepend to prompt. Defaults to true. */
  read?: boolean;
  /** Whether to write (add/condense) the conversation into memory after completion. Defaults to true. */
  write?: boolean;
  /**
   * Additional users whose memory should be retrieved/stored alongside the primary user.
   * Each entry can override the condensation prompt and maxWords for that user.
   * Primary user is still determined by context.userId.
   */
  additionalUsers?: AdditionalMemoryUser[];
  /**
   * Condensation prompt for the primary owner on this call. Precedence:
   * per-call > instance `conversationMemory.memory.prompt` > Hippocampus
   * default. Must contain `{{OLD_MEMORY}}` and `{{NEW_CONTENT}}`; a template
   * missing either is logged and the instance prompt is used instead. An
   * empty or whitespace-only string counts as unset.
   */
  prompt?: string;
  /** Max words for the primary owner's condensed memory on this call. */
  maxWords?: number;
};

/** Placeholder names a condensation prompt template can carry. */
export type CondensationPlaceholder =
  | "OLD_MEMORY"
  | "NEW_CONTENT"
  | "MAX_WORDS";

/**
 * Result of `validateCondensationPrompt()`. `missing` lists every absent
 * placeholder; `fatal` is the subset whose absence breaks memory
 * (`OLD_MEMORY`: each turn overwrites the summary; `NEW_CONTENT`: memory
 * never grows). A missing `MAX_WORDS` only loses the word cap.
 */
export type CondensationPromptValidation = {
  valid: boolean;
  missing: CondensationPlaceholder[];
  fatal: CondensationPlaceholder[];
};

/**
 * Subset of the @juspay/hippocampus client surface that NeuroLink core
 * actually calls. Defining this locally lets the initializer / SDK code
 * avoid a value or even a type import from the optional package.
 */
export type HippocampusLike = {
  add: (
    ownerId: string,
    content: string,
    options?: HippocampusAddOptions,
  ) => Promise<string>;
  get: (ownerId: string) => Promise<string | null>;
  delete: (ownerId: string) => Promise<void>;
  close: () => Promise<void>;
};

/** Builds a Hippocampus-compatible client from the config NeuroLink assembled. */
export type HippocampusClientFactory = (
  config: HippocampusConfig,
) => HippocampusLike;

/**
 * Consumer-facing memory config. The `enabled` flag toggles activation; the
 * `HippocampusConfig` part is passed to the Hippocampus constructor when the
 * optional package is installed. The remaining fields are NeuroLink-side and
 * never reach Hippocampus.
 */
export type HippocampusMemory = HippocampusConfig &
  MemoryWriteHooks & {
    enabled?: boolean;
    /**
     * Host-managed Hippocampus client (or any object with the same
     * `add/get/delete/close` surface). When set, NeuroLink skips loading and
     * constructing `@juspay/hippocampus` and uses this instance directly.
     * `add()` and `get()` are what core calls and must both be functions;
     * a client missing either disables memory with an `error` log.
     *
     * As a factory it receives the `HippocampusConfig` NeuroLink assembled —
     * including the credentialed condenser under `neurolink.instance` — so a
     * host can construct its own client (a subclass, a different version, a
     * test double) from exactly what `new Hippocampus(config)` would get.
     */
    client?: HippocampusLike | HippocampusClientFactory;
    /**
     * When true, a condensation prompt template (instance `prompt` or
     * `HC_CONDENSATION_PROMPT`) missing `{{OLD_MEMORY}}` or `{{NEW_CONTENT}}`
     * makes the constructor throw instead of the default disable-and-log
     * (at `error`). An empty or whitespace-only template counts as unset.
     */
    strictPrompt?: boolean;
  };

/**
 * Shape of the dynamically-required `@juspay/hippocampus` module surface
 * that NeuroLink's lazy initializer reaches for. Only the constructor is
 * surfaced here; the rest of the module is irrelevant to core.
 */
export type HippocampusModule = {
  Hippocampus: new (config?: HippocampusConfig) => HippocampusLike;
};

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

/** Constructor config accepted by the Hippocampus class. */
export type HippocampusConfig = {
  storage?: HippocampusStorageConfig;
  prompt?: string;
  neurolink?: {
    provider?: string;
    model?: string;
    temperature?: number;
  };
  maxWords?: number;
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

/**
 * Consumer-facing memory config. Same shape as before — the `enabled`
 * flag toggles activation while the rest is passed straight through to
 * the Hippocampus constructor when the optional package is installed.
 */
export type HippocampusMemory = HippocampusConfig & { enabled?: boolean };

/**
 * Shape of the dynamically-required `@juspay/hippocampus` module surface
 * that NeuroLink's lazy initializer reaches for. Only the constructor is
 * surfaced here; the rest of the module is irrelevant to core.
 */
export type HippocampusModule = {
  Hippocampus: new (config?: HippocampusConfig) => HippocampusLike;
};

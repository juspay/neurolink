#!/usr/bin/env tsx

/**
 * Continuous Test Suite — the conversation erasure write fence
 *
 * A Redis conversation writer that opts in with
 * `erasureWriteProtocol: "conversation-erasure-v1"` is admitted once against a
 * standalone, non-evicting Redis and then writes through one atomic script that
 * refuses when the server run id, the store epoch or the eviction counter has
 * moved, or when the session was permanently erased. A writer that did not opt
 * in must behave exactly as before.
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from `src/lib/`
 * and is on the `neurolink/e2e-tests-only` allow list. What is under test is
 * not reachable through `generate()` or `stream()`:
 *   - the guarded events are a Redis server restart, a change of its eviction
 *     counter, a rewritten epoch record and a write landing after an erasure;
 *     no live run can be made to produce them, or to land a write at the one
 *     instant between a writer's admission and its commit;
 *   - the sites are internal write paths of the Redis memory manager (the turn
 *     persist, the per-user index, the background title and summarization
 *     write-backs, the agentic-loop report) that no caller can aim at.
 * Everything comes from `src`, never `dist`.
 *
 * Two backends run the same scenarios. The in-process stand-in always runs; it
 * models the script's semantics, so it proves the TypeScript side (which write
 * goes to which path, which error comes back, what is sent). The real-server
 * cases connect to `NEUROLINK_TEST_REDIS_URL` (default
 * `redis://localhost:6379`) and SKIP when nothing answers or the server is not
 * a standalone `noeviction` one; they are the only ones that run the Lua, so
 * run them when touching the scripts. Every key a real-server case writes sits
 * under a unique prefix and is deleted by it.
 *
 * Run: npx tsx test/continuous-test-suite-conversation-erasure-fence.ts
 */

// First, so that no developer `.env` is loaded and no ambient Redis URL leaks in.
import "./helpers/credentialFreeEnv.js";
import { createHash, randomUUID } from "node:crypto";
import { createServer as createTcpServer } from "node:net";
import type { AddressInfo, Socket } from "node:net";
import { createClient } from "redis";
import {
  defineSuite,
  assert,
  assertEqual,
  delay,
  Skip,
} from "./helpers/harness.js";
import { NeuroLink } from "../src/lib/neurolink.js";
import { RedisConversationMemoryManager } from "../src/lib/core/redisConversationMemoryManager.js";
import {
  erasureFenceKey,
  eraseSessionPermanently,
  fencedSessionIndexWrite,
  fencedSessionMetadataWrite,
  fencedSessionPersist,
  prepareConversationWriteContext,
} from "../src/lib/core/conversationErasureFence.js";
import {
  getNormalizedConfig,
  getSessionKey,
  getSessionMessagesKey,
  getUserSessionsKey,
  scanKeys,
} from "../src/lib/utils/redis.js";
import {
  ConversationMemoryError,
  ConversationSessionErasedError,
  ConversationWriterEpochError,
} from "../src/lib/types/index.js";
import type {
  ConversationErasureWriteContext,
  ConversationMemoryConfig,
  RedisClient,
} from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Conversation erasure fence", {
  offline: true,
});

const TTL_SECONDS = 600;
const PROTOCOL = "conversation-erasure-v1";
const REAL_REDIS_URL =
  process.env.NEUROLINK_TEST_REDIS_URL ?? "redis://localhost:6379";

// ---------------------------------------------------------------------------
// The stand-in server
// ---------------------------------------------------------------------------

type EvalOptions = { keys: string[]; arguments: string[] };

/**
 * The commands the code under test uses, with the semantics of the two scripts.
 * `eval` recognises a script by its content, so a changed script that stops
 * matching fails loudly instead of silently taking the wrong branch.
 */
class FenceRedis {
  isOpen = true;
  strings = new Map<string, string>();
  lists = new Map<string, string[]>();
  sets = new Map<string, Set<string>>();
  ttls = new Map<string, number>();
  runId = randomUUID().replace(/-/g, "");
  evictedKeys = 0;
  policy = "noeviction";
  clusterEnabled = 0;
  scripts: string[] = [];
  evalCalls = 0;
  plainWrites = 0;

  async info(section: string): Promise<string> {
    if (section === "cluster") {
      return `# Cluster\r\ncluster_enabled:${this.clusterEnabled}\r\n`;
    }
    if (section === "memory") {
      return `# Memory\r\nmaxmemory_policy:${this.policy}\r\n`;
    }
    if (section === "server") {
      return `# Server\r\nrun_id:${this.runId}\r\n`;
    }
    return "";
  }
  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<string> {
    this.plainWrites += 1;
    this.strings.set(key, value);
    this.ttls.delete(key);
    return "OK";
  }
  async sAdd(key: string, member: string): Promise<number> {
    this.plainWrites += 1;
    const members = this.sets.get(key) ?? new Set<string>();
    members.add(member);
    this.sets.set(key, members);
    return 1;
  }
  async sMembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }
  async expire(key: string, seconds: number): Promise<number> {
    this.ttls.set(key, seconds);
    return 1;
  }
  async del(keys: string | string[]): Promise<number> {
    let removed = 0;
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const existed =
        this.strings.delete(key) ||
        this.lists.delete(key) ||
        this.sets.delete(key);
      this.ttls.delete(key);
      removed += existed ? 1 : 0;
    }
    return removed;
  }
  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) ?? [];
    return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
  }
  async lLen(key: string): Promise<number> {
    return (this.lists.get(key) ?? []).length;
  }
  multi() {
    const operations: Array<() => void> = [];
    const transaction = {
      del: (key: string) => {
        operations.push(() => {
          this.lists.delete(key);
        });
        return transaction;
      },
      rPush: (key: string, values: string | string[]) => {
        operations.push(() => {
          const list = this.lists.get(key) ?? [];
          list.push(...(Array.isArray(values) ? values : [values]));
          this.lists.set(key, list);
        });
        return transaction;
      },
      set: (key: string, value: string) => {
        operations.push(() => {
          this.strings.set(key, value);
          this.ttls.delete(key);
        });
        return transaction;
      },
      sAdd: (key: string, member: string) => {
        operations.push(() => {
          const members = this.sets.get(key) ?? new Set<string>();
          members.add(member);
          this.sets.set(key, members);
        });
        return transaction;
      },
      expire: (key: string, seconds: number) => {
        operations.push(() => {
          this.ttls.set(key, seconds);
        });
        return transaction;
      },
      exec: async () => {
        this.plainWrites += 1;
        operations.forEach((operation) => operation());
        return [];
      },
    };
    return transaction;
  }

  async eval(script: string, options: EvalOptions): Promise<unknown> {
    this.evalCalls += 1;
    this.scripts.push(script);
    const { keys, arguments: args } = options;
    if (script.includes("SESSION_WRITER_POLICY_UNSUPPORTED")) {
      return this.prepare(keys[0], args[0], args[1]);
    }
    if (script.includes("Unsupported erasure-fence mode")) {
      return this.fenced(keys, args);
    }
    throw new Error("stand-in does not recognise this script");
  }

  private prepare(key: string, runId: string, fresh: string): unknown {
    if (runId !== this.runId) {
      throw new Error("SESSION_WRITER_EPOCH_LOST");
    }
    if (this.policy !== "noeviction") {
      throw new Error("SESSION_WRITER_POLICY_UNSUPPORTED");
    }
    let stored = this.strings.get(key);
    if (stored === undefined || !stored.startsWith(`${runId}:`)) {
      stored = `${runId}:${fresh}`;
      this.strings.set(key, stored);
    }
    return [stored, String(this.evictedKeys)];
  }

  private fenced(keys: string[], args: string[]): unknown {
    const [blob, list, index, tombstone, epoch] = keys;
    if (args[7] !== this.runId) {
      throw new Error("SESSION_WRITER_EPOCH_LOST");
    }
    if ((this.strings.get(epoch) ?? null) !== args[8]) {
      throw new Error("SESSION_WRITER_EPOCH_LOST");
    }
    if (this.policy !== "noeviction") {
      throw new Error("SESSION_WRITER_EPOCH_LOST");
    }
    if (String(this.evictedKeys) !== args[9]) {
      throw new Error("SESSION_WRITER_EPOCH_LOST");
    }
    const mode = args[0];
    if (mode === "erase") {
      this.strings.set(tombstone, PROTOCOL);
      let deleted = 0;
      for (const key of [blob, list]) {
        if (this.strings.delete(key) || this.lists.delete(key)) {
          deleted += 1;
        }
        this.ttls.delete(key);
      }
      const members = this.sets.get(index);
      const member = members?.delete(args[1]) ? 1 : 0;
      if (members?.size === 0) {
        // Redis drops a set that has lost its last member.
        this.sets.delete(index);
      }
      return [1, deleted, member];
    }
    if (this.strings.has(tombstone)) {
      throw new Error("SESSION_ERASED");
    }
    const ttl = Number(args[2]);
    if (mode === "index") {
      const members = this.sets.get(index) ?? new Set<string>();
      members.add(args[1]);
      this.sets.set(index, members);
      if (ttl > 0) {
        this.ttls.set(index, ttl);
      }
      return 1;
    }
    if (mode === "persist") {
      if (args[3] === "replace") {
        this.lists.delete(list);
      }
      const pushed = JSON.parse(args[4]) as string[];
      if (pushed.length > 0) {
        this.lists.set(list, [...(this.lists.get(list) ?? []), ...pushed]);
      }
      this.strings.set(blob, args[5]);
      if (ttl > 0) {
        this.ttls.set(blob, ttl);
        this.ttls.set(list, ttl);
      }
      return 1;
    }
    if (mode === "metadata") {
      this.strings.set(blob, args[3]);
      if (ttl > 0) {
        this.ttls.set(blob, ttl);
      }
      return 1;
    }
    throw new Error("Unsupported erasure-fence mode");
  }
}

// ---------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------

type Observer = {
  text: (key: string) => Promise<string | null>;
  exists: (key: string) => Promise<boolean>;
  listLength: (key: string) => Promise<number>;
  members: (key: string) => Promise<string[]>;
  ttl: (key: string) => Promise<number>;
  /** Move the store out from under an admitted writer. */
  changeEpoch: (epochRecordKey: string) => Promise<void>;
};

type Backend = {
  label: string;
  rootPrefix: string;
  redisUrl: string;
  observer: Observer;
  /** Stand-in only: the server, for changes a real one cannot be made to show. */
  server: FenceRedis | null;
  /** Hands the manager its client and admits it the way initialize() would. */
  attach: (manager: RedisConversationMemoryManager) => Promise<void>;
  dispose: () => Promise<void>;
};

type ManagerInternals = {
  isInitialized: boolean;
  redisClient: unknown;
  erasureWriteContext: ConversationErasureWriteContext | undefined;
  redisConfig: ReturnType<typeof getNormalizedConfig>;
  generateConversationTitle: (message: string) => Promise<string>;
};

const internalsOf = (manager: RedisConversationMemoryManager) =>
  manager as unknown as ManagerInternals;

const openStandIn = async (): Promise<Backend> => {
  const server = new FenceRedis();
  const rootPrefix = `nl-erasure-fence-${randomUUID().slice(0, 8)}:`;
  return {
    label: "stand-in",
    rootPrefix,
    redisUrl: "redis://stand-in.invalid:6379",
    server,
    observer: {
      text: async (key) => server.strings.get(key) ?? null,
      exists: async (key) =>
        server.strings.has(key) ||
        server.lists.has(key) ||
        server.sets.has(key),
      listLength: async (key) => (server.lists.get(key) ?? []).length,
      members: async (key) => [...(server.sets.get(key) ?? [])],
      ttl: async (key) => server.ttls.get(key) ?? -1,
      changeEpoch: async (key) => {
        server.strings.set(key, `${server.runId}:${randomUUID()}`);
      },
    },
    attach: async (manager) => {
      const internals = internalsOf(manager);
      internals.isInitialized = true;
      internals.redisClient = server;
      internals.erasureWriteContext = await prepareConversationWriteContext(
        server as unknown as RedisClient,
        internals.redisConfig,
        manager.config.erasureWriteProtocol === PROTOCOL,
      );
    },
    dispose: async () => undefined,
  };
};

const openRealServer = async (): Promise<Backend> => {
  const probeClient = createClient({
    url: REAL_REDIS_URL,
    socket: { connectTimeout: 1_000, reconnectStrategy: false },
  });
  probeClient.on("error", () => {
    // Reported through the Skip below; an unhandled 'error' would throw.
  });
  try {
    await probeClient.connect();
    await probeClient.ping();
  } catch {
    try {
      await probeClient.disconnect();
    } catch {
      // Never connected.
    }
    throw new Skip(
      `no Redis reachable at ${REAL_REDIS_URL.replace(/\/\/[^@]+@/, "//[redacted]@")}`,
    );
  }
  const cluster = await probeClient.info("cluster");
  const memory = await probeClient.info("memory");
  if (
    !/cluster_enabled:0/.test(cluster) ||
    !/maxmemory_policy:noeviction/.test(memory)
  ) {
    await probeClient.quit();
    throw new Skip(
      "the Redis at the test URL is not a standalone noeviction server",
    );
  }
  const rootPrefix = `nl-erasure-fence-${randomUUID().slice(0, 8)}:`;
  const opened: Array<() => Promise<void>> = [];
  const epochKeys: string[] = [];
  return {
    label: "real server",
    rootPrefix,
    redisUrl: REAL_REDIS_URL,
    server: null,
    observer: {
      text: async (key) => (await probeClient.get(key)) as string | null,
      exists: async (key) => (await probeClient.exists(key)) === 1,
      listLength: (key) => probeClient.lLen(key),
      members: (key) => probeClient.sMembers(key),
      ttl: (key) => probeClient.ttl(key),
      changeEpoch: async (key) => {
        epochKeys.push(key);
        const run = /run_id:([^\r\n]+)/.exec(
          await probeClient.info("server"),
        )?.[1];
        await probeClient.set(key, `${run}:${randomUUID()}`);
      },
    },
    attach: async (manager) => {
      await manager.initialize();
      opened.push(() => manager.close());
    },
    dispose: async () => {
      for (const close of opened) {
        await close().catch(() => undefined);
      }
      const leftovers = await scanKeys(probeClient, `${rootPrefix}*`);
      if (leftovers.length > 0) {
        await probeClient.del(leftovers);
      }
      // Fence keys do not carry the test prefix: the tombstone is a digest of
      // the session key and the epoch record a digest of the prefixes.
      for (const key of epochKeys) {
        await probeClient.del(key);
      }
      for (const key of fenceKeysToRemove) {
        await probeClient.del(key);
      }
      fenceKeysToRemove.length = 0;
      await probeClient.quit();
    },
  };
};

/** Tombstones and epoch records written by a real-server scenario. */
const fenceKeysToRemove: string[] = [];

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const memoryConfig = (strict: boolean): ConversationMemoryConfig =>
  ({
    enabled: true,
    maxSessions: 10,
    enableSummarization: false,
    ...(strict ? { erasureWriteProtocol: PROTOCOL } : {}),
  }) as ConversationMemoryConfig;

type Subject = {
  manager: RedisConversationMemoryManager;
  internals: ManagerInternals;
  redisConfig: ReturnType<typeof getNormalizedConfig>;
  sessionId: string;
  userId: string;
  sessionKey: string;
  messagesKey: string;
  userSessionsKey: string;
  tombstoneKey: string;
  epochRecordKey: string;
};

const epochRecordKeyFor = (
  config: ReturnType<typeof getNormalizedConfig>,
): string => {
  // Same derivation as the module under test, observed through the context a
  // fenced writer is admitted with: the record is the only key the prepare
  // script writes.
  return `neurolink-erasure-epoch-v1:${sha256(
    JSON.stringify([config.keyPrefix, config.userSessionsKeyPrefix]),
  )}`;
};

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const openSubject = async (
  backend: Backend,
  strict: boolean,
): Promise<Subject> => {
  const redisConfig = {
    url: backend.redisUrl,
    keyPrefix: `${backend.rootPrefix}conv:`,
    userSessionsKeyPrefix: `${backend.rootPrefix}users:`,
    ttl: TTL_SECONDS,
  };
  const manager = new RedisConversationMemoryManager(
    memoryConfig(strict),
    redisConfig,
  );
  await backend.attach(manager);
  const internals = internalsOf(manager);
  internals.generateConversationTitle = async () => "A title";
  const normalized = getNormalizedConfig(redisConfig);
  const sessionId = `sess-${randomUUID().slice(0, 8)}`;
  const userId = `user-${randomUUID().slice(0, 8)}`;
  const sessionKey = getSessionKey(normalized, sessionId, userId);
  const tombstoneKey = erasureFenceKey(sessionKey);
  const epochRecordKey = epochRecordKeyFor(normalized);
  fenceKeysToRemove.push(tombstoneKey, epochRecordKey);
  return {
    manager,
    internals,
    redisConfig: normalized,
    sessionId,
    userId,
    sessionKey,
    messagesKey: getSessionMessagesKey(normalized, sessionId, userId),
    userSessionsKey: getUserSessionsKey(normalized, userId),
    tombstoneKey,
    epochRecordKey,
  };
};

const storeTurn = (subject: Subject, text = "show my sales") =>
  subject.manager.storeConversationTurn({
    sessionId: subject.sessionId,
    userId: subject.userId,
    userMessage: text,
    aiResponse: "Sales are up.",
    enableSummarization: false,
  });

const withBackend = async (
  open: () => Promise<Backend>,
  scenario: (backend: Backend) => Promise<void>,
): Promise<void> => {
  const backend = await open();
  try {
    await scenario(backend);
  } finally {
    await backend.dispose();
  }
};

const rejection = async (work: Promise<unknown>): Promise<unknown> => {
  try {
    await work;
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to reject");
};

const fencedContext = (
  subject: Subject,
  overrides: Partial<
    Extract<ConversationErasureWriteContext, { mode: "fenced" }>
  > = {},
): ConversationErasureWriteContext => {
  const context = subject.internals.erasureWriteContext;
  if (context?.mode !== "fenced") {
    throw new Error("the writer must have been admitted");
  }
  return { ...context, ...overrides };
};

const client = (backend: Backend, subject: Subject): RedisClient =>
  (backend.server ?? subject.internals.redisClient) as RedisClient;

/**
 * The stand-in server, for the cases a real one cannot be made to show.
 * `assert` returns `void`, so it cannot narrow `backend.server`; this throws.
 */
const standInServer = (backend: Backend): FenceRedis => {
  if (backend.server === null) {
    throw new Error("stand-in only");
  }
  return backend.server;
};

// ---------------------------------------------------------------------------
// Scenarios, run on every backend
// ---------------------------------------------------------------------------

/** No opt-in: the same keys, TTLs and index as before the fence existed. */
const ordinaryWriterIsUnchanged = (backend: Backend) => async () => {
  const subject = await openSubject(backend, false);
  assertEqual(
    subject.internals.erasureWriteContext?.mode,
    "legacy",
    "a writer that did not opt in must stay legacy",
  );
  const status = subject.manager.getConversationErasureWriterStatus();
  assertEqual(status.status, "unsupported", "legacy is not a participant");
  assertEqual(status.protocol, PROTOCOL, "the status names the protocol");

  await storeTurn(subject);
  await storeTurn(subject, "and last month?");

  assertEqual(
    await backend.observer.listLength(subject.messagesKey),
    4,
    "two turns append four messages to the LIST",
  );
  assert(
    (await backend.observer.text(subject.sessionKey)) !== null,
    "the metadata blob is written",
  );
  assert(
    (await backend.observer.members(subject.userSessionsKey)).includes(
      subject.sessionId,
    ),
    "the session is in the user's index",
  );
  for (const key of [
    subject.sessionKey,
    subject.messagesKey,
    subject.userSessionsKey,
  ]) {
    const ttl = await backend.observer.ttl(key);
    assert(
      ttl > 0 && ttl <= TTL_SECONDS,
      `${key} carries the TTL, found ${ttl}`,
    );
  }
  assert(
    !(await backend.observer.exists(subject.tombstoneKey)),
    "an ordinary writer leaves no tombstone",
  );
  if (backend.server) {
    assertEqual(
      backend.server.evalCalls,
      0,
      "an ordinary writer runs no script",
    );
    assert(backend.server.plainWrites > 0, "it uses the plain commands");
  }
  await subject.manager.setSessionMessages(
    subject.sessionId,
    [
      {
        id: "m1",
        role: "user",
        content: "replaced",
        timestamp: new Date().toISOString(),
      },
    ] as never,
    subject.userId,
  );
  assertEqual(
    await backend.observer.listLength(subject.messagesKey),
    1,
    "a wholesale replace still rewrites the LIST",
  );
};

const ordinaryWriterCannotErase = (backend: Backend) => async () => {
  const subject = await openSubject(backend, false);
  await storeTurn(subject);
  const error = await rejection(
    subject.manager.eraseSessionPermanently(subject.sessionId, subject.userId),
  );
  assert(
    error instanceof ConversationWriterEpochError,
    "a legacy writer must not erase permanently",
  );
  assert(
    await backend.observer.exists(subject.sessionKey),
    "the refused erasure must leave the session in place",
  );
};

const fencedWriterStoresAndErases = (backend: Backend) => async () => {
  const subject = await openSubject(backend, true);
  const status = subject.manager.getConversationErasureWriterStatus();
  assertEqual(status.status, "participating", "a strict writer participates");
  assertEqual(status.strict, true, "and says it is strict");

  await storeTurn(subject);
  await storeTurn(subject, "and last month?");
  assertEqual(
    await backend.observer.listLength(subject.messagesKey),
    4,
    "the fenced persist appends the same four messages",
  );
  for (const key of [
    subject.sessionKey,
    subject.messagesKey,
    subject.userSessionsKey,
  ]) {
    const ttl = await backend.observer.ttl(key);
    assert(
      ttl > 0 && ttl <= TTL_SECONDS,
      `${key} carries the TTL, found ${ttl}`,
    );
  }
  assert(
    (await backend.observer.members(subject.userSessionsKey)).includes(
      subject.sessionId,
    ),
    "the fenced index write lands",
  );

  const receipt = await subject.manager.eraseSessionPermanently(
    subject.sessionId,
    subject.userId,
  );
  assertEqual(receipt.status, "erased", "the erasure is confirmed");
  assertEqual(receipt.protocol, PROTOCOL, "the receipt names the protocol");
  assertEqual(receipt.legacyWritersFenced, false, "and does not overclaim");
  assertEqual(receipt.removedIndexMembers, 1, "the index entry is removed");
  assert(receipt.deletedKeys >= 1, "the session keys are deleted");
  assert(
    /^[a-f0-9]{64}$/.test(receipt.storeEpochDigest),
    "the epoch is reported as a digest, not raw",
  );
  assert(
    !(await backend.observer.exists(subject.sessionKey)) &&
      !(await backend.observer.exists(subject.messagesKey)),
    "the session keys are gone",
  );
  assert(
    await backend.observer.exists(subject.tombstoneKey),
    "the tombstone is set",
  );

  // A late writer of the same fenced population cannot bring the session back.
  const lateTurn = await rejection(storeTurn(subject, "late write"));
  assert(
    /erased/i.test(String((lateTurn as Error).message)) ||
      /erased/i.test(
        JSON.stringify((lateTurn as { details?: unknown }).details),
      ),
    `a turn after erasure must be refused as erased, got: ${String(lateTurn)}`,
  );
  assert(
    !(await backend.observer.exists(subject.sessionKey)) &&
      !(await backend.observer.exists(subject.messagesKey)),
    "the refused turn must not recreate the session",
  );

  const rawContext = fencedContext(subject);
  const redisClient = client(backend, subject);
  const common = [redisClient, subject.redisConfig, subject.sessionId] as const;
  for (const [what, write] of [
    [
      "metadata",
      () =>
        fencedSessionMetadataWrite(...common, subject.userId, "{}", rawContext),
    ],
    [
      "index",
      () => fencedSessionIndexWrite(...common, subject.userId, rawContext),
    ],
    [
      "persist",
      () =>
        fencedSessionPersist(
          ...common,
          subject.userId,
          { mode: "append", messages: ["x"], payload: "{}" },
          rawContext,
        ),
    ],
  ] as const) {
    const error = await rejection(write());
    assert(
      error instanceof ConversationSessionErasedError,
      `a ${what} write after erasure must raise ConversationSessionErasedError`,
    );
    assertEqual(
      (error as ConversationSessionErasedError).code,
      "SESSION_ERASED",
    );
  }
  assert(
    !(await backend.observer.exists(subject.sessionKey)) &&
      !(await backend.observer.exists(subject.userSessionsKey)),
    "no refused write left a key behind",
  );
};

const contextMissingOrUnqualified = (backend: Backend) => async () => {
  const subject = await openSubject(backend, true);
  const redisClient = client(backend, subject);
  const common = [redisClient, subject.redisConfig, subject.sessionId] as const;
  const legacy: ConversationErasureWriteContext = {
    mode: "legacy",
    reason: "compatible-client",
    strict: false,
  };
  const admitted = fencedContext(subject);
  const nonStrict = {
    ...admitted,
    strict: false,
  } as ConversationErasureWriteContext;

  // Missing context: a fenced-population write has nothing to prove its epoch.
  for (const [what, write] of [
    [
      "metadata",
      () =>
        fencedSessionMetadataWrite(...common, subject.userId, "{}", undefined),
    ],
    [
      "index",
      () => fencedSessionIndexWrite(...common, subject.userId, undefined),
    ],
    [
      "persist",
      () =>
        fencedSessionPersist(
          ...common,
          subject.userId,
          { mode: "replace", messages: [], payload: "{}" },
          undefined,
        ),
    ],
    [
      "erase",
      () => eraseSessionPermanently(...common, subject.userId, undefined),
    ],
  ] as const) {
    const error = await rejection(write());
    assert(
      error instanceof ConversationWriterEpochError,
      `a ${what} without a context must raise ConversationWriterEpochError`,
    );
    assertEqual(
      (error as ConversationWriterEpochError).code,
      "SESSION_WRITER_EPOCH_LOST",
    );
  }
  assert(
    !(await backend.observer.exists(subject.sessionKey)) &&
      !(await backend.observer.exists(subject.userSessionsKey)),
    "a refused write must not touch the store",
  );

  // Unqualified context: erasure needs a strict, fenced writer.
  for (const [what, context] of [
    ["legacy", legacy],
    ["non-strict", nonStrict],
  ] as const) {
    const error = await rejection(
      eraseSessionPermanently(...common, subject.userId, context),
    );
    assert(
      error instanceof ConversationWriterEpochError,
      `erasure with a ${what} context must raise ConversationWriterEpochError`,
    );
  }

  // Explicit identifiers are required.
  for (const [sessionId, userId] of [
    ["", subject.userId],
    [subject.sessionId, "  "],
  ] as const) {
    const error = await rejection(
      eraseSessionPermanently(
        redisClient,
        subject.redisConfig,
        sessionId,
        userId,
        admitted,
      ),
    );
    assert(
      /Explicit sessionId and userId/.test(String((error as Error).message)),
      "erasure without explicit ids must be refused",
    );
  }
  assert(
    !(await backend.observer.exists(subject.tombstoneKey)),
    "no refused erasure may set the tombstone",
  );
};

const epochChangesBetweenAdmissionAndPersist =
  (backend: Backend) => async () => {
    const subject = await openSubject(backend, true);
    await storeTurn(subject);
    const before = await backend.observer.listLength(subject.messagesKey);
    const blobBefore = await backend.observer.text(subject.sessionKey);

    await backend.observer.changeEpoch(subject.epochRecordKey);

    const error = await rejection(storeTurn(subject, "after the epoch moved"));
    assert(
      /epoch/i.test(String((error as Error).message)) ||
        /SESSION_WRITER_EPOCH_LOST|epoch/i.test(
          JSON.stringify((error as { details?: unknown }).details),
        ),
      `a turn written under a changed epoch must be refused, got: ${String(error)}`,
    );
    assertEqual(
      await backend.observer.listLength(subject.messagesKey),
      before,
      "the refused turn must append nothing",
    );
    assertEqual(
      await backend.observer.text(subject.sessionKey),
      blobBefore,
      "the refused turn must not rewrite the metadata",
    );

    const direct = await rejection(
      fencedSessionPersist(
        client(backend, subject),
        subject.redisConfig,
        subject.sessionId,
        subject.userId,
        { mode: "append", messages: ["x"], payload: "{}" },
        fencedContext(subject),
      ),
    );
    assert(
      direct instanceof ConversationWriterEpochError,
      "the module must surface the lost epoch as ConversationWriterEpochError",
    );
    const erase = await rejection(
      subject.manager.eraseSessionPermanently(
        subject.sessionId,
        subject.userId,
      ),
    );
    assert(
      erase instanceof ConversationWriterEpochError,
      "an erasure under a changed epoch must be refused too",
    );
    assert(
      !(await backend.observer.exists(subject.tombstoneKey)),
      "and must not set the tombstone",
    );
  };

const scenarios: Array<{
  name: string;
  build: (backend: Backend) => () => Promise<void>;
}> = [
  {
    name: "an ordinary writer keeps its keys, TTLs, index and plain commands",
    build: ordinaryWriterIsUnchanged,
  },
  {
    name: "an ordinary writer cannot erase permanently",
    build: ordinaryWriterCannotErase,
  },
  {
    name: "a fenced writer stores, erases, and refuses every later write",
    build: fencedWriterStoresAndErases,
  },
  {
    name: "a missing or unqualified context raises ConversationWriterEpochError",
    build: contextMissingOrUnqualified,
  },
  {
    name: "a changed epoch between admission and persist is refused with nothing written",
    build: epochChangesBetweenAdmissionAndPersist,
  },
];

// ---------------------------------------------------------------------------
// Stand-in only: what a real server cannot be made to do
// ---------------------------------------------------------------------------

const standInOnly = [
  {
    name: "a restarted server (new run id) refuses a write admitted before it",
    run: async (backend: Backend) => {
      const subject = await openSubject(backend, true);
      await storeTurn(subject);
      const before = await backend.observer.listLength(subject.messagesKey);
      standInServer(backend).runId = randomUUID().replace(/-/g, "");
      const error = await rejection(
        fencedSessionPersist(
          client(backend, subject),
          subject.redisConfig,
          subject.sessionId,
          subject.userId,
          { mode: "append", messages: ["x"], payload: "{}" },
          fencedContext(subject),
        ),
      );
      assert(error instanceof ConversationWriterEpochError, "run id moved");
      assertEqual(
        await backend.observer.listLength(subject.messagesKey),
        before,
      );
    },
  },
  {
    name: "an eviction since admission refuses the write",
    run: async (backend: Backend) => {
      const subject = await openSubject(backend, true);
      standInServer(backend).evictedKeys += 1;
      const error = await rejection(storeTurn(subject));
      assert(
        /epoch/i.test(String((error as Error).message)) ||
          /epoch/i.test(
            JSON.stringify((error as { details?: unknown }).details),
          ),
        `an eviction must refuse the turn, got: ${String(error)}`,
      );
      assert(
        !(await backend.observer.exists(subject.sessionKey)),
        "nothing is written",
      );
    },
  },
  {
    name: "a stale context captured before the change still cannot write",
    run: async (backend: Backend) => {
      const subject = await openSubject(backend, true);
      const stale = fencedContext(subject);
      await backend.observer.changeEpoch(subject.epochRecordKey);
      const error = await rejection(
        fencedSessionIndexWrite(
          client(backend, subject),
          subject.redisConfig,
          subject.sessionId,
          subject.userId,
          stale,
        ),
      );
      assert(error instanceof ConversationWriterEpochError, "stale epoch");
      assert(
        !(await backend.observer.exists(subject.userSessionsKey)),
        "no index write landed",
      );
    },
  },
  {
    name: "a tampered context is refused",
    run: async (backend: Backend) => {
      const subject = await openSubject(backend, true);
      for (const overrides of [
        { runId: "not-the-run" },
        { epoch: "not-the-epoch" },
        { evictedKeys: "999" },
      ]) {
        const error = await rejection(
          fencedSessionMetadataWrite(
            client(backend, subject),
            subject.redisConfig,
            subject.sessionId,
            subject.userId,
            "{}",
            fencedContext(subject, overrides),
          ),
        );
        assert(
          error instanceof ConversationWriterEpochError,
          `context ${JSON.stringify(Object.keys(overrides))} must be refused`,
        );
      }
    },
  },
  {
    name: "a non-strict writer is never admitted and sends no script",
    run: async (backend: Backend) => {
      const server = standInServer(backend);
      const context = await prepareConversationWriteContext(
        server as unknown as RedisClient,
        getNormalizedConfig({ keyPrefix: backend.rootPrefix }),
        false,
      );
      assertEqual(context.mode, "legacy");
      assertEqual(server.evalCalls, 0);
    },
  },
  {
    name: "a strict writer is refused on cluster, an evicting policy or a failing script",
    run: async (backend: Backend) => {
      const server = standInServer(backend);
      const config = getNormalizedConfig({ keyPrefix: backend.rootPrefix });
      const refuse = async (what: string) => {
        const error = await rejection(
          prepareConversationWriteContext(
            server as unknown as RedisClient,
            config,
            true,
          ),
        );
        assert(error instanceof ConversationWriterEpochError, what);
      };
      server.clusterEnabled = 1;
      await refuse("cluster mode");
      server.clusterEnabled = 0;
      server.policy = "allkeys-lru";
      await refuse("an evicting policy");
      server.policy = "noeviction";
      const original = server.eval.bind(server);
      server.eval = async () => {
        throw new Error("ERR unknown command 'eval'");
      };
      await refuse("a server that cannot run the script");
      server.eval = original;
      server.eval = async () => ["not-an-epoch"];
      await refuse("a malformed script reply");
      server.eval = original;
      const admitted = await prepareConversationWriteContext(
        server as unknown as RedisClient,
        config,
        true,
      );
      assertEqual(admitted.mode, "fenced");
      assertEqual(Object.isFrozen(admitted), true, "the context is immutable");
    },
  },
];

// ---------------------------------------------------------------------------
// Admission: what initialize(), generate() and stream() do with a strict writer
// ---------------------------------------------------------------------------

type FakeServerInfo = { cluster: "0" | "1"; policy: string };

/** One RESP2 command (an array of bulk strings) off the front of `text`. */
const respCommand = (
  text: string,
): { args: string[]; consumed: number } | null => {
  if (!text.startsWith("*")) {
    return null;
  }
  const header = text.indexOf("\r\n");
  if (header === -1) {
    return null;
  }
  let at = header + 2;
  const args: string[] = [];
  for (let i = 0; i < Number(text.slice(1, header)); i += 1) {
    const lineEnd = text.indexOf("\r\n", at);
    if (text[at] !== "$" || lineEnd === -1) {
      return null;
    }
    const length = Number(text.slice(at + 1, lineEnd));
    const start = lineEnd + 2;
    if (text.length < start + length + 2) {
      return null;
    }
    args.push(text.slice(start, start + length));
    at = start + length + 2;
  }
  return { args, consumed: at };
};

const respReply = (
  args: string[],
  info: FakeServerInfo,
  runId: string,
): string => {
  const command = (args[0] ?? "").toUpperCase();
  if (command === "PING") {
    return "+PONG\r\n";
  }
  if (command === "INFO") {
    const section = (args[1] ?? "").toLowerCase();
    const body =
      section === "cluster"
        ? `# Cluster\r\ncluster_enabled:${info.cluster}\r\n`
        : section === "memory"
          ? `# Memory\r\nmaxmemory_policy:${info.policy}\r\n`
          : section === "server"
            ? `# Server\r\nrun_id:${runId}\r\n`
            : "";
    return `$${Buffer.byteLength(body)}\r\n${body}\r\n`;
  }
  return "+OK\r\n";
};

/**
 * A TCP server that answers just enough RESP2 for admission to run against it:
 * `INFO <section>` for the three sections the fence reads, `PING`, and `+OK` to
 * the housekeeping commands a client sends on connect. It is a server whose
 * topology or eviction policy the fence must refuse, which a real, shared
 * server cannot be made to be, and it lets the real `initialize()` run.
 */
const startFakeRedis = async (
  info: FakeServerInfo,
): Promise<{ port: number; close: () => Promise<void> }> => {
  const runId = randomUUID().replace(/-/g, "");
  const sockets = new Set<Socket>();
  const server = createTcpServer((socket) => {
    sockets.add(socket);
    socket.setEncoding("latin1");
    let pending = "";
    socket.on("data", (chunk: string) => {
      pending += chunk;
      for (;;) {
        const parsed = respCommand(pending);
        if (parsed === null) {
          break;
        }
        pending = pending.slice(parsed.consumed);
        socket.write(respReply(parsed.args, info, runId));
      }
    });
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => undefined);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    port: (server.address() as AddressInfo).port,
    close: async () => {
      for (const socket of sockets) {
        socket.destroy();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
};

/** A port nothing listens on: bind one, then release it. */
const closedPort = async (): Promise<number> => {
  const server = createTcpServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
};

const admissionRedisConfig = (port: number) => ({
  url: `redis://127.0.0.1:${port}`,
  keyPrefix: `nl-admission-${randomUUID().slice(0, 8)}:conv:`,
  ttl: TTL_SECONDS,
});

const strictNeuroLink = (port: number | null): NeuroLink =>
  new NeuroLink({
    conversationMemory: {
      enabled: true,
      enableSummarization: false,
      erasureWriteProtocol: PROTOCOL,
      ...(port === null ? {} : { redisConfig: admissionRedisConfig(port) }),
    },
  });

/**
 * A refusal of the strict writer: the typed epoch error, or the CONFIG_ERROR an
 * unreachable server or non-Redis storage raises while the protocol is on.
 * Anything else (a provider error from a fallback) means the turn was answered.
 */
const isStrictRefusal = (error: unknown): boolean =>
  error instanceof ConversationWriterEpochError ||
  (error instanceof ConversationMemoryError && error.code === "CONFIG_ERROR");

const admissionServers: ReadonlyArray<{ name: string; info: FakeServerInfo }> =
  [
    {
      name: "a cluster-mode server",
      info: { cluster: "1", policy: "noeviction" },
    },
    {
      name: "an evicting policy",
      info: { cluster: "0", policy: "allkeys-lru" },
    },
  ];

void runSuite(async () => {
  for (const scenario of scenarios) {
    await test(`stand-in: ${scenario.name}`, () =>
      withBackend(openStandIn, (backend) => scenario.build(backend)()));
  }
  for (const scenario of standInOnly) {
    await test(`stand-in: ${scenario.name}`, () =>
      withBackend(openStandIn, (backend) => scenario.run(backend)));
  }
  for (const { name, info } of admissionServers) {
    await test(`admission: a strict writer on ${name} fails initialize() with the typed epoch error`, async () => {
      const fake = await startFakeRedis(info);
      try {
        const manager = new RedisConversationMemoryManager(
          memoryConfig(true),
          admissionRedisConfig(fake.port),
        );
        const error = await rejection(manager.initialize());
        assert(
          error instanceof ConversationWriterEpochError,
          "the refusal must be the typed epoch error, not a wrapped CONFIG_ERROR",
        );
        assertEqual(internalsOf(manager).isInitialized, false);
      } finally {
        await fake.close();
      }
    });
    await test(`admission: an ordinary writer on ${name} still initializes, as legacy`, async () => {
      const fake = await startFakeRedis(info);
      try {
        const manager = new RedisConversationMemoryManager(
          memoryConfig(false),
          admissionRedisConfig(fake.port),
        );
        await manager.initialize();
        assertEqual(internalsOf(manager).isInitialized, true);
        assertEqual(internalsOf(manager).erasureWriteContext?.mode, "legacy");
        await manager.close();
      } finally {
        await fake.close();
      }
    });
  }
  await test("admission: a strict writer with no reachable Redis fails initialize() with CONFIG_ERROR, not the epoch error", async () => {
    const manager = new RedisConversationMemoryManager(
      memoryConfig(true),
      admissionRedisConfig(await closedPort()),
    );
    const error = await rejection(manager.initialize());
    assert(
      error instanceof ConversationMemoryError && error.code === "CONFIG_ERROR",
      "an unreachable server is a CONFIG_ERROR",
    );
    assert(
      !(error instanceof ConversationWriterEpochError),
      "an unreachable server is not an epoch refusal",
    );
  });

  // The same refusals through the SDK's two entry points. Nothing here has a
  // provider key: a refusal is raised before any provider is chosen, while an
  // answer from a fallback provider would be a different error (or none).
  // A server the fence refuses is the typed epoch error, which callers match
  // with instanceof; an unreachable server or storage that is not Redis is a
  // CONFIG_ERROR.
  const strictSdkCases: ReadonlyArray<{
    name: string;
    typed: boolean;
    start: () => Promise<{ port: number | null; close: () => Promise<void> }>;
  }> = [
    ...admissionServers.map(({ name, info }) => ({
      name: `on ${name}`,
      typed: true,
      start: async () => startFakeRedis(info),
    })),
    {
      name: "with no reachable Redis",
      typed: false,
      start: async () => ({
        port: await closedPort(),
        close: async () => undefined,
      }),
    },
    {
      name: "with storage that is not Redis",
      typed: false,
      start: async () => ({ port: null, close: async () => undefined }),
    },
  ];
  for (const { name, typed, start } of strictSdkCases) {
    for (const entry of ["generate", "stream"] as const) {
      await test(`admission: ${entry}() refuses a strict writer ${name}, with no fallback answer`, async () => {
        const savedStorage = process.env.STORAGE_TYPE;
        delete process.env.STORAGE_TYPE;
        process.env.NEUROLINK_SKIP_MCP = "true";
        const fake = await start();
        try {
          const nl = strictNeuroLink(fake.port);
          const request = {
            input: { text: "hello" },
            provider: "openai",
            model: "gpt-4o-mini",
            context: { sessionId: "admission", userId: "admission-user" },
          } as const;
          const error = await rejection(
            entry === "generate" ? nl.generate(request) : nl.stream(request),
          );
          assert(
            isStrictRefusal(error),
            `${entry}() must fail closed with the strict refusal`,
          );
          if (typed) {
            assert(
              error instanceof ConversationWriterEpochError,
              `${entry}() must raise the typed epoch error a caller can match`,
            );
          }
          if (fake.port === null) {
            assert(
              error instanceof ConversationMemoryError &&
                /requires Redis/.test(error.message),
              "non-Redis storage must say that the protocol needs Redis",
            );
          }
        } finally {
          await fake.close();
          if (savedStorage === undefined) {
            delete process.env.STORAGE_TYPE;
          } else {
            process.env.STORAGE_TYPE = savedStorage;
          }
        }
      });
    }
  }
  for (const scenario of scenarios) {
    await test(`real server: ${scenario.name}`, () =>
      withBackend(openRealServer, (backend) => scenario.build(backend)()));
  }
  await delay(0);
});

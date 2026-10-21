#!/usr/bin/env tsx

/**
 * Continuous Test Suite — a Redis key and its expiry land in one command
 *
 * The Redis conversation memory wrote several keys as `SET key value` followed
 * by a separate `EXPIRE key ttl`. A plain SET clears the TTL a key had, so in
 * between the two commands the key had no expiry (TTL -1), and a process or
 * connection that died in that gap left it that way for good. A downstream
 * gate read exactly that — TTL -1 on a conversation key during the background
 * title write — and failed a build. `SADD` followed by `EXPIRE` (the per-user
 * session index, and the auth session store's) has the same shape on a set: the
 * set is created without a TTL and only gains one with the second command.
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from `src/lib/`
 * and is on the `neurolink/e2e-tests-only` allow list. What is under test is
 * not reachable through `generate()` or `stream()`:
 *   - the window is one network round trip wide and closes by itself, so no
 *     live run can be made to observe it, let alone to die inside it. Here the
 *     connection is killed after the write on purpose (the standalone EXPIRE
 *     rejects, as it would on a dropped socket) and the key's TTL is read back;
 *   - the sites are internal write-backs of the Redis memory manager and the
 *     auth session store — a background title write, a summarization
 *     write-back, an agentic-loop report update, the per-user session index —
 *     none of which a caller can aim at;
 *   - an in-process stand-in that models TTL semantics (SET drops it, EXPIRE
 *     restores it, MULTI is indivisible) lets every command boundary be
 *     inspected, which a server cannot show.
 * Everything comes from `src`, never `dist`.
 *
 * Two backends run the same scenarios. The in-process stand-in always runs and
 * needs nothing. The real-server cases connect to `NEUROLINK_TEST_REDIS_URL`
 * (default `redis://localhost:6379`) and SKIP when nothing answers; they are
 * the only ones that can show the SET option shape is the one the installed
 * client and a real server accept, so run them when touching these writes. Every key
 * a real-server case writes sits under a unique prefix and is deleted by it.
 *
 * Run: npx tsx test/continuous-test-suite-redis-atomic-expiry.ts
 */

// First, so that no developer `.env` is loaded and no ambient Redis URL leaks in.
import "./helpers/credentialFreeEnv.js";
import { randomUUID } from "node:crypto";
import { createClient } from "redis";
import {
  defineSuite,
  assert,
  assertEqual,
  delay,
  Skip,
} from "./helpers/harness.js";
import { RedisConversationMemoryManager } from "../src/lib/core/redisConversationMemoryManager.js";
import { RedisSessionStorage } from "../src/lib/auth/sessionManager.js";
import {
  getNormalizedConfig,
  getSessionKey,
  getUserSessionsKey,
  scanKeys,
} from "../src/lib/utils/redis.js";
import type {
  AgenticLoopReportMetadata,
  AuthSession,
  ConversationMemoryConfig,
} from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Redis atomic expiry", {
  offline: true,
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TTL_SECONDS = 600;
const NO_EXPIRY = -1;
const REAL_REDIS_URL =
  process.env.NEUROLINK_TEST_REDIS_URL ?? "redis://localhost:6379";

const memoryConfig = (): ConversationMemoryConfig =>
  ({
    enabled: true,
    maxSessions: 10,
    enableSummarization: false,
  }) as ConversationMemoryConfig;

/** What a read-only look at the backend can tell us about a key. */
type Probe = {
  /** Seconds left: positive, -1 when the key has no expiry, -2 when missing. */
  ttl: (key: string) => Promise<number>;
  text: (key: string) => Promise<string | null>;
  members: (key: string) => Promise<string[]>;
};

type ExpireTarget = { expire: unknown };

/** The Redis commands the code under test uses, with real TTL semantics. */
type SetOptionsShape = {
  expiration?: { type: string; value?: number } | string;
  EX?: number;
};

class TtlRedis {
  isOpen = true;
  strings = new Map<string, string>();
  lists = new Map<string, string[]>();
  sets = new Map<string, Set<string>>();
  ttls = new Map<string, number>();
  /** `COMMAND key` for every point at which a written key was live without a TTL. */
  windows: string[] = [];

  exists(key: string): boolean {
    return this.strings.has(key) || this.lists.has(key) || this.sets.has(key);
  }

  private observe(command: string, key: string): void {
    if (!this.ttls.has(key)) {
      this.windows.push(`${command} ${key}`);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }
  async set(
    key: string,
    value: string,
    options?: SetOptionsShape,
  ): Promise<string> {
    this.strings.set(key, value);
    const expiration = options?.expiration;
    const seconds =
      typeof expiration === "object" && expiration.type === "EX"
        ? expiration.value
        : options?.EX;
    if (seconds !== undefined) {
      this.ttls.set(key, seconds);
    } else {
      // A plain SET discards the key's TTL.
      this.ttls.delete(key);
    }
    this.observe("SET", key);
    return "OK";
  }
  async setEx(key: string, seconds: number, value: string): Promise<string> {
    this.strings.set(key, value);
    this.ttls.set(key, seconds);
    return "OK";
  }
  async sAdd(key: string, member: string): Promise<number> {
    const members = this.sets.get(key) ?? new Set<string>();
    members.add(member);
    this.sets.set(key, members);
    this.observe("SADD", key);
    return 1;
  }
  async sMembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }
  async expire(key: string, seconds: number): Promise<number> {
    if (!this.exists(key)) {
      return 0;
    }
    this.ttls.set(key, seconds);
    return 1;
  }
  async del(keys: string | string[]): Promise<number> {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.strings.delete(key);
      this.lists.delete(key);
      this.sets.delete(key);
      this.ttls.delete(key);
    }
    return 1;
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
    const written = new Set<string>();
    const transaction = {
      del: (key: string) => {
        operations.push(() => {
          this.strings.delete(key);
          this.lists.delete(key);
          this.ttls.delete(key);
        });
        return transaction;
      },
      rPush: (key: string, values: string | string[]) => {
        operations.push(() => {
          const list = this.lists.get(key) ?? [];
          list.push(...(Array.isArray(values) ? values : [values]));
          this.lists.set(key, list);
          written.add(key);
        });
        return transaction;
      },
      set: (key: string, value: string) => {
        operations.push(() => {
          this.strings.set(key, value);
          this.ttls.delete(key);
          written.add(key);
        });
        return transaction;
      },
      sAdd: (key: string, member: string) => {
        operations.push(() => {
          const members = this.sets.get(key) ?? new Set<string>();
          members.add(member);
          this.sets.set(key, members);
          written.add(key);
        });
        return transaction;
      },
      expire: (key: string, seconds: number) => {
        operations.push(() => {
          if (this.exists(key)) {
            this.ttls.set(key, seconds);
          }
        });
        return transaction;
      },
      // Indivisible: nothing can observe the keys between two queued commands.
      exec: async () => {
        operations.forEach((operation) => operation());
        written.forEach((key) => this.observe("EXEC", key));
        return [];
      },
    };
    return transaction;
  }
}

/** A client whose standalone EXPIRE fails, as it would on a dropped socket. */
const dropConnectionBeforeExpire = (client: ExpireTarget): (() => void) => {
  const wasOwn = Object.prototype.hasOwnProperty.call(client, "expire");
  const original = client.expire;
  client.expire = async () => {
    throw new Error("connection lost between the write and its EXPIRE");
  };
  return () => {
    if (wasOwn) {
      client.expire = original;
    } else {
      Reflect.deleteProperty(client, "expire");
    }
  };
};

type Deferred = { promise: Promise<void>; resolve: () => void };
const deferred = (): Deferred => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((resolveFn) => {
    resolve = resolveFn;
  });
  return { promise, resolve };
};

const waitFor = async (
  condition: () => Promise<boolean>,
  what: string,
  timeoutMs = 5_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) {
      return;
    }
    await delay(10);
  }
  throw new Error(`timed out waiting for ${what}`);
};

// ---------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------

type Backend = {
  label: string;
  rootPrefix: string;
  probe: Probe;
  /** The client the manager under test writes through. */
  attach: (manager: RedisConversationMemoryManager) => Promise<ExpireTarget>;
  /** The auth session store's client. */
  attachSessions: (storage: RedisSessionStorage) => Promise<ExpireTarget>;
  redisUrl: string;
  /** Points where a written key was live without a TTL; only the stand-in sees them. */
  windows: () => string[];
  dispose: () => Promise<void>;
};

type ManagerInternals = {
  isInitialized: boolean;
  redisClient: unknown;
  generateConversationTitle: (message: string) => Promise<string>;
  summarizationEngine: unknown;
  addUserSession: (userId: string, sessionId: string) => Promise<void>;
  checkAndSummarize: (
    conversation: Record<string, unknown>,
    threshold: number,
    sessionId: string,
    userId?: string,
  ) => Promise<void>;
};

const openStandIn = async (): Promise<Backend> => {
  const fake = new TtlRedis();
  const rootPrefix = `nl-atomic-expiry-${randomUUID().slice(0, 8)}:`;
  return {
    label: "stand-in",
    rootPrefix,
    redisUrl: "redis://stand-in.invalid:6379",
    probe: {
      ttl: async (key) =>
        fake.exists(key) ? (fake.ttls.get(key) ?? NO_EXPIRY) : -2,
      text: async (key) => fake.strings.get(key) ?? null,
      members: async (key) => [...(fake.sets.get(key) ?? [])],
    },
    attach: async (manager) => {
      const internals = manager as unknown as ManagerInternals;
      internals.isInitialized = true;
      internals.redisClient = fake;
      return fake;
    },
    attachSessions: async (storage) => {
      (storage as unknown as { client: unknown }).client = fake;
      return fake;
    },
    windows: () => fake.windows,
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
  const rootPrefix = `nl-atomic-expiry-${randomUUID().slice(0, 8)}:`;
  const opened: Array<() => Promise<void>> = [];
  return {
    label: "real server",
    rootPrefix,
    redisUrl: REAL_REDIS_URL,
    probe: {
      ttl: (key) => probeClient.ttl(key),
      text: async (key) => (await probeClient.get(key)) as string | null,
      members: async (key) => probeClient.sMembers(key),
    },
    attach: async (manager) => {
      await manager.initialize();
      opened.push(() => manager.close());
      return (manager as unknown as ManagerInternals)
        .redisClient as ExpireTarget;
    },
    attachSessions: async (storage) => {
      const client = await (
        storage as unknown as { getClient: () => Promise<ExpireTarget> }
      ).getClient();
      opened.push(async () => {
        await (client as unknown as { quit: () => Promise<unknown> }).quit();
      });
      return client;
    },
    windows: () => [],
    dispose: async () => {
      for (const close of opened) {
        await close().catch(() => undefined);
      }
      const leftovers = await scanKeys(probeClient, `${rootPrefix}*`);
      if (leftovers.length > 0) {
        await probeClient.del(leftovers);
      }
      await probeClient.quit();
    },
  };
};

// ---------------------------------------------------------------------------
// Scenario plumbing
// ---------------------------------------------------------------------------

type Subject = {
  manager: RedisConversationMemoryManager;
  internals: ManagerInternals;
  client: ExpireTarget;
  sessionId: string;
  userId: string;
  sessionKey: string;
  userSessionsKey: string;
};

const openSubject = async (backend: Backend, ttl: number): Promise<Subject> => {
  const redisConfig = {
    url: backend.redisUrl,
    keyPrefix: `${backend.rootPrefix}conv:`,
    userSessionsKeyPrefix: `${backend.rootPrefix}users:`,
    ttl,
  };
  const manager = new RedisConversationMemoryManager(
    memoryConfig(),
    redisConfig,
  );
  const client = await backend.attach(manager);
  const sessionId = `sess-${randomUUID().slice(0, 8)}`;
  const userId = `user-${randomUUID().slice(0, 8)}`;
  const normalized = getNormalizedConfig(redisConfig);
  return {
    manager,
    internals: manager as unknown as ManagerInternals,
    client,
    sessionId,
    userId,
    sessionKey: getSessionKey(normalized, sessionId, userId),
    userSessionsKey: getUserSessionsKey(normalized, userId),
  };
};

/**
 * Store one turn and let the background title write finish, so the only writer
 * left afterwards is the one a scenario starts.
 */
const seedConversation = async (
  backend: Backend,
  subject: Subject,
): Promise<void> => {
  subject.internals.generateConversationTitle = async () => "Seeded title";
  await subject.manager.storeConversationTurn({
    sessionId: subject.sessionId,
    userId: subject.userId,
    userMessage: "show my sales",
    aiResponse: "Sales are up.",
    enableSummarization: false,
  });
  await waitFor(
    async () =>
      ((await backend.probe.text(subject.sessionKey)) ?? "").includes(
        "Seeded title",
      ),
    "the background title write",
  );
};

const assertLivesOnTtl = async (
  backend: Backend,
  key: string,
  what: string,
): Promise<void> => {
  const ttl = await backend.probe.ttl(key);
  assert(
    ttl > 0 && ttl <= TTL_SECONDS,
    `${what} must carry a positive TTL of at most ${TTL_SECONDS}s the moment it is written, found ${ttl}`,
  );
};

const report = (): AgenticLoopReportMetadata => ({
  reportId: `report-${randomUUID().slice(0, 8)}`,
  reportType: "BREEZE",
  reportStatus: "INPROGRESS",
});

const sessionFor = (userId: string): AuthSession => ({
  id: `auth-${randomUUID().slice(0, 8)}`,
  user: { id: userId, roles: [], permissions: [] },
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 3_600_000),
  isValid: true,
});

/** Run a scenario against a backend, always releasing what it opened. */
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

// ---------------------------------------------------------------------------
// Scenarios — each one kills the connection right after the write under test
// ---------------------------------------------------------------------------

const titleWriteKeepsExpiry = (backend: Backend) => async () => {
  const subject = await openSubject(backend, TTL_SECONDS);
  const turnReturned = deferred();
  let restore: () => void = () => undefined;
  // The title job runs after the turn. Cut the connection only once the turn
  // is done, so the title write is the one command whose EXPIRE never arrives.
  subject.internals.generateConversationTitle = async () => {
    await turnReturned.promise;
    restore = dropConnectionBeforeExpire(subject.client);
    return "A generated title";
  };
  try {
    await subject.manager.storeConversationTurn({
      sessionId: subject.sessionId,
      userId: subject.userId,
      userMessage: "show my sales",
      aiResponse: "Sales are up.",
      enableSummarization: false,
    });
    turnReturned.resolve();
    await waitFor(
      async () =>
        ((await backend.probe.text(subject.sessionKey)) ?? "").includes(
          "A generated title",
        ),
      "the background title write",
    );
    await assertLivesOnTtl(
      backend,
      subject.sessionKey,
      "the conversation key after the background title write",
    );
  } finally {
    turnReturned.resolve();
    restore();
  }
};

const userSessionIndexKeepsExpiry = (backend: Backend) => async () => {
  const subject = await openSubject(backend, TTL_SECONDS);
  const restore = dropConnectionBeforeExpire(subject.client);
  try {
    await subject.internals.addUserSession(subject.userId, subject.sessionId);
    const members = await backend.probe.members(subject.userSessionsKey);
    assert(
      members.includes(subject.sessionId),
      "the session must be in the user's session index",
    );
    await assertLivesOnTtl(
      backend,
      subject.userSessionsKey,
      "the user's session index",
    );
  } finally {
    restore();
  }
};

const summarizationWritebackKeepsExpiry = (backend: Backend) => async () => {
  const subject = await openSubject(backend, TTL_SECONDS);
  await seedConversation(backend, subject);
  const stored = await backend.probe.text(subject.sessionKey);
  assert(stored !== null, "the seeded conversation must be stored");
  const conversation = JSON.parse(stored ?? "{}") as Record<string, unknown>;
  subject.internals.summarizationEngine = {
    checkAndSummarize: async (session: {
      summarizedUpToMessageId?: string;
      summarizedMessage?: string;
    }) => {
      session.summarizedUpToMessageId = "message-1";
      session.summarizedMessage = "A short summary";
      return true;
    },
  };
  const restore = dropConnectionBeforeExpire(subject.client);
  try {
    await subject.internals.checkAndSummarize(
      conversation,
      1_000,
      subject.sessionId,
      subject.userId,
    );
    assert(
      ((await backend.probe.text(subject.sessionKey)) ?? "").includes(
        "A short summary",
      ),
      "the summary must have been written back",
    );
    await assertLivesOnTtl(
      backend,
      subject.sessionKey,
      "the conversation key after the summarization write-back",
    );
  } finally {
    restore();
  }
};

const reportUpdateKeepsExpiry = (backend: Backend) => async () => {
  const subject = await openSubject(backend, TTL_SECONDS);
  await seedConversation(backend, subject);
  const entry = report();
  const restore = dropConnectionBeforeExpire(subject.client);
  try {
    await subject.manager
      .updateAgenticLoopReport(subject.sessionId, subject.userId, entry)
      .catch(() => undefined);
    assert(
      ((await backend.probe.text(subject.sessionKey)) ?? "").includes(
        entry.reportId,
      ),
      "the report must have been written",
    );
    await assertLivesOnTtl(
      backend,
      subject.sessionKey,
      "the conversation key after an agentic-loop report update",
    );
  } finally {
    restore();
  }
};

const authSessionIndexKeepsExpiry = (backend: Backend) => async () => {
  const prefix = `${backend.rootPrefix}auth:`;
  const storage = new RedisSessionStorage({
    url: backend.redisUrl,
    prefix,
    ttl: TTL_SECONDS,
  });
  const client = await backend.attachSessions(storage);
  const session = sessionFor(`user-${randomUUID().slice(0, 8)}`);
  const restore = dropConnectionBeforeExpire(client);
  try {
    await storage.set(session).catch(() => undefined);
    assert(
      (await backend.probe.text(`${prefix}${session.id}`)) !== null,
      "the session itself must be stored",
    );
    const indexKey = `${prefix}user:${session.user.id}`;
    assert(
      (await backend.probe.members(indexKey)).includes(session.id),
      "the session must be in the user's index",
    );
    await assertLivesOnTtl(
      backend,
      indexKey,
      "the auth store's per-user session index",
    );
  } finally {
    restore();
  }
};

const nonPositiveTtlStillMeansNoExpiry = (backend: Backend) => async () => {
  const subject = await openSubject(backend, -1);
  await seedConversation(backend, subject);
  const entry = report();
  await subject.manager.updateAgenticLoopReport(
    subject.sessionId,
    subject.userId,
    entry,
  );
  await subject.internals.addUserSession(subject.userId, subject.sessionId);
  assert(
    ((await backend.probe.text(subject.sessionKey)) ?? "").includes(
      entry.reportId,
    ),
    "the report must have been written",
  );
  assertEqual(
    await backend.probe.ttl(subject.sessionKey),
    NO_EXPIRY,
    "a ttl of zero or less must leave the conversation key without an expiry",
  );
  assertEqual(
    await backend.probe.ttl(subject.userSessionsKey),
    NO_EXPIRY,
    "a ttl of zero or less must leave the session index without an expiry",
  );
};

const neverLiveWithoutExpiry = (backend: Backend) => async () => {
  const subject = await openSubject(backend, TTL_SECONDS);
  await seedConversation(backend, subject);
  const stored = await backend.probe.text(subject.sessionKey);
  subject.internals.summarizationEngine = {
    checkAndSummarize: async (session: { summarizedMessage?: string }) => {
      session.summarizedMessage = "A short summary";
      return true;
    },
  };
  await subject.internals.checkAndSummarize(
    JSON.parse(stored ?? "{}") as Record<string, unknown>,
    1_000,
    subject.sessionId,
    subject.userId,
  );
  await subject.manager.updateAgenticLoopReport(
    subject.sessionId,
    subject.userId,
    report(),
  );
  const prefix = backend.rootPrefix;
  const windows = backend.windows().map((window) => window.replace(prefix, ""));
  assertEqual(
    windows.length,
    0,
    `a written key was observable without a TTL after: ${windows.join(", ")}`,
  );
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const scenarios: Array<{
  name: string;
  build: (backend: Backend) => () => Promise<void>;
}> = [
  {
    name: "the background title write leaves the conversation key a TTL when the connection dies after it",
    build: titleWriteKeepsExpiry,
  },
  {
    name: "the per-user session index gets its TTL with its first member, not after",
    build: userSessionIndexKeepsExpiry,
  },
  {
    name: "the summarization write-back leaves the conversation key a TTL when the connection dies after it",
    build: summarizationWritebackKeepsExpiry,
  },
  {
    name: "an agentic-loop report update leaves the conversation key a TTL when the connection dies after it",
    build: reportUpdateKeepsExpiry,
  },
  {
    name: "the auth session store gives its per-user index a TTL with its first member",
    build: authSessionIndexKeepsExpiry,
  },
  {
    name: "a ttl of zero or less still means no expiry",
    build: nonPositiveTtlStillMeansNoExpiry,
  },
];

void runSuite(async () => {
  for (const scenario of scenarios) {
    await test(`stand-in: ${scenario.name}`, () =>
      withBackend(openStandIn, (backend) => scenario.build(backend)()));
  }

  await test("stand-in: no write ever leaves a key live without a TTL, not even between two commands", () =>
    withBackend(openStandIn, (backend) => neverLiveWithoutExpiry(backend)()));

  for (const scenario of scenarios) {
    await test(`real server: ${scenario.name}`, () =>
      withBackend(openRealServer, (backend) => scenario.build(backend)()));
  }
});

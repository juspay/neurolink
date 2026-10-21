#!/usr/bin/env tsx

/**
 * Continuous Test Suite — a voice call's turns are remembered like typed chat
 *
 * A realtime voice call used to persist nothing: its agent never calls
 * `stream()` or `generate()`, so the conversation memory layer never saw it.
 * This change records each finished exchange through
 * `NeuroLink.recordConversationTurn` into the same store typed chat uses, marks
 * stored messages with a `modality`, makes a repeated `turnId` a no-op, seeds
 * the model with recent history, and trusts only a signed binding for WHOSE
 * conversation a call writes to.
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from `src/lib/`
 * and is on the `neurolink/e2e-tests-only` allow list. What is under test is
 * not reachable through `generate()` or `stream()`:
 *   - the voice recorder, binding verifier and realtime wiring have no path
 *     through either call at all (a voice agent is driven by LiveKit events);
 *   - exact stored message ids, metadata and ordering, and the key a Redis
 *     session is written under, which a live call only shows as "history
 *     looked right";
 *   - out-of-order transcripts, duplicate deliveries, barge-in and a shutdown
 *     that has about a second left, none of which a live model can be made to
 *     produce on demand.
 * Everything comes from `src`, never `dist`. Nothing here touches the network:
 * Redis is a small in-process fake that implements only the commands the
 * manager uses, and the LiveKit side is driven with synthetic events. A real
 * LiveKit call is NOT exercised by this suite.
 *
 * Run: npx tsx test/continuous-test-suite-voice-turn-memory.ts
 */

// First, so that no developer `.env` is loaded: a Langfuse key in it would make
// NeuroLink register its own tracer provider before the span capture below can.
import "./helpers/credentialFreeEnv.js";
import { defineSuite, assert, assertEqual, delay } from "./helpers/harness.js";
import { installSpanCapture } from "./helpers/spanCapture.js";
import { NeuroLink } from "../src/lib/neurolink.js";
import { ConversationMemoryManager } from "../src/lib/core/conversationMemoryManager.js";
import { RedisConversationMemoryManager } from "../src/lib/core/redisConversationMemoryManager.js";
import {
  VOICE_MEMORY_MAX_TTL_SECONDS,
  isValidVoiceSessionId,
  isValidVoiceUserId,
  signVoiceMemoryBinding,
  verifyVoiceMemoryBinding,
} from "../src/lib/voice/livekit/memoryBinding.js";
import { createVoiceTurnRecorder } from "../src/lib/voice/livekit/turnRecorder.js";
import { setUpRealtimeCallMemory } from "../src/lib/voice/livekit/realtimeMemory.js";
import { createVoiceBrain } from "../src/lib/voice/livekit/brain.js";
import type {
  ChatMessage,
  ConversationMemoryConfig,
  RecordConversationTurnOptions,
  StreamOptions,
  StreamResult,
  VoiceTurnRecord,
} from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Voice turn memory", {
  offline: true,
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SECRET = "test-secret-with-more-than-sixteen-chars";
const USER = "cust-1:merchant-1:shop-1.myshopify.com";
const SESSION = "conv-abc_123";
const ROOM = "voice-room-1";
const NOW = 1_800_000_000;

const memoryConfig = (): ConversationMemoryConfig =>
  ({
    enabled: true,
    maxSessions: 10,
    enableSummarization: false,
  }) as ConversationMemoryConfig;

/** The few Redis commands RedisConversationMemoryManager uses, held in process. */
class FakeRedis {
  isOpen = true;
  strings = new Map<string, string>();
  lists = new Map<string, string[]>();
  sets = new Map<string, Set<string>>();
  async sAdd(key: string, member: string): Promise<number> {
    const members = this.sets.get(key) ?? new Set<string>();
    members.add(member);
    this.sets.set(key, members);
    return 1;
  }
  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<string> {
    this.strings.set(key, value);
    return "OK";
  }
  async expire(): Promise<number> {
    return 1;
  }
  async del(keys: string | string[]): Promise<number> {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.strings.delete(key);
      this.lists.delete(key);
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
    const transaction = {
      del: (key: string) => {
        operations.push(() => {
          this.strings.delete(key);
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
      expire: () => transaction,
      exec: async () => {
        operations.forEach((operation) => operation());
        return [];
      },
    };
    return transaction;
  }
}

const KEY_PREFIX = "test:conv:";

const makeRedisManager = () => {
  const manager = new RedisConversationMemoryManager(memoryConfig(), {
    keyPrefix: KEY_PREFIX,
    ttl: 0,
  });
  const fake = new FakeRedis();
  const internals = manager as unknown as {
    isInitialized: boolean;
    redisClient: FakeRedis;
    generateConversationTitle: (message: string) => Promise<string>;
  };
  internals.isInitialized = true;
  internals.redisClient = fake;
  // The title is made by a model in the background; nothing here may call one.
  internals.generateConversationTitle = async () => "Test conversation";
  return { manager, fake };
};

const voiceTurn = (
  overrides: Partial<
    Parameters<ConversationMemoryManager["storeConversationTurn"]>[0]
  > = {},
) => ({
  sessionId: SESSION,
  userId: USER,
  userMessage: "show my sales",
  aiResponse: "Sales are up.",
  enableSummarization: false,
  modality: "voice" as const,
  turnId: "item-1",
  ...overrides,
});

const newNeuroLink = () =>
  new NeuroLink({ conversationMemory: memoryConfig() });

const roomMetadata = (memory: unknown): string =>
  Buffer.from(
    JSON.stringify({ authToken: "tok", mcpContext: { shopId: "s" }, memory }),
  ).toString("base64");

const signed = (overrides: Record<string, unknown> = {}) =>
  signVoiceMemoryBinding({
    room: ROOM,
    userId: USER,
    sessionId: SESSION,
    secret: SECRET,
    now: NOW,
    ...overrides,
  });

const verdictFor = (memory: unknown, overrides: Record<string, unknown> = {}) =>
  verifyVoiceMemoryBinding({
    roomMetadata: roomMetadata(memory),
    roomName: ROOM,
    secret: SECRET,
    now: NOW + 10,
    ...overrides,
  });

type Written = VoiceTurnRecord[];

const recorderWith = (
  options: Partial<Parameters<typeof createVoiceTurnRecorder>[0]> = {},
) => {
  const written: Written = [];
  const failed: VoiceTurnRecord[] = [];
  const recorder = createVoiceTurnRecorder({
    write: async (record) => {
      written.push(record);
    },
    onPermanentFailure: (record) => {
      failed.push(record);
    },
    settleMs: 40,
    retryDelayMs: 5,
    callId: "call-x",
    ...options,
  });
  return { recorder, written, failed };
};

const user = (text: string, final = true) => ({ text, final });

void runSuite(async () => {
  // -------------------------------------------------------------------------
  // A1/A2 — stored shape, in the in-memory manager
  // -------------------------------------------------------------------------

  await test("a typed turn is stored exactly as before: random ids, no metadata", async () => {
    const manager = new ConversationMemoryManager(memoryConfig());
    await manager.storeConversationTurn({
      sessionId: SESSION,
      userId: USER,
      userMessage: "hello",
      aiResponse: "hi",
      enableSummarization: false,
    });
    const messages = await manager.getSessionMessages(SESSION, USER);
    assertEqual(messages.length, 2, "one user and one assistant message");
    for (const message of messages) {
      assert(
        !message.id.includes(":"),
        `random id expected, got ${message.id}`,
      );
      assert(
        !("metadata" in message),
        `a typed turn must carry no metadata, got ${JSON.stringify(message.metadata)}`,
      );
    }
  });

  await test("a voice turn gets stable ids and a modality marker on both messages", async () => {
    const manager = new ConversationMemoryManager(memoryConfig());
    await manager.storeConversationTurn(voiceTurn());
    const [userMessage, assistantMessage] = await manager.getSessionMessages(
      SESSION,
      USER,
    );
    assertEqual(userMessage.id, "item-1:user", "user message id");
    assertEqual(
      assistantMessage.id,
      "item-1:assistant",
      "assistant message id",
    );
    assertEqual(userMessage.metadata?.modality, "voice", "user modality");
    assertEqual(
      assistantMessage.metadata?.modality,
      "voice",
      "assistant modality",
    );
    assertEqual(assistantMessage.metadata?.turnId, "item-1", "turn id marker");
  });

  await test("a cut-off voice turn marks the assistant message interrupted and call-ended", async () => {
    const manager = new ConversationMemoryManager(memoryConfig());
    await manager.storeConversationTurn(
      voiceTurn({ interrupted: true, callEnded: true }),
    );
    const [userMessage, assistantMessage] = await manager.getSessionMessages(
      SESSION,
      USER,
    );
    assertEqual(assistantMessage.metadata?.interrupted, true, "interrupted");
    assertEqual(assistantMessage.metadata?.callEnded, true, "callEnded");
    assert(
      userMessage.metadata?.interrupted === undefined,
      "the user message is never marked interrupted",
    );
  });

  await test("recording the same turnId twice stores it once (in-memory manager)", async () => {
    const manager = new ConversationMemoryManager(memoryConfig());
    await manager.storeConversationTurn(voiceTurn());
    await manager.storeConversationTurn(voiceTurn());
    assertEqual(
      (await manager.getSessionMessages(SESSION, USER)).length,
      2,
      "a repeated turnId must not add messages",
    );
    await manager.storeConversationTurn(voiceTurn({ turnId: "item-2" }));
    assertEqual(
      (await manager.getSessionMessages(SESSION, USER)).length,
      4,
      "a different turnId is a new turn",
    );
  });

  // -------------------------------------------------------------------------
  // A1/A2 — the same, in the Redis manager, plus key composition and legacy data
  // -------------------------------------------------------------------------

  await test("the Redis manager writes under the key the history reader uses, with the marker", async () => {
    const { manager, fake } = makeRedisManager();
    await manager.storeConversationTurn(voiceTurn());
    assert(
      fake.strings.has(`${KEY_PREFIX}${USER}:${SESSION}`),
      `expected the blob under ${KEY_PREFIX}${USER}:${SESSION}, found ${[...fake.strings.keys()].join(", ")}`,
    );
    const messages = await manager.getSessionMessages(SESSION, USER);
    assertEqual(
      messages.map((m) => m.id).join(","),
      "item-1:user,item-1:assistant",
      "ids read back",
    );
    assertEqual(
      messages[1].metadata?.modality,
      "voice",
      "marker survives storage",
    );
  });

  await test("recording the same turnId twice stores it once (Redis manager)", async () => {
    const { manager } = makeRedisManager();
    await manager.storeConversationTurn(voiceTurn());
    await manager.storeConversationTurn(voiceTurn());
    assertEqual(
      (await manager.getSessionMessages(SESSION, USER)).length,
      2,
      "no duplicate",
    );
    await manager.storeConversationTurn(voiceTurn({ turnId: "item-2" }));
    const ids = (await manager.getSessionMessages(SESSION, USER)).map(
      (m) => m.id,
    );
    assertEqual(
      ids.join(","),
      "item-1:user,item-1:assistant,item-2:user,item-2:assistant",
      "order kept",
    );
  });

  await test("a session written before the field existed still loads, and a voice turn appends to it", async () => {
    const { manager, fake } = makeRedisManager();
    const legacyMessages: ChatMessage[] = [
      {
        id: "m1",
        role: "user",
        content: "old question",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "m2",
        role: "assistant",
        content: "old answer",
        timestamp: "2026-01-01T00:00:01.000Z",
      },
    ];
    fake.strings.set(
      `${KEY_PREFIX}${USER}:${SESSION}`,
      JSON.stringify({
        id: "c1",
        title: "Old",
        sessionId: SESSION,
        userId: USER,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:01.000Z",
        messages: legacyMessages,
      }),
    );
    const before = await manager.getSessionMessages(SESSION, USER);
    assertEqual(before.length, 2, "legacy session loads");
    assert(
      before.every((m) => m.metadata?.modality === undefined),
      "legacy messages have no modality",
    );
    await manager.storeConversationTurn(voiceTurn());
    const after = await manager.getSessionMessages(SESSION, USER);
    assertEqual(after.length, 4, "voice turn appended after the legacy ones");
    assertEqual(after[0].id, "m1", "legacy order kept");
    assertEqual(after[3].metadata?.modality, "voice", "new turn marked");
  });

  // -------------------------------------------------------------------------
  // A3/A6 — the public methods on NeuroLink
  // -------------------------------------------------------------------------

  await test("recordConversationTurn stores a voice turn, returns the identity, and is idempotent", async () => {
    const nl = newNeuroLink();
    try {
      const options: RecordConversationTurnOptions = {
        sessionId: SESSION,
        userId: USER,
        userMessage: "what is my revenue",
        aiResponse: "Revenue is 10k.",
        modality: "voice",
        turnId: "item-9",
        enableSummarization: false,
      };
      const first = await nl.recordConversationTurn(options);
      assertEqual(first.recorded, true, "stored");
      assertEqual(first.turnId, "item-9", "turn id echoed");
      await nl.recordConversationTurn(options);
      const messages = await nl.getSessionMessages(SESSION, USER);
      assertEqual(messages.length, 2, "recording twice stores once");
      assertEqual(messages[0].metadata?.modality, "voice", "marker present");
    } finally {
      await nl.shutdown?.().catch(() => {});
    }
  });

  await test("recordConversationTurn refuses a missing user, a colon in the session, and a blank session", async () => {
    const nl = newNeuroLink();
    try {
      const base = {
        userMessage: "a",
        aiResponse: "b",
        enableSummarization: false,
      };
      const refused = async (
        label: string,
        options: Record<string, unknown>,
      ) => {
        let code: unknown;
        try {
          await nl.recordConversationTurn({
            ...base,
            ...options,
          } as unknown as RecordConversationTurnOptions);
        } catch (error) {
          code = (error as { code?: unknown }).code;
        }
        assert(code !== undefined, `${label}: expected a throw`);
        assertEqual(String(code), "INVALID_PARAMETERS", `${label}: error code`);
      };
      await refused("no user", { sessionId: SESSION });
      await refused("blank user", { sessionId: SESSION, userId: "  " });
      await refused("colon in session", { sessionId: "a:b", userId: USER });
      await refused("blank session", { sessionId: "", userId: USER });
      assertEqual(
        (await nl.getSessionMessages(SESSION, USER)).length,
        0,
        "nothing stored",
      );
    } finally {
      await nl.shutdown?.().catch(() => {});
    }
  });

  await test("recordConversationTurn skips a blank user message or a blank reply without tool events", async () => {
    const nl = newNeuroLink();
    try {
      const common = {
        sessionId: SESSION,
        userId: USER,
        enableSummarization: false,
      };
      const noUser = await nl.recordConversationTurn({
        ...common,
        userMessage: "  ",
        aiResponse: "hello",
      });
      assertEqual(noUser.recorded, false, "blank user message");
      assertEqual(noUser.reason, "empty-user-message", "reason");
      const noReply = await nl.recordConversationTurn({
        ...common,
        userMessage: "hello",
        aiResponse: " ",
      });
      assertEqual(noReply.reason, "empty-response", "blank reply");
      assertEqual(
        (await nl.getSessionMessages(SESSION, USER)).length,
        0,
        "nothing stored",
      );
      const toolOnly = await nl.recordConversationTurn({
        ...common,
        userMessage: "run it",
        aiResponse: " ",
        events: [
          {
            type: "tool:start",
            seq: 0,
            timestamp: 1,
            tool: "t",
            toolName: "t",
          },
        ],
      });
      assertEqual(toolOnly.recorded, true, "a tool-only reply is kept");
    } finally {
      await nl.shutdown?.().catch(() => {});
    }
  });

  await test("a typed stream turn is stamped only when the caller sets modality", async () => {
    const nl = newNeuroLink();
    try {
      await nl.ensureConversationMemoryInitialized();
      const store = (
        nl as unknown as {
          storeStreamConversationMemory: (params: unknown) => Promise<void>;
        }
      ).storeStreamConversationMemory.bind(nl);
      const params = (sessionId: string, modality?: "voice") => ({
        enhancedOptions: {
          context: { sessionId, userId: USER },
          enableSummarization: false,
          ...(modality ? { modality } : {}),
        } as unknown as StreamOptions,
        providerName: "test",
        originalPrompt: "hello",
        accumulatedContent: "hi there",
        startTime: Date.now(),
        eventSequence: [],
      });
      await store(params("typed-1"));
      await store(params("spoken-1", "voice"));
      const typed = await nl.getSessionMessages("typed-1", USER);
      const spoken = await nl.getSessionMessages("spoken-1", USER);
      assert(
        typed.every((m) => !("metadata" in m)),
        "typed turn unchanged",
      );
      assert(
        spoken.every((m) => m.metadata?.modality === "voice"),
        "spoken stream turn marked",
      );
    } finally {
      await nl.shutdown?.().catch(() => {});
    }
  });

  await test("getConversationSeed returns recent spoken messages, bounded, without summaries, tools or blanks", async () => {
    const nl = newNeuroLink();
    try {
      await nl.recordConversationTurn({
        sessionId: SESSION,
        userId: USER,
        userMessage: "q1",
        aiResponse: "a1",
        enableSummarization: false,
      });
      const stored = await nl.getSessionMessages(SESSION, USER);
      const extra: ChatMessage[] = [
        {
          id: "s",
          role: "assistant",
          content: "SUMMARY",
          metadata: { isSummary: true },
        },
        { id: "t1", role: "tool_call", content: "call" },
        { id: "t2", role: "tool_result", content: "result" },
        { id: "b", role: "user", content: "   " },
        {
          id: "q2",
          role: "user",
          content: "q2",
          metadata: { modality: "voice" },
        },
        { id: "a2", role: "assistant", content: "a2" },
        { id: "q3", role: "user", content: "q3" },
        { id: "a3", role: "assistant", content: "a3" },
      ];
      await nl.setSessionMessages(SESSION, [...stored, ...extra], USER);

      const all = await nl.getConversationSeed({
        sessionId: SESSION,
        userId: USER,
      });
      assertEqual(
        all.map((m) => m.content).join(","),
        "q1,a1,q2,a2,q3,a3",
        "only spoken user/assistant text",
      );
      assertEqual(all[2].modality, "voice", "modality carried through");

      const lastTurn = await nl.getConversationSeed({
        sessionId: SESSION,
        userId: USER,
        maxTurns: 1,
      });
      assertEqual(
        lastTurn.map((m) => m.content).join(","),
        "q3,a3",
        "maxTurns keeps the newest",
      );

      const tiny = await nl.getConversationSeed({
        sessionId: SESSION,
        userId: USER,
        maxChars: 4,
      });
      assertEqual(
        tiny.map((m) => m.content).join(","),
        "q3,a3",
        "maxChars drops the oldest first",
      );

      const none = await nl.getConversationSeed({
        sessionId: "nobody",
        userId: USER,
      });
      assertEqual(none.length, 0, "an unknown conversation seeds nothing");
      const bad = await nl.getConversationSeed({
        sessionId: "a:b",
        userId: USER,
      });
      assertEqual(
        bad.length,
        0,
        "an invalid identity seeds nothing and does not throw",
      );
    } finally {
      await nl.shutdown?.().catch(() => {});
    }
  });

  await test("conversationExists is true only for the owning user", async () => {
    const nl = newNeuroLink();
    try {
      await nl.recordConversationTurn({
        sessionId: SESSION,
        userId: USER,
        userMessage: "q",
        aiResponse: "a",
        enableSummarization: false,
      });
      assertEqual(
        await nl.conversationExists({ sessionId: SESSION, userId: USER }),
        true,
        "owner",
      );
      assertEqual(
        await nl.conversationExists({
          sessionId: SESSION,
          userId: "someone-else",
        }),
        false,
        "other user",
      );
      assertEqual(
        await nl.conversationExists({ sessionId: "missing", userId: USER }),
        false,
        "unknown id",
      );
    } finally {
      await nl.shutdown?.().catch(() => {});
    }
  });

  await test("a call cannot append to a conversation another user owns", async () => {
    const nl = newNeuroLink();
    try {
      await nl.recordConversationTurn({
        sessionId: SESSION,
        userId: USER,
        userMessage: "q",
        aiResponse: "a",
        enableSummarization: false,
      });
      let code: unknown;
      try {
        await nl.recordConversationTurn({
          sessionId: SESSION,
          userId: "someone-else",
          userMessage: "intruding",
          aiResponse: "reply",
          enableSummarization: false,
        });
      } catch (error) {
        code = (error as { code?: unknown }).code;
      }
      assertEqual(String(code), "INVALID_PARAMETERS", "refused");
      const messages = await nl.getSessionMessages(SESSION, USER);
      assertEqual(messages.length, 2, "the owner's conversation is untouched");
    } finally {
      await nl.shutdown?.().catch(() => {});
    }
  });

  await test("voice text reaches later typed turns: the recorded turn is in the context a typed prompt would load", async () => {
    const nl = newNeuroLink();
    try {
      await nl.recordConversationTurn({
        sessionId: SESSION,
        userId: USER,
        userMessage: "my favourite colour is teal",
        aiResponse: "Noted.",
        modality: "voice",
        turnId: "v1",
        enableSummarization: false,
      });
      const context = await nl.getConversationHistory(SESSION);
      const text = context.map((m) => m.content).join(" | ");
      assert(
        text.includes("teal"),
        `typed context should include the spoken turn, got: ${text}`,
      );
    } finally {
      await nl.shutdown?.().catch(() => {});
    }
  });

  // -------------------------------------------------------------------------
  // A5 — the signed binding
  // -------------------------------------------------------------------------

  await test("a signed binding verifies and yields exactly the signed identity", async () => {
    const verdict = verdictFor(signed());
    assert(verdict.ok, `expected ok, got ${JSON.stringify(verdict)}`);
    if (verdict.ok) {
      assertEqual(verdict.userId, USER, "userId");
      assertEqual(verdict.sessionId, SESSION, "sessionId");
    }
  });

  await test("changing any signed field, or the room, makes the binding fail the signature", async () => {
    const good = signed();
    const reasons = [
      verdictFor({ ...good, userId: "cust-2:merchant-1:shop-1.myshopify.com" }),
      verdictFor({ ...good, sessionId: "another-conversation" }),
      verdictFor({ ...good, exp: good.exp + 60 }),
      verdictFor(good, { roomName: "voice-room-2" }),
      verdictFor(good, { secret: "a-different-secret-of-sufficient-length" }),
      verdictFor({ ...good, sig: "AAAA" }),
    ];
    for (const [index, verdict] of reasons.entries()) {
      assert(!verdict.ok, `case ${index} must be rejected`);
      assertEqual(
        verdict.ok ? "" : verdict.reason,
        "bad-signature",
        `case ${index} reason`,
      );
    }
  });

  await test("an expired binding, one expiring too far ahead, and a spent clock are rejected", async () => {
    const good = signed({ ttlSeconds: 60 });
    const expired = verdictFor(good, { now: NOW + 61 });
    assertEqual(expired.ok ? "ok" : expired.reason, "expired", "expired");
    const farAhead = signVoiceMemoryBinding({
      room: ROOM,
      userId: USER,
      sessionId: SESSION,
      secret: SECRET,
      now: NOW,
      ttlSeconds: VOICE_MEMORY_MAX_TTL_SECONDS,
    });
    const tooFar = verdictFor(farAhead, { now: NOW - 3600 });
    assertEqual(
      tooFar.ok ? "ok" : tooFar.reason,
      "expiry-too-far",
      "expiry beyond the cap",
    );
  });

  await test("no secret, a weak secret, no binding and a malformed binding all fail closed", async () => {
    const good = signed();
    assertEqual(
      String(
        (verdictFor(good, { secret: undefined }) as { reason?: string }).reason,
      ),
      "no-secret",
      "no secret",
    );
    assertEqual(
      String(
        (verdictFor(good, { secret: "short" }) as { reason?: string }).reason,
      ),
      "no-secret",
      "weak secret",
    );
    assertEqual(
      String(
        (
          verifyVoiceMemoryBinding({
            roomMetadata: undefined,
            roomName: ROOM,
            secret: SECRET,
          }) as { reason?: string }
        ).reason,
      ),
      "no-binding",
      "no metadata",
    );
    assertEqual(
      String(
        (
          verifyVoiceMemoryBinding({
            roomMetadata: Buffer.from(
              JSON.stringify({ authToken: "t" }),
            ).toString("base64"),
            roomName: ROOM,
            secret: SECRET,
          }) as { reason?: string }
        ).reason,
      ),
      "no-binding",
      "metadata without a binding",
    );
    assertEqual(
      String((verdictFor({ userId: USER }) as { reason?: string }).reason),
      "malformed",
      "missing fields",
    );
    assertEqual(
      String(
        (verdictFor({ ...good, sessionId: "has:colon" }) as { reason?: string })
          .reason,
      ),
      "malformed",
      "a session id with a colon is never accepted, even if signed",
    );
    assertEqual(
      String(
        (
          verifyVoiceMemoryBinding({
            roomMetadata: "%%%not-base64-json",
            roomName: ROOM,
            secret: SECRET,
          }) as { reason?: string }
        ).reason,
      ),
      "no-binding",
      "garbage metadata",
    );
  });

  await test("the signer refuses invalid identity and secrets, and the id validators agree", async () => {
    const refuses = (overrides: Record<string, unknown>) => {
      try {
        signed(overrides);
        return false;
      } catch {
        return true;
      }
    };
    assert(refuses({ sessionId: "a:b" }), "colon in session");
    assert(refuses({ userId: "has space" }), "whitespace in user");
    assert(refuses({ userId: "" }), "empty user");
    assert(refuses({ secret: "short" }), "weak secret");
    assert(refuses({ ttlSeconds: 0 }), "zero ttl");
    assert(
      refuses({ ttlSeconds: VOICE_MEMORY_MAX_TTL_SECONDS + 1 }),
      "ttl beyond the cap",
    );
    assert(isValidVoiceUserId(USER), "chat-style user ids are valid");
    assert(!isValidVoiceSessionId("a:b"), "colon refused");
    assert(!isValidVoiceSessionId("x".repeat(129)), "length refused");
  });

  // -------------------------------------------------------------------------
  // A4 — the recorder, driven with synthetic event streams
  // -------------------------------------------------------------------------

  await test("an ordinary exchange is written once with the assistant message id as turnId", async () => {
    const { recorder, written } = recorderWith();
    recorder.userTranscript(user("how are sales"));
    recorder.assistantDelta("Sales ");
    recorder.assistantDelta("are up.");
    recorder.assistantMessage({ id: "m-1", text: "Sales are up." });
    await recorder.flush(200);
    assertEqual(written.length, 1, "one turn");
    assertEqual(written[0].turnId, "m-1", "turn id");
    assertEqual(written[0].userMessage, "how are sales", "user text");
    assertEqual(written[0].aiResponse, "Sales are up.", "assistant text");
    assertEqual(
      written[0].interrupted || written[0].callEnded,
      false,
      "a complete turn is not flagged",
    );
  });

  await test("interim transcripts are ignored and several final segments join into one user message", async () => {
    const { recorder, written } = recorderWith();
    recorder.userTranscript(user("how", false));
    recorder.userTranscript(user("how are", false));
    recorder.userTranscript(user("how are sales"));
    recorder.userTranscript(user("this week"));
    recorder.assistantMessage({ id: "m-2", text: "Up." });
    await recorder.flush(200);
    assertEqual(
      written[0]?.userMessage,
      "how are sales this week",
      "joined finals",
    );
  });

  await test("a user transcript arriving after the reply is complete is paired with that reply", async () => {
    const { recorder, written } = recorderWith({ settleMs: 200 });
    recorder.assistantMessage({ id: "m-3", text: "Sales are up." });
    assertEqual(written.length, 0, "held until the transcript arrives");
    recorder.userTranscript(user("how are sales"));
    await recorder.flush(200);
    assertEqual(written.length, 1, "written once");
    assertEqual(
      written[0].turnId,
      "m-3",
      "paired with the reply that was waiting",
    );
    assertEqual(written[0].userMessage, "how are sales", "user text");
  });

  await test("a user transcript arriving while the reply is still streaming joins the same exchange", async () => {
    const { recorder, written } = recorderWith();
    recorder.assistantDelta("Sales ");
    recorder.userTranscript(user("how are sales"));
    recorder.assistantDelta("are up.");
    recorder.assistantMessage({ id: "m-4", text: "Sales are up." });
    await recorder.flush(200);
    assertEqual(written.length, 1, "one exchange");
    assertEqual(
      written[0].userMessage,
      "how are sales",
      "late transcript attached",
    );
  });

  await test("a reply that never gets user text (the greeting) is dropped, not stored", async () => {
    const { recorder, written } = recorderWith({ settleMs: 30 });
    recorder.assistantMessage({
      id: "greeting",
      text: "Hello, how can I help?",
    });
    await delay(90);
    assertEqual(written.length, 0, "nothing stored");
    assertEqual(recorder.stats().dropped, 1, "counted as dropped");
    recorder.userTranscript(user("sales please"));
    recorder.assistantMessage({ id: "m-5", text: "Sure." });
    await recorder.flush(200);
    assertEqual(
      written.map((w) => w.turnId).join(","),
      "m-5",
      "the next real exchange is unaffected",
    );
  });

  await test("a duplicate delivery of the same assistant message does not write a second turn", async () => {
    const { recorder, written } = recorderWith({ settleMs: 30 });
    recorder.userTranscript(user("sales"));
    recorder.assistantMessage({ id: "m-6", text: "Up." });
    recorder.assistantMessage({ id: "m-6", text: "Up." });
    await delay(90);
    await recorder.flush(200);
    assertEqual(written.length, 1, "exactly one write");
  });

  await test("the same reply delivered twice while it waits for user text is paired once", async () => {
    const { recorder, written } = recorderWith({ settleMs: 300 });
    recorder.assistantMessage({ id: "m-dup", text: "Sales are up." });
    recorder.assistantMessage({ id: "m-dup", text: "Sales are up." });
    recorder.userTranscript(user("how are sales"));
    recorder.userTranscript(user("and costs"));
    await recorder.flush(300);
    assertEqual(
      written.filter((w) => w.turnId === "m-dup").length,
      1,
      "one stored turn for the repeated reply",
    );
    const orphan = written.find((w) => w.turnId !== "m-dup");
    assertEqual(
      orphan?.userMessage,
      "and costs",
      "the next question starts its own exchange",
    );
    assertEqual(
      orphan?.callEnded,
      true,
      "and is closed by the shutdown, not mispaired with the old reply",
    );
  });

  await test("a reply delivered again after it was already written does not steal the next question", async () => {
    const { recorder, written } = recorderWith({ settleMs: 300 });
    recorder.userTranscript(user("how are sales"));
    recorder.assistantMessage({ id: "m-done", text: "Sales are up." });
    recorder.assistantMessage({ id: "m-done", text: "Sales are up." });
    recorder.userTranscript(user("and costs"));
    recorder.assistantMessage({ id: "m-next", text: "Costs are flat." });
    await recorder.flush(300);
    assertEqual(
      written.map((w) => `${w.turnId}=${w.userMessage}`).join(" | "),
      "m-done=how are sales | m-next=and costs",
      "each question is paired with its own reply",
    );
  });

  await test("the opening greeting is not paired with the user's first question when they speak over it", async () => {
    const { recorder, written } = recorderWith({ settleMs: 300 });
    recorder.expectGreeting();
    recorder.userTranscript(user("show me sales"));
    recorder.assistantMessage({
      id: "greeting",
      text: "Hello, how can I help?",
    });
    recorder.assistantMessage({ id: "m-first", text: "Sales are up." });
    await recorder.flush(300);
    assertEqual(
      written.map((w) => `${w.turnId}=${w.userMessage}`).join(" | "),
      "m-first=show me sales",
      "the greeting is skipped and the real answer pairs with the question",
    );
  });

  await test("only the first assistant reply is treated as the greeting", async () => {
    const { recorder, written } = recorderWith({ settleMs: 300 });
    recorder.expectGreeting();
    recorder.assistantMessage({ id: "greeting", text: "Hello." });
    recorder.userTranscript(user("sales"));
    recorder.assistantMessage({ id: "m-1", text: "Up." });
    recorder.userTranscript(user("costs"));
    recorder.assistantMessage({ id: "m-2", text: "Flat." });
    await recorder.flush(300);
    assertEqual(
      written.map((w) => w.turnId).join(","),
      "m-1,m-2",
      "later replies are real turns",
    );
  });

  await test("speaking again over an unfinished reply closes the first exchange as interrupted", async () => {
    const { recorder, written } = recorderWith();
    recorder.userTranscript(user("how are sales"));
    recorder.assistantDelta("Sales are up by");
    recorder.userTranscript(user("actually show costs"));
    recorder.assistantDelta("Costs are flat.");
    recorder.assistantMessage({ id: "m-7", text: "Costs are flat." });
    await recorder.flush(200);
    assertEqual(written.length, 2, "two exchanges");
    assertEqual(written[0].userMessage, "how are sales", "first user text");
    assertEqual(
      written[0].aiResponse,
      "Sales are up by",
      "first reply as far as it got",
    );
    assertEqual(written[0].interrupted, true, "first marked interrupted");
    assertEqual(written[1].turnId, "m-7", "second keeps the assistant id");
    assertEqual(
      written[1].userMessage,
      "actually show costs",
      "second user text",
    );
  });

  await test("tool events land on the exchange they happened in, in the stored shape, bounded", async () => {
    const { recorder, written } = recorderWith();
    recorder.userTranscript(user("sales chart"));
    recorder.toolStart({ name: "getSales", args: { period: "week" } });
    recorder.toolEnd({ name: "getSales", result: "x".repeat(10_000) });
    recorder.toolStart({ name: "getCosts", args: {} });
    recorder.toolEnd({ name: "getCosts", error: "timeout" });
    recorder.assistantMessage({ id: "m-8", text: "Here you go." });
    await recorder.flush(200);
    const events = written[0].events ?? [];
    assertEqual(
      events.map((e) => e.type).join(","),
      "tool:start,tool:end,tool:start,tool:end",
      "types in order",
    );
    assertEqual(
      events.map((e) => e.seq).join(","),
      "0,1,2,3",
      "sequence numbers",
    );
    assertEqual(events[0].toolName, "getSales", "toolName");
    assertEqual(events[0].tool, "getSales", "tool alias");
    assert(
      String(events[1].result).length < 4100,
      "a large result is truncated",
    );
    assertEqual(events[3].success, false, "a failed call is marked");
    assertEqual(events[3].error, "timeout", "error text kept");
  });

  await test("shutdown mid-reply stores what was said, a call-ended note, and the flags", async () => {
    const { recorder, written } = recorderWith();
    recorder.userTranscript(user("how are sales"));
    recorder.assistantDelta("Sales are up by ");
    const stats = await recorder.flush(200);
    assertEqual(written.length, 1, "one turn");
    assertEqual(written[0].callEnded, true, "call ended");
    assertEqual(written[0].interrupted, true, "interrupted");
    assert(
      written[0].aiResponse.startsWith("Sales are up by"),
      "partial reply kept",
    );
    assert(written[0].aiResponse.includes("call ended"), "note appended");
    assertEqual(stats.written, 1, "stats");
  });

  await test("shutdown with an unanswered user turn stores the note alone as the reply", async () => {
    const { recorder, written } = recorderWith();
    recorder.userTranscript(user("are you there"));
    await recorder.flush(200);
    assertEqual(written.length, 1, "one turn");
    assertEqual(written[0].userMessage, "are you there", "user text kept");
    assert(written[0].aiResponse.includes("call ended"), "note-only reply");
    assertEqual(written[0].callEnded, true, "flag");
    assertEqual(written[0].interrupted, false, "no reply was cut off");
  });

  await test("shutdown with only an unsent assistant fragment stores nothing", async () => {
    const { recorder, written } = recorderWith();
    recorder.assistantDelta("Hello there, ");
    await recorder.flush(200);
    assertEqual(written.length, 0, "an assistant-only fragment is not a turn");
  });

  await test("shutdown waits for pending writes only up to its budget", async () => {
    const written: VoiceTurnRecord[] = [];
    const { recorder } = recorderWith({
      write: async (record) => {
        await delay(600);
        written.push(record);
      },
    });
    recorder.userTranscript(user("sales"));
    recorder.assistantMessage({ id: "slow", text: "Up." });
    const started = Date.now();
    const stats = await recorder.flush(60);
    const took = Date.now() - started;
    assert(took < 400, `flush must return near its budget, took ${took} ms`);
    assertEqual(stats.pending, 1, "the slow write is still pending");
    assertEqual(written.length, 0, "and has not landed");
    await delay(700);
    assertEqual(written.length, 1, "the write still completes on its own");
  });

  await test("a failing write is retried; after the last retry it is reported and later turns still land, in order", async () => {
    let attempts = 0;
    const stored: string[] = [];
    const { recorder, failed } = recorderWith({
      retries: 2,
      write: async (record) => {
        if (record.turnId === "doomed") {
          attempts += 1;
          throw new Error("store unavailable");
        }
        stored.push(record.turnId);
      },
    });
    recorder.userTranscript(user("one"));
    recorder.assistantMessage({ id: "doomed", text: "A" });
    recorder.userTranscript(user("two"));
    recorder.assistantMessage({ id: "fine", text: "B" });
    const stats = await recorder.flush(2000);
    assertEqual(attempts, 3, "first attempt plus two retries");
    assertEqual(
      failed.map((f) => f.turnId).join(","),
      "doomed",
      "reported once",
    );
    assertEqual(stored.join(","), "fine", "the next turn is stored");
    assertEqual(stats.failed, 1, "stats");
  });

  await test("a write that fails once then succeeds is stored once", async () => {
    let calls = 0;
    const stored: string[] = [];
    const { recorder, failed } = recorderWith({
      write: async (record) => {
        calls += 1;
        if (calls === 1) {
          throw new Error("blip");
        }
        stored.push(record.turnId);
      },
    });
    recorder.userTranscript(user("one"));
    recorder.assistantMessage({ id: "once", text: "A" });
    await recorder.flush(2000);
    assertEqual(stored.join(","), "once", "stored after the retry");
    assertEqual(failed.length, 0, "not reported");
  });

  await test("events after shutdown started are ignored", async () => {
    const { recorder, written } = recorderWith();
    await recorder.flush(100);
    recorder.userTranscript(user("late"));
    recorder.assistantMessage({ id: "late", text: "late" });
    await recorder.flush(100);
    assertEqual(written.length, 0, "nothing recorded after flush");
  });

  // -------------------------------------------------------------------------
  // A4/A5 — the realtime wiring helper (binding check, setup, shutdown flush)
  // -------------------------------------------------------------------------

  type FakeNeuroLink = {
    calls: RecordConversationTurnOptions[];
    seedCalls: number;
    createNeuroLink: () => Promise<{
      recordConversationTurn: (
        o: RecordConversationTurnOptions,
      ) => Promise<{ recorded: boolean; sessionId: string; userId: string }>;
      getConversationSeed: () => Promise<
        Array<{ role: "user" | "assistant"; content: string }>
      >;
    }>;
    created: number;
  };
  const fakeNeuroLink = (failWrites = false): FakeNeuroLink => {
    const state: FakeNeuroLink = {
      calls: [],
      seedCalls: 0,
      created: 0,
      createNeuroLink: async () => {
        state.created += 1;
        return {
          recordConversationTurn: async (options) => {
            if (failWrites) {
              throw new Error("down");
            }
            state.calls.push(options);
            return {
              recorded: true,
              sessionId: options.sessionId,
              userId: options.userId,
            };
          },
          getConversationSeed: async () => {
            state.seedCalls += 1;
            return [
              { role: "user", content: "earlier question" },
              { role: "assistant", content: "earlier answer" },
            ];
          },
        };
      },
    };
    return state;
  };
  const fakeContext = (metadata: string | undefined, name: string = ROOM) => {
    const callbacks: Array<() => Promise<void>> = [];
    const ctx = {
      room: { name, metadata },
      addShutdownCallback: (callback: () => Promise<void>) => {
        callbacks.push(callback);
      },
    } as unknown as Parameters<typeof setUpRealtimeCallMemory>[0];
    return { ctx, callbacks };
  };
  const nowSeconds = () => Math.floor(Date.now() / 1000);
  const liveBinding = (overrides: Record<string, unknown> = {}) =>
    signed({ now: nowSeconds(), ...overrides });

  await test("a call whose binding does not verify gets no memory, builds no NeuroLink and registers no flush", async () => {
    const fake = fakeNeuroLink();
    const config = { createNeuroLink: fake.createNeuroLink, secret: SECRET };
    const cases: Array<[string, string | undefined, string]> = [
      ["no metadata", undefined, ROOM],
      [
        "no binding in metadata",
        Buffer.from(JSON.stringify({ authToken: "t" })).toString("base64"),
        ROOM,
      ],
      [
        "binding signed for another room",
        roomMetadata(liveBinding({ room: "voice-room-9" })),
        ROOM,
      ],
      [
        "tampered user",
        roomMetadata({ ...liveBinding(), userId: "attacker" }),
        ROOM,
      ],
      ["expired", roomMetadata(signed({ now: nowSeconds() - 7300 })), ROOM],
      ["room name unknown", roomMetadata(liveBinding()), ""],
    ];
    for (const [label, metadata, name] of cases) {
      const { ctx, callbacks } = fakeContext(metadata, name);
      const memory = await setUpRealtimeCallMemory(ctx, config);
      assertEqual(memory, undefined, `${label}: no memory`);
      assertEqual(callbacks.length, 0, `${label}: no shutdown callback`);
    }
    assertEqual(
      fake.created,
      0,
      "no NeuroLink instance was built for any of them",
    );
  });

  await test("memory is off when no memory option is configured", async () => {
    const { ctx, callbacks } = fakeContext(roomMetadata(liveBinding()));
    assertEqual(
      await setUpRealtimeCallMemory(ctx, undefined),
      undefined,
      "no config, no memory",
    );
    assertEqual(callbacks.length, 0, "no callback");
  });

  await test("a failing NeuroLink factory leaves the call running without memory", async () => {
    const { ctx, callbacks } = fakeContext(roomMetadata(liveBinding()));
    const memory = await setUpRealtimeCallMemory(ctx, {
      secret: SECRET,
      createNeuroLink: async () => {
        throw new Error("redis down");
      },
    });
    assertEqual(memory, undefined, "no memory");
    assertEqual(callbacks.length, 0, "no callback");
  });

  await test("a verified call is seeded, writes under the BOUND identity only, and the shutdown callback flushes", async () => {
    const fake = fakeNeuroLink();
    const { ctx, callbacks } = fakeContext(roomMetadata(liveBinding()));
    const memory = await setUpRealtimeCallMemory(ctx, {
      secret: SECRET,
      createNeuroLink: fake.createNeuroLink,
    });
    assert(memory !== undefined, "memory set up");
    assertEqual(memory?.seed.length, 2, "history seed read once");
    assertEqual(fake.seedCalls, 1, "seed read once");
    assertEqual(callbacks.length, 1, "exactly one shutdown callback");

    memory?.recorder.userTranscript(user("how are sales"));
    memory?.recorder.assistantMessage({ id: "m-10", text: "Up." });
    memory?.recorder.userTranscript(user("and costs"));
    memory?.recorder.assistantDelta("Costs are");
    const started = Date.now();
    await callbacks[0]();
    assert(
      Date.now() - started < 800,
      "the callback finishes inside its budget",
    );

    assertEqual(fake.calls.length, 2, "both exchanges written");
    for (const call of fake.calls) {
      assertEqual(call.userId, USER, "user comes from the binding");
      assertEqual(call.sessionId, SESSION, "session comes from the binding");
      assertEqual(call.modality, "voice", "marked voice");
    }
    assertEqual(fake.calls[0].turnId, "m-10", "assistant id is the turn id");
    assertEqual(
      fake.calls[1].callEnded,
      true,
      "the open turn was closed by the flush",
    );
  });

  await test("seeding can be switched off", async () => {
    const fake = fakeNeuroLink();
    const { ctx } = fakeContext(roomMetadata(liveBinding()));
    const memory = await setUpRealtimeCallMemory(ctx, {
      secret: SECRET,
      seed: false,
      createNeuroLink: fake.createNeuroLink,
    });
    assertEqual(memory?.seed.length, 0, "no seed");
    assertEqual(fake.seedCalls, 0, "history not read");
  });

  await test("a turn that cannot be stored is announced to the client as not-saved and the call is unaffected", async () => {
    const fake = fakeNeuroLink(true);
    const { ctx, callbacks } = fakeContext(roomMetadata(liveBinding()));
    const memory = await setUpRealtimeCallMemory(ctx, {
      secret: SECRET,
      createNeuroLink: fake.createNeuroLink,
    });
    const published: Array<{ type: string; data: Record<string, unknown> }> =
      [];
    memory?.setPublisher((type, data) => {
      published.push({ type, data });
    });
    memory?.recorder.userTranscript(user("sales"));
    memory?.recorder.assistantMessage({ id: "m-11", text: "Up." });
    await callbacks[0]();
    await delay(5);
    const notice = published.find((event) => event.type === "memory");
    assert(notice !== undefined, "a memory event was published");
    assertEqual(notice?.data.state, "not-saved", "state");
    assertEqual(
      notice?.data.turnId,
      "m-11",
      "turn id so the client can mark that turn",
    );
  });

  await test("a remembered call traces each turn under the provider of its realtime backend: vertex for gemini, xai for xai", async () => {
    const spans = installSpanCapture();
    const cases: Array<
      [
        string,
        Parameters<typeof setUpRealtimeCallMemory>[2],
        { provider: string; model: string | undefined },
      ]
    > = [
      [
        "gemini",
        { model: "gemini-live-2.5-flash", backend: "gemini" },
        { provider: "vertex", model: "gemini-live-2.5-flash" },
      ],
      [
        "xai",
        { model: "grok-voice-3.0", backend: "xai" },
        { provider: "xai", model: "grok-voice-3.0" },
      ],
      [
        "no backend named",
        { model: "gemini-live-2.5-flash" },
        { provider: "vertex", model: "gemini-live-2.5-flash" },
      ],
    ];
    for (const [label, call, expected] of cases) {
      spans.reset();
      const fake = fakeNeuroLink();
      const { ctx, callbacks } = fakeContext(roomMetadata(liveBinding()));
      const memory = await setUpRealtimeCallMemory(
        ctx,
        { secret: SECRET, seed: false, createNeuroLink: fake.createNeuroLink },
        call,
      );
      assert(memory !== undefined, `${label}: memory set up`);
      memory?.recorder.userTranscript(user("how are sales"));
      memory?.recorder.assistantMessage({ id: `m-${label}`, text: "Up." });
      await callbacks[0]();
      assertEqual(fake.calls.length, 1, `${label}: the turn was stored`);
      const generation = spans.allByName("realtime");
      assertEqual(generation.length, 1, `${label}: one generation span`);
      const attributes = generation[0].attributes;
      assertEqual(
        attributes["langfuse.observation.model.name"],
        expected.model,
        `${label}: model on the span`,
      );
      assertEqual(
        attributes["langfuse.observation.metadata.provider"],
        expected.provider,
        `${label}: provider on the span`,
      );
    }
  });

  // -------------------------------------------------------------------------
  // A7 — the cascaded agent's brain
  // -------------------------------------------------------------------------

  const brainRun = async (
    turn: Record<string, unknown>,
    brainUserId?: string,
  ) => {
    const seen: StreamOptions[] = [];
    const brain = createVoiceBrain({
      neurolink: {
        stream: async (options: StreamOptions) => {
          seen.push(options);
          return {
            stream: (async function* () {
              yield { content: "ok" };
            })(),
          } as unknown as StreamResult;
        },
      },
      ...(brainUserId ? { userId: brainUserId } : {}),
    });
    for await (const chunk of brain.streamReply({
      transcript: "hello",
      conversationId: "voice-room",
      ...turn,
    })) {
      void chunk;
    }
    return seen[0];
  };

  await test("the brain stamps every turn as voice and uses the per-call user over the static one", async () => {
    const bound = await brainRun(
      { userId: "bound-user", conversationId: "bound-session" },
      "static-user",
    );
    assertEqual(bound.modality, "voice", "modality");
    assertEqual(
      (bound.context as Record<string, string>).userId,
      "bound-user",
      "per-call user wins",
    );
    assertEqual(
      (bound.context as Record<string, string>).sessionId,
      "bound-session",
      "bound conversation",
    );
    const unbound = await brainRun({}, "static-user");
    assertEqual(
      (unbound.context as Record<string, string>).userId,
      "static-user",
      "static user when no per-call user",
    );
    assertEqual(
      (unbound.context as Record<string, string>).sessionId,
      "voice-room",
      "room-derived conversation as before",
    );
  });

  await test("an ephemeral turn (the greeting on a bound call) neither reads nor writes memory", async () => {
    const greeting = await brainRun(
      { ephemeral: true, userId: "bound-user" },
      "static-user",
    );
    assertEqual(
      JSON.stringify(greeting.context),
      '{"tags":["voice"]}',
      "no session and no user in context",
    );
    assertEqual(greeting.modality, "voice", "still marked voice");
  });
});

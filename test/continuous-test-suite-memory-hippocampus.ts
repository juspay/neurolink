#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Hippocampus memory write path.
 *
 * Covers the NeuroLink side of the `@juspay/hippocampus` integration through
 * the public surface only: `new NeuroLink({ conversationMemory.memory })`,
 * `generate()` / `stream()` with the per-call `memory` block, and the
 * exported `validateCondensationPrompt`. All from `../dist/index.js`.
 *
 * `@juspay/hippocampus` itself is NOT installed here — its peer on
 * `@juspay/neurolink` makes pnpm pull a registry copy of this very package
 * into the graph (528 lockfile lines, and the condenser's dynamic
 * `import('@juspay/neurolink')` then resolves to that copy, not to `dist/`).
 * Instead every test injects a host-managed client through the public
 * `conversationMemory.memory.client` seam — the same object a host that runs
 * its own Hippocampus instance would hand over — and asserts on what reaches
 * its `add()`. The fake mirrors what `@juspay/hippocampus` ≥0.2.0 (the peer
 * floor) does with the config it is constructed from: it condenses through
 * `config.neurolink.instance` when one is supplied, with the
 * `add(ownerId, content, { prompt, maxWords })` signature. The `client` seam
 * accepts a factory, so a test can construct the fake from the very config
 * NeuroLink assembled and assert on it.
 *
 * The LLM call is a loopback OpenAI-shaped server (`mockChatServer.ts`), so
 * the suite is offline and needs no provider keys.
 *
 * Run: npx tsx test/continuous-test-suite-memory-hippocampus.ts
 */

import { createServer, type Server } from "node:http";
import { defineSuite, assert, assertEqual, delay } from "./helpers/harness.js";
import {
  startMockChatServer,
  mockOpenAICredentials,
  type MockChatServer,
} from "./helpers/mockChatServer.js";
import type {
  HippocampusConfig,
  HippocampusLike,
  HippocampusMemory,
  HippocampusNeurolinkLike,
  MemoryCallOptions,
  MemoryTurn,
} from "../dist/index.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

// Warnings are hidden unless debugging (logger.shouldLog); the suite asserts
// on them, so turn the gate on and keep the level at warn to stay quiet.
process.env.NEUROLINK_DEBUG = "true";
process.env.NEUROLINK_LOG_LEVEL = "warn";

const { test, runSuite, section } = defineSuite(
  "Memory: Hippocampus write path",
  {
    offline: true,
  },
);

const VALID_PROMPT =
  "Merge.\nOLD_MEMORY:\n{{OLD_MEMORY}}\nNEW_CONTENT:\n{{NEW_CONTENT}}\nMax {{MAX_WORDS}} words.";
const PROMPT_NO_NEW_CONTENT =
  "Merge.\nOLD_MEMORY:\n{{OLD_MEMORY}}\nMax {{MAX_WORDS}} words.";
const PROMPT_NO_OLD_MEMORY =
  "Merge.\nNEW_CONTENT:\n{{NEW_CONTENT}}\nMax {{MAX_WORDS}} words.";
const PROMPT_NO_MAX_WORDS = "Merge.\n{{OLD_MEMORY}}\n{{NEW_CONTENT}}";
const USER_PROMPT = "My name is Alice and I run a Shopify store.";

type AddCall = {
  ownerId: string;
  content: string;
  options?: { prompt?: string; maxWords?: number };
};

/**
 * Stand-in for a `Hippocampus` client. Records every `add()`. Constructed
 * from a `HippocampusConfig` exactly like the real ≥0.2.0 class, it condenses
 * through `config.neurolink.instance` when one is present —
 * `generate({ input, provider, model, temperature, disableTools: true })` —
 * so a test can prove which NeuroLink instance the condensation ran on.
 */
class FakeHippocampus implements HippocampusLike {
  readonly adds: AddCall[] = [];
  /** The config this client was constructed from (a factory hands it in). */
  readonly config: HippocampusConfig;
  private readonly store = new Map<string, string>();

  constructor(config: HippocampusConfig = {}) {
    this.config = config;
  }

  async add(
    ownerId: string,
    content: string,
    options?: { prompt?: string; maxWords?: number },
  ): Promise<string> {
    this.adds.push({ ownerId, content, options });
    // Exactly what Hippocampus ≥0.2.0 does: condense through the supplied
    // instance when there is one.
    const instance = this.config.neurolink?.instance;
    if (instance) {
      const result = await instance.generate({
        input: { text: `CONDENSE_MARKER ${content}` },
        provider: this.config.neurolink?.provider,
        model: this.config.neurolink?.model,
        temperature: this.config.neurolink?.temperature ?? 0.1,
        disableTools: true,
      });
      const condensed = (result?.content ?? "").trim();
      this.store.set(ownerId, condensed);
      return condensed;
    }
    this.store.set(ownerId, content);
    return content;
  }

  async get(ownerId: string): Promise<string | null> {
    return this.store.get(ownerId) ?? null;
  }

  async delete(ownerId: string): Promise<void> {
    this.store.delete(ownerId);
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 5_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return true;
    }
    await delay(10);
  }
  return predicate();
}

/** Long enough for setImmediate + an awaited hook chain to have run. */
const BACKGROUND_SETTLE_MS = 400;

/**
 * A loopback OpenAI SSE stand-in for a tool round trip whose tool is chosen
 * BY THE REQUEST: the first request of a conversation (no `tool` message
 * yet) is answered with a call to the first tool the body declares, the
 * follow-up with text. Two concurrent streams with different tools therefore
 * each get their own tool called by one shared server.
 */
async function startToolByRequestServer(): Promise<{
  baseURL: string;
  close(): Promise<void>;
}> {
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      let body: {
        messages?: Array<{ role?: string }>;
        tools?: Array<{ function?: { name?: string } }>;
      };
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        body = {};
      }
      const answered = (body.messages ?? []).some((m) => m.role === "tool");
      const toolName = body.tools?.[0]?.function?.name;
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      const frame = (delta: Record<string, unknown>, finish: string | null) =>
        res.write(
          `data: ${JSON.stringify({
            id: "chatcmpl-tool-by-request",
            object: "chat.completion.chunk",
            model: "gpt-4o-mini",
            choices: [{ index: 0, delta, finish_reason: finish }],
          })}\n\n`,
        );
      if (!answered && toolName) {
        frame(
          {
            tool_calls: [
              {
                index: 0,
                id: `call_${toolName}`,
                type: "function",
                function: { name: toolName, arguments: "{}" },
              },
            ],
          },
          null,
        );
        frame({}, "tool_calls");
      } else {
        frame(
          { role: "assistant", content: `done via ${toolName ?? "none"}` },
          null,
        );
        frame({}, "stop");
      }
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () =>
      new Promise<void>((r) => {
        server.closeAllConnections?.();
        server.close(() => r());
      }),
  };
}

const ENV_KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "HC_CONDENSATION_PROMPT",
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) {
    out[key] = process.env[key];
  }
  return out;
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = snapshot[key];
    }
  }
}

void runSuite(async () => {
  const { NeuroLink, jsonSchema, logger, validateCondensationPrompt } =
    await import("../dist/index.js");

  type NL = InstanceType<typeof NeuroLink>;

  let server: MockChatServer = await startMockChatServer();

  function makeNeurolink(
    fake: FakeHippocampus | ((config: HippocampusConfig) => FakeHippocampus),
    memory: Partial<HippocampusMemory> = {},
    target: MockChatServer = server,
  ): NL {
    return new NeuroLink({
      credentials: mockOpenAICredentials(target),
      conversationMemory: {
        enabled: true,
        memory: { enabled: true, client: fake, ...memory },
      },
    });
  }

  /**
   * A factory seam that hands back the constructed fake, so a test can
   * assert on the config NeuroLink assembled for it.
   */
  function captureFake(): {
    factory: (config: HippocampusConfig) => FakeHippocampus;
    get: () => FakeHippocampus;
  } {
    let built: FakeHippocampus | undefined;
    return {
      factory: (config) => {
        built = new FakeHippocampus(config);
        return built;
      },
      get: () => {
        if (!built) {
          throw new Error("the client factory has not been called yet");
        }
        return built;
      },
    };
  }

  /** Call options shared by generate() and stream(); one shape fits both. */
  function generateArgs(
    memory: MemoryCallOptions | undefined,
    userId = "user-alice",
  ): {
    input: { text: string };
    provider: string;
    model: string;
    context: { userId: string; sessionId: string };
    disableTools: boolean;
    maxSteps: number;
    timeout: number;
    memory?: MemoryCallOptions;
  } {
    return {
      input: { text: USER_PROMPT },
      provider: "openai",
      model: "gpt-4o-mini",
      context: { userId, sessionId: "session-1" },
      disableTools: true,
      maxSteps: 1,
      timeout: 30_000,
      ...(memory ? { memory } : {}),
    };
  }

  /** Warn-level messages recorded since `logger.clearLogs()`. */
  function warnings(): string[] {
    return logger.getLogs("warn").map((entry) => entry.message);
  }

  /**
   * Error-level messages recorded since `logger.clearLogs()`. Anything that
   * DISABLES memory logs here — `warn` is hidden at the default log level,
   * and a host whose memory is silently off has no other signal.
   */
  function errors(): string[] {
    return logger.getLogs("error").map((entry) => entry.message);
  }

  // -------------------------------------------------------------------------
  section("validateCondensationPrompt (exported)");

  await test("reports missing placeholders and classifies the structural ones as fatal", () => {
    const ok = validateCondensationPrompt(VALID_PROMPT);
    assert(
      ok.valid && ok.missing.length === 0,
      "a complete template should be valid with nothing missing",
    );

    const noNew = validateCondensationPrompt(PROMPT_NO_NEW_CONTENT);
    assert(!noNew.valid, "a template without NEW_CONTENT must be invalid");
    assertEqual(
      noNew.fatal.join(","),
      "NEW_CONTENT",
      "NEW_CONTENT should be the only fatal miss",
    );

    const noOld = validateCondensationPrompt(PROMPT_NO_OLD_MEMORY);
    assert(!noOld.valid, "a template without OLD_MEMORY must be invalid");
    assertEqual(
      noOld.fatal.join(","),
      "OLD_MEMORY",
      "OLD_MEMORY should be the only fatal miss",
    );

    const noMax = validateCondensationPrompt(PROMPT_NO_MAX_WORDS);
    assert(noMax.valid, "a template without MAX_WORDS is still valid");
    assertEqual(
      noMax.missing.join(","),
      "MAX_WORDS",
      "MAX_WORDS should be reported as missing",
    );
    assertEqual(noMax.fatal.length, 0, "MAX_WORDS must not be fatal");
  });

  // -------------------------------------------------------------------------
  section("Item 7 — per-call prompt/maxWords reach the primary owner");

  await test("generate(): primary add() carries the per-call prompt and maxWords; additional users keep their own", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake);
    const orgPrompt = VALID_PROMPT.replace("Merge.", "Org policy only.");
    await nl.generate(
      generateArgs({
        prompt: VALID_PROMPT,
        maxWords: 7,
        additionalUsers: [
          { userId: "org-acme", prompt: orgPrompt, maxWords: 99 },
          { userId: "team-x" },
        ],
      }),
    );
    assert(
      await waitFor(() => fake.adds.length >= 3),
      "expected three add() calls (primary + two additional)",
    );
    const primary = fake.adds.find((a) => a.ownerId === "user-alice");
    const org = fake.adds.find((a) => a.ownerId === "org-acme");
    const team = fake.adds.find((a) => a.ownerId === "team-x");
    assert(primary !== undefined, "primary owner add() missing");
    assertEqual(
      primary?.options?.prompt,
      VALID_PROMPT,
      "primary owner should get the per-call prompt",
    );
    assertEqual(
      primary?.options?.maxWords,
      7,
      "primary owner should get the per-call maxWords",
    );
    assertEqual(
      org?.options?.prompt,
      orgPrompt,
      "additional user keeps its own prompt",
    );
    assertEqual(
      org?.options?.maxWords,
      99,
      "additional user keeps its own maxWords",
    );
    assertEqual(
      team?.options,
      undefined,
      "an additional user with no overrides gets no options",
    );
    assert(
      primary?.content.startsWith(`User: ${USER_PROMPT}\nAssistant: `) === true,
      "default content should be the User/Assistant rendering of the turn",
    );
  });

  await test("generate(): without per-call prompt the primary add() carries no prompt (instance prompt wins inside Hippocampus)", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake, { prompt: VALID_PROMPT });
    await nl.generate(generateArgs({ maxWords: 12 }));
    assert(
      await waitFor(() => fake.adds.length >= 1),
      "expected the primary add()",
    );
    assertEqual(
      fake.adds[0].options?.prompt,
      undefined,
      "no per-call prompt should be forwarded",
    );
    assertEqual(
      fake.adds[0].options?.maxWords,
      12,
      "per-call maxWords should still be forwarded",
    );
  });

  await test("stream(): primary add() carries the per-call prompt after the stream drains", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake);
    const streamed = await nl.stream(
      generateArgs({ prompt: VALID_PROMPT, maxWords: 5 }),
    );
    for await (const _chunk of streamed.stream as AsyncIterable<unknown>) {
      // draining is what triggers the write
    }
    assert(
      await waitFor(() => fake.adds.length >= 1),
      "expected the primary add() after draining",
    );
    assertEqual(
      fake.adds[0].ownerId,
      "user-alice",
      "stream write should target context.userId",
    );
    assertEqual(
      fake.adds[0].options?.prompt,
      VALID_PROMPT,
      "stream path should forward the per-call prompt",
    );
    assertEqual(
      fake.adds[0].options?.maxWords,
      5,
      "stream path should forward the per-call maxWords",
    );
  });

  // -------------------------------------------------------------------------
  section("Item 8 — shouldWrite / onBeforeStore hooks");

  await test("shouldWrite=false skips every add() (primary and additional)", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake);
    let seen: MemoryTurn | undefined;
    await nl.generate(
      generateArgs({
        shouldWrite: async (turn) => {
          seen = turn;
          return false;
        },
        additionalUsers: [{ userId: "org-acme" }],
      }),
    );
    await delay(BACKGROUND_SETTLE_MS);
    assertEqual(
      fake.adds.length,
      0,
      "no add() may run when shouldWrite returns false",
    );
    assert(seen !== undefined, "the gate should have been consulted");
    assertEqual(
      seen?.prompt,
      USER_PROMPT,
      "turn.prompt should be the caller's original prompt",
    );
    assertEqual(
      seen?.userId,
      "user-alice",
      "turn.userId should be context.userId",
    );
    assertEqual(
      seen?.sessionId,
      "session-1",
      "turn.sessionId should be context.sessionId",
    );
    assert(
      typeof seen?.response === "string" && seen.response.length > 0,
      "turn.response should carry the model text",
    );
    assert(
      seen?.provider === "openai",
      "turn.provider should name the provider on the generate path",
    );
    assert(
      seen?.usage !== undefined,
      "turn.usage should be present on the generate path",
    );
  });

  await test("shouldWrite=true lets the write through", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake);
    await nl.generate(generateArgs({ shouldWrite: () => true }));
    assert(
      await waitFor(() => fake.adds.length >= 1),
      "add() should run when shouldWrite returns true",
    );
  });

  await test("onBeforeStore returning null skips the write", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake);
    await nl.generate(
      generateArgs({
        onBeforeStore: () => null,
        additionalUsers: [{ userId: "org-acme" }],
      }),
    );
    await delay(BACKGROUND_SETTLE_MS);
    assertEqual(
      fake.adds.length,
      0,
      "no add() may run when onBeforeStore returns null",
    );
  });

  await test("onBeforeStore's returned string is what reaches add(), for every owner", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake);
    await nl.generate(
      generateArgs({
        onBeforeStore: async (content, turn) =>
          `REWRITTEN(${turn.userId}) ${content.length}`,
        additionalUsers: [{ userId: "org-acme" }],
      }),
    );
    assert(
      await waitFor(() => fake.adds.length >= 2),
      "expected two add() calls",
    );
    for (const call of fake.adds) {
      assert(
        call.content.startsWith("REWRITTEN(user-alice) "),
        "transformed content should reach add()",
      );
    }
  });

  await test("a throwing shouldWrite skips the write and warns", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake);
    logger.clearLogs();
    await nl.generate(
      generateArgs({
        shouldWrite: () => {
          throw new Error("gate exploded");
        },
      }),
    );
    await delay(BACKGROUND_SETTLE_MS);
    assertEqual(
      fake.adds.length,
      0,
      "a throwing gate must not let the write through",
    );
    assert(
      warnings().some((m) => m.includes("memory.shouldWrite hook threw")),
      "a warning naming the shouldWrite hook should be logged",
    );
  });

  await test("a throwing onBeforeStore skips the write and warns", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake);
    logger.clearLogs();
    await nl.generate(
      generateArgs({
        onBeforeStore: async () => {
          throw new Error("transform exploded");
        },
      }),
    );
    await delay(BACKGROUND_SETTLE_MS);
    assertEqual(
      fake.adds.length,
      0,
      "a throwing transform must not let the write through",
    );
    assert(
      warnings().some((m) => m.includes("memory.onBeforeStore hook threw")),
      "a warning naming the onBeforeStore hook should be logged",
    );
  });

  await test("instance-level hooks apply to every call; a per-call hook wins over the instance one", async () => {
    const fake = new FakeHippocampus();
    let instanceGateCalls = 0;
    const nl = makeNeurolink(fake, {
      shouldWrite: () => {
        instanceGateCalls++;
        return false;
      },
      onBeforeStore: (content) => `INSTANCE ${content}`,
    });
    // Instance gate blocks.
    await nl.generate(generateArgs(undefined));
    await delay(BACKGROUND_SETTLE_MS);
    assertEqual(
      fake.adds.length,
      0,
      "the instance shouldWrite should block the first call",
    );
    assertEqual(instanceGateCalls, 1, "the instance gate should have run once");
    // Per-call gate overrides the instance gate; instance transform still applies.
    await nl.generate(generateArgs({ shouldWrite: () => true }));
    assert(
      await waitFor(() => fake.adds.length >= 1),
      "the per-call gate should let the second call through",
    );
    assertEqual(
      instanceGateCalls,
      1,
      "the instance gate must not run when a per-call gate is set",
    );
    assert(
      fake.adds[0].content.startsWith("INSTANCE "),
      "the instance onBeforeStore should still apply",
    );
    // Per-call transform overrides the instance transform.
    await nl.generate(
      generateArgs({
        shouldWrite: () => true,
        onBeforeStore: (c) => `PERCALL ${c}`,
      }),
    );
    assert(
      await waitFor(() => fake.adds.length >= 2),
      "third call should write",
    );
    assert(
      fake.adds[1].content.startsWith("PERCALL "),
      "the per-call onBeforeStore should win",
    );
  });

  await test("stream(): hooks see a MemoryTurn with provider and the drained response", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake);
    let seen: MemoryTurn | undefined;
    const streamed = await nl.stream(
      generateArgs({
        shouldWrite: (turn) => {
          seen = turn;
          return true;
        },
      }),
    );
    for await (const _chunk of streamed.stream as AsyncIterable<unknown>) {
      // drain
    }
    assert(
      await waitFor(() => fake.adds.length >= 1),
      "stream write should happen",
    );
    assertEqual(
      seen?.prompt,
      USER_PROMPT,
      "stream turn.prompt should be the original prompt",
    );
    assertEqual(
      seen?.userId,
      "user-alice",
      "stream turn.userId should be context.userId",
    );
    assert(
      typeof seen?.response === "string" && seen.response.length > 0,
      "stream turn.response should be the drained text",
    );
    assertEqual(seen?.provider, "openai", "stream turn.provider should be set");
  });

  await test("stream(): two overlapping streams each hand their hooks only their own toolsUsed", async () => {
    // The stream memory turn's toolsUsed was built from tool:start events
    // captured by INSTANCE-WIDE listeners, so a tool that started during
    // another stream() on the same instance was attributed to this turn's
    // shouldWrite / onBeforeStore. It now comes from the per-request stream
    // result, as generate() already did.
    const toolServer = await startToolByRequestServer();
    const fake = new FakeHippocampus();
    const nl = new NeuroLink({
      credentials: {
        openai: { apiKey: "sk-mock", baseURL: toolServer.baseURL },
      },
      conversationMemory: {
        enabled: true,
        memory: { enabled: true, client: fake },
      },
    });
    const turns = new Map<string, MemoryTurn>();
    const gate = { releaseAlpha: () => {}, betaStarted: false };
    const alphaHold = new Promise<void>((resolve) => {
      gate.releaseAlpha = resolve;
    });
    const streamFor = (user: string, toolName: string) =>
      nl.stream({
        input: { text: `run ${toolName}` },
        provider: "openai",
        model: "gpt-4o-mini",
        context: { userId: user, sessionId: `session-${user}` },
        maxSteps: 3,
        timeout: 30_000,
        enabledToolNames: [toolName],
        disableInternalFallback: true,
        tools: {
          [toolName]: {
            description: `tool ${toolName}`,
            inputSchema: jsonSchema({ type: "object", properties: {} }),
            execute: async () => {
              if (toolName === "tool_alpha") {
                // Hold alpha's tool open until beta's tool has STARTED, so
                // beta's tool:start fires while alpha's stream is live.
                await alphaHold;
              } else {
                gate.betaStarted = true;
                gate.releaseAlpha();
              }
              return { ok: toolName };
            },
          },
        },
        memory: {
          shouldWrite: (turn) => {
            turns.set(turn.userId, turn);
            return true;
          },
        },
      });
    try {
      const [alpha, beta] = await Promise.all([
        streamFor("user-alpha", "tool_alpha"),
        streamFor("user-beta", "tool_beta"),
      ]);
      const drain = async (r: { stream: AsyncIterable<unknown> }) => {
        for await (const _chunk of r.stream) {
          // drain
        }
      };
      await Promise.all([drain(alpha), drain(beta)]);
      assert(
        gate.betaStarted,
        "precondition failed: the streams did not overlap",
      );
      assert(
        await waitFor(() => turns.size === 2),
        "both stream writes should reach shouldWrite",
      );
      assertEqual(
        JSON.stringify(turns.get("user-alpha")?.toolsUsed ?? []),
        JSON.stringify(["tool_alpha"]),
        "alpha's hook should see only alpha's tool",
      );
      assertEqual(
        JSON.stringify(turns.get("user-beta")?.toolsUsed ?? []),
        JSON.stringify(["tool_beta"]),
        "beta's hook should see only beta's tool",
      );
    } finally {
      await nl.shutdown();
      await toolServer.close();
    }
  });

  // -------------------------------------------------------------------------
  section("Item 10 — condensation prompt template validation");

  await test("an instance prompt missing {{NEW_CONTENT}} disables memory with a warning", async () => {
    const fake = new FakeHippocampus();
    logger.clearLogs();
    const nl = makeNeurolink(fake, { prompt: PROMPT_NO_NEW_CONTENT });
    assert(
      errors().some(
        (m) => m.includes("Memory disabled") && m.includes("{{NEW_CONTENT}}"),
      ),
      "construction should log at error that memory is disabled and name the missing placeholder",
    );
    assert(
      !warnings().some((m) => m.includes("Memory disabled")),
      "the disable notice must not be demoted to warn, which is hidden by default",
    );
    await nl.generate(generateArgs(undefined));
    await delay(BACKGROUND_SETTLE_MS);
    assertEqual(
      fake.adds.length,
      0,
      "memory must stay off for the instance's lifetime",
    );
  });

  await test("an instance prompt missing {{OLD_MEMORY}} disables memory with a warning", async () => {
    const fake = new FakeHippocampus();
    logger.clearLogs();
    const nl = makeNeurolink(fake, { prompt: PROMPT_NO_OLD_MEMORY });
    assert(
      errors().some(
        (m) => m.includes("Memory disabled") && m.includes("{{OLD_MEMORY}}"),
      ),
      "construction should log at error and name OLD_MEMORY",
    );
    await nl.generate(generateArgs(undefined));
    await delay(BACKGROUND_SETTLE_MS);
    assertEqual(fake.adds.length, 0, "memory must stay off");
  });

  await test("an instance prompt missing only {{MAX_WORDS}} warns but keeps memory on", async () => {
    const fake = new FakeHippocampus();
    logger.clearLogs();
    const nl = makeNeurolink(fake, { prompt: PROMPT_NO_MAX_WORDS });
    assert(
      warnings().some((m) => m.includes("{{MAX_WORDS}}")),
      "construction should warn about the missing MAX_WORDS",
    );
    assert(
      !errors().some((m) => m.includes("Memory disabled")),
      "a missing MAX_WORDS must not disable memory",
    );
    await nl.generate(generateArgs(undefined));
    assert(
      await waitFor(() => fake.adds.length >= 1),
      "memory should still write",
    );
  });

  await test("HC_CONDENSATION_PROMPT is validated when no instance prompt is set", async () => {
    const env = snapshotEnv();
    const fake = new FakeHippocampus();
    try {
      process.env.HC_CONDENSATION_PROMPT = PROMPT_NO_NEW_CONTENT;
      logger.clearLogs();
      const nl = makeNeurolink(fake);
      assert(
        errors().some(
          (m) =>
            m.includes("HC_CONDENSATION_PROMPT") &&
            m.includes("Memory disabled"),
        ),
        "construction should log at error about the env template and disable memory",
      );
      await nl.generate(generateArgs(undefined));
      await delay(BACKGROUND_SETTLE_MS);
      assertEqual(
        fake.adds.length,
        0,
        "memory must be off when the env template is fatal",
      );
    } finally {
      restoreEnv(env);
    }
  });

  await test("an instance prompt takes precedence over a broken HC_CONDENSATION_PROMPT", async () => {
    const env = snapshotEnv();
    const fake = new FakeHippocampus();
    try {
      process.env.HC_CONDENSATION_PROMPT = PROMPT_NO_NEW_CONTENT;
      logger.clearLogs();
      const nl = makeNeurolink(fake, { prompt: VALID_PROMPT });
      assert(
        !errors().some((m) => m.includes("Memory disabled")),
        "a valid instance prompt must not be overridden by the env template",
      );
      await nl.generate(generateArgs(undefined));
      assert(await waitFor(() => fake.adds.length >= 1), "memory should write");
    } finally {
      restoreEnv(env);
    }
  });

  await test("strictPrompt: a fatal template makes the constructor throw", () => {
    const fake = new FakeHippocampus();
    let thrown: unknown;
    try {
      makeNeurolink(fake, {
        prompt: PROMPT_NO_NEW_CONTENT,
        strictPrompt: true,
      });
    } catch (error) {
      thrown = error;
    }
    assert(
      thrown instanceof Error,
      "constructor should throw with strictPrompt",
    );
    const message = thrown instanceof Error ? thrown.message : "";
    assert(
      message.includes("conversationMemory.memory.prompt") &&
        message.includes("{{NEW_CONTENT}}"),
      "the error should name the config field and the missing placeholder",
    );
  });

  await test("strictPrompt: a valid template does not throw", () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake, {
      prompt: VALID_PROMPT,
      strictPrompt: true,
    });
    assert(nl !== undefined, "construction should succeed");
  });

  await test("a per-call prompt missing {{NEW_CONTENT}} warns and falls back to the instance prompt for that owner", async () => {
    const fake = new FakeHippocampus();
    const nl = makeNeurolink(fake, { prompt: VALID_PROMPT });
    logger.clearLogs();
    await nl.generate(
      generateArgs({
        prompt: PROMPT_NO_NEW_CONTENT,
        maxWords: 9,
        additionalUsers: [{ userId: "org-acme", prompt: PROMPT_NO_OLD_MEMORY }],
      }),
    );
    assert(
      await waitFor(() => fake.adds.length >= 2),
      "both owners should still be written",
    );
    const primary = fake.adds.find((a) => a.ownerId === "user-alice");
    const org = fake.adds.find((a) => a.ownerId === "org-acme");
    assertEqual(
      primary?.options?.prompt,
      undefined,
      "the invalid per-call prompt must be dropped",
    );
    assertEqual(
      primary?.options?.maxWords,
      9,
      "maxWords should survive the prompt fallback",
    );
    assertEqual(
      org?.options,
      undefined,
      "the invalid per-owner prompt must be dropped",
    );
    const perOwnerWarnings = warnings().filter((m) =>
      m.includes("Per-owner memory condensation prompt is missing"),
    );
    assertEqual(
      perOwnerWarnings.length,
      2,
      "one warning per distinct invalid template",
    );
  });

  // -------------------------------------------------------------------------
  section("Item 9 — condenser instance and credentials");

  await test("a host-supplied neurolink.instance reaches the client's config untouched and condenses every write", async () => {
    const calls: string[] = [];
    const hostInstance: HippocampusNeurolinkLike = {
      generate: async (options) => {
        calls.push(options.input.text);
        return { content: "HOST_CONDENSED" };
      },
    };
    const captured = captureFake();
    const nl = makeNeurolink(captured.factory, {
      neurolink: {
        provider: "openai",
        model: "gpt-4o-mini",
        instance: hostInstance,
      },
    });
    await nl.generate(generateArgs(undefined));
    const fake = captured.get();
    assert(
      fake.config.neurolink?.instance === hostInstance,
      "the host instance must be passed through the config as-is",
    );
    assert(
      await waitFor(() => fake.adds.length >= 1),
      "the write should happen",
    );
    assert(
      await waitFor(() => calls.length >= 1),
      "condensation should have run through the host instance",
    );
    assert(
      calls[0].includes("CONDENSE_MARKER"),
      "the condensation request should carry the turn",
    );
    assertEqual(
      await fake.get("user-alice"),
      "HOST_CONDENSED",
      "the condensed text should be what the host instance returned",
    );
  });

  await test("the client factory receives only the HippocampusConfig part — NeuroLink-side fields never reach Hippocampus", async () => {
    const captured = captureFake();
    const nl = makeNeurolink(captured.factory, {
      prompt: "{{OLD_MEMORY}} {{NEW_CONTENT}} {{MAX_WORDS}}",
      maxWords: 33,
      strictPrompt: true,
      shouldWrite: () => true,
      onBeforeStore: (content) => content,
    });
    await nl.generate(generateArgs(undefined));
    const config = captured.get().config as Record<string, unknown>;
    assertEqual(config.maxWords, 33, "Hippocampus fields are forwarded");
    assert(
      typeof config.prompt === "string",
      "the condensation prompt is forwarded",
    );
    for (const key of [
      "enabled",
      "client",
      "strictPrompt",
      "shouldWrite",
      "onBeforeStore",
    ]) {
      assert(
        !(key in config),
        `NeuroLink-only field must be stripped before construction: ${key}`,
      );
    }
    assert(
      typeof config.neurolink === "object" &&
        config.neurolink !== null &&
        typeof (config.neurolink as { instance?: unknown }).instance ===
          "object",
      "NeuroLink supplies a condenser instance when the host gave none",
    );
  });

  await test("without a host instance, NeuroLink supplies a child condenser that carries the instance credentials", async () => {
    const env = snapshotEnv();
    // The whole point: no provider key anywhere in the environment.
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    await server.close();
    server = await startMockChatServer();
    const captured = captureFake();
    try {
      const nl = makeNeurolink(captured.factory, {
        neurolink: { provider: "openai", model: "gpt-4o-mini" },
      });
      const result = await nl.generate(generateArgs(undefined));
      const fake = captured.get();
      assert(
        (result.content ?? "").includes("mock reply"),
        "the main call should have reached the local server via instance credentials",
      );
      assert(
        fake.config.neurolink?.instance !== undefined,
        "a condenser instance must have been supplied in the config",
      );
      assert(
        await waitFor(() => fake.adds.length >= 1),
        "the write should happen",
      );
      assert(
        await waitFor(() => server.getAllRequestBodies().length >= 2),
        "the condensation call should have reached the local server as a second request",
      );
      const condensation = server
        .getAllRequestBodies()
        .find((body) => body.includes("CONDENSE_MARKER"));
      assert(
        (condensation ?? "").includes('"gpt-4o-mini"'),
        "the second request should be the condensation prompt, using the configured neurolink.model",
      );
      // The request reaching the server only says the condensation has
      // started; the text is stored once its response has been handled.
      assert(
        await waitFor(async () => (await fake.get("user-alice")) !== null),
        "the condensed text should have been stored",
      );
      assertEqual(
        await fake.get("user-alice"),
        "mock reply",
        "the condensed text should be the local server's reply",
      );
    } finally {
      restoreEnv(env);
    }
  });

  await test("explicit neurolink.credentials win over the instance credentials for the condenser", async () => {
    const env = snapshotEnv();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    const condenserServer = await startMockChatServer();
    await server.close();
    server = await startMockChatServer();
    const captured = captureFake();
    try {
      const nl = makeNeurolink(captured.factory, {
        neurolink: {
          provider: "openai",
          model: "gpt-4o-mini",
          credentials: mockOpenAICredentials(condenserServer),
        },
      });
      await nl.generate(generateArgs(undefined));
      const fake = captured.get();
      assert(
        await waitFor(() => fake.adds.length >= 1),
        "the write should happen",
      );
      assert(
        await waitFor(() => condenserServer.getAllRequestBodies().length >= 1),
        "the condensation call should have reached the condenser's own server",
      );
      assert(
        condenserServer
          .getAllRequestBodies()
          .some((b) => b.includes("CONDENSE_MARKER")),
        "the condenser server should have received the condensation prompt",
      );
      assertEqual(
        server
          .getAllRequestBodies()
          .filter((b) => b.includes("CONDENSE_MARKER")).length,
        0,
        "the main server must not receive the condensation call",
      );
    } finally {
      await condenserServer.close();
      restoreEnv(env);
    }
  });

  // -------------------------------------------------------------------------
  section("Item 11 — blank prompts, the client seam, the log sink, lifecycle");

  await test("prompt: '' counts as unset — validated by nobody, memory stays on", async () => {
    const env = snapshotEnv();
    const fake = new FakeHippocampus();
    try {
      delete process.env.HC_CONDENSATION_PROMPT;
      logger.clearLogs();
      const nl = makeNeurolink(fake, { prompt: "" });
      assert(
        !errors().some((m) => m.includes("Memory disabled")) &&
          !warnings().some((m) => m.includes("condensation prompt")),
        "an empty instance prompt must neither disable memory nor be validated",
      );
      await nl.generate(generateArgs({ prompt: "   " }));
      assert(
        await waitFor(() => fake.adds.length >= 1),
        "memory must still write with an empty instance prompt",
      );
      assertEqual(
        fake.adds[0]?.options?.prompt,
        undefined,
        "a whitespace-only per-call prompt must reach add() as unset",
      );
      assert(
        !warnings().some((m) => m.includes("Per-owner")),
        "a whitespace-only per-call prompt must not be warned about",
      );
    } finally {
      restoreEnv(env);
    }
  });

  await test("prompt: '   ' never reaches Hippocampus: stripped from its config and from every add() options", async () => {
    // Hippocampus resolves `config.prompt || …` and `options.prompt || …`,
    // so `""` falls through on its own but `"   "` is truthy and would be
    // used literally — a template with no placeholders. NeuroLink already
    // treats it as unset; what it hands over has to agree.
    const env = snapshotEnv();
    const captured = captureFake();
    try {
      delete process.env.HC_CONDENSATION_PROMPT;
      logger.clearLogs();
      const nl = makeNeurolink(captured.factory, {
        prompt: "   ",
        maxWords: 40,
      });
      await nl.generate(
        generateArgs({
          prompt: "   ",
          maxWords: 25,
          additionalUsers: [
            { userId: "org-blank", prompt: " \n\t ", maxWords: 30 },
          ],
        }),
      );
      const fake = captured.get();
      assert(
        await waitFor(() => fake.adds.length >= 2),
        "memory must write with blank prompts at every level",
      );
      assert(
        !("prompt" in fake.config),
        "a whitespace-only instance prompt must leave no prompt key in the client's constructor config",
      );
      assertEqual(
        fake.config.maxWords,
        40,
        "the rest of the instance config must still reach the client",
      );
      const primary = fake.adds.find((add) => add.ownerId === "user-alice");
      const additional = fake.adds.find((add) => add.ownerId === "org-blank");
      assert(
        primary?.options !== undefined && !("prompt" in primary.options),
        "a whitespace-only per-call prompt must leave no prompt key on the primary add()",
      );
      assert(
        additional?.options !== undefined && !("prompt" in additional.options),
        "a whitespace-only additional-user prompt must leave no prompt key on that add()",
      );
      assertEqual(
        primary?.options?.maxWords,
        25,
        "the per-call maxWords must still reach the primary add()",
      );
      assertEqual(
        additional?.options?.maxWords,
        30,
        "the additional user's maxWords must still reach its add()",
      );
      assert(
        !warnings().some((m) => m.includes("condensation prompt")) &&
          !errors().some((m) => m.includes("Memory disabled")),
        "a whitespace-only prompt must be neither validated nor warned about",
      );
      // With nothing else to send either, add() gets no options object at all.
      await nl.generate(generateArgs({ prompt: "  " }));
      assert(
        await waitFor(() => fake.adds.length >= 3),
        "the second turn must write",
      );
      assertEqual(
        fake.adds[2]?.options,
        undefined,
        "with no prompt and no maxWords, add() must get no options object",
      );
    } finally {
      restoreEnv(env);
    }
  });

  await test("prompt: '' with a broken HC_CONDENSATION_PROMPT still validates the env template Hippocampus would use", async () => {
    const env = snapshotEnv();
    const fake = new FakeHippocampus();
    try {
      process.env.HC_CONDENSATION_PROMPT = PROMPT_NO_NEW_CONTENT;
      logger.clearLogs();
      makeNeurolink(fake, { prompt: "" });
      assert(
        errors().some(
          (m) =>
            m.includes("HC_CONDENSATION_PROMPT") &&
            m.includes("Memory disabled"),
        ),
        "an empty prompt falls through to the env template, which must still be checked",
      );
      // And an empty env template is unset too: nothing to check, nothing off.
      process.env.HC_CONDENSATION_PROMPT = "  ";
      logger.clearLogs();
      const nl = makeNeurolink(fake);
      assert(
        !errors().some((m) => m.includes("Memory disabled")),
        "a blank env template must not disable memory",
      );
      await nl.generate(generateArgs(undefined));
      assert(
        await waitFor(() => fake.adds.length >= 1),
        "memory must write with a blank env template",
      );
    } finally {
      restoreEnv(env);
    }
  });

  await test("a client with add() but no get() is refused: memory disabled with an error log, generation unaffected", async () => {
    let adds = 0;
    const writeOnly = {
      add: async () => {
        adds += 1;
        return "";
      },
    };
    logger.clearLogs();
    // A loosely typed host double: the seam is what is under test.
    const nl = makeNeurolink(() => writeOnly as unknown as FakeHippocampus, {});
    const result = await nl.generate(generateArgs(undefined));
    assert(
      (result.content ?? "").includes("mock reply"),
      "generation must proceed with memory refused",
    );
    assert(
      errors().some(
        (m) => m.includes("has no get()") && m.includes("disabling memory"),
      ),
      "the refusal must be logged at error and name the missing method",
    );
    await delay(BACKGROUND_SETTLE_MS);
    assertEqual(adds, 0, "a refused client must never be written to");
  });

  await test("building the condenser leaves the process-wide log sink exactly where it was", async () => {
    const captured = captureFake();
    const host = makeNeurolink(captured.factory, {
      neurolink: { provider: "openai", model: "gpt-4o-mini" },
    });
    // Last constructed wins the process-wide sink (base behaviour): this
    // instance owns the bridge that must keep receiving.
    const other = new NeuroLink();
    const PROBE = "[memory-suite] sink probe";
    let hostSeen = 0;
    let otherSeen = 0;
    const count =
      (bump: () => void) =>
      (raw: unknown): void => {
        const entry = raw as { message?: unknown };
        if (typeof entry.message === "string" && entry.message === PROBE) {
          bump();
        }
      };
    host.getEventEmitter().on(
      "log-event",
      count(() => (hostSeen += 1)),
    );
    other.getEventEmitter().on(
      "log-event",
      count(() => (otherSeen += 1)),
    );
    logger.error(PROBE);
    assert(
      otherSeen === 1 && hostSeen === 0,
      "precondition: the sink must be the last constructed instance's emitter",
    );

    await host.generate(generateArgs(undefined));
    assert(
      await waitFor(
        () =>
          captured.get().adds.length >= 1 &&
          server
            .getAllRequestBodies()
            .some((body) => body.includes("CONDENSE_MARKER")),
      ),
      "the condensation must have run through the lazily built child",
    );

    logger.error(PROBE);
    assert(
      otherSeen === 2 && hostSeen === 0,
      "after the child was built the sink must still be the other instance's emitter",
    );
  });

  await test("shutdown() stores the last turn: the deferred write is drained before the condenser is released", async () => {
    // A server of its own: the shared one also receives the condensation
    // requests of earlier cases whose instances were never shut down, and one
    // of those landing here would be counted as this case's.
    const own = await startMockChatServer();
    try {
      const captured = captureFake();
      const nl = makeNeurolink(
        captured.factory,
        { neurolink: { provider: "openai", model: "gpt-4o-mini" } },
        own,
      );
      await nl.generate(generateArgs(undefined));
      const fake = captured.get();
      // The write is queued on setImmediate and has not run when shutdown()
      // begins — the serverless / one-shot shape. Without this precondition a
      // stored turn would prove nothing about shutdown().
      assertEqual(
        fake.adds.length,
        0,
        "precondition: the write must still be deferred when shutdown() begins",
      );
      await nl.shutdown();
      // No settle delay: shutdown() itself must have waited for the write.
      assertEqual(
        fake.adds.length,
        1,
        "shutdown() must store the last turn before releasing the condenser",
      );
      const condensations = () =>
        own
          .getAllRequestBodies()
          .filter((body) => body.includes("CONDENSE_MARKER")).length;
      assertEqual(
        condensations(),
        1,
        "the condensation must have run through the child before it was released",
      );
      // Once released, the condenser handle Hippocampus holds must refuse,
      // not rebuild.
      let rejected = false;
      try {
        await fake.config.neurolink!.instance!.generate({
          input: { text: "CONDENSE_MARKER late" },
        });
      } catch {
        rejected = true;
      }
      assert(rejected, "a late condensation on a released host must reject");
      assertEqual(
        condensations(),
        1,
        "no condensation request may reach the server after the release",
      );
    } finally {
      await own.close();
    }
  });

  await test("a write scheduled after shutdown() resolved is skipped, and never rebuilds the condenser", async () => {
    const captured = captureFake();
    const nl = makeNeurolink(captured.factory, {
      neurolink: { provider: "openai", model: "gpt-4o-mini" },
    });
    await nl.generate(generateArgs(undefined));
    await nl.shutdown();
    const fake = captured.get();
    assertEqual(
      fake.adds.length,
      1,
      "precondition: shutdown() stored the turn that was pending",
    );
    const before = server.getAllRequestBodies().length;
    // shutdown() wiped the instance credentials; per-call ones keep the
    // generation itself working, so only the memory write is under test.
    const result = await nl.generate({
      ...generateArgs(undefined),
      credentials: mockOpenAICredentials(server),
    });
    assert(
      (result.content ?? "").includes("mock reply"),
      "precondition: a turn after shutdown() must still generate",
    );
    await delay(BACKGROUND_SETTLE_MS);
    assertEqual(
      fake.adds.length,
      1,
      "a write scheduled after shutdown() resolved must be skipped",
    );
    assertEqual(
      server
        .getAllRequestBodies()
        .slice(before)
        .filter((body) => body.includes("CONDENSE_MARKER")).length,
      0,
      "no condensation request may reach the server after shutdown",
    );
  });

  await test("dispose() stores the last turn too, in the same order", async () => {
    const captured = captureFake();
    const nl = makeNeurolink(captured.factory, {
      neurolink: { provider: "openai", model: "gpt-4o-mini" },
    });
    const before = server.getAllRequestBodies().length;
    await nl.generate(generateArgs(undefined));
    const fake = captured.get();
    assertEqual(
      fake.adds.length,
      0,
      "precondition: the write must still be deferred when dispose() begins",
    );
    await nl.dispose();
    assertEqual(
      fake.adds.length,
      1,
      "dispose() must store the last turn before releasing the condenser",
    );
    assertEqual(
      server
        .getAllRequestBodies()
        .slice(before)
        .filter((body) => body.includes("CONDENSE_MARKER")).length,
      1,
      "the condensation must have run through the child before dispose() released it",
    );
  });

  // Last in the suite on purpose: it initialises the process-wide
  // OpenTelemetry provider, which shutdown() then tears down again.
  await test("shutdown() exports the turn's spans while a stuck memory write drains, and still stores the write", async () => {
    // A Langfuse-shaped collector: records when each trace export arrives.
    const exportsAt: number[] = [];
    const collector: Server = createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        if (req.method === "POST" && (req.url ?? "").includes("/otel/")) {
          exportsAt.push(Date.now());
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end("{}");
      });
    });
    await new Promise<void>((resolve) =>
      collector.listen(0, "127.0.0.1", resolve),
    );
    const address = collector.address();
    const collectorPort =
      typeof address === "object" && address ? address.port : 0;
    // An hour between scheduled exports: only an explicit flush exports.
    const savedFlushInterval = process.env.LANGFUSE_FLUSH_INTERVAL;
    process.env.LANGFUSE_FLUSH_INTERVAL = "3600";

    let releaseWrite: () => void = () => {};
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    let stored = false;
    const stuck = new FakeHippocampus();
    stuck.add = async (ownerId, content, options) => {
      stuck.adds.push({ ownerId, content, options });
      await writeGate;
      stored = true;
      return content;
    };
    const nl = new NeuroLink({
      credentials: mockOpenAICredentials(server),
      conversationMemory: {
        enabled: true,
        memory: { enabled: true, client: stuck },
      },
      observability: {
        langfuse: {
          enabled: true,
          publicKey: "pk-lf-local",
          secretKey: "sk-lf-local",
          baseUrl: `http://127.0.0.1:${collectorPort}`,
        },
      },
    });
    try {
      // The constructor starts OpenTelemetry in the background, and a span
      // opened before it finishes is a no-op that nothing will ever export.
      // Wait for it, so the turn below is recorded however fast it runs.
      await nl.initializeLangfuseObservability();
      await nl.generate(generateArgs(undefined));
      assert(
        await waitFor(() => stuck.adds.length === 1),
        "precondition: the turn's memory write must have started",
      );
      assertEqual(
        exportsAt.length,
        0,
        "precondition: nothing may be exported before shutdown() flushes",
      );

      let shutdownSettled = false;
      const shutdown = nl.shutdown().finally(() => {
        shutdownSettled = true;
      });
      // The write is still held, so the drain is still waiting on it.
      assert(
        await waitFor(() => exportsAt.length > 0, 5_000),
        "the turn's spans must be exported while the memory write is still draining",
      );
      assert(
        !shutdownSettled && !stored,
        "precondition: shutdown() must still be waiting on the stuck write",
      );

      releaseWrite();
      await shutdown;
      assert(stored, "the memory write must still complete within the bound");
    } finally {
      releaseWrite();
      if (savedFlushInterval === undefined) {
        delete process.env.LANGFUSE_FLUSH_INTERVAL;
      } else {
        process.env.LANGFUSE_FLUSH_INTERVAL = savedFlushInterval;
      }
      await new Promise<void>((resolve) => {
        collector.closeAllConnections?.();
        collector.close(() => resolve());
      });
    }
  });

  await server.close();
});

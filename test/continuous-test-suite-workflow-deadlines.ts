#!/usr/bin/env tsx
import "./helpers/credentialFreeEnv.js";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { createServer as createNetServer, type AddressInfo } from "node:net";
import {
  AIProviderName,
  NeuroLink,
  createServer as createNeuroLinkServer,
  runWorkflow,
  type WorkflowConfig,
  type WorkflowResult,
} from "../dist/index.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { defineSuite } from "./helpers/harness.js";

assertDistFresh({ entrypoints: ["dist/index.js"] });

/**
 * Workflow model deadlines, driven through the shipped surface.
 *
 * Every case builds an ensemble workflow and runs it with the public
 * `runWorkflow()` or `NeuroLink.generate({ workflowConfig })`. The models are
 * `openai-compatible`, pointed (through the provider's own base-URL variable)
 * at a loopback HTTP server that answers each `/chat/completions` request
 * after a finite, per-model delay. That is a real socket under the real
 * provider client: the server can tell a request that completed from one the
 * client hung up on, which nothing observable from the workflow result alone
 * can. No production timer is shortened and nothing leaves the machine.
 *
 * What the cases pin:
 *  1. A model whose deadline lapses is failed AND its in-flight request is
 *     cancelled at the transport. `Promise.race` can only stop the caller
 *     waiting; the abort has to reach the provider call that owns the socket.
 *  2. A deadline longer than a timer can hold (above 2^31 - 1 ms) is honoured,
 *     not turned into an immediate failure. Node fires such a timer after 1 ms.
 *  3. Ordinary deadlines and the default (no deadline set) still let a slow
 *     answer through, so (1) is not just "everything fails fast".
 *  4. The shared `withTimeout` wrapper (reached from the public Fastify
 *     server's start-up and `/ready` check, whose deadline is the caller's
 *     `config.timeout`) never hands `setTimeout` a delay it would fire after
 *     1 ms. The workflow path only calls that wrapper with constants, so this
 *     case watches the delays the built server arms while it starts and
 *     answers one real request: the wrapper cannot be told apart by timing,
 *     because a 1 ms deadline still lets a fast `listen()` or `listTools()`
 *     win the race.
 *  5. Both deadline wrappers bound the delay with an explicit `>` comparison
 *     rather than `Math.min`. The comparison is false for NaN, so a value that
 *     is not above the limit reaches `setTimeout` untouched, while the limit
 *     itself stays put and anything above it, infinity included, is held at
 *     the limit. Each delay is attributed to its wrapper by call stack, so no
 *     other timer can satisfy or break the assertion. Which values can reach a
 *     wrapper depends on the surface: the server replaces NaN and 0 with its
 *     own defaults (`timeout || default`), and `runWorkflow()` rejects NaN, 0,
 *     negative and infinite model timeouts at validation. Each case pins what
 *     that surface does with every one of the six values.
 */
const { test, runSuite } = defineSuite("Workflow deadlines", {
  offline: true,
  perTestTimeoutMs: 60_000,
});

// The slow reply is far longer than any wait below. The endpoint drops its
// timer the moment the client hangs up, so a cancelled request costs nothing
// and the length only widens the margin on a loaded machine.
const SLOW_MS = 30_000;
const MEDIUM_MS = 700;
const FAST_MS = 40;
const TIMEOUT_BEYOND_TIMER_RANGE_MS = 3_000_000_000;

type SeenRequest = {
  model: string;
  /** The client closed the connection before the response was written. */
  aborted: boolean;
  /** The server wrote the whole response. */
  completed: boolean;
};

type DelayedEndpoint = {
  baseURL: string;
  seen: SeenRequest[];
  close: () => Promise<void>;
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function modelOf(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "model" in parsed) {
      const { model } = parsed;
      return typeof model === "string" ? model : "";
    }
  } catch {
    // An unparseable body is recorded under an empty model name.
  }
  return "";
}

function respond(res: ServerResponse, model: string): void {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      id: "chatcmpl-deadline",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: `answer from ${model}` },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 4, completion_tokens: 4, total_tokens: 8 },
    }),
  );
}

async function startDelayedEndpoint(
  delaysMs: Readonly<Record<string, number>>,
): Promise<DelayedEndpoint> {
  const seen: SeenRequest[] = [];
  const server: Server = createServer((req, res) => {
    if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "not found" } }));
      return;
    }
    void readBody(req).then((raw) => {
      const model = modelOf(raw);
      const entry: SeenRequest = { model, aborted: false, completed: false };
      seen.push(entry);
      const timer = setTimeout(() => {
        respond(res, model);
        entry.completed = true;
      }, delaysMs[model] ?? 0);
      res.on("close", () => {
        if (!res.writableFinished) {
          entry.aborted = true;
          clearTimeout(timer);
        }
      });
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const { port } = server.address() as AddressInfo;
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    seen,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

async function withEndpoint(
  delaysMs: Readonly<Record<string, number>>,
  run: (endpoint: DelayedEndpoint) => Promise<void>,
): Promise<void> {
  const endpoint = await startDelayedEndpoint(delaysMs);
  process.env.OPENAI_COMPATIBLE_BASE_URL = endpoint.baseURL;
  process.env.OPENAI_COMPATIBLE_API_KEY = "owned-workflow-deadline-fixture";
  try {
    await run(endpoint);
  } finally {
    delete process.env.OPENAI_COMPATIBLE_BASE_URL;
    delete process.env.OPENAI_COMPATIBLE_API_KEY;
    await endpoint.close();
  }
}

async function waitUntil(
  condition: () => boolean,
  budgetMs: number,
): Promise<boolean> {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    if (condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return condition();
}

function modelEntry(
  model: string,
  timeout?: number,
): WorkflowConfig["models"][number] {
  return {
    provider: AIProviderName.OPENAI_COMPATIBLE,
    model,
    ...(timeout === undefined ? {} : { timeout }),
  };
}

function ensemble(
  id: string,
  models: WorkflowConfig["models"],
  extra: Partial<WorkflowConfig> = {},
): WorkflowConfig {
  return {
    id,
    name: id,
    type: "ensemble",
    models,
    ...extra,
  };
}

type Outcome = {
  model: string;
  status: string;
  error: string;
  content: string;
  responseTime: number;
};

function outcomeOf(result: WorkflowResult, model: string): Outcome {
  const entry = result.ensembleResponses.find((r) => r.model === model);
  assert(entry !== undefined, `no ensemble response recorded for ${model}`);
  return {
    model,
    status: entry.status,
    error: typeof entry.error === "string" ? entry.error : "",
    content: entry.content,
    responseTime: entry.responseTime,
  };
}

function requestsFor(endpoint: DelayedEndpoint, model: string): SeenRequest[] {
  return endpoint.seen.filter((r) => r.model === model);
}

async function assertCancelledAtTransport(
  endpoint: DelayedEndpoint,
  model: string,
): Promise<void> {
  const requests = requestsFor(endpoint, model);
  // Precondition: the request really left the provider client. Without it
  // "never completed" would read as a pass for a call that never happened.
  assert.equal(requests.length, 1, `expected exactly one request for ${model}`);
  const cancelled = await waitUntil(() => requests[0].aborted, 10_000);
  assert(
    cancelled,
    `${model}: the in-flight request was not cancelled after its deadline lapsed`,
  );
  assert.equal(requests[0].completed, false, `${model}: request completed`);
}

const MAX_TIMER_MS = 2_147_483_647;

async function freePort(): Promise<number> {
  const probe = createNetServer();
  await new Promise<void>((resolve) =>
    probe.listen(0, "127.0.0.1", () => resolve()),
  );
  const { port } = probe.address() as AddressInfo;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}

/** Delays handed to the global `setTimeout` while `run` is in flight. */
async function timerDelaysDuring(run: () => Promise<void>): Promise<number[]> {
  const realSetTimeout = globalThis.setTimeout;
  const armed: number[] = [];
  globalThis.setTimeout = ((
    handler: () => void,
    delay?: number,
    ...args: unknown[]
  ) => {
    if (typeof delay === "number") {
      armed.push(delay);
    }
    return realSetTimeout(handler, delay, ...args);
  }) as unknown as typeof setTimeout;
  try {
    await run();
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
  return armed;
}

/**
 * Start the public Fastify server with `timeout`, hit `/ready`, and return the
 * long delays armed meanwhile. Fastify hands `config.timeout` to nothing but
 * the shared `withTimeout` wrapper (start-up and the readiness check), unlike
 * Hono, whose request-timeout middleware arms its own timer from it.
 */
async function serverTimerDelays(
  timeout: number,
): Promise<{ delays: number[]; answered: boolean }> {
  const port = await freePort();
  const adapter = await createNeuroLinkServer(new NeuroLink(), {
    framework: "fastify",
    config: { port, host: "127.0.0.1", timeout },
  });
  let answered = false;
  const delays = await timerDelaysDuring(async () => {
    try {
      await adapter.initialize();
      await adapter.start();
      const response = await fetch(`http://127.0.0.1:${port}/api/ready`);
      await response.text();
      answered = response.status === 200;
    } catch {
      // Reported through `answered`; the delays armed so far are still the evidence.
    }
  });
  try {
    await adapter.stop();
  } catch {
    // A server that never started has nothing to stop.
  }
  // Anything near the 32-bit limit came from the shared deadline wrapper; the
  // HTTP client's own timers are orders of magnitude shorter.
  return {
    delays: delays.filter((delay) => delay >= 1_000_000),
    answered,
  };
}

/**
 * Delays handed to `setTimeout` by the one wrapper whose frame matches
 * `owner`, while `run` is in flight. The call stack attributes each timer, so
 * values like 0 or -1 are not confused with the HTTP client's or the harness's
 * own timers. NaN, zero and negative delays are recorded as given.
 */
async function delaysArmedBy(
  owner: RegExp,
  run: () => Promise<void>,
): Promise<number[]> {
  const realSetTimeout = globalThis.setTimeout;
  const armed: number[] = [];
  globalThis.setTimeout = ((
    handler: () => void,
    delay?: number,
    ...args: unknown[]
  ) => {
    if (typeof delay === "number" && owner.test(new Error().stack ?? "")) {
      armed.push(delay);
    }
    return realSetTimeout(handler, delay, ...args);
  }) as unknown as typeof setTimeout;
  try {
    await run();
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
  return armed;
}

const WITH_TIMEOUT_FRAME = /at (?:async )?withTimeout \([^)]*errorHandling/;
const EXECUTE_WITH_TIMEOUT_FRAME =
  /at (?:async )?executeWithTimeout \([^)]*ensembleExecutor/;

/** Delays the shared `withTimeout` wrapper arms for the server's `config.timeout`. */
async function serverWithTimeoutDelays(timeout: number): Promise<number[]> {
  const port = await freePort();
  const adapter = await createNeuroLinkServer(new NeuroLink(), {
    framework: "fastify",
    config: { port, host: "127.0.0.1", timeout },
  });
  const delays = await delaysArmedBy(WITH_TIMEOUT_FRAME, async () => {
    try {
      await adapter.initialize();
      await adapter.start();
      const response = await fetch(`http://127.0.0.1:${port}/api/ready`);
      await response.text();
    } catch {
      // A deadline of 0 or less may fail start-up; the delays armed so far are the evidence.
    }
  });
  try {
    await adapter.stop();
  } catch {
    // A server that never started has nothing to stop.
  }
  return delays;
}

/**
 * [label, `config.timeout` asked for, delays `withTimeout` may be handed].
 * The server arms `config.timeout || default`, so NaN and 0 are replaced by
 * its own 30,000 ms start-up and 5,000 ms readiness defaults before the
 * wrapper sees them; everything else reaches the wrapper as given.
 */
const SERVER_DEADLINE_BOUNDS: ReadonlyArray<
  readonly [string, number, readonly number[]]
> = [
  ["NaN", Number.NaN, [30_000, 5_000]],
  ["zero", 0, [30_000, 5_000]],
  ["negative", -1, [-1]],
  ["the timer limit itself", MAX_TIMER_MS, [MAX_TIMER_MS]],
  ["one above the timer limit", MAX_TIMER_MS + 1, [MAX_TIMER_MS]],
  ["infinity", Number.POSITIVE_INFINITY, [MAX_TIMER_MS]],
];

/** Model `timeout` values the workflow validator rejects, so no timer is armed. */
const REJECTED_MODEL_TIMEOUTS: ReadonlyArray<readonly [string, number]> = [
  ["NaN", Number.NaN],
  ["zero", 0],
  ["negative", -1],
  ["infinity", Number.POSITIVE_INFINITY],
];

/** [label, model `timeout`, delay the executor must arm for it]. */
const ACCEPTED_MODEL_TIMEOUTS: ReadonlyArray<
  readonly [string, number, number]
> = [
  ["the timer limit itself", MAX_TIMER_MS, MAX_TIMER_MS],
  ["one above the timer limit", MAX_TIMER_MS + 1, MAX_TIMER_MS],
];

await runSuite(async () => {
  await test("public server: an over-range config.timeout is held at the timer limit", async () => {
    const { delays, answered } = await serverTimerDelays(
      TIMEOUT_BEYOND_TIMER_RANGE_MS,
    );
    // Precondition: the server really armed a deadline from the 3,000,000,000
    // ms setting; an empty list would pass the bound vacuously.
    assert(delays.length >= 1, "server armed no deadline timer");
    assert(
      delays.every((delay) => delay <= MAX_TIMER_MS),
      "a deadline beyond the 32-bit timer limit reached setTimeout",
    );
    assert.equal(
      Math.max(...delays),
      MAX_TIMER_MS,
      "the over-range deadline should be held at the timer limit",
    );
    assert(answered, "server should start and answer /ready");
  });

  await test("positive control: public server passes an ordinary config.timeout through unchanged", async () => {
    const { delays, answered } = await serverTimerDelays(1_500_000);
    assert(delays.length >= 1, "server armed no deadline timer");
    assert.equal(Math.max(...delays), 1_500_000);
    assert(answered, "server should start and answer /ready");
  });

  await test("runWorkflow: a lapsed model deadline fails the model and cancels its request", async () => {
    await withEndpoint(
      { "fast-model": FAST_MS, "slow-model": SLOW_MS },
      async (endpoint) => {
        const startedAt = Date.now();
        const result = await runWorkflow(
          ensemble("deadline-flat", [
            modelEntry("fast-model"),
            modelEntry("slow-model", 400),
          ]),
          { prompt: "say hello" },
        );
        const elapsed = Date.now() - startedAt;

        const fast = outcomeOf(result, "fast-model");
        const slow = outcomeOf(result, "slow-model");
        assert.equal(fast.status, "success", "fast model should succeed");
        assert.equal(slow.status, "failure", "slow model should be failed");
        assert(
          slow.error.includes("timed out after 400ms"),
          "slow model failure should name its 400ms deadline",
        );
        assert(
          elapsed < SLOW_MS / 2,
          "workflow should return at the deadline, not wait for the slow reply",
        );
        await assertCancelledAtTransport(endpoint, "slow-model");
        assert.equal(requestsFor(endpoint, "fast-model")[0].completed, true);
      },
    );
  });

  await test("NeuroLink.generate(workflowConfig): a lapsed model deadline cancels the request too", async () => {
    await withEndpoint(
      { "fast-model": FAST_MS, "slow-model": SLOW_MS },
      async (endpoint) => {
        const neurolink = new NeuroLink();
        const result = await neurolink.generate({
          input: { text: "say hello" },
          workflowConfig: ensemble("deadline-generate", [
            modelEntry("fast-model"),
            modelEntry("slow-model", 400),
          ]),
        });

        const responses = result.workflow?.ensembleResponses ?? [];
        const slow = responses.find((r) => r.model === "slow-model");
        const fast = responses.find((r) => r.model === "fast-model");
        assert.equal(fast?.status, "success", "fast model should succeed");
        assert.equal(slow?.status, "failure", "slow model should be failed");
        assert(
          typeof slow?.error === "string" &&
            slow.error.includes("timed out after 400ms"),
          "slow model failure should name its 400ms deadline",
        );
        await assertCancelledAtTransport(endpoint, "slow-model");
      },
    );
  });

  await test("runWorkflow: a sequential group's deadline cancels the stalled model and the next one still runs", async () => {
    await withEndpoint(
      { "fast-model": FAST_MS, "slow-model": SLOW_MS },
      async (endpoint) => {
        const result = await runWorkflow(
          ensemble(
            "deadline-sequential",
            [modelEntry("fast-model"), modelEntry("slow-model")],
            {
              modelGroups: [
                {
                  id: "tier",
                  models: [modelEntry("slow-model"), modelEntry("fast-model")],
                  executionStrategy: "sequential",
                  continueOnFailure: true,
                  minSuccessful: 1,
                  timeout: 400,
                },
              ],
            },
          ),
          { prompt: "say hello" },
        );

        const slow = outcomeOf(result, "slow-model");
        const fast = outcomeOf(result, "fast-model");
        assert.equal(slow.status, "failure", "stalled model should be failed");
        assert(
          slow.error.includes("timed out after 400ms"),
          "stalled model failure should name the group's 400ms deadline",
        );
        assert.equal(fast.status, "success", "next model should still run");
        await assertCancelledAtTransport(endpoint, "slow-model");
      },
    );
  });

  await test("runWorkflow: a per-model deadline beyond the timer range is honoured, not fired at once", async () => {
    await withEndpoint(
      { "fast-model": FAST_MS, "patient-model": MEDIUM_MS },
      async (endpoint) => {
        const result = await runWorkflow(
          ensemble("deadline-over-range", [
            modelEntry("fast-model"),
            modelEntry("patient-model", TIMEOUT_BEYOND_TIMER_RANGE_MS),
          ]),
          { prompt: "say hello" },
        );

        const patient = outcomeOf(result, "patient-model");
        assert.equal(
          patient.status,
          "success",
          "a 3,000,000,000 ms deadline should not fail a 700 ms reply",
        );
        assert.equal(patient.content, "answer from patient-model");
        assert(
          patient.responseTime >= MEDIUM_MS - 100,
          "the workflow should have waited for the delayed reply",
        );
        const requests = requestsFor(endpoint, "patient-model");
        assert.equal(requests.length, 1);
        assert.equal(requests[0].completed, true);
        assert.equal(requests[0].aborted, false);
      },
    );
  });

  await test("runWorkflow: an execution.modelTimeout beyond the timer range is honoured too", async () => {
    await withEndpoint(
      { "fast-model": FAST_MS, "patient-model": MEDIUM_MS },
      async (endpoint) => {
        const result = await runWorkflow(
          ensemble(
            "deadline-over-range-config",
            [modelEntry("fast-model"), modelEntry("patient-model")],
            { execution: { modelTimeout: TIMEOUT_BEYOND_TIMER_RANGE_MS } },
          ),
          { prompt: "say hello" },
        );

        const patient = outcomeOf(result, "patient-model");
        assert.equal(
          patient.status,
          "success",
          "an over-range modelTimeout should not fail a 700 ms reply",
        );
        assert.equal(requestsFor(endpoint, "patient-model")[0].aborted, false);
      },
    );
  });

  await test("positive control: an ordinary deadline and the default both let a slow reply through", async () => {
    await withEndpoint(
      { "fast-model": FAST_MS, "patient-model": MEDIUM_MS },
      async (endpoint) => {
        const withDeadline = await runWorkflow(
          ensemble("control-deadline", [
            modelEntry("fast-model"),
            modelEntry("patient-model", 5_000),
          ]),
          { prompt: "say hello" },
        );
        const withDefault = await runWorkflow(
          ensemble("control-default", [
            modelEntry("fast-model"),
            modelEntry("patient-model"),
          ]),
          { prompt: "say hello" },
        );

        for (const result of [withDeadline, withDefault]) {
          assert.equal(outcomeOf(result, "fast-model").status, "success");
          assert.equal(outcomeOf(result, "patient-model").status, "success");
        }
        const requests = requestsFor(endpoint, "patient-model");
        assert.equal(requests.length, 2, "one request per workflow run");
        assert(
          requests.every((r) => r.completed && !r.aborted),
          "no request should have been cancelled",
        );
      },
    );
  });

  await test("public server: NaN, zero, negative, boundary and infinite config.timeout reach setTimeout as the bound dictates", async () => {
    for (const [label, timeout, allowed] of SERVER_DEADLINE_BOUNDS) {
      const delays = await serverWithTimeoutDelays(timeout);
      // Precondition: the wrapper really armed a timer for this setting.
      assert(delays.length >= 1, `${label}: withTimeout armed no timer`);
      assert(
        delays.every((delay) => allowed.some((ok) => Object.is(delay, ok))),
        `${label}: a delay other than the expected one reached setTimeout`,
      );
    }
  });

  await test("runWorkflow: NaN, zero, negative and infinite model deadlines are rejected before any timer is armed", async () => {
    for (const [label, timeout] of REJECTED_MODEL_TIMEOUTS) {
      let rejection: unknown;
      const delays = await delaysArmedBy(
        EXECUTE_WITH_TIMEOUT_FRAME,
        async () => {
          try {
            await runWorkflow(
              ensemble(`deadline-rejected-${label}`, [
                modelEntry("first-model", timeout),
                modelEntry("second-model", timeout),
              ]),
              { prompt: "say hello" },
            );
          } catch (error) {
            rejection = error;
          }
        },
      );
      assert(
        rejection instanceof Error &&
          rejection.message.includes("Invalid workflow configuration"),
        `${label}: the workflow was not rejected as an invalid configuration`,
      );
      assert.equal(delays.length, 0, `${label}: a timer was armed anyway`);
    }
  });

  await test("runWorkflow: a model deadline at or above the timer limit is handed to setTimeout at the limit", async () => {
    await withEndpoint(
      { "first-model": FAST_MS, "second-model": FAST_MS },
      async () => {
        for (const [label, timeout, expected] of ACCEPTED_MODEL_TIMEOUTS) {
          const delays = await delaysArmedBy(
            EXECUTE_WITH_TIMEOUT_FRAME,
            async () => {
              const result = await runWorkflow(
                ensemble(`deadline-bound-${label}`, [
                  modelEntry("first-model", timeout),
                  modelEntry("second-model", timeout),
                ]),
                { prompt: "say hello" },
              );
              for (const model of ["first-model", "second-model"]) {
                assert.equal(outcomeOf(result, model).status, "success");
              }
            },
          );
          // Precondition: one timer per model carries the asked-for deadline.
          assert(
            delays.filter((delay) => Object.is(delay, expected)).length >= 2,
            `${label}: the executor did not arm the expected delay per model`,
          );
          assert(
            delays.every((delay) => delay <= MAX_TIMER_MS),
            `${label}: a delay above the timer limit reached setTimeout`,
          );
        }
      },
    );
  });
});

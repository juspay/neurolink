#!/usr/bin/env tsx
/**
 * toolRouting.timeoutMs must bound the decide call (issue 2196).
 *
 * End to end through dist: NeuroLink.generate() with a local typesafe-dialect
 * decide endpoint and a local chat stand-in that tells a router request (no
 * tools) from the main request (every registered tool). Pinned behaviour:
 *  - a decide answer slower than timeoutMs is never applied, one deadline spans
 *    every attempt, and the generative router is NOT run after the timeout, so
 *    generation still sees every tool;
 *  - with no decision provider the generative router still runs;
 *  - a fractional timeoutMs is a whole-millisecond bound, not a thrown error.
 */
import { createServer, type Server } from "node:http";
import { NeuroLink } from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Tool routing decide timeout", {
  offline: true,
});

// Mock traffic is loopback-only; keep it off any inherited HTTP proxy while
// preserving the host's own exemptions.
const loopback = ["127.0.0.1", "localhost"];
for (const name of ["NO_PROXY", "no_proxy"]) {
  const existing = (process.env[name] ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  process.env[name] = [
    ...existing,
    ...loopback.filter((host) => !existing.includes(host)),
  ].join(",");
}
// "No decision provider configured" must not be satisfied by the host's keys.
for (const name of [
  "TYPESAFE_API_KEY",
  "AI_GATEWAY_API_KEY",
  "LAYA_API_KEY",
  "XOR_API_KEY",
  "SUBQ_API_KEY",
  "PERPLEXITY_API_KEY",
  "CLOUDFLARE_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_API_BASE",
  "SCALEDOWN_API_KEY",
]) {
  delete process.env[name];
}

const SERVERS = ["alpha", "beta", "gamma"];
const TOOLS_PER_SERVER = 6;
const ALL_TOOLS = SERVERS.flatMap((id) =>
  Array.from({ length: TOOLS_PER_SERVER }, (_, i) => `${id}_tool${i}`),
);
const TIMEOUT_MS = 1500;

type DecideMock = {
  server: Server;
  baseURL: string;
  /** Arrival time of each decide request. */
  arrivals: number[];
};

const listen = async (server: Server): Promise<number> => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return typeof address === "object" && address !== null ? address.port : 0;
};

type DecideMode = "answer" | "reset" | "stall-body";

const startDecide = async (
  delayMs: number,
  mode: DecideMode = "answer",
): Promise<DecideMock> => {
  const arrivals: number[] = [];
  const server = createServer((request, response) => {
    arrivals.push(Date.now());
    request.resume();
    if (mode === "reset") {
      // A transport error: the provider retries after a backoff.
      request.socket.destroy();
      return;
    }
    if (mode === "stall-body") {
      // 200 headers, then a body that never completes.
      response.writeHead(200, { "content-type": "application/json" });
      response.write("{");
      return;
    }
    setTimeout(() => {
      if (response.destroyed) {
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          model: "jev-1.13.0",
          // A confident "no" for gamma: applying this answer drops its tools.
          answers: {
            server__0: { type: "noul", noul: 0.99 },
            server__1: { type: "noul", noul: 0.99 },
            server__2: { type: "noul", noul: 0.01 },
          },
          usage: { input_tokens: 10, output_tokens: 3 },
        }),
      );
    }, delayMs);
  });
  const port = await listen(server);
  return { server, baseURL: `http://127.0.0.1:${port}`, arrivals };
};

type ChatRequest = { at: number; tools: string[]; router: boolean };

/**
 * Chat stand-in. A request carrying tools is the main generation; one without
 * is the generative router, answered with a verdict that drops gamma, so a
 * router that wrongly runs is visible both as a request and as missing tools.
 */
const startChat = async (): Promise<{
  server: Server;
  baseURL: string;
  requests: ChatRequest[];
}> => {
  const requests: ChatRequest[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      let tools: string[] = [];
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          tools?: { function?: { name?: string } }[];
        };
        tools = (parsed.tools ?? []).flatMap((tool) =>
          tool.function?.name ? [tool.function.name] : [],
        );
      } catch {
        // A malformed body is recorded as a request with no tools.
      }
      const router = tools.length === 0;
      requests.push({ at: Date.now(), tools, router });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          id: "mock-completion",
          object: "chat.completion",
          created: 1,
          model: "gpt-4o-mini",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: router
                  ? JSON.stringify({ servers: ["alpha", "beta"] })
                  : "mock reply",
              },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    });
  });
  const port = await listen(server);
  return { server, baseURL: `http://127.0.0.1:${port}/v1`, requests };
};

const close = (server: Server): Promise<void> =>
  new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });

type RunResult = {
  ok: boolean;
  decideArrivals: number[];
  chat: ChatRequest[];
  /** Tools on the single main request; empty unless exactly one was made. */
  mainTools: string[];
  mainCount: number;
  hook: { startedAt?: number; finishedAt?: number };
  routerRequests: number;
  spanWaitedMs: number;
  decisionSpans: {
    status: string;
    statusMessage?: string;
    durationMs?: number;
  }[];
  /** Set when generate() rejected; only recorded for abortAfterMs runs. */
  rejection?: string;
  /** Wall time from generate() start to settling. */
  elapsedMs: number;
};

const run = async (options: {
  decideDelayMs: number | null;
  timeoutMs: number | undefined;
  decideMode?: DecideMode;
  onAnswersDelayMs?: number;
  extendDelayMs?: number;
  /** Replace decide() with a wrapper that never settles. */
  hangingDecide?: boolean;
  /** Abort the caller's signal this long after generate() starts. */
  abortAfterMs?: number;
}): Promise<RunResult> => {
  const hook: RunResult["hook"] = {};
  const chat = await startChat();
  const decide =
    options.decideDelayMs === null
      ? undefined
      : await startDecide(options.decideDelayMs, options.decideMode);
  try {
    const nl = new NeuroLink({
      ...(options.onAnswersDelayMs !== undefined ||
      options.extendDelayMs !== undefined
        ? {
            decisionHooks: {
              ...(options.extendDelayMs !== undefined
                ? {
                    extendQuestions: async () => {
                      await new Promise((resolve) =>
                        setTimeout(resolve, options.extendDelayMs),
                      );
                      return undefined;
                    },
                  }
                : {}),
              ...(options.onAnswersDelayMs !== undefined
                ? {
                    onAnswers: async () => {
                      hook.startedAt = Date.now();
                      await new Promise((resolve) =>
                        setTimeout(resolve, options.onAnswersDelayMs),
                      );
                      hook.finishedAt = Date.now();
                    },
                  }
                : {}),
              hookTimeoutMs: 10000,
            },
          }
        : {}),
      credentials: {
        openai: { apiKey: "sk-mock-local-server", baseURL: chat.baseURL },
        ...(decide
          ? {
              typesafe: {
                apiKey: "apikey_local_mock",
                baseURL: decide.baseURL,
                transport: "direct" as const,
              },
            }
          : {}),
      },
      toolRouting: {
        enabled: true,
        alwaysIncludeServerIds: [],
        embedding: { enabled: false },
        ...(options.timeoutMs !== undefined
          ? { timeoutMs: options.timeoutMs }
          : {}),
      },
    });
    const entries: Record<string, unknown> = {};
    for (const name of ALL_TOOLS) {
      entries[name] = {
        name,
        description: `${name} tool`,
        execute: async () => ({ ok: true }),
      };
    }
    (
      nl as unknown as { registerTools(e: Record<string, unknown>): void }
    ).registerTools(entries);
    nl.setToolRoutingServers(
      SERVERS.map((id) => ({ id, description: `${id} operations` })),
    );
    if (options.hangingDecide) {
      (nl as unknown as { decide: () => Promise<never> }).decide = () =>
        new Promise<never>(() => {});
    }
    // A routing wait that never ends must fail this case, not hang the suite.
    let pendingTimer: NodeJS.Timeout | undefined;
    const controller = new AbortController();
    const startedAt = Date.now();
    let rejection: string | undefined;
    const abortTimer =
      options.abortAfterMs !== undefined
        ? setTimeout(() => controller.abort(), options.abortAfterMs)
        : undefined;
    const generation = nl.generate({
      input: { text: "list my alpha and beta records" },
      provider: "openai",
      model: "gpt-4o-mini",
      ...(options.abortAfterMs !== undefined
        ? { abortSignal: controller.signal }
        : {}),
    });
    const result = await Promise.race([
      options.abortAfterMs !== undefined
        ? generation.catch((error: unknown) => {
            rejection = error instanceof Error ? error.message : String(error);
            return { content: "" };
          })
        : generation,
      new Promise<never>((_, reject) => {
        pendingTimer = setTimeout(
          () => reject(new Error("generate() still pending after the guard")),
          options.abortAfterMs !== undefined ? 8000 : 20000,
        );
      }),
    ]).finally(() => {
      clearTimeout(pendingTimer);
      clearTimeout(abortTimer);
    });
    const elapsedMs = Date.now() - startedAt;
    // Let a late retry after the deadline, if one exists, show itself.
    await new Promise((resolve) => setTimeout(resolve, 600));
    // A decision span is recorded only once the abandoned decision settles,
    // which on a loaded runner can be later than the pause above. Wait for it,
    // bounded, so a span that never ends still fails the test.
    const spanWaitStarted = Date.now();
    while (
      decide !== undefined &&
      decide.arrivals.length > 0 &&
      !nl.getSpans().some((span) => span.name.startsWith("decision.")) &&
      Date.now() - spanWaitStarted < DECISION_SPAN_WAIT_MS
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const spanWaitedMs = Date.now() - spanWaitStarted;
    const main = chat.requests.filter((r) => !r.router);
    return {
      ok: Boolean(result.content),
      rejection,
      elapsedMs,
      decideArrivals: [...(decide?.arrivals ?? [])],
      chat: chat.requests,
      mainTools: main.length === 1 ? [...main[0].tools] : [],
      mainCount: main.length,
      hook,
      routerRequests: chat.requests.filter((r) => r.router).length,
      spanWaitedMs,
      decisionSpans: nl
        .getSpans()
        .filter((span) => span.name.startsWith("decision."))
        .map((span) => ({
          status: String(span.status),
          statusMessage: span.statusMessage,
          durationMs: span.durationMs,
        })),
    };
  } finally {
    if (decide) {
      await close(decide.server);
    }
    await close(chat.server);
  }
};

const DECISION_SPAN_WAIT_MS = 5000;

const gammaSent = (tools: string[]): boolean =>
  tools.some((name) => name.startsWith("gamma_"));

const assertAllToolsSent = (r: RunResult): void => {
  if (r.mainCount !== 1) {
    throw new Error(`expected one main request, saw ${r.mainCount}`);
  }
  const missing = ALL_TOOLS.filter((name) => !r.mainTools.includes(name));
  if (missing.length > 0) {
    throw new Error(`main request lost ${missing.length} tool(s)`);
  }
};

/** The fast decide answer keeps every alpha and beta tool and drops gamma. */
const assertAlphaBetaOnly = (r: RunResult): void => {
  if (r.mainCount !== 1) {
    throw new Error(`expected one main request, saw ${r.mainCount}`);
  }
  const kept = ALL_TOOLS.filter((name) => !name.startsWith("gamma_"));
  const lost = kept.filter((name) => !r.mainTools.includes(name));
  if (lost.length > 0) {
    throw new Error(`main request lost ${lost.length} alpha or beta tool(s)`);
  }
  if (gammaSent(r.mainTools)) {
    throw new Error("a gamma tool was sent");
  }
};

const assertDecisionTimedOut = (r: RunResult): void => {
  if (r.decideArrivals.length === 0) {
    throw new Error("the decision request never reached the mock");
  }
  const recorded = r.decisionSpans.some((span) =>
    /abort|timeout|timed out/i.test(span.statusMessage ?? ""),
  );
  if (!recorded) {
    throw new Error(
      `no decision span records a timeout: ${JSON.stringify(r.decisionSpans)}`,
    );
  }
};

/** Decision phase: first decide request to the main generation request. */
const decisionPhaseMs = (r: RunResult): number => {
  const main = r.chat.find((request) => !request.router);
  if (!main || r.decideArrivals.length === 0) {
    throw new Error("no decision phase to measure");
  }
  return main.at - r.decideArrivals[0];
};

await test("control: a fast decide answer is applied and drops gamma", async () => {
  const r = await run({ decideDelayMs: 50, timeoutMs: TIMEOUT_MS });
  if (!r.ok) {
    throw new Error("generate() returned no content");
  }
  if (r.mainTools.length === 0) {
    throw new Error("no tools reached the provider");
  }
  assertAlphaBetaOnly(r);
  if (r.routerRequests !== 0) {
    throw new Error("the generative router ran although decide answered");
  }
});

await test("a decide answer slower than timeoutMs fails open at the bound with every tool and no router", async () => {
  const r = await run({ decideDelayMs: 4000, timeoutMs: TIMEOUT_MS });
  if (!r.ok) {
    throw new Error("generate() must still succeed");
  }
  assertDecisionTimedOut(r);
  const phase = decisionPhaseMs(r);
  if (phase < TIMEOUT_MS - 100 || phase > TIMEOUT_MS + 1000) {
    throw new Error(
      `decision phase ${phase}ms is not the ${TIMEOUT_MS}ms bound`,
    );
  }
  if (r.decideArrivals.length !== 1) {
    throw new Error(
      `expected one decide attempt inside the deadline, saw ${r.decideArrivals.length}`,
    );
  }
  if (r.routerRequests !== 0) {
    throw new Error("the generative router ran after a decision timeout");
  }
  assertAllToolsSent(r);
});

await test("a 40s decide endpoint does not run to the provider's own timeout", async () => {
  const r = await run({ decideDelayMs: 40000, timeoutMs: TIMEOUT_MS });
  if (!r.ok) {
    throw new Error("generate() must still succeed");
  }
  assertDecisionTimedOut(r);
  const phase = decisionPhaseMs(r);
  if (phase < TIMEOUT_MS - 100 || phase > TIMEOUT_MS + 1500) {
    throw new Error("decide did not stop at its bound");
  }
  if (
    !r.decisionSpans.some((span) =>
      /timeout|timed out/i.test(span.statusMessage ?? ""),
    )
  ) {
    throw new Error("the decision span does not name a timeout");
  }
  if (r.routerRequests !== 0) {
    throw new Error("the generative router ran after a decision timeout");
  }
  assertAllToolsSent(r);
});

await test("with no decision provider the generative router still runs", async () => {
  const r = await run({ decideDelayMs: null, timeoutMs: TIMEOUT_MS });
  if (!r.ok) {
    throw new Error("generate() must still succeed");
  }
  if (r.routerRequests !== 1) {
    throw new Error(`expected one router request, saw ${r.routerRequests}`);
  }
  assertAlphaBetaOnly(r);
});

await test("a fractional timeoutMs is a whole-millisecond bound, not an error", async () => {
  const r = await run({ decideDelayMs: 50, timeoutMs: 1500.5 });
  if (!r.ok) {
    throw new Error("generate() must still succeed");
  }
  if (r.decideArrivals.length === 0) {
    throw new Error("the decision request was never sent");
  }
  if (r.routerRequests !== 0) {
    throw new Error("a fractional timeout made routing fall back");
  }
  assertAlphaBetaOnly(r);
});

await test("a timeoutMs above the timer ceiling does not fire after 1 ms", async () => {
  const r = await run({ decideDelayMs: 50, timeoutMs: 2_147_483_648 });
  if (!r.ok) {
    throw new Error("generate() must still succeed");
  }
  assertAlphaBetaOnly(r);
  if (r.routerRequests !== 0) {
    throw new Error("routing fell back although decide answered");
  }
});

await test("a transport-error backoff ends at the routing deadline", async () => {
  const r = await run({
    decideDelayMs: 0,
    decideMode: "reset",
    timeoutMs: 100,
  });
  if (!r.ok) {
    throw new Error("generate() must still succeed");
  }
  // The span covers the provider call only. The first backoff is at least
  // 250 ms, so a wait that ignores the deadline cannot end near 100 ms.
  const spanMs = r.decisionSpans[0]?.durationMs;
  if (spanMs === undefined || spanMs < 80 || spanMs > 220) {
    throw new Error("decision span does not end at the 100ms deadline");
  }
  // The span must name the deadline that ended the wait, not the network
  // error that started it.
  const message = r.decisionSpans[0]?.statusMessage ?? "";
  if (!/timeout|timed out/i.test(message)) {
    throw new Error("the decision span does not name the deadline");
  }
  if (/fetch failed|econn|socket|other side closed/i.test(message)) {
    throw new Error("the span kept the earlier network error");
  }
  if (r.routerRequests !== 0) {
    throw new Error("the generative router ran after a decision timeout");
  }
  assertAllToolsSent(r);
});

await test("a decide body that stalls after 200 headers is recorded as a timeout", async () => {
  const r = await run({
    decideDelayMs: 0,
    decideMode: "stall-body",
    timeoutMs: 800,
  });
  if (!r.ok) {
    throw new Error("generate() must still succeed");
  }
  if (r.decisionSpans.length === 0) {
    throw new Error(
      `no decision span was recorded after waiting ${r.spanWaitedMs} ms`,
    );
  }
  if (
    !r.decisionSpans.some((span) =>
      /timeout|timed out/i.test(span.statusMessage ?? ""),
    )
  ) {
    throw new Error("the decision span does not name a timeout");
  }
  if (
    r.decisionSpans.some((span) =>
      /answers map/i.test(span.statusMessage ?? ""),
    )
  ) {
    throw new Error("the stalled body was reported as missing answers");
  }
  assertAllToolsSent(r);
});

// The test above failed intermittently in CI with no decision span at all: the
// call never settled. Cause: Node 22's fetch (undici 6) can lose the abort for
// a stalled body read when the request uses redirect "error" and the garbage
// collector runs mid-read. Forcing GC in a child process makes that certain
// instead of rare. On a runtime without the bug this passes either way.
await test("a stalled decide body still settles when the garbage collector runs mid-read", async () => {
  const distUrl = new URL("../dist/index.js", import.meta.url).href;
  const child = `
    import { createServer } from "node:http";
    setInterval(() => globalThis.gc(), 20).unref();
    const { NeuroLink } = await import(${JSON.stringify(distUrl)});
    const server = createServer((request, response) => {
      request.resume();
      response.writeHead(200, { "content-type": "application/json" });
      response.write("{");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const baseURL = "http://127.0.0.1:" + server.address().port;
    const outcomes = [];
    for (let i = 0; i < 4; i++) {
      const nl = new NeuroLink({
        credentials: { typesafe: { apiKey: "apikey_local_mock", baseURL, transport: "direct" } },
      });
      const call = nl
        .decide({
          provider: "typesafe",
          state: "s",
          questions: { q: { type: "boolean", question: "x?" } },
          timeoutMs: 400,
        })
        .then(() => "answered", (error) => (/timeout/i.test(String(error?.message)) ? "timeout" : "other"));
      outcomes.push(await Promise.race([call, new Promise((r) => setTimeout(() => r("hung"), 6000))]));
    }
    process.stdout.write("OUTCOMES " + JSON.stringify(outcomes) + "\\n");
    server.closeAllConnections();
    server.close();
    process.exit(0);
  `;
  const { execFile } = await import("node:child_process");
  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      process.execPath,
      ["--expose-gc", "--input-type=module", "-e", child],
      {
        timeout: 60_000,
        env: {
          ...process.env,
          NO_PROXY: "127.0.0.1,localhost",
          no_proxy: "127.0.0.1,localhost",
        },
      },
      (error, out) =>
        error ? reject(new Error("child process failed")) : resolve(out),
    );
  });
  const line = stdout.split("\n").find((l) => l.startsWith("OUTCOMES "));
  if (!line) {
    throw new Error("child process reported no outcomes");
  }
  const outcomes = JSON.parse(line.slice("OUTCOMES ".length)) as string[];
  const hung = outcomes.filter((o) => o === "hung").length;
  if (hung > 0) {
    throw new Error(`${hung} of ${outcomes.length} decide calls never settled`);
  }
  if (outcomes.some((o) => o !== "timeout")) {
    throw new Error("a stalled body was not reported as a timeout");
  }
});

await test("a slow onAnswers hook does not turn an on-time answer into a timeout", async () => {
  const r = await run({
    decideDelayMs: 50,
    timeoutMs: 400,
    onAnswersDelayMs: 900,
  });
  if (!r.ok) {
    throw new Error("generate() must still succeed");
  }
  assertAlphaBetaOnly(r);
  if (r.routerRequests !== 0) {
    throw new Error("routing fell back although decide answered");
  }
  const main = r.chat.find((request) => !request.router);
  const { startedAt, finishedAt } = r.hook;
  if (!main || startedAt === undefined || finishedAt === undefined) {
    throw new Error("the onAnswers hook did not run to completion");
  }
  if (finishedAt - r.decideArrivals[0] <= 400) {
    throw new Error("the hook did not outlast the decision deadline");
  }
  if (finishedAt > main.at) {
    throw new Error("the main request did not wait for the hook");
  }
});

await test("a slow extendQuestions hook does not spend the provider deadline", async () => {
  const r = await run({
    decideDelayMs: 50,
    timeoutMs: 400,
    extendDelayMs: 900,
  });
  if (!r.ok) {
    throw new Error("generate() must still succeed");
  }
  if (r.decideArrivals.length === 0) {
    throw new Error("the decision request was never sent");
  }
  assertAlphaBetaOnly(r);
  if (r.routerRequests !== 0) {
    throw new Error("routing fell back although decide answered");
  }
});

await test("a decide() override that never settles still ends at the deadline", async () => {
  const r = await run({
    decideDelayMs: 50,
    timeoutMs: 800,
    hangingDecide: true,
  });
  if (!r.ok) {
    throw new Error("generate() must still succeed");
  }
  assertAllToolsSent(r);
  if (r.elapsedMs > 6000) {
    throw new Error("the deadline did not release generation promptly");
  }
});

await test("caller cancellation ends a never-settling decide() promptly", async () => {
  const r = await run({
    decideDelayMs: 50,
    timeoutMs: 5000,
    hangingDecide: true,
    abortAfterMs: 300,
  });
  // 8s guard in run() throws if generate() hangs; the abort must land well
  // before the 5s decision deadline.
  if (r.elapsedMs > 3000) {
    throw new Error("cancellation waited for the decision deadline");
  }
  if (r.mainCount !== 0) {
    throw new Error("a cancelled turn must not reach the main request");
  }
  if (r.rejection === undefined) {
    throw new Error("a cancelled turn must reject with an abort error");
  }
});

for (const [label, unusable] of [
  ["0", 0],
  ["-5", -5],
  ["NaN", Number.NaN],
  ["Infinity", Number.POSITIVE_INFINITY],
] as const) {
  await test(`an unusable timeoutMs (${label}) is ignored like an unset one`, async () => {
    const r = await run({ decideDelayMs: 50, timeoutMs: unusable });
    if (!r.ok) {
      throw new Error("generate() must still succeed");
    }
    if (r.decideArrivals.length === 0) {
      throw new Error("the decision request was never sent");
    }
    if (r.routerRequests !== 0) {
      throw new Error("routing fell back although decide answered");
    }
    assertAlphaBetaOnly(r);
  });
}

await runSuite();

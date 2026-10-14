#!/usr/bin/env tsx
import "./helpers/credentialFreeEnv.js";

/**
 * Rule 15 determinism exception: Concurrent failures, captured endpoint/model changes, cache revisions, in-flight clear generations and the fixed reset boundary require deterministic barriers/clock and policy observations. Actual public status/generate/stream and native HTTP are real; only the declared ModelRouter routing decision is controlled.
 * All runtime modules stay on the same built DIST graph, including the public
 * SDK and the policy/router observations; no runtime SRC graph is mixed in.
 * This same shipped graph is checked again by ordinary installed consumers.
 * Permit lifecycle controls also pair real native HTTP with the built policy
 * functions to verify duplicate/clear identity and a deliberately not-run
 * permit; these identities are not exposed by a public health response.
 *
 * Real owned HTTP contracts for the built Ollama diagnostic paths. Missing-model
 * stream selection is a separate packet; these tests never replace its selector.
 * Only the disclosed ModelRouter decision seam selects retained SDK branches.
 */
import { createServer, type Server, type ServerResponse } from "node:http";
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { startDescriptorRuntimeFixtures } from "./helpers/descriptorRuntimeFixtures.js";

process.env.AWS_EC2_METADATA_DISABLED = "true";
process.env.NEUROLINK_SKIP_MCP = "true";
delete process.env.PROVIDER_FAILURE_THRESHOLD;
assertDistFresh({
  entrypoints: [
    "dist/index.js",
    "dist/utils/providerHealth.js",
    "dist/utils/ollamaDiagnostics.js",
  ],
});

const FIRST = "llama3.2:latest";
const SECOND = "llama3.1:8b";
const MISSING = "owned-missing-configured-model:latest";
type Mode =
  | "healthy"
  | "failure"
  | "empty"
  | "malformed"
  | "invalid-json"
  | "hang"
  | "close";
type Request = {
  runtime: string;
  caseName: string;
  method: string;
  path: string;
  authorization?: string;
  userAgent?: string;
  body?: Record<string, unknown>;
};
type Target = {
  url: string;
  mode: Mode;
  headStatus: number;
  models: unknown[];
  native: () => number;
  hold: () => void;
  release: () => void;
  waitFor: (required: number) => Promise<void>;
  close: () => Promise<void>;
};
const requests: Request[] = [];
const targets = new Set<Target>();
let caseName = "bootstrap";

/**
 * Start an owned HTTP target for native tags and real compatible inference.
 * Its controls expose request counts, response modes and deterministic barriers;
 * close releases held responses and closes connections before removing ownership.
 */
async function startTarget(runtime: string): Promise<Target> {
  const held: ServerResponse[] = [];
  const arrivals: Array<{ required: number; resolve: () => void }> = [];
  let holding = false;
  let hits = 0;
  const json = (
    res: ServerResponse,
    status: number,
    payload: unknown,
  ): void => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  };
  const answer = (res: ServerResponse): void => {
    if (res.destroyed || res.writableEnded) {
      return;
    }
    if (target.mode === "failure") {
      json(res, 500, { error: "owned native transport failure" });
    } else if (target.mode === "invalid-json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{");
    } else {
      json(res, 200, {
        models:
          target.mode === "empty"
            ? []
            : target.mode === "malformed"
              ? {}
              : target.models,
      });
    }
  };
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const path = new URL(req.url ?? "/", "http://owned.invalid").pathname;
      const body = chunks.length
        ? (JSON.parse(Buffer.concat(chunks).toString()) as Record<
            string,
            unknown
          >)
        : undefined;
      requests.push({
        runtime,
        caseName,
        method: req.method ?? "",
        path,
        authorization: req.headers.authorization,
        userAgent: req.headers["user-agent"],
        body,
      });
      if (path === "/api/tags") {
        hits++;
        for (const arrival of arrivals) {
          if (hits >= arrival.required) {
            arrival.resolve();
          }
        }
        if (target.mode === "close") {
          req.socket.destroy();
          return;
        }
        if (holding || target.mode === "hang") {
          held.push(res);
          return;
        }
        if (req.method === "HEAD") {
          res.writeHead(target.mode === "failure" ? 500 : target.headStatus);
          res.end();
          return;
        }
        answer(res);
        return;
      }
      if (path === "/v1/models") {
        json(res, 200, {
          object: "list",
          data: [{ id: FIRST }, { id: SECOND }],
        });
        return;
      }
      if (path !== "/v1/chat/completions" || req.method !== "POST") {
        json(res, 404, { error: "owned path absent" });
        return;
      }
      if (!body || (body.model !== FIRST && body.model !== SECOND)) {
        json(res, 404, {
          error: {
            message: "owned model not installed",
            type: "model_not_found",
          },
        });
        return;
      }
      const content = `owned-diagnostics-${caseName}`;
      if (!body.stream) {
        json(res, 200, {
          id: "owned-json",
          object: "chat.completion",
          created: 1,
          model: body.model,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });
        return;
      }
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      const event = (
        delta: Record<string, string>,
        finishReason: string | null,
      ): void => {
        res.write(
          `data: ${JSON.stringify({ id: "owned-sse", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finishReason }] })}\n\n`,
        );
      };
      const middle = Math.floor(content.length / 2);
      event({ role: "assistant", content: content.slice(0, middle) }, null);
      event({ content: content.slice(middle) }, null);
      event({}, "stop");
      res.end("data: [DONE]\n\n");
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("owned port absent");
  }
  const target: Target = {
    url: `http://127.0.0.1:${address.port}`,
    mode: "healthy",
    headStatus: 405,
    models: [{ name: FIRST }, { name: SECOND }],
    native: () => hits,
    hold: () => {
      holding = true;
    },
    release: () => {
      holding = false;
      for (const res of held.splice(0)) {
        answer(res);
      }
    },
    waitFor: async (required) => {
      if (hits >= required) {
        return;
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          new Promise<void>((resolve) => arrivals.push({ required, resolve })),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () =>
                reject(
                  new Error("owned barrier did not receive real requests"),
                ),
              4000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
    close: async () => {
      target.release();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
        server.closeAllConnections();
      });
      targets.delete(target);
    },
  };
  targets.add(target);
  return target;
}

/** Point both Ollama URL aliases and its configured model at the owned target. */
function pin(target: Target, model: string = FIRST): void {
  process.env.OLLAMA_BASE_URL = target.url;
  process.env.OLLAMA_API_BASE = target.url;
  process.env.OLLAMA_MODEL = model;
}

/** Attempt every owned target's cleanup and return all rejections for reporting. */
async function closeTargets(): Promise<unknown[]> {
  const settled = await Promise.allSettled(
    [...targets].map((target) => target.close()),
  );
  return settled.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : [],
  );
}

/** Preserve a single failure's identity or aggregate multiple case/cleanup errors. */
function rethrowFailures(failures: unknown[]): void {
  if (failures.length === 1) {
    throw failures[0];
  }
  if (failures.length > 1) {
    throw new AggregateError(
      failures,
      failures
        .map((failure) =>
          failure instanceof Error ? failure.message : String(failure),
        )
        .join("; "),
    );
  }
}

const { test: reportTest, runSuite } = defineSuite("Ollama Diagnostics", {
  offline: true,
});
await runSuite(async () => {
  const fixtures = await startDescriptorRuntimeFixtures();
  const suiteFailures: unknown[] = [];
  try {
    // Real built modules load only after metadata/local-runtime routes are owned.
    const { NeuroLink, AIProviderName } = await import("../dist/index.js");
    const { ProviderHealthChecker: Health } =
      await import("../dist/utils/providerHealth.js");
    const Policy = await import("../dist/utils/ollamaDiagnostics.js");
    const { ModelRouter } = await import("../dist/utils/modelRouter.js");
    type HealthOptions = NonNullable<
      Parameters<typeof Health.checkProviderHealth>[1]
    >;
    const health = (options: HealthOptions = {}) =>
      Health.checkProviderHealth(AIProviderName.OLLAMA, {
        cacheResults: false,
        includeConnectivityTest: false,
        ...options,
      });
    const snapshot = () =>
      Policy.getOllamaDiagnosticSnapshot(
        Policy.captureOllamaDiagnosticContext(),
      );
    const test = async (
      name: string,
      fn: () => Promise<void>,
    ): Promise<void> => {
      await reportTest(name, async () => {
        caseName = name;
        fixtures.setCaseLabel(name);
        fixtures.pinRuntimeEndpoints();
        Health.clearHealthCache();
        const failures: unknown[] = [];
        try {
          await fn();
        } catch (error) {
          failures.push(error);
        }
        failures.push(...(await closeTargets()));
        try {
          Health.clearHealthCache();
        } catch (error) {
          failures.push(error);
        }
        rethrowFailures(failures);
      });
    };
    const prime = async (target: Target): Promise<void> => {
      target.mode = "failure";
      for (let i = 0; i < 3; i++) {
        await health();
      }
      assertEqual(
        target.native(),
        3,
        "three genuine health failures prime default threshold",
      );
    };
    const inference = async (
      streaming: boolean,
      forced: boolean,
      routedModel: string = MISSING,
    ): Promise<void> => {
      const nonce = `owned-diagnostics-${caseName}`;
      const before = requests.length;
      const originalRoute = ModelRouter.route;
      let routed = 0;
      if (forced) {
        ModelRouter.route = () => {
          routed++;
          return {
            provider: "ollama",
            model: routedModel,
            confidence: 0.9,
            reasoning: "disclosed router decision seam",
          };
        };
      }
      const nl = new NeuroLink({
        conversationMemory: { enabled: false },
        enableOrchestration: forced,
      });
      const options = {
        input: { text: nonce },
        disableTools: true,
        disableInternalFallback: true,
        maxTokens: 64,
        ...(!forced ? { provider: "ollama", model: FIRST } : {}),
      };
      try {
        let content: string;
        if (streaming) {
          const result = await nl.stream(options);
          content = "";
          for await (const chunk of result.stream) {
            if (
              chunk &&
              "content" in chunk &&
              typeof chunk.content === "string"
            ) {
              content += chunk.content;
            }
          }
        } else {
          content = (await nl.generate(options)).content;
        }
        assertEqual(
          content,
          nonce,
          "genuine public response must contain exact fixture nonce",
        );
        const posts = requests
          .slice(before)
          .filter(
            (r) => r.method === "POST" && r.path === "/v1/chat/completions",
          );
        assertEqual(
          posts.length,
          1,
          "actual inference must issue one real POST",
        );
        const body = posts[0]?.body;
        assertEqual(
          body?.model,
          FIRST,
          "actual inference wire model must be FIRST",
        );
        assert(
          streaming
            ? body?.stream === true
            : body?.stream === undefined || body?.stream === false,
          "actual wire stream mode matches JSON/SSE operation",
        );
        const messages: unknown = body?.messages;
        assert(
          Array.isArray(messages),
          "actual inference wire messages must be an array",
        );
        const user = Array.isArray(messages)
          ? messages.find(
              (
                message: unknown,
              ): message is { role: string; content: unknown } =>
                message !== null &&
                typeof message === "object" &&
                "role" in message &&
                message.role === "user" &&
                "content" in message,
            )
          : undefined;
        assertEqual(
          user?.content,
          nonce,
          "actual inference user text must equal fixture nonce",
        );
        assertEqual(
          routed,
          forced ? 1 : 0,
          "only the declared router seam may select retained branches",
        );
      } finally {
        ModelRouter.route = originalRoute;
        await nl.shutdown();
      }
    };

    await test("healthy cache retains one real GET and a stable revision", async () => {
      const a = await startTarget("healthy-cache-A");
      pin(a);
      assert(
        (await health({ cacheResults: true })).isConfigured,
        "genuine healthy fixture",
      );
      const initial = snapshot();
      for (let i = 0; i < 3; i++) {
        assert(
          (await health({ cacheResults: true })).isConfigured,
          "cached healthy status",
        );
      }
      assertEqual(a.native(), 1, "cache hits issue no new GET");
      assertEqual(
        snapshot().revision,
        initial.revision,
        "cache reads record no outcome",
      );
    });
    await test("valid missing configured models never open transport backoff", async () => {
      const a = await startTarget("missing-model-A");
      pin(a, MISSING);
      for (let i = 0; i < 6; i++) {
        const result = await health();
        assert(
          !result.isConfigured,
          "configured missing model remains rejected",
        );
        assert(
          !result.configurationIssues.some((issue) =>
            issue.includes("Blacklisted"),
          ),
          "model absence is not transport failure",
        );
      }
      assertEqual(a.native(), 6, "six reachable model checks remain live");
      assertEqual(
        snapshot().count,
        0,
        "model mismatch does not increment transport state",
      );
    });
    await test("valid empty models are availability failures without transport backoff", async () => {
      const a = await startTarget("empty-models-A");
      pin(a);
      a.mode = "empty";
      for (let i = 0; i < 4; i++) {
        assert(!(await health()).isConfigured, "no configured model installed");
      }
      assertEqual(a.native(), 4, "empty but reachable list remains probeable");
      assertEqual(
        snapshot().count,
        0,
        "empty valid list is successful transport",
      );
    });
    await test("third real failure opens shared backoff; suppression retains revision", async () => {
      const a = await startTarget("threshold-A");
      pin(a);
      await prime(a);
      const initial = snapshot();
      for (let i = 0; i < 3; i++) {
        assert(!(await health()).isConfigured, "backed off service");
      }
      const fallback = await Health.checkFallbackProviderAvailability(
        "ollama",
        FIRST,
      );
      assert(!fallback.available, "fallback obeys shared gate");
      assertEqual(
        a.native(),
        3,
        "suppressed checks and fallback add no request",
      );
      assertEqual(
        snapshot().count,
        3,
        "suppression is not failure or recovery",
      );
      assertEqual(
        snapshot().revision,
        initial.revision,
        "suppression records no revision",
      );
    });
    await test("parallel real failures accumulate against latest completed state", async () => {
      const a = await startTarget("parallel-A");
      pin(a);
      a.mode = "failure";
      a.hold();
      const pending = Promise.all([health(), health(), health()]);
      try {
        await a.waitFor(3);
      } finally {
        a.release();
      }
      const results = await pending;
      assert(
        results.every((result) => !result.isConfigured),
        "three actual failure outcomes",
      );
      assertEqual(a.native(), 3, "real barrier admitted all three requests");
      await health();
      assertEqual(a.native(), 3, "fourth call must be suppressed");
    });
    await test("endpoint changes invalidate cached health and isolate failure state", async () => {
      const a = await startTarget("endpoint-A");
      const b = await startTarget("endpoint-B");
      pin(a);
      assert(
        (await health({ cacheResults: true })).isConfigured,
        "A healthy control",
      );
      pin(b);
      b.mode = "failure";
      assert(
        !(await health({ cacheResults: true })).isConfigured,
        "B must not reuse A",
      );
      assertEqual(b.native(), 1, "fresh endpoint receives actual GET");
      pin(a);
      assert(
        (await health({ cacheResults: true })).isConfigured,
        "A retains its own valid cache",
      );
      assertEqual(
        a.native(),
        1,
        "B failure does not invalidate healthy A cache",
      );
    });
    await test("configured model changes invalidate cached availability", async () => {
      const a = await startTarget("model-cache-A");
      pin(a);
      assert(
        (await health({ cacheResults: true })).isConfigured,
        "FIRST healthy control",
      );
      pin(a, MISSING);
      assert(
        !(await health({ cacheResults: true })).isConfigured,
        "missing model rejected",
      );
      assertEqual(
        a.native(),
        2,
        "new configured-model identity requires actual GET",
      );
      assertEqual(snapshot().count, 0, "missing model never poisons transport");
    });
    await test("late A failure cannot consume B transport budget", async () => {
      const a = await startTarget("late-A");
      const b = await startTarget("late-B");
      pin(a);
      a.mode = "failure";
      a.hold();
      const pending = health();
      try {
        await a.waitFor(1);
        pin(b);
        assert((await health()).isConfigured, "B reachable while A held");
        a.release();
        assert(!(await pending).isConfigured, "A actual failure");
        b.mode = "failure";
        await health();
        await health();
        b.mode = "healthy";
        assert(
          (await health()).isConfigured,
          "only two B failures; recovery must reach B",
        );
        assertEqual(b.native(), 4, "B healthy, two failures and real recovery");
      } finally {
        a.release();
      }
    });
    await test("clear discards a prior in-flight failure and its stale cache write", async () => {
      const a = await startTarget("clear-flight-A");
      pin(a);
      a.mode = "failure";
      a.hold();
      const pending = health({ cacheResults: true });
      try {
        await a.waitFor(1);
        Health.clearHealthCache(AIProviderName.OLLAMA);
        a.release();
        await pending;
        a.mode = "healthy";
        assert(
          (await health({ cacheResults: true })).isConfigured,
          "late failure must not publish a new-generation cache",
        );
        assertEqual(a.native(), 2, "post-clear fresh health reaches listener");
      } finally {
        a.release();
      }
    });
    await test("clear also discards a pending suppressed cache completion", async () => {
      const a = await startTarget("clear-suppressed-A");
      pin(a);
      await prime(a);
      a.mode = "healthy";
      const pending = health({ cacheResults: true });
      Health.clearHealthCache(AIProviderName.OLLAMA);
      await pending;
      assert(
        (await health({ cacheResults: true })).isConfigured,
        "old suppressed status must not survive clear",
      );
      assertEqual(a.native(), 4, "recovery performs one real post-clear GET");
    });
    await test("real transport changes invalidate a prior healthy cache", async () => {
      const a = await startTarget("cache-revision-A");
      pin(a);
      assert(
        (await health({ cacheResults: true })).isConfigured,
        "cached healthy control",
      );
      a.mode = "failure";
      await health();
      await health();
      assert(
        !(await health({ cacheResults: true })).isConfigured,
        "actual failures invalidate old healthy revision",
      );
      assertEqual(a.native(), 4, "healthy plus three actual failures");
    });
    await test("a reachable missing model resets transport failures", async () => {
      const a = await startTarget("reset-model-A");
      pin(a);
      a.mode = "failure";
      await health();
      await health();
      a.mode = "healthy";
      pin(a, MISSING);
      assert(
        !(await health()).isConfigured,
        "missing configured model still rejected",
      );
      assertEqual(
        snapshot().count,
        0,
        "reachable mismatch resets two transport failures",
      );
      a.mode = "failure";
      await health();
      await health();
      a.mode = "healthy";
      await health();
      assertEqual(a.native(), 6, "two later failures stay below threshold");
    });
    await test("aggregate health counts GET plus HEAD failure once per call", async () => {
      const a = await startTarget("aggregate-A");
      pin(a);
      a.mode = "failure";
      for (let i = 0; i < 3; i++) {
        await health({ includeConnectivityTest: true });
        assertEqual(
          a.native(),
          (i + 1) * 2,
          "both original probes remain live below threshold",
        );
        assertEqual(
          snapshot().count,
          i + 1,
          "one outcome for a combined health call",
        );
      }
      await health({ includeConnectivityTest: true });
      assertEqual(a.native(), 6, "fourth aggregate call is suppressed");
    });
    await test("HEAD falls back to GET only on 405 with original headers", async () => {
      const a = await startTarget("head-methods-A");
      pin(a);
      const before = requests.length;
      assert(
        (await health({ includeConnectivityTest: true })).isConfigured,
        "healthy GET/HEAD405/GET",
      );
      const actual = requests
        .slice(before)
        .filter((r) => r.path === "/api/tags");
      assertEqual(
        actual.map((r) => r.method).join(","),
        "GET,HEAD,GET",
        "original method sequence",
      );
      assert(
        actual.every((r) => r.authorization === undefined),
        "native authorization behavior unchanged",
      );
      assertEqual(
        actual[1]?.userAgent,
        "NeuroLink-HealthCheck/1.0",
        "connectivity User-Agent retained",
      );
      Health.clearHealthCache();
      a.headStatus = 200;
      const hits = a.native();
      await health({ includeConnectivityTest: true });
      assertEqual(a.native() - hits, 2, "successful HEAD has no extra GET");
    });
    for (const mode of ["malformed", "invalid-json"] as const) {
      await test(`native protocol ${mode} fails without fabricated availability`, async () => {
        const a = await startTarget(`protocol-${mode}`);
        pin(a);
        a.mode = mode;
        await primeProtocol();
        async function primeProtocol(): Promise<void> {
          for (let i = 0; i < 3; i++) {
            assert(!(await health()).isConfigured, "invalid native protocol");
          }
          assertEqual(a.native(), 3, "three genuine protocol responses");
          await health();
          assertEqual(a.native(), 3, "protocol backoff shares the native gate");
        }
      });
    }
    await test("bounded owned timeout and socket errors record logical failures", async () => {
      const a = await startTarget("transport-errors-A");
      pin(a);
      a.mode = "hang";
      assert(
        !(await health({ timeout: 80 })).isConfigured,
        "real abort reaches hanging owned endpoint",
      );
      assertEqual(snapshot().count, 1, "one logical timeout failure");
      a.release();
      Health.clearHealthCache();
      a.mode = "close";
      assert(
        !(await health({ timeout: 2000 })).isConfigured,
        "actual owned socket closure",
      );
      assert(
        a.native() >= 2,
        "actual incoming requests include both error fixtures",
      );
      assertEqual(
        snapshot().count,
        1,
        "wire retries never multiply a logical failure",
      );
    });
    for (const mode of ["failure", "malformed"] as const) {
      await test(`completion after fixed expiry resets old failures without an observer (${mode})`, async () => {
        const a = await startTarget(`completion-expiry-${mode}`);
        pin(a);
        const realNow = Date.now;
        let now = realNow();
        let pending: ReturnType<typeof health> | undefined;
        try {
          Date.now = () => now;
          a.mode = "failure";
          await health();
          await health();
          const before = snapshot();
          assertEqual(before.count, 2, "two real failures precede expiry");
          now += 299999;
          a.mode = mode;
          a.hold();
          pending = health();
          await a.waitFor(3);
          // No snapshot, admission or other observation applies expiry between
          // this clock advance and completion of the actual held native request.
          now += 2;
          a.release();
          await pending;
          pending = undefined;
          const after = snapshot();
          assertEqual(after.count, 1, "expired history must not renew backoff");
          assertEqual(
            after.generation,
            before.generation,
            "timed expiry retains the admitted permit",
          );
          assertEqual(
            after.revision,
            before.revision + 2,
            "expiry and this outcome each advance revision once",
          );
          assertEqual(
            after.lastFailureAt,
            now,
            "only the new failure starts the next window",
          );
          a.mode = "healthy";
          assert(
            (await health()).isConfigured,
            "next public probe is not suppressed by expired failures",
          );
          assertEqual(a.native(), 4, "recovery performs a real fourth request");
        } finally {
          a.release();
          try {
            await pending;
          } finally {
            Date.now = realNow;
          }
        }
      });
    }
    await test("expired permits record once and explicit clear discards a held outcome", async () => {
      const a = await startTarget("expiry-permit-lifecycle");
      pin(a);
      const realNow = Date.now;
      let now = realNow();
      let pending: Promise<Response> | undefined;
      try {
        Date.now = () => now;
        a.mode = "failure";
        await health();
        await health();
        const context = Policy.captureOllamaDiagnosticContext();
        const attempt = Policy.beginOllamaDiagnostic(context);
        if (attempt.kind !== "allowed") {
          throw new Error("two failures must still admit a native probe");
        }
        now += 300001;
        const response = await fetch(context.url);
        await response.arrayBuffer();
        assertEqual(response.status, 500, "real failed native outcome");
        const recorded = Policy.completeOllamaDiagnostic(
          attempt,
          "transport-failure",
        );
        assertEqual(
          recorded?.count,
          1,
          "expired permit records the new failure once",
        );
        assertEqual(
          Policy.completeOllamaDiagnostic(attempt, "transport-failure"),
          undefined,
          "duplicate completion is ignored",
        );
        assertEqual(snapshot().count, 1, "duplicate does not increment again");
        assertEqual(a.native(), 3, "duplicate creates no extra native request");

        const stale = Policy.beginOllamaDiagnostic(context);
        if (stale.kind !== "allowed") {
          throw new Error("one failure must still admit a native probe");
        }
        a.hold();
        pending = fetch(context.url);
        await a.waitFor(4);
        Policy.clearOllamaDiagnostics();
        a.release();
        const staleResponse = await pending;
        await staleResponse.arrayBuffer();
        pending = undefined;
        assertEqual(staleResponse.status, 500, "held request actually failed");
        assertEqual(
          Policy.completeOllamaDiagnostic(stale, "transport-failure"),
          undefined,
          "explicit clear invalidates the older permit",
        );
        const cleared = snapshot();
        assertEqual(
          cleared.count,
          0,
          "stale completion cannot repopulate failures",
        );
        assert(
          cleared.generation !== stale.generation,
          "clear advances generation",
        );
      } finally {
        a.release();
        try {
          await pending;
        } finally {
          Date.now = realNow;
        }
      }
    });
    await test("not-run completion expires old history without recording an outcome", async () => {
      const a = await startTarget("expiry-not-run");
      pin(a);
      const realNow = Date.now;
      let now = realNow();
      try {
        Date.now = () => now;
        a.mode = "failure";
        await health();
        await health();
        const before = snapshot();
        const attempt = Policy.beginOllamaDiagnostic(
          Policy.captureOllamaDiagnosticContext(),
        );
        if (attempt.kind !== "allowed") {
          throw new Error("two failures must still admit work");
        }
        now += 300001;
        const after = Policy.completeOllamaDiagnostic(attempt, "not-run");
        assertEqual(
          after?.count,
          0,
          "passive expiry clears only the old history",
        );
        assertEqual(
          after?.lastFailureAt,
          undefined,
          "not-run invents no new failure timestamp",
        );
        assertEqual(
          after?.generation,
          before.generation,
          "passive expiry does not clear permits",
        );
        assertEqual(
          after?.revision,
          before.revision + 1,
          "only expiry advances revision",
        );
        assertEqual(a.native(), 2, "a not-run permit issues no request");
      } finally {
        Date.now = realNow;
      }
    });
    await test("fixed reset boundary ignores caller cache TTL and invalidates blocked cache", async () => {
      const a = await startTarget("expiry-A");
      pin(a);
      const realNow = Date.now;
      let now = realNow();
      try {
        Date.now = () => now;
        await prime(a);
        a.mode = "healthy";
        await health({ cacheResults: true });
        now += 299999;
        await health({ cacheResults: false, maxCacheAge: 1 });
        assertEqual(
          a.native(),
          3,
          "short caller TTL cannot reset transport early",
        );
        now++;
        assert(
          (await health({ cacheResults: true })).isConfigured,
          "fixed reset permits real recovery",
        );
        assertEqual(
          a.native(),
          4,
          "boundary recovery reaches listener despite old blocked cache",
        );
      } finally {
        Date.now = realNow;
      }
    });
    await test("endpoint keys keep meaningful path/query and ignore fragments", async () => {
      const key = Policy.getOllamaDiagnosticEndpointKey;
      assert(
        key("http://owned.invalid/a/api/tags?q=1") !==
          key("http://owned.invalid/b/api/tags?q=1"),
        "actual paths differ",
      );
      assert(
        key("http://owned.invalid/a/api/tags?q=1") !==
          key("http://owned.invalid/a/api/tags?q=2"),
        "meaningful query differs",
      );
      assertEqual(
        key("http://owned.invalid/api/tags#one"),
        key("http://owned.invalid/api/tags#two"),
        "fragments are not HTTP identity",
      );
    });
    await test("invalid local native configuration issues no request and no failure", async () => {
      const a = await startTarget("invalid-config-A");
      pin(a);
      process.env.OLLAMA_BASE_URL = "not-a-url";
      for (let i = 0; i < 4; i++) {
        assert(
          !(await health()).isConfigured,
          "invalid URL is local configuration failure",
        );
      }
      assertEqual(
        a.native(),
        0,
        "invalid configuration emits no native request",
      );
      pin(a);
      assert(
        (await health()).isConfigured,
        "corrected actual endpoint stays available",
      );
      assertEqual(snapshot().count, 0, "no invented transport history");
    });
    for (const suffix of ["", "/v1", "/api"]) {
      await test(`public status preserves first installed model and two native GETs at ${suffix || "root"}`, async () => {
        const a = await startTarget("status-positive-A");
        pin(a, MISSING);
        process.env.OLLAMA_BASE_URL = `${a.url}${suffix}`;
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        try {
          const row = (await nl.getProviderStatus({ quiet: true })).find(
            (r) => r.provider === "ollama",
          );
          assertEqual(row?.status, "working", "actual public status positive");
          assertEqual(row?.model, FIRST, "retained first-installed selection");
          assert(
            a.native() >= 2,
            "configuration and status each reach native listener",
          );
          assert(
            requests
              .filter((r) => r.runtime === "status-positive-A")
              .every((r) => r.path === "/api/tags"),
            "original native path",
          );
        } finally {
          await nl.shutdown();
        }
      });
    }
    await test("public status and fallback obey primed native backoff", async () => {
      const a = await startTarget("status-backoff-A");
      pin(a);
      await prime(a);
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });
      try {
        const row = (await nl.getProviderStatus({ quiet: true })).find(
          (r) => r.provider === "ollama",
        );
        assertEqual(row?.status, "failed", "backed off public status");
        assertEqual(a.native(), 3, "status cannot bypass native backoff");
        assert(
          !(await Health.checkFallbackProviderAvailability("ollama", FIRST))
            .available,
          "fallback gate",
        );
        assertEqual(a.native(), 3, "fallback adds zero native requests");
      } finally {
        await nl.shutdown();
      }
    });
    await test("direct public status failures contribute to common backoff", async () => {
      const a = await startTarget("status-record-A");
      pin(a);
      a.mode = "failure";
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });
      try {
        await nl.getProviderStatus({ quiet: true });
        assertEqual(
          a.native(),
          2,
          "preflight and direct status each fail once",
        );
        await nl.getProviderStatus({ quiet: true });
        assertEqual(
          a.native(),
          3,
          "second preflight opens gate before direct status",
        );
        await nl.getProviderStatus({ quiet: true });
        assertEqual(a.native(), 3, "later status adds no request");
      } finally {
        await nl.shutdown();
      }
    });
    for (const streaming of [false, true]) {
      await test(`retained public ${streaming ? "SSE" : "JSON"} preserves FIRST and nonce with configured FIRST`, async () => {
        const a = await startTarget("retained-positive-A");
        pin(a);
        await inference(streaming, true);
        assert(
          a.native() >= 2,
          "genuine configuration and direct discovery positives",
        );
      });
      await test(`explicit public ${streaming ? "SSE" : "JSON"} still infers while diagnostics back off`, async () => {
        const a = await startTarget("explicit-positive-A");
        pin(a);
        await prime(a);
        a.mode = "healthy";
        await inference(streaming, false);
        assertEqual(
          a.native(),
          3,
          "explicit inference performs no suppressed diagnostic probe",
        );
        assertEqual(
          snapshot().count,
          3,
          "inference success does not pretend a diagnostic recovery",
        );
      });
    }
    await test("retained public generate still selects FIRST with configured model absent", async () => {
      const a = await startTarget("retained-missing-A");
      pin(a, MISSING);
      await inference(false, true);
      assert(
        a.native() >= 2,
        "missing-model health and direct discovery stay distinct",
      );
    });
    await test("other provider clearing leaves Ollama cache and policy unchanged", async () => {
      const a = await startTarget("clear-other-A");
      pin(a);
      await health({ cacheResults: true });
      const before = snapshot();
      Health.clearHealthCache(AIProviderName.OPENAI);
      await health({ cacheResults: true });
      assertEqual(
        a.native(),
        1,
        "non-Ollama clear retains the native cached result",
      );
      assertEqual(
        snapshot().revision,
        before.revision,
        "no unrelated policy outcome",
      );
    });
  } catch (error) {
    suiteFailures.push(error);
  } finally {
    suiteFailures.push(...(await closeTargets()));
    try {
      await fixtures.close();
    } catch (error) {
      suiteFailures.push(error);
    } finally {
      console.log("OLLAMA_DIAGNOSTIC_OWNED_REQUESTS", JSON.stringify(requests));
    }
    rethrowFailures(suiteFailures);
  }
});

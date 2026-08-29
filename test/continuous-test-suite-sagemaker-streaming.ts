#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Amazon SageMaker streaming (Plan 08, Task 6).
 *
 * SageMaker's `executeStream` used to throw "SageMaker streaming not yet
 * fully implemented" unconditionally, while `SageMakerLanguageModel.doStream`
 * sat one property access away, complete and working. These cases pin that
 * streaming now works through the shipped surface, and that the stub error is
 * gone for good.
 *
 * Everything drives `new NeuroLink().stream()` from `../dist/index.js`, with
 * no imports out of `src/` and nothing stubbed — so no rule-15 exception is
 * needed. The provider's real AWS SDK client is redirected at a local server
 * through the public `credentials.sagemaker.endpoint` option, which
 * `NeurolinkCredentials` exposes (types/providers.ts) and
 * `SageMakerRuntimeClient` passes to the AWS SDK's own `endpoint` override
 * (providers/sagemaker/client.ts).
 *
 * Run: npx tsx test/continuous-test-suite-sagemaker-streaming.ts
 *      pnpm run test:sagemaker-streaming
 */

import { createServer, type Server } from "node:http";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("SageMaker streaming");

const { NeuroLink } = await import("../dist/index.js");

type StandIn = {
  requests: number;
  port: number;
  close: () => Promise<void>;
};

/** Local stand-in for the SageMaker runtime endpoint. */
async function startStandIn(
  respond: (requestIndex: number) => { status: number; body: string },
): Promise<StandIn> {
  let requests = 0;
  const server: Server = createServer((req, res) => {
    const index = requests;
    requests++;
    req.resume();
    req.on("end", () => {
      const { status, body } = respond(index);
      res.writeHead(status, { "content-type": "application/json" });
      res.end(body);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    get requests() {
      return requests;
    },
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  } as StandIn;
}

function credentialsFor(port: number) {
  return {
    sagemaker: {
      accessKeyId: "test-fake-key-id",
      secretAccessKey: "test-fake-secret",
      region: "us-east-1",
      endpoint: `http://127.0.0.1:${port}`,
    },
  };
}

/**
 * Run with no AWS credentials in the environment.
 *
 * This is deliberate, and it is what the whole suite hinges on: passing
 * `credentials.sagemaker` is supposed to be sufficient on its own. An earlier
 * version of these cases inherited AWS keys from a developer's `.env`, passed
 * locally, and failed in CI where no such keys exist — the ambient values were
 * hiding the fact that construction validated the environment before it ever
 * looked at the credentials it had been handed. Clearing them here means a
 * regression shows up on the machine that caused it.
 */
const AWS_ENV_KEYS = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "SAGEMAKER_ENDPOINT",
] as const;

function withoutAwsEnv(): () => void {
  const saved = new Map<string, string | undefined>();
  for (const key of AWS_ENV_KEYS) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
  return () => {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

await test("a SageMaker stream yields the endpoint's text instead of a not-implemented error", async () => {
  const server = await startStandIn(() => ({
    status: 200,
    body: JSON.stringify([{ generated_text: "hello from sagemaker" }]),
  }));
  const restoreEnv = withoutAwsEnv();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "sagemaker",
      maxTokens: 32,
      credentials: credentialsFor(server.port),
    });
    let text = "";
    for await (const chunk of result.stream) {
      text += ("content" in chunk ? chunk.content : undefined) ?? "";
    }
    assert(
      !text.includes("not yet fully implemented"),
      "the stub error text still reaches the caller",
    );
    // Not merely non-empty: a provider emitting unrelated text would satisfy
    // that, and the point is that THIS endpoint's response reached the caller.
    assert(
      text.includes("hello from sagemaker"),
      "the stand-in's own text did not reach the caller",
    );
  } finally {
    restoreEnv();
    await server.close();
  }
});

await test("the not-implemented stub is gone from the streaming path", async () => {
  // Pinned separately from the happy path because the stub used to throw
  // before any request was made. Reaching the endpoint at all is the proof
  // that the throw is gone, independent of what the endpoint answers.
  const server = await startStandIn(() => ({
    status: 200,
    body: JSON.stringify([{ generated_text: "reached" }]),
  }));
  const restoreEnv = withoutAwsEnv();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "sagemaker",
      maxTokens: 32,
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
    assert(
      server.requests > 0,
      "no request reached the endpoint, so the turn never left the provider",
    );
  } finally {
    restoreEnv();
    await server.close();
  }
});

await test("analytics settles for a caller that never drains the stream", async () => {
  // The inherited default binds analytics to the turn rather than to the
  // stream iterator, so awaiting it without consuming the stream must not
  // hang. Pinned here too because SageMaker is the first provider to reach
  // that default in production.
  const server = await startStandIn(() => ({
    status: 200,
    body: JSON.stringify([{ generated_text: "ignored" }]),
  }));
  const restoreEnv = withoutAwsEnv();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "sagemaker",
      maxTokens: 32,
      credentials: credentialsFor(server.port),
    });
    // All three, not analytics alone: finishReason and usage are settled by
    // the same detached pump, and awaiting only one would leave the others
    // free to hang while this still passed.
    let timer: NodeJS.Timeout | undefined;
    const pending = Promise.all([
      Promise.resolve(result.analytics),
      Promise.resolve(result.metadata?.finishReason),
      Promise.resolve(result.usage),
    ]).then(() => "SETTLED");
    const settled = await Promise.race([
      pending,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve("TIMED_OUT"), 15_000);
      }),
    ]).finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    });
    assert(
      settled === "SETTLED",
      "analytics never settled without the stream being drained",
    );
    // Settling proves nothing on its own — it would also pass if analytics
    // resolved before the request was ever made. The pump has to have
    // actually reached the endpoint.
    assert(
      server.requests > 0,
      "analytics settled without the detached pump ever reaching the endpoint",
    );
  } finally {
    restoreEnv();
    await server.close();
  }
});

await test("an explicitly empty credential is rejected rather than falling back to ambient AWS keys", async () => {
  // Pins the end-to-end property: empty credentials must never result in a
  // request going out on the machine's ambient keys. It runs WITH ambient
  // keys set, since that is the only condition where the property has teeth.
  //
  // It does NOT discriminate the `||` -> `??` change in config.ts that ships
  // alongside it, and that was checked rather than assumed: mutating back to
  // `||` leaves this case green, because an earlier layer already rejects the
  // empty credential before the config default is ever consulted. The
  // operator change is defence in depth for the day that layer changes, not a
  // fix for a currently reachable hole. What this case guards is the property
  // itself, wherever it happens to be enforced.
  const server = await startStandIn(() => ({
    status: 200,
    body: JSON.stringify([{ generated_text: "should not be reached" }]),
  }));
  const restoreEnv = withoutAwsEnv();
  process.env.AWS_ACCESS_KEY_ID = "ambient-key-that-must-not-be-used";
  process.env.AWS_SECRET_ACCESS_KEY = "ambient-secret-that-must-not-be-used";
  try {
    const nl = new NeuroLink();
    let rejected = false;
    try {
      const result = await nl.stream({
        input: { text: "hi" },
        provider: "sagemaker",
        maxTokens: 32,
        credentials: {
          sagemaker: {
            accessKeyId: "",
            secretAccessKey: "",
            region: "us-east-1",
            endpoint: `http://127.0.0.1:${server.port}`,
          },
        },
      });
      for await (const chunk of result.stream) {
        void chunk;
      }
    } catch {
      rejected = true;
    }
    assert(
      rejected,
      "an explicitly empty credential was accepted instead of failing validation",
    );
    assert(
      server.requests === 0,
      "a request went out on ambient credentials despite the caller supplying empty ones",
    );
  } finally {
    restoreEnv();
    await server.close();
  }
});

await test("a call with no per-request credentials still uses the environment", async () => {
  // The cache check keys off whether any override field is set, not off
  // whether an object was passed — the provider always passes one, and it is
  // `{}` when the caller supplied nothing. Testing the object itself bypassed
  // the cache on every ordinary call and discarded file-loaded configuration
  // with it.
  //
  // Like the case above, this pins the behaviour rather than the fix: with
  // the cache bypassed the environment is simply re-read, so the config comes
  // out the same and only the file-loaded path and the wasted work differ.
  // Mutating the check back leaves this green.
  const server = await startStandIn(() => ({
    status: 200,
    body: JSON.stringify([{ generated_text: "from env credentials" }]),
  }));
  const restoreEnv = withoutAwsEnv();
  process.env.AWS_ACCESS_KEY_ID = "env-key";
  process.env.AWS_SECRET_ACCESS_KEY = "env-secret";
  process.env.SAGEMAKER_ENDPOINT = `http://127.0.0.1:${server.port}`;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "sagemaker",
      maxTokens: 32,
    });
    let text = "";
    for await (const chunk of result.stream) {
      text += ("content" in chunk ? chunk.content : undefined) ?? "";
    }
    assert(
      server.requests > 0,
      "no request reached the endpoint using environment credentials",
    );
    assert(text.length > 0, "the env-credential path produced no content");
  } finally {
    restoreEnv();
    await server.close();
  }
});

/**
 * A stand-in that accepts the request and never answers, so the only thing
 * that can end the call is the caller's abort.
 */
async function startSilentStandIn(): Promise<StandIn> {
  let requests = 0;
  const sockets = new Set<{ destroy: () => void }>();
  const server: Server = createServer((req) => {
    requests++;
    req.resume();
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    get requests() {
      return requests;
    },
    port: typeof address === "object" && address ? address.port : 0,
    close: async () => {
      for (const socket of sockets) {
        socket.destroy();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  } as StandIn;
}

await test("an aborted SageMaker turn ends promptly and still reads as an abort", async () => {
  // Two properties, and the suite needs both because fixing either alone still
  // leaves cancellation broken.
  //
  // Wiring the signal into the transport is what first lets client.send()
  // reject on abort. But SageMakerError's constructor overwrites `.name`, and
  // handleSageMakerError()'s generic fallback stamps `statusCode: 500` on
  // anything it does not recognise. The retry classifier duck-types that
  // status, reads 5xx as transient, and re-runs the turn twice more at the
  // 10s no-hint floor — each attempt rejecting instantly because the signal is
  // still aborted, without a request ever leaving the process.
  //
  // Measured before the fix: 21,996ms and `name` reading "Error". After: about
  // half a second and "AbortError". The bound below is deliberately far above
  // the observed figure and far below one retry cycle, so this fails on the
  // regression rather than on a slow machine.
  const server = await startSilentStandIn();
  const restoreEnv = withoutAwsEnv();
  // The MCP path resolves the provider differently and does not carry the
  // per-request credentials this suite relies on; skipping it keeps the case
  // about cancellation rather than about provider construction.
  const priorSkipMcp = process.env.NEUROLINK_SKIP_MCP;
  process.env.NEUROLINK_SKIP_MCP = "true";
  const controller = new AbortController();
  const startedAt = Date.now();
  let thrown: unknown;
  try {
    const nl = new NeuroLink();
    const timer = setTimeout(() => controller.abort(), 300);
    try {
      await nl.generate({
        input: { text: "hi" },
        provider: "sagemaker",
        maxTokens: 16,
        credentials: credentialsFor(server.port),
        abortSignal: controller.signal,
      });
    } catch (error) {
      thrown = error;
    } finally {
      clearTimeout(timer);
    }
    const elapsed = Date.now() - startedAt;

    // Precondition first: an assertion about the abort means nothing unless
    // the request actually went out and the signal actually fired.
    assert(
      server.requests > 0,
      "the endpoint was never reached, so the abort path was not exercised",
    );
    assert(
      controller.signal.aborted,
      "the signal never fired, so the turn ended for some other reason",
    );
    assert(thrown !== undefined, "the aborted turn ended without any error");

    // Shape only — never the payload. A message quoting provider-ish text is
    // reclassified as a skip by isExpectedProviderError() and would hide this.
    const name = thrown instanceof Error ? thrown.name : "";
    assert(
      name === "AbortError",
      "the cancellation lost its identity before reaching the caller",
    );
    assert(
      elapsed < 5_000,
      "the aborted turn was retried instead of ending, exceeding the bound",
    );
  } finally {
    if (priorSkipMcp === undefined) {
      delete process.env.NEUROLINK_SKIP_MCP;
    } else {
      process.env.NEUROLINK_SKIP_MCP = priorSkipMcp;
    }
    restoreEnv();
    await server.close();
  }
});

await runSuite();

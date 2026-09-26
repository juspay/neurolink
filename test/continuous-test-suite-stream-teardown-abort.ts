#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — abandoning a stream cancels the underlying HTTP
 * request (teardown → transport abort).
 *
 * ALL-DIST module graph (rule 15): every provider call below is driven
 * through `new NeuroLink().stream()`, imported from `../dist/index.js`, the
 * same shipped surface every caller uses. No `src/lib/` import appears in
 * this file.
 *
 * PR #1550 gave a consumer that breaks out of `for await` a way to close the
 * iterator chain (`attachStreamCancel`/`cancelStream`). That closes OUR side
 * of the pipe. It does not cancel the HTTP request underneath it: without an
 * abort signal that actually reaches the transport, the provider's read
 * stays pending and the connection stays open on the server. This suite
 * proves the server side of that gap directly — no credentials, no network
 * egress — using a local HTTP fixture that reports whether ITS OWN request
 * observed the client disconnecting.
 *
 * Provider choice matters a great deal here, and it took five attempts to
 * land on one that actually isolates `baseProvider.ts` rather than some
 * unrelated property of the provider or its transport.
 *
 * 1. `openai-compatible` and `anthropic` (direct) were ruled out first: both
 *    members of the OpenAI-compatible provider family carry their own
 *    independent "consumer-driven abort" wiring inside the provider file (a
 *    `consumerAbortController` tied to the async-iterator's `finally`/
 *    `cancel()`), so they self-protect against this exact defect regardless
 *    of what `baseProvider.ts` does — testing through either would pass even
 *    on the unfixed build and prove nothing about the shared layer.
 *
 * 2. Google AI Studio's native `@google/genai` streaming path looked right
 *    next — no self-protection, composes its transport signal from
 *    `options.abortSignal` alone — but turned out to have an independent,
 *    pre-existing bug of its own: `googleAiStudio/client.ts`'s
 *    `executeNativeGemini3Stream` places the composed signal at
 *    `httpOptions: { signal }`, a sibling of `config`, but the SDK's
 *    `generateContentStreamInternal` (see
 *    `node_modules/@google/genai/dist/node/index.cjs`) only ever reads
 *    `params.config.abortSignal` / `params.config.httpOptions`. The
 *    top-level field is silently ignored, so no signal reaches that
 *    transport regardless of what `baseProvider.ts` does — the opposite
 *    failure mode from the self-protecting providers, but equally useless as
 *    a witness: a test through that path would stay RED even after the real
 *    fix, for a reason that has nothing to do with it.
 *
 * 3. Google Vertex's native *Gemini* path (`executeNativeGemini3Stream` in
 *    `googleVertex/client.ts`) wires the signal correctly, but its `sendStep`
 *    collects the entire SDK stream into a buffer and replays it to the
 *    consumer only once the upstream call has already settled — the code's
 *    own comment says the chunks are "Collected, NOT forwarded to the
 *    consumer here". By the time the consumer sees a first chunk to break
 *    on, the underlying HTTP request has already finished; there is nothing
 *    left in flight to cancel. A cancellation defect cannot be observed on a
 *    request that is already over — the suite would pass or fail on
 *    replay-buffer timing, not on `baseProvider.ts`.
 *
 * 4. Amazon Bedrock's Converse-stream path looked promising — no
 *    self-protection, no collect-then-replay — but its transport
 *    (`NodeHttp2Handler`) defaults `disableConcurrentStreams: true`, which
 *    makes the SDK call `session.close()` the moment response headers
 *    arrive. That submits a GOAWAY with `lastStreamId: 0` within
 *    ~15-20ms of the request landing, which a local fixture reads as
 *    "abandon this stream" regardless of what the test consumer has done —
 *    a confound that fires whether or not the real defect is present, races
 *    unpredictably against the consumer's own `break`, and would make the
 *    suite flake on both the broken and the fixed build alike.
 *
 * 5. Google Vertex's *Claude* path (`executeNativeAnthropicStream`, a
 *    distinct code path in the same `googleVertex/client.ts`, taken when the
 *    model name contains "claude") finally isolates the defect cleanly.
 *    Confirmed by reading the file: it has no `attachStreamCancel`/
 *    `cancelStream` self-protection of its own, and it streams incrementally
 *    — `@anthropic-ai/vertex-sdk`'s `client.messages.stream()` fires its
 *    `text` listener per-delta as SSE events arrive, not after collecting the
 *    whole response (the code's own comment: "Awaiting `stream.finalMessage()`
 *    here would buffer the entire response before yielding anything; the
 *    listener pattern keeps the wire and the consumer in lockstep instead").
 *    The ONLY way that transport call is ever aborted is
 *    `internalAbort.signal`'s "abort" event, which only the caller's own
 *    `options.abortSignal` (or an irrelevant turn-clock watchdog) can fire —
 *    exactly the seam `baseProvider.ts` composes into on teardown. It runs
 *    over plain HTTP/1.1 SSE, so Bedrock's HTTP/2 confound does not apply.
 *    Reaching it needs no real GCP project or Anthropic key: Express Mode
 *    (`credentials.vertex.apiKey` + `credentials.vertex.baseURL`) redirects
 *    the `@anthropic-ai/vertex-sdk` client at a local fixture, the same
 *    mechanism `continuous-test-suite-vertex-claude-characterization.ts`
 *    already uses to reach this exact code path.
 *
 * Fixture shape: an SSE server speaking real Anthropic message-stream
 * framing (`event: <type>\ndata: {...}\n\n`, matching
 * `continuous-test-suite-vertex-claude-characterization.ts`'s helper and the
 * wire format `@anthropic-ai/vertex-sdk` actually parses). It writes
 * `message_start` and `content_block_start` once, then keeps emitting
 * `content_block_delta` events on a short interval so the connection is
 * still genuinely open — not already finished — at the moment the consumer
 * breaks. A hard chunk cap ends the response on its own (with a normal
 * `content_block_stop`/`message_delta`/`message_stop`/`res.end()`) if
 * cancellation never arrives, so a failing run cannot hang the server — and
 * the suite's own bounded poll (never an unbounded wait) is what actually
 * fails the assertion promptly.
 *
 * Run: npx tsx test/continuous-test-suite-stream-teardown-abort.ts
 *      pnpm run test:stream-teardown-abort
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { defineSuite, assert, delay } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Stream teardown cancels transport", {
  offline: true,
  perTestTimeoutMs: 20_000,
});

const MODEL = "claude-3-5-haiku@20241022";

/** Env vars this suite touches — saved/restored around every test so an
 * ambient key or project can never redirect the SDK somewhere real. */
const TOUCHED_ENV_VARS = [
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT_ID",
  "VERTEX_PROJECT_ID",
  "GOOGLE_VERTEX_PROJECT",
  "GOOGLE_CLOUD_LOCATION",
  "VERTEX_LOCATION",
  "GOOGLE_VERTEX_LOCATION",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_VERTEX_API_KEY",
  "GOOGLE_VERTEX_BASE_URL",
  "GOOGLE_API_KEY",
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }
  return snapshot;
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const key of TOUCHED_ENV_VARS) {
    const prior = snapshot[key];
    if (prior === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prior;
    }
  }
}

/** One Anthropic message-stream SSE event, in the exact framing
 * `@anthropic-ai/vertex-sdk`'s `MessageStream` parses. */
function sse(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;
}

const CHUNK_INTERVAL_MS = 40;
// Safety cap: if the client never disconnects (e.g. a regression that hangs
// instead of leaking), the fixture still ends its own response instead of
// holding the connection — and the test process — open forever.
const MAX_CHUNKS = 60; // 60 * 40ms = 2.4s worst case per test

/**
 * A one-shot Anthropic-SSE fixture that reports whether ITS request was
 * cancelled by the client before the fixture itself decided to end the
 * response.
 */
function startAbortObservingServer(): {
  url: Promise<string>;
  wasCancelled: () => boolean;
  close: () => Promise<void>;
} {
  let cancelled = false;
  let endedByFixture = false;
  let activeRes: ServerResponse | undefined;
  let activeTimer: ReturnType<typeof setInterval> | undefined;

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Drain the request body; its content plays no part in this fixture.
    req.resume();
    activeRes = res;
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    });

    // The FULL message shape, not the trimmed one — `MessageStream` builds
    // its snapshot from this event and pushes each content block onto
    // `snapshot.content`; without `content: []` (and the sibling fields read
    // alongside it) the accumulator dies before a single delta is delivered.
    res.write(
      sse("message_start", {
        message: {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: MODEL,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 5, output_tokens: 0 },
        },
      }),
    );
    res.write(
      sse("content_block_start", {
        index: 0,
        content_block: { type: "text", text: "" },
      }),
    );

    let n = 0;
    const writeNext = (): void => {
      n++;
      if (n >= MAX_CHUNKS) {
        if (activeTimer) {
          clearInterval(activeTimer);
        }
        endedByFixture = true;
        res.write(
          sse("content_block_delta", {
            index: 0,
            delta: { type: "text_delta", text: `chunk-${n} ` },
          }),
        );
        res.write(sse("content_block_stop", { index: 0 }));
        res.write(
          sse("message_delta", {
            delta: { stop_reason: "end_turn" },
            usage: { output_tokens: n },
          }),
        );
        res.write(sse("message_stop", {}));
        res.end();
        return;
      }
      res.write(
        sse("content_block_delta", {
          index: 0,
          delta: { type: "text_delta", text: `chunk-${n} ` },
        }),
      );
    };
    writeNext();
    activeTimer = setInterval(writeNext, CHUNK_INTERVAL_MS);

    // The connection closing before the fixture itself called res.end()
    // means the CLIENT went away — exactly the observation this suite
    // exists to make. `res.writableEnded` is set synchronously by
    // `res.end()`, so ordering against `endedByFixture` (set just before
    // that call) is redundant but kept for clarity under either signal.
    res.on("close", () => {
      if (activeTimer) {
        clearInterval(activeTimer);
      }
      if (!endedByFixture && !res.writableEnded) {
        cancelled = true;
      }
    });
  });

  const url = new Promise<string>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve(`http://127.0.0.1:${port}`);
    });
  });

  return {
    url,
    wasCancelled: () => cancelled,
    close: () =>
      new Promise<void>((resolve) => {
        // Best-effort teardown: force-end whatever is still open so a failed
        // assertion can never leave the fixture's own socket dangling.
        if (activeTimer) {
          clearInterval(activeTimer);
        }
        if (activeRes && !activeRes.writableEnded) {
          activeRes.end();
        }
        server.close(() => resolve());
        // server.close() waits for existing connections to finish; force it
        // so a stuck client socket can't stall the suite itself.
        setTimeout(() => resolve(), 500).unref();
      }),
  };
}

/** Bounded poll — never an unbounded wait. */
async function pollUntil(
  check: () => boolean,
  budgetMs: number,
  intervalMs = 20,
): Promise<boolean> {
  const start = Date.now();
  for (;;) {
    if (check()) {
      return true;
    }
    if (Date.now() - start >= budgetMs) {
      return check();
    }
    await delay(intervalMs);
  }
}

void runSuite(async () => {
  const { NeuroLink, ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  await test("breaking out of the stream after one chunk cancels the server's in-flight request", async () => {
    const envSnapshot = snapshotEnv();
    const fixture = startAbortObservingServer();

    try {
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });
      const result = await nl.stream({
        provider: "vertex",
        model: MODEL,
        input: { text: "hi" },
        maxTokens: 32,
        maxSteps: 1,
        disableTools: true,
        disableInternalFallback: true,
        credentials: {
          vertex: {
            apiKey: "express-key",
            baseURL: await fixture.url,
          },
        },
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);

      let gotFirstChunk = false;
      for await (const chunk of result.stream) {
        if ("content" in chunk && typeof chunk.content === "string") {
          gotFirstChunk = true;
        }
        break;
      }
      assert(
        gotFirstChunk,
        "never received a first chunk — nothing to abandon",
      );

      const observed = await pollUntil(fixture.wasCancelled, 1_500);
      assert(
        observed,
        "server did not observe the client's request being cancelled after the consumer abandoned the stream",
      );
    } finally {
      await fixture.close();
      restoreEnv(envSnapshot);
    }
  });
});

/**
 * A failed native generate must emit `generation:end` exactly once.
 *
 * Native provider paths (Google AI Studio, Vertex) emit their own
 * `generation:end` so Pipeline B exporters see the native call, and mark the
 * result with `_generationEndEmitted` so the SDK's own top-level emission
 * stands down. That dedup only ever worked on the success path: on failure
 * there is no result object to carry the flag, so the provider's
 * `success: false` event and the SDK's `emitGenerateErrorEvent` both fired and
 * every native failure was counted twice — in analytics, and as two
 * `model.generation` spans.
 *
 * Two things had to change for one event to survive:
 *   - the provider marks the *error* on the failure path, since it has no
 *     result to mark;
 *   - `generateTextInternal`'s wrappers carry that mark across, because they
 *     replace the provider's error with a new one and previously discarded
 *     everything attached to it (they now also set `cause`, which was being
 *     thrown away with it).
 *
 * End-to-end through the public `generate()` and the public event emitter
 * (`getEventEmitter()`), against a local endpoint that always fails. Nothing
 * here reaches past the public surface.
 *
 * Run: npx tsx test/continuous-test-suite-native-failure-events.ts
 *      pnpm run test:native-failure-events
 */

import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { NeuroLink } from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Native failure events", {
  offline: true,
});

const TOUCHED_ENV = [
  "GOOGLE_AI_BASE_URL",
  "GOOGLE_AI_API_KEY",
  "NEUROLINK_SKIP_MCP",
  "NEUROLINK_DISABLE_BUILTIN_TOOLS",
] as const;

type GenerationEndEvent = {
  readonly success?: boolean;
  readonly provider?: string;
};

/** Always-failing stand-in for the Google AI Studio endpoint. */
async function startFailingServer(status: number): Promise<{
  readonly port: number;
  readonly close: () => Promise<void>;
}> {
  const server: Server = createServer((_req, res) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: { code: status, message: "induced failure" } }),
    );
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  return {
    port: typeof address === "object" && address ? address.port : 0,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function countGenerationEndEvents(options: {
  readonly model: string;
  readonly status: number;
}): Promise<{
  readonly events: ReadonlyArray<GenerationEndEvent>;
  readonly threw: boolean;
}> {
  const server = await startFailingServer(options.status);
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV) {
    saved[key] = process.env[key];
  }
  try {
    process.env.GOOGLE_AI_BASE_URL = `http://127.0.0.1:${server.port}`;
    process.env.GOOGLE_AI_API_KEY = "offline-fixture-key";
    // Only this suite's own call should be in play: MCP and built-in tool
    // discovery add tools (and latency) that have nothing to do with the
    // event count under test.
    process.env.NEUROLINK_SKIP_MCP = "true";
    process.env.NEUROLINK_DISABLE_BUILTIN_TOOLS = "true";

    const sdk = new NeuroLink();
    const events: GenerationEndEvent[] = [];
    sdk.getEventEmitter()?.on("generation:end", (payload: unknown) => {
      events.push(payload as GenerationEndEvent);
    });

    let threw = false;
    try {
      await sdk.generate({
        input: { text: "induce a failure" },
        provider: "google-ai",
        model: options.model,
        disableTools: true,
        disableInternalFallback: true,
      } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
    } catch {
      threw = true;
    }
    // The emission is synchronous today, but a tick costs nothing and keeps
    // the count from depending on that.
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { events, threw };
  } finally {
    for (const key of TOUCHED_ENV) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
    await server.close();
  }
}

await test("a failed native generate emits generation:end exactly once", async () => {
  const { events, threw } = await countGenerationEndEvents({
    model: "gemini-3-flash-preview",
    status: 500,
  });

  // Preconditions, or the count below proves nothing: the call has to have
  // actually failed, and the failure event has to have been emitted at all.
  assert.ok(
    threw,
    "generate() resolved against an always-failing endpoint — the fixture no longer induces a failure",
  );
  assert.ok(
    events.length > 0,
    "no generation:end was emitted for a failed native generate — the native path no longer reports failures at all",
  );
  assert.ok(
    events.every((event) => event.success === false),
    "a generation:end for a failed call did not carry success=false",
  );

  // The regression: provider and SDK both emitted, so every native failure
  // was double-counted.
  assert.equal(
    events.length,
    1,
    "a single failed native generate emitted more than one generation:end, so failures are double-counted in analytics and Pipeline B",
  );
});

await test("control: the surviving event is the provider's, carrying its own detail", async () => {
  // Guards the opposite failure: deduplicating by dropping the *provider's*
  // richer event and keeping the SDK's would also yield a count of 1, while
  // silently losing the native path from Pipeline B. The provider's event
  // names the provider; assert that detail survived.
  const { events } = await countGenerationEndEvents({
    model: "gemini-3-flash-preview",
    status: 500,
  });
  // Deliberately says nothing about the count, so this case stays meaningful
  // whether or not the dedup is in place — it fails only if the provider's own
  // event is the one that went missing.
  assert.ok(
    events.some((event) => event.provider === "google-ai"),
    "no generation:end identified the provider, so the native path's own event was dropped rather than the SDK's duplicate",
  );
});

// ---------------------------------------------------------------------------
// Vertex — the same dedup gap as Google AI Studio above, fixed the same way
// (see `emitGenerationEnd` in `src/lib/providers/googleVertex/client.ts`):
// the provider marks the *error* with `_generationEndEmitted` on failure,
// since there is no result object to carry the flag, and `wrapProviderError`
// in `neurolink.ts` carries that mark across when it replaces the error.
//
// Vertex's native stream path has a second, distinct gap the generate path
// doesn't: `executeNativeGemini3Stream` / `executeNativeAnthropicStream`
// await the whole first turn to completion *inside* `executeStream()` before
// ever returning a `StreamResult`, so a first-call failure rejects before the
// SDK's generic per-stream dedup machinery (which only wraps an
// already-returned stream) ever runs — that path emitted zero
// `generation:end` events, not two. The fix makes `executeStream()`'s catch
// block call `emitGenerationEnd` itself, the same way `generate()`'s catch
// block already did.
//
// Reached over HTTP via Vertex AI Express Mode
// (`credentials.vertex.{apiKey,baseURL}`), which is the only way to point
// this provider at a local stand-in — the default ADC path ignores any
// base-URL override and authenticates for real, and ADC-related env vars are
// cleared per call so ambient credentials on this machine can't leak in.
// ---------------------------------------------------------------------------

const VERTEX_TOUCHED_ENV = [
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
  "GEMINI_API_KEY",
  "NEUROLINK_SKIP_MCP",
  "NEUROLINK_DISABLE_BUILTIN_TOOLS",
] as const;

const VERTEX_MODEL = "gemini-2.0-flash";

/** One complete-turn SSE chunk in the shape the Gemini streaming API sends. */
function vertexSuccessChunk(text: string): string {
  const payload = {
    candidates: [
      {
        content: { parts: [{ text }], role: "model" },
        finishReason: "STOP",
        index: 0,
      },
    ],
    usageMetadata: {
      promptTokenCount: 5,
      candidatesTokenCount: 4,
      totalTokenCount: 9,
    },
  };
  return `data: ${JSON.stringify(payload)}\r\n\r\n`;
}

/** Stands in for the Vertex Express Mode endpoint: one fixed response for any request. */
async function startVertexServer(
  status: number | "ok",
): Promise<{ readonly port: number; readonly close: () => Promise<void> }> {
  const server: Server = createServer((_req, res) => {
    if (status === "ok") {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.end(vertexSuccessChunk("vertex fixture reply"));
    } else {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: { code: status, message: "induced failure" },
        }),
      );
    }
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  return {
    port: typeof address === "object" && address ? address.port : 0,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function countVertexGenerationEndEvents(options: {
  readonly mode: "generate" | "stream";
  readonly status: number | "ok";
}): Promise<{
  readonly events: ReadonlyArray<GenerationEndEvent>;
  readonly threw: boolean;
  readonly content: string;
}> {
  const server = await startVertexServer(options.status);
  const saved: Record<string, string | undefined> = {};
  for (const key of VERTEX_TOUCHED_ENV) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  try {
    process.env.NEUROLINK_SKIP_MCP = "true";
    process.env.NEUROLINK_DISABLE_BUILTIN_TOOLS = "true";

    const sdk = new NeuroLink();
    const events: GenerationEndEvent[] = [];
    sdk.getEventEmitter()?.on("generation:end", (payload: unknown) => {
      events.push(payload as GenerationEndEvent);
    });

    const credentials = {
      vertex: {
        apiKey: "offline-fixture-key",
        baseURL: `http://127.0.0.1:${server.port}`,
      },
    };

    let threw = false;
    let content = "";
    try {
      if (options.mode === "generate") {
        const result = await sdk.generate({
          input: { text: "induce a Vertex response" },
          provider: "vertex",
          model: VERTEX_MODEL,
          credentials,
          disableTools: true,
          disableInternalFallback: true,
        } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
        content = result?.content ?? "";
      } else {
        const result = await sdk.stream({
          input: { text: "induce a Vertex response" },
          provider: "vertex",
          model: VERTEX_MODEL,
          credentials,
          disableTools: true,
          disableInternalFallback: true,
        } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
        for await (const chunk of result.stream as AsyncIterable<{
          content?: string;
        }>) {
          content += chunk.content ?? "";
        }
      }
    } catch {
      threw = true;
    }
    // The emission is synchronous today, but a tick costs nothing and keeps
    // the count from depending on that.
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { events, threw, content };
  } finally {
    for (const key of VERTEX_TOUCHED_ENV) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
    await server.close();
  }
}

await test("a failed native Vertex generate emits generation:end exactly once", async () => {
  const { events, threw } = await countVertexGenerationEndEvents({
    mode: "generate",
    status: 500,
  });

  assert.ok(
    threw,
    "generate() resolved against an always-failing Vertex stand-in — the fixture no longer induces a failure",
  );
  assert.ok(
    events.length > 0,
    "no generation:end was emitted for a failed native Vertex generate — the native path no longer reports failures at all",
  );
  assert.ok(
    events.every((event) => event.success === false),
    "a generation:end for a failed Vertex generate did not carry success=false",
  );
  assert.equal(
    events.length,
    1,
    "a single failed native Vertex generate emitted more than one generation:end, so failures are double-counted in analytics and Pipeline B",
  );
});

await test("a successful native Vertex generate emits generation:end exactly once", async () => {
  const { events, threw, content } = await countVertexGenerationEndEvents({
    mode: "generate",
    status: "ok",
  });

  // Precondition: the call actually has to have completed, or the count
  // below proves nothing.
  assert.ok(
    !threw && content.length > 0,
    "precondition: the successful native Vertex generate path did not complete against the fixture",
  );
  assert.ok(
    events.every((event) => event.success === true),
    "a generation:end for a successful Vertex generate did not carry success=true",
  );
  assert.equal(
    events.length,
    1,
    "a single successful native Vertex generate emitted more than one generation:end",
  );
});

await test("a failed native Vertex stream emits generation:end exactly once", async () => {
  const { events, threw } = await countVertexGenerationEndEvents({
    mode: "stream",
    status: 500,
  });

  assert.ok(
    threw,
    "stream() resolved against an always-failing Vertex stand-in — the fixture no longer induces a failure",
  );
  assert.ok(
    events.length > 0,
    "no generation:end was emitted for a failed native Vertex stream — Vertex's eager first-turn failure reports zero events, bypassing the SDK's generic stream dedup entirely",
  );
  assert.ok(
    events.every((event) => event.success === false),
    "a generation:end for a failed Vertex stream did not carry success=false",
  );
  assert.equal(
    events.length,
    1,
    "a single failed native Vertex stream emitted more than one generation:end, so failures are double-counted in analytics and Pipeline B",
  );
});

await test("a successful native Vertex stream emits generation:end exactly once", async () => {
  const { events, threw, content } = await countVertexGenerationEndEvents({
    mode: "stream",
    status: "ok",
  });

  assert.ok(
    !threw && content.length > 0,
    "precondition: the successful native Vertex stream path did not complete against the fixture",
  );
  assert.ok(
    events.every((event) => event.success === true),
    "a generation:end for a successful Vertex stream did not carry success=true",
  );
  assert.equal(
    events.length,
    1,
    "a single successful native Vertex stream emitted more than one generation:end",
  );
});

await runSuite();

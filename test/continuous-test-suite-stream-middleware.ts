#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Public generate()/stream() middleware contracts for the OpenAI-compatible
 * family. Local HTTP fixtures prove prompt rewrites, real tool execution,
 * guardrail blocking/filtering, error propagation, completion and cancellation.
 * Runtime imports use only the built entry; type-only imports are erased.
 *
 * Run: pnpm run build && pnpm run test:stream-middleware
 */

import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { once } from "node:events";
import { z } from "zod";
import type {
  NeuroLinkMiddleware,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  StreamResult,
  AnalyticsData,
  LifecycleChunkPayload,
  LifecycleFinishPayload,
} from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  mockOpenAICredentials,
  startMockChatServer,
  startScriptedChatServer,
  chatCompletion,
} from "./helpers/mockChatServer.js";
import { NeuroLink, tool, createLifecycleMiddleware } from "../dist/index.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Stream middleware", {
  offline: true,
});

const MARKER = "MIDDLEWARE_TOUCHED_THE_PROMPT";

type ProbeRecord = {
  transformParamsCalls: Array<"generate" | "stream">;
  wrapGenerateCalls: number;
  wrapStreamCalls: number;
};

/**
 * A middleware that records which hooks fired and rewrites the outgoing
 * prompt. The rewrite is what separates "the hook ran" from "the hook
 * affected the request" — the stand-in captures the wire body, so the
 * marker either reached the provider or it did not.
 *
 * `metadata` is mandatory. A probe without it registers under an `undefined`
 * id and silently never runs, which measures the probe rather than the code.
 */
const createProbe = (record: ProbeRecord): NeuroLinkMiddleware => ({
  specificationVersion: "v3",
  metadata: { id: "stream-probe", name: "Stream probe" },
  transformParams: async ({ type, params }) => {
    record.transformParamsCalls.push(type);
    return {
      ...params,
      prompt: [
        ...params.prompt,
        { role: "user", content: [{ type: "text", text: MARKER }] },
      ],
    };
  },
  wrapGenerate: async ({ doGenerate }) => {
    record.wrapGenerateCalls += 1;
    return doGenerate();
  },
  wrapStream: async ({ doStream }) => {
    record.wrapStreamCalls += 1;
    return doStream();
  },
});

const emptyRecord = (): ProbeRecord => ({
  transformParamsCalls: [],
  wrapGenerateCalls: 0,
  wrapStreamCalls: 0,
});

const middlewareOptions = (record: ProbeRecord) => ({
  middleware: [createProbe(record)],
  enabledMiddleware: ["stream-probe"],
});

// ---------------------------------------------------------------------------
// PRECONDITION — the probe is correctly registered and does run on generate.
// ---------------------------------------------------------------------------

await test("generate applies model middleware (precondition)", async () => {
  const server = await startMockChatServer();
  const record = emptyRecord();
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "hello" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      credentials: mockOpenAICredentials(server),
      middleware: middlewareOptions(record),
    });

    if (record.transformParamsCalls.length === 0) {
      throw new Error(
        "probe never ran on generate — the probe is mis-registered, so the " +
          "stream assertions below would be meaningless",
      );
    }
    if (record.wrapGenerateCalls === 0) {
      throw new Error("wrapGenerate never fired on the generate path");
    }
    const body = server.getLastRequestBody();
    if (!body || !body.includes(MARKER)) {
      throw new Error(
        "the transformParams rewrite did not reach the wire on generate",
      );
    }
  } finally {
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// THE GAP — the same middleware, the same provider, the streaming path.
// ---------------------------------------------------------------------------

await test("stream applies model middleware", async () => {
  const server = await startMockChatServer();
  const record = emptyRecord();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hello" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      credentials: mockOpenAICredentials(server),
      middleware: middlewareOptions(record),
    });

    for await (const _chunk of result.stream) {
      // Drain. The assertions are about what was sent, not what came back.
    }

    if (!server.wasCalled()) {
      throw new Error(
        "the stand-in was never called — the stream never left the machine, " +
          "so nothing below can be concluded about middleware",
      );
    }
    if (record.transformParamsCalls.length === 0) {
      throw new Error("transformParams never fired on the streaming path");
    }
    if (!record.transformParamsCalls.includes("stream")) {
      throw new Error(
        'transformParams fired but never with type "stream" on stream()',
      );
    }
    if (record.wrapStreamCalls === 0) {
      throw new Error("wrapStream never fired on the streaming path");
    }
  } finally {
    await server.close();
  }
});

await test("a stream transformParams rewrite reaches the wire", async () => {
  const server = await startMockChatServer();
  const record = emptyRecord();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hello" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      credentials: mockOpenAICredentials(server),
      middleware: middlewareOptions(record),
    });

    for await (const _chunk of result.stream) {
      // Drain.
    }

    const body = server.getLastRequestBody();
    if (!body) {
      throw new Error("the stand-in captured no request body for the stream");
    }
    if (!body.includes(MARKER)) {
      throw new Error(
        "the transformParams rewrite did not reach the wire on stream",
      );
    }
  } finally {
    await server.close();
  }
});

const readText = async (result: StreamResult): Promise<string> => {
  let text = "";
  for await (const chunk of result.stream) {
    if ("content" in chunk && typeof chunk.content === "string") {
      text += chunk.content;
    }
  }
  return text;
};

// The deadline is generous on purpose. The two cancellation cases below
// failed once with "request never reached the fixture" while a 53-suite sweep
// saturated the CPU in parallel — stream setup alone exceeded a 3s bound before
// the HTTP request went out — and passed 20/20 in isolation. A bound exists to
// catch a hang, not to race the scheduler.
const bounded = async <T>(
  promise: PromiseLike<T>,
  deadlineMs = 30_000,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("middleware completion did not settle")),
          deadlineMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

await test("wrapStream filters text and observes the V3 terminal event", async () => {
  const server = await startMockChatServer();
  const sdk = new NeuroLink();
  const seen: LanguageModelV3StreamPart[] = [];
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "wire-filter", name: "Wire filter" },
    wrapStream: async ({ doStream }) => {
      const result = await doStream();
      return {
        ...result,
        stream: result.stream.pipeThrough(
          new TransformStream({
            transform(part: LanguageModelV3StreamPart, controller) {
              seen.push(part);
              controller.enqueue(
                part.type === "text-delta"
                  ? { ...part, delta: part.delta.toUpperCase() }
                  : part,
              );
            },
          }),
        ),
      };
    },
  };
  try {
    const result = await sdk.stream({
      input: { text: "hello" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      disableInternalFallback: true,
      credentials: mockOpenAICredentials(server),
      middleware: {
        middleware: [middleware],
        enabledMiddleware: ["wire-filter"],
      },
    });
    assert.equal(
      await bounded(readText(result)),
      "MOCK REPLY",
      "filtered text lost",
    );
    assert.ok(server.wasCalled(), "wire request did not run");
    assert.equal(
      seen.filter((part) => part.type === "finish").length,
      1,
      "terminal event not forwarded",
    );
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

await test("a synthetic blocking stream delivers text and settles analytics without HTTP", async () => {
  const server = await startMockChatServer();
  const sdk = new NeuroLink();
  let invoked = false;
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "block-stream", name: "Block stream" },
    wrapStream: async () => {
      invoked = true;
      return {
        stream: new ReadableStream<LanguageModelV3StreamPart>({
          start(controller) {
            controller.enqueue({ type: "text-start", id: "blocked" });
            controller.enqueue({
              type: "text-delta",
              id: "blocked",
              delta: "BLOCKED",
            });
            controller.enqueue({ type: "text-end", id: "blocked" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop" },
              usage: { inputTokens: { total: 0 }, outputTokens: { total: 0 } },
            });
            controller.close();
          },
        }),
      };
    },
  };
  try {
    const result = await sdk.stream({
      input: { text: "block this" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      disableInternalFallback: true,
      enableAnalytics: true,
      credentials: mockOpenAICredentials(server),
      middleware: {
        middleware: [middleware],
        enabledMiddleware: ["block-stream"],
      },
    });
    assert.equal(
      await bounded(readText(result)),
      "BLOCKED",
      "blocked content lost",
    );
    assert.ok(invoked, "blocking middleware did not run");
    assert.equal(
      server.getAllRequestBodies().length,
      0,
      "blocked request reached HTTP",
    );
    assert.ok(result.analytics, "analytics were not exposed");
    await bounded(Promise.resolve(result.analytics));
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

await test("a synthetic blocking stream with cache-inclusive usage bills the cached portion at the cache-read rate", async () => {
  // Same mechanism as "a synthetic blocking stream ... without HTTP" above —
  // a wrapStream that never calls the given doStream() is the only way the
  // OpenAI-compatible provider's executeStream() reaches its `!loopPromise`
  // usage branch — but this time with realistic OpenAI-style cache-inclusive
  // usage (`inputTokens.total` includes the cached portion) instead of all
  // zero, so the branch's cache split is actually exercised. gpt-4o-mini's
  // published rates (src/lib/models/manifests/openai.ts) are input
  // $0.15/MTok, output $0.60/MTok, cacheRead $0.0375/MTok: 200 uncached +
  // 800 cached + 100 output tokens price to 0.00003 + 0.00003 + 0.00006.
  const server = await startMockChatServer();
  const sdk = new NeuroLink();
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "cache-usage-stream", name: "Cache usage stream" },
    wrapStream: async () => ({
      stream: new ReadableStream<LanguageModelV3StreamPart>({
        start(controller) {
          controller.enqueue({ type: "text-start", id: "cached" });
          controller.enqueue({
            type: "text-delta",
            id: "cached",
            delta: "cached reply",
          });
          controller.enqueue({ type: "text-end", id: "cached" });
          controller.enqueue({
            type: "finish",
            finishReason: { unified: "stop" },
            usage: {
              inputTokens: { total: 1000, cacheRead: 800 },
              outputTokens: { total: 100 },
            },
          });
          controller.close();
        },
      }),
    }),
  };
  try {
    const result = await sdk.stream({
      input: { text: "hello" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      disableInternalFallback: true,
      enableAnalytics: true,
      credentials: mockOpenAICredentials(server),
      middleware: {
        middleware: [middleware],
        enabledMiddleware: ["cache-usage-stream"],
      },
    });
    await bounded(readText(result));
    assert.equal(
      server.getAllRequestBodies().length,
      0,
      "synthetic stream did not stay off the wire",
    );
    assert.ok(result.analytics, "analytics were not exposed");
    const analytics = await bounded(Promise.resolve(result.analytics));
    const { tokenUsage, cost } = analytics as AnalyticsData;
    assert.equal(
      tokenUsage.input,
      200,
      "uncached input was not separated out of the cache-inclusive total",
    );
    assert.equal(
      tokenUsage.cacheReadTokens,
      800,
      "cache-read tokens were not reported on the streaming no-tool-call path",
    );
    assert.equal(
      tokenUsage.total,
      1100,
      "the reported total drifted when the cache split was introduced",
    );
    assert.equal(
      cost,
      0.00012,
      "the cached portion was not billed at the discounted cache-read rate",
    );
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

for (const mode of ["generate", "stream"] as const) {
  await test(`guardrail bad-word filtering changes ${mode} content`, async () => {
    const server = await startMockChatServer();
    const sdk = new NeuroLink();
    try {
      const options = {
        input: { text: "hello" },
        provider: "openai",
        model: "gpt-4o-mini",
        disableTools: true,
        disableInternalFallback: true,
        credentials: mockOpenAICredentials(server),
        middleware: {
          middlewareConfig: {
            guardrails: {
              enabled: true,
              config: {
                badWords: {
                  enabled: true,
                  list: ["mock"],
                  replacementText: "CLEAN",
                },
              },
            },
          },
        },
      };
      const content =
        mode === "generate"
          ? (await sdk.generate(options)).content
          : await bounded(readText(await sdk.stream(options)));
      assert.ok(server.wasCalled(), "provider was not exercised");
      assert.equal(
        content,
        "CLEAN reply",
        "guardrail filtering did not reach consumer",
      );
    } finally {
      await sdk.shutdown();
      await server.close();
    }
  });

  await test(`precall guardrail blocks ${mode} after evaluator returns unsafe`, async () => {
    const evaluator = await startScriptedChatServer([
      chatCompletion({
        content: JSON.stringify({
          overall: "unsafe",
          safetyScore: 1,
          appropriatenessScore: 1,
          confidenceLevel: 10,
          suggestedAction: "block",
          reasoning: "Deterministic blocking fixture",
        }),
      }),
    ]);
    const target = await startMockChatServer();
    const saved = {
      key: process.env.OPENAI_COMPATIBLE_API_KEY,
      url: process.env.OPENAI_COMPATIBLE_BASE_URL,
    };
    process.env.OPENAI_COMPATIBLE_API_KEY = "test-evaluator-key";
    process.env.OPENAI_COMPATIBLE_BASE_URL = evaluator.baseURL;
    const sdk = new NeuroLink();
    try {
      const options = {
        input: { text: "block this request" },
        provider: "openai",
        model: "gpt-4o-mini",
        disableTools: true,
        disableInternalFallback: true,
        enableAnalytics: true,
        credentials: mockOpenAICredentials(target),
        middleware: {
          middlewareConfig: {
            guardrails: {
              enabled: true,
              config: {
                precallEvaluation: {
                  enabled: true,
                  provider: "openai-compatible",
                  evaluationModel: "fixture-evaluator",
                },
              },
            },
          },
        },
      };
      const result =
        mode === "generate"
          ? await sdk.generate(options)
          : await sdk.stream(options);
      const content =
        "stream" in result ? await bounded(readText(result)) : result.content;
      assert.ok(evaluator.wasCalled(), "guardrail evaluator was not exercised");
      assert.equal(
        target.getAllRequestBodies().length,
        0,
        "blocked input reached target provider",
      );
      assert.equal(
        content,
        "Request contains inappropriate content and has been blocked.",
        "guardrail refusal was lost",
      );
      if (result.analytics) {
        await bounded(Promise.resolve(result.analytics));
      }
    } finally {
      if (saved.key === undefined) {
        delete process.env.OPENAI_COMPATIBLE_API_KEY;
      } else {
        process.env.OPENAI_COMPATIBLE_API_KEY = saved.key;
      }
      if (saved.url === undefined) {
        delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      } else {
        process.env.OPENAI_COMPATIBLE_BASE_URL = saved.url;
      }
      await sdk.shutdown();
      await target.close();
      await evaluator.close();
    }
  });

  await test(`${mode} executes a real tool round trip with middleware enabled`, async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const server = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
      }
      const body: Record<string, unknown> = JSON.parse(
        Buffer.concat(chunks).toString(),
      );
      bodies.push(body);
      const first = bodies.length === 1;
      const call = {
        id: "call_fixture",
        type: "function",
        function: { name: "lookup", arguments: '{"value":7}' },
      };
      if (body.stream === true) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        const delta = first
          ? { tool_calls: [{ index: 0, ...call }] }
          : { content: "answer 42" };
        for (const data of [
          { choices: [{ index: 0, delta, finish_reason: null }] },
          {
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: first ? "tool_calls" : "stop",
              },
            ],
            usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
          },
        ]) {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
        res.end("data: [DONE]\n\n");
      } else {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify(
            chatCompletion(
              first
                ? { finishReason: "tool_calls", toolCalls: [call] }
                : { content: "answer 42" },
            ),
          ),
        );
      }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const sdk = new NeuroLink();
    let calls = 0;
    try {
      const options = {
        input: { text: "call lookup" },
        provider: "openai",
        model: "gpt-4o-mini",
        maxSteps: 3,
        disableInternalFallback: true,
        enabledToolNames: ["lookup"],
        credentials: {
          openai: {
            apiKey: "test-key",
            baseURL: `http://127.0.0.1:${address.port}/v1`,
          },
        },
        tools: {
          lookup: tool({
            inputSchema: z.object({ value: z.number() }),
            execute: async ({ value }) => {
              calls++;
              assert.equal(value, 7, "tool arguments changed");
              return { answer: 42 };
            },
          }),
        },
        middleware: middlewareOptions(emptyRecord()),
      };
      const result =
        mode === "generate"
          ? await sdk.generate(options)
          : await sdk.stream(options);
      const content =
        "stream" in result ? await bounded(readText(result)) : result.content;
      assert.equal(calls, 1, "tool was not invoked once");
      assert.equal(
        bodies.length,
        2,
        "tool round trip did not send two requests",
      );
      assert.ok(
        JSON.stringify(bodies[1].messages).includes("42"),
        "tool result not sent back",
      );
      assert.equal(content, "answer 42", "final tool answer lost");
    } finally {
      await sdk.shutdown();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
}

await test("breaking out of a wrapped stream cancels the upstream socket", async () => {
  let closed = false;
  let received = false;
  const server = createServer(async (req, res) => {
    for await (const _chunk of req) {
      /* Read the request before streaming. */
    }
    received = true;
    res.on("close", () => {
      closed = true;
    });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(
      `data: ${JSON.stringify({ choices: [{ delta: { content: "first" }, finish_reason: null }] })}\n\n`,
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const sdk = new NeuroLink();
  try {
    const result = await sdk.stream({
      input: { text: "hello" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      disableInternalFallback: true,
      credentials: {
        openai: {
          apiKey: "test-key",
          baseURL: `http://127.0.0.1:${address.port}/v1`,
        },
      },
      middleware: middlewareOptions(emptyRecord()),
    });
    await bounded(
      (async () => {
        for await (const chunk of result.stream) {
          if ("content" in chunk && chunk.content) {
            break;
          }
        }
      })(),
    );
    assert.ok(received, "server was never reached");
    await bounded(
      (async () => {
        while (!closed) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      })(),
    );
    assert.ok(closed, "upstream socket not closed");
  } finally {
    await sdk.shutdown();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

for (const mode of ["generate", "stream"] as const) {
  await test(`${mode} propagates provider failure with middleware enabled`, async () => {
    const server = await startScriptedChatServer([
      { status: 400, body: { error: { message: "fixture rejected" } } },
    ]);
    const sdk = new NeuroLink();
    let caught: unknown;
    try {
      const options = {
        input: { text: "hello" },
        provider: "openai",
        model: "gpt-4o-mini",
        disableTools: true,
        disableInternalFallback: true,
        credentials: mockOpenAICredentials(server),
        middleware: middlewareOptions(emptyRecord()),
      };
      try {
        if (mode === "generate") {
          await sdk.generate(options);
        } else {
          await readText(await sdk.stream(options));
        }
      } catch (error) {
        caught = error;
      }
      assert.ok(server.wasCalled(), "failure fixture was not reached");
      assert.ok(caught, "provider failure was swallowed");
    } finally {
      await sdk.shutdown();
      await server.close();
    }
  });

  for (const end of ["abort", "timeout"] as const) {
    await test(`${mode} ${end} closes an in-flight HTTP request`, async () => {
      const controller = new AbortController();
      let received = false;
      let closed = false;
      const server = createServer(async (req, res) => {
        for await (const _part of req) {
          /* Ensure the model request arrived. */
        }
        received = true;
        res.on("close", () => {
          closed = true;
        });
        if (end === "abort") {
          controller.abort(new Error("fixture abort"));
        }
      });
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address === "object");
      const sdk = new NeuroLink();
      let caught: unknown;
      try {
        const options = {
          input: { text: "hello" },
          provider: "openai",
          model: "gpt-4o-mini",
          disableTools: true,
          disableInternalFallback: true,
          abortSignal: controller.signal,
          timeout: 1000,
          turnTimeoutMs: 1500,
          credentials: {
            openai: {
              apiKey: "test-key",
              baseURL: `http://127.0.0.1:${address.port}/v1`,
            },
          },
          middleware: middlewareOptions(emptyRecord()),
        };
        try {
          await bounded(
            (async () => {
              if (mode === "generate") {
                await sdk.generate(options);
              } else {
                await readText(await sdk.stream(options));
              }
            })(),
          );
        } catch (error) {
          caught = error;
        }
        assert.ok(received, "request never reached the fixture");
        assert.ok(caught, "cancellation did not terminate the call");
        assert.notEqual(
          caught instanceof Error ? caught.message : "",
          "middleware completion did not settle",
          "only the test deadline ended the call",
        );
        await bounded(
          (async () => {
            while (!closed) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          })(),
        );
        assert.ok(closed, "upstream request stayed open");
      } finally {
        controller.abort();
        await sdk.shutdown();
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  }
}

await test("stream middleware sampling edits reach the wire and preserve native fields", async () => {
  const server = await startMockChatServer();
  const sdk = new NeuroLink();
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "sampling", name: "Sampling" },
    transformParams: async ({ params }) => ({
      ...params,
      maxOutputTokens: 77,
      temperature: 0.25,
      topP: 0.9,
    }),
  };
  try {
    await readText(
      await sdk.stream({
        provider: "openai",
        model: "gpt-4o-mini",
        input: { text: "hello" },
        disableTools: true,
        disableInternalFallback: true,
        maxTokens: 128,
        temperature: 0.7,
        credentials: mockOpenAICredentials(server),
        middleware: {
          middleware: [middleware],
          enabledMiddleware: ["sampling"],
        },
      }),
    );
    assert.ok(server.wasCalled(), "sampling fixture not reached");
    const body: Record<string, unknown> = JSON.parse(
      server.getLastRequestBody() ?? "{}",
    );
    assert.equal(body.max_tokens, 77, "token override lost");
    assert.equal(body.temperature, 0.25, "temperature override lost");
    assert.equal(body.top_p, 0.9, "top-p override lost");
    assert.equal(body.stream, true, "stream mode changed");
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

await test("generate schema recovery still works with middleware enabled", async () => {
  const server = await startScriptedChatServer([
    chatCompletion({ content: '{"answer":42}' }),
  ]);
  const sdk = new NeuroLink();
  const schema = z.object({ answer: z.number() });
  try {
    const result = await sdk.generate({
      provider: "openai",
      model: "gpt-4o-mini",
      input: { text: "answer" },
      schema,
      disableTools: true,
      disableInternalFallback: true,
      credentials: mockOpenAICredentials(server),
      middleware: middlewareOptions(emptyRecord()),
    });
    assert.ok(server.wasCalled(), "schema fixture not reached");
    assert.equal(
      schema.parse(result.structuredData).answer,
      42,
      "structured data changed",
    );
    assert.deepEqual(
      JSON.parse(result.content),
      result.structuredData,
      "JSON text disagrees with object",
    );
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

/**
 * A prohibited term split across a boundary. The bad-word filter used to run
 * on each text part (generate) and each text-delta (stream) in isolation, so a
 * term that straddled two of them passed unchanged and was reassembled
 * downstream — `lifecycle.ts` concatenates adjacent text parts, and every
 * stream consumer concatenates deltas. Each case first proves the split reaches
 * the consumer whole when no guardrail is configured, so a pass cannot come
 * from the pieces never having been split, and only then asserts the guardrail
 * catches the reassembled term.
 */
const SPLIT_TERM = ["inappro", "priate"] as const;
const WHOLE_TERM = SPLIT_TERM.join("");

const splitTermGuardrails = {
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: {
        badWords: {
          enabled: true,
          list: [WHOLE_TERM],
          replacementText: "CLEAN",
        },
      },
    },
  },
};

type SplitServer = {
  baseURL: string;
  requests: () => number;
  close: () => Promise<void>;
};

const readRequestBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
  });

const listen = async (
  server: Server,
): Promise<{ port: number; close: () => Promise<void> }> => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  return {
    port: typeof address === "object" && address ? address.port : 0,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
};

/** OpenAI-compatible server that streams each piece as its own SSE chunk. */
const startSplitDeltaChatServer = async (
  pieces: ReadonlyArray<string>,
): Promise<SplitServer> => {
  let requests = 0;
  const chunk = (delta: Record<string, unknown>, finish: string | null) =>
    `data: ${JSON.stringify({
      id: "split",
      object: "chat.completion.chunk",
      created: 1,
      model: "gpt-4o-mini",
      choices: [{ index: 0, delta, finish_reason: finish }],
    })}\n\n`;
  const server = createServer(async (req, res) => {
    await readRequestBody(req);
    requests += 1;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    for (const piece of pieces) {
      res.write(chunk({ role: "assistant", content: piece }, null));
    }
    res.write(chunk({}, "stop"));
    res.write("data: [DONE]\n\n");
    res.end();
  });
  const { port, close } = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    requests: () => requests,
    close,
  };
};

/**
 * Anthropic Messages server answering with one text block per piece — which
 * the native Anthropic path turns into adjacent text parts in the V3 result.
 * Serves both the JSON and the SSE form so whichever the generate path uses,
 * the blocks stay split.
 */
const startSplitBlockAnthropicServer = async (
  pieces: ReadonlyArray<string>,
): Promise<SplitServer> => {
  let requests = 0;
  const model = "claude-sonnet-4-20250514";
  const server = createServer(async (req, res) => {
    const raw = await readRequestBody(req);
    requests += 1;
    const wantsStream = ((): boolean => {
      try {
        return (JSON.parse(raw) as { stream?: unknown }).stream === true;
      } catch {
        return false;
      }
    })();
    if (!wantsStream) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_split",
          type: "message",
          role: "assistant",
          model,
          content: pieces.map((text) => ({ type: "text", text })),
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 2 },
        }),
      );
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const event = (type: string, data: Record<string, unknown>): void => {
      res.write(
        `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`,
      );
    };
    event("message_start", {
      message: {
        id: "msg_split",
        type: "message",
        role: "assistant",
        model,
        content: [],
        stop_reason: null,
        usage: { input_tokens: 1, output_tokens: 0 },
      },
    });
    pieces.forEach((text, index) => {
      event("content_block_start", {
        index,
        content_block: { type: "text", text: "" },
      });
      event("content_block_delta", {
        index,
        delta: { type: "text_delta", text },
      });
      event("content_block_stop", { index });
    });
    event("message_delta", {
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 2 },
    });
    event("message_stop", {});
    res.end();
  });
  const { port, close } = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}`,
    requests: () => requests,
    close,
  };
};

const withEnv = async <T>(
  vars: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> => {
  const saved = new Map(
    Object.keys(vars).map((key) => [key, process.env[key]] as const),
  );
  Object.assign(process.env, vars);
  try {
    return await fn();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

await test("guardrail bad-word filtering catches a term split across stream deltas", async () => {
  const server = await startSplitDeltaChatServer(SPLIT_TERM);
  const sdk = new NeuroLink();
  try {
    const base = {
      input: { text: "hello" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      disableInternalFallback: true,
      credentials: {
        openai: { apiKey: "sk-mock-local-server", baseURL: server.baseURL },
      },
    };
    const unfiltered = await bounded(readText(await sdk.stream(base)));
    assert.equal(
      server.requests(),
      1,
      "precondition: split server not exercised",
    );
    assert.equal(
      unfiltered,
      WHOLE_TERM,
      "precondition: split deltas did not reassemble into the whole term",
    );
    const filtered = await bounded(
      readText(await sdk.stream({ ...base, middleware: splitTermGuardrails })),
    );
    assert.equal(
      server.requests(),
      2,
      "guarded stream did not reach the provider",
    );
    assert.equal(
      filtered,
      "CLEAN",
      "term split across stream deltas escaped the guardrail",
    );
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

await test("guardrail bad-word filtering catches a term split across adjacent text parts (generate)", async () => {
  const server = await startSplitBlockAnthropicServer(SPLIT_TERM);
  try {
    await withEnv(
      {
        ANTHROPIC_BASE_URL: server.baseURL,
        ANTHROPIC_API_KEY: "sk-ant-mock-local-server",
      },
      async () => {
        const sdk = new NeuroLink();
        try {
          const base = {
            input: { text: "hello" },
            provider: "anthropic",
            model: "claude-sonnet-4-20250514",
            disableTools: true,
            disableInternalFallback: true,
          };
          const unfiltered = await sdk.generate(base);
          assert.equal(
            server.requests(),
            1,
            "precondition: split server not exercised",
          );
          assert.equal(
            unfiltered.content,
            WHOLE_TERM,
            "precondition: adjacent text blocks did not reassemble into the whole term",
          );
          const filtered = await sdk.generate({
            ...base,
            middleware: splitTermGuardrails,
          });
          assert.equal(
            server.requests(),
            2,
            "guarded generate did not reach the provider",
          );
          assert.equal(
            filtered.content,
            "CLEAN",
            "term split across adjacent text parts escaped the guardrail",
          );
        } finally {
          await sdk.shutdown();
        }
      },
    );
  } finally {
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// AI STUDIO — native generate()/stream() middleware.
//
// Google AI Studio's generate() and stream() never go through the AI SDK's
// LanguageModel plumbing the way the OpenAI-compatible family above does —
// both hand-roll an agentic loop directly against @google/genai — so before
// this fix neither transformParams nor wrapGenerate/wrapStream ever ran on
// this provider (see docs/plans/2026-09-07-middleware-on-native-providers.md).
// The stand-in below speaks the Gemini REST wire format directly and is
// reached via the public `credentials.googleAiStudio.baseURL` option, the
// same mechanism continuous-test-suite-aistudio-loop-characterization.ts
// uses. Sibling PRs add their own sections here for Vertex and Bedrock.
//
// `createProbe` / `emptyRecord` / `middlewareOptions` / `MARKER` / `readText`
// / `bounded` above are provider-agnostic and reused as-is.
// ---------------------------------------------------------------------------

const AI_STUDIO_MODEL = "gemini-2.0-flash";

/**
 * One streamed candidate chunk in the SSE framing the @google/genai SDK
 * expects. Omitting `finishReason` (undefined, not "STOP") produces a
 * non-terminal chunk — the shape a real mid-turn delta has.
 */
function aiStudioSse(
  parts: Array<Record<string, unknown>>,
  finishReason?: string,
): string {
  const payload = {
    candidates: [
      {
        content: { parts, role: "model" },
        ...(finishReason ? { finishReason } : {}),
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

function aiStudioTextTurn(text: string): string {
  return aiStudioSse([{ text }], "STOP");
}

/**
 * A single-turn SSE response carrying cache-read and reasoning (thinking)
 * token counts on `usageMetadata` — the shape Gemini reports when part of
 * the prompt was served from cache and part of the response was thinking.
 * `promptTokenCount` is deliberately cache-inclusive, matching the
 * OVERLAPPING convention documented at its call sites in client.ts.
 */
function aiStudioCacheUsageTurn(text: string): string {
  const payload = {
    candidates: [
      {
        content: { parts: [{ text }], role: "model" },
        finishReason: "STOP",
        index: 0,
      },
    ],
    usageMetadata: {
      promptTokenCount: 1000,
      candidatesTokenCount: 100,
      cachedContentTokenCount: 800,
      thoughtsTokenCount: 50,
      totalTokenCount: 1150,
    },
  };
  return `data: ${JSON.stringify(payload)}\r\n\r\n`;
}

type AiStudioStandInCall = { body: Record<string, unknown> };
type AiStudioStandIn = {
  calls: AiStudioStandInCall[];
  port: number;
  close: () => Promise<void>;
};

async function startAiStudioStandIn(
  reply: (callIndex: number) => string,
): Promise<AiStudioStandIn> {
  const calls: AiStudioStandInCall[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        body = {};
      }
      calls.push({ body });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(reply(calls.length - 1));
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

/**
 * Opens the response, writes one non-terminal chunk (enough for a consumer
 * to observe content and break out), then stays silent — used by the
 * cancellation case to prove a caller breaking out of the returned stream
 * still reaches the upstream socket through the new V3 wrapping.
 */
async function startAiStudioSilentStandIn(): Promise<{
  received: Promise<void>;
  closed: () => boolean;
  port: number;
  close: () => Promise<void>;
}> {
  let resolveReceived: () => void;
  const received = new Promise<void>((resolve) => {
    resolveReceived = resolve;
  });
  let closed = false;
  const server: Server = createServer((req, res) => {
    req.on("data", () => {
      /* drain */
    });
    req.on("end", () => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.on("close", () => {
        closed = true;
      });
      res.write(aiStudioSse([{ text: "first" }]));
      resolveReceived();
      // Deliberately never ends — only cancellation should close this.
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    received,
    closed: () => closed,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

function aiStudioCredentialsFor(port: number) {
  return {
    googleAiStudio: {
      apiKey: "test-key",
      baseURL: `http://127.0.0.1:${port}`,
    },
  };
}

function lastAiStudioBody(
  server: AiStudioStandIn,
): Record<string, unknown> | undefined {
  return server.calls[server.calls.length - 1]?.body;
}

await test("AI Studio: generate applies model middleware (precondition)", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  const record = emptyRecord();
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      disableTools: true,
      disableInternalFallback: true,
      credentials: aiStudioCredentialsFor(server.port),
      middleware: middlewareOptions(record),
    });
    assert.ok(
      record.transformParamsCalls.length > 0,
      "probe never ran on AI Studio generate — the native generate path bypasses caller model middleware",
    );
    assert.ok(
      record.wrapGenerateCalls > 0,
      "wrapGenerate never fired on the AI Studio generate path",
    );
    const body = lastAiStudioBody(server);
    assert.ok(
      body && JSON.stringify(body.contents ?? {}).includes(MARKER),
      "the transformParams rewrite did not reach the wire on AI Studio generate",
    );
  } finally {
    await server.close();
  }
});

await test("AI Studio: stream applies model middleware", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  const record = emptyRecord();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      disableTools: true,
      disableInternalFallback: true,
      credentials: aiStudioCredentialsFor(server.port),
      middleware: middlewareOptions(record),
    });
    await bounded(readText(result));
    assert.ok(
      server.calls.length > 0,
      "the AI Studio stand-in was never called — the stream never left the machine, so nothing below can be concluded about middleware",
    );
    assert.ok(
      record.transformParamsCalls.length > 0,
      "transformParams never fired on the AI Studio streaming path",
    );
    assert.ok(
      record.transformParamsCalls.includes("stream"),
      'transformParams fired but never with type "stream" on AI Studio stream()',
    );
    assert.ok(
      record.wrapStreamCalls > 0,
      "wrapStream never fired on the AI Studio streaming path",
    );
  } finally {
    await server.close();
  }
});

await test("AI Studio: a stream transformParams rewrite reaches the wire", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  const record = emptyRecord();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      disableTools: true,
      disableInternalFallback: true,
      credentials: aiStudioCredentialsFor(server.port),
      middleware: middlewareOptions(record),
    });
    await bounded(readText(result));
    const body = lastAiStudioBody(server);
    assert.ok(
      body,
      "the AI Studio stand-in captured no request body for the stream",
    );
    assert.ok(
      JSON.stringify(body?.contents ?? {}).includes(MARKER),
      "the transformParams rewrite did not reach the wire on AI Studio stream",
    );
  } finally {
    await server.close();
  }
});

await test("AI Studio: wrapStream observes the V3 terminal event with usage", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  const nl = new NeuroLink();
  const seen: LanguageModelV3StreamPart[] = [];
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "ai-studio-wire-filter", name: "AI Studio wire filter" },
    wrapStream: async ({ doStream }) => {
      const result = await doStream();
      return {
        ...result,
        stream: result.stream.pipeThrough(
          new TransformStream({
            transform(part: LanguageModelV3StreamPart, controller) {
              seen.push(part);
              controller.enqueue(
                part.type === "text-delta"
                  ? { ...part, delta: part.delta.toUpperCase() }
                  : part,
              );
            },
          }),
        ),
      };
    },
  };
  try {
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      disableTools: true,
      disableInternalFallback: true,
      credentials: aiStudioCredentialsFor(server.port),
      middleware: {
        middleware: [middleware],
        enabledMiddleware: ["ai-studio-wire-filter"],
      },
    });
    const text = await bounded(readText(result));
    assert.equal(
      text,
      "HELLO FROM AI STUDIO",
      "filtered text lost on AI Studio stream",
    );
    assert.ok(server.calls.length > 0, "AI Studio stand-in was never reached");
    const finishParts = seen.filter((part) => part.type === "finish");
    assert.equal(
      finishParts.length,
      1,
      "terminal event not forwarded on AI Studio stream",
    );
    const finish = finishParts[0];
    assert.ok(
      finish.type === "finish" && (finish.usage.outputTokens.total ?? 0) > 0,
      "AI Studio finish part carried no usage",
    );
  } finally {
    await nl.shutdown();
    await server.close();
  }
});

await test("AI Studio: wrapGenerate observes the V3 generate result with usage", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  const nl = new NeuroLink();
  let observedText: string | undefined;
  let observedOutputTokens: number | undefined;
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: {
      id: "ai-studio-generate-observer",
      name: "AI Studio generate observer",
    },
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      const textPart = result.content.find(
        (c): c is { type: "text"; text: string } => c.type === "text",
      );
      observedText = textPart?.text;
      observedOutputTokens = result.usage.outputTokens.total;
      return result;
    },
  };
  try {
    const result = await nl.generate({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      disableTools: true,
      disableInternalFallback: true,
      credentials: aiStudioCredentialsFor(server.port),
      middleware: {
        middleware: [middleware],
        enabledMiddleware: ["ai-studio-generate-observer"],
      },
    });
    assert.equal(
      result.content,
      "hello from ai studio",
      "AI Studio generate content lost through middleware",
    );
    assert.ok(
      observedText?.includes("hello from ai studio"),
      "wrapGenerate never observed the V3 text content on AI Studio generate",
    );
    assert.ok(
      (observedOutputTokens ?? 0) > 0,
      "wrapGenerate observed a V3 result with no usage on AI Studio generate",
    );
  } finally {
    await nl.shutdown();
    await server.close();
  }
});

// `gemini-3-fable-preview` isn't a registered model, so it falls back to
// `SAMPLING_PARAM_REJECTING_FAMILIES` in modelRegistry.ts, which matches it
// on `/fable/i` — the shared cross-provider family that rejects classic
// sampling params. `buildNativeConfig` strips temperature/topP for it; the
// generate bridge must not reintroduce them from the raw call options.
const SAMPLING_REJECTING_MODEL = "gemini-3-fable-preview";

await test("AI Studio: generate keeps the sampling-param strip in effect for a model that rejects them", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  const nl = new NeuroLink();
  try {
    const base = {
      input: { text: "hi" },
      provider: "google-ai",
      disableTools: true,
      disableInternalFallback: true,
      maxTokens: 50,
      temperature: 0.42,
      topP: 0.77,
      credentials: aiStudioCredentialsFor(server.port),
    };

    // Control: a model the registry treats as supporting sampling params —
    // establishes that this harness's request/response/body-capture round
    // trip actually carries temperature/topP end to end, so an absence on
    // the rejecting-family run below means the strip held, not that the
    // field never makes it onto the wire in this test at all.
    await nl.generate({ ...base, model: AI_STUDIO_MODEL });
    assert.equal(
      server.calls.length,
      1,
      "precondition: AI Studio generate control call not reached",
    );
    const controlBody = lastAiStudioBody(server) as {
      generationConfig?: { temperature?: number; topP?: number };
    };
    assert.equal(
      controlBody.generationConfig?.temperature,
      0.42,
      "precondition: control model lost its temperature",
    );
    assert.equal(
      controlBody.generationConfig?.topP,
      0.77,
      "precondition: control model lost its topP",
    );

    // Test: same call options, a sampling-rejecting model id.
    await nl.generate({ ...base, model: SAMPLING_REJECTING_MODEL });
    assert.equal(
      server.calls.length,
      2,
      "precondition: AI Studio generate rejecting-family call not reached",
    );
    const strippedBody = lastAiStudioBody(server) as {
      generationConfig?: {
        temperature?: number;
        topP?: number;
        maxOutputTokens?: number;
      };
    };
    // An ungated field (never subject to the sampling-param strip) proves
    // this body was parsed and inspected correctly, not merely empty.
    assert.equal(
      strippedBody.generationConfig?.maxOutputTokens,
      50,
      "precondition: rejecting-family generate body missing an ungated field",
    );
    assert.equal(
      strippedBody.generationConfig?.temperature,
      undefined,
      "AI Studio generate reintroduced temperature for a sampling-rejecting model",
    );
    assert.equal(
      strippedBody.generationConfig?.topP,
      undefined,
      "AI Studio generate reintroduced topP for a sampling-rejecting model",
    );
  } finally {
    await nl.shutdown();
    await server.close();
  }
});

await test("AI Studio: stream middleware sampling edits reach the wire", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  const nl = new NeuroLink();
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "ai-studio-sampling", name: "AI Studio sampling" },
    transformParams: async ({ params }) => ({
      ...params,
      maxOutputTokens: 77,
      temperature: 0.25,
      topP: 0.9,
    }),
  };
  try {
    await bounded(
      readText(
        await nl.stream({
          input: { text: "hi" },
          provider: "google-ai",
          model: AI_STUDIO_MODEL,
          disableTools: true,
          disableInternalFallback: true,
          maxTokens: 128,
          temperature: 0.7,
          credentials: aiStudioCredentialsFor(server.port),
          middleware: {
            middleware: [middleware],
            enabledMiddleware: ["ai-studio-sampling"],
          },
        }),
      ),
    );
    assert.ok(
      server.calls.length > 0,
      "AI Studio sampling fixture not reached",
    );
    const body = lastAiStudioBody(server) as {
      generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
        topP?: number;
      };
    };
    assert.equal(
      body.generationConfig?.maxOutputTokens,
      77,
      "AI Studio token override lost",
    );
    assert.equal(
      body.generationConfig?.temperature,
      0.25,
      "AI Studio temperature override lost",
    );
    assert.equal(
      body.generationConfig?.topP,
      0.9,
      "AI Studio top-p override lost",
    );
  } finally {
    await nl.shutdown();
    await server.close();
  }
});

await test("AI Studio: stream keeps the sampling-param strip in effect for a model that rejects them", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  const nl = new NeuroLink();
  try {
    const base = {
      input: { text: "hi" },
      provider: "google-ai",
      disableTools: true,
      disableInternalFallback: true,
      maxTokens: 50,
      temperature: 0.42,
      topP: 0.77,
      credentials: aiStudioCredentialsFor(server.port),
    };

    // Control: a model the registry treats as supporting sampling params —
    // establishes that this harness's request/response/body-capture round
    // trip actually carries temperature/topP end to end, so an absence on
    // the rejecting-family run below means the strip held, not that the
    // field never makes it onto the wire in this test at all.
    await bounded(
      readText(await nl.stream({ ...base, model: AI_STUDIO_MODEL })),
    );
    assert.equal(
      server.calls.length,
      1,
      "precondition: AI Studio stream control call not reached",
    );
    const controlBody = lastAiStudioBody(server) as {
      generationConfig?: { temperature?: number; topP?: number };
    };
    assert.equal(
      controlBody.generationConfig?.temperature,
      0.42,
      "precondition: control model lost its temperature",
    );
    assert.equal(
      controlBody.generationConfig?.topP,
      0.77,
      "precondition: control model lost its topP",
    );

    // Test: same call options, a sampling-rejecting model id (see
    // SAMPLING_REJECTING_MODEL's definition above the generate-side twin
    // of this test for why `gemini-3-fable-preview` matches the family).
    await bounded(
      readText(await nl.stream({ ...base, model: SAMPLING_REJECTING_MODEL })),
    );
    assert.equal(
      server.calls.length,
      2,
      "precondition: AI Studio stream rejecting-family call not reached",
    );
    const strippedBody = lastAiStudioBody(server) as {
      generationConfig?: {
        temperature?: number;
        topP?: number;
        maxOutputTokens?: number;
      };
    };
    // An ungated field (never subject to the sampling-param strip) proves
    // this body was parsed and inspected correctly, not merely empty.
    assert.equal(
      strippedBody.generationConfig?.maxOutputTokens,
      50,
      "precondition: rejecting-family stream body missing an ungated field",
    );
    assert.equal(
      strippedBody.generationConfig?.temperature,
      undefined,
      "AI Studio stream reintroduced temperature for a sampling-rejecting model",
    );
    assert.equal(
      strippedBody.generationConfig?.topP,
      undefined,
      "AI Studio stream reintroduced topP for a sampling-rejecting model",
    );
  } finally {
    await nl.shutdown();
    await server.close();
  }
});

for (const mode of ["generate", "stream"] as const) {
  await test(`AI Studio: precall guardrail blocks ${mode} — target never called`, async () => {
    const evaluator = await startScriptedChatServer([
      chatCompletion({
        content: JSON.stringify({
          overall: "unsafe",
          safetyScore: 1,
          appropriatenessScore: 1,
          confidenceLevel: 10,
          suggestedAction: "block",
          reasoning: "Deterministic blocking fixture",
        }),
      }),
    ]);
    const target = await startAiStudioStandIn(() =>
      aiStudioTextTurn("should never be seen"),
    );
    const saved = {
      key: process.env.OPENAI_COMPATIBLE_API_KEY,
      url: process.env.OPENAI_COMPATIBLE_BASE_URL,
    };
    process.env.OPENAI_COMPATIBLE_API_KEY = "test-evaluator-key";
    process.env.OPENAI_COMPATIBLE_BASE_URL = evaluator.baseURL;
    const nl = new NeuroLink();
    try {
      const options = {
        input: { text: "block this request" },
        provider: "google-ai",
        model: AI_STUDIO_MODEL,
        disableTools: true,
        disableInternalFallback: true,
        enableAnalytics: true,
        credentials: aiStudioCredentialsFor(target.port),
        middleware: {
          middlewareConfig: {
            guardrails: {
              enabled: true,
              config: {
                precallEvaluation: {
                  enabled: true,
                  provider: "openai-compatible",
                  evaluationModel: "fixture-evaluator",
                },
              },
            },
          },
        },
      };
      const result =
        mode === "generate"
          ? await nl.generate(options)
          : await nl.stream(options);
      const content =
        result && "stream" in result
          ? await bounded(readText(result))
          : result?.content;
      assert.ok(evaluator.wasCalled(), "guardrail evaluator was not exercised");
      assert.equal(
        target.calls.length,
        0,
        "blocked input reached the AI Studio target",
      );
      assert.equal(
        content,
        "Request contains inappropriate content and has been blocked.",
        "AI Studio guardrail refusal was lost",
      );
      if (result && "analytics" in result && result.analytics) {
        await bounded(Promise.resolve(result.analytics));
      }
    } finally {
      if (saved.key === undefined) {
        delete process.env.OPENAI_COMPATIBLE_API_KEY;
      } else {
        process.env.OPENAI_COMPATIBLE_API_KEY = saved.key;
      }
      if (saved.url === undefined) {
        delete process.env.OPENAI_COMPATIBLE_BASE_URL;
      } else {
        process.env.OPENAI_COMPATIBLE_BASE_URL = saved.url;
      }
      await nl.shutdown();
      await target.close();
      await evaluator.close();
    }
  });
}

await test("AI Studio: breaking out of a wrapped stream cancels the upstream socket", async () => {
  const standIn = await startAiStudioSilentStandIn();
  const nl = new NeuroLink();
  try {
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      disableTools: true,
      disableInternalFallback: true,
      credentials: aiStudioCredentialsFor(standIn.port),
      middleware: middlewareOptions(emptyRecord()),
    });
    await bounded(
      (async () => {
        for await (const chunk of result.stream) {
          if ("content" in chunk && chunk.content) {
            break;
          }
        }
      })(),
    );
    await bounded(standIn.received);
    await bounded(
      (async () => {
        while (!standIn.closed()) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      })(),
    );
    assert.ok(
      standIn.closed(),
      "upstream socket not closed on AI Studio cancellation",
    );
  } finally {
    await nl.shutdown();
    await standIn.close();
  }
});

await test("AI Studio: audio input bypasses caller model middleware entirely", async () => {
  // A probe that accepts the raw TCP connection and immediately destroys
  // the socket. Nothing ever completes the WebSocket handshake, so the
  // request never succeeds — but critically, @google/genai's Live client
  // (dist/node/index.cjs Live.connect) only settles its internal
  // `onopenPromise` from the `onopen` callback; the default/no-op `onerror`
  // path it wires up does NOT reject that promise. So this branch does not
  // fail fast with ECONNREFUSED the way a plain HTTP request would —
  // verified empirically, it hangs until something outside the SDK gives
  // up (here, the `bounded` wrapper below). That rules out asserting on any
  // error/message the audio dispatch produces, since none reliably arrives.
  // The one signal that is real: the probe itself observing a raw TCP
  // connection, which only happens once the audio/Gemini Live branch has
  // actually dialed out. That is the precondition below — the absence of
  // middleware activity proves nothing about *this* branch unless the
  // branch is proven to have been dispatched first.
  let connectionsSeen = 0;
  const probe = createServer();
  probe.on("connection", (socket) => {
    connectionsSeen += 1;
    socket.destroy();
  });
  const probePort = await new Promise<number>((resolve) => {
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve(port);
    });
  });

  async function* silentFrame(): AsyncIterable<Buffer> {
    yield Buffer.alloc(320);
  }

  const record = emptyRecord();
  const nl = new NeuroLink();
  try {
    try {
      // 10s, not the suite's usual 5s: the observed dial-out latency to
      // this probe (dynamic `@google/genai` import + Live handshake attempt)
      // runs ~3-5.5s before the socket is even opened, and the branch never
      // settles on its own (see above) — so the budget only needs to
      // outlast that dial-out, not a real response.
      await bounded(
        nl.stream({
          input: { audio: { frames: silentFrame() } },
          provider: "google-ai",
          model: "gemini-2.5-flash-preview-native-audio-dialog",
          disableInternalFallback: true,
          credentials: aiStudioCredentialsFor(probePort),
          middleware: middlewareOptions(record),
        }),
        10000,
      );
    } catch {
      // Expected — the probe never completes the handshake. Only the
      // assertions below are under test.
    }
    // Precondition: prove the audio/Gemini Live branch was actually
    // dispatched before trusting the negative assertions below. Without
    // this, a caller-model-middleware regression that instead sent the
    // request down the ordinary text/tool path — and failed for some
    // unrelated reason before ever touching transformParams/wrapStream —
    // would satisfy both negative assertions for the wrong reason. This
    // checks the transport-level fact (a TCP connection reached the probe),
    // not any error message, since this branch does not reliably produce one.
    assert.ok(
      connectionsSeen > 0,
      "the audio/Gemini Live branch was never dispatched — the probe observed no connection attempt, so the assertions below would prove nothing",
    );
    assert.equal(
      record.transformParamsCalls.length,
      0,
      "transformParams fired on the audio (Gemini Live) branch",
    );
    assert.equal(
      record.wrapStreamCalls,
      0,
      "wrapStream fired on the audio (Gemini Live) branch",
    );
  } finally {
    await nl.shutdown();
    await new Promise<void>((resolve) => probe.close(() => resolve()));
  }
});

// ---------------------------------------------------------------------------
// AI STUDIO — caller model middleware system-prompt visibility (forward and
// reverse), short-circuit stream cleanup, and native-turn usage fidelity.
// Gemini has no wire-visible system role: the instruction rides separately
// on `config.systemInstruction`, never inside `contents`. Before the fix,
// `geminiContentsToV3Prompt(contents)` alone fed `transformParams`, so the
// caller's system prompt was invisible to middleware on both bridges, and
// the reverse direction only ever overrode `systemInstruction` when
// `systemText` was truthy — never signaling "the caller removed it".
// ---------------------------------------------------------------------------

await test("AI Studio: transformParams observes the caller's system prompt on generate", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  let observedSystemContents: string[] = [];
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: {
      id: "ai-studio-system-observer",
      name: "AI Studio system observer",
    },
    transformParams: async ({ params }) => {
      observedSystemContents = params.prompt
        .filter((message) => message.role === "system")
        .map((message) => message.content);
      return params;
    },
  };
  const nl = new NeuroLink();
  try {
    await nl.generate({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      systemPrompt: "Answer only in French.",
      disableTools: true,
      disableInternalFallback: true,
      credentials: aiStudioCredentialsFor(server.port),
      middleware: {
        middleware: [middleware],
        enabledMiddleware: ["ai-studio-system-observer"],
      },
    });
    assert.ok(server.calls.length > 0, "AI Studio stand-in was never reached");
    assert.equal(
      observedSystemContents.length,
      1,
      "transformParams did not see a system message for the caller's systemPrompt on AI Studio generate",
    );
    assert.equal(
      observedSystemContents[0],
      "Answer only in French.",
      "the system message transformParams observed did not carry the caller's systemPrompt text",
    );
  } finally {
    await nl.shutdown();
    await server.close();
  }
});

await test("AI Studio: a middleware-added system message composes with the caller's on the wire", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: {
      id: "ai-studio-system-append",
      name: "AI Studio system append",
    },
    transformParams: async ({ params }) => ({
      ...params,
      prompt: [
        {
          role: "system" as const,
          content: "Always answer in bullet points.",
        },
        ...params.prompt,
      ],
    }),
  };
  const nl = new NeuroLink();
  try {
    await nl.generate({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      systemPrompt: "Answer only in French.",
      disableTools: true,
      disableInternalFallback: true,
      credentials: aiStudioCredentialsFor(server.port),
      middleware: {
        middleware: [middleware],
        enabledMiddleware: ["ai-studio-system-append"],
      },
    });
    const body = lastAiStudioBody(server) as { systemInstruction?: unknown };
    assert.ok(
      body?.systemInstruction,
      "AI Studio wire request carried no systemInstruction at all",
    );
    const wireSystemText = JSON.stringify(body.systemInstruction);
    assert.ok(
      wireSystemText.includes("Always answer in bullet points."),
      "the middleware-added system message never reached the AI Studio wire request",
    );
    assert.ok(
      wireSystemText.includes("Answer only in French."),
      "the caller's original systemPrompt was clobbered by the middleware-added system message",
    );
  } finally {
    await nl.shutdown();
    await server.close();
  }
});

await test("AI Studio: middleware clearing every system message removes systemInstruction from the wire", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("hello from ai studio"),
  );
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "ai-studio-system-strip", name: "AI Studio system strip" },
    transformParams: async ({ params }) => ({
      ...params,
      prompt: params.prompt.filter((message) => message.role !== "system"),
    }),
  };
  const nl = new NeuroLink();
  try {
    await nl.generate({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      systemPrompt: "Answer only in French.",
      disableTools: true,
      disableInternalFallback: true,
      credentials: aiStudioCredentialsFor(server.port),
      middleware: {
        middleware: [middleware],
        enabledMiddleware: ["ai-studio-system-strip"],
      },
    });
    assert.ok(server.calls.length > 0, "AI Studio stand-in was never reached");
    const body = lastAiStudioBody(server) as { systemInstruction?: unknown };
    assert.equal(
      body?.systemInstruction,
      undefined,
      "middleware removed every system message but the caller's systemPrompt still reached the AI Studio wire request",
    );
  } finally {
    await nl.shutdown();
    await server.close();
  }
});

await test("AI Studio: analytics settle when a short-circuiting stream is abandoned before finish", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioTextTurn("should never be reached"),
  );
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: {
      id: "ai-studio-short-circuit",
      name: "AI Studio short circuit",
    },
    wrapStream: async () => ({
      stream: new ReadableStream<LanguageModelV3StreamPart>({
        start(controller) {
          controller.enqueue({ type: "text-start", id: "sc" });
          controller.enqueue({
            type: "text-delta",
            id: "sc",
            delta: "partial",
          });
          // Deliberately never enqueues "finish" and never closes — models
          // a short-circuit stream a caller abandons mid-read, the case
          // the pre-fix cleanup (gated only on a "finish" part) never ran.
        },
      }),
    }),
  };
  const nl = new NeuroLink();
  try {
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      disableTools: true,
      disableInternalFallback: true,
      enableAnalytics: true,
      credentials: aiStudioCredentialsFor(server.port),
      middleware: {
        middleware: [middleware],
        enabledMiddleware: ["ai-studio-short-circuit"],
      },
    });
    for await (const chunk of result.stream) {
      if ("content" in chunk && chunk.content) {
        break;
      }
    }
    assert.equal(
      server.calls.length,
      0,
      "synthetic short-circuit stream reached the AI Studio wire — the wrapStream short-circuit did not take effect",
    );
    assert.ok(
      result.analytics,
      "no analytics promise was exposed on the short-circuit stream",
    );
    const analytics = await bounded(Promise.resolve(result.analytics), 5000);
    assert.ok(
      (analytics as AnalyticsData).stopReason,
      "abandoned short-circuit stream settled analytics with no stopReason",
    );
  } finally {
    await nl.shutdown();
    await server.close();
  }
});

await test("AI Studio: generate usage preserves cache-read and reasoning tokens from the native turn", async () => {
  const server = await startAiStudioStandIn(() =>
    aiStudioCacheUsageTurn("hello from ai studio"),
  );
  const nl = new NeuroLink();
  try {
    const result = await nl.generate({
      input: { text: "hi" },
      provider: "google-ai",
      model: AI_STUDIO_MODEL,
      disableTools: true,
      disableInternalFallback: true,
      credentials: aiStudioCredentialsFor(server.port),
    });
    assert.ok(server.calls.length > 0, "AI Studio stand-in was never reached");
    assert.equal(
      result.content,
      "hello from ai studio",
      "AI Studio generate content lost while exercising cache/reasoning usage",
    );
    assert.equal(
      result.usage?.cacheReadTokens,
      800,
      "cache-read tokens from the native AI Studio turn were dropped from the generate result's usage",
    );
    assert.equal(
      result.usage?.reasoning,
      50,
      "reasoning tokens from the native AI Studio turn were dropped from the generate result's usage",
    );
    assert.equal(
      result.usage?.total,
      1150,
      "the generate result's usage total undercounted once cache/reasoning tokens were introduced",
    );
  } finally {
    await nl.shutdown();
    await server.close();
  }
});

// A synthetic model-level middleware that short-circuits doStream and
// returns a hand-built, true V3 delta-shaped stream: `{type: "text-delta",
// delta: "..."}`, with no legacy `textDelta` field anywhere — exactly the
// shape the OpenAI-compatible bridge (and, per the original Bedrock report,
// Bedrock's) emits. Reasoning is split across two deltas ("Hel"/"lo")
// rather than delivered as one chunk: a single-delta stream can't
// distinguish "fired once per chunk" from "fired once total", which is
// precisely the distinction this regression needs.
const v3DeltaStream: NeuroLinkMiddleware = {
  specificationVersion: "v3",
  metadata: { id: "v3-delta-stream", name: "V3 delta stream" },
  wrapStream: async () => ({
    stream: new ReadableStream<LanguageModelV3StreamPart>({
      start(controller) {
        controller.enqueue({ type: "text-start", id: "r1" });
        controller.enqueue({ type: "text-delta", id: "r1", delta: "Hel" });
        controller.enqueue({ type: "text-delta", id: "r1", delta: "lo" });
        controller.enqueue({ type: "text-end", id: "r1" });
        controller.enqueue({
          type: "finish",
          finishReason: { unified: "stop" },
          usage: { inputTokens: { total: 0 }, outputTokens: { total: 0 } },
        });
        controller.close();
      },
    }),
  }),
};

await test("stream() fires onChunk/onFinish exactly once per real chunk through the native V3 middleware chain (lifecycle double-fire regression)", async () => {
  // The mock server exists only to give the SDK a valid provider/model/
  // credentials triple to resolve; v3DeltaStream's wrapStream pre-empts
  // doStream entirely, so the assertion below that the wire was never hit
  // is the precondition proving this test measures the middleware chain,
  // not a real network round trip.
  const server = await startMockChatServer();
  const sdk = new NeuroLink();
  const onChunkCalls: LifecycleChunkPayload[] = [];
  const onFinishCalls: LifecycleFinishPayload[] = [];
  try {
    const result = await sdk.stream({
      input: { text: "hello" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      disableInternalFallback: true,
      credentials: mockOpenAICredentials(server),
      middleware: {
        middleware: [v3DeltaStream],
        enabledMiddleware: ["v3-delta-stream"],
      },
      onChunk: (payload) => {
        onChunkCalls.push(payload);
      },
      onFinish: (payload) => {
        onFinishCalls.push(payload);
      },
    });

    assert.equal(
      await bounded(readText(result)),
      "Hello",
      "the stream's own text content was wrong",
    );

    assert.equal(
      server.getAllRequestBodies().length,
      0,
      "the synthetic V3 stream should have pre-empted the real wire call",
    );

    const textDeltaCalls = onChunkCalls.filter((c) => c.type === "text-delta");
    // Precondition for every assertion below that indexes or concatenates
    // textDeltaCalls: fail on the count first, with its own message,
    // before a length-dependent assertion below could fail confusingly.
    assert.equal(
      textDeltaCalls.length,
      2,
      "onChunk's text-delta call count did not match the real chunk count — it must fire exactly once per chunk, not duplicated",
    );
    for (const call of textDeltaCalls) {
      assert.equal(
        typeof call.textDelta,
        "string",
        "a text-delta onChunk payload carried no text",
      );
    }
    // Built with += (not Array#join, which silently maps undefined to "")
    // so a reintroduced textDelta-field bug surfaces as a literal
    // "undefined" substring here exactly as it would for a real caller
    // concatenating chunks.
    let joinedChunkText = "";
    for (const call of textDeltaCalls) {
      joinedChunkText += call.textDelta;
    }
    assert.equal(
      joinedChunkText,
      "Hello",
      "accumulated onChunk text did not match the real deltas",
    );

    assert.equal(
      onFinishCalls.length,
      1,
      "onFinish fired a different number of times than exactly once",
    );
    assert.equal(
      onFinishCalls[0]?.text,
      "Hello",
      "onFinish's accumulated text was wrong",
    );
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

await test("createLifecycleMiddleware applied directly to a hand-built V3 model, bypassing BaseProvider entirely, still fires onChunk/onFinish exactly once (standalone consumers are unaffected)", async () => {
  // This reproduces what an external consumer does with the exported
  // `createLifecycleMiddleware`: apply it to their own V3 LanguageModel via
  // a middleware composer, entirely outside NeuroLink.stream()/generate()
  // and BaseProvider. The real `ai` package is not a dependency of this
  // project (confirmed against package.json — "ai" appears only in the
  // keywords array, and node_modules/ai does not exist), and NeuroLink's
  // own src/lib/middleware/wrapLanguageModel.ts is an internal, unexported
  // implementation detail, not part of the public surface a consumer could
  // import. What a `wrapLanguageModel` composer does — call the
  // middleware's own `wrapStream` with a `doStream` that resolves the
  // underlying model's `doStream` — is reproduced inline below, which
  // exercises the exact same `middleware.wrapStream` entry point any such
  // composer would call.
  const onChunkCalls: LifecycleChunkPayload[] = [];
  const onFinishCalls: LifecycleFinishPayload[] = [];

  const fakeModel: LanguageModelV3 = {
    specificationVersion: "v3",
    provider: "standalone-test",
    modelId: "standalone-test-model",
    supportedUrls: {},
    doGenerate: () =>
      Promise.reject(
        new Error(
          "doGenerate should not be called by a stream-only standalone test",
        ),
      ),
    doStream: async () => ({
      stream: new ReadableStream<LanguageModelV3StreamPart>({
        start(controller) {
          controller.enqueue({ type: "text-start", id: "r1" });
          controller.enqueue({ type: "text-delta", id: "r1", delta: "Hel" });
          controller.enqueue({ type: "text-delta", id: "r1", delta: "lo" });
          controller.enqueue({ type: "text-end", id: "r1" });
          controller.enqueue({
            type: "finish",
            finishReason: { unified: "stop" },
            usage: { inputTokens: { total: 0 }, outputTokens: { total: 0 } },
          });
          controller.close();
        },
      }),
    }),
  };

  const middleware = createLifecycleMiddleware({
    onChunk: (payload) => {
      onChunkCalls.push(payload);
    },
    onFinish: (payload) => {
      onFinishCalls.push(payload);
    },
  });

  if (!middleware.wrapStream) {
    throw new Error(
      "createLifecycleMiddleware's returned middleware has no wrapStream",
    );
  }

  const params: LanguageModelV3CallOptions = { prompt: [] };
  const streamResult = await middleware.wrapStream({
    doGenerate: () => fakeModel.doGenerate(params),
    doStream: () => fakeModel.doStream(params),
    params,
    model: fakeModel,
  });

  const reader = streamResult.stream.getReader();
  for (;;) {
    const next = await reader.read();
    if (next.done) {
      break;
    }
  }

  const textDeltaCalls = onChunkCalls.filter((c) => c.type === "text-delta");
  assert.equal(
    textDeltaCalls.length,
    2,
    "the standalone path's onChunk count changed — it must still fire once per real text-delta chunk, exactly as it did before BaseProvider's dedup existed",
  );
  let joinedChunkText = "";
  for (const call of textDeltaCalls) {
    joinedChunkText += call.textDelta;
  }
  assert.equal(
    joinedChunkText,
    "Hello",
    "the standalone path's accumulated chunk text was wrong",
  );

  assert.equal(
    onFinishCalls.length,
    1,
    "the standalone path's onFinish fire count changed",
  );
  assert.equal(
    onFinishCalls[0]?.text,
    "Hello",
    "the standalone path's onFinish text was wrong",
  );
});

// ---------------------------------------------------------------------------
// VERTEX — native stream() lifecycle callbacks (double-fire regression).
//
// GoogleVertexProvider's native @google/genai stream path (like AI Studio
// above) bypasses the AI SDK LanguageModel plumbing entirely, so it carries
// its OWN direct lifecycle firer (`wrapStreamResultWithLifecycle` in
// src/lib/providers/googleVertex/client.ts) for the SAME reason AI Studio
// needed middleware reproduced natively. Unlike AI Studio's model-level
// middleware (gated by `isLifecycleStreamCallbacksOwnedByBaseProvider` since
// the v3DeltaStream fix above), Vertex's firer was never gated: every native
// Vertex stream's result is ALSO passed, unconditionally, through
// `BaseProvider.wrapStreamWithLifecycleCallbacks` afterwards (see that
// method's own "no early return when there are no callbacks" doc comment),
// so onChunk/onFinish each fired twice — once from Vertex's own firer
// (enriched with usage/finishReason), once from BaseProvider's generic one
// (bare `{text, duration}`). Vertex AI Express Mode
// (`credentials.vertex.apiKey` with no project/location) skips ADC entirely
// and reaches `credentials.vertex.baseURL`, the same mechanism
// continuous-test-suite-vertex-loop-characterization.ts uses, so this is
// reachable offline.
// ---------------------------------------------------------------------------

const VERTEX_MODEL = "gemini-2.0-flash";

// Cleared for the duration of the test so a dev machine's ambient ADC
// configuration (a real GOOGLE_APPLICATION_CREDENTIALS file, a real
// project/location pair) can't divert the call away from Express Mode's
// apiKey+baseURL path and toward a real network call.
const TOUCHED_VERTEX_ENV_VARS = [
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

function withVertexEnv(): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_VERTEX_ENV_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  return () => {
    for (const key of TOUCHED_VERTEX_ENV_VARS) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

type VertexStandInCall = { body: Record<string, unknown> };
type VertexStandIn = {
  calls: VertexStandInCall[];
  port: number;
  close: () => Promise<void>;
};

// Reuses `aiStudioTextTurn`'s Gemini REST SSE framing — Vertex's native
// @google/genai client and AI Studio's speak the identical wire format, the
// only difference is which base URL / auth the SDK is pointed at. One
// `usageMetadata` (promptTokenCount: 5, candidatesTokenCount: 4) backs this
// section's usage-enrichment assertions below.
async function startVertexStandIn(
  reply: (callIndex: number) => string,
): Promise<VertexStandIn> {
  const calls: VertexStandInCall[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        body = {};
      }
      calls.push({ body });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(reply(calls.length - 1));
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

function vertexCredentialsFor(port: number) {
  return {
    vertex: {
      apiKey: "express-key",
      baseURL: `http://127.0.0.1:${port}`,
    },
  };
}

await test("Vertex: stream() fires onChunk/onFinish exactly once through the native Gemini stream path (lifecycle double-fire regression)", async () => {
  const restoreEnv = withVertexEnv();
  const server = await startVertexStandIn(() => aiStudioTextTurn("Hello"));
  const sdk = new NeuroLink();
  const onChunkCalls: LifecycleChunkPayload[] = [];
  const onFinishCalls: LifecycleFinishPayload[] = [];
  const onErrorCalls: unknown[] = [];
  try {
    const result = await sdk.stream({
      input: { text: "hi" },
      provider: "vertex",
      model: VERTEX_MODEL,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      onChunk: (payload) => {
        onChunkCalls.push(payload);
      },
      onFinish: (payload) => {
        onFinishCalls.push(payload);
      },
      onError: (payload) => {
        onErrorCalls.push(payload);
      },
    });

    assert.equal(
      await bounded(readText(result)),
      "Hello",
      "the stream's own text content was wrong",
    );

    assert.equal(
      server.calls.length,
      1,
      "the Vertex stand-in was not called exactly once — this test's other assertions would not be measuring a single real turn",
    );

    const textDeltaCalls = onChunkCalls.filter((c) => c.type === "text-delta");
    assert.equal(
      textDeltaCalls.length,
      1,
      "onChunk fired a different number of times than exactly once — Vertex's own native firer and BaseProvider's generic wrapper both fired for the same chunk",
    );
    assert.equal(
      textDeltaCalls[0]?.textDelta,
      "Hello",
      "the single onChunk fire carried the wrong text",
    );

    assert.equal(
      onFinishCalls.length,
      1,
      "onFinish fired a different number of times than exactly once — Vertex's own native firer and BaseProvider's generic wrapper both fired for the same turn",
    );
    assert.equal(
      onFinishCalls[0]?.text,
      "Hello",
      "the single onFinish fire carried the wrong accumulated text",
    );
    assert.equal(
      onFinishCalls[0]?.usage?.promptTokens,
      5,
      "the surviving onFinish fire lost the usage enrichment (promptTokens) that only Vertex's own firer used to carry",
    );
    assert.equal(
      onFinishCalls[0]?.usage?.completionTokens,
      4,
      "the surviving onFinish fire lost the usage enrichment (completionTokens) that only Vertex's own firer used to carry",
    );
    assert.equal(
      onFinishCalls[0]?.finishReason,
      "stop",
      "the surviving onFinish fire lost the finishReason enrichment that only Vertex's own firer used to carry",
    );

    assert.equal(
      onErrorCalls.length,
      0,
      "onError fired on a clean single-turn response",
    );
  } finally {
    await sdk.shutdown();
    await server.close();
    restoreEnv();
  }
});

await runSuite();

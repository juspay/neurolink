#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Public generate()/stream() middleware contracts for the OpenAI-compatible
 * family, plus dedicated sections for AI Studio, Vertex, Bedrock and the
 * direct Anthropic stream near the end of the file. Local HTTP fixtures
 * prove prompt rewrites, real tool execution, guardrail blocking/filtering,
 * error propagation, completion and cancellation.
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
  GenerateOptions,
  StreamOptions,
  StreamResult,
  AnalyticsData,
  MiddlewareFactoryOptions,
  OnFinishCallback,
  OnErrorCallback,
  OnChunkCallback,
  LifecycleFinishPayload,
  LifecycleErrorPayload,
  LifecycleChunkPayload,
} from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  mockOpenAICredentials,
  startMockChatServer,
  startScriptedChatServer,
  chatCompletion,
} from "./helpers/mockChatServer.js";
import {
  startLocalBedrock,
  PLACEHOLDER_AWS_ENV,
  type CapturedRequest,
  type LocalBedrock,
} from "./helpers/bedrockLocalEndpoint.js";
import {
  NeuroLink,
  logger,
  tool,
  createLifecycleMiddleware,
  type AIProviderName,
} from "../dist/index.js";

assertDistFresh();

// These cases use local or inline tools. External MCP startup can exceed
// the transport probe deadlines under the credential-free, throwaway HOME.
process.env.NEUROLINK_SKIP_MCP = "true";

const { test, section, runSuite } = defineSuite("Stream middleware", {
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

await test("a synthetic blocking stream that closes without a finish part still completes", async () => {
  // A middleware that blocks the request supplies its own stream, and nothing
  // obliges it to end with a V3 "finish" part. The stream's terminal step
  // waits on the finish signal, which only a "finish" part or a started loop
  // ever settles — so a stream that simply closed left the reader hanging
  // with no timeout.
  const server = await startMockChatServer();
  const sdk = new NeuroLink();
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "block-stream-no-finish", name: "Block stream, no finish" },
    wrapStream: async () => ({
      stream: new ReadableStream<LanguageModelV3StreamPart>({
        start(controller) {
          controller.enqueue({ type: "text-start", id: "blocked" });
          controller.enqueue({
            type: "text-delta",
            id: "blocked",
            delta: "BLOCKED",
          });
          controller.enqueue({ type: "text-end", id: "blocked" });
          controller.close();
        },
      }),
    }),
  };
  try {
    const result = await sdk.stream({
      input: { text: "block this" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      disableInternalFallback: true,
      credentials: mockOpenAICredentials(server),
      middleware: {
        middleware: [middleware],
        enabledMiddleware: ["block-stream-no-finish"],
      },
    });
    assert.equal(
      await bounded(readText(result)),
      "BLOCKED",
      "blocked content lost",
    );
    assert.equal(
      server.getAllRequestBodies().length,
      0,
      "blocked request reached HTTP",
    );
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

await test("a middleware stream's own finish reason reaches metadata.finishReason and result.finishReason unchanged", async () => {
  // A blocking middleware supplies its own V3 finish part and nothing reaches
  // the wire, so the only place the reason can come from is that part, which
  // already carries the unified spelling. "stop" is the control: it must stay
  // "stop", so the other two cases are not a stream that always reports the
  // last thing it was told.
  const server = await startMockChatServer();
  const sdk = new NeuroLink();
  const unifiedReasons = ["length", "content-filter", "stop"] as const;
  try {
    for (const [index, unified] of unifiedReasons.entries()) {
      const id = `finish-reason-${index}`;
      const middleware: NeuroLinkMiddleware = {
        specificationVersion: "v3",
        metadata: { id, name: `Finish reason ${index}` },
        wrapStream: async () => ({
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
                finishReason: { unified },
                usage: {
                  inputTokens: { total: 0 },
                  outputTokens: { total: 0 },
                },
              });
              controller.close();
            },
          }),
        }),
      };
      const result = await sdk.stream({
        input: { text: "block this" },
        provider: "openai",
        model: "gpt-4o-mini",
        disableTools: true,
        disableInternalFallback: true,
        credentials: mockOpenAICredentials(server),
        middleware: {
          middleware: [middleware],
          enabledMiddleware: [id],
        },
      });
      assert.equal(
        await bounded(readText(result)),
        "BLOCKED",
        `blocked content lost in finish case ${index}`,
      );
      assert.equal(
        result.metadata?.finishReason,
        unified,
        `metadata.finishReason drifted from the middleware's finish part in finish case ${index}`,
      );
      assert.equal(
        result.finishReason,
        unified,
        `result.finishReason drifted from the middleware's finish part in finish case ${index}`,
      );
    }
    assert.equal(
      server.getAllRequestBodies().length,
      0,
      "a synthetic stream reached the wire",
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
// VERTEX — native generate()/stream() loops (Item E4b).
//
// AI Studio and Bedrock get their own sections in separate PRs; this one is
// Vertex-only. Vertex has FOUR native loops — Gemini3 and Anthropic-on-Vertex,
// each with its own generate() and stream() — that used to call
// executeNative*Generate/executeNative*Stream directly, bypassing
// `applyMiddlewareToModel` entirely: the `middleware` option was accepted and
// silently had no effect. `runNativeGenerateWithMiddleware` /
// `runNativeStreamWithMiddleware` in googleVertex/client.ts now wrap every one
// of the four with the same `wrapLanguageModel` chain every other provider
// already goes through.
//
// Reaching any of this offline needs Vertex AI Express Mode
// (`credentials.vertex.apiKey` with no project/location, which skips ADC and
// honours `credentials.vertex.baseURL`) — the same affordance
// vertex-loop-characterization.ts and vertex-claude-characterization.ts rely
// on. Neither file exports its helpers, so the pieces needed here (env
// clearing, the two wire formats' SSE builders, the two stand-ins) are
// re-implemented locally rather than imported.
// ---------------------------------------------------------------------------

section("Vertex");

const GEMINI_MODEL = "gemini-2.0-flash";
const ANTHROPIC_MODEL = "claude-3-5-sonnet-v2@20241022";

/**
 * Every env var that could pull the provider onto the ADC path instead of
 * Express Mode. All four project-name fallbacks matter — clearing only one
 * leaves an ambient project on a dev machine hiding the very path under test.
 */
const VERTEX_TOUCHED_ENV_VARS = [
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
  for (const key of VERTEX_TOUCHED_ENV_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  return () => {
    for (const key of VERTEX_TOUCHED_ENV_VARS) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

function vertexCredentialsFor(port: number) {
  return {
    vertex: { apiKey: "express-key", baseURL: `http://127.0.0.1:${port}` },
  };
}

type VertexCapturedFinish = {
  finishReasonUnified: string;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
};

// --- Gemini3 wire: Gemini `generateContentStream` SSE framing --------------

function geminiSse(
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

function geminiTextTurn(text: string): string {
  return geminiSse([{ text }], "STOP");
}

type GeminiStandInCall = { body: Record<string, unknown> };
type GeminiStandIn = {
  calls: GeminiStandInCall[];
  port: number;
  close: () => Promise<void>;
};

/** An SSE body, or a JSON error the stand-in answers with a non-200 status. */
type GeminiStandInReply = string | { status: number; json: unknown };

async function startGeminiStandIn(
  reply: (callIndex: number) => GeminiStandInReply,
): Promise<GeminiStandIn> {
  const calls: GeminiStandInCall[] = [];
  const httpServer: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        // Malformed body — keep it empty rather than fail the request.
      }
      calls.push({ body });
      const answer = reply(calls.length - 1);
      if (typeof answer === "string") {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(answer);
        res.end();
        return;
      }
      res.writeHead(answer.status, { "content-type": "application/json" });
      res.end(JSON.stringify(answer.json));
    });
  });
  await new Promise<void>((resolve) =>
    httpServer.listen(0, "127.0.0.1", resolve),
  );
  const address = httpServer.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => httpServer.close(() => resolve())),
  };
}

// --- Anthropic-on-Vertex wire: Anthropic Messages SSE framing --------------

function anthropicSse(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;
}

/** A turn that emits text and stops — the full message shape, since
 * `MessageStream` builds its running snapshot from `message_start` and dies
 * pushing onto `snapshot.content` without it. */
function anthropicTextTurn(text: string): string[] {
  return [
    anthropicSse("message_start", {
      message: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: ANTHROPIC_MODEL,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 5, output_tokens: 0 },
      },
    }),
    anthropicSse("content_block_start", {
      index: 0,
      content_block: { type: "text", text: "" },
    }),
    anthropicSse("content_block_delta", {
      index: 0,
      delta: { type: "text_delta", text },
    }),
    anthropicSse("content_block_stop", { index: 0 }),
    anthropicSse("message_delta", {
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 4 },
    }),
    anthropicSse("message_stop", {}),
  ];
}

type AnthropicStandInCall = { body: Record<string, unknown> };
type AnthropicStandIn = {
  calls: AnthropicStandInCall[];
  port: number;
  close: () => Promise<void>;
};

/**
 * Folds a case's SSE frames into the single JSON message the non-streaming
 * endpoint returns, so one fixture serves both wire modes:
 * executeNativeAnthropicStream calls `messages.stream` (SSE), while
 * executeNativeAnthropicGenerate calls `messages.create` (single JSON body).
 */
function anthropicMessageFromFrames(frames: string[]): Record<string, unknown> {
  const events = frames.map(
    (frame) =>
      JSON.parse(frame.slice(frame.indexOf("data: ") + 6).trim()) as Record<
        string,
        unknown
      >,
  );
  const start = events.find((e) => e.type === "message_start") as
    | { message?: Record<string, unknown> }
    | undefined;
  const message: Record<string, unknown> = { ...(start?.message ?? {}) };
  const content: Array<Record<string, unknown>> = [];
  for (const event of events) {
    if (event.type === "content_block_start") {
      content.push({
        ...((event.content_block as Record<string, unknown>) ?? {}),
      });
    }
    if (event.type === "content_block_delta") {
      const delta = (event.delta ?? {}) as Record<string, unknown>;
      const block = content[content.length - 1];
      if (!block) {
        continue;
      }
      if (typeof delta.text === "string") {
        block.text = `${block.text ?? ""}${delta.text}`;
      }
    }
    if (event.type === "message_delta") {
      Object.assign(message, (event.delta ?? {}) as Record<string, unknown>);
      // `usage` on a message_delta frame is a SIBLING of `delta`, not nested
      // inside it (see anthropicTextTurn above) — the real output-token count
      // lives here, not in message_start's initial `{ output_tokens: 0 }`
      // snapshot. Merge it into the running usage instead of dropping it, so
      // the folded message this function returns (the non-streaming stand-in
      // reply executeNativeAnthropicGenerate's forced-finalization and
      // backstop calls consume) carries the real token count rather than the
      // stale start-of-turn one.
      if (event.usage) {
        message.usage = {
          ...(message.usage as Record<string, unknown> | undefined),
          ...(event.usage as Record<string, unknown>),
        };
      }
    }
  }
  message.content = content;
  return message;
}

async function startAnthropicStandIn(
  reply: (callIndex: number) => string[],
): Promise<AnthropicStandIn> {
  const calls: AnthropicStandInCall[] = [];
  const httpServer: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        // Malformed body — keep it empty rather than fail the request.
      }
      calls.push({ body });
      const frames = reply(calls.length - 1);
      if (body.stream === true) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        for (const frame of frames) {
          res.write(frame);
        }
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(anthropicMessageFromFrames(frames)));
    });
  });
  await new Promise<void>((resolve) =>
    httpServer.listen(0, "127.0.0.1", resolve),
  );
  const address = httpServer.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => httpServer.close(() => resolve())),
  };
}

/**
 * Opens with the first frames of a turn and then never finishes the response
 * — the upstream a consumer walks away from mid-stream. `closedResponses()`
 * counts responses whose connection ended. Nothing here ever ends one, so a
 * client abort is the only thing that can raise it: it is the evidence that
 * the call was released rather than merely abandoned.
 */
type AnthropicHoldOpenStandIn = AnthropicStandIn & {
  closedResponses: () => number;
};

async function startAnthropicHoldOpenStandIn(): Promise<AnthropicHoldOpenStandIn> {
  const calls: AnthropicStandInCall[] = [];
  let closed = 0;
  const httpServer: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        // Malformed body — keep it empty rather than fail the request.
      }
      calls.push({ body });
      res.on("close", () => {
        closed += 1;
      });
      res.writeHead(200, { "content-type": "text/event-stream" });
      // message_start, content_block_start, one text delta — then silence.
      for (const frame of anthropicTextTurn("held-open reply").slice(0, 3)) {
        res.write(frame);
      }
    });
  });
  await new Promise<void>((resolve) =>
    httpServer.listen(0, "127.0.0.1", resolve),
  );
  const address = httpServer.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    closedResponses: () => closed,
    close: () => {
      httpServer.closeAllConnections();
      return new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}

// --- What one upstream request carried, read through each wire format ------
//
// The two formats name the same things differently, so a case that asserts on
// "the system prompt" or "the sampling params" reads them through the loop's
// own reader instead of searching the serialized body for a string. A body
// search cannot tell the system prompt from the user turn.

type VertexWire = {
  system: string | undefined;
  userTexts: string[];
  temperature: number | undefined;
  topP: number | undefined;
  maxTokens: number | undefined;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

/** The `text` of every entry in a parts array, or the string itself. */
const textsOf = (parts: unknown): string[] => {
  if (typeof parts === "string") {
    return [parts];
  }
  return Array.isArray(parts)
    ? parts.flatMap((part) => {
        const text = asRecord(part).text;
        return typeof text === "string" ? [text] : [];
      })
    : [];
};

const joinedOrUndefined = (texts: string[]): string | undefined =>
  texts.length > 0 ? texts.join("\n") : undefined;

const entriesWithRole = (entries: unknown, role: string): unknown[] =>
  (Array.isArray(entries) ? entries : []).filter(
    (entry) => asRecord(entry).role === role,
  );

function geminiWire(body: Record<string, unknown>): VertexWire {
  const config = asRecord(body.generationConfig);
  return {
    system: joinedOrUndefined(textsOf(asRecord(body.systemInstruction).parts)),
    userTexts: entriesWithRole(body.contents, "user").flatMap((entry) =>
      textsOf(asRecord(entry).parts),
    ),
    temperature: asNumber(config.temperature),
    topP: asNumber(config.topP),
    maxTokens: asNumber(config.maxOutputTokens),
  };
}

function anthropicWire(body: Record<string, unknown>): VertexWire {
  return {
    system: joinedOrUndefined(textsOf(body.system)),
    userTexts: entriesWithRole(body.messages, "user").flatMap((entry) =>
      textsOf(asRecord(entry).content),
    ),
    temperature: asNumber(body.temperature),
    topP: asNumber(body.top_p),
    maxTokens: asNumber(body.max_tokens),
  };
}

// --- One case per native loop -----------------------------------------------

type VertexStandIn = {
  calls: Array<{ body: Record<string, unknown> }>;
  port: number;
  close: () => Promise<void>;
};

type VertexLoop = {
  label: string;
  mode: "generate" | "stream";
  model: string;
  start: (reply: string) => Promise<VertexStandIn>;
  wire: (body: Record<string, unknown>) => VertexWire;
};

const VERTEX_REPLY = "vertex reply text";
const USER_TEXT = "ORIGINAL_USER_QUESTION";
const SYSTEM_TEXT = "ORIGINAL_SYSTEM_RULES";

const VERTEX_LOOPS: readonly VertexLoop[] = [
  {
    label: "Gemini native generate",
    mode: "generate",
    model: GEMINI_MODEL,
    start: (reply) => startGeminiStandIn(() => geminiTextTurn(reply)),
    wire: geminiWire,
  },
  {
    label: "Gemini native stream",
    mode: "stream",
    model: GEMINI_MODEL,
    start: (reply) => startGeminiStandIn(() => geminiTextTurn(reply)),
    wire: geminiWire,
  },
  {
    label: "Anthropic native generate",
    mode: "generate",
    model: ANTHROPIC_MODEL,
    start: (reply) => startAnthropicStandIn(() => anthropicTextTurn(reply)),
    wire: anthropicWire,
  },
  {
    label: "Anthropic native stream",
    mode: "stream",
    model: ANTHROPIC_MODEL,
    start: (reply) => startAnthropicStandIn(() => anthropicTextTurn(reply)),
    wire: anthropicWire,
  },
];
const GENERATE_LOOPS = VERTEX_LOOPS.filter((loop) => loop.mode === "generate");
const STREAM_LOOPS = VERTEX_LOOPS.filter((loop) => loop.mode === "stream");

type VertexCallExtras = {
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  enableAnalytics?: boolean;
  middleware?: MiddlewareFactoryOptions;
  onFinish?: OnFinishCallback;
  onError?: OnErrorCallback;
  onChunk?: OnChunkCallback;
};

type VertexRun = {
  text: string;
  analytics: AnalyticsData | undefined;
  bodies: Array<Record<string, unknown>>;
};

/**
 * Lifecycle callbacks are invoked through promise wrappers with deadline
 * timers, so a callback that fires late needs time to show up before a count
 * is read as final. The floor assertion beside every count proves the
 * callbacks were live; this window is what gives the ceilings their meaning.
 */
const settleLifecycle = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, 250));

/** Runs one call on `loop` against a fresh stand-in and reports what it saw. */
async function runVertexLoop(
  loop: VertexLoop,
  extras: VertexCallExtras = {},
): Promise<VertexRun> {
  const server = await loop.start(VERTEX_REPLY);
  const restoreEnv = withVertexEnv();
  const sdk = new NeuroLink();
  try {
    const options = {
      input: { text: USER_TEXT },
      provider: "vertex" as const,
      model: loop.model,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      ...extras,
    };
    if (loop.mode === "generate") {
      const result = await sdk.generate(options);
      await settleLifecycle();
      return {
        text: result.content,
        analytics: result.analytics,
        bodies: server.calls.map((call) => call.body),
      };
    }
    const result = await sdk.stream(options);
    const text = await bounded(readText(result));
    const analytics = await bounded(Promise.resolve(result.analytics));
    await settleLifecycle();
    return {
      text,
      analytics,
      bodies: server.calls.map((call) => call.body),
    };
  } finally {
    await sdk.shutdown();
    restoreEnv();
    await server.close();
  }
}

/**
 * Runs one call on `loop.model` through the legacy prompt-only
 * `generateText()` convention instead of `generate()`/`stream()`:
 * `options.prompt` carries the caller's text and `options.input` is never
 * set at all. This is a real, currently-supported calling convention — see
 * `generateTextInInstanceScope` in `src/lib/neurolink.ts`, which validates
 * `options.prompt` and never touches `options.input` — not a contrived
 * shape. `runVertexLoop` above always sets `input.text`, so it cannot
 * exercise this path; this is only meaningful on the generate loops, since
 * `StreamOptions` has no top-level `prompt` field and `streamText()` always
 * normalizes to `input.text` before a provider ever sees it.
 */
async function runVertexLoopPromptOnly(
  loop: VertexLoop,
  extras: VertexCallExtras = {},
): Promise<VertexRun> {
  const server = await loop.start(VERTEX_REPLY);
  const restoreEnv = withVertexEnv();
  const sdk = new NeuroLink();
  try {
    const result = await sdk.generateText({
      prompt: USER_TEXT,
      provider: "vertex" as AIProviderName,
      model: loop.model,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      ...extras,
    });
    await settleLifecycle();
    return {
      text: result.content,
      analytics: result.analytics,
      bodies: server.calls.map((call) => call.body),
    };
  } finally {
    await sdk.shutdown();
    restoreEnv();
    await server.close();
  }
}

/**
 * The first upstream request, read through the loop's wire format. Throws
 * when none arrived, so an assertion about what a request lacks can never
 * pass on a request that was never sent.
 */
function wireOf(loop: VertexLoop, run: VertexRun): VertexWire {
  const body = run.bodies[0];
  if (!body) {
    throw new Error(`the ${loop.label} stand-in was never reached`);
  }
  return loop.wire(body);
}

type MiddlewareParams = Parameters<
  NonNullable<NeuroLinkMiddleware["transformParams"]>
>[0]["params"];
type V3Prompt = MiddlewareParams["prompt"];
type V3UserMessage = Extract<V3Prompt[number], { role: "user" }>;
type V3UserParts = Exclude<V3UserMessage["content"], string>;

/**
 * Prompt content as a middleware written against the V3 spec sees it: a list
 * of parts. The spec has no string form for a user turn, so such a middleware
 * does not check for one — which is exactly why handing it a string breaks it.
 */
const partsOf = (content: V3UserMessage["content"]): V3UserParts =>
  content as V3UserParts;

/**
 * A `transformParams` middleware that records the params it was given before
 * applying `rewrite`. `seen` is the precondition for every case that asserts
 * on a rewrite: an empty `seen` means the middleware never ran, and whatever
 * the wire then shows says nothing about it.
 */
function paramsProbe(
  id: string,
  rewrite: (params: MiddlewareParams) => MiddlewareParams,
): { middleware: MiddlewareFactoryOptions; seen: MiddlewareParams[] } {
  const seen: MiddlewareParams[] = [];
  const probe: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id, name: id },
    transformParams: async ({ params }) => {
      seen.push(params);
      return rewrite(params);
    },
  };
  return {
    middleware: { middleware: [probe], enabledMiddleware: [id] },
    seen,
  };
}

const promptRewrite =
  (rewrite: (prompt: V3Prompt) => V3Prompt) =>
  (params: MiddlewareParams): MiddlewareParams => ({
    ...params,
    prompt: rewrite(params.prompt),
  });

/** A middleware that observes and changes nothing, counting which hook ran. */
function countingProbe(id: string): {
  middleware: MiddlewareFactoryOptions;
  counts: { generate: number; stream: number };
} {
  const counts = { generate: 0, stream: 0 };
  const probe: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id, name: id },
    wrapGenerate: async ({ doGenerate }) => {
      counts.generate += 1;
      return doGenerate();
    },
    wrapStream: async ({ doStream }) => {
      counts.stream += 1;
      return doStream();
    },
  };
  return {
    middleware: { middleware: [probe], enabledMiddleware: [id] },
    counts,
  };
}

function captureLifecycle(): {
  finishes: LifecycleFinishPayload[];
  errors: LifecycleErrorPayload[];
  chunks: LifecycleChunkPayload[];
  onFinish: OnFinishCallback;
  onError: OnErrorCallback;
  onChunk: OnChunkCallback;
} {
  const finishes: LifecycleFinishPayload[] = [];
  const errors: LifecycleErrorPayload[] = [];
  const chunks: LifecycleChunkPayload[] = [];
  return {
    finishes,
    errors,
    chunks,
    onFinish: (payload) => {
      finishes.push(payload);
    },
    onError: (payload) => {
      errors.push(payload);
    },
    onChunk: (payload) => {
      chunks.push(payload);
    },
  };
}

// ---------------------------------------------------------------------------
// transformParams reaching the wire — one case per native loop.
// ---------------------------------------------------------------------------

await test("vertex Gemini native generate: a transformParams rewrite reaches the wire", async () => {
  const server = await startGeminiStandIn(() =>
    geminiTextTurn("gemini generate reply"),
  );
  const restoreEnv = withVertexEnv();
  const record = emptyRecord();
  const sdk = new NeuroLink();
  try {
    const result = await sdk.generate({
      input: { text: "hello vertex" },
      provider: "vertex",
      model: GEMINI_MODEL,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      middleware: middlewareOptions(record),
    });
    if (record.transformParamsCalls.length === 0) {
      throw new Error(
        "the probe never ran on the vertex Gemini native generate path",
      );
    }
    if (server.calls.length === 0) {
      throw new Error("the vertex Gemini stand-in was never reached");
    }
    const userText = geminiWire(server.calls[0]?.body ?? {}).userTexts.join(
      "\n",
    );
    if (!userText.includes(MARKER)) {
      throw new Error(
        "the transformParams rewrite did not reach the wire on vertex Gemini native generate",
      );
    }
    assert.ok(
      userText.includes("hello vertex"),
      "the caller's own text was dropped when the middleware appended a message",
    );
    assert.equal(
      typeof result.content,
      "string",
      "the native generate call did not return text content",
    );
  } finally {
    await sdk.shutdown();
    restoreEnv();
    await server.close();
  }
});

await test("vertex Gemini native stream: a transformParams rewrite reaches the wire and wrapStream observes real usage", async () => {
  const server = await startGeminiStandIn(() =>
    geminiTextTurn("gemini stream reply"),
  );
  const restoreEnv = withVertexEnv();
  const record = emptyRecord();
  const capture: { finish: VertexCapturedFinish | undefined } = {
    finish: undefined,
  };
  const probe: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "vertex-stream-probe", name: "Vertex stream probe" },
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
    wrapStream: async ({ doStream }) => {
      record.wrapStreamCalls += 1;
      const { stream } = await doStream();
      const reader = stream.getReader();
      const relay = new ReadableStream<LanguageModelV3StreamPart>({
        async pull(controller) {
          const next = await reader.read();
          if (next.done) {
            controller.close();
            return;
          }
          if (next.value.type === "finish") {
            capture.finish = {
              finishReasonUnified: next.value.finishReason.unified,
              inputTokens: next.value.usage.inputTokens.total,
              outputTokens: next.value.usage.outputTokens.total,
            };
          }
          controller.enqueue(next.value);
        },
        async cancel(reason) {
          await reader.cancel(reason);
        },
      });
      return { stream: relay };
    },
  };
  const sdk = new NeuroLink();
  try {
    const result = await sdk.stream({
      input: { text: "hello vertex" },
      provider: "vertex",
      model: GEMINI_MODEL,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      middleware: {
        middleware: [probe],
        enabledMiddleware: ["vertex-stream-probe"],
      },
    });
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    if (server.calls.length === 0) {
      throw new Error("the vertex Gemini stand-in was never reached");
    }
    const userText = geminiWire(server.calls[0]?.body ?? {}).userTexts.join(
      "\n",
    );
    if (!userText.includes(MARKER)) {
      throw new Error(
        "the transformParams rewrite did not reach the wire on vertex Gemini native stream",
      );
    }
    assert.ok(
      userText.includes("hello vertex"),
      "the caller's own text was dropped when the middleware appended a message",
    );
    assert.ok(
      text.includes("gemini stream reply"),
      "the native reply text did not reach the consumer",
    );
    if (!capture.finish) {
      throw new Error("wrapStream never observed a finish part");
    }
    assert.ok(
      typeof capture.finish.inputTokens === "number" &&
        capture.finish.inputTokens > 0,
      "wrapStream observed no real input token usage from the native call",
    );
    assert.ok(
      typeof capture.finish.outputTokens === "number" &&
        capture.finish.outputTokens > 0,
      "wrapStream observed no real output token usage from the native call",
    );
  } finally {
    await sdk.shutdown();
    restoreEnv();
    await server.close();
  }
});

await test("vertex Anthropic native generate: a transformParams rewrite reaches the wire", async () => {
  const server = await startAnthropicStandIn(() =>
    anthropicTextTurn("anthropic generate reply"),
  );
  const restoreEnv = withVertexEnv();
  const record = emptyRecord();
  const sdk = new NeuroLink();
  try {
    const result = await sdk.generate({
      input: { text: "hello vertex claude" },
      provider: "vertex",
      model: ANTHROPIC_MODEL,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      middleware: middlewareOptions(record),
    });
    if (record.transformParamsCalls.length === 0) {
      throw new Error(
        "the probe never ran on the vertex Anthropic native generate path",
      );
    }
    if (server.calls.length === 0) {
      throw new Error("the vertex Anthropic stand-in was never reached");
    }
    const userText = anthropicWire(server.calls[0]?.body ?? {}).userTexts.join(
      "\n",
    );
    if (!userText.includes(MARKER)) {
      throw new Error(
        "the transformParams rewrite did not reach the wire on vertex Anthropic native generate",
      );
    }
    assert.ok(
      userText.includes("hello vertex claude"),
      "the caller's own text was dropped when the middleware appended a message",
    );
    assert.equal(
      typeof result.content,
      "string",
      "the native generate call did not return text content",
    );
  } finally {
    await sdk.shutdown();
    restoreEnv();
    await server.close();
  }
});

await test("vertex Anthropic native stream: a transformParams rewrite reaches the wire", async () => {
  const server = await startAnthropicStandIn(() =>
    anthropicTextTurn("anthropic stream reply"),
  );
  const restoreEnv = withVertexEnv();
  const record = emptyRecord();
  const sdk = new NeuroLink();
  try {
    const result = await sdk.stream({
      input: { text: "hello vertex claude" },
      provider: "vertex",
      model: ANTHROPIC_MODEL,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      middleware: middlewareOptions(record),
    });
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    if (record.transformParamsCalls.length === 0) {
      throw new Error(
        "the probe never ran on the vertex Anthropic native stream path",
      );
    }
    if (server.calls.length === 0) {
      throw new Error("the vertex Anthropic stand-in was never reached");
    }
    const userText = anthropicWire(server.calls[0]?.body ?? {}).userTexts.join(
      "\n",
    );
    if (!userText.includes(MARKER)) {
      throw new Error(
        "the transformParams rewrite did not reach the wire on vertex Anthropic native stream",
      );
    }
    assert.ok(
      userText.includes("hello vertex claude"),
      "the caller's own text was dropped when the middleware appended a message",
    );
    assert.ok(
      text.includes("anthropic stream reply"),
      "the native reply text did not reach the consumer",
    );
  } finally {
    await sdk.shutdown();
    restoreEnv();
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// wrapGenerate observing the native result (generate side of the pair above,
// which covered wrapStream).
// ---------------------------------------------------------------------------

await test("vertex Anthropic native generate: wrapGenerate observes a finishReason and real usage from the native call", async () => {
  const server = await startAnthropicStandIn(() =>
    anthropicTextTurn("anthropic generate reply"),
  );
  const restoreEnv = withVertexEnv();
  const capture: { finish: VertexCapturedFinish | undefined } = {
    finish: undefined,
  };
  const probe: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: {
      id: "vertex-generate-usage-probe",
      name: "Vertex generate usage probe",
    },
    wrapGenerate: async ({ doGenerate }) => {
      const generated = await doGenerate();
      capture.finish = {
        finishReasonUnified: generated.finishReason.unified,
        inputTokens: generated.usage.inputTokens.total,
        outputTokens: generated.usage.outputTokens.total,
      };
      return generated;
    },
  };
  const sdk = new NeuroLink();
  try {
    await sdk.generate({
      input: { text: "hello vertex claude" },
      provider: "vertex",
      model: ANTHROPIC_MODEL,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      middleware: {
        middleware: [probe],
        enabledMiddleware: ["vertex-generate-usage-probe"],
      },
    });
    if (!capture.finish) {
      throw new Error("wrapGenerate never observed a result");
    }
    assert.equal(
      capture.finish.finishReasonUnified,
      "stop",
      "the native finish reason was not carried onto the V3 result",
    );
    assert.ok(
      typeof capture.finish.inputTokens === "number" &&
        capture.finish.inputTokens > 0,
      "wrapGenerate observed no real input token usage from the native call",
    );
    assert.ok(
      typeof capture.finish.outputTokens === "number" &&
        capture.finish.outputTokens > 0,
      "wrapGenerate observed no real output token usage from the native call",
    );
  } finally {
    await sdk.shutdown();
    restoreEnv();
    await server.close();
  }
});

await test("vertex Anthropic native generate: a forced-finalization call carries the real message_delta usage, not the message_start snapshot", async () => {
  // maxSteps: 1 drives the agentic loop's reserved step budget to zero (the
  // last step is always reserved for the forced final_result call once a
  // schema is set), so this never visits the main loop at all — it goes
  // straight to executeNativeAnthropicGenerate's forced-finalization branch,
  // the one terminal path that calls `messages.create()` WITHOUT forcing
  // `stream: true`. That is the only way to reach the stand-in's buffered
  // JSON branch (anthropicMessageFromFrames) instead of its SSE passthrough.
  const server = await startAnthropicStandIn(() =>
    anthropicTextTurn("forced finalization reply"),
  );
  const restoreEnv = withVertexEnv();
  const sdk = new NeuroLink();
  try {
    const result = await sdk.generate({
      input: { text: "hello vertex claude" },
      provider: "vertex",
      model: ANTHROPIC_MODEL,
      maxTokens: 32,
      maxSteps: 1,
      disableTools: true,
      disableInternalFallback: true,
      schema: z.object({ answer: z.string() }),
      credentials: vertexCredentialsFor(server.port),
    });
    assert.equal(
      server.calls.length,
      1,
      "expected exactly one forced-finalization call to the vertex Anthropic stand-in",
    );
    assert.equal(
      server.calls[0]?.body.stream,
      undefined,
      "the forced-finalization call unexpectedly requested a streamed response",
    );
    // message_start's initial snapshot carries input_tokens: 5, output_tokens: 0;
    // the turn's message_delta frame carries the real output_tokens: 4 as a
    // SIBLING of `delta`. A fold that drops it leaves result.usage.output at 0.
    assert.equal(
      result.usage?.input,
      5,
      "input tokens from the native Anthropic turn were dropped from the generate result's usage",
    );
    assert.equal(
      result.usage?.output,
      4,
      "the real output-token count from the turn's message_delta frame did not reach the generate result's usage — it fell back to message_start's stale snapshot",
    );
    assert.equal(
      result.usage?.total,
      9,
      "the generate result's usage total did not reflect the real message_delta output-token count",
    );
  } finally {
    await sdk.shutdown();
    restoreEnv();
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// Precall guardrails blocking the call before it reaches the stand-in.
//
// The blocked-branch code in runNativeGenerateWithMiddleware /
// runNativeStreamWithMiddleware is provider-agnostic — it never inspects
// which native loop `callNative` closes over — so exercising it once per
// method (both on Gemini) proves the mechanism for all four loops; it is not
// Gemini-specific.
// ---------------------------------------------------------------------------

await test("vertex Gemini native generate: a precall guardrail blocks the call before it reaches the stand-in", async () => {
  const server = await startGeminiStandIn(() =>
    geminiTextTurn("should never be requested"),
  );
  const restoreEnv = withVertexEnv();
  let invoked = false;
  const blockingMiddleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: {
      id: "vertex-block-gemini-generate",
      name: "Block vertex Gemini generate",
    },
    wrapGenerate: async () => {
      invoked = true;
      return {
        content: [{ type: "text", text: "BLOCKED" }],
        finishReason: { unified: "stop" },
        usage: { inputTokens: { total: 0 }, outputTokens: { total: 0 } },
      };
    },
  };
  const sdk = new NeuroLink();
  try {
    const result = await sdk.generate({
      input: { text: "block this" },
      provider: "vertex",
      model: GEMINI_MODEL,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      middleware: {
        middleware: [blockingMiddleware],
        enabledMiddleware: ["vertex-block-gemini-generate"],
      },
    });
    assert.ok(invoked, "blocking middleware did not run");
    assert.equal(
      server.calls.length,
      0,
      "a call a guardrail blocked still reached the vertex Gemini stand-in",
    );
    assert.equal(
      result.content,
      "BLOCKED",
      "the guardrail's synthesized content was lost",
    );
  } finally {
    await sdk.shutdown();
    restoreEnv();
    await server.close();
  }
});

await test("vertex Gemini native stream: a precall guardrail blocks the call before it reaches the stand-in", async () => {
  const server = await startGeminiStandIn(() =>
    geminiTextTurn("should never be requested"),
  );
  const restoreEnv = withVertexEnv();
  let invoked = false;
  const blockingMiddleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: {
      id: "vertex-block-gemini-stream",
      name: "Block vertex Gemini stream",
    },
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
              usage: {
                inputTokens: { total: 11 },
                outputTokens: { total: 4 },
              },
            });
            controller.close();
          },
        }),
      };
    },
  };
  const sdk = new NeuroLink();
  try {
    const result = await sdk.stream({
      input: { text: "block this" },
      provider: "vertex",
      model: GEMINI_MODEL,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      middleware: {
        middleware: [blockingMiddleware],
        enabledMiddleware: ["vertex-block-gemini-stream"],
      },
    });
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    assert.equal(text, "BLOCKED", "blocked content lost");
    assert.ok(invoked, "blocking middleware did not run");
    assert.equal(
      server.calls.length,
      0,
      "a stream a guardrail blocked still reached the vertex Gemini stand-in",
    );
    // The blocked-branch result exposes `usage` as a live getter (it only
    // resolves once the drained stream's finish part has been seen). Every
    // native Vertex stream passes through `withClientStreamSpan`, which
    // rewraps the result via `{ ...result, stream: wrapped }` — a plain
    // object spread snapshots an enumerable getter at spread time, so this
    // proves `preserveStreamResultAccessors` was told to carry `usage`
    // through that rewrap, not just `finishReason`.
    assert.equal(
      result.usage?.input,
      11,
      "a blocked stream's usage getter did not survive the span wrapper's object spread",
    );
    assert.equal(
      result.usage?.output,
      4,
      "a blocked stream's usage getter did not survive the span wrapper's object spread",
    );
    assert.equal(
      result.usage?.total,
      15,
      "a blocked stream's usage total did not survive the span wrapper's object spread",
    );
  } finally {
    await sdk.shutdown();
    restoreEnv();
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// What a middleware edit does to the turn — every native loop.
//
// Each case reads the wire request through the loop's own reader instead of
// searching the serialized body. Every assertion about something a request
// LACKS follows the proof that the request existed, that the middleware ran,
// and — where a removal is asserted — that a control run carried the thing in
// the first place; a request that was never sent would otherwise "lack" all of
// it.
// ---------------------------------------------------------------------------

const EDITED_SYSTEM_TEXT = "EDITED_SYSTEM_RULES";
const ADDED_SYSTEM_TEXT = "ADDED_SYSTEM_RULES";
const APPENDED_TEXT = "APPENDED_CONTEXT";
const PREPENDED_TEXT = "PREPENDED_CONTEXT";
const SPREAD_APPENDED_TEXT = "SPREAD_APPENDED_CONTEXT";
const BLOCKED_TEXT = "BLOCKED";

const userTurn = (text: string): V3Prompt[number] => ({
  role: "user",
  content: [{ type: "text", text }],
});

const systemTurn = (text: string): V3Prompt[number] => ({
  role: "system",
  content: text,
});

const withoutSystem = (prompt: V3Prompt): V3Prompt =>
  prompt.filter((message) => message.role !== "system");

/** Applies `edit` to every text a user message carries, whatever its shape. */
const editUserText =
  (edit: (text: string) => string) =>
  (prompt: V3Prompt): V3Prompt =>
    prompt.map((message) => {
      if (message.role !== "user") {
        return message;
      }
      return typeof message.content === "string"
        ? { ...message, content: edit(message.content) }
        : {
            ...message,
            content: message.content.map((part) =>
              part.type === "text" ? { ...part, text: edit(part.text) } : part,
            ),
          };
    });

const joinedUserText = (wire: VertexWire): string => wire.userTexts.join("\n");

for (const loop of VERTEX_LOOPS) {
  await test(`vertex ${loop.label}: a middleware can edit, remove and add the system prompt`, async () => {
    const control = await runVertexLoop(loop, { systemPrompt: SYSTEM_TEXT });
    assert.equal(
      wireOf(loop, control).system,
      SYSTEM_TEXT,
      "the caller's system prompt did not reach the wire when no middleware touched it",
    );

    const edit = paramsProbe(
      "system-edit",
      promptRewrite((prompt) =>
        prompt.map((message) =>
          message.role === "system"
            ? { ...message, content: EDITED_SYSTEM_TEXT }
            : message,
        ),
      ),
    );
    const edited = await runVertexLoop(loop, {
      systemPrompt: SYSTEM_TEXT,
      middleware: edit.middleware,
    });
    assert.ok(
      edit.seen[0]?.prompt.some(
        (message) =>
          message.role === "system" && message.content === SYSTEM_TEXT,
      ),
      "the middleware was not shown the caller's system prompt",
    );
    assert.equal(
      wireOf(loop, edited).system,
      EDITED_SYSTEM_TEXT,
      "a system prompt the middleware edited did not reach the wire",
    );

    const removal = paramsProbe("system-remove", promptRewrite(withoutSystem));
    const removed = await runVertexLoop(loop, {
      systemPrompt: SYSTEM_TEXT,
      middleware: removal.middleware,
    });
    assert.ok(
      removal.seen.length > 0,
      "the system-removal middleware never ran",
    );
    const removedWire = wireOf(loop, removed);
    assert.ok(
      joinedUserText(removedWire).includes(USER_TEXT),
      "the user turn did not reach the wire in the removal run",
    );
    assert.equal(
      removedWire.system,
      undefined,
      "a system prompt the middleware removed still reached the wire",
    );

    const addition = paramsProbe(
      "system-add",
      promptRewrite((prompt) => [systemTurn(ADDED_SYSTEM_TEXT), ...prompt]),
    );
    const added = await runVertexLoop(loop, {
      middleware: addition.middleware,
    });
    assert.ok(
      addition.seen.length > 0,
      "the system-addition middleware never ran",
    );
    assert.equal(
      wireOf(loop, added).system,
      ADDED_SYSTEM_TEXT,
      "a system message the middleware added did not reach the wire",
    );
  });
}

for (const loop of VERTEX_LOOPS) {
  await test(`vertex ${loop.label}: a user message a middleware appends or prepends reaches the wire beside the caller's own`, async () => {
    const append = paramsProbe(
      "user-append",
      promptRewrite((prompt) => [...prompt, userTurn(APPENDED_TEXT)]),
    );
    const appended = await runVertexLoop(loop, {
      middleware: append.middleware,
    });
    assert.ok(append.seen.length > 0, "the append middleware never ran");
    assert.deepEqual(
      wireOf(loop, appended).userTexts,
      [`${USER_TEXT}\n\n${APPENDED_TEXT}`],
      "an appended user message did not reach the wire after the caller's text",
    );

    const prepend = paramsProbe(
      "user-prepend",
      promptRewrite((prompt) => [userTurn(PREPENDED_TEXT), ...prompt]),
    );
    const prepended = await runVertexLoop(loop, {
      middleware: prepend.middleware,
    });
    assert.ok(prepend.seen.length > 0, "the prepend middleware never ran");
    assert.deepEqual(
      wireOf(loop, prepended).userTexts,
      [`${PREPENDED_TEXT}\n\n${USER_TEXT}`],
      "a prepended user message did not reach the wire before the caller's text",
    );

    const edit = paramsProbe(
      "user-edit",
      promptRewrite(editUserText((text) => `${text} EDITED`)),
    );
    const edited = await runVertexLoop(loop, { middleware: edit.middleware });
    assert.ok(edit.seen.length > 0, "the edit middleware never ran");
    assert.deepEqual(
      wireOf(loop, edited).userTexts,
      [`${USER_TEXT} EDITED`],
      "an in-place edit of the user text did not reach the wire",
    );
  });
}

// ---------------------------------------------------------------------------
// A middleware that empties the user turn (CodeRabbit PRRT_kwDOOzxF1c6n6aUz,
// finding 1). `executeNativeGemini3Generate` and
// `executeNativeAnthropicGenerate` compute `inputText` from
// `options.input?.text || options.prompt || "Please respond."` — `||` treats
// an emptied `input.text` the same as a never-set one and falls through to
// `options.prompt`, which `buildGenerateTextOptions` snapshots from the
// ORIGINAL `input.text` before any middleware runs. A redaction a middleware
// applies is therefore silently discarded: the ORIGINAL, unredacted text
// still reaches Vertex. Generate loops only — the stream executors read
// `options.input.text` directly with no `options.prompt` fallback at all
// (`executeNativeGemini3Stream` builds `userParts` from
// `options.input.text ?? ""`; `executeNativeAnthropicStream` reads
// `multimodalInput.text` the same way), so there is no stale snapshot for
// an empty rewrite to fall back onto on the stream path.
// ---------------------------------------------------------------------------

for (const loop of GENERATE_LOOPS) {
  await test(`vertex ${loop.label}: a middleware that empties the user text reaches the wire as empty, not the caller's original`, async () => {
    const redact = paramsProbe(
      "user-redact",
      promptRewrite((prompt) =>
        prompt.map((message) =>
          message.role === "user" ? { ...message, content: "" } : message,
        ),
      ),
    );
    const redacted = await runVertexLoop(loop, {
      middleware: redact.middleware,
    });
    assert.ok(redact.seen.length > 0, "the redaction middleware never ran");
    assert.ok(
      redact.seen[0]?.prompt.some((message) => message.role === "user"),
      "the middleware was not shown a user turn to redact",
    );
    assert.deepEqual(
      wireOf(loop, redacted).userTexts,
      [""],
      "a user text a middleware emptied still reached the wire as the caller's original, unredacted text",
    );
  });
}

// ---------------------------------------------------------------------------
// A prompt-only caller (`generateText({ prompt })`, `options.input` never
// set — CodeRabbit PRRT_kwDOOzxF1c6n6aUz, finding 2).
// `buildTurnPromptForMiddleware` builds the turn middleware sees from
// `options.input?.text ?? ""` only, never `options.prompt`, so a
// prompt-only caller shows middleware an empty user turn. A middleware that
// then appends to that turn has nothing of the caller's to append to:
// `applyTurnParamsRewrite` writes the appended-only text back onto
// `options.input.text` (now non-empty, so it wins the generate functions'
// `||` chain over the real `options.prompt`), and the caller's actual
// prompt is replaced rather than carried alongside the addition. Generate
// loops only: `StreamOptions` has no top-level `prompt` field and
// `streamText()` always normalizes to `{ input: { text: prompt } }` before a
// provider ever sees the call, so a stream caller can't reach this shape.
// ---------------------------------------------------------------------------

for (const loop of GENERATE_LOOPS) {
  await test(`vertex ${loop.label}: a prompt-only call (generateText, no input.text) shows middleware the real prompt and keeps it when a middleware appends`, async () => {
    const visibility = paramsProbe(
      "prompt-only-visibility",
      (params) => params,
    );
    const seen = await runVertexLoopPromptOnly(loop, {
      middleware: visibility.middleware,
    });
    assert.ok(visibility.seen.length > 0, "the middleware never ran");
    const shownUser = visibility.seen[0]?.prompt.find(
      (message) => message.role === "user",
    );
    const shownText =
      shownUser && Array.isArray(shownUser.content)
        ? shownUser.content
            .flatMap((part) => (part.type === "text" ? [part.text] : []))
            .join("")
        : typeof shownUser?.content === "string"
          ? shownUser.content
          : "";
    assert.equal(
      shownText,
      USER_TEXT,
      "a prompt-only call showed middleware an empty user turn instead of the real prompt text",
    );
    assert.deepEqual(
      wireOf(loop, seen).userTexts,
      [USER_TEXT],
      "the caller's prompt-only text did not reach the wire unedited",
    );

    const append = paramsProbe(
      "prompt-only-append",
      promptRewrite((prompt) => [...prompt, userTurn(APPENDED_TEXT)]),
    );
    const appended = await runVertexLoopPromptOnly(loop, {
      middleware: append.middleware,
    });
    assert.ok(append.seen.length > 0, "the append middleware never ran");
    assert.deepEqual(
      wireOf(loop, appended).userTexts,
      [`${USER_TEXT}\n\n${APPENDED_TEXT}`],
      "a prompt-only call's real text was replaced by the middleware's addition instead of kept alongside it",
    );
  });
}

for (const loop of VERTEX_LOOPS) {
  await test(`vertex ${loop.label}: a middleware written against the V3 prompt shape sees the user turn as parts`, async () => {
    const probe = paramsProbe(
      "v3-parts",
      promptRewrite((prompt) =>
        prompt.map((message) =>
          message.role === "user" && Array.isArray(message.content)
            ? {
                ...message,
                content: [
                  ...message.content.map((part) =>
                    part.type === "text"
                      ? { ...part, text: part.text.toLowerCase() }
                      : part,
                  ),
                  { type: "text" as const, text: SPREAD_APPENDED_TEXT },
                ],
              }
            : message,
        ),
      ),
    );
    const run = await runVertexLoop(loop, { middleware: probe.middleware });
    assert.ok(probe.seen.length > 0, "the V3-shape middleware never ran");
    const shown = probe.seen[0]?.prompt.find(
      (message) => message.role === "user",
    );
    assert.ok(
      shown !== undefined && Array.isArray(shown.content),
      "the user turn reached the middleware as a bare string instead of V3 parts",
    );
    assert.deepEqual(
      wireOf(loop, run).userTexts,
      [`${USER_TEXT.toLowerCase()}\n\n${SPREAD_APPENDED_TEXT}`],
      "a rewrite written against V3 user parts did not reach the wire",
    );
  });
}

for (const loop of VERTEX_LOOPS) {
  await test(`vertex ${loop.label}: sampling params reach the wire, and a middleware can change or remove them`, async () => {
    const sampling = { temperature: 0.31, topP: 0.87, maxTokens: 32 };

    const inert = paramsProbe("sampling-inert", (params) => params);
    const control = await runVertexLoop(loop, {
      ...sampling,
      middleware: inert.middleware,
    });
    assert.equal(
      inert.seen[0]?.temperature,
      sampling.temperature,
      "the middleware was not shown the caller's temperature",
    );
    const controlWire = wireOf(loop, control);
    assert.deepEqual(
      [controlWire.temperature, controlWire.topP, controlWire.maxTokens],
      [sampling.temperature, sampling.topP, sampling.maxTokens],
      "the caller's sampling params did not reach the wire through an inert middleware",
    );

    const change = paramsProbe("sampling-edit", (params) => ({
      ...params,
      temperature: 0.55,
      topP: 0.66,
      maxOutputTokens: 48,
    }));
    const changed = await runVertexLoop(loop, {
      ...sampling,
      middleware: change.middleware,
    });
    assert.ok(change.seen.length > 0, "the sampling-edit middleware never ran");
    const changedWire = wireOf(loop, changed);
    assert.deepEqual(
      [changedWire.temperature, changedWire.topP, changedWire.maxTokens],
      [0.55, 0.66, 48],
      "sampling params a middleware changed did not reach the wire",
    );

    const removal = paramsProbe("sampling-remove", (params) => ({
      ...params,
      temperature: undefined,
      topP: undefined,
      maxOutputTokens: undefined,
    }));
    const removed = await runVertexLoop(loop, {
      ...sampling,
      middleware: removal.middleware,
    });
    assert.equal(
      removal.seen[0]?.topP,
      sampling.topP,
      "the middleware was not shown the topP it then removed",
    );
    const removedWire = wireOf(loop, removed);
    assert.ok(
      joinedUserText(removedWire).includes(USER_TEXT),
      "the user turn did not reach the wire in the removal run",
    );
    assert.notEqual(
      removedWire.temperature,
      sampling.temperature,
      "a temperature the middleware removed still reached the wire",
    );
    assert.equal(
      removedWire.topP,
      undefined,
      "a topP the middleware removed still reached the wire",
    );
    assert.notEqual(
      removedWire.maxTokens,
      sampling.maxTokens,
      "a token cap the middleware removed still reached the wire",
    );
  });
}

// ---------------------------------------------------------------------------
// Prompt items a native request has no place for.
// ---------------------------------------------------------------------------

const UNMAPPED_FILE_PAYLOAD = "UNMAPPED_FILE_PAYLOAD";
const UNMAPPED_ASSISTANT_TEXT = "UNMAPPED_ASSISTANT_TEXT";

/** Runs `body` while recording the first argument of every `logger.warn`. */
async function captureWarnings<T>(
  body: () => Promise<T>,
): Promise<{ result: T; warnings: string[] }> {
  const warnings: string[] = [];
  const original = logger.warn;
  logger.warn = (...args: unknown[]) => {
    warnings.push(String(args[0]));
  };
  try {
    return { result: await body(), warnings };
  } finally {
    logger.warn = original;
  }
}

const isUnmappedReport = (warning: string): boolean =>
  /prompt item/.test(warning);

for (const loop of VERTEX_LOOPS) {
  await test(`vertex ${loop.label}: prompt items the native request cannot carry are reported, not silently dropped`, async () => {
    const inert = paramsProbe("unmapped-control", (params) => params);
    const control = await captureWarnings(() =>
      runVertexLoop(loop, { middleware: inert.middleware }),
    );
    assert.ok(inert.seen.length > 0, "the control middleware never ran");
    assert.ok(
      joinedUserText(wireOf(loop, control.result)).includes(USER_TEXT),
      "the control request never carried the user turn",
    );
    assert.equal(
      control.warnings.filter(isUnmappedReport).length,
      0,
      "a middleware that added nothing was warned about",
    );

    const adding = paramsProbe(
      "unmapped-add",
      promptRewrite((prompt) => [
        ...prompt,
        {
          role: "user",
          content: [
            {
              type: "file",
              data: UNMAPPED_FILE_PAYLOAD,
              mediaType: "text/plain",
            },
          ],
        },
        {
          role: "assistant",
          content: [{ type: "text", text: UNMAPPED_ASSISTANT_TEXT }],
        },
      ]),
    );
    const { result: run, warnings } = await captureWarnings(() =>
      runVertexLoop(loop, { middleware: adding.middleware }),
    );
    assert.ok(adding.seen.length > 0, "the item-adding middleware never ran");
    assert.deepEqual(
      wireOf(loop, run).userTexts,
      [USER_TEXT],
      "the user turn changed although the middleware added no text",
    );
    const reports = warnings.filter(isUnmappedReport);
    assert.equal(
      reports.length,
      1,
      "the dropped prompt items were not reported exactly once",
    );
    assert.match(
      reports[0] ?? "",
      /2 prompt item/,
      "the report did not count both dropped items",
    );
    const everywhere = `${warnings.join("\n")}\n${JSON.stringify(run.bodies[0])}`;
    assert.ok(
      !everywhere.includes(UNMAPPED_FILE_PAYLOAD) &&
        !everywhere.includes(UNMAPPED_ASSISTANT_TEXT),
      "an item the request cannot carry leaked into the wire or the warning",
    );
  });
}

// ---------------------------------------------------------------------------
// Lifecycle callbacks — fired once, from the right place.
//
// Three things can fire a caller's onFinish/onError/onChunk on a native Vertex
// call: BaseProvider's stream wrapper, Vertex's own manual firing, and the
// built-in lifecycle middleware inside the model bridge. The bridge one reads
// legacy field names a V3 model never produces, so it reports a text of
// "undefined" and a finishReason of "[object Object]". Every count here sits
// next to a floor that proves the callbacks were live, since a ceiling alone
// also passes for callbacks that never fire.
// ---------------------------------------------------------------------------

const withDirectLifecycle = (
  middleware: MiddlewareFactoryOptions,
  lifecycle: ReturnType<typeof captureLifecycle>,
): MiddlewareFactoryOptions => ({
  ...middleware,
  middlewareConfig: {
    lifecycle: {
      enabled: true,
      config: {
        onFinish: lifecycle.onFinish,
        onError: lifecycle.onError,
        onChunk: lifecycle.onChunk,
      },
    },
  },
});

for (const loop of GENERATE_LOOPS) {
  await test(`vertex ${loop.label}: top-level onFinish and onError fire once with middleware configured`, async () => {
    const observed = countingProbe("lifecycle-generate-probe");
    const lifecycle = captureLifecycle();
    const run = await runVertexLoop(loop, {
      middleware: observed.middleware,
      onFinish: lifecycle.onFinish,
      onError: lifecycle.onError,
    });
    assert.equal(
      run.text,
      VERTEX_REPLY,
      "the native turn did not return the stand-in's reply",
    );
    assert.ok(
      observed.counts.generate > 0,
      "the middleware chain never wrapped the generate call",
    );
    assert.ok(
      lifecycle.finishes.length >= 1,
      "onFinish never fired, so its count says nothing",
    );
    assert.equal(
      lifecycle.finishes.length,
      1,
      "onFinish fired more than once for one generate call",
    );
    assert.equal(
      lifecycle.finishes[0]?.finishReason,
      "stop",
      "onFinish did not carry the turn's real finish reason",
    );
    assert.equal(
      lifecycle.errors.length,
      0,
      "onError fired for a generate call that succeeded",
    );
  });

  await test(`vertex ${loop.label}: a lifecycle middleware configured directly still fires once`, async () => {
    const observed = countingProbe("lifecycle-direct-generate-probe");
    const lifecycle = captureLifecycle();
    const run = await runVertexLoop(loop, {
      middleware: withDirectLifecycle(observed.middleware, lifecycle),
    });
    assert.equal(
      run.text,
      VERTEX_REPLY,
      "the native turn did not return the stand-in's reply",
    );
    assert.ok(
      observed.counts.generate > 0,
      "the middleware chain never wrapped the generate call",
    );
    assert.equal(
      lifecycle.finishes.length,
      1,
      "a directly configured lifecycle middleware did not fire onFinish exactly once",
    );
    assert.equal(
      lifecycle.errors.length,
      0,
      "onError fired for a generate call that succeeded",
    );
  });
}

for (const loop of STREAM_LOOPS) {
  await test(`vertex ${loop.label}: top-level callbacks are not fired a third time by the bridge`, async () => {
    const observed = countingProbe("lifecycle-stream-probe");
    const lifecycle = captureLifecycle();
    const run = await runVertexLoop(loop, {
      middleware: observed.middleware,
      onFinish: lifecycle.onFinish,
      onError: lifecycle.onError,
      onChunk: lifecycle.onChunk,
    });
    assert.equal(
      run.text,
      VERTEX_REPLY,
      "the native turn did not return the stand-in's reply",
    );
    assert.ok(
      observed.counts.stream > 0,
      "the middleware chain never wrapped the stream call",
    );
    assert.ok(
      lifecycle.finishes.length >= 1,
      "onFinish never fired, so its count says nothing",
    );
    assert.ok(
      lifecycle.chunks.length >= 1,
      "onChunk never fired, so its count says nothing",
    );
    // BaseProvider's wrapper and Vertex's own firing already make a pair on a
    // stream; the bridge's middleware must not add a third.
    assert.ok(
      lifecycle.finishes.length <= 2,
      "onFinish fired more than the provider's own two paths can",
    );
    assert.ok(
      lifecycle.chunks.length <= 2,
      "onChunk fired more than the provider's own two paths can",
    );
    assert.ok(
      lifecycle.finishes.every((payload) => payload.text === VERTEX_REPLY),
      "an onFinish payload did not carry the streamed text",
    );
    assert.ok(
      lifecycle.chunks.every(
        (payload) =>
          payload.type !== "text-delta" || payload.textDelta === VERTEX_REPLY,
      ),
      "an onChunk payload did not carry the streamed delta",
    );
    assert.equal(
      lifecycle.errors.length,
      0,
      "onError fired for a stream that succeeded",
    );
  });

  await test(`vertex ${loop.label}: a lifecycle middleware configured directly fires each callback once`, async () => {
    const observed = countingProbe("lifecycle-direct-stream-probe");
    const lifecycle = captureLifecycle();
    const run = await runVertexLoop(loop, {
      middleware: withDirectLifecycle(observed.middleware, lifecycle),
    });
    assert.equal(
      run.text,
      VERTEX_REPLY,
      "the native turn did not return the stand-in's reply",
    );
    assert.ok(
      observed.counts.stream > 0,
      "the middleware chain never wrapped the stream call",
    );
    assert.ok(
      lifecycle.finishes.length >= 1,
      "onFinish never fired, so its count says nothing",
    );
    assert.equal(
      lifecycle.finishes.length,
      1,
      "a directly configured lifecycle fired onFinish more than once",
    );
    const deltas = lifecycle.chunks.filter(
      (payload) => payload.type === "text-delta",
    );
    assert.ok(
      deltas.length >= 1,
      "onChunk never saw a text delta, so its count says nothing",
    );
    assert.equal(
      deltas.length,
      1,
      "a directly configured lifecycle delivered the text delta more than once",
    );
    assert.ok(
      lifecycle.finishes.every((payload) => payload.text === VERTEX_REPLY) &&
        deltas.every((payload) => payload.textDelta === VERTEX_REPLY),
      "a lifecycle payload did not carry the streamed text",
    );
    assert.equal(
      lifecycle.errors.length,
      0,
      "onError fired for a stream that succeeded",
    );
  });
}

// ---------------------------------------------------------------------------
// Schema-complexity recovery is the provider's own business.
//
// Vertex answers an over-constrained responseSchema with a deterministic 400,
// and the Gemini generate loop retries once without the schema. Middleware
// wraps one model call, and the provider hands it one that succeeds.
// ---------------------------------------------------------------------------

const TOO_MANY_STATES: GeminiStandInReply = {
  status: 400,
  json: {
    error: {
      code: 400,
      message:
        "The specified schema produces a constraint that has too many states for serving. Simplify the schema.",
      status: "INVALID_ARGUMENT",
    },
  },
};

const carriesResponseSchema = (body: Record<string, unknown> | undefined) =>
  /responseSchema|responseJsonSchema/.test(JSON.stringify(body ?? {}));

for (const variant of ["top-level", "direct"] as const) {
  await test(`vertex Gemini native generate: a schema-complexity retry is one call to middleware and lifecycle callbacks (${variant} callbacks)`, async () => {
    const server = await startGeminiStandIn((index) =>
      index === 0 ? TOO_MANY_STATES : geminiTextTurn('{"answer":"retry ok"}'),
    );
    const restoreEnv = withVertexEnv();
    const observed = countingProbe("schema-retry-probe");
    const lifecycle = captureLifecycle();
    const schema = z.object({ answer: z.string() });
    const sdk = new NeuroLink();
    try {
      const result = await sdk.generate({
        input: { text: USER_TEXT },
        provider: "vertex",
        model: GEMINI_MODEL,
        maxTokens: 64,
        disableTools: true,
        disableInternalFallback: true,
        credentials: vertexCredentialsFor(server.port),
        schema,
        output: { format: "json" },
        middleware:
          variant === "direct"
            ? withDirectLifecycle(observed.middleware, lifecycle)
            : observed.middleware,
        ...(variant === "top-level"
          ? { onFinish: lifecycle.onFinish, onError: lifecycle.onError }
          : {}),
      });
      await settleLifecycle();
      assert.equal(
        server.calls.length,
        2,
        "the schema-complexity error did not produce exactly one retry",
      );
      assert.ok(
        carriesResponseSchema(server.calls[0]?.body),
        "the first request carried no response schema, so the retry has nothing to drop",
      );
      assert.ok(
        !carriesResponseSchema(server.calls[1]?.body),
        "the retry still carried the schema the provider rejected",
      );
      assert.equal(
        asRecord(asRecord(server.calls[1]?.body).generationConfig)
          .responseMimeType,
        "application/json",
        "the retry lost JSON mode along with the schema",
      );
      assert.equal(
        schema.parse(result.structuredData).answer,
        "retry ok",
        "the retry's JSON did not reach the caller as structured data",
      );
      assert.ok(
        lifecycle.finishes.length >= 1,
        "onFinish never fired, so its count says nothing",
      );
      assert.equal(
        observed.counts.generate,
        1,
        "middleware saw the provider-internal retry as a second generate call",
      );
      assert.equal(
        lifecycle.finishes.length,
        1,
        "onFinish did not fire exactly once for the recovered call",
      );
      assert.equal(
        lifecycle.errors.length,
        0,
        "onError fired for a call that recovered",
      );
    } finally {
      await sdk.shutdown();
      restoreEnv();
      await server.close();
    }
  });
}

// ---------------------------------------------------------------------------
// A guardrail that blocks generate() before the native call.
// ---------------------------------------------------------------------------

for (const loop of GENERATE_LOOPS) {
  await test(`vertex ${loop.label}: a guardrail-blocked call still returns analytics`, async () => {
    const control = await runVertexLoop(loop, { enableAnalytics: true });
    assert.ok(
      control.analytics !== undefined,
      "an unblocked call returned no analytics, so the blocked comparison has no baseline",
    );
    assert.equal(
      control.analytics.stepsUsed,
      1,
      "the unblocked control did not report its one step",
    );
    assert.ok(
      control.analytics.tokenUsage.total > 0,
      "the unblocked control reported no token usage",
    );

    let blockedCalls = 0;
    const blocker: NeuroLinkMiddleware = {
      specificationVersion: "v3",
      metadata: { id: "block-for-analytics", name: "Block for analytics" },
      wrapGenerate: async () => {
        blockedCalls += 1;
        return {
          content: [{ type: "text", text: BLOCKED_TEXT }],
          finishReason: { unified: "stop" },
          usage: { inputTokens: { total: 0 }, outputTokens: { total: 0 } },
        };
      },
    };
    const blocked = await runVertexLoop(loop, {
      enableAnalytics: true,
      middleware: {
        middleware: [blocker],
        enabledMiddleware: ["block-for-analytics"],
      },
    });
    assert.equal(
      blockedCalls,
      1,
      "the blocking middleware did not run exactly once",
    );
    assert.equal(
      blocked.text,
      BLOCKED_TEXT,
      "the guardrail's synthesized content was lost",
    );
    assert.equal(
      blocked.bodies.length,
      0,
      "a call the guardrail blocked still reached the stand-in",
    );
    const analytics = blocked.analytics;
    assert.ok(
      analytics !== undefined,
      "a blocked call returned no analytics although enableAnalytics was set",
    );
    assert.equal(
      analytics.stepsUsed,
      0,
      "a blocked call reported a model step it never took",
    );
    assert.equal(
      analytics.toolCallCount,
      0,
      "a blocked call reported tool calls it never made",
    );
    assert.equal(
      analytics.tokenUsage.total,
      0,
      "a blocked call reported tokens it never used",
    );
  });
}

// ---------------------------------------------------------------------------
// Cancellation — a consumer that walks away from a stream must release the
// upstream request, not just stop reading it.
//
// The stand-in opens the response with the first frames of a turn and then
// holds it open, so nothing but the client aborting can end the connection.
// The bridge's ReadableStream is pulled ahead of demand, which leaves a
// `.next()` parked on the native channel when the consumer breaks. Releasing
// the native iterator by awaiting its `.return()` queues behind that
// `.next()`, and the break then stays parked until a frame or the turn clock
// arrives — with the upstream request still open and nothing left to end it.
//
// Only the Anthropic-on-Vertex loop can show this. executeNativeGemini3Stream
// collects the whole turn before anything reaches the bridge (see the
// "Collected, NOT forwarded to the consumer" comment at its `pump`), so by the
// time a consumer can break there is no request left to release.
// ---------------------------------------------------------------------------

const waitFor = async (
  condition: () => boolean,
  deadlineMs: number,
): Promise<boolean> => {
  const deadline = Date.now() + deadlineMs;
  while (!condition() && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  return condition();
};

await test("vertex Anthropic native stream: breaking out of the consumer's loop releases the upstream request", async () => {
  const server = await startAnthropicHoldOpenStandIn();
  const restoreEnv = withVertexEnv();
  const sdk = new NeuroLink();
  try {
    const result = await sdk.stream({
      input: { text: "hello vertex claude" },
      provider: "vertex",
      model: ANTHROPIC_MODEL,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: vertexCredentialsFor(server.port),
      middleware: middlewareOptions(emptyRecord()),
    });
    let firstChunkSeen = false;
    const consumer = (async () => {
      for await (const chunk of result.stream) {
        if ("content" in chunk && chunk.content) {
          firstChunkSeen = true;
          break;
        }
      }
    })();
    const returned = await bounded(consumer, 10_000).then(
      () => true,
      () => false,
    );
    assert.ok(
      firstChunkSeen,
      "no content reached the consumer before it broke out of the loop",
    );
    assert.ok(
      returned,
      "the consumer's break did not return while the upstream response was held open",
    );
    assert.equal(
      server.calls.length,
      1,
      "the hold-open stand-in did not receive exactly one request",
    );
    assert.ok(
      await waitFor(() => server.closedResponses() >= 1, 10_000),
      "the upstream request stayed open after the consumer broke out of the stream",
    );
  } finally {
    await bounded(server.close());
    await bounded(sdk.shutdown());
    restoreEnv();
  }
});

// Additional regression test for the lifecycle double-fire bug fixed in
// PR #1869 (src/lib/utils/lifecycleCallbacks.ts), reusing this section's own
// Express-Mode env-clearing/credentials helpers above. GoogleVertexProvider's
// native stream path has its own direct onChunk/onFinish firer alongside
// BaseProvider's generic one; this proves exactly one of the two now fires,
// with the richer (usage/finishReason-enriched) payload preserved.

type LifecycleVertexStandInCall = { body: Record<string, unknown> };
type LifecycleVertexStandIn = {
  calls: LifecycleVertexStandInCall[];
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
): Promise<LifecycleVertexStandIn> {
  const calls: LifecycleVertexStandInCall[] = [];
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
      model: GEMINI_MODEL,
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

// ---------------------------------------------------------------------------
// BEDROCK — the same model-middleware contract, proven against Amazon
// Bedrock's native `generate()`/`stream()` paths. Bedrock goes through the
// AWS SDK rather than `fetch`, so the stand-in is a local HTTP/2 server
// pointed to via the SDK's own `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` variable
// (see `test/helpers/bedrockLocalEndpoint.ts`'s header) — a fetch
// interceptor would never see these requests. Abort and cancellation are
// proven from the far end: the stand-in holds a request open (`hold`) and
// records whether the client closed it (`aborted`), so the assertion is about
// the transport rather than about anything the caller was handed back.
// ---------------------------------------------------------------------------

const BEDROCK_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

/**
 * Points the AWS SDK at a local Bedrock stand-in for the duration of `fn` —
 * the same env-swap `continuous-test-suite-provider-wiring.ts` and
 * `continuous-test-suite-bedrock-loop-characterization.ts` use. Real SigV4
 * signing, real routing; nothing reaches AWS. `AWS_SESSION_TOKEN` is
 * explicitly cleared: a leftover session token from real assumed-role
 * credentials elsewhere in the environment would otherwise be signed
 * alongside the placeholder access key below and is never validated by the
 * stand-in anyway.
 */
const withBedrockEnv = async <T>(
  endpoint: string,
  fn: () => Promise<T>,
  extraEnv: Record<string, string> = {},
): Promise<T> => {
  const savedEnv = { ...process.env };
  Object.assign(process.env, PLACEHOLDER_AWS_ENV, extraEnv, {
    AWS_ENDPOINT_URL_BEDROCK_RUNTIME: endpoint,
  });
  delete process.env.AWS_SESSION_TOKEN;
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, savedEnv);
  }
};

for (const mode of ["generate", "stream"] as const) {
  await test(`Bedrock ${mode} applies model middleware and the transformParams rewrite reaches the wire`, async () => {
    const local = await startLocalBedrock("OK");
    const record = emptyRecord();
    try {
      await withBedrockEnv(local.endpoint, async () => {
        const sdk = new NeuroLink();
        try {
          const options = {
            input: { text: "hello" },
            provider: "bedrock",
            model: BEDROCK_MODEL,
            disableTools: true,
            disableInternalFallback: true,
            middleware: middlewareOptions(record),
          };
          if (mode === "generate") {
            await sdk.generate(options);
          } else {
            await bounded(readText(await sdk.stream(options)));
          }
        } finally {
          await sdk.shutdown();
        }
      });

      if (record.transformParamsCalls.length === 0) {
        throw new Error(`probe never ran on Bedrock ${mode}`);
      }
      if (mode === "generate" && record.wrapGenerateCalls === 0) {
        throw new Error(
          "wrapGenerate never fired on the Bedrock generate path",
        );
      }
      if (mode === "stream" && record.wrapStreamCalls === 0) {
        throw new Error("wrapStream never fired on the Bedrock stream path");
      }
      if (local.requests.length === 0) {
        throw new Error(`the Bedrock stand-in was never reached on ${mode}`);
      }
      const body = local.requests.at(-1)?.body ?? "";
      if (!body.includes(MARKER)) {
        throw new Error(
          `the transformParams rewrite did not reach the wire on Bedrock ${mode}`,
        );
      }
    } finally {
      await local.close();
    }
  });
}

await test("Bedrock stream: wrapStream observes the V3 finish part carrying usage", async () => {
  const local = await startLocalBedrock("OK");
  const seen: LanguageModelV3StreamPart[] = [];
  const observer: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "bedrock-wire-observer", name: "Bedrock wire observer" },
    wrapStream: async ({ doStream }) => {
      const result = await doStream();
      return {
        ...result,
        stream: result.stream.pipeThrough(
          new TransformStream({
            transform(part: LanguageModelV3StreamPart, controller) {
              seen.push(part);
              controller.enqueue(part);
            },
          }),
        ),
      };
    },
  };
  try {
    await withBedrockEnv(local.endpoint, async () => {
      const sdk = new NeuroLink();
      try {
        const result = await sdk.stream({
          input: { text: "hello" },
          provider: "bedrock",
          model: BEDROCK_MODEL,
          disableTools: true,
          disableInternalFallback: true,
          middleware: {
            middleware: [observer],
            enabledMiddleware: ["bedrock-wire-observer"],
          },
        });
        const text = await bounded(readText(result));
        assert.equal(text, "OK", "stream text lost through the observer");
      } finally {
        await sdk.shutdown();
      }
    });

    assert.ok(
      local.requests.length > 0,
      "the Bedrock stand-in was never reached",
    );
    const finish = seen.find(
      (part): part is Extract<LanguageModelV3StreamPart, { type: "finish" }> =>
        part.type === "finish",
    );
    assert.ok(finish, "no V3 finish part observed on the Bedrock stream");
    // Exact values, not just non-zero: the stand-in's `metadata` event fixes
    // inputTokens=5/outputTokens=1, so a match here is a genuine proof the
    // AWS event-stream usage numbers flowed through readStreamedStep and the
    // V3 bridge unchanged, not merely that some usage arrived.
    assert.equal(
      finish?.usage.outputTokens.total,
      1,
      "the V3 finish part did not carry the Bedrock stand-in's outputTokens",
    );
    assert.equal(
      finish?.usage.inputTokens.total,
      5,
      "the V3 finish part did not carry the Bedrock stand-in's inputTokens",
    );
  } finally {
    await local.close();
  }
});

for (const mode of ["generate", "stream"] as const) {
  await test(`Bedrock ${mode}: precall guardrail blocks the turn before it reaches the wire`, async () => {
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
    const local = await startLocalBedrock("OK");
    try {
      await withBedrockEnv(
        local.endpoint,
        async () => {
          const sdk = new NeuroLink();
          try {
            const options = {
              input: { text: "block this request" },
              provider: "bedrock",
              model: BEDROCK_MODEL,
              disableTools: true,
              disableInternalFallback: true,
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
            const content =
              mode === "generate"
                ? (await sdk.generate(options)).content
                : await bounded(readText(await sdk.stream(options)));
            assert.ok(
              evaluator.wasCalled(),
              "guardrail evaluator was not exercised",
            );
            assert.equal(
              local.requests.length,
              0,
              "blocked input reached the Bedrock stand-in",
            );
            assert.equal(
              content,
              "Request contains inappropriate content and has been blocked.",
              "guardrail refusal was lost on Bedrock",
            );
          } finally {
            await sdk.shutdown();
          }
        },
        {
          OPENAI_COMPATIBLE_API_KEY: "test-evaluator-key",
          OPENAI_COMPATIBLE_BASE_URL: evaluator.baseURL,
        },
      );
    } finally {
      await local.close();
      await evaluator.close();
    }
  });
}

// ---------------------------------------------------------------------------
// BEDROCK, continued. Each case below rests on something only the far end can
// show: the request body the stand-in recorded, or whether the client closed a
// request the stand-in was holding open on purpose (`hold` / `aborted` in the
// helper). A pass-through probe cannot tell those apart from a working turn.
// ---------------------------------------------------------------------------

const REFUSAL_MARKER = "BEDROCK_MIDDLEWARE_REFUSED";
const LOOKUP = "lookup_thing";

/** Poll until `predicate` holds. False if the deadline passes first. */
const waitUntil = async (
  predicate: () => boolean,
  deadlineMs = 15_000,
): Promise<boolean> => {
  const end = Date.now() + deadlineMs;
  while (!predicate()) {
    if (Date.now() >= end) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return true;
};

type Settled<T> =
  | { status: "ok"; value: T }
  | { status: "error"; message: string }
  | { status: "timeout" };

/**
 * Await a call whose failure is part of the claim. `defineSuite` reports any
 * thrown message that reads like a provider error as a SKIP, so a Bedrock
 * error escaping a test body could turn a real failure into a pass. Settling
 * the call here keeps its outcome a value the assertion names.
 */
const settle = async <T>(
  promise: PromiseLike<T>,
  deadlineMs = 30_000,
): Promise<Settled<T>> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise).then(
        (value): Settled<T> => ({ status: "ok", value }),
        (error: unknown): Settled<T> => ({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        }),
      ),
      new Promise<Settled<T>>((resolve) => {
        timer = setTimeout(() => resolve({ status: "timeout" }), deadlineMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const isStreamRequest = (request: CapturedRequest): boolean =>
  request.path.endsWith("/converse-stream");

/** The fields of a Converse request body these cases read. */
type WireBody = {
  system?: Array<{ text?: string }>;
  inferenceConfig?: { maxTokens?: number; temperature?: number };
  toolConfig?: {
    tools?: Array<{
      toolSpec?: { name?: string; inputSchema?: { json?: unknown } };
    }>;
  };
};

const parseWireBody = (request: CapturedRequest): WireBody =>
  JSON.parse(request.body) as WireBody;

const hasText = (block: { text?: string }): boolean =>
  (block.text ?? "").trim() !== "";

const withBedrockSdk = async <T>(
  local: LocalBedrock,
  fn: (sdk: NeuroLink) => Promise<T>,
  extraEnv: Record<string, string> = {},
): Promise<T> =>
  withBedrockEnv(
    local.endpoint,
    async () => {
      const sdk = new NeuroLink();
      try {
        return await fn(sdk);
      } finally {
        await sdk.shutdown();
      }
    },
    extraEnv,
  );

type TurnOptions = GenerateOptions & StreamOptions;

const turnOptions = (
  middleware: NeuroLinkMiddleware,
  extra: Partial<TurnOptions> = {},
): TurnOptions => ({
  input: { text: "hello" },
  provider: "bedrock",
  model: BEDROCK_MODEL,
  disableTools: true,
  disableInternalFallback: true,
  middleware: {
    middleware: [middleware],
    enabledMiddleware: [middleware.metadata.id],
  },
  ...extra,
});

const runTurn = async (
  sdk: NeuroLink,
  mode: "generate" | "stream",
  options: TurnOptions,
): Promise<string> =>
  mode === "generate"
    ? (await sdk.generate(options)).content
    : readText(await sdk.stream(options));

for (const mode of ["generate", "stream"] as const) {
  for (const style of ["replaces", "composes"] as const) {
    await test(`Bedrock ${mode}: a caller abort reaches the wire when a middleware ${style} the abort signal`, async () => {
      const local = await startLocalBedrock("OK", {
        hold: mode === "generate" ? "converse" : "converse-stream",
      });
      const caller = new AbortController();
      // Nothing fires this by itself, so it can never end the held request in
      // the caller's place. It is released below so a failing run does not
      // leave that request open.
      const own = new AbortController();
      const seen: { signal?: AbortSignal } = {};
      const signalMiddleware: NeuroLinkMiddleware = {
        specificationVersion: "v3",
        metadata: { id: "bedrock-signal", name: "Bedrock signal" },
        transformParams: async ({ params }) => {
          seen.signal = params.abortSignal;
          return {
            ...params,
            abortSignal:
              style === "replaces"
                ? own.signal
                : AbortSignal.any([
                    ...(params.abortSignal ? [params.abortSignal] : []),
                    own.signal,
                  ]),
          };
        },
      };
      try {
        await withBedrockSdk(local, async (sdk) => {
          const options = turnOptions(signalMiddleware, {
            abortSignal: caller.signal,
          });
          const pending = settle<unknown>(
            mode === "generate" ? sdk.generate(options) : sdk.stream(options),
          );
          try {
            assert.ok(
              await waitUntil(() => local.requests.length > 0),
              "the Bedrock stand-in was never reached",
            );
            const request = local.requests[0];
            assert.equal(
              request.aborted,
              false,
              "the held request was closed before the caller aborted",
            );
            assert.ok(
              seen.signal,
              "the middleware was not offered the caller's abort signal",
            );
            caller.abort();
            assert.ok(
              await waitUntil(() => seen.signal?.aborted === true, 5_000),
              "the signal offered to the middleware did not follow the caller's abort",
            );
            assert.ok(
              await waitUntil(() => request.aborted, 10_000),
              "the caller's abort never reached the wire",
            );
          } finally {
            own.abort();
            caller.abort();
          }
          const outcome = await pending;
          assert.notEqual(
            outcome.status,
            "timeout",
            "the call never settled after the caller aborted",
          );
        });
      } finally {
        await local.close();
      }
    });
  }
}

for (const variant of ["message", "name"] as const) {
  await test(`Bedrock stream: a middleware refusal that reads like a streaming-permission error is surfaced, not retried on Converse (${variant})`, async () => {
    const local = await startLocalBedrock("OK");
    const seen = { refusals: 0 };
    // Both variants match what the streaming-permission fallback looks for, on
    // an error that is not an AWS service exception and never left the process.
    const refuser: NeuroLinkMiddleware = {
      specificationVersion: "v3",
      metadata: { id: "bedrock-refuser", name: "Bedrock refuser" },
      ...(variant === "message"
        ? {
            wrapStream: async () => {
              seen.refusals += 1;
              throw new Error(
                `${REFUSAL_MARKER}: streaming is not permitted by policy`,
              );
            },
          }
        : {
            transformParams: async () => {
              seen.refusals += 1;
              throw Object.assign(
                new Error(`${REFUSAL_MARKER}: refused by policy`),
                { name: "AccessDeniedException" },
              );
            },
          }),
    };
    try {
      await withBedrockSdk(local, async (sdk) => {
        const outcome = await settle(
          runTurn(sdk, "stream", turnOptions(refuser)),
        );
        assert.equal(seen.refusals, 1, "the refusing middleware never ran");
        assert.equal(
          outcome.status,
          "error",
          "the middleware's refusal was recovered from instead of surfaced",
        );
        assert.ok(
          outcome.status === "error" &&
            outcome.message.includes(REFUSAL_MARKER),
          "the surfaced error is not the middleware's refusal",
        );
        assert.equal(
          local.requests.length,
          0,
          "a Converse request went out after the middleware refused the turn",
        );
      });
    } finally {
      await local.close();
    }
  });
}

await test("Bedrock stream: a genuine streaming-permission denial still falls back to Converse with middleware configured", async () => {
  const local = await startLocalBedrock("OK", { denyStream: true });
  const record = emptyRecord();
  try {
    await withBedrockSdk(local, async (sdk) => {
      const outcome = await settle(
        runTurn(sdk, "stream", turnOptions(createProbe(record))),
      );
      assert.ok(
        record.wrapStreamCalls >= 1,
        "the middleware was not in the path of the denied stream",
      );
      assert.ok(outcome.status === "ok", "the fallback turn did not complete");
      assert.equal(
        outcome.value,
        "OK",
        "the Converse fallback did not answer the turn",
      );
      assert.deepEqual(
        local.requests.map((request) =>
          isStreamRequest(request) ? "stream" : "converse",
        ),
        ["stream", "converse"],
        "the fallback did not follow the denied stream with one Converse request",
      );
    });
  } finally {
    await local.close();
  }
});

type FinishUsage = Extract<
  LanguageModelV3StreamPart,
  { type: "finish" }
>["usage"];

for (const mode of ["generate", "stream"] as const) {
  await test(`Bedrock ${mode}: the usage a middleware sees keeps fresh input apart from cache reads and writes`, async () => {
    const local = await startLocalBedrock("OK", {
      usage: {
        inputTokens: 5,
        outputTokens: 1,
        cacheReadInputTokens: 10,
        cacheWriteInputTokens: 7,
      },
    });
    const seen: { usage?: FinishUsage } = {};
    const observer: NeuroLinkMiddleware = {
      specificationVersion: "v3",
      metadata: {
        id: "bedrock-usage-observer",
        name: "Bedrock usage observer",
      },
      wrapGenerate: async ({ doGenerate }) => {
        const result = await doGenerate();
        seen.usage = result.usage;
        return result;
      },
      wrapStream: async ({ doStream }) => {
        const result = await doStream();
        return {
          ...result,
          stream: result.stream.pipeThrough(
            new TransformStream({
              transform(part: LanguageModelV3StreamPart, controller) {
                if (part.type === "finish") {
                  seen.usage = part.usage;
                }
                controller.enqueue(part);
              },
            }),
          ),
        };
      },
    };
    try {
      await withBedrockSdk(local, async (sdk) => {
        const outcome = await settle(runTurn(sdk, mode, turnOptions(observer)));
        assert.equal(outcome.status, "ok", "the turn failed");
      });
      assert.ok(seen.usage, "the middleware never observed a usage record");
      // The AI SDK reads `total` as everything sent and `noCache` as the part
      // that was not served from the cache; Converse reports only the latter.
      assert.deepEqual(
        {
          total: seen.usage.inputTokens.total,
          noCache: seen.usage.inputTokens.noCache,
          cacheRead: seen.usage.inputTokens.cacheRead,
          cacheWrite: seen.usage.inputTokens.cacheWrite,
        },
        { total: 22, noCache: 5, cacheRead: 10, cacheWrite: 7 },
        "the input-token breakdown the middleware saw is wrong",
      );
      assert.equal(
        seen.usage.outputTokens.total,
        1,
        "the output-token count the middleware saw is wrong",
      );
    } finally {
      await local.close();
    }
  });
}

await test("Bedrock generate: a middleware that answers itself reports fresh input tokens, not the cache-inclusive total", async () => {
  const local = await startLocalBedrock("OK");
  const selfAnswer: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "bedrock-self-answer", name: "Bedrock self answer" },
    wrapGenerate: async () => ({
      content: [{ type: "text", text: "SYNTHETIC" }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 22, noCache: 5, cacheRead: 10, cacheWrite: 7 },
        outputTokens: { total: 1, text: 1, reasoning: 0 },
      },
      warnings: [],
    }),
  };
  try {
    await withBedrockSdk(local, async (sdk) => {
      const outcome = await settle(sdk.generate(turnOptions(selfAnswer)));
      assert.ok(outcome.status === "ok", "the turn failed");
      assert.equal(
        local.requests.length,
        0,
        "the model was called although the middleware answered",
      );
      assert.equal(
        outcome.value.content,
        "SYNTHETIC",
        "the middleware's own answer was lost",
      );
      const usage = outcome.value.usage;
      assert.deepEqual(
        { input: usage?.input, output: usage?.output, total: usage?.total },
        { input: 5, output: 1, total: 23 },
        "the reported usage counts the cache tokens twice",
      );
    });
  } finally {
    await local.close();
  }
});

const schemaTypeOf = (schema: unknown): unknown =>
  typeof schema === "object" && schema !== null && "type" in schema
    ? schema.type
    : undefined;

for (const mode of ["generate", "stream"] as const) {
  await test(`Bedrock ${mode}: a tool's input schema reaches middleware as plain JSON Schema, not AWS's wire envelope`, async () => {
    const local = await startLocalBedrock("OK");
    const seen: { schema?: unknown } = {};
    const schemaObserver: NeuroLinkMiddleware = {
      specificationVersion: "v3",
      metadata: {
        id: "bedrock-schema-observer",
        name: "Bedrock schema observer",
      },
      transformParams: async ({ params }) => {
        const declared = params.tools?.find(
          (candidate) =>
            candidate.type === "function" && candidate.name === LOOKUP,
        );
        seen.schema =
          declared?.type === "function" ? declared.inputSchema : undefined;
        return params;
      },
    };
    try {
      await withBedrockSdk(local, async (sdk) => {
        const outcome = await settle(
          runTurn(
            sdk,
            mode,
            turnOptions(schemaObserver, {
              disableTools: false,
              enabledToolNames: [LOOKUP],
              tools: {
                [LOOKUP]: tool({
                  description: "Look a thing up by its needle.",
                  inputSchema: z.object({ needle: z.string() }),
                  execute: async () => ({ found: false }),
                }),
              },
            }),
          ),
        );
        assert.equal(outcome.status, "ok", "the turn failed");
      });
      assert.ok(
        local.requests.length > 0,
        "the Bedrock stand-in was never reached",
      );
      const onWire = parseWireBody(local.requests[0]).toolConfig?.tools?.find(
        (entry) => entry.toolSpec?.name === LOOKUP,
      )?.toolSpec?.inputSchema;
      assert.ok(
        onWire && "json" in onWire,
        "the tool did not reach the wire in AWS's envelope form",
      );
      assert.ok(seen.schema, "the middleware was never offered the tool");
      assert.equal(
        schemaTypeOf(seen.schema),
        "object",
        "the middleware was handed an envelope instead of a JSON Schema",
      );
      assert.deepEqual(
        seen.schema,
        onWire.json,
        "the schema the middleware saw differs from the one on the wire",
      );
    } finally {
      await local.close();
    }
  });
}

for (const mode of ["generate", "stream"] as const) {
  await test(`Bedrock ${mode}: a system prompt a middleware removes is left off the wire, not sent as a blank block`, async () => {
    const local = await startLocalBedrock("OK");
    const keepSystem: NeuroLinkMiddleware = {
      specificationVersion: "v3",
      metadata: { id: "bedrock-keep-system", name: "Bedrock keep system" },
      transformParams: async ({ params }) => params,
    };
    const stripSystem: NeuroLinkMiddleware = {
      specificationVersion: "v3",
      metadata: { id: "bedrock-strip-system", name: "Bedrock strip system" },
      transformParams: async ({ params }) => ({
        ...params,
        prompt: params.prompt.filter((message) => message.role !== "system"),
      }),
    };
    try {
      await withBedrockSdk(local, async (sdk) => {
        for (const middleware of [keepSystem, stripSystem]) {
          const outcome = await settle(
            runTurn(sdk, mode, turnOptions(middleware)),
          );
          assert.equal(outcome.status, "ok", "the turn failed");
        }
      });
      assert.equal(
        local.requests.length,
        2,
        "the stand-in did not receive both turns",
      );
      const [kept, stripped] = local.requests.map(parseWireBody);
      const keptBlocks = kept.system ?? [];
      assert.ok(
        keptBlocks.length > 0 && keptBlocks.every(hasText),
        "the unmodified turn carried no system prompt, so removing it proves nothing",
      );
      assert.ok(
        (stripped.system ?? []).every(hasText),
        "a blank system block reached the wire after a middleware removed the system prompt",
      );
    } finally {
      await local.close();
    }
  });
}

await test("Bedrock generate: a middleware that recovers from a failed model call is not overruled by the loop's rejection", async () => {
  const local = await startLocalBedrock("OK", { failConverse: true });
  const seen: { caught?: string } = {};
  const recover: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "bedrock-recover", name: "Bedrock recover" },
    wrapGenerate: async ({ doGenerate }) => {
      try {
        return await doGenerate();
      } catch (error) {
        seen.caught = error instanceof Error ? error.name : "not an error";
        return {
          content: [{ type: "text", text: "RECOVERED" }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 2, text: 2, reasoning: 0 },
          },
          warnings: [],
        };
      }
    },
  };
  try {
    await withBedrockSdk(local, async (sdk) => {
      const outcome = await settle(sdk.generate(turnOptions(recover)));
      assert.equal(
        seen.caught,
        "ValidationException",
        "the middleware was never handed the model call's failure",
      );
      assert.equal(
        local.requests.length,
        1,
        "the failed model call was not made exactly once",
      );
      assert.ok(
        outcome.status === "ok",
        "the turn rejected although the middleware recovered from the failure",
      );
      assert.equal(
        outcome.value.content,
        "RECOVERED",
        "the middleware's recovery was lost",
      );
      const usage = outcome.value.usage;
      assert.deepEqual(
        { input: usage?.input, output: usage?.output, total: usage?.total },
        { input: 3, output: 2, total: 5 },
        "the recovery's usage was not the one reported",
      );
    });
  } finally {
    await local.close();
  }
});

await test("Bedrock stream: a middleware that throws after the loop started does not leave its request in flight", async () => {
  const local = await startLocalBedrock("OK", {
    hold: "converse-stream",
    toolUse: { name: LOOKUP, input: {} },
  });
  const caller = new AbortController();
  const seen = { refused: false };
  const streamRequests = () => local.requests.filter(isStreamRequest);
  const refuseAfterStart: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "bedrock-refuse-late", name: "Bedrock refuse late" },
    wrapStream: async ({ doStream }) => {
      await doStream();
      seen.refused = true;
      throw new Error(`${REFUSAL_MARKER}: refused after the loop started`);
    },
  };
  try {
    await withBedrockSdk(local, async (sdk) => {
      sdk.registerTool(LOOKUP, {
        name: LOOKUP,
        description: "Look a thing up.",
        inputSchema: { type: "object", properties: {}, required: [] },
        execute: async () => ({ found: true }),
      });
      try {
        const outcome = await settle(
          sdk.stream(
            turnOptions(refuseAfterStart, {
              disableTools: false,
              enabledToolNames: [LOOKUP],
              abortSignal: caller.signal,
            }),
          ),
        );
        assert.notEqual(outcome.status, "timeout", "the turn never settled");
        assert.ok(seen.refused, "the middleware never reached its refusal");
        assert.ok(
          streamRequests().length >= 1,
          "the tool loop never sent its first request",
        );
        // Where the loop's next request is sent at all, it must not be left
        // open. The break-out test below shows that request does go out when
        // nothing stops the loop before it.
        const sent = await waitUntil(() => streamRequests().length >= 2, 2_000);
        if (sent) {
          assert.ok(
            await waitUntil(() => streamRequests()[1].aborted, 5_000),
            "a request the orphaned tool loop sent was never closed",
          );
        }
      } finally {
        caller.abort();
      }
    });
  } finally {
    await local.close();
  }
});

// A 1x1 PNG: enough to make a turn multimodal without adding any weight.
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

for (const mode of ["generate", "stream"] as const) {
  await test(`Bedrock ${mode}: a multimodal turn warns that configured middleware was not applied`, async () => {
    const local = await startLocalBedrock("OK");
    const record = emptyRecord();
    const warnings: string[] = [];
    const originalWarn = logger.warn;
    // A call, not `local.requests.length` inline: an assertion on that
    // expression narrows it to a literal, and the next turn's count would then
    // read as an impossible comparison.
    const requestCount = (): number => local.requests.length;
    const skipWarnings = () =>
      warnings.filter((line) =>
        line.includes("configured middleware was NOT applied"),
      ).length;
    const withImage = {
      input: { text: "describe this", images: [PIXEL_PNG] },
    };
    try {
      await withBedrockSdk(local, async (sdk) => {
        logger.warn = (...args: unknown[]) => {
          warnings.push(args.map(String).join(" "));
        };
        try {
          const configured = await settle(
            runTurn(sdk, mode, turnOptions(createProbe(record), withImage)),
          );
          assert.equal(configured.status, "ok", "the configured turn failed");
          assert.ok(
            requestCount() === 1 && local.requests[0].body.includes('"image"'),
            "the configured turn did not reach the wire as a multimodal one",
          );
          assert.equal(
            skipWarnings(),
            1,
            "skipping the configured middleware was not announced exactly once",
          );

          const plain = await settle(
            runTurn(
              sdk,
              mode,
              turnOptions(createProbe(record), {
                ...withImage,
                middleware: undefined,
              }),
            ),
          );
          assert.equal(plain.status, "ok", "the plain turn failed");
          assert.ok(
            requestCount() === 2 && local.requests[1].body.includes('"image"'),
            "the plain turn did not reach the wire as a multimodal one",
          );
          assert.equal(
            skipWarnings(),
            1,
            "a turn with no middleware configured warned that middleware was skipped",
          );

          const textOnly = await settle(
            runTurn(sdk, mode, turnOptions(createProbe(record))),
          );
          assert.equal(textOnly.status, "ok", "the text-only turn failed");
          assert.equal(
            requestCount(),
            3,
            "the text-only turn did not reach the wire",
          );
          assert.equal(
            skipWarnings(),
            1,
            "a text-only turn warned that middleware was skipped",
          );
        } finally {
          logger.warn = originalWarn;
        }
      });
    } finally {
      await local.close();
    }
  });
}

// A middleware that adds `extra` to every call's params and counts how often
// it ran, so a test can tell "the hook ran and changed nothing" from "the hook
// never ran".
const paramSetter = (
  extra: Partial<LanguageModelV3CallOptions>,
  seen: { transformParamsRuns: number },
): NeuroLinkMiddleware => ({
  specificationVersion: "v3",
  metadata: { id: "bedrock-param-setter", name: "Bedrock param setter" },
  transformParams: async ({ params }) => {
    seen.transformParamsRuns += 1;
    return { ...params, ...extra };
  },
});

// Converse is sent `maxTokens` and `temperature` and nothing else, so a
// sampling option a middleware adds cannot reach the model. A middleware cannot
// repair that, so the claim is narrower: the drop is announced, and the
// announcement matches what went over the wire.
for (const mode of ["generate", "stream"] as const) {
  await test(`Bedrock ${mode}: sampling options a middleware sets that Converse is not sent are warned about`, async () => {
    const local = await startLocalBedrock("OK");
    const warnings: string[] = [];
    const originalWarn = logger.warn;
    const seen = { transformParamsRuns: 0 };
    // A call, not `seen.transformParamsRuns` inline: an assertion on that
    // expression narrows it to a literal, and the next turn's count would
    // then read as an impossible comparison (see `requestCount` below).
    const runs = (): number => seen.transformParamsRuns;
    const requestCount = (): number => local.requests.length;
    const unsentWarnings = (): string[] =>
      warnings.filter((line) => line.includes("does not send"));
    try {
      await withBedrockSdk(local, async (sdk) => {
        const turn = (extra: Partial<LanguageModelV3CallOptions>) =>
          settle(runTurn(sdk, mode, turnOptions(paramSetter(extra, seen))));
        logger.warn = (...args: unknown[]) => {
          warnings.push(args.map(String).join(" "));
        };
        try {
          const unsent = await turn({
            topP: 0.3,
            stopSequences: ["END"],
            seed: 7,
          });
          assert.equal(unsent.status, "ok", "the turn setting options failed");
          assert.ok(
            runs() === 1 && requestCount() === 1,
            "the middleware did not run once on a turn that reached the wire",
          );
          const sent = local.requests[0];
          const inference = parseWireBody(sent).inferenceConfig;
          // `maxTokens` is caller-controlled and this turn sets none — Bedrock
          // then sends none on the generate path (unlimited by default) but a
          // model-ceiling default on the stream path, a pre-existing asymmetry
          // this test does not exercise. `temperature` alone is always present
          // on both paths and is enough to prove a real wire request arrived.
          assert.ok(
            inference?.temperature !== undefined,
            "the wire request has no inference settings to compare against",
          );
          assert.ok(
            !/"(topP|stopSequences|seed)"/.test(sent.body),
            "a warned-about option reached the wire after all",
          );
          const announced = unsentWarnings();
          assert.equal(
            announced.length,
            1,
            "dropping the options was not announced exactly once",
          );
          assert.ok(
            ["'topP'", "'stopSequences'", "'seed'", `${mode} path`].every(
              (part) => announced[0].includes(part),
            ),
            "the announcement does not name every dropped option and the path",
          );

          const nothing = await turn({});
          assert.equal(nothing.status, "ok", "the turn setting nothing failed");
          assert.ok(
            runs() === 2 && requestCount() === 2,
            "the middleware did not run on the turn that sets nothing",
          );
          assert.equal(
            unsentWarnings().length,
            1,
            "a turn that sets no such option was warned about",
          );

          const emptyList = await turn({ stopSequences: [] });
          assert.equal(emptyList.status, "ok", "the empty-list turn failed");
          assert.ok(
            runs() === 3 && requestCount() === 3,
            "the middleware did not run on the empty-list turn",
          );
          assert.equal(
            unsentWarnings().length,
            1,
            "an empty stop list was warned about as if it had a value",
          );
        } finally {
          logger.warn = originalWarn;
        }
      });
    } finally {
      await local.close();
    }
  });

  // The other half of the same contract: what the turn does send is what a
  // middleware set, not what the caller asked for.
  await test(`Bedrock ${mode}: the temperature and output-token limit a middleware sets reach the wire`, async () => {
    const local = await startLocalBedrock("OK");
    const seen = { transformParamsRuns: 0 };
    // A call, not `seen.transformParamsRuns` inline: an assertion on that
    // expression narrows it to a literal, and the next turn's count would
    // then read as an impossible comparison (see `requestCount` below).
    const runs = (): number => seen.transformParamsRuns;
    const requestCount = (): number => local.requests.length;
    const callerAsked = { temperature: 0.9, maxTokens: 1234 };
    try {
      await withBedrockSdk(local, async (sdk) => {
        const control = await settle(
          runTurn(sdk, mode, turnOptions(paramSetter({}, seen), callerAsked)),
        );
        assert.equal(control.status, "ok", "the control turn failed");
        assert.ok(
          runs() === 1 && requestCount() === 1,
          "the middleware did not run on the control turn",
        );
        const controlWire = parseWireBody(local.requests[0]).inferenceConfig;
        assert.equal(
          controlWire?.temperature,
          callerAsked.temperature,
          "the caller's temperature did not reach the wire on the control turn",
        );
        assert.equal(
          controlWire?.maxTokens,
          callerAsked.maxTokens,
          "the caller's output-token limit did not reach the wire on the control turn",
        );

        const rewritten = await settle(
          runTurn(
            sdk,
            mode,
            turnOptions(
              paramSetter({ temperature: 0.2, maxOutputTokens: 77 }, seen),
              callerAsked,
            ),
          ),
        );
        assert.equal(rewritten.status, "ok", "the rewriting turn failed");
        assert.ok(
          runs() === 2 && requestCount() === 2,
          "the middleware did not run on the rewriting turn",
        );
        const wire = parseWireBody(local.requests[1]).inferenceConfig;
        assert.equal(
          wire?.temperature,
          0.2,
          "the temperature a middleware set did not reach the wire",
        );
        assert.equal(
          wire?.maxTokens,
          77,
          "the output-token limit a middleware set did not reach the wire",
        );
      });
    } finally {
      await local.close();
    }
  });
}

await test("Bedrock stream: breaking out of a wrapped stream aborts the request the tool loop has in flight", async () => {
  const local = await startLocalBedrock("OK", {
    hold: "converse-stream",
    toolUse: { name: LOOKUP, input: {} },
  });
  const caller = new AbortController();
  const seen = { executions: 0 };
  const streamRequests = () => local.requests.filter(isStreamRequest);
  try {
    await withBedrockSdk(local, async (sdk) => {
      sdk.registerTool(LOOKUP, {
        name: LOOKUP,
        description: "Look a thing up.",
        inputSchema: { type: "object", properties: {}, required: [] },
        execute: async () => {
          seen.executions += 1;
          return { found: true };
        },
      });
      try {
        const opened = await settle(
          sdk.stream(
            turnOptions(createProbe(emptyRecord()), {
              disableTools: false,
              enabledToolNames: [LOOKUP],
              abortSignal: caller.signal,
            }),
          ),
        );
        assert.ok(
          opened.status === "ok",
          "the tool turn never returned a stream",
        );
        // The consumer can only see content once the loop's second request is
        // open and answering, and the stand-in never finishes that answer, so
        // breaking out of the stream leaves a request genuinely in flight.
        const consumer = settle(
          (async () => {
            for await (const chunk of opened.value.stream) {
              if ("content" in chunk && chunk.content) {
                break;
              }
            }
          })(),
        );
        assert.ok(
          await waitUntil(() => streamRequests().length >= 2),
          "the tool loop never sent its second request",
        );
        assert.equal(seen.executions, 1, "the tool did not run exactly once");
        assert.ok(
          await waitUntil(() => streamRequests()[1].aborted, 8_000),
          "the request in flight stayed open after the consumer broke out",
        );
        assert.notEqual(
          (await consumer).status,
          "timeout",
          "the consumer never returned after breaking out",
        );
      } finally {
        caller.abort();
      }
    });
  } finally {
    await local.close();
  }
});

await test("Bedrock generate: a middleware can rewrite the reply while the loop's finish reason and usage stay authoritative", async () => {
  const local = await startLocalBedrock("OK", {
    usage: { inputTokens: 5, outputTokens: 1, cacheReadInputTokens: 10 },
  });
  const rewriter: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "bedrock-rewriter", name: "Bedrock rewriter" },
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      return {
        ...result,
        content: [{ type: "text", text: "REWRITTEN" }],
        finishReason: { unified: "length", raw: "length" },
        usage: {
          inputTokens: {
            total: 900,
            noCache: 900,
            cacheRead: 0,
            cacheWrite: 0,
          },
          outputTokens: { total: 90, text: 90, reasoning: 0 },
        },
      };
    },
  };
  try {
    await withBedrockSdk(local, async (sdk) => {
      const outcome = await settle(sdk.generate(turnOptions(rewriter)));
      assert.ok(outcome.status === "ok", "the turn failed");
      assert.equal(
        local.requests.length,
        1,
        "the model was not called once, so there is no loop outcome to read",
      );
      assert.equal(
        outcome.value.content,
        "REWRITTEN",
        "the middleware's rewrite of the reply was lost",
      );
      assert.equal(
        outcome.value.finishReason,
        "stop",
        "a middleware overrode the finish reason of a turn the model completed",
      );
      const usage = outcome.value.usage;
      assert.deepEqual(
        { input: usage?.input, output: usage?.output },
        { input: 5, output: 1 },
        "a middleware overrode the token usage of a turn that reached the wire",
      );
    });
  } finally {
    await local.close();
  }
});

// ---------------------------------------------------------------------------
// ANTHROPIC (direct) — native stream() middleware.
//
// generate() on the direct Anthropic provider has always wrapped its model
// (executeNativeGenerate → getAISDKModelWithMiddleware); its stream() loop
// never did, so transformParams, wrapStream and guardrails ran on generate()
// and were silently skipped on stream() — a precall guardrail that should
// have blocked the request let it through. The stand-ins are the
// Anthropic-on-Vertex ones above (`startAnthropicStandIn`,
// `startAnthropicHoldOpenStandIn`, `anthropicTextTurn`): the Messages wire is
// the same, and `ANTHROPIC_BASE_URL` points the provider at them.
// ---------------------------------------------------------------------------

section("Anthropic (direct)");

const DIRECT_ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

const withDirectAnthropic = <T>(port: number, fn: () => Promise<T>) =>
  withEnv(
    {
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
      ANTHROPIC_API_KEY: "sk-ant-mock-local-server",
      ANTHROPIC_AUTH_METHOD: "api_key",
    },
    fn,
  );

const directAnthropicStream = (extra: Record<string, unknown> = {}) => ({
  input: { text: "hello" },
  provider: "anthropic",
  model: DIRECT_ANTHROPIC_MODEL,
  disableTools: true,
  disableInternalFallback: true,
  ...extra,
});

await test("Anthropic: stream applies model middleware and a transformParams rewrite reaches the wire", async () => {
  const standIn = await startAnthropicStandIn(() =>
    anthropicTextTurn("direct reply"),
  );
  const record = emptyRecord();
  try {
    await withDirectAnthropic(standIn.port, async () => {
      const nl = new NeuroLink();
      try {
        const text = await bounded(
          readText(
            await nl.stream(
              directAnthropicStream({ middleware: middlewareOptions(record) }),
            ),
          ),
        );
        assert.equal(
          standIn.calls.length,
          1,
          "precondition: the stream never reached the stand-in",
        );
        assert.equal(text, "direct reply", "the streamed reply was lost");
        assert.ok(
          record.transformParamsCalls.includes("stream"),
          'transformParams never fired with type "stream" on stream()',
        );
        assert.ok(
          record.wrapStreamCalls > 0,
          "wrapStream never fired on the streaming path",
        );
        assert.ok(
          JSON.stringify(standIn.calls[0]?.body.messages ?? []).includes(
            MARKER,
          ),
          "the transformParams rewrite did not reach the wire on stream",
        );
      } finally {
        await nl.shutdown();
      }
    });
  } finally {
    await standIn.close();
  }
});

await test("Anthropic: wrapStream filters text and observes the V3 terminal event with usage", async () => {
  const standIn = await startAnthropicStandIn(() =>
    anthropicTextTurn("direct reply"),
  );
  const seen: LanguageModelV3StreamPart[] = [];
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "anthropic-wire-filter", name: "Anthropic wire filter" },
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
    await withDirectAnthropic(standIn.port, async () => {
      const nl = new NeuroLink();
      try {
        const text = await bounded(
          readText(
            await nl.stream(
              directAnthropicStream({
                middleware: {
                  middleware: [middleware],
                  enabledMiddleware: ["anthropic-wire-filter"],
                },
              }),
            ),
          ),
        );
        assert.equal(standIn.calls.length, 1, "wire request did not run");
        assert.equal(text, "DIRECT REPLY", "wrapStream's filter was lost");
        const finishes = seen.filter((part) => part.type === "finish");
        assert.equal(finishes.length, 1, "terminal event not forwarded");
        const finish = finishes[0];
        assert.ok(
          finish?.type === "finish" &&
            finish.usage.inputTokens.total === 5 &&
            finish.usage.outputTokens.total === 4,
          "the terminal event did not carry the turn's usage",
        );
      } finally {
        await nl.shutdown();
      }
    });
  } finally {
    await standIn.close();
  }
});

await test("Anthropic: stream middleware sampling edits reach the wire", async () => {
  const standIn = await startAnthropicStandIn(() =>
    anthropicTextTurn("direct reply"),
  );
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "anthropic-sampling", name: "Anthropic sampling" },
    transformParams: async ({ params }) => ({
      ...params,
      maxOutputTokens: 77,
      temperature: 0.25,
      topP: 0.9,
    }),
  };
  try {
    await withDirectAnthropic(standIn.port, async () => {
      const nl = new NeuroLink();
      try {
        await bounded(
          readText(
            await nl.stream(
              directAnthropicStream({
                maxTokens: 128,
                temperature: 0.7,
                middleware: {
                  middleware: [middleware],
                  enabledMiddleware: ["anthropic-sampling"],
                },
              }),
            ),
          ),
        );
        assert.equal(standIn.calls.length, 1, "sampling fixture not reached");
        const body = standIn.calls[0]?.body ?? {};
        assert.equal(body.max_tokens, 77, "token override lost");
        assert.equal(body.temperature, 0.25, "temperature override lost");
        assert.equal(body.top_p, 0.9, "top-p override lost");
        assert.equal(body.stream, true, "stream mode changed");
      } finally {
        await nl.shutdown();
      }
    });
  } finally {
    await standIn.close();
  }
});

await test("Anthropic: precall guardrail blocks stream — target never called", async () => {
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
  const target = await startAnthropicStandIn(() =>
    anthropicTextTurn("should never be seen"),
  );
  try {
    await withEnv(
      {
        OPENAI_COMPATIBLE_API_KEY: "test-evaluator-key",
        OPENAI_COMPATIBLE_BASE_URL: evaluator.baseURL,
      },
      () =>
        withDirectAnthropic(target.port, async () => {
          const nl = new NeuroLink();
          try {
            const result = await nl.stream(
              directAnthropicStream({
                input: { text: "block this request" },
                enableAnalytics: true,
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
              }),
            );
            const content = await bounded(readText(result));
            assert.ok(
              evaluator.wasCalled(),
              "guardrail evaluator was not exercised",
            );
            assert.equal(
              target.calls.length,
              0,
              "blocked input reached the Anthropic target",
            );
            assert.equal(
              content,
              "Request contains inappropriate content and has been blocked.",
              "Anthropic guardrail refusal was lost",
            );
            if (result.analytics) {
              await bounded(Promise.resolve(result.analytics));
            }
          } finally {
            await nl.shutdown();
          }
        }),
    );
  } finally {
    await target.close();
    await evaluator.close();
  }
});

await test("Anthropic: guardrail bad-word filtering catches a term split across stream blocks", async () => {
  const server = await startSplitBlockAnthropicServer(SPLIT_TERM);
  try {
    await withEnv(
      {
        ANTHROPIC_BASE_URL: server.baseURL,
        ANTHROPIC_API_KEY: "sk-ant-mock-local-server",
        ANTHROPIC_AUTH_METHOD: "api_key",
      },
      async () => {
        const sdk = new NeuroLink();
        try {
          const base = directAnthropicStream({
            model: "claude-sonnet-4-20250514",
          });
          const unfiltered = await bounded(readText(await sdk.stream(base)));
          assert.equal(
            server.requests(),
            1,
            "precondition: split server not exercised",
          );
          assert.equal(
            unfiltered,
            WHOLE_TERM,
            "precondition: split blocks did not reassemble into the whole term",
          );
          const filtered = await bounded(
            readText(
              await sdk.stream({ ...base, middleware: splitTermGuardrails }),
            ),
          );
          assert.equal(
            server.requests(),
            2,
            "guarded stream did not reach the provider",
          );
          assert.equal(
            filtered,
            "CLEAN",
            "term split across stream blocks escaped the guardrail",
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

await test("Anthropic: breaking out of a wrapped stream cancels the upstream socket", async () => {
  const standIn = await startAnthropicHoldOpenStandIn();
  try {
    await withDirectAnthropic(standIn.port, async () => {
      const nl = new NeuroLink();
      try {
        const result = await nl.stream(
          directAnthropicStream({
            middleware: middlewareOptions(emptyRecord()),
          }),
        );
        await bounded(
          (async () => {
            for await (const chunk of result.stream) {
              if ("content" in chunk && chunk.content) {
                break;
              }
            }
          })(),
        );
        assert.equal(standIn.calls.length, 1, "server was never reached");
        await bounded(
          (async () => {
            while (standIn.closedResponses() === 0) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          })(),
        );
        assert.ok(standIn.closedResponses() > 0, "upstream socket not closed");
      } finally {
        await nl.shutdown();
      }
    });
  } finally {
    await standIn.close();
  }
});

await test("Anthropic: stream() fires onChunk/onFinish exactly once per chunk through the native V3 middleware chain", async () => {
  const standIn = await startAnthropicStandIn(() =>
    anthropicTextTurn("should never be seen"),
  );
  const onChunkCalls: LifecycleChunkPayload[] = [];
  const onFinishCalls: LifecycleFinishPayload[] = [];
  try {
    await withDirectAnthropic(standIn.port, async () => {
      const nl = new NeuroLink();
      try {
        const result = await nl.stream(
          directAnthropicStream({
            middleware: {
              middleware: [v3DeltaStream],
              enabledMiddleware: ["v3-delta-stream"],
            },
            onChunk: (payload: LifecycleChunkPayload) => {
              onChunkCalls.push(payload);
            },
            onFinish: (payload: LifecycleFinishPayload) => {
              onFinishCalls.push(payload);
            },
          }),
        );
        assert.equal(
          await bounded(readText(result)),
          "Hello",
          "the stream's own text content was wrong",
        );
        assert.equal(
          standIn.calls.length,
          0,
          "the synthetic V3 stream should have pre-empted the real wire call",
        );
        assert.equal(
          onChunkCalls.filter((c) => c.type === "text-delta").length,
          2,
          "onChunk must fire exactly once per real chunk, not duplicated",
        );
        assert.equal(
          onFinishCalls.length,
          1,
          "onFinish fired a different number of times than exactly once",
        );
      } finally {
        await nl.shutdown();
      }
    });
  } finally {
    await standIn.close();
  }
});

await runSuite();

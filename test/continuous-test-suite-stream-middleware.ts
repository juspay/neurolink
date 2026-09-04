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
import { createServer } from "node:http";
import { once } from "node:events";
import { z } from "zod";
import type {
  NeuroLinkMiddleware,
  LanguageModelV3StreamPart,
  StreamResult,
} from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  mockOpenAICredentials,
  startMockChatServer,
  startScriptedChatServer,
  chatCompletion,
} from "./helpers/mockChatServer.js";
import { NeuroLink, tool } from "../dist/index.js";

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

await runSuite();

#!/usr/bin/env tsx
/** Determinism exception: recorded provider errors, advertised context limits,
 * and byte/cancellation boundaries require exact fixtures a live model cannot
 * reproduce. The suite uses only the isolated source module graph. */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import {
  createCodexFallbackStream,
  parseCodexFallbackSSE,
} from "../src/lib/proxy/codexFallback.js";
let passed = 0;
async function test(name: string, run: () => Promise<void>) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}
function assertError(actual: unknown, expected: Record<string, unknown>) {
  assert.ok(actual instanceof Error);
  assertFields(actual, expected);
}
function assertFields(actual: unknown, expected: Record<string, unknown>) {
  assert.ok(actual !== null && typeof actual === "object");
  for (const [key, value] of Object.entries(expected)) {
    if (value !== null && typeof value === "object") {
      assertFields(Reflect.get(actual, key), value as Record<string, unknown>);
    } else {
      assert.deepEqual(Reflect.get(actual, key), value, `Error field ${key}`);
    }
  }
}

const sse = (event: Record<string, unknown>) =>
  `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
async function captureError(
  streaming: boolean,
  event: Record<string, unknown>,
): Promise<unknown> {
  try {
    if (!streaming) {
      return parseCodexFallbackSSE(sse(event));
    }
    const bridge = await createCodexFallbackStream(
      new Response(sse(event), {
        headers: { "content-type": "text/event-stream" },
      }),
      "claude-test",
    );
    for await (const _frame of bridge.frames) {
      /* exhaust the actual adapter */
    }
  } catch (error) {
    return error;
  }
  throw new Error("Expected terminal failure");
}

for (const streaming of [false, true]) {
  for (const type of ["error", "response.failed"]) {
    await test(`preserves nonretryable policy cause in ${type}, streaming=${streaming}`, async () => {
      const error = {
        code: "cyber_policy",
        message: "Provider policy denied this request",
        retryable: false,
      };
      const event =
        type === "error"
          ? { type, ...error }
          : { type, response: { status: "failed", error } };
      assertError(await captureError(streaming, event), {
        code: "cyber_policy",
        status: 403,
        retryable: false,
        message: "Provider policy denied this request",
      });
    });
  }
  await test(`preserves incomplete reason and reported usage, streaming=${streaming}`, async () => {
    const event = {
      type: "response.incomplete",
      response: {
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        usage: {
          input_tokens: 80,
          output_tokens: 20,
          output_tokens_details: { reasoning_tokens: 19 },
        },
      },
    };
    assertError(await captureError(streaming, event), {
      code: "max_output_tokens",
      retryable: false,
      usage: { input: 80, output: 20, reasoning: 19 },
    });
  });
  await test(`retains usage when an upstream completion has no visible output, streaming=${streaming}`, async () => {
    const event = {
      type: "response.completed",
      response: {
        status: "completed",
        output: [],
        usage: {
          input_tokens: 100,
          output_tokens: 12,
          output_tokens_details: { reasoning_tokens: 11 },
        },
      },
    };
    assertError(await captureError(streaming, event), {
      code: "empty_response",
      usage: { input: 100, output: 12, reasoning: 11 },
    });
  });
  await test(`redacts provider secrets before exposing a structured message, streaming=${streaming}`, async () => {
    const error = (await captureError(streaming, {
      type: "error",
      code: "server_error",
      message: "Bad Bearer secret123456789 access_token=privatetoken",
    })) as Error;
    assert.ok(!error.message.includes("secret123456789"));
    assert.ok(!error.message.includes("privatetoken"));
    assert.ok(error.message.includes("Bad"));
  });
}
console.log(`Passed: ${passed}; Failed: 0; RESULT: PASS`);

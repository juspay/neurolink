#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — OpenAI-compat SSE reader cancellation (#2042)
 * Run: npx tsx test/continuous-test-suite-openai-compat-stream-cancel.ts
 *
 * DETERMINISM EXCEPTION (rule 15): this suite imports parseSSEStream from
 * src/. A rejecting ReadableStream.cancel() during error cleanup cannot be
 * induced through a live request or a real HTTP server, so the body is a
 * hand-built ReadableStream whose cancel() rejects. Everything is taken from
 * src/; nothing is imported from dist/.
 */

import { parseSSEStream } from "../src/lib/providers/openaiChatCompletionsClient.js";
import { defineSuite, assert } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("OpenAI-compat SSE cancel failure", {
  offline: true,
});

void runSuite(async () => {
  await test("reader cancellation failure does not replace the upstream error", async () => {
    const cancellationError = new Error("reader cancellation failed");
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            [
              `data: ${JSON.stringify({ error: { message: "upstream exploded" } })}`,
              "data: {malformed",
            ].join("\n\n") + "\n\n",
          ),
        );
      },
      cancel() {
        return Promise.reject(cancellationError);
      },
    });

    let error: unknown;
    try {
      await parseSSEStream(body, () => undefined);
    } catch (caught) {
      error = caught;
    }

    assert(error instanceof Error, "stream did not throw an Error");
    const streamError = error as Error & {
      code?: string;
      retriable?: boolean;
    };
    assert(
      streamError.code === "OPENAI_COMPAT_STREAM_ERROR_FRAME",
      `wrong error code: ${streamError.code}`,
    );
    assert(
      streamError.message.includes("upstream exploded"),
      `wrong error message: ${streamError.message}`,
    );
    assert(
      streamError.retriable === false,
      "upstream error retryability changed",
    );
    assert(
      !streamError.message.includes(cancellationError.message),
      "cancellation error replaced the upstream error",
    );
  });
});

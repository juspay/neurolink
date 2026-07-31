import { APICallError } from "../src/lib/utils/generationErrors.js";
import {
  MAX_RETRY_AFTER_MS,
  withProviderRetry,
} from "../src/lib/utils/providerRetry.js";
import { parseRetryAfterMs } from "../src/lib/utils/retryAfter.js";
import { createPrediction } from "../src/lib/adapters/replicate/predictionLifecycle.js";
import { NeuroLinkError } from "../src/lib/utils/errorHandling.js";
import { afterEach, describe, expect, it, vi } from "vitest";

const replicateAuth = {
  apiToken: "test-token",
  baseUrl: "https://example.invalid",
};

const replicateInput = {
  model: "owner/model",
  input: { prompt: "test prompt" },
};

function createRetryableError(
  responseHeaders?: Record<string, string>,
): APICallError {
  return new APICallError({
    message: "Provider request was rate limited",
    url: "https://example.invalid/v1/generate",
    requestBodyValues: {},
    statusCode: 429,
    responseHeaders,
    isRetryable: true,
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Retry-After parsing", () => {
  it("parses a numeric Retry-After value as seconds", () => {
    expect(parseRetryAfterMs(new Headers({ "Retry-After": "7" }))).toBe(7_000);
  });

  it("parses an HTTP-date Retry-After value relative to the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 0, 1, 0, 0, 0));

    const retryAt = new Date(Date.now() + 15_000).toUTCString();

    expect(parseRetryAfterMs(new Headers({ "Retry-After": retryAt }))).toBe(
      15_000,
    );
  });

  it("returns undefined when rate-limit headers are absent", () => {
    expect(parseRetryAfterMs(new Headers())).toBeUndefined();
  });

  it("returns undefined when Retry-After is invalid", () => {
    expect(
      parseRetryAfterMs(new Headers({ "Retry-After": "not-a-date" })),
    ).toBeUndefined();
  });
});

describe("provider retry timing", () => {
  it("waits for the Retry-After header duration before retrying an AI SDK error", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(createRetryableError({ "retry-after": "3" }))
      .mockResolvedValue("success");
    const recordedDelays: number[] = [];

    await expect(
      withProviderRetry(
        operation,
        undefined,
        "test provider call",
        async (ms) => {
          recordedDelays.push(ms);
        },
      ),
    ).resolves.toBe("success");

    expect(recordedDelays).toEqual([3_000]);
  });

  it("waits at least ten seconds when a retryable error has no server delay", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(createRetryableError())
      .mockResolvedValue("success");
    const recordedDelays: number[] = [];

    await withProviderRetry(
      operation,
      undefined,
      "test provider call",
      async (ms) => {
        recordedDelays.push(ms);
      },
    );

    expect(recordedDelays).toEqual([10_000]);
  });

  it("honors a Retry-After hint at the cap boundary exactly", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(createRetryableError({ "Retry-After": "59" }))
      .mockResolvedValue("success");
    const recordedDelays: number[] = [];

    await withProviderRetry(
      operation,
      undefined,
      "test provider call",
      async (ms) => {
        recordedDelays.push(ms);
      },
    );

    expect(recordedDelays).toEqual([59_000]);
  });

  it("surfaces immediately (no sleep, no retry) when Retry-After exceeds the cap", async () => {
    const err = createRetryableError({ "Retry-After": "8549" });
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(err);
    const recordedDelays: number[] = [];

    await expect(
      withProviderRetry(
        operation,
        undefined,
        "test provider call",
        async (ms) => {
          recordedDelays.push(ms);
        },
      ),
    ).rejects.toBe(err);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(recordedDelays).toEqual([]);
    // The surfaced error is stamped so upper retry layers also stand down.
    expect(
      (err as unknown as { isRetryable?: boolean; retryAfterMs?: number })
        .isRetryable,
    ).toBe(false);
    expect((err as unknown as { retryAfterMs?: number }).retryAfterMs).toBe(
      8_549_000,
    );
    expect(8_549_000).toBeGreaterThan(MAX_RETRY_AFTER_MS);
  });

  it("classifies official-SDK errors via .status and reads their .headers hint", async () => {
    // Shape of @anthropic-ai/sdk's APIError: `.status` + `.headers`,
    // no `.statusCode`, not an AI SDK APICallError.
    const sdkShaped = Object.assign(new Error("429 rate_limit_error"), {
      status: 429,
      headers: new Headers({ "retry-after": "2" }),
    });
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(sdkShaped)
      .mockResolvedValue("success");
    const recordedDelays: number[] = [];

    await expect(
      withProviderRetry(
        operation,
        undefined,
        "test provider call",
        async (ms) => {
          recordedDelays.push(ms);
        },
      ),
    ).resolves.toBe("success");

    expect(recordedDelays).toEqual([2_000]);
  });

  it("uses the no-hint delay when a stamped retryAfterMs is NaN", async () => {
    const sdkShaped = Object.assign(new Error("429 rate_limit_error"), {
      status: 429,
      retryAfterMs: Number.NaN,
    });
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(sdkShaped)
      .mockResolvedValue("success");
    const recordedDelays: number[] = [];

    await expect(
      withProviderRetry(
        operation,
        undefined,
        "test provider call",
        async (ms) => {
          recordedDelays.push(ms);
        },
      ),
    ).resolves.toBe("success");

    // NaN must not reach sleep() (it would fire immediately); the invalid
    // hint is discarded and the 10s no-hint floor applies.
    expect(recordedDelays).toEqual([10_000]);
  });

  it("surfaces an official-SDK 429 with an over-cap .headers hint immediately", async () => {
    const sdkShaped = Object.assign(new Error("429 rate_limit_error"), {
      status: 429,
      headers: new Headers({ "retry-after": "8549" }),
    });
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(sdkShaped);

    await expect(
      withProviderRetry(
        operation,
        undefined,
        "test provider call",
        async () => {
          throw new Error("must not sleep");
        },
      ),
    ).rejects.toBe(sdkShaped);

    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe("Replicate prediction submission", () => {
  it("preserves the Retry-After duration on Replicate rate-limit errors", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "4" },
      });
    });

    let thrownError: unknown;
    try {
      await createPrediction(replicateAuth, replicateInput, async () => {});
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(NeuroLinkError);
    expect((thrownError as NeuroLinkError).retriable).toBe(true);
    expect((thrownError as NeuroLinkError).retryAfterMs).toBe(4_000);
  });

  it("retries Replicate submission after waiting for the Retry-After duration", async () => {
    const events: string[] = [];
    vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(async () => {
        events.push("first request");
        return new Response("rate limited", {
          status: 429,
          headers: { "Retry-After": "2" },
        });
      })
      .mockImplementationOnce(async () => {
        events.push("second request");
        return new Response(
          JSON.stringify({
            id: "prediction-1",
            status: "succeeded",
            output: "https://example.invalid/output",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      });

    const result = await createPrediction(
      replicateAuth,
      replicateInput,
      async (ms) => {
        events.push(`waited ${ms} milliseconds`);
      },
    );

    expect(result.id).toBe("prediction-1");
    expect(events).toEqual([
      "first request",
      "waited 2000 milliseconds",
      "second request",
    ]);
  });
});

describe("parseRetryAfterMs fallbacks and clamping", () => {
  it("clamps a negative Retry-After seconds value to an immediate retry", () => {
    expect(parseRetryAfterMs({ "retry-after": "-5" })).toBe(0);
  });

  it("clamps a past HTTP-date Retry-After to an immediate retry", () => {
    expect(
      parseRetryAfterMs({ "retry-after": "Wed, 21 Oct 2015 07:28:00 GMT" }),
    ).toBe(0);
  });

  it("falls back to a future X-RateLimit-Reset epoch-seconds timestamp", () => {
    const resetSeconds = Math.floor(Date.now() / 1000) + 30;
    const delayMs = parseRetryAfterMs({
      "x-ratelimit-reset": String(resetSeconds),
    });
    expect(delayMs).toBeGreaterThan(25_000);
    expect(delayMs).toBeLessThanOrEqual(30_000);
  });

  it("falls back to a short delay when X-RateLimit-Remaining is exhausted", () => {
    expect(parseRetryAfterMs({ "x-ratelimit-remaining": "0" })).toBe(1000);
  });

  it("keeps HTTPRateLimiter.handleRateLimitResponse non-negative for negative Retry-After", async () => {
    const { HTTPRateLimiter } =
      await import("../src/lib/mcp/httpRateLimiter.js");
    const limiter = new HTTPRateLimiter();
    const headers = new Headers({ "Retry-After": "-5" });
    expect(limiter.handleRateLimitResponse(headers)).toBe(0);
  });
});

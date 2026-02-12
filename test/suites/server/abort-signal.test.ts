import { describe, it, expect, vi } from "vitest";
import {
  createAbortSignalMiddleware,
  createExpressAbortMiddleware,
} from "../../../src/lib/server/middleware/abortSignal.js";
import type { ServerContext } from "../../../src/lib/server/types.js";

/**
 * Test mock for ServerContext - includes only the properties needed for abort signal tests
 */
type TestServerContext = Partial<ServerContext> & {
  rawResponse: unknown;
  abortSignal?: AbortSignal;
  abortController?: AbortController;
};

/**
 * Express-like response mock for testing
 */
type MockExpressResponse = {
  on: (event: string, cb: () => void) => void;
  writableFinished: boolean;
  locals: Record<string, unknown>;
};

describe("createAbortSignalMiddleware", () => {
  it("should attach abort signal to context", async () => {
    const middleware = createAbortSignalMiddleware();
    const ctx: TestServerContext = { rawResponse: null };
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware.handler(ctx as ServerContext, next);

    expect(ctx.abortSignal).toBeInstanceOf(AbortSignal);
    expect(ctx.abortController).toBeInstanceOf(AbortController);
    expect(next).toHaveBeenCalled();
  });

  it("should abort on timeout", async () => {
    const middleware = createAbortSignalMiddleware({ timeout: 100 });
    const ctx: TestServerContext = { rawResponse: null };

    let signalAborted = false;
    const next = vi.fn().mockImplementation(async () => {
      // Simulate long operation
      await new Promise((resolve) => setTimeout(resolve, 200));
      signalAborted = ctx.abortSignal?.aborted ?? false;
    });

    await middleware.handler(ctx as ServerContext, next);

    expect(signalAborted).toBe(true);
  });
});

describe("createExpressAbortMiddleware", () => {
  it("should attach signal to res.locals", () => {
    const middleware = createExpressAbortMiddleware();

    let closeHandler: (() => void) | undefined;
    const res: MockExpressResponse = {
      on: (event: string, cb: () => void) => {
        if (event === "close") {
          closeHandler = cb;
        }
      },
      writableFinished: false,
      locals: {},
    };
    const next = vi.fn();

    middleware({}, res, next);

    expect(res.locals.abortSignal).toBeInstanceOf(AbortSignal);
    expect(next).toHaveBeenCalled();
  });

  it("should abort on client disconnect (close event)", () => {
    const onAbort = vi.fn();
    const middleware = createExpressAbortMiddleware({ onAbort });

    let closeHandler: (() => void) | undefined;
    const res: MockExpressResponse = {
      on: (event: string, cb: () => void) => {
        if (event === "close") {
          closeHandler = cb;
        }
      },
      writableFinished: false,
      locals: {},
    };
    const next = vi.fn();

    middleware({}, res, next);

    expect(res.locals.abortSignal).toBeInstanceOf(AbortSignal);
    expect(next).toHaveBeenCalled();

    // Simulate client disconnect
    closeHandler!();

    expect((res.locals.abortSignal as AbortSignal).aborted).toBe(true);
    expect(onAbort).toHaveBeenCalled();
  });
});

describe("onAbort callback", () => {
  it("should be called when abort happens", () => {
    const onAbort = vi.fn();
    const middleware = createExpressAbortMiddleware({ onAbort });

    let closeHandler: (() => void) | undefined;
    const res: MockExpressResponse = {
      on: (event: string, cb: () => void) => {
        if (event === "close") {
          closeHandler = cb;
        }
      },
      writableFinished: false,
      locals: {},
    };
    const next = vi.fn();

    middleware({}, res, next);

    // Simulate client disconnect
    closeHandler!();

    expect(onAbort).toHaveBeenCalled();
  });
});

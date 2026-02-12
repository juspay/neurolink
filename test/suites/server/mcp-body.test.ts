import { describe, it, expect, vi } from "vitest";
import {
  fastifyMCPBodyHook,
  createMCPBodyAttachmentMiddleware,
} from "../../../src/lib/server/middleware/mcpBodyAttachment.js";
import type { ServerContext } from "../../../src/lib/server/types.js";

/**
 * Mock Fastify request type for testing fastifyMCPBodyHook
 */
type MockFastifyRequest = {
  raw: { body?: unknown };
  body?: unknown;
};

/**
 * Mock rawRequest structure used by the middleware
 */
type MockRawRequest = {
  raw?: { body?: unknown };
  body?: unknown;
};

/**
 * Partial ServerContext for middleware testing
 */
type MockServerContext = Partial<ServerContext> & {
  rawRequest?: MockRawRequest;
};

describe("fastifyMCPBodyHook", () => {
  it("should attach body to raw request", async () => {
    const request: MockFastifyRequest = {
      raw: {},
      body: { jsonrpc: "2.0", method: "tools/list" },
    };

    await fastifyMCPBodyHook(request);

    expect(request.raw.body).toEqual({ jsonrpc: "2.0", method: "tools/list" });
  });

  it("should handle undefined body", async () => {
    const request: MockFastifyRequest = {
      raw: {},
      body: undefined,
    };

    await fastifyMCPBodyHook(request);

    expect(request.raw.body).toBeUndefined();
  });

  it("should handle null body", async () => {
    const request: MockFastifyRequest = {
      raw: {},
      body: null,
    };

    await fastifyMCPBodyHook(request);

    // null is a defined value, so it should be attached
    expect(request.raw.body).toBeNull();
  });

  it("should handle string body", async () => {
    const request: MockFastifyRequest = {
      raw: {},
      body: '{"jsonrpc":"2.0","method":"tools/list"}',
    };

    await fastifyMCPBodyHook(request);

    expect(request.raw.body).toBe('{"jsonrpc":"2.0","method":"tools/list"}');
  });

  it("should handle array body", async () => {
    const request: MockFastifyRequest = {
      raw: {},
      body: [
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { jsonrpc: "2.0", id: 2, method: "resources/list" },
      ],
    };

    await fastifyMCPBodyHook(request);

    expect(request.raw.body).toEqual([
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { jsonrpc: "2.0", id: 2, method: "resources/list" },
    ]);
  });

  it("should not overwrite existing raw.body if request.body is undefined", async () => {
    const request: MockFastifyRequest = {
      raw: { body: { existing: "data" } },
      body: undefined,
    };

    await fastifyMCPBodyHook(request);

    // Should keep existing body since request.body is undefined
    expect(request.raw.body).toEqual({ existing: "data" });
  });
});

describe("createMCPBodyAttachmentMiddleware", () => {
  /**
   * Helper to create a mock ServerContext with rawRequest
   */
  function createMockContext(
    rawRequest?: MockRawRequest,
  ): MockServerContext & { rawRequest?: MockRawRequest } {
    return {
      rawRequest,
    };
  }

  it("should create middleware with correct name and order", () => {
    const middleware = createMCPBodyAttachmentMiddleware();

    expect(middleware.name).toBe("mcp-body-attachment");
    expect(middleware.order).toBe(10);
  });

  it("should attach body via middleware interface", async () => {
    const middleware = createMCPBodyAttachmentMiddleware();
    const ctx = createMockContext({
      raw: {},
      body: { test: "data" },
    });
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware.handler(ctx as ServerContext, next);

    expect(ctx.rawRequest?.raw?.body).toEqual({ test: "data" });
    expect(next).toHaveBeenCalled();
  });

  it("should call next and return its result", async () => {
    const middleware = createMCPBodyAttachmentMiddleware();
    const ctx = createMockContext({
      raw: {},
      body: { test: "data" },
    });
    const expectedResult = { success: true };
    const next = vi.fn().mockResolvedValue(expectedResult);

    const result = await middleware.handler(ctx as ServerContext, next);

    expect(result).toEqual(expectedResult);
    expect(next).toHaveBeenCalledOnce();
  });

  it("should handle missing rawRequest gracefully", async () => {
    const middleware = createMCPBodyAttachmentMiddleware();
    const ctx = createMockContext(undefined);
    const next = vi.fn().mockResolvedValue(undefined);

    // Should not throw
    await middleware.handler(ctx as ServerContext, next);

    expect(next).toHaveBeenCalled();
  });

  it("should handle missing raw property gracefully", async () => {
    const middleware = createMCPBodyAttachmentMiddleware();
    const ctx = createMockContext({
      body: { test: "data" },
    });
    const next = vi.fn().mockResolvedValue(undefined);

    // Should not throw
    await middleware.handler(ctx as ServerContext, next);

    expect(next).toHaveBeenCalled();
  });

  it("should handle MCP JSON-RPC request body", async () => {
    const middleware = createMCPBodyAttachmentMiddleware();
    const mcpRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "read_file",
        arguments: { path: "/tmp/test.txt" },
      },
    };
    const ctx = createMockContext({
      raw: {},
      body: mcpRequest,
    });
    const next = vi.fn().mockResolvedValue(undefined);

    await middleware.handler(ctx as ServerContext, next);

    expect(ctx.rawRequest?.raw?.body).toEqual(mcpRequest);
    expect((ctx.rawRequest?.raw?.body as typeof mcpRequest).method).toBe(
      "tools/call",
    );
  });
});

describe("middleware order", () => {
  it("should have order 10 to run after body parsing", () => {
    const middleware = createMCPBodyAttachmentMiddleware();

    // Order 10 ensures it runs after body parsing middleware
    // but before route handlers
    expect(middleware.order).toBe(10);
  });
});

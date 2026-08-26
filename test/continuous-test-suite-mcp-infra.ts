#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — MCP Infrastructure
 *
 * 20 test functions covering MCP infrastructure classes that ship in dist
 * and don't require any AI provider:
 *
 *   Part 1 — Core (4): ToolRouter, ToolCache, RequestBatcher, Core MCP Exports
 *   Part 1b — Extended Modules (11): CircuitBreakerBlocking, ToolAnnotations,
 *     ElicitationManager, EnhancedToolDiscovery, MultiServerManager,
 *     MCPServerBase, AgentExposureManager, ServerCapabilitiesManager,
 *     MCPRegistryClient, ToolConverter, ToolIntegrationManager
 *   Part 1c — SDK Wiring (5): WiredToolCache, WiredAnnotations,
 *     WiredMiddleware, WiredPublicAPIs, WiredDispose
 *
 * No live AI; pure dist artifact tests. Part 1c instantiates `new NeuroLink()`
 * but never calls generate()/stream(), so still no API key required.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-mcp-infra.ts
 *      pnpm run test:mcp:infra
 *
 * Originally lived as Parts 1, 1b, 1c inside continuous-test-suite-mcp.ts.
 * Split out in May 2026.
 */

import {
  // Part 1 — Core MCP infrastructure
  ToolRouter,
  ToolCache,
  RequestBatcher,
  MCPToolRegistry,
  MCPClientFactory,
  ExternalServerManager,
  withHTTPRetry,
  HTTPRateLimiter,
  MCPCircuitBreaker,
  // Part 1b — Extended modules
  CircuitBreakerOpenError,
  inferAnnotations,
  createAnnotatedTool,
  validateAnnotations,
  filterToolsByAnnotations,
  getToolSafetyLevel,
  ElicitationManager,
  EnhancedToolDiscovery,
  MultiServerManager,
  MCPServerBase,
  AgentExposureManager,
  exposeAgentAsTool,
  ServerCapabilitiesManager,
  createTextResource,
  createJsonResource,
  createPrompt,
  MCPRegistryClient,
  getWellKnownServer,
  getAllWellKnownServers,
  neuroLinkToolToMCP,
  mcpToolToNeuroLink,
  sanitizeToolName,
  validateToolName,
  ToolIntegrationManager,
  // Part 1c — SDK wiring
  NeuroLink,
} from "../dist/index.js";
import { defineSuite, logSection } from "./helpers/harness.js";

import { assertDistFresh } from "./helpers/distFreshness.js";
import type { McpCacheConfig } from "../src/lib/types/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { recordTest, runSuite } = defineSuite("MCP Infrastructure", {
  offline: true,
});

/**
 * Dispose a NeuroLink instance from a `finally` block without masking the
 * surrounding test failure. The original wired-integration blocks only
 * called dispose() on the success path, so an assertion mismatch leaked
 * the SDK (and any registered tool subprocess) into the next block.
 */
async function disposeQuietly(
  sdk: InstanceType<typeof NeuroLink> | null,
): Promise<void> {
  if (!sdk) {
    return;
  }
  try {
    await sdk.dispose();
  } catch {
    // Swallow dispose errors so the real test failure (recorded already
    // in the surrounding catch) remains the salient diagnostic.
  }
}

// ============================================================
// Part 1 — Core MCP infrastructure
// ============================================================

async function testToolRouter(): Promise<void> {
  logSection("ToolRouter Tests");

  try {
    recordTest("ToolRouter class exported", ToolRouter !== undefined);

    const router = new ToolRouter({ strategy: "round-robin" });
    recordTest("ToolRouter instantiation", router !== undefined);

    router.registerServer("filesystem-server", ["filesystem"]);
    router.registerServer("github-server", ["github"]);
    recordTest("ToolRouter.registerServer()", true);

    const decision = router.route({
      name: "filesystem_read",
      description: "Read a file",
      category: "filesystem",
    });
    recordTest(
      "ToolRouter.route()",
      decision !== undefined && typeof decision.serverId === "string",
    );

    if (typeof router.destroy === "function") {
      router.destroy();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("ToolRouter tests", false, false, msg);
  }
}

async function testToolCache(): Promise<void> {
  logSection("ToolCache Tests");

  try {
    recordTest("ToolCache class exported", ToolCache !== undefined);

    const cacheConfig: McpCacheConfig = {
      ttl: 60000,
      maxSize: 100,
      strategy: "lru",
    };
    const cache = new ToolCache(cacheConfig);
    recordTest("ToolCache instantiation", cache !== undefined);

    const key = "test-tool-result";
    const value = { result: "test-data", timestamp: Date.now() };
    cache.set(key, value);
    const retrieved = cache.get(key);
    recordTest(
      "ToolCache.set() and get()",
      JSON.stringify(retrieved) === JSON.stringify(value),
    );

    cache.invalidate("test-tool-result");
    recordTest("ToolCache.invalidate()", cache.get(key) === undefined);

    // ToolCache.isExpired() is a private implementation method; there is no
    // public surface for this check, so the cast intentionally goes through
    // `unknown` to read it without altering the assertion's runtime meaning.
    recordTest(
      "ToolCache.isExpired()",
      typeof (cache as unknown as { isExpired?: unknown }).isExpired ===
        "function",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("ToolCache tests", false, false, msg);
  }
}

async function testRequestBatcher(): Promise<void> {
  logSection("RequestBatcher Tests");

  try {
    recordTest("RequestBatcher class exported", RequestBatcher !== undefined);

    const batcher = new RequestBatcher({
      maxBatchSize: 10,
      maxWaitMs: 100,
    });
    recordTest("RequestBatcher instantiation", batcher !== undefined);

    batcher.setExecutor(
      async (requests: Array<{ tool: string; args: unknown }>) =>
        requests.map((r) => ({ success: true, result: r })),
    );
    recordTest("RequestBatcher.setExecutor()", true);

    const p1 = batcher.add("test-tool", { foo: "bar" });
    const p2 = batcher.add("test-tool", { baz: "qux" });
    recordTest("RequestBatcher.add()", true);

    await batcher.flush();
    const settled = await Promise.allSettled([p1, p2]);
    // Previously the `allSettled` result was discarded; the test recorded
    // PASS even when both queued requests rejected. Inspect the array and
    // FAIL if either entry didn't fulfill — that's exactly the executor /
    // flush regression this smoke is supposed to catch.
    const rejected = settled.filter((s) => s.status === "rejected");
    recordTest(
      "RequestBatcher.flush() fulfills all queued requests",
      rejected.length === 0,
      false,
      rejected.length === 0
        ? `Both queued requests fulfilled (${settled.length}/${settled.length})`
        : `${rejected.length}/${settled.length} queued requests rejected: ${rejected
            .map((r) =>
              r.status === "rejected"
                ? (r.reason instanceof Error
                    ? r.reason.message
                    : String(r.reason)
                  ).slice(0, 120)
                : "",
            )
            .join("; ")}`,
    );

    recordTest(
      "RequestBatcher.queueSize",
      typeof batcher.queueSize === "number",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("RequestBatcher tests", false, false, msg);
  }
}

async function testCoreMCPExports(): Promise<void> {
  logSection("Core MCP Exports Tests");

  try {
    // MCPToolRegistry
    recordTest("MCPToolRegistry class exported", MCPToolRegistry !== undefined);
    const registry =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (MCPToolRegistry as any).getInstance?.() || new MCPToolRegistry();
    recordTest("MCPToolRegistry instantiation", registry !== undefined);

    // MCPClientFactory
    recordTest(
      "MCPClientFactory class exported",
      MCPClientFactory !== undefined,
    );
    recordTest(
      "MCPClientFactory.createClient() static method",
      typeof MCPClientFactory.createClient === "function",
    );
    recordTest(
      "MCPClientFactory.getSupportedTransports() static method",
      typeof MCPClientFactory.getSupportedTransports === "function",
    );

    // ExternalServerManager
    recordTest(
      "ExternalServerManager class exported",
      ExternalServerManager !== undefined,
    );

    // HTTP utilities
    recordTest("withHTTPRetry exported", typeof withHTTPRetry === "function");
    recordTest("HTTPRateLimiter exported", HTTPRateLimiter !== undefined);
    recordTest("MCPCircuitBreaker exported", MCPCircuitBreaker !== undefined);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("Core MCP exports", false, false, msg);
  }
}

// ============================================================
// Part 1b — Extended MCP modules
// ============================================================

async function testCircuitBreakerBlocking(): Promise<void> {
  logSection("Circuit Breaker Blocking Tests");

  try {
    // 1. CircuitBreakerOpenError is exported and constructable
    const err = new CircuitBreakerOpenError({
      breakerName: "test-breaker",
      retryAfter: new Date(Date.now() + 30000),
      retryAfterMs: 30000,
      breakerState: "open",
      failureCount: 5,
    });
    recordTest(
      "CircuitBreakerOpenError is constructable",
      err instanceof CircuitBreakerOpenError && err instanceof Error,
    );
    recordTest(
      "CircuitBreakerOpenError.name is 'CircuitBreakerOpenError'",
      err.name === "CircuitBreakerOpenError",
    );
    recordTest(
      "CircuitBreakerOpenError.breakerName is set",
      err.breakerName === "test-breaker",
    );
    recordTest(
      "CircuitBreakerOpenError.breakerState is 'open'",
      err.breakerState === "open",
    );
    recordTest(
      "CircuitBreakerOpenError.retryAfterMs is set",
      err.retryAfterMs === 30000,
    );
    recordTest(
      "CircuitBreakerOpenError.failureCount is set",
      err.failureCount === 5,
    );
    recordTest(
      "CircuitBreakerOpenError.retryAfter is ISO string",
      typeof err.retryAfter === "string" && err.retryAfter.endsWith("Z"),
    );
    recordTest(
      "CircuitBreakerOpenError.message contains breaker name",
      err.message.includes("test-breaker"),
    );
    recordTest(
      "CircuitBreakerOpenError.message contains failure count",
      err.message.includes("5"),
    );

    // 2. Open circuit breaker throws CircuitBreakerOpenError
    const breaker = new MCPCircuitBreaker("blocking-test", {
      failureThreshold: 3,
      resetTimeout: 60000,
    });
    breaker.forceOpen("test — force open");

    let caughtError: unknown;
    try {
      await breaker.execute(async () => "should not reach");
    } catch (e) {
      caughtError = e;
    }

    recordTest(
      "Open circuit breaker throws CircuitBreakerOpenError",
      caughtError instanceof CircuitBreakerOpenError,
    );

    if (caughtError instanceof CircuitBreakerOpenError) {
      recordTest(
        "Thrown error breakerName matches circuit breaker name",
        caughtError.breakerName === "blocking-test",
      );
      recordTest(
        "Thrown error breakerState is 'open'",
        caughtError.breakerState === "open",
      );
      recordTest(
        "Thrown error retryAfterMs is positive",
        caughtError.retryAfterMs > 0,
      );
      recordTest(
        "Thrown error retryAfter is a valid ISO date in the future",
        typeof caughtError.retryAfter === "string" &&
          new Date(caughtError.retryAfter) > new Date(),
      );
      recordTest(
        "Thrown error message says 'failures' (not 'consecutive failures')",
        caughtError.message.includes("failures") &&
          !caughtError.message.includes("consecutive"),
      );
    }

    // 3. After reset, circuit breaker executes normally
    breaker.reset();
    let resetResult: string | undefined;
    try {
      resetResult = await breaker.execute(async () => "success-after-reset");
    } catch {
      // intentionally empty
    }
    recordTest(
      "After reset, circuit breaker executes successfully",
      resetResult === "success-after-reset",
    );

    // The "exceeded half-open call limit" branch in mcpCircuitBreaker.ts
    // (the early-throw at the top of execute() when state===half-open
    // and halfOpenCalls>=halfOpenMaxCalls) is unreachable from user code
    // by design: changeState() resets halfOpenCalls to 0 whenever the
    // breaker enters half-open, and a successful half-open call closes
    // the circuit before the counter can reach the limit; failure
    // immediately re-opens. This branch exists as defense-in-depth in
    // case the state machine is ever refactored. Don't record an
    // assertion against a structurally-dead branch — that creates a
    // permanent SKIP that adds no signal.

    breaker.destroy();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("Circuit breaker blocking tests", false, false, msg);
  }
}

async function testToolAnnotations(): Promise<void> {
  logSection("Tool Annotations Tests");

  try {
    // 1. inferAnnotations on tool with "delete" in name returns destructive=true
    const deleteAnnotations = inferAnnotations({
      name: "delete_record",
      description: "Delete a record from the database",
    });
    recordTest(
      "inferAnnotations: 'delete' tool returns destructive=true",
      deleteAnnotations.destructiveHint === true,
    );

    // 2. createAnnotatedTool merges annotations
    const annotatedTool = createAnnotatedTool({
      name: "read_file",
      description: "Read a file from disk",
      execute: async () => ({ success: true }),
      annotations: { tags: ["custom-tag"] },
    });
    recordTest(
      "createAnnotatedTool merges inferred + provided annotations",
      annotatedTool.annotations !== undefined &&
        annotatedTool.annotations.readOnlyHint === true &&
        Array.isArray(annotatedTool.annotations.tags) &&
        annotatedTool.annotations.tags.includes("custom-tag"),
    );

    // 3. validateAnnotations returns valid for proper annotations
    const validErrors = validateAnnotations({
      readOnlyHint: true,
      idempotentHint: true,
    });
    recordTest(
      "validateAnnotations returns valid for proper annotations",
      Array.isArray(validErrors) && validErrors.length === 0,
    );

    // 4. filterToolsByAnnotations filters correctly
    const tools = [
      createAnnotatedTool({
        name: "get_data",
        description: "Get data",
        execute: async () => ({}),
        annotations: { readOnlyHint: true },
      }),
      createAnnotatedTool({
        name: "delete_data",
        description: "Delete data",
        execute: async () => ({}),
        annotations: { destructiveHint: true },
      }),
    ];
    const readOnlyTools = filterToolsByAnnotations(
      tools,
      (a) => a.readOnlyHint === true,
    );
    recordTest(
      "filterToolsByAnnotations filters correctly",
      readOnlyTools.length === 1 && readOnlyTools[0].name === "get_data",
    );

    // 5. getToolSafetyLevel returns appropriate level
    const safeTool = {
      name: "list_files",
      description: "List files",
      annotations: { readOnlyHint: true },
      execute: async () => ({}),
    };
    const dangerousTool = {
      name: "drop_table",
      description: "Drop table",
      annotations: { destructiveHint: true },
      execute: async () => ({}),
    };
    recordTest(
      "getToolSafetyLevel returns appropriate level",
      getToolSafetyLevel(safeTool) === "safe" &&
        getToolSafetyLevel(dangerousTool) === "dangerous",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("Tool Annotations tests", false, false, msg);
  }
}

async function testElicitationManager(): Promise<void> {
  logSection("ElicitationManager Tests");

  try {
    // 1. Class exported and instantiable
    const manager = new ElicitationManager();
    recordTest(
      "ElicitationManager class exported and instantiable",
      manager !== undefined && manager !== null,
    );

    // 2. setHandler registers handler and handler is invoked
    let handlerCalled = false;
    manager.setHandler(async (_request) => {
      handlerCalled = true;
      return {
        requestId: "test",
        responded: true,
        value: true,
        timestamp: Date.now(),
      };
    });
    // Verify handler is invoked via confirm()
    try {
      await manager.confirm("test confirm");
    } catch {
      // Confirm may fail due to timeout/missing response — handler invocation is what matters
    }
    recordTest(
      "ElicitationManager.setHandler() registers and invokes handler",
      handlerCalled,
    );

    // 3. confirm/getText/getSecret methods exist
    recordTest(
      "ElicitationManager has confirm/getText/getSecret methods",
      typeof manager.confirm === "function" &&
        typeof manager.getText === "function" &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (manager as any).getSecret === "function",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("ElicitationManager tests", false, false, msg);
  }
}

async function testEnhancedToolDiscovery(): Promise<void> {
  logSection("EnhancedToolDiscovery Tests");

  try {
    // 1. Class exported and instantiable
    const discovery = new EnhancedToolDiscovery();
    recordTest(
      "EnhancedToolDiscovery class exported and instantiable",
      discovery !== undefined && discovery !== null,
    );

    // 2. searchTools method exists
    recordTest(
      "EnhancedToolDiscovery.searchTools method exists",
      typeof discovery.searchTools === "function",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("EnhancedToolDiscovery tests", false, false, msg);
  }
}

async function testMultiServerManager(): Promise<void> {
  logSection("MultiServerManager Tests");

  try {
    // 1. Class exported and instantiable
    const manager = new MultiServerManager();
    recordTest(
      "MultiServerManager class exported and instantiable",
      manager !== undefined && manager !== null,
    );

    // 2. addServer method
    manager.addServer({
      id: "test-server-1",
      name: "Test Server 1",
      status: "connected",
      tools: [{ name: "test_tool", description: "A test tool" }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    recordTest("MultiServerManager.addServer() works", true);

    // 3. getUnifiedTools returns array
    const tools = manager.getUnifiedTools();
    recordTest(
      "MultiServerManager.getUnifiedTools() returns array",
      Array.isArray(tools) &&
        tools.length === 1 &&
        tools[0].name === "test_tool",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("MultiServerManager tests", false, false, msg);
  }
}

async function testMCPServerBase(): Promise<void> {
  logSection("MCPServerBase Tests");

  try {
    // 1. Class exported
    recordTest("MCPServerBase class exported", MCPServerBase !== undefined);

    // 2. Can extend and instantiate
    class TestServer extends MCPServerBase {
      constructor() {
        super({
          id: "test-server",
          name: "Test Server",
          description: "A test MCP server",
        });
      }
    }
    const server = new TestServer();
    recordTest(
      "MCPServerBase can be extended and instantiated",
      server !== undefined && server !== null,
    );

    // 3. registerTool and lifecycle methods exist
    recordTest(
      "MCPServerBase has registerTool, init, start, stop methods",
      typeof server.registerTool === "function" &&
        typeof server.init === "function" &&
        typeof server.start === "function" &&
        typeof server.stop === "function",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("MCPServerBase tests", false, false, msg);
  }
}

async function testAgentExposureManager(): Promise<void> {
  logSection("AgentExposureManager Tests");

  try {
    // 1. Class exported and instantiable
    const manager = new AgentExposureManager();
    recordTest(
      "AgentExposureManager class exported and instantiable",
      manager !== undefined && manager !== null,
    );

    // 2. exposeAgentAsTool function exported
    const result = exposeAgentAsTool({
      id: "test-agent",
      name: "Test Agent",
      description: "A test agent",
      execute: async (input) => ({ result: input }),
    });
    recordTest(
      "exposeAgentAsTool function works",
      result !== undefined &&
        result.tool !== undefined &&
        result.sourceType === "agent" &&
        result.toolName.includes("test_agent"),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("AgentExposureManager tests", false, false, msg);
  }
}

async function testServerCapabilitiesManager(): Promise<void> {
  logSection("ServerCapabilitiesManager Tests");

  try {
    // 1. Class exported and instantiable
    const capabilities = new ServerCapabilitiesManager({
      resources: true,
      prompts: true,
    });
    recordTest(
      "ServerCapabilitiesManager class exported and instantiable",
      capabilities !== undefined && capabilities !== null,
    );

    // 2. createTextResource factory function works
    const textResource = createTextResource(
      "file:///test.txt",
      "Test Resource",
      "Hello, world!",
      {
        description: "A test text resource",
      },
    );
    recordTest(
      "createTextResource factory function works",
      textResource !== undefined &&
        textResource.uri === "file:///test.txt" &&
        textResource.name === "Test Resource" &&
        typeof textResource.reader === "function",
    );

    // 3. createJsonResource and createPrompt factory functions work
    const jsonResource = createJsonResource("file:///config.json", "Config", {
      key: "value",
    });
    const prompt = createPrompt("summarize", "Summarize: {text}", {
      description: "Summarize text",
      arguments: [{ name: "text", required: true }],
    });
    recordTest(
      "createJsonResource and createPrompt factory functions work",
      jsonResource !== undefined &&
        jsonResource.mimeType === "application/json" &&
        prompt !== undefined &&
        prompt.name === "summarize" &&
        typeof prompt.generator === "function",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("ServerCapabilitiesManager tests", false, false, msg);
  }
}

async function testMCPRegistryClient(): Promise<void> {
  logSection("MCPRegistryClient Tests");

  try {
    // 1. Class exported and instantiable
    const client = new MCPRegistryClient();
    recordTest(
      "MCPRegistryClient class exported and instantiable",
      client !== undefined && client !== null,
    );

    // 2. search returns results
    const searchResult = await client.search({});
    recordTest(
      "MCPRegistryClient.search() returns results",
      searchResult !== undefined &&
        Array.isArray(searchResult.entries) &&
        typeof searchResult.totalCount === "number",
    );

    // 3. getWellKnownServer and getAllWellKnownServers work
    const fsServer = getWellKnownServer("filesystem");
    const allServers = getAllWellKnownServers();
    recordTest(
      "getWellKnownServer/getAllWellKnownServers work",
      fsServer !== undefined &&
        fsServer.name === "Filesystem" &&
        Array.isArray(allServers) &&
        allServers.length > 0,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("MCPRegistryClient tests", false, false, msg);
  }
}

async function testToolConverter(): Promise<void> {
  logSection("ToolConverter Tests");

  try {
    // 1. neuroLinkToolToMCP converts correctly
    const nlTool = {
      name: "my_tool",
      description: "A NeuroLink tool",
      parameters: { type: "object", properties: { input: { type: "string" } } },
      execute: async (params: unknown) => ({ result: params }),
    };
    const mcpTool = neuroLinkToolToMCP(nlTool);
    recordTest(
      "neuroLinkToolToMCP converts correctly",
      mcpTool.name === "my_tool" &&
        mcpTool.description === "A NeuroLink tool" &&
        typeof mcpTool.execute === "function",
    );

    // 2. mcpToolToNeuroLink converts correctly
    const backToNl = mcpToolToNeuroLink(mcpTool);
    recordTest(
      "mcpToolToNeuroLink converts correctly",
      backToNl.name === "my_tool" &&
        backToNl.description === "A NeuroLink tool" &&
        typeof backToNl.execute === "function",
    );

    // 3. sanitizeToolName cleans names
    const cleaned = sanitizeToolName("invalid tool name!@#$");
    recordTest(
      "sanitizeToolName cleans invalid characters",
      /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(cleaned),
      false,
      `"invalid tool name!@#$" -> "${cleaned}"`,
    );

    // 4. validateToolName validates
    const validResult = validateToolName("valid_tool_name");
    const invalidResult = validateToolName("123-invalid");
    recordTest(
      "validateToolName validates correctly",
      validResult.valid === true &&
        validResult.errors.length === 0 &&
        invalidResult.valid === false &&
        invalidResult.errors.length > 0,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("ToolConverter tests", false, false, msg);
  }
}

async function testToolIntegrationManager(): Promise<void> {
  logSection("ToolIntegrationManager Tests");

  try {
    // 1. Class exported and instantiable
    const manager = new ToolIntegrationManager();
    recordTest(
      "ToolIntegrationManager class exported and instantiable",
      manager !== undefined && manager !== null,
    );

    // 2. use() method for middleware chain works
    const returned = manager.use(
      async (
        _tool: unknown,
        _params: unknown,
        _context: unknown,
        next: () => Promise<unknown>,
      ) => next(),
    );
    recordTest(
      "ToolIntegrationManager.use() adds middleware and returns this",
      returned === manager,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("ToolIntegrationManager tests", false, false, msg);
  }
}

// ============================================================
// Part 1c — MCP Wiring Integration (no API calls)
// ============================================================

async function testWiredToolCache(): Promise<void> {
  logSection("Wired ToolCache Integration");

  // Test 1: Cache hit on second call with same args
  let sdk1: InstanceType<typeof NeuroLink> | null = null;
  try {
    let callCount = 0;
    sdk1 = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000, maxSize: 100 } },
    });
    sdk1.registerTool("get_status", {
      name: "get_status",
      description: "Get current status",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return { result: `call-${callCount}` };
      },
    });

    const result1 = await sdk1.executeTool("get_status", { key: "value" });
    const result2 = await sdk1.executeTool("get_status", { key: "value" });

    const cacheHit = callCount === 1;
    recordTest(
      "Cache HIT on second call with same args",
      cacheHit,
      false,
      cacheHit ? undefined : `Expected 1 call, got ${callCount}`,
    );
  } catch (error) {
    recordTest(
      "Cache HIT on second call with same args",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk1);
  }

  // Test 2: Cache MISS for different args
  let sdk2: InstanceType<typeof NeuroLink> | null = null;
  try {
    let callCount = 0;
    sdk2 = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000 } },
    });
    sdk2.registerTool("get_item", {
      name: "get_item",
      description: "Get an item",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return { id: callCount };
      },
    });

    await sdk2.executeTool("get_item", { id: 1 });
    await sdk2.executeTool("get_item", { id: 2 });

    const cacheMiss = callCount === 2;
    recordTest(
      "Cache MISS for different args",
      cacheMiss,
      false,
      cacheMiss ? undefined : `Expected 2 calls, got ${callCount}`,
    );
  } catch (error) {
    recordTest(
      "Cache MISS for different args",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk2);
  }

  // Test 3: Cache skipped for destructive tools
  let sdk3: InstanceType<typeof NeuroLink> | null = null;
  try {
    let callCount = 0;
    sdk3 = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000 } },
    });
    sdk3.registerTool("delete_record", {
      name: "delete_record",
      description: "Delete a record",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return { deleted: true };
      },
    });

    await sdk3.executeTool("delete_record", { id: 1 });
    await sdk3.executeTool("delete_record", { id: 1 });

    const skipped = callCount === 2;
    recordTest(
      "Cache SKIPPED for destructive tool (delete_record)",
      skipped,
      false,
      skipped ? undefined : `Expected 2 calls, got ${callCount}`,
    );
  } catch (error) {
    recordTest(
      "Cache SKIPPED for destructive tool (delete_record)",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk3);
  }

  // Test 4: Cache bypassed with disableToolCache per-request
  let sdk4: InstanceType<typeof NeuroLink> | null = null;
  try {
    let callCount = 0;
    sdk4 = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000 } },
    });
    sdk4.registerTool("get_data", {
      name: "get_data",
      description: "Get data",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return { fresh: callCount };
      },
    });

    await sdk4.executeTool("get_data", { q: "a" });
    await sdk4.executeTool("get_data", { q: "a" }, { disableToolCache: true });

    const bypassed = callCount === 2;
    recordTest(
      "Cache BYPASSED with disableToolCache per-request",
      bypassed,
      false,
      bypassed ? undefined : `Expected 2 calls, got ${callCount}`,
    );
  } catch (error) {
    recordTest(
      "Cache BYPASSED with disableToolCache per-request",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk4);
  }
}

async function testWiredAnnotations(): Promise<void> {
  logSection("Wired Annotation Auto-Inference");

  // Test 1: Auto-infer destructiveHint on getAllAvailableTools
  let sdk1: InstanceType<typeof NeuroLink> | null = null;
  try {
    sdk1 = new NeuroLink({
      mcp: { annotations: { enabled: true, autoInfer: true } },
    });
    sdk1.registerTool("delete_user", {
      name: "delete_user",
      description: "Delete a user permanently",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({}),
    });

    const allTools = await sdk1.getAllAvailableTools();
    const deleteTool = allTools.find((t) => t.name === "delete_user");

    const hasAnnotations = !!deleteTool?.annotations;
    const isDestructive = !!deleteTool?.annotations?.destructiveHint;

    recordTest(
      "Auto-infer destructiveHint for delete_user",
      hasAnnotations && isDestructive,
      false,
      hasAnnotations ? undefined : "annotations not set on tool",
    );
  } catch (error) {
    recordTest(
      "Auto-infer destructiveHint for delete_user",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk1);
  }

  // Test 2: Auto-infer readOnlyHint for list tools
  let sdk2: InstanceType<typeof NeuroLink> | null = null;
  try {
    sdk2 = new NeuroLink({
      mcp: { annotations: { autoInfer: true } },
    });
    sdk2.registerTool("list_users", {
      name: "list_users",
      description: "List all users",
      inputSchema: { type: "object", properties: {} },
      execute: async () => [],
    });

    const allTools = await sdk2.getAllAvailableTools();
    const listTool = allTools.find((t) => t.name === "list_users");

    const isReadOnly = !!listTool?.annotations?.readOnlyHint;
    recordTest("Auto-infer readOnlyHint for list_users", isReadOnly);
  } catch (error) {
    recordTest(
      "Auto-infer readOnlyHint for list_users",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk2);
  }
}

async function testWiredMiddleware(): Promise<void> {
  logSection("Wired Middleware Integration");

  // Test 1: Middleware executes on tool call
  let sdk1: InstanceType<typeof NeuroLink> | null = null;
  try {
    sdk1 = new NeuroLink();
    const middlewareCalls: string[] = [];

    // biome-ignore lint/correctness/useHookAtTopLevel: SDK middleware API, not a React hook.
    sdk1.useToolMiddleware(async (_tool, _params, _context, next) => {
      middlewareCalls.push("before");
      const result = await next();
      middlewareCalls.push("after");
      return result;
    });

    sdk1.registerTool("mw_test", {
      name: "mw_test",
      description: "Middleware test tool",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({ ok: true }),
    });

    await sdk1.executeTool("mw_test", {});

    const works =
      middlewareCalls[0] === "before" && middlewareCalls[1] === "after";
    recordTest(
      "Middleware executes before/after tool call",
      works,
      false,
      works ? undefined : `Got: ${JSON.stringify(middlewareCalls)}`,
    );
  } catch (error) {
    recordTest(
      "Middleware executes before/after tool call",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk1);
  }

  // Test 2: Multiple middlewares chain in order
  let sdk2: InstanceType<typeof NeuroLink> | null = null;
  try {
    sdk2 = new NeuroLink();
    const order: number[] = [];

    // biome-ignore lint/correctness/useHookAtTopLevel: SDK middleware API, not a React hook.
    sdk2.useToolMiddleware(async (_t, _p, _c, next) => {
      order.push(1);
      const r = await next();
      order.push(4);
      return r;
    });
    // biome-ignore lint/correctness/useHookAtTopLevel: SDK middleware API, not a React hook.
    sdk2.useToolMiddleware(async (_t, _p, _c, next) => {
      order.push(2);
      const r = await next();
      order.push(3);
      return r;
    });

    sdk2.registerTool("chain_test", {
      name: "chain_test",
      description: "Chain test",
      inputSchema: { type: "object", properties: {} },
      execute: async () => "done",
    });

    await sdk2.executeTool("chain_test", {});

    const correct = JSON.stringify(order) === JSON.stringify([1, 2, 3, 4]);
    recordTest(
      "Multiple middlewares chain in correct order",
      correct,
      false,
      correct ? undefined : `Expected [1,2,3,4], got ${JSON.stringify(order)}`,
    );
  } catch (error) {
    recordTest(
      "Multiple middlewares chain in correct order",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk2);
  }

  // Test 3: useToolMiddleware returns this for chaining
  let sdk3: InstanceType<typeof NeuroLink> | null = null;
  try {
    sdk3 = new NeuroLink();
    // biome-ignore lint/correctness/useHookAtTopLevel: SDK middleware API, not a React hook.
    const result = sdk3.useToolMiddleware(async (_t, _p, _c, next) => next());
    const isChainable = result === sdk3;
    recordTest("useToolMiddleware returns this (chainable)", isChainable);
  } catch (error) {
    recordTest(
      "useToolMiddleware returns this (chainable)",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk3);
  }
}

async function testWiredPublicAPIs(): Promise<void> {
  logSection("Wired Public APIs");

  // Test 1: getMCPEnhancementsConfig returns config when provided
  let sdk1: InstanceType<typeof NeuroLink> | null = null;
  try {
    const config = { cache: { enabled: true, ttl: 30000 } };
    sdk1 = new NeuroLink({ mcp: config });
    const returned = sdk1.getMCPEnhancementsConfig();
    const matches = JSON.stringify(returned) === JSON.stringify(config);
    recordTest("getMCPEnhancementsConfig returns config", matches);
  } catch (error) {
    recordTest(
      "getMCPEnhancementsConfig returns config",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk1);
  }

  // Test 2: getMCPEnhancementsConfig returns undefined when no config
  let sdk2: InstanceType<typeof NeuroLink> | null = null;
  try {
    sdk2 = new NeuroLink();
    const config = sdk2.getMCPEnhancementsConfig();
    recordTest(
      "getMCPEnhancementsConfig undefined when no config",
      config === undefined,
    );
  } catch (error) {
    recordTest(
      "getMCPEnhancementsConfig undefined when no config",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk2);
  }

  // Test 3: getToolMiddlewares returns empty array by default
  let sdk3: InstanceType<typeof NeuroLink> | null = null;
  try {
    sdk3 = new NeuroLink();
    const mws = sdk3.getToolMiddlewares();
    recordTest(
      "getToolMiddlewares returns empty array by default",
      Array.isArray(mws) && mws.length === 0,
    );
  } catch (error) {
    recordTest(
      "getToolMiddlewares returns empty array by default",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk3);
  }

  // Test 4: flushToolBatch does not throw when no batcher
  let sdk4: InstanceType<typeof NeuroLink> | null = null;
  try {
    sdk4 = new NeuroLink();
    await sdk4.flushToolBatch();
    recordTest("flushToolBatch does not throw without batcher", true);
  } catch (error) {
    recordTest(
      "flushToolBatch does not throw without batcher",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await disposeQuietly(sdk4);
  }
}

async function testWiredDispose(): Promise<void> {
  logSection("Wired Dispose Cleanup");

  // Test: Dispose with all MCP enhancements enabled
  let sdk: InstanceType<typeof NeuroLink> | null = null;
  try {
    sdk = new NeuroLink({
      mcp: {
        cache: { enabled: true },
        batcher: { enabled: true },
        annotations: { enabled: true },
      },
    });
    sdk.registerTool("disposable", {
      name: "disposable",
      description: "Disposable tool",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({}),
    });

    // The assertion IS that dispose() resolves; null out the local so the
    // finally cleanup is a no-op (disposeQuietly tolerates null).
    await sdk.dispose();
    sdk = null;
    recordTest("Dispose with all MCP enhancements enabled", true);
  } catch (error) {
    recordTest(
      "Dispose with all MCP enhancements enabled",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    // Defensive second dispose for the failure path — if the assertion
    // threw before `sdk.dispose()` ran, the wired SDK would otherwise
    // leak its cache/batcher/annotation manager into subsequent tests.
    await disposeQuietly(sdk);
  }
}

await runSuite(async () => {
  // Part 1 — Core MCP infrastructure
  await testToolRouter();
  await testToolCache();
  await testRequestBatcher();
  await testCoreMCPExports();

  // Part 1b — Extended MCP modules
  await testCircuitBreakerBlocking();
  await testToolAnnotations();
  await testElicitationManager();
  await testEnhancedToolDiscovery();
  await testMultiServerManager();
  await testMCPServerBase();
  await testAgentExposureManager();
  await testServerCapabilitiesManager();
  await testMCPRegistryClient();
  await testToolConverter();
  await testToolIntegrationManager();

  // Part 1c — MCP Wiring Integration
  await testWiredToolCache();
  await testWiredAnnotations();
  await testWiredMiddleware();
  await testWiredPublicAPIs();
  await testWiredDispose();
});

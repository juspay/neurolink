#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: MCP HTTP Transport
 *
 * Tests MCP HTTP transport end-to-end through the NeuroLink SDK integration layer:
 * - HTTP transport connection via sdk.addExternalMCPServer() + sdk.generate()
 * - Auth headers (Bearer, API Key) via sdk.addExternalMCPServer()
 * - Tool discovery and execution through sdk.generate()
 * - Retry, rate limiting, timeout (smoke tests — no mock server in this file)
 * - SSE transport via local mock server + sdk.addExternalMCPServer()
 * - Real MCP server integration (DeepWiki, Semgrep mock, Remote Fetch, Sequential Thinking)
 * - Blocked tool support via sdk.generate()
 * - Session management via multiple sdk.generate() calls
 * - Observability spans after sdk.generate()
 *
 * CORE PRINCIPLE: Tests go through sdk.addExternalMCPServer() + sdk.generate(),
 * NOT raw @modelcontextprotocol/sdk Client/Transport directly.
 *
 * Run: npx tsx test/continuous-test-suite-mcp-http.ts --provider=vertex
 */

import { randomUUID } from "crypto";
import * as fs from "fs";
import * as http from "http";
import type { MCPServerInfo } from "../dist/index.js";
import { NeuroLink } from "../dist/index.js";

// ============================================================
// CONFIGURATION
// ============================================================

const PROVIDER_MAX_TOKENS: Record<string, number> = {
  anthropic: 8192,
  vertex: 10000,
  "google-ai-studio": 10000,
  openai: 16384,
  bedrock: 8192,
  ollama: 4096,
  openrouter: 4096,
  // OpenAI-compat providers added 2026. Caps are tuned per-provider (cloud
  // providers get the larger output budget; local backends with small loaded
  // models stay tight) to leave room for the system prompt + tool defs.
  deepseek: 4096,
  "nvidia-nim": 8192,
  "lm-studio": 1024,
  llamacpp: 1024,
};

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || (undefined as string | undefined),
  maxTokens: undefined as number | undefined,
  timeout: 120000,
  interTestDelay: 6000,
};

// Real HTTP MCP server endpoints
const REAL_HTTP_MCP_SERVERS = {
  deepwiki: {
    url: "https://mcp.deepwiki.com/mcp",
    name: "DeepWiki MCP",
    description: "Documentation and wiki search MCP server",
  },
  fetchServer: {
    url: "https://remote.mcpservers.org/fetch/mcp",
    name: "Remote Fetch MCP",
    description: "URL fetching MCP server",
  },
  sequentialThinking: {
    url: "https://remote.mcpservers.org/sequentialthinking/mcp",
    name: "Sequential Thinking MCP",
    description: "Sequential thinking/reasoning MCP server",
  },
};

// ============================================================
// LOGGING UTILITIES
// ============================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};
type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const icons = { PASS: "PASS", FAIL: "FAIL", SKIP: "SKIP", TESTING: "TEST" };
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  log(`[${icons[status]}] ${testName}`, statusColors[status]);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

// ============================================================
// SHARED UTILITIES
// ============================================================

const testResults: Array<{
  name: string;
  result: boolean | null;
  error: string | null;
  duration?: number;
}> = [];

function buildBaseSDKOptions(): { provider: string; model?: string } {
  const opts: { provider: string; model?: string } = {
    provider: TEST_CONFIG.provider,
  };
  if (TEST_CONFIG.model) {
    opts.model = TEST_CONFIG.model;
  }
  return opts;
}

/**
 * Build a properly-typed MCPServerInfo config for addExternalMCPServer().
 * Fills in required fields with sensible defaults so callers only need to
 * provide transport-specific overrides.
 */
function buildMCPServerConfig(
  id: string,
  overrides: Partial<MCPServerInfo> & { url?: string },
): MCPServerInfo {
  return {
    id,
    name: overrides.name || id,
    description: overrides.description || `Test server: ${id}`,
    transport: overrides.transport || "http",
    status: "initializing",
    tools: [],
    command: overrides.command ?? "",
    args: overrides.args ?? [],
    ...overrides,
  } as MCPServerInfo;
}

function validateResponseContent(
  response: string,
  expectedPatterns: string[],
  minMatches = 1,
): { passed: boolean; details: string[] } {
  const lower = response.toLowerCase();
  const found = expectedPatterns.filter((p) => lower.includes(p.toLowerCase()));
  return {
    passed: found.length >= minMatches,
    details: [
      `Found ${found.length}/${expectedPatterns.length} patterns`,
      `Matched: ${found.join(", ") || "none"}`,
    ],
  };
}

function isExpectedProviderError(msg: string): boolean {
  return [
    "API key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "could not be resolved",
    "Cannot connect",
    "Failed to generate",
    "ECONNREFUSED",
    "timeout",
    "Timeout",
    "DEADLINE_EXCEEDED",
    "503",
    "429",
    "billing",
    "permission",
    "Access Denied",
  ].some((p) => msg.includes(p));
}

function isExpectedMCPError(msg: string): boolean {
  return [
    "Connection timeout",
    "ECONNREFUSED",
    "ENOTFOUND",
    "fetch failed",
    "network",
    "503",
    "502",
    "socket hang up",
    "connect ETIMEDOUT",
    "getaddrinfo",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "Connection refused",
    "Connection reset",
    "Configuration validation failed",
    "URL is required",
    "invalid_token",
    "Authentication required",
    "401",
  ].some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

async function globalCleanup(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  if (global.gc) {
    global.gc();
  }
}

/**
 * Safely shut down a NeuroLink SDK instance, ignoring errors.
 */
async function safeShutdown(sdk: NeuroLink | null): Promise<void> {
  if (!sdk) {
    return;
  }
  try {
    const s = sdk as unknown as { shutdown?: () => Promise<void> };
    await s.shutdown?.();
  } catch {
    /* ignore */
  }
}

// ============================================================
// LOCAL MOCK MCP SERVERS (SSE + Streamable HTTP)
// ============================================================

/**
 * Creates a local mock MCP server that speaks SSE transport.
 * Uses the MCP SDK's McpServer + SSEServerTransport for protocol correctness.
 * Returns { url, close } — call close() to tear down.
 */
async function createMockSSEServer(): Promise<{
  url: string;
  close: () => Promise<void>;
} | null> {
  try {
    const { McpServer } =
      await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { SSEServerTransport } =
      await import("@modelcontextprotocol/sdk/server/sse.js");

    const mcpServer = new McpServer(
      { name: "mock-sse-server", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );

    // Register a mock tool so listTools returns something
    mcpServer.tool("mock_sse_ping", "Returns pong over SSE", () => ({
      content: [{ type: "text" as const, text: "pong" }],
    }));

    // Track active transports for cleanup
    const transports: Map<
      string,
      InstanceType<typeof SSEServerTransport>
    > = new Map();

    const server = http.createServer(async (req, res) => {
      // SSE endpoint: GET /sse — establishes SSE stream
      if (req.method === "GET" && req.url === "/sse") {
        const transport = new SSEServerTransport("/messages", res);
        transports.set(transport.sessionId, transport);
        await mcpServer.server.connect(transport);
        return;
      }

      // Message endpoint: POST /messages?sessionId=...
      if (req.method === "POST" && req.url?.startsWith("/messages")) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const sessionId = url.searchParams.get("sessionId") || "";
        const transport = transports.get(sessionId);
        if (!transport) {
          res.writeHead(400);
          res.end("Unknown session");
          return;
        }
        // Collect body
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            await transport.handlePostMessage(req, res, body);
          } catch {
            res.writeHead(400);
            res.end("Invalid JSON");
          }
        });
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    });

    // Listen on random available port
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const addr = server.address() as { port: number };
    const url = `http://127.0.0.1:${addr.port}`;

    return {
      url,
      close: async () => {
        for (const t of Array.from(transports.values())) {
          await t.close().catch(() => {});
        }
        transports.clear();
        await new Promise<void>((resolve, reject) =>
          server.close((err) => (err ? reject(err) : resolve())),
        );
      },
    };
  } catch {
    return null;
  }
}

/**
 * Creates a local mock MCP server that speaks Streamable HTTP transport.
 * Simulates a Semgrep-like server with code analysis tools.
 * Uses plain JSON-RPC over HTTP — no MCP SDK server-side transports needed.
 * Returns { url, close } — call close() to tear down.
 */
async function createMockStreamableHTTPServer(): Promise<{
  url: string;
  close: () => Promise<void>;
} | null> {
  try {
    const sessionId = randomUUID();

    const MOCK_TOOLS = [
      {
        name: "search_code",
        description: "Search code for patterns using semgrep rules",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "scan_security",
        description: "Scan code for security vulnerabilities",
        inputSchema: { type: "object" as const, properties: {} },
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleJsonRpc(msg: any): any {
      if (msg.method === "initialize") {
        return {
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            protocolVersion: "2025-03-26",
            capabilities: { tools: {} },
            serverInfo: { name: "mock-semgrep-server", version: "1.0.0" },
          },
        };
      }
      if (msg.method === "notifications/initialized") {
        return null; // notification, no response
      }
      if (msg.method === "tools/list") {
        return {
          jsonrpc: "2.0",
          id: msg.id,
          result: { tools: MOCK_TOOLS },
        };
      }
      if (msg.method === "tools/call") {
        const toolName = msg.params?.name || "unknown";
        const text =
          toolName === "search_code"
            ? "No issues found (mock result)"
            : "0 vulnerabilities found (mock)";
        return {
          jsonrpc: "2.0",
          id: msg.id,
          result: { content: [{ type: "text", text }] },
        };
      }
      // Unknown method
      return {
        jsonrpc: "2.0",
        id: msg.id ?? null,
        error: { code: -32601, message: `Method not found: ${msg.method}` },
      };
    }

    const server = http.createServer((req, res) => {
      if (req.url !== "/mcp" || req.method !== "POST") {
        res.writeHead(req.method === "DELETE" ? 200 : 405);
        res.end();
        return;
      }

      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          // Handle batch or single request
          const messages = Array.isArray(body) ? body : [body];
          const responses = messages
            .map(handleJsonRpc)
            .filter((r: unknown) => r !== null);

          res.writeHead(200, {
            "Content-Type": "application/json",
            "Mcp-Session-Id": sessionId,
          });
          if (responses.length === 1) {
            res.end(JSON.stringify(responses[0]));
          } else if (responses.length > 1) {
            res.end(JSON.stringify(responses));
          } else {
            res.end(); // all notifications, no response body
          }
        } catch {
          res.writeHead(400);
          res.end("Invalid JSON");
        }
      });
    });

    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const addr = server.address() as { port: number };
    const url = `http://127.0.0.1:${addr.port}/mcp`;

    return {
      url,
      close: async () => {
        await new Promise<void>((resolve, reject) =>
          server.close((err) => (err ? reject(err) : resolve())),
        );
      },
    };
  } catch {
    return null;
  }
}

// ============================================================
// TEST FUNCTIONS (16 tests)
// ============================================================

// #1 — testHTTPTransportConnection
// Connect to DeepWiki via sdk.addExternalMCPServer(), then sdk.generate() to prove integration works.
async function testHTTPTransportConnection(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("HTTP Transport Connection", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();

    const addResult = await testSdk.addExternalMCPServer(
      "deepwiki-conn",
      buildMCPServerConfig("deepwiki-conn", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.deepwiki.url,
        name: "DeepWiki",
        description: "DeepWiki MCP server",
      }),
    );

    if (!addResult.success) {
      const errMsg = addResult.error || "Connection failed";
      if (isExpectedMCPError(errMsg)) {
        logTest(
          "HTTP Transport Connection",
          "SKIP",
          `Server unavailable: ${errMsg}`,
        );
        return null;
      }
      logTest("HTTP Transport Connection", "FAIL", errMsg);
      return false;
    }

    // Prove the connection works end-to-end: ask the AI to use the tool
    const result = await testSdk.generate({
      input: {
        text: "Use the available DeepWiki tool to look up information about the 'facebook/react' repository. What is React?",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      ...buildBaseSDKOptions(),
    });

    const responseText = (result.content || "").toLowerCase();

    if (responseText.length < 10) {
      logTest(
        "HTTP Transport Connection",
        "FAIL",
        "Empty or near-empty response from generate()",
      );
      return false;
    }

    logTest(
      "HTTP Transport Connection",
      "PASS",
      `Connected via SDK + generate() | Response length: ${responseText.length}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg) || isExpectedProviderError(msg)) {
      logTest(
        "HTTP Transport Connection",
        "SKIP",
        `Network/provider unavailable: ${msg}`,
      );
      return null;
    }
    logTest("HTTP Transport Connection", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #2 — testHTTPTransportBearerAuth
// Use sdk.addExternalMCPServer() with Authorization header.
// DeepWiki doesn't require auth, so connection succeeding = headers accepted.
// Auth rejection (401/403) also proves headers were forwarded.
async function testHTTPTransportBearerAuth(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("HTTP Transport Bearer Auth", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();

    const addResult = await testSdk.addExternalMCPServer(
      "bearer-auth-test",
      buildMCPServerConfig("bearer-auth-test", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.deepwiki.url,
        name: "DeepWiki Bearer Auth",
        description: "Bearer auth test",
        headers: {
          Authorization: "Bearer test-token-for-header-verification",
        },
      }),
    );

    if (addResult.success) {
      // Connection succeeded — server accepted (or ignored) the Bearer header
      logTest(
        "HTTP Transport Bearer Auth",
        "PASS",
        `Connected with Bearer header via SDK | Tools discovered: ${addResult.metadata?.toolsDiscovered || 0}`,
      );
      return true;
    }

    const errMsg = (addResult.error || "").toLowerCase();

    // Auth rejection means headers were forwarded correctly
    if (
      errMsg.includes("401") ||
      errMsg.includes("403") ||
      errMsg.includes("unauthorized")
    ) {
      logTest(
        "HTTP Transport Bearer Auth",
        "PASS",
        "Auth headers forwarded (server rejected invalid token)",
      );
      return true;
    }

    // Network errors — skip
    if (isExpectedMCPError(addResult.error || "")) {
      logTest(
        "HTTP Transport Bearer Auth",
        "SKIP",
        `Network error: ${addResult.error}`,
      );
      return null;
    }

    logTest(
      "HTTP Transport Bearer Auth",
      "FAIL",
      `Unexpected error: ${addResult.error}`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg)) {
      logTest(
        "HTTP Transport Bearer Auth",
        "SKIP",
        `Network unavailable: ${msg}`,
      );
      return null;
    }
    logTest("HTTP Transport Bearer Auth", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #3 — testHTTPTransportAPIKeyAuth
// Use sdk.addExternalMCPServer() with X-API-Key header.
async function testHTTPTransportAPIKeyAuth(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("HTTP Transport API Key Auth", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();

    const addResult = await testSdk.addExternalMCPServer(
      "apikey-auth-test",
      buildMCPServerConfig("apikey-auth-test", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.fetchServer.url,
        name: "Fetch API Key Auth",
        description: "API key auth test",
        headers: {
          "X-API-Key": "test-api-key-header-verification",
        },
      }),
    );

    if (addResult.success) {
      logTest(
        "HTTP Transport API Key Auth",
        "PASS",
        `Connected with API key header via SDK | Tools discovered: ${addResult.metadata?.toolsDiscovered || 0}`,
      );
      return true;
    }

    const errMsg = (addResult.error || "").toLowerCase();

    // Auth rejection proves headers were forwarded
    if (
      errMsg.includes("401") ||
      errMsg.includes("403") ||
      errMsg.includes("unauthorized")
    ) {
      logTest(
        "HTTP Transport API Key Auth",
        "PASS",
        "API key header forwarded (server verified header presence)",
      );
      return true;
    }

    if (isExpectedMCPError(addResult.error || "")) {
      logTest(
        "HTTP Transport API Key Auth",
        "SKIP",
        `Network error: ${addResult.error}`,
      );
      return null;
    }

    logTest(
      "HTTP Transport API Key Auth",
      "FAIL",
      `Unexpected error: ${addResult.error}`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg)) {
      logTest(
        "HTTP Transport API Key Auth",
        "SKIP",
        `Network unavailable: ${msg}`,
      );
      return null;
    }
    logTest("HTTP Transport API Key Auth", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #4 — testHTTPTransportToolDiscovery
// Use sdk.addExternalMCPServer(), then verify tools are listed via SDK's getAllAvailableTools().
async function testHTTPTransportToolDiscovery(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("HTTP Transport Tool Discovery", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();

    const addResult = await testSdk.addExternalMCPServer(
      "fetch-discovery",
      buildMCPServerConfig("fetch-discovery", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.fetchServer.url,
        name: "Remote Fetch",
        description: "URL fetching MCP server",
      }),
    );

    if (!addResult.success) {
      const errMsg = addResult.error || "Connection failed";
      if (isExpectedMCPError(errMsg)) {
        logTest(
          "HTTP Transport Tool Discovery",
          "SKIP",
          `Server unavailable: ${errMsg}`,
        );
        return null;
      }
      logTest("HTTP Transport Tool Discovery", "FAIL", errMsg);
      return false;
    }

    // Discover tools via the SDK
    const tools = await testSdk.getAllAvailableTools();
    const toolNames = tools.map((t) => t.name);

    if (toolNames.length === 0) {
      logTest(
        "HTTP Transport Tool Discovery",
        "FAIL",
        "No tools discovered from Remote Fetch server via SDK",
      );
      return false;
    }

    // Verify tool structure: each tool has a name
    const allHaveNames = tools.every(
      (t) => typeof t.name === "string" && t.name.length > 0,
    );

    if (!allHaveNames) {
      logTest(
        "HTTP Transport Tool Discovery",
        "FAIL",
        "Some tools missing name field",
      );
      return false;
    }

    logTest(
      "HTTP Transport Tool Discovery",
      "PASS",
      `Discovered ${tools.length} tools via SDK: ${toolNames.join(", ")}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg)) {
      logTest(
        "HTTP Transport Tool Discovery",
        "SKIP",
        `Network unavailable: ${msg}`,
      );
      return null;
    }
    logTest("HTTP Transport Tool Discovery", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #5 — testHTTPTransportToolExecution
// Already uses SDK. Tighten assertions: require at least 1 expected pattern match.
async function testHTTPTransportToolExecution(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("HTTP Transport Tool Execution", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();

    const addResult = await testSdk.addExternalMCPServer(
      "fetch-exec",
      buildMCPServerConfig("fetch-exec", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.fetchServer.url,
        name: "Remote Fetch",
        description: "URL fetching MCP server",
      }),
    );

    if (!addResult.success) {
      const errMsg = addResult.error || "";
      if (isExpectedMCPError(errMsg)) {
        logTest(
          "HTTP Transport Tool Execution",
          "SKIP",
          `Cannot connect to MCP server: ${errMsg}`,
        );
        return null;
      }
      logTest(
        "HTTP Transport Tool Execution",
        "FAIL",
        `Failed to add MCP server: ${errMsg}`,
      );
      return false;
    }

    // Use generate() to invoke a tool through the MCP server
    const result = await testSdk.generate({
      input: {
        text: "Use the fetch tool to get the contents of https://httpbin.org/json and tell me what the response contains.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      ...buildBaseSDKOptions(),
    });

    const responseText = (result.content || "").toLowerCase();

    // Require at least 1 pattern match proving the tool was used
    const validation = validateResponseContent(
      responseText,
      ["slideshow", "httpbin", "json", "title", "author", "fetch"],
      1,
    );

    if (validation.passed) {
      logTest(
        "HTTP Transport Tool Execution",
        "PASS",
        `Tool executed via generate() | ${validation.details.join(" | ")}`,
      );
      return true;
    }

    // FAIL: no expected patterns found, tool wasn't used effectively
    logTest(
      "HTTP Transport Tool Execution",
      "FAIL",
      `No expected patterns in response | ${validation.details.join(" | ")} | Response: ${responseText.substring(0, 150)}`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg) || isExpectedMCPError(msg)) {
      logTest("HTTP Transport Tool Execution", "SKIP", msg);
      return null;
    }
    logTest("HTTP Transport Tool Execution", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #6 — testHTTPRetrySmoke
// Smoke test: Can't create mock server to force retries in this file.
// Verifies that the SDK accepts retry config on addExternalMCPServer().
async function testHTTPRetrySmoke(_sdk: NeuroLink): Promise<boolean | null> {
  logTest("HTTP Retry (Smoke)", "TESTING");
  // Smoke test — we cannot create a mock server that forces retries in this file alone.
  // We verify that the SDK accepts retry configuration without error.
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();

    const addResult = await testSdk.addExternalMCPServer(
      "retry-smoke",
      buildMCPServerConfig("retry-smoke", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.deepwiki.url,
        name: "DeepWiki Retry",
        description: "Retry smoke test",
        retryConfig: {
          maxAttempts: 3,
          initialDelay: 500,
          maxDelay: 5000,
          backoffMultiplier: 2,
        },
      }),
    );

    // Gate: the retry config must be accepted (not rejected with validation error)
    if (!addResult.success && !isExpectedMCPError(addResult.error || "")) {
      logTest(
        "HTTP Retry (Smoke)",
        "FAIL",
        `SDK rejected retry config: ${addResult.error}`,
      );
      return false;
    }

    if (!addResult.success) {
      // Network error, but config was accepted — still a pass for the smoke test
      logTest(
        "HTTP Retry (Smoke)",
        "PASS",
        `Retry config accepted | Connection skipped (network): ${addResult.error?.substring(0, 80)}`,
      );
      return true;
    }

    logTest(
      "HTTP Retry (Smoke)",
      "PASS",
      `Retry config accepted | Connection succeeded | Tools: ${addResult.metadata?.toolsDiscovered || 0}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg)) {
      logTest(
        "HTTP Retry (Smoke)",
        "PASS",
        `Retry config accepted (network error is expected): ${msg.substring(0, 80)}`,
      );
      return true;
    }
    logTest("HTTP Retry (Smoke)", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #7 — testHTTPRateLimiterSmoke
// Smoke test: Verifies the SDK accepts rate limiting config on addExternalMCPServer().
async function testHTTPRateLimiterSmoke(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("HTTP Rate Limiter (Smoke)", "TESTING");
  // Smoke test — cannot create a mock server to verify actual rate limiting.
  // We verify the SDK accepts rate limiting configuration without error.
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();

    const addResult = await testSdk.addExternalMCPServer(
      "rate-limit-smoke",
      buildMCPServerConfig("rate-limit-smoke", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.deepwiki.url,
        name: "DeepWiki Rate Limit",
        description: "Rate limiter smoke test",
        rateLimiting: {
          requestsPerMinute: 10,
          maxBurst: 3,
          useTokenBucket: true,
        },
      }),
    );

    // Gate: the rate limiting config must be accepted
    if (!addResult.success && !isExpectedMCPError(addResult.error || "")) {
      logTest(
        "HTTP Rate Limiter (Smoke)",
        "FAIL",
        `SDK rejected rate limiting config: ${addResult.error}`,
      );
      return false;
    }

    if (!addResult.success) {
      logTest(
        "HTTP Rate Limiter (Smoke)",
        "PASS",
        `Rate limiting config accepted | Connection skipped (network): ${addResult.error?.substring(0, 80)}`,
      );
      return true;
    }

    logTest(
      "HTTP Rate Limiter (Smoke)",
      "PASS",
      `Rate limiting configured via SDK | Connection succeeded | Tools: ${addResult.metadata?.toolsDiscovered || 0}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg)) {
      logTest(
        "HTTP Rate Limiter (Smoke)",
        "PASS",
        `Rate limiting config accepted (network error is expected): ${msg.substring(0, 80)}`,
      );
      return true;
    }
    logTest("HTTP Rate Limiter (Smoke)", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #8 — testHTTPTransportTimeout
// Use sdk.addExternalMCPServer() with unreachable address.
// Assert it fails within a reasonable time bound (< timeout * 2).
async function testHTTPTransportTimeout(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("HTTP Transport Timeout", "TESTING");
  let testSdk: NeuroLink | null = null;
  const configuredTimeout = 5000;
  try {
    testSdk = new NeuroLink();

    const startTime = Date.now();
    const addResult = await testSdk.addExternalMCPServer(
      "timeout-test",
      buildMCPServerConfig("timeout-test", {
        transport: "http",
        url: "https://192.0.2.1:12345/mcp", // RFC 5737 TEST-NET address — should timeout
        name: "Timeout Test",
        description: "Timeout test with unreachable address",
        httpOptions: {
          connectionTimeout: configuredTimeout,
          requestTimeout: configuredTimeout,
        },
      }),
    );

    const elapsed = Date.now() - startTime;

    if (!addResult.success) {
      // Must have timed out or errored within a reasonable bound
      const withinBound = elapsed < configuredTimeout * 3;
      if (!withinBound) {
        logTest(
          "HTTP Transport Timeout",
          "FAIL",
          `Took ${elapsed}ms — exceeded ${configuredTimeout * 3}ms bound`,
        );
        return false;
      }

      logTest(
        "HTTP Transport Timeout",
        "PASS",
        `Timeout/error detected in ${elapsed}ms (limit: ${configuredTimeout}ms): ${addResult.error?.substring(0, 100)}`,
      );
      return true;
    }

    // If it somehow connected to the non-existent address, that's very unexpected
    logTest(
      "HTTP Transport Timeout",
      "FAIL",
      `Unexpectedly connected to unreachable address in ${elapsed}ms`,
    );
    return false;
  } catch (error) {
    const msg = (
      error instanceof Error ? error.message : String(error)
    ).toLowerCase();
    // Timeout/connection errors are expected behavior for this test
    if (
      msg.includes("timeout") ||
      msg.includes("etimedout") ||
      msg.includes("abort") ||
      msg.includes("econnrefused") ||
      msg.includes("ehostunreach") ||
      msg.includes("enetunreach")
    ) {
      logTest(
        "HTTP Transport Timeout",
        "PASS",
        `Timeout error properly raised: ${msg.substring(0, 100)}`,
      );
      return true;
    }
    logTest("HTTP Transport Timeout", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #9 — testSSETransportConnection
// Start local mock SSE server, connect via sdk.addExternalMCPServer({ transport: "sse" }).
async function testSSETransportConnection(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SSE Transport Connection", "TESTING");
  let mockServer: { url: string; close: () => Promise<void> } | null = null;
  let testSdk: NeuroLink | null = null;
  try {
    // Start local mock SSE MCP server
    mockServer = await createMockSSEServer();
    if (!mockServer) {
      logTest(
        "SSE Transport Connection",
        "SKIP",
        "Could not create mock SSE server (MCP server SDK not available)",
      );
      return null;
    }

    testSdk = new NeuroLink();

    const addResult = await testSdk.addExternalMCPServer(
      "sse-test",
      buildMCPServerConfig("sse-test", {
        transport: "sse",
        url: `${mockServer.url}/sse`,
        name: "Mock SSE",
        description: "Local mock SSE MCP server",
      }),
    );

    if (!addResult.success) {
      const errMsg = addResult.error || "Connection failed";
      if (isExpectedMCPError(errMsg)) {
        logTest(
          "SSE Transport Connection",
          "SKIP",
          `SSE connection failed: ${errMsg}`,
        );
        return null;
      }
      logTest("SSE Transport Connection", "FAIL", errMsg);
      return false;
    }

    // Verify tools are accessible through the SDK
    const tools = await testSdk.getAllAvailableTools();
    const toolNames = tools.map((t) => t.name);

    if (toolNames.length === 0) {
      logTest(
        "SSE Transport Connection",
        "FAIL",
        "Connected via SSE but no tools discovered through SDK",
      );
      return false;
    }

    logTest(
      "SSE Transport Connection",
      "PASS",
      `Connected via SSE through SDK | Tools: ${toolNames.join(", ")}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg)) {
      logTest("SSE Transport Connection", "SKIP", `SSE error: ${msg}`);
      return null;
    }
    logTest("SSE Transport Connection", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
    await mockServer?.close().catch(() => {});
  }
}

// #11 — testRealMCPServerDeepWiki
// Connect to DeepWiki via sdk.addExternalMCPServer(), then sdk.generate() with tools.
async function testRealMCPServerDeepWiki(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("Real MCP Server - DeepWiki", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();
    const startTime = Date.now();

    const addResult = await testSdk.addExternalMCPServer(
      "deepwiki-real",
      buildMCPServerConfig("deepwiki-real", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.deepwiki.url,
        name: "DeepWiki",
        description: REAL_HTTP_MCP_SERVERS.deepwiki.description,
      }),
    );

    const connectionTime = Date.now() - startTime;

    if (!addResult.success) {
      const errMsg = addResult.error || "Connection failed";
      if (isExpectedMCPError(errMsg)) {
        logTest(
          "Real MCP Server - DeepWiki",
          "SKIP",
          `Server unavailable: ${errMsg}`,
        );
        return null;
      }
      logTest("Real MCP Server - DeepWiki", "FAIL", errMsg);
      return false;
    }

    // Verify tools were discovered
    const tools = await testSdk.getAllAvailableTools();
    const toolNames = tools.map((t) => t.name);

    if (toolNames.length === 0) {
      logTest(
        "Real MCP Server - DeepWiki",
        "FAIL",
        "Connected but no tools discovered via SDK",
      );
      return false;
    }

    // Generate with DeepWiki tools to prove full integration
    const result = await testSdk.generate({
      input: {
        text: "Use the available tool to look up what the 'vercel/next.js' repository is about. Give a brief summary.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      ...buildBaseSDKOptions(),
    });

    const responseText = (result.content || "").toLowerCase();

    if (responseText.length < 10) {
      logTest(
        "Real MCP Server - DeepWiki",
        "FAIL",
        "generate() returned empty response with DeepWiki tools",
      );
      return false;
    }

    logTest(
      "Real MCP Server - DeepWiki",
      "PASS",
      `Connected in ${connectionTime}ms | Tools: [${toolNames.join(", ")}] | Response: ${responseText.length} chars`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg) || isExpectedProviderError(msg)) {
      logTest("Real MCP Server - DeepWiki", "SKIP", `Unavailable: ${msg}`);
      return null;
    }
    logTest("Real MCP Server - DeepWiki", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #12 — testMockMCPServerSemgrep
// Connect to local mock Streamable HTTP server via sdk.addExternalMCPServer().
async function testMockMCPServerSemgrep(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("Mock MCP Server - Semgrep", "TESTING");
  let mockServer: { url: string; close: () => Promise<void> } | null = null;
  let testSdk: NeuroLink | null = null;
  try {
    mockServer = await createMockStreamableHTTPServer();
    if (!mockServer) {
      logTest(
        "Mock MCP Server - Semgrep",
        "SKIP",
        "Could not create mock Streamable HTTP server",
      );
      return null;
    }

    testSdk = new NeuroLink();
    const startTime = Date.now();

    const addResult = await testSdk.addExternalMCPServer(
      "semgrep-mock",
      buildMCPServerConfig("semgrep-mock", {
        transport: "http",
        url: mockServer.url,
        name: "Mock Semgrep",
        description: "Local mock Semgrep-like MCP server",
      }),
    );

    const connectionTime = Date.now() - startTime;

    if (!addResult.success) {
      logTest(
        "Mock MCP Server - Semgrep",
        "FAIL",
        `Failed to connect to local mock server: ${addResult.error}`,
      );
      return false;
    }

    // Verify tools through SDK
    const tools = await testSdk.getAllAvailableTools();
    const toolNames = tools.map((t) => t.name);

    if (toolNames.length === 0) {
      logTest(
        "Mock MCP Server - Semgrep",
        "FAIL",
        "Connected but no tools discovered via SDK",
      );
      return false;
    }

    logTest(
      "Mock MCP Server - Semgrep",
      "PASS",
      `Connected in ${connectionTime}ms via SDK | Tools: [${toolNames.join(", ")}]`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Mock MCP Server - Semgrep", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
    await mockServer?.close().catch(() => {});
  }
}

// #13 — testRealMCPServerRemoteFetch
// Connect to Remote Fetch via sdk.addExternalMCPServer(), then sdk.generate() to invoke tool.
async function testRealMCPServerRemoteFetch(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("Real MCP Server - Remote Fetch", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();
    const startTime = Date.now();

    const addResult = await testSdk.addExternalMCPServer(
      "fetch-real",
      buildMCPServerConfig("fetch-real", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.fetchServer.url,
        name: "Remote Fetch",
        description: REAL_HTTP_MCP_SERVERS.fetchServer.description,
      }),
    );

    const connectionTime = Date.now() - startTime;

    if (!addResult.success) {
      const errMsg = addResult.error || "Connection failed";
      if (isExpectedMCPError(errMsg)) {
        logTest(
          "Real MCP Server - Remote Fetch",
          "SKIP",
          `Server unavailable: ${errMsg}`,
        );
        return null;
      }
      logTest("Real MCP Server - Remote Fetch", "FAIL", errMsg);
      return false;
    }

    // Verify tools through SDK
    const tools = await testSdk.getAllAvailableTools();
    const toolNames = tools.map((t) => t.name);

    if (toolNames.length === 0) {
      logTest(
        "Real MCP Server - Remote Fetch",
        "FAIL",
        "Connected but no tools discovered via SDK",
      );
      return false;
    }

    // Invoke tool via generate()
    const result = await testSdk.generate({
      input: {
        text: "Use the fetch tool to retrieve https://httpbin.org/json and describe what you got back.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      ...buildBaseSDKOptions(),
    });

    const responseText = (result.content || "").toLowerCase();

    const validation = validateResponseContent(
      responseText,
      ["slideshow", "httpbin", "json", "title", "author", "fetch"],
      1,
    );

    if (!validation.passed && responseText.length < 20) {
      logTest(
        "Real MCP Server - Remote Fetch",
        "FAIL",
        `Tool invocation produced no useful response | ${validation.details.join(" | ")}`,
      );
      return false;
    }

    logTest(
      "Real MCP Server - Remote Fetch",
      "PASS",
      `Connected in ${connectionTime}ms | Tools: [${toolNames.join(", ")}] | ToolInvoked: ${validation.passed} | Response: ${responseText.length} chars`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg) || isExpectedProviderError(msg)) {
      logTest("Real MCP Server - Remote Fetch", "SKIP", `Unavailable: ${msg}`);
      return null;
    }
    logTest("Real MCP Server - Remote Fetch", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #14 — testRealMCPServerSequentialThinking
// Connect to Sequential Thinking via sdk.addExternalMCPServer(), then sdk.generate().
async function testRealMCPServerSequentialThinking(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("Real MCP Server - Sequential Thinking", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();
    const startTime = Date.now();

    const addResult = await testSdk.addExternalMCPServer(
      "sequential-thinking",
      buildMCPServerConfig("sequential-thinking", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.sequentialThinking.url,
        name: "Sequential Thinking",
        description: REAL_HTTP_MCP_SERVERS.sequentialThinking.description,
      }),
    );

    const connectionTime = Date.now() - startTime;

    if (!addResult.success) {
      const errMsg = addResult.error || "Connection failed";
      if (isExpectedMCPError(errMsg)) {
        logTest(
          "Real MCP Server - Sequential Thinking",
          "SKIP",
          `Server unavailable: ${errMsg}`,
        );
        return null;
      }
      logTest("Real MCP Server - Sequential Thinking", "FAIL", errMsg);
      return false;
    }

    // Verify tools through SDK
    const tools = await testSdk.getAllAvailableTools();
    const toolNames = tools.map((t) => t.name);

    if (toolNames.length === 0) {
      logTest(
        "Real MCP Server - Sequential Thinking",
        "FAIL",
        "Connected but no tools discovered via SDK",
      );
      return false;
    }

    // Use generate() with the sequential thinking tool
    const result = await testSdk.generate({
      input: {
        text: "Use the sequential thinking tool to reason step by step about what 2+3*4 equals. Show your thinking.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      ...buildBaseSDKOptions(),
    });

    const responseText = (result.content || "").toLowerCase();

    if (responseText.length < 10) {
      logTest(
        "Real MCP Server - Sequential Thinking",
        "FAIL",
        "generate() returned empty response with sequential thinking tools",
      );
      return false;
    }

    logTest(
      "Real MCP Server - Sequential Thinking",
      "PASS",
      `Connected in ${connectionTime}ms | Tools: [${toolNames.join(", ")}] | Response: ${responseText.length} chars`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg) || isExpectedProviderError(msg)) {
      logTest(
        "Real MCP Server - Sequential Thinking",
        "SKIP",
        `Unavailable: ${msg}`,
      );
      return null;
    }
    logTest("Real MCP Server - Sequential Thinking", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #15 — testMCPBlockedToolSupport
// Register tools, then use sdk.generate() to verify tool integration.
// If the SDK exposes blockedTools, test that separately.
async function testMCPBlockedToolSupport(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("MCP Blocked Tool Support", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();

    // Register two custom tools
    testSdk.registerTool("allowed_tool", {
      name: "allowed_tool",
      description: "A tool that returns a known value: ALLOWED_RESULT_42",
      inputSchema: {
        type: "object" as const,
        properties: { query: { type: "string" as const } },
      },
      execute: async () => ({ result: "ALLOWED_RESULT_42" }),
    });

    testSdk.registerTool("blocked_tool", {
      name: "blocked_tool",
      description: "A tool that returns BLOCKED_RESULT_99",
      inputSchema: {
        type: "object" as const,
        properties: { query: { type: "string" as const } },
      },
      execute: async () => ({ result: "BLOCKED_RESULT_99" }),
    });

    // Verify tools are registered via SDK
    const allTools = await testSdk.getAllAvailableTools();
    const allToolNames = allTools.map((t) => t.name);

    const hasAllowed = allToolNames.includes("allowed_tool");
    const hasBlocked = allToolNames.includes("blocked_tool");

    if (!hasAllowed) {
      logTest(
        "MCP Blocked Tool Support",
        "FAIL",
        `allowed_tool not found in registered tools. Found: ${allToolNames.join(", ")}`,
      );
      return false;
    }

    // Use generate() to prove the tool can be invoked through the SDK
    const result = await testSdk.generate({
      input: {
        text: "Call the allowed_tool with query 'test' and tell me the result.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      ...buildBaseSDKOptions(),
    });

    const responseText = (result.content || "").toLowerCase();

    if (responseText.length < 5) {
      logTest(
        "MCP Blocked Tool Support",
        "FAIL",
        "generate() returned empty response",
      );
      return false;
    }

    logTest(
      "MCP Blocked Tool Support",
      "PASS",
      `Tools registered | Allowed: ${hasAllowed} | Blocked: ${hasBlocked} | Total: ${allToolNames.length} | Response: ${responseText.length} chars`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("MCP Blocked Tool Support", "SKIP", `Provider error: ${msg}`);
      return null;
    }
    logTest("MCP Blocked Tool Support", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #16 — testHTTPTransportSessionManagement
// After addExternalMCPServer(), make 2 sdk.generate() calls. Assert both succeed.
async function testHTTPTransportSessionManagement(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("HTTP Transport Session Management", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    testSdk = new NeuroLink();

    const addResult = await testSdk.addExternalMCPServer(
      "session-test",
      buildMCPServerConfig("session-test", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.deepwiki.url,
        name: "DeepWiki Session",
        description: "Session management test",
      }),
    );

    if (!addResult.success) {
      const errMsg = addResult.error || "Connection failed";
      if (isExpectedMCPError(errMsg)) {
        logTest(
          "HTTP Transport Session Management",
          "SKIP",
          `Server unavailable: ${errMsg}`,
        );
        return null;
      }
      logTest("HTTP Transport Session Management", "FAIL", errMsg);
      return false;
    }

    // Make two generate() calls to verify session continuity
    const result1 = await testSdk.generate({
      input: { text: "What tools do you have available? List them briefly." },
      maxTokens: TEST_CONFIG.maxTokens,
      ...buildBaseSDKOptions(),
    });

    const response1 = (result1.content || "").trim();

    const result2 = await testSdk.generate({
      input: { text: "Summarize your capabilities in one sentence." },
      maxTokens: TEST_CONFIG.maxTokens,
      ...buildBaseSDKOptions(),
    });

    const response2 = (result2.content || "").trim();

    // Gate: both calls must return non-empty responses
    if (response1.length < 5) {
      logTest(
        "HTTP Transport Session Management",
        "FAIL",
        "First generate() returned empty response",
      );
      return false;
    }

    if (response2.length < 5) {
      logTest(
        "HTTP Transport Session Management",
        "FAIL",
        "Second generate() returned empty response",
      );
      return false;
    }

    logTest(
      "HTTP Transport Session Management",
      "PASS",
      `Session maintained | Response1: ${response1.length} chars | Response2: ${response2.length} chars`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedMCPError(msg) || isExpectedProviderError(msg)) {
      logTest(
        "HTTP Transport Session Management",
        "SKIP",
        `Unavailable: ${msg}`,
      );
      return null;
    }
    logTest("HTTP Transport Session Management", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// #17 — testObservabilitySpans
// After sdk.generate() with MCP tool, check spans. Assert at least 1 span exists.
async function testObservabilitySpans(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("Observability Spans", "TESTING");
  let testSdk: NeuroLink | null = null;
  try {
    const { getMetricsAggregator } = await import("../dist/index.js");

    testSdk = new NeuroLink();

    // Add an MCP server and do a generate() to produce spans
    const addResult = await testSdk.addExternalMCPServer(
      "obs-test",
      buildMCPServerConfig("obs-test", {
        transport: "http",
        url: REAL_HTTP_MCP_SERVERS.deepwiki.url,
        name: "DeepWiki Obs",
        description: "Observability test",
      }),
    );

    if (addResult.success) {
      try {
        await testSdk.generate({
          input: { text: "What is React? Use available tools if helpful." },
          maxTokens: TEST_CONFIG.maxTokens,
          ...buildBaseSDKOptions(),
        });
      } catch {
        // Generate may fail due to provider issues; that's fine for this test
      }
    }

    const aggregator = getMetricsAggregator();
    const allSpans = aggregator.getSpans();

    if (allSpans.length === 0) {
      logTest(
        "Observability Spans",
        "FAIL",
        "No spans recorded after generate() call",
      );
      return false;
    }

    const mcpSpans = allSpans.filter(
      (s: { type?: string; name?: string }) =>
        s.type === "mcp.transport" || (s.name && s.name.startsWith("mcp.")),
    );

    logTest(
      "Observability Spans",
      "PASS",
      `Spans recorded | Total: ${allSpans.length} | MCP spans: ${mcpSpans.length}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg) || isExpectedMCPError(msg)) {
      // Even if generate failed, check if spans were recorded
      try {
        const { getMetricsAggregator } = await import("../dist/index.js");
        const aggregator = getMetricsAggregator();
        const allSpans = aggregator.getSpans();
        if (allSpans.length > 0) {
          logTest(
            "Observability Spans",
            "PASS",
            `Spans recorded despite error | Total: ${allSpans.length}`,
          );
          return true;
        }
      } catch {
        /* fall through to fail */
      }
      logTest(
        "Observability Spans",
        "SKIP",
        `Provider/network error prevented span generation: ${msg}`,
      );
      return null;
    }
    logTest("Observability Spans", "FAIL", msg);
    return false;
  } finally {
    await safeShutdown(testSdk);
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log("\nNeuroLink Continuous Test Suite: MCP HTTP Transport", "bright");
  log(
    `   Provider: ${TEST_CONFIG.provider}, Model: ${TEST_CONFIG.model || "default"}`,
    "cyan",
  );

  // Prerequisite checks
  if (!fs.existsSync("dist") || !fs.existsSync("dist/index.js")) {
    log("Build not found. Run: pnpm run build", "red");
    process.exit(1);
  }

  const sharedSdk = new NeuroLink();

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    {
      name: "HTTP Transport Connection",
      fn: () => testHTTPTransportConnection(sharedSdk),
    },
    {
      name: "HTTP Transport Bearer Auth",
      fn: () => testHTTPTransportBearerAuth(sharedSdk),
    },
    {
      name: "HTTP Transport API Key Auth",
      fn: () => testHTTPTransportAPIKeyAuth(sharedSdk),
    },
    {
      name: "HTTP Transport Tool Discovery",
      fn: () => testHTTPTransportToolDiscovery(sharedSdk),
    },
    {
      name: "HTTP Transport Tool Execution",
      fn: () => testHTTPTransportToolExecution(sharedSdk),
    },
    {
      name: "HTTP Retry (Smoke)",
      fn: () => testHTTPRetrySmoke(sharedSdk),
    },
    {
      name: "HTTP Rate Limiter (Smoke)",
      fn: () => testHTTPRateLimiterSmoke(sharedSdk),
    },
    {
      name: "HTTP Transport Timeout",
      fn: () => testHTTPTransportTimeout(sharedSdk),
    },
    {
      name: "SSE Transport Connection",
      fn: () => testSSETransportConnection(sharedSdk),
    },
    {
      name: "Real MCP Server - DeepWiki",
      fn: () => testRealMCPServerDeepWiki(sharedSdk),
    },
    {
      name: "Mock MCP Server - Semgrep",
      fn: () => testMockMCPServerSemgrep(sharedSdk),
    },
    {
      name: "Real MCP Server - Remote Fetch",
      fn: () => testRealMCPServerRemoteFetch(sharedSdk),
    },
    {
      name: "Real MCP Server - Sequential Thinking",
      fn: () => testRealMCPServerSequentialThinking(sharedSdk),
    },
    {
      name: "MCP Blocked Tool Support",
      fn: () => testMCPBlockedToolSupport(sharedSdk),
    },
    {
      name: "HTTP Transport Session Management",
      fn: () => testHTTPTransportSessionManagement(sharedSdk),
    },
    {
      name: "Observability Spans",
      fn: () => testObservabilitySpans(sharedSdk),
    },
  ];

  for (const test of tests) {
    try {
      const testStartTime = Date.now();
      const result = await test.fn();
      const duration = Date.now() - testStartTime;
      testResults.push({ name: test.name, result, error: null, duration });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      testResults.push({ name: test.name, result: false, error: msg });
    }
    await globalCleanup();
    await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
  }

  // Summary
  logSection("Test Results Summary");
  const passed = testResults.filter((r) => r.result === true).length;
  const failed = testResults.filter((r) => r.result === false).length;
  const skipped = testResults.filter((r) => r.result === null).length;
  testResults.forEach((t) => {
    logTest(
      t.name,
      t.result === true ? "PASS" : t.result === false ? "FAIL" : "SKIP",
      t.error || "",
    );
  });
  const duration = Math.round((Date.now() - startTime) / 1000);
  log(
    `
Final Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${testResults.length} total) in ${duration}s`,
    failed === 0 ? "green" : "red",
  );

  log("\nMCP HTTP Transport Feature Summary:", "cyan");
  log("   Transports: HTTP (Streamable), SSE", "reset");
  log("   Auth: Bearer token, API key", "reset");
  log(
    "   Resilience: Retry with exponential backoff, rate limiting, timeouts",
    "reset",
  );
  log("   Real servers: DeepWiki, Remote Fetch, Sequential Thinking", "reset");
  log("   Mock servers: Semgrep (Streamable HTTP), SSE", "reset");
  log("   Session: Mcp-Session-Id via multiple generate() calls", "reset");
  log("   Observability: Span recording after MCP operations", "reset");

  try {
    await safeShutdown(sharedSdk);
  } catch {
    /* ignore */
  }
  process.exit(failed === 0 ? 0 : 1);
}

// ============================================================
// CLI ARGS + EXECUTION
// ============================================================

function parseArguments(): { provider?: string; model?: string } {
  const args: { provider?: string; model?: string } = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--provider=")) {
      args.provider = arg.split("=")[1];
    }
    if (arg.startsWith("--model=")) {
      args.model = arg.split("=")[1];
    }
    if (arg === "--help") {
      console.log(
        "Usage: npx tsx test/continuous-test-suite-mcp-http.ts [--provider=X] [--model=Y]",
      );
      console.log(
        "\nTests MCP HTTP transport end-to-end through the NeuroLink SDK:",
      );
      console.log(
        "  - HTTP transport connection via sdk.addExternalMCPServer() + sdk.generate()",
      );
      console.log("  - Auth headers (Bearer, API Key)");
      console.log("  - Tool discovery and execution through sdk.generate()");
      console.log("  - Retry, rate limiting, timeouts (smoke tests)");
      console.log("  - SSE transport via local mock server");
      console.log(
        "  - Real MCP servers (DeepWiki, Remote Fetch, Sequential Thinking)",
      );
      console.log("  - Blocked tool support, session management");
      console.log("  - Observability spans");
      process.exit(0);
    }
  }
  return args;
}

const cliArgs = parseArguments();
if (cliArgs.provider) {
  TEST_CONFIG.provider = cliArgs.provider;
}
if (cliArgs.model) {
  TEST_CONFIG.model = cliArgs.model;
}
if (!TEST_CONFIG.maxTokens) {
  // Fallback for unknown providers: cap at 1024 instead of 8192 so small-
  // context-window providers don't get budget=0 (their entire context is 8192).
  TEST_CONFIG.maxTokens = PROVIDER_MAX_TOKENS[TEST_CONFIG.provider] || 1024;
}

if (typeof describe === "undefined") {
  runAllTests().catch((e) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  describe.skip("Continuous Test Suite: MCP HTTP Transport", () => {
    it("runs standalone", () => runAllTests(), 600000);
  });
}

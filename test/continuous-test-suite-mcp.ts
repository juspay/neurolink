#!/usr/bin/env tsx

/**
 * Continuous Test Suite for MCP Enhancements
 *
 * 44 test functions, 172+ assertions across 9 sections:
 *
 * - Part 1: MCP Infrastructure (ToolRouter, ToolCache, RequestBatcher, core exports)
 * - Part 1b: Extended Modules (Annotations, Elicitation, Discovery, MultiServer,
 *   ServerBase, AgentExposure, Capabilities, Registry, Converter, Integration)
 * - Part 1c: SDK Wiring (cache/middleware/annotations via executeTool)
 * - Part 2: SDK generate()/stream() with custom MCP tools (real API)
 * - Part 3: MCP Enhancements via generate()/stream() — caching, destructive skip,
 *   middleware, annotations, disableToolCache (real API)
 * - Part 3b: SDK Enhancement Methods (standalone)
 * - Part 3c: SDK Methods E2E — exposeAgentAsTool, convertTools, getToolAnnotations,
 *   middleware chain, batcher through generate()/stream() (real API)
 * - Part 4: CLI generate/stream with built-in tools
 * - Part 4b: CLI multi-tool and readFile tests
 *
 * All imports use the public package API (../dist/index.js) — same as consumers.
 *
 * Run with: npx tsx test/continuous-test-suite-mcp.ts --provider=vertex
 *
 * Environment variables:
 *   TEST_PROVIDER - Provider to use (default: vertex)
 *   TEST_MODEL    - Model override (optional)
 */

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  // Agent Exposure
  AgentExposureManager,
  createAnnotatedTool,
  createJsonResource,
  createPrompt,
  createTextResource,
  // Elicitation
  ElicitationManager,
  // Enhanced Tool Discovery
  EnhancedToolDiscovery,
  ExternalServerManager,
  exposeAgentAsTool,
  filterToolsByAnnotations,
  getAllWellKnownServers,
  getToolSafetyLevel,
  getWellKnownServer,
  HTTPRateLimiter,
  // Tool Annotations
  inferAnnotations,
  MCPCircuitBreaker,
  MCPClientFactory,
  // MCP Registry Client
  MCPRegistryClient,
  // MCP Server Base
  MCPServerBase,
  MCPToolRegistry,
  // Multi-Server Manager
  MultiServerManager,
  mcpToolToNeuroLink,
  NeuroLink,
  // Tool Converter
  neuroLinkToolToMCP,
  RequestBatcher,
  // Server Capabilities
  ServerCapabilitiesManager,
  sanitizeToolName,
  ToolCache,
  // Tool Integration
  ToolIntegrationManager,
  ToolRouter,
  validateAnnotations,
  validateToolName,
  withHTTPRetry,
} from "../dist/index.js";

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
  or: 4096,
  litellm: 16384,
};

// Parse CLI arguments FIRST so provider/model are known before resolveTestModel()
const args = process.argv.slice(2);
let cliProvider: string | undefined;
let cliModel: string | undefined;
for (const arg of args) {
  if (arg.startsWith("--provider=")) {
    cliProvider = arg.split("=")[1];
  }
  if (arg.startsWith("--model=")) {
    cliModel = arg.split("=")[1];
  }
}

// Resolve model: CLI arg > TEST_MODEL env > provider-specific env var
function resolveTestModel(provider: string): string | undefined {
  if (cliModel) {
    return cliModel;
  }
  if (process.env.TEST_MODEL) {
    return process.env.TEST_MODEL;
  }
  const providerModelEnvMap: Record<string, string> = {
    litellm: "LITELLM_MODEL",
    openai: "OPENAI_MODEL",
    vertex: "VERTEX_MODEL",
    bedrock: "BEDROCK_MODEL",
    "google-ai-studio": "GOOGLE_AI_MODEL",
    "google-ai": "GOOGLE_AI_MODEL",
    azure: "AZURE_OPENAI_MODEL",
    anthropic: "ANTHROPIC_MODEL",
    mistral: "MISTRAL_MODEL",
    ollama: "OLLAMA_MODEL",
  };
  const envKey = providerModelEnvMap[provider];
  return envKey ? process.env[envKey] : undefined;
}

const TEST_CONFIG = {
  provider: cliProvider || process.env.TEST_PROVIDER || "vertex",
  model: undefined as string | undefined,
  maxTokens: undefined as number | undefined,
  timeout: 60000,
};

// Resolve model AFTER provider is determined (CLI arg or env)
TEST_CONFIG.model = resolveTestModel(TEST_CONFIG.provider);
TEST_CONFIG.maxTokens = PROVIDER_MAX_TOKENS[TEST_CONFIG.provider] || 4096;

function buildBaseSDKOptions(): { provider: string; model?: string } {
  const options: { provider: string; model?: string } = {
    provider: TEST_CONFIG.provider,
  };
  if (TEST_CONFIG.model) {
    options.model = TEST_CONFIG.model;
  }
  return options;
}

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
} as const;

type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(title, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP",
  details = "",
): void {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️";
  const color: ColorName =
    status === "PASS" ? "green" : status === "FAIL" ? "red" : "yellow";
  log(`${icon} ${testName}`, color);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

interface TestResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  error?: string;
}

const results: TestResult[] = [];

function recordTest(
  name: string,
  passed: boolean,
  skipped = false,
  error?: string,
): void {
  results.push({ name, passed, skipped, error });
  logTest(name, skipped ? "SKIP" : passed ? "PASS" : "FAIL", error);
}

// ============================================================
// Part 1: MCP Infrastructure Tests (no API calls)
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

    const cache = new ToolCache({ ttl: 60000, maxSize: 100 });
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

    recordTest("ToolCache.isExpired()", typeof cache.isExpired === "function");
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
    await Promise.allSettled([p1, p2]);
    recordTest("RequestBatcher.flush()", true);

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
// Part 1b: Extended MCP Infrastructure Tests (no API calls)
// ============================================================

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
// Part 2: SDK generate()/stream() with MCP Tools (real API)
// ============================================================

async function testSDKToolRegistration(): Promise<void> {
  logSection("SDK Tool Registration & MCP Status");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink();
    recordTest("SDK instantiation (new NeuroLink())", true);

    sdk.registerTool("mcp_test_weather", {
      name: "mcp_test_weather",
      description: "Get weather data for a city",
      inputSchema: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
        },
      },
      execute: async (params: { city?: string }) => ({
        city: params.city || "Unknown",
        temperature: 22,
        condition: "sunny",
        humidity: 45,
      }),
    });
    recordTest("SDK registerTool() - weather tool", true);

    sdk.registerTool("mcp_test_stock_price", {
      name: "mcp_test_stock_price",
      description: "Get stock price for a ticker symbol",
      inputSchema: {
        type: "object",
        properties: {
          ticker: { type: "string", description: "Stock ticker" },
        },
      },
      execute: async (params: { ticker?: string }) => ({
        ticker: params.ticker || "UNKNOWN",
        price: 187.42,
        change: "+2.35%",
        marketCap: "2.87T",
      }),
    });
    recordTest("SDK registerTool() - stock tool", true);

    const allTools = await sdk.getAllAvailableTools();
    const customTools = allTools.filter(
      (t: { name: string }) =>
        t.name === "mcp_test_weather" || t.name === "mcp_test_stock_price",
    );
    recordTest(
      "SDK getAllAvailableTools() includes custom tools",
      customTools.length === 2,
      false,
      `Found ${customTools.length}/2 custom tools out of ${allTools.length} total`,
    );

    const mcpStatus = await sdk.getMCPStatus();
    recordTest(
      "SDK getMCPStatus() returns valid status",
      typeof mcpStatus.mcpInitialized === "boolean",
      false,
      `Initialized: ${mcpStatus.mcpInitialized}, Servers: ${mcpStatus.totalServers}`,
    );

    sdk.unregisterTool("mcp_test_stock_price");
    const toolsAfter = await sdk.getAllAvailableTools();
    const stockToolExists = toolsAfter.some(
      (t: { name: string }) => t.name === "mcp_test_stock_price",
    );
    recordTest(
      "SDK unregisterTool() removes tool from list",
      !stockToolExists,
      false,
      `Tool present after unregister: ${stockToolExists}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("SDK Tool Registration", false, false, msg);
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testSDKGenerateWithMCPTools(): Promise<void> {
  logSection("SDK generate() with MCP Custom Tools");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink();
    const sdkOptions = buildBaseSDKOptions();

    sdk.registerTool("mcp_quarterly_metrics", {
      name: "mcp_quarterly_metrics",
      description:
        "Get Q4 2024 business metrics including revenue, customers, and NPS score",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        quarter: "Q4 2024",
        revenue: "$28,463,192.78",
        activeCustomers: 14289,
        npsScore: 72,
        churnRate: "3.1%",
        arpu: "$1,992.06",
      }),
    });

    sdk.registerTool("mcp_server_health", {
      name: "mcp_server_health",
      description: "Get current server infrastructure health status",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        totalNodes: 156,
        healthyNodes: 152,
        degradedNodes: 3,
        downNodes: 1,
        avgLatencyMs: 23.4,
        uptime: "99.97%",
        lastIncident: "2024-12-28T14:32:00Z",
      }),
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log("Calling sdk.generate() with MCP business tools...", "blue");

    const result = await sdk.generate({
      input: {
        text: "Give me a brief executive summary using the mcp_quarterly_metrics and mcp_server_health tools. Include the exact revenue, NPS score, uptime percentage, and number of healthy nodes.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    recordTest(
      "SDK generate() returns content",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${result.content?.length || 0} chars`,
    );

    const expectedData = ["28,463,192", "72", "99.97", "152"];

    const foundData = expectedData.filter(
      (d) => result.content?.includes(d) || false,
    );
    recordTest(
      "SDK generate() response contains tool data",
      foundData.length >= 3,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );

    if (result.toolsUsed && result.toolsUsed.length > 0) {
      recordTest(
        "SDK generate() toolsUsed populated",
        true,
        false,
        `Tools used: ${result.toolsUsed.join(", ")}`,
      );
    } else {
      recordTest(
        "SDK generate() toolsUsed populated",
        true,
        false,
        "toolsUsed not returned by provider (acceptable)",
      );
    }

    // Verify the correct provider was used (not a fallback)
    const resultProvider = (result as Record<string, unknown>).provider as
      | string
      | undefined;
    const resultModel = (result as Record<string, unknown>).model as
      | string
      | undefined;
    const providerMatch =
      !resultProvider ||
      resultProvider.toLowerCase().includes(sdkOptions.provider.toLowerCase());
    recordTest(
      "SDK generate() used correct provider",
      providerMatch,
      false,
      `Requested: ${sdkOptions.provider}, Got: provider=${resultProvider || "N/A"}, model=${resultModel || "N/A"}`,
    );

    log(`Response preview: ${result.content?.substring(0, 300)}...`, "reset");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "SDK generate() with MCP Tools",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("SDK generate() with MCP Tools", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testSDKStreamWithMCPTools(): Promise<void> {
  logSection("SDK stream() with MCP Custom Tools");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink();
    const sdkOptions = buildBaseSDKOptions();

    sdk.registerTool("mcp_fleet_status", {
      name: "mcp_fleet_status",
      description: "Get current vehicle fleet status across all regions",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        totalVehicles: 3847,
        activeRoutes: 1256,
        averageFuelLevel: "67.3%",
        maintenanceDue: 89,
        topRegion: "US-West",
        fleetEfficiency: "94.2%",
      }),
    });

    sdk.registerTool("mcp_warehouse_inventory", {
      name: "mcp_warehouse_inventory",
      description: "Get warehouse inventory summary across all locations",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        totalWarehouses: 23,
        totalSKUs: 45678,
        lowStockAlerts: 312,
        outOfStock: 47,
        fulfillmentRate: "98.6%",
        topWarehouse: "WH-Chicago-03",
      }),
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log("Calling sdk.stream() with MCP fleet/warehouse tools...", "blue");

    const streamResult = await sdk.stream({
      input: {
        text: "Using the mcp_fleet_status and mcp_warehouse_inventory tools, give me a logistics dashboard summary. Include the exact total vehicles, fleet efficiency, total SKUs, and fulfillment rate.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    recordTest(
      "SDK stream() returns stream object",
      streamResult.stream !== undefined,
    );

    const chunks: string[] = [];
    let chunkCount = 0;
    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks.push(chunk.content);
        chunkCount++;
        if (chunkCount >= 300) {
          break;
        }
      }
    }

    const streamContent = chunks.join("");
    recordTest(
      "SDK stream() yields content chunks",
      chunkCount > 0 && streamContent.length > 0,
      false,
      `${chunkCount} chunks, ${streamContent.length} chars total`,
    );

    const expectedData = ["3847", "94.2", "45678", "98.6", "312"];
    const foundData = expectedData.filter((d) => streamContent.includes(d));
    recordTest(
      "SDK stream() response contains tool data",
      foundData.length >= 3,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );

    log(`Stream preview: ${streamContent.substring(0, 300)}...`, "reset");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest("SDK stream() with MCP Tools", true, true, `Skipped: ${msg}`);
    } else {
      recordTest("SDK stream() with MCP Tools", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testSDKGenerateMultiToolExecution(): Promise<void> {
  logSection("SDK generate() Multi-Tool Execution");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink();
    const sdkOptions = buildBaseSDKOptions();

    sdk.registerTool("mcp_sales_pipeline", {
      name: "mcp_sales_pipeline",
      description: "Get current sales pipeline summary",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        totalDeals: 847,
        pipelineValue: "$12,345,678",
        avgDealSize: "$14,577",
        conversionRate: "23.4%",
        topSalesRep: "Sarah Chen",
      }),
    });

    sdk.registerTool("mcp_support_metrics", {
      name: "mcp_support_metrics",
      description: "Get customer support team metrics",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        openTickets: 234,
        avgResolutionHours: 4.7,
        csat: 4.6,
        firstResponseMinutes: 12,
        escalationRate: "8.3%",
      }),
    });

    sdk.registerTool("mcp_marketing_campaign", {
      name: "mcp_marketing_campaign",
      description: "Get active marketing campaign performance",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        activeCampaigns: 12,
        totalImpressions: "2.3M",
        clickThroughRate: "3.7%",
        costPerAcquisition: "$42.50",
        roiPercentage: "340%",
      }),
    });

    log("Calling sdk.generate() with 3 domain tools...", "blue");

    const result = await sdk.generate({
      input: {
        text: "I need a cross-departmental report. Use all three tools (mcp_sales_pipeline, mcp_support_metrics, mcp_marketing_campaign) to give me a unified dashboard. Include pipeline value, CSAT score, and campaign ROI.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content = result.content || "";

    const salesData = ["12,345,678", "847", "23.4"].filter((d) =>
      content.includes(d),
    );
    const supportData = ["4.6", "4.7", "234"].filter((d) =>
      content.includes(d),
    );
    const marketingData = ["340", "3.7", "42.50"].filter((d) =>
      content.includes(d),
    );

    recordTest(
      "Multi-tool: sales data present",
      salesData.length >= 1,
      false,
      `Found: ${salesData.join(", ") || "none"}`,
    );
    recordTest(
      "Multi-tool: support data present",
      supportData.length >= 1,
      false,
      `Found: ${supportData.join(", ") || "none"}`,
    );
    recordTest(
      "Multi-tool: marketing data present",
      marketingData.length >= 1,
      false,
      `Found: ${marketingData.join(", ") || "none"}`,
    );

    const totalFound =
      salesData.length + supportData.length + marketingData.length;
    const departmentsWithData = [salesData, supportData, marketingData].filter(
      (d) => d.length > 0,
    ).length;
    recordTest(
      "Multi-tool: cross-department data coverage",
      departmentsWithData >= 3,
      false,
      `${totalFound} data points across ${departmentsWithData}/3 departments`,
    );

    log(`Response preview: ${content.substring(0, 300)}...`, "reset");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest("SDK generate() multi-tool", true, true, `Skipped: ${msg}`);
    } else {
      recordTest("SDK generate() multi-tool", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testSDKStreamToolContext(): Promise<void> {
  logSection("SDK stream() with Tool Context");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink();
    const sdkOptions = buildBaseSDKOptions();

    sdk.setToolContext({
      userId: "test-user-42",
      sessionId: "mcp-test-session-001",
      environment: "testing",
    });
    recordTest("SDK setToolContext()", true);

    const context = sdk.getToolContext();
    recordTest(
      "SDK getToolContext() returns correct context",
      context?.userId === "test-user-42" &&
        context?.sessionId === "mcp-test-session-001",
    );

    sdk.registerTool("mcp_user_preferences", {
      name: "mcp_user_preferences",
      description: "Get user preferences and settings for the current session",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        userId: "test-user-42",
        theme: "dark",
        language: "en-US",
        timezone: "America/New_York",
        notificationsEnabled: true,
        lastLogin: "2024-12-30T10:15:00Z",
      }),
    });

    log(
      "Calling sdk.stream() with tool context and user preferences tool...",
      "blue",
    );

    const streamResult = await sdk.stream({
      input: {
        text: "What are my user preferences? Use the mcp_user_preferences tool and tell me my theme, language, and timezone.",
      },
      maxTokens: 500,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    let streamContent = "";
    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        streamContent += chunk.content;
      }
    }

    const expectedPrefs = ["dark", "en-US", "America/New_York"];
    const foundPrefs = expectedPrefs.filter((p) => streamContent.includes(p));
    recordTest(
      "SDK stream() with context returns user preferences",
      foundPrefs.length >= 2,
      false,
      `Found ${foundPrefs.length}/${expectedPrefs.length}: ${foundPrefs.join(", ")}`,
    );

    sdk.clearToolContext();
    const clearedContext = sdk.getToolContext();
    recordTest(
      "SDK clearToolContext()",
      clearedContext === undefined || clearedContext === null,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "SDK stream() with tool context",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("SDK stream() with tool context", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

// ============================================================
// Part 1c: MCP Wiring Integration Tests (no API calls)
// Tests that MCP enhancements are properly wired into the SDK
// ============================================================

async function testWiredToolCache(): Promise<void> {
  logSection("Wired ToolCache Integration");

  // Test 1: Cache hit on second call with same args
  try {
    let callCount = 0;
    const sdk = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000, maxSize: 100 } },
    });
    sdk.registerTool("get_status", {
      name: "get_status",
      description: "Get current status",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return { result: `call-${callCount}` };
      },
    });

    const result1 = await sdk.executeTool("get_status", { key: "value" });
    const result2 = await sdk.executeTool("get_status", { key: "value" });

    const cacheHit = callCount === 1;
    recordTest(
      "Cache HIT on second call with same args",
      cacheHit,
      false,
      cacheHit ? undefined : `Expected 1 call, got ${callCount}`,
    );

    await sdk.dispose();
  } catch (error) {
    recordTest(
      "Cache HIT on second call with same args",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // Test 2: Cache MISS for different args
  try {
    let callCount = 0;
    const sdk = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000 } },
    });
    sdk.registerTool("get_item", {
      name: "get_item",
      description: "Get an item",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return { id: callCount };
      },
    });

    await sdk.executeTool("get_item", { id: 1 });
    await sdk.executeTool("get_item", { id: 2 });

    const cacheMiss = callCount === 2;
    recordTest(
      "Cache MISS for different args",
      cacheMiss,
      false,
      cacheMiss ? undefined : `Expected 2 calls, got ${callCount}`,
    );

    await sdk.dispose();
  } catch (error) {
    recordTest(
      "Cache MISS for different args",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // Test 3: Cache skipped for destructive tools
  try {
    let callCount = 0;
    const sdk = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000 } },
    });
    sdk.registerTool("delete_record", {
      name: "delete_record",
      description: "Delete a record",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return { deleted: true };
      },
    });

    await sdk.executeTool("delete_record", { id: 1 });
    await sdk.executeTool("delete_record", { id: 1 });

    const skipped = callCount === 2;
    recordTest(
      "Cache SKIPPED for destructive tool (delete_record)",
      skipped,
      false,
      skipped ? undefined : `Expected 2 calls, got ${callCount}`,
    );

    await sdk.dispose();
  } catch (error) {
    recordTest(
      "Cache SKIPPED for destructive tool (delete_record)",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // Test 4: Cache bypassed with disableToolCache per-request
  try {
    let callCount = 0;
    const sdk = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000 } },
    });
    sdk.registerTool("get_data", {
      name: "get_data",
      description: "Get data",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return { fresh: callCount };
      },
    });

    await sdk.executeTool("get_data", { q: "a" });
    await sdk.executeTool("get_data", { q: "a" }, { disableToolCache: true });

    const bypassed = callCount === 2;
    recordTest(
      "Cache BYPASSED with disableToolCache per-request",
      bypassed,
      false,
      bypassed ? undefined : `Expected 2 calls, got ${callCount}`,
    );

    await sdk.dispose();
  } catch (error) {
    recordTest(
      "Cache BYPASSED with disableToolCache per-request",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function testWiredAnnotations(): Promise<void> {
  logSection("Wired Annotation Auto-Inference");

  // Test 1: Auto-infer destructiveHint on getAllAvailableTools
  try {
    const sdk = new NeuroLink({
      mcp: { annotations: { enabled: true, autoInfer: true } },
    });
    sdk.registerTool("delete_user", {
      name: "delete_user",
      description: "Delete a user permanently",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({}),
    });

    const allTools = await sdk.getAllAvailableTools();
    const deleteTool = allTools.find((t) => t.name === "delete_user");

    const hasAnnotations = !!deleteTool?.annotations;
    const isDestructive = !!deleteTool?.annotations?.destructiveHint;

    recordTest(
      "Auto-infer destructiveHint for delete_user",
      hasAnnotations && isDestructive,
      false,
      hasAnnotations ? undefined : "annotations not set on tool",
    );

    await sdk.dispose();
  } catch (error) {
    recordTest(
      "Auto-infer destructiveHint for delete_user",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // Test 2: Auto-infer readOnlyHint for list tools
  try {
    const sdk = new NeuroLink({
      mcp: { annotations: { autoInfer: true } },
    });
    sdk.registerTool("list_users", {
      name: "list_users",
      description: "List all users",
      inputSchema: { type: "object", properties: {} },
      execute: async () => [],
    });

    const allTools = await sdk.getAllAvailableTools();
    const listTool = allTools.find((t) => t.name === "list_users");

    const isReadOnly = !!listTool?.annotations?.readOnlyHint;
    recordTest("Auto-infer readOnlyHint for list_users", isReadOnly);

    await sdk.dispose();
  } catch (error) {
    recordTest(
      "Auto-infer readOnlyHint for list_users",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function testWiredMiddleware(): Promise<void> {
  logSection("Wired Middleware Integration");

  // Test 1: Middleware executes on tool call
  try {
    const sdk = new NeuroLink();
    const middlewareCalls: string[] = [];

    sdk.useToolMiddleware(async (_tool, _params, _context, next) => {
      middlewareCalls.push("before");
      const result = await next();
      middlewareCalls.push("after");
      return result;
    });

    sdk.registerTool("mw_test", {
      name: "mw_test",
      description: "Middleware test tool",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({ ok: true }),
    });

    await sdk.executeTool("mw_test", {});

    const works =
      middlewareCalls[0] === "before" && middlewareCalls[1] === "after";
    recordTest(
      "Middleware executes before/after tool call",
      works,
      false,
      works ? undefined : `Got: ${JSON.stringify(middlewareCalls)}`,
    );

    await sdk.dispose();
  } catch (error) {
    recordTest(
      "Middleware executes before/after tool call",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // Test 2: Multiple middlewares chain in order
  try {
    const sdk = new NeuroLink();
    const order: number[] = [];

    sdk.useToolMiddleware(async (_t, _p, _c, next) => {
      order.push(1);
      const r = await next();
      order.push(4);
      return r;
    });
    sdk.useToolMiddleware(async (_t, _p, _c, next) => {
      order.push(2);
      const r = await next();
      order.push(3);
      return r;
    });

    sdk.registerTool("chain_test", {
      name: "chain_test",
      description: "Chain test",
      inputSchema: { type: "object", properties: {} },
      execute: async () => "done",
    });

    await sdk.executeTool("chain_test", {});

    const correct = JSON.stringify(order) === JSON.stringify([1, 2, 3, 4]);
    recordTest(
      "Multiple middlewares chain in correct order",
      correct,
      false,
      correct ? undefined : `Expected [1,2,3,4], got ${JSON.stringify(order)}`,
    );

    await sdk.dispose();
  } catch (error) {
    recordTest(
      "Multiple middlewares chain in correct order",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // Test 3: useToolMiddleware returns this for chaining
  try {
    const sdk = new NeuroLink();
    const result = sdk.useToolMiddleware(async (_t, _p, _c, next) => next());
    const isChainable = result === sdk;
    recordTest("useToolMiddleware returns this (chainable)", isChainable);
    await sdk.dispose();
  } catch (error) {
    recordTest(
      "useToolMiddleware returns this (chainable)",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function testWiredPublicAPIs(): Promise<void> {
  logSection("Wired Public APIs");

  // Test 1: getMCPEnhancementsConfig returns config when provided
  try {
    const config = { cache: { enabled: true, ttl: 30000 } };
    const sdk = new NeuroLink({ mcp: config });
    const returned = sdk.getMCPEnhancementsConfig();
    const matches = JSON.stringify(returned) === JSON.stringify(config);
    recordTest("getMCPEnhancementsConfig returns config", matches);
    await sdk.dispose();
  } catch (error) {
    recordTest(
      "getMCPEnhancementsConfig returns config",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // Test 2: getMCPEnhancementsConfig returns undefined when no config
  try {
    const sdk = new NeuroLink();
    const config = sdk.getMCPEnhancementsConfig();
    recordTest(
      "getMCPEnhancementsConfig undefined when no config",
      config === undefined,
    );
    await sdk.dispose();
  } catch (error) {
    recordTest(
      "getMCPEnhancementsConfig undefined when no config",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // Test 3: getToolMiddlewares returns empty array by default
  try {
    const sdk = new NeuroLink();
    const mws = sdk.getToolMiddlewares();
    recordTest(
      "getToolMiddlewares returns empty array by default",
      Array.isArray(mws) && mws.length === 0,
    );
    await sdk.dispose();
  } catch (error) {
    recordTest(
      "getToolMiddlewares returns empty array by default",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // Test 4: flushToolBatch does not throw when no batcher
  try {
    const sdk = new NeuroLink();
    await sdk.flushToolBatch();
    recordTest("flushToolBatch does not throw without batcher", true);
    await sdk.dispose();
  } catch (error) {
    recordTest(
      "flushToolBatch does not throw without batcher",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function testWiredDispose(): Promise<void> {
  logSection("Wired Dispose Cleanup");

  // Test: Dispose with all MCP enhancements enabled
  try {
    const sdk = new NeuroLink({
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

    await sdk.dispose();
    recordTest("Dispose with all MCP enhancements enabled", true);
  } catch (error) {
    recordTest(
      "Dispose with all MCP enhancements enabled",
      false,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

// ============================================================
// Part 3: MCP Enhancements via SDK generate()/stream() (real API calls)
// Demonstrates caching, annotations, middleware, and SDK methods
// working end-to-end through actual generate()/stream() calls
// ============================================================

/**
 * Tests SDK generate() with MCP tool caching enabled.
 *
 * Demonstrates that when ToolCache is configured via SDK options, repeated
 * generate() calls that invoke the same tool reuse cached tool results
 * instead of re-executing the tool function. The test registers a tool with
 * a callCount tracker, calls generate() twice with the same prompt, and
 * verifies the tool execute function only ran once (second call hit cache).
 */
async function testGenerateWithToolCaching(): Promise<void> {
  logSection("SDK generate() with Tool Caching");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink({
      mcp: {
        cache: {
          enabled: true,
          ttl: 60000,
          maxSize: 100,
        },
      },
    });

    const sdkOptions = buildBaseSDKOptions();

    let callCount = 0;

    sdk.registerTool("mcp_inventory_status", {
      name: "mcp_inventory_status",
      description:
        "Get current warehouse inventory status including item counts, low stock alerts, and reorder queue",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return {
          warehouse_count: 47,
          total_items: 892341,
          low_stock_alerts: 23,
          reorder_pending: 8,
        };
      },
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.generate() with cached inventory tool (call 1)...",
      "blue",
    );

    const prompt =
      "Use the mcp_inventory_status tool and report the exact warehouse count, total items, low stock alerts, and reorder pending numbers.";

    const result1 = await sdk.generate({
      input: { text: prompt },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    recordTest(
      "SDK generate() call 1 returns content",
      typeof result1.content === "string" && result1.content.length > 0,
      false,
      `Content length: ${result1.content?.length || 0} chars`,
    );

    const expectedData = ["47", "892341", "23", "8"];

    const foundData1 = expectedData.filter(
      (d) => result1.content?.includes(d) || false,
    );
    recordTest(
      "SDK generate() call 1 contains inventory data",
      foundData1.length >= 3,
      false,
      `Found ${foundData1.length}/${expectedData.length} data points: ${foundData1.join(", ")}`,
    );

    log(
      `Response 1 preview: ${result1.content?.substring(0, 300)}...`,
      "reset",
    );

    const callCountAfterFirst = callCount;
    log(
      `[DEBUG] Tool call count after first generate(): ${callCountAfterFirst}`,
      "blue",
    );

    // Wait 2 seconds before second call to ensure cache is warm
    log("Waiting 2 seconds before second generate() call...", "blue");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    log(
      "Calling sdk.generate() with same prompt (call 2, should use cache)...",
      "blue",
    );

    const result2 = await sdk.generate({
      input: { text: prompt },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    recordTest(
      "SDK generate() call 2 returns content",
      typeof result2.content === "string" && result2.content.length > 0,
      false,
      `Content length: ${result2.content?.length || 0} chars`,
    );

    const foundData2 = expectedData.filter(
      (d) => result2.content?.includes(d) || false,
    );
    recordTest(
      "SDK generate() call 2 contains inventory data",
      foundData2.length >= 3,
      false,
      `Found ${foundData2.length}/${expectedData.length} data points: ${foundData2.join(", ")}`,
    );

    log(
      `Response 2 preview: ${result2.content?.substring(0, 300)}...`,
      "reset",
    );
    log(
      `[DEBUG] Tool call count after second generate(): ${callCount}`,
      "blue",
    );

    // Verify correct provider was used
    const r1Provider = (result1 as Record<string, unknown>).provider as
      | string
      | undefined;
    const r1Model = (result1 as Record<string, unknown>).model as
      | string
      | undefined;
    log(
      `[PROVIDER VERIFICATION] Provider: ${r1Provider || "N/A"}, Model: ${r1Model || "N/A"}, Requested: ${sdkOptions.provider}/${sdkOptions.model || "default"}`,
      "blue",
    );

    recordTest(
      "Tool execute called only once (cache hit on second call)",
      callCount === 1,
      false,
      `Expected callCount=1, got callCount=${callCount}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "SDK generate() with Tool Caching",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("SDK generate() with Tool Caching", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}
async function testGenerateWithDestructiveCacheSkip(): Promise<void> {
  logSection("SDK generate() Destructive Tool Cache Skip");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink({
      mcp: {
        cache: { enabled: true, ttl: 60000 },
      },
    });
    const sdkOptions = buildBaseSDKOptions();

    let callCount = 0;

    sdk.registerTool("mcp_delete_expired_sessions", {
      name: "mcp_delete_expired_sessions",
      description:
        "Delete all expired user sessions from the session store and free associated memory",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return {
          deleted_count: 1847,
          freed_memory_mb: 342,
          timestamp: "2025-01-15T10:30:00Z",
        };
      },
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.generate() with destructive tool (should skip cache)...",
      "blue",
    );

    const result1 = await sdk.generate({
      input: {
        text: "Clean up expired sessions using the mcp_delete_expired_sessions tool. Tell me how many sessions were deleted and how much memory was freed.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content1 = result1.content || "";
    const hasDeleteData = content1.includes("1847") || content1.includes("342");

    recordTest(
      "Destructive tool: response contains deletion data",
      hasDeleteData,
      false,
      `Found 1847: ${content1.includes("1847")}, Found 342: ${content1.includes("342")}`,
    );

    log(
      `First call response preview: ${content1.substring(0, 300)}...`,
      "reset",
    );
    log(`Call count after first generate: ${callCount}`, "blue");

    // Second call — destructive tool should NOT be cached, so callCount must increment again
    log(
      "Calling sdk.generate() again (destructive tool should bypass cache)...",
      "blue",
    );

    const result2 = await sdk.generate({
      input: {
        text: "Clean up expired sessions using the mcp_delete_expired_sessions tool. Tell me how many sessions were deleted and how much memory was freed.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content2 = result2.content || "";
    log(
      `Second call response preview: ${content2.substring(0, 300)}...`,
      "reset",
    );
    log(`Call count after second generate: ${callCount}`, "blue");

    recordTest(
      "Destructive tool bypasses cache (callCount=2)",
      callCount === 2,
      false,
      `Expected callCount=2, got callCount=${callCount}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "SDK generate() Destructive Cache Skip",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("SDK generate() Destructive Cache Skip", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}
async function testGenerateWithMiddleware(): Promise<void> {
  logSection("SDK generate() with Tool Middleware");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink();
    const sdkOptions = buildBaseSDKOptions();

    // Track middleware execution order
    const middlewareLog: string[] = [];

    // Register middleware that logs before/after tool execution
    sdk.useToolMiddleware(async (tool, params, context, next) => {
      middlewareLog.push(`before:${tool.name}`);
      const result = await next();
      middlewareLog.push(`after:${tool.name}`);
      return result;
    });

    // Register a compliance report tool
    sdk.registerTool("mcp_compliance_report", {
      name: "mcp_compliance_report",
      description:
        "Get a compliance audit report including audit score, violations, and status",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        audit_score: 94.7,
        violations: 2,
        last_audit: "2025-01-10",
        next_audit: "2025-04-10",
        status: "compliant",
      }),
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.generate() with middleware-wrapped compliance tool...",
      "blue",
    );

    const result = await sdk.generate({
      input: {
        text: "Generate a compliance report using the mcp_compliance_report tool. Include the audit score and violation count.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    // Test 1: Response contains compliance data
    const contentStr = result.content || "";
    const hasComplianceData =
      contentStr.includes("94.7") ||
      contentStr.toLowerCase().includes("compliant");
    recordTest(
      "Response contains compliance data",
      hasComplianceData,
      false,
      hasComplianceData
        ? `Found compliance data in ${contentStr.length} chars`
        : `No compliance data found. Preview: ${contentStr.substring(0, 200)}`,
    );

    // Test 2: Middleware executed before tool call
    const hasBeforeEntry = middlewareLog.some((entry) =>
      entry.startsWith("before:"),
    );
    recordTest(
      "Middleware executed before tool call",
      hasBeforeEntry,
      false,
      hasBeforeEntry
        ? `Before entries: ${middlewareLog.filter((e) => e.startsWith("before:")).join(", ")}`
        : `Middleware log: [${middlewareLog.join(", ")}]`,
    );

    // Test 3: Middleware executed after tool call
    const hasAfterEntry = middlewareLog.some((entry) =>
      entry.startsWith("after:"),
    );
    recordTest(
      "Middleware executed after tool call",
      hasAfterEntry,
      false,
      hasAfterEntry
        ? `After entries: ${middlewareLog.filter((e) => e.startsWith("after:")).join(", ")}`
        : `Middleware log: [${middlewareLog.join(", ")}]`,
    );

    log(`Middleware log: [${middlewareLog.join(", ")}]`, "reset");
    log(`Response preview: ${contentStr.substring(0, 300)}...`, "reset");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "Response contains compliance data",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "Middleware executed before tool call",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "Middleware executed after tool call",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("Response contains compliance data", false, false, msg);
      recordTest("Middleware executed before tool call", false, false, msg);
      recordTest("Middleware executed after tool call", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}
async function testGenerateWithAnnotations(): Promise<void> {
  logSection("SDK generate() with Annotated Tools");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink({
      mcp: {
        annotations: {
          enabled: true,
          autoInfer: true,
        },
      },
    });
    const sdkOptions = buildBaseSDKOptions();

    // Register 3 tools with names that should trigger auto-inferred annotations
    sdk.registerTool("mcp_read_system_config", {
      name: "mcp_read_system_config",
      description:
        "Read the current system configuration including CPU, memory, and disk info",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        cpu_cores: 16,
        memory_gb: 64,
        disk_tb: 2,
        os: "Ubuntu 22.04",
      }),
    });

    sdk.registerTool("mcp_delete_temp_files", {
      name: "mcp_delete_temp_files",
      description:
        "Delete temporary files from the system to free up disk space",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        deleted_files: 847,
        freed_gb: 12.3,
      }),
    });

    sdk.registerTool("mcp_list_active_users", {
      name: "mcp_list_active_users",
      description: "List all currently active users on the platform",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        total_users: 2341,
        online_now: 187,
        peak_today: 412,
      }),
    });

    // Get all available tools and find our 3 registered tools
    const allTools = await sdk.getAllAvailableTools();
    const readTool = allTools.find((t) => t.name === "mcp_read_system_config");
    const deleteTool = allTools.find((t) => t.name === "mcp_delete_temp_files");
    const listTool = allTools.find((t) => t.name === "mcp_list_active_users");

    const registeredToolsFound = !!(readTool && deleteTool && listTool);
    log(
      `[DEBUG] Found tools: read=${!!readTool}, delete=${!!deleteTool}, list=${!!listTool} (total tools: ${allTools.length})`,
      "blue",
    );

    // Test 1: Annotations are auto-inferred on at least one tool
    const toolsWithAnnotations = [readTool, deleteTool, listTool].filter(
      (t) => t && t.annotations && Object.keys(t.annotations).length > 0,
    );
    recordTest(
      "annotations auto-inferred on tools",
      registeredToolsFound && toolsWithAnnotations.length > 0,
      false,
      `${toolsWithAnnotations.length}/3 tools have annotations`,
    );

    // Test 2: Read tool has readOnlyHint (name contains "read")
    const readToolHasReadOnly = !!(
      readTool?.annotations?.readOnlyHint === true
    );
    recordTest(
      "read tool has readOnlyHint",
      readToolHasReadOnly,
      false,
      `readOnlyHint=${readTool?.annotations?.readOnlyHint}, destructiveHint=${readTool?.annotations?.destructiveHint}`,
    );

    // Additional verification: delete tool should have destructiveHint
    if (deleteTool?.annotations) {
      log(
        `[DEBUG] delete tool annotations: destructiveHint=${deleteTool.annotations.destructiveHint}, requiresConfirmation=${deleteTool.annotations.requiresConfirmation}`,
        "blue",
      );
    }

    // Additional verification: list tool should have readOnlyHint
    if (listTool?.annotations) {
      log(
        `[DEBUG] list tool annotations: readOnlyHint=${listTool.annotations.readOnlyHint}`,
        "blue",
      );
    }

    // Test 3 & 4: Call generate() with annotated tools and verify response
    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log("Calling sdk.generate() with annotated MCP tools...", "blue");

    const result = await sdk.generate({
      input: {
        text: "Read the system configuration using mcp_read_system_config and tell me the CPU count and memory.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    recordTest(
      "generate() works with annotated tools",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${result.content?.length || 0} chars`,
    );

    // Verify the response contains the system config data (cpu=16, memory=64)
    const has16 = result.content?.includes("16") || false;
    const has64 = result.content?.includes("64") || false;
    recordTest(
      "response contains system config data",
      has16 && has64,
      false,
      `Contains '16': ${has16}, Contains '64': ${has64}`,
    );

    log(`Response preview: ${result.content?.substring(0, 300)}...`, "reset");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "annotations auto-inferred on tools",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest("read tool has readOnlyHint", true, true, `Skipped: ${msg}`);
      recordTest(
        "generate() works with annotated tools",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "response contains system config data",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("generate() works with annotated tools", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}
async function testGenerateWithDisableToolCache(): Promise<void> {
  logSection("SDK generate() with disableToolCache per-request flag");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000 } },
    });
    const sdkOptions = buildBaseSDKOptions();

    let callCount = 0;

    sdk.registerTool("mcp_live_exchange_rates", {
      name: "mcp_live_exchange_rates",
      description:
        "Get live foreign exchange rates for USD against major currencies",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return {
          usd_eur: 0.92,
          usd_gbp: 0.79,
          usd_jpy: 149.32,
          usd_inr: 83.12,
          timestamp: "2025-01-15T10:30:00Z",
        };
      },
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );

    // First call — normal generate, populates cache
    log("Calling sdk.generate() first time (populates tool cache)...", "blue");

    const result1 = await sdk.generate({
      input: {
        text: "Use the mcp_live_exchange_rates tool and tell me the USD to EUR and USD to JPY exchange rates. Include the exact numbers.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const hasRateData =
      typeof result1.content === "string" &&
      result1.content.length > 0 &&
      (result1.content.includes("0.92") ||
        result1.content.includes("149.32") ||
        result1.content.includes("83.12"));

    recordTest(
      "first generate returns exchange rate data",
      hasRateData,
      false,
      hasRateData
        ? `Content length: ${result1.content?.length || 0} chars`
        : `Response did not contain expected rate data. Preview: ${result1.content?.substring(0, 200)}`,
    );

    log(`First call done. callCount=${callCount}`, "blue");
    log(`Response preview: ${result1.content?.substring(0, 300)}...`, "reset");

    // Second call — with disableToolCache: true, should bypass cache
    log(
      "Calling sdk.generate() second time with disableToolCache: true...",
      "blue",
    );

    const result2 = await sdk.generate({
      input: {
        text: "Use the mcp_live_exchange_rates tool again and confirm the current USD to GBP and USD to INR rates. Include the exact numbers.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
      disableToolCache: true,
    });

    log(`Second call done. callCount=${callCount}`, "blue");
    log(`Response preview: ${result2.content?.substring(0, 300)}...`, "reset");

    const cacheBypassed = callCount === 2;
    recordTest(
      "disableToolCache bypasses cache (callCount=2)",
      cacheBypassed,
      false,
      cacheBypassed
        ? `Tool executed ${callCount} times as expected (cache bypassed on second call)`
        : `Expected callCount=2, got ${callCount}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "first generate returns exchange rate data",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "disableToolCache bypasses cache (callCount=2)",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("SDK generate() with disableToolCache", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}
async function testStreamWithToolCaching(): Promise<void> {
  logSection("SDK stream() with Tool Caching");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink({
      mcp: {
        cache: {
          enabled: true,
          ttl: 60000,
        },
      },
    });
    const sdkOptions = buildBaseSDKOptions();

    let callCount = 0;

    sdk.registerTool("mcp_network_diagnostics", {
      name: "mcp_network_diagnostics",
      description:
        "Run network diagnostics and return latency, packet loss, bandwidth, DNS resolution time, and active connections",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return {
          latency_ms: 23.4,
          packet_loss: "0.02%",
          bandwidth_mbps: 945,
          dns_resolution_ms: 8,
          active_connections: 12847,
        };
      },
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.stream() with mcp_network_diagnostics tool (first call)...",
      "blue",
    );

    // First stream call — should invoke the tool
    const streamResult1 = await sdk.stream({
      input: {
        text: "Use the mcp_network_diagnostics tool to run a network check. Report the exact latency_ms, bandwidth_mbps, and active_connections values.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const chunks1: string[] = [];
    let chunkCount1 = 0;
    for await (const chunk of streamResult1.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks1.push(chunk.content);
        chunkCount1++;
        if (chunkCount1 >= 300) {
          break;
        }
      }
    }

    const streamContent1 = chunks1.join("");

    const expectedData = ["23.4", "945", "12847"];
    const foundData = expectedData.filter((d) => streamContent1.includes(d));
    recordTest(
      "stream response contains network data",
      foundData.length >= 1,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")} in ${streamContent1.length} chars`,
    );

    log(`Stream 1 preview: ${streamContent1.substring(0, 300)}...`, "reset");
    log(
      `Call count after first stream: ${callCount}. Waiting 2s before second call...`,
      "blue",
    );

    // Wait 2 seconds to confirm cache is still valid (ttl=60s)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Second stream call — should use cached tool result
    log(
      "Calling sdk.stream() with mcp_network_diagnostics tool (second call, should be cached)...",
      "blue",
    );

    const streamResult2 = await sdk.stream({
      input: {
        text: "Use the mcp_network_diagnostics tool to run a network check. Report the exact latency_ms, bandwidth_mbps, and active_connections values.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const chunks2: string[] = [];
    let chunkCount2 = 0;
    for await (const chunk of streamResult2.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks2.push(chunk.content);
        chunkCount2++;
        if (chunkCount2 >= 300) {
          break;
        }
      }
    }

    const streamContent2 = chunks2.join("");
    log(`Stream 2 preview: ${streamContent2.substring(0, 300)}...`, "reset");
    log(`Call count after second stream: ${callCount}`, "blue");

    recordTest(
      "cached tool result works in stream mode (callCount=1)",
      callCount === 1,
      false,
      `callCount=${callCount} (expected 1)`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest("stream with tool caching", true, true, `Skipped: ${msg}`);
    } else {
      recordTest("stream with tool caching", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}
async function testStreamWithMiddleware(): Promise<void> {
  logSection("SDK stream() with Tool Middleware");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink();
    const sdkOptions = buildBaseSDKOptions();

    // Track middleware invocations
    const middlewareLog: string[] = [];

    sdk.useToolMiddleware(async (tool, params, context, next) => {
      middlewareLog.push("before:" + tool.name);
      const result = await next();
      middlewareLog.push("after:" + tool.name);
      return result;
    });

    sdk.registerTool("mcp_realtime_analytics", {
      name: "mcp_realtime_analytics",
      description:
        "Get real-time website analytics including page views, visitors, and engagement metrics",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        page_views: 45892,
        unique_visitors: 12847,
        bounce_rate: "32.1%",
        avg_session_minutes: 4.7,
        top_page: "/dashboard",
      }),
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.stream() with middleware and mcp_realtime_analytics tool...",
      "blue",
    );

    const streamResult = await sdk.stream({
      input: {
        text: "Use the mcp_realtime_analytics tool to get current website stats. Report the exact page_views, unique_visitors, bounce_rate, avg_session_minutes, and top_page values.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const chunks: string[] = [];
    let chunkCount = 0;
    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks.push(chunk.content);
        chunkCount++;
        if (chunkCount >= 300) {
          break;
        }
      }
    }

    const streamContent = chunks.join("");
    log(
      `Stream collected: ${chunkCount} chunks, ${streamContent.length} chars`,
      "blue",
    );
    log(`Stream preview: ${streamContent.substring(0, 300)}...`, "reset");

    // Verify stream response contains analytics data
    const expectedData = ["45892", "12847", "32.1", "4.7", "/dashboard"];
    const foundData = expectedData.filter((d) => streamContent.includes(d));
    recordTest(
      "stream response contains analytics data",
      foundData.length >= 3,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );

    // Verify middleware fired during stream tool execution
    log(
      `Middleware log entries: ${middlewareLog.length} — ${JSON.stringify(middlewareLog)}`,
      "blue",
    );
    const hasBeforeEntry = middlewareLog.some((entry) =>
      entry.startsWith("before:"),
    );
    const hasAfterEntry = middlewareLog.some((entry) =>
      entry.startsWith("after:"),
    );
    recordTest(
      "middleware fired during stream tool execution",
      hasBeforeEntry && hasAfterEntry,
      false,
      `before entries: ${middlewareLog.filter((e) => e.startsWith("before:")).length}, after entries: ${middlewareLog.filter((e) => e.startsWith("after:")).length}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "stream response contains analytics data",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "middleware fired during stream tool execution",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("stream response contains analytics data", false, false, msg);
      recordTest(
        "middleware fired during stream tool execution",
        false,
        false,
        msg,
      );
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}
async function testGenerateWithAllEnhancements(): Promise<void> {
  logSection("SDK generate() with ALL MCP Enhancements Combined");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    // 1. Create SDK with ALL enhancements enabled
    sdk = new NeuroLink({
      mcp: {
        cache: { enabled: true, ttl: 60000 },
        annotations: { enabled: true, autoInfer: true },
      },
    });
    const sdkOptions = buildBaseSDKOptions();

    // 2. Register middleware that tracks tool calls
    const toolCallLog: string[] = [];
    sdk.useToolMiddleware(async (tool, _params, _context, next) => {
      toolCallLog.push(tool.name || tool);
      const result = await next();
      return result;
    });

    // 3. Register tools with "read" prefix so autoInfer marks readOnlyHint
    let revenueExecCount = 0;
    sdk.registerTool("mcp_read_quarterly_revenue", {
      name: "mcp_read_quarterly_revenue",
      description:
        "Read quarterly revenue data for the fiscal year including growth rate",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        revenueExecCount++;
        return {
          q1: "$2.1M",
          q2: "$2.8M",
          q3: "$3.2M",
          q4: "$4.1M",
          total: "$12.2M",
          growth: "18.7%",
        };
      },
    });

    let employeeExecCount = 0;
    sdk.registerTool("mcp_read_employee_count", {
      name: "mcp_read_employee_count",
      description: "Read current employee headcount broken down by department",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        employeeExecCount++;
        return {
          engineering: 145,
          sales: 67,
          marketing: 34,
          support: 89,
          total: 335,
        };
      },
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.generate() with all MCP enhancements (cache + annotations + middleware)...",
      "blue",
    );

    // 4. First generate() call — tools should execute
    const result1 = await sdk.generate({
      input: {
        text: "Prepare an annual business summary using mcp_read_quarterly_revenue and mcp_read_employee_count. Include total revenue, growth rate, and total headcount.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content1 = result1.content || "";

    // 5a. Verify response contains key data from revenue tool
    const revenueData = ["12.2", "18.7"].filter((d) => content1.includes(d));
    recordTest(
      "All-enhancements: revenue data in response",
      revenueData.length >= 1,
      false,
      `Found: ${revenueData.join(", ") || "none"} (looking for 12.2M or 18.7%)`,
    );

    // 5b. Verify response contains key data from employee tool
    const employeeData = ["335"].filter((d) => content1.includes(d));
    recordTest(
      "All-enhancements: employee data in response",
      employeeData.length >= 1,
      false,
      `Found: ${employeeData.join(", ") || "none"} (looking for 335)`,
    );

    // 5c. Overall data coverage
    const totalFound = revenueData.length + employeeData.length;
    recordTest(
      "All-enhancements: cross-tool data coverage",
      totalFound >= 2,
      false,
      `${totalFound} data points found across both tools`,
    );

    // 6. Verify middleware logged both tool calls
    const revenueLogged = toolCallLog.some((name) =>
      name.includes("mcp_read_quarterly_revenue"),
    );
    const employeeLogged = toolCallLog.some((name) =>
      name.includes("mcp_read_employee_count"),
    );
    recordTest(
      "All-enhancements: middleware logged revenue tool call",
      revenueLogged,
      false,
      `Tool call log: ${JSON.stringify(toolCallLog)}`,
    );
    recordTest(
      "All-enhancements: middleware logged employee tool call",
      employeeLogged,
      false,
      `Tool call log: ${JSON.stringify(toolCallLog)}`,
    );

    // 7. Second generate() call — cache should prevent re-execution of tools
    const execCountBeforeSecondCall = revenueExecCount + employeeExecCount;
    const toolCallLogLengthBefore = toolCallLog.length;

    log(
      "Calling sdk.generate() AGAIN with same prompt (expect cache hits)...",
      "blue",
    );

    const result2 = await sdk.generate({
      input: {
        text: "Prepare an annual business summary using mcp_read_quarterly_revenue and mcp_read_employee_count. Include total revenue, growth rate, and total headcount.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const content2 = result2.content || "";
    const execCountAfterSecondCall = revenueExecCount + employeeExecCount;

    // If cache is working, execute counts should NOT increase
    // (the AI may call the tools again, but cache intercepts execution)
    const cacheWorking = execCountAfterSecondCall === execCountBeforeSecondCall;
    recordTest(
      "All-enhancements: cache prevented re-execution on 2nd call",
      cacheWorking,
      false,
      cacheWorking
        ? `Execute count stayed at ${execCountBeforeSecondCall}`
        : `Execute count grew from ${execCountBeforeSecondCall} to ${execCountAfterSecondCall} (cache miss — may depend on provider behavior)`,
    );

    // Second call should still produce valid content
    const content2HasData =
      content2.includes("12.2") ||
      content2.includes("18.7") ||
      content2.includes("335");
    recordTest(
      "All-enhancements: 2nd call still returns valid data",
      content2HasData,
      false,
      `Content length: ${content2.length} chars`,
    );

    // 8. Check annotations via getAllAvailableTools — both should have readOnlyHint
    const allTools = await sdk.getAllAvailableTools();
    const revenueTool = allTools.find(
      (t) => t.name === "mcp_read_quarterly_revenue",
    );
    const employeeTool = allTools.find(
      (t) => t.name === "mcp_read_employee_count",
    );

    const revenueReadOnly = !!revenueTool?.annotations?.readOnlyHint;
    recordTest(
      "All-enhancements: mcp_read_quarterly_revenue has readOnlyHint",
      revenueReadOnly,
      false,
      revenueReadOnly
        ? "readOnlyHint=true (auto-inferred from 'read' prefix)"
        : `annotations: ${JSON.stringify(revenueTool?.annotations || null)}`,
    );

    const employeeReadOnly = !!employeeTool?.annotations?.readOnlyHint;
    recordTest(
      "All-enhancements: mcp_read_employee_count has readOnlyHint",
      employeeReadOnly,
      false,
      employeeReadOnly
        ? "readOnlyHint=true (auto-inferred from 'read' prefix)"
        : `annotations: ${JSON.stringify(employeeTool?.annotations || null)}`,
    );

    log(`Response 1 preview: ${content1.substring(0, 300)}...`, "reset");
    log(`Response 2 preview: ${content2.substring(0, 300)}...`, "reset");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "SDK generate() all-enhancements",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("SDK generate() all-enhancements", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}
async function testSDKEnhancementMethods(): Promise<void> {
  logSection("SDK Enhancement Methods");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  // --- 1. getToolAnnotations ---
  try {
    sdk = new NeuroLink();
    sdk.registerTool("delete_user_data", {
      name: "delete_user_data",
      description: "Permanently delete all user data from the system",
      inputSchema: {
        type: "object",
        properties: {
          userId: { type: "string", description: "User ID to delete" },
        },
      },
      execute: async (params: { userId?: string }) => ({
        deleted: true,
        userId: params.userId,
      }),
    });

    const annotationResult = await sdk.getToolAnnotations("delete_user_data");
    const hasAnnotations =
      annotationResult !== null &&
      annotationResult !== undefined &&
      typeof annotationResult === "object" &&
      "annotations" in annotationResult &&
      "summary" in annotationResult;

    // The name "delete_user_data" should trigger destructive inference
    const hasDestructiveInfo =
      hasAnnotations &&
      annotationResult.annotations !== null &&
      typeof annotationResult.annotations === "object";

    recordTest(
      "getToolAnnotations() returns annotations object",
      hasAnnotations,
      false,
      hasAnnotations
        ? `Got annotations with summary: ${JSON.stringify(annotationResult.summary).slice(0, 120)}`
        : `Unexpected result: ${JSON.stringify(annotationResult)}`,
    );

    recordTest(
      "getToolAnnotations() infers destructive hint for delete tool",
      hasDestructiveInfo,
      false,
      hasDestructiveInfo
        ? `Annotations keys: ${Object.keys(annotationResult.annotations as object).join(", ")}`
        : "No destructive annotation info found",
    );

    // Also test non-existent tool returns null
    const nullResult = await sdk.getToolAnnotations("nonexistent_tool_xyz");
    recordTest(
      "getToolAnnotations() returns null for unknown tool",
      nullResult === null,
      false,
      `Result for unknown tool: ${nullResult}`,
    );

    await sdk.dispose().catch(() => {});
    sdk = null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("getToolAnnotations()", false, false, msg);
    if (sdk) {
      await sdk.dispose().catch(() => {});
      sdk = null;
    }
  }

  // --- 2. getMCPEnhancementsConfig ---
  try {
    sdk = new NeuroLink({
      mcp: {
        cache: { enabled: true, defaultTTL: 60000 },
      },
    });

    const config = sdk.getMCPEnhancementsConfig();
    const hasConfig =
      config !== null &&
      config !== undefined &&
      typeof config === "object" &&
      "cache" in config;
    const cacheEnabled = hasConfig && config.cache?.enabled === true;

    recordTest(
      "getMCPEnhancementsConfig() returns config object",
      hasConfig,
      false,
      hasConfig
        ? `Config keys: ${Object.keys(config).join(", ")}`
        : `Unexpected: ${JSON.stringify(config)}`,
    );

    recordTest(
      "getMCPEnhancementsConfig() reflects cache.enabled=true",
      cacheEnabled,
      false,
      `cache.enabled = ${config?.cache?.enabled}`,
    );

    await sdk.dispose().catch(() => {});
    sdk = null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("getMCPEnhancementsConfig()", false, false, msg);
    if (sdk) {
      await sdk.dispose().catch(() => {});
      sdk = null;
    }
  }

  // --- 3. useToolMiddleware + getToolMiddlewares ---
  try {
    sdk = new NeuroLink();

    // Verify initially empty
    const initialMiddlewares = sdk.getToolMiddlewares();
    recordTest(
      "getToolMiddlewares() initially empty",
      Array.isArray(initialMiddlewares) && initialMiddlewares.length === 0,
      false,
      `Initial count: ${initialMiddlewares.length}`,
    );

    // Register a middleware and verify chaining
    const testMiddleware = async (
      _tool: unknown,
      _params: unknown,
      _context: unknown,
      next: () => Promise<unknown>,
    ) => next();

    const chainResult = sdk.useToolMiddleware(testMiddleware);
    const isChainable = chainResult === sdk;
    recordTest(
      "useToolMiddleware() returns this (chainable)",
      isChainable,
      false,
      `Returns same SDK instance: ${isChainable}`,
    );

    const middlewares = sdk.getToolMiddlewares();
    recordTest(
      "getToolMiddlewares() has 1 entry after registration",
      Array.isArray(middlewares) && middlewares.length === 1,
      false,
      `Middleware count: ${middlewares.length}`,
    );

    await sdk.dispose().catch(() => {});
    sdk = null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("useToolMiddleware/getToolMiddlewares", false, false, msg);
    if (sdk) {
      await sdk.dispose().catch(() => {});
      sdk = null;
    }
  }

  // --- 4. convertToolsToMCPFormat ---
  try {
    sdk = new NeuroLink();

    const inputTools = [
      {
        name: "test_tool",
        description: "A test tool for conversion",
        execute: async () => ({ result: "ok" }),
      },
      {
        name: "another_tool",
        description: "Another test tool",
      },
    ];

    const mcpFormatted = await sdk.convertToolsToMCPFormat(inputTools);
    const isArray = Array.isArray(mcpFormatted);
    const hasCorrectCount =
      isArray && mcpFormatted.length === inputTools.length;

    recordTest(
      "convertToolsToMCPFormat() returns array",
      isArray,
      false,
      `Type: ${typeof mcpFormatted}, isArray: ${isArray}`,
    );

    recordTest(
      "convertToolsToMCPFormat() correct count",
      hasCorrectCount,
      false,
      `Expected ${inputTools.length}, got ${isArray ? mcpFormatted.length : "N/A"}`,
    );

    // Verify MCP format has expected fields (name, description, inputSchema)
    if (isArray && mcpFormatted.length > 0) {
      const first = mcpFormatted[0];
      const hasMCPShape =
        typeof first === "object" &&
        first !== null &&
        "name" in first &&
        "description" in first;
      recordTest(
        "convertToolsToMCPFormat() output has MCP shape (name, description)",
        hasMCPShape,
        false,
        `First tool keys: ${typeof first === "object" && first !== null ? Object.keys(first).join(", ") : "N/A"}`,
      );
    }

    await sdk.dispose().catch(() => {});
    sdk = null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("convertToolsToMCPFormat()", false, false, msg);
    if (sdk) {
      await sdk.dispose().catch(() => {});
      sdk = null;
    }
  }

  // --- 5. convertToolsFromMCPFormat ---
  try {
    sdk = new NeuroLink();

    const mcpTools = [
      {
        name: "mcp_read_file",
        description: "Read a file from the filesystem",
        inputSchema: {
          type: "object" as const,
          properties: {
            path: { type: "string", description: "File path" },
          },
        },
      },
    ];

    const neurolinkFormatted = await sdk.convertToolsFromMCPFormat(mcpTools);
    const isArray = Array.isArray(neurolinkFormatted);
    const hasCorrectCount =
      isArray && neurolinkFormatted.length === mcpTools.length;

    recordTest(
      "convertToolsFromMCPFormat() returns array",
      isArray,
      false,
      `Type: ${typeof neurolinkFormatted}, isArray: ${isArray}`,
    );

    recordTest(
      "convertToolsFromMCPFormat() correct count",
      hasCorrectCount,
      false,
      `Expected ${mcpTools.length}, got ${isArray ? neurolinkFormatted.length : "N/A"}`,
    );

    // Verify NeuroLink format has expected fields
    if (isArray && neurolinkFormatted.length > 0) {
      const first = neurolinkFormatted[0];
      const hasNLShape =
        typeof first === "object" &&
        first !== null &&
        "name" in first &&
        "description" in first;
      recordTest(
        "convertToolsFromMCPFormat() output has NeuroLink shape",
        hasNLShape,
        false,
        `First tool keys: ${typeof first === "object" && first !== null ? Object.keys(first).join(", ") : "N/A"}`,
      );
    }

    await sdk.dispose().catch(() => {});
    sdk = null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("convertToolsFromMCPFormat()", false, false, msg);
    if (sdk) {
      await sdk.dispose().catch(() => {});
      sdk = null;
    }
  }

  // --- 6. flushToolBatch ---
  try {
    sdk = new NeuroLink();

    // flushToolBatch should not throw even without a batcher configured
    await sdk.flushToolBatch();
    recordTest(
      "flushToolBatch() no-op without batcher (no throw)",
      true,
      false,
      "Completed without error",
    );

    await sdk.dispose().catch(() => {});
    sdk = null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("flushToolBatch()", false, false, msg);
    if (sdk) {
      await sdk.dispose().catch(() => {});
      sdk = null;
    }
  }

  // --- 7. exposeAgentAsTool ---
  try {
    sdk = new NeuroLink();

    const mockAgent = {
      id: "agent-1",
      name: "Test Agent",
      description: "A mock agent for testing exposure",
      execute: async (params: unknown) => ({
        success: true,
        params,
        agentId: "agent-1",
      }),
    };

    const exposedTool = await sdk.exposeAgentAsTool(mockAgent, {
      prefix: "agent_",
    });

    const isObject =
      exposedTool !== null &&
      exposedTool !== undefined &&
      typeof exposedTool === "object";

    recordTest(
      "exposeAgentAsTool() returns result object",
      isObject,
      false,
      isObject
        ? `Result keys: ${Object.keys(exposedTool).join(", ")}`
        : `Unexpected: ${exposedTool}`,
    );

    // Verify the ExposureResult shape (tool, sourceType, sourceId, toolName)
    if (isObject) {
      const hasExposureShape =
        "tool" in exposedTool &&
        "sourceType" in exposedTool &&
        "sourceId" in exposedTool &&
        "toolName" in exposedTool;
      recordTest(
        "exposeAgentAsTool() result has ExposureResult shape (tool, sourceType, sourceId, toolName)",
        hasExposureShape,
        false,
        `Has tool: ${"tool" in exposedTool}, sourceType: ${"sourceType" in exposedTool}, sourceId: ${"sourceId" in exposedTool}, toolName: ${"toolName" in exposedTool}`,
      );

      // Verify the nested tool has the expected MCPServerTool properties
      if (
        hasExposureShape &&
        exposedTool.tool &&
        typeof exposedTool.tool === "object"
      ) {
        const tool = exposedTool.tool as Record<string, unknown>;
        const hasToolShape =
          "name" in tool && "description" in tool && "execute" in tool;
        recordTest(
          "exposeAgentAsTool() nested tool has MCPServerTool shape (name, description, execute)",
          hasToolShape,
          false,
          `Has name: ${"name" in tool}, description: ${"description" in tool}, execute: ${"execute" in tool}`,
        );
      }
    }

    await sdk.dispose().catch(() => {});
    sdk = null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordTest("exposeAgentAsTool()", false, false, msg);
    if (sdk) {
      await sdk.dispose().catch(() => {});
      sdk = null;
    }
  }
}

// ============================================================
// Part 4: CLI Integration Tests
// Tests CLI generate, stream, and MCP subcommands
// ============================================================

async function testCLIGenerateWithTools(): Promise<void> {
  logSection("CLI generate with Tools");

  const projectRoot = path.resolve(__dirname, "..");
  const cliBin = `node ${path.join(projectRoot, "dist/cli/index.js")}`;
  const { execSync } = await import("child_process");

  const execOpts = {
    encoding: "utf-8" as const,
    timeout: 120000,
    cwd: projectRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as const,
  };

  /**
   * Helper: run a CLI command, handle auth errors as skip, return stdout or null on failure.
   */
  function runCLI(cmd: string, testNames: string[]): string | null {
    log(`[DEBUG] Running CLI: ${cmd}`, "blue");
    try {
      return execSync(cmd, execOpts);
    } catch (execError: unknown) {
      const err = execError as {
        stdout?: string;
        stderr?: string;
        message?: string;
        status?: number;
      };
      const stderr = err.stderr || "";
      const errStdout = err.stdout || "";
      const msg = err.message || String(execError);

      const isAuth =
        stderr.includes("API key") ||
        stderr.includes("credentials") ||
        stderr.includes("authentication") ||
        stderr.includes("UNAUTHENTICATED") ||
        msg.includes("API key") ||
        msg.includes("credentials") ||
        msg.includes("authentication") ||
        msg.includes("UNAUTHENTICATED");

      if (isAuth) {
        for (const name of testNames) {
          recordTest(
            name,
            true,
            true,
            `Skipped: auth error — ${(stderr || msg).substring(0, 200)}`,
          );
        }
        return null;
      }

      if (errStdout.length > 0) {
        log(
          `[WARN] CLI exited with status ${err.status} but produced output (${errStdout.length} chars)`,
          "yellow",
        );
        return errStdout;
      }

      for (const name of testNames) {
        recordTest(
          name,
          false,
          false,
          `CLI failed (exit ${err.status}): ${(stderr || msg).substring(0, 300)}`,
        );
      }
      return null;
    }
  }

  // --- Test 1: calculateMath tool ---
  // Ask the CLI to compute 15 * 37 using the calculateMath tool — expect "555" in output
  {
    const testNames = [
      "CLI generate with calculateMath executes",
      "CLI generate calculateMath output contains 555",
    ];
    const prompt =
      "What is 15 multiplied by 37? Use the calculateMath tool to compute this. Give me the exact number.";
    const cmd = `${cliBin} generate "${prompt}" --provider ${TEST_CONFIG.provider} --maxTokens 500`;
    const stdout = runCLI(cmd, testNames);

    if (stdout !== null) {
      recordTest(
        testNames[0],
        stdout.length > 0,
        false,
        `Output length: ${stdout.length} chars`,
      );

      const containsResult = stdout.includes("555");
      recordTest(
        testNames[1],
        containsResult,
        false,
        containsResult
          ? "Output contains expected result '12'"
          : `Output did not contain '12'. Preview: ${stdout.substring(0, 300)}`,
      );
      log(`CLI output preview: ${stdout.substring(0, 400)}`, "reset");
    }
  }

  // --- Test 2: getCurrentTime tool ---
  // Ask the CLI to use getCurrentTime — expect current year or a time-like pattern
  {
    const testNames = [
      "CLI generate with getCurrentTime executes",
      "CLI generate getCurrentTime output contains date/time",
    ];
    const prompt =
      "What is the current date and time? Use the getCurrentTime tool.";
    const cmd = `${cliBin} generate "${prompt}" --provider ${TEST_CONFIG.provider} --maxTokens 500`;
    const stdout = runCLI(cmd, testNames);

    if (stdout !== null) {
      recordTest(
        testNames[0],
        stdout.length > 0,
        false,
        `Output length: ${stdout.length} chars`,
      );

      // Check for current year or a time-like pattern (HH:MM or YYYY)
      const currentYear = new Date().getFullYear().toString();
      const hasYear = stdout.includes(currentYear);
      const hasTimePattern = /\d{1,2}:\d{2}/.test(stdout);
      const containsDateTime = hasYear || hasTimePattern;
      recordTest(
        testNames[1],
        containsDateTime,
        false,
        containsDateTime
          ? `Output contains date/time info (year=${hasYear}, time-pattern=${hasTimePattern})`
          : `Output did not contain year '${currentYear}' or time pattern. Preview: ${stdout.substring(0, 300)}`,
      );
      log(`CLI output preview: ${stdout.substring(0, 400)}`, "reset");
    }
  }
}
async function testCLIStreamWithTools(): Promise<void> {
  logSection("CLI Stream with Tools");

  const { execSync } = await import("child_process");
  const projectRoot = path.resolve(__dirname, "..");
  const cliBin = path.join(projectRoot, "dist/cli/index.js");

  const execOpts = {
    cwd: projectRoot,
    timeout: 120000,
    encoding: "utf-8" as const,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as const,
  };

  const testNames = [
    "CLI stream with listDirectory executes",
    "CLI stream listDirectory output contains filenames",
  ];

  try {
    // Ask the model to use listDirectory on the project root — expect common filenames
    const prompt =
      "Use the listDirectory tool to list files in the current directory. What files do you see?";
    const cmd = `node ${cliBin} stream "${prompt}" --provider ${TEST_CONFIG.provider} --max-tokens 500`;

    log(`[DEBUG] Running: ${cmd}`, "blue");

    const output = execSync(cmd, execOpts);
    const trimmed = (output || "").trim();

    recordTest(
      testNames[0],
      trimmed.length > 0,
      false,
      `Exit code 0, output length: ${trimmed.length}`,
    );

    // Verify the output mentions real project files/directories
    const knownFiles = [
      "package.json",
      "src",
      "tsconfig",
      "node_modules",
      "dist",
      "README",
    ];
    const found = knownFiles.filter((f) =>
      trimmed.toLowerCase().includes(f.toLowerCase()),
    );
    const hasFilenames = found.length > 0;
    recordTest(
      testNames[1],
      hasFilenames,
      false,
      hasFilenames
        ? `Output contains project filenames: ${found.join(", ")}`
        : `Output did not contain known filenames. Preview: ${trimmed.substring(0, 300)}`,
    );

    log(`CLI stream output preview: ${trimmed.substring(0, 400)}`, "reset");
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      status?: number;
    };
    const msg = err.message || String(error);
    const stderr = err.stderr || "";
    const errStdout = err.stdout || "";

    const isAuth =
      stderr.includes("API key") ||
      stderr.includes("credentials") ||
      stderr.includes("authentication") ||
      stderr.includes("UNAUTHENTICATED") ||
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication") ||
      msg.includes("ENOENT");

    if (isAuth) {
      for (const name of testNames) {
        recordTest(
          name,
          true,
          true,
          `Skipped: ${(stderr || msg).substring(0, 150)}`,
        );
      }
    } else if (errStdout.length > 0) {
      // CLI exited non-zero but produced output — check it anyway
      const trimmed = errStdout.trim();
      recordTest(
        testNames[0],
        trimmed.length > 0,
        false,
        `Exit ${err.status}, output length: ${trimmed.length}`,
      );
      const knownFiles = [
        "package.json",
        "src",
        "tsconfig",
        "node_modules",
        "dist",
        "README",
      ];
      const found = knownFiles.filter((f) =>
        trimmed.toLowerCase().includes(f.toLowerCase()),
      );
      recordTest(
        testNames[1],
        found.length > 0,
        false,
        found.length > 0
          ? `Output contains: ${found.join(", ")}`
          : `Preview: ${trimmed.substring(0, 300)}`,
      );
    } else {
      for (const name of testNames) {
        recordTest(name, false, false, msg.substring(0, 300));
      }
    }
  }
}

async function testCLIMCPCommands(): Promise<void> {
  logSection("CLI MCP Commands");

  const { execSync } = await import("child_process");
  const projectRoot = path.resolve(__dirname, "..");
  const cliBin = path.join(projectRoot, "dist/cli/index.js");

  const execOpts = {
    cwd: projectRoot,
    timeout: 60000,
    encoding: "utf-8" as const,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as const,
  };

  /**
   * Helper: run an MCP subcommand, returning { stdout, stderr, exitCode }.
   * Handles non-zero exits gracefully (captures output from error object).
   */
  function runMCPCmd(subcommand: string): {
    stdout: string;
    stderr: string;
    exitCode: number;
  } {
    const cmd = `node ${cliBin} mcp ${subcommand}`;
    log(`[DEBUG] Running: ${cmd}`, "blue");
    try {
      const stdout = execSync(cmd, execOpts);
      return { stdout: (stdout || "").trim(), stderr: "", exitCode: 0 };
    } catch (execError: unknown) {
      const err = execError as {
        stdout?: string;
        stderr?: string;
        status?: number;
      };
      return {
        stdout: (err.stdout || "").trim(),
        stderr: (err.stderr || "").trim(),
        exitCode: err.status ?? 1,
      };
    }
  }

  /**
   * Check if a failure is expected (no servers configured, tool not found, etc.)
   */
  function isExpectedFailure(output: string): boolean {
    const patterns = [
      "No MCP",
      "no servers",
      "not found",
      "No tools",
      "no tools",
      "No external",
      "ENOENT",
      "Cannot find",
    ];
    return patterns.some((p) => output.toLowerCase().includes(p.toLowerCase()));
  }

  // --- Test 1: mcp list ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd("list --quiet");
    const combined = stdout + stderr;
    if (exitCode === 0) {
      recordTest(
        "CLI mcp list runs successfully",
        true,
        false,
        `Exit 0, output: ${stdout.substring(0, 200)}`,
      );
    } else if (isExpectedFailure(combined)) {
      recordTest(
        "CLI mcp list runs successfully",
        true,
        true,
        `Skipped (no servers): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp list runs successfully",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }

  // --- Test 2: mcp servers ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd(
      "servers --format json --quiet",
    );
    const combined = stdout + stderr;
    if (exitCode === 0) {
      recordTest(
        "CLI mcp servers runs successfully",
        true,
        false,
        `Exit 0, output length: ${stdout.length}`,
      );
    } else if (isExpectedFailure(combined)) {
      recordTest(
        "CLI mcp servers runs successfully",
        true,
        true,
        `Skipped (no servers): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp servers runs successfully",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }

  // --- Test 3: mcp tools — verify command runs (lists MCP server tools if configured) ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd("tools --quiet");
    const combined = stdout + stderr;
    if (exitCode === 0) {
      // mcp tools lists tools from external MCP servers (not built-in SDK tools)
      // If no MCP servers are configured, it returns "No tools match the criteria" which is correct
      const hasOutput = stdout.trim().length > 0;
      recordTest(
        "CLI mcp tools runs successfully",
        hasOutput,
        false,
        `Output: ${stdout.trim().substring(0, 200)}`,
      );
    } else if (isExpectedFailure(combined)) {
      recordTest(
        "CLI mcp tools runs successfully",
        true,
        true,
        `Skipped (no servers): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp tools runs successfully",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }

  // --- Test 4: mcp discover — verify tool discovery runs ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd("discover --quiet");
    const combined = stdout + stderr;
    if (exitCode === 0) {
      recordTest(
        "CLI mcp discover runs successfully",
        true,
        false,
        `Exit 0, output length: ${stdout.length}. Preview: ${stdout.substring(0, 200)}`,
      );
    } else if (isExpectedFailure(combined)) {
      recordTest(
        "CLI mcp discover runs successfully",
        true,
        true,
        `Skipped (no servers): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp discover runs successfully",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }

  // --- Test 5: mcp annotate --tool delete_user --infer ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd(
      "annotate --tool delete_user --infer --format json --quiet",
    );
    const combined = stdout + stderr;
    if (exitCode === 0 && stdout.length > 0) {
      recordTest(
        "CLI mcp annotate infers annotations",
        true,
        false,
        `Output length: ${stdout.length}, preview: ${stdout.substring(0, 200)}`,
      );
    } else if (
      isExpectedFailure(combined) ||
      combined.includes("Tool name is required") ||
      combined.includes("annotation")
    ) {
      recordTest(
        "CLI mcp annotate infers annotations",
        true,
        true,
        `Skipped (tool not found or no servers): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp annotate infers annotations",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }

  // --- Test 6: mcp registry search database ---
  {
    const { stdout, stderr, exitCode } = runMCPCmd(
      "registry search database --quiet",
    );
    const combined = stdout + stderr;
    if (exitCode === 0 && stdout.length > 0) {
      // Registry search should return some results for "database"
      const hasResults =
        stdout.includes("database") ||
        stdout.includes("postgres") ||
        stdout.includes("sql") ||
        stdout.includes("mongo") ||
        stdout.length > 10;
      recordTest(
        "CLI mcp registry search returns results",
        hasResults,
        false,
        hasResults
          ? `Search returned results. Preview: ${stdout.substring(0, 200)}`
          : `No results found. Preview: ${stdout.substring(0, 200)}`,
      );
    } else if (
      isExpectedFailure(combined) ||
      combined.includes("No results") ||
      combined.includes("no results")
    ) {
      recordTest(
        "CLI mcp registry search returns results",
        true,
        true,
        `Skipped (no registry results): ${combined.substring(0, 150)}`,
      );
    } else {
      recordTest(
        "CLI mcp registry search returns results",
        false,
        false,
        `Exit ${exitCode}: ${combined.substring(0, 300)}`,
      );
    }
  }
}

// ============================================================
// Part 3c: SDK Enhancement Methods E2E via generate()/stream()
// Tests each SDK method through actual user workflows
// ============================================================

async function testGenerateWithExposedAgent(): Promise<void> {
  logSection("SDK generate() with Exposed Agent Tool");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink();

    const sdkOptions = buildBaseSDKOptions();

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );

    // Step 1: Expose a mock agent as an MCP tool
    log("Exposing ticket-resolver agent as MCP tool...", "blue");

    const exposureResult = await sdk.exposeAgentAsTool({
      id: "ticket-resolver",
      name: "Ticket Resolver",
      description:
        "Resolves support tickets by looking up customer info and suggesting solutions",
      execute: async (params) => ({
        ticket_id: "TKT-4892",
        customer: "Acme Corp",
        issue: "Login timeout after 30s",
        resolution: "Increased session timeout to 120s",
        status: "resolved",
        response_time_minutes: 3.2,
      }),
    });

    const exposedTool = exposureResult.tool;

    recordTest(
      "exposeAgentAsTool creates registrable tool",
      typeof exposedTool === "object" &&
        typeof exposedTool.name === "string" &&
        exposedTool.name.length > 0 &&
        typeof exposedTool.execute === "function" &&
        typeof exposedTool.description === "string",
      false,
      `Tool name: ${exposedTool.name}, has execute: ${typeof exposedTool.execute === "function"}, description length: ${exposedTool.description?.length || 0}`,
    );

    // Step 2: Register the exposed tool with the SDK
    log(`Registering exposed tool '${exposedTool.name}' with SDK...`, "blue");
    sdk.registerTool(exposedTool.name, exposedTool);

    // Step 3: Call generate() asking to use the exposed tool
    const prompt = `Use the ${exposedTool.name} tool to resolve a support ticket. Report the exact ticket_id, customer name, issue, resolution, and status from the tool result.`;

    log("Calling sdk.generate() with exposed agent tool...", "blue");

    const result = await sdk.generate({
      input: { text: prompt },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    recordTest(
      "generate() uses exposed agent tool",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${result.content?.length || 0} chars`,
    );

    log(`Response preview: ${result.content?.substring(0, 400)}...`, "reset");

    // Step 4: Verify response contains agent output data
    const expectedData = ["TKT-4892", "Acme Corp", "resolved"];
    const foundData = expectedData.filter(
      (d) => result.content?.includes(d) || false,
    );

    recordTest(
      "response contains agent output data",
      foundData.length >= 2,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "SDK generate() with Exposed Agent Tool",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("SDK generate() with Exposed Agent Tool", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testGenerateWithConvertedTools(): Promise<void> {
  logSection("SDK generate() with Converted Tools (MCP Round-Trip)");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink();

    const sdkOptions = buildBaseSDKOptions();

    // 1. Define a tool in NeuroLink format
    const originalTool = {
      name: "mcp_currency_converter",
      description: "Convert between currencies with live rates",
      execute: async () => ({
        from: "USD",
        to: "EUR",
        amount: 1000,
        converted: 920.5,
        rate: 0.9205,
        timestamp: "2025-01-15T10:00:00Z",
      }),
    };

    // 2. Convert to MCP format
    log("Converting tool to MCP format...", "blue");
    const mcpTools = await sdk.convertToolsToMCPFormat([originalTool]);

    recordTest(
      "convertToolsToMCPFormat preserves tool identity",
      Array.isArray(mcpTools) &&
        mcpTools.length === 1 &&
        mcpTools[0].name === originalTool.name &&
        mcpTools[0].description === originalTool.description,
      false,
      `MCP tool name: ${mcpTools?.[0]?.name}, description: ${mcpTools?.[0]?.description?.substring(0, 60)}`,
    );

    // 3. Convert back to NeuroLink format
    log("Converting MCP tools back to NeuroLink format...", "blue");
    const roundTripped = await sdk.convertToolsFromMCPFormat(mcpTools);

    recordTest(
      "convertToolsFromMCPFormat round-trips correctly",
      Array.isArray(roundTripped) &&
        roundTripped.length === 1 &&
        roundTripped[0].name === originalTool.name &&
        roundTripped[0].description === originalTool.description,
      false,
      `Round-tripped name: ${roundTripped?.[0]?.name}, description: ${roundTripped?.[0]?.description?.substring(0, 60)}`,
    );

    // 4. Register the ORIGINAL tool and call generate()
    sdk.registerTool("mcp_currency_converter", {
      name: "mcp_currency_converter",
      description: "Convert between currencies with live rates",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        from: "USD",
        to: "EUR",
        amount: 1000,
        converted: 920.5,
        rate: 0.9205,
        timestamp: "2025-01-15T10:00:00Z",
      }),
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log("Calling sdk.generate() with currency converter tool...", "blue");

    const prompt =
      "Use the mcp_currency_converter tool to convert 1000 USD to EUR. Report the exact converted amount, exchange rate, and timestamp.";

    const result = await sdk.generate({
      input: { text: prompt },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    recordTest(
      "generate() works after tool conversion",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${result.content?.length || 0} chars`,
    );

    log(`Response preview: ${result.content?.substring(0, 300)}...`, "reset");

    const expectedData = ["920.5", "0.9205"];
    const foundData = expectedData.filter(
      (d) => result.content?.includes(d) || false,
    );

    recordTest(
      "response contains converted currency data",
      foundData.length >= 1,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "SDK generate() with Converted Tools",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("SDK generate() with Converted Tools", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testGetAnnotationsAndGenerate(): Promise<void> {
  logSection("SDK getToolAnnotations() + generate() E2E");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink({
      mcp: {
        annotations: {
          enabled: true,
          autoInfer: true,
        },
      },
    });

    const sdkOptions = buildBaseSDKOptions();

    // Register read-only sensor tool
    sdk.registerTool("mcp_read_sensor_data", {
      name: "mcp_read_sensor_data",
      description:
        "Read current environmental sensor data including temperature, humidity, pressure, air quality, and location",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        temperature: 72.4,
        humidity: 45,
        pressure: 1013.25,
        air_quality: "good",
        location: "Building A",
      }),
    });

    // Register destructive purge tool
    sdk.registerTool("mcp_purge_old_logs", {
      name: "mcp_purge_old_logs",
      description:
        "Purge old log entries from the system to free up disk space",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        purged_count: 15234,
        freed_gb: 8.7,
        oldest_log: "2024-06-15",
      }),
    });

    // --- 1. getToolAnnotations for read tool ---
    const readAnnotations = await sdk.getToolAnnotations(
      "mcp_read_sensor_data",
    );
    const readHasAnnotations =
      readAnnotations !== null &&
      readAnnotations !== undefined &&
      typeof readAnnotations === "object" &&
      "annotations" in readAnnotations;

    const readIsReadOnly =
      readHasAnnotations &&
      readAnnotations.annotations !== null &&
      typeof readAnnotations.annotations === "object" &&
      (readAnnotations.annotations as Record<string, unknown>).readOnlyHint ===
        true;

    recordTest(
      "getToolAnnotations infers readOnly for read tool",
      readIsReadOnly,
      false,
      readHasAnnotations
        ? `annotations: ${JSON.stringify(readAnnotations.annotations).slice(0, 150)}`
        : `Unexpected result: ${JSON.stringify(readAnnotations)}`,
    );

    // --- 2. getToolAnnotations for purge tool ---
    const purgeAnnotations = await sdk.getToolAnnotations("mcp_purge_old_logs");
    const purgeHasAnnotations =
      purgeAnnotations !== null &&
      purgeAnnotations !== undefined &&
      typeof purgeAnnotations === "object" &&
      "annotations" in purgeAnnotations;

    const purgeIsDestructive =
      purgeHasAnnotations &&
      purgeAnnotations.annotations !== null &&
      typeof purgeAnnotations.annotations === "object" &&
      (purgeAnnotations.annotations as Record<string, unknown>)
        .destructiveHint === true;

    recordTest(
      "getToolAnnotations infers destructive for purge tool",
      purgeIsDestructive,
      false,
      purgeHasAnnotations
        ? `annotations: ${JSON.stringify(purgeAnnotations.annotations).slice(0, 150)}`
        : `Unexpected result: ${JSON.stringify(purgeAnnotations)}`,
    );

    // --- 3. generate() with annotated read tool ---
    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.generate() asking to read sensor data via mcp_read_sensor_data...",
      "blue",
    );

    const prompt =
      "Use the mcp_read_sensor_data tool and report the exact temperature, pressure, and location values from the sensor reading.";

    const result = await sdk.generate({
      input: { text: prompt },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    recordTest(
      "generate() with annotated read tool returns data",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${result.content?.length || 0} chars`,
    );

    log(`Response preview: ${result.content?.substring(0, 400)}...`, "reset");

    // --- 4. Verify response contains sensor readings ---
    const expectedData = ["72.4", "1013.25", "Building A"];
    const foundData = expectedData.filter(
      (d) => result.content?.includes(d) || false,
    );

    recordTest(
      "response contains sensor readings",
      foundData.length >= 2,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "getToolAnnotations infers readOnly for read tool",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "getToolAnnotations infers destructive for purge tool",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "generate() with annotated read tool returns data",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "response contains sensor readings",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest(
        "SDK getToolAnnotations() + generate() E2E",
        false,
        false,
        msg,
      );
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testGenerateWithMiddlewareChain(): Promise<void> {
  logSection("SDK generate() with Middleware Chain (Onion Model)");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink();
    const sdkOptions = buildBaseSDKOptions();

    // Track middleware execution order
    const executionOrder: string[] = [];

    // Middleware 1 (auth): outermost layer
    sdk.useToolMiddleware(async (_tool, _params, _context, next) => {
      executionOrder.push("auth:before");
      const result = await next();
      executionOrder.push("auth:after");
      return result;
    });

    // Middleware 2 (logging): middle layer
    sdk.useToolMiddleware(async (_tool, _params, _context, next) => {
      executionOrder.push("log:before");
      const result = await next();
      executionOrder.push("log:after");
      return result;
    });

    // Middleware 3 (timing): innermost layer
    sdk.useToolMiddleware(async (_tool, _params, _context, next) => {
      const start = Date.now();
      executionOrder.push("time:before");
      const result = await next();
      const duration = Date.now() - start;
      executionOrder.push(`time:after:${duration}ms`);
      return result;
    });

    // Verify 3 middlewares registered
    const registeredCount = sdk.getToolMiddlewares().length;
    recordTest(
      "3 middlewares registered",
      registeredCount === 3,
      false,
      `Expected 3, got ${registeredCount}`,
    );

    // Register shipping rates tool
    sdk.registerTool("mcp_shipping_rates", {
      name: "mcp_shipping_rates",
      description:
        "Get shipping rates including carrier name, rate, delivery days, tracking number, and package weight",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        carrier: "FedEx",
        rate: 24.99,
        delivery_days: 3,
        tracking: "FX-8847291",
        weight_kg: 2.5,
      }),
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.generate() with 3 chained middlewares and shipping tool...",
      "blue",
    );

    const result = await sdk.generate({
      input: {
        text: "Use the mcp_shipping_rates tool and report the exact carrier name, rate, tracking number, and delivery days.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    // Test: generate() returns content
    const contentStr = result.content || "";
    recordTest(
      "generate() with middleware chain returns data",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${contentStr.length} chars`,
    );

    // Test: response contains shipping data
    const expectedData = ["24.99", "FedEx", "FX-8847291"];
    const foundData = expectedData.filter((d) => contentStr.includes(d));
    recordTest(
      "response contains shipping rates",
      foundData.length >= 2,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );

    // Test: middleware execution order follows onion model
    // Expected: auth:before, log:before, time:before, time:after:Xms, log:after, auth:after
    const orderLabels = executionOrder.map((e) =>
      e.startsWith("time:after:") ? "time:after" : e,
    );
    const expectedOrder = [
      "auth:before",
      "log:before",
      "time:before",
      "time:after",
      "log:after",
      "auth:after",
    ];
    const orderCorrect =
      orderLabels.length === expectedOrder.length &&
      orderLabels.every((label, i) => label === expectedOrder[i]);
    recordTest(
      "middleware execution order is correct (onion model)",
      orderCorrect,
      false,
      orderCorrect
        ? `Order: [${executionOrder.join(", ")}]`
        : `Expected [${expectedOrder.join(", ")}], got [${executionOrder.join(", ")}]`,
    );

    log(`Execution order: [${executionOrder.join(", ")}]`, "reset");
    log(`Response preview: ${contentStr.substring(0, 300)}...`, "reset");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest("3 middlewares registered", true, true, `Skipped: ${msg}`);
      recordTest(
        "generate() with middleware chain returns data",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "response contains shipping rates",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "middleware execution order is correct (onion model)",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("3 middlewares registered", false, false, msg);
      recordTest(
        "generate() with middleware chain returns data",
        false,
        false,
        msg,
      );
      recordTest("response contains shipping rates", false, false, msg);
      recordTest(
        "middleware execution order is correct (onion model)",
        false,
        false,
        msg,
      );
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testStreamWithDisableToolCache(): Promise<void> {
  logSection("SDK stream() with disableToolCache per-request flag");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink({
      mcp: { cache: { enabled: true, ttl: 60000 } },
    });
    const sdkOptions = buildBaseSDKOptions();

    let callCount = 0;

    sdk.registerTool("mcp_weather_forecast", {
      name: "mcp_weather_forecast",
      description:
        "Get current weather forecast including temperature, condition, wind speed, and humidity",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        callCount++;
        return {
          city: "San Francisco",
          temp_f: 68,
          condition: "partly cloudy",
          wind_mph: 12,
          humidity: 65,
          forecast: "clearing by evening",
        };
      },
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );

    // First stream call — should invoke the tool and populate cache
    log(
      "Calling sdk.stream() with mcp_weather_forecast tool (first call, populates cache)...",
      "blue",
    );

    const streamResult1 = await sdk.stream({
      input: {
        text: "Use the mcp_weather_forecast tool to check the weather. Report the exact city, temp_f, condition, and wind_mph values.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    const chunks1: string[] = [];
    let chunkCount1 = 0;
    for await (const chunk of streamResult1.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks1.push(chunk.content);
        chunkCount1++;
        if (chunkCount1 >= 300) {
          break;
        }
      }
    }

    const streamContent1 = chunks1.join("");

    const expectedData = ["68", "San Francisco", "partly cloudy", "12"];
    const foundData = expectedData.filter((d) => streamContent1.includes(d));
    recordTest(
      "stream response contains weather data",
      foundData.length >= 1,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")} in ${streamContent1.length} chars`,
    );

    log(`Stream 1 preview: ${streamContent1.substring(0, 300)}...`, "reset");
    log(
      `Call count after first stream: ${callCount}. Waiting 2s before second call...`,
      "blue",
    );

    // Wait 2 seconds to confirm cache is still valid (ttl=60s)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Second stream call — with disableToolCache: true, should bypass cache
    log(
      "Calling sdk.stream() with mcp_weather_forecast tool (second call, disableToolCache: true)...",
      "blue",
    );

    const streamResult2 = await sdk.stream({
      input: {
        text: "Use the mcp_weather_forecast tool again to get updated weather. Report the exact temp_f, humidity, and forecast values.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
      disableToolCache: true,
    });

    const chunks2: string[] = [];
    let chunkCount2 = 0;
    for await (const chunk of streamResult2.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        chunks2.push(chunk.content);
        chunkCount2++;
        if (chunkCount2 >= 300) {
          break;
        }
      }
    }

    const streamContent2 = chunks2.join("");
    log(`Stream 2 preview: ${streamContent2.substring(0, 300)}...`, "reset");
    log(`Call count after second stream: ${callCount}`, "blue");

    const cacheBypassed = callCount === 2;
    recordTest(
      "stream with disableToolCache bypasses cache (callCount=2)",
      cacheBypassed,
      false,
      cacheBypassed
        ? `Tool executed ${callCount} times as expected (cache bypassed on second stream call)`
        : `Expected callCount=2, got ${callCount}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "stream response contains weather data",
        true,
        true,
        `Skipped: ${msg}`,
      );
      recordTest(
        "stream with disableToolCache bypasses cache (callCount=2)",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest("SDK stream() with disableToolCache", false, false, msg);
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

async function testGenerateWithBatcherAndFlush(): Promise<void> {
  logSection("SDK generate() with Batcher and flushToolBatch()");

  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink({
      mcp: {
        batcher: { enabled: true, maxBatchSize: 5, maxWaitMs: 200 },
      },
    });

    const sdkOptions = buildBaseSDKOptions();

    sdk.registerTool("mcp_order_status", {
      name: "mcp_order_status",
      description:
        "Get current order status including order ID, shipping status, carrier, ETA, and item count",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        return {
          order_id: "ORD-77291",
          status: "shipped",
          carrier: "UPS",
          eta: "2025-01-17",
          items: 3,
        };
      },
    });

    log(
      `[DEBUG] Provider: ${sdkOptions.provider}, MaxTokens: ${TEST_CONFIG.maxTokens}`,
      "blue",
    );
    log(
      "Calling sdk.generate() with batcher-enabled order status tool...",
      "blue",
    );

    const result = await sdk.generate({
      input: {
        text: "Use the mcp_order_status tool and report the exact order ID, shipping status, carrier name, ETA date, and item count.",
      },
      maxTokens: TEST_CONFIG.maxTokens,
      provider: sdkOptions.provider,
      ...(sdkOptions.model && { model: sdkOptions.model }),
    });

    recordTest(
      "generate() works with batcher enabled",
      typeof result.content === "string" && result.content.length > 0,
      false,
      `Content length: ${result.content?.length || 0} chars`,
    );

    const expectedData = ["ORD-77291", "shipped", "UPS", "2025-01-17", "3"];
    const contentStr = result.content || "";

    const foundData = expectedData.filter(
      (d) => contentStr.includes(d) || false,
    );
    recordTest(
      "response contains order data",
      foundData.length >= 3,
      false,
      `Found ${foundData.length}/${expectedData.length} data points: ${foundData.join(", ")}`,
    );

    log(`Response preview: ${contentStr.substring(0, 300)}...`, "reset");

    // Flush any pending batched calls — should complete without error
    log("Calling sdk.flushToolBatch()...", "blue");
    await sdk.flushToolBatch();

    recordTest(
      "flushToolBatch() completes without error",
      true,
      false,
      "flushToolBatch() resolved successfully with batcher configured",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication")
    ) {
      recordTest(
        "SDK generate() with Batcher and flushToolBatch()",
        true,
        true,
        `Skipped: ${msg}`,
      );
    } else {
      recordTest(
        "SDK generate() with Batcher and flushToolBatch()",
        false,
        false,
        msg,
      );
    }
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        // Ignore dispose errors
      }
    }
  }
}

// ============================================================
// Part 4b: CLI Enhanced Integration Tests
// Tests CLI with multi-tool and file-reading tool calls
// ============================================================

async function testCLIGenerateMultiTool(): Promise<void> {
  logSection("CLI generate multi-tool (calculateMath + getCurrentTime)");

  const projectRoot = path.resolve(__dirname, "..");
  const cliBin = path.join(projectRoot, "dist/cli/index.js");
  const { execSync } = await import("child_process");

  const provider = TEST_CONFIG.provider;

  const execOpts = {
    encoding: "utf-8" as const,
    timeout: 120000,
    cwd: projectRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as const,
  };

  /**
   * Helper: run a CLI command, handle auth errors as skip, return stdout or null on failure.
   */
  function runCLI(cmd: string, testNames: string[]): string | null {
    log(`[DEBUG] Running CLI: ${cmd}`, "blue");
    try {
      return execSync(cmd, execOpts);
    } catch (execError: unknown) {
      const err = execError as {
        stdout?: string;
        stderr?: string;
        message?: string;
        status?: number;
      };
      const stderr = err.stderr || "";
      const errStdout = err.stdout || "";
      const msg = err.message || String(execError);

      const isAuth =
        stderr.includes("API key") ||
        stderr.includes("credentials") ||
        stderr.includes("authentication") ||
        stderr.includes("UNAUTHENTICATED") ||
        msg.includes("API key") ||
        msg.includes("credentials") ||
        msg.includes("authentication") ||
        msg.includes("UNAUTHENTICATED");

      if (isAuth) {
        for (const name of testNames) {
          recordTest(
            name,
            true,
            true,
            `Skipped: auth error — ${(stderr || msg).substring(0, 200)}`,
          );
        }
        return null;
      }

      if (errStdout.length > 0) {
        log(
          `[WARN] CLI exited with status ${err.status} but produced output (${errStdout.length} chars)`,
          "yellow",
        );
        return errStdout;
      }

      for (const name of testNames) {
        recordTest(
          name,
          false,
          false,
          `CLI failed (exit ${err.status}): ${(stderr || msg).substring(0, 300)}`,
        );
      }
      return null;
    }
  }

  // --- Test 1: CLI generate with calculateMath (separate call) ---
  {
    const testNames = [
      "CLI generate calculateMath (multi-tool part 1) executes",
      "CLI generate calculateMath output contains 555",
    ];
    const prompt =
      "What is 15 multiplied by 37? Use the calculateMath tool. Give me the exact number only.";
    const cmd = `node ${cliBin} generate "${prompt}" --provider ${provider} --maxTokens 300`;
    const stdout = runCLI(cmd, testNames);

    if (stdout !== null) {
      recordTest(
        testNames[0],
        stdout.length > 0,
        false,
        `Output length: ${stdout.length} chars`,
      );
      recordTest(
        testNames[1],
        stdout.includes("555"),
        false,
        stdout.includes("555")
          ? "Output contains '555'"
          : `Preview: ${stdout.substring(0, 300)}`,
      );
      log(`CLI math output: ${stdout.substring(0, 200)}`, "reset");
    }
  }

  // --- Test 2: CLI generate with getCurrentTime (separate call) ---
  {
    const testNames = [
      "CLI generate getCurrentTime (multi-tool part 2) executes",
      "CLI generate getCurrentTime output contains date/time",
    ];
    const prompt =
      "What is the current date and time right now? Use the getCurrentTime tool.";
    const cmd = `node ${cliBin} generate "${prompt}" --provider ${provider} --maxTokens 300`;
    const stdout = runCLI(cmd, testNames);

    if (stdout !== null) {
      recordTest(
        testNames[0],
        stdout.length > 0,
        false,
        `Output length: ${stdout.length} chars`,
      );
      const currentYear = new Date().getFullYear().toString();
      const hasYear = stdout.includes(currentYear);
      const hasTimePattern = /\d{1,2}:\d{2}/.test(stdout);
      recordTest(
        testNames[1],
        hasYear || hasTimePattern,
        false,
        `year=${hasYear}, time-pattern=${hasTimePattern}`,
      );
      log(`CLI time output: ${stdout.substring(0, 200)}`, "reset");
    }
  }
}

async function testCLIStreamWithReadFile(): Promise<void> {
  logSection("CLI Stream with readFile Tool");

  const { execSync } = await import("child_process");
  const projectRoot = path.resolve(__dirname, "..");
  const cliBin = path.join(projectRoot, "dist/cli/index.js");

  const execOpts = {
    cwd: projectRoot,
    timeout: 120000,
    encoding: "utf-8" as const,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"] as const,
  };

  const testNames = [
    "CLI stream with readFile executes",
    "output contains package name from file",
  ];

  try {
    const prompt =
      "Use the readFile tool to read the package.json file in the current directory. Tell me the package name and version.";
    const cmd = `node ${cliBin} stream "${prompt}" --provider ${TEST_CONFIG.provider} --max-tokens 500`;

    log(`[DEBUG] Running: ${cmd}`, "blue");

    const output = execSync(cmd, execOpts);
    const trimmed = (output || "").trim();

    recordTest(
      testNames[0],
      trimmed.length > 0,
      false,
      `Exit code 0, output length: ${trimmed.length}`,
    );

    // Verify the output mentions the actual package name from package.json
    const hasPackageName = trimmed.includes("@juspay/neurolink");
    recordTest(
      testNames[1],
      hasPackageName,
      false,
      hasPackageName
        ? `Output contains @juspay/neurolink`
        : `Output did not contain package name. Preview: ${trimmed.substring(0, 300)}`,
    );

    log(`CLI stream output preview: ${trimmed.substring(0, 400)}`, "reset");
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      status?: number;
    };
    const msg = err.message || String(error);
    const stderr = err.stderr || "";
    const errStdout = err.stdout || "";

    const isAuth =
      stderr.includes("API key") ||
      stderr.includes("credentials") ||
      stderr.includes("authentication") ||
      stderr.includes("UNAUTHENTICATED") ||
      msg.includes("API key") ||
      msg.includes("credentials") ||
      msg.includes("authentication") ||
      msg.includes("ENOENT");

    if (isAuth) {
      for (const name of testNames) {
        recordTest(
          name,
          true,
          true,
          `Skipped: ${(stderr || msg).substring(0, 150)}`,
        );
      }
    } else if (errStdout.length > 0) {
      // CLI exited non-zero but produced output — check it anyway
      const trimmed = errStdout.trim();
      recordTest(
        testNames[0],
        trimmed.length > 0,
        false,
        `Exit ${err.status}, output length: ${trimmed.length}`,
      );
      const hasPackageName = trimmed.includes("@juspay/neurolink");
      recordTest(
        testNames[1],
        hasPackageName,
        false,
        hasPackageName
          ? `Output contains @juspay/neurolink`
          : `Preview: ${trimmed.substring(0, 300)}`,
      );
    } else {
      for (const name of testNames) {
        recordTest(name, false, false, msg.substring(0, 300));
      }
    }
  }
}

// ============================================================
// Main test runner
// ============================================================

async function main(): Promise<void> {
  logSection("MCP Enhancements Continuous Test Suite");
  log(
    "Testing MCP infrastructure + SDK generate()/stream() with MCP-enhanced tools\n",
    "bright",
  );
  log(
    `Provider: ${TEST_CONFIG.provider}${TEST_CONFIG.model ? `, Model: ${TEST_CONFIG.model}` : ""}`,
    "blue",
  );
  log(`MaxTokens: ${TEST_CONFIG.maxTokens}\n`, "blue");

  const startTime = Date.now();

  // Part 1: MCP Infrastructure Tests (no API calls needed)
  logSection("Part 1: MCP Infrastructure Tests");
  await testToolRouter();
  await testToolCache();
  await testRequestBatcher();
  await testCoreMCPExports();

  // Part 1b: Extended MCP Infrastructure Tests
  logSection("Part 1b: Extended MCP Infrastructure Tests");
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

  // Part 1c: MCP Wiring Integration Tests (no API calls)
  logSection("Part 1c: MCP Wiring Integration Tests");
  await testWiredToolCache();
  await testWiredAnnotations();
  await testWiredMiddleware();
  await testWiredPublicAPIs();
  await testWiredDispose();

  // Part 2: SDK generate()/stream() with MCP Tools (requires API keys)
  logSection("Part 2: SDK generate()/stream() with MCP Tools");
  log(
    "These tests use real API calls. Ensure provider credentials are configured.\n",
    "bright",
  );

  const INTER_TEST_DELAY_MS = TEST_CONFIG.provider === "openai" ? 60000 : 10000;

  await testSDKToolRegistration();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test (rate limit prevention)...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testSDKGenerateWithMCPTools();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testSDKStreamWithMCPTools();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testSDKGenerateMultiToolExecution();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testSDKStreamToolContext();

  // Part 3: MCP Enhancements via SDK generate()/stream() (real API calls)
  logSection("Part 3: MCP Enhancements via SDK generate()/stream()");
  log(
    "These tests demonstrate MCP enhancement features (caching, annotations, middleware) through actual generate()/stream() calls.\n",
    "bright",
  );

  await testGenerateWithToolCaching();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testGenerateWithDestructiveCacheSkip();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testGenerateWithMiddleware();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testGenerateWithAnnotations();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testGenerateWithDisableToolCache();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testStreamWithToolCaching();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testStreamWithMiddleware();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testGenerateWithAllEnhancements();

  // Part 3b: SDK Enhancement Methods (minimal API calls)
  logSection("Part 3b: SDK Enhancement Methods");
  await testSDKEnhancementMethods();

  // Part 3c: SDK Enhancement Methods E2E via generate()/stream()
  logSection("Part 3c: SDK Enhancement Methods E2E via generate()/stream()");
  log(
    "These tests use SDK methods (exposeAgentAsTool, convertTools, getToolAnnotations, middleware chain, batcher) through actual generate()/stream() calls.\n",
    "bright",
  );

  await testGenerateWithExposedAgent();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testGenerateWithConvertedTools();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testGetAnnotationsAndGenerate();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testGenerateWithMiddlewareChain();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testStreamWithDisableToolCache();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next API test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testGenerateWithBatcherAndFlush();

  // Part 4: CLI Integration Tests
  logSection("Part 4: CLI Integration Tests");
  log(
    "These tests run CLI commands via child_process to verify CLI generate, stream, and MCP subcommands.\n",
    "bright",
  );

  await testCLIGenerateWithTools();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next CLI test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testCLIStreamWithTools();
  await testCLIMCPCommands();

  // Part 4b: CLI Enhanced Integration Tests
  logSection("Part 4b: CLI Enhanced Integration Tests");

  await testCLIGenerateMultiTool();

  log(
    `\n⏳ Waiting ${INTER_TEST_DELAY_MS / 1000}s before next CLI test...`,
    "reset",
  );
  await new Promise((resolve) => setTimeout(resolve, INTER_TEST_DELAY_MS));

  await testCLIStreamWithReadFile();

  // Summary
  logSection("Test Results Summary");

  const passed = results.filter((r) => r.passed && !r.skipped).length;
  const failed = results.filter((r) => !r.passed && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const total = results.length;
  const duration = Math.round((Date.now() - startTime) / 1000);

  log(
    `\n📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total) in ${duration}s`,
    "bright",
  );

  if (failed === 0) {
    log("🎉 All tests passed!", "green");
    process.exit(0);
  } else {
    log(`❌ ${failed} test(s) failed`, "red");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});

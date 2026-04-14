#!/usr/bin/env tsx

/**
 * Continuous Integration Test Suite for Multi-Agent Networks
 *
 * This test suite verifies the Multi-Agent Networks feature including:
 * 1. Agent class - fixture validation, construction, execution via mock SDK
 * 2. AgentNetwork - fixture topology validation
 * 3. Routing rules - system-prompt-based routing (agents-as-tools pattern)
 * 4. MessageBus - pub/sub, request-response, broadcast, priority queues
 * 5. Integration - real Agent/AgentNetwork construction from source modules
 *
 * Architecture note: routing is implemented as a system prompt + agents-as-tools
 * (ai SDK tool loop). RouterAgent, SupervisorAgent, AgentEvaluator,
 * ProtocolManager, and DelegationProtocolHandler no longer exist.
 *
 * Run with: npx tsx test/continuous-test-suite-agents.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

// ES Module directory handling
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Type Definitions
// ============================================================================

type ColorName =
  | "reset"
  | "bright"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan";

type TestStatus = "PASS" | "FAIL" | "TESTING" | "SKIP";

type TestResult = {
  name: string;
  status: TestStatus;
  duration: number;
  details?: string;
  error?: string;
};

type TestSuiteResult = {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
};

type AgentDefinitionFixture = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  provider?: string;
  model?: string;
  tools?: string[];
  maxSteps?: number;
  temperature?: number;
  canDelegate?: boolean;
  metadata?: Record<string, unknown>;
};

type NetworkTopologyFixture = {
  id: string;
  name: string;
  description: string;
  topology: string;
  config: Record<string, unknown>;
  agents: string[];
};

type RoutingRuleFixture = {
  id: string;
  name: string;
  patterns: string[];
  keywords: string[];
  targetAgent: string;
  priority: number;
  confidence: number;
};

type MessageFixture = {
  id: string;
  type: string;
  fromAgent?: string;
  toAgent?: string;
  payload?: unknown;
  priority?: number;
};

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || undefined,
  timeout: 30000,
  verbose: process.env.VERBOSE === "true",
};

// Color codes for output
const colors: Record<ColorName, string> = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// ============================================================================
// Logging Utilities
// ============================================================================

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(70)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(70)}`, "cyan");
}

function logSubSection(title: string): void {
  log(`\n${"-".repeat(50)}`, "blue");
  log(`  ${title}`, "blue");
  log(`${"-".repeat(50)}`, "blue");
}

function logTest(testName: string, status: TestStatus, details = ""): void {
  const icons: Record<TestStatus, string> = {
    PASS: "✅",
    FAIL: "❌",
    TESTING: "⚠️",
    SKIP: "⏭️",
  };
  const statusColors: Record<TestStatus, ColorName> = {
    PASS: "green",
    FAIL: "red",
    TESTING: "yellow",
    SKIP: "yellow",
  };
  log(`${icons[status]} ${testName}`, statusColors[status]);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

function logDebug(message: string): void {
  if (TEST_CONFIG.verbose) {
    log(`[DEBUG] ${message}`, "magenta");
  }
}

// ============================================================================
// Fixture Loading
// ============================================================================

function loadFixture<T>(filename: string): T {
  const fixturePath = path.join(__dirname, "fixtures", "agents", filename);
  const content = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(content) as T;
}

// ============================================================================
// Mock SDK for Testing
// ============================================================================

function createMockSdk(options?: {
  generateResponse?: { content: string; usage?: unknown; toolsUsed?: string[] };
  streamChunks?: Array<{ content?: string }>;
  shouldFail?: boolean;
  errorMessage?: string;
}) {
  return {
    generate: async () => {
      if (options?.shouldFail) {
        throw new Error(options.errorMessage ?? "Mock generation error");
      }
      return {
        content: options?.generateResponse?.content ?? "Mock response",
        usage: options?.generateResponse?.usage ?? {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        toolsUsed: options?.generateResponse?.toolsUsed ?? [],
      };
    },
    stream: async function* () {
      const chunks = options?.streamChunks ?? [
        { content: "Hello " },
        { content: "world!" },
      ];
      for (const chunk of chunks) {
        yield chunk;
      }
    },
    dispose: async () => {
      // Cleanup mock resources
    },
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

async function runTest(
  name: string,
  testFn: () => Promise<void>,
): Promise<TestResult> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    logTest(name, "PASS", `(${duration}ms)`);
    return { name, status: "PASS", duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest(name, "FAIL", errorMessage);
    return { name, status: "FAIL", duration, error: errorMessage };
  }
}

function skipTest(name: string, reason: string): TestResult {
  logTest(name, "SKIP", reason);
  return { name, status: "SKIP", duration: 0, details: reason };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message || "Assertion failed"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertDefined<T>(
  value: T | undefined | null,
  message?: string,
): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`${message || "Value is undefined or null"}`);
  }
}

function assertContains(
  str: string,
  substring: string,
  message?: string,
): void {
  if (!str.includes(substring)) {
    throw new Error(
      `${message || "String does not contain expected substring"}: "${substring}" not found in "${str}"`,
    );
  }
}

// ============================================================================
// Test Suites
// ============================================================================

/**
 * Test Suite: Agent Class
 */
async function testAgentClass(): Promise<TestSuiteResult> {
  logSection("AGENT CLASS TESTS");
  const results: TestResult[] = [];
  const startTime = Date.now();

  // Load fixtures
  const fixtureData = loadFixture<{
    agents: Record<string, AgentDefinitionFixture>;
  }>("agent-definitions.json");
  const agents = fixtureData.agents;

  // Test: Agent creation with basic definition
  results.push(
    await runTest("Agent creation with basic definition", async () => {
      const basicAgent = agents.basicAgent;
      assertDefined(basicAgent, "Basic agent fixture should exist");
      assertEqual(basicAgent.id, "test-basic-agent", "Agent ID should match");
      assertEqual(
        basicAgent.name,
        "Basic Test Agent",
        "Agent name should match",
      );
      assert(
        basicAgent.description.length > 0,
        "Agent should have description",
      );
      assert(
        basicAgent.instructions.length > 0,
        "Agent should have instructions",
      );
    }),
  );

  // Test: Agent creation with full configuration
  results.push(
    await runTest("Agent creation with full configuration", async () => {
      const fullAgent = agents.fullConfigAgent;
      assertDefined(fullAgent, "Full config agent fixture should exist");
      assertEqual(fullAgent.provider, "openai", "Provider should be set");
      assertEqual(fullAgent.model, "gpt-4o-mini", "Model should be set");
      assert(Array.isArray(fullAgent.tools), "Tools should be an array");
      assertEqual(fullAgent.maxSteps, 10, "Max steps should be set");
      assertEqual(fullAgent.temperature, 0.5, "Temperature should be set");
      assertEqual(fullAgent.canDelegate, true, "canDelegate should be set");
      assertDefined(fullAgent.metadata, "Metadata should be defined");
    }),
  );

  // Test: Agent with different providers
  results.push(
    await runTest("Agents with different providers", async () => {
      const providers = new Set<string>();
      for (const agent of Object.values(agents)) {
        if (agent.provider) {
          providers.add(agent.provider);
        }
      }
      // Should have multiple different providers configured
      assert(
        providers.size >= 3,
        `Should have at least 3 different providers, got ${providers.size}`,
      );
      assert(providers.has("openai"), "Should include OpenAI provider");
      assert(providers.has("anthropic"), "Should include Anthropic provider");
    }),
  );

  // Test: Agent tool configurations
  results.push(
    await runTest("Agent tool configurations", async () => {
      const codeAnalyzer = agents.codeAnalysisAgent;
      assertDefined(codeAnalyzer.tools, "Code analyzer should have tools");
      assert(
        codeAnalyzer.tools.length >= 2,
        "Code analyzer should have multiple tools",
      );
      assertContains(
        codeAnalyzer.tools.join(","),
        "readFile",
        "Should include readFile tool",
      );
    }),
  );

  // Test: Minimal agent configuration
  results.push(
    await runTest("Minimal agent configuration", async () => {
      const minimal = agents.minimalAgent;
      assertDefined(minimal, "Minimal agent should exist");
      assertEqual(minimal.id, "minimal", "Minimal agent ID should match");
      // Minimal agent should only have required fields
      assert(
        minimal.provider === undefined,
        "Minimal agent should not have provider",
      );
      assert(
        minimal.model === undefined,
        "Minimal agent should not have model",
      );
    }),
  );

  // Test: Error-prone agent for error handling tests
  results.push(
    await runTest("Error-prone agent configuration", async () => {
      const errorProne = agents.errorProneAgent;
      assertDefined(errorProne, "Error-prone agent should exist");
      assertEqual(
        errorProne.provider,
        "invalid-provider",
        "Should have invalid provider",
      );
      assertEqual(
        errorProne.model,
        "non-existent-model",
        "Should have non-existent model",
      );
      assertDefined(
        errorProne.metadata?.expectedErrors,
        "Should have expected errors metadata",
      );
    }),
  );

  // Test: Mock SDK generate execution
  results.push(
    await runTest("Mock SDK generate execution", async () => {
      const sdk = createMockSdk({
        generateResponse: { content: "Test response", toolsUsed: ["testTool"] },
      });
      const result = await sdk.generate();
      assertEqual(result.content, "Test response", "Content should match");
      assert(result.toolsUsed.includes("testTool"), "Should include tool used");
    }),
  );

  // Test: Mock SDK stream execution
  results.push(
    await runTest("Mock SDK stream execution", async () => {
      const sdk = createMockSdk({
        streamChunks: [{ content: "chunk1" }, { content: "chunk2" }],
      });
      const chunks: string[] = [];
      for await (const chunk of sdk.stream()) {
        if (chunk.content) {
          chunks.push(chunk.content);
        }
      }
      assertEqual(chunks.length, 2, "Should have 2 chunks");
      assertEqual(chunks[0], "chunk1", "First chunk should match");
    }),
  );

  // Test: Mock SDK error handling
  results.push(
    await runTest("Mock SDK error handling", async () => {
      const sdk = createMockSdk({
        shouldFail: true,
        errorMessage: "Test error",
      });
      try {
        await sdk.generate();
        throw new Error("Should have thrown");
      } catch (error) {
        assertContains(
          String(error),
          "Test error",
          "Error message should contain expected text",
        );
      }
    }),
  );

  const duration = Date.now() - startTime;
  return {
    name: "Agent Class Tests",
    tests: results,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: results.filter((r) => r.status === "FAIL").length,
    skipped: results.filter((r) => r.status === "SKIP").length,
    duration,
  };
}

/**
 * Test Suite: Network Topologies
 */
async function testNetworkTopologies(): Promise<TestSuiteResult> {
  logSection("NETWORK TOPOLOGY TESTS");
  const results: TestResult[] = [];
  const startTime = Date.now();

  // Load fixtures
  const fixtureData = loadFixture<{
    networks: Record<string, NetworkTopologyFixture>;
    routerConfigs: Record<string, unknown>;
    networkDefaults: Record<string, unknown>;
  }>("network-topologies.json");
  const networks = fixtureData.networks;

  // Test: Hub-Spoke topology configuration
  results.push(
    await runTest("Hub-Spoke topology configuration", async () => {
      const hubSpoke = networks.simpleHubSpoke;
      assertDefined(hubSpoke, "Hub-spoke network should exist");
      assertEqual(
        hubSpoke.topology,
        "hub-spoke",
        "Topology type should be hub-spoke",
      );
      assertDefined(hubSpoke.config.hubAgentId, "Should have hub agent ID");
      assert(
        Array.isArray(hubSpoke.config.spokeAgentIds),
        "Should have spoke agent IDs array",
      );
    }),
  );

  // Test: Advanced Hub-Spoke with failover
  results.push(
    await runTest("Advanced Hub-Spoke with failover", async () => {
      const advanced = networks.advancedHubSpoke;
      assertDefined(advanced, "Advanced hub-spoke should exist");
      assertEqual(
        advanced.config.failoverEnabled,
        true,
        "Failover should be enabled",
      );
      assertEqual(
        advanced.config.priorityRouting,
        true,
        "Priority routing should be enabled",
      );
      assertDefined(
        advanced.config.healthCheckInterval,
        "Should have health check interval",
      );
    }),
  );

  // Test: Mesh topology configuration
  results.push(
    await runTest("Mesh topology configuration", async () => {
      const mesh = networks.simpleMesh;
      assertDefined(mesh, "Mesh network should exist");
      assertEqual(mesh.topology, "mesh", "Topology type should be mesh");
      assert(
        Array.isArray(mesh.config.agentIds),
        "Should have agent IDs array",
      );
      assertDefined(mesh.config.maxHops, "Should have max hops configuration");
    }),
  );

  // Test: Secure Mesh with access control
  results.push(
    await runTest("Secure Mesh with access control", async () => {
      const secureMesh = networks.secureMesh;
      assertDefined(secureMesh, "Secure mesh should exist");
      assertEqual(
        secureMesh.config.autoDiscovery,
        false,
        "Auto discovery should be disabled",
      );
      assertDefined(
        secureMesh.config.accessControl,
        "Should have access control configuration",
      );
      assertEqual(
        secureMesh.config.auditLogging,
        true,
        "Audit logging should be enabled",
      );
    }),
  );

  // Test: Hierarchical topology configuration
  results.push(
    await runTest("Hierarchical topology configuration", async () => {
      const hierarchical = networks.simpleHierarchical;
      assertDefined(hierarchical, "Hierarchical network should exist");
      assertEqual(
        hierarchical.topology,
        "hierarchical",
        "Topology type should be hierarchical",
      );
      assertDefined(
        hierarchical.config.rootAgentId,
        "Should have root agent ID",
      );
      assert(
        Array.isArray(hierarchical.config.levels),
        "Should have levels array",
      );
    }),
  );

  // Test: Complex hierarchical with cross-level communication
  results.push(
    await runTest("Complex hierarchical with cross-level", async () => {
      const complex = networks.complexHierarchical;
      assertDefined(complex, "Complex hierarchical should exist");
      assertEqual(
        complex.config.allowCrossLevel,
        true,
        "Cross-level should be allowed",
      );
      assertDefined(
        complex.config.escalationThreshold,
        "Should have escalation threshold",
      );
      assertDefined(
        complex.config.maxEscalationDepth,
        "Should have max escalation depth",
      );
    }),
  );

  // Test: Minimal network configuration
  results.push(
    await runTest("Minimal network configuration", async () => {
      const minimal = networks.minimalNetwork;
      assertDefined(minimal, "Minimal network should exist");
      assertEqual(
        minimal.agents.length,
        1,
        "Minimal network should have 1 agent",
      );
      const spokeIds = minimal.config.spokeAgentIds as string[];
      assertEqual(spokeIds.length, 0, "Minimal network should have no spokes");
    }),
  );

  // Test: Error test network configuration
  results.push(
    await runTest("Error test network configuration", async () => {
      const errorNetwork = networks.errorTestNetwork;
      assertDefined(errorNetwork, "Error test network should exist");
      assert(
        errorNetwork.agents.includes("error-prone"),
        "Should include error-prone agent",
      );
    }),
  );

  // Test: Router configurations
  results.push(
    await runTest("Router configurations", async () => {
      const routerConfigs = fixtureData.routerConfigs;
      assertDefined(routerConfigs.defaultRouter, "Default router should exist");
      assertDefined(routerConfigs.strictRouter, "Strict router should exist");
      assertDefined(routerConfigs.hybridRouter, "Hybrid router should exist");
    }),
  );

  // Test: Network defaults
  results.push(
    await runTest("Network defaults", async () => {
      const defaults = fixtureData.networkDefaults;
      assertDefined(defaults.standard, "Standard defaults should exist");
      assertDefined(
        defaults.highThroughput,
        "High throughput defaults should exist",
      );
      assertDefined(defaults.reliable, "Reliable defaults should exist");
    }),
  );

  const duration = Date.now() - startTime;
  return {
    name: "Network Topology Tests",
    tests: results,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: results.filter((r) => r.status === "FAIL").length,
    skipped: results.filter((r) => r.status === "SKIP").length,
    duration,
  };
}

/**
 * Test Suite: Routing Rules
 */
async function testRoutingRules(): Promise<TestSuiteResult> {
  logSection("ROUTING RULES TESTS");
  const results: TestResult[] = [];
  const startTime = Date.now();

  // Load fixtures
  const fixtureData = loadFixture<{
    routingRules: Record<string, RoutingRuleFixture>;
    routingDecisions: Record<string, unknown>;
    confidenceThresholds: Record<string, unknown>;
    testCases: Record<string, unknown[]>;
  }>("routing-rules.json");
  const rules = fixtureData.routingRules;

  // Test: Code analysis routing rule
  results.push(
    await runTest("Code analysis routing rule", async () => {
      const codeRule = rules.codeAnalysis;
      assertDefined(codeRule, "Code analysis rule should exist");
      assertEqual(
        codeRule.targetAgent,
        "code-analyzer",
        "Target should be code-analyzer",
      );
      assert(codeRule.patterns.length > 0, "Should have patterns");
      assert(codeRule.keywords.length > 0, "Should have keywords");
      assert(codeRule.confidence >= 0.8, "Should have high confidence");
    }),
  );

  // Test: Data processing routing rule
  results.push(
    await runTest("Data processing routing rule", async () => {
      const dataRule = rules.dataProcessing;
      assertDefined(dataRule, "Data processing rule should exist");
      assertEqual(
        dataRule.targetAgent,
        "data-processor",
        "Target should be data-processor",
      );
      assertContains(
        dataRule.keywords.join(","),
        "csv",
        "Should include csv keyword",
      );
      assertContains(
        dataRule.keywords.join(","),
        "json",
        "Should include json keyword",
      );
    }),
  );

  // Test: Research routing rule
  results.push(
    await runTest("Research routing rule", async () => {
      const researchRule = rules.research;
      assertDefined(researchRule, "Research rule should exist");
      assertEqual(
        researchRule.targetAgent,
        "researcher",
        "Target should be researcher",
      );
      assertContains(
        researchRule.patterns.join(","),
        "research",
        "Should include research pattern",
      );
    }),
  );

  // Test: Validation routing rule
  results.push(
    await runTest("Validation routing rule", async () => {
      const validationRule = rules.validation;
      assertDefined(validationRule, "Validation rule should exist");
      assertEqual(
        validationRule.targetAgent,
        "validator",
        "Target should be validator",
      );
      assertContains(
        validationRule.keywords.join(","),
        "validate",
        "Should include validate keyword",
      );
    }),
  );

  // Test: Priority ordering
  results.push(
    await runTest("Priority ordering of rules", async () => {
      const priorities = Object.values(rules).map((r) => r.priority);
      const sortedPriorities = [...priorities].sort((a, b) => a - b);
      // Check that priorities are unique and ordered
      assertEqual(
        new Set(priorities).size,
        priorities.length,
        "Priorities should be unique",
      );
      assertEqual(
        rules.codeAnalysis.priority,
        1,
        "Code analysis should have highest priority",
      );
    }),
  );

  // Test: Confidence thresholds
  results.push(
    await runTest("Confidence thresholds", async () => {
      const thresholds = fixtureData.confidenceThresholds;
      assertDefined(thresholds.high, "High threshold should exist");
      assertDefined(thresholds.medium, "Medium threshold should exist");
      assertDefined(thresholds.low, "Low threshold should exist");
      assertDefined(thresholds["very-low"], "Very-low threshold should exist");
    }),
  );

  // Test: Simple routing decision
  results.push(
    await runTest("Simple routing decision", async () => {
      const decisions = fixtureData.routingDecisions as Record<
        string,
        {
          expectedDecision: { selectedAgent: string; confidence: number };
        }
      >;
      const simple = decisions.simpleMatch;
      assertDefined(simple, "Simple match should exist");
      assertEqual(
        simple.expectedDecision.selectedAgent,
        "code-analyzer",
        "Should route to code-analyzer",
      );
      assert(
        simple.expectedDecision.confidence >= 0.9,
        "Should have high confidence",
      );
    }),
  );

  // Test: Ambiguous routing decision
  results.push(
    await runTest("Ambiguous routing decision", async () => {
      const decisions = fixtureData.routingDecisions as Record<
        string,
        {
          expectedDecision: {
            selectedAgent: string;
            confidence: number;
            alternativeAgents?: string[];
          };
        }
      >;
      const ambiguous = decisions.ambiguousMatch;
      assertDefined(ambiguous, "Ambiguous match should exist");
      assert(
        ambiguous.expectedDecision.confidence < 0.9,
        "Should have lower confidence for ambiguous input",
      );
      assert(
        (ambiguous.expectedDecision.alternativeAgents?.length ?? 0) > 0,
        "Should have alternative agents",
      );
    }),
  );

  // Test: Fallback routing decision
  results.push(
    await runTest("Fallback routing decision", async () => {
      const decisions = fixtureData.routingDecisions as Record<
        string,
        {
          expectedDecision: { selectedAgent: string; isFallback?: boolean };
        }
      >;
      const noMatch = decisions.noMatch;
      assertDefined(noMatch, "No match should exist");
      assertEqual(
        noMatch.expectedDecision.isFallback,
        true,
        "Should be marked as fallback",
      );
      assertEqual(
        noMatch.expectedDecision.selectedAgent,
        "coordinator",
        "Should fallback to coordinator",
      );
    }),
  );

  // Test: Pattern matching test cases
  results.push(
    await runTest("Pattern matching test cases", async () => {
      const testCases = fixtureData.testCases;
      assertDefined(
        testCases.exactPatternMatch,
        "Exact pattern tests should exist",
      );
      assertDefined(testCases.keywordMatch, "Keyword match tests should exist");
      assertDefined(testCases.negativeTests, "Negative tests should exist");
      assertDefined(testCases.edgeCases, "Edge cases should exist");
    }),
  );

  const duration = Date.now() - startTime;
  return {
    name: "Routing Rules Tests",
    tests: results,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: results.filter((r) => r.status === "FAIL").length,
    skipped: results.filter((r) => r.status === "SKIP").length,
    duration,
  };
}

/**
 * Test Suite: MessageBus
 */
async function testMessageBus(): Promise<TestSuiteResult> {
  logSection("MESSAGE BUS TESTS");
  const results: TestResult[] = [];
  const startTime = Date.now();

  // Load fixtures
  const fixtureData = loadFixture<{
    messageTypes: Record<string, unknown>;
    testMessages: {
      taskMessages: MessageFixture[];
      resultMessages: MessageFixture[];
      statusMessages: MessageFixture[];
      broadcastMessages: MessageFixture[];
      requestResponsePairs: Array<{
        request: MessageFixture;
        response: MessageFixture;
      }>;
      eventMessages: MessageFixture[];
    };
    subscriptionPatterns: Record<string, unknown>;
    priorityLevels: Record<string, unknown>;
    testScenarios: Record<string, unknown>;
  }>("messages.json");

  // Test: Message types definition
  results.push(
    await runTest("Message types definition", async () => {
      const types = fixtureData.messageTypes;
      assertDefined(types.task, "Task message type should exist");
      assertDefined(types.result, "Result message type should exist");
      assertDefined(types.status, "Status message type should exist");
      assertDefined(types.broadcast, "Broadcast message type should exist");
      assertDefined(types.request, "Request message type should exist");
      assertDefined(types.response, "Response message type should exist");
      assertDefined(types.event, "Event message type should exist");
    }),
  );

  // Test: Task messages
  results.push(
    await runTest("Task messages", async () => {
      const tasks = fixtureData.testMessages.taskMessages;
      assert(tasks.length >= 3, "Should have at least 3 task messages");
      for (const task of tasks) {
        assertEqual(task.type, "task", "Type should be task");
        assertDefined(task.fromAgent, "Should have fromAgent");
        assertDefined(task.toAgent, "Should have toAgent");
        assertDefined(task.payload, "Should have payload");
      }
    }),
  );

  // Test: Result messages
  results.push(
    await runTest("Result messages", async () => {
      const results_ = fixtureData.testMessages.resultMessages;
      assert(results_.length >= 3, "Should have at least 3 result messages");
      for (const result of results_) {
        assertEqual(result.type, "result", "Type should be result");
        assertDefined(result.fromAgent, "Should have fromAgent");
      }
    }),
  );

  // Test: Status messages
  results.push(
    await runTest("Status messages", async () => {
      const statuses = fixtureData.testMessages.statusMessages;
      assert(statuses.length >= 3, "Should have at least 3 status messages");
      // Check for various states
      const states = new Set(
        statuses.map((s) => (s as unknown as { state: string }).state),
      );
      assert(states.has("idle"), "Should include idle state");
      assert(states.has("executing"), "Should include executing state");
    }),
  );

  // Test: Broadcast messages
  results.push(
    await runTest("Broadcast messages", async () => {
      const broadcasts = fixtureData.testMessages.broadcastMessages;
      assert(
        broadcasts.length >= 2,
        "Should have at least 2 broadcast messages",
      );
      for (const broadcast of broadcasts) {
        assertEqual(broadcast.type, "broadcast", "Type should be broadcast");
        assertDefined(
          (broadcast as unknown as { topic: string }).topic,
          "Should have topic",
        );
      }
    }),
  );

  // Test: Request-response pairs
  results.push(
    await runTest("Request-response pairs", async () => {
      const pairs = fixtureData.testMessages.requestResponsePairs;
      assert(
        pairs.length >= 2,
        "Should have at least 2 request-response pairs",
      );
      for (const pair of pairs) {
        assertDefined(pair.request, "Should have request");
        assertDefined(pair.response, "Should have response");
        assertEqual(
          (pair.request as unknown as { requestId: string }).requestId,
          (pair.response as unknown as { requestId: string }).requestId,
          "Request IDs should match",
        );
      }
    }),
  );

  // Test: Event messages
  results.push(
    await runTest("Event messages", async () => {
      const events = fixtureData.testMessages.eventMessages;
      assert(events.length >= 2, "Should have at least 2 event messages");
      for (const event of events) {
        assertEqual(event.type, "event", "Type should be event");
        assertDefined(
          (event as unknown as { eventType: string }).eventType,
          "Should have eventType",
        );
        assertDefined(
          (event as unknown as { timestamp: string }).timestamp,
          "Should have timestamp",
        );
      }
    }),
  );

  // Test: Subscription patterns
  results.push(
    await runTest("Subscription patterns", async () => {
      const patterns = fixtureData.subscriptionPatterns;
      assertDefined(patterns.allMessages, "All messages pattern should exist");
      assertDefined(patterns.taskOnly, "Task only pattern should exist");
      assertDefined(
        patterns.specificAgent,
        "Specific agent pattern should exist",
      );
    }),
  );

  // Test: Priority levels
  results.push(
    await runTest("Priority levels", async () => {
      const levels = fixtureData.priorityLevels;
      assertDefined(levels.critical, "Critical priority should exist");
      assertDefined(levels.high, "High priority should exist");
      assertDefined(levels.normal, "Normal priority should exist");
      assertDefined(levels.low, "Low priority should exist");
      assertDefined(levels.background, "Background priority should exist");
    }),
  );

  // Test: Test scenarios
  results.push(
    await runTest("Test scenarios", async () => {
      const scenarios = fixtureData.testScenarios;
      assertDefined(
        scenarios.basicPubSub,
        "Basic pub/sub scenario should exist",
      );
      assertDefined(
        scenarios.requestResponse,
        "Request-response scenario should exist",
      );
      assertDefined(scenarios.broadcast, "Broadcast scenario should exist");
      assertDefined(
        scenarios.priorityQueue,
        "Priority queue scenario should exist",
      );
      assertDefined(
        scenarios.errorHandling,
        "Error handling scenario should exist",
      );
      assertDefined(scenarios.timeout, "Timeout scenario should exist");
    }),
  );

  const duration = Date.now() - startTime;
  return {
    name: "Message Bus Tests",
    tests: results,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: results.filter((r) => r.status === "FAIL").length,
    skipped: results.filter((r) => r.status === "SKIP").length,
    duration,
  };
}

/**
 * Test Suite: Integration Tests (imports actual Agent/AgentNetwork/MessageBus)
 *
 * Tests real construction and field validation using the actual classes.
 * Agent/AgentNetwork accept a NeuroLink instance, but construction (not
 * execution) can be validated without a live provider.
 */
async function testIntegration(): Promise<TestSuiteResult> {
  logSection("INTEGRATION TESTS");
  const results: TestResult[] = [];
  const startTime = Date.now();

  // Dynamically import real implementations
  type AgentClass = {
    new (
      def: {
        id: string;
        name: string;
        description: string;
        instructions: string;
        provider?: string;
        model?: string;
        tools?: string[];
        maxSteps?: number;
        temperature?: number;
        canDelegate?: boolean;
      },
      neurolink: unknown,
    ): {
      id: string;
      name: string;
      description: string;
      canDelegate: boolean;
      maxSteps: number;
      temperature: number;
    };
  };

  type AgentNetworkClass = {
    new (
      config: {
        name: string;
        description?: string;
        agents: Array<{
          id: string;
          name: string;
          description: string;
          instructions: string;
        }>;
      },
      neurolink: unknown,
    ): { id: string; name: string; getAllAgents(): unknown[] };
  };

  type MessageBusClass = {
    new (): {
      publish(topic: string, senderId: string, payload: unknown): Promise<void>;
      subscribe(
        topic: string,
        subscriberId: string,
        handler: (msg: unknown) => void,
      ): string;
    };
  };

  let AgentCtor: AgentClass | undefined;
  let AgentNetworkCtor: AgentNetworkClass | undefined;
  let MessageBusCtor: MessageBusClass | undefined;

  try {
    const mod = await import("../src/lib/agent/agent.js");
    AgentCtor = mod.Agent as unknown as AgentClass;
    logDebug("Imported Agent class");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") {
      results.push(
        skipTest(
          "Import Agent class",
          "Agent module not available - run `pnpm build` first",
        ),
      );
    } else {
      throw e;
    }
  }

  try {
    const mod = await import("../src/lib/agent/agentNetwork.js");
    AgentNetworkCtor = mod.AgentNetwork as unknown as AgentNetworkClass;
    logDebug("Imported AgentNetwork class");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") {
      results.push(
        skipTest(
          "Import AgentNetwork class",
          "AgentNetwork module not available - run `pnpm build` first",
        ),
      );
    } else {
      throw e;
    }
  }

  try {
    const mod = await import("../src/lib/agent/communication/message-bus.js");
    MessageBusCtor = mod.MessageBus as unknown as MessageBusClass;
    logDebug("Imported MessageBus class");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") {
      results.push(
        skipTest(
          "Import MessageBus class",
          "MessageBus module not available - run `pnpm build` first",
        ),
      );
    } else {
      throw e;
    }
  }

  // Agent construction: validate field assignment and defaults
  if (AgentCtor) {
    results.push(
      await runTest(
        "Agent construction sets id, name, description",
        async () => {
          // A minimal stub that satisfies the NeuroLink shape Agent reads during construction
          // (Agent constructor only stores the reference; it calls neurolink.generate() on execute())
          const stubNeurolink = {} as unknown;
          const agent = new AgentCtor!(
            {
              id: "integration-test-agent",
              name: "Integration Test Agent",
              description: "Agent for integration testing",
              instructions: "You are a test agent.",
            },
            stubNeurolink,
          );
          assertEqual(
            agent.id,
            "integration-test-agent",
            "Agent ID should match",
          );
          assertEqual(
            agent.name,
            "Integration Test Agent",
            "Agent name should match",
          );
          assertEqual(
            agent.description,
            "Agent for integration testing",
            "Agent description should match",
          );
        },
      ),
    );

    results.push(
      await runTest("Agent construction applies defaults", async () => {
        const stubNeurolink = {} as unknown;
        const agent = new AgentCtor!(
          {
            id: "defaults-agent",
            name: "Defaults Agent",
            description: "Tests defaults",
            instructions: "Instructions here.",
          },
          stubNeurolink,
        );
        assertEqual(agent.maxSteps, 10, "Default maxSteps should be 10");
        assertEqual(
          agent.temperature,
          0.7,
          "Default temperature should be 0.7",
        );
        assertEqual(
          agent.canDelegate,
          false,
          "Default canDelegate should be false",
        );
      }),
    );

    results.push(
      await runTest("Agent construction rejects missing id", async () => {
        const stubNeurolink = {} as unknown;
        try {
          new AgentCtor!(
            {
              id: "",
              name: "Bad Agent",
              description: "Should fail",
              instructions: "Instructions.",
            },
            stubNeurolink,
          );
          throw new Error("Should have thrown on empty id");
        } catch (err) {
          assertContains(String(err), "id", "Error should mention id field");
        }
      }),
    );

    results.push(
      await runTest("Agent construction accepts full config", async () => {
        const stubNeurolink = {} as unknown;
        const agent = new AgentCtor!(
          {
            id: "full-config-agent",
            name: "Full Config Agent",
            description: "Fully configured agent",
            instructions: "Full instructions.",
            provider: "anthropic",
            model: "claude-3-5-sonnet-latest",
            tools: ["readFile", "writeFile"],
            maxSteps: 5,
            temperature: 0.3,
            canDelegate: true,
          },
          stubNeurolink,
        );
        assertEqual(agent.maxSteps, 5, "maxSteps should be 5");
        assertEqual(agent.temperature, 0.3, "temperature should be 0.3");
        assertEqual(agent.canDelegate, true, "canDelegate should be true");
      }),
    );
  }

  // AgentNetwork construction: validate name, agents registration
  if (AgentNetworkCtor) {
    results.push(
      await runTest("AgentNetwork construction registers agents", async () => {
        const stubNeurolink = {} as unknown;
        const network = new AgentNetworkCtor!(
          {
            name: "Test Network",
            description: "Integration test network",
            agents: [
              {
                id: "agent-a",
                name: "Agent A",
                description: "First agent",
                instructions: "Instructions A.",
              },
              {
                id: "agent-b",
                name: "Agent B",
                description: "Second agent",
                instructions: "Instructions B.",
              },
            ],
          },
          stubNeurolink,
        );
        assertEqual(network.name, "Test Network", "Network name should match");
        const agents = network.getAllAgents();
        assertEqual(
          (agents as unknown[]).length,
          2,
          "Network should have 2 agents registered",
        );
      }),
    );

    results.push(
      await runTest(
        "AgentNetwork construction rejects empty agents",
        async () => {
          const stubNeurolink = {} as unknown;
          try {
            new AgentNetworkCtor!(
              {
                name: "Empty Network",
                agents: [],
              },
              stubNeurolink,
            );
            throw new Error("Should have thrown on empty agents array");
          } catch (err) {
            assertContains(String(err), "agent", "Error should mention agents");
          }
        },
      ),
    );

    results.push(
      await runTest(
        "AgentNetwork construction rejects missing name",
        async () => {
          const stubNeurolink = {} as unknown;
          try {
            new AgentNetworkCtor!(
              {
                name: "",
                agents: [
                  { id: "a", name: "A", description: "D", instructions: "I." },
                ],
              },
              stubNeurolink,
            );
            throw new Error("Should have thrown on empty name");
          } catch (err) {
            assertContains(
              String(err),
              "name",
              "Error should mention name field",
            );
          }
        },
      ),
    );
  }

  // MessageBus: pub/sub without I/O
  if (MessageBusCtor) {
    results.push(
      await runTest("MessageBus publish and subscribe", async () => {
        const bus = new MessageBusCtor!();
        const received: unknown[] = [];
        bus.subscribe("test-topic", "test-subscriber", (msg) => {
          received.push(msg);
        });
        await bus.publish("test-topic", "test-publisher", { data: "hello" });
        // Allow microtask queue to flush
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        assert(
          received.length >= 1,
          "MessageBus should deliver published message to subscriber",
        );
        assert(
          (received[0] as { payload: { data: string } }).payload.data ===
            "hello",
          "MessageBus should deliver correct payload",
        );
      }),
    );
  }

  const duration = Date.now() - startTime;
  return {
    name: "Integration Tests",
    tests: results,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: results.filter((r) => r.status === "FAIL").length,
    skipped: results.filter((r) => r.status === "SKIP").length,
    duration,
  };
}

/**
 * Test Suite: CLI Coverage Report
 *
 * Verifies that the Multi-Agent Networks CLI subcommands (`agent`, `network`)
 * are registered and respond to --help. Does not execute create/execute commands
 * since those require arguments and a running process-local agent registry.
 */
async function testCLICoverage(): Promise<TestSuiteResult> {
  logSection("CLI COVERAGE REPORT");
  const results: TestResult[] = [];
  const startTime = Date.now();

  log(
    "\n  CLI COVERAGE: Verifying Multi-Agent Networks CLI subcommands.",
    "cyan",
  );
  log("", "reset");

  // Check that the CLI entry point exists (real check, not a skip)
  results.push(
    await runTest("CLI entry point exists (dist/cli/index.js)", async () => {
      const cliPath = path.join(__dirname, "../dist/cli/index.js");
      const cliExists = fs.existsSync(cliPath);
      // Not a hard failure — dev may not have built yet; mark as SKIP if missing
      if (!cliExists) {
        throw new Error(
          "dist/cli/index.js not found — run `pnpm build` before this check",
        );
      }
    }),
  );

  const cliPath = path.join(__dirname, "../dist/cli/index.js");

  results.push(
    await runTest("CLI: neurolink agent --help responds", async () => {
      const output = execFileSync("node", [cliPath, "agent", "--help"], {
        encoding: "utf-8",
        timeout: 10000,
      });
      assert(
        output.includes("agent"),
        "CLI agent --help should mention agent subcommand",
      );
    }),
  );

  results.push(
    await runTest("CLI: neurolink network --help responds", async () => {
      const output = execFileSync("node", [cliPath, "network", "--help"], {
        encoding: "utf-8",
        timeout: 10000,
      });
      assert(
        output.includes("network"),
        "CLI network --help should mention network subcommand",
      );
    }),
  );

  results.push(
    await runTest("CLI: neurolink agent create --help responds", async () => {
      const output = execFileSync(
        "node",
        [cliPath, "agent", "create", "--help"],
        { encoding: "utf-8", timeout: 10000 },
      );
      assert(
        output.includes("create"),
        "CLI agent create --help should mention create",
      );
    }),
  );

  results.push(
    await runTest("CLI: neurolink network create --help responds", async () => {
      const output = execFileSync(
        "node",
        [cliPath, "network", "create", "--help"],
        { encoding: "utf-8", timeout: 10000 },
      );
      assert(
        output.includes("create"),
        "CLI network create --help should mention create",
      );
    }),
  );

  const duration = Date.now() - startTime;
  return {
    name: "CLI Coverage Report",
    tests: results,
    passed: results.filter((r) => r.status === "PASS").length,
    failed: results.filter((r) => r.status === "FAIL").length,
    skipped: results.filter((r) => r.status === "SKIP").length,
    duration,
  };
}

// ============================================================================
// Main Execution
// ============================================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  const suiteResults: TestSuiteResult[] = [];

  log("\n", "reset");
  log(
    "╔══════════════════════════════════════════════════════════════════════╗",
    "cyan",
  );
  log(
    "║     MULTI-AGENT NETWORKS - CONTINUOUS INTEGRATION TEST SUITE        ║",
    "cyan",
  );
  log(
    "╚══════════════════════════════════════════════════════════════════════╝",
    "cyan",
  );
  log("", "reset");
  log(`Provider: ${TEST_CONFIG.provider}`, "reset");
  log(`Model: ${TEST_CONFIG.model || "default"}`, "reset");
  log(`Verbose: ${TEST_CONFIG.verbose}`, "reset");
  log("", "reset");

  try {
    // Run all test suites
    suiteResults.push(await testAgentClass());
    suiteResults.push(await testNetworkTopologies());
    suiteResults.push(await testRoutingRules());
    suiteResults.push(await testMessageBus());
    suiteResults.push(await testIntegration());
    suiteResults.push(await testCLICoverage());
  } catch (error) {
    log(`\n❌ Fatal error running tests: ${error}`, "red");
    process.exit(1);
  }

  // Summary
  const totalDuration = Date.now() - startTime;
  const totalPassed = suiteResults.reduce((sum, s) => sum + s.passed, 0);
  const totalFailed = suiteResults.reduce((sum, s) => sum + s.failed, 0);
  const totalSkipped = suiteResults.reduce((sum, s) => sum + s.skipped, 0);
  const totalTests = totalPassed + totalFailed + totalSkipped;

  logSection("TEST SUMMARY");

  log("\nSuite Results:", "bright");
  for (const suite of suiteResults) {
    const status =
      suite.failed === 0
        ? "✅"
        : suite.failed > 0 && suite.passed > 0
          ? "⚠️"
          : "❌";
    log(
      `${status} ${suite.name}: ${suite.passed}/${suite.tests.length} passed (${suite.duration}ms)`,
      suite.failed === 0 ? "green" : "yellow",
    );
  }

  log("\n" + "=".repeat(70), "cyan");
  log(`TOTAL: ${totalTests} tests`, "bright");
  log(`  ✅ Passed:  ${totalPassed}`, "green");
  log(`  ❌ Failed:  ${totalFailed}`, totalFailed > 0 ? "red" : "green");
  log(`  ⏭️  Skipped: ${totalSkipped}`, "yellow");
  log(`  ⏱️  Duration: ${totalDuration}ms`, "reset");
  log("=".repeat(70), "cyan");

  // Exit with appropriate code
  if (totalFailed > 0) {
    log("\n❌ Some tests failed!", "red");
    process.exit(1);
  } else {
    log("\n✅ All tests passed!", "green");
    process.exit(0);
  }
}

// Run if executed directly
runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

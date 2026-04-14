#!/usr/bin/env tsx

/**
 * Continuous Test Suite for NeuroLink I/O Processors
 *
 * Comprehensive integration tests covering:
 * 1. All 10 processors (5 input + 5 output)
 * 2. All 6 CLI commands for processor management
 * 3. SDK integration (ProcessorPipeline, ProcessorRegistry)
 * 4. All 5 presets (default, security, strict, quality, minimal)
 * 5. Tripwire system validation
 *
 * Run with: npx tsx test/continuous-test-suite-processors.ts
 *
 * @module test/continuous-test-suite-processors
 */

import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  timeout: 30000,
  verbose: process.env.VERBOSE === "true",
  skipCli: process.env.SKIP_CLI === "true",
};

// ============================================================================
// Test Results Tracking
// ============================================================================

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const testResults: TestResult[] = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// ============================================================================
// Utility Functions
// ============================================================================

function log(
  message: string,
  type: "info" | "success" | "error" | "warn" = "info",
): void {
  const prefix = {
    info: "\x1b[36m[INFO]\x1b[0m",
    success: "\x1b[32m[PASS]\x1b[0m",
    error: "\x1b[31m[FAIL]\x1b[0m",
    warn: "\x1b[33m[WARN]\x1b[0m",
  };
  console.log(`${prefix[type]} ${message}`);
}

function logSection(title: string): void {
  console.log("\n" + "=".repeat(70));
  console.log(`  ${title}`);
  console.log("=".repeat(70) + "\n");
}

async function runTest(
  name: string,
  category: string,
  testFn: () => Promise<void>,
): Promise<void> {
  totalTests++;
  const start = Date.now();

  try {
    await testFn();
    const duration = Date.now() - start;
    testResults.push({ name, category, passed: true, duration });
    passedTests++;
    log(`${name} (${duration}ms)`, "success");
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    testResults.push({
      name,
      category,
      passed: false,
      duration,
      error: errorMsg,
    });
    failedTests++;
    log(`${name}: ${errorMsg}`, "error");
  }
}

function runCliCommand(
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    // Quote arguments that contain spaces to prevent shell word splitting
    const quotedArgs = args.map((arg) =>
      arg.includes(" ") ? `"${arg}"` : arg,
    );
    // Use node directly for faster startup instead of npx
    const cliPath = path.join(process.cwd(), "dist", "cli", "index.js");
    const proc = spawn("node", [cliPath, ...quotedArgs], {
      cwd: process.cwd(),
      timeout: TEST_CONFIG.timeout,
      shell: false,
      env: {
        ...process.env,
        NO_COLOR: "1",
        FORCE_COLOR: "0",
      },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });

    proc.on("error", (err) => {
      resolve({ stdout, stderr: err.message, exitCode: 1 });
    });
  });
}

function assertContains(
  text: string,
  substring: string,
  message?: string,
): void {
  if (!text.includes(substring)) {
    throw new Error(message || `Expected text to contain "${substring}"`);
  }
}

function assertNotContains(
  text: string,
  substring: string,
  message?: string,
): void {
  if (text.includes(substring)) {
    throw new Error(message || `Expected text NOT to contain "${substring}"`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || "Expected condition to be true");
  }
}

function assertFalse(condition: boolean, message?: string): void {
  if (condition) {
    throw new Error(message || "Expected condition to be false");
  }
}

// ============================================================================
// SDK Import and Setup
// ============================================================================

async function importSDK() {
  const sdk = await import("../src/lib/processors/index.js");
  return sdk;
}

// ============================================================================
// Test Suite: Input Processors
// ============================================================================

async function testInputProcessors(): Promise<void> {
  logSection("INPUT PROCESSORS (5 Processors)");

  const sdk = await importSDK();

  // 1. Message Validation Processor
  await runTest(
    "messageValidation - validates message structure",
    "input-processors",
    async () => {
      const processor = sdk.createMessageValidationProcessor({
        minLength: 1,
        maxLength: 1000,
        maxMessages: 50,
      });

      assertEqual(processor.id, "message-validation");
      assertEqual(processor.name, "Message Validation");
      assertTrue(processor.priority > 0, "Priority should be positive");

      const result = await processor.process(
        {
          text: "Hello, world!",
          messages: [{ id: "1", role: "user", content: "Hello" }],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        { minLength: 1, maxLength: 1000 },
      );

      assertEqual(result.action, "continue");
    },
  );

  await runTest(
    "messageValidation - rejects empty messages",
    "input-processors",
    async () => {
      const processor = sdk.createMessageValidationProcessor();

      const result = await processor.process(
        {
          text: "",
          messages: [],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        { minLength: 1, maxLength: 1000 },
      );

      // Should abort or have issues with empty input
      assertTrue(
        result.action === "abort" ||
          (result.issues && result.issues.length > 0),
        "Should flag empty input",
      );
    },
  );

  // 2. PII Detection Processor
  await runTest(
    "piiDetection - detects email addresses",
    "input-processors",
    async () => {
      const processor = sdk.createPIIDetectionProcessor({
        detectTypes: ["email"],
        action: "warn",
      });

      assertEqual(processor.id, "pii-detection");

      const result = await processor.process(
        {
          text: "My email is john.doe@example.com",
          messages: [
            { id: "1", role: "user", content: "Contact me at test@test.com" },
          ],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        { detectTypes: ["email"], action: "warn" },
      );

      assertTrue(
        result.issues !== undefined && result.issues.length > 0,
        "Should detect PII",
      );
      assertTrue(
        result.metadata?.piiDetected === true,
        "Should flag PII detected",
      );
    },
  );

  await runTest(
    "piiDetection - redacts PII when configured",
    "input-processors",
    async () => {
      const processor = sdk.createPIIDetectionProcessor({
        detectTypes: ["email", "phone"],
        action: "redact",
        redactionText: "[REDACTED]",
      });

      const result = await processor.process(
        {
          text: "Call me at 555-123-4567",
          messages: [
            { id: "1", role: "user", content: "Email: user@example.com" },
          ],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        {
          detectTypes: ["email", "phone"],
          action: "redact",
          redactionText: "[REDACTED]",
        },
      );

      assertEqual(result.action, "continue");
      assertTrue(
        result.metadata?.piiRedacted === true,
        "Should indicate redaction",
      );
    },
  );

  await runTest(
    "piiDetection - aborts on PII with abort action",
    "input-processors",
    async () => {
      const processor = sdk.createPIIDetectionProcessor({
        detectTypes: ["ssn", "credit_card"],
        action: "abort",
      });

      const result = await processor.process(
        {
          text: "My SSN is 123-45-6789",
          messages: [],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        { detectTypes: ["ssn"], action: "abort" },
      );

      assertEqual(result.action, "abort");
    },
  );

  // 3. Content Moderation Processor
  await runTest(
    "contentModeration - allows clean content",
    "input-processors",
    async () => {
      const processor = sdk.createContentModerationProcessor({
        blockThreshold: 0.7,
        warnThreshold: 0.4,
      });

      assertEqual(processor.id, "content-moderation");

      const result = await processor.process(
        {
          text: "This is a perfectly normal message about programming.",
          messages: [],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        { blockThreshold: 0.7, warnThreshold: 0.4 },
      );

      assertEqual(result.action, "continue");
    },
  );

  await runTest(
    "contentModeration - has validateConfig method",
    "input-processors",
    async () => {
      const processor = sdk.createContentModerationProcessor();

      assertTrue(
        processor.validateConfig !== undefined,
        "Should have validateConfig",
      );

      if (processor.validateConfig) {
        const validation = processor.validateConfig({ blockThreshold: 0.5 });
        assertTrue(validation.valid, "Valid config should pass");
      }
    },
  );

  // 4. Memory Retrieval Processor
  await runTest(
    "memoryRetrieval - creates processor correctly",
    "input-processors",
    async () => {
      const processor = sdk.createMemoryRetrievalProcessor();

      assertEqual(processor.id, "memory-retrieval");
      assertEqual(processor.name, "Memory Message Retrieval");
      assertTrue(processor.process !== undefined, "Should have process method");
    },
  );

  await runTest(
    "memoryRetrieval - handles missing memory gracefully",
    "input-processors",
    async () => {
      const processor = sdk.createMemoryRetrievalProcessor();

      const result = await processor.process(
        {
          text: "Hello",
          messages: [],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        {},
      );

      // Should continue even without memory configured
      assertEqual(result.action, "continue");
    },
  );

  // 5. Semantic Context Processor
  await runTest(
    "semanticContext - creates processor correctly",
    "input-processors",
    async () => {
      const processor = sdk.createSemanticContextProcessor();

      assertEqual(processor.id, "semantic-context");
      assertEqual(processor.name, "Semantic Context Search");
      assertTrue(processor.priority > 0, "Priority should be positive");
    },
  );

  await runTest(
    "semanticContext - processes without vector store",
    "input-processors",
    async () => {
      const processor = sdk.createSemanticContextProcessor();

      const result = await processor.process(
        {
          text: "What is machine learning?",
          messages: [],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        {},
      );

      // Should continue without error when no vector store is configured
      assertEqual(result.action, "continue");
    },
  );
}

// ============================================================================
// Test Suite: Output Processors
// ============================================================================

async function testOutputProcessors(): Promise<void> {
  logSection("OUTPUT PROCESSORS (5 Processors)");

  const sdk = await importSDK();

  // 1. Response Validation Processor
  await runTest(
    "responseValidation - validates response content",
    "output-processors",
    async () => {
      const processor = sdk.createResponseValidationProcessor({
        minLength: 10,
      });

      assertEqual(processor.id, "response-validation");

      const result = await processor.process(
        {
          responseText: "This is a valid response with sufficient content.",
          input: {
            text: "Test",
            messages: [],
            metadata: { issues: [], processorTrace: [], custom: {} },
            options: {},
          },
          result: {
            content: "This is a valid response.",
            provider: "test",
            model: "test",
          },
          metadata: { issues: [], processorTrace: [], custom: {} },
        },
        { minLength: 10 },
      );

      assertEqual(result.action, "continue");
    },
  );

  await runTest(
    "responseValidation - rejects short responses",
    "output-processors",
    async () => {
      const processor = sdk.createResponseValidationProcessor();

      const result = await processor.process(
        {
          responseText: "Hi",
          input: {
            text: "Test",
            messages: [],
            metadata: { issues: [], processorTrace: [], custom: {} },
            options: {},
          },
          result: { content: "Hi", provider: "test", model: "test" },
          metadata: { issues: [], processorTrace: [], custom: {} },
        },
        { minLength: 100 },
      );

      // Should have issues or request retry for too-short response
      assertTrue(
        result.action !== "continue" ||
          (result.issues && result.issues.length > 0),
        "Should flag short response",
      );
    },
  );

  // 2. Length Validation Processor
  await runTest(
    "lengthValidation - allows response within limits",
    "output-processors",
    async () => {
      const processor = sdk.createLengthValidationProcessor({
        maxLength: 10000,
      });

      assertEqual(processor.id, "length-validation");

      const result = await processor.process(
        {
          responseText: "A reasonable length response.",
          input: {
            text: "Test",
            messages: [],
            metadata: { issues: [], processorTrace: [], custom: {} },
            options: {},
          },
          result: { content: "Response", provider: "test", model: "test" },
          metadata: { issues: [], processorTrace: [], custom: {} },
        },
        { maxLength: 10000 },
      );

      assertEqual(result.action, "continue");
    },
  );

  await runTest(
    "lengthValidation - flags responses exceeding max length",
    "output-processors",
    async () => {
      const processor = sdk.createLengthValidationProcessor();

      const longText = "x".repeat(1000);
      const result = await processor.process(
        {
          responseText: longText,
          input: {
            text: "Test",
            messages: [],
            metadata: { issues: [], processorTrace: [], custom: {} },
            options: {},
          },
          result: { content: longText, provider: "test", model: "test" },
          metadata: { issues: [], processorTrace: [], custom: {} },
        },
        { maxLength: 100, action: "truncate" },
      );

      // Should truncate or flag the long response
      assertTrue(
        result.data?.responseText !== undefined &&
          result.data.responseText.length <= 100,
        "Should truncate response",
      );
    },
  );

  // 3. Content Filtering Processor
  await runTest(
    "contentFiltering - allows clean content",
    "output-processors",
    async () => {
      const processor = sdk.createContentFilteringProcessor();

      assertEqual(processor.id, "content-filtering");

      const result = await processor.process(
        {
          responseText:
            "Here is helpful information about coding best practices.",
          input: {
            text: "Test",
            messages: [],
            metadata: { issues: [], processorTrace: [], custom: {} },
            options: {},
          },
          result: { content: "Response", provider: "test", model: "test" },
          metadata: { issues: [], processorTrace: [], custom: {} },
        },
        {},
      );

      assertEqual(result.action, "continue");
    },
  );

  await runTest(
    "contentFiltering - has description",
    "output-processors",
    async () => {
      const processor = sdk.createContentFilteringProcessor();

      assertTrue(
        processor.description !== undefined && processor.description.length > 0,
        "Should have description",
      );
    },
  );

  // 4. Toxicity Check Processor
  await runTest(
    "toxicityCheck - allows non-toxic content",
    "output-processors",
    async () => {
      const processor = sdk.createToxicityCheckProcessor({
        blockThreshold: 0.7,
        warnThreshold: 0.4,
      });

      assertEqual(processor.id, "toxicity-check");

      const result = await processor.process(
        {
          responseText:
            "Thank you for your question. Here is a helpful answer.",
          input: {
            text: "Test",
            messages: [],
            metadata: { issues: [], processorTrace: [], custom: {} },
            options: {},
          },
          result: { content: "Response", provider: "test", model: "test" },
          metadata: { issues: [], processorTrace: [], custom: {} },
        },
        { blockThreshold: 0.7, warnThreshold: 0.4 },
      );

      assertEqual(result.action, "continue");
      assertTrue(
        result.metadata?.toxicityChecked === true ||
          result.metadata?.toxicityPassed === true,
      );
    },
  );

  await runTest(
    "toxicityCheck - detects toxic indicators",
    "output-processors",
    async () => {
      const processor = sdk.createToxicityCheckProcessor({
        categories: ["insult", "threat"],
        blockThreshold: 0.3, // Lower threshold to trigger detection
        action: "warn",
      });

      const result = await processor.process(
        {
          responseText: "You are stupid and an idiot fool moron",
          input: {
            text: "Test",
            messages: [],
            metadata: { issues: [], processorTrace: [], custom: {} },
            options: {},
          },
          result: { content: "Response", provider: "test", model: "test" },
          metadata: { issues: [], processorTrace: [], custom: {} },
        },
        { categories: ["insult"], blockThreshold: 0.3, action: "warn" },
      );

      // Should flag toxic content
      assertTrue(
        (result.issues && result.issues.length > 0) ||
          result.metadata?.toxicityWarned === true,
        "Should detect toxicity indicators",
      );
    },
  );

  await runTest(
    "toxicityCheck - validates config correctly",
    "output-processors",
    async () => {
      const processor = sdk.createToxicityCheckProcessor();

      if (processor.validateConfig) {
        const validResult = processor.validateConfig({
          blockThreshold: 0.7,
          warnThreshold: 0.4,
          action: "warn",
        });
        assertTrue(validResult.valid, "Valid config should pass");

        const invalidResult = processor.validateConfig({
          blockThreshold: 1.5, // Invalid: > 1
        });
        assertFalse(invalidResult.valid, "Invalid config should fail");
        assertTrue(invalidResult.errors.length > 0, "Should have errors");
      }
    },
  );

  // 5. Memory Persistence Processor
  await runTest(
    "memoryPersistence - creates processor correctly",
    "output-processors",
    async () => {
      const processor = sdk.createMemoryPersistenceProcessor();

      assertEqual(processor.id, "memory-persistence");
      assertEqual(processor.name, "Memory Persistence");
    },
  );

  await runTest(
    "memoryPersistence - continues without memory store",
    "output-processors",
    async () => {
      const processor = sdk.createMemoryPersistenceProcessor();

      const result = await processor.process(
        {
          responseText: "This should be saved to memory.",
          input: {
            text: "Test",
            messages: [],
            metadata: { issues: [], processorTrace: [], custom: {} },
            options: {},
          },
          result: { content: "Response", provider: "test", model: "test" },
          metadata: { issues: [], processorTrace: [], custom: {} },
        },
        {},
      );

      // Should continue without error when no memory store
      assertEqual(result.action, "continue");
    },
  );
}

// ============================================================================
// Test Suite: ProcessorPipeline
// ============================================================================

async function testProcessorPipeline(): Promise<void> {
  logSection("PROCESSOR PIPELINE");

  const sdk = await importSDK();

  await runTest(
    "ProcessorPipeline - creates empty pipeline",
    "pipeline",
    async () => {
      const pipeline = new sdk.ProcessorPipeline();

      assertEqual(pipeline.getInputProcessors().length, 0);
      assertEqual(pipeline.getOutputProcessors().length, 0);
    },
  );

  await runTest(
    "ProcessorPipeline - adds and sorts processors by priority",
    "pipeline",
    async () => {
      const pipeline = new sdk.ProcessorPipeline();

      const lowPriority = sdk.createMessageValidationProcessor();
      (lowPriority as { priority: number }).priority = 10;

      const highPriority = sdk.createPIIDetectionProcessor();
      (highPriority as { priority: number }).priority = 90;

      pipeline.addInputProcessor(lowPriority);
      pipeline.addInputProcessor(highPriority);

      const processors = pipeline.getInputProcessors();
      assertEqual(processors.length, 2);
      assertTrue(
        processors[0].processor.priority >= processors[1].processor.priority,
      );
    },
  );

  await runTest(
    "ProcessorPipeline - processes input data",
    "pipeline",
    async () => {
      const pipeline = new sdk.ProcessorPipeline({
        inputProcessors: [
          { processor: sdk.createMessageValidationProcessor() },
        ],
      });

      const result = await pipeline.processInput({
        text: "Hello, world!",
        messages: [{ id: "1", role: "user", content: "Hello" }],
        metadata: { issues: [], processorTrace: [], custom: {} },
        options: {},
      });

      assertEqual(result.action, "continue");
      assertTrue(result.totalTime >= 0);
    },
  );

  await runTest(
    "ProcessorPipeline - processes output data",
    "pipeline",
    async () => {
      const pipeline = new sdk.ProcessorPipeline({
        outputProcessors: [
          {
            processor: sdk.createLengthValidationProcessor({
              maxLength: 10000,
            }),
          },
        ],
      });

      const result = await pipeline.processOutput({
        responseText: "This is a response.",
        input: {
          text: "Test",
          messages: [],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        result: { content: "Response", provider: "test", model: "test" },
        metadata: { issues: [], processorTrace: [], custom: {} },
      });

      assertEqual(result.action, "continue");
    },
  );

  await runTest(
    "ProcessorPipeline - respects processor conditions",
    "pipeline",
    async () => {
      let processorCalled = false;

      const conditionalProcessor = {
        id: "conditional",
        name: "Conditional",
        priority: 50,
        process: async (data: unknown) => {
          processorCalled = true;
          return { action: "continue" as const, data };
        },
      };

      const pipeline = new sdk.ProcessorPipeline({
        inputProcessors: [
          {
            processor: conditionalProcessor,
            config: { conditions: { providers: ["anthropic"] } },
          },
        ],
      });

      await pipeline.processInput({
        text: "Hello",
        messages: [],
        metadata: {
          issues: [],
          processorTrace: [],
          custom: {},
          provider: "openai",
        },
        options: {},
      });

      assertFalse(
        processorCalled,
        "Processor should not run for non-matching provider",
      );
    },
  );

  await runTest(
    "ProcessorPipeline - updates settings",
    "pipeline",
    async () => {
      const pipeline = new sdk.ProcessorPipeline({
        settings: { maxTotalRetries: 3 },
      });

      pipeline.updateSettings({ maxTotalRetries: 5, enableTracing: true });

      const settings = pipeline.getSettings();
      assertEqual(settings.maxTotalRetries, 5);
      assertEqual(settings.enableTracing, true);
    },
  );

  await runTest(
    "ProcessorPipeline - removes processors",
    "pipeline",
    async () => {
      const pipeline = new sdk.ProcessorPipeline({
        inputProcessors: [
          { processor: sdk.createMessageValidationProcessor() },
        ],
        outputProcessors: [
          { processor: sdk.createLengthValidationProcessor() },
        ],
      });

      assertEqual(pipeline.getInputProcessors().length, 1);
      assertTrue(pipeline.removeInputProcessor("message-validation"));
      assertEqual(pipeline.getInputProcessors().length, 0);

      assertEqual(pipeline.getOutputProcessors().length, 1);
      assertTrue(pipeline.removeOutputProcessor("length-validation"));
      assertEqual(pipeline.getOutputProcessors().length, 0);
    },
  );

  await runTest(
    "ProcessorPipeline - clears all processors",
    "pipeline",
    async () => {
      const pipeline = new sdk.ProcessorPipeline({
        inputProcessors: [
          { processor: sdk.createMessageValidationProcessor() },
        ],
        outputProcessors: [
          { processor: sdk.createLengthValidationProcessor() },
        ],
      });

      pipeline.clear();

      assertEqual(pipeline.getInputProcessors().length, 0);
      assertEqual(pipeline.getOutputProcessors().length, 0);
    },
  );
}

// ============================================================================
// Test Suite: ProcessorRegistry
// ============================================================================

async function testProcessorRegistry(): Promise<void> {
  logSection("PROCESSOR REGISTRY");

  const sdk = await importSDK();

  await runTest(
    "ProcessorRegistry - lists registered processors",
    "registry",
    async () => {
      const processors = sdk.defaultRegistry.listProcessors();

      assertTrue(
        processors.input.length >= 5,
        "Should have at least 5 input processors",
      );
      assertTrue(
        processors.output.length >= 5,
        "Should have at least 5 output processors",
      );
    },
  );

  await runTest(
    "ProcessorRegistry - gets processor by ID",
    "registry",
    async () => {
      const piiProcessor =
        sdk.defaultRegistry.getInputProcessor("pii-detection");
      assertTrue(piiProcessor !== undefined, "Should find PII processor");
      assertEqual(piiProcessor?.id, "pii-detection");

      const toxicityProcessor =
        sdk.defaultRegistry.getOutputProcessor("toxicity-check");
      assertTrue(
        toxicityProcessor !== undefined,
        "Should find toxicity processor",
      );
      assertEqual(toxicityProcessor?.id, "toxicity-check");
    },
  );

  await runTest(
    "ProcessorRegistry - checks processor existence",
    "registry",
    async () => {
      assertTrue(sdk.defaultRegistry.hasInputProcessor("message-validation"));
      assertTrue(sdk.defaultRegistry.hasOutputProcessor("length-validation"));
      assertFalse(sdk.defaultRegistry.hasInputProcessor("nonexistent"));
      assertFalse(sdk.defaultRegistry.hasOutputProcessor("nonexistent"));
    },
  );

  await runTest(
    "ProcessorRegistry - gets all presets",
    "registry",
    async () => {
      const presets = sdk.defaultRegistry.getAllPresets();
      assertTrue(presets.length >= 5, "Should have at least 5 presets");
    },
  );

  await runTest(
    "ProcessorRegistry - builds from preset",
    "registry",
    async () => {
      const builtProcessors = sdk.defaultRegistry.buildFromPreset("security");
      assertTrue(builtProcessors !== undefined, "Should build security preset");
      assertTrue(
        builtProcessors!.inputProcessors.length > 0,
        "Should have input processors",
      );
      assertTrue(
        builtProcessors!.outputProcessors.length > 0,
        "Should have output processors",
      );
    },
  );

  await runTest(
    "ProcessorRegistry - returns undefined for invalid preset",
    "registry",
    async () => {
      const result = sdk.defaultRegistry.buildFromPreset("nonexistent");
      assertEqual(result, undefined);
    },
  );

  await runTest("ProcessorRegistry - gets stats", "registry", async () => {
    const stats = sdk.defaultRegistry.getStats();
    assertTrue(stats.inputProcessorCount >= 5);
    assertTrue(stats.outputProcessorCount >= 5);
    assertTrue(stats.presetCount >= 5);
  });
}

// ============================================================================
// Test Suite: Presets
// ============================================================================

async function testPresets(): Promise<void> {
  logSection("PRESETS (5 Presets)");

  const sdk = await importSDK();

  // Test all 5 presets
  const presetConfigs = [
    { name: "default", expectedInputCount: 1, expectedOutputCount: 1 },
    { name: "security", expectedInputCount: 3, expectedOutputCount: 2 },
    { name: "strict", expectedInputCount: 3, expectedOutputCount: 4 },
    { name: "quality", expectedInputCount: 1, expectedOutputCount: 3 },
    { name: "minimal", expectedInputCount: 1, expectedOutputCount: 0 },
  ];

  for (const config of presetConfigs) {
    await runTest(
      `preset:${config.name} - has correct structure`,
      "presets",
      async () => {
        const preset = sdk.getPreset(config.name);
        assertTrue(preset !== undefined, `Preset ${config.name} should exist`);
        assertEqual(preset!.name, config.name);
        assertTrue(preset!.description.length > 0, "Should have description");
        assertEqual(
          preset!.inputProcessors.length,
          config.expectedInputCount,
          `${config.name} should have ${config.expectedInputCount} input processors`,
        );
        assertEqual(
          preset!.outputProcessors.length,
          config.expectedOutputCount,
          `${config.name} should have ${config.expectedOutputCount} output processors`,
        );
      },
    );
  }

  await runTest(
    "getPresetNames - returns all preset names",
    "presets",
    async () => {
      const names = sdk.getPresetNames();
      assertTrue(names.includes("default"));
      assertTrue(names.includes("security"));
      assertTrue(names.includes("strict"));
      assertTrue(names.includes("quality"));
      assertTrue(names.includes("minimal"));
      assertEqual(names.length, 5);
    },
  );

  await runTest(
    "builtInPresets - contains all presets",
    "presets",
    async () => {
      assertEqual(sdk.builtInPresets.length, 5);
      const names = sdk.builtInPresets.map((p) => p.name);
      assertTrue(names.includes("default"));
      assertTrue(names.includes("security"));
      assertTrue(names.includes("strict"));
      assertTrue(names.includes("quality"));
      assertTrue(names.includes("minimal"));
    },
  );
}

// ============================================================================
// Test Suite: Tripwire System
// ============================================================================

async function testTripwireSystem(): Promise<void> {
  logSection("TRIPWIRE SYSTEM");

  const sdk = await importSDK();

  await runTest(
    "TripwireEvaluator - creates with no tripwires",
    "tripwire",
    async () => {
      const evaluator = new sdk.TripwireEvaluator();
      assertEqual(evaluator.count, 0);
    },
  );

  await runTest(
    "TripwireEvaluator - registers tripwires",
    "tripwire",
    async () => {
      const evaluator = new sdk.TripwireEvaluator();

      evaluator.register({
        id: "test-tripwire",
        name: "Test Tripwire",
        condition: () => false,
        action: "abort",
        message: "Test triggered",
        severity: "error",
      });

      assertEqual(evaluator.count, 1);
      assertTrue(evaluator.has("test-tripwire"));
    },
  );

  await runTest(
    "TripwireEvaluator - evaluates tripwires",
    "tripwire",
    async () => {
      const evaluator = new sdk.TripwireEvaluator();

      evaluator.register({
        id: "always-trigger",
        name: "Always Trigger",
        condition: () => true,
        action: "abort",
        message: "Always triggered",
        severity: "error",
      });

      const result = evaluator.evaluate({
        responseText: "Test response",
        input: {
          text: "",
          messages: [],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        result: { content: "", provider: "", model: "" },
        metadata: { issues: [], processorTrace: [], custom: {} },
      });

      assertTrue(result.triggered);
      assertEqual(result.action, "abort");
    },
  );

  await runTest(
    "TripwireEvaluator - evaluateAll returns all triggered",
    "tripwire",
    async () => {
      const evaluator = new sdk.TripwireEvaluator();

      evaluator.registerAll([
        {
          id: "tripwire-1",
          name: "Tripwire 1",
          condition: () => true,
          action: "warn",
          message: "First",
          severity: "warning",
        },
        {
          id: "tripwire-2",
          name: "Tripwire 2",
          condition: () => true,
          action: "warn",
          message: "Second",
          severity: "warning",
        },
      ]);

      const results = evaluator.evaluateAll({
        responseText: "Test",
        input: {
          text: "",
          messages: [],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        result: { content: "", provider: "", model: "" },
        metadata: { issues: [], processorTrace: [], custom: {} },
      });

      assertEqual(results.length, 2);
    },
  );

  await runTest(
    "TripwireEvaluator - unregisters tripwires",
    "tripwire",
    async () => {
      const evaluator = new sdk.TripwireEvaluator();

      evaluator.register({
        id: "to-remove",
        name: "To Remove",
        condition: () => false,
        action: "abort",
        message: "Removed",
        severity: "error",
      });

      assertTrue(evaluator.unregister("to-remove"));
      assertFalse(evaluator.has("to-remove"));
      assertEqual(evaluator.count, 0);
    },
  );

  await runTest(
    "commonTripwires - contains standard tripwires",
    "tripwire",
    async () => {
      assertTrue(sdk.commonTripwires.length >= 7);

      const ids = sdk.commonTripwires.map((t) => t.id);
      assertTrue(ids.includes("max-tokens"));
      assertTrue(ids.includes("empty-response"));
      assertTrue(ids.includes("repetition-loop"));
      assertTrue(ids.includes("input-too-long"));
      assertTrue(ids.includes("too-many-messages"));
      assertTrue(ids.includes("response-too-long"));
      assertTrue(ids.includes("high-latency"));
    },
  );

  await runTest(
    "createDefaultTripwireEvaluator - includes common tripwires",
    "tripwire",
    async () => {
      const evaluator = sdk.createDefaultTripwireEvaluator();
      assertTrue(evaluator.count >= 7);
    },
  );

  await runTest(
    "emptyResponseTripwire - triggers on empty response",
    "tripwire",
    async () => {
      const evaluator = new sdk.TripwireEvaluator([sdk.emptyResponseTripwire]);

      const result = evaluator.evaluate({
        responseText: "",
        input: {
          text: "",
          messages: [],
          metadata: { issues: [], processorTrace: [], custom: {} },
          options: {},
        },
        result: { content: "", provider: "", model: "" },
        metadata: { issues: [], processorTrace: [], custom: {} },
      });

      assertTrue(result.triggered);
      assertEqual(result.tripwire?.id, "empty-response");
    },
  );
}

// ============================================================================
// Test Suite: CLI Commands (6 Commands)
// ============================================================================

async function testCLICommands(): Promise<void> {
  if (TEST_CONFIG.skipCli) {
    log("Skipping CLI tests (SKIP_CLI=true)", "warn");
    return;
  }

  logSection("CLI COMMANDS (6 Commands)");

  // 1. neurolink processor list
  await runTest(
    "CLI: processor list - shows all processors",
    "cli",
    async () => {
      const { stdout, exitCode } = await runCliCommand(["processor", "list"]);

      assertEqual(exitCode, 0, "Exit code should be 0");
      assertContains(stdout, "Input Processors");
      assertContains(stdout, "Output Processors");
      assertContains(stdout, "pii-detection");
      assertContains(stdout, "toxicity-check");
    },
  );

  await runTest(
    "CLI: processor list --type input - filters to input",
    "cli",
    async () => {
      const { stdout, exitCode } = await runCliCommand([
        "processor",
        "list",
        "--type",
        "input",
      ]);

      assertEqual(exitCode, 0);
      assertContains(stdout, "Input Processors");
      assertContains(stdout, "pii-detection");
    },
  );

  await runTest(
    "CLI: processor list --json - outputs JSON",
    "cli",
    async () => {
      const { stdout, exitCode } = await runCliCommand([
        "processor",
        "list",
        "--json",
      ]);

      // Try to extract JSON even if there's extra output
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      assertTrue(jsonMatch !== null, "Should contain JSON object");

      const parsed = JSON.parse(jsonMatch![0]);
      assertTrue(
        Array.isArray(parsed.inputProcessors) || Array.isArray(parsed.input),
        "Should have input processors array",
      );
      assertTrue(
        Array.isArray(parsed.outputProcessors) || Array.isArray(parsed.output),
        "Should have output processors array",
      );
    },
  );

  // 2. neurolink processor list-presets
  await runTest(
    "CLI: processor list-presets - shows all presets",
    "cli",
    async () => {
      const { stdout, exitCode } = await runCliCommand([
        "processor",
        "list-presets",
      ]);

      assertEqual(exitCode, 0);
      assertContains(stdout, "Available Processor Presets");
      assertContains(stdout, "default");
      assertContains(stdout, "security");
      assertContains(stdout, "strict");
      assertContains(stdout, "quality");
      assertContains(stdout, "minimal");
    },
  );

  await runTest(
    "CLI: processor list-presets --json - outputs JSON",
    "cli",
    async () => {
      const { stdout, exitCode } = await runCliCommand([
        "processor",
        "list-presets",
        "--json",
      ]);

      assertEqual(exitCode, 0);
      const parsed = JSON.parse(stdout);
      assertTrue(Array.isArray(parsed));
      assertEqual(parsed.length, 5);
    },
  );

  // 3. neurolink processor presets [name]
  await runTest(
    "CLI: processor presets security - shows preset details",
    "cli",
    async () => {
      const { stdout, exitCode } = await runCliCommand([
        "processor",
        "presets",
        "security",
      ]);

      assertEqual(exitCode, 0);
      assertContains(stdout, "Preset: security");
      assertContains(stdout, "Input Processors");
      assertContains(stdout, "Output Processors");
    },
  );

  await runTest(
    "CLI: processor presets nonexistent - handles missing preset",
    "cli",
    async () => {
      const { stdout } = await runCliCommand([
        "processor",
        "presets",
        "nonexistent",
      ]);

      assertContains(stdout, "not found");
    },
  );

  await runTest(
    "CLI: processor presets --json security - outputs JSON",
    "cli",
    async () => {
      const { stdout, exitCode } = await runCliCommand([
        "processor",
        "presets",
        "security",
        "--json",
      ]);

      assertEqual(exitCode, 0);
      const parsed = JSON.parse(stdout);
      assertEqual(parsed.name, "security");
      assertTrue(Array.isArray(parsed.inputProcessors));
      assertTrue(Array.isArray(parsed.outputProcessors));
    },
  );

  // 4. neurolink processor run --preset <name> --input <text>
  await runTest(
    "CLI: processor run - runs preset on input",
    "cli",
    async () => {
      const { stdout, exitCode } = await runCliCommand([
        "processor",
        "run",
        "--preset",
        "default",
        "--input",
        "Hello, world!",
      ]);

      assertEqual(exitCode, 0);
      assertContains(stdout, "Running processors");
      assertContains(stdout, "Action:");
      assertContains(stdout, "continue");
    },
  );

  await runTest(
    "CLI: processor run - detects PII with security preset",
    "cli",
    async () => {
      const { stdout } = await runCliCommand([
        "processor",
        "run",
        "--preset",
        "security",
        "--input",
        "My email is test@example.com",
      ]);

      // Security preset should detect and report PII
      assertContains(stdout.toLowerCase(), "pii");
    },
  );

  await runTest(
    "CLI: processor run --json - outputs JSON result",
    "cli",
    async () => {
      const { stdout, exitCode } = await runCliCommand([
        "processor",
        "run",
        "--preset",
        "default",
        "--input",
        "Test input",
        "--json",
      ]);

      assertEqual(exitCode, 0);
      const parsed = JSON.parse(stdout);
      assertEqual(parsed.preset, "default");
      assertTrue(parsed.action !== undefined);
      assertTrue(parsed.executionTimeMs !== undefined);
    },
  );

  // 5. neurolink processor validate --config <file>
  await runTest(
    "CLI: processor validate - validates config file",
    "cli",
    async () => {
      // Create a test config file
      const configPath = path.join(process.cwd(), "test-processor-config.json");
      const config = {
        inputProcessors: [{ id: "message-validation" }],
        outputProcessors: [{ id: "length-validation" }],
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      try {
        const { stdout, exitCode } = await runCliCommand([
          "processor",
          "validate",
          "--config",
          configPath,
        ]);

        assertEqual(exitCode, 0);
        assertContains(stdout, "valid");
      } finally {
        fs.unlinkSync(configPath);
      }
    },
  );

  await runTest(
    "CLI: processor validate - reports invalid config",
    "cli",
    async () => {
      const configPath = path.join(process.cwd(), "test-invalid-config.json");
      const config = {
        inputProcessors: "not-an-array", // Invalid
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      try {
        const { stdout, exitCode } = await runCliCommand([
          "processor",
          "validate",
          "--config",
          configPath,
        ]);

        assertTrue(
          exitCode !== 0 ||
            stdout.includes("error") ||
            stdout.includes("must be an array"),
        );
      } finally {
        fs.unlinkSync(configPath);
      }
    },
  );

  await runTest(
    "CLI: processor validate --json - outputs JSON validation",
    "cli",
    async () => {
      const configPath = path.join(process.cwd(), "test-json-config.json");
      const config = {
        inputProcessors: [{ id: "pii-detection" }],
        settings: { enableTracing: true },
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      try {
        const { stdout, exitCode } = await runCliCommand([
          "processor",
          "validate",
          "--config",
          configPath,
          "--json",
        ]);

        assertEqual(exitCode, 0);
        const parsed = JSON.parse(stdout);
        assertEqual(parsed.valid, true);
      } finally {
        fs.unlinkSync(configPath);
      }
    },
  );

  // 6. neurolink processor info
  await runTest(
    "CLI: processor info - shows system information",
    "cli",
    async () => {
      const { stdout, exitCode } = await runCliCommand(["processor", "info"]);

      assertEqual(exitCode, 0);
      assertContains(stdout, "I/O Processor System");
      assertContains(stdout, "Statistics");
      assertContains(stdout, "Input Processors:");
      assertContains(stdout, "Output Processors:");
      assertContains(stdout, "Presets:");
      assertContains(stdout, "Commands:");
    },
  );
}

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

async function testErrorHandling(): Promise<void> {
  logSection("ERROR HANDLING");

  const sdk = await importSDK();

  await runTest(
    "IOProcessorError - creates processor failed error",
    "errors",
    async () => {
      const error = sdk.createProcessorFailedError(
        "pii-detection",
        "Pattern matching failed",
      );
      // The error message format is from ioProcessorErrors.create, check for key parts
      assertTrue(error instanceof Error, "Should be an error");
      assertTrue(error.message.length > 0, "Should have message");
    },
  );

  await runTest(
    "IOProcessorError - creates pipeline error",
    "errors",
    async () => {
      const error = sdk.createPipelineError("Timeout exceeded", 2, 5);
      assertTrue(error instanceof Error, "Should be an error");
      assertTrue(error.message.length > 0, "Should have message");
    },
  );

  await runTest(
    "IOProcessorError - creates registry error",
    "errors",
    async () => {
      const error = sdk.createRegistryError("Processor already exists");
      assertTrue(error instanceof Error, "Should be an error");
      assertTrue(error.message.length > 0, "Should have message");
    },
  );

  await runTest(
    "IOProcessorError - creates preset not found error",
    "errors",
    async () => {
      const error = sdk.createPresetNotFoundError("nonexistent");
      assertTrue(error.message.includes("nonexistent"));
    },
  );

  await runTest(
    "IOProcessorError - creates validation error",
    "errors",
    async () => {
      const error = sdk.createValidationError("test-processor", [
        "Invalid configuration",
      ]);
      assertTrue(error instanceof Error, "Should be an error");
      assertTrue(error.message.length > 0, "Should have message");
    },
  );

  await runTest(
    "isIOProcessorError - identifies processor errors",
    "errors",
    async () => {
      const processorError = sdk.createProcessorFailedError("test", "test");
      assertTrue(sdk.isIOProcessorError(processorError));

      const regularError = new Error("Regular error");
      assertFalse(sdk.isIOProcessorError(regularError));
    },
  );
}

// ============================================================================
// Test Suite: Type Utilities
// ============================================================================

async function testTypeUtilities(): Promise<void> {
  logSection("TYPE UTILITIES");

  const sdk = await importSDK();

  await runTest(
    "createDefaultMetadata - creates valid metadata",
    "types",
    async () => {
      const metadata = sdk.createDefaultMetadata();

      assertTrue(Array.isArray(metadata.issues));
      assertTrue(Array.isArray(metadata.processorTrace));
      assertEqual(metadata.issues.length, 0);
      assertEqual(metadata.processorTrace.length, 0);
    },
  );

  await runTest(
    "createDefaultMetadata - accepts overrides",
    "types",
    async () => {
      const metadata = sdk.createDefaultMetadata({
        provider: "openai",
        model: "gpt-4o",
      });

      assertEqual(metadata.provider, "openai");
      assertEqual(metadata.model, "gpt-4o");
    },
  );

  await runTest(
    "createContinueResult - creates continue result",
    "types",
    async () => {
      const data = { text: "test" };
      const metadata = sdk.createDefaultMetadata();
      const result = sdk.createContinueResult(data, metadata);

      assertEqual(result.action, "continue");
      assertEqual(result.data, data);
      assertEqual(result.metadata, metadata);
    },
  );

  await runTest(
    "createAbortResult - creates abort result",
    "types",
    async () => {
      const metadata = sdk.createDefaultMetadata();
      const result = sdk.createAbortResult("Policy violation", metadata);

      assertEqual(result.action, "abort");
      assertEqual(result.feedback, "Policy violation");
      assertEqual(result.metadata, metadata);
    },
  );

  await runTest(
    "createRetryResult - creates retry result",
    "types",
    async () => {
      const metadata = sdk.createDefaultMetadata();
      const data = { text: "modified" };
      const result = sdk.createRetryResult("Please retry", metadata, data);

      assertEqual(result.action, "retry");
      assertEqual(result.feedback, "Please retry");
      assertEqual(result.data, data);
    },
  );
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main(): Promise<void> {
  console.log("\n");
  console.log(
    "======================================================================",
  );
  console.log("  NeuroLink I/O Processors - Continuous Test Suite");
  console.log(
    "======================================================================",
  );
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log(
    `  Config: timeout=${TEST_CONFIG.timeout}ms, verbose=${TEST_CONFIG.verbose}`,
  );
  console.log(
    "======================================================================\n",
  );

  const startTime = Date.now();

  try {
    // Run all test suites
    await testInputProcessors();
    await testOutputProcessors();
    await testProcessorPipeline();
    await testProcessorRegistry();
    await testPresets();
    await testTripwireSystem();
    await testCLICommands();
    await testErrorHandling();
    await testTypeUtilities();
  } catch (error) {
    log(
      `Fatal error: ${error instanceof Error ? error.message : String(error)}`,
      "error",
    );
    process.exitCode = 1;
  }

  const totalTime = Date.now() - startTime;

  // Print summary
  console.log("\n");
  console.log(
    "======================================================================",
  );
  console.log("  TEST SUMMARY");
  console.log(
    "======================================================================",
  );
  console.log(`  Total Tests:  ${totalTests}`);
  console.log(`  \x1b[32mPassed:       ${passedTests}\x1b[0m`);
  console.log(`  \x1b[31mFailed:       ${failedTests}\x1b[0m`);
  console.log(`  Duration:     ${totalTime}ms`);
  console.log(
    `  Pass Rate:    ${((passedTests / totalTests) * 100).toFixed(1)}%`,
  );
  console.log(
    "======================================================================",
  );

  // Print failed tests
  if (failedTests > 0) {
    console.log("\n  FAILED TESTS:");
    for (const result of testResults.filter((r) => !r.passed)) {
      console.log(`  \x1b[31m- ${result.name}\x1b[0m`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }
    console.log("");
  }

  // Print category breakdown
  console.log("\n  BY CATEGORY:");
  const categories = new Map<string, { passed: number; failed: number }>();
  for (const result of testResults) {
    const cat = categories.get(result.category) || { passed: 0, failed: 0 };
    if (result.passed) {
      cat.passed++;
    } else {
      cat.failed++;
    }
    categories.set(result.category, cat);
  }
  for (const [category, stats] of categories) {
    const color = stats.failed > 0 ? "\x1b[31m" : "\x1b[32m";
    console.log(
      `  ${color}${category}: ${stats.passed}/${stats.passed + stats.failed}\x1b[0m`,
    );
  }

  console.log(
    "\n======================================================================\n",
  );

  // Exit with appropriate code
  process.exitCode = failedTests > 0 ? 1 : 0;
}

// Run the test suite
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});

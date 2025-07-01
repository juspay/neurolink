/**
 * NeuroLink Phase 1.2 - AI Development Workflow Tools Tests
 * Comprehensive test suite for 4 AI workflow tools
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";

// Mock AI provider calls to avoid requiring real credentials
vi.mock("../lib/core/factory.js", async () => {
  const actual = await vi.importActual("../lib/core/factory.js");

  // Create mock responses based on the tool being called and input context
  const createMockResponse = (prompt: string, options: any = {}) => {
    if (
      prompt.includes("generate-test-cases") ||
      prompt.includes("test cases")
    ) {
      // Handle different test types based on context
      const testTypes = options.testTypes || ["unit"];
      const framework = options.framework || "jest";
      const testCases = [];

      if (testTypes.includes("unit")) {
        testCases.push({
          name: "should handle valid input",
          type: "unit",
          code: `test("should handle valid input", () => { expect(calculateTotal([{price: 10}])).toBe(10); });`,
          description: "Tests valid input handling",
          assertions: 1,
        });
      }

      if (testTypes.includes("edge-cases")) {
        testCases.push({
          name: "should handle edge case with null input",
          type: "edge-case",
          code: 'test("should handle null input", () => { expect(calculateTotal(null)).toBe(0); });',
          description: "Tests null input handling",
          assertions: 1,
        });
      }

      if (testTypes.includes("integration")) {
        testCases.push({
          name: "should handle async integration",
          type: "integration",
          code: 'test("should handle async integration", async () => { const result = await fetchData("url"); expect(result).toBeDefined(); });',
          description: "Tests async integration",
          assertions: 1,
        });
      }

      return JSON.stringify({
        testCases,
      });
    }

    if (prompt.includes("refactor-code") || prompt.includes("Refactor")) {
      // Handle different objectives
      const objectives = options.objectives || ["readability"];
      let refactoredCode =
        options.code ||
        "function calculateTotal(items) {\n  // Improved readability\n  if (!items) return 0;\n  return items.reduce((sum, item) => sum + item.price, 0);\n}";

      if (objectives.includes("dry-principle")) {
        refactoredCode = `// Extracted common functionality\nconst CONSTANTS = { MAX_RETRIES: 3, TIMEOUT: 5000 };\n\n${refactoredCode}`;
      }

      return JSON.stringify({
        refactoredCode,
        changes: objectives.includes("dry-principle")
          ? ["Added CONSTANTS object", "Extracted common values"]
          : ["Added null check", "Improved formatting", "Added comments"],
        improvements: objectives.map((obj: string) => `Improved ${obj}`),
        metrics: {
          linesReduced: objectives.includes("dry-principle")
            ? 2
            : objectives.length > 1
              ? 1
              : 0,
          complexityReduction: 15,
          readabilityScore: 85,
        },
      });
    }

    if (
      prompt.includes("generate-documentation") ||
      prompt.includes("documentation")
    ) {
      const docType = options.documentationType || "jsdoc";
      const detailLevel = options.detailLevel || "standard";
      const includeExamples = options.includeExamples !== false;

      let documentation = "";
      let coverage = 80;

      if (docType === "markdown") {
        documentation =
          "# processPayment\n\n## Description\nProcesses payment with given amount and currency\n\n## Parameters\n- amount: Payment amount\n- currency: Currency code";
        coverage =
          detailLevel === "comprehensive"
            ? 95
            : detailLevel === "standard"
              ? 80
              : 60;
      } else {
        documentation =
          "/**\n * @param {Array} items - Array of items with price property\n * @returns {number} Total sum of all prices\n */\nfunction calculateTotal(items)";
        coverage =
          detailLevel === "comprehensive"
            ? 95
            : detailLevel === "standard"
              ? 80
              : 60;
      }

      if (detailLevel === "minimal") {
        coverage = 60;
      }

      return JSON.stringify({
        documentation,
        sections: ["Parameters", "Returns", "Description"],
        examples: includeExamples
          ? ["calculateTotal([{price: 10}, {price: 20}]) // returns 30"]
          : [],
        coverage,
      });
    }

    if (
      prompt.includes("debug-ai-output") ||
      prompt.includes("Debug") ||
      prompt.includes("Analyze")
    ) {
      const aiOutput = options.aiOutput || "";
      const issues = [
        {
          type: "missing-error-handling",
          severity: "high" as const,
          description: "Function does not handle null or undefined input",
          location: "Function parameter validation",
        },
      ];

      // Add specific issue types based on content
      if (aiOutput.includes("TODO")) {
        issues.push({
          type: "incomplete-implementation",
          severity: "high" as const,
          description: "Implementation contains TODO markers",
          location: "Function body",
        });
      }

      return JSON.stringify({
        issues,
        suggestions: [
          "Add try-catch blocks for error handling",
          "Add input validation",
          "Add null checks",
        ],
        possibleCauses: [
          "Token limit reached",
          "Incomplete prompt context",
          "Model limitations",
        ],
        fixedOutput:
          'function getData() {\n  try {\n    if (!data) throw new Error("Data not found");\n    return data;\n  } catch (error) {\n    console.error(error);\n    return null;\n  }\n}',
      });
    }

    // Default response
    return JSON.stringify({
      result: "Mocked AI response for testing",
      success: true,
    });
  };

  return {
    ...actual,
    AIProviderFactory: {
      createProvider: vi.fn().mockResolvedValue({
        generateText: vi.fn().mockImplementation(async (options: any) => {
          const prompt = options.prompt || "";

          // Extract parameters from the prompt for context-aware responses
          const extractedOptions: any = {};

          // Parse common parameters from the structured prompts
          if (prompt.includes("test cases")) {
            const testTypesMatch = prompt.match(/Test types:\s*([^\n]+)/);
            if (testTypesMatch) {
              extractedOptions.testTypes = testTypesMatch[1]
                .split(",")
                .map((t: string) => t.trim());
            }
            const frameworkMatch = prompt.match(/Framework:\s*([^\n]+)/);
            if (frameworkMatch) {
              extractedOptions.framework = frameworkMatch[1].trim();
            }
          }

          if (prompt.includes("Refactor")) {
            const objectivesMatch = prompt.match(/Objectives:\s*([^\n]+)/);
            if (objectivesMatch) {
              extractedOptions.objectives = objectivesMatch[1]
                .split(",")
                .map((o: string) => o.trim());
            }
            // Extract the original code being refactored
            const codeMatch = prompt.match(/```\w*\n([\s\S]*?)\n```/);
            if (codeMatch) {
              extractedOptions.code = codeMatch[1];
            }
          }

          if (prompt.includes("documentation")) {
            const docTypeMatch = prompt.match(/documentation format/);
            if (prompt.includes("markdown")) {
              extractedOptions.documentationType = "markdown";
            }
            if (prompt.includes("minimal")) {
              extractedOptions.detailLevel = "minimal";
            } else if (prompt.includes("comprehensive")) {
              extractedOptions.detailLevel = "comprehensive";
            }
            if (prompt.includes("Include examples: false")) {
              extractedOptions.includeExamples = false;
            }
          }

          if (prompt.includes("debug") || prompt.includes("Analyze")) {
            // Extract the AI output being debugged
            const aiOutputMatch = prompt.match(
              /AI Output to Debug:\n```\n([\s\S]*?)\n```/,
            );
            if (aiOutputMatch) {
              extractedOptions.aiOutput = aiOutputMatch[1];
            }
          }

          const mockResponse = createMockResponse(prompt, extractedOptions);
          return {
            text: mockResponse, // The workflow tools expect 'text' not 'content'
            content: mockResponse, // Keep both for compatibility
            provider: "test-provider",
            usage: {
              promptTokens: 100,
              completionTokens: 200,
              totalTokens: 300,
            },
            responseTime: 500,
          };
        }),
      }),
    },
  };
});

// Mock getBestProvider to return a consistent provider
vi.mock("../lib/utils/providerUtils.js", async () => {
  const actual = await vi.importActual("../lib/utils/providerUtils.js");
  return {
    ...actual,
    getBestProvider: vi.fn().mockResolvedValue("openai"),
  };
});

import { aiCoreServer } from "../lib/mcp/servers/ai-providers/ai-core-server.js";
import { ContextManager } from "../lib/mcp/context-manager.js";
import type { MCPToolRegistry } from "../lib/mcp/registry.js";
import { MCPOrchestrator } from "../lib/mcp/orchestrator.js";
import type { NeuroLinkExecutionContext } from "../lib/mcp/factory.js";
import { AIProviderFactory } from "../lib/core/factory.js";
import * as providerUtils from "../lib/utils/providerUtils.js";

describe("AI Development Workflow Tools - Phase 1.2", () => {
  let contextManager: ContextManager;
  let registry: MCPToolRegistry;
  let orchestrator: MCPOrchestrator;
  let context: NeuroLinkExecutionContext;

  beforeAll(async () => {
    // Initialize MCP components once for all tests
    contextManager = new ContextManager();
    const { MCPRegistry } = await import("../lib/mcp/registry.js");
    registry = new MCPRegistry();
    orchestrator = new MCPOrchestrator(registry as any, contextManager);

    // Register AI Core Server once (check if not already registered)
    try {
      await registry.registerServer(aiCoreServer);
    } catch (error) {
      // Server already registered, which is fine for testing
      if (
        !(error instanceof Error) ||
        !error.message?.includes("already registered")
      ) {
        throw error;
      }
    }

    // Create execution context
    context = contextManager.createContext({
      sessionId: "test-session-workflow",
      userId: "test-user",
      permissions: ["read", "write", "analytics", "optimize", "benchmark"],
      aiProvider: "test-provider",
      environmentType: "development",
    });
  });

  beforeEach(() => {
    // No need to recreate components, just use existing ones
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("generate-test-cases Tool", () => {
    it("should generate unit test cases for code", async () => {
      const result = await orchestrator.executeTool(
        "generate-test-cases",
        {
          codeFunction:
            "function calculateTotal(items) { return items.reduce((sum, item) => sum + item.price, 0); }",
          testTypes: ["unit"],
          framework: "jest",
          coverageTarget: 80,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.testCases).toBeInstanceOf(Array);
      expect(result.data.testCases.length).toBeGreaterThan(0);
      expect(result.data.framework).toBe("jest");
      expect(result.data.coverageEstimate).toBeGreaterThanOrEqual(80);
    });

    it("should generate edge case tests", async () => {
      const result = await orchestrator.executeTool(
        "generate-test-cases",
        {
          codeFunction: "function divide(a, b) { return a / b; }",
          testTypes: ["edge-cases"],
          framework: "mocha",
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.testCases).toBeInstanceOf(Array);
      const edgeCaseTest = result.data.testCases.find(
        (tc: any) => tc.type === "edge-case",
      );
      expect(edgeCaseTest).toBeDefined();
      expect(edgeCaseTest.code).toContain("null");
    });

    it("should generate async integration tests when requested", async () => {
      const result = await orchestrator.executeTool(
        "generate-test-cases",
        {
          codeFunction:
            "async function fetchData(url) { const response = await fetch(url); return response.json(); }",
          testTypes: ["integration"],
          includeAsyncTests: true,
          framework: "vitest",
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.testCases).toBeInstanceOf(Array);
      const asyncTest = result.data.testCases.find(
        (tc: any) => tc.type === "integration",
      );
      expect(asyncTest).toBeDefined();
      expect(asyncTest.code).toContain("async");
      expect(asyncTest.code).toContain("await");
    });

    it("should handle invalid input gracefully", async () => {
      const result = await orchestrator.executeTool(
        "generate-test-cases",
        {
          codeFunction: "", // Empty code
          testTypes: ["unit"],
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 1 character");
    });

    it("should respect all test parameters", async () => {
      const result = await orchestrator.executeTool(
        "generate-test-cases",
        {
          codeFunction:
            'function validate(input) { return typeof input === "string"; }',
          testTypes: ["unit", "edge-cases", "integration"],
          framework: "pytest",
          coverageTarget: 95,
          includeAsyncTests: false,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.framework).toBe("pytest");
      expect(result.data.totalTests).toBeGreaterThanOrEqual(2);
      expect(result.metadata?.executionTime).toBeDefined();
    });
  });

  describe("refactor-code Tool", () => {
    it("should refactor code for readability", async () => {
      const result = await orchestrator.executeTool(
        "refactor-code",
        {
          code: "function calc(x,y){return x+y;}",
          language: "javascript",
          objectives: ["readability"],
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.refactoredCode).toBeDefined();
      expect(result.data.changes).toBeInstanceOf(Array);
      expect(result.data.improvements).toContain("Improved readability");
      expect(result.data.metrics.readabilityScore).toBeGreaterThan(80);
    });

    it("should apply DRY principle refactoring", async () => {
      const result = await orchestrator.executeTool(
        "refactor-code",
        {
          code: "const retryLimit = 3; const timeout = 5000;",
          objectives: ["dry-principle"],
          preserveFunctionality: true,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.refactoredCode).toContain("CONSTANTS");
      expect(result.data.improvements).toContain("Improved dry-principle");
    });

    it("should refactor for multiple objectives", async () => {
      const result = await orchestrator.executeTool(
        "refactor-code",
        {
          code: "function processData(data) { /* complex logic */ }",
          objectives: ["readability", "maintainability", "testability"],
          styleGuide: "airbnb",
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.improvements.length).toBe(3);
      expect(result.data.metrics.complexityReduction).toBeGreaterThan(0);
      expect(result.data.metrics.linesReduced).toBeGreaterThan(0);
    });

    it("should handle Python code refactoring", async () => {
      const result = await orchestrator.executeTool(
        "refactor-code",
        {
          code: 'def calculate_total(items): return sum([item["price"] for item in items])',
          language: "python",
          objectives: ["performance", "readability"],
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.refactoredCode).toBeDefined();
      expect(result.data.changes.length).toBeGreaterThan(0);
    });

    it("should validate required code input", async () => {
      const result = await orchestrator.executeTool(
        "refactor-code",
        {
          code: "",
          objectives: ["readability"],
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 1 character");
    });
  });

  describe("generate-documentation Tool", () => {
    it("should generate JSDoc documentation", async () => {
      const result = await orchestrator.executeTool(
        "generate-documentation",
        {
          code: "function getUserData(userId, options) { /* implementation */ }",
          documentationType: "jsdoc",
          includeExamples: true,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.documentation).toContain("@param");
      expect(result.data.documentation).toContain("@returns");
      expect(result.data.sections).toContain("Parameters");
      expect(result.data.examples.length).toBeGreaterThan(0);
    });

    it("should generate Markdown documentation", async () => {
      const result = await orchestrator.executeTool(
        "generate-documentation",
        {
          code: "async function processPayment(amount, currency) { /* implementation */ }",
          documentationType: "markdown",
          detailLevel: "comprehensive",
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.documentation).toContain("# processPayment");
      expect(result.data.documentation).toContain("## Description");
      expect(result.data.documentation).toContain("## Parameters");
      expect(result.data.coverage).toBe(95);
    });

    it("should generate minimal documentation when requested", async () => {
      const result = await orchestrator.executeTool(
        "generate-documentation",
        {
          code: "const add = (a, b) => a + b;",
          detailLevel: "minimal",
          includeExamples: false,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.coverage).toBe(60);
      expect(result.data.examples.length).toBe(0);
    });

    it("should handle different documentation types", async () => {
      const docTypes = ["jsdoc", "markdown", "sphinx", "doxygen", "readme"];

      for (const docType of docTypes.slice(0, 2)) {
        // Test first two to save time
        const result = await orchestrator.executeTool(
          "generate-documentation",
          {
            code: "function test() { return true; }",
            documentationType: docType,
          },
          context,
        );

        expect(result.success).toBe(true);
        expect(result.data.documentation).toBeDefined();
      }
    });

    it("should validate code input", async () => {
      const result = await orchestrator.executeTool(
        "generate-documentation",
        {
          code: "",
          documentationType: "jsdoc",
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 1 character");
    });
  });

  describe("debug-ai-output Tool", () => {
    it("should debug code output and find issues", async () => {
      const result = await orchestrator.executeTool(
        "debug-ai-output",
        {
          aiOutput: "function getData() { return data; }",
          expectedBehavior: "Should handle errors and validate input",
          outputType: "code",
          includeFixSuggestions: true,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.issues).toBeInstanceOf(Array);
      expect(result.data.issues.length).toBeGreaterThan(0);
      expect(result.data.issues[0].type).toBe("missing-error-handling");
      expect(result.data.suggestions).toBeInstanceOf(Array);
      expect(result.data.suggestions.length).toBeGreaterThan(0);
    });

    it("should detect incomplete code implementation", async () => {
      const result = await orchestrator.executeTool(
        "debug-ai-output",
        {
          aiOutput: "function calc() { /* TODO */ }",
          expectedBehavior: "Complete calculation function",
          outputType: "code",
        },
        context,
      );

      expect(result.success).toBe(true);
      const incompleteIssue = result.data.issues.find(
        (issue: any) => issue.type === "incomplete-implementation",
      );
      expect(incompleteIssue).toBeDefined();
      expect(incompleteIssue.severity).toBe("high");
      expect(result.data.possibleCauses).toContain("Token limit reached");
    });

    it("should analyze text output for consistency", async () => {
      const result = await orchestrator.executeTool(
        "debug-ai-output",
        {
          aiOutput:
            "This is SOME mixed Case TEXT with inconsistent formatting.",
          expectedBehavior: "Consistent formatting throughout",
          outputType: "text",
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.issues).toBeInstanceOf(Array);
      // May or may not find issues based on random check
      expect(result.data.suggestions).toBeInstanceOf(Array);
    });

    it("should provide fix suggestions when requested", async () => {
      const result = await orchestrator.executeTool(
        "debug-ai-output",
        {
          aiOutput: "const result = await fetch(url);",
          expectedBehavior: "Robust API call with error handling",
          outputType: "code",
          includeFixSuggestions: true,
          context: "API integration code",
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.suggestions).toContain(
        "Add try-catch blocks for error handling",
      );
      expect(result.data.fixedOutput).toBeDefined();
    });

    it("should validate required inputs", async () => {
      const result = await orchestrator.executeTool(
        "debug-ai-output",
        {
          aiOutput: "",
          expectedBehavior: "Some behavior",
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 1 character");
    });

    it("should handle different output types", async () => {
      const outputTypes = ["code", "text", "structured-data", "conversation"];

      for (const outputType of outputTypes) {
        const result = await orchestrator.executeTool(
          "debug-ai-output",
          {
            aiOutput: "Sample output for testing",
            expectedBehavior: "Correct behavior",
            outputType,
          },
          context,
        );

        expect(result.success).toBe(true);
        expect(result.metadata?.toolName).toBe("debug-ai-output");
      }
    });
  });

  describe("Integration Tests - Workflow Pipeline", () => {
    it("should execute a complete development workflow", async () => {
      // Step 1: Generate test cases
      const testResult = await orchestrator.executeTool(
        "generate-test-cases",
        {
          codeFunction:
            "function validateEmail(email) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); }",
          testTypes: ["unit", "edge-cases"],
          framework: "jest",
        },
        context,
      );

      expect(testResult.success).toBe(true);

      // Step 2: Refactor the code
      const refactorResult = await orchestrator.executeTool(
        "refactor-code",
        {
          code: "function validateEmail(email) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); }",
          objectives: ["readability", "maintainability"],
        },
        context,
      );

      expect(refactorResult.success).toBe(true);

      // Step 3: Generate documentation
      const docResult = await orchestrator.executeTool(
        "generate-documentation",
        {
          code: refactorResult.data.refactoredCode,
          documentationType: "jsdoc",
          includeExamples: true,
        },
        context,
      );

      expect(docResult.success).toBe(true);

      // Step 4: Debug the output
      const debugResult = await orchestrator.executeTool(
        "debug-ai-output",
        {
          aiOutput: refactorResult.data.refactoredCode,
          expectedBehavior: "Email validation with proper error handling",
          outputType: "code",
        },
        context,
      );

      expect(debugResult.success).toBe(true);
    });

    it("should track execution metrics across workflow", async () => {
      const tools = [
        "generate-test-cases",
        "refactor-code",
        "generate-documentation",
        "debug-ai-output",
      ];
      const totalStartTime = Date.now();
      let totalExecutionTime = 0;

      for (const tool of tools) {
        const params = {
          "generate-test-cases": {
            codeFunction: "function test() {}",
            testTypes: ["unit"],
          },
          "refactor-code": {
            code: "function test() {}",
            objectives: ["readability"],
          },
          "generate-documentation": { code: "function test() {}" },
          "debug-ai-output": {
            aiOutput: "function test() {}",
            expectedBehavior: "test",
          },
        }[tool];

        const result = await orchestrator.executeTool(tool, params!, context);
        expect(result.success).toBe(true);
        expect(result.metadata?.executionTime).toBeDefined();
        if (result.metadata?.executionTime) {
          totalExecutionTime += result.metadata.executionTime;
        }
      }

      const actualTotalTime = Date.now() - totalStartTime;
      expect(totalExecutionTime).toBeLessThanOrEqual(actualTotalTime);
    });
  });

  describe("Performance and Error Handling", () => {
    it("should handle concurrent tool executions", async () => {
      const promises = [
        orchestrator.executeTool(
          "generate-test-cases",
          {
            codeFunction: "function a() { return 1; }",
            testTypes: ["unit"],
          },
          context,
        ),
        orchestrator.executeTool(
          "refactor-code",
          {
            code: "function b() { return 2; }",
            objectives: ["readability"],
          },
          context,
        ),
        orchestrator.executeTool(
          "generate-documentation",
          {
            code: "function c() { return 3; }",
          },
          context,
        ),
        orchestrator.executeTool(
          "debug-ai-output",
          {
            aiOutput: "function d() { return 4; }",
            expectedBehavior: "Return 4",
          },
          context,
        ),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it("should enforce permissions", async () => {
      // Create context without write permission
      const restrictedContext = contextManager.createContext({
        sessionId: "restricted-session",
        userId: "restricted-user",
        permissions: ["read"], // Missing 'write' permission
        aiProvider: "test-provider",
        environmentType: "development",
      });

      const result = await orchestrator.executeTool(
        "generate-test-cases",
        {
          codeFunction: "function test() {}",
          testTypes: ["unit"],
        },
        restrictedContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("permission");
    });

    it("should validate all tool schemas", () => {
      const tools = [
        "generate-test-cases",
        "refactor-code",
        "generate-documentation",
        "debug-ai-output",
      ];

      tools.forEach((toolName) => {
        const toolInfo = registry.getToolInfo(toolName);
        expect(toolInfo).toBeDefined();
        expect(toolInfo?.tool).toBeDefined();
        expect(toolInfo?.tool.inputSchema).toBeDefined();
        expect(toolInfo?.tool.permissions).toBeDefined();
        expect(toolInfo?.tool.version).toMatch(/^[12]\.0\.0$/); // Accept both 1.0.0 and 2.0.0
        expect(toolInfo?.tool.category).toBe("ai-workflow");
      });
    });
  });
});

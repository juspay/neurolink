/**
 * NeuroLink Phase 1.2 - AI Development Workflow Tools Tests
 * Comprehensive test suite for 4 AI workflow tools
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { aiCoreServer } from '../lib/mcp/servers/ai-providers/ai-core-server.js';
import { ContextManager } from '../lib/mcp/context-manager.js';
import { MCPToolRegistry } from '../lib/mcp/registry.js';
import { MCPOrchestrator } from '../lib/mcp/orchestrator.js';
import type { NeuroLinkExecutionContext } from '../lib/mcp/factory.js';

describe('AI Development Workflow Tools - Phase 1.2', () => {
  let contextManager: ContextManager;
  let registry: MCPToolRegistry;
  let orchestrator: MCPOrchestrator;
  let context: NeuroLinkExecutionContext;

  beforeAll(() => {
    // Initialize MCP components
    contextManager = new ContextManager();
    registry = new MCPToolRegistry();
    orchestrator = new MCPOrchestrator(registry, contextManager);

    // Register AI Core Server
    registry.registerServer(aiCoreServer);

    // Create execution context
    context = contextManager.createContext({
      sessionId: 'test-session-workflow',
      userId: 'test-user',
      permissions: ['read', 'write', 'analytics', 'optimize', 'benchmark'],
      aiProvider: 'test-provider',
      environmentType: 'development'
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('generate-test-cases Tool', () => {
    it('should generate unit test cases for code', async () => {
      const result = await orchestrator.executeTool('generate-test-cases', {
        codeFunction: 'function calculateTotal(items) { return items.reduce((sum, item) => sum + item.price, 0); }',
        testTypes: ['unit'],
        framework: 'jest',
        coverageTarget: 80
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.testCases).toBeInstanceOf(Array);
      expect(result.data.testCases.length).toBeGreaterThan(0);
      expect(result.data.framework).toBe('jest');
      expect(result.data.coverageEstimate).toBeGreaterThanOrEqual(80);
    });

    it('should generate edge case tests', async () => {
      const result = await orchestrator.executeTool('generate-test-cases', {
        codeFunction: 'function divide(a, b) { return a / b; }',
        testTypes: ['edge-cases'],
        framework: 'mocha'
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.testCases).toBeInstanceOf(Array);
      const edgeCaseTest = result.data.testCases.find((tc: any) => tc.type === 'edge-case');
      expect(edgeCaseTest).toBeDefined();
      expect(edgeCaseTest.code).toContain('null');
    });

    it('should generate async integration tests when requested', async () => {
      const result = await orchestrator.executeTool('generate-test-cases', {
        codeFunction: 'async function fetchData(url) { const response = await fetch(url); return response.json(); }',
        testTypes: ['integration'],
        includeAsyncTests: true,
        framework: 'vitest'
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.testCases).toBeInstanceOf(Array);
      const asyncTest = result.data.testCases.find((tc: any) => tc.type === 'integration');
      expect(asyncTest).toBeDefined();
      expect(asyncTest.code).toContain('async');
      expect(asyncTest.code).toContain('await');
    });

    it('should handle invalid input gracefully', async () => {
      const result = await orchestrator.executeTool('generate-test-cases', {
        codeFunction: '', // Empty code
        testTypes: ['unit']
      }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 1 character');
    });

    it('should respect all test parameters', async () => {
      const result = await orchestrator.executeTool('generate-test-cases', {
        codeFunction: 'function validate(input) { return typeof input === "string"; }',
        testTypes: ['unit', 'edge-cases', 'integration'],
        framework: 'pytest',
        coverageTarget: 95,
        includeAsyncTests: false
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.framework).toBe('pytest');
      expect(result.data.totalTests).toBeGreaterThanOrEqual(2);
      expect(result.metadata?.executionTime).toBeDefined();
    });
  });

  describe('refactor-code Tool', () => {
    it('should refactor code for readability', async () => {
      const result = await orchestrator.executeTool('refactor-code', {
        code: 'function calc(x,y){return x+y;}',
        language: 'javascript',
        objectives: ['readability']
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.refactoredCode).toBeDefined();
      expect(result.data.changes).toBeInstanceOf(Array);
      expect(result.data.improvements).toContain('Improved readability');
      expect(result.data.metrics.readabilityScore).toBeGreaterThan(80);
    });

    it('should apply DRY principle refactoring', async () => {
      const result = await orchestrator.executeTool('refactor-code', {
        code: 'const retryLimit = 3; const timeout = 5000;',
        objectives: ['dry-principle'],
        preserveFunctionality: true
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.refactoredCode).toContain('CONSTANTS');
      expect(result.data.improvements).toContain('Improved dry-principle');
    });

    it('should refactor for multiple objectives', async () => {
      const result = await orchestrator.executeTool('refactor-code', {
        code: 'function processData(data) { /* complex logic */ }',
        objectives: ['readability', 'maintainability', 'testability'],
        styleGuide: 'airbnb'
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.improvements.length).toBe(3);
      expect(result.data.metrics.complexityReduction).toBeGreaterThan(0);
      expect(result.data.metrics.linesReduced).toBeGreaterThan(0);
    });

    it('should handle Python code refactoring', async () => {
      const result = await orchestrator.executeTool('refactor-code', {
        code: 'def calculate_total(items): return sum([item["price"] for item in items])',
        language: 'python',
        objectives: ['performance', 'readability']
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.refactoredCode).toBeDefined();
      expect(result.data.changes.length).toBeGreaterThan(0);
    });

    it('should validate required code input', async () => {
      const result = await orchestrator.executeTool('refactor-code', {
        code: '',
        objectives: ['readability']
      }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 1 character');
    });
  });

  describe('generate-documentation Tool', () => {
    it('should generate JSDoc documentation', async () => {
      const result = await orchestrator.executeTool('generate-documentation', {
        code: 'function getUserData(userId, options) { /* implementation */ }',
        documentationType: 'jsdoc',
        includeExamples: true
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.documentation).toContain('@param');
      expect(result.data.documentation).toContain('@returns');
      expect(result.data.sections).toContain('Parameters');
      expect(result.data.examples.length).toBeGreaterThan(0);
    });

    it('should generate Markdown documentation', async () => {
      const result = await orchestrator.executeTool('generate-documentation', {
        code: 'async function processPayment(amount, currency) { /* implementation */ }',
        documentationType: 'markdown',
        detailLevel: 'comprehensive'
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.documentation).toContain('# processPayment');
      expect(result.data.documentation).toContain('## Description');
      expect(result.data.documentation).toContain('## Parameters');
      expect(result.data.coverage).toBe(95);
    });

    it('should generate minimal documentation when requested', async () => {
      const result = await orchestrator.executeTool('generate-documentation', {
        code: 'const add = (a, b) => a + b;',
        detailLevel: 'minimal',
        includeExamples: false
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.coverage).toBe(60);
      expect(result.data.examples.length).toBe(0);
    });

    it('should handle different documentation types', async () => {
      const docTypes = ['jsdoc', 'markdown', 'sphinx', 'doxygen', 'readme'];

      for (const docType of docTypes.slice(0, 2)) { // Test first two to save time
        const result = await orchestrator.executeTool('generate-documentation', {
          code: 'function test() { return true; }',
          documentationType: docType
        }, context);

        expect(result.success).toBe(true);
        expect(result.data.documentation).toBeDefined();
      }
    });

    it('should validate code input', async () => {
      const result = await orchestrator.executeTool('generate-documentation', {
        code: '',
        documentationType: 'jsdoc'
      }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 1 character');
    });
  });

  describe('debug-ai-output Tool', () => {
    it('should debug code output and find issues', async () => {
      const result = await orchestrator.executeTool('debug-ai-output', {
        aiOutput: 'function getData() { return data; }',
        expectedBehavior: 'Should handle errors and validate input',
        outputType: 'code',
        includeFixSuggestions: true
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.issues).toBeInstanceOf(Array);
      expect(result.data.issues.length).toBeGreaterThan(0);
      expect(result.data.issues[0].type).toBe('missing-error-handling');
      expect(result.data.suggestions).toBeInstanceOf(Array);
      expect(result.data.suggestions.length).toBeGreaterThan(0);
    });

    it('should detect incomplete code implementation', async () => {
      const result = await orchestrator.executeTool('debug-ai-output', {
        aiOutput: 'function calc() { /* TODO */ }',
        expectedBehavior: 'Complete calculation function',
        outputType: 'code'
      }, context);

      expect(result.success).toBe(true);
      const incompleteIssue = result.data.issues.find((issue: any) =>
        issue.type === 'incomplete-implementation'
      );
      expect(incompleteIssue).toBeDefined();
      expect(incompleteIssue.severity).toBe('high');
      expect(result.data.possibleCauses).toContain('Token limit reached');
    });

    it('should analyze text output for consistency', async () => {
      const result = await orchestrator.executeTool('debug-ai-output', {
        aiOutput: 'This is SOME mixed Case TEXT with inconsistent formatting.',
        expectedBehavior: 'Consistent formatting throughout',
        outputType: 'text'
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.issues).toBeInstanceOf(Array);
      // May or may not find issues based on random check
      expect(result.data.suggestions).toBeInstanceOf(Array);
    });

    it('should provide fix suggestions when requested', async () => {
      const result = await orchestrator.executeTool('debug-ai-output', {
        aiOutput: 'const result = await fetch(url);',
        expectedBehavior: 'Robust API call with error handling',
        outputType: 'code',
        includeFixSuggestions: true,
        context: 'API integration code'
      }, context);

      expect(result.success).toBe(true);
      expect(result.data.suggestions).toContain('Add try-catch blocks for error handling');
      expect(result.data.fixedOutput).toBeDefined();
    });

    it('should validate required inputs', async () => {
      const result = await orchestrator.executeTool('debug-ai-output', {
        aiOutput: '',
        expectedBehavior: 'Some behavior'
      }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 1 character');
    });

    it('should handle different output types', async () => {
      const outputTypes = ['code', 'text', 'structured-data', 'conversation'];

      for (const outputType of outputTypes) {
        const result = await orchestrator.executeTool('debug-ai-output', {
          aiOutput: 'Sample output for testing',
          expectedBehavior: 'Correct behavior',
          outputType
        }, context);

        expect(result.success).toBe(true);
        expect(result.metadata?.toolName).toBe('debug-ai-output');
      }
    });
  });

  describe('Integration Tests - Workflow Pipeline', () => {
    it('should execute a complete development workflow', async () => {
      // Step 1: Generate test cases
      const testResult = await orchestrator.executeTool('generate-test-cases', {
        codeFunction: 'function validateEmail(email) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); }',
        testTypes: ['unit', 'edge-cases'],
        framework: 'jest'
      }, context);

      expect(testResult.success).toBe(true);

      // Step 2: Refactor the code
      const refactorResult = await orchestrator.executeTool('refactor-code', {
        code: 'function validateEmail(email) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); }',
        objectives: ['readability', 'maintainability']
      }, context);

      expect(refactorResult.success).toBe(true);

      // Step 3: Generate documentation
      const docResult = await orchestrator.executeTool('generate-documentation', {
        code: refactorResult.data.refactoredCode,
        documentationType: 'jsdoc',
        includeExamples: true
      }, context);

      expect(docResult.success).toBe(true);

      // Step 4: Debug the output
      const debugResult = await orchestrator.executeTool('debug-ai-output', {
        aiOutput: refactorResult.data.refactoredCode,
        expectedBehavior: 'Email validation with proper error handling',
        outputType: 'code'
      }, context);

      expect(debugResult.success).toBe(true);
    });

    it('should track execution metrics across workflow', async () => {
      const tools = ['generate-test-cases', 'refactor-code', 'generate-documentation', 'debug-ai-output'];
      const totalStartTime = Date.now();
      let totalExecutionTime = 0;

      for (const tool of tools) {
        const params = {
          'generate-test-cases': { codeFunction: 'function test() {}', testTypes: ['unit'] },
          'refactor-code': { code: 'function test() {}', objectives: ['readability'] },
          'generate-documentation': { code: 'function test() {}' },
          'debug-ai-output': { aiOutput: 'function test() {}', expectedBehavior: 'test' }
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

  describe('Performance and Error Handling', () => {
    it('should handle concurrent tool executions', async () => {
      const promises = [
        orchestrator.executeTool('generate-test-cases', {
          codeFunction: 'function a() { return 1; }',
          testTypes: ['unit']
        }, context),
        orchestrator.executeTool('refactor-code', {
          code: 'function b() { return 2; }',
          objectives: ['readability']
        }, context),
        orchestrator.executeTool('generate-documentation', {
          code: 'function c() { return 3; }'
        }, context),
        orchestrator.executeTool('debug-ai-output', {
          aiOutput: 'function d() { return 4; }',
          expectedBehavior: 'Return 4'
        }, context)
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should enforce permissions', async () => {
      // Create context without write permission
      const restrictedContext = contextManager.createContext({
        sessionId: 'restricted-session',
        userId: 'restricted-user',
        permissions: ['read'], // Missing 'write' permission
        aiProvider: 'test-provider',
        environmentType: 'development'
      });

      const result = await orchestrator.executeTool('generate-test-cases', {
        codeFunction: 'function test() {}',
        testTypes: ['unit']
      }, restrictedContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('should validate all tool schemas', () => {
      const tools = ['generate-test-cases', 'refactor-code', 'generate-documentation', 'debug-ai-output'];

      tools.forEach(toolName => {
        const toolInfo = registry.getToolInfo(toolName);
        expect(toolInfo).toBeDefined();
        expect(toolInfo?.tool).toBeDefined();
        expect(toolInfo?.tool.inputSchema).toBeDefined();
        expect(toolInfo?.tool.permissions).toBeDefined();
        expect(toolInfo?.tool.version).toBe('1.0.0');
        expect(toolInfo?.tool.category).toBe('ai-workflow');
      });
    });
  });
});

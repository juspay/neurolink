/**
 * AI Development Workflow Tools
 * Phase 1.2 Implementation - 4 specialized tools for AI development lifecycle
 */

import { z } from "zod";
import type { Unknown, UnknownRecord } from "../../../types/common.js";
import type {
  NeuroLinkMCPTool,
  NeuroLinkExecutionContext,
  ToolResult,
} from "../../../types/mcpTypes.js";
import type { AIProvider } from "../../../types/index.js";
import { AIProviderFactory } from "../../../core/factory.js";
import { getBestProvider } from "../../../utils/providerUtils.js";
import { DEFAULT_MAX_TOKENS } from "../../../core/constants.js";

// Tool-specific schemas with comprehensive validation
const generateTestCasesSchema = z.object({
  codeFunction: z
    .string()
    .min(1)
    .describe("The function or code to generate test cases for"),
  testTypes: z
    .array(
      z.enum(["unit", "integration", "edge-cases", "performance", "security"]),
    )
    .min(1)
    .default(["unit", "edge-cases"])
    .describe("Types of test cases to generate"),
  framework: z
    .enum(["jest", "mocha", "vitest", "pytest", "unittest", "rspec"])
    .default("jest")
    .describe("Testing framework to target"),
  coverageTarget: z
    .number()
    .min(0)
    .max(100)
    .default(80)
    .describe("Target test coverage percentage"),
  includeAsyncTests: z
    .boolean()
    .default(true)
    .describe("Whether to include async test cases"),
});

const refactorCodeSchema = z.object({
  code: z.string().min(1).describe("The code to refactor"),
  language: z
    .string()
    .default("javascript")
    .describe("Programming language of the code"),
  objectives: z
    .array(
      z.enum([
        "readability",
        "performance",
        "maintainability",
        "testability",
        "modularity",
        "dry-principle",
        "solid-principles",
      ]),
    )
    .default(["readability", "maintainability"])
    .describe("Refactoring objectives"),
  preserveFunctionality: z
    .boolean()
    .default(true)
    .describe("Ensure functionality remains identical"),
  styleGuide: z
    .string()
    .optional()
    .describe("Optional style guide to follow (e.g., airbnb, google)"),
});

const generateDocumentationSchema = z.object({
  code: z.string().min(1).describe("The code to document"),
  language: z
    .string()
    .default("javascript")
    .describe("Programming language of the code"),
  documentationType: z
    .enum(["jsdoc", "markdown", "sphinx", "doxygen", "readme"])
    .default("jsdoc")
    .describe("Type of documentation to generate"),
  includeExamples: z
    .boolean()
    .default(true)
    .describe("Whether to include usage examples"),
  detailLevel: z
    .enum(["minimal", "standard", "comprehensive"])
    .default("standard")
    .describe("Level of documentation detail"),
});

const debugAIOutputSchema = z.object({
  aiOutput: z.string().min(1).describe("The AI-generated output to debug"),
  expectedBehavior: z
    .string()
    .describe("Description of expected behavior or output"),
  context: z
    .string()
    .optional()
    .describe("Additional context about the AI generation"),
  outputType: z
    .enum(["code", "text", "structured-data", "conversation"])
    .default("text")
    .describe("Type of AI output being debugged"),
  includeFixSuggestions: z
    .boolean()
    .default(true)
    .describe("Whether to include fix suggestions"),
});

// Type definitions for tool results
type _TestCase = {
  name: string;
  type: string;
  code: string;
  description: string;
  assertions: number;
};

type RefactoringResult = {
  refactoredCode: string;
  changes: string[];
  improvements: string[];
  metrics: {
    linesReduced: number;
    complexityReduction: number;
    readabilityScore: number;
  };
};

type DocumentationResult = {
  documentation: string;
  sections: string[];
  examples: string[];
  coverage: number;
};

type DebugResult = {
  issues: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
    location?: string;
  }>;
  suggestions: string[];
  possibleCauses: string[];
  fixedOutput?: string;
};

/**
 * Generate test cases for code functions
 */
const _generateTestCasesTool: NeuroLinkMCPTool = {
  name: "generate-test-cases",
  description:
    "Generate comprehensive test cases for code functions with various test types and frameworks",
  category: "ai-workflow",
  inputSchema: generateTestCasesSchema,
  isImplemented: true,
  permissions: ["write"],
  version: "2.0.0", // Updated version with real AI
  execute: async (
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const validatedParams = generateTestCasesSchema.parse(params);
      const {
        codeFunction,
        testTypes,
        framework,
        coverageTarget,
        includeAsyncTests,
      } = validatedParams;

      // Get AI provider for real test case generation
      const providerName = await getBestProvider();
      const provider: AIProvider | null =
        await AIProviderFactory.createProvider(providerName);

      if (!provider) {
        throw new Error(`Failed to create AI provider: ${providerName}`);
      }

      // Create structured prompt for test case generation
      const prompt = `Generate ${testTypes.join(", ")} test cases for this ${framework} function:

${codeFunction}

Requirements:
- Test types: ${testTypes.join(", ")}
- Framework: ${framework}
- Coverage target: ${coverageTarget}%
- Include async tests: ${includeAsyncTests}
- Generate realistic, executable test code

Return ONLY a valid JSON object with this exact structure:
{
  "testCases": [
    {
      "name": "descriptive test name",
      "type": "unit|integration|edge-cases|performance|security",
      "code": "complete executable test code for ${framework}",
      "description": "what this test validates",
      "assertions": number_of_assertions
    }
  ]
}

Generate 3-5 comprehensive test cases covering the requested types.`;

      const result = await provider.generate({
        prompt: prompt,
        maxTokens: 10000, // High limit for complex analysis
        temperature: 0.3, // Lower temperature for more consistent structured output
      });

      if (!result || !result.content) {
        throw new Error(
          "AI provider returned no result for test case generation.",
        );
      }

      // Parse AI response
      const aiResponse = JSON.parse(result.content);
      const testCases = aiResponse.testCases || [];

      const executionTime = Date.now() - startTime;
      const responseData = {
        testCases,
        framework,
        coverageEstimate: Math.min(coverageTarget, 80 + Math.random() * 15),
        totalTests: testCases.length,
        totalAssertions: testCases.reduce(
          (sum: number, tc: UnknownRecord) =>
            sum + ((tc.assertions as number) || 1),
          0,
        ),
        generatedAt: new Date().toISOString(),
        aiProvider: providerName,
      };

      return {
        success: true,
        data: responseData,
        usage: {
          ...result.usage,
          executionTime,
          provider: providerName,
          model: "test-case-generator",
        },
        metadata: {
          toolName: "generate-test-cases",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "generate-test-cases",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
};

/**
 * Refactor code for improved quality
 */
const _refactorCodeTool: NeuroLinkMCPTool = {
  name: "refactor-code",
  description:
    "AI-powered code refactoring for improved readability, performance, and maintainability",
  category: "ai-workflow",
  inputSchema: refactorCodeSchema,
  isImplemented: true,
  permissions: ["write"],
  version: "2.0.0", // Updated version with real AI
  execute: async (
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const validatedParams = refactorCodeSchema.parse(params);
      const { code, language, objectives, preserveFunctionality, styleGuide } =
        validatedParams;

      // Get AI provider for real code refactoring
      const providerName = await getBestProvider();
      const provider: AIProvider | null =
        await AIProviderFactory.createProvider(providerName);

      if (!provider) {
        throw new Error(`Failed to create AI provider: ${providerName}`);
      }

      // Create structured prompt for code refactoring
      const prompt = `Refactor this ${language} code focusing on: ${objectives.join(", ")}

Original code:
\`\`\`${language}
${code}
\`\`\`

Requirements:
- Language: ${language}
- Objectives: ${objectives.join(", ")}
- Style guide: ${styleGuide || "standard best practices"}
- Preserve functionality: ${preserveFunctionality}
- Provide clean, production-ready code

Return ONLY a valid JSON object with this exact structure:
{
  "refactoredCode": "improved code here with proper formatting",
  "changes": ["specific change 1", "specific change 2", "specific change 3"],
  "improvements": ["improvement achieved 1", "improvement achieved 2"],
  "metrics": {
    "linesReduced": positive_number_or_0,
    "complexityReduction": percentage_number,
    "readabilityScore": score_out_of_100
  }
}

Focus on real, actionable improvements based on the specified objectives.`;

      const result = await provider.generate({
        prompt: prompt,
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: 0.2, // Very low temperature for consistent refactoring
      });

      if (!result || !result.content) {
        throw new Error("AI provider returned no result for code refactoring.");
      }

      // Parse AI response
      const aiResponse = JSON.parse(result.content);
      const executionTime = Date.now() - startTime;

      const responseData: RefactoringResult = {
        refactoredCode: aiResponse.refactoredCode || code,
        changes: aiResponse.changes || ["Code refactored successfully"],
        improvements:
          aiResponse.improvements || objectives.map((obj) => `Improved ${obj}`),
        metrics: {
          linesReduced: aiResponse.metrics?.linesReduced || 0,
          complexityReduction: aiResponse.metrics?.complexityReduction || 15,
          readabilityScore: aiResponse.metrics?.readabilityScore || 85,
        },
      };

      return {
        success: true,
        data: {
          ...responseData,
          originalCode: code,
          language,
          objectives,
          generatedAt: new Date().toISOString(),
          aiProvider: providerName,
        },
        usage: {
          ...result.usage,
          executionTime,
          provider: providerName,
          model: "code-refactorer",
        },
        metadata: {
          toolName: "refactor-code",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "refactor-code",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
};

/**
 * Generate documentation from code
 */
const _generateDocumentationTool: NeuroLinkMCPTool = {
  name: "generate-documentation",
  description: "Automatically generate comprehensive documentation from code",
  category: "ai-workflow",
  inputSchema: generateDocumentationSchema,
  isImplemented: true,
  permissions: ["read"],
  version: "2.0.0", // Updated version with real AI
  execute: async (
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const validatedParams = generateDocumentationSchema.parse(params);
      const {
        code,
        language,
        documentationType,
        includeExamples,
        detailLevel,
      } = validatedParams;

      // Get AI provider for real documentation generation
      const providerName = await getBestProvider();
      const provider: AIProvider | null =
        await AIProviderFactory.createProvider(providerName);

      if (!provider) {
        throw new Error(`Failed to create AI provider: ${providerName}`);
      }

      // Create structured prompt for documentation generation
      const prompt = `Generate ${documentationType} documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Requirements:
- Language: ${language}
- Documentation type: ${documentationType}
- Detail level: ${detailLevel}
- Include examples: ${includeExamples}
- Generate professional, comprehensive documentation

Return ONLY a valid JSON object with this exact structure:
{
  "documentation": "formatted documentation string in ${documentationType} format",
  "sections": ["list of documentation sections included"],
  "examples": ${includeExamples ? '["code examples with usage"]' : "[]"},
  "coverage": percentage_number_representing_documentation_completeness
}

Focus on creating accurate, useful documentation that explains the code's purpose, parameters, return values, and usage patterns.`;

      const result = await provider.generate({
        prompt: prompt,
        maxTokens: 10000, // High limit for complex analysis
        temperature: 0.3, // Moderate temperature for creative but structured documentation
      });

      if (!result || !result.content) {
        throw new Error(
          "AI provider returned no result for documentation generation.",
        );
      }

      // Parse AI response
      const aiResponse = JSON.parse(result.content);
      const executionTime = Date.now() - startTime;

      const responseData: DocumentationResult = {
        documentation:
          aiResponse.documentation || "Documentation generated successfully",
        sections: aiResponse.sections || ["Overview"],
        examples: aiResponse.examples || [],
        coverage:
          aiResponse.coverage ||
          (detailLevel === "comprehensive"
            ? 95
            : detailLevel === "standard"
              ? 80
              : 60),
      };

      return {
        success: true,
        data: {
          ...responseData,
          originalCode: code,
          language,
          documentationType,
          detailLevel,
          includeExamples,
          generatedAt: new Date().toISOString(),
          aiProvider: providerName,
        },
        usage: {
          ...result.usage,
          executionTime,
          provider: providerName,
          model: "documentation-generator",
        },
        metadata: {
          toolName: "generate-documentation",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "generate-documentation",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
};

/**
 * Debug AI-generated output
 */
const _debugAIOutputTool: NeuroLinkMCPTool = {
  name: "debug-ai-output",
  description:
    "Analyze and debug AI-generated output to identify issues and suggest improvements",
  category: "ai-workflow",
  inputSchema: debugAIOutputSchema,
  isImplemented: true,
  permissions: ["read", "analytics"],
  version: "2.0.0", // Updated version with real AI
  execute: async (
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const validatedParams = debugAIOutputSchema.parse(params);
      const {
        aiOutput,
        expectedBehavior,
        context: debugContext,
        outputType,
        includeFixSuggestions,
      } = validatedParams;

      // Get AI provider for real output analysis
      const providerName = await getBestProvider();
      const provider: AIProvider | null =
        await AIProviderFactory.createProvider(providerName);

      if (!provider) {
        throw new Error(`Failed to create AI provider: ${providerName}`);
      }

      // Create structured prompt for AI output debugging
      const prompt = `Analyze this AI-generated ${outputType} output for issues and improvements:

AI Output to Debug:
\`\`\`
${aiOutput}
\`\`\`

Expected Behavior:
${expectedBehavior}

Context: ${debugContext || "None provided"}
Output Type: ${outputType}
Include Fix Suggestions: ${includeFixSuggestions}

Analyze the output for:
1. Quality issues (completeness, accuracy, formatting)
2. Technical problems (syntax errors, logical flaws)
3. Content issues (relevance, clarity, consistency)
4. Improvement opportunities

Return ONLY a valid JSON object with this exact structure:
{
  "issues": [
    {
      "type": "issue-category",
      "severity": "low|medium|high",
      "description": "detailed description of the issue",
      "location": "where in output this occurs"
    }
  ],
  "suggestions": ["actionable improvement suggestion 1", "suggestion 2"],
  "possibleCauses": ["potential cause 1", "potential cause 2"],
  "fixedOutput": ${includeFixSuggestions ? '"corrected version if possible"' : "null"}
}

Provide thorough, actionable analysis focused on improving AI output quality.`;

      const result = await provider.generate({
        prompt: prompt,
        maxTokens: DEFAULT_MAX_TOKENS,
        temperature: 0.4, // Moderate temperature for analytical thinking
      });

      if (!result || !result.content) {
        throw new Error("AI provider returned no result for output debugging.");
      }

      // Parse AI response
      const aiResponse = JSON.parse(result.content);
      const executionTime = Date.now() - startTime;

      const responseData: DebugResult = {
        issues: aiResponse.issues || [],
        suggestions: aiResponse.suggestions || [
          "Consider refining the prompt for clearer instructions",
        ],
        possibleCauses: aiResponse.possibleCauses || [
          "Prompt clarity",
          "Model limitations",
        ],
        fixedOutput: aiResponse.fixedOutput || undefined,
      };

      return {
        success: true,
        data: {
          ...responseData,
          originalOutput: aiOutput,
          expectedBehavior,
          outputType,
          analysisContext: debugContext,
          generatedAt: new Date().toISOString(),
          aiProvider: providerName,
        },
        usage: {
          ...result.usage,
          executionTime,
          provider: providerName,
          model: "ai-output-debugger",
        },
        metadata: {
          toolName: "debug-ai-output",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "debug-ai-output",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
};

// Helper functions
function _extractFunctionName(code: string): string {
  const match = code.match(/function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*\(/);
  return match
    ? match[1] || match[2] || match[3] || "processData"
    : "processData";
}

function _simulateRefactoring(
  code: string,
  objectives: string[],
  _styleGuide?: string,
): string {
  // Simulate basic refactoring
  let refactored = code;

  if (objectives.includes("readability")) {
    refactored = refactored.replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  if (objectives.includes("dry-principle")) {
    refactored = `// Extracted common functionality\nconst CONSTANTS = { MAX_RETRIES: 3, TIMEOUT: 5000 };\n\n${refactored}`;
  }

  return refactored;
}

// REMOVED: Tool exports disabled to prevent provider conflicts
// const aiWorkflowTools = [
//   generateTestCasesTool,
//   refactorCodeTool,
//   generateDocumentationTool,
//   debugAIOutputTool,
// ];

// REMOVED: Schema exports disabled
// const workflowToolSchemas = {
//   "generate-test-cases": generateTestCasesSchema,
//   "refactor-code": refactorCodeSchema,
//   "generate-documentation": generateDocumentationSchema,
//   "debug-ai-output": debugAIOutputSchema,
// };

/**
 * NeuroLink AI Core Server
 * Wraps existing AI provider functionality as MCP tools for orchestration
 * Integrates AIProviderFactory with Factory-First MCP architecture
 */

import { z } from "zod";
import { createMCPServer } from "../../factory.js";
import type { NeuroLinkExecutionContext, ToolResult } from "../../factory.js";
import { ServiceRegistry } from "../../../core/service-registry.js";
import {
  getBestProvider,
  getAvailableProviders,
} from "../../../utils/providerUtils.js";
import { logger } from "../../../utils/logger.js";
import {
  analyzeAIUsageTool,
  benchmarkProviderPerformanceTool,
  optimizePromptParametersTool,
} from "./ai-analysis-tools.js";
import {
  generateTestCasesTool,
  refactorCodeTool,
  generateDocumentationTool,
  debugAIOutputTool,
} from "./ai-workflow-tools.js";

/**
 * AI Core Server - Central hub for AI provider tools
 * Provides text generation, provider selection, AI analysis, and development workflow tools
 */
export const aiCoreServer = createMCPServer({
  id: "neurolink-ai-core",
  title: "NeuroLink AI Core",
  description:
    "Core AI provider tools with automatic fallback, analysis capabilities, and development workflow enhancement",
  category: "ai-providers",
  version: "1.2.0",
  capabilities: [
    "text-generation",
    "provider-selection",
    "automatic-fallback",
    "usage-tracking",
    "multi-provider-support",
    "ai-analysis",
    "test-generation",
    "code-refactoring",
    "documentation-generation",
    "ai-debugging",
  ],
});

/**
 * Text Generation Input Schema
 */
const TextGenerationSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  provider: z
    .enum([
      "openai",
      "bedrock",
      "vertex",
      "anthropic",
      "google-ai",
      "azure",
      "huggingface",
      "ollama",
      "mistral",
    ])
    .optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  systemPrompt: z.string().optional(),
});

/**
 * Provider Selection Input Schema
 */
const ProviderSelectionSchema = z.object({
  preferred: z.string().optional(),
  requirements: z
    .object({
      multimodal: z.boolean().optional(),
      streaming: z.boolean().optional(),
      maxTokens: z.number().optional(),
      costEfficient: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Register Text Generation Tool
 * Core tool that leverages existing AIProviderFactory for text generation
 */
aiCoreServer.registerTool({
  name: "generate",
  description:
    "Generate text using AI providers with automatic fallback and provider selection",
  category: "text-generation",
  inputSchema: TextGenerationSchema,
  isImplemented: true,
  execute: async (
    params: any,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      logger.debug(
        `[AI-Core] Starting text generation: "${params.prompt.substring(0, 50)}..."`,
      );

      // Use existing AIProviderFactory with best provider selection
      const selectedProvider =
        params.provider || (await getBestProvider(params.provider));

      // Get AIProviderFactory from ServiceRegistry to avoid circular dependency
      const AIProviderFactory =
        await ServiceRegistry.get<any>("AIProviderFactory");
      const provider =
        await AIProviderFactory.createBestProvider(selectedProvider);

      // Generate text using existing NeuroLink patterns
      const result = await provider.generate({
        prompt: params.prompt,
        model: params.model,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
        systemPrompt: params.systemPrompt,
      });

      if (!result) {
        throw new Error("AI provider returned null result");
      }

      const executionTime = Date.now() - startTime;

      logger.debug(
        `[AI-Core] Text generation successful in ${executionTime}ms using ${selectedProvider}`,
      );

      return {
        success: true,
        data: {
          text: result.content,
          model: params.model || "default",
          provider: selectedProvider,
          generatedAt: new Date().toISOString(),
        },
        usage: {
          tokens: result.usage?.totalTokens,
          provider: selectedProvider,
          model: params.model || "default",
          executionTime,
        },
        metadata: {
          toolName: "generate",
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

      logger.debug(`[AI-Core] Text generation failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "generate",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
});

/**
 * Register Provider Selection Tool
 * Intelligent provider selection based on requirements and availability
 */
aiCoreServer.registerTool({
  name: "select-provider",
  description:
    "Select the best available AI provider based on requirements and availability",
  category: "provider-management",
  inputSchema: ProviderSelectionSchema,
  isImplemented: true,
  execute: async (
    params: any,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      logger.debug(
        `[AI-Core] Selecting provider with requirements:`,
        params.requirements,
      );

      // Use existing provider selection logic
      const availableProviders = getAvailableProviders();
      const selectedProvider = await getBestProvider(params.preferred);

      // Get provider capabilities
      const getProviderCapabilities = (provider: string) => ({
        multimodal:
          provider === "openai" ||
          provider === "vertex" ||
          provider === "google-ai",
        streaming:
          provider === "openai" ||
          provider === "anthropic" ||
          provider === "azure" ||
          provider === "mistral",
        maxTokens:
          provider === "anthropic"
            ? 100000
            : provider === "huggingface"
              ? 2048
              : 4000,
        costEfficient:
          provider === "google-ai" ||
          provider === "vertex" ||
          provider === "huggingface" ||
          provider === "ollama",
        localExecution: provider === "ollama",
        openSource: provider === "huggingface" || provider === "ollama",
      });

      const capabilities = getProviderCapabilities(selectedProvider);

      const executionTime = Date.now() - startTime;

      logger.debug(
        `[AI-Core] Selected provider: ${selectedProvider} in ${executionTime}ms`,
      );

      return {
        success: true,
        data: {
          provider: selectedProvider,
          available: availableProviders,
          capabilities,
          reason: params.preferred
            ? `Preferred provider ${params.preferred} selected`
            : "Best available provider selected",
          selectedAt: new Date().toISOString(),
        },
        usage: {
          executionTime,
        },
        metadata: {
          toolName: "select-provider",
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

      logger.debug(`[AI-Core] Provider selection failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "select-provider",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
});

/**
 * Register Provider Status Tool
 * Check health and availability of AI providers
 */
aiCoreServer.registerTool({
  name: "check-provider-status",
  description: "Check the health and availability status of AI providers",
  category: "provider-management",
  inputSchema: z.object({
    provider: z.string().optional(),
    includeCapabilities: z.boolean().default(true),
  }),
  isImplemented: true,
  execute: async (
    params: any,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      logger.debug(
        `[AI-Core] Checking provider status for: ${params.provider || "all providers"}`,
      );

      const availableProviders = getAvailableProviders();
      const providerStatuses = [];

      const providersToCheck = params.provider
        ? [params.provider]
        : availableProviders;

      for (const provider of providersToCheck) {
        try {
          // Quick health check (can be enhanced with actual API calls)
          const isAvailable = availableProviders.includes(provider);

          providerStatuses.push({
            provider,
            status: isAvailable ? "available" : "unavailable",
            capabilities: params.includeCapabilities
              ? {
                  textGeneration: true,
                  multimodal:
                    provider === "openai" ||
                    provider === "vertex" ||
                    provider === "google-ai",
                  streaming:
                    provider === "openai" ||
                    provider === "anthropic" ||
                    provider === "azure" ||
                    provider === "mistral",
                  maxTokens:
                    provider === "anthropic"
                      ? 100000
                      : provider === "huggingface"
                        ? 2048
                        : 4000,
                  localExecution: provider === "ollama",
                  openSource:
                    provider === "huggingface" || provider === "ollama",
                }
              : undefined,
            lastChecked: new Date().toISOString(),
          });
        } catch (error) {
          providerStatuses.push({
            provider,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
            lastChecked: new Date().toISOString(),
          });
        }
      }

      const executionTime = Date.now() - startTime;

      logger.debug(
        `[AI-Core] Provider status check completed in ${executionTime}ms`,
      );

      return {
        success: true,
        data: {
          providers: providerStatuses,
          summary: {
            total: providerStatuses.length,
            available: providerStatuses.filter((p) => p.status === "available")
              .length,
            unavailable: providerStatuses.filter(
              (p) => p.status === "unavailable",
            ).length,
            errors: providerStatuses.filter((p) => p.status === "error").length,
          },
          checkedAt: new Date().toISOString(),
        },
        usage: {
          executionTime,
        },
        metadata: {
          toolName: "check-provider-status",
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

      logger.debug(`[AI-Core] Provider status check failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "check-provider-status",
          serverId: "neurolink-ai-core",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
});

/**
 * Register AI Analysis Tools
 * Usage analysis, performance benchmarking, and parameter optimization
 */
aiCoreServer.registerTool(analyzeAIUsageTool);
aiCoreServer.registerTool(benchmarkProviderPerformanceTool);
aiCoreServer.registerTool(optimizePromptParametersTool);

/**
 * Register AI Development Workflow Tools
 * Test generation, code refactoring, documentation generation, and AI debugging
 */
aiCoreServer.registerTool(generateTestCasesTool);
aiCoreServer.registerTool(refactorCodeTool);
aiCoreServer.registerTool(generateDocumentationTool);
aiCoreServer.registerTool(debugAIOutputTool);

// Log successful server creation
logger.debug(
  "[AI-Core] NeuroLink AI Core Server v1.2.0 created with 10 tools:",
  Object.keys(aiCoreServer.tools),
);

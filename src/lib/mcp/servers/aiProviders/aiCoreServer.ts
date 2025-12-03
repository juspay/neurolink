/**
 * NeuroLink AI Core Server
 * Wraps existing AI provider functionality as MCP tools for orchestration
 * Integrates AIProviderFactory with Factory-First MCP architecture
 */

import { z } from "zod";
import type { Unknown } from "../../../types/common.js";
import { createMCPServer } from "../../factory.js";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
} from "../../../types/mcpTypes.js";
import {
  getBestProvider,
  getAvailableProviders,
} from "../../../utils/providerUtils.js";
import { logger } from "../../../utils/logger.js";

/**
 * AI Core Server - Central hub for AI provider management
 * Provides provider selection and status checking functionality
 */
export const aiCoreServer = createMCPServer({
  id: "neurolink-ai-core",
  title: "NeuroLink AI Core",
  description:
    "Core AI provider management with automatic fallback and status monitoring",
  category: "aiProviders",
  version: "1.2.0",
  capabilities: [
    "provider-selection",
    "automatic-fallback",
    "multi-provider-support",
    "provider-status-monitoring",
  ],
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
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const typedParams = params as {
        requirements?: Unknown;
        preferred?: string;
      };
      logger.debug(
        `[AI-Core] Selecting provider with requirements:`,
        typedParams.requirements,
      );

      // Use existing provider selection logic
      const availableProviders = getAvailableProviders();
      const selectedProvider = await getBestProvider(typedParams.preferred);

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
          reason: typedParams.preferred
            ? `Preferred provider ${typedParams.preferred} selected`
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
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const typedParams = params as {
        provider?: string;
        includeCapabilities?: boolean;
      };
      logger.debug(
        `[AI-Core] Checking provider status for: ${typedParams.provider || "all providers"}`,
      );

      const availableProviders = getAvailableProviders();
      const providerStatuses = [];

      const providersToCheck = typedParams.provider
        ? [typedParams.provider]
        : availableProviders;

      for (const provider of providersToCheck) {
        try {
          // Quick health check (can be enhanced with actual API calls)
          const isAvailable = availableProviders.includes(provider);

          providerStatuses.push({
            provider,
            status: isAvailable ? "available" : "unavailable",
            capabilities: typedParams.includeCapabilities
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

// Log successful server creation
logger.debug(
  "[AI-Core] NeuroLink AI Core Server v1.2.0 created with provider management tools:",
  Object.keys(aiCoreServer.tools),
);

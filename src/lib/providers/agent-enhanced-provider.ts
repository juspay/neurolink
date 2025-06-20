/**
 * Agent-Enhanced Provider for NeuroLink CLI
 * Integrates direct tools with AI providers for true agent functionality
 */

import {
  generateText,
  streamText,
  type GenerateTextResult,
  type StreamTextResult,
  type ToolSet,
} from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  directAgentTools,
  getToolsForCategory,
} from "../agent/direct-tools.js";
import type {
  AIProvider,
  TextGenerationOptions,
  StreamTextOptions,
} from "../core/types.js";

/**
 * Agent configuration options
 */
interface AgentConfig {
  provider: "openai" | "google-ai" | "anthropic";
  model?: string;
  toolCategory?: "basic" | "filesystem" | "utility" | "all";
  maxSteps?: number;
  enableTools?: boolean;
}

/**
 * Agent-Enhanced Provider Class
 * Provides AI generation with tool calling capabilities
 */
export class AgentEnhancedProvider implements AIProvider {
  private config: AgentConfig;
  private model: any;

  constructor(config: AgentConfig) {
    this.config = {
      maxSteps: 5,
      toolCategory: "all",
      enableTools: true,
      ...config,
    };

    // Initialize the AI model based on provider
    this.model = this.createModel();
  }

  private createModel() {
    const { provider, model } = this.config;

    switch (provider) {
      case "google-ai":
        return google(
          model || process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash-exp",
        );
      case "openai":
        return openai(model || process.env.OPENAI_MODEL || "gpt-4o");
      case "anthropic":
        return anthropic(
          model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
        );
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async generateText(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null> {
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const {
      prompt,
      temperature = 0.7,
      maxTokens = 500,
      systemPrompt,
      schema,
    } = options;

    // Get tools if enabled
    const tools = this.config.enableTools
      ? getToolsForCategory(this.config.toolCategory)
      : {};

    try {
      const result = await generateText({
        model: this.model,
        prompt: systemPrompt
          ? `System: ${systemPrompt}\n\nUser: ${prompt}`
          : prompt,
        tools,
        maxSteps: this.config.maxSteps,
        temperature,
        maxTokens,
        // Force tool usage for specific patterns
        toolChoice: this.shouldForceToolUsage(prompt) ? "required" : "auto",
      });

      return result;
    } catch (error) {
      console.error("[AgentEnhancedProvider] generateText error:", error);
      throw error;
    }
  }

  async streamText(
    optionsOrPrompt: StreamTextOptions | string,
  ): Promise<StreamTextResult<ToolSet, unknown> | null> {
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const {
      prompt,
      temperature = 0.7,
      maxTokens = 500,
      systemPrompt,
    } = options;

    // Get tools if enabled
    const tools = this.config.enableTools
      ? getToolsForCategory(this.config.toolCategory)
      : {};

    try {
      const result = await streamText({
        model: this.model,
        prompt: systemPrompt
          ? `System: ${systemPrompt}\n\nUser: ${prompt}`
          : prompt,
        tools,
        maxSteps: this.config.maxSteps,
        temperature,
        maxTokens,
        toolChoice: this.shouldForceToolUsage(prompt) ? "required" : "auto",
      });

      return result;
    } catch (error) {
      console.error("[AgentEnhancedProvider] streamText error:", error);
      throw error;
    }
  }

  /**
   * Determine if we should force tool usage based on prompt patterns
   */
  private shouldForceToolUsage(prompt: string): boolean {
    const forceToolPatterns = [
      /what time is it/i,
      /current time/i,
      /list files/i,
      /read file/i,
      /directory/i,
      /calculate/i,
      /math/i,
      /search for/i,
      /find files/i,
    ];

    return forceToolPatterns.some((pattern) => pattern.test(prompt));
  }

  getCapabilities(): string[] {
    return [
      "text-generation",
      "streaming",
      "tool-calling",
      "agent-functionality",
    ];
  }

  getProviderName(): string {
    return `agent-${this.config.provider}`;
  }

  getModelName(): string {
    return this.config.model || `default-${this.config.provider}-model`;
  }

  /**
   * Test agent functionality
   */
  async testAgentCapabilities(): Promise<{ success: boolean; results: any[] }> {
    const testPrompts = [
      "What time is it right now?",
      "List files in current directory",
      "Calculate 15 * 7",
      "What is the square root of 144?",
    ];

    const results = [];
    let successCount = 0;

    for (const prompt of testPrompts) {
      try {
        console.log(`Testing: "${prompt}"`);
        const result = await this.generateText(prompt);

        if (!result) {
          results.push({
            prompt,
            success: false,
            error: "No result returned from generateText",
          });
          console.log(`❌ No result returned`);
          continue;
        }

        const toolsCalled = result.toolCalls?.length || 0;
        const success = toolsCalled > 0;

        if (success) {
          successCount++;
        }

        results.push({
          prompt,
          success,
          toolsCalled,
          response: result.text.substring(0, 100) + "...",
        });

        console.log(
          `✅ Tools called: ${toolsCalled}, Response: ${result.text.substring(0, 50)}...`,
        );
      } catch (error) {
        results.push({
          prompt,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(`❌ Error: ${error}`);
      }
    }

    return {
      success: successCount > 0,
      results,
    };
  }

  /**
   * Create agent-enhanced provider factory
   */
  static createAgent(config: AgentConfig): AgentEnhancedProvider {
    return new AgentEnhancedProvider(config);
  }

  /**
   * Create multiple agent providers for comparison
   */
  static createMultiProviderAgents(): Record<string, AgentEnhancedProvider> {
    const providers: Record<string, AgentEnhancedProvider> = {};

    // Only create providers that have API keys configured
    if (process.env.GOOGLE_AI_API_KEY) {
      providers["google-ai"] = new AgentEnhancedProvider({
        provider: "google-ai",
      });
    }

    if (process.env.OPENAI_API_KEY) {
      providers["openai"] = new AgentEnhancedProvider({ provider: "openai" });
    }

    if (process.env.ANTHROPIC_API_KEY) {
      providers["anthropic"] = new AgentEnhancedProvider({
        provider: "anthropic",
      });
    }

    return providers;
  }
}

/**
 * Helper function to create agent provider
 */
export function createAgentProvider(
  provider: "openai" | "google-ai" | "anthropic",
  options?: Partial<AgentConfig>,
): AgentEnhancedProvider {
  return new AgentEnhancedProvider({
    provider,
    ...options,
  });
}

/**
 * Test all available agent providers
 */
export async function testAllAgentProviders(): Promise<void> {
  console.log("🧪 Testing All Agent Providers\n");

  const providers = AgentEnhancedProvider.createMultiProviderAgents();

  if (Object.keys(providers).length === 0) {
    console.log(
      "❌ No API keys found. Please configure at least one provider.",
    );
    return;
  }

  for (const [name, provider] of Object.entries(providers)) {
    console.log(`\n🔬 Testing ${name.toUpperCase()} Agent Provider:`);
    try {
      const testResult = await provider.testAgentCapabilities();

      if (testResult.success) {
        console.log(`✅ ${name} agent provider working correctly`);
      } else {
        console.log(`❌ ${name} agent provider failed tests`);
      }
    } catch (error) {
      console.log(`❌ ${name} provider error:`, error);
    }
  }
}

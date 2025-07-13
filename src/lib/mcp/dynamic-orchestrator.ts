/**
 * NeuroLink Dynamic AI-Driven Tool Orchestrator
 * Enables AI to dynamically select and execute tools based on task requirements
 * Based on patterns from reference implementations
 */

import { MCPOrchestrator } from "./orchestrator.js";
import type { NeuroLinkExecutionContext, ToolResult } from "./factory.js";
import type { PipelineResult } from "./orchestrator.js";
import type { OrchestratorSession } from "./session-manager.js";
import type { ContextRequest } from "./context-manager.js";
import { createExecutionContext } from "./context-manager.js";
import { ErrorCategory, ErrorSeverity } from "./error-manager.js";
import { aiCoreServer } from "./servers/ai-providers/ai-core-server.js";

/**
 * Tool decision made by AI
 */
export interface ToolDecision {
  toolName: string;
  args: Record<string, any>;
  reasoning: string;
  confidence: number;
  shouldContinue: boolean;
}

/**
 * Dynamic tool chain execution options
 */
export interface DynamicToolChainOptions {
  maxIterations?: number; // Default: 10
  requireConfidence?: number; // Default: 0.7
  includeReasoning?: boolean; // Default: true
  allowParallel?: boolean; // Default: false
  customSystemPrompt?: string;
}

/**
 * Dynamic tool chain result
 */
export interface DynamicToolChainResult {
  success: boolean;
  iterations: number;
  results: ToolResult[];
  decisions: ToolDecision[];
  finalOutput?: string;
  error?: Error;
  totalDuration: number;
}

/**
 * AI prompt templates for tool selection
 */
const TOOL_SELECTION_PROMPT = `You are an intelligent tool orchestrator. Analyze the user's request and available tools to determine the best tool to use next.

User Request: {prompt}

Available Tools:
{tools}

Previous Results:
{previousResults}

Based on the request and previous results, select the most appropriate tool to use next.
Respond with a JSON object containing:
- toolName: The exact name of the tool to use
- args: An object containing the arguments for the tool
- reasoning: Brief explanation of why this tool was chosen
- confidence: A number between 0 and 1 indicating your confidence in this choice
- shouldContinue: Boolean indicating if more tools should be executed after this one

Example response:
{
  "toolName": "search-code",
  "args": {"query": "function calculateTotal", "path": "/src"},
  "reasoning": "Need to find the calculateTotal function to understand the calculation logic",
  "confidence": 0.9,
  "shouldContinue": true
}`;

/**
 * Dynamic orchestrator with AI-driven tool selection
 */
export class DynamicOrchestrator extends MCPOrchestrator {
  constructor(
    registry?: any,
    contextManager?: any,
    semaphoreManager?: any,
    sessionManager?: any,
    errorManager?: any,
  ) {
    super(
      registry,
      contextManager,
      semaphoreManager,
      sessionManager,
      errorManager,
    );
  }
  private defaultOptions: DynamicToolChainOptions = {
    maxIterations: 10,
    requireConfidence: 0.7,
    includeReasoning: true,
    allowParallel: false,
  };

  /**
   * Execute a dynamic tool chain where AI decides which tools to use
   *
   * @param prompt User's task or request
   * @param contextRequest Context creation request
   * @param options Dynamic execution options
   * @returns Dynamic tool chain result
   */
  async executeDynamicToolChain(
    prompt: string,
    contextRequest: ContextRequest = {},
    options: DynamicToolChainOptions = {},
  ): Promise<DynamicToolChainResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };

    const results: ToolResult[] = [];
    const decisions: ToolDecision[] = [];
    let error: Error | undefined;
    let iterations = 0;
    let session: any;

    try {
      // Create or get session
      const context = await this.contextManager.createContext(contextRequest);
      session = await this.sessionManager.createSession(context);
      // Get available tools
      const availableTools = await this.registry.listTools(context);
      const toolsDescription = availableTools
        .map(
          (tool) => `- ${tool.name}: ${tool.description || "No description"}`,
        )
        .join("\n");

      let shouldContinue = true;

      while (
        shouldContinue &&
        iterations < (mergedOptions.maxIterations || 10)
      ) {
        iterations++;

        // Prepare context for AI decision
        const previousResultsSummary = results
          .slice(-3) // Last 3 results for context
          .map((r, i) => {
            const resultData =
              r.success && r.data ? JSON.stringify(r.data) : "No data";
            const summary =
              resultData.length > 200
                ? resultData.slice(0, 200) + "..."
                : resultData;
            return `Result ${i + 1}: ${summary}`;
          })
          .join("\n");

        // Get AI decision on next tool
        const decision = await this.getAIToolDecision(
          prompt,
          toolsDescription,
          previousResultsSummary,
          mergedOptions.customSystemPrompt,
        );

        // Add decision to array if includeReasoning is true
        if (mergedOptions.includeReasoning) {
          decisions.push(decision);
        }

        // Validate confidence threshold
        if (decision.confidence < (mergedOptions.requireConfidence || 0.7)) {
          if (process.env.NEUROLINK_DEBUG === "true") {
            console.log(
              `[DynamicOrchestrator] Low confidence (${decision.confidence}), stopping execution`,
            );
          }
          shouldContinue = false;
          break;
        }

        shouldContinue = decision.shouldContinue;

        // Execute the selected tool
        try {
          const toolResult = await this.registry.executeTool(
            decision.toolName,
            decision.args,
            context,
          );

          results.push({
            success: true,
            data: toolResult,
            metadata: {
              toolName: decision.toolName,
              executionTime: Date.now() - startTime,
            },
          });

          // Update session with tool result
          session.toolHistory.push({
            success: true,
            data: toolResult,
            metadata: {
              toolName: decision.toolName,
              executionTime: Date.now() - startTime,
            },
          });
        } catch (toolError) {
          const errorResult: ToolResult = {
            success: false,
            error:
              toolError instanceof Error
                ? toolError
                : new Error(String(toolError)),
            metadata: {
              toolName: decision.toolName,
              executionTime: Date.now() - startTime,
            },
          };

          results.push(errorResult);
          session.toolHistory.push(errorResult);

          // Let AI decide if it should continue after error
          if (!decision.shouldContinue) {
            break;
          }
        }

        // Safety check for infinite loops
        if (iterations >= (mergedOptions.maxIterations || 10)) {
          if (process.env.NEUROLINK_DEBUG === "true") {
            console.log(
              `[DynamicOrchestrator] Reached max iterations (${mergedOptions.maxIterations})`,
            );
          }
          break;
        }
      }

      // Generate final output based on all results
      const finalOutput = await this.generateFinalOutput(
        prompt,
        results,
        decisions,
      );

      return {
        success: true,
        iterations,
        results,
        decisions: mergedOptions.includeReasoning ? decisions : [],
        finalOutput,
        totalDuration: Date.now() - startTime,
      };
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));

      // Record error
      this.errorManager.recordError(error, {
        category: ErrorCategory.TOOL_ERROR,
        severity: ErrorSeverity.HIGH,
        toolName: "dynamic-orchestrator",
        sessionId: session?.id,
      });

      return {
        success: false,
        iterations,
        results,
        decisions: mergedOptions.includeReasoning ? decisions : [],
        error,
        totalDuration: Date.now() - startTime,
      };
    } finally {
      // Update session activity if session was created
      if (session) {
        session.lastActivity = Date.now();
      }
    }
  }

  /**
   * Get AI decision on which tool to use next
   *
   * @private
   */
  private async getAIToolDecision(
    prompt: string,
    toolsDescription: string,
    previousResults: string,
    customSystemPrompt?: string,
  ): Promise<ToolDecision> {
    const systemPrompt =
      customSystemPrompt ||
      TOOL_SELECTION_PROMPT.replace("{prompt}", prompt)
        .replace("{tools}", toolsDescription)
        .replace("{previousResults}", previousResults || "None yet");

    try {
      // Use AI Core Server to get tool decision
      const generateTool = aiCoreServer.tools["generate"];
      if (!generateTool) {
        throw new Error("generate tool not found");
      }

      const aiResponse = await generateTool.execute(
        {
          prompt:
            "Select the next tool to execute based on the context provided.",
          systemPrompt,
          provider: "google-ai", // Use fast model for decisions
          model: "gemini-2.5-flash",
          temperature: 0.3, // Lower temperature for more consistent decisions
          maxTokens: 500,
        },
        createExecutionContext(),
      );

      // Parse AI response
      if (!aiResponse.success) {
        throw new Error(String(aiResponse.error || "AI generation failed"));
      }
      const responseText = aiResponse.data?.text || "";

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch =
        responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
        responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("AI response did not contain valid JSON");
      }

      const decision = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      // Validate decision structure
      if (!decision.toolName || !decision.args) {
        throw new Error("Invalid tool decision structure");
      }

      return {
        toolName: decision.toolName,
        args: decision.args || {},
        reasoning: decision.reasoning || "No reasoning provided",
        confidence: decision.confidence || 0.8,
        shouldContinue: decision.shouldContinue !== false,
      };
    } catch (error) {
      // Fallback decision on error
      if (process.env.NEUROLINK_DEBUG === "true") {
        console.error(
          "[DynamicOrchestrator] Error getting AI decision:",
          error,
        );
      }

      return {
        toolName: "list-tools", // Safe default
        args: {},
        reasoning: "Error in AI decision, falling back to tool listing",
        confidence: 0.5,
        shouldContinue: false,
      };
    }
  }

  /**
   * Generate final output based on all execution results
   *
   * @private
   */
  private async generateFinalOutput(
    prompt: string,
    results: ToolResult[],
    decisions: ToolDecision[],
  ): Promise<string> {
    // Prepare summary of execution
    const executionSummary = results
      .map((r, i) => {
        const decision = decisions[i];
        const toolName = r.metadata?.toolName || "unknown";
        const resultData =
          r.success && r.data ? JSON.stringify(r.data) : "No data";
        const resultSummary =
          resultData.length > 300
            ? resultData.slice(0, 300) + "..."
            : resultData;
        return `Step ${i + 1}: ${toolName}
Reasoning: ${decision?.reasoning || "N/A"}
Result: ${r.success ? resultSummary : "Error: " + (r.error instanceof Error ? r.error.message : String(r.error))}`;
      })
      .join("\n\n");

    const summaryPrompt = `Based on the following tool execution results, provide a comprehensive answer to the user's request.

User Request: ${prompt}

Execution Summary:
${executionSummary}

Provide a clear, concise answer that addresses the user's request based on the tool results.`;

    try {
      // Use AI to generate final summary
      const generateTool = aiCoreServer.tools["generate"];
      if (!generateTool) {
        throw new Error("generate tool not found");
      }

      const aiResponse = await generateTool.execute(
        {
          prompt: summaryPrompt,
          provider: "google-ai",
          model: "gemini-2.5-pro",
          temperature: 0.7,
          maxTokens: 1000,
        },
        createExecutionContext(),
      );

      if (!aiResponse.success) {
        throw new Error(String(aiResponse.error || "AI generation failed"));
      }
      return aiResponse.data?.text || "";
    } catch (error) {
      // Fallback to simple summary
      return `Executed ${results.length} tools to address your request. ${
        results.filter((r) => r.success).length
      } succeeded, ${results.filter((r) => !r.success).length} failed.`;
    }
  }

  /**
   * Execute parallel dynamic tool chains for complex tasks
   *
   * @param prompts Multiple prompts to execute in parallel
   * @param contextRequest Shared context request
   * @param options Dynamic execution options
   * @returns Array of dynamic tool chain results
   */
  async executeParallelDynamicChains(
    prompts: string[],
    contextRequest: ContextRequest = {},
    options: DynamicToolChainOptions = {},
  ): Promise<DynamicToolChainResult[]> {
    if (!options.allowParallel) {
      throw new Error("Parallel execution not enabled in options");
    }

    // Execute all chains in parallel
    const promises = prompts.map((prompt) =>
      this.executeDynamicToolChain(prompt, contextRequest, options),
    );

    return Promise.all(promises);
  }

  /**
   * Get statistics including dynamic execution metrics
   */
  getStats() {
    const baseStats = super.getStats();

    // Add dynamic orchestrator specific stats
    return {
      ...baseStats,
      dynamicOrchestrator: {
        // Additional metrics can be added here
        features: {
          aiToolSelection: true,
          iterativeExecution: true,
          parallelSupport: true,
          reasoningCapture: true,
        },
      },
    };
  }
}

/**
 * Create a dynamic orchestrator instance
 *
 * @param registry Tool registry
 * @param contextManager Context manager
 * @param semaphoreManager Semaphore manager (optional)
 * @param sessionManager Session manager (optional)
 * @param errorManager Error manager (optional)
 * @returns Dynamic orchestrator instance
 */
export function createDynamicOrchestrator(
  registry: any,
  contextManager: any,
  semaphoreManager?: any,
  sessionManager?: any,
  errorManager?: any,
): DynamicOrchestrator {
  return new DynamicOrchestrator(
    registry,
    contextManager,
    semaphoreManager,
    sessionManager,
    errorManager,
  );
}

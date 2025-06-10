/**
 * NeuroLink MCP Tool Orchestration Engine
 * Central orchestrator for coordinated tool execution with pipeline management
 * Coordinates factory, registry, context, and AI tools for seamless operation
 */

import type { NeuroLinkExecutionContext, ToolResult } from './factory.js';
import { MCPToolRegistry, defaultToolRegistry, type ToolExecutionOptions } from './registry.js';
import { ContextManager, defaultContextManager, createExecutionContext, type ContextRequest } from './context-manager.js';
import { aiCoreServer } from './servers/ai-providers/ai-core-server.js';

/**
 * Pipeline execution options
 */
export interface PipelineOptions {
  stopOnError?: boolean;
  parallel?: boolean;
  timeout?: number;
  trackMetrics?: boolean;
  validateInputs?: boolean;
}

/**
 * Tool execution step in a pipeline
 */
export interface PipelineStep {
  toolName: string;
  params: any;
  options?: ToolExecutionOptions;
  dependsOn?: string[]; // Step dependencies for parallel execution
  stepId?: string; // Unique identifier for the step
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  success: boolean;
  results: Map<string, ToolResult>;
  errors: Map<string, string>;
  executionTime: number;
  stepsExecuted: number;
  stepsSkipped: number;
  metadata: {
    pipelineId: string;
    sessionId: string;
    timestamp: number;
    parallel: boolean;
  };
}

/**
 * Text generation pipeline result
 */
export interface TextPipelineResult {
  success: boolean;
  text?: string;
  provider?: string;
  model?: string;
  executionTime: number;
  usage?: {
    tokens?: number;
    cost?: number;
  };
  metadata: {
    sessionId: string;
    timestamp: number;
    toolsUsed: string[];
  };
}

/**
 * NeuroLink MCP Tool Orchestrator
 * Central coordination engine for tool execution, pipelines, and AI operations
 */
export class MCPOrchestrator {
  private registry: MCPToolRegistry;
  private contextManager: ContextManager;
  private pipelineCounter: number = 0;

  constructor(
    registry?: MCPToolRegistry,
    contextManager?: ContextManager
  ) {
    this.registry = registry || defaultToolRegistry;
    this.contextManager = contextManager || defaultContextManager;

    // Initialize with AI Core Server
    this.initializeDefaultServers();
  }

  /**
   * Initialize with default servers (AI Core)
   */
  private async initializeDefaultServers(): Promise<void> {
    try {
      await this.registry.registerServer(aiCoreServer);
      console.log('[Orchestrator] Initialized with AI Core Server');
    } catch (error) {
      console.warn('[Orchestrator] Failed to register AI Core Server:', error);
    }
  }

  /**
   * Execute a single tool with full orchestration
   *
   * @param toolName Tool name to execute
   * @param params Tool parameters
   * @param contextRequest Context creation request
   * @param options Execution options
   * @returns Tool execution result
   */
  async executeTool(
    toolName: string,
    params: any,
    contextRequest: ContextRequest = {},
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult> {
    // Create execution context
    const context = this.contextManager.createContext(contextRequest);

    console.log(`[Orchestrator] Executing tool '${toolName}' in session ${context.sessionId}`);

    // Execute tool through registry
    const result = await this.registry.executeTool(toolName, params, context, options);

    console.log(`[Orchestrator] Tool '${toolName}' execution ${result.success ? 'completed' : 'failed'}`);

    return result;
  }

  /**
   * Execute a pipeline of tools with dependency management
   *
   * @param steps Pipeline steps to execute
   * @param contextRequest Context creation request
   * @param options Pipeline execution options
   * @returns Pipeline execution result
   */
  async executePipeline(
    steps: PipelineStep[],
    contextRequest: ContextRequest = {},
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const pipelineId = this.generatePipelineId();

    const {
      stopOnError = true,
      parallel = false,
      timeout = 60000,
      trackMetrics = true,
      validateInputs = true
    } = options;

    // Create shared execution context
    const context = this.contextManager.createContext({
      ...contextRequest,
      sessionId: contextRequest.sessionId || pipelineId
    });

    const results = new Map<string, ToolResult>();
    const errors = new Map<string, string>();
    let stepsExecuted = 0;
    let stepsSkipped = 0;

    console.log(`[Orchestrator] Starting pipeline ${pipelineId} with ${steps.length} steps`);

    try {
      if (parallel) {
        // Execute steps in parallel with dependency management
        await this.executeParallelPipeline(steps, context, results, errors, {
          timeout,
          trackMetrics,
          validateInputs,
          stopOnError
        });
      } else {
        // Execute steps sequentially
        for (const step of steps) {
          const stepId = step.stepId || `step-${stepsExecuted + 1}`;

          try {
            console.log(`[Orchestrator] Executing step: ${stepId} (${step.toolName})`);

            const stepResult = await this.registry.executeTool(
              step.toolName,
              step.params,
              context,
              {
                ...step.options,
                validateInput: validateInputs,
                trackMetrics,
                timeoutMs: timeout / steps.length // Distribute timeout across steps
              }
            );

            results.set(stepId, stepResult);
            stepsExecuted++;

            if (!stepResult.success) {
              errors.set(stepId, stepResult.error || 'Unknown error');

              if (stopOnError) {
                console.error(`[Orchestrator] Pipeline ${pipelineId} stopped due to error in step ${stepId}`);
                break;
              }
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.set(stepId, errorMessage);

            if (stopOnError) {
              console.error(`[Orchestrator] Pipeline ${pipelineId} stopped due to exception in step ${stepId}: ${errorMessage}`);
              break;
            }

            stepsSkipped++;
          }
        }
      }

      const executionTime = Date.now() - startTime;
      const success = errors.size === 0 || !stopOnError;

      console.log(`[Orchestrator] Pipeline ${pipelineId} completed in ${executionTime}ms - ${success ? 'SUCCESS' : 'FAILED'}`);

      return {
        success,
        results,
        errors,
        executionTime,
        stepsExecuted,
        stepsSkipped,
        metadata: {
          pipelineId,
          sessionId: context.sessionId,
          timestamp: Date.now(),
          parallel
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[Orchestrator] Pipeline ${pipelineId} failed: ${errorMessage}`);

      return {
        success: false,
        results,
        errors: new Map([['pipeline', errorMessage]]),
        executionTime,
        stepsExecuted,
        stepsSkipped,
        metadata: {
          pipelineId,
          sessionId: context.sessionId,
          timestamp: Date.now(),
          parallel
        }
      };
    }
  }

  /**
   * Execute AI text generation pipeline (high-level convenience method)
   *
   * @param prompt Text prompt for generation
   * @param contextRequest Context creation request
   * @param options Additional generation options
   * @returns Text generation result
   */
  async executeTextPipeline(
    prompt: string,
    contextRequest: ContextRequest = {},
    options: {
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      customTools?: string[];
    } = {}
  ): Promise<TextPipelineResult> {
    const startTime = Date.now();

    // Create execution context
    const context = this.contextManager.createContext(contextRequest);

    try {
      console.log(`[Orchestrator] Starting text pipeline for prompt: "${prompt.substring(0, 50)}..."`);

      // Build pipeline steps
      const steps: PipelineStep[] = [];

      // Step 1: Provider selection (if not specified)
      if (!options.provider) {
        steps.push({
          stepId: 'select-provider',
          toolName: 'select-provider',
          params: {
            requirements: {
              maxTokens: options.maxTokens,
              costEfficient: true
            }
          }
        });
      }

      // Step 2: Text generation
      steps.push({
        stepId: 'generate-text',
        toolName: 'generate-text',
        params: {
          prompt,
          provider: options.provider,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          systemPrompt: options.systemPrompt
        },
        dependsOn: options.provider ? [] : ['select-provider']
      });

      // Step 3: Custom tools (if specified)
      if (options.customTools && options.customTools.length > 0) {
        for (const toolName of options.customTools) {
          steps.push({
            stepId: `custom-${toolName}`,
            toolName,
            params: { /* tool-specific params */ },
            dependsOn: ['generate-text']
          });
        }
      }

      // Execute pipeline
      const pipelineResult = await this.executePipeline(steps, contextRequest, {
        stopOnError: true,
        parallel: false,
        trackMetrics: true
      });

      const executionTime = Date.now() - startTime;

      // Extract text generation result
      const textResult = pipelineResult.results.get('generate-text');
      const providerResult = pipelineResult.results.get('select-provider');

      if (!textResult || !textResult.success) {
        throw new Error('Text generation failed');
      }

      const toolsUsed = Array.from(pipelineResult.results.keys());

      console.log(`[Orchestrator] Text pipeline completed in ${executionTime}ms`);

      return {
        success: true,
        text: textResult.data?.text,
        provider: textResult.data?.provider || providerResult?.data?.provider,
        model: textResult.data?.model,
        executionTime,
        usage: textResult.usage,
        metadata: {
          sessionId: context.sessionId,
          timestamp: Date.now(),
          toolsUsed
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[Orchestrator] Text pipeline failed: ${errorMessage}`);

      return {
        success: false,
        executionTime,
        metadata: {
          sessionId: context.sessionId,
          timestamp: Date.now(),
          toolsUsed: []
        }
      };
    }
  }

  /**
   * Get orchestrator statistics
   *
   * @returns Comprehensive orchestrator statistics
   */
  getStats(): {
    registry: any;
    context: any;
    orchestrator: {
      pipelinesExecuted: number;
    };
  } {
    return {
      registry: this.registry.getStats(),
      context: this.contextManager.getStats(),
      orchestrator: {
        pipelinesExecuted: this.pipelineCounter
      }
    };
  }

  /**
   * Execute parallel pipeline with dependency management
   *
   * @private
   */
  private async executeParallelPipeline(
    steps: PipelineStep[],
    context: NeuroLinkExecutionContext,
    results: Map<string, ToolResult>,
    errors: Map<string, string>,
    options: { timeout: number; trackMetrics: boolean; validateInputs: boolean; stopOnError: boolean }
  ): Promise<void> {
    // Build dependency graph
    const stepMap = new Map<string, PipelineStep>();
    const dependencyGraph = new Map<string, string[]>();

    for (const step of steps) {
      const stepId = step.stepId || `step-${stepMap.size + 1}`;
      stepMap.set(stepId, { ...step, stepId });
      dependencyGraph.set(stepId, step.dependsOn || []);
    }

    // Execute steps in dependency order
    const completed = new Set<string>();
    const executing = new Set<string>();

    while (completed.size < steps.length) {
      const readySteps = Array.from(stepMap.keys()).filter(stepId => {
        if (completed.has(stepId) || executing.has(stepId)) return false;
        const dependencies = dependencyGraph.get(stepId) || [];
        return dependencies.every(dep => completed.has(dep));
      });

      if (readySteps.length === 0) {
        throw new Error('Circular dependency detected in pipeline');
      }

      // Execute ready steps in parallel
      const executePromises = readySteps.map(async (stepId) => {
        executing.add(stepId);
        const step = stepMap.get(stepId)!;

        try {
          const result = await this.registry.executeTool(
            step.toolName,
            step.params,
            context,
            { ...step.options, ...options }
          );

          results.set(stepId, result);

          if (!result.success) {
            errors.set(stepId, result.error || 'Unknown error');
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.set(stepId, errorMessage);
        } finally {
          executing.delete(stepId);
          completed.add(stepId);
        }
      });

      await Promise.all(executePromises);

      // Check for errors and stop if configured
      if (options.stopOnError && errors.size > 0) {
        break;
      }
    }
  }

  /**
   * Generate unique pipeline ID
   *
   * @private
   */
  private generatePipelineId(): string {
    this.pipelineCounter++;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `nlpipe-${timestamp}-${this.pipelineCounter}-${random}`;
  }
}

/**
 * Default orchestrator instance
 * Ready-to-use orchestrator with pre-configured registry and context manager
 */
export const defaultOrchestrator = new MCPOrchestrator();

/**
 * Utility function to execute tool with default orchestrator
 *
 * @param toolName Tool name to execute
 * @param params Tool parameters
 * @param contextRequest Context creation request
 * @param options Execution options
 * @returns Tool execution result
 */
export async function executeTool(
  toolName: string,
  params: any,
  contextRequest?: ContextRequest,
  options?: ToolExecutionOptions
): Promise<ToolResult> {
  return defaultOrchestrator.executeTool(toolName, params, contextRequest, options);
}

/**
 * Utility function to execute text generation pipeline
 *
 * @param prompt Text prompt for generation
 * @param contextRequest Context creation request
 * @param options Generation options
 * @returns Text generation result
 */
export async function executeTextPipeline(
  prompt: string,
  contextRequest?: ContextRequest,
  options?: any
): Promise<TextPipelineResult> {
  return defaultOrchestrator.executeTextPipeline(prompt, contextRequest, options);
}

/**
 * Utility function to execute pipeline with default orchestrator
 *
 * @param steps Pipeline steps
 * @param contextRequest Context creation request
 * @param options Pipeline options
 * @returns Pipeline execution result
 */
export async function executePipeline(
  steps: PipelineStep[],
  contextRequest?: ContextRequest,
  options?: PipelineOptions
): Promise<PipelineResult> {
  return defaultOrchestrator.executePipeline(steps, contextRequest, options);
}

/**
 * TaskExecutor — Runs a single task execution against NeuroLink.generate().
 *
 * Handles:
 * - Isolated mode: fresh generate() call with no history
 * - Continuation mode: loads conversation history, appends new exchange
 * - Retry with exponential backoff for transient errors
 * - Run result construction and logging
 */

import { nanoid } from "nanoid";
import { logger } from "../utils/logger.js";
import type {
  TaskStore,
  Task,
  TaskRunResult,
  ConversationEntry,
  NeuroLinkExecutable,
} from "../types/taskTypes.js";

/** Errors that are transient and should be retried */
const TRANSIENT_PATTERNS = [
  "rate limit",
  "rate_limit",
  "too many requests",
  "429",
  "503",
  "502",
  "504",
  "timeout",
  "econnreset",
  "econnrefused",
  "network",
  "overloaded",
];

function isTransientError(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

export class TaskExecutor {
  constructor(
    private neurolink: NeuroLinkExecutable,
    private store: TaskStore,
  ) {}

  /**
   * Execute a task once. Called by the backend on each scheduled tick.
   * Returns the run result (success or error).
   */
  async execute(task: Task): Promise<TaskRunResult> {
    const runId = `run_${nanoid(12)}`;
    const startTime = Date.now();

    let lastError: string | undefined;

    for (let attempt = 1; attempt <= task.retry.maxAttempts; attempt++) {
      try {
        const result = await this.executeOnce(task, runId);
        return result;
      } catch (err) {
        lastError = String(err);
        const willRetry =
          attempt < task.retry.maxAttempts && isTransientError(err);

        logger.warn("[TaskExecutor] Execution attempt failed", {
          taskId: task.id,
          runId,
          attempt,
          willRetry,
          error: lastError,
        });

        if (!willRetry) {
          break;
        }

        // Backoff before retry
        const backoffIndex = Math.min(
          attempt - 1,
          task.retry.backoffMs.length - 1,
        );
        const delay = task.retry.backoffMs[backoffIndex];
        await sleep(delay);
      }
    }

    // All retries exhausted or permanent error
    const errorResult: TaskRunResult = {
      taskId: task.id,
      runId,
      status: "error",
      error: lastError,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    return errorResult;
  }

  // ── Internal ──────────────────────────────────────────

  private async executeOnce(task: Task, runId: string): Promise<TaskRunResult> {
    const startTime = Date.now();

    // Build generate options
    const generateOptions: Record<string, unknown> = {
      input: { text: task.prompt },
      ...(task.provider ? { provider: task.provider } : {}),
      ...(task.model ? { model: task.model } : {}),
      ...(task.systemPrompt ? { systemPrompt: task.systemPrompt } : {}),
      ...(task.maxTokens ? { maxTokens: task.maxTokens } : {}),
      ...(task.temperature !== undefined
        ? { temperature: task.temperature }
        : {}),
      ...(task.timeout ? { timeout: task.timeout } : {}),
      ...(!task.tools ? { disableTools: true } : {}),
    };

    // Thinking level
    if (task.thinkingLevel) {
      generateOptions.thinkingConfig = { thinkingLevel: task.thinkingLevel };
    }

    // Continuation mode: pass conversation history as proper multi-turn messages
    if (task.mode === "continuation" && task.sessionId) {
      const history = await this.store.getHistory(task.id);

      // Pass history as proper role-based conversation messages
      if (history.length > 0) {
        generateOptions.conversationMessages = history.map((entry, i) => ({
          id: `${task.sessionId}_${i}`,
          role: entry.role,
          content: entry.content,
          timestamp: entry.timestamp,
        }));
      }

      // Add continuation context to system prompt
      const runCount = Math.floor(history.length / 2);
      const continuationHint =
        runCount > 0
          ? `This is a continuation task (run ${runCount + 1}). Your previous ${runCount} exchange(s) are provided as conversation history.`
          : "This is a continuation task. This is the first execution — no prior history exists yet.";
      generateOptions.systemPrompt = task.systemPrompt
        ? `${task.systemPrompt}\n\n${continuationHint}`
        : continuationHint;
    }

    // Execute
    const result = await this.neurolink.generate(generateOptions);

    // Build run result
    const runResult: TaskRunResult = {
      taskId: task.id,
      runId,
      status: "success",
      output: result.content,
      toolCalls: result.toolExecutions?.map((te) => ({
        name: te.name,
        input: te.input,
        output: te.output,
      })),
      tokensUsed: result.usage
        ? {
            input: result.usage.input ?? 0,
            output: result.usage.output ?? 0,
          }
        : undefined,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    // Continuation mode: append this exchange to history
    if (task.mode === "continuation" && task.sessionId) {
      const newEntries: ConversationEntry[] = [
        {
          role: "user",
          content: task.prompt,
          timestamp: new Date(startTime).toISOString(),
        },
        {
          role: "assistant",
          content: result.content,
          timestamp: runResult.timestamp,
        },
      ];
      await this.store.appendHistory(task.id, newEntries);
    }

    return runResult;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

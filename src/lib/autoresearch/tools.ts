/**
 * Research tools factory for AutoResearch system.
 *
 * These tools allow an AI agent to conduct autonomous experiments:
 * reading/writing code, running experiments, recording results, and
 * managing the research lifecycle (accept/revert/checkpoint).
 *
 * @module autoresearch/tools
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type {
  ExperimentRecord,
  ResearchToolsDeps,
  Tool,
} from "../types/index.js";
import { withTimeout } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";
import { parseExperimentSummary } from "./summaryParser.js";
import { tool } from "../utils/tool.js";

/**
 * Create research management tools bound to a research session.
 *
 * These tools follow the same factory pattern as `createTaskTools()` in
 * `src/lib/tasks/tools/taskTools.ts`. Dependencies are captured via closure,
 * eliminating the need for module-level singleton state.
 *
 * @param deps - The research dependencies to bind to
 * @returns Record of tool name to tool definition
 *
 * @example
 * ```typescript
 * const tools = createResearchTools({ config, stateStore, repoPolicy, runner, recorder });
 * // tools.research_get_context, tools.research_read_file, etc.
 * ```
 */
export function createResearchTools(
  deps: ResearchToolsDeps,
): Record<string, Tool> {
  const { config, stateStore, repoPolicy, runner, recorder } = deps;

  return {
    /**
     * Get current research context including state, config, and recent results.
     */
    research_get_context: tool({
      description:
        "Get the current research context including branch, commits, metrics, recent results, paths, phase, and run count.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const state = await stateStore.load();
          if (!state) {
            return {
              success: false,
              error: "No research state found. Initialize first.",
            };
          }

          // Get recent results (last 10)
          const allRecords = await recorder.readAll();
          const recentResults = allRecords.slice(-10);

          return {
            success: true,
            branch: state.branch,
            acceptedCommit: state.acceptedCommit,
            bestMetric: state.bestMetric,
            recentResults,
            mutablePaths: config.mutablePaths,
            immutablePaths: config.immutablePaths,
            currentPhase: state.currentPhase,
            runCount: state.runCount,
            tag: state.tag,
            keepCount: state.keepCount,
          };
        } catch (error) {
          logger.error("[researchTools] research_get_context failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    /**
     * Read a file from the repository if allowed by policy.
     */
    research_read_file: tool({
      description:
        "Read the contents of a file from the repository. Only readable if in mutablePaths, immutablePaths, or is the programPath.",
      inputSchema: z.object({
        path: z.string().describe("Relative file path from repo root"),
      }),
      execute: async ({ path: filePath }) => {
        try {
          if (!repoPolicy.isReadAllowed(filePath)) {
            return {
              success: false,
              error: `Read not allowed for path: ${filePath}. Must be in mutablePaths, immutablePaths, or programPath.`,
            };
          }

          const fullPath = path.join(config.repoPath, filePath);
          const content = readFileSync(fullPath, "utf-8");

          return {
            success: true,
            path: filePath,
            content,
          };
        } catch (error) {
          logger.error("[researchTools] research_read_file failed", {
            path: filePath,
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            path: filePath,
          };
        }
      },
    }),

    /**
     * Write a candidate file to the repository if allowed by policy.
     */
    research_write_candidate: tool({
      description:
        "Write content to a file in the repository. Only allowed for paths in mutablePaths.",
      inputSchema: z.object({
        path: z.string().describe("Relative file path from repo root"),
        content: z.string().describe("Content to write to the file"),
      }),
      execute: async ({ path: filePath, content }) => {
        try {
          if (!repoPolicy.isWriteAllowed(filePath)) {
            return {
              success: false,
              error: `Write not allowed for path: ${filePath}. Must be in mutablePaths.`,
            };
          }

          // Detect and fix literal escape sequences that LLMs sometimes produce.
          // If the content has literal \n but no real newlines (for files > ~10 lines),
          // the AI serialized newlines incorrectly.
          let sanitizedContent = content;
          const realNewlines = (content.match(/\n/g) || []).length;
          const literalBackslashN = (content.match(/\\n/g) || []).length;
          if (realNewlines < 5 && literalBackslashN > 20) {
            // Content looks like it has literal \n instead of real newlines
            sanitizedContent = content
              .replace(/\\n/g, "\n")
              .replace(/\\t/g, "\t")
              .replace(/\\\\/g, "\\");
            logger.warn(
              `[researchTools] Detected literal escape sequences in write content for ${filePath}. ` +
                `Fixed ${literalBackslashN} literal \\n → real newlines.`,
            );
          }

          const fullPath = path.join(config.repoPath, filePath);
          writeFileSync(fullPath, sanitizedContent, "utf-8");

          return {
            success: true,
            path: filePath,
            bytesWritten: Buffer.byteLength(sanitizedContent, "utf-8"),
          };
        } catch (error) {
          logger.error("[researchTools] research_write_candidate failed", {
            path: filePath,
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            path: filePath,
          };
        }
      },
    }),

    /**
     * Get git diff of mutable paths only.
     */
    research_diff: tool({
      description:
        "Get the git diff showing changes to mutablePaths only. Returns empty string if no changes.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          // Get diff for each mutable path
          const diffs: string[] = [];
          for (const mutablePath of config.mutablePaths) {
            try {
              const diff = execFileSync("git", ["diff", "--", mutablePath], {
                cwd: config.repoPath,
                encoding: "utf-8",
              });
              if (diff.trim()) {
                diffs.push(diff);
              }
            } catch (err) {
              // Only suppress if path doesn't exist
              const fullPath = path.join(config.repoPath, mutablePath);
              if (!existsSync(fullPath)) {
                continue; // Path doesn't exist yet, skip
              }
              throw err; // Real git error, let outer handler catch it
            }
          }

          const combinedDiff = diffs.join("\n");
          return {
            success: true,
            diff: combinedDiff,
            hasChanges: combinedDiff.length > 0,
          };
        } catch (error) {
          logger.error("[researchTools] research_diff failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    /**
     * Commit staged changes as a candidate.
     */
    research_commit_candidate: tool({
      description:
        "Commit staged changes as a candidate experiment. Validates branch and paths, stages mutablePaths, creates commit, and updates state with candidateCommit.",
      inputSchema: z.object({
        message: z.string().describe("Git commit message"),
      }),
      execute: async ({ message }) => {
        try {
          const state = await stateStore.load();
          if (!state) {
            return { success: false, error: "No research state found." };
          }

          // Stage mutable paths first (so validateCommit checks the staged index)
          for (const mutablePath of config.mutablePaths) {
            try {
              execFileSync("git", ["add", "--", mutablePath], {
                cwd: config.repoPath,
                encoding: "utf-8",
              });
            } catch (addErr) {
              // Only ignore if the path doesn't exist; rethrow real git errors
              const msg =
                addErr instanceof Error ? addErr.message : String(addErr);
              if (
                !msg.includes("did not match any files") &&
                !msg.includes("pathspec")
              ) {
                throw addErr;
              }
            }
          }

          // Validate commit (checks staged files against policy)
          const validation = await repoPolicy.validateCommit(state.branch);
          if (!validation.valid) {
            // Unstage on validation failure
            for (const mutablePath of config.mutablePaths) {
              try {
                execFileSync(
                  "git",
                  ["restore", "--staged", "--", mutablePath],
                  {
                    cwd: config.repoPath,
                    encoding: "utf-8",
                  },
                );
              } catch {
                /* ignore */
              }
            }
            return {
              success: false,
              error: `Commit validation failed: ${validation.violations.join(", ")}`,
              violations: validation.violations,
            };
          }

          // Create commit (--no-verify skips pre-commit hooks which may fail in worktrees)
          execFileSync("git", ["commit", "--no-verify", "-m", message], {
            cwd: config.repoPath,
            encoding: "utf-8",
          });

          // Get the new commit hash
          const candidateCommit = execFileSync(
            "git",
            ["rev-parse", "--short=7", "HEAD"],
            {
              cwd: config.repoPath,
              encoding: "utf-8",
            },
          ).trim();

          // Update state — clear run-derived fields so next experiment starts fresh
          await stateStore.update({
            candidateCommit,
            lastSummary: null,
            lastStatus: null,
          });

          return {
            success: true,
            candidateCommit,
            message,
          };
        } catch (error) {
          logger.error("[researchTools] research_commit_candidate failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    /**
     * Run the experiment.
     */
    research_run_experiment: tool({
      description:
        "Run the configured experiment command with timeout. Returns structured summary with metric, memory, and crash status.",
      inputSchema: z.object({
        description: z.string().describe("Description of this experiment run"),
      }),
      execute: async ({ description }) => {
        try {
          logger.info("[researchTools] Starting experiment", { description });
          const summary = await withTimeout(
            runner.run(),
            config.timeoutMs + 30_000,
            new Error("Experiment runner exceeded safety timeout"),
          );

          // Increment run count and save lastSummary
          const state = await stateStore.load();
          if (state) {
            await stateStore.update({
              runCount: state.runCount + 1,
              lastSummary: summary,
            });
          }

          return {
            success: true,
            description,
            summary,
          };
        } catch (error) {
          logger.error("[researchTools] research_run_experiment failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    /**
     * Parse the experiment log file.
     */
    research_parse_log: tool({
      description:
        "Parse the run.log file to extract structured experiment summary (metric, memory, crash status, etc.)",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const logPath = path.join(config.repoPath, config.logPath);
          const logContent = readFileSync(logPath, "utf-8");
          const summary = parseExperimentSummary(
            logContent,
            config.metric,
            config.memoryMetric,
          );

          return {
            success: true,
            summary,
          };
        } catch (error) {
          logger.error("[researchTools] research_parse_log failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    /**
     * Record an experiment result.
     */
    research_record: tool({
      description:
        "Record the result of an experiment to results.tsv and runs.jsonl. Status is computed deterministically from the experiment outcome.",
      inputSchema: z.object({
        description: z.string().describe("Description of the experiment"),
      }),
      execute: async ({ description }) => {
        try {
          const state = await stateStore.load();
          if (!state) {
            return { success: false, error: "No research state found." };
          }

          // Get the current summary from state (saved by research_run_experiment)
          const summary = state.lastSummary;
          if (!summary) {
            return {
              success: false,
              error:
                "No experiment summary found. Run research_run_experiment first.",
            };
          }
          const metric = summary.metric ?? null;
          const memoryGb = summary.memoryValue ?? null;

          // Compute status deterministically
          let status: ExperimentRecord["status"];
          if (summary?.timedOut) {
            status = "timeout";
          } else if (summary?.crashed || metric === null) {
            status = "crash";
          } else if (state.bestMetric === null) {
            // First successful run - always keep
            status = "keep";
          } else {
            // Compare metric against best
            const isImprovement =
              config.metric.direction === "lower"
                ? metric < state.bestMetric
                : metric > state.bestMetric;
            status = isImprovement ? "keep" : "discard";
          }

          const commit =
            state.candidateCommit || state.acceptedCommit || "unknown";

          const record: ExperimentRecord = {
            commit,
            metric,
            memoryGb,
            status,
            description,
            timestamp: new Date().toISOString(),
          };

          await recorder.appendTsv(record);
          await recorder.appendJsonl(record);

          // Update last status in state
          await stateStore.update({ lastStatus: status });

          return {
            success: true,
            record,
          };
        } catch (error) {
          logger.error("[researchTools] research_record failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    /**
     * Accept the candidate commit as the new baseline.
     */
    research_accept: tool({
      description:
        "Accept the candidate commit as the new best. Updates acceptedCommit to candidateCommit, updates bestMetric from latest metric, and increments keepCount.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const state = await stateStore.load();
          if (!state) {
            return { success: false, error: "No research state found." };
          }

          if (!state.candidateCommit) {
            return { success: false, error: "No candidate commit to accept." };
          }

          // Get latest summary from state (saved by research_run_experiment)
          const summary = state.lastSummary;
          if (!summary || summary.metric === null) {
            return {
              success: false,
              error:
                "No valid experiment summary to accept. Run an experiment first.",
            };
          }
          if (summary.crashed || summary.timedOut) {
            return {
              success: false,
              error: `Cannot accept a ${summary.crashed ? "crashed" : "timed-out"} experiment. Use research_revert instead.`,
            };
          }
          // Require that the latest recorded status is "keep" (set by research_record)
          if (state.lastStatus !== "keep") {
            return {
              success: false,
              error: `Cannot accept: last recorded status is "${state.lastStatus}". Only "keep" experiments can be accepted.`,
            };
          }

          let bestMetric: number | null = state.bestMetric;
          // Validate that this is actually an improvement
          if (state.bestMetric !== null) {
            const isImprovement =
              config.metric.direction === "lower"
                ? summary.metric < state.bestMetric
                : summary.metric > state.bestMetric;
            if (!isImprovement) {
              return {
                success: false,
                error: `Metric ${summary.metric} is not better than current best ${state.bestMetric} (direction: ${config.metric.direction}). Use research_revert instead.`,
              };
            }
          }
          bestMetric = summary.metric;

          await stateStore.update({
            acceptedCommit: state.candidateCommit,
            bestMetric,
            baselineMetric: state.baselineMetric ?? bestMetric,
            keepCount: state.keepCount + 1,
            candidateCommit: null,
          });

          return {
            success: true,
            acceptedCommit: state.candidateCommit,
            bestMetric,
            keepCount: state.keepCount + 1,
          };
        } catch (error) {
          logger.error("[researchTools] research_accept failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    /**
     * Revert to the accepted commit.
     */
    research_revert: tool({
      description:
        "Revert repository to the accepted commit (git reset --hard). Clears candidateCommit from state.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const state = await stateStore.load();
          if (!state) {
            return { success: false, error: "No research state found." };
          }

          if (!state.acceptedCommit) {
            return {
              success: false,
              error: "No accepted commit to revert to.",
            };
          }

          execFileSync("git", ["reset", "--hard", state.acceptedCommit], {
            cwd: config.repoPath,
            encoding: "utf-8",
          });

          await stateStore.update({ candidateCommit: null });

          return {
            success: true,
            revertedTo: state.acceptedCommit,
          };
        } catch (error) {
          logger.error("[researchTools] research_revert failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    /**
     * Inspect the last 50 lines of the run log for debugging.
     */
    research_inspect_failure: tool({
      description:
        "Inspect the last 50 lines of run.log to debug experiment failures.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const logPath = path.join(config.repoPath, config.logPath);
          const logContent = readFileSync(logPath, "utf-8");
          const lines = logContent.split("\n");
          const lastLines = lines.slice(-50).join("\n");

          return {
            success: true,
            tail: lastLines,
            totalLines: lines.length,
          };
        } catch (error) {
          logger.error("[researchTools] research_inspect_failure failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    /**
     * Save the current state to disk.
     */
    research_checkpoint: tool({
      description:
        "Save the current research state to disk. Call periodically to ensure progress is not lost.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const state = await stateStore.load();
          if (!state) {
            return {
              success: false,
              error: "No research state to checkpoint.",
            };
          }

          // Force save by re-saving current state
          await stateStore.save(state);

          return {
            success: true,
            checkpointedAt: new Date().toISOString(),
            phase: state.currentPhase,
            runCount: state.runCount,
          };
        } catch (error) {
          logger.error("[researchTools] research_checkpoint failed", {
            error: String(error),
          });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}

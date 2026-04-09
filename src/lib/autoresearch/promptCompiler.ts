/**
 * Prompt compilation for the autoresearch worker.
 *
 * Reads program.md and combines it with current state and recent
 * results to build the system prompt and per-cycle prompt.
 */

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { getPhaseToolPolicy } from "./phasePolicy.js";
import type {
  ResearchConfig,
  ResearchState,
  ExperimentRecord,
} from "../types/autoresearchTypes.js";

export class PromptCompiler {
  constructor(private config: ResearchConfig) {}

  /** Reads program.md and builds the system prompt */
  async buildSystemPrompt(): Promise<string> {
    const MAX_PROGRAM_BYTES = 1_048_576; // 1 MB
    let programContent = "";
    try {
      const programPath = path.join(
        this.config.repoPath,
        this.config.programPath,
      );
      const stat = statSync(programPath);
      if (stat.size > MAX_PROGRAM_BYTES) {
        logger.warn("[Autoresearch] program.md exceeds 1MB, truncating");
        programContent = readFileSync(programPath, "utf-8").slice(
          0,
          MAX_PROGRAM_BYTES,
        );
      } else {
        programContent = readFileSync(programPath, "utf-8");
      }
    } catch {
      logger.warn(
        "[Autoresearch] program.md not found, using minimal system prompt",
      );
    }

    const toolList = [
      "research_get_context — Get current research state (branch, metric, recent results)",
      "research_read_file — Read a file from the repo (must be in allowed paths)",
      "research_write_candidate — Write to a mutable file (only allowed paths)",
      "research_diff — Show git diff for mutable files",
      "research_commit_candidate — Commit staged mutable files",
      "research_run_experiment — Run the experiment command with timeout",
      "research_parse_log — Parse the experiment log for metrics",
      "research_record — Record experiment result (keep/discard/crash/timeout)",
      "research_accept — Accept candidate (update best metric, advance branch)",
      "research_revert — Revert to last accepted commit",
      "research_inspect_failure — Read last 50 lines of run.log for crash diagnosis",
      "research_checkpoint — Save current state to disk",
    ];

    return [
      "You are an autonomous research agent running experiments in a loop.",
      "",
      programContent ? "## Research Program" : "",
      programContent,
      "",
      "## Available Tools",
      ...toolList.map((t) => `- ${t}`),
      "",
      "## Constraints",
      `- You may ONLY modify these files: ${this.config.mutablePaths.join(", ")}`,
      `- You must NEVER modify: ${this.config.immutablePaths.join(", ")}`,
      `- The primary metric is: ${this.config.metric.name} (${this.config.metric.direction} is better)`,
      `- Experiment timeout: ${Math.round(this.config.timeoutMs / 1000)} seconds`,
      "",
      "## Workflow",
      "1. Call research_get_context to understand current state",
      "2. Read relevant files to understand the code",
      "3. Propose and implement a single experiment change",
      "4. Commit the change",
      "5. Run the experiment",
      "6. Parse the results",
      "7. Record the outcome",
      "8. Accept (if improved) or revert (if not)",
      "",
      "NEVER STOP. Continue proposing experiments indefinitely.",
      "Prefer simplicity — deleting code is better than adding complexity.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  /** Builds the per-cycle prompt with current state + recent results */
  async buildCyclePrompt(
    state: ResearchState,
    recentResults: ExperimentRecord[],
  ): Promise<string> {
    const parts: string[] = [
      `## Current Research State`,
      `- Branch: ${state.branch}`,
      `- Run count: ${state.runCount}`,
      `- Keep count: ${state.keepCount}`,
      `- Best ${this.config.metric.name}: ${state.bestMetric ?? "no baseline yet"}`,
      `- Last status: ${state.lastStatus ?? "none"}`,
      `- Current phase: ${state.currentPhase}`,
      `- Accepted commit: ${state.acceptedCommit ?? "none"}`,
    ];

    if (recentResults.length > 0) {
      parts.push("");
      parts.push("## Recent Results (last 10)");
      parts.push(`commit\t${this.config.metric.name}\tstatus\tdescription`);
      for (const r of recentResults.slice(-10)) {
        const metricStr =
          r.metric !== null && Number.isFinite(r.metric)
            ? r.metric.toFixed(6)
            : "N/A";
        parts.push(`${r.commit}\t${metricStr}\t${r.status}\t${r.description}`);
      }
    }

    parts.push("");

    // Phase-aware first action suggestion (avoid biasing accept_or_revert toward accept)
    const phasePolicy = getPhaseToolPolicy(state.currentPhase);
    let firstAction: string;
    if (phasePolicy.forcedTool) {
      firstAction = phasePolicy.forcedTool;
    } else if (state.currentPhase === "accept_or_revert") {
      // Don't bias toward accept or revert — the deterministic policy decides.
      // Use checkpoint (neutral) since accept/revert are both in activeTools.
      firstAction = "research_checkpoint";
    } else {
      firstAction = phasePolicy.activeTools[0] || "research_get_context";
    }
    parts.push(
      `Continue the experiment loop. Start by calling ${firstAction}.`,
    );

    return parts.join("\n");
  }
}

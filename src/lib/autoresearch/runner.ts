/**
 * Experiment runner — spawn, timeout, capture.
 */

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { parseExperimentSummary } from "./summaryParser.js";
import type { ExperimentSummary, ResearchConfig } from "../types/index.js";

export class ExperimentRunner {
  constructor(private config: ResearchConfig) {}

  /** Runs the experiment with hard timeout, returns summary */
  async run(): Promise<ExperimentSummary> {
    const logPath = path.join(this.config.repoPath, this.config.logPath);

    // Redact potential inline env vars or tokens before logging.
    // sanitizeForLog handles in-string `Bearer`/`Token`/`sk-` patterns but
    // not CLI flag forms like `--token foo` (which is a different shape —
    // separate argv tokens rather than concatenated values). The flag-form
    // redactor below is narrowly scoped; not the H04 anti-pattern.
    const redactedCmd = this.config.runCommand
      .replace(/[A-Z_]+=\S+\s/g, (m) => m.split("=")[0] + "=*** ")
      .replace(
        // eslint-disable-next-line neurolink/no-inline-secret-regex -- narrowly-scoped CLI-flag redactor
        /--(?:token|key|secret|password)\s+\S+/gi,
        (m) => m.split(/\s+/)[0] + " ***",
      );
    logger.info("[Autoresearch] Starting experiment", {
      command: redactedCmd,
      timeoutMs: this.config.timeoutMs,
    });

    // eslint-disable-next-line no-useless-assignment -- catch block assigns on spawn failure
    let logContent = "";
    let timedOut = false;
    let exitCode = 0;

    try {
      logContent = await new Promise<string>((resolve, reject) => {
        let output = "";

        const proc = spawn(this.config.runCommand, {
          shell: true,
          cwd: this.config.repoPath,
          stdio: ["ignore", "pipe", "pipe"],
        });

        // Capture stdout and stderr
        proc.stdout?.on("data", (chunk: Buffer) => {
          output += chunk.toString();
        });
        proc.stderr?.on("data", (chunk: Buffer) => {
          output += chunk.toString();
        });

        // Hard timeout
        const timer = setTimeout(() => {
          timedOut = true;
          try {
            proc.kill("SIGKILL");
          } catch {
            // Process may have already exited
          }
        }, this.config.timeoutMs);

        proc.on("close", (code, signal) => {
          clearTimeout(timer);
          // Signal-terminated (SIGKILL, SIGSEGV, etc.) = crash unless we timed it out
          if (signal && !timedOut) {
            exitCode = 1;
          } else {
            exitCode = code ?? 0;
          }
          logger.debug("[Autoresearch] Experiment process exited", {
            code,
            signal,
            exitCode,
            timedOut,
          });
          resolve(output);
        });

        proc.on("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
    } catch (error) {
      // Spawn failure — treat as crash with non-zero exit code
      const errorMsg = error instanceof Error ? error.message : String(error);
      logContent = `SPAWN ERROR: ${errorMsg}\nFAIL`;
      exitCode = 1;
      logger.error("[Autoresearch] Experiment spawn failed", {
        error: errorMsg,
      });
    }

    // Write log to file
    try {
      writeFileSync(logPath, logContent, "utf-8");
    } catch (writeError) {
      logger.warn("[Autoresearch] Failed to write run.log", {
        error:
          writeError instanceof Error ? writeError.message : String(writeError),
      });
    }

    // Parse summary with exit code and timeout info
    const summary = parseExperimentSummary(
      logContent,
      this.config.metric,
      this.config.memoryMetric,
      {
        timedOut,
        exitCode,
      },
    );

    return summary;
  }
}

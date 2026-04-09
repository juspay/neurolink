/**
 * Deterministic experiment log parser.
 *
 * Extracts metrics from run.log output. Never throws — returns
 * crashed/timedOut summary on parse failure.
 */

import type {
  ExperimentSummary,
  MetricConfig,
  MemoryMetricConfig,
} from "../types/autoresearchTypes.js";

/**
 * Parse experiment output into a structured summary.
 *
 * This function is deterministic and pure — no side effects, no throws.
 */
export function parseExperimentSummary(
  logContent: string,
  metricConfig: MetricConfig,
  memoryConfig?: MemoryMetricConfig,
  options?: { timedOut?: boolean; exitCode?: number },
): ExperimentSummary {
  const lines = logContent.split("\n");
  const tailLines = lines.slice(-50);
  const rawTail = tailLines.join("\n");

  // Check for crash indicators (only if not already determined by exit code)
  let crashed =
    options?.exitCode !== undefined &&
    options.exitCode !== 0 &&
    !options?.timedOut;
  if (!crashed) {
    const lastMeaningfulLine =
      [...lines]
        .reverse()
        .find((l) => l.trim().length > 0)
        ?.trim() ?? "";
    crashed =
      lastMeaningfulLine === "FAIL" ||
      lastMeaningfulLine.toLowerCase().includes("traceback") ||
      lastMeaningfulLine.toLowerCase().includes("error:");
  }

  // Parse primary metric
  let metric: number | null = null;
  try {
    const regex = new RegExp(metricConfig.pattern, "m");
    const match = regex.exec(logContent);
    if (match && match[1]) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && isFinite(parsed)) {
        metric = parsed;
      }
    }
  } catch {
    // Invalid regex — treat as parse failure
  }

  // Parse memory metric
  let memoryValue: number | null = null;
  if (memoryConfig) {
    try {
      const regex = new RegExp(memoryConfig.pattern, "m");
      const match = regex.exec(logContent);
      if (match && match[1]) {
        const parsed = parseFloat(match[1]);
        if (!isNaN(parsed) && isFinite(parsed)) {
          memoryValue = parsed;
          // Convert MB to GB if the name suggests MB.
          // Uses binary divisor (1024 = MiB→GiB). For decimal MB→GB use 1000.
          // The 1024 convention matches GPU monitoring tools (nvidia-smi, etc.).
          const MIB_TO_GIB_DIVISOR = 1024;
          if (memoryConfig.name.toLowerCase().includes("mb")) {
            memoryValue =
              Math.round((memoryValue / MIB_TO_GIB_DIVISOR) * 100) / 100;
          }
        }
      }
    } catch {
      // Invalid regex — treat as parse failure
    }
  }

  // Parse training time
  let trainingSeconds: number | null = null;
  try {
    const timeRegex = /^training_seconds:\s+([\d.]+)/m;
    const match = timeRegex.exec(logContent);
    if (match && match[1]) {
      trainingSeconds = parseFloat(match[1]);
    }
  } catch {
    // Ignore
  }

  // Only treat as timeout if explicitly signaled by the runner — don't infer from missing metric
  const timedOut = options?.timedOut ?? false;

  // Missing metric without explicit timeout is a crash (regex failure, spawn error, etc.)
  const finalCrashed = crashed || (metric === null && !timedOut);

  return {
    crashed: finalCrashed,
    timedOut,
    metric,
    memoryValue,
    trainingSeconds,
    rawTail,
  };
}

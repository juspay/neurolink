/**
 * Experiment result recording — TSV + optional JSONL.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { AutoresearchError } from "./errors.js";
import type {
  ExperimentRecord,
  ExperimentStats,
  ResearchConfig,
} from "../types/autoresearchTypes.js";

export class ResultRecorder {
  private tsvPath: string;
  private jsonlPath: string;

  constructor(private config: ResearchConfig) {
    this.tsvPath = path.join(config.repoPath, config.resultsPath);
    this.jsonlPath = path.join(config.repoPath, ".autoresearch", "runs.jsonl");
  }

  /** Creates results.tsv with header if it doesn't exist */
  async ensureResultsFile(): Promise<void> {
    if (!existsSync(this.tsvPath)) {
      try {
        // Ensure parent directory exists (handles custom resultsPath like "artifacts/results.tsv")
        const dir = path.dirname(this.tsvPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        // Use the actual metric name in header
        const header = `commit\t${this.config.metric.name}\tmemory_gb\tstatus\tdescription`;
        writeFileSync(this.tsvPath, header + "\n", "utf-8");
        logger.info("[Autoresearch] Created results file", {
          path: this.tsvPath,
        });
      } catch (error) {
        throw AutoresearchError.create(
          "RESULTS_WRITE_FAILED",
          `Failed to create results file: ${this.tsvPath}`,
          {
            cause: error instanceof Error ? error : undefined,
          },
        );
      }
    }
  }

  /** Appends one TSV row to results.tsv */
  async appendTsv(record: ExperimentRecord): Promise<void> {
    await this.ensureResultsFile();
    const metricStr = record.metric !== null ? record.metric.toFixed(6) : "N/A";
    const memoryStr =
      record.memoryGb !== null ? record.memoryGb.toFixed(1) : "N/A";
    const safeDescription = record.description.replace(/[\t\n\r]/g, " ").trim();
    const line = `${record.commit}\t${metricStr}\t${memoryStr}\t${record.status}\t${safeDescription}`;
    try {
      appendFileSync(this.tsvPath, line + "\n", "utf-8");
      logger.debug("[Autoresearch] Appended TSV record", {
        commit: record.commit,
        status: record.status,
      });
    } catch (error) {
      throw AutoresearchError.create(
        "RESULTS_WRITE_FAILED",
        `Failed to append to results file`,
        {
          cause: error instanceof Error ? error : undefined,
        },
      );
    }
  }

  /** Appends one JSON line to runs.jsonl */
  async appendJsonl(record: ExperimentRecord): Promise<void> {
    try {
      const dir = path.dirname(this.jsonlPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      appendFileSync(this.jsonlPath, JSON.stringify(record) + "\n", "utf-8");
    } catch (error) {
      // JSONL is optional — log warning but don't throw
      logger.warn("[Autoresearch] Failed to append JSONL audit entry", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Reads all records from results.tsv */
  async readAll(): Promise<ExperimentRecord[]> {
    if (!existsSync(this.tsvPath)) {
      return [];
    }
    try {
      const content = readFileSync(this.tsvPath, "utf-8");
      const lines = content.trim().split("\n");
      if (lines.length <= 1) {
        return [];
      } // Header only

      return lines.slice(1).map((line) => {
        const [commit, metricStr, memoryStr, status, ...descParts] =
          line.split("\t");
        return {
          commit: commit || "",
          metric:
            metricStr && metricStr !== "N/A" ? parseFloat(metricStr) : null,
          memoryGb:
            memoryStr && memoryStr !== "N/A" ? parseFloat(memoryStr) : null,
          status: (status || "crash") as ExperimentRecord["status"],
          description: descParts.join("\t"),
          timestamp: new Date().toISOString(), // Not stored in TSV, use current
        };
      });
    } catch {
      return [];
    }
  }

  /** Returns summary stats */
  async getStats(): Promise<ExperimentStats> {
    const records = await this.readAll();
    const keeps = records.filter((r) => r.status === "keep");
    const bestKeep = keeps.reduce<ExperimentRecord | null>((best, r) => {
      if (r.metric === null) {
        return best;
      }
      if (best === null || best.metric === null) {
        return r;
      }
      if (this.config.metric.direction === "lower") {
        return r.metric < best.metric ? r : best;
      }
      return r.metric > best.metric ? r : best;
    }, null);

    return {
      total: records.length,
      keepCount: keeps.length,
      discardCount: records.filter((r) => r.status === "discard").length,
      crashCount: records.filter((r) => r.status === "crash").length,
      timeoutCount: records.filter((r) => r.status === "timeout").length,
      keepRate: records.length > 0 ? keeps.length / records.length : 0,
      bestMetric: bestKeep?.metric ?? null,
      bestCommit: bestKeep?.commit ?? null,
    };
  }
}

/**
 * Research state persistence — file-backed JSON store.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { AutoresearchError } from "./errors.js";
import type {
  ResearchState,
  ExperimentPhase,
} from "../types/autoresearchTypes.js";

export class ResearchStateStore {
  private filePath: string;

  constructor(repoPath: string, statePath: string) {
    this.filePath = path.join(repoPath, statePath);
  }

  async load(): Promise<ResearchState | null> {
    if (!existsSync(this.filePath)) {
      return null;
    }
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);

      // Validate required fields
      const requiredFields = [
        "branch",
        "currentPhase",
        "runCount",
        "keepCount",
        "tag",
        "startedAt",
        "updatedAt",
      ];
      for (const field of requiredFields) {
        if (!(field in parsed)) {
          throw AutoresearchError.create(
            "STATE_CORRUPT",
            `State file missing required field: ${field}`,
          );
        }
      }
      if (
        !Number.isInteger(parsed.runCount) ||
        parsed.runCount < 0 ||
        !Number.isInteger(parsed.keepCount) ||
        parsed.keepCount < 0
      ) {
        throw AutoresearchError.create(
          "STATE_CORRUPT",
          `State file has invalid numeric fields: runCount=${parsed.runCount}, keepCount=${parsed.keepCount}`,
        );
      }
      const validPhases = [
        "bootstrap",
        "baseline",
        "propose",
        "edit",
        "commit",
        "run",
        "evaluate",
        "record",
        "accept_or_revert",
      ];
      if (!validPhases.includes(parsed.currentPhase)) {
        throw AutoresearchError.create(
          "STATE_CORRUPT",
          `State file has invalid currentPhase: ${parsed.currentPhase}`,
        );
      }
      if (
        isNaN(Date.parse(parsed.startedAt)) ||
        isNaN(Date.parse(parsed.updatedAt))
      ) {
        throw AutoresearchError.create(
          "STATE_CORRUPT",
          "State file has invalid timestamp fields",
        );
      }

      return parsed as ResearchState;
    } catch (error) {
      // Don't double-wrap our own validation errors
      if (error instanceof Error && error.message.includes("AUTORESEARCH")) {
        throw error;
      }
      throw AutoresearchError.create(
        "STATE_CORRUPT",
        `Failed to parse state file: ${this.filePath}`,
        {
          cause: error instanceof Error ? error : undefined,
        },
      );
    }
  }

  async save(state: ResearchState): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    // Strip rawTail from lastSummary before persisting (it's arbitrary stdout/stderr,
    // kept in run.log; storing it in state.json risks leaking sensitive output)
    const stateToPersist = { ...state };
    if (stateToPersist.lastSummary?.rawTail) {
      stateToPersist.lastSummary = {
        ...stateToPersist.lastSummary,
        rawTail: "[see run.log]",
      };
    }
    // Atomic write: write to temp file, then rename
    const tmpPath = `${this.filePath}.tmp`;
    try {
      writeFileSync(tmpPath, JSON.stringify(stateToPersist, null, 2), "utf-8");
      renameSync(tmpPath, this.filePath);
      logger.debug("[Autoresearch] State saved", {
        phase: state.currentPhase,
        runCount: state.runCount,
      });
    } catch (error) {
      throw AutoresearchError.create(
        "STATE_CORRUPT",
        `Failed to write state file: ${this.filePath}`,
        {
          cause: error instanceof Error ? error : undefined,
        },
      );
    }
  }

  async initialize(tag: string, branch: string): Promise<ResearchState> {
    const now = new Date().toISOString();
    const state: ResearchState = {
      branch,
      acceptedCommit: null,
      baselineMetric: null,
      bestMetric: null,
      candidateCommit: null,
      runCount: 0,
      keepCount: 0,
      lastStatus: null,
      currentPhase: "bootstrap",
      tag,
      startedAt: now,
      updatedAt: now,
    };
    await this.save(state);
    logger.info("[Autoresearch] State initialized", { tag, branch });
    return state;
  }

  async update(patch: Partial<ResearchState>): Promise<ResearchState> {
    const current = await this.load();
    if (!current) {
      throw AutoresearchError.create(
        "STATE_NOT_FOUND",
        "Cannot update: no state file found",
      );
    }
    // Validate patch fields before merging
    const VALID_PHASES: ExperimentPhase[] = [
      "bootstrap",
      "baseline",
      "propose",
      "edit",
      "commit",
      "run",
      "evaluate",
      "record",
      "accept_or_revert",
    ];
    if (
      patch.runCount !== undefined &&
      (!Number.isInteger(patch.runCount) || patch.runCount < 0)
    ) {
      throw AutoresearchError.create(
        "STATE_CORRUPT",
        `Invalid runCount: ${patch.runCount}`,
      );
    }
    if (
      patch.keepCount !== undefined &&
      (!Number.isInteger(patch.keepCount) || patch.keepCount < 0)
    ) {
      throw AutoresearchError.create(
        "STATE_CORRUPT",
        `Invalid keepCount: ${patch.keepCount}`,
      );
    }
    if (
      patch.currentPhase !== undefined &&
      !VALID_PHASES.includes(patch.currentPhase)
    ) {
      throw AutoresearchError.create(
        "STATE_CORRUPT",
        `Invalid currentPhase: ${patch.currentPhase}`,
      );
    }
    if (
      patch.bestMetric !== undefined &&
      patch.bestMetric !== null &&
      !Number.isFinite(patch.bestMetric)
    ) {
      throw AutoresearchError.create(
        "STATE_CORRUPT",
        `Invalid bestMetric: ${patch.bestMetric}`,
      );
    }

    const updated: ResearchState = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.save(updated);
    return updated;
  }
}

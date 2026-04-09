/**
 * Repository policy enforcement for autoresearch.
 *
 * Controls which files can be read/written and validates
 * git operations against the research branch.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { logger } from "../utils/logger.js";
import type { ResearchConfig } from "../types/autoresearchTypes.js";

export class RepoPolicy {
  private resolvedMutablePaths: string[];
  private resolvedImmutablePaths: string[];

  constructor(private config: ResearchConfig) {
    this.resolvedMutablePaths = config.mutablePaths.map((p) =>
      path.resolve(config.repoPath, p),
    );
    this.resolvedImmutablePaths = config.immutablePaths.map((p) =>
      path.resolve(config.repoPath, p),
    );
  }

  /** Returns true if resolved path is inside repoPath (handles prefix collision) */
  private isInsideRepo(resolved: string): boolean {
    const rel = path.relative(this.config.repoPath, resolved);
    return !rel.startsWith("..") && !path.isAbsolute(rel);
  }

  /** Returns true if path is within mutablePaths and NOT in immutablePaths */
  isWriteAllowed(filePath: string): boolean {
    const resolved = path.resolve(this.config.repoPath, filePath);
    // Must be inside repoPath
    if (!this.isInsideRepo(resolved)) {
      return false;
    }
    // Immutable paths always deny, even if they're children of a mutable parent
    if (this.isProtected(filePath)) {
      return false;
    }
    return this.resolvedMutablePaths.some(
      (mp) => resolved === mp || resolved.startsWith(mp + path.sep),
    );
  }

  /** Returns true if path is in immutablePaths */
  isProtected(filePath: string): boolean {
    const resolved = path.resolve(this.config.repoPath, filePath);
    return this.resolvedImmutablePaths.some(
      (ip) => resolved === ip || resolved.startsWith(ip + path.sep),
    );
  }

  /** Returns true if path is readable (mutable, immutable, or program path) */
  isReadAllowed(filePath: string): boolean {
    const resolved = path.resolve(this.config.repoPath, filePath);
    if (!this.isInsideRepo(resolved)) {
      return false;
    }
    const programResolved = path.resolve(
      this.config.repoPath,
      this.config.programPath,
    );
    return (
      this.isWriteAllowed(filePath) ||
      this.isProtected(filePath) ||
      resolved === programResolved
    );
  }

  /** Validates staged files are all in mutablePaths and on the right branch */
  async validateCommit(
    expectedBranch: string,
  ): Promise<{ valid: boolean; violations: string[] }> {
    const violations: string[] = [];
    const staged = await this.getStagedFiles();

    for (const file of staged) {
      const resolved = path.resolve(this.config.repoPath, file);
      // Block results files
      if (file === this.config.resultsPath) {
        violations.push(`Results file staged: ${file}`);
        continue;
      }
      // Block state files
      const stateDir = path.dirname(this.config.statePath);
      if (
        file === this.config.statePath ||
        (stateDir !== "." && file.startsWith(stateDir + path.sep))
      ) {
        violations.push(`State file staged: ${file}`);
        continue;
      }
      // Block immutable files (even if under a mutable parent)
      if (
        this.resolvedImmutablePaths.some(
          (ip) => resolved === ip || resolved.startsWith(ip + path.sep),
        )
      ) {
        violations.push(`Immutable file staged: ${file}`);
        continue;
      }
      // Block non-mutable files
      if (
        !this.resolvedMutablePaths.some(
          (mp) => resolved === mp || resolved.startsWith(mp + path.sep),
        )
      ) {
        violations.push(`Non-mutable file staged: ${file}`);
      }
    }

    // Verify branch
    const currentBranch = this.getCurrentBranch();
    if (currentBranch !== expectedBranch) {
      violations.push(
        `Wrong branch: expected ${expectedBranch}, got ${currentBranch}`,
      );
    }

    return { valid: violations.length === 0, violations };
  }

  /** Returns list of staged file paths. Throws on git failure. */
  async getStagedFiles(): Promise<string[]> {
    const output = execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: this.config.repoPath,
      encoding: "utf-8",
    });
    return output.trim().split("\n").filter(Boolean);
  }

  /** Returns current git branch */
  getCurrentBranch(): string {
    try {
      return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: this.config.repoPath,
        encoding: "utf-8",
      }).trim();
    } catch (err) {
      logger.warn("[Autoresearch] getCurrentBranch failed", {
        repoPath: this.config.repoPath,
        error: err instanceof Error ? err.message : String(err),
      });
      return "";
    }
  }

  /** Returns short commit hash */
  getHeadCommit(): string {
    try {
      return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
        cwd: this.config.repoPath,
        encoding: "utf-8",
      }).trim();
    } catch (err) {
      logger.warn("[Autoresearch] getHeadCommit failed", {
        repoPath: this.config.repoPath,
        error: err instanceof Error ? err.message : String(err),
      });
      return "";
    }
  }
}

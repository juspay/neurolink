#!/usr/bin/env tsx

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type GitChangeInfo = {
  addedFiles: Set<string>;
  modifiedFiles: Set<string>;
  deletedFiles: Set<string>;
  allChangedFiles: Set<string>;
};

export class GitChangeDetector {
  /** @deprecated Use tag-based detection instead. Kept for backwards compatibility. */
  private baseBranch: string;
  private repoRoot: string;
  private docsRelativePath: string;

  constructor(
    options: {
      /** @deprecated Use tag-based detection instead. Kept for backwards compatibility. */
      baseBranch?: string;
      repoRoot?: string;
      docsRelativePath?: string;
    } = {}
  ) {
    this.baseBranch =
      options.baseBranch || process.env.GIT_BASE_BRANCH || "release";
    this.repoRoot = options.repoRoot || path.resolve(__dirname, "../..");
    this.docsRelativePath = options.docsRelativePath || "docs";
  }

  /**
   * Check if we're in a git repository
   */
  isGitRepo(): boolean {
    try {
      execSync("git rev-parse --git-dir", {
        cwd: this.repoRoot,
        stdio: "pipe",
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the latest semver tag from the repository
   * @returns The latest tag name (e.g., "v8.41.1") or null if no tags exist
   */
  getLatestTag(): string | null {
    if (!this.isGitRepo()) {
      return null;
    }

    try {
      const output = execSync("git tag --sort=-v:refname", {
        cwd: this.repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      const tags = output.trim().split("\n").filter(Boolean);
      return tags[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Get changed files since a specific tag
   * @param tag - The tag to compare against. If not provided, uses the latest tag.
   * @returns GitChangeInfo with files changed since the tag
   */
  getChangedFilesSinceTag(tag?: string): GitChangeInfo {
    const result: GitChangeInfo = {
      addedFiles: new Set(),
      modifiedFiles: new Set(),
      deletedFiles: new Set(),
      allChangedFiles: new Set(),
    };

    if (!this.isGitRepo()) {
      console.warn("⚠️  Not in a git repository - change detection disabled");
      return result;
    }

    const targetTag = tag || this.getLatestTag();
    if (!targetTag) {
      console.warn("⚠️  No tags found in repository - returning empty change set");
      return result;
    }

    try {
      const docsPath = this.docsRelativePath;

      // Get added files since tag
      this.runGitDiffFromRef(targetTag, "A", docsPath).forEach((f) => {
        result.addedFiles.add(f);
        result.allChangedFiles.add(f);
      });

      // Get modified files since tag
      this.runGitDiffFromRef(targetTag, "M", docsPath).forEach((f) => {
        result.modifiedFiles.add(f);
        result.allChangedFiles.add(f);
      });

      // Get deleted files since tag
      this.runGitDiffFromRef(targetTag, "D", docsPath).forEach((f) => {
        result.deletedFiles.add(f);
      });

      // Also include uncommitted changes (staged, unstaged, untracked)
      const uncommitted = this.getUncommittedChanges();
      uncommitted.addedFiles.forEach((f) => {
        result.addedFiles.add(f);
        result.allChangedFiles.add(f);
      });
      uncommitted.modifiedFiles.forEach((f) => {
        result.modifiedFiles.add(f);
        result.allChangedFiles.add(f);
      });
      uncommitted.deletedFiles.forEach((f) => {
        result.deletedFiles.add(f);
      });

      console.log(`📊 Git changes detected since tag '${targetTag}' (committed + uncommitted):`);
      console.log(`   Added: ${result.addedFiles.size} files`);
      console.log(`   Modified: ${result.modifiedFiles.size} files`);
      console.log(`   Deleted: ${result.deletedFiles.size} files`);
    } catch (error) {
      console.warn(
        "⚠️  Error detecting git changes:",
        (error as Error).message
      );
    }

    return result;
  }

  /**
   * Run git diff from a specific ref (tag or commit)
   */
  private runGitDiffFromRef(ref: string, filter: string, docsPath: string): string[] {
    try {
      const output = execSync(
        `git diff ${ref}...HEAD --diff-filter=${filter} --name-only -- "${docsPath}"`,
        {
          cwd: this.repoRoot,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      return output
        .split("\n")
        .filter((line) => line.trim() && line.endsWith(".md"))
        .map((file) => this.normalizeToDocsRelative(file));
    } catch {
      return [];
    }
  }

  /**
   * Get all changed files using tag-based detection (default)
   * Uses the latest tag as the baseline for comparison
   */
  getChangedFiles(): GitChangeInfo {
    const latestTag = this.getLatestTag();
    if (latestTag) {
      console.log(`📌 Using tag '${latestTag}' as baseline for change detection`);
    }
    return this.getChangedFilesSinceTag(latestTag || undefined);
  }

  /**
   * @deprecated Use getChangedFilesSinceTag() instead. Kept for backwards compatibility.
   * Get all changed files compared to base branch
   */
  getChangedFilesFromBranch(): GitChangeInfo {
    const result: GitChangeInfo = {
      addedFiles: new Set(),
      modifiedFiles: new Set(),
      deletedFiles: new Set(),
      allChangedFiles: new Set(),
    };

    if (!this.isGitRepo()) {
      console.warn("⚠️  Not in a git repository - change detection disabled");
      return result;
    }

    try {
      // Check if base branch exists
      try {
        execSync(`git rev-parse --verify ${this.baseBranch}`, {
          cwd: this.repoRoot,
          stdio: "pipe",
        });
      } catch {
        console.warn(
          `⚠️  Base branch '${this.baseBranch}' not found - trying 'main'`
        );
        this.baseBranch = "main";
      }

      const docsPath = this.docsRelativePath;

      // Get added files
      this.runGitDiff("A", docsPath).forEach((f) => {
        result.addedFiles.add(f);
        result.allChangedFiles.add(f);
      });

      // Get modified files
      this.runGitDiff("M", docsPath).forEach((f) => {
        result.modifiedFiles.add(f);
        result.allChangedFiles.add(f);
      });

      // Get deleted files
      this.runGitDiff("D", docsPath).forEach((f) => {
        result.deletedFiles.add(f);
      });

      // Also include uncommitted changes (staged, unstaged, untracked)
      const uncommitted = this.getUncommittedChanges();
      uncommitted.addedFiles.forEach((f) => {
        result.addedFiles.add(f);
        result.allChangedFiles.add(f);
      });
      uncommitted.modifiedFiles.forEach((f) => {
        result.modifiedFiles.add(f);
        result.allChangedFiles.add(f);
      });
      uncommitted.deletedFiles.forEach((f) => {
        result.deletedFiles.add(f);
      });

      console.log(`📊 Git changes detected vs branch '${this.baseBranch}' (committed + uncommitted):`);
      console.log(`   Added: ${result.addedFiles.size} files`);
      console.log(`   Modified: ${result.modifiedFiles.size} files`);
      console.log(`   Deleted: ${result.deletedFiles.size} files`);
    } catch (error) {
      console.warn(
        "⚠️  Error detecting git changes:",
        (error as Error).message
      );
    }

    return result;
  }

  /**
   * @deprecated Used by getChangedFilesFromBranch(). Use runGitDiffFromRef() instead.
   * Run git diff with specific filter against base branch
   */
  private runGitDiff(filter: string, docsPath: string): string[] {
    try {
      const output = execSync(
        `git diff ${this.baseBranch}...HEAD --diff-filter=${filter} --name-only -- "${docsPath}"`,
        {
          cwd: this.repoRoot,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      return output
        .split("\n")
        .filter((line) => line.trim() && line.endsWith(".md"))
        .map((file) => this.normalizeToDocsRelative(file));
    } catch {
      return [];
    }
  }

  /**
   * Normalize file path to be relative to docs directory
   */
  private normalizeToDocsRelative(file: string): string {
    const docsPrefix = `${this.docsRelativePath}/`;
    if (file.startsWith(docsPrefix)) {
      return file.slice(docsPrefix.length);
    }
    return file;
  }

  /**
   * Parse git name-status output (A/M/D followed by filename)
   */
  private parseNameStatus(output: string, result: GitChangeInfo): void {
    output
      .split("\n")
      .filter((line) => line.trim())
      .forEach((line) => {
        const [status, ...fileParts] = line.split("\t");
        const file = fileParts.join("\t");
        if (!file || !file.endsWith(".md")) return;

        const relativePath = this.normalizeToDocsRelative(file);

        if (status === "A") {
          result.addedFiles.add(relativePath);
        } else if (status === "M") {
          result.modifiedFiles.add(relativePath);
        } else if (status === "D") {
          result.deletedFiles.add(relativePath);
        }

        if (status !== "D") {
          result.allChangedFiles.add(relativePath);
        }
      });
  }

  /**
   * Get uncommitted changes (staged, unstaged, untracked)
   */
  getUncommittedChanges(): GitChangeInfo {
    const result: GitChangeInfo = {
      addedFiles: new Set(),
      modifiedFiles: new Set(),
      deletedFiles: new Set(),
      allChangedFiles: new Set(),
    };

    if (!this.isGitRepo()) return result;

    try {
      const docsPath = this.docsRelativePath;

      // Get staged changes
      const staged = execSync(
        `git diff --cached --name-status -- "${docsPath}"`,
        { cwd: this.repoRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );
      this.parseNameStatus(staged, result);

      // Get unstaged changes
      const unstaged = execSync(
        `git diff --name-status -- "${docsPath}"`,
        { cwd: this.repoRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );
      this.parseNameStatus(unstaged, result);

      // Get untracked files (all are "added")
      const untracked = execSync(
        `git ls-files --others --exclude-standard -- "${docsPath}"`,
        { cwd: this.repoRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );
      untracked
        .split("\n")
        .filter((f) => f.trim() && f.endsWith(".md"))
        .forEach((file) => {
          const relativePath = this.normalizeToDocsRelative(file);
          result.addedFiles.add(relativePath);
          result.allChangedFiles.add(relativePath);
        });
    } catch (error) {
      console.warn(
        "⚠️  Error detecting uncommitted changes:",
        (error as Error).message
      );
    }

    return result;
  }

  /**
   * Get the last commit date for a file
   */
  getFileCommitDate(relativePath: string): Date | null {
    try {
      const fullPath = path.join(this.docsRelativePath, relativePath);
      const output = execSync(`git log -1 --format=%aI -- "${fullPath}"`, {
        cwd: this.repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const dateStr = output.trim();
      return dateStr ? new Date(dateStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a badge should still be shown based on commit date
   */
  shouldShowBadge(
    commitDate: Date | null,
    expirationDays: number = 30
  ): boolean {
    if (!commitDate) return false;

    const now = new Date();
    const daysSince =
      (now.getTime() - commitDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= expirationDays;
  }
}

// Export a singleton for easy use
export const gitChangeDetector = new GitChangeDetector();

// Allow running directly for testing (ES module compatible check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  console.log("\n🔍 Testing Git Change Detector\n");
  const detector = new GitChangeDetector();

  console.log("--- Latest Tag ---");
  const latestTag = detector.getLatestTag();
  console.log(`   Latest tag: ${latestTag || "(none)"}`);

  console.log("\n--- Uncommitted Changes Only ---");
  const uncommitted = detector.getUncommittedChanges();
  console.log(`   Added: ${uncommitted.addedFiles.size} files`);
  console.log(`   Modified: ${uncommitted.modifiedFiles.size} files`);
  console.log(`   Deleted: ${uncommitted.deletedFiles.size} files`);

  console.log("\n--- All Changes (Tag-based, Committed + Uncommitted) ---");
  const changes = detector.getChangedFiles();

  if (changes.addedFiles.size > 0) {
    console.log("\n📝 Added files:");
    changes.addedFiles.forEach((f) => console.log(`   + ${f}`));
  }

  if (changes.modifiedFiles.size > 0) {
    console.log("\n✏️  Modified files:");
    changes.modifiedFiles.forEach((f) => console.log(`   ~ ${f}`));
  }

  if (changes.deletedFiles.size > 0) {
    console.log("\n🗑️  Deleted files:");
    changes.deletedFiles.forEach((f) => console.log(`   - ${f}`));
  }
}

#!/usr/bin/env tsx

/**
 * NeuroLink Semantic Commit Validation Script
 *
 * Enforces semantic commit conventions with required scope:
 * Format: <type>(<scope>): <description>
 *
 * Examples:
 * feat(auth): add user authentication
 * fix(api): resolve login endpoint issue
 * docs(readme): update installation guide
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ANSI color codes for output formatting
const colors: Record<string, string> = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Allowed semantic commit types
const SEMANTIC_TYPES = [
  "feat", // New feature
  "fix", // Bug fix
  "docs", // Documentation changes
  "style", // Code style changes (formatting, missing semi-colons, etc)
  "refactor", // Code refactoring
  "test", // Adding or updating tests
  "chore", // Maintenance tasks, dependency updates
  "perf", // Performance improvements
  "ci", // CI/CD changes
  "build", // Build system changes
  "revert", // Revert previous commit
  "wip", // Work in progress (use sparingly)
  "hotfix", // Critical bug fixes
];

/**
 * Semantic commit message pattern for validation
 * Matches: type(scope): description
 * - type: lowercase letter sequence (must be from SEMANTIC_TYPES)
 * - scope: letters, numbers, hyphens, and slashes (no spaces for consistency)
 * - description: any character sequence after colon and space
 */
const SEMANTIC_COMMIT_PATTERN = /^([a-z]+)(\([a-zA-Z0-9\-/]+\)):\s(.+)$/i;

/**
 * Ceiling for the local git queries below.
 *
 * This script runs from a husky hook on every commit AND in two workflows, so
 * an unbounded git call blocks committing entirely and stalls the Single Commit
 * Policy check with it. `execSync` blocks the event loop, so the symptom is a
 * frozen terminal with no output rather than a slow one. Ten seconds matches
 * the bound already used for the same purpose in scripts/security-check.ts.
 *
 * Both call sites already sit in a try/catch that reports "Unable to retrieve
 * commit message", so a timeout surfaces as that rather than as a crash.
 */
const GIT_TIMEOUT_MS = 10_000;

class CommitValidator {
  errors: string[];
  warnings: string[];
  startTime: number;

  constructor() {
    this.errors = [];
    this.warnings = [];
    this.startTime = Date.now();
  }

  log(message: string, color = "reset"): void {
    console.log(`${colors[color]}[COMMIT] ${message}${colors.reset}`);
  }

  addError(message: string): void {
    this.errors.push(message);
  }

  addWarning(message: string): void {
    this.warnings.push(message);
  }

  // Get the commit message from various sources
  getCommitMessage(): string | null {
    try {
      // Try to get from command line arguments first (for testing)
      if (process.argv[2]) {
        return process.argv[2];
      }

      // Try to get from environment variable (for pre-commit context)
      if (
        process.env.COMMIT_MSG_FILE &&
        fs.existsSync(process.env.COMMIT_MSG_FILE)
      ) {
        const commitMsg = fs
          .readFileSync(process.env.COMMIT_MSG_FILE, "utf8")
          .trim();
        return commitMsg.split("\n")[0].trim();
      }

      // Try to get from git commit message file
      const gitDir = execSync("git rev-parse --git-dir", {
        encoding: "utf8",
        timeout: GIT_TIMEOUT_MS,
        killSignal: "SIGKILL",
      }).trim();
      const commitMsgFile = path.join(gitDir, "COMMIT_EDITMSG");

      if (fs.existsSync(commitMsgFile)) {
        const commitMsg = fs.readFileSync(commitMsgFile, "utf8").trim();
        // Return only the first line (subject line)
        return commitMsg.split("\n")[0].trim();
      }

      // Try to get the last commit message
      const lastCommit = execSync('git log -1 --pretty=format:"%s"', {
        encoding: "utf8",
        timeout: GIT_TIMEOUT_MS,
        killSignal: "SIGKILL",
      });
      return lastCommit.trim();
    } catch (_error: unknown) {
      this.addError("Unable to retrieve commit message");
      return null;
    }
  }

  // Validate semantic commit format
  validateSemanticFormat(commitMessage: string): boolean {
    if (!commitMessage) {
      this.addError("Commit message is empty");
      return false;
    }

    // Use the predefined semantic commit pattern
    const match = commitMessage.match(SEMANTIC_COMMIT_PATTERN);

    if (!match) {
      this.addError("Commit message does not follow semantic commit format");
      this.addError("Expected format: <type>(<scope>): <description>");
      this.addError(`Received: "${commitMessage}"`);

      // Provide specific guidance based on what's missing
      if (!commitMessage.includes(":")) {
        this.addError("Missing colon (:) after type and scope");
      } else if (
        !commitMessage.includes("(") ||
        !commitMessage.includes(")")
      ) {
        this.addError("Missing scope in parentheses");
      }

      return false;
    }

    const [, type, scopeWithParens, description] = match;
    const scope = scopeWithParens.slice(1, -1); // Remove parentheses

    // Validate type
    if (!SEMANTIC_TYPES.includes(type.toLowerCase())) {
      this.addError(`Invalid commit type: "${type}"`);
      this.addError(`Allowed types: ${SEMANTIC_TYPES.join(", ")}`);
      return false;
    }

    // Validate scope is not empty
    if (!scope || scope.trim().length === 0) {
      this.addError("Scope is required and cannot be empty");
      this.addError("Example: feat(auth): add user login feature");
      return false;
    }

    // Validate scope format (letters, numbers, hyphens, slashes - no spaces for consistency)
    const scopePattern = /^[a-zA-Z0-9\-/]+$/;
    if (!scopePattern.test(scope)) {
      this.addError(`Invalid scope format: "${scope}"`);
      this.addError(
        "Scope should contain only letters, numbers, hyphens, and slashes (no spaces)",
      );
      return false;
    }

    // Validate description
    if (!description || description.trim().length === 0) {
      this.addError("Commit description is required");
      return false;
    }

    // Description should be descriptive (at least 10 characters)
    if (description.trim().length < 10) {
      this.addWarning(
        "Commit description is very short - consider being more descriptive",
      );
    }

    // Description should not end with a period
    if (description.endsWith(".")) {
      this.addWarning("Commit description should not end with a period");
    }

    // Description should start with lowercase (conventional)
    if (description.charAt(0) !== description.charAt(0).toLowerCase()) {
      this.addWarning(
        "Commit description should start with lowercase letter",
      );
    }

    return true;
  }

  // Check for common commit message anti-patterns
  validateCommitQuality(commitMessage: string): void {
    const lowQualityPatterns: Array<{ pattern: RegExp; message: string }> = [
      {
        pattern: /^(wip|temp|tmp|fix|update|changes?)$/i,
        message: "Commit message is too generic",
      },
      { pattern: /^.{1,5}$/, message: "Commit message is too short" },
      {
        pattern: /^.{100,}/,
        message: "Commit message is too long (>100 characters)",
      },
      {
        pattern: /^\d+$/,
        message: "Commit message cannot be just numbers",
      },
      {
        pattern: /^[A-Z\s]+$/,
        message: "Commit message cannot be all uppercase",
      },
    ];

    for (const { pattern, message } of lowQualityPatterns) {
      if (pattern.test(commitMessage)) {
        this.addWarning(message);
      }
    }
  }

  // Check if this is a merge commit or other special commit
  isSpecialCommit(commitMessage: string): boolean {
    const specialPatterns = [
      /^Merge branch/,
      /^Merge pull request/,
      /^Merge \w{7,40} into \w{7,40}$/, // Merge commit hash pattern
      /^Revert "/,
      /^Initial commit/,
      /^Merge remote-tracking branch/,
      /^Generated with \[Claude Code\]/,
    ];

    return specialPatterns.some((pattern) => pattern.test(commitMessage));
  }

  // Provide examples of good commit messages
  provideExamples(): void {
    const examples = [
      "feat(auth): add OAuth2 authentication flow",
      "fix(api): resolve null pointer exception in user service",
      "docs(readme): update installation instructions",
      "style(components): fix linting issues in header component",
      "refactor(utils): simplify date formatting function",
      "test(integration): add tests for payment processing",
      "chore(deps): update dependencies to latest versions",
      "perf(database): optimize user query performance",
      "ci(workflow): add automated deployment pipeline",
      "build(webpack): update build configuration for production",
    ];

    this.log("\nExamples of valid commit messages:", "blue");
    examples.forEach((example) => {
      console.log(`   ${colors.green}${example}${colors.reset}`);
    });
  }

  // Main validation function
  async run(): Promise<void> {
    this.log("Validating commit message format...", "cyan");
    console.log("=".repeat(50));

    const commitMessage = this.getCommitMessage();

    if (!commitMessage) {
      this.printResults();
      return;
    }

    this.log(`Checking: "${commitMessage}"`, "blue");

    // Skip validation for special commits (merges, reverts, etc.)
    if (this.isSpecialCommit(commitMessage)) {
      this.log(
        "Special commit detected - skipping semantic validation",
        "green",
      );
      console.log("=".repeat(50));
      this.log("Commit validation passed!", "green");
      return;
    }

    // Validate semantic format
    this.validateSemanticFormat(commitMessage);

    // Check commit quality
    this.validateCommitQuality(commitMessage);

    this.printResults();
  }

  printResults(): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log("=".repeat(50));
    this.log(`Commit validation completed in ${duration}s`, "cyan");

    if (this.errors.length > 0) {
      console.log(`
${colors.red}COMMIT VALIDATION FAILED!${colors.reset}`);
      console.log("=".repeat(50));

      this.errors.forEach((error: string, index: number) => {
        console.log(
          `${index + 1}. ${colors.red}[ERROR]${colors.reset} ${error}`,
        );
      });

      console.log(`
${colors.yellow}How to fix:${colors.reset}`);
      console.log(
        "1. Follow the semantic commit format: <type>(<scope>): <description>",
      );
      console.log("2. Use a valid type from the allowed list");
      console.log("3. Include a scope in parentheses (required)");
      console.log("4. Write a clear, descriptive message");

      this.provideExamples();

      console.log(`\n${colors.red}COMMIT BLOCKED!${colors.reset}`);
      console.log(
        `${colors.red}Please fix the above issues and try again.${colors.reset}`,
      );
      process.exit(1);
    }

    if (this.warnings.length > 0) {
      console.log(
        `\n${colors.yellow}COMMIT WARNINGS:${colors.reset}`,
      );
      console.log("=".repeat(50));

      this.warnings.forEach((warning: string, index: number) => {
        console.log(
          `${index + 1}. ${colors.yellow}[WARNING]${colors.reset} ${warning}`,
        );
      });

      console.log(
        `\n${colors.yellow}Consider addressing these warnings for better commit quality.${colors.reset}`,
      );
    }

    if (this.errors.length === 0) {
      console.log(
        `\n${colors.green}COMMIT VALIDATION PASSED!${colors.reset}`,
      );
      console.log("=".repeat(50));
      console.log(
        `${colors.green}Commit message follows semantic conventions${colors.reset}`,
      );
      if (this.warnings.length === 0) {
        console.log(
          `${colors.green}Perfect commit message quality!${colors.reset}`,
        );
      }
    }
  }
}

// Run the commit validator
const validator = new CommitValidator();
validator.run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `${colors.red}Commit validation crashed: ${message}${colors.reset}`,
  );
  process.exit(1);
});

export default CommitValidator;

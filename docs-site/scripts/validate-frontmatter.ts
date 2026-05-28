#!/usr/bin/env tsx

/**
 * validate-frontmatter.ts
 *
 * Validates frontmatter in documentation files for the NeuroLink docs site.
 * Checks for required fields, valid YAML, SEO fields, and potential issues.
 *
 * Usage:
 *   pnpm validate:frontmatter         (relaxed mode - warnings only)
 *   pnpm validate:frontmatter:strict  (strict mode - fails on errors)
 */

import * as fs from "fs";
import { glob } from "glob";
import matter from "gray-matter";
import * as path from "path";
import chalk from "chalk";

// Parse CLI arguments
const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const warnOnly = !isStrict;

// Configuration
const DOCS_DIR = path.resolve(__dirname, "../docs");

// Paths to skip (relative to docs directory)
const SKIP_PATHS = [
  "index.md",
  "404.md",
  "test-reports/",
  "visual-content/",
];

// Patterns to skip
const SKIP_PATTERNS = [
  "**/README.md",
  "**/_category_.json",
];

// Validation constraints (adjust based on strict mode)
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MIN_LENGTH = isStrict ? 20 : 10;
const DESCRIPTION_MAX_LENGTH = 300;
const MAX_KEYWORDS = 10;
const MIN_KEYWORDS = 1;

// Valid Twitter card types
const VALID_TWITTER_CARDS = ["summary", "summary_large_image", "app", "player"];

// Validation issue types
type IssueLevel = "error" | "warning" | "info";

type ValidationIssue = {
  level: IssueLevel;
  file: string;
  message: string;
  field?: string;
};

type ValidationResult = {
  file: string;
  issues: ValidationIssue[];
  frontmatter: Record<string, unknown>;
};

type ValidationSummary = {
  totalFiles: number;
  filesWithErrors: number;
  filesWithWarnings: number;
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
};

/**
 * Check if a path should be skipped
 */
function shouldSkip(relativePath: string): boolean {
  // Check exact path matches
  for (const skipPath of SKIP_PATHS) {
    if (relativePath === skipPath) return true;
    if (skipPath.endsWith("/") && relativePath.startsWith(skipPath)) return true;
  }

  // Check pattern matches
  const filename = path.basename(relativePath);
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.includes("**")) {
      // Handle glob-like patterns
      const patternBase = pattern.replace("**/", "");
      if (filename === patternBase) return true;
    } else if (filename === pattern) {
      return true;
    }
  }

  return false;
}

/**
 * Validate required fields
 */
function validateRequiredFields(
  frontmatter: Record<string, unknown>,
  relativePath: string,
  issues: ValidationIssue[]
): void {
  const errorLevel: IssueLevel = warnOnly ? "warning" : "error";

  // Title validation (required, 3-100 chars)
  if (!frontmatter.title) {
    issues.push({
      level: errorLevel,
      file: relativePath,
      message: "Missing required field: title",
      field: "title",
    });
  } else if (typeof frontmatter.title !== "string") {
    issues.push({
      level: errorLevel,
      file: relativePath,
      message: `title must be a string, got ${typeof frontmatter.title}`,
      field: "title",
    });
  } else {
    const titleLen = frontmatter.title.length;
    if (titleLen < TITLE_MIN_LENGTH) {
      issues.push({
        level: errorLevel,
        file: relativePath,
        message: `title is too short (${titleLen} chars, minimum: ${TITLE_MIN_LENGTH})`,
        field: "title",
      });
    } else if (titleLen > TITLE_MAX_LENGTH) {
      issues.push({
        level: errorLevel,
        file: relativePath,
        message: `title is too long (${titleLen} chars, maximum: ${TITLE_MAX_LENGTH})`,
        field: "title",
      });
    }
  }

  // Description validation (required, 20-300 chars)
  if (!frontmatter.description) {
    issues.push({
      level: errorLevel,
      file: relativePath,
      message: "Missing required field: description",
      field: "description",
    });
  } else if (typeof frontmatter.description !== "string") {
    issues.push({
      level: errorLevel,
      file: relativePath,
      message: `description must be a string, got ${typeof frontmatter.description}`,
      field: "description",
    });
  } else {
    const descLen = frontmatter.description.length;
    if (descLen < DESCRIPTION_MIN_LENGTH) {
      issues.push({
        level: errorLevel,
        file: relativePath,
        message: `description is too short (${descLen} chars, minimum: ${DESCRIPTION_MIN_LENGTH})`,
        field: "description",
      });
    } else if (descLen > DESCRIPTION_MAX_LENGTH) {
      issues.push({
        level: errorLevel,
        file: relativePath,
        message: `description is too long (${descLen} chars, maximum: ${DESCRIPTION_MAX_LENGTH})`,
        field: "description",
      });
    }
  }

  // sidebar_position validation (required, number >= 0)
  if (frontmatter.sidebar_position === undefined) {
    issues.push({
      level: errorLevel,
      file: relativePath,
      message: "Missing required field: sidebar_position",
      field: "sidebar_position",
    });
  } else if (typeof frontmatter.sidebar_position !== "number") {
    issues.push({
      level: errorLevel,
      file: relativePath,
      message: `sidebar_position must be a number, got ${typeof frontmatter.sidebar_position}`,
      field: "sidebar_position",
    });
  } else if (frontmatter.sidebar_position < 0) {
    issues.push({
      level: errorLevel,
      file: relativePath,
      message: `sidebar_position must be >= 0, got ${frontmatter.sidebar_position}`,
      field: "sidebar_position",
    });
  }
}

/**
 * Validate optional fields
 */
function validateOptionalFields(
  frontmatter: Record<string, unknown>,
  relativePath: string,
  issues: ValidationIssue[]
): void {
  // slug validation (lowercase alphanumeric with dashes)
  if (frontmatter.slug !== undefined) {
    if (typeof frontmatter.slug !== "string") {
      issues.push({
        level: "warning",
        file: relativePath,
        message: `slug must be a string, got ${typeof frontmatter.slug}`,
        field: "slug",
      });
    } else {
      const slugPattern = /^[a-z0-9-/]+$/;
      if (!slugPattern.test(frontmatter.slug)) {
        issues.push({
          level: "warning",
          file: relativePath,
          message: `slug should be lowercase alphanumeric with dashes (got: "${frontmatter.slug}")`,
          field: "slug",
        });
      }
    }
  }

  // keywords validation (array, 1-10 items)
  if (frontmatter.keywords !== undefined) {
    if (!Array.isArray(frontmatter.keywords)) {
      issues.push({
        level: "warning",
        file: relativePath,
        message: `keywords must be an array, got ${typeof frontmatter.keywords}`,
        field: "keywords",
      });
    } else {
      const keywordsLen = frontmatter.keywords.length;
      if (keywordsLen < MIN_KEYWORDS) {
        issues.push({
          level: "warning",
          file: relativePath,
          message: `keywords array should have at least ${MIN_KEYWORDS} item(s), got ${keywordsLen}`,
          field: "keywords",
        });
      } else if (keywordsLen > MAX_KEYWORDS) {
        issues.push({
          level: "warning",
          file: relativePath,
          message: `keywords array should have at most ${MAX_KEYWORDS} items, got ${keywordsLen}`,
          field: "keywords",
        });
      }
      // Validate each keyword is a string
      for (let i = 0; i < frontmatter.keywords.length; i++) {
        if (typeof frontmatter.keywords[i] !== "string") {
          issues.push({
            level: "warning",
            file: relativePath,
            message: `keywords[${i}] must be a string`,
            field: "keywords",
          });
        }
      }
    }
  }

  // image validation (string)
  if (frontmatter.image !== undefined && typeof frontmatter.image !== "string") {
    issues.push({
      level: "warning",
      file: relativePath,
      message: `image must be a string, got ${typeof frontmatter.image}`,
      field: "image",
    });
  }

  // tags validation (array)
  if (frontmatter.tags !== undefined) {
    if (!Array.isArray(frontmatter.tags)) {
      issues.push({
        level: "warning",
        file: relativePath,
        message: `tags must be an array, got ${typeof frontmatter.tags}`,
        field: "tags",
      });
    } else {
      for (let i = 0; i < frontmatter.tags.length; i++) {
        if (typeof frontmatter.tags[i] !== "string") {
          issues.push({
            level: "warning",
            file: relativePath,
            message: `tags[${i}] must be a string`,
            field: "tags",
          });
        }
      }
    }
  }

  // draft validation (boolean)
  if (frontmatter.draft !== undefined && typeof frontmatter.draft !== "boolean") {
    issues.push({
      level: "warning",
      file: relativePath,
      message: `draft must be a boolean, got ${typeof frontmatter.draft}`,
      field: "draft",
    });
  }

  // hide_title validation (boolean)
  if (frontmatter.hide_title !== undefined && typeof frontmatter.hide_title !== "boolean") {
    issues.push({
      level: "warning",
      file: relativePath,
      message: `hide_title must be a boolean, got ${typeof frontmatter.hide_title}`,
      field: "hide_title",
    });
  }

  // hide_table_of_contents validation (boolean)
  if (frontmatter.hide_table_of_contents !== undefined && typeof frontmatter.hide_table_of_contents !== "boolean") {
    issues.push({
      level: "warning",
      file: relativePath,
      message: `hide_table_of_contents must be a boolean, got ${typeof frontmatter.hide_table_of_contents}`,
      field: "hide_table_of_contents",
    });
  }

  // sidebar_label validation (string)
  if (frontmatter.sidebar_label !== undefined && typeof frontmatter.sidebar_label !== "string") {
    issues.push({
      level: "warning",
      file: relativePath,
      message: `sidebar_label must be a string, got ${typeof frontmatter.sidebar_label}`,
      field: "sidebar_label",
    });
  }

  // pagination_label validation (string)
  if (frontmatter.pagination_label !== undefined && typeof frontmatter.pagination_label !== "string") {
    issues.push({
      level: "warning",
      file: relativePath,
      message: `pagination_label must be a string, got ${typeof frontmatter.pagination_label}`,
      field: "pagination_label",
    });
  }
}

/**
 * Validate SEO fields
 */
function validateSEOFields(
  frontmatter: Record<string, unknown>,
  relativePath: string,
  issues: ValidationIssue[]
): void {
  // og:title validation
  if (frontmatter["og:title"] !== undefined && typeof frontmatter["og:title"] !== "string") {
    issues.push({
      level: "warning",
      file: relativePath,
      message: `og:title must be a string, got ${typeof frontmatter["og:title"]}`,
      field: "og:title",
    });
  }

  // og:description validation
  if (frontmatter["og:description"] !== undefined && typeof frontmatter["og:description"] !== "string") {
    issues.push({
      level: "warning",
      file: relativePath,
      message: `og:description must be a string, got ${typeof frontmatter["og:description"]}`,
      field: "og:description",
    });
  }

  // og:image validation
  if (frontmatter["og:image"] !== undefined && typeof frontmatter["og:image"] !== "string") {
    issues.push({
      level: "warning",
      file: relativePath,
      message: `og:image must be a string, got ${typeof frontmatter["og:image"]}`,
      field: "og:image",
    });
  }

  // twitter:card validation
  if (frontmatter["twitter:card"] !== undefined) {
    if (typeof frontmatter["twitter:card"] !== "string") {
      issues.push({
        level: "warning",
        file: relativePath,
        message: `twitter:card must be a string, got ${typeof frontmatter["twitter:card"]}`,
        field: "twitter:card",
      });
    } else if (!VALID_TWITTER_CARDS.includes(frontmatter["twitter:card"])) {
      issues.push({
        level: "warning",
        file: relativePath,
        message: `twitter:card must be one of: ${VALID_TWITTER_CARDS.join(", ")} (got: "${frontmatter["twitter:card"]}")`,
        field: "twitter:card",
      });
    }
  }
}

/**
 * Check for duplicate sidebar_position in same directory
 */
function checkDuplicateSidebarPositions(
  relativePath: string,
  frontmatter: Record<string, unknown>,
  allFrontmatter: Map<string, Record<string, unknown>>,
  issues: ValidationIssue[]
): void {
  const position = frontmatter.sidebar_position;
  if (position === undefined || typeof position !== "number") return;

  const dirPath = path.dirname(relativePath);

  for (const [otherPath, otherFrontmatter] of allFrontmatter.entries()) {
    if (otherPath === relativePath) continue;
    if (path.dirname(otherPath) !== dirPath) continue;

    if (otherFrontmatter.sidebar_position === position) {
      issues.push({
        level: "warning",
        file: relativePath,
        message: `Duplicate sidebar_position ${position} in same directory (also used by ${path.basename(otherPath)})`,
        field: "sidebar_position",
      });
      break; // Only report once per file
    }
  }
}

/**
 * Validate a single file's frontmatter
 */
function validateFile(
  filePath: string,
  relativePath: string,
  allFrontmatter: Map<string, Record<string, unknown>>
): ValidationResult {
  const issues: ValidationIssue[] = [];
  let frontmatter: Record<string, unknown> = {};

  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // Try to parse frontmatter
    try {
      const parsed = matter(content);
      frontmatter = parsed.data;
    } catch (parseError) {
      issues.push({
        level: warnOnly ? "warning" : "error",
        file: relativePath,
        message: `Invalid YAML frontmatter: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      });
      return { file: relativePath, issues, frontmatter };
    }

    // Validate required fields
    validateRequiredFields(frontmatter, relativePath, issues);

    // Validate optional fields
    validateOptionalFields(frontmatter, relativePath, issues);

    // Validate SEO fields
    validateSEOFields(frontmatter, relativePath, issues);

    // Check for duplicate sidebar_position
    checkDuplicateSidebarPositions(relativePath, frontmatter, allFrontmatter, issues);

    // Info: Check for draft status
    if (frontmatter.draft === true) {
      issues.push({
        level: "info",
        file: relativePath,
        message: "Document is marked as draft",
        field: "draft",
      });
    }

    // Info: Check for deprecated tags
    if (Array.isArray(frontmatter.tags) && frontmatter.tags.includes("deprecated")) {
      issues.push({
        level: "info",
        file: relativePath,
        message: "Document is marked as deprecated",
        field: "tags",
      });
    }
  } catch (error) {
    issues.push({
      level: warnOnly ? "warning" : "error",
      file: relativePath,
      message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return { file: relativePath, issues, frontmatter };
}

/**
 * Get all markdown files to validate
 */
async function getMarkdownFiles(docsDir: string): Promise<string[]> {
  const pattern = "**/*.md";
  const files = await glob(pattern, { cwd: docsDir, nodir: true });

  return files.filter((file) => !shouldSkip(file));
}

/**
 * Format issue for console output with chalk
 */
function formatIssue(issue: ValidationIssue): string {
  const levelSymbols: Record<IssueLevel, string> = {
    error: chalk.red.bold("X"),
    warning: chalk.yellow.bold("!"),
    info: chalk.cyan.bold("i"),
  };

  const symbol = levelSymbols[issue.level];
  let message = `  [${symbol}] ${issue.message}`;

  if (issue.field) {
    message += chalk.dim(` (${issue.field})`);
  }

  return message;
}

/**
 * Main validation function
 */
async function validateFrontmatter(): Promise<void> {
  console.log(chalk.bold("\nValidating frontmatter...\n"));
  console.log(chalk.dim(`Source: ${DOCS_DIR}\n`));

  // Check if docs directory exists
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(chalk.red.bold(`Error: Docs directory does not exist: ${DOCS_DIR}`));
    process.exit(1);
  }

  // Get all markdown files
  const files = await getMarkdownFiles(DOCS_DIR);
  console.log(chalk.dim(`Found ${files.length} markdown files to validate\n`));

  if (files.length === 0) {
    console.log(chalk.yellow("No files to validate."));
    process.exit(0);
  }

  // First pass: collect all frontmatter for cross-file checks
  const allFrontmatter = new Map<string, Record<string, unknown>>();

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(content);
      allFrontmatter.set(file, data);
    } catch {
      allFrontmatter.set(file, {});
    }
  }

  // Second pass: validate each file
  const results: ValidationResult[] = [];

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    const result = validateFile(filePath, file, allFrontmatter);
    results.push(result);
  }

  // Calculate summary
  const summary: ValidationSummary = {
    totalFiles: results.length,
    filesWithErrors: 0,
    filesWithWarnings: 0,
    totalErrors: 0,
    totalWarnings: 0,
    totalInfo: 0,
  };

  // Print results
  console.log(chalk.bold.underline("Validation Results\n"));

  for (const result of results) {
    if (result.issues.length === 0) continue;

    const hasErrors = result.issues.some((i) => i.level === "error");
    const hasWarnings = result.issues.some((i) => i.level === "warning");

    if (hasErrors) summary.filesWithErrors++;
    if (hasWarnings) summary.filesWithWarnings++;

    // Color the file path based on severity
    const fileDisplay = hasErrors
      ? chalk.red(result.file)
      : hasWarnings
        ? chalk.yellow(result.file)
        : chalk.cyan(result.file);

    console.log(`${fileDisplay}:`);

    for (const issue of result.issues) {
      console.log(formatIssue(issue));

      if (issue.level === "error") summary.totalErrors++;
      else if (issue.level === "warning") summary.totalWarnings++;
      else summary.totalInfo++;
    }

    console.log("");
  }

  // Print summary
  console.log(chalk.bold.underline("Summary\n"));
  console.log(`  Mode: ${isStrict ? chalk.red.bold("STRICT") : chalk.yellow("RELAXED (warnings only)")}`);
  console.log(`  Total files scanned: ${chalk.bold(summary.totalFiles.toString())}`);
  console.log(`  Files with errors:   ${summary.filesWithErrors > 0 ? chalk.red.bold(summary.filesWithErrors.toString()) : chalk.green("0")}`);
  console.log(`  Files with warnings: ${summary.filesWithWarnings > 0 ? chalk.yellow.bold(summary.filesWithWarnings.toString()) : chalk.green("0")}`);
  console.log("");
  console.log(`  Total errors:   ${summary.totalErrors > 0 ? chalk.red.bold(summary.totalErrors.toString()) : chalk.green("0")}`);
  console.log(`  Total warnings: ${summary.totalWarnings > 0 ? chalk.yellow.bold(summary.totalWarnings.toString()) : chalk.green("0")}`);
  console.log(`  Total info:     ${chalk.cyan(summary.totalInfo.toString())}`);

  // Exit behavior based on mode
  if (isStrict && summary.totalErrors > 0) {
    console.log(chalk.red.bold("\n✖ Validation failed with errors (strict mode)."));
    process.exit(1);
  } else if (!isStrict && summary.totalErrors > 0) {
    console.log(chalk.yellow.bold(`\n⚠️  ${summary.totalErrors} warnings (would be errors in --strict mode)`));
    console.log(chalk.dim("Run with --strict to enforce these as errors"));
    process.exit(0);
  } else if (summary.totalWarnings > 0) {
    console.log(chalk.yellow.bold("\n✓ Validation passed with warnings."));
    process.exit(0);
  } else {
    console.log(chalk.green.bold("\n✓ Validation passed."));
    process.exit(0);
  }
}

// Run validation
validateFrontmatter().catch((error) => {
  console.error(chalk.red("Validation failed:"), error);
  process.exit(1);
});

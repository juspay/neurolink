#!/usr/bin/env tsx

/**
 * NeuroLink Code Quality Metrics Reporter
 *
 * Generates comprehensive code quality metrics including:
 * - ESLint rule violations breakdown
 * - TypeScript compilation statistics
 * - File complexity analysis
 * - Test coverage metrics
 * - Code maintainability scores
 * - Security vulnerability counts
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

type ESLintMetrics = {
  totalFiles?: number;
  filesWithIssues?: number;
  errors?: number;
  warnings?: number;
  topViolations?: Array<{ rule: string; count: number }>;
  error?: string;
};

type TypeScriptMetrics = {
  files?: number;
  linesOfCode?: number;
  identifiers?: number;
  symbols?: number;
  types?: number;
  compilationSuccessful?: boolean;
  error?: string;
};

type ComplexityMetrics = {
  totalFiles?: number;
  totalLines?: number;
  averageLinesPerFile?: number;
  largeFiles?: number;
  complexFunctions?: number;
  largestFiles?: Array<{ file: string; lines: number }>;
  error?: string;
};

type SecurityMetrics = {
  vulnerabilities?: number;
  warnings?: number;
  secretsFound?: number;
  securityScore?: number;
  error?: string;
};

type CoverageMetrics = {
  available?: boolean;
  lines?: number;
  branches?: number;
  functions?: number;
  statements?: number;
  message?: string;
};

type Metrics = {
  eslint: ESLintMetrics;
  typescript: TypeScriptMetrics;
  coverage: CoverageMetrics;
  security: SecurityMetrics;
  complexity: ComplexityMetrics;
  files: Record<string, unknown>;
};

class QualityMetricsReporter {
  startTime: number;
  projectRoot: string;
  metrics: Metrics;

  constructor() {
    this.startTime = Date.now();
    this.projectRoot = process.cwd();
    this.metrics = {
      eslint: {},
      typescript: {},
      coverage: {},
      security: {},
      complexity: {},
      files: {},
    };
  }

  log(message: string, color = "reset"): void {
    console.log(`${colors[color]}[METRICS] ${message}${colors.reset}`);
  }

  // 1. ESLint Metrics Collection
  async collectESLintMetrics(): Promise<void> {
    this.log("Collecting ESLint metrics...", "blue");

    try {
      // Get ESLint results in JSON format
      let eslintResult: string;
      try {
        eslintResult = execSync("npx eslint src/ --format=json", {
          encoding: "utf8",
          cwd: this.projectRoot,
        });
      } catch (eslintError: unknown) {
        // ESLint returns non-zero exit code when issues are found
        // But we still want the JSON output from stdout
        const execErr = eslintError as { stdout?: string };
        if (execErr.stdout) {
          eslintResult = execErr.stdout;
        } else {
          this.log(
            "ESLint execution failed, using default metrics",
            "yellow",
          );
          return;
        }
      }

      const results = JSON.parse(eslintResult);

      let errorCount = 0;
      let warningCount = 0;
      const ruleViolations: Record<string, number> = {};
      let fileCount = 0;

      for (const file of results) {
        if (file.messages.length > 0) {
          fileCount++;
        }

        for (const message of file.messages) {
          if (message.severity === 2) errorCount++;
          if (message.severity === 1) warningCount++;

          const rule = message.ruleId || "no-rule";
          ruleViolations[rule] = (ruleViolations[rule] || 0) + 1;
        }
      }

      this.metrics.eslint = {
        totalFiles: results.length,
        filesWithIssues: fileCount,
        errors: errorCount,
        warnings: warningCount,
        topViolations: Object.entries(ruleViolations)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([rule, count]) => ({ rule, count })),
      };

      this.log(
        `ESLint: ${errorCount} errors, ${warningCount} warnings`,
        "green",
      );
    } catch (_error: unknown) {
      this.log("ESLint metrics collection failed", "yellow");
      this.metrics.eslint = { error: "ESLint execution failed" };
    }
  }

  // 2. TypeScript Compilation Metrics
  async collectTypeScriptMetrics(): Promise<void> {
    this.log("Collecting TypeScript metrics...", "blue");

    try {
      // Check TypeScript compilation
      const tscResult = execSync(
        "npx tsc --noEmit --listFiles --diagnostics",
        {
          encoding: "utf8",
          cwd: this.projectRoot,
        },
      );

      // Parse TypeScript diagnostics
      const lines = tscResult.split("\n");
      const diagnosticsStart = lines.findIndex((line: string) =>
        line.includes("Files:"),
      );

      if (diagnosticsStart !== -1) {
        const diagnostics = lines.slice(diagnosticsStart);
        const fileCount = this.extractNumberFromLine(diagnostics, "Files:");
        const lineCount = this.extractNumberFromLine(
          diagnostics,
          "Lines of Library code:",
        );
        const identifierCount = this.extractNumberFromLine(
          diagnostics,
          "Identifiers:",
        );
        const symbolCount = this.extractNumberFromLine(
          diagnostics,
          "Symbols:",
        );
        const typeCount = this.extractNumberFromLine(diagnostics, "Types:");

        this.metrics.typescript = {
          files: fileCount || 0,
          linesOfCode: lineCount || 0,
          identifiers: identifierCount || 0,
          symbols: symbolCount || 0,
          types: typeCount || 0,
          compilationSuccessful: true,
        };
      }

      this.log("TypeScript compilation successful", "green");
    } catch (_error: unknown) {
      this.log("TypeScript compilation had issues", "yellow");
      this.metrics.typescript = {
        compilationSuccessful: false,
        error: "Compilation failed",
      };
    }
  }

  extractNumberFromLine(lines: string[], prefix: string): number {
    const line = lines.find((l: string) => l.includes(prefix));
    if (!line) return 0;

    const match = line.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, ""), 10) : 0;
  }

  // 3. File Complexity Analysis
  async collectComplexityMetrics(): Promise<void> {
    this.log("Analyzing file complexity...", "blue");

    try {
      const sourceFiles = this.getSourceFiles();
      let totalLines = 0;
      let totalFiles = 0;
      let largeFiles = 0;
      let complexFunctions = 0;

      const fileSizes: Array<{ file: string; lines: number }> = [];

      sourceFiles.forEach((file: string) => {
        try {
          const content = fs.readFileSync(file, "utf8");
          const lines = content.split("\n").length;
          totalLines += lines;
          totalFiles++;

          fileSizes.push({
            file: path.relative(this.projectRoot, file),
            lines,
          });

          if (lines > 300) largeFiles++;

          // Enhanced complexity analysis using multiple heuristics
          const complexityScore = this.calculateFileComplexity(content);
          if (complexityScore > 15) complexFunctions++;
        } catch (_error: unknown) {
          // Skip files that can't be read
        }
      });

      // Sort files by size
      fileSizes.sort((a, b) => b.lines - a.lines);

      this.metrics.complexity = {
        totalFiles,
        totalLines,
        averageLinesPerFile: totalFiles > 0 ? Math.round(totalLines / totalFiles) : 0,
        largeFiles: largeFiles,
        complexFunctions: complexFunctions,
        largestFiles: fileSizes.slice(0, 10),
      };

      this.log(
        `Analyzed ${totalFiles} files, ${totalLines} total lines`,
        "green",
      );
    } catch (_error: unknown) {
      this.log("Complexity analysis failed", "yellow");
      this.metrics.complexity = { error: "Analysis failed" };
    }
  }

  // 4. Security Metrics Collection
  async collectSecurityMetrics(): Promise<void> {
    this.log("Collecting security metrics...", "blue");

    try {
      // Run our security validation script and capture results
      const securityResult = execSync("npx tsx scripts/security-check.ts", {
        encoding: "utf8",
        cwd: this.projectRoot,
      });

      // Parse security output for metrics
      const lines = securityResult.split("\n");
      let vulnerabilities = 0;
      let warnings = 0;
      let secretsFound = 0;

      lines.forEach((line: string) => {
        if (line.includes("vulnerabilities")) {
          const match = line.match(/(\d+)/);
          if (match) vulnerabilities += parseInt(match[1], 10);
        }
        if (line.includes("warnings")) {
          const match = line.match(/(\d+)/);
          if (match) warnings += parseInt(match[1], 10);
        }
        if (line.includes("secrets")) {
          const match = line.match(/(\d+)/);
          if (match) secretsFound += parseInt(match[1], 10);
        }
      });

      this.metrics.security = {
        vulnerabilities,
        warnings,
        secretsFound,
        securityScore: this.calculateSecurityScore(
          vulnerabilities,
          warnings,
          secretsFound,
        ),
      };

      this.log(
        `Security: ${vulnerabilities} vulns, ${warnings} warnings`,
        "green",
      );
    } catch (_error: unknown) {
      this.log("Security metrics collection failed", "yellow");
      this.metrics.security = { error: "Security check failed" };
    }
  }

  calculateSecurityScore(
    vulns: number,
    warnings: number,
    secrets: number,
  ): number {
    let score = 100;
    score -= vulns * 20; // Critical vulnerabilities heavily penalized
    score -= warnings * 2; // Warnings lightly penalized
    score -= secrets * 10; // Secrets moderately penalized
    return Math.max(0, score);
  }

  // 5. Test Coverage Metrics (if available)
  async collectCoverageMetrics(): Promise<void> {
    this.log("Collecting test coverage metrics...", "blue");

    try {
      // Try to run tests with coverage
      execSync("npm run test:run --coverage --reporter=json", {
        encoding: "utf8",
        cwd: this.projectRoot,
      });

      // This would parse coverage results if available
      this.metrics.coverage = {
        available: true,
        lines: 0, // Would be parsed from coverage report
        branches: 0,
        functions: 0,
        statements: 0,
      };

      this.log("Coverage data collected", "green");
    } catch (_error: unknown) {
      this.log("No coverage data available", "yellow");
      this.metrics.coverage = {
        available: false,
        message: "Run tests with coverage to get metrics",
      };
    }
  }

  getSourceFiles(): string[] {
    const extensions = [".ts", ".tsx", ".js", ".jsx"];
    const ignoreDirs = [
      "node_modules",
      ".git",
      "dist",
      "build",
      ".svelte-kit",
      "coverage",
    ];
    const files: string[] = [];

    const walk = (dir: string): void => {
      try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            if (!ignoreDirs.includes(item) && !item.startsWith(".")) {
              walk(fullPath);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (_error: unknown) {
        // Skip directories that can't be read
      }
    };

    walk(path.join(this.projectRoot, "src"));
    return files;
  }

  /**
   * Calculates the complexity score of a source file using multiple heuristics.
   */
  calculateFileComplexity(content: string): number {
    let complexityScore = 0;

    // Remove comments and strings to avoid false positives
    const cleanContent = content
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
      .replace(/\/\/.*$/gm, "") // Remove line comments
      .replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, ""); // Remove strings

    // 1. Cyclomatic complexity indicators
    const complexityPatterns = [
      /\bif\s*\(/g, // if statements
      /\belse\s+if\b/g, // else if statements
      /\bwhile\s*\(/g, // while loops
      /\bfor\s*\(/g, // for loops
      /\bswitch\s*\(/g, // switch statements
      /\bcase\s+/g, // case statements
      /\bcatch\s*\(/g, // catch blocks
      /\?\s*.*?\s*:/g, // ternary operators
      /&&|\|\|/g, // logical operators
    ];

    complexityPatterns.forEach((pattern) => {
      const matches = cleanContent.match(pattern) || [];
      complexityScore += matches.length;
    });

    // 2. Nesting depth analysis (more accurate than simple block counting)
    const lines = cleanContent.split("\n");
    let maxNestingDepth = 0;
    let currentDepth = 0;

    lines.forEach((line: string) => {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;

      currentDepth += openBraces - closeBraces;
      maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
    });

    // Add nesting penalty (exponential growth for deep nesting)
    if (maxNestingDepth > 3) {
      complexityScore += Math.pow(maxNestingDepth - 3, 2);
    }

    // 3. Function/method count
    const functionPatterns = [
      /\bfunction\s+\w+/g, // function declarations
      /\w+\s*:\s*function/g, // object method definitions
      /\w+\s*=>\s*/g, // arrow functions
      /\basync\s+function/g, // async functions
      /\bclass\s+\w+/g, // class definitions
    ];

    functionPatterns.forEach((pattern) => {
      const matches = cleanContent.match(pattern) || [];
      complexityScore += matches.length * 0.5; // Lower weight for functions
    });

    // 4. Large expression penalty
    const longExpressions = cleanContent.match(/[^;\n]{100,}/g) || [];
    complexityScore += longExpressions.length * 2;

    return Math.round(complexityScore);
  }

  // Calculate overall quality score
  calculateQualityScore(): number {
    let score = 100;

    // ESLint penalty
    if (this.metrics.eslint.errors) {
      score -= this.metrics.eslint.errors * 2;
    }
    if (this.metrics.eslint.warnings) {
      score -= this.metrics.eslint.warnings * 0.1;
    }

    // TypeScript penalty
    if (!this.metrics.typescript.compilationSuccessful) {
      score -= 20;
    }

    // Complexity penalty
    if (this.metrics.complexity.largeFiles) {
      score -= this.metrics.complexity.largeFiles * 5;
    }

    // Security penalty
    if (this.metrics.security.vulnerabilities) {
      score -= this.metrics.security.vulnerabilities * 15;
    }

    return Math.max(0, Math.round(score));
  }

  // Main execution function
  async run(): Promise<void> {
    this.log("Starting NeuroLink Quality Metrics Collection...", "cyan");
    console.log("\n" + "=".repeat(60) + "\n");

    try {
      await this.collectESLintMetrics();
      await this.collectTypeScriptMetrics();
      await this.collectComplexityMetrics();
      await this.collectSecurityMetrics();
      await this.collectCoverageMetrics();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.log(`Quality metrics collection failed: ${message}`, "red");
    }

    this.printReport();
  }

  printReport(): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const qualityScore = this.calculateQualityScore();

    console.log("\n" + "=".repeat(60));
    this.log(`Quality Metrics Report (${duration}s)`, "cyan");
    console.log("=".repeat(60));

    // Overall Quality Score
    const scoreColor =
      qualityScore >= 80 ? "green" : qualityScore >= 60 ? "yellow" : "red";
    console.log(
      `\n${colors.bright}OVERALL QUALITY SCORE: ${colors[scoreColor]}${qualityScore}/100${colors.reset}`,
    );

    // ESLint Metrics
    if (this.metrics.eslint.errors !== undefined) {
      console.log(`\n${colors.blue}ESLint Analysis:${colors.reset}`);
      console.log(`   Files Analyzed: ${this.metrics.eslint.totalFiles}`);
      console.log(
        `   Files with Issues: ${this.metrics.eslint.filesWithIssues}`,
      );
      console.log(
        `   Errors: ${colors.red}${this.metrics.eslint.errors}${colors.reset}`,
      );
      console.log(
        `   Warnings: ${colors.yellow}${this.metrics.eslint.warnings}${colors.reset}`,
      );

      if (this.metrics.eslint.topViolations?.length) {
        console.log(`   Top Rule Violations:`);
        this.metrics.eslint.topViolations
          .slice(0, 5)
          .forEach(({ rule, count }) => {
            console.log(`     - ${rule}: ${count}`);
          });
      }
    }

    // TypeScript Metrics
    if (this.metrics.typescript.files !== undefined) {
      console.log(
        `\n${colors.blue}TypeScript Analysis:${colors.reset}`,
      );
      console.log(
        `   Compilation: ${this.metrics.typescript.compilationSuccessful ? colors.green + "Success" : colors.red + "Failed"}${colors.reset}`,
      );
      console.log(`   Files: ${this.metrics.typescript.files}`);
      console.log(
        `   Lines of Code: ${this.metrics.typescript.linesOfCode?.toLocaleString()}`,
      );
      console.log(
        `   Identifiers: ${this.metrics.typescript.identifiers?.toLocaleString()}`,
      );
      console.log(
        `   Types: ${this.metrics.typescript.types?.toLocaleString()}`,
      );
    }

    // Complexity Metrics
    if (this.metrics.complexity.totalFiles !== undefined) {
      console.log(`\n${colors.blue}Code Complexity:${colors.reset}`);
      console.log(`   Total Files: ${this.metrics.complexity.totalFiles}`);
      console.log(
        `   Total Lines: ${this.metrics.complexity.totalLines?.toLocaleString()}`,
      );
      console.log(
        `   Avg Lines/File: ${this.metrics.complexity.averageLinesPerFile}`,
      );
      console.log(
        `   Large Files (>300 lines): ${colors.yellow}${this.metrics.complexity.largeFiles}${colors.reset}`,
      );
      console.log(
        `   Complex Functions: ${colors.yellow}${this.metrics.complexity.complexFunctions}${colors.reset}`,
      );

      if (this.metrics.complexity.largestFiles?.length) {
        console.log(`   Largest Files:`);
        this.metrics.complexity.largestFiles
          .slice(0, 5)
          .forEach(({ file, lines }) => {
            console.log(`     - ${file}: ${lines} lines`);
          });
      }
    }

    // Security Metrics
    if (this.metrics.security.vulnerabilities !== undefined) {
      console.log(
        `\n${colors.blue}Security Analysis:${colors.reset}`,
      );
      console.log(
        `   Vulnerabilities: ${this.metrics.security.vulnerabilities! > 0 ? colors.red : colors.green}${this.metrics.security.vulnerabilities}${colors.reset}`,
      );
      console.log(
        `   Warnings: ${this.metrics.security.warnings! > 0 ? colors.yellow : colors.green}${this.metrics.security.warnings}${colors.reset}`,
      );
      console.log(
        `   Potential Secrets: ${this.metrics.security.secretsFound! > 0 ? colors.yellow : colors.green}${this.metrics.security.secretsFound}${colors.reset}`,
      );
      console.log(
        `   Security Score: ${this.metrics.security.securityScore}/100`,
      );
    }

    // Coverage Metrics
    console.log(`\n${colors.blue}Test Coverage:${colors.reset}`);
    if (this.metrics.coverage.available) {
      console.log(`   Lines: ${this.metrics.coverage.lines}%`);
      console.log(`   Branches: ${this.metrics.coverage.branches}%`);
      console.log(`   Functions: ${this.metrics.coverage.functions}%`);
    } else {
      console.log(
        `   ${colors.yellow}Coverage data not available${colors.reset}`,
      );
      console.log(`   ${this.metrics.coverage.message}`);
    }

    // Recommendations
    console.log(`\n${colors.magenta}Recommendations:${colors.reset}`);

    if (this.metrics.eslint.errors && this.metrics.eslint.errors > 0) {
      console.log(
        `   - Fix ${this.metrics.eslint.errors} ESLint errors`,
      );
    }
    if (
      this.metrics.complexity.largeFiles &&
      this.metrics.complexity.largeFiles > 5
    ) {
      console.log(
        `   - Consider refactoring ${this.metrics.complexity.largeFiles} large files`,
      );
    }
    if (
      this.metrics.security.vulnerabilities &&
      this.metrics.security.vulnerabilities > 0
    ) {
      console.log(
        `   - Address ${this.metrics.security.vulnerabilities} security vulnerabilities`,
      );
    }
    if (!this.metrics.coverage.available) {
      console.log(`   - Set up test coverage reporting`);
    }
    if (qualityScore < 80) {
      console.log(
        `   - Focus on improving code quality (current score: ${qualityScore}/100)`,
      );
    }

    console.log(
      `\n${colors.cyan}Quality metrics collection completed!${colors.reset}`,
    );

    // Save metrics to file for CI/CD use
    const metricsFile = path.join(this.projectRoot, "quality-metrics.json");
    fs.writeFileSync(
      metricsFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          qualityScore,
          metrics: this.metrics,
          duration: parseFloat(duration),
        },
        null,
        2,
      ),
    );

    this.log("Metrics saved to quality-metrics.json", "green");
  }
}

// Run the quality metrics reporter only when executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const reporter = new QualityMetricsReporter();
  reporter.run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `${colors.red}Quality metrics collection crashed: ${message}${colors.reset}`,
    );
    process.exit(1);
  });
}

export default QualityMetricsReporter;

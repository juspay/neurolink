/**
 * VISUAL TEST RUNNER UTILITIES
 * Provides color-coded output and progress tracking for tests
 */

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

export interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip" | "pending";
  duration?: number;
  error?: string;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  startTime?: number;
  endTime?: number;
}

/**
 * Visual test runner with color-coded output
 */
export class VisualTestRunner {
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;
  private startTime: number = Date.now();

  /**
   * Start a new test suite
   */
  startSuite(name: string): void {
    this.currentSuite = {
      name,
      tests: [],
      startTime: Date.now(),
    };
    this.suites.push(this.currentSuite);

    console.log(`\n${colors.bright}${colors.blue}📦 ${name}${colors.reset}`);
    console.log(colors.dim + "─".repeat(50) + colors.reset);
  }

  /**
   * End the current test suite
   */
  endSuite(): void {
    if (this.currentSuite) {
      this.currentSuite.endTime = Date.now();
      const duration =
        this.currentSuite.endTime - (this.currentSuite.startTime ?? 0);

      console.log(colors.dim + "─".repeat(50) + colors.reset);
      console.log(
        `${colors.dim}Suite completed in ${this.formatDuration(duration)}${colors.reset}\n`,
      );

      this.currentSuite = null;
    }
  }

  /**
   * Record a test result
   */
  recordTest(result: TestResult): void {
    if (!this.currentSuite) {
      throw new Error("No active test suite");
    }

    this.currentSuite.tests.push(result);
    this.printTestResult(result);
  }

  /**
   * Run a test with visual feedback
   */
  async runTest<T>(name: string, testFn: () => Promise<T>): Promise<void> {
    const startTime = Date.now();

    try {
      // Show pending state
      process.stdout.write(`  ${colors.yellow}⏳${colors.reset} ${name}`);

      await testFn();

      const duration = Date.now() - startTime;

      // Clear line and show success
      process.stdout.write("\r");
      this.recordTest({
        name,
        status: "pass",
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Clear line and show failure
      process.stdout.write("\r");
      this.recordTest({
        name,
        status: "fail",
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Print a test result with colors
   */
  private printTestResult(result: TestResult): void {
    const icons = {
      pass: `${colors.green}✓${colors.reset}`,
      fail: `${colors.red}✗${colors.reset}`,
      skip: `${colors.yellow}⊘${colors.reset}`,
      pending: `${colors.cyan}◌${colors.reset}`,
    };

    const icon = icons[result.status];
    const duration = result.duration
      ? ` ${colors.dim}(${this.formatDuration(result.duration)})${colors.reset}`
      : "";

    console.log(`  ${icon} ${result.name}${duration}`);

    if (result.error) {
      console.log(`    ${colors.red}${result.error}${colors.reset}`);
    }
  }

  /**
   * Print a summary of all test results
   */
  printSummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const allTests = this.suites.flatMap((s) => s.tests);

    const passed = allTests.filter((t) => t.status === "pass").length;
    const failed = allTests.filter((t) => t.status === "fail").length;
    const skipped = allTests.filter((t) => t.status === "skip").length;
    const pending = allTests.filter((t) => t.status === "pending").length;

    console.log(`\n${colors.bright}Test Summary${colors.reset}`);
    console.log("═".repeat(50));

    console.log(`${colors.green}✓ Passed:  ${passed}${colors.reset}`);
    if (failed > 0) {
      console.log(`${colors.red}✗ Failed:  ${failed}${colors.reset}`);
    }
    if (skipped > 0) {
      console.log(`${colors.yellow}⊘ Skipped: ${skipped}${colors.reset}`);
    }
    if (pending > 0) {
      console.log(`${colors.cyan}◌ Pending: ${pending}${colors.reset}`);
    }

    console.log("─".repeat(50));
    console.log(`Total:     ${allTests.length} tests`);
    console.log(`Duration:  ${this.formatDuration(totalDuration)}`);
    console.log("═".repeat(50));

    // Show failed tests
    if (failed > 0) {
      console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
      allTests
        .filter((t) => t.status === "fail")
        .forEach((t) => {
          console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
          if (t.error) {
            console.log(`    ${colors.dim}${t.error}${colors.reset}`);
          }
        });
    }
  }

  /**
   * Create a progress bar
   */
  createProgressBar(
    current: number,
    total: number,
    width: number = 30,
  ): string {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;

    const bar =
      colors.green +
      "█".repeat(filled) +
      colors.dim +
      "░".repeat(empty) +
      colors.reset;

    return `[${bar}] ${percentage}%`;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Print a section header
   */
  printSection(title: string): void {
    console.log(`\n${colors.bright}${colors.cyan}▶ ${title}${colors.reset}`);
  }

  /**
   * Print an info message
   */
  printInfo(message: string): void {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
  }

  /**
   * Print a warning message
   */
  printWarning(message: string): void {
    console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  }

  /**
   * Print an error message
   */
  printError(message: string): void {
    console.log(`${colors.red}✖${colors.reset} ${message}`);
  }

  /**
   * Print a success message
   */
  printSuccess(message: string): void {
    console.log(`${colors.green}✔${colors.reset} ${message}`);
  }

  /**
   * Get all test suites
   */
  public getSuites(): TestSuite[] {
    return this.suites;
  }
}

/**
 * Create a test report in markdown format
 */
export function generateMarkdownReport(runner: VisualTestRunner): string {
  const suites = runner.getSuites();
  const allTests = suites.flatMap((s) => s.tests);

  const passed = allTests.filter((t) => t.status === "pass").length;
  const failed = allTests.filter((t) => t.status === "fail").length;
  const total = allTests.length;

  let report = "# Test Report\n\n";
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += "## Summary\n\n";
  report += `- **Total Tests:** ${total}\n`;
  report += `- **Passed:** ${passed} ✅\n`;
  report += `- **Failed:** ${failed} ❌\n`;
  report += `- **Pass Rate:** ${Math.round((passed / total) * 100)}%\n\n`;

  report += "## Test Suites\n\n";

  suites.forEach((suite) => {
    const suitePassed = suite.tests.filter((t) => t.status === "pass").length;
    const suiteFailed = suite.tests.filter((t) => t.status === "fail").length;

    report += `### ${suite.name}\n\n`;
    report += `- Tests: ${suite.tests.length}\n`;
    report += `- Passed: ${suitePassed}\n`;
    report += `- Failed: ${suiteFailed}\n\n`;

    report += "| Test | Status | Duration |\n";
    report += "|------|--------|----------|\n";

    suite.tests.forEach((test) => {
      const status = test.status === "pass" ? "✅ Pass" : "❌ Fail";
      const duration = test.duration ? `${test.duration}ms` : "-";
      report += `| ${test.name} | ${status} | ${duration} |\n`;
    });

    report += "\n";
  });

  if (failed > 0) {
    report += "## Failed Tests\n\n";

    allTests
      .filter((t) => t.status === "fail")
      .forEach((test) => {
        report += `### ❌ ${test.name}\n\n`;
        if (test.error) {
          report += "```\n";
          report += test.error;
          report += "\n```\n\n";
        }
      });
  }

  return report;
}

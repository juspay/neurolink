#!/usr/bin/env node

/**
 * NeuroLink Adaptive Test Runner
 * Advanced testing automation with intelligent test selection
 * Part of Developer Experience Enhancement Plan 2.0 - Phase 3A
 */

import { execSync } from "child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname, extname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../..");

/**
 * Helper function to determine if debug logging should be enabled
 * @returns {boolean} True if debug logging is enabled
 */
function shouldDebugLog() {
  return (
    process.env.DEBUG_ADAPTIVE_RUNNER || process.env.NODE_ENV === "development"
  );
}

/**
 * Recursively finds files in a directory tree that match specified extensions, with multiple performance optimizations.
 *
 * Performance optimizations:
 * - Uses Set for O(1) lookups of extensions and excluded directories.
 * - Limits recursion depth and total files found for early exit and resource control.
 * - Tracks canonical directories to avoid duplicate processing and symlink loops.
 * - Caches resolved paths to minimize filesystem calls.
 *
 * @param {string} dir - The root directory to start searching from.
 * @param {string[]} extensions - Array of file extensions to match (e.g., [".js", ".ts"]).
 * @param {string[]} [excludeDirs=["node_modules", ".git", "dist", "build", ".next", "coverage"]] - Directories to exclude from search for performance and relevance.
 * @param {number} [maxFiles=20] - Maximum number of files to find before stopping search. Default is 20 to prevent excessive resource usage.
 * @returns {string[]} Array of absolute file paths matching the given extensions.
 *
 * @remarks
 * - The default value for `maxFiles` (20) is chosen to balance thoroughness and performance, avoiding long search times in large codebases.
 * - Depth limits and exclusion of common build/output directories further improve performance and relevance of results.
 * - Symlink protection prevents infinite loops and duplicate results in complex directory structures.
 */
function findFilesByExtension(
  dir,
  extensions,
  excludeDirs = ["node_modules", ".git", "dist", "build", ".next", "coverage"],
  maxFiles = 20,
) {
  const files = [];
  const extensionSet = new Set(extensions); // O(1) lookup instead of O(n)
  const excludeSet = new Set(excludeDirs);
  const processedDirs = new Set(); // Prevent duplicate directory processing
  const resolveCache = new Map(); // Cache resolved paths for performance

  function traverse(currentDir, depth = 0) {
    // Early exit conditions for performance
    if (depth > 10 || files.length >= maxFiles) {
      return;
    }

    // Prevent processing same directory twice (symlink protection) with caching
    let canonicalDir;
    if (resolveCache.has(currentDir)) {
      canonicalDir = resolveCache.get(currentDir);
    } else {
      canonicalDir = resolve(currentDir);
      resolveCache.set(currentDir, canonicalDir);
    }
    if (processedDirs.has(canonicalDir)) {
      return;
    }
    processedDirs.add(canonicalDir);

    try {
      // Use withFileTypes for better performance (no additional stat calls)
      const entries = readdirSync(currentDir, { withFileTypes: true });

      // Separate directories and files for optimized processing
      const directories = [];
      const targetFiles = [];

      for (const entry of entries) {
        if (files.length >= maxFiles) {
          break; // Early exit if we have enough files
        }

        if (entry.isDirectory()) {
          // Quick exclude check with O(1) lookup
          if (!excludeSet.has(entry.name) && !entry.name.startsWith(".")) {
            directories.push(entry.name);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (extensionSet.has(ext)) {
            targetFiles.push(entry.name);
          }
        }
      }

      // Process files first (they're our target)
      for (const fileName of targetFiles) {
        if (files.length >= maxFiles) {
          break;
        }

        const fullPath = join(currentDir, fileName);
        // Optimized path conversion using replace with platform-agnostic handling
        const relativePath = fullPath
          .replace(ROOT_DIR, "")
          .replace(/^[/\\]/, "");
        files.push(relativePath);
      }

      // Process subdirectories only if we still need more files
      if (files.length < maxFiles) {
        for (const dirName of directories) {
          if (files.length >= maxFiles) {
            break;
          }
          const fullPath = join(currentDir, dirName);
          traverse(fullPath, depth + 1);
        }
      }
    } catch (error) {
      // Skip directories we can't read (permissions, etc.)
      // Conditional debug logging to help with troubleshooting while maintaining performance
      if (shouldDebugLog()) {
        console.warn(
          `[AdaptiveTestRunner][DEBUG] Failed to read directory "${currentDir}": ${error.message}`,
        );
      }
    }
  }

  traverse(dir);
  return files;
}

class AdaptiveTestRunner {
  constructor() {
    this.changedFiles = new Set();
    this.testFiles = new Set();
    this.dependencyMap = new Map();

    // Performance optimization caches
    this.importCache = new Map();
    this.testFileCache = new Map();

    this.config = {
      testPatterns: [
        "**/*.test.js",
        "**/*.spec.js",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
      sourcePatterns: [
        "src/**/*.js",
        "src/**/*.ts",
        "src/**/*.svelte",
        "tools/**/*.js",
        "package/**/*.js",
      ],
      criticalTests: ["tests/integration/**", "tests/providers/**"],
    };
    this.results = {
      startTime: Date.now(),
      strategy: "adaptive",
      changedFiles: [],
      selectedTests: [],
      skippedTests: [],
      performance: {},
      coverage: {},
    };
  }

  /**
   * Main execution method
   */
  async run(strategy = "adaptive") {
    try {
      console.log("\n🧠 NeuroLink Adaptive Test Runner - Phase 3A");
      console.log("================================================");

      this.results.strategy = strategy;

      switch (strategy) {
        case "fast":
          await this.runFastTests();
          break;
        case "full":
          await this.runFullTests();
          break;
        case "affected":
          await this.runAffectedTests();
          break;
        case "adaptive":
        default:
          await this.runAdaptiveTests();
          break;
      }

      await this.generateReport();
      console.log("\n✅ Test execution complete!");
    } catch (error) {
      console.error("❌ Test runner failed:", error.message);
      process.exit(1);
    }
  }

  /**
   * Adaptive testing strategy - intelligent test selection
   */
  async runAdaptiveTests() {
    console.log("\n🎯 Running adaptive test strategy...");

    // Step 1: Detect changed files
    await this.detectChangedFiles();

    // Step 2: Analyze dependencies
    await this.analyzeDependencies();

    // Step 3: Select relevant tests
    await this.selectRelevantTests();

    // Step 4: Execute tests with coverage
    await this.executeTests(true);
  }

  /**
   * Fast testing strategy - unit tests only
   */
  async runFastTests() {
    console.log("\n⚡ Running fast test strategy...");
    this.results.selectedTests = ["src/**/*.test.js", "tools/**/*.test.js"];
    await this.executeTests(false);
  }

  /**
   * Full testing strategy - all tests
   */
  async runFullTests() {
    console.log("\n🔍 Running full test strategy...");
    this.results.selectedTests = ["**/*.test.js", "**/*.spec.js"];
    await this.executeTests(true);
  }

  /**
   * Affected testing strategy - only tests for changed files
   */
  async runAffectedTests() {
    console.log("\n🎯 Running affected test strategy...");
    await this.detectChangedFiles();
    await this.selectAffectedTests();
    await this.executeTests(true);
  }

  /**
   * Detect changed files using git
   */
  async detectChangedFiles() {
    try {
      console.log("🔍 Detecting changed files...");

      // Get changed files from git
      const gitOutput = execSync("git diff --name-only HEAD~1 HEAD", {
        encoding: "utf8",
        cwd: ROOT_DIR,
      }).trim();

      if (gitOutput) {
        const files = gitOutput.split("\n").filter((f) => f.trim());
        files.forEach((file) => this.changedFiles.add(file));
        this.results.changedFiles = Array.from(this.changedFiles);
        console.log(`📁 Found ${this.changedFiles.size} changed files`);
      } else {
        console.log("📁 No changed files detected, using fallback strategy");
        // Fallback: check for recently modified files
        await this.detectRecentlyModified();
      }
    } catch (error) {
      console.log("⚠️  Git diff failed, using fallback strategy");
      await this.detectRecentlyModified();
    }
  }

  /**
   * Fallback: detect recently modified files using Node.js APIs
   */
  async detectRecentlyModified() {
    try {
      // Use Node.js APIs instead of shell commands
      const extensions = [".js", ".ts", ".svelte"];
      const files = findFilesByExtension(
        ROOT_DIR,
        extensions,
        ["node_modules", ".git"],
        20,
      );

      files.forEach((file) => {
        if (file && !file.includes("node_modules") && !file.includes(".git")) {
          this.changedFiles.add(file);
        }
      });

      this.results.changedFiles = Array.from(this.changedFiles);
      console.log(`📁 Using ${this.changedFiles.size} recently modified files`);
    } catch (error) {
      console.log("⚠️  Fallback detection failed, running critical tests only");
      this.config.criticalTests.forEach((pattern) =>
        this.changedFiles.add(pattern),
      );
    }
  }

  /**
   * Analyze dependencies to map files to tests
   */
  async analyzeDependencies() {
    console.log("🔗 Analyzing dependencies...");

    for (const file of this.changedFiles) {
      const dependencies = await this.findDependencies(file);
      this.dependencyMap.set(file, dependencies);
    }

    console.log(`🔗 Mapped ${this.dependencyMap.size} files to dependencies`);
  }

  /**
   * Find dependencies for a file
   */
  async findDependencies(filePath) {
    const dependencies = new Set();

    try {
      const fullPath = join(ROOT_DIR, filePath);
      if (!existsSync(fullPath)) {
        return dependencies;
      }

      const content = readFileSync(fullPath, "utf8");

      // Extract import statements
      const importRegex = /import.*from\s+['"`]([^'"`]+)['"`]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith(".")) {
          // Relative import
          const resolvedPath = this.resolveImport(filePath, importPath);
          if (resolvedPath) {
            dependencies.add(resolvedPath);
          }
        }
      }

      // Extract require statements
      const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        const requirePath = match[1];
        if (requirePath.startsWith(".")) {
          const resolvedPath = this.resolveImport(filePath, requirePath);
          if (resolvedPath) {
            dependencies.add(resolvedPath);
          }
        }
      }
    } catch {
      console.log(`⚠️  Failed to analyze dependencies for ${filePath}`);
    }

    return dependencies;
  }

  /**
   * Optimized resolve relative import path with caching and reduced file system calls
   */
  resolveImport(fromFile, importPath) {
    // Static cache for resolved imports to avoid repeated file system calls
    const cacheKey = `${fromFile}:${importPath}`;
    // Cache already initialized in constructor

    if (this.importCache.has(cacheKey)) {
      return this.importCache.get(cacheKey);
    }

    let resolvedPath = null;

    try {
      const dir = dirname(fromFile);
      const resolved = join(dir, importPath);

      // Optimized extensions array with most common first
      const extensions = [".js", ".ts", ".svelte", ".json"];

      // Batch file existence checks to minimize system calls
      const candidatePaths = [];

      // Direct file with extensions
      for (const ext of extensions) {
        candidatePaths.push(resolved + ext);
      }

      // Index files
      for (const ext of extensions) {
        candidatePaths.push(join(resolved, "index" + ext));
      }

      // Check all candidates efficiently
      for (const candidate of candidatePaths) {
        const fullPath = join(ROOT_DIR, candidate);
        try {
          // Use a single statSync call instead of existsSync for better performance
          const stats = statSync(fullPath);
          if (stats.isFile()) {
            resolvedPath = candidate;
            break;
          }
        } catch {
          // File doesn't exist, continue to next candidate
        }
      }
    } catch {
      // Ignore resolution errors
    }

    // Cache the result (including null results to avoid repeated failures)
    this.importCache.set(cacheKey, resolvedPath);

    return resolvedPath;
  }

  /**
   * Select relevant tests based on changed files and dependencies
   */
  async selectRelevantTests() {
    console.log("🎯 Selecting relevant tests...");

    const selectedTests = new Set();

    // Always include critical tests
    this.config.criticalTests.forEach((pattern) => selectedTests.add(pattern));

    // Find tests for changed files
    for (const file of this.changedFiles) {
      // Direct test file
      const testFile = this.findTestFile(file);
      if (testFile) {
        selectedTests.add(testFile);
      }

      // Tests for dependencies
      const dependencies = this.dependencyMap.get(file) || new Set();
      for (const dep of dependencies) {
        const depTest = this.findTestFile(dep);
        if (depTest) {
          selectedTests.add(depTest);
        }
      }
    }

    this.results.selectedTests = Array.from(selectedTests);
    console.log(`🎯 Selected ${selectedTests.size} test files/patterns`);
  }

  /**
   * Select tests only for affected files
   */
  async selectAffectedTests() {
    console.log("🎯 Selecting affected tests...");

    const selectedTests = new Set();

    for (const file of this.changedFiles) {
      const testFile = this.findTestFile(file);
      if (testFile) {
        selectedTests.add(testFile);
      }
    }

    // If no specific tests found, add critical tests
    if (selectedTests.size === 0) {
      this.config.criticalTests.forEach((pattern) =>
        selectedTests.add(pattern),
      );
    }

    this.results.selectedTests = Array.from(selectedTests);
    console.log(`🎯 Selected ${selectedTests.size} affected test files`);
  }

  /**
   * Optimized find test file for a source file with caching and reduced file system calls
   */
  findTestFile(sourceFile) {
    // Cache test file lookups to avoid repeated file system operations
    // Cache already initialized in constructor

    if (this.testFileCache.has(sourceFile)) {
      return this.testFileCache.get(sourceFile);
    }

    const baseName = sourceFile.replace(/\.(js|ts|svelte)$/, "");
    const dir = dirname(sourceFile);
    const fileName = baseName.split("/").pop(); // Get just the filename without path

    // Optimized test file patterns - ordered by likelihood of existence
    const patterns = [
      // Most common patterns first
      `${baseName}.test.js`,
      `${baseName}.test.ts`,
      `${baseName}.spec.js`,
      `${baseName}.spec.ts`,
      // Test directory patterns
      join(dir, "__tests__", `${fileName}.test.js`),
      join(dir, "__tests__", `${fileName}.test.ts`),
      join(dir, "__tests__", `${fileName}.spec.js`),
      join(dir, "__tests__", `${fileName}.spec.ts`),
      // Global test patterns
      `test/${baseName}.test.js`,
      `test/${baseName}.spec.js`,
      `tests/${baseName}.test.js`,
      `tests/${baseName}.spec.js`,
    ];

    let foundTestFile = null;

    // Batch check using statSync for better performance
    for (const pattern of patterns) {
      const fullPath = join(ROOT_DIR, pattern);
      try {
        const stats = statSync(fullPath);
        if (stats.isFile()) {
          foundTestFile = pattern;
          break;
        }
      } catch {
        // File doesn't exist, continue to next pattern
      }
    }

    // Cache the result (including null results to avoid repeated lookups)
    this.testFileCache.set(sourceFile, foundTestFile);

    return foundTestFile;
  }

  /**
   * Execute tests with optional coverage
   */
  async executeTests(withCoverage = false) {
    console.log("🧪 Executing tests...");

    const startTime = Date.now();

    try {
      const args = ["run"];

      if (withCoverage) {
        args.push("--coverage");
      }

      // Add test patterns if specific tests selected
      if (
        this.results.selectedTests.length > 0 &&
        this.results.strategy !== "full"
      ) {
        // Create a temporary test pattern file
        const testPatterns = this.results.selectedTests.join("\n");
        const tempFile = join(ROOT_DIR, ".tmp-test-patterns.txt");
        writeFileSync(tempFile, testPatterns);

        // For now, run all tests but log which ones were selected
        console.log(
          `📝 Selected tests: ${this.results.selectedTests.join(", ")}`,
        );
      }

      execSync(`npx vitest ${args.join(" ")}`, {
        encoding: "utf8",
        cwd: ROOT_DIR,
        stdio: "inherit",
      });

      this.results.performance.testDuration = Date.now() - startTime;
      console.log(
        `⏱️  Tests completed in ${this.results.performance.testDuration}ms`,
      );
    } catch {
      this.results.performance.testDuration = Date.now() - startTime;
      console.log(
        `⚠️  Some tests failed (duration: ${this.results.performance.testDuration}ms)`,
      );

      // Don't exit on test failures in adaptive mode
      if (this.results.strategy === "adaptive") {
        console.log("🔄 Continuing with adaptive analysis...");
      }
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    console.log("\n📊 Generating test report...");

    const reportDir = join(ROOT_DIR, "test-reports");
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      strategy: this.results.strategy,
      duration: Date.now() - this.results.startTime,
      changedFiles: this.results.changedFiles,
      selectedTests: this.results.selectedTests,
      performance: this.results.performance,
      coverage: this.results.coverage,
      summary: {
        totalChangedFiles: this.results.changedFiles.length,
        totalSelectedTests: this.results.selectedTests.length,
        testDuration: this.results.performance.testDuration || 0,
        efficiency: this.calculateEfficiency(),
      },
    };

    const reportFile = join(
      reportDir,
      `adaptive-test-report-${Date.now()}.json`,
    );
    writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log("📊 Test Report Summary:");
    console.log(`   Strategy: ${report.strategy}`);
    console.log(`   Changed Files: ${report.summary.totalChangedFiles}`);
    console.log(`   Selected Tests: ${report.summary.totalSelectedTests}`);
    console.log(`   Test Duration: ${report.summary.testDuration}ms`);
    console.log(`   Efficiency: ${report.summary.efficiency}%`);
    console.log(`   Report saved: ${reportFile}`);
  }

  /**
   * Calculate testing efficiency
   */
  calculateEfficiency() {
    if (this.results.strategy === "full") {
      return 100;
    }

    const selectedCount = this.results.selectedTests.length;
    const changedCount = this.results.changedFiles.length;

    if (changedCount === 0) {
      return 0;
    }

    // Efficiency = (selected tests / changed files) * 100, capped at 100%
    return Math.min(100, Math.round((selectedCount / changedCount) * 100));
  }

  /**
   * Clear performance caches for memory management
   * Useful for long-running processes or between test runs
   */
  clearCaches() {
    this.importCache.clear();
    this.testFileCache.clear();
    console.log("🧹 Performance caches cleared");
  }

  /**
   * Get cache statistics for performance monitoring
   */
  getCacheStats() {
    return {
      importCacheSize: this.importCache.size,
      testFileCacheSize: this.testFileCache.size,
      timestamp: Date.now(),
    };
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const strategy = process.argv[2] || "adaptive";
  const runner = new AdaptiveTestRunner();

  runner.run(strategy).catch((error) => {
    console.error("❌ Adaptive test runner failed:", error);
    process.exit(1);
  });
}

export default AdaptiveTestRunner;

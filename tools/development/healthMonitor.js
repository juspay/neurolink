#!/usr/bin/env node

/**
 * NeuroLink Health Monitor
 * System health monitoring and diagnostics
 * Part of Developer Experience Enhancement Plan 2.0 - Phase 3
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
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";

// Use console for logging to avoid coupling with production code

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../..");

/**
 * Helper function to determine if debug logging should be enabled for health monitor
 * @returns {boolean} True if debug logging is enabled
 */
function isDebugHealthMonitor() {
  return (
    process.env.DEBUG_HEALTH_MONITOR ||
    process.env.NODE_ENV === "development"
  );
}

/**
 * Counts the number of files in a directory (recursively) that match the given extensions.
 *
 * @param {string} dir - The root directory to start searching from.
 * @param {string[]} extensions - Array of file extensions to count (e.g., ['.js', '.ts']).
 * @param {string[]} [excludeDirs=["node_modules", ".git"]] - Array of directory names to exclude from traversal.
 *   Directories listed here will be skipped entirely, which helps avoid unnecessary processing of large or irrelevant folders.
 * @returns {number} The total count of files matching the specified extensions.
 */
function countFilesByExtension(
  dir,
  extensions,
  excludeDirs = ["node_modules", ".git"],
) {
  let count = 0;
  const unreadableDirs = [];

  function traverse(currentDir, depth = 0) {
    if (depth > 10) {
      return; // Prevent infinite recursion
    }

    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name)) {
            traverse(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (extensions.includes(ext)) {
            count++;
          }
        }
      }
    } catch (error) {
      // Collect errors for batch logging
      unreadableDirs.push(`"${currentDir}": ${error.message}`);
    }
  }

  traverse(dir);

  // Batch log all errors after traversal
  if (unreadableDirs.length > 0 && isDebugHealthMonitor()) {
    console.log(
      `countFilesByExtension: Failed to read the following directories:\n${unreadableDirs.join("\n")}`,
    );
  }

  return count;
}

/**
 * Utility function to count all files excluding certain directories
 */
function countAllFiles(dir, excludeDirs = ["node_modules", ".git"]) {
  let count = 0;

  function traverse(currentDir, depth = 0) {
    if (depth > 10) {
      return; // Prevent infinite recursion
    }

    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name)) {
            traverse(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          count++;
        }
      }
    } catch (error) {
      // Skip directories we can't read
      if (isDebugHealthMonitor()) {
        console.log(
          `countAllFiles: Failed to read directory "${currentDir}": ${error.message}`,
        );
      }
    }
  }

  traverse(dir);
  return count;
}

/**
 * Utility function to get directory size using Node.js APIs
 */
function getDirectorySizeSync(dir) {
  let totalSize = 0;

  function traverse(currentDir, depth = 0) {
    if (depth > 20) {
      return; // Prevent infinite recursion for very deep dirs
    }

    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          traverse(fullPath, depth + 1);
        } else if (entry.isFile()) {
          try {
            const stats = statSync(fullPath);
            totalSize += stats.size;
          } catch {
            // Skip files we can't access
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
      if (isDebugHealthMonitor()) {
        console.log(
          `getDirectorySizeSync: Failed to read directory "${currentDir}": ${error.message}`,
        );
      }
    }
  }

  if (existsSync(dir)) {
    traverse(dir);
  }
  return totalSize;
}

class HealthMonitor {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      system: {},
      project: {},
      dependencies: {},
      performance: {},
      issues: [],
      recommendations: [],
    };
  }

  /**
   * Main health check execution
   */
  async monitor() {
    try {
      console.log("\n💓 NeuroLink Health Monitor - System Diagnostics");
      console.log("================================================");

      await this.checkSystemHealth();
      await this.checkProjectHealth();
      await this.checkDependencies();
      await this.checkPerformance();
      await this.generateRecommendations();
      await this.generateReport();

      console.log("\n✅ Health monitoring complete!");
    } catch (error) {
      console.error("❌ Health monitoring failed:", error.message);
      process.exit(1);
    }
  }

  /**
   * Check system health
   */
  async checkSystemHealth() {
    console.log("🔍 Checking system health...");

    try {
      // Node.js version
      const nodeVersion = process.version;
      this.metrics.system.nodeVersion = nodeVersion;
      console.log(`   Node.js: ${nodeVersion}`);

      // pnpm version
      const pnpmVersion = execSync("pnpm --version", {
        encoding: "utf8",
      }).trim();
      this.metrics.system.pnpmVersion = pnpmVersion;
      console.log(`   pnpm: ${pnpmVersion}`);

      // Git status
      const gitStatus = execSync("git status --porcelain", {
        encoding: "utf8",
      }).trim();
      this.metrics.system.gitChanges = gitStatus
        .split("\n")
        .filter((line) => line.trim()).length;
      console.log(`   Git changes: ${this.metrics.system.gitChanges} files`);

      // Disk space
      const diskUsage = this.checkDiskUsage();
      this.metrics.system.diskUsage = diskUsage;
      console.log(`   Disk usage: ${diskUsage.used}GB / ${diskUsage.total}GB`);
    } catch (error) {
      this.metrics.issues.push({
        type: "system",
        message: `System check failed: ${error.message}`,
      });
    }
  }

  /**
   * Check project health
   */
  async checkProjectHealth() {
    console.log("📁 Checking project health...");

    try {
      // Package.json validation
      const packageJson = JSON.parse(
        readFileSync(join(ROOT_DIR, "package.json"), "utf8"),
      );
      this.metrics.project.name = packageJson.name;
      this.metrics.project.version = packageJson.version;
      console.log(`   Project: ${packageJson.name}@${packageJson.version}`);

      // File counts
      const fileCounts = this.countProjectFiles();
      this.metrics.project.files = fileCounts;
      console.log(
        `   Files: ${fileCounts.total} total, ${fileCounts.js} JS, ${fileCounts.ts} TS`,
      );

      // Environment file
      const envExists = existsSync(join(ROOT_DIR, ".env"));
      this.metrics.project.hasEnvFile = envExists;
      console.log(
        `   Environment: ${envExists ? "✅ .env found" : "⚠️  .env missing"}`,
      );

      // Documentation
      const docsCount = this.countDocumentationFiles();
      this.metrics.project.documentation = docsCount;
      console.log(`   Documentation: ${docsCount} markdown files`);
    } catch (error) {
      this.metrics.issues.push({
        type: "project",
        message: `Project check failed: ${error.message}`,
      });
    }
  }

  /**
   * Check dependencies
   */
  async checkDependencies() {
    console.log("📦 Checking dependencies...");

    try {
      // Package.json dependencies
      const packageJson = JSON.parse(
        readFileSync(join(ROOT_DIR, "package.json"), "utf8"),
      );
      const deps = Object.keys(packageJson.dependencies || {});
      const devDeps = Object.keys(packageJson.devDependencies || {});

      this.metrics.dependencies.production = deps.length;
      this.metrics.dependencies.development = devDeps.length;
      console.log(
        `   Dependencies: ${deps.length} production, ${devDeps.length} development`,
      );

      // Check for vulnerabilities
      try {
        const auditOutput = execSync("pnpm audit --json", { encoding: "utf8" });
        const audit = JSON.parse(auditOutput);
        this.metrics.dependencies.vulnerabilities =
          audit.metadata?.vulnerabilities || {};
        console.log("   Security: Audit completed");
      } catch {
        console.log("   Security: Audit skipped");
      }

      // Check node_modules size
      const nodeModulesSize = this.getDirectorySize(
        join(ROOT_DIR, "node_modules"),
      );
      this.metrics.dependencies.nodeModulesSize = nodeModulesSize;
      console.log(
        `   node_modules: ${Math.round(nodeModulesSize / 1024 / 1024)}MB`,
      );
    } catch (error) {
      this.metrics.issues.push({
        type: "dependencies",
        message: `Dependencies check failed: ${error.message}`,
      });
    }
  }

  /**
   * Check performance metrics
   */
  async checkPerformance() {
    console.log("⚡ Checking performance...");

    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.metrics.performance.memory = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      };
      console.log(
        `   Memory: ${this.metrics.performance.memory.heapUsed}MB used`,
      );

      // Build time estimation
      const buildTime = this.estimateBuildTime();
      this.metrics.performance.estimatedBuildTime = buildTime;
      console.log(`   Estimated build time: ${buildTime}s`);

      // Test coverage (if available)
      const testCoverage = this.checkTestCoverage();
      if (testCoverage) {
        this.metrics.performance.testCoverage = testCoverage;
        console.log(`   Test coverage: ${testCoverage}%`);
      }
    } catch (error) {
      this.metrics.issues.push({
        type: "performance",
        message: `Performance check failed: ${error.message}`,
      });
    }
  }

  /**
   * Generate health recommendations
   */
  async generateRecommendations() {
    console.log("💡 Generating recommendations...");

    // Check for common issues and generate recommendations
    if (this.metrics.system.gitChanges > 20) {
      this.metrics.recommendations.push({
        type: "git",
        priority: "medium",
        message: "Consider committing changes - many files modified",
      });
    }

    if (!this.metrics.project.hasEnvFile) {
      this.metrics.recommendations.push({
        type: "environment",
        priority: "high",
        message: "Create .env file for environment configuration",
      });
    }

    if (this.metrics.dependencies.nodeModulesSize > 500 * 1024 * 1024) {
      // > 500MB
      this.metrics.recommendations.push({
        type: "dependencies",
        priority: "medium",
        message: "node_modules is large - consider dependency cleanup",
      });
    }

    if (this.metrics.performance.memory.heapUsed > 100) {
      // > 100MB
      this.metrics.recommendations.push({
        type: "performance",
        priority: "low",
        message: "High memory usage detected - monitor for memory leaks",
      });
    }

    console.log(
      `   Generated ${this.metrics.recommendations.length} recommendations`,
    );
  }

  /**
   * Check disk usage
   */
  checkDiskUsage() {
    try {
      const output = execSync("df -h .", { encoding: "utf8" });
      const lines = output.split("\n");
      const diskLine = lines[1];
      const parts = diskLine.split(/\s+/);

      return {
        total: parseFloat(parts[1].replace("G", "")),
        used: parseFloat(parts[2].replace("G", "")),
        available: parseFloat(parts[3].replace("G", "")),
      };
    } catch {
      return { total: 0, used: 0, available: 0 };
    }
  }

  /**
   * Count project files using Node.js APIs
   */
  countProjectFiles() {
    try {
      // Use Node.js APIs instead of shell commands
      const jsCount = countFilesByExtension(ROOT_DIR, [".js"]);
      const tsCount = countFilesByExtension(ROOT_DIR, [".ts"]);
      const totalCount = countAllFiles(ROOT_DIR);

      return {
        total: totalCount,
        js: jsCount,
        ts: tsCount,
      };
    } catch {
      return { total: 0, js: 0, ts: 0 };
    }
  }

  /**
   * Count documentation files using Node.js APIs
   */
  countDocumentationFiles() {
    try {
      // Use Node.js APIs instead of shell commands
      return countFilesByExtension(ROOT_DIR, [".md"]);
    } catch {
      return 0;
    }
  }

  /**
   * Get directory size using Node.js APIs
   */
  getDirectorySize(dirPath) {
    try {
      if (!existsSync(dirPath)) {
        return 0;
      }

      // Use Node.js APIs instead of shell commands
      return getDirectorySizeSync(dirPath);
    } catch {
      return 0;
    }
  }

  /**
   * Estimate build time
   */
  estimateBuildTime() {
    const fileCount = this.metrics.project.files?.total || 0;
    const dependencyCount =
      this.metrics.dependencies.production +
      this.metrics.dependencies.development;

    // Simple estimation based on file count and dependencies
    const baseTime = 10; // seconds
    const fileTime = fileCount * 0.1; // 0.1 seconds per file
    const depTime = dependencyCount * 0.5; // 0.5 seconds per dependency

    return Math.round(baseTime + fileTime + depTime);
  }

  /**
   * Check test coverage
   */
  checkTestCoverage() {
    try {
      // Look for coverage reports
      const coverageFile = join(ROOT_DIR, "coverage/coverage-summary.json");
      if (existsSync(coverageFile)) {
        const coverage = JSON.parse(readFileSync(coverageFile, "utf8"));
        return Math.round(coverage.total?.lines?.pct || 0);
      }
    } catch {
      // Coverage not available
    }
    return null;
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    console.log("\n📊 Generating health report...");

    const reportDir = join(ROOT_DIR, "health-reports");
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = join(reportDir, `health-report-${Date.now()}.json`);
    writeFileSync(reportFile, JSON.stringify(this.metrics, null, 2));

    // Calculate health score
    const healthScore = this.calculateHealthScore();

    console.log("📊 Health Report Summary:");
    console.log(`   Overall Health: ${healthScore}%`);
    console.log(`   Issues Found: ${this.metrics.issues.length}`);
    console.log(`   Recommendations: ${this.metrics.recommendations.length}`);
    console.log(`   Report saved: ${reportFile}`);

    // Show critical issues
    const criticalIssues = this.metrics.issues.filter(
      (issue) => issue.type === "system",
    );
    if (criticalIssues.length > 0) {
      console.log("\n🚨 Critical Issues:");
      criticalIssues.forEach((issue) => console.log(`   • ${issue.message}`));
    }

    // Show high priority recommendations
    const highPriorityRecs = this.metrics.recommendations.filter(
      (rec) => rec.priority === "high",
    );
    if (highPriorityRecs.length > 0) {
      console.log("\n💡 Priority Recommendations:");
      highPriorityRecs.forEach((rec) => console.log(`   • ${rec.message}`));
    }
  }

  /**
   * Calculate overall health score
   */
  calculateHealthScore() {
    let score = 100;

    // Deduct points for issues
    score -= this.metrics.issues.length * 10;

    // Deduct points for missing environment
    if (!this.metrics.project.hasEnvFile) {
      score -= 15;
    }

    // Deduct points for high memory usage
    if (this.metrics.performance.memory?.heapUsed > 100) {
      score -= 10;
    }

    // Deduct points for many git changes
    if (this.metrics.system.gitChanges > 20) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new HealthMonitor();

  monitor.monitor().catch((error) => {
    console.error("❌ Health monitoring failed:", error);
    process.exit(1);
  });
}

export default HealthMonitor;

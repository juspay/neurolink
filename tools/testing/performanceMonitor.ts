#!/usr/bin/env tsx

/**
 * NeuroLink Performance Monitor
 * Advanced performance monitoring and benchmarking
 * Part of Developer Experience Enhancement Plan 2.0 - Phase 3
 */

import { execSync } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";
import { setInterval, clearInterval } from "timers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../..");

type Benchmark = {
  name: string;
  title: string;
  command: string;
  threshold: number;
};

type BenchmarkResult = {
  name: string;
  title: string;
  command: string;
  threshold: number;
  duration: number;
  memory: { heapUsed?: number; rss?: number };
  status: string;
  error: string | null;
};

type PerformanceResults = {
  timestamp: string;
  system: Record<string, unknown>;
  benchmarks: Record<string, BenchmarkResult>;
  performance: {
    overall: number;
    bottlenecks: Array<{
      name: string;
      title: string;
      duration: number;
      threshold: number;
      overrun: number;
    }>;
    recommendations: Array<{ type: string; priority: string; message: string }>;
  };
};

class PerformanceMonitor {
  benchmarks: Benchmark[];
  results: PerformanceResults;

  constructor() {
    this.benchmarks = [
      {
        name: "build_time",
        title: "Build Performance",
        command: "pnpm run build",
        threshold: 30000, // 30 seconds
      },
      {
        name: "test_time",
        title: "Test Performance",
        command: "pnpm run test:run",
        threshold: 10000, // 10 seconds
      },
      {
        name: "lint_time",
        title: "Lint Performance",
        command: "pnpm run lint",
        threshold: 5000, // 5 seconds
      },
    ];

    this.results = {
      timestamp: new Date().toISOString(),
      system: this.getSystemInfo(),
      benchmarks: {},
      performance: {
        overall: 0,
        bottlenecks: [],
        recommendations: [],
      },
    };
  }

  /**
   * Main performance monitoring execution
   */
  async monitor(benchmarkName: string | null = null) {
    try {
      console.log("\n⚡ NeuroLink Performance Monitor - Benchmarking");
      console.log("===============================================");

      if (benchmarkName) {
        await this.runSingleBenchmark(benchmarkName);
      } else {
        await this.runAllBenchmarks();
      }

      await this.analyzePerformance();
      await this.generateReport();

      console.log("\n✅ Performance monitoring complete!");
    } catch (error: any) {
      console.error("❌ Performance monitoring failed:", error.message);
      process.exit(1);
    }
  }

  /**
   * Run all benchmarks
   */
  async runAllBenchmarks() {
    console.log("🏃 Running performance benchmarks...");

    for (const benchmark of this.benchmarks) {
      await this.runBenchmark(benchmark);
    }
  }

  /**
   * Run single benchmark
   */
  async runSingleBenchmark(benchmarkName: string) {
    const benchmark = this.benchmarks.find((b) => b.name === benchmarkName);
    if (!benchmark) {
      throw new Error(`Unknown benchmark: ${benchmarkName}`);
    }

    await this.runBenchmark(benchmark);
  }

  /**
   * Run individual benchmark
   */
  async runBenchmark(benchmark: Benchmark) {
    console.log(`\n🎯 Running ${benchmark.title}...`);

    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    const result: BenchmarkResult = {
      name: benchmark.name,
      title: benchmark.title,
      command: benchmark.command,
      threshold: benchmark.threshold,
      duration: 0,
      memory: {},
      status: "unknown",
      error: null,
    };

    try {
      console.log(`   Command: ${benchmark.command}`);

      execSync(benchmark.command, {
        cwd: ROOT_DIR,
        stdio: "pipe",
      });

      const endTime = Date.now();
      const endMemory = process.memoryUsage();

      result.duration = endTime - startTime;
      result.memory = {
        heapUsed: Math.round(
          (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
        ),
        rss: Math.round((endMemory.rss - startMemory.rss) / 1024 / 1024),
      };

      result.status = result.duration <= benchmark.threshold ? "pass" : "slow";

      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Memory: ${result.memory.heapUsed}MB heap`);
      console.log(`   Status: ${result.status}`);
    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.status = "error";
      result.error = error.message;

      console.log(`   ❌ Failed: ${error.message}`);
    }

    this.results.benchmarks[benchmark.name] = result;
  }

  /**
   * Analyze performance results
   */
  async analyzePerformance() {
    console.log("\n📊 Analyzing performance...");

    const benchmarkResults = Object.values(this.results.benchmarks);
    const totalDuration = benchmarkResults.reduce(
      (sum, b) => sum + b.duration,
      0,
    );
    const passedBenchmarks = benchmarkResults.filter(
      (b) => b.status === "pass",
    ).length;

    // Calculate overall performance score
    this.results.performance.overall = Math.round(
      (passedBenchmarks / benchmarkResults.length) * 100,
    );

    // Identify bottlenecks
    const slowBenchmarks = benchmarkResults.filter((b) => b.status === "slow");
    this.results.performance.bottlenecks = slowBenchmarks.map((b) => ({
      name: b.name,
      title: b.title,
      duration: b.duration,
      threshold: b.threshold,
      overrun: b.duration - b.threshold,
    }));

    // Generate recommendations
    if (slowBenchmarks.length > 0) {
      this.results.performance.recommendations.push({
        type: "performance",
        priority: "high",
        message: `${slowBenchmarks.length} benchmark(s) exceeding thresholds`,
      });
    }

    const highMemoryBenchmarks = benchmarkResults.filter(
      (b) => b.memory?.heapUsed > 50,
    );
    if (highMemoryBenchmarks.length > 0) {
      this.results.performance.recommendations.push({
        type: "memory",
        priority: "medium",
        message: `${highMemoryBenchmarks.length} benchmark(s) using high memory`,
      });
    }

    console.log(`   Overall Score: ${this.results.performance.overall}%`);
    console.log(`   Total Duration: ${totalDuration}ms`);
    console.log(
      `   Bottlenecks: ${this.results.performance.bottlenecks.length}`,
    );
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    try {
      return {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCount: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
      };
    } catch {
      return {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      };
    }
  }

  /**
   * Generate performance report
   */
  async generateReport() {
    console.log("\n📊 Generating performance report...");

    const reportDir = join(ROOT_DIR, "performance-reports");
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = join(reportDir, `performance-report-${Date.now()}.json`);
    writeFileSync(reportFile, JSON.stringify(this.results, null, 2));

    console.log("📊 Performance Report Summary:");
    console.log(`   Overall Score: ${this.results.performance.overall}%`);
    console.log(
      `   Benchmarks: ${Object.keys(this.results.benchmarks).length}`,
    );
    console.log(
      `   Bottlenecks: ${this.results.performance.bottlenecks.length}`,
    );
    console.log(`   Report saved: ${reportFile}`);

    // Show benchmark results
    console.log("\n📋 Benchmark Results:");
    for (const [, result] of Object.entries(this.results.benchmarks)) {
      const icon =
        result.status === "pass"
          ? "✅"
          : result.status === "slow"
            ? "⚠️ "
            : "❌";
      const duration = `${result.duration}ms`;
      const threshold = `(${result.threshold}ms threshold)`;
      console.log(
        `   ${icon} ${result.title.padEnd(20)} - ${duration.padEnd(10)} ${threshold}`,
      );
    }

    // Show bottlenecks
    if (this.results.performance.bottlenecks.length > 0) {
      console.log("\n🐌 Performance Bottlenecks:");
      this.results.performance.bottlenecks.forEach((bottleneck) => {
        const overrun = `+${bottleneck.overrun}ms over threshold`;
        console.log(`   • ${bottleneck.title}: ${overrun}`);
      });
    }

    // Show recommendations
    if (this.results.performance.recommendations.length > 0) {
      console.log("\n💡 Performance Recommendations:");
      this.results.performance.recommendations.forEach((rec) => {
        console.log(`   • ${rec.message}`);
      });
    }
  }

  /**
   * Run continuous monitoring
   */
  async watch(interval = 60000) {
    // 1 minute default
    console.log(
      `\n👁️  Starting continuous performance monitoring (${interval}ms interval)...`,
    );

    const runMonitoring = async () => {
      try {
        await this.runAllBenchmarks();
        await this.analyzePerformance();

        const timestamp = new Date().toISOString();
        console.log(
          `\n[${timestamp}] Performance check complete - Score: ${this.results.performance.overall}%`,
        );
      } catch (error: any) {
        console.error(`Performance monitoring error: ${error.message}`);
      }
    };

    // Initial run
    await runMonitoring();

    // Set up interval
    const intervalId = setInterval(runMonitoring, interval);

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n⏹️  Stopping performance monitoring...");
      clearInterval(intervalId);
      process.exit(0);
    });
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "monitor";
  const benchmarkName = process.argv[3];

  const monitor = new PerformanceMonitor();

  switch (command) {
    case "monitor":
      monitor.monitor(benchmarkName).catch((error) => {
        console.error("❌ Performance monitoring failed:", error);
        process.exit(1);
      });
      break;
    case "watch": {
      const interval = parseInt(process.argv[3]) || 60000;
      monitor.watch(interval).catch((error) => {
        console.error("❌ Performance watch failed:", error);
        process.exit(1);
      });
      break;
    }
    default:
      console.log(
        "Usage: tsx tools/testing/performanceMonitor.ts [monitor|watch] [benchmark-name|interval]",
      );
      console.log("Benchmarks: build_time, test_time, lint_time");
      break;
  }
}

export default PerformanceMonitor;

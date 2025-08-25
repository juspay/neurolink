#!/usr/bin/env node

/**
 * NeuroLink Complete Build System
 * Unified build pipeline integrating all automation tools
 * Part of Developer Experience Enhancement Plan 2.0 - Phase 3C
 */

import { execSync, spawn } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../..");

class BuildSystem {
  constructor() {
    this.phases = [
      {
        name: "environment",
        title: "🔧 Environment Setup & Validation",
        required: true,
        commands: ["pnpm run env:validate", "pnpm run project:health"],
      },
      {
        name: "analysis",
        title: "🔍 Project Analysis & Cleanup",
        required: true,
        commands: [
          "pnpm run project:analyze",
          "pnpm run convert:shell-scripts",
        ],
      },
      {
        name: "testing",
        title: "🧪 Adaptive Testing & Validation",
        required: true,
        commands: ["pnpm run test:smart", "pnpm run test:providers"],
      },
      {
        name: "documentation",
        title: "📚 Documentation Sync & Generation",
        required: false,
        commands: ["pnpm run docs:sync", "pnpm run docs:validate"],
      },
      {
        name: "content",
        title: "🎨 Content Generation & Optimization",
        required: false,
        commands: ["pnpm run content:cleanup", "pnpm run content:screenshots"],
      },
      {
        name: "build",
        title: "🏗️  Core Build & Package",
        required: true,
        commands: ["pnpm run build", "pnpm run check"],
      },
      {
        name: "quality",
        title: "✨ Quality Assurance & Optimization",
        required: true,
        commands: ["pnpm run lint", "pnpm run format"],
      },
    ];

    this.results = {
      timestamp: new Date().toISOString(),
      buildId: `build-${Date.now()}`,
      phases: {},
      performance: {},
      summary: {
        total: this.phases.length,
        completed: 0,
        failed: 0,
        skipped: 0,
      },
    };

    this.startTime = Date.now();
  }

  /**
   * Main build execution
   */
  async build(target = "complete", options = {}) {
    try {
      console.log("\n🏗️  NeuroLink Complete Build System - Phase 3C");
      console.log("================================================");
      console.log(`Build ID: ${this.results.buildId}`);
      console.log(`Target: ${target}`);
      console.log(`Started: ${new Date().toISOString()}\n`);

      // Filter phases based on target
      const selectedPhases = this.selectPhases(target, options);

      // Execute phases
      for (const phase of selectedPhases) {
        await this.executePhase(phase, options);
      }

      // Generate final report
      await this.generateBuildReport();

      console.log("\n✅ Build system execution complete!");
    } catch (error) {
      console.error("❌ Build system failed:", error.message);
      await this.generateBuildReport();
      process.exit(1);
    }
  }

  /**
   * Select phases based on target
   */
  selectPhases(target, options) {
    switch (target) {
      case "fast":
        return this.phases.filter((p) =>
          ["environment", "testing", "build"].includes(p.name),
        );
      case "quality":
        return this.phases.filter((p) =>
          ["environment", "testing", "build", "quality"].includes(p.name),
        );
      case "content":
        return this.phases.filter((p) =>
          ["environment", "documentation", "content"].includes(p.name),
        );
      case "complete":
      default:
        return options.skipOptional
          ? this.phases.filter((p) => p.required)
          : this.phases;
    }
  }

  /**
   * Execute a single build phase
   */
  async executePhase(phase, options = {}) {
    console.log(`\n${phase.title}`);
    console.log("─".repeat(phase.title.length));

    const phaseStartTime = Date.now();
    const phaseResult = {
      name: phase.name,
      title: phase.title,
      status: "running",
      commands: [],
      duration: 0,
      error: null,
    };

    try {
      for (const command of phase.commands) {
        console.log(`🔄 Executing: ${command}`);

        const commandResult = await this.executeCommand(command, options);
        phaseResult.commands.push(commandResult);

        if (!commandResult.success && phase.required) {
          throw new Error(`Required command failed: ${command}`);
        }

        if (!commandResult.success) {
          console.log(`⚠️  Optional command failed: ${command}`);
        }
      }

      phaseResult.status = "completed";
      phaseResult.duration = Date.now() - phaseStartTime;
      this.results.summary.completed++;

      console.log(`✅ Phase completed in ${phaseResult.duration}ms`);
    } catch (error) {
      phaseResult.status = "failed";
      phaseResult.duration = Date.now() - phaseStartTime;
      phaseResult.error = error.message;
      this.results.summary.failed++;

      console.log(`❌ Phase failed: ${error.message}`);

      if (phase.required) {
        throw error;
      }
    }

    this.results.phases[phase.name] = phaseResult;
  }

  /**
   * Execute a single command
   */
  async executeCommand(command, options = {}) {
    const commandStartTime = Date.now();
    const result = {
      command,
      success: false,
      duration: 0,
      output: "",
      error: null,
    };

    try {
      if (options.dryRun) {
        console.log(`   [DRY RUN] ${command}`);
        result.success = true;
        result.output = "[DRY RUN] Command would be executed";
      } else {
        const output = execSync(command, {
          encoding: "utf8",
          cwd: ROOT_DIR,
          stdio: options.verbose ? "inherit" : "pipe",
        });

        result.success = true;
        result.output = output;
      }
    } catch (error) {
      result.error = error.message;
      console.log(`   ❌ Command failed: ${command}`);

      if (options.verbose) {
        console.log(`   Error: ${error.message}`);
      }
    }

    result.duration = Date.now() - commandStartTime;
    return result;
  }

  /**
   * Monitor build performance
   */
  async monitorPerformance() {
    const totalDuration = Date.now() - this.startTime;

    this.results.performance = {
      totalDuration,
      phaseBreakdown: {},
      efficiency: this.calculateEfficiency(),
      resourceUsage: await this.getResourceUsage(),
    };

    // Calculate phase breakdown
    for (const [phaseName, phaseResult] of Object.entries(
      this.results.phases,
    )) {
      this.results.performance.phaseBreakdown[phaseName] = {
        duration: phaseResult.duration,
        percentage: Math.round((phaseResult.duration / totalDuration) * 100),
      };
    }
  }

  /**
   * Calculate build efficiency
   */
  calculateEfficiency() {
    const { completed, total } = this.results.summary;
    return Math.round((completed / total) * 100);
  }

  /**
   * Get resource usage (placeholder)
   */
  async getResourceUsage() {
    try {
      // Get basic system info
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      };
    } catch {
      return { error: "Unable to collect resource usage" };
    }
  }

  /**
   * Generate comprehensive build report
   */
  async generateBuildReport() {
    console.log("\n📊 Generating build report...");

    await this.monitorPerformance();

    const reportDir = join(ROOT_DIR, "build-reports");
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = join(reportDir, `${this.results.buildId}.json`);
    writeFileSync(reportFile, JSON.stringify(this.results, null, 2));

    // Generate summary
    console.log("📊 Build Report Summary:");
    console.log(`   Build ID: ${this.results.buildId}`);
    console.log(`   Duration: ${this.results.performance.totalDuration}ms`);
    console.log(
      `   Phases: ${this.results.summary.completed}/${this.results.summary.total} completed`,
    );
    console.log(`   Efficiency: ${this.results.performance.efficiency}%`);
    console.log(`   Report saved: ${reportFile}`);

    // Show phase breakdown
    console.log("\n📋 Phase Performance:");
    for (const [phaseName, performance] of Object.entries(
      this.results.performance.phaseBreakdown,
    )) {
      const status = this.results.phases[phaseName]?.status || "unknown";
      const icon =
        status === "completed" ? "✅" : status === "failed" ? "❌" : "⚠️ ";
      console.log(
        `   ${icon} ${phaseName.padEnd(15)} - ${performance.duration}ms (${performance.percentage}%)`,
      );
    }

    // Show resource usage
    if (
      this.results.performance.resourceUsage &&
      !this.results.performance.resourceUsage.error
    ) {
      const { memory } = this.results.performance.resourceUsage;
      console.log(`\n💾 Resource Usage:`);
      console.log(
        `   Memory: ${memory.heapUsed}MB / ${memory.heapTotal}MB heap`,
      );
    }
  }

  /**
   * Deploy build artifacts
   */
  async deploy(target = "staging", options = {}) {
    console.log(`\n🚀 Deploying to ${target}...`);

    // Set the default forceRebuild value to false as build is always run with a 'complete' target before deploy.
    const deployCommands = this.getDeployCommands(target, options.forceRebuild ?? false);

    for (const command of deployCommands) {
      console.log(`🔄 ${command}`);

      try {
        if (!options.dryRun) {
          execSync(command, {
            cwd: ROOT_DIR,
            stdio: "inherit",
          });
        } else {
          console.log(`   [DRY RUN] ${command}`);
        }
      } catch (error) {
        console.error(`❌ Deploy command failed: ${command}`);
        throw error;
      }
    }

    console.log(`✅ Deploy to ${target} completed`);
  }

  /**
   * Get deployment commands for target
   */
  getDeployCommands(target, forceRebuild = false) {
    const echoSkipBuildMessage = 'echo "Skipping build as it is already completed"';
    switch (target) {
      case "staging":
        return [
          forceRebuild ? "pnpm run build" : echoSkipBuildMessage,
          "pnpm run test:ci",
          'echo "Deploy to staging would happen here"',
        ];
      case "production":
        return [
          forceRebuild ? "pnpm run build:complete" : echoSkipBuildMessage,
          "pnpm run test:ci",
          "pnpm run changeset:version",
          'echo "Deploy to production would happen here"',
        ];
      default:
        return ['echo "Unknown deployment target"'];
    }
  }

  /**
   * Watch mode for continuous building
   */
  async watch() {
    console.log("\n👁️  Starting build system in watch mode...");

    const watchCommand = "pnpm run dev";

    const child = spawn("sh", ["-c", watchCommand], {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      console.log(`Watch process exited with code ${code}`);
    });

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n⏹️  Stopping watch mode...");
      child.kill("SIGINT");
      process.exit(0);
    });
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "build";
  const target = process.argv[3] || "complete";

  const options = {
    dryRun: process.argv.includes("--dry-run"),
    verbose: process.argv.includes("--verbose"),
    skipOptional: process.argv.includes("--skip-optional"),
    forceRebuild: process.argv.includes("--force-rebuild"),
  };

  const buildSystem = new BuildSystem();

  switch (command) {
    case "build":
      buildSystem.build(target, options).catch((error) => {
        console.error("❌ Build failed:", error);
        process.exit(1);
      });
      break;
    case "deploy":
      buildSystem
        .build("complete", options)
        .then(() => buildSystem.deploy(target, options))
        .catch((error) => {
          console.error("❌ Deploy failed:", error);
          process.exit(1);
        });
      break;
    case "watch":
      buildSystem.watch(options).catch((error) => {
        console.error("❌ Watch failed:", error);
        process.exit(1);
      });
      break;
    default:
      console.log(
        "Usage: node buildSystem.js [build|deploy|watch] [target] [options]",
      );
      console.log("Targets: fast, quality, content, complete");
      console.log("Options: --dry-run, --verbose, --skip-optional, --force-rebuild");
      break;
  }
}

export default BuildSystem;

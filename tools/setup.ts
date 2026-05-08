#!/usr/bin/env tsx
/**
 * NeuroLink Complete Setup Script
 *
 * Orchestrates the complete developer experience enhancement process.
 * Demonstrates the integration of all automation tools.
 */

import { ScriptAnalyzer } from "./automation/scriptAnalyzer.ts";
import { EnvironmentManager } from "./automation/environmentManager.ts";
import { ProjectOrganizer } from "./automation/projectOrganizer.ts";
import { VideoCleanup } from "./content/videoCleanup.ts";

class NeuroLinkSetup {
  steps: any[];
  results: Record<string, any>;

  constructor() {
    this.steps = [
      { name: "Environment Setup", fn: () => this.setupEnvironment() },
      { name: "Script Analysis", fn: () => this.analyzeScripts() },
      { name: "Project Organization", fn: () => this.organizeProject() },
      { name: "Content Cleanup", fn: () => this.cleanupContent() },
      { name: "Validation", fn: () => this.validateSetup() },
    ];

    this.results = {
      environment: null,
      scripts: null,
      organization: null,
      cleanup: null,
      validation: null,
    };
  }

  async runCompleteSetup() {
    console.log("🚀 Starting NeuroLink Complete Setup...");
    console.log("📋 This will enhance your developer experience with:");
    console.log("  ✅ Safe environment management");
    console.log("  ✅ Script cleanup and organization");
    console.log("  ✅ Modern project structure");
    console.log("  ✅ Content optimization");
    console.log("  ✅ Comprehensive validation");

    const startTime = Date.now();
    let completedSteps = 0;

    try {
      for (const step of this.steps) {
        console.log(
          `\n📌 STEP ${completedSteps + 1}/${this.steps.length}: ${step.name}`,
        );
        console.log("─".repeat(60));

        await step.fn();
        completedSteps++;

        console.log(`✅ ${step.name} completed`);
      }

      const duration = Date.now() - startTime;
      await this.generateFinalReport(duration);

      console.log(
        "\n🎉 NeuroLink Setup Complete! Your developer experience has been enhanced.",
      );
    } catch (error: any) {
      console.error(
        `❌ Setup failed at step: ${this.steps[completedSteps].name}`,
      );
      console.error(`Error: ${error.message}`);
      throw error;
    }
  }

  async setupEnvironment() {
    console.log("🔧 Setting up development environment...");

    const envManager = new EnvironmentManager();
    this.results.environment = await envManager.setupEnvironment();

    console.log(
      `📊 Environment configured with ${this.results.environment.configured.length}/21+ providers`,
    );
  }

  async analyzeScripts() {
    console.log("🔍 Analyzing and cleaning up scripts...");

    const analyzer = new ScriptAnalyzer();
    this.results.scripts = await analyzer.analyzeProject();

    // Auto-execute cleanup if user wants
    if (process.argv.includes("--auto-cleanup")) {
      console.log("🧹 Auto-executing script cleanup...");
      await analyzer.executePlan();
    } else {
      console.log(
        "💡 Run with --auto-cleanup to automatically remove duplicates",
      );
    }

    console.log(
      `📊 Found ${this.results.scripts.duplicates.length} duplicate scripts, ${this.results.scripts.shellScripts.length} shell scripts`,
    );
  }

  async organizeProject() {
    console.log("📁 Organizing project structure...");

    const organizer = new ProjectOrganizer();
    this.results.organization = await organizer.organizeProject();

    console.log(
      `📦 Organized ${this.results.organization.summary.filesMoved} files into ${this.results.organization.summary.categoriesCreated} categories`,
    );
  }

  async cleanupContent() {
    console.log("🎬 Cleaning up content files...");

    const videoCleanup = new VideoCleanup();

    try {
      this.results.cleanup = await videoCleanup.cleanupHashNamedVideos();
      console.log(
        `🧹 Cleaned ${this.results.cleanup.cleaned} video files, saved ${this.formatBytes(this.results.cleanup.sizeSaved)}`,
      );
    } catch {
      console.log("⚠️  Content cleanup skipped (no video directory found)");
      this.results.cleanup = { cleaned: 0, sizeSaved: 0 };
    }
  }

  async validateSetup() {
    console.log("✅ Validating complete setup...");

    const validation = {
      environment: this.results.environment,
      packageJson: await this.validatePackageJson(),
      toolsStructure: await this.validateToolsStructure(),
      dependencies: await this.validateDependencies(),
    };

    this.results.validation = validation;

    // Report validation results
    this.reportValidation(validation);
  }

  async validatePackageJson() {
    try {
      const packageJson = JSON.parse(
        await import("fs/promises").then((fs) =>
          fs.readFile("./package.json", "utf-8"),
        ),
      );

      const requiredScripts = [
        "env:setup",
        "env:validate",
        "project:analyze",
        "project:organize",
        "test:smart",
        "content:cleanup",
        "dev:full",
      ];

      const hasScripts = requiredScripts.filter(
        (script) => packageJson.scripts && packageJson.scripts[script],
      );

      return {
        valid: hasScripts.length === requiredScripts.length,
        hasScripts: hasScripts.length,
        totalRequired: requiredScripts.length,
        missing: requiredScripts.filter(
          (script) => !packageJson.scripts || !packageJson.scripts[script],
        ),
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  async validateToolsStructure() {
    const fs = await import("fs/promises");

    const requiredDirectories = [
      "tools/automation",
      "tools/content",
      "tools/testing",
      "tools/development",
    ];

    const requiredFiles = [
      "tools/automation/scriptAnalyzer.ts",
      "tools/automation/environmentManager.ts",
      "tools/automation/projectOrganizer.ts",
      "tools/content/videoCleanup.ts",
    ];

    const validation = {
      directories: { existing: [], missing: [] },
      files: { existing: [], missing: [] },
    };

    // Check directories
    for (const dir of requiredDirectories) {
      try {
        await fs.access(dir);
        validation.directories.existing.push(dir);
      } catch {
        validation.directories.missing.push(dir);
      }
    }

    // Check files
    for (const file of requiredFiles) {
      try {
        await fs.access(file);
        validation.files.existing.push(file);
      } catch {
        validation.files.missing.push(file);
      }
    }

    validation.valid =
      validation.directories.missing.length === 0 &&
      validation.files.missing.length === 0;

    return validation;
  }

  async validateDependencies() {
    try {
      const { execSync } = await import("child_process");

      // Check if pnpm is available
      const pnpmVersion = execSync("pnpm --version", {
        encoding: "utf-8",
      }).trim();

      // Check Node version
      const nodeVersion = process.version;

      return {
        valid: true,
        pnpm: pnpmVersion,
        node: nodeVersion,
        platform: process.platform,
      };
    } catch {
      return {
        valid: false,
        error: "pnpm not available",
        node: process.version,
        platform: process.platform,
      };
    }
  }

  reportValidation(validation: any) {
    console.log("\n📊 SETUP VALIDATION RESULTS");
    console.log("=".repeat(60));

    // Environment
    console.log(
      `🔧 Environment: ${validation.environment.configured.length}/21+ providers configured`,
    );

    // Package.json
    if (validation.packageJson.valid) {
      console.log(
        `📦 Package.json: ✅ All ${validation.packageJson.totalRequired} scripts configured`,
      );
    } else {
      console.log(
        `📦 Package.json: ❌ Missing ${validation.packageJson.missing.length} scripts`,
      );
    }

    // Tools structure
    if (validation.toolsStructure.valid) {
      console.log(`📁 Tools structure: ✅ All directories and files present`);
    } else {
      console.log(
        `📁 Tools structure: ⚠️  Missing ${validation.toolsStructure.directories.missing.length} directories, ${validation.toolsStructure.files.missing.length} files`,
      );
    }

    // Dependencies
    if (validation.dependencies.valid) {
      console.log(
        `⚙️  Dependencies: ✅ pnpm ${validation.dependencies.pnpm}, Node ${validation.dependencies.node}`,
      );
    } else {
      console.log(`⚙️  Dependencies: ❌ ${validation.dependencies.error}`);
    }
  }

  async generateFinalReport(duration: number) {
    console.log("\n📋 FINAL SETUP REPORT");
    console.log("=".repeat(60));
    console.log(`⏱️  Total setup time: ${Math.round(duration / 1000)}s`);
    console.log(
      `🔧 Environment: ${this.results.environment.configured.length}/21+ providers`,
    );
    console.log(
      `🧹 Scripts: ${this.results.scripts.duplicates.length} duplicates found`,
    );
    console.log(
      `📁 Organization: ${this.results.organization.summary.filesMoved} files moved`,
    );
    console.log(`🎬 Content: ${this.results.cleanup.cleaned} files cleaned`);

    console.log("\n🎯 AVAILABLE COMMANDS");
    console.log("─".repeat(30));
    console.log("Environment Management:");
    console.log("  pnpm run env:setup      - Setup environment");
    console.log("  pnpm run env:validate   - Validate configuration");
    console.log("  pnpm run env:backup     - Backup .env file");

    console.log("\nProject Management:");
    console.log("  pnpm run project:analyze   - Analyze scripts");
    console.log("  pnpm run project:cleanup   - Clean duplicates");
    console.log("  pnpm run project:organize  - Organize structure");

    console.log("\nTesting & Validation:");
    console.log("  pnpm run test:smart        - Adaptive testing");
    console.log("  pnpm run test:run          - Standard tests");

    console.log("\nContent Management:");
    console.log("  pnpm run content:cleanup   - Clean video files");
    console.log("  pnpm run content:all       - Generate all content");

    console.log("\nDevelopment:");
    console.log("  pnpm run dev:full          - Enhanced dev server");
    console.log("  pnpm run build:complete    - Complete build");

    console.log("\n💡 NEXT STEPS");
    console.log("─".repeat(20));
    console.log("1. Add your API keys to .env file");
    console.log("2. Run: pnpm run test:smart");
    console.log("3. Start development: pnpm run dev:full");
    console.log("4. Generate content: pnpm run content:all");

    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: Math.round(duration / 1000),
      results: this.results,
      commands: {
        environment: ["env:setup", "env:validate", "env:backup"],
        project: ["project:analyze", "project:cleanup", "project:organize"],
        testing: ["test:smart", "test:run"],
        content: ["content:cleanup", "content:all"],
        development: ["dev:full", "build:complete"],
      },
    };

    const fs = await import("fs/promises");
    await fs.writeFile(
      "./setup-report.json",
      JSON.stringify(reportData, null, 2),
    );

    console.log("\n📄 Detailed report saved to: setup-report.json");
  }

  formatBytes(bytes: number) {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  async quickSetup() {
    console.log("⚡ Running Quick Setup (environment + organization only)...");

    // Just run essential steps
    await this.setupEnvironment();
    await this.organizeProject();

    console.log("\n✅ Quick setup complete!");
    console.log("💡 Run full setup for comprehensive enhancement");
  }
}

// Export for use as module
export { NeuroLinkSetup };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new NeuroLinkSetup();

  try {
    if (process.argv.includes("--quick")) {
      await setup.quickSetup();
    } else {
      await setup.runCompleteSetup();
    }
  } catch (error: any) {
    console.error("❌ Setup failed:", error.message);
    console.log("\n💡 Try running individual tools:");
    console.log("  tsx tools/automation/environmentManager.ts");
    console.log("  tsx tools/automation/scriptAnalyzer.ts");
    console.log("  tsx tools/automation/projectOrganizer.ts");
    process.exit(1);
  }
}

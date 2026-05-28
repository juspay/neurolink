#!/usr/bin/env tsx
/**
 * Project Organizer for NeuroLink Developer Experience Enhancement
 *
 * Intelligently reorganizes project structure following modern TypeScript patterns.
 * Creates organized tools directory with logical categorization.
 */

import fs from "fs/promises";
import path from "path";

type CategoryConfig = {
  description: string;
  files: string[];
};

type OrganizationReport = {
  summary: {
    totalFilesProcessed: number;
    filesMoved: number;
    filesIgnored: number;
    filesUncategorized: number;
    categoriesCreated: number;
  };
  categories: Record<string, { files: string[]; count: number }>;
  recommendations: string[];
};

type Categorization = {
  automation: string[];
  content: string[];
  testing: string[];
  development: string[];
  uncategorized: string[];
  ignored: string[];
  [key: string]: string[];
};

class ProjectOrganizer {
  projectRoot: string;
  targetStructure: Record<string, Record<string, CategoryConfig>>;
  categoryRules: Record<string, string[]>;
  scriptsToIgnore: string[];

  constructor() {
    this.projectRoot = process.cwd();
    this.targetStructure = {
      "tools/": {
        "automation/": {
          description: "Build, deployment, and project automation scripts",
          files: [],
        },
        "content/": {
          description: "Screenshot, video, and documentation generation",
          files: [],
        },
        "testing/": {
          description:
            "Advanced testing, validation, and performance monitoring",
          files: [],
        },
        "development/": {
          description: "Development servers, debugging, and utilities",
          files: [],
        },
      },
    };

    this.categoryRules = {
      automation: [
        "scriptAnalyzer",
        "environment",
        "projectOrganizer",
        "build",
        "deploy",
        "release",
        "publish",
        "automation",
        "workflow",
      ],
      content: [
        "screenshot",
        "video",
        "visual",
        "demo",
        "documentation",
        "capture",
        "generate",
        "create-cli",
        "create-mcp",
        "content",
      ],
      testing: [
        "test",
        "validate",
        "benchmark",
        "spec",
        "stress",
        "performance",
        "provider",
        "integration",
        "e2e",
      ],
      development: [
        "dev",
        "server",
        "debug",
        "health",
        "dependency",
        "monitor",
        "modelServer",
      ],
    };

    this.scriptsToIgnore = [
      "verify-working-integration.js", // Keep in root
      "debug-permissions.js", // Keep in root
      "debug-tools-for-ai.js", // Keep in root
    ];
  }

  async organizeProject() {
    console.log("📁 Starting intelligent project organization...");
    console.log(`🏠 Project root: ${this.projectRoot}`);

    try {
      // Create new directory structure
      await this.createDirectories();

      // Analyze and categorize existing scripts
      const categorization = await this.analyzeScripts();

      // Move scripts to appropriate locations
      await this.moveScripts(categorization);

      // Update package.json scripts
      await this.updatePackageJsonScripts();

      // Create index files for each category
      await this.createIndexFiles();

      // Create category documentation
      await this.createCategoryDocumentation();

      console.log("✅ Project organization complete");
      return this.generateOrganizationReport(categorization);
    } catch (error: unknown) {
      console.error(
        "❌ Project organization failed:",
        (error as Error).message,
      );
      throw error;
    }
  }

  async createDirectories() {
    console.log("📂 Creating organized directory structure...");

    for (const [mainDir, subdirs] of Object.entries(this.targetStructure)) {
      // Create main directory
      await fs.mkdir(mainDir, { recursive: true });
      console.log(`  📁 Created: ${mainDir}`);

      // Create subdirectories
      for (const [subdir, config] of Object.entries(subdirs)) {
        const fullPath = path.join(mainDir, subdir);
        await fs.mkdir(fullPath, { recursive: true });
        console.log(
          `    📁 Created: ${fullPath} - ${(config as CategoryConfig).description}`,
        );
      }
    }
  }

  async analyzeScripts(): Promise<Categorization> {
    console.log("🔍 Analyzing existing scripts for categorization...");

    const scriptsDir = "./scripts";
    const categorization = {
      automation: [],
      content: [],
      testing: [],
      development: [],
      uncategorized: [],
      ignored: [],
    };

    try {
      const files = await fs.readdir(scriptsDir);
      const jsFiles = files.filter((file) => file.endsWith(".js"));

      console.log(`📊 Found ${jsFiles.length} JavaScript files to categorize`);

      for (const file of jsFiles) {
        // Skip ignored files
        if (this.scriptsToIgnore.includes(file)) {
          categorization.ignored.push(file);
          console.log(`  ⏭️  Ignored: ${file} (staying in root)`);
          continue;
        }

        // Skip duplicate files (will be handled by script analyzer)
        if (file.startsWith("scripts-")) {
          console.log(
            `  🔄 Skipped: ${file} (duplicate - run script analyzer first)`,
          );
          continue;
        }

        const category = this.determineCategory(file);
        categorization[category].push(file);
        console.log(`  📦 ${file} → ${category}`);
      }

      return categorization;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.log(
          "  📁 No scripts directory found - will organize existing files",
        );
        return categorization;
      }
      throw error;
    }
  }

  determineCategory(filename: string) {
    const lowercaseFilename = filename.toLowerCase();

    // Check each category's keywords
    for (const [category, keywords] of Object.entries(this.categoryRules)) {
      for (const keyword of keywords) {
        if (lowercaseFilename.includes(keyword)) {
          return category;
        }
      }
    }

    return "uncategorized";
  }

  async moveScripts(categorization: Categorization) {
    console.log("🚚 Moving scripts to organized locations...");

    const scriptsDir = "./scripts";

    for (const [category, files] of Object.entries(categorization)) {
      if (
        category === "ignored" ||
        category === "uncategorized" ||
        files.length === 0
      ) {
        continue;
      }

      const targetDir = `tools/${category}`;

      for (const file of files) {
        const oldPath = path.join(scriptsDir, file);
        const newPath = path.join(targetDir, file);

        try {
          // Check if source file exists
          await fs.access(oldPath);

          // Move the file
          await fs.rename(oldPath, newPath);
          console.log(`  ✅ Moved: ${file} → ${targetDir}/`);

          // Update target structure tracking
          this.targetStructure["tools/"][`${category}/`].files.push(file);
        } catch (error: unknown) {
          console.warn(
            `  ⚠️  Could not move ${file}: ${(error as Error).message}`,
          );
        }
      }
    }

    // Handle uncategorized files
    if (categorization.uncategorized.length > 0) {
      console.log(
        `\n📋 ${categorization.uncategorized.length} uncategorized files:`,
      );
      for (const file of categorization.uncategorized) {
        console.log(`  ❓ ${file} - needs manual review`);
      }
    }
  }

  async updatePackageJsonScripts() {
    console.log("📝 Updating package.json scripts...");

    const packageJsonPath = "./package.json";

    try {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf-8"),
      );

      // Add new organized scripts
      const newScripts = {
        // Environment & Setup (pnpm-first)
        "env:setup": "node tools/automation/environmentManager.js",
        "env:validate":
          "node tools/automation/environmentManager.js --validate",
        "env:backup": "node tools/automation/environmentManager.js --backup",
        "env:list-backups":
          "node tools/automation/environmentManager.js --list-backups",

        // Project Management
        "project:analyze": "node tools/automation/scriptAnalyzer.js",
        "project:cleanup": "node tools/automation/scriptAnalyzer.js --execute",
        "project:organize": "node tools/automation/projectOrganizer.js",
        "project:health": "node tools/development/healthMonitor.js",

        // Testing (Enhanced & Adaptive)
        "test:smart": "node tools/testing/adaptiveTestRunner.js",
        "test:providers": "node tools/testing/providerValidator.js",
        "test:performance": "node tools/testing/performanceMonitor.js",
        "test:ci": "pnpm run test:smart && pnpm run test:coverage",

        // Content Generation
        "content:screenshots": "node tools/content/screenshot-automation.js",
        "content:videos": "node tools/content/video-generator.js",
        "content:cleanup": "node tools/content/videoCleanup.js",
        "content:all":
          "pnpm run content:screenshots && pnpm run content:videos",

        // Documentation
        "docs:sync": "node tools/content/documentationSync.js",
        "docs:validate": "node tools/content/documentationSync.js --validate",
        "docs:generate": "pnpm run docs:sync && pnpm run content:screenshots",

        // Development
        "dev:full": "node tools/development/dev-server.js",
        "dev:health": "node tools/development/healthMonitor.js",
        "dev:demo":
          'concurrently "pnpm run dev" "node neurolink-demo/complete-enhanced-server.js"',

        // Build & Deploy
        "build:complete": "node tools/automation/buildSystem.js",
        "build:analyze": "node tools/development/dependency-analyzer.js",

        // Quality & Maintenance
        "lint:fix": "eslint . --ext .ts,.js,.svelte --fix",
        "format:check": "prettier --check .",
        typecheck: "tsc --noEmit",

        // Utilities
        clean:
          "pnpm run content:cleanup && rm -rf dist .svelte-kit node_modules/.cache",
        reset: "pnpm run clean && pnpm install",
        audit: "pnpm audit && pnpm run build:analyze",
      };

      // Merge with existing scripts (preserve existing ones)
      packageJson.scripts = { ...packageJson.scripts, ...newScripts };

      // Add pnpm configuration if not present
      if (!packageJson.pnpm) {
        packageJson.pnpm = {
          peerDependencyRules: {
            ignoreMissing: ["@types/node"],
          },
          overrides: {
            semver: "^7.5.4",
          },
        };
      }

      // Write updated package.json
      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + "\n",
      );
      console.log("✅ Updated package.json with organized scripts");

      return Object.keys(newScripts).length;
    } catch (error: unknown) {
      console.error(
        "❌ Failed to update package.json:",
        (error as Error).message,
      );
      throw error;
    }
  }

  async createIndexFiles() {
    console.log("📄 Creating index files for each category...");

    const indexTemplates = {
      automation: {
        content: `/**
 * NeuroLink Automation Tools
 *
 * Tools for build automation, deployment, environment management,
 * and project organization.
 */

export { ScriptAnalyzer } from './scriptAnalyzer.js';
export { EnvironmentManager } from './environmentManager.js';
export { ProjectOrganizer } from './projectOrganizer.js';

// Additional automation tools (implement as needed)
// export { BuildSystem } from './buildSystem.js';
// export { DeploymentManager } from './deployment-manager.js';
// export { ReleaseAutomation } from './release-automation.js';
`,
        readme: `# Automation Tools

This directory contains automation scripts for project management, build processes, and environment setup.

## Available Tools

- **scriptAnalyzer.js** - Analyzes and cleans up duplicate scripts
- **environmentManager.js** - Safe .env file management with backup
- **projectOrganizer.js** - Intelligent project structure organization

## Usage

\`\`\`bash
# Analyze and cleanup scripts
pnpm run project:analyze
pnpm run project:cleanup

# Environment management
pnpm run env:setup
pnpm run env:validate

# Project organization
pnpm run project:organize
\`\`\`
`,
      },

      content: {
        content: `/**
 * NeuroLink Content Generation Tools
 *
 * Tools for generating screenshots, videos, documentation,
 * and other visual content for the project.
 */

// Content generation tools (implement as needed)
// export { ScreenshotAutomation } from './screenshot-automation.js';
// export { VideoGenerator } from './video-generator.js';
// export { DocumentationSync } from './documentationSync.js';
// export { VideoCleanup } from './videoCleanup.js';
`,
        readme: `# Content Generation Tools

This directory contains tools for generating visual content, documentation, and media files.

## Available Tools

Tools will be migrated here from the scripts directory and enhanced with modern JavaScript.

## Planned Features

- **Screenshot Automation** - Automated CLI and demo screenshots
- **Video Generation** - Create demo videos and recordings
- **Documentation Sync** - Keep documentation synchronized
- **Content Cleanup** - Manage and organize generated content

## Usage

\`\`\`bash
# Generate all content
pnpm run content:all

# Individual content types
pnpm run content:screenshots
pnpm run content:videos
pnpm run content:cleanup
\`\`\`
`,
      },

      testing: {
        content: `/**
 * NeuroLink Testing Tools
 *
 * Advanced testing utilities, provider validation,
 * and performance monitoring tools.
 */

// Testing tools (implement as needed)
// export { AdaptiveTestRunner } from './adaptiveTestRunner.js';
// export { ProviderValidator } from './providerValidator.js';
// export { PerformanceMonitor } from './performanceMonitor.js';
`,
        readme: `# Testing Tools

This directory contains advanced testing tools for adaptive test execution, provider validation, and performance monitoring.

## Planned Features

- **Adaptive Test Runner** - Smart test execution based on available providers
- **Provider Validator** - Validate AI provider configurations
- **Performance Monitor** - Monitor and benchmark performance
- **Integration Testing** - Advanced integration test utilities

## Usage

\`\`\`bash
# Smart testing
pnpm run test:smart

# Provider validation
pnpm run test:providers

# Performance monitoring
pnpm run test:performance
\`\`\`
`,
      },

      development: {
        content: `/**
 * NeuroLink Development Tools
 *
 * Development utilities, debugging tools, health monitoring,
 * and dependency analysis.
 */

// Development tools (implement as needed)
// export { DevServer } from './dev-server.js';
// export { HealthMonitor } from './healthMonitor.js';
// export { DependencyAnalyzer } from './dependency-analyzer.js';
`,
        readme: `# Development Tools

This directory contains development utilities, debugging tools, and project health monitoring.

## Planned Features

- **Dev Server** - Enhanced development server with multiple environments
- **Health Monitor** - Project health and dependency monitoring
- **Dependency Analyzer** - Analyze and optimize project dependencies
- **Debug Utilities** - Advanced debugging and troubleshooting tools

## Usage

\`\`\`bash
# Development server
pnpm run dev:full

# Health monitoring
pnpm run dev:health

# Dependency analysis
pnpm run build:analyze
\`\`\`
`,
      },
    };

    for (const [category, templates] of Object.entries(indexTemplates)) {
      const categoryDir = `tools/${category}`;

      // Create index.js
      const indexPath = path.join(categoryDir, "index.js");
      await fs.writeFile(indexPath, templates.content);
      console.log(`  📄 Created: ${indexPath}`);

      // Create README.md
      const readmePath = path.join(categoryDir, "README.md");
      await fs.writeFile(readmePath, templates.readme);
      console.log(`  📄 Created: ${readmePath}`);
    }
  }

  async createCategoryDocumentation() {
    console.log("📚 Creating category documentation...");

    const toolsReadme = `# NeuroLink Tools Directory

This directory contains organized automation tools following modern TypeScript/JavaScript patterns.

## Directory Structure

\`\`\`
tools/
├── automation/     # Build, deployment, environment management
├── content/        # Screenshots, videos, documentation generation
├── testing/        # Advanced testing and validation
└── development/    # Development utilities and monitoring
\`\`\`

## Quick Start

\`\`\`bash
# Complete project setup
pnpm run env:setup
pnpm run project:organize
pnpm run test:smart

# Content generation
pnpm run content:all

# Development
pnpm run dev:full
\`\`\`

## Tool Categories

### 🔧 Automation Tools
- Script analysis and cleanup
- Environment management with backup
- Project organization
- Build and deployment automation

### 🎨 Content Tools
- Screenshot generation
- Video creation and conversion
- Documentation synchronization
- Content cleanup and organization

### 🧪 Testing Tools
- Adaptive test execution
- Provider validation
- Performance monitoring
- Integration testing

### 💻 Development Tools
- Enhanced development servers
- Health monitoring
- Dependency analysis
- Debugging utilities

## Philosophy

- **pnpm-first**: All automation uses pnpm for consistency
- **JavaScript over Shell**: Cross-platform Node.js scripts
- **Safe Operations**: Backup before modify, validate configurations
- **Intelligent Automation**: Adaptive behavior based on environment
- **Developer Experience**: One-command setup and operation
`;

    await fs.writeFile("tools/README.md", toolsReadme);
    console.log("  📚 Created: tools/README.md");
  }

  generateOrganizationReport(
    categorization: Categorization,
  ): OrganizationReport {
    const report: OrganizationReport = {
      summary: {
        totalFilesProcessed: 0,
        filesMoved: 0,
        filesIgnored: categorization.ignored.length,
        filesUncategorized: categorization.uncategorized.length,
        categoriesCreated: Object.keys(this.targetStructure["tools/"]).length,
      },
      categories: {},
      recommendations: [],
    };

    // Count files processed and moved
    for (const [category, files] of Object.entries(categorization)) {
      if (category === "ignored" || category === "uncategorized") {
        report.summary.totalFilesProcessed += files.length;
      } else {
        report.summary.totalFilesProcessed += files.length;
        report.summary.filesMoved += files.length;
        report.categories[category] = {
          files: files,
          count: files.length,
        };
      }
    }

    // Generate recommendations
    if (categorization.uncategorized.length > 0) {
      report.recommendations.push(
        `Review ${categorization.uncategorized.length} uncategorized files manually`,
      );
    }

    if (report.summary.filesMoved === 0) {
      report.recommendations.push(
        "Run script analyzer first to clean up duplicates",
      );
    }

    report.recommendations.push(
      "Update imports in files that reference moved scripts",
    );
    report.recommendations.push("Test all pnpm scripts after organization");

    return report;
  }

  printOrganizationReport(report: OrganizationReport) {
    console.log("\n📊 PROJECT ORGANIZATION REPORT");
    console.log("=".repeat(50));
    console.log(
      `📁 Total files processed: ${report.summary.totalFilesProcessed}`,
    );
    console.log(`🚚 Files moved: ${report.summary.filesMoved}`);
    console.log(`⏭️  Files ignored: ${report.summary.filesIgnored}`);
    console.log(`❓ Files uncategorized: ${report.summary.filesUncategorized}`);
    console.log(`📂 Categories created: ${report.summary.categoriesCreated}`);

    if (Object.keys(report.categories).length > 0) {
      console.log("\n📦 FILES BY CATEGORY:");
      for (const [category, data] of Object.entries(report.categories)) {
        console.log(`  ${category}: ${data.count} files`);
        data.files.forEach((file) => console.log(`    - ${file}`));
      }
    }

    if (report.recommendations.length > 0) {
      console.log("\n💡 RECOMMENDATIONS:");
      report.recommendations.forEach((rec) => console.log(`  💡 ${rec}`));
    }

    console.log("\n🎉 Project organization complete!");
    console.log("Next steps:");
    console.log("  1. Test organized scripts: pnpm run project:health");
    console.log("  2. Update any imports in other files");
    console.log("  3. Run full test suite: pnpm run test:smart");
  }
}

// Export for use as module
export { ProjectOrganizer };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const organizer = new ProjectOrganizer();

  try {
    const report = await organizer.organizeProject();
    organizer.printOrganizationReport(report);
  } catch (error: unknown) {
    console.error("❌ Project organization failed:", (error as Error).message);
    process.exit(1);
  }
}

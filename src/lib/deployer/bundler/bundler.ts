/**
 * NeuroLink Bundler - Creates optimized bundles for deployment
 *
 * Build pipeline:
 * 1. Entry Discovery - Find main, tools, config, routes
 * 2. Tool Aggregation - Collect and export tools
 * 3. Dependency Analysis - Determine bundle vs external
 * 4. Output Generation - Write to output directory
 *
 * @packageDocumentation
 * @module @juspay/neurolink/deployer
 * @category Deployment
 */

import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";
import { EntryDiscovery } from "./entryDiscovery.js";
import { ToolAggregator } from "./toolAggregator.js";
import { DependencyAnalyzer } from "./dependencyAnalyzer.js";
import type {
  DeployConfig,
  BuildConfig,
  BuildOutput,
  OutputFile,
  DiscoveredEntries,
  AggregatedTools,
  DependencyAnalysis,
} from "../types.js";

/**
 * Bundler options
 */
export type BundlerOptions = {
  /** Entry file path */
  entry: string;

  /** Output directory */
  outDir: string;

  /** Build configuration */
  buildConfig?: BuildConfig;
};

/**
 * NeuroLink Bundler - Creates optimized bundles for deployment
 *
 * @example
 * ```typescript
 * const bundler = new Bundler({
 *   entry: './src/neurolink/index.ts',
 *   outDir: '.neurolink/output'
 * });
 * const output = await bundler.build();
 *
 * console.log('Build complete:', output.outputDir);
 * console.log('Files:', output.files.length);
 * ```
 */
export class Bundler {
  private entry: string;
  private outDir: string;
  private buildConfig: BuildConfig;

  // Sub-components
  private entryDiscovery: EntryDiscovery;
  private toolAggregator: ToolAggregator;
  private dependencyAnalyzer: DependencyAnalyzer;

  constructor(options: BundlerOptions) {
    this.entry = options.entry;
    this.outDir = options.outDir;
    this.buildConfig = options.buildConfig || {};

    // Initialize sub-components
    const rootDir = path.dirname(this.entry);
    this.entryDiscovery = new EntryDiscovery(rootDir);
    this.toolAggregator = new ToolAggregator(this.outDir);
    this.dependencyAnalyzer = new DependencyAnalyzer(this.buildConfig);
  }

  /**
   * Execute the full build pipeline
   */
  async build(): Promise<BuildOutput> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const files: OutputFile[] = [];

    logger.info("Starting NeuroLink build...");

    try {
      // Step 1: Entry Discovery
      logger.info("Step 1/5: Discovering entries...");
      const entries = await this.entryDiscovery.discover();

      if (!entries.main) {
        warnings.push(
          `No main entry file found in ${path.dirname(this.entry)}. ` +
          "Using default server generation."
        );
      }

      // Step 2: Tool Aggregation
      logger.info("Step 2/5: Aggregating tools...");
      const aggregatedTools = await this.toolAggregator.aggregate(entries.tools);

      // Step 3: Dependency Analysis
      logger.info("Step 3/5: Analyzing dependencies...");
      const dependencyAnalysis = await this.dependencyAnalyzer.analyze();

      // Step 4: Prepare output directory
      logger.info("Step 4/5: Preparing output directory...");
      await this.prepareOutputDir();

      // Step 5: Write output files
      logger.info("Step 5/5: Writing output files...");

      // Write main entry (copy or transform)
      if (entries.main) {
        const mainFile = await this.writeMainEntry(entries.main);
        files.push(mainFile);
      }

      // Write tools export
      if (aggregatedTools.tools.length > 0) {
        const toolsFile = await this.writeToolsExport(aggregatedTools);
        files.push(toolsFile);
      }

      // Write package.json
      const packageJsonFile = await this.writePackageJson(dependencyAnalysis);
      files.push(packageJsonFile);

      // Write env template
      const envFile = await this.writeEnvTemplate();
      files.push(envFile);

      const duration = Date.now() - startTime;

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.outDir, "package.json"), "utf-8")
      );

      const output: BuildOutput = {
        outputDir: this.outDir,
        files,
        packageJson,
        duration,
        warnings,
      };

      logger.info(`Build complete in ${duration}ms`, {
        files: files.length,
        outputDir: this.outDir,
        warnings: warnings.length,
      });

      return output;
    } catch (error) {
      logger.error("Build failed:", error);
      throw error;
    }
  }

  /**
   * Prepare output directory
   */
  private async prepareOutputDir(): Promise<void> {
    // Clean existing output
    if (fs.existsSync(this.outDir)) {
      fs.rmSync(this.outDir, { recursive: true });
    }

    // Create output directories
    fs.mkdirSync(this.outDir, { recursive: true });
    fs.mkdirSync(path.join(this.outDir, "public"), { recursive: true });
  }

  /**
   * Write main entry file
   */
  private async writeMainEntry(entry: { path: string }): Promise<OutputFile> {
    const content = fs.readFileSync(entry.path, "utf-8");
    const outputPath = path.join(this.outDir, "index.mjs");

    // For now, simple copy (in production, would transform TypeScript)
    fs.writeFileSync(outputPath, content);

    return {
      path: "index.mjs",
      size: Buffer.byteLength(content),
      type: "js",
    };
  }

  /**
   * Write tools export file
   */
  private async writeToolsExport(tools: AggregatedTools): Promise<OutputFile> {
    const outputPath = path.join(this.outDir, "tools.mjs");
    fs.writeFileSync(outputPath, tools.exportContent);

    return {
      path: "tools.mjs",
      size: Buffer.byteLength(tools.exportContent),
      type: "js",
    };
  }

  /**
   * Write package.json
   */
  private async writePackageJson(deps: DependencyAnalysis): Promise<OutputFile> {
    const packageJson = this.generatePackageJson(deps);
    const content = JSON.stringify(packageJson, null, 2);
    const outputPath = path.join(this.outDir, "package.json");

    fs.writeFileSync(outputPath, content);

    return {
      path: "package.json",
      size: Buffer.byteLength(content),
      type: "json",
    };
  }

  /**
   * Generate package.json content
   */
  private generatePackageJson(deps: DependencyAnalysis): Record<string, unknown> {
    const dependencies: Record<string, string> = {};

    for (const dep of deps.external) {
      dependencies[dep.name] = dep.version;
    }

    // Add runtime dependencies
    dependencies["hono"] = "^4.0.0";
    dependencies["@hono/node-server"] = "^1.0.0";
    dependencies["@juspay/neurolink"] = "^8.0.0";

    return {
      name: "neurolink-server",
      version: "1.0.0",
      type: "module",
      main: "index.mjs",
      scripts: {
        start: "node index.mjs",
        dev: "node --watch index.mjs",
      },
      dependencies,
      engines: {
        node: ">=20.0.0",
      },
    };
  }

  /**
   * Write environment template
   */
  private async writeEnvTemplate(): Promise<OutputFile> {
    const template = `# NeuroLink Server Environment Variables
# Copy this file to .env and fill in your values

# Server Configuration
PORT=8080
NODE_ENV=production

# AI Provider API Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# Optional: NeuroLink Configuration
NEUROLINK_DEFAULT_PROVIDER=openai
NEUROLINK_LOG_LEVEL=info
`;

    const outputPath = path.join(this.outDir, ".env.example");
    fs.writeFileSync(outputPath, template);

    return {
      path: ".env.example",
      size: Buffer.byteLength(template),
      type: "json",
    };
  }

  /**
   * Get output directory
   */
  getOutputDir(): string {
    return this.outDir;
  }

  /**
   * Get entry discovery instance
   */
  getEntryDiscovery(): EntryDiscovery {
    return this.entryDiscovery;
  }

  /**
   * Get tool aggregator instance
   */
  getToolAggregator(): ToolAggregator {
    return this.toolAggregator;
  }

  /**
   * Get dependency analyzer instance
   */
  getDependencyAnalyzer(): DependencyAnalyzer {
    return this.dependencyAnalyzer;
  }
}

export default Bundler;

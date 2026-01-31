/**
 * ESBuild Bundler
 *
 * Ultra-fast JavaScript/TypeScript bundler implementation.
 * Uses esbuild for extremely fast builds.
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";
import { BundlerError } from "../DeploymentErrors.js";
import type {
  BuildConfig,
  BuildOutput,
  BundlerType,
  BundleSizeInfo,
  DiscoveredEntries,
  ESBuildOptions,
  IBundler,
  OutputFile,
} from "../types/deploymentTypes.js";

/**
 * ESBuild Bundler Implementation
 *
 * Provides high-performance bundling using esbuild.
 *
 * @example
 * ```typescript
 * const bundler = new ESBuildBundler();
 * const output = await bundler.bundle(config, entries);
 * ```
 */
export class ESBuildBundler implements IBundler {
  readonly name: BundlerType = "esbuild";

  private esbuild: typeof import("esbuild") | null = null;

  /**
   * Lazy load esbuild
   */
  private async getEsbuild() {
    if (!this.esbuild) {
      try {
        this.esbuild = await import("esbuild");
      } catch (error) {
        throw new BundlerError("ESBuild is not installed. Please install it with: npm install esbuild", "esbuild", {
          cause: error as Error,
        });
      }
    }
    return this.esbuild;
  }

  /**
   * Bundle the application
   */
  async bundle(config: BuildConfig, entries: DiscoveredEntries): Promise<BuildOutput> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    logger.info("Starting ESBuild bundling...");

    const esbuild = await this.getEsbuild();

    // Determine entry points
    const entryPoints = this.getEntryPoints(entries);
    if (entryPoints.length === 0) {
      throw new BundlerError("No entry points found", "esbuild");
    }

    // Create output directory
    const outDir = path.resolve(process.cwd(), ".neurolink", "output");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Get esbuild options
    const esbuildOptions = this.getEsbuildOptions(config, entryPoints, outDir);

    try {
      // Run esbuild
      const result = await esbuild.build(esbuildOptions);

      // Collect warnings
      for (const warning of result.warnings) {
        const msg = `${warning.location?.file || ""}:${warning.location?.line || ""}: ${warning.text}`;
        warnings.push(msg);
        logger.warn(`ESBuild warning: ${msg}`);
      }

      // Collect errors
      for (const error of result.errors) {
        const msg = `${error.location?.file || ""}:${error.location?.line || ""}: ${error.text}`;
        errors.push(msg);
        logger.error(`ESBuild error: ${msg}`);
      }

      // Gather output files
      const outputFiles = this.collectOutputFiles(outDir);

      // Generate package.json for output
      const packageJson = this.generatePackageJson(config, entries);
      fs.writeFileSync(path.join(outDir, "package.json"), JSON.stringify(packageJson, null, 2));

      // Calculate bundle sizes
      const bundleSize = this.calculateBundleSize(outputFiles);

      const duration = Date.now() - startTime;
      logger.info(`ESBuild bundling complete in ${duration}ms`);

      return {
        outputDir: outDir,
        files: outputFiles,
        packageJson,
        duration,
        warnings,
        errors: errors.length > 0 ? errors : undefined,
        bundleSize,
      };
    } catch (error) {
      throw new BundlerError(`ESBuild bundling failed: ${(error as Error).message}`, "esbuild", {
        cause: error as Error,
      });
    }
  }

  /**
   * Watch mode for development
   */
  async watch(
    config: BuildConfig,
    entries: DiscoveredEntries,
    onChange: (output: BuildOutput) => void,
  ): Promise<{ close: () => void }> {
    const esbuild = await this.getEsbuild();

    const entryPoints = this.getEntryPoints(entries);
    const outDir = path.resolve(process.cwd(), ".neurolink", "output");

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const esbuildOptions = this.getEsbuildOptions(config, entryPoints, outDir);

    const ctx = await esbuild.context({
      ...esbuildOptions,
      plugins: [
        ...(esbuildOptions.plugins || []),
        {
          name: "neurolink-watch",
          setup(build) {
            build.onEnd(async (result) => {
              const outputFiles = fs.readdirSync(outDir).map((file) => {
                const filePath = path.join(outDir, file);
                const stats = fs.statSync(filePath);
                return {
                  path: file,
                  size: stats.size,
                  type: ESBuildBundler.getFileType(file),
                } as OutputFile;
              });

              const output: BuildOutput = {
                outputDir: outDir,
                files: outputFiles,
                packageJson: {},
                duration: 0,
                warnings: result.warnings.map((w) => w.text),
                bundleSize: {
                  total: outputFiles.reduce((sum, f) => sum + f.size, 0),
                  gzipped: 0,
                  byType: {},
                },
              };

              onChange(output);
            });
          },
        },
      ],
    });

    await ctx.watch();

    logger.info("ESBuild watching for changes...");

    return {
      close: async () => {
        await ctx.dispose();
        logger.info("ESBuild watch stopped");
      },
    };
  }

  /**
   * Estimate bundle size
   */
  async estimateSize(entries: DiscoveredEntries): Promise<BundleSizeInfo> {
    const esbuild = await this.getEsbuild();

    const entryPoints = this.getEntryPoints(entries);

    try {
      const result = await esbuild.build({
        entryPoints,
        bundle: true,
        write: false,
        minify: true,
        format: "esm",
        platform: "node",
        metafile: true,
      });

      let total = 0;
      const byType: Record<string, number> = {};

      if (result.outputFiles) {
        for (const file of result.outputFiles) {
          total += file.contents.length;
          const ext = path.extname(file.path) || ".js";
          byType[ext] = (byType[ext] || 0) + file.contents.length;
        }
      }

      // Rough gzip estimate (typically 30-40% of original)
      const gzipped = Math.round(total * 0.35);

      return { total, gzipped, byType };
    } catch (error) {
      logger.warn(`Could not estimate bundle size: ${(error as Error).message}`);
      return { total: 0, gzipped: 0, byType: {} };
    }
  }

  /**
   * Get entry points from discovered entries
   */
  private getEntryPoints(entries: DiscoveredEntries): string[] {
    const points: string[] = [];

    if (entries.main) {
      points.push(entries.main.path);
    }

    for (const tool of entries.tools) {
      points.push(tool.path);
    }

    for (const route of entries.routes) {
      points.push(route.path);
    }

    return points;
  }

  /**
   * Get esbuild options from build config
   */
  private getEsbuildOptions(
    config: BuildConfig,
    entryPoints: string[],
    outDir: string,
  ): import("esbuild").BuildOptions {
    const esbuildConfig = config.bundlerOptions as ESBuildOptions | undefined;

    return {
      entryPoints,
      outdir: outDir,
      bundle: true,
      format: esbuildConfig?.format || "esm",
      platform: this.getPlatform(config.target),
      target: esbuildConfig?.target || this.getTarget(config.target),
      minify: config.minify ?? false,
      sourcemap: config.sourceMaps ?? true,
      treeShaking: config.treeShake ?? true,
      splitting: esbuildConfig?.splitting ?? false,
      external: config.external || [],
      define: esbuildConfig?.define || {},
      loader: (esbuildConfig?.loader || {}) as Record<string, import("esbuild").Loader>,
      inject: esbuildConfig?.inject || [],
      metafile: true,
      outExtension: { ".js": ".mjs" },
      banner: {
        js: "// Generated by NeuroLink Deployment System",
      },
    };
  }

  /**
   * Get esbuild platform from target
   */
  private getPlatform(target?: string): "node" | "browser" | "neutral" {
    switch (target) {
      case "browser":
        return "browser";
      case "node":
        return "node";
      case "edge":
      case "worker":
        return "neutral";
      default:
        return "node";
    }
  }

  /**
   * Get esbuild target from config target
   */
  private getTarget(target?: string): string {
    switch (target) {
      case "browser":
        return "es2020";
      case "edge":
      case "worker":
        return "es2022";
      case "node":
      default:
        return "node18";
    }
  }

  /**
   * Collect output files from directory
   */
  private collectOutputFiles(outDir: string): OutputFile[] {
    const files: OutputFile[] = [];

    const collectRecursively = (dir: string, base: string = "") => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(base, entry.name);

        if (entry.isDirectory()) {
          collectRecursively(fullPath, relativePath);
        } else {
          const stats = fs.statSync(fullPath);
          files.push({
            path: relativePath,
            size: stats.size,
            type: ESBuildBundler.getFileType(entry.name),
            sourceMap: entry.name.endsWith(".mjs") ? `${relativePath}.map` : undefined,
          });
        }
      }
    };

    collectRecursively(outDir);
    return files;
  }

  /**
   * Get file type from filename
   */
  private static getFileType(filename: string): OutputFile["type"] {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case ".js":
      case ".mjs":
      case ".cjs":
        return "js";
      case ".ts":
      case ".mts":
      case ".cts":
        return "ts";
      case ".d.ts":
        return "dts";
      case ".json":
        return "json";
      case ".html":
        return "html";
      case ".css":
        return "css";
      case ".map":
        return "map";
      default:
        return "other";
    }
  }

  /**
   * Calculate bundle size information
   */
  private calculateBundleSize(files: OutputFile[]): BundleSizeInfo {
    const byType: Record<string, number> = {};
    let total = 0;

    for (const file of files) {
      total += file.size;
      const type = file.type;
      byType[type] = (byType[type] || 0) + file.size;
    }

    // Rough gzip estimate
    const gzipped = Math.round(total * 0.35);

    return { total, gzipped, byType };
  }

  /**
   * Generate package.json for output
   */
  private generatePackageJson(config: BuildConfig, entries: DiscoveredEntries): Record<string, unknown> {
    const mainEntry = entries.main ? path.basename(entries.main.path).replace(/\.ts$/, ".mjs") : "index.mjs";

    return {
      name: "neurolink-deployment",
      version: "1.0.0",
      type: "module",
      main: mainEntry,
      exports: {
        ".": `./${mainEntry}`,
      },
      engines: {
        node: ">=18.0.0",
      },
      dependencies: {},
      // Note: Dependencies will be populated by the deployer based on dependency analysis
    };
  }
}

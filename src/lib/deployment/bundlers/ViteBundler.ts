/**
 * Vite Bundler
 *
 * Next-generation frontend build tool implementation.
 * Uses Vite for modern builds with excellent HMR support.
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
  IBundler,
  OutputFile,
  ViteOptions,
} from "../types/deploymentTypes.js";

/**
 * Vite Bundler Implementation
 *
 * Provides modern bundling using Vite with Rollup.
 *
 * @example
 * ```typescript
 * const bundler = new ViteBundler();
 * const output = await bundler.bundle(config, entries);
 * ```
 */
export class ViteBundler implements IBundler {
  readonly name: BundlerType = "vite";

  private vite: typeof import("vite") | null = null;

  /**
   * Lazy load vite
   */
  private async getVite() {
    if (!this.vite) {
      try {
        this.vite = await import("vite");
      } catch (error) {
        throw new BundlerError("Vite is not installed. Please install it with: npm install vite", "vite", {
          cause: error as Error,
        });
      }
    }
    return this.vite;
  }

  /**
   * Bundle the application
   */
  async bundle(config: BuildConfig, entries: DiscoveredEntries): Promise<BuildOutput> {
    const startTime = Date.now();
    const warnings: string[] = [];

    logger.info("Starting Vite bundling...");

    const vite = await this.getVite();

    // Determine entry points
    const entryPoints = this.getEntryPoints(entries);
    if (Object.keys(entryPoints).length === 0) {
      throw new BundlerError("No entry points found", "vite");
    }

    // Create output directory
    const outDir = path.resolve(process.cwd(), ".neurolink", "output");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Get vite config
    const viteConfig = this.getViteConfig(config, entryPoints, outDir);

    try {
      // Run vite build
      const result = await vite.build(viteConfig);

      // Handle build output
      const output = Array.isArray(result) ? result[0] : result;

      // Gather output files
      const outputFiles = this.collectOutputFiles(outDir);

      // Generate package.json for output
      const packageJson = this.generatePackageJson(config, entries);
      fs.writeFileSync(path.join(outDir, "package.json"), JSON.stringify(packageJson, null, 2));

      // Calculate bundle sizes
      const bundleSize = this.calculateBundleSize(outputFiles);

      const duration = Date.now() - startTime;
      logger.info(`Vite bundling complete in ${duration}ms`);

      return {
        outputDir: outDir,
        files: outputFiles,
        packageJson,
        duration,
        warnings,
        bundleSize,
      };
    } catch (error) {
      throw new BundlerError(`Vite bundling failed: ${(error as Error).message}`, "vite", { cause: error as Error });
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
    const vite = await this.getVite();

    const entryPoints = this.getEntryPoints(entries);
    const outDir = path.resolve(process.cwd(), ".neurolink", "output");

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const viteConfig = this.getViteConfig(config, entryPoints, outDir);

    // Create dev server for watch mode
    const server = await vite.createServer({
      ...viteConfig,
      server: {
        hmr: true,
      },
    });

    // Setup file watcher
    const watcher = server.watcher;

    watcher.on("change", async () => {
      try {
        // Rebuild on change
        await vite.build({
          ...viteConfig,
          build: {
            ...viteConfig.build,
            watch: null, // Disable watch for individual builds
          },
        });

        const outputFiles = this.collectOutputFiles(outDir);
        const bundleSize = this.calculateBundleSize(outputFiles);

        onChange({
          outputDir: outDir,
          files: outputFiles,
          packageJson: {},
          duration: 0,
          warnings: [],
          bundleSize,
        });
      } catch (error) {
        logger.error(`Rebuild failed: ${(error as Error).message}`);
      }
    });

    logger.info("Vite watching for changes...");

    return {
      close: async () => {
        await server.close();
        logger.info("Vite watch stopped");
      },
    };
  }

  /**
   * Estimate bundle size
   */
  async estimateSize(entries: DiscoveredEntries): Promise<BundleSizeInfo> {
    const vite = await this.getVite();

    const entryPoints = this.getEntryPoints(entries);
    const outDir = path.resolve(process.cwd(), ".neurolink", "estimate");

    try {
      // Quick build for estimation
      await vite.build({
        root: process.cwd(),
        build: {
          outDir,
          lib: {
            entry: entryPoints,
            formats: ["es"],
          },
          minify: true,
          sourcemap: false,
          emptyOutDir: true,
        },
        logLevel: "silent",
      });

      const files = this.collectOutputFiles(outDir);
      const bundleSize = this.calculateBundleSize(files);

      // Cleanup
      fs.rmSync(outDir, { recursive: true, force: true });

      return bundleSize;
    } catch (error) {
      logger.warn(`Could not estimate bundle size: ${(error as Error).message}`);
      return { total: 0, gzipped: 0, byType: {} };
    }
  }

  /**
   * Get entry points from discovered entries
   */
  private getEntryPoints(entries: DiscoveredEntries): Record<string, string> {
    const points: Record<string, string> = {};

    if (entries.main) {
      points["index"] = entries.main.path;
    }

    for (let i = 0; i < entries.tools.length; i++) {
      const tool = entries.tools[i];
      const name = path.basename(tool.path, path.extname(tool.path));
      points[`tools/${name}`] = tool.path;
    }

    for (let i = 0; i < entries.routes.length; i++) {
      const route = entries.routes[i];
      const name = path.basename(route.path, path.extname(route.path));
      points[`routes/${name}`] = route.path;
    }

    return points;
  }

  /**
   * Get vite config from build config
   */
  private getViteConfig(
    config: BuildConfig,
    entryPoints: Record<string, string>,
    outDir: string,
  ): import("vite").InlineConfig {
    const viteOptions = config.bundlerOptions as ViteOptions | undefined;

    return {
      root: process.cwd(),
      mode: viteOptions?.mode || "production",
      build: {
        outDir,
        lib: {
          entry: entryPoints,
          formats: ["es"],
          fileName: (format, entryName) => `${entryName}.mjs`,
        },
        rollupOptions: {
          external: config.external || [],
          output: {
            banner: "// Generated by NeuroLink Deployment System",
            preserveModules: false,
          },
        },
        minify: config.minify ?? false,
        sourcemap: config.sourceMaps ?? true,
        emptyOutDir: true,
        target: viteOptions?.target || this.getTarget(config.target),
      },
      ssr: viteOptions?.ssr
        ? {
            noExternal: config.noExternal || [],
            external: config.external || [],
          }
        : undefined,
      css: viteOptions?.css as import("vite").CSSOptions | undefined,
      logLevel: "info",
    };
  }

  /**
   * Get vite target from config target
   */
  private getTarget(target?: string): string | string[] {
    switch (target) {
      case "browser":
        return ["es2020", "chrome87", "firefox78", "safari14"];
      case "edge":
      case "worker":
        return "esnext";
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

    if (!fs.existsSync(outDir)) {
      return files;
    }

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
            type: ViteBundler.getFileType(entry.name),
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
    };
  }
}

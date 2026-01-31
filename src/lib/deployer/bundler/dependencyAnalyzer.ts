/**
 * Dependency Analyzer - Determines bundle vs external treatment
 *
 * Optimization approach:
 * - Bundle small, frequently-used dependencies
 * - Externalize large runtime dependencies
 * - Externalize native modules
 * - Externalize provider SDKs (loaded dynamically)
 *
 * @packageDocumentation
 * @module @juspay/neurolink/deployer
 * @category Deployment
 */

import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";
import type { BuildConfig, DependencyInfo, DependencyAnalysis } from "../types.js";

/**
 * Dependency Analyzer - Determines bundle vs external treatment
 *
 * @example
 * ```typescript
 * const analyzer = new DependencyAnalyzer({ minify: true });
 * const analysis = await analyzer.analyze();
 *
 * console.log('Bundle:', analysis.bundled.map(d => d.name));
 * console.log('External:', analysis.external.map(d => d.name));
 * ```
 */
export class DependencyAnalyzer {
  // Dependencies that should always be bundled (small, no native deps)
  private static readonly ALWAYS_BUNDLE = new Set([
    "zod",
    "zod-to-json-schema",
    "nanoid",
    "uuid",
    "chalk",
    "ora",
    "superjson",
    "ms",
    "debug",
    "kleur",
    "picocolors",
    "ansi-styles",
    "supports-color",
    "strip-ansi",
    "ansi-regex",
    "color-convert",
    "has-flag",
  ]);

  // Dependencies that should always be externalized
  private static readonly ALWAYS_EXTERNAL = new Set([
    // Native modules
    "canvas",
    "sharp",
    "sqlite3",
    "better-sqlite3",
    "bcrypt",
    "argon2",

    // Large runtime dependencies
    "puppeteer",
    "playwright",
    "cheerio",
    "jsdom",

    // Provider SDKs (dynamically loaded)
    "@ai-sdk/openai",
    "@ai-sdk/anthropic",
    "@ai-sdk/google",
    "@ai-sdk/google-vertex",
    "@ai-sdk/azure",
    "@ai-sdk/mistral",
    "@ai-sdk/amazon-bedrock",
    "@aws-sdk/client-bedrock",
    "@aws-sdk/client-bedrock-runtime",
    "@aws-sdk/client-sagemaker",
    "@aws-sdk/client-sagemaker-runtime",
    "@google-cloud/vertexai",
    "@huggingface/inference",
    "ollama-ai-provider",
    "@openrouter/ai-sdk-provider",

    // AWS SDK modules
    "@aws-sdk/client-s3",
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/client-sqs",
    "@aws-sdk/client-sns",
    "@aws-sdk/client-lambda",

    // Heavy utilities
    "pdf-to-img",
    "mammoth",
    "exceljs",
    "pdf-parse",
    "pdfjs-dist",

    // Server runtime
    "hono",
    "@hono/node-server",
    "express",
    "fastify",
    "koa",

    // Build tools (should not be bundled)
    "esbuild",
    "rollup",
    "vite",
    "webpack",
    "typescript",
    "ts-node",

    // Testing (should not be bundled)
    "vitest",
    "jest",
    "mocha",
    "chai",

    // Node built-ins
    "fs",
    "path",
    "crypto",
    "http",
    "https",
    "stream",
    "util",
    "events",
    "child_process",
    "os",
    "url",
    "querystring",
    "buffer",
    "net",
    "tls",
    "dns",
    "cluster",
    "zlib",
    "readline",
    "repl",
    "vm",
    "worker_threads",
  ]);

  // Size threshold for auto-externalization (500KB)
  private static readonly SIZE_THRESHOLD = 500 * 1024;

  private buildConfig: BuildConfig;

  constructor(buildConfig: BuildConfig = {}) {
    this.buildConfig = buildConfig;
  }

  /**
   * Analyze project dependencies
   */
  async analyze(): Promise<DependencyAnalysis> {
    const packageJsonPath = path.join(process.cwd(), "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      logger.warn("package.json not found, using defaults");
      return this.getDefaultAnalysis();
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const dependencies = packageJson.dependencies || {};
    const peerDependencies = packageJson.peerDependencies || {};

    const bundled: DependencyInfo[] = [];
    const external: DependencyInfo[] = [];
    const peer: DependencyInfo[] = [];

    // Analyze main dependencies
    for (const [name, version] of Object.entries(dependencies)) {
      const info = await this.analyzeDependency(name, version as string);

      if (info.treatment === "bundle") {
        bundled.push(info);
      } else {
        external.push(info);
      }
    }

    // Process peer dependencies
    for (const [name, version] of Object.entries(peerDependencies)) {
      peer.push({
        name,
        version: version as string,
        treatment: "external",
        reason: "Peer dependency",
      });
    }

    // Apply config overrides
    this.applyConfigOverrides(bundled, external);

    // Calculate estimated bundle size
    const estimatedBundleSize = bundled.reduce(
      (sum, dep) => sum + (dep.size || 0),
      0
    );

    logger.info("Dependency analysis complete", {
      bundled: bundled.length,
      external: external.length,
      peer: peer.length,
      estimatedSize: `${Math.round(estimatedBundleSize / 1024)}KB`,
    });

    return {
      bundled,
      external,
      peer,
      estimatedBundleSize,
    };
  }

  /**
   * Get default analysis when package.json is not available
   */
  private getDefaultAnalysis(): DependencyAnalysis {
    return {
      bundled: [],
      external: Array.from(DependencyAnalyzer.ALWAYS_EXTERNAL).map((name) => ({
        name,
        version: "*",
        treatment: "external" as const,
        reason: "Default external",
      })),
      peer: [],
      estimatedBundleSize: 0,
    };
  }

  /**
   * Analyze a single dependency
   */
  private async analyzeDependency(
    name: string,
    version: string
  ): Promise<DependencyInfo> {
    // Check explicit lists first
    if (DependencyAnalyzer.ALWAYS_BUNDLE.has(name)) {
      return {
        name,
        version,
        treatment: "bundle",
        reason: "Explicitly bundled (small utility)",
        size: await this.estimatePackageSize(name),
      };
    }

    if (DependencyAnalyzer.ALWAYS_EXTERNAL.has(name)) {
      return {
        name,
        version,
        treatment: "external",
        reason: "Explicitly externalized (native/large/provider)",
      };
    }

    // Check if it's a scoped package from known external providers
    if (this.isKnownExternalScope(name)) {
      return {
        name,
        version,
        treatment: "external",
        reason: "Known external scope",
      };
    }

    // Check if it's a native module
    if (await this.hasNativeBindings(name)) {
      return {
        name,
        version,
        treatment: "external",
        reason: "Has native bindings",
      };
    }

    // Check package size
    const size = await this.estimatePackageSize(name);
    if (size > DependencyAnalyzer.SIZE_THRESHOLD) {
      return {
        name,
        version,
        treatment: "external",
        reason: `Large package (${Math.round(size / 1024)}KB)`,
        size,
      };
    }

    // Default: bundle
    return {
      name,
      version,
      treatment: "bundle",
      reason: "Default (small package)",
      size,
    };
  }

  /**
   * Check if package is from a known external scope
   */
  private isKnownExternalScope(name: string): boolean {
    const externalScopes = [
      "@aws-sdk/",
      "@google-cloud/",
      "@azure/",
      "@ai-sdk/",
      "@huggingface/",
      "@prisma/",
      "@tensorflow/",
      "@smithy/",
    ];

    return externalScopes.some((scope) => name.startsWith(scope));
  }

  /**
   * Check if a package has native bindings
   */
  private async hasNativeBindings(packageName: string): Promise<boolean> {
    try {
      const packagePath = this.resolvePackageJson(packageName);
      if (!packagePath) return false;

      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

      return !!(
        packageJson.gypfile ||
        packageJson.binary ||
        packageJson.dependencies?.["node-gyp"] ||
        packageJson.dependencies?.["node-pre-gyp"] ||
        packageJson.dependencies?.["prebuild-install"] ||
        packageJson.dependencies?.["nan"] ||
        packageJson.dependencies?.["node-addon-api"]
      );
    } catch {
      return false;
    }
  }

  /**
   * Resolve package.json path for a package
   */
  private resolvePackageJson(packageName: string): string | null {
    const possiblePaths = [
      path.join(process.cwd(), "node_modules", packageName, "package.json"),
      path.join(process.cwd(), "node_modules", ...packageName.split("/"), "package.json"),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return null;
  }

  /**
   * Estimate package size
   */
  private async estimatePackageSize(packageName: string): Promise<number> {
    try {
      const packagePath = path.join(process.cwd(), "node_modules", packageName);

      if (!fs.existsSync(packagePath)) {
        return 0;
      }

      return this.getDirectorySize(packagePath);
    } catch {
      return 0;
    }
  }

  /**
   * Get directory size recursively
   */
  private getDirectorySize(dirPath: string): number {
    let size = 0;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          if (entry.name !== "node_modules") {
            size += this.getDirectorySize(entryPath);
          }
        } else if (entry.isFile()) {
          try {
            size += fs.statSync(entryPath).size;
          } catch {
            // Ignore permission errors
          }
        }
      }
    } catch {
      // Ignore permission errors
    }

    return size;
  }

  /**
   * Apply config overrides for external/noExternal
   */
  private applyConfigOverrides(
    bundled: DependencyInfo[],
    external: DependencyInfo[]
  ): void {
    const { external: forceExternal = [], noExternal: forceBundle = [] } =
      this.buildConfig;

    // Move from bundled to external
    for (const pkgName of forceExternal) {
      const index = bundled.findIndex((d) => d.name === pkgName);
      if (index >= 0) {
        const dep = bundled.splice(index, 1)[0];
        dep.treatment = "external";
        dep.reason = "Forced external by config";
        external.push(dep);
      }
    }

    // Move from external to bundled
    for (const pkgName of forceBundle) {
      const index = external.findIndex((d) => d.name === pkgName);
      if (index >= 0) {
        const dep = external.splice(index, 1)[0];
        dep.treatment = "bundle";
        dep.reason = "Forced bundle by config";
        bundled.push(dep);
      }
    }
  }

  /**
   * Get external packages list for bundler
   */
  getExternalList(analysis: DependencyAnalysis): (string | RegExp)[] {
    const externals: (string | RegExp)[] = [
      ...analysis.external.map((d) => d.name),
      ...analysis.peer.map((d) => d.name),

      // Node built-in module patterns
      /^node:/,

      // Always externalize these patterns
      /^@aws-sdk\//,
      /^@google-cloud\//,
      /^@azure\//,
      /^@ai-sdk\//,
    ];

    return externals;
  }

  /**
   * Get external packages as a Set for quick lookups
   */
  getExternalSet(analysis: DependencyAnalysis): Set<string> {
    return new Set([
      ...analysis.external.map((d) => d.name),
      ...analysis.peer.map((d) => d.name),
      ...DependencyAnalyzer.ALWAYS_EXTERNAL,
    ]);
  }
}

export default DependencyAnalyzer;

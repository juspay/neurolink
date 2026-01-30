# Deployment System Implementation Guide

## Executive Summary

This document provides a comprehensive implementation plan for adding a Mastra-style deployment system to NeuroLink. The deployment system enables building, bundling, and deploying NeuroLink applications to various cloud platforms including Vercel, Cloudflare Workers, Netlify, and AWS Lambda.

---

## Table of Contents

1. [Current State Analysis](#part-1-current-state-analysis)
2. [Gap Analysis: NeuroLink vs Mastra](#part-2-gap-analysis)
3. [Architecture Design](#part-3-architecture-design)
4. [Build System Implementation](#part-4-build-system-implementation)
5. [Platform Deployers](#part-5-platform-deployers)
6. [Server Generation](#part-6-server-generation)
7. [CLI Integration](#part-7-cli-integration)
8. [Step-by-Step Implementation Guide](#part-8-implementation-guide)
9. [Usage Examples](#part-9-usage-examples)

---

## Part 1: Current State Analysis

### 1.1 NeuroLink Build Architecture Overview

NeuroLink currently uses a **dual build process** for SDK and CLI:

```
Build Process
├── SDK Build (SvelteKit + Vite)
│   ├── vite build
│   ├── svelte-kit sync
│   └── svelte-package → dist/
├── CLI Build (TypeScript)
│   └── tsc --project tsconfig.cli.json → dist/cli/
└── Validation
    └── publint
```

**Key Build Configuration Files:**

| File                | Purpose                             |
| ------------------- | ----------------------------------- |
| `vite.config.ts`    | Vite configuration for SDK build    |
| `svelte.config.js`  | SvelteKit adapter and preprocessing |
| `tsconfig.json`     | Main TypeScript configuration       |
| `tsconfig.cli.json` | CLI-specific TypeScript config      |
| `package.json`      | Build scripts and dependencies      |

### 1.2 Current Build Scripts

```json
{
  "scripts": {
    "build": "vite build && pnpm run prepack",
    "build:cli": "svelte-kit sync && tsc --project tsconfig.cli.json && pnpm link --global",
    "prepack": "svelte-kit sync && svelte-package && pnpm run build:cli && publint",
    "build:complete": "node tools/automation/buildSystem.js"
  }
}
```

### 1.3 Existing Build System (`tools/automation/buildSystem.js`)

NeuroLink has a comprehensive build system with phased execution:

```javascript
class BuildSystem {
  phases = [
    {
      name: "environment",
      title: "Environment Setup & Validation",
      required: true,
    },
    { name: "analysis", title: "Project Analysis & Cleanup", required: true },
    { name: "testing", title: "Adaptive Testing & Validation", required: true },
    {
      name: "documentation",
      title: "Documentation Sync & Generation",
      required: false,
    },
    {
      name: "content",
      title: "Content Generation & Optimization",
      required: false,
    },
    { name: "build", title: "Core Build & Package", required: true },
    {
      name: "quality",
      title: "Quality Assurance & Optimization",
      required: true,
    },
  ];
}
```

### 1.4 Output Structure

Current build output:

```
dist/
├── index.js              # Main SDK entry point
├── index.d.ts            # TypeScript declarations
├── cli/
│   └── index.js          # CLI entry point
├── types/
│   └── sdkTypes.js       # Type exports
└── [module folders]      # SDK modules
```

---

## Part 2: Gap Analysis

### 2.1 Mastra Deployment Features

Mastra's deployment system provides:

| Feature               | Mastra                              | NeuroLink Current       |
| --------------------- | ----------------------------------- | ----------------------- |
| Entry file discovery  | Automatic scanning of mastra dir    | Manual configuration    |
| Tool aggregation      | Auto-discovers `tools/**/*.ts`      | MCP registry (manual)   |
| Dependency analysis   | Bundle vs externalize decisions     | SvelteKit defaults      |
| Rollup bundling       | Tree-shaking, source maps           | Vite (no direct Rollup) |
| Output structure      | `.mastra/output/` directory         | `dist/` directory       |
| Platform deployers    | Vercel, Cloudflare, Netlify, Lambda | None                    |
| Server generation     | Hono-based HTTP server              | None (SDK only)         |
| OpenAPI documentation | Auto-generated                      | None                    |
| Studio UI             | Built-in playground                 | None                    |

### 2.2 Key Missing Capabilities

1. **Production Server Generation**: No HTTP server bundling for deployment
2. **Platform Deployers**: No integration with cloud platforms
3. **Tool Aggregation**: Manual MCP registration vs automatic discovery
4. **Dependency Optimization**: No selective bundling/externalization
5. **OpenAPI Generation**: No automatic API documentation

### 2.3 Strengths to Preserve

NeuroLink has unique capabilities that should be retained:

1. **Comprehensive MCP Integration**: 58+ external servers
2. **Multi-Provider Support**: 13 AI providers
3. **Enterprise Features**: Redis memory, telemetry, middleware
4. **Multimodal Processing**: PDF, CSV, image, video support
5. **Existing CLI Infrastructure**: Full-featured CLI with loop mode

---

## Part 3: Architecture Design

### 3.1 Directory Structure

```
src/lib/
├── deployer/
│   ├── index.ts                    # Public exports
│   ├── types.ts                    # Type definitions
│   ├── bundler/
│   │   ├── bundler.ts              # Core Rollup bundler
│   │   ├── entryDiscovery.ts       # Entry file scanner
│   │   ├── toolAggregator.ts       # Tool collection
│   │   ├── dependencyAnalyzer.ts   # Bundle vs external analysis
│   │   └── outputGenerator.ts      # Output structure generation
│   ├── deployers/
│   │   ├── baseDeployer.ts         # Abstract base class
│   │   ├── vercelDeployer.ts       # Vercel integration
│   │   ├── cloudflareDeployer.ts   # Cloudflare Workers
│   │   ├── netlifyDeployer.ts      # Netlify Functions
│   │   └── lambdaDeployer.ts       # AWS Lambda
│   ├── server/
│   │   ├── serverGenerator.ts      # Hono server generation
│   │   ├── routeGenerator.ts       # API route generation
│   │   └── openApiGenerator.ts     # OpenAPI spec generation
│   └── config/
│       └── deployConfig.ts         # Configuration management
```

### 3.2 Component Relationships

```
                    ┌─────────────────┐
                    │  CLI Command    │
                    │  (build/deploy) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  DeployConfig   │
                    │  (neurolink.config.ts)
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │   Bundler   │   │   Server    │   │  Deployer   │
    │   System    │   │  Generator  │   │   System    │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
    ┌──────┴──────┐          │          ┌──────┴──────┐
    │ Entry       │          │          │ Vercel      │
    │ Discovery   │          │          │ Cloudflare  │
    │ Tool Agg    │          │          │ Netlify     │
    │ Dep Analyze │          │          │ Lambda      │
    └─────────────┘          │          └─────────────┘
                             │
                    ┌────────▼────────┐
                    │  .neurolink/    │
                    │  output/        │
                    └─────────────────┘
```

---

## Part 4: Build System Implementation

### 4.1 Deployer Types (`src/lib/deployer/types.ts`)

```typescript
// src/lib/deployer/types.ts

import type { RollupOptions, OutputOptions } from "rollup";

// ==================
// Configuration Types
// ==================

export type DeployConfig = {
  /** Directory containing NeuroLink entry files */
  dir?: string;

  /** Output directory for build artifacts */
  outputDir?: string;

  /** Platform deployer instance */
  deployer?: BaseDeployer;

  /** Server configuration */
  server?: ServerConfig;

  /** Build options */
  build?: BuildConfig;

  /** Environment variables to include */
  env?: Record<string, string>;
};

export type ServerConfig = {
  /** Server port (default: 8080) */
  port?: number;

  /** Enable CORS (default: true) */
  cors?: boolean;

  /** API base path (default: /api) */
  basePath?: string;

  /** Enable OpenAPI documentation */
  openapi?: boolean | OpenAPIConfig;

  /** Enable playground UI */
  playground?: boolean;

  /** Custom middleware */
  middleware?: MiddlewareConfig[];
};

export type OpenAPIConfig = {
  /** API title */
  title?: string;

  /** API version */
  version?: string;

  /** API description */
  description?: string;

  /** OpenAPI spec output path */
  outputPath?: string;
};

export type BuildConfig = {
  /** Enable source maps */
  sourceMaps?: boolean;

  /** Enable tree-shaking */
  treeShake?: boolean;

  /** Packages to always externalize */
  external?: string[];

  /** Packages to always bundle */
  noExternal?: string[];

  /** Custom Rollup options */
  rollupOptions?: Partial<RollupOptions>;

  /** Minify output */
  minify?: boolean;

  /** Target environment */
  target?: "node" | "edge" | "worker";
};

export type MiddlewareConfig = {
  name: string;
  path?: string;
  handler: string;
};

// ==================
// Entry Discovery Types
// ==================

export type EntryFile = {
  /** Absolute path to entry file */
  path: string;

  /** Entry type */
  type: "main" | "tools" | "config" | "routes";

  /** Exports from this file */
  exports: string[];
};

export type DiscoveredEntries = {
  /** Main entry file */
  main?: EntryFile;

  /** Tool definition files */
  tools: EntryFile[];

  /** Configuration file */
  config?: EntryFile;

  /** Custom route files */
  routes: EntryFile[];
};

// ==================
// Tool Aggregation Types
// ==================

export type DiscoveredTool = {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Source file path */
  sourcePath: string;

  /** Export name */
  exportName: string;

  /** Input schema (JSON Schema) */
  inputSchema?: Record<string, unknown>;

  /** Tool category */
  category?: string;
};

export type AggregatedTools = {
  /** All discovered tools */
  tools: DiscoveredTool[];

  /** Generated tools export file content */
  exportContent: string;

  /** Tool registry initialization code */
  registryCode: string;
};

// ==================
// Dependency Analysis Types
// ==================

export type DependencyInfo = {
  /** Package name */
  name: string;

  /** Package version */
  version: string;

  /** Whether to bundle or externalize */
  treatment: "bundle" | "external";

  /** Reason for treatment decision */
  reason: string;

  /** Size in bytes (if bundled) */
  size?: number;
};

export type DependencyAnalysis = {
  /** Dependencies to bundle */
  bundled: DependencyInfo[];

  /** Dependencies to externalize */
  external: DependencyInfo[];

  /** Peer dependencies */
  peer: DependencyInfo[];

  /** Total bundle size estimate */
  estimatedBundleSize: number;
};

// ==================
// Output Types
// ==================

export type BuildOutput = {
  /** Output directory */
  outputDir: string;

  /** Generated files */
  files: OutputFile[];

  /** Package.json for output */
  packageJson: Record<string, unknown>;

  /** Build duration in ms */
  duration: number;

  /** Build warnings */
  warnings: string[];
};

export type OutputFile = {
  /** File path relative to output dir */
  path: string;

  /** File size in bytes */
  size: number;

  /** File type */
  type: "js" | "dts" | "json" | "html" | "css" | "map";
};

// ==================
// Deployer Types
// ==================

export type DeployerConfig = {
  /** Deployer name */
  name: string;

  /** Platform-specific options */
  options?: Record<string, unknown>;
};

export type DeployResult = {
  /** Deployment successful */
  success: boolean;

  /** Deployed URL */
  url?: string;

  /** Deployment ID */
  deploymentId?: string;

  /** Error message if failed */
  error?: string;

  /** Platform-specific metadata */
  metadata?: Record<string, unknown>;
};

export type DeploymentStatus = {
  /** Current status */
  status: "pending" | "building" | "deploying" | "ready" | "failed";

  /** Status message */
  message?: string;

  /** Progress percentage (0-100) */
  progress?: number;
};

// ==================
// Vercel-Specific Types
// ==================

export type VercelDeployerConfig = DeployerConfig & {
  name: "vercel";
  options?: {
    /** Function execution timeout (seconds) */
    maxDuration?: number;

    /** Function memory (MB) */
    memory?: number;

    /** Deployment regions */
    regions?: string[];

    /** Vercel project name */
    projectName?: string;

    /** Vercel team ID */
    teamId?: string;
  };
};

// ==================
// Cloudflare-Specific Types
// ==================

export type CloudflareDeployerConfig = DeployerConfig & {
  name: "cloudflare";
  options?: {
    /** Worker name */
    workerName?: string;

    /** Account ID */
    accountId?: string;

    /** Route patterns */
    routes?: Array<{
      pattern: string;
      zone_name?: string;
      custom_domain?: string;
    }>;

    /** Environment variables */
    vars?: Record<string, string>;

    /** KV namespace bindings */
    kv_namespaces?: Array<{
      binding: string;
      id: string;
    }>;

    /** D1 database bindings */
    d1_databases?: Array<{
      binding: string;
      database_name: string;
      database_id: string;
    }>;

    /** Compatibility date */
    compatibility_date?: string;

    /** Compatibility flags */
    compatibility_flags?: string[];
  };
};

// ==================
// Netlify-Specific Types
// ==================

export type NetlifyDeployerConfig = DeployerConfig & {
  name: "netlify";
  options?: {
    /** Site ID */
    siteId?: string;

    /** Functions directory */
    functionsDir?: string;

    /** Node bundler */
    nodeBundler?: "esbuild" | "zisi";

    /** Included files */
    includedFiles?: string[];
  };
};

// ==================
// Lambda-Specific Types
// ==================

export type LambdaDeployerConfig = DeployerConfig & {
  name: "lambda";
  options?: {
    /** Function name */
    functionName?: string;

    /** AWS region */
    region?: string;

    /** Memory size (MB) */
    memorySize?: number;

    /** Timeout (seconds) */
    timeout?: number;

    /** Runtime */
    runtime?: "nodejs18.x" | "nodejs20.x" | "nodejs22.x";

    /** Handler path */
    handler?: string;

    /** Environment variables */
    environment?: Record<string, string>;

    /** VPC configuration */
    vpc?: {
      subnetIds: string[];
      securityGroupIds: string[];
    };

    /** Use Function URL */
    functionUrl?: boolean;

    /** Use Docker container */
    useDocker?: boolean;

    /** ECR repository */
    ecrRepository?: string;
  };
};

// ==================
// Server Generation Types
// ==================

export type GeneratedServer = {
  /** Server code content */
  code: string;

  /** Router code content */
  router: string;

  /** OpenAPI spec (if enabled) */
  openApiSpec?: string;

  /** Playground HTML (if enabled) */
  playgroundHtml?: string;
};

export type RouteDefinition = {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

  /** Route path */
  path: string;

  /** Handler function name */
  handler: string;

  /** Route description */
  description?: string;

  /** Input schema */
  inputSchema?: Record<string, unknown>;

  /** Output schema */
  outputSchema?: Record<string, unknown>;
};
```

### 4.2 Entry Discovery (`src/lib/deployer/bundler/entryDiscovery.ts`)

```typescript
// src/lib/deployer/bundler/entryDiscovery.ts

import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { logger } from "../../utils/logger.js";
import type { EntryFile, DiscoveredEntries, DeployConfig } from "../types.js";

/**
 * Entry Discovery - Scans project for NeuroLink entry files
 *
 * Follows Mastra pattern of automatic discovery:
 * - Main entry (index.ts or neurolink.ts)
 * - Tool definitions (tools/**\/*.ts)
 * - Configuration (neurolink.config.ts)
 * - Custom routes (routes/**\/*.ts)
 */
export class EntryDiscovery {
  private config: DeployConfig;
  private rootDir: string;

  constructor(config: DeployConfig) {
    this.config = config;
    this.rootDir = config.dir || path.join(process.cwd(), "src/neurolink");
  }

  /**
   * Discover all entry files in the project
   */
  async discover(): Promise<DiscoveredEntries> {
    logger.debug(`Scanning for entries in: ${this.rootDir}`);

    const [main, tools, configFile, routes] = await Promise.all([
      this.discoverMainEntry(),
      this.discoverTools(),
      this.discoverConfig(),
      this.discoverRoutes(),
    ]);

    const entries: DiscoveredEntries = {
      main,
      tools,
      config: configFile,
      routes,
    };

    logger.info("Entry discovery complete", {
      hasMain: !!main,
      toolCount: tools.length,
      hasConfig: !!configFile,
      routeCount: routes.length,
    });

    return entries;
  }

  /**
   * Discover main entry file
   * Looks for: index.ts, index.js, neurolink.ts, neurolink.js
   */
  private async discoverMainEntry(): Promise<EntryFile | undefined> {
    const candidates = [
      "index.ts",
      "index.js",
      "neurolink.ts",
      "neurolink.js",
      "main.ts",
      "main.js",
    ];

    for (const candidate of candidates) {
      const filePath = path.join(this.rootDir, candidate);

      if (fs.existsSync(filePath)) {
        const exports = await this.extractExports(filePath);

        logger.debug(`Found main entry: ${filePath}`, { exports });

        return {
          path: filePath,
          type: "main",
          exports,
        };
      }
    }

    logger.warn("No main entry file found");
    return undefined;
  }

  /**
   * Discover tool definition files
   * Pattern: tools/**\/*.{ts,js}
   * Excludes: *.test.ts, *.spec.ts, *.d.ts
   */
  private async discoverTools(): Promise<EntryFile[]> {
    const toolsDir = path.join(this.rootDir, "tools");

    if (!fs.existsSync(toolsDir)) {
      logger.debug("No tools directory found");
      return [];
    }

    const pattern = path.join(toolsDir, "**/*.{ts,js}");
    const files = await glob(pattern, {
      ignore: ["**/*.test.{ts,js}", "**/*.spec.{ts,js}", "**/*.d.ts"],
    });

    const tools: EntryFile[] = [];

    for (const file of files) {
      const exports = await this.extractExports(file);

      // Only include files that export tools
      if (this.hasToolExports(exports)) {
        tools.push({
          path: file,
          type: "tools",
          exports,
        });
      }
    }

    logger.debug(`Discovered ${tools.length} tool files`);
    return tools;
  }

  /**
   * Discover configuration file
   * Looks for: neurolink.config.ts, neurolink.config.js
   */
  private async discoverConfig(): Promise<EntryFile | undefined> {
    const candidates = [
      path.join(this.rootDir, "neurolink.config.ts"),
      path.join(this.rootDir, "neurolink.config.js"),
      path.join(process.cwd(), "neurolink.config.ts"),
      path.join(process.cwd(), "neurolink.config.js"),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const exports = await this.extractExports(filePath);

        return {
          path: filePath,
          type: "config",
          exports,
        };
      }
    }

    return undefined;
  }

  /**
   * Discover custom route files
   * Pattern: routes/**\/*.{ts,js}
   */
  private async discoverRoutes(): Promise<EntryFile[]> {
    const routesDir = path.join(this.rootDir, "routes");

    if (!fs.existsSync(routesDir)) {
      return [];
    }

    const pattern = path.join(routesDir, "**/*.{ts,js}");
    const files = await glob(pattern, {
      ignore: ["**/*.test.{ts,js}", "**/*.spec.{ts,js}", "**/*.d.ts"],
    });

    const routes: EntryFile[] = [];

    for (const file of files) {
      const exports = await this.extractExports(file);
      routes.push({
        path: file,
        type: "routes",
        exports,
      });
    }

    return routes;
  }

  /**
   * Extract export names from a TypeScript/JavaScript file
   * Uses Babel parser for AST analysis
   */
  private async extractExports(filePath: string): Promise<string[]> {
    const exports: string[] = [];

    try {
      const content = fs.readFileSync(filePath, "utf-8");

      const ast = parse(content, {
        sourceType: "module",
        plugins: ["typescript", "decorators-legacy"],
      });

      traverse(ast, {
        ExportNamedDeclaration(nodePath) {
          const { declaration, specifiers } = nodePath.node;

          // Handle: export const foo = ...
          if (declaration) {
            if (declaration.type === "VariableDeclaration") {
              declaration.declarations.forEach((d) => {
                if (d.id.type === "Identifier") {
                  exports.push(d.id.name);
                }
              });
            } else if (
              declaration.type === "FunctionDeclaration" ||
              declaration.type === "ClassDeclaration"
            ) {
              if (declaration.id) {
                exports.push(declaration.id.name);
              }
            }
          }

          // Handle: export { foo, bar }
          specifiers.forEach((spec) => {
            if (spec.type === "ExportSpecifier") {
              const exported = spec.exported;
              if (exported.type === "Identifier") {
                exports.push(exported.name);
              }
            }
          });
        },

        ExportDefaultDeclaration() {
          exports.push("default");
        },
      });
    } catch (error) {
      logger.warn(`Failed to parse exports from ${filePath}:`, error);
    }

    return exports;
  }

  /**
   * Check if exports contain tool definitions
   */
  private hasToolExports(exports: string[]): boolean {
    // Tool files typically export objects with specific patterns
    const toolPatterns = [/Tool$/, /tool$/, /^create/, /^define/, "default"];

    return exports.some((exp) =>
      toolPatterns.some((pattern) =>
        typeof pattern === "string" ? exp === pattern : pattern.test(exp),
      ),
    );
  }
}
```

### 4.3 Tool Aggregator (`src/lib/deployer/bundler/toolAggregator.ts`)

```typescript
// src/lib/deployer/bundler/toolAggregator.ts

import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";
import type { EntryFile, DiscoveredTool, AggregatedTools } from "../types.js";

/**
 * Tool Aggregator - Collects and generates tool exports
 *
 * Scans tool files and generates:
 * 1. Unified tools.mjs export file
 * 2. Tool registry initialization code
 * 3. OpenAPI schemas for documentation
 */
export class ToolAggregator {
  /**
   * Aggregate tools from discovered entry files
   */
  async aggregate(toolEntries: EntryFile[]): Promise<AggregatedTools> {
    const tools: DiscoveredTool[] = [];

    for (const entry of toolEntries) {
      const discovered = await this.extractToolsFromFile(entry);
      tools.push(...discovered);
    }

    logger.info(
      `Aggregated ${tools.length} tools from ${toolEntries.length} files`,
    );

    const exportContent = this.generateExportContent(tools, toolEntries);
    const registryCode = this.generateRegistryCode(tools);

    return {
      tools,
      exportContent,
      registryCode,
    };
  }

  /**
   * Extract tool definitions from a file
   */
  private async extractToolsFromFile(
    entry: EntryFile,
  ): Promise<DiscoveredTool[]> {
    const tools: DiscoveredTool[] = [];

    try {
      // Dynamic import to get actual tool exports
      const module = await import(entry.path);

      for (const exportName of entry.exports) {
        const exported =
          exportName === "default" ? module.default : module[exportName];

        if (this.isToolDefinition(exported)) {
          tools.push({
            name: exported.name || exportName,
            description: exported.description || "",
            sourcePath: entry.path,
            exportName,
            inputSchema: exported.inputSchema || exported.parameters,
            category: this.detectCategory(entry.path),
          });
        }
      }
    } catch (error) {
      logger.warn(`Failed to extract tools from ${entry.path}:`, error);
    }

    return tools;
  }

  /**
   * Check if an export is a tool definition
   */
  private isToolDefinition(value: unknown): value is {
    name?: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    execute?: Function;
  } {
    if (!value || typeof value !== "object") {
      return false;
    }

    const obj = value as Record<string, unknown>;

    // Check for tool-like properties
    return (
      typeof obj.execute === "function" ||
      typeof obj.run === "function" ||
      typeof obj.handler === "function" ||
      (obj.description !== undefined && obj.inputSchema !== undefined) ||
      (obj.description !== undefined && obj.parameters !== undefined)
    );
  }

  /**
   * Detect tool category from file path
   */
  private detectCategory(filePath: string): string {
    const relativePath = path.relative(process.cwd(), filePath);
    const parts = relativePath.split(path.sep);

    // Look for category folder: tools/[category]/tool.ts
    const toolsIndex = parts.indexOf("tools");
    if (toolsIndex >= 0 && parts.length > toolsIndex + 2) {
      return parts[toolsIndex + 1];
    }

    return "general";
  }

  /**
   * Generate tools export file content
   */
  private generateExportContent(
    tools: DiscoveredTool[],
    entries: EntryFile[],
  ): string {
    const imports: string[] = [];
    const exports: string[] = [];
    const registrations: string[] = [];

    // Group tools by source file
    const toolsByFile = new Map<string, DiscoveredTool[]>();
    for (const tool of tools) {
      const existing = toolsByFile.get(tool.sourcePath) || [];
      existing.push(tool);
      toolsByFile.set(tool.sourcePath, existing);
    }

    let importIndex = 0;
    for (const [sourcePath, fileTools] of toolsByFile) {
      const relativePath = this.getRelativeImportPath(sourcePath);
      const moduleAlias = `tools_${importIndex++}`;

      const importNames = fileTools
        .map((t) => t.exportName)
        .filter((n) => n !== "default");
      const hasDefault = fileTools.some((t) => t.exportName === "default");

      if (hasDefault && importNames.length > 0) {
        imports.push(
          `import defaultTool_${importIndex}, { ${importNames.join(", ")} } from "${relativePath}";`,
        );
      } else if (hasDefault) {
        imports.push(
          `import defaultTool_${importIndex} from "${relativePath}";`,
        );
      } else if (importNames.length > 0) {
        imports.push(
          `import { ${importNames.join(", ")} } from "${relativePath}";`,
        );
      }

      for (const tool of fileTools) {
        const varName =
          tool.exportName === "default"
            ? `defaultTool_${importIndex}`
            : tool.exportName;
        exports.push(tool.name);
        registrations.push(`  "${tool.name}": ${varName},`);
      }
    }

    return `// Auto-generated by NeuroLink Deployer
// Do not edit manually

${imports.join("\n")}

export const tools = {
${registrations.join("\n")}
};

export const toolNames = [${exports.map((e) => `"${e}"`).join(", ")}];

export default tools;
`;
  }

  /**
   * Generate tool registry initialization code
   */
  private generateRegistryCode(tools: DiscoveredTool[]): string {
    const registrations = tools
      .map(
        (tool) => `
  toolRegistry.registerTool({
    name: "${tool.name}",
    description: "${tool.description.replace(/"/g, '\\"')}",
    category: "${tool.category}",
    inputSchema: ${JSON.stringify(tool.inputSchema || {}, null, 2).replace(/\n/g, "\n    ")},
    execute: tools["${tool.name}"].execute,
  });`,
      )
      .join("\n");

    return `// Tool Registry Initialization
import { tools } from "./tools.mjs";
import { MCPToolRegistry } from "@juspay/neurolink";

export function initializeTools(toolRegistry: MCPToolRegistry): void {
${registrations}
}
`;
  }

  /**
   * Get relative import path
   */
  private getRelativeImportPath(absolutePath: string): string {
    const outputDir = path.join(process.cwd(), ".neurolink", "output");
    const relativePath = path.relative(outputDir, absolutePath);

    // Convert to POSIX path for imports
    return relativePath.replace(/\\/g, "/").replace(/\.ts$/, ".js");
  }
}
```

### 4.4 Dependency Analyzer (`src/lib/deployer/bundler/dependencyAnalyzer.ts`)

```typescript
// src/lib/deployer/bundler/dependencyAnalyzer.ts

import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";
import type {
  DependencyInfo,
  DependencyAnalysis,
  BuildConfig,
} from "../types.js";

/**
 * Dependency Analyzer - Determines bundle vs external treatment
 *
 * Follows Mastra's optimization approach:
 * - Bundle small, frequently-used dependencies
 * - Externalize large runtime dependencies
 * - Externalize native modules
 * - Externalize provider SDKs (loaded dynamically)
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
  ]);

  // Dependencies that should always be externalized
  private static readonly ALWAYS_EXTERNAL = new Set([
    // Native modules
    "canvas",
    "sharp",
    "sqlite3",
    "better-sqlite3",

    // Large runtime dependencies
    "puppeteer",
    "playwright",

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

    // Heavy utilities
    "pdf-to-img",
    "mammoth",
    "exceljs",

    // Server runtime
    "hono",
    "@hono/node-server",

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
      throw new Error("package.json not found");
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
      0,
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
   * Analyze a single dependency
   */
  private async analyzeDependency(
    name: string,
    version: string,
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
   * Check if a package has native bindings
   */
  private async hasNativeBindings(packageName: string): Promise<boolean> {
    try {
      const packagePath = require.resolve(`${packageName}/package.json`);
      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

      // Check for common native binding indicators
      return !!(
        packageJson.gypfile ||
        packageJson.binary ||
        packageJson.dependencies?.["node-gyp"] ||
        packageJson.dependencies?.["node-pre-gyp"] ||
        packageJson.dependencies?.["prebuild-install"]
      );
    } catch {
      return false;
    }
  }

  /**
   * Estimate package size
   */
  private async estimatePackageSize(packageName: string): Promise<number> {
    try {
      const packagePath = path.dirname(
        require.resolve(`${packageName}/package.json`),
      );

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
          // Skip node_modules within packages
          if (entry.name !== "node_modules") {
            size += this.getDirectorySize(entryPath);
          }
        } else if (entry.isFile()) {
          size += fs.statSync(entryPath).size;
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
    external: DependencyInfo[],
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
   * Get external packages list for Rollup
   */
  getExternalList(): string[] {
    // Include Node built-ins and always-external packages
    return [
      ...DependencyAnalyzer.ALWAYS_EXTERNAL,
      // Add Node built-in module patterns
      /^node:/,
    ] as unknown as string[];
  }
}
```

### 4.5 Core Bundler (`src/lib/deployer/bundler/bundler.ts`)

```typescript
// src/lib/deployer/bundler/bundler.ts

import { rollup, type RollupOptions, type OutputOptions } from "rollup";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
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
 * NeuroLink Bundler - Rollup-based bundling with tree-shaking
 *
 * Build pipeline:
 * 1. Entry Discovery - Find main, tools, config, routes
 * 2. Tool Aggregation - Collect and export tools
 * 3. Dependency Analysis - Determine bundle vs external
 * 4. Rollup Bundle - Tree-shake and bundle
 * 5. Output Generation - Write to .neurolink/output/
 */
export class Bundler {
  private config: DeployConfig;
  private buildConfig: BuildConfig;
  private outputDir: string;

  constructor(config: DeployConfig) {
    this.config = config;
    this.buildConfig = config.build || {};
    this.outputDir =
      config.outputDir || path.join(process.cwd(), ".neurolink", "output");
  }

  /**
   * Execute the full build pipeline
   */
  async build(): Promise<BuildOutput> {
    const startTime = Date.now();
    const warnings: string[] = [];

    logger.info("Starting NeuroLink build...");

    // Step 1: Entry Discovery
    logger.info("Step 1/5: Discovering entries...");
    const entryDiscovery = new EntryDiscovery(this.config);
    const entries = await entryDiscovery.discover();

    if (!entries.main) {
      throw new Error(
        `No main entry file found in ${this.config.dir || "src/neurolink"}. ` +
          "Create an index.ts or neurolink.ts file.",
      );
    }

    // Step 2: Tool Aggregation
    logger.info("Step 2/5: Aggregating tools...");
    const toolAggregator = new ToolAggregator();
    const aggregatedTools = await toolAggregator.aggregate(entries.tools);

    // Step 3: Dependency Analysis
    logger.info("Step 3/5: Analyzing dependencies...");
    const dependencyAnalyzer = new DependencyAnalyzer(this.buildConfig);
    const dependencyAnalysis = await dependencyAnalyzer.analyze();

    // Step 4: Prepare output directory
    logger.info("Step 4/5: Preparing output directory...");
    await this.prepareOutputDir();

    // Step 5: Rollup Bundle
    logger.info("Step 5/5: Bundling with Rollup...");
    const files = await this.bundle(
      entries,
      aggregatedTools,
      dependencyAnalysis,
    );

    // Generate package.json
    const packageJson = this.generatePackageJson(dependencyAnalysis);
    const packageJsonPath = path.join(this.outputDir, "package.json");
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    files.push({
      path: "package.json",
      size: Buffer.byteLength(JSON.stringify(packageJson)),
      type: "json",
    });

    const duration = Date.now() - startTime;

    logger.info(`Build complete in ${duration}ms`, {
      files: files.length,
      outputDir: this.outputDir,
    });

    return {
      outputDir: this.outputDir,
      files,
      packageJson,
      duration,
      warnings,
    };
  }

  /**
   * Prepare output directory
   */
  private async prepareOutputDir(): Promise<void> {
    // Clean existing output
    if (fs.existsSync(this.outputDir)) {
      fs.rmSync(this.outputDir, { recursive: true });
    }

    // Create output directories
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.mkdirSync(path.join(this.outputDir, "public"), { recursive: true });
  }

  /**
   * Execute Rollup bundling
   */
  private async bundle(
    entries: DiscoveredEntries,
    tools: AggregatedTools,
    deps: DependencyAnalysis,
  ): Promise<OutputFile[]> {
    const outputFiles: OutputFile[] = [];

    // Write tools export file
    if (tools.tools.length > 0) {
      const toolsPath = path.join(this.outputDir, "tools.mjs");
      fs.writeFileSync(toolsPath, tools.exportContent);
      outputFiles.push({
        path: "tools.mjs",
        size: Buffer.byteLength(tools.exportContent),
        type: "js",
      });
    }

    // Build external list
    const external = [
      ...deps.external.map((d) => d.name),
      ...deps.peer.map((d) => d.name),
      /^node:/,
    ];

    // Rollup configuration
    const rollupConfig: RollupOptions = {
      input: entries.main!.path,
      external,
      plugins: [
        resolve({
          preferBuiltins: true,
          extensions: [".ts", ".js", ".mjs", ".json"],
        }),
        commonjs(),
        json(),
        typescript({
          tsconfig: this.findTsConfig(),
          declaration: true,
          declarationDir: this.outputDir,
          outDir: this.outputDir,
        }),
        ...(this.buildConfig.minify ? [terser()] : []),
      ],
      treeshake: this.buildConfig.treeShake !== false,
      ...this.buildConfig.rollupOptions,
    };

    const outputConfig: OutputOptions = {
      dir: this.outputDir,
      format: "esm",
      entryFileNames: "index.mjs",
      chunkFileNames: "[name]-[hash].mjs",
      sourcemap: this.buildConfig.sourceMaps,
    };

    // Execute Rollup
    const bundle = await rollup(rollupConfig);
    const { output } = await bundle.write(outputConfig);
    await bundle.close();

    // Collect output files
    for (const chunk of output) {
      if (chunk.type === "chunk") {
        outputFiles.push({
          path: chunk.fileName,
          size: Buffer.byteLength(chunk.code),
          type: "js",
        });

        if (chunk.map) {
          outputFiles.push({
            path: `${chunk.fileName}.map`,
            size: Buffer.byteLength(JSON.stringify(chunk.map)),
            type: "map",
          });
        }
      } else if (chunk.type === "asset") {
        outputFiles.push({
          path: chunk.fileName,
          size:
            typeof chunk.source === "string"
              ? Buffer.byteLength(chunk.source)
              : chunk.source.length,
          type: this.getFileType(chunk.fileName),
        });
      }
    }

    return outputFiles;
  }

  /**
   * Generate package.json for output
   */
  private generatePackageJson(
    deps: DependencyAnalysis,
  ): Record<string, unknown> {
    const originalPackageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"),
    );

    // Collect external dependencies with versions
    const dependencies: Record<string, string> = {};

    for (const dep of deps.external) {
      dependencies[dep.name] = dep.version;
    }

    // Add runtime dependencies
    dependencies["hono"] = "^4.0.0";
    dependencies["@hono/node-server"] = "^1.0.0";
    dependencies["superjson"] = "^2.0.0";

    return {
      name: `${originalPackageJson.name}-server`,
      version: originalPackageJson.version,
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
   * Find tsconfig.json
   */
  private findTsConfig(): string {
    const candidates = [
      path.join(process.cwd(), "tsconfig.json"),
      path.join(process.cwd(), "tsconfig.build.json"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return candidates[0]; // Default to tsconfig.json
  }

  /**
   * Get file type from extension
   */
  private getFileType(
    fileName: string,
  ): "js" | "dts" | "json" | "html" | "css" | "map" {
    const ext = path.extname(fileName).toLowerCase();

    switch (ext) {
      case ".js":
      case ".mjs":
        return "js";
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
        return "js";
    }
  }
}

export default Bundler;
```

---

## Part 5: Platform Deployers

### 5.1 Base Deployer (`src/lib/deployer/deployers/baseDeployer.ts`)

```typescript
// src/lib/deployer/deployers/baseDeployer.ts

import { EventEmitter } from "node:events";
import type {
  DeployConfig,
  DeployResult,
  DeploymentStatus,
  BuildOutput,
} from "../types.js";
import { Bundler } from "../bundler/bundler.js";
import { ServerGenerator } from "../server/serverGenerator.js";
import { logger } from "../../utils/logger.js";

/**
 * Base Deployer - Abstract class for platform deployers
 *
 * Provides common functionality:
 * - Build orchestration
 * - Server generation
 * - Status reporting
 * - Environment variable handling
 */
export abstract class BaseDeployer extends EventEmitter {
  protected config: DeployConfig;
  protected buildOutput?: BuildOutput;

  constructor(config: DeployConfig) {
    super();
    this.config = config;
  }

  /**
   * Get deployer name
   */
  abstract getName(): string;

  /**
   * Prepare platform-specific files
   */
  protected abstract prepare(): Promise<void>;

  /**
   * Execute platform-specific deployment
   */
  protected abstract deploy(): Promise<DeployResult>;

  /**
   * Validate platform requirements
   */
  protected abstract validate(): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Build and prepare for deployment
   */
  async build(): Promise<BuildOutput> {
    this.emitStatus("building", "Building application...");

    // Run bundler
    const bundler = new Bundler(this.config);
    this.buildOutput = await bundler.build();

    // Generate server
    const serverGenerator = new ServerGenerator(this.config);
    await serverGenerator.generate(this.buildOutput);

    // Prepare platform-specific files
    await this.prepare();

    this.emitStatus("ready", "Build complete");
    return this.buildOutput;
  }

  /**
   * Full build and deploy pipeline
   */
  async execute(): Promise<DeployResult> {
    logger.info(`Deploying to ${this.getName()}...`);

    // Validate requirements
    const validation = await this.validate();
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(", ")}`,
      };
    }

    // Build
    await this.build();

    // Deploy
    this.emitStatus("deploying", "Deploying to platform...");
    const result = await this.deploy();

    if (result.success) {
      this.emitStatus("ready", `Deployed to ${result.url}`);
      logger.info(`Deployment successful: ${result.url}`);
    } else {
      this.emitStatus("failed", result.error || "Deployment failed");
      logger.error(`Deployment failed: ${result.error}`);
    }

    return result;
  }

  /**
   * Emit status update
   */
  protected emitStatus(
    status: DeploymentStatus["status"],
    message?: string,
    progress?: number,
  ): void {
    this.emit("status", { status, message, progress } as DeploymentStatus);
  }

  /**
   * Get environment variables for deployment
   */
  protected getEnvironmentVariables(): Record<string, string> {
    const env: Record<string, string> = {};

    // Include config env vars
    if (this.config.env) {
      Object.assign(env, this.config.env);
    }

    // Include process env vars with NEUROLINK_ prefix
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("NEUROLINK_") && value) {
        env[key] = value;
      }
    }

    return env;
  }
}
```

### 5.2 Vercel Deployer (`src/lib/deployer/deployers/vercelDeployer.ts`)

```typescript
// src/lib/deployer/deployers/vercelDeployer.ts

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { BaseDeployer } from "./baseDeployer.js";
import { logger } from "../../utils/logger.js";
import type {
  DeployConfig,
  DeployResult,
  VercelDeployerConfig,
} from "../types.js";

/**
 * Vercel Deployer - Deploy NeuroLink to Vercel Serverless Functions
 *
 * Output structure:
 * .vercel/
 * └── output/
 *     ├── config.json
 *     └── functions/
 *         └── index.func/
 *             ├── .vc-config.json
 *             └── index.mjs
 */
export class VercelDeployer extends BaseDeployer {
  private vercelConfig: VercelDeployerConfig["options"];

  constructor(config: DeployConfig, options?: VercelDeployerConfig["options"]) {
    super(config);
    this.vercelConfig = options || {};
  }

  getName(): string {
    return "vercel";
  }

  protected async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for Vercel CLI
    try {
      execSync("vercel --version", { stdio: "ignore" });
    } catch {
      errors.push("Vercel CLI not found. Install with: npm i -g vercel");
    }

    // Check for Vercel token (optional for local dev)
    if (!process.env.VERCEL_TOKEN && process.env.CI) {
      errors.push("VERCEL_TOKEN not set (required for CI deployment)");
    }

    return { valid: errors.length === 0, errors };
  }

  protected async prepare(): Promise<void> {
    if (!this.buildOutput) {
      throw new Error("Build output not available");
    }

    const vercelOutputDir = path.join(process.cwd(), ".vercel", "output");
    const functionsDir = path.join(vercelOutputDir, "functions", "index.func");

    // Create directory structure
    fs.mkdirSync(functionsDir, { recursive: true });

    // Copy build output to functions directory
    this.copyDirectory(this.buildOutput.outputDir, functionsDir);

    // Generate Vercel config
    const vercelConfig = {
      version: 3,
      routes: [
        {
          src: "/api/(.*)",
          dest: "/index",
        },
        {
          src: "/(.*)",
          dest: "/index",
        },
      ],
    };

    fs.writeFileSync(
      path.join(vercelOutputDir, "config.json"),
      JSON.stringify(vercelConfig, null, 2),
    );

    // Generate function config
    const funcConfig = {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
      maxDuration: this.vercelConfig?.maxDuration || 60,
      memory: this.vercelConfig?.memory || 1024,
      regions: this.vercelConfig?.regions || ["iad1"],
    };

    fs.writeFileSync(
      path.join(functionsDir, ".vc-config.json"),
      JSON.stringify(funcConfig, null, 2),
    );

    logger.debug("Vercel output prepared", { functionsDir });
  }

  protected async deploy(): Promise<DeployResult> {
    try {
      const args = ["--prebuilt"];

      if (this.vercelConfig?.projectName) {
        args.push("--name", this.vercelConfig.projectName);
      }

      if (this.vercelConfig?.teamId) {
        args.push("--scope", this.vercelConfig.teamId);
      }

      // Add environment variables
      const envVars = this.getEnvironmentVariables();
      for (const [key, value] of Object.entries(envVars)) {
        args.push("-e", `${key}=${value}`);
      }

      // Execute deployment
      const output = execSync(`vercel ${args.join(" ")}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : undefined;

      return {
        success: true,
        url,
        metadata: {
          platform: "vercel",
          output,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private copyDirectory(src: string, dest: string): void {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
```

### 5.3 Cloudflare Deployer (`src/lib/deployer/deployers/cloudflareDeployer.ts`)

```typescript
// src/lib/deployer/deployers/cloudflareDeployer.ts

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { BaseDeployer } from "./baseDeployer.js";
import { logger } from "../../utils/logger.js";
import type {
  DeployConfig,
  DeployResult,
  CloudflareDeployerConfig,
} from "../types.js";

/**
 * Cloudflare Deployer - Deploy NeuroLink to Cloudflare Workers
 *
 * Features:
 * - Workers runtime with Node.js compatibility
 * - KV namespace bindings
 * - D1 database bindings
 * - Custom routes
 */
export class CloudflareDeployer extends BaseDeployer {
  private cfConfig: CloudflareDeployerConfig["options"];

  constructor(
    config: DeployConfig,
    options?: CloudflareDeployerConfig["options"],
  ) {
    super(config);
    this.cfConfig = options || {};
  }

  getName(): string {
    return "cloudflare";
  }

  protected async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for Wrangler CLI
    try {
      execSync("wrangler --version", { stdio: "ignore" });
    } catch {
      errors.push("Wrangler CLI not found. Install with: npm i -g wrangler");
    }

    // Check for Cloudflare credentials
    if (
      !process.env.CLOUDFLARE_API_TOKEN &&
      !process.env.CLOUDFLARE_ACCOUNT_ID
    ) {
      errors.push(
        "Cloudflare credentials not set (CLOUDFLARE_API_TOKEN or login)",
      );
    }

    return { valid: errors.length === 0, errors };
  }

  protected async prepare(): Promise<void> {
    if (!this.buildOutput) {
      throw new Error("Build output not available");
    }

    // Generate wrangler.toml
    const wranglerConfig = this.generateWranglerConfig();
    const wranglerPath = path.join(this.buildOutput.outputDir, "wrangler.toml");

    fs.writeFileSync(wranglerPath, this.toToml(wranglerConfig));

    // Generate worker entry point wrapper
    const workerEntry = this.generateWorkerEntry();
    const workerPath = path.join(this.buildOutput.outputDir, "worker.mjs");

    fs.writeFileSync(workerPath, workerEntry);

    logger.debug("Cloudflare Worker prepared", {
      wranglerPath,
      workerPath,
    });
  }

  protected async deploy(): Promise<DeployResult> {
    try {
      const cwd = this.buildOutput!.outputDir;

      // Deploy using Wrangler
      const output = execSync("wrangler deploy", {
        cwd,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          ...this.getEnvironmentVariables(),
        },
      });

      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+\.workers\.dev/);
      const url = urlMatch ? urlMatch[0] : undefined;

      return {
        success: true,
        url,
        metadata: {
          platform: "cloudflare",
          output,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private generateWranglerConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {
      name: this.cfConfig?.workerName || "neurolink-worker",
      main: "worker.mjs",
      compatibility_date: this.cfConfig?.compatibility_date || "2024-01-01",
      compatibility_flags: this.cfConfig?.compatibility_flags || [
        "nodejs_compat",
      ],
      node_compat: true,
    };

    // Add account ID if provided
    if (this.cfConfig?.accountId) {
      config.account_id = this.cfConfig.accountId;
    }

    // Add routes if provided
    if (this.cfConfig?.routes?.length) {
      config.routes = this.cfConfig.routes;
    }

    // Add KV namespaces if provided
    if (this.cfConfig?.kv_namespaces?.length) {
      config.kv_namespaces = this.cfConfig.kv_namespaces;
    }

    // Add D1 databases if provided
    if (this.cfConfig?.d1_databases?.length) {
      config.d1_databases = this.cfConfig.d1_databases;
    }

    // Add environment variables
    const vars = this.getEnvironmentVariables();
    if (Object.keys(vars).length > 0) {
      config.vars = vars;
    }

    return config;
  }

  private generateWorkerEntry(): string {
    return `// Cloudflare Worker entry point
// Auto-generated by NeuroLink Deployer

import { app } from "./index.mjs";

export default {
  async fetch(request, env, ctx) {
    // Inject environment bindings
    globalThis.env = env;
    globalThis.ctx = ctx;

    return app.fetch(request, env, ctx);
  },
};
`;
  }

  private toToml(obj: Record<string, unknown>, indent = ""): string {
    let result = "";

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === "object") {
          // Array of objects (e.g., routes, kv_namespaces)
          for (const item of value) {
            result += `\n[[${key}]]\n`;
            result += this.toToml(item as Record<string, unknown>);
          }
        } else {
          // Simple array
          result += `${indent}${key} = [${value.map((v) => JSON.stringify(v)).join(", ")}]\n`;
        }
      } else if (typeof value === "object") {
        result += `\n[${key}]\n`;
        result += this.toToml(value as Record<string, unknown>);
      } else if (typeof value === "string") {
        result += `${indent}${key} = "${value}"\n`;
      } else {
        result += `${indent}${key} = ${value}\n`;
      }
    }

    return result;
  }
}
```

### 5.4 Netlify Deployer (`src/lib/deployer/deployers/netlifyDeployer.ts`)

```typescript
// src/lib/deployer/deployers/netlifyDeployer.ts

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { BaseDeployer } from "./baseDeployer.js";
import { logger } from "../../utils/logger.js";
import type {
  DeployConfig,
  DeployResult,
  NetlifyDeployerConfig,
} from "../types.js";

/**
 * Netlify Deployer - Deploy NeuroLink to Netlify Functions
 *
 * Output structure:
 * netlify/
 * └── functions/
 *     └── api/
 *         └── index.mjs
 */
export class NetlifyDeployer extends BaseDeployer {
  private netlifyConfig: NetlifyDeployerConfig["options"];

  constructor(
    config: DeployConfig,
    options?: NetlifyDeployerConfig["options"],
  ) {
    super(config);
    this.netlifyConfig = options || {};
  }

  getName(): string {
    return "netlify";
  }

  protected async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for Netlify CLI
    try {
      execSync("netlify --version", { stdio: "ignore" });
    } catch {
      errors.push("Netlify CLI not found. Install with: npm i -g netlify-cli");
    }

    return { valid: errors.length === 0, errors };
  }

  protected async prepare(): Promise<void> {
    if (!this.buildOutput) {
      throw new Error("Build output not available");
    }

    const netlifyDir = path.join(process.cwd(), "netlify");
    const functionsDir = path.join(netlifyDir, "functions", "api");

    // Create directory structure
    fs.mkdirSync(functionsDir, { recursive: true });

    // Copy build output to functions directory
    this.copyDirectory(this.buildOutput.outputDir, functionsDir);

    // Generate netlify.toml
    const netlifyToml = this.generateNetlifyConfig();
    fs.writeFileSync(path.join(process.cwd(), "netlify.toml"), netlifyToml);

    // Generate function wrapper
    const wrapper = this.generateFunctionWrapper();
    fs.writeFileSync(path.join(functionsDir, "handler.mjs"), wrapper);

    logger.debug("Netlify Functions prepared", { functionsDir });
  }

  protected async deploy(): Promise<DeployResult> {
    try {
      const args = ["deploy", "--prod"];

      if (this.netlifyConfig?.siteId) {
        args.push("--site", this.netlifyConfig.siteId);
      }

      const output = execSync(`netlify ${args.join(" ")}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          ...this.getEnvironmentVariables(),
        },
      });

      // Extract URL from output
      const urlMatch = output.match(/https:\/\/[^\s]+\.netlify\.app/);
      const url = urlMatch ? urlMatch[0] : undefined;

      return {
        success: true,
        url,
        metadata: {
          platform: "netlify",
          output,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private generateNetlifyConfig(): string {
    const functionsDir =
      this.netlifyConfig?.functionsDir || "netlify/functions";

    return `# Netlify Configuration
# Auto-generated by NeuroLink Deployer

[build]
  functions = "${functionsDir}"
  publish = "public"

[functions]
  node_bundler = "${this.netlifyConfig?.nodeBundler || "esbuild"}"
  ${this.netlifyConfig?.includedFiles?.length ? `included_files = ${JSON.stringify(this.netlifyConfig.includedFiles)}` : ""}

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
`;
  }

  private generateFunctionWrapper(): string {
    return `// Netlify Function Wrapper
// Auto-generated by NeuroLink Deployer

import { app } from "./index.mjs";

export const handler = async (event, context) => {
  // Convert Netlify event to Fetch Request
  const url = new URL(event.rawUrl);
  const request = new Request(url, {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  });

  // Call Hono app
  const response = await app.fetch(request);

  // Convert Response to Netlify format
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
};
`;
  }

  private copyDirectory(src: string, dest: string): void {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
```

### 5.5 AWS Lambda Deployer (`src/lib/deployer/deployers/lambdaDeployer.ts`)

```typescript
// src/lib/deployer/deployers/lambdaDeployer.ts

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { BaseDeployer } from "./baseDeployer.js";
import { logger } from "../../utils/logger.js";
import type {
  DeployConfig,
  DeployResult,
  LambdaDeployerConfig,
} from "../types.js";

/**
 * AWS Lambda Deployer - Deploy NeuroLink to AWS Lambda
 *
 * Supports:
 * - Direct Lambda deployment (zip)
 * - Docker container deployment (ECR)
 * - Lambda Function URLs
 * - Lambda Web Adapter for Hono
 */
export class LambdaDeployer extends BaseDeployer {
  private lambdaConfig: LambdaDeployerConfig["options"];

  constructor(config: DeployConfig, options?: LambdaDeployerConfig["options"]) {
    super(config);
    this.lambdaConfig = options || {};
  }

  getName(): string {
    return "lambda";
  }

  protected async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for AWS CLI
    try {
      execSync("aws --version", { stdio: "ignore" });
    } catch {
      errors.push(
        "AWS CLI not found. Install from: https://aws.amazon.com/cli/",
      );
    }

    // Check for AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
      errors.push("AWS credentials not configured");
    }

    // Check for Docker if using container deployment
    if (this.lambdaConfig?.useDocker) {
      try {
        execSync("docker --version", { stdio: "ignore" });
      } catch {
        errors.push("Docker not found (required for container deployment)");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  protected async prepare(): Promise<void> {
    if (!this.buildOutput) {
      throw new Error("Build output not available");
    }

    if (this.lambdaConfig?.useDocker) {
      await this.prepareDockerDeployment();
    } else {
      await this.prepareZipDeployment();
    }
  }

  protected async deploy(): Promise<DeployResult> {
    try {
      if (this.lambdaConfig?.useDocker) {
        return await this.deployDocker();
      } else {
        return await this.deployZip();
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private async prepareZipDeployment(): Promise<void> {
    const outputDir = this.buildOutput!.outputDir;

    // Generate Lambda handler
    const handlerCode = this.generateLambdaHandler();
    fs.writeFileSync(path.join(outputDir, "handler.mjs"), handlerCode);

    // Install production dependencies
    execSync("npm install --production", {
      cwd: outputDir,
      stdio: "inherit",
    });

    logger.debug("Lambda zip deployment prepared");
  }

  private async prepareDockerDeployment(): Promise<void> {
    const outputDir = this.buildOutput!.outputDir;

    // Generate Dockerfile
    const dockerfile = this.generateDockerfile();
    fs.writeFileSync(path.join(outputDir, "Dockerfile"), dockerfile);

    logger.debug("Lambda Docker deployment prepared");
  }

  private async deployZip(): Promise<DeployResult> {
    const outputDir = this.buildOutput!.outputDir;
    const functionName = this.lambdaConfig?.functionName || "neurolink-api";
    const region = this.lambdaConfig?.region || "us-east-1";

    // Create deployment package
    const zipPath = path.join(process.cwd(), "lambda-deployment.zip");
    execSync(`cd ${outputDir} && zip -r ${zipPath} .`, { stdio: "inherit" });

    // Check if function exists
    let functionExists = false;
    try {
      execSync(
        `aws lambda get-function --function-name ${functionName} --region ${region}`,
        { stdio: "ignore" },
      );
      functionExists = true;
    } catch {
      functionExists = false;
    }

    if (functionExists) {
      // Update existing function
      execSync(
        `aws lambda update-function-code \
          --function-name ${functionName} \
          --zip-file fileb://${zipPath} \
          --region ${region}`,
        { stdio: "inherit" },
      );
    } else {
      // Create new function
      const role = process.env.AWS_LAMBDA_ROLE;
      if (!role) {
        throw new Error(
          "AWS_LAMBDA_ROLE environment variable required for new functions",
        );
      }

      execSync(
        `aws lambda create-function \
          --function-name ${functionName} \
          --runtime ${this.lambdaConfig?.runtime || "nodejs20.x"} \
          --handler handler.handler \
          --role ${role} \
          --zip-file fileb://${zipPath} \
          --memory-size ${this.lambdaConfig?.memorySize || 512} \
          --timeout ${this.lambdaConfig?.timeout || 30} \
          --region ${region}`,
        { stdio: "inherit" },
      );
    }

    // Create/update Function URL if enabled
    let url: string | undefined;
    if (this.lambdaConfig?.functionUrl !== false) {
      try {
        const urlOutput = execSync(
          `aws lambda create-function-url-config \
            --function-name ${functionName} \
            --auth-type NONE \
            --region ${region} \
            --output json`,
          { encoding: "utf-8" },
        );
        const urlConfig = JSON.parse(urlOutput);
        url = urlConfig.FunctionUrl;
      } catch {
        // URL config might already exist
        const urlOutput = execSync(
          `aws lambda get-function-url-config \
            --function-name ${functionName} \
            --region ${region} \
            --output json`,
          { encoding: "utf-8" },
        );
        const urlConfig = JSON.parse(urlOutput);
        url = urlConfig.FunctionUrl;
      }
    }

    // Clean up zip
    fs.unlinkSync(zipPath);

    return {
      success: true,
      url,
      metadata: {
        platform: "lambda",
        functionName,
        region,
      },
    };
  }

  private async deployDocker(): Promise<DeployResult> {
    const outputDir = this.buildOutput!.outputDir;
    const functionName = this.lambdaConfig?.functionName || "neurolink-api";
    const region = this.lambdaConfig?.region || "us-east-1";
    const ecrRepo = this.lambdaConfig?.ecrRepository || functionName;

    // Get AWS account ID
    const accountId = execSync(
      "aws sts get-caller-identity --query Account --output text",
      { encoding: "utf-8" },
    ).trim();

    const imageUri = `${accountId}.dkr.ecr.${region}.amazonaws.com/${ecrRepo}:latest`;

    // Build Docker image
    execSync(`docker build -t ${ecrRepo}:latest ${outputDir}`, {
      stdio: "inherit",
    });

    // Create ECR repository if needed
    try {
      execSync(
        `aws ecr create-repository --repository-name ${ecrRepo} --region ${region}`,
        { stdio: "ignore" },
      );
    } catch {
      // Repository might already exist
    }

    // Login to ECR
    execSync(
      `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${accountId}.dkr.ecr.${region}.amazonaws.com`,
      { stdio: "inherit" },
    );

    // Tag and push image
    execSync(`docker tag ${ecrRepo}:latest ${imageUri}`, { stdio: "inherit" });
    execSync(`docker push ${imageUri}`, { stdio: "inherit" });

    // Update Lambda function
    execSync(
      `aws lambda update-function-code \
        --function-name ${functionName} \
        --image-uri ${imageUri} \
        --region ${region}`,
      { stdio: "inherit" },
    );

    return {
      success: true,
      metadata: {
        platform: "lambda",
        functionName,
        region,
        imageUri,
      },
    };
  }

  private generateLambdaHandler(): string {
    return `// AWS Lambda Handler
// Auto-generated by NeuroLink Deployer
// Uses AWS Lambda Web Adapter for Hono compatibility

import { app } from "./index.mjs";

// For Lambda Web Adapter
export const handler = async (event, context) => {
  // Check if running with Lambda Web Adapter
  if (process.env.AWS_LAMBDA_HTTP_PORT) {
    // Web adapter handles the conversion
    return app;
  }

  // Direct Lambda invocation
  const url = \`https://\${event.requestContext?.domainName || "localhost"}\${event.rawPath || event.path}\`;

  const request = new Request(url, {
    method: event.httpMethod || event.requestContext?.http?.method || "GET",
    headers: event.headers || {},
    body: event.body ? event.body : undefined,
  });

  const response = await app.fetch(request);

  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
    isBase64Encoded: false,
  };
};

export default handler;
`;
  }

  private generateDockerfile(): string {
    return `# NeuroLink Lambda Container
# Auto-generated by NeuroLink Deployer

# Use AWS Lambda Web Adapter base image
FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.9.0 AS adapter

# Node.js base image
FROM node:22-alpine

# Install required packages
RUN apk add --no-cache gcompat

# Set working directory
WORKDIR /app

# Copy Lambda Web Adapter
COPY --from=adapter /lambda-adapter /opt/extensions/lambda-adapter

# Copy application files
COPY . .

# Install production dependencies
RUN npm install --production

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production
ENV AWS_LAMBDA_EXEC_WRAPPER=/opt/extensions/lambda-adapter

# Create non-root user
RUN addgroup -g 1001 -S neurolink && \\
    adduser -u 1001 -S neurolink -G neurolink && \\
    chown -R neurolink:neurolink /app

USER neurolink

# Start server
CMD ["node", "index.mjs"]
`;
  }
}
```

---

## Part 6: Server Generation

### 6.1 Server Generator (`src/lib/deployer/server/serverGenerator.ts`)

```typescript
// src/lib/deployer/server/serverGenerator.ts

import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";
import { RouteGenerator } from "./routeGenerator.js";
import { OpenApiGenerator } from "./openApiGenerator.js";
import type {
  DeployConfig,
  BuildOutput,
  GeneratedServer,
  ServerConfig,
} from "../types.js";

/**
 * Server Generator - Creates Hono-based HTTP server
 *
 * Generates:
 * - Main server entry (index.mjs)
 * - API router with all routes
 * - OpenAPI documentation
 * - Playground UI (optional)
 */
export class ServerGenerator {
  private config: DeployConfig;
  private serverConfig: ServerConfig;

  constructor(config: DeployConfig) {
    this.config = config;
    this.serverConfig = config.server || {};
  }

  /**
   * Generate complete server
   */
  async generate(buildOutput: BuildOutput): Promise<GeneratedServer> {
    const routeGenerator = new RouteGenerator(this.config);
    const routes = await routeGenerator.generateRoutes();

    // Generate server code
    const serverCode = this.generateServerCode(routes);
    const routerCode = routes.code;

    // Write server entry
    const serverPath = path.join(buildOutput.outputDir, "index.mjs");
    fs.writeFileSync(serverPath, serverCode);

    // Write router
    const routerPath = path.join(buildOutput.outputDir, "router.mjs");
    fs.writeFileSync(routerPath, routerCode);

    const result: GeneratedServer = {
      code: serverCode,
      router: routerCode,
    };

    // Generate OpenAPI spec if enabled
    if (this.serverConfig.openapi) {
      const openApiGenerator = new OpenApiGenerator(this.config);
      result.openApiSpec = await openApiGenerator.generate(routes.definitions);

      const specPath = path.join(buildOutput.outputDir, "openapi.json");
      fs.writeFileSync(specPath, result.openApiSpec);
    }

    // Generate playground if enabled
    if (this.serverConfig.playground) {
      result.playgroundHtml = this.generatePlayground();

      const playgroundPath = path.join(
        buildOutput.outputDir,
        "public",
        "playground.html",
      );
      fs.writeFileSync(playgroundPath, result.playgroundHtml);
    }

    logger.info("Server generated", {
      serverPath,
      routerPath,
      hasOpenApi: !!result.openApiSpec,
      hasPlayground: !!result.playgroundHtml,
    });

    return result;
  }

  /**
   * Generate main server code
   */
  private generateServerCode(routes: { code: string }): string {
    const port = this.serverConfig.port || 8080;
    const basePath = this.serverConfig.basePath || "/api";
    const cors = this.serverConfig.cors !== false;

    return `// NeuroLink HTTP Server
// Auto-generated by NeuroLink Deployer

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { serve } from "@hono/node-server";
import { router } from "./router.mjs";

// Create Hono app
export const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", prettyJSON());
${cors ? 'app.use("*", cors());' : ""}

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// Mount API router
app.route("${basePath}", router);

// OpenAPI spec
${
  this.serverConfig.openapi
    ? `
app.get("/openapi.json", async (c) => {
  const spec = await import("./openapi.json", { assert: { type: "json" } });
  return c.json(spec.default);
});
`
    : ""
}

// Playground UI
${
  this.serverConfig.playground
    ? `
app.get("/playground", async (c) => {
  const html = await Bun.file("./public/playground.html").text();
  return c.html(html);
});
`
    : ""
}

// 404 handler
app.notFound((c) => {
  return c.json({
    error: "Not Found",
    path: c.req.path,
    method: c.req.method,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  }, 500);
});

// Start server (only when running directly)
if (import.meta.main || process.argv[1]?.endsWith("index.mjs")) {
  const port = parseInt(process.env.PORT || "${port}", 10);

  console.log(\`
╔════════════════════════════════════════════════╗
║        NeuroLink Server Started                ║
╠════════════════════════════════════════════════╣
║  URL:      http://localhost:\${port}
║  API:      http://localhost:\${port}${basePath}
${this.serverConfig.openapi ? `║  OpenAPI:  http://localhost:\${port}/openapi.json` : ""}
${this.serverConfig.playground ? `║  Playground: http://localhost:\${port}/playground` : ""}
╚════════════════════════════════════════════════╝
  \`);

  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;
`;
  }

  /**
   * Generate playground HTML
   */
  private generatePlayground(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeuroLink Playground</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 2rem; font-size: 2rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .panel {
      background: #1a1a1a;
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid #333;
    }
    h2 { margin-bottom: 1rem; font-size: 1.25rem; color: #888; }
    textarea {
      width: 100%;
      height: 200px;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 1rem;
      color: #fafafa;
      font-family: monospace;
      resize: vertical;
    }
    button {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    button:hover { background: #2563eb; }
    button:disabled { background: #666; cursor: not-allowed; }
    .response {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 1rem;
      min-height: 200px;
      font-family: monospace;
      white-space: pre-wrap;
      overflow: auto;
    }
    .streaming { color: #22c55e; }
    .error { color: #ef4444; }
    select {
      width: 100%;
      padding: 0.5rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 4px;
      color: #fafafa;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>NeuroLink Playground</h1>
    <div class="grid">
      <div class="panel">
        <h2>Input</h2>
        <select id="endpoint">
          <option value="/api/generate">Generate</option>
          <option value="/api/stream">Stream</option>
          <option value="/api/tools">List Tools</option>
        </select>
        <textarea id="input" placeholder="Enter your prompt...">Explain quantum computing in simple terms.</textarea>
        <button onclick="sendRequest()">Send Request</button>
      </div>
      <div class="panel">
        <h2>Response</h2>
        <div id="response" class="response">Response will appear here...</div>
      </div>
    </div>
  </div>
  <script>
    async function sendRequest() {
      const endpoint = document.getElementById('endpoint').value;
      const input = document.getElementById('input').value;
      const responseEl = document.getElementById('response');

      responseEl.className = 'response';
      responseEl.textContent = 'Loading...';

      try {
        if (endpoint === '/api/stream') {
          responseEl.className = 'response streaming';
          responseEl.textContent = '';

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: input }),
          });

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            responseEl.textContent += decoder.decode(value);
          }
        } else if (endpoint === '/api/tools') {
          const response = await fetch(endpoint);
          const data = await response.json();
          responseEl.textContent = JSON.stringify(data, null, 2);
        } else {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: input }),
          });
          const data = await response.json();
          responseEl.textContent = JSON.stringify(data, null, 2);
        }
      } catch (error) {
        responseEl.className = 'response error';
        responseEl.textContent = 'Error: ' + error.message;
      }
    }
  </script>
</body>
</html>`;
  }
}
```

### 6.2 Route Generator (`src/lib/deployer/server/routeGenerator.ts`)

```typescript
// src/lib/deployer/server/routeGenerator.ts

import type { DeployConfig, RouteDefinition } from "../types.js";

export type GeneratedRoutes = {
  code: string;
  definitions: RouteDefinition[];
};

/**
 * Route Generator - Creates API routes for NeuroLink endpoints
 */
export class RouteGenerator {
  private config: DeployConfig;

  constructor(config: DeployConfig) {
    this.config = config;
  }

  async generateRoutes(): Promise<GeneratedRoutes> {
    const definitions: RouteDefinition[] = [
      {
        method: "POST",
        path: "/generate",
        handler: "handleGenerate",
        description: "Generate text using AI",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The prompt to generate from",
            },
            model: { type: "string", description: "Model to use (optional)" },
            provider: {
              type: "string",
              description: "Provider to use (optional)",
            },
            temperature: { type: "number", description: "Temperature (0-1)" },
            maxTokens: {
              type: "number",
              description: "Maximum tokens to generate",
            },
          },
          required: ["prompt"],
        },
      },
      {
        method: "POST",
        path: "/stream",
        handler: "handleStream",
        description: "Stream text generation",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            model: { type: "string" },
            provider: { type: "string" },
            temperature: { type: "number" },
            maxTokens: { type: "number" },
          },
          required: ["prompt"],
        },
      },
      {
        method: "GET",
        path: "/tools",
        handler: "handleListTools",
        description: "List available tools",
      },
      {
        method: "POST",
        path: "/tools/:toolName",
        handler: "handleExecuteTool",
        description: "Execute a specific tool",
      },
      {
        method: "GET",
        path: "/providers",
        handler: "handleListProviders",
        description: "List available AI providers",
      },
      {
        method: "GET",
        path: "/models",
        handler: "handleListModels",
        description: "List available models",
      },
    ];

    const code = this.generateRouterCode(definitions);

    return { code, definitions };
  }

  private generateRouterCode(definitions: RouteDefinition[]): string {
    return `// NeuroLink API Router
// Auto-generated by NeuroLink Deployer

import { Hono } from "hono";
import { stream } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { NeuroLink } from "@juspay/neurolink";

// Initialize NeuroLink
const neurolink = new NeuroLink();

// Create router
export const router = new Hono();

// Input schemas
const generateSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().positive().optional(),
  system: z.string().optional(),
});

// POST /generate - Generate text
router.post("/generate", zValidator("json", generateSchema), async (c) => {
  const body = c.req.valid("json");

  try {
    const result = await neurolink.generate({
      prompt: body.prompt,
      model: body.model,
      provider: body.provider as any,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      system: body.system,
    });

    return c.json({
      content: result.content,
      provider: result.provider,
      model: result.model,
      usage: result.analytics?.usage,
    });
  } catch (error) {
    return c.json({
      error: (error as Error).message,
    }, 500);
  }
});

// POST /stream - Stream text generation
router.post("/stream", zValidator("json", generateSchema), async (c) => {
  const body = c.req.valid("json");

  return stream(c, async (stream) => {
    try {
      const result = await neurolink.stream({
        prompt: body.prompt,
        model: body.model,
        provider: body.provider as any,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        system: body.system,
      });

      for await (const chunk of result.stream) {
        await stream.write(chunk);
      }
    } catch (error) {
      await stream.write(\`Error: \${(error as Error).message}\`);
    }
  });
});

// GET /tools - List available tools
router.get("/tools", async (c) => {
  const tools = neurolink.getAvailableTools();
  return c.json({ tools });
});

// POST /tools/:toolName - Execute a tool
router.post("/tools/:toolName", async (c) => {
  const toolName = c.req.param("toolName");
  const body = await c.req.json();

  try {
    const result = await neurolink.executeTool(toolName, body);
    return c.json({ result });
  } catch (error) {
    return c.json({
      error: (error as Error).message,
    }, 500);
  }
});

// GET /providers - List available providers
router.get("/providers", (c) => {
  return c.json({
    providers: [
      "openai",
      "anthropic",
      "google-ai",
      "vertex",
      "bedrock",
      "azure",
      "mistral",
      "ollama",
      "huggingface",
      "litellm",
      "openrouter",
    ],
  });
});

// GET /models - List available models
router.get("/models", async (c) => {
  const provider = c.req.query("provider");
  // Implementation would list models from ModelRegistry
  return c.json({
    models: [],
    provider,
  });
});

export default router;
`;
  }
}
```

### 6.3 OpenAPI Generator (`src/lib/deployer/server/openApiGenerator.ts`)

```typescript
// src/lib/deployer/server/openApiGenerator.ts

import type { DeployConfig, RouteDefinition, OpenAPIConfig } from "../types.js";

/**
 * OpenAPI Generator - Creates OpenAPI 3.0 specification
 */
export class OpenApiGenerator {
  private config: DeployConfig;
  private openApiConfig: OpenAPIConfig;

  constructor(config: DeployConfig) {
    this.config = config;
    this.openApiConfig =
      typeof config.server?.openapi === "object" ? config.server.openapi : {};
  }

  async generate(routes: RouteDefinition[]): Promise<string> {
    const spec = {
      openapi: "3.0.3",
      info: {
        title: this.openApiConfig.title || "NeuroLink API",
        version: this.openApiConfig.version || "1.0.0",
        description:
          this.openApiConfig.description ||
          "AI-powered API built with NeuroLink",
      },
      servers: [
        {
          url: "{baseUrl}",
          variables: {
            baseUrl: {
              default: "http://localhost:8080",
              description: "API base URL",
            },
          },
        },
      ],
      paths: this.generatePaths(routes),
      components: {
        schemas: this.generateSchemas(),
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
          },
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
      },
    };

    return JSON.stringify(spec, null, 2);
  }

  private generatePaths(routes: RouteDefinition[]): Record<string, unknown> {
    const paths: Record<string, unknown> = {};

    for (const route of routes) {
      const pathKey = `/api${route.path}`;

      if (!paths[pathKey]) {
        paths[pathKey] = {};
      }

      (paths[pathKey] as Record<string, unknown>)[route.method.toLowerCase()] =
        {
          summary: route.description,
          operationId: route.handler,
          ...(route.inputSchema && route.method !== "GET"
            ? {
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: route.inputSchema,
                    },
                  },
                },
              }
            : {}),
          responses: {
            200: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: route.outputSchema || { type: "object" },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            500: {
              description: "Server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        };
    }

    return paths;
  }

  private generateSchemas(): Record<string, unknown> {
    return {
      GenerateRequest: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt to generate from",
          },
          model: { type: "string", description: "Model to use" },
          provider: { type: "string", description: "AI provider" },
          temperature: { type: "number", minimum: 0, maximum: 1 },
          maxTokens: { type: "integer", minimum: 1 },
          system: { type: "string", description: "System prompt" },
        },
        required: ["prompt"],
      },
      GenerateResponse: {
        type: "object",
        properties: {
          content: { type: "string" },
          provider: { type: "string" },
          model: { type: "string" },
          usage: {
            type: "object",
            properties: {
              promptTokens: { type: "integer" },
              completionTokens: { type: "integer" },
              totalTokens: { type: "integer" },
            },
          },
        },
      },
      Tool: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          inputSchema: { type: "object" },
          category: { type: "string" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          code: { type: "string" },
          details: { type: "object" },
        },
        required: ["error"],
      },
    };
  }
}
```

---

## Part 7: CLI Integration

### 7.1 Build Command (`src/cli/commands/build.ts`)

```typescript
// src/cli/commands/build.ts

import type { CommandModule } from "yargs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { Bundler } from "../../lib/deployer/bundler/bundler.js";
import type { DeployConfig, BuildConfig } from "../../lib/deployer/types.js";

type BuildArgs = {
  dir?: string;
  output?: string;
  sourceMaps?: boolean;
  minify?: boolean;
  external?: string[];
};

export const buildCommand: CommandModule<{}, BuildArgs> = {
  command: "build",
  describe: "Build NeuroLink application for deployment",
  builder: (yargs) =>
    yargs
      .option("dir", {
        type: "string",
        description: "Source directory (default: src/neurolink)",
        alias: "d",
      })
      .option("output", {
        type: "string",
        description: "Output directory (default: .neurolink/output)",
        alias: "o",
      })
      .option("sourceMaps", {
        type: "boolean",
        default: true,
        description: "Generate source maps",
      })
      .option("minify", {
        type: "boolean",
        default: false,
        description: "Minify output",
      })
      .option("external", {
        type: "array",
        string: true,
        description: "Packages to externalize",
      }),

  handler: async (argv) => {
    const spinner = ora("Building NeuroLink application...").start();

    try {
      const config: DeployConfig = {
        dir: argv.dir || path.join(process.cwd(), "src/neurolink"),
        outputDir: argv.output || path.join(process.cwd(), ".neurolink/output"),
        build: {
          sourceMaps: argv.sourceMaps,
          minify: argv.minify,
          external: argv.external,
        } as BuildConfig,
      };

      const bundler = new Bundler(config);
      const output = await bundler.build();

      spinner.succeed(chalk.green("Build complete!"));

      console.log("\n" + chalk.bold("Build Summary:"));
      console.log(`  Output: ${output.outputDir}`);
      console.log(`  Files: ${output.files.length}`);
      console.log(`  Duration: ${output.duration}ms`);

      if (output.warnings.length > 0) {
        console.log("\n" + chalk.yellow("Warnings:"));
        output.warnings.forEach((w) => console.log(`  - ${w}`));
      }

      console.log("\n" + chalk.dim("Next steps:"));
      console.log(
        chalk.dim(
          "  1. Test locally: cd .neurolink/output && npm install && npm start",
        ),
      );
      console.log(chalk.dim("  2. Deploy: neurolink deploy --platform vercel"));
    } catch (error) {
      spinner.fail(chalk.red("Build failed"));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  },
};
```

### 7.2 Deploy Command (`src/cli/commands/deploy.ts`)

```typescript
// src/cli/commands/deploy.ts

import type { CommandModule } from "yargs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { VercelDeployer } from "../../lib/deployer/deployers/vercelDeployer.js";
import { CloudflareDeployer } from "../../lib/deployer/deployers/cloudflareDeployer.js";
import { NetlifyDeployer } from "../../lib/deployer/deployers/netlifyDeployer.js";
import { LambdaDeployer } from "../../lib/deployer/deployers/lambdaDeployer.js";
import type { DeployConfig, BaseDeployer } from "../../lib/deployer/types.js";

type DeployArgs = {
  platform: "vercel" | "cloudflare" | "netlify" | "lambda";
  dir?: string;
  output?: string;
  dryRun?: boolean;
};

export const deployCommand: CommandModule<{}, DeployArgs> = {
  command: "deploy",
  describe: "Deploy NeuroLink application to a cloud platform",
  builder: (yargs) =>
    yargs
      .option("platform", {
        type: "string",
        choices: ["vercel", "cloudflare", "netlify", "lambda"] as const,
        required: true,
        description: "Deployment platform",
        alias: "p",
      })
      .option("dir", {
        type: "string",
        description: "Source directory",
        alias: "d",
      })
      .option("output", {
        type: "string",
        description: "Output directory",
        alias: "o",
      })
      .option("dryRun", {
        type: "boolean",
        default: false,
        description: "Build only, do not deploy",
      }),

  handler: async (argv) => {
    const spinner = ora(`Deploying to ${argv.platform}...`).start();

    try {
      const config: DeployConfig = {
        dir: argv.dir || path.join(process.cwd(), "src/neurolink"),
        outputDir: argv.output || path.join(process.cwd(), ".neurolink/output"),
        server: {
          openapi: true,
          playground: true,
        },
      };

      // Create platform-specific deployer
      let deployer: BaseDeployer;

      switch (argv.platform) {
        case "vercel":
          deployer = new VercelDeployer(config);
          break;
        case "cloudflare":
          deployer = new CloudflareDeployer(config);
          break;
        case "netlify":
          deployer = new NetlifyDeployer(config);
          break;
        case "lambda":
          deployer = new LambdaDeployer(config);
          break;
      }

      // Listen to status updates
      deployer.on("status", (status) => {
        spinner.text = status.message || status.status;
      });

      if (argv.dryRun) {
        // Build only
        await deployer.build();
        spinner.succeed(chalk.green("Build complete (dry run)"));
      } else {
        // Full deployment
        const result = await deployer.execute();

        if (result.success) {
          spinner.succeed(chalk.green("Deployment successful!"));

          if (result.url) {
            console.log("\n" + chalk.bold("Deployed URL:"));
            console.log(chalk.cyan(`  ${result.url}`));
          }
        } else {
          spinner.fail(chalk.red("Deployment failed"));
          console.error(chalk.red(result.error));
          process.exit(1);
        }
      }
    } catch (error) {
      spinner.fail(chalk.red("Deployment failed"));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  },
};
```

---

## Part 8: Implementation Guide

### Phase 1: Core Infrastructure (Week 1)

1. **Create directory structure**

   ```bash
   mkdir -p src/lib/deployer/{bundler,deployers,server,config}
   ```

2. **Implement types** (`types.ts`)

3. **Implement entry discovery** (`bundler/entryDiscovery.ts`)

4. **Implement tool aggregator** (`bundler/toolAggregator.ts`)

5. **Write unit tests**

### Phase 2: Bundler System (Week 2)

1. **Implement dependency analyzer** (`bundler/dependencyAnalyzer.ts`)

2. **Implement core bundler** (`bundler/bundler.ts`)

3. **Add Rollup plugins and configuration**

4. **Integration tests for bundling**

### Phase 3: Server Generation (Week 2-3)

1. **Implement server generator** (`server/serverGenerator.ts`)

2. **Implement route generator** (`server/routeGenerator.ts`)

3. **Implement OpenAPI generator** (`server/openApiGenerator.ts`)

4. **Test local server**

### Phase 4: Platform Deployers (Week 3-4)

1. **Implement base deployer** (`deployers/baseDeployer.ts`)

2. **Implement Vercel deployer** (`deployers/vercelDeployer.ts`)

3. **Implement Cloudflare deployer** (`deployers/cloudflareDeployer.ts`)

4. **Implement Netlify deployer** (`deployers/netlifyDeployer.ts`)

5. **Implement Lambda deployer** (`deployers/lambdaDeployer.ts`)

### Phase 5: CLI Integration (Week 4)

1. **Add build command** (`cli/commands/build.ts`)

2. **Add deploy command** (`cli/commands/deploy.ts`)

3. **Update parser to include commands**

4. **Documentation and examples**

---

## Part 9: Usage Examples

### Basic Build

```bash
# Build NeuroLink application
neurolink build

# Build with custom directory
neurolink build --dir ./my-app

# Build with minification
neurolink build --minify
```

### Platform Deployment

```bash
# Deploy to Vercel
neurolink deploy --platform vercel

# Deploy to Cloudflare Workers
neurolink deploy --platform cloudflare

# Deploy to Netlify
neurolink deploy --platform netlify

# Deploy to AWS Lambda
neurolink deploy --platform lambda

# Dry run (build only)
neurolink deploy --platform vercel --dry-run
```

### Configuration File (`neurolink.config.ts`)

```typescript
import { defineConfig } from "@juspay/neurolink/deployer";
import { VercelDeployer } from "@juspay/neurolink/deployers";

export default defineConfig({
  dir: "src/neurolink",
  outputDir: ".neurolink/output",

  server: {
    port: 8080,
    cors: true,
    basePath: "/api",
    openapi: {
      title: "My AI API",
      version: "1.0.0",
    },
    playground: true,
  },

  build: {
    sourceMaps: true,
    treeShake: true,
    minify: process.env.NODE_ENV === "production",
    external: ["canvas", "sharp"],
  },

  deployer: new VercelDeployer({
    maxDuration: 60,
    memory: 1024,
    regions: ["iad1", "sfo1"],
  }),

  env: {
    NODE_ENV: "production",
  },
});
```

### Programmatic Usage

```typescript
import { Bundler, VercelDeployer } from "@juspay/neurolink/deployer";

// Build
const bundler = new Bundler({
  dir: "./src/neurolink",
  build: { minify: true },
});

const output = await bundler.build();
console.log(`Built ${output.files.length} files in ${output.duration}ms`);

// Deploy
const deployer = new VercelDeployer({
  dir: "./src/neurolink",
  server: { openapi: true },
});

deployer.on("status", (status) => {
  console.log(`[${status.status}] ${status.message}`);
});

const result = await deployer.execute();
console.log(`Deployed to: ${result.url}`);
```

---

## File Summary

| File                                               | Description                 |
| -------------------------------------------------- | --------------------------- |
| `src/lib/deployer/types.ts`                        | Type definitions            |
| `src/lib/deployer/bundler/entryDiscovery.ts`       | Entry file scanning         |
| `src/lib/deployer/bundler/toolAggregator.ts`       | Tool collection and export  |
| `src/lib/deployer/bundler/dependencyAnalyzer.ts`   | Bundle vs external analysis |
| `src/lib/deployer/bundler/bundler.ts`              | Core Rollup bundler         |
| `src/lib/deployer/deployers/baseDeployer.ts`       | Abstract base deployer      |
| `src/lib/deployer/deployers/vercelDeployer.ts`     | Vercel integration          |
| `src/lib/deployer/deployers/cloudflareDeployer.ts` | Cloudflare Workers          |
| `src/lib/deployer/deployers/netlifyDeployer.ts`    | Netlify Functions           |
| `src/lib/deployer/deployers/lambdaDeployer.ts`     | AWS Lambda                  |
| `src/lib/deployer/server/serverGenerator.ts`       | Hono server generation      |
| `src/lib/deployer/server/routeGenerator.ts`        | API route generation        |
| `src/lib/deployer/server/openApiGenerator.ts`      | OpenAPI spec generation     |
| `src/cli/commands/build.ts`                        | CLI build command           |
| `src/cli/commands/deploy.ts`                       | CLI deploy command          |

---

## References

**Mastra Documentation:**

- [Serverless Deployment](https://mastra.ai/docs/deployment/deployment)
- [Building Mastra](https://mastra.ai/docs/deployment/building-mastra)
- [VercelDeployer Reference](https://mastra.ai/reference/deployer/vercel)
- [CloudflareDeployer Reference](https://mastra.ai/reference/deployer/cloudflare)

**NeuroLink Codebase:**

- Build System: `/tools/automation/buildSystem.js`
- CLI Entry: `/src/cli/index.ts`
- Vite Config: `/vite.config.ts`
- TypeScript Config: `/tsconfig.cli.json`

**External Resources:**

- [Rollup Documentation](https://rollupjs.org/)
- [Hono Framework](https://hono.dev/)
- [Vercel Output API](https://vercel.com/docs/build-output-api/v3)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter)

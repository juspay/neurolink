/**
 * Deployment System Type Definitions
 *
 * Comprehensive types for the NeuroLink deployment system supporting
 * multi-platform deployment to Vercel, Cloudflare Workers, Netlify, and AWS Lambda.
 *
 * @packageDocumentation
 * @module @juspay/neurolink/deployer
 * @category Deployment
 */

// ==================
// Core Types
// ==================

/**
 * Supported deployment platforms
 */
export type DeploymentPlatform = "vercel" | "cloudflare" | "netlify" | "lambda";

/**
 * Deployment configuration
 */
export type DeployConfig = {
  /** Target deployment platform */
  platform: DeploymentPlatform;

  /** Entry file path */
  entry: string;

  /** Output directory for build artifacts */
  outDir: string;

  /** Environment variables to include */
  env?: Record<string, string>;

  /** Deployment region */
  region?: string;
};

/**
 * Deployment result
 */
export type DeployResult = {
  /** Deployed URL */
  url: string;

  /** Deployment ID */
  deploymentId: string;

  /** Deployment status */
  status: "success" | "failed" | "pending";

  /** Deployment logs */
  logs?: string[];
};

/**
 * Deployer interface
 */
export type Deployer = {
  /** Deployer name */
  name: DeploymentPlatform;

  /** Build the application for deployment */
  build: (config: DeployConfig) => Promise<void>;

  /** Deploy the application */
  deploy: (config: DeployConfig) => Promise<DeployResult>;

  /** Get deployment status */
  getStatus: (deploymentId: string) => Promise<DeployResult>;
};

// ==================
// Extended Configuration Types
// ==================

/**
 * Server configuration for generated HTTP server
 */
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
};

/**
 * OpenAPI documentation configuration
 */
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

/**
 * Build configuration options
 */
export type BuildConfig = {
  /** Enable source maps */
  sourceMaps?: boolean;

  /** Enable tree-shaking */
  treeShake?: boolean;

  /** Packages to always externalize */
  external?: string[];

  /** Packages to always bundle */
  noExternal?: string[];

  /** Minify output */
  minify?: boolean;

  /** Target environment */
  target?: "node" | "edge" | "worker";
};

// ==================
// Output Types
// ==================

/**
 * Build output result
 */
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

/**
 * Output file information
 */
export type OutputFile = {
  /** File path relative to output dir */
  path: string;

  /** File size in bytes */
  size: number;

  /** File type */
  type: "js" | "dts" | "json" | "html" | "css" | "map";
};

// ==================
// Platform-Specific Types
// ==================

/**
 * Vercel deployer configuration
 */
export type VercelDeployerConfig = {
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

/**
 * Cloudflare Workers deployer configuration
 */
export type CloudflareDeployerConfig = {
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

/**
 * Netlify deployer configuration
 */
export type NetlifyDeployerConfig = {
  /** Site ID */
  siteId?: string;

  /** Functions directory */
  functionsDir?: string;

  /** Node bundler */
  nodeBundler?: "esbuild" | "zisi";

  /** Included files */
  includedFiles?: string[];
};

/**
 * AWS Lambda deployer configuration
 */
export type LambdaDeployerConfig = {
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

// ==================
// Entry Discovery Types
// ==================

/**
 * Entry file information
 */
export type EntryFile = {
  /** Absolute path to entry file */
  path: string;

  /** Entry type */
  type: "main" | "tools" | "config" | "routes";

  /** Exports from this file */
  exports: string[];
};

/**
 * Discovered entries result
 */
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

/**
 * Discovered tool information
 */
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

/**
 * Aggregated tools result
 */
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

/**
 * Information about a single dependency
 */
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

/**
 * Complete dependency analysis result
 */
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
// CLI Types
// ==================

/**
 * Deploy CLI command arguments
 */
export type DeployCommandArgs = {
  /** Target platform */
  platform: DeploymentPlatform;

  /** Configuration file path */
  config?: string;

  /** Enable verbose output */
  verbose?: boolean;
};

/**
 * Build CLI command arguments
 */
export type BuildCommandArgs = {
  /** Target platform */
  platform: DeploymentPlatform;

  /** Enable source maps */
  sourceMaps?: boolean;

  /** Enable minification */
  minify?: boolean;

  /** External packages */
  external?: string[];
};

/**
 * Status CLI command arguments
 */
export type StatusCommandArgs = {
  /** Deployment ID */
  deploymentId?: string;
};

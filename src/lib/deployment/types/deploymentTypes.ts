/**
 * Deployment System Type Definitions
 *
 * Comprehensive types for the NeuroLink deployment system supporting
 * multi-platform deployment to Vercel, Cloudflare Workers, Netlify,
 * AWS Lambda, Docker, and Fly.io.
 *
 * @packageDocumentation
 * @module @neurolink/deployment
 */

// ==================
// Core Types
// ==================

/**
 * Supported deployment platforms
 */
export type DeploymentPlatform =
  | "vercel"
  | "cloudflare"
  | "netlify"
  | "lambda"
  | "docker"
  | "flyio";

/**
 * Supported bundler types
 */
export type BundlerType = "esbuild" | "vite";

/**
 * Deployment status
 */
export type DeploymentStatus =
  | "pending"
  | "building"
  | "deploying"
  | "success"
  | "failed"
  | "cancelled";

/**
 * Build target environment
 */
export type BuildTarget = "node" | "edge" | "worker" | "browser";

// ==================
// Configuration Types
// ==================

/**
 * Main deployment configuration
 */
export interface DeployConfig {
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

  /** Server configuration */
  server?: ServerConfig;

  /** Build configuration */
  build?: BuildConfig;

  /** Platform-specific configuration */
  platformConfig?: PlatformConfig;
}

/**
 * Server configuration for generated HTTP server
 */
export interface ServerConfig {
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
}

/**
 * OpenAPI documentation configuration
 */
export interface OpenAPIConfig {
  /** API title */
  title?: string;

  /** API version */
  version?: string;

  /** API description */
  description?: string;

  /** OpenAPI spec output path */
  outputPath?: string;
}

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  /** Middleware name */
  name: string;

  /** Path pattern to apply middleware */
  path?: string;

  /** Handler function reference */
  handler: string;
}

/**
 * Build configuration options
 */
export interface BuildConfig {
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
  target?: BuildTarget;

  /** Bundler to use */
  bundler?: BundlerType;

  /** Bundler-specific options */
  bundlerOptions?: ESBuildOptions | ViteOptions;
}

/**
 * ESBuild bundler options
 */
export interface ESBuildOptions {
  /** Target ES version */
  target?: string;

  /** Format (esm, cjs, iife) */
  format?: "esm" | "cjs" | "iife";

  /** Platform (node, browser, neutral) */
  platform?: "node" | "browser" | "neutral";

  /** Enable splitting for code splitting */
  splitting?: boolean;

  /** Inject polyfills */
  inject?: string[];

  /** Define replacements */
  define?: Record<string, string>;

  /** Loader mappings */
  loader?: Record<string, string>;
}

/**
 * Vite bundler options
 */
export interface ViteOptions {
  /** Vite mode */
  mode?: "development" | "production";

  /** SSR configuration */
  ssr?: boolean;

  /** Build target */
  target?: string | string[];

  /** CSS configuration */
  css?: {
    modules?: boolean;
    preprocessorOptions?: Record<string, unknown>;
  };
}

// ==================
// Platform-Specific Configurations
// ==================

/**
 * Union type for platform-specific configurations
 */
export type PlatformConfig =
  | VercelDeployerConfig
  | CloudflareDeployerConfig
  | NetlifyDeployerConfig
  | LambdaDeployerConfig
  | DockerDeployerConfig
  | FlyioDeployerConfig;

/**
 * Vercel deployer configuration
 */
export interface VercelDeployerConfig {
  platform: "vercel";

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

  /** Vercel API token */
  token?: string;

  /** Enable edge runtime */
  edge?: boolean;
}

/**
 * Cloudflare Workers deployer configuration
 */
export interface CloudflareDeployerConfig {
  platform: "cloudflare";

  /** Worker name */
  workerName?: string;

  /** Account ID */
  accountId?: string;

  /** API token */
  apiToken?: string;

  /** Route patterns */
  routes?: Array<{
    pattern: string;
    zone_id?: string;
    zone_name?: string;
  }>;

  /** KV namespace bindings */
  kvNamespaces?: Array<{
    binding: string;
    id: string;
    preview_id?: string;
  }>;

  /** D1 database bindings */
  d1Databases?: Array<{
    binding: string;
    database_id: string;
    database_name: string;
  }>;

  /** Durable Objects bindings */
  durableObjects?: Array<{
    name: string;
    class_name: string;
    script_name?: string;
  }>;

  /** Compatibility date */
  compatibilityDate?: string;

  /** Compatibility flags */
  compatibilityFlags?: string[];
}

/**
 * Netlify Functions deployer configuration
 */
export interface NetlifyDeployerConfig {
  platform: "netlify";

  /** Site ID */
  siteId?: string;

  /** Auth token */
  authToken?: string;

  /** Functions directory */
  functionsDir?: string;

  /** Edge functions directory */
  edgeFunctionsDir?: string;

  /** Build command */
  buildCommand?: string;

  /** Publish directory */
  publishDir?: string;

  /** Function timeout (seconds) */
  timeout?: number;

  /** Enable edge functions */
  edge?: boolean;
}

/**
 * AWS Lambda deployer configuration
 */
export interface LambdaDeployerConfig {
  platform: "lambda";

  /** Lambda function name */
  functionName: string;

  /** Lambda execution role ARN */
  role?: string;

  /** Runtime (nodejs18.x, nodejs20.x, etc.) */
  runtime?: string;

  /** Handler function path */
  handler?: string;

  /** Memory size (MB) */
  memorySize?: number;

  /** Timeout (seconds) */
  timeout?: number;

  /** VPC configuration */
  vpc?: {
    subnetIds: string[];
    securityGroupIds: string[];
  };

  /** Environment variables */
  environment?: Record<string, string>;

  /** AWS region */
  region?: string;

  /** Enable provisioned concurrency */
  provisionedConcurrency?: number;

  /** Use Docker for deployment */
  useDocker?: boolean;

  /** ECR repository for Docker images */
  ecrRepository?: string;

  /** API Gateway configuration */
  apiGateway?: {
    enabled: boolean;
    stage?: string;
    cors?: boolean;
  };
}

/**
 * Docker deployer configuration
 */
export interface DockerDeployerConfig {
  platform: "docker";

  /** Docker image name */
  imageName: string;

  /** Docker image tag */
  imageTag?: string;

  /** Registry URL */
  registry?: string;

  /** Registry credentials */
  credentials?: {
    username: string;
    password: string;
  };

  /** Dockerfile path */
  dockerfile?: string;

  /** Build arguments */
  buildArgs?: Record<string, string>;

  /** Container port */
  port?: number;

  /** Health check configuration */
  healthCheck?: {
    path: string;
    interval?: number;
    timeout?: number;
    retries?: number;
  };

  /** Multi-stage build */
  multistage?: boolean;

  /** Push to registry */
  push?: boolean;
}

/**
 * Fly.io deployer configuration
 */
export interface FlyioDeployerConfig {
  platform: "flyio";

  /** Fly.io app name */
  appName: string;

  /** Organization slug */
  org?: string;

  /** Primary region */
  primaryRegion?: string;

  /** Additional regions */
  regions?: string[];

  /** Machine size (shared-cpu-1x, etc.) */
  machineSize?: string;

  /** Memory allocation (MB) */
  memory?: number;

  /** CPU count */
  cpus?: number;

  /** Auto-scaling configuration */
  autoscaling?: {
    minMachines?: number;
    maxMachines?: number;
    metric?: "requests" | "connections" | "cpu";
    target?: number;
  };

  /** Volume configuration */
  volumes?: Array<{
    name: string;
    size: number;
    path: string;
  }>;

  /** HTTP service configuration */
  httpService?: {
    internalPort: number;
    forceHttps?: boolean;
    autoStopMachines?: boolean;
    autoStartMachines?: boolean;
  };
}

// ==================
// Output Types
// ==================

/**
 * Deployment result
 */
export interface DeployResult {
  /** Whether deployment was successful */
  success: boolean;

  /** Deployed URL */
  url?: string;

  /** Deployment ID */
  deploymentId?: string;

  /** Deployment status */
  status: DeploymentStatus;

  /** Deployment logs */
  logs?: string[];

  /** Error message if failed */
  error?: string;

  /** Deployment timestamp */
  timestamp: Date;

  /** Deployment duration (ms) */
  duration?: number;

  /** Platform-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Build output result
 */
export interface BuildOutput {
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

  /** Build errors (if partial success) */
  errors?: string[];

  /** Bundle size information */
  bundleSize: BundleSizeInfo;
}

/**
 * Output file information
 */
export interface OutputFile {
  /** File path relative to output dir */
  path: string;

  /** File size in bytes */
  size: number;

  /** File type */
  type: "js" | "ts" | "dts" | "json" | "html" | "css" | "map" | "other";

  /** Source map path (if applicable) */
  sourceMap?: string;
}

/**
 * Bundle size information
 */
export interface BundleSizeInfo {
  /** Total size in bytes */
  total: number;

  /** Gzipped size in bytes */
  gzipped: number;

  /** Size breakdown by file type */
  byType: Record<string, number>;
}

// ==================
// Entry Discovery Types
// ==================

/**
 * Entry file information
 */
export interface EntryFile {
  /** Absolute path to entry file */
  path: string;

  /** Entry type */
  type: "main" | "tools" | "config" | "routes" | "middleware";

  /** Exports from this file */
  exports: string[];
}

/**
 * Discovered entries from project scanning
 */
export interface DiscoveredEntries {
  /** Main entry file */
  main?: EntryFile;

  /** Tool definition files */
  tools: EntryFile[];

  /** Configuration file */
  config?: EntryFile;

  /** Custom route files */
  routes: EntryFile[];

  /** Middleware files */
  middleware: EntryFile[];
}

// ==================
// Dependency Analysis Types
// ==================

/**
 * Dependency information
 */
export interface DependencyInfo {
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

  /** Has native bindings */
  hasNativeBindings?: boolean;
}

/**
 * Dependency analysis result
 */
export interface DependencyAnalysis {
  /** Dependencies to bundle */
  bundled: DependencyInfo[];

  /** Dependencies to externalize */
  external: DependencyInfo[];

  /** Peer dependencies */
  peer: DependencyInfo[];

  /** Total bundle size estimate */
  estimatedBundleSize: number;

  /** Analysis warnings */
  warnings: string[];
}

// ==================
// Validation Types
// ==================

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Field path */
  field?: string;

  /** Suggested fix */
  suggestion?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;

  /** Warning message */
  message: string;

  /** Field path */
  field?: string;
}

// ==================
// Event Types
// ==================

/**
 * Deployment events
 */
export interface DeploymentEvents {
  [key: string]: unknown;
  "build:start": { config: DeployConfig };
  "build:progress": { phase: string; progress: number; message: string };
  "build:complete": { output: BuildOutput };
  "build:error": { error: Error };
  "deploy:start": { platform: DeploymentPlatform };
  "deploy:progress": { phase: string; progress: number; message: string };
  "deploy:complete": { result: DeployResult };
  "deploy:error": { error: Error };
  "validation:start": undefined;
  "validation:complete": { result: ValidationResult };
}

// ==================
// Deployer Interface
// ==================

/**
 * Base deployer interface that all platform deployers must implement
 */
export interface IDeployer {
  /** Deployer name */
  readonly name: DeploymentPlatform;

  /** Validate the deployment configuration */
  validate(config: DeployConfig): Promise<ValidationResult>;

  /** Build the application for deployment */
  build(config: DeployConfig): Promise<BuildOutput>;

  /** Deploy the application */
  deploy(config: DeployConfig): Promise<DeployResult>;

  /** Get deployment status */
  getStatus(deploymentId: string): Promise<DeployResult>;

  /** Cancel a deployment */
  cancel?(deploymentId: string): Promise<void>;

  /** Rollback to previous deployment */
  rollback?(deploymentId: string): Promise<DeployResult>;

  /** Get deployment logs */
  getLogs?(deploymentId: string): Promise<string[]>;
}

// ==================
// Bundler Interface
// ==================

/**
 * Base bundler interface
 */
export interface IBundler {
  /** Bundler name */
  readonly name: BundlerType;

  /** Bundle the application */
  bundle(config: BuildConfig, entries: DiscoveredEntries): Promise<BuildOutput>;

  /** Watch mode for development */
  watch?(
    config: BuildConfig,
    entries: DiscoveredEntries,
    onChange: (output: BuildOutput) => void,
  ): Promise<{ close: () => void }>;

  /** Get estimated bundle size */
  estimateSize?(entries: DiscoveredEntries): Promise<BundleSizeInfo>;
}

// ==================
// Environment Manager Types
// ==================

/**
 * Environment variable configuration
 */
export interface EnvironmentVariable {
  /** Variable name */
  name: string;

  /** Variable value */
  value: string;

  /** Whether the variable is secret */
  secret?: boolean;

  /** Environment scope */
  scope?: "build" | "runtime" | "all";

  /** Description */
  description?: string;
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  /** Environment name */
  name: string;

  /** Environment variables */
  variables: EnvironmentVariable[];

  /** Inherit from other environments */
  inherits?: string[];
}

// ==================
// Registry Metadata
// ==================

/**
 * Deployer registry metadata
 */
export interface DeployerMetadata {
  /** Platform name */
  platform: DeploymentPlatform;

  /** Display name */
  displayName: string;

  /** Description */
  description: string;

  /** Supported features */
  features: string[];

  /** Required configuration fields */
  requiredConfig: string[];

  /** Documentation URL */
  docsUrl?: string;
}

/**
 * Bundler registry metadata
 */
export interface BundlerMetadata {
  /** Bundler type */
  type: BundlerType;

  /** Display name */
  displayName: string;

  /** Description */
  description: string;

  /** Supported targets */
  supportedTargets: BuildTarget[];

  /** Default options */
  defaultOptions: Record<string, unknown>;
}

// ==================
// Tool Discovery Types
// ==================

/**
 * Discovered tool information
 */
export interface DiscoveredTool {
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
}

/**
 * Aggregated tools result
 */
export interface AggregatedTools {
  /** All discovered tools */
  tools: DiscoveredTool[];

  /** Generated tools export file content */
  exportContent: string;

  /** Tool registry initialization code */
  registryCode: string;
}

# NeuroLink Deployment System - Configuration Guide

This document details all configuration options for the NeuroLink Deployment System across all supported platforms.

## Table of Contents

- [Common Configuration](#common-configuration)
- [Platform-Specific Configuration](#platform-specific-configuration)
  - [Vercel](#vercel)
  - [Cloudflare Workers](#cloudflare-workers)
  - [Netlify](#netlify)
  - [AWS Lambda](#aws-lambda)
  - [Docker](#docker)
  - [Fly.io](#flyio)
- [Bundler Configuration](#bundler-configuration)
  - [ESBuild](#esbuild)
  - [Vite](#vite)
- [Environment Variables](#environment-variables)

## Common Configuration

All deployment configurations share these common options:

```typescript
interface DeployConfig {
  platform: DeploymentPlatform; // "vercel" | "cloudflare" | "netlify" | "lambda" | "docker" | "flyio"
  entry: string; // Entry point file path
  outDir: string; // Output directory for build
  env?: Record<string, string>; // Environment variables
  platformConfig?: PlatformConfig; // Platform-specific configuration
}
```

## Platform-Specific Configuration

### Vercel

```typescript
interface VercelDeployerConfig {
  platform: "vercel";

  // Function configuration
  maxDuration?: number; // Max execution time in seconds (default: 10, max: 300 on Pro)
  memory?: number; // Memory allocation in MB (128, 256, 512, 1024, 3008)
  regions?: string[]; // Deployment regions (e.g., ["iad1", "sfo1", "hnd1"])

  // Function type
  edge?: boolean; // Deploy as Edge Function (default: false)

  // Build settings
  framework?: string; // Framework preset (auto-detected if not specified)
  buildCommand?: string; // Custom build command
  outputDirectory?: string; // Output directory override

  // Environment
  environment?: "production" | "preview" | "development";
}
```

**Supported Regions:**

- `iad1` - Washington, D.C., USA
- `sfo1` - San Francisco, USA
- `hnd1` - Tokyo, Japan
- `cdg1` - Paris, France
- `sin1` - Singapore
- And more...

### Cloudflare Workers

```typescript
interface CloudflareDeployerConfig {
  platform: "cloudflare";

  // Worker configuration
  workerName: string; // Worker name (required)
  accountId?: string; // Cloudflare account ID
  compatibility_date?: string; // Workers compatibility date (e.g., "2024-01-01")
  compatibility_flags?: string[]; // Compatibility flags (e.g., ["nodejs_compat"])

  // Routing
  routes?: Array<{
    pattern: string; // Route pattern (e.g., "api.example.com/*")
    zone_name?: string; // Zone name
    zone_id?: string; // Zone ID
  }>;

  // Bindings
  kv_namespaces?: Array<{
    binding: string; // Binding name in code
    id: string; // KV namespace ID
  }>;

  d1_databases?: Array<{
    binding: string; // Binding name in code
    database_name: string; // Database name
    database_id: string; // Database ID
  }>;

  r2_buckets?: Array<{
    binding: string; // Binding name in code
    bucket_name: string; // Bucket name
  }>;

  // Environment variables
  vars?: Record<string, string>;

  // Secrets (set via wrangler secret)
  secrets?: string[];
}
```

### Netlify

```typescript
interface NetlifyDeployerConfig {
  platform: "netlify";

  // Site configuration
  siteId?: string; // Netlify site ID
  siteName?: string; // Netlify site name

  // Functions configuration
  functionsDir?: string; // Functions directory (default: "netlify/functions")
  nodeBundler?: "esbuild" | "nft"; // Bundler for functions (default: "esbuild")

  // Edge Functions
  edge?: boolean; // Deploy as Edge Function

  // Build settings
  buildCommand?: string; // Custom build command
  publishDir?: string; // Publish directory

  // File handling
  includedFiles?: string[]; // Files to include in deployment

  // Redirects and headers
  redirects?: Array<{
    from: string;
    to: string;
    status?: number;
    force?: boolean;
  }>;
}
```

### AWS Lambda

```typescript
interface LambdaDeployerConfig {
  platform: "lambda";

  // Function configuration
  functionName: string; // Lambda function name (required)
  region?: string; // AWS region (default: "us-east-1")
  runtime?: string; // Runtime (default: "nodejs20.x")
  memorySize?: number; // Memory in MB (128-10240, default: 512)
  timeout?: number; // Timeout in seconds (1-900, default: 30)

  // Execution role
  role?: string; // IAM role ARN

  // Function URL
  functionUrl?: boolean; // Enable Function URL (default: true)

  // VPC configuration
  vpc?: {
    subnetIds: string[];
    securityGroupIds: string[];
  };

  // Environment variables
  environment?: Record<string, string>;

  // Container deployment
  useDocker?: boolean; // Deploy as container image
  ecrRepository?: string; // ECR repository name

  // Layers
  layers?: string[]; // Lambda layer ARNs

  // Provisioned concurrency
  provisionedConcurrency?: number;
}
```

### Docker

```typescript
interface DockerDeployerConfig {
  platform: "docker";

  // Image configuration
  imageName: string; // Docker image name (required)
  registry?: string; // Container registry (e.g., "docker.io/myorg")
  tag?: string; // Image tag (default: "latest")

  // Build configuration
  dockerfile?: string; // Dockerfile path (default: "Dockerfile")
  context?: string; // Build context (default: ".")
  baseImage?: string; // Base image (default: "node:20-alpine")

  // Runtime configuration
  port?: number; // Exposed port (default: 8080)

  // Health check
  healthCheck?: {
    path: string; // Health check endpoint
    interval?: number; // Check interval in seconds
    timeout?: number; // Timeout in seconds
    retries?: number; // Number of retries
  };

  // Labels
  labels?: Record<string, string>;

  // Build args
  buildArgs?: Record<string, string>;

  // Multi-stage build
  target?: string; // Target stage for multi-stage build
}
```

### Fly.io

```typescript
interface FlyioDeployerConfig {
  platform: "flyio";

  // App configuration
  appName: string; // Fly.io app name (required)
  primaryRegion: string; // Primary region (required, e.g., "sea")
  regions?: string[]; // Additional regions

  // Scaling
  autoscaling?: {
    min: number; // Minimum instances
    max: number; // Maximum instances
  };

  // Volumes
  volumes?: Array<{
    name: string; // Volume name
    mountPath: string; // Mount path in container
    size: number; // Size in GB
  }>;

  // Secrets
  secrets?: string[]; // Secret names (set via flyctl secrets)

  // HTTP service
  httpService?: {
    internalPort: number; // Internal port (default: 8080)
    forceHttps?: boolean; // Force HTTPS (default: true)
    autoStopMachines?: boolean; // Auto-stop idle machines
    autoStartMachines?: boolean; // Auto-start on request
    minMachinesRunning?: number; // Minimum running machines
  };

  // Resources
  vm?: {
    cpuKind?: "shared" | "performance";
    cpus?: number;
    memoryMb?: number;
  };
}
```

## Bundler Configuration

### ESBuild

```typescript
interface ESBuildConfig {
  type: "esbuild";

  // Entry and output
  entry: string; // Entry point
  outDir: string; // Output directory

  // Build options
  bundle?: boolean; // Bundle dependencies (default: true)
  minify?: boolean; // Minify output (default: true in production)
  sourcemap?: boolean; // Generate sourcemaps (default: true)

  // Target
  target?: string; // Target environment (e.g., "node20", "es2022")
  format?: "esm" | "cjs"; // Output format (default: "esm")
  platform?: "node" | "browser" | "neutral";

  // Tree shaking
  treeShaking?: boolean; // Enable tree shaking (default: true)

  // External packages
  external?: string[]; // Packages to exclude from bundle

  // Define
  define?: Record<string, string>;

  // Banner/Footer
  banner?: { js?: string; css?: string };
  footer?: { js?: string; css?: string };
}
```

### Vite

```typescript
interface ViteConfig {
  type: "vite";

  // Entry and output
  entry: string;
  outDir: string;

  // Build options
  build?: {
    lib?: {
      entry: string;
      formats: ("es" | "cjs" | "umd" | "iife")[];
      fileName?: string;
    };
    minify?: "esbuild" | "terser" | false;
    sourcemap?: boolean | "inline" | "hidden";
    target?: string;

    // Rollup options
    rollupOptions?: {
      external?: string[];
      output?: {
        format?: string;
        globals?: Record<string, string>;
      };
    };

    // SSR
    ssr?: boolean | string;
  };

  // Define
  define?: Record<string, string>;

  // Optimize deps
  optimizeDeps?: {
    include?: string[];
    exclude?: string[];
  };
}
```

## Environment Variables

### Required by Platform

| Variable                | Vercel   | Cloudflare | Netlify  | Lambda   | Docker   | Fly.io   |
| ----------------------- | -------- | ---------- | -------- | -------- | -------- | -------- |
| `VERCEL_TOKEN`          | Required | -          | -        | -        | -        | -        |
| `CLOUDFLARE_API_TOKEN`  | -        | Required   | -        | -        | -        | -        |
| `CLOUDFLARE_ACCOUNT_ID` | -        | Optional   | -        | -        | -        | -        |
| `NETLIFY_AUTH_TOKEN`    | -        | -          | Required | -        | -        | -        |
| `AWS_ACCESS_KEY_ID`     | -        | -          | -        | Required | -        | -        |
| `AWS_SECRET_ACCESS_KEY` | -        | -          | -        | Required | -        | -        |
| `AWS_REGION`            | -        | -          | -        | Required | -        | -        |
| `DOCKER_USERNAME`       | -        | -          | -        | -        | Optional | -        |
| `DOCKER_PASSWORD`       | -        | -          | -        | -        | Optional | -        |
| `FLY_ACCESS_TOKEN`      | -        | -          | -        | -        | -        | Required |

### NeuroLink SDK Variables

These are typically needed for the deployed application:

| Variable                | Description                        |
| ----------------------- | ---------------------------------- |
| `OPENAI_API_KEY`        | OpenAI API key                     |
| `ANTHROPIC_API_KEY`     | Anthropic API key                  |
| `GOOGLE_AI_API_KEY`     | Google AI Studio API key           |
| `GOOGLE_VERTEX_PROJECT` | Google Cloud project for Vertex AI |
| `AWS_BEDROCK_REGION`    | AWS region for Bedrock             |
| `AZURE_OPENAI_API_KEY`  | Azure OpenAI API key               |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint              |

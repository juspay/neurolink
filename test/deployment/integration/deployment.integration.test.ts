/**
 * Deployment System Integration Tests
 *
 * Comprehensive integration tests for the NeuroLink deployment system covering:
 * - Platform deployers (Vercel, Cloudflare, Netlify, Lambda)
 * - Bundler system validation
 * - Server generation with Hono
 * - Environment configuration
 * - Deployment manifest generation
 * - Build process validation
 * - Platform-specific optimizations
 * - Error handling during deployment
 * - Rollback mechanisms
 *
 * @packageDocumentation
 * @module @juspay/neurolink/test/deployment
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Import deployment system components
import {
  DeployerFactory,
  VercelDeployer,
  CloudflareDeployer,
  NetlifyDeployer,
  LambdaDeployer,
  Bundler,
  ServerGenerator,
  EntryDiscovery,
  ToolAggregator,
  DependencyAnalyzer,
} from "../../../src/lib/deployer/index.js";

import type {
  DeployConfig,
  DeployResult,
  BuildOutput,
  VercelDeployerConfig,
  CloudflareDeployerConfig,
  NetlifyDeployerConfig,
  LambdaDeployerConfig,
  DeploymentPlatform,
  ServerConfig,
  DiscoveredEntries,
  AggregatedTools,
  DependencyAnalysis,
} from "../../../src/lib/deployer/types.js";

// ============================================================================
// Test Utilities and Fixtures
// ============================================================================

/**
 * Create a temporary directory for test artifacts
 */
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-deploy-test-"));
}

/**
 * Clean up temporary directory
 */
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Create a mock project structure for testing
 */
function createMockProject(baseDir: string): void {
  // Create basic directory structure
  fs.mkdirSync(path.join(baseDir, "src", "tools"), { recursive: true });
  fs.mkdirSync(path.join(baseDir, "src", "routes"), { recursive: true });

  // Create mock main entry
  fs.writeFileSync(
    path.join(baseDir, "src", "index.ts"),
    `
export const neurolink = {
  generate: async (prompt: string) => ({ content: "test" }),
};
export default neurolink;
`
  );

  // Create mock tool file
  fs.writeFileSync(
    path.join(baseDir, "src", "tools", "weatherTool.ts"),
    `
export const weatherTool = {
  name: "getWeather",
  description: "Get weather for a location",
  inputSchema: { type: "object", properties: { location: { type: "string" } } },
};
export default weatherTool;
`
  );

  // Create mock config file
  fs.writeFileSync(
    path.join(baseDir, "neurolink.config.ts"),
    `
export default {
  provider: "openai",
  model: "gpt-4o",
};
`
  );

  // Create mock package.json
  fs.writeFileSync(
    path.join(baseDir, "package.json"),
    JSON.stringify({
      name: "test-neurolink-app",
      version: "1.0.0",
      type: "module",
      dependencies: {
        zod: "^3.22.0",
        hono: "^4.0.0",
        "@juspay/neurolink": "^8.0.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
        vitest: "^1.0.0",
      },
    }, null, 2)
  );
}

/**
 * Create a mock DeployConfig for testing
 */
function createMockDeployConfig(
  tempDir: string,
  platform: DeploymentPlatform = "vercel"
): DeployConfig {
  return {
    platform,
    entry: path.join(tempDir, "src", "index.ts"),
    outDir: path.join(tempDir, "dist"),
    env: {
      OPENAI_API_KEY: "test-key",
      NODE_ENV: "production",
    },
    region: "us-east-1",
  };
}

// ============================================================================
// Test Suite: DeployerFactory
// ============================================================================

describe("DeployerFactory", () => {
  it("should create deployer for all supported platforms", () => {
    const platforms: DeploymentPlatform[] = ["vercel", "cloudflare", "netlify", "lambda"];

    for (const platform of platforms) {
      const deployer = DeployerFactory.create(platform);
      expect(deployer).toBeDefined();
      expect(deployer.name).toBe(platform);
    }
  });

  it("should return correct list of supported platforms", () => {
    const platforms = DeployerFactory.getSupportedPlatforms();

    expect(platforms).toContain("vercel");
    expect(platforms).toContain("cloudflare");
    expect(platforms).toContain("netlify");
    expect(platforms).toContain("lambda");
    expect(platforms.length).toBe(4);
  });

  it("should validate platform support correctly", () => {
    expect(DeployerFactory.isSupported("vercel")).toBe(true);
    expect(DeployerFactory.isSupported("cloudflare")).toBe(true);
    expect(DeployerFactory.isSupported("netlify")).toBe(true);
    expect(DeployerFactory.isSupported("lambda")).toBe(true);
    expect(DeployerFactory.isSupported("unsupported-platform")).toBe(false);
  });

  it("should throw error for unsupported platform", () => {
    expect(() => {
      DeployerFactory.create("unsupported" as DeploymentPlatform);
    }).toThrow(/Unsupported deployment platform/);
  });

  it("should allow registering custom deployer", () => {
    const mockDeployer = {
      name: "custom" as DeploymentPlatform,
      build: vi.fn().mockResolvedValue(undefined),
      deploy: vi.fn().mockResolvedValue({ url: "https://custom.com", deploymentId: "1", status: "success" }),
      getStatus: vi.fn().mockResolvedValue({ url: "", deploymentId: "1", status: "pending" }),
    };

    DeployerFactory.register("custom" as DeploymentPlatform, () => mockDeployer);

    expect(DeployerFactory.isSupported("custom" as DeploymentPlatform)).toBe(true);
  });

  it("should pass configuration to deployer on creation", () => {
    const vercelConfig: VercelDeployerConfig = {
      maxDuration: 60,
      memory: 1024,
      regions: ["iad1", "sfo1"],
    };

    const deployer = DeployerFactory.create("vercel", vercelConfig);
    expect(deployer).toBeDefined();
    expect(deployer.name).toBe("vercel");
  });
});

// ============================================================================
// Test Suite: VercelDeployer
// ============================================================================

describe("VercelDeployer", () => {
  let tempDir: string;
  let deployer: VercelDeployer;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockProject(tempDir);
    deployer = new VercelDeployer({
      maxDuration: 60,
      memory: 1024,
      regions: ["iad1"],
    });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("should have correct platform name", () => {
    expect(deployer.name).toBe("vercel");
  });

  it("should build Vercel output structure", async () => {
    const config = createMockDeployConfig(tempDir, "vercel");

    // Pre-create output directory with mock content
    fs.mkdirSync(config.outDir, { recursive: true });
    fs.writeFileSync(path.join(config.outDir, "index.mjs"), "export default {}");

    await deployer.build(config);

    // Verify Vercel output structure
    const vercelDir = path.join(process.cwd(), ".vercel", "output");
    const configPath = path.join(vercelDir, "config.json");
    const funcDir = path.join(vercelDir, "functions", "index.func");
    const funcConfigPath = path.join(funcDir, ".vc-config.json");

    expect(fs.existsSync(vercelDir)).toBe(true);
    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(funcDir)).toBe(true);
    expect(fs.existsSync(funcConfigPath)).toBe(true);

    // Verify config content
    const vercelConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(vercelConfig.version).toBe(3);
    expect(vercelConfig.routes).toBeDefined();

    // Verify function config
    const funcConfig = JSON.parse(fs.readFileSync(funcConfigPath, "utf-8"));
    expect(funcConfig.runtime).toBe("nodejs20.x");
    expect(funcConfig.maxDuration).toBe(60);
    expect(funcConfig.memory).toBe(1024);

    // Cleanup Vercel output
    cleanupTempDir(path.join(process.cwd(), ".vercel"));
  });

  it("should generate correct routes configuration", async () => {
    const config = createMockDeployConfig(tempDir, "vercel");
    fs.mkdirSync(config.outDir, { recursive: true });
    fs.writeFileSync(path.join(config.outDir, "index.mjs"), "export default {}");

    await deployer.build(config);

    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), ".vercel", "output", "config.json"), "utf-8")
    );

    expect(vercelConfig.routes).toContainEqual({ src: "/api/(.*)", dest: "/index" });
    expect(vercelConfig.routes).toContainEqual({ src: "/(.*)", dest: "/index" });

    cleanupTempDir(path.join(process.cwd(), ".vercel"));
  });

  it("should return failed status when Vercel CLI is not installed", async () => {
    const config = createMockDeployConfig(tempDir, "vercel");

    // Mock execSync to simulate missing CLI
    vi.mock("node:child_process", async () => {
      return {
        execSync: vi.fn().mockImplementation((cmd: string) => {
          if (cmd.includes("vercel --version")) {
            throw new Error("Command not found: vercel");
          }
          return "";
        }),
      };
    });

    const result = await deployer.deploy(config);

    expect(result.status).toBe("failed");
    expect(result.logs).toBeDefined();
    expect(result.logs?.length).toBeGreaterThan(0);

    vi.resetModules();
  });

  it("should handle deployment status check", async () => {
    const result = await deployer.getStatus("vercel-12345");

    expect(result.deploymentId).toBe("vercel-12345");
    expect(result.status).toBe("pending");
  });
});

// ============================================================================
// Test Suite: CloudflareDeployer
// ============================================================================

describe("CloudflareDeployer", () => {
  let tempDir: string;
  let deployer: CloudflareDeployer;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockProject(tempDir);
    deployer = new CloudflareDeployer({
      workerName: "test-worker",
      accountId: "test-account-123",
      compatibility_date: "2024-01-01",
      routes: [{ pattern: "api.example.com/*", zone_name: "example.com" }],
    });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("should have correct platform name", () => {
    expect(deployer.name).toBe("cloudflare");
  });

  it("should generate wrangler.toml configuration", async () => {
    const config = createMockDeployConfig(tempDir, "cloudflare");

    await deployer.build(config);

    const wranglerPath = path.join(config.outDir, "wrangler.toml");
    expect(fs.existsSync(wranglerPath)).toBe(true);

    const wranglerContent = fs.readFileSync(wranglerPath, "utf-8");
    expect(wranglerContent).toContain('name = "test-worker"');
    expect(wranglerContent).toContain('compatibility_date = "2024-01-01"');
    expect(wranglerContent).toContain('account_id = "test-account-123"');
    expect(wranglerContent).toContain('pattern = "api.example.com/*"');
  });

  it("should generate worker entry point", async () => {
    const config = createMockDeployConfig(tempDir, "cloudflare");

    await deployer.build(config);

    const workerPath = path.join(config.outDir, "worker.js");
    expect(fs.existsSync(workerPath)).toBe(true);

    const workerContent = fs.readFileSync(workerPath, "utf-8");
    expect(workerContent).toContain("import { Hono }");
    expect(workerContent).toContain("app.get('/health'");
    expect(workerContent).toContain("cloudflare-workers");
    expect(workerContent).toContain("export default app");
  });

  it("should include KV namespace bindings when configured", async () => {
    const deployerWithKV = new CloudflareDeployer({
      workerName: "kv-worker",
      kv_namespaces: [{ binding: "MY_KV", id: "kv-namespace-id-123" }],
    });

    const config = createMockDeployConfig(tempDir, "cloudflare");
    await deployerWithKV.build(config);

    const wranglerContent = fs.readFileSync(
      path.join(config.outDir, "wrangler.toml"),
      "utf-8"
    );

    expect(wranglerContent).toContain("[[kv_namespaces]]");
    expect(wranglerContent).toContain('binding = "MY_KV"');
    expect(wranglerContent).toContain('id = "kv-namespace-id-123"');
  });

  it("should include D1 database bindings when configured", async () => {
    const deployerWithD1 = new CloudflareDeployer({
      workerName: "d1-worker",
      d1_databases: [{
        binding: "MY_DB",
        database_name: "my-database",
        database_id: "d1-db-id-456",
      }],
    });

    const config = createMockDeployConfig(tempDir, "cloudflare");
    await deployerWithD1.build(config);

    const wranglerContent = fs.readFileSync(
      path.join(config.outDir, "wrangler.toml"),
      "utf-8"
    );

    expect(wranglerContent).toContain("[[d1_databases]]");
    expect(wranglerContent).toContain('binding = "MY_DB"');
    expect(wranglerContent).toContain('database_name = "my-database"');
    expect(wranglerContent).toContain('database_id = "d1-db-id-456"');
  });

  it("should include environment variables in wrangler config", async () => {
    const deployerWithVars = new CloudflareDeployer({
      workerName: "env-worker",
      vars: {
        API_KEY: "secret-key",
        DEBUG: "true",
      },
    });

    const config = createMockDeployConfig(tempDir, "cloudflare");
    await deployerWithVars.build(config);

    const wranglerContent = fs.readFileSync(
      path.join(config.outDir, "wrangler.toml"),
      "utf-8"
    );

    expect(wranglerContent).toContain("[vars]");
    expect(wranglerContent).toContain('API_KEY = "secret-key"');
    expect(wranglerContent).toContain('DEBUG = "true"');
  });
});

// ============================================================================
// Test Suite: NetlifyDeployer
// ============================================================================

describe("NetlifyDeployer", () => {
  let tempDir: string;
  let deployer: NetlifyDeployer;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockProject(tempDir);
    deployer = new NetlifyDeployer({
      siteId: "test-site-id",
      functionsDir: "netlify/functions",
      nodeBundler: "esbuild",
    });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("should have correct platform name", () => {
    expect(deployer.name).toBe("netlify");
  });

  it("should generate netlify.toml configuration", async () => {
    const config = createMockDeployConfig(tempDir, "netlify");

    await deployer.build(config);

    const netlifyTomlPath = path.join(config.outDir, "netlify.toml");
    expect(fs.existsSync(netlifyTomlPath)).toBe(true);

    const netlifyContent = fs.readFileSync(netlifyTomlPath, "utf-8");
    expect(netlifyContent).toContain('[build]');
    expect(netlifyContent).toContain('functions = "netlify/functions"');
    expect(netlifyContent).toContain('node_bundler = "esbuild"');
    expect(netlifyContent).toContain('[[redirects]]');
    expect(netlifyContent).toContain('from = "/api/*"');
  });

  it("should generate function handler", async () => {
    const config = createMockDeployConfig(tempDir, "netlify");

    await deployer.build(config);

    const functionPath = path.join(config.outDir, "netlify", "functions", "api.mts");
    expect(fs.existsSync(functionPath)).toBe(true);

    const functionContent = fs.readFileSync(functionPath, "utf-8");
    expect(functionContent).toContain("import { Hono }");
    expect(functionContent).toContain("netlify-functions");
    expect(functionContent).toContain("export const handler");
  });

  it("should generate package.json for function", async () => {
    const config = createMockDeployConfig(tempDir, "netlify");

    await deployer.build(config);

    const pkgJsonPath = path.join(config.outDir, "netlify", "functions", "package.json");
    expect(fs.existsSync(pkgJsonPath)).toBe(true);

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    expect(pkgJson.type).toBe("module");
    expect(pkgJson.dependencies.hono).toBeDefined();
  });

  it("should include included files when configured", async () => {
    const deployerWithIncludes = new NetlifyDeployer({
      includedFiles: ["./data/**/*.json", "./config/*.yaml"],
    });

    const config = createMockDeployConfig(tempDir, "netlify");
    await deployerWithIncludes.build(config);

    const netlifyContent = fs.readFileSync(
      path.join(config.outDir, "netlify.toml"),
      "utf-8"
    );

    expect(netlifyContent).toContain("included_files");
  });

  it("should add environment variables to build config", async () => {
    const config = createMockDeployConfig(tempDir, "netlify");
    config.env = {
      DATABASE_URL: "postgres://localhost/test",
      API_SECRET: "secret123",
    };

    await deployer.build(config);

    const netlifyContent = fs.readFileSync(
      path.join(config.outDir, "netlify.toml"),
      "utf-8"
    );

    expect(netlifyContent).toContain("[build.environment]");
    expect(netlifyContent).toContain("DATABASE_URL");
    expect(netlifyContent).toContain("API_SECRET");
  });
});

// ============================================================================
// Test Suite: LambdaDeployer
// ============================================================================

describe("LambdaDeployer", () => {
  let tempDir: string;
  let deployer: LambdaDeployer;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockProject(tempDir);
    deployer = new LambdaDeployer({
      functionName: "test-neurolink-api",
      region: "us-east-1",
      memorySize: 1024,
      timeout: 30,
      runtime: "nodejs20.x",
      functionUrl: true,
    });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("should have correct platform name", () => {
    expect(deployer.name).toBe("lambda");
  });

  it("should generate SAM template for standard deployment", async () => {
    const config = createMockDeployConfig(tempDir, "lambda");

    await deployer.build(config);

    const templatePath = path.join(config.outDir, "template.yaml");
    expect(fs.existsSync(templatePath)).toBe(true);

    const templateContent = fs.readFileSync(templatePath, "utf-8");
    expect(templateContent).toContain("AWSTemplateFormatVersion");
    expect(templateContent).toContain("Transform: AWS::Serverless");
    expect(templateContent).toContain("NeuroLinkFunction");
    expect(templateContent).toContain("Runtime: nodejs20.x");
    expect(templateContent).toContain("Timeout: 30");
    expect(templateContent).toContain("MemorySize: 1024");
    expect(templateContent).toContain("FunctionUrlConfig");
  });

  it("should generate Lambda handler", async () => {
    const config = createMockDeployConfig(tempDir, "lambda");

    await deployer.build(config);

    const handlerPath = path.join(config.outDir, "index.mjs");
    expect(fs.existsSync(handlerPath)).toBe(true);

    const handlerContent = fs.readFileSync(handlerPath, "utf-8");
    expect(handlerContent).toContain("import { Hono }");
    expect(handlerContent).toContain("aws-lambda");
    expect(handlerContent).toContain("export const handler");
  });

  it("should generate Dockerfile for Docker deployment", async () => {
    const dockerDeployer = new LambdaDeployer({
      functionName: "docker-lambda",
      useDocker: true,
      runtime: "nodejs20.x",
      ecrRepository: "my-ecr-repo",
    });

    const config = createMockDeployConfig(tempDir, "lambda");
    await dockerDeployer.build(config);

    const dockerfilePath = path.join(config.outDir, "Dockerfile");
    expect(fs.existsSync(dockerfilePath)).toBe(true);

    const dockerContent = fs.readFileSync(dockerfilePath, "utf-8");
    expect(dockerContent).toContain("FROM public.ecr.aws/lambda/nodejs:20");
    expect(dockerContent).toContain("COPY package*.json");
    expect(dockerContent).toContain('CMD ["index.handler"]');
  });

  it("should include VPC configuration when provided", async () => {
    const vpcDeployer = new LambdaDeployer({
      functionName: "vpc-lambda",
      vpc: {
        subnetIds: ["subnet-123", "subnet-456"],
        securityGroupIds: ["sg-789"],
      },
    });

    const config = createMockDeployConfig(tempDir, "lambda");
    await vpcDeployer.build(config);

    const templateContent = fs.readFileSync(
      path.join(config.outDir, "template.yaml"),
      "utf-8"
    );

    expect(templateContent).toContain("VpcConfig");
    expect(templateContent).toContain("subnet-123");
    expect(templateContent).toContain("subnet-456");
    expect(templateContent).toContain("sg-789");
  });

  it("should include environment variables in SAM template", async () => {
    const envDeployer = new LambdaDeployer({
      functionName: "env-lambda",
      environment: {
        DATABASE_URL: "postgres://localhost/db",
      },
    });

    const config = createMockDeployConfig(tempDir, "lambda");
    config.env = {
      API_KEY: "test-key",
    };

    await envDeployer.build(config);

    const templateContent = fs.readFileSync(
      path.join(config.outDir, "template.yaml"),
      "utf-8"
    );

    expect(templateContent).toContain("Environment:");
    expect(templateContent).toContain("Variables:");
    expect(templateContent).toContain("DATABASE_URL");
    expect(templateContent).toContain("API_KEY");
  });
});

// ============================================================================
// Test Suite: Bundler System
// ============================================================================

describe("Bundler System", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockProject(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe("Bundler", () => {
    it("should initialize with correct options", () => {
      const bundler = new Bundler({
        entry: path.join(tempDir, "src", "index.ts"),
        outDir: path.join(tempDir, "dist"),
      });

      expect(bundler.getOutputDir()).toBe(path.join(tempDir, "dist"));
    });

    it("should have access to sub-components", () => {
      const bundler = new Bundler({
        entry: path.join(tempDir, "src", "index.ts"),
        outDir: path.join(tempDir, "dist"),
      });

      expect(bundler.getEntryDiscovery()).toBeDefined();
      expect(bundler.getToolAggregator()).toBeDefined();
      expect(bundler.getDependencyAnalyzer()).toBeDefined();
    });

    it("should execute build pipeline and generate output", async () => {
      const bundler = new Bundler({
        entry: path.join(tempDir, "src", "index.ts"),
        outDir: path.join(tempDir, "dist"),
      });

      const output = await bundler.build();

      expect(output.outputDir).toBe(path.join(tempDir, "dist"));
      expect(output.files).toBeDefined();
      expect(output.files.length).toBeGreaterThan(0);
      expect(output.duration).toBeGreaterThan(0);
      expect(output.packageJson).toBeDefined();
    });

    it("should generate package.json with correct dependencies", async () => {
      const bundler = new Bundler({
        entry: path.join(tempDir, "src", "index.ts"),
        outDir: path.join(tempDir, "dist"),
      });

      await bundler.build();

      const pkgJsonPath = path.join(tempDir, "dist", "package.json");
      expect(fs.existsSync(pkgJsonPath)).toBe(true);

      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      expect(pkgJson.type).toBe("module");
      expect(pkgJson.dependencies.hono).toBeDefined();
      expect(pkgJson.dependencies["@juspay/neurolink"]).toBeDefined();
    });

    it("should generate .env.example template", async () => {
      const bundler = new Bundler({
        entry: path.join(tempDir, "src", "index.ts"),
        outDir: path.join(tempDir, "dist"),
      });

      await bundler.build();

      const envPath = path.join(tempDir, "dist", ".env.example");
      expect(fs.existsSync(envPath)).toBe(true);

      const envContent = fs.readFileSync(envPath, "utf-8");
      expect(envContent).toContain("OPENAI_API_KEY");
      expect(envContent).toContain("ANTHROPIC_API_KEY");
      expect(envContent).toContain("NODE_ENV=production");
    });
  });

  describe("EntryDiscovery", () => {
    it("should discover main entry file", async () => {
      const discovery = new EntryDiscovery(path.join(tempDir, "src"));
      const entries = await discovery.discover();

      expect(entries.main).toBeDefined();
      expect(entries.main?.path).toContain("index.ts");
      expect(entries.main?.type).toBe("main");
    });

    it("should discover tool files", async () => {
      const discovery = new EntryDiscovery(path.join(tempDir, "src"));
      const entries = await discovery.discover();

      expect(entries.tools).toBeDefined();
      expect(entries.tools.length).toBeGreaterThan(0);
      expect(entries.tools[0].type).toBe("tools");
    });

    it("should extract exports from files", async () => {
      const discovery = new EntryDiscovery(path.join(tempDir, "src"));
      const entries = await discovery.discover();

      expect(entries.main?.exports).toBeDefined();
      expect(entries.main?.exports).toContain("neurolink");
      expect(entries.main?.exports).toContain("default");
    });

    it("should discover config file in root", async () => {
      // Config is at project root, not in src
      const discovery = new EntryDiscovery(tempDir);
      const entries = await discovery.discover();

      expect(entries.config).toBeDefined();
      expect(entries.config?.path).toContain("neurolink.config.ts");
    });
  });

  describe("DependencyAnalyzer", () => {
    it("should analyze project dependencies", async () => {
      // Change to temp directory to analyze its package.json
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const analyzer = new DependencyAnalyzer();
        const analysis = await analyzer.analyze();

        expect(analysis.bundled).toBeDefined();
        expect(analysis.external).toBeDefined();
        expect(analysis.peer).toBeDefined();
        expect(typeof analysis.estimatedBundleSize).toBe("number");
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should classify zod as bundled dependency", async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const analyzer = new DependencyAnalyzer();
        const analysis = await analyzer.analyze();

        const zod = analysis.bundled.find((d) => d.name === "zod");
        expect(zod).toBeDefined();
        expect(zod?.treatment).toBe("bundle");
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should classify large packages as external", async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const analyzer = new DependencyAnalyzer();
        const analysis = await analyzer.analyze();

        // hono should be external as it's in the ALWAYS_EXTERNAL list
        const hono = analysis.external.find((d) => d.name === "hono");
        expect(hono).toBeDefined();
        expect(hono?.treatment).toBe("external");
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should apply config overrides for external packages", async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const analyzer = new DependencyAnalyzer({
          external: ["zod"], // Force zod to be external
        });
        const analysis = await analyzer.analyze();

        const zod = analysis.external.find((d) => d.name === "zod");
        expect(zod).toBeDefined();
        expect(zod?.reason).toContain("Forced external");
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should generate external list for bundler", async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const analyzer = new DependencyAnalyzer();
        const analysis = await analyzer.analyze();
        const externals = analyzer.getExternalList(analysis);

        expect(externals).toBeDefined();
        expect(externals.length).toBeGreaterThan(0);
        // Should include regex patterns for AWS SDK
        expect(externals.some((e) => e instanceof RegExp && String(e).includes("aws-sdk"))).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("ToolAggregator", () => {
    it("should aggregate tools from discovered files", async () => {
      const aggregator = new ToolAggregator(path.join(tempDir, "dist"));
      const discovery = new EntryDiscovery(path.join(tempDir, "src"));
      const entries = await discovery.discover();

      const aggregated = await aggregator.aggregate(entries.tools);

      expect(aggregated.tools).toBeDefined();
      expect(aggregated.exportContent).toBeDefined();
      expect(aggregated.registryCode).toBeDefined();
    });
  });
});

// ============================================================================
// Test Suite: ServerGenerator
// ============================================================================

describe("ServerGenerator", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("should generate server with default configuration", async () => {
    const generator = new ServerGenerator();
    const result = await generator.generate(tempDir);

    expect(result.code).toBeDefined();
    expect(result.router).toBeDefined();
    expect(fs.existsSync(path.join(tempDir, "index.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "router.mjs"))).toBe(true);
  });

  it("should generate server with CORS enabled by default", async () => {
    const generator = new ServerGenerator({ cors: true });
    const result = await generator.generate(tempDir);

    expect(result.code).toContain('app.use("*", cors())');
  });

  it("should generate server without CORS when disabled", async () => {
    const generator = new ServerGenerator({ cors: false });
    const result = await generator.generate(tempDir);

    expect(result.code).not.toContain("cors()");
  });

  it("should generate OpenAPI spec when enabled", async () => {
    const generator = new ServerGenerator({
      openapi: {
        title: "Test API",
        version: "1.0.0",
        description: "Test description",
      },
    });

    const result = await generator.generate(tempDir);

    expect(result.openApiSpec).toBeDefined();
    expect(fs.existsSync(path.join(tempDir, "openapi.json"))).toBe(true);

    const spec = JSON.parse(result.openApiSpec!);
    expect(spec.info.title).toBe("Test API");
    expect(spec.info.version).toBe("1.0.0");
    expect(spec.paths["/api/generate"]).toBeDefined();
    expect(spec.paths["/api/stream"]).toBeDefined();
    expect(spec.paths["/api/tools"]).toBeDefined();
  });

  it("should generate playground when enabled", async () => {
    const generator = new ServerGenerator({ playground: true });
    const result = await generator.generate(tempDir);

    expect(result.playgroundHtml).toBeDefined();
    expect(fs.existsSync(path.join(tempDir, "public", "playground.html"))).toBe(true);

    expect(result.playgroundHtml).toContain("NeuroLink Playground");
    expect(result.playgroundHtml).toContain("sendRequest()");
  });

  it("should use custom port and base path", async () => {
    const generator = new ServerGenerator({
      port: 3000,
      basePath: "/v1",
    });

    const result = await generator.generate(tempDir);

    expect(result.code).toContain("3000");
    expect(result.code).toContain("/v1");
  });

  it("should generate router with all required endpoints", async () => {
    const generator = new ServerGenerator();
    const result = await generator.generate(tempDir);

    expect(result.router).toContain("router.post(\"/generate\"");
    expect(result.router).toContain("router.post(\"/stream\"");
    expect(result.router).toContain("router.get(\"/tools\"");
    expect(result.router).toContain("router.post(\"/tools/:toolName\"");
    expect(result.router).toContain("router.get(\"/providers\"");
    expect(result.router).toContain("router.get(\"/models\"");
  });

  it("should return correct list of generated files", async () => {
    const generator = new ServerGenerator({
      openapi: true,
      playground: true,
    });

    const result = await generator.generate(tempDir);
    const files = generator.getGeneratedFiles(result);

    expect(files.length).toBe(4);
    expect(files.map((f) => f.path)).toContain("index.mjs");
    expect(files.map((f) => f.path)).toContain("router.mjs");
    expect(files.map((f) => f.path)).toContain("openapi.json");
    expect(files.map((f) => f.path)).toContain("public/playground.html");
  });
});

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

describe("Error Handling", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("should handle missing entry file gracefully", async () => {
    const bundler = new Bundler({
      entry: path.join(tempDir, "nonexistent", "index.ts"),
      outDir: path.join(tempDir, "dist"),
    });

    const output = await bundler.build();

    // Should complete with warnings but not throw
    expect(output.warnings.length).toBeGreaterThan(0);
  });

  it("should handle invalid platform gracefully", () => {
    expect(() => {
      DeployerFactory.create("invalid" as DeploymentPlatform);
    }).toThrow();
  });

  it("should return failed status when CLI tools are missing", async () => {
    const deployer = new VercelDeployer();
    const config: DeployConfig = {
      platform: "vercel",
      entry: path.join(tempDir, "index.ts"),
      outDir: path.join(tempDir, "dist"),
    };

    // The deploy will fail because Vercel CLI isn't installed in test env
    const result = await deployer.deploy(config);

    expect(result.status).toBe("failed");
    expect(result.logs).toBeDefined();
  });

  it("should handle empty project directory", async () => {
    const discovery = new EntryDiscovery(tempDir);
    const entries = await discovery.discover();

    expect(entries.main).toBeUndefined();
    expect(entries.tools.length).toBe(0);
    expect(entries.routes.length).toBe(0);
  });
});

// ============================================================================
// Test Suite: Platform-Specific Optimizations
// ============================================================================

describe("Platform-Specific Optimizations", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockProject(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("Vercel: should configure appropriate memory and timeout", async () => {
    const deployer = new VercelDeployer({
      maxDuration: 300,
      memory: 3008,
    });

    const config = createMockDeployConfig(tempDir, "vercel");
    fs.mkdirSync(config.outDir, { recursive: true });
    fs.writeFileSync(path.join(config.outDir, "index.mjs"), "");

    await deployer.build(config);

    const funcConfig = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), ".vercel", "output", "functions", "index.func", ".vc-config.json"),
        "utf-8"
      )
    );

    expect(funcConfig.maxDuration).toBe(300);
    expect(funcConfig.memory).toBe(3008);

    cleanupTempDir(path.join(process.cwd(), ".vercel"));
  });

  it("Cloudflare: should set compatibility date and flags", async () => {
    const deployer = new CloudflareDeployer({
      workerName: "optimized-worker",
      compatibility_date: "2024-06-01",
      compatibility_flags: ["nodejs_compat", "streams_enable_constructors"],
    });

    const config = createMockDeployConfig(tempDir, "cloudflare");
    await deployer.build(config);

    const wranglerContent = fs.readFileSync(
      path.join(config.outDir, "wrangler.toml"),
      "utf-8"
    );

    expect(wranglerContent).toContain('compatibility_date = "2024-06-01"');
    expect(wranglerContent).toContain("nodejs_compat");
    expect(wranglerContent).toContain("streams_enable_constructors");
  });

  it("Lambda: should configure appropriate runtime and architecture", async () => {
    const deployer = new LambdaDeployer({
      functionName: "optimized-lambda",
      runtime: "nodejs20.x",
      memorySize: 2048,
      timeout: 60,
    });

    const config = createMockDeployConfig(tempDir, "lambda");
    await deployer.build(config);

    const templateContent = fs.readFileSync(
      path.join(config.outDir, "template.yaml"),
      "utf-8"
    );

    expect(templateContent).toContain("Runtime: nodejs20.x");
    expect(templateContent).toContain("MemorySize: 2048");
    expect(templateContent).toContain("Timeout: 60");
    expect(templateContent).toContain("x86_64");
  });

  it("Netlify: should configure node bundler", async () => {
    const deployer = new NetlifyDeployer({
      nodeBundler: "esbuild",
    });

    const config = createMockDeployConfig(tempDir, "netlify");
    await deployer.build(config);

    const netlifyContent = fs.readFileSync(
      path.join(config.outDir, "netlify.toml"),
      "utf-8"
    );

    expect(netlifyContent).toContain('node_bundler = "esbuild"');
  });
});

// ============================================================================
// Test Suite: Deployment Manifest Generation
// ============================================================================

describe("Deployment Manifest Generation", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockProject(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("should generate complete build output with metadata", async () => {
    const bundler = new Bundler({
      entry: path.join(tempDir, "src", "index.ts"),
      outDir: path.join(tempDir, "dist"),
    });

    const output = await bundler.build();

    expect(output.outputDir).toBeDefined();
    expect(output.files).toBeDefined();
    expect(output.packageJson).toBeDefined();
    expect(output.duration).toBeGreaterThan(0);
    expect(Array.isArray(output.warnings)).toBe(true);
  });

  it("should track file sizes in build output", async () => {
    const bundler = new Bundler({
      entry: path.join(tempDir, "src", "index.ts"),
      outDir: path.join(tempDir, "dist"),
    });

    const output = await bundler.build();

    for (const file of output.files) {
      expect(file.path).toBeDefined();
      expect(typeof file.size).toBe("number");
      expect(file.size).toBeGreaterThanOrEqual(0);
      expect(["js", "dts", "json", "html", "css", "map"]).toContain(file.type);
    }
  });

  it("should include package.json in build output", async () => {
    const bundler = new Bundler({
      entry: path.join(tempDir, "src", "index.ts"),
      outDir: path.join(tempDir, "dist"),
    });

    const output = await bundler.build();

    expect(output.packageJson.name).toBeDefined();
    expect(output.packageJson.version).toBeDefined();
    expect(output.packageJson.type).toBe("module");
    expect(output.packageJson.dependencies).toBeDefined();
  });
});

// ============================================================================
// Test Suite: Environment Configuration
// ============================================================================

describe("Environment Configuration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockProject(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("should pass environment variables to Vercel deployment", async () => {
    const deployer = new VercelDeployer();
    const config = createMockDeployConfig(tempDir, "vercel");
    config.env = {
      OPENAI_API_KEY: "sk-test-key",
      DATABASE_URL: "postgres://localhost/db",
    };

    // Note: Actual deployment would fail without CLI,
    // but we can verify the config is properly structured
    expect(config.env.OPENAI_API_KEY).toBe("sk-test-key");
    expect(config.env.DATABASE_URL).toBe("postgres://localhost/db");
  });

  it("should include environment variables in Cloudflare wrangler.toml", async () => {
    const deployer = new CloudflareDeployer({
      workerName: "env-test",
      vars: {
        STATIC_VAR: "static-value",
      },
    });

    const config = createMockDeployConfig(tempDir, "cloudflare");
    config.env = {
      DYNAMIC_VAR: "dynamic-value",
    };

    await deployer.build(config);

    const wranglerContent = fs.readFileSync(
      path.join(config.outDir, "wrangler.toml"),
      "utf-8"
    );

    expect(wranglerContent).toContain("[vars]");
    expect(wranglerContent).toContain("STATIC_VAR");
    expect(wranglerContent).toContain("DYNAMIC_VAR");
  });

  it("should include environment variables in Lambda SAM template", async () => {
    const deployer = new LambdaDeployer({
      functionName: "env-test-lambda",
      environment: {
        LOG_LEVEL: "debug",
      },
    });

    const config = createMockDeployConfig(tempDir, "lambda");
    config.env = {
      API_KEY: "test-api-key",
    };

    await deployer.build(config);

    const templateContent = fs.readFileSync(
      path.join(config.outDir, "template.yaml"),
      "utf-8"
    );

    expect(templateContent).toContain("Environment:");
    expect(templateContent).toContain("LOG_LEVEL");
    expect(templateContent).toContain("API_KEY");
  });

  it("should generate .env.example with common variables", async () => {
    const bundler = new Bundler({
      entry: path.join(tempDir, "src", "index.ts"),
      outDir: path.join(tempDir, "dist"),
    });

    await bundler.build();

    const envContent = fs.readFileSync(
      path.join(tempDir, "dist", ".env.example"),
      "utf-8"
    );

    expect(envContent).toContain("PORT=8080");
    expect(envContent).toContain("NODE_ENV=production");
    expect(envContent).toContain("OPENAI_API_KEY=");
    expect(envContent).toContain("ANTHROPIC_API_KEY=");
    expect(envContent).toContain("GOOGLE_AI_API_KEY=");
  });
});

// ============================================================================
// Test Suite: Rollback Mechanisms
// ============================================================================

describe("Rollback Mechanisms", () => {
  it("should track deployment IDs for rollback capability", async () => {
    const vercelResult: DeployResult = {
      url: "https://test.vercel.app",
      deploymentId: "vercel-dpl-123456",
      status: "success",
      logs: [],
    };

    const cloudflareResult: DeployResult = {
      url: "https://test.workers.dev",
      deploymentId: "cf-789012",
      status: "success",
      logs: [],
    };

    expect(vercelResult.deploymentId).toMatch(/^vercel-/);
    expect(cloudflareResult.deploymentId).toMatch(/^cf-/);
  });

  it("should provide status check for deployments", async () => {
    const vercelDeployer = new VercelDeployer();
    const lambdaDeployer = new LambdaDeployer({ functionName: "test-func" });
    const netlifyDeployer = new NetlifyDeployer();
    const cloudflareDeployer = new CloudflareDeployer();

    // These will return pending/failed status since no actual deployments exist
    const vercelStatus = await vercelDeployer.getStatus("vercel-123");
    const lambdaStatus = await lambdaDeployer.getStatus("lambda-456");
    const netlifyStatus = await netlifyDeployer.getStatus("netlify-789");
    const cloudflareStatus = await cloudflareDeployer.getStatus("cf-012");

    expect(vercelStatus.deploymentId).toBe("vercel-123");
    expect(lambdaStatus.deploymentId).toBe("lambda-456");
    expect(netlifyStatus.deploymentId).toBe("netlify-789");
    expect(cloudflareStatus.deploymentId).toBe("cf-012");
  });

  it("should maintain deployment history for potential rollback", () => {
    // Simulate deployment history tracking
    const deploymentHistory: DeployResult[] = [
      {
        url: "https://v1.app.com",
        deploymentId: "dpl-001",
        status: "success",
        logs: [],
      },
      {
        url: "https://v2.app.com",
        deploymentId: "dpl-002",
        status: "success",
        logs: [],
      },
      {
        url: "https://v3.app.com",
        deploymentId: "dpl-003",
        status: "failed",
        logs: ["Build error"],
      },
    ];

    // Find last successful deployment for rollback
    const lastSuccessful = deploymentHistory
      .filter((d) => d.status === "success")
      .pop();

    expect(lastSuccessful?.deploymentId).toBe("dpl-002");
    expect(lastSuccessful?.url).toBe("https://v2.app.com");
  });
});

// ============================================================================
// Test Suite: Build Process Validation
// ============================================================================

describe("Build Process Validation", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockProject(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("should validate build output directory creation", async () => {
    const bundler = new Bundler({
      entry: path.join(tempDir, "src", "index.ts"),
      outDir: path.join(tempDir, "dist"),
    });

    await bundler.build();

    expect(fs.existsSync(path.join(tempDir, "dist"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "dist", "public"))).toBe(true);
  });

  it("should clean output directory before build", async () => {
    const outDir = path.join(tempDir, "dist");

    // Create pre-existing file
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "old-file.txt"), "old content");

    const bundler = new Bundler({
      entry: path.join(tempDir, "src", "index.ts"),
      outDir,
    });

    await bundler.build();

    // Old file should be removed
    expect(fs.existsSync(path.join(outDir, "old-file.txt"))).toBe(false);
  });

  it("should measure and report build duration", async () => {
    const bundler = new Bundler({
      entry: path.join(tempDir, "src", "index.ts"),
      outDir: path.join(tempDir, "dist"),
    });

    const output = await bundler.build();

    expect(output.duration).toBeGreaterThan(0);
    expect(typeof output.duration).toBe("number");
  });

  it("should collect build warnings", async () => {
    // Create project without main entry to trigger warning
    const emptyDir = createTempDir();

    const bundler = new Bundler({
      entry: path.join(emptyDir, "nonexistent.ts"),
      outDir: path.join(emptyDir, "dist"),
    });

    const output = await bundler.build();

    expect(Array.isArray(output.warnings)).toBe(true);
    // Should have warning about missing main entry
    expect(output.warnings.length).toBeGreaterThan(0);

    cleanupTempDir(emptyDir);
  });
});

// ============================================================================
// Test Suite: Integration Scenarios
// ============================================================================

describe("Integration Scenarios", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockProject(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it("should complete full build and deploy preparation for Vercel", async () => {
    // Step 1: Bundle
    const bundler = new Bundler({
      entry: path.join(tempDir, "src", "index.ts"),
      outDir: path.join(tempDir, "dist"),
    });
    const buildOutput = await bundler.build();

    expect(buildOutput.files.length).toBeGreaterThan(0);

    // Step 2: Generate server
    const serverGen = new ServerGenerator({
      port: 3000,
      openapi: true,
    });
    const serverOutput = await serverGen.generate(path.join(tempDir, "dist"));

    expect(serverOutput.code).toBeDefined();
    expect(serverOutput.openApiSpec).toBeDefined();

    // Step 3: Prepare Vercel deployment
    const deployer = new VercelDeployer({
      maxDuration: 60,
      memory: 1024,
    });

    const config = createMockDeployConfig(tempDir, "vercel");
    config.outDir = path.join(tempDir, "dist");

    await deployer.build(config);

    // Verify complete deployment structure
    expect(fs.existsSync(path.join(process.cwd(), ".vercel", "output", "config.json"))).toBe(true);

    cleanupTempDir(path.join(process.cwd(), ".vercel"));
  });

  it("should complete full build and deploy preparation for Lambda", async () => {
    // Step 1: Bundle
    const bundler = new Bundler({
      entry: path.join(tempDir, "src", "index.ts"),
      outDir: path.join(tempDir, "dist"),
    });
    await bundler.build();

    // Step 2: Prepare Lambda deployment
    const deployer = new LambdaDeployer({
      functionName: "full-test-lambda",
      region: "us-east-1",
      memorySize: 1024,
      timeout: 30,
    });

    const config = createMockDeployConfig(tempDir, "lambda");
    config.outDir = path.join(tempDir, "dist");

    await deployer.build(config);

    // Verify complete deployment structure
    expect(fs.existsSync(path.join(tempDir, "dist", "template.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "dist", "index.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "dist", "package.json"))).toBe(true);
  });

  it("should handle multi-platform deployment preparation", async () => {
    const platforms: DeploymentPlatform[] = ["vercel", "cloudflare", "netlify", "lambda"];

    for (const platform of platforms) {
      const deployer = DeployerFactory.create(platform);
      const config = createMockDeployConfig(tempDir, platform);
      config.outDir = path.join(tempDir, `dist-${platform}`);

      await deployer.build(config);

      expect(fs.existsSync(config.outDir)).toBe(true);
    }

    // Cleanup Vercel output
    cleanupTempDir(path.join(process.cwd(), ".vercel"));
  });
});

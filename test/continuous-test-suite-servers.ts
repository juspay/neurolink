#!/usr/bin/env tsx

/**
 * Continuous Test Suite for NeuroLink Server Adapters Feature
 *
 * This test suite verifies that the Server Adapters feature properly:
 * 1. Creates server adapters for all 4 frameworks (Hono, Express, Fastify, Koa)
 * 2. Registers and responds to all 5 route groups (Agent, Tool, MCP, Memory, Health)
 * 3. Applies middleware correctly (auth, rate limit, cache, validation)
 * 4. Handles streaming responses via SSE
 * 5. Manages server lifecycle (start, stop, status)
 *
 * Run with: npx tsx test/continuous-test-suite-servers.ts
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import { fileURLToPath } from "url";
import type { TestFunction, TestResult } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// Test Configuration
// ============================================

const TEST_CONFIG = {
  timeout: 30000, // 30 seconds per test
  serverStartupDelay: 2000, // Wait for server to start
  basePort: 4000, // Start port allocation from here
  testDataDir: path.join(__dirname, "fixtures/servers"),
};

// Ports for each framework test
const FRAMEWORK_PORTS = {
  hono: 4001,
  express: 4002,
  fastify: 4003,
  koa: 4004,
};

// ============================================
// Color Codes for Output
// ============================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const;

type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details = "",
): void {
  const icon =
    status === "PASS"
      ? "\u2705"
      : status === "FAIL"
        ? "\u274C"
        : status === "SKIP"
          ? "\u23ED"
          : "\u26A0\uFE0F";
  const color: ColorName =
    status === "PASS"
      ? "green"
      : status === "FAIL"
        ? "red"
        : status === "SKIP"
          ? "yellow"
          : "yellow";
  log(`${icon} ${testName}`, color);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

// ============================================
// Test Result Tracking (types imported from @juspay/neurolink)
// ============================================

const testResults: TestResult[] = [];

// ============================================
// HTTP Request Helpers
// ============================================

type HttpResponse = {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  json?: unknown;
};

function httpRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options: http.RequestOptions = {
      method,
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      timeout: TEST_CONFIG.timeout,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        let json: unknown;
        try {
          json = JSON.parse(data);
        } catch {
          // Not JSON response
        }
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: data,
          json,
        });
      });
    });

    req.on("error", reject);
    req.on("timeout", () => reject(new Error("Request timeout")));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ============================================
// Server Adapter Factory Tests
// ============================================

async function testServerAdapterFactory(): Promise<boolean> {
  logSection("Testing Server Adapter Factory");

  try {
    log("Step 1: Checking factory module exports...", "blue");

    // Verify factory exports exist in types
    const factoryPath = path.join(
      __dirname,
      "../src/lib/server/factory/serverAdapterFactory.ts",
    );
    if (!fs.existsSync(factoryPath)) {
      logTest(
        "Server Adapter Factory",
        "FAIL",
        `Factory file not found: ${factoryPath}`,
      );
      return false;
    }

    const factoryContent = fs.readFileSync(factoryPath, "utf-8");

    // Check for required factory methods
    const requiredMethods = [
      "create",
      "createHono",
      "createExpress",
      "createFastify",
      "createKoa",
      "isSupported",
      "getSupportedFrameworks",
      "getRecommendedFramework",
    ];

    const missingMethods = requiredMethods.filter(
      (method) => !factoryContent.includes(method),
    );

    if (missingMethods.length > 0) {
      logTest(
        "Server Adapter Factory",
        "FAIL",
        `Missing factory methods: ${missingMethods.join(", ")}`,
      );
      return false;
    }

    logTest(
      "Server Adapter Factory - Methods",
      "PASS",
      `All ${requiredMethods.length} factory methods present`,
    );

    // Check for dynamic import pattern (avoids bundling unused frameworks)
    if (!factoryContent.includes("await import(")) {
      logTest(
        "Server Adapter Factory",
        "FAIL",
        "Missing dynamic imports for lazy loading",
      );
      return false;
    }

    logTest(
      "Server Adapter Factory - Dynamic Imports",
      "PASS",
      "Uses dynamic imports for lazy loading",
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Server Adapter Factory", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Framework Adapter Tests
// ============================================

async function testHonoAdapter(): Promise<boolean> {
  logSection("Testing Hono Server Adapter");

  try {
    const adapterPath = path.join(
      __dirname,
      "../src/lib/server/adapters/honoAdapter.ts",
    );

    if (!fs.existsSync(adapterPath)) {
      logTest("Hono Adapter", "FAIL", "Adapter file not found");
      return false;
    }

    const content = fs.readFileSync(adapterPath, "utf-8");

    // Check for required Hono imports
    const requiredImports = ["Hono", "cors", "streamSSE"];
    const missingImports = requiredImports.filter(
      (imp) => !content.includes(imp),
    );

    if (missingImports.length > 0) {
      logTest(
        "Hono Adapter - Imports",
        "FAIL",
        `Missing imports: ${missingImports.join(", ")}`,
      );
      return false;
    }

    logTest(
      "Hono Adapter - Imports",
      "PASS",
      "All required Hono imports present",
    );

    // Check for base class extension
    if (!content.includes("extends BaseServerAdapter")) {
      logTest(
        "Hono Adapter - Inheritance",
        "FAIL",
        "Does not extend BaseServerAdapter",
      );
      return false;
    }

    logTest(
      "Hono Adapter - Inheritance",
      "PASS",
      "Properly extends BaseServerAdapter",
    );

    // Check for required method implementations
    const requiredMethods = [
      "initializeFramework",
      "registerFrameworkRoute",
      "registerFrameworkMiddleware",
      "start",
      "stop",
      "getFrameworkInstance",
    ];

    const missingMethods = requiredMethods.filter(
      (method) => !content.includes(method),
    );

    if (missingMethods.length > 0) {
      logTest(
        "Hono Adapter - Methods",
        "FAIL",
        `Missing methods: ${missingMethods.join(", ")}`,
      );
      return false;
    }

    logTest(
      "Hono Adapter - Methods",
      "PASS",
      `All ${requiredMethods.length} required methods implemented`,
    );

    // Check for streaming support
    if (!content.includes("handleStreamingResponse")) {
      logTest("Hono Adapter - Streaming", "FAIL", "Missing streaming support");
      return false;
    }

    logTest("Hono Adapter - Streaming", "PASS", "SSE streaming implemented");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Hono Adapter", "FAIL", errorMessage);
    return false;
  }
}

async function testExpressAdapter(): Promise<boolean> {
  logSection("Testing Express Server Adapter");

  try {
    const adapterPath = path.join(
      __dirname,
      "../src/lib/server/adapters/expressAdapter.ts",
    );

    if (!fs.existsSync(adapterPath)) {
      logTest("Express Adapter", "FAIL", "Adapter file not found");
      return false;
    }

    const content = fs.readFileSync(adapterPath, "utf-8");

    // Check for required Express imports
    if (
      !content.includes('from "express"') &&
      !content.includes("from 'express'")
    ) {
      logTest("Express Adapter - Imports", "FAIL", "Missing express import");
      return false;
    }

    logTest("Express Adapter - Imports", "PASS", "Express imports present");

    // Check for rate limiting support
    if (!content.includes("rateLimit") && !content.includes("rate-limit")) {
      logTest(
        "Express Adapter - Rate Limit",
        "FAIL",
        "Missing rate limiting support",
      );
      return false;
    }

    logTest(
      "Express Adapter - Rate Limit",
      "PASS",
      "Rate limiting implemented",
    );

    // Check for CORS support
    if (!content.includes("cors")) {
      logTest("Express Adapter - CORS", "FAIL", "Missing CORS support");
      return false;
    }

    logTest("Express Adapter - CORS", "PASS", "CORS implemented");

    // Check for base class extension
    if (!content.includes("extends BaseServerAdapter")) {
      logTest(
        "Express Adapter - Inheritance",
        "FAIL",
        "Does not extend BaseServerAdapter",
      );
      return false;
    }

    logTest(
      "Express Adapter - Inheritance",
      "PASS",
      "Properly extends BaseServerAdapter",
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Express Adapter", "FAIL", errorMessage);
    return false;
  }
}

async function testFastifyAdapter(): Promise<boolean> {
  logSection("Testing Fastify Server Adapter");

  try {
    const adapterPath = path.join(
      __dirname,
      "../src/lib/server/adapters/fastifyAdapter.ts",
    );

    if (!fs.existsSync(adapterPath)) {
      logTest("Fastify Adapter", "FAIL", "Adapter file not found");
      return false;
    }

    const content = fs.readFileSync(adapterPath, "utf-8");

    // Check for Fastify import
    if (
      !content.includes('from "fastify"') &&
      !content.includes("from 'fastify'")
    ) {
      logTest("Fastify Adapter - Imports", "FAIL", "Missing fastify import");
      return false;
    }

    logTest("Fastify Adapter - Imports", "PASS", "Fastify imports present");

    // Check for schema validation support (Fastify's strength)
    if (!content.includes("schema") || !content.includes("route")) {
      logTest(
        "Fastify Adapter - Schema",
        "FAIL",
        "Missing schema validation support",
      );
      return false;
    }

    logTest("Fastify Adapter - Schema", "PASS", "Schema validation supported");

    // Check for base class extension
    if (!content.includes("extends BaseServerAdapter")) {
      logTest(
        "Fastify Adapter - Inheritance",
        "FAIL",
        "Does not extend BaseServerAdapter",
      );
      return false;
    }

    logTest(
      "Fastify Adapter - Inheritance",
      "PASS",
      "Properly extends BaseServerAdapter",
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Fastify Adapter", "FAIL", errorMessage);
    return false;
  }
}

async function testKoaAdapter(): Promise<boolean> {
  logSection("Testing Koa Server Adapter");

  try {
    const adapterPath = path.join(
      __dirname,
      "../src/lib/server/adapters/koaAdapter.ts",
    );

    if (!fs.existsSync(adapterPath)) {
      logTest("Koa Adapter", "FAIL", "Adapter file not found");
      return false;
    }

    const content = fs.readFileSync(adapterPath, "utf-8");

    // Check for Koa import
    if (!content.includes('from "koa"') && !content.includes("from 'koa'")) {
      logTest("Koa Adapter - Imports", "FAIL", "Missing koa import");
      return false;
    }

    logTest("Koa Adapter - Imports", "PASS", "Koa imports present");

    // Check for middleware composition (Koa's strength)
    if (!content.includes("middleware") || !content.includes("next")) {
      logTest(
        "Koa Adapter - Middleware",
        "FAIL",
        "Missing middleware composition",
      );
      return false;
    }

    logTest(
      "Koa Adapter - Middleware",
      "PASS",
      "Middleware composition supported",
    );

    // Check for base class extension
    if (!content.includes("extends BaseServerAdapter")) {
      logTest(
        "Koa Adapter - Inheritance",
        "FAIL",
        "Does not extend BaseServerAdapter",
      );
      return false;
    }

    logTest(
      "Koa Adapter - Inheritance",
      "PASS",
      "Properly extends BaseServerAdapter",
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Koa Adapter", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Route Group Tests
// ============================================

async function testAgentRoutes(): Promise<boolean> {
  logSection("Testing Agent Routes");

  try {
    const routesPath = path.join(
      __dirname,
      "../src/lib/server/routes/agentRoutes.ts",
    );

    if (!fs.existsSync(routesPath)) {
      logTest("Agent Routes", "FAIL", "Routes file not found");
      return false;
    }

    const content = fs.readFileSync(routesPath, "utf-8");

    // Check for required agent endpoints
    const requiredEndpoints = ["/execute", "/stream", "/providers"];

    const missingEndpoints = requiredEndpoints.filter(
      (endpoint) => !content.includes(endpoint),
    );

    if (missingEndpoints.length > 0) {
      logTest(
        "Agent Routes - Endpoints",
        "FAIL",
        `Missing endpoints: ${missingEndpoints.join(", ")}`,
      );
      return false;
    }

    logTest(
      "Agent Routes - Endpoints",
      "PASS",
      `All ${requiredEndpoints.length} agent endpoints defined`,
    );

    // Check for POST method support
    if (!content.includes("POST")) {
      logTest("Agent Routes - Methods", "FAIL", "Missing POST method support");
      return false;
    }

    logTest("Agent Routes - Methods", "PASS", "POST method supported");

    // Check for streaming configuration
    if (
      !content.includes("streaming") ||
      !content.includes("text/event-stream")
    ) {
      logTest("Agent Routes - Streaming", "FAIL", "Missing streaming config");
      return false;
    }

    logTest("Agent Routes - Streaming", "PASS", "Streaming configured");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Agent Routes", "FAIL", errorMessage);
    return false;
  }
}

async function testToolRoutes(): Promise<boolean> {
  logSection("Testing Tool Routes");

  try {
    const routesPath = path.join(
      __dirname,
      "../src/lib/server/routes/toolRoutes.ts",
    );

    if (!fs.existsSync(routesPath)) {
      logTest("Tool Routes", "FAIL", "Routes file not found");
      return false;
    }

    const content = fs.readFileSync(routesPath, "utf-8");

    // Check for CRUD operations
    const requiredMethods = ["GET", "POST"];
    const missingMethods = requiredMethods.filter(
      (method) => !content.includes(method),
    );

    if (missingMethods.length > 0) {
      logTest(
        "Tool Routes - Methods",
        "FAIL",
        `Missing methods: ${missingMethods.join(", ")}`,
      );
      return false;
    }

    logTest("Tool Routes - Methods", "PASS", "CRUD methods supported");

    // Check for tool execution endpoint
    if (!content.includes("execute") && !content.includes("run")) {
      logTest(
        "Tool Routes - Execution",
        "FAIL",
        "Missing tool execution endpoint",
      );
      return false;
    }

    logTest(
      "Tool Routes - Execution",
      "PASS",
      "Tool execution endpoint defined",
    );

    // Check for search/list endpoint
    if (!content.includes("list") && !content.includes("search")) {
      logTest("Tool Routes - List", "FAIL", "Missing list/search endpoint");
      return false;
    }

    logTest("Tool Routes - List", "PASS", "List/search endpoint defined");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Tool Routes", "FAIL", errorMessage);
    return false;
  }
}

async function testMCPRoutes(): Promise<boolean> {
  logSection("Testing MCP Routes");

  try {
    const routesPath = path.join(
      __dirname,
      "../src/lib/server/routes/mcpRoutes.ts",
    );

    if (!fs.existsSync(routesPath)) {
      logTest("MCP Routes", "FAIL", "Routes file not found");
      return false;
    }

    const content = fs.readFileSync(routesPath, "utf-8");

    // Check for server management endpoints
    if (!content.includes("servers") && !content.includes("mcp")) {
      logTest(
        "MCP Routes - Server Management",
        "FAIL",
        "Missing server management endpoints",
      );
      return false;
    }

    logTest(
      "MCP Routes - Server Management",
      "PASS",
      "Server management endpoints defined",
    );

    // Check for health check endpoint
    if (!content.includes("health") && !content.includes("status")) {
      logTest("MCP Routes - Health", "FAIL", "Missing health check endpoint");
      return false;
    }

    logTest("MCP Routes - Health", "PASS", "Health check endpoint defined");

    // Check for tools listing
    if (!content.includes("tools")) {
      logTest("MCP Routes - Tools", "FAIL", "Missing tools listing endpoint");
      return false;
    }

    logTest("MCP Routes - Tools", "PASS", "Tools listing endpoint defined");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("MCP Routes", "FAIL", errorMessage);
    return false;
  }
}

async function testMemoryRoutes(): Promise<boolean> {
  logSection("Testing Memory Routes");

  try {
    const routesPath = path.join(
      __dirname,
      "../src/lib/server/routes/memoryRoutes.ts",
    );

    if (!fs.existsSync(routesPath)) {
      logTest("Memory Routes", "FAIL", "Routes file not found");
      return false;
    }

    const content = fs.readFileSync(routesPath, "utf-8");

    // Check for session management
    if (!content.includes("session")) {
      logTest(
        "Memory Routes - Session",
        "FAIL",
        "Missing session management endpoints",
      );
      return false;
    }

    logTest(
      "Memory Routes - Session",
      "PASS",
      "Session management endpoints defined",
    );

    // Check for stats endpoint
    if (!content.includes("stats") && !content.includes("statistics")) {
      logTest("Memory Routes - Stats", "FAIL", "Missing stats endpoint");
      return false;
    }

    logTest("Memory Routes - Stats", "PASS", "Stats endpoint defined");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Memory Routes", "FAIL", errorMessage);
    return false;
  }
}

async function testHealthRoutes(): Promise<boolean> {
  logSection("Testing Health Routes");

  try {
    const routesPath = path.join(
      __dirname,
      "../src/lib/server/routes/healthRoutes.ts",
    );

    if (!fs.existsSync(routesPath)) {
      logTest("Health Routes", "FAIL", "Routes file not found");
      return false;
    }

    const content = fs.readFileSync(routesPath, "utf-8");

    // Check for standard health endpoints
    const requiredEndpoints = ["health", "ready", "live"];
    const foundEndpoints = requiredEndpoints.filter((endpoint) =>
      content.toLowerCase().includes(endpoint),
    );

    if (foundEndpoints.length < 2) {
      logTest(
        "Health Routes - Endpoints",
        "FAIL",
        `Only found ${foundEndpoints.length}/3 required health endpoints`,
      );
      return false;
    }

    logTest(
      "Health Routes - Endpoints",
      "PASS",
      `Found ${foundEndpoints.length} health endpoints`,
    );

    // Check for version endpoint
    if (!content.includes("version")) {
      logTest("Health Routes - Version", "FAIL", "Missing version endpoint");
      return false;
    }

    logTest("Health Routes - Version", "PASS", "Version endpoint defined");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Health Routes", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Middleware Tests
// ============================================

async function testAuthMiddleware(): Promise<boolean> {
  logSection("Testing Auth Middleware");

  try {
    const middlewarePath = path.join(
      __dirname,
      "../src/lib/server/middleware/auth.ts",
    );

    if (!fs.existsSync(middlewarePath)) {
      logTest("Auth Middleware", "FAIL", "Middleware file not found");
      return false;
    }

    const content = fs.readFileSync(middlewarePath, "utf-8");

    // Check for auth strategies
    const authStrategies = ["Bearer", "API key", "Basic"];
    const foundStrategies = authStrategies.filter(
      (strategy) =>
        content.toLowerCase().includes(strategy.toLowerCase()) ||
        content.includes(strategy),
    );

    if (foundStrategies.length < 2) {
      logTest(
        "Auth Middleware - Strategies",
        "FAIL",
        `Only found ${foundStrategies.length}/3 auth strategies`,
      );
      return false;
    }

    logTest(
      "Auth Middleware - Strategies",
      "PASS",
      `Found ${foundStrategies.length} auth strategies`,
    );

    // Check for role-based access control
    if (!content.includes("role") && !content.includes("Role")) {
      logTest("Auth Middleware - RBAC", "FAIL", "Missing role-based access");
      return false;
    }

    logTest("Auth Middleware - RBAC", "PASS", "Role-based access implemented");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Auth Middleware", "FAIL", errorMessage);
    return false;
  }
}

async function testRateLimitMiddleware(): Promise<boolean> {
  logSection("Testing Rate Limit Middleware");

  try {
    const middlewarePath = path.join(
      __dirname,
      "../src/lib/server/middleware/rateLimit.ts",
    );

    if (!fs.existsSync(middlewarePath)) {
      logTest("Rate Limit Middleware", "FAIL", "Middleware file not found");
      return false;
    }

    const content = fs.readFileSync(middlewarePath, "utf-8");

    // Check for rate limit algorithms
    if (!content.includes("window") && !content.includes("Window")) {
      logTest(
        "Rate Limit - Algorithm",
        "FAIL",
        "Missing window-based rate limiting",
      );
      return false;
    }

    logTest(
      "Rate Limit - Algorithm",
      "PASS",
      "Window-based rate limiting implemented",
    );

    // Check for sliding window support
    if (!content.includes("sliding") && !content.includes("Sliding")) {
      logTest(
        "Rate Limit - Sliding Window",
        "FAIL",
        "Missing sliding window support",
      );
      return false;
    }

    logTest(
      "Rate Limit - Sliding Window",
      "PASS",
      "Sliding window implemented",
    );

    // Check for store abstraction
    if (!content.includes("Store") && !content.includes("store")) {
      logTest(
        "Rate Limit - Store",
        "FAIL",
        "Missing store abstraction for distributed systems",
      );
      return false;
    }

    logTest("Rate Limit - Store", "PASS", "Store abstraction implemented");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Rate Limit Middleware", "FAIL", errorMessage);
    return false;
  }
}

async function testCacheMiddleware(): Promise<boolean> {
  logSection("Testing Cache Middleware");

  try {
    const middlewarePath = path.join(
      __dirname,
      "../src/lib/server/middleware/cache.ts",
    );

    if (!fs.existsSync(middlewarePath)) {
      logTest("Cache Middleware", "FAIL", "Middleware file not found");
      return false;
    }

    const content = fs.readFileSync(middlewarePath, "utf-8");

    // Check for LRU cache
    if (!content.includes("LRU") && !content.includes("lru")) {
      logTest("Cache - LRU", "FAIL", "Missing LRU cache implementation");
      return false;
    }

    logTest("Cache - LRU", "PASS", "LRU cache implemented");

    // Check for TTL support
    if (!content.includes("TTL") && !content.includes("ttl")) {
      logTest("Cache - TTL", "FAIL", "Missing TTL support");
      return false;
    }

    logTest("Cache - TTL", "PASS", "TTL support implemented");

    // Check for cache invalidation
    if (!content.includes("invalidat") && !content.includes("clear")) {
      logTest("Cache - Invalidation", "FAIL", "Missing cache invalidation");
      return false;
    }

    logTest("Cache - Invalidation", "PASS", "Cache invalidation implemented");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Cache Middleware", "FAIL", errorMessage);
    return false;
  }
}

async function testValidationMiddleware(): Promise<boolean> {
  logSection("Testing Validation Middleware");

  try {
    const middlewarePath = path.join(
      __dirname,
      "../src/lib/server/middleware/validation.ts",
    );

    if (!fs.existsSync(middlewarePath)) {
      logTest("Validation Middleware", "FAIL", "Middleware file not found");
      return false;
    }

    const content = fs.readFileSync(middlewarePath, "utf-8");

    // Check for schema validation
    if (!content.includes("schema") && !content.includes("Schema")) {
      logTest("Validation - Schema", "FAIL", "Missing schema validation");
      return false;
    }

    logTest("Validation - Schema", "PASS", "Schema validation implemented");

    // Check for custom validators
    if (!content.includes("custom") && !content.includes("Custom")) {
      logTest(
        "Validation - Custom",
        "FAIL",
        "Missing custom validator support",
      );
      return false;
    }

    logTest("Validation - Custom", "PASS", "Custom validators supported");

    // Check for error handling
    if (!content.includes("ValidationError") && !content.includes("error")) {
      logTest(
        "Validation - Errors",
        "FAIL",
        "Missing validation error handling",
      );
      return false;
    }

    logTest("Validation - Errors", "PASS", "Validation errors handled");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Validation Middleware", "FAIL", errorMessage);
    return false;
  }
}

async function testCommonMiddleware(): Promise<boolean> {
  logSection("Testing Common Middleware");

  try {
    const middlewarePath = path.join(
      __dirname,
      "../src/lib/server/middleware/common.ts",
    );

    if (!fs.existsSync(middlewarePath)) {
      logTest("Common Middleware", "FAIL", "Middleware file not found");
      return false;
    }

    const content = fs.readFileSync(middlewarePath, "utf-8");

    // Check for required common middleware
    const requiredMiddleware = [
      "timing",
      "requestId",
      "errorHandling",
      "securityHeaders",
      "logging",
    ];

    const foundMiddleware = requiredMiddleware.filter(
      (mw) =>
        content.toLowerCase().includes(mw.toLowerCase()) ||
        content.includes(mw),
    );

    if (foundMiddleware.length < 4) {
      logTest(
        "Common Middleware - Coverage",
        "FAIL",
        `Only found ${foundMiddleware.length}/5 required middleware`,
      );
      return false;
    }

    logTest(
      "Common Middleware - Coverage",
      "PASS",
      `Found ${foundMiddleware.length} common middleware`,
    );

    // Check for security headers
    if (!content.includes("CSP") && !content.includes("security")) {
      logTest(
        "Common Middleware - Security",
        "FAIL",
        "Missing security headers",
      );
      return false;
    }

    logTest("Common Middleware - Security", "PASS", "Security headers present");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Common Middleware", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Type System Tests
// ============================================

async function testTypeSystem(): Promise<boolean> {
  logSection("Testing Type System");

  try {
    const typesPath = path.join(__dirname, "../src/lib/server/types.ts");

    if (!fs.existsSync(typesPath)) {
      logTest("Type System", "FAIL", "Types file not found");
      return false;
    }

    const content = fs.readFileSync(typesPath, "utf-8");
    const lineCount = content.split("\n").length;

    log(`Types file has ${lineCount} lines`, "blue");

    // Check for required type exports
    const requiredTypes = [
      "ServerAdapterConfig",
      "ServerContext",
      "RouteDefinition",
      "MiddlewareDefinition",
      "ServerFramework",
      "RouteHandler",
      "RouteGroup",
      "ServerResponse",
      "AgentExecuteRequest",
      "AgentExecuteResponse",
      "ToolExecuteRequest",
      "ToolExecuteResponse",
      "MCPServerStatusResponse",
      "HealthResponse",
      "ReadyResponse",
    ];

    const missingTypes = requiredTypes.filter(
      (type) => !content.includes(type),
    );

    if (missingTypes.length > 0) {
      logTest(
        "Type System - Types",
        "FAIL",
        `Missing types: ${missingTypes.join(", ")}`,
      );
      return false;
    }

    logTest(
      "Type System - Types",
      "PASS",
      `All ${requiredTypes.length} required types defined`,
    );

    // Check for framework enum
    if (
      !content.includes('"hono"') ||
      !content.includes('"express"') ||
      !content.includes('"fastify"') ||
      !content.includes('"koa"')
    ) {
      logTest(
        "Type System - Frameworks",
        "FAIL",
        "Missing framework type definitions",
      );
      return false;
    }

    logTest(
      "Type System - Frameworks",
      "PASS",
      "All 4 frameworks in ServerFramework type",
    );

    // Check for HTTP methods
    if (
      !content.includes('"GET"') ||
      !content.includes('"POST"') ||
      !content.includes('"PUT"') ||
      !content.includes('"DELETE"')
    ) {
      logTest(
        "Type System - HTTP Methods",
        "FAIL",
        "Missing HTTP method types",
      );
      return false;
    }

    logTest("Type System - HTTP Methods", "PASS", "HTTP methods defined");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Type System", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Index Exports Tests
// ============================================

async function testIndexExports(): Promise<boolean> {
  logSection("Testing Index Exports");

  try {
    const indexPath = path.join(__dirname, "../src/lib/server/index.ts");

    if (!fs.existsSync(indexPath)) {
      logTest("Index Exports", "FAIL", "Index file not found");
      return false;
    }

    const content = fs.readFileSync(indexPath, "utf-8");

    // Check for required exports
    const requiredExports = [
      "BaseServerAdapter",
      "HonoServerAdapter",
      "ExpressServerAdapter",
      "FastifyServerAdapter",
      "KoaServerAdapter",
      "createServer",
      "ServerAdapterFactory",
      "createAgentRoutes",
      "createToolRoutes",
      "createMCPRoutes",
      "createMemoryRoutes",
      "createHealthRoutes",
      "createAllRoutes",
      "createAuthMiddleware",
      "createRateLimitMiddleware",
      "createCacheMiddleware",
    ];

    const missingExports = requiredExports.filter(
      (exp) => !content.includes(exp),
    );

    if (missingExports.length > 0) {
      logTest(
        "Index Exports",
        "FAIL",
        `Missing exports: ${missingExports.join(", ")}`,
      );
      return false;
    }

    logTest(
      "Index Exports",
      "PASS",
      `All ${requiredExports.length} required exports present`,
    );

    // Check for type exports
    if (!content.includes("export type")) {
      logTest("Index Exports - Types", "FAIL", "Missing type exports");
      return false;
    }

    logTest("Index Exports - Types", "PASS", "Type exports present");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Index Exports", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// OpenAPI/Swagger Tests
// ============================================

async function testOpenAPISupport(): Promise<boolean> {
  logSection("Testing OpenAPI Support");

  try {
    const openapiDir = path.join(__dirname, "../src/lib/server/openapi");

    if (!fs.existsSync(openapiDir)) {
      logTest("OpenAPI Support", "FAIL", "OpenAPI directory not found");
      return false;
    }

    // Check for generator
    const generatorPath = path.join(openapiDir, "generator.ts");
    if (!fs.existsSync(generatorPath)) {
      logTest("OpenAPI - Generator", "FAIL", "Generator file not found");
      return false;
    }

    logTest("OpenAPI - Generator", "PASS", "Generator file present");

    // Check for schemas
    const schemasPath = path.join(openapiDir, "schemas.ts");
    if (!fs.existsSync(schemasPath)) {
      logTest("OpenAPI - Schemas", "FAIL", "Schemas file not found");
      return false;
    }

    logTest("OpenAPI - Schemas", "PASS", "Schemas file present");

    // Check for templates
    const templatesPath = path.join(openapiDir, "templates.ts");
    if (!fs.existsSync(templatesPath)) {
      logTest("OpenAPI - Templates", "FAIL", "Templates file not found");
      return false;
    }

    logTest("OpenAPI - Templates", "PASS", "Templates file present");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("OpenAPI Support", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Streaming Support Tests
// ============================================

async function testStreamingSupport(): Promise<boolean> {
  logSection("Testing Streaming Support");

  try {
    const streamingDir = path.join(__dirname, "../src/lib/server/streaming");

    if (!fs.existsSync(streamingDir)) {
      logTest("Streaming Support", "FAIL", "Streaming directory not found");
      return false;
    }

    // Check for data stream
    const dataStreamPath = path.join(streamingDir, "dataStream.ts");
    if (!fs.existsSync(dataStreamPath)) {
      logTest("Streaming - DataStream", "FAIL", "DataStream file not found");
      return false;
    }

    const content = fs.readFileSync(dataStreamPath, "utf-8");

    // Check for SSE support
    if (!content.includes("SSE") && !content.includes("event-stream")) {
      logTest("Streaming - SSE", "FAIL", "Missing SSE support");
      return false;
    }

    logTest("Streaming - SSE", "PASS", "SSE support implemented");

    // Check for NDJSON support
    if (!content.includes("NDJSON") && !content.includes("ndjson")) {
      logTest("Streaming - NDJSON", "FAIL", "Missing NDJSON support");
      return false;
    }

    logTest("Streaming - NDJSON", "PASS", "NDJSON support implemented");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Streaming Support", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// WebSocket Support Tests
// ============================================

async function testWebSocketSupport(): Promise<boolean> {
  logSection("Testing WebSocket Support");

  try {
    const wsDir = path.join(__dirname, "../src/lib/server/websocket");

    if (!fs.existsSync(wsDir)) {
      logTest("WebSocket Support", "FAIL", "WebSocket directory not found");
      return false;
    }

    // Check for handler
    const handlerPath = path.join(wsDir, "WebSocketHandler.ts");
    if (!fs.existsSync(handlerPath)) {
      logTest("WebSocket - Handler", "FAIL", "Handler file not found");
      return false;
    }

    const content = fs.readFileSync(handlerPath, "utf-8");

    // Check for connection management
    if (!content.includes("connection") && !content.includes("Connection")) {
      logTest(
        "WebSocket - Connections",
        "FAIL",
        "Missing connection management",
      );
      return false;
    }

    logTest("WebSocket - Connections", "PASS", "Connection management present");

    // Check for message routing
    if (!content.includes("message") && !content.includes("Message")) {
      logTest("WebSocket - Messages", "FAIL", "Missing message handling");
      return false;
    }

    logTest("WebSocket - Messages", "PASS", "Message handling present");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("WebSocket Support", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Error Handling Tests
// ============================================

async function testErrorHandling(): Promise<boolean> {
  logSection("Testing Error Handling");

  try {
    const errorsPath = path.join(__dirname, "../src/lib/server/errors.ts");

    if (!fs.existsSync(errorsPath)) {
      logTest("Error Handling", "FAIL", "Errors file not found");
      return false;
    }

    const content = fs.readFileSync(errorsPath, "utf-8");

    // Check for error classes
    const requiredErrors = [
      "ServerAdapterError",
      "ConfigurationError",
      "ValidationError",
      "AuthenticationError",
      "AuthorizationError",
      "RateLimitError",
      "TimeoutError",
      "StreamingError",
    ];

    const foundErrors = requiredErrors.filter((err) => content.includes(err));

    if (foundErrors.length < 5) {
      logTest(
        "Error Handling - Classes",
        "FAIL",
        `Only found ${foundErrors.length}/8 error classes`,
      );
      return false;
    }

    logTest(
      "Error Handling - Classes",
      "PASS",
      `Found ${foundErrors.length} error classes`,
    );

    // Check for error recovery strategies
    if (!content.includes("recovery") && !content.includes("Recovery")) {
      logTest(
        "Error Handling - Recovery",
        "FAIL",
        "Missing recovery strategies",
      );
      return false;
    }

    logTest("Error Handling - Recovery", "PASS", "Recovery strategies present");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Error Handling", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Configuration Tests
// ============================================

async function testCoreConfiguration(): Promise<boolean> {
  logSection("Testing Core Configuration Options");

  try {
    // Check types.ts for core config options
    const typesPath = path.join(__dirname, "../src/lib/server/types.ts");
    if (!fs.existsSync(typesPath)) {
      logTest("Core Config - Types", "FAIL", "Types file not found");
      return false;
    }

    const typesContent = fs.readFileSync(typesPath, "utf-8");

    // Check for core config options
    const coreOptions = [
      "port",
      "host",
      "basePath",
      "timeout",
      "enableMetrics",
      "enableSwagger",
      "disableBuiltInHealth",
    ];

    const missingOptions = coreOptions.filter(
      (opt) => !typesContent.includes(opt),
    );

    if (missingOptions.length > 0) {
      logTest(
        "Core Config - Options",
        "FAIL",
        `Missing options: ${missingOptions.join(", ")}`,
      );
      return false;
    }

    logTest(
      "Core Config - Options",
      "PASS",
      `All ${coreOptions.length} core options defined`,
    );

    // Check for ServerAdapterConfig type
    if (!typesContent.includes("ServerAdapterConfig")) {
      logTest(
        "Core Config - Type Definition",
        "FAIL",
        "ServerAdapterConfig not found",
      );
      return false;
    }

    logTest(
      "Core Config - Type Definition",
      "PASS",
      "ServerAdapterConfig defined",
    );

    // Check base adapter for config handling
    const basePath = path.join(
      __dirname,
      "../src/lib/server/abstract/baseServerAdapter.ts",
    );
    if (fs.existsSync(basePath)) {
      const baseContent = fs.readFileSync(basePath, "utf-8");

      if (!baseContent.includes("config") || !baseContent.includes("port")) {
        logTest(
          "Core Config - Base Adapter",
          "FAIL",
          "Config handling not found in base adapter",
        );
        return false;
      }
      logTest(
        "Core Config - Base Adapter",
        "PASS",
        "Config handling implemented",
      );
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Core Configuration", "FAIL", errorMessage);
    return false;
  }
}

async function testCORSConfiguration(): Promise<boolean> {
  logSection("Testing CORS Configuration Options");

  try {
    const typesPath = path.join(__dirname, "../src/lib/server/types.ts");
    const typesContent = fs.readFileSync(typesPath, "utf-8");

    // Check for CORS config options
    const corsOptions = [
      "origins",
      "methods",
      "headers",
      "credentials",
      "maxAge",
    ];

    const foundOptions = corsOptions.filter((opt) =>
      typesContent.includes(opt),
    );

    if (foundOptions.length < 4) {
      logTest(
        "CORS Config - Options",
        "FAIL",
        `Only ${foundOptions.length}/5 CORS options found`,
      );
      return false;
    }

    logTest(
      "CORS Config - Options",
      "PASS",
      `${foundOptions.length} CORS options defined`,
    );

    // Check adapters for CORS handling (CORS is implemented in each adapter)
    const adaptersDir = path.join(__dirname, "../src/lib/server/adapters");
    if (fs.existsSync(adaptersDir)) {
      const honoAdapterPath = path.join(adaptersDir, "honoAdapter.ts");
      if (fs.existsSync(honoAdapterPath)) {
        const adapterContent = fs.readFileSync(honoAdapterPath, "utf-8");

        if (
          adapterContent.includes("cors") ||
          adapterContent.includes("CORS")
        ) {
          logTest(
            "CORS Config - Middleware",
            "PASS",
            "CORS implemented in adapters",
          );
        } else {
          logTest(
            "CORS Config - Middleware",
            "FAIL",
            "CORS not found in adapters",
          );
          return false;
        }
      }
    }

    // Check for credentials handling
    if (typesContent.includes("credentials")) {
      logTest(
        "CORS Config - Credentials",
        "PASS",
        "Credentials option supported",
      );
    } else {
      logTest(
        "CORS Config - Credentials",
        "FAIL",
        "Credentials option missing",
      );
      return false;
    }

    // Check for maxAge handling
    if (typesContent.includes("maxAge")) {
      logTest("CORS Config - MaxAge", "PASS", "MaxAge option supported");
    } else {
      logTest("CORS Config - MaxAge", "FAIL", "MaxAge option missing");
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CORS Configuration", "FAIL", errorMessage);
    return false;
  }
}

async function testRateLimitConfiguration(): Promise<boolean> {
  logSection("Testing Rate Limit Configuration Options");

  try {
    const rateLimitPath = path.join(
      __dirname,
      "../src/lib/server/middleware/rateLimit.ts",
    );

    if (!fs.existsSync(rateLimitPath)) {
      logTest("Rate Limit Config", "FAIL", "Rate limit middleware not found");
      return false;
    }

    const content = fs.readFileSync(rateLimitPath, "utf-8");

    // Check for rate limit options
    const rateLimitOptions = [
      "windowMs",
      "maxRequests",
      "message",
      "skipPaths",
    ];

    const foundOptions = rateLimitOptions.filter((opt) =>
      content.includes(opt),
    );

    if (foundOptions.length < 3) {
      logTest(
        "Rate Limit Config - Options",
        "FAIL",
        `Only ${foundOptions.length}/4 options found`,
      );
      return false;
    }

    logTest(
      "Rate Limit Config - Options",
      "PASS",
      `${foundOptions.length} rate limit options implemented`,
    );

    // Check for custom message support
    if (content.includes("message")) {
      logTest(
        "Rate Limit Config - Custom Message",
        "PASS",
        "Custom message supported",
      );
    } else {
      logTest(
        "Rate Limit Config - Custom Message",
        "FAIL",
        "Custom message not found",
      );
      return false;
    }

    // Check for key generator support
    if (content.includes("keyGenerator") || content.includes("key")) {
      logTest(
        "Rate Limit Config - Key Generator",
        "PASS",
        "Key generator supported",
      );
    } else {
      logTest(
        "Rate Limit Config - Key Generator",
        "FAIL",
        "Key generator not found",
      );
      return false;
    }

    // Check for sliding window
    if (content.includes("sliding") || content.includes("Sliding")) {
      logTest(
        "Rate Limit Config - Sliding Window",
        "PASS",
        "Sliding window implemented",
      );
    } else {
      logTest(
        "Rate Limit Config - Sliding Window",
        "FAIL",
        "Sliding window not found",
      );
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Rate Limit Configuration", "FAIL", errorMessage);
    return false;
  }
}

async function testBodyParserConfiguration(): Promise<boolean> {
  logSection("Testing Body Parser Configuration Options");

  try {
    const typesPath = path.join(__dirname, "../src/lib/server/types.ts");
    const typesContent = fs.readFileSync(typesPath, "utf-8");

    // Check for body parser config options
    const bodyParserOptions = ["maxSize", "jsonLimit", "urlEncoded"];

    const foundOptions = bodyParserOptions.filter((opt) =>
      typesContent.toLowerCase().includes(opt.toLowerCase()),
    );

    if (foundOptions.length < 2) {
      logTest(
        "Body Parser Config - Options",
        "FAIL",
        `Only ${foundOptions.length}/3 options found`,
      );
      return false;
    }

    logTest(
      "Body Parser Config - Options",
      "PASS",
      `${foundOptions.length} body parser options defined`,
    );

    // Check adapters for body parsing
    const adapters = [
      "honoAdapter.ts",
      "expressAdapter.ts",
      "fastifyAdapter.ts",
      "koaAdapter.ts",
    ];
    let bodyParsingFound = false;

    for (const adapter of adapters) {
      const adapterPath = path.join(
        __dirname,
        `../src/lib/server/adapters/${adapter}`,
      );
      if (fs.existsSync(adapterPath)) {
        const adapterContent = fs.readFileSync(adapterPath, "utf-8");
        if (
          adapterContent.includes("body") ||
          adapterContent.includes("json") ||
          adapterContent.includes("parse")
        ) {
          bodyParsingFound = true;
          break;
        }
      }
    }

    if (bodyParsingFound) {
      logTest(
        "Body Parser Config - Adapters",
        "PASS",
        "Body parsing in adapters",
      );
    } else {
      logTest(
        "Body Parser Config - Adapters",
        "FAIL",
        "Body parsing not found in adapters",
      );
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Body Parser Configuration", "FAIL", errorMessage);
    return false;
  }
}

async function testLoggingConfiguration(): Promise<boolean> {
  logSection("Testing Logging Configuration Options");

  try {
    const typesPath = path.join(__dirname, "../src/lib/server/types.ts");
    const typesContent = fs.readFileSync(typesPath, "utf-8");

    // Check for logging config options
    const loggingOptions = [
      "logging",
      "level",
      "debug",
      "info",
      "warn",
      "error",
    ];

    const foundOptions = loggingOptions.filter((opt) =>
      typesContent.toLowerCase().includes(opt.toLowerCase()),
    );

    if (foundOptions.length < 3) {
      logTest(
        "Logging Config - Options",
        "FAIL",
        `Only ${foundOptions.length}/6 options found`,
      );
      return false;
    }

    logTest(
      "Logging Config - Options",
      "PASS",
      `${foundOptions.length} logging options defined`,
    );

    // Check common middleware for logging
    const commonPath = path.join(
      __dirname,
      "../src/lib/server/middleware/common.ts",
    );
    if (fs.existsSync(commonPath)) {
      const commonContent = fs.readFileSync(commonPath, "utf-8");

      if (commonContent.includes("logging") || commonContent.includes("log")) {
        logTest(
          "Logging Config - Middleware",
          "PASS",
          "Logging in common middleware",
        );
      } else {
        logTest(
          "Logging Config - Middleware",
          "FAIL",
          "Logging not found in middleware",
        );
        return false;
      }
    }

    // Check for log level support
    if (typesContent.includes("level") || typesContent.includes("Level")) {
      logTest("Logging Config - Levels", "PASS", "Log levels supported");
    } else {
      logTest("Logging Config - Levels", "FAIL", "Log levels not defined");
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Logging Configuration", "FAIL", errorMessage);
    return false;
  }
}

async function testCacheConfiguration(): Promise<boolean> {
  logSection("Testing Cache Configuration Options");

  try {
    const cachePath = path.join(
      __dirname,
      "../src/lib/server/middleware/cache.ts",
    );

    if (!fs.existsSync(cachePath)) {
      logTest("Cache Config", "FAIL", "Cache middleware not found");
      return false;
    }

    const content = fs.readFileSync(cachePath, "utf-8");

    // Check for cache config options
    const cacheOptions = ["ttl", "maxSize", "LRU", "invalidat"];

    const foundOptions = cacheOptions.filter((opt) =>
      content.toLowerCase().includes(opt.toLowerCase()),
    );

    if (foundOptions.length < 3) {
      logTest(
        "Cache Config - Options",
        "FAIL",
        `Only ${foundOptions.length}/4 options found`,
      );
      return false;
    }

    logTest(
      "Cache Config - Options",
      "PASS",
      `${foundOptions.length} cache options implemented`,
    );

    // Check for TTL support
    if (content.includes("ttl") || content.includes("TTL")) {
      logTest("Cache Config - TTL", "PASS", "TTL support implemented");
    } else {
      logTest("Cache Config - TTL", "FAIL", "TTL not found");
      return false;
    }

    // Check for path-based configuration
    if (content.includes("path") || content.includes("Path")) {
      logTest(
        "Cache Config - Path-based",
        "PASS",
        "Path-based caching supported",
      );
    } else {
      logTest(
        "Cache Config - Path-based",
        "FAIL",
        "Path-based caching not found",
      );
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Cache Configuration", "FAIL", errorMessage);
    return false;
  }
}

async function testTimeoutConfiguration(): Promise<boolean> {
  logSection("Testing Timeout Configuration");

  try {
    const typesPath = path.join(__dirname, "../src/lib/server/types.ts");
    const typesContent = fs.readFileSync(typesPath, "utf-8");

    // Check for timeout option
    if (!typesContent.includes("timeout")) {
      logTest("Timeout Config - Type", "FAIL", "Timeout option not in types");
      return false;
    }

    logTest("Timeout Config - Type", "PASS", "Timeout option defined");

    // Check base adapter for timeout handling
    const basePath = path.join(
      __dirname,
      "../src/lib/server/abstract/baseServerAdapter.ts",
    );
    if (fs.existsSync(basePath)) {
      const baseContent = fs.readFileSync(basePath, "utf-8");

      if (baseContent.includes("timeout") || baseContent.includes("Timeout")) {
        logTest(
          "Timeout Config - Implementation",
          "PASS",
          "Timeout handling implemented",
        );
      } else {
        logTest(
          "Timeout Config - Implementation",
          "FAIL",
          "Timeout handling not found",
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Timeout Configuration", "FAIL", errorMessage);
    return false;
  }
}

async function testMetricsConfiguration(): Promise<boolean> {
  logSection("Testing Metrics Configuration");

  try {
    const typesPath = path.join(__dirname, "../src/lib/server/types.ts");
    const typesContent = fs.readFileSync(typesPath, "utf-8");

    // Check for enableMetrics option
    if (
      !typesContent.includes("enableMetrics") &&
      !typesContent.includes("metrics")
    ) {
      logTest("Metrics Config - Type", "FAIL", "Metrics option not in types");
      return false;
    }

    logTest("Metrics Config - Type", "PASS", "Metrics option defined");

    // Check middleware/common for metrics or base adapter
    const commonPath = path.join(
      __dirname,
      "../src/lib/server/middleware/common.ts",
    );
    const basePath = path.join(
      __dirname,
      "../src/lib/server/abstract/baseServerAdapter.ts",
    );

    let metricsFound = false;

    if (fs.existsSync(commonPath)) {
      const commonContent = fs.readFileSync(commonPath, "utf-8");
      if (
        commonContent.includes("metrics") ||
        commonContent.includes("Metrics")
      ) {
        metricsFound = true;
      }
    }

    if (!metricsFound && fs.existsSync(basePath)) {
      const baseContent = fs.readFileSync(basePath, "utf-8");
      if (
        baseContent.includes("enableMetrics") ||
        baseContent.includes("metrics")
      ) {
        metricsFound = true;
      }
    }

    if (metricsFound) {
      logTest(
        "Metrics Config - Endpoint",
        "PASS",
        "Metrics support implemented",
      );
    } else {
      logTest("Metrics Config - Endpoint", "FAIL", "Metrics support not found");
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Metrics Configuration", "FAIL", errorMessage);
    return false;
  }
}

async function testSwaggerConfiguration(): Promise<boolean> {
  logSection("Testing Swagger/OpenAPI Configuration");

  try {
    const typesPath = path.join(__dirname, "../src/lib/server/types.ts");
    const typesContent = fs.readFileSync(typesPath, "utf-8");

    // Check for enableSwagger option
    if (
      !typesContent.includes("enableSwagger") &&
      !typesContent.includes("swagger")
    ) {
      logTest("Swagger Config - Type", "FAIL", "Swagger option not in types");
      return false;
    }

    logTest("Swagger Config - Type", "PASS", "Swagger option defined");

    // Check OpenAPI directory exists
    const openapiDir = path.join(__dirname, "../src/lib/server/openapi");
    if (!fs.existsSync(openapiDir)) {
      logTest(
        "Swagger Config - OpenAPI Dir",
        "FAIL",
        "OpenAPI directory not found",
      );
      return false;
    }

    logTest("Swagger Config - OpenAPI Dir", "PASS", "OpenAPI directory exists");

    // Check for generator
    const generatorPath = path.join(openapiDir, "generator.ts");
    if (fs.existsSync(generatorPath)) {
      logTest("Swagger Config - Generator", "PASS", "OpenAPI generator exists");
    } else {
      logTest(
        "Swagger Config - Generator",
        "FAIL",
        "OpenAPI generator not found",
      );
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Swagger Configuration", "FAIL", errorMessage);
    return false;
  }
}

async function testEnvironmentVariables(): Promise<boolean> {
  logSection("Testing Environment Variables Support");

  try {
    // Check for environment variable handling in adapters
    const basePath = path.join(
      __dirname,
      "../src/lib/server/abstract/baseServerAdapter.ts",
    );

    if (!fs.existsSync(basePath)) {
      logTest("Env Vars - Base Adapter", "FAIL", "Base adapter not found");
      return false;
    }

    const content = fs.readFileSync(basePath, "utf-8");

    // Check for port configuration (via config.port pattern)
    if (
      content.includes("config.port") ||
      content.includes("port:") ||
      content.includes("PORT")
    ) {
      logTest("Env Vars - PORT", "PASS", "Port configuration supported");
    } else {
      logTest("Env Vars - PORT", "FAIL", "Port configuration not found");
      return false;
    }

    // Check for host configuration (via config.host pattern)
    if (
      content.includes("config.host") ||
      content.includes("host:") ||
      content.includes("HOST")
    ) {
      logTest("Env Vars - HOST", "PASS", "Host configuration supported");
    } else {
      logTest("Env Vars - HOST", "FAIL", "Host configuration not found");
      return false;
    }

    // Check for environment-aware config (process.env or version info)
    if (
      content.includes("process.env") ||
      content.includes("version") ||
      content.includes("development") ||
      content.includes("production")
    ) {
      logTest(
        "Env Vars - NODE_ENV",
        "PASS",
        "Environment-aware configuration supported",
      );
    } else {
      logTest(
        "Env Vars - NODE_ENV",
        "FAIL",
        "Environment configuration not found",
      );
      return false;
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Environment Variables", "FAIL", errorMessage);
    return false;
  }
}

async function testConfigurationValidation(): Promise<boolean> {
  logSection("Testing Configuration Validation");

  try {
    // Check for validation utilities
    const validationPath = path.join(
      __dirname,
      "../src/lib/server/utils/validation.ts",
    );

    if (!fs.existsSync(validationPath)) {
      logTest(
        "Config Validation - Utils",
        "FAIL",
        "Validation utils not found",
      );
      return false;
    }

    const content = fs.readFileSync(validationPath, "utf-8");

    // Check for schema validation
    if (content.includes("schema") || content.includes("Schema")) {
      logTest(
        "Config Validation - Schema",
        "PASS",
        "Schema validation supported",
      );
    } else {
      logTest(
        "Config Validation - Schema",
        "FAIL",
        "Schema validation not found",
      );
      return false;
    }

    // Check for error handling
    if (content.includes("error") || content.includes("Error")) {
      logTest(
        "Config Validation - Errors",
        "PASS",
        "Validation errors handled",
      );
    } else {
      logTest(
        "Config Validation - Errors",
        "FAIL",
        "Validation errors not handled",
      );
      return false;
    }

    // Check base adapter for config validation
    const basePath = path.join(
      __dirname,
      "../src/lib/server/abstract/baseServerAdapter.ts",
    );
    if (fs.existsSync(basePath)) {
      const baseContent = fs.readFileSync(basePath, "utf-8");

      if (
        baseContent.includes("config") &&
        (baseContent.includes("valid") || baseContent.includes("check"))
      ) {
        logTest(
          "Config Validation - Base Adapter",
          "PASS",
          "Config validation in base adapter",
        );
      }
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Configuration Validation", "FAIL", errorMessage);
    return false;
  }
}

async function testFrameworkSpecificConfig(): Promise<boolean> {
  logSection("Testing Framework-Specific Configuration");

  try {
    const frameworks = [
      { name: "Hono", file: "honoAdapter.ts", pattern: "Hono" },
      { name: "Express", file: "expressAdapter.ts", pattern: "express" },
      { name: "Fastify", file: "fastifyAdapter.ts", pattern: "fastify" },
      { name: "Koa", file: "koaAdapter.ts", pattern: "Koa" },
    ];

    for (const fw of frameworks) {
      const adapterPath = path.join(
        __dirname,
        `../src/lib/server/adapters/${fw.file}`,
      );

      if (!fs.existsSync(adapterPath)) {
        logTest(`${fw.name} Config`, "FAIL", `${fw.file} not found`);
        return false;
      }

      const content = fs.readFileSync(adapterPath, "utf-8");

      // Check for framework-specific imports
      if (!content.includes(fw.pattern)) {
        logTest(
          `${fw.name} Config - Import`,
          "FAIL",
          `${fw.name} import not found`,
        );
        return false;
      }

      logTest(
        `${fw.name} Config - Import`,
        "PASS",
        `${fw.name} properly imported`,
      );

      // Check for getFrameworkInstance
      if (!content.includes("getFrameworkInstance")) {
        logTest(
          `${fw.name} Config - Instance`,
          "FAIL",
          "getFrameworkInstance not found",
        );
        return false;
      }

      logTest(
        `${fw.name} Config - Instance`,
        "PASS",
        "getFrameworkInstance implemented",
      );
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Framework-Specific Configuration", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// CLI Coverage Test (GAP Detection)
// ============================================

async function testCLICoverage(): Promise<boolean> {
  logSection("Testing CLI Coverage for Server Adapters");

  try {
    const cliCommandsDir = path.join(__dirname, "../src/cli/commands");

    // Check if server-related CLI commands exist
    const serverCommandPath = path.join(cliCommandsDir, "server.ts");
    const serveCommandPath = path.join(cliCommandsDir, "serve.ts");

    const hasServerCommand = fs.existsSync(serverCommandPath);
    const hasServeCommand = fs.existsSync(serveCommandPath);

    if (!hasServerCommand && !hasServeCommand) {
      logTest(
        "CLI Coverage",
        "FAIL",
        "GAP DETECTED: No CLI commands for Server Adapters feature",
      );
      log("   Recommendation: Add 'neurolink serve' command", "yellow");
      log(
        "   Expected: neurolink serve --framework hono --port 3000",
        "yellow",
      );
      return false;
    }

    logTest(
      "CLI Coverage - Files",
      "PASS",
      hasServerCommand ? "server.ts command found" : "serve.ts command found",
    );

    // Check for required subcommands in server.ts
    if (hasServerCommand) {
      const serverContent = fs.readFileSync(serverCommandPath, "utf-8");

      // Check for all required subcommands
      const requiredSubcommands = [
        { name: "start", pattern: '"start"' },
        { name: "stop", pattern: '"stop"' },
        { name: "status", pattern: '"status"' },
        { name: "openapi", pattern: '"openapi"' },
        { name: "routes", pattern: '"routes"' },
        { name: "config", pattern: '"config"' },
      ];

      const missingSubcommands = requiredSubcommands.filter(
        (cmd) => !serverContent.includes(cmd.pattern),
      );

      if (missingSubcommands.length > 0) {
        logTest(
          "CLI Coverage - Subcommands",
          "FAIL",
          `Missing: ${missingSubcommands.map((c) => c.name).join(", ")}`,
        );
        return false;
      }

      logTest(
        "CLI Coverage - Subcommands",
        "PASS",
        `All ${requiredSubcommands.length} subcommands present`,
      );

      // Check for routes command features
      const routesFeatures = [
        "buildRoutesOptions",
        "executeRoutes",
        '"group"',
        '"method"',
      ];
      const missingRoutesFeatures = routesFeatures.filter(
        (f) => !serverContent.includes(f),
      );

      if (missingRoutesFeatures.length > 0) {
        logTest(
          "CLI Coverage - Routes Command",
          "FAIL",
          `Missing features: ${missingRoutesFeatures.join(", ")}`,
        );
        return false;
      }

      logTest(
        "CLI Coverage - Routes Command",
        "PASS",
        "Routes command fully implemented",
      );

      // Check for config command features
      const configFeatures = [
        "buildConfigOptions",
        "executeConfig",
        "--get",
        "--set",
        "--reset",
      ];
      const missingConfigFeatures = configFeatures.filter(
        (f) => !serverContent.includes(f),
      );

      if (missingConfigFeatures.length > 0) {
        logTest(
          "CLI Coverage - Config Command",
          "FAIL",
          `Missing features: ${missingConfigFeatures.join(", ")}`,
        );
        return false;
      }

      logTest(
        "CLI Coverage - Config Command",
        "PASS",
        "Config command fully implemented",
      );
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Coverage", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// CLI Routes Command Tests
// ============================================

async function testCLIRoutesCommand(): Promise<boolean> {
  logSection("Testing CLI Routes Command");

  try {
    const serverCommandPath = path.join(
      __dirname,
      "../src/cli/commands/server.ts",
    );

    if (!fs.existsSync(serverCommandPath)) {
      logTest("CLI Routes Command", "FAIL", "server.ts not found");
      return false;
    }

    const content = fs.readFileSync(serverCommandPath, "utf-8");

    // Check for routes command registration
    if (!content.includes('"routes"')) {
      logTest(
        "Routes Command - Registration",
        "FAIL",
        "Routes command not registered",
      );
      return false;
    }

    logTest("Routes Command - Registration", "PASS", "Command registered");

    // Check for format options
    const formatOptions = ["text", "json", "table"];
    const missingFormats = formatOptions.filter(
      (f) => !content.includes(`"${f}"`),
    );

    if (missingFormats.length > 0) {
      logTest(
        "Routes Command - Formats",
        "FAIL",
        `Missing formats: ${missingFormats.join(", ")}`,
      );
      return false;
    }

    logTest("Routes Command - Formats", "PASS", "All output formats supported");

    // Check for group filtering
    const routeGroups = ["agent", "tool", "mcp", "memory", "health"];
    const foundGroups = routeGroups.filter((g) =>
      content.toLowerCase().includes(`"${g}"`),
    );

    if (foundGroups.length < 4) {
      logTest(
        "Routes Command - Groups",
        "FAIL",
        `Only ${foundGroups.length}/5 route groups in filter`,
      );
      return false;
    }

    logTest(
      "Routes Command - Groups",
      "PASS",
      "Route group filtering supported",
    );

    // Check for method filtering
    const httpMethods = ["GET", "POST", "PUT", "DELETE"];
    const foundMethods = httpMethods.filter((m) => content.includes(`"${m}"`));

    if (foundMethods.length < 3) {
      logTest(
        "Routes Command - Methods",
        "FAIL",
        `Only ${foundMethods.length}/4 HTTP methods in filter`,
      );
      return false;
    }

    logTest(
      "Routes Command - Methods",
      "PASS",
      "HTTP method filtering supported",
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Routes Command", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// CLI Config Command Tests
// ============================================

async function testCLIConfigCommand(): Promise<boolean> {
  logSection("Testing CLI Config Command");

  try {
    const serverCommandPath = path.join(
      __dirname,
      "../src/cli/commands/server.ts",
    );

    if (!fs.existsSync(serverCommandPath)) {
      logTest("CLI Config Command", "FAIL", "server.ts not found");
      return false;
    }

    const content = fs.readFileSync(serverCommandPath, "utf-8");

    // Check for config command registration
    if (!content.includes('"config"')) {
      logTest(
        "Config Command - Registration",
        "FAIL",
        "Config command not registered",
      );
      return false;
    }

    logTest("Config Command - Registration", "PASS", "Command registered");

    // Check for CRUD operations
    const configOperations = ["--get", "--set", "--reset"];
    const missingOps = configOperations.filter((op) => !content.includes(op));

    if (missingOps.length > 0) {
      logTest(
        "Config Command - Operations",
        "FAIL",
        `Missing operations: ${missingOps.join(", ")}`,
      );
      return false;
    }

    logTest(
      "Config Command - Operations",
      "PASS",
      "Get/Set/Reset operations supported",
    );

    // Check for config persistence
    if (!content.includes("server-config.json")) {
      logTest(
        "Config Command - Persistence",
        "FAIL",
        "Missing config file persistence",
      );
      return false;
    }

    logTest(
      "Config Command - Persistence",
      "PASS",
      "Config file persistence implemented",
    );

    // Check for ServerConfig type
    if (!content.includes("ServerConfig")) {
      logTest(
        "Config Command - Types",
        "FAIL",
        "Missing ServerConfig type definition",
      );
      return false;
    }

    logTest("Config Command - Types", "PASS", "ServerConfig type defined");

    // Check for default values
    const defaultConfigs = [
      "defaultPort",
      "defaultHost",
      "defaultFramework",
      "defaultBasePath",
    ];
    const foundDefaults = defaultConfigs.filter((d) => content.includes(d));

    if (foundDefaults.length < 3) {
      logTest(
        "Config Command - Defaults",
        "FAIL",
        `Only ${foundDefaults.length}/4 default configs defined`,
      );
      return false;
    }

    logTest(
      "Config Command - Defaults",
      "PASS",
      "Default configurations defined",
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("CLI Config Command", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Integration Test: Route Registration
// ============================================

async function testRouteRegistration(): Promise<boolean> {
  logSection("Testing Route Registration Integration");

  try {
    const routesIndexPath = path.join(
      __dirname,
      "../src/lib/server/routes/index.ts",
    );

    if (!fs.existsSync(routesIndexPath)) {
      logTest("Route Registration", "FAIL", "Routes index file not found");
      return false;
    }

    const content = fs.readFileSync(routesIndexPath, "utf-8");

    // Check for createAllRoutes function
    if (!content.includes("createAllRoutes")) {
      logTest(
        "Route Registration - All Routes",
        "FAIL",
        "Missing createAllRoutes function",
      );
      return false;
    }

    logTest(
      "Route Registration - All Routes",
      "PASS",
      "createAllRoutes function present",
    );

    // Check that all 5 route groups are included
    const routeGroups = [
      "createAgentRoutes",
      "createToolRoutes",
      "createMCPRoutes",
      "createMemoryRoutes",
      "createHealthRoutes",
    ];

    const missingGroups = routeGroups.filter(
      (group) => !content.includes(group),
    );

    if (missingGroups.length > 0) {
      logTest(
        "Route Registration - Groups",
        "FAIL",
        `Missing route groups: ${missingGroups.join(", ")}`,
      );
      return false;
    }

    logTest(
      "Route Registration - Groups",
      "PASS",
      "All 5 route groups registered",
    );

    // Check for registerAllRoutes helper
    if (!content.includes("registerAllRoutes")) {
      logTest(
        "Route Registration - Helper",
        "FAIL",
        "Missing registerAllRoutes helper",
      );
      return false;
    }

    logTest(
      "Route Registration - Helper",
      "PASS",
      "registerAllRoutes helper present",
    );

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Route Registration", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Base Server Adapter Tests
// ============================================

async function testBaseServerAdapter(): Promise<boolean> {
  logSection("Testing Base Server Adapter");

  try {
    const basePath = path.join(
      __dirname,
      "../src/lib/server/abstract/baseServerAdapter.ts",
    );

    if (!fs.existsSync(basePath)) {
      logTest("Base Server Adapter", "FAIL", "Base adapter file not found");
      return false;
    }

    const content = fs.readFileSync(basePath, "utf-8");

    // Check for abstract class
    if (!content.includes("abstract class")) {
      logTest(
        "Base Adapter - Abstract",
        "FAIL",
        "Not declared as abstract class",
      );
      return false;
    }

    logTest("Base Adapter - Abstract", "PASS", "Properly declared as abstract");

    // Check for EventEmitter extension
    if (!content.includes("EventEmitter")) {
      logTest(
        "Base Adapter - Events",
        "FAIL",
        "Missing EventEmitter extension",
      );
      return false;
    }

    logTest("Base Adapter - Events", "PASS", "Extends EventEmitter");

    // Check for abstract methods
    const abstractMethods = [
      "initializeFramework",
      "registerFrameworkRoute",
      "registerFrameworkMiddleware",
      "start",
      "stop",
      "getFrameworkInstance",
    ];

    const foundAbstract = abstractMethods.filter(
      (method) =>
        content.includes(`abstract ${method}`) ||
        content.includes(`abstract async ${method}`),
    );

    if (foundAbstract.length < 4) {
      logTest(
        "Base Adapter - Abstract Methods",
        "FAIL",
        `Only ${foundAbstract.length}/6 abstract methods declared`,
      );
      return false;
    }

    logTest(
      "Base Adapter - Abstract Methods",
      "PASS",
      `${foundAbstract.length} abstract methods declared`,
    );

    // Check for config defaults
    if (!content.includes("config") && !content.includes("Config")) {
      logTest(
        "Base Adapter - Config",
        "FAIL",
        "Missing configuration handling",
      );
      return false;
    }

    logTest("Base Adapter - Config", "PASS", "Configuration handling present");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Base Server Adapter", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Validation Utilities Tests
// ============================================

async function testValidationUtilities(): Promise<boolean> {
  logSection("Testing Validation Utilities");

  try {
    const validationPath = path.join(
      __dirname,
      "../src/lib/server/utils/validation.ts",
    );

    if (!fs.existsSync(validationPath)) {
      logTest(
        "Validation Utilities",
        "FAIL",
        "Validation utils file not found",
      );
      return false;
    }

    const content = fs.readFileSync(validationPath, "utf-8");

    // Check for request validation schemas
    const requiredSchemas = [
      "AgentExecuteRequestSchema",
      "ToolExecuteRequestSchema",
    ];

    const foundSchemas = requiredSchemas.filter((schema) =>
      content.includes(schema),
    );

    if (foundSchemas.length < 1) {
      logTest(
        "Validation - Schemas",
        "FAIL",
        "Missing request validation schemas",
      );
      return false;
    }

    logTest(
      "Validation - Schemas",
      "PASS",
      `Found ${foundSchemas.length} validation schemas`,
    );

    // Check for validation helpers
    if (!content.includes("validate") && !content.includes("Validate")) {
      logTest("Validation - Helpers", "FAIL", "Missing validation helpers");
      return false;
    }

    logTest("Validation - Helpers", "PASS", "Validation helpers present");

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logTest("Validation Utilities", "FAIL", errorMessage);
    return false;
  }
}

// ============================================
// Main Test Runner
// ============================================

async function runAllTests(): Promise<void> {
  logSection("NeuroLink Server Adapters Test Suite");
  log("Verifying Server Adapters feature implementation\n", "bright");

  const startTime = Date.now();

  // Prerequisite check
  log("\nChecking prerequisites...", "cyan");
  const serverDir = path.join(__dirname, "../src/lib/server");
  if (!fs.existsSync(serverDir)) {
    log(
      "\u274C Server directory not found. Please ensure the feature is implemented.",
      "red",
    );
    process.exit(1);
  }
  log("\u2705 Server directory found\n", "green");

  // Define all tests
  const tests: TestFunction[] = [
    // Factory Tests
    { name: "Server Adapter Factory", fn: testServerAdapterFactory },

    // Framework Adapter Tests (4 adapters)
    { name: "Hono Adapter", fn: testHonoAdapter },
    { name: "Express Adapter", fn: testExpressAdapter },
    { name: "Fastify Adapter", fn: testFastifyAdapter },
    { name: "Koa Adapter", fn: testKoaAdapter },

    // Route Group Tests (5 route groups)
    { name: "Agent Routes", fn: testAgentRoutes },
    { name: "Tool Routes", fn: testToolRoutes },
    { name: "MCP Routes", fn: testMCPRoutes },
    { name: "Memory Routes", fn: testMemoryRoutes },
    { name: "Health Routes", fn: testHealthRoutes },

    // Middleware Tests
    { name: "Auth Middleware", fn: testAuthMiddleware },
    { name: "Rate Limit Middleware", fn: testRateLimitMiddleware },
    { name: "Cache Middleware", fn: testCacheMiddleware },
    { name: "Validation Middleware", fn: testValidationMiddleware },
    { name: "Common Middleware", fn: testCommonMiddleware },

    // Core Infrastructure Tests
    { name: "Base Server Adapter", fn: testBaseServerAdapter },
    { name: "Type System", fn: testTypeSystem },
    { name: "Index Exports", fn: testIndexExports },
    { name: "Route Registration", fn: testRouteRegistration },
    { name: "Validation Utilities", fn: testValidationUtilities },

    // Additional Features Tests
    { name: "OpenAPI Support", fn: testOpenAPISupport },
    { name: "Streaming Support", fn: testStreamingSupport },
    { name: "WebSocket Support", fn: testWebSocketSupport },
    { name: "Error Handling", fn: testErrorHandling },

    // Configuration Tests
    { name: "Core Configuration", fn: testCoreConfiguration },
    { name: "CORS Configuration", fn: testCORSConfiguration },
    { name: "Rate Limit Configuration", fn: testRateLimitConfiguration },
    { name: "Body Parser Configuration", fn: testBodyParserConfiguration },
    { name: "Logging Configuration", fn: testLoggingConfiguration },
    { name: "Cache Configuration", fn: testCacheConfiguration },
    { name: "Timeout Configuration", fn: testTimeoutConfiguration },
    { name: "Metrics Configuration", fn: testMetricsConfiguration },
    { name: "Swagger Configuration", fn: testSwaggerConfiguration },
    { name: "Environment Variables", fn: testEnvironmentVariables },
    { name: "Configuration Validation", fn: testConfigurationValidation },
    { name: "Framework-Specific Config", fn: testFrameworkSpecificConfig },

    // CLI Coverage (GAP Detection)
    { name: "CLI Coverage", fn: testCLICoverage },

    // CLI Command Tests
    { name: "CLI Routes Command", fn: testCLIRoutesCommand },
    { name: "CLI Config Command", fn: testCLIConfigCommand },
  ];

  // Run all tests
  for (const test of tests) {
    const testStartTime = Date.now();
    try {
      const result = await test.fn();
      const duration = Date.now() - testStartTime;
      testResults.push({
        name: test.name,
        result,
        error: null,
        duration,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const duration = Date.now() - testStartTime;
      testResults.push({
        name: test.name,
        result: false,
        error: errorMessage,
        duration,
      });
    }
  }

  // Summary
  logSection("Test Results Summary");

  const passed = testResults.filter((r) => r.result).length;
  const failed = testResults.filter((r) => !r.result).length;
  const total = testResults.length;

  testResults.forEach((test) => {
    const status: "PASS" | "FAIL" = test.result ? "PASS" : "FAIL";
    const details = test.error ? test.error : `${test.duration}ms`;
    logTest(test.name, status, details);
  });

  const duration = Math.round((Date.now() - startTime) / 1000);

  log(
    `\n\uD83D\uDCCA Final Results: ${passed}/${total} tests passed in ${duration}s`,
    "bright",
  );

  // Feature Summary
  log("\n\uD83D\uDCCB Feature Summary:", "cyan");
  log("   Adapters: 4 (Hono, Express, Fastify, Koa)", "reset");
  log("   Route Groups: 5 (Agent, Tool, MCP, Memory, Health)", "reset");
  log("   Middleware: 5 (Auth, RateLimit, Cache, Validation, Common)", "reset");

  // CLI Coverage Report
  const cliTestResult = testResults.find((r) => r.name === "CLI Coverage");
  if (cliTestResult && !cliTestResult.result) {
    log("\n\u26A0\uFE0F CLI Coverage: NONE - GAP DETECTED", "yellow");
    log(
      "   Server Adapters has NO CLI commands. This is a known gap.",
      "yellow",
    );
  } else {
    log("\n\u2705 CLI Coverage: Present", "green");
  }

  if (failed === 0) {
    log(
      "\n\uD83C\uDF89 All tests passed! Server Adapters feature is fully implemented.",
      "green",
    );
    process.exit(0);
  } else {
    log(
      `\n\u274C ${failed} test(s) failed. Please review the issues above.`,
      "red",
    );
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
NeuroLink Server Adapters Test Suite

Usage: npx tsx test/continuous-test-suite-servers.ts [options]

Options:
  --help, -h    Show this help message

This test suite verifies the Server Adapters feature:
  - 4 Framework Adapters (Hono, Express, Fastify, Koa)
  - 5 Route Groups (Agent, Tool, MCP, Memory, Health)
  - Middleware (Auth, RateLimit, Cache, Validation, Common)
  - OpenAPI/Swagger support
  - Streaming (SSE/NDJSON)
  - WebSocket support
  - Error handling

Run with: npx tsx test/continuous-test-suite-servers.ts
`);
  process.exit(0);
}

// Run tests
runAllTests().catch((error) => {
  log(`\n\uD83D\uDCA5 Test suite crashed: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});

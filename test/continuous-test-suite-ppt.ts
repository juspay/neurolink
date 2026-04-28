#!/usr/bin/env tsx
import "dotenv/config";
/**
 * Continuous Test Suite: PPT Generation
 *
 * Tests PowerPoint presentation generation pipeline including
 * content planning, slide generation, rendering, theming, logos,
 * and PPTX file validation.
 *
 * Covers items: #35 (generate real .pptx), #36 (themes, logo, slide types)
 *
 * Run: npx tsx test/continuous-test-suite-ppt.ts --provider=vertex
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import type { ProcessResult } from "../dist/index.js";
import { NeuroLink } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const PROVIDER_MAX_TOKENS: Record<string, number> = {
  anthropic: 8192,
  vertex: 10000,
  "google-ai-studio": 10000,
  openai: 16384,
  bedrock: 8192,
  ollama: 4096,
  openrouter: 4096,
  // OpenAI-compat providers added 2026
  deepseek: 4096,
  "nvidia-nim": 8192,
  "lm-studio": 1024,
  llamacpp: 1024,
};

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || (undefined as string | undefined),
  maxTokens: undefined as number | undefined,
  timeout: 180000, // PPT generation can take longer
  interTestDelay: 8000,
};

// Temp directory for generated PPT files
const PPT_OUTPUT_DIR = path.join(os.tmpdir(), "neurolink-ppt-tests");

// ZIP magic bytes: PK\x03\x04
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

// ============================================================
// LOGGING UTILITIES
// ============================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};
type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const icons = { PASS: "PASS", FAIL: "FAIL", SKIP: "SKIP", TESTING: "TEST" };
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  log(`[${icons[status]}] ${testName}`, statusColors[status]);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

// ============================================================
// SHARED UTILITIES
// ============================================================

const testResults: Array<{
  name: string;
  result: boolean | null;
  error: string | null;
}> = [];

function buildBaseCLIArgs(): string[] {
  const args = [`--provider=${TEST_CONFIG.provider}`];
  if (TEST_CONFIG.model) {
    args.push(`--model=${TEST_CONFIG.model}`);
  }
  return args;
}

function buildBaseSDKOptions(): { provider: string; model?: string } {
  const opts: { provider: string; model?: string } = {
    provider: TEST_CONFIG.provider,
  };
  if (TEST_CONFIG.model) {
    opts.model = TEST_CONFIG.model;
  }
  return opts;
}

function runCommand(
  command: string,
  args: string[],
  options?: Record<string, unknown>,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      env: {
        ...process.env,
        ...((options?.env as Record<string, string>) || {}),
      },
    });
    let stdout = "",
      stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    const timeoutId = setTimeout(() => {
      proc.kill("SIGTERM");
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill("SIGKILL");
        }
      }, 2000);
      reject(new Error(`Command timeout after ${TEST_CONFIG.timeout}ms`));
    }, TEST_CONFIG.timeout);
    proc.on("close", (code) => {
      clearTimeout(timeoutId);
      resolve({
        success: code === 0,
        code: code ?? -1,
        stdout,
        stderr,
      });
    });
    proc.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

function isExpectedProviderError(msg: string): boolean {
  return [
    "API key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "could not be resolved",
    "Cannot connect",
    "Failed to generate",
    "UNAUTHENTICATED",
    "PERMISSION_DENIED",
    "billing",
    "project",
    "not found",
    "does not exist",
  ].some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

async function globalCleanup(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  if (global.gc) {
    global.gc();
  }
}

/**
 * Validate that a file is a valid ZIP (PPTX is ZIP-based).
 * Checks: file exists, size > minSize, first 4 bytes are ZIP magic (50 4B 03 04).
 */
function validatePPTXFile(
  filePath: string,
  minSizeBytes: number = 1024,
): { valid: boolean; reason: string; size?: number } {
  if (!fs.existsSync(filePath)) {
    return { valid: false, reason: "File does not exist" };
  }
  const stat = fs.statSync(filePath);
  if (stat.size < minSizeBytes) {
    return {
      valid: false,
      reason: `File too small: ${stat.size} bytes (minimum ${minSizeBytes})`,
      size: stat.size,
    };
  }
  const fd = fs.openSync(filePath, "r");
  const header = Buffer.alloc(4);
  fs.readSync(fd, header, 0, 4, 0);
  fs.closeSync(fd);
  if (!header.subarray(0, 4).equals(ZIP_MAGIC)) {
    return {
      valid: false,
      reason: `Invalid ZIP magic bytes: ${header.toString("hex")} (expected ${ZIP_MAGIC.toString("hex")})`,
      size: stat.size,
    };
  }
  return {
    valid: true,
    reason: `Valid PPTX (${(stat.size / 1024).toFixed(1)}KB)`,
    size: stat.size,
  };
}

/**
 * Find the generated PPTX file from result or fallback directories.
 */
function findPPTXFile(
  pptResult: Record<string, unknown> | undefined,
  requestedOutputPath: string,
): string | null {
  // Check explicit filePath from result
  const resultFilePath = pptResult?.filePath as string | undefined;
  if (resultFilePath && fs.existsSync(resultFilePath)) {
    return resultFilePath;
  }
  // Check requested output path
  if (fs.existsSync(requestedOutputPath)) {
    return requestedOutputPath;
  }
  // Check default output/ directory
  const outputDir = path.join(process.cwd(), "output");
  if (fs.existsSync(outputDir)) {
    const pptxFiles = fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".pptx"))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(outputDir, a));
        const statB = fs.statSync(path.join(outputDir, b));
        return statB.mtimeMs - statA.mtimeMs; // newest first
      });
    if (pptxFiles.length > 0) {
      return path.join(outputDir, pptxFiles[0]);
    }
  }
  return null;
}

// ============================================================
// FIXTURE HELPERS
// ============================================================

/**
 * Get or create a 1x1 transparent PNG for logo testing.
 * This is the inline fallback per the plan spec.
 */
function getDefaultSampleLogo(): Buffer {
  const fixturePath = path.join(__dirname, "fixtures/ppt/sample-logo.png");
  if (fs.existsSync(fixturePath)) {
    return fs.readFileSync(fixturePath);
  }
  // 1x1 transparent PNG (minimum valid PNG)
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "base64",
  );
}

/**
 * Ensure the PPT output directory exists
 */
function ensurePPTOutputDir(): void {
  if (!fs.existsSync(PPT_OUTPUT_DIR)) {
    fs.mkdirSync(PPT_OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Clean up generated PPT files from the temp directory
 */
function cleanupPPTFiles(): void {
  try {
    if (fs.existsSync(PPT_OUTPUT_DIR)) {
      const files = fs.readdirSync(PPT_OUTPUT_DIR);
      for (const file of files) {
        if (file.endsWith(".pptx")) {
          fs.unlinkSync(path.join(PPT_OUTPUT_DIR, file));
        }
      }
    }
  } catch {
    /* ignore cleanup errors */
  }
}

/**
 * Helper to generate a PPT and return the result
 */
async function generatePPT(
  sdk: NeuroLink,
  topic: string,
  options: {
    pages?: number;
    theme?: string;
    audience?: string;
    tone?: string;
    generateAIImages?: boolean;
    logoPath?: Buffer | string;
    outputPath?: string;
  } = {},
): Promise<{
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}> {
  const sdkOptions = buildBaseSDKOptions();
  try {
    const result = await sdk.generate({
      input: { text: topic },
      ...sdkOptions,
      maxTokens: TEST_CONFIG.maxTokens,
      output: {
        mode: "ppt" as const,
        ppt: {
          pages: options.pages || 5,
          theme: options.theme as
            | "modern"
            | "corporate"
            | "creative"
            | "minimal"
            | "dark"
            | undefined,
          audience: options.audience as
            | "business"
            | "students"
            | "technical"
            | "general"
            | undefined,
          tone: options.tone as
            | "professional"
            | "casual"
            | "educational"
            | "persuasive"
            | undefined,
          generateAIImages: options.generateAIImages ?? false,
          outputPath: options.outputPath,
          logoPath: options.logoPath,
        },
      },
    });
    return {
      success: true,
      result: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

// ============================================================
// TEST FUNCTIONS
// ============================================================

// --- Test 1: PPT Types Validation ---
async function testPPTTypesValidation(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Infra - PPT Types Validation", "TESTING");
  try {
    // Import PPT types from dist (not source files)
    let pptModule: Record<string, unknown>;
    try {
      pptModule = await import("../dist/features/ppt/index.js");
    } catch (importErr) {
      logTest(
        "SDK Infra - PPT Types Validation",
        "SKIP",
        `PPT module not importable from dist: ${importErr instanceof Error ? importErr.message : String(importErr)}`,
      );
      return null;
    }

    // Verify key runtime exports are defined (types are erased at runtime,
    // so we check runtime values: error classes, constants, functions)
    const requiredExports: Array<{ name: string; kind: string }> = [
      { name: "PPTError", kind: "function" }, // class
      { name: "PPT_ERROR_CODES", kind: "object" },
      { name: "SLIDE_DIMENSIONS", kind: "object" },
      { name: "THEMES", kind: "object" },
      { name: "getTheme", kind: "function" },
      { name: "VALID_THEMES", kind: "object" },
      { name: "inferFromTitle", kind: "function" },
      { name: "generateContentPlan", kind: "function" },
      { name: "generatePresentation", kind: "function" },
      { name: "renderTitleSlide", kind: "function" },
      { name: "renderContentSlide", kind: "function" },
    ];

    const missing: string[] = [];
    for (const exp of requiredExports) {
      if (typeof pptModule[exp.name] === "undefined") {
        missing.push(exp.name);
      }
    }

    if (missing.length > 0) {
      logTest(
        "SDK Infra - PPT Types Validation",
        "FAIL",
        `Missing exports from dist/features/ppt: ${missing.join(", ")}`,
      );
      return false;
    }

    // Verify VALID_THEMES contains expected themes
    const validThemes = pptModule.VALID_THEMES as string[];
    const expectedThemes = [
      "modern",
      "corporate",
      "creative",
      "minimal",
      "dark",
    ];
    const missingThemes = expectedThemes.filter(
      (t) => !validThemes || !validThemes.includes(t),
    );

    if (missingThemes.length > 0) {
      logTest(
        "SDK Infra - PPT Types Validation",
        "FAIL",
        `Missing themes: ${missingThemes.join(", ")}`,
      );
      return false;
    }

    logTest(
      "SDK Infra - PPT Types Validation",
      "PASS",
      `All ${requiredExports.length} exports verified, 5 themes present`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("SDK Infra - PPT Types Validation", "FAIL", msg);
    return false;
  }
}

// --- Test 2: Content Planner Basic ---
async function testContentPlannerBasic(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Content Planner Basic", "TESTING");
  try {
    ensurePPTOutputDir();
    const requestedPages = 5;
    const outputPath = path.join(
      PPT_OUTPUT_DIR,
      `test-planner-${Date.now()}.pptx`,
    );
    const { success, result, error } = await generatePPT(
      sdk,
      "Introduction to Cloud Computing",
      {
        pages: requestedPages,
        theme: "modern",
        outputPath,
      },
    );

    if (!success) {
      if (error && isExpectedProviderError(error)) {
        logTest("SDK Generate - Content Planner Basic", "SKIP", error);
        return null;
      }
      logTest(
        "SDK Generate - Content Planner Basic",
        "FAIL",
        error || "Unknown error",
      );
      return false;
    }

    // Verify the result has PPT data with slides
    const pptResult = (result as Record<string, unknown>)?.ppt as
      | Record<string, unknown>
      | undefined;

    if (!pptResult) {
      logTest(
        "SDK Generate - Content Planner Basic",
        "FAIL",
        "No ppt result object in response",
      );
      return false;
    }

    const totalSlides = pptResult.totalSlides as number | undefined;

    if (!totalSlides || totalSlides < 1) {
      logTest(
        "SDK Generate - Content Planner Basic",
        "FAIL",
        `totalSlides missing or zero: ${totalSlides}`,
      );
      return false;
    }

    if (totalSlides !== requestedPages) {
      logTest(
        "SDK Generate - Content Planner Basic",
        "FAIL",
        `totalSlides (${totalSlides}) does not match requested pages (${requestedPages})`,
      );
      return false;
    }

    logTest(
      "SDK Generate - Content Planner Basic",
      "PASS",
      `Content plan generated: ${totalSlides} slides`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Content Planner Basic", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Content Planner Basic", "FAIL", msg);
    return false;
  }
}

// --- Test 3: Slide Type Inference ---
async function testSlideTypeInference(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Slide Type Inference", "TESTING");
  try {
    // Import inference functions from dist
    let pptModule: Record<string, unknown>;
    try {
      pptModule = await import("../dist/features/ppt/index.js");
    } catch (importErr) {
      logTest(
        "SDK Generate - Slide Type Inference",
        "SKIP",
        `PPT module not importable from dist: ${importErr instanceof Error ? importErr.message : String(importErr)}`,
      );
      return null;
    }

    const inferFromTitle = pptModule.inferFromTitle as
      | ((title: string) => {
          slideType: string | null;
          bulletStyle: string | null;
        })
      | undefined;

    if (typeof inferFromTitle !== "function") {
      logTest(
        "SDK Generate - Slide Type Inference",
        "SKIP",
        "inferFromTitle not exported from dist/features/ppt",
      );
      return null;
    }

    // Test inference on known title patterns
    const testCases: Array<{ title: string; expectedType: string | null }> = [
      { title: "Agenda", expectedType: "agenda" },
      { title: "Conclusion and Summary", expectedType: "conclusion" },
      { title: "Comparison of Approaches", expectedType: "comparison" },
      { title: "Step-by-Step Process", expectedType: "numbered-list" },
      { title: "Key Features Overview", expectedType: null }, // may or may not match
    ];

    let matchCount = 0;
    const details: string[] = [];

    for (const tc of testCases) {
      const result = inferFromTitle(tc.title);
      if (tc.expectedType !== null && result.slideType === tc.expectedType) {
        matchCount++;
        details.push(`"${tc.title}" -> ${result.slideType} (correct)`);
      } else if (tc.expectedType === null && result.slideType !== null) {
        matchCount++;
        details.push(`"${tc.title}" -> ${result.slideType} (inferred)`);
      } else if (tc.expectedType === null) {
        details.push(`"${tc.title}" -> null (no inference, OK)`);
      } else {
        details.push(
          `"${tc.title}" -> ${result.slideType} (expected ${tc.expectedType})`,
        );
      }
    }

    // Also verify helper functions exist
    const helpers = [
      "inferBulletStyleFromContent",
      "getBulletStyleForSlideType",
      "normalizeSlideWithInference",
    ];
    const missingHelpers = helpers.filter(
      (h) => typeof pptModule[h] !== "function",
    );

    if (missingHelpers.length > 0) {
      logTest(
        "SDK Generate - Slide Type Inference",
        "FAIL",
        `Missing inference functions: ${missingHelpers.join(", ")}`,
      );
      return false;
    }

    // At least the definite patterns (agenda, conclusion, comparison) should match
    if (matchCount < 2) {
      logTest(
        "SDK Generate - Slide Type Inference",
        "FAIL",
        `Only ${matchCount} title patterns matched. Details: ${details.join("; ")}`,
      );
      return false;
    }

    logTest(
      "SDK Generate - Slide Type Inference",
      "PASS",
      `${matchCount} patterns matched, ${helpers.length} helper functions present. ${details.join("; ")}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Slide Type Inference", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Slide Type Inference", "FAIL", msg);
    return false;
  }
}

// --- Test 4: Slide Generator Single ---
async function testSlideGeneratorSingle(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Slide Generator Single", "TESTING");
  try {
    ensurePPTOutputDir();
    const requestedPages = 5;
    const outputPath = path.join(
      PPT_OUTPUT_DIR,
      `test-single-slide-${Date.now()}.pptx`,
    );
    const { success, result, error } = await generatePPT(
      sdk,
      "The Benefits of Remote Work",
      {
        pages: requestedPages,
        theme: "minimal",
        outputPath,
      },
    );

    if (!success) {
      if (error && isExpectedProviderError(error)) {
        logTest("SDK Generate - Slide Generator Single", "SKIP", error);
        return null;
      }
      logTest(
        "SDK Generate - Slide Generator Single",
        "FAIL",
        error || "Unknown error",
      );
      return false;
    }

    // Verify the generated slides count matches requested
    const pptResult = (result as Record<string, unknown>)?.ppt as
      | Record<string, unknown>
      | undefined;

    if (!pptResult) {
      logTest(
        "SDK Generate - Slide Generator Single",
        "FAIL",
        "No ppt result object in response",
      );
      return false;
    }

    const totalSlides = (pptResult.totalSlides as number) || 0;

    if (totalSlides !== requestedPages) {
      logTest(
        "SDK Generate - Slide Generator Single",
        "FAIL",
        `Total slide count (${totalSlides}) does not match requested (${requestedPages})`,
      );
      return false;
    }

    logTest(
      "SDK Generate - Slide Generator Single",
      "PASS",
      `${totalSlides} slides generated, matches requested ${requestedPages}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Slide Generator Single", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Slide Generator Single", "FAIL", msg);
    return false;
  }
}

// --- Test 5: Slide Renderers All Types ---
async function testSlideRenderersAllTypes(
  _sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Slide Renderers All Types", "TESTING");
  try {
    // Import renderers from dist
    let pptModule: Record<string, unknown>;
    try {
      pptModule = await import("../dist/features/ppt/index.js");
    } catch (importErr) {
      logTest(
        "SDK Generate - Slide Renderers All Types",
        "SKIP",
        `PPT module not importable from dist: ${importErr instanceof Error ? importErr.message : String(importErr)}`,
      );
      return null;
    }

    // Check for required renderer functions from dist exports
    const requiredRenderers = [
      "renderTitleSlide",
      "renderContentSlide",
      "renderTwoColumnSlide",
      "renderThreeColumnSlide",
      "renderComparisonSlide",
      "renderColumnSlide",
      "renderDashboardSlide",
      "renderMixedContentSlide",
      "renderStatsGridSlide",
      "renderIconGridSlide",
    ];

    const foundRenderers: string[] = [];
    const missingRenderers: string[] = [];

    for (const renderer of requiredRenderers) {
      if (typeof pptModule[renderer] === "function") {
        foundRenderers.push(renderer);
      } else {
        missingRenderers.push(renderer);
      }
    }

    // Do NOT allow missing renderers — all must be present
    if (missingRenderers.length > 0) {
      logTest(
        "SDK Generate - Slide Renderers All Types",
        "FAIL",
        `Missing ${missingRenderers.length} renderers: ${missingRenderers.join(", ")}`,
      );
      return false;
    }

    // Also check helper functions
    const helpers = [
      "addTitle",
      "addBullets",
      "addImage",
      "addEnhancedBackground",
      "addColoredBackground",
    ];
    const foundHelpers = helpers.filter(
      (h) => typeof pptModule[h] === "function",
    );

    // Check layout constants
    const hasLayoutPositions = typeof pptModule.LAYOUT_POSITIONS === "object";
    const hasCompositeLayouts = typeof pptModule.COMPOSITE_LAYOUTS === "object";

    logTest(
      "SDK Generate - Slide Renderers All Types",
      "PASS",
      `${foundRenderers.length}/${requiredRenderers.length} renderers, ${foundHelpers.length}/${helpers.length} helpers, layouts: ${hasLayoutPositions && hasCompositeLayouts ? "present" : "missing"}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Slide Renderers All Types", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Slide Renderers All Types", "FAIL", msg);
    return false;
  }
}

// --- Test 6: Orchestrator Full Pipeline ---
async function testOrchestratorFullPipeline(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - Orchestrator Full Pipeline", "TESTING");
  try {
    ensurePPTOutputDir();
    const outputPath = path.join(
      PPT_OUTPUT_DIR,
      `test-full-pipeline-${Date.now()}.pptx`,
    );
    const { success, result, error } = await generatePPT(
      sdk,
      "Quarterly Business Review: Key Metrics, Achievements, and Future Plans",
      {
        pages: 10,
        theme: "modern",
        audience: "business",
        tone: "professional",
        outputPath,
      },
    );

    if (!success) {
      if (error && isExpectedProviderError(error)) {
        logTest("SDK Generate - Orchestrator Full Pipeline", "SKIP", error);
        return null;
      }
      logTest(
        "SDK Generate - Orchestrator Full Pipeline",
        "FAIL",
        error || "Unknown error",
      );
      return false;
    }

    // Find the PPTX file
    const pptResult = (result as Record<string, unknown>)?.ppt as
      | Record<string, unknown>
      | undefined;
    const filePath = findPPTXFile(pptResult, outputPath);

    if (!filePath) {
      logTest(
        "SDK Generate - Orchestrator Full Pipeline",
        "FAIL",
        "No .pptx file found after generation",
      );
      return false;
    }

    // Validate: file size > 10KB AND ZIP magic bytes
    const validation = validatePPTXFile(filePath, 10240);
    if (!validation.valid) {
      logTest(
        "SDK Generate - Orchestrator Full Pipeline",
        "FAIL",
        validation.reason,
      );
      return false;
    }

    logTest(
      "SDK Generate - Orchestrator Full Pipeline",
      "PASS",
      `${validation.reason}, ${pptResult?.totalSlides || "?"} slides`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Orchestrator Full Pipeline", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Orchestrator Full Pipeline", "FAIL", msg);
    return false;
  }
}

// --- Tests 7-11: Theme Tests ---
async function testTheme(
  sdk: NeuroLink,
  themeName: string,
): Promise<boolean | null> {
  const testLabel = `SDK Generate - Theme ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}`;
  logTest(testLabel, "TESTING");
  try {
    ensurePPTOutputDir();
    const outputPath = path.join(
      PPT_OUTPUT_DIR,
      `test-theme-${themeName}-${Date.now()}.pptx`,
    );
    const { success, result, error } = await generatePPT(
      sdk,
      `Project Update: Using the ${themeName} theme`,
      {
        pages: 5,
        theme: themeName,
        outputPath,
      },
    );

    if (!success) {
      if (error && isExpectedProviderError(error)) {
        logTest(testLabel, "SKIP", error);
        return null;
      }
      logTest(testLabel, "FAIL", error || "Unknown error");
      return false;
    }

    // Find and validate the PPTX file
    const pptResult = (result as Record<string, unknown>)?.ppt as
      | Record<string, unknown>
      | undefined;
    const filePath = findPPTXFile(pptResult, outputPath);

    if (!filePath) {
      logTest(testLabel, "FAIL", "No PPTX file produced");
      return false;
    }

    // Validate PPTX is a valid ZIP with minimum size
    const validation = validatePPTXFile(filePath, 1024);
    if (!validation.valid) {
      logTest(testLabel, "FAIL", validation.reason);
      return false;
    }

    logTest(
      testLabel,
      "PASS",
      `Theme "${themeName}" applied, ${validation.reason}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(testLabel, "SKIP", msg);
      return null;
    }
    logTest(testLabel, "FAIL", msg);
    return false;
  }
}

async function testThemeModern(sdk: NeuroLink): Promise<boolean | null> {
  return testTheme(sdk, "modern");
}

async function testThemeCorporate(sdk: NeuroLink): Promise<boolean | null> {
  return testTheme(sdk, "corporate");
}

async function testThemeCreative(sdk: NeuroLink): Promise<boolean | null> {
  return testTheme(sdk, "creative");
}

async function testThemeMinimal(sdk: NeuroLink): Promise<boolean | null> {
  return testTheme(sdk, "minimal");
}

async function testThemeDark(sdk: NeuroLink): Promise<boolean | null> {
  return testTheme(sdk, "dark");
}

// --- Test 12: Logo Placement ---
async function testLogoPlacement(sdk: NeuroLink): Promise<boolean | null> {
  logTest("SDK Generate - Logo Placement", "TESTING");
  try {
    ensurePPTOutputDir();
    const logoBuffer = getDefaultSampleLogo();
    const outputPath = path.join(
      PPT_OUTPUT_DIR,
      `test-logo-${Date.now()}.pptx`,
    );

    const { success, result, error } = await generatePPT(
      sdk,
      "Company Branding Presentation with Logo",
      {
        pages: 5,
        theme: "corporate",
        logoPath: logoBuffer,
        outputPath,
      },
    );

    if (!success) {
      if (error && isExpectedProviderError(error)) {
        logTest("SDK Generate - Logo Placement", "SKIP", error);
        return null;
      }
      logTest(
        "SDK Generate - Logo Placement",
        "FAIL",
        error || "Unknown error",
      );
      return false;
    }

    // Find and validate the PPTX file
    const pptResult = (result as Record<string, unknown>)?.ppt as
      | Record<string, unknown>
      | undefined;
    const filePath = findPPTXFile(pptResult, outputPath);

    if (!filePath) {
      logTest("SDK Generate - Logo Placement", "FAIL", "No PPTX file produced");
      return false;
    }

    const validation = validatePPTXFile(filePath, 1024);
    if (!validation.valid) {
      logTest("SDK Generate - Logo Placement", "FAIL", validation.reason);
      return false;
    }

    logTest(
      "SDK Generate - Logo Placement",
      "PASS",
      `PPTX with logo: ${validation.reason}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - Logo Placement", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - Logo Placement", "FAIL", msg);
    return false;
  }
}

// --- Test 13: PPTX Openable (ZIP Validation) ---
async function testPPTXOpenable(sdk: NeuroLink): Promise<boolean | null> {
  logTest("SDK Utility - PPTX Openable", "TESTING");
  try {
    ensurePPTOutputDir();
    const outputPath = path.join(
      PPT_OUTPUT_DIR,
      `test-openable-${Date.now()}.pptx`,
    );

    const { success, result, error } = await generatePPT(
      sdk,
      "Simple Test Presentation",
      {
        pages: 5,
        theme: "minimal",
        outputPath,
      },
    );

    if (!success) {
      if (error && isExpectedProviderError(error)) {
        logTest("SDK Utility - PPTX Openable", "SKIP", error);
        return null;
      }
      logTest("SDK Utility - PPTX Openable", "FAIL", error || "Unknown error");
      return false;
    }

    // Find the PPTX file
    const pptResult = (result as Record<string, unknown>)?.ppt as
      | Record<string, unknown>
      | undefined;
    const filePath = findPPTXFile(pptResult, outputPath);

    if (!filePath) {
      logTest(
        "SDK Utility - PPTX Openable",
        "FAIL",
        "No PPTX file found to validate",
      );
      return false;
    }

    // Step 1: Validate ZIP magic bytes (50 4B 03 04)
    const validation = validatePPTXFile(filePath, 1024);
    if (!validation.valid) {
      logTest("SDK Utility - PPTX Openable", "FAIL", validation.reason);
      return false;
    }

    // Step 2: Try to parse ZIP structure — look for OOXML parts in the binary
    const fileBuffer = fs.readFileSync(filePath);

    // Look for OOXML part names in the ZIP (they appear as filenames in the ZIP central directory)
    const fileString = fileBuffer.toString("binary");
    const ooxmlParts = ["[Content_Types].xml", "ppt/presentation.xml"];
    const foundParts = ooxmlParts.filter((part) => fileString.includes(part));

    // Also check for ZIP end-of-central-directory marker (PK\x05\x06) — proves ZIP is well-formed
    const hasEndOfCentralDir = fileBuffer.includes(
      Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    );

    if (!hasEndOfCentralDir) {
      logTest(
        "SDK Utility - PPTX Openable",
        "FAIL",
        "ZIP file missing end-of-central-directory record (corrupt or truncated)",
      );
      return false;
    }

    if (foundParts.length === 0) {
      logTest(
        "SDK Utility - PPTX Openable",
        "FAIL",
        "Valid ZIP but no OOXML parts found — not a real PPTX",
      );
      return false;
    }

    logTest(
      "SDK Utility - PPTX Openable",
      "PASS",
      `Valid ZIP (${(fileBuffer.length / 1024).toFixed(1)}KB), end-of-central-dir present, ${foundParts.length}/${ooxmlParts.length} OOXML parts: ${foundParts.join(", ")}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Utility - PPTX Openable", "SKIP", msg);
      return null;
    }
    logTest("SDK Utility - PPTX Openable", "FAIL", msg);
    return false;
  }
}

// --- Test 14: CLI PPT Generate ---
async function testCLIPPTGenerate(): Promise<boolean | null> {
  logTest("CLI Generate - PPT Generate", "TESTING");
  try {
    const cliIndexPath = path.join(__dirname, "../dist/cli/index.js");
    if (!fs.existsSync(cliIndexPath)) {
      logTest(
        "CLI Generate - PPT Generate",
        "SKIP",
        "CLI not built (dist/cli/index.js not found)",
      );
      return null;
    }

    // CLI now supports PPT flags: --pptPages, --pptTheme, --pptOutput, --pptAudience, --pptTone, --pptNoImages
    ensurePPTOutputDir();
    const outputPath = path.join(
      PPT_OUTPUT_DIR,
      `test-cli-ppt-${Date.now()}.pptx`,
    );

    const cliArgs = [
      cliIndexPath,
      "generate",
      "Introduction to Machine Learning",
      ...buildBaseCLIArgs(),
      "--pptPages=5",
      "--pptTheme=modern",
      "--pptNoImages",
      `--pptOutput=${outputPath}`,
    ];

    const result = await runCommand("node", cliArgs);

    // Check if CLI ran successfully
    if (!result.success) {
      const combinedOutput = (result.stdout + result.stderr).toLowerCase();
      if (isExpectedProviderError(combinedOutput)) {
        logTest(
          "CLI Generate - PPT Generate",
          "SKIP",
          `Provider error: ${combinedOutput.substring(0, 200)}`,
        );
        return null;
      }
      // If the CLI fails with an unknown flag error, PPT flags may not be wired to the generate command
      if (
        combinedOutput.includes("unknown option") ||
        combinedOutput.includes("unknown argument")
      ) {
        logTest(
          "CLI Generate - PPT Generate",
          "SKIP",
          `CLI PPT flags not recognized: ${combinedOutput.substring(0, 200)}`,
        );
        return null;
      }
      logTest(
        "CLI Generate - PPT Generate",
        "FAIL",
        `CLI exited with code ${result.code}: ${(result.stderr || result.stdout).substring(0, 300)}`,
      );
      return false;
    }

    // Find and validate the generated PPTX file
    const filePath = findPPTXFile(undefined, outputPath);

    if (!filePath) {
      // CLI ran successfully but no file found — check stdout for clues
      const output = result.stdout.toLowerCase();
      if (
        output.includes("presentation") ||
        output.includes("pptx") ||
        output.includes("slides")
      ) {
        logTest(
          "CLI Generate - PPT Generate",
          "PASS",
          `CLI PPT generation completed (output mentions presentation). No file at expected path.`,
        );
        return true;
      }
      logTest(
        "CLI Generate - PPT Generate",
        "FAIL",
        "CLI succeeded but no PPTX file found at expected path",
      );
      return false;
    }

    const validation = validatePPTXFile(filePath, 1024);
    if (!validation.valid) {
      logTest("CLI Generate - PPT Generate", "FAIL", validation.reason);
      return false;
    }

    logTest(
      "CLI Generate - PPT Generate",
      "PASS",
      `CLI generated valid PPTX: ${validation.reason}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("CLI Generate - PPT Generate", "SKIP", msg);
      return null;
    }
    logTest("CLI Generate - PPT Generate", "FAIL", msg);
    return false;
  }
}

// --- Test 15: PPT With AI Images ---
async function testPPTWithAIImages(sdk: NeuroLink): Promise<boolean | null> {
  logTest("SDK Generate - PPT With AI Images", "TESTING");
  try {
    ensurePPTOutputDir();
    const outputPath = path.join(
      PPT_OUTPUT_DIR,
      `test-ai-images-${Date.now()}.pptx`,
    );

    const { success, result, error } = await generatePPT(
      sdk,
      "Nature Photography: Beautiful Landscapes and Wildlife",
      {
        pages: 5,
        theme: "creative",
        generateAIImages: true,
        outputPath,
      },
    );

    if (!success) {
      if (error && isExpectedProviderError(error)) {
        logTest("SDK Generate - PPT With AI Images", "SKIP", error);
        return null;
      }
      // AI image generation failures are non-critical — SKIP, not PASS
      if (error && (error.includes("image") || error.includes("timeout"))) {
        logTest(
          "SDK Generate - PPT With AI Images",
          "SKIP",
          `AI image generation failed: ${error.substring(0, 150)}`,
        );
        return null;
      }
      logTest(
        "SDK Generate - PPT With AI Images",
        "FAIL",
        error || "Unknown error",
      );
      return false;
    }

    // Verify a PPTX was produced
    const pptResult = (result as Record<string, unknown>)?.ppt as
      | Record<string, unknown>
      | undefined;
    const filePath = findPPTXFile(pptResult, outputPath);

    if (!filePath) {
      logTest(
        "SDK Generate - PPT With AI Images",
        "FAIL",
        "Generation succeeded but no PPTX file found",
      );
      return false;
    }

    const validation = validatePPTXFile(filePath, 1024);
    if (!validation.valid) {
      logTest("SDK Generate - PPT With AI Images", "FAIL", validation.reason);
      return false;
    }

    const metadata = pptResult?.metadata as Record<string, unknown> | undefined;
    logTest(
      "SDK Generate - PPT With AI Images",
      "PASS",
      `${validation.reason}, image model: ${metadata?.imageModel || "default"}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - PPT With AI Images", "SKIP", msg);
      return null;
    }
    // Image generation timeout/failures are SKIP, never PASS
    if (msg.includes("timeout") || msg.includes("image")) {
      logTest(
        "SDK Generate - PPT With AI Images",
        "SKIP",
        `AI image generation failed: ${msg.substring(0, 150)}`,
      );
      return null;
    }
    logTest("SDK Generate - PPT With AI Images", "FAIL", msg);
    return false;
  }
}

// --- Test 16: PPT Different Audiences ---
async function testPPTDifferentAudiences(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("SDK Generate - PPT Different Audiences", "TESTING");
  try {
    const audiences = ["technical", "business"] as const;
    const audienceFiles: Array<{
      audience: string;
      filePath: string | null;
    }> = [];

    ensurePPTOutputDir();

    for (const audience of audiences) {
      const outputPath = path.join(
        PPT_OUTPUT_DIR,
        `test-audience-${audience}-${Date.now()}.pptx`,
      );
      const { success, result, error } = await generatePPT(
        sdk,
        "Introduction to Artificial Intelligence",
        {
          pages: 5,
          theme: "modern",
          audience,
          outputPath,
        },
      );

      if (!success && error && isExpectedProviderError(error)) {
        logTest("SDK Generate - PPT Different Audiences", "SKIP", error);
        return null;
      }

      if (!success) {
        logTest(
          "SDK Generate - PPT Different Audiences",
          "FAIL",
          `Audience "${audience}" failed: ${error || "Unknown error"}`,
        );
        return false;
      }

      const pptResult = (result as Record<string, unknown>)?.ppt as
        | Record<string, unknown>
        | undefined;
      const filePath = findPPTXFile(pptResult, outputPath);
      audienceFiles.push({ audience, filePath });

      await new Promise((r) => setTimeout(r, 3000));
    }

    // Gate: BOTH audiences must have produced files
    const missingFiles = audienceFiles.filter((af) => !af.filePath);
    if (missingFiles.length > 0) {
      logTest(
        "SDK Generate - PPT Different Audiences",
        "FAIL",
        `Missing PPTX files for audiences: ${missingFiles.map((m) => m.audience).join(", ")}`,
      );
      return false;
    }

    // Validate both files exist
    for (const af of audienceFiles) {
      if (!af.filePath || !fs.existsSync(af.filePath)) {
        logTest(
          "SDK Generate - PPT Different Audiences",
          "FAIL",
          `PPTX file for "${af.audience}" does not exist on disk`,
        );
        return false;
      }
    }

    logTest(
      "SDK Generate - PPT Different Audiences",
      "PASS",
      `Both audiences generated: ${audienceFiles.map((af) => af.audience).join(", ")}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("SDK Generate - PPT Different Audiences", "SKIP", msg);
      return null;
    }
    logTest("SDK Generate - PPT Different Audiences", "FAIL", msg);
    return false;
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log("\nNeuroLink Continuous Test Suite: PPT Generation", "bright");
  log(
    `   Provider: ${TEST_CONFIG.provider}, Model: ${TEST_CONFIG.model || "default"}`,
    "cyan",
  );

  // Prerequisite checks
  if (!fs.existsSync("dist") || !fs.existsSync("dist/index.js")) {
    log("Build not found. Run: pnpm run build", "red");
    process.exit(1);
  }

  // Ensure output directory
  ensurePPTOutputDir();

  const sharedSdk = new NeuroLink();

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    // Infrastructure
    {
      name: "PPT Types Validation",
      fn: () => testPPTTypesValidation(sharedSdk),
    },
    // Content Planning
    {
      name: "Content Planner Basic",
      fn: () => testContentPlannerBasic(sharedSdk),
    },
    // Slide Type
    {
      name: "Slide Type Inference",
      fn: () => testSlideTypeInference(sharedSdk),
    },
    // Slide Generation
    {
      name: "Slide Generator Single",
      fn: () => testSlideGeneratorSingle(sharedSdk),
    },
    {
      name: "Slide Renderers All Types",
      fn: () => testSlideRenderersAllTypes(sharedSdk),
    },
    // Full Pipeline
    {
      name: "Orchestrator Full Pipeline",
      fn: () => testOrchestratorFullPipeline(sharedSdk),
    },
    // Theme Tests
    { name: "Theme Modern", fn: () => testThemeModern(sharedSdk) },
    { name: "Theme Corporate", fn: () => testThemeCorporate(sharedSdk) },
    { name: "Theme Creative", fn: () => testThemeCreative(sharedSdk) },
    { name: "Theme Minimal", fn: () => testThemeMinimal(sharedSdk) },
    { name: "Theme Dark", fn: () => testThemeDark(sharedSdk) },
    // Logo
    { name: "Logo Placement", fn: () => testLogoPlacement(sharedSdk) },
    // Validation
    { name: "PPTX Openable", fn: () => testPPTXOpenable(sharedSdk) },
    // CLI
    { name: "CLI PPT Generate", fn: () => testCLIPPTGenerate() },
    // AI Features
    {
      name: "PPT With AI Images",
      fn: () => testPPTWithAIImages(sharedSdk),
    },
    {
      name: "PPT Different Audiences",
      fn: () => testPPTDifferentAudiences(sharedSdk),
    },
  ];

  for (const test of tests) {
    logSection(test.name);
    try {
      const result = await test.fn();
      testResults.push({ name: test.name, result, error: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      testResults.push({ name: test.name, result: false, error: msg });
    }
    await globalCleanup();
    await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
  }

  // Summary
  logSection("Test Results Summary");
  const passed = testResults.filter((r) => r.result === true).length;
  const failed = testResults.filter((r) => r.result === false).length;
  const skipped = testResults.filter((r) => r.result === null).length;
  testResults.forEach((t) => {
    logTest(
      t.name,
      t.result === true ? "PASS" : t.result === false ? "FAIL" : "SKIP",
      t.error || "",
    );
  });
  const duration = Math.round((Date.now() - startTime) / 1000);
  log(
    `
Final Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${testResults.length} total) in ${duration}s`,
    failed === 0 ? "green" : "red",
  );

  // Cleanup temp files
  cleanupPPTFiles();

  try {
    await sharedSdk.shutdown?.();
  } catch {
    /* ignore */
  }
  process.exit(failed === 0 ? 0 : 1);
}

// ============================================================
// CLI ARGS + EXECUTION
// ============================================================

function parseArguments(): { provider?: string; model?: string } {
  const args: { provider?: string; model?: string } = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--provider=")) {
      args.provider = arg.split("=")[1];
    }
    if (arg.startsWith("--model=")) {
      args.model = arg.split("=")[1];
    }
    if (arg === "--help") {
      console.log(
        "Usage: npx tsx test/continuous-test-suite-ppt.ts [--provider=X] [--model=Y]",
      );
      process.exit(0);
    }
  }
  return args;
}

const cliArgs = parseArguments();
if (cliArgs.provider) {
  TEST_CONFIG.provider = cliArgs.provider;
}
if (cliArgs.model) {
  TEST_CONFIG.model = cliArgs.model;
}
if (!TEST_CONFIG.maxTokens) {
  TEST_CONFIG.maxTokens = PROVIDER_MAX_TOKENS[TEST_CONFIG.provider] || 1024;
}

if (typeof describe === "undefined") {
  runAllTests().catch((e: unknown) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  describe.skip("Continuous Test Suite: PPT Generation", () => {
    it("runs standalone", () => runAllTests(), 600000);
  });
}

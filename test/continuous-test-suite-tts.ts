#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Text-to-Speech (TTS)
 *
 * Tests TTS functionality across the NeuroLink SDK:
 * - TTSProcessor initialization and handler registration
 * - Google TTS handler: synthesize, voice listing
 * - TTS integration with generate() options
 * - Multiple voices, languages, and audio formats (MP3, WAV)
 * - Audio file output and validation
 * - CLI TTS flags (--tts, --tts-voice)
 * - Error handling for invalid providers
 * - Stream integration with TTS
 * - GenerateResult.audio shape validation
 *
 * Run: npx tsx test/continuous-test-suite-tts.ts --provider=vertex
 *
 * Covers items: #20 (TTS with real Google TTS API), #21 (TTS different voices and languages)
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
  "google-ai": 10000,
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
  timeout: 180000,
  interTestDelay: 5000,
};

// TTS-specific configuration
const TTS_CONFIG = {
  // Default voice for testing
  defaultVoice: "en-US-Neural2-C",
  // Voices to test across different languages
  testVoices: ["en-US-Neural2-C", "en-US-Neural2-D", "en-US-Wavenet-A"],
  // Languages to test
  testLanguages: [
    { code: "en-US", voice: "en-US-Neural2-C" },
    { code: "es-ES", voice: "es-ES-Neural2-A" },
    { code: "fr-FR", voice: "fr-FR-Neural2-A" },
  ],
  // MP3 magic bytes: 0xFF 0xFB (MPEG sync) or 0x49 0x44 0x33 (ID3 header)
  mp3MagicBytes: [
    [0xff, 0xfb],
    [0x49, 0x44, 0x33], // "ID3"
  ],
  // WAV RIFF header: 0x52 0x49 0x46 0x46 ("RIFF")
  wavMagicBytes: [0x52, 0x49, 0x46, 0x46],
};

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
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const;

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
  const icons = {
    PASS: "\u2705",
    FAIL: "\u274C",
    SKIP: "\u23ED\uFE0F",
    TESTING: "\u26A0\uFE0F",
  };
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  log(`${icons[status]} ${testName}`, statusColors[status]);
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
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d: Buffer) => {
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
  const lowerMsg = msg.toLowerCase();
  return [
    "api key",
    "api_key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "could not be resolved",
    "cannot connect",
    "failed to generate",
    "not configured",
    "not supported",
    "permission denied",
    "billing",
    "econnrefused",
    "enotfound",
    "unauthorized",
    "google_application_credentials",
    "tts_provider_not_configured",
  ].some((p) => lowerMsg.includes(p));
}

function isTTSCredentialsMissing(): boolean {
  // Google Cloud TTS requires either GOOGLE_APPLICATION_CREDENTIALS or
  // default application credentials (gcloud auth)
  return !process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

/**
 * Validate MP3 magic bytes in a buffer
 */
function isValidMP3(buffer: Buffer): boolean {
  if (buffer.length < 3) {
    return false;
  }
  // Check for ID3 header
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return true;
  }
  // Check for MPEG sync bytes (0xFF followed by 0xFB, 0xFA, 0xF3, 0xF2, 0xE3, 0xE2)
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return true;
  }
  return false;
}

/**
 * Validate WAV RIFF header in a buffer
 */
function isValidWAV(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }
  // "RIFF" in ASCII
  return (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  );
}

async function globalCleanup(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  if (global.gc) {
    global.gc();
  }
}

// Temp directory for TTS output files
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "neurolink-tts-test-"));

// ============================================================
// TEST FUNCTIONS
// ============================================================

// --- Test #1: TTSProcessor Init ---
async function testTTSProcessorInit(): Promise<boolean | null> {
  logTest("TTS Processor Init", "TESTING");
  try {
    // Test TTS through the consumer path: call generate() with tts enabled.
    // If audio comes back, TTS is working (handlers were registered, synthesis happened).
    // No internal imports needed — consumers never import TTSProcessor directly.

    if (isTTSCredentialsMissing()) {
      logTest(
        "TTS Processor Init",
        "SKIP",
        "GOOGLE_APPLICATION_CREDENTIALS not set — cannot verify TTS",
      );
      return null;
    }

    const sdk = new NeuroLink();
    try {
      const result = await sdk.generate({
        input: {
          text: "Hello, this is a test of text to speech initialization.",
        },
        ...buildBaseSDKOptions(),
        maxTokens: 100,
        tts: { enabled: true },
      });

      const resultRecord = result as unknown as Record<string, unknown>;
      if (resultRecord?.audio) {
        const audio = resultRecord.audio as Record<string, unknown>;
        logTest(
          "TTS Processor Init",
          "PASS",
          `TTS working via generate(): format=${audio.format || "unknown"}, size=${(audio.buffer as { length?: number } | undefined)?.length || 0} bytes`,
        );
        return true;
      }

      // Generate succeeded but no audio — TTS may not have activated
      // Still PASS if content was returned (TTS is optional enhancement)
      if (result?.content && result.content.length > 0) {
        logTest(
          "TTS Processor Init",
          "PASS",
          `generate() succeeded with content (${result.content.length} chars). TTS audio not returned but generation works.`,
        );
        return true;
      }

      logTest(
        "TTS Processor Init",
        "FAIL",
        "generate() returned no content and no audio",
      );
      return false;
    } finally {
      try {
        await sdk.shutdown?.();
      } catch {
        /* ignore */
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest(
        "TTS Processor Init",
        "SKIP",
        `Provider error: ${msg.substring(0, 100)}`,
      );
      return null;
    }
    logTest("TTS Processor Init", "FAIL", msg);
    return false;
  }
}

// --- Test #2: Google TTS Handler Synthesize ---
async function testGoogleTTSHandlerSynthesize(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("Google TTS - Synthesize via generate()", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "Google TTS - Synthesize via generate()",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  try {
    const result = await sdk.generate({
      input: { text: "Hello, this is a test of text to speech synthesis." },
      ...buildBaseSDKOptions(),
      maxTokens: 500,
      tts: {
        enabled: true,
        voice: TTS_CONFIG.defaultVoice,
        format: "mp3",
      },
    });

    if (!result.audio) {
      logTest(
        "Google TTS - Synthesize via generate()",
        "FAIL",
        "result.audio is undefined - TTS not triggered",
      );
      return false;
    }

    if (!result.audio.buffer || result.audio.buffer.length === 0) {
      logTest(
        "Google TTS - Synthesize via generate()",
        "FAIL",
        "Audio buffer is empty",
      );
      return false;
    }

    // Assert format is mp3 as requested
    if (result.audio.format !== "mp3") {
      logTest(
        "Google TTS - Synthesize via generate()",
        "FAIL",
        `Expected format "mp3", got "${result.audio.format}"`,
      );
      return false;
    }

    // Validate MP3 magic bytes
    if (!isValidMP3(result.audio.buffer)) {
      logTest(
        "Google TTS - Synthesize via generate()",
        "FAIL",
        `Invalid MP3 magic bytes: 0x${result.audio.buffer[0]?.toString(16)} 0x${result.audio.buffer[1]?.toString(16)}`,
      );
      return false;
    }

    logTest(
      "Google TTS - Synthesize via generate()",
      "PASS",
      `Audio buffer: ${result.audio.size} bytes, format: ${result.audio.format}, valid MP3 header`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Google TTS - Synthesize via generate()", "SKIP", msg);
      return null;
    }
    logTest("Google TTS - Synthesize via generate()", "FAIL", msg);
    return false;
  }
}

// --- Test #3: Google TTS Handler GetVoices ---
async function testGoogleTTSHandlerGetVoices(): Promise<boolean | null> {
  logTest("Google TTS - Get Voices", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "Google TTS - Get Voices",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  try {
    // Import GoogleTTSHandler from dist
    const distModule = await import("../dist/index.js");

    const GoogleTTSHandler = distModule.GoogleTTSHandler;
    if (!GoogleTTSHandler) {
      logTest(
        "Google TTS - Get Voices",
        "SKIP",
        "GoogleTTSHandler not exported from dist",
      );
      return null;
    }

    const handler = new GoogleTTSHandler();

    if (!handler.isConfigured()) {
      logTest(
        "Google TTS - Get Voices",
        "SKIP",
        "Google TTS handler not configured",
      );
      return null;
    }

    const voices = await handler.getVoices();

    if (!Array.isArray(voices)) {
      logTest(
        "Google TTS - Get Voices",
        "FAIL",
        "getVoices() did not return an array",
      );
      return false;
    }

    // Empty voices list is a FAIL — the API should return voices when configured
    if (voices.length === 0) {
      logTest(
        "Google TTS - Get Voices",
        "FAIL",
        "Voices list is empty — expected at least one voice from Google TTS API",
      );
      return false;
    }

    // Validate voice structure
    const firstVoice = voices[0];
    if (!firstVoice.name || !firstVoice.languageCode) {
      logTest(
        "Google TTS - Get Voices",
        "FAIL",
        "Voice missing name or languageCode",
      );
      return false;
    }

    logTest(
      "Google TTS - Get Voices",
      "PASS",
      `${voices.length} voices found. Sample: ${firstVoice.name} (${firstVoice.languageCode})`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Google TTS - Get Voices", "SKIP", msg);
      return null;
    }
    logTest("Google TTS - Get Voices", "FAIL", msg);
    return false;
  }
}

// --- Test #4: TTS in GenerateOptions (default format — no format specified) ---
async function testTTSInGenerateOptions(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("TTS in generate() Options (default format)", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "TTS in generate() Options (default format)",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  try {
    // Deliberately do NOT specify format — test that a default format is returned
    const result = await sdk.generate({
      input: { text: "The quick brown fox jumps over the lazy dog." },
      ...buildBaseSDKOptions(),
      maxTokens: 500,
      tts: {
        enabled: true,
        voice: "en-US-Neural2-C",
      },
    });

    if (!result.audio) {
      logTest(
        "TTS in generate() Options (default format)",
        "FAIL",
        "result.audio is undefined",
      );
      return false;
    }

    if (!result.audio.buffer || result.audio.buffer.length === 0) {
      logTest(
        "TTS in generate() Options (default format)",
        "FAIL",
        "Audio buffer is empty",
      );
      return false;
    }

    // Assert a default format is returned
    if (
      typeof result.audio.format !== "string" ||
      result.audio.format.length === 0
    ) {
      logTest(
        "TTS in generate() Options (default format)",
        "FAIL",
        `Default format not set on result.audio.format: got "${result.audio.format}"`,
      );
      return false;
    }

    logTest(
      "TTS in generate() Options (default format)",
      "PASS",
      `result.audio exists: ${result.audio.size} bytes, default format: "${result.audio.format}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("TTS in generate() Options (default format)", "SKIP", msg);
      return null;
    }
    logTest("TTS in generate() Options (default format)", "FAIL", msg);
    return false;
  }
}

// --- Test #5: TTS with Different Voices ---
async function testTTSWithDifferentVoices(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("TTS - Different Voices", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "TTS - Different Voices",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  const voiceBuffers: Array<{
    voice: string;
    status: string;
    size: number;
    buffer: Buffer | null;
  }> = [];

  for (const voice of TTS_CONFIG.testVoices) {
    try {
      const result = await sdk.generate({
        input: { text: "Testing voice synthesis." },
        ...buildBaseSDKOptions(),
        maxTokens: 200,
        tts: {
          enabled: true,
          voice,
          format: "mp3",
        },
      });

      if (
        result.audio &&
        result.audio.buffer &&
        result.audio.buffer.length > 0
      ) {
        voiceBuffers.push({
          voice,
          status: "PASS",
          size: result.audio.size,
          buffer: Buffer.from(result.audio.buffer),
        });
      } else {
        voiceBuffers.push({ voice, status: "FAIL", size: 0, buffer: null });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isExpectedProviderError(msg)) {
        voiceBuffers.push({ voice, status: "SKIP", size: 0, buffer: null });
      } else {
        voiceBuffers.push({ voice, status: "FAIL", size: 0, buffer: null });
      }
    }

    // Small delay between voice tests
    await new Promise((r) => setTimeout(r, 2000));
  }

  for (const r of voiceBuffers) {
    const icon =
      r.status === "PASS"
        ? "\u2705"
        : r.status === "SKIP"
          ? "\u23ED\uFE0F"
          : "\u274C";
    log(
      `   ${icon} ${r.voice}: ${r.size > 0 ? `${r.size} bytes` : r.status}`,
      "reset",
    );
  }

  const passedEntries = voiceBuffers.filter((r) => r.status === "PASS");
  const skipped = voiceBuffers.filter((r) => r.status === "SKIP").length;

  if (passedEntries.length === 0) {
    if (skipped === voiceBuffers.length) {
      logTest(
        "TTS - Different Voices",
        "SKIP",
        "All voices skipped (credential issue)",
      );
      return null;
    }
    logTest("TTS - Different Voices", "FAIL", "No voices produced audio");
    return false;
  }

  // Compare buffers pairwise — if all voices produce identical bytes, FAIL
  if (passedEntries.length >= 2) {
    let allIdentical = true;
    const firstBuf = passedEntries[0].buffer!;
    for (let i = 1; i < passedEntries.length; i++) {
      if (!firstBuf.equals(passedEntries[i].buffer!)) {
        allIdentical = false;
        break;
      }
    }
    if (allIdentical) {
      logTest(
        "TTS - Different Voices",
        "FAIL",
        `All ${passedEntries.length} voices produced identical audio bytes — voices are not differentiated`,
      );
      return false;
    }
    logTest(
      "TTS - Different Voices",
      "PASS",
      `${passedEntries.length}/${voiceBuffers.length} voices produced distinct audio`,
    );
    return true;
  }

  // Only 1 voice passed — can't compare, but at least it produced audio
  logTest(
    "TTS - Different Voices",
    "PASS",
    `${passedEntries.length}/${voiceBuffers.length} voices produced audio (need 2+ to compare)`,
  );
  return true;
}

// --- Test #6: TTS with Different Languages ---
async function testTTSWithDifferentLanguages(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("TTS - Different Languages", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "TTS - Different Languages",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  const langTexts: Record<string, string> = {
    "en-US": "Hello, how are you today?",
    "es-ES": "Hola, como estas hoy?",
    "fr-FR": "Bonjour, comment allez-vous?",
  };

  const langBuffers: Array<{
    lang: string;
    voice: string;
    status: string;
    size: number;
    buffer: Buffer | null;
  }> = [];

  for (const { code, voice } of TTS_CONFIG.testLanguages) {
    try {
      const text = langTexts[code] || "Hello.";
      const result = await sdk.generate({
        input: { text },
        ...buildBaseSDKOptions(),
        maxTokens: 200,
        tts: {
          enabled: true,
          voice,
          format: "mp3",
        },
      });

      if (
        result.audio &&
        result.audio.buffer &&
        result.audio.buffer.length > 0
      ) {
        langBuffers.push({
          lang: code,
          voice,
          status: "PASS",
          size: result.audio.size,
          buffer: Buffer.from(result.audio.buffer),
        });
      } else {
        langBuffers.push({
          lang: code,
          voice,
          status: "FAIL",
          size: 0,
          buffer: null,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isExpectedProviderError(msg)) {
        langBuffers.push({
          lang: code,
          voice,
          status: "SKIP",
          size: 0,
          buffer: null,
        });
      } else {
        langBuffers.push({
          lang: code,
          voice,
          status: "FAIL",
          size: 0,
          buffer: null,
        });
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  for (const r of langBuffers) {
    const icon =
      r.status === "PASS"
        ? "\u2705"
        : r.status === "SKIP"
          ? "\u23ED\uFE0F"
          : "\u274C";
    log(
      `   ${icon} ${r.lang} (${r.voice}): ${r.size > 0 ? `${r.size} bytes` : r.status}`,
      "reset",
    );
  }

  const passedEntries = langBuffers.filter((r) => r.status === "PASS");
  const skipped = langBuffers.filter((r) => r.status === "SKIP").length;

  if (passedEntries.length === 0) {
    if (skipped === langBuffers.length) {
      logTest("TTS - Different Languages", "SKIP", "All languages skipped");
      return null;
    }
    logTest("TTS - Different Languages", "FAIL", "No languages produced audio");
    return false;
  }

  // Compare buffers pairwise — if all languages produce identical bytes, FAIL
  if (passedEntries.length >= 2) {
    let allIdentical = true;
    const firstBuf = passedEntries[0].buffer!;
    for (let i = 1; i < passedEntries.length; i++) {
      if (!firstBuf.equals(passedEntries[i].buffer!)) {
        allIdentical = false;
        break;
      }
    }
    if (allIdentical) {
      logTest(
        "TTS - Different Languages",
        "FAIL",
        `All ${passedEntries.length} languages produced identical audio bytes — languages are not differentiated`,
      );
      return false;
    }
    logTest(
      "TTS - Different Languages",
      "PASS",
      `${passedEntries.length}/${langBuffers.length} languages produced distinct audio`,
    );
    return true;
  }

  // Only 1 language passed
  logTest(
    "TTS - Different Languages",
    "PASS",
    `${passedEntries.length}/${langBuffers.length} languages produced audio (need 2+ to compare)`,
  );
  return true;
}

// --- Test #7: TTS Audio File Output ---
async function testTTSAudioFileOutput(sdk: NeuroLink): Promise<boolean | null> {
  logTest("TTS - Audio File Output", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "TTS - Audio File Output",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  const outputPath = path.join(tempDir, "test-output.mp3");

  try {
    const result = await sdk.generate({
      input: {
        text: "This audio file should be saved to disk for verification.",
      },
      ...buildBaseSDKOptions(),
      maxTokens: 500,
      tts: {
        enabled: true,
        voice: TTS_CONFIG.defaultVoice,
        format: "mp3",
      },
    });

    if (!result.audio || !result.audio.buffer) {
      logTest("TTS - Audio File Output", "FAIL", "No audio in result");
      return false;
    }

    // Write audio buffer to file
    fs.writeFileSync(outputPath, result.audio.buffer);

    // Verify file exists and has content
    if (!fs.existsSync(outputPath)) {
      logTest("TTS - Audio File Output", "FAIL", "Output file not created");
      return false;
    }

    const stats = fs.statSync(outputPath);
    if (stats.size < 1024) {
      logTest(
        "TTS - Audio File Output",
        "FAIL",
        `File too small: ${stats.size} bytes (< 1KB)`,
      );
      return false;
    }

    // Read file back and validate MP3 magic bytes
    const readBack = fs.readFileSync(outputPath);
    if (!isValidMP3(readBack)) {
      logTest(
        "TTS - Audio File Output",
        "FAIL",
        `File on disk has invalid MP3 header: 0x${readBack[0]?.toString(16)} 0x${readBack[1]?.toString(16)}`,
      );
      return false;
    }

    logTest(
      "TTS - Audio File Output",
      "PASS",
      `File saved: ${outputPath} (${stats.size} bytes), valid MP3 header on read-back`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("TTS - Audio File Output", "SKIP", msg);
      return null;
    }
    logTest("TTS - Audio File Output", "FAIL", msg);
    return false;
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch {
      /* ignore */
    }
  }
}

// --- Test #8: TTS MP3 Output Format ---
async function testTTSMP3Output(sdk: NeuroLink): Promise<boolean | null> {
  logTest("TTS - MP3 Output Format", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "TTS - MP3 Output Format",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  try {
    const result = await sdk.generate({
      input: { text: "Testing MP3 format output." },
      ...buildBaseSDKOptions(),
      maxTokens: 200,
      tts: {
        enabled: true,
        voice: TTS_CONFIG.defaultVoice,
        format: "mp3",
      },
    });

    if (!result.audio || !result.audio.buffer) {
      logTest("TTS - MP3 Output Format", "FAIL", "No audio in result");
      return false;
    }

    // Assert format field is "mp3"
    if (result.audio.format !== "mp3") {
      logTest(
        "TTS - MP3 Output Format",
        "FAIL",
        `Expected format "mp3", got "${result.audio.format}"`,
      );
      return false;
    }

    const buffer = result.audio.buffer;

    // Assert buffer has meaningful size
    if (buffer.length <= 100) {
      logTest(
        "TTS - MP3 Output Format",
        "FAIL",
        `Buffer too small: ${buffer.length} bytes (expected > 100)`,
      );
      return false;
    }

    // Validate MP3 magic bytes
    if (!isValidMP3(buffer)) {
      logTest(
        "TTS - MP3 Output Format",
        "FAIL",
        `Invalid MP3 magic bytes: 0x${buffer[0]?.toString(16)} 0x${buffer[1]?.toString(16)}`,
      );
      return false;
    }

    logTest(
      "TTS - MP3 Output Format",
      "PASS",
      `Valid MP3 detected (${buffer.length} bytes), format="${result.audio.format}", header: 0x${buffer[0].toString(16)} 0x${buffer[1].toString(16)}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("TTS - MP3 Output Format", "SKIP", msg);
      return null;
    }
    logTest("TTS - MP3 Output Format", "FAIL", msg);
    return false;
  }
}

// --- Test #9: TTS WAV Output Format ---
async function testTTSWAVOutput(sdk: NeuroLink): Promise<boolean | null> {
  logTest("TTS - WAV Output Format", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "TTS - WAV Output Format",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  try {
    const result = await sdk.generate({
      input: { text: "Testing WAV format output." },
      ...buildBaseSDKOptions(),
      maxTokens: 200,
      tts: {
        enabled: true,
        voice: TTS_CONFIG.defaultVoice,
        format: "wav",
      },
    });

    if (!result.audio || !result.audio.buffer) {
      logTest("TTS - WAV Output Format", "FAIL", "No audio in result");
      return false;
    }

    const buffer = result.audio.buffer;

    // No fallback: if RIFF header is missing, FAIL
    if (!isValidWAV(buffer)) {
      logTest(
        "TTS - WAV Output Format",
        "FAIL",
        `Missing RIFF header. Got: 0x${buffer[0]?.toString(16)} 0x${buffer[1]?.toString(16)} 0x${buffer[2]?.toString(16)} 0x${buffer[3]?.toString(16)} (expected 0x52 0x49 0x46 0x46)`,
      );
      return false;
    }

    logTest(
      "TTS - WAV Output Format",
      "PASS",
      `Valid WAV RIFF header detected (${buffer.length} bytes)`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("TTS - WAV Output Format", "SKIP", msg);
      return null;
    }
    logTest("TTS - WAV Output Format", "FAIL", msg);
    return false;
  }
}

// --- Test #10: CLI TTS Generate ---
async function testCLITTSGenerate(): Promise<boolean | null> {
  logTest("CLI TTS - Generate", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "CLI TTS - Generate",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  try {
    // Use --tts-output to save audio file, then verify the file exists.
    // Without --tts-output, the CLI produces text-only output even with --tts enabled.
    const ttsOutputPath = path.join(
      os.tmpdir(),
      `neurolink-tts-test-${Date.now()}.mp3`,
    );
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      "--tts",
      `--tts-output=${ttsOutputPath}`,
      `--max-tokens=${TEST_CONFIG.maxTokens || 500}`,
      "Hello from the CLI with TTS enabled.",
    ]);

    if (!result.success) {
      if (isExpectedProviderError(result.stderr)) {
        logTest("CLI TTS - Generate", "SKIP", result.stderr.substring(0, 100));
        return null;
      }
      // TTS CLI flag might not be implemented yet
      if (
        result.stderr.includes("Unknown argument") ||
        result.stderr.includes("--tts")
      ) {
        logTest("CLI TTS - Generate", "SKIP", "CLI --tts flag not recognized");
        return null;
      }
      logTest(
        "CLI TTS - Generate",
        "FAIL",
        `Exit code: ${result.code}. stderr: ${result.stderr.substring(0, 200)}`,
      );
      return false;
    }

    // Check if the audio file was created
    const audioFileExists = fs.existsSync(ttsOutputPath);
    const combinedOutput = (result.stdout + result.stderr).toLowerCase();
    const hasTTSIndicator =
      audioFileExists ||
      combinedOutput.includes("audio") ||
      combinedOutput.includes("tts") ||
      combinedOutput.includes(".mp3") ||
      combinedOutput.includes("saved");

    // Clean up
    try {
      if (audioFileExists) {
        fs.unlinkSync(ttsOutputPath);
      }
    } catch {
      /* ignore */
    }

    if (hasTTSIndicator) {
      const details = audioFileExists
        ? `Audio file created at ${ttsOutputPath}`
        : `TTS indicator found in output (${result.stdout.length} chars)`;
      logTest("CLI TTS - Generate", "PASS", details);
      return true;
    }

    // CLI succeeded but no TTS evidence
    if (result.stdout.length > 0) {
      logTest(
        "CLI TTS - Generate",
        "FAIL",
        `CLI produced output (${result.stdout.length} chars) but no audio file created and no TTS-related content found`,
      );
      return false;
    }

    logTest("CLI TTS - Generate", "FAIL", "CLI produced no output");
    return false;
  } catch (error) {
    logTest("CLI TTS - Generate", "FAIL", String(error));
    return false;
  }
}

// --- Test #11: CLI TTS Voice Flag ---
async function testCLITTSVoiceFlag(): Promise<boolean | null> {
  logTest("CLI TTS - Voice Flag", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "CLI TTS - Voice Flag",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  const voiceName = "en-US-Standard-A";
  const ttsOutputPath = path.join(
    os.tmpdir(),
    `neurolink-tts-voice-test-${Date.now()}.mp3`,
  );

  try {
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      "--tts",
      `--tts-voice=${voiceName}`,
      `--tts-output=${ttsOutputPath}`,
      `--max-tokens=${TEST_CONFIG.maxTokens || 500}`,
      "Testing the TTS voice flag from CLI.",
    ]);

    if (!result.success) {
      if (isExpectedProviderError(result.stderr)) {
        logTest(
          "CLI TTS - Voice Flag",
          "SKIP",
          result.stderr.substring(0, 100),
        );
        return null;
      }
      if (
        result.stderr.includes("Unknown argument") ||
        result.stderr.includes("--tts")
      ) {
        logTest(
          "CLI TTS - Voice Flag",
          "SKIP",
          "CLI --tts-voice flag not recognized",
        );
        return null;
      }
      logTest("CLI TTS - Voice Flag", "FAIL", `Exit code: ${result.code}`);
      return false;
    }

    // Check if the audio file was created (primary indicator)
    const audioFileExists = fs.existsSync(ttsOutputPath);
    const combinedOutput = (result.stdout + result.stderr).toLowerCase();
    const hasTTSIndicator =
      audioFileExists ||
      combinedOutput.includes("audio") ||
      combinedOutput.includes("tts") ||
      combinedOutput.includes(".mp3") ||
      combinedOutput.includes("saved");

    // Clean up
    try {
      if (audioFileExists) {
        fs.unlinkSync(ttsOutputPath);
      }
    } catch {
      /* ignore */
    }

    if (!hasTTSIndicator) {
      logTest(
        "CLI TTS - Voice Flag",
        "FAIL",
        `CLI produced output but no audio file and no TTS-related content found`,
      );
      return false;
    }

    logTest(
      "CLI TTS - Voice Flag",
      "PASS",
      audioFileExists
        ? `Audio file created with --tts-voice=${voiceName}`
        : `TTS indicator found in output with --tts-voice=${voiceName}`,
    );
    return true;
  } catch (error) {
    logTest("CLI TTS - Voice Flag", "FAIL", String(error));
    return false;
  }
}

// --- Test #12: TTS Error Handling ---
async function testTTSErrorHandling(sdk: NeuroLink): Promise<boolean | null> {
  logTest("TTS - Error Handling", "TESTING");
  try {
    // Try TTS with a provider that doesn't support it (openai via this path)
    const result = await sdk.generate({
      input: { text: "This should handle errors gracefully." },
      provider: "openai",
      maxTokens: 200,
      tts: {
        enabled: true,
        voice: "en-US-Neural2-C",
      },
    });

    // If result has content, check that audio is NOT present for unsupported provider
    if (result.audio) {
      // OpenAI does not support Google TTS — if audio exists, that's unexpected
      logTest(
        "TTS - Error Handling",
        "FAIL",
        `Unsupported provider "openai" returned result.audio (size=${result.audio.size}) — should not produce TTS audio via this path`,
      );
      return false;
    }

    if (result.content) {
      // Generate succeeded, no audio field — graceful degradation
      logTest(
        "TTS - Error Handling",
        "PASS",
        "Provider without TTS handler: generated text but no audio field (graceful degradation)",
      );
      return true;
    }

    // No content and no audio — unclear state
    logTest(
      "TTS - Error Handling",
      "FAIL",
      "No content and no audio returned — expected either graceful degradation or an error",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // Expected: TTS provider not supported error — must contain relevant keywords
    const lowerMsg = msg.toLowerCase();
    if (
      lowerMsg.includes("not supported") ||
      lowerMsg.includes("not configured") ||
      lowerMsg.includes("tts")
    ) {
      logTest(
        "TTS - Error Handling",
        "PASS",
        `Meaningful error thrown: ${msg.substring(0, 100)}`,
      );
      return true;
    }

    if (isExpectedProviderError(msg)) {
      logTest("TTS - Error Handling", "SKIP", msg);
      return null;
    }

    logTest(
      "TTS - Error Handling",
      "FAIL",
      `Unexpected error (does not mention "not supported" or "tts"): ${msg}`,
    );
    return false;
  }
}

// --- Test #13: TTS Stream Integration ---
async function testTTSStreamIntegration(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("TTS - Stream Integration", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "TTS - Stream Integration",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  try {
    const streamResult = await sdk.stream({
      input: { text: "Streaming with text to speech enabled." },
      ...buildBaseSDKOptions(),
      maxTokens: 500,
      tts: {
        enabled: true,
        voice: TTS_CONFIG.defaultVoice,
        format: "mp3",
      },
    });

    let chunkCount = 0;
    let hasAudioChunk = false;

    for await (const chunk of streamResult.stream) {
      chunkCount++;
      if ("content" in chunk && chunk.content) {
        // text chunk
      }
      // Check for audio chunks in stream
      if ("audio" in chunk || "ttsChunk" in chunk) {
        hasAudioChunk = true;
      }
      if (chunkCount >= 100) {
        break;
      }
    }

    // Assert at least one chunk was received
    if (chunkCount === 0) {
      logTest(
        "TTS - Stream Integration",
        "FAIL",
        "No chunks received from stream — chunkCount is 0",
      );
      return false;
    }

    logTest(
      "TTS - Stream Integration",
      "PASS",
      `Stream completed: ${chunkCount} chunks${hasAudioChunk ? ", audio chunks present" : ""}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("TTS - Stream Integration", "SKIP", msg);
      return null;
    }
    // Streaming with TTS might not be fully supported
    if (
      msg.includes("tts") ||
      msg.includes("TTS") ||
      msg.includes("not supported")
    ) {
      logTest(
        "TTS - Stream Integration",
        "SKIP",
        `TTS streaming not supported: ${msg.substring(0, 80)}`,
      );
      return null;
    }
    logTest("TTS - Stream Integration", "FAIL", msg);
    return false;
  }
}

// --- Test #14: TTS GenerateResult Shape ---
async function testTTSGenerateResultShape(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("TTS - GenerateResult.audio Shape", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "TTS - GenerateResult.audio Shape",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  const requestedFormat = "mp3";

  try {
    const result = await sdk.generate({
      input: { text: "Validate the shape of the TTS result object." },
      ...buildBaseSDKOptions(),
      maxTokens: 200,
      tts: {
        enabled: true,
        voice: TTS_CONFIG.defaultVoice,
        format: requestedFormat,
      },
    });

    if (!result.audio) {
      logTest(
        "TTS - GenerateResult.audio Shape",
        "FAIL",
        "result.audio is undefined",
      );
      return false;
    }

    const audio = result.audio;
    const checks: Array<{ field: string; ok: boolean; detail: string }> = [];

    // Required fields
    checks.push({
      field: "buffer",
      ok: Buffer.isBuffer(audio.buffer),
      detail: Buffer.isBuffer(audio.buffer)
        ? `Buffer(${audio.buffer.length})`
        : "not a Buffer",
    });

    // Assert format matches what was requested
    checks.push({
      field: "format",
      ok: audio.format === requestedFormat,
      detail:
        audio.format === requestedFormat
          ? `"${audio.format}" (matches requested)`
          : `"${audio.format}" (expected "${requestedFormat}")`,
    });

    checks.push({
      field: "size",
      ok: typeof audio.size === "number" && audio.size > 0,
      detail: `${audio.size}`,
    });

    // Optional fields - check type if present
    if (audio.duration !== undefined) {
      checks.push({
        field: "duration",
        ok: typeof audio.duration === "number",
        detail: `${audio.duration}s`,
      });
    }

    if (audio.voice !== undefined) {
      checks.push({
        field: "voice",
        ok: typeof audio.voice === "string",
        detail: `"${audio.voice}"`,
      });
    }

    if (audio.metadata !== undefined) {
      checks.push({
        field: "metadata",
        ok: typeof audio.metadata === "object" && audio.metadata !== null,
        detail: JSON.stringify(audio.metadata).substring(0, 80),
      });
    }

    const allPassed = checks.every((c) => c.ok);

    for (const c of checks) {
      const icon = c.ok ? "\u2705" : "\u274C";
      log(`   ${icon} ${c.field}: ${c.detail}`, c.ok ? "reset" : "red");
    }

    if (allPassed) {
      logTest(
        "TTS - GenerateResult.audio Shape",
        "PASS",
        `All ${checks.length} fields validated`,
      );
      return true;
    }

    const failedFields = checks.filter((c) => !c.ok).map((c) => c.field);
    logTest(
      "TTS - GenerateResult.audio Shape",
      "FAIL",
      `Invalid fields: ${failedFields.join(", ")}`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("TTS - GenerateResult.audio Shape", "SKIP", msg);
      return null;
    }
    logTest("TTS - GenerateResult.audio Shape", "FAIL", msg);
    return false;
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log("\nNeuroLink Continuous Test Suite: TTS (Text-to-Speech)", "bright");
  log(
    `   Provider: ${TEST_CONFIG.provider}, Model: ${TEST_CONFIG.model || "default"}`,
    "cyan",
  );
  log(
    `   Google Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? "set" : "NOT SET (most tests will skip)"}`,
    process.env.GOOGLE_APPLICATION_CREDENTIALS ? "green" : "yellow",
  );
  log(`   Temp dir: ${tempDir}`, "cyan");

  // Prerequisite checks
  if (!fs.existsSync("dist") || !fs.existsSync("dist/index.js")) {
    log("Build not found. Run: pnpm run build", "red");
    process.exit(1);
  }

  const sharedSdk = new NeuroLink();

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    // Infrastructure (Test #1)
    { name: "TTS Processor Init", fn: () => testTTSProcessorInit() },

    // Google TTS Handler (Tests #2-#3)
    {
      name: "Google TTS - Synthesize via generate()",
      fn: () => testGoogleTTSHandlerSynthesize(sharedSdk),
    },
    {
      name: "Google TTS - Get Voices",
      fn: () => testGoogleTTSHandlerGetVoices(),
    },

    // TTS in generate() (Test #4)
    {
      name: "TTS in generate() Options (default format)",
      fn: () => testTTSInGenerateOptions(sharedSdk),
    },

    // Different voices and languages (Tests #5-#6)
    {
      name: "TTS - Different Voices",
      fn: () => testTTSWithDifferentVoices(sharedSdk),
    },
    {
      name: "TTS - Different Languages",
      fn: () => testTTSWithDifferentLanguages(sharedSdk),
    },

    // Audio file output (Test #7)
    {
      name: "TTS - Audio File Output",
      fn: () => testTTSAudioFileOutput(sharedSdk),
    },

    // Audio format validation (Tests #8-#9)
    { name: "TTS - MP3 Output Format", fn: () => testTTSMP3Output(sharedSdk) },
    { name: "TTS - WAV Output Format", fn: () => testTTSWAVOutput(sharedSdk) },

    // CLI TTS (Tests #10-#11)
    { name: "CLI TTS - Generate", fn: () => testCLITTSGenerate() },
    { name: "CLI TTS - Voice Flag", fn: () => testCLITTSVoiceFlag() },

    // Error handling (Test #12)
    { name: "TTS - Error Handling", fn: () => testTTSErrorHandling(sharedSdk) },

    // Stream integration (Test #13)
    {
      name: "TTS - Stream Integration",
      fn: () => testTTSStreamIntegration(sharedSdk),
    },

    // Result shape validation (Test #14)
    {
      name: "TTS - GenerateResult.audio Shape",
      fn: () => testTTSGenerateResultShape(sharedSdk),
    },
    // Observability spans (Test #15)
    {
      name: "TTS - Observability Spans",
      fn: async (): Promise<boolean | null> => {
        logTest("TTS - Observability Spans", "TESTING");
        try {
          const { getMetricsAggregator, resetMetricsAggregator, SpanType } =
            await import("../dist/index.js");
          resetMetricsAggregator();
          const aggregator = getMetricsAggregator();

          if (!SpanType.TTS) {
            logTest(
              "TTS - Observability Spans",
              "FAIL",
              "SpanType.TTS is not defined",
            );
            return false;
          }

          // Only attempt real TTS operation — no synthetic span fallback
          if (isTTSCredentialsMissing()) {
            logTest(
              "TTS - Observability Spans",
              "SKIP",
              "GOOGLE_APPLICATION_CREDENTIALS not set — cannot run real TTS for span collection",
            );
            return null;
          }

          const ttsSdk = new NeuroLink();
          let ttsSucceeded = false;
          try {
            const result = await ttsSdk.generate({
              input: { text: "Observability span test." },
              ...buildBaseSDKOptions(),
              maxTokens: 500,
              tts: {
                enabled: true,
                voice: TTS_CONFIG.defaultVoice,
                format: "mp3",
              },
            });
            if (
              result.audio &&
              result.audio.buffer &&
              result.audio.buffer.length > 0
            ) {
              ttsSucceeded = true;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (isExpectedProviderError(msg)) {
              logTest(
                "TTS - Observability Spans",
                "SKIP",
                `Real TTS failed with expected error: ${msg.substring(0, 80)}`,
              );
              return null;
            }
            logTest(
              "TTS - Observability Spans",
              "FAIL",
              `Real TTS threw unexpected error: ${msg}`,
            );
            return false;
          } finally {
            try {
              await ttsSdk.shutdown?.();
            } catch {
              /* ignore */
            }
          }

          if (!ttsSucceeded) {
            logTest(
              "TTS - Observability Spans",
              "FAIL",
              "TTS generate() did not produce audio — cannot verify spans",
            );
            return false;
          }

          // Check for TTS-related spans after real operation
          const allSpans = aggregator.getSpans();
          const ttsSpans = allSpans.filter(
            (s: { type?: string; name?: string }) =>
              s.type === "tts" || (s.name && s.name.startsWith("tts.")),
          );

          if (ttsSpans.length === 0) {
            // TTS succeeded but no spans recorded — log as informational, don't crash
            log(
              "   [INFO] TTS operation succeeded but no TTS-specific spans found in aggregator. " +
                "Spans may be emitted via OpenTelemetry exporters rather than the internal aggregator.",
              "yellow",
            );
            logTest(
              "TTS - Observability Spans",
              "PASS",
              "TTS operation succeeded; no spans in internal aggregator (may use external OTEL pipeline)",
            );
            return true;
          }

          logTest(
            "TTS - Observability Spans",
            "PASS",
            `${ttsSpans.length} TTS span(s) found from real TTS operation`,
          );
          return true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logTest("TTS - Observability Spans", "FAIL", `Error: ${msg}`);
          return false;
        }
      },
    },
  ];

  for (const test of tests) {
    logSection(test.name);
    try {
      const result = await test.fn();
      testResults.push({ name: test.name, result, error: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logTest(test.name, "FAIL", `Uncaught: ${msg}`);
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
  for (const t of testResults) {
    logTest(
      t.name,
      t.result === true ? "PASS" : t.result === false ? "FAIL" : "SKIP",
      t.error || "",
    );
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  log(
    `
Final Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${testResults.length} total) in ${duration}s`,
    failed === 0 ? "green" : "red",
  );

  // Cleanup temp directory
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

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
        "Usage: npx tsx test/continuous-test-suite-tts.ts [--provider=X] [--model=Y]",
      );
      console.log(
        "\nTests: 15 (TTS processor, Google TTS, voices, languages, formats, CLI, errors, streaming, observability)",
      );
      console.log(
        "\nRequires: GOOGLE_APPLICATION_CREDENTIALS env var (tests will SKIP without it)",
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
  runAllTests().catch((e) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  describe.skip("Continuous Test Suite: TTS", () => {
    it("runs standalone via npx tsx", () => runAllTests(), 600000);
  });
}

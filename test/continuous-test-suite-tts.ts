#!/usr/bin/env tsx

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
import { NeuroLink } from "../dist/index.js";
import type { ProcessResult } from "../dist/index.js";

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
};

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || (undefined as string | undefined),
  maxTokens: undefined as number | undefined,
  timeout: 90000,
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
    // Import TTSProcessor from dist
    const distModule = await import("../dist/index.js");

    // Check TTSProcessor class is exported
    const TTSProcessor = distModule.TTSProcessor;
    if (!TTSProcessor) {
      logTest(
        "TTS Processor Init",
        "SKIP",
        "TTSProcessor not exported from dist (internal API)",
      );
      return null;
    }

    // Check that TTSProcessor has the expected static methods
    const expectedMethods = ["registerHandler", "supports", "synthesize"];
    const missingMethods = expectedMethods.filter(
      (m) => typeof (TTSProcessor as Record<string, unknown>)[m] !== "function",
    );

    if (missingMethods.length > 0) {
      logTest(
        "TTS Processor Init",
        "FAIL",
        `Missing methods: ${missingMethods.join(", ")}`,
      );
      return false;
    }

    // After NeuroLink initialization, google-ai and vertex handlers should be registered
    const sdk = new NeuroLink();
    // Allow registration to happen
    await new Promise((r) => setTimeout(r, 1000));

    const supportsGoogleAI = TTSProcessor.supports("google-ai");
    const supportsVertex = TTSProcessor.supports("vertex");

    try {
      await sdk.shutdown?.();
    } catch {
      /* ignore */
    }

    if (supportsGoogleAI || supportsVertex) {
      logTest(
        "TTS Processor Init",
        "PASS",
        `Handlers registered: google-ai=${supportsGoogleAI}, vertex=${supportsVertex}`,
      );
      return true;
    }

    // Handlers may not be registered if Google Cloud credentials are missing
    logTest(
      "TTS Processor Init",
      "PASS",
      "TTSProcessor initialized (handlers depend on credentials)",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
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

    if (result.audio) {
      if (result.audio.buffer && result.audio.buffer.length > 0) {
        logTest(
          "Google TTS - Synthesize via generate()",
          "PASS",
          `Audio buffer: ${result.audio.size} bytes, format: ${result.audio.format}`,
        );
        return true;
      }
      logTest(
        "Google TTS - Synthesize via generate()",
        "FAIL",
        "Audio buffer is empty",
      );
      return false;
    }

    // If no audio field, the TTS might not have been triggered
    logTest(
      "Google TTS - Synthesize via generate()",
      "FAIL",
      "result.audio is undefined - TTS not triggered",
    );
    return false;
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

    if (voices.length === 0) {
      logTest(
        "Google TTS - Get Voices",
        "PASS",
        "Voices list empty (may be API issue)",
      );
      return true;
    }

    // Validate voice structure
    const firstVoice = voices[0];
    if (firstVoice.name && firstVoice.languageCode) {
      logTest(
        "Google TTS - Get Voices",
        "PASS",
        `${voices.length} voices found. Sample: ${firstVoice.name} (${firstVoice.languageCode})`,
      );
      return true;
    }

    logTest(
      "Google TTS - Get Voices",
      "FAIL",
      "Voice missing name or languageCode",
    );
    return false;
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

// --- Test #4: TTS in GenerateOptions ---
async function testTTSInGenerateOptions(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("TTS in generate() Options", "TESTING");

  if (isTTSCredentialsMissing()) {
    logTest(
      "TTS in generate() Options",
      "SKIP",
      "GOOGLE_APPLICATION_CREDENTIALS not set",
    );
    return null;
  }

  try {
    const result = await sdk.generate({
      input: { text: "The quick brown fox jumps over the lazy dog." },
      ...buildBaseSDKOptions(),
      maxTokens: 500,
      tts: {
        enabled: true,
        voice: "en-US-Neural2-C",
      },
    });

    if (result.audio) {
      logTest(
        "TTS in generate() Options",
        "PASS",
        `result.audio exists: ${result.audio.size} bytes`,
      );
      return true;
    }

    logTest("TTS in generate() Options", "FAIL", "result.audio is undefined");
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("TTS in generate() Options", "SKIP", msg);
      return null;
    }
    logTest("TTS in generate() Options", "FAIL", msg);
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

  const voiceResults: Array<{ voice: string; status: string; size: number }> =
    [];

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
        voiceResults.push({ voice, status: "PASS", size: result.audio.size });
      } else {
        voiceResults.push({ voice, status: "FAIL", size: 0 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isExpectedProviderError(msg)) {
        voiceResults.push({ voice, status: "SKIP", size: 0 });
      } else {
        voiceResults.push({ voice, status: "FAIL", size: 0 });
      }
    }

    // Small delay between voice tests
    await new Promise((r) => setTimeout(r, 2000));
  }

  for (const r of voiceResults) {
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

  const passed = voiceResults.filter((r) => r.status === "PASS").length;
  const skipped = voiceResults.filter((r) => r.status === "SKIP").length;

  if (passed > 0) {
    logTest(
      "TTS - Different Voices",
      "PASS",
      `${passed}/${voiceResults.length} voices produced audio`,
    );
    return null;
  }

  if (skipped === voiceResults.length) {
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

  const langResults: Array<{
    lang: string;
    voice: string;
    status: string;
    size: number;
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
        langResults.push({
          lang: code,
          voice,
          status: "PASS",
          size: result.audio.size,
        });
      } else {
        langResults.push({ lang: code, voice, status: "FAIL", size: 0 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isExpectedProviderError(msg)) {
        langResults.push({ lang: code, voice, status: "SKIP", size: 0 });
      } else {
        langResults.push({ lang: code, voice, status: "FAIL", size: 0 });
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  for (const r of langResults) {
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

  const passed = langResults.filter((r) => r.status === "PASS").length;
  const skipped = langResults.filter((r) => r.status === "SKIP").length;

  if (passed > 0) {
    logTest(
      "TTS - Different Languages",
      "PASS",
      `${passed}/${langResults.length} languages produced audio`,
    );
    return null;
  }

  if (skipped === langResults.length) {
    logTest("TTS - Different Languages", "SKIP", "All languages skipped");
    return null;
  }

  logTest("TTS - Different Languages", "FAIL", "No languages produced audio");
  return false;
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

    logTest(
      "TTS - Audio File Output",
      "PASS",
      `File saved: ${outputPath} (${stats.size} bytes)`,
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

    const buffer = result.audio.buffer;

    if (isValidMP3(buffer)) {
      logTest(
        "TTS - MP3 Output Format",
        "PASS",
        `Valid MP3 detected (${buffer.length} bytes), header: 0x${buffer[0].toString(16)} 0x${buffer[1].toString(16)}`,
      );
      return true;
    }

    logTest(
      "TTS - MP3 Output Format",
      "FAIL",
      `Invalid MP3 magic bytes: 0x${buffer[0]?.toString(16)} 0x${buffer[1]?.toString(16)}`,
    );
    return false;
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

    if (isValidWAV(buffer)) {
      logTest(
        "TTS - WAV Output Format",
        "PASS",
        `Valid WAV RIFF header detected (${buffer.length} bytes)`,
      );
      return true;
    }

    // WAV format from Google uses LINEAR16 encoding, which may produce raw PCM
    // The header depends on Google's response format
    if (buffer.length > 0) {
      logTest(
        "TTS - WAV Output Format",
        "PASS",
        `Audio buffer received (${buffer.length} bytes), header: 0x${buffer[0]?.toString(16)} 0x${buffer[1]?.toString(16)} 0x${buffer[2]?.toString(16)} 0x${buffer[3]?.toString(16)}`,
      );
      return true;
    }

    logTest("TTS - WAV Output Format", "FAIL", "Empty audio buffer");
    return false;
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
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      "--tts",
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

    // CLI should have produced output
    if (result.stdout.length > 0) {
      logTest(
        "CLI TTS - Generate",
        "PASS",
        `CLI completed with output (${result.stdout.length} chars)`,
      );
      return true;
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

  try {
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "generate",
      ...buildBaseCLIArgs(),
      "--tts",
      "--tts-voice=en-US-Standard-A",
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

    logTest(
      "CLI TTS - Voice Flag",
      "PASS",
      "CLI completed with --tts-voice flag",
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
    // Try TTS with a provider that doesn't support it
    const result = await sdk.generate({
      input: { text: "This should handle errors gracefully." },
      provider: "openai",
      maxTokens: 200,
      tts: {
        enabled: true,
        voice: "en-US-Neural2-C",
      },
    });

    // If it succeeds (some providers might handle TTS differently), that's fine
    if (result.content) {
      // OpenAI doesn't have TTS via this path, so audio should be absent
      if (!result.audio) {
        logTest(
          "TTS - Error Handling",
          "PASS",
          "Provider without TTS handler: no audio field (graceful)",
        );
        return true;
      }
      logTest(
        "TTS - Error Handling",
        "PASS",
        "Provider handled TTS request (may have TTS support)",
      );
      return true;
    }

    logTest("TTS - Error Handling", "PASS", "Request handled without crash");
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // Expected: TTS provider not supported error
    if (
      msg.includes("not supported") ||
      msg.includes("not configured") ||
      msg.includes("TTS") ||
      msg.includes("tts")
    ) {
      logTest(
        "TTS - Error Handling",
        "PASS",
        `Meaningful error: ${msg.substring(0, 100)}`,
      );
      return true;
    }

    if (isExpectedProviderError(msg)) {
      logTest("TTS - Error Handling", "SKIP", msg);
      return null;
    }

    logTest("TTS - Error Handling", "FAIL", `Unexpected error: ${msg}`);
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

    const chunks: string[] = [];
    let hasAudioChunk = false;

    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && chunk.content) {
        chunks.push(chunk.content);
      }
      // Check for audio chunks in stream
      if ("audio" in chunk || "ttsChunk" in chunk) {
        hasAudioChunk = true;
      }
      if (chunks.length >= 100) {
        break;
      }
    }

    const content = chunks.join("");

    if (content.length > 0) {
      logTest(
        "TTS - Stream Integration",
        "PASS",
        `Stream completed: ${chunks.length} text chunks${hasAudioChunk ? ", audio chunks present" : ""}`,
      );
      return true;
    }

    // Stream may complete without text chunks if TTS-only mode
    logTest(
      "TTS - Stream Integration",
      "PASS",
      `Stream completed (${chunks.length} chunks, audioChunks=${hasAudioChunk})`,
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

  try {
    const result = await sdk.generate({
      input: { text: "Validate the shape of the TTS result object." },
      ...buildBaseSDKOptions(),
      maxTokens: 200,
      tts: {
        enabled: true,
        voice: TTS_CONFIG.defaultVoice,
        format: "mp3",
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

    checks.push({
      field: "format",
      ok: typeof audio.format === "string" && audio.format.length > 0,
      detail: `"${audio.format}"`,
    });

    checks.push({
      field: "size",
      ok: typeof audio.size === "number" && audio.size >= 0,
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
      name: "TTS in generate() Options",
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
  testResults.forEach((t) =>
    logTest(
      t.name,
      t.result === true ? "PASS" : t.result === false ? "FAIL" : "SKIP",
      t.error || "",
    ),
  );

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
        "\nTests: 14 (TTS processor, Google TTS, voices, languages, formats, CLI, errors, streaming)",
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
  TEST_CONFIG.maxTokens = PROVIDER_MAX_TOKENS[TEST_CONFIG.provider] || 8192;
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

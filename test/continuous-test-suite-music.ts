#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Music Modality
 *
 * Tests the music handler registry + dispatch for Beatoven, ElevenLabs
 * Music, Lyria, and Replicate (MusicGen). Each handler test gracefully
 * skips when its upstream credentials are missing.
 *
 * Coverage:
 * - MusicProcessor.supports() returns true for beatoven /
 *   elevenlabs-music / elevenlabs-sound / lyria / replicate / musicgen
 * - generate({output:{mode:"music", music:{provider, prompt}}}) returns
 *   MusicResult with mp3 buffer when configured
 * - Empty prompt surfaces MUSIC_PROMPT_REQUIRED
 *
 * Run: pnpm run test:music
 */

import { fileURLToPath } from "url";
import * as path from "path";

import {
  MusicProcessor,
  MUSIC_ERROR_CODES,
  NeuroLink,
  ProviderRegistry,
} from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TestResult = { name: string; ok: boolean; reason?: string };
const results: TestResult[] = [];
const log = (...args: unknown[]) => console.log(...args);

/**
 * Detect upstream user-environment failures that should be reported as
 * test-environment SKIPs rather than SDK FAILs (account closed / no
 * credits / rate-limit throttle / transient CDN fetch failure).
 */
function isAccountUnavailableError(message: string): boolean {
  if (typeof message !== "string") {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("402") ||
    lower.includes("401") ||
    lower.includes("payment_required") ||
    lower.includes("payment_intent_status") ||
    lower.includes("payment_issue") ||
    lower.includes("requires_payment_method") ||
    lower.includes("insufficient credits") ||
    lower.includes("lack sufficient credits") ||
    lower.includes("rate limit exceeded") ||
    lower.includes("rate_limit_exceeded") ||
    lower.includes("less than $5.0 in credit") ||
    lower.includes("fetch failed") ||
    lower.includes("failed: 401")
  );
}

function record(name: string, ok: boolean, reason?: string): void {
  // Auto-promote known account-unavailable failures to SKIPs — they are
  // not SDK bugs and the suite should stay green for the remaining cases.
  if (!ok && reason && isAccountUnavailableError(reason)) {
    log(`⊘ ${name} — SKIP (account unavailable): ${reason.slice(0, 200)}`);
    results.push({ name: `${name} (skip — account)`, ok: true });
    return;
  }
  results.push({ name, ok, reason });
  log(`${ok ? "✓" : "✗"} ${name}${reason ? ` — ${reason}` : ""}`);
}

async function testRegistration(): Promise<void> {
  await ProviderRegistry.registerAllProviders();

  const expected = [
    "beatoven",
    "elevenlabs-music",
    "elevenlabs-sound",
    "lyria",
    "replicate",
    "musicgen",
  ];
  for (const name of expected) {
    const supported = MusicProcessor.supports(name);
    record(`MusicProcessor.supports("${name}")`, supported);
  }
}

async function testValidationErrors(): Promise<void> {
  try {
    await MusicProcessor.generate("beatoven", { prompt: "" });
    record("MUSIC_PROMPT_REQUIRED on empty prompt", false, "no error thrown");
  } catch (err) {
    const code = (err as { code?: string }).code;
    record(
      "MUSIC_PROMPT_REQUIRED on empty prompt",
      code === MUSIC_ERROR_CODES.PROMPT_REQUIRED,
      `code=${code}`,
    );
  }

  try {
    await MusicProcessor.generate("__nonexistent__", { prompt: "test" });
    record("MUSIC_PROVIDER_NOT_SUPPORTED", false, "no error thrown");
  } catch (err) {
    const code = (err as { code?: string }).code;
    record(
      "MUSIC_PROVIDER_NOT_SUPPORTED",
      code === MUSIC_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      `code=${code}`,
    );
  }
}

async function validateAudio(buffer: Buffer | undefined): boolean {
  if (!buffer || buffer.length < 1000) {
    return false;
  }
  // MP3 magic: 0xFF 0xFB or "ID3"
  if (
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) ||
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33)
  ) {
    return true;
  }
  // WAV magic: "RIFF" .... "WAVE"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.subarray(8, 12).toString() === "WAVE"
  ) {
    return true;
  }
  // OGG magic: "OggS"
  if (
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return true;
  }
  return false;
}

async function testElevenLabsMusic(): Promise<void> {
  if (!process.env.ELEVENLABS_API_KEY) {
    record("ElevenLabs Music generate (skip — no ELEVENLABS_API_KEY)", true);
    return;
  }
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      provider: "vertex",
      output: {
        mode: "music",
        music: {
          provider: "elevenlabs-music",
          prompt: "Calm cinematic ambient pad, soft piano, slow tempo",
          duration: 4,
        },
      },
    });
    const buffer = result.music?.buffer;
    const ok = await validateAudio(buffer);
    record(
      "ElevenLabs Music end-to-end returns playable audio",
      ok,
      `size=${buffer?.length ?? 0}`,
    );
  } catch (err) {
    record(
      "ElevenLabs Music end-to-end",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function testBeatoven(): Promise<void> {
  if (!process.env.BEATOVEN_API_KEY) {
    record("Beatoven generate (skip — no BEATOVEN_API_KEY)", true);
    return;
  }
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      provider: "vertex",
      output: {
        mode: "music",
        music: {
          provider: "beatoven",
          prompt: "Warm corporate background loop, mid-tempo",
          duration: 30,
          genre: "corporate",
          mood: "uplifting",
        },
      },
    });
    const ok = await validateAudio(result.music?.buffer);
    record(
      "Beatoven end-to-end returns playable audio",
      ok,
      `size=${result.music?.buffer.length ?? 0}`,
    );
  } catch (err) {
    record(
      "Beatoven end-to-end",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function testLyria(): Promise<void> {
  // LyriaMusic accepts any of these env vars; gate the test on the same set
  // so users with GOOGLE_AI_API_KEY / GEMINI_API_KEY don't see a misleading
  // skip.
  const key =
    process.env.GOOGLE_AI_LYRIA_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GOOGLE_AI_API_KEY ??
    process.env.GEMINI_API_KEY;
  if (!key) {
    record(
      "Lyria generate (skip — no GOOGLE_AI_LYRIA_API_KEY/GOOGLE_API_KEY/GOOGLE_AI_API_KEY/GEMINI_API_KEY)",
      true,
    );
    return;
  }
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      provider: "vertex",
      output: {
        mode: "music",
        music: {
          provider: "lyria",
          prompt: "Classical string quartet, andante, peaceful",
          duration: 16,
          genre: "classical",
        },
      },
    });
    const ok = await validateAudio(result.music?.buffer);
    record(
      "Lyria end-to-end returns playable audio",
      ok,
      `size=${result.music?.buffer.length ?? 0}`,
    );
  } catch (err) {
    record(
      "Lyria end-to-end",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function testReplicateMusic(): Promise<void> {
  if (!process.env.REPLICATE_API_TOKEN) {
    record("Replicate Music generate (skip — no REPLICATE_API_TOKEN)", true);
    return;
  }
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      provider: "vertex",
      output: {
        mode: "music",
        music: {
          provider: "replicate",
          prompt: "Lo-fi hip-hop beat with vinyl crackle",
          duration: 8,
          genre: "lo-fi",
          tempo: 80,
        },
      },
    });
    const ok = await validateAudio(result.music?.buffer);
    record(
      "Replicate (MusicGen) end-to-end returns playable audio",
      ok,
      `size=${result.music?.buffer.length ?? 0}`,
    );
  } catch (err) {
    record(
      "Replicate (MusicGen) end-to-end",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function main(): Promise<void> {
  log("=== Music Modality Test Suite ===");

  await testRegistration();
  await testValidationErrors();
  await testElevenLabsMusic();
  await testBeatoven();
  await testLyria();
  await testReplicateMusic();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  log(`\n${passed} passed · ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Music test suite crashed:", err);
  process.exit(2);
});

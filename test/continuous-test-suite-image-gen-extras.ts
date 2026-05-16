#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Image Generation Extras
 *
 * Coverage for the direct image-generation providers added alongside the
 * built-in Vertex / OpenAI / Anthropic / Bedrock paths:
 *   - Stability AI (api.stability.ai/v2beta)
 *   - Ideogram (api.ideogram.ai)
 *   - Recraft (external.api.recraft.ai)
 *   - Replicate-hosted image models (FLUX, SDXL, etc.)
 *
 * Each test gracefully skips when its API key is missing.
 *
 * Run: pnpm run test:image-gen
 */

import { fileURLToPath } from "url";
import * as path from "path";

import { NeuroLink } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TestResult = { name: string; ok: boolean; reason?: string };
const results: TestResult[] = [];
const log = (...args: unknown[]) => console.log(...args);

function record(name: string, ok: boolean, reason?: string): void {
  results.push({ name, ok, reason });
  log(`${ok ? "✓" : "✗"} ${name}${reason ? ` — ${reason}` : ""}`);
}

/**
 * Detect upstream user-environment failures that should be reported as
 * test-environment SKIPs rather than SDK FAILs. Covers the common cases:
 *   - HTTP 402 (insufficient credits / unpaid invoice)
 *   - HTTP 429 with low-credit throttle framing
 *   - Stability "payment_required"
 *   - Replicate "rate limit exceeded" + low-credit narrative
 */
function isAccountUnavailableError(message: string): boolean {
  if (typeof message !== "string") {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("402") ||
    lower.includes("payment_required") ||
    lower.includes("payment_intent_status") ||
    lower.includes("insufficient credits") ||
    lower.includes("lack sufficient credits") ||
    lower.includes("requires_payment_method") ||
    lower.includes("rate limit exceeded") ||
    lower.includes("rate_limit_exceeded") ||
    lower.includes("less than $5.0 in credit")
  );
}

function recordWithSkipFilter(
  name: string,
  ok: boolean,
  reason?: string,
): void {
  if (!ok && reason && isAccountUnavailableError(reason)) {
    log(`⊘ ${name} — SKIP (account unavailable): ${reason.slice(0, 200)}`);
    results.push({ name: `${name} (skip — account)`, ok: true });
    return;
  }
  record(name, ok, reason);
}

function isPng(buffer: Buffer | null | undefined): boolean {
  if (!buffer || buffer.length < 8) {
    return false;
  }
  return (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

function isJpeg(buffer: Buffer | null | undefined): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }
  return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isWebp(buffer: Buffer | null | undefined): boolean {
  if (!buffer || buffer.length < 12) {
    return false;
  }
  // RIFF....WEBP
  return (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  );
}

async function testStability(): Promise<void> {
  if (!process.env.STABILITY_API_KEY) {
    record("Stability AI generate (skip — no STABILITY_API_KEY)", true);
    return;
  }
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      provider: "stability",
      model: "stable-image-core",
      input: { text: "A serene mountain lake at sunrise, photorealistic" },
    });
    const buffer =
      result.imageOutput?.base64 !== undefined &&
      result.imageOutput?.base64 !== null
        ? Buffer.from(result.imageOutput.base64, "base64")
        : null;
    recordWithSkipFilter(
      "Stability AI (Stable Image Core) returns valid PNG",
      isPng(buffer),
      `size=${buffer?.length ?? 0}`,
    );
  } catch (err) {
    recordWithSkipFilter(
      "Stability AI end-to-end",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function testIdeogram(): Promise<void> {
  if (!process.env.IDEOGRAM_API_KEY) {
    record("Ideogram generate (skip — no IDEOGRAM_API_KEY)", true);
    return;
  }
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      provider: "ideogram",
      model: "V_3",
      input: {
        text: 'Movie poster with the title "Test Run", dramatic lighting',
      },
    });
    const buffer =
      result.imageOutput?.base64 !== undefined &&
      result.imageOutput?.base64 !== null
        ? Buffer.from(result.imageOutput.base64, "base64")
        : null;
    record(
      "Ideogram (V3) returns valid PNG/JPEG",
      isPng(buffer) || isJpeg(buffer),
      `size=${buffer?.length ?? 0}`,
    );
  } catch (err) {
    record(
      "Ideogram end-to-end",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function testRecraft(): Promise<void> {
  if (!process.env.RECRAFT_API_KEY) {
    record("Recraft generate (skip — no RECRAFT_API_KEY)", true);
    return;
  }
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      provider: "recraft",
      model: "recraftv3",
      input: { text: "A minimal flat illustration of a coffee cup" },
    });
    const buffer =
      result.imageOutput?.base64 !== undefined &&
      result.imageOutput?.base64 !== null
        ? Buffer.from(result.imageOutput.base64, "base64")
        : null;
    record(
      "Recraft (V3 raster) returns valid PNG/JPEG/WebP",
      isPng(buffer) || isJpeg(buffer) || isWebp(buffer),
      `size=${buffer?.length ?? 0}`,
    );
  } catch (err) {
    record(
      "Recraft end-to-end",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function testReplicateImage(): Promise<void> {
  if (!process.env.REPLICATE_API_TOKEN) {
    record("Replicate image-gen (skip — no REPLICATE_API_TOKEN)", true);
    return;
  }
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      provider: "replicate",
      model: "black-forest-labs/flux-1.1-pro",
      input: { text: "A serene mountain lake at sunrise" },
    });
    const buffer =
      result.imageOutput?.base64 !== undefined &&
      result.imageOutput?.base64 !== null
        ? Buffer.from(result.imageOutput.base64, "base64")
        : null;
    recordWithSkipFilter(
      "Replicate (FLUX 1.1 Pro) returns valid PNG/JPEG",
      isPng(buffer) || isJpeg(buffer),
      `size=${buffer?.length ?? 0}`,
    );
  } catch (err) {
    recordWithSkipFilter(
      "Replicate (FLUX 1.1 Pro) end-to-end",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function testInvalidKey(): Promise<void> {
  // Sanity: with an obviously-bogus key, Stability surfaces a friendly
  // typed error rather than dumping raw upstream bytes.
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    await nl.generate({
      provider: "stability",
      model: "stable-image-core",
      input: { text: "test" },
      credentials: { stability: { apiKey: "sk-stability-bogus-test-key" } },
    });
    record(
      "Stability surfaces friendly error on bad API key",
      false,
      "no error thrown",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record(
      "Stability surfaces friendly error on bad API key",
      msg.includes("Stability") || msg.includes("API key"),
      msg.slice(0, 120),
    );
  }
}

async function main(): Promise<void> {
  log("=== Image Generation Extras Suite ===");

  await testStability();
  await testIdeogram();
  await testRecraft();
  await testReplicateImage();
  await testInvalidKey();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  log(`\n${passed} passed · ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Image-gen extras suite crashed:", err);
  process.exit(2);
});

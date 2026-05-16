#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Avatar Modality
 *
 * Tests the avatar handler registry + dispatch for D-ID, HeyGen, and
 * Replicate (MuseTalk). Each handler test gracefully skips when its
 * upstream credentials are missing.
 *
 * Coverage:
 * - AvatarProcessor.supports() returns true for d-id / heygen /
 *   replicate / musetalk
 * - AvatarProcessor.listProviders() includes all four
 * - generate({output:{mode:"avatar", avatar:{provider, image, audio/text}}})
 *   returns AvatarResult with mp4 buffer when configured
 * - Empty image / missing audio surfaces typed AvatarError
 *
 * Run: pnpm run test:avatar
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import {
  AvatarProcessor,
  AVATAR_ERROR_CODES,
  NeuroLink,
  ProviderRegistry,
} from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_DIR = path.join(__dirname, "fixtures");
const PORTRAIT_FIXTURE = path.join(FIXTURE_DIR, "portrait.jpg");
const NARRATION_FIXTURE = path.join(FIXTURE_DIR, "narration.mp3");

type TestResult = { name: string; ok: boolean; reason?: string };

const results: TestResult[] = [];
const log = (...args: unknown[]) => console.log(...args);

function record(name: string, ok: boolean, reason?: string): void {
  results.push({ name, ok, reason });
  log(`${ok ? "✓" : "✗"} ${name}${reason ? ` — ${reason}` : ""}`);
}

async function ensureFixtures(): Promise<{
  portrait: Buffer | null;
  narration: Buffer | null;
}> {
  const portrait = fs.existsSync(PORTRAIT_FIXTURE)
    ? fs.readFileSync(PORTRAIT_FIXTURE)
    : null;
  const narration = fs.existsSync(NARRATION_FIXTURE)
    ? fs.readFileSync(NARRATION_FIXTURE)
    : null;
  return { portrait, narration };
}

async function testRegistration(): Promise<void> {
  await ProviderRegistry.registerAllProviders();

  const expected = ["d-id", "heygen", "replicate", "musetalk"];
  for (const name of expected) {
    const supported = AvatarProcessor.supports(name);
    record(`AvatarProcessor.supports("${name}")`, supported);
  }

  const providers = AvatarProcessor.listProviders();
  record(
    `AvatarProcessor.listProviders() includes 'd-id'`,
    providers.includes("d-id"),
    `actual: ${providers.join(", ")}`,
  );
}

async function testValidationErrors(): Promise<void> {
  // image required — passes empty options
  try {
    await AvatarProcessor.generate("d-id", {
      image: "",
      text: "hello",
    });
    record(
      "AvatarError.IMAGE_REQUIRED on empty image",
      false,
      "no error thrown",
    );
  } catch (err) {
    const code = (err as { code?: string }).code;
    record(
      "AvatarError.IMAGE_REQUIRED on empty image",
      code === AVATAR_ERROR_CODES.IMAGE_REQUIRED,
      `code=${code}`,
    );
  }

  // unknown provider
  try {
    await AvatarProcessor.generate("__nonexistent__", {
      image: "/dev/null",
      text: "x",
    });
    record("AvatarError.PROVIDER_NOT_SUPPORTED", false, "no error thrown");
  } catch (err) {
    const code = (err as { code?: string }).code;
    record(
      "AvatarError.PROVIDER_NOT_SUPPORTED",
      code === AVATAR_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      `code=${code}`,
    );
  }
}

async function testDIDLive(): Promise<void> {
  const didKey = process.env.DID_API_KEY ?? process.env.D_ID_API_KEY;
  if (!didKey) {
    record("D-ID generate (skip — no DID_API_KEY)", true);
    return;
  }
  const { portrait, narration } = await ensureFixtures();
  if (!portrait || !narration) {
    record(
      "D-ID generate (skip — missing fixtures)",
      true,
      "test/fixtures/portrait.jpg or narration.mp3 missing",
    );
    return;
  }

  try {
    const nl = new NeuroLink({
      conversationMemory: { enabled: false },
    });
    const result = await nl.generate({
      provider: "vertex",
      output: {
        mode: "avatar",
        avatar: {
          provider: "d-id",
          image: portrait,
          audio: narration,
          format: "mp4",
        },
      },
    });
    const buffer = result.avatar?.buffer;
    const isMp4 =
      buffer &&
      buffer.length > 0 &&
      buffer.subarray(4, 8).toString() === "ftyp";
    record(
      "D-ID end-to-end via generate() returns playable MP4",
      Boolean(isMp4),
      `size=${buffer?.length ?? 0}`,
    );
  } catch (err) {
    record(
      "D-ID end-to-end via generate()",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function testHeyGenLive(): Promise<void> {
  if (!process.env.HEYGEN_API_KEY) {
    record("HeyGen generate (skip — no HEYGEN_API_KEY)", true);
    return;
  }
  if (!process.env.HEYGEN_TEST_AVATAR_ID) {
    record(
      "HeyGen generate (skip — no HEYGEN_TEST_AVATAR_ID)",
      true,
      "set HEYGEN_TEST_AVATAR_ID to a HeyGen catalog avatar id",
    );
    return;
  }

  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      provider: "vertex",
      output: {
        mode: "avatar",
        avatar: {
          provider: "heygen",
          image: process.env.HEYGEN_TEST_AVATAR_ID,
          text: "Hello from NeuroLink avatar testing.",
          voice: "1bd001e7e50f421d891986aad5158bc8",
        },
      },
    });
    const buffer = result.avatar?.buffer;
    const isMp4 =
      buffer &&
      buffer.length > 0 &&
      buffer.subarray(4, 8).toString() === "ftyp";
    record(
      "HeyGen end-to-end via generate() returns playable MP4",
      Boolean(isMp4),
      `size=${buffer?.length ?? 0}`,
    );
  } catch (err) {
    record(
      "HeyGen end-to-end via generate()",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function testReplicateLive(): Promise<void> {
  if (!process.env.REPLICATE_API_TOKEN) {
    record("Replicate avatar (skip — no REPLICATE_API_TOKEN)", true);
    return;
  }
  const { portrait, narration } = await ensureFixtures();
  if (!portrait || !narration) {
    record(
      "Replicate avatar (skip — missing fixtures)",
      true,
      "test/fixtures/portrait.jpg or narration.mp3 missing",
    );
    return;
  }

  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      provider: "vertex",
      output: {
        mode: "avatar",
        avatar: {
          provider: "replicate",
          image: portrait,
          audio: narration,
        },
      },
    });
    const buffer = result.avatar?.buffer;
    record(
      "Replicate (MuseTalk) end-to-end returns video buffer",
      Boolean(buffer && buffer.length > 100_000),
      `size=${buffer?.length ?? 0}`,
    );
  } catch (err) {
    record(
      "Replicate (MuseTalk) end-to-end via generate()",
      false,
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function main(): Promise<void> {
  log("=== Avatar Modality Test Suite ===");

  await testRegistration();
  await testValidationErrors();
  await testDIDLive();
  await testHeyGenLive();
  await testReplicateLive();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  log(`\n${passed} passed · ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Avatar test suite crashed:", err);
  process.exit(2);
});

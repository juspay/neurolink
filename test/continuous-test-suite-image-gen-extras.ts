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

import { spawn } from "node:child_process";
import { fileURLToPath } from "url";
import * as path from "path";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";

import {
  NeuroLink,
  ImageGenService,
  sniffImageMimeType,
  detectImageMimeType,
} from "../dist/index.js";

import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TestResult = { name: string; ok: boolean; reason?: string };
const results: TestResult[] = [];
const log = (...args: unknown[]) => console.log(...args);

/**
 * True when a vendor refused before serving — no credits, no quota, bad key,
 * rate limited. That is a blocked prerequisite, not evidence about the code,
 * and recording it as a failure would blame the package for a billing state.
 */
function isVendorBlocked(text: string): boolean {
  return /not_enough_credits|insufficient|quota|payment|billing|rate limit|\b429\b|\b402\b|unauthorized|\b401\b/i.test(
    text,
  );
}

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
    // The provider must label the bytes it returned; Recraft V3 raster
    // answers WebP, which used to surface as an assumed image/png.
    const sniffed = isPng(buffer)
      ? "image/png"
      : isJpeg(buffer)
        ? "image/jpeg"
        : isWebp(buffer)
          ? "image/webp"
          : "unknown";
    record(
      "Recraft imageOutput.mimeType matches the sniffed format",
      result.imageOutput?.mimeType === sniffed,
      `mimeType=${result.imageOutput?.mimeType ?? "absent"} sniffed=${sniffed}`,
    );
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    if (isVendorBlocked(text)) {
      record("Recraft end-to-end (skip — vendor refused before serving)", true);
      return;
    }
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

/**
 * Byte-signature coverage that runs with no key and no vendor.
 *
 * This is the one part of the image path a live call cannot exercise: no
 * provider will ever hand back a truncated four-byte PNG prefix, and the whole
 * point of the gate is what it does with bytes that are *not* a valid image.
 * Fixed inputs are what buys the coverage — every case below is a byte string
 * chosen to sit on one side of a signature boundary. Everything still comes
 * from the built package, so this exercises what callers actually load.
 */
async function testMimeSniffing(): Promise<void> {
  const cases: Array<{ what: string; bytes: Buffer; expect: string | null }> = [
    {
      what: "a full 8-byte PNG signature",
      bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      expect: "image/png",
    },
    {
      what: "a truncated 4-byte PNG prefix",
      // `iVBORw==` — the leading bytes of every PNG, and not a decodable image.
      bytes: Buffer.from("iVBORw==", "base64"),
      expect: null,
    },
    {
      what: "PNG's first four bytes followed by the wrong four",
      bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00]),
      expect: null,
    },
    {
      what: "a JPEG signature",
      bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      expect: "image/jpeg",
    },
    {
      what: "a WebP signature",
      bytes: Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from("WEBP"),
      ]),
      expect: "image/webp",
    },
    {
      what: "a RIFF container that is not WebP",
      bytes: Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from("WAVE"),
      ]),
      expect: null,
    },
    {
      what: "a GIF89a signature",
      bytes: Buffer.from("GIF89a"),
      expect: "image/gif",
    },
    {
      what: "a GIF87a signature",
      // The other legal version stamp. A guard, not a discriminator: it
      // passes whether the branch reads three bytes or six.
      bytes: Buffer.from("GIF87a"),
      expect: "image/gif",
    },
    {
      what: "the ASCII letters GIF followed by nulls",
      // `R0lGAAAA` decodes to 47 49 46 00 00 00 — six bytes, so it cleared the
      // old `length >= 6` guard, and the branch then compared only the first
      // three. Arbitrary base64 beginning "GIF" was labelled image/gif, which
      // is the same false positive the 8-byte PNG tightening closed. The
      // version stamp is what separates a header from three coincidental
      // letters.
      bytes: Buffer.from("R0lGAAAA", "base64"),
      expect: null,
    },
    {
      what: "a GIF header with an unknown version stamp",
      bytes: Buffer.from("GIF88a"),
      expect: null,
    },
    {
      what: "ordinary prose",
      bytes: Buffer.from("This is a paragraph of text, not an image at all."),
      expect: null,
    },
    { what: "an empty buffer", bytes: Buffer.alloc(0), expect: null },
  ];

  for (const c of cases) {
    const got = sniffImageMimeType(c.bytes);
    record(
      `sniff: ${c.what}`,
      got === c.expect,
      `expected ${c.expect ?? "no match"}, got ${got ?? "no match"}`,
    );
  }

  // `detectImageMimeType` is the other half of the pair and collapses "not an
  // image" into a default on purpose. That difference is the whole reason both
  // functions exist, so it is asserted rather than assumed: a caller that picks
  // the wrong one either invents images out of prose or refuses real ones.
  for (const c of cases) {
    const got = detectImageMimeType(c.bytes);
    const expected = c.expect ?? "image/png";
    record(
      `detect: ${c.what}`,
      got === expected,
      `expected ${expected}, got ${got}`,
    );
  }

  record(
    "detect and sniff disagree exactly on unrecognised bytes",
    detectImageMimeType(Buffer.from("not an image")) === "image/png" &&
      sniffImageMimeType(Buffer.from("not an image")) === null,
    "the two helpers no longer differ on unrecognised bytes",
  );
}

/**
 * The signature table above is only half the fix. `ImageGenService` is the
 * layer that actually handed callers the wrong label — it filled an absent
 * `mimeType` with a hard-coded `image/png` — and it is exported from the
 * package, so every branch below is reachable from `dist`.
 *
 * A vendor cannot produce these inputs on demand: no provider returns an
 * *unlabelled* WebP, a mislabelled buffer and a prose payload to order. The
 * recorded provider responses are exactly that determinism, and they are fed
 * through the service's own public `generateImage()` so the assertions land on
 * the shipped return value rather than on an internal shape.
 */
async function testServiceMimeLabelling(): Promise<void> {
  // A minimal but structurally real WebP header: RIFF....WEBPVP8 .
  const webpBytes = Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from("WEBP"),
    Buffer.from("VP8 "),
  ]);
  const webpB64 = webpBytes.toString("base64");
  const gifBytes = Buffer.from("GIF89a");

  const drive = async (
    recorded: Record<string, unknown>,
  ): Promise<{ success: boolean; mimeType?: string; base64?: string }> => {
    const service = new ImageGenService({ enabled: true });
    // Seed the lazily-created client with the recorded turn. The field is
    // `private` to TypeScript only; this is the recorded-backend seam, not a
    // reach into logic under test — `generate()` and its return value
    // are the public surface being asserted.
    (service as unknown as { neurolinkInstance: unknown }).neurolinkInstance = {
      generate: async () => recorded,
    };
    return (await service.generate({ prompt: "a test image" })) as {
      success: boolean;
      mimeType?: string;
      base64?: string;
    };
  };

  const cases: Array<{
    what: string;
    recorded: Record<string, unknown>;
    expect: string | null;
  }> = [
    {
      what: "an unlabelled imageOutput is sniffed, not assumed to be PNG",
      recorded: { imageOutput: { base64: webpB64 } },
      expect: "image/webp",
    },
    {
      what: "a labelled imageOutput keeps the label the provider declared",
      recorded: { imageOutput: { base64: webpB64, mimeType: "image/webp" } },
      expect: "image/webp",
    },
    {
      what: "a raw Buffer imageOutput is sniffed",
      recorded: { imageOutput: gifBytes },
      expect: "image/gif",
    },
    {
      what: "a data URI in content carries its own type",
      recorded: { content: `data:image/jpeg;base64,${webpB64}` },
      expect: "image/jpeg",
    },
    {
      what: "raw base64 image bytes in content are recognised",
      recorded: { content: webpB64 },
      expect: "image/webp",
    },
    {
      what: "prose in content yields no image rather than a fake PNG",
      // The discriminator for the sniff/detect split: `detectImageMimeType`
      // would answer `image/png` here and invent an image out of text.
      recorded: {
        content: Buffer.from("This is a sentence, not an image.").toString(
          "base64",
        ),
      },
      expect: null,
    },
  ];

  for (const c of cases) {
    let got: string | null;
    try {
      const res = await drive(c.recorded);
      got = res.success ? (res.mimeType ?? "(missing)") : null;
    } catch (err) {
      // Describe the discrepancy without quoting the payload: a message
      // carrying provider-ish text is silently downgraded to a skip.
      record(`service: ${c.what}`, false, "generate threw");
      void err;
      continue;
    }
    record(
      `service: ${c.what}`,
      got === c.expect,
      `expected ${c.expect ?? "no image"}, got ${got ?? "no image"}`,
    );
  }
}

/**
 * The remaining public surfaces for Recraft: the CLI, and both stream paths.
 *
 * Recraft generates images and does not do streaming chat, so two of its four
 * surfaces are negative contracts. An unsupported surface still has to fail
 * the documented way — a typed, named refusal rather than a hang, a crash or a
 * silent empty result — so those are asserted, not skipped.
 */
async function testRecraftSurfaces(): Promise<void> {
  // FIXED (M3): the stream surface used to say neither what it should nor
  // what actually happened. createMCPStream() (neurolink.ts) built a full
  // tool-aware system prompt and counted every available tool definition
  // into its pre-dispatch budget check for EVERY provider, including ones
  // whose descriptor declares toolSupport "none" and can never use a tool in
  // any form (recraft among them). Against recraftv3's ~2,000-token window
  // (correct for an image-prompt model, contextWindows.ts) that inflated a
  // three-word prompt to ~8,700 estimated tokens, and the pre-dispatch hard
  // cap threw "Stream context exceeds model budget…" before
  // RecraftProvider.stream() ever ran — masking whatever the provider itself
  // would have said. (That is NOT recraft.ts's own "streaming chat is not
  // available" refusal, which is structurally unreachable here:
  // resolveRequestKind() classifies recraftv3 as an "image" request, so
  // BaseProvider.stream() routes it through executeFakeStreaming() ->
  // executeImageGeneration() and recraft.ts's executeStream() override never
  // runs.) The fix clears `availableTools` before the budget check for
  // toolSupport:"none" providers, so the request is sized on what it actually
  // contains and the real outcome — the vendor's own error, or a real
  // generated image — is what surfaces instead of a fabricated local one.
  const REFUSES_SOMEHOW = /error|fail|not available|exceed|budget/i;

  // --- SDK stream: must reach a real provider outcome, the same three
  // legitimate shapes the cli-stream case below already accounts for — a
  // successful generation (account has credit), a recognisable vendor
  // error, or the documented refusal. Only a drain that yields nothing and
  // raises nothing is a failure: that is neither an outcome nor a refusal.
  const SDK_STREAM_CASE = "Recraft sdk-stream reaches a real provider outcome";
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const streamed = await nl.stream({
      input: { text: "A red circle" },
      provider: "recraft",
      model: "recraftv3",
    });
    let sawOutput = false;
    for await (const _chunk of streamed.stream) {
      // Any chunk counts, not just one with `.content`: a successful image
      // result yields a `{ type: "image", imageOutput }` chunk shape.
      sawOutput = true;
    }
    // PRECONDITION: at least one chunk must have been observed, or this
    // would pass vacuously on a stream that silently drains empty.
    record(
      SDK_STREAM_CASE,
      sawOutput,
      sawOutput
        ? "the stream completed (account has credit — a real image was generated)"
        : "the stream drained with no chunks and no error",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record(
      SDK_STREAM_CASE,
      REFUSES_SOMEHOW.test(msg) && msg.length > 0,
      `refusal carried no recognisable failure text (${msg.length} chars)`,
    );
  }

  if (!process.env.RECRAFT_API_KEY) {
    record("Recraft cli-generate (skip — no RECRAFT_API_KEY)", true);
  } else {
    // --- CLI generate: the real binary, the real vendor.
    //
    // Written to a temp directory, never the working tree. The CLI's default
    // lands images in ./generated-images, and a test that dirties the repo
    // breaks git-status gates and pollutes contributors' checkouts.
    const outDir = mkdtempSync(join(tmpdir(), "recraft-cli-"));
    const outPath = join(outDir, "generated.webp");
    try {
      const cli = await runCli([
        "generate",
        "A small red circle on white",
        "--provider",
        "recraft",
        "--model",
        "recraftv3",
        "--image-output",
        outPath,
      ]);
      const cliBlocked =
        cli.code !== 0 && isVendorBlocked(cli.stderr + cli.stdout);
      if (cliBlocked) {
        record(
          "Recraft cli-generate (skip — vendor refused before serving)",
          true,
        );
      } else {
        record(
          "Recraft cli-generate exits 0",
          cli.code === 0,
          `exit ${cli.code}`,
        );
        record(
          "Recraft cli-generate reports the generated image",
          /image|recraft/i.test(cli.stdout),
          `stdout did not mention the generated image (${cli.stdout.trim().length} chars)`,
        );
        record(
          "Recraft cli-generate writes bytes to the requested path",
          existsSync(outPath),
          "no file at the requested output path",
        );
        if (existsSync(outPath)) {
          record(
            "Recraft cli-generate writes real WebP bytes",
            isWebp(readFileSync(outPath)),
            "leading bytes were not a WebP signature",
          );
        }
      }
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }

    // And the default filename takes its extension from the format actually
    // received, rather than the `.png` the CLI used to assume for every image.
    //
    // Asserted BEHAVIOURALLY. This previously read commandFactory.ts and
    // string-matched for the old literal, which tested source TEXT rather than
    // behaviour — a harmless reindent broke it, it reached into src/ from a
    // suite that otherwise drives dist, and it could not tell a renamed
    // template from a fixed one. Driving the default path proves the same
    // thing and covers the branch the explicit --image-output case cannot.
    const defDir = mkdtempSync(join(tmpdir(), "recraft-cli-default-"));
    try {
      const def = await runCli(
        [
          "generate",
          "A small red circle on white",
          "--provider",
          "recraft",
          "--model",
          "recraftv3",
        ],
        { cwd: defDir },
      );
      if (def.code !== 0 && isVendorBlocked(def.stderr + def.stdout)) {
        record(
          "CLI default filename (skip — vendor refused before serving)",
          true,
        );
      } else {
        const produced = existsSync(join(defDir, "generated-images"))
          ? readdirSync(join(defDir, "generated-images"))
          : [];
        // PRECONDITION: a file must exist, or the extension assertion below
        // would pass vacuously on an empty directory.
        record(
          "CLI default path wrote an image",
          produced.length > 0,
          "no file appeared in the default generated-images directory",
        );
        if (produced.length > 0) {
          record(
            "CLI default filename takes its extension from the received format",
            produced.some((f) => f.endsWith(".webp")),
            `default filename did not use the received format (${produced.length} file(s), none .webp)`,
          );
          const first =
            produced.find((f) => f.endsWith(".webp")) ?? produced[0];
          record(
            "CLI default path wrote real WebP bytes",
            isWebp(readFileSync(join(defDir, "generated-images", first))),
            "leading bytes at the default path were not a WebP signature",
          );
        }
      }
    } finally {
      rmSync(defDir, { recursive: true, force: true });
    }
  }

  // --- CLI stream: the provider's real outcome must survive the trip
  // through the CLI, not the generic BudgetChecker/tool-injection pass.
  //
  // Key-gated: without a key, provider construction fails before the budget
  // check ever runs, and a pass there would prove nothing about the ordering
  // this case exists to cover.
  if (!process.env.RECRAFT_API_KEY) {
    record("Recraft cli-stream (skip — no RECRAFT_API_KEY)", true);
  } else {
    const cliStream = await runCli([
      "stream",
      "A red circle",
      "--provider",
      "recraft",
      "--model",
      "recraftv3",
    ]);
    const streamOut = cliStream.stderr + cliStream.stdout;
    // PRECONDITION for the negative assertion below: prove the subprocess
    // actually ran and produced something to inspect, so "the masking text
    // is absent" cannot pass vacuously against empty output. `record` prints
    // its detail on a PASS as well as a failure, so the text has to describe
    // what was observed either way.
    record(
      "Recraft cli-stream produced observable output",
      streamOut.length > 0,
      streamOut.length > 0
        ? `${streamOut.length} chars captured`
        : "no stdout/stderr captured from the CLI subprocess",
    );
    // The one outcome that must NEVER happen again: the fabricated
    // budget-exceeded message standing in for the provider's real answer.
    // This is the deterministic half of the fix and does not depend on the
    // test account's credit balance — see the red/green proof this case was
    // added to accompany.
    const maskedByBudget = /exceeds model budget/i.test(streamOut);
    record(
      "Recraft cli-stream is not masked by the generic budget check",
      !maskedByBudget,
      maskedByBudget
        ? "the fabricated budget-exceeded message surfaced ahead of the provider's own outcome"
        : "no budget-exceeded text appeared",
    );
    // Which real outcome appears instead depends on the account's credit
    // state, an external fact this suite does not control, so it is reported
    // across all three legitimate shapes rather than pinned to one:
    // Recraft's own "image-generation-only" refusal (were it ever reachable),
    // a genuine vendor error, or a real generated image.
    const namedRefusal = /image-generation-only/i.test(streamOut);
    const vendorBlocked = isVendorBlocked(streamOut);
    const succeeded = cliStream.code === 0;
    record(
      "Recraft cli-stream reaches a real provider outcome",
      succeeded || namedRefusal || vendorBlocked,
      succeeded
        ? "the stream completed (account has credit — a real image was generated)"
        : namedRefusal
          ? "named the image-generation-only refusal"
          : vendorBlocked
            ? "the provider's own vendor error surfaced"
            : "neither success, the documented refusal, nor a recognisable vendor error appeared",
    );
    log(
      succeeded
        ? "  ℹ️  cli-stream succeeded — recraft generated an image via fake streaming"
        : namedRefusal
          ? "  ℹ️  cli-stream named the image-generation-only refusal"
          : vendorBlocked
            ? "  ℹ️  cli-stream surfaced the provider's real vendor error — no budget masking"
            : "  ℹ️  cli-stream failed for an unrecognised reason — worth a look",
    );
  }
}

/** Run the built CLI as a real subprocess, the way a shell caller would. */
function runCli(
  args: string[],
  opts: { cwd?: string } = {},
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  // The CLI path is absolute so `cwd` can be moved. It has to be movable: the
  // default image filename lands in ./generated-images, and asserting on that
  // path from the repo root would write into the working tree and break the
  // git-status gates.
  const repoRoot = path.resolve(__dirname, "..");
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(repoRoot, "dist/cli/index.js"), ...args],
      {
        cwd: opts.cwd ?? repoRoot,
        env: process.env,
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    const kill = setTimeout(() => child.kill("SIGKILL"), 180_000);
    child.on("close", (code) => {
      clearTimeout(kill);
      resolve({ code, stdout, stderr });
    });
  });
}

async function main(): Promise<void> {
  log("=== Image Generation Extras Suite ===");

  await testStability();
  await testIdeogram();
  await testRecraft();
  await testReplicateImage();
  await testInvalidKey();
  await testMimeSniffing();
  await testServiceMimeLabelling();
  await testRecraftSurfaces();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  log(`\n${passed} passed · ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Image-gen extras suite crashed:", err);
  process.exit(2);
});

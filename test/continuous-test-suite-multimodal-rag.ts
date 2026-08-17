#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — multi-modal embeddings and RAG image ingestion.
 *
 * Covers the surface added by the multi-modal embedding work: the widened
 * `embed()` signature across the provider clients, Nova's per-request modality
 * rules, and the caption an ingested image carries into the vector store.
 *
 * Everything drives shipped entry points — `AIProviderFactory` from
 * `../dist/index.js` and `ImageLoader` from the `./rag` subpath's
 * `../dist/rag/index.js` — with nothing stubbed and no imports out of `src/`,
 * so no rule-15 exception is needed. The provider cases run on deliberately
 * fake AWS credentials because every rejection they assert happens while the
 * request body is being built, before anything is sent; a case that reached the
 * network would fail here rather than pass quietly, which is the point.
 *
 * NOT covered, deliberately, and worth knowing before adding to this file: the
 * `loadFromURL` branch of `ImageLoader`. Its redaction is the same helper the
 * path branch uses, but the branch itself cannot be reached offline — the SSRF
 * guard in `safeFetch` permits only HTTPS and refuses to resolve a private
 * address, so a local stand-in is rejected before any redaction runs. That is a
 * security property working correctly, not a gap to route around, and defeating
 * it for a test would be a worse trade than leaving the branch to the shared
 * helper that case 4 pins.
 *
 * Run: npx tsx test/continuous-test-suite-multimodal-rag.ts
 */

import { mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Multi-modal embeddings + RAG images");

const { AIProviderFactory } = await import("../dist/index.js");
const { ImageLoader } = await import("../dist/rag/index.js");

const NOVA_MODEL = "amazon.nova-2-multimodal-embeddings-v1:0";
const TITAN_TEXT_MODEL = "amazon.titan-embed-text-v2:0";

/** Smallest valid PNG: a 1x1 pixel. Enough for magic-byte detection. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const AWS_ENV_KEYS = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "AWS_REGION",
] as const;

/**
 * Install fake AWS credentials and return a restore function.
 *
 * Fake rather than absent: construction validates that credentials exist, and
 * these cases are about what `embed()` rejects, not about credential handling.
 * Fake values also guarantee that a case which regressed into making a real
 * call fails loudly instead of silently spending someone's Bedrock quota.
 */
function withFakeAwsEnv(): () => void {
  const saved = new Map<string, string | undefined>();
  for (const key of AWS_ENV_KEYS) {
    saved.set(key, process.env[key]);
  }
  process.env.AWS_ACCESS_KEY_ID = "test-fake-key-id";
  process.env.AWS_SECRET_ACCESS_KEY = "test-fake-secret";
  delete process.env.AWS_SESSION_TOKEN;
  process.env.AWS_REGION = "us-east-1";
  return () => {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

async function bedrockProvider() {
  return (await AIProviderFactory.createProvider("bedrock", NOVA_MODEL)) as {
    embed: (
      input: { image?: Buffer; text?: string; mimeType?: string },
      modelName?: string,
    ) => Promise<number[]>;
  };
}

/**
 * Run `embed` and classify the outcome.
 *
 * "any error" is NOT a usable result here, and that was found the hard way:
 * with the validation removed, the call simply carries on to AWS and fails on
 * the deliberately fake credentials — so a test asserting only that something
 * was thrown passes just as happily when the guard it exists to pin is gone.
 * The rejections under test are raised while the request body is built, so they
 * are the only outcome that can name the modality or format; a credential or
 * transport failure cannot. Distinguishing them is what makes these cases
 * non-vacuous.
 *
 * Reading `error.message` is deliberate and safe. The hazard documented in
 * CLAUDE.md is that an ASSERTION MESSAGE matching isExpectedProviderError() is
 * downgraded from FAIL to SKIP — it is about what gets reported, not about what
 * may be inspected. Nothing here reaches an assertion message.
 */
async function embedOutcome(
  input: { image?: Buffer; text?: string; mimeType?: string },
  modelName: string,
): Promise<"rejected-by-validation" | "resolved" | "other-error"> {
  const provider = await bedrockProvider();
  try {
    await provider.embed(input, modelName);
    return "resolved";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return /does not support/i.test(message)
      ? "rejected-by-validation"
      : "other-error";
  }
}

await test("a format Nova cannot name is rejected rather than relabelled", async () => {
  // The multi-modal RAG path accepts bmp, tiff and avif, none of which appear
  // in Nova's format map. The map's lookup used to fall back to "png", so a BMP
  // reached AWS with its bytes and its declared format disagreeing — no error,
  // and nothing the caller could observe. Rejection is the only outcome here
  // that is honest about what Nova supports.
  const restore = withFakeAwsEnv();
  try {
    const outcome = await embedOutcome(
      { image: TINY_PNG, mimeType: "image/bmp" },
      NOVA_MODEL,
    );
    assert(
      outcome === "rejected-by-validation",
      "an image format absent from the Nova map was not rejected during request building",
    );
  } finally {
    restore();
  }
});

await test("Nova rejects combined image+text instead of dropping one modality", async () => {
  // Nova takes exactly one modality per request. Silently dropping whichever
  // arrived second would embed something the caller did not ask for and give
  // back a vector that looks perfectly valid.
  const restore = withFakeAwsEnv();
  try {
    const outcome = await embedOutcome(
      { image: TINY_PNG, text: "a caption", mimeType: "image/png" },
      NOVA_MODEL,
    );
    assert(
      outcome === "rejected-by-validation",
      "a combined image+text request was not rejected despite Nova permitting one modality",
    );
  } finally {
    restore();
  }
});

await test("a text-only embedding model rejects an image rather than ignoring it", async () => {
  // The widened embed() signature means every provider now accepts an object
  // that MAY carry an image. A text-only model must refuse it — dropping the
  // image and embedding the empty text would return a real vector for content
  // that was never looked at, which is indistinguishable from success.
  const restore = withFakeAwsEnv();
  try {
    const outcome = await embedOutcome(
      { image: TINY_PNG, mimeType: "image/png" },
      TITAN_TEXT_MODEL,
    );
    assert(
      outcome === "rejected-by-validation",
      "a text-only embedding model did not reject an image input during request building",
    );
  } finally {
    restore();
  }
});

await test("an image caption never carries a query string into indexed text", async () => {
  // The caption is derived by taking the last slash-separated segment of the
  // source. On a presigned URL the signature lives in the query, and the query
  // is part of that final segment — so the naive derivation puts the credential
  // into text that gets embedded, BM25-indexed, persisted in the vector store
  // and read back into model context.
  //
  // Driven through a file path rather than a URL because the URL branch is
  // unreachable offline (see the header). The derivation is the same shared
  // helper either way, and `?` is a legal POSIX filename character, so this
  // exercises the real code on a real ImageLoader.load() call.
  const dir = mkdtempSync(join(tmpdir(), "neurolink-mmrag-"));
  // Dot-bearing on purpose. The caption also strips a trailing extension with
  // `/\.[^.]+$/`, and against a dot-FREE query that regex removes the whole
  // query as a side effect — so a token like "DEADBEEF" is scrubbed by accident
  // and pins nothing. A JWT has two internal dots, so the regex eats only the
  // last segment and the rest of the token survives into indexed text. An
  // earlier version of this case used a dot-free secret, passed against the
  // unfixed code, and asserted nothing at all.
  const secretHead = "eyJhbGciOi";
  const secret = `${secretHead}.eyJzdWIiOi.SflKxwRJSM`;
  const trickyName = `invoice-scan.png?X-Amz-Signature=${secret}`;
  try {
    const filePath = join(dir, trickyName);
    copyFileSync("test/fixtures/sample-screenshot.png", filePath);

    const doc = await new ImageLoader().load(filePath);

    // Assert on the token's LEADING segment, not the whole token. The
    // extension regex removes the final dot-segment either way, so the
    // complete token never appears verbatim and asserting on it would pass
    // against the unfixed code — the head is the part that actually survives
    // into the caption when the query is not stripped.
    //
    // Shape, not payload: never interpolate the caption itself into the
    // message, or a real failure is downgraded to a skip.
    assert(
      !doc.text.includes(secretHead),
      "the caption retained the query-string portion of the source",
    );
    assert(
      !doc.text.includes("?") && !doc.text.includes("="),
      "the caption retained query-string punctuation from the source",
    );
    assert(
      doc.text.includes("invoice scan"),
      "the caption lost the filename it is supposed to describe",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test("an ordinary image path still captions from its filename", async () => {
  // Guards the case above from being satisfied by a helper that returns
  // something empty or constant for every input.
  const dir = mkdtempSync(join(tmpdir(), "neurolink-mmrag-"));
  try {
    const filePath = join(dir, "quarterly_revenue-chart.png");
    copyFileSync("test/fixtures/sample-screenshot.png", filePath);

    const doc = await new ImageLoader().load(filePath);

    assert(
      doc.text.includes("quarterly revenue chart"),
      "the caption did not derive from the filename",
    );
    assert(
      doc.mimeType === "image/png",
      "the loaded image did not resolve to its actual type",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await runSuite();

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

import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer as createH2Server } from "node:http2";
import { assert, assertNotNull, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Multi-modal embeddings + RAG images");

const { AIProviderFactory } = await import("../dist/index.js");
const { ImageLoader, RAGPipeline, InMemoryVectorStore, prepareRAGTool } =
  await import("../dist/rag/index.js");

/** One entry of the search tool's `sources` array, as this suite reads it. */
type RagSearchSource = {
  source: string;
  hasImage?: boolean;
};

/**
 * Runtime-validating narrow for the prepared RAG tool's result.
 *
 * `execute()` is typed loosely, and an assertion would let a shape change
 * turn the negative assertion below vacuous — `sources` silently absent
 * reads the same as "no SVG was indexed". Validating the members this case
 * actually reads makes that a failure instead.
 */
function isRagSearchResult(
  value: unknown,
): value is { sources: RagSearchSource[] } {
  if (typeof value !== "object" || value === null || !("sources" in value)) {
    return false;
  }
  const { sources } = value;
  return (
    Array.isArray(sources) &&
    sources.every(
      (entry): entry is RagSearchSource =>
        typeof entry === "object" &&
        entry !== null &&
        "source" in entry &&
        typeof entry.source === "string",
    )
  );
}

const NOVA_MODEL = "amazon.nova-2-multimodal-embeddings-v1:0";
const TITAN_TEXT_MODEL = "amazon.titan-embed-text-v2:0";

/** Smallest valid PNG: a 1x1 pixel. Enough for magic-byte detection. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** SVG documents whose root appears behind valid XML prologue forms. */
const DISGUISED_SVG_FIXTURES = [
  {
    filename: "plain.png",
    content: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  },
  {
    filename: "bom.jpg",
    content: '\uFEFF  \n<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  },
  {
    filename: "comment.webp",
    content:
      '<!-- a legal comment before the root -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  },
  {
    filename: "doctype.png",
    content:
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  },
  {
    filename: "declaration.jpg",
    content:
      '<?xml version="1.0"?>\n<!-- comment -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  },
  {
    // A real SVG root sitting behind more prologue than any bounded scan
    // window would cover. A scanner that gives up at its window boundary and
    // answers "not SVG" hands back the bypass this guard exists to close:
    // prepend filler, exhaust the window, arrive as raster. Must still be
    // rejected.
    filename: "oversized-prologue.png",
    content: `<!-- ${"x".repeat(6000)} -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>`,
  },
  {
    // A prologue that never terminates, longer than any scan window. Whether
    // an SVG root follows is unknowable without reading the whole buffer, so
    // the only safe answer is to treat it as SVG and skip it.
    filename: "unterminated-doctype.jpg",
    content: `<!doctype ${"A".repeat(6000)}`,
  },
] as const;

function writeDisguisedSvgFixtures(dir: string): string[] {
  return DISGUISED_SVG_FIXTURES.map(({ filename, content }) => {
    const path = join(dir, filename);
    writeFileSync(path, content);
    return path;
  });
}

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

/**
 * Minimal local stand-in for the Bedrock Runtime InvokeModel endpoint that
 * `embed()` calls. `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` redirects the real SDK
 * client here — see `helpers/bedrockLocalEndpoint.ts` for the fuller
 * Converse/ConverseStream variant this mirrors. The SDK's default request
 * handler for this client is `NodeHttp2Handler` for every operation,
 * including the non-streaming InvokeModel used by embeddings, so a plain
 * `http.Server` never completes the handshake and this must speak h2. No
 * credentials are validated: SigV4 signs happily against placeholder keys and
 * nothing here checks the signature.
 */
async function startLocalBedrockEmbed(): Promise<{
  endpoint: string;
  invokeCount: () => number;
  close: () => Promise<void>;
}> {
  let invokeCount = 0;
  const server = createH2Server();
  server.on("request", (req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      invokeCount += 1;
      res.writeHead(200, { "content-type": "application/json" });
      // Shape Bedrock's Titan (non-Nova) embed response takes: a flat
      // `embedding` array. Fixed and fake — nothing here reads the request
      // body, so it says nothing about what was actually embedded; the
      // request COUNT is the signal this test relies on.
      res.end(JSON.stringify({ embedding: [0.1, 0.2, 0.3, 0.4] }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    endpoint: `http://127.0.0.1:${port}`,
    invokeCount: () => invokeCount,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

await test("RAGPipeline.ingestImages skips an .svg source but still ingests a PNG from the same call", async () => {
  // IMAGE_EXTENSIONS' "sanitized markup" guarantee is scoped to the
  // processor path (SvgProcessor) — ingestImages() has no processor in its
  // path at all. Without a skip, generateMultiModalEmbedding would base64
  // raw SVG markup straight into this raster embed call, exactly the gap
  // ragIntegration.ts already closed on its own entry point.
  //
  // Two sources in one call, not one: an SVG-only call passing because
  // NOTHING was ingested would prove nothing. The PNG is the precondition
  // that the harness actually exercised the ingest path at all.
  const restoreAws = withFakeAwsEnv();
  const local = await startLocalBedrockEmbed();
  const previousEndpoint = process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME;
  process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = local.endpoint;
  // AmazonBedrockProvider#embed() ignores the modelName the provider was
  // constructed with when generateMultiModalEmbedding() calls it — it falls
  // back to BEDROCK_EMBEDDING_MODEL / AWS_EMBEDDING_MODEL, defaulting to the
  // text-only Titan model. Without this, the client-side
  // `embedInput.image && !isMultiModalModel` guard rejects the PNG before
  // any request is built, independent of the SVG-skip fix under test.
  const previousEmbeddingModel = process.env.BEDROCK_EMBEDDING_MODEL;
  process.env.BEDROCK_EMBEDDING_MODEL = "amazon.titan-embed-image-v1";
  const dir = mkdtempSync(join(tmpdir(), "neurolink-mmrag-svg-"));
  try {
    const pngPath = join(dir, "photo.png");
    copyFileSync("test/fixtures/sample-screenshot.png", pngPath);
    const svgPath = join(dir, "icon.svg");
    writeFileSync(
      svgPath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"></svg>',
    );

    const pipeline = new RAGPipeline({
      vectorStore: new InMemoryVectorStore(),
      embeddingModel: {
        provider: "bedrock",
        modelName: "amazon.titan-embed-text-v2:0",
      },
      multiModal: {
        enabled: true,
        embeddingModel: {
          provider: "bedrock",
          modelName: "amazon.titan-embed-image-v1",
          modality: "multimodal",
        },
        imageTextStrategy: "filename",
      },
    });

    const result = await pipeline.ingestImages([svgPath, pngPath]);

    // Precondition: the non-SVG source in the same call really was
    // ingested. If this were not true, the SVG assertion below would pass
    // for the wrong reason — everything in the call failing, not just SVG
    // being skipped.
    assert(
      result.imagesProcessed === 1 && result.chunksCreated === 1,
      "ingestImages did not report exactly the non-SVG source as processed",
    );
    assert(
      pipeline.getMultiModalStats().totalImages === 1,
      "the pipeline's own image count disagrees with ingestImages' return value",
    );
    // The strongest evidence the SVG was skipped rather than merely
    // discarded downstream: the embed endpoint was reached exactly once.
    // Without the fix this fake endpoint accepts SVG bytes too (it does
    // not validate format), so an unfixed pipeline calls it twice.
    assert(
      local.invokeCount() === 1,
      "the embedding endpoint was not called exactly once for this two-source batch",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    await local.close();
    if (previousEndpoint === undefined) {
      delete process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME;
    } else {
      process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = previousEndpoint;
    }
    if (previousEmbeddingModel === undefined) {
      delete process.env.BEDROCK_EMBEDDING_MODEL;
    } else {
      process.env.BEDROCK_EMBEDDING_MODEL = previousEmbeddingModel;
    }
    restoreAws();
  }
});

await test("RAGPipeline.ingestImages skips SVG identified only by its bytes, not its name", async () => {
  // The case above names the file `.svg`, so the extension check catches it
  // before anything is loaded. That check only sees the NAME. ImageLoader
  // falls back to detecting the type from the bytes whenever the name does
  // not supply one — `detectImageType` returns `image/svg+xml` for a buffer
  // starting `<svg`/`<?xm` — so a source with no extension carries SVG markup
  // straight past it and into the raster embed call.
  //
  // The reported instance of this is a URL like `https://example.com/logo`
  // served as `image/svg+xml`. That exact shape is not reachable from a test:
  // as the header notes, `safeFetch` permits only HTTPS and refuses to
  // resolve a private address, so no local stand-in can be reached. The
  // extension-less LOCAL path is the same defect through the same fallback —
  // `loadFromPath` looks up an empty extension in EXTENSION_MIME_MAP, misses,
  // and calls the identical `detectImageType` — and it pins the same guard,
  // which reads the resolved `mimeType` and so does not care which branch
  // produced it.
  //
  // Two sources again, for the same reason: the PNG is the precondition that
  // the ingest path ran at all.
  const restoreAws = withFakeAwsEnv();
  const local = await startLocalBedrockEmbed();
  const previousEndpoint = process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME;
  process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = local.endpoint;
  const previousEmbeddingModel = process.env.BEDROCK_EMBEDDING_MODEL;
  process.env.BEDROCK_EMBEDDING_MODEL = "amazon.titan-embed-image-v1";
  const dir = mkdtempSync(join(tmpdir(), "neurolink-mmrag-svgbytes-"));
  try {
    const pngPath = join(dir, "photo.png");
    copyFileSync("test/fixtures/sample-screenshot.png", pngPath);
    // No extension at all — the shape the name-based check cannot see.
    const svgPath = join(dir, "logo");
    writeFileSync(
      svgPath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"></svg>',
    );

    const pipeline = new RAGPipeline({
      vectorStore: new InMemoryVectorStore(),
      embeddingModel: {
        provider: "bedrock",
        modelName: "amazon.titan-embed-text-v2:0",
      },
      multiModal: {
        enabled: true,
        embeddingModel: {
          provider: "bedrock",
          modelName: "amazon.titan-embed-image-v1",
          modality: "multimodal",
        },
        // Left unset deliberately: `supportedFormats` is optional, and an
        // absent list is the default. A guard that only holds when a caller
        // configured one would not close this.
        imageTextStrategy: "filename",
      },
    });

    const result = await pipeline.ingestImages([svgPath, pngPath]);

    // Precondition, asserted before the negative claim: the PNG in the same
    // call really was ingested. Without this, "the SVG was not embedded"
    // would also be satisfied by the whole batch failing.
    assert(
      result.imagesProcessed === 1 && result.chunksCreated === 1,
      "ingestImages did not report exactly the non-SVG source as processed",
    );
    assert(
      pipeline.getMultiModalStats().totalImages === 1,
      "the pipeline's own image count disagrees with ingestImages' return value",
    );
    // The negative claim itself. The fake endpoint does not inspect or
    // validate what it is sent, so nothing downstream of the guard would
    // reject SVG bytes on its behalf: an unguarded pipeline reaches it twice.
    assert(
      local.invokeCount() === 1,
      "the embedding endpoint was not called exactly once for this two-source batch",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    await local.close();
    if (previousEndpoint === undefined) {
      delete process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME;
    } else {
      process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = previousEndpoint;
    }
    if (previousEmbeddingModel === undefined) {
      delete process.env.BEDROCK_EMBEDDING_MODEL;
    } else {
      process.env.BEDROCK_EMBEDDING_MODEL = previousEmbeddingModel;
    }
    restoreAws();
  }
});

await test("RAGPipeline rejects SVG bytes hidden behind raster names and XML prefixes", async () => {
  // loadFromPath trusts the recognized extension before inspecting bytes, so
  // every fixture below arrives as image/png even though its contents are SVG.
  // Content validation must independently recognize the SVG root after a BOM,
  // whitespace, an XML declaration, comments, or a doctype. A real PNG in the
  // same call proves the path ran and the provider remained usable.
  const restoreAws = withFakeAwsEnv();
  const local = await startLocalBedrockEmbed();
  const previousEndpoint = process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME;
  process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = local.endpoint;
  const previousEmbeddingModel = process.env.BEDROCK_EMBEDDING_MODEL;
  process.env.BEDROCK_EMBEDDING_MODEL = "amazon.titan-embed-image-v1";
  const dir = mkdtempSync(join(tmpdir(), "neurolink-mmrag-svg-prefixes-"));
  try {
    const pngPath = join(dir, "real.png");
    copyFileSync("test/fixtures/sample-screenshot.png", pngPath);
    const disguisedSvgPaths = writeDisguisedSvgFixtures(dir);

    const pipeline = new RAGPipeline({
      vectorStore: new InMemoryVectorStore(),
      embeddingModel: {
        provider: "bedrock",
        modelName: "amazon.titan-embed-text-v2:0",
      },
      multiModal: {
        enabled: true,
        embeddingModel: {
          provider: "bedrock",
          modelName: "amazon.titan-embed-image-v1",
          modality: "multimodal",
        },
        imageTextStrategy: "filename",
      },
    });

    const result = await pipeline.ingestImages([...disguisedSvgPaths, pngPath]);

    assert(
      result.imagesProcessed === 1 && result.chunksCreated === 1,
      "ingestImages did not report exactly the real raster source as processed",
    );
    assert(
      pipeline.getMultiModalStats().totalImages === 1,
      "the pipeline retained a non-raster source",
    );
    assert(
      local.invokeCount() === 1,
      "the embedding endpoint was not called exactly once for the raster source",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    await local.close();
    if (previousEndpoint === undefined) {
      delete process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME;
    } else {
      process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = previousEndpoint;
    }
    if (previousEmbeddingModel === undefined) {
      delete process.env.BEDROCK_EMBEDDING_MODEL;
    } else {
      process.env.BEDROCK_EMBEDDING_MODEL = previousEmbeddingModel;
    }
    restoreAws();
  }
});

await test("prepareRAGTool rejects SVG bytes hidden behind raster names", async () => {
  // prepareRAGTool owns a separate ImageLoader path, so the RAGPipeline test
  // above cannot prove this entry point checks the bytes independently of the
  // extension-derived MIME type.
  const dir = mkdtempSync(join(tmpdir(), "neurolink-ragint-svg-prefixes-"));
  try {
    const pngPath = join(dir, "real.png");
    copyFileSync("test/fixtures/sample-screenshot.png", pngPath);
    const disguisedSvgPaths = writeDisguisedSvgFixtures(dir);

    const prepared = await prepareRAGTool({
      files: [...disguisedSvgPaths, pngPath],
      topK: 10,
    });

    assert(
      prepared.chunksIndexed === 1,
      "prepareRAGTool did not index exactly the real raster source",
    );
    assert(
      prepared.filesLoaded === 1,
      "prepareRAGTool did not report exactly the indexed raster source as loaded",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test("prepareRAGTool skips an SVG image source but still indexes a raster one", async () => {
  // A SECOND, independent image-ingestion path. prepareRAGTool does not call
  // RAGPipeline.ingestImages — it constructs its own ImageLoader and builds
  // its chunks inline — so the guard in ingestImages does not cover it, and
  // the two cases above would all pass with this path wide open.
  //
  // The vector is `.svgz`. Both of this path's early-outs compare the
  // extension to `".svg"` exactly, and `extname("logo.svgz")` is `".svgz"`,
  // so neither fires; `.svgz` IS in IMAGE_EXTENSIONS, so the source is
  // classified as an image; and EXTENSION_MIME_MAP resolves it to
  // image/svg+xml. It reaches the index as a `hasImage: true` chunk. The same
  // guard also covers the URL form of this — loadFromURL ignores the
  // extension and sniffs the bytes — which stays untestable offline for the
  // safeFetch reason in the header, so this case pins the guard and the URL
  // form rides on the same line of code.
  //
  // No credentials: with no embedding provider configured, prepareRAGTool
  // indexes and queries through its deterministic hash embedding, so this
  // runs fully offline.
  const dir = mkdtempSync(join(tmpdir(), "neurolink-ragint-svgz-"));
  try {
    const pngPath = join(dir, "photo.png");
    copyFileSync("test/fixtures/sample-screenshot.png", pngPath);
    const svgzPath = join(dir, "logo.svgz");
    writeFileSync(
      svgzPath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"></svg>',
    );

    const prepared = await prepareRAGTool({
      files: [svgzPath, pngPath],
      topK: 10,
    });

    assert(
      prepared.chunksIndexed === 1,
      "prepareRAGTool did not index exactly the non-SVG source",
    );
    assert(
      prepared.filesLoaded === 1,
      "prepareRAGTool counted a skipped SVG source as loaded",
    );

    const execute = prepared.tool.execute;
    assertNotNull(execute, "the prepared RAG tool exposes no execute()");
    const searched: unknown = await execute(
      { query: "logo photo image" },
      { toolCallId: "svg-guard-probe", messages: [] },
    );
    // Thrown rather than asserted, because `assert` does not narrow: the
    // negative assertion below has to run against a `sources` the compiler
    // knows is an array, or an absent field would read the same as "no SVG
    // was indexed".
    if (!isRagSearchResult(searched)) {
      throw new Error("the prepared tool returned an unexpected result shape");
    }
    const { sources } = searched;
    // Precondition, asserted before the negative claim: the raster image in
    // the same call really did reach the index as an image chunk. Without
    // it, "no SVG was indexed" is also satisfied by an empty index — and an
    // empty index is a state this path can reach on its own.
    assert(
      sources.length === 1,
      "the prepared tool did not return exactly one indexed source",
    );
    assert(
      sources[0].hasImage === true && sources[0].source.endsWith("photo.png"),
      "the one indexed source is not the raster image",
    );
    // The negative claim.
    assert(
      !sources.some((entry) => entry.source.endsWith(".svgz")),
      "an SVG source reached the RAG index",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await runSuite();

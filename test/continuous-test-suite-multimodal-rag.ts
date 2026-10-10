#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — multi-modal embeddings and RAG image ingestion.
 *
 * Covers the surface added by the multi-modal embedding work: the widened
 * `embed()` signature across the provider clients, Nova's per-request modality
 * rules, and the caption an ingested image carries into the vector store.
 *
 * Everything drives shipped entry points — `AIProviderFactory` and
 * `SemanticChunker` from `../dist/index.js`, and `ImageLoader` from the
 * `./rag` subpath's `../dist/rag/index.js` — with nothing stubbed and no
 * imports out of `src/`,
 * so no rule-15 exception is needed. The provider cases run on deliberately
 * fake AWS credentials because every rejection they assert happens while the
 * request body is being built, before anything is sent; a case that reached the
 * network would fail here rather than pass quietly, which is the point.
 *
 * The last section is the exception: it sends InvokeModel requests to a local
 * stand-in, reached through `AWS_ENDPOINT_URL_BEDROCK_RUNTIME`, and pins what
 * `embed()` and `embedMany()` do with an answer that carries no embedding or an
 * empty one (the call rejects, and `embedMany` names the text's index).
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
import { createServer as createHttpServer } from "node:http";
import { createServer as createH2Server } from "node:http2";
import { assert, assertNotNull, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite(
  "Multi-modal embeddings + RAG images",
);

const { AIProviderFactory } = await import("../dist/index.js");
const { ImageLoader, RAGPipeline, InMemoryVectorStore, prepareRAGTool } =
  await import("../dist/rag/index.js");

/** One entry of the search tool's `sources` array, as this suite reads it. */
type RagSearchSource = {
  source: string;
  hasImage?: boolean;
  score?: number;
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
    embedMany: (texts: string[], modelName?: string) => Promise<number[][]>;
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

/** The `inputText` a Titan text request carries, or "" when the body has none. */
function titanInputText(body: Buffer): string {
  try {
    const parsed = JSON.parse(body.toString("utf8")) as { inputText?: unknown };
    return typeof parsed.inputText === "string" ? parsed.inputText : "";
  } catch {
    return "";
  }
}

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
 *
 * By default every request gets the same fixed vector. A case that needs the
 * answer to depend on the text passes `answer`, which receives the request's
 * `inputText` and returns the whole response body.
 */
async function startLocalBedrockEmbed(
  answer?: (inputText: string) => unknown,
): Promise<{
  endpoint: string;
  invokeCount: () => number;
  failFromNowOn: () => void;
  close: () => Promise<void>;
}> {
  let invokeCount = 0;
  let failing = false;
  const server = createH2Server();
  server.on("request", (req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      invokeCount += 1;
      if (failing) {
        // 400, not 5xx: the SDK retries 5xx with backoff, and a ValidationException
        // is a terminal error the case can observe straight away.
        res.writeHead(400, {
          "content-type": "application/json",
          "x-amzn-errortype": "ValidationException",
        });
        res.end(JSON.stringify({ message: "embedding backend unavailable" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      // Shape Bedrock's Titan (non-Nova) embed response takes: a flat
      // `embedding` array. Fixed and fake unless a case passes `answer` —
      // otherwise nothing here reads the request body, so it says nothing
      // about what was actually embedded; the request COUNT is the signal
      // those cases rely on.
      res.end(
        JSON.stringify(
          answer
            ? answer(titanInputText(Buffer.concat(chunks)))
            : { embedding: [0.1, 0.2, 0.3, 0.4] },
        ),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    endpoint: `http://127.0.0.1:${port}`,
    invokeCount: () => invokeCount,
    failFromNowOn: () => {
      failing = true;
    },
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

await test("prepareRAGTool fails the search when the query embedding fails instead of querying a provider-embedded index with a hash vector", async () => {
  // Index and query have to share one embedding space. When the index was built
  // from provider vectors and the provider then fails for the QUERY alone, the
  // old path swapped in a 128-dimension hash vector. cosineSimilarity returns 0
  // on a length mismatch, so every chunk scored 0 and the tool answered with
  // whichever chunks sorted first, as if they were relevant. An error is the
  // honest result, and the one the model can act on.
  const restoreAws = withFakeAwsEnv();
  const local = await startLocalBedrockEmbed();
  const previousEndpoint = process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME;
  process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = local.endpoint;
  const dir = mkdtempSync(join(tmpdir(), "neurolink-ragint-query-embed-"));
  try {
    const alphaPath = join(dir, "alpha.md");
    const betaPath = join(dir, "beta.md");
    writeFileSync(alphaPath, "# Alpha\n\nAlpha covers invoices and billing.\n");
    writeFileSync(betaPath, "# Beta\n\nBeta covers shipping and returns.\n");

    const prepared = await prepareRAGTool({
      files: [alphaPath, betaPath],
      embeddingProvider: "bedrock",
      embeddingModel: TITAN_TEXT_MODEL,
      topK: 5,
    });

    // Precondition: the index really was built from provider vectors. A silent
    // fall back to the hash at index time makes no provider calls at all, and
    // the failure injected below would then never be reached.
    assert(
      prepared.chunksIndexed > 0 &&
        local.invokeCount() === prepared.chunksIndexed,
      "the index was not built from one provider embedding call per chunk",
    );

    const execute = prepared.tool.execute;
    assertNotNull(execute, "the prepared RAG tool exposes no execute()");

    // Control: with the provider healthy the query is embedded through it and
    // scores against the provider-space index. Without this, the failing case
    // below could be rejecting for a reason unrelated to the query embedding.
    const healthy: unknown = await execute(
      { query: "invoices" },
      { toolCallId: "query-embed-healthy", messages: [] },
    );
    if (!isRagSearchResult(healthy)) {
      throw new Error("the prepared tool returned an unexpected result shape");
    }
    assert(
      healthy.sources.length === prepared.chunksIndexed &&
        healthy.sources.every(
          (entry) => typeof entry.score === "number" && entry.score > 0.99,
        ),
      "a healthy query was not scored in the index's embedding space",
    );
    assert(
      local.invokeCount() === prepared.chunksIndexed + 1,
      "the healthy query did not embed through the provider exactly once",
    );

    local.failFromNowOn();
    const callsBefore = local.invokeCount();
    let outcome: "rejected" | "resolved" = "resolved";
    try {
      await execute(
        { query: "invoices" },
        { toolCallId: "query-embed-failing", messages: [] },
      );
    } catch {
      outcome = "rejected";
    }

    // The failing call must have reached the provider, or the rejection is not
    // evidence about the query embedding at all.
    assert(
      local.invokeCount() === callsBefore + 1,
      "the failing query did not reach the embedding endpoint exactly once",
    );
    assert(
      outcome === "rejected",
      "a failed query embedding still produced search results from a mismatched embedding space",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    await local.close();
    if (previousEndpoint === undefined) {
      delete process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME;
    } else {
      process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = previousEndpoint;
    }
    restoreAws();
  }
});

section("Bedrock embeddings that come back without values");

/**
 * Runs `run` against the real Bedrock SDK client pointed at the local
 * InvokeModel stand-in, whose answer depends on the text it was asked about.
 */
async function withBedrockEmbeddingAnswers<T>(
  answer: (inputText: string) => unknown,
  run: () => Promise<T>,
): Promise<T> {
  const restoreAws = withFakeAwsEnv();
  const local = await startLocalBedrockEmbed(answer);
  const previousEndpoint = process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME;
  process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = local.endpoint;
  try {
    return await run();
  } finally {
    await local.close();
    if (previousEndpoint === undefined) {
      delete process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME;
    } else {
      process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = previousEndpoint;
    }
    restoreAws();
  }
}

/**
 * One vector per text, its first character's code as the only value, except
 * that `text` gets an embedding with no `embedding` field, or an empty one.
 */
function titanAnswerWithout(
  text: string,
  as: "missing" | "empty",
): (inputText: string) => unknown {
  return (inputText) => {
    if (inputText !== text) {
      return { embedding: [inputText.charCodeAt(0)] };
    }
    return as === "empty" ? { embedding: [] } : {};
  };
}

async function settleEmbedding<T>(
  run: () => Promise<T>,
): Promise<{ value: T | undefined; message: string | undefined }> {
  try {
    return { value: await run(), message: undefined };
  } catch (error) {
    return {
      value: undefined,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

// The two controls aim the stand-in's fault at a text no case sends, so every
// answer is healthy and they go through the same code as the rejection cases.
await test("Bedrock embedMany returns one vector per text, in order", async () => {
  await withBedrockEmbeddingAnswers(
    titanAnswerWithout("zzz", "missing"),
    async () => {
      const provider = await bedrockProvider();
      const { value } = await settleEmbedding(() =>
        provider.embedMany(["a", "b", "c"], TITAN_TEXT_MODEL),
      );
      assert(
        value !== undefined && value.map((v) => v[0]).join(",") === "97,98,99",
        "Bedrock embedMany did not return one vector per text, in order",
      );
    },
  );
});

await test("Bedrock embed returns the vector for a healthy embedding", async () => {
  await withBedrockEmbeddingAnswers(
    titanAnswerWithout("zzz", "missing"),
    async () => {
      const provider = await bedrockProvider();
      const { value } = await settleEmbedding(() =>
        provider.embed({ text: "a" }, TITAN_TEXT_MODEL),
      );
      assert(
        value !== undefined && value.length === 1 && value[0] === 97,
        "Bedrock embed did not return the vector for a healthy embedding",
      );
    },
  );
});

for (const shape of ["missing", "empty"] as const) {
  await test(`Bedrock embedMany rejects a ${shape} embedding and names its index`, async () => {
    await withBedrockEmbeddingAnswers(
      titanAnswerWithout("b", shape),
      async () => {
        const provider = await bedrockProvider();
        const { value, message } = await settleEmbedding(() =>
          provider.embedMany(["a", "b", "c"], TITAN_TEXT_MODEL),
        );
        assert(
          value === undefined,
          "Bedrock embedMany returned vectors although one embedding had no values",
        );
        assert(
          message !== undefined,
          "Bedrock embedMany did not reject an embedding without values",
        );
        assert(
          /\bindex 1\b/.test(message ?? ""),
          "the rejection did not name the index of the embedding without values",
        );
        assert(
          (message ?? "").includes("bedrock"),
          "the rejection did not name the provider",
        );
      },
    );
  });
}

await test("Bedrock embedMany keeps the real index in the rejection for an index that looks like a status code", async () => {
  await withBedrockEmbeddingAnswers(
    titanAnswerWithout("t429", "empty"),
    async () => {
      const provider = await bedrockProvider();
      const texts = Array.from({ length: 430 }, (_, i) => `t${i}`);
      const { value, message } = await settleEmbedding(() =>
        provider.embedMany(texts, TITAN_TEXT_MODEL),
      );
      assert(
        value === undefined && message !== undefined,
        "Bedrock embedMany did not reject an embedding without values in a large batch",
      );
      assert(
        /\bindex 429\b/.test(message ?? ""),
        "the rejection lost the index when it resembled a status code",
      );
      assert(
        !/rate limit|throttl/i.test(message ?? ""),
        "the rejection was reworded as a rate-limit error",
      );
    },
  );
});

await test("Bedrock embed rejects an empty embedding", async () => {
  await withBedrockEmbeddingAnswers(
    titanAnswerWithout("b", "empty"),
    async () => {
      const provider = await bedrockProvider();
      const { value, message } = await settleEmbedding(() =>
        provider.embed({ text: "b" }, TITAN_TEXT_MODEL),
      );
      assert(
        value === undefined,
        "Bedrock embed returned a vector although the embedding had no values",
      );
      assert(
        message !== undefined,
        "Bedrock embed did not reject an embedding without values",
      );
    },
  );
});

// Bedrock embed already refused an answer with no embedding field before this
// case was written, so it pins that behaviour rather than proves a change.
await test("Bedrock embed rejects an answer with no embedding", async () => {
  await withBedrockEmbeddingAnswers(
    titanAnswerWithout("b", "missing"),
    async () => {
      const provider = await bedrockProvider();
      const { value, message } = await settleEmbedding(() =>
        provider.embed({ text: "b" }, TITAN_TEXT_MODEL),
      );
      assert(
        value === undefined && message !== undefined,
        "Bedrock embed did not reject an answer with no embedding",
      );
    },
  );
});

/**
 * A local stand-in for Voyage's `/embeddings` route. Each paragraph names its
 * topic in its first word, and the vector is that topic's axis, so two
 * paragraphs about the same topic score 1 and a change of topic scores 0. A
 * paragraph whose text holds `failWhen` is answered with a 400, and one that
 * holds `shortWhen` with a vector one dimension short.
 */
async function startLocalVoyageEmbed(): Promise<{
  baseURL: string;
  requests: () => number;
  set: (mode: { failWhen?: string; shortWhen?: string }) => void;
  close: () => Promise<void>;
}> {
  let requests = 0;
  let mode: { failWhen?: string; shortWhen?: string } = {};
  const axes = ["billing", "shipping", "returns", "support"];
  const server = createHttpServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      requests++;
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        input: string[];
      };
      const text = body.input[0] ?? "";
      if (mode.failWhen && text.includes(mode.failWhen)) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ detail: "input rejected by the stand-in" }));
        return;
      }
      const topic = Math.max(0, axes.indexOf(text.split(/\s/)[0] ?? ""));
      const vector = axes.map((_, i) => (i === topic ? 1 : 0));
      const embedding =
        mode.shortWhen && text.includes(mode.shortWhen)
          ? vector.slice(1)
          : vector;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          object: "list",
          model: "voyage-3.5",
          data: [{ object: "embedding", index: 0, embedding }],
          usage: { total_tokens: 1 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("the local embedding stand-in has no port");
  }
  return {
    baseURL: `http://127.0.0.1:${address.port}`,
    requests: () => requests,
    set: (next) => {
      mode = next;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

await test("the semantic chunker falls back to a marked size split when a segment cannot be embedded, instead of inventing a vector", async () => {
  // Three paragraphs, the first two on one topic: a semantic split puts a
  // boundary only before the third. The chunker used to replace a failed
  // segment's embedding with a 1536-dimension zero vector and a vector of
  // another dimension with nothing at all; cosine similarity against either
  // is 0, so every such segment became a boundary and the result still looked
  // like semantic chunking. Every chunk of the size split says so instead.
  const filler =
    "This paragraph carries enough words to stand as its own segment for the chunker under test.";
  const text = [
    `billing first. ${filler}`,
    `billing second. ${filler}`,
    `shipping third. ${filler}`,
  ].join("\n\n");
  const local = await startLocalVoyageEmbed();
  const saved = {
    key: process.env.VOYAGE_API_KEY,
    base: process.env.VOYAGE_BASE_URL,
  };
  process.env.VOYAGE_API_KEY = "test-fake-voyage-credential";
  process.env.VOYAGE_BASE_URL = local.baseURL;
  try {
    const { ProviderRegistry, SemanticChunker } =
      await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();
    const chunk = () =>
      new SemanticChunker().chunk(text, {
        provider: "voyage",
        modelName: "voyage-3.5",
      });
    const isFallback = (c: { metadata: { custom?: unknown } }): boolean =>
      (c.metadata.custom as { fallbackChunking?: unknown } | undefined)
        ?.fallbackChunking === true;

    // Control: with every segment embedded the split is semantic, so a
    // fallback seen below is the injected failure, not a broken setup.
    const healthy = await chunk();
    assert(
      local.requests() === 3,
      "the control did not embed each of the three segments once",
    );
    assert(
      healthy.length === 2 && !healthy.some(isFallback),
      "with every segment embedded the split was not the semantic one",
    );

    for (const [label, mode] of [
      ["a failed embedding", { failWhen: "second" }],
      ["an embedding of another dimension", { shortWhen: "second" }],
    ] as const) {
      local.set(mode);
      const before = local.requests();
      const chunks = await chunk();
      assert(
        local.requests() > before,
        `${label}: the chunker never reached the embedding endpoint`,
      );
      assert(
        chunks.length > 0 && chunks.every(isFallback),
        `${label}: the chunks were not marked as a fallback size split`,
      );
      assert(
        chunks.map((c) => c.text).join("\n\n") === text,
        `${label}: the fallback split did not keep the whole document`,
      );
    }
  } finally {
    await local.close();
    for (const [name, value] of [
      ["VOYAGE_API_KEY", saved.key],
      ["VOYAGE_BASE_URL", saved.base],
    ] as const) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
});

await runSuite();

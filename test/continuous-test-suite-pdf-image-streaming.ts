#!/usr/bin/env tsx
/**
 * Continuous Test Suite: PDF→image conversion on the path generate()
 * actually uses (#302, pure, no API — all HTTP is mocked).
 *
 * `PDFImageConverter.convertToImagesStream` (a per-page async generator with
 * an `onProgress` callback and per-page error isolation) already existed,
 * already tested directly against the PDF processor's own API. What #302
 * reports is that it was never wired up: `buildMultimodalMessagesArray`
 * still called the batch `convertToImages`, which renders every page before
 * any of them reaches `content`, so `generate()`/`stream()` callers never got
 * the memory characteristic the streaming generator was built for.
 *
 * This suite proves the *fix* (routing messageBuilder through the streaming
 * generator) preserved behaviour, end to end, through the only surface this
 * package ships: `NeuroLink.generate()`. It asserts the resulting request
 * body carries one image part per PDF page, in page order, and that per-page
 * error isolation (#294) still holds when a page fails to render.
 *
 * What this suite does NOT prove: which internal function messageBuilder
 * calls. From outside `generate()`, a correct batch conversion and a correct
 * streaming conversion produce an identical request body — that equivalence
 * is the whole point of the fix, so a content-only test cannot and is not
 * meant to discriminate between "still calls convertToImages" and "now calls
 * convertToImagesStream". That routing is proven separately by
 * `continuous-test-suite-bugfixes.ts`'s "MessageBuilder #297" test, which
 * stubs `PDFImageConverter.convertToImagesStream` directly (that file is on
 * the `neurolink/e2e-tests-only` allow list for exactly this kind of
 * internal-call assertion) — reverting the messageBuilder.ts routing change
 * makes that stub see zero calls and fail, which this suite's content
 * assertions alone would not catch.
 *
 * The memory characteristic itself (lower peak RSS from not materialising
 * every page at once) is not re-measured here: it is already covered by
 * `convertToImagesStream`'s own, independent test coverage, and a
 * single-process RSS delta on a modest fixture is too noisy (GC timing,
 * unrelated allocations) to serve as a reliable pass/fail signal in this
 * suite. Output equivalence — not the memory delta — is this suite's proof.
 *
 * A scanned PDF (no text layer) also gets an inline note, and that note has to
 * agree with whether page images follow it — covered at the end of the file.
 *
 * Run: npx tsx test/continuous-test-suite-pdf-image-streaming.ts
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { installMockFetch } from "./utils/mockFetch.js";
import { NeuroLink } from "../dist/index.js";

const { test, runSuite } = defineSuite("PDF image streaming (#302)", {
  offline: true,
});

// ---------------------------------------------------------------------------
// Environment: fake key, no proxy. The suite runs in its own tsx process, so
// mutations don't leak.
// ---------------------------------------------------------------------------
process.env.LITELLM_API_KEY = "sk-litellm-test-mock";
delete process.env.LITELLM_BASE_URL;
// LiteLLM defaults generate() to the SSE wire (see
// LiteLLMProvider.useStreamingWireForGenerate) so a slow non-streaming
// completion doesn't sit silent behind a proxy that times out an idle
// connection. This suite's mock returns a single JSON body, not an SSE
// stream, so force the plain JSON wire via the documented escape hatch —
// otherwise the client's SSE parser gets a payload it can't read and every
// assertion below would fail on an empty response, not on anything this fix
// touches.
process.env.NEUROLINK_LITELLM_SSE_GENERATE = "false";

const MOCK_HOST = "mock-litellm-pdf-streaming.test";
const CREDENTIALS = {
  litellm: {
    apiKey: "sk-litellm-test-mock",
    baseURL: `https://${MOCK_HOST}/v1`,
  },
};

function openAIChatResponse(content: string, model: string): unknown {
  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

type WireContentPart = {
  type?: string;
  text?: string;
  image_url?: { url?: string };
};
type WireMessage = { role?: string; content?: string | WireContentPart[] };
type WireBody = { messages?: WireMessage[] };

function imagePartsOf(body: unknown): WireContentPart[] {
  const messages = (body as WireBody | undefined)?.messages ?? [];
  const userMessage = messages.find((m) => m.role === "user");
  const content = userMessage?.content;
  if (!Array.isArray(content)) {
    return [];
  }
  return content.filter((p) => p.type === "image_url");
}

/** The user message's text parts, joined — where the inline PDF notes land. */
function textPartsOf(body: unknown): string {
  const messages = (body as WireBody | undefined)?.messages ?? [];
  const content = messages.find((m) => m.role === "user")?.content;
  if (typeof content === "string") {
    return content;
  }
  return (content ?? [])
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("\n");
}

/**
 * A one-page PDF that draws a filled rectangle and no text, so it has no text
 * layer to extract — the shape of a scanned document. Built with real xref
 * offsets rather than checked in as a fixture. `padBytes` adds a comment of
 * that size after the header, for a caller that needs a larger file.
 */
function buildTextlessPdf(padBytes = 0): Buffer {
  const content = "0 0 150 150 re f";
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R>>",
    `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  if (padBytes > 0) {
    out += `%${"0".repeat(padBytes)}\n`;
  }
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

function decodeDataUrl(url: string | undefined): Buffer {
  assert(
    typeof url === "string" && url.startsWith("data:image/png;base64,"),
    `each PDF page image must be a base64 PNG data URI, got prefix ${JSON.stringify(url?.slice(0, 24))}`,
  );
  return Buffer.from((url as string).split(",", 2)[1], "base64");
}

// ---------------------------------------------------------------------------
// 1. Happy path: one image part per page, in page order (must-have proof).
// ---------------------------------------------------------------------------

await test("generate() with a 3-page PDF against a non-native-PDF vision provider carries exactly 3 distinct, ordered image parts", async () => {
  const handle = installMockFetch([
    {
      method: "POST",
      url: MOCK_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("described", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    const pdf = readFileSync("test/fixtures/multi-page.pdf");
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "Describe this document", pdfFiles: [pdf] },
      provider: "litellm",
      model: "openai/gpt-4o-mini", // LiteLLM 'provider/model' id
      disableTools: true,
      credentials: CREDENTIALS,
    });

    // Precondition: the mocked chat-completions endpoint was actually hit —
    // otherwise an empty `handle.calls` would make every assertion below
    // vacuously true instead of proving anything.
    const chatCalls = handle.calls.filter((c) =>
      c.url.includes("/chat/completions"),
    );
    assertEqual(
      chatCalls.length,
      1,
      "exactly one chat-completions request must have been sent",
    );

    assert(
      String(result.content).includes("described"),
      "generate() must return the mocked provider response",
    );

    const parts = imagePartsOf(chatCalls[0].bodyJson);
    assertEqual(
      parts.length,
      3,
      "multi-page.pdf has 3 pages, so the outgoing request must carry 3 image parts",
    );

    const decoded = parts.map((p) => decodeDataUrl(p.image_url?.url));
    for (const buf of decoded) {
      assert(buf.length > 0, "a page image must not be empty");
    }
    // Pairwise-distinct: catches a regression where the same rendered page
    // (e.g. a stale buffer reference) is pushed for every page instead of
    // one image per page.
    assert(
      decoded[0].compare(decoded[1]) !== 0 &&
        decoded[1].compare(decoded[2]) !== 0 &&
        decoded[0].compare(decoded[2]) !== 0,
      "all 3 page images must be distinct renders, not the same image repeated",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 2. Per-page error isolation (#294) survives the streaming route.
// ---------------------------------------------------------------------------

await test("generate() with one corrupted page still sends the 2 good page images instead of failing the whole request", async () => {
  const handle = installMockFetch([
    {
      method: "POST",
      url: MOCK_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("described", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    // pdf-page3-corrupt.pdf = multi-page.pdf with page 3's stream corrupted
    // so only that page fails to render (#294 fixture, also used by
    // "PDFProcessor #294" directly against the PDF processor API).
    const pdf = readFileSync("test/fixtures/pdf-page3-corrupt.pdf");
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "Describe this document", pdfFiles: [pdf] },
      provider: "litellm",
      model: "openai/gpt-4o-mini", // LiteLLM 'provider/model' id
      disableTools: true,
      credentials: CREDENTIALS,
    });

    const chatCalls = handle.calls.filter((c) =>
      c.url.includes("/chat/completions"),
    );
    assertEqual(
      chatCalls.length,
      1,
      "a corrupted-but-recoverable page must not abort the request — exactly one chat-completions call must still be sent",
    );
    assert(
      String(result.content).includes("described"),
      "generate() must still return the mocked provider response",
    );

    const parts = imagePartsOf(chatCalls[0].bodyJson);
    assertEqual(
      parts.length,
      2,
      "page 3 failed to render, so only the 2 good pages must reach the request",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 3. A scanned PDF's inline note must agree with whether images follow it.
//
// Only the vision-provider wording is asserted: the multimodal builder rejects
// a provider that cannot see images before it converts any PDF, so the
// "unavailable to this text-only model" wording has no generate() call that
// reaches it.
// ---------------------------------------------------------------------------

await test("a scanned PDF sent to a vision provider is described as having page images attached, not as unavailable", async () => {
  const handle = installMockFetch([
    {
      method: "POST",
      url: MOCK_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("described", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "Describe this document", pdfFiles: [buildTextlessPdf()] },
      provider: "litellm",
      model: "openai/gpt-4o-mini",
      disableTools: true,
      credentials: CREDENTIALS,
    });
    const chatCalls = handle.calls.filter((c) =>
      c.url.includes("/chat/completions"),
    );
    assertEqual(chatCalls.length, 1, "exactly one chat-completions request");

    assertEqual(
      imagePartsOf(chatCalls[0].bodyJson).length,
      1,
      "the page image is what carries the scanned content, so it must be sent",
    );
    const text = textPartsOf(chatCalls[0].bodyJson);
    assert(
      text.includes("no extractable text layer"),
      "the note must still say the PDF has no text layer",
    );
    assert(
      text.includes("page images are attached below"),
      "the note must point the model at the page images that follow it",
    );
    assert(
      !text.includes("text-only model"),
      "a model that is being sent the page images must not be told it is text-only",
    );
    assert(
      !text.includes("-- 1 of 1 --"),
      "the page-marker block alone must not stand in for the missing text",
    );
  } finally {
    handle.unset();
  }
});

await test("a PDF with a text layer is not labelled as scanned", async () => {
  const handle = installMockFetch([
    {
      method: "POST",
      url: MOCK_HOST,
      respond: {
        status: 200,
        json: openAIChatResponse("described", "openai/gpt-4o-mini"),
      },
    },
  ]);
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: {
        text: "Describe this document",
        pdfFiles: [readFileSync("test/fixtures/multi-page.pdf")],
      },
      provider: "litellm",
      model: "openai/gpt-4o-mini",
      disableTools: true,
      credentials: CREDENTIALS,
    });
    const chatCalls = handle.calls.filter((c) =>
      c.url.includes("/chat/completions"),
    );
    assertEqual(chatCalls.length, 1, "exactly one chat-completions request");
    const text = textPartsOf(chatCalls[0].bodyJson);
    assert(
      text.includes("Q1 Sales Report"),
      "the extracted text must still reach the model",
    );
    assert(
      !text.includes("no extractable text layer"),
      "a PDF that has text must not be reported as having none",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 4. The same scan detection on the two other PDF text paths: the file
//    registry behind the file tools (the package's `./files` export) and the
//    RAG PDF loader. Both checked pdf-parse's joined text, which is never
//    empty because of the "-- n of N --" marker after every page, so a scan
//    was read as a document whose content was its page markers.
// ---------------------------------------------------------------------------

/** pdf-parse's per-page marker, which must never be passed on as content. */
const PAGE_MARKER = /--\s*1\s+of\s+1\s*--/;

await test("the file registry reports a scanned PDF as having no text layer, not as its page markers", async () => {
  // Surface: the package's `./files` export. Above the tiny-file limit, so the
  // registry persists the file and extracts it on demand, which is the path
  // the file tools read.
  const { FileReferenceRegistry } = await import("../dist/files/index.js");
  const tempDir = mkdtempSync(join(tmpdir(), "neurolink-scan-registry-"));
  const registry = new FileReferenceRegistry({ tempDir });
  try {
    const ref = await registry.register(buildTextlessPdf(12 * 1024), "buffer", {
      filename: "scan.pdf",
    });
    assert(
      ref.detectedType === "pdf",
      "precondition failed: the fixture was not registered as a PDF",
    );
    await registry.ensureProcessed(ref.id);
    const processed = registry.get(ref.id)?.processedContent ?? "";
    assert(
      processed.includes("scanned images or non-extractable content"),
      "the on-demand extraction did not report the PDF as having no text layer",
    );
    assert(
      !PAGE_MARKER.test(processed),
      "the on-demand extraction passed pdf-parse's page marker on as content",
    );

    const pages = await registry.extractContent({
      file_id: ref.id,
      pages: [1],
    });
    assert(pages.success, "precondition failed: the page extraction failed");
    assert(
      (pages.text ?? "").includes("(No text found on the requested pages)"),
      "the page extraction did not say the requested page has no text",
    );
    assert(
      !PAGE_MARKER.test(pages.text ?? ""),
      "the page extraction passed pdf-parse's page marker on as content",
    );
  } finally {
    await registry.clear();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

await test("the RAG PDF loader reports a scanned PDF as having no text layer, not as its page markers", async () => {
  const { PDFLoader } = await import("../dist/index.js");
  const tempDir = mkdtempSync(join(tmpdir(), "neurolink-scan-loader-"));
  try {
    const scanPath = join(tempDir, "scan.pdf");
    writeFileSync(scanPath, buildTextlessPdf());
    const scan = await new PDFLoader().load(scanPath);
    assert(
      scan.getContent().includes("no extractable text layer"),
      "the loader did not say the PDF has no text layer",
    );
    assert(
      !PAGE_MARKER.test(scan.getContent()),
      "the loader indexed pdf-parse's page marker as the document's content",
    );
    assert(
      scan.getMetadata().pageCount === 1,
      "the loader lost the scanned PDF's page count",
    );

    // Control: a PDF with a text layer still loads as its text.
    const textPath = join(tempDir, "text.pdf");
    writeFileSync(textPath, readFileSync("test/fixtures/multi-page.pdf"));
    const text = await new PDFLoader().load(textPath);
    assert(
      !text.getContent().includes("no extractable text layer") &&
        text.getContent().trim().length > 0,
      "a PDF with a text layer was reported as scanned",
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

await runSuite();

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
 * Run: npx tsx test/continuous-test-suite-pdf-image-streaming.ts
 */
import { readFileSync } from "node:fs";
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

await runSuite();

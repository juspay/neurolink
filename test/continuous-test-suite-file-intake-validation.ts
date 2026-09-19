#!/usr/bin/env tsx
/**
 * Continuous Test Suite: file intake validation and error clarity
 * (issues #348, #360), driven through the public surface (Rule 15).
 *
 * `FileDetector` isn't part of the public barrel (`dist/index.js` doesn't
 * export it) and `messageBuilder.ts`'s helpers aren't either, so every
 * assertion here goes through `new NeuroLink().generate()` instead of
 * importing either module directly:
 *
 *   - #348 is reached via `input.images` (a `data:` URI string), which flows
 *     through `buildMultimodalMessagesArray()` -> `processImageToBase64()`.
 *   - #360 is reached via `input.files` (a URL string), which flows through
 *     `processUnifiedFilesArray()` -> `FileDetector.detectAndProcess()` ->
 *     the private `loadUrl()`.
 *
 * Every provider call in this file goes through `installMockFetch` (the
 * fetch-interceptable idiom from continuous-test-suite-providers-mocked.ts /
 * continuous-test-suite-stt-unit.ts) with a fake OPENAI_API_KEY, so nothing
 * here depends on real credentials, burns API quota, or can hang on a live
 * network call. `FileDetector.loadUrl()` fetches over undici's `request()`,
 * not `globalThis.fetch`, so the #360 test additionally spins up a real
 * local HTTP server rather than relying on the fetch mock for that leg.
 *
 * Run: npx tsx test/continuous-test-suite-file-intake-validation.ts
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
} from "./helpers/harness.js";
import { installMockFetch } from "./utils/mockFetch.js";
import { NeuroLink } from "../dist/index.js";

const { test, runSuite } = defineSuite(
  "File intake validation & error clarity (#348, #360)",
  { offline: true },
);

/**
 * Same idiom as continuous-test-suite-stt-unit.ts's withMockedOpenAI: a fake
 * key so provider construction never depends on real credentials sitting in
 * .env, and OPENAI_BASE_URL cleared so a mocked `api.openai.com` route
 * actually matches what the provider dials.
 */
async function withFakeOpenAICredential<T>(fn: () => Promise<T>): Promise<T> {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalBaseUrl = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_API_KEY = "test-fake-openai-credential-for-intake-suite";
  delete process.env.OPENAI_BASE_URL;
  try {
    return await fn();
  } finally {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
    if (originalBaseUrl === undefined) {
      delete process.env.OPENAI_BASE_URL;
    } else {
      process.env.OPENAI_BASE_URL = originalBaseUrl;
    }
  }
}

type GenerateInput = { text: string; images?: string[]; files?: string[] };

async function attemptGenerate(
  nl: NeuroLink,
  input: GenerateInput,
): Promise<{ ok: boolean; err?: unknown }> {
  try {
    await nl.generate({ provider: "openai", model: "gpt-4o-mini", input });
    return { ok: true };
  } catch (err) {
    return { ok: false, err };
  }
}

// A syntactically valid 1x1 PNG, reused from the existing #348/#270 coverage
// in continuous-test-suite-bugfixes.ts, so a real image is never flagged as
// unsupported by the fix under test here.
const VALID_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function openAIPongResponse(): unknown {
  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "a tiny pixel" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

await test("#348: a data URI whose subtype is not a supported image format is rejected before any network call — and this exact setup DOES capture a request that legitimately goes out", async () => {
  await withFakeOpenAICredential(async () => {
    const { unset, calls } = installMockFetch([]);
    try {
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });

      const bad = await attemptGenerate(nl, {
        text: "describe this image",
        images: ["data:image/invalid-format;base64,aGVsbG8="],
      });
      assert(
        !bad.ok,
        "generate() rejected the bad-subtype image rather than resolving",
      );
      assert(bad.err instanceof Error, "the rejection is an Error");
      assertIncludes(
        (bad.err as Error).message,
        "Unsupported data URI MIME type",
        "the error names the client-side MIME-subtype validation that rejected it",
      );
      assertEqual(
        calls.length,
        0,
        "no network call was made for the bad-subtype image — validation ran before dispatch",
      );

      // Control: prove this exact mock setup WOULD have recorded a call had
      // validation not caught the bad subtype, so the zero-call count above
      // is a real negative rather than an artifact of fetch being
      // unreachable in this harness. The provider layer retries a thrown
      // fetch before giving up, so the exact count is an unrelated
      // implementation detail — only "at least one call was captured"
      // matters here.
      const control = await attemptGenerate(nl, { text: "hello" });
      assert(
        !control.ok,
        "the unmocked plain-text request was rejected by the empty route table rather than silently swallowed",
      );
      assert(
        calls.length > 0,
        "the control request DID reach the fetch mock — confirming the earlier zero-call count reflects the fix, not an untestable path",
      );
    } finally {
      unset();
    }
  });
});

await test("#348: a data URI with a genuinely supported image subtype still passes validation and reaches the provider", async () => {
  await withFakeOpenAICredential(async () => {
    const { unset, calls } = installMockFetch([
      {
        method: "POST",
        url: "api.openai.com/v1/chat/completions",
        respond: { status: 200, json: openAIPongResponse() },
      },
    ]);
    try {
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });
      const good = await attemptGenerate(nl, {
        text: "describe this image",
        images: [`data:image/png;base64,${VALID_PNG_BASE64}`],
      });
      assert(
        good.ok,
        "a supported image subtype is not rejected by the #348 validation",
      );
      assert(
        calls.length > 0,
        "the valid image made it all the way to the provider request",
      );
    } finally {
      unset();
    }
  });
});

await test("#360: a non-200 file URL surfaces the standard HTTP reason phrase, not a bare status code", async () => {
  let requestCount = 0;
  const server = createServer((_req, res) => {
    requestCount += 1;
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo | null;
  assert(address !== null, "the local HTTP server bound to a port");
  const port = address ? address.port : 0;

  try {
    await withFakeOpenAICredential(async () => {
      const { unset } = installMockFetch([]);
      try {
        const nl = new NeuroLink({ conversationMemory: { enabled: false } });
        const outcome = await attemptGenerate(nl, {
          text: "summarize this file",
          files: [`http://127.0.0.1:${port}/missing.txt`],
        });

        assert(
          requestCount >= 1,
          "the local server actually received the file request — the fetch really happened rather than being short-circuited elsewhere",
        );
        assert(
          !outcome.ok,
          "generate() rejected rather than resolving for a 404 file URL",
        );
        assert(outcome.err instanceof Error, "the rejection is an Error");
        const message = (outcome.err as Error).message;
        assertIncludes(
          message,
          "404",
          "the error carries the HTTP status code",
        );
        assertIncludes(
          message,
          "Not Found",
          "the error carries the standard reason phrase alongside the code, not a bare number",
        );
      } finally {
        unset();
      }
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

await runSuite();

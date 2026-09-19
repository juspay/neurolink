#!/usr/bin/env tsx
/**
 * Continuous Test Suite: caller-configurable vision transcode output format.
 *
 * `src/lib/adapters/imageFormatSupport.ts` transcodes an image a vision
 * provider cannot read natively (HEIC, TIFF, BMP, ICO, JPEG 2000, AVIF) into
 * a format it can. The transcode target used to be hardcoded to PNG; it is
 * now caller-configurable via `imageOptions.outputFormat` on both
 * `generate()` and `stream()`, while the *default* stays PNG for every
 * existing caller who never sets it.
 *
 * This runs against a local loopback mock chat server
 * (`test/helpers/mockChatServer.ts`), not a live provider, so it needs no
 * credentials and runs unconditionally.
 *
 * ## Why magic bytes, and nothing else
 *
 * Two things about the outbound request are proven unreliable for this
 * assertion, so the test decodes the base64 image payload itself and reads
 * its first bytes instead of trusting either:
 *
 *   - **Filenames** carry no format information here at all — the fixture is
 *     an in-memory Buffer, never a path.
 *   - **The `data:` URI's declared mime label** is not authoritative. The
 *     OpenAI chat-completions adapter labels every `type:"image"` content
 *     part's data URI `image/png` regardless of the bytes it actually
 *     encodes — confirmed empirically: requesting `outputFormat: "jpeg"`
 *     produces a wire payload labelled `image/png` whose bytes are real
 *     JPEG. Asserting on the label would make this suite pass whether or not
 *     the transcode option did anything.
 *
 * PNG magic bytes: `89 50 4E 47`. JPEG magic bytes: `FF D8 FF`.
 *
 * Run: npx tsx test/continuous-test-suite-vision-image-format.ts
 */

import "dotenv/config";
import sharp from "sharp";
import { defineSuite, assert } from "./helpers/harness.js";
import {
  startMockChatServer,
  mockOpenAICredentials,
  type MockChatServer,
} from "./helpers/mockChatServer.js";
import { NeuroLink } from "../dist/index.js";

const { test, runSuite } = defineSuite("Vision image transcode format");

type ChatMessage = { role: string; content: unknown };
type ImageUrlPart = { type: string; image_url?: { url?: string } };

/** A real, decodable TIFF — sharp encodes it, never a stub buffer. */
async function makeTiffFixture(): Promise<Buffer> {
  return sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 10, g: 200, b: 30 },
    },
  })
    .tiff()
    .toBuffer();
}

/**
 * Extracts the outbound image part's decoded bytes from the mock server's
 * last captured OpenAI chat-completions request body. Throws (never
 * returns null) so a shape change in the request fails loudly instead of
 * being read as "no image".
 */
function decodedImageBytesFromRequest(body: string): Buffer {
  const parsed = JSON.parse(body) as { messages?: ChatMessage[] };
  const userMessage = parsed.messages?.find((m) => m.role === "user");
  assert(
    Array.isArray(userMessage?.content),
    "the captured request's user message did not carry multimodal content parts",
  );
  const content = userMessage!.content as ImageUrlPart[];
  const imagePart = content.find((p) => p.type === "image_url");
  const url = imagePart?.image_url?.url ?? "";
  const commaIndex = url.indexOf(",");
  assert(
    url.startsWith("data:") && commaIndex > -1,
    "the captured request's image part was not a data: URI",
  );
  return Buffer.from(url.slice(commaIndex + 1), "base64");
}

async function runGenerateAndCapture(
  server: MockChatServer,
  tiff: Buffer,
  outputFormat?: "jpeg",
): Promise<Buffer> {
  const nl = new NeuroLink();
  await nl.generate({
    provider: "openai",
    model: "gpt-4o-mini",
    input: { text: "describe", images: [tiff] },
    ...(outputFormat ? { imageOptions: { outputFormat } } : {}),
    credentials: mockOpenAICredentials(server),
    maxTokens: 64,
    timeout: 30_000,
  });
  assert(
    server.wasCalled(),
    "generate() must have sent a request before its body can be inspected",
  );
  return decodedImageBytesFromRequest(server.getLastRequestBody() ?? "");
}

/**
 * Same fixture/provider/assertions as `runGenerateAndCapture`, but through
 * `stream()` — the shared builder (`buildMultimodalMessagesArray` /
 * `convertSimpleImagesToProviderFormat`) that threads `imageOptions` is the
 * same one `generate()` and `stream()` both call, so this closes the
 * coverage gap the header docstring claims is closed: the option must be
 * proven on both call paths, not asserted only on one.
 */
async function runStreamAndCapture(
  server: MockChatServer,
  tiff: Buffer,
  outputFormat?: "jpeg",
): Promise<Buffer> {
  const nl = new NeuroLink();
  const result = await nl.stream({
    provider: "openai",
    model: "gpt-4o-mini",
    input: { text: "describe", images: [tiff] },
    ...(outputFormat ? { imageOptions: { outputFormat } } : {}),
    credentials: mockOpenAICredentials(server),
    maxTokens: 64,
    timeout: 30_000,
  });
  for await (const _chunk of result.stream) {
    // Drain. The assertion is about what was sent, not what streamed back.
  }
  assert(
    server.wasCalled(),
    "stream() must have sent a request before its body can be inspected",
  );
  return decodedImageBytesFromRequest(server.getLastRequestBody() ?? "");
}

await test("an explicit outputFormat: jpeg reaches the wire as real JPEG bytes", async () => {
  const tiff = await makeTiffFixture();
  const server = await startMockChatServer();
  try {
    const bytes = await runGenerateAndCapture(server, tiff, "jpeg");
    assert(
      bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff,
      "the transcoded image's decoded bytes did not carry JPEG magic bytes",
    );
  } finally {
    await server.close();
  }
});

await test("with no imageOptions set, the transcode default stays PNG (control)", async () => {
  const tiff = await makeTiffFixture();
  const server = await startMockChatServer();
  try {
    const bytes = await runGenerateAndCapture(server, tiff);
    assert(
      bytes.length >= 4 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47,
      "the transcoded image's decoded bytes did not carry PNG magic bytes — the unset-option default must stay PNG",
    );
  } finally {
    await server.close();
  }
});

await test("stream(): an explicit outputFormat: jpeg reaches the wire as real JPEG bytes", async () => {
  const tiff = await makeTiffFixture();
  const server = await startMockChatServer();
  try {
    const bytes = await runStreamAndCapture(server, tiff, "jpeg");
    assert(
      bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff,
      "the transcoded image's decoded bytes did not carry JPEG magic bytes on the streaming path",
    );
  } finally {
    await server.close();
  }
});

await runSuite();

#!/usr/bin/env tsx
/**
 * Continuous Test Suite: native-Anthropic multimodal block conversion (pure,
 * no API).
 *
 * Regression guard for the vision defect on the native Anthropic surface: AI-SDK
 * v6 encodes images AND PDFs in the LanguageModel prompt as `type:"file"` parts
 * (`{ type:"file", mediaType, data }`). The provider's `doGenerate(options.prompt)`
 * converts that prompt with messagesToAnthropic, which only handled
 * text/image/image_url — so the image was silently dropped on the tool-using
 * generate path and the model answered "no image detected". These tests lock in:
 *
 *  - `fileToAnthropicBlock` turns an image file part into an Anthropic image
 *    block with the CORRECT media type (honoring the AI-SDK `mediaType`, not a
 *    hardcoded image/png that 400s real JPEG/GIF/WebP uploads).
 *  - PDF file parts become document blocks.
 *  - Magic-byte sniffing recovers the media type when no hint is present.
 *
 * Run: npx tsx test/continuous-test-suite-anthropic-multimodal.ts
 */

import { defineSuite, assertEqual } from "./helpers/harness.js";
import {
  sniffImageMediaType,
  toAnthropicImageBlock,
  fileToAnthropicBlock,
} from "../src/lib/providers/anthropicImageBlocks.js";

const { test, runSuite } = defineSuite(
  "Native-Anthropic multimodal conversion",
);

// Minimal valid magic-byte headers for each format.
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const GIF = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
const WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const PDF = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4

const isImageBlock = (
  b: unknown,
): b is {
  type: "image";
  source: { type: string; media_type?: string; data?: string; url?: string };
} => !!b && (b as { type?: string }).type === "image";

await test("sniffImageMediaType: detects png/jpeg/gif/webp from magic bytes", () => {
  assertEqual(sniffImageMediaType(PNG), "image/png", "PNG magic → image/png");
  assertEqual(
    sniffImageMediaType(JPEG),
    "image/jpeg",
    "JPEG magic → image/jpeg",
  );
  assertEqual(sniffImageMediaType(GIF), "image/gif", "GIF magic → image/gif");
  assertEqual(
    sniffImageMediaType(WEBP),
    "image/webp",
    "WEBP magic → image/webp",
  );
  assertEqual(
    sniffImageMediaType(PDF),
    undefined,
    "non-image bytes → undefined",
  );
});

await test("toAnthropicImageBlock: byte array honors mediaType hint", () => {
  const block = toAnthropicImageBlock(JPEG, "image/jpeg");
  assertEqual(isImageBlock(block), true, "produces image block");
  assertEqual(block?.source.type, "base64", "base64 source");
  assertEqual(
    (block?.source as { media_type?: string }).media_type,
    "image/jpeg",
    "media_type from hint (NOT hardcoded png)",
  );
  assertEqual(
    (block?.source as { data?: string }).data,
    JPEG.toString("base64"),
    "base64 payload preserved",
  );
});

await test("toAnthropicImageBlock: byte array with no hint sniffs the type", () => {
  const block = toAnthropicImageBlock(GIF);
  assertEqual(
    (block?.source as { media_type?: string }).media_type,
    "image/gif",
    "GIF bytes sniffed to image/gif (not defaulted to png)",
  );
});

await test("toAnthropicImageBlock: https URL → url source", () => {
  const block = toAnthropicImageBlock("https://example.com/cat.png");
  assertEqual(block?.source.type, "url", "url source type");
  assertEqual(
    (block?.source as { url?: string }).url,
    "https://example.com/cat.png",
    "url preserved",
  );
});

await test("toAnthropicImageBlock: data URL parses media type + payload", () => {
  const b64 = PNG.toString("base64");
  const block = toAnthropicImageBlock(`data:image/png;base64,${b64}`);
  assertEqual(
    (block?.source as { media_type?: string }).media_type,
    "image/png",
    "data URL media type",
  );
  assertEqual(
    (block?.source as { data?: string }).data,
    b64,
    "data URL payload",
  );
});

await test("toAnthropicImageBlock: bare base64 WebP without hint sniffs via the 32-char slice", () => {
  // Guards SNIFF_BASE64_CHARS: sniffBase64 decodes only the first 32 base64
  // chars (= 24 bytes). WebP is the longest signature (RIFF…WEBP spans the
  // first 12 bytes), so the filler below pushes the base64 well past 32 chars,
  // forcing the slice to truncate — yet the 12-byte signature stays within the
  // decoded 24 bytes, so detection must still resolve to image/webp.
  const webpLong = Buffer.concat([WEBP, Buffer.alloc(48, 0x20)]);
  const b64 = webpLong.toString("base64");
  assertEqual(b64.length > 32, true, "payload longer than the sniff slice");
  const block = toAnthropicImageBlock(b64);
  assertEqual(isImageBlock(block), true, "bare base64 → image block");
  assertEqual(
    (block?.source as { media_type?: string }).media_type,
    "image/webp",
    "bare base64 WebP sniffed to image/webp (slice reaches the 12th byte)",
  );
  assertEqual(
    (block?.source as { data?: string }).data,
    b64,
    "full base64 payload preserved (only sniffing uses the slice)",
  );
});

await test("fileToAnthropicBlock: AI-SDK image file part → image block (THE fix)", () => {
  // Exactly the shape ai@6 puts in the doGenerate prompt for an uploaded PNG.
  const block = fileToAnthropicBlock({ mediaType: "image/png", data: PNG });
  assertEqual(isImageBlock(block), true, "image file part → image block");
  assertEqual(
    (block as { source?: { media_type?: string } })?.source?.media_type,
    "image/png",
    "media type carried through",
  );
  assertEqual(
    (block as { source?: { data?: string } })?.source?.data,
    PNG.toString("base64"),
    "image bytes carried through (image is no longer dropped)",
  );
});

await test("fileToAnthropicBlock: jpeg file part keeps image/jpeg", () => {
  const block = fileToAnthropicBlock({ mediaType: "image/jpeg", data: JPEG });
  assertEqual(
    (block as { source?: { media_type?: string } })?.source?.media_type,
    "image/jpeg",
    "jpeg not mislabeled as png",
  );
});

await test("fileToAnthropicBlock: PDF file part → document block", () => {
  const block = fileToAnthropicBlock({
    mediaType: "application/pdf",
    data: PDF,
  });
  assertEqual(
    (block as { type?: string })?.type,
    "document",
    "pdf → document block",
  );
  assertEqual(
    (block as { source?: { media_type?: string } })?.source?.media_type,
    "application/pdf",
    "document media type",
  );
});

await test("fileToAnthropicBlock: missing mediaType still salvages image bytes", () => {
  const block = fileToAnthropicBlock({ data: WEBP });
  assertEqual(
    (block as { source?: { media_type?: string } })?.source?.media_type,
    "image/webp",
    "sniffed image/webp from bytes with no hint",
  );
});

await test("fileToAnthropicBlock: unsupported non-image file → undefined (skipped, not 400)", () => {
  assertEqual(
    fileToAnthropicBlock({ mediaType: "text/plain", data: "hello" }),
    undefined,
    "text file part is omitted, not forced into an image block",
  );
  assertEqual(
    fileToAnthropicBlock({ mediaType: "image/png", data: null }),
    undefined,
    "null data → undefined",
  );
});

await runSuite();

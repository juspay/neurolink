#!/usr/bin/env tsx
/**
 * Continuous Test Suite: image MIME detection from magic bytes (pure, no API).
 *
 * The native Vertex+Anthropic image block must label each inline image with the
 * correct mimeType. Buffer / bare-base64 inputs (Slack & REST uploads) carry no
 * mime hint, so the format is sniffed from the leading bytes. A wrong default
 * (historically image/jpeg) made Anthropic reject a PNG with:
 *   "image specified using image/jpeg ... but the image appears to be image/png"
 * detectImageMimeType() is the source of truth used by GoogleVertexProvider.
 *
 * Run: npx tsx test/continuous-test-suite-vertex-image-mime.ts
 */
import { defineSuite, assertEqual } from "./helpers/harness.js";
import { detectImageMimeType } from "../src/lib/utils/imageDetection.js";

const { test, runSuite } = defineSuite("Vertex image MIME detection");

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const webp = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP"),
]);
const gif = Buffer.from("GIF89a");

await test("detects PNG from 89 50 4E 47", () => {
  assertEqual(detectImageMimeType(png), "image/png", "png magic");
});

await test("detects JPEG from FF D8 FF", () => {
  assertEqual(detectImageMimeType(jpeg), "image/jpeg", "jpeg magic");
});

await test("detects WebP from RIFF....WEBP", () => {
  assertEqual(detectImageMimeType(webp), "image/webp", "webp magic");
});

await test("detects GIF from GIF8", () => {
  assertEqual(detectImageMimeType(gif), "image/gif", "gif magic");
});

await test("does NOT mislabel a PNG as JPEG (the bug we fixed)", () => {
  assertEqual(detectImageMimeType(png), "image/png", "png must not be jpeg");
});

await test("falls back to image/png for unknown bytes", () => {
  assertEqual(
    detectImageMimeType(Buffer.from([0x00, 0x01, 0x02, 0x03])),
    "image/png",
    "unknown default",
  );
});

await test("falls back to image/png for too-short buffers", () => {
  assertEqual(
    detectImageMimeType(Buffer.from([0x89])),
    "image/png",
    "short buffer",
  );
});

await runSuite();

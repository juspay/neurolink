#!/usr/bin/env tsx

/**
 * Continuous Test Suite — FileDetector extension normalization.
 *
 * Run with: npx tsx test/continuous-test-suite-file-detector-extension.ts
 */

import { FileDetector } from "../src/lib/utils/fileDetector.js";
import { assertEqual, defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("FileDetector Extension Normalization");

type DetectionSnapshot = {
  type: string;
  mimeType: string;
  extension: string | null;
  source: string;
  confidence: number | undefined;
};

async function detectExtension(input: string): Promise<DetectionSnapshot> {
  const result = await FileDetector.detect(input, { timeout: 1 });
  return {
    type: result.type,
    mimeType: result.mimeType,
    extension: result.extension,
    source: result.source,
    confidence: result.metadata.confidence,
  };
}

function assertSnapshot(
  actual: DetectionSnapshot,
  expected: DetectionSnapshot,
): void {
  assertEqual(actual.type, expected.type, "file type");
  assertEqual(actual.mimeType, expected.mimeType, "MIME type");
  assertEqual(actual.extension, expected.extension, "extension");
  assertEqual(actual.source, expected.source, "source");
  assertEqual(actual.confidence, expected.confidence, "confidence");
}

await runSuite(async () => {
  await test("trims surrounding whitespace before extension detection", async () => {
    assertSnapshot(await detectExtension(" report.csv "), {
      type: "csv",
      mimeType: "text/csv",
      extension: "csv",
      source: "path",
      confidence: 85,
    });
  });

  await test("strips query strings and fragments from path-like inputs", async () => {
    assertSnapshot(await detectExtension("report.csv?download=true#preview"), {
      type: "csv",
      mimeType: "text/csv",
      extension: "csv",
      source: "path",
      confidence: 85,
    });
  });

  await test("normalizes encoded whitespace in URL pathnames", async () => {
    assertSnapshot(
      await detectExtension("https://example.invalid/data.csv%20"),
      {
        type: "csv",
        mimeType: "text/csv",
        extension: "csv",
        source: "url",
        confidence: 85,
      },
    );
  });

  await test("falls back to path-like parsing for malformed URL inputs", async () => {
    assertSnapshot(
      await detectExtension(
        "https://[example.invalid]/report.csv?download=1#preview",
      ),
      {
        type: "csv",
        mimeType: "text/csv",
        extension: "csv",
        source: "path",
        confidence: 85,
      },
    );
  });

  await test("rejects invalid extension characters instead of leaking them", async () => {
    assertSnapshot(await detectExtension("report.csv<script>"), {
      type: "unknown",
      mimeType: "application/octet-stream",
      extension: null,
      source: "buffer",
      confidence: 0,
    });
  });

  await test("keeps sibling extension cases unchanged", async () => {
    assertSnapshot(await detectExtension("report.CSV"), {
      type: "csv",
      mimeType: "text/csv",
      extension: "csv",
      source: "path",
      confidence: 85,
    });

    assertSnapshot(await detectExtension(".dockerignore"), {
      type: "text",
      mimeType: "text/plain",
      extension: "dockerignore",
      source: "path",
      confidence: 85,
    });

    assertSnapshot(await detectExtension("README"), {
      type: "unknown",
      mimeType: "application/octet-stream",
      extension: null,
      source: "buffer",
      confidence: 0,
    });
  });
});

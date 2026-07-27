/**
 * Vitest tests for the structured-recovery candidate ladder (N4).
 *
 * Run:
 *   pnpm exec vitest run test/structuredRecovery.test.ts
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  collectStructuredCandidates,
  recoverStructuredData,
} from "../src/lib/agent/structuredRecovery.js";

const schema = z.object({ findings: z.array(z.string()) });

describe("collectStructuredCandidates — ladder order", () => {
  it("puts structuredData first, then raw JSON, fence, brace span, array", () => {
    const text = 'prefix {"findings":["a"]} suffix';
    const candidates = collectStructuredCandidates(text, { findings: ["sd"] });
    expect(candidates[0]).toMatchObject({ source: "structured-data" });
    expect(candidates.map((c) => c.source)).toContain("brace-span");
  });

  it("extracts a ```json fence", () => {
    const text = 'Here you go:\n```json\n{"findings":["x"]}\n```\nDone.';
    const sources = collectStructuredCandidates(text).map((c) => c.source);
    expect(sources).toContain("json-fence");
  });

  it("extracts a top-level array span", () => {
    const text = 'Results: ["a","b"] — as requested.';
    const candidates = collectStructuredCandidates(text);
    const arr = candidates.find((c) => c.source === "top-level-array");
    expect(arr?.value).toEqual(["a", "b"]);
  });

  it("returns nothing for prose", () => {
    expect(collectStructuredCandidates("no json here")).toHaveLength(0);
  });
});

describe("recoverStructuredData", () => {
  it("prefers provider structuredData when valid", () => {
    const result = recoverStructuredData({
      content: '{"findings":["text"]}',
      structuredData: { findings: ["provider"] },
      schema,
    });
    expect(result.source).toBe("structured-data");
    expect(result.data).toEqual({ findings: ["provider"] });
  });

  it("falls through invalid candidates to the first valid one", () => {
    const result = recoverStructuredData({
      content: 'garbage then {"findings":["ok"]} trailing',
      structuredData: { wrong: true },
      schema,
    });
    expect(result.source).toBe("brace-span");
    expect(result.data).toEqual({ findings: ["ok"] });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("runs candidates through coerce (top-level array envelope)", () => {
    const result = recoverStructuredData({
      content: '["a","b"]',
      schema,
      coerce: (candidate) =>
        Array.isArray(candidate) ? { findings: candidate } : candidate,
    });
    expect(result.data).toEqual({ findings: ["a", "b"] });
  });

  it("collects validation errors when nothing survives", () => {
    const result = recoverStructuredData({
      content: '{"findings": "not-an-array"}',
      schema,
    });
    expect(result.data).toBeUndefined();
    expect(result.errors.join(" ")).toContain("findings");
  });

  it("reports when no candidates exist at all", () => {
    const result = recoverStructuredData({ content: "prose only", schema });
    expect(result.errors.join(" ")).toContain("no JSON-shaped candidates");
  });

  it("a throwing coerce is an error entry, not a crash", () => {
    const result = recoverStructuredData({
      content: '{"findings":["x"]}',
      schema,
      coerce: () => {
        throw new Error("coerce exploded");
      },
    });
    expect(result.data).toBeUndefined();
    expect(result.errors.join(" ")).toContain("coerce exploded");
  });
});

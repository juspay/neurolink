/**
 * Vitest tests for registry-driven sampling-param support (N3).
 *
 * Covers the rejecting-family patterns (Sonnet 5 / Opus 4.7+ / Opus 5 /
 * Fable-Mythos, incl. Vertex dated ids and gateway prefixes), registry
 * capability overrides, and the resolveSamplingParams strip helper.
 *
 * Run:
 *   pnpm exec vitest run test/samplingParams.test.ts
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  MODEL_REGISTRY,
  modelSupportsSamplingParams,
  resolveSamplingParams,
} from "../src/lib/models/modelRegistry.js";

describe("modelSupportsSamplingParams — rejecting families", () => {
  it.each([
    "claude-sonnet-5",
    "claude-sonnet-5@20260203",
    "claude-sonnet-5-v2",
    "vertex_ai/claude-sonnet-5@20260203",
    "claude-opus-4-7",
    "claude-opus-4-8",
    "claude-opus-4.8",
    "claude-opus-4-10",
    "claude-opus-5",
    "claude-fable-5",
    "claude-mythos-5",
  ])("%s → rejected", (model) => {
    expect(modelSupportsSamplingParams("vertex", model)).toBe(false);
    expect(modelSupportsSamplingParams("anthropic", model)).toBe(false);
    expect(modelSupportsSamplingParams("openai-compatible", model)).toBe(false);
  });

  it.each([
    "claude-sonnet-4-5",
    "claude-sonnet-4-6",
    "claude-opus-4-5",
    "claude-opus-4-6",
    "claude-haiku-4-5",
    "claude-3-5-sonnet-20241022",
    "gpt-4o",
    "gemini-2.5-pro",
  ])("%s → supported", (model) => {
    expect(modelSupportsSamplingParams("anthropic", model)).toBe(true);
  });

  it("defaults to supported for empty/undefined models", () => {
    expect(modelSupportsSamplingParams("anthropic", undefined)).toBe(true);
    expect(modelSupportsSamplingParams("anthropic", "")).toBe(true);
  });
});

describe("modelSupportsSamplingParams — registry override", () => {
  const entry = MODEL_REGISTRY["gpt-4o"];
  const original = entry?.capabilities.samplingParams;

  afterEach(() => {
    if (entry) {
      if (original === undefined) {
        delete entry.capabilities.samplingParams;
      } else {
        entry.capabilities.samplingParams = original;
      }
    }
  });

  it("an explicit capabilities.samplingParams=false wins over patterns", () => {
    expect(entry).toBeDefined();
    entry!.capabilities.samplingParams = false;
    expect(modelSupportsSamplingParams("openai", "gpt-4o")).toBe(false);
    // Provider mismatch falls back to pattern matching (fail-open here).
    expect(modelSupportsSamplingParams("azure", "gpt-4o")).toBe(true);
  });
});

describe("resolveSamplingParams", () => {
  it("passes params through for supporting models", () => {
    expect(
      resolveSamplingParams(
        "anthropic",
        "claude-sonnet-4-6",
        { temperature: 0.3, topP: 0.9 },
        "test",
      ),
    ).toEqual({ temperature: 0.3, topP: 0.9 });
  });

  it("strips params for rejecting models", () => {
    expect(
      resolveSamplingParams(
        "vertex",
        "claude-sonnet-5@20260203",
        { temperature: 0.3, topP: 0.9 },
        "test",
      ),
    ).toEqual({});
    expect(
      resolveSamplingParams("anthropic", "claude-fable-5", {}, "test"),
    ).toEqual({});
  });
});

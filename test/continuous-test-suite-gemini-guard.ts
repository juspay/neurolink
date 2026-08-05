#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Gemini loop guard adapter
 *
 * The native Vertex and AI Studio loops keep history as `{ role, parts[] }`,
 * where a part is a `functionCall` (tool invocation) or `functionResponse`
 * (its result). Vertex already had `createContextGuard`, but it is STOP-ONLY:
 * it breaks the loop and synthesizes from whatever it has, ending the turn
 * early. AI Studio had no guard at all.
 *
 * Both now reclaim and continue via the shared policy, falling back to the
 * historic stop only when reclaiming changes nothing.
 *
 * The reclaim POLICY is tested in continuous-test-suite-loop-guard-core.ts.
 * This suite covers the Gemini SHAPE MAPPING and the decision boundary.
 *
 * No API keys, no network, no LLM — pure function assertions.
 *
 * Run: npx tsx test/continuous-test-suite-gemini-guard.ts
 *      pnpm run test:gemini-guard
 */

import {
  planGeminiLoopReclaim,
  previewGeminiToolResponseText,
  isGeminiToolResponseContent,
} from "../src/lib/context/geminiLoopGuard.js";
import type { GeminiGuardContent } from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("Gemini loop guard");

/**
 * NOTE: assertion messages must NEVER interpolate payloads — the harness
 * downgrades a throw to SKIP when the text matches `isExpectedProviderError()`,
 * silently turning a failure into ⊘.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/** One agent step in Gemini shape: a model call turn, then a user result turn. */
function step(i: number, outputChars: number): GeminiGuardContent[] {
  return [
    {
      role: "model",
      parts: [
        { functionCall: { name: "read_file", args: { path: `/f${i}` } } },
      ],
    },
    {
      role: "user",
      parts: [
        {
          functionResponse: {
            name: "read_file",
            response: { result: "x".repeat(outputChars) },
          },
        },
      ],
    },
  ];
}

const plan = (contents: GeminiGuardContent[], observedPromptTokens?: number) =>
  planGeminiLoopReclaim({
    contents,
    availableInputTokens: 100_000,
    provider: "vertex",
    ...(observedPromptTokens !== undefined ? { observedPromptTokens } : {}),
  });

await runSuite(async () => {
  section("A loop that fits must be left alone");

  await test("short history returns undefined", async () => {
    const contents: GeminiGuardContent[] = [
      { role: "user", parts: [{ text: "hello" }] },
      ...step(1, 200),
    ];
    assert(plan(contents) === undefined, "guard acted on a history that fits");
  });

  await test("text-only history returns undefined", async () => {
    const contents: GeminiGuardContent[] = [
      { role: "user", parts: [{ text: "hi" }] },
      { role: "model", parts: [{ text: "hello" }] },
    ];
    assert(plan(contents) === undefined, "guard acted on a text-only history");
  });

  section("Part classification");

  await test("functionResponse turns are recognised", async () => {
    const [callTurn, resultTurn] = step(1, 100);
    assert(
      isGeminiToolResponseContent(resultTurn),
      "a functionResponse turn was not recognised",
    );
    assert(
      !isGeminiToolResponseContent(callTurn),
      "a functionCall turn was misread as a response",
    );
  });

  await test("a text-only turn is not a tool turn", async () => {
    assert(
      !isGeminiToolResponseContent({ role: "user", parts: [{ text: "hi" }] }),
      "a plain text turn was misread as a tool response",
    );
  });

  section("Reclaim decisions");

  await test("fires and never proposes the first turn", async () => {
    const contents: GeminiGuardContent[] = [
      { role: "user", parts: [{ text: "THE ORIGINAL TASK" }] },
    ];
    for (let i = 0; i < 60; i++) {
      contents.push(...step(i, 30_000));
    }
    const result = plan(contents);
    assert(result !== undefined, "guard did not fire on an over-budget loop");
    assert(!result!.drop.includes(0), "guard proposed dropping the task turn");
    assert(
      !result!.truncate.includes(0),
      "guard proposed editing the task turn",
    );
  });

  await test("dropped indices cover whole call/response pairs", async () => {
    const contents: GeminiGuardContent[] = [
      { role: "user", parts: [{ text: "start" }] },
    ];
    for (let i = 0; i < 300; i++) {
      contents.push(...step(i, 1_200));
    }
    const result = plan(contents);
    assert(result !== undefined, "guard did not fire");
    const dropped = new Set(result!.drop);
    const survivors = contents.filter((_, i) => !dropped.has(i));

    // Gemini rejects a functionResponse with no preceding functionCall.
    let openCalls = 0;
    let orphans = 0;
    for (const content of survivors) {
      const hasCall = content.parts.some(
        (p) => !!(p as { functionCall?: unknown }).functionCall,
      );
      const hasResp = content.parts.some(
        (p) => !!(p as { functionResponse?: unknown }).functionResponse,
      );
      if (hasCall) {
        openCalls++;
      }
      if (hasResp) {
        if (openCalls === 0) {
          orphans++;
        } else {
          openCalls--;
        }
      }
    }
    assert(orphans === 0, "a dropped batch left an orphaned functionResponse");
    assert(openCalls === 0, "a dropped batch left a functionCall unanswered");
  });

  await test("small responses force drops rather than stalling", async () => {
    const contents: GeminiGuardContent[] = [
      { role: "user", parts: [{ text: "start" }] },
    ];
    for (let i = 0; i < 300; i++) {
      contents.push(...step(i, 1_200));
    }
    const result = plan(contents);
    assert(result !== undefined, "guard did not fire");
    assert(
      result!.drop.length > 0,
      "guard proposed no drops where truncation cannot help",
    );
  });

  await test("reclaim converges below the low-water mark", async () => {
    const contents: GeminiGuardContent[] = [
      { role: "user", parts: [{ text: "start" }] },
    ];
    for (let i = 0; i < 300; i++) {
      contents.push(...step(i, 1_200));
    }
    const result = plan(contents)!;
    assert(
      result.projectedTokens <= 100_000 * 0.6,
      "reclaim did not reach the low-water mark",
    );
  });

  section("Preview helper");

  await test("oversized text shrinks, small text is untouched", async () => {
    const small = "short";
    assert(
      previewGeminiToolResponseText(small) === small,
      "small response was rewritten",
    );
    const large = "y".repeat(50_000);
    const preview = previewGeminiToolResponseText(large);
    assert(preview.length < large.length, "large response was not shrunk");
    assert(preview.length > 0, "preview collapsed to nothing");
  });

  section("Usage calibration");

  await test("a zero observed prompt count is ignored safely", async () => {
    const contents: GeminiGuardContent[] = [
      { role: "user", parts: [{ text: "hi" }] },
      ...step(1, 100),
    ];
    assert(
      plan(contents, 0) === undefined,
      "zero observed tokens perturbed the decision",
    );
  });

  await test("a higher observed count makes the guard no less eager", async () => {
    const contents: GeminiGuardContent[] = [
      { role: "user", parts: [{ text: "start" }] },
    ];
    for (let i = 0; i < 20; i++) {
      contents.push(...step(i, 12_000));
    }
    const plain = plan(contents);
    const calibrated = plan(contents, 300_000);
    assert(
      plain === undefined || calibrated !== undefined,
      "calibration made the guard less eager than the raw estimate",
    );
  });
});

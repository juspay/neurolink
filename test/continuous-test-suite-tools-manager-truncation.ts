#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — ToolsManager shape-safe truncation (BZ-666
 * follow-up, rule 15 determinism exception).
 *
 * ALL-SRC module graph (rule 15): every import below resolves to
 * `../src/...`. This is the deliberate, documented exception to rule 15's
 * "one module graph per suite, end-to-end tests only" mandate.
 *
 * `ToolsManager` (src/lib/core/modules/ToolsManager.ts) and the
 * `generateToolOutputPreview` / `DEFAULT_MAX_PREVIEW_BYTES` /
 * `RETRIEVE_CONTEXT_TOOL_NAME` exports of `src/lib/context/toolOutputLimits.ts`
 * have no exported surface at all: neither module is reachable through
 * package.json's `exports` map (`.`, `./client`, `./types`, `./cli`,
 * `./server`, `./browser`, ... — none resolves into `src/lib/core/modules/`
 * or `src/lib/context/`), and `ToolsManager` itself is a `private readonly`
 * field on `BaseProvider` with no getter. The only way a live `generate()`/
 * `stream()` call reaches this code is by driving a real (or fully mocked)
 * model tool-call loop with an oversized tool result and inspecting what the
 * model received back — which cannot deterministically pin:
 *
 *   - which of two envelope shapes (top-level `{content:[...]}`, or the same
 *     nested under `data` the way NeuroLink's own `executeExternalMCPTool`/
 *     `{success,data}` wrapper produces it) is recognized and preserved,
 *     versus falling through to the legacy `_truncated` sentinel;
 *   - that `isError` and non-text content items (an `image` item alongside
 *     an oversized `text` one) survive the rewrite untouched;
 *   - that the omission notice omits `retrieve_context` specifically when
 *     that tool is not registered on the instance, and names it when it is
 *     — a fact about this instance's own tool registry, not about any
 *     provider's wire format, and not observable by inspecting model output;
 *   - that a configured `outputTruncationMaxBytes` actually moves where the
 *     cut lands, as opposed to the compiled-in 51,200-byte default.
 *
 * No API keys, no network, no LLM.
 *
 * Run: npx tsx test/continuous-test-suite-tools-manager-truncation.ts
 *      pnpm run test:tools-manager-truncation
 */

import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { ToolsManager } from "../src/lib/core/modules/ToolsManager.js";
import {
  DEFAULT_MAX_PREVIEW_BYTES,
  RETRIEVE_CONTEXT_TOOL_NAME,
} from "../src/lib/context/toolOutputLimits.js";
import { AIProviderName } from "../src/lib/constants/enums.js";
import type { NeuroLink } from "../src/lib/neurolink.js";
import type { ToolConfig } from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("ToolsManager shape-safe truncation", {
  offline: true,
});

// ---------------------------------------------------------------------------
// Fakes — only the members ToolsManager actually reads off `neurolink`
// (resolveTruncationMaxBytes / resolveTruncationNotice / emitToolEvent's
// guarded getEventEmitter?.() check, which we simply omit so it no-ops).
// ---------------------------------------------------------------------------

function stubNeuroLink(opts: {
  outputTruncationMaxBytes?: number;
  registerRetrieveContext?: boolean;
}): NeuroLink {
  const customTools = new Map<string, unknown>();
  if (opts.registerRetrieveContext) {
    customTools.set(RETRIEVE_CONTEXT_TOOL_NAME, {});
  }
  const toolsConfig: ToolConfig | undefined =
    opts.outputTruncationMaxBytes === undefined
      ? undefined
      : { outputTruncationMaxBytes: opts.outputTruncationMaxBytes };
  return {
    getToolsConfig: (): ToolConfig | undefined => toolsConfig,
    getCustomTools: () => customTools,
  } as unknown as NeuroLink;
}

/**
 * Build a ToolsManager with one direct tool named "probe" and run it through
 * the exact wrap that `getAllTools()` applies — `wrapExecuteWithTruncation`
 * via `processDirectTools` — the same wrapping every provider's tool-call
 * loop invokes.
 */
async function runProbe(
  execute: (params: unknown) => Promise<unknown>,
  stub: NeuroLink,
): Promise<unknown> {
  const manager = new ToolsManager(
    AIProviderName.ANTHROPIC,
    { probe: { description: "probe tool", execute } },
    stub,
  );
  const tools = await manager.getAllTools();
  const probe = tools.probe as unknown as {
    execute?: (params: unknown, execOptions?: unknown) => Promise<unknown>;
  };
  assert(typeof probe?.execute === "function", "probe tool has no execute()");
  return probe.execute!({});
}

type Envelope = {
  content: Array<Record<string, unknown>>;
  isError?: boolean;
};

function textItem(text: string): Record<string, unknown> {
  return { type: "text", text };
}

const BIG_TEXT = "A".repeat(60_000); // exactly 60,000 bytes (ASCII)

// ---------------------------------------------------------------------------

await test("oversized top-level MCP envelope: content preserved, text truncated within budget, isError kept, no retrieve_context mention when unregistered", async () => {
  const stub = stubNeuroLink({}); // no config override, retrieve_context NOT registered
  const result = (await runProbe(
    async () => ({ content: [textItem(BIG_TEXT)], isError: false }),
    stub,
  )) as Envelope;

  assert(Array.isArray(result.content), "envelope content array preserved");
  assertEqual(result.content.length, 1, "single content item preserved");
  assertEqual(result.isError, false, "isError preserved");
  const text = result.content[0]?.text as string;
  assert(typeof text === "string", "text item still a string");
  const bytes = Buffer.byteLength(text, "utf-8");
  assert(
    bytes < BIG_TEXT.length,
    `text should be smaller than the original 60,000 bytes, got ${bytes}`,
  );
  assert(
    bytes <= DEFAULT_MAX_PREVIEW_BYTES + 500,
    `truncated text (${bytes}b) should land near the ${DEFAULT_MAX_PREVIEW_BYTES}b default budget`,
  );
  assert(
    !text.includes(RETRIEVE_CONTEXT_TOOL_NAME),
    "notice must not name retrieve_context when it isn't registered",
  );
});

await test("oversized MCP envelope nested under `data` (executeExternalMCPTool wrapper shape) is preserved the same way", async () => {
  const stub = stubNeuroLink({});
  const result = (await runProbe(
    async () => ({
      success: true,
      data: { content: [textItem(BIG_TEXT)], isError: false },
    }),
    stub,
  )) as { success: boolean; data: Envelope };

  assertEqual(result.success, true, "wrapper's own top-level fields preserved");
  assert(
    Array.isArray(result.data?.content),
    "nested envelope content array preserved",
  );
  assertEqual(result.data.isError, false, "nested isError preserved");
  const text = result.data.content[0]?.text as string;
  const bytes = Buffer.byteLength(text, "utf-8");
  assert(
    bytes < BIG_TEXT.length,
    `nested text should be truncated, got ${bytes} bytes`,
  );
});

await test("default notice names retrieve_context when that tool IS registered on the instance", async () => {
  const stub = stubNeuroLink({ registerRetrieveContext: true });
  const result = (await runProbe(
    async () => ({ content: [textItem(BIG_TEXT)], isError: false }),
    stub,
  )) as Envelope;

  const text = result.content[0]?.text as string;
  assert(
    text.includes(RETRIEVE_CONTEXT_TOOL_NAME),
    "notice should name retrieve_context once it is actually registered",
  );
});

await test("isError:true survives truncation", async () => {
  const stub = stubNeuroLink({});
  const result = (await runProbe(
    async () => ({ content: [textItem(BIG_TEXT)], isError: true }),
    stub,
  )) as Envelope;

  assertEqual(
    result.isError,
    true,
    "isError:true must be preserved, not dropped",
  );
});

await test("non-text content items pass through untouched alongside a truncated text item", async () => {
  const stub = stubNeuroLink({});
  const imageItem = { type: "image", data: "base64==", mimeType: "image/png" };
  const result = (await runProbe(
    async () => ({ content: [imageItem, textItem(BIG_TEXT)], isError: false }),
    stub,
  )) as Envelope;

  assertEqual(result.content.length, 2, "both content items preserved");
  assertEqual(
    result.content[0],
    imageItem,
    "non-text item passed through byte-for-byte, untouched",
  );
  const text = result.content[1]?.text as string;
  assert(
    Buffer.byteLength(text, "utf-8") < BIG_TEXT.length,
    "the text item alongside it is still truncated",
  );
});

await test("configured outputTruncationMaxBytes moves where the cut lands", async () => {
  const smallBudget = 2_048;
  const stub = stubNeuroLink({ outputTruncationMaxBytes: smallBudget });
  const mediumText = "B".repeat(5_000); // over the 2,048 budget, well under the 51,200 default
  const result = (await runProbe(
    async () => ({ content: [textItem(mediumText)], isError: false }),
    stub,
  )) as Envelope;

  const text = result.content[0]?.text as string;
  const bytes = Buffer.byteLength(text, "utf-8");
  assert(
    bytes < mediumText.length,
    `5,000-byte text should be truncated against a 2,048-byte budget, got ${bytes}`,
  );
  assert(
    bytes <= smallBudget + 500,
    `truncated text (${bytes}b) should land near the configured ${smallBudget}b budget, not the 51,200 default`,
  );
});

await test("envelope within budget is returned unchanged", async () => {
  const stub = stubNeuroLink({});
  const smallText = "small output";
  const result = (await runProbe(
    async () => ({ content: [textItem(smallText)], isError: false }),
    stub,
  )) as Envelope;

  assertEqual(result.content[0]?.text, smallText, "text left untouched");
  assertEqual(result.isError, false, "isError untouched");
});

await test("oversized envelope where no single text item exceeds the budget is still bounded to the budget, shape preserved (Yama MAJOR on #1622)", async () => {
  const stub = stubNeuroLink({});
  // 20 items of ~3KB each = ~60KB total, every individual item well under
  // the 51,200-byte default. Before the fix this returned unchanged — the
  // ceiling was enforced per item only, so the envelope total was unbounded.
  const items = Array.from({ length: 20 }, () => textItem("C".repeat(3_000)));
  const result = (await runProbe(
    async () => ({ content: items, isError: false }),
    stub,
  )) as Envelope & { _truncated?: boolean };

  assert(
    result._truncated === undefined,
    "must not fall back to the generic sentinel when the shape can be kept within budget",
  );
  assertEqual(result.content.length, 20, "all items preserved");
  assertEqual(result.isError, false, "isError preserved");
  const total = Buffer.byteLength(JSON.stringify(result), "utf-8");
  assert(
    total <= DEFAULT_MAX_PREVIEW_BYTES,
    `serialized envelope (${total}b) must not exceed the ${DEFAULT_MAX_PREVIEW_BYTES}b budget`,
  );
  const perItem = result.content.map((item) =>
    Buffer.byteLength(item.text as string, "utf-8"),
  );
  assert(
    perItem.every((bytes) => bytes < 3_000),
    `every item should have given up some bytes to fit the envelope, got ${JSON.stringify(perItem)}`,
  );
});

await test("many moderate text items (5 x 40KB) are bounded to the envelope budget with all items and isError preserved", async () => {
  const stub = stubNeuroLink({});
  const items = Array.from({ length: 5 }, (_, i) =>
    textItem(String.fromCharCode(69 + i).repeat(40_000)),
  );
  const result = (await runProbe(
    async () => ({ content: items, isError: true }),
    stub,
  )) as Envelope & { _truncated?: boolean };

  assert(result._truncated === undefined, "shape preserved, not the sentinel");
  assertEqual(result.content.length, 5, "all five items preserved");
  assertEqual(result.isError, true, "isError preserved");
  const total = Buffer.byteLength(JSON.stringify(result), "utf-8");
  assert(
    total <= DEFAULT_MAX_PREVIEW_BYTES,
    `serialized envelope (${total}b) must not exceed the ${DEFAULT_MAX_PREVIEW_BYTES}b budget (was ~200KB unchanged before the fix)`,
  );
  for (const [i, item] of result.content.entries()) {
    const text = item.text as string;
    assert(
      text.startsWith(String.fromCharCode(69 + i)) &&
        text.endsWith(String.fromCharCode(69 + i)),
      `item ${i} should keep head and tail of its own text`,
    );
  }
});

await test("a single oversized text item alongside a small non-text item: text trimmed, non-text untouched, envelope within budget", async () => {
  const stub = stubNeuroLink({});
  const image = {
    type: "image",
    data: "I".repeat(10_000),
    mimeType: "image/png",
  };
  const result = (await runProbe(
    async () => ({ content: [textItem(BIG_TEXT), image] }),
    stub,
  )) as Envelope & { _truncated?: boolean };

  assert(result._truncated === undefined, "shape preserved, not the sentinel");
  assertEqual(result.content.length, 2, "both items preserved");
  assertEqual(
    result.content[1]?.data,
    image.data,
    "the non-text item must pass through byte-for-byte",
  );
  const total = Buffer.byteLength(JSON.stringify(result), "utf-8");
  assert(
    total <= DEFAULT_MAX_PREVIEW_BYTES,
    `serialized envelope (${total}b) must not exceed the ${DEFAULT_MAX_PREVIEW_BYTES}b budget`,
  );
});

await test("an envelope whose non-text payload alone exceeds the budget falls back to the bounded sentinel instead of being returned untruncated", async () => {
  const stub = stubNeuroLink({});
  const result = (await runProbe(
    async () => ({
      content: [
        textItem("small caption"),
        { type: "image", data: "J".repeat(60_000), mimeType: "image/png" },
      ],
    }),
    stub,
  )) as { _truncated?: boolean; _originalSize?: number; _preview?: string };

  assertEqual(
    result._truncated,
    true,
    "no text trimming can honour the ceiling here, so the sentinel must bound it",
  );
  assert(
    typeof result._originalSize === "number" && result._originalSize > 60_000,
    "sentinel carries the original size",
  );
  const total = Buffer.byteLength(JSON.stringify(result), "utf-8");
  assert(
    total <= DEFAULT_MAX_PREVIEW_BYTES + 500,
    `sentinel (${total}b) must land near the ${DEFAULT_MAX_PREVIEW_BYTES}b budget, not carry the 60KB item`,
  );
});

await test("a plain oversized object with no MCP envelope shape still gets the legacy sentinel (compat)", async () => {
  const stub = stubNeuroLink({});
  const result = (await runProbe(
    async () => ({ foo: "D".repeat(60_000), bar: 123 }),
    stub,
  )) as { _truncated?: boolean; _originalSize?: number; _preview?: string };

  assertEqual(
    result._truncated,
    true,
    "objects that aren't a recognized MCP envelope still use the sentinel",
  );
  assert(
    typeof result._originalSize === "number" && result._originalSize > 60_000,
    "sentinel carries the original size",
  );
  assert(
    typeof result._preview === "string",
    "sentinel carries a preview string",
  );
});

await runSuite();

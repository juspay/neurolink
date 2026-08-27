#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Artifact Banking (N3)
 *
 * Drives the shipped surface only — `NeuroLink` from `../dist/index.js`:
 *   bankArtifact() / readArtifact() / getArtifactStore() as the host API, and
 *   executeTool("retrieve_context", …) as the exact path a model read-back
 *   takes (same registry, same result envelope).
 *
 * The contract under test is "bank the whole payload, hand back a pointer":
 * previews are bounded, the FILE is not, and every byte comes back through the
 * tool that already existed. So the load-bearing assertions are byte-exact
 * round trips, not "looks about right".
 *
 * Covered: lazy store creation with no MCP config at all, preview bounding and
 * its hard cap, UTF-8 byte accounting, byte-exact paging back through
 * retrieve_context, host-side reads, unknown ids, path-traversal ids, the
 * cross-process sidecar path (N3.3, a real second node process), and one live
 * run where the model reads back content it was never shown.
 *
 * Every mechanical case runs without credentials; only the live case SKIPs.
 *
 * Run: pnpm run test:artifact-banking [--provider=vertex]
 */

// See test:hitl and test:multimodal:sdk: the tracked .mcp-config.json makes
// every NeuroLink instance wait the full 60s MCP client timeout when the
// filesystem server cannot start. Measured here at 68s without this and 7s
// with it, same assertions either way.
process.env.NEUROLINK_SKIP_MCP = "true";

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
  runCommand,
  tempDir,
  Skip,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink } from "../dist/index.js";
import type { BankedArtifactRef } from "../src/lib/types/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST_ENTRY = join(REPO_ROOT, "dist", "index.js");

const { test, runSuite, opts, section } = defineSuite("Artifact Banking", {
  defaultProvider: "vertex",
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Host = InstanceType<typeof NeuroLink>;

/** The registry wraps every tool result: `{ success, data, usage, metadata }`. */
type ToolEnvelope = { success?: boolean; data?: unknown };

/** What retrieve_context returns on the artifact path. */
type ArtifactPage = {
  artifactId?: string;
  content?: string;
  totalSize?: number;
  hasMore?: boolean;
  offset?: number;
  limit?: number;
  error?: string;
};

function unwrap(envelope: unknown): unknown {
  const record = envelope as ToolEnvelope | undefined;
  return record && typeof record === "object" && "data" in record
    ? record.data
    : envelope;
}

function asPage(envelope: unknown): ArtifactPage {
  const payload = unwrap(envelope);
  assert(
    !!payload && typeof payload === "object",
    "retrieve_context must return an object",
  );
  return payload as ArtifactPage;
}

/** Compare large strings by digest — never by pasting them into a message. */
function digest(value: string): string {
  return createHash("sha256").update(value, "utf-8").digest("hex").slice(0, 16);
}

/**
 * Deterministic filler with a marker buried past any preview, so "did the
 * whole payload survive?" and "did the model actually read it back?" are both
 * answerable without inspecting content by eye.
 */
function payloadOf(chars: number, marker: string): string {
  const filler = "0123456789abcdef-";
  let out = "";
  while (out.length < chars) {
    out += filler;
  }
  out = out.slice(0, chars);
  const at = Math.floor(chars * 0.75);
  return out.slice(0, at) + marker + out.slice(at + marker.length);
}

async function toolNames(host: Host): Promise<string[]> {
  const tools = await host.getAllAvailableTools();
  return tools.map((tool: { name: string }) => tool.name);
}

function readPage(
  host: Host,
  artifactId: string,
  offset: number,
  limit: number,
): Promise<unknown> {
  return host.executeTool("retrieve_context", { artifactId, offset, limit });
}

/** Walk an artifact back through the model-facing tool, one window at a time. */
async function pageBackThroughTool(
  host: Host,
  artifactId: string,
  window: number,
): Promise<{ content: string; pages: number; totalSize: number }> {
  let content = "";
  let offset = 0;
  let pages = 0;
  for (;;) {
    const page = asPage(await readPage(host, artifactId, offset, window));
    assert(!page.error, "paging must not error mid-walk");
    assert(typeof page.content === "string", "a page must carry content");
    content += page.content ?? "";
    pages += 1;
    if (!page.hasMore) {
      return { content, pages, totalSize: page.totalSize ?? 0 };
    }
    offset += (page.content ?? "").length;
    assert(pages < 500, "paging failed to terminate");
  }
}

const MB_CHARS = 1_048_576;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

await runSuite(async () => {
  section("The store is created on demand (no mcp.outputLimits required)");

  await test("a bare instance has no retrieve_context until something banks", async () => {
    const host = new NeuroLink();
    assertEqual(
      (await toolNames(host)).includes("retrieve_context"),
      false,
      "nothing should register a read-back tool before there is anything to read",
    );
    await host.bankArtifact("hello", { kind: "other", label: "smoke" });
    assertEqual(
      (await toolNames(host)).includes("retrieve_context"),
      true,
      "banking must make the payload reachable by the MODEL, not just the host",
    );
  });

  await test("getArtifactStore is idempotent and returns one store", async () => {
    const host = new NeuroLink();
    const first = host.getArtifactStore();
    const second = host.getArtifactStore();
    assertEqual(first, second, "a second call must not swap the backing store");
  });

  await test("banking reuses the store an externalize config already made", async () => {
    const host = new NeuroLink({
      mcp: { outputLimits: { strategy: "externalize" } },
    });
    assertEqual(
      (await toolNames(host)).includes("retrieve_context"),
      true,
      "the configured path registers retrieve_context at construction",
    );
    const ref = await host.bankArtifact("configured", {
      kind: "stage-output",
      label: "warmup",
    });
    assertEqual(await host.readArtifact(ref.artifactId), "configured");
  });

  section("Previews are bounded — the payload never is");

  await test("1 MB banks whole, previews at the 1000-char default", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(MB_CHARS, "MARKER-DEFAULT");
    const ref: BankedArtifactRef = await host.bankArtifact(payload, {
      kind: "worker-report",
      label: "delegate:auth-review",
    });

    assertEqual(ref.sizeBytes, Buffer.byteLength(payload, "utf-8"));
    assertEqual(ref.kind, "worker-report");
    assertEqual(ref.label, "delegate:auth-review");
    assertEqual(
      ref.preview.length,
      1001,
      "1000 characters plus the elision mark",
    );
    assertEqual(
      ref.preview.slice(0, 1000),
      payload.slice(0, 1000),
      "the preview is a head slice, not a summary",
    );
    assertIncludes(ref.readBackHint, "retrieve_context");
    assertIncludes(ref.readBackHint, ref.artifactId);

    const back = await host.readArtifact(ref.artifactId);
    assert(back !== null, "the banked artifact must be readable");
    assertEqual(
      digest(back ?? ""),
      digest(payload),
      "the stored payload must be byte-identical to what was banked",
    );
  });

  await test("previewChars is honoured and capped at 4000", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(20_000, "MARKER-CAP");
    const tiny = await host.bankArtifact(payload, {
      kind: "other",
      label: "tiny-preview",
      previewChars: 50,
    });
    assertEqual(tiny.preview.length, 51);

    const greedy = await host.bankArtifact(payload, {
      kind: "other",
      label: "greedy-preview",
      previewChars: 999_999,
    });
    assertEqual(
      greedy.preview.length,
      4001,
      "a preview past the cap would recreate the context pressure banking removes",
    );
    assertEqual(
      digest((await host.readArtifact(greedy.artifactId)) ?? ""),
      digest(payload),
      "a small preview must not mean a small file",
    );
  });

  await test("a payload shorter than the budget previews whole, unmarked", async () => {
    const host = new NeuroLink();
    const ref = await host.bankArtifact("short report", {
      kind: "stage-output",
      label: "collate",
    });
    assertEqual(ref.preview, "short report");
    assertEqual(ref.preview.endsWith("…"), false);
  });

  await test("sizeBytes counts UTF-8 bytes, not characters", async () => {
    const host = new NeuroLink();
    const payload = "héllo — 世界";
    const ref = await host.bankArtifact(payload, {
      kind: "other",
      label: "utf8",
    });
    assertEqual(ref.sizeBytes, Buffer.byteLength(payload, "utf-8"));
    assert(
      ref.sizeBytes > payload.length,
      "multi-byte characters must not be counted as one byte each",
    );
    assertEqual(await host.readArtifact(ref.artifactId), payload);
  });

  await test("a blank label falls back to the kind rather than banking nameless", async () => {
    const host = new NeuroLink();
    const ref = await host.bankArtifact("x", {
      kind: "command-output",
      label: "   ",
    });
    assertEqual(ref.label, "command-output");
  });

  section("Read-back is the existing retrieve_context tool");

  await test("1 MB pages back byte-exact through retrieve_context", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(MB_CHARS, "MARKER-PAGED");
    const ref = await host.bankArtifact(payload, {
      kind: "worker-report",
      label: "delegate:paging",
    });

    const walked = await pageBackThroughTool(host, ref.artifactId, 100_000);
    assertEqual(walked.totalSize, payload.length, "totalSize is the full size");
    assertEqual(walked.pages, 11, "1 MB in 100k windows is 11 pages");
    assertEqual(
      digest(walked.content),
      digest(payload),
      "the reassembled pages must equal the banked payload exactly",
    );
    assert(
      walked.content.includes("MARKER-PAGED"),
      "content past the preview must survive the round trip",
    );
  });

  await test("offset and limit address the payload precisely", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(5_000, "MARKER-SLICE");
    const ref = await host.bankArtifact(payload, {
      kind: "other",
      label: "slice",
    });
    const page = asPage(await readPage(host, ref.artifactId, 1_000, 250));
    assertEqual(page.offset, 1_000);
    assertEqual(page.content, payload.slice(1_000, 1_250));
    assertEqual(page.totalSize, payload.length);
    assertEqual(page.hasMore, true);

    const tail = asPage(await readPage(host, ref.artifactId, 4_900, 500));
    assertEqual(tail.content, payload.slice(4_900));
    assertEqual(tail.hasMore, false);
  });

  await test("json payloads round trip as json", async () => {
    const host = new NeuroLink();
    const payload = JSON.stringify({
      findings: Array.from({ length: 500 }, (_, i) => ({
        id: `f${i}`,
        severity: "low",
      })),
    });
    const ref = await host.bankArtifact(payload, {
      kind: "stage-output",
      label: "findings",
      contentType: "json",
    });
    const page = asPage(
      await readPage(host, ref.artifactId, 0, payload.length),
    );
    assertEqual(page.content, payload);
    assertEqual(
      JSON.parse(page.content ?? "").findings.length,
      500,
      "the round trip must survive JSON.parse",
    );
  });

  await test("host readArtifact windows the same way the tool does", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(3_000, "MARKER-HOST");
    const ref = await host.bankArtifact(payload, {
      kind: "other",
      label: "host-read",
    });
    assertEqual(await host.readArtifact(ref.artifactId), payload);
    assertEqual(
      await host.readArtifact(ref.artifactId, { offset: 100, limit: 40 }),
      payload.slice(100, 140),
    );
    assertEqual(
      await host.readArtifact(ref.artifactId, { offset: 2_900 }),
      payload.slice(2_900),
      "an omitted limit means the rest, not a hidden cap",
    );
  });

  section("Missing and hostile ids");

  await test("an unknown id reads as null and refuses through the tool", async () => {
    const host = new NeuroLink();
    await host.bankArtifact("anything", { kind: "other", label: "seed" });
    assertEqual(await host.readArtifact("no-such-artifact-id"), null);
    const page = asPage(await readPage(host, "no-such-artifact-id", 0, 100));
    assert(
      typeof page.error === "string",
      "the model must be told the artifact is gone, not handed empty content",
    );
    assertEqual(page.content, undefined);
  });

  await test("a traversal id never becomes a path", async () => {
    // The index-miss fallback probes join(dir, id + ext), and ids reach it
    // straight from the model. Anything with a separator or a dot has to be
    // rejected before the filesystem is touched.
    const host = new NeuroLink();
    const ref = await host.bankArtifact("seed", {
      kind: "other",
      label: "seed",
    });

    // Non-vacuous case first: this id resolves, character for character, to a
    // file that DOES exist — the seed artifact's own sidecar. Without the id
    // guard the probe would read it back; the null is the guard working, not
    // a missing file.
    assertEqual(
      await host.readArtifact(`../neurolink-artifacts/${ref.artifactId}`),
      null,
      "a separator in an id must be refused even when the path it builds exists",
    );

    for (const hostile of [
      "../../../../etc/passwd",
      "..",
      "sub/dir",
      "id.with.dots",
      "",
    ]) {
      assertEqual(
        await host.readArtifact(hostile),
        null,
        "an unsafe id must resolve to nothing",
      );
    }

    // The real id still works — the guard rejects shapes, not everything.
    assertEqual(await host.readArtifact(ref.artifactId), "seed");
  });

  section("Cross-process retrieval via the sidecar (N3.3)");

  await test("a second node process reads an artifact it never stored", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(64_000, "MARKER-CROSS-PROCESS");
    const ref = await host.bankArtifact(payload, {
      kind: "command-output",
      label: "cross-process",
    });

    // A genuinely separate process: its LocalTempArtifactStore starts with an
    // empty in-memory index, so the read can only succeed through the sidecar.
    const script = [
      "import { NeuroLink } from " + JSON.stringify(DIST_ENTRY) + ";",
      "const content = await new NeuroLink().readArtifact(process.argv[2]);",
      'console.log("RESULT:" + (content === null ? "null" : content.length));',
      "process.exit(0);",
    ].join("\n");
    const scriptPath = join(tempDir("neurolink-bank-"), "reader.mjs");
    writeFileSync(scriptPath, script, "utf-8");

    const result = await runCommand("node", [scriptPath, ref.artifactId], {
      cwd: REPO_ROOT,
      timeoutMs: 120_000,
    });
    const reported = /RESULT:(\S+)/.exec(result.stdout)?.[1];
    assert(
      reported !== undefined,
      `the child process printed no result (exit ${result.exitCode})`,
    );
    assertEqual(
      reported,
      String(payload.length),
      "a process that never called store() must still resolve the id",
    );
  });

  section("Live model read-back");

  await test("the model pulls content it was never shown", async () => {
    if (!opts.provider) {
      throw new Skip("no provider configured");
    }
    const host = new NeuroLink();
    const secret = "ZEBRA-4417-QUARTZ";
    const payload = payloadOf(6_000, secret);
    const ref = await host.bankArtifact(payload, {
      kind: "worker-report",
      label: "delegate:live",
      previewChars: 120,
    });
    assertEqual(
      ref.preview.includes(secret),
      false,
      "the preview must not contain the marker, or the test proves nothing",
    );

    let content: string;
    try {
      const result = await host.generate({
        input: {
          text:
            "A worker report was banked as an artifact. Preview:\n" +
            ref.preview +
            "\n\nRead the FULL report with " +
            ref.readBackHint +
            "\nIt contains one token of the form WORD-DIGITS-WORD. " +
            "Reply with that token and nothing else.",
        },
        provider: opts.provider,
        ...(opts.model ? { model: opts.model } : {}),
        maxSteps: 8,
        timeout: 120_000,
      });
      content = result.content;
    } catch (error) {
      throw new Skip(
        `provider "${opts.provider}" unavailable: ${
          error instanceof Error ? error.message.slice(0, 160) : String(error)
        }`,
      );
    }
    assert(
      content.includes(secret),
      "the model must have paged the banked file — the marker was not in its context otherwise",
    );
  });
});

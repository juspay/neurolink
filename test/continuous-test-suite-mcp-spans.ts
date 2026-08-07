#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — MCP Pipeline B span attributes (Curator P1-5)
 *
 * Issue #5 regression. NeuroLink-emitted spans (`neurolink.tool.execute`,
 * `neurolink.tool.registry.execute`, `neurolink.tools.execute_custom`) must
 * carry one of `mcp.tool.name` / `tool.name` / `gen_ai.tool.name` so per-
 * tool error analysis works in Langfuse.
 *
 * Strategy: REAL OpenTelemetry via InMemorySpanExporter. Register a real
 *           custom tool on the public SDK; invoke it via sdk.executeTool()
 *           (deterministic, no LLM needed). Inspect every span emitted;
 *           assert the tool-name attribute is present.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-mcp-spans.ts
 *      pnpm run test:mcp:spans
 *
 * Originally lived as Part 6 inside continuous-test-suite-mcp.ts. Split
 * out in May 2026 because the rest of mcp.ts has nothing to do with span
 * capture, and module-load ordering for installSpanCapture() doesn't
 * apply to the other Parts.
 */

// Install OTel span capture BEFORE importing NeuroLink so production
// tracers pick up the in-memory exporter.
import { installSpanCapture, dumpAttrs } from "./helpers/spanCapture.js";
const spans = installSpanCapture();

import { NeuroLink } from "../dist/index.js";
import { defineSuite, logSection } from "./helpers/harness.js";

import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { recordTest, runSuite } = defineSuite(
  "MCP Pipeline B span attributes (Issue #5)",
);

const NAME_KEYS = ["mcp.tool.name", "tool.name", "gen_ai.tool.name"];

function getToolNameAttr(
  attrs: Record<string, unknown>,
): { key: string; value: unknown } | null {
  for (const k of NAME_KEYS) {
    if (attrs[k] !== undefined) {
      return { key: k, value: attrs[k] };
    }
  }
  return null;
}

function record(
  name: string,
  outcome: "PASS" | "FAIL" | "SKIP",
  detail: string,
): void {
  recordTest(name, outcome === "PASS", outcome === "SKIP", detail);
}

async function dumpAllSpans(): Promise<void> {
  const testName = "5.X — DEBUG: enumerate every captured span";
  spans.reset();
  const sdk = new NeuroLink();
  sdk.registerTool("calc_dbg", {
    name: "calc_dbg",
    description: "debug",
    inputSchema: { type: "object", properties: {} },
    execute: async () => ({ ok: true }),
  });
  try {
    await sdk.executeTool("calc_dbg", {});
    await new Promise((r) => setTimeout(r, 200));
    const finished = spans.finished();
    if (finished.length === 0) {
      record(testName, "FAIL", "(no spans captured)");
      return;
    }
    const summary = finished
      .map((s) => {
        const a = dumpAttrs(s);
        const tn = getToolNameAttr(a);
        return `${s.name}[${tn ? tn.key + "=" + String(tn.value) : "no-name"}]`;
      })
      .join(", ");
    const exec = spans.byName("neurolink.tool.execute");
    if (!exec) {
      record(
        testName,
        "FAIL",
        `expected neurolink.tool.execute span; got: ${summary}`,
      );
      return;
    }
    const execTn = getToolNameAttr(dumpAttrs(exec));
    if (!execTn) {
      record(
        testName,
        "FAIL",
        `neurolink.tool.execute span has no tool-name attribute; spans=${summary}`,
      );
      return;
    }
    record(testName, "PASS", summary);
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function checkSuccessPath(): Promise<void> {
  const testName =
    "5.1 — custom tool success: tool-name on every Pipeline B span";
  spans.reset();
  const sdk = new NeuroLink();
  sdk.registerTool("calc_add", {
    name: "calc_add",
    description: "Add two numbers",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number" },
        b: { type: "number" },
      },
      required: ["a", "b"],
    },
    execute: async (params: { a?: number; b?: number }) => ({
      sum: (params.a ?? 0) + (params.b ?? 0),
    }),
  });
  try {
    await sdk.executeTool("calc_add", { a: 2, b: 3 });
    await new Promise((r) => setTimeout(r, 100));
    const targetSpanNames = [
      "neurolink.tool.execute",
      "neurolink.tool.registry.execute",
    ];
    const findings: string[] = [];
    for (const name of targetSpanNames) {
      const span = spans.byName(name);
      if (!span) {
        findings.push(`${name}: NOT EMITTED`);
        continue;
      }
      const attrs = dumpAttrs(span);
      const tn = getToolNameAttr(attrs);
      if (tn) {
        findings.push(`${name}: ${tn.key}=${String(tn.value)}`);
      } else {
        findings.push(`${name}: NO TOOL NAME ATTRIBUTE`);
      }
    }
    const allHaveName = findings.every((f) => !f.includes("NO TOOL NAME"));
    record(testName, allHaveName ? "PASS" : "FAIL", findings.join(" | "));
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function checkErrorPath(): Promise<void> {
  const testName = "5.2 — tool throws: tool-name still set on span";
  spans.reset();
  const sdk = new NeuroLink();
  sdk.registerTool("boom", {
    name: "boom",
    description: "Always throws",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      throw new Error("intentional");
    },
  });
  try {
    try {
      await sdk.executeTool("boom", {});
    } catch {
      /* expected */
    }
    await new Promise((r) => setTimeout(r, 100));
    const span = spans.byName("neurolink.tool.execute");
    if (!span) {
      record(testName, "FAIL", "neurolink.tool.execute span missing");
      return;
    }
    const attrs = dumpAttrs(span);
    const tn = getToolNameAttr(attrs);
    if (tn) {
      record(
        testName,
        "PASS",
        `${tn.key}=${String(tn.value)}; status=${span.status?.code ?? "?"}`,
      );
    } else {
      record(
        testName,
        "FAIL",
        `no tool-name on error span; attrs=${JSON.stringify(attrs).slice(0, 200)}`,
      );
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

async function checkBogusName(): Promise<void> {
  const testName = "5.6 — bogus tool name: span still carries requested name";
  spans.reset();
  const sdk = new NeuroLink();
  try {
    try {
      await sdk.executeTool("does_not_exist_xyz", {});
    } catch {
      /* expected */
    }
    await new Promise((r) => setTimeout(r, 100));
    const span = spans.byName("neurolink.tool.execute");
    if (!span) {
      record(testName, "FAIL", "neurolink.tool.execute span missing");
      return;
    }
    const attrs = dumpAttrs(span);
    const tn = getToolNameAttr(attrs);
    if (tn && tn.value === "does_not_exist_xyz") {
      record(
        testName,
        "PASS",
        `${tn.key}=${String(tn.value)}; status=${span.status?.code ?? "?"}`,
      );
    } else {
      const detail = tn
        ? `attr ${tn.key}=${String(tn.value)} (expected does_not_exist_xyz)`
        : `attr not found (expected does_not_exist_xyz)`;
      record(testName, "FAIL", detail);
    }
  } finally {
    await sdk.shutdown?.().catch(() => {});
  }
}

await runSuite(async () => {
  logSection("MCP Pipeline B span attributes (Issue #5 regression)");
  await dumpAllSpans();
  await checkSuccessPath();
  await checkErrorPath();
  await checkBogusName();
});

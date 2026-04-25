#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Issue #5 — mcp.tool.name on Pipeline B spans
 *
 * Curator P1-5: NeuroLink-emitted spans (`neurolink.tool.execute`,
 * `neurolink.tool.registry.execute`, `neurolink.tools.execute_custom`) must
 * carry `mcp.tool.name` / `tool.name` / `gen_ai.tool.name` so per-tool
 * error analysis works in Langfuse.
 *
 * Strategy: REAL OTel via InMemorySpanExporter. Register a real custom tool
 *           on the public SDK; invoke it via sdk.executeTool() (deterministic,
 *           no LLM needed). Inspect every span emitted; assert the tool-name
 *           attribute is present.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-issue-05-mcp-tool-name-spans.ts
 */
import "dotenv/config";

// Install OTel BEFORE importing NeuroLink so production tracers pick up the exporter.
import { installSpanCapture, dumpAttrs } from "./helpers/spanCapture.js";
const spans = installSpanCapture();

import { NeuroLink } from "../dist/index.js";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bright: "\x1b[1m",
};

type Outcome = "PASS" | "FAIL" | "SKIP";
const results: { name: string; outcome: Outcome; detail: string }[] = [];

function record(name: string, outcome: Outcome, detail: string): void {
  results.push({ name, outcome, detail });
  const color =
    outcome === "PASS"
      ? colors.green
      : outcome === "FAIL"
        ? colors.red
        : colors.yellow;
  console.log(`${color}[${outcome}]${colors.reset} ${name} — ${detail}`);
}

function section(t: string): void {
  console.log(
    `\n${colors.cyan}${"=".repeat(72)}\n  ${t}\n${"=".repeat(72)}${colors.reset}`,
  );
}

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
    const result = await sdk.executeTool("calc_add", { a: 2, b: 3 });
    void result;

    // Allow span exporter to flush
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
    if (allHaveName) {
      record(testName, "PASS", findings.join(" | "));
    } else {
      record(testName, "FAIL", findings.join(" | "));
    }
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
    } catch (err) {
      void err;
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
    } catch (err) {
      void err;
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

async function main(): Promise<void> {
  section("Issue #5 — Pipeline B spans must carry mcp.tool.name");
  await dumpAllSpans();
  await checkSuccessPath();
  await checkErrorPath();
  await checkBogusName();
  const passed = results.filter((r) => r.outcome === "PASS").length;
  const failed = results.filter((r) => r.outcome === "FAIL").length;
  const skipped = results.filter((r) => r.outcome === "SKIP").length;
  console.log(
    `\n${colors.bright}Results:${colors.reset} ${passed} passed, ${failed} failed, ${skipped} skipped`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

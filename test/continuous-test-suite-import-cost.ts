#!/usr/bin/env tsx
/**
 * Continuous Test Suite: what `import { NeuroLink } from "@juspay/neurolink"`
 * loads.
 *
 * Importing the package used to load about 2,450 files, most of them for
 * backends a caller may never touch: the Redis client (~570 files), the
 * OpenTelemetry SDK's tracer provider and OTLP log/metric exporters, the MCP
 * client stack with its ajv validator, and google-auth-library for the Vertex
 * proxy fallback. A host that imports the SDK at start-up blocked its event
 * loop for seconds on every restart. Each of those now loads on first use.
 *
 * This imports the built package entry in a fresh process with a module load
 * hook and asserts none of those packages is part of the import itself. A
 * static import added back anywhere on the entry's graph fails here, whichever
 * module it lands in. The positive control proves the hook sees packages at
 * all, so an empty trace cannot pass as a clean one.
 *
 * Run: pnpm run build && pnpm run test:import-cost
 */

import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assert, defineSuite, Skip } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Package import cost", {
  offline: true,
});

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Loaded only when the feature that needs them is used. */
const LAZY_PACKAGES = [
  "redis",
  "@redis/client",
  "@opentelemetry/sdk-trace-node",
  "@opentelemetry/sdk-trace-base",
  "@opentelemetry/exporter-trace-otlp-http",
  "@opentelemetry/exporter-logs-otlp-http",
  "@opentelemetry/exporter-metrics-otlp-http",
  "@modelcontextprotocol/sdk",
  "ajv",
  "cross-spawn",
  "google-auth-library",
];

const PROBE = `
import { registerHooks } from "node:module";
const packages = new Set();
let files = 0;
const pkg = /node_modules\\/(?:\\.pnpm\\/[^/]+\\/node_modules\\/)?((?:@[^/]+\\/)?[^/]+)\\//;
registerHooks({
  load(url, context, next) {
    files++;
    const m = pkg.exec(url);
    if (m) packages.add(m[1]);
    return next(url, context);
  },
});
const mod = await import(${JSON.stringify(
  pathToFileURL(path.join(ROOT, "dist", "index.js")).href,
)});
console.log(JSON.stringify({
  files,
  packages: [...packages],
  hasNeuroLink: typeof mod.NeuroLink === "function",
}));
`;

type ImportTrace = { files: number; packages: string[]; hasNeuroLink: boolean };

function traceEntryImport(): ImportTrace {
  const res = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", PROBE],
    { cwd: ROOT, encoding: "utf8", timeout: 120_000 },
  );
  assert(res.status === 0, "the import probe process did not exit cleanly");
  const line = res.stdout.trim().split("\n").pop() ?? "";
  return JSON.parse(line) as ImportTrace;
}

await test("importing the package entry loads no optional backend", () => {
  // registerHooks() is available from Node 22.15.0; the package's own engine
  // floor (>=22.0.0) is older, so a contributor on an in-between minor can't
  // run this probe. Skip rather than fail — CI's Node is well past 22.15.
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 15)) {
    throw new Skip(
      `registerHooks needs Node >=22.15.0, running ${process.version}`,
    );
  }
  const trace = traceEntryImport();
  assert(trace.hasNeuroLink, "precondition: the entry must export NeuroLink");
  assert(
    trace.files > 100 && trace.packages.includes("zod"),
    "precondition: the load hook must observe the entry's own dependencies",
  );
  const loaded = LAZY_PACKAGES.filter((p) => trace.packages.includes(p));
  assert(
    loaded.length === 0,
    `loaded at import time instead of on first use: ${loaded.join(", ")}`,
  );
});

await runSuite();

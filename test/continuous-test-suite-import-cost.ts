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
  "undici",
  "jose",
  // Web framework adapters (src/lib/server/adapters/*.ts): each adapter's
  // package is now imported only from inside initializeFramework, so
  // constructing/importing the server barrel no longer pulls any of them in.
  // express/fastify/koa are intentionally not listed: none is an installed
  // dependency of this package, so their absence from the trace proves
  // nothing either way.
  "hono",
  // The proxy's OTel-logs bridge (src/lib/proxy/otelLogSink.ts): reachable
  // eagerly from dist/server/index.js via codexProxyRoutes.ts/
  // claudeProxyRoutes.ts, but only ever used when NEUROLINK_PROXY_LOG_SINK
  // is set to "otel" (opt-in, proxy-only). Construction is now deferred
  // behind a dynamic import fired from initializeProxyOtelLogs().
  "@opentelemetry/sdk-logs",
  "@opentelemetry/resources",
  "@opentelemetry/api-logs",
  "@opentelemetry/core",
  "@opentelemetry/otlp-transformer",
];

/** Builds the child-process probe script for one entry file. */
function buildProbe(entryPath: string): string {
  return `
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
const mod = await import(${JSON.stringify(pathToFileURL(entryPath).href)});
console.log(JSON.stringify({
  files,
  packages: [...packages],
  exportNames: Object.keys(mod),
}));
`;
}

type ImportTrace = { files: number; packages: string[]; exportNames: string[] };

function traceImport(entryPath: string): ImportTrace {
  const res = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", buildProbe(entryPath)],
    { cwd: ROOT, encoding: "utf8", timeout: 120_000 },
  );
  assert(
    res.status === 0,
    `the import probe process did not exit cleanly for ${entryPath}`,
  );
  const line = res.stdout.trim().split("\n").pop() ?? "";
  return JSON.parse(line) as ImportTrace;
}

/** registerHooks() needs Node >=22.15.0; the package's own floor (>=22.0.0) is
 * older, so a contributor on an in-between minor can't run this probe. Skip
 * rather than fail — CI's Node is well past 22.15. */
function skipIfHooksUnsupported(): void {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 15)) {
    throw new Skip(
      `registerHooks needs Node >=22.15.0, running ${process.version}`,
    );
  }
}

await test("importing the package entry loads no optional backend", () => {
  skipIfHooksUnsupported();
  const trace = traceImport(path.join(ROOT, "dist", "index.js"));
  assert(
    trace.exportNames.includes("NeuroLink"),
    "precondition: the entry must export NeuroLink",
  );
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

await test("importing the /server subpath entry loads no optional backend", () => {
  // Adapter files (honoAdapter.ts et al.) hold their web framework's import at
  // module scope, so re-exporting them from dist/server/index.js — even
  // without ever calling ServerAdapterFactory.create() — used to force full
  // evaluation of each adapter's static import graph (ESM re-export
  // semantics). This is the /server counterpart of the root-entry test above.
  skipIfHooksUnsupported();
  const trace = traceImport(path.join(ROOT, "dist", "server", "index.js"));
  assert(
    trace.exportNames.includes("HonoServerAdapter") &&
      trace.exportNames.includes("BaseServerAdapter"),
    "precondition: the /server entry must export the adapter classes",
  );
  assert(
    trace.files > 50 && trace.packages.includes("zod"),
    "precondition: the load hook must observe the entry's own dependencies",
  );
  const loaded = LAZY_PACKAGES.filter((p) => trace.packages.includes(p));
  assert(
    loaded.length === 0,
    `loaded at import time instead of on first use: ${loaded.join(", ")}`,
  );
});

await runSuite();

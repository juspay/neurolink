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
 * zod-to-json-schema and json-schema-to-zod are the odd two: they load through
 * `require()` (src/lib/utils/schemaConversion.ts), not `import()`. The control
 * drives each to its first conversion and checks the same hook sees it then,
 * and only then. A last test covers the price of that choice: when a bundler
 * or a resolver cannot find the package, conversion degrades to an empty
 * schema and says so once, at error level, instead of failing silently.
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
  // src/lib/utils/schemaConversion.ts: only reachable from
  // convertZodToJsonSchema/convertJsonSchemaToZod, both synchronous — loaded
  // via require() on first call. zod itself stays a static import since its
  // runtime schemas are public exports used well beyond schema conversion.
  "zod-to-json-schema",
  "json-schema-to-zod",
];

/** Source text of the module-URL to package-name detector every probe below
 * embeds. One constant, so the first-use positive control and the import-time
 * absence checks cannot drift apart: a control that watched packages the
 * absence checks cannot see would prove nothing about them. */
const PACKAGE_PATTERN_SOURCE = String.raw`/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)\//`;

/** Builds the child-process probe script for one entry file. */
function buildProbe(entryPath: string): string {
  return `
import { registerHooks } from "node:module";
const packages = new Set();
let files = 0;
const pkg = ${PACKAGE_PATTERN_SOURCE};
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

/** Runs a child script and returns both streams plus the exit status — unlike
 * `traceImport`, which only needs stdout for a JSON trace. */
function runChildScript(
  script: string,
  timeoutMs = 30_000,
): { status: number | null; stdout: string; stderr: string } {
  const res = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: timeoutMs,
    },
  );
  return {
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

const entryURL = JSON.stringify(
  pathToFileURL(path.join(ROOT, "dist", "index.js")).href,
);

/** Child-process source shared by the two probes below: a loopback
 * chat-completions stand-in that records every request body, and throwaway
 * credentials that point the openai provider at it. */
const MOCK_SERVER_SOURCE = `
const bodies = [];
const server = createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    bodies.push(Buffer.concat(chunks).toString("utf8"));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      id: "m", object: "chat.completion", created: 1, model: "gpt-4o-mini",
      choices: [{ index: 0, message: { role: "assistant", content: "mock reply" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }));
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseURL = "http://127.0.0.1:" + server.address().port + "/v1";
const credentials = { openai: { apiKey: "test-only-not-real", baseURL } };
`;

/** Child-process source that builds an openai provider carrying one custom
 * tool. `AIProviderFactory.createProvider` + `setupToolExecutor` +
 * `generate()` is public surface and, unlike a full `NeuroLink` instance,
 * does not also start the in-process MCP tool registry. That matters here:
 * @modelcontextprotocol/sdk bundles its own use of zod-to-json-schema, so
 * with a `NeuroLink` instance a hit on that package could belong to either
 * module. Through this path every hit is schemaConversion.js's. */
const PROVIDER_WITH_TOOL_SOURCE = `
async function providerWithTool(name, parameters) {
  const provider = await mod.AIProviderFactory.createProvider(
    "openai", "gpt-4o-mini", false, undefined, undefined, credentials,
  );
  provider.setupToolExecutor({
    customTools: new Map([[
      name,
      { description: "d", parameters, execute: async () => ({}) },
    ]]),
    executeTool: async () => ({}),
  }, "probe");
  return provider;
}
`;

/** Drives a Zod 3 `parameters` tool (schemaConversion's zod-to-json-schema
 * fallback) and a plain JSON Schema `parameters` tool (json-schema-to-zod)
 * through their first conversion, with the same load-hook detector the
 * absence checks use, snapshotting what it has seen after the import and
 * after the conversions. The `resolve` hook independently records who asked
 * for each of the two packages. */
function buildFirstUseProbe(): string {
  return `
import { registerHooks } from "node:module";
import { createServer } from "node:http";
import { z as z3 } from "zod/v3";

const WATCH = ["zod-to-json-schema", "json-schema-to-zod"];
const pkg = ${PACKAGE_PATTERN_SOURCE};
const resolves = [];
const packages = new Set();
let files = 0;
registerHooks({
  resolve(specifier, context, next) {
    if (WATCH.includes(specifier)) {
      resolves.push({ specifier, parentURL: context.parentURL ?? null });
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    files++;
    const m = pkg.exec(url);
    if (m) packages.add(m[1]);
    return next(url, context);
  },
});
const snapshot = () => ({ files, packages: [...packages] });

const mod = await import(${entryURL});
const afterImport = snapshot();
${MOCK_SERVER_SOURCE}${PROVIDER_WITH_TOOL_SOURCE}
const zodProvider = await providerWithTool(
  "probe_zod3_tool",
  z3.object({ city: z3.string() }),
);
await zodProvider.generate({ input: { text: "PROBE_ZOD3" }, disableTools: false });

const jsonProvider = await providerWithTool("probe_json_tool", {
  type: "object",
  properties: { city: { type: "string" } },
  required: ["city"],
});
await jsonProvider.generate({ input: { text: "PROBE_JSON" }, disableTools: false });

const afterUse = snapshot();
await new Promise((resolve) => server.close(resolve));
console.log(JSON.stringify({ afterImport, afterUse, resolves }));
`;
}

type FirstUseResolve = { specifier: string; parentURL: string | null };
type LoadSnapshot = { files: number; packages: string[] };
type FirstUseProbeResult = {
  afterImport: LoadSnapshot;
  afterUse: LoadSnapshot;
  resolves: FirstUseResolve[];
};

function runFirstUseProbe(): FirstUseProbeResult {
  const { status, stdout, stderr } = runChildScript(
    buildFirstUseProbe(),
    60_000,
  );
  if (status !== 0) {
    console.error(stderr);
  }
  assert(
    status === 0,
    "precondition: the first-use probe process did not exit cleanly",
  );
  const line = stdout.trim().split("\n").pop() ?? "";
  assert(
    line.length > 0,
    "precondition: the first-use probe printed no result",
  );
  return JSON.parse(line) as FirstUseProbeResult;
}

/** Same shape of probe, but with a `resolve` hook that makes
 * `zod-to-json-schema` itself unresolvable: the situation a consumer is in
 * when they bundle the SDK and run the bundle where the package is not
 * installed. Drives the Zod 3 tool path twice in one process, to check the
 * failure is reported once rather than once per call. */
function buildUnresolvableProbe(): string {
  return `
import { registerHooks } from "node:module";
import { createServer } from "node:http";
import { z as z3 } from "zod/v3";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "zod-to-json-schema") {
      throw new Error("TEST_INDUCED_UNRESOLVABLE: zod-to-json-schema is intentionally blocked for this probe");
    }
    return next(specifier, context);
  },
});

const mod = await import(${entryURL});
${MOCK_SERVER_SOURCE}${PROVIDER_WITH_TOOL_SOURCE}
const provider = await providerWithTool(
  "probe_zod3_tool",
  z3.object({ city: z3.string() }),
);
await provider.generate({ input: { text: "PROBE_1" }, disableTools: false });
await provider.generate({ input: { text: "PROBE_2" }, disableTools: false });

await new Promise((resolve) => server.close(resolve));

const toolParamProps = bodies.map((raw) => {
  try {
    const parsed = JSON.parse(raw);
    const tools = Array.isArray(parsed.tools) ? parsed.tools : [];
    const tool = tools.find((t) => (t?.function?.name ?? t?.name) === "probe_zod3_tool");
    return Object.keys(tool?.function?.parameters?.properties ?? {});
  } catch {
    return null;
  }
});
console.log(JSON.stringify({ requestCount: bodies.length, toolParamProps }));
`;
}

type UnresolvableProbeResult = {
  requestCount: number;
  toolParamProps: Array<string[] | null>;
};

function runUnresolvableProbe(): {
  status: number | null;
  stderr: string;
  parsed: UnresolvableProbeResult | undefined;
} {
  const { status, stdout, stderr } = runChildScript(
    buildUnresolvableProbe(),
    60_000,
  );
  const line = stdout.trim().split("\n").pop() ?? "";
  let parsed: UnresolvableProbeResult | undefined;
  try {
    parsed = JSON.parse(line) as UnresolvableProbeResult;
  } catch {
    parsed = undefined;
  }
  return { status, stderr, parsed };
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

/**
 * Positive control. Without it, the two tests above could pass for the wrong
 * reason: a hook that observes nothing reports an empty trace exactly as a
 * clean import does. Both schema-conversion packages are loaded with
 * `require()` through `createRequire`, which is the kind of load a detector
 * is most likely to be blind to, so this drives each to its first conversion
 * and checks, in one process and with the very same detector, that:
 *   1. it sees both packages once they are used,
 *   2. it saw neither before that, and
 *   3. the only module that asked for either is schemaConversion.js.
 * Item 2 is the measurement the absence checks above rely on; item 1 is what
 * makes it a measurement rather than a blind spot.
 */
await test("first use of a Zod 3 tool and a JSON Schema tool loads zod-to-json-schema and json-schema-to-zod, requested only by schemaConversion.js", () => {
  skipIfHooksUnsupported();
  const { afterImport, afterUse, resolves } = runFirstUseProbe();
  const SCHEMA_PACKAGES = ["zod-to-json-schema", "json-schema-to-zod"];
  assert(
    afterImport.files > 100 && afterImport.packages.includes("zod"),
    "precondition: the load hook must observe the entry's own dependencies",
  );
  assert(
    SCHEMA_PACKAGES.every((p) => afterUse.packages.includes(p)),
    "the load hook did not observe a schema-conversion package after its first use, so the absence checks above cannot see these packages",
  );
  assert(
    SCHEMA_PACKAGES.every((p) => !afterImport.packages.includes(p)),
    "a schema-conversion package was loaded by the import itself, before any conversion ran",
  );
  for (const specifier of SCHEMA_PACKAGES) {
    const requests = resolves.filter((r) => r.specifier === specifier);
    assert(
      requests.length > 0,
      "precondition: the resolve hook saw no request for a schema-conversion package",
    );
    assert(
      requests.every((r) =>
        (r.parentURL ?? "").endsWith("dist/utils/schemaConversion.js"),
      ),
      "a schema-conversion package was requested by a module other than schemaConversion.js",
    );
  }
});

/**
 * A bundler cannot see the `require()` that loads these two packages, so a
 * consumer who runs a bundle of the SDK where they are not installed makes
 * them unresolvable at runtime (see schemaConversion.ts's header comment).
 * That must degrade, to an empty object schema and never a thrown
 * error, and the failure must be reported once, at error level, not once per
 * call. Drives the Zod 3 tool path twice in one process against a `resolve`
 * hook that specifically blocks zod-to-json-schema.
 */
await test("an unresolvable zod-to-json-schema degrades to empty tool parameters and is logged once across two calls", () => {
  skipIfHooksUnsupported();
  const { status, stderr, parsed } = runUnresolvableProbe();
  if (status !== 0) {
    console.error(stderr);
  }
  assert(
    status === 0,
    "precondition: the unresolvable-package probe process did not exit cleanly",
  );
  assert(
    parsed !== undefined,
    "precondition: the unresolvable-package probe printed no parseable result",
  );
  assert(
    parsed?.requestCount === 2,
    "precondition: the probe did not make exactly two requests to the mock server",
  );
  assert(
    (parsed?.toolParamProps ?? []).every(
      (props) => Array.isArray(props) && props.length === 0,
    ),
    "an unresolvable zod-to-json-schema did not degrade to an empty tool parameters object on every call",
  );
  const errorLines = stderr
    .split("\n")
    .filter(
      (line) =>
        line.includes("Cannot load") && line.includes("zod-to-json-schema"),
    );
  if (errorLines.length !== 1) {
    console.error(errorLines.join("\n"));
  }
  assert(
    errorLines.length === 1,
    "the unresolvable-package failure was not logged exactly once across two calls",
  );
});

await runSuite();

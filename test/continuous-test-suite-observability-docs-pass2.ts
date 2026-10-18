#!/usr/bin/env tsx
/**
 * Continuous Test Suite: observability documentation is true of the code
 *
 * Second documentation pass of the Langfuse OTEL follow-up (BZ-6924). Other
 * areas restored behaviour that the first pass had documented as removed
 * (the OTLP metrics, `LANGFUSE_ENABLED`, `NEUROLINK_TELEMETRY_ENABLED`, the
 * environment fallbacks, `langfuse.enabled`, `getTelemetryStatus().exporters`)
 * and moved the automatic start-up behind a registration. Every check reads a
 * shipped document and the source it describes, and prints one line,
 * `PROOF <id> PASS|FAIL <what is checked>`; the suite exits non-zero when any
 * check fails.
 *
 *   K10  OTEL_EXPORTER_OTLP_ENDPOINT is honoured only on NeuroLink's own provider
 *   X51  the telemetry guide's Prometheus queries use metric names that exist
 *   K01  the restored metrics: names, labels, when they record, instruments only
 *   K02  LANGFUSE_ENABLED, NEUROLINK_TELEMETRY_ENABLED and the env fallbacks
 *   K09  langfuse.enabled is a field again
 *   K22  service.name default, service.version and deployment.environment
 *   K04  a later config: warning or debug line, first start wins, host first
 *   K03  the exit flush on beforeExit and what skips it
 *   K34  which entries start tracing by themselves
 *   X12  the main entry loads the OpenTelemetry SDK at import
 *   K05  migration rows for things that were restored
 *   X36  the MCP tool-call comment names the metric it labels
 *   X43  the testing plan names only variables and exports that exist
 *   X46  the telemetry guide's service name, the onboarding page's metric call
 *
 * The suite imports nothing from `src/` or `dist/`: it reads documentation
 * and source files with node:fs, so there is one module graph and no
 * determinism exception to claim. It needs no git history. A documentation
 * check is only worth something if it can fail, so each one carries a
 * control: an inline fixture holding the text the docs had before this pass,
 * which the stale detector must match (or the "must say" detector must
 * reject). Facts about the code are read from the source the docs describe.
 *
 * Offline: nothing leaves the machine.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-docs-pass2.ts
 */
import "./helpers/credentialFreeEnv.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assert, defineSuite } from "./helpers/harness.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const read = (relativePath: string): string =>
  readFileSync(join(ROOT, relativePath), "utf8");

const OBSERVABILITY = read("docs/features/observability.md");
const GUIDE = read("docs/telemetry-guide.md");
const ENV_EXAMPLE = read(".env.example");
const PLAN = read("docs/comprehensive-testing-plan.md");
const ONBOARDING = read("docs/features/proxy-cli-onboarding.md");

const INSTRUMENTATION = read(
  "src/lib/services/server/ai/observability/instrumentation.ts",
);
const LANGFUSE_SETUP = read(
  "src/lib/services/server/ai/observability/langfuseSetup.ts",
);
const OTLP_SETUP = read(
  "src/lib/services/server/ai/observability/otlpSetup.ts",
);
const AI_METRICS = read("src/lib/telemetry/aiMetrics.ts");
const STARTER = read("src/lib/telemetry/telemetryStarter.ts");
const NEUROLINK = read("src/lib/neurolink.ts");
const TELEMETRY_HANDLER = read("src/lib/core/modules/TelemetryHandler.ts");
const PROXY_TRACER = read("src/lib/proxy/proxyTracer.ts");
const EXTERNAL_SERVER_MANAGER = read("src/lib/mcp/externalServerManager.ts");
const OBSERVABILITY_TYPES = read("src/lib/types/observability.ts");
const ROOT_INDEX = read("src/lib/index.ts");

const SOURCE_FILES = readdirSync(join(ROOT, "src"), {
  recursive: true,
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
  .map((entry) => join(entry.parentPath, entry.name));
const SOURCE = new Map(
  SOURCE_FILES.map((file) => [file, readFileSync(file, "utf8")] as const),
);
const LIB_SOURCE = [...SOURCE.entries()].filter(([file]) =>
  file.startsWith(join(ROOT, "src/lib")),
);

/** Files under src/lib, other than `except`, whose text matches `pattern`. */
const libHits = (pattern: RegExp, except = ""): string[] =>
  LIB_SOURCE.filter(
    ([file, text]) => file !== join(ROOT, except) && pattern.test(text),
  ).map(([file]) => file.slice(ROOT.length));

/** True when some file under src reads environment variable `name`. */
const sourceReadsEnv = (name: string): boolean =>
  [...SOURCE.values()].some(
    (text) =>
      text.includes(`process.env.${name}`) ||
      text.includes(`process.env["${name}"]`) ||
      new RegExp(`["'\`]${name}["'\`]`).test(text),
  );

const flat = (text: string): string => text.replace(/\s+/g, " ");

function sectionOf(doc: string, heading: string): string {
  const text = `\n${doc}`;
  const start = text.indexOf(`\n${heading}\n`);
  if (start < 0) {
    return "";
  }
  const level = heading.length - heading.replace(/^#+/, "").length;
  const rest = text.slice(start + 1 + heading.length);
  const next = rest.search(new RegExp(`\\n#{1,${level}} `));
  return next < 0 ? rest : rest.slice(0, next);
}

function tableRows(text: string): string[][] {
  return text
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|[\s:|-]+$/.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
}

const MIGRATION_HEADING = "## Migrating from the previous version";
const migrationRows = (doc: string): string[][] =>
  tableRows(sectionOf(doc, MIGRATION_HEADING));
const rowsNaming = (rows: string[][], pattern: RegExp): string[][] =>
  rows.filter((row) => pattern.test(row[0] ?? ""));
/** The table line whose first cell is exactly the backticked `name`. */
const rowOf = (text: string, name: string): string =>
  text.split("\n").find((line) => line.startsWith(`| \`${name}\``)) ?? "";

type Condition = readonly [label: string, ok: boolean];

function holds(conditions: readonly Condition[]): boolean {
  const failed = conditions.filter(([, ok]) => !ok).map(([label]) => label);
  if (failed.length > 0) {
    process.stderr.write(`    unmet: ${failed.join("; ")}\n`);
  }
  return failed.length === 0;
}

/** Bodies of the metric instruments created in `text`, by name. */
const instrumentNames = (text: string): string[] =>
  [
    ...text.matchAll(
      /create(?:Counter|Histogram|UpDownCounter|ObservableGauge|Gauge)\(\s*["`]([a-z0-9_]+)["`]/g,
    ),
  ].map((match) => match[1] ?? "");

const AI_METRIC_NAMES = instrumentNames(AI_METRICS);
const DEFINED_METRICS = new Set(
  LIB_SOURCE.flatMap(([, text]) => instrumentNames(text)),
);

// ---------------------------------------------------------------------------
// Static import graph (relative value imports only; `import type` is erased)
// ---------------------------------------------------------------------------

const STATIC_IMPORT =
  /^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/gm;

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function resolveRelative(fromFile: string, specifier: string): string | null {
  const base = resolve(dirname(fromFile), specifier);
  return (
    [base.replace(/\.js$/, ".ts"), `${base}.ts`, join(base, "index.ts")].find(
      (candidate) => existsSync(candidate),
    ) ?? null
  );
}

type Graph = { files: ReadonlySet<string>; packages: ReadonlySet<string> };

/** Every source file and bare package a fresh import of `entry` loads statically. */
function staticGraph(entry: string): Graph {
  const start = join(ROOT, entry);
  const files = new Set([start]);
  const packages = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const file = queue.shift() ?? "";
    const text = stripComments(SOURCE.get(file) ?? readFileSync(file, "utf8"));
    for (const match of text.matchAll(STATIC_IMPORT)) {
      const specifier = match[1] ?? "";
      if (!specifier.startsWith(".")) {
        packages.add(specifier);
        continue;
      }
      const target = resolveRelative(file, specifier);
      if (target && !files.has(target)) {
        files.add(target);
        queue.push(target);
      }
    }
  }
  return { files, packages };
}

const INSTRUMENTATION_FILE = join(
  ROOT,
  "src/lib/services/server/ai/observability/instrumentation.ts",
);
const loadsStarter = (entry: string): boolean =>
  staticGraph(entry).files.has(INSTRUMENTATION_FILE);

// ---------------------------------------------------------------------------
// The text the docs had before this pass (inline, so no git history is needed)
// ---------------------------------------------------------------------------

const OLD = {
  externalProvider:
    "## External OpenTelemetry provider\n\nIf your application registers its own global `TracerProvider`, NeuroLink creates no provider. Other backends: add that vendor's span processor to your provider, or set `OTEL_EXPORTER_OTLP_ENDPOINT`. For Langfuse choose one of two recipes.\n",
  observabilityEnvRow:
    "| `OTEL_EXPORTER_OTLP_ENDPOINT`        | Also export traces and metrics to an OTLP collector |",
  guideEnvRows:
    "| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint for traces and metrics       | -              |\n| `OTEL_SERVICE_NAME`           | Service name                                         | `neurolink-ai` |",
  guideEndpoints:
    "      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:14268/api/traces\n   export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:14268/api/traces\n",
  promql:
    "### Sample Prometheus Queries\n\n```promql\n# Average AI response time over 5 minutes\nrate(neurolink_ai_duration_sum[5m]) / rate(neurolink_ai_duration_count[5m])\n\n# Token usage by provider\nsum by (provider) (rate(neurolink_tokens_total[5m]))\n\n# Error rate percentage\nrate(neurolink_errors_total[5m]) / rate(neurolink_requests_total[5m]) * 100\n\n# Cost per hour by provider\nsum by (provider) (rate(neurolink_cost_total[1h]))\n\n# Active WebSocket connections\nneurolink_websocket_connections_active\n```\n",
  keyMetrics:
    "### AI Operation Metrics\n\n- **Response Time**: Time to generate AI responses\n- **Token Usage**: Input/output tokens by provider and model\n- **Cost Tracking**: Estimated costs per operation\n- **Error Rates**: Failed AI requests by provider\n- **Provider Performance**: Success rates and latency by provider\n",
  noMetricsSection:
    "## Langfuse exporter behaviour\n\n- **Endpoint.** `POST {baseUrl}/api/public/otel/v1/traces` as OTLP/HTTP JSON.\n\n## External OpenTelemetry provider\n",
  telemetryServiceRow:
    "## Migrating from the previous version\n\n| Removed | Replacement |\n| --- | --- |\n| `TelemetryService` | Removed, with its `tts_failures` and `tts_failure_latency_ms` metrics |\n",
  envSwitchRows:
    "## Migrating from the previous version\n\n| Removed | Replacement |\n| --- | --- |\n| `NEUROLINK_TELEMETRY_ENABLED`, `LANGFUSE_ENABLED` | Removed; the `LANGFUSE_*` keys enable tracing |\n| `LANGFUSE_ENVIRONMENT`, `PUBLIC_APP_ENVIRONMENT` | `LANGFUSE_TRACING_ENVIRONMENT` |\n| `PUBLIC_APP_VERSION` | `LANGFUSE_RELEASE` |\n",
  observabilityEnvTable:
    "### Environment variables\n\n| Variable | Purpose |\n| --- | --- |\n| `LANGFUSE_TRACING_ENVIRONMENT` | Environment label on every trace |\n| `LANGFUSE_RELEASE` | Release label on every trace |\n",
  serviceVersionRows:
    "## Migrating from the previous version\n\n| Removed | Replacement |\n| --- | --- |\n| `openTelemetry` option (`OpenTelemetryConfig`: `enabled`, `endpoint`, `serviceName`, `serviceVersion`) | `OTEL_EXPORTER_OTLP_ENDPOINT` turns the OTLP export on and `OTEL_SERVICE_NAME` names the service; no version is set |\n| `OTEL_SERVICE_VERSION` | Removed; no service version is set |\n",
  envExample:
    "OTEL_SERVICE_NAME=neurolink\nOTEL_SERVICE_VERSION=7.48.1\n# OTEL_SERVICE_NAME=neurolink-ai\n",
  enabledRow:
    "## Migrating from the previous version\n\n| Removed | Replacement |\n| --- | --- |\n| `langfuse.enabled` | Set the keys to enable; `langfuse: false` disables |\n",
  fieldTable:
    "### Disable or override\n\n| Field | Meaning |\n| --- | --- |\n| `publicKey` | Langfuse public key |\n| `secretKey` | Langfuse secret key |\n",
  initialisation:
    "## Initialisation\n\nTelemetry starts synchronously and lazily, once per process, the first time any NeuroLink span is created. That includes direct provider calls with no `NeuroLink` instance, for example `AIProviderFactory.createProvider(...).generate(...)`, which are traced the same way.\n\nAn explicit `observability` config passed to `new NeuroLink()` wins over `LANGFUSE_*` variables when the instance is constructed before any span is created. If telemetry has already started, the config is ignored and a debug message is logged once.\n",
  guideStart:
    "4. **Run your app**\n\n   Tracing starts with the first `new NeuroLink()`; no initialization call is needed.\n",
  initializeRow:
    "## Migrating from the previous version\n\n| Removed | Replacement |\n| --- | --- |\n| `initializeOpenTelemetry` | Automatic on `new NeuroLink()` |\n",
  serverless:
    "## Serverless and short-lived processes\n\nSpans are batched. Flush before the process freezes or exits:\n\n`shutdownOpenTelemetry()` is terminal for the process: telemetry cannot restart afterwards. While other `NeuroLink` instances are still alive it only flushes.\n",
  zeroOverhead:
    "NeuroLink includes optional OpenTelemetry integration for enterprise monitoring and observability. The telemetry system provides comprehensive insights into AI operations, performance metrics, and system health with **zero overhead when disabled**.\n\n- **✅ Zero Overhead by Default** - Telemetry disabled unless explicitly configured\n",
  exportersRow:
    "## Migrating from the previous version\n\n| Removed | Replacement |\n| --- | --- |\n| `neurolink.getTelemetryStatus().exporters` | Removed; `langfuse` and `openTelemetry` remain |\n",
  mcpComment:
    "        // A resolved `{ isError: true }` still comes back with success:true so\n        // the caller receives the MCP error payload as-is, but it is a failed\n        // call for telemetry: count it in the server's totalErrors instead\n        // of counting every resolved error as a success.\n        const resolvedError = result.isErrorResult === true;\n",
  plan: 'import { initializeTelemetry, TelemetryService } from "@juspay/neurolink";\nprocess.env.NEUROLINK_TRACE_EVERYTHING = "true";\nconst status = getTelemetryStatus();\n',
  onboarding:
    "  `:826`, `:874` (all `calculateCost`) and `:883`\n  (the request-metric call; the proxy now counts requests with its\n  `proxy_requests_total` counter).\n",
} as const;

// ---------------------------------------------------------------------------
// Detectors shared by more than one check
// ---------------------------------------------------------------------------

/** The external-provider section offers the endpoint as an alternative, or does not say it is ignored. */
const externalProviderStale = (doc: string): boolean => {
  const body = flat(sectionOf(doc, "## External OpenTelemetry provider"));
  return (
    /or set `OTEL_EXPORTER_OTLP_ENDPOINT`/.test(body) ||
    !/`OTEL_EXPORTER_OTLP_ENDPOINT` is then ignored/.test(body)
  );
};

/** An endpoint row that does not limit the endpoint to NeuroLink's own provider. */
const endpointRowStale = (row: string): boolean =>
  !/only when NeuroLink owns the tracer provider/.test(row) ||
  !/(ignored|host)/i.test(row);

/** Metric names a PromQL block queries, with the histogram series suffixes removed. */
const promqlMetrics = (text: string): string[] => {
  const block = /```promql\n([\s\S]*?)```/.exec(text)?.[1] ?? "";
  const code = block
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  return [
    ...new Set(
      [
        ...code.matchAll(
          /\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b(?=\s*[[{)]|\s*$)/gm,
        ),
      ]
        .map((match) => match[1] ?? "")
        .map((name) => name.replace(/_(sum|count|bucket)$/, "")),
    ),
  ];
};

/** Migration rows whose replacement cell still begins "Removed" for a name src reads. */
const removedButRead = (doc: string): string[] =>
  migrationRows(doc)
    .filter((row) => /^Removed\b/.test(row[1] ?? ""))
    .flatMap((row) => [...(row[0] ?? "").matchAll(/`([A-Z][A-Z0-9_]+)`/g)])
    .map((match) => match[1] ?? "")
    .filter((name) => sourceReadsEnv(name));

const metricsSection = (doc: string): string =>
  flat(sectionOf(doc, "## Metrics"));

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

const { test, section, runSuite } = defineSuite(
  "Observability documentation is true of the code",
  { offline: true, perTestTimeoutMs: 120_000 },
);

async function proof(
  id: string,
  description: string,
  check: () => boolean,
): Promise<void> {
  await test(`${id} ${description}`, () => {
    let passed = false;
    let thrown = false;
    try {
      passed = check();
    } catch (error) {
      thrown = true;
      process.stderr.write(
        `  [${id}] ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
    console.log(`PROOF ${id} ${passed ? "PASS" : "FAIL"} ${description}`);
    assert(passed, `${id} check ${thrown ? "threw" : "failed"}`);
  });
}

void runSuite(async () => {
  // ----------------------------------------------------------------- K10
  section("K10 OTEL_EXPORTER_OTLP_ENDPOINT and a host provider");

  await proof(
    "K10",
    "the external-provider section says the endpoint is ignored beside a host provider",
    () => {
      const hostBlock = INSTRUMENTATION.slice(
        INSTRUMENTATION.indexOf("if (hasHostTracerProvider()) {"),
        INSTRUMENTATION.indexOf("const resource = resourceFromAttributes("),
      );
      return holds([
        [
          "control: the detector matches the old section",
          externalProviderStale(OLD.externalProvider),
        ],
        [
          "code: the host branch returns before any OTLP processor or meter provider is built",
          hostBlock.length > 0 &&
            /return true;/.test(hostBlock) &&
            !/createOtlp/.test(hostBlock),
        ],
        [
          "code: the host branch warns that the endpoint is ignored",
          /OTEL_EXPORTER_OTLP_ENDPOINT is ignored because a host TracerProvider is registered/.test(
            hostBlock,
          ),
        ],
        [
          "the observability guide's section is no longer stale",
          !externalProviderStale(OBSERVABILITY),
        ],
      ]);
    },
  );

  await proof(
    "K10",
    "both environment tables limit OTEL_EXPORTER_OTLP_ENDPOINT to NeuroLink's own provider",
    () => {
      const [oldGuideRow = ""] = OLD.guideEnvRows.split("\n");
      return holds([
        [
          "control: the detector matches the old rows",
          endpointRowStale(OLD.observabilityEnvRow) &&
            endpointRowStale(oldGuideRow),
        ],
        [
          "observability.md row",
          !endpointRowStale(
            rowOf(
              sectionOf(OBSERVABILITY, "### Environment variables"),
              "OTEL_EXPORTER_OTLP_ENDPOINT",
            ),
          ),
        ],
        [
          "telemetry-guide.md row",
          !endpointRowStale(rowOf(GUIDE, "OTEL_EXPORTER_OTLP_ENDPOINT")),
        ],
      ]);
    },
  );

  await proof(
    "K10",
    "the migration table says host mode no longer exports OTLP metrics and logs to the endpoint",
    () => {
      const detector = (doc: string): boolean =>
        rowsNaming(migrationRows(doc), /OTEL_EXPORTER_OTLP_ENDPOINT/).some(
          (row) =>
            /host/i.test(row[0] ?? "") &&
            /metrics and logs/.test(row[1] ?? "") &&
            /not restored/.test(row[1] ?? ""),
        );
      return holds([
        [
          "control: the old table has no such row",
          !detector(OLD.serviceVersionRows),
        ],
        [
          "code: in host mode no meter provider is created (meterProvider is set only on the own-provider path)",
          INSTRUMENTATION.indexOf("meterProvider = otlpEndpoint") >
            INSTRUMENTATION.indexOf("if (hasHostTracerProvider()) {"),
        ],
        ["the working tree has the row", detector(OBSERVABILITY)],
      ]);
    },
  );

  await proof(
    "K10",
    "the telemetry guide's endpoint examples are base URLs, since NeuroLink appends /v1/traces and /v1/metrics",
    () => {
      const values = (text: string): string[] =>
        [...text.matchAll(/OTEL_EXPORTER_OTLP_ENDPOINT=(\S+)/g)].map(
          (match) => match[1] ?? "",
        );
      const withPath = (text: string): string[] =>
        values(text).filter((url) => /^https?:\/\/[^/]+\/\S/.test(url));
      return holds([
        [
          "control: the old examples carried a path",
          withPath(OLD.guideEndpoints).length === 2,
        ],
        [
          "code: the trace and metric exporters append their paths",
          /url: `\$\{endpoint\}\/v1\/traces`/.test(OTLP_SETUP) &&
            /url: `\$\{endpoint\}\/v1\/metrics`/.test(OTLP_SETUP),
        ],
        ["control: the guide has endpoint examples", values(GUIDE).length > 0],
        [
          `examples with a path: ${withPath(GUIDE).join(", ")}`,
          withPath(GUIDE).length === 0,
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- X51
  section("X51 Prometheus queries");

  await proof(
    "X51",
    "the telemetry guide's Prometheus queries use only metric names NeuroLink defines",
    () => {
      const unknown = (text: string): string[] =>
        promqlMetrics(text).filter((name) => !DEFINED_METRICS.has(name));
      const queried = promqlMetrics(GUIDE);
      return holds([
        [
          "control: every old query names an unknown metric",
          unknown(OLD.promql).length === 6,
        ],
        [
          "control: the metric list read from the source has the ai_* names",
          DEFINED_METRICS.has("ai_requests_total") &&
            DEFINED_METRICS.has("ai_request_duration_ms"),
        ],
        [
          "the guide still has queries over the ai_* metrics",
          queried.includes("ai_requests_total") &&
            queried.includes("ai_request_duration_ms"),
        ],
        [
          `unknown names: ${unknown(GUIDE).join(", ")}`,
          unknown(GUIDE).length === 0,
        ],
      ]);
    },
  );

  await proof(
    "X51",
    "the telemetry guide says which AI metrics nothing records, and claims no AI error rate",
    () => {
      const detector = (text: string): boolean => {
        const body = flat(text);
        return (
          /ai_provider_errors_total/.test(body) &&
          /connections_total/.test(body) &&
          /response_time_ms/.test(body) &&
          /nothing in the package records them/.test(body) &&
          !/Error Rates\*\*: Failed AI requests/.test(body)
        );
      };
      const uncalled = [
        "recordAIError",
        "recordConnection",
        "recordResponseTime",
      ]
        .map(
          (name) =>
            [
              name,
              libHits(
                new RegExp(`\\b${name}\\(`),
                "src/lib/telemetry/aiMetrics.ts",
              ),
            ] as const,
        )
        .filter(([, hits]) => hits.length > 0)
        .map(([name]) => name);
      return holds([
        ["control: the old section did not say it", !detector(OLD.keyMetrics)],
        [
          `code: recorders called outside aiMetrics.ts: ${uncalled.join(", ")}`,
          uncalled.length === 0,
        ],
        ["the guide says it", detector(GUIDE)],
      ]);
    },
  );

  // ----------------------------------------------------------------- K01
  section("K01 the restored metrics");

  await proof(
    "K01",
    "the observability guide has a Metrics section naming every instrument aiMetrics.ts creates and when they record",
    () => {
      const detector = (doc: string): boolean => {
        const body = metricsSection(doc);
        return (
          AI_METRIC_NAMES.every((name) => body.includes(`\`${name}\``)) &&
          /`neurolink-ai`/.test(body) &&
          /`OTEL_EXPORTER_OTLP_ENDPOINT`/.test(body) &&
          /`NEUROLINK_TELEMETRY_ENABLED=true`/.test(body) &&
          /TracerProvider/.test(body) &&
          /MeterProvider/.test(body)
        );
      };
      const enabledBody = /function isMetricsEnabled\([^)]*\)[\s\S]*?\n}/.exec(
        AI_METRICS,
      )?.[0];
      return holds([
        [
          "control: the old guide had no Metrics section",
          !detector(OLD.noMetricsSection),
        ],
        [
          "code: aiMetrics.ts creates eight named instruments on the neurolink-ai meter",
          AI_METRIC_NAMES.length === 8 &&
            /const METER_NAME = "neurolink-ai";/.test(AI_METRICS),
        ],
        [
          "code: metrics record on the three conditions the docs name",
          enabledBody !== undefined &&
            /NEUROLINK_TELEMETRY_ENABLED === "true"/.test(enabledBody) &&
            /OTEL_EXPORTER_OTLP_ENDPOINT/.test(enabledBody) &&
            /createNoopMeter\(\)/.test(enabledBody) &&
            !/hasHostTracerProvider/.test(enabledBody),
        ],
        [
          "code: the OTLP meter provider is registered globally",
          /metrics\.setGlobalMeterProvider\(provider\)/.test(OTLP_SETUP) &&
            /exportIntervalMillis: 15000/.test(OTLP_SETUP),
        ],
        ["the working tree has the section", detector(OBSERVABILITY)],
      ]);
    },
  );

  await proof(
    "K01",
    "the docs say which calls record the ai_* and mcp_* metrics, and that three instruments are never recorded",
    () => {
      const detector = (doc: string): boolean => {
        const body = metricsSection(doc);
        return (
          /finalizeNativeGenerate/.test(body) &&
          /proxied request/.test(body) &&
          /external MCP server/.test(body) &&
          /`success` is `false`/.test(body) &&
          /`ai_provider_errors_total`, `connections_total` and `response_time_ms`[^.]*nothing in the package records them/.test(
            body,
          ) &&
          /recordConnectionClosed[^.]*not restored/.test(body)
        );
      };
      return holds([
        [
          "control: the old guide did not say it",
          !detector(OLD.noMetricsSection),
        ],
        [
          "code: TelemetryHandler and the proxy record requests, the external server manager records tool calls",
          /recordAIRequest\(/.test(TELEMETRY_HANDLER) &&
            /recordAIRequest\(/.test(PROXY_TRACER) &&
            /recordMCPToolCall\(toolName, duration, !resolvedError\)/.test(
              EXTERNAL_SERVER_MANAGER,
            ),
        ],
        [
          "code: the only caller of recordPerformanceMetrics is finalizeNativeGenerate",
          /protected async finalizeNativeGenerate\([\s\S]*?await this\.recordPerformanceMetrics\(/.test(
            read("src/lib/core/baseProvider.ts"),
          ) &&
            LIB_SOURCE.flatMap(([, text]) => [
              ...text.matchAll(/this\.recordPerformanceMetrics\(/g),
            ]).length === 1,
        ],
        [
          "code: recordConnectionClosed exists nowhere in src/lib",
          libHits(/recordConnectionClosed/).length === 0,
        ],
        [
          "code: the recording functions are not root exports",
          !/aiMetrics/.test(ROOT_INDEX),
        ],
        ["the working tree says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  await proof(
    "K01",
    "the migration table no longer says TelemetryService's metrics were removed",
    () => {
      const detector = (doc: string): boolean => {
        const rows = rowsNaming(migrationRows(doc), /^`TelemetryService`$/);
        return (
          rows.length > 0 &&
          rows.every(
            (row) =>
              !/with its `tts_failures`/.test(row[1] ?? "") &&
              /custom_tts_failures/.test(row[1] ?? "") &&
              /custom_tts_failure_latency_ms_histogram/.test(row[1] ?? ""),
          )
        );
      };
      return holds([
        [
          "control: the detector rejects the old row",
          !detector(OLD.telemetryServiceRow),
        ],
        [
          "code: TelemetryHandler records the TTS failures as custom metrics",
          /recordCustomMetric\("tts_failures"/.test(TELEMETRY_HANDLER) &&
            /recordCustomHistogram\("tts_failure_latency_ms"/.test(
              TELEMETRY_HANDLER,
            ) &&
            /`custom_\$\{name\}`/.test(AI_METRICS) &&
            /`custom_\$\{name\}_histogram`/.test(AI_METRICS),
        ],
        ["the working tree's row says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  // ----------------------------------------------------------------- K02
  section("K02 environment switches and fallbacks");

  await proof(
    "K02",
    "no migration row calls an environment variable removed that the source still reads",
    () =>
      holds([
        [
          "control: the old rows call LANGFUSE_ENABLED and NEUROLINK_TELEMETRY_ENABLED removed",
          removedButRead(OLD.envSwitchRows).length === 2,
        ],
        [
          `rows that still say removed: ${removedButRead(OBSERVABILITY).join(", ")}`,
          removedButRead(OBSERVABILITY).length === 0,
        ],
      ]),
  );

  await proof(
    "K02",
    "the docs say LANGFUSE_ENABLED is an off switch for keys in the environment, which explicit config in code wins over",
    () => {
      const detector = (doc: string): boolean => {
        const envRow = flat(
          rowOf(
            sectionOf(doc, "### Environment variables"),
            "LANGFUSE_ENABLED",
          ),
        );
        const migration = rowsNaming(
          migrationRows(doc),
          /^`LANGFUSE_ENABLED`$/,
        );
        return (
          /`false`, `0`, `off` or `no`/.test(envRow) &&
          /passed in code wins/.test(envRow) &&
          /neurolink proxy start/.test(envRow) &&
          migration.some((row) => /off switch/.test(row[1] ?? ""))
        );
      };
      return holds([
        [
          "control: the detector rejects the old docs",
          !detector(OLD.envSwitchRows),
        ],
        [
          "code: the off values are false, 0, off and no",
          /new Set\(\["false", "0", "off", "no"\]\)/.test(LANGFUSE_SETUP),
        ],
        [
          "code: an options object is governed by LANGFUSE_ENABLED unless it sets enabled: true or both keys",
          LANGFUSE_SETUP.replace(/\s+/g, " ").includes(
            "langfuse.enabled === true || Boolean(langfuse.publicKey && langfuse.secretKey) || !isOff(process.env.LANGFUSE_ENABLED)",
          ),
        ],
        [
          "code: the proxy passes a keyless langfuse object whenever both keys are set, so the switch governs it",
          /langfuse: hasLangfuseKeys && \{/.test(
            read("src/cli/commands/proxy.ts"),
          ),
        ],
        [
          "code: that object carries no keys and no enabled flag, which would win over the switch",
          (() => {
            const block =
              read("src/cli/commands/proxy.ts")
                .split("langfuse: hasLangfuseKeys && {")[1]
                ?.split("}")[0] ?? "";
            return (
              block.length > 0 && !/publicKey|secretKey|enabled/.test(block)
            );
          })(),
        ],
        ["the working tree says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  await proof(
    "K02",
    "the docs say NEUROLINK_TELEMETRY_ENABLED=true records the metrics and does not turn tracing on",
    () => {
      const detector = (doc: string): boolean => {
        const envRow = flat(
          rowOf(
            sectionOf(doc, "### Environment variables"),
            "NEUROLINK_TELEMETRY_ENABLED",
          ),
        );
        const migration = rowsNaming(
          migrationRows(doc),
          /^`NEUROLINK_TELEMETRY_ENABLED`$/,
        );
        return (
          /metrics/.test(envRow) &&
          /does not turn tracing on/.test(envRow) &&
          migration.some((row) => /Still read/.test(row[1] ?? ""))
        );
      };
      return holds([
        [
          "control: the detector rejects the old docs",
          !detector(OLD.envSwitchRows),
        ],
        [
          "code: aiMetrics reads it and instrumentation does not",
          /NEUROLINK_TELEMETRY_ENABLED/.test(AI_METRICS) &&
            !/NEUROLINK_TELEMETRY_ENABLED/.test(INSTRUMENTATION),
        ],
        ["the working tree says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  await proof(
    "K02",
    "the docs list LANGFUSE_ENVIRONMENT, PUBLIC_APP_ENVIRONMENT and PUBLIC_APP_VERSION as fallbacks in the order the code reads them",
    () => {
      const detector = (doc: string): boolean => {
        const rows = migrationRows(doc);
        const env = sectionOf(doc, "### Environment variables");
        return (
          rowsNaming(rows, /LANGFUSE_ENVIRONMENT/).some((row) =>
            /fallbacks? after `LANGFUSE_TRACING_ENVIRONMENT`/.test(
              row[1] ?? "",
            ),
          ) &&
          rowsNaming(rows, /PUBLIC_APP_VERSION/).some((row) =>
            /fallbacks? after `LANGFUSE_RELEASE`/.test(row[1] ?? ""),
          ) &&
          /falls back to `LANGFUSE_ENVIRONMENT`, then `PUBLIC_APP_ENVIRONMENT`/.test(
            rowOf(env, "LANGFUSE_TRACING_ENVIRONMENT"),
          ) &&
          /falls back to `PUBLIC_APP_VERSION`/.test(
            rowOf(env, "LANGFUSE_RELEASE"),
          )
        );
      };
      return holds([
        [
          "control: the detector rejects the old docs",
          !detector(`${OLD.observabilityEnvTable}\n${OLD.envSwitchRows}`),
        ],
        [
          "code: the environment is config, LANGFUSE_TRACING_ENVIRONMENT, LANGFUSE_ENVIRONMENT, PUBLIC_APP_ENVIRONMENT",
          /"LANGFUSE_TRACING_ENVIRONMENT",\s*"LANGFUSE_ENVIRONMENT",\s*"PUBLIC_APP_ENVIRONMENT",/.test(
            LANGFUSE_SETUP,
          ),
        ],
        [
          "code: the release is config, LANGFUSE_RELEASE, PUBLIC_APP_VERSION",
          /firstEnv\("LANGFUSE_RELEASE", "PUBLIC_APP_VERSION"\)/.test(
            LANGFUSE_SETUP,
          ),
        ],
        ["the working tree says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  // ----------------------------------------------------------------- K09
  section("K09 langfuse.enabled");

  await proof(
    "K09",
    "the migration table keeps langfuse.enabled, and the field table has an enabled row",
    () => {
      const detector = (doc: string): boolean => {
        const migration = rowsNaming(migrationRows(doc), /`langfuse\.enabled`/);
        const fields = tableRows(sectionOf(doc, "### Disable or override"));
        return (
          migration.length > 0 &&
          migration.every(
            (row) =>
              /`enabled: false`/.test(row[1] ?? "") &&
              !/^Set the keys to enable/.test(row[1] ?? ""),
          ) &&
          fields.some(
            (row) =>
              row[0] === "`enabled`" &&
              /`false` turns Langfuse off/.test(row[1] ?? "") &&
              /`"off"`/.test(row[1] ?? ""),
          )
        );
      };
      return holds([
        [
          "control: the detector rejects the old docs",
          !detector(`${OLD.fieldTable}\n${OLD.enabledRow}`),
        ],
        [
          "code: NeurolinkLangfuseConfig has an optional enabled field",
          /export type NeurolinkLangfuseConfig = \{[\s\S]*?\n {2}enabled\?: boolean;/.test(
            OBSERVABILITY_TYPES,
          ),
        ],
        [
          "code: an options object with an off enabled value is off",
          /if \(isOff\(langfuse\.enabled\)\) \{\s*return false;/.test(
            LANGFUSE_SETUP,
          ),
        ],
        ["the working tree says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  // ----------------------------------------------------------------- K22
  section("K22 service resource attributes");

  await proof(
    "K22",
    "the telemetry guide and .env.example give the service name default the code uses",
    () => {
      const codeDefault =
        /OTEL_SERVICE_NAME \|\| "([^"]+)"/.exec(INSTRUMENTATION)?.[1] ?? "";
      const [, oldNameRow = ""] = OLD.guideEnvRows.split("\n");
      const guideStale = (row: string): boolean =>
        !row.includes(`\`${codeDefault}\``) || /`neurolink-ai`/.test(row);
      const envStale = (text: string): boolean =>
        /OTEL_SERVICE_NAME=neurolink-ai\b/.test(text);
      return holds([
        ["control: the code default was read", codeDefault === "ai-service"],
        [
          "control: neurolink-ai is the meter name, not the service name",
          /const METER_NAME = "neurolink-ai";/.test(AI_METRICS),
        ],
        [
          "control: the detectors match the old guide row and .env.example",
          guideStale(oldNameRow) && envStale(OLD.envExample),
        ],
        ["the guide's row", !guideStale(rowOf(GUIDE, "OTEL_SERVICE_NAME"))],
        [
          "the observability env table row",
          !guideStale(
            rowOf(
              sectionOf(OBSERVABILITY, "### Environment variables"),
              "OTEL_SERVICE_NAME",
            ),
          ),
        ],
        [".env.example", !envStale(ENV_EXAMPLE)],
      ]);
    },
  );

  await proof(
    "K22",
    "the docs say service.version comes from the release and OTEL_SERVICE_VERSION is not read",
    () => {
      const stale = (doc: string): boolean =>
        rowsNaming(
          migrationRows(doc),
          /openTelemetry|OTEL_SERVICE_VERSION/,
        ).some((row) => /no (service )?version is set/.test(row[1] ?? ""));
      const says = (doc: string): boolean =>
        rowsNaming(migrationRows(doc), /^`OTEL_SERVICE_VERSION`$/).some((row) =>
          /^Not read/.test(row[1] ?? ""),
        ) &&
        rowsNaming(migrationRows(doc), /openTelemetry/).some(
          (row) =>
            /`service\.version`/.test(row[1] ?? "") &&
            /`npm_package_version`/.test(row[1] ?? "") &&
            /`v1\.0\.0`/.test(row[1] ?? ""),
        );
      const envSetsVersion = (text: string): boolean =>
        /^OTEL_SERVICE_VERSION=/m.test(text);
      return holds([
        [
          "control: the detectors match the old docs",
          stale(OLD.serviceVersionRows) &&
            !says(OLD.serviceVersionRows) &&
            envSetsVersion(OLD.envExample),
        ],
        [
          "code: service.version is the release, then npm_package_version, then v1.0.0",
          /\[ATTR_SERVICE_VERSION\]:\s*resolveRelease\(config\) \|\| process\.env\.npm_package_version \|\| "v1\.0\.0"/.test(
            INSTRUMENTATION,
          ),
        ],
        [
          "code: deployment.environment is the configured environment, and absent otherwise",
          /const environment = resolveEnvironment\(config\);/.test(
            INSTRUMENTATION,
          ) &&
            /\.\.\.\(environment && \{ "deployment\.environment": environment \}\)/.test(
              INSTRUMENTATION,
            ),
        ],
        [
          "code: nothing in src reads OTEL_SERVICE_VERSION",
          !sourceReadsEnv("OTEL_SERVICE_VERSION"),
        ],
        ["the table no longer says no version is set", !stale(OBSERVABILITY)],
        ["the table says where the version comes from", says(OBSERVABILITY)],
        [
          ".env.example does not set OTEL_SERVICE_VERSION as if it worked",
          !envSetsVersion(ENV_EXAMPLE),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- K04
  section("K04 a later config");

  await proof(
    "K04",
    "the docs say a differing later config logs a warning naming the options, an identical one a debug line",
    () => {
      const detector = (doc: string): boolean => {
        const body = flat(sectionOf(doc, "## Initialisation"));
        return (
          /differs from the first, NeuroLink logs a warning that names the options that differ/.test(
            body,
          ) &&
          /identical config logs one debug line/.test(body) &&
          !/a debug message is logged once/.test(body)
        );
      };
      return holds([
        [
          "control: the detector rejects the old text",
          !detector(OLD.initialisation),
        ],
        [
          "code: differing fields warn once per set, an identical config logs debug once",
          /ignoredConfigWarnings\.has\(fields\)/.test(INSTRUMENTATION) &&
            /logger\.warn\(\s*`\$\{OTEL_LOG_PREFIX\} Telemetry already started; ignoring the observability config of a later NeuroLink instance/.test(
              INSTRUMENTATION,
            ) &&
            /if \(!ignoredConfigDebugLogged\) \{[\s\S]*?logger\.debug\(/.test(
              INSTRUMENTATION,
            ),
        ],
        ["the working tree says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  await proof(
    "K04",
    "the docs say tracing configuration is process-wide first-wins and a host provider must be registered first",
    () => {
      const detector = (doc: string): boolean => {
        const init = flat(sectionOf(doc, "## Initialisation"));
        const external = flat(
          sectionOf(doc, "## External OpenTelemetry provider"),
        );
        return (
          /process-wide and the first start wins/.test(init) &&
          /register your `TracerProvider` before tracing starts/.test(init) &&
          /before the first `new NeuroLink\(\{ observability \}\)`/.test(
            external,
          ) &&
          /otherwise NeuroLink creates and registers its own provider/.test(
            external,
          )
        );
      };
      return holds([
        [
          "control: the detector rejects the old text",
          !detector(`${OLD.initialisation}\n${OLD.externalProvider}`),
        ],
        [
          "code: once started, a later call only reports the ignored config",
          /if \(started\) \{\s*if \(config\) \{\s*reportIgnoredConfig\(config\);/.test(
            INSTRUMENTATION,
          ),
        ],
        [
          "code: the host check runs inside initialize, before NeuroLink builds its provider",
          INSTRUMENTATION.indexOf("if (hasHostTracerProvider()) {") > 0 &&
            INSTRUMENTATION.indexOf("if (hasHostTracerProvider()) {") <
              INSTRUMENTATION.indexOf("new NodeTracerProvider("),
        ],
        ["the working tree says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  // ----------------------------------------------------------------- K03
  section("K03 the exit flush");

  await proof(
    "K03",
    "the docs say a script that ends on its own flushes on beforeExit and what skips it",
    () => {
      const detector = (doc: string): boolean => {
        const body = flat(
          sectionOf(doc, "## Serverless and short-lived processes"),
        );
        return (
          /`beforeExit`/.test(body) &&
          /explicit `process\.exit\(\)`, a fatal signal or an uncaught exception skips that flush/.test(
            body,
          ) &&
          /`await flushOpenTelemetry\(\)`/.test(body) &&
          /timeouts/.test(body)
        );
      };
      return holds([
        [
          "control: the detector rejects the old section",
          !detector(OLD.serverless),
        ],
        [
          "code: the flush is registered on beforeExit only",
          /process\.once\("beforeExit", flushBeforeExit\)/.test(
            INSTRUMENTATION,
          ) &&
            !/process\.(once|on)\("(exit|SIGTERM|SIGINT|uncaughtException)"/.test(
              INSTRUMENTATION,
            ),
        ],
        ["the working tree says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  // ----------------------------------------------------------------- K34
  section("K34 which entries start tracing");

  await proof(
    "K34",
    "the docs name the entries that start tracing and the ones that do not, as the import graph has it",
    () => {
      const starting = [
        "src/lib/index.ts",
        "src/lib/server/index.ts",
        "src/lib/voice/livekit/index.ts",
        "src/lib/rag/index.ts",
        "src/lib/workflow/index.ts",
        "src/lib/evaluation/index.ts",
        "src/lib/processors/index.ts",
        "src/lib/autoresearch/index.ts",
      ];
      const notStarting = ["src/lib/client/index.ts", "src/lib/files/index.ts"];
      const detector = (doc: string): boolean => {
        const body = flat(sectionOf(doc, "## Initialisation"));
        return (
          !/the first time any NeuroLink span is created/.test(body) &&
          /the main package entry, `@juspay\/neurolink\/server` and `@juspay\/neurolink\/livekit`/.test(
            body,
          ) &&
          /`@juspay\/neurolink\/client` entry does not load the OpenTelemetry Node SDK/.test(
            body,
          ) &&
          /`@juspay\/neurolink\/livekit`, and the `\.\/rag`, `\.\/workflow`, `\.\/evaluation`, `\.\/processors` and `\.\/autoresearch` subpath entries/.test(
            body,
          ) &&
          !/subpath entries, imported on their own, do not start tracing/.test(
            body,
          ) &&
          /A constructor without an `observability` block starts nothing/.test(
            body,
          )
        );
      };
      const wronglyStarting = notStarting.filter(loadsStarter);
      const wronglyNot = starting.filter((entry) => !loadsStarter(entry));
      return holds([
        [
          "control: the detector rejects the old text",
          !detector(OLD.initialisation),
        ],
        [
          "control: the import walker follows a known static import (tracers -> telemetryStarter)",
          staticGraph("src/lib/telemetry/tracers.ts").files.has(
            join(ROOT, "src/lib/telemetry/telemetryStarter.ts"),
          ),
        ],
        [
          `code: entries that should load the start-up module but do not: ${wronglyNot.join(", ")}`,
          wronglyNot.length === 0,
        ],
        [
          `code: entries that should not load it but do: ${wronglyStarting.join(", ")}`,
          wronglyStarting.length === 0,
        ],
        [
          "code: the starter is a no-op until instrumentation registers it",
          /starter\?\.\(\);/.test(STARTER) &&
            /registerTelemetryStarter\(ensureTelemetry\);/.test(
              INSTRUMENTATION,
            ),
        ],
        [
          "code: the constructor starts telemetry only when an observability config is passed",
          /if \(this\.observabilityConfig\) \{\s*ensureTelemetry\(this\.observabilityConfig\);/.test(
            NEUROLINK,
          ),
        ],
        ["the working tree says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  await proof(
    "K34",
    "the telemetry guide and the exports table no longer say tracing starts with the first new NeuroLink()",
    () => {
      const guideStale = (text: string): boolean =>
        /Tracing starts with the first `new NeuroLink\(\)`/.test(text);
      const rowStale = (doc: string): boolean =>
        rowsNaming(migrationRows(doc), /^`initializeOpenTelemetry`$/).some(
          (row) => /^Automatic on `new NeuroLink\(\)`$/.test(row[1] ?? ""),
        );
      return holds([
        [
          "control: the detectors match the old texts",
          guideStale(OLD.guideStart) && rowStale(OLD.initializeRow),
        ],
        ["the guide", !guideStale(GUIDE)],
        [
          "the guide says the constructor starts it only with an observability block",
          /`new NeuroLink\(\{ observability \}\)`/.test(GUIDE),
        ],
        ["the exports table", !rowStale(OBSERVABILITY)],
      ]);
    },
  );

  // ----------------------------------------------------------------- X12
  section("X12 the main entry loads the OpenTelemetry SDK at import");

  await proof(
    "X12",
    "the docs say importing the main entry loads the SDK and exporters even with telemetry off, and no longer claim zero overhead",
    () => {
      const heavy = [
        "@opentelemetry/sdk-trace-node",
        "@opentelemetry/exporter-trace-otlp-http",
        "@opentelemetry/exporter-metrics-otlp-http",
        "@opentelemetry/sdk-metrics",
      ];
      const main = staticGraph("src/lib/index.ts").packages;
      const tracers = staticGraph("src/lib/telemetry/tracers.ts").packages;
      const zeroOverhead = (text: string): boolean =>
        /zero overhead/i.test(text);
      const says = (doc: string): boolean =>
        /Importing the main package entry loads the OpenTelemetry SDK, both OTLP exporters and the metrics SDK at import, even when telemetry stays off/.test(
          flat(sectionOf(doc, "## Initialisation")),
        );
      return holds([
        [
          "control: the detectors match the old texts",
          zeroOverhead(OLD.zeroOverhead) && !says(OLD.initialisation),
        ],
        [
          `code: the main entry statically loads ${heavy.join(", ")}`,
          heavy.every((name) => main.has(name)),
        ],
        [
          "code: the shared tracers load none of them",
          heavy.every((name) => !tracers.has(name)),
        ],
        ["the observability guide says it", says(OBSERVABILITY)],
        [
          "the telemetry guide no longer claims zero overhead",
          !zeroOverhead(GUIDE),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- K05
  section("K05 migration rows for restored behaviour");

  await proof(
    "K05",
    "the exports table says getTelemetryStatus().exporters is still returned",
    () => {
      const detector = (doc: string): boolean =>
        rowsNaming(
          migrationRows(doc),
          /getTelemetryStatus\(\)\.exporters/,
        ).some(
          (row) =>
            /^Still returned/.test(row[1] ?? "") &&
            /`ExporterStatus`/.test(row[1] ?? "") &&
            /getStatuses\(\)/.test(row[1] ?? ""),
        );
      const statusBody = NEUROLINK.slice(
        NEUROLINK.indexOf("getTelemetryStatus(): {"),
        NEUROLINK.indexOf("getMetrics(): MetricsSummary"),
      );
      return holds([
        [
          "control: the detector rejects the old row",
          !detector(OLD.exportersRow),
        ],
        [
          "code: getTelemetryStatus returns exporters from the registry",
          /exporters: ExporterStatus\[\];/.test(statusBody) &&
            /exporters: getExporterRegistry\(\)\.getStatuses\(\),/.test(
              statusBody,
            ),
        ],
        ["the working tree's row says it", detector(OBSERVABILITY)],
      ]);
    },
  );

  await proof(
    "K05",
    "every migration row for a restored name keeps the name in its first cell and says it is still there",
    () => {
      const restored: readonly [string, RegExp][] = [
        ["langfuse.enabled", /^Kept\b/],
        ["NEUROLINK_TELEMETRY_ENABLED", /^Still read\b/],
        ["LANGFUSE_ENABLED", /^Still read\b/],
        ["LANGFUSE_ENVIRONMENT", /^Still read\b/],
        ["PUBLIC_APP_VERSION", /^Still read\b/],
        ["getTelemetryStatus().exporters", /^Still returned\b/],
      ];
      const missing = (doc: string): string[] =>
        restored
          .filter(
            ([name, status]) =>
              !migrationRows(doc).some(
                (row) =>
                  (row[0] ?? "").includes(name) && status.test(row[1] ?? ""),
              ),
          )
          .map(([name]) => name);
      const oldTable = `${OLD.enabledRow}${OLD.envSwitchRows.split("\n").slice(4).join("\n")}\n${OLD.exportersRow.split("\n").slice(4).join("\n")}`;
      return holds([
        [
          "control: none of the old rows said so",
          missing(oldTable).length === restored.length,
        ],
        [
          `rows missing or still saying removed: ${missing(OBSERVABILITY).join(", ")}`,
          missing(OBSERVABILITY).length === 0,
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- X36
  section("X36 the MCP tool-call comment");

  await proof(
    "X36",
    "the comment on a resolved MCP error names the mcp_tool_calls_total label it sets, a metric aiMetrics.ts defines",
    () => {
      const commentBefore = (text: string): string => {
        const at = text.indexOf("const resolvedError = result.isErrorResult");
        const lines = text.slice(0, at).split("\n").reverse().slice(1);
        const end = lines.findIndex((line) => !line.trim().startsWith("//"));
        return lines
          .slice(0, end < 0 ? lines.length : end)
          .reverse()
          .join(" ");
      };
      const detector = (text: string): boolean =>
        /success=false in mcp_tool_calls_total/.test(
          commentBefore(text).replace(/\s*\/\/\s*/g, " "),
        );
      return holds([
        [
          "control: the detector rejects the old comment",
          !detector(OLD.mcpComment),
        ],
        [
          "code: aiMetrics.ts defines mcp_tool_calls_total with a success label",
          /createCounter\("mcp_tool_calls_total"/.test(AI_METRICS) &&
            /success: success\.toString\(\)/.test(AI_METRICS),
        ],
        [
          "code: a resolved MCP error is recorded with success false",
          /recordMCPToolCall\(toolName, duration, !resolvedError\)/.test(
            EXTERNAL_SERVER_MANAGER,
          ),
        ],
        ["the comment says it", detector(EXTERNAL_SERVER_MANAGER)],
      ]);
    },
  );

  // ----------------------------------------------------------------- X43
  section("X43 the testing plan");

  await proof(
    "X43",
    "the testing plan names only environment variables and telemetry exports that exist in src",
    () => {
      const rootExports = new Set(
        [...ROOT_INDEX.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((match) =>
          (match[1] ?? "")
            .split(",")
            .map(
              (name) =>
                name
                  .trim()
                  .split(/\s+as\s+/)
                  .pop() ?? "",
            )
            .filter((name) => /^[A-Za-z_]\w*$/.test(name)),
        ),
      );
      const isTelemetryName = (name: string): boolean =>
        /Telemetry|Langfuse|Exporter/.test(name);
      const problems = (text: string): string[] => {
        const envVars = [
          ...new Set(
            [...text.matchAll(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b(?!\*)/g)].map(
              (match) => match[0],
            ),
          ),
        ].filter((name) => !sourceReadsEnv(name));
        const imported = [
          ...text.matchAll(
            /import\s*\{([^}]*)\}\s*from\s*["']@juspay\/neurolink["']/g,
          ),
        ]
          .flatMap((match) => (match[1] ?? "").split(","))
          .map((name) => name.trim())
          .filter((name) => name.length > 0 && isTelemetryName(name))
          .filter((name) => !rootExports.has(name));
        const called = [...text.matchAll(/\b([a-z]\w*)\(/g)]
          .map((match) => match[1] ?? "")
          .filter(isTelemetryName)
          .filter((name) => !rootExports.has(name));
        return [...envVars, ...new Set([...imported, ...called])];
      };
      return holds([
        [
          "control: a plan naming removed exports and an unread variable is flagged",
          problems(OLD.plan).length === 4,
        ],
        [
          "control: NEUROLINK_TELEMETRY_ENABLED is read again, so naming it is fine",
          problems("export NEUROLINK_TELEMETRY_ENABLED=true").length === 0,
        ],
        [
          "control: the root exports were read",
          rootExports.has("getLangfuseHealthStatus") &&
            rootExports.has("flushOpenTelemetry"),
        ],
        [
          `the plan names: ${problems(PLAN).join(", ")}`,
          problems(PLAN).length === 0,
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- X46
  section("X46 telemetry guide and onboarding page");

  await proof(
    "X46",
    "the telemetry guide's OTEL_SERVICE_NAME row gives the code default",
    () => {
      const codeDefault =
        /OTEL_SERVICE_NAME \|\| "([^"]+)"/.exec(INSTRUMENTATION)?.[1] ?? "";
      const [, oldRow = ""] = OLD.guideEnvRows.split("\n");
      const gives = (row: string): boolean =>
        codeDefault.length > 0 && row.includes(`\`${codeDefault}\``);
      return holds([
        ["control: the old row did not", !gives(oldRow)],
        ["the guide's row does", gives(rowOf(GUIDE, "OTEL_SERVICE_NAME"))],
      ]);
    },
  );

  await proof(
    "X46",
    "proxy-cli-onboarding.md names the recordAIRequest call the proxy makes, and only metric functions and counters that exist",
    () => {
      const named = (text: string): string[] => [
        ...new Set(
          [
            ...text.matchAll(
              /\b(record[A-Z]\w*|[a-z][a-z0-9]*(?:_[a-z0-9]+)*_total)\b/g,
            ),
          ].map((match) => match[1] ?? ""),
        ),
      ];
      const exists = (name: string): boolean =>
        name.startsWith("record")
          ? libHits(new RegExp(`export function ${name}\\(`)).length > 0
          : DEFINED_METRICS.has(name);
      const detector = (text: string): boolean =>
        /`recordAIRequest` metric call/.test(flat(text)) &&
        named(text).every(exists);
      return holds([
        [
          "control: the detector rejects the old text",
          !detector(OLD.onboarding),
        ],
        [
          "control: an unknown counter is caught",
          !named(
            "`proxy_requests_totals` and `neurolink_requests_total`",
          ).every(exists),
        ],
        [
          "code: the proxy calls recordAIRequest and creates proxy_requests_total",
          /recordAIRequest\(\s*this\.billingProvider/.test(PROXY_TRACER) &&
            /createCounter\("proxy_requests_total"/.test(PROXY_TRACER),
        ],
        [
          `names that do not exist: ${named(ONBOARDING)
            .filter((name) => !exists(name))
            .join(", ")}`,
          named(ONBOARDING).every(exists),
        ],
        ["the page names the call", detector(ONBOARDING)],
      ]);
    },
  );
});

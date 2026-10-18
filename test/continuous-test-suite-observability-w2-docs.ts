#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability documentation and stale references
 *
 * Follow-up to the Langfuse OTEL pipeline (BZ-6924). Every check prints one
 * line, `PROOF <id> PASS|FAIL <what is checked>`, and the suite exits non-zero
 * when any check fails.
 *
 *   K05  migration table: setLangfuseContext signature and the removed types
 *   K06  migration table: rows for things that still exist, a phantom option
 *   K24  span-name claims and comments that name removed processors
 *   X27  stale source comments (ContextEnricher, initializeOpenTelemetry)
 *   X34  FEATURE-STATUS.md documents a removed CLI command
 *   X36  stale source comments (mcp_tool_calls_total, MeterProvider owner)
 *   X43  removed names still referenced by the docs site and test plan
 *   X46  telemetry guide defaults, a removed metric call
 *   K17  proxy bodies are opt-in (documentation half)
 *   K28  delivery failures do not open the circuit breaker (documentation half)
 *   K40  proxy attribute names (documentation half)
 *   K03  every realtime turn is traced, shutdown flush budget
 *   K21  mask and redactIO act on what is sent to Langfuse and on no other sink
 *   K07  NEUROLINK_RECORD_INPUTS is documented
 *
 * This suite reads shipped files (documentation, source, package.json) with
 * node:fs and `git show`; it imports nothing from `src/` or `dist/`, so there
 * is one module graph and no determinism exception to claim. A documentation
 * check is only worth something if it can fail, so each one carries a control:
 * a "must be gone" detector has to match the text of the merged PR (fc892bbb5)
 * and a "must say" detector has to accept a fixture that says it and reject
 * the merged PR's text. The controls read git history, so run the suite from a
 * clone that has it.
 *
 * The K17, K28 and K40 checks cover the documentation only. Whether the code
 * does what the documentation now says is proven by the area that changes that
 * code; the matrix `limits` field says so.
 *
 * Offline: nothing leaves the machine.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-w2-docs.ts
 */
import "./helpers/credentialFreeEnv.js";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { assert, defineSuite } from "./helpers/harness.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
// The merged PR #2002 and the commit before it.
const MERGED = "fc892bbb5";
const BASE = "2d394138094c3b89015975ea3fdce69e4a75a5c9";

const OBSERVABILITY = "docs/features/observability.md";
const TELEMETRY_GUIDE = "docs/telemetry-guide.md";
const ONBOARDING = "docs/features/proxy-cli-onboarding.md";
const PROXY_CONFIG = "docs/features/claude-proxy-config-reference.md";
const PROXY_OBSERVABILITY = "docs/features/claude-proxy-observability.md";
const FEATURE_STATUS = "src/lib/observability/FEATURE-STATUS.md";
const SYNC_DOCS = "docs-site/scripts/sync-docs.ts";
const TEST_PLAN = "docs/comprehensive-testing-plan.md";

const read = (relativePath: string): string =>
  readFileSync(join(ROOT, relativePath), "utf8");

function git(args: readonly string[]): string {
  return execFileSync("git", ["-C", ROOT, ...args], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const at = (ref: string, relativePath: string): string =>
  git(["show", `${ref}:${relativePath}`]);

/** Number of files under `pathspec` at `ref` that contain `term` as a whole word; 0 when none. */
function filesWithAt(ref: string, term: string, pathspec: string): number {
  try {
    return git(["grep", "-lwF", "-e", term, ref, "--", pathspec])
      .split("\n")
      .filter(Boolean).length;
  } catch {
    return 0;
  }
}

function sourceFiles(directory: string): string[] {
  return readdirSync(join(ROOT, directory), {
    recursive: true,
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => join(entry.parentPath, entry.name));
}

const SOURCE_FILES = sourceFiles("src/lib");
const SOURCE = new Map(
  SOURCE_FILES.map((file) => [file, readFileSync(file, "utf8")] as const),
);

/** Files under `src/lib` whose text matches `pattern`. */
const sourceHits = (pattern: RegExp): string[] =>
  [...SOURCE.entries()]
    .filter(([, text]) => pattern.test(text))
    .map(([file]) => file.slice(ROOT.length));

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
const flat = (text: string): string => text.replace(/\s+/g, " ");

type Condition = readonly [label: string, ok: boolean];

function holds(conditions: readonly Condition[]): boolean {
  const failed = conditions.filter(([, ok]) => !ok).map(([label]) => label);
  if (failed.length > 0) {
    process.stderr.write(`    unmet: ${failed.join("; ")}\n`);
  }
  return failed.length === 0;
}

/**
 * Passes when `detector` still finds the stale text in the merged PR (so the
 * detector can see it) and no longer finds it in the working tree.
 */
function gone(
  detector: (text: string) => boolean,
  merged: string,
  current: string,
): boolean {
  return holds([
    ["control: the detector matches the merged PR's text", detector(merged)],
    ["the stale text is gone", !detector(current)],
  ]);
}

/**
 * Passes when `detector` accepts the fixture, rejects the merged PR's text
 * (so the check is able to fail) and accepts the working tree.
 */
function says(
  detector: (text: string) => boolean,
  fixture: string,
  merged: string,
  current: string,
): boolean {
  return holds([
    ["control: the detector accepts a fixture that says it", detector(fixture)],
    ["control: the merged PR's text did not say it", !detector(merged)],
    ["the working tree says it", detector(current)],
  ]);
}

const REMOVED_TYPES = [
  "LangfuseContext",
  "TraceNameFormat",
  "LangfuseConfig",
  "ExporterName",
  "ToolSpanCall",
  "TelemetryConfigureArgs",
  "TelemetryListExportersArgs",
  "ObservabilityExportersArgs",
] as const;

const wordIn = (name: string): RegExp => new RegExp(`\\b${name}\\b`);
const firstCellNames = (name: string) => (rows: string[][]) =>
  rows.some((row) => wordIn(name).test(row[0] ?? ""));

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};
const packageJson = JSON.parse(read("package.json")) as PackageJson;

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

const { test, section, runSuite } = defineSuite(
  "Observability documentation and stale references",
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

const mergedDoc = at(MERGED, OBSERVABILITY);
const doc = read(OBSERVABILITY);

void runSuite(async () => {
  // ----------------------------------------------------------------- K05
  section("K05 migration table gaps");

  await proof(
    "K05",
    "the setLangfuseContext signature change has a migration row",
    () => {
      const detector = (text: string): boolean =>
        migrationRows(text).some(
          (row) =>
            /setLangfuseContext/.test(row[0] ?? "") &&
            /\bfn\b|callback/i.test(row[1] ?? "") &&
            /required/i.test(row[1] ?? ""),
        );
      const fixture = `${MIGRATION_HEADING}\n| \`setLangfuseContext(context, callback?)\` | \`setLangfuseContext(params, fn)\`; \`fn\` is required |\n`;
      return says(detector, fixture, mergedDoc, doc);
    },
  );

  await proof(
    "K05",
    "every removed observability type has a migration row",
    () => {
      const missing = (text: string): string[] =>
        REMOVED_TYPES.filter(
          (name) => !firstCellNames(name)(migrationRows(text)),
        );
      return holds([
        [
          "control: the merged PR's table lacked all of them",
          missing(mergedDoc).length === REMOVED_TYPES.length,
        ],
        [
          `rows missing for: ${missing(doc).join(", ")}`,
          missing(doc).length === 0,
        ],
      ]);
    },
  );

  await proof(
    "K05",
    "the removed ToolExecutionGuards.withToolSpan member has a migration row",
    () => {
      const detector = (text: string): boolean =>
        firstCellNames("withToolSpan")(migrationRows(text));
      return says(
        detector,
        `${MIGRATION_HEADING}\n| \`ToolExecutionGuards.withToolSpan\` | none |\n`,
        mergedDoc,
        doc,
      );
    },
  );

  await proof(
    "K05",
    "the loop-engine types that gained a required provider have a migration row",
    () => {
      const detector = (text: string): boolean =>
        migrationRows(text).some(
          (row) =>
            /AnthropicLoopAdapterConfig/.test(row[0] ?? "") &&
            /GeminiLoopAdapterCoreConfig/.test(row[0] ?? "") &&
            /NativeGenerateLoopArgs/.test(row[0] ?? "") &&
            /provider/.test(row[0] ?? ""),
        );
      const typeFiles = ["loopEngine", "generate"].map((name) =>
        read(`src/lib/types/${name}.ts`),
      );
      const requiresProvider = (type: string): boolean =>
        typeFiles.some((text) => {
          const start = text.indexOf(`export type ${type}`);
          const body = text.slice(start, text.indexOf("\n};", start));
          return start >= 0 && /\n\s+provider: string;/.test(body);
        });
      return holds([
        [
          "control: the detector accepts a fixture row",
          detector(
            "## Migrating from the previous version\n| `AnthropicLoopAdapterConfig`, `GeminiLoopAdapterCoreConfig`, `NativeGenerateLoopArgs`: `provider` | set it |\n",
          ),
        ],
        [
          "control: the merged PR's table had no such row",
          !detector(mergedDoc),
        ],
        [
          "the row is true: provider is required on all three types",
          requiresProvider("AnthropicLoopAdapterConfig") &&
            requiresProvider("GeminiLoopAdapterCoreConfig") &&
            requiresProvider("NativeGenerateLoopArgs"),
        ],
        ["the working tree has the row", detector(doc)],
      ]);
    },
  );

  await proof(
    "K05",
    "the removed config option, result fields and env vars have migration rows",
    () => {
      const wanted: readonly [string, RegExp][] = [
        ["observability.openTelemetry", /openTelemetry/],
        ["getLangfuseHealthStatus fields", /credentialsValid/],
        ["getTelemetryStatus exporters", /getTelemetryStatus\(\)\.exporters/],
        ["LANGFUSE_ENABLED", /LANGFUSE_ENABLED/],
        ["LANGFUSE_ENVIRONMENT", /LANGFUSE_ENVIRONMENT/],
        ["PUBLIC_APP_VERSION", /PUBLIC_APP_VERSION/],
        ["OTEL_SERVICE_VERSION", /OTEL_SERVICE_VERSION/],
      ];
      const missing = (text: string): string[] =>
        wanted
          .filter(
            ([, pattern]) =>
              !migrationRows(text).some((row) => pattern.test(row[0] ?? "")),
          )
          .map(([label]) => label);
      return holds([
        [
          "control: the merged PR's table lacked them",
          missing(mergedDoc).length === wanted.length,
        ],
        [
          `rows missing for: ${missing(doc).join(", ")}`,
          missing(doc).length === 0,
        ],
      ]);
    },
  );

  // LANGFUSE_ENABLED, LANGFUSE_ENVIRONMENT, PUBLIC_APP_VERSION and
  // getTelemetryStatus().exporters were restored after this check was written,
  // so their rows now say they are still there and they are not "gone".
  await proof(
    "K05",
    "the removals the new rows describe are real (no source left, source at the base), and getTelemetryStatus() still returns exporters",
    () => {
      const goneTerms = [
        ...REMOVED_TYPES,
        "withToolSpan",
        "credentialsValid",
        "OTEL_SERVICE_VERSION",
      ];
      const stillInSource = goneTerms.filter(
        (term) => sourceHits(wordIn(term)).length > 0,
      );
      const absentAtBase = goneTerms.filter(
        (term) => filesWithAt(BASE, term, "src") === 0,
      );
      const neurolink = SOURCE.get(join(ROOT, "src/lib/neurolink.ts")) ?? "";
      const statusStart = neurolink.indexOf("getTelemetryStatus(): {");
      const statusBody = neurolink.slice(
        statusStart,
        neurolink.indexOf("\n  }\n", statusStart),
      );
      return holds([
        [
          `still in src/lib: ${stillInSource.join(", ")}`,
          stillInSource.length === 0,
        ],
        [
          `control: not found at the base: ${absentAtBase.join(", ")}`,
          absentAtBase.length === 0,
        ],
        [
          "ObservabilityConfig has no openTelemetry key",
          !/openTelemetry\??:/.test(
            SOURCE.get(join(ROOT, "src/lib/types/observability.ts")) ?? "",
          ),
        ],
        [
          "NeuroLink.getTelemetryStatus() returns exporters again",
          statusStart > 0 && /\bexporters\??:/.test(statusBody),
        ],
        [
          "control: it did at the base",
          /\bexporters\??:/.test(
            at(BASE, "src/lib/neurolink.ts").slice(
              at(BASE, "src/lib/neurolink.ts").indexOf(
                "getTelemetryStatus(): {",
              ),
              at(BASE, "src/lib/neurolink.ts").indexOf(
                "getTelemetryStatus(): {",
              ) + 1500,
            ),
          ),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- K06
  section("K06 migration rows that are wrong");

  await proof(
    "K06",
    "the table no longer lists ExtendedObservabilityConfig or *ExporterConfig as removed",
    () => {
      const detector = (text: string): boolean =>
        migrationRows(text).some((row) =>
          /ExtendedObservabilityConfig|\*ExporterConfig/.test(row[0] ?? ""),
        );
      const exporterTypes =
        SOURCE.get(join(ROOT, "src/lib/types/exporter.ts")) ?? "";
      return holds([
        ["control: the merged PR's table listed them", detector(mergedDoc)],
        ["the working tree's table does not", !detector(doc)],
        [
          "they still exist: ExtendedObservabilityConfig and LangfuseExporterConfig are exported",
          /export type ExtendedObservabilityConfig\b/.test(exporterTypes) &&
            /export type LangfuseExporterConfig\b/.test(exporterTypes),
        ],
        [
          "the doc says they are unchanged",
          /ExtendedObservabilityConfig[^.]*unchanged|unchanged[^.]*ExtendedObservabilityConfig/s.test(
            doc,
          ),
        ],
      ]);
    },
  );

  await proof(
    "K06",
    "the table no longer lists mediaUploadEnabled, an option that never existed",
    () => {
      const detector = (text: string): boolean =>
        /mediaUploadEnabled|LANGFUSE_MEDIA_UPLOAD_ENABLED/.test(
          migrationRows(text)
            .map((row) => row[0])
            .join("\n"),
        );
      return holds([
        ["control: the merged PR's table listed it", detector(mergedDoc)],
        ["the working tree's table does not", !detector(doc)],
        [
          "it never existed: no source file at the base mentions it",
          filesWithAt(BASE, "mediaUploadEnabled", "src") === 0 &&
            filesWithAt(BASE, "LANGFUSE_MEDIA_UPLOAD_ENABLED", "src") === 0,
        ],
        [
          "control: the same search finds a name that did exist",
          filesWithAt(BASE, "autoDetectExternalProvider", "src") > 0,
        ],
      ]);
    },
  );

  await proof(
    "K06",
    "the dependency moves are documented and match package.json",
    () => {
      const notes = flat(doc);
      const detector = (text: string): boolean => {
        const body = flat(text);
        return (
          /sdk-trace-node[^.]*(peer|dependenc)[^.]*dependenc/i.test(body) &&
          /@langfuse\/otel[^.]*(optional)[^.]*(dev)/i.test(body) &&
          /@langfuse\/core/.test(body) &&
          /@langfuse\/tracing/.test(body)
        );
      };
      return holds([
        ["control: the merged PR's doc did not say it", !detector(mergedDoc)],
        ["the working tree says it", detector(notes)],
        [
          "sdk-trace-node is a dependency now",
          packageJson.dependencies?.["@opentelemetry/sdk-trace-node"] !==
            undefined &&
            packageJson.peerDependencies?.["@opentelemetry/sdk-trace-node"] ===
              undefined,
        ],
        [
          "@langfuse/otel is a devDependency, not optional",
          packageJson.devDependencies?.["@langfuse/otel"] !== undefined &&
            packageJson.optionalDependencies?.["@langfuse/otel"] === undefined,
        ],
        [
          "@langfuse/core and @langfuse/tracing are dependencies",
          packageJson.dependencies?.["@langfuse/core"] !== undefined &&
            packageJson.dependencies?.["@langfuse/tracing"] !== undefined,
        ],
        [
          "control: the base had sdk-trace-node as a peer",
          at(BASE, "package.json").includes(
            '"@opentelemetry/sdk-trace-node"',
          ) &&
            (JSON.parse(at(BASE, "package.json")) as PackageJson)
              .peerDependencies?.["@opentelemetry/sdk-trace-node"] !==
              undefined,
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- K24
  section("K24 span names and stale processor comments");

  await proof(
    "K24",
    "no comment names the removed ContextEnricher or the LangfuseSpanProcessor as NeuroLink's own mapper",
    () => {
      const detector = (text: string): boolean =>
        /ContextEnricher|attributes the LangfuseSpanProcessor maps/.test(text);
      const files = [
        "src/lib/core/modules/StreamHandler.ts",
        "src/lib/providers/openaiChatCompletionsBase.ts",
        "src/lib/providers/googleVertex/client.ts",
        "src/lib/utils/timeout.ts",
      ];
      return holds([
        ...files.map(
          (file): Condition => [
            `control: ${file} named it in the merged PR`,
            detector(at(MERGED, file)),
          ],
        ),
        ...files.map(
          (file): Condition => [
            `${file} no longer does`,
            !detector(read(file)),
          ],
        ),
      ]);
    },
  );

  await proof(
    "K24",
    "the docs no longer say no span name or attribute carries the product name, and list the neurolink.* names that remain",
    () => {
      const names = [
        ...new Set(
          [...SOURCE.values()].flatMap((text) =>
            [...text.matchAll(/name: "(neurolink\.[a-z_.]+)"/g)].map(
              (match) => match[1] ?? "",
            ),
          ),
        ),
      ];
      const covers = (text: string, name: string): boolean =>
        text.includes(name) ||
        text.includes(`${name.split(".").slice(0, 2).join(".")}.*`);
      const naming = sectionOf(doc, "## What is recorded");
      const uncovered = names.filter((name) => !covers(naming, name));
      const absolute = (text: string): boolean =>
        /No span name, attribute key or metadata key contains the product name/.test(
          text,
        );
      return holds([
        [
          "control: at least 13 neurolink.* span names are in src/lib",
          names.length >= 13,
        ],
        [
          "control: the merged PR's doc made the absolute claim",
          absolute(mergedDoc),
        ],
        ["the working tree does not make it", !absolute(doc)],
        [
          `names the docs omit: ${uncovered.join(", ")}`,
          uncovered.length === 0,
        ],
      ]);
    },
  );

  await proof(
    "K24",
    "the docs say the RAG, workflow, evaluation, processor and autoresearch spans are exported as observations and the other spans that are not observations are skipped",
    () => {
      const detector = (text: string): boolean => {
        const body = flat(text);
        return (
          /Every observation is exported[^.]*RAG, workflow, evaluation, processor and autoresearch features, which arrive as a plain `span` observation/.test(
            body,
          ) &&
          /Spans that are not observations \(health checks, auth, middleware[^)]*\)[^.]*are skipped/.test(
            body,
          ) &&
          !/every other span NeuroLink's own tracers create/.test(body) &&
          !/RAG, workflow, evaluation[^.]*not yet recorded/.test(body)
        );
      };
      return says(
        detector,
        "Every observation is exported: model calls, and the spans of the RAG, workflow, evaluation, processor and autoresearch features, which arrive as a plain `span` observation. Spans that are not observations (health checks, auth, middleware) are skipped.",
        mergedDoc,
        doc,
      );
    },
  );

  await proof(
    "K24",
    "the claim matches the exporter: only observations are exported, internal ones are not, and no scope name decides",
    () => {
      const processor =
        SOURCE.get(
          join(ROOT, "src/lib/observability/exporterSpanProcessor.ts"),
        ) ?? "";
      const scopes =
        SOURCE.get(join(ROOT, "src/lib/constants/telemetry.ts")) ?? "";
      return holds([
        [
          "isExported() exports an observation",
          /INTERNAL_SPAN_ATTRIBUTE\] !== true && isObservation\(span\)/.test(
            processor,
          ),
        ],
        [
          "isExported() drops spans marked internal",
          /INTERNAL_SPAN_ATTRIBUTE\] !== true/.test(processor),
        ],
        [
          "no list of tracer scopes decides what is exported",
          !/NEUROLINK_TRACER_SCOPES/.test(processor) &&
            !/NEUROLINK_TRACER_SCOPES/.test(scopes),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- X27
  section("X27 stale comments");

  await proof(
    "X27",
    "no source comment names ContextEnricher or initializeOpenTelemetry",
    () => {
      const terms = ["ContextEnricher", "initializeOpenTelemetry"];
      const mergedFiles = new Set(
        terms.flatMap((term) =>
          git(["grep", "-lwF", "-e", term, MERGED, "--", "src"])
            .split("\n")
            .filter(Boolean),
        ),
      );
      return holds([
        [
          "control: the merged PR had them in four files",
          mergedFiles.size === 4,
        ],
        [
          "no file under src/lib has them now",
          terms.every((term) => sourceHits(wordIn(term)).length === 0),
        ],
      ]);
    },
  );

  await proof(
    "X27",
    "the reworded comments describe the current mechanism",
    () => {
      const stream = read("src/lib/core/modules/StreamHandler.ts");
      const timeout = read("src/lib/utils/timeout.ts");
      const chat = read("src/lib/providers/openaiChatCompletionsBase.ts");
      return holds([
        [
          "StreamHandler names ExporterSpanProcessor",
          /ExporterSpanProcessor/.test(stream),
        ],
        [
          "timeout names ExporterSpanProcessor or markFailure",
          /ExporterSpanProcessor|markFailure/.test(timeout),
        ],
        [
          "openaiChatCompletionsBase names ExporterSpanProcessor",
          /ExporterSpanProcessor/.test(chat),
        ],
        [
          "control: markFailure and ExporterSpanProcessor exist in src",
          sourceHits(/function markFailure/).length > 0 &&
            sourceHits(/export class ExporterSpanProcessor/).length > 0,
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- X34
  section("X34 FEATURE-STATUS.md");

  await proof(
    "X34",
    "FEATURE-STATUS.md no longer documents `neurolink observability exporters`",
    () => {
      const detector = (text: string): boolean =>
        /observability exporters|obs exp\b/.test(text);
      const commands = read("src/cli/commands/observability.ts");
      return holds([
        [
          "control: the merged PR's file documented it",
          detector(at(MERGED, FEATURE_STATUS)),
        ],
        ["the working tree's file does not", !detector(read(FEATURE_STATUS))],
        [
          "the CLI registers no exporters subcommand",
          !/createExportersCommand|command: "exporters"/.test(commands),
        ],
        [
          "control: the CLI does register status, metrics and costs",
          /createStatusCommand/.test(commands) &&
            /createMetricsCommand/.test(commands) &&
            /createCostsCommand/.test(commands),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- X36
  section("X36 stale comments");

  // mcp_tool_calls_total is defined again in aiMetrics.ts, so a comment may
  // name it; what must not happen is a comment naming a metric that is gone.
  await proof(
    "X36",
    "every comment in src/lib that names a *_total metric, mcp_tool_calls_total included, names one src/lib defines",
    () => {
      const detector = (text: string): boolean =>
        /mcp_tool_calls_total/.test(text);
      const defined = new Set(
        [...SOURCE.values()].flatMap((text) =>
          [
            ...text.matchAll(
              /create(?:Counter|Histogram|UpDownCounter|ObservableGauge|Gauge)\(\s*["`]([a-z0-9_]+)["`]/g,
            ),
          ].map((match) => match[1] ?? ""),
        ),
      );
      const commentNames = (text: string): string[] =>
        [...text.matchAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g)].flatMap((comment) =>
          [
            ...comment[0].matchAll(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)*_total\b/g),
          ].map((match) => match[0]),
        );
      const unknown = [
        ...new Set([...SOURCE.values()].flatMap(commentNames)),
      ].filter((name) => !defined.has(name));
      const aiMetrics =
        SOURCE.get(join(ROOT, "src/lib/telemetry/aiMetrics.ts")) ?? "";
      return holds([
        [
          "control: the merged PR's externalServerManager named it",
          detector(at(MERGED, "src/lib/mcp/externalServerManager.ts")),
        ],
        [
          "control: a comment naming a metric nothing defines is caught",
          commentNames("// counts neurolink_errors_total").some(
            (name) => !defined.has(name),
          ),
        ],
        [
          "aiMetrics.ts defines mcp_tool_calls_total",
          /createCounter\("mcp_tool_calls_total"/.test(aiMetrics),
        ],
        [
          `comments naming metrics src/lib does not define: ${unknown.join(", ")}`,
          unknown.length === 0,
        ],
      ]);
    },
  );

  await proof(
    "X36",
    "the proxy tracer comment names the code that creates the MeterProvider",
    () => {
      const comment = read("src/lib/proxy/proxyTracer.ts").slice(0, 4000);
      const instrumentation =
        SOURCE.get(
          join(
            ROOT,
            "src/lib/services/server/ai/observability/instrumentation.ts",
          ),
        ) ?? "";
      return holds([
        [
          "control: the merged PR's comment named initializeOpenTelemetry",
          /registered in initializeOpenTelemetry\(\)/.test(
            at(MERGED, "src/lib/proxy/proxyTracer.ts"),
          ),
        ],
        [
          "the comment no longer does",
          !/initializeOpenTelemetry/.test(comment),
        ],
        [
          "the comment names ensureTelemetry",
          /MeterProvider is (created|registered)[^\n]*ensureTelemetry/.test(
            comment.replace(/\n\/\/\s*/g, " "),
          ),
        ],
        [
          "ensureTelemetry exists and creates the OTLP MeterProvider",
          /export function ensureTelemetry/.test(instrumentation) &&
            /createOtlpMeterProvider/.test(instrumentation),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- X43
  section("X43 references outside src and test");

  await proof(
    "X43",
    "sync-docs.ts maps no link to an API page that was removed",
    () => {
      const mapped = (text: string): string[] =>
        [
          ...text.matchAll(
            /:\s*"\/api\/((?:functions|classes|type-aliases|variables)\/[A-Za-z0-9_]+)"/gm,
          ),
        ].map((match) => match[1] ?? "");
      const missing = (text: string): string[] =>
        mapped(text).filter((key) => !isTrackedApiPage(key));
      return holds([
        [
          "control: the merged PR's map had dead entries",
          missing(at(MERGED, SYNC_DOCS)).length >= 4,
        ],
        [
          `dead entries now: ${missing(read(SYNC_DOCS)).join(", ")}`,
          missing(read(SYNC_DOCS)).length === 0,
        ],
        [
          "control: the map still has live entries",
          mapped(read(SYNC_DOCS)).length >= 40,
        ],
      ]);
    },
  );

  // NEUROLINK_TELEMETRY_ENABLED is read again (aiMetrics.ts), so naming it is
  // no longer wrong; naming a variable or export that does not exist is.
  await proof(
    "X43",
    "the testing plan names only environment variables and telemetry exports that exist in src/lib",
    () => {
      const index = SOURCE.get(join(ROOT, "src/lib/index.ts")) ?? "";
      const rootExports = new Set(
        [...index.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((match) =>
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
      const isRead = (name: string): boolean =>
        sourceHits(new RegExp(`process\\.env\\.${name}\\b|["'\`]${name}["'\`]`))
          .length > 0;
      const isTelemetryName = (name: string): boolean =>
        /Telemetry|Langfuse|Exporter/.test(name);
      const problems = (text: string): string[] => {
        const envVars = [
          ...new Set(
            [...text.matchAll(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b(?!\*)/g)].map(
              (match) => match[0],
            ),
          ),
        ].filter((name) => !isRead(name));
        const imported = [
          ...text.matchAll(
            /import\s*\{([^}]*)\}\s*from\s*["']@juspay\/neurolink["']/g,
          ),
        ]
          .flatMap((match) => (match[1] ?? "").split(","))
          .map((name) => name.trim())
          .filter((name) => name.length > 0 && isTelemetryName(name));
        const called = [...text.matchAll(/\b([a-z]\w*)\(/g)]
          .map((match) => match[1] ?? "")
          .filter(isTelemetryName);
        return [
          ...envVars,
          ...new Set(
            [...imported, ...called].filter((name) => !rootExports.has(name)),
          ),
        ];
      };
      const plan = read(TEST_PLAN);
      return holds([
        [
          "control: a plan naming removed exports and an unread variable is flagged",
          problems(
            'import { initializeTelemetry, TelemetryService } from "@juspay/neurolink";\nprocess.env.NEUROLINK_TRACE_EVERYTHING = "true";\ngetTelemetryStatus();\n',
          ).length === 4,
        ],
        [
          "control: NEUROLINK_TELEMETRY_ENABLED is read in src/lib",
          isRead("NEUROLINK_TELEMETRY_ENABLED"),
        ],
        [
          "the plan names the keys that enable tracing",
          /LANGFUSE_PUBLIC_KEY/.test(plan),
        ],
        [
          `the plan names: ${problems(plan).join(", ")}`,
          problems(plan).length === 0,
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- X46
  section("X46 telemetry guide");

  await proof(
    "X46",
    "the telemetry guide gives the OTEL_SERVICE_NAME default the code uses",
    () => {
      const instrumentation =
        SOURCE.get(
          join(
            ROOT,
            "src/lib/services/server/ai/observability/instrumentation.ts",
          ),
        ) ?? "";
      const codeDefault =
        /OTEL_SERVICE_NAME \|\| "([^"]+)"/.exec(instrumentation)?.[1] ?? "";
      const rowOf = (text: string): string =>
        text
          .split("\n")
          .find((line) => /^\|\s*`OTEL_SERVICE_NAME`/.test(line)) ?? "";
      return holds([
        ["control: the code default was found", codeDefault.length > 0],
        [
          "control: the merged PR's guide gave a different default",
          !rowOf(at(MERGED, TELEMETRY_GUIDE)).includes(`\`${codeDefault}\``),
        ],
        [
          `the guide's row gives \`${codeDefault}\``,
          rowOf(read(TELEMETRY_GUIDE)).includes(`\`${codeDefault}\``),
        ],
      ]);
    },
  );

  // recordAIRequest exists again (aiMetrics.ts) and the proxy and
  // TelemetryHandler call it, so the page may name it; it must not name a
  // metric function or counter that does not exist.
  await proof(
    "X46",
    "proxy-cli-onboarding.md names only metric functions and counters that exist",
    () => {
      const detector = (text: string): boolean => /recordAIRequest/.test(text);
      const defined = new Set(
        [...SOURCE.values()].flatMap((text) =>
          [
            ...text.matchAll(
              /create(?:Counter|Histogram|UpDownCounter|ObservableGauge|Gauge)\(\s*["`]([a-z0-9_]+)["`]/g,
            ),
          ].map((match) => match[1] ?? ""),
        ),
      );
      const named = (text: string): string[] => [
        ...new Set(
          [
            ...text.matchAll(
              /\b(record[A-Z]\w*|[a-z][a-z0-9]*(?:_[a-z0-9]+)*_total)\b/g,
            ),
          ].map((match) => match[1] ?? ""),
        ),
      ];
      const missing = (text: string): string[] =>
        named(text).filter((name) =>
          name.startsWith("record")
            ? sourceHits(new RegExp(`export function ${name}\\(`)).length === 0
            : !defined.has(name),
        );
      const tracer = read("src/lib/proxy/proxyTracer.ts");
      return holds([
        [
          "control: the merged PR's page named recordAIRequest",
          detector(at(MERGED, ONBOARDING)),
        ],
        [
          "control: an unknown function and counter are caught",
          missing("`recordProxyRequest` and `neurolink_requests_total`")
            .length === 2,
        ],
        [
          "recordAIRequest is defined and the proxy and TelemetryHandler call it",
          sourceHits(/export function recordAIRequest\(/).length === 1 &&
            /recordAIRequest\(/.test(tracer) &&
            /recordAIRequest\(/.test(
              read("src/lib/core/modules/TelemetryHandler.ts"),
            ),
        ],
        [
          `names that do not exist: ${missing(read(ONBOARDING)).join(", ")}`,
          missing(read(ONBOARDING)).length === 0,
        ],
        [
          "the page names the proxy request counter the code does create",
          /proxy_requests_total/.test(read(ONBOARDING)) &&
            /createCounter\("proxy_requests_total"/.test(tracer),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- K17
  section("K17 proxy bodies are opt-in (documentation)");

  const proxySection = sectionOf(doc, "## Proxy");
  const proxyConfig = read(PROXY_CONFIG);

  await proof(
    "K17",
    "the docs say proxy bodies are recorded only with NEUROLINK_PROXY_TRACE_BODY_LOGGING=true",
    () => {
      const detector = (text: string): boolean => {
        const body = flat(sectionOf(text, "## Proxy"));
        return (
          /bodies[^.]*only when[^.]*`NEUROLINK_PROXY_TRACE_BODY_LOGGING=true`/i.test(
            body,
          ) &&
          !/and records request and response bodies, usage, cost/.test(body)
        );
      };
      return says(
        detector,
        "## Proxy\nRequest and response bodies are recorded only when `NEUROLINK_PROXY_TRACE_BODY_LOGGING=true`.\n",
        mergedDoc,
        doc,
      );
    },
  );

  await proof(
    "K17",
    "the docs say how mask, redactIO and NEUROLINK_RECORD_INPUTS apply to proxy bodies",
    () => {
      const body = flat(proxySection);
      return holds([
        [
          "mask and redactIO apply to the recorded input and output",
          /mask/.test(body) && /redactIO/.test(body),
        ],
        [
          "NEUROLINK_RECORD_INPUTS=false drops request bodies",
          /`NEUROLINK_RECORD_INPUTS=false`[^.]*request bod/i.test(body),
        ],
        [
          "the raw span events need the same flag",
          /raw[^.]{0,80}events.{0,160}(same|flag)/i.test(body),
        ],
        [
          "control: the merged PR's section named neither variable",
          !/NEUROLINK_RECORD_INPUTS|NEUROLINK_PROXY_TRACE_BODY_LOGGING/.test(
            sectionOf(mergedDoc, "## Proxy"),
          ),
        ],
      ]);
    },
  );

  await proof(
    "K17",
    "the environment tables list NEUROLINK_PROXY_TRACE_BODY_LOGGING",
    () => {
      const row = (text: string): string =>
        text
          .split("\n")
          .find((line) =>
            /^\|\s*`NEUROLINK_PROXY_TRACE_BODY_LOGGING`/.test(line),
          ) ?? "";
      return holds([
        [
          "control: the merged PR's proxy config reference had no row",
          row(at(MERGED, PROXY_CONFIG)) === "",
        ],
        [
          "the proxy config reference has a row saying it is opt-in",
          /opt-in|off by default|only when/i.test(row(proxyConfig)),
        ],
        [
          "the observability env table lists it",
          /^\|\s*`NEUROLINK_PROXY_TRACE_BODY_LOGGING`/m.test(
            sectionOf(doc, "### Environment variables"),
          ),
        ],
        [
          "the proxy observability guide says bodies on traces are opt-in",
          /traces[^.]{0,200}NEUROLINK_PROXY_TRACE_BODY_LOGGING=true|NEUROLINK_PROXY_TRACE_BODY_LOGGING=true[^.]{0,200}traces/is.test(
            read(PROXY_OBSERVABILITY),
          ),
        ],
        [
          "control: the merged PR's proxy observability guide did not",
          !/NEUROLINK_PROXY_TRACE_BODY_LOGGING/.test(
            at(MERGED, PROXY_OBSERVABILITY),
          ),
        ],
      ]);
    },
  );

  await proof(
    "K17",
    "the variables the docs name are the ones the source reads, and the proxy.body attribute of events stays outside mask and redactIO, as in the released build",
    () => {
      const tracer = read("src/lib/proxy/proxyTracer.ts");
      const constants = read("src/lib/constants/langfuse.ts");
      const contentKeys =
        /CONTENT_KEYS = new Set\(\[([^\]]*)\]/s.exec(constants)?.[1] ?? "";
      return holds([
        [
          "proxyTracer reads NEUROLINK_PROXY_TRACE_BODY_LOGGING",
          /NEUROLINK_PROXY_TRACE_BODY_LOGGING/.test(tracer),
        ],
        [
          "proxyTracer reads NEUROLINK_RECORD_INPUTS",
          /NEUROLINK_RECORD_INPUTS/.test(tracer),
        ],
        [
          "the content keys do not cover the proxy.body attribute of events",
          !/"proxy\.body"/.test(contentKeys),
        ],
        [
          "the content keys do not cover the SSE event list",
          !/"proxy\.stream\.events"/.test(contentKeys),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- K28
  section("K28 delivery failures and the circuit breaker (documentation)");

  await proof(
    "K28",
    "the docs say delivery failures are reported by result, warn log and healthCheck, and do not open the circuit breaker",
    () => {
      const detector = (text: string): boolean => {
        const body = flat(sectionOf(text, "## Langfuse exporter behaviour"));
        return (
          /(result|success: false)/.test(body) &&
          /warn/i.test(body) &&
          /healthCheck/.test(body) &&
          /do(es)? not open the circuit breaker/i.test(body)
        );
      };
      return says(
        detector,
        "## Langfuse exporter behaviour\nA dropped batch is reported in the exporter's result (`success: false`), a warn log and healthCheck error counts. It does not open the circuit breaker.\n",
        mergedDoc,
        doc,
      );
    },
  );

  await proof(
    "K28",
    "the exporter reports a dropped batch by result, warn log and healthCheck error count",
    () => {
      const exporter = read(
        "src/lib/observability/exporters/langfuseExporter.ts",
      );
      return holds([
        [
          "a dropped chunk is returned as failedCount",
          /failedCount: failed/.test(exporter) &&
            /success: failed === 0/.test(exporter),
        ],
        [
          "it logs 'Dropped N of M spans' at warn",
          /logger\.warn\(`[^`]*Dropped/.test(exporter),
        ],
        [
          "healthCheck reports the dropped spans",
          /async healthCheck\(\)[\s\S]*?droppedSpans/.test(exporter),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- K40
  section("K40 proxy attribute names (documentation)");

  await proof(
    "K40",
    "the docs list the gen_ai.* and proxy.* names the proxy spans carry and the identity attributes on the root",
    () => {
      const detector = (text: string): boolean => {
        const body = flat(sectionOf(text, "## Proxy"));
        return (
          /gen_ai\.request\.model/.test(body) &&
          /gen_ai\.response\.model/.test(body) &&
          /gen_ai\.usage\.\*/.test(body) &&
          /proxy\.request\.model/.test(body) &&
          /proxy\.usage\.\*/.test(body) &&
          /neurolink\.user_id/.test(body) &&
          /neurolink\.session_id/.test(body) &&
          /neurolink\.conversation_id/.test(body)
        );
      };
      return says(
        detector,
        "## Proxy\n`gen_ai.request.model`, `gen_ai.response.model`, `gen_ai.usage.*`, `proxy.request.model`, `proxy.usage.*`, `neurolink.user_id`, `neurolink.session_id`, `neurolink.conversation_id`\n",
        mergedDoc,
        doc,
      );
    },
  );

  await proof(
    "K40",
    "the docs say the Langfuse export still produces one priced generation per proxied request, and name no meter",
    () => {
      const body = flat(sectionOf(doc, "## Proxy"));
      return holds([
        [
          "one priced generation per proxied request",
          /one priced generation per (proxied )?request/i.test(body),
        ],
        [
          "no claim about meter names in the proxy section",
          !/\bmeter (scope )?name|neurolink\.proxy meter|getMeter/i.test(body),
        ],
      ]);
    },
  );

  await proof(
    "K40",
    "the proxy attribute names the docs rely on exist in the source of this tree",
    () => {
      const tracer = read("src/lib/proxy/proxyTracer.ts");
      return holds([
        [
          "proxy.request.model is written",
          /"proxy\.request\.model"/.test(tracer),
        ],
        [
          "proxy.response.model is written",
          /"proxy\.response\.model"/.test(tracer),
        ],
        [
          "proxy.usage.* is written",
          /"proxy\.usage\.input_tokens"/.test(tracer),
        ],
        [
          "neurolink.user_id, session_id and conversation_id are written on the root",
          /"neurolink\.user_id"/.test(tracer) &&
            /"neurolink\.session_id"/.test(tracer) &&
            /"neurolink\.conversation_id"/.test(tracer),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- K03
  section("K03 realtime tracing (documentation)");

  await proof(
    "K03",
    "the docs say every realtime turn is traced, with or without voice memory",
    () => {
      const detector = (text: string): boolean => {
        const body = flat(sectionOf(text, "## Voice (LiveKit)"));
        return (
          /every (realtime )?(conversation )?turn is traced/i.test(body) &&
          /with or without voice memory|memory is not required|no memory/i.test(
            body,
          ) &&
          !/and only when voice memory is enabled/.test(body)
        );
      };
      return says(
        detector,
        "## Voice (LiveKit)\nEvery realtime turn is traced, with or without voice memory.\n",
        mergedDoc,
        doc,
      );
    },
  );

  await proof(
    "K03",
    "the docs give the shutdown flush budgets the code uses",
    () => {
      const memory = read("src/lib/voice/livekit/realtimeMemory.ts");
      const budget =
        /const DEFAULT_FLUSH_BUDGET_MS = (\d+);/.exec(memory)?.[1] ?? "";
      const exporterBudget =
        /DEFAULT_FLUSH_BUDGET_MS = ([\d_]+);/
          .exec(read("src/lib/constants/langfuse.ts"))?.[1]
          ?.replace(/_/g, "") ?? "";
      const body = flat(sectionOf(doc, "## Voice (LiveKit)"));
      return holds([
        [
          "control: both defaults were read from the source",
          budget !== "" && exporterBudget !== "",
        ],
        [
          "setUpRealtimeCallTracing exists and is used when there is no memory",
          /export function setUpRealtimeCallTracing/.test(memory) &&
            /setUpRealtimeCallTracing\(ctx/.test(
              read("src/lib/voice/livekit/realtimeVoiceAgent.ts"),
            ),
        ],
        [
          `the docs name memory.flushBudgetMs and its ${budget} ms default`,
          new RegExp(
            `memory\\.flushBudgetMs[^.]*${budget} ms|${budget} ms[^.]*memory\\.flushBudgetMs`,
          ).test(body),
        ],
        [
          `the docs name observability.langfuse.flushBudgetMs and its ${exporterBudget} ms default`,
          new RegExp(
            `langfuse\\.flushBudgetMs[^.]*${exporterBudget}|${exporterBudget}[^.]*langfuse\\.flushBudgetMs`,
          ).test(flat(doc)),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- K21
  section("K21 the reach of mask and redactIO (documentation)");

  await proof(
    "K21",
    "the docs say mask and redactIO act on what is sent to Langfuse only, and name the sinks they do not reach",
    () => {
      const detector = (text: string): boolean => {
        const body = flat(sectionOf(text, "## Masking sensitive data"));
        return (
          /redactIO/.test(body) &&
          /act on what NeuroLink sends to Langfuse, and on nothing else/i.test(
            body,
          ) &&
          /registerExporter/.test(body) &&
          /OTEL_EXPORTER_OTLP_ENDPOINT/.test(body) &&
          /getSpans\(\)/.test(body) &&
          !/one content policy/i.test(body) &&
          !/every (registry )?exporter on the registry/i.test(body)
        );
      };
      return says(
        detector,
        "## Masking sensitive data\n`mask` and `redactIO` act on what NeuroLink sends to Langfuse, and on nothing else. An exporter you register with `registerExporter`, the spans sent to `OTEL_EXPORTER_OTLP_ENDPOINT` and `getSpans()` receive the values as recorded.\n",
        mergedDoc,
        doc,
      );
    },
  );

  await proof(
    "K21",
    "the config field table lists redactIO and flushBudgetMs, which NeurolinkLangfuseConfig has",
    () => {
      const rows = tableRows(sectionOf(doc, "### Disable or override"));
      const type = read("src/lib/types/observability.ts");
      const typeStart = type.indexOf("export type NeurolinkLangfuseConfig");
      const typeBlock = type.slice(typeStart, type.indexOf("\n};", typeStart));
      return holds([
        [
          "control: the type has both fields",
          /\bredactIO\?:/.test(typeBlock) &&
            /\bflushBudgetMs\?:/.test(typeBlock),
        ],
        [
          "the table has a redactIO row",
          rows.some((row) => /redactIO/.test(row[0] ?? "")),
        ],
        [
          "the table has a flushBudgetMs row",
          rows.some((row) => /flushBudgetMs/.test(row[0] ?? "")),
        ],
        [
          "control: the merged PR's table had neither",
          !/redactIO|flushBudgetMs/.test(mergedDoc),
        ],
      ]);
    },
  );

  await proof(
    "K21",
    "the source applies mask and redactIO in the Langfuse exporter only, as the docs describe: the registry and the OTLP processor pass spans through",
    () => {
      const registry = read("src/lib/observability/exporterRegistry.ts");
      const otlp = read(
        "src/lib/services/server/ai/observability/otlpSetup.ts",
      );
      const setup = read(
        "src/lib/services/server/ai/observability/langfuseSetup.ts",
      );
      return holds([
        [
          "the registry does not rewrite a span before exporters see it",
          !/protectSpanData|setContentPolicy/.test(registry),
        ],
        [
          "the OTLP processor's exporter is not wrapped in a policy",
          !/withContentPolicy/.test(otlp),
        ],
        [
          "the Langfuse exporter is built with the caller's mask and redactIO",
          /mask: options\.mask/.test(setup) &&
            /redactIO: options\.redactIO/.test(setup),
        ],
      ]);
    },
  );

  // ----------------------------------------------------------------- K07
  section("K07 NEUROLINK_RECORD_INPUTS (documentation)");

  await proof(
    "K07",
    "the environment table lists NEUROLINK_RECORD_INPUTS and the source reads it",
    () => {
      const rows = tableRows(sectionOf(doc, "### Environment variables"));
      return holds([
        [
          "control: the merged PR's doc did not name it",
          !/NEUROLINK_RECORD_INPUTS/.test(mergedDoc),
        ],
        [
          "the table has a row saying false keeps inputs out",
          rows.some(
            (row) =>
              /NEUROLINK_RECORD_INPUTS/.test(row[0] ?? "") &&
              /false/.test(row[1] ?? ""),
          ),
        ],
        [
          "recordsSpanInputs reads it",
          /NEUROLINK_RECORD_INPUTS/.test(
            read("src/lib/telemetry/attributes.ts"),
          ),
        ],
      ]);
    },
  );
});

/** True when `docs/api/<key>.md` exists in the working tree. */
function isTrackedApiPage(key: string): boolean {
  try {
    readFileSync(join(ROOT, "docs/api", `${key}.md`), "utf8");
    return true;
  } catch {
    return false;
  }
}

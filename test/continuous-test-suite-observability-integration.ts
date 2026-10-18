#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability follow-up, how the fixes combine
 *
 * Follow-up to the Langfuse OTEL pipeline (BZ-6924). The area fixes were built
 * and proven on separate branches; this suite covers the one place where two of
 * them meet on the merged tree. Every check prints one line,
 * `PROOF <id> PASS|FAIL <what is checked>`, and the suite exits non-zero when
 * any check fails.
 *
 *   M01  a direct provider call that opens its own root (withSpan) still gives
 *        the trace its input and output
 *   M02  the same through withStreamSpan
 *   M03  the same for the root a direct provider tool loop opens (StepSpans),
 *        and the whole loop stays in one trace
 *   M04  control: under a NeuroLink turn only the turn writes them, so a
 *        nested generation leaves the trace's input and output alone
 *   X12  importing the shared tracers does not load the OpenTelemetry SDK, the
 *        OTLP exporters or the metrics SDK (K34 moved the start-up behind a
 *        registration), while the module that does the start-up still does
 *
 * Why they meet: a direct provider loop with no span above it opens a root
 * named `generate` or `stream` so its steps share one trace (K30). A
 * generation that starts inside another `generate` or `stream` span is treated
 * as nested in a NeuroLink turn and leaves the trace input and output to that
 * turn (X02). The root a direct loop opens is not a turn and records neither,
 * so a generation under it must still write them.
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from
 * `src/lib/` and is on the `neurolink/e2e-tests-only` allow list. The roots
 * come from the tracer wrappers themselves, not from a live provider call:
 * a global tracer provider can be registered once per process, and the span
 * attributes are read straight from an in-memory exporter, which no
 * `generate()` call can expose.
 *
 * X12 runs in fresh node processes with a module-resolution hook, because an
 * import graph is only observable from outside the process that loads it.
 *
 * Offline: nothing leaves the machine.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-integration.ts
 */
import "./helpers/credentialFreeEnv.js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { context, SpanKind, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type ReadableSpan,
} from "@opentelemetry/sdk-trace-base";
import { tracers } from "../src/lib/telemetry/tracers.js";
import {
  StepSpans,
  withGeneration,
  withSpan,
  withStreamSpan,
} from "../src/lib/telemetry/withSpan.js";

const TRACE_INPUT = "langfuse.trace.input";
const TRACE_OUTPUT = "langfuse.trace.output";

const exporter = new InMemorySpanExporter();
context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
trace.setGlobalTracerProvider(
  new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  }),
);

let failed = 0;
async function proof(
  id: string,
  description: string,
  check: () => boolean | Promise<boolean>,
): Promise<void> {
  const passed = await Promise.resolve()
    .then(check)
    .catch(() => false);
  if (!passed) {
    failed += 1;
  }
  console.log(`PROOF ${id} ${passed ? "PASS" : "FAIL"} ${description}`);
}

const attr = (span: ReadableSpan, key: string): string =>
  String(span.attributes[key] ?? "");

/** Runs `work`, then returns the spans it finished (the exporter is cleared first). */
async function spansOf(work: () => Promise<void>): Promise<ReadableSpan[]> {
  exporter.reset();
  await work();
  return exporter.getFinishedSpans();
}

const holdsInputAndOutput = (
  spans: readonly ReadableSpan[],
  question: string,
  answer: string,
): boolean =>
  spans.some((span) => attr(span, TRACE_INPUT).includes(question)) &&
  spans.some((span) => attr(span, TRACE_OUTPUT).includes(answer));

const oneTrace = (spans: readonly ReadableSpan[]): boolean =>
  spans.length > 0 &&
  new Set(spans.map((span) => span.spanContext().traceId)).size === 1;

const record = (question: string, answer: string) => ({
  operation: "generate" as const,
  provider: "openai",
  model: "gpt-4o-mini",
  input: { prompt: question },
  output: answer,
});

{
  const spans = await spansOf(() =>
    withSpan(
      {
        name: "provider.generate",
        tracer: tracers.provider,
        detached: true,
        rootWhenOrphaned: true,
      },
      () =>
        withGeneration(record("M01-QUESTION", "M01-ANSWER"), async () => "ok"),
    ).then(() => undefined),
  );
  await proof(
    "M01",
    "a direct call that opens its own root writes the trace input and output",
    () => holdsInputAndOutput(spans, "M01-QUESTION", "M01-ANSWER"),
  );
  await proof("M01", "the direct call stays in one trace", () =>
    oneTrace(spans),
  );
}

{
  const spans = await spansOf(async () => {
    const result = await withStreamSpan(
      {
        name: "provider.stream",
        tracer: tracers.provider,
        detached: true,
        rootWhenOrphaned: true,
      },
      async () => {
        await withGeneration(
          { ...record("M02-QUESTION", "M02-ANSWER"), operation: "stream" },
          async () => undefined,
        );
        return {
          stream: (async function* () {
            yield "chunk";
          })() as AsyncIterable<string>,
        };
      },
      (r) => r.stream,
      (r, wrapped) => ({ ...r, stream: wrapped }),
    );
    for await (const chunk of result.stream) {
      void chunk;
    }
  });
  await proof(
    "M02",
    "a direct stream that opens its own root writes the trace input and output",
    () => holdsInputAndOutput(spans, "M02-QUESTION", "M02-ANSWER"),
  );
  await proof("M02", "the direct stream stays in one trace", () =>
    oneTrace(spans),
  );
}

{
  const spans = await spansOf(async () => {
    const steps = new StepSpans("generate");
    steps.begin(1);
    await steps.run(() =>
      withGeneration(record("M03-QUESTION-1", "M03-ANSWER-1"), async () => 1),
    );
    steps.begin(2);
    await steps.run(() =>
      withGeneration(record("M03-QUESTION-2", "M03-ANSWER-2"), async () => 2),
    );
    steps.end();
  });
  await proof(
    "M03",
    "a direct tool loop writes the trace input and output from its steps",
    () => holdsInputAndOutput(spans, "M03-QUESTION", "M03-ANSWER"),
  );
  await proof("M03", "a two-step direct tool loop stays in one trace", () =>
    oneTrace(spans),
  );
  await proof(
    "M03",
    "the loop's root is named after the operation and its steps hang under it",
    () =>
      spans.some(
        (span) => span.name === "generate" && !span.parentSpanContext,
      ) && spans.filter((span) => span.name === "step").length === 2,
  );
}

{
  const spans = await spansOf(async () => {
    const turn = tracers.sdk.startSpan("generate", { kind: SpanKind.INTERNAL });
    await context.with(trace.setSpan(context.active(), turn), () =>
      withGeneration(record("M04-QUESTION", "M04-ANSWER"), async () => "ok"),
    );
    turn.end();
  });
  await proof(
    "M04",
    "control: under a NeuroLink turn the nested generation leaves the trace input and output to the turn",
    () =>
      !spans.some((span) => attr(span, TRACE_INPUT).includes("M04-QUESTION")) &&
      !spans.some((span) => attr(span, TRACE_OUTPUT).includes("M04-ANSWER")),
  );
}

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const probeDir = mkdtempSync(join(tmpdir(), "neurolink-obs-x12-"));
const HOOK = join(probeDir, "hook.mjs");
const SCENARIO = join(probeDir, "scenario.mjs");
writeFileSync(
  HOOK,
  `import { registerHooks } from "node:module";
globalThis.__resolved = [];
registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    globalThis.__resolved.push(result.url);
    return result;
  },
});
`,
);
writeFileSync(
  SCENARIO,
  `await import(process.env.TARGET);
const heavy = globalThis.__resolved.filter((url) =>
  /@opentelemetry\\/(sdk-trace-node|sdk-metrics|exporter-)/.test(url),
);
console.log(JSON.stringify({ heavy: [...new Set(heavy)].length }));
`,
);

/** How many distinct SDK / exporter modules a fresh process loads by importing `file`. */
function heavyModulesLoadedBy(file: string): number {
  const out = execFileSync(
    process.execPath,
    ["--import", "tsx", "--import", HOOK, SCENARIO],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, TARGET: pathToFileURL(join(repoRoot, file)).href },
    },
  );
  return (JSON.parse(out.trim().split("\n").pop() ?? "{}") as { heavy: number })
    .heavy;
}

await proof(
  "X12",
  "importing the shared tracers loads no OpenTelemetry SDK, exporter or metrics module",
  () => heavyModulesLoadedBy("src/lib/telemetry/tracers.ts") === 0,
);
await proof(
  "X12",
  "control: the hook sees the SDK when the start-up module itself is imported",
  () =>
    heavyModulesLoadedBy(
      "src/lib/services/server/ai/observability/instrumentation.ts",
    ) > 0,
);

process.exit(failed === 0 ? 0 : 1);

#!/usr/bin/env tsx
/** Deterministic telemetry exception: injected decision results exercise the
 * real SDK routing method offline, including uncertainty, fallback and guards.
 * All spans go to an in-memory external provider; no credentials or API calls. */
import assert from "node:assert/strict";
import { trace } from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type ReadableSpan,
} from "@opentelemetry/sdk-trace-base";
import { NeuroLink } from "../src/lib/neurolink.js";
import { ToolRoutingCache } from "../src/lib/core/toolRoutingCache.js";
import {
  buildJevRoutingAuditInput,
  buildJevRoutingAuditSelection,
} from "../src/lib/utils/jevRoutingAudit.js";
import { recordJevRoutingAudit } from "../src/lib/telemetry/jevRoutingAudit.js";
import type {
  DecisionCallerFn,
  DecisionResult,
  GenerateOptions,
  GenerateResult,
  ToolRoutingConfig,
  ToolRoutingDecision,
} from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Native JEV routing audit", {
  offline: true,
});
const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});
provider.register();
const tracer = trace.getTracer("external-host");
const servers = [
  { id: "shopify", description: "Read Shopify orders" },
  { id: "meta", description: "Read Meta ad spend" },
  { id: "google", description: "Read Google conversions" },
];
const catalog = servers.map((server) => ({
  ...server,
  toolNames: [`${server.id}_read`, `${server.id}_lookup`],
}));
const state = {
  request: "Show Shopify orders and Meta spend",
  available_servers: servers.map((server) => ({
    name: server.id,
    does: server.description,
  })),
  credentials: "MUST_NOT_BE_CAPTURED",
};
const result = (probabilities = [0.99, 0.99, 0.01]): DecisionResult => ({
  provider: "typesafe",
  model: "jev-1.13.0",
  answers: Object.fromEntries(
    probabilities.map((probability, index) => [
      `server__${index}`,
      { type: "boolean" as const, probability },
    ]),
  ),
  usage: { inputTokens: 100, outputTokens: 20 },
  latencyMs: 1,
});
const decision: ToolRoutingDecision = {
  strategy: "decision",
  granularity: "server",
  outcome: "applied",
  selectedServerIds: ["shopify", "meta"],
  excludedServerIds: ["google"],
  hallucinatedIds: [],
  excludedToolCount: 2,
  routableServerCount: 3,
  cacheHit: false,
  durationMs: 1,
};
const audits = (): ReadableSpan[] =>
  exporter
    .getFinishedSpans()
    .filter((span) => span.name === "jev-routing-audit");
const output = (span: ReadableSpan) =>
  JSON.parse(String(span.attributes["langfuse.observation.output"]));

type RoutingFixture = {
  applyToolRoutingExclusions: (
    options: GenerateOptions,
    query: string,
  ) => Promise<void>;
  toolRoutingConfig: ToolRoutingConfig;
  toolRoutingCacheInstance?: ToolRoutingCache;
};
const fixture = (
  enabled: boolean | undefined,
  decide: DecisionCallerFn = async () => result(),
): RoutingFixture => {
  // Only replace I/O boundaries; the SDK method, resolver and confidence gates
  // are real. Avoid the constructor's unrelated MCP/process initialization.
  const sdk = Object.create(NeuroLink.prototype) as NeuroLink;
  Object.assign(sdk, {
    toolRoutingConfig: {
      enabled: true,
      servers,
      ...(enabled === undefined ? {} : { audit: { enabled } }),
    },
    getCustomTools: () =>
      new Map(
        catalog.flatMap((server) => server.toolNames.map((name) => [name, {}])),
      ),
    fetchRecentRoutingHistory: async () => [],
    siteDecide: decide,
    preservingTurnState: (fn: () => Promise<GenerateResult>) => fn(),
    generate: async () => ({ content: '{"servers":["shopify"]}' }),
  });
  return sdk as unknown as RoutingFixture;
};
const route = async (
  sdk: RoutingFixture,
  query = state.request,
  excludeTools: string[] = [],
) => {
  exporter.reset();
  const options: GenerateOptions = {
    input: { text: query },
    excludeTools,
    context: { sessionId: "audit-test" },
  };
  let parentId = "";
  let traceId = "";
  await tracer.startActiveSpan("existing-chat", async (span) => {
    parentId = span.spanContext().spanId;
    traceId = span.spanContext().traceId;
    try {
      await sdk.applyToolRoutingExclusions(options, query);
    } finally {
      span.end();
    }
  });
  await provider.forceFlush();
  return { options, parentId, traceId };
};

await test("Disabled and omitted audit configuration leave routing unchanged", async () => {
  for (const enabled of [false, undefined]) {
    const { options } = await route(fixture(enabled));
    assert.deepEqual(options.excludeTools, catalog[2].toolNames);
    assert.equal(audits().length, 0);
  }
});

await test("Enabled SDK emits one child through the existing external provider", async () => {
  let calls = 0;
  const { options, parentId, traceId } = await route(
    fixture(true, async () => {
      calls++;
      return result();
    }),
  );
  assert.equal(calls, 1);
  assert.deepEqual(options.excludeTools, catalog[2].toolNames);
  assert.equal(audits().length, 1);
  const audit = audits()[0];
  assert.equal(audit.spanContext().traceId, traceId);
  assert.equal(audit.parentSpanContext?.spanId, parentId);
  assert.deepEqual(output(audit).retainedServers, ["shopify", "meta"]);
  assert.deepEqual(output(audit).excludedServers, ["google"]);
  assert.equal(output(audit).evaluable, true);
  assert.equal(output(audit).excludedToolCount, 2);
  assert.equal(
    Object.keys(audit.attributes).some((key) => /usage|tokens|cost/.test(key)),
    false,
  );
  const parent = exporter
    .getFinishedSpans()
    .find((span) => span.name === "existing-chat")!;
  assert.equal(
    Object.keys(parent.attributes).some((key) =>
      /audit|observation.input/.test(key),
    ),
    false,
  );
});

await test("Evidence uses exact decision state and omits unrelated state", async () => {
  const input = buildJevRoutingAuditInput(state)!;
  assert.equal(input.queryWithRoutingContext, state.request);
  assert.deepEqual(
    input.candidateServers,
    servers.map((server) => ({
      id: server.id,
      capability: server.description,
    })),
  );
  assert.equal(JSON.stringify(input).includes("MUST_NOT_BE_CAPTURED"), false);
  const before = input.catalogueVersion;
  const changed = structuredClone(state);
  changed.available_servers[0].does += " and inventory";
  assert.notEqual(buildJevRoutingAuditInput(changed)?.catalogueVersion, before);
});

await test("Stickiness is reflected in the final selection, not the raw JEV answer", async () => {
  const sdk = fixture(true);
  sdk.toolRoutingConfig.stickiness = { enabled: true, turns: 3 };
  sdk.toolRoutingCacheInstance = new ToolRoutingCache();
  sdk.toolRoutingCacheInstance.recordSelection("audit-test", ["google"]);
  const { options } = await route(sdk);
  assert.deepEqual(options.excludeTools, []);
  assert.deepEqual(output(audits()[0]).retainedServers, [
    "shopify",
    "meta",
    "google",
  ]);
  assert.deepEqual(output(audits()[0]).excludedServers, []);
});

await test("Partial pre-existing exclusions are explicitly non-evaluable", async () => {
  await route(fixture(true), state.request, ["shopify_read"]);
  assert.equal(output(audits()[0]).evaluable, false);
});

await test("Full pre-existing exclusions are reflected in final server availability", async () => {
  await route(fixture(true), state.request, catalog[0].toolNames);
  assert.deepEqual(output(audits()[0]).retainedServers, ["meta"]);
  assert.deepEqual(output(audits()[0]).excludedServers, ["shopify", "google"]);
  assert.equal(output(audits()[0]).evaluable, false);
});

await test("Always-included servers are not falsely attributed to JEV", async () => {
  const sdk = fixture(true, async () => result([0.99, 0.01]));
  sdk.toolRoutingConfig.alwaysIncludeServerIds = ["shopify"];
  await route(sdk);
  const input = JSON.parse(
    String(audits()[0].attributes["langfuse.observation.input"]),
  );
  assert.deepEqual(
    input.candidateServers.map((server: { id: string }) => server.id),
    ["meta", "google"],
  );
  assert.deepEqual(output(audits()[0]).retainedServers, ["meta"]);
});

await test("Missing answers conservatively retain capabilities", async () => {
  const incomplete = result();
  incomplete.answers = { server__2: { type: "boolean", probability: 0.01 } };
  await route(fixture(true, async () => incomplete));
  assert.deepEqual(output(audits()[0]).retainedServers, ["shopify", "meta"]);
});

await test("Null decisions and generative fallback do not create JEV audits", async () => {
  await route(fixture(true, async () => null));
  assert.equal(audits().length, 0);
});

await test("Other decision providers are not labelled as JEV", async () => {
  await route(fixture(true, async () => ({ ...result(), provider: "laya" })));
  assert.equal(audits().length, 0);
});

await test("Cache hits create no second JEV audit or decision call", async () => {
  let calls = 0;
  const sdk = fixture(true, async () => {
    calls++;
    return result();
  });
  sdk.toolRoutingConfig.cache = { enabled: true };
  await route(sdk);
  assert.equal(audits().length, 1);
  await route(sdk);
  assert.equal(calls, 1);
  assert.equal(audits().length, 0);
});

await test("Cancelled turns do not record an unapplied selection", async () => {
  const controller = new AbortController();
  const sdk = fixture(true, async () => {
    controller.abort();
    return result();
  });
  exporter.reset();
  await tracer.startActiveSpan("cancelled-chat", async (span) => {
    try {
      await sdk.applyToolRoutingExclusions(
        { input: { text: state.request }, abortSignal: controller.signal },
        state.request,
      );
    } finally {
      span.end();
    }
  });
  assert.equal(audits().length, 0);
});

await test("Bounded and malformed evidence never becomes a false pass", async () => {
  for (const malformed of [
    null,
    [],
    {},
    { request: "x", available_servers: [null] },
    { request: 1, available_servers: [{ name: "shopify", does: "Orders" }] },
    { request: "x", available_servers: {} },
    { request: "x", available_servers: [{ name: 1, does: "Orders" }] },
    { request: "x", available_servers: [{ name: "shopify", does: false }] },
  ]) {
    assert.equal(buildJevRoutingAuditInput(malformed), null);
  }
  const oversized = buildJevRoutingAuditInput({
    ...state,
    request: "x".repeat(6001),
  })!;
  assert.equal(oversized.evidenceComplete, false);
  assert.equal(oversized.queryWithRoutingContext.length, 6000);
  const longDescription = buildJevRoutingAuditInput({
    ...state,
    available_servers: [{ name: "shopify", does: "x".repeat(1001) }],
  })!;
  assert.equal(longDescription.evidenceComplete, false);
  assert.equal(longDescription.candidateServers[0].capability.length, 1000);
  const blankId = buildJevRoutingAuditInput({
    ...state,
    available_servers: [{ name: " ", does: "Orders" }],
  });
  assert.equal(blankId?.evidenceComplete, false);
  assert.equal(
    buildJevRoutingAuditInput({
      ...state,
      available_servers: Array.from({ length: 64 }, (_, index) => ({
        name: String(index),
        does: "x".repeat(1000),
      })),
    }),
    null,
  );
});

await test("Selection helper reports final availability and policy uncertainty", async () => {
  const candidates = [{ id: "shopify", capability: "Orders" }];
  const catalog = [
    { id: "shopify", description: "Orders", toolNames: ["orders", "aov"] },
  ];
  assert.deepEqual(buildJevRoutingAuditSelection(candidates, catalog, [], []), {
    retainedServers: ["shopify"],
    excludedServers: [],
    selectionComplete: true,
    excludedToolCount: 0,
  });
  assert.deepEqual(
    buildJevRoutingAuditSelection(candidates, catalog, ["orders"], ["orders"]),
    {
      retainedServers: ["shopify"],
      excludedServers: [],
      selectionComplete: false,
      excludedToolCount: 1,
    },
  );
  assert.deepEqual(
    buildJevRoutingAuditSelection(candidates, catalog, ["orders", "aov"], []),
    {
      retainedServers: [],
      excludedServers: ["shopify"],
      selectionComplete: true,
      excludedToolCount: 2,
    },
  );
});

await test("Duplicate and unmatched candidates are non-evaluable", async () => {
  const input = buildJevRoutingAuditInput(state)!;
  input.candidateServers.push(input.candidateServers[0]);
  exporter.reset();
  await tracer.startActiveSpan("invalid-evidence", async (span) => {
    try {
      recordJevRoutingAudit(
        { input, provider: "typesafe", model: "jev" },
        decision,
        catalog,
        catalog[2].toolNames,
      );
    } finally {
      span.end();
    }
  });
  assert.equal(output(audits()[0]).evaluable, false);
});

await test("Concurrent calls on one SDK keep their own trace and request", async () => {
  exporter.reset();
  const sdk = fixture(true, async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return result();
  });
  await Promise.all(
    ["query-one", "query-two"].map((query) =>
      tracer.startActiveSpan(query, async (span) => {
        try {
          await sdk.applyToolRoutingExclusions(
            { input: { text: query } },
            query,
          );
        } finally {
          span.end();
        }
      }),
    ),
  );
  assert.equal(audits().length, 2);
  for (const audit of audits()) {
    const input = JSON.parse(
      String(audit.attributes["langfuse.observation.input"]),
    );
    const parent = exporter
      .getFinishedSpans()
      .find(
        (span) => span.spanContext().spanId === audit.parentSpanContext?.spanId,
      )!;
    assert.equal(input.queryWithRoutingContext, parent.name);
  }
});

await test("Evidence-capture failures cannot change routing", async () => {
  const broken = {
    get request() {
      throw new Error("MUST_NOT_BE_LOGGED");
    },
  };
  assert.equal(buildJevRoutingAuditInput(broken), null);
  const sdk = fixture(true);
  await route(sdk, "x".repeat(6001));
  assert.equal(output(audits()[0]).evaluable, false);
});

await provider.shutdown();
await runSuite();

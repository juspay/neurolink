#!/usr/bin/env tsx
/** Privacy of the JEV routing audit, driven through the built entry
 * (dist/index.js) only: with NEUROLINK_RECORD_INPUTS=false a credential in the
 * routed query must not appear in any attribute of any exported span. The
 * decision provider result is injected so the run is offline; the routing
 * method, the audit recorder and the span exporter are the shipped code. */
import assert from "node:assert/strict";
import { trace } from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NeuroLink } from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("JEV routing audit privacy (dist)", {
  offline: true,
});
const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});
provider.register();
const tracer = trace.getTracer("external-host");

// Assembled at runtime so no secret-shaped literal sits in the source.
const SECRET = ["JEVPRIVACY", "SECRET", "0123456789"].join("-");
const query = `Show Shopify orders, api_key=${SECRET}`;
const servers = [
  { id: "shopify", description: "Read Shopify orders" },
  { id: "meta", description: "Read Meta ad spend" },
];
const toolNames = servers.map((server) => `${server.id}_read`);

type Routable = {
  applyToolRoutingExclusions: (o: object, q: string) => Promise<void>;
  flushJevRoutingAudit: (o: object) => void;
};

const runAudit = async (): Promise<string> => {
  exporter.reset();
  const sdk = Object.create(NeuroLink.prototype) as NeuroLink;
  Object.assign(sdk, {
    toolRoutingConfig: { enabled: true, servers, audit: { enabled: true } },
    getCustomTools: () => new Map(toolNames.map((name) => [name, {}])),
    fetchRecentRoutingHistory: async () => [],
    siteDecide: async () => ({
      provider: "typesafe",
      model: "jev-1.13.0",
      answers: {
        server__0: { type: "boolean", probability: 0.99 },
        server__1: { type: "boolean", probability: 0.01 },
      },
      usage: { inputTokens: 1, outputTokens: 1 },
      latencyMs: 1,
    }),
    preservingTurnState: (fn: () => Promise<unknown>) => fn(),
    generate: async () => ({ content: '{"servers":["shopify"]}' }),
  });
  const routable = sdk as unknown as Routable;
  const options = { input: { text: query }, context: { sessionId: "privacy" } };
  await tracer.startActiveSpan("existing-chat", async (span) => {
    try {
      await routable.applyToolRoutingExclusions(options, query);
      routable.flushJevRoutingAudit(options);
    } finally {
      span.end();
    }
  });
  await provider.forceFlush();
  const finished = exporter.getFinishedSpans();
  assert.equal(
    finished.filter((span) => span.name === "jev-routing-audit").length,
    1,
  );
  return JSON.stringify(finished.map((span) => span.attributes));
};

const withRecordInputs = async (
  value: string | undefined,
  body: () => Promise<void>,
): Promise<void> => {
  const previous = process.env.NEUROLINK_RECORD_INPUTS;
  if (value === undefined) {
    delete process.env.NEUROLINK_RECORD_INPUTS;
  } else {
    process.env.NEUROLINK_RECORD_INPUTS = value;
  }
  try {
    await body();
  } finally {
    if (previous === undefined) {
      delete process.env.NEUROLINK_RECORD_INPUTS;
    } else {
      process.env.NEUROLINK_RECORD_INPUTS = previous;
    }
  }
};

await test("Input recording off keeps the query out of every span attribute", async () => {
  await withRecordInputs("false", async () => {
    const attributes = await runAudit();
    assert.equal(attributes.includes(SECRET), false);
    assert.equal(attributes.includes("langfuse.observation.input"), false);
  });
});

await test("Input recording on still masks the credential value", async () => {
  await withRecordInputs(undefined, async () => {
    const attributes = await runAudit();
    assert.equal(attributes.includes("langfuse.observation.input"), true);
    assert.equal(attributes.includes(SECRET), false);
  });
});

await provider.shutdown();
await runSuite();

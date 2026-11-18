#!/usr/bin/env tsx
/** A decide endpoint's error body must not reach any exported span, driven
 * through the built entry (dist/index.js) only. A local mock answers HTTP 500
 * with a body carrying a key-shaped value; every attribute, event and status
 * message of every exported span is scanned for it, with span-input
 * recording both off and on. The caller still gets the same failure, and the
 * fail-open variant still returns null. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { trace } from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NeuroLink } from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Decide error-body redaction (dist)", {
  offline: true,
});
const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});
provider.register();

// Assembled at runtime so no secret-shaped literal sits in the source.
const SECRET = ["sk_", "live_", "x".repeat(24)].join("");

const server = createServer((request, response) => {
  request.resume();
  request.on("end", () => {
    response.writeHead(500, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        detail: {
          error_type: "internal_error",
          message: `upstream rejected credential ${SECRET}`,
        },
      }),
    );
  });
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const envKeys = [
  "NEUROLINK_RECORD_INPUTS",
  "TYPESAFE_API_KEY",
  "AI_GATEWAY_API_KEY",
  "TYPESAFE_BASE_URL",
  "TYPESAFE_TRANSPORT",
] as const;
const saved = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

const withEnv = async (
  recordInputs: string,
  body: () => Promise<void>,
): Promise<void> => {
  process.env.NEUROLINK_RECORD_INPUTS = recordInputs;
  process.env.TYPESAFE_API_KEY = "local-mock-key";
  process.env.TYPESAFE_BASE_URL = baseURL;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.TYPESAFE_TRANSPORT;
  try {
    await body();
  } finally {
    for (const key of envKeys) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }
};

const request = {
  provider: "typesafe",
  state: "The customer asks for a refund.",
  questions: { refund: { type: "boolean", instructions: "Is this a refund?" } },
} as const;

const exportedText = async (): Promise<string> => {
  await provider.forceFlush();
  const spans = exporter.getFinishedSpans();
  assert.ok(
    spans.some((span) => span.name === "decide"),
    "a decide span was exported",
  );
  return JSON.stringify(
    spans.map((span) => ({
      name: span.name,
      attributes: span.attributes,
      status: span.status,
      events: span.events.map((event) => ({
        name: event.name,
        attributes: event.attributes,
      })),
    })),
  );
};

for (const recordInputs of ["false", "true"]) {
  await test(`decide() HTTP 500 body stays out of every span (record inputs ${recordInputs})`, async () => {
    await withEnv(recordInputs, async () => {
      exporter.reset();
      const neurolink = new NeuroLink();
      await assert.rejects(neurolink.decide(request));
      const text = await exportedText();
      assert.equal(text.includes(SECRET), false);
      assert.equal(text.includes("HTTP 500"), true);
    });
  });

  await test(`tryDecide() stays fail-open and leaks nothing (record inputs ${recordInputs})`, async () => {
    await withEnv(recordInputs, async () => {
      exporter.reset();
      const neurolink = new NeuroLink();
      assert.equal(await neurolink.tryDecide(request), null);
      assert.equal((await exportedText()).includes(SECRET), false);
    });
  });
}

await test("The caller still receives the provider's own error message", async () => {
  await withEnv("false", async () => {
    const neurolink = new NeuroLink();
    await assert.rejects(neurolink.decide(request), (error: Error) =>
      error.message.includes("upstream rejected credential"),
    );
  });
});

server.close();
await provider.shutdown();
await runSuite();

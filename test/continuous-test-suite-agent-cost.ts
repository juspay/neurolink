#!/usr/bin/env tsx
/**
 * Agent cost contract through the shipped SDK and a real loopback vendor API.
 * Fixed vendor usage makes cost and instance-budget assertions deterministic;
 * the actual provider, analytics, pricing and Agent.execute/stream paths run.
 * The public pricing rows cover the exact Vertex/Gemini identifiers recorded
 * by hosts. No live credentials, provider fallback or MCP tools are used.
 */
import { createServer } from "node:http";
import { NeuroLink, Agent, calculateCost, hasPricing } from "../dist/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();
const { test, runSuite } = defineSuite("Agent cost", {
  offline: true,
  perTestTimeoutMs: 30_000,
});

const vendorUsage = {
  prompt_tokens: 1_000_000,
  completion_tokens: 1_000_000,
  total_tokens: 2_000_000,
};

const createVendorFixture = async () => {
  let requests = 0;
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!body || typeof body !== "object") {
        response.writeHead(422).end();
        return;
      }
      requests++;
      const model =
        "model" in body && typeof body.model === "string"
          ? body.model
          : "gpt-4o-mini";
      const common = { id: "cost-fixture", created: 1, model };
      if ("stream" in body && body.stream === true) {
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        const frames = [
          {
            ...common,
            object: "chat.completion.chunk",
            choices: [
              {
                index: 0,
                delta: { role: "assistant", content: "fixture complete" },
                finish_reason: null,
              },
            ],
          },
          {
            ...common,
            object: "chat.completion.chunk",
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          },
          {
            ...common,
            object: "chat.completion.chunk",
            choices: [],
            usage: vendorUsage,
          },
        ];
        frames.forEach((frame) =>
          response.write(`data: ${JSON.stringify(frame)}\n\n`),
        );
        response.end("data: [DONE]\n\n");
        return;
      }
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          ...common,
          object: "chat.completion",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "fixture complete" },
              finish_reason: "stop",
            },
          ],
          usage: vendorUsage,
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Cost fixture did not bind a private port");
  }
  const credentials = {
    openai: {
      apiKey: "non-secret-cost-fixture",
      baseURL: `http://127.0.0.1:${address.port}/v1`,
    },
  };
  const sdk = new NeuroLink({ credentials });
  // Constrain only test infrastructure. Analytics/budget fields come from the
  // agent unchanged, and both delegates call the actual shipped SDK methods.
  const generate = sdk.generate.bind(sdk);
  sdk.generate = (options) =>
    generate({
      ...(typeof options === "string" ? { input: { text: options } } : options),
      credentials,
      disableTools: true,
      disableInternalFallback: true,
    });
  const stream = sdk.stream.bind(sdk);
  sdk.stream = (options) =>
    stream({
      ...options,
      credentials,
      disableTools: true,
      disableInternalFallback: true,
    });
  const agentFor = (model = "gpt-4o-mini") =>
    new Agent(
      {
        id: "cost-fixture-agent",
        name: "Cost fixture",
        description: "Checks SDK cost forwarding",
        instructions: "Return the fixture response.",
        provider: "openai",
        model,
      },
      sdk,
    );
  const close = async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { sdk, agentFor, requests: () => requests, close };
};

await test("dated Vertex Sonnet 4 has its standard price", async () => {
  assert(
    hasPricing("vertex", "claude-sonnet-4@20250514"),
    "Recorded Vertex model is unpriced",
  );
  assert(
    calculateCost("vertex", "claude-sonnet-4@20250514", {
      input: 1_000_000,
      output: 1_000_000,
      total: 2_000_000,
    }) === 18,
    "Recorded Vertex price is incorrect",
  );
});

await test("GA Flash-Lite is priced on both Google and Vertex", async () => {
  for (const provider of ["google-ai-studio", "vertex"]) {
    assert(
      hasPricing(provider, "gemini-3.1-flash-lite"),
      "Recorded Gemini model is unpriced",
    );
    assert(
      calculateCost(provider, "gemini-3.1-flash-lite", {
        input: 1_000_000,
        output: 1_000_000,
        total: 2_000_000,
      }) === 1.75,
      "Recorded Gemini standard price is incorrect",
    );
    assert(
      calculateCost(provider, "gemini-3.1-flash-lite", {
        input: 0,
        output: 0,
        cacheReadTokens: 1_000_000,
        total: 1_000_000,
      }) === 0.025,
      "Recorded Gemini cache price is incorrect",
    );
  }
});

await test("Agent.execute forwards analytics and exposes its SDK estimate", async () => {
  const fixture = await createVendorFixture();
  try {
    const result = await fixture
      .agentFor()
      .execute("Read the fixture", { enableAnalytics: true });
    assert(result.status === "success", "Agent execution did not complete");
    assert(
      fixture.requests() === 1,
      "Agent did not use exactly one local request",
    );
    assert(result.cost === 0.75, "Agent lost its SDK cost estimate");
    assert(result.usage?.total === 2_000_000, "Agent lost its vendor usage");
  } finally {
    await fixture.close();
  }
});

await test("an unpriced model has analytics with an unknown cost", async () => {
  const fixture = await createVendorFixture();
  try {
    const result = await fixture.sdk.generate({
      input: { text: "Read the fixture" },
      provider: "openai",
      model: "unpriced-fixture-model",
      enableAnalytics: true,
    });
    assert(
      fixture.requests() === 1,
      "Unknown-price request did not reach the local fixture",
    );
    assert(
      result.analytics !== undefined,
      "Unknown-price analytics were dropped",
    );
    assert(
      result.analytics?.cost === undefined,
      "Unknown pricing used a silent provider default",
    );
  } finally {
    await fixture.close();
  }
});

await test("the forwarded budget accumulates on the SDK instance", async () => {
  const fixture = await createVendorFixture();
  try {
    const agent = fixture.agentFor();
    const first = await agent.execute("Read the fixture", {
      enableAnalytics: true,
      maxBudgetUsd: 0.5,
    });
    assert(
      first.status === "success" && first.cost === 0.75,
      "Initial budgeted execution did not report cost",
    );
    const second = await agent.execute("Read again", {
      enableAnalytics: true,
      maxBudgetUsd: 0.5,
    });
    assert(
      second.status === "error",
      "Accumulated instance budget was not forwarded",
    );
    assert(
      fixture.requests() === 1,
      "Budget refusal still sent a vendor request",
    );
  } finally {
    await fixture.close();
  }
});

await test("Agent.stream forwards analytics and emits the SDK estimate", async () => {
  const fixture = await createVendorFixture();
  try {
    let cost: number | undefined;
    let completed = false;
    for await (const chunk of fixture
      .agentFor()
      .stream("Read the fixture", { enableAnalytics: true })) {
      if (chunk.type === "agent-complete") {
        completed = true;
        cost = chunk.cost;
      }
    }
    assert(completed, "Agent stream did not complete");
    assert(
      fixture.requests() === 1,
      "Agent stream did not use one local request",
    );
    assert(cost === 0.75, "Stream completion lost its SDK estimate");
  } finally {
    await fixture.close();
  }
});

await runSuite();

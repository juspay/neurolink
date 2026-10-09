#!/usr/bin/env node
/** Actual SDK public stream and routing calls against two owned dummy accounts. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { NeuroLink, Agent, AIProviderFactory } from "../dist/index.js";
import { z } from "zod";
import { assertDistFresh } from "./helpers/distFreshness.js";
assertDistFresh();

const requests: Array<{
  body: {
    model: string;
    stream?: boolean;
    messages?: unknown;
    tools?: Array<{ function: { name: string } }>;
  };
  account: string | undefined;
}> = [];
const server = createServer((request, response) => {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const account = request.headers.authorization;
    requests.push({ body, account });
    const common = { id: "owned-router-proof", created: 1, model: body.model };
    if (body.stream) {
      response.writeHead(200, { "Content-Type": "text/event-stream" });
      response.write(
        `data: ${JSON.stringify({ ...common, object: "chat.completion.chunk", choices: [{ index: 0, delta: { role: "assistant", content: "merchant answer" }, finish_reason: null }] })}\n\n`,
      );
      response.write(
        `data: ${JSON.stringify({ ...common, object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`,
      );
      response.end("data: [DONE]\n\n");
    } else {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          ...common,
          object: "chat.completion",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: '{"servers":["one"]}' },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 4, completion_tokens: 4, total_tokens: 8 },
        }),
      );
    }
  });
});
await new Promise<void>((resolve) =>
  server.listen(0, "127.0.0.1", () => resolve()),
);
const address = server.address();
assert.ok(address && typeof address === "object");
const credentials = (apiKey: string) => ({
  openai: { apiKey, baseURL: `http://127.0.0.1:${address.port}/v1` },
});
const platform = new NeuroLink({
  credentials: credentials("DUMMY_PLATFORM"),
  conversationMemory: { enabled: false },
  tools: { disableBuiltinTools: true, discovery: false },
});
const merchant = new NeuroLink({
  credentials: {
    ...credentials("DUMMY_MERCHANT"),
    typesafe: {
      apiKey: "DUMMY_DECIDER",
      baseURL: `http://127.0.0.1:${address.port}/decide`,
    },
  },
  conversationMemory: { enabled: false },
  hitl: { enabled: false, dangerousActions: [] },
  tools: {
    disableBuiltinTools: true,
    discovery: false,
    include: ["one_read", "two_read"],
  },
  toolRouting: {
    enabled: true,
    servers: [
      { id: "one", description: "Read one" },
      { id: "two", description: "Read two" },
    ],
    routerModel: { provider: "openai", model: "gpt-4o-mini" },
    embedding: {
      enabled: true,
      provider: "openai",
      model: "text-embedding-3-small",
    },
    generateFn: (options) =>
      platform.generate({ ...options, disableInternalFallback: true }),
  },
});
let embeddingProviderAttempts = 0;
const createProvider = AIProviderFactory.createProvider;
AIProviderFactory.createProvider = (...args) => {
  if (args[1] === "text-embedding-3-small") {
    embeddingProviderAttempts++;
  }
  return createProvider.apply(AIProviderFactory, args);
};
let decisionCalls = 0;
merchant.getEventEmitter().on("decision:before", () => {
  decisionCalls++;
});
try {
  for (const name of ["one_read", "two_read"]) {
    merchant.registerTool(name, {
      name,
      description: name,
      inputSchema: z.object({}),
      execute: async () => "owned read",
    });
  }
  const agent = new Agent(
    {
      id: "router-proof",
      name: "Router proof",
      description: "Private proof",
      instructions: "Answer briefly",
      provider: "openai",
      model: "gpt-4o-mini",
      tools: ["one_read", "two_read"],
    },
    merchant,
  );
  let text = "";
  let completed = false;
  for await (const chunk of agent.stream("Read from one", {
    disableInternalFallback: true,
  })) {
    if (chunk.type === "agent-text") {
      text += chunk.content;
    }
    if (chunk.type === "agent-error") {
      throw new Error(chunk.error ?? "Merchant stream failed");
    }
    if (chunk.type === "agent-complete") {
      completed = chunk.status === "success";
    }
  }
  assert.ok(completed, "Merchant stream must complete successfully");
  assert.ok(text.length > 0, "Actual merchant stream must emit text");
  const routing = requests.filter(
    (entry) => entry.account === "Bearer DUMMY_PLATFORM",
  );
  const turns = requests.filter(
    (entry) => entry.account === "Bearer DUMMY_MERCHANT",
  );
  assert.equal(
    decisionCalls,
    0,
    "Host-owned routing invoked the merchant instance decision provider",
  );
  assert.equal(
    embeddingProviderAttempts,
    0,
    "Host-owned routing borrowed the instance embedding provider",
  );
  assert.equal(requests.length, 2, "Routing borrowed a third account");
  assert.equal(
    routing.length,
    1,
    "Routing did not use exactly one platform call",
  );
  assert.equal(
    turns.length,
    1,
    "Main inference did not use exactly one merchant call",
  );
  assert.equal(routing[0].body.tools, undefined, "Router inherited tools");
  assert.ok(
    JSON.stringify(routing[0].body.messages).includes("tool servers"),
    "Platform call was not the real router",
  );
  assert.ok(
    turns[0].body.tools?.some((tool) => tool.function.name === "one_read"),
  );
  assert.ok(
    !turns[0].body.tools?.some((tool) => tool.function.name === "two_read"),
    "Real router selection was not applied",
  );
  assert.ok(
    !JSON.stringify(requests.map((entry) => entry.body)).includes("DUMMY_"),
    "Credential reached the model body",
  );
  console.log(
    JSON.stringify({
      passed: 1,
      total: 1,
      platformRoutingCalls: routing.length,
      merchantTurnCalls: turns.length,
      scope:
        "Actual SDK public stream/routing, private vendor API, dummy accounts; no live provider acceptance",
    }),
  );
} finally {
  AIProviderFactory.createProvider = createProvider;
  await Promise.all([merchant.shutdown(), platform.shutdown()]);
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

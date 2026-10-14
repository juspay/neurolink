#!/usr/bin/env tsx
import "./helpers/credentialFreeEnv.js";

/**
 * Rule 15 determinism exception: The default ModelRouter can choose Vertex; the controlled routing decision is required to exercise retained Ollama orchestration when its configured model is absent. Native discovery, provider selection, HTTP, public generate/stream and returned nonce/model remain real.
 * All runtime modules stay on the same built DIST graph, including the public
 * SDK and the policy/router observations; no runtime SRC graph is mixed in.
 * This same shipped graph is checked again by ordinary installed consumers.
 *
 * Public provider-selection contracts against owned Ollama JSON/SSE endpoints.
 * ALL-DIST runtime graph: the only replaced decision is ModelRouter.route.
 * SDK, provider selection, health, fetch, HTTP and returned content remain real.
 * Explicit selection, installed FIRST/SECOND fidelity and existing bounded
 * automatic-generation failure are covered separately from diagnostic backoff,
 * default ModelRouter policy, MCP selection and stream-error fallback.
 *
 * Run: pnpm run build && pnpm run test:orchestrated-provider-selection
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { GenerateOptions, StreamOptions } from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { startDescriptorRuntimeFixtures } from "./helpers/descriptorRuntimeFixtures.js";

process.env.AWS_EC2_METADATA_DISABLED = "true";
process.env.NEUROLINK_SKIP_MCP = "true";

assertDistFresh({
  entrypoints: [
    "dist/index.js",
    "dist/utils/modelRouter.js",
    "dist/utils/providerHealth.js",
  ],
});

const { test, runSuite } = defineSuite("Orchestrated provider selection", {
  offline: true,
});

const FIRST = "llama3.2:latest";
const SECOND = "llama3.1:8b";
const MISSING = "owned-missing-configured-model:latest";

type SelectionCase = {
  name: string;
  streaming: boolean;
  orchestrated: boolean;
  configuredModel: string;
  routedModel?: string;
  expectedModel?: string;
  incomingContext?: Record<string, unknown>;
  automatic?: boolean;
  expectedBoundedError?: boolean;
  requestRouterProvider?: "openai" | "ollama";
  expectedRequestRouterCalls?: number;
};

type OwnedRequest = {
  caseName: string;
  method: string;
  path: string;
  body?: Record<string, unknown>;
};

/** Narrow decoded request values to non-null objects, excluding arrays. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Read the last user message's string or joined text parts for fixture replies. */
function userMessage(body: Record<string, unknown>): string {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const user = messages
    .filter(isRecord)
    .filter((row) => row.role === "user")
    .at(-1);
  if (typeof user?.content === "string") {
    return user.content;
  }
  if (Array.isArray(user?.content)) {
    return user.content
      .filter(isRecord)
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  }
  return "";
}

/** Complete an owned HTTP response with the supplied status and JSON payload. */
function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
}

const cases: readonly SelectionCase[] = [
  {
    name: "explicit JSON",
    streaming: false,
    orchestrated: false,
    configuredModel: MISSING,
  },
  {
    name: "explicit SSE",
    streaming: true,
    orchestrated: false,
    configuredModel: MISSING,
  },
  {
    name: "retained configured-FIRST JSON",
    streaming: false,
    orchestrated: true,
    configuredModel: FIRST,
  },
  {
    name: "retained configured-FIRST SSE",
    streaming: true,
    orchestrated: true,
    configuredModel: FIRST,
  },
  {
    name: "retained missing-configured JSON",
    streaming: false,
    orchestrated: true,
    configuredModel: MISSING,
  },
  {
    name: "retained missing-configured SSE",
    streaming: true,
    orchestrated: true,
    configuredModel: MISSING,
  },
  {
    name: "explicit JSON beats incoming Vertex context",
    streaming: false,
    orchestrated: false,
    configuredModel: MISSING,
    incomingContext: { __orchestratedPreferredProvider: "vertex" },
  },
  {
    name: "explicit SSE beats incoming Vertex context",
    streaming: true,
    orchestrated: false,
    configuredModel: MISSING,
    incomingContext: { __orchestratedPreferredProvider: "vertex" },
  },
  {
    name: "retained installed-SECOND JSON",
    streaming: false,
    orchestrated: true,
    configuredModel: MISSING,
    routedModel: SECOND,
    expectedModel: SECOND,
  },
  {
    name: "retained installed-SECOND SSE",
    streaming: true,
    orchestrated: true,
    configuredModel: MISSING,
    routedModel: SECOND,
    expectedModel: SECOND,
  },
  {
    name: "retained no-model JSON",
    streaming: false,
    orchestrated: true,
    configuredModel: MISSING,
    routedModel: "",
  },
  {
    name: "retained no-model SSE",
    streaming: true,
    orchestrated: true,
    configuredModel: MISSING,
    routedModel: "",
  },
  {
    name: "bounded automatic JSON retains OpenAI failure",
    streaming: false,
    orchestrated: false,
    configuredModel: FIRST,
    automatic: true,
    expectedBoundedError: true,
  },
  {
    name: "automatic configured-FIRST SSE",
    streaming: true,
    orchestrated: false,
    configuredModel: FIRST,
    automatic: true,
  },
  {
    name: "orchestrated JSON keeps provider and model against request router",
    streaming: false,
    orchestrated: true,
    configuredModel: MISSING,
    requestRouterProvider: "openai",
    expectedRequestRouterCalls: 0,
  },
  {
    name: "incoming Ollama preference SSE takes precedence over request router",
    streaming: true,
    orchestrated: false,
    automatic: true,
    configuredModel: FIRST,
    incomingContext: { __orchestratedPreferredProvider: "ollama" },
    requestRouterProvider: "openai",
    expectedRequestRouterCalls: 0,
  },
  {
    name: "request router still selects provider without orchestration preference",
    streaming: false,
    orchestrated: false,
    automatic: true,
    configuredModel: FIRST,
    requestRouterProvider: "ollama",
    expectedRequestRouterCalls: 1,
  },
  {
    name: "auto orchestration preference still permits request router",
    streaming: false,
    orchestrated: false,
    automatic: true,
    configuredModel: FIRST,
    incomingContext: { __orchestratedPreferredProvider: "auto" },
    requestRouterProvider: "ollama",
    expectedRequestRouterCalls: 1,
  },
  {
    name: "empty orchestration preference still permits request router",
    streaming: false,
    orchestrated: false,
    automatic: true,
    configuredModel: FIRST,
    incomingContext: { __orchestratedPreferredProvider: "" },
    requestRouterProvider: "ollama",
    expectedRequestRouterCalls: 1,
  },
  {
    name: "explicit JSON remains pinned with a conflicting request router",
    streaming: false,
    orchestrated: false,
    configuredModel: FIRST,
    requestRouterProvider: "openai",
    expectedRequestRouterCalls: 0,
  },
];

await runSuite(async () => {
  const runtimeFixtures = await startDescriptorRuntimeFixtures();
  const requests: OwnedRequest[] = [];
  const runNonce = randomUUID();
  let caseName = "suite bootstrap";

  const target = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const path = new URL(req.url ?? "/", "http://owned.invalid").pathname;
      let body: Record<string, unknown> | undefined;
      try {
        const value: unknown = chunks.length
          ? JSON.parse(Buffer.concat(chunks).toString())
          : undefined;
        body = isRecord(value) ? value : undefined;
      } catch {
        json(res, 400, { error: "invalid owned request JSON" });
        return;
      }
      requests.push({ caseName, method: req.method ?? "", path, body });
      if (path === "/api/tags") {
        if (req.method === "HEAD") {
          res.writeHead(405);
          res.end();
          return;
        }
        json(res, 200, { models: [{ name: FIRST }, { name: SECOND }] });
        return;
      }
      if (req.method === "GET" && path === "/v1/models") {
        json(res, 200, {
          object: "list",
          data: [
            { id: FIRST, object: "model" },
            { id: SECOND, object: "model" },
          ],
        });
        return;
      }
      if (req.method !== "POST" || path !== "/v1/chat/completions" || !body) {
        json(res, 404, { error: "owned inference path absent" });
        return;
      }
      if (body.model !== FIRST && body.model !== SECOND) {
        json(res, 404, {
          error: {
            message: "owned model not installed",
            type: "model_not_found",
          },
        });
        return;
      }
      const content = userMessage(body);
      if (!content.startsWith(`owned-selection-${runNonce}-`)) {
        json(res, 400, {
          error: {
            message: "owned nonce missing from actual user message",
            type: "invalid_request_error",
          },
        });
        return;
      }
      if (!body.stream) {
        json(res, 200, {
          id: "owned-json",
          object: "chat.completion",
          created: 1,
          model: body.model,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
      const event = (
        delta: Record<string, string>,
        finishReason: string | null,
      ) =>
        res.write(
          `data: ${JSON.stringify({
            id: "owned-sse",
            object: "chat.completion.chunk",
            created: 1,
            model: body.model,
            choices: [{ index: 0, delta, finish_reason: finishReason }],
          })}\n\n`,
        );
      const middle = Math.floor(content.length / 2);
      event({ role: "assistant", content: content.slice(0, middle) }, null);
      event({ content: content.slice(middle) }, null);
      event({}, "stop");
      res.end("data: [DONE]\n\n");
    });
  });

  let targetStarted = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const failed = (error: Error) => reject(error);
      target.once("error", failed);
      target.listen(0, "127.0.0.1", () => {
        target.off("error", failed);
        targetStarted = true;
        resolve();
      });
    });
    const address = target.address();
    assert(address && typeof address !== "string");
    const targetBase = `http://127.0.0.1:${address.port}`;
    process.env.OLLAMA_BASE_URL = targetBase;
    process.env.OLLAMA_API_BASE = targetBase;
    process.env.OLLAMA_MODEL = MISSING;

    // Readiness and credentials precede every provider-facing runtime import.
    const { NeuroLink } = await import("../dist/index.js");
    const { ModelRouter } = await import("../dist/utils/modelRouter.js");
    const { ProviderHealthChecker } =
      await import("../dist/utils/providerHealth.js");
    const originalRoute = ModelRouter.route;

    for (const [index, spec] of cases.entries()) {
      await test(spec.name, async () => {
        caseName = spec.name;
        runtimeFixtures.setCaseLabel(spec.name);
        runtimeFixtures.pinRuntimeEndpoints();
        process.env.OLLAMA_BASE_URL = targetBase;
        process.env.OLLAMA_API_BASE = targetBase;
        process.env.OLLAMA_MODEL = spec.configuredModel;
        ProviderHealthChecker.clearHealthCache();
        const before = requests.length;
        const nonce = `owned-selection-${runNonce}-${index}`;
        const options: GenerateOptions & StreamOptions = {
          input: { text: nonce },
          disableTools: true,
          disableInternalFallback: true,
          maxTokens: 64,
        };
        if (spec.incomingContext) {
          options.context = { ...spec.incomingContext };
        }
        if (!spec.orchestrated && !spec.automatic) {
          options.provider = "ollama";
          options.model = FIRST;
        }
        let routeCalls = 0;
        let requestRouterCalls = 0;
        if (spec.orchestrated) {
          ModelRouter.route = () => {
            routeCalls++;
            return {
              provider: "ollama",
              model: spec.routedModel ?? MISSING,
              confidence: 0.9,
              reasoning: "declared owned router-decision seam",
            };
          };
        }
        let sdk: InstanceType<typeof NeuroLink> | undefined;
        try {
          sdk = new NeuroLink({
            conversationMemory: { enabled: false },
            enableOrchestration: spec.orchestrated,
            ...(spec.requestRouterProvider
              ? {
                  requestRouter: () => {
                    requestRouterCalls++;
                    return {
                      provider: spec.requestRouterProvider,
                      model:
                        spec.requestRouterProvider === "ollama"
                          ? FIRST
                          : "owned-conflicting-router-model",
                    };
                  },
                }
              : {}),
          });
          if (spec.expectedBoundedError) {
            await assert.rejects(sdk.generate(options), (error: unknown) => {
              assert(error instanceof Error);
              assert.match(error.message, /Provider openai failed/);
              assert.match(
                error.message,
                /Missing required environment variable: OPENAI_API_KEY/,
              );
              return true;
            });
            assert.equal(
              requests
                .slice(before)
                .filter(
                  (row) =>
                    row.method === "POST" &&
                    row.path === "/v1/chat/completions",
                ).length,
              0,
            );
            return;
          }
          let content = "";
          const activeSdk = sdk;
          // Credential errors from a wrong routing decision must fail this
          // contract rather than being classified as an unavailable live test.
          await assert.doesNotReject(async () => {
            if (spec.streaming) {
              const result = await activeSdk.stream(options);
              for await (const chunk of result.stream) {
                if (
                  chunk &&
                  "content" in chunk &&
                  typeof chunk.content === "string"
                ) {
                  content += chunk.content;
                }
              }
            } else {
              content = (await activeSdk.generate(options)).content;
            }
          });
          if (spec.expectedRequestRouterCalls !== undefined) {
            assert.equal(requestRouterCalls, spec.expectedRequestRouterCalls);
          }
          assert.equal(content, nonce);
          const actual = requests.slice(before);
          const posts = actual.filter(
            (row) =>
              row.method === "POST" && row.path === "/v1/chat/completions",
          );
          assert(posts.length > 0, "actual public inference POST required");
          for (const row of posts) {
            assert.equal(row.body?.model, spec.expectedModel ?? FIRST);
            assert.equal(Boolean(row.body?.stream), spec.streaming);
            assert(row.body && userMessage(row.body) === nonce);
          }
          if (spec.orchestrated) {
            assert.equal(routeCalls, 1, "only declared routing decision used");
            assert(
              actual.filter(
                (row) => row.method === "GET" && row.path === "/api/tags",
              ).length >= 2,
              "real configuration and native routing probes retained",
            );
          }
        } finally {
          ModelRouter.route = originalRoute;
          await sdk?.shutdown();
          ProviderHealthChecker.clearHealthCache();
        }
      });
    }
  } finally {
    try {
      if (targetStarted) {
        await new Promise<void>((resolve, reject) => {
          target.close((error) => (error ? reject(error) : resolve()));
          target.closeIdleConnections();
          target.closeAllConnections();
        });
      }
    } finally {
      await runtimeFixtures.close();
    }
  }
});

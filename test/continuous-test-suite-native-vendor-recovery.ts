#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — native-loop vendor recovery
 *
 * Two vendor misbehaviours are recovered inside the native generate loop, and
 * both are invisible to the live provider matrix because no reachable endpoint
 * reproduces them on demand:
 *
 *   1. io.net's Llama endpoint ends a tool loop on `finish_reason: "tool_calls"`
 *      carrying `content: null` and no `tool_calls` array. There is nothing to
 *      execute, so the loop stops and the caller gets an empty turn even though
 *      the tool ran. The recovery re-asks once with `tool_choice: "none"`.
 *   2. GMI Cloud's MiniMax endpoint ignores a strict `json_schema` request and
 *      answers in prose. The recovery drops `response_format` and spells the
 *      schema into the system prompt.
 *
 * Both recoveries used to live in `GenerationHandler`, on the ai-package path.
 * Every provider they were written for is a Tier-2 catalog provider on the
 * OpenAI-compatible base, which now has a native `generate()` and never reaches
 * that handler — so they were ported into the native loop, and this suite is
 * what proves the ports behave. A local scripted stand-in serves the exact wire
 * shapes; no credentials, no network, deterministic.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-native-vendor-recovery.ts
 */

import { z } from "zod";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  chatCompletion,
  startScriptedChatServer,
} from "./helpers/mockChatServer.js";
import { NeuroLink, tool } from "../dist/index.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Native vendor recovery", {
  offline: true,
});

const credentialsFor = (baseURL: string) => ({
  openai: { apiKey: "sk-mock-local-server", baseURL },
});

await test("an empty tool-calls finish is recovered with a toolChoice:none re-ask", async () => {
  // Reply 1 asks for the tool. Reply 2 is io.net's broken shape: a
  // tool_calls finish with no call and no content. Reply 3 is the answer the
  // re-ask gets.
  const server = await startScriptedChatServer([
    chatCompletion({
      finishReason: "tool_calls",
      toolCalls: [
        {
          id: "call_1",
          type: "function",
          function: { name: "get_code", arguments: "{}" },
        },
      ],
    }),
    chatCompletion({ content: null, finishReason: "tool_calls" }),
    chatCompletion({ content: "the answer is 42", finishReason: "stop" }),
  ]);
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "call the tool then answer" },
      provider: "openai",
      model: "scripted-model",
      credentials: credentialsFor(server.baseURL),
      maxTokens: 64,
      tools: {
        get_code: tool({
          description: "Returns a code",
          inputSchema: z.object({}),
          execute: async () => ({ code: 42 }),
        }),
      },
    });

    // PRECONDITION: the stand-in must have been driven through all three
    // replies, or this asserts nothing about the recovery.
    const requests = server.requestCount();
    if (requests < 3) {
      throw new Error(
        `precondition failed: recovery re-ask never issued, saw ${requests} requests`,
      );
    }

    const bodies = server.getAllRequestBodies();
    const reask = JSON.parse(bodies[2]) as { tool_choice?: unknown };
    if (reask.tool_choice !== "none") {
      throw new Error("re-ask did not carry tool_choice none");
    }
    if (!(result.content ?? "").includes("42")) {
      throw new Error("recovered answer did not reach the caller");
    }
  } finally {
    await server.close();
  }
});

await test("a rejected response_format falls back to the schema in the system prompt", async () => {
  // Reply 1 is the vendor refusing constrained decoding; reply 2 answers the
  // re-ask, which must carry the schema in a system message and no
  // response_format.
  const server = await startScriptedChatServer([
    {
      status: 400,
      body: {
        error: { message: "json mode cannot be combined with tool calling" },
      },
    },
    chatCompletion({
      content: '{"city":"Tokyo","temp":22}',
      finishReason: "stop",
    }),
  ]);
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "weather in Tokyo" },
      provider: "openai",
      model: "scripted-model",
      credentials: credentialsFor(server.baseURL),
      maxTokens: 64,
      schema: z.object({ city: z.string(), temp: z.number() }),
    });

    const requests = server.requestCount();
    if (requests < 2) {
      throw new Error(
        `precondition failed: fallback never issued, saw ${requests} requests`,
      );
    }

    const bodies = server.getAllRequestBodies();
    const first = JSON.parse(bodies[0]) as { response_format?: unknown };
    const second = JSON.parse(bodies[1]) as {
      response_format?: unknown;
      messages?: Array<{ role: string; content?: unknown }>;
    };
    if (first.response_format === undefined) {
      throw new Error("first attempt did not request constrained decoding");
    }
    if (second.response_format !== undefined) {
      throw new Error("fallback still sent response_format");
    }
    const systemText = (second.messages ?? [])
      .filter((m) => m.role === "system")
      .map((m) => (typeof m.content === "string" ? m.content : ""))
      .join("\n");
    if (!systemText.includes("JSON Schema")) {
      throw new Error("fallback did not spell the schema into the prompt");
    }
    const data = result.structuredData as { city?: string } | undefined;
    if (data?.city !== "Tokyo") {
      throw new Error("recovered object did not reach the caller");
    }
  } finally {
    await server.close();
  }
});

await runSuite();

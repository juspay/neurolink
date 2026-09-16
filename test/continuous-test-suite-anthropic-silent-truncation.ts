#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Anthropic structured-output truncation is surfaced
 *
 * Direct Anthropic's native generate path answers a `schema` request by
 * appending a synthetic `final_result` tool and unwrapping its arguments back
 * into text. Because that makes the vendor report `stop_reason: "tool_use"` on
 * a turn where no tool call is surfaced, the path substitutes a "stop" finish
 * so the turn does not misread as step-capped.
 *
 * The substitution used to apply to EVERY stop reason, not just the one it was
 * written for. A turn can also end at `stop_reason: "max_tokens"` — the model
 * was still writing the `final_result` arguments when the output ceiling hit,
 * so the structured payload is cut mid-object. Reporting that as "stop" told
 * the caller the response was complete: `neurolink.ts`'s
 * `finishReason === "length"` check never fired, `jsonTruncated` stayed unset,
 * and no warning was logged.
 *
 * That combination is worth pinning precisely because it is silent from both
 * directions. The salvaged fragment is itself valid JSON, so
 * `coerceJsonToSchema` parses it happily and never sets its own `truncated`
 * flag — the finish reason was the ONLY remaining signal that the object was a
 * fragment, and it had been overwritten. A caller following the documented
 * contract (check `jsonTruncated` before trusting `structuredData`) was told
 * a half-written object was whole.
 *
 * Determinism exception (CLAUDE.md rule 15): no reachable live endpoint
 * produces "a `final_result` call cut off at the output ceiling" on demand —
 * asking for it depends on model, prompt and cap all landing just so, which is
 * neither reproducible nor cheap. A local stand-in serves the exact Messages
 * API wire shape over `ANTHROPIC_BASE_URL` instead, so the real provider, the
 * real SDK and the real unwrapping code all run and only the vendor is
 * substituted. No credentials, no network egress, deterministic in CI. This
 * follows the same pattern as `continuous-test-suite-anthropic-streaming-retry`
 * and `continuous-test-suite-native-vendor-recovery`.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-anthropic-silent-truncation.ts
 *      pnpm run test:anthropic-silent-truncation
 */

import { createServer, type Server } from "node:http";
import { z } from "zod";
import { defineSuite, assert } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink } from "../dist/index.js";

assertDistFresh();

const { test, runSuite, section } = defineSuite(
  "Anthropic structured-output truncation",
  { offline: true },
);

/**
 * Env vars this suite mutates — saved and restored around every case so an
 * ambient dev-machine value cannot leak in or out. The auth vars are pinned
 * for the same reason the streaming-retry suite pins them: an ambient OAuth
 * token would route the provider's constructor down the OAuth branch instead
 * of the api_key branch these cases drive, silently invalidating the run.
 */
const TOUCHED_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
] as const;

type EnvSnapshot = Record<string, string | undefined>;

const snapshotEnv = (): EnvSnapshot => {
  const snapshot: EnvSnapshot = {};
  for (const key of TOUCHED_ENV_VARS) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
};

const restoreEnv = (snapshot: EnvSnapshot): void => {
  for (const key of TOUCHED_ENV_VARS) {
    const prior = snapshot[key];
    if (prior === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prior;
    }
  }
};

const REPORT_SCHEMA = z.object({
  city: z.string(),
  summary: z.string(),
  temperature: z.number(),
});

/**
 * The fragment a cut-off `final_result` call carries: the first field
 * completed, the rest never written. Valid JSON on its own — which is the
 * whole point, since that is what makes the truncation invisible without an
 * honest finish reason.
 */
const PARTIAL_ARGUMENTS = { city: "Bengaluru" } as const;

const COMPLETE_ARGUMENTS = {
  city: "Bengaluru",
  summary: "Warm and overcast.",
  temperature: 27,
} as const;

/**
 * One non-streaming Messages API response carrying a `final_result` tool call,
 * shaped exactly as the vendor returns it. `stopReason` is the variable under
 * test: "max_tokens" for a turn the ceiling cut short, "tool_use" for one that
 * finished on its own.
 */
const startMessagesServer = async (
  stopReason: "max_tokens" | "tool_use",
  toolArguments: Record<string, unknown>,
): Promise<{ server: Server; port: number }> => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "msg_local_fixture",
        type: "message",
        role: "assistant",
        model: "claude-3-5-sonnet-20241022",
        content: [
          {
            type: "tool_use",
            id: "toolu_local_fixture",
            name: "final_result",
            input: toolArguments,
          },
        ],
        stop_reason: stopReason,
        stop_sequence: null,
        usage: { input_tokens: 24, output_tokens: 64 },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port };
};

type TruncationResult = {
  finishReason?: string;
  jsonTruncated?: boolean;
  structuredData?: unknown;
};

const generateAgainst = async (port: number): Promise<TruncationResult> => {
  process.env.ANTHROPIC_API_KEY = "local-fixture-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  delete process.env.ANTHROPIC_OAUTH_TOKEN;
  delete process.env.CLAUDE_OAUTH_TOKEN;

  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const result = await neurolink.generate({
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    input: { text: "Report the weather." },
    schema: REPORT_SCHEMA,
    maxSteps: 1,
  } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);

  return result as TruncationResult;
};

void runSuite(async () => {
  section("a final_result turn cut off at the output ceiling is surfaced");

  await test("a turn the vendor cut short reports a length finish rather than a clean stop", async () => {
    const envSnapshot = snapshotEnv();
    const { server, port } = await startMessagesServer(
      "max_tokens",
      PARTIAL_ARGUMENTS,
    );
    try {
      const result = await generateAgainst(port);
      assert(
        result.finishReason === "length",
        "finish reason did not report the turn the vendor cut short",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  await test("a turn the vendor cut short sets jsonTruncated on the structured result", async () => {
    const envSnapshot = snapshotEnv();
    const { server, port } = await startMessagesServer(
      "max_tokens",
      PARTIAL_ARGUMENTS,
    );
    try {
      const result = await generateAgainst(port);
      assert(
        result.jsonTruncated === true,
        "jsonTruncated was not set for a structured turn that was cut short",
      );
      // The documented contract: a cut-short turn still yields an object,
      // just not a schema-valid one. Pinning this keeps the fix honest —
      // surfacing truncation must not come at the cost of the partial data.
      assert(
        typeof result.structuredData === "object" &&
          result.structuredData !== null,
        "the salvaged fragment was not returned as an object",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  section("a turn that finished on its own still reads as a clean stop");

  await test("a completed final_result turn is not reported as capped or truncated", async () => {
    const envSnapshot = snapshotEnv();
    const { server, port } = await startMessagesServer(
      "tool_use",
      COMPLETE_ARGUMENTS,
    );
    try {
      const result = await generateAgainst(port);
      // The substitution this path exists for: the vendor says "tool_use"
      // but no tool call is surfaced, so the turn must not read as capped.
      assert(
        result.finishReason === "stop",
        "a turn that finished on its own did not report a clean finish",
      );
      assert(
        result.jsonTruncated !== true,
        "a turn that finished on its own was marked as cut short",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });
});

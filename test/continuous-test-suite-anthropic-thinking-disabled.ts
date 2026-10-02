#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — `thinkingConfig.type: "disabled"` reaches Anthropic
 *
 * `thinkingConfig.type` is typed `"enabled" | "disabled"` and documented as an
 * explicit enable/disable switch. On the direct Anthropic provider only the
 * enabling half was ever wired: a request got a `thinking` block when
 * `enabled` and `budgetTokens` were set, and in every other case — including
 * `type: "disabled"` — the field was left off the request entirely.
 *
 * Leaving the field off is not the same as turning thinking off. Claude Sonnet
 * 5 thinks before it answers when the request says nothing, and that thinking
 * is billed against the request's `max_tokens`. A caller that sized `maxTokens`
 * for a one-line verdict and asked for `type: "disabled"` still got a model
 * that spent most of the allowance thinking: replies came back empty or cut off
 * mid-word, and nothing in the call said why. Sent as `thinking: { type:
 * "disabled" }`, the same request produced a complete ~75-token reply with no
 * thinking tokens.
 *
 * The change is small, and the way it can go wrong is subtler than "forgot to
 * send it". Both request builders gate the sampling knobs on `thinking` being
 * truthy — Anthropic rejects any temperature but 1 while thinking is ON, so
 * `temperature` and `top_p` are dropped. A bare `{ type: "disabled" }` object
 * is truthy too. Wiring the field through without also narrowing that gate to
 * `type === "enabled"` would send the right `thinking` block and quietly drop
 * the caller's temperature. Two cases below pin that.
 *
 * WHY THIS ASSERTS ON THE REQUEST. What the fix changes is the bytes we send;
 * whether a model then thinks less is the vendor's behaviour, not ours.
 *
 * Determinism exception (CLAUDE.md rule 15): a live call cannot show the
 * outbound body without wrapping `fetch`, and cannot be made to run without
 * credentials in CI. A local stand-in serves the exact Messages API wire shape
 * over `ANTHROPIC_BASE_URL` and records each request body, so the real
 * provider, the real SDK and the real request builders all run and only the
 * vendor is substituted. No credentials, no network egress. This follows
 * `continuous-test-suite-anthropic-silent-truncation` and
 * `continuous-test-suite-anthropic-streaming-retry`.
 *
 * Only the first two cases fail on a build without the fix. The rest exist to
 * catch the fix breaking something that already worked, or switching thinking
 * on or off for callers who never asked.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-anthropic-thinking-disabled.ts
 *      pnpm run test:anthropic-thinking-disabled
 */

import { createServer, type Server } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink } from "../dist/index.js";
import type { GenerateOptions, StreamOptions } from "../src/lib/types/index.js";

assertDistFresh();

const { test, runSuite, section } = defineSuite(
  "Anthropic thinkingConfig disabled",
  { offline: true },
);

/**
 * Env vars this suite mutates — saved and restored around every case so an
 * ambient dev-machine value cannot leak in or out. The auth vars are pinned for
 * the same reason the sibling suites pin them: an ambient OAuth token would
 * route the provider down the OAuth branch instead of the api_key branch these
 * cases drive.
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

type ThinkingConfig = GenerateOptions["thinkingConfig"];
type Mode = "generate" | "stream";
type SeenBody = Record<string, unknown>;

const MODEL = "claude-3-5-sonnet-20241022";
const TEMPERATURE = 0.3;
const BUDGET = 5000;

/**
 * A stand-in for the Messages API that records every request body it receives
 * and answers in the right wire shape for the path that asked: a JSON message
 * for `generate()`, an SSE stream for `stream()`.
 */
const startMessagesServer = async (
  seen: SeenBody[],
): Promise<{ server: Server; port: number }> => {
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      let body: SeenBody = {};
      try {
        body = JSON.parse(raw) as SeenBody;
      } catch {
        // An unparseable body is recorded as empty and fails the assertions.
      }
      seen.push(body);
      if (body.stream === true) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(
          `event: message_start\ndata: ${JSON.stringify({
            type: "message_start",
            message: {
              id: "msg_local_fixture",
              usage: { input_tokens: 5, output_tokens: 0 },
            },
          })}\n\n`,
        );
        res.write(
          `event: content_block_delta\ndata: ${JSON.stringify({
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: "ok" },
          })}\n\n`,
        );
        res.write(
          `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
        );
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_local_fixture",
          type: "message",
          role: "assistant",
          model: MODEL,
          content: [{ type: "text", text: "ok" }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 5, output_tokens: 1 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port };
};

/**
 * One stand-in server, one env pin and one `NeuroLink` for the whole suite.
 * Constructing a client per case repeated its first-call setup every time, and
 * nothing here is per-instance: the stand-in records each request, so a case
 * clears the record, makes one real call, and reads what arrived.
 *
 * A suite that measured nothing must not read as a pass, so a call that
 * reached the stand-in zero times fails in `requestsFor` rather than
 * satisfying an `every` over an empty list.
 */
const openStandIn = async (): Promise<{
  requestsFor: (
    mode: Mode,
    thinkingConfig: ThinkingConfig,
  ) => Promise<SeenBody[]>;
  close: () => void;
}> => {
  const envSnapshot = snapshotEnv();
  const seen: SeenBody[] = [];
  const { server, port } = await startMessagesServer(seen);
  process.env.ANTHROPIC_API_KEY = "local-fixture-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  delete process.env.ANTHROPIC_OAUTH_TOKEN;
  delete process.env.CLAUDE_OAUTH_TOKEN;
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });

  const requestsFor = async (
    mode: Mode,
    thinkingConfig: ThinkingConfig,
  ): Promise<SeenBody[]> => {
    seen.splice(0);
    const options = {
      provider: "anthropic",
      model: MODEL,
      input: { text: "Say ok." },
      temperature: TEMPERATURE,
      maxSteps: 1,
      ...(thinkingConfig ? { thinkingConfig } : {}),
    };
    if (mode === "generate") {
      await neurolink.generate(options as GenerateOptions);
    } else {
      const result = await neurolink.stream(options as StreamOptions);
      for await (const chunk of result.stream) {
        void chunk;
      }
    }
    assert(seen.length > 0, `no ${mode} request reached the stand-in`);
    return [...seen];
  };

  return {
    requestsFor,
    close: () => {
      server.close();
      restoreEnv(envSnapshot);
    },
  };
};

const sameJson = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

const MODES: Mode[] = ["generate", "stream"];

void runSuite(async () => {
  const { requestsFor, close } = await openStandIn();
  try {
    await runCases(requestsFor);
  } finally {
    close();
  }
});

const runCases = async (
  requestsFor: (
    mode: Mode,
    thinkingConfig: ThinkingConfig,
  ) => Promise<SeenBody[]>,
): Promise<void> => {
  section("type: disabled is sent to Anthropic");

  for (const mode of MODES) {
    await test(`${mode}: thinkingConfig { type: "disabled" } sends thinking: { type: "disabled" }`, async () => {
      const bodies = await requestsFor(mode, { type: "disabled" });
      assert(
        bodies.every((body) => sameJson(body.thinking, { type: "disabled" })),
        `${mode} request did not carry thinking: { type: "disabled" }`,
      );
    });
  }

  section("a disabled block does not cost the caller's sampling parameters");

  for (const mode of MODES) {
    await test(`${mode}: temperature is still sent alongside thinking: disabled`, async () => {
      const bodies = await requestsFor(mode, { type: "disabled" });
      assert(
        bodies.every((body) => body.temperature === TEMPERATURE),
        `${mode} request dropped the caller's temperature while thinking was disabled`,
      );
    });
  }

  section("callers who never asked are left alone");

  for (const mode of MODES) {
    await test(`${mode}: no thinkingConfig sends no thinking field`, async () => {
      const bodies = await requestsFor(mode, undefined);
      assert(
        bodies.every((body) => !("thinking" in body)),
        `${mode} request carried a thinking field nobody asked for`,
      );
    });

    await test(`${mode}: thinkingConfig { enabled: false } sends no thinking field`, async () => {
      const bodies = await requestsFor(mode, { enabled: false });
      assert(
        bodies.every((body) => !("thinking" in body)),
        `${mode} request changed meaning for enabled: false`,
      );
    });
  }

  section("enabling thinking still works as before");

  for (const mode of MODES) {
    await test(`${mode}: enabled with a budget sends thinking enabled and drops temperature`, async () => {
      const bodies = await requestsFor(mode, {
        enabled: true,
        budgetTokens: BUDGET,
      });
      assert(
        bodies.every((body) =>
          sameJson(body.thinking, { type: "enabled", budget_tokens: BUDGET }),
        ),
        `${mode} request did not carry thinking enabled with its budget`,
      );
      assert(
        bodies.every((body) => !("temperature" in body)),
        `${mode} request kept a temperature Anthropic rejects while thinking is on`,
      );
    });

    // Pins behaviour that predates this change: an enabling block with a budget
    // has always won over a stray `type`. A caller already passing both keeps
    // the thinking they have been getting.
    await test(`${mode}: enabled with a budget still wins over type: "disabled"`, async () => {
      const bodies = await requestsFor(mode, {
        enabled: true,
        budgetTokens: BUDGET,
        type: "disabled",
      });
      assert(
        bodies.every((body) =>
          sameJson(body.thinking, { type: "enabled", budget_tokens: BUDGET }),
        ),
        `${mode} request changed which of enabled and type: "disabled" wins`,
      );
    });
  }
};

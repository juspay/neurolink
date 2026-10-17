#!/usr/bin/env tsx
/**
 * Catalog output ceiling through the public built SDK against a local mock
 * OpenAI-compatible server.
 *
 * A JSON-catalog provider has no PROVIDER_MAX_TOKENS row, so getSafeMaxTokens
 * used to pass any requested maxTokens straight through, even for a model whose
 * catalog entry declares a smaller maxOutputTokens. The mock records the
 * `max_tokens` / `max_completion_tokens` field of every chat request, so each
 * case reads the value that actually leaves the SDK.
 *
 * Positive cases: an over-large request is cut to the model's own ceiling,
 * under a provider alias and under a differently cased model id.
 *
 * Controls, each of which the fix must leave alone:
 *  - a request within the ceiling, or exactly at it, is sent unchanged;
 *  - no maxTokens sends no budget field (the ceiling is never injected);
 *  - a model with no recorded maxOutputTokens is uncapped, including on
 *    providers whose catalog defaultMaxOutputTokens is a 4096 placeholder
 *    (groq, xai, together-ai), on a provider with a real default (avian-io,
 *    65536) when the model is unlisted, and on the four charm-hyper models
 *    whose roster figure looked derived from the context window and was
 *    therefore left out of the catalog: only a recorded per-model value
 *    counts, never the provider default;
 *  - mistral, whose catalog lists no per-model ceilings, is not capped by
 *    its catalog default and still sends its explicit 8192;
 *
 * LongCat, Xiaomi MiMo and RunInfra declare ceilings (131072, 131072, 262144)
 * above the SDK's separate 1..128000 maxTokens validation, so for them the
 * change has no effect on what is sent: an in-range request is sent
 * unchanged under each provider's own budget field and an oversized
 * LongCat / MiMo request is still rejected before the wire. Those cases are
 * controls, not evidence that the clamp works; the clamp is shown by the
 * providers whose ceiling is below 128000.
 *
 * Only the public SDK is imported. No vendor calls, no real credentials.
 */
import "./helpers/credentialFreeEnv.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

type PublicSDK = typeof import("../dist/index.js");
type BudgetField = "max_tokens" | "max_completion_tokens";
type WireRow = {
  provider: string;
  route: string;
  keyEnv: string;
  urlEnv: string;
  field: BudgetField;
};
type WireRequest = {
  route: string;
  model: unknown;
  bearer: string | undefined;
  promptSeen: boolean;
  stream: boolean;
  maxTokens: unknown;
  maxCompletionTokens: unknown;
  hasMaxTokens: boolean;
  hasMaxCompletionTokens: boolean;
};
type Drive = { requests: WireRequest[]; error?: string };

const ROWS = {
  aihubmix: {
    provider: "aihubmix",
    route: "aihubmix",
    keyEnv: "AIHUBMIX_API_KEY",
    urlEnv: "AIHUBMIX_BASE_URL",
    field: "max_tokens",
  },
  // The catalog id is avian-io; the request names its alias.
  avian: {
    provider: "avian",
    route: "avian-io",
    keyEnv: "AVIAN_IO_API_KEY",
    urlEnv: "AVIAN_IO_BASE_URL",
    field: "max_tokens",
  },
  ai21: {
    provider: "ai21",
    route: "ai21",
    keyEnv: "AI21_API_KEY",
    urlEnv: "AI21_BASE_URL",
    field: "max_tokens",
  },
  longcat: {
    provider: "longcat",
    route: "longcat",
    keyEnv: "LONGCAT_API_KEY",
    urlEnv: "LONGCAT_BASE_URL",
    field: "max_tokens",
  },
  mimo: {
    provider: "xiaomi-mimo",
    route: "xiaomi-mimo",
    keyEnv: "XIAOMI_MIMO_API_KEY",
    urlEnv: "XIAOMI_MIMO_BASE_URL",
    field: "max_completion_tokens",
  },
  runinfra: {
    provider: "runinfra",
    route: "runinfra",
    keyEnv: "RUNINFRA_GATEWAY_KEY",
    urlEnv: "RUNINFRA_BASE_URL",
    field: "max_tokens",
  },
  charmHyper: {
    provider: "charm-hyper",
    route: "charm-hyper",
    keyEnv: "CHARM_HYPER_API_KEY",
    urlEnv: "CHARM_HYPER_BASE_URL",
    field: "max_tokens",
  },
  groq: {
    provider: "groq",
    route: "groq",
    keyEnv: "GROQ_API_KEY",
    urlEnv: "GROQ_BASE_URL",
    field: "max_tokens",
  },
  xai: {
    provider: "xai",
    route: "xai",
    keyEnv: "XAI_API_KEY",
    urlEnv: "XAI_BASE_URL",
    field: "max_tokens",
  },
  togetherAi: {
    provider: "together-ai",
    route: "together-ai",
    keyEnv: "TOGETHER_API_KEY",
    urlEnv: "TOGETHER_BASE_URL",
    field: "max_tokens",
  },
  mistral: {
    provider: "mistral",
    route: "mistral",
    keyEnv: "MISTRAL_API_KEY",
    urlEnv: "MISTRAL_BASE_URL",
    field: "max_tokens",
  },
} as const satisfies Record<string, WireRow>;

const ANSWER = `OWNED_ANSWER_${randomUUID()}`;
const REGISTRY = {
  version: "catalog-output-ceiling-empty-registry-v1",
  lastUpdated: "2026-10-17T00:00:00.000Z",
  models: {},
  defaults: {},
  aliases: {},
};

for (const name of [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy",
]) {
  delete process.env[name];
}
process.env.NO_PROXY = "127.0.0.1,localhost";
process.env.no_proxy = "127.0.0.1,localhost";
process.env.NEUROLINK_SKIP_MCP = "true";
assertDistFresh({ entrypoints: ["dist/index.js"] });
const sdk = (await import("../dist/index.js")) as PublicSDK;
const { test, runSuite } = defineSuite("Catalog output ceiling wire controls", {
  offline: true,
});

const fixtureKey = (row: WireRow): string => `${row.route}-owned-fixture-key`;
let prompt = "";
const captured: WireRequest[] = [];

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function textContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => {
      const row = object(part);
      return row.type === "text" && typeof row.text === "string"
        ? row.text
        : "";
    })
    .join("");
}

const server = createServer(async (req, res) => {
  if (req.method === "HEAD" && req.url === "/health") {
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === "GET" && req.url === "/api/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(REGISTRY));
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  let body: Record<string, unknown> = {};
  try {
    body = object(JSON.parse(Buffer.concat(chunks).toString()));
  } catch {
    // A malformed request never receives the case's answer.
  }
  const messages = Array.isArray(body.messages)
    ? body.messages.map(object)
    : [];
  const bearer = req.headers.authorization?.replace(/^Bearer /, "");
  const row: WireRequest = {
    route: req.url ?? "",
    model: body.model,
    bearer,
    promptSeen: messages.some(
      (message) =>
        message.role === "user" &&
        textContent(message.content).includes(prompt),
    ),
    stream: body.stream === true,
    maxTokens: body.max_tokens,
    maxCompletionTokens: body.max_completion_tokens,
    hasMaxTokens: Object.hasOwn(body, "max_tokens"),
    hasMaxCompletionTokens: Object.hasOwn(body, "max_completion_tokens"),
  };
  captured.push(row);
  const owner = Object.values(ROWS).find(
    (candidate) => row.route === `/${candidate.route}/v1/chat/completions`,
  );
  if (
    req.method !== "POST" ||
    owner === undefined ||
    bearer !== fixtureKey(owner) ||
    !row.promptSeen
  ) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: {
          message: "Owned wire precondition failed",
          code: "owned_invalid_wire",
          type: "invalid_request_error",
        },
      }),
    );
    return;
  }
  if (row.stream) {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    for (const [delta, finish] of [
      [{ role: "assistant", content: ANSWER }, null],
      [{}, "stop"],
    ] as const) {
      res.write(
        `data: ${JSON.stringify({
          id: "ceiling-owned-stream",
          object: "chat.completion.chunk",
          created: 0,
          model: String(body.model),
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );
    }
    res.end("data: [DONE]\n\n");
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      id: "ceiling-owned-generate",
      object: "chat.completion",
      created: 0,
      model: String(body.model),
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: ANSWER },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
  );
});
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const address = server.address();
assert.ok(address && typeof address === "object", "Owned listener missing");
const origin = `http://127.0.0.1:${address.port}`;
process.env.MODEL_CONFIG_URL = `${origin}/api/v1/models`;
for (const row of Object.values(ROWS)) {
  process.env[row.keyEnv] = fixtureKey(row);
  process.env[row.urlEnv] = `${origin}/${row.route}/v1`;
}

async function drive(
  kind: "generate" | "stream",
  row: WireRow,
  model: string,
  maxTokens?: number,
): Promise<Drive> {
  captured.length = 0;
  prompt = `OWNED_PROMPT_${randomUUID()}`;
  const client = new sdk.NeuroLink({ conversationMemory: { enabled: false } });
  let error: string | undefined;
  try {
    const options = {
      provider: row.provider,
      model,
      input: { text: prompt },
      ...(maxTokens === undefined ? {} : { maxTokens }),
      disableTools: true,
      disableInternalFallback: true,
    };
    let text = "";
    if (kind === "generate") {
      text = (await client.generate(options)).content;
    } else {
      const result = await client.stream(options);
      for await (const chunk of result.stream) {
        if ("content" in chunk && typeof chunk.content === "string") {
          text += chunk.content;
        }
      }
    }
    assert.equal(text, ANSWER, "Backend answer did not reach the caller");
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  } finally {
    await client.shutdown();
  }
  return { requests: [...captured], ...(error === undefined ? {} : { error }) };
}

function assertWire(
  outcome: Drive,
  row: WireRow,
  kind: "generate" | "stream",
  model: string,
  expected: number | undefined,
): void {
  assert.equal(
    outcome.error,
    undefined,
    `${kind} on ${row.provider} failed: ${outcome.error}`,
  );
  assert.equal(outcome.requests.length, 1, "Expected exactly one wire request");
  const [request] = outcome.requests;
  assert.equal(request.route, `/${row.route}/v1/chat/completions`);
  assert.equal(request.bearer, fixtureKey(row), "Credential mapping changed");
  assert.equal(request.model, model, "Model changed or fell back");
  assert.equal(request.stream, kind === "stream", "Wire stream mode changed");
  const other: BudgetField =
    row.field === "max_tokens" ? "max_completion_tokens" : "max_tokens";
  const present = (field: BudgetField): boolean =>
    field === "max_tokens"
      ? request.hasMaxTokens
      : request.hasMaxCompletionTokens;
  const value = (field: BudgetField): unknown =>
    field === "max_tokens" ? request.maxTokens : request.maxCompletionTokens;
  assert.equal(present(other), false, `Unexpected ${other} on the wire`);
  if (expected === undefined) {
    assert.equal(present(row.field), false, `Unexpected ${row.field} sent`);
    return;
  }
  assert.equal(
    value(row.field),
    expected,
    `${row.field} on the wire for ${row.provider}/${model}: got ${String(value(row.field))}, want ${expected}`,
  );
}

const KINDS = ["generate", "stream"] as const;

try {
  for (const kind of KINDS) {
    for (const [label, row, model, requested, expected] of [
      ["AIHubMix gpt-4o-mini", ROWS.aihubmix, "gpt-4o-mini", 100_000, 16_384],
      [
        "avian-io deepseek-v3.2 named by alias",
        ROWS.avian,
        "deepseek/deepseek-v3.2",
        100_000,
        65_536,
      ],
      ["AI21 jamba-large", ROWS.ai21, "jamba-large", 100_000, 4_096],
      [
        "AIHubMix under a differently cased model id",
        ROWS.aihubmix,
        "GPT-4O-Mini",
        100_000,
        16_384,
      ],
    ] as const) {
      await test(`${kind}: ${label} is cut to the model's declared output ceiling`, async () => {
        assertWire(
          await drive(kind, row, model, requested),
          row,
          kind,
          model,
          expected,
        );
      });
    }

    for (const [label, row, model, requested, expected] of [
      ["below the ceiling", ROWS.aihubmix, "gpt-4o-mini", 1_000, 1_000],
      ["exactly at the ceiling", ROWS.aihubmix, "gpt-4o-mini", 16_384, 16_384],
      [
        "exactly at a larger ceiling, under an alias",
        ROWS.avian,
        "deepseek/deepseek-v3.2",
        65_536,
        65_536,
      ],
    ] as const) {
      await test(`${kind}: a request ${label} is sent unchanged`, async () => {
        assertWire(
          await drive(kind, row, model, requested),
          row,
          kind,
          model,
          expected,
        );
      });
    }

    await test(`${kind}: no maxTokens sends no budget field (the ceiling is not injected)`, async () => {
      assertWire(
        await drive(kind, ROWS.aihubmix, "gpt-4o-mini"),
        ROWS.aihubmix,
        kind,
        "gpt-4o-mini",
        undefined,
      );
    });

    for (const [label, row, model, requested] of [
      [
        "an unlisted model on avian-io (provider default 65536 is not a ceiling)",
        ROWS.avian,
        "acme/unlisted-model",
        100_000,
      ],
      [
        "charm-hyper kimi-k2-thinking (roster figure 26214 is ctx/10, not recorded)",
        ROWS.charmHyper,
        "kimi-k2-thinking",
        50_000,
      ],
      [
        "charm-hyper gpt-oss-120b (roster figure 13107 is ctx/10, not recorded)",
        ROWS.charmHyper,
        "gpt-oss-120b",
        50_000,
      ],
      [
        "charm-hyper gemma-4-26b-a4b-it (roster figure 25600 is ctx/10, not recorded)",
        ROWS.charmHyper,
        "gemma-4-26b-a4b-it",
        50_000,
      ],
      [
        "charm-hyper minimax-m2.7 (roster figure 6553 is ctx/40, not recorded)",
        ROWS.charmHyper,
        "minimax-m2.7",
        50_000,
      ],
      [
        "groq (catalog default 4096 is a placeholder)",
        ROWS.groq,
        "openai/gpt-oss-120b",
        32_000,
      ],
      [
        "xai (catalog default 4096 is a placeholder)",
        ROWS.xai,
        "grok-4.6",
        32_000,
      ],
      [
        "together-ai (catalog default 4096 is a placeholder)",
        ROWS.togetherAi,
        "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        32_000,
      ],
    ] as const) {
      await test(`${kind}: ${label} stays uncapped`, async () => {
        assertWire(
          await drive(kind, row, model, requested),
          row,
          kind,
          model,
          requested,
        );
      });
    }

    await test(`${kind}: mistral is not capped by its catalog default and sends its explicit 8192`, async () => {
      // mistral is the one catalog provider with a PROVIDER_MAX_TOKENS row.
      // Its catalog lists no per-model ceilings, so this does not show that
      // an explicit row outranks a catalog ceiling; it shows the catalog's
      // 4096 placeholder default is never applied to it.
      assertWire(
        await drive(kind, ROWS.mistral, "mistral-large-latest", 100_000),
        ROWS.mistral,
        kind,
        "mistral-large-latest",
        8_192,
      );
    });

    for (const [row, model] of [
      [ROWS.longcat, "LongCat-2.5-Preview"],
      [ROWS.mimo, "mimo-v2.6-flash"],
      [ROWS.runinfra, "nemotron-3-5-lightning-30b"],
    ] as const) {
      await test(`${kind}: control: ${row.provider} sends an in-range request unchanged as ${row.field}`, async () => {
        assertWire(
          await drive(kind, row, model, 100_000),
          row,
          kind,
          model,
          100_000,
        );
      });
    }

    for (const [row, model, ceiling] of [
      [ROWS.longcat, "LongCat-2.5-Preview", 131_072],
      [ROWS.mimo, "mimo-v2.6-flash", 131_072],
    ] as const) {
      await test(`${kind}: control: an oversized ${row.provider} request never reaches the wire above its ceiling`, async () => {
        const outcome = await drive(kind, row, model, 1_000_000);
        if (outcome.error === undefined) {
          // If the SDK's own 1..128000 validation ever becomes model-aware,
          // the clamp must show on the wire instead.
          assertWire(outcome, row, kind, model, ceiling);
          return;
        }
        assert.match(
          outcome.error,
          /maxTokens must be between 1 and 128000/,
          "The call should be rejected by the SDK's maxTokens range check",
        );
        assert.equal(
          outcome.requests.length,
          0,
          "A rejected call hit the wire",
        );
      });
    }
  }
} finally {
  await new Promise<void>((closed, reject) => {
    server.close((error) => (error ? reject(error) : closed()));
  });
}
await runSuite();

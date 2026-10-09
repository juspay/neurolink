#!/usr/bin/env tsx
import "./helpers/credentialFreeEnv.js";

/**
 * Continuous Test Suite — Bedrock cross-region inference profiles
 *
 * Most current Bedrock models cannot be invoked by their bare model id: the
 * model card's Regional Availability table shows In-Region = No for the
 * model/region pair, and only a geography-prefixed (`us.`/`eu.`/`au.`/`jp.`)
 * or `global.` inference-profile id works. Sending the bare id fails with a
 * ValidationException naming inference profiles.
 *
 * These cases drive the shipped surface — `new NeuroLink().generate({ provider:
 * "bedrock" })` from `../dist/index.js` — against a real local HTTP server
 * standing in for bedrock-runtime, reached via the AWS SDK's documented
 * `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` override. Nothing is stubbed: the request
 * really is signed, sent and routed by the AWS SDK, so the assertions are about
 * the model ids that actually go out on the wire.
 *
 * Run: npx tsx test/continuous-test-suite-bedrock-inference-profile.ts
 *      pnpm run test:bedrock-inference-profile
 */

import { createServer, type Http2Server } from "node:http2";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  startLocalBedrock,
  userTextOnWire,
} from "./helpers/bedrockLocalEndpoint.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Bedrock Inference Profiles", {
  offline: true,
});

const { NeuroLink } = await import("../dist/index.js");

const BARE_MODEL = "anthropic.claude-opus-4-5-20251101-v1:0";

// Resolution is cached per model+region for the life of the process, which is
// the point of it. Cases that need to observe a first-time resolution use
// their own id so they start from an unresolved state.
const UNCACHED_MODEL = "anthropic.claude-sonnet-4-5-20250929-v1:0";
const UNRELATED_MODEL = "anthropic.claude-haiku-4-5-20251001-v1:0";
const CROSS_PATH_MODEL = "anthropic.claude-sonnet-4-6-20260218-v1:0";
const ARN_MODEL =
  "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-opus-4-5-20251101-v1:0";

/** The exact shape bedrock-runtime returns when a profile is required. */
const PROFILE_REQUIRED_BODY = JSON.stringify({
  message:
    "Invocation of model ID anthropic.claude-opus-4-5-20251101-v1:0 with on-demand throughput isn't supported. Retry your request with the ID or ARN of an inference profile that contains this model.",
});

const OK_BODY = JSON.stringify({
  output: { message: { role: "assistant", content: [{ text: "ok" }] } },
  stopReason: "end_turn",
  usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
});

type Recorder = {
  modelIds: string[];
  close: () => Promise<void>;
  port: number;
};

/**
 * Local bedrock-runtime stand-in. `decide` maps the model id taken from the
 * request path to the status it should answer with.
 *
 * Cleartext HTTP/2, because `@aws-sdk/client-bedrock-runtime` defaults to
 * `NodeHttp2Handler` — its event-stream operations need it. An HTTP/1.1
 * server is refused by the client with "Protocol error" before a request is
 * ever sent.
 */
async function startServer(
  decide: (modelId: string) => { status: number; body: string },
): Promise<Recorder> {
  const modelIds: string[] = [];
  const server: Http2Server = createServer();
  server.on("stream", (stream, headers) => {
    // Path shape: /model/{urlencoded modelId}/converse
    const path = String(headers[":path"] ?? "");
    const match = /\/model\/([^/]+)\//.exec(path);
    const modelId = match ? decodeURIComponent(match[1]) : "";
    modelIds.push(modelId);
    const { status, body } = decide(modelId);
    stream.respond({
      ":status": status,
      "content-type": "application/json",
      ...(status === 400 ? { "x-amzn-errortype": "ValidationException" } : {}),
    });
    stream.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    modelIds,
    port,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

/** Point the AWS SDK at the local server with credentials that can sign. */
function withEnv(port: number): () => void {
  const saved: Record<string, string | undefined> = {};
  const set = (k: string, v: string) => {
    saved[k] = process.env[k];
    process.env[k] = v;
  };
  set("AWS_ENDPOINT_URL_BEDROCK_RUNTIME", `http://127.0.0.1:${port}`);
  set("AWS_ACCESS_KEY_ID", "test-fake-aws-key-id");
  set("AWS_SECRET_ACCESS_KEY", "test-fake-aws-secret");
  set("AWS_REGION", "us-east-1");
  saved.AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN;
  delete process.env.AWS_SESSION_TOKEN;
  return () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  };
}

await test("A model needing an inference profile is retried with a region-prefixed id", async () => {
  const server = await startServer((modelId) =>
    modelId.startsWith("us.")
      ? { status: 200, body: OK_BODY }
      : { status: 400, body: PROFILE_REQUIRED_BODY },
  );
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "hi" },
      provider: "bedrock",
      model: BARE_MODEL,
      maxTokens: 8,
    });
    assert(
      typeof result?.content === "string",
      "generate did not return content after the retry",
    );
    assert(
      server.modelIds.length === 2,
      `expected one initial attempt and one retry, saw ${server.modelIds.length} attempts`,
    );
    assert(
      server.modelIds[0] === BARE_MODEL,
      "first attempt did not use the bare model id",
    );
    assert(
      server.modelIds[1] === `us.${BARE_MODEL}`,
      "retry did not use the us-geography inference profile id",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("The resolved profile id is reused, so the failing id is not retried every call", async () => {
  const server = await startServer((modelId) =>
    modelId.startsWith("us.")
      ? { status: 200, body: OK_BODY }
      : { status: 400, body: PROFILE_REQUIRED_BODY },
  );
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    for (let i = 0; i < 2; i++) {
      await nl.generate({
        input: { text: "hi" },
        provider: "bedrock",
        model: UNCACHED_MODEL,
        maxTokens: 8,
      });
    }
    const bareAttempts = server.modelIds.filter(
      (m) => m === UNCACHED_MODEL,
    ).length;
    const profileAttempts = server.modelIds.filter((m) =>
      m.startsWith("us."),
    ).length;
    assert(
      bareAttempts === 1,
      `the unusable id should be attempted once and then remembered, but was attempted ${bareAttempts} times`,
    );
    assert(
      profileAttempts === 2,
      `both calls should reach the model, but only ${profileAttempts} used a working id`,
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("An unrelated validation failure is not retried with a different model id", async () => {
  // Same exception type, different cause. Retrying this would turn one clear
  // error into several confusing ones.
  const unrelated = JSON.stringify({
    message: "Malformed input request: expected type string, found integer.",
  });
  const server = await startServer(() => ({ status: 400, body: unrelated }));
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    let threw = false;
    try {
      await nl.generate({
        input: { text: "hi" },
        provider: "bedrock",
        model: UNRELATED_MODEL,
        maxTokens: 8,
      });
    } catch {
      threw = true;
    }
    assert(threw, "an unrelated validation failure should still surface");
    // The SDK and the caller apply their own retry policies, so the total
    // attempt count is not ours to pin. What must hold is that none of the
    // attempts swapped in a rewritten model id — that behaviour belongs
    // only to the inference-profile path.
    const rewritten = server.modelIds.filter((m) => m !== UNRELATED_MODEL);
    assert(
      rewritten.length === 0,
      `an unrelated failure must not rewrite the model id, but ${rewritten.length} attempt(s) did`,
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("A resolution found by generate is reused by stream", async () => {
  // generate() and stream() are separate send sites. They must key the
  // resolution cache identically, or the second one re-probes an id already
  // known to be unusable — and on a provider where that probe is a billed
  // round trip, does so on every call.
  //
  // This pins the contract, and does not by itself reproduce a divergence:
  // the client is constructed with the same region it later reports, so the
  // two only differ if that lookup throws, which no caller can force. It
  // fails if a future change keys the two paths differently for any reason
  // that IS reachable.
  const server = await startServer((modelId) =>
    modelId.startsWith("us.")
      ? { status: 200, body: OK_BODY }
      : { status: 400, body: PROFILE_REQUIRED_BODY },
  );
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "hi" },
      provider: "bedrock",
      model: CROSS_PATH_MODEL,
      maxTokens: 8,
    });
    const afterGenerate = server.modelIds.length;
    try {
      // The stand-in answers JSON where ConverseStream returns an AWS event
      // stream, so consuming this throws. Irrelevant here: the assertion is
      // about the id that went out, which is recorded before any parsing.
      const streamed = await nl.stream({
        input: { text: "hi" },
        provider: "bedrock",
        model: CROSS_PATH_MODEL,
        maxTokens: 8,
      });
      for await (const _chunk of streamed.stream) {
        void _chunk;
      }
    } catch {
      // Expected — see above.
    }
    const streamAttempts = server.modelIds.slice(afterGenerate);
    assert(
      streamAttempts.length > 0,
      "the streaming path never reached the server, so nothing was verified",
    );
    assert(
      !streamAttempts.includes(CROSS_PATH_MODEL),
      "streaming re-probed the bare id that generate had already resolved",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("A model ARN is never rewritten into a prefixed id", async () => {
  // An ARN names a concrete resource and this provider accepts one as a model
  // id. Prefixing it produces a malformed identifier whose error would then
  // replace the accurate one the caller should have seen.
  const server = await startServer(() => ({
    status: 400,
    body: PROFILE_REQUIRED_BODY,
  }));
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    let threw = false;
    try {
      await nl.generate({
        input: { text: "hi" },
        provider: "bedrock",
        model: ARN_MODEL,
        maxTokens: 8,
      });
    } catch {
      threw = true;
    }
    assert(threw, "the profile-required error should still surface for an ARN");
    assert(
      server.modelIds.length > 0,
      "no request reached the server, so nothing was verified",
    );
    const rewritten = server.modelIds.filter((m) => m !== ARN_MODEL);
    assert(
      rewritten.length === 0,
      `an ARN must not be prefixed, but ${rewritten.length} attempt(s) rewrote it`,
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("An existing in. or us-gov. profile is preserved on both generate and stream errors", async () => {
  // Recognition does not imply support for a model/region pair. This stand-in
  // rejects both supplied IDs; the contract is that their error remains theirs,
  // instead of being replaced by a fabricated us.in.* or global.us-gov.* ID.
  for (const id of [
    "in.anthropic.claude-haiku-4-5-20251001-v1:0",
    "us-gov.anthropic.claude-haiku-4-5-20251001-v1:0",
  ]) {
    const server = await startServer(() => ({
      status: 400,
      body: PROFILE_REQUIRED_BODY,
    }));
    const restore = withEnv(server.port);
    const nl = new NeuroLink();
    try {
      for (const operation of ["generate", "stream"] as const) {
        const before = server.modelIds.length;
        let rejected = false;
        try {
          const options = {
            input: { text: "Keep this profile identity." },
            provider: "bedrock",
            model: id,
            maxTokens: 8,
            disableTools: true,
            disableInternalFallback: true,
          };
          if (operation === "generate") {
            await nl.generate(options);
          } else {
            const streamed = await nl.stream(options);
            for await (const chunk of streamed.stream) {
              void chunk;
            }
          }
        } catch {
          rejected = true;
        }
        const attempts = server.modelIds.slice(before);
        assert(rejected, `${operation}/${id}: expected the validation error`);
        assert(
          attempts.length > 0,
          `${operation}/${id}: no request reached the owned endpoint`,
        );
        assert(
          attempts.every((attempt) => attempt === id),
          `${operation}/${id}: a supplied profile was prefixed again`,
        );
      }
    } finally {
      restore();
      await nl.shutdown();
      await server.close();
    }
  }
});

await test("aws streaming alias and model-bearing ARNs keep their identity while applying the recorded output ceiling", async () => {
  const server = await startLocalBedrock("IDENTIFIER_OK");
  const port = Number(new URL(server.endpoint).port);
  const restore = withEnv(port);
  const nl = new NeuroLink();
  try {
    const nova = "amazon.nova-pro-v1:0";
    const ids = [
      `us.${nova}`,
      `arn:aws:bedrock:us-east-1::foundation-model/${nova}`,
      `arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.${nova}`,
    ];
    for (const model of ids) {
      for (const [requested, expected] of [
        [undefined, 5_000],
        [100_000, 5_000],
        [7, 7],
      ] as const) {
        const before = server.requests.length;
        const result = await nl.stream({
          input: { text: "Check model identity." },
          provider: "aws",
          model,
          ...(requested !== undefined ? { maxTokens: requested } : {}),
          disableTools: true,
          disableInternalFallback: true,
        });
        let text = "";
        for await (const chunk of result.stream) {
          text += "content" in chunk ? (chunk.content ?? "") : "";
        }
        assert(
          text === "IDENTIFIER_OK",
          "stream did not decode the real AWS event framing",
        );
        const requests = server.requests.slice(before);
        assert(
          requests.length > 0,
          "stream made no request to the owned endpoint",
        );
        for (const request of requests) {
          assert(
            request.path.endsWith("/converse-stream"),
            "unexpected operation",
          );
          const modelOnWire = decodeURIComponent(
            /\/model\/([^/]+)\//.exec(request.path)?.[1] ?? "",
          );
          assert(
            modelOnWire === model,
            "metadata lookup rewrote the invocation identity",
          );
          assert(
            userTextOnWire(request.body) === "Check model identity.",
            "the prompt did not reach the server",
          );
          const body = JSON.parse(request.body) as {
            inferenceConfig?: { maxTokens?: number };
          };
          assert(
            body.inferenceConfig?.maxTokens === expected,
            "aws alias or ARN missed the recorded output ceiling",
          );
        }
      }
    }
    // The native generate path intentionally preserves the caller's maxTokens
    // (the previous scoped fix changed stream only). Record that applicability.
    const model = ids[2];
    const before = server.requests.length;
    const generated = await nl.generate({
      input: { text: "Keep generate override." },
      provider: "aws",
      model,
      maxTokens: 7,
      disableTools: true,
      disableInternalFallback: true,
    });
    assert(
      generated?.content === "IDENTIFIER_OK",
      "generate did not complete the round trip",
    );
    const request = server.requests[before];
    assert(!!request, "generate made no request to the owned endpoint");
    assert(
      decodeURIComponent(/\/model\/([^/]+)\//.exec(request.path)?.[1] ?? "") ===
        model,
      "generate rewrote the model ARN",
    );
    const body = JSON.parse(request.body) as {
      inferenceConfig?: { maxTokens?: number };
    };
    assert(
      body.inferenceConfig?.maxTokens === 7,
      "generate lost its explicit override",
    );
  } finally {
    restore();
    await nl.shutdown();
    await server.close();
  }
});

await test("Public context statistics resolve aws model and system-profile ARNs, while opaque application profiles retain fallback", async () => {
  const nl = new NeuroLink({ conversationMemory: { enabled: true } });
  try {
    await nl.setSessionMessages("identifier-budget", [
      { id: "identifier-message", role: "user", content: "A seeded session." },
    ]);
    const nova = "amazon.nova-pro-v1:0";
    for (const [model, expected] of [
      [nova, 236_000],
      [`us.${nova}`, 236_000],
      [`arn:aws:bedrock:us-east-1::foundation-model/${nova}`, 236_000],
      [
        `arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.${nova}`,
        236_000,
      ],
      [
        "arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/opaque123456",
        136_000,
      ],
    ] as const) {
      const stats = await nl.getContextStats("identifier-budget", "aws", model);
      assert(
        stats !== null && stats.messageCount === 1,
        "context stats never read the seeded session",
      );
      assert(
        stats?.availableInputTokens === expected,
        `${model}: wrong public input budget`,
      );
    }
  } finally {
    await nl.shutdown();
  }
});

for (const operation of ["generate", "stream"] as const) {
  await test(`Opaque application profile IDs are preserved by ${operation}`, async () => {
    const id = "opaque123456";
    const server = await startServer(() => ({
      status: 400,
      body: JSON.stringify({
        message: `Invocation of model ID ${id} with on-demand throughput isn't supported. Retry your request with the ID or ARN of an inference profile that contains this model.`,
      }),
    }));
    const restore = withEnv(server.port);
    const nl = new NeuroLink();
    try {
      let rejected = false;
      try {
        const options = {
          input: { text: "Do not infer an opaque profile's model." },
          provider: "bedrock",
          model: id,
          maxTokens: 8,
          disableTools: true,
          disableInternalFallback: true,
        };
        if (operation === "generate") {
          await nl.generate(options);
        } else {
          const result = await nl.stream(options);
          for await (const chunk of result.stream) {
            void chunk;
          }
        }
      } catch {
        rejected = true;
      }
      assert(rejected, "the original validation error did not surface");
      assert(
        server.modelIds.length > 0,
        "no request reached the owned AWS endpoint",
      );
      assert(
        server.modelIds.every((model) => model === id),
        "the retry path guessed a foundation model from an opaque profile ID",
      );
    } finally {
      restore();
      await nl.shutdown();
      await server.close();
    }
  });
}

await test("Published foundation-model ID grammar preserves automatic retry for an unlisted vendor", async () => {
  // This is a legal-shape fixture, not a claim that AWS serves this vendor.
  // An enum whitelist would strand newly supported vendors until an SDK update.
  const id = "newvendor.model-for-prefix-v1:0";
  const server = await startServer((model) =>
    model === `us.${id}`
      ? { status: 200, body: OK_BODY }
      : { status: 400, body: PROFILE_REQUIRED_BODY },
  );
  const restore = withEnv(server.port);
  const nl = new NeuroLink();
  try {
    const result = await nl.generate({
      input: { text: "Preserve valid new vendor identifiers." },
      provider: "bedrock",
      model: id,
      maxTokens: 8,
      disableTools: true,
      disableInternalFallback: true,
    });
    assert(
      result?.content === "ok",
      "the owned profile retry did not complete",
    );
    assert(
      JSON.stringify(server.modelIds) === JSON.stringify([id, `us.${id}`]),
      "a legal new-vendor model was rejected or its retry identity changed",
    );
  } finally {
    restore();
    await nl.shutdown();
    await server.close();
  }
});

await test("Configured model aliases reach their declared model or profile ARN with correct aws limits", async () => {
  const nova = "amazon.nova-pro-v1:0";
  const profile = `arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.${nova}`;
  const server = await startLocalBedrock("ALIAS_OK");
  const restore = withEnv(Number(new URL(server.endpoint).port));
  const nl = new NeuroLink({
    modelAliasConfig: {
      aliases: {
        "friendly-nova": { action: "redirect", target: nova },
        "friendly-profile": { action: "redirect", target: profile },
      },
    },
  });
  try {
    for (const [alias, declared] of [
      ["friendly-nova", nova],
      ["friendly-profile", profile],
    ] as const) {
      const before = server.requests.length;
      const result = await nl.stream({
        input: { text: "Resolve the declared alias." },
        provider: "aws",
        model: alias,
        maxTokens: 100_000,
        disableTools: true,
        disableInternalFallback: true,
      });
      let text = "";
      for await (const chunk of result.stream) {
        text += "content" in chunk ? (chunk.content ?? "") : "";
      }
      assert(
        text === "ALIAS_OK",
        "configured alias never completed the real wire round trip",
      );
      const requests = server.requests.slice(before);
      assert(requests.length > 0, "configured alias made no owned AWS request");
      for (const request of requests) {
        assert(
          decodeURIComponent(
            /\/model\/([^/]+)\//.exec(request.path)?.[1] ?? "",
          ) === declared,
          "alias routing did not reach its configured canonical identity",
        );
        const body = JSON.parse(request.body) as {
          inferenceConfig?: { maxTokens?: number };
        };
        assert(
          body.inferenceConfig?.maxTokens === 5_000,
          "alias routing lost the declared model's recorded output ceiling",
        );
      }
    }
  } finally {
    restore();
    await nl.shutdown();
    await server.close();
  }
});

await test("Built-in nova-pro aws-balanced and aws-flagship aliases use canonical wire IDs and their recorded stream defaults and ceilings", async () => {
  // These aliases are resolved by ProviderFactory itself, without host alias
  // configuration. Source: MODEL_REGISTRY and bedrockManifest aliases.
  const server = await startLocalBedrock("BUILT_IN_ALIAS_OK");
  const restore = withEnv(Number(new URL(server.endpoint).port));
  const nl = new NeuroLink();
  try {
    for (const [alias, canonical, ceiling] of [
      ["nova-pro", "amazon.nova-pro-v1:0", 5_000],
      ["NOVA-PRO", "amazon.nova-pro-v1:0", 5_000],
      ["aws-balanced", "amazon.nova-pro-v1:0", 5_000],
      ["aws-flagship", "amazon.nova-premier-v1:0", 25_000],
    ] as const) {
      for (const [requested, expected] of [
        [undefined, ceiling],
        [100_000, ceiling],
        [7, 7],
      ] as const) {
        const before = server.requests.length;
        const result = await nl.stream({
          input: { text: "Use the existing factory alias." },
          provider: "aws",
          model: alias,
          ...(requested !== undefined ? { maxTokens: requested } : {}),
          disableTools: true,
          disableInternalFallback: true,
        });
        let text = "";
        for await (const chunk of result.stream) {
          text += "content" in chunk ? (chunk.content ?? "") : "";
        }
        assert(
          text === "BUILT_IN_ALIAS_OK",
          "built-in alias did not complete the real event-stream round trip",
        );
        const requests = server.requests.slice(before);
        assert(
          requests.length > 0,
          "no native request reached the owned alias endpoint",
        );
        for (const request of requests) {
          assert(
            decodeURIComponent(
              /\/model\/([^/]+)\//.exec(request.path)?.[1] ?? "",
            ) === canonical,
            "the built-in alias is not an executable canonical factory identity",
          );
          const body = JSON.parse(request.body) as {
            inferenceConfig?: { maxTokens?: number };
          };
          assert(
            body.inferenceConfig?.maxTokens === expected,
            `${alias}: canonical routing silently missed its recorded stream default or ceiling`,
          );
        }
      }
      // Generation shares executable alias routing while preserving its
      // established caller-owned maxTokens behavior (no native clamp added).
      for (const requested of [7, 100_000]) {
        const before = server.requests.length;
        const result = await nl.generate({
          input: { text: "Keep generate's explicit alias override." },
          provider: "aws",
          model: alias,
          maxTokens: requested,
          disableTools: true,
          disableInternalFallback: true,
        });
        assert(
          result?.content === "BUILT_IN_ALIAS_OK",
          "generate alias did not complete its owned round trip",
        );
        const request = server.requests[before];
        assert(!!request, "generate alias made no native request");
        assert(
          decodeURIComponent(
            /\/model\/([^/]+)\//.exec(request.path)?.[1] ?? "",
          ) === canonical,
          "generate did not route its built-in alias to the canonical model",
        );
        const body = JSON.parse(request.body) as {
          inferenceConfig?: { maxTokens?: number };
        };
        assert(
          body.inferenceConfig?.maxTokens === requested,
          "generate's established explicit override changed during alias repair",
        );
      }
    }
  } finally {
    restore();
    await nl.shutdown();
    await server.close();
  }
});

await runSuite();

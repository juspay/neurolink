#!/usr/bin/env tsx

/**
 * Continuous Test Suite — one embedding per input, or an error.
 *
 * OpenAI, Ollama and LiteLLM read an OpenAI-shaped `/embeddings` response and
 * used to drop every entry that came back without an embedding, returning the
 * rest with no count check. A missing vector in the middle of a batch moved
 * every later vector up one place, so callers paired texts with the wrong
 * vectors and nothing said so. Bedrock accepted an empty vector, which
 * similarity scoring then read as a zero. These cases pin the rejection the
 * AI Studio client already had (#1927): a missing or empty embedding, or a
 * response whose count differs from the input count, is an error naming the
 * input's index and the provider.
 *
 * Everything drives the shipped surface: `ProviderFactory` and
 * `ProviderRegistry` from `../dist/index.js`, against local stand-ins reached
 * through the public `credentials.<provider>.baseURL` (and, for Bedrock, the
 * AWS SDK's documented `AWS_ENDPOINT_URL_BEDROCK_RUNTIME`). No rule-15
 * exception: nothing is imported from `src/` and nothing is stubbed.
 *
 * Run: npx tsx test/continuous-test-suite-embedding-integrity.ts
 *      pnpm run test:embedding-integrity
 */

import { createServer, type Server } from "node:http";
import { createServer as createH2Server } from "node:http2";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite("Embedding integrity", {
  offline: true,
});

const { ProviderFactory, ProviderRegistry } = await import("../dist/index.js");

const TOUCHED_ENV_VARS = [
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OLLAMA_BASE_URL",
  "OLLAMA_API_KEY",
  "OLLAMA_EMBEDDING_MODEL",
  "LITELLM_API_KEY",
  "LITELLM_BASE_URL",
  "LITELLM_EMBEDDING_MODEL",
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "ALL_PROXY",
  "all_proxy",
  "NO_PROXY",
  "no_proxy",
  "AWS_ENDPOINT_URL",
  "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "AWS_REGION",
] as const;

async function withCleanEnv<T>(
  run: () => Promise<T>,
  set: Record<string, string> = {},
): Promise<T> {
  const saved = new Map<string, string | undefined>(
    [...TOUCHED_ENV_VARS, ...Object.keys(set)].map((name) => [
      name,
      process.env[name],
    ]),
  );
  TOUCHED_ENV_VARS.forEach((name) => {
    delete process.env[name];
  });
  Object.entries(set).forEach(([name, value]) => {
    process.env[name] = value;
  });
  try {
    return await run();
  } finally {
    saved.forEach((value, name) => {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    });
  }
}

/** How the stand-in damages the reply for one input text. */
type Damage =
  | { text: string; as: "missing" | "empty" | "dropped" }
  | { as: "extra" };

/**
 * An OpenAI-shaped `/embeddings` endpoint: one `{index, embedding}` entry per
 * input, the first character's code as the vector. `damage` removes the
 * embedding of one input, empties it, drops that input's entry altogether, or
 * appends an entry no input asked for.
 */
async function startEmbeddingsStandIn(damage?: Damage): Promise<{
  baseURL: string;
  requests: number;
  close: () => Promise<void>;
}> {
  let requests = 0;
  const server: Server = createServer((req, res) => {
    requests++;
    const parts: Buffer[] = [];
    req.on("data", (chunk: Buffer) => parts.push(chunk));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(parts).toString("utf8") || "{}");
      const inputs: string[] = Array.isArray(body.input)
        ? body.input
        : [String(body.input ?? "")];
      const data: Array<Record<string, unknown>> = [];
      inputs.forEach((text, index) => {
        const vector = [text.charCodeAt(0)];
        if (damage && "text" in damage && damage.text === text) {
          if (damage.as === "missing") {
            data.push({ object: "embedding", index });
          } else if (damage.as === "empty") {
            data.push({ object: "embedding", index, embedding: [] });
          }
          return;
        }
        data.push({ object: "embedding", index, embedding: vector });
      });
      if (damage?.as === "extra") {
        data.push({
          object: "embedding",
          index: inputs.length,
          embedding: [1],
        });
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ object: "list", data }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    get requests() {
      return requests;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

type EmbeddingProvider = {
  embed?: (text: string, model?: string) => Promise<number[]>;
  embedMany?: (texts: string[], model?: string) => Promise<number[][]>;
};

const OPENAI_SHAPED = [
  {
    provider: "openai",
    label: "OpenAI",
    model: "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
    credentials: (baseURL: string) => ({ openai: { apiKey: "k", baseURL } }),
  },
  {
    provider: "ollama",
    label: "Ollama",
    model: "llama3.2",
    embeddingModel: "nomic-embed-text",
    credentials: (baseURL: string) => ({ ollama: { baseURL } }),
  },
  {
    provider: "litellm",
    label: "LiteLLM",
    model: "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
    credentials: (baseURL: string) => ({ litellm: { apiKey: "k", baseURL } }),
  },
] as const;

type OpenAIShaped = (typeof OPENAI_SHAPED)[number];

async function providerFor(
  entry: OpenAIShaped,
  baseURL: string,
): Promise<EmbeddingProvider> {
  await ProviderRegistry.registerAllProviders();
  return (await ProviderFactory.createProvider(
    entry.provider,
    entry.model,
    undefined,
    undefined,
    entry.credentials(baseURL),
  )) as EmbeddingProvider;
}

/** Runs `call` and returns its value or the message it rejected with. */
async function outcome<T>(
  call: () => Promise<T> | undefined,
): Promise<{ value: T | undefined; message: string | undefined }> {
  try {
    return { value: await call(), message: undefined };
  } catch (error) {
    return {
      value: undefined,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

for (const entry of OPENAI_SHAPED) {
  section(`${entry.label}: one embedding per input`);

  for (const shape of ["missing", "empty"] as const) {
    await test(`${entry.label} embedMany rejects an embedding that is ${shape} and names its index`, async () => {
      await withCleanEnv(async () => {
        const standIn = await startEmbeddingsStandIn({ text: "b", as: shape });
        try {
          const provider = await providerFor(entry, standIn.baseURL);
          const { value, message } = await outcome(() =>
            provider.embedMany?.(["a", "b", "c"], entry.embeddingModel),
          );
          assert(
            standIn.requests > 0,
            "precondition: the stand-in was not called",
          );
          assert(
            value === undefined,
            "embedMany returned vectors although one input had no embedding",
          );
          assert(
            /\bindex 1\b/.test(message ?? ""),
            "the rejection did not name the index of the input without an embedding",
          );
          assert(
            (message ?? "").includes(entry.provider),
            "the rejection did not name the provider",
          );
        } finally {
          await standIn.close();
        }
      });
    });
  }

  await test(`${entry.label} embedMany rejects a response with an entry missing, instead of shifting the rest`, async () => {
    await withCleanEnv(async () => {
      const standIn = await startEmbeddingsStandIn({
        text: "b",
        as: "dropped",
      });
      try {
        const provider = await providerFor(entry, standIn.baseURL);
        const { value, message } = await outcome(() =>
          provider.embedMany?.(["a", "b", "c"], entry.embeddingModel),
        );
        assert(
          standIn.requests > 0,
          "precondition: the stand-in was not called",
        );
        assert(
          value === undefined,
          "embedMany returned fewer vectors than inputs without an error",
        );
        assert(
          /2 vectors for 3 texts/.test(message ?? ""),
          "the rejection did not state the count mismatch",
        );
      } finally {
        await standIn.close();
      }
    });
  });

  await test(`${entry.label} embedMany rejects a response with more entries than inputs`, async () => {
    await withCleanEnv(async () => {
      const standIn = await startEmbeddingsStandIn({ as: "extra" });
      try {
        const provider = await providerFor(entry, standIn.baseURL);
        const { value } = await outcome(() =>
          provider.embedMany?.(["a", "b"], entry.embeddingModel),
        );
        assert(
          standIn.requests > 0,
          "precondition: the stand-in was not called",
        );
        assert(
          value === undefined,
          "embedMany returned more vectors than inputs without an error",
        );
      } finally {
        await standIn.close();
      }
    });
  });

  await test(`${entry.label} embed rejects an empty embedding`, async () => {
    await withCleanEnv(async () => {
      const standIn = await startEmbeddingsStandIn({ text: "b", as: "empty" });
      try {
        const provider = await providerFor(entry, standIn.baseURL);
        const { value, message } = await outcome(() =>
          provider.embed?.("b", entry.embeddingModel),
        );
        assert(
          standIn.requests > 0,
          "precondition: the stand-in was not called",
        );
        assert(
          value === undefined && message !== undefined,
          "embed returned an empty vector instead of rejecting it",
        );
      } finally {
        await standIn.close();
      }
    });
  });

  await test(`${entry.label} embedMany still returns every vector, in input order, for a healthy response`, async () => {
    await withCleanEnv(async () => {
      const standIn = await startEmbeddingsStandIn();
      try {
        const provider = await providerFor(entry, standIn.baseURL);
        const { value } = await outcome(() =>
          provider.embedMany?.(["a", "b", "c"], entry.embeddingModel),
        );
        assert(
          (value ?? []).map((v) => v[0]).join(",") === "97,98,99",
          "embedMany did not return one vector per input in input order",
        );
      } finally {
        await standIn.close();
      }
    });
  });
}

section("OpenAI: the index in the rejection survives error formatting");

await test("OpenAI embedMany keeps the real index for an index that looks like a status code", async () => {
  await withCleanEnv(async () => {
    const texts = Array.from({ length: 430 }, (_, i) => `t${i}`);
    const standIn = await startEmbeddingsStandIn({ text: "t429", as: "empty" });
    try {
      const provider = await providerFor(OPENAI_SHAPED[0], standIn.baseURL);
      const { value, message } = await outcome(() =>
        provider.embedMany?.(texts, "text-embedding-3-small"),
      );
      assert(
        value === undefined && message !== undefined,
        "embedMany did not reject an empty embedding in a large batch",
      );
      assert(
        /\bindex 429\b/.test(message ?? ""),
        "the rejection lost the index when it resembled a status code",
      );
      assert(
        !/rate limit/i.test(message ?? ""),
        "the rejection was reworded as a rate-limit error",
      );
    } finally {
      await standIn.close();
    }
  });
});

section("Bedrock: an empty embedding is an error");

/**
 * Bedrock InvokeModel over cleartext HTTP/2, which is what the SDK's default
 * Bedrock transport speaks. Answers every invocation with `embedding`.
 */
async function startBedrockInvokeStandIn(embedding: number[]): Promise<{
  endpoint: string;
  requests: number;
  close: () => Promise<void>;
}> {
  let requests = 0;
  const server = createH2Server();
  server.on("stream", (stream, headers) => {
    const path = String(headers[":path"] ?? "");
    stream.on("data", () => undefined);
    stream.on("end", () => {
      if (path.endsWith("/invoke")) {
        requests++;
      }
      stream.respond({ ":status": 200, "content-type": "application/json" });
      stream.end(JSON.stringify({ embedding, inputTextTokenCount: 1 }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    endpoint: `http://127.0.0.1:${port}`,
    get requests() {
      return requests;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function bedrockEmbed(
  endpoint: string,
  call: (provider: EmbeddingProvider) => Promise<unknown> | undefined,
): Promise<{ value: unknown; message: string | undefined }> {
  return withCleanEnv(
    async () => {
      await ProviderRegistry.registerAllProviders();
      const provider = (await ProviderFactory.createProvider(
        "bedrock",
        "anthropic.claude-sonnet-4-6",
        undefined,
        undefined,
        {
          bedrock: {
            accessKeyId: "test-fake-aws-key-id",
            secretAccessKey: "test-fake-aws-secret",
            region: "us-east-1",
          },
        },
      )) as EmbeddingProvider;
      return outcome(() => call(provider));
    },
    { AWS_ENDPOINT_URL_BEDROCK_RUNTIME: endpoint },
  );
}

await test("Bedrock embed rejects an empty embedding", async () => {
  const standIn = await startBedrockInvokeStandIn([]);
  try {
    const { value, message } = await bedrockEmbed(standIn.endpoint, (p) =>
      p.embed?.("hello", "amazon.titan-embed-text-v2:0"),
    );
    assert(standIn.requests > 0, "precondition: the stand-in was not called");
    assert(
      value === undefined && message !== undefined,
      "embed returned an empty vector instead of rejecting it",
    );
  } finally {
    await standIn.close();
  }
});

await test("Bedrock embedMany rejects a batch in which one embedding is empty", async () => {
  const standIn = await startBedrockInvokeStandIn([]);
  try {
    const { value } = await bedrockEmbed(standIn.endpoint, (p) =>
      p.embedMany?.(["a", "b"], "amazon.titan-embed-text-v2:0"),
    );
    assert(standIn.requests > 0, "precondition: the stand-in was not called");
    assert(
      value === undefined,
      "embedMany returned empty vectors instead of rejecting them",
    );
  } finally {
    await standIn.close();
  }
});

await test("Bedrock embed still returns a healthy embedding", async () => {
  const standIn = await startBedrockInvokeStandIn([0.25, 0.5]);
  try {
    const { value } = await bedrockEmbed(standIn.endpoint, (p) =>
      p.embed?.("hello", "amazon.titan-embed-text-v2:0"),
    );
    assert(
      JSON.stringify(value) === JSON.stringify([0.25, 0.5]),
      "embed did not return the healthy embedding",
    );
  } finally {
    await standIn.close();
  }
});

await runSuite();

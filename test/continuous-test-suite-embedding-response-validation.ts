#!/usr/bin/env tsx
/**
 * Public provider embed/embedMany boundaries against an owned HTTP endpoint.
 * No source imports: malformed native responses, ordering and batch failures
 * are exercised through the package's built factory exports.
 */
import "./helpers/credentialFreeEnv.js";
import { createServer } from "node:http";
import {
  ProviderFactory,
  ProviderRegistry,
  ProviderError,
} from "../dist/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();
const { test, runSuite } = defineSuite("Embedding response validation", {
  offline: true,
});
const providers = ["cohere", "voyage", "jina"] as const;
const vector = [0, -1.25, 2.5];
let respond: (inputs: string[], requestNumber: number) => unknown;
let requests: string[][] = [];
const server = createServer(async (req, res) => {
  const parts: Buffer[] = [];
  for await (const part of req) {
    parts.push(Buffer.from(part));
  }
  const body = JSON.parse(Buffer.concat(parts).toString()) as {
    texts?: string[];
    input?: string[];
  };
  const inputs = body.texts ?? body.input ?? [];
  requests.push(inputs);
  res.writeHead(200, { "Content-Type": "application/json" });
  const response = respond(inputs, requests.length);
  res.end(typeof response === "string" ? response : JSON.stringify(response));
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (address === null || typeof address !== "object") {
  throw new Error("owned embedding endpoint did not listen");
}
const baseURL = `http://127.0.0.1:${address.port}`;
process.env.NEUROLINK_SKIP_MCP = "true";
process.env.AWS_EC2_METADATA_DISABLED = "true";
await ProviderRegistry.registerAllProviders();

function responseFor(provider: string, vectors: unknown[]): unknown {
  return provider === "cohere"
    ? { embeddings: { float: vectors } }
    : { data: vectors.map((embedding, index) => ({ embedding, index })) };
}

async function expectRejection(
  provider: (typeof providers)[number],
  call: () => Promise<unknown>,
): Promise<void> {
  let caught: unknown;
  try {
    await call();
  } catch (error) {
    caught = error;
  }
  assert(
    requests.length > 0,
    "embedding call never reached the owned endpoint",
  );
  if (!(caught instanceof Error)) {
    throw new Error("malformed embedding response was accepted");
  }
  if (provider === "jina") {
    assertEqual(
      caught.constructor,
      Error,
      "Jina changed its validation error type",
    );
  } else {
    if (!(caught instanceof ProviderError)) {
      throw new Error("typed provider error was lost");
    }
    assertEqual(caught.provider, provider, "provider error identity changed");
  }
}

try {
  for (const name of providers) {
    const provider = await ProviderFactory.createProvider(
      name,
      undefined,
      undefined,
      undefined,
      { [name]: { apiKey: "embedding-proof-fake-key", baseURL } },
    );
    assert(
      typeof provider.embed === "function" &&
        typeof provider.embedMany === "function",
      "provider lacks embedding exports",
    );

    await test(`${name}: empty input batch makes no request`, async () => {
      requests = [];
      const result = await provider.embedMany!([]);
      assertEqual(result.length, 0, "empty input batch returned vectors");
      assertEqual(
        requests.length,
        0,
        "empty input batch contacted the endpoint",
      );
    });
    await test(`${name}: valid single vector preserves every value`, async () => {
      requests = [];
      respond = () => responseFor(name, [vector]);
      const result = await provider.embed!("single");
      assertEqual(
        JSON.stringify(result),
        JSON.stringify(vector),
        "valid vector changed",
      );
      assertEqual(requests.length, 1, "single embed request count changed");
    });
    await test(`${name}: valid batch preserves input order`, async () => {
      requests = [];
      respond = (inputs) => {
        const result = responseFor(
          name,
          inputs.map((_, index) => [index + 1]),
        );
        if (name !== "cohere") {
          (result as { data: unknown[] }).data.reverse();
        }
        return result;
      };
      const result = await provider.embedMany!(["a", "b", "c"]);
      assertEqual(
        JSON.stringify(result),
        "[[1],[2],[3]]",
        "batch vector order changed",
      );
    });
    if (name === "cohere") {
      await test("cohere: legacy flat vector envelope remains supported", async () => {
        requests = [];
        respond = () => ({ embeddings: [vector] });
        const result = await provider.embed!("single");
        assertEqual(
          JSON.stringify(result),
          JSON.stringify(vector),
          "legacy envelope changed",
        );
      });
    }
    for (const invalid of [
      [],
      null,
      "invalid",
      ["invalid"],
      [null],
      [true],
      {},
    ]) {
      for (const operation of ["single", "batch"] as const) {
        await test(`${name}: rejects malformed vector ${JSON.stringify(invalid)} in ${operation}`, async () => {
          requests = [];
          respond = () =>
            responseFor(
              name,
              operation === "single" ? [invalid] : [vector, invalid],
            );
          await expectRejection(name, () =>
            operation === "single"
              ? provider.embed!("single")
              : provider.embedMany!(["a", "b"]),
          );
        });
      }
    }
    await test(`${name}: short response rejects the whole input batch`, async () => {
      requests = [];
      respond = () => responseFor(name, [vector]);
      await expectRejection(name, () => provider.embedMany!(["a", "b"]));
    });
    await test(`${name}: rejects a JSON number that overflows to infinity`, async () => {
      requests = [];
      respond = () =>
        name === "cohere"
          ? '{"embeddings":{"float":[[1e309]]}}'
          : '{"data":[{"index":0,"embedding":[1e309]}]}';
      await expectRejection(name, () => provider.embed!("overflow"));
    });
    if (name !== "cohere") {
      for (const indices of [
        [0, 0],
        [0, 2],
        [-1, 0],
        [0, 0.5],
      ]) {
        await test(`${name}: rejects invalid index coverage ${indices.join(",")}`, async () => {
          requests = [];
          respond = () => ({
            data: indices.map((index) => ({ index, embedding: vector })),
          });
          await expectRejection(name, () => provider.embedMany!(["a", "b"]));
        });
      }
    }
    if (name !== "jina") {
      const cap = name === "cohere" ? 96 : 128;
      const texts = Array.from(
        { length: cap + 1 },
        (_, index) => `text-${index}`,
      );
      await test(`${name}: preserves ordered vectors across the batch limit`, async () => {
        requests = [];
        respond = (inputs) =>
          responseFor(
            name,
            inputs.map((text) => [Number(text.slice(5))]),
          );
        const result = await provider.embedMany!(texts);
        assertEqual(
          JSON.stringify(result),
          JSON.stringify(texts.map((_, index) => [index])),
          "cross-batch vectors changed",
        );
        assertEqual(
          JSON.stringify(requests.map((batch) => batch.length)),
          JSON.stringify([cap, 1]),
          "provider batch boundary changed",
        );
      });
      await test(`${name}: malformed final batch rejects instead of returning partial vectors`, async () => {
        requests = [];
        respond = (inputs, number) =>
          responseFor(
            name,
            inputs.map(() => (number === 1 ? vector : [])),
          );
        await expectRejection(name, () => provider.embedMany!(texts));
        assertEqual(requests.length, 2, "final batch was never reached");
      });
    }
  }
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
await runSuite();

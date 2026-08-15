#!/usr/bin/env tsx
/**
 * Continuous Test Suite for ChromaVectorStore
 *
 * Exercises `ChromaVectorStore` (src/lib/rag/stores/chroma.ts) against a
 * hand-written recording mock client implementing `ChromaClientLike` /
 * `ChromaCollectionLike` — no network calls, no `chromadb` dependency.
 *
 * Covers:
 * - upsert -> collection.upsert payload shape (ids/embeddings/metadatas),
 *   metadata primitive pass-through, non-primitive JSON-stringify, dropped
 *   `undefined` values, empty-items no-op.
 * - query -> nResults (topK, default 10), includeVectors gating the
 *   "embeddings" include field and the returned `vector`, distance->score
 *   conversion for all three distance metrics, `text` pulled from
 *   `metadata.text`.
 * - MetadataFilter -> Chroma `where` translation: direct equality,
 *   comparison operators, $in/$nin, $and/$or, multiple top-level fields
 *   combined via $and, array-value / empty-ops-bag no-op (field omitted),
 *   and clear errors for $not/$nor/$exists/$contains/$regex/$size.
 * - delete -> ids forwarded, empty-ids no-op.
 * - indexName -> collection caching (single getOrCreateCollection call per
 *   indexName across multiple operations).
 *
 * Run with: npx tsx test/continuous-test-suite-vector-chroma.ts
 */
import "dotenv/config";

import { ChromaVectorStore } from "../dist/index.js";
// `translateMetadataFilter` is not exported from the package. It is imported
// here under the determinism exception to CLAUDE.md rule 15: filter-dialect
// translation is pure, table-driven logic, and a live `generate()` cannot be
// made to emit the specific filter shapes that need covering.
import { translateMetadataFilter } from "../src/lib/rag/stores/chroma.js";
import type {
  ChromaClientLike,
  ChromaCollectionLike,
  ChromaDeleteParams,
  ChromaQueryParams,
  ChromaQueryResponse,
  ChromaUpsertParams,
  MetadataFilter,
} from "../src/lib/types/index.js";
import {
  assert,
  assertEqual,
  assertNotNull,
  defineSuite,
} from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Vector Store: Chroma");

// ---------------------------------------------------------------------------
// Recording mock client
// ---------------------------------------------------------------------------

class RecordingCollection implements ChromaCollectionLike {
  upsertCalls: ChromaUpsertParams[] = [];
  queryCalls: ChromaQueryParams[] = [];
  deleteCalls: ChromaDeleteParams[] = [];
  /** Canned response returned by the next (and subsequent) query() calls. */
  nextResponse: ChromaQueryResponse = { ids: [[]] };

  async upsert(params: ChromaUpsertParams): Promise<void> {
    this.upsertCalls.push(params);
  }

  async query(params: ChromaQueryParams): Promise<ChromaQueryResponse> {
    this.queryCalls.push(params);
    return this.nextResponse;
  }

  async delete(params: ChromaDeleteParams): Promise<void> {
    this.deleteCalls.push(params);
  }
}

class RecordingClient implements ChromaClientLike {
  collections = new Map<string, RecordingCollection>();
  getOrCreateCalls: string[] = [];

  async getOrCreateCollection(params: {
    name: string;
  }): Promise<ChromaCollectionLike> {
    this.getOrCreateCalls.push(params.name);
    let collection = this.collections.get(params.name);
    if (!collection) {
      collection = new RecordingCollection();
      this.collections.set(params.name, collection);
    }
    return collection;
  }
}

await runSuite(async () => {
  // ---------------------------------------------------------------------
  // upsert
  // ---------------------------------------------------------------------

  await test("upsert sends ids/embeddings/metadatas to the collection", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);

    await store.upsert("docs", [
      { id: "a", vector: [1, 0, 0], metadata: { text: "hello", page: 1 } },
      { id: "b", vector: [0, 1, 0] },
    ]);

    assertEqual(
      client.getOrCreateCalls.length,
      1,
      "expected a single getOrCreateCollection call",
    );
    assertEqual(client.getOrCreateCalls[0], "docs");

    const collection = client.collections.get("docs");
    assertNotNull(collection);
    assertEqual(collection.upsertCalls.length, 1);
    const call = collection.upsertCalls[0];
    assertEqual(call.ids.length, 2);
    assert(
      call.ids[0] === "a" && call.ids[1] === "b",
      "ids forwarded in order",
    );
    assertNotNull(call.embeddings);
    assert(
      call.embeddings![0][0] === 1 && call.embeddings![0][1] === 0,
      "embeddings forwarded verbatim",
    );
    assertNotNull(call.metadatas);
    assertEqual(call.metadatas![0]?.text, "hello");
    assertEqual(call.metadatas![0]?.page, 1);
    // item "b" had no metadata -> defaults to {} (mirrors InMemoryVectorStore)
    assertEqual(Object.keys(call.metadatas![1] ?? {}).length, 0);
  });

  await test("upsert JSON-stringifies non-primitive metadata values and drops undefined", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    await store.upsert("docs", [
      {
        id: "a",
        vector: [1, 0],
        metadata: {
          tags: ["x", "y"],
          nested: { k: 1 },
          isNull: null,
          count: 3,
          label: "ok",
          skip: undefined,
        },
      },
    ]);
    const collection = client.collections.get("docs");
    assertNotNull(collection);
    const metadata = collection.upsertCalls[0].metadatas![0]!;
    assertEqual(metadata.tags, JSON.stringify(["x", "y"]));
    assertEqual(metadata.nested, JSON.stringify({ k: 1 }));
    assertEqual(metadata.isNull, JSON.stringify(null));
    assertEqual(metadata.count, 3);
    assertEqual(metadata.label, "ok");
    assert(!("skip" in metadata), "undefined metadata values must be dropped");
  });

  await test("upsert with empty items is a no-op (no client calls)", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    await store.upsert("docs", []);
    assertEqual(client.getOrCreateCalls.length, 0);
  });

  // ---------------------------------------------------------------------
  // query: topK / includeVectors / text extraction
  // ---------------------------------------------------------------------

  await test("query defaults nResults to 10 and omits the embeddings include", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    await store.query({ indexName: "docs", queryVector: [1, 0] });

    const collection = client.collections.get("docs");
    assertNotNull(collection);
    const call = collection.queryCalls[0];
    assertEqual(call.nResults, 10);
    assert(
      !(call.include ?? []).includes("embeddings"),
      "embeddings should not be requested when includeVectors is false",
    );
  });

  await test("query forwards an explicit topK as nResults", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    await store.query({ indexName: "docs", queryVector: [1, 0], topK: 3 });
    const collection = client.collections.get("docs");
    assertNotNull(collection);
    assertEqual(collection.queryCalls[0].nResults, 3);
  });

  await test("includeVectors=true requests embeddings and returns vector; false omits it", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    const collection = (await client.getOrCreateCollection({
      name: "docs",
    })) as RecordingCollection;
    collection.nextResponse = {
      ids: [["a"]],
      metadatas: [[{ text: "hi" }]],
      distances: [[0]],
      embeddings: [[[1, 2, 3]]],
    };

    const withVectors = await store.query({
      indexName: "docs",
      queryVector: [1, 0, 0],
      includeVectors: true,
    });
    assertEqual(withVectors.length, 1);
    assert(
      "vector" in withVectors[0],
      "vector key must be present when includeVectors=true",
    );
    assertEqual(withVectors[0].vector?.[0], 1);
    const includeArg = collection.queryCalls.at(-1)?.include ?? [];
    assert(includeArg.includes("embeddings"), "embeddings include requested");

    const withoutVectors = await store.query({
      indexName: "docs",
      queryVector: [1, 0, 0],
      includeVectors: false,
    });
    assert(
      !("vector" in withoutVectors[0]),
      "vector key must be absent when includeVectors=false",
    );
  });

  await test("query pulls text from metadata.text like InMemoryVectorStore", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    const collection = (await client.getOrCreateCollection({
      name: "docs",
    })) as RecordingCollection;
    collection.nextResponse = {
      ids: [["a", "b"]],
      metadatas: [[{ text: "hello world" }, { page: 2 }]],
      distances: [[0, 0.5]],
    };

    const results = await store.query({
      indexName: "docs",
      queryVector: [1, 0],
    });
    assertEqual(results[0].text, "hello world");
    assertEqual(results[1].text, undefined);
    assertEqual(results[1].metadata?.page, 2);
  });

  // ---------------------------------------------------------------------
  // distance -> score conversion
  // ---------------------------------------------------------------------

  await test("cosine metric: score = 1 - distance (default)", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client); // default distanceMetric "cosine"
    const collection = (await client.getOrCreateCollection({
      name: "docs",
    })) as RecordingCollection;
    collection.nextResponse = { ids: [["a"]], distances: [[0.2]] };

    const [result] = await store.query({
      indexName: "docs",
      queryVector: [1, 0],
    });
    assert(
      Math.abs((result.score ?? NaN) - 0.8) < 1e-9,
      `expected score ~0.8, got ${result.score}`,
    );
  });

  await test("ip metric: score = 1 - distance (raw dot product)", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client, { distanceMetric: "ip" });
    const collection = (await client.getOrCreateCollection({
      name: "docs",
    })) as RecordingCollection;
    collection.nextResponse = { ids: [["a"]], distances: [[-0.5]] };

    const [result] = await store.query({
      indexName: "docs",
      queryVector: [1, 0],
    });
    assert(
      Math.abs((result.score ?? NaN) - 1.5) < 1e-9,
      `expected score ~1.5, got ${result.score}`,
    );
  });

  await test("l2 metric: score = 1 / (1 + distance)", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client, { distanceMetric: "l2" });
    const collection = (await client.getOrCreateCollection({
      name: "docs",
    })) as RecordingCollection;
    collection.nextResponse = { ids: [["a"]], distances: [[3]] };

    const [result] = await store.query({
      indexName: "docs",
      queryVector: [1, 0],
    });
    assert(
      Math.abs((result.score ?? NaN) - 0.25) < 1e-9,
      `expected score ~0.25, got ${result.score}`,
    );
  });

  await test("missing distance yields undefined score, not NaN/0", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    const collection = (await client.getOrCreateCollection({
      name: "docs",
    })) as RecordingCollection;
    collection.nextResponse = { ids: [["a"]], metadatas: [[{}]] };

    const [result] = await store.query({
      indexName: "docs",
      queryVector: [1, 0],
    });
    assertEqual(result.score, undefined);
  });

  // ---------------------------------------------------------------------
  // MetadataFilter -> Chroma where translation
  // ---------------------------------------------------------------------

  await test("direct equality translates to {field: {$eq: value}}", async () => {
    const where = translateMetadataFilter({ category: "docs" });
    assertEqual(
      JSON.stringify(where),
      JSON.stringify({ category: { $eq: "docs" } }),
    );
  });

  await test("comparison operators pass through 1:1", async () => {
    const where = translateMetadataFilter({ page: { $gte: 2, $lt: 10 } });
    assertEqual(
      JSON.stringify(where),
      JSON.stringify({ page: { $gte: 2, $lt: 10 } }),
    );
  });

  await test("$in / $nin pass through", async () => {
    const where = translateMetadataFilter({ tag: { $in: ["a", "b"] } });
    assertEqual(
      JSON.stringify(where),
      JSON.stringify({ tag: { $in: ["a", "b"] } }),
    );
  });

  await test("$and / $or recurse and multiple top-level fields combine via $and", async () => {
    const where = translateMetadataFilter({
      category: "docs",
      page: { $gt: 1 },
    });
    assertEqual(
      JSON.stringify(where),
      JSON.stringify({
        $and: [{ category: { $eq: "docs" } }, { page: { $gt: 1 } }],
      }),
    );

    const orWhere = translateMetadataFilter({
      $or: [{ category: "docs" }, { category: "blog" }],
    });
    assertEqual(
      JSON.stringify(orWhere),
      JSON.stringify({
        $or: [{ category: { $eq: "docs" } }, { category: { $eq: "blog" } }],
      }),
    );
  });

  await test("empty filter and array-valued field both translate to no constraint", async () => {
    assertEqual(
      JSON.stringify(translateMetadataFilter({})),
      JSON.stringify({}),
    );
    // Mirrors InMemoryVectorStore.matchesFilter: a non-null object value with
    // no recognized $-key (arrays included) enforces no constraint.
    assertEqual(
      JSON.stringify(translateMetadataFilter({ tags: ["a", "b"] })),
      JSON.stringify({}),
    );
    // A field with a real constraint alongside a no-op array field: the
    // no-op field is omitted entirely, not passed through as $and(1 item).
    assertEqual(
      JSON.stringify(translateMetadataFilter({ tags: ["a", "b"], page: 1 })),
      JSON.stringify({ page: { $eq: 1 } }),
    );
  });

  await test("query() applies the translated where clause", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    const filter: MetadataFilter = { category: "docs" };
    await store.query({ indexName: "docs", queryVector: [1, 0], filter });
    const collection = client.collections.get("docs");
    assertNotNull(collection);
    assertEqual(
      JSON.stringify(collection.queryCalls[0].where),
      JSON.stringify({ category: { $eq: "docs" } }),
    );
  });

  await test("query() omits the where key entirely when no filter is given", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    await store.query({ indexName: "docs", queryVector: [1, 0] });
    const collection = client.collections.get("docs");
    assertNotNull(collection);
    assert(
      !("where" in collection.queryCalls[0]),
      "no where key when filter is undefined",
    );
  });

  for (const op of ["$not", "$nor"] as const) {
    await test(`${op} throws a clear, unsupported-operator error`, async () => {
      try {
        translateMetadataFilter({
          [op]: op === "$not" ? { category: "docs" } : [{ category: "docs" }],
        });
        assert(false, `expected translateMetadataFilter to throw for ${op}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        assertIncludesCI(msg, op);
      }
    });
  }

  for (const op of ["$exists", "$contains", "$regex", "$size"] as const) {
    await test(`${op} throws a clear, unsupported-operator error`, async () => {
      const value = op === "$exists" ? true : op === "$size" ? 3 : "needle";
      try {
        translateMetadataFilter({ field: { [op]: value } });
        assert(false, `expected translateMetadataFilter to throw for ${op}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        assertIncludesCI(msg, op);
        assertIncludesCI(msg, "field");
      }
    });
  }

  await test("unsupported operator error surfaces through query()", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    try {
      await store.query({
        indexName: "docs",
        queryVector: [1, 0],
        filter: { field: { $regex: "^a" } },
      });
      assert(false, "expected query() to throw for $regex filter");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      assertIncludesCI(msg, "$regex");
    }
  });

  // ---------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------

  await test("delete forwards ids to the collection", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    await store.delete("docs", ["a", "b"]);
    const collection = client.collections.get("docs");
    assertNotNull(collection);
    assertEqual(collection.deleteCalls.length, 1);
    assertEqual(
      JSON.stringify(collection.deleteCalls[0].ids),
      JSON.stringify(["a", "b"]),
    );
  });

  await test("delete with empty ids is a no-op (no client calls at all)", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    await store.delete("docs", []);
    assertEqual(client.getOrCreateCalls.length, 0);
  });

  // ---------------------------------------------------------------------
  // collection caching
  // ---------------------------------------------------------------------

  await test("indexName -> collection is created once and reused across calls", async () => {
    const client = new RecordingClient();
    const store = new ChromaVectorStore(client);
    await store.upsert("docs", [{ id: "a", vector: [1, 0] }]);
    await store.query({ indexName: "docs", queryVector: [1, 0] });
    await store.delete("docs", ["a"]);
    assertEqual(
      client.getOrCreateCalls.length,
      1,
      "collection should be created exactly once",
    );
  });
});

// ---------------------------------------------------------------------------
// local helpers
// ---------------------------------------------------------------------------

function assertIncludesCI(haystack: string, needle: string): void {
  if (!haystack.toLowerCase().includes(needle.toLowerCase())) {
    throw new Error(`Expected "${haystack}" to include "${needle}"`);
  }
}

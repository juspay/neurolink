#!/usr/bin/env tsx
/**
 * Continuous Test Suite: PineconeVectorStore adapter (no network).
 *
 * Exercises src/lib/rag/stores/pinecone.ts against a hand-written recording
 * mock client implementing `PineconeIndexLike`. No real Pinecone account or
 * network call is involved — this is a pure contract/translation test.
 *
 * Covers:
 *  - query(): topK default, score/metadata passthrough, includeVectors on/off,
 *    text extraction from metadata.text, namespace routing via indexName.
 *  - upsert() / delete(): payload shape sent to the mock client.
 *  - MetadataFilter -> Pinecone filter translation: exact translated payload
 *    for $eq/$ne/$gt/$gte/$lt/$lte/$in/$nin, $and/$or recursion, direct
 *    equality passthrough, and errors on unsupported operators
 *    ($not, $nor, $exists, $contains, $regex, $size).
 *
 * Run: npx tsx test/continuous-test-suite-vector-pinecone.ts
 */

import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { PineconeVectorStore } from "../dist/index.js";
// See the note in continuous-test-suite-vector-chroma.ts — `translatePineconeFilter`
// is internal and kept under the determinism exception to CLAUDE.md rule 15.
import { translatePineconeFilter } from "../src/lib/rag/stores/pinecone.js";
import type {
  MetadataFilter,
  PineconeIndexLike,
  PineconeQueryRequest,
  PineconeQueryResponse,
  PineconeUpsertRecord,
} from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Vector Store: Pinecone adapter");

// ---------------------------------------------------------------------------
// Recording mock client
// ---------------------------------------------------------------------------

/** Records every call made to it; lets tests assert exact payload shapes. */
class RecordingPineconeIndex implements PineconeIndexLike {
  queryCalls: PineconeQueryRequest[] = [];
  upsertCalls: PineconeUpsertRecord[][] = [];
  deleteManyCalls: string[][] = [];
  namespaceCalls: string[] = [];

  /** Canned response returned by the next query() call. */
  nextQueryResponse: PineconeQueryResponse = { matches: [] };

  namespace(ns: string): PineconeIndexLike {
    this.namespaceCalls.push(ns);
    return this;
  }

  async query(request: PineconeQueryRequest): Promise<PineconeQueryResponse> {
    this.queryCalls.push(request);
    return this.nextQueryResponse;
  }

  async upsert(records: PineconeUpsertRecord[]): Promise<unknown> {
    this.upsertCalls.push(records);
    return undefined;
  }

  async deleteMany(ids: string[]): Promise<unknown> {
    this.deleteManyCalls.push(ids);
    return undefined;
  }
}

/** A client with no `.namespace()` method, to exercise the fallback path. */
class NamespacelessPineconeIndex implements PineconeIndexLike {
  queryCalls: PineconeQueryRequest[] = [];
  nextQueryResponse: PineconeQueryResponse = { matches: [] };

  async query(request: PineconeQueryRequest): Promise<PineconeQueryResponse> {
    this.queryCalls.push(request);
    return this.nextQueryResponse;
  }
  async upsert(): Promise<unknown> {
    return undefined;
  }
  async deleteMany(): Promise<unknown> {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// query()
// ---------------------------------------------------------------------------

await test("query() defaults topK to 10 and routes via namespace(indexName)", async () => {
  const mock = new RecordingPineconeIndex();
  const store = new PineconeVectorStore(mock);

  await store.query({ indexName: "tenant-a", queryVector: [1, 0, 0] });

  assertEqual(mock.namespaceCalls.length, 1, "namespace() called once");
  assertEqual(
    mock.namespaceCalls[0],
    "tenant-a",
    "namespace() called with indexName",
  );
  assertEqual(mock.queryCalls.length, 1, "query() called once");
  assertEqual(mock.queryCalls[0].topK, 10, "topK defaults to 10");
  assertEqual(
    mock.queryCalls[0].includeValues,
    false,
    "includeValues defaults false when includeVectors omitted",
  );
  assertEqual(
    mock.queryCalls[0].includeMetadata,
    true,
    "includeMetadata is always requested",
  );
});

await test("query() passes explicit topK through unchanged", async () => {
  const mock = new RecordingPineconeIndex();
  const store = new PineconeVectorStore(mock);

  await store.query({ indexName: "ix", queryVector: [1], topK: 3 });

  assertEqual(mock.queryCalls[0].topK, 3, "topK passed through");
});

await test("query() falls back to the raw client when namespace() is absent", async () => {
  const mock = new NamespacelessPineconeIndex();
  const store = new PineconeVectorStore(mock);

  await store.query({ indexName: "ignored-index-name", queryVector: [1] });

  assertEqual(
    mock.queryCalls.length,
    1,
    "query() still called once on raw client",
  );
});

await test("query() passes score through and extracts text from metadata.text", async () => {
  const mock = new RecordingPineconeIndex();
  mock.nextQueryResponse = {
    matches: [
      { id: "a", score: 0.87, metadata: { text: "hello world", tag: "x" } },
      { id: "b", score: 0.5, metadata: {} },
    ],
  };
  const store = new PineconeVectorStore(mock);

  const results = await store.query({ indexName: "ix", queryVector: [1] });

  assertEqual(results.length, 2, "returns both matches");
  assertEqual(results[0].id, "a");
  assertEqual(results[0].score, 0.87, "score passed through verbatim");
  assertEqual(
    results[0].text,
    "hello world",
    "text extracted from metadata.text",
  );
  assertEqual(
    JSON.stringify(results[0].metadata),
    JSON.stringify({ text: "hello world", tag: "x" }),
    "full metadata object is returned",
  );
  assertEqual(
    results[1].text,
    undefined,
    "text is undefined when metadata.text absent",
  );
});

await test("query() omits vector from results when includeVectors is false/omitted", async () => {
  const mock = new RecordingPineconeIndex();
  mock.nextQueryResponse = {
    matches: [{ id: "a", score: 1, metadata: {}, values: [1, 2, 3] }],
  };
  const store = new PineconeVectorStore(mock);

  const results = await store.query({ indexName: "ix", queryVector: [1] });

  assert(
    !("vector" in results[0]),
    "vector key absent when includeVectors is false",
  );
  assertEqual(
    mock.queryCalls[0].includeValues,
    false,
    "includeValues forwarded as false",
  );
});

await test("query() includes vector in results when includeVectors is true", async () => {
  const mock = new RecordingPineconeIndex();
  mock.nextQueryResponse = {
    matches: [{ id: "a", score: 1, metadata: {}, values: [1, 2, 3] }],
  };
  const store = new PineconeVectorStore(mock);

  const results = await store.query({
    indexName: "ix",
    queryVector: [1],
    includeVectors: true,
  });

  assertEqual(
    mock.queryCalls[0].includeValues,
    true,
    "includeValues forwarded as true",
  );
  assertEqual(
    JSON.stringify(results[0].vector),
    JSON.stringify([1, 2, 3]),
    "vector present and equal to match.values",
  );
});

await test("query() returns an empty array when the mock has no matches", async () => {
  const mock = new RecordingPineconeIndex();
  mock.nextQueryResponse = {};
  const store = new PineconeVectorStore(mock);

  const results = await store.query({ indexName: "ix", queryVector: [1] });

  assertEqual(results.length, 0, "empty matches -> empty results");
});

// ---------------------------------------------------------------------------
// upsert() / delete()
// ---------------------------------------------------------------------------

await test("upsert() maps vector -> values and defaults metadata to {}", async () => {
  const mock = new RecordingPineconeIndex();
  const store = new PineconeVectorStore(mock);

  await store.upsert("tenant-a", [
    { id: "1", vector: [1, 2], metadata: { text: "hi" } },
    { id: "2", vector: [3, 4] },
  ]);

  assertEqual(
    mock.namespaceCalls[0],
    "tenant-a",
    "upsert routes via namespace(indexName)",
  );
  assertEqual(mock.upsertCalls.length, 1, "upsert() called once");
  const records = mock.upsertCalls[0];
  assertEqual(records.length, 2);
  assertEqual(records[0].id, "1");
  assertEqual(JSON.stringify(records[0].values), JSON.stringify([1, 2]));
  assertEqual(
    JSON.stringify(records[0].metadata),
    JSON.stringify({ text: "hi" }),
  );
  assertEqual(
    JSON.stringify(records[1].metadata),
    JSON.stringify({}),
    "metadata defaults to {} when omitted",
  );
});

await test("delete() forwards ids to deleteMany() via the resolved namespace", async () => {
  const mock = new RecordingPineconeIndex();
  const store = new PineconeVectorStore(mock);

  await store.delete("tenant-a", ["1", "2", "3"]);

  assertEqual(mock.namespaceCalls[0], "tenant-a");
  assertEqual(mock.deleteManyCalls.length, 1);
  assertEqual(
    JSON.stringify(mock.deleteManyCalls[0]),
    JSON.stringify(["1", "2", "3"]),
  );
});

// ---------------------------------------------------------------------------
// MetadataFilter -> Pinecone filter translation
// ---------------------------------------------------------------------------

await test("translatePineconeFilter: passes supported comparison operators through verbatim", () => {
  const filter: MetadataFilter = {
    category: { $eq: "docs" },
    price: { $gt: 10, $lte: 100 },
    tag: { $in: ["a", "b"] },
    excluded: { $nin: ["z"] },
    notEqual: { $ne: "x" },
    low: { $gte: 1 },
    high: { $lt: 99 },
  };

  const translated = translatePineconeFilter(filter);

  assertEqual(
    JSON.stringify(translated),
    JSON.stringify({
      category: { $eq: "docs" },
      price: { $gt: 10, $lte: 100 },
      tag: { $in: ["a", "b"] },
      excluded: { $nin: ["z"] },
      notEqual: { $ne: "x" },
      low: { $gte: 1 },
      high: { $lt: 99 },
    }),
    "operator bags pass through unchanged field-by-field",
  );
});

await test("translatePineconeFilter: direct (non-object) values become implicit equality", () => {
  const filter: MetadataFilter = { status: "published", views: 42 };
  const translated = translatePineconeFilter(filter);
  assertEqual(
    JSON.stringify(translated),
    JSON.stringify({ status: "published", views: 42 }),
  );
});

await test("translatePineconeFilter: $and recurses into an array of translated sub-filters", () => {
  const filter: MetadataFilter = {
    $and: [{ category: "docs" }, { price: { $gt: 10 } }],
  };
  const translated = translatePineconeFilter(filter);
  assertEqual(
    JSON.stringify(translated),
    JSON.stringify({
      $and: [{ category: "docs" }, { price: { $gt: 10 } }],
    }),
  );
});

await test("translatePineconeFilter: $or recurses into an array of translated sub-filters", () => {
  const filter: MetadataFilter = {
    $or: [{ category: "docs" }, { category: "blog" }],
  };
  const translated = translatePineconeFilter(filter);
  assertEqual(
    JSON.stringify(translated),
    JSON.stringify({ $or: [{ category: "docs" }, { category: "blog" }] }),
  );
});

await test("translatePineconeFilter: nested $and/$or translate recursively at every level", () => {
  const filter: MetadataFilter = {
    $and: [{ $or: [{ a: 1 }, { a: 2 }] }, { b: { $gte: 5 } }],
  };
  const translated = translatePineconeFilter(filter);
  assertEqual(
    JSON.stringify(translated),
    JSON.stringify({
      $and: [{ $or: [{ a: 1 }, { a: 2 }] }, { b: { $gte: 5 } }],
    }),
  );
});

await test("translatePineconeFilter: throws a clear error on $not (unsupported)", () => {
  let threw = false;
  try {
    translatePineconeFilter({ $not: { category: "docs" } });
  } catch (err) {
    threw = true;
    assert(
      err instanceof Error && err.message.includes("$not"),
      "error message names the unsupported operator",
    );
  }
  assert(threw, "translatePineconeFilter must throw for $not");
});

await test("translatePineconeFilter: throws a clear error on $nor (unsupported)", () => {
  let threw = false;
  try {
    translatePineconeFilter({ $nor: [{ category: "docs" }] });
  } catch (err) {
    threw = true;
    assert(
      err instanceof Error && err.message.includes("$nor"),
      "error message names the unsupported operator",
    );
  }
  assert(threw, "translatePineconeFilter must throw for $nor");
});

await test("translatePineconeFilter: throws a clear error on $exists (unsupported)", () => {
  let threw = false;
  try {
    translatePineconeFilter({ category: { $exists: true } });
  } catch (err) {
    threw = true;
    assert(
      err instanceof Error &&
        err.message.includes("$exists") &&
        err.message.includes("category"),
      "error message names both the operator and the field",
    );
  }
  assert(threw, "translatePineconeFilter must throw for $exists");
});

await test("translatePineconeFilter: throws a clear error on $contains (unsupported)", () => {
  let threw = false;
  try {
    translatePineconeFilter({ title: { $contains: "AI" } });
  } catch (err) {
    threw = true;
    assert(
      err instanceof Error && err.message.includes("$contains"),
      "error message names the unsupported operator",
    );
  }
  assert(threw, "translatePineconeFilter must throw for $contains");
});

await test("translatePineconeFilter: throws a clear error on $regex (unsupported)", () => {
  let threw = false;
  try {
    translatePineconeFilter({ title: { $regex: "^AI" } });
  } catch (err) {
    threw = true;
    assert(
      err instanceof Error && err.message.includes("$regex"),
      "error message names the unsupported operator",
    );
  }
  assert(threw, "translatePineconeFilter must throw for $regex");
});

await test("translatePineconeFilter: throws a clear error on $size (unsupported)", () => {
  let threw = false;
  try {
    translatePineconeFilter({ tags: { $size: 3 } });
  } catch (err) {
    threw = true;
    assert(
      err instanceof Error && err.message.includes("$size"),
      "error message names the unsupported operator",
    );
  }
  assert(threw, "translatePineconeFilter must throw for $size");
});

await test("query() surfaces the filter-translation error when given an unsupported operator", async () => {
  const mock = new RecordingPineconeIndex();
  const store = new PineconeVectorStore(mock);

  let threw = false;
  try {
    await store.query({
      indexName: "ix",
      queryVector: [1],
      filter: { category: { $exists: true } },
    });
  } catch (err) {
    threw = true;
    assert(
      err instanceof Error && err.message.includes("$exists"),
      "query() propagates the translation error message",
    );
  }
  assert(threw, "query() must propagate the translation error");
  assertEqual(
    mock.queryCalls.length,
    0,
    "the mock client is never called when translation fails",
  );
});

await test("query() forwards a translated filter to the underlying client", async () => {
  const mock = new RecordingPineconeIndex();
  const store = new PineconeVectorStore(mock);

  await store.query({
    indexName: "ix",
    queryVector: [1],
    filter: { category: { $eq: "docs" }, price: { $gt: 10 } },
  });

  assertEqual(
    JSON.stringify(mock.queryCalls[0].filter),
    JSON.stringify({ category: { $eq: "docs" }, price: { $gt: 10 } }),
    "translated filter forwarded verbatim to the client",
  );
});

await test("query() omits the filter key entirely when no filter is given", async () => {
  const mock = new RecordingPineconeIndex();
  const store = new PineconeVectorStore(mock);

  await store.query({ indexName: "ix", queryVector: [1] });

  assert(
    !("filter" in mock.queryCalls[0]),
    "no filter key sent when caller did not pass a filter",
  );
});

await runSuite();

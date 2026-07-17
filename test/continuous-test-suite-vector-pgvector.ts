#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — PgVectorStore (pgvector adapter)
 *
 * Real backend, no Docker: uses `@electric-sql/pglite` (in-process Postgres
 * compiled to WASM) with the bundled `vector` extension, exercising the
 * adapter against genuine SQL — real `CREATE EXTENSION vector`, real
 * `vector(n)` columns, real `<=>` cosine-distance queries — not a mock.
 *
 * Coverage:
 *   A. Ordering by true cosine similarity + topK
 *   B. includeVectors / text-from-metadata contract parity with
 *      InMemoryVectorStore's VectorQueryResult shape
 *   C. MetadataFilter -> SQL translation ($eq, $in, $gt, $and/$or/$not,
 *      $exists, missing-field semantics)
 *   D. delete()
 *   E. Unknown-index behavior (query -> [], delete -> no-op), mirroring
 *      InMemoryVectorStore on an index nothing has been upserted to
 *   F. Identifier-injection rejection + embedding-dimension validation
 *
 * Run: pnpm run test:vector-pgvector
 */

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { PgVectorStore } from "../src/lib/rag/stores/pgvector.js";
import type { PgClientLike } from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("PgVectorStore (pgvector adapter)");

// ── Shared in-process Postgres instance ─────────────────────────────────────
// One PGlite database for the whole suite; each test uses its own indexName
// (=> its own table) so tests stay independent despite sharing the instance.
const db = new PGlite({ extensions: { vector } });
await db.exec("CREATE EXTENSION IF NOT EXISTS vector");

const client: PgClientLike = db;
const store = new PgVectorStore(client);

let indexCounter = 0;
/** Fresh, never-before-used index name per test to avoid cross-test bleed. */
function freshIndex(): string {
  indexCounter += 1;
  return `suite_idx_${indexCounter}`;
}

const SQRT1_2 = Math.SQRT1_2; // 1/sqrt(2) ≈ 0.7071

// ── Local assertion helpers ──────────────────────────────────────────────────

function assertNotUndefined<T>(
  value: T | undefined,
  msg: string,
): asserts value is T {
  assert(value !== undefined, msg);
}

async function assertRejects(
  fn: () => Promise<unknown>,
  matching: RegExp | undefined,
  msg?: string,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (matching && !matching.test(message)) {
      throw new Error(
        `${msg ?? "expected rejection"}: error did not match ${matching} (got: ${message})`,
        { cause: err },
      );
    }
    return;
  }
  throw new Error(msg ?? "expected promise to reject, but it resolved");
}

// ── A. Ordering by true cosine similarity + topK ────────────────────────────

await test("query orders by true cosine similarity, descending", async () => {
  const idx = freshIndex();
  await store.upsert(idx, [
    { id: "a", vector: [1, 0, 0], metadata: { label: "identical" } },
    { id: "b", vector: [0, 1, 0], metadata: { label: "orthogonal" } },
    { id: "c", vector: [SQRT1_2, SQRT1_2, 0], metadata: { label: "45deg" } },
    { id: "d", vector: [-1, 0, 0], metadata: { label: "opposite" } },
  ]);

  const results = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    topK: 10,
  });

  assertEqual(results.length, 4, "all 4 rows returned (topK=10 > 4 rows)");
  assertEqual(
    results.map((r) => r.id).join(","),
    "a,c,b,d",
    "ordered a (1.0) > c (~0.707) > b (0.0) > d (-1.0)",
  );

  assert(
    Math.abs((results[0].score ?? NaN) - 1) < 1e-6,
    `identical vector scores ~1.0, got ${results[0].score}`,
  );
  assert(
    Math.abs((results[1].score ?? NaN) - SQRT1_2) < 1e-6,
    `45deg vector scores ~${SQRT1_2}, got ${results[1].score}`,
  );
  assert(
    Math.abs((results[2].score ?? NaN) - 0) < 1e-6,
    `orthogonal vector scores ~0.0, got ${results[2].score}`,
  );
  assert(
    Math.abs((results[3].score ?? NaN) - -1) < 1e-6,
    `opposite vector scores ~-1.0, got ${results[3].score}`,
  );
});

await test("topK truncates the ranked result set", async () => {
  const idx = freshIndex();
  await store.upsert(idx, [
    { id: "a", vector: [1, 0, 0] },
    { id: "b", vector: [0, 1, 0] },
    { id: "c", vector: [SQRT1_2, SQRT1_2, 0] },
    { id: "d", vector: [-1, 0, 0] },
  ]);

  const results = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    topK: 2,
  });

  assertEqual(results.length, 2, "topK=2 returns exactly 2 rows");
  assertEqual(
    results.map((r) => r.id).join(","),
    "a,c",
    "top 2 by similarity are a then c",
  );
});

await test("default topK is 10 when omitted", async () => {
  const idx = freshIndex();
  await store.upsert(
    idx,
    Array.from({ length: 15 }, (_, i) => ({
      id: `v${i}`,
      vector: [1, i / 100, 0],
    })),
  );
  const results = await store.query({ indexName: idx, queryVector: [1, 0, 0] });
  assertEqual(results.length, 10, "omitted topK falls back to 10");
});

// ── B. Result shape parity with InMemoryVectorStore ─────────────────────────

await test("text is pulled from metadata.text, not stored separately", async () => {
  const idx = freshIndex();
  await store.upsert(idx, [
    { id: "a", vector: [1, 0, 0], metadata: { text: "hello world", tag: "x" } },
    { id: "b", vector: [0, 1, 0] }, // no metadata -> defaults to {}
  ]);

  const results = await store.query({ indexName: idx, queryVector: [1, 0, 0] });
  const a = results.find((r) => r.id === "a");
  const b = results.find((r) => r.id === "b");
  assertNotUndefined(a, "a present");
  assertNotUndefined(b, "b present");
  assertEqual(a!.text, "hello world", "text pulled from metadata.text");
  assertEqual(a!.metadata?.tag, "x", "metadata preserved");
  assertEqual(b!.text, undefined, "no metadata.text -> text undefined");
  assert(
    b!.metadata !== undefined && Object.keys(b!.metadata).length === 0,
    "missing metadata upserts as {}",
  );
});

await test("includeVectors: omitted by default, present when requested", async () => {
  const idx = freshIndex();
  await store.upsert(idx, [{ id: "a", vector: [1, 2, 3] }]);

  const withoutVectors = await store.query({
    indexName: idx,
    queryVector: [1, 2, 3],
  });
  assertEqual(withoutVectors[0].vector, undefined, "vector omitted by default");

  const withVectors = await store.query({
    indexName: idx,
    queryVector: [1, 2, 3],
    includeVectors: true,
  });
  assert(
    Array.isArray(withVectors[0].vector),
    "vector present when includeVectors: true",
  );
  assertEqual(
    withVectors[0].vector?.length,
    3,
    "returned vector has original dimension",
  );
  for (const [i, v] of (withVectors[0].vector ?? []).entries()) {
    assert(
      Math.abs(v - [1, 2, 3][i]) < 1e-6,
      `component ${i} round-trips (got ${v})`,
    );
  }
});

// ── C. MetadataFilter -> SQL translation ────────────────────────────────────

async function seedFilterFixture(): Promise<string> {
  const idx = freshIndex();
  await store.upsert(idx, [
    { id: "a", vector: [1, 0, 0], metadata: { category: "docs", priority: 5 } },
    { id: "b", vector: [0, 1, 0], metadata: { category: "code", priority: 2 } },
    {
      id: "c",
      vector: [SQRT1_2, SQRT1_2, 0],
      metadata: { category: "docs", priority: 8 },
    },
    {
      id: "d",
      vector: [-1, 0, 0],
      metadata: { category: "code", priority: 1 },
    },
  ]);
  return idx;
}

await test("$eq filters on metadata field, preserving similarity order", async () => {
  const idx = await seedFilterFixture();
  const results = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { category: "docs" },
  });
  assertEqual(
    results.map((r) => r.id).join(","),
    "a,c",
    "only docs (a, c) match, ordered by similarity",
  );
});

await test("bare-value equality is equivalent to $eq", async () => {
  const idx = await seedFilterFixture();
  const viaEq = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { category: { $eq: "code" } },
  });
  const viaBare = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { category: "code" },
  });
  assertEqual(
    viaEq.map((r) => r.id).join(","),
    viaBare.map((r) => r.id).join(","),
    "$eq and bare-value equality agree",
  );
  assertEqual(viaBare.map((r) => r.id).join(","), "b,d");
});

await test("$in matches any value in the list", async () => {
  const idx = await seedFilterFixture();
  const results = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { category: { $in: ["code"] } },
  });
  assertEqual(results.map((r) => r.id).join(","), "b,d");
});

await test("$nin excludes matching values, includes rows missing the field", async () => {
  const idx = freshIndex();
  await store.upsert(idx, [
    { id: "a", vector: [1, 0, 0], metadata: { category: "docs" } },
    { id: "b", vector: [0, 1, 0], metadata: { category: "code" } },
    { id: "c", vector: [SQRT1_2, SQRT1_2, 0] }, // no `category` key at all
  ]);
  const results = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { category: { $nin: ["docs"] } },
  });
  assertEqual(
    results
      .map((r) => r.id)
      .sort()
      .join(","),
    "b,c",
    "excludes docs; missing-field row (c) still matches $nin",
  );
});

await test("$gt only matches numeric fields, ignores non-numeric metadata", async () => {
  const idx = await seedFilterFixture();
  const results = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { priority: { $gt: 4 } },
  });
  assertEqual(
    results.map((r) => r.id).join(","),
    "a,c",
    "priority > 4 -> a(5), c(8)",
  );
});

await test("$gte / $lt / $lte behave as inclusive/exclusive numeric bounds", async () => {
  const idx = await seedFilterFixture();
  const gte = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { priority: { $gte: 5 } },
  });
  assertEqual(
    gte
      .map((r) => r.id)
      .sort()
      .join(","),
    "a,c",
  );

  const lt = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { priority: { $lt: 2 } },
  });
  assertEqual(lt.map((r) => r.id).join(","), "d");

  const lte = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { priority: { $lte: 2 } },
  });
  assertEqual(
    lte
      .map((r) => r.id)
      .sort()
      .join(","),
    "b,d",
  );
});

await test("$exists distinguishes present vs. absent fields", async () => {
  const idx = freshIndex();
  await store.upsert(idx, [
    { id: "a", vector: [1, 0, 0], metadata: { tag: "x" } },
    { id: "b", vector: [0, 1, 0] },
  ]);
  const present = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { tag: { $exists: true } },
  });
  assertEqual(present.map((r) => r.id).join(","), "a");

  const absent = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { tag: { $exists: false } },
  });
  assertEqual(absent.map((r) => r.id).join(","), "b");
});

await test("$contains does a literal substring match, not a LIKE pattern", async () => {
  const idx = freshIndex();
  await store.upsert(idx, [
    { id: "a", vector: [1, 0, 0], metadata: { text: "50% off everything" } },
    { id: "b", vector: [0, 1, 0], metadata: { text: "no discount" } },
  ]);
  const results = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { text: { $contains: "50%" } },
  });
  assertEqual(
    results.map((r) => r.id).join(","),
    "a",
    "% in the needle is treated literally, not as a SQL LIKE wildcard",
  );
});

await test("$and / $or / $not compose correctly", async () => {
  const idx = await seedFilterFixture();

  const and = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { $and: [{ category: "docs" }, { priority: { $gt: 6 } }] },
  });
  assertEqual(
    and.map((r) => r.id).join(","),
    "c",
    "docs AND priority>6 -> c only",
  );

  const or = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { $or: [{ category: "code" }, { priority: { $gte: 8 } }] },
  });
  assertEqual(
    or
      .map((r) => r.id)
      .sort()
      .join(","),
    "b,c,d",
    "code OR priority>=8 -> b, c, d",
  );

  const not = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    filter: { $not: { category: "docs" } },
  });
  assertEqual(
    not
      .map((r) => r.id)
      .sort()
      .join(","),
    "b,d",
    "NOT docs -> code rows",
  );
});

await test("unsupported $nor / $size operators throw a clear error", async () => {
  const idx = await seedFilterFixture();
  await assertRejects(
    () =>
      store.query({
        indexName: idx,
        queryVector: [1, 0, 0],
        filter: { $nor: [{ category: "docs" }] },
      }),
    /\$nor/,
    "$nor throws naming the operator",
  );
  await assertRejects(
    () =>
      store.query({
        indexName: idx,
        queryVector: [1, 0, 0],
        filter: { tag: { $size: 1 } },
      }),
    /\$size/,
    "$size throws naming the operator",
  );
});

// ── D. delete() ──────────────────────────────────────────────────────────────

await test("delete removes vectors by id", async () => {
  const idx = freshIndex();
  await store.upsert(idx, [
    { id: "a", vector: [1, 0, 0] },
    { id: "b", vector: [0, 1, 0] },
    { id: "c", vector: [0, 0, 1] },
  ]);

  await store.delete(idx, ["b"]);

  const results = await store.query({
    indexName: idx,
    queryVector: [1, 0, 0],
    topK: 10,
  });
  assertEqual(
    results
      .map((r) => r.id)
      .sort()
      .join(","),
    "a,c",
    "b removed, a and c remain",
  );
});

await test("delete with an empty id list is a no-op", async () => {
  const idx = freshIndex();
  await store.upsert(idx, [{ id: "a", vector: [1, 0, 0] }]);
  await store.delete(idx, []);
  const results = await store.query({ indexName: idx, queryVector: [1, 0, 0] });
  assertEqual(results.length, 1, "nothing removed");
});

// ── E. Unknown-index behavior (mirrors InMemoryVectorStore) ─────────────────

await test("query on an index nothing was ever upserted to returns []", async () => {
  const results = await store.query({
    indexName: freshIndex(),
    queryVector: [1, 0, 0],
  });
  assertEqual(results.length, 0, "unknown index -> empty results, not a throw");
});

await test("delete on an unknown index is a silent no-op", async () => {
  await store.delete(freshIndex(), ["a", "b"]); // must not throw
  assert(true, "reached without throwing");
});

// ── F. Identifier injection + dimension validation ──────────────────────────

await test("indexName with SQL metacharacters is rejected, not interpolated", async () => {
  await assertRejects(
    () =>
      store.upsert('idx"; DROP TABLE users; --', [
        { id: "a", vector: [1, 0, 0] },
      ]),
    /invalid indexName/,
    "rejects before touching the database",
  );
});

await test("indexName starting with a digit is rejected", async () => {
  await assertRejects(
    () => store.upsert("9bad", [{ id: "a", vector: [1, 0, 0] }]),
    /invalid indexName/,
  );
});

await test("mixed-dimension vectors in one upsert batch are rejected", async () => {
  const idx = freshIndex();
  await assertRejects(
    () =>
      store.upsert(idx, [
        { id: "a", vector: [1, 0, 0] },
        { id: "b", vector: [1, 0] },
      ]),
    /dimension/,
    "rejects before hitting the database",
  );
});

await test("querying with a mismatched query-vector dimension surfaces a DB error, not a silent 0 score", async () => {
  const idx = freshIndex();
  await store.upsert(idx, [{ id: "a", vector: [1, 0, 0] }]);
  await assertRejects(
    () => store.query({ indexName: idx, queryVector: [1, 0] }),
    undefined,
    "pgvector itself rejects the dimension mismatch",
  );
});

await runSuite();

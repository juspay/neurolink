/**
 * pgvector Vector Store Adapter
 *
 * Client-injection `VectorStore` implementation backed by Postgres +
 * the `pgvector` extension. Callers construct and own the Postgres client
 * (e.g. a `pg.Pool`, or an in-process `@electric-sql/pglite` instance) and
 * pass it in — this module adds zero vendor SDKs as runtime dependencies.
 *
 * Storage model: one table per `indexName`, created lazily on first
 * `upsert()` (`CREATE TABLE IF NOT EXISTS`, so it is safe to call
 * repeatedly). Schema:
 *   id        text PRIMARY KEY
 *   embedding vector(n)   -- n fixed to the dimension of the first upsert
 *   metadata  jsonb NOT NULL DEFAULT '{}'::jsonb
 *
 * Scoring: matches `InMemoryVectorStore`'s cosine-similarity convention
 * (higher is better, 1.0 = identical direction) by converting pgvector's
 * `<=>` cosine *distance* operator (0 = identical) via `score = 1 - distance`.
 *
 * `MetadataFilter` -> SQL: every value that flows into a query is a bound
 * parameter (`$1`, `$2`, ...), including metadata field *names* — nothing
 * from the filter is ever string-concatenated into SQL text. The one thing
 * that IS textually embedded is the derived table name, and only after it
 * passes a strict identifier allow-list (see `IDENTIFIER_RE`), because
 * Postgres has no way to bind an identifier as a query parameter.
 *
 * Operators not expressible without ambiguity are rejected loudly instead of
 * silently no-op'ing:
 *   - `$nor` (top-level logical operator) and `$size` (field-level operator)
 *     are declared on `MetadataFilter` but (per the reference
 *     `InMemoryVectorStore.matchesFilter`) are not actually implemented
 *     there either — rather than guess at semantics that would silently
 *     diverge from any caller's expectations, this adapter throws.
 *   - Any other unrecognized `$foo` key, top-level or field-level, throws
 *     for the same reason.
 *
 * Known, documented behavioral differences from `InMemoryVectorStore`:
 *   - `$eq` / bare-value equality compares via Postgres jsonb structural
 *     equality, whereas the in-memory reference uses JS `!==` (so it can
 *     never match on array/object metadata values — two distinct array
 *     instances are never `===`). This adapter is strictly more capable
 *     for those value types.
 *   - `$regex` runs Postgres POSIX regex (`~`) rather than a JS `RegExp`.
 *     For non-string or missing fields the in-memory store tests the
 *     pattern against `""` (so e.g. `^$` or `.*` can still match); this
 *     adapter instead requires the field to be a JSON string, so those
 *     edge-case patterns will not match a missing/non-string field here.
 */

// `PgClientLike` / `PgVectorStoreOptions` / `PgVectorStoreRow` are declared in
// src/lib/types/rag.ts (repo convention: type aliases must live in
// src/lib/types/, re-exported to callers via the types barrel) rather than
// here — import them from `@juspay/neurolink` or `.../types/index.js`
// directly if you need to annotate a variable with them.
import type {
  MetadataFilter,
  PgClientLike,
  PgVectorStoreOptions,
  PgVectorStoreRow,
  VectorQueryResult,
  VectorStore,
} from "../../types/index.js";

// ============================================================================
// Identifier safety
// ============================================================================

/**
 * Strict allow-list for anything that becomes part of a SQL identifier
 * (table name). Letters/digits/underscore only, must not start with a
 * digit — this is what stands between an attacker-controlled `indexName`
 * and SQL injection, since Postgres cannot bind identifiers as parameters.
 */
const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;
const DEFAULT_TABLE_PREFIX = "neurolink_vs_";
const MAX_IDENTIFIER_LENGTH = 63; // Postgres NAMEDATALEN limit

// ============================================================================
// PgVectorStore
// ============================================================================

export class PgVectorStore implements VectorStore {
  private readonly client: PgClientLike;
  private readonly tablePrefix: string;
  /** Tables we've already run `CREATE TABLE IF NOT EXISTS` for, this process. */
  private readonly ensuredTables = new Set<string>();

  constructor(client: PgClientLike, options: PgVectorStoreOptions = {}) {
    this.client = client;
    this.tablePrefix = options.tablePrefix ?? DEFAULT_TABLE_PREFIX;
    if (!IDENTIFIER_RE.test(this.tablePrefix)) {
      throw new Error(
        `PgVectorStore: invalid tablePrefix "${this.tablePrefix}" — must match ${IDENTIFIER_RE}`,
      );
    }
  }

  /**
   * Derive and validate the backing table name for an index. Throws on
   * anything that isn't a safe bare SQL identifier — this is the injection
   * guard for `indexName`.
   */
  private tableName(indexName: string): string {
    if (!IDENTIFIER_RE.test(indexName)) {
      throw new Error(
        `PgVectorStore: invalid indexName "${indexName}" — must match ${IDENTIFIER_RE} ` +
          `(letters, digits, underscore; must not start with a digit) to be used as a SQL identifier`,
      );
    }
    const table = `${this.tablePrefix}${indexName}`;
    if (table.length > MAX_IDENTIFIER_LENGTH) {
      throw new Error(
        `PgVectorStore: derived table name "${table}" exceeds Postgres's ${MAX_IDENTIFIER_LENGTH}-character identifier limit`,
      );
    }
    return table;
  }

  /**
   * Ensure the `vector` extension and the index's table exist. Safe to call
   * repeatedly (`IF NOT EXISTS` throughout). `dimension` is fixed by the
   * first upsert into a fresh index; it is a validated positive integer
   * embedded directly in DDL (Postgres cannot bind type modifiers either).
   */
  private async ensureTable(
    indexName: string,
    dimension: number,
  ): Promise<string> {
    const table = this.tableName(indexName);
    if (this.ensuredTables.has(table)) {
      return table;
    }
    if (!Number.isInteger(dimension) || dimension <= 0) {
      throw new Error(
        `PgVectorStore: invalid embedding dimension ${dimension} — must be a positive integer`,
      );
    }
    await this.client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await this.client.query(
      `CREATE TABLE IF NOT EXISTS "${table}" (
         id text PRIMARY KEY,
         embedding vector(${dimension}) NOT NULL,
         metadata jsonb NOT NULL DEFAULT '{}'::jsonb
       )`,
    );
    this.ensuredTables.add(table);
    return table;
  }

  /**
   * Upsert vectors into an index, creating its table on first use.
   * Mirrors `InMemoryVectorStore.upsert` (metadata defaults to `{}`).
   */
  async upsert(
    indexName: string,
    items: Array<{
      id: string;
      vector: number[];
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const dimension = items[0].vector.length;
    for (const item of items) {
      if (item.vector.length !== dimension) {
        throw new Error(
          `PgVectorStore.upsert: all vectors in a single upsert batch must share the same ` +
            `dimension (expected ${dimension}, got ${item.vector.length} for id "${item.id}")`,
        );
      }
    }

    const table = await this.ensureTable(indexName, dimension);

    const values: unknown[] = [];
    const rows = items.map((item) => {
      const idParam = pushParam(values, item.id);
      const vectorParam = pushParam(values, toVectorLiteral(item.vector));
      const metadataParam = pushParam(
        values,
        JSON.stringify(item.metadata ?? {}),
      );
      return `(${idParam}, ${vectorParam}::vector, ${metadataParam}::jsonb)`;
    });

    await this.client.query(
      `INSERT INTO "${table}" (id, embedding, metadata)
       VALUES ${rows.join(", ")}
       ON CONFLICT (id) DO UPDATE SET
         embedding = EXCLUDED.embedding,
         metadata = EXCLUDED.metadata`,
      values,
    );
  }

  /**
   * Query by cosine similarity. Returns `[]` if the index's table doesn't
   * exist yet (mirrors `InMemoryVectorStore.query` on an unknown index)
   * rather than throwing.
   */
  async query(params: {
    indexName: string;
    queryVector: number[];
    topK?: number;
    filter?: MetadataFilter;
    includeVectors?: boolean;
  }): Promise<VectorQueryResult[]> {
    const {
      indexName,
      queryVector,
      topK = 10,
      filter,
      includeVectors = false,
    } = params;
    const table = this.tableName(indexName);

    const values: unknown[] = [toVectorLiteral(queryVector)];
    const whereSql = filter ? compileFilter(filter, values) : undefined;
    const limitParam = pushParam(values, topK);
    const vectorSelect = includeVectors ? ", embedding::text AS embedding" : "";

    const sql = `
      SELECT id, metadata, (1 - (embedding <=> $1::vector)) AS score${vectorSelect}
      FROM "${table}"
      ${whereSql ? `WHERE ${whereSql}` : ""}
      ORDER BY embedding <=> $1::vector ASC
      LIMIT ${limitParam}
    `;

    let rows: PgVectorStoreRow[];
    try {
      const result = await this.client.query(sql, values);
      rows = result.rows as PgVectorStoreRow[];
    } catch (err) {
      if (isMissingTableError(err)) {
        return [];
      }
      throw err;
    }

    return rows.map((row) => {
      const metadata = toMetadataObject(row.metadata);
      return {
        id: row.id,
        score: Number(row.score),
        text: metadata.text as string | undefined,
        metadata,
        ...(includeVectors && typeof row.embedding === "string"
          ? { vector: parseVectorLiteral(row.embedding) }
          : {}),
      };
    });
  }

  /**
   * Delete vectors by id. No-op if the index's table doesn't exist yet
   * (mirrors `InMemoryVectorStore.delete`).
   */
  async delete(indexName: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const table = this.tableName(indexName);
    const values: unknown[] = [];
    const placeholders = ids.map((id) => pushParam(values, id));
    try {
      await this.client.query(
        `DELETE FROM "${table}" WHERE id IN (${placeholders.join(", ")})`,
        values,
      );
    } catch (err) {
      if (isMissingTableError(err)) {
        return;
      }
      throw err;
    }
  }
}

// ============================================================================
// Row / vector (de)serialization helpers
// ============================================================================

/** Postgres numeric/jsonb drivers vary in whether values arrive pre-parsed. */
function toMetadataObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/** Parse pgvector's `[1,2,3]` text representation back into numbers. */
function parseVectorLiteral(text: string): number[] {
  const trimmed = text.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (trimmed.length === 0) {
    return [];
  }
  return trimmed.split(",").map((v) => Number(v));
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }
  const code = (err as { code?: unknown }).code;
  if (code === "42P01") {
    // Postgres SQLSTATE for undefined_table
    return true;
  }
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && /does not exist/i.test(message);
}

// ============================================================================
// Parameter binding helpers
// ============================================================================

function pushParam(values: unknown[], value: unknown): string {
  values.push(value);
  return `$${values.length}`;
}

// ============================================================================
// MetadataFilter -> SQL translation
// ============================================================================

/** Field-level operators this adapter translates to SQL. */
const KNOWN_FIELD_OPS = new Set([
  "$eq",
  "$ne",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$in",
  "$nin",
  "$exists",
  "$contains",
  "$regex",
]);

/** Logical/field entries are ANDed together, matching the reference semantics. */
function compileFilter(filter: MetadataFilter, values: unknown[]): string {
  const clauses: string[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith("$")) {
      clauses.push(compileLogicalOperator(key, value, values));
    } else {
      clauses.push(compileFieldFilter(key, value, values));
    }
  }

  return clauses.length > 0 ? clauses.join(" AND ") : "TRUE";
}

function compileLogicalOperator(
  key: string,
  value: unknown,
  values: unknown[],
): string {
  switch (key) {
    case "$and": {
      const subFilters = value as MetadataFilter[];
      if (subFilters.length === 0) {
        return "TRUE";
      }
      return subFilters
        .map((f) => `(${compileFilter(f, values)})`)
        .join(" AND ");
    }
    case "$or": {
      const subFilters = value as MetadataFilter[];
      if (subFilters.length === 0) {
        return "FALSE";
      }
      return `(${subFilters.map((f) => `(${compileFilter(f, values)})`).join(" OR ")})`;
    }
    case "$not":
      return `NOT (${compileFilter(value as MetadataFilter, values)})`;
    case "$nor":
    case "$size":
      throw new Error(
        `PgVectorStore: MetadataFilter operator "${key}" is not supported by the pgvector ` +
          `adapter (it is declared on the MetadataFilter type but is also unimplemented in ` +
          `the InMemoryVectorStore reference, so there is no agreed-upon semantics to mirror)`,
      );
    default:
      throw new Error(
        `PgVectorStore: unrecognized MetadataFilter logical operator "${key}"`,
      );
  }
}

function compileFieldFilter(
  field: string,
  value: unknown,
  values: unknown[],
): string {
  const fieldJson = () => `(metadata -> ${pushParam(values, field)})`;
  const fieldText = () => `(metadata ->> ${pushParam(values, field)})`;
  const fieldExists = () => `(metadata ? ${pushParam(values, field)})`;
  const fieldIsNumber = () =>
    `(jsonb_typeof(metadata -> ${pushParam(values, field)}) = 'number')`;
  const fieldIsString = () =>
    `(jsonb_typeof(metadata -> ${pushParam(values, field)}) = 'string')`;

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const ops = value as Record<string, unknown>;

    // Fail loudly on any operator we don't implement (e.g. `$size`, which is
    // declared on MetadataFilter but — like `$nor` — has no agreed-upon
    // semantics because InMemoryVectorStore's matchesFilter doesn't
    // implement it either) instead of silently treating it as a no-op.
    for (const opKey of Object.keys(ops)) {
      if (opKey.startsWith("$") && !KNOWN_FIELD_OPS.has(opKey)) {
        throw new Error(
          `PgVectorStore: MetadataFilter operator "${opKey}" on field "${field}" is not ` +
            `supported by the pgvector adapter`,
        );
      }
    }

    const clauses: string[] = [];

    if ("$eq" in ops) {
      clauses.push(
        `${fieldJson()} = ${pushParam(values, JSON.stringify(ops.$eq))}::jsonb`,
      );
    }
    if ("$ne" in ops) {
      clauses.push(
        `${fieldJson()} IS DISTINCT FROM ${pushParam(values, JSON.stringify(ops.$ne))}::jsonb`,
      );
    }
    if ("$gt" in ops) {
      clauses.push(
        `(${fieldIsNumber()} AND ${fieldText()}::numeric > ${pushParam(values, ops.$gt)})`,
      );
    }
    if ("$gte" in ops) {
      clauses.push(
        `(${fieldIsNumber()} AND ${fieldText()}::numeric >= ${pushParam(values, ops.$gte)})`,
      );
    }
    if ("$lt" in ops) {
      clauses.push(
        `(${fieldIsNumber()} AND ${fieldText()}::numeric < ${pushParam(values, ops.$lt)})`,
      );
    }
    if ("$lte" in ops) {
      clauses.push(
        `(${fieldIsNumber()} AND ${fieldText()}::numeric <= ${pushParam(values, ops.$lte)})`,
      );
    }
    if ("$in" in ops) {
      const list = ops.$in as unknown[];
      clauses.push(
        list.length === 0
          ? "FALSE"
          : `(${fieldExists()} AND ${fieldJson()} = ANY(ARRAY[${list
              .map((v) => `${pushParam(values, JSON.stringify(v))}::jsonb`)
              .join(", ")}]))`,
      );
    }
    if ("$nin" in ops) {
      const list = ops.$nin as unknown[];
      clauses.push(
        list.length === 0
          ? "TRUE"
          : `NOT (${fieldExists()} AND ${fieldJson()} = ANY(ARRAY[${list
              .map((v) => `${pushParam(values, JSON.stringify(v))}::jsonb`)
              .join(", ")}]))`,
      );
    }
    if ("$exists" in ops) {
      clauses.push(ops.$exists ? fieldExists() : `NOT ${fieldExists()}`);
    }
    if ("$contains" in ops) {
      clauses.push(
        `(${fieldIsString()} AND position(${pushParam(values, ops.$contains)} in ${fieldText()}) > 0)`,
      );
    }
    if ("$regex" in ops) {
      const pattern = ops.$regex as string;
      // Guard mirrors the reference's ReDoS guard: over-length or invalid
      // patterns never match, they don't error the whole query.
      if (pattern.length > 200 || !isValidRegex(pattern)) {
        clauses.push("FALSE");
      } else {
        clauses.push(
          `(${fieldIsString()} AND ${fieldText()} ~ ${pushParam(values, pattern)})`,
        );
      }
    }

    return clauses.length > 0 ? clauses.join(" AND ") : "TRUE";
  }

  // Direct equality (primitive, array, or null filter value).
  return `${fieldJson()} = ${pushParam(values, JSON.stringify(value))}::jsonb`;
}

function isValidRegex(pattern: string): boolean {
  try {
    RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

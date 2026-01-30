/**
 * Unit tests for embedded vector store implementations
 * Tests Lance, DuckDB, and LibSQL vector stores
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VectorStoreName } from "../../../src/lib/types/vectorTypes.js";
import {
  translateToLance,
  translateToDuckDB,
  translateToLibSQL,
} from "../../../src/lib/stores/filterTranslator.js";

// ============================================
// Filter Translation Tests
// ============================================

describe("Lance Filter Translation", () => {
  it("should translate simple equality filter", () => {
    const filter = { category: "tech" };
    const result = translateToLance(filter);
    expect(result).toBe("category = 'tech'");
  });

  it("should translate numeric equality", () => {
    const filter = { score: 100 };
    const result = translateToLance(filter);
    expect(result).toBe("score = 100");
  });

  it("should translate $eq operator", () => {
    const filter = { category: { $eq: "tech" } };
    const result = translateToLance(filter);
    expect(result).toBe("category = 'tech'");
  });

  it("should translate $ne operator", () => {
    const filter = { status: { $ne: "deleted" } };
    const result = translateToLance(filter);
    expect(result).toBe("status != 'deleted'");
  });

  it("should translate comparison operators", () => {
    const filter = { price: { $gt: 100 } };
    const result = translateToLance(filter);
    expect(result).toBe("price > 100");
  });

  it("should translate $in operator", () => {
    const filter = { category: { $in: ["tech", "science"] } };
    const result = translateToLance(filter);
    expect(result).toBe("category IN ('tech', 'science')");
  });

  it("should translate $and operator", () => {
    const filter = {
      $and: [{ category: "tech" }, { status: "active" }],
    };
    const result = translateToLance(filter);
    expect(result).toBe("(category = 'tech' AND status = 'active')");
  });

  it("should translate $or operator", () => {
    const filter = {
      $or: [{ category: "tech" }, { featured: true }],
    };
    const result = translateToLance(filter);
    expect(result).toBe("(category = 'tech' OR featured = true)");
  });

  it("should translate $not operator", () => {
    const filter = { $not: { status: "deleted" } };
    const result = translateToLance(filter);
    expect(result).toBe("NOT (status = 'deleted')");
  });

  it("should translate $contains operator", () => {
    const filter = { description: { $contains: "vector" } };
    const result = translateToLance(filter);
    expect(result).toBe("description LIKE '%vector%'");
  });

  it("should escape single quotes in values", () => {
    const filter = { name: "O'Reilly" };
    const result = translateToLance(filter);
    expect(result).toBe("name = 'O''Reilly'");
  });
});

describe("DuckDB Filter Translation", () => {
  it("should translate simple equality filter", () => {
    const filter = { category: "tech" };
    const result = translateToDuckDB(filter);
    expect(result.sql).toBe("metadata->>'category' = $1");
    expect(result.params).toEqual(["tech"]);
  });

  it("should translate numeric equality", () => {
    const filter = { score: 100 };
    const result = translateToDuckDB(filter);
    expect(result.sql).toBe("CAST(metadata->>'score' AS DOUBLE) = $1");
    expect(result.params).toEqual([100]);
  });

  it("should translate $eq operator", () => {
    const filter = { category: { $eq: "tech" } };
    const result = translateToDuckDB(filter);
    expect(result.sql).toBe("metadata->>'category' = $1");
    expect(result.params).toEqual(["tech"]);
  });

  it("should translate comparison operators", () => {
    const filter = { price: { $gt: 100 } };
    const result = translateToDuckDB(filter);
    expect(result.sql).toBe("CAST(metadata->>'price' AS DOUBLE) > $1");
    expect(result.params).toEqual([100]);
  });

  it("should translate $in operator", () => {
    const filter = { category: { $in: ["tech", "science"] } };
    const result = translateToDuckDB(filter);
    expect(result.sql).toBe(
      "metadata->>'category' IN (SELECT UNNEST($1::TEXT[]))",
    );
  });

  it("should translate $and operator", () => {
    const filter = {
      $and: [{ category: "tech" }, { status: "active" }],
    };
    const result = translateToDuckDB(filter);
    expect(result.sql).toContain("AND");
  });

  it("should translate $or operator", () => {
    const filter = {
      $or: [{ category: "tech" }, { featured: true }],
    };
    const result = translateToDuckDB(filter);
    expect(result.sql).toContain("OR");
  });

  it("should translate $not operator", () => {
    const filter = { $not: { status: "deleted" } };
    const result = translateToDuckDB(filter);
    expect(result.sql).toContain("NOT");
  });

  it("should translate $contains operator", () => {
    const filter = { description: { $contains: "vector" } };
    const result = translateToDuckDB(filter);
    expect(result.sql).toBe("metadata->>'description' LIKE $1");
    expect(result.params).toEqual(["%vector%"]);
  });

  it("should handle empty filter", () => {
    const filter = {};
    const result = translateToDuckDB(filter);
    expect(result.sql).toBe("TRUE");
    expect(result.params).toEqual([]);
  });
});

describe("LibSQL Filter Translation", () => {
  it("should translate simple equality filter", () => {
    const filter = { category: "tech" };
    const result = translateToLibSQL(filter);
    expect(result.sql).toBe("json_extract(metadata, '$.category') = ?");
    expect(result.params).toEqual(["tech"]);
  });

  it("should translate numeric equality", () => {
    const filter = { score: 100 };
    const result = translateToLibSQL(filter);
    expect(result.sql).toBe("json_extract(metadata, '$.score') = ?");
    expect(result.params).toEqual([100]);
  });

  it("should translate boolean equality", () => {
    const filter = { featured: true };
    const result = translateToLibSQL(filter);
    expect(result.sql).toBe("json_extract(metadata, '$.featured') = ?");
    expect(result.params).toEqual([1]); // SQLite stores booleans as 0/1
  });

  it("should translate $eq operator", () => {
    const filter = { category: { $eq: "tech" } };
    const result = translateToLibSQL(filter);
    expect(result.sql).toBe("json_extract(metadata, '$.category') = ?");
    expect(result.params).toEqual(["tech"]);
  });

  it("should translate comparison operators", () => {
    const filter = { price: { $gt: 100 } };
    const result = translateToLibSQL(filter);
    expect(result.sql).toBe("json_extract(metadata, '$.price') > ?");
    expect(result.params).toEqual([100]);
  });

  it("should translate $in operator with placeholders", () => {
    const filter = { category: { $in: ["tech", "science"] } };
    const result = translateToLibSQL(filter);
    expect(result.sql).toBe("json_extract(metadata, '$.category') IN (?, ?)");
    expect(result.params).toEqual(["tech", "science"]);
  });

  it("should translate $and operator", () => {
    const filter = {
      $and: [{ category: "tech" }, { status: "active" }],
    };
    const result = translateToLibSQL(filter);
    expect(result.sql).toContain("AND");
    expect(result.params.length).toBe(2);
  });

  it("should translate $or operator", () => {
    const filter = {
      $or: [{ category: "tech" }, { featured: true }],
    };
    const result = translateToLibSQL(filter);
    expect(result.sql).toContain("OR");
  });

  it("should translate $not operator", () => {
    const filter = { $not: { status: "deleted" } };
    const result = translateToLibSQL(filter);
    expect(result.sql).toContain("NOT");
  });

  it("should translate $contains operator", () => {
    const filter = { description: { $contains: "vector" } };
    const result = translateToLibSQL(filter);
    expect(result.sql).toBe("json_extract(metadata, '$.description') LIKE ?");
    expect(result.params).toEqual(["%vector%"]);
  });

  it("should translate $exists operator", () => {
    const filter = { optionalField: { $exists: true } };
    const result = translateToLibSQL(filter);
    expect(result.sql).toBe(
      "json_extract(metadata, '$.optionalField') IS NOT NULL",
    );
    expect(result.params).toEqual([]);
  });

  it("should handle empty filter", () => {
    const filter = {};
    const result = translateToLibSQL(filter);
    expect(result.sql).toBe("TRUE");
    expect(result.params).toEqual([]);
  });
});

// ============================================
// Store Configuration Tests
// ============================================

describe("Lance Store Configuration", () => {
  it("should have correct store name in enum", () => {
    expect(VectorStoreName.LANCE).toBe("lance");
  });
});

describe("DuckDB Store Configuration", () => {
  it("should have correct store name in enum", () => {
    expect(VectorStoreName.DUCKDB).toBe("duckdb");
  });
});

describe("LibSQL Store Configuration", () => {
  it("should have correct store name in enum", () => {
    expect(VectorStoreName.LIBSQL).toBe("libsql");
  });
});

// ============================================
// Complex Filter Tests
// ============================================

describe("Complex Filter Scenarios", () => {
  it("Lance: should handle nested $and and $or", () => {
    const filter = {
      $and: [
        { $or: [{ category: "tech" }, { category: "science" }] },
        { status: "active" },
      ],
    };
    const result = translateToLance(filter);
    expect(result).toContain("AND");
    expect(result).toContain("OR");
  });

  it("DuckDB: should handle multiple conditions", () => {
    const filter = {
      category: "tech",
      status: "active",
      price: { $gte: 10 },
    };
    const result = translateToDuckDB(filter);
    expect(result.sql).toContain("AND");
    expect(result.params.length).toBe(3);
  });

  it("LibSQL: should handle combined comparison operators", () => {
    const filter = {
      price: { $gte: 10 },
      score: { $lte: 100 },
    };
    const result = translateToLibSQL(filter);
    expect(result.sql).toContain(">=");
    expect(result.sql).toContain("<=");
    expect(result.params).toEqual([10, 100]);
  });
});

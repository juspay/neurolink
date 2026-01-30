/**
 * Filter Translator Tests
 */

import { describe, expect, it } from "vitest";
import {
  translateToChroma,
  translateToCouchbase,
  translateToMarqo,
  translateToPgvector,
  translateToPinecone,
  translateToQdrant,
  translateToVespa,
} from "../../../src/lib/stores/filterTranslator.js";

describe("Filter Translators", () => {
  describe("translateToPinecone", () => {
    it("should translate simple equality filter", () => {
      const filter = { category: "tech" };
      const result = translateToPinecone(filter);
      expect(result).toEqual({ category: { $eq: "tech" } });
    });

    it("should translate field filter with operators", () => {
      const filter = { price: { $gte: 100, $lte: 500 } };
      const result = translateToPinecone(filter);
      expect(result).toEqual({ price: { $gte: 100, $lte: 500 } });
    });

    it("should translate $and operator", () => {
      const filter = {
        $and: [{ category: "tech" }, { status: "active" }],
      };
      const result = translateToPinecone(filter);
      expect(result["$and"]).toHaveLength(2);
    });

    it("should translate $or operator", () => {
      const filter = {
        $or: [{ category: "tech" }, { featured: true }],
      };
      const result = translateToPinecone(filter);
      expect(result["$or"]).toHaveLength(2);
    });

    it("should translate $in operator", () => {
      const filter = { category: { $in: ["tech", "science"] } };
      const result = translateToPinecone(filter);
      expect(result).toEqual({ category: { $in: ["tech", "science"] } });
    });
  });

  describe("translateToQdrant", () => {
    it("should translate simple equality filter", () => {
      const filter = { category: "tech" };
      const result = translateToQdrant(filter);
      expect(result).toEqual({ key: "category", match: { value: "tech" } });
    });

    it("should translate $gt operator to range", () => {
      const filter = { price: { $gt: 100 } };
      const result = translateToQdrant(filter);
      expect(result).toEqual({ key: "price", range: { gt: 100 } });
    });

    it("should translate $and operator to must", () => {
      const filter = {
        $and: [{ category: "tech" }, { status: "active" }],
      };
      const result = translateToQdrant(filter) as { must: unknown[] };
      expect(result.must).toBeDefined();
    });

    it("should translate $or operator to should", () => {
      const filter = {
        $or: [{ category: "tech" }, { featured: true }],
      };
      const result = translateToQdrant(filter) as {
        should: unknown[];
        min_should_match: number;
      };
      expect(result.should).toBeDefined();
      expect(result.min_should_match).toBe(1);
    });

    it("should translate $in operator to match any", () => {
      const filter = { category: { $in: ["tech", "science"] } };
      const result = translateToQdrant(filter);
      expect(result).toEqual({
        key: "category",
        match: { any: ["tech", "science"] },
      });
    });
  });

  describe("translateToPgvector", () => {
    it("should translate simple equality filter", () => {
      const filter = { category: "tech" };
      const result = translateToPgvector(filter, 1);
      expect(result.sql).toBe("metadata->>'category' = $1");
      expect(result.params).toEqual(["tech"]);
      expect(result.nextIndex).toBe(2);
    });

    it("should translate numeric comparison", () => {
      const filter = { price: { $gt: 100 } };
      const result = translateToPgvector(filter, 1);
      expect(result.sql).toBe("(metadata->>'price')::numeric > $1");
      expect(result.params).toEqual([100]);
    });

    it("should translate $and operator", () => {
      const filter = {
        $and: [{ category: "tech" }, { status: "active" }],
      };
      const result = translateToPgvector(filter, 1);
      expect(result.sql).toContain("AND");
      expect(result.params).toContain("tech");
      expect(result.params).toContain("active");
    });

    it("should translate $or operator", () => {
      const filter = {
        $or: [{ category: "tech" }, { featured: true }],
      };
      const result = translateToPgvector(filter, 1);
      expect(result.sql).toContain("OR");
    });

    it("should translate $contains to ILIKE", () => {
      const filter = { name: { $contains: "test" } };
      const result = translateToPgvector(filter, 1);
      expect(result.sql).toBe("metadata->>'name' ILIKE $1");
      expect(result.params).toEqual(["%test%"]);
    });

    it("should translate $in to ANY", () => {
      const filter = { category: { $in: ["tech", "science"] } };
      const result = translateToPgvector(filter, 1);
      expect(result.sql).toBe("metadata->>'category' = ANY($1)");
    });

    it("should handle multiple conditions correctly", () => {
      const filter = {
        category: "tech",
        status: "active",
      };
      const result = translateToPgvector(filter, 1);
      expect(result.sql).toContain("AND");
      expect(result.params.length).toBe(2);
    });
  });

  describe("translateToChroma", () => {
    it("should translate simple equality filter", () => {
      const filter = { category: "tech" };
      const result = translateToChroma(filter);
      expect(result).toEqual({ category: { $eq: "tech" } });
    });

    it("should translate field filter with operators", () => {
      const filter = { price: { $gte: 100 } };
      const result = translateToChroma(filter);
      expect(result).toEqual({ price: { $gte: 100 } });
    });

    it("should translate $and operator", () => {
      const filter = {
        $and: [{ category: "tech" }, { status: "active" }],
      };
      const result = translateToChroma(filter);
      expect(result["$and"]).toHaveLength(2);
    });

    it("should translate $or operator", () => {
      const filter = {
        $or: [{ category: "tech" }, { featured: true }],
      };
      const result = translateToChroma(filter);
      expect(result["$or"]).toHaveLength(2);
    });
  });

  describe("translateToCouchbase", () => {
    it("should translate simple equality filter", () => {
      const filter = { category: "tech" };
      const result = translateToCouchbase(filter, 1);
      expect(result.sql).toBe("metadata.category = $1");
      expect(result.params).toEqual(["tech"]);
      expect(result.nextIndex).toBe(2);
    });

    it("should translate field filter with operators", () => {
      const filter = { price: { $gt: 100 } };
      const result = translateToCouchbase(filter, 1);
      expect(result.sql).toBe("metadata.price > $1");
      expect(result.params).toEqual([100]);
    });

    it("should translate $and operator", () => {
      const filter = {
        $and: [{ category: "tech" }, { status: "active" }],
      };
      const result = translateToCouchbase(filter, 1);
      expect(result.sql).toContain("AND");
      expect(result.params).toContain("tech");
      expect(result.params).toContain("active");
    });

    it("should translate $or operator", () => {
      const filter = {
        $or: [{ category: "tech" }, { featured: true }],
      };
      const result = translateToCouchbase(filter, 1);
      expect(result.sql).toContain("OR");
    });

    it("should translate $in operator", () => {
      const filter = { category: { $in: ["tech", "science"] } };
      const result = translateToCouchbase(filter, 1);
      expect(result.sql).toBe("metadata.category IN $1");
    });

    it("should translate $contains operator", () => {
      const filter = { name: { $contains: "test" } };
      const result = translateToCouchbase(filter, 1);
      expect(result.sql).toBe("CONTAINS(metadata.name, $1)");
      expect(result.params).toEqual(["test"]);
    });

    it("should translate $exists operator", () => {
      const filter = { name: { $exists: true } };
      const result = translateToCouchbase(filter, 1);
      expect(result.sql).toBe("metadata.name IS NOT MISSING");
    });
  });

  describe("translateToVespa", () => {
    it("should translate simple equality filter for strings", () => {
      const filter = { category: "tech" };
      const result = translateToVespa(filter);
      expect(result).toBe('metadata.category contains "tech"');
    });

    it("should translate simple equality filter for numbers", () => {
      const filter = { count: 42 };
      const result = translateToVespa(filter);
      expect(result).toBe("metadata.count = 42");
    });

    it("should translate field filter with operators", () => {
      const filter = { price: { $gt: 100 } };
      const result = translateToVespa(filter);
      expect(result).toBe("metadata.price > 100");
    });

    it("should translate $and operator", () => {
      const filter = {
        $and: [{ category: "tech" }, { count: 5 }],
      };
      const result = translateToVespa(filter);
      expect(result).toContain(" and ");
    });

    it("should translate $or operator", () => {
      const filter = {
        $or: [{ category: "tech" }, { featured: true }],
      };
      const result = translateToVespa(filter);
      expect(result).toContain(" or ");
    });

    it("should translate $not operator", () => {
      const filter = {
        $not: { category: "tech" },
      };
      const result = translateToVespa(filter);
      expect(result).toContain("!");
    });

    it("should translate $in operator", () => {
      const filter = { category: { $in: ["tech", "science"] } };
      const result = translateToVespa(filter);
      expect(result).toContain(" or ");
      expect(result).toContain("tech");
      expect(result).toContain("science");
    });

    it("should translate $contains operator", () => {
      const filter = { name: { $contains: "test" } };
      const result = translateToVespa(filter);
      expect(result).toBe('metadata.name contains "*test*"');
    });
  });

  describe("translateToMarqo", () => {
    it("should translate simple equality filter", () => {
      const filter = { category: "tech" };
      const result = translateToMarqo(filter);
      expect(result).toBe("metadata.category:(tech)");
    });

    it("should translate field filter with operators", () => {
      const filter = { price: { $gt: 100 } };
      const result = translateToMarqo(filter);
      expect(result).toBe("metadata.price:>100");
    });

    it("should translate $gte operator", () => {
      const filter = { price: { $gte: 100 } };
      const result = translateToMarqo(filter);
      expect(result).toBe("metadata.price:>=100");
    });

    it("should translate $lt operator", () => {
      const filter = { price: { $lt: 100 } };
      const result = translateToMarqo(filter);
      expect(result).toBe("metadata.price:<100");
    });

    it("should translate $and operator", () => {
      const filter = {
        $and: [{ category: "tech" }, { status: "active" }],
      };
      const result = translateToMarqo(filter);
      expect(result).toContain(" AND ");
    });

    it("should translate $or operator", () => {
      const filter = {
        $or: [{ category: "tech" }, { featured: true }],
      };
      const result = translateToMarqo(filter);
      expect(result).toContain(" OR ");
    });

    it("should translate $not operator", () => {
      const filter = {
        $not: { category: "tech" },
      };
      const result = translateToMarqo(filter);
      expect(result).toContain("NOT");
    });

    it("should translate $ne operator", () => {
      const filter = { category: { $ne: "tech" } };
      const result = translateToMarqo(filter);
      expect(result).toBe("NOT metadata.category:(tech)");
    });

    it("should translate $in operator", () => {
      const filter = { category: { $in: ["tech", "science"] } };
      const result = translateToMarqo(filter);
      expect(result).toContain(" OR ");
      expect(result).toContain("tech");
      expect(result).toContain("science");
    });

    it("should translate $contains operator with wildcards", () => {
      const filter = { name: { $contains: "test" } };
      const result = translateToMarqo(filter);
      expect(result).toBe("metadata.name:(*test*)");
    });

    it("should translate $startsWith operator", () => {
      const filter = { name: { $startsWith: "test" } };
      const result = translateToMarqo(filter);
      expect(result).toBe("metadata.name:(test*)");
    });

    it("should translate $endsWith operator", () => {
      const filter = { name: { $endsWith: "test" } };
      const result = translateToMarqo(filter);
      expect(result).toBe("metadata.name:(*test)");
    });

    it("should translate $exists operator", () => {
      const filter = { name: { $exists: true } };
      const result = translateToMarqo(filter);
      expect(result).toBe("metadata.name:*");
    });

    it("should translate $exists false operator", () => {
      const filter = { name: { $exists: false } };
      const result = translateToMarqo(filter);
      expect(result).toBe("NOT metadata.name:*");
    });
  });
});

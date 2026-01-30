/**
 * Integration tests for filter translation functions
 * Tests translation of unified filter DSL to provider-specific formats
 */

import { describe, it, expect } from "vitest";
import {
  translateToPinecone,
  translateToQdrant,
  translateToPgvector,
  translateToChroma,
  translateToMilvus,
  translateToWeaviate,
  translateToCouchbase,
  translateToVespa,
  translateToMarqo,
} from "../../../src/lib/stores/filterTranslator.js";
import type { MetadataFilter } from "../../../src/lib/types/vectorFilterTypes.js";

describe("Filter Translation", () => {
  describe("translateToPinecone", () => {
    it("should translate simple equality filter", () => {
      const filter: MetadataFilter = { category: "tech" };
      const result = translateToPinecone(filter);

      expect(result).toEqual({ category: { $eq: "tech" } });
    });

    it("should translate comparison operators", () => {
      const filter: MetadataFilter = {
        price: { $gte: 100, $lte: 500 },
      };
      const result = translateToPinecone(filter);

      expect(result).toEqual({
        price: { $gte: 100, $lte: 500 },
      });
    });

    it("should translate $and operator", () => {
      const filter: MetadataFilter = {
        $and: [{ category: "tech" }, { status: "active" }],
      };
      const result = translateToPinecone(filter);

      expect(result).toEqual({
        $and: [{ category: { $eq: "tech" } }, { status: { $eq: "active" } }],
      });
    });

    it("should translate $or operator", () => {
      const filter: MetadataFilter = {
        $or: [{ category: "tech" }, { featured: true }],
      };
      const result = translateToPinecone(filter);

      expect(result).toEqual({
        $or: [{ category: { $eq: "tech" } }, { featured: { $eq: true } }],
      });
    });

    it("should translate $in operator", () => {
      const filter: MetadataFilter = {
        tags: { $in: ["ai", "ml", "nlp"] },
      };
      const result = translateToPinecone(filter);

      expect(result).toEqual({
        tags: { $in: ["ai", "ml", "nlp"] },
      });
    });
  });

  describe("translateToQdrant", () => {
    it("should translate simple equality filter", () => {
      const filter: MetadataFilter = { category: "tech" };
      const result = translateToQdrant(filter);

      expect(result).toEqual({
        key: "category",
        match: { value: "tech" },
      });
    });

    it("should translate range filters", () => {
      const filter: MetadataFilter = {
        price: { $gte: 100 },
      };
      const result = translateToQdrant(filter);

      expect(result).toEqual({
        key: "price",
        range: { gte: 100 },
      });
    });

    it("should translate $and with multiple conditions", () => {
      const filter: MetadataFilter = {
        $and: [{ category: "tech" }, { status: "active" }],
      };
      const result = translateToQdrant(filter);

      expect(result).toHaveProperty("must");
    });

    it("should translate $or operator", () => {
      const filter: MetadataFilter = {
        $or: [{ category: "tech" }, { category: "science" }],
      };
      const result = translateToQdrant(filter);

      expect(result).toHaveProperty("should");
    });

    it("should translate $not operator", () => {
      const filter: MetadataFilter = {
        $not: { status: "deleted" },
      };
      const result = translateToQdrant(filter);

      expect(result).toHaveProperty("must_not");
    });
  });

  describe("translateToPgvector", () => {
    it("should translate simple equality filter with parameters", () => {
      const filter: MetadataFilter = { category: "tech" };
      const result = translateToPgvector(filter);

      expect(result.sql).toBe("metadata->>'category' = $1");
      expect(result.params).toEqual(["tech"]);
      expect(result.nextIndex).toBe(2);
    });

    it("should handle numeric comparisons", () => {
      const filter: MetadataFilter = { price: { $gt: 100 } };
      const result = translateToPgvector(filter);

      expect(result.sql).toContain("::numeric >");
      expect(result.params).toContain(100);
    });

    it("should translate $and with proper SQL AND", () => {
      const filter: MetadataFilter = {
        $and: [{ category: "tech" }, { status: "active" }],
      };
      const result = translateToPgvector(filter);

      expect(result.sql).toContain("AND");
      expect(result.params.length).toBe(2);
    });

    it("should translate $or with proper SQL OR", () => {
      const filter: MetadataFilter = {
        $or: [{ category: "tech" }, { category: "science" }],
      };
      const result = translateToPgvector(filter);

      expect(result.sql).toContain("OR");
    });

    it("should handle $contains with ILIKE", () => {
      const filter: MetadataFilter = {
        name: { $contains: "test" },
      };
      const result = translateToPgvector(filter);

      expect(result.sql).toContain("ILIKE");
      expect(result.params).toContain("%test%");
    });
  });

  describe("translateToChroma", () => {
    it("should translate simple equality filter", () => {
      const filter: MetadataFilter = { category: "tech" };
      const result = translateToChroma(filter);

      expect(result).toEqual({ category: { $eq: "tech" } });
    });

    it("should translate $and operator", () => {
      const filter: MetadataFilter = {
        $and: [{ category: "tech" }, { active: true }],
      };
      const result = translateToChroma(filter);

      expect(result).toHaveProperty("$and");
      expect(result.$and).toHaveLength(2);
    });
  });

  describe("translateToMilvus", () => {
    it("should translate simple equality to Milvus expression", () => {
      const filter: MetadataFilter = { category: "tech" };
      const result = translateToMilvus(filter);

      expect(result).toBe('category == "tech"');
    });

    it("should translate numeric comparison", () => {
      const filter: MetadataFilter = { price: { $gt: 100 } };
      const result = translateToMilvus(filter);

      expect(result).toBe("price > 100");
    });

    it("should translate $and with &&", () => {
      const filter: MetadataFilter = {
        $and: [{ category: "tech" }, { active: true }],
      };
      const result = translateToMilvus(filter);

      expect(result).toContain("&&");
    });

    it("should translate $or with ||", () => {
      const filter: MetadataFilter = {
        $or: [{ category: "tech" }, { category: "science" }],
      };
      const result = translateToMilvus(filter);

      expect(result).toContain("||");
    });

    it("should translate $in operator", () => {
      const filter: MetadataFilter = {
        tags: { $in: ["ai", "ml"] },
      };
      const result = translateToMilvus(filter);

      expect(result).toContain("in [");
    });
  });

  describe("translateToWeaviate", () => {
    it("should translate simple equality", () => {
      const filter: MetadataFilter = { category: "tech" };
      const result = translateToWeaviate(filter);

      expect(result).toHaveProperty("path", ["category"]);
      expect(result).toHaveProperty("operator", "Equal");
    });

    it("should translate comparison operators", () => {
      const filter: MetadataFilter = { price: { $gt: 100 } };
      const result = translateToWeaviate(filter);

      expect(result).toHaveProperty("operator", "GreaterThan");
    });

    it("should translate $and operator", () => {
      const filter: MetadataFilter = {
        $and: [{ category: "tech" }, { active: true }],
      };
      const result = translateToWeaviate(filter);

      expect(result).toHaveProperty("operator", "And");
      expect(result).toHaveProperty("operands");
    });
  });

  describe("translateToCouchbase", () => {
    it("should translate simple equality with parameterized query", () => {
      const filter: MetadataFilter = { category: "tech" };
      const result = translateToCouchbase(filter);

      expect(result.sql).toContain("metadata.category = $1");
      expect(result.params).toContain("tech");
    });

    it("should translate comparison operators", () => {
      const filter: MetadataFilter = { price: { $gt: 100 } };
      const result = translateToCouchbase(filter);

      expect(result.sql).toContain(">");
      expect(result.params).toContain(100);
    });

    it("should translate $and with SQL AND", () => {
      const filter: MetadataFilter = {
        $and: [{ category: "tech" }, { status: "active" }],
      };
      const result = translateToCouchbase(filter);

      expect(result.sql).toContain("AND");
    });

    it("should translate $or with SQL OR", () => {
      const filter: MetadataFilter = {
        $or: [{ category: "tech" }, { category: "science" }],
      };
      const result = translateToCouchbase(filter);

      expect(result.sql).toContain("OR");
    });

    it("should translate $in operator", () => {
      const filter: MetadataFilter = {
        tags: { $in: ["ai", "ml"] },
      };
      const result = translateToCouchbase(filter);

      expect(result.sql).toContain("IN");
    });

    it("should translate $exists operator", () => {
      const filter: MetadataFilter = {
        optionalField: { $exists: true },
      };
      const result = translateToCouchbase(filter);

      expect(result.sql).toContain("IS NOT MISSING");
    });
  });

  describe("translateToVespa", () => {
    it("should translate simple equality to YQL", () => {
      const filter: MetadataFilter = { category: "tech" };
      const result = translateToVespa(filter);

      expect(result).toContain('metadata.category contains "tech"');
    });

    it("should translate numeric comparison", () => {
      const filter: MetadataFilter = { price: { $gt: 100 } };
      const result = translateToVespa(filter);

      expect(result).toContain("metadata.price > 100");
    });

    it("should translate $and with YQL and", () => {
      const filter: MetadataFilter = {
        $and: [{ category: "tech" }, { active: true }],
      };
      const result = translateToVespa(filter);

      expect(result).toContain(" and ");
    });

    it("should translate $or with YQL or", () => {
      const filter: MetadataFilter = {
        $or: [{ category: "tech" }, { category: "science" }],
      };
      const result = translateToVespa(filter);

      expect(result).toContain(" or ");
    });

    it("should translate $not with negation", () => {
      const filter: MetadataFilter = {
        $not: { status: "deleted" },
      };
      const result = translateToVespa(filter);

      expect(result).toContain("!(");
    });

    it("should translate $in with multiple or conditions", () => {
      const filter: MetadataFilter = {
        tags: { $in: ["ai", "ml"] },
      };
      const result = translateToVespa(filter);

      expect(result).toContain(" or ");
      expect(result).toContain('"ai"');
      expect(result).toContain('"ml"');
    });
  });

  describe("translateToMarqo", () => {
    it("should translate simple equality to Marqo format", () => {
      const filter: MetadataFilter = { category: "tech" };
      const result = translateToMarqo(filter);

      expect(result).toContain("metadata.category:(tech)");
    });

    it("should translate comparison operators", () => {
      const filter: MetadataFilter = { price: { $gt: 100 } };
      const result = translateToMarqo(filter);

      expect(result).toContain("metadata.price:>100");
    });

    it("should translate $gte operator", () => {
      const filter: MetadataFilter = { price: { $gte: 100 } };
      const result = translateToMarqo(filter);

      expect(result).toContain("metadata.price:>=100");
    });

    it("should translate $lt operator", () => {
      const filter: MetadataFilter = { price: { $lt: 100 } };
      const result = translateToMarqo(filter);

      expect(result).toContain("metadata.price:<100");
    });

    it("should translate $and with AND", () => {
      const filter: MetadataFilter = {
        $and: [{ category: "tech" }, { active: true }],
      };
      const result = translateToMarqo(filter);

      expect(result).toContain(" AND ");
    });

    it("should translate $or with OR", () => {
      const filter: MetadataFilter = {
        $or: [{ category: "tech" }, { category: "science" }],
      };
      const result = translateToMarqo(filter);

      expect(result).toContain(" OR ");
    });

    it("should translate $not with NOT", () => {
      const filter: MetadataFilter = {
        $not: { status: "deleted" },
      };
      const result = translateToMarqo(filter);

      expect(result).toContain("NOT");
    });

    it("should translate $ne with NOT", () => {
      const filter: MetadataFilter = {
        status: { $ne: "deleted" },
      };
      const result = translateToMarqo(filter);

      expect(result).toContain("NOT metadata.status:(deleted)");
    });

    it("should translate $in with multiple OR conditions", () => {
      const filter: MetadataFilter = {
        tags: { $in: ["ai", "ml"] },
      };
      const result = translateToMarqo(filter);

      expect(result).toContain(" OR ");
      expect(result).toContain("metadata.tags:(ai)");
      expect(result).toContain("metadata.tags:(ml)");
    });

    it("should translate $contains with wildcards", () => {
      const filter: MetadataFilter = {
        name: { $contains: "test" },
      };
      const result = translateToMarqo(filter);

      expect(result).toContain("*test*");
    });

    it("should translate $exists operator", () => {
      const filter: MetadataFilter = {
        optionalField: { $exists: true },
      };
      const result = translateToMarqo(filter);

      expect(result).toContain("metadata.optionalField:*");
    });

    it("should translate $exists false with NOT", () => {
      const filter: MetadataFilter = {
        optionalField: { $exists: false },
      };
      const result = translateToMarqo(filter);

      expect(result).toContain("NOT metadata.optionalField:*");
    });
  });

  describe("Complex Nested Filters", () => {
    const complexFilter: MetadataFilter = {
      $and: [
        { category: "tech" },
        {
          $or: [{ price: { $lt: 100 } }, { featured: true }],
        },
        { status: { $nin: ["deleted", "archived"] } },
      ],
    };

    it("should handle complex filters in Pinecone format", () => {
      const result = translateToPinecone(complexFilter);
      expect(result.$and).toBeDefined();
      expect(result.$and).toHaveLength(3);
    });

    it("should handle complex filters in Qdrant format", () => {
      const result = translateToQdrant(complexFilter);
      expect(result).toHaveProperty("must");
    });

    it("should handle complex filters in pgvector format", () => {
      const result = translateToPgvector(complexFilter);
      expect(result.sql).toContain("AND");
      expect(result.sql).toContain("OR");
    });

    it("should handle complex filters in Milvus format", () => {
      const result = translateToMilvus(complexFilter);
      expect(result).toContain("&&");
      expect(result).toContain("||");
    });
  });
});

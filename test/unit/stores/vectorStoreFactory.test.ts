/**
 * Vector Store Factory Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VectorStoreFactory } from "../../../src/lib/stores/vectorStoreFactory.js";
import { VectorStoreName } from "../../../src/lib/types/vectorTypes.js";

describe("VectorStoreFactory", () => {
  beforeEach(() => {
    VectorStoreFactory.clearRegistrations();
  });

  afterEach(() => {
    VectorStoreFactory.clearRegistrations();
  });

  describe("registerStore", () => {
    it("should register a store with the factory", async () => {
      const mockFactory = vi.fn().mockResolvedValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
      });

      VectorStoreFactory.registerStore(VectorStoreName.PINECONE, mockFactory, [
        "pinecone-test",
      ]);

      expect(VectorStoreFactory.hasStore(VectorStoreName.PINECONE)).toBe(true);
      expect(VectorStoreFactory.hasStore("pinecone-test")).toBe(true);
    });

    it("should register store with aliases (case-insensitive)", () => {
      const mockFactory = vi.fn();

      VectorStoreFactory.registerStore(VectorStoreName.PGVECTOR, mockFactory, [
        "postgres",
        "postgresql",
      ]);

      expect(VectorStoreFactory.hasStore("pgvector")).toBe(true);
      expect(VectorStoreFactory.hasStore("PGVECTOR")).toBe(true);
      expect(VectorStoreFactory.hasStore("postgres")).toBe(true);
      expect(VectorStoreFactory.hasStore("PostgreSQL")).toBe(true);
    });
  });

  describe("hasStore", () => {
    it("should return false for unregistered store", () => {
      expect(VectorStoreFactory.hasStore("nonexistent")).toBe(false);
    });
  });

  describe("getAvailableStores", () => {
    it("should return empty array when no stores registered", () => {
      const stores = VectorStoreFactory.getAvailableStores();
      expect(stores).toEqual([]);
    });

    it("should return unique store names", () => {
      VectorStoreFactory.registerStore(VectorStoreName.PINECONE, vi.fn(), []);
      VectorStoreFactory.registerStore(VectorStoreName.QDRANT, vi.fn(), []);

      const stores = VectorStoreFactory.getAvailableStores();
      expect(stores).toContain("pinecone");
      expect(stores).toContain("qdrant");
    });
  });

  describe("clearRegistrations", () => {
    it("should clear all registered stores", () => {
      VectorStoreFactory.registerStore(VectorStoreName.PINECONE, vi.fn(), []);
      expect(VectorStoreFactory.hasStore(VectorStoreName.PINECONE)).toBe(true);

      VectorStoreFactory.clearRegistrations();
      expect(VectorStoreFactory.hasStore(VectorStoreName.PINECONE)).toBe(false);
    });
  });

  describe("unregisterStore", () => {
    it("should unregister a store and its aliases", () => {
      VectorStoreFactory.registerStore(VectorStoreName.QDRANT, vi.fn(), [
        "qdrant-cloud",
      ]);

      expect(VectorStoreFactory.hasStore("qdrant")).toBe(true);
      expect(VectorStoreFactory.hasStore("qdrant-cloud")).toBe(true);

      VectorStoreFactory.unregisterStore("qdrant");

      expect(VectorStoreFactory.hasStore("qdrant")).toBe(false);
      expect(VectorStoreFactory.hasStore("qdrant-cloud")).toBe(false);
    });
  });
});

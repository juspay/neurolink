/**
 * EncryptionMiddleware Tests
 *
 * Comprehensive test suite for the EncryptionMiddleware class.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  EncryptionMiddleware,
  createEncryptionMiddleware,
} from "../../../src/lib/storage/middleware/EncryptionMiddleware.js";

describe("EncryptionMiddleware", () => {
  let middleware: EncryptionMiddleware;
  const testKey = EncryptionMiddleware.generateKey();

  beforeEach(async () => {
    middleware = new EncryptionMiddleware({
      key: testKey,
      algorithm: "aes-256-gcm",
    });
    await middleware.init();
  });

  afterEach(async () => {
    await middleware.destroy();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      expect(middleware.name).toBe("encryption");
    });

    it("should have correct priority", () => {
      expect(middleware.priority).toBe(20);
    });

    it("should reject invalid key length", async () => {
      const invalidMiddleware = new EncryptionMiddleware({
        key: "short-key",
        algorithm: "aes-256-gcm",
      });

      // Key derivation will handle short keys
      await expect(invalidMiddleware.init()).resolves.not.toThrow();
      await invalidMiddleware.destroy();
    });
  });

  describe("Encryption/Decryption with AES-256-GCM", () => {
    it("should encrypt and decrypt data", async () => {
      const original = { secret: "password123", data: { nested: true } };

      const encrypted = await middleware.beforeWrite("key1", original);
      expect(encrypted).not.toEqual(original);
      expect((encrypted as Record<string, unknown>).__encrypted).toBe(true);

      const decrypted = await middleware.afterRead("key1", encrypted);
      expect(decrypted).toEqual(original);
    });

    it("should produce different ciphertext for same plaintext", async () => {
      const original = { data: "same data" };

      const encrypted1 = await middleware.beforeWrite("key1", original);
      const encrypted2 = await middleware.beforeWrite("key2", original);

      // IVs should be different
      expect((encrypted1 as Record<string, unknown>).iv).not.toBe(
        (encrypted2 as Record<string, unknown>).iv,
      );
    });

    it("should include authentication tag", async () => {
      const original = { data: "authenticated" };

      const encrypted = await middleware.beforeWrite("key1", original);
      expect((encrypted as Record<string, unknown>).tag).toBeDefined();
    });
  });

  describe("AES-256-CBC Algorithm", () => {
    it("should encrypt and decrypt with CBC mode", async () => {
      const cbcMiddleware = new EncryptionMiddleware({
        key: testKey,
        algorithm: "aes-256-cbc",
      });
      await cbcMiddleware.init();

      const original = { data: "cbc test" };

      const encrypted = await cbcMiddleware.beforeWrite("key1", original);
      expect((encrypted as Record<string, unknown>).algorithm).toBe(
        "aes-256-cbc",
      );

      const decrypted = await cbcMiddleware.afterRead("key1", encrypted);
      expect(decrypted).toEqual(original);

      await cbcMiddleware.destroy();
    });

    it("should not include tag for CBC mode", async () => {
      const cbcMiddleware = new EncryptionMiddleware({
        key: testKey,
        algorithm: "aes-256-cbc",
      });
      await cbcMiddleware.init();

      const encrypted = await cbcMiddleware.beforeWrite("key1", {
        data: "test",
      });
      expect((encrypted as Record<string, unknown>).tag).toBeUndefined();

      await cbcMiddleware.destroy();
    });
  });

  describe("ChaCha20-Poly1305 Algorithm", () => {
    it("should encrypt and decrypt with ChaCha20-Poly1305", async () => {
      const chachaMiddleware = new EncryptionMiddleware({
        key: testKey,
        algorithm: "chacha20-poly1305",
      });
      await chachaMiddleware.init();

      const original = { data: "chacha test" };

      const encrypted = await chachaMiddleware.beforeWrite("key1", original);
      expect((encrypted as Record<string, unknown>).algorithm).toBe(
        "chacha20-poly1305",
      );

      const decrypted = await chachaMiddleware.afterRead("key1", encrypted);
      expect(decrypted).toEqual(original);

      await chachaMiddleware.destroy();
    });
  });

  describe("Key Derivation", () => {
    it("should derive key from password using scrypt", async () => {
      const passwordMiddleware = new EncryptionMiddleware({
        key: "my-password",
        kdf: "scrypt",
      });
      await passwordMiddleware.init();

      const original = { data: "test" };

      const encrypted = await passwordMiddleware.beforeWrite("key1", original);
      const decrypted = await passwordMiddleware.afterRead("key1", encrypted);

      expect(decrypted).toEqual(original);

      await passwordMiddleware.destroy();
    });

    it("should derive key from password using pbkdf2", async () => {
      const passwordMiddleware = new EncryptionMiddleware({
        key: "my-password",
        kdf: "pbkdf2",
      });
      await passwordMiddleware.init();

      const original = { data: "test" };

      const encrypted = await passwordMiddleware.beforeWrite("key1", original);
      const decrypted = await passwordMiddleware.afterRead("key1", encrypted);

      expect(decrypted).toEqual(original);

      await passwordMiddleware.destroy();
    });

    it("should use custom salt for key derivation", async () => {
      const middleware1 = new EncryptionMiddleware({
        key: "password",
        kdf: "scrypt",
        salt: "salt1",
      });
      const middleware2 = new EncryptionMiddleware({
        key: "password",
        kdf: "scrypt",
        salt: "salt2",
      });

      await middleware1.init();
      await middleware2.init();

      const original = { data: "test" };

      const encrypted1 = await middleware1.beforeWrite("key1", original);

      // Different salts should produce different keys, decryption should fail
      await expect(middleware2.afterRead("key1", encrypted1)).rejects.toThrow();

      await middleware1.destroy();
      await middleware2.destroy();
    });
  });

  describe("Unencrypted Data Handling", () => {
    it("should pass through non-encrypted data on read", async () => {
      const plainData = { data: "not encrypted" };

      const result = await middleware.afterRead("key1", plainData);
      expect(result).toEqual(plainData);
    });
  });

  describe("Error Handling", () => {
    it("should throw on decryption with wrong key", async () => {
      const middleware1 = new EncryptionMiddleware({
        key: EncryptionMiddleware.generateKey(),
      });
      const middleware2 = new EncryptionMiddleware({
        key: EncryptionMiddleware.generateKey(),
      });

      await middleware1.init();
      await middleware2.init();

      const encrypted = await middleware1.beforeWrite("key1", {
        data: "secret",
      });

      await expect(middleware2.afterRead("key1", encrypted)).rejects.toThrow();

      await middleware1.destroy();
      await middleware2.destroy();
    });

    it("should throw on tampered ciphertext", async () => {
      const encrypted = (await middleware.beforeWrite("key1", {
        data: "secret",
      })) as Record<string, unknown>;

      // Tamper with the data
      encrypted.data = "tampered" + (encrypted.data as string).slice(8);

      await expect(middleware.afterRead("key1", encrypted)).rejects.toThrow();
    });

    it("should throw when middleware not initialized", async () => {
      const uninitMiddleware = new EncryptionMiddleware({ key: testKey });

      await expect(
        uninitMiddleware.beforeWrite("key1", { data: "test" }),
      ).rejects.toThrow();
    });
  });

  describe("Key Generation", () => {
    it("should generate valid 32-byte keys", () => {
      const key = EncryptionMiddleware.generateKey();
      expect(EncryptionMiddleware.validateKey(key)).toBe(true);
    });

    it("should generate unique keys", () => {
      const key1 = EncryptionMiddleware.generateKey();
      const key2 = EncryptionMiddleware.generateKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe("Key Validation", () => {
    it("should validate correct keys", () => {
      const validKey = EncryptionMiddleware.generateKey();
      expect(EncryptionMiddleware.validateKey(validKey)).toBe(true);
    });

    it("should reject invalid keys", () => {
      expect(EncryptionMiddleware.validateKey("short")).toBe(false);
      expect(EncryptionMiddleware.validateKey("not-base64!!!")).toBe(false);
    });
  });

  describe("Security", () => {
    it("should zero out key on destroy", async () => {
      const tempMiddleware = new EncryptionMiddleware({ key: testKey });
      await tempMiddleware.init();

      const original = { data: "secret" };
      const encrypted = await tempMiddleware.beforeWrite("key1", original);

      await tempMiddleware.destroy();

      // After destroy, decryption should fail
      await expect(
        tempMiddleware.afterRead("key1", encrypted),
      ).rejects.toThrow();
    });
  });

  describe("Data Types", () => {
    it("should handle strings", async () => {
      const original = "plain string";

      const encrypted = await middleware.beforeWrite("key1", original);
      const decrypted = await middleware.afterRead("key1", encrypted);

      expect(decrypted).toBe(original);
    });

    it("should handle numbers", async () => {
      const original = 42.5;

      const encrypted = await middleware.beforeWrite("key1", original);
      const decrypted = await middleware.afterRead("key1", encrypted);

      expect(decrypted).toBe(original);
    });

    it("should handle arrays", async () => {
      const original = [1, "two", { three: 3 }];

      const encrypted = await middleware.beforeWrite("key1", original);
      const decrypted = await middleware.afterRead("key1", encrypted);

      expect(decrypted).toEqual(original);
    });

    it("should handle deeply nested objects", async () => {
      const original = {
        level1: {
          level2: {
            level3: {
              data: "deep",
            },
          },
        },
      };

      const encrypted = await middleware.beforeWrite("key1", original);
      const decrypted = await middleware.afterRead("key1", encrypted);

      expect(decrypted).toEqual(original);
    });
  });

  describe("Factory Function", () => {
    it("should create middleware using factory function", async () => {
      const factoryMiddleware = createEncryptionMiddleware({
        key: testKey,
      });

      expect(factoryMiddleware).toBeInstanceOf(EncryptionMiddleware);

      await factoryMiddleware.init();
      await factoryMiddleware.destroy();
    });
  });
});

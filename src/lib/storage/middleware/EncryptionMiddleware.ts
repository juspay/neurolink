/**
 * EncryptionMiddleware - Data Encryption Layer for Storage
 *
 * Provides transparent encryption/decryption of data before storage
 * and after retrieval. Uses AES-256-GCM by default for authenticated
 * encryption.
 *
 * Features:
 * - AES-256-GCM authenticated encryption (default)
 * - AES-256-CBC encryption
 * - ChaCha20-Poly1305 encryption
 * - Key derivation (PBKDF2, scrypt)
 * - Automatic IV/nonce generation
 *
 * @module EncryptionMiddleware
 * @since 9.0.0
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  pbkdf2Sync,
} from "crypto";
import { logger } from "../../utils/logger.js";
import { createErrorFactory } from "../../core/infrastructure/baseError.js";
import type {
  StorageMiddleware,
  EncryptionMiddlewareConfig,
} from "../../types/index.js";
import type { JsonValue } from "../../types/index.js";
import type {
  StorageEncryptionAlgorithm,
  StorageEncryptionKdf,
  StorageEncryptedPayload,
} from "../../types/index.js";

// =============================================================================
// Error Factory
// =============================================================================

const EncryptionErrors = createErrorFactory("EncryptionMiddleware", {
  ENCRYPTION_FAILED: "ENCRYPTION_FAILED",
  DECRYPTION_FAILED: "DECRYPTION_FAILED",
  INVALID_KEY: "ENCRYPTION_INVALID_KEY",
  INVALID_CONFIG: "ENCRYPTION_INVALID_CONFIG",
});

// =============================================================================
// EncryptionMiddleware Class
// =============================================================================

/**
 * Encryption middleware for storage operations
 *
 * @example
 * ```typescript
 * const encryption = new EncryptionMiddleware({
 *   algorithm: 'aes-256-gcm',
 *   key: process.env.STORAGE_ENCRYPTION_KEY!, // base64 encoded 32-byte key
 * });
 *
 * factory.addMiddleware(encryption);
 * ```
 */
export class EncryptionMiddleware implements StorageMiddleware {
  readonly name = "encryption";
  readonly priority = 20; // Run after caching

  private algorithm: StorageEncryptionAlgorithm;
  private key: Buffer;
  private initialized = false;

  constructor(private config: EncryptionMiddlewareConfig) {
    this.algorithm = config.algorithm || "aes-256-gcm";
    // Note: argon2 is in config types but not supported in this implementation
    const kdf = config.kdf === "argon2" ? undefined : config.kdf;
    this.key = this.deriveKey(config.key, kdf, config.salt);
  }

  /**
   * Initialize the middleware
   */
  async init(): Promise<void> {
    // Validate key length
    const requiredLength = this.getKeyLength();
    if (this.key.length !== requiredLength) {
      throw EncryptionErrors.create(
        "INVALID_KEY",
        `Key must be ${requiredLength} bytes for ${this.algorithm}`,
      );
    }

    this.initialized = true;
    logger.debug(`EncryptionMiddleware: Initialized with ${this.algorithm}`);
  }

  /**
   * Destroy the middleware
   */
  async destroy(): Promise<void> {
    // Zero out the key for security
    this.key.fill(0);
    this.initialized = false;
    logger.debug("EncryptionMiddleware: Destroyed");
  }

  /**
   * Encrypt data before storage write
   */
  async beforeWrite(key: string, value: JsonValue): Promise<JsonValue> {
    if (!this.initialized) {
      throw EncryptionErrors.create(
        "ENCRYPTION_FAILED",
        "Middleware not initialized",
      );
    }

    try {
      const encrypted = this.encrypt(JSON.stringify(value));
      return encrypted as unknown as JsonValue;
    } catch (error) {
      throw EncryptionErrors.create(
        "ENCRYPTION_FAILED",
        `Failed to encrypt data for key ${key}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Decrypt data after storage read
   */
  async afterRead(key: string, value: JsonValue): Promise<JsonValue> {
    if (!this.initialized) {
      throw EncryptionErrors.create(
        "DECRYPTION_FAILED",
        "Middleware not initialized",
      );
    }

    // Check if data is encrypted
    if (!this.isStorageEncryptedPayload(value)) {
      // Data might not be encrypted (migration scenario)
      return value;
    }

    try {
      const decrypted = this.decrypt(
        value as unknown as StorageEncryptedPayload,
      );
      return JSON.parse(decrypted);
    } catch (error) {
      throw EncryptionErrors.create(
        "DECRYPTION_FAILED",
        `Failed to decrypt data for key ${key}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Encrypt data
   */
  private encrypt(plaintext: string): StorageEncryptedPayload {
    const ivLength = this.getIvLength();
    const iv = randomBytes(ivLength);

    switch (this.algorithm) {
      case "aes-256-gcm": {
        const cipher = createCipheriv("aes-256-gcm", this.key, iv);
        const encrypted = Buffer.concat([
          cipher.update(plaintext, "utf8"),
          cipher.final(),
        ]);
        const tag = cipher.getAuthTag();

        return {
          __encrypted: true,
          algorithm: this.algorithm,
          iv: iv.toString("base64"),
          data: encrypted.toString("base64"),
          tag: tag.toString("base64"),
        };
      }

      case "aes-256-cbc": {
        const cipher = createCipheriv("aes-256-cbc", this.key, iv);
        const encrypted = Buffer.concat([
          cipher.update(plaintext, "utf8"),
          cipher.final(),
        ]);

        return {
          __encrypted: true,
          algorithm: this.algorithm,
          iv: iv.toString("base64"),
          data: encrypted.toString("base64"),
        };
      }

      case "chacha20-poly1305": {
        const cipher = createCipheriv("chacha20-poly1305", this.key, iv, {
          authTagLength: 16,
        });
        const encrypted = Buffer.concat([
          cipher.update(plaintext, "utf8"),
          cipher.final(),
        ]);
        const tag = cipher.getAuthTag();

        return {
          __encrypted: true,
          algorithm: this.algorithm,
          iv: iv.toString("base64"),
          data: encrypted.toString("base64"),
          tag: tag.toString("base64"),
        };
      }

      default:
        throw EncryptionErrors.create(
          "INVALID_CONFIG",
          `Unsupported algorithm: ${this.algorithm}`,
        );
    }
  }

  /**
   * Decrypt data
   */
  private decrypt(payload: StorageEncryptedPayload): string {
    const iv = Buffer.from(payload.iv, "base64");
    const encrypted = Buffer.from(payload.data, "base64");

    switch (payload.algorithm) {
      case "aes-256-gcm": {
        if (!payload.tag) {
          throw EncryptionErrors.create(
            "DECRYPTION_FAILED",
            "Missing authentication tag for GCM",
          );
        }

        const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
        decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

        return Buffer.concat([
          decipher.update(encrypted),
          decipher.final(),
        ]).toString("utf8");
      }

      case "aes-256-cbc": {
        const decipher = createDecipheriv("aes-256-cbc", this.key, iv);

        return Buffer.concat([
          decipher.update(encrypted),
          decipher.final(),
        ]).toString("utf8");
      }

      case "chacha20-poly1305": {
        if (!payload.tag) {
          throw EncryptionErrors.create(
            "DECRYPTION_FAILED",
            "Missing authentication tag for ChaCha20-Poly1305",
          );
        }

        const decipher = createDecipheriv("chacha20-poly1305", this.key, iv, {
          authTagLength: 16,
        });
        decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

        return Buffer.concat([
          decipher.update(encrypted),
          decipher.final(),
        ]).toString("utf8");
      }

      default:
        throw EncryptionErrors.create(
          "DECRYPTION_FAILED",
          `Unsupported algorithm: ${payload.algorithm}`,
        );
    }
  }

  /**
   * Check if value is an encrypted payload
   */
  private isStorageEncryptedPayload(
    value: unknown,
  ): value is StorageEncryptedPayload {
    return (
      typeof value === "object" &&
      value !== null &&
      "__encrypted" in value &&
      (value as StorageEncryptedPayload).__encrypted === true
    );
  }

  /**
   * Derive encryption key from password
   */
  private deriveKey(
    keyInput: string,
    kdf?: StorageEncryptionKdf,
    salt?: string,
  ): Buffer {
    // If key is base64 encoded and correct length, use directly
    try {
      const decoded = Buffer.from(keyInput, "base64");
      if (decoded.length === this.getKeyLength()) {
        return decoded;
      }
    } catch {
      // Not valid base64, treat as password
    }

    // Derive key using KDF
    const effectiveSalt = salt
      ? Buffer.from(salt, "utf8")
      : Buffer.from("neurolink-storage-default-salt", "utf8");

    const keyLength = this.getKeyLength();

    switch (kdf || "scrypt") {
      case "pbkdf2":
        return pbkdf2Sync(keyInput, effectiveSalt, 100000, keyLength, "sha256");

      case "scrypt":
      default:
        return scryptSync(keyInput, effectiveSalt, keyLength);
    }
  }

  /**
   * Get required key length for algorithm
   */
  private getKeyLength(): number {
    switch (this.algorithm) {
      case "aes-256-gcm":
      case "aes-256-cbc":
      case "chacha20-poly1305":
        return 32; // 256 bits
      default:
        return 32;
    }
  }

  /**
   * Get IV/nonce length for algorithm
   */
  private getIvLength(): number {
    switch (this.algorithm) {
      case "aes-256-gcm":
        return 12; // 96 bits recommended for GCM
      case "aes-256-cbc":
        return 16; // 128 bits for CBC
      case "chacha20-poly1305":
        return 12; // 96 bits for ChaCha20
      default:
        return 16;
    }
  }

  /**
   * Generate a new encryption key
   */
  static generateKey(): string {
    return randomBytes(32).toString("base64");
  }

  /**
   * Validate a key
   */
  static validateKey(key: string): boolean {
    try {
      const decoded = Buffer.from(key, "base64");
      return decoded.length === 32;
    } catch {
      return false;
    }
  }
}

/**
 * Create an encryption middleware instance
 */
export function createEncryptionMiddleware(
  config: EncryptionMiddlewareConfig,
): EncryptionMiddleware {
  return new EncryptionMiddleware(config);
}

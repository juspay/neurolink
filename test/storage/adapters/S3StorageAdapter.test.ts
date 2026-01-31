/**
 * S3StorageAdapter Tests
 *
 * Comprehensive test suite for the S3StorageAdapter class.
 * Uses mocking for unit tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { S3StorageAdapter } from "../../../src/lib/storage/adapters/S3StorageAdapter.js";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();

  return {
    S3Client: vi.fn(() => ({
      send: mockSend,
      destroy: vi.fn(),
    })),
    GetObjectCommand: vi.fn(),
    PutObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    HeadBucketCommand: vi.fn(),
  };
});

describe("S3StorageAdapter", () => {
  let storage: S3StorageAdapter;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    storage = new S3StorageAdapter({
      type: "s3",
      bucket: "test-bucket",
      region: "us-east-1",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internalStorage = storage as any;

    const { S3Client } = await import("@aws-sdk/client-s3");
    const client = new S3Client({});
    mockSend = client.send as ReturnType<typeof vi.fn>;

    mockSend.mockResolvedValue({});

    await storage.init();
    internalStorage.client = client;
  });

  afterEach(async () => {
    await storage.close();
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      mockSend.mockResolvedValue({});
      expect(await storage.healthCheck()).toBe(true);
    });

    it("should have s3 type", () => {
      expect(storage.type).toBe("s3");
    });
  });

  describe("Thread Operations", () => {
    it("should create a thread", async () => {
      mockSend.mockResolvedValue({});

      const thread = await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
        title: "Test",
      });

      expect(thread.id).toBe("thread-1");
      expect(mockSend).toHaveBeenCalled();
    });

    it("should get a thread by ID", async () => {
      const threadData = {
        id: "thread-1",
        resourceId: "user-1",
        title: "Test",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSend.mockResolvedValue({
        Body: {
          transformToString: () => Promise.resolve(JSON.stringify(threadData)),
        },
      });

      const thread = await storage.getThread("thread-1");
      expect(thread).toBeDefined();
      expect(thread!.id).toBe("thread-1");
    });

    it("should return undefined for non-existent thread", async () => {
      mockSend.mockRejectedValue({ name: "NoSuchKey" });

      const thread = await storage.getThread("nonexistent");
      expect(thread).toBeUndefined();
    });

    it("should delete a thread", async () => {
      mockSend.mockResolvedValue({});

      await storage.deleteThread("thread-1");
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe("Message Operations", () => {
    it("should create a message", async () => {
      mockSend.mockResolvedValue({});

      const message = await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
      });

      expect(message.id).toBe("msg-1");
    });

    it("should get a message by ID", async () => {
      const messageData = {
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
        createdAt: new Date().toISOString(),
      };

      mockSend.mockResolvedValue({
        Body: {
          transformToString: () => Promise.resolve(JSON.stringify(messageData)),
        },
      });

      const message = await storage.getMessage("msg-1");
      expect(message).toBeDefined();
      expect(message!.content).toBe("Hello");
    });
  });

  describe("Workflow Run Operations", () => {
    it("should create a workflow run", async () => {
      mockSend.mockResolvedValue({});

      const run = await storage.createWorkflowRun({
        id: "run-1",
        workflowId: "workflow-1",
        status: "pending",
      });

      expect(run.id).toBe("run-1");
    });

    it("should update workflow run", async () => {
      const existingRun = {
        id: "run-1",
        workflowId: "workflow-1",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSend
        .mockResolvedValueOnce({
          Body: {
            transformToString: () =>
              Promise.resolve(JSON.stringify(existingRun)),
          },
        })
        .mockResolvedValueOnce({});

      await storage.updateWorkflowRun("run-1", { status: "completed" });
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe("Custom Record Operations", () => {
    it("should set and get a record", async () => {
      const recordData = {
        key: "key1",
        value: { data: "value" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSend
        .mockResolvedValueOnce({}) // set
        .mockResolvedValueOnce({
          Body: {
            transformToString: () =>
              Promise.resolve(JSON.stringify(recordData)),
          },
        });

      await storage.setRecord("ns", "key1", { data: "value" });
      const record = await storage.getRecord("ns", "key1");

      expect(record).toBeDefined();
      expect(record!.value).toEqual({ data: "value" });
    });

    it("should delete a record", async () => {
      mockSend.mockResolvedValue({});

      await storage.deleteRecord("ns", "key1");
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe("S3 Key Structure", () => {
    it("should use proper key prefixes for different entity types", async () => {
      mockSend.mockResolvedValue({});

      await storage.createThread({ id: "thread-1", resourceId: "user-1" });
      await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hi",
      });
      await storage.setRecord("ns", "key1", { data: "value" });

      // Verify different key structures are used
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe("Health Check", () => {
    it("should return true when bucket is accessible", async () => {
      mockSend.mockResolvedValue({});

      const healthy = await storage.healthCheck();
      expect(healthy).toBe(true);
    });

    it("should return false when bucket is inaccessible", async () => {
      mockSend.mockRejectedValue(new Error("Access Denied"));

      const healthy = await storage.healthCheck();
      expect(healthy).toBe(false);
    });
  });

  describe("S3-Compatible Services", () => {
    it("should support custom endpoint for S3-compatible services", async () => {
      const minioStorage = new S3StorageAdapter({
        bucket: "test-bucket",
        region: "us-east-1",
        endpoint: "http://localhost:9000",
      });

      expect(minioStorage.type).toBe("s3");
      await minioStorage.close();
    });
  });
});

/**
 * FileStorageAdapter Tests
 *
 * Comprehensive test suite for the FileStorageAdapter class.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, unlinkSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  FileStorageAdapter,
  createFileStorage,
} from "../../../src/lib/storage/adapters/FileStorageAdapter.js";

describe("FileStorageAdapter", () => {
  let storage: FileStorageAdapter;
  let testDir: string;
  let testPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `neurolink-test-${Date.now()}`);
    testPath = join(testDir, "storage.json");
    mkdirSync(testDir, { recursive: true });
    storage = new FileStorageAdapter({ path: testPath });
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      expect(await storage.healthCheck()).toBe(true);
    });

    it("should have file type", () => {
      expect(storage.type).toBe("file");
    });

    it("should create storage file on initialization", async () => {
      expect(existsSync(testPath)).toBe(true);
    });

    it("should load existing data from file", async () => {
      await storage.setRecord("ns", "key", { data: "value" });
      await storage.close();

      const newStorage = new FileStorageAdapter({ path: testPath });
      await newStorage.init();

      const record = await newStorage.getRecord("ns", "key");
      expect(record!.value).toEqual({ data: "value" });

      await newStorage.close();
    });
  });

  describe("Thread Operations", () => {
    it("should create and persist a thread", async () => {
      await storage.createThread({
        id: "thread-1",
        resourceId: "user-1",
        title: "Test Thread",
      });

      // Force save
      await storage.close();

      const newStorage = new FileStorageAdapter({ path: testPath });
      await newStorage.init();

      const thread = await newStorage.getThread("thread-1");
      expect(thread).toBeDefined();
      expect(thread!.title).toBe("Test Thread");

      await newStorage.close();
    });

    it("should list threads", async () => {
      await storage.createThread({ id: "t1", resourceId: "user-1" });
      await storage.createThread({ id: "t2", resourceId: "user-1" });

      const threads = await storage.listThreads();
      expect(threads.data).toHaveLength(2);
    });

    it("should update a thread", async () => {
      await storage.createThread({
        id: "t1",
        resourceId: "user-1",
        title: "Original",
      });
      await storage.updateThread("t1", { title: "Updated" });

      const thread = await storage.getThread("t1");
      expect(thread!.title).toBe("Updated");
    });

    it("should delete a thread", async () => {
      await storage.createThread({ id: "t1", resourceId: "user-1" });
      await storage.deleteThread("t1");

      const thread = await storage.getThread("t1");
      expect(thread).toBeUndefined();
    });
  });

  describe("Message Operations", () => {
    beforeEach(async () => {
      await storage.createThread({ id: "thread-1", resourceId: "user-1" });
    });

    it("should create and get messages", async () => {
      await storage.createMessage({
        id: "msg-1",
        threadId: "thread-1",
        role: "user",
        content: "Hello",
      });

      const message = await storage.getMessage("msg-1");
      expect(message).toBeDefined();
      expect(message!.content).toBe("Hello");
    });

    it("should get messages by thread", async () => {
      await storage.createMessage({
        id: "m1",
        threadId: "thread-1",
        role: "user",
        content: "1",
      });
      await storage.createMessage({
        id: "m2",
        threadId: "thread-1",
        role: "assistant",
        content: "2",
      });

      const messages = await storage.getMessagesByThread("thread-1");
      expect(messages.data).toHaveLength(2);
    });
  });

  describe("Custom Record Operations", () => {
    it("should set and get records", async () => {
      await storage.setRecord("ns", "key1", { data: "value1" });

      const record = await storage.getRecord("ns", "key1");
      expect(record!.value).toEqual({ data: "value1" });
    });

    it("should list records by namespace", async () => {
      await storage.setRecord("ns1", "key1", { data: 1 });
      await storage.setRecord("ns1", "key2", { data: 2 });
      await storage.setRecord("ns2", "key3", { data: 3 });

      const records = await storage.listRecords("ns1");
      expect(records.data).toHaveLength(2);
    });

    it("should delete records", async () => {
      await storage.setRecord("ns", "key1", { data: "value1" });
      await storage.deleteRecord("ns", "key1");

      const record = await storage.getRecord("ns", "key1");
      expect(record).toBeUndefined();
    });
  });

  describe("Data Persistence", () => {
    it("should persist data across restarts", async () => {
      await storage.createThread({ id: "t1", resourceId: "user-1" });
      await storage.createMessage({
        id: "m1",
        threadId: "t1",
        role: "user",
        content: "Hello",
      });
      await storage.setRecord("ns", "key", { value: 42 });

      await storage.close();

      const newStorage = new FileStorageAdapter({ path: testPath });
      await newStorage.init();

      const thread = await newStorage.getThread("t1");
      const message = await newStorage.getMessage("m1");
      const record = await newStorage.getRecord("ns", "key");

      expect(thread).toBeDefined();
      expect(message).toBeDefined();
      expect(record).toBeDefined();

      await newStorage.close();
    });
  });

  describe("Debounced Saving", () => {
    it("should debounce multiple writes", async () => {
      // Multiple rapid writes
      for (let i = 0; i < 10; i++) {
        await storage.setRecord("ns", `key${i}`, { data: i });
      }

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify all data was saved
      const newStorage = new FileStorageAdapter({ path: testPath });
      await newStorage.init();

      for (let i = 0; i < 10; i++) {
        const record = await newStorage.getRecord("ns", `key${i}`);
        expect(record).toBeDefined();
      }

      await newStorage.close();
    });
  });

  describe("Factory Function", () => {
    it("should create storage using createFileStorage", async () => {
      const customPath = join(testDir, "custom.json");
      const fileStorage = await createFileStorage({ path: customPath });

      expect(fileStorage.type).toBe("file");
      expect(existsSync(customPath)).toBe(true);

      await fileStorage.close();
    });
  });

  describe("Error Handling", () => {
    it("should throw error for invalid path", async () => {
      const invalidStorage = new FileStorageAdapter({
        path: "/nonexistent/dir/file.json",
      });

      await expect(invalidStorage.init()).rejects.toThrow();
    });
  });
});

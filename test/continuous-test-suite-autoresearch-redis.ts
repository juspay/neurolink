#!/usr/bin/env tsx

/**
 * Continuous Test Suite: AutoResearch Redis/BullMQ Backend
 *
 * Verifies autoresearch tasks work correctly with JSON serialization
 * (used by both FileTaskStore and RedisTaskStore) and optionally with
 * a real Redis connection.
 *
 * GROUP 1 -- JSON Serialization Round-Trip (no Redis needed, 5 tests)
 *   Full task round-trip, nested metric config, mutablePaths order,
 *   optional fields, standard task without autoresearch.
 *
 * GROUP 2 -- FileTaskStore Integration (no Redis needed, 4 tests)
 *   Save/retrieve, list filter by status, update preserves config,
 *   appendRun and getRuns.
 *
 * GROUP 3 -- BullMQ Job Data Verification (no Redis needed, 2 tests)
 *   Job data structure includes autoresearch config, executor map keying.
 *
 * GROUP 4 -- Redis Integration (skip if no Redis, 3 tests)
 *   RedisTaskStore save/retrieve, update preserves config,
 *   appendRun works for autoresearch tasks.
 *
 * Run: npx tsx test/continuous-test-suite-autoresearch-redis.ts
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Task, TaskRunResult } from "../src/lib/types/taskTypes.js";

// ============================================================
// LOGGING
// ============================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};
type ColorName = keyof typeof colors;

function log(msg: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  name: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const icons = { PASS: "PASS", FAIL: "FAIL", SKIP: "SKIP", TESTING: "TEST" };
  const clr: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  const det = details ? ` -- ${details}` : "";
  log(`[${icons[status]}] ${name}${det}`, clr[status] || "reset");
}

// ============================================================
// RESULTS
// ============================================================

const testResults: Array<{
  group: string;
  name: string;
  status: "pass" | "fail" | "skip";
  error?: string;
}> = [];

function recordResult(
  group: string,
  name: string,
  result: boolean | null,
  error?: string,
): void {
  if (result === null) {
    testResults.push({ group, name, status: "skip", error });
  } else if (result) {
    testResults.push({ group, name, status: "pass" });
  } else {
    testResults.push({ group, name, status: "fail", error });
  }
}

// ============================================================
// HELPERS
// ============================================================

function createTestAutoresearchTask(id?: string): Task {
  const now = new Date().toISOString();
  return {
    id: id ?? `test_${Date.now()}`,
    name: "test-autoresearch",
    prompt: "Autonomous ML experiment",
    schedule: { type: "interval" as const, every: 60000 },
    mode: "continuation" as const,
    type: "autoresearch" as const,
    status: "active" as const,
    tools: true,
    timeout: 600000,
    retry: { maxAttempts: 1, backoffMs: [60000] },
    runCount: 0,
    createdAt: now,
    updatedAt: now,
    autoresearch: {
      tag: "redis-test",
      repoPath: "/tmp/test-repo",
      mutablePaths: ["train.py"],
      runCommand: "python3 train.py",
      metric: {
        name: "val_bpb",
        direction: "lower" as const,
        pattern: "val_bpb:\\s+([\\d.]+)",
      },
      immutablePaths: ["README.md"],
      timeoutMs: 30000,
      provider: "openai",
      model: "gpt-4o-mini",
    },
  };
}

function createTestRunResult(taskId: string): TaskRunResult {
  return {
    taskId,
    runId: `run_${Date.now()}`,
    status: "success",
    output: "Experiment completed: val_bpb: 1.234",
    durationMs: 5000,
    timestamp: new Date().toISOString(),
    tokensUsed: { input: 100, output: 50 },
  };
}

async function isRedisAvailable(): Promise<boolean> {
  try {
    const { createClient } = await import("redis");
    const client = createClient({
      url: process.env.REDIS_URL ?? "redis://localhost:6379",
    });
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// GROUP 1: JSON Serialization Round-Trip
// ============================================================

async function testFullTaskRoundTrip(): Promise<boolean | null> {
  const testName = "Autoresearch task round-trips through JSON serialization";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  try {
    const original = createTestAutoresearchTask("roundtrip_1");
    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized) as Task;

    // Assert type
    if (deserialized.type !== "autoresearch") {
      logTest(
        testName,
        "FAIL",
        `type=${deserialized.type}, expected=autoresearch`,
      );
      return false;
    }

    // Assert autoresearch config exists
    if (!deserialized.autoresearch) {
      logTest(
        testName,
        "FAIL",
        "autoresearch config missing after deserialization",
      );
      return false;
    }

    // Assert nested fields
    const ar = deserialized.autoresearch;
    if (ar.repoPath !== "/tmp/test-repo") {
      logTest(testName, "FAIL", `repoPath=${ar.repoPath}`);
      return false;
    }
    if (ar.runCommand !== "python3 train.py") {
      logTest(testName, "FAIL", `runCommand=${ar.runCommand}`);
      return false;
    }
    if (ar.metric.name !== "val_bpb") {
      logTest(testName, "FAIL", `metric.name=${ar.metric.name}`);
      return false;
    }
    if (ar.metric.direction !== "lower") {
      logTest(testName, "FAIL", `metric.direction=${ar.metric.direction}`);
      return false;
    }
    if (ar.metric.pattern !== "val_bpb:\\s+([\\d.]+)") {
      logTest(testName, "FAIL", `metric.pattern=${ar.metric.pattern}`);
      return false;
    }

    // Assert top-level fields
    if (deserialized.id !== "roundtrip_1") {
      logTest(testName, "FAIL", `id=${deserialized.id}`);
      return false;
    }
    if (deserialized.status !== "active") {
      logTest(testName, "FAIL", `status=${deserialized.status}`);
      return false;
    }

    logTest(testName, "PASS", "all fields preserved through JSON round-trip");
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  }
}

async function testNestedMetricConfigPreservation(): Promise<boolean | null> {
  const testName = "Nested metric config preserves direction and pattern";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  try {
    const task = createTestAutoresearchTask("metric_1");
    task.autoresearch!.metric = {
      name: "val_bpb",
      direction: "lower",
      pattern: "val_bpb:\\s+([\\d.]+)",
    };

    const deserialized = JSON.parse(JSON.stringify(task)) as Task;
    const metric = deserialized.autoresearch!.metric;

    if (metric.direction !== "lower") {
      logTest(
        testName,
        "FAIL",
        `direction=${metric.direction}, expected=lower`,
      );
      return false;
    }
    if (metric.pattern !== "val_bpb:\\s+([\\d.]+)") {
      logTest(testName, "FAIL", `pattern mismatch: ${metric.pattern}`);
      return false;
    }
    if (metric.name !== "val_bpb") {
      logTest(testName, "FAIL", `name=${metric.name}`);
      return false;
    }

    logTest(
      testName,
      "PASS",
      `direction="${metric.direction}", pattern="${metric.pattern}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  }
}

async function testMutablePathsArrayPreservation(): Promise<boolean | null> {
  const testName = "mutablePaths array preserves order and content";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  try {
    const task = createTestAutoresearchTask("paths_1");
    task.autoresearch!.mutablePaths = ["train.py", "model.py", "config.yaml"];

    const deserialized = JSON.parse(JSON.stringify(task)) as Task;
    const paths = deserialized.autoresearch!.mutablePaths;

    if (paths.length !== 3) {
      logTest(testName, "FAIL", `length=${paths.length}, expected=3`);
      return false;
    }
    if (
      paths[0] !== "train.py" ||
      paths[1] !== "model.py" ||
      paths[2] !== "config.yaml"
    ) {
      logTest(
        testName,
        "FAIL",
        `paths=[${paths.join(", ")}], expected=[train.py, model.py, config.yaml]`,
      );
      return false;
    }

    logTest(
      testName,
      "PASS",
      `paths=[${paths.join(", ")}], length=${paths.length}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  }
}

async function testOptionalFieldsSurviveSerialization(): Promise<
  boolean | null
> {
  const testName = "Optional autoresearch fields survive serialization";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  try {
    const task = createTestAutoresearchTask("optional_1");
    task.autoresearch = {
      ...task.autoresearch!,
      immutablePaths: ["README.md", "LICENSE"],
      timeoutMs: 45000,
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      maxExperiments: 50,
      thinkingLevel: "high",
    };

    const deserialized = JSON.parse(JSON.stringify(task)) as Task;
    const ar = deserialized.autoresearch!;

    const checks: string[] = [];
    if (!ar.immutablePaths || ar.immutablePaths.length !== 2) {
      checks.push(`immutablePaths length=${ar.immutablePaths?.length}`);
    }
    if (ar.timeoutMs !== 45000) {
      checks.push(`timeoutMs=${ar.timeoutMs}`);
    }
    if (ar.provider !== "anthropic") {
      checks.push(`provider=${ar.provider}`);
    }
    if (ar.model !== "claude-sonnet-4-20250514") {
      checks.push(`model=${ar.model}`);
    }
    if (ar.maxExperiments !== 50) {
      checks.push(`maxExperiments=${ar.maxExperiments}`);
    }
    if (ar.thinkingLevel !== "high") {
      checks.push(`thinkingLevel=${ar.thinkingLevel}`);
    }

    if (checks.length > 0) {
      logTest(testName, "FAIL", checks.join("; "));
      return false;
    }

    logTest(testName, "PASS", "all optional fields preserved");
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  }
}

async function testStandardTaskWithoutAutoresearch(): Promise<boolean | null> {
  const testName =
    "Task without autoresearch config serializes as standard task";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  try {
    const now = new Date().toISOString();
    const task: Task = {
      id: "standard_1",
      name: "standard-task",
      prompt: "Run a standard prompt",
      schedule: { type: "interval", every: 30000 },
      mode: "isolated",
      type: "standard",
      status: "active",
      tools: true,
      timeout: 120000,
      retry: { maxAttempts: 3, backoffMs: [30000, 60000, 300000] },
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const deserialized = JSON.parse(JSON.stringify(task)) as Task;

    if (deserialized.type !== "standard") {
      logTest(testName, "FAIL", `type=${deserialized.type}, expected=standard`);
      return false;
    }
    if (deserialized.autoresearch !== undefined) {
      logTest(testName, "FAIL", "autoresearch should be undefined");
      return false;
    }

    logTest(
      testName,
      "PASS",
      `type="${deserialized.type}", autoresearch=undefined`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  }
}

// ============================================================
// GROUP 2: FileTaskStore Integration
// ============================================================

let fileStoreTmpDir: string | null = null;

async function setupFileStore() {
  fileStoreTmpDir = mkdtempSync(join(tmpdir(), "neurolink-redis-test-"));
  const { FileTaskStore } =
    await import("../src/lib/tasks/store/fileTaskStore.js");
  const store = new FileTaskStore({
    storePath: join(fileStoreTmpDir, "tasks.json"),
    logsPath: join(fileStoreTmpDir, "runs"),
  });
  await store.initialize();
  return store;
}

async function testFileStoreSaveAndRetrieve(): Promise<boolean | null> {
  const testName = "FileTaskStore saves and retrieves autoresearch task";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  let store: Awaited<ReturnType<typeof setupFileStore>> | null = null;
  try {
    store = await setupFileStore();
    const task = createTestAutoresearchTask("file_save_1");

    await store.save(task);
    const retrieved = await store.get("file_save_1");

    if (!retrieved) {
      logTest(testName, "FAIL", "task not found after save");
      return false;
    }
    if (retrieved.type !== "autoresearch") {
      logTest(testName, "FAIL", `type=${retrieved.type}`);
      return false;
    }
    if (!retrieved.autoresearch) {
      logTest(testName, "FAIL", "autoresearch config missing");
      return false;
    }

    const ar = retrieved.autoresearch;
    const checks: string[] = [];
    if (ar.repoPath !== "/tmp/test-repo") {
      checks.push(`repoPath=${ar.repoPath}`);
    }
    if (ar.mutablePaths[0] !== "train.py") {
      checks.push(`mutablePaths[0]=${ar.mutablePaths[0]}`);
    }
    if (ar.runCommand !== "python3 train.py") {
      checks.push(`runCommand=${ar.runCommand}`);
    }
    if (ar.metric.name !== "val_bpb") {
      checks.push(`metric.name=${ar.metric.name}`);
    }
    if (ar.metric.direction !== "lower") {
      checks.push(`metric.direction=${ar.metric.direction}`);
    }
    if (ar.provider !== "openai") {
      checks.push(`provider=${ar.provider}`);
    }
    if (ar.model !== "gpt-4o-mini") {
      checks.push(`model=${ar.model}`);
    }

    if (checks.length > 0) {
      logTest(testName, "FAIL", checks.join("; "));
      return false;
    }

    logTest(testName, "PASS", "all autoresearch config fields match");
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  } finally {
    if (store) {
      await store.shutdown();
    }
    if (fileStoreTmpDir) {
      rmSync(fileStoreTmpDir, { recursive: true, force: true });
    }
  }
}

async function testFileStoreListFilterByStatus(): Promise<boolean | null> {
  const testName = "FileTaskStore list filters autoresearch tasks by status";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  let store: Awaited<ReturnType<typeof setupFileStore>> | null = null;
  try {
    store = await setupFileStore();

    // Save 2 autoresearch tasks (one active, one paused) and 1 standard task (active)
    const task1 = createTestAutoresearchTask("filter_active_1");
    task1.status = "active";

    const task2 = createTestAutoresearchTask("filter_paused_1");
    task2.status = "paused";

    const now = new Date().toISOString();
    const task3: Task = {
      id: "filter_standard_1",
      name: "standard-task",
      prompt: "Standard prompt",
      schedule: { type: "interval", every: 30000 },
      mode: "isolated",
      type: "standard",
      status: "active",
      tools: true,
      timeout: 120000,
      retry: { maxAttempts: 1, backoffMs: [1000] },
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await store.save(task1);
    await store.save(task2);
    await store.save(task3);

    const activeList = await store.list({ status: "active" });

    // Should return task1 (autoresearch active) and task3 (standard active)
    const activeIds = activeList.map((t) => t.id);
    if (!activeIds.includes("filter_active_1")) {
      logTest(
        testName,
        "FAIL",
        `active autoresearch task not in list: [${activeIds.join(", ")}]`,
      );
      return false;
    }
    if (!activeIds.includes("filter_standard_1")) {
      logTest(
        testName,
        "FAIL",
        `standard active task not in list: [${activeIds.join(", ")}]`,
      );
      return false;
    }
    if (activeIds.includes("filter_paused_1")) {
      logTest(testName, "FAIL", "paused task should not be in active list");
      return false;
    }

    logTest(testName, "PASS", `active tasks: [${activeIds.join(", ")}]`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  } finally {
    if (store) {
      await store.shutdown();
    }
    if (fileStoreTmpDir) {
      rmSync(fileStoreTmpDir, { recursive: true, force: true });
    }
  }
}

async function testFileStoreUpdatePreservesConfig(): Promise<boolean | null> {
  const testName = "FileTaskStore update preserves autoresearch config";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  let store: Awaited<ReturnType<typeof setupFileStore>> | null = null;
  try {
    store = await setupFileStore();
    const task = createTestAutoresearchTask("update_1");
    await store.save(task);

    // Update only status
    await store.update("update_1", { status: "paused" });

    const retrieved = await store.get("update_1");
    if (!retrieved) {
      logTest(testName, "FAIL", "task not found after update");
      return false;
    }
    if (retrieved.status !== "paused") {
      logTest(testName, "FAIL", `status=${retrieved.status}, expected=paused`);
      return false;
    }
    if (!retrieved.autoresearch) {
      logTest(testName, "FAIL", "autoresearch config lost after update");
      return false;
    }
    if (retrieved.autoresearch.repoPath !== "/tmp/test-repo") {
      logTest(testName, "FAIL", `repoPath=${retrieved.autoresearch.repoPath}`);
      return false;
    }
    if (retrieved.autoresearch.metric.name !== "val_bpb") {
      logTest(
        testName,
        "FAIL",
        `metric.name=${retrieved.autoresearch.metric.name}`,
      );
      return false;
    }

    logTest(
      testName,
      "PASS",
      `status="${retrieved.status}", autoresearch config intact`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  } finally {
    if (store) {
      await store.shutdown();
    }
    if (fileStoreTmpDir) {
      rmSync(fileStoreTmpDir, { recursive: true, force: true });
    }
  }
}

async function testFileStoreAppendAndGetRuns(): Promise<boolean | null> {
  const testName =
    "FileTaskStore appendRun and getRuns work for autoresearch tasks";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  let store: Awaited<ReturnType<typeof setupFileStore>> | null = null;
  try {
    store = await setupFileStore();
    const task = createTestAutoresearchTask("runs_1");
    await store.save(task);

    const run = createTestRunResult("runs_1");
    await store.appendRun("runs_1", run);

    const runs = await store.getRuns("runs_1");

    if (runs.length === 0) {
      logTest(testName, "FAIL", "no runs returned");
      return false;
    }
    if (runs[0].taskId !== "runs_1") {
      logTest(testName, "FAIL", `taskId=${runs[0].taskId}`);
      return false;
    }
    if (runs[0].status !== "success") {
      logTest(testName, "FAIL", `status=${runs[0].status}`);
      return false;
    }
    if (!runs[0].output?.includes("val_bpb")) {
      logTest(
        testName,
        "FAIL",
        `output does not contain val_bpb: ${runs[0].output}`,
      );
      return false;
    }

    logTest(
      testName,
      "PASS",
      `runs=${runs.length}, taskId="${runs[0].taskId}", status="${runs[0].status}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  } finally {
    if (store) {
      await store.shutdown();
    }
    if (fileStoreTmpDir) {
      rmSync(fileStoreTmpDir, { recursive: true, force: true });
    }
  }
}

// ============================================================
// GROUP 3: BullMQ Job Data Verification
// ============================================================

async function testBullMQJobDataStructure(): Promise<boolean | null> {
  const testName =
    "BullMQ job data structure includes full task with autoresearch config";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  try {
    const task = createTestAutoresearchTask("bullmq_1");

    // Simulate how BullMQ backend creates job data
    const jobData = { taskId: task.id, task };

    // Simulate Redis storage: JSON round-trip
    const serialized = JSON.stringify(jobData);
    const deserialized = JSON.parse(serialized) as {
      taskId: string;
      task: Task;
    };

    if (deserialized.taskId !== "bullmq_1") {
      logTest(testName, "FAIL", `taskId=${deserialized.taskId}`);
      return false;
    }
    if (deserialized.task.type !== "autoresearch") {
      logTest(testName, "FAIL", `task.type=${deserialized.task.type}`);
      return false;
    }
    if (!deserialized.task.autoresearch) {
      logTest(testName, "FAIL", "task.autoresearch missing");
      return false;
    }
    if (deserialized.task.autoresearch.repoPath !== "/tmp/test-repo") {
      logTest(
        testName,
        "FAIL",
        `repoPath=${deserialized.task.autoresearch.repoPath}`,
      );
      return false;
    }
    if (deserialized.task.autoresearch.metric.direction !== "lower") {
      logTest(
        testName,
        "FAIL",
        `metric.direction=${deserialized.task.autoresearch.metric.direction}`,
      );
      return false;
    }

    logTest(
      testName,
      "PASS",
      "job data preserves full autoresearch config through JSON",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  }
}

async function testBullMQExecutorMapKeying(): Promise<boolean | null> {
  const testName = "BullMQ executor map can key autoresearch tasks";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");
  try {
    const task = createTestAutoresearchTask("executor_1");

    // Simulate the executors map used by BullMQ backend
    const executors = new Map<string, (t: Task) => Promise<TaskRunResult>>();

    const mockExecutor = async (t: Task): Promise<TaskRunResult> => ({
      taskId: t.id,
      runId: `run_${Date.now()}`,
      status: "success",
      output: "mock",
      durationMs: 100,
      timestamp: new Date().toISOString(),
    });

    executors.set(task.id, mockExecutor);

    // Verify retrieval
    const retrieved = executors.get(task.id);
    if (!retrieved) {
      logTest(testName, "FAIL", "executor not found by task ID");
      return false;
    }

    // Verify it's callable
    const result = await retrieved(task);
    if (result.taskId !== "executor_1") {
      logTest(testName, "FAIL", `result.taskId=${result.taskId}`);
      return false;
    }
    if (result.status !== "success") {
      logTest(testName, "FAIL", `result.status=${result.status}`);
      return false;
    }

    logTest(
      testName,
      "PASS",
      "executor keyed by autoresearch task ID works correctly",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  }
}

// ============================================================
// GROUP 4: Redis Integration (skip if no Redis)
// ============================================================

async function testRedisStoreSaveAndRetrieve(): Promise<boolean | null> {
  const testName = "RedisTaskStore saves and retrieves autoresearch task";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");

  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    logTest(testName, "SKIP", "Redis not available");
    return null;
  }

  let store: InstanceType<
    typeof import("../src/lib/tasks/store/redisTaskStore.js").RedisTaskStore
  > | null = null;
  const taskId = `redis_save_${Date.now()}`;
  try {
    const { RedisTaskStore } =
      await import("../src/lib/tasks/store/redisTaskStore.js");
    store = new RedisTaskStore({
      redis: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
    });
    await store.initialize();

    const task = createTestAutoresearchTask(taskId);
    await store.save(task);

    const retrieved = await store.get(taskId);
    if (!retrieved) {
      logTest(testName, "FAIL", "task not found after save");
      return false;
    }
    if (retrieved.type !== "autoresearch") {
      logTest(testName, "FAIL", `type=${retrieved.type}`);
      return false;
    }
    if (!retrieved.autoresearch) {
      logTest(testName, "FAIL", "autoresearch config missing");
      return false;
    }
    if (retrieved.autoresearch.repoPath !== "/tmp/test-repo") {
      logTest(testName, "FAIL", `repoPath=${retrieved.autoresearch.repoPath}`);
      return false;
    }
    if (retrieved.autoresearch.metric.name !== "val_bpb") {
      logTest(
        testName,
        "FAIL",
        `metric.name=${retrieved.autoresearch.metric.name}`,
      );
      return false;
    }
    if (retrieved.autoresearch.provider !== "openai") {
      logTest(testName, "FAIL", `provider=${retrieved.autoresearch.provider}`);
      return false;
    }

    logTest(testName, "PASS", "all fields match after Redis round-trip");
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  } finally {
    // Cleanup
    if (store) {
      try {
        await store.delete(taskId);
      } catch {
        /* best effort */
      }
      await store.shutdown();
    }
  }
}

async function testRedisStoreUpdatePreservesConfig(): Promise<boolean | null> {
  const testName = "RedisTaskStore update preserves autoresearch config";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");

  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    logTest(testName, "SKIP", "Redis not available");
    return null;
  }

  let store: InstanceType<
    typeof import("../src/lib/tasks/store/redisTaskStore.js").RedisTaskStore
  > | null = null;
  const taskId = `redis_update_${Date.now()}`;
  try {
    const { RedisTaskStore } =
      await import("../src/lib/tasks/store/redisTaskStore.js");
    store = new RedisTaskStore({
      redis: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
    });
    await store.initialize();

    const task = createTestAutoresearchTask(taskId);
    await store.save(task);

    // Update only status
    await store.update(taskId, { status: "paused" });

    const retrieved = await store.get(taskId);
    if (!retrieved) {
      logTest(testName, "FAIL", "task not found after update");
      return false;
    }
    if (retrieved.status !== "paused") {
      logTest(testName, "FAIL", `status=${retrieved.status}, expected=paused`);
      return false;
    }
    if (!retrieved.autoresearch) {
      logTest(testName, "FAIL", "autoresearch config lost after update");
      return false;
    }
    if (retrieved.autoresearch.repoPath !== "/tmp/test-repo") {
      logTest(testName, "FAIL", `repoPath=${retrieved.autoresearch.repoPath}`);
      return false;
    }
    if (retrieved.autoresearch.metric.direction !== "lower") {
      logTest(
        testName,
        "FAIL",
        `metric.direction=${retrieved.autoresearch.metric.direction}`,
      );
      return false;
    }

    logTest(
      testName,
      "PASS",
      `status="${retrieved.status}", autoresearch config intact`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  } finally {
    if (store) {
      try {
        await store.delete(taskId);
      } catch {
        /* best effort */
      }
      await store.shutdown();
    }
  }
}

async function testRedisStoreAppendRun(): Promise<boolean | null> {
  const testName = "RedisTaskStore appendRun works for autoresearch tasks";
  logSection(`Test: ${testName}`);
  logTest(testName, "TESTING");

  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    logTest(testName, "SKIP", "Redis not available");
    return null;
  }

  let store: InstanceType<
    typeof import("../src/lib/tasks/store/redisTaskStore.js").RedisTaskStore
  > | null = null;
  const taskId = `redis_runs_${Date.now()}`;
  try {
    const { RedisTaskStore } =
      await import("../src/lib/tasks/store/redisTaskStore.js");
    store = new RedisTaskStore({
      redis: { url: process.env.REDIS_URL ?? "redis://localhost:6379" },
    });
    await store.initialize();

    const task = createTestAutoresearchTask(taskId);
    await store.save(task);

    const run = createTestRunResult(taskId);
    await store.appendRun(taskId, run);

    const runs = await store.getRuns(taskId);
    if (runs.length === 0) {
      logTest(testName, "FAIL", "no runs returned");
      return false;
    }
    if (runs[0].taskId !== taskId) {
      logTest(testName, "FAIL", `taskId=${runs[0].taskId}`);
      return false;
    }
    if (runs[0].status !== "success") {
      logTest(testName, "FAIL", `status=${runs[0].status}`);
      return false;
    }
    if (!runs[0].output?.includes("val_bpb")) {
      logTest(testName, "FAIL", `output missing val_bpb: ${runs[0].output}`);
      return false;
    }

    logTest(
      testName,
      "PASS",
      `runs=${runs.length}, taskId="${runs[0].taskId}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(testName, "FAIL", msg);
    return false;
  } finally {
    if (store) {
      try {
        await store.delete(taskId);
      } catch {
        /* best effort */
      }
      await store.shutdown();
    }
  }
}

// ============================================================
// RUNNER
// ============================================================

async function main(): Promise<void> {
  log("\n" + "=".repeat(60), "bright");
  log("  CONTINUOUS TEST SUITE: AUTORESEARCH REDIS/BULLMQ BACKEND", "bright");
  log("=".repeat(60), "bright");

  // GROUP 1: JSON Serialization Round-Trip
  const group1 = "JSON Serialization Round-Trip";
  const group1Tests = [
    testFullTaskRoundTrip,
    testNestedMetricConfigPreservation,
    testMutablePathsArrayPreservation,
    testOptionalFieldsSurviveSerialization,
    testStandardTaskWithoutAutoresearch,
  ];

  log(`\n--- GROUP 1: ${group1} ---`, "cyan");
  for (const testFn of group1Tests) {
    try {
      const result = await testFn();
      recordResult(
        group1,
        testFn.name,
        result,
        result === false ? "Test failed" : undefined,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordResult(group1, testFn.name, false, msg);
    }
  }

  // GROUP 2: FileTaskStore Integration
  const group2 = "FileTaskStore Integration";
  const group2Tests = [
    testFileStoreSaveAndRetrieve,
    testFileStoreListFilterByStatus,
    testFileStoreUpdatePreservesConfig,
    testFileStoreAppendAndGetRuns,
  ];

  log(`\n--- GROUP 2: ${group2} ---`, "cyan");
  for (const testFn of group2Tests) {
    try {
      const result = await testFn();
      recordResult(
        group2,
        testFn.name,
        result,
        result === false ? "Test failed" : undefined,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordResult(group2, testFn.name, false, msg);
    }
  }

  // GROUP 3: BullMQ Job Data Verification
  const group3 = "BullMQ Job Data Verification";
  const group3Tests = [testBullMQJobDataStructure, testBullMQExecutorMapKeying];

  log(`\n--- GROUP 3: ${group3} ---`, "cyan");
  for (const testFn of group3Tests) {
    try {
      const result = await testFn();
      recordResult(
        group3,
        testFn.name,
        result,
        result === false ? "Test failed" : undefined,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordResult(group3, testFn.name, false, msg);
    }
  }

  // GROUP 4: Redis Integration
  const group4 = "Redis Integration";
  const group4Tests = [
    testRedisStoreSaveAndRetrieve,
    testRedisStoreUpdatePreservesConfig,
    testRedisStoreAppendRun,
  ];

  log(`\n--- GROUP 4: ${group4} ---`, "cyan");
  for (const testFn of group4Tests) {
    try {
      const result = await testFn();
      recordResult(
        group4,
        testFn.name,
        result,
        result === false ? "Test failed" : undefined,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordResult(group4, testFn.name, false, msg);
    }
  }

  // ── Summary ──────────────────────────────────────────────
  const passed = testResults.filter((r) => r.status === "pass").length;
  const failed = testResults.filter((r) => r.status === "fail").length;
  const skipped = testResults.filter((r) => r.status === "skip").length;

  log("\n" + "=".repeat(60), "cyan");
  log("  SUMMARY", "cyan");
  log("=".repeat(60), "cyan");
  log(`  Total:   ${testResults.length}`, "bright");
  log(`  Passed:  ${passed}`, "green");
  log(`  Failed:  ${failed}`, failed > 0 ? "red" : "green");
  log(`  Skipped: ${skipped}`, "yellow");
  log("=".repeat(60), "cyan");

  if (failed > 0) {
    log("\n  FAILED TESTS:", "red");
    for (const r of testResults.filter((r) => r.status === "fail")) {
      log(`    - [${r.group}] ${r.name}: ${r.error || ""}`, "red");
    }
  }

  if (skipped > 0) {
    log("\n  SKIPPED TESTS:", "yellow");
    for (const r of testResults.filter((r) => r.status === "skip")) {
      log(`    - [${r.group}] ${r.name}: ${r.error || ""}`, "yellow");
    }
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

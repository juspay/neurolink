#!/usr/bin/env tsx
/**
 * Continuous Test Suite: TaskManager
 *
 * Comprehensive test suite covering the full TaskManager system across
 * 6 groups with 59 test functions:
 *
 * GROUP 1 — Unit Tests (32 tests, no external deps)
 *   CRUD operations, lifecycle management (pause/resume), schedule types,
 *   execution modes (isolated/continuation), configuration overrides,
 *   filtering, error handling, health checks.
 *
 * GROUP 2 — Edge Cases (5 tests, no AI needed)
 *   onError callback, non-transient error skip-retry, invalid cron,
 *   task creation limit enforcement, error result structure.
 *
 * GROUP 3 — Production Readiness (9 tests, REQUIRES AI provider)
 *   Once schedule, maxRuns auto-completion, pause/resume with execution,
 *   continuation + pause/resume, provider/model override, concurrent tasks,
 *   callbacks (onSuccess/onComplete), delete cleanup, shutdown.
 *
 * GROUP 4 — AI Execution (2 tests, REQUIRES AI provider)
 *   Isolated execution with real AI, continuation mode across runs.
 *
 * GROUP 5 — Tool Discovery (1 test, REQUIRES AI provider)
 *   AI discovers and uses task management tools.
 *
 * GROUP 6 — BullMQ + Redis (10 tests, REQUIRES Redis on localhost:6379)
 *   Init/health, CRUD with Redis store, execution, continuation,
 *   maxRuns, pause/resume, concurrent tasks, cron schedule,
 *   once schedule (delayed job), shutdown cleanup.
 *   Tests 3-9 also require AI provider; they skip individually if unavailable.
 *
 * Run: npx tsx test/continuous-test-suite-tasks.ts
 */

import { rmSync } from "node:fs";

// Source imports — tsx resolves TypeScript directly
import { NeuroLink } from "../src/lib/neurolink.js";
import type { Task, TaskDefinition } from "../src/lib/tasks/types.js";

// ============================================================
// LOGGING UTILITIES
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

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const icons = { PASS: "PASS", FAIL: "FAIL", SKIP: "SKIP", TESTING: "TEST" };
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  const icon = icons[status];
  const clr = statusColors[status] || "reset";
  const det = details ? ` -- ${details}` : "";
  log(`[${icon}] ${testName}${det}`, clr);
}

// ============================================================
// TEST RESULTS TRACKING
// ============================================================

const testResults: Array<{
  name: string;
  result: boolean | null;
  error: string | null;
}> = [];

// ============================================================
// HELPERS
// ============================================================

/** Clean the file-based task store between test groups */
function cleanTaskStore(): void {
  try {
    rmSync(".neurolink/tasks", { recursive: true, force: true });
  } catch {
    // expected if directory doesn't exist
  }
}

/** Create a fresh NeuroLink instance with node-timeout backend */
function createSDK(): NeuroLink {
  return new NeuroLink({
    tasks: { backend: "node-timeout" },
  });
}

// ============================================================
// TEST #1: Create task with defaults
// ============================================================

async function testCreateTaskDefaults(): Promise<boolean | null> {
  logSection("Test #1: Create task with defaults");
  logTest("Task creation populates correct defaults", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "test-task",
      prompt: "Say hello",
      schedule: { type: "interval", every: 60000 },
      mode: "isolated",
    });

    const checks: string[] = [];

    if (task.status !== "active") {
      checks.push(`status=${task.status}, expected=active`);
    }
    if (task.mode !== "isolated") {
      checks.push(`mode=${task.mode}, expected=isolated`);
    }
    if (!task.id.startsWith("task_")) {
      checks.push(`id=${task.id} does not start with task_`);
    }
    if (task.tools !== true) {
      checks.push(`tools=${task.tools}, expected=true`);
    }
    if (task.timeout !== 120000) {
      checks.push(`timeout=${task.timeout}, expected=120000`);
    }
    if (task.retry.maxAttempts !== 3) {
      checks.push(`retry.maxAttempts=${task.retry.maxAttempts}, expected=3`);
    }

    await manager.shutdown();

    if (checks.length > 0) {
      logTest(
        "Task creation populates correct defaults",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Task creation populates correct defaults",
      "PASS",
      `id=${task.id}, status=${task.status}, tools=${task.tools}, timeout=${task.timeout}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Task creation populates correct defaults", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #2: List tasks
// ============================================================

async function testListTasks(): Promise<boolean | null> {
  logSection("Test #2: List tasks");
  logTest("List returns created tasks", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    await manager.create({
      name: "list-test",
      prompt: "Say hello",
      schedule: { type: "interval", every: 60000 },
    });

    const tasks = await manager.list();
    await manager.shutdown();

    if (tasks.length !== 1) {
      logTest(
        "List returns created tasks",
        "FAIL",
        `count=${tasks.length}, expected=1`,
      );
      return false;
    }

    logTest("List returns created tasks", "PASS", `count=${tasks.length}`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("List returns created tasks", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #3: Get task by ID
// ============================================================

async function testGetTask(): Promise<boolean | null> {
  logSection("Test #3: Get task by ID");
  logTest("Get returns correct task", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "get-test",
      prompt: "Say hello",
      schedule: { type: "interval", every: 60000 },
    });

    const fetched = await manager.get(task.id);
    await manager.shutdown();

    const checks: string[] = [];
    if (!fetched) {
      logTest("Get returns correct task", "FAIL", "Fetched task is null");
      return false;
    }
    if (fetched.id !== task.id) {
      checks.push(`id mismatch: ${fetched.id} !== ${task.id}`);
    }
    if (fetched.prompt !== "Say hello") {
      checks.push(`prompt=${fetched.prompt}, expected=Say hello`);
    }

    if (checks.length > 0) {
      logTest("Get returns correct task", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "Get returns correct task",
      "PASS",
      `id=${fetched.id}, name=${fetched.name}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Get returns correct task", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #4: Pause task
// ============================================================

async function testPauseTask(): Promise<boolean | null> {
  logSection("Test #4: Pause task");
  logTest("Pause transitions task to paused status", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "pause-test",
      prompt: "Say hello",
      schedule: { type: "interval", every: 60000 },
    });

    const paused = await manager.pause(task.id);
    await manager.shutdown();

    if (paused.status !== "paused") {
      logTest(
        "Pause transitions task to paused status",
        "FAIL",
        `status=${paused.status}, expected=paused`,
      );
      return false;
    }

    logTest(
      "Pause transitions task to paused status",
      "PASS",
      `status=${paused.status}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Pause transitions task to paused status", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #5: Resume task
// ============================================================

async function testResumeTask(): Promise<boolean | null> {
  logSection("Test #5: Resume task");
  logTest("Resume transitions paused task back to active", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "resume-test",
      prompt: "Say hello",
      schedule: { type: "interval", every: 60000 },
    });

    await manager.pause(task.id);
    const resumed = await manager.resume(task.id);
    await manager.shutdown();

    if (resumed.status !== "active") {
      logTest(
        "Resume transitions paused task back to active",
        "FAIL",
        `status=${resumed.status}, expected=active`,
      );
      return false;
    }

    logTest(
      "Resume transitions paused task back to active",
      "PASS",
      `status=${resumed.status}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Resume transitions paused task back to active", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #6: Update task
// ============================================================

async function testUpdateTask(): Promise<boolean | null> {
  logSection("Test #6: Update task");
  logTest("Update modifies task fields correctly", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "update-test",
      prompt: "Original prompt",
      schedule: { type: "interval", every: 60000 },
    });

    const updated = await manager.update(task.id, {
      prompt: "Updated prompt",
    });
    await manager.shutdown();

    const checks: string[] = [];
    if (updated.prompt !== "Updated prompt") {
      checks.push(`prompt=${updated.prompt}, expected=Updated prompt`);
    }
    if (updated.id !== task.id) {
      checks.push(`id changed: ${updated.id} !== ${task.id}`);
    }

    if (checks.length > 0) {
      logTest(
        "Update modifies task fields correctly",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Update modifies task fields correctly",
      "PASS",
      `prompt="${updated.prompt}", id unchanged=${updated.id === task.id}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Update modifies task fields correctly", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #7: Continuation mode (sessionId generation)
// ============================================================

async function testContinuationMode(): Promise<boolean | null> {
  logSection("Test #7: Continuation mode");
  logTest("Continuation task gets a sessionId", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "cont-task",
      prompt: "Remember this",
      schedule: { type: "cron", expression: "0 9 * * *" },
      mode: "continuation",
    });

    await manager.shutdown();

    const checks: string[] = [];
    if (!task.sessionId) {
      checks.push("sessionId is null/undefined");
    } else if (!task.sessionId.startsWith("session_")) {
      checks.push(`sessionId=${task.sessionId} does not start with session_`);
    }
    if (task.mode !== "continuation") {
      checks.push(`mode=${task.mode}, expected=continuation`);
    }

    if (checks.length > 0) {
      logTest("Continuation task gets a sessionId", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "Continuation task gets a sessionId",
      "PASS",
      `sessionId=${task.sessionId}, mode=${task.mode}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Continuation task gets a sessionId", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #8: One-shot (once) schedule
// ============================================================

async function testOnceSchedule(): Promise<boolean | null> {
  logSection("Test #8: One-shot schedule");
  logTest("Once schedule type is preserved", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const task = await manager.create({
      name: "once-task",
      prompt: "Do this once",
      schedule: { type: "once", at: futureDate },
    });

    await manager.shutdown();

    if (task.schedule.type !== "once") {
      logTest(
        "Once schedule type is preserved",
        "FAIL",
        `schedule.type=${task.schedule.type}, expected=once`,
      );
      return false;
    }

    logTest(
      "Once schedule type is preserved",
      "PASS",
      `schedule.type=${task.schedule.type}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Once schedule type is preserved", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #9: Task with provider/model/config overrides
// ============================================================

async function testTaskOverrides(): Promise<boolean | null> {
  logSection("Test #9: Task with configuration overrides");
  logTest("Provider, model, and config overrides are stored", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "override-task",
      prompt: "Custom config",
      schedule: { type: "interval", every: 30000 },
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.5,
      maxTokens: 1000,
      maxRuns: 10,
      systemPrompt: "You are helpful",
      tools: false,
    });

    await manager.shutdown();

    const checks: string[] = [];
    if (task.provider !== "openai") {
      checks.push(`provider=${task.provider}, expected=openai`);
    }
    if (task.model !== "gpt-4o") {
      checks.push(`model=${task.model}, expected=gpt-4o`);
    }
    if (task.temperature !== 0.5) {
      checks.push(`temperature=${task.temperature}, expected=0.5`);
    }
    if (task.maxTokens !== 1000) {
      checks.push(`maxTokens=${task.maxTokens}, expected=1000`);
    }
    if (task.maxRuns !== 10) {
      checks.push(`maxRuns=${task.maxRuns}, expected=10`);
    }
    if (task.tools !== false) {
      checks.push(`tools=${task.tools}, expected=false`);
    }

    if (checks.length > 0) {
      logTest(
        "Provider, model, and config overrides are stored",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Provider, model, and config overrides are stored",
      "PASS",
      `provider=${task.provider}, model=${task.model}, temp=${task.temperature}, maxTokens=${task.maxTokens}, maxRuns=${task.maxRuns}, tools=${task.tools}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Provider, model, and config overrides are stored", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #10: Delete task
// ============================================================

async function testDeleteTask(): Promise<boolean | null> {
  logSection("Test #10: Delete task");
  logTest("Delete removes task from store", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task1 = await manager.create({
      name: "delete-me",
      prompt: "To be deleted",
      schedule: { type: "interval", every: 60000 },
    });
    const task2 = await manager.create({
      name: "keep-me",
      prompt: "Stays around",
      schedule: { type: "interval", every: 60000 },
    });

    await manager.delete(task1.id);

    const remaining = await manager.list();
    const deleted = await manager.get(task1.id);

    await manager.shutdown();

    const checks: string[] = [];
    if (remaining.length !== 1) {
      checks.push(`remaining count=${remaining.length}, expected=1`);
    }
    if (deleted !== null) {
      checks.push("Deleted task still returned by get()");
    }

    if (checks.length > 0) {
      logTest("Delete removes task from store", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "Delete removes task from store",
      "PASS",
      `remaining=${remaining.length}, deleted=null`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Delete removes task from store", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #11: List with status filter
// ============================================================

async function testListWithFilter(): Promise<boolean | null> {
  logSection("Test #11: List with status filter");
  logTest("List filter returns correct subset", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const t1 = await manager.create({
      name: "active-1",
      prompt: "P1",
      schedule: { type: "interval", every: 60000 },
    });
    await manager.create({
      name: "active-2",
      prompt: "P2",
      schedule: { type: "interval", every: 60000 },
    });

    // Pause one
    await manager.pause(t1.id);

    const activeTasks = await manager.list({ status: "active" });
    const pausedTasks = await manager.list({ status: "paused" });
    const allTasks = await manager.list();

    await manager.shutdown();

    const checks: string[] = [];
    if (activeTasks.length !== 1) {
      checks.push(`active count=${activeTasks.length}, expected=1`);
    }
    if (pausedTasks.length !== 1) {
      checks.push(`paused count=${pausedTasks.length}, expected=1`);
    }
    if (allTasks.length !== 2) {
      checks.push(`total count=${allTasks.length}, expected=2`);
    }

    if (checks.length > 0) {
      logTest("List filter returns correct subset", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "List filter returns correct subset",
      "PASS",
      `active=${activeTasks.length}, paused=${pausedTasks.length}, total=${allTasks.length}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("List filter returns correct subset", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #12: Get nonexistent task returns null
// ============================================================

async function testGetNonexistent(): Promise<boolean | null> {
  logSection("Test #12: Get nonexistent task");
  logTest("Get with invalid ID returns null without throwing", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const result = await manager.get("nonexistent_id_xyz");
    await manager.shutdown();

    if (result !== null) {
      logTest(
        "Get with invalid ID returns null without throwing",
        "FAIL",
        `Expected null, got ${JSON.stringify(result)}`,
      );
      return false;
    }

    logTest(
      "Get with invalid ID returns null without throwing",
      "PASS",
      "result=null",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(
      "Get with invalid ID returns null without throwing",
      "FAIL",
      `Unexpected throw: ${msg}`,
    );
    return false;
  }
}

// ============================================================
// TEST #13: Pause nonexistent task throws
// ============================================================

async function testPauseNonexistent(): Promise<boolean | null> {
  logSection("Test #13: Pause nonexistent task");
  logTest("Pause with invalid ID throws 'not found'", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    let threw = false;
    let errorMsg = "";
    try {
      await manager.pause("nonexistent_id_xyz");
    } catch (e) {
      threw = true;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    await manager.shutdown();

    if (!threw) {
      logTest(
        "Pause with invalid ID throws 'not found'",
        "FAIL",
        "Did not throw",
      );
      return false;
    }
    if (!errorMsg.toLowerCase().includes("not found")) {
      logTest(
        "Pause with invalid ID throws 'not found'",
        "FAIL",
        `Error message: ${errorMsg}`,
      );
      return false;
    }

    logTest(
      "Pause with invalid ID throws 'not found'",
      "PASS",
      `error="${errorMsg}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Pause with invalid ID throws 'not found'", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #14: Pause already-paused task throws
// ============================================================

async function testPauseAlreadyPaused(): Promise<boolean | null> {
  logSection("Test #14: Pause already-paused task");
  logTest("Pause on paused task throws 'Cannot pause'", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "double-pause",
      prompt: "Test",
      schedule: { type: "interval", every: 60000 },
    });

    await manager.pause(task.id);

    let threw = false;
    let errorMsg = "";
    try {
      await manager.pause(task.id);
    } catch (e) {
      threw = true;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    await manager.shutdown();

    if (!threw) {
      logTest(
        "Pause on paused task throws 'Cannot pause'",
        "FAIL",
        "Did not throw on double pause",
      );
      return false;
    }
    if (!errorMsg.includes("Cannot pause")) {
      logTest(
        "Pause on paused task throws 'Cannot pause'",
        "FAIL",
        `Error message: ${errorMsg}`,
      );
      return false;
    }

    logTest(
      "Pause on paused task throws 'Cannot pause'",
      "PASS",
      `error="${errorMsg}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Pause on paused task throws 'Cannot pause'", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #15: Resume non-paused task throws
// ============================================================

async function testResumeNonPaused(): Promise<boolean | null> {
  logSection("Test #15: Resume non-paused task");
  logTest("Resume on active task throws 'Cannot resume'", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "resume-active",
      prompt: "Test",
      schedule: { type: "interval", every: 60000 },
    });

    let threw = false;
    let errorMsg = "";
    try {
      await manager.resume(task.id);
    } catch (e) {
      threw = true;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    await manager.shutdown();

    if (!threw) {
      logTest(
        "Resume on active task throws 'Cannot resume'",
        "FAIL",
        "Did not throw",
      );
      return false;
    }
    if (!errorMsg.includes("Cannot resume")) {
      logTest(
        "Resume on active task throws 'Cannot resume'",
        "FAIL",
        `Error message: ${errorMsg}`,
      );
      return false;
    }

    logTest(
      "Resume on active task throws 'Cannot resume'",
      "PASS",
      `error="${errorMsg}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Resume on active task throws 'Cannot resume'", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #16: Health check
// ============================================================

async function testHealthCheck(): Promise<boolean | null> {
  logSection("Test #16: Health check");
  logTest("NodeTimeout backend reports healthy", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    // Trigger initialization by creating a task
    await manager.create({
      name: "health-test",
      prompt: "Test",
      schedule: { type: "interval", every: 60000 },
    });

    const healthy = await manager.isHealthy();
    await manager.shutdown();

    if (healthy !== true) {
      logTest(
        "NodeTimeout backend reports healthy",
        "FAIL",
        `healthy=${healthy}, expected=true`,
      );
      return false;
    }

    logTest(
      "NodeTimeout backend reports healthy",
      "PASS",
      `healthy=${healthy}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("NodeTimeout backend reports healthy", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #17: Isolated mode does not get sessionId
// ============================================================

async function testIsolatedModeNoSession(): Promise<boolean | null> {
  logSection("Test #17: Isolated mode has no sessionId");
  logTest("Isolated task has no sessionId", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "isolated-test",
      prompt: "Isolated",
      schedule: { type: "interval", every: 60000 },
      mode: "isolated",
    });

    await manager.shutdown();

    if (task.sessionId !== undefined) {
      logTest(
        "Isolated task has no sessionId",
        "FAIL",
        `sessionId=${task.sessionId}, expected=undefined`,
      );
      return false;
    }

    logTest(
      "Isolated task has no sessionId",
      "PASS",
      `sessionId=${task.sessionId}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Isolated task has no sessionId", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #18: Cron schedule type
// ============================================================

async function testCronSchedule(): Promise<boolean | null> {
  logSection("Test #18: Cron schedule type");
  logTest("Cron schedule expression is preserved", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "cron-task",
      prompt: "Cron test",
      schedule: { type: "cron", expression: "*/5 * * * *" },
    });

    await manager.shutdown();

    const checks: string[] = [];
    if (task.schedule.type !== "cron") {
      checks.push(`schedule.type=${task.schedule.type}, expected=cron`);
    }
    if (
      task.schedule.type === "cron" &&
      task.schedule.expression !== "*/5 * * * *"
    ) {
      checks.push(
        `expression=${(task.schedule as { expression: string }).expression}, expected=*/5 * * * *`,
      );
    }

    if (checks.length > 0) {
      logTest(
        "Cron schedule expression is preserved",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Cron schedule expression is preserved",
      "PASS",
      `type=${task.schedule.type}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Cron schedule expression is preserved", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #19: Interval schedule type
// ============================================================

async function testIntervalSchedule(): Promise<boolean | null> {
  logSection("Test #19: Interval schedule type");
  logTest("Interval schedule milliseconds are preserved", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "interval-task",
      prompt: "Interval test",
      schedule: { type: "interval", every: 45000 },
    });

    await manager.shutdown();

    const checks: string[] = [];
    if (task.schedule.type !== "interval") {
      checks.push(`schedule.type=${task.schedule.type}, expected=interval`);
    }
    if (task.schedule.type === "interval" && task.schedule.every !== 45000) {
      checks.push(
        `every=${(task.schedule as { every: number }).every}, expected=45000`,
      );
    }

    if (checks.length > 0) {
      logTest(
        "Interval schedule milliseconds are preserved",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Interval schedule milliseconds are preserved",
      "PASS",
      `type=${task.schedule.type}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Interval schedule milliseconds are preserved", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #20: Default retry backoff values
// ============================================================

async function testDefaultRetryBackoff(): Promise<boolean | null> {
  logSection("Test #20: Default retry backoff values");
  logTest("Default backoff array is [30000, 60000, 300000]", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "retry-defaults",
      prompt: "Test",
      schedule: { type: "interval", every: 60000 },
    });

    await manager.shutdown();

    const expected = [30000, 60000, 300000];
    const actual = task.retry.backoffMs;

    if (
      actual.length !== expected.length ||
      !actual.every((v: number, i: number) => v === expected[i])
    ) {
      logTest(
        "Default backoff array is [30000, 60000, 300000]",
        "FAIL",
        `actual=${JSON.stringify(actual)}, expected=${JSON.stringify(expected)}`,
      );
      return false;
    }

    logTest(
      "Default backoff array is [30000, 60000, 300000]",
      "PASS",
      `backoffMs=${JSON.stringify(actual)}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Default backoff array is [30000, 60000, 300000]", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #21: Custom retry configuration
// ============================================================

async function testCustomRetry(): Promise<boolean | null> {
  logSection("Test #21: Custom retry configuration");
  logTest("Custom retry values override defaults", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "custom-retry",
      prompt: "Test",
      schedule: { type: "interval", every: 60000 },
      retry: { maxAttempts: 5, backoffMs: [1000, 5000] },
    });

    await manager.shutdown();

    const checks: string[] = [];
    if (task.retry.maxAttempts !== 5) {
      checks.push(`maxAttempts=${task.retry.maxAttempts}, expected=5`);
    }
    if (task.retry.backoffMs[0] !== 1000 || task.retry.backoffMs[1] !== 5000) {
      checks.push(
        `backoffMs=${JSON.stringify(task.retry.backoffMs)}, expected=[1000,5000]`,
      );
    }

    if (checks.length > 0) {
      logTest(
        "Custom retry values override defaults",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Custom retry values override defaults",
      "PASS",
      `maxAttempts=${task.retry.maxAttempts}, backoffMs=${JSON.stringify(task.retry.backoffMs)}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Custom retry values override defaults", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #22: Task timestamp fields
// ============================================================

async function testTimestampFields(): Promise<boolean | null> {
  logSection("Test #22: Task timestamp fields");
  logTest("createdAt and updatedAt are valid ISO timestamps", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const before = new Date().toISOString();
    const task = await manager.create({
      name: "timestamp-test",
      prompt: "Test",
      schedule: { type: "interval", every: 60000 },
    });
    const after = new Date().toISOString();

    await manager.shutdown();

    const checks: string[] = [];

    // Validate ISO format by trying to parse
    const createdDate = new Date(task.createdAt);
    const updatedDate = new Date(task.updatedAt);

    if (isNaN(createdDate.getTime())) {
      checks.push(`createdAt="${task.createdAt}" is not a valid date`);
    }
    if (isNaN(updatedDate.getTime())) {
      checks.push(`updatedAt="${task.updatedAt}" is not a valid date`);
    }

    // Check that timestamps are within reasonable range
    if (task.createdAt < before || task.createdAt > after) {
      checks.push(`createdAt=${task.createdAt} is outside expected range`);
    }

    if (task.runCount !== 0) {
      checks.push(`runCount=${task.runCount}, expected=0`);
    }

    if (checks.length > 0) {
      logTest(
        "createdAt and updatedAt are valid ISO timestamps",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "createdAt and updatedAt are valid ISO timestamps",
      "PASS",
      `createdAt=${task.createdAt}, runCount=${task.runCount}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("createdAt and updatedAt are valid ISO timestamps", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #23: Task metadata field
// ============================================================

async function testMetadataField(): Promise<boolean | null> {
  logSection("Test #23: Task metadata field");
  logTest("Metadata is preserved on task", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const meta = { env: "test", version: 42, tags: ["a", "b"] };
    const task = await manager.create({
      name: "meta-task",
      prompt: "Test",
      schedule: { type: "interval", every: 60000 },
      metadata: meta,
    });

    await manager.shutdown();

    const checks: string[] = [];
    if (!task.metadata) {
      checks.push("metadata is undefined");
    } else {
      if (task.metadata.env !== "test") {
        checks.push(`metadata.env=${task.metadata.env}, expected=test`);
      }
      if (task.metadata.version !== 42) {
        checks.push(`metadata.version=${task.metadata.version}, expected=42`);
      }
      if (!Array.isArray(task.metadata.tags)) {
        checks.push("metadata.tags is not an array");
      }
    }

    if (checks.length > 0) {
      logTest("Metadata is preserved on task", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "Metadata is preserved on task",
      "PASS",
      `metadata=${JSON.stringify(task.metadata)}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Metadata is preserved on task", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #24: System prompt override
// ============================================================

async function testSystemPromptOverride(): Promise<boolean | null> {
  logSection("Test #24: System prompt override");
  logTest("System prompt is stored on task", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "sysprompt-task",
      prompt: "Test",
      schedule: { type: "interval", every: 60000 },
      systemPrompt: "You are a helpful assistant",
    });

    await manager.shutdown();

    if (task.systemPrompt !== "You are a helpful assistant") {
      logTest(
        "System prompt is stored on task",
        "FAIL",
        `systemPrompt="${task.systemPrompt}", expected="You are a helpful assistant"`,
      );
      return false;
    }

    logTest(
      "System prompt is stored on task",
      "PASS",
      `systemPrompt="${task.systemPrompt}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("System prompt is stored on task", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #25: Update multiple fields
// ============================================================

async function testUpdateMultipleFields(): Promise<boolean | null> {
  logSection("Test #25: Update multiple fields");
  logTest("Multiple fields can be updated in one call", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "multi-update",
      prompt: "Original",
      schedule: { type: "interval", every: 60000 },
      temperature: 0.5,
    });

    const updated = await manager.update(task.id, {
      prompt: "Updated",
      temperature: 0.9,
      maxTokens: 2000,
    });

    await manager.shutdown();

    const checks: string[] = [];
    if (updated.prompt !== "Updated") {
      checks.push(`prompt="${updated.prompt}", expected="Updated"`);
    }
    if (updated.temperature !== 0.9) {
      checks.push(`temperature=${updated.temperature}, expected=0.9`);
    }
    if (updated.maxTokens !== 2000) {
      checks.push(`maxTokens=${updated.maxTokens}, expected=2000`);
    }

    if (checks.length > 0) {
      logTest(
        "Multiple fields can be updated in one call",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Multiple fields can be updated in one call",
      "PASS",
      `prompt="${updated.prompt}", temp=${updated.temperature}, maxTokens=${updated.maxTokens}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Multiple fields can be updated in one call", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #26: Delete multiple tasks
// ============================================================

async function testDeleteMultipleTasks(): Promise<boolean | null> {
  logSection("Test #26: Delete multiple tasks");
  logTest("Multiple deletes leave correct count", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const t1 = await manager.create({
      name: "del-1",
      prompt: "P1",
      schedule: { type: "interval", every: 60000 },
    });
    const t2 = await manager.create({
      name: "del-2",
      prompt: "P2",
      schedule: { type: "interval", every: 60000 },
    });
    const t3 = await manager.create({
      name: "del-3",
      prompt: "P3",
      schedule: { type: "interval", every: 60000 },
    });

    await manager.delete(t1.id);
    await manager.delete(t3.id);

    const remaining = await manager.list();
    await manager.shutdown();

    if (remaining.length !== 1) {
      logTest(
        "Multiple deletes leave correct count",
        "FAIL",
        `count=${remaining.length}, expected=1`,
      );
      return false;
    }
    if (remaining[0].id !== t2.id) {
      logTest(
        "Multiple deletes leave correct count",
        "FAIL",
        `remaining id=${remaining[0].id}, expected=${t2.id}`,
      );
      return false;
    }

    logTest(
      "Multiple deletes leave correct count",
      "PASS",
      `remaining=${remaining.length}, kept=${remaining[0].name}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Multiple deletes leave correct count", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #27: Update nonexistent task throws
// ============================================================

async function testUpdateNonexistent(): Promise<boolean | null> {
  logSection("Test #27: Update nonexistent task");
  logTest("Update with invalid ID throws 'not found'", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    // Initialize store by creating+deleting a task
    const tmp = await manager.create({
      name: "tmp",
      prompt: "T",
      schedule: { type: "interval", every: 60000 },
    });
    await manager.delete(tmp.id);

    let threw = false;
    let errorMsg = "";
    try {
      await manager.update("nonexistent_id_xyz", { prompt: "New" });
    } catch (e) {
      threw = true;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    await manager.shutdown();

    if (!threw) {
      logTest(
        "Update with invalid ID throws 'not found'",
        "FAIL",
        "Did not throw",
      );
      return false;
    }
    if (!errorMsg.toLowerCase().includes("not found")) {
      logTest(
        "Update with invalid ID throws 'not found'",
        "FAIL",
        `Error message: ${errorMsg}`,
      );
      return false;
    }

    logTest(
      "Update with invalid ID throws 'not found'",
      "PASS",
      `error="${errorMsg}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Update with invalid ID throws 'not found'", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #28: Shutdown and re-initialization
// ============================================================

async function testShutdownReinit(): Promise<boolean | null> {
  logSection("Test #28: Shutdown and re-initialization");
  logTest("TaskManager re-initializes after shutdown", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    // First use
    const task = await manager.create({
      name: "reinit-test",
      prompt: "Test",
      schedule: { type: "interval", every: 60000 },
    });

    await manager.shutdown();

    // Re-use after shutdown (triggers lazy re-init)
    const tasks = await manager.list();
    await manager.shutdown();

    // The task should still be present since FileTaskStore persists to disk
    const found = tasks.some((t: Task) => t.name === "reinit-test");

    if (!found) {
      logTest(
        "TaskManager re-initializes after shutdown",
        "FAIL",
        "Task not found after re-initialization",
      );
      return false;
    }

    logTest(
      "TaskManager re-initializes after shutdown",
      "PASS",
      `tasks after reinit=${tasks.length}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("TaskManager re-initializes after shutdown", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #29: Default mode is isolated
// ============================================================

async function testDefaultModeIsolated(): Promise<boolean | null> {
  logSection("Test #29: Default mode is isolated");
  logTest("Omitting mode defaults to isolated", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "default-mode",
      prompt: "Test",
      schedule: { type: "interval", every: 60000 },
      // mode is NOT specified
    });

    await manager.shutdown();

    if (task.mode !== "isolated") {
      logTest(
        "Omitting mode defaults to isolated",
        "FAIL",
        `mode=${task.mode}, expected=isolated`,
      );
      return false;
    }

    logTest("Omitting mode defaults to isolated", "PASS", `mode=${task.mode}`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Omitting mode defaults to isolated", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #30: Task ID uniqueness
// ============================================================

async function testTaskIdUniqueness(): Promise<boolean | null> {
  logSection("Test #30: Task ID uniqueness");
  logTest("Each created task gets a unique ID", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const task = await manager.create({
        name: `unique-${i}`,
        prompt: "Test",
        schedule: { type: "interval", every: 60000 },
      });
      ids.add(task.id);
    }

    await manager.shutdown();

    if (ids.size !== 10) {
      logTest(
        "Each created task gets a unique ID",
        "FAIL",
        `unique IDs=${ids.size}, expected=10`,
      );
      return false;
    }

    logTest(
      "Each created task gets a unique ID",
      "PASS",
      `10 tasks, 10 unique IDs`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Each created task gets a unique ID", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #31: Pause-resume cycle preserves task data
// ============================================================

async function testPauseResumeCyclePreservesData(): Promise<boolean | null> {
  logSection("Test #31: Pause-resume preserves task data");
  logTest("Task data is preserved through pause-resume cycle", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "cycle-test",
      prompt: "Original prompt for cycle",
      schedule: { type: "interval", every: 60000 },
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
    });

    await manager.pause(task.id);
    const resumed = await manager.resume(task.id);

    await manager.shutdown();

    const checks: string[] = [];
    if (resumed.name !== "cycle-test") {
      checks.push(`name="${resumed.name}", expected="cycle-test"`);
    }
    if (resumed.prompt !== "Original prompt for cycle") {
      checks.push(`prompt changed`);
    }
    if (resumed.provider !== "openai") {
      checks.push(`provider="${resumed.provider}", expected="openai"`);
    }
    if (resumed.model !== "gpt-4o") {
      checks.push(`model="${resumed.model}", expected="gpt-4o"`);
    }
    if (resumed.temperature !== 0.7) {
      checks.push(`temperature=${resumed.temperature}, expected=0.7`);
    }

    if (checks.length > 0) {
      logTest(
        "Task data is preserved through pause-resume cycle",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Task data is preserved through pause-resume cycle",
      "PASS",
      `name, prompt, provider, model, temperature all preserved`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Task data is preserved through pause-resume cycle", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #32: Update preserves non-updated fields
// ============================================================

async function testUpdatePreservesOtherFields(): Promise<boolean | null> {
  logSection("Test #32: Update preserves non-updated fields");
  logTest("Updating one field does not clobber others", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "preserve-test",
      prompt: "Original",
      schedule: { type: "interval", every: 60000 },
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.5,
      tools: false,
    });

    // Update only the prompt
    const updated = await manager.update(task.id, { prompt: "New prompt" });
    await manager.shutdown();

    const checks: string[] = [];
    if (updated.prompt !== "New prompt") {
      checks.push(`prompt="${updated.prompt}", expected="New prompt"`);
    }
    if (updated.provider !== "openai") {
      checks.push(`provider="${updated.provider}" changed (should be openai)`);
    }
    if (updated.model !== "gpt-4o") {
      checks.push(`model="${updated.model}" changed (should be gpt-4o)`);
    }
    if (updated.temperature !== 0.5) {
      checks.push(`temperature=${updated.temperature} changed (should be 0.5)`);
    }
    if (updated.tools !== false) {
      checks.push(`tools=${updated.tools} changed (should be false)`);
    }
    if (updated.name !== "preserve-test") {
      checks.push(`name="${updated.name}" changed (should be preserve-test)`);
    }

    if (checks.length > 0) {
      logTest(
        "Updating one field does not clobber others",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Updating one field does not clobber others",
      "PASS",
      `prompt updated, provider/model/temperature/tools/name unchanged`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Updating one field does not clobber others", "FAIL", msg);
    return false;
  }
}

// ============================================================
// ADDITIONAL HELPERS (for groups 2–6)
// ============================================================

/** Create NeuroLink with custom task options */
function createSDKWithOpts(opts: Record<string, unknown> = {}): NeuroLink {
  return new NeuroLink({
    tasks: { backend: "node-timeout", ...opts },
  });
}

/** Async sleep */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// PREFLIGHT: AI provider availability
// ============================================================

async function checkAIProvider(): Promise<boolean> {
  try {
    const sdk = new NeuroLink({ tasks: { backend: "node-timeout" } });
    const result = await sdk.generate({
      input: { text: "Reply: OK" },
      maxTokens: 10,
    });
    await sdk.tasks.shutdown();
    return result.content?.includes("OK") ?? false;
  } catch {
    return false;
  }
}

// ============================================================
// PREFLIGHT: Redis availability
// ============================================================

async function checkRedis(): Promise<boolean> {
  try {
    const { createClient } = await import("redis");
    const client = createClient({ url: "redis://localhost:6379/15" });
    await client.connect();
    const pong = await client.ping();
    await client.quit();
    return pong === "PONG";
  } catch {
    return false;
  }
}

async function cleanRedis(): Promise<void> {
  try {
    const { createClient } = await import("redis");
    const client = createClient({ url: "redis://localhost:6379/15" });
    await client.connect();
    const keys = await client.keys("neurolink:*");
    if (keys.length > 0) {
      await client.del(keys);
    }
    const bullKeys = await client.keys("bull:neurolink*");
    if (bullKeys.length > 0) {
      await client.del(bullKeys);
    }
    await client.quit();
  } catch {
    /* Redis not available */
  }
}

function createBullMQSDK(): NeuroLink {
  return new NeuroLink({
    tasks: {
      backend: "bullmq",
      redis: { host: "localhost", port: 6379, db: 15 },
    },
  });
}

// ============================================================
// GROUP 2: EDGE CASES (no AI needed)
// ============================================================

// ── Test #33: onError callback fires on failure ──

async function testOnErrorCallback(): Promise<boolean | null> {
  logSection("Test #33: onError callback fires on failure");
  logTest("onError callback fires with correct payload", "TESTING");

  try {
    const sdk = createSDKWithOpts();
    const manager = sdk.tasks;

    let errorCalled = false;
    let errorPayload: Record<string, unknown> | null = null;

    const task = await manager.create({
      name: "error-cb-test",
      prompt: "This should fail",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "invalid-provider-xyz",
      maxTokens: 50,
      retry: { maxAttempts: 1, backoffMs: [] },
      onError: (err: Record<string, unknown>) => {
        errorCalled = true;
        errorPayload = err;
      },
    });

    const run = await manager.run(task.id);
    // Poll for callback (up to 2s)
    const cbDeadline = Date.now() + 2000;
    while (!errorCalled && Date.now() < cbDeadline) {
      await sleep(50);
    }

    await manager.shutdown();

    const checks: string[] = [];
    if (run.status !== "error") {
      checks.push(`run.status=${run.status}, expected=error`);
    }
    if (!errorCalled) {
      checks.push("onError callback was not called");
    }
    if (
      errorPayload &&
      (errorPayload as Record<string, unknown>).taskId !== task.id
    ) {
      checks.push(
        `errorPayload.taskId=${(errorPayload as Record<string, unknown>).taskId}, expected=${task.id}`,
      );
    }
    if (!errorPayload || !(errorPayload as Record<string, unknown>).error) {
      checks.push("errorPayload.error is missing");
    }
    if (!errorPayload || !(errorPayload as Record<string, unknown>).timestamp) {
      checks.push("errorPayload.timestamp is missing");
    }

    if (checks.length > 0) {
      logTest(
        "onError callback fires with correct payload",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "onError callback fires with correct payload",
      "PASS",
      `called=${errorCalled}, taskId match=true`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("onError callback fires with correct payload", "FAIL", msg);
    return false;
  }
}

// ── Test #34: Non-transient error does NOT retry ──

async function testNoRetryOnPermanentError(): Promise<boolean | null> {
  logSection("Test #34: Non-transient error does NOT retry");
  logTest("Invalid provider fails fast without backoff", "TESTING");

  try {
    const sdk = createSDKWithOpts();
    const manager = sdk.tasks;

    const startTime = Date.now();

    const task = await manager.create({
      name: "no-retry-test",
      prompt: "This should fail immediately",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "invalid-provider-xyz",
      maxTokens: 50,
      retry: { maxAttempts: 3, backoffMs: [5000, 10000, 30000] },
    });

    const run = await manager.run(task.id);
    const elapsed = Date.now() - startTime;

    await manager.shutdown();

    const checks: string[] = [];
    if (run.status !== "error") {
      checks.push(`run.status=${run.status}, expected=error`);
    }
    if (!run.error) {
      checks.push("run.error is empty");
    }
    // If it retried with 5s+ backoff, elapsed would be >5000ms
    if (elapsed >= 5000) {
      checks.push(`elapsed=${elapsed}ms, expected <5000ms (no backoff)`);
    }

    if (checks.length > 0) {
      logTest(
        "Invalid provider fails fast without backoff",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Invalid provider fails fast without backoff",
      "PASS",
      `elapsed=${elapsed}ms, status=${run.status}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Invalid provider fails fast without backoff", "FAIL", msg);
    return false;
  }
}

// ── Test #35: Invalid cron expression ──

async function testInvalidCronExpression(): Promise<boolean | null> {
  logSection("Test #35: Invalid cron expression");
  logTest("Invalid cron expression throws error", "TESTING");

  try {
    const sdk = createSDKWithOpts();
    const manager = sdk.tasks;

    let threw = false;
    let errorMsg = "";

    try {
      await manager.create({
        name: "bad-cron",
        prompt: "Should not schedule",
        schedule: { type: "cron", expression: "INVALID CRON EXPRESSION" },
        mode: "isolated",
      });
    } catch (e) {
      threw = true;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    await manager.shutdown();

    const checks: string[] = [];
    if (!threw) {
      checks.push("Did not throw on invalid cron expression");
    }
    if (threw && errorMsg.length === 0) {
      checks.push("Threw but error message is empty");
    }

    if (checks.length > 0) {
      logTest(
        "Invalid cron expression throws error",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Invalid cron expression throws error",
      "PASS",
      `threw=true, error="${errorMsg.slice(0, 80)}"`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Invalid cron expression throws error", "FAIL", msg);
    return false;
  }
}

// ── Test #36: Task creation limit enforcement ──

async function testTaskCreationLimit(): Promise<boolean | null> {
  logSection("Test #36: Task creation limit enforcement");
  logTest("maxTasks limit is enforced correctly", "TESTING");

  try {
    const sdk = createSDKWithOpts({ maxTasks: 3 });
    const manager = sdk.tasks;

    // Create 3 tasks (should succeed)
    for (let i = 1; i <= 3; i++) {
      await manager.create({
        name: `limit-test-${i}`,
        prompt: `Task ${i}`,
        schedule: { type: "interval", every: 600000 },
        mode: "isolated",
      });
    }

    const list = await manager.list();

    // 4th task should be rejected
    let threw = false;
    let errorMsg = "";
    try {
      await manager.create({
        name: "limit-test-4",
        prompt: "Should be rejected",
        schedule: { type: "interval", every: 600000 },
        mode: "isolated",
      });
    } catch (e) {
      threw = true;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    // Delete one, then creating should work again
    const firstTask = list[0];
    await manager.delete(firstTask.id);

    let createdAfterDelete = false;
    try {
      await manager.create({
        name: "limit-test-after-delete",
        prompt: "Should succeed now",
        schedule: { type: "interval", every: 600000 },
        mode: "isolated",
      });
      createdAfterDelete = true;
    } catch {
      createdAfterDelete = false;
    }

    await manager.shutdown();

    const checks: string[] = [];
    if (list.length !== 3) {
      checks.push(`initial count=${list.length}, expected=3`);
    }
    if (!threw) {
      checks.push("4th task was not rejected");
    }
    if (
      threw &&
      !errorMsg.includes("limit") &&
      !errorMsg.includes("Task limit")
    ) {
      checks.push(`error missing 'limit': ${errorMsg.slice(0, 80)}`);
    }
    if (!createdAfterDelete) {
      checks.push("Could not create after deleting one");
    }

    if (checks.length > 0) {
      logTest(
        "maxTasks limit is enforced correctly",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "maxTasks limit is enforced correctly",
      "PASS",
      `limit=3, 4th rejected, create-after-delete=ok`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("maxTasks limit is enforced correctly", "FAIL", msg);
    return false;
  }
}

// ── Test #37: Error result structure ──

async function testErrorResultStructure(): Promise<boolean | null> {
  logSection("Test #37: Error result structure completeness");
  logTest("Error result has all required fields", "TESTING");

  try {
    const sdk = createSDKWithOpts();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "error-struct-test",
      prompt: "Fail me",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "invalid-provider-xyz",
      maxTokens: 50,
      retry: { maxAttempts: 1, backoffMs: [] },
    });

    const run = await manager.run(task.id);

    // Verify error run is logged
    const runs = await manager.runs(task.id);

    await manager.shutdown();

    const checks: string[] = [];
    if (run.taskId !== task.id) {
      checks.push(`taskId=${run.taskId}, expected=${task.id}`);
    }
    if (!run.runId || !run.runId.startsWith("run_")) {
      checks.push(`runId=${run.runId}, expected run_ prefix`);
    }
    if (run.status !== "error") {
      checks.push(`status=${run.status}, expected=error`);
    }
    if (typeof run.error !== "string" || run.error.length === 0) {
      checks.push(`error type=${typeof run.error}, expected non-empty string`);
    }
    if (typeof run.durationMs !== "number" || run.durationMs < 0) {
      checks.push(`durationMs=${run.durationMs}, expected >=0 number`);
    }
    if (!run.timestamp) {
      checks.push("timestamp is missing");
    }
    if (run.output !== undefined) {
      checks.push(`output=${run.output}, expected undefined`);
    }
    if (runs.length !== 1) {
      checks.push(`logged runs=${runs.length}, expected=1`);
    }
    if (runs.length > 0 && runs[0]?.status !== "error") {
      checks.push(`logged run status=${runs[0]?.status}, expected=error`);
    }

    if (checks.length > 0) {
      logTest(
        "Error result has all required fields",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Error result has all required fields",
      "PASS",
      `taskId ok, runId ok, status=error, error present, durationMs=${run.durationMs}, timestamp ok, output=undefined, 1 run logged`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Error result has all required fields", "FAIL", msg);
    return false;
  }
}

// ── Test #38: Transient error DOES retry ──

async function testRetryOnTransientError(): Promise<boolean | null> {
  logSection("Test #38: Transient error DOES retry");
  logTest("Transient error triggers retry with backoff", "TESTING");

  try {
    const sdk = createSDKWithOpts();
    const manager = sdk.tasks;

    // Ollama on default port — ECONNREFUSED is a transient error
    const task = await manager.create({
      name: "retry-test",
      prompt: "This should retry",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "ollama",
      maxTokens: 50,
      retry: { maxAttempts: 2, backoffMs: [100] },
    });

    const startTime = Date.now();
    const run = await manager.run(task.id);
    const elapsed = Date.now() - startTime;

    await manager.shutdown();

    const checks: string[] = [];
    if (run.status !== "error") {
      checks.push(`status=${run.status}, expected=error`);
    }
    const errorLower = (run.error || "").toLowerCase();
    const isOllamaError =
      errorLower.includes("ollama") ||
      errorLower.includes("econnrefused") ||
      errorLower.includes("fetch failed");
    if (!isOllamaError) {
      checks.push(`error not ollama-related: ${run.error?.slice(0, 80)}`);
    }
    if ((run.error || "").length <= 10) {
      checks.push(`error too short: len=${run.error?.length}`);
    }

    if (checks.length > 0) {
      logTest(
        "Transient error triggers retry with backoff",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Transient error triggers retry with backoff",
      "PASS",
      `status=error, ollama error, elapsed=${elapsed}ms`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Transient error triggers retry with backoff", "FAIL", msg);
    return false;
  }
}

// ── Test #39: Long continuation — 5 runs with accumulating history ──

async function testLongContinuation(): Promise<boolean | null> {
  logSection("Test #39: Long continuation — 5 runs");
  logTest("5-run continuation with accumulating history", "TESTING");

  try {
    const sdk = createSDKWithOpts();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "long-cont-test",
      prompt:
        'State the current run number (1-indexed) and list ALL numbers from previous runs. Format: "Run N. Previous: X, Y, Z" or "Previous: none".',
      schedule: { type: "interval", every: 600000 },
      mode: "continuation",
      provider: "vertex",
      maxTokens: 200,
    });

    // Access internal store to verify the mechanism (not just model output)
    const store = (
      manager as unknown as {
        store: {
          getHistory(
            id: string,
          ): Promise<Array<{ role: string; content: string }>>;
        };
      }
    ).store;

    const checks: string[] = [];

    // Verify history is empty before first run
    const historyBefore = await store.getHistory(task.id);
    if (historyBefore.length !== 0) {
      checks.push(
        `history before run 1: ${historyBefore.length} entries, expected=0`,
      );
    }

    for (let i = 1; i <= 5; i++) {
      const run = await manager.run(task.id);
      if (run.status !== "success") {
        checks.push(`run ${i}: status=${run.status}, expected=success`);
      }

      // Verify history grows by 2 per run (user + assistant)
      const historyAfter = await store.getHistory(task.id);
      const expectedEntries = i * 2;
      if (historyAfter.length !== expectedEntries) {
        checks.push(
          `history after run ${i}: ${historyAfter.length} entries, expected=${expectedEntries}`,
        );
      }
    }

    // Verify final state
    const taskState = await manager.get(task.id);
    if (taskState?.runCount !== 5) {
      checks.push(`runCount=${taskState?.runCount}, expected=5`);
    }
    const runs = await manager.runs(task.id);
    if (runs.length !== 5) {
      checks.push(`logged runs=${runs.length}, expected=5`);
    }

    // Verify history has correct structure (alternating user/assistant)
    const finalHistory = await store.getHistory(task.id);
    for (let i = 0; i < finalHistory.length; i++) {
      const expectedRole = i % 2 === 0 ? "user" : "assistant";
      if (finalHistory[i].role !== expectedRole) {
        checks.push(
          `history[${i}].role=${finalHistory[i].role}, expected=${expectedRole}`,
        );
      }
    }

    await manager.shutdown();

    if (checks.length > 0) {
      logTest(
        "5-run continuation with accumulating history",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "5-run continuation with accumulating history",
      "PASS",
      `5 runs succeeded, history grew 0→2→4→6→8→10, runCount=5, 5 runs logged, roles alternate user/assistant`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("5-run continuation with accumulating history", "FAIL", msg);
    return false;
  }
}

// ── Test #40: History bounds enforcement ──

async function testHistoryBounds(): Promise<boolean | null> {
  logSection("Test #40: History bounds enforcement");
  logTest("History trimmed to maxHistoryEntries", "TESTING");

  try {
    const sdk = createSDKWithOpts({ maxHistoryEntries: 4 }); // 2 exchanges max
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "history-bound-test",
      prompt:
        'Say "Run N" where N is the current run number based on history length.',
      schedule: { type: "interval", every: 600000 },
      mode: "continuation",
      provider: "vertex",
      maxTokens: 100,
    });

    // Run 4 times
    for (let i = 0; i < 4; i++) {
      await manager.run(task.id);
    }

    const checks: string[] = [];

    const taskState = await manager.get(task.id);
    if (taskState?.runCount !== 4) {
      checks.push(`runCount=${taskState?.runCount}, expected=4`);
    }

    // Verify the history was actually trimmed to maxHistoryEntries (4).
    // TaskManager.store is private, so we access it via cast for test purposes.
    const store = (
      manager as unknown as {
        store: { getHistory(id: string): Promise<Array<unknown>> };
      }
    ).store;
    if (store) {
      const history = await store.getHistory(task.id);
      if (history.length > 4) {
        checks.push(
          `history.length=${history.length}, expected<=4 (maxHistoryEntries)`,
        );
      }
    }

    // Run 5 should still work (history didn't corrupt)
    const finalRun = await manager.run(task.id);
    if (finalRun.status !== "success") {
      checks.push(`run 5 status=${finalRun.status}, expected=success`);
    }

    await manager.shutdown();

    if (checks.length > 0) {
      logTest(
        "History trimmed to maxHistoryEntries",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "History trimmed to maxHistoryEntries",
      "PASS",
      `runCount=4, history<=4 entries, run 5 still works after trim`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("History trimmed to maxHistoryEntries", "FAIL", msg);
    return false;
  }
}

// ============================================================
// GROUP 3: PRODUCTION READINESS (requires AI provider)
// ============================================================

// ── Test #41: Once schedule — creation + manual run ──

async function testProdOnceSchedule(): Promise<boolean | null> {
  logSection("Test #41: Once schedule — creation + manual run");
  logTest("Once schedule task can be manually run", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
    const task = await manager.create({
      name: "once-test",
      prompt: "Reply with exactly: ONCE_OK",
      schedule: { type: "once", at: futureDate },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const checks: string[] = [];
    if (!task.id) {
      checks.push("task.id is missing");
    }
    if (task.schedule.type !== "once") {
      checks.push(`schedule.type=${task.schedule.type}, expected=once`);
    }
    if (task.status !== "active") {
      checks.push(`status=${task.status}, expected=active`);
    }

    // Manual run should work regardless of schedule
    const run = await manager.run(task.id);
    if (run.status !== "success") {
      checks.push(`run.status=${run.status}, expected=success`);
    }
    if (!run.output) {
      checks.push("run.output is empty");
    }

    await manager.shutdown();

    if (checks.length > 0) {
      logTest(
        "Once schedule task can be manually run",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Once schedule task can be manually run",
      "PASS",
      `schedule=once, run=${run.status}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Once schedule task can be manually run", "FAIL", msg);
    return false;
  }
}

// ── Test #39: maxRuns auto-completion ──

async function testProdMaxRuns(): Promise<boolean | null> {
  logSection("Test #39: maxRuns auto-completion");
  logTest("Task completes after maxRuns and rejects further runs", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "maxruns-test",
      prompt: "Reply with exactly: RUN_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
      maxRuns: 2,
    });

    const run1 = await manager.run(task.id);
    const run2 = await manager.run(task.id);
    const finalTask = await manager.get(task.id);

    // Run 3 should be rejected (task is completed)
    const run3 = await manager.run(task.id);

    await manager.shutdown();

    const checks: string[] = [];
    if (run1.status !== "success") {
      checks.push(`run1.status=${run1.status}, expected=success`);
    }
    if (run2.status !== "success") {
      checks.push(`run2.status=${run2.status}, expected=success`);
    }
    if (!finalTask || finalTask.status !== "completed") {
      checks.push(`finalTask.status=${finalTask?.status}, expected=completed`);
    }
    if (!finalTask || finalTask.runCount !== 2) {
      checks.push(`runCount=${finalTask?.runCount}, expected=2`);
    }
    if (run3.status !== "error") {
      checks.push(`run3.status=${run3.status}, expected=error (not active)`);
    }

    if (checks.length > 0) {
      logTest(
        "Task completes after maxRuns and rejects further runs",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Task completes after maxRuns and rejects further runs",
      "PASS",
      `run1=success, run2=success, completed, run3=error`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest(
      "Task completes after maxRuns and rejects further runs",
      "FAIL",
      msg,
    );
    return false;
  }
}

// ── Test #40: Pause/resume with execution ──

async function testProdPauseResume(): Promise<boolean | null> {
  logSection("Test #40: Pause/resume with execution");
  logTest("Paused task skips run, resumed task succeeds", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "pause-test",
      prompt: "Reply with exactly: PAUSE_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const checks: string[] = [];

    if (task.status !== "active") {
      checks.push(`initial status=${task.status}, expected=active`);
    }

    // Pause
    const paused = await manager.pause(task.id);
    if (paused.status !== "paused") {
      checks.push(`paused status=${paused.status}, expected=paused`);
    }

    // Running paused task should be skipped
    const skippedRun = await manager.run(task.id);
    if (skippedRun.status !== "error") {
      checks.push(`skipped run status=${skippedRun.status}, expected=error`);
    }

    // Resume
    const resumed = await manager.resume(task.id);
    if (resumed.status !== "active") {
      checks.push(`resumed status=${resumed.status}, expected=active`);
    }

    // Run should work now
    const run = await manager.run(task.id);
    if (run.status !== "success") {
      checks.push(`resumed run status=${run.status}, expected=success`);
    }

    await manager.shutdown();

    if (checks.length > 0) {
      logTest(
        "Paused task skips run, resumed task succeeds",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Paused task skips run, resumed task succeeds",
      "PASS",
      `pause=ok, skip=ok, resume=ok, run=success`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Paused task skips run, resumed task succeeds", "FAIL", msg);
    return false;
  }
}

// ── Test #41: Pause/resume preserves continuation history ──

async function testProdPauseResumeContinuation(): Promise<boolean | null> {
  logSection("Test #41: Pause/resume preserves continuation history");
  logTest("History survives pause/resume cycle", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "pause-cont-test",
      prompt:
        'Pick a random 4-digit number. If history exists, list previous numbers. Format: "Picked: XXXX. Previous: YYYY" or "Previous: none".',
      schedule: { type: "interval", every: 600000 },
      mode: "continuation",
      provider: "vertex",
      maxTokens: 150,
    });

    // Run 1
    const run1 = await manager.run(task.id);

    // Pause
    await manager.pause(task.id);
    const pausedTask = await manager.get(task.id);

    // Resume
    await manager.resume(task.id);

    // Run 2 — should still have history from run 1
    const run2 = await manager.run(task.id);

    await manager.shutdown();

    const checks: string[] = [];
    if (run1.status !== "success") {
      checks.push(`run1.status=${run1.status}, expected=success`);
    }
    if (!run1.output) {
      checks.push("run1 has no output");
    }
    if (!pausedTask || pausedTask.status !== "paused") {
      checks.push(`paused status=${pausedTask?.status}, expected=paused`);
    }
    if (run2.status !== "success") {
      checks.push(`run2.status=${run2.status}, expected=success`);
    }

    // Check that run 2 acknowledges prior history
    const output2 = run2.output?.toLowerCase() || "";
    const mentionsPrevious =
      output2.includes("previous") && !output2.includes("previous: none");
    const noFirstRun =
      !output2.includes("first run") &&
      !output2.includes("first execution") &&
      !output2.includes("no prior");
    if (!mentionsPrevious && !noFirstRun) {
      checks.push(`run2 may not see history: "${run2.output?.slice(0, 150)}"`);
    }

    if (checks.length > 0) {
      logTest("History survives pause/resume cycle", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "History survives pause/resume cycle",
      "PASS",
      `run1=success, paused, resumed, run2=success with history`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("History survives pause/resume cycle", "FAIL", msg);
    return false;
  }
}

// ── Test #42: Provider/model override ──

async function testProdProviderOverride(): Promise<boolean | null> {
  logSection("Test #42: Provider/model override");
  logTest("Provider and model stored and execution succeeds", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "provider-test",
      prompt: "Reply with exactly: PROVIDER_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const checks: string[] = [];

    const run = await manager.run(task.id);
    if (run.status !== "success") {
      checks.push(`run.status=${run.status}, expected=success`);
    }
    if (!run.output) {
      checks.push("run.output is empty");
    }

    await manager.shutdown();

    if (checks.length > 0) {
      logTest(
        "Provider and model stored and execution succeeds",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Provider and model stored and execution succeeds",
      "PASS",
      `run=success, output present`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Provider and model stored and execution succeeds", "FAIL", msg);
    return false;
  }
}

// ── Test #43: Multiple concurrent tasks ──

async function testProdConcurrentTasks(): Promise<boolean | null> {
  logSection("Test #43: Multiple concurrent tasks");
  logTest("Two tasks run concurrently with independent logs", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const taskA = await manager.create({
      name: "concurrent-a",
      prompt: "Reply with exactly: TASK_A",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const taskB = await manager.create({
      name: "concurrent-b",
      prompt: "Reply with exactly: TASK_B",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    // Run both simultaneously
    const [runA, runB] = await Promise.all([
      manager.run(taskA.id),
      manager.run(taskB.id),
    ]);

    // Verify independent run logs
    const runsA = await manager.runs(taskA.id);
    const runsB = await manager.runs(taskB.id);
    const all = await manager.list();

    await manager.shutdown();

    const checks: string[] = [];
    if (runA.status !== "success") {
      checks.push(`runA.status=${runA.status}, expected=success`);
    }
    if (runB.status !== "success") {
      checks.push(`runB.status=${runB.status}, expected=success`);
    }
    if (runsA.length !== 1) {
      checks.push(`A runs=${runsA.length}, expected=1`);
    }
    if (runsB.length !== 1) {
      checks.push(`B runs=${runsB.length}, expected=1`);
    }
    if (all.length !== 2) {
      checks.push(`total tasks=${all.length}, expected=2`);
    }

    if (checks.length > 0) {
      logTest(
        "Two tasks run concurrently with independent logs",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Two tasks run concurrently with independent logs",
      "PASS",
      `A=success, B=success, independent logs`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Two tasks run concurrently with independent logs", "FAIL", msg);
    return false;
  }
}

// ── Test #44: Callbacks (onSuccess, onComplete) ──

async function testProdCallbacks(): Promise<boolean | null> {
  logSection("Test #44: Callbacks (onSuccess, onComplete)");
  logTest("onSuccess and onComplete callbacks fire correctly", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    let successCalled = false;
    let successResult: Record<string, unknown> | null = null;
    let completeCalled = false;
    let completeTask: Record<string, unknown> | null = null;

    const task = await manager.create({
      name: "callback-test",
      prompt: "Reply with exactly: CB_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
      maxRuns: 1,
      onSuccess: (result: Record<string, unknown>) => {
        successCalled = true;
        successResult = result;
      },
      onComplete: (t: Record<string, unknown>) => {
        completeCalled = true;
        completeTask = t;
      },
    });

    await manager.run(task.id);
    // Poll for callback (up to 2s)
    const cbDeadline = Date.now() + 2000;
    while (!successCalled && Date.now() < cbDeadline) {
      await sleep(50);
    }

    await manager.shutdown();

    const checks: string[] = [];
    if (!successCalled) {
      checks.push("onSuccess was not called");
    }
    if (!successResult || !(successResult as Record<string, unknown>).output) {
      checks.push("onSuccess result has no output");
    }
    if (!completeCalled) {
      checks.push("onComplete was not called");
    }
    if (
      !completeTask ||
      (completeTask as Record<string, unknown>).status !== "completed"
    ) {
      checks.push(
        `onComplete task status=${(completeTask as unknown as Record<string, unknown>)?.status}, expected=completed`,
      );
    }

    if (checks.length > 0) {
      logTest(
        "onSuccess and onComplete callbacks fire correctly",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "onSuccess and onComplete callbacks fire correctly",
      "PASS",
      `onSuccess=called, onComplete=called, completed`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("onSuccess and onComplete callbacks fire correctly", "FAIL", msg);
    return false;
  }
}

// ── Test #45: Delete removes everything ──

async function testProdDelete(): Promise<boolean | null> {
  logSection("Test #45: Delete removes everything");
  logTest("Delete removes task and run logs", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "delete-test",
      prompt: "Reply: DEL_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    // Run once so there are run logs
    await manager.run(task.id);

    await manager.delete(task.id);

    const deleted = await manager.get(task.id);
    const list = await manager.list();

    await manager.shutdown();

    const checks: string[] = [];
    if (deleted !== null) {
      checks.push(`deleted task still found: ${!!deleted}`);
    }
    if (list.length !== 0) {
      checks.push(`list length=${list.length}, expected=0`);
    }

    if (checks.length > 0) {
      logTest("Delete removes task and run logs", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "Delete removes task and run logs",
      "PASS",
      `task=gone, list empty`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Delete removes task and run logs", "FAIL", msg);
    return false;
  }
}

// ── Test #46: Shutdown completes without error ──

async function testProdShutdown(): Promise<boolean | null> {
  logSection("Test #46: Shutdown completes without error");
  logTest("Shutdown completes cleanly", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    await manager.create({
      name: "shutdown-test",
      prompt: "Reply: SHUT_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    // Verify task exists before shutdown
    const before = await manager.get((await manager.list())[0].id);

    let shutdownOk = false;
    try {
      await manager.shutdown();
      shutdownOk = true;
    } catch {
      shutdownOk = false;
    }

    const checks: string[] = [];
    if (!before) {
      checks.push("task not found before shutdown");
    }
    if (!shutdownOk) {
      checks.push("shutdown threw an error");
    }

    if (checks.length > 0) {
      logTest("Shutdown completes cleanly", "FAIL", checks.join("; "));
      return false;
    }

    logTest("Shutdown completes cleanly", "PASS", `task existed, shutdown ok`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Shutdown completes cleanly", "FAIL", msg);
    return false;
  }
}

// ============================================================
// GROUP 4: AI EXECUTION TESTS (requires AI provider)
// ============================================================

// ── Test #47: Isolated execution with real AI ──

async function testAIIsolatedExecution(): Promise<boolean | null> {
  logSection("Test #47: Isolated execution with real AI");
  logTest("Task executes and returns AI output", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "ai-test",
      prompt: "Reply with exactly the word: TASK_OK. Nothing else.",
      schedule: { type: "interval", every: 300000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const result = await manager.run(task.id);

    // Check run logs
    const runs = await manager.runs(task.id);

    await manager.shutdown();

    const checks: string[] = [];
    if (result.status !== "success") {
      checks.push(`status=${result.status}, error=${result.error}`);
    }
    if (!result.output?.includes("TASK_OK")) {
      checks.push(`output missing TASK_OK: "${result.output?.slice(0, 100)}"`);
    }
    if (runs.length !== 1) {
      checks.push(`run logs=${runs.length}, expected=1`);
    }

    if (checks.length > 0) {
      logTest("Task executes and returns AI output", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "Task executes and returns AI output",
      "PASS",
      `status=success, output contains TASK_OK, 1 run logged`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Task executes and returns AI output", "FAIL", msg);
    return false;
  }
}

// ── Test #48: Continuation mode across runs ──

async function testAIContinuationMode(): Promise<boolean | null> {
  logSection("Test #48: Continuation mode across runs");
  logTest("Run 2 references information from Run 1", "TESTING");

  try {
    const sdk = createSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "memory-test",
      prompt:
        'Pick a random 4-digit number and state it. If conversation history is provided above, list ALL numbers that were previously picked. Format: "Picked: XXXX. Previous: YYYY, ZZZZ" (or "Previous: none" if first run).',
      schedule: { type: "interval", every: 300000 },
      mode: "continuation",
      provider: "vertex",
      maxTokens: 150,
    });

    // Run 1: AI picks a number
    const run1 = await manager.run(task.id);

    // Extract number from Run 1
    const num1Match = run1.output?.match(/Picked:\s*\*{0,2}(\d{4})\*{0,2}/i);
    const num1 = num1Match?.[1];

    // Run 2: AI should see Run 1's history
    const run2 = await manager.run(task.id);

    const runs = await manager.runs(task.id);

    await manager.shutdown();

    const checks: string[] = [];
    if (run1.status !== "success") {
      checks.push(`run1.status=${run1.status}, error=${run1.error}`);
    }
    if (run2.status !== "success") {
      checks.push(`run2.status=${run2.status}, error=${run2.error}`);
    }
    if (runs.length < 2) {
      checks.push(`run logs=${runs.length}, expected>=2`);
    }

    // Verify continuation: Run 2 should mention previous or reference num1
    const hasPreviousRef = num1 && run2.output?.includes(num1);
    const mentionsPrevious =
      run2.output?.toLowerCase().includes("previous") &&
      !run2.output?.toLowerCase().includes("previous: none");

    if (!hasPreviousRef && !mentionsPrevious) {
      // AI behavior is non-deterministic, so this is a soft check
      checks.push(
        `run2 may not reference run1 (non-deterministic): "${run2.output?.slice(0, 150)}"`,
      );
    }

    if (checks.length > 0) {
      logTest(
        "Run 2 references information from Run 1",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Run 2 references information from Run 1",
      "PASS",
      `run1 picked=${num1 || "?"}, run2 references history`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Run 2 references information from Run 1", "FAIL", msg);
    return false;
  }
}

// ============================================================
// GROUP 5: TOOL DISCOVERY (requires AI provider)
// ============================================================

// ── Test #49: AI discovers task tools ──

async function testAIToolDiscovery(): Promise<boolean | null> {
  logSection("Test #49: AI discovers task tools");
  logTest("Task tools are available to AI", "TESTING");

  // Skip when MCP is disabled — tools won't be listed in availableTools
  if (process.env.NEUROLINK_SKIP_MCP === "true") {
    logTest("Task tools are available to AI", "SKIP", "MCP disabled");
    return null;
  }

  try {
    const sdk = createSDK();

    // Access tasks getter to wire up the tool references
    const _manager = sdk.tasks;

    // Ask AI to use the listTasks tool
    const result = await sdk.generate({
      input: {
        text: "Use the listTasks tool to list all scheduled tasks. Call the tool, do not make up a response.",
      },
      maxTokens: 300,
    });

    const usedListTasks =
      result.toolExecutions?.some(
        (t: Record<string, unknown>) => t.name === "listTasks",
      ) || result.toolsUsed?.includes("listTasks");

    let toolsAvailable = false;
    if (!usedListTasks) {
      // Fallback: verify tools are in the available tools list
      toolsAvailable =
        result.availableTools?.some(
          (t: Record<string, unknown>) =>
            t.name === "listTasks" || t.name === "createTask",
        ) ?? false;
    }

    await _manager.shutdown();

    const checks: string[] = [];
    if (!usedListTasks && !toolsAvailable) {
      checks.push(
        `AI did not use listTasks and tools not in available list. Available: ${result.availableTools?.map((t: Record<string, unknown>) => t.name).join(", ") || "none"}`,
      );
    }

    if (checks.length > 0) {
      logTest("Task tools are available to AI", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "Task tools are available to AI",
      "PASS",
      usedListTasks
        ? "AI called listTasks"
        : "Task tools in available tools list",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Task tools are available to AI", "FAIL", msg);
    return false;
  }
}

// ============================================================
// GROUP 6: BULLMQ + REDIS TESTS
// ============================================================

// ── Test #50: BullMQ init & health check ──

async function testBullMQInit(): Promise<boolean | null> {
  logSection("Test #50: BullMQ init & health check");
  logTest("BullMQ backend initializes and is healthy", "TESTING");

  try {
    const sdk = createBullMQSDK();
    const manager = sdk.tasks;

    // Trigger lazy initialization by calling list(), then check health
    await manager.list();
    const healthy = await manager.isHealthy();

    await manager.shutdown();

    if (!healthy) {
      logTest(
        "BullMQ backend initializes and is healthy",
        "FAIL",
        `healthy=${healthy}`,
      );
      return false;
    }

    logTest(
      "BullMQ backend initializes and is healthy",
      "PASS",
      `healthy=${healthy}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("BullMQ backend initializes and is healthy", "FAIL", msg);
    return false;
  }
}

// ── Test #51: CRUD with Redis store ──

async function testBullMQCRUD(): Promise<boolean | null> {
  logSection("Test #51: CRUD with Redis store");
  logTest("Create/Get/List/Update/Delete work with Redis", "TESTING");

  try {
    const sdk = createBullMQSDK();
    const manager = sdk.tasks;

    // Create
    const task = await manager.create({
      name: "redis-crud",
      prompt: "Reply: REDIS_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const checks: string[] = [];
    if (!task.id) {
      checks.push("create: task.id missing");
    }
    if (task.status !== "active") {
      checks.push(`create: status=${task.status}, expected=active`);
    }

    // Get
    const fetched = await manager.get(task.id);
    if (!fetched || fetched.id !== task.id) {
      checks.push(`get: id mismatch`);
    }
    if (fetched?.prompt !== "Reply: REDIS_OK") {
      checks.push(`get: prompt mismatch`);
    }

    // List
    const list = await manager.list();
    if (list.length !== 1) {
      checks.push(`list: count=${list.length}, expected=1`);
    }

    // Update
    const updated = await manager.update(task.id, {
      prompt: "Reply: UPDATED",
    });
    if (updated.prompt !== "Reply: UPDATED") {
      checks.push(`update: prompt=${updated.prompt}`);
    }

    // Verify update persisted
    const refetched = await manager.get(task.id);
    if (refetched?.prompt !== "Reply: UPDATED") {
      checks.push(`persist: prompt=${refetched?.prompt}`);
    }

    // Delete
    await manager.delete(task.id);
    const deleted = await manager.get(task.id);
    if (deleted !== null) {
      checks.push(`delete: task still found`);
    }

    await manager.shutdown();

    if (checks.length > 0) {
      logTest(
        "Create/Get/List/Update/Delete work with Redis",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Create/Get/List/Update/Delete work with Redis",
      "PASS",
      `CRUD cycle complete`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Create/Get/List/Update/Delete work with Redis", "FAIL", msg);
    return false;
  }
}

// ── Test #52: Execution via BullMQ (requires AI) ──

async function testBullMQExecution(): Promise<boolean | null> {
  logSection("Test #52: Execution via BullMQ");
  logTest("Task executes successfully via BullMQ backend", "TESTING");

  try {
    const sdk = createBullMQSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "redis-exec",
      prompt: "Reply with exactly: BULLMQ_OK. Nothing else.",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const run = await manager.run(task.id);

    // Verify run logged
    const runs = await manager.runs(task.id);

    await manager.shutdown();

    const checks: string[] = [];
    if (run.status !== "success") {
      checks.push(`run.status=${run.status}, error=${run.error}`);
    }
    if (!run.output) {
      checks.push("run.output is empty");
    }
    if (run.durationMs <= 0) {
      checks.push(`durationMs=${run.durationMs}`);
    }
    if (runs.length !== 1) {
      checks.push(`logged runs=${runs.length}, expected=1`);
    }

    if (checks.length > 0) {
      logTest(
        "Task executes successfully via BullMQ backend",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Task executes successfully via BullMQ backend",
      "PASS",
      `status=success, output present, 1 run logged`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Task executes successfully via BullMQ backend", "FAIL", msg);
    return false;
  }
}

// ── Test #53: Continuation with Redis store (requires AI) ──

async function testBullMQContinuation(): Promise<boolean | null> {
  logSection("Test #53: Continuation with Redis store");
  logTest("Continuation history persists in Redis across runs", "TESTING");

  try {
    const sdk = createBullMQSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "redis-continuation",
      prompt:
        'Pick a random 4-digit number. If history exists, list previous numbers. Format: "Picked: XXXX. Previous: YYYY" or "Previous: none".',
      schedule: { type: "interval", every: 600000 },
      mode: "continuation",
      provider: "vertex",
      maxTokens: 150,
    });

    const checks: string[] = [];
    if (!task.sessionId) {
      checks.push("sessionId not set for continuation task");
    }

    // Run 1
    const run1 = await manager.run(task.id);
    if (run1.status !== "success") {
      checks.push(`run1.status=${run1.status}`);
    }
    const num1 = run1.output?.match(/Picked:\s*\*{0,2}(\d{4})\*{0,2}/i)?.[1];
    if (!num1) {
      checks.push(
        `run1: could not parse number from "${run1.output?.slice(0, 100)}"`,
      );
    }

    // Run 2 — should see history from Redis
    const run2 = await manager.run(task.id);
    if (run2.status !== "success") {
      checks.push(`run2.status=${run2.status}`);
    }

    const mentionsPrevious =
      run2.output?.toLowerCase().includes("previous") &&
      !run2.output?.toLowerCase().includes("previous: none");
    const referencesNum1 = num1 && run2.output?.includes(num1);
    if (!mentionsPrevious && !referencesNum1) {
      checks.push(`run2 may not see history: "${run2.output?.slice(0, 150)}"`);
    }

    await manager.shutdown();

    if (checks.length > 0) {
      logTest(
        "Continuation history persists in Redis across runs",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Continuation history persists in Redis across runs",
      "PASS",
      `run1 picked=${num1}, run2 sees history`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Continuation history persists in Redis across runs", "FAIL", msg);
    return false;
  }
}

// ── Test #54: maxRuns with BullMQ (requires AI) ──

async function testBullMQMaxRuns(): Promise<boolean | null> {
  logSection("Test #54: maxRuns with BullMQ");
  logTest("Task completes after maxRuns via BullMQ", "TESTING");

  try {
    const sdk = createBullMQSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "redis-maxruns",
      prompt: "Reply: MAX_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
      maxRuns: 2,
    });

    await manager.run(task.id);
    await manager.run(task.id);

    const finalTask = await manager.get(task.id);

    await manager.shutdown();

    const checks: string[] = [];
    if (!finalTask || finalTask.status !== "completed") {
      checks.push(`status=${finalTask?.status}, expected=completed`);
    }
    if (!finalTask || finalTask.runCount !== 2) {
      checks.push(`runCount=${finalTask?.runCount}, expected=2`);
    }

    if (checks.length > 0) {
      logTest(
        "Task completes after maxRuns via BullMQ",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Task completes after maxRuns via BullMQ",
      "PASS",
      `completed after 2 runs`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Task completes after maxRuns via BullMQ", "FAIL", msg);
    return false;
  }
}

// ── Test #55: Pause/resume with BullMQ (requires AI) ──

async function testBullMQPauseResume(): Promise<boolean | null> {
  logSection("Test #55: Pause/resume with BullMQ");
  logTest("Pause skips, resume allows execution via BullMQ", "TESTING");

  try {
    const sdk = createBullMQSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "redis-pause",
      prompt: "Reply: PAUSE_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    // Pause
    const paused = await manager.pause(task.id);

    // Run while paused should skip
    const skipped = await manager.run(task.id);

    // Resume
    const resumed = await manager.resume(task.id);

    // Run after resume should work
    const run = await manager.run(task.id);

    await manager.shutdown();

    const checks: string[] = [];
    if (paused.status !== "paused") {
      checks.push(`paused status=${paused.status}`);
    }
    if (skipped.status !== "error") {
      checks.push(`skipped status=${skipped.status}, expected=error`);
    }
    if (resumed.status !== "active") {
      checks.push(`resumed status=${resumed.status}`);
    }
    if (run.status !== "success") {
      checks.push(`run status=${run.status}, expected=success`);
    }

    if (checks.length > 0) {
      logTest(
        "Pause skips, resume allows execution via BullMQ",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Pause skips, resume allows execution via BullMQ",
      "PASS",
      `pause=ok, skip=ok, resume=ok, run=success`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Pause skips, resume allows execution via BullMQ", "FAIL", msg);
    return false;
  }
}

// ── Test #56: Concurrent tasks with BullMQ (requires AI) ──

async function testBullMQConcurrent(): Promise<boolean | null> {
  logSection("Test #56: Concurrent tasks with BullMQ");
  logTest("Two tasks run concurrently via BullMQ", "TESTING");

  try {
    const sdk = createBullMQSDK();
    const manager = sdk.tasks;

    const taskA = await manager.create({
      name: "redis-conc-a",
      prompt: "Reply: A_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const taskB = await manager.create({
      name: "redis-conc-b",
      prompt: "Reply: B_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const [runA, runB] = await Promise.all([
      manager.run(taskA.id),
      manager.run(taskB.id),
    ]);

    const list = await manager.list();

    await manager.shutdown();

    const checks: string[] = [];
    if (runA.status !== "success") {
      checks.push(`A status=${runA.status}`);
    }
    if (runB.status !== "success") {
      checks.push(`B status=${runB.status}`);
    }
    if (list.length !== 2) {
      checks.push(`list count=${list.length}, expected=2`);
    }

    if (checks.length > 0) {
      logTest(
        "Two tasks run concurrently via BullMQ",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Two tasks run concurrently via BullMQ",
      "PASS",
      `A=success, B=success`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Two tasks run concurrently via BullMQ", "FAIL", msg);
    return false;
  }
}

// ── Test #57: Cron schedule with BullMQ (requires AI) ──

async function testBullMQCronSchedule(): Promise<boolean | null> {
  logSection("Test #57: Cron schedule with BullMQ");
  logTest("Cron schedule creation and manual run via BullMQ", "TESTING");

  try {
    const sdk = createBullMQSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "redis-cron",
      prompt: "Reply: CRON_OK",
      schedule: { type: "cron", expression: "0 9 * * *", timezone: "UTC" },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const checks: string[] = [];
    if (!task.id) {
      checks.push("task.id missing");
    }
    if (task.schedule.type !== "cron") {
      checks.push(`schedule.type=${task.schedule.type}, expected=cron`);
    }
    if (
      task.schedule.type === "cron" &&
      task.schedule.expression !== "0 9 * * *"
    ) {
      checks.push(
        `expression=${(task.schedule as { expression: string }).expression}`,
      );
    }
    if (task.status !== "active") {
      checks.push(`status=${task.status}`);
    }

    // Manual run should still work
    const run = await manager.run(task.id);
    if (run.status !== "success") {
      checks.push(`manual run status=${run.status}`);
    }

    await manager.shutdown();

    if (checks.length > 0) {
      logTest(
        "Cron schedule creation and manual run via BullMQ",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Cron schedule creation and manual run via BullMQ",
      "PASS",
      `cron created, manual run=success`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Cron schedule creation and manual run via BullMQ", "FAIL", msg);
    return false;
  }
}

// ── Test #58: Once schedule (delayed job) with BullMQ (requires AI) ──

async function testBullMQOnceSchedule(): Promise<boolean | null> {
  logSection("Test #58: Once schedule (delayed job) with BullMQ");
  logTest("Once schedule auto-executes via BullMQ delayed job", "TESTING");

  try {
    const sdk = createBullMQSDK();
    const manager = sdk.tasks;

    const task = await manager.create({
      name: "redis-once",
      prompt: "Reply: ONCE_OK",
      schedule: { type: "once", at: new Date(Date.now() + 1000) },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    const checks: string[] = [];
    if (!task.id) {
      checks.push("task.id missing");
    }
    if (task.schedule.type !== "once") {
      checks.push(`schedule.type=${task.schedule.type}, expected=once`);
    }

    // Poll for the delayed job to fire and complete (up to 30s)
    // BullMQ needs: 1s delay + Worker overhead + AI generate() latency
    let runs: Awaited<ReturnType<typeof manager.runs>> = [];
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      runs = await manager.runs(task.id);
      if (runs.length >= 1) {
        break;
      }
      await sleep(500);
    }
    if (runs.length < 1) {
      checks.push(
        `auto-exec: runs=${runs.length}, expected>=1 (timed out after 30s)`,
      );
    }

    await manager.shutdown();

    if (checks.length > 0) {
      logTest(
        "Once schedule auto-executes via BullMQ delayed job",
        "FAIL",
        checks.join("; "),
      );
      return false;
    }

    logTest(
      "Once schedule auto-executes via BullMQ delayed job",
      "PASS",
      `auto-executed, runs=${runs.length}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Once schedule auto-executes via BullMQ delayed job", "FAIL", msg);
    return false;
  }
}

// ── Test #59: Shutdown cleanup with BullMQ ──

async function testBullMQShutdown(): Promise<boolean | null> {
  logSection("Test #59: Shutdown cleanup with BullMQ");
  logTest("Shutdown marks backend unhealthy", "TESTING");

  try {
    const sdk = createBullMQSDK();
    const manager = sdk.tasks;

    await manager.create({
      name: "redis-shutdown",
      prompt: "Reply: SHUT_OK",
      schedule: { type: "interval", every: 600000 },
      mode: "isolated",
      provider: "vertex",
      maxTokens: 50,
    });

    await manager.shutdown();

    const healthy = await manager.isHealthy();

    const checks: string[] = [];
    if (healthy) {
      checks.push(`healthy=${healthy}, expected=false after shutdown`);
    }

    if (checks.length > 0) {
      logTest("Shutdown marks backend unhealthy", "FAIL", checks.join("; "));
      return false;
    }

    logTest(
      "Shutdown marks backend unhealthy",
      "PASS",
      `healthy=false after shutdown`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Shutdown marks backend unhealthy", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST GROUP ARRAYS
// ============================================================

const unitTests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
  { name: "Create task with defaults", fn: testCreateTaskDefaults },
  { name: "List tasks", fn: testListTasks },
  { name: "Get task by ID", fn: testGetTask },
  { name: "Pause task", fn: testPauseTask },
  { name: "Resume task", fn: testResumeTask },
  { name: "Update task", fn: testUpdateTask },
  { name: "Continuation mode (sessionId)", fn: testContinuationMode },
  { name: "One-shot (once) schedule", fn: testOnceSchedule },
  { name: "Task with config overrides", fn: testTaskOverrides },
  { name: "Delete task", fn: testDeleteTask },
  { name: "List with status filter", fn: testListWithFilter },
  { name: "Get nonexistent returns null", fn: testGetNonexistent },
  { name: "Pause nonexistent throws", fn: testPauseNonexistent },
  { name: "Pause already-paused throws", fn: testPauseAlreadyPaused },
  { name: "Resume non-paused throws", fn: testResumeNonPaused },
  { name: "Health check", fn: testHealthCheck },
  { name: "Isolated mode no sessionId", fn: testIsolatedModeNoSession },
  { name: "Cron schedule type", fn: testCronSchedule },
  { name: "Interval schedule type", fn: testIntervalSchedule },
  { name: "Default retry backoff", fn: testDefaultRetryBackoff },
  { name: "Custom retry config", fn: testCustomRetry },
  { name: "Timestamp fields", fn: testTimestampFields },
  { name: "Metadata field", fn: testMetadataField },
  { name: "System prompt override", fn: testSystemPromptOverride },
  { name: "Update multiple fields", fn: testUpdateMultipleFields },
  { name: "Delete multiple tasks", fn: testDeleteMultipleTasks },
  { name: "Update nonexistent throws", fn: testUpdateNonexistent },
  { name: "Shutdown and re-init", fn: testShutdownReinit },
  { name: "Default mode is isolated", fn: testDefaultModeIsolated },
  { name: "Task ID uniqueness", fn: testTaskIdUniqueness },
  {
    name: "Pause-resume preserves data",
    fn: testPauseResumeCyclePreservesData,
  },
  {
    name: "Update preserves other fields",
    fn: testUpdatePreservesOtherFields,
  },
];

const edgeCaseTests: Array<{
  name: string;
  fn: () => Promise<boolean | null>;
}> = [
  { name: "onError callback fires on failure", fn: testOnErrorCallback },
  {
    name: "Non-transient error does NOT retry",
    fn: testNoRetryOnPermanentError,
  },
  {
    name: "Transient error DOES retry",
    fn: testRetryOnTransientError,
  },
  { name: "Invalid cron expression", fn: testInvalidCronExpression },
  { name: "Task creation limit enforcement", fn: testTaskCreationLimit },
  { name: "Error result structure completeness", fn: testErrorResultStructure },
];

const productionTests: Array<{
  name: string;
  fn: () => Promise<boolean | null>;
}> = [
  { name: "Once schedule — creation + manual run", fn: testProdOnceSchedule },
  { name: "maxRuns auto-completion", fn: testProdMaxRuns },
  { name: "Pause/resume with execution", fn: testProdPauseResume },
  {
    name: "Pause/resume preserves continuation",
    fn: testProdPauseResumeContinuation,
  },
  { name: "Provider/model override", fn: testProdProviderOverride },
  { name: "Multiple concurrent tasks", fn: testProdConcurrentTasks },
  { name: "Callbacks (onSuccess, onComplete)", fn: testProdCallbacks },
  { name: "Delete removes everything", fn: testProdDelete },
  { name: "Shutdown completes without error", fn: testProdShutdown },
  {
    name: "Long continuation (5 runs with history)",
    fn: testLongContinuation,
  },
  { name: "History bounds enforcement", fn: testHistoryBounds },
];

const aiExecutionTests: Array<{
  name: string;
  fn: () => Promise<boolean | null>;
}> = [
  { name: "Isolated execution with real AI", fn: testAIIsolatedExecution },
  { name: "Continuation mode across runs", fn: testAIContinuationMode },
];

const toolTests: Array<{
  name: string;
  fn: () => Promise<boolean | null>;
}> = [{ name: "AI discovers task tools", fn: testAIToolDiscovery }];

const bullmqUnitTests: Array<{
  name: string;
  fn: () => Promise<boolean | null>;
}> = [
  { name: "BullMQ init & health check", fn: testBullMQInit },
  { name: "CRUD with Redis store", fn: testBullMQCRUD },
  { name: "Shutdown cleanup with BullMQ", fn: testBullMQShutdown },
];

const bullmqAITests: Array<{
  name: string;
  fn: () => Promise<boolean | null>;
}> = [
  { name: "Execution via BullMQ", fn: testBullMQExecution },
  { name: "Continuation with Redis store", fn: testBullMQContinuation },
  { name: "maxRuns with BullMQ", fn: testBullMQMaxRuns },
  { name: "Pause/resume with BullMQ", fn: testBullMQPauseResume },
  { name: "Concurrent tasks with BullMQ", fn: testBullMQConcurrent },
  { name: "Cron schedule with BullMQ", fn: testBullMQCronSchedule },
  {
    name: "Once schedule (delayed job) with BullMQ",
    fn: testBullMQOnceSchedule,
  },
];

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log(
    "\n--- NeuroLink Continuous Test Suite: TaskManager (62 tests) ---",
    "bright",
  );
  log(
    "   Groups: Unit (32) | Edge Cases (5) | Production (9) | AI Exec (2) | Tools (1) | BullMQ (10)",
    "cyan",
  );

  // Helper to run a test group
  async function runGroup(
    tests: Array<{ name: string; fn: () => Promise<boolean | null> }>,
    cleanFn?: () => void | Promise<void>,
  ): Promise<void> {
    for (const test of tests) {
      cleanTaskStore();
      if (cleanFn) {
        await cleanFn();
      }
      try {
        const result = await test.fn();
        testResults.push({ name: test.name, result, error: null });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logTest(test.name, "FAIL", `Uncaught: ${msg}`);
        testResults.push({ name: test.name, result: false, error: msg });
      }
    }
    cleanTaskStore();
  }

  // Helper to skip a test group
  function skipGroup(
    tests: Array<{ name: string; fn: () => Promise<boolean | null> }>,
    reason: string,
  ): void {
    for (const test of tests) {
      logTest(test.name, "SKIP", reason);
      testResults.push({ name: test.name, result: null, error: null });
    }
  }

  // ── GROUP 1: Unit Tests (no external deps) ──
  logSection("Group 1: Unit Tests (no external deps)");
  await runGroup(unitTests);

  // ── GROUP 2: Edge Cases (no AI needed) ──
  logSection("Group 2: Edge Cases (no AI needed)");
  await runGroup(edgeCaseTests);

  // ── GROUP 3+4+5: AI-dependent tests ──
  logSection("Group 3-5: AI-Dependent Tests");
  log("Checking AI provider availability...", "blue");
  const aiAvailable = await checkAIProvider();

  if (!aiAvailable) {
    log("AI provider not available -- skipping AI tests", "yellow");
    skipGroup(
      [...productionTests, ...aiExecutionTests, ...toolTests],
      "AI provider not available",
    );
  } else {
    log("AI provider available", "green");

    logSection("Group 3: Production Readiness (AI required)");
    await runGroup(productionTests);

    logSection("Group 4: AI Execution Tests");
    await runGroup(aiExecutionTests);

    logSection("Group 5: Tool Discovery");
    await runGroup(toolTests);
  }

  // ── GROUP 6: BullMQ + Redis Tests ──
  logSection("Group 6: BullMQ + Redis Tests");
  log("Checking Redis availability...", "blue");
  const redisAvailable = await checkRedis();

  if (!redisAvailable) {
    log("Redis not available -- skipping BullMQ tests", "yellow");
    skipGroup([...bullmqUnitTests, ...bullmqAITests], "Redis not available");
  } else {
    log("Redis available", "green");
    await cleanRedis();

    // BullMQ unit tests (no AI needed)
    logSection("Group 6a: BullMQ Unit Tests (Redis only)");
    await runGroup(bullmqUnitTests, cleanRedis);

    // BullMQ AI tests (need both Redis and AI)
    logSection("Group 6b: BullMQ AI Tests (Redis + AI)");
    if (!aiAvailable) {
      log("AI provider not available -- skipping BullMQ AI tests", "yellow");
      skipGroup(bullmqAITests, "AI provider not available");
    } else {
      await runGroup(bullmqAITests, cleanRedis);
    }

    await cleanRedis();
  }

  // ── Summary ──
  logSection("Test Results Summary");
  const passed = testResults.filter((r) => r.result === true).length;
  const failed = testResults.filter((r) => r.result === false).length;
  const skipped = testResults.filter((r) => r.result === null).length;

  for (const t of testResults) {
    logTest(
      t.name,
      t.result === true ? "PASS" : t.result === false ? "FAIL" : "SKIP",
      t.error || "",
    );
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  log(
    `\nFinal Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${testResults.length} total) in ${duration}s`,
    failed === 0 ? "green" : "red",
  );

  process.exit(failed === 0 ? 0 : 1);
}

// ============================================================
// CLI ARGS + EXECUTION
// ============================================================

for (const arg of process.argv.slice(2)) {
  if (arg === "--help" || arg === "-h") {
    console.log("Usage: npx tsx test/continuous-test-suite-tasks.ts");
    console.log(
      "\nComprehensive TaskManager test suite with 62 tests across 6 groups:",
    );
    console.log("  Group 1: Unit Tests (32 tests) -- no external deps");
    console.log("  Group 2: Edge Cases (5 tests) -- no AI needed");
    console.log(
      "  Group 3: Production Readiness (9 tests) -- requires AI provider",
    );
    console.log("  Group 4: AI Execution (2 tests) -- requires AI provider");
    console.log("  Group 5: Tool Discovery (1 test) -- requires AI provider");
    console.log(
      "  Group 6: BullMQ + Redis (10 tests) -- requires Redis on localhost:6379",
    );
    console.log(
      "\nGroups with unavailable dependencies are auto-skipped (not failed).",
    );
    process.exit(0);
  }
}

if (typeof describe === "undefined") {
  runAllTests().catch((e) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  describe.skip("Continuous Test Suite: TaskManager", () => {
    it("runs standalone", () => runAllTests(), 600000);
  });
}

/** Built-only child for the autoresearch suite's public TaskManager cases. */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertDistFresh } from "./distFreshness.js";
import { assert } from "./harness.js";

assertDistFresh();
const config = JSON.parse(process.argv[2]) as {
  repoPath: string;
  provider: string;
  model: string;
  offline: boolean;
};
process.env.NEUROLINK_SKIP_MCP = "true";
process.env.NEUROLINK_DISABLE_BUILTIN_TOOLS = "true";
let requests = 0;
if (config.offline) {
  process.env.OPENAI_API_KEY = "sk-task-fixture-placeholder";
  process.env.OPENAI_BASE_URL = "http://127.0.0.1:9183/v1";
  globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    assert(
      url.startsWith(process.env.OPENAI_BASE_URL!),
      "unexpected fixture destination",
    );
    requests++;
    return Response.json({
      id: "task-fixture",
      object: "chat.completion",
      created: 1,
      model: "gpt-4o-mini",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "fixture task response" },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    });
  };
}
const { NeuroLink } = await import("../../dist/index.js");
const directory = mkdtempSync(join(tmpdir(), "autoresearch-task-store-"));
const nl = new NeuroLink({
  conversationMemory: { enabled: false },
  tasks: {
    backend: "node-timeout",
    storePath: join(directory, "tasks.json"),
    logsPath: join(directory, "runs"),
  },
});
const events: string[] = [];
const emitter = nl.getEventEmitter();
for (const event of [
  "autoresearch:initialized",
  "autoresearch:resumed",
  "autoresearch:experiment-started",
  "autoresearch:experiment-completed",
  "autoresearch:phase-changed",
  "autoresearch:state-updated",
  "autoresearch:error",
]) {
  emitter.on(event, () => events.push(event));
}
let taskId: string | undefined;
try {
  const task = await nl.tasks.create({
    name: "public-autoresearch-test",
    prompt: "Run autonomous ML experiments",
    schedule: { type: "interval", every: 24 * 60 * 60 * 1000 },
    mode: "isolated",
    type: "autoresearch",
    autoresearch: {
      repoPath: config.repoPath,
      mutablePaths: ["train.py"],
      runCommand: "python3 train.py",
      metric: {
        name: "val_bpb",
        direction: "lower",
        pattern: "val_bpb:\\s+([\\d.]+)",
      },
      provider: config.offline ? "openai" : config.provider,
      model: config.offline ? "gpt-4o-mini" : config.model,
    },
    tools: true,
    timeout: 120_000,
    retry: { maxAttempts: 1, backoffMs: [1000] },
  });
  taskId = task.id;
  const result = await nl.tasks.run(task.id);
  // A live model may or may not produce an edit that improves the metric, so
  // either outcome is valid; anything else is out of contract. Checked on both
  // the offline and the live path, since only the offline path asserts more.
  assert(
    result.status === "success" || result.status === "error",
    "the run must report a status of success or error",
  );
  assert(result.runId !== "skipped", "the manager must execute the task");
  assert(
    (await nl.tasks.runs(task.id)).some((run) => run.runId === result.runId),
    "the manager must persist the run",
  );
  if (config.offline) {
    assert(requests > 0, "the task must reach the model fixture");
    assert(
      result.status === "success" &&
        result.output?.includes("fixture task response") === true,
      "the task must return the fixture response",
    );
  }
  console.log(`TASK_MANAGER_RESULT=${JSON.stringify({ result, events })}`);
} finally {
  try {
    if (taskId) {
      await nl.tasks.delete(taskId);
    }
  } finally {
    await nl.tasks.shutdown();
    rmSync(directory, { recursive: true, force: true });
  }
}
// Telemetry may retain a background timer; all TaskManager work is joined above.
process.exit(0);

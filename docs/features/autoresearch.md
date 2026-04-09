# AutoResearch - Autonomous AI Experiment Engine

## Overview

AutoResearch is an autonomous experiment loop that proposes code changes, executes experiments, evaluates results against a deterministic metric, and keeps or discards each change — running unattended for hours. Inspired by Karpathy's autoresearch concept, it lets an AI agent continuously improve a program by iterating on code, measuring outcomes, and git-committing improvements.

The system is available as both an **SDK API** and **CLI commands**, and integrates with NeuroLink's existing **TaskManager** for scheduled, long-running research sessions.

- **Phase-gated tool access** — The AI only sees tools relevant to its current phase, preventing premature actions
- **Git-backed safety** — Every candidate change is committed to a branch; failed experiments are reverted automatically
- **Deterministic evaluation** — Metrics are parsed from experiment output via regex, not LLM judgment
- **Two execution paths** — Run a single cycle interactively (`run-once`) or schedule continuous research via TaskManager (`start`)
- **10 typed events** — Full observability into the experiment lifecycle via NeuroLink's event emitter

---

## Quick Start

Get a research loop running in 5 steps:

**1. Set up a git repo with a training script and a research program:**

```bash
mkdir /tmp/my-research && cd /tmp/my-research
git init
# Add your training script (e.g., train.py) and a program.md describing your research goal
git add -A && git commit -m "initial"
```

**2. Initialize AutoResearch:**

```bash
neurolink autoresearch init /tmp/my-research \
  --tag "run1" \
  --target "train.py" \
  --immutable "program.md" \
  --run-command "python3 train.py" \
  --metric-name val_bpb \
  --metric-pattern "^val_bpb:\\s+([\\d.]+)" \
  --metric-direction lower \
  --timeout 120
```

**3. Run a single experiment cycle:**

```bash
neurolink autoresearch run-once /tmp/my-research
```

**4. Check results:**

```bash
neurolink autoresearch status /tmp/my-research
neurolink autoresearch results /tmp/my-research
```

**5. (Optional) Schedule continuous research via TaskManager:**

```bash
neurolink autoresearch start /tmp/my-research --interval 300 --max-runs 50
neurolink task start   # Start the task worker to begin execution
```

For SDK usage, see [Direct Usage (ResearchWorker)](#direct-usage-researchworker) below.

---

## Core Concepts

### Research Program

A Markdown document (`program.md` by default) that describes the research objective, constraints, and evaluation criteria. The AI reads this to understand what it should optimize and how.

### Phases

AutoResearch operates as a state machine with 9 phases. Each phase gates which tools the AI can use:

| Phase                | Description                                       | Tools Available                                                                                              | Forced Tool                 |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------- |
| **bootstrap**        | Read the program and understand the codebase      | `research_get_context`, `research_read_file`, `research_checkpoint`                                          | `research_get_context`      |
| **baseline**         | Run the experiment to establish a baseline        | `research_run_experiment`, `research_parse_log`, `research_record`, `research_accept`, `research_checkpoint` | `research_run_experiment`   |
| **propose**          | Propose a code change based on context            | `research_get_context`, `research_read_file`                                                                 | `research_get_context`      |
| **edit**             | Write the proposed changes to mutable files       | `research_read_file`, `research_write_candidate`, `research_diff`                                            | —                           |
| **commit**           | Git-commit the candidate change                   | `research_commit_candidate`                                                                                  | `research_commit_candidate` |
| **run**              | Execute the experiment                            | `research_run_experiment`                                                                                    | `research_run_experiment`   |
| **evaluate**         | Parse the log and inspect failures                | `research_parse_log`, `research_inspect_failure`                                                             | `research_parse_log`        |
| **record**           | Record the result to results.tsv                  | `research_record`, `research_checkpoint`                                                                     | `research_record`           |
| **accept_or_revert** | Keep the change or revert to the last good commit | `research_accept`, `research_revert`, `research_checkpoint`                                                  | —                           |

After `accept_or_revert`, the loop returns to `propose` for the next experiment cycle.

### Metric

A quantitative measure extracted from experiment output using a regex pattern. You configure:

- **name** — Human-readable metric name (e.g., `val_bpb`, `accuracy`)
- **direction** — Whether `lower` or `higher` is better
- **pattern** — Regex with one capture group to extract the numeric value from stdout/stderr

### Memory Metric (Optional)

A secondary metric (e.g., `peak_vram_mb`) tracked for informational purposes but not used for accept/reject decisions.

### Mutable vs Immutable Paths

- **mutablePaths** — Files the AI is allowed to modify (e.g., `["train.py"]`)
- **immutablePaths** — Files the AI can read but must never modify (e.g., `["prepare.py", "program.md"]`)

### State

Research state is persisted to `.autoresearch/state.json` and includes the current phase, branch name, accepted commit, baseline/best metrics, run count, and keep count. This enables resuming interrupted sessions.

---

## Architecture

Follows NeuroLink's established **Factory + Registry** pattern with dedicated subsystems for each concern.

### Directory Structure

```
src/lib/autoresearch/
  index.ts                    # Public exports (via @juspay/neurolink/autoresearch)
  config.ts                   # resolveConfig() + validateConfig()
  worker.ts                   # ResearchWorker — main orchestrator
  stateStore.ts               # ResearchStateStore — state persistence
  repoPolicy.ts               # RepoPolicy — git branch/commit/revert operations
  runner.ts                   # ExperimentRunner — subprocess execution
  resultRecorder.ts           # ResultRecorder — TSV result logging
  summaryParser.ts            # parseExperimentSummary() — log parsing
  promptCompiler.ts           # PromptCompiler — system prompt generation
  phasePolicy.ts              # Phase-gated tool access rules
  tools.ts                    # createResearchTools() — 12 tool definitions
  errors.ts                   # AutoresearchError + error codes

src/lib/types/
  autoresearchTypes.ts         # All type definitions (251 lines)

src/lib/tasks/
  autoresearchTaskExecutor.ts  # TaskManager integration + phase advancement

src/cli/commands/
  autoresearch.ts              # CLI: `neurolink autoresearch`
```

### Component Diagram

```
                      NeuroLink
                         |
            ┌────────────┴────────────┐
            v                         v
     ResearchWorker            TaskManager
     (run-once path)           (scheduled path)
            |                         |
            v                         v
    ┌───────┴───────┐     autoresearchTaskExecutor
    |               |           |
    v               v           v
PhasePolicy    PromptCompiler  ResearchWorker (cached)
    |               |           |
    v               v           v
ResearchTools  SystemPrompt   generate() + phase advance
    |
    ├── RepoPolicy ──── git operations (branch, commit, revert)
    ├── ExperimentRunner ── subprocess (runCommand)
    ├── ResultRecorder ──── results.tsv
    └── ResearchStateStore ── .autoresearch/state.json
```

### How It Fits Into NeuroLink

AutoResearch integrates at two levels:

1. **Direct SDK usage** — Import `ResearchWorker` from `@juspay/neurolink/autoresearch` and call `runExperimentCycle()` directly
2. **TaskManager integration** — The `autoresearchTaskExecutor` routes scheduled tasks to `ResearchWorker`, advancing phases after each `generate()` call

---

## Type Definitions

```typescript
// ── Metric Configuration ─────────────────────────────────

type MetricDirection = "lower" | "higher";

type MetricConfig = {
  name: string;
  direction: MetricDirection;
  pattern: string; // regex with one capture group
};

type MemoryMetricConfig = {
  name: string;
  pattern: string;
};

// ── Research Configuration ───────────────────────────────

type ResearchConfig = {
  repoPath: string;
  programPath: string; // Default: "program.md"
  mutablePaths: string[];
  immutablePaths: string[];
  resultsPath: string; // Default: "results.tsv"
  statePath: string; // Default: ".autoresearch/state.json"
  runCommand: string;
  logPath: string; // Default: "run.log"
  metric: MetricConfig;
  memoryMetric?: MemoryMetricConfig;
  timeoutMs: number; // Default: 600_000 (10 minutes)
  branchPrefix: string; // Default: "autoresearch/"
  provider?: string;
  model?: string;
  maxExperiments?: number;
  thinkingLevel?: ThinkingLevel; // Default: "medium"
};

// ── Experiment Phase ─────────────────────────────────────

type ExperimentPhase =
  | "bootstrap"
  | "baseline"
  | "propose"
  | "edit"
  | "commit"
  | "run"
  | "evaluate"
  | "record"
  | "accept_or_revert";

// ── Research State (persisted to .autoresearch/state.json) ──

type ResearchState = {
  branch: string;
  acceptedCommit: string | null;
  baselineMetric: number | null;
  bestMetric: number | null;
  candidateCommit: string | null;
  runCount: number;
  keepCount: number;
  lastStatus: ExperimentStatus | null;
  currentPhase: ExperimentPhase;
  tag: string;
  startedAt: string;
  updatedAt: string;
  lastSummary?: ExperimentSummary | null;
};

// ── Experiment Results ───────────────────────────────────

type ExperimentStatus = "keep" | "discard" | "crash" | "timeout";

type ExperimentSummary = {
  crashed: boolean;
  timedOut: boolean;
  metric: number | null;
  memoryValue: number | null;
  trainingSeconds: number | null;
  rawTail: string;
};

type ExperimentRecord = {
  commit: string;
  metric: number | null;
  memoryGb: number | null;
  status: ExperimentStatus;
  description: string;
  timestamp: string;
};

type ExperimentStats = {
  total: number;
  keepCount: number;
  discardCount: number;
  crashCount: number;
  timeoutCount: number;
  keepRate: number;
  bestMetric: number | null;
  bestCommit: string | null;
};

// ── Worker Configuration ─────────────────────────────────

type ResearchWorkerConfig = Omit<
  Partial<ResearchConfig>,
  "repoPath" | "mutablePaths" | "runCommand" | "metric"
> & {
  repoPath: string;
  mutablePaths: string[];
  runCommand: string;
  metric: MetricConfig;
};

// ── Phase Tool Policy ────────────────────────────────────

type PhaseToolPolicy = {
  activeTools: string[];
  forcedTool?: string;
};
```

---

## SDK API

### Direct Usage (ResearchWorker)

For full control, import `ResearchWorker` from the `@juspay/neurolink/autoresearch` subpath export:

```typescript
import { NeuroLink } from "@juspay/neurolink";
import {
  resolveConfig,
  validateConfig,
  ResearchWorker,
} from "@juspay/neurolink/autoresearch";

const neurolink = new NeuroLink({
  provider: "google-vertex",
  model: "gemini-2.5-flash",
});

const config = resolveConfig({
  repoPath: "/path/to/my-project",
  mutablePaths: ["train.py"],
  immutablePaths: ["prepare.py", "program.md"],
  runCommand: "python3 train.py",
  metric: {
    name: "val_bpb",
    direction: "lower",
    pattern: "^val_bpb:\\s+([\\d.]+)",
  },
  timeoutMs: 120_000,
});

validateConfig(config);

const worker = new ResearchWorker(config);
const state = await worker.initialize("experiment-apr8");

// Run a single experiment cycle
const result = await worker.runExperimentCycle("Try reducing learning rate");
console.log(`Status: ${result.status}, Metric: ${result.metric}`);

// Run multiple cycles
for (let i = 0; i < 10; i++) {
  const r = await worker.runExperimentCycle(`Cycle ${i + 1}`);
  console.log(`Cycle ${i + 1}: ${r.status} (metric: ${r.metric})`);
  if (r.status === "crash") break;
}
```

### Scheduled Usage (TaskManager)

For continuous, unattended research, use TaskManager integration:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  provider: "google-vertex",
  model: "gemini-2.5-flash",
  tasks: {
    backend: "bullmq",
    redis: { url: "redis://localhost:6379" },
  },
});

// Create a scheduled autoresearch task
const task = await neurolink.tasks.create({
  name: "optimize-training",
  prompt: "Run autoresearch experiment cycle",
  type: "autoresearch",
  schedule: { type: "interval", every: 5 * 60 * 1000 }, // Every 5 minutes
  autoresearch: {
    repoPath: "/path/to/my-project",
    mutablePaths: ["train.py"],
    runCommand: "python3 train.py",
    metric: {
      name: "val_bpb",
      direction: "lower",
      pattern: "^val_bpb:\\s+([\\d.]+)",
    },
  },
});

// Monitor via events
neurolink.getEventEmitter().on("autoresearch:metric-improved", (payload) => {
  console.log(`New best: ${payload.newBest} (commit: ${payload.commit})`);
});

neurolink
  .getEventEmitter()
  .on("autoresearch:experiment-completed", (payload) => {
    console.log(`Experiment ${payload.runCount}: ${payload.status}`);
  });

// Manage lifecycle
await neurolink.tasks.pause(task.id);
await neurolink.tasks.resume(task.id);
await neurolink.tasks.delete(task.id);
```

---

## CLI Commands

All CLI commands are under the `neurolink autoresearch` namespace.

### Initialize a Research Session

```bash
neurolink autoresearch init /path/to/repo \
  --tag "experiment-apr8" \
  --target "train.py" \
  --immutable "prepare.py,program.md" \
  --run-command "python3 train.py" \
  --metric-name val_bpb \
  --metric-pattern "^val_bpb:\\s+([\\d.]+)" \
  --metric-direction lower \
  --timeout 600 \
  --provider google-vertex \
  --model gemini-2.5-flash
```

This creates `.autoresearch/state.json` and `.autoresearch/config.json` in the repo and creates a git branch (`autoresearch/<tag>`).

### Check Status

```bash
neurolink autoresearch status                 # Current directory
neurolink autoresearch status /path/to/repo   # Specific repo
neurolink autoresearch status --format json   # JSON output
```

### View Results

```bash
neurolink autoresearch results                      # Table format (last 20)
neurolink autoresearch results --last 50            # More results
neurolink autoresearch results --format json        # JSON output
neurolink autoresearch results --format text        # Plain text
```

### Run a Single Experiment

```bash
neurolink autoresearch run-once                         # Current directory
neurolink autoresearch run-once /path/to/repo           # Specific repo
neurolink autoresearch run-once --description "Try Adam optimizer"
```

### Start Scheduled Research (via TaskManager)

```bash
# 300 seconds between ticks, stop after 100 experiments
neurolink autoresearch start /path/to/repo --interval 300 --max-runs 100
```

> **Two-step process:** `neurolink autoresearch start` saves an autoresearch task to the task store but does **not** begin execution by itself. You must separately start the task worker with `neurolink task start` to begin processing scheduled tasks. The task worker picks up saved tasks and executes experiment cycles on the configured interval.

### Manage Scheduled Tasks

```bash
neurolink autoresearch pause <taskId>     # Pause a running task
neurolink autoresearch resume <taskId>    # Resume a paused task
neurolink autoresearch stop <taskId>      # Stop and cancel a task
```

> **Note:** These commands update the task's stored status in the task store (e.g., marking it as paused or cancelled). They do not directly signal a running task worker process. The task worker checks stored status before each cycle and will honor the updated state on its next tick.

### Reset State

```bash
neurolink autoresearch reset              # Current directory
neurolink autoresearch reset /path/to/repo
```

This deletes the entire `.autoresearch/` directory (state, config, and all local artifacts). The git branch and committed experiment code on that branch are preserved.

---

## Research Tools

AutoResearch registers 12 tools that the AI uses during experiment cycles. Tool availability is gated by the current phase.

| Tool                        | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| `research_get_context`      | Read the research program, current state, and results    |
| `research_read_file`        | Read a file from the repository (respects path policies) |
| `research_write_candidate`  | Write changes to a mutable file                          |
| `research_diff`             | Show the git diff of pending changes                     |
| `research_commit_candidate` | Git-commit the current candidate changes                 |
| `research_run_experiment`   | Execute the run command and capture output               |
| `research_parse_log`        | Parse experiment output for metrics                      |
| `research_inspect_failure`  | Inspect why an experiment crashed or timed out           |
| `research_record`           | Record an experiment result to results.tsv               |
| `research_accept`           | Accept the current candidate (update accepted commit)    |
| `research_revert`           | Revert to the last accepted commit                       |
| `research_checkpoint`       | Save current state to disk                               |

---

## Events

AutoResearch emits events via NeuroLink's `TypedEventEmitter`. Subscribe to these for monitoring, alerting, or integration.

```typescript
// Session lifecycle
neurolink.getEventEmitter().on("autoresearch:initialized", (payload) => {
  // { tag, branch, config: { repoPath, runCommand, metric, timeoutMs } }
});

neurolink.getEventEmitter().on("autoresearch:resumed", (payload) => {
  // { tag, branch, runCount, currentPhase }
});

// Phase progression
neurolink.getEventEmitter().on("autoresearch:phase-changed", (payload) => {
  // { from, to, runCount, tag }
});

// Experiment lifecycle
neurolink.getEventEmitter().on("autoresearch:experiment-started", (payload) => {
  // { tag, runCount, description }
});

neurolink
  .getEventEmitter()
  .on("autoresearch:experiment-completed", (payload) => {
    // { tag, runCount, status, metric, commit, description, durationMs }
  });

// Metric tracking
neurolink.getEventEmitter().on("autoresearch:metric-improved", (payload) => {
  // { tag, previousBest, newBest, commit, direction, runCount }
});

// Git operations
neurolink.getEventEmitter().on("autoresearch:revert", (payload) => {
  // { tag, targetCommit, reason, runCount }
});

neurolink.getEventEmitter().on("autoresearch:revert-failed", (payload) => {
  // { tag, targetCommit, error, runCount }
});

// State persistence
neurolink.getEventEmitter().on("autoresearch:state-updated", (payload) => {
  // { tag, phase, runCount, keepCount, bestMetric }
});

// Errors
neurolink.getEventEmitter().on("autoresearch:error", (payload) => {
  // { tag, error, code?, phase?, runCount? }
});
```

---

## Artifacts

AutoResearch produces the following files in the repository:

| Path                          | Description                                        |
| ----------------------------- | -------------------------------------------------- |
| `.autoresearch/state.json`    | Current research state (phase, metrics, run count) |
| `.autoresearch/config.json`   | Persisted configuration from `init`                |
| `.autoresearch/runs.jsonl`    | JSONL audit log of all experiment records          |
| `results.tsv`                 | Tab-separated experiment results log               |
| `run.log`                     | Stdout/stderr from the last experiment run         |
| `autoresearch/<tag>` (branch) | Git branch containing all experiment commits       |

### results.tsv Format

```
commit	val_bpb	memory_gb	status	description
a1b2c3d	1.234	2.1	keep	Reduced learning rate to 1e-4
d4e5f6a	1.256	2.3	discard	Added dropout layer
```

> **Note:** The second column header is the metric name from your config (e.g., `val_bpb`, `accuracy`). The header is generated dynamically as `commit\t{metric.name}\tmemory_gb\tstatus\tdescription`.

---

## Configuration Reference

### ResearchConfig Fields

| Field            | Type                 | Default                      | Description                            |
| ---------------- | -------------------- | ---------------------------- | -------------------------------------- |
| `repoPath`       | `string`             | **required**                 | Absolute path to the git repository    |
| `programPath`    | `string`             | `"program.md"`               | Research program document path         |
| `mutablePaths`   | `string[]`           | **required**                 | Files the AI can modify                |
| `immutablePaths` | `string[]`           | `[]`                         | Files the AI can read but not modify   |
| `resultsPath`    | `string`             | `"results.tsv"`              | Path for the results log               |
| `statePath`      | `string`             | `".autoresearch/state.json"` | Path for persisted state               |
| `runCommand`     | `string`             | **required**                 | Command to run the experiment          |
| `logPath`        | `string`             | `"run.log"`                  | Path for experiment stdout/stderr      |
| `metric`         | `MetricConfig`       | **required**                 | Primary metric configuration           |
| `memoryMetric`   | `MemoryMetricConfig` | `undefined`                  | Optional secondary metric              |
| `timeoutMs`      | `number`             | `600_000` (10 min)           | Per-experiment timeout in milliseconds |
| `branchPrefix`   | `string`             | `"autoresearch/"`            | Git branch prefix                      |
| `provider`       | `string`             | SDK default                  | AI provider override                   |
| `model`          | `string`             | SDK default                  | Model override                         |
| `maxExperiments` | `number`             | `undefined` (unlimited)      | Maximum experiment count               |
| `thinkingLevel`  | `ThinkingLevel`      | `"medium"`                   | Thinking level for LLM calls           |

### MetricConfig Fields

| Field       | Type                  | Description                                        |
| ----------- | --------------------- | -------------------------------------------------- |
| `name`      | `string`              | Human-readable metric name                         |
| `direction` | `"lower" \| "higher"` | Whether lower or higher values are better          |
| `pattern`   | `string`              | Regex with exactly one capture group for the value |

---

## Troubleshooting

### Experiment stuck in bootstrap phase

The AI's first action in bootstrap is forced to `research_get_context`. If the program file doesn't exist or is empty, the AI has no context to work with. Ensure `program.md` exists in the repo with a clear research objective.

### Metric not being parsed

Verify your regex pattern matches the experiment output. Test it:

```bash
echo "val_bpb: 1.234" | grep -oP "^val_bpb:\s+([\d.]+)"
```

The pattern must have exactly one capture group. Common issue: escaping `\d` — in CLI flags and JSON, you need `\\d`.

### Experiments timing out

Increase `timeoutMs` (default: 600,000ms / 10 minutes). For long-running training scripts, set appropriately:

```bash
neurolink autoresearch init /repo --timeout 3600  # 1 hour
```

### Git revert failures

AutoResearch requires a clean working tree for reverts. If you have uncommitted changes outside mutable paths, commit or stash them first.

### State file corruption

If `.autoresearch/state.json` becomes invalid, use `reset` to clear it:

```bash
neurolink autoresearch reset /path/to/repo
```

Then re-initialize with `init`. Your git branch and committed experiments are preserved.

---

## FAQ

**Q: What providers work with AutoResearch?**
A: Any provider supported by NeuroLink. The AI needs tool-calling capability, so use models that support function calling (GPT-4o, Claude Sonnet, Gemini Flash/Pro, etc.).

**Q: Can I use AutoResearch with Python/ML training scripts?**
A: Yes — that's the primary use case. Set `runCommand` to your training script and configure the metric pattern to parse your output format.

**Q: How does the AI decide what to change?**
A: The AI reads the research program (`program.md`), the current code, and past experiment results. It proposes changes based on this context, using its understanding of the domain. The quality of your program document directly affects the quality of proposals.

**Q: What happens if the experiment crashes?**
A: The crash is detected via non-zero exit code or output parsing. The result is recorded as `crash` status, the candidate is reverted, and the loop continues with a new proposal.

**Q: Can I run AutoResearch on a remote server?**
A: Yes. Use the TaskManager integration with BullMQ (Redis) for scheduled runs. The repo must be accessible on the machine running NeuroLink.

**Q: How do I stop a running experiment?**
A: For `run-once`: Ctrl+C. For scheduled tasks: `neurolink autoresearch stop <taskId>` or `await neurolink.tasks.delete(taskId)`.

**Q: Is there a limit on experiment count?**
A: Set `maxExperiments` in config or `--max-runs` in CLI. Without a limit, research continues indefinitely until manually stopped.

**Q: Can multiple AutoResearch sessions run on the same repo?**
A: Not recommended. Each session operates on its own git branch, but concurrent filesystem operations on the same repo can conflict. Use separate working directories or git worktrees for parallel sessions.

**Q: Does AutoResearch work with `structuredOutput`?**
A: No. AutoResearch uses tool calling (function calling) which is mutually exclusive with `structuredOutput` JSON schemas on Gemini providers. This is an API limitation, not a bug.

# AutoResearch Quickstart

## Problem

You have a training script and a metric you want to optimize (e.g., validation loss), and you want an AI agent to autonomously iterate on the code — proposing changes, running experiments, keeping improvements, and reverting failures — without manual intervention.

## Solution

Use NeuroLink's AutoResearch engine. Initialize a config pointing at your repo, define the metric to optimize, and run experiment cycles. Each cycle: the AI reads your code, proposes a change, commits it to a branch, runs the experiment, parses the metric, and keeps or reverts the change.

## Code

### CLI — Single Experiment Cycle

```bash
# 1. Initialize AutoResearch in your repo
neurolink autoresearch init /path/to/repo \
  --tag "run1" \
  --target "train.py" \
  --immutable "program.md" \
  --run-command "python3 train.py" \
  --metric-name val_bpb \
  --metric-pattern "^val_bpb:\\s+([\\d.]+)" \
  --metric-direction lower \
  --timeout 120

# 2. Run one cycle (propose → execute → evaluate → keep/revert)
neurolink autoresearch run-once /path/to/repo

# 3. Check results
neurolink autoresearch status /path/to/repo
neurolink autoresearch results /path/to/repo
```

### SDK — Single Experiment Cycle

```typescript
import { NeuroLink } from "@juspay/neurolink";

async function runOneExperiment() {
  const neurolink = new NeuroLink({
    provider: "google-vertex",
    model: "gemini-2.5-flash",
  });

  const worker = neurolink.createResearchWorker({
    repoPath: "/path/to/repo",
    mutablePaths: ["train.py"],
    immutablePaths: ["program.md"],
    runCommand: "python3 train.py",
    metric: {
      name: "val_bpb",
      pattern: "^val_bpb:\\s+([\\d.]+)",
      direction: "lower",
    },
    timeoutMs: 120_000,
  });

  // Listen for events
  const emitter = neurolink.getEventEmitter();
  emitter.on("autoresearch:cycle:start", (e) => {
    console.log(`Cycle ${e.cycle} starting`);
  });
  emitter.on("autoresearch:cycle:end", (e) => {
    console.log(`Cycle ${e.cycle}: ${e.status}, metric=${e.metricValue}`);
  });

  // Run one cycle
  const result = await worker.runExperimentCycle(
    "Reduce validation loss by improving the learning rate schedule",
  );

  console.log("Status:", result.status);
  console.log("Metric:", result.metricValue);
  console.log("Commit:", result.commitHash);
}

runOneExperiment();
```

### SDK — Scheduled via TaskManager

```typescript
import { NeuroLink } from "@juspay/neurolink";

async function scheduleResearch() {
  const neurolink = new NeuroLink({
    provider: "google-vertex",
    model: "gemini-2.5-flash",
  });

  // Save as a managed task
  await neurolink.saveTask({
    id: "research-lr-schedule",
    type: "autoresearch",
    autoresearch: {
      repoPath: "/path/to/repo",
      mutablePaths: ["train.py"],
      runCommand: "python3 train.py",
      metric: {
        name: "val_bpb",
        pattern: "^val_bpb:\\s+([\\d.]+)",
        direction: "lower",
      },
    },
  });

  // Start the task worker to begin execution
  await neurolink.startTaskWorker();
}

scheduleResearch();
```

> **Note:** `saveTask()` only persists the task definition. You must call `startTaskWorker()` (SDK) or run `neurolink task start` (CLI) to begin execution.

## Explanation

### 1. Initialization

`autoresearch init` (CLI) or `createResearchWorker()` (SDK) sets up the config:

- **`mutablePaths`** — Files the AI is allowed to edit (your training script)
- **`immutablePaths`** — Files the AI can read but not modify (research program, dataset configs)
- **`runCommand`** — Shell command to execute the experiment
- **`metric`** — Name, regex pattern to extract the value from stdout, and optimization direction (`lower` or `higher`)
- **`timeoutMs`** — Max wall-clock time per experiment run

The CLI writes this to `.autoresearch/config.json` and creates a dedicated git branch.

### 2. Experiment Cycle

Each `runExperimentCycle()` call goes through 9 phases:

1. **bootstrap** — Read the research program and understand the codebase
2. **analyze** — Study current results and identify improvement opportunities
3. **plan** — Propose a specific code change
4. **implement** — Apply the change to mutable files
5. **validate** — Verify the code is syntactically valid
6. **commit** — Git-commit the candidate change
7. **execute** — Run the experiment command
8. **evaluate** — Parse the metric from stdout using the regex pattern
9. **decide** — Keep the commit if the metric improved, revert otherwise

### 3. Artifacts

After running, check `.autoresearch/` in your repo:

| File          | Contents                                                                       |
| ------------- | ------------------------------------------------------------------------------ |
| `config.json` | Persisted configuration                                                        |
| `state.json`  | Current best metric, cycle count, phase, branch name                           |
| `results.tsv` | Tab-separated log: `commit`, metric name, `memory_gb`, `status`, `description` |
| `runs.jsonl`  | Full JSON audit log — one JSON object per completed cycle                      |

### 4. Events

The SDK emits 10 typed events via `neurolink.getEventEmitter()`:

| Event                          | Fired when                          |
| ------------------------------ | ----------------------------------- |
| `autoresearch:cycle:start`     | A cycle begins                      |
| `autoresearch:cycle:end`       | A cycle completes (success or fail) |
| `autoresearch:phase:enter`     | Worker enters a new phase           |
| `autoresearch:phase:exit`      | Worker exits a phase                |
| `autoresearch:metric:recorded` | A metric value is parsed            |
| `autoresearch:commit:created`  | A candidate commit is made          |
| `autoresearch:commit:reverted` | A candidate commit is reverted      |
| `autoresearch:error`           | An error occurs                     |
| `autoresearch:timeout`         | Experiment exceeds time limit       |
| `autoresearch:stopped`         | Worker stops (manual or max-runs)   |

## Variations

### Use a Different Provider

Replace the provider/model in the config. AutoResearch works with any NeuroLink-supported provider:

```typescript
const worker = neurolink.createResearchWorker({
  // ... same config ...
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
});
```

Or via CLI:

```bash
neurolink autoresearch init /path/to/repo \
  --provider anthropic --model claude-sonnet-4-20250514 \
  # ... other flags ...
```

### Optimize a Higher-is-Better Metric

Set `direction: "higher"` for metrics like accuracy:

```typescript
metric: {
  name: "accuracy",
  pattern: "^accuracy:\\s+([\\d.]+)",
  direction: "higher",
}
```

### Reset and Start Over

```bash
# Deletes entire .autoresearch/ directory (config, state, results)
neurolink autoresearch reset /path/to/repo
```

### Pause and Resume (TaskManager)

```bash
neurolink autoresearch pause /path/to/repo
# ... later ...
neurolink autoresearch resume /path/to/repo
```

> **Note:** `pause`, `resume`, and `stop` update the stored task status but do not interact with the TaskManager runtime directly. The task worker checks status before each cycle.

## See Also

- [AutoResearch Feature Guide](../features/autoresearch.md) — Full reference with phase diagrams, configuration, and architecture
- [Tool Chaining](tool-chaining.md) — AutoResearch uses phase-gated tool chaining internally
- [Structured Output with JSON Schema](structured-output.md) — Extract structured data from experiment outputs
- [API Reference](../sdk/api-reference.md)

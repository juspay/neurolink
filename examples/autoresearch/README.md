# AutoResearch Examples

This directory contains examples for NeuroLink's AutoResearch feature — an autonomous AI experiment engine that proposes code changes, runs experiments, and keeps improvements automatically.

## Files

| File                 | Description                                       |
| -------------------- | ------------------------------------------------- |
| `run-demo.ts`        | Full multi-cycle demo with a fake training script |
| `sample-program.md`  | Example research program document                 |
| `sample-config.json` | Example `.autoresearch/config.json` for reference |

> **CLI vs SDK config fields:** The `sample-config.json` contains fields that the CLI `init` command writes and `start` forwards: `mutablePaths`, `immutablePaths`, `runCommand`, `metric`, `timeoutMs`, `provider`, `model`. Additional fields like `programPath`, `resultsPath`, `statePath`, `logPath`, `branchPrefix`, and `memoryMetric` are available in the SDK's `ResearchConfig` type but are **not** written by the CLI `init` command or forwarded by `start`. Use the SDK directly if you need those fields.

## Quick Start

### 1. Set up a research repository

Create a git repo with a training script and a research program:

```bash
mkdir /tmp/my-research && cd /tmp/my-research
git init
cp /path/to/examples/autoresearch/sample-program.md program.md
# Add your training script (e.g., train.py)
git add -A && git commit -m "initial"
```

### 2. Initialize AutoResearch

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

### 3. Run a single experiment cycle

```bash
neurolink autoresearch run-once /tmp/my-research
```

### 4. Or start continuous research

```bash
# Run every 5 minutes, stop after 20 experiments
neurolink autoresearch start /tmp/my-research \
  --interval 300 \
  --max-runs 20
```

> **Note:** `autoresearch start` saves the task to the task store. To begin execution, you must also start the task worker: `neurolink task start`. The worker picks up saved tasks and runs experiment cycles on the configured interval.

### 5. Monitor progress

```bash
neurolink autoresearch status /tmp/my-research
neurolink autoresearch results /tmp/my-research
```

## Running the Demo

The `run-demo.ts` script sets up a self-contained demo with a fake training script that responds to hyperparameter changes:

```bash
# Ensure you have a provider configured (e.g., GOOGLE_VERTEX_PROJECT in .env)
npx tsx examples/autoresearch/run-demo.ts
```

This creates a temporary repo at `/tmp/autoresearch-demo`, runs 5 experiment cycles, and prints results.

## SDK Usage Example

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
  repoPath: "/tmp/my-research",
  mutablePaths: ["train.py"],
  immutablePaths: ["program.md"],
  runCommand: "python3 train.py",
  metric: {
    name: "val_bpb",
    direction: "lower",
    pattern: "^val_bpb:\\s+([\\d.]+)",
  },
});

validateConfig(config);

const worker = new ResearchWorker(config);
await worker.initialize("my-experiment");

// Listen for events
neurolink.getEventEmitter().on("autoresearch:metric-improved", (e) => {
  console.log(`New best: ${e.newBest}`);
});

// Run 10 cycles
for (let i = 0; i < 10; i++) {
  const result = await worker.runExperimentCycle(`Cycle ${i + 1}`);
  console.log(`[${i + 1}] ${result.status} — metric: ${result.metric}`);
}
```

## Further Reading

- [AutoResearch Guide](../../docs/features/autoresearch.md) — Full documentation
- [TaskManager Guide](../../docs/features/task-manager.md) — Scheduled task integration

# CLI Command Coverage Matrix

This document provides a complete coverage matrix for CLI command testing in the workflow system test suite.

## Command Coverage Summary

| Command    | Subcommand    | Tested | Test Function                  |
| ---------- | ------------- | ------ | ------------------------------ |
| `workflow` | `list`        | ✅     | `testCLIWorkflowList()`        |
| `workflow` | `run`         | ✅     | `testCLIWorkflowRun()`         |
| `workflow` | `resume`      | ✅     | `testCLIWorkflowResume()`      |
| `workflow` | `status`      | ✅     | `testCLIWorkflowStatus()`      |
| `workflow` | `cancel`      | ✅     | `testCLIWorkflowCancel()`      |
| `workflow` | `checkpoints` | ✅     | `testCLIWorkflowCheckpoints()` |
| `workflow` | `visualize`   | ✅     | `testCLIWorkflowVisualize()`   |
| `workflow` | `info`        | ✅     | `testCLIWorkflowInfo()`        |
| `workflow` | `history`     | ✅     | `testCLIWorkflowHistory()`     |

**Coverage: 9/9 commands (100%)**

---

## Detailed Option Coverage

### `workflow list`

| Option        | Type            | Tested | Notes          |
| ------------- | --------------- | ------ | -------------- |
| `--tag, -t`   | string          | ✅     | Filter by tag  |
| `--format`    | text/json/table | ✅     | Output format  |
| `--quiet, -q` | boolean         | ⚪     | Minimal output |

### `workflow run <workflowId>`

| Option         | Type            | Tested | Notes               |
| -------------- | --------------- | ------ | ------------------- |
| `<workflowId>` | string          | ✅     | Required positional |
| `--input, -i`  | string (JSON)   | ✅     | Input data          |
| `--timeout`    | number          | ✅     | Execution timeout   |
| `--watch, -w`  | boolean         | ⚪     | Watch execution     |
| `--format`     | text/json/table | ✅     | Output format       |
| `--quiet, -q`  | boolean         | ⚪     | Minimal output      |

### `workflow resume <checkpointId>`

| Option           | Type            | Tested | Notes               |
| ---------------- | --------------- | ------ | ------------------- |
| `<checkpointId>` | string          | ✅     | Required positional |
| `--resume-data`  | string (JSON)   | ✅     | Data for resumption |
| `--timeout`      | number          | ⚪     | Execution timeout   |
| `--format`       | text/json/table | ⚪     | Output format       |

### `workflow status <runId>`

| Option        | Type            | Tested | Notes               |
| ------------- | --------------- | ------ | ------------------- |
| `<runId>`     | string          | ✅     | Required positional |
| `--watch, -w` | boolean         | ⚪     | Live updates        |
| `--format`    | text/json/table | ⚪     | Output format       |

### `workflow cancel <runId>`

| Option    | Type    | Tested | Notes               |
| --------- | ------- | ------ | ------------------- |
| `<runId>` | string  | ✅     | Required positional |
| `--force` | boolean | ⚪     | Force cancel        |

### `workflow checkpoints`

| Option          | Type            | Tested | Notes              |
| --------------- | --------------- | ------ | ------------------ |
| `--workflow-id` | string          | ✅     | Filter by workflow |
| `--all`         | boolean         | ⚪     | Show all           |
| `--format`      | text/json/table | ⚪     | Output format      |

### `workflow visualize <workflowId>`

| Option         | Type          | Tested | Notes                |
| -------------- | ------------- | ------ | -------------------- |
| `<workflowId>` | string        | ✅     | Required positional  |
| `--format`     | ascii/mermaid | ⚪     | Visualization format |

### `workflow info <workflowId>`

| Option         | Type            | Tested | Notes               |
| -------------- | --------------- | ------ | ------------------- |
| `<workflowId>` | string          | ✅     | Required positional |
| `--format`     | text/json/table | ⚪     | Output format       |

### `workflow history <workflowId>`

| Option         | Type            | Tested | Notes               |
| -------------- | --------------- | ------ | ------------------- |
| `<workflowId>` | string          | ✅     | Required positional |
| `--limit, -n`  | number          | ⚪     | Limit results       |
| `--format`     | text/json/table | ⚪     | Output format       |

---

## Legend

| Symbol | Meaning               |
| ------ | --------------------- |
| ✅     | Tested in test suite  |
| ⚪     | Not explicitly tested |
| ❌     | Known issue/bug       |

---

## Test Scenarios by Command

### `workflow list` Test Scenarios

```
1. Basic list with default options
2. List with --format=json
3. List with --tag=test filter
4. List when registry is empty
```

### `workflow run` Test Scenarios

```
1. Run simple-workflow with valid input
2. Run with --format=json output
3. Run with --timeout option
4. Run with invalid workflow ID (error case)
5. Run with invalid JSON input (error case)
6. Run branching-workflow with large amount (branch A)
7. Run branching-workflow with small amount (branch B)
8. Run parallel-workflow
```

### `workflow resume` Test Scenarios

```
1. Resume from valid checkpoint with data
2. Resume with invalid checkpoint ID (error case)
3. Resume expired checkpoint (error case)
```

### `workflow status` Test Scenarios

```
1. Status of running workflow
2. Status of completed workflow
3. Status with invalid run ID (error case)
```

### `workflow cancel` Test Scenarios

```
1. Cancel running workflow
2. Cancel already completed (error case)
3. Cancel with invalid run ID (error case)
```

### `workflow checkpoints` Test Scenarios

```
1. List all checkpoints
2. List filtered by --workflow-id
3. List when no checkpoints exist
```

### `workflow visualize` Test Scenarios

```
1. Visualize simple-workflow
2. Visualize parallel-workflow (shows parallel group)
3. Visualize branching-workflow (shows branches)
4. Visualize invalid workflow ID (error case)
```

### `workflow info` Test Scenarios

```
1. Info for simple-workflow
2. Info with --format=json
3. Info for invalid workflow ID (error case)
```

### `workflow history` Test Scenarios

```
1. History for workflow with executions
2. History for workflow with no executions
3. History for invalid workflow ID (error case)
```

---

## Error Handling Coverage

| Error Type            | Tested | Commands                      |
| --------------------- | ------ | ----------------------------- |
| Invalid workflow ID   | ✅     | run, visualize, info, history |
| Invalid run ID        | ✅     | status, cancel                |
| Invalid checkpoint ID | ✅     | resume                        |
| Invalid JSON input    | ✅     | run                           |
| Timeout               | ✅     | run                           |
| Permission denied     | ⚪     | -                             |
| Network errors        | ⚪     | -                             |

---

## Output Format Coverage

| Format  | Commands Supporting | Tested |
| ------- | ------------------- | ------ |
| `text`  | All commands        | ✅     |
| `json`  | list, run, info     | ✅     |
| `table` | list, checkpoints   | ⚪     |

---

## Integration Points

| Integration          | Command                             | Tested |
| -------------------- | ----------------------------------- | ------ |
| WorkflowRegistry     | list, run, info, visualize, history | ✅     |
| WorkflowExecutor     | run, resume                         | ✅     |
| CheckpointStorage    | checkpoints, resume                 | ✅     |
| WorkflowStateManager | status, cancel                      | ✅     |

---

## Recommended Additional Tests

1. **Concurrent execution** - Multiple `workflow run` in parallel
2. **Large workflows** - Workflows with 50+ steps
3. **Long-running workflows** - Test timeout behavior
4. **Memory pressure** - Many checkpoints
5. **Invalid schemas** - Malformed workflow definitions
6. **Unicode handling** - Non-ASCII workflow names/data
7. **Signal handling** - SIGINT during execution

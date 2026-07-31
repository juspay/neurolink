# Workflow Test Verification Matrix

This document details what each test verifies in the workflow system test suite.

## CLI Tests

### `testCLIWorkflowList`

**Command:** `neurolink workflow list`

| Verification   | Check                               | Expected Result             |
| -------------- | ----------------------------------- | --------------------------- |
| Basic list     | Command exits successfully          | Exit code 0                 |
| Output content | Contains workflow IDs               | "simple-workflow" in output |
| JSON format    | `--format=json` produces valid JSON | Parseable JSON array        |
| Tag filtering  | `--tag=test` filters correctly      | Only tagged workflows shown |
| Empty registry | List works with no workflows        | Empty output, no error      |

### `testCLIWorkflowRun`

**Command:** `neurolink workflow run <workflowId>`

| Verification     | Check                         | Expected Result            |
| ---------------- | ----------------------------- | -------------------------- |
| Basic execution  | Workflow completes            | Exit code 0                |
| Input passing    | `--input='{"value":5}'`       | Correct output             |
| Output content   | Result contains expected data | `result: 20`               |
| JSON format      | `--format=json` output        | Valid JSON result          |
| Invalid workflow | Non-existent ID               | Error message, exit code 1 |
| Invalid input    | Malformed JSON                | Error message, exit code 1 |
| Timeout          | `--timeout=5000`              | Respects timeout setting   |

### `testCLIWorkflowStatus`

**Command:** `neurolink workflow status <runId>`

| Verification       | Check                    | Expected Result      |
| ------------------ | ------------------------ | -------------------- |
| Running workflow   | Status shows "running"   | Status field present |
| Completed workflow | Status shows "completed" | Status field present |
| Step progress      | Shows completed steps    | Step IDs listed      |
| Invalid runId      | Non-existent run         | Error message        |

### `testCLIWorkflowCheckpoints`

**Command:** `neurolink workflow checkpoints`

| Verification       | Check                | Expected Result      |
| ------------------ | -------------------- | -------------------- |
| List checkpoints   | Command succeeds     | Exit code 0          |
| Checkpoint content | Shows checkpoint IDs | ID format correct    |
| Workflow filter    | `--workflow-id=X`    | Filtered list        |
| Empty state        | No checkpoints       | Empty list, no error |

### `testCLIWorkflowVisualize`

**Command:** `neurolink workflow visualize <workflowId>`

| Verification     | Check                   | Expected Result       |
| ---------------- | ----------------------- | --------------------- |
| ASCII output     | Contains box characters | `┌`, `│`, `└` present |
| Step names       | Shows step IDs          | Step names visible    |
| Connections      | Shows arrows/lines      | `→` or similar        |
| Invalid workflow | Non-existent ID         | Error message         |

### `testCLIWorkflowInfo`

**Command:** `neurolink workflow info <workflowId>`

| Verification     | Check                   | Expected Result |
| ---------------- | ----------------------- | --------------- |
| Basic info       | Shows name, description | Fields present  |
| Version          | Shows version number    | e.g., "1.0.0"   |
| Tags             | Shows workflow tags     | Tag list        |
| Step count       | Shows number of steps   | Count matches   |
| Invalid workflow | Non-existent ID         | Error message   |

### `testCLIWorkflowCancel`

**Command:** `neurolink workflow cancel <runId>`

| Verification      | Check            | Expected Result    |
| ----------------- | ---------------- | ------------------ |
| Cancel running    | Workflow stops   | Status = cancelled |
| Confirmation      | Success message  | "Cancelled" text   |
| Already completed | Cannot cancel    | Error or warning   |
| Invalid runId     | Non-existent run | Error message      |

### `testCLIWorkflowHistory`

**Command:** `neurolink workflow history <workflowId>`

| Verification    | Check              | Expected Result            |
| --------------- | ------------------ | -------------------------- |
| List executions | Shows past runs    | Run IDs listed             |
| Timestamps      | Shows start times  | Date/time format           |
| Status summary  | Shows final status | completed/failed/cancelled |
| Empty history   | No past runs       | Empty list                 |

### `testCLIWorkflowResume`

**Command:** `neurolink workflow resume <checkpointId>`

| Verification       | Check                | Expected Result       |
| ------------------ | -------------------- | --------------------- |
| Resume suspended   | Workflow continues   | Exit code 0           |
| Resume data        | `--resume-data='{}'` | Data passed correctly |
| Invalid checkpoint | Non-existent ID      | Error message         |
| Expired checkpoint | Old checkpoint       | Error message         |

---

## SDK Tests

### `testSDKWorkflowBuilder`

**API:** `createWorkflow()`, `WorkflowBuilder`

| Verification  | Check                | Expected Result   |
| ------------- | -------------------- | ----------------- |
| Creation      | `createWorkflow(id)` | Builder instance  |
| Fluent API    | `.name().describe()` | Chainable methods |
| Step addition | `.step(id, config)`  | Step registered   |
| Then chaining | `.then(id, config)`  | Sequential steps  |
| Input schema  | `.input(zodSchema)`  | Validation works  |
| Output schema | `.output(zodSchema)` | Validation works  |
| Tags          | `.tag('a', 'b')`     | Tags stored       |
| Version       | `.setVersion('1.0')` | Version stored    |
| Registration  | `.register()`        | In registry       |

### `testSDKWorkflowExecutor`

**API:** `WorkflowExecutor`, `execute()`

| Verification   | Check                               | Expected Result      |
| -------------- | ----------------------------------- | -------------------- |
| Creation       | `new WorkflowExecutor(neurolink)`   | Instance created     |
| Execution      | `executor.execute(workflow, input)` | Result returned      |
| Success result | `result.success`                    | `true`               |
| Output data    | `result.output`                     | Correct data         |
| Run ID         | `result.runId`                      | UUID format          |
| Metadata       | `result.metadata`                   | Present              |
| Error handling | Invalid input                       | Throws/returns error |
| Timeout        | Options timeout                     | Respects setting     |

### `testSDKParallelExecution`

**API:** `WorkflowBuilder.parallel()`

| Verification   | Check                 | Expected Result           |
| -------------- | --------------------- | ------------------------- |
| Parallel steps | `.parallel([steps])`  | All execute               |
| Concurrent     | Timing shows parallel | Faster than sequential    |
| All results    | Each step output      | All present               |
| waitFor: all   | Waits for slowest     | All complete              |
| Error handling | One step fails        | continueOnError respected |

### `testSDKBranchExecution`

**API:** `WorkflowBuilder.branch()`

| Verification      | Check                          | Expected Result            |
| ----------------- | ------------------------------ | -------------------------- |
| Branch creation   | `.branch(conditions, default)` | Configured                 |
| Condition true    | Matching condition             | Correct branch taken       |
| Condition false   | No match                       | Default branch             |
| Multiple branches | Several conditions             | First match wins           |
| Context access    | `ctx.getStepOutput()`          | Previous outputs available |

### `testSDKCheckpointing`

**API:** `InMemoryCheckpointStorage`, `WorkflowStateManager`

| Verification      | Check                             | Expected Result      |
| ----------------- | --------------------------------- | -------------------- |
| Storage creation  | `new InMemoryCheckpointStorage()` | Instance             |
| Save checkpoint   | `storage.save(checkpoint)`        | Returns ID           |
| Load checkpoint   | `storage.load(id)`                | Checkpoint data      |
| List checkpoints  | `storage.list(workflowId)`        | Array of checkpoints |
| Delete checkpoint | `storage.delete(id)`              | Returns true         |
| State restoration | Load → execute                    | Continues correctly  |

### `testSDKHITLSuspendResume`

**API:** `SuspensionError`, `.human()`, `executor.resume()`

| Verification       | Check                       | Expected Result        |
| ------------------ | --------------------------- | ---------------------- |
| Human step         | `.human(id, config)`        | Registered             |
| Suspension         | Execute HITL workflow       | SuspensionError thrown |
| Checkpoint created | On suspension               | Checkpoint exists      |
| Resume data        | `executor.resume(cp, data)` | Data available         |
| Continuation       | After resume                | Next steps execute     |
| Final result       | After approval              | Workflow completes     |

### `testSDKWorkflowRegistry`

**API:** `WorkflowRegistry`

| Verification | Check                      | Expected Result    |
| ------------ | -------------------------- | ------------------ |
| Register     | `.register()`              | Workflow stored    |
| Get          | `WorkflowRegistry.get(id)` | Workflow returned  |
| List         | `WorkflowRegistry.list()`  | Array of workflows |
| Has          | `WorkflowRegistry.has(id)` | Boolean            |
| Clear        | `WorkflowRegistry.clear()` | Empty registry     |
| Not found    | Get non-existent           | undefined          |

### `testSDKEventStreaming`

**API:** `executor.executeWithEvents()`

| Verification    | Check                         | Expected Result    |
| --------------- | ----------------------------- | ------------------ |
| Stream creation | `executeWithEvents()`         | AsyncGenerator     |
| Event emission  | Iterate stream                | Events received    |
| Event types     | `workflow:start`              | Type present       |
| Step events     | `step:start`, `step:complete` | Present            |
| Completion      | Stream ends                   | Final result       |
| Event content   | Event data                    | Meaningful payload |

---

## Test Fixtures Verification

### Workflow JSON Schema

Each fixture JSON is validated for:

| Field          | Required | Type             |
| -------------- | -------- | ---------------- |
| `id`           | Yes      | string           |
| `name`         | Yes      | string           |
| `description`  | No       | string           |
| `version`      | No       | string           |
| `tags`         | No       | string[]         |
| `inputSchema`  | No       | JSON Schema      |
| `outputSchema` | No       | JSON Schema      |
| `graph`        | Yes      | WorkflowGraph    |
| `steps`        | Yes      | StepDefinition[] |
| `metadata`     | No       | object           |

---

## Coverage Summary

| Category     | Tests  | Verifications |
| ------------ | ------ | ------------- |
| CLI Commands | 9      | 45+           |
| SDK APIs     | 8      | 50+           |
| **Total**    | **17** | **95+**       |

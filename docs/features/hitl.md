---
title: Human-in-the-Loop (HITL) Workflows
description: Pause AI tool execution for user approval before risky operations like file deletion or API calls
keywords: hitl, human in the loop, tool confirmation, safety, approval workflow, user consent
---

# Human-in-the-Loop (HITL) Workflows

> **Since**: v7.39.0 | **Status**: Stable | **Availability**: SDK

## Overview

**What it does**: HITL pauses AI tool execution to request explicit user approval before performing risky operations like deleting files, modifying databases, or making expensive API calls.

**Why use it**: Prevent costly mistakes and give users control over potentially dangerous AI actions. Think of it as an "Are you sure?" dialog for AI assistant operations.

:::warning[Security Best Practice]
Only use HITL for truly risky operations. Overusing confirmation prompts degrades user experience and can lead to "confirmation fatigue" where users approve actions without reading them.
:::

**Common use cases**:

- File deletion or modification operations
- Database write/delete operations
- Expensive third-party API calls
- Irreversible actions (sending emails, posting to social media)
- Operations accessing sensitive data

## Quick Start

### SDK Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  tools: [
    {
      name: "deleteFile", // (1)!
      description: "Deletes a file from the filesystem", // (2)!
      requiresConfirmation: true, // (3)!
      execute: async (args) => {
        // (4)!
        // Your deletion logic
      },
    },
  ],
});

// When AI tries to use deleteFile:
// 1. Tool execution pauses; the tool has not run
// 2. hitl:confirmation-request is emitted
// 3. Application shows confirmation dialog
// 4. On approval (hitl:confirmation-response), the paused call runs; the approval
//    covers that one call, including any retry of a failed attempt
```

1. Tool identifier used by the AI to invoke this function
2. Describes tool purpose to the LLM for proper selection
3. Triggers HITL checkpoint before execution
4. Actual implementation only runs after user approval

### Handling Confirmation in Your UI

HITL uses an event-based workflow where the SDK emits confirmation requests and your app responds with user decisions.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    dangerousActions: ["delete", "remove", "drop", "truncate"],
    timeout: 30000, // 30 seconds
  },
});

// (1)! Reach the SDK's event emitter. NeuroLink does not extend EventEmitter,
// so there is no neurolink.on() / neurolink.emit().
const emitter = neurolink.getEventEmitter();

// (2)! Listen for confirmation requests
emitter.on("hitl:confirmation-request", async (event) => {
  const receivedAt = Date.now();
  const {
    confirmationId,
    toolName,
    arguments: args,
    timeoutMs,
  } = event.payload;

  // (3)! Show your app's confirmation UI
  const approved = await showConfirmationDialog({
    action: toolName,
    details: args,
    message: `AI wants to ${toolName}. Allow?`,
    timeoutMs,
  });

  // (4)! Send response back to NeuroLink
  emitter.emit("hitl:confirmation-response", {
    type: "hitl:confirmation-response",
    payload: {
      confirmationId, // Must match the request
      approved, // (5)! User decision
      reason: approved ? undefined : "User denied permission",
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - receivedAt, // Milliseconds since the request arrived
      },
    },
  });
});

// (6)! Handle confirmation timeouts
emitter.on("hitl:timeout", (event) => {
  console.warn(`Confirmation timed out for ${event.payload.toolName}`);
});
```

1. Get the event emitter - `NeuroLink` is not itself an emitter, so requests and responses both go through `getEventEmitter()`
2. Subscribe to confirmation requests - NeuroLink emits one before running a tool that needs approval
3. Show your confirmation UI with the tool name, arguments and remaining time
4. Reply on the same emitter, echoing the request's `confirmationId` so the response is matched to its request
5. Approval decision determines if tool executes
6. Optional: Handle cases where user doesn't respond in time

## Configuration

| Option                 | Type      | Default | Required | Description                          |
| ---------------------- | --------- | ------- | -------- | ------------------------------------ |
| `requiresConfirmation` | `boolean` | `false` | No       | Mark tool as requiring user approval |

### Tool Registration

```typescript
const riskyTool = {
  name: "sendEmail",
  description: "Sends an email to a recipient",
  requiresConfirmation: true, // Enable HITL
  parameters: {
    /* ... */
  },
  execute: async (args) => {
    /* ... */
  },
};
```

## How It Works

### Execution Flow

1. **AI requests tool execution** → The tool gateway checks whether the tool requires confirmation
2. **Confirmation required?** → The call pauses and `hitl:confirmation-request` is emitted; the tool does not run yet and the model is not asked to retry
3. **Your approval UI responds** by emitting `hitl:confirmation-response` with the `confirmationId`:
   - **Approve** → the paused call resumes and runs (optionally with `modifiedArguments`); the approval covers that one call, so a retry of a failed or timed-out attempt runs the tool again without a new approval
   - **Deny** → the call returns a refusal to the model and the tool never runs
   - **No answer** → the confirmation times out (a refusal, unless auto-approve on timeout is configured)
4. **Cancelled** → aborting the call's `abortSignal` withdraws the pending confirmation and emits `hitl:cancelled`
5. **Tool executes** → Each approval covers exactly one call, including its retries; the next call asks again

### Security Features

- **One-time permissions**: Each approval works for exactly one action
- **No reuse**: AI cannot reuse old permissions for new actions
- **Automatic reset**: Permission flag clears immediately after use
- **Fail-safe**: Defaults to requiring permission when in doubt

### Built-in tools

HITL applies to the built-in tools (`readFile`, `writeFile`, `listDirectory`,
`analyzeCSV`, `calculateMath`, `getCurrentTime`, `websearchGrounding` and the
opt-in `executeBashCommand`) exactly as it applies to tools you register:
`dangerousActions` keywords and `customRules` are matched against the tool
name on every model-driven call. Before the 2026-10 security audit fix (finding
C3) built-in tools bypassed HITL entirely — only tools executed through the
tool registry were gated — so a
prompt-injected model could write files or, with the bash tool enabled, run
shell commands with no confirmation, while the bash tool's own description
claimed otherwise.

Two built-ins change the machine and are **confirmed on every call while HITL
is enabled, whatever `dangerousActions` lists**: `writeFile` and
`executeBashCommand`. To gate them by keywords only, like every other tool,
set `confirmBuiltinTools: false`:

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    dangerousActions: ["delete", "drop"],
    confirmBuiltinTools: false, // writeFile / executeBashCommand follow the keywords
  },
});
```

A denied built-in call is reported to the model as a failed tool call
(`Built-in tool execution rejected by user: <reason>`); the model sees the denial and
can continue without the side effect. A confirmation that returns
`modifiedArguments` runs the tool with those arguments. The confirmation
request carries `serverId: "direct"` for a built-in tool.

Per-call tools passed through `generate({ tools })` are the host's own code
and are not gated by HITL; wrap their `execute` yourself if they need it.

## API Reference

### Event Types

All HITL events ride the SDK emitter returned by
`neurolink.getEventEmitter()`; `emitter` below is that object.

**Confirmation Request Event** (`hitl:confirmation-request`):

```typescript
emitter.on("hitl:confirmation-request", (event) => {
  event.payload: {
    confirmationId: string;      // Unique ID for this request
    toolName: string;            // Tool requiring confirmation
    arguments: unknown;          // Tool parameters for review
    actionType: string;          // Human-readable description
    timeoutMs: number;           // Milliseconds until timeout
    allowModification: boolean;  // Hint for your UI; NeuroLink applies modifiedArguments either way
    metadata: { ... }            // Session/user context
  }
});
```

**Confirmation Response** (emit from your app):

```typescript
emitter.emit("hitl:confirmation-response", {
  type: "hitl:confirmation-response",
  payload: {
    confirmationId: string;      // Must match request
    approved: boolean;           // User decision
    reason?: string;             // Rejection reason
    modifiedArguments?: unknown; // User-edited args
    metadata: {
      timestamp: string;
      responseTime: number;
    }
  }
});
```

**Timeout Event** (`hitl:timeout`):

```typescript
emitter.on("hitl:timeout", (event) => {
  event.payload: {
    confirmationId: string;
    toolName: string;
    timeout: number;
  }
});
```

**Cancelled Event** (`hitl:cancelled`): a pending confirmation was withdrawn
because the call that asked was cancelled (its `abortSignal` fired, for
example the turn was aborted). Retire the card in your UI; an answer sent for
it is ignored.

```typescript
emitter.on("hitl:cancelled", (event) => {
  event.payload: {
    confirmationId: string;
    toolName: string;
    reason: string;              // The abort reason, when the caller gave one
  }
});
```

### Confirmation and the call's limits

A call that needs confirmation is confirmed once, before its attempt timeout,
its retries and the circuit breaker start, and nothing runs until the human
approves or the card times out under the rule below. A denial or a
cancellation is final: the call returns a refusal and is not retried. A card
timeout is also final, unless `autoApproveOnTimeout` is enabled and the tool
is not in `autoApproveExclusions`: then the timeout approves the call without
a human response, and it runs like any approved call. Once approved, a failed
or timed-out attempt is retried without a new approval, so a tool with side
effects can run more than once. A model loop's per-tool deadline does
not run while the card waits; approval resumes it with the time that was
left.

The rule applies to the tools of the instance and of its worker instances
(`createWorkerInstance`, and so `runIsolatedAgent`, `registerAgentTool` and
`delegate_task`): registered tools, external MCP tools and NeuroLink's
built-in tools, matched by name (for example `readFile` by
`dangerousActions: ["read"]`; `writeFile` and `executeBashCommand` are
confirmed on every call a model loop makes unless `confirmBuiltinTools` is
`false`, see [Built-in tools](#built-in-tools)). Registered and built-in tools
are confirmed by the HITL manager the tool registry holds: the instance's own,
unless another manager was installed there
(`getToolRegistry().setHITLManager()`, or a worker with HITL of its own, see
below). External MCP tools are confirmed by the external server manager's: the
instance's own, or with none the registry's. A worker with no HITL of its own
shares its host's registry, so its calls are confirmed by the manager that
registry holds, normally the host's, and their cards reach that manager
owner's emitter. When an agent tool's call ends, through its attempt timeout
or the caller's abort, its worker run is stopped and any card it raised is
withdrawn. Agent-tool calls are never batched. Model calls NeuroLink makes for
its own text-only roles (evaluation, scoring, judging, guardrails checks,
summaries, memory condensation, RAG answers and reranking) are given no tools.

Not covered:

- tools passed per call in `options.tools`, including the skill and RAG tools
  NeuroLink adds to a call: they are the caller's own code;
- a worker built with `createWorkerInstance({ shareToolRegistry: false })`:
  it does not share the host's registry, so the host's rule does not apply;
- a worker with its own enabled HITL: its own rule and emitter apply, and it
  takes over the shared registry's manager, so from then on the registered
  and built-in tools of the host, and of every worker on that registry with
  no HITL of its own, are confirmed by that worker's manager, and their cards
  reach that worker's emitter.

Pass an `abortSignal` to `executeTool` to cancel a call; aborting it withdraws
a pending confirmation:

```typescript
const controller = new AbortController();
// Abort once the card is pending: that withdraws it and emits hitl:cancelled
neurolink.getEventEmitter().once("hitl:confirmation-request", () => {
  controller.abort();
});
const result = await neurolink.executeTool(
  "deleteFile",
  { path: "/tmp/x" },
  {
    abortSignal: controller.signal,
  },
);
// result is the { success: false } refusal; a later answer runs nothing
```

`hitl:cancelled` is delivered after every `hitl:confirmation-request` listener
has run, so an abort raised inside an early listener does not reach your
approval UI before it has seen the card.

A signal that has already fired when the call starts raises no card, so no
`hitl:cancelled` is emitted, and the tool does not run. Unlike a cancellation
while the card waits, the call does not return a refusal: `executeTool` rejects
with an abort error, as it does for any call cancelled before it starts, so
handle the rejection. A `HITLManager`
of your own that ignores `context.signal` keeps its card when the call is
aborted; the call still returns the refusal at once, and a later answer to that
card runs nothing. An arguments object changed while its card waits is not
detected, and does not change what runs: confirmation copies the arguments
before the card is raised, the human reviews that copy, and the tool runs it
(or the approver's `modifiedArguments`). Arguments that cannot be copied (a
function value, for example) are used as they are, so changes to them are not
isolated.

## Troubleshooting

### Problem: Tool executes without asking for permission

**Cause**: Tool not marked with `requiresConfirmation: true`
**Solution**:

```typescript
// Add confirmation flag to tool definition
const tool = {
  name: "deleteTool",
  requiresConfirmation: true, // (1)!
  // ...
};
```

1. Add this boolean flag to any tool that performs risky operations

### Problem: AI keeps asking for confirmation repeatedly

**Cause**: Confirmation responses not being sent or sent with wrong `confirmationId`
**Solution**:

```typescript
// Always respond to confirmation requests with matching ID
const emitter = neurolink.getEventEmitter();

emitter.on("hitl:confirmation-request", async (event) => {
  const receivedAt = Date.now();
  const { confirmationId } = event.payload; // (1)!

  const approved = await showConfirmationDialog(event.payload);

  // (2)! Send response with EXACT confirmationId from request
  emitter.emit("hitl:confirmation-response", {
    type: "hitl:confirmation-response",
    payload: {
      confirmationId, // (3)! Must match request exactly
      approved,
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - receivedAt,
      },
    },
  });
});
```

1. Extract confirmation ID from the request event
2. Always respond to every confirmation request
3. **Critical**: Use the same confirmationId from the request

### Problem: Confirmation dialog doesn't show

**Cause**: Not listening to `hitl:confirmation-request` event
**Solution**:

```typescript
// Set up event listener BEFORE making AI requests
const emitter = neurolink.getEventEmitter();

emitter.on("hitl:confirmation-request", async (event) => {
  // (1)! Show your confirmation UI
  await handleConfirmationPrompt(event);
});

// (2)! Then make AI requests - confirmations will now work
const result = await neurolink.generate({
  input: { text: "Delete all temporary files" },
});
```

1. Register the event handler early in your application startup
2. All subsequent tool executions will trigger confirmations when needed

## Best Practices

:::tip[Production Recommendation]
Store user confirmation preferences to avoid repeated prompts for the same action type. For example, if a user approves "delete temporary files" once, cache that preference for similar low-risk deletions in the same session.
:::

### For Developers

1. **Mark tools conservatively** - If an operation could cause problems, require confirmation
2. **Clear prompts** - Ensure users understand exactly what will happen
3. **Test confirmation flow** - Verify it works smoothly in your UI
4. **Log approvals** - Keep audit trail of user decisions
5. **Handle denials gracefully** - Allow users to try alternative approaches

### What to Mark as Requiring Confirmation

✅ **Do require confirmation**:

- File deletions
- Database writes/deletes
- Sending emails or messages
- Making purchases or payments
- Modifying production systems

❌ **Don't require confirmation**:

- Read-only operations
- Answering questions
- Generating content
- Searching/fetching data

## Related Features

- [Guardrails Middleware](./guardrails.md) - Content filtering and safety checks
- [Custom Tools](../sdk/custom-tools.md) - Building your own tools with HITL
- [Middleware Architecture](../middleware.md) - Advanced request interception

## Migration Notes

If upgrading from versions before v7.39.0:

1. Review all existing tools for risk assessment
2. Add `requiresConfirmation: true` to risky tools
3. Implement confirmation dialog in your UI
4. Test with low-risk tools first
5. Roll out to production gradually

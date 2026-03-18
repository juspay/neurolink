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
// 1. Tool execution pauses
// 2. Returns USER_CONFIRMATION_REQUIRED error
// 3. Application shows confirmation dialog
// 4. On approval, tool executes with confirmation_received = true
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

// (1)! Listen for confirmation requests
neurolink.on("hitl:confirmation-request", async (event) => {
  const {
    confirmationId,
    toolName,
    arguments: args,
    timeoutMs,
  } = event.payload;

  // (2)! Show your app's confirmation UI
  const approved = await showConfirmationDialog({
    action: toolName,
    details: args,
    message: `AI wants to ${toolName}. Allow?`,
    timeoutMs,
  });

  // (3)! Send response back to NeuroLink
  neurolink.emit("hitl:confirmation-response", {
    type: "hitl:confirmation-response",
    payload: {
      confirmationId, // (4)! Must match the request
      approved, // (5)! User decision
      reason: approved ? undefined : "User denied permission",
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now(), // Track response speed
      },
    },
  });
});

// (6)! Handle confirmation timeouts
neurolink.on("hitl:timeout", (event) => {
  console.warn(`Confirmation timed out for ${event.payload.toolName}`);
});
```

1. Event-based confirmation workflow - NeuroLink emits requests, your app handles them
2. Show confirmation UI with tool details and countdown timer
3. Respond using event emitter with confirmation ID
4. Confirmation ID links the response to the specific request
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

1. **AI requests tool execution** → Tool executor checks if tool requires confirmation
2. **Confirmation required?** → Returns `USER_CONFIRMATION_REQUIRED` error to LLM
3. **LLM asks user** → "I need to [action]. Is that okay?"
4. **User responds**:
   - **Approve** → UI sets `confirmation_received = true` and retries tool execution
   - **Deny** → UI sends "User cancelled" message back to LLM
5. **Tool executes** → Permission flag immediately resets to `false`

### Security Features

- **One-time permissions**: Each approval works for exactly one action
- **No reuse**: AI cannot reuse old permissions for new actions
- **Automatic reset**: Permission flag clears immediately after use
- **Fail-safe**: Defaults to requiring permission when in doubt

## API Reference

### Event Types

**Confirmation Request Event** (`hitl:confirmation-request`):

```typescript
neurolink.on("hitl:confirmation-request", (event) => {
  event.payload: {
    confirmationId: string;      // Unique ID for this request
    toolName: string;            // Tool requiring confirmation
    arguments: unknown;          // Tool parameters for review
    actionType: string;          // Human-readable description
    timeoutMs: number;           // Milliseconds until timeout
    allowModification: boolean;  // Can user edit arguments?
    metadata: { ... }            // Session/user context
  }
});
```

**Confirmation Response** (emit from your app):

```typescript
neurolink.emit("hitl:confirmation-response", {
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
neurolink.on("hitl:timeout", (event) => {
  event.payload: {
    confirmationId: string;
    toolName: string;
    timeout: number;
  }
});
```

See [human-in-the-loop.md](../human-in-the-loop.md) for complete technical documentation.

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
neurolink.on("hitl:confirmation-request", async (event) => {
  const { confirmationId } = event.payload; // (1)!

  const approved = await showConfirmationDialog(event.payload);

  // (2)! Send response with EXACT confirmationId from request
  neurolink.emit("hitl:confirmation-response", {
    type: "hitl:confirmation-response",
    payload: {
      confirmationId, // (3)! Must match request exactly
      approved,
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime: Date.now(),
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
neurolink.on("hitl:confirmation-request", async (event) => {
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

For comprehensive technical documentation, diagrams, and security details, see the [complete HITL guide](../human-in-the-loop.md).

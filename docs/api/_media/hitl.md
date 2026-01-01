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

!!! warning "Security Best Practice"
Only use HITL for truly risky operations. Overusing confirmation prompts degrades user experience and can lead to "confirmation fatigue" where users approve actions without reading them.

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

```typescript
// When tool requires confirmation
if (error.code === "USER_CONFIRMATION_REQUIRED") {
  // (1)!
  const approved = await showConfirmationDialog({
    // (2)!
    action: tool.name,
    details: tool.args,
    message: "AI wants to perform this action. Allow?",
  });

  if (approved) {
    setUserConfirmation(true); // (3)!
    const result = await executeTool(tool); // (4)!
    setUserConfirmation(false); // (5)!
    return result;
  } else {
    return { cancelled: true, reason: "User denied permission" }; // (6)!
  }
}
```

1. Catch the special error code when tool needs user approval
2. Show your app's confirmation UI with action details
3. Grant one-time permission flag
4. Retry tool execution now that permission is granted
5. **Critical**: Reset flag immediately to prevent reuse
6. Return cancellation message to inform the AI

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

### SDK Methods

- `setUserConfirmation(approved: boolean)` → Grants/revokes one-time permission
- `executeTool(name, args)` → Executes tool with HITL checkpoint

See [HUMAN-IN-THE-LOOP.md](../HUMAN-IN-THE-LOOP.md) for complete technical documentation.

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

**Cause**: `confirmation_received` flag not being reset after execution
**Solution**:

```typescript
// Always reset the flag after tool execution
setUserConfirmation(true); // (1)!
await executeTool(); // (2)!
setUserConfirmation(false); // (3)!
```

1. Grant temporary permission
2. Execute the tool while permission is active
3. **Immediately** revoke permission to prevent AI reuse

### Problem: Confirmation dialog doesn't show

**Cause**: UI not handling `USER_CONFIRMATION_REQUIRED` error
**Solution**:

```typescript
// Catch and handle confirmation errors
try {
  await executeTool(toolName, args);
} catch (error) {
  if (error.code === "USER_CONFIRMATION_REQUIRED") {
    // Show your confirmation UI
    await handleConfirmationPrompt(error);
  }
}
```

## Best Practices

!!! tip "Production Recommendation"
Store user confirmation preferences to avoid repeated prompts for the same action type. For example, if a user approves "delete temporary files" once, cache that preference for similar low-risk deletions in the same session.

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
- [Middleware Architecture](../MIDDLEWARE.md) - Advanced request interception

## Migration Notes

If upgrading from versions before v7.39.0:

1. Review all existing tools for risk assessment
2. Add `requiresConfirmation: true` to risky tools
3. Implement confirmation dialog in your UI
4. Test with low-risk tools first
5. Roll out to production gradually

For comprehensive technical documentation, diagrams, and security details, see the [complete HITL guide](../HUMAN-IN-THE-LOOP.md).

---
title: Redis Conversation History Export
description: Export complete session history as JSON for analytics, debugging, and compliance auditing
keywords: redis, conversation export, session history, analytics, debugging, audit trail, compliance
---

# Redis Conversation History Export

> **Since**: v7.38.0 | **Status**: Stable | **Availability**: SDK + CLI

## Overview

**What it does**: Export complete conversation session history from Redis storage as JSON for analytics, debugging, and compliance auditing.

**Why use it**: Access structured conversation data for analysis, user behavior insights, quality assurance, and debugging failed sessions. Essential for production observability.

**Common use cases**:

- Debugging failed or problematic conversations
- Analytics and user behavior analysis
- Compliance and audit trail generation
- Quality assurance and model evaluation
- Training data collection for fine-tuning

## Quick Start

:::warning[Redis Required]
Conversation history export **only works with Redis storage**. In-memory storage does not support export functionality. Configure Redis before enabling conversation memory.
:::

### SDK Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis", // Required for export functionality
  },
});

// Have a conversation
await neurolink.generate({
  prompt: "What is machine learning?",
  context: { sessionId: "session-123" },
});

// Get the conversation history
const history = await neurolink.getConversationHistory("session-123");
// Returns: Promise<ChatMessage[]>

console.log(history);
// [
//   { role: "user", content: "What is machine learning?" },
//   { role: "assistant", content: "..." }
// ]

// Clear a specific session
const cleared = await neurolink.clearConversationSession("session-123");
// Returns: Promise<boolean>

// Clear all conversations
await neurolink.clearAllConversations();
// Returns: Promise<void>
```

### CLI Example

> **Planned Feature**
>
> The `neurolink memory` CLI subcommand is planned for a future release.
> The commands shown below represent the intended interface once implemented.

```bash
# Enable Redis-backed conversation memory
npx @juspay/neurolink loop --enable-conversation-memory --store redis

# Have a conversation (session ID auto-generated)
> Tell me about AI
[AI response...]

# Export conversation history
npx @juspay/neurolink memory export --session-id <SESSION_ID> --format json > conversation.json

# Or export all sessions
npx @juspay/neurolink memory export-all --output ./exports/
```

## Configuration

| Option            | Type              | Default  | Required | Description                    |
| ----------------- | ----------------- | -------- | -------- | ------------------------------ |
| `sessionId`       | `string`          | -        | Yes      | Unique session identifier      |
| `format`          | `"json" \| "csv"` | `"json"` | No       | Export format                  |
| `includeMetadata` | `boolean`         | `true`   | No       | Include session metadata       |
| `startTime`       | `Date`            | -        | No       | Filter: export from this time  |
| `endTime`         | `Date`            | -        | No       | Filter: export until this time |

### Environment Variables

```bash
# Redis connection (required for export)
export REDIS_URL="redis://localhost:6379"
# or
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export REDIS_PASSWORD="your-password"  # if needed

# Conversation memory settings
export NEUROLINK_MEMORY_ENABLED="true"
export NEUROLINK_MEMORY_STORE="redis"
export NEUROLINK_MEMORY_MAX_TURNS_PER_SESSION="100"
```

### Config File

```typescript
// .neurolink.config.ts
export default {
  conversationMemory: {
    enabled: true,
    store: "redis", // Required for persistent history
    redis: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
    },
    maxTurnsPerSession: 100,
  },
};
```

## How It Works

### Data Flow

1. **Conversation occurs** → Each turn stored in Redis with session ID
2. **Export requested** → SDK/CLI queries Redis for session
3. **Data aggregated** → Turns assembled with metadata
4. **Format applied** → JSON or CSV serialization
5. **Output delivered** → File or console output

### Redis Storage Structure

```
neurolink:session:{sessionId}:turns → List of conversation turns
neurolink:session:{sessionId}:metadata → Session metadata
neurolink:sessions → Set of all active session IDs
```

### Data Schema (JSON Export)

```json
{
  "sessionId": "session-abc123",
  "userId": "user-456",
  "createdAt": "2025-09-30T10:00:00Z",
  "updatedAt": "2025-09-30T10:15:00Z",
  "turns": [
    {
      "index": 0,
      "role": "user",
      "content": "What is NeuroLink?",
      "timestamp": "2025-09-30T10:00:00Z"
    },
    {
      "index": 1,
      "role": "assistant",
      "content": "NeuroLink is an enterprise AI development platform...",
      "timestamp": "2025-09-30T10:00:05Z",
      "model": "gpt-4",
      "provider": "openai",
      "tokens": { "prompt": 12, "completion": 45 }
    }
  ],
  "metadata": {
    "provider": "openai",
    "model": "gpt-4",
    "totalTurns": 2,
    "toolsUsed": ["web-search", "calculator"]
  }
}
```

## Advanced Usage

### Retrieve Session History

```typescript
// Get conversation history for a specific session
const history = await neurolink.getConversationHistory("session-123");
// Returns: Promise<ChatMessage[]>

// Process the history
for (const message of history) {
  console.log(`${message.role}: ${message.content}`);
}
```

### Clear Session Data

```typescript
// Clear a specific session
const cleared = await neurolink.clearConversationSession("session-123");
if (cleared) {
  console.log("Session cleared successfully");
}

// Clear all conversations
await neurolink.clearAllConversations();
console.log("All conversations cleared");
```

### Export History to File

```typescript
// Get history and save to JSON file
const history = await neurolink.getConversationHistory("session-123");

await fs.writeFile(
  `./exports/session-123.json`,
  JSON.stringify(history, null, 2),
);
```

### Integration with Analytics Pipeline

:::tip[Analytics Integration]
Pipe exported conversation data directly to your analytics dashboards for user behavior insights, quality metrics, and model performance tracking. Combine with [Auto Evaluation](auto-evaluation.md) for comprehensive quality monitoring.
:::

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { analyticsService } from "./analytics";

// After each conversation session ends
async function processSession(sessionId: string) {
  // Get conversation history
  const history = await neurolink.getConversationHistory(sessionId);

  // Send to analytics
  await analyticsService.track("conversation_completed", {
    sessionId,
    turnCount: history.length,
    messages: history,
  });

  // Archive to data warehouse
  await dataWarehouse.store("conversations", { sessionId, messages: history });

  // Optionally clear the session after archiving
  await neurolink.clearConversationSession(sessionId);
}
```

## API Reference

### SDK Methods

```typescript
// Get conversation history for a session
const history = await neurolink.getConversationHistory(sessionId);
// Returns: Promise<ChatMessage[]>

// Clear a specific session
const cleared = await neurolink.clearConversationSession(sessionId);
// Returns: Promise<boolean>

// Clear all conversations
await neurolink.clearAllConversations();
// Returns: Promise<void>
```

### CLI Commands

> **Planned Feature**
>
> The `neurolink memory` CLI subcommand is planned for a future release.
> The commands shown below represent the intended interface once implemented.

- `neurolink memory export --session-id <ID>` → Export single session (planned)
- `neurolink memory export-all` → Export all sessions (planned)
- `neurolink memory list` → List active sessions (planned)
- `neurolink memory delete --session-id <ID>` → Delete session (planned)

See [conversation-memory.md](../conversation-memory.md) for complete memory system documentation.

## Troubleshooting

### Problem: getConversationHistory returns empty array

**Cause**: Session ID doesn't exist or Redis not configured
**Solution**:

```bash
# Verify Redis connection
redis-cli ping  # Should return PONG

# Check environment variables
echo $REDIS_URL
```

```typescript
// Verify the session exists before retrieving
const history = await neurolink.getConversationHistory(sessionId);
if (history.length === 0) {
  console.log("No messages found for session:", sessionId);
}
```

### Problem: Redis connection failed

**Cause**: Redis server not running or incorrect credentials
**Solution**:

```bash
# Start Redis locally
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:latest

# Test connection
redis-cli -h localhost -p 6379 ping
```

### Problem: Need additional metadata with history

**Cause**: `getConversationHistory` returns only message array
**Solution**:

```typescript
// Add your own metadata when archiving
const history = await neurolink.getConversationHistory("session-123");
const enrichedHistory = {
  sessionId: "session-123",
  messages: history,
  exportedAt: new Date().toISOString(),
  messageCount: history.length,
};
```

### Problem: Memory command not found in CLI

**Cause**: The `neurolink memory` subcommand is a planned feature
**Solution**:

The CLI memory subcommand is planned for a future release. In the meantime, use the SDK methods directly:

```typescript
// Use SDK methods for conversation history management
const history = await neurolink.getConversationHistory(sessionId);
await neurolink.clearConversationSession(sessionId);
await neurolink.clearAllConversations();
```

## Best Practices

### Data Retention

1. **Set TTL on sessions** - Auto-delete old conversations

```typescript
config: {
  conversationMemory: {
    redis: {
      ttl: 7 * 24 * 60 * 60,  // 7 days in seconds
    },
  },
}
```

2. **Archive regularly** - Export to long-term storage

```typescript
// Archive a session before clearing
async function archiveSession(sessionId: string) {
  const history = await neurolink.getConversationHistory(sessionId);
  await s3.upload(`archives/${sessionId}.json`, JSON.stringify(history));
  await neurolink.clearConversationSession(sessionId); // Clean up
}
```

### Privacy & Compliance

```typescript
// Redact PII before archiving
async function archiveWithRedaction(sessionId: string) {
  const history = await neurolink.getConversationHistory(sessionId);

  // Redact sensitive data
  const redactedHistory = history.map((message) => ({
    ...message,
    content:
      typeof message.content === "string"
        ? redactPII(message.content) // Remove emails, phone numbers, etc.
        : message.content,
  }));

  return { sessionId, messages: redactedHistory };
}
```

### Session Cleanup

```typescript
// Clean up old sessions
async function cleanupSession(sessionId: string) {
  // Archive first if needed
  const history = await neurolink.getConversationHistory(sessionId);
  if (history.length > 0) {
    await archiveToStorage(sessionId, history);
  }

  // Clear the session
  const cleared = await neurolink.clearConversationSession(sessionId);
  console.log(`Session ${sessionId} cleared: ${cleared}`);
}

// Clear all conversations (use with caution)
async function clearAllData() {
  await neurolink.clearAllConversations();
  console.log("All conversations cleared");
}
```

## Use Cases

### Quality Assurance

```typescript
// Review conversations for specific sessions
const failedSessions = await db.query(
  "SELECT session_id FROM sessions WHERE error IS NOT NULL",
);

for (const { session_id } of failedSessions) {
  const history = await neurolink.getConversationHistory(session_id);

  // Analyze why conversation failed
  analyzeFailure({ sessionId: session_id, messages: history });
}
```

### Session Review

```typescript
// Review a specific session's conversation
async function reviewSession(sessionId: string) {
  const history = await neurolink.getConversationHistory(sessionId);

  const report = {
    sessionId,
    messageCount: history.length,
    messages: history.map((msg) => ({
      role: msg.role,
      contentPreview:
        typeof msg.content === "string"
          ? msg.content.substring(0, 100)
          : "[complex content]",
    })),
  };

  console.table(report.messages);
  return report;
}
```

## Related Features

- [CLI Loop Sessions](./cli-loop-sessions.md) - Persistent conversation mode
- [Conversation Memory](../conversation-memory.md) - Full memory system docs
- [Mem0 Integration](../mem0-integration.md) - Semantic memory with vectors
- [Analytics Integration](../advanced/analytics.md) - Track conversation metrics

## Migration Notes

If upgrading from in-memory to Redis-backed storage:

1. Enable Redis in configuration
2. Existing in-memory sessions will be lost (not migrated)
3. New sessions automatically stored in Redis
4. Export functionality only works with Redis store
5. Consider gradual rollout with feature flag

For complete conversation memory system documentation, see [conversation-memory.md](../conversation-memory.md).

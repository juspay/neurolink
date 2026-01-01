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

!!! warning "Redis Required"
Conversation history export **only works with Redis storage**. In-memory storage does not support export functionality. Configure Redis before enabling conversation memory.

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

// Export the conversation history
const history = await neurolink.exportConversationHistory({
  sessionId: "session-123",
  format: "json",
});

console.log(history);
// {
//   sessionId: "session-123",
//   turns: [
//     { role: "user", content: "What is machine learning?", timestamp: "..." },
//     { role: "assistant", content: "...", timestamp: "..." }
//   ],
//   metadata: { ... }
// }
```

### CLI Example

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

### Export with Time Filtering

```typescript
// Export conversations from last 24 hours
const history = await neurolink.exportConversationHistory({
  sessionId: "session-123",
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endTime: new Date(),
});
```

### Batch Export All Sessions

```typescript
// Get all active session IDs
const sessions = await neurolink.getActiveSessions();

// Export each session
for (const sessionId of sessions) {
  const history = await neurolink.exportConversationHistory({
    sessionId,
    format: "json",
  });

  await fs.writeFile(
    `./exports/${sessionId}.json`,
    JSON.stringify(history, null, 2),
  );
}
```

### Export to CSV for Analytics

```typescript
const history = await neurolink.exportConversationHistory({
  sessionId: "session-123",
  format: "csv",
});

// CSV format:
// index,role,content,timestamp,model,provider,tokens_prompt,tokens_completion
// 0,user,"What is AI?",2025-09-30T10:00:00Z,,,
// 1,assistant,"AI is...",2025-09-30T10:00:05Z,gpt-4,openai,12,45
```

### Integration with Analytics Pipeline

!!! tip "Analytics Integration"
Pipe exported conversation data directly to your analytics dashboards for user behavior insights, quality metrics, and model performance tracking. Combine with [Auto Evaluation](auto-evaluation.md) for comprehensive quality monitoring.

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { analyticsService } from "./analytics";

// After each conversation session ends
async function processSession(sessionId: string) {
  // Export conversation
  const history = await neurolink.exportConversationHistory({
    sessionId,
    includeMetadata: true,
  });

  // Send to analytics
  await analyticsService.track("conversation_completed", {
    sessionId: history.sessionId,
    turnCount: history.turns.length,
    duration: new Date(history.updatedAt) - new Date(history.createdAt),
    models: history.metadata.models,
    success: history.metadata.error == null,
  });

  // Archive to data warehouse
  await dataWarehouse.store("conversations", history);
}
```

## API Reference

### SDK Methods

- `exportConversationHistory(options)` → Returns conversation history object
- `getActiveSessions()` → Returns array of active session IDs
- `deleteConversationHistory(sessionId)` → Deletes session from Redis

### CLI Commands

- `neurolink memory export --session-id <ID>` → Export single session
- `neurolink memory export-all` → Export all sessions
- `neurolink memory list` → List active sessions
- `neurolink memory delete --session-id <ID>` → Delete session

See [CONVERSATION-MEMORY.md](../CONVERSATION-MEMORY.md) for complete memory system documentation.

## Troubleshooting

### Problem: Export returns empty history

**Cause**: Session ID doesn't exist or Redis not configured
**Solution**:

```bash
# Verify Redis connection
redis-cli ping  # Should return PONG

# List all sessions
npx @juspay/neurolink memory list

# Check environment variables
echo $REDIS_URL
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

### Problem: Exported data missing metadata

**Cause**: `includeMetadata` set to false
**Solution**:

```typescript
const history = await neurolink.exportConversationHistory({
  sessionId: "session-123",
  includeMetadata: true, // ← Enable metadata
});
```

### Problem: Export command not found in CLI

**Cause**: Using older version without export feature
**Solution**:

```bash
# Update to latest version
npm install @juspay/neurolink@latest

# Verify version has export feature (v7.38.0+)
npx @juspay/neurolink --version
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
// Daily archive cron job
async function dailyArchive() {
  const sessions = await neurolink.getActiveSessions();
  for (const id of sessions) {
    const history = await neurolink.exportConversationHistory({
      sessionId: id,
    });
    await s3.upload(`archives/${id}.json`, history);
    await neurolink.deleteConversationHistory(id); // Clean up
  }
}
```

### Privacy & Compliance

```typescript
// Redact PII before export
async function exportWithRedaction(sessionId: string) {
  const history = await neurolink.exportConversationHistory({ sessionId });

  // Redact sensitive data
  history.turns = history.turns.map((turn) => ({
    ...turn,
    content: redactPII(turn.content), // Remove emails, phone numbers, etc.
  }));

  return history;
}
```

### Performance Optimization

```typescript
// For large sessions, use pagination
async function exportLargeSession(sessionId: string) {
  const chunkSize = 100;
  let offset = 0;
  const allTurns = [];

  while (true) {
    const chunk = await neurolink.exportConversationHistory({
      sessionId,
      limit: chunkSize,
      offset,
    });

    if (chunk.turns.length === 0) break;

    allTurns.push(...chunk.turns);
    offset += chunkSize;
  }

  return { sessionId, turns: allTurns };
}
```

## Use Cases

### Quality Assurance

```typescript
// Export failed conversations for review
const failedSessions = await db.query(
  "SELECT session_id FROM sessions WHERE error IS NOT NULL",
);

for (const { session_id } of failedSessions) {
  const history = await neurolink.exportConversationHistory({
    sessionId: session_id,
  });

  // Analyze why conversation failed
  analyzeFailure(history);
}
```

### Model Evaluation

```typescript
// Compare model performance across sessions
const sessions = await neurolink.getActiveSessions();

const report = await Promise.all(
  sessions.map(async (sessionId) => {
    const history = await neurolink.exportConversationHistory({ sessionId });
    return {
      sessionId,
      model: history.metadata.model,
      avgResponseTime: calculateAvgResponseTime(history.turns),
      userSatisfaction: history.metadata.rating,
    };
  }),
);

console.table(report);
```

## Related Features

- [CLI Loop Sessions](./cli-loop-sessions.md) - Persistent conversation mode
- [Conversation Memory](../CONVERSATION-MEMORY.md) - Full memory system docs
- [Mem0 Integration](../MEM0_INTEGRATION.md) - Semantic memory with vectors
- [Analytics Integration](../advanced/analytics.md) - Track conversation metrics

## Migration Notes

If upgrading from in-memory to Redis-backed storage:

1. Enable Redis in configuration
2. Existing in-memory sessions will be lost (not migrated)
3. New sessions automatically stored in Redis
4. Export functionality only works with Redis store
5. Consider gradual rollout with feature flag

For complete conversation memory system documentation, see [CONVERSATION-MEMORY.md](../CONVERSATION-MEMORY.md).

# NeuroLink Conversation Memory

NeuroLink provides conversation memory for maintaining context across interactions.

## Enable Memory

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
  },
});
```

## Basic Usage

```typescript
// First message
const result1 = await neurolink.generate({
  input: { text: "My name is Alice" },
  context: {
    conversationId: "conv-123",
    userId: "user-456",
  },
});

// Follow-up (remembers context)
const result2 = await neurolink.generate({
  input: { text: "What is my name?" },
  context: {
    conversationId: "conv-123",
    userId: "user-456",
  },
});

console.log(result2.content); // "Your name is Alice"
```

## Memory Configuration

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,

    // Session limits
    maxSessions: 50, // Max concurrent sessions

    // Summarization
    enableSummarization: true, // Summarize long conversations
    tokenThreshold: 4000, // Trigger summarization threshold
    summarizationProvider: "openai",
    summarizationModel: "gpt-4o-mini",
  },
});
```

## Redis Storage (Production)

For production, use Redis for distributed memory:

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    redisConfig: {
      url: "redis://localhost:6379",
      // or
      host: "localhost",
      port: 6379,
      password: "your-password",
      db: 0,

      // Optional
      tls: true,
      keyPrefix: "neurolink:",
    },
  },
});
```

## Session Management

### Get Conversation History

```typescript
const history = await neurolink.getConversationHistory("conv-123");
console.log(history);
// [
//   { role: 'user', content: 'My name is Alice', timestamp: '...' },
//   { role: 'assistant', content: 'Nice to meet you, Alice!', timestamp: '...' }
// ]
```

### Get Conversation Stats

```typescript
const stats = await neurolink.getConversationStats();
console.log(stats);
// {
//   activeSessions: 5,
//   totalMessages: 127,
//   totalTokensUsed: 45000
// }
```

## Context Object

```typescript
interface ConversationContext {
  conversationId?: string; // Group messages into conversation
  userId?: string; // User identifier
  sessionId?: string; // Session identifier
  metadata?: {
    userRole?: string;
    tags?: string[];
    customData?: Record<string, unknown>;
  };
}
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  context: {
    conversationId: "support-ticket-789",
    userId: "customer@example.com",
    sessionId: "session-abc",
    metadata: {
      userRole: "premium",
      tags: ["support", "billing"],
      customData: { ticketId: "T-789" },
    },
  },
});
```

## Three-Layer Memory System

NeuroLink implements a three-layer memory architecture:

### 1. Conversation History (Short-term)

- Recent messages in current thread
- Scoped to conversation/session
- Automatic management

### 2. Semantic Recall (Medium-term)

- Vector-based retrieval
- Resource-scoped memory
- Relevant past interactions

### 3. Working Memory (Long-term)

- Structured user profile
- Persistent preferences
- Cross-session context

```typescript
// Enable full memory system
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    enableSummarization: true,

    // Mem0 integration for semantic memory
    mem0Enabled: true,
    mem0Config: {
      apiKey: process.env.MEM0_API_KEY,
    },
  },
});
```

## CLI Usage

```bash
# Interactive loop with memory
neurolink loop

# Resume specific conversation
neurolink loop --resume conv-123

# List conversations
neurolink loop --list-conversations

# Force new conversation
neurolink loop --new

# Memory commands
neurolink memory stats
neurolink memory history conv-123
neurolink memory clear conv-123
```

## Loop Mode Commands

Inside interactive loop:

```
help                  # Show commands
set provider openai   # Set provider
set temperature 0.8   # Set temperature
get provider          # Get current setting
history               # Show conversation history
clear                 # Clear current session
exit                  # Exit loop
```

## Summarization

Long conversations are automatically summarized:

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    enableSummarization: true,
    tokenThreshold: 4000, // Summarize when exceeded
    summarizationProvider: "openai",
    summarizationModel: "gpt-4o-mini",
  },
});
```

When token count exceeds threshold:

1. Older messages are summarized
2. Summary is stored as a system message
3. Original messages are archived
4. New messages continue normally

## Message Format

```typescript
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string; // ISO 8601
  metadata?: {
    timestamp?: number;
    [key: string]: unknown;
  };
}
```

## Session Memory Structure

```typescript
interface SessionMemory {
  sessionId: string;
  userId?: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: number; // Unix ms
  lastActivity: number; // Unix ms
  summarizedUpToMessageId?: string;
  summarizedMessage?: string;
  tokenThreshold?: number;
  lastTokenCount?: number;
  metadata?: {
    userRole?: string;
    tags?: string[];
    customData?: Record<string, unknown>;
  };
}
```

## Error Handling

```typescript
try {
  const history = await neurolink.getConversationHistory("conv-123");
} catch (error) {
  if ((error as ConversationMemoryError).code === "STORAGE_ERROR") {
    console.log("Failed to retrieve conversation from storage");
  } else if ((error as ConversationMemoryError).code === "CONFIG_ERROR") {
    console.error("Conversation memory not properly configured");
  }
}
```

## Best Practices

1. **Use consistent IDs**: Same `conversationId` for related messages
2. **Set user context**: Include `userId` for user-specific memory
3. **Enable Redis in production**: For persistence and scalability
4. **Configure summarization**: Prevent context overflow
5. **Clean up old sessions**: Implement session expiration

## Next Steps

- CLI reference - Interactive loop commands
- Advanced features - HITL, workflows
- Providers - Provider configuration

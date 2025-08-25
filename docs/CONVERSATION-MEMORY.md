# Conversation Memory

NeuroLink's Conversation Memory feature enables AI models to maintain context across multiple turns within a session, creating more natural and coherent conversations.

## 🧠 Overview

The conversation memory system provides:

- **Session-based memory**: Each conversation session maintains its own context
- **Turn-by-turn persistence**: AI remembers previous messages within a session
- **Automatic cleanup**: Configurable limits to prevent memory bloat
- **Session isolation**: Different sessions don't interfere with each other
- **In-memory storage**: Fast, lightweight storage for conversation history
- **Universal Method Support**: Works seamlessly with both `generate()` and `stream()` methods
- **Stream Integration**: Full conversation memory support for streaming responses

## ⚙️ Configuration

### Environment Variables

```bash
# Enable/disable conversation memory
NEUROLINK_MEMORY_ENABLED=true

# Maximum number of sessions to keep in memory
NEUROLINK_MEMORY_MAX_SESSIONS=50

# Maximum number of turns per session
NEUROLINK_MEMORY_MAX_TURNS_PER_SESSION=50
```

### Programmatic Configuration

```javascript
import { NeuroLink } from "neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    maxSessions: 10,
    maxTurnsPerSession: 20,
  },
});
```

## 🚀 Usage Examples

### Basic Usage with Session ID

```javascript
import { NeuroLink } from "neurolink";

const neurolink = new NeuroLink({
  conversationMemory: { enabled: true },
});

// First message in session
const response1 = await neurolink.generate({
  prompt: "My name is Alice and I love reading books",
  context: {
    sessionId: "user-123",
    userId: "alice",
  },
});

// Follow-up message - AI will remember previous context
const response2 = await neurolink.generate({
  prompt: "What is my favorite hobby?",
  context: {
    sessionId: "user-123",
    userId: "alice",
  },
});
// Response: "Based on what you told me, your favorite hobby is reading books!"
```

### Streaming Support

The conversation memory system now fully supports streaming responses with the same memory persistence:

```javascript
import { NeuroLink } from "neurolink";

const neurolink = new NeuroLink({
  conversationMemory: { enabled: true },
});

// Stream a response - memory is AUTOMATICALLY captured in background!
const streamResult = await neurolink.stream({
  input: { text: "My favorite hobby is photography" },
  provider: "vertex",
  context: {
    sessionId: "photo-session",
    userId: "photographer",
  },
});

// OPTIONAL: Consume the stream for real-time display
// Memory is saved automatically regardless of whether you consume the stream
let response = "";
for await (const chunk of streamResult.stream) {
  response += chunk.content;
  process.stdout.write(chunk.content); // Real-time display
}

// Memory works even without consuming the stream!
// Both user input AND AI response are automatically stored

// Follow-up message will remember the streamed conversation
const followUp = await neurolink.generate({
  input: { text: "What hobby did I mention?" },
  provider: "vertex",
  context: {
    sessionId: "photo-session", // Same session
    userId: "photographer",
  },
});
// Response: "You mentioned that your favorite hobby is photography!"
```

### Mixed Generate/Stream Conversations

You can seamlessly mix `generate()` and `stream()` calls within the same conversation:

```javascript
// Start with generate
await neurolink.generate({
  input: { text: "I work as a software engineer" },
  context: { sessionId: "career-chat" },
});

// Continue with stream
const streamResult = await neurolink.stream({
  input: { text: "I specialize in AI development" },
  context: { sessionId: "career-chat" },
});

// Back to generate - AI remembers both previous messages
const summary = await neurolink.generate({
  input: { text: "Summarize what you know about my career" },
  context: { sessionId: "career-chat" },
});
// Response includes both software engineering and AI development details
```

### Session Isolation Example

```javascript
// Session 1
await neurolink.generate({
  prompt: "My favorite color is blue",
  context: { sessionId: "session-1" },
});

// Session 2 - completely isolated
await neurolink.generate({
  prompt: "What is my favorite color?",
  context: { sessionId: "session-2" },
});
// Response: "I don't have information about your favorite color..."
```

## 📊 Memory Management

### Turn Limits

When the number of conversation turns exceeds `maxTurnsPerSession`, older messages are automatically removed:

```javascript
// With maxTurnsPerSession: 3
// Turn 1: User + AI response (2 messages)
// Turn 2: User + AI response (4 messages total)
// Turn 3: User + AI response (6 messages total)
// Turn 4: User + AI response (6 messages - oldest turn removed)
```

### Session Limits

When the number of active sessions exceeds `maxSessions`, the least recently used sessions are removed:

```javascript
// With maxSessions: 2
// Session 1: Active
// Session 2: Active
// Session 3: Created -> Session 1 (least recent) is removed
```

## 🔌 API Reference

### Memory Statistics

```javascript
// Get memory usage statistics
const stats = await neurolink.getConversationStats();
console.log(stats);
// Output: { totalSessions: 3, totalTurns: 15 }
```

### Session Management

```javascript
// Clear specific session
const cleared = await neurolink.clearConversationSession("session-123");
console.log(cleared); // true if session existed and was cleared

// Clear all conversations
await neurolink.clearAllConversations();
```

## 🧪 Test Results

The conversation memory system has been thoroughly tested and validated:

### ✅ Test Suite Results

| Test Case             | Status  | Description                                     |
| --------------------- | ------- | ----------------------------------------------- |
| **Basic Memory**      | ✅ PASS | AI correctly remembers information across turns |
| **Session Isolation** | ✅ PASS | Sessions remain completely separate             |
| **Turn Limits**       | ✅ PASS | Automatic cleanup when limits exceeded          |
| **Session Limits**    | ✅ PASS | LRU eviction of old sessions                    |
| **API Functions**     | ✅ PASS | Clear operations work correctly                 |

### Example Test Output

```
🧪 NeuroLink Conversation Memory - Quick Test

📋 TEST 1: Basic Memory Functionality
----------------------------------------
👤 User: My name is Alice
🤖 AI: Hello Alice! It's nice to meet you. How can I help you today?

👤 User: What is my name?
🤖 AI: Your name is Alice! You introduced yourself to me in your previous message.
✅ Memory Test: PASS - Remembers name correctly

📋 TEST 2: Session Isolation
----------------------------------------
👤 User (different session): Do you know Alice?
🤖 AI: I don't know a specific person named Alice...
✅ Isolation Test: PASS - Sessions properly isolated

🎉 OVERALL: ✅ ALL TESTS PASSED
```

## 💡 Best Practices

### 1. Session ID Strategy

```javascript
// Use consistent session IDs for the same conversation
const sessionId = `user-${userId}-${conversationId}`;

// Include user ID for better tracking
const context = {
  sessionId: sessionId,
  userId: userId,
};
```

### 2. Memory Limits

```javascript
// For chat applications
const chatConfig = {
  maxSessions: 100, // Support many users
  maxTurnsPerSession: 50, // Long conversations
};

// For short interactions
const quickConfig = {
  maxSessions: 20, // Fewer concurrent users
  maxTurnsPerSession: 10, // Brief exchanges
};
```

### 3. Error Handling

```javascript
try {
  const response = await neurolink.generate({
    prompt: "Hello",
    context: { sessionId: "test-session" },
  });
} catch (error) {
  console.error("Generation failed:", error);
  // Memory operations are designed to fail gracefully
  // Generation will continue without memory if needed
}
```

## 🔧 Technical Implementation

### Architecture

```
┌─────────────────────┐
│   NeuroLink SDK     │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│ ConversationMemory  │
│     Manager         │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   In-Memory Store   │
│  (Map<Session, []>) │
└─────────────────────┘
```

### Message Format

```typescript
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Internal storage format
interface SessionMemory {
  sessionId: string;
  userId?: string;
  messages: ChatMessage[];
  createdAt: number;
  lastActivity: number;
}
```

## 🔍 Troubleshooting

### Common Issues

**Memory not persisting between calls**

- Ensure `sessionId` is consistent across calls
- Verify `conversationMemory.enabled` is true
- Check that `sessionId` is a valid string

**Performance issues with large conversations**

- Reduce `maxTurnsPerSession` limit
- Implement session cleanup strategies
- Monitor memory usage statistics

**Session isolation not working**

- Verify different `sessionId` values are being used
- Check for session ID conflicts or duplicates

### Debug Logging

```javascript
// Enable debug logging to see memory operations
const neurolink = new NeuroLink({
  conversationMemory: { enabled: true },
  debug: true, // Enables detailed logging
});
```

## 🔗 Related Documentation

- [API Reference](./API-REFERENCE.md) - Complete SDK documentation
- [Configuration](./CONFIGURATION.md) - Environment setup guide
- [Examples](./examples/) - More usage examples
- [Testing Guide](./TESTING.md) - How to test conversation memory

## 📈 Performance Characteristics

- **Memory Usage**: ~1KB per conversation turn
- **Lookup Time**: O(1) for session retrieval
- **Cleanup Time**: O(n) for session limit enforcement
- **Concurrency**: Thread-safe in-memory operations

The conversation memory system is designed for production use with efficient memory management and robust error handling.

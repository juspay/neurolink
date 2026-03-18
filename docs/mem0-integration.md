# NeuroLink Mem0 Memory Integration

## Overview

NeuroLink now includes advanced memory capabilities powered by Mem0, enabling AI conversations to remember context across sessions and maintain user-specific memory isolation. This integration provides semantic memory storage and retrieval using vector databases for long-term conversation continuity.

## Features

- ✅ **Cross-Session Memory**: Remember conversations across different sessions
- ✅ **User Isolation**: Separate memory contexts for different users
- ✅ **Semantic Search**: Vector-based memory retrieval using embeddings
- ✅ **Multiple Vector Stores**: Support for Qdrant, Chroma, and more
- ✅ **Streaming Integration**: Memory-aware streaming responses
- ✅ **Background Storage**: Non-blocking memory operations
- ✅ **Configurable Search**: Customize memory retrieval parameters

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NeuroLink     │    │      Mem0       │    │  Vector Store   │
│                 │───▶│                 │───▶│   (Qdrant)      │
│ generate()/     │    │ Memory Provider │    │                 │
│ stream()        │    │                 │    │ Embeddings +    │
└─────────────────┘    └─────────────────┘    │ Semantic Search │
                                              └─────────────────┘
```

## Configuration

### Basic Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    provider: "mem0",
    mem0Enabled: true,
    mem0Config: {
      vectorStore: {
        provider: "qdrant",
        type: "qdrant",
        collection: "neurolink_memories",
        dimensions: 768, // Must match your embedding model
        host: "localhost",
        port: 6333,
      },
      model: "gemini-2.0-flash-exp",
      llmProvider: "google",
      embeddings: {
        provider: "google",
        model: "text-embedding-004", // 768 dimensions
      },
      search: {
        maxResults: 5,
        timeoutMs: 50000,
      },
      storage: {
        timeoutMs: 30000,
      },
    },
  },
  providers: {
    google: {
      apiKey: process.env.GEMINI_API_KEY,
    },
  },
});
```

### Vector Store Options

#### Qdrant Configuration

```typescript
vectorStore: {
  provider: 'qdrant',
  type: 'qdrant',
  collection: 'my_memories',
  dimensions: 768,
  host: 'localhost',
  port: 6333,
  // OR use URL instead of host+port
  endpoint: 'http://localhost:6333'
}
```

#### Chroma Configuration

```typescript
vectorStore: {
  provider: 'chroma',
  type: 'chroma',
  collection: 'my_memories',
  dimensions: 768,
  host: 'localhost',
  port: 8000
}
```

### Embedding Provider Options

#### Google Embeddings (768 dimensions)

```typescript
embeddings: {
  provider: "google",
  model: "text-embedding-004"
}
```

#### OpenAI Embeddings (1536 dimensions)

```typescript
embeddings: {
  provider: "openai",
  model: "text-embedding-3-small"
}
```

## Usage Examples

### Basic Memory with Generate

```typescript
// First conversation - storing user preferences
const response1 = await neurolink.generate({
  input: {
    text: "Hi! I'm Alice, a frontend developer. I love React and JavaScript.",
  },
  context: {
    userId: "alice_123",
    sessionId: "session_1",
  },
  provider: "vertex",
  model: "claude-sonnet-4@20250514",
});

console.log(response1.content);
// AI introduces itself and acknowledges Alice's background

// Later conversation - memory retrieval
const response2 = await neurolink.generate({
  input: {
    text: "What programming languages do I work with?",
  },
  context: {
    userId: "alice_123", // Same user
    sessionId: "session_2", // Different session
  },
  provider: "vertex",
  model: "claude-sonnet-4@20250514",
});

console.log(response2.content);
// AI recalls: "You work with React and JavaScript"
```

### User Isolation Example

```typescript
// Alice's context
const aliceResponse = await neurolink.generate({
  input: {
    text: "I work at TechCorp as a senior frontend developer",
  },
  context: {
    userId: "alice_123",
    sessionId: "alice_session",
  },
});

// Bob's context (separate user)
const bobResponse = await neurolink.generate({
  input: {
    text: "I work at DataCorp as a machine learning engineer",
  },
  context: {
    userId: "bob_456", // Different user
    sessionId: "bob_session",
  },
});

// Bob queries his info - only sees his own memories
const bobQuery = await neurolink.generate({
  input: {
    text: "Where do I work and what's my role?",
  },
  context: {
    userId: "bob_456",
  },
});
// Returns: "DataCorp, machine learning engineer"
// Does NOT return Alice's TechCorp information
```

### Streaming with Memory Context

```typescript
// Create stream with memory-aware responses
const stream = await neurolink.stream({
  input: {
    text: "Tell me a story about a programmer",
  },
  context: {
    userId: "alice_123", // Alice's context
    sessionId: "story_session",
  },
  provider: "vertex",
  model: "gemini-2.5-flash",
  streaming: {
    enabled: true,
    enableProgress: true,
  },
});

// Process streaming chunks
let fullResponse = "";
for await (const chunk of stream.stream) {
  fullResponse += chunk.content;
  process.stdout.write(chunk.content);
}

// The story will be personalized based on Alice's
// previously stored context (React, JavaScript, TechCorp)
```

### Advanced Memory Search

```typescript
// Configure custom search parameters
const neurolink = new NeuroLink({
  conversationMemory: {
    // ... other config
    mem0Config: {
      // ... other config
      search: {
        maxResults: 10, // Retrieve more memories
        timeoutMs: 60000, // Longer timeout
        minScore: 0.3, // Minimum relevance score
      },
    },
  },
});
```

## Memory Storage Process

### Automatic Storage

Memory storage happens automatically after each conversation:

1. **Conversation Turn Creation**: Input + output combined
2. **Background Processing**: Memory stored asynchronously
3. **Vector Embedding**: Text converted to embeddings
4. **Storage**: Saved to vector database with user context
5. **Indexing**: Available for future retrieval

### Storage Format

```typescript
// Stored conversation turn structure
{
  messages: [
    { role: "user", content: "User's input text" },
    { role: "assistant", content: "AI's response" }
  ],
  metadata: {
    session_id: "session_123",
    user_id: "alice_123",
    timestamp: "2025-01-15T10:30:00Z",
    type: "conversation_turn"
  }
}
```

## Memory Retrieval Process

### Semantic Search Flow

1. **Query Processing**: User input analyzed for context
2. **Embedding Generation**: Query converted to vector
3. **Similarity Search**: Vector database search
4. **Relevance Filtering**: Results above threshold kept
5. **Context Injection**: Relevant memories added to prompt

### Context Enhancement

Retrieved memories are seamlessly integrated:

```typescript
// Original prompt
"What framework should I learn?"
// Enhanced with memory context
`Based on your background as a React developer at TechCorp who loves JavaScript:

What framework should I learn?

Relevant context from previous conversations:
- You're a senior frontend developer
- You work with React and JavaScript
- You're employed at TechCorp`;
```

## Testing Memory Integration

### Complete Test Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

async function testMemoryIntegration() {
  const neurolink = new NeuroLink({
    conversationMemory: {
      enabled: true,
      provider: "mem0",
      mem0Enabled: true,
      mem0Config: {
        vectorStore: {
          provider: "qdrant",
          type: "qdrant",
          collection: "test_memories",
          dimensions: 768,
          host: "localhost",
          port: 6333,
        },
        embeddings: {
          provider: "google",
          model: "text-embedding-004",
        },
      },
    },
    providers: {
      google: { apiKey: process.env.GEMINI_API_KEY },
    },
  });

  // Step 1: Store initial context
  console.log("Step 1: Storing user context...");
  await neurolink.generate({
    input: {
      text: "I'm a data scientist working with Python and PyTorch",
    },
    context: {
      userId: "test_user",
      sessionId: "session_1",
    },
  });

  // Wait for indexing
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 2: Test memory recall
  console.log("Step 2: Testing memory recall...");
  const response = await neurolink.generate({
    input: {
      text: "What programming language do I use?",
    },
    context: {
      userId: "test_user",
      sessionId: "session_2", // Different session
    },
  });

  console.log("AI Response:", response.content);
  // Should mention Python and PyTorch

  // Step 3: Test streaming with memory
  console.log("Step 3: Testing streaming with memory...");
  const stream = await neurolink.stream({
    input: {
      text: "Give me coding tips for my expertise area",
    },
    context: {
      userId: "test_user",
      sessionId: "session_3",
    },
    streaming: { enabled: true },
  });

  for await (const chunk of stream.stream) {
    process.stdout.write(chunk.content);
  }
  // Should provide Python/PyTorch specific tips
}

testMemoryIntegration();
```

## Performance Considerations

### Memory Storage

- **Background Processing**: Storage doesn't block response generation
- **Timeout Handling**: Configurable timeouts prevent hanging
- **Error Resilience**: Failures don't affect conversation flow

### Memory Retrieval

- **Fast Search**: Vector similarity search is typically <100ms
- **Result Limiting**: Configure `maxResults` to balance relevance vs performance
- **Caching**: Vector embeddings cached for efficiency

### Optimization Tips

```typescript
// Optimize for performance
mem0Config: {
  search: {
    maxResults: 3,        // Fewer results = faster search
    timeoutMs: 5000,      // Shorter timeout for responsiveness
    minScore: 0.5         // Higher threshold = more relevant results
  },
  storage: {
    timeoutMs: 10000      // Allow time for background storage
  }
}
```

## Error Handling

### Graceful Degradation

Memory failures don't break conversations:

```typescript
// If memory fails, conversation continues without context
try {
  const memories = await mem0.search(query, { user_id: userId });
  // Use memories to enhance context
} catch (error) {
  logger.warn("Memory retrieval failed, continuing without context", error);
  // Continue with original conversation
}
```

### Common Issues

#### Vector Dimension Mismatch

```
Error: Dimension mismatch: 1536 vs 768
```

**Solution**: Ensure embedding model dimensions match vector store config:

```typescript
// Google embeddings = 768 dimensions
embeddings: { provider: "google", model: "text-embedding-004" },
vectorStore: { dimensions: 768 }

// OpenAI embeddings = 1536 dimensions
embeddings: { provider: "openai", model: "text-embedding-3-small" },
vectorStore: { dimensions: 1536 }
```

#### Qdrant Configuration Conflicts

```
Error: Only one of `url`, `host` params can be set
```

**Solution**: Use either URL OR host+port, not both:

```typescript
// Option 1: Use URL
vectorStore: {
  endpoint: 'http://localhost:6333'
  // Don't set host/port
}

// Option 2: Use host+port
vectorStore: {
  host: 'localhost',
  port: 6333
  // Don't set endpoint
}
```

## Migration Guide

### From Basic to Memory-Enabled

```typescript
// Before: Basic NeuroLink
const neurolink = new NeuroLink({
  providers: {
    google: { apiKey: process.env.GEMINI_API_KEY },
  },
});

// After: Memory-enabled NeuroLink
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    provider: "mem0",
    mem0Enabled: true,
    mem0Config: {
      // Add memory configuration
    },
  },
  providers: {
    google: { apiKey: process.env.GEMINI_API_KEY },
  },
});
```

### Adding User Context

```typescript
// Before: No user context
await neurolink.generate({
  input: { text: "Hello" },
});

// After: With user context for memory
await neurolink.generate({
  input: { text: "Hello" },
  context: {
    userId: "user_123", // Required for memory
    sessionId: "session_1", // Optional, auto-generated if not provided
  },
});
```

## Best Practices

### 1. User ID Management

```typescript
// Use consistent, unique user identifiers
context: {
  userId: `user_${authenticatedUserId}`,
  sessionId: `session_${Date.now()}`
}
```

### 2. Memory Privacy

```typescript
// Ensure proper user isolation in multi-tenant applications
const getUserMemoryConfig = (tenantId: string) => ({
  vectorStore: {
    collection: `memories_${tenantId}`, // Separate collections per tenant
    // ... other config
  },
});
```

### 3. Performance Monitoring

```typescript
// Monitor memory operations
const startTime = Date.now();
const response = await neurolink.generate(options);
const memoryTime = Date.now() - startTime;
console.log(`Memory-enhanced response time: ${memoryTime}ms`);
```

### 4. Graceful Degradation

```typescript
// Always handle memory failures gracefully
const memoryConfig = {
  enabled: true,
  provider: "mem0",
  // Add fallback configuration
  fallbackOnError: true,
  maxRetries: 2,
};
```

## Troubleshooting

### Debug Mode

Enable debug logging for memory operations:

```typescript
// Set environment variable
process.env.NEUROLINK_DEBUG_MEMORY = "true";

// Or configure in code (development only)
const neurolink = new NeuroLink({
  conversationMemory: {
    // ... config
    debug: true, // Development only
  },
});
```

### Vector Store Health Check

```bash
# Check Qdrant status
curl -s http://localhost:6333/health

# List collections
curl -s http://localhost:6333/collections

# Check collection info
curl -s http://localhost:6333/collections/your_collection_name
```

### Memory Verification

```typescript
// Test memory storage and retrieval
async function verifyMemory(neurolink, userId) {
  // Store test data
  await neurolink.generate({
    input: { text: "Remember: I like pizza" },
    context: { userId },
  });

  // Wait for indexing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test retrieval
  const response = await neurolink.generate({
    input: { text: "What food do I like?" },
    context: { userId },
  });

  console.log("Memory test result:", response.content);
  // Should mention pizza
}
```

## Conclusion

The NeuroLink Mem0 integration provides powerful memory capabilities that enable truly conversational AI experiences. With proper configuration and usage patterns, you can build applications that remember user context across sessions while maintaining privacy and performance.

For additional support or advanced use cases, refer to the [Mem0 documentation](https://docs.mem0.ai/) and [NeuroLink examples](guides/examples/use-cases.md).

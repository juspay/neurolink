# Token-Based Conversation Memory Implementation Plan

**Date:** 2025-11-17
**Status:** Design Phase

---

## Problem Statement

### Critical Issues with Current Implementation

#### 1. **CRITICAL: Single Long Message Breaks System**

The current turn-based implementation **fails catastrophically** when a single message exceeds the token limit:

```typescript
// User sends a 60k token message
await neurolink.generate({
  input: { text: veryLongMessage }, // 60k tokens
  context: { sessionId: "session-1" }
});

// Current behavior:
// 1. Adds message to array (no validation)
// 2. Checks turn count: 1 turn < 20 turn threshold ✓
// 3. Sends 60k tokens to LLM → CONTEXT WINDOW ERROR ❌
```

**Root cause**: Turn-based logic only checks **number of turns**, not **actual token usage**.

**Real-world scenarios**:
- User pastes entire document as input
- Multi-paragraph questions
- Code snippets with extensive context
- PDF/image analysis with long OCR output

#### 2. Turn-Based Triggering Ignores Token Reality

```typescript
// Scenario A: 20 short messages (5k tokens total)
"Hi", "Hello", "How are you?", ...
// → Triggers summarization unnecessarily ❌

// Scenario B: 5 long messages (80k tokens total)
Long technical discussions with code examples...
// → No summarization, exceeds context window ❌
```

#### 3. Destructive Message Deletion

```typescript
// After summarization (line 184-187)
session.messages = [
  { role: "system", content: summary },
  ...last10Turns  // Only keeps 20 messages
];
// ❌ Deletes 30+ messages permanently
// ❌ Cannot audit full conversation
// ❌ Cannot re-summarize with better prompts
```

#### 4. No Per-Session Flexibility

- Quick Q&A session: Needs low limit (10k tokens)
- Technical support: Needs high limit (100k tokens)
- Current: **All sessions use same 20-turn threshold**

---

## Proposed Solution

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ SessionMemory                                                │
├─────────────────────────────────────────────────────────────┤
│ sessionId: "session-123"                                     │
│ messages: [                                                  │
│   { id: "V1StGX", role: "user", content: "..." },           │
│   { id: "8_Z5jd", role: "assistant", content: "..." },      │
│   ...                                                        │
│   { id: "Hi6B-m", role: "user", content: "..." },  ← Pointer│
│   { id: "summary-yT", role: "system", content: "Summary" }  │
│   { id: "R8_Z5j", role: "user", content: "..." },           │
│   ...                                                        │
│ ]                                                            │
│ summarizedUpToMessageId: "Hi6B-m"  ← NEW                    │
│ tokenThreshold: 50000               ← NEW (per-session)     │
│ lastTokenCount: 48532               ← NEW (cached)          │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Message-Level Validation**: Check token count BEFORE adding message
2. **Token-Based Triggering**: Use actual token count, not turn count
3. **Non-Destructive Storage**: Never delete messages
4. **Pointer-Based Context**: Only send relevant messages to LLM
5. **Per-Session Config**: Different limits for different use cases
6. **Model-Aware Defaults**: Automatically use 80% of each model's context window

### Default Configuration

**Token-based memory is ENABLED BY DEFAULT** with model-aware thresholds:

```typescript
// No configuration needed - works out of the box!
const neurolink = new NeuroLink();

await neurolink.generate({
  provider: 'openai',
  model: 'gpt-4o',  // 128k context window
  // → Automatically uses 102,400 tokens (80% of 128k)
});

await neurolink.generate({
  provider: 'vertex',
  model: 'gemini-2.5-flash',  // 1M context window
  // → Automatically uses 819,200 tokens (80% of 1M)
});

await neurolink.generate({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',  // 200k context window
  // → Automatically uses 160,000 tokens (80% of 200k)
});
```

**How it works**:
1. **Enabled by default**: `NEUROLINK_MEMORY_ENABLED !== "false"`
2. **Summarization enabled**: `NEUROLINK_SUMMARIZATION_ENABLED !== "false"`
3. **Dynamic threshold**: Calculates `80%` of model's context window automatically
4. **Fallback**: Uses `50,000` tokens if model context unknown

**Priority order**:
- Session override (highest)
- Environment variable (`NEUROLINK_TOKEN_THRESHOLD`)
- **Model-based (80% of context) ← DEFAULT**
- Fallback (50k tokens)

---

## Preventing Context Window Overflow - ALL Cases Covered

### Guarantee: ZERO Context Window Errors

**Requirement**: No matter what happens, the LLM must NEVER receive more tokens than its context window supports.

### Case 1: Single Incoming Message Too Large

**Problem**: User sends 200k token message to GPT-4o (128k context window)

**Solution**: Truncate at ingestion

```typescript
async validateAndPrepareMessage(content: string, threshold: number): Promise<ChatMessage> {
  const messageTokens = await countTokens(content);
  const maxMessageSize = Math.floor(threshold * 0.5); // Max 50% of context window

  if (messageTokens > maxMessageSize) {
    // TRUNCATE - no choice
    const truncated = await truncateToTokens(content, maxMessageSize);

    logger.warn('Message truncated', {
      original: messageTokens,
      truncated: maxMessageSize,
      lost: messageTokens - maxMessageSize
    });

    return {
      id: nanoid(),
      content: truncated + "\n\n[Message truncated due to size]",
      metadata: { truncated: true, originalTokens: messageTokens }
    };
  }

  return { id: nanoid(), content };
}
```

**Result**: ✅ No single message can exceed 50% of context window

### Case 2: Input to Summarizer Too Large

**Problem**: Need to summarize 500k tokens, but summarizer model (gemini-2.5-flash) only supports 1M input

**Solution**: Chunked summarization

```typescript
async summarizeSession(session: SessionMemory, threshold: number): Promise<void> {
  const messagesToSummarize = getMessagesToSummarize(session);
  const inputTokens = await countTokens(messagesToSummarize);

  // Get summarizer model's context limit
  const summarizerLimit = TokenUtils.getProviderTokenLimit(
    config.summarizationProvider,
    config.summarizationModel
  );

  let summary: string;

  // If input exceeds summarizer's capacity → CHUNK IT
  if (inputTokens > summarizerLimit * 0.8) {
    logger.info('Input too large for summarizer, using chunked approach', {
      inputTokens,
      summarizerLimit,
      chunks: Math.ceil(inputTokens / (summarizerLimit * 0.5))
    });

    summary = await chunkAndSummarize(messagesToSummarize, summarizerLimit);
  } else {
    // Normal single-pass summarization
    summary = await generateSummary(messagesToSummarize);
  }

  // Continue with validated summary...
}

async chunkAndSummarize(messages: ChatMessage[], summarizerLimit: number): Promise<string> {
  const chunkSize = Math.floor(summarizerLimit * 0.5); // 50% chunks for safety
  const chunks: ChatMessage[][] = [];

  // 1. Split messages into chunks
  let currentChunk: ChatMessage[] = [];
  let currentTokens = 0;

  for (const msg of messages) {
    const msgTokens = await countTokens(msg.content);

    if (currentTokens + msgTokens > chunkSize) {
      chunks.push(currentChunk);
      currentChunk = [msg];
      currentTokens = msgTokens;
    } else {
      currentChunk.push(msg);
      currentTokens += msgTokens;
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  // 2. Summarize each chunk
  const chunkSummaries = await Promise.all(
    chunks.map((chunk, i) =>
      generateSummary(chunk, {
        maxTokens: 2000,
        prompt: `Summarize chunk ${i+1}/${chunks.length}`
      })
    )
  );

  // 3. Combine chunk summaries
  const combined = chunkSummaries.join('\n\n');

  // 4. If combined still too large → summarize the summaries
  const combinedTokens = await countTokens(combined);
  if (combinedTokens > chunkSize) {
    return await generateSummary([{ role: 'system', content: combined }], {
      maxTokens: Math.floor(threshold * 0.2) // Limit to 20% of main threshold
    });
  }

  return combined;
}
```

**Result**: ✅ Can summarize any size input by chunking

### Case 3: Generated Summary Too Large

**Problem**: Summarizer returns 30k token summary, but threshold is 20k

**Solution**: Post-generation validation and compression

```typescript
async generateSummary(messages: ChatMessage[], options?: SummaryOptions): Promise<string> {
  const maxSummaryTokens = options?.maxTokens || Math.floor(threshold * 0.2);

  // 1. Generate summary with explicit token limit
  const summary = await llm.generate({
    messages,
    maxTokens: maxSummaryTokens,
    systemPrompt: `Summarize concisely. Maximum ${maxSummaryTokens} tokens.`
  });

  // 2. Validate output size
  const summaryTokens = await countTokens(summary);

  if (summaryTokens > maxSummaryTokens) {
    logger.warn('Summary exceeded limit, truncating', {
      generated: summaryTokens,
      limit: maxSummaryTokens
    });

    // 3. TRUNCATE if LLM ignored limit
    return await truncateToTokens(summary, maxSummaryTokens);
  }

  return summary;
}
```

**Result**: ✅ Summary size is always validated and capped

### Case 4: Context Still Too Large After Summarization

**Problem**: After ONE summarization, context is 95k tokens (threshold is 102k)

**Solution**: Iterative summarization until safe

```typescript
async ensureSafeContext(session: SessionMemory, threshold: number): Promise<void> {
  const SAFE_ZONE = threshold * 0.7;  // Target 70% of threshold
  const MAX_ITERATIONS = 10;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    const context = buildContextFromPointer(session);
    const contextTokens = await countTokens(context);

    // Safe zone reached
    if (contextTokens <= SAFE_ZONE) {
      logger.info('Context safe', { contextTokens, threshold, iterations });
      return;
    }

    // Still too large → summarize again
    logger.warn('Context still large, iterating', {
      contextTokens,
      threshold,
      iteration: iterations + 1
    });

    await summarizeSession(session, threshold);
    iterations++;
  }

  // EMERGENCY: Max iterations reached, still too large
  await emergencyCompress(session, SAFE_ZONE);
}

async emergencyCompress(session: SessionMemory, targetTokens: number): Promise<void> {
  logger.error('Emergency compression triggered', { targetTokens });

  const context = buildContextFromPointer(session);

  // 1. Keep only the most recent messages
  const recentMessages: ChatMessage[] = [];
  let tokens = 0;

  for (let i = context.length - 1; i >= 0; i--) {
    const msgTokens = await countTokens(context[i].content);
    if (tokens + msgTokens > targetTokens * 0.8) break;

    recentMessages.unshift(context[i]);
    tokens += msgTokens;
  }

  // 2. Create emergency summary of dropped messages
  const droppedCount = context.length - recentMessages.length;
  const emergencySummary: ChatMessage = {
    id: generateSummaryId(),
    role: 'system',
    content: `[Emergency compression: ${droppedCount} messages archived due to size]`,
    metadata: {
      isSummary: true,
      emergency: true,
      droppedCount
    }
  };

  // 3. Update session
  const lastKeptMessage = recentMessages[0];
  session.summarizedUpToMessageId = lastKeptMessage.id;

  // Insert emergency summary before recent messages
  const insertIndex = session.messages.findIndex(m => m.id === lastKeptMessage.id);
  session.messages.splice(insertIndex, 0, emergencySummary);

  logger.warn('Emergency compression complete', {
    droppedMessages: droppedCount,
    keptMessages: recentMessages.length,
    finalTokens: tokens
  });
}
```

**Result**: ✅ Will ALWAYS get below threshold, even if it means dropping messages

### Case 5: Entire Context (After Compression) Still Too Large

**Problem**: Even after all summarization, context is STILL over limit (pathological case)

**Solution**: Hard cap at LLM call time

```typescript
async buildSafeContext(session: SessionMemory, threshold: number): Promise<ChatMessage[]> {
  let context = buildContextFromPointer(session);
  let contextTokens = await countTokens(context);

  // If still over threshold after all previous steps
  if (contextTokens > threshold) {
    logger.error('Context STILL too large at send time, hard truncating', {
      contextTokens,
      threshold
    });

    // Keep messages from the end until we hit threshold
    const safeContext: ChatMessage[] = [];
    let tokens = 0;

    for (let i = context.length - 1; i >= 0; i--) {
      const msg = context[i];
      const msgTokens = await countTokens(msg.content);

      if (tokens + msgTokens > threshold * 0.9) {
        // This message would exceed limit
        if (i === context.length - 1) {
          // Even the last message is too big - truncate it
          const truncated = await truncateToTokens(msg.content, threshold * 0.9);
          safeContext.unshift({ ...msg, content: truncated });
          break;
        } else {
          // Skip this message
          break;
        }
      }

      safeContext.unshift(msg);
      tokens += msgTokens;
    }

    return safeContext;
  }

  return context;
}

// In the actual LLM call
async generate(options: GenerateOptions): Promise<GenerateResult> {
  const session = await getSession(options.sessionId);
  const threshold = calculateTokenThreshold(options.provider, options.model);

  // FINAL SAFETY CHECK
  const safeContext = await buildSafeContext(session, threshold);

  // Now guaranteed to be under threshold
  return await llm.generate({
    messages: safeContext,
    model: options.model
  });
}
```

**Result**: ✅ ABSOLUTE GUARANTEE - LLM never receives over-limit context

### Case 6: User Message + System Prompt + Tools Exceed Limit

**Problem**: User message (60k) + system prompt (10k) + tool definitions (20k) = 90k, threshold is 80k

**Solution**: Include ALL components in token calculation

```typescript
async calculateTotalInputTokens(
  userMessage: string,
  sessionContext: ChatMessage[],
  systemPrompt?: string,
  tools?: Tool[]
): Promise<number> {

  const components = [
    ...sessionContext.map(m => m.content),
    userMessage
  ];

  if (systemPrompt) components.push(systemPrompt);
  if (tools) components.push(JSON.stringify(tools));

  // Count everything together
  const totalTokens = await countTokens(components.join('\n'));

  return totalTokens;
}

// Before LLM call
const totalInputTokens = await calculateTotalInputTokens(
  userMessage,
  sessionContext,
  options.systemPrompt,
  options.tools
);

if (totalInputTokens > threshold) {
  // Reduce context first, then system prompt, then tools
  sessionContext = await aggressivelyReduceContext(sessionContext, threshold, {
    systemPrompt: options.systemPrompt,
    tools: options.tools
  });
}
```

**Result**: ✅ ALL input components counted together

### Summary of Guarantees

| Overflow Case | Solution | Fallback |
|--------------|----------|----------|
| Single message too large | Truncate to 50% threshold | Hard cap at ingestion |
| Summarizer input too large | Chunk into pieces | Recursive chunking |
| Summary output too large | Limit maxTokens, validate | Truncate summary |
| Context after summarization | Iterative summarization | Emergency drop old messages |
| Still over after iterations | Hard truncate at send | Keep only recent messages |
| System prompt + tools large | Include in total calculation | Reduce context first |

**GUARANTEE**: No code path exists where the LLM can receive over-limit tokens.

---

## Token Counting Infrastructure

### Provider-Specific Implementations

| Provider | Method | Accuracy | Latency | Status |
|----------|--------|----------|---------|--------|
| OpenAI | js-tiktoken (client) | 100% | ~1-5ms | ✅ Available |
| Azure OpenAI | js-tiktoken (client) | 100% | ~1-5ms | ✅ Available |
| OpenAI-Compatible | js-tiktoken (client) | ~95% | ~1-5ms | ✅ Available |
| Google Vertex AI | SDK countTokens() | 100% | ~100-150ms | ✅ Available |
| Google AI Studio | SDK countTokens() | 100% | ~100-150ms | ✅ Available |
| Anthropic | Count Tokens API | 100% | ~200ms | ❌ Need SDK |
| AWS Bedrock | CountTokensCommand | 100% | ~150-200ms | ✅ Available |
| Mistral | tiktoken approx | ~90% | ~1-5ms | ✅ Available |
| LiteLLM | Proxy passthrough | ~95% | ~50-100ms | ✅ Available |
| Ollama | Character estimation | ~70% | <1ms | ✅ Fallback |
| HuggingFace | Character estimation | ~65% | <1ms | ✅ Fallback |
| SageMaker | Character estimation | ~65% | <1ms | ✅ Fallback |
| Others/Fallback | Character estimation | ~60% | <1ms | ✅ Fallback |

### Performance Characteristics

**Token Counting Latency** (per conversation turn):

```typescript
// Best case: Client-side counting (OpenAI, Azure)
await countTokens(messages) // ~1-5ms ✅ Acceptable

// Average case: API call with caching (Google, Anthropic)
await countTokens(messages) // ~100-200ms ⚠️ Noticeable
// With 5-min cache: ~0.1ms ✅ Negligible

// Worst case: Cache miss + API failure
await countTokens(messages) // Fallback to estimation ~1ms ✅ Safe
```

**Summarization Latency**:
```typescript
// When threshold exceeded
await summarize(session) // ~2-5 seconds ⚠️ User waits

// Mitigation: Async summarization (don't block response)
```

### Architecture

```
src/lib/types/
├── conversation.ts             # Add token counting types here
└── ...

src/lib/services/tokenCounting/
├── index.ts                    # Main export
├── tokenCounterFactory.ts      # Provider selection
├── counters/
│   ├── openai.ts              # js-tiktoken (already available)
│   ├── google.ts              # Google SDK (already available)
│   ├── anthropic.ts           # Anthropic SDK (need to add)
│   ├── bedrock.ts             # AWS SDK (already available)
│   ├── mistral.ts             # tiktoken approximation
│   ├── estimation.ts          # Fallback (use existing TokenUtils)
│   └── index.ts
└── utils/
    ├── messageNormalizer.ts   # Convert to provider format
    ├── cache.ts               # 5-min TTL caching
    └── index.ts
```

### Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",  // NEW - for token counting
    "nanoid": "^5.0.0"                // NEW - for message IDs
  }
}
```

**Already Available:**
- ✅ `js-tiktoken@1.0.21` (via langsmith)
- ✅ `@google/generative-ai@0.24.1`
- ✅ `@aws-sdk/client-bedrock-runtime`

### Token Counter Types

```typescript
// src/lib/types/conversation.ts

export type TokenCounter = {
  countTokens(input: TokenCountInput): Promise<TokenCountResult>;
  supportsAsync(): boolean;
  supportedProviders(): AIProviderName[];
};

export type TokenCountInput = {
  messages: CoreMessage[];
  model: string;
  systemPrompt?: string;
  tools?: Tool[];
};

export type TokenCountResult = {
  inputTokens: number;
  estimatedOutputTokens?: number;
  method: 'api' | 'client' | 'estimation';
  accuracy: 'high' | 'medium' | 'low';
  cached: boolean;
  latency: number;  // Track performance
};
```

### Caching Strategy

```typescript
// Cache key: provider + model + messages hash
const cacheKey = `${provider}:${model}:${hashMessages(messages)}`;

// TTL: 5 minutes (messages unlikely to change)
const cachedCount = await cache.get(cacheKey);
if (cachedCount) return cachedCount;

const startTime = Date.now();
const count = await countTokens(messages);
count.latency = Date.now() - startTime;

await cache.set(cacheKey, count, { ttl: 300 });
```

---

## Pointer-Based Memory System

### Updated Type Definitions

```typescript
// src/lib/types/conversation.ts

export type ChatMessage = {
  id: string;  // ← NOW REQUIRED (use nanoid)
  role: "user" | "assistant" | "system" | "tool_call" | "tool_result";
  content: string;
  timestamp?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  metadata?: {
    isSummary?: boolean;       // NEW: Mark summary messages
    summarizesFrom?: string;   // NEW: First message ID
    summarizesTo?: string;     // NEW: Last message ID
    truncated?: boolean;       // NEW: Was message truncated?
    originalTokens?: number;   // NEW: Original token count
  };
};

export type SessionMemory = {
  sessionId: string;
  userId?: string;
  title?: string;
  messages: ChatMessage[];

  // NEW FIELDS
  summarizedUpToMessageId?: string;  // Pointer to last summarized message
  tokenThreshold?: number;           // Per-session override
  lastTokenCount?: number;           // Cached token count
  lastCountedAt?: number;            // Cache timestamp

  // Existing fields
  createdAt: number;
  lastActivity: number;
  metadata?: Record<string, unknown>;
};
```

### Message ID Generation (Using nanoid)

```typescript
// src/lib/utils/messageId.ts
import { nanoid } from 'nanoid';

export function generateMessageId(): string {
  // Format: 21-char URL-safe string
  // Example: "V1StGXR8_Z5jdHi6B-myT"
  return nanoid();
}

export function generateSummaryId(): string {
  // Format: summary-{nanoid}
  // Example: "summary-V1StGXR8_Z5jdHi6B"
  return `summary-${nanoid()}`;
}
```

**Why nanoid over crypto.randomUUID()**:
- 57% smaller: 21 chars vs 36 chars
- Faster generation
- URL-safe by default
- Better for storage/memory
- Configurable alphabet & length

### Message-Level Validation (CRITICAL)

```typescript
// src/lib/core/conversationMemoryManager.ts

private async validateAndPrepareMessage(
  content: string,
  role: ChatMessage['role'],
  threshold: number
): Promise<ChatMessage> {
  const id = generateMessageId();

  // Count tokens for this single message
  const tokenCount = await this.countMessageTokens(content);

  // If single message exceeds threshold, truncate it
  if (tokenCount > threshold * 0.8) { // Use 80% of threshold for safety
    const truncated = await this.truncateMessageToTokens(
      content,
      Math.floor(threshold * 0.8)
    );

    logger.warn('Message truncated due to token limit', {
      id,
      originalTokens: tokenCount,
      threshold,
      truncatedTo: Math.floor(threshold * 0.8)
    });

    return {
      id,
      role,
      content: truncated,
      timestamp: new Date().toISOString(),
      metadata: {
        truncated: true,
        originalTokens: tokenCount
      }
    };
  }

  return {
    id,
    role,
    content,
    timestamp: new Date().toISOString()
  };
}
```

### Updated Store Conversation Turn

```typescript
// src/lib/core/conversationMemoryManager.ts

public async storeConversationTurn(
  sessionId: string,
  userId: string | undefined,
  userMessage: string,
  assistantMessage: string,
  provider: string,  // NEW: Required for dynamic threshold
  model: string,     // NEW: Required for dynamic threshold
  _startTimeStamp: Date | undefined,
): Promise<void> {
  // 1. Get or create session
  let session = await this.getSession(sessionId, userId);
  if (!session) {
    session = this.createSession(sessionId, userId);
  }

  // 2. Calculate effective token threshold (80% of model context by default)
  const tokenThreshold = getEffectiveTokenThreshold(
    provider,
    model,
    session.tokenThreshold,           // Per-session override
    this.config.tokenThreshold        // Env var override
    // If both undefined → uses 80% of model context window
  );

  // 3. CRITICAL: Validate and prepare messages BEFORE adding
  const userMsg = await this.validateAndPrepareMessage(
    userMessage,
    'user',
    tokenThreshold
  );
  const assistantMsg = await this.validateAndPrepareMessage(
    assistantMessage,
    'assistant',
    tokenThreshold
  );

  // 4. Add messages to session
  session.messages.push(userMsg, assistantMsg);
  session.lastActivity = Date.now();

  // 5. Check if summarization needed (NON-BLOCKING)
  if (this.config.enableSummarization) {
    // Fire and forget - don't block user response
    setImmediate(async () => {
      await this.checkAndSummarize(session, tokenThreshold);
    });
  }

  // 6. Enforce session limits
  await this._enforceSessionLimits();

  // 7. Save session
  this.sessions.set(sessionId, session);
}

private async checkAndSummarize(
  session: SessionMemory,
  threshold: number
): Promise<void> {
  try {
    // Count tokens from pointer onwards
    const contextMessages = this.buildContextFromPointer(session);
    const tokenCount = await this.countTokens(contextMessages);

    // Update cache
    session.lastTokenCount = tokenCount;
    session.lastCountedAt = Date.now();

    // Trigger summarization if threshold exceeded
    if (tokenCount >= threshold) {
      await this._summarizeSession(session, threshold);
    }
  } catch (error) {
    logger.error('Token counting or summarization failed', {
      sessionId: session.sessionId,
      error: error instanceof Error ? error.message : String(error)
    });
    // Graceful degradation - don't crash
  }
}
```

### Context Building (Pointer-Based)

```typescript
// src/lib/utils/conversationMemory.ts

export function buildContextFromPointer(session: SessionMemory): ChatMessage[] {
  // If no pointer, return all messages (backward compatible)
  if (!session.summarizedUpToMessageId) {
    return session.messages;
  }

  // Find pointer position
  const pointerIndex = session.messages.findIndex(
    (msg) => msg.id === session.summarizedUpToMessageId
  );

  if (pointerIndex === -1) {
    // Pointer not found - fallback to all messages
    logger.warn('Pointer message not found, returning all messages', {
      sessionId: session.sessionId,
      pointer: session.summarizedUpToMessageId
    });
    return session.messages;
  }

  // Return: summary message + all messages after pointer
  // Expect summary to be at pointerIndex + 1
  const contextMessages = session.messages.slice(pointerIndex + 1);

  // Verify first message is the summary
  if (contextMessages[0]?.metadata?.isSummary) {
    return contextMessages;
  }

  // Fallback if summary not found where expected
  logger.warn('Expected summary message after pointer', {
    sessionId: session.sessionId,
    pointerIndex
  });
  return contextMessages;
}
```

### Summarization Process (Updated)

```typescript
// src/lib/core/conversationMemoryManager.ts

private async _summarizeSession(
  session: SessionMemory,
  threshold: number
): Promise<void> {
  logger.info('Summarizing session', { sessionId: session.sessionId });

  // 1. Find the pointer position (or start from beginning)
  const startIndex = session.summarizedUpToMessageId
    ? this._findMessageIndex(session.messages, session.summarizedUpToMessageId) + 1
    : 0;

  // 2. Get messages to process (after pointer)
  const recentMessages = session.messages.slice(startIndex);

  if (recentMessages.length === 0) {
    return; // Nothing to summarize
  }

  // 3. Determine split point (keep 30% of threshold as recent context)
  const targetRecentTokens = threshold * 0.3;
  const splitIndex = await this._findSplitIndexByTokens(
    recentMessages,
    targetRecentTokens
  );

  // 4. Split messages
  const messagesToSummarize = recentMessages.slice(0, splitIndex);
  const messagesToKeep = recentMessages.slice(splitIndex);

  if (messagesToSummarize.length === 0) {
    return; // Nothing to summarize
  }

  // 5. Generate summary
  const summary = await this._generateSummary(messagesToSummarize);

  // 6. Create summary message
  const lastSummarized = messagesToSummarize[messagesToSummarize.length - 1];
  const summaryMessage: ChatMessage = {
    id: generateSummaryId(),
    role: "system",
    content: `Summary of conversation:\n\n${summary}`,
    timestamp: new Date().toISOString(),
    metadata: {
      isSummary: true,
      summarizesFrom: messagesToSummarize[0].id,
      summarizesTo: lastSummarized.id,
    },
  };

  // 7. Insert summary AFTER the last summarized message
  const insertIndex = startIndex + splitIndex;
  session.messages.splice(insertIndex, 0, summaryMessage);

  // 8. Update pointer
  session.summarizedUpToMessageId = lastSummarized.id;

  // NOTE: Messages are NEVER deleted!
  logger.info('Summarization complete', {
    sessionId: session.sessionId,
    summarizedCount: messagesToSummarize.length,
    totalMessages: session.messages.length
  });
}
```

### Configuration Schema

```typescript
// src/lib/types/configuration.ts

export type ConversationMemoryConfig = {
  enabled: boolean;

  // Session limits
  maxSessions: number;
  sessionInactivityDays?: number;  // NEW: Auto-archive after N days

  // Summarization config
  enableSummarization: boolean;
  tokenThreshold?: number;  // NEW: Optional override (defaults to 80% of model context)
  summarizationProvider: AIProviderName;
  summarizationModel: string;

  // Backward compatibility (deprecated)
  maxTurnsPerSession?: number;
  summarizationThresholdTurns?: number;
  summarizationTargetTurns?: number;
};

// src/lib/config/conversationMemory.ts
export const MEMORY_THRESHOLD_PERCENTAGE = 0.8;  // 80% of model context window
export const DEFAULT_FALLBACK_THRESHOLD = 50000; // Fallback if model context unknown
export const DEFAULT_SESSION_INACTIVITY_DAYS = 30;

/**
 * Calculate token threshold based on model's context window
 * @param provider - AI provider name
 * @param model - Model name
 * @returns Token threshold (80% of model's context window)
 */
export function calculateTokenThreshold(
  provider: string,
  model: string
): number {
  // Get model's max context from existing TokenUtils
  const modelContextLimit = TokenUtils.getProviderTokenLimit(provider, model);

  // Return 80% of context window for conversation memory
  return Math.floor(modelContextLimit * MEMORY_THRESHOLD_PERCENTAGE);
}

/**
 * Get effective token threshold for a session
 * Priority: session override > env var > model-based (80%) > fallback
 */
export function getEffectiveTokenThreshold(
  provider: string,
  model: string,
  sessionOverride?: number,
  envOverride?: number
): number {
  // 1. Session-level override (highest priority)
  if (sessionOverride) {
    return sessionOverride;
  }

  // 2. Environment variable override
  if (envOverride) {
    return envOverride;
  }

  // 3. Model-based calculation (80% of context window) - DEFAULT
  try {
    return calculateTokenThreshold(provider, model);
  } catch (error) {
    logger.warn('Failed to calculate model threshold, using fallback', {
      provider,
      model,
      error
    });
    // 4. Fallback for unknown models
    return DEFAULT_FALLBACK_THRESHOLD;
  }
}

export function getConversationMemoryDefaults(): ConversationMemoryConfig {
  return {
    // ENABLED BY DEFAULT
    enabled: process.env.NEUROLINK_MEMORY_ENABLED !== "false",  // Default: true
    maxSessions: Number(process.env.NEUROLINK_MEMORY_MAX_SESSIONS) || 50,
    sessionInactivityDays: Number(process.env.NEUROLINK_SESSION_INACTIVITY_DAYS) || 30,

    // SUMMARIZATION ENABLED BY DEFAULT
    enableSummarization: process.env.NEUROLINK_SUMMARIZATION_ENABLED !== "false",  // Default: true
    tokenThreshold: process.env.NEUROLINK_TOKEN_THRESHOLD
      ? Number(process.env.NEUROLINK_TOKEN_THRESHOLD)
      : undefined,  // undefined = use model-based calculation
    summarizationProvider: (process.env.NEUROLINK_SUMMARIZATION_PROVIDER as AIProviderName) || "vertex",
    summarizationModel: process.env.NEUROLINK_SUMMARIZATION_MODEL || "gemini-2.5-flash",

    // Deprecated (for backward compatibility)
    maxTurnsPerSession: Number(process.env.NEUROLINK_MEMORY_MAX_TURNS_PER_SESSION) || undefined,
    summarizationThresholdTurns: Number(process.env.NEUROLINK_SUMMARIZATION_THRESHOLD_TURNS) || undefined,
  };
}
```

### Default Behavior (80% Model Context)

**Token-based memory is ENABLED BY DEFAULT** and automatically calculates thresholds:

```typescript
// Example: GPT-4o (128k context window)
const threshold = calculateTokenThreshold('openai', 'gpt-4o');
// → 102,400 tokens (80% of 128k)

// Example: Gemini 2.5 Flash (1M context window)
const threshold = calculateTokenThreshold('vertex', 'gemini-2.5-flash');
// → 819,200 tokens (80% of 1M)

// Example: Claude 3.5 Sonnet (200k context window)
const threshold = calculateTokenThreshold('anthropic', 'claude-3-5-sonnet-20241022');
// → 160,000 tokens (80% of 200k)

// Example: Unknown model (fallback)
const threshold = calculateTokenThreshold('custom-provider', 'unknown-model');
// → 50,000 tokens (fallback)
```

**Priority Order**:
1. **Per-session override** (highest)
2. **Environment variable** (`NEUROLINK_TOKEN_THRESHOLD`)
3. **Model-based (80% of context)** ← **DEFAULT**
4. **Fallback** (50k tokens) - only if model unknown

### Per-Session Configuration

```typescript
// Users can override token threshold per session
neurolink.generate({
  sessionId: "session-123",
  conversationMemory: {
    tokenThreshold: 100000  // Override for this specific session
  },
  // ... other options
});
```

---

## Edge Cases & Mitigations

### 1. Single Message Exceeds Threshold

**Problem**: User sends 80k token message, threshold is 50k

**Solution**:
```typescript
// Truncate message BEFORE adding to session
if (messageTokens > threshold * 0.8) {
  message = truncateToTokens(message, threshold * 0.8);
  // Log warning, mark as truncated
}
```

### 2. Token Counting API Failure

**Problem**: Google/Anthropic API returns 500 error

**Solution**:
```typescript
try {
  tokens = await apiCounter.countTokens(messages);
} catch (error) {
  logger.warn('Token API failed, using estimation', { error });
  tokens = estimateTokens(messages); // Fallback
}
```

### 3. Summary Generation Failure

**Problem**: Summarization model is unavailable

**Solution**:
```typescript
try {
  summary = await generateSummary(messages);
} catch (error) {
  logger.error('Summarization failed', { error });
  // Don't create summary, just update pointer
  // User gets full context (may hit limit, but safer than crashing)
}
```

### 4. Summary Itself Too Long

**Problem**: Generated summary exceeds threshold

**Solution**:
```typescript
const summary = await generateSummary(messages, {
  maxTokens: threshold * 0.2 // Limit summary to 20% of threshold
});

// Validate summary length
if (countTokens(summary) > threshold * 0.2) {
  summary = truncateToTokens(summary, threshold * 0.2);
}
```

### 5. Pointer Corruption

**Problem**: Pointer message was deleted or corrupted

**Solution**:
```typescript
const pointerIndex = findMessageIndex(session.summarizedUpToMessageId);
if (pointerIndex === -1) {
  logger.error('Pointer corrupted, resetting', {
    sessionId: session.sessionId,
    pointer: session.summarizedUpToMessageId
  });
  // Reset pointer, return all messages
  session.summarizedUpToMessageId = undefined;
  return session.messages;
}
```

### 6. Cache Inconsistency

**Problem**: Cached token count doesn't match actual count

**Solution**:
```typescript
// Invalidate cache when messages change
session.lastCountedAt = undefined; // Force recount

// Time-based invalidation (5-min TTL)
const cacheAge = Date.now() - (session.lastCountedAt || 0);
if (cacheAge > 300000) { // 5 minutes
  // Recount tokens
}
```

---

## Performance Considerations

### Latency Breakdown

**Per Conversation Turn**:
```typescript
// 1. Validate user message
await validateMessage(userMsg)      // 1-200ms (depends on provider)

// 2. Validate assistant message
await validateMessage(assistantMsg) // 1-200ms (depends on provider)

// 3. Add to session (synchronous)
session.messages.push(...)           // <1ms

// 4. Check summarization (async, non-blocking)
setImmediate(async () => {
  await checkAndSummarize(session)   // 0-5000ms (doesn't block user)
})

// Total blocking time: 2-400ms
```

**Optimization Strategies**:

1. **Use client-side counting when available**
   ```typescript
   if (provider === 'openai' || provider === 'azure') {
     // js-tiktoken: ~1-5ms
   } else {
     // API call: ~100-200ms
   }
   ```

2. **Aggressive caching**
   ```typescript
   // Cache individual message token counts
   const msgCache = new Map<string, number>();
   msgCache.set(message.id, tokenCount);

   // Total = sum of individual message counts
   totalTokens = messages.reduce((sum, msg) =>
     sum + (msgCache.get(msg.id) || 0), 0
   );
   ```

3. **Async summarization**
   ```typescript
   // Don't block user response
   setImmediate(async () => {
     await summarize(session);
   });
   // User gets response immediately
   // Summary happens in background
   ```

4. **Batch token counting**
   ```typescript
   // Instead of counting one message at a time
   await countTokens([userMsg, assistantMsg]); // Single API call
   ```

### Memory Usage

**Before**: Session with 100 messages
- Storage: ~100KB (100 messages × 1KB average)
- LLM payload: ~100KB (all messages sent)

**After**: Session with 100 messages
- Storage: ~101KB (100 messages + metadata)
- LLM payload: ~20KB (summary + recent 20 messages)
- **80% reduction in LLM payload**

**Additional overhead per session**: ~100 bytes (new fields)

---

## Environment Variables

### Default Behavior (No Configuration Required)

**Token-based memory works out of the box with these defaults:**
- ✅ Memory: **ENABLED** (opt-out with `NEUROLINK_MEMORY_ENABLED=false`)
- ✅ Summarization: **ENABLED** (opt-out with `NEUROLINK_SUMMARIZATION_ENABLED=false`)
- ✅ Threshold: **80% of model's context window** (automatic, model-aware)
- ✅ Provider: `vertex` (Google Vertex AI)
- ✅ Model: `gemini-2.5-flash` (fast, cost-effective)

### Optional Overrides

```bash
# Disable memory (opt-out)
NEUROLINK_MEMORY_ENABLED=false

# Disable summarization (opt-out)
NEUROLINK_SUMMARIZATION_ENABLED=false

# Override automatic threshold calculation
# (Only set if you want to override the smart 80% default)
NEUROLINK_TOKEN_THRESHOLD=100000            # Fixed threshold (not recommended)

# Session management
NEUROLINK_MEMORY_MAX_SESSIONS=50            # Default: 50
NEUROLINK_SESSION_INACTIVITY_DAYS=30        # Default: 30 days

# Summarization provider/model
NEUROLINK_SUMMARIZATION_PROVIDER=vertex     # Default: vertex
NEUROLINK_SUMMARIZATION_MODEL=gemini-2.5-flash  # Default: gemini-2.5-flash
```

### Deprecated (Still Supported)

```bash
# Turn-based memory (DEPRECATED - will be removed in v8.0)
NEUROLINK_MEMORY_MAX_TURNS_PER_SESSION=50
NEUROLINK_SUMMARIZATION_THRESHOLD_TURNS=20
NEUROLINK_SUMMARIZATION_TARGET_TURNS=10
```

### Examples

```bash
# Example 1: Use defaults (recommended - no config needed!)
# Memory: ✅ Enabled
# Summarization: ✅ Enabled with 80% model context
# Provider: vertex / gemini-2.5-flash

# Example 2: Disable memory completely
NEUROLINK_MEMORY_ENABLED=false

# Example 3: Enable memory but disable summarization
NEUROLINK_MEMORY_ENABLED=true
NEUROLINK_SUMMARIZATION_ENABLED=false

# Example 4: Override threshold to fixed value
NEUROLINK_TOKEN_THRESHOLD=200000  # Use 200k for all models

# Example 5: Change summarization provider
NEUROLINK_SUMMARIZATION_PROVIDER=openai
NEUROLINK_SUMMARIZATION_MODEL=gpt-4o-mini
```

---

## Success Criteria

1. ✅ **Enabled by default**: Memory and summarization work out of the box (opt-out)
2. ✅ **Model-aware thresholds**: Automatically uses 80% of each model's context window
3. ✅ **Single long message handling**: Messages exceeding threshold get truncated, don't crash
4. ✅ **Token-based triggering**: Summarizes based on actual token count, not turn count
5. ✅ **History preservation**: 100% of messages retained in array (non-destructive)
6. ✅ **Performance**: <200ms overhead for token counting (with caching)
7. ✅ **Flexibility**: Supports per-session overrides and env var overrides
8. ✅ **Backward compatibility**: Existing sessions and old env vars continue to work

**Example validations**:
- GPT-4o (128k context) → Summarizes at ~102k tokens (80%)
- Gemini 2.5 Flash (1M context) → Summarizes at ~819k tokens (80%)
- Claude 3.5 Sonnet (200k context) → Summarizes at ~160k tokens (80%)
- Unknown model → Falls back to 50k tokens

---

## Related Documentation

- **Current Implementation**: `/docs/CONVERSATION-MEMORY.md`
- **Current Summarization**: `/docs/CONTEXT-SUMMARIZATION.md`
- **Token Constants**: `/src/lib/constants/tokens.ts`
- **Type Definitions**: `/src/lib/types/conversation.ts`

---

**Document Version:** 2.0
**Last Updated:** 2025-11-17
**Status:** Ready for Implementation

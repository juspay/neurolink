# Context Window Management

## Problem

AI models have limited context windows (token limits):

- GPT-4o: 128K tokens (~96K words)
- Claude 4 Sonnet: 200K tokens (~150K words)
- Gemini 2.5 Flash: 1M tokens (~750K words)
- GPT-4.1: 1M tokens (~750K words)

Long conversations exceed these limits, causing:

- Truncated context
- Lost conversation history
- Inconsistent responses
- API errors

## Solution

Implement intelligent context management:

1. Track token usage
2. Sliding window approach
3. Automatic summarization
4. Strategic message pruning
5. Context compression

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  tokens?: number;
};

class ContextWindowManager {
  private neurolink: NeuroLink;
  private messages: Message[] = [];
  private maxTokens: number;
  private systemMessage?: Message;

  constructor(maxTokens: number = 8000) {
    this.neurolink = new NeuroLink();
    this.maxTokens = maxTokens;
  }

  /**
   * Estimate tokens in text (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate total tokens in message array
   */
  private calculateTotalTokens(messages: Message[]): number {
    return messages.reduce(
      (sum, msg) => sum + (msg.tokens || this.estimateTokens(msg.content)),
      0,
    );
  }

  /**
   * Set system message (always preserved)
   */
  setSystemMessage(content: string) {
    this.systemMessage = {
      role: "system",
      content,
      tokens: this.estimateTokens(content),
    };
  }

  /**
   * Add message with automatic pruning
   */
  addMessage(role: "user" | "assistant", content: string) {
    const message: Message = {
      role,
      content,
      tokens: this.estimateTokens(content),
    };

    this.messages.push(message);
    this.pruneIfNeeded();
  }

  /**
   * Prune old messages when approaching limit
   */
  private pruneIfNeeded() {
    const allMessages = this.systemMessage
      ? [this.systemMessage, ...this.messages]
      : this.messages;

    const totalTokens = this.calculateTotalTokens(allMessages);

    if (totalTokens <= this.maxTokens) {
      return; // No pruning needed
    }

    console.log(
      `⚠️  Context window full (${totalTokens}/${this.maxTokens} tokens). Pruning...`,
    );

    // Strategy: Keep system message + last N messages
    const targetTokens = Math.floor(this.maxTokens * 0.8); // 80% capacity
    let currentTokens = this.systemMessage?.tokens || 0;
    const keptMessages: Message[] = [];

    // Keep messages from most recent, working backwards
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      const msgTokens = msg.tokens || this.estimateTokens(msg.content);

      if (currentTokens + msgTokens <= targetTokens) {
        keptMessages.unshift(msg);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    const removedCount = this.messages.length - keptMessages.length;
    console.log(`🗑️  Removed ${removedCount} old messages`);

    this.messages = keptMessages;
  }

  /**
   * Summarize old messages instead of removing
   */
  async summarizeOldMessages() {
    if (this.messages.length < 10) {
      return; // Not enough to summarize
    }

    const totalTokens = this.calculateTotalTokens(this.messages);

    if (totalTokens <= this.maxTokens * 0.7) {
      return; // Still plenty of space
    }

    // Take first half of messages and summarize
    const toSummarize = this.messages.slice(
      0,
      Math.floor(this.messages.length / 2),
    );
    const toKeep = this.messages.slice(Math.floor(this.messages.length / 2));

    const conversationText = toSummarize
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    console.log("📝 Summarizing old messages...");

    const summary = await this.neurolink.generate({
      input: {
        text: `Summarize this conversation concisely, preserving key information:\n\n${conversationText}`,
      },
      provider: "anthropic",
      model: "claude-3-5-haiku-20241022", // Fast, cheap model for summaries
      maxTokens: 500,
    });

    // Replace old messages with summary
    this.messages = [
      {
        role: "assistant",
        content: `[Previous conversation summary: ${summary.content}]`,
        tokens: this.estimateTokens(summary.content),
      },
      ...toKeep,
    ];

    console.log(`✅ Summarized ${toSummarize.length} messages`);
  }

  /**
   * Generate with managed context
   */
  async chat(userMessage: string) {
    this.addMessage("user", userMessage);

    const contextMessages = this.systemMessage
      ? [this.systemMessage, ...this.messages]
      : this.messages;

    // Convert to NeuroLink format
    const prompt = contextMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    const result = await this.neurolink.generate({
      input: { text: prompt },
    });

    this.addMessage("assistant", result.content);

    return result.content;
  }

  /**
   * Get current context statistics
   */
  getStats() {
    const totalTokens = this.calculateTotalTokens(this.messages);
    return {
      messages: this.messages.length,
      tokens: totalTokens,
      capacity: this.maxTokens,
      usage: ((totalTokens / this.maxTokens) * 100).toFixed(1) + "%",
    };
  }

  /**
   * Clear all messages (keep system message)
   */
  clear() {
    this.messages = [];
  }
}

// Usage Example
async function main() {
  const manager = new ContextWindowManager(4000); // 4K token limit

  manager.setSystemMessage(
    "You are a helpful AI assistant. Be concise and accurate.",
  );

  // Simulate a long conversation
  console.log("Starting conversation...\n");

  for (let i = 1; i <= 20; i++) {
    const response = await manager.chat(
      `This is message ${i}. Tell me an interesting fact about space.`,
    );

    console.log(`\nUser: Message ${i}`);
    console.log(`Assistant: ${response.slice(0, 100)}...`);

    const stats = manager.getStats();
    console.log(
      `📊 Context: ${stats.messages} messages, ${stats.tokens} tokens (${stats.usage})`,
    );

    // Summarize when getting full
    if (stats.tokens > 3000) {
      await manager.summarizeOldMessages();
    }
  }

  console.log("\n✅ Conversation complete");
  console.log("Final stats:", manager.getStats());
}

main();
```

## Explanation

### 1. Token Estimation

Estimate tokens before sending to API:

```typescript
estimateTokens(text) ≈ text.length / 4
```

This is approximate but sufficient for context management.

### 2. Sliding Window

Keep most recent messages, discard oldest:

- **System message**: Always preserved
- **Recent messages**: Keep in full
- **Old messages**: Remove or summarize

### 3. Automatic Pruning

When reaching 100% capacity:

- Remove oldest messages
- Target 80% capacity (leave buffer)
- Preserve conversation coherence

### 4. Intelligent Summarization

Instead of discarding, summarize old messages:

```
[10 messages] → [1 summary message] + [Recent messages]
```

Preserves context while reducing tokens.

### 5. Progressive Strategy

```
0-70% capacity:   No action
70-90% capacity:  Summarize old messages
90-100% capacity: Remove oldest messages
>100% capacity:   Aggressive pruning
```

## Variations

### Keep Important Messages

Tag and preserve important messages:

```typescript
type MessageWithMetadata = Message & {
  important?: boolean;
  timestamp: number;
};

private pruneIfNeeded() {
  // Always keep important messages
  const important = this.messages.filter(m => m.important);
  const regular = this.messages.filter(m => !m.important);

  // Prune regular messages only
  const pruned = this.pruneMessages(regular);

  this.messages = [...important, ...pruned];
}
```

### Semantic Compression

Use embeddings to identify redundant messages:

```typescript
async compressSemanticDuplicates() {
  // Group similar messages using embeddings
  const embeddings = await this.getEmbeddings(this.messages);

  // Find and merge similar messages
  const compressed = this.mergeSimiar(this.messages, embeddings);

  this.messages = compressed;
}
```

### Provider-Specific Limits

Different models, different limits:

```typescript
const CONTEXT_LIMITS = {
  "gpt-4o": 128000,
  "gpt-4o-mini": 128000,
  "gpt-4.1": 1047576,
  "o3": 200000,
  "claude-opus-4-20250514": 200000,
  "claude-sonnet-4-20250514": 200000,
  "claude-3-5-sonnet-20241022": 200000,
  "gemini-2.5-flash": 1048576,
  "gemini-2.5-pro": 1048576,
};

constructor(model: string) {
  this.maxTokens = CONTEXT_LIMITS[model] || 128000;
  // Leave 20% buffer for response
  this.maxTokens = Math.floor(this.maxTokens * 0.8);
}
```

### Rolling Summary

Maintain a rolling summary that updates:

```typescript
class RollingSummaryManager extends ContextWindowManager {
  private summary = "";

  async updateSummary() {
    const recentMessages = this.messages.slice(-5);
    const context = `${this.summary}\n\nRecent: ${recentMessages.map((m) => m.content).join("\n")}`;

    const newSummary = await this.neurolink.generate({
      input: { text: `Update this summary with recent messages:\n${context}` },
      maxTokens: 300,
    });

    this.summary = newSummary.content;
    this.messages = recentMessages; // Keep only recent
  }
}
```

## Token Budgets by Use Case

| Use Case          | Recommended Limit | Reasoning                       |
| ----------------- | ----------------- | ------------------------------- |
| Chatbot           | 4K-8K tokens      | Quick responses, recent context |
| Code assistant    | 16K-32K tokens    | Need file context               |
| Document analysis | 32K-100K tokens   | Large documents                 |
| Long-form writing | 8K-16K tokens     | Story continuity                |
| Customer support  | 4K tokens         | Short interactions              |

## Using Built-in Context Compaction

The manual patterns shown above (token estimation, sliding windows, summarization)
are now available as built-in components in NeuroLink. See
[Context Compaction Guide](../features/context-compaction.md) for full details.

- **ContextCompactor** (`src/lib/context/contextCompactor.ts`) implements a 4-stage
  pipeline: tool-output pruning, file-read deduplication, LLM summarization, and
  sliding-window truncation. It replaces the need to build custom
  `ContextWindowManager` classes.
- **BudgetChecker** (`src/lib/context/budgetChecker.ts`) validates context size against
  per-model token limits before every generation call. Compaction is triggered
  automatically when usage exceeds the configured threshold.
- **`getContextStats()`** provides live token counts, remaining capacity, and a
  `shouldCompact` flag -- a production-grade replacement for the manual
  `getStats()` helper shown in this cookbook.
- **`compactSession()`** runs the full 4-stage pipeline on demand and returns
  a `CompactionResult` with the compacted messages and token savings.

Provider-specific context window sizes are maintained in
`src/lib/constants/contextWindows.ts`, removing the need for hard-coded
`CONTEXT_LIMITS` maps.

### Configuration

Enable context compaction through the `conversationMemory.contextCompaction`
config when creating a NeuroLink instance:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    contextCompaction: {
      enabled: true,
      // Trigger compaction when context usage exceeds 80% (default: 0.80)
      threshold: 0.8,
      // Enable individual compaction stages (all default to true)
      enablePruning: true, // Replace old tool outputs with placeholders
      enableDeduplication: true, // Keep only the latest read of each file
      enableSlidingWindow: true, // Tag oldest messages for removal as last resort
      // Fine-tune limits
      maxToolOutputBytes: 50_000, // Max tool output size before pruning (default: 50KB)
      maxToolOutputLines: 2000, // Max tool output lines before pruning
      fileReadBudgetPercent: 0.6, // File reads share of remaining context (default: 60%)
    },
  },
});
```

### Checking Context Usage

Use `getContextStats()` to inspect how much of the context window a session
is consuming. The method returns token estimates, a usage ratio, and a
`shouldCompact` flag based on the configured threshold:

```typescript
// Get context usage for a session against a specific provider/model
const stats = await neurolink.getContextStats(
  "session-1",
  "vertex",
  "gemini-2.5-flash",
);

if (stats) {
  console.log(`Messages:       ${stats.messageCount}`);
  console.log(`Input tokens:   ${stats.estimatedInputTokens}`);
  console.log(`Available:      ${stats.availableInputTokens}`);
  console.log(`Context usage:  ${(stats.usageRatio * 100).toFixed(1)}%`);
  console.log(`Needs compact:  ${stats.shouldCompact}`);
}
```

### Manual Compaction

When `shouldCompact` is `true`, or at any time you want to free up context
space, call `compactSession()`:

```typescript
const result = await neurolink.compactSession("session-1");

if (result?.compacted) {
  const tokensSaved = result.originalTokenCount - result.compactedTokenCount;
  console.log(`Compaction saved ${tokensSaved} tokens`);
  console.log(`Stages applied: ${result.stagesApplied.join(", ")}`);
}
```

### Full Example: Auto-Monitoring Loop

Combining the APIs above into a conversation loop that monitors context
usage and compacts automatically:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    contextCompaction: {
      enabled: true,
      threshold: 0.8,
    },
  },
});

const sessionId = "demo-session";

async function chat(userMessage: string) {
  // Check context budget before generating
  const stats = await neurolink.getContextStats(
    sessionId,
    "anthropic",
    "claude-sonnet-4-20250514",
  );

  if (stats?.shouldCompact) {
    console.log(
      `Context at ${(stats.usageRatio * 100).toFixed(1)}% — compacting...`,
    );
    const result = await neurolink.compactSession(sessionId);
    if (result?.compacted) {
      const saved = result.originalTokenCount - result.compactedTokenCount;
      console.log(
        `Freed ${saved} tokens via ${result.stagesApplied.join(", ")}`,
      );
    }
  }

  const response = await neurolink.generate({
    input: { text: userMessage },
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    sessionId,
  });

  return response.content;
}

// Simulate a long conversation
for (let i = 1; i <= 50; i++) {
  const reply = await chat(`Tell me fact #${i} about distributed systems.`);
  console.log(`[${i}] ${reply.slice(0, 120)}...`);
}
```

## See Also

- [Conversation Summarization](conversation-summarization.md)
- [Cost Optimization](cost-optimization.md)
- [Memory Management Guide](../features/conversation-history.md)
- [Provider Comparison](../reference/provider-comparison.md)

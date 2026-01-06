# Conversation Summarization

## Problem

Long conversations consume excessive tokens and costs:

- Context window fills quickly
- API costs scale with message count
- Response quality degrades with very long context
- Important information gets buried

## Solution

Automatically summarize conversation history to:

1. Preserve key information
2. Reduce token usage
3. Maintain context continuity
4. Enable indefinite conversations

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  important?: boolean;
};

class ConversationSummarizer {
  private neurolink: NeuroLink;
  private messages: ConversationMessage[] = [];
  private summary: string = "";
  private maxMessages: number;
  private summaryModel: string;

  constructor(
    options: {
      maxMessages?: number;
      summaryModel?: string;
    } = {},
  ) {
    this.neurolink = new NeuroLink();
    this.maxMessages = options.maxMessages || 10;
    this.summaryModel = options.summaryModel || "claude-3-haiku-20240307";
  }

  /**
   * Add message to conversation
   */
  addMessage(role: "user" | "assistant", content: string, important = false) {
    this.messages.push({
      role,
      content,
      timestamp: new Date(),
      important,
    });

    // Summarize if threshold reached
    if (this.messages.length >= this.maxMessages) {
      this.summarizeAsync();
    }
  }

  /**
   * Summarize old messages (async, non-blocking)
   */
  private async summarizeAsync() {
    if (this.messages.length < this.maxMessages) {
      return;
    }

    // Keep important messages and recent messages
    const importantMessages = this.messages.filter((m) => m.important);
    const regularMessages = this.messages.filter((m) => !m.important);

    // Split: summarize first half, keep second half
    const toSummarize = regularMessages.slice(
      0,
      Math.floor(regularMessages.length / 2),
    );
    const toKeep = regularMessages.slice(
      Math.floor(regularMessages.length / 2),
    );

    if (toSummarize.length === 0) {
      return;
    }

    console.log(`📝 Summarizing ${toSummarize.length} messages...`);

    try {
      const newSummary = await this.createSummary(toSummarize);

      // Update state
      this.summary = this.combineSummaries(this.summary, newSummary);
      this.messages = [...importantMessages, ...toKeep];

      console.log(`✅ Summary updated. Messages: ${this.messages.length}`);
    } catch (error: any) {
      console.error("❌ Summarization failed:", error.message);
    }
  }

  /**
   * Create summary of messages
   */
  private async createSummary(
    messages: ConversationMessage[],
  ): Promise<string> {
    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    const result = await this.neurolink.generate({
      input: {
        text: `Summarize this conversation concisely, preserving key facts, decisions, and context:\n\n${conversationText}`,
      },
      provider: "anthropic",
      model: this.summaryModel,
      maxTokens: 500,
    });

    return result.content;
  }

  /**
   * Combine old and new summaries
   */
  private combineSummaries(oldSummary: string, newSummary: string): string {
    if (!oldSummary) return newSummary;

    // If both exist, combine them (could also summarize the summaries)
    return `${oldSummary}\n\nRecent updates: ${newSummary}`;
  }

  /**
   * Get conversation context for AI
   */
  async getContext(): Promise<string> {
    const parts: string[] = [];

    // Add summary if exists
    if (this.summary) {
      parts.push(`[Previous conversation summary: ${this.summary}]`);
    }

    // Add recent messages
    const recentMessages = this.messages
      .slice(-5)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    if (recentMessages) {
      parts.push(recentMessages);
    }

    return parts.join("\n\n");
  }

  /**
   * Chat with automatic summarization
   */
  async chat(userMessage: string, markImportant = false): Promise<string> {
    this.addMessage("user", userMessage, markImportant);

    const context = await this.getContext();

    const result = await this.neurolink.generate({
      input: { text: context },
    });

    this.addMessage("assistant", result.content);

    return result.content;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      messages: this.messages.length,
      hasSummary: !!this.summary,
      summaryLength: this.summary.length,
      importantMessages: this.messages.filter((m) => m.important).length,
    };
  }

  /**
   * Export full conversation
   */
  export() {
    return {
      summary: this.summary,
      messages: this.messages,
      timestamp: new Date(),
    };
  }

  /**
   * Import conversation
   */
  import(data: { summary: string; messages: ConversationMessage[] }) {
    this.summary = data.summary;
    this.messages = data.messages;
  }
}

// Usage Example
async function main() {
  const summarizer = new ConversationSummarizer({
    maxMessages: 8,
    summaryModel: "claude-3-haiku-20240307",
  });

  // Simulate a long conversation
  console.log("Starting long conversation...\n");

  const topics = [
    "Tell me about quantum computing",
    "How does quantum entanglement work?",
    "What are practical applications?",
    "Compare quantum vs classical computers",
    "Explain quantum supremacy",
    "What is Shor's algorithm?",
    "How close are we to practical quantum computers?",
    "What are the main challenges?",
    "Explain quantum error correction",
    "What companies are leading in quantum computing?",
  ];

  for (let i = 0; i < topics.length; i++) {
    console.log(`\n--- Message ${i + 1} ---`);
    console.log(`User: ${topics[i]}`);

    const response = await summarizer.chat(topics[i]);
    console.log(`Assistant: ${response.slice(0, 100)}...`);

    const stats = summarizer.getStats();
    console.log(
      `📊 Stats: ${stats.messages} messages, summary: ${stats.hasSummary}`,
    );
  }

  // Final stats
  console.log("\n\n=== Final Stats ===");
  console.log(summarizer.getStats());

  // Export conversation
  const exported = summarizer.export();
  console.log("\n=== Export ===");
  console.log("Summary:", exported.summary);
  console.log("Messages:", exported.messages.length);
}

main();
```

## Explanation

### 1. Trigger Threshold

Summarization triggers when message count exceeds threshold:

```typescript
if (messages.length >= maxMessages) {
  summarize(); // Default: 10 messages
}
```

### 2. Preserve Important Messages

Mark critical messages to preserve:

```typescript
summarizer.addMessage("user", "Process this payment", true);
// Never summarized, always in full context
```

### 3. Split Strategy

- **First half**: Summarize
- **Second half**: Keep in full
- **Important**: Always keep

### 4. Hierarchical Summaries

Combine summaries over time:

```
[Summary 1-10] + [Summary 11-20] → [Combined Summary]
```

### 5. Cost Optimization

Use cheap model for summarization:

- Claude Haiku: $0.00025/1K tokens
- Gemini Pro: $0.00025/1K tokens

## Variations

### Progressive Summarization

Summarize at multiple levels:

```typescript
class ProgressiveSummarizer extends ConversationSummarizer {
  private detailedSummary: string = "";
  private briefSummary: string = "";

  async summarize() {
    // Level 1: Detailed summary (300 tokens)
    this.detailedSummary = await this.createSummary(this.messages, 300);

    // Level 2: Brief summary (100 tokens)
    this.briefSummary = await this.summarizeText(this.detailedSummary, 100);
  }

  private async summarizeText(
    text: string,
    maxTokens: number,
  ): Promise<string> {
    const result = await this.neurolink.generate({
      input: { text: `Summarize concisely: ${text}` },
      maxTokens,
    });
    return result.content;
  }
}
```

### Topic-Based Summarization

Organize summaries by topic:

```typescript
type TopicSummary = {
  topic: string;
  summary: string;
  messageCount: number;
};

class TopicalSummarizer {
  private topics = new Map<string, ConversationMessage[]>();

  async addMessage(topic: string, message: ConversationMessage) {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, []);
    }

    this.topics.get(topic)!.push(message);

    // Summarize if topic has many messages
    if (this.topics.get(topic)!.length >= 10) {
      await this.summarizeTopic(topic);
    }
  }
}
```

### Time-Based Summarization

Summarize by time windows:

```typescript
class TimeBasedSummarizer {
  async summarizeByTime(hours: number = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const oldMessages = this.messages.filter((m) => m.timestamp < cutoff);
    const recentMessages = this.messages.filter((m) => m.timestamp >= cutoff);

    if (oldMessages.length > 0) {
      const summary = await this.createSummary(oldMessages);
      this.summary = this.combineSummaries(this.summary, summary);
      this.messages = recentMessages;
    }
  }
}
```

### Extractive Summarization

Keep actual message excerpts:

```typescript
function extractKeyPoints(messages: ConversationMessage[]): string[] {
  // Simple heuristic: sentences with key indicators
  const keyIndicators = [
    "important",
    "remember",
    "decision",
    "agreed",
    "action",
  ];

  const keyPoints: string[] = [];

  messages.forEach((msg) => {
    const sentences = msg.content.split(/[.!?]+/);
    sentences.forEach((sentence) => {
      if (keyIndicators.some((kw) => sentence.toLowerCase().includes(kw))) {
        keyPoints.push(sentence.trim());
      }
    });
  });

  return keyPoints;
}
```

## Summarization Strategies

| Strategy                                | When to Use               | Token Savings | Context Preservation |
| --------------------------------------- | ------------------------- | ------------- | -------------------- |
| **Simple**: Remove old messages         | Short conversations       | 90%           | Low                  |
| **Abstractive**: AI-generated summary   | Long conversations        | 80%           | Medium               |
| **Extractive**: Key sentence selection  | Factual conversations     | 60%           | High                 |
| **Hierarchical**: Multi-level summaries | Very long conversations   | 85%           | Medium-High          |
| **Topic-based**: Group by subject       | Multi-topic conversations | 75%           | High                 |

## Best Practices

1. **Summarize early**: Don't wait until context is full
2. **Preserve decisions**: Mark important messages
3. **Use cheap models**: Summarization doesn't need GPT-4
4. **Test summaries**: Verify important info isn't lost
5. **Export regularly**: Save full conversation for debugging

## See Also

- [Context Window Management](context-window-management.md)
- [Cost Optimization](cost-optimization.md)
- [Memory Management Guide](../features/conversation-history.md)
- [Redis Persistence](../guides/redis-configuration.md)

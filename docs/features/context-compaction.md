# Context Compaction

## Overview

NeuroLink's Context Compaction system automatically manages conversation context windows, preventing overflow errors and maintaining conversation quality as sessions grow longer. It runs transparently before every `generate()` and `stream()` call.

Before each LLM call, the **Budget Checker** estimates the total input tokens needed (system prompt + conversation history + current prompt + tool definitions + file attachments) and compares them against the model's available context window. When usage exceeds the configured threshold (default: 80%), the **ContextCompactor** runs a 4-stage reduction pipeline:

1. **Tool Output Pruning** — Replace old tool results with placeholders (cheapest, no LLM call)
2. **File Read Deduplication** — Keep only the latest read of each file (cheap, no LLM call)
3. **LLM Summarization** — Structured 9-section summary of older messages (expensive, requires LLM call)
4. **Sliding Window Truncation** — Remove oldest messages while preserving the first exchange (fallback, no LLM call)

If a provider still returns a context overflow error after compaction, the system detects it across all supported providers and retries with aggressive compaction.

---

## Quick Start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    enableSummarization: true,
    // Context compaction is enabled automatically when summarization is on.
    // All defaults work out of the box.
  },
});
```

That's it. Auto-compaction triggers at 80% context usage with all four stages enabled.

---

## SDK Configuration

The full `contextCompaction` block lives inside `conversationMemory`:

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    enableSummarization: true,
    summarizationProvider: "vertex", // Provider for summarization LLM calls
    summarizationModel: "gemini-2.5-flash", // Model for summarization LLM calls
    contextCompaction: {
      enabled: true, // Enable auto-compaction (default: true when summarization enabled)
      threshold: 0.8, // Compaction trigger threshold, 0.0–1.0 (default: 0.80)
      enablePruning: true, // Enable Stage 1: tool output pruning (default: true)
      enableDeduplication: true, // Enable Stage 2: file read deduplication (default: true)
      enableSlidingWindow: true, // Enable Stage 4: sliding window fallback (default: true)
      maxToolOutputBytes: 50 * 1024, // Tool output max size in bytes (default: 51200)
      maxToolOutputLines: 2000, // Tool output max lines (default: 2000)
      fileReadBudgetPercent: 0.6, // File read budget as fraction of remaining context (default: 0.60)
    },
  },
});
```

| Field                   | Type      | Default                             | Description                                            |
| ----------------------- | --------- | ----------------------------------- | ------------------------------------------------------ |
| `enabled`               | `boolean` | `true` (when summarization enabled) | Master switch for auto-compaction                      |
| `threshold`             | `number`  | `0.80`                              | Usage ratio (0.0–1.0) that triggers compaction         |
| `enablePruning`         | `boolean` | `true`                              | Enable Stage 1: tool output pruning                    |
| `enableDeduplication`   | `boolean` | `true`                              | Enable Stage 2: file read deduplication                |
| `enableSlidingWindow`   | `boolean` | `true`                              | Enable Stage 4: sliding window truncation fallback     |
| `maxToolOutputBytes`    | `number`  | `51200` (50 KB)                     | Maximum tool output size in bytes before truncation    |
| `maxToolOutputLines`    | `number`  | `2000`                              | Maximum tool output lines before truncation            |
| `fileReadBudgetPercent` | `number`  | `0.60`                              | Fraction of remaining context allocated for file reads |

---

## Environment Variables

These environment variables configure conversation memory and summarization, which in turn affect compaction behavior:

| Variable                           | Default                     | Description                                           |
| ---------------------------------- | --------------------------- | ----------------------------------------------------- |
| `NEUROLINK_MEMORY_ENABLED`         | `"false"`                   | Set to `"true"` to enable conversation memory         |
| `NEUROLINK_SUMMARIZATION_ENABLED`  | `"true"`                    | Set to `"false"` to disable summarization             |
| `NEUROLINK_TOKEN_THRESHOLD`        | auto (80% of model context) | Override token threshold for triggering summarization |
| `NEUROLINK_SUMMARIZATION_PROVIDER` | `"vertex"`                  | Provider for summarization LLM calls                  |
| `NEUROLINK_SUMMARIZATION_MODEL`    | `"gemini-2.5-flash"`        | Model for summarization LLM calls                     |
| `NEUROLINK_MEMORY_MAX_SESSIONS`    | `50`                        | Maximum number of sessions to keep in memory          |

Source: `src/lib/config/conversationMemory.ts`

---

## CLI Flags

The `loop` command accepts compaction-specific flags:

```bash
# Set a custom compaction threshold (0.0–1.0)
neurolink loop --compact-threshold 0.70

# Disable automatic context compaction entirely
neurolink loop --disable-compaction
```

| Flag                   | Type      | Default | Description                                    |
| ---------------------- | --------- | ------- | ---------------------------------------------- |
| `--compact-threshold`  | `number`  | `0.8`   | Context compaction trigger threshold (0.0–1.0) |
| `--disable-compaction` | `boolean` | `false` | Disable automatic context compaction           |

Source: `src/cli/factories/commandFactory.ts:1466-1475`

---

## Public API Methods

### `getContextStats(sessionId, provider?, model?)`

Get context usage statistics for a session. Returns token counts, usage ratio, and whether compaction should trigger.

**Signature:**

```typescript
async getContextStats(
  sessionId: string,
  provider?: string,
  model?: string,
): Promise<{
  estimatedInputTokens: number;
  availableInputTokens: number;
  usageRatio: number;
  shouldCompact: boolean;
  messageCount: number;
} | null>
```

Returns `null` if conversation memory is not enabled or the session has no messages. The `provider` defaults to `"openai"` if not specified.

**Example:**

```typescript
const stats = await neurolink.getContextStats(
  "session-1",
  "anthropic",
  "claude-sonnet-4-20250514",
);
if (stats) {
  console.log(`Usage: ${(stats.usageRatio * 100).toFixed(0)}%`);
  console.log(
    `Tokens: ${stats.estimatedInputTokens} / ${stats.availableInputTokens}`,
  );
  console.log(`Messages: ${stats.messageCount}`);
  console.log(`Needs compaction: ${stats.shouldCompact}`);
}
```

Source: `src/lib/neurolink.ts:6624-6661`

---

### `compactSession(sessionId, config?)`

Manually trigger context compaction for a session. Runs the full 4-stage pipeline. After compaction, tool pairs are automatically repaired via `repairToolPairs()`.

**Signature:**

```typescript
async compactSession(
  sessionId: string,
  config?: CompactionConfig,
): Promise<CompactionResult | null>
```

Returns `null` if conversation memory is not enabled or the session has no messages.

**Example:**

```typescript
const result = await neurolink.compactSession("session-1", {
  enablePrune: true,
  enableDeduplicate: true,
  enableSummarize: true,
  enableTruncate: true,
  pruneProtectTokens: 40_000,
  summarizationProvider: "vertex",
  summarizationModel: "gemini-2.5-flash",
});

if (result?.compacted) {
  console.log(`Stages used: ${result.stagesUsed.join(", ")}`);
  console.log(`Tokens saved: ${result.tokensSaved}`);
  console.log(`Before: ${result.tokensBefore}, After: ${result.tokensAfter}`);
}
```

Source: `src/lib/neurolink.ts:6591-6618`

---

### `needsCompaction(sessionId, provider?, model?)`

Synchronous check of whether a session needs compaction. Uses `checkContextBudget()` internally with the default 80% threshold.

**Signature:**

```typescript
needsCompaction(
  sessionId: string,
  provider?: string,
  model?: string,
): boolean
```

Returns `false` if conversation memory is not enabled or the session doesn't exist. The `provider` defaults to `"openai"` if not specified.

**Example:**

```typescript
if (
  neurolink.needsCompaction(
    "session-1",
    "anthropic",
    "claude-sonnet-4-20250514",
  )
) {
  const result = await neurolink.compactSession("session-1");
  console.log(`Saved ${result?.tokensSaved} tokens`);
}
```

Source: `src/lib/neurolink.ts:6666-6692`

---

## Types Reference

### `CompactionStage`

```typescript
type CompactionStage = "prune" | "deduplicate" | "summarize" | "truncate";
```

### `CompactionResult`

Returned by `compactSession()` and `ContextCompactor.compact()`.

```typescript
type CompactionResult = {
  compacted: boolean; // Whether any compaction was applied
  stagesUsed: CompactionStage[]; // Which stages were used (in order)
  tokensBefore: number; // Estimated tokens before compaction
  tokensAfter: number; // Estimated tokens after compaction
  tokensSaved: number; // tokensBefore - tokensAfter
  messages: ChatMessage[]; // The compacted message array
};
```

### `CompactionConfig`

Optional configuration passed to `compactSession()` or the `ContextCompactor` constructor.

```typescript
type CompactionConfig = {
  enablePrune?: boolean; // Enable Stage 1 (default: true)
  enableDeduplicate?: boolean; // Enable Stage 2 (default: true)
  enableSummarize?: boolean; // Enable Stage 3 (default: true)
  enableTruncate?: boolean; // Enable Stage 4 (default: true)
  pruneProtectTokens?: number; // Recent tool output tokens to protect (default: 40,000)
  pruneMinimumSavings?: number; // Minimum tokens saved to declare pruning success (default: 20,000)
  pruneProtectedTools?: string[]; // Tool names that are never pruned (default: ["skill"])
  summarizationProvider?: string; // Provider for summarization LLM (default: "vertex")
  summarizationModel?: string; // Model for summarization LLM (default: "gemini-2.5-flash")
  keepRecentRatio?: number; // Fraction of messages to keep unsummarized (default: 0.3)
  truncationFraction?: number; // Fraction of oldest messages to remove in Stage 4 (default: 0.5)
  provider?: string; // Provider name for token estimation multipliers (default: "")
};
```

Source: `src/lib/context/contextCompactor.ts:37-65`

### `BudgetCheckResult`

Returned by `checkContextBudget()`.

```typescript
type BudgetCheckResult = {
  withinBudget: boolean; // Whether the request fits within the context window
  estimatedInputTokens: number; // Estimated total input tokens
  availableInputTokens: number; // Available input tokens for this model
  usageRatio: number; // Usage ratio (0.0–1.0+)
  shouldCompact: boolean; // Whether auto-compaction should trigger
  breakdown: {
    systemPrompt: number; // Tokens from system prompt
    conversationHistory: number; // Tokens from conversation history
    currentPrompt: number; // Tokens from current user prompt
    toolDefinitions: number; // Tokens from tool definitions (content-based: JSON.stringify(tool).length / 4)
    fileAttachments: number; // Tokens from file attachments
  };
};
```

### `BudgetCheckParams`

Parameters for `checkContextBudget()`.

```typescript
type BudgetCheckParams = {
  provider: string;
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  conversationMessages?: Array<{ role: string; content: string }>;
  currentPrompt?: string;
  toolDefinitions?: unknown[];
  fileAttachments?: Array<{ content: string }>;
  compactionThreshold?: number; // 0.0–1.0, default: 0.80
};
```

Source: `src/lib/context/budgetChecker.ts:18-54`

---

## The 4-Stage Pipeline

The `ContextCompactor` runs stages sequentially. Each stage only runs if the previous stage didn't bring tokens below the target budget.

### Stage 1: Tool Output Pruning

**File:** `src/lib/context/stages/toolOutputPruner.ts`

Walks messages backwards, protecting the most recent tool outputs, and replaces older tool results with `"[Tool result cleared]"`.

```typescript
function pruneToolOutputs(
  messages: ChatMessage[],
  config?: PruneConfig,
): PruneResult;
```

**`PruneConfig`:**

| Field            | Type       | Default     | Description                                                 |
| ---------------- | ---------- | ----------- | ----------------------------------------------------------- |
| `protectTokens`  | `number`   | `40,000`    | Token budget of recent tool outputs to protect from pruning |
| `minimumSavings` | `number`   | `20,000`    | Minimum tokens that must be saved for pruning to be applied |
| `protectedTools` | `string[]` | `["skill"]` | Tool names that are never pruned                            |
| `provider`       | `string`   | —           | Provider name for token estimation multiplier               |

**`PruneResult`:**

```typescript
type PruneResult = {
  pruned: boolean; // Whether pruning was applied (savings >= minimumSavings)
  messages: ChatMessage[];
  tokensSaved: number;
};
```

### Stage 2: File Read Deduplication

**File:** `src/lib/context/stages/fileReadDeduplicator.ts`

Detects multiple reads of the same file path. Keeps only the latest read, replaces earlier reads with `"[File <path> - refer to latest read below]"`.

```typescript
function deduplicateFileReads(messages: ChatMessage[]): DeduplicationResult;
```

**`DeduplicationResult`:**

```typescript
type DeduplicationResult = {
  deduplicated: boolean; // Whether dedup was applied (requires 30%+ savings)
  messages: ChatMessage[];
  filesDeduped: number; // Number of unique files that had duplicates removed
};
```

File read detection uses the regex pattern: `/(?:read|reading|read_file|readFile|Read file|cat)\s+['"`]?([^\s'"`\n]+)/i`

A 30% savings threshold (`DEDUP_THRESHOLD = 0.3`) must be met for deduplication to be applied.

### Stage 3: LLM Summarization

**File:** `src/lib/context/stages/structuredSummarizer.ts`

Uses the structured 9-section prompt to summarize older messages while keeping recent ones. Delegates to `generateSummary()` from the conversation memory system.

```typescript
async function summarizeMessages(
  messages: ChatMessage[],
  config?: SummarizeConfig,
): Promise<SummarizeResult>;
```

**`SummarizeConfig`:**

| Field             | Type                                | Default | Description                                            |
| ----------------- | ----------------------------------- | ------- | ------------------------------------------------------ |
| `provider`        | `string`                            | —       | Provider for the summarization LLM call                |
| `model`           | `string`                            | —       | Model for the summarization LLM call                   |
| `keepRecentRatio` | `number`                            | `0.3`   | Fraction of messages to keep unsummarized (minimum: 4) |
| `memoryConfig`    | `Partial<ConversationMemoryConfig>` | —       | Memory config passed to `generateSummary()`            |

**`SummarizeResult`:**

```typescript
type SummarizeResult = {
  summarized: boolean;
  messages: ChatMessage[]; // [summaryMessage, ...recentMessages]
  summaryText?: string; // Raw summary text
};
```

Behavior:

- Will not summarize if there are 4 or fewer messages
- Keeps at least 4 recent messages (or `keepRecentRatio` of total, whichever is greater)
- Finds and incorporates any previous summary message for iterative merging
- Summary message is inserted as a `system` role message with `metadata.isSummary = true`
- If summarization fails (LLM error), the pipeline silently falls through to Stage 4

### Stage 4: Sliding Window Truncation

**File:** `src/lib/context/stages/slidingWindowTruncator.ts`

Non-destructive fallback that removes the oldest messages from the middle of the conversation while always preserving the first user-assistant pair.

```typescript
function truncateWithSlidingWindow(
  messages: ChatMessage[],
  config?: TruncationConfig,
): TruncationResult;
```

**`TruncationConfig`:**

| Field      | Type     | Default | Description                                       |
| ---------- | -------- | ------- | ------------------------------------------------- |
| `fraction` | `number` | `0.5`   | Fraction of messages (after first pair) to remove |

**`TruncationResult`:**

```typescript
type TruncationResult = {
  truncated: boolean;
  messages: ChatMessage[]; // [firstPair..., truncationMarker, ...keptMessages]
  messagesRemoved: number; // Always an even number (maintains role alternation)
};
```

Behavior:

- Will not truncate if there are 4 or fewer messages
- Always preserves the first 2 messages (first user-assistant pair)
- Removes an even number of messages to maintain role alternation
- Inserts a `system` role truncation marker: `"[Earlier conversation history was truncated to fit within context limits]"`

---

## ChatMessage Compaction Fields

The `ChatMessage` type has five fields used for non-destructive context management:

```typescript
type ChatMessage = {
  // ... standard fields ...

  condenseId?: string; // UUID identifying this condensation group
  condenseParent?: string; // Points to the summary that replaces this message
  truncationId?: string; // UUID identifying this truncation group
  truncationParent?: string; // Points to the truncation marker that hides this message
  isTruncationMarker?: boolean; // Marks this message as a truncation boundary marker
};
```

| Field                | Purpose                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| `condenseId`         | Set on the summary message. Groups all messages that were condensed together. |
| `condenseParent`     | Set on original messages. Points to the `condenseId` of their summary.        |
| `truncationId`       | Set on the truncation marker. Groups all messages hidden by this truncation.  |
| `truncationParent`   | Set on original messages. Points to the `truncationId` of their marker.       |
| `isTruncationMarker` | `true` on the synthetic marker message inserted where messages were removed.  |

Messages with `condenseParent` or `truncationParent` are filtered out by `getEffectiveHistory()` but remain in storage for potential rewind.

Source: `src/lib/types/conversation.ts:270-279`

---

## Non-Destructive History

**File:** `src/lib/context/effectiveHistory.ts`

Messages are tagged rather than deleted, allowing compaction to be unwound.

### `getEffectiveHistory(messages)`

Returns only visible messages by filtering out those with `condenseParent` or `truncationParent`.

```typescript
function getEffectiveHistory(messages: ChatMessage[]): ChatMessage[];
```

### `tagForCondensation(messages, fromIndex, toIndex, condenseId)`

Tags messages in `[fromIndex, toIndex)` with a `condenseParent` pointing to `condenseId`.

```typescript
function tagForCondensation(
  messages: ChatMessage[],
  fromIndex: number,
  toIndex: number,
  condenseId: string,
): ChatMessage[];
```

### `tagForTruncation(messages, fromIndex, toIndex, truncationId)`

Tags messages in `[fromIndex, toIndex)` with a `truncationParent` pointing to `truncationId`.

```typescript
function tagForTruncation(
  messages: ChatMessage[],
  fromIndex: number,
  toIndex: number,
  truncationId: string,
): ChatMessage[];
```

### `removeCondensationTags(messages, condenseId)`

Removes `condenseParent` tags from messages matching `condenseId`, making them visible again. Also removes the summary message itself (matched by `condenseId` + `metadata.isSummary`).

```typescript
function removeCondensationTags(
  messages: ChatMessage[],
  condenseId: string,
): ChatMessage[];
```

### `removeTruncationTags(messages, truncationId)`

Removes `truncationParent` tags from messages matching `truncationId`, making them visible again. Also removes the truncation marker itself (matched by `truncationId` + `isTruncationMarker`).

```typescript
function removeTruncationTags(
  messages: ChatMessage[],
  truncationId: string,
): ChatMessage[];
```

---

## Token Estimation

**File:** `src/lib/utils/tokenEstimation.ts`

Character-based token estimation with per-provider adjustment multipliers. Uses the same approach as Continue (GPT-tokenizer baseline + provider multipliers) without requiring a tokenizer dependency.

### Constants

| Constant                  | Value  | Description                                            |
| ------------------------- | ------ | ------------------------------------------------------ |
| `CHARS_PER_TOKEN`         | `4`    | Characters per token for English text                  |
| `CODE_CHARS_PER_TOKEN`    | `3`    | Characters per token for code                          |
| `TOKEN_SAFETY_MARGIN`     | `1.15` | Safety margin multiplier to avoid underestimation      |
| `TOKENS_PER_MESSAGE`      | `4`    | Message framing overhead in tokens (role + delimiters) |
| `TOKENS_PER_CONVERSATION` | `24`   | Conversation-level overhead in tokens                  |
| `IMAGE_TOKEN_ESTIMATE`    | `1024` | Flat token estimate for images                         |

### Provider Multipliers

Applied on top of the base character estimate:

| Provider      | Multiplier | Notes                                         |
| ------------- | ---------- | --------------------------------------------- |
| `anthropic`   | `1.23`     | Anthropic tokenizer produces ~23% more tokens |
| `google-ai`   | `1.18`     | Google AI Studio                              |
| `vertex`      | `1.18`     | Google Vertex AI                              |
| `mistral`     | `1.26`     | Mistral / Codestral                           |
| `openai`      | `1.0`      | Baseline (GPT-style)                          |
| `azure`       | `1.0`      | Same tokenizer as OpenAI                      |
| `bedrock`     | `1.23`     | Mostly Anthropic models                       |
| `ollama`      | `1.0`      |                                               |
| `litellm`     | `1.0`      |                                               |
| `huggingface` | `1.0`      |                                               |
| `sagemaker`   | `1.0`      |                                               |

### Functions

**`estimateTokens(text, provider?, isCode?)`**

Estimate token count for a string.

```typescript
function estimateTokens(
  text: string,
  provider?: string,
  isCode?: boolean,
): number;
```

Formula: `ceil(text.length / charsPerToken) * providerMultiplier * TOKEN_SAFETY_MARGIN`

**`estimateMessagesTokens(messages, provider?)`**

Estimate total token count for an array of messages, including per-message overhead and conversation-level overhead.

```typescript
function estimateMessagesTokens(
  messages: Array<ChatMessage | { role: string; content: string }>,
  provider?: string,
): number;
```

**`truncateToTokenBudget(text, maxTokens, provider?)`**

Truncate text to fit within a token budget. Tries to cut at sentence or word boundaries. Appends `"..."` if truncated.

```typescript
function truncateToTokenBudget(
  text: string,
  maxTokens: number,
  provider?: string,
): { text: string; truncated: boolean };
```

---

## Context Window Registry

**File:** `src/lib/constants/contextWindows.ts`

### Constants

| Constant                       | Value     | Description                                   |
| ------------------------------ | --------- | --------------------------------------------- |
| `DEFAULT_CONTEXT_WINDOW`       | `128,000` | Fallback when provider/model is unknown       |
| `MAX_DEFAULT_OUTPUT_RESERVE`   | `64,000`  | Maximum output reserve when maxTokens not set |
| `DEFAULT_OUTPUT_RESERVE_RATIO` | `0.35`    | Default output reserve as fraction of context |

### Functions

**`getContextWindowSize(provider, model?)`**

Resolve context window size. Priority: exact model match > provider `_default` > global `DEFAULT_CONTEXT_WINDOW`. Also supports partial model name prefix matching.

```typescript
function getContextWindowSize(provider: string, model?: string): number;
```

**`getAvailableInputTokens(provider, model?, maxTokens?)`**

Calculate available input tokens: `contextWindow - outputReserve`.

```typescript
function getAvailableInputTokens(
  provider: string,
  model?: string,
  maxTokens?: number,
): number;
```

**`getOutputReserve(contextWindow, maxTokens?)`**

Calculate output token reserve. Uses explicit `maxTokens` if provided, otherwise `min(MAX_DEFAULT_OUTPUT_RESERVE, contextWindow * DEFAULT_OUTPUT_RESERVE_RATIO)`.

```typescript
function getOutputReserve(contextWindow: number, maxTokens?: number): number;
```

### `MODEL_CONTEXT_WINDOWS`

Complete per-provider, per-model context window registry:

| Provider        | Model                                       | Context Window |
| --------------- | ------------------------------------------- | -------------- |
| **anthropic**   | `_default`                                  | 200,000        |
|                 | `claude-opus-4-20250514`                    | 200,000        |
|                 | `claude-sonnet-4-20250514`                  | 200,000        |
|                 | `claude-3-7-sonnet-20250219`                | 200,000        |
|                 | `claude-3-5-sonnet-20241022`                | 200,000        |
|                 | `claude-3-5-haiku-20241022`                 | 200,000        |
|                 | `claude-3-opus-20240229`                    | 200,000        |
|                 | `claude-3-sonnet-20240229`                  | 200,000        |
|                 | `claude-3-haiku-20240307`                   | 200,000        |
| **openai**      | `_default`                                  | 128,000        |
|                 | `gpt-4o`                                    | 128,000        |
|                 | `gpt-4o-mini`                               | 128,000        |
|                 | `gpt-4-turbo`                               | 128,000        |
|                 | `gpt-4`                                     | 8,192          |
|                 | `gpt-3.5-turbo`                             | 16,385         |
|                 | `o1`                                        | 200,000        |
|                 | `o1-mini`                                   | 128,000        |
|                 | `o1-pro`                                    | 200,000        |
|                 | `o3`                                        | 200,000        |
|                 | `o3-mini`                                   | 200,000        |
|                 | `o4-mini`                                   | 200,000        |
|                 | `gpt-4.1`                                   | 1,047,576      |
|                 | `gpt-4.1-mini`                              | 1,047,576      |
|                 | `gpt-4.1-nano`                              | 1,047,576      |
|                 | `gpt-5`                                     | 1,047,576      |
| **google-ai**   | `_default`                                  | 1,048,576      |
|                 | `gemini-2.5-pro`                            | 1,048,576      |
|                 | `gemini-2.5-flash`                          | 1,048,576      |
|                 | `gemini-2.0-flash`                          | 1,048,576      |
|                 | `gemini-1.5-pro`                            | 2,097,152      |
|                 | `gemini-1.5-flash`                          | 1,048,576      |
|                 | `gemini-3-flash-preview`                    | 1,048,576      |
|                 | `gemini-3-pro-preview`                      | 1,048,576      |
| **vertex**      | `_default`                                  | 1,048,576      |
|                 | `gemini-2.5-pro`                            | 1,048,576      |
|                 | `gemini-2.5-flash`                          | 1,048,576      |
|                 | `gemini-2.0-flash`                          | 1,048,576      |
|                 | `gemini-1.5-pro`                            | 2,097,152      |
|                 | `gemini-1.5-flash`                          | 1,048,576      |
| **bedrock**     | `_default`                                  | 200,000        |
|                 | `anthropic.claude-3-5-sonnet-20241022-v2:0` | 200,000        |
|                 | `anthropic.claude-3-5-haiku-20241022-v1:0`  | 200,000        |
|                 | `anthropic.claude-3-opus-20240229-v1:0`     | 200,000        |
|                 | `anthropic.claude-3-sonnet-20240229-v1:0`   | 200,000        |
|                 | `anthropic.claude-3-haiku-20240307-v1:0`    | 200,000        |
|                 | `amazon.nova-pro-v1:0`                      | 300,000        |
|                 | `amazon.nova-lite-v1:0`                     | 300,000        |
| **azure**       | `_default`                                  | 128,000        |
|                 | `gpt-4o`                                    | 128,000        |
|                 | `gpt-4o-mini`                               | 128,000        |
|                 | `gpt-4-turbo`                               | 128,000        |
|                 | `gpt-4`                                     | 8,192          |
| **mistral**     | `_default`                                  | 128,000        |
|                 | `mistral-large-latest`                      | 128,000        |
|                 | `mistral-medium-latest`                     | 32,000         |
|                 | `mistral-small-latest`                      | 128,000        |
|                 | `codestral-latest`                          | 256,000        |
| **ollama**      | `_default`                                  | 128,000        |
| **litellm**     | `_default`                                  | 128,000        |
| **huggingface** | `_default`                                  | 32,000         |
| **sagemaker**   | `_default`                                  | 128,000        |

---

## Error Detection

**File:** `src/lib/context/errorDetection.ts`

Cross-provider regex patterns to detect context window overflow errors.

### `isContextOverflowError(error)`

Returns `true` if the error matches any known context overflow pattern.

```typescript
function isContextOverflowError(error: unknown): boolean;
```

Accepts `Error` objects, strings, or objects with `message`/`error` properties. Also inspects `error.cause` for nested errors.

### `getContextOverflowProvider(error)`

Identifies which provider produced the context overflow error.

```typescript
function getContextOverflowProvider(error: unknown): string | null;
```

Returns the provider name string or `null` if no match.

### Supported Provider Patterns

| Provider     | Error Patterns                                                                            |
| ------------ | ----------------------------------------------------------------------------------------- |
| `openai`     | `"This model's maximum context length is"`, `"reduce the length of the messages"`         |
| `azure`      | `"content_length_exceeded"`                                                               |
| `google`     | `"RESOURCE_EXHAUSTED"`, `"exceeds the maximum number of tokens"`, `"content is too long"` |
| `bedrock`    | `"ValidationException.*token"`, `"Input is too long"`, `"exceeds the model's maximum"`    |
| `mistral`    | `"context length exceeded"`, `"maximum number of tokens"`                                 |
| `openrouter` | `"context_length_exceeded"`                                                               |
| `anthropic`  | `"prompt is too long"`, `"input is too long"`, `"too many tokens"`                        |

### Non-Retryable Error Handling

When `isContextOverflowError()` detects that an error is a context overflow, the MCP generation retry loop (`performMCPGenerationRetries`) breaks immediately instead of retrying up to 3 times. This prevents wasting API calls on errors that cannot succeed without compaction.

Additionally, errors with `statusCode === 400` or `isRetryable === false` are treated as non-retryable and break the retry loop immediately.

### Post-Failure Compaction Passthrough

When a generation call fails with a context overflow error and compaction is triggered, the compacted messages are passed through via `options.conversationMessages` to `directProviderGeneration()`, which uses them instead of re-fetching from memory. The compaction target is set to `Math.floor(availableInputTokens * 0.7)` (70% of available context) to leave headroom.

---

## Tool Output Limits

**File:** `src/lib/context/toolOutputLimits.ts`

Truncates individual tool outputs that exceed size limits. Can optionally save the full output to disk.

### Constants

| Constant                | Value           | Description                  |
| ----------------------- | --------------- | ---------------------------- |
| `MAX_TOOL_OUTPUT_BYTES` | `51200` (50 KB) | Maximum tool output in bytes |
| `MAX_TOOL_OUTPUT_LINES` | `2000`          | Maximum tool output lines    |

### `truncateToolOutput(output, options?)`

```typescript
function truncateToolOutput(
  output: string,
  options?: TruncateOptions,
): TruncateResult;
```

**`TruncateOptions`:**

```typescript
type TruncateOptions = {
  maxBytes?: number; // Default: MAX_TOOL_OUTPUT_BYTES (51200)
  maxLines?: number; // Default: MAX_TOOL_OUTPUT_LINES (2000)
  direction?: "head" | "tail"; // Which end to keep (default: "tail")
  saveToDisk?: boolean; // Save full output to disk (default: false)
  saveDir?: string; // Directory for saved output (default: os.tmpdir()/neurolink-tool-output)
};
```

**`TruncateResult`:**

```typescript
type TruncateResult = {
  content: string; // Truncated content with notice appended
  truncated: boolean; // Whether truncation was applied
  savedPath?: string; // Path to saved full output (if saveToDisk was true)
  originalSize: number; // Original size in bytes
};
```

When truncated, a notice is appended: `[Output truncated from X bytes to Y bytes]` (with optional saved path).

---

## File Token Budget

**File:** `src/lib/context/fileTokenBudget.ts`

Calculates how much of the remaining context window can be used for file reads. Implements fast-path for small files and preview mode for very large files.

### Constants

| Constant                   | Value             | Description                                       |
| -------------------------- | ----------------- | ------------------------------------------------- |
| `FILE_READ_BUDGET_PERCENT` | `0.6`             | 60% of remaining context allocated for file reads |
| `FILE_FAST_PATH_SIZE`      | `102400` (100 KB) | Files below this size skip budget validation      |
| `FILE_PREVIEW_MODE_SIZE`   | `5242880` (5 MB)  | Files above this size get preview-only mode       |
| `FILE_PREVIEW_CHARS`       | `2000`            | Default preview size in characters                |

### `calculateFileTokenBudget(contextWindow, currentTokens, maxOutputTokens)`

Calculate available token budget for file reads.

```typescript
function calculateFileTokenBudget(
  contextWindow: number,
  currentTokens: number,
  maxOutputTokens: number,
): number;
```

Formula: `floor((contextWindow - currentTokens - maxOutputTokens) * FILE_READ_BUDGET_PERCENT)`

Returns `0` if remaining tokens is zero or negative.

### `enforceAggregateFileBudget(files, provider, model, maxTokens)`

**File:** `src/lib/context/fileTokenBudget.ts`

Enforces a total token budget across all file attachments in a single request. When the aggregate content of all files exceeds the available context budget, files are truncated proportionally or dropped to fit.

This prevents the scenario where multiple large file attachments (e.g., 5 files totaling 2.8 MB) overflow the context window on the very first message — before any conversation history exists to compact.

```typescript
function enforceAggregateFileBudget(
  files: Array<{ content: string; path?: string }>,
  provider: string,
  model?: string,
  maxTokens?: number,
): Array<{ content: string; path?: string }>;
```

Called automatically by `buildMultimodalMessagesArray()` before the file processing loop.

### `shouldTruncateFile(fileSize, budget)`

Determine how a file should be handled based on its size and the token budget.

```typescript
function shouldTruncateFile(
  fileSize: number,
  budget: number,
): { shouldTruncate: boolean; maxChars?: number; previewMode?: boolean };
```

Decision logic:

- `fileSize > FILE_PREVIEW_MODE_SIZE (5MB)` → preview mode (2000 chars)
- `fileSize < FILE_FAST_PATH_SIZE (100KB)` → no truncation
- Otherwise → estimate tokens at 4 chars/token, truncate if exceeds budget

---

## Tool Pair Repair

**File:** `src/lib/context/toolPairRepair.ts`

After compaction, tool_call/tool_result pairs may become orphaned (one half removed while the other remains). `repairToolPairs` validates every pair and inserts synthetic placeholders where needed.

```typescript
function repairToolPairs(messages: ChatMessage[]): RepairResult;
```

**`RepairResult`:**

```typescript
type RepairResult = {
  repaired: boolean; // Whether any repairs were made
  messages: ChatMessage[]; // Repaired message array (or original if no repairs)
  orphanedCallsFixed: number; // Number of tool_calls that got synthetic results
  orphanedResultsFixed: number; // Number of tool_results that got synthetic calls
};
```

Behavior:

- A `tool_call` without a following `tool_result` gets a synthetic result: `"[Tool result unavailable - conversation was compacted]"`
- A `tool_result` without a preceding `tool_call` gets a synthetic call: `"[Tool call for <tool> - conversation was compacted]"`
- Synthetic messages have `metadata.truncated = true`

This runs automatically after `compactSession()`.

---

## CLI Session Warnings

**File:** `src/cli/loop/session.ts:300-354`

In loop mode, the CLI checks context budget after each turn and displays warnings:

**At >60% usage** (informational, gray text):

```
  Context: 65% used
```

**At >=80% usage** (warning, yellow text — compaction threshold reached):

```
  Context usage: 83% of window (166,000 / 200,000 tokens)
  Auto-compaction will trigger to preserve conversation quality.
```

These warnings only appear when `contextCompaction.enabled` is `true` in the session config.

---

## Provider Support

Summary table of default context windows by provider:

| Provider     | Default Context Window | Notable Models                                     |
| ------------ | ---------------------- | -------------------------------------------------- |
| Anthropic    | 200,000                | All Claude 3/3.5/4 models                          |
| OpenAI       | 128,000                | GPT-4o, o1/o3 (200K), GPT-4.1/GPT-5 (1M+)          |
| Google AI    | 1,048,576              | Gemini 2.x/3.x (1M), Gemini 1.5 Pro (2M)           |
| Vertex       | 1,048,576              | Gemini 2.x (1M), Gemini 1.5 Pro (2M)               |
| Bedrock      | 200,000                | Claude models (200K), Nova (300K)                  |
| Azure        | 128,000                | GPT-4o, GPT-4-turbo; GPT-4 (8K)                    |
| Mistral      | 128,000                | Large/Small (128K), Medium (32K), Codestral (256K) |
| Ollama       | 128,000                | Configurable per model                             |
| LiteLLM      | 128,000                | Passthrough to underlying provider                 |
| Hugging Face | 32,000                 | Model-dependent                                    |
| SageMaker    | 128,000                | Model-dependent                                    |

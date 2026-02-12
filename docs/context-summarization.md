# 🧠 Automatic Conversation Summarization

NeuroLink includes a powerful feature for automatic context summarization, designed to enable long-running, stateful conversations without exceeding AI provider token limits. This feature is part of the **Conversation Memory** system.

## Overview

When building conversational agents, the history of the conversation can quickly grow too large for the AI model's context window. Manually managing this history is complex and error-prone. The Automatic Conversation Summarization feature handles this for you.

When enabled, the `NeuroLink` instance will keep track of the entire conversation for each session. If a conversation's length (measured in turns) exceeds a configurable limit, the feature will automatically use an AI model to summarize the history. This summary then replaces the older parts of the conversation, preserving the essential context while keeping the overall history size manageable.

## How to Use

The feature is part of the `conversationMemory` system and is enabled and configured in the `NeuroLink` constructor.

### Enabling Summarization

To enable the feature, you must enable both `conversationMemory` and `enableSummarization` in the constructor configuration.

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Enable conversation memory and summarization with default settings
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    enableSummarization: true,
  },
});

// All generate calls with a sessionId will now be context-aware and summarize automatically
await neurolink.generate({
  input: { text: "This is the first turn." },
  context: { sessionId: "session-123" },
});
```

### Custom Configuration

You can easily override the default settings by providing more options in the configuration object.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    enableSummarization: true,
    // Trigger summarization when turn count exceeds 15
    summarizationThresholdTurns: 15,
    // Keep the last 5 turns and summarize the rest
    summarizationTargetTurns: 5,
    // Use a specific provider and model for the summarization task
    summarizationProvider: "openai",
    summarizationModel: "gpt-4o-mini",
  },
});
```

## Configuration Options

The `conversationMemory` configuration object accepts the following properties related to summarization:

- `enableSummarization: boolean`
  - **Description**: Set to `true` to enable the automatic summarization feature. `enabled` must also be `true`.
  - **Default**: `false`

- `summarizationThresholdTurns: number`
  - **Description**: The number of turns after which summarization should be triggered.
  - **Default**: `20`
  - **Note**: This is a **legacy option**. The newer `SummarizationEngine` uses token-based thresholds instead of turn counts. See [Token-Based vs Turn-Based Summarization](#token-based-vs-turn-based-summarization) below.

- `summarizationTargetTurns: number`
  - **Description**: The number of recent turns to _keep_ when a summary is created. The older turns will be replaced by the summary.
  - **Default**: `10`
  - **Note**: This is a **legacy option**. The token-based engine calculates the split point dynamically using a `RECENT_MESSAGES_RATIO` (default 30% of the threshold) rather than a fixed turn count.

- `tokenThreshold: number`
  - **Description**: Token-based threshold that triggers summarization. When the estimated token count of context messages exceeds this value, summarization is triggered automatically. If not set, the threshold is calculated as 80% of the model's available input tokens (looked up from the context window registry).
  - **Default**: Computed from the model's context window, or `50000` as a fallback for unknown models. Can be overridden via the `NEUROLINK_TOKEN_THRESHOLD` environment variable.

- `summarizationModel: string`
  - **Description**: The specific AI model to use for the summarization task. It's recommended to use a fast and cost-effective model.
  - **Default**: `"gemini-2.5-flash"`

- `summarizationProvider: string`
  - **Description**: The AI provider to use for the summarization task.
  - **Default**: `"vertex"`

## Order of Operations

To prevent race conditions and ensure correct context management, the system follows a strict order of operations after each AI response is generated:

1.  The new turn (user prompt + AI response) is added to the session's history.
2.  The system checks if the total number of turns now exceeds `summarizationThresholdTurns`.
3.  If it does, the oldest turns are summarized, and the history is replaced with a `system` message containing the summary, followed by the most recent turns (as defined by `summarizationTargetTurns`).
4.  Finally, the system checks if the total number of turns exceeds `maxTurnsPerSession` and truncates the oldest messages if necessary.

This ensures that summarization always happens _before_ simple truncation, preserving the context of long conversations.

## Context Compaction System

The turn-based summarization described above is now complemented by a full
**Context Compaction System** that operates at the token level rather than the
turn level. See the [Context Compaction Guide](./features/context-compaction.md)
for the complete specification.

The compaction system provides a 4-stage reduction pipeline:

1. **Tool Output Pruning** -- replaces old tool results with lightweight placeholders.
2. **File Read Deduplication** -- keeps only the latest read of each file path.
3. **LLM Summarization** -- produces a structured 9-section summary with iterative merging.
4. **Sliding Window Truncation** -- non-destructive tagging of the oldest messages.

Key components:

- **BudgetChecker** (`src/lib/context/budgetChecker.ts`) validates that the context fits
  within the model's window before every LLM call. When usage exceeds 80 %, it
  automatically triggers compaction.
- **ContextCompactor** (`src/lib/context/contextCompactor.ts`) orchestrates the
  multi-stage pipeline described above.
- **`getContextStats()` API** returns live token counts, capacity, and per-stage
  reduction metrics so callers can monitor context health programmatically.

## SummarizationEngine

The `SummarizationEngine` class (`src/lib/context/summarizationEngine.ts`) is the shared, centralized engine used by both `ConversationMemoryManager` (in-memory) and `RedisConversationMemoryManager` (Redis-backed). It was extracted from those two managers to eliminate code duplication and ensure consistent summarization behavior regardless of the storage backend.

The engine is responsible for:

- **Token-based threshold checking** — it estimates the total token count of a session's context messages (using `TokenUtils.estimateTokenCount`) and compares it against a configurable threshold. If the count exceeds the threshold, summarization is triggered.
- **Split-point calculation** — rather than using a fixed turn count, the engine works backwards from the most recent message to find a split point based on a target token budget for recent messages (controlled by `RECENT_MESSAGES_RATIO`, default 30% of the threshold). Messages before the split point are summarized; messages after it are kept as-is.
- **Pointer-based, non-destructive summarization** — the engine tracks which messages have already been summarized via a `summarizedUpToMessageId` pointer on the session. Original messages are never deleted; the pointer simply advances forward as new summaries are generated.
- **Delegating to `generateSummary()`** — the actual LLM call to produce the summary text is handled by the `generateSummary()` utility in `src/lib/utils/conversationMemory.ts`, which constructs the structured prompt and invokes the configured summarization provider/model.

### Usage

Both memory managers call `SummarizationEngine.checkAndSummarize()` after storing each new conversation turn:

```typescript
const engine = new SummarizationEngine();
const wasSummarized = await engine.checkAndSummarize(
  session, // SessionMemory object
  threshold, // Token threshold (e.g. 80% of context window)
  config, // ConversationMemoryConfig
  "[MyManager]", // Log prefix
);
```

## Structured Summary: The 9-Section Format

When summarization runs, the conversation history is distilled into a structured summary with exactly **9 sections**. This structure is defined in `src/lib/context/prompts/summarizationPrompt.ts` and ensures that summaries are comprehensive, consistent, and easy for the AI to consume as context.

The 9 sections are:

1. **Primary Request and Intent** — What is the user's main goal or request? What are they trying to accomplish?
2. **Key Technical Concepts** — What technologies, frameworks, patterns, or concepts are central to this conversation?
3. **Files and Code Sections** — What specific files, functions, or code sections have been discussed or modified?
4. **Problem Solving** — What problems were identified? What solutions were attempted or implemented?
5. **Pending Tasks** — What tasks remain incomplete or need follow-up?
6. **Task Evolution** — How has the task changed or evolved during the conversation?
7. **Current Work** — What is being actively worked on right now?
8. **Next Step** — What is the immediate next action to take?
9. **Required Files** — What files will need to be accessed or modified to continue?

If a section is not applicable to the conversation, the summarizer writes "N/A" for that section. The prompt also supports an optional **File Context** addendum listing files read and files modified during the conversation, which is appended to the prompt when available.

## Incremental Merge Mode

When summarization runs **more than once** during a long conversation, the system uses an **incremental merge** strategy to avoid information loss. This is controlled by the `isIncremental` flag and `previousSummary` field in the `SummarizationPromptOptions` interface.

Here is how it works:

1. On the **first** summarization, an initial prompt is used that asks the LLM to analyze the conversation and produce a fresh 9-section summary.
2. On **subsequent** summarizations, the prompt switches to incremental mode. The existing summary is included verbatim in the prompt under an "Existing Summary" block, and the LLM is instructed to **merge** the new conversation content into the existing sections.
3. The merge instructions tell the LLM to:
   - Review the existing summary
   - Analyze the new conversation content
   - Merge new information into the appropriate sections
   - Update sections with relevant new information
   - Remove information that is no longer relevant
   - Keep the summary concise but comprehensive
   - Maintain the 9-section format

This incremental approach means that context accumulated over many summarization cycles is preserved and refined, rather than being discarded and regenerated from scratch each time. The `createSummarizationPrompt()` function in `src/lib/utils/conversationMemory.ts` handles this automatically — it checks whether a `previousSummary` exists on the session and sets `isIncremental: true` when one is present.

## Token-Based vs Turn-Based Summarization

The original summarization system used a **turn-based** approach: summarization was triggered when the number of conversation turns exceeded `summarizationThresholdTurns` (default: 20), and a fixed number of recent turns (`summarizationTargetTurns`, default: 10) were kept.

The newer `SummarizationEngine` replaces this with a **token-based** approach:

| Aspect               | Turn-Based (Legacy)                              | Token-Based (Current)                                                                                |
| -------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Trigger**          | Turn count exceeds `summarizationThresholdTurns` | Estimated token count exceeds `tokenThreshold`                                                       |
| **What to keep**     | Fixed `summarizationTargetTurns` recent turns    | Dynamic split point calculated from `RECENT_MESSAGES_RATIO` (30% of threshold in tokens)             |
| **Threshold source** | Hardcoded default (20 turns)                     | Computed from model's context window (80% of available input tokens) via `getAvailableInputTokens()` |
| **Fallback**         | N/A                                              | `50000` tokens if model context window is unknown                                                    |
| **Override**         | Constructor config only                          | `NEUROLINK_TOKEN_THRESHOLD` env var, session-level override, or constructor config                   |

**Why the change?** Turn counting is a poor proxy for actual context window usage. A single turn with a large code block or document attachment may consume far more tokens than 10 short chat turns. Token-based thresholds align summarization decisions with the actual constraint that matters: the model's context window size.

The legacy turn-based configuration options (`summarizationThresholdTurns`, `summarizationTargetTurns`, `maxTurnsPerSession`) are still accepted for backward compatibility but are marked as deprecated. New integrations should use the token-based `tokenThreshold` configuration or rely on the automatic model-aware defaults.

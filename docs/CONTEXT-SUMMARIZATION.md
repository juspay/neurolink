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

- `summarizationTargetTurns: number`

  - **Description**: The number of recent turns to _keep_ when a summary is created. The older turns will be replaced by the summary.
  - **Default**: `10`

- `summarizationModel: string`

  - **Description**: The specific AI model to use for the summarization task. It's recommended to use a fast and cost-effective model.
  - **Default**: `"gemini-2.5-flash"`

- `summarizationProvider: string`
  - **Description**: The AI provider to use for the summarization task.
  - **Default**: `"googlevertex"`

## Order of Operations

To prevent race conditions and ensure correct context management, the system follows a strict order of operations after each AI response is generated:

1.  The new turn (user prompt + AI response) is added to the session's history.
2.  The system checks if the total number of turns now exceeds `summarizationThresholdTurns`.
3.  If it does, the oldest turns are summarized, and the history is replaced with a `system` message containing the summary, followed by the most recent turns (as defined by `summarizationTargetTurns`).
4.  Finally, the system checks if the total number of turns exceeds `maxTurnsPerSession` and truncates the oldest messages if necessary.

This ensures that summarization always happens _before_ simple truncation, preserving the context of long conversations.

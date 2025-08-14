# 🧠 Automatic Context Summarization

NeuroLink includes a powerful feature for automatic context summarization, designed to enable long-running, stateful conversations without exceeding AI provider token limits.

## Overview

When building conversational agents, the history of the conversation can quickly grow too large for the AI model's context window. Manually managing this history is complex and error-prone. The Automatic Context Summarization feature handles this for you.

When enabled, the `NeuroLink` instance will keep track of the entire conversation. If the conversation's length (measured in words) exceeds a configurable limit, the feature will automatically use an AI model to summarize the history, replacing the long conversation with a concise summary. This process is seamless and preserves the essential context of the conversation.

## How to Use

The feature is **off by default** to ensure backward compatibility. You can enable it on any `NeuroLink` instance using the `enableContextSummarization` method.

### Basic Usage

To enable the feature with default settings:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Enable context summarization
neurolink.enableContextSummarization();

// Now, all subsequent calls to `generate` will be context-aware
for (const prompt of conversation) {
  await neurolink.generate({ input: { text: prompt } });
}
```

### Custom Configuration

You can easily override the default settings by passing a configuration object to the method.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

neurolink.enableContextSummarization({
  // Trigger summarization when word count exceeds 2000
  highWaterMarkWords: 2000,
  // Aim for a summary of around 500 words
  lowWaterMarkWords: 500,
  // Use a specific provider and model for the summarization task
  summarizationProvider: "openai",
  summarizationModel: "gpt-4o-mini",
});
```

## Configuration Options

The `enableContextSummarization` method accepts an optional configuration object with the following properties:

- `highWaterMarkWords: number`
  - **Description**: The word count at which to trigger the summarization process.
  - **Default**: `3000`

- `lowWaterMarkWords: number`
  - **Description**: The target word count for the generated summary. The summarization prompt will instruct the AI to aim for this length.
  - **Default**: `800`

- `summarizationModel: string`
  - **Description**: The specific AI model to use for the summarization task. It's recommended to use a fast and cost-effective model.
  - **Default**: `"gemini-2.5-flash"`

- `summarizationProvider: string`
  - **Description**: The AI provider to use for the summarization task.
  - **Default**: `"googlevertex"`

- `getSummarizationPrompt: (history: ChatMessage[], wordLimit: number) => string`
  - **Description**: A function that generates the prompt sent to the summarization model. You can provide your own function to customize the summarization instructions.
  - **Default**: A built-in function that creates a robust prompt asking for a concise, third-person narrative.

- `estimateWordCount: (history: ChatMessage[]) => number`
  - **Description**: A function that estimates the word count of the conversation history.
  - **Default**: A simple function that splits text by whitespace.

## Error Handling & Fallbacks

The Context Summarizer is designed to be resilient.

- **If the summarization API call fails:** The manager will log the error and then truncate the conversation history to the `lowWaterMarkWords` limit to prevent subsequent errors. A system warning will be prepended to the new context.
- **If the summarizer returns empty or invalid content:** The manager will log a warning and perform the same truncation fallback, preserving the most recent part of the conversation.

This ensures that even if the summarization process encounters an issue, your application can continue to function without crashing due to an oversized context.

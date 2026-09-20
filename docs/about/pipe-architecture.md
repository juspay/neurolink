---
id: pipe-architecture
title: Pipe Architecture
sidebar_label: Pipe Architecture
---

# Pipe Architecture

Every `generate()` and `stream()` call travels the same six-stage pipe. Understanding the pipe is understanding NeuroLink.

## The Six Stages

### 1. Context Building

Before any tokens are generated, the pipe assembles the full context:

- **RAG retrieval** — If `rag: { files: [...] }` is set, documents are chunked, embedded, and a `search_knowledge_base` tool is registered
- **Memory lookup** — Conversation history fetched from Redis or in-memory store
- **File processing** — Attached files (images, PDFs, code, CSV) processed by `ProcessorRegistry` into provider-appropriate formats
- **System prompt injection** — Custom system prompts merged with NeuroLink defaults

### 2. Budget Check

`BudgetChecker` validates the assembled context fits within the model's context window before every LLM call.

- Threshold: triggers at **80% of context window**
- If over budget: runs `ContextCompactor` (5-stage pipeline): 0. Relevance drop — asks a decision model which earlier messages the current
  request still needs (skipped entirely without a decision provider)
  1. Tool output pruning — replaces old tool results with placeholders
  2. File read deduplication — keeps only latest read of each file
  3. LLM summarization — structured 10-section summary of oldest messages
  4. Sliding window truncation — non-destructive tagging of oldest messages

Context windows are tracked per-provider, per-model in `src/lib/constants/contextWindows.ts`.

### 3. Provider Dispatch

`ProviderRegistry` resolves the provider name to a concrete implementation:

```typescript
// All providers loaded via dynamic import to prevent circular dependencies
ProviderFactory.registerProvider(
  AIProviderName.ANTHROPIC,
  async (modelName?) => {
    const { AnthropicProvider } = await import("../providers/anthropic.js");
    return new AnthropicProvider(modelName);
  },
  AnthropicModels.CLAUDE_SONNET_4_5,
  ["claude", "sonnet", "haiku"],
);
```

Switching providers requires one line — the rest of the pipe is unchanged.

### 4. Stream Emission

Tokens arrive as an async iterable. `generate()` is `stream()` collected — there is only `stream()`.

```typescript
// This is what generate() does internally
let text = "";
for await (const token of this.stream(options)) {
  text += token;
}
return { text };
```

The stream handles multiple event types: text deltas, tool calls, thinking blocks, usage statistics.

### 5. Tool Interception

When the model emits a tool call, the stream pauses:

1. Tool call extracted from the stream
2. `MCPToolRegistry` dispatches to the correct tool (built-in or external MCP server)
3. Tool result injected back into the conversation
4. Model resumes generating from the tool result
5. Stream continues

MCP transports supported: `stdio` (local), `http` (remote), `sse`, `websocket`.

### 6. Observability

Every stage emits OpenTelemetry spans. The full trace covers:

- Context build duration
- Token counts (input + output)
- Tool execution times
- Memory read/write latency
- Provider-specific attributes (model, temperature, finish reason)

Exporters: Langfuse, OTLP, Jaeger, Zipkin, Prometheus, Datadog, NewRelic, Honeycomb, Console.

## Key Files

| File                                    | Purpose                                      |
| --------------------------------------- | -------------------------------------------- |
| `src/lib/neurolink.ts`                  | Main SDK class — orchestrates all six stages |
| `src/lib/factories/providerRegistry.ts` | Provider registration with dynamic imports   |
| `src/lib/context/budgetChecker.ts`      | Pre-generation context budget validation     |
| `src/lib/context/contextCompactor.ts`   | Multi-stage compaction orchestrator          |
| `src/lib/mcp/toolRegistry.ts`           | Tool management and MCP integration          |
| `src/lib/rag/ragIntegration.ts`         | RAG auto-pipeline setup                      |
| `src/lib/telemetry/`                    | OpenTelemetry instrumentation                |

## Design Invariants

These never change regardless of provider, model, or connector:

1. **Dynamic imports only** — No static imports of providers in the registry (prevents circular deps)
2. **Stream is the primitive for text** — `generate()` is always stream collected; nothing in the text path bypasses `stream()`. `decide()` is a separate inference type that returns typed judgments and never enters this path.
3. **Budget checked before every text call** — no `generate()`/`stream()` call without a budget check. A `decide()` call carries its own input ceilings instead, enforced by the provider.
4. **Tools are always external** — MCP protocol for all tool integrations, including built-ins
5. **Memory is scoped** — Each conversation has isolated memory; no cross-contamination

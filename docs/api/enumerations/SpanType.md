[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanType

# Enumeration: SpanType

Defined in: [types/span.ts:10](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L10)

Span types for AI operations
Following OTel GenAI conventions for span categorization

## Enumeration Members

### AGENT_RUN

> **AGENT_RUN**: `"agent.run"`

Defined in: [types/span.ts:12](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L12)

Agent execution run (reserved for future multi-agent support)

---

### WORKFLOW_STEP

> **WORKFLOW_STEP**: `"workflow.step"`

Defined in: [types/span.ts:14](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L14)

Workflow step execution (reserved for future workflow engine)

---

### TOOL_CALL

> **TOOL_CALL**: `"tool.call"`

Defined in: [types/span.ts:16](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L16)

Tool/function call

---

### MODEL_GENERATION

> **MODEL_GENERATION**: `"model.generation"`

Defined in: [types/span.ts:18](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L18)

LLM generation request

---

### MODEL_DECISION

> **MODEL_DECISION**: `"model.decision"`

Defined in: [types/span.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L29)

Decision-model request (the `decide` inference type).

Deliberately NOT folded into MODEL_GENERATION. A decision emits no text,
so it has no output tokens, no finish reason and a latency distribution
roughly an order of magnitude tighter; counting it as a generation would
distort generation counts, p50/p95 latency and the output-token
aggregate simultaneously, and would make a cost dashboard attribute
fractions of a cent to the same bucket as a frontier model.

---

### EMBEDDING

> **EMBEDDING**: `"embedding"`

Defined in: [types/span.ts:31](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L31)

Embedding generation (reserved for future embedding API)

---

### RETRIEVAL

> **RETRIEVAL**: `"retrieval"`

Defined in: [types/span.ts:33](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L33)

Retrieval operation (reserved for future RAG support)

---

### MEMORY

> **MEMORY**: `"memory"`

Defined in: [types/span.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L35)

Memory operation

---

### CONTEXT_COMPACTION

> **CONTEXT_COMPACTION**: `"context.compaction"`

Defined in: [types/span.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L37)

Context compaction operation

---

### RAG

> **RAG**: `"rag"`

Defined in: [types/span.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L39)

RAG pipeline operation

---

### EVALUATION

> **EVALUATION**: `"evaluation"`

Defined in: [types/span.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L41)

Evaluation/scoring operation

---

### MCP_TRANSPORT

> **MCP_TRANSPORT**: `"mcp.transport"`

Defined in: [types/span.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L43)

MCP transport operation

---

### MEDIA_GENERATION

> **MEDIA_GENERATION**: `"media.generation"`

Defined in: [types/span.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L45)

Media generation (image/video)

---

### PPT_GENERATION

> **PPT_GENERATION**: `"ppt.generation"`

Defined in: [types/span.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L47)

PPT/presentation generation

---

### WORKFLOW

> **WORKFLOW**: `"workflow"`

Defined in: [types/span.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L49)

Workflow execution

---

### TTS

> **TTS**: `"tts"`

Defined in: [types/span.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L51)

TTS synthesis

---

### STT

> **STT**: `"stt"`

Defined in: [types/span.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L53)

STT transcription

---

### SERVER_REQUEST

> **SERVER_REQUEST**: `"server.request"`

Defined in: [types/span.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L55)

Server adapter request

---

### CUSTOM

> **CUSTOM**: `"custom"`

Defined in: [types/span.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L57)

Custom span

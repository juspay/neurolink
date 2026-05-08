[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanType

# Enumeration: SpanType

Defined in: [types/span.ts:10](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L10)

Span types for AI operations
Following OTel GenAI conventions for span categorization

## Enumeration Members

### AGENT_RUN

> **AGENT_RUN**: `"agent.run"`

Defined in: [types/span.ts:12](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L12)

Agent execution run (reserved for future multi-agent support)

---

### WORKFLOW_STEP

> **WORKFLOW_STEP**: `"workflow.step"`

Defined in: [types/span.ts:14](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L14)

Workflow step execution (reserved for future workflow engine)

---

### TOOL_CALL

> **TOOL_CALL**: `"tool.call"`

Defined in: [types/span.ts:16](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L16)

Tool/function call

---

### MODEL_GENERATION

> **MODEL_GENERATION**: `"model.generation"`

Defined in: [types/span.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L18)

LLM generation request

---

### EMBEDDING

> **EMBEDDING**: `"embedding"`

Defined in: [types/span.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L20)

Embedding generation (reserved for future embedding API)

---

### RETRIEVAL

> **RETRIEVAL**: `"retrieval"`

Defined in: [types/span.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L22)

Retrieval operation (reserved for future RAG support)

---

### MEMORY

> **MEMORY**: `"memory"`

Defined in: [types/span.ts:24](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L24)

Memory operation

---

### CONTEXT_COMPACTION

> **CONTEXT_COMPACTION**: `"context.compaction"`

Defined in: [types/span.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L26)

Context compaction operation

---

### RAG

> **RAG**: `"rag"`

Defined in: [types/span.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L28)

RAG pipeline operation

---

### EVALUATION

> **EVALUATION**: `"evaluation"`

Defined in: [types/span.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L30)

Evaluation/scoring operation

---

### MCP_TRANSPORT

> **MCP_TRANSPORT**: `"mcp.transport"`

Defined in: [types/span.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L32)

MCP transport operation

---

### MEDIA_GENERATION

> **MEDIA_GENERATION**: `"media.generation"`

Defined in: [types/span.ts:34](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L34)

Media generation (image/video)

---

### PPT_GENERATION

> **PPT_GENERATION**: `"ppt.generation"`

Defined in: [types/span.ts:36](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L36)

PPT/presentation generation

---

### WORKFLOW

> **WORKFLOW**: `"workflow"`

Defined in: [types/span.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L38)

Workflow execution

---

### TTS

> **TTS**: `"tts"`

Defined in: [types/span.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L40)

TTS synthesis

---

### STT

> **STT**: `"stt"`

Defined in: [types/span.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L42)

STT transcription

---

### SERVER_REQUEST

> **SERVER_REQUEST**: `"server.request"`

Defined in: [types/span.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L44)

Server adapter request

---

### CUSTOM

> **CUSTOM**: `"custom"`

Defined in: [types/span.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L46)

Custom span

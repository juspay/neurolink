[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanType

# Enumeration: SpanType

Span types for AI operations
Following OTel GenAI conventions for span categorization

## Enumeration Members

### AGENT_RUN

> **AGENT_RUN**: `"agent.run"`

Agent execution run (reserved for future multi-agent support)

---

### WORKFLOW_STEP

> **WORKFLOW_STEP**: `"workflow.step"`

Workflow step execution (reserved for future workflow engine)

---

### TOOL_CALL

> **TOOL_CALL**: `"tool.call"`

Tool/function call

---

### MODEL_GENERATION

> **MODEL_GENERATION**: `"model.generation"`

LLM generation request

---

### MODEL_DECISION

> **MODEL_DECISION**: `"model.decision"`

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

Embedding generation (reserved for future embedding API)

---

### RETRIEVAL

> **RETRIEVAL**: `"retrieval"`

Retrieval operation (reserved for future RAG support)

---

### MEMORY

> **MEMORY**: `"memory"`

Memory operation

---

### CONTEXT_COMPACTION

> **CONTEXT_COMPACTION**: `"context.compaction"`

Context compaction operation

---

### RAG

> **RAG**: `"rag"`

RAG pipeline operation

---

### EVALUATION

> **EVALUATION**: `"evaluation"`

Evaluation/scoring operation

---

### MCP_TRANSPORT

> **MCP_TRANSPORT**: `"mcp.transport"`

MCP transport operation

---

### MEDIA_GENERATION

> **MEDIA_GENERATION**: `"media.generation"`

Media generation (image/video)

---

### PPT_GENERATION

> **PPT_GENERATION**: `"ppt.generation"`

PPT/presentation generation

---

### WORKFLOW

> **WORKFLOW**: `"workflow"`

Workflow execution

---

### TTS

> **TTS**: `"tts"`

TTS synthesis

---

### STT

> **STT**: `"stt"`

STT transcription

---

### SERVER_REQUEST

> **SERVER_REQUEST**: `"server.request"`

Server adapter request

---

### CUSTOM

> **CUSTOM**: `"custom"`

Custom span

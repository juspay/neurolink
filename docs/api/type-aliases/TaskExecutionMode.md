[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskExecutionMode

# Type Alias: TaskExecutionMode

> **TaskExecutionMode** = `"isolated"` \| `"continuation"`

- "isolated": Each run gets a fresh context. No memory of previous runs.
- "continuation": Conversation history is preserved across runs.

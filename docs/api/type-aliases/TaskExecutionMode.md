[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskExecutionMode

# Type Alias: TaskExecutionMode

> **TaskExecutionMode** = `"isolated"` \| `"continuation"`

Defined in: [types/task.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/types/task.ts#L82)

- "isolated": Each run gets a fresh context. No memory of previous runs.
- "continuation": Conversation history is preserved across runs.

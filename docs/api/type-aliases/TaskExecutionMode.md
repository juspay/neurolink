[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskExecutionMode

# Type Alias: TaskExecutionMode

> **TaskExecutionMode** = `"isolated"` \| `"continuation"`

Defined in: [types/task.ts:82](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/task.ts#L82)

- "isolated": Each run gets a fresh context. No memory of previous runs.
- "continuation": Conversation history is preserved across runs.

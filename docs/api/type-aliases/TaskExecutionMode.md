[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskExecutionMode

# Type Alias: TaskExecutionMode

> **TaskExecutionMode** = `"isolated"` \| `"continuation"`

Defined in: [types/task.ts:82](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/task.ts#L82)

- "isolated": Each run gets a fresh context. No memory of previous runs.
- "continuation": Conversation history is preserved across runs.

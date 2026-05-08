[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskExecutionMode

# Type Alias: TaskExecutionMode

> **TaskExecutionMode** = `"isolated"` \| `"continuation"`

Defined in: [types/task.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L82)

- "isolated": Each run gets a fresh context. No memory of previous runs.
- "continuation": Conversation history is preserved across runs.

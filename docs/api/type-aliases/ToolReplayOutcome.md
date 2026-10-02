[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolReplayOutcome

# Type Alias: ToolReplayOutcome

> **ToolReplayOutcome** = `"ok"` \| `"error"` \| `"unknown"`

What a replayed step tells the model about the call's outcome: `"ok"`,
`"error"` (the result was a failure — thrown, rejected, or an `isError`
payload), or `"unknown"` when the real result was lost to compaction and
`repairToolPairs` filled the gap with a placeholder.

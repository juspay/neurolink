[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolReplayMode

# Type Alias: ToolReplayMode

> **ToolReplayMode** = `"full"` \| `"marker"` \| `"off"`

How stored `tool_call` / `tool_result` rows are replayed into the prompt
on later turns of a session (see `ConversationMemoryConfig.replayToolSteps`).

- `"full"`: replayed as real tool-call / tool-result turns, so the model
  sees the exact call and its output.
- `"marker"`: a compact text line per tool call
  (`[called <tool> → ok]` / `[called <tool> → error]`) folded into the
  assistant turn, so the model knows what it did without the payload.
- `"off"`: tool rows are dropped from the prompt, as before this option.

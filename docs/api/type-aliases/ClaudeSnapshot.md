[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeSnapshot

# Type Alias: ClaudeSnapshot

> **ClaudeSnapshot** = `object`

Snapshot of headers and body from a Claude Code request, used for polyfill.

## Properties

### accountKey

> **accountKey**: `string`

---

### capturedAt

> **capturedAt**: `string`

---

### source

> **source**: `"claude-code"`

---

### capturedFrom?

> `optional` **capturedFrom?**: `"genuine-claude-code"`

Set only by a capture that verified the client was Claude Code itself
(session header and `claude-cli/` user-agent). A snapshot without it was
written by a release whose heuristic any caller could satisfy, so its
identity tuple is not trusted and is dropped on load.

---

### headers

> **headers**: `Record`\<`string`, `string`\>

---

### body?

> `optional` **body?**: [`ClaudeSnapshotBody`](ClaudeSnapshotBody.md)

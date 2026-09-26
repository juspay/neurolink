[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDedupRemoved

# Type Alias: ToolDedupRemoved

> **ToolDedupRemoved** = `object`

Record produced for each tool collapsed by the dedup pass.

## Properties

### name

> **name**: `string`

Name of the tool that was collapsed.

---

### duplicateOf

> **duplicateOf**: `string`

Name of the representative tool that this one was collapsed into.

---

### similarity

> **similarity**: `number`

Similarity score that triggered the collapse (in [0, 1]).

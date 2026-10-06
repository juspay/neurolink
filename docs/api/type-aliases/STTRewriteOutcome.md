[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTRewriteOutcome

# Type Alias: STTRewriteOutcome

> **STTRewriteOutcome** = `object`

What one rewrite call did; `text` is always usable (the input when the rewrite was not kept).

## Properties

### text

> **text**: `string`

---

### status

> **status**: `"ok"` \| `"timeout"` \| `"error"` \| `"empty"` \| `"dropped"`

---

### ms

> **ms**: `number`

---

### dropRatio?

> `optional` **dropRatio?**: `number`

Share of words the rewrite dropped, when `status` is `"dropped"`.

---

### error?

> `optional` **error?**: `string`

Message of the error, when `status` is `"error"`.

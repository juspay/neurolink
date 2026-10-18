[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamEvidence

# Type Alias: CodexStreamEvidence

> **CodexStreamEvidence** = `object`

Semantic completion evidence observed in native Codex SSE bytes.

## Properties

### completed

> **completed**: `boolean`

---

### terminalBytes

> **terminalBytes**: `number`

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Malformed, oversized or undispatched frames prevent proving output absence.

---

### outputItemsOmitted?

> `optional` **outputItemsOmitted?**: `boolean`

Output items past the recorded-size cap were left out of `response.output`.

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

---

### errorType?

> `optional` **errorType?**: `string`

---

### errorMessage?

> `optional` **errorMessage?**: `string`

---

### errorCode?

> `optional` **errorCode?**: `string`

---

### response?

> `optional` **response?**: [`JsonObject`](JsonObject.md)

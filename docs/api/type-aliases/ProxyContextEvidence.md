[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyContextEvidence

# Type Alias: ProxyContextEvidence

> **ProxyContextEvidence** = `object`

## Properties

### provider

> **provider**: `string`

---

### model

> **model**: `string`

---

### inputTokensEstimate

> **inputTokensEstimate**: `number`

---

### toolsTokensEstimate

> **toolsTokensEstimate**: `number`

---

### instructionsTokensEstimate

> **instructionsTokensEstimate**: `number`

---

### schemaTokensEstimate

> **schemaTokensEstimate**: `number`

---

### outputTokensReserve

> **outputTokensReserve**: `number`

---

### reasoningIncludedInOutputReserve

> **reasoningIncludedInOutputReserve**: `true`

---

### contextWindow?

> `optional` **contextWindow?**: `number`

---

### contextLimitSource

> **contextLimitSource**: `"configured"` \| `"discovered"` \| `"unknown"`

---

### tokenCountSource

> **tokenCountSource**: `"estimated"`

---

### multimodalEstimate

> **multimodalEstimate**: `boolean`

---

### originalToolCount

> **originalToolCount**: `number`

---

### retainedToolCount

> **retainedToolCount**: `number`

---

### historyModified

> **historyModified**: `boolean`

---

### historyUnitsRemoved?

> `optional` **historyUnitsRemoved?**: `number`

Complete history units dropped by pre-dispatch truncation.

---

### inputTokensBeforeTruncation?

> `optional` **inputTokensBeforeTruncation?**: `number`

Input estimate before truncation, when truncation ran.

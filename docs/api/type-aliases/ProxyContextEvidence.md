[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyContextEvidence

# Type Alias: ProxyContextEvidence

> **ProxyContextEvidence** = `object`

Defined in: [types/proxyContext.ts:20](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L20)

## Properties

### provider

> **provider**: `string`

Defined in: [types/proxyContext.ts:21](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L21)

---

### model

> **model**: `string`

Defined in: [types/proxyContext.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L22)

---

### inputTokensEstimate

> **inputTokensEstimate**: `number`

Defined in: [types/proxyContext.ts:23](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L23)

---

### toolsTokensEstimate

> **toolsTokensEstimate**: `number`

Defined in: [types/proxyContext.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L24)

---

### instructionsTokensEstimate

> **instructionsTokensEstimate**: `number`

Defined in: [types/proxyContext.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L25)

---

### schemaTokensEstimate

> **schemaTokensEstimate**: `number`

Defined in: [types/proxyContext.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L26)

---

### outputTokensReserve

> **outputTokensReserve**: `number`

Defined in: [types/proxyContext.ts:27](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L27)

---

### reasoningIncludedInOutputReserve

> **reasoningIncludedInOutputReserve**: `true`

Defined in: [types/proxyContext.ts:28](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L28)

---

### contextWindow?

> `optional` **contextWindow?**: `number`

Defined in: [types/proxyContext.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L29)

---

### contextLimitSource

> **contextLimitSource**: `"configured"` \| `"discovered"` \| `"unknown"`

Defined in: [types/proxyContext.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L30)

---

### tokenCountSource

> **tokenCountSource**: `"estimated"`

Defined in: [types/proxyContext.ts:31](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L31)

---

### multimodalEstimate

> **multimodalEstimate**: `boolean`

Defined in: [types/proxyContext.ts:32](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L32)

---

### originalToolCount

> **originalToolCount**: `number`

Defined in: [types/proxyContext.ts:33](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L33)

---

### retainedToolCount

> **retainedToolCount**: `number`

Defined in: [types/proxyContext.ts:34](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L34)

---

### historyModified

> **historyModified**: `boolean`

Defined in: [types/proxyContext.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L35)

---

### historyUnitsRemoved?

> `optional` **historyUnitsRemoved?**: `number`

Defined in: [types/proxyContext.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L37)

Complete history units dropped by pre-dispatch truncation.

---

### inputTokensBeforeTruncation?

> `optional` **inputTokensBeforeTruncation?**: `number`

Defined in: [types/proxyContext.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L39)

Input estimate before truncation, when truncation ran.

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamEvidence

# Type Alias: CodexStreamEvidence

> **CodexStreamEvidence** = `object`

Defined in: [types/proxy.ts:2738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2738)

Semantic completion evidence observed in native Codex SSE bytes.

## Properties

### completed

> **completed**: `boolean`

Defined in: [types/proxy.ts:2739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2739)

---

### terminalBytes

> **terminalBytes**: `number`

Defined in: [types/proxy.ts:2740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2740)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2742)

Malformed, oversized or undispatched frames prevent proving output absence.

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2743)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2744)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2745)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:2746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2746)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2747)

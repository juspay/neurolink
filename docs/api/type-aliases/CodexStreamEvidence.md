[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamEvidence

# Type Alias: CodexStreamEvidence

> **CodexStreamEvidence** = `object`

Defined in: [types/proxy.ts:2597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2597)

Semantic completion evidence observed in native Codex SSE bytes.

## Properties

### completed

> **completed**: `boolean`

Defined in: [types/proxy.ts:2598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2598)

---

### terminalBytes

> **terminalBytes**: `number`

Defined in: [types/proxy.ts:2599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2599)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2601)

Malformed, oversized or undispatched frames prevent proving output absence.

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2602)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2603)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2604)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:2605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2605)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2606)

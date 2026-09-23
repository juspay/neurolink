[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamEvidence

# Type Alias: CodexStreamEvidence

> **CodexStreamEvidence** = `object`

Defined in: [types/proxy.ts:2668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2668)

Semantic completion evidence observed in native Codex SSE bytes.

## Properties

### completed

> **completed**: `boolean`

Defined in: [types/proxy.ts:2669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2669)

---

### terminalBytes

> **terminalBytes**: `number`

Defined in: [types/proxy.ts:2670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2670)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2672)

Malformed, oversized or undispatched frames prevent proving output absence.

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2673)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2674)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2675)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:2676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2676)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2677)

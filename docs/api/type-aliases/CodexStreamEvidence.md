[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamEvidence

# Type Alias: CodexStreamEvidence

> **CodexStreamEvidence** = `object`

Defined in: [types/proxy.ts:2671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2671)

Semantic completion evidence observed in native Codex SSE bytes.

## Properties

### completed

> **completed**: `boolean`

Defined in: [types/proxy.ts:2672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2672)

---

### terminalBytes

> **terminalBytes**: `number`

Defined in: [types/proxy.ts:2673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2673)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2675)

Malformed, oversized or undispatched frames prevent proving output absence.

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2676)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2677)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2678)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:2679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2679)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2680)

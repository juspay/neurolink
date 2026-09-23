[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamEvidence

# Type Alias: CodexStreamEvidence

> **CodexStreamEvidence** = `object`

Defined in: [types/proxy.ts:2648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2648)

Semantic completion evidence observed in native Codex SSE bytes.

## Properties

### completed

> **completed**: `boolean`

Defined in: [types/proxy.ts:2649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2649)

---

### terminalBytes

> **terminalBytes**: `number`

Defined in: [types/proxy.ts:2650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2650)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2652)

Malformed, oversized or undispatched frames prevent proving output absence.

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2653)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2654)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2655)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:2656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2656)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2657)

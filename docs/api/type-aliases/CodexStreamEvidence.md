[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamEvidence

# Type Alias: CodexStreamEvidence

> **CodexStreamEvidence** = `object`

Defined in: [types/proxy.ts:2482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2482)

Semantic completion evidence observed in native Codex SSE bytes.

## Properties

### completed

> **completed**: `boolean`

Defined in: [types/proxy.ts:2483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2483)

---

### terminalBytes

> **terminalBytes**: `number`

Defined in: [types/proxy.ts:2484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2484)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2486)

Malformed, oversized or undispatched frames prevent proving output absence.

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2487)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2488)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2489)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:2490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2490)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2491)

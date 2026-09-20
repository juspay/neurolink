[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionError

# Type Alias: DecisionError

> **DecisionError** = `object`

Defined in: [types/decision.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L160)

## Properties

### kind

> **kind**: [`DecisionErrorKind`](DecisionErrorKind.md)

Defined in: [types/decision.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L161)

---

### message

> **message**: `string`

Defined in: [types/decision.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L162)

---

### status?

> `optional` **status?**: `number`

Defined in: [types/decision.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L163)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/decision.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L164)

---

### retryable

> **retryable**: `boolean`

Defined in: [types/decision.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L166)

True when a retry could plausibly succeed.

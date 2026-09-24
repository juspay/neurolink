[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionError

# Type Alias: DecisionError

> **DecisionError** = `object`

Defined in: [types/decision.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L189)

## Properties

### kind

> **kind**: [`DecisionErrorKind`](DecisionErrorKind.md)

Defined in: [types/decision.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L190)

---

### message

> **message**: `string`

Defined in: [types/decision.ts:191](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L191)

---

### status?

> `optional` **status?**: `number`

Defined in: [types/decision.ts:192](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L192)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/decision.ts:193](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L193)

---

### retryable

> **retryable**: `boolean`

Defined in: [types/decision.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L195)

True when a retry could plausibly succeed.

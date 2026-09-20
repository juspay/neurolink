[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionRequest

# Type Alias: DecisionRequest

> **DecisionRequest** = `object`

Defined in: [types/decision.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L122)

## Properties

### state

> **state**: [`DecisionState`](DecisionState.md)

Defined in: [types/decision.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L123)

---

### questions

> **questions**: [`DecisionQuestionMap`](DecisionQuestionMap.md)

Defined in: [types/decision.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L124)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/decision.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L126)

Overrides the provider's configured model for this call only.

---

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [types/decision.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L127)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/decision.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L129)

Overrides the configured timeout for this call only.

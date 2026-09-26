[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionRequest

# Type Alias: DecisionRequest

> **DecisionRequest** = `object`

## Properties

### state

> **state**: [`DecisionState`](DecisionState.md)

---

### questions

> **questions**: [`DecisionQuestionMap`](DecisionQuestionMap.md)

---

### model?

> `optional` **model?**: `string`

Overrides the provider's configured model for this call only.

---

### signal?

> `optional` **signal?**: `AbortSignal`

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Overrides the configured timeout for this call only.

[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClipGenState

# Type Alias: ClipGenState

> **ClipGenState** = `object`

Defined in: [types/multimodal.ts:739](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L739)

State shared across clip-generation tasks for circuit-breaker logic.

## Properties

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/multimodal.ts:740](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L740)

---

### circuitOpen

> **circuitOpen**: `boolean`

Defined in: [types/multimodal.ts:741](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L741)

---

### results

> **results**: ([`ClipResult`](ClipResult.md) \| `null`)[]

Defined in: [types/multimodal.ts:742](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L742)

---

### completions

> **completions**: [`ClipCompletion`](ClipCompletion.md)[]

Defined in: [types/multimodal.ts:743](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L743)

---

### nextExpectedIndex

> **nextExpectedIndex**: `number`

Defined in: [types/multimodal.ts:744](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L744)

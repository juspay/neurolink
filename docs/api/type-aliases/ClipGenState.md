[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClipGenState

# Type Alias: ClipGenState

> **ClipGenState** = `object`

Defined in: [types/multimodal.ts:636](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L636)

State shared across clip-generation tasks for circuit-breaker logic.

## Properties

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/multimodal.ts:637](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L637)

---

### circuitOpen

> **circuitOpen**: `boolean`

Defined in: [types/multimodal.ts:638](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L638)

---

### results

> **results**: ([`ClipResult`](ClipResult.md) \| `null`)[]

Defined in: [types/multimodal.ts:639](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L639)

---

### completions

> **completions**: [`ClipCompletion`](ClipCompletion.md)[]

Defined in: [types/multimodal.ts:640](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L640)

---

### nextExpectedIndex

> **nextExpectedIndex**: `number`

Defined in: [types/multimodal.ts:641](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L641)

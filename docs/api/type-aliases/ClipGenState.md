[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClipGenState

# Type Alias: ClipGenState

> **ClipGenState** = `object`

State shared across clip-generation tasks for circuit-breaker logic.

## Properties

### consecutiveFailures

> **consecutiveFailures**: `number`

---

### circuitOpen

> **circuitOpen**: `boolean`

---

### results

> **results**: ([`ClipResult`](ClipResult.md) \| `null`)[]

---

### completions

> **completions**: [`ClipCompletion`](ClipCompletion.md)[]

---

### nextExpectedIndex

> **nextExpectedIndex**: `number`

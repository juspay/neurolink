[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceTurnClosedExchange

# Type Alias: VoiceTurnClosedExchange

> **VoiceTurnClosedExchange** = `object`

A reply that finished before its user transcript arrived, waiting out the settle window.

## Properties

### turnId

> **turnId**: `string`

---

### assistantText

> **assistantText**: `string`

---

### interrupted

> **interrupted**: `boolean`

---

### events

> **events**: [`StreamEventSequence`](StreamEventSequence.md)[]

---

### startedAt

> **startedAt**: `number`

---

### timer

> **timer**: `ReturnType`\<_typeof_ `setTimeout`\>

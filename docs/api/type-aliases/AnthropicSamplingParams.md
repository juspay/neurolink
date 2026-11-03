[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicSamplingParams

# Type Alias: AnthropicSamplingParams

> **AnthropicSamplingParams** = `object`

The sampling fields a Messages request still carries on the wire. SDK 1.x no
longer declares them on its request types, but NeuroLink sends them (per
model, through `resolveSamplingParams`) and reads them back for tracing.

## Properties

### temperature?

> `optional` **temperature?**: `number`

---

### top_p?

> `optional` **top_p?**: `number`

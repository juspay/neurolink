[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleFinishPayload

# Type Alias: LifecycleFinishPayload

> **LifecycleFinishPayload** = `object`

Payload delivered to onFinish callbacks after generation or streaming completes.

## Properties

### text

> **text**: `string`

The generated text content

---

### usage?

> `optional` **usage?**: `object`

Token usage from the provider

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

---

### duration

> **duration**: `number`

Wall-clock duration in milliseconds

---

### finishReason?

> `optional` **finishReason?**: `string`

Why generation stopped

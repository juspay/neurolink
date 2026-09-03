[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleFinishPayload

# Type Alias: LifecycleFinishPayload

> **LifecycleFinishPayload** = `object`

Defined in: [types/middleware.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L303)

Payload delivered to onFinish callbacks after generation or streaming completes.

## Properties

### text

> **text**: `string`

Defined in: [types/middleware.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L305)

The generated text content

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/middleware.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L307)

Token usage from the provider

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

---

### duration

> **duration**: `number`

Defined in: [types/middleware.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L309)

Wall-clock duration in milliseconds

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/middleware.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L311)

Why generation stopped

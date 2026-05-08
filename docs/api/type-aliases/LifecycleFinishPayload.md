[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleFinishPayload

# Type Alias: LifecycleFinishPayload

> **LifecycleFinishPayload** = `object`

Defined in: [types/middleware.ts:279](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L279)

Payload delivered to onFinish callbacks after generation or streaming completes.

## Properties

### text

> **text**: `string`

Defined in: [types/middleware.ts:281](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L281)

The generated text content

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/middleware.ts:283](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L283)

Token usage from the provider

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

---

### duration

> **duration**: `number`

Defined in: [types/middleware.ts:285](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L285)

Wall-clock duration in milliseconds

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/middleware.ts:287](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L287)

Why generation stopped

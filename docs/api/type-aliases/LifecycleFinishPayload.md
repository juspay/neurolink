[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleFinishPayload

# Type Alias: LifecycleFinishPayload

> **LifecycleFinishPayload** = `object`

Defined in: [types/middleware.ts:309](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L309)

Payload delivered to onFinish callbacks after generation or streaming completes.

## Properties

### text

> **text**: `string`

Defined in: [types/middleware.ts:311](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L311)

The generated text content

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/middleware.ts:313](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L313)

Token usage from the provider

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

---

### duration

> **duration**: `number`

Defined in: [types/middleware.ts:315](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L315)

Wall-clock duration in milliseconds

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/middleware.ts:317](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L317)

Why generation stopped

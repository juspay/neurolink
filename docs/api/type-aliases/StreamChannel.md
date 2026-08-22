[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamChannel

# Type Alias: StreamChannel\<T\>

> **StreamChannel**\<`T`\> = `object`

Defined in: [types/streaming.ts:8](https://github.com/juspay/neurolink/blob/release/src/lib/types/streaming.ts#L8)

Shared push-based channel bridging a background producer (an agentic
tool-calling loop) with an async-iterable consumer. Replaces the two
independently-invented primitives this type unifies: the OpenAI-family
`createChunkQueue` (pull-based, in-band `{done:true}` sentinel) and the
Gemini-family `createTextChannel` (push-based, out-of-band close/error).

## Type Parameters

### T

`T` = \{ `content`: `string`; \}

## Properties

### iterable

> `readonly` **iterable**: `AsyncIterable`\<`T`\>

Defined in: [types/streaming.ts:12](https://github.com/juspay/neurolink/blob/release/src/lib/types/streaming.ts#L12)

## Methods

### push()

> **push**(`value`): `void`

Defined in: [types/streaming.ts:9](https://github.com/juspay/neurolink/blob/release/src/lib/types/streaming.ts#L9)

#### Parameters

##### value

`T`

#### Returns

`void`

---

### close()

> **close**(): `void`

Defined in: [types/streaming.ts:10](https://github.com/juspay/neurolink/blob/release/src/lib/types/streaming.ts#L10)

#### Returns

`void`

---

### error()

> **error**(`err`): `void`

Defined in: [types/streaming.ts:11](https://github.com/juspay/neurolink/blob/release/src/lib/types/streaming.ts#L11)

#### Parameters

##### err

`unknown`

#### Returns

`void`

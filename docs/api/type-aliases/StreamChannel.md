[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamChannel

# Type Alias: StreamChannel\<T\>

> **StreamChannel**\<`T`\> = `object`

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

## Methods

### push()

> **push**(`value`): `void`

#### Parameters

##### value

`T`

#### Returns

`void`

---

### close()

> **close**(): `void`

#### Returns

`void`

---

### error()

> **error**(`err`): `void`

#### Parameters

##### err

`unknown`

#### Returns

`void`

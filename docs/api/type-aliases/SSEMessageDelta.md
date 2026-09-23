[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEMessageDelta

# Type Alias: SSEMessageDelta

> **SSEMessageDelta** = `object`

Defined in: [types/proxy.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L243)

## Properties

### type

> **type**: `"message_delta"`

Defined in: [types/proxy.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L244)

---

### delta

> **delta**: `object`

Defined in: [types/proxy.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L245)

#### stop_reason

> **stop_reason**: `string` \| `null`

#### stop_sequence

> **stop_sequence**: `string` \| `null`

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L246)

#### output_tokens

> **output_tokens**: `number`

#### input_tokens?

> `optional` **input_tokens?**: `number`

#### cache_read_input_tokens?

> `optional` **cache_read_input_tokens?**: `number`

#### cache_creation_input_tokens?

> `optional` **cache_creation_input_tokens?**: `number`

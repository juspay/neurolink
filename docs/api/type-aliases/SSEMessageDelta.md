[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEMessageDelta

# Type Alias: SSEMessageDelta

> **SSEMessageDelta** = `object`

Defined in: [types/proxy.ts:223](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L223)

## Properties

### type

> **type**: `"message_delta"`

Defined in: [types/proxy.ts:224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L224)

---

### delta

> **delta**: `object`

Defined in: [types/proxy.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L225)

#### stop_reason

> **stop_reason**: `string` \| `null`

#### stop_sequence

> **stop_sequence**: `string` \| `null`

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L226)

#### output_tokens

> **output_tokens**: `number`

#### input_tokens?

> `optional` **input_tokens?**: `number`

#### cache_read_input_tokens?

> `optional` **cache_read_input_tokens?**: `number`

#### cache_creation_input_tokens?

> `optional` **cache_creation_input_tokens?**: `number`

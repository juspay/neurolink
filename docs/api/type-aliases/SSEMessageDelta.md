[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEMessageDelta

# Type Alias: SSEMessageDelta

> **SSEMessageDelta** = `object`

Defined in: [types/proxy.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L217)

## Properties

### type

> **type**: `"message_delta"`

Defined in: [types/proxy.ts:218](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L218)

---

### delta

> **delta**: `object`

Defined in: [types/proxy.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L219)

#### stop_reason

> **stop_reason**: `string` \| `null`

#### stop_sequence

> **stop_sequence**: `string` \| `null`

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L220)

#### output_tokens

> **output_tokens**: `number`

#### input_tokens?

> `optional` **input_tokens?**: `number`

#### cache_read_input_tokens?

> `optional` **cache_read_input_tokens?**: `number`

#### cache_creation_input_tokens?

> `optional` **cache_creation_input_tokens?**: `number`

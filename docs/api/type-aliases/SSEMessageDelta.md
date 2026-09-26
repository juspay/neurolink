[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEMessageDelta

# Type Alias: SSEMessageDelta

> **SSEMessageDelta** = `object`

## Properties

### type

> **type**: `"message_delta"`

---

### delta

> **delta**: `object`

#### stop_reason

> **stop_reason**: `string` \| `null`

#### stop_sequence

> **stop_sequence**: `string` \| `null`

---

### usage

> **usage**: `object`

#### output_tokens

> **output_tokens**: `number`

#### input_tokens?

> `optional` **input_tokens?**: `number`

#### cache_read_input_tokens?

> `optional` **cache_read_input_tokens?**: `number`

#### cache_creation_input_tokens?

> `optional` **cache_creation_input_tokens?**: `number`

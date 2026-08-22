[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingConfig

# Type Alias: StreamingConfig

> **StreamingConfig** = `object`

Defined in: [types/server.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L346)

Streaming response configuration

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/server.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L348)

Enable streaming response

---

### contentType?

> `optional` **contentType?**: `"text/event-stream"` \| `"application/x-ndjson"`

Defined in: [types/server.ts:351](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L351)

Content type for streaming

---

### keepAliveInterval?

> `optional` **keepAliveInterval?**: `number`

Defined in: [types/server.ts:354](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L354)

Keep-alive interval in milliseconds

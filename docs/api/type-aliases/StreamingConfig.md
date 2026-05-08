[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingConfig

# Type Alias: StreamingConfig

> **StreamingConfig** = `object`

Defined in: [types/server.ts:346](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L346)

Streaming response configuration

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/server.ts:348](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L348)

Enable streaming response

---

### contentType?

> `optional` **contentType?**: `"text/event-stream"` \| `"application/x-ndjson"`

Defined in: [types/server.ts:351](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L351)

Content type for streaming

---

### keepAliveInterval?

> `optional` **keepAliveInterval?**: `number`

Defined in: [types/server.ts:354](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L354)

Keep-alive interval in milliseconds

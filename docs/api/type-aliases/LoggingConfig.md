[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoggingConfig

# Type Alias: LoggingConfig

> **LoggingConfig** = `object`

Defined in: [types/server.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L181)

Logging configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/server.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L183)

Enable request logging (default: true)

---

### level?

> `optional` **level?**: `"debug"` \| `"info"` \| `"warn"` \| `"error"`

Defined in: [types/server.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L186)

Log level

---

### includeBody?

> `optional` **includeBody?**: `boolean`

Defined in: [types/server.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L189)

Include request body in logs

---

### includeResponse?

> `optional` **includeResponse?**: `boolean`

Defined in: [types/server.ts:192](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L192)

Include response body in logs

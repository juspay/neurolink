[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoggingConfig

# Type Alias: LoggingConfig

> **LoggingConfig** = `object`

Defined in: [types/server.ts:181](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L181)

Logging configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/server.ts:183](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L183)

Enable request logging (default: true)

---

### level?

> `optional` **level?**: `"debug"` \| `"info"` \| `"warn"` \| `"error"`

Defined in: [types/server.ts:186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L186)

Log level

---

### includeBody?

> `optional` **includeBody?**: `boolean`

Defined in: [types/server.ts:189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L189)

Include request body in logs

---

### includeResponse?

> `optional` **includeResponse?**: `boolean`

Defined in: [types/server.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L192)

Include response body in logs

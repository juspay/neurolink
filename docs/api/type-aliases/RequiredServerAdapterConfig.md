[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequiredServerAdapterConfig

# Type Alias: RequiredServerAdapterConfig

> **RequiredServerAdapterConfig** = `object`

Defined in: [types/server.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L65)

Required server adapter configuration (with defaults applied)

## Properties

### port

> **port**: `number`

Defined in: [types/server.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L66)

---

### host

> **host**: `string`

Defined in: [types/server.ts:67](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L67)

---

### basePath

> **basePath**: `string`

Defined in: [types/server.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L68)

---

### cors

> **cors**: [`RequiredCORSConfig`](RequiredCORSConfig.md)

Defined in: [types/server.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L69)

---

### rateLimit

> **rateLimit**: [`RequiredRateLimitConfig`](RequiredRateLimitConfig.md)

Defined in: [types/server.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L70)

---

### bodyParser

> **bodyParser**: [`RequiredBodyParserConfig`](RequiredBodyParserConfig.md)

Defined in: [types/server.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L71)

---

### logging

> **logging**: [`RequiredLoggingConfig`](RequiredLoggingConfig.md)

Defined in: [types/server.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L72)

---

### timeout

> **timeout**: `number`

Defined in: [types/server.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L73)

---

### enableMetrics

> **enableMetrics**: `boolean`

Defined in: [types/server.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L74)

---

### enableSwagger

> **enableSwagger**: `boolean`

Defined in: [types/server.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L75)

---

### disableBuiltInHealth

> **disableBuiltInHealth**: `boolean`

Defined in: [types/server.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L76)

---

### redaction?

> `optional` **redaction?**: [`RequiredRedactionConfig`](RequiredRedactionConfig.md)

Defined in: [types/server.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L77)

---

### shutdown

> **shutdown**: [`RequiredShutdownConfig`](RequiredShutdownConfig.md)

Defined in: [types/server.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L78)

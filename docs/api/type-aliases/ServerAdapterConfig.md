[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterConfig

# Type Alias: ServerAdapterConfig

> **ServerAdapterConfig** = `object`

Defined in: [types/server.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L21)

Server adapter configuration

## Properties

### port?

> `optional` **port?**: `number`

Defined in: [types/server.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L23)

Server port (default: 3000)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/server.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L26)

Server host (default: "0.0.0.0")

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/server.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L29)

Base path for all routes (default: "/api")

---

### cors?

> `optional` **cors?**: [`CORSConfig`](CORSConfig.md)

Defined in: [types/server.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L32)

CORS configuration

---

### rateLimit?

> `optional` **rateLimit?**: [`RateLimitConfig`](RateLimitConfig.md)

Defined in: [types/server.ts:35](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L35)

Rate limiting configuration

---

### bodyParser?

> `optional` **bodyParser?**: [`BodyParserConfig`](BodyParserConfig.md)

Defined in: [types/server.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L38)

Body parser configuration

---

### logging?

> `optional` **logging?**: [`LoggingConfig`](LoggingConfig.md)

Defined in: [types/server.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L41)

Logging configuration

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/server.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L44)

Request timeout in milliseconds (default: 30000)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Defined in: [types/server.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L47)

Enable metrics endpoint (default: true)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Defined in: [types/server.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L50)

Enable Swagger/OpenAPI documentation (default: false)

---

### disableBuiltInHealth?

> `optional` **disableBuiltInHealth?**: `boolean`

Defined in: [types/server.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L53)

Disable built-in health routes (use when registering healthRoutes separately)

---

### redaction?

> `optional` **redaction?**: [`RedactionConfig`](RedactionConfig.md)

Defined in: [types/server.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L56)

Stream redaction configuration (disabled by default)

---

### shutdown?

> `optional` **shutdown?**: [`ShutdownConfig`](ShutdownConfig.md)

Defined in: [types/server.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L59)

Shutdown configuration for graceful shutdown behavior

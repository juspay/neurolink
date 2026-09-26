[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterConfig

# Type Alias: ServerAdapterConfig

> **ServerAdapterConfig** = `object`

Server adapter configuration

## Properties

### port?

> `optional` **port?**: `number`

Server port (default: 3000)

---

### host?

> `optional` **host?**: `string`

Server host (default: "0.0.0.0")

---

### basePath?

> `optional` **basePath?**: `string`

Base path for all routes (default: "/api")

---

### cors?

> `optional` **cors?**: [`CORSConfig`](CORSConfig.md)

CORS configuration

---

### rateLimit?

> `optional` **rateLimit?**: [`RateLimitConfig`](RateLimitConfig.md)

Rate limiting configuration

---

### bodyParser?

> `optional` **bodyParser?**: [`BodyParserConfig`](BodyParserConfig.md)

Body parser configuration

---

### logging?

> `optional` **logging?**: [`LoggingConfig`](LoggingConfig.md)

Logging configuration

---

### timeout?

> `optional` **timeout?**: `number`

Request timeout in milliseconds (default: 30000)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Enable metrics endpoint (default: true)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Enable Swagger/OpenAPI documentation (default: false)

---

### disableBuiltInHealth?

> `optional` **disableBuiltInHealth?**: `boolean`

Disable built-in health routes (use when registering healthRoutes separately)

---

### redaction?

> `optional` **redaction?**: [`RedactionConfig`](RedactionConfig.md)

Stream redaction configuration (disabled by default)

---

### shutdown?

> `optional` **shutdown?**: [`ShutdownConfig`](ShutdownConfig.md)

Shutdown configuration for graceful shutdown behavior

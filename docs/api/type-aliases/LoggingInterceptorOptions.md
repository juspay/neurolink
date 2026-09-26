[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoggingInterceptorOptions

# Type Alias: LoggingInterceptorOptions

> **LoggingInterceptorOptions** = `object`

Logging interceptor options

## Properties

### logRequest?

> `optional` **logRequest?**: `boolean`

Log request details

---

### logResponse?

> `optional` **logResponse?**: `boolean`

Log response details

---

### logBody?

> `optional` **logBody?**: `boolean`

Log request body

---

### logResponseBody?

> `optional` **logResponseBody?**: `boolean`

Log response body

---

### logger?

> `optional` **logger?**: (`message`, `data?`) => `void`

Custom logger function

#### Parameters

##### message

`string`

##### data?

`unknown`

#### Returns

`void`

---

### redactFields?

> `optional` **redactFields?**: `string`[]

Redact sensitive fields

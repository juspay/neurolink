[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoggingInterceptorOptions

# Type Alias: LoggingInterceptorOptions

> **LoggingInterceptorOptions** = `object`

Defined in: [types/client.ts:1282](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1282)

Logging interceptor options

## Properties

### logRequest?

> `optional` **logRequest?**: `boolean`

Defined in: [types/client.ts:1284](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1284)

Log request details

---

### logResponse?

> `optional` **logResponse?**: `boolean`

Defined in: [types/client.ts:1286](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1286)

Log response details

---

### logBody?

> `optional` **logBody?**: `boolean`

Defined in: [types/client.ts:1288](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1288)

Log request body

---

### logResponseBody?

> `optional` **logResponseBody?**: `boolean`

Defined in: [types/client.ts:1290](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1290)

Log response body

---

### logger?

> `optional` **logger?**: (`message`, `data?`) => `void`

Defined in: [types/client.ts:1292](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1292)

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

Defined in: [types/client.ts:1294](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1294)

Redact sensitive fields

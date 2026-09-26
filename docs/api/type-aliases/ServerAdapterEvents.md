[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterEvents

# Type Alias: ServerAdapterEvents

> **ServerAdapterEvents** = `object`

Server adapter events

## Properties

### initialized

> **initialized**: `object`

Server initialized

#### config

> **config**: [`ServerAdapterConfig`](ServerAdapterConfig.md)

#### routeCount

> **routeCount**: `number`

#### middlewareCount

> **middlewareCount**: `number`

---

### started

> **started**: `object`

Server started

#### port

> **port**: `number`

#### host

> **host**: `string`

#### timestamp

> **timestamp**: `Date`

---

### stopped

> **stopped**: `object`

Server stopped

#### uptime

> **uptime**: `number`

#### timestamp

> **timestamp**: `Date`

---

### request

> **request**: `object`

Request received

#### requestId

> **requestId**: `string`

#### method

> **method**: `string`

#### path

> **path**: `string`

#### timestamp

> **timestamp**: `Date`

---

### response

> **response**: `object`

Response sent

#### requestId

> **requestId**: `string`

#### statusCode

> **statusCode**: `number`

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### error

> **error**: `object`

Error occurred

#### requestId?

> `optional` **requestId?**: `string`

#### error

> **error**: `Error`

#### timestamp

> **timestamp**: `Date`

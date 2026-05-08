[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterEvents

# Type Alias: ServerAdapterEvents

> **ServerAdapterEvents** = `object`

Defined in: [types/server.ts:499](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L499)

Server adapter events

## Properties

### initialized

> **initialized**: `object`

Defined in: [types/server.ts:501](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L501)

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

Defined in: [types/server.ts:508](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L508)

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

Defined in: [types/server.ts:515](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L515)

Server stopped

#### uptime

> **uptime**: `number`

#### timestamp

> **timestamp**: `Date`

---

### request

> **request**: `object`

Defined in: [types/server.ts:521](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L521)

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

Defined in: [types/server.ts:529](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L529)

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

Defined in: [types/server.ts:537](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L537)

Error occurred

#### requestId?

> `optional` **requestId?**: `string`

#### error

> **error**: `Error`

#### timestamp

> **timestamp**: `Date`

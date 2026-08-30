[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1699)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1700)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1701)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1702)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1703)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1704)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1705)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1707)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1708)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1709)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1710)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1717)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

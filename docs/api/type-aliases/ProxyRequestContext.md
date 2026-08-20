[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1632)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1633)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1634)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1635)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1636)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1637)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1638)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1640)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1641)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1642)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1643)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1650)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

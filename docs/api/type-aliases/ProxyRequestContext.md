[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1730)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1731)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1732)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1733)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1734)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1735)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1736)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1738)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1739)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1740)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1741)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1748)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

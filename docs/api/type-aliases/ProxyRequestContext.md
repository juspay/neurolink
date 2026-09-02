[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1721)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1722)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1723)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1724)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1725)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1726)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1727)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1729)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1730)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1731)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1732)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1739)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

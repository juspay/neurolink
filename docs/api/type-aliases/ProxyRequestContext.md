[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1742)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1743)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1744)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1745)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1746)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1747)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1748)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1750)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1751)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1752)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1753)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1760)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

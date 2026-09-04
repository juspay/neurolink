[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1736)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1737)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1738)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1739)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1740)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1741)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1742)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1744)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1745)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1746)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1747)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1754)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1626)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1627)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1628)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1629)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1630)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1631)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1632)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1634)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1635)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1636)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1637)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1644)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

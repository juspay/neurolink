[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisFinalRequestRecord

# Type Alias: ProxyAnalysisFinalRequestRecord

> **ProxyAnalysisFinalRequestRecord** = `object`

Defined in: [types/proxy.ts:2429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2429)

Final request fields retained while joining offline proxy log records.

## Properties

### firstUsefulOutputMs

> **firstUsefulOutputMs**: `number` \| `null`

Defined in: [types/proxy.ts:2430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2430)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2431)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:2432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2432)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2433)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:2434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2434)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:2435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2435)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2436)

---

### provider

> **provider**: `string` \| `null`

Defined in: [types/proxy.ts:2437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2437)

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2438)

---

### inputTokens

> **inputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2439)

---

### outputTokens

> **outputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2440)

---

### cacheReadTokens

> **cacheReadTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2441)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2442)

---

### errorType

> **errorType**: `string` \| `null`

Defined in: [types/proxy.ts:2443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2443)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2444](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2444)

---

### routingDecision

> **routingDecision**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md) \| `null`

Defined in: [types/proxy.ts:2445](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2445)

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2647)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2648)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2649)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2650)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2651)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2652)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2653)

#### method

> **method**: `string`

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### bodySha256

> **bodySha256**: `string`

#### bodyBytes

> **bodyBytes**: `number`

#### usedBodyOverride

> **usedBodyOverride**: `boolean`

---

### captured

> **captured**: \{ `status`: `number` \| `null`; `contentType`: `string` \| `null`; `bodySha256`: `string` \| `null`; `bodyBytes`: `number` \| `null`; `bodyTruncated`: `boolean`; `jsonShape`: `string`[] \| `null`; \} \| `null`

Defined in: [types/proxy.ts:2660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2660)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2668)

#### status

> **status**: `number`

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### contentType

> **contentType**: `string` \| `null`

#### body

> **body**: `string`

#### bodySha256

> **bodySha256**: `string`

#### observedBodyBytes

> **observedBodyBytes**: `number`

#### storedBodyBytes

> **storedBodyBytes**: `number`

#### bodyTruncated

> **bodyTruncated**: `boolean`

#### timeToHeadersMs

> **timeToHeadersMs**: `number`

#### totalMs

> **totalMs**: `number`

#### jsonShape

> **jsonShape**: `string`[] \| `null`

---

### comparison

> **comparison**: `object`

Defined in: [types/proxy.ts:2681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2681)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

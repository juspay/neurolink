[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2310)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2311)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2312)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2313)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2314)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2315)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2316)

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

Defined in: [types/proxy.ts:2323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2323)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2331](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2331)

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

Defined in: [types/proxy.ts:2344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2344)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

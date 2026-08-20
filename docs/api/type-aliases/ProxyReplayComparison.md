[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2221](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2221)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2222](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2222)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2223](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2223)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2224)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2225](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2225)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2226)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2227)

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

Defined in: [types/proxy.ts:2234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2234)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2242)

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

Defined in: [types/proxy.ts:2255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2255)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

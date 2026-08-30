[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2288)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2289)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2290)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2291)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2292](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2292)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2293](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2293)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2294)

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

Defined in: [types/proxy.ts:2301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2301)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2309)

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

Defined in: [types/proxy.ts:2322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2322)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

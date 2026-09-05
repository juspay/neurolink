[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2331](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2331)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2332)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2333)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2334)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2335)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2336)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2337)

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

Defined in: [types/proxy.ts:2344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2344)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2352)

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

Defined in: [types/proxy.ts:2365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2365)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

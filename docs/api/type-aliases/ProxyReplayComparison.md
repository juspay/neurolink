[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2325)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2326)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2327)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2328)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2329)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2330](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2330)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2331](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2331)

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

Defined in: [types/proxy.ts:2338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2338)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2346)

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

Defined in: [types/proxy.ts:2359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2359)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

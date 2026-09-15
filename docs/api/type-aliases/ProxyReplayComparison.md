[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2622)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2623)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2624)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2625)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2626)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2627)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2628)

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

Defined in: [types/proxy.ts:2635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2635)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2643)

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

Defined in: [types/proxy.ts:2656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2656)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

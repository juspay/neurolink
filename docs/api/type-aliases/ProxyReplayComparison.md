[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2319)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2320)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2321)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2322)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2323)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2324)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2325)

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

Defined in: [types/proxy.ts:2332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2332)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2340)

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

Defined in: [types/proxy.ts:2353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2353)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

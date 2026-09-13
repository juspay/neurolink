[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2504](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2504)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2505)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2506)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2507)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2508)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2509](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2509)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2510)

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

Defined in: [types/proxy.ts:2517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2517)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2525)

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

Defined in: [types/proxy.ts:2538](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2538)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

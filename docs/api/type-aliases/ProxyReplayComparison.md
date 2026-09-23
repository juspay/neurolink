[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2840)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2841)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2842)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2843)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2844)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2845)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2846)

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

Defined in: [types/proxy.ts:2853](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2853)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2861](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2861)

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

Defined in: [types/proxy.ts:2874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2874)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

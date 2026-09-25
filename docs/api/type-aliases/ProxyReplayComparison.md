[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2908)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2909)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2910)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2911)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2912)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2913)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2914)

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

Defined in: [types/proxy.ts:2921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2921)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2929)

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

Defined in: [types/proxy.ts:2942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2942)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayComparison

# Type Alias: ProxyReplayComparison

> **ProxyReplayComparison** = `object`

Defined in: [types/proxy.ts:2613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2613)

Redacted direct-upstream response and comparison with captured evidence.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:2614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2614)

---

### kind

> **kind**: `"neurolink.proxy.replay-comparison"`

Defined in: [types/proxy.ts:2615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2615)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2616)

---

### selectedAttempt

> **selectedAttempt**: `number`

Defined in: [types/proxy.ts:2617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2617)

---

### endpoint

> **endpoint**: `string`

Defined in: [types/proxy.ts:2618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2618)

---

### request

> **request**: `object`

Defined in: [types/proxy.ts:2619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2619)

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

Defined in: [types/proxy.ts:2626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2626)

---

### direct

> **direct**: `object`

Defined in: [types/proxy.ts:2634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2634)

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

Defined in: [types/proxy.ts:2647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2647)

#### statusMatches

> **statusMatches**: `boolean` \| `null`

#### contentTypeMatches

> **contentTypeMatches**: `boolean` \| `null`

#### bodyHashMatches

> **bodyHashMatches**: `boolean` \| `null`

#### jsonShapeMatches

> **jsonShapeMatches**: `boolean` \| `null`

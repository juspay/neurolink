[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2261)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2262)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2263)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2264)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2265)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2266)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2267)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2268)

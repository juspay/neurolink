[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2360)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2361)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2362)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2363)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2364)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2365)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2366)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2367)

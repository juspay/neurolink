[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2890)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2891)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2892)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2893)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2894)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2895)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2896)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2897)

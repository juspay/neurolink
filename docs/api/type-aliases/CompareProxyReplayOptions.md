[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2893)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2894)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2895)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2896)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2897)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2898)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2899)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2900)

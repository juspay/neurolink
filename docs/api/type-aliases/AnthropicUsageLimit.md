[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageLimit

# Type Alias: AnthropicUsageLimit

> **AnthropicUsageLimit** = `object`

Defined in: [types/proxy.ts:1569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1569)

One entry of the usage endpoint's generic `limits[]` array (wire shape).

## Properties

### kind?

> `optional` **kind?**: `string`

Defined in: [types/proxy.ts:1570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1570)

---

### group?

> `optional` **group?**: `string`

Defined in: [types/proxy.ts:1571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1571)

---

### percent?

> `optional` **percent?**: `number` \| `null`

Defined in: [types/proxy.ts:1573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1573)

0-100 percent.

---

### severity?

> `optional` **severity?**: `string` \| `null`

Defined in: [types/proxy.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1574)

---

### resets_at?

> `optional` **resets_at?**: `string` \| `null`

Defined in: [types/proxy.ts:1575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1575)

---

### scope?

> `optional` **scope?**: \{ `model?`: \{ `id?`: `string` \| `null`; `display_name?`: `string` \| `null`; \} \| `null`; `surface?`: `string` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:1576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1576)

---

### is_active?

> `optional` **is_active?**: `boolean` \| `null`

Defined in: [types/proxy.ts:1580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1580)

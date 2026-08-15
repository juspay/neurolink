[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageLimit

# Type Alias: AnthropicUsageLimit

> **AnthropicUsageLimit** = `object`

Defined in: [types/proxy.ts:1277](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1277)

One entry of the usage endpoint's generic `limits[]` array (wire shape).

## Properties

### kind?

> `optional` **kind?**: `string`

Defined in: [types/proxy.ts:1278](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1278)

---

### group?

> `optional` **group?**: `string`

Defined in: [types/proxy.ts:1279](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1279)

---

### percent?

> `optional` **percent?**: `number` \| `null`

Defined in: [types/proxy.ts:1281](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1281)

0-100 percent.

---

### severity?

> `optional` **severity?**: `string` \| `null`

Defined in: [types/proxy.ts:1282](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1282)

---

### resets_at?

> `optional` **resets_at?**: `string` \| `null`

Defined in: [types/proxy.ts:1283](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1283)

---

### scope?

> `optional` **scope?**: \{ `model?`: \{ `id?`: `string` \| `null`; `display_name?`: `string` \| `null`; \} \| `null`; `surface?`: `string` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:1284](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1284)

---

### is_active?

> `optional` **is_active?**: `boolean` \| `null`

Defined in: [types/proxy.ts:1288](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1288)

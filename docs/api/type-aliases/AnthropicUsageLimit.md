[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageLimit

# Type Alias: AnthropicUsageLimit

> **AnthropicUsageLimit** = `object`

One entry of the usage endpoint's generic `limits[]` array (wire shape).

## Properties

### kind?

> `optional` **kind?**: `string`

---

### group?

> `optional` **group?**: `string`

---

### percent?

> `optional` **percent?**: `number` \| `null`

0-100 percent.

---

### severity?

> `optional` **severity?**: `string` \| `null`

---

### resets_at?

> `optional` **resets_at?**: `string` \| `null`

---

### scope?

> `optional` **scope?**: \{ `model?`: \{ `id?`: `string` \| `null`; `display_name?`: `string` \| `null`; \} \| `null`; `surface?`: `string` \| `null`; \} \| `null`

---

### is_active?

> `optional` **is_active?**: `boolean` \| `null`

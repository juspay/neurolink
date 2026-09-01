[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NvidiaNimExtraBody

# Type Alias: NvidiaNimExtraBody

> **NvidiaNimExtraBody** = `object`

Defined in: [types/providers.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L325)

NVIDIA NIM extra request body parameters passed via `providerOptions.openai.body`.
Lives here (not in providers/nvidiaNim.ts) per CLAUDE.md rule 2.

## Properties

### top_k?

> `optional` **top_k?**: `number`

Defined in: [types/providers.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L326)

---

### min_p?

> `optional` **min_p?**: `number`

Defined in: [types/providers.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L327)

---

### repetition_penalty?

> `optional` **repetition_penalty?**: `number`

Defined in: [types/providers.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L328)

---

### min_tokens?

> `optional` **min_tokens?**: `number`

Defined in: [types/providers.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L329)

---

### chat_template?

> `optional` **chat_template?**: `string`

Defined in: [types/providers.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L330)

---

### request_id?

> `optional` **request_id?**: `string`

Defined in: [types/providers.ts:331](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L331)

---

### ignore_eos?

> `optional` **ignore_eos?**: `boolean`

Defined in: [types/providers.ts:332](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L332)

---

### chat_template_kwargs?

> `optional` **chat_template_kwargs?**: `object`

Defined in: [types/providers.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L333)

#### thinking?

> `optional` **thinking?**: `boolean`

#### enable_thinking?

> `optional` **enable_thinking?**: `boolean`

#### reasoning_budget?

> `optional` **reasoning_budget?**: `number`

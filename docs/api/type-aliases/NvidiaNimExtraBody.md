[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NvidiaNimExtraBody

# Type Alias: NvidiaNimExtraBody

> **NvidiaNimExtraBody** = `object`

Defined in: [types/providers.ts:334](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L334)

NVIDIA NIM extra request body parameters passed via `providerOptions.openai.body`.
Lives here (not in providers/nvidiaNim.ts) per CLAUDE.md rule 2.

## Properties

### top_k?

> `optional` **top_k?**: `number`

Defined in: [types/providers.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L335)

---

### min_p?

> `optional` **min_p?**: `number`

Defined in: [types/providers.ts:336](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L336)

---

### repetition_penalty?

> `optional` **repetition_penalty?**: `number`

Defined in: [types/providers.ts:337](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L337)

---

### min_tokens?

> `optional` **min_tokens?**: `number`

Defined in: [types/providers.ts:338](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L338)

---

### chat_template?

> `optional` **chat_template?**: `string`

Defined in: [types/providers.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L339)

---

### request_id?

> `optional` **request_id?**: `string`

Defined in: [types/providers.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L340)

---

### ignore_eos?

> `optional` **ignore_eos?**: `boolean`

Defined in: [types/providers.ts:341](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L341)

---

### chat_template_kwargs?

> `optional` **chat_template_kwargs?**: `object`

Defined in: [types/providers.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L342)

#### thinking?

> `optional` **thinking?**: `boolean`

#### enable_thinking?

> `optional` **enable_thinking?**: `boolean`

#### reasoning_budget?

> `optional` **reasoning_budget?**: `number`

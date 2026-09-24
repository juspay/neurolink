[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NvidiaNimExtraBody

# Type Alias: NvidiaNimExtraBody

> **NvidiaNimExtraBody** = `object`

Defined in: [types/providers.ts:369](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L369)

NVIDIA NIM extra request body parameters passed via `providerOptions.openai.body`.
Lives here (not in providers/nvidiaNim.ts) per CLAUDE.md rule 2.

## Properties

### top_k?

> `optional` **top_k?**: `number`

Defined in: [types/providers.ts:370](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L370)

---

### min_p?

> `optional` **min_p?**: `number`

Defined in: [types/providers.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L371)

---

### repetition_penalty?

> `optional` **repetition_penalty?**: `number`

Defined in: [types/providers.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L372)

---

### min_tokens?

> `optional` **min_tokens?**: `number`

Defined in: [types/providers.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L373)

---

### chat_template?

> `optional` **chat_template?**: `string`

Defined in: [types/providers.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L374)

---

### request_id?

> `optional` **request_id?**: `string`

Defined in: [types/providers.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L375)

---

### ignore_eos?

> `optional` **ignore_eos?**: `boolean`

Defined in: [types/providers.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L376)

---

### chat_template_kwargs?

> `optional` **chat_template_kwargs?**: `object`

Defined in: [types/providers.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L377)

#### thinking?

> `optional` **thinking?**: `boolean`

#### enable_thinking?

> `optional` **enable_thinking?**: `boolean`

#### reasoning_budget?

> `optional` **reasoning_budget?**: `number`

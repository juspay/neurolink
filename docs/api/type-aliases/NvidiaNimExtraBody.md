[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NvidiaNimExtraBody

# Type Alias: NvidiaNimExtraBody

> **NvidiaNimExtraBody** = `object`

Defined in: [types/providers.ts:304](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L304)

NVIDIA NIM extra request body parameters passed via `providerOptions.openai.body`.
Lives here (not in providers/nvidiaNim.ts) per CLAUDE.md rule 2.

## Properties

### top_k?

> `optional` **top_k?**: `number`

Defined in: [types/providers.ts:305](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L305)

---

### min_p?

> `optional` **min_p?**: `number`

Defined in: [types/providers.ts:306](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L306)

---

### repetition_penalty?

> `optional` **repetition_penalty?**: `number`

Defined in: [types/providers.ts:307](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L307)

---

### min_tokens?

> `optional` **min_tokens?**: `number`

Defined in: [types/providers.ts:308](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L308)

---

### chat_template?

> `optional` **chat_template?**: `string`

Defined in: [types/providers.ts:309](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L309)

---

### request_id?

> `optional` **request_id?**: `string`

Defined in: [types/providers.ts:310](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L310)

---

### ignore_eos?

> `optional` **ignore_eos?**: `boolean`

Defined in: [types/providers.ts:311](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L311)

---

### chat_template_kwargs?

> `optional` **chat_template_kwargs?**: `object`

Defined in: [types/providers.ts:312](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L312)

#### thinking?

> `optional` **thinking?**: `boolean`

#### enable_thinking?

> `optional` **enable_thinking?**: `boolean`

#### reasoning_budget?

> `optional` **reasoning_budget?**: `number`

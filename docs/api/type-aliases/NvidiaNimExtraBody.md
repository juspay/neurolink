[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NvidiaNimExtraBody

# Type Alias: NvidiaNimExtraBody

> **NvidiaNimExtraBody** = `object`

NVIDIA NIM extra request body parameters passed via `providerOptions.openai.body`.
Lives here (not in providers/nvidiaNim.ts) per CLAUDE.md rule 2.

## Properties

### top_k?

> `optional` **top_k?**: `number`

---

### min_p?

> `optional` **min_p?**: `number`

---

### repetition_penalty?

> `optional` **repetition_penalty?**: `number`

---

### min_tokens?

> `optional` **min_tokens?**: `number`

---

### chat_template?

> `optional` **chat_template?**: `string`

---

### request_id?

> `optional` **request_id?**: `string`

---

### ignore_eos?

> `optional` **ignore_eos?**: `boolean`

---

### chat_template_kwargs?

> `optional` **chat_template_kwargs?**: `object`

#### thinking?

> `optional` **thinking?**: `boolean`

#### enable_thinking?

> `optional` **enable_thinking?**: `boolean`

#### reasoning_budget?

> `optional` **reasoning_budget?**: `number`

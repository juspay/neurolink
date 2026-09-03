[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NvidiaNimExtraBody

# Type Alias: NvidiaNimExtraBody

> **NvidiaNimExtraBody** = `object`

Defined in: [types/providers.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L313)

NVIDIA NIM extra request body parameters passed via `providerOptions.openai.body`.
Lives here (not in providers/nvidiaNim.ts) per CLAUDE.md rule 2.

## Properties

### top_k?

> `optional` **top_k?**: `number`

Defined in: [types/providers.ts:314](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L314)

---

### min_p?

> `optional` **min_p?**: `number`

Defined in: [types/providers.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L315)

---

### repetition_penalty?

> `optional` **repetition_penalty?**: `number`

Defined in: [types/providers.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L316)

---

### min_tokens?

> `optional` **min_tokens?**: `number`

Defined in: [types/providers.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L317)

---

### chat_template?

> `optional` **chat_template?**: `string`

Defined in: [types/providers.ts:318](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L318)

---

### request_id?

> `optional` **request_id?**: `string`

Defined in: [types/providers.ts:319](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L319)

---

### ignore_eos?

> `optional` **ignore_eos?**: `boolean`

Defined in: [types/providers.ts:320](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L320)

---

### chat_template_kwargs?

> `optional` **chat_template_kwargs?**: `object`

Defined in: [types/providers.ts:321](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L321)

#### thinking?

> `optional` **thinking?**: `boolean`

#### enable_thinking?

> `optional` **enable_thinking?**: `boolean`

#### reasoning_budget?

> `optional` **reasoning_budget?**: `number`

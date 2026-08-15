[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RawUsageObject

# Type Alias: RawUsageObject

> **RawUsageObject** = `object`

Defined in: [types/common.ts:339](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L339)

Raw usage object that may come from various AI providers.
Supports multiple naming conventions and nested structures.

## Properties

### input?

> `optional` **input?**: `number`

Defined in: [types/common.ts:341](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L341)

---

### output?

> `optional` **output?**: `number`

Defined in: [types/common.ts:342](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L342)

---

### total?

> `optional` **total?**: `number`

Defined in: [types/common.ts:343](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L343)

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/common.ts:346](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L346)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/common.ts:347](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L347)

---

### totalTokens?

> `optional` **totalTokens?**: `number`

Defined in: [types/common.ts:348](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L348)

---

### promptTokens?

> `optional` **promptTokens?**: `number`

Defined in: [types/common.ts:351](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L351)

---

### completionTokens?

> `optional` **completionTokens?**: `number`

Defined in: [types/common.ts:352](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L352)

---

### cacheCreationInputTokens?

> `optional` **cacheCreationInputTokens?**: `number`

Defined in: [types/common.ts:355](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L355)

---

### cacheReadInputTokens?

> `optional` **cacheReadInputTokens?**: `number`

Defined in: [types/common.ts:356](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L356)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/common.ts:357](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L357)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/common.ts:358](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L358)

---

### cachedInputTokens?

> `optional` **cachedInputTokens?**: `number`

Defined in: [types/common.ts:364](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L364)

---

### inputTokenDetails?

> `optional` **inputTokenDetails?**: `object`

Defined in: [types/common.ts:365](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L365)

#### noCacheTokens?

> `optional` **noCacheTokens?**: `number`

#### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

#### cacheWriteTokens?

> `optional` **cacheWriteTokens?**: `number`

---

### prompt_tokens_details?

> `optional` **prompt_tokens_details?**: `object`

Defined in: [types/common.ts:373](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L373)

#### cached_tokens?

> `optional` **cached_tokens?**: `number`

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/common.ts:376](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L376)

---

### reasoning?

> `optional` **reasoning?**: `number`

Defined in: [types/common.ts:377](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L377)

---

### reasoning_tokens?

> `optional` **reasoning_tokens?**: `number`

Defined in: [types/common.ts:378](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L378)

---

### thinkingTokens?

> `optional` **thinkingTokens?**: `number`

Defined in: [types/common.ts:379](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L379)

---

### usage?

> `optional` **usage?**: `RawUsageObject`

Defined in: [types/common.ts:382](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L382)

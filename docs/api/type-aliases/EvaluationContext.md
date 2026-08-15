[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationContext

# Type Alias: EvaluationContext

> **EvaluationContext** = `object`

Defined in: [types/evaluation.ts:95](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L95)

Enhanced evaluation context for comprehensive response assessment

## Properties

### userQuery

> **userQuery**: `string`

Defined in: [types/evaluation.ts:96](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L96)

---

### aiResponse

> **aiResponse**: `string`

Defined in: [types/evaluation.ts:97](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L97)

---

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

Defined in: [types/evaluation.ts:98](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L98)

---

### primaryDomain?

> `optional` **primaryDomain?**: `string`

Defined in: [types/evaluation.ts:99](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L99)

---

### assistantRole?

> `optional` **assistantRole?**: `string`

Defined in: [types/evaluation.ts:100](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L100)

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/evaluation.ts:101](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L101)

#### role

> **role**: `"user"` \| `"assistant"`

#### content

> **content**: `string`

#### timestamp?

> `optional` **timestamp?**: `string`

---

### toolUsage?

> `optional` **toolUsage?**: `object`[]

Defined in: [types/evaluation.ts:106](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L106)

#### toolName

> **toolName**: `string`

#### input

> **input**: `unknown`

#### output

> **output**: `unknown`

#### executionTime

> **executionTime**: `number`

---

### expectedOutcome?

> `optional` **expectedOutcome?**: `string`

Defined in: [types/evaluation.ts:112](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L112)

---

### evaluationCriteria?

> `optional` **evaluationCriteria?**: `string`[]

Defined in: [types/evaluation.ts:113](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L113)

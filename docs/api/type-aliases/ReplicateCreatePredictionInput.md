[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReplicateCreatePredictionInput

# Type Alias: ReplicateCreatePredictionInput

> **ReplicateCreatePredictionInput** = `object`

Defined in: [types/replicate.ts:51](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L51)

Input shape for Replicate's createPrediction helper.

## Properties

### model

> **model**: `string`

Defined in: [types/replicate.ts:53](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L53)

Model in "owner/name" or "owner/name:version" form.

---

### input

> **input**: `Record`\<`string`, `unknown`\>

Defined in: [types/replicate.ts:55](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L55)

Provider/model-specific input shape.

---

### webhook?

> `optional` **webhook?**: `string`

Defined in: [types/replicate.ts:57](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L57)

Optional webhook URL for completion notifications.

---

### webhookEventsFilter?

> `optional` **webhookEventsFilter?**: (`"start"` \| `"output"` \| `"logs"` \| `"completed"`)[]

Defined in: [types/replicate.ts:59](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L59)

Optional webhook events filter.

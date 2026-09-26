[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReplicateCreatePredictionInput

# Type Alias: ReplicateCreatePredictionInput

> **ReplicateCreatePredictionInput** = `object`

Input shape for Replicate's createPrediction helper.

## Properties

### model

> **model**: `string`

Model in "owner/name" or "owner/name:version" form.

---

### input

> **input**: `Record`\<`string`, `unknown`\>

Provider/model-specific input shape.

---

### webhook?

> `optional` **webhook?**: `string`

Optional webhook URL for completion notifications.

---

### webhookEventsFilter?

> `optional` **webhookEventsFilter?**: (`"start"` \| `"output"` \| `"logs"` \| `"completed"`)[]

Optional webhook events filter.
